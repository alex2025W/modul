#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import abort
from config import db
import json
import pymongo
import datetime
from traceback import print_exc
from bson.objectid import ObjectId
from models import countersmodel
import routine

def get_all():
  '''
  get all materialsgroups with materials
  '''
  try:
    result = []
    dataResult = db.m_materialsgroup.find().sort([('routine',1), ('materials.name',1)])
    for row in dataResult:
      row["_id"] = str(row["_id"])
      result.append(row)
    return result
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))

def get_all_only_groups():
  '''
  get all materialsgroups without materials
  '''
  try:
    result = []
    dataResult = db.m_materialsgroup.find({},
      {
        '_id':1,
        'code':1,
        'routine':1,
        'name':1,
        'note':1,
        'type':1,
        'is_active': 1
      }).sort('routine', direction=1)
    for row in dataResult:
      row["_id"] = str(row["_id"])
      result.append(row)
    return result
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))

def get_materials_unique_props(condition):
  '''
  get all unique props, grouped by material_id
  Returns:
  A dict with all materials and their unique props
  '''
  try:
    dataMaterials =  db.m_materialsgroup.aggregate([
      {'$unwind': '$materials'},
      {"$project":
        {
          "group_id":"$_id",
          "group_code":"$code",
          "_id":"$materials._id",
          "code":"$materials.code",
          "global_code":"$materials.global_code",
          "unique_props": "$materials.unique_props"
        }
      },
      {"$match":condition},
    ])
    arrMaterials = {}
    if(dataMaterials):
      for material_info in dataMaterials:
        arrMaterials[material_info['_id']] = material_info
    return arrMaterials
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))


def get_materials(condition={}):
  ''' get materials by condition
  Returns:
  A dict with ggods in groups
  {'materials_id':materials_info,'materials_id':materials_info}
   '''

  try:
    result = []
    dataResult = db.m_materialsgroup.aggregate([
      {'$unwind': '$materials'},
      {'$project':{
        'group_id':'$_id',
        'group_code':'$code',
        'group_name':'$name',
        '_id':'$materials._id',
        'code':'$materials.code',
        'name':'$materials.name',
        'type':'$materials.type',
        'supplier_code':'$materials.supplier_code',
        'unit_pto':'$materials.unit_pto',
        'unit_pto_value':'$materials.unit_pto_value',
        'unit_purchase':'$materials.unit_purchase',
        'unit_purchase_value':'$materials.unit_purchase_value',
        'calculation':'$materials.calculation',
        'price':'$materials.price',
        'delivery_time_max':'$materials.delivery_time_max',
        'delivery_time_min':'$materials.delivery_time_min',
        'delivery_size':'$materials.delivery_size',
        'delivery_price':'$materials.delivery_price',
        'price_date':'$materials.price_date',
        'sku_name':'$materials.sku_name',
        'sku_pto_proportion':'$materials.sku_pto_proportion',
        'note':'$materials.note',
        'tech_using':'$materials.tech_using',
        'is_active':'$materials.is_active',
        'user_email':'$materials.user_email',
        'date_change':'$materials.date_change',
        'works': '$materials.works',
        'unique_props': '$materials.unique_props',
        'manufact_sector_id':'$materials.manufact_sector_id',
        'out_sector_id':'$materials.out_sector_id',
        'tags':'$materials.tags',
        'labels':'$materials.labels',
        'linked_materials': '$materials.linked_materials',
        'global_code': '$materials.global_code',
        'last_goods': '$materials.last_goods',
        }
      },
      {'$match':condition},
      {'$sort':{'name': 1}}
    ])

    if(dataResult):
      for row in dataResult:
        result.append(row)
    return result

  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))


