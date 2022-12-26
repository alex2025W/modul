#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import error, abort
import json
import pymongo
from datetime import datetime
import bson
import os
from copy import deepcopy,copy
from pymongo import MongoClient
import config

import sys
reload(sys)
sys.setdefaultencoding('utf8')
db = config.db

SectorTypesKey = 18

# Хардкодные стадии заявок
OrderConditions = {
  'CONTRACT_PREPARE': "51ed3f5f8fe17600027069b3", # Подготовка договора
  'CONTRACT_AGREEMENT': "51ed3f698fe17600027069b4", #Согласование договора
  'CONTRACT_SIGN': "51ed3f738fe17600027069b5", #Договор подписан
  'INTEREST': "51ed76b62d2e2300025c34b8", #интерес
  'PUBLIC_COST': "51ed76be2d2e2300025c34b9", #Озвучили цену
  'SPECIFY_TZ': "51ed76ca2d2e2300025c34ba", #Уточнение ТЗ
  'REQUEST_KP': "51ed76d62d2e2300025c34bb", #Запрос КП
  'KP_PREPARATION': "51ed76db2d2e2300025c34bc", #Подготовка КП
  'SEND_KP': "51ed76df2d2e2300025c34bd", #Отправили КП
  'KP_AGREEMENT': "51ed76e42d2e2300025c34be", #Согласование КП
  'EXAMINE': "51ed76ea2d2e2300025c34bf", #Рассматривают
  'SLEEP': "51ed76f32d2e2300025c34c0", #спящий
  'REFUSE': "51ed77072d2e2300025c34c1", #ОТКАЗ
  'CONTRACT_TO_SIGN': "549bee7e03de9e0003c2dbdc", #Договор на подписании
  'NO_ANSWER': "5638bfc02ad7aa000349da6c", #не дозвонились
  'KP_DETECTOR': "593aa58dfc9a69000878d728", #индикатор КП
  'QUALIFICATION': "59834d91af9e820008782792", #Квалификация
  'TECHNIK_CONSULTATION': "59936cb66616bc0008fba663" #Техническая консультация
}

# договорные стадии
OrderContractConditions = {
  'CONTRACT_PREPARE': "51ed3f5f8fe17600027069b3",   # Подготовка договора
  'CONTRACT_AGREEMENT': "51ed3f698fe17600027069b4", #Согласование договора
  'CONTRACT_TO_SIGN': "549bee7e03de9e0003c2dbdc",   #Договор на подписании
  'CONTRACT_SIGN': "51ed3f738fe17600027069b5",      #Договор подписан
}

def get_all(all):
  """Get all"""
  try:
    if (all):
      dirs = db.dirs.find().sort('number', direction=1)
    else:
      dirs = db.dirs.find({'stat':'enabled'}).sort('number', direction=1)
    return dirs
  except pymongo.errors.PyMongoError as e:
    abort(400,"server_error")

def get_by_type(key):
  try:
    dirs = db.dirs.find({'type':key}).sort('number', direction=1)
    return dirs
  except pymongo.errors.PyMongoError as e:
    abort(400,"server_error")

def get_list_by(args, fields={}):
  try:
    dirs = db.dirs.find(args, fields).sort('number', direction=1)
    return dirs
  except pymongo.errors.PyMongoError as e:
    abort(400,"server_error")

# получить список состояние в формате ключ-значение
def get_conditions():
  dirs = get_list_by({'type':3},{'name':1})
  res = {}
  for d in dirs:
    res[str(d['_id'])] = d['name']
  return res

def get(prop):
  try:
    dr = db.dirs.find_one({'property':prop})
    if (dr):
      return dr['name']
    else:
      return prop
  except pymongo.errors.PyMongoError as e:
    abort(400,"server_error")

def get_one(args):
  try:
    return db.dirs.find_one(args)
  except pymongo.errors.PyMongoError as e:
    abort(400,"server_error")

