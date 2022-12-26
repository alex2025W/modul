#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import abort
from config import db
import json
import pymongo
import datetime
from bson.objectid import ObjectId
import bson
import routine
from collections import OrderedDict
import sectormodel
import materialsgroupmodel
import contractmodel
from traceback import print_exc

"""Plane statuses"""
CALCULATION_STATUS = dict(
  INCALCULATE = "0", #0- в расчете
  CONFIRMED="1",     #1- согласовано
  REJECTED="2",      #2- отклонено
  ONCONFIRM="3",     #3- или пусто - на согласовании
  UNKNOWN="4",       #4- Не определено
  NEED="5",          #5- требуется
)

DECODED_CALCULATION_STATUSES = {
  '0': 'В расчете',
  '1': 'Согласовано',
  '2': 'Отклонено',
  '3': 'На согласовании',
  '4': 'Не определено',
  '5': 'Требуется'
}

"""Order statuses"""
CALCULATION_PURCHASE_STATUS = dict(
  ONCONFIRM="0", #0 или пусто - на согласовании
  CONFIRMED="1", #1- согласовано
  REJECTED="2", #2- отклонено
  INPAY= "3",  #3- в оплате
  PAYED="4", #4- оплачено
  ONSTORE="5",#5- на складе
  ONWORK="6", #6- в производстве
  PANTLYPAYED="7", # 7- частично оплачено
)

"""Order search statuses"""
CALCULATION_SEARCH_TYPE = dict(
  ALL="1", #все калькуляции
  TOCONFIRM="2", #на утверждении
  CONFIRMED="3", #утверждено
  INPAY= "4",  #в оплате
  PAYED="5", #оплачено
  ONSTORE="6",#на складе
  ONWORK="7", #в производстве
  PANTLYPAYED="8" #частично оплачены
)

def decode_status(val):
  if val and val in DECODED_CALCULATION_STATUSES:
    return DECODED_CALCULATION_STATUSES[val]
  return 'На согласовании'


def find_by(args, fields):
  """get calculation list by params"""

  try:
    calculations = db.m_calculation.find(args, fields);
    return calculations
  except pymongo.errors.PyMongoError as e:
    abort(400, "server_error")

def get_all():
  """ get all calculations """

  try:
    calculations = []
    for calculation in  db.m_calculation.find():
      calculation["id"] = str(calculation.pop("_id"))
      calculations.append(calculation)
    return calculations

  except pymongo.errors.PyMongoError as e:
    abort(400, "server_error")

def get(id):
  """get full info about calculation by id"""

  try:
    return db.m_calculation.find_one({'_id': bson.objectid.ObjectId(id)})
  except pymongo.errors.PyMongoError as e:
    abort(400,"server_error")

def get_by(args, fields):
  """get full info about calculation by id"""

  try:
    return db.m_calculation.find_one(args, fields)
  except pymongo.errors.PyMongoError as e:
    abort(400,"server_error")


def update(cond, data, insert_if_notfound=True, multi_update=False):
  """ update data """

  try:
    db.m_calculation.update(cond, data, upsert=insert_if_notfound,multi=multi_update)
  except pymongo.errors.OperationFailure as e:
    raise Exception("Can't update row: %s" %(str(e)))
  except pymongo.errors.PyMongoError as e:
    raise Exception("Can't update row: %s" %(str(e)))

def add(data):
  """ add data """
  try:
    db.m_calculation.insert(data)
  except pymongo.errors.OperationFailure as oe:
    abort(400, "Operation failure")
  except pymongo.errors.PyMongoError as e:
    abort(400, "server_error")
  return data

def get_calculation_materials_item(calculation_id, item_id):
  """get calculation materials item"""
  try:
    return db.m_calculation.find_one({'_id': ObjectId(calculation_id), 'materials._id':item_id}, { "_id":0,"materials.$": 1 })
  except pymongo.errors.PyMongoError as e:
    abort(400,"server_error")

