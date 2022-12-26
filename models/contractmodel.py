#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import abort
from config import db
import json
import pymongo
import datetime
from models import countersmodel
import routine
import copy
from bson.objectid import ObjectId
from models import paymentmodel
from routine import JSONEncoder

"""DataBase Fields"""
# договор
CONTRACT = dict(
  ID="_id", # Идентификатор договора(MongoId)
  PARENT_ID="parent_id", # ID родительского договора(MongoId)
  NUMBER="number", # Номер договора(Counter)
  CUSTOMER_NUMBER="customer_number", # Номер договора от заказчика(String)
  DATE_ADD="date_add", # Дата создания(DateTime)
  DEADLINE="deadline", # Крайний срок по договору(DateTime)
  CLIENT_ID="client_id", # Идентификатор заказчика(String)
  CLIENT_NAME="client_name", # Наименование заказчика(String)
  IS_SIGNED="is_signed", # Договор подписан(1-да)
  SIGN_DATE="sign_date", # Дата подписания(DateTime)
  IS_PAID="is_paid", # Договор оплачен(1-да)
  PAY_DATE="pay_date", # Дата оплаты(DateTime)
  FACTORY_ID="factory_id", # ID Завода(MongoId)
  NOTE="note", # Пометка(String)
  USER_EMAIL="user_email", # Изменения внес(String)
  DATE_CHANGE="date_change", # Дата изменений(DateTime)
)
# продукция
PRODUCTION = dict(
  ID="_id", # идентификатор продукции
  NUMBER_GAPS="number_gaps", # Номер продукции
  NAME="name", # наименование
  SQUARE="square", #Площадь
  COUNT="count", # Количество
  USER_EMAIL="user_email", # Изменения внес(String)
  DATE_CHANGE="date_change", # Дата изменений(DateTime)
)
# единицы продукции
PRODUCTION_UNIT = dict(
  ID="_id", # идентификатор единицы продукции
  NUMBER="number", # Номер единицы продукции
)

"""Methods"""
def find_short_by_numbers(numbers):
  """ get all contracts short info without any data like as production and payments """

  try:
    result = []
    cond = {
      '$or': [{ "parent_id": { '$exists': False }},{ "parent_id":None},{"parent_id": ''}]
    }
    if(numbers>0 and len(numbers)>0):
      cond["number"]= {"$in":numbers}

    dataResult = db.m_contract.find(cond,
      {
        '_id':1,
        'parent_id':1,
        'number':1,
        'customer_number':1,
        'date_add':1,
        'deadline':1,
        'client_id':1,
        'client_name':1,
        'is_signed':1,
        'sign_date':1,
        'is_paid':1,
        'pay_date':1,
        'factory_id':1,
        'note':1,
        'user_email':1,
        'date_change':1
      }
      ).sort('order', direction=1)

    for row in dataResult:
      row["_id"] = str(row["_id"])
      result.append(row)
    return result

  except pymongo.errors.PyMongoError as e:
    abort(400, "server_error")

def find_short(filter=None):
  """ get all contracts short info without any data like as production and payments """

  try:
    result = []
    dataResult = db.m_contract.find(filter,
      {
        '_id':1,
        'parent_id':1,
        'number':1,
        'customer_number':1,
        'date_add':1,
        'deadline':1,
        'client_id':1,
        'client_name':1,
        'is_signed':1,
        'sign_date':1,
        'is_paid':1,
        'pay_date':1,
        'factory_id':1,
        'note':1,
        'user_email':1,
        'date_change':1
      }
      ).sort('order', direction=1)

    for row in dataResult:
      result.append(row)
    return result

  except pymongo.errors.PyMongoError as e:
    abort(400, "server_error")

def get_factory_list():
  """get all factories"""
  try:
    res = []
    for cl in db.m_factory.find(sort=[('name',1)]):
      cl["_id"] = str(cl["_id"])
      res.append(cl)
    return res
  except pymongo.errors.PyMongoError as e:
    abort(400, "server_error")

