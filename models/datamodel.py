#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import error, abort
import config
from config import db
import json
import pymongo
import datetime, time
import re
from bson.objectid import ObjectId
import bson
import routine
from models import configuration_cache_data_model, template_cache_data_model, countersmodel
from copy import deepcopy,copy
from traceback import print_exc
import cPickle

from classes.readonlydict import ReadOnlyDict

# подготовка структуры для хранения КЭШа данных
data_cache = {
  'esud':None,  # КЭШ для ЭСУД
  'specification':None, # КЭШ  для спецификаций
  'production':None # КЭШ  для спецификаций
}

# Доступные типы данных------------
# model - модель изделия
# product - изделие
# library - библиотека
# property - свойство
# value - значение свойтсва
# condition - условие
# process - тех. процесс
#----------------------------------------------------

#Идентификаторы системных объектов
SYSTEM_OBJECTS = {
  'SYS_PROP':ObjectId("54098fd80db6a70002752572"),  # Системное свойство
  'SYS_LYB':ObjectId("53fc32d9c11a0e00023eb124"), # Системная библиотека
  'BUY_PROP':ObjectId("53f73bf6517a160002668fd9"),  # Покупное свойство
  'VOL_PROP':ObjectId("541c05703767da00028f35de"),  # Свойство - объем
  'SEP_PROP':ObjectId("544b6b43cc98e10002a7789f"),  # Свойство -резделительная операция
  'IN_PROP':ObjectId("5450f251eb09210003794be1"),   # Системное  свойство входного объекта
  'INHERIT_PROP': ObjectId("5409b34f0db6a700027525a3"), # Системное  свойство  - наследовать
  'TECHNO_GROUP_PROP': ObjectId("546c57033739b9000270f1a2"),# Обобщающая группа - (технологические аналоги)
  'BUY_GROUP_PROP': ObjectId("55b62832b9aeb000031b9ddd"),# Обобщающая группа - (покупные аналоги)
  'VOL_TOLERANCE_PROP': ObjectId("54bce459820baa00031e1a12"),# Объем допуска (невозвратные потери и отходы)
  'TOLERANCE_ON_VOL_PROP': ObjectId('5596685bf2565e0003b8ba83'), # Допуск на объем
  'VOL_PER_UNIT_PROP': ObjectId("54bce44f820baa00031e1a11"),# Объем на 1 штуку
  'AMOUNT_PROP': ObjectId("53d60a88233e5e0002ab576a"),# Количество
  'PIECE_VAL': ObjectId("53f324fdb7ddea00028410e9"),# единица измерения = шт.
  'SHIFR1_PROP': ObjectId("54c11681a1390700031adc0b"),# шифр1
  'SHIFR2_PROP': ObjectId("54c1168ba1390700031adc0c"),# шифр2
  'SECTOR_PROP': ObjectId("54d0a16d7bad640003abbbe5"), # участок
  'OPTION_PROP': ObjectId("546c56f03739b9000270f1a1"), # опция
  'OPEN_VAL': ObjectId("53fc6bccc11a0e00023eb18f"), # открытое значение
  'DEFAULT_VAL': ObjectId("559d105d9fcb100003e839c2"), # значение по умолчанию
  'CALCULATED_VAL': ObjectId("53fc3389c11a0e00023eb126"), # вычисляемое значение
  'TECHNO_PROP': ObjectId("55264c90969413000370328a"), # технологическое свойство
  'PERCENT_UNIT': ObjectId("55965e5ff2565e0003b8ba80"), # единица измерения - проценты
  'ANY_VAL': ObjectId("559fbcfc3cbc550003b65b57"), # любое значение
  'HEIGHT_PROP': ObjectId("53d603a1233e5e0002ab573c"), # высота
  'LENGTH_PROP': ObjectId("53d60390233e5e0002ab573b"), # длина
  'WIDTH_PROP': ObjectId("53d603ad233e5e0002ab573d"), # ширина
  'THICKNESS_PROP': ObjectId("53d6037b233e5e0002ab573a"), # толщина
  'NORM_TIME': ObjectId("55d301ade149050003b43c21"), # норма времени
  'NORM_PRICE': ObjectId("5628d2e812016e0003efcf2e"), # нормативная цена
  'COMPLECT_PROP': ObjectId("5410685958ffa80002c28c8c"), # признак комплекта
  'OTBOR_PROP': ObjectId("56a08fdfc2c00300036ef39f"), # признак отбора
  'KOMPLEKS_UNIT': ObjectId("56a5dfed63ccd820a4497c85"), # свойство комплексной ед. изм.
  'SECTOR_BY_PARENT_VAL': ObjectId("57e0efa2a4a2730003129892"), # участок брать по родительскому изделию

  'TECH_PROCESS_LYB': ObjectId("56a8cdea156d4f000352ab4d"), # системная библиотека тех-процесс
  #'EXECUTION_ORDER_PROP': ObjectId("56a8ce70156d4f000352ab58"), # порядок выполнения
  'EXECUTION_TIME_PROP': ObjectId("56a8cea9156d4f000352ab5a"), # время выполнения
  #'OPERATION_TYPE_PROP': ObjectId("56a8ceb5156d4f000352ab5b"), # тип операции
  'EXECUTION_COUNT_PROP': ObjectId("56b20a43d55f3e0003c59248"), # количество применений
  'TECH_PROCESS_TEMPLATE': ObjectId("56b1c9ef677b3d0003041feb"), # шаблон тех. процесса
  'WEIGHT_ON_VOLUME': ObjectId("577b2fd4b516b200036125c3"), # вес на единицу объема
  # тех. процесс
  'MIN_UNIT': ObjectId("53f3284ab7ddea000284110e"), # единицы измерения - минуты
  'SEC_UNIT': ObjectId("56c1a01b127cd300034a180a"), # единицы измерения - секунды
  'NEXT_LEVEL_TIME': ObjectId("56f955c47649cf0003e00661"), # время перехода на следующий этап
  'IN_LEVEL_TIME': ObjectId("56f955837649cf0003e00660"), # время перехода внутри этапа
  #----
  'INT_BASE_DIR_LYB': ObjectId("5af5916db5ac0400089e6314"), # базовый системный справочник INT
  'MATERIALS_DIR_LYB': ObjectId("5af59181b5ac0400089e6315"), # справочник материалов
  'PROVISION_DIR_LYB': ObjectId("5b126298565f220008410d1d"), # справочник обеспечение
  'PEOPLE_DIR_LYB': ObjectId("5b126235565f220008410d16"), # справочник трудозатраты
  'OVERHEADS_DIR_LYB': ObjectId("5b47bf86357ea50009a26b6c"), # справочник накладные расходы
  'CONTRACTORS_DIR_LYB': ObjectId("5b47bf6f357ea50009a26b6b"), # справочник подрядчики
  'TRANSPORT_DIR_LYB': ObjectId("5b47bf4a357ea50009a26b6a"), # справочник транспорт
  'SEMIPRODUCTS_DIR_LYB': ObjectId("5b51acdf8e89da00089beac4"), # справочник полуфабрикатов
}