def update_materials_status(data, user):
  """update materials status"""
  try:
    env = {}
    env['datetime'] = datetime.datetime.utcnow()
    env['manager'] = user['email']
    env['status'] = data['status']
    item = db.m_calculation.update(
      {"_id": ObjectId(data['calculation_id']),'materials._id': ObjectId(data['id'])},
      {
      "$set":
        {
        "materials.$.purchase_status":data['status'],
        "materials.$.purchase_user_email":env['manager'],
        "materials.$.purchase_date_confirm":env['datetime']
        },
      "$push": { "materials.$.purchase_statuses": env }
      },True);

  except pymongo.errors.OperationFailure as e:
    abort(400, e)
  except pymongo.errors.PyMongoError as e:
    abort(400, "server_error")

def  find_calculation_materials_by(contract_numbers,order_numbers, sector_ids, searchType):
  """Get calculation list by params

  order_numbers - list of order_numbers  ['845.1','845.2','985.3','876.4']
  sectors - list of sectors ID ['1','2','3']
  status - one of CALCULATION_SEARCH_TYPE elem

  Returns:
  A dict with materials in calculation searched by contract and status.
  Data grouped by: sector, materials group and materials
  {'sector_id':{'materialsgroup_id':{'materials_id:[object1,object2,object3]}} }
  """
  try:
    # prepare filter by contracts and sectors
    matchContractsAndSectors={}
    if order_numbers>0 and len(order_numbers)>0:
      matchContractsAndSectors["order_number"]= {"$in":order_numbers}
    else:
      abort(400,"no_contracts")

    if sector_ids>0 and len(sector_ids)>0:
      matchContractsAndSectors["sector_id"]= {"$in":sector_ids}

    # prepare filter by calculation status
    matchStatuses={"status":"1"}
    searchStatuses = []
    if(searchType==CALCULATION_SEARCH_TYPE['TOCONFIRM']):
      searchStatuses=[CALCULATION_PURCHASE_STATUS['ONCONFIRM'],CALCULATION_PURCHASE_STATUS['REJECTED'],""]
    elif(searchType==CALCULATION_SEARCH_TYPE['CONFIRMED']):
      searchStatuses=[
        CALCULATION_PURCHASE_STATUS['CONFIRMED']
        #CALCULATION_PURCHASE_STATUS['INPAY'],
        #CALCULATION_PURCHASE_STATUS['PAYED'],
        #CALCULATION_PURCHASE_STATUS['ONSTORE'],
        #CALCULATION_PURCHASE_STATUS['ONWORK']
      ]
    elif(searchType==CALCULATION_SEARCH_TYPE['INPAY']):
      searchStatuses=[CALCULATION_PURCHASE_STATUS['INPAY']]
    elif(searchType==CALCULATION_SEARCH_TYPE['PAYED']):
      searchStatuses=[CALCULATION_PURCHASE_STATUS['PAYED']]
    elif(searchType==CALCULATION_SEARCH_TYPE['ONSTORE']):
      searchStatuses=[CALCULATION_PURCHASE_STATUS['ONSTORE']]
    elif(searchType==CALCULATION_SEARCH_TYPE['ONWORK']):
      searchStatuses=[CALCULATION_PURCHASE_STATUS['ONWORK']]
    elif(searchType==CALCULATION_SEARCH_TYPE['PANTLYPAYED']):
      searchStatuses=[CALCULATION_PURCHASE_STATUS['PANTLYPAYED']]

    if(len(searchStatuses)>0):
      matchStatuses["purchase_status"] = {"$in":searchStatuses}

    #return matchContractsAndSectors

    # get data from calculation collection
    dataResult = []
    dataResultCursor = db.m_calculation.aggregate([
      {"$project":{"_id":1,"contract_id":1,"contract_number":1, "order_number":1, "sector_id":1, "production_id":1, "materials":1}},
      {"$match":matchContractsAndSectors},
      {"$unwind": "$materials"},
      {"$project":{
        "_id":0,
        "calculation_id":"$_id",
        "id":"$materials._id",
        "sector_id":1,
        "contract_id":1,
        "contract_number":1,
        "production_id":1,
        "order_number":1,
        "materials_group_id":"$materials.materials_group_id",
        "materials_id":"$materials.materials_id",
        "unique_props":"$materials.unique_props",
        "pto_size":"$materials.pto_size",
        "unit_production":"$materials.unit_production",
        "status":"$materials.status",
        "date_confirm":"$materials.date_confirm",
        "user_email":"$materials.user_email",
        "date_change":"$materials.date_change",
        "purchase_status":"$materials.purchase_status",
        "unit_price":"$materials.unit_price",
        "fact_size":"$materials.fact_size",
        "fact_price":"$materials.fact_price",
        "has_blank":"$materials.has_blank",
        "purchase_date_confirm":"$materials.purchase_date_confirm",
        "purchase_user_email":"$materials.purchase_user_email",
        }
      },
      {"$match":matchStatuses},
      #{"$group":{"_id":"$sector_id", "contract_ids":{"$addToSet":{"materials_group_id":"$materials_group_id", "contract_id":"$contract_id"}}}}
    ])
    for row in dataResultCursor:
      dataResult.append(row)

    # get sectors list
    arrDataSectors = sectormodel.get_all_only_sectors()
    dataSectors = {}
    for row in arrDataSectors:
      dataSectors[str(row['_id'])] = row;

    # get materials list
    arrDataMaterialsGroups = materialsgroupmodel.get_all_only_groups();
    dataMaterialsGroups = {}
    for row in arrDataMaterialsGroups:
      dataMaterialsGroups[str(row['_id'])] = row;

    arrDataMaterials = materialsgroupmodel.get_all_materials()
    dataMaterials = {}
    for row in arrDataMaterials:
      dataMaterials[row['_id']] = row;

    # get  information about production by contract_numbers
    dataProducts = contractmodel.get_products_by_contractnumbers(contract_numbers)
    if(dataResult):
      for cData in dataResult:
        cData['contract_id'] = str(cData['contract_id'])
        cData['calculation_id'] = str(cData['calculation_id'])
        cData['id'] = str(cData['id'])
        cData['sector_id'] = str(cData['sector_id'])
        cData['production_id'] = str(cData['production_id'])
        cData['materials_group_id'] = str(cData['materials_group_id'])
        cData['materials_id'] = str(cData['materials_id'])
        cData['date_confirm'] = cData['date_confirm'].strftime('%d.%m.%Y %H:%M:%S') if cData['date_confirm'] is not None else ""
        cData['date_change'] = cData['date_change'].strftime('%d.%m.%Y %H:%M:%S')
        cData['purchase_date_confirm'] = cData['purchase_date_confirm'].strftime('%d.%m.%Y %H:%M:%S') if cData['purchase_date_confirm'] is not None else ""
        cData['unit_purchase_value'] = dataMaterials[cData['materials_id']]['unit_purchase_value']
        cData['size'] = routine.strToFloat(cData['pto_size'])* dataMaterials[cData['materials_id']]['unit_purchase_value']
        cData['unit_size_pto'] = routine.strToFloat(cData['pto_size'])* dataMaterials[cData['materials_id']]['unit_pto_value']
        cData['productUnitsCount'] = routine.strToInt(dataProducts[cData['production_id']]['count']) if cData['production_id'] in dataProducts else 0;
        cData['fullSize'] = cData['productUnitsCount'] * cData['size']
        cData['unit'] = dataMaterials[cData['materials_id']]['unit_purchase']
        cData['materials_price'] = dataMaterials[cData['materials_id']]['price']
        cData['allElementsPrice'] = routine.strToFloat(cData['unit_price']) if routine.strToFloat(cData['unit_price']) >0 else  routine.strToFloat(dataMaterials[cData['materials_id']]['price'])
        cData['fullPrice'] =  cData['allElementsPrice'] * cData['fullSize']
        cData['sku_name'] = dataMaterials[cData['materials_id']]['sku_name'];
        cData['sku_count'] =  routine.strToFloat(cData['pto_size']) * routine.strToFloat(dataMaterials[cData['materials_id']]['sku_pto_proportion']) * cData['productUnitsCount']
        cData['deliverySize'] = routine.strToFloat(dataMaterials[cData['materials_id']]['delivery_size'])
        cData['deliveryTimeMin'] = dataMaterials[cData['materials_id']]['delivery_time_min']
        cData['deliveryTimeMax'] = dataMaterials[cData['materials_id']]['delivery_time_max']

        cData['amountPrice'] =  (cData['deliverySize']*cData['allElementsPrice']) if cData['deliverySize'] > cData['fullSize'] else cData['fullPrice']
        cData['materialsgroup_routine'] =int(dataMaterialsGroups[cData['materials_group_id']]['routine']) if  dataMaterialsGroups[cData['materials_group_id']]['routine']!="" else 0
        cData['materialsgroup_name'] = dataMaterialsGroups[cData['materials_group_id']]['name']
        cData['materialsgroup_code'] = dataMaterialsGroups[cData['materials_group_id']]['code']

        cData['sector_name']=dataSectors[cData['sector_id']]['name']
        cData['sector_code']=dataSectors[cData['sector_id']]['code']
        cData['sector_routine']=int(dataSectors[cData['sector_id']]['routine']) if  dataSectors[cData['sector_id']]['routine']!="" else 0
        cData['materials_name'] = dataMaterials[cData['materials_id']]['name']
        cData['materials_code'] = dataMaterials[cData['materials_id']]['code']
      # dataResult.sort(key = lambda x: (x['sector_routine'],x['sector_name'],x['sector_code'],x['materialsgroup_routine'],x['materialsgroup_name'],x['materialsgroup_code'],x['materials_name']))
    return dataResult
  except pymongo.errors.PyMongoError as e:
    abort(400, e)

