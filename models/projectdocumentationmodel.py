#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import abort
from config import db
import json
import pymongo
import datetime
from bson.objectid import ObjectId

"""DataBase Fields"""
DOCUMENTATION = dict(
  ID="_id",
  TYPE="type", # тип документации (на всякий случай, пока что всегда будет projectdocumentation)
  ORDER="order_number", # номер заказа (договор.продукция)
  SECTION="section", # раздел (структура {_id; name})
  PDF_FILES = "pdf_files", # список файлов вида {_id; size; name; google_file_id;}
  SOURCE_FILES = "source_files",
  STAGE = "stage", #стадия
  IS_CUSTOMER_AGREE = "is_customer_agree", # согласовано с заказчиком
  DESCRIPTION = "description" #описание
)

def add(data):
  try:
    db.projectdocumentation.insert(data)
  except pymongo.errors.OperationFailure as e:
    raise Exception(str(e))
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))

def update_by_id(id, data):
  try:
    db.projectdocumentation.update({'_id':ObjectId(id)},{'$set':data})
  except pymongo.errors.OperationFailure:
    raise Exception(str(e))
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))
  return data

def get_list(args, fields= None):
  data=[]
  try:
    return [d for d in db.projectdocumentation.find(args, fields)]
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))

def get(args, fields= None):
  try:
    return db.projectdocumentation.find_one(args, fields)
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))

def get_all(filter, fields=None, is_distict=False, is_group_by_section=False, page_size=50, page=1):
  try:
    agg = []
    agg.append({'$match':filter})
    if is_distict:
      agg.append({'$group':{'_id':{'order_number':'$order_number','stage':'$stage','section_id':'$section._id'},
                    'uniqueId': { '$last': "$_id"}, 'date_added':{'$last':'$date_added' }}})
    else:
      agg.append({'$project':{'uniqueId':'$_id', '_id.section_id':'$section._id', 'date_added':'$date_added'}})
    agg.append({'$sort':{'date_added':pymongo.DESCENDING}})
    if is_group_by_section:
      agg.append({'$group':{'_id':{'section_id':'$_id.section_id'}, 'uniqueId': {'$push':'$uniqueId'}, 'last_date':{'$max':'$date_added'}}})
      agg.append({'$sort':{"last_date":pymongo.DESCENDING}})
      agg.append({'$unwind':'$uniqueId'})
    agg.append({'$skip':page_size*(page-1)})
    agg.append({'$limit':page_size})
    idlist = db.projectdocumentation.aggregate(agg)
    ids = []
    for i in idlist:
      #print i['last_date']
      ids.append(i['uniqueId'])
    #ids = reduce(lambda a,b:a+[b['uniqueId']],idlist,[])
    data = []
    for dt in db.projectdocumentation.find( {'_id':{'$in':ids}}, fields):
      data.append(dt)
    result = []
    for mid in ids:
      dt = [x for x in data if x['_id']==mid]
      if dt:
        result.append(dt[0])
        data.remove(dt[0])
    return result
  except pymongo.errors.OperationFailure as e:
    raise Exception(str(e))
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))

def get_count(cond,is_distict=False):
  odb = db.projectdocumentation
  try:
    agg = []
    agg.append({'$match':cond})
    if is_distict:
      agg.append({
        '$group':{
          '_id':{
            'order_number':'$order_number',
            'stage':'$stage',
            'section_id':'$section._id'}
          }
      })
    agg.append({'$count': "passing_scores"})
    res_list = db.projectdocumentation.aggregate(agg)
    return sum(a['passing_scores'] for a in res_list)
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))