INT_DIR_LIBS = [
  SYSTEM_OBJECTS['MATERIALS_DIR_LYB'],
  SYSTEM_OBJECTS['PROVISION_DIR_LYB'],
  SYSTEM_OBJECTS['PEOPLE_DIR_LYB'],
  SYSTEM_OBJECTS['OVERHEADS_DIR_LYB'],
  SYSTEM_OBJECTS['CONTRACTORS_DIR_LYB'],
  SYSTEM_OBJECTS['TRANSPORT_DIR_LYB'],
  SYSTEM_OBJECTS['SEMIPRODUCTS_DIR_LYB'],
]

SYSTEM_OBJECTS_IDS = [
  ObjectId("54098fd80db6a70002752572"),
  ObjectId("53fc32d9c11a0e00023eb124"),
  ObjectId("53f73bf6517a160002668fd9"),
  ObjectId("541c05703767da00028f35de"),
  ObjectId("544b6b43cc98e10002a7789f"),
  ObjectId("5450f251eb09210003794be1"),
  ObjectId("5409b34f0db6a700027525a3"),
  ObjectId("546c57033739b9000270f1a2"),
  ObjectId("54bce459820baa00031e1a12"),
  ObjectId("54bce44f820baa00031e1a11"),
  ObjectId("53f324fdb7ddea00028410e9"),
  ObjectId("54c11681a1390700031adc0b"),
  ObjectId("54c1168ba1390700031adc0c"),
  ObjectId("54d0a16d7bad640003abbbe5"),
  ObjectId("546c56f03739b9000270f1a1"),
  ObjectId("53fc6bccc11a0e00023eb18f"),
  ObjectId("55264c90969413000370328a"),
  ObjectId("53fc3389c11a0e00023eb126"),
  ObjectId("53d60a88233e5e0002ab576a"),
  ObjectId('5596685bf2565e0003b8ba83'),
  ObjectId("55965e5ff2565e0003b8ba80"),
  ObjectId("559d105d9fcb100003e839c2"),
  ObjectId("559fbcfc3cbc550003b65b57"),
  ObjectId("53d60390233e5e0002ab573b"),
  ObjectId("53d603a1233e5e0002ab573c"),
  ObjectId("53d603ad233e5e0002ab573d"),
  ObjectId("53d6037b233e5e0002ab573a"),
  ObjectId("55b62832b9aeb000031b9ddd"),
  ObjectId("55d301ade149050003b43c21"),
  ObjectId("5628d2e812016e0003efcf2e"),
  ObjectId("5410685958ffa80002c28c8c"),
  ObjectId("56a08fdfc2c00300036ef39f"),
  ObjectId("56a5dfed63ccd820a4497c85"),
  ObjectId("56a8cdea156d4f000352ab4d"),
  ObjectId("56a8cea9156d4f000352ab5a"),
  ObjectId("56b1c9ef677b3d0003041feb"),
  ObjectId('56b20a43d55f3e0003c59248'),
  ObjectId("53f3284ab7ddea000284110e"),
  ObjectId("56c1a01b127cd300034a180a"),
  ObjectId("56f955c47649cf0003e00661"),
  ObjectId("56f955837649cf0003e00660"),
  ObjectId("577b2fd4b516b200036125c3"),
  ObjectId("57e0efa2a4a2730003129892"),
  ObjectId("5af5916db5ac0400089e6314"), # базовый системный справочник INT
  ObjectId("5af59181b5ac0400089e6315"), # справочник материалов
  ObjectId("5b126298565f220008410d1d"), # справочник обеспечение
  ObjectId("5b126235565f220008410d16"), # справочник трудозатраты
  ObjectId("5b47bf86357ea50009a26b6c"), # справочник накладные расходы
  ObjectId("5b47bf6f357ea50009a26b6b"), # справочник подрядчики
  ObjectId("5b47bf4a357ea50009a26b6a"), # справочник транспорт
  ObjectId("5b51acdf8e89da00089beac4"), # справочник полуфабрикатов
  ObjectId("5b126298565f220008410d1d"), # обеспечение
]