def get_purchase_statistic():
  """Get calculation statistic by orders materials

  Returns:
  A dict mapping keys to the corresponding  order calculation materials statistic .
  """

  dataResult = []

  result = {
    CALCULATION_SEARCH_TYPE['ALL']:{'contracts':[], 'orders':[], 'sectors':[]},
    CALCULATION_SEARCH_TYPE['TOCONFIRM']:{'contracts':[], 'orders':[], 'sectors':[]},
    CALCULATION_SEARCH_TYPE['CONFIRMED']:{'contracts':[], 'orders':[], 'sectors':[]},
    CALCULATION_SEARCH_TYPE['INPAY']:{'contracts':[], 'orders':[], 'sectors':[]},
    CALCULATION_SEARCH_TYPE['PAYED']:{'contracts':[], 'orders':[], 'sectors':[]},
    CALCULATION_SEARCH_TYPE['ONSTORE']:{'contracts':[], 'orders':[], 'sectors':[]},
    CALCULATION_SEARCH_TYPE['ONWORK']:{'contracts':[], 'orders':[], 'sectors':[]},
    CALCULATION_SEARCH_TYPE['PANTLYPAYED']:{'contracts':[], 'orders':[], 'sectors':[]}
  }

  try:
    # get all sectors
    arrDataSectors = sectormodel.get_all_only_sectors()
    dataSectors = {}
    for row in arrDataSectors:
      dataSectors[row['_id']] = row

    dataResultCursor = db.m_calculation.aggregate([
      {"$project":{"_id":0, "sector_id":1, "product_number":1, "contract_number":1,"order_number":1, "contract_id":1, "materials":1}},
      {"$unwind": "$materials"},
      {"$project":{"sector_id":1, "product_number":1,"contract_number":1,"order_number":1, "contract_id":1, "status":"$materials.status", "purchase_status":"$materials.purchase_status" }},
      {"$match":{"status":"1"}},
      {"$group":{"_id":"$purchase_status", "sector_ids":{"$addToSet":"$sector_id"}, "contract_numbers":{"$addToSet":"$contract_number"}, "order_numbers":{"$addToSet":"$order_number"}}}
    ])

    for row in dataResultCursor:
      dataResult.append(row)

    # fill result structure
    for item in dataResult:
      result[CALCULATION_SEARCH_TYPE['ALL']]['contracts'] = list(set(result[CALCULATION_SEARCH_TYPE['ALL']]['contracts'] +  item['contract_numbers']))
      result[CALCULATION_SEARCH_TYPE['ALL']]['orders'] = list(set(result[CALCULATION_SEARCH_TYPE['ALL']]['orders'] +  item['order_numbers']))
      result[CALCULATION_SEARCH_TYPE['ALL']]['sectors'] = list(set(result[CALCULATION_SEARCH_TYPE['ALL']]['sectors'] +  item['sector_ids']))
      if (item['_id'] == CALCULATION_PURCHASE_STATUS['ONCONFIRM'] or item['_id']==""):
        result[CALCULATION_SEARCH_TYPE['TOCONFIRM']]['contracts'] = list(set(result[CALCULATION_SEARCH_TYPE['TOCONFIRM']]['contracts'] +  item['contract_numbers']))
        result[CALCULATION_SEARCH_TYPE['TOCONFIRM']]['orders'] = list(set(result[CALCULATION_SEARCH_TYPE['TOCONFIRM']]['orders'] +  item['order_numbers']))
        result[CALCULATION_SEARCH_TYPE['TOCONFIRM']]['sectors'] = list(set(result[CALCULATION_SEARCH_TYPE['TOCONFIRM']]['sectors'] +  item['sector_ids']))
      elif(item['_id'] == CALCULATION_PURCHASE_STATUS['REJECTED']):
        result[CALCULATION_SEARCH_TYPE['TOCONFIRM']]['contracts'] = list(set(result[CALCULATION_SEARCH_TYPE['TOCONFIRM']]['contracts'] +  item['contract_numbers']))
        result[CALCULATION_SEARCH_TYPE['TOCONFIRM']]['orders'] = list(set(result[CALCULATION_SEARCH_TYPE['TOCONFIRM']]['orders'] +  item['order_numbers']))
        result[CALCULATION_SEARCH_TYPE['TOCONFIRM']]['sectors'] = list(set(result[CALCULATION_SEARCH_TYPE['TOCONFIRM']]['sectors'] +  item['sector_ids']))
      elif(item['_id'] == CALCULATION_PURCHASE_STATUS['CONFIRMED']):
        result[CALCULATION_SEARCH_TYPE['CONFIRMED']]['contracts'] = list(set(result[CALCULATION_SEARCH_TYPE['CONFIRMED']]['contracts'] +  item['contract_numbers']))
        result[CALCULATION_SEARCH_TYPE['CONFIRMED']]['orders'] = list(set(result[CALCULATION_SEARCH_TYPE['CONFIRMED']]['orders'] +  item['order_numbers']))
        result[CALCULATION_SEARCH_TYPE['CONFIRMED']]['sectors'] = list(set(result[CALCULATION_SEARCH_TYPE['CONFIRMED']]['sectors'] +  item['sector_ids']))
      elif(item['_id'] == CALCULATION_PURCHASE_STATUS['INPAY']):
        result[CALCULATION_SEARCH_TYPE['INPAY']]['contracts'] = list(set(result[CALCULATION_SEARCH_TYPE['INPAY']]['contracts'] +  item['contract_numbers']))
        result[CALCULATION_SEARCH_TYPE['INPAY']]['orders'] = list(set(result[CALCULATION_SEARCH_TYPE['INPAY']]['orders'] +  item['order_numbers']))
        result[CALCULATION_SEARCH_TYPE['INPAY']]['sectors'] = list(set(result[CALCULATION_SEARCH_TYPE['INPAY']]['sectors'] +  item['sector_ids']))
      elif(item['_id'] == CALCULATION_PURCHASE_STATUS['PAYED']):
        result[CALCULATION_SEARCH_TYPE['PAYED']]['contracts'] = list(set(result[CALCULATION_SEARCH_TYPE['PAYED']]['contracts'] +  item['contract_numbers']))
        result[CALCULATION_SEARCH_TYPE['PAYED']]['orders'] = list(set(result[CALCULATION_SEARCH_TYPE['PAYED']]['orders'] +  item['order_numbers']))
        result[CALCULATION_SEARCH_TYPE['PAYED']]['sectors'] = list(set(result[CALCULATION_SEARCH_TYPE['PAYED']]['sectors'] +  item['sector_ids']))
      elif(item['_id'] == CALCULATION_PURCHASE_STATUS['ONSTORE']):
        result[CALCULATION_SEARCH_TYPE['ONSTORE']]['contracts'] = list(set(result[CALCULATION_SEARCH_TYPE['ONSTORE']]['contracts'] +  item['contract_numbers']))
        result[CALCULATION_SEARCH_TYPE['ONSTORE']]['orders'] = list(set(result[CALCULATION_SEARCH_TYPE['ONSTORE']]['orders'] +  item['order_numbers']))
        result[CALCULATION_SEARCH_TYPE['ONSTORE']]['sectors'] = list(set(result[CALCULATION_SEARCH_TYPE['ONSTORE']]['sectors'] +  item['sector_ids']))
      elif(item['_id'] == CALCULATION_PURCHASE_STATUS['ONWORK']):
        result[CALCULATION_SEARCH_TYPE['ONWORK']]['contracts'] = list(set(result[CALCULATION_SEARCH_TYPE['ONWORK']]['contracts'] +  item['contract_numbers']))
        result[CALCULATION_SEARCH_TYPE['ONWORK']]['orders'] = list(set(result[CALCULATION_SEARCH_TYPE['ONWORK']]['orders'] +  item['order_numbers']))
        result[CALCULATION_SEARCH_TYPE['ONWORK']]['sectors'] = list(set(result[CALCULATION_SEARCH_TYPE['ONWORK']]['sectors'] +  item['sector_ids']))
      elif(item['_id'] == CALCULATION_PURCHASE_STATUS['PANTLYPAYED']):
        result[CALCULATION_SEARCH_TYPE['PANTLYPAYED']]['contracts'] = list(set(result[CALCULATION_SEARCH_TYPE['PANTLYPAYED']]['contracts'] +  item['contract_numbers']))
        result[CALCULATION_SEARCH_TYPE['PANTLYPAYED']]['orders'] = list(set(result[CALCULATION_SEARCH_TYPE['PANTLYPAYED']]['orders'] +  item['order_numbers']))
        result[CALCULATION_SEARCH_TYPE['PANTLYPAYED']]['sectors'] = list(set(result[CALCULATION_SEARCH_TYPE['PANTLYPAYED']]['sectors'] +  item['sector_ids']))

    # sort contract and orders
    for typeSearch in result:
      if len(result[typeSearch]['contracts'])>0:
        result[typeSearch]['contracts'].sort();
      if len(result[typeSearch]['orders'])>0:
        result[typeSearch]['orders'].sort();
      tmp = []
      if(len(result[typeSearch]['sectors'])>0):
        for item in result[typeSearch]['sectors']:
          sectorInfo = dataSectors[str(item)]
          tmp.append({'id':sectorInfo['_id'], 'number':sectorInfo['code'],'name': sectorInfo['name'],'routine':int(sectorInfo['routine']) if sectorInfo['routine']!="" else 0, 'checked':'0'})

        tmp.sort(key = lambda x:x['routine'])
        result[typeSearch]['sectors']=tmp

      tmp = [];
      if len(result[typeSearch]['orders'])>0:
        for item in result[typeSearch]['orders']:
          tmp.append({'number':item,'name':item,'checked':'0'})
        result[typeSearch]['orders'] = tmp;
      tmp = [];
      if len(result[typeSearch]['contracts'])>0:
        for item in result[typeSearch]['contracts']:
          tmp.append({'number':item,'name':item,'checked':'0'})
        result[typeSearch]['contracts'] = tmp;

    return result
  except pymongo.errors.PyMongoError as e:
    abort(400, e)

