#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import error, abort
import config
import json
import pymongo
import datetime, time
import re
from bson.objectid import ObjectId
import bson
db = config.db

def get(args, fields):
  try:
    return db.integra_1s_orders_calculation.find_one(args, fields)
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))

def get_list(args=None, fields=None):
  data=[]
  try:
    for d in db.integra_1s_orders_calculation.find(args, fields):
      data.append(d)
    return data
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))

def get_list_by_page(args=None, fields = None, page_size=50, page=1):
  '''
    Получение списка объектов по указаной странице.
    По умолчанию сортировка ведется по номеру спецификации
  '''
  data=[]
  try:
    cursor = db.integra_1s_orders_calculation.find(args, fields).sort([('date', -1)]).skip(page_size*(page-1)).limit(page_size)
    for d in cursor:
      data.append(d)
    return data
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))

def get_count(cond):
  '''
  Получение количества записей по условию
  '''
  try:
    return db.integra_1s_orders_calculation.find(cond).count()
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))

def add(data):
  try:
    db.integra_1s_orders_calculation.insert(data)
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))

def update(args, data):
  try:
    db.integra_1s_orders_calculation.update(args,{'$set':data})
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))
  return data

def remove(document_number):
  try:
    db.integra_1s_orders_calculation.remove({'document_number':document_number})
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))

def update_multy(filter,data):
  try:
    db.integra_1s_orders_calculation.update(filter,{'$set':data},multi=True)
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))
  return data

def get_stats_by_orders(orders = None):
  '''
    orders - список необходимых номеров заказов
    Получение дат обновления заказов.
    В результате выборке получается список с номерами заказов и датами их последних обновлений
  '''
  result = []
  match = {}
  if orders:
    match = {'items.order_number':{'$in':orders}}
  try:
    dataResult =  do_aggregate([
      {'$match': match},
      {'$unwind': '$items'},
      {'$project':
          {
            'date':'$date',
            'number':'$items.order_number',
          }
      },
      {'$group':
        {
          '_id':{'number':'$number'},
          'date':{'$max':'$date'},
        }
      },
      {'$project':{'_id':0, 'number':'$_id.number', 'date': '$date'}},
      {'$sort':{'number':-1}}
    ])

    for item in dataResult:
      if not orders or item['number'] in orders:
        result.append(item)
    return result
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))


def do_aggregate(conditions_arr):
  '''
  Шаблон для выполнения аггрегированных запросов
  '''
  try:
    dataResult = []
    for row in db.integra_1s_orders_calculation.aggregate(conditions_arr):
      dataResult.append(row)
    return dataResult
  except pymongo.errors.PyMongoError as e:
    raise Exception("Error! Can't get data: %s" %(str(e)))