def get(id):
  """get full info about sector with works and brigades"""

  try:
    return db.m_contract.find_one({'_id': ObjectId(id)})
  except pymongo.errors.PyMongoError as e:
    abort(400,"server_error")

def get_all_products_by_contractnumbers(numbers):
  """ get all products in searched contracts include sub contracts

  numbers - list of contracts ID  ['1','2','3','4']

  Returns:
  A dict with all products by searched contracts
  {'product_id':{product_info}}
  """
  try:
    result = {}
    cond = {
      '$or': [
        { "parent_id": { '$exists': False }},
        { "parent_id":None},{"parent_id": ''}
      ]
    }
    if(len(numbers)>0):
      cond["number"]= {"$in":numbers}
    dataResult = db.m_contract.find(cond,{'productions':1}).sort('name', direction=1)

    for row in dataResult:
      if('productions' in row):
        for product in row['productions']:
          result[str(product['_id'])] = product

      # получить все допники по договору, если в них есть продукция то ее тоже добавить
      subContracts = db.m_contract.find({
          'parent_id': row['_id']
        },
        {
          'productions':1
        }
      ).sort('name', direction=1)

      for sub_row in subContracts:
        if('productions' in sub_row):
          for product in sub_row['productions']:
            result[str(product['_id'])] = product
    return result

  except pymongo.errors.PyMongoError as e:
    abort(400, "server_error")


def get_products_by_contractnumbers(numbers):
  """ get all products in searched contracts

  numbers - list of contracts ID  ['1','2','3','4']

  Returns:
  A dict with all products by searched contracts
  {'product_id':{product_info}}
  """
  try:
    result = {}
    cond = {
      '$or': [{ "parent_id": { '$exists': False }},{ "parent_id":None},{"parent_id": ''}]
    }
    if(len(numbers)>0):
      cond["number"]= {"$in":numbers}
    dataResult = db.m_contract.find(cond,{'productions':1}
      ).sort('name', direction=1)

    for row in dataResult:
      if('productions' in row):
        for product in row['productions']:
          result[str(product['_id'])] = product
    return result

  except pymongo.errors.PyMongoError as e:
    abort(400, "server_error")


def get_by(filter,fields=None):
  """ get contract by filter """
  try:
    return db.m_contract.find_one(filter,fields)
  except pymongo.errors.PyMongoError as e:
    abort(400, "server_error")

def get_list_by(filter, fields = None):
  """ get contract by filter """
  try:
    return db.m_contract.find(filter, fields).sort('number', direction=1)
  except pymongo.errors.PyMongoError as e:
    abort(400, "server_error")


def update(cond, data, insert_if_notfound=True, multi_update=False):
  """ update contract """
  try:
    db.m_contract.update(cond, data, upsert=insert_if_notfound,multi=multi_update)
  except pymongo.errors.OperationFailure as e:
    abort(400, e)
  except pymongo.errors.PyMongoError as e:
    abort(400, "server_error")

def add(data):
  """ add contract """
  try:
    db.m_contract.insert(data)
  except pymongo.errors.OperationFailure as e:
    abort(400, e)
  except pymongo.errors.PyMongoError as e:
    abort(400, "server_error")


def get_all(filter, fields=None, page_size=50, page=1):
  try:
    return db.m_contract.find(filter, fields).sort('number', pymongo.DESCENDING ).skip(page_size*(page-1)).limit(page_size)
  except pymongo.errors.OperationFailure as e:
    abort(400, e)
  except pymongo.errors.PyMongoError as e:
    abort(400, "server_error")


def get_count(cond):
  odb = db.m_contract
  try:
    oo = odb.find(cond).count()
  except pymongo.errors.PyMongoError as e:
    abort(400,"server_error")
  return oo


def update_client(old_id, new_id, new_name):
  odb = db.m_contract
  try:
    oo = odb.update({'client_id': old_id}, {'$set':{'client_id': new_id, 'client_name':new_name}}, multi=True)
  except pymongo.errors.PyMongoError as e:
    abort(400,"server_error")
  return oo