def get_stat(contract_number):
  """Get fact plan norms statistic

  Returns:
  A dict with materials from plan norms.
  Data grouped by: order number, material group key, material key
  """

  result = None
  try:
    # get data from calculation collection
    #match = {"$match":{}}
    #if contract_number is not None:
    #match = {"$match":{'contract_number': contract_number, 'status':"1"}}
    dataResult = []
    dataResultCursor =  db.m_calculation.aggregate([
      {"$project":
        {
          "order_number":1,
          "contract_number":1,
          "product_number":1,
          "materials":1
        }
      },
      {"$unwind": "$materials"},
      {"$project":
        {
          "order_number":"$order_number",
          "contract_number":"$contract_number",
          "product_number":"$product_number",
          "materials_group_key": "$materials.materials_group_key",
          "materials_key": "$materials.materials_key",
          "pto_size": "$materials.pto_size",
          "material_id": "$materials.materials_id",
          "status": "$materials.status",
          "unique_props": "$materials.unique_props",
        }
      },
      {"$sort" : {
        "contract_number" : 1,
        "product_number": 1,
        "materials_group_key":1,
        "materials_key": 1
      }},
      {"$match":{'contract_number': contract_number}}
    ])

    for row in dataResultCursor:
      dataResult.append(row)

    # all materials
    arrDataMaterials = materialsgroupmodel.get_all_materials()
    dataMaterials = {}
    for row in arrDataMaterials:
      dataMaterials[row['_id']] = row;

    # collect data
    if(dataResult):
      for cData in dataResult:
        try:
          cData['material_name'] = dataMaterials[str(cData['material_id'])]['name']
          cData['material_unique_props'] = dataMaterials[str(cData['material_id'])]['unique_props'] if 'unique_props' in dataMaterials[str(cData['material_id'])] else []
          cData['unit_pto'] = dataMaterials[str(cData['material_id'])]['unit_pto']
        except Exception, ex:
          pass

    return dataResult
  except pymongo.errors.PyMongoError as e:
    raise Exception("Can't get plan norms statistic: %s" %(str(e)))