# Среди системных объектов есть свойства-  спецификации, выделяем их в отдельный список
SYSTEM_SPECIFICATION_OBJECTS_IDS = [ObjectId("53d603a1233e5e0002ab573c"),ObjectId("53d603ad233e5e0002ab573d"), ObjectId("53d60390233e5e0002ab573b"), ObjectId("53d6037b233e5e0002ab573a"), ObjectId("54bce44f820baa00031e1a11"), ObjectId('5596685bf2565e0003b8ba83'), ObjectId("54bce459820baa00031e1a12"), ObjectId("55d301ade149050003b43c21"), ObjectId("5628d2e812016e0003efcf2e"), ObjectId("577b2fd4b516b200036125c3"), ObjectId("5b126298565f220008410d1d")]

# Системные ключи, котоыре необходимо удалять из объекта перед сохранением в БД
SYSTEM_KEYS = ['is_system', 'is_objective_system','is_buy','is_vol','is_separate','is_input','is_inherit','is_techno_group','open_value', 'is_optional', 'is_techno', 'is_default', 'is_require_dimension', 'is_modified','is_buy_group', 'is_complect', 'is_otbor', 'is_pseudo_child']

def clear_cache():
  '''
    Очистка КЭШа данных
  '''
  for key in data_cache:
    data_cache[key] = None

def get_all():
  '''
    Получить все данные по фильтру
  '''
  try:
    data = []
    for d in db.data.find({'status':{'$ne':'del'}}):
      data.append(d)
    return data
  except pymongo.errors.PyMongoError:
    abort(400, "server_error")