def get_unique_props(condition={}):
  '''
    Получение  уникальных характеристик
  '''

  try:
    result = []
    dataResult = db.m_materialsgroup.aggregate([
      {'$unwind': '$materials'},
      {'$project':{
        'group_id':'$_id',
        'group_code':'$code',
        'group_name':'$name',
        '_id':'$materials._id',
        'code':'$materials.code',
        'global_code': '$materials.global_code',
        'name':'$materials.name',
        'supplier_code':'$materials.supplier_code',
        'unit_pto':'$materials.unit_pto',
        'unit_pto_value':'$materials.unit_pto_value',
        'unit_purchase':'$materials.unit_purchase',
        'unit_purchase_value':'$materials.unit_purchase_value',
        'calculation':'$materials.calculation',
        'price':'$materials.price',
        'delivery_time_max':'$materials.delivery_time_max',
        'delivery_time_min':'$materials.delivery_time_min',
        'delivery_size':'$materials.delivery_size',
        'delivery_price':'$materials.delivery_price',
        'price_date':'$materials.price_date',
        'sku_name':'$materials.sku_name',
        'sku_pto_proportion':'$materials.sku_pto_proportion',
        'note':'$materials.note',
        'is_active':'$materials.is_active',
        'user_email':'$materials.user_email',
        'date_change':'$materials.date_change',
        'works': '$materials.works',
        'unique_props': '$materials.unique_props',
        'manufact_sector_id':'$materials.manufact_sector_id',
        'out_sector_id':'$materials.out_sector_id',
        'last_goods': '$materials.last_goods',
        }
      },
      {'$unwind': '$unique_props'},
      {'$project':{
        'group_id':1,
        'group_code':1,
        'group_name':1,
        'material_id': '$_id',
        'material_code': '$code',
        'material_global_code': '$global_code',
        'material_name': '$name',
        'material_is_active': '$is_active',
        'material_unit_pto': '$unit_pto',
        'material_last_goods': '$last_goods',
        'prop_is_active': '$unique_props.is_active',
        'prop_name': '$unique_props.name',
        'prop_norm_price': '$unique_props.norm_price',
        'prop_id': '$unique_props._id',
        'prop_key': '$unique_props.key',
        'prop_global_code': '$unique_props.global_code',
        'prop_date_change':'$unique_props.date_change',
        'prop_user_email':'$unique_props.user_email',
        'prop_last_goods':'$unique_props.last_goods',
        }
      },
      {'$match':condition},
      {'$sort':{'group_code':1, 'material_code':1, 'prop_key': 1}}
    ])

    if(dataResult):
      for row in dataResult:
        result.append(row)
    return result

  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))

def get_all_materials():
  ''' get all materials in all groups

  Returns:
  A dict with all ggods in all groups
  {'materials_id':materials_info,'materials_id':materials_info}
   '''

  try:
    result = []
    dataResult = db.m_materialsgroup.aggregate([
      {"$unwind": "$materials"},
      {"$project":{
        "group_id":"$_id",
        "group_code":"$code",
        "group_name":"$name",
        "_id":"$materials._id",
        "code":"$materials.code",
        "global_code":"$materials.global_code",
        "name":"$materials.name",
        "type":"$materials.type",
        "supplier_code":"$materials.supplier_code",
        "unit_pto":"$materials.unit_pto",
        "unit_pto_value":"$materials.unit_pto_value",
        "unit_purchase":"$materials.unit_purchase",
        "unit_purchase_value":"$materials.unit_purchase_value",
        "calculation":"$materials.calculation",
        "price":"$materials.price",
        "delivery_time_max":"$materials.delivery_time_max",
        "delivery_time_min":"$materials.delivery_time_min",
        "delivery_size":"$materials.delivery_size",
        "delivery_price":"$materials.delivery_price",
        "price_date":"$materials.price_date",
        "sku_name":"$materials.sku_name",
        "sku_pto_proportion":"$materials.sku_pto_proportion",
        "note":"$materials.note",
        "is_active":"$materials.is_active",
        "user_email":"$materials.user_email",
        "date_change":"$materials.date_change",
        "works": "$materials.works",
        "unique_props": "$materials.unique_props",
        'manufact_sector_id':"$materials.manufact_sector_id",
        'out_sector_id':"$materials.out_sector_id",
        }
      },
      {"$sort":{"name": 1}}
    ])

    if(dataResult):
      for row in dataResult:
        row["_id"] = str(row["_id"])
        result.append(row)
    return result

  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))

