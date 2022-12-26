#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import abort
from config import db
import json
import pymongo
import datetime
import routine
from bson.objectid import ObjectId

# Участок, по которому создаются платежи
PAYMENT_SECTOR_ID = "57397f7f0db7e567ce43deed"
# Участок для спецификаций
SPECIFICATION_SECTOR_ID = "5b051dd845ed1831e7cba6de"

# свойства участка
# is_manufacturer - производственный участок
# is_output - выпоускающий участок
# is_auto - Запрет ручного добавления работ на данном участке
# is_need_ctu - требуется ли на наряде контроль трудового участия

def get_all_only_sectors():
  '''
    get all sectors without works and brigades
  '''
  try:
    result = []
    dataResult = db.m_sector.find({},{
      'name':1,
      'routine':1,
      'note':1,
      'type':1,
      'code':1,
      'is_specific':1,
      'is_active': 1,
      'is_manufacturer': 1,
      'is_output': 1,
      'is_need_ctu': 1,
      'is_auto':1}
    ).sort([('routine',1),('name', 1)])
    for row in dataResult:
      row["_id"] = str(row["_id"])
      result.append(row)
    return result
  except pymongo.errors.PyMongoError as e:
    abort(400, "server_error")

def get_all_sectors_and_works():
  '''
    get all sectors with works
  '''
  try:
    result = []
    dataResult = db.m_sector.find({},{
      'name':1,
      'routine':1,
      'note':1,
      'type':1,
      'code':1,
      'works':1,
      'is_specific':1,
      'is_active':1,
      'is_manufacturer': 1,
      'is_output': 1,
      'is_need_ctu': 1,
      'is_auto':1
    }).sort('routine', direction=1)
    for row in dataResult:
      row["_id"] = str(row["_id"])
      if row.get('works'):
        row['works'].sort(key = lambda x: (x['routine'], x['name']))
      result.append(row)
    return result
  except pymongo.errors.PyMongoError as e:
    abort(400, "server_error")

def get(id):
  '''
    get full info about sector with works and brigades
  '''
  try:
    res =  db.m_sector.find_one({'_id': ObjectId(id)})
    if res and res.get('works'):
      res['works'].sort(key=lambda x:(x['routine'], x['name']) )
    return res
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))

def get_by(args, fields):
  '''
    get sector info by filter
  '''
  try:
    data = []
    for row in  db.m_sector.find(args, fields).sort([('routine',1),('name', 1)]):
      if row.get('works'):
        row['works'].sort(key = lambda x: (x['routine'], x['name']))
      data.append(row)
    return data
  except pymongo.errors.PyMongoError as e:
    abort(400, "server_error")

def get_all_only_works():
  '''
    Get all works in the dict.
    Used ONLY in the Timeline API
  '''
  try:
    works = {}
    for sector in db.m_sector.find({"works": { "$exists": True }}):
      sector["works"].sort(key = lambda x: (x['routine'], x['name']))
      for work in sector["works"]:
        works[str(sector["code"]) + "_" + str(work["code"])] = {
          "name": work["name"],
          "unit": work["unit"]
          }
    return works
  except pymongo.errors.PyMongoError as e:
    abort(400, "server_error")

def get_sectors(args):
  '''
    Get sectors with works sorted by routine and name
  '''
  try:
    data = []
    for sector in db.m_sector.find(args).sort([('routine',1),('name', 1)]):
      sector["works"].sort(key = lambda x: (x['routine'], x['name']))
      data.append(sector)
    return data
  except pymongo.errors.PyMongoError as e:
    abort(400, "server_error")

def get_all_works():
  '''
    Get all works in the dict.
  '''
  try:
    works = {}
    data = db.m_sector.find({"works": { "$exists": True }})
    for sector in data:
      for work in sector["works"]:
        works[str(work['_id'])] = work
    return works
  except pymongo.errors.PyMongoError as e:
    print(str(e))
    abort(400, "server_error")

def update(condition, data):
  '''
    Update data
  '''
  try:
    db.m_sector.update(condition,{'$set':data})
  except pymongo.errors.OperationFailure:
    abort(400, "Operation failure")
  except pymongo.errors.PyMongoError as e:
    abort(400, "server_error")
  return data

def do_aggregate(conditions_arr):
  '''
    Common aggregate function
  '''
  try:
    dataResult = []
    for row in db.m_sector.aggregate(conditions_arr):
      dataResult.append(row)
    return dataResult
  except pymongo.errors.PyMongoError as e:
    raise Exception("Error! Can't get data: %s" %(str(e)))

def get_all_sector_types():
  '''
    Get all sectors types
  '''
  cond =[
    {"$project":{"type":1}},
    {"$group":{
        "_id":{"type":"$type"},
        "count": { "$sum": 1 }
      }
    },
    {"$project":{
        "_id":0,
        "type":"$_id.type",
        "count":"$count"
      }
    },
    {"$sort" : {"type":1} }
  ]
  return do_aggregate(cond)

def get_new_work_code(sector_code, is_specific = False):
  '''
    Получение кода для новой работы
    sector_id - участок на который происходит добавление работы
    is_specific - идет добавление специичной работы или обычной
   '''
  result = { 'code': 1, 'routine':1 }
  match = {}
  if is_specific:
    match = {'is_specific': 'yes'}
  else:
    match = {'$or': [
      { 'is_specific': { '$exists': False }},
      { 'is_specific': 'no'},
      { 'is_specific': None}
    ]}
  cond =[
    {"$match":{'code': routine.strToInt(sector_code) }},
    {'$unwind': '$works'},
    {'$project': {
        'is_specific': '$works.is_specific',
        'code': '$works.code',
        'routine': '$works.routine'
    }},
    {'$match': match },
    {'$group':
      {
        '_id':{},
        'code':{'$max':'$code'},
        'routine':{'$max':'$routine'}
      }
    },
    {'$project':{'_id':0, 'code':'$code', 'routine': '$routine'} }
  ]

  tmp =  do_aggregate(cond)

  if tmp:
    result['code'] = tmp[0]['code'] + 1
    result['routine'] = tmp[0]['routine'] + 1
  if is_specific and result['code'] ==1:
    result['code'] = 500
  return result


def add_new_work(sector_code, name, unit, comment, is_specific, usr_email):
  '''
    Добавление новой работы
  '''
  try:
    new_code_row = get_new_work_code(sector_code, is_specific)
    row = {
      '_id': ObjectId(),
      'code': new_code_row['code'],
      'name': name,
      'is_active': 1,
      'unit': unit,
      'note': comment,
      'price': [],
      'material': [],
      'date': datetime.datetime.utcnow(),
      'user': usr_email,
      'is_specific': 'yes' if is_specific else 'no',
      'routine': new_code_row['routine'],
      "default_value" : 100 if unit =='%' else 0
    }
    db.m_sector.update({'code': routine.strToInt(sector_code) },{'$push':{'works': row}})
    return row
  except pymongo.errors.OperationFailure as e:
    raise Exception(str(e))
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))
  except Exception, exc:
    raise Exception(str(exc))