def add(data):
  '''
    Добавыить новый объект
  '''
  try:
    if isinstance(data, list):
      for row in data:
        for key in SYSTEM_KEYS:
          if key in row:
            del row[key]
    else:
      for key in SYSTEM_KEYS:
        if key in data:
          del data[key]
    db.data.insert(data)
    # if 'datalink' in data and data['datalink']:
    #   db.data.update({'_id':data['datalink']},{"$push": { "linked":  data['_id']}}, True)

    #  сброс КЭША из памяти
    clear_cache()
    configuration_cache_data_model.clear()
    template_cache_data_model.clear()
  except pymongo.errors.OperationFailure:
    abort(400, "Operation failure")
  except pymongo.errors.PyMongoError:
    abort(400, "server_error")
  return data

def free_sequence_object(row):
  '''
    Освабождение счетчика для объекта
    Работает только для моделей и продукции
  '''
  # сбросить счетчик для продукции и модели
  if(not row.get('datalink') and row.get('number')):
    if row.get('type') == 'product':
      #
      # получить,  модель, на базе которой создано изделие
      childs = get_list_by({'parent_id': row['_id']})
      for child in childs:
        if child.get('type') == 'product_model':
          id_to_remove = child.get('datalink') if child.get('datalink') else child['_id']
          remove_sequence_product(id_to_remove, routine.strToInt(row['number'].split('.')[1] ))
          break

    elif row.get('type') == "product_model":
      # Для моделей счетчик хранится в глобальных счетчиках
      # определить покупная модель или нет
      is_buy_model = False
      childs = get_list_by({'parent_id': row['_id']})
      for child in childs:
        if child['parent_id'] == row['_id'] and child.get('datalink') == SYSTEM_OBJECTS['BUY_PROP']:
          is_buy_model = True
          break
      id = 'data_models_buy' if is_buy_model else 'data_models_own'
      countersmodel.remove_confirmed_sequence(id, routine.strToInt(row['number']))

def remove(id):
  try:
    row = get_by_id(id)
    # получить информацию об объекте
    db.data.update({'_id':ObjectId(id)},{'$set':{'status':'del'}})
    db.data.update({'datalink':ObjectId(id)},{'$set':{'status':'del'}},multi=True)
    # освабождение счетчика
    free_sequence_object(row)
    #  сброс КЭША из памяти
    clear_cache()
    configuration_cache_data_model.clear()
    template_cache_data_model.clear()
  except pymongo.errors.OperationFailure:
    abort(400, "Operation failure")
  except pymongo.errors.PyMongoError:
    abort(400, "server_error")
  return True

def remove_multi(filter):
  try:
    db.data.update(filter,{'$set':{'status':'del'}},multi=True)
    # освабождение счетчиков
    removed_items = get_list_by(filter)
    for row in removed_items:
      free_sequence_object(row)

    #  сброс КЭША из памяти
    clear_cache()
    configuration_cache_data_model.clear()
    template_cache_data_model.clear()
  except pymongo.errors.OperationFailure:
    abort(400, "Operation failure")
  except pymongo.errors.PyMongoError:
    abort(400, "server_error")
  return True

def update(id, data):
  try:
    for key in SYSTEM_KEYS:
        if key in data:
          del data[key]

    db.data.update({'_id':ObjectId(id)},{'$set':data})
    #  сброс КЭША из памяти
    clear_cache()
    configuration_cache_data_model.clear()
    template_cache_data_model.clear()
  except pymongo.errors.OperationFailure:
    abort(400, "Operation failure")
  except pymongo.errors.PyMongoError:
    abort(400, "server_error")
  return data

def update_by(cond, data, insert_if_notfound=True, multi_update=False):
  try:
    for key in SYSTEM_KEYS:
      if key in data:
        del data[key]
    db.data.update(cond, data, upsert=insert_if_notfound,multi=multi_update)
    #  сброс КЭША из памяти
    clear_cache()
    configuration_cache_data_model.clear()
    template_cache_data_model.clear()
  except pymongo.errors.OperationFailure as e:
    raise Exception(str(e))
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))

def update_multy(filter,data):
  try:
    for key in SYSTEM_KEYS:
      if key in data:
        del data[key]

    db.data.update(filter,{'$set':data},multi=True)
    #  сброс КЭША из памяти
    clear_cache()
    configuration_cache_data_model.clear()
    template_cache_data_model.clear()
  except pymongo.errors.OperationFailure:
    abort(400, "Operation failure")
  except pymongo.errors.PyMongoError:
    abort(400, "server_error")
  return data