def add_order_to_contract(order_id, order_data, contract_number, user_email):
  contract = get_by({'number':contract_number})

  if not contract:
    abort(400, 'Договор не найден')
  if contract.get('is_signed')=='yes':
    abort(400, 'Договор подписан')

  orders = contract.get('orders',[])
  orders.append({'_id':ObjectId(order_id), 'number':order_data.get("number")})
  contract['orders'] = orders

  draft = None
  if contract.get('draft'):
    draft = json.loads(contract.get('draft'))
  else:
    draft = copy.deepcopy(contract)
  draft['is_draft'] = True
  for p in order_data.get("products",[]):
    p_id = 'new_'+str(ObjectId())

    pr_el = {
      "type" : p.get("type"),
      "count" : p.get("count"),
      "height" : p.get("height"),
      "length" : p.get("length"),
      "width" : p.get("width"),
      "user_email" : user_email,
      "number" : '',
      "name" :  p.get("type")+' '+ p.get("name")+' '+(p.get('length') if p.get('length') else  '-')+'x'+(p.get('width') if p.get('width') else '-')+'x'+(p.get('height') if p.get('height') else '-'),
      "addrs" : p.get("addrs"),
      "price" : p.get("price"),
      "date_change" : datetime.datetime.utcnow(),
      "approx_sq" : p.get("approx_sq"),
      "target" : p.get("name"),
      "_id" : p_id,
      "approx" : p.get("approx"),
      "square" : p.get("sq"),
      "positions" : p.get("positions"),
      "units" : [],
      "is_complect":p.get("is_complect",False)
    }
    # заполняем юниты
    unit = {
      "user_email" : user_email,
      "status" : "ready_to_develop",
      "date_change" : datetime.datetime.utcnow(),
      "number" : 1,
      "statuses" : [
        {
          "user_email" : user_email,
          "status" : "added",
          "date_change" :  datetime.datetime.utcnow()
        },
        {
          "user_email" : user_email,
          "status" : "ready_to_develop",
          "date_change" : datetime.datetime.utcnow()
        }
      ],
      "_id" : None,
      "production_id" : p_id
    }
    unit_count = p.get("count") if p.get('is_complect') else 1
    for i in range(unit_count):
      un = copy.copy(unit)
      un['_id'] = ObjectId()
      un['number'] = i+1
      pr_el['units'].append(un)

    draft['productions'].append(pr_el)
  contract['draft'] = JSONEncoder().encode(draft)
  db.m_contract.update({'_id':contract['_id']}, contract);
  return contract