def update(condition, data):
  ''' Update data'''
  try:
    db.m_materialsgroup.update(condition,{'$set':data})
  except pymongo.errors.OperationFailure:
    abort(400, "Operation failure")
  except pymongo.errors.PyMongoError as e:
    abort(400, "server_error")
  return data

def get_by(args, fields=None):
  '''get info by filter'''
  try:
    data = db.m_materialsgroup.find(args, fields)
    return data
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))

def get_one(args, fields=None):
  '''get info by filter'''
  try:
    return db.m_materialsgroup.find_one(args, fields)
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))

def get_list(args, fields):
  data=[]
  try:
    for d in db.m_materialsgroup.find(args, fields):
      data.append(d)
    return data
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))

def do_aggregate(conditions_arr):
  '''
  Универсальная функция выполнения aggregate
  '''
  try:
    dataResult = []
    for row in db.m_materialsgroup.aggregate(conditions_arr):
      dataResult.append(row)
    return dataResult
  except pymongo.errors.PyMongoError as e:
    raise Exception("Error! Can't get materials: %s" %(str(e)))

def get_all_units():
  '''
    Поолучение всех уникальных единиц измерения в материалах
    Результатом является объект: {"unit_pto":[],"unit_purchase":[],"sku_name":[]'}
   '''
  cond =[
    {'$unwind': '$materials'},
    {'$group':
      {
        '_id':{},
        'unit_pto':{'$addToSet':'$materials.unit_pto'},
        'unit_purchase':{'$addToSet':'$materials.unit_purchase'},
        'sku_name':{'$addToSet':'$materials.sku_name'},
      }
    },
    {'$project':{
      '_id':0,
      'unit_pto':'$unit_pto',
      'unit_purchase':'$unit_purchase',
      'sku_name':'$sku_name',
        }
    }
  ]
  return do_aggregate(cond)[0]

def add_material_to_group(group_code, row):
  '''
    Добавление новго материала в группу
  '''
  try:
    db.m_materialsgroup.update({'code': group_code},{'$push':{'materials': row}})
  except pymongo.errors.OperationFailure as e:
    raise Exception(str(e))
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))


def get_next_sequence_material(group_code, material_type = 'standart'):
  '''
    Получение значение счетчика для мотериала в группе
    При получении нового значения, происходит инкремент счетчика
    material_type = standatr/not_standart
  '''
  try:
    tmp_index = None
    index_key = 'std_material_seq'
    index_key_arr = 'std_material_seq_arr'
    start_index_value = 1
    if material_type != 'standart':
      index_key = 'nstd_material_seq'
      index_key_arr = 'nstd_material_seq_arr'
      start_index_value = 500

    # получение информации об объекте
    data = db.m_materialsgroup.find_one({ "code": group_code })
    # если счетчик еще не начался, то создаем его
    if not data.get(index_key):
      data[index_key] = start_index_value
      tmp_index = {'i': start_index_value, 'status':False, 'date': datetime.datetime.utcnow()}
      data[index_key_arr] = [tmp_index]
      db.m_materialsgroup.update(
        {'code': group_code},
        {'$set': {index_key: data[index_key], index_key_arr: data[index_key_arr] }}
      )
    else:
      # поиск с отрицательным статусом номера в списке выданных номеров
      # если такой есть и его дата в прошлом более чем на 1 час, то используем его, елси нет, то создаем новый
      try:
        tmp_index =  (item for item in data[index_key_arr] if not item['status'] and (not item.get('date') or  routine.floor(((datetime.datetime.utcnow() - item.get('date')).seconds) / 60)>60 )).next()
        db.m_materialsgroup.update(
          {'code': group_code, index_key_arr+'.i': tmp_index},
          {'$set': {index_key_arr+'.$.date': datetime.datetime.utcnow()}}
        )
      except Exception:
        print_exc()
        pass

      # если нашли свабодный индекс
      if not tmp_index:
        data[index_key] = data[index_key]+1
        tmp_index = {'i':data[index_key], 'status':False, 'date': datetime.datetime.utcnow()}
        data[index_key_arr].append(tmp_index)
        db.m_materialsgroup.update({'code': group_code},{'$set': {index_key: data[index_key] }})
        db.m_materialsgroup.update({'code': group_code},{"$push": {index_key_arr: tmp_index}})
    return tmp_index['i']

  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))