def get(args, fields):
  ''' get data by filter '''
  data=[]
  try:
    for d in db.data.find(args, fields).sort([('parent_id',1),('routine', 1),('name', 1)]):
      data.append(d)
    return data
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))

def test_get():
  res = []
  for i in  db.data.find(None,  {'history':0}).sort([('parent_id',1),('routine', 1),('name', 1)]):
    res.append(i)
  return res

def get_cached_data(key='esud'):
  '''
    Получить структурированные данные с предварительной проверкой КЭШ
    key - для кого требуются данные ['esud', 'specification', 'production']
  '''
  start = time.clock()
  if not data_cache[key]:
    #data_cache[key] = ReadOnlyDict(get_structured())
    data_cache[key] = get_structured()
  print "Get full datamodel time  is: ", time.clock() - start
  return data_cache[key]

def get_structured(args=None, fields=None, pack_ids=False, new_ids_map={}):
  '''
    Получение данных.
    В результате фоормируется объект, содержащий информацию об элементах,
    информацию о потомках первого уровня каждого элемента, информацию о ярлыках на элемент.
    result = {
      data:{id:Object_id, info:{}},
      childs:{id:[Object_id, Object_id]},
      links: {id:[Object_id, Object_id]},
      used_in:{'id':[]}
    }

    pack_ids - флаг, которые определят, нужно ли упаковывать id-шники (делать их короткими), создано для экономии памяти
    new_ids_map - структура, которая хранит соответсвяи новым id-шникам к старым
  '''
  result = None
  start = time.clock()

  # if args:
  #   args['status'] = {'$ne':'del'}
  # else:
  #   args = {'status': {'$ne':'del'}}

  # если поля не заданы, то указываем поля по умолчанию
  if not fields:
    fields = {'history':0}

  data = {}
  childs = {}
  links = {}
  used_in = {}
  try:
    start = time.clock()
    ds = db.data.find(args, fields).sort([('parent_id',1),('routine', 1),('name', 1)])
    if pack_ids:
      id_maps_to = {}
      id_maps_from = {}
      all_symbols = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
      id_index = {'next':0}
      rep_proprs = ['path','parent_id','datalink','cofiguration_path','linkpath','property_origin_id','property_id','id','copy_from_id','elem_id']

      def get_next_id():
        id_index['next'] = id_index['next']+1
        ni = id_index['next']
        res = []
        while ni>0:
          res.append(ni%len(all_symbols))
          ni = int(math.floor(ni/len(all_symbols)))
        ind = ""
        for r in res:
          ind = str(all_symbols[r])+ind
        return ind

      def rep_ids(list):
        res = []
        for d in list:
          nid = get_next_id()
          id_maps_to[str(d['_id'])] = nid
          id_maps_from[nid] = str(d['_id'])
          d['_id'] = nid
          res.append(d)
        return res

      def rm_ids(obj):
        if not isinstance(obj,dict) and not isinstance(obj,list):
          return
        if 'product_configs' in obj:
          nr = []
          for o in obj['product_configs']:
            nr.append(id_maps_to.get(str(o),get_next_id()))
          obj['product_configs'] = nr

        for pr in rep_proprs:
          if pr in obj:
            if obj[pr]:
              nelem = str(obj[pr])
              arr = nelem.split('-')
              narr = []
              for a in arr:
                narr.append(id_maps_to.get(a,get_next_id()))
              obj[pr] = '-'.join(narr)
        if isinstance(obj,dict):
          for o in obj:
            rm_ids(obj[o])

        if isinstance(obj,list):
          for o in obj:
            rm_ids(o)


      ds = rep_ids(ds)

      for d in ds:
        rm_ids(d)
      new_ids_map['to'] = id_maps_to
      new_ids_map['from'] = id_maps_from

    for d in ds:
      data[d['_id']] = d
      # childs
      if d['parent_id'] not in childs:
        childs[d['parent_id']] = []
      childs[d['parent_id']].append(d['_id'])
      #links
      if d.get('datalink'):
        if d['datalink'] not in links:
          links[d['datalink']] = []
        links[d['datalink']].append(d['_id'])
      else:
        # used_in
        if 'properties' in d and len(d['properties'])>0:
          for p in d['properties']:
            if p.get('type') == 'config' and p.get('product_configs') and len(p['product_configs'])>0:
              for product_config in p['product_configs']:
                if not product_config in used_in:
                  used_in[product_config] = []
                if not d['_id'] in used_in[product_config]:
                  used_in[product_config].append(d['_id'])

    result={'data':data, 'childs':childs, 'links': links, 'used_in': used_in}
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))
  print "Datamodel - time get and struct data is: ", time.clock() - start
  return  result