def create_from_order(order_id, order_data, user_email):
  #print order_data
  contract = {
    'orders':[{'_id':ObjectId(order_id), 'number':order_data.get("number")}],
    #"order_id" : ObjectId(order_id),
    "customer_number" : "",
    "user_email" : user_email,
    "client_id" : ObjectId(order_data.get('client_id')),
    "client_name" : order_data.get("client"),
    "parent_id" : "",
    "date_add" : datetime.datetime.utcnow(),
    "date_change" : datetime.datetime.utcnow(),
    #"order_number" : order_data.get("number"),
    "number" : countersmodel.get_next_sequence("contracts"),
    "montaz_price" : order_data.get("total_montaz"),
    "is_signed" : "no",
    "payments" : [],
    "services" : [],
    "client_signator" : order_data.get("client"),
    "total_address" : order_data.get("total_address"),
    "sign_date" : None,
    "approx" : (order_data.get("approx")=='yes'),
    "factory_id" : "",
    "goods_price" : "",
    "markup" : 0,
    "delivery_price" : order_data.get("total_delivery"),
    "factory" : "",
    "is_tender" : order_data.get("is_tender"),
    "additional_contracts" : [],
    "note" : "",
    "total_shef_montaz" : order_data.get("total_shef_montaz"),
    "deadline" : None,
    "products_count": len(order_data.get("products",[])),
    "productions":[],
    'product_seq' : 0,
    'product_seq_arr' : []
  }
  # добавляем продукцию
  #number = 1
  productions = []
  for p in order_data.get("products",[]):
    #p_id = ObjectId()
    p_id = 'new_'+str(ObjectId())

    pr_el = {
      "type" : p.get("type"),
      "count" : p.get("count"),
      "height" : p.get("height"),
      "length" : p.get("length"),
      "width" : p.get("width"),
      "user_email" : user_email,
      "number" : '',
      "name" :  p.get("type")+' '+ p.get("name")+' '+(p.get('length') if p.get('length') else  '-')+'x'+(p.get('width') if p.get('width') else '-')+'x'+(p.get('height') if p.get('height') else '-'),
      "addrs" : p.get("addrs"),
      "price" : p.get("price"),
      "date_change" : datetime.datetime.utcnow(),
      "approx_sq" : p.get("approx_sq"),
      "target" : p.get("name"),
      "_id" : p_id,
      "approx" : p.get("approx"),
      "square" : p.get("sq"),
      "positions" : p.get("positions"),
      "units" : [],
      "is_complect":p.get("is_complect",False)
    }
    # заполняем юниты
    unit = {
      "user_email" : user_email,
      "status" : "ready_to_develop",
      "date_change" : datetime.datetime.utcnow(),
      "number" : 1,
      "statuses" : [
        {
          "user_email" : user_email,
          "status" : "added",
          "date_change" :  datetime.datetime.utcnow()
        },
        {
          "user_email" : user_email,
          "status" : "ready_to_develop",
          "date_change" : datetime.datetime.utcnow()
        }
      ],
      "_id" : None,
      "production_id" : p_id
    }
    unit_count = p.get("count") if p.get('is_complect') else 1
    for i in range(unit_count):
      un = copy.copy(unit)
      un['_id'] = ObjectId()
      un['number'] = i+1
      pr_el['units'].append(un)

    #contract['productions'].append(pr_el)
    productions.append(pr_el)
    # глобальный счетчик продукции со статусами занятости ноеров
    #contract['product_seq_arr'].append({'i': number,  'status': True, 'date': datetime.datetime.utcnow()})
    # инкремент счетчика продукции
    #number = number+1

  # глобальный счетчик продукции, без статусов
  contract['product_seq'] = len(contract['product_seq_arr'])
  # получаем всю стоимость договора по типам
  res = {'cost':0, 'montaz':0, 'service':0}
  res['montaz'] = float(contract.get("montaz_price",0) or 0)
  res['cost'] = float(contract.get("goods_price",0) or 0)+float(contract.get("delivery_price",0) or 0)
  for p in contract['productions']:
    cnt = int(p.get('count',0) or 0)
    res['cost'] = res['cost']+cnt*int(p.get('price',0) or 0)
    for ps in p['positions']:
      res['montaz'] = res['montaz'] + int(ps.get('mont_price',0) or 0)*int(ps.get('num',0) or 0)
      res['cost'] = res['cost'] + int(ps.get("delivery") or 0)
  puse_list = paymentmodel.get_use_list()
  puses = []
  for pu in puse_list:
    if pu['code']==1 and res['cost']>0:
      puses.append({'price':res['cost'], 'payment_use': pu})
    elif pu['code']==2 and res['montaz']>0:
      puses.append({'price':res['montaz'], 'payment_use': pu})
  contract['payment_uses'] = puses
  contract['history'] = [{ "user" : user_email,"type" : "create","date" : datetime.datetime.utcnow() }]
  # добавление контракта в БД
  draft = copy.deepcopy(contract)
  draft['is_draft'] = True
  draft['productions'] = productions
  contract['draft'] = JSONEncoder().encode(draft)
  add(contract)
  return contract