def add_history(id, data, user):
  data = copy(data)
  data['datetime'] = datetime.utcnow()
  data['user'] = user
  res = db.dirs.update({'_id': id}, {'$push':{'history':data}})

def add(data):
  # INDEX name unique
  try:
    rr = get_one({'name': data['name'],'type':data['type']})
    if rr:
      abort(400,"Такой элемент уже существует.")
      return
    return db.dirs.insert(data)

  except pymongo.errors.OperationFailure:
    abort(400,"Такой элемент уже существует.")

  except pymongo.errors.PyMongoError as e:
    abort(400,"server_error")


def updatenum(key, data, dirtype):
  try:
    res = db.dirs.update({'name': key,'type':dirtype}, {'$set':data})
  except pymongo.errors.PyMongoError as e:
    abort(400,"server_error")
  return data

def update(key, data, dirtype):
  try:
    if 'name' not in data:
      res = db.dirs.update({'name': key,'type':dirtype}, {'$set':data})
      return data
    elif data['name']!=key:
      rr = get_one({'name': data['name'],'type':dirtype})
      if rr:
        abort(400,"Такой элемент уже существует.")
        return
      else:
        res = db.dirs.update({'name': key,'type':dirtype}, {'$set':data})

    if dirtype == 1:
      cdb = db.clients
      # index firstcontact
      cdb.update({'firstcontact':key},{'$set':{'firstcontact':data['name']}},  multi=True )
    if dirtype == 2:
      cdb = db.clients
      # index wherefind
      cdb.update({'wherefind':key},{'$set':{'wherefind':data['name']}},  multi=True )
    if dirtype == 3:
      odb = db.orders
      # index condition
      odb.update({'condition':key},{'$set':{'condition':data['name']}},  multi=True )
      # index history condition
      for doc in odb.find({'history.condition':key}):
        hst = []
        for hist in doc['history']:
          if (hist['condition'] == key.decode('utf8')):
            hist['condition'] = data['name']
          hst.append(hist)
        odb.update({'_id':doc['_id']}, {'$set':{'history': hst}})
    if dirtype == 4:
      odb = db.orders
      # index products.type
      for doc in odb.find({'products.type':key}):
        tp = []
        prod_struc = u''
        for hist in doc['products']:

          if (hist['type'] == key.decode('utf8')):
            hist['type'] = data['name']
          tp.append(hist)
          foo = hist['type'].encode('utf8')
          prod_struc = prod_struc + foo + '; '
        odb.update({'_id':doc['_id']}, {'$set':{'products': tp}})
        if (len(prod_struc)>0):
          prod_struc = prod_struc[:-2]
          odb.update({'_id':doc['_id']}, {'$set':{'structure': prod_struc}})
    if dirtype == 5:
      odb = db.orders
      # index products.name
      for doc in odb.find({'products.name':key}):
        hst = []
        for hist in doc['products']:
          if (hist['name'] == key.decode('utf8')):
            hist['name'] = data['name']
          hst.append(hist)
        odb.update({'_id':doc['_id']}, {'$set':{'products': hst}})

    if dirtype == 6:
      odb = db.orders
      # index task
      odb.update({'task':key},{'$set':{'task':data['name']}},  multi=True )
      # index tasks condition
      for doc in odb.find({'task.condition':key}):
        hst = []
        for hist in doc['tasks']:
          if (hist['condition'] == key.decode('utf8')):
            hist['condition'] = data['name']
          hst.append(hist)
        odb.update({'_id':doc['_id']}, {'$set':{'tasks': hst}})

  except pymongo.errors.OperationFailure:
    abort(400,"Такой элемент уже существует.")
  except pymongo.errors.PyMongoError as e:
    abort(400,"server_error")
  return data

def update_by_id(pid, data):
  '''
    Обнавление элемента справочника по ID
  '''
  try:
    db.dirs.update({'_id':pid},{'$set':data})
  except pymongo.errors.PyMongoError as e:
    abort(400,"server_error")
  return data