def remove_sequence_material(group_code, i, material_type = 'standart'):
  '''
    Освабождение счетчика
    i - номер счетчика
    id - id объекта в котором ведется счетчик
    material_type = standatr/not_standart
  '''
  try:
    index_key = 'std_material_seq'
    index_key_arr = 'std_material_seq_arr'
    if material_type != 'standart':
      index_key = 'nstd_material_seq'
      index_key_arr = 'nstd_material_seq_arr'

    db.m_materialsgroup.update(
      {'code': group_code, index_key_arr + '.i': i},
      {'$set': {index_key_arr + '.$.status':False, index_key_arr + '.$.date':None }}
    )
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))

def apply_sequence_material(group_code, i, material_type = 'standart'):
  '''
    Освабождение счетчика
    i - номер счетчика
    id - id объекта в котором ведется счетчик
    material_type = standatr/not_standart
  '''
  try:
    index_key = 'std_material_seq'
    index_key_arr = 'std_material_seq_arr'
    if material_type != 'standart':
      index_key = 'nstd_material_seq'
      index_key_arr = 'nstd_material_seq_arr'

    db.m_materialsgroup.update(
      {'code': group_code, index_key_arr + '.i': i},
      {'$set': {index_key_arr + '.$.status':True }}
    )
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))


# def get_new_material_code(group_code, material_type='standart'):
#   '''
#     Получение кода для нового материала
#     material_type = standatr/not_standart
#   '''
#   try:
#     cond =[
#       {"$match":{'code': group_code}},
#       {'$unwind': '$materials'},
#       {'$group':
#         {
#           '_id':{},
#           'code':{'$max':'$materials.code'},
#         }
#       },
#       {'$project':{'_id':0, 'code':'$code'} }
#     ]
#     return do_aggregate(cond)[0]['code'] + 1
#   except:
#     return 1

def add_new_unique_preset(material_id, unique_props):
  '''
  Добавление нового пресета уникальных характеристик  в материал
  Если пресет уже существует, то возвращается существующий,
  если нет, то создается новый и возвращается
  material_id - id материала
  unique_props - список уникальных характеристик на проверку
  '''
  new_prop = None
  unique_props.sort(key = lambda x:(x['key']))
  tmp_unique_props_keys_list = []
  tmp_unique_props_names_list = []
  for u_prop in unique_props:
    tmp_unique_props_keys_list.append(str(u_prop['key']))
    tmp_unique_props_names_list.append(u_prop['name'])
  tmp_unique_props_names_str = '; '.join(tmp_unique_props_names_list)
  tmp_unique_props_keys_str = '_'.join(tmp_unique_props_keys_list)

  # получение материала по id
  row_material_group = get_one({'materials._id': material_id},{'materials.$':1})
  if row_material_group and row_material_group['materials'] and len(row_material_group['materials'])>0:
    new_prop_key = 0
    cur_unique_props = row_material_group['materials'][0].get('unique_props', [])
    for row_prop in cur_unique_props:
      if row_prop.get('type') == 'preset':
        if row_prop['key']>new_prop_key:
          new_prop_key = row_prop['key']
        if row_prop.get('hash') == tmp_unique_props_keys_str:
          new_prop = row_prop
          break
    if not new_prop:
      new_prop = {
        '_id': ObjectId(),
        'global_code': routine.insert_dash(routine.pad(countersmodel.get_next_sequence('materials'), 6), 3),
        'key': new_prop_key + 1 if new_prop_key>=500 else 500, # ключи пресетов начинаются от 500
        'name': tmp_unique_props_names_str,
        'hash': tmp_unique_props_keys_str,
        'type': 'preset',
        'is_active': True,
        'items': unique_props
      }
      cur_unique_props.append(new_prop)
      # добавление новой характеристики в список характеристик материала в справчонике
      update( {'materials._id' : ObjectId(material_id)}, {'materials.$.unique_props' : cur_unique_props})
  return new_prop