def get_by_id(id):
  try:
    return db.data.find_one({'_id':ObjectId(id)})
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))

def get_by(args=None, fields = None):
  '''
    Получение информации о требуемом объете по заданным параметрам
  '''
  try:
    return db.data.find_one(args, fields)
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))

def get_list_by(args=None, fields = None):
  '''
    Получение списка объектов по заданным параметрам
  '''
  data=[]
  try:
    for d in db.data.find(args, fields).sort([('number', 1)]):
      data.append(d)
    return data
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))

def change_path(old_path, new_path):
  try:
    regx = re.compile(old_path, re.IGNORECASE)
    for u in db.data.find({'path':regx}):
      u['path'] = u['path'].replace(old_path,new_path)
      db.data.save(u)
    #  сброс КЭША из памяти
    clear_cache()
    configuration_cache_data_model.clear()
    template_cache_data_model.clear()
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))

def model_get_next_sequence_product(_id):
  '''
    Получение значение счетчика для изделия модели.
    При получении нового значения, происходит инкремент счетчика
  '''
  try:
    tmp_index = None
    # получение информации об объекте
    data = db.data.find_one({ "_id": _id })
    # если счетчик еще не начался, то создаем его
    if not data.get("product_seq"):
      data["product_seq"] = 1
      tmp_index = {'i':1, 'status':False, 'date': datetime.datetime.utcnow()}
      data["product_seq_arr"] = [tmp_index]
      db.data.update(
        {'_id': _id},
        {'$set': {'product_seq': data["product_seq"], 'product_seq_arr': data["product_seq_arr"] }}
      )
    else:
      # поиск с отрицательным статусом номера в списке выданных номеров
      # если такой есть и его дата в прошлом более чем на 1 час, то используем его, елси нет, то создаем новый
      try:
        tmp_index =  (item for item in data['product_seq_arr'] if not item['status'] and (not item.get('date') or  routine.floor(((datetime.datetime.utcnow() - item.get('date')).seconds) / 60)>60 )).next()
        db.data.update(
          {'_id': _id, 'product_seq_arr.i': tmp_index},
          {'$set': {'product_seq_arr.$.date': datetime.datetime.utcnow()}}
        )
      except Exception:
        print_exc()
        pass

      # если нашли свабодный индекс
      if not tmp_index:
        data["product_seq"] = data["product_seq"]+1
        tmp_index = {'i':data["product_seq"], 'status':False, 'date': datetime.datetime.utcnow()}
        data["product_seq_arr"].append(tmp_index)
        db.data.update({'_id': _id},{'$set': {'product_seq': data["product_seq"] }})
        db.data.update({'_id': _id},{"$push":{ 'product_seq_arr': tmp_index}})

    #  сброс КЭША из памяти
    clear_cache()
    configuration_cache_data_model.clear()
    template_cache_data_model.clear()
    return tmp_index['i']

  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))

def remove_sequence_product(_id, i):
  '''
    Освабождение счетчика
    i - номер счетчика
    id - id объекта в котором ведется счетчик
  '''
  try:
    db.data.update(
      {'_id': _id, 'product_seq_arr.i': i},
      {'$set': {'product_seq_arr.$.status':False, 'product_seq_arr.$.date':None }}
    )
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))

