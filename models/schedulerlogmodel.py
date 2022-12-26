#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import abort
from config import db
import json
import pymongo
import datetime
from bson.objectid import ObjectId
import re

# лог для зачач шедулера
SCHEDULERLOG = dict(
  ID="_id", # Идентификатор договора(MongoId)
  DATE_START="date_start", # дата начала выполнения шедулера
  DATE_FINISHED="date_finished", # дата окончания выполнения шедулера
  KEY="key", # ключ шедулера  (название метода)
  IS_FINISHED="is_finished" # было ли закончено действие выполнения шедулера
)

def add_log(key):
  try:
    data = {SCHEDULERLOG['DATE_START']: datetime.datetime.utcnow(),  SCHEDULERLOG['KEY']: key, SCHEDULERLOG['IS_FINISHED']:False }
    db.scheduler_log.insert(data)
    return data['_id']
  except pymongo.errors.PyMongoError as e:
    pass
  return None

def finish_schedule(sid):
  try:
    db.scheduler_log.update({'_id':ObjectId(sid)}, {'$set':{SCHEDULERLOG['DATE_FINISHED']: datetime.datetime.utcnow(), SCHEDULERLOG['IS_FINISHED']:True }} )
  except pymongo.errors.PyMongoError as e:
    pass

# получить последнюю дату обновления для ключа
def get_last_date(key):
  try:
    l_one = db.scheduler_log.find({SCHEDULERLOG['KEY']:key, SCHEDULERLOG['DATE_FINISHED']:{'$exists':True} }).sort(SCHEDULERLOG['DATE_START'], pymongo.DESCENDING).limit(1)
    for l in l_one:
      return l[SCHEDULERLOG['DATE_START']]
  except pymongo.errors.PyMongoError as e:
    pass
  return None