def get_production_summ_square_by_all_contracts():
  '''
    Получение сумм площадей продукции по всем договорам
  '''
  result = {}
  try:
    dataResult = db.m_contract.aggregate([
      {"$project":
        {
          "number":1,
          "productions":1,
        }
      },
      #{"$match":{"number":{"$in":[922]}}},
      {"$unwind": "$productions"},
      {"$project":
        {
          "contract_id":"$_id",
          "contract_number":"$number",
          "product_count": "$productions.count",
          "product_square": "$productions.square"
        }
      },
      {"$group":
        {
          "_id":{"contract_id":"$contract_id", "contract_number":"$contract_number"},
          "full_products_square":{"$sum":{"$multiply":[ "$product_square", "$product_count"]}},
        }
      },
      {"$project":
        {
          "_id":0,
          "contract_id":"$_id.contract_id",
          "contract_number":"$_id.contract_number",
          "full_products_square":1
        }
      },
      {"$sort" : { "contract_number" : 1 } }
    ])

    try:
      for item in dataResult:
        result[item['contract_id']] = item
    except:
      pass;

    return result
  except pymongo.errors.PyMongoError as e:
    raise Exception("Can't get brief statistic: %s" %(str(e)))


def get_clients_for_podpisant(podpisant_id):
  '''
    получить список клиентов, у которых указанный клиент является подписантом
  '''
  return  db.m_contract.distinct('client_id',{'client_signator_id': ObjectId(podpisant_id), 'client_id':{'$ne':None}})

def get_next_sequence_product(_id, confirmed=False):
  '''
    Получение значение счетчика для продукции в договоре.
    При получении нового значения, происходит инкремент счетчика
    Получение счетчика происходит с неподтвержденным статусом, статус необходимо подтвердить руками
    _id - ID договора
    Счетчик ведется сквозной, т/е для доп соглашений значение счетчика необходимо брать из основного договора
  '''
  try:
    # получение информации об объекте
    data = db.m_contract.find_one({ '_id': _id }, {'product_seq':1, 'product_seq_arr':1})
    # если счетчик еще не начался, то создаем его
    if not data.get('product_seq'):
      db.m_contract.update(
        {'_id': _id},
        {'$set': {'product_seq': 1, 'product_seq_arr': [{'i':1, 'status':confirmed, 'date': datetime.datetime.utcnow()}]}}
      )
      return 1
    else:
      # поиск с отрицательным статусом номера в списке выданных номеров
      # если такой есть и его дата в прошлом более чем на 1 час, то используем его, елси нет, то создаем новый
      tmp_index = None
      try:
        tmp_index =  (item for item in data['product_seq_arr'] if not item['status'] and  (not item.get('date') or  routine.floor(((datetime.datetime.utcnow() - item.get('date')).seconds) / 60)>60 )).next()
        db.m_contract.update(
          {'_id': _id, 'product_seq_arr.i': tmp_index},
          {'$set': {'product_seq_arr.$.date': datetime.datetime.utcnow()}}
        )
        return tmp_index.i
      except:
        pass
      # если не нашли свабодный индекс
      if not tmp_index:
        db.m_contract.update({'_id': _id},{'$set': {'product_seq': data['product_seq']+1}})
        db.m_contract.update({'_id': _id},{'$push':{ 'product_seq_arr': {'i':data['product_seq']+1, 'status':confirmed, 'date': datetime.datetime.utcnow()}}})
      return data['product_seq']+1

  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))

def confirm_sequence_product(_id, i):
  '''
    Подтверждение счетчика
    i - номер
  '''
  try:
    db.m_contract.update(
      {'_id': _id, 'product_seq_arr.i': i},
      {'$set': {'product_seq_arr.$.status':True }}
    )
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))

def remove_sequence_product(_id, i):
  '''
    Освабождение счетчика
    i - номер
  '''
  try:
    db.m_contract.update(
      {'_id': _id, 'product_seq_arr.i': i},
      {'$set': {'product_seq_arr.$.status':False, 'product_seq_arr.$.date':None }}
    )
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))