def product_get_next_sequence_specification(_id):
  '''
    Получение значения счетчика для изделия модели.
    При получении нового значения, происходит инкремент счетчика
  '''
  try:
    # res = db.data.find_and_modify(
    #   query = { "_id": _id },
    #   update = { "$inc": { "specification_seq": 1 } },
    #   new = True
    # )
    # return res["specification_seq"]

    tmp_index = None
    # получение информации об объекте
    data = db.data.find_one({ "_id": _id })
    # если счетчик еще не начался, то создаем его
    if not data.get("specification_seq"):
      data["specification_seq"] = 1
      tmp_index = {'i':1, 'status':False, 'date': datetime.datetime.utcnow()}
      data["specification_seq_arr"] = [tmp_index]
      db.data.update(
        {'_id': _id},
        {'$set': {'specification_seq': data["specification_seq"], 'specification_seq_arr': data["specification_seq_arr"] }}
      )
    else:
      # поиск с отрицательным статусом номера в списке выданных номеров
      # если такой есть и его дата в прошлом более чем на 1 час, то используем его, елси нет, то создаем новый
      try:
        tmp_index =  (item for item in data['specification_seq_arr'] if not item["status"] and  (not item.get('date') or  routine.floor(((datetime.datetime.utcnow() - item.get('date')).seconds) / 60)>60 )  ).next()
        db.data.update(
          {'_id': _id, 'specification_seq_arr.i': tmp_index},
          {'$set': {'specification_seq_arr.$.date': datetime.datetime.utcnow()}}
        )
      except:
        pass
      # если нашли свабодный индекс
      if not tmp_index:
        data["specification_seq"] = data["specification_seq"]+1
        tmp_index = {'i':data["specification_seq"], 'status':False, 'date': datetime.datetime.utcnow()}
        data["specification_seq_arr"].append(tmp_index)
        # db.data.update(
        #   {'_id': _id},
        #   {'$set': {'specification_seq': data["specification_seq"], 'specification_seq_arr': data["specification_seq_arr"] }}
        # )
        db.data.update({'_id': _id},{'$set': {'specification_seq': data["specification_seq"] }})
        db.data.update({'_id': _id},{"$push":{ 'specification_seq_arr': tmp_index}})
    #  сброс КЭША из памяти
    clear_cache()
    configuration_cache_data_model.clear()
    template_cache_data_model.clear()
    return tmp_index['i']

  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))

def get_next_sequence_complect(_id):
  '''
    Получение значения счетчика для комлпекта изделия.
    При получении нового значения, происходит инкремент счетчика
  '''
  try:
    tmp_index = None
    # получение информации об объекте
    data = db.data.find_one({ "_id": _id })
    # если счетчик еще не начался, то создаем его
    if not data.get("complect_seq"):
      data["complect_seq"] = 1
      tmp_index = {'i':1, 'status':False, 'date': datetime.datetime.utcnow()}
      data["complect_seq_arr"] = [tmp_index]
      db.data.update(
        {'_id': _id},
        {'$set': {'complect_seq': data["complect_seq"], 'complect_seq_arr': data["complect_seq_arr"] }}
      )
    else:
      # поиск с отрицательным статусом номера в списке выданных номеров
      # если такой есть и его дата в прошлом более чем на 1 час, то используем его, елси нет, то создаем новый
      try:
        tmp_index =  (item for item in data['complect_seq_arr'] if not item["status"] and  (not item.get('date') or  routine.floor(((datetime.datetime.utcnow() - item.get('date')).seconds) / 60)>60 )  ).next()
        db.data.update(
          {'_id': _id, 'complect_seq_arr.i': tmp_index},
          {'$set': {'complect_seq_arr.$.date': datetime.datetime.utcnow()}}
        )
      except:
        pass
      # если нашли свабодный индекс
      if not tmp_index:
        data["complect_seq"] = data["complect_seq"]+1
        tmp_index = {'i':data["complect_seq"], 'status':False, 'date': datetime.datetime.utcnow()}
        data["complect_seq_arr"].append(tmp_index)
        # db.data.update(
        #   {'_id': _id},
        #   {'$set': {'complect_seq': data["complect_seq"], 'complect_seq_arr': data["complect_seq_arr"] }}
        # )
        db.data.update({'_id': _id},{'$set': {'complect_seq': data["complect_seq"] }})
        db.data.update({'_id': _id},{"$push":{ 'complect_seq_arr': tmp_index}})
    #  сброс КЭША из памяти
    clear_cache()
    configuration_cache_data_model.clear()
    template_cache_data_model.clear()
    return tmp_index['i']

  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))

def get_all_active_models_short_info():
  '''
  Получение списка всех активных моделей
  '''
  try:
    data = []
    for d in db.data.find(
        {'type':'product_model','datalink': None, 'status':{'$ne':'del'}},
          {'name':1, 'number':1}).sort([('number',1),('name', 1)]
        ):
      data.append(d)
    return data
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))

