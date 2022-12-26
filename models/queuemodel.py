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
import datetime, time

# status = ['add', 'in_progress', 'error', 'ok'] # доступные состояния

def get(args, fields):
  '''
  Получить одну запись по условиям
  '''
  try:
    return db.queue.find_one(args, fields)
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))

def get_list(args, fields):
  '''
  Получить сипоск записей по условиям
  '''
  data=[]
  try:
    for d in db.queue.find(args, fields):
      data.append(d)
    return data
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))

def add(data):
  '''
  Добавить новую запись
  '''
  try:
    db.queue.insert(data)
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))

def update(id, data):
  '''
  Обновить запись
  '''
  try:
    db.queue.update({'_id':ObjectId(id)},{'$set':data})
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))
  return data

def update_multy(filter,data):
  '''
  Обновить группу записей
  '''
  try:
    db.queue.update(filter,{'$set':data},multi=True)
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))
  return data

def clear():
  '''
  Очистить таблицу
  '''
  try:
    remove_date =datetime.datetime.utcnow() - datetime.timedelta(days=1)
    db.queue.remove({'finish_date': {"$lt": remove_date}})
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))

def remove(args):
  '''
  Удалить запись по входным параметрам
  '''
  try:
    db.queue.remove(args)
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))