def get_all_products_include_additional(number):
  '''
  Получение информации о продукции в договоре, включая все его доп. соглашения
  number - номер договора
  '''
  try:
    result = {}
    # получение информации о договоре
    contract_info = get_by({'$or': [{ 'parent_id': {'$exists': False }},{ 'parent_id':None},{'parent_id':''}],'number': number})
    if not contract_info:
      return None
    # доп. соглашения
    contract_info['additional_contracts'] = []
    for c in get_list_by({'parent_id':contract_info['_id']}):
      contract_info['additional_contracts'].append(c)
    for row in contract_info.get('productions',[]):
      result[str(row['_id'])] = row
    for c in contract_info.get('additional_contracts',[]):
      for row in c['productions']:
        result[str(row['_id'])] = row
    return result
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))

def get_by_number(number):
  '''
  Получение информации о договоре
  number - номер договора
  '''
  try:
    return get_by({'$or': [{ 'parent_id': {'$exists': False }},{ 'parent_id':None},{'parent_id':''}],'number': number})
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))



# получение финансовой информации по всем открытым договорам
def get_opened_finance_info():
  for r in db.m_contract.aggregate([
    {"$match": {'factory_id':ObjectId("5305d15472ab560009030c0e"), 'is_signed':'yes', 'is_canceled':{'$ne':True}, '$or': [{ 'status': { '$ne': 'completed' } },  { 'status_date': { '$gt': datetime.datetime.now() - datetime.timedelta(days=30) } }]}},
    {"$project": {'tid': '$_id','tcost':"$total.cost", "tplan":"$total.plan", "tfact":"$total.fact", "tdebt": "$debt", "fnum":{ '$cond':[ {'$eq': [{'$substr':['$parent_number',0,-1]},'']}, '$number', {"$concat":[ { '$substr':['$parent_number',0,-1] },"/",{ '$substr':['$number',0,-1] }] } ] } }},
    {
      '$group': {
            '_id': None,
            'cost': {
                  '$sum': "$tcost"
              },
          'plan': {
                  '$sum': "$tplan"
              },
            'fact':{
              '$sum': "$tfact"
            },
            'debt':{
              '$sum': "$tdebt"
            },
            'numbers':{
              '$addToSet': "$fnum"
            },
            'ids':{
              '$addToSet': "$tid"
            }
          }
    }
  ]):
    return r
  return None

# получение списка заказов (#договора.#продукции)
def get_all_opened_orders():
  res = []
  for r in db.m_contract.aggregate([
    {'$unwind':'$productions'},
    {"$match": {'is_signed':'yes', 'productions.number': {'$ne':0},  '$or': [{ 'status': { '$ne': 'completed' } },  { 'status_date': { '$gt': datetime.datetime.now() - datetime.timedelta(days=30) } }]}},
    {"$project": {"fnum": { '$concat':[{'$cond':[ {'$eq': [{'$substr':['$parent_number',0,-1]},'']}, {'$substr':['$number',0,-1]}, {'$substr':['$parent_number',0,-1]} ] },'.',{'$substr':['$productions.number',0,-1]}]} }},
    {
      "$group": {"_id" : "$fnum" }
    },
    {"$sort" : {"number" : 1, 'productions.number':1 } }
  ]):
    res.append(r['_id'])

  res.sort(cmp=lambda x1, x2: cmp((int)(x1.split('.')[0]),(int)(x2.split('.')[0])) or cmp((int)(x1.split('.')[1]),(int)(x2.split('.')[1]))  )

  return res

def get_google_group_info(number):
  '''
    Получение информации о гугл группе договора
  '''
  try:
    number = routine.strToInt(number)
    row = get_by(
      {
        '$or': [{ 'parent_id': {'$exists': False }},{ 'parent_id':None},{'parent_id':''}],
        'number': number
      },
      { 'google_group': 1 }
    )
    return row['google_group'] if row.get('google_group') and row['google_group'].get('key') else None

  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))