def get_calculation_stat(contract_numbers, product_numbers):
  """Get calculation statistic

  Returns:
  A dict with works and materials from plan norms and work orders.
  Data grouped by: order number, material group key, material key
  """

  result = None
  try:

    dataResult = []
    match = {}
    match["contract_number"] = {"$in":contract_numbers}
    if len(product_numbers)>0:
      match["product_number"] = {"$in":product_numbers}

    dataResultCursor =  db.m_calculation.aggregate([
      {"$project":
        {
          "order_number":1,
          "contract_number":1,
          "product_number":1,
          "production_id":1,
          "materials":1,
          "sector_code":1,
          "sector_id":1,
          "sector_name":1
        }
      },
      # {"$match":{
      #     "contract_number":{"$in":contract_numbers},
      #     "product_number":{"$in":product_numbers}
      #   }
      # },
      {"$match": match},
      {"$unwind": "$materials"},
      {"$project":
        {
          "order_number":"$order_number",
          "contract_number":"$contract_number",
          "product_number":"$product_number",
          "production_id":"$production_id",
          "materials_group_key": "$materials.materials_group_key",
          "materials_key": "$materials.materials_key",
          "pto_size": "$materials.pto_size",
          "material_id": "$materials.materials_id",
          "status": "$materials.status",
          "note": "$materials.note",
          "unique_props": "$materials.unique_props",
          "unique_props_info" : "$materials.unique_props_info",
          "sector_code":"$sector_code",
          "sector_id":"$sector_id",
          "sector_name":"$sector_name",
          "date_change": "$materials.date_change",
          "user_email": "$materials.user_email",
          "last_goods": "$materials.last_goods",
          "unit_si": "$materials.unit_si",
          "facts": "$materials.facts",
        }
      },
      #{"$match":{"status":"1"}},
      {"$sort" : { "contract_number" : 1, "product_number": 1, "sector_code": 1, "materials_group_key":1, "materials_key": 1 } }
    ])
    for row in dataResultCursor:
      dataResult.append(row)
    return dataResult
  except pymongo.errors.PyMongoError as e:
    raise Exception("Can't get plan calculation statistic: %s" %(str(e)))

def get_list_by(args=None, fields = None):
  '''
    Получение списка объектов по заданным параметрам
  '''
  data=[]
  try:
    for row in db.m_calculation.find(args, fields):
      data.append(row)
    return data
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))
