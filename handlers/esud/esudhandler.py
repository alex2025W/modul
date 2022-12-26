#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route, get, post, put, request, error, abort, response, debug, delete
import datetime, time, routine, config
from bson.objectid import ObjectId
import json
from libraries import userlib
from models import datamodel, countersmodel
from apis.esud import esudapi
from traceback import print_exc
import re
from models import countersmodel
import routine
import gzip
import StringIO
import gc
from copy import deepcopy,copy

@get('/handlers/esud/')
def search():
  '''
  Функция получения информации об объекте.
  На вход функция получает идентификатор требуемого объекта.
  Вместе с информацией о самом объекте, вытягивается информация о всех родителях относительно текущего
  элемента до самого кроня. Для всех полученных родителей вытягиваются их потомки первого уровня.
  Также вытягиваются все потомки первого уровня относительно искомого элемента.
  '''
  result = []
  userlib.check_handler_access("esud","r")
  param = request.query.decode()
  item_id = param['id']
  try:
    # получение данных
    full_time = time.clock()
    start = time.clock()
    try:
      search_id = ObjectId(item_id) if item_id else None
    except:
      return routine.JSONEncoder().encode({'status': 'error','msg': 'Заданы неверные параметры для получения данных.'})

    path=None
    first_parent_id = None # самый верхни парент для искомого элемента
    if search_id:
      # получить всех родителей до самого верхнего уровня, относительно текущего элемента
      # для полученных родителей получить всех их потомков первого уровня
      link_owner = datamodel.get_by_id(search_id);
      if link_owner:
        path = link_owner['path']
        if path:
          ids_str = path.split('-')
          ids_obj = [ObjectId(current_id) for current_id in ids_str]
          ids_obj.append(search_id)
        else:
          ids_obj=[search_id]

        first_parent_id = ids_obj[0]
        path = path+'-'+item_id if path else item_id
        regx = re.compile('^'+path+'-([\w\d]+)$' , re.IGNORECASE)
        result = datamodel.get(
          {
            '$or':
            [
              {'parent_id': {'$in':ids_obj}},
              {'_id': {'$in':ids_obj}},
              {'path': regx}
            ]
            #'status':{'$ne':'del'}
          }
          ,None
        )
      else:
        return routine.JSONEncoder().encode({'status': 'error','msg':'Объект не найден. Возможно он был удален.'})
    else:
      # get all first level children for the current element
      regx = re.compile("^[\w\d]+$", re.IGNORECASE)
      result = datamodel.get(
      {
        #'parent_id':None
        '$or':
          [
            {'parent_id': None},
            {'path': regx}
          ]
      },None)

    # если тип текущего объекта - изделие и оно вложено в шаблон
    # то необходимо получить третий уровень данных включая ссылки и элементы
    need_third_level = False
    try:
      search_elem = (item for item in result if item["_id"] == search_id).next()
      if search_id and esudapi.is_parents_has_type(result, search_elem, 'template'):
        need_third_level = True
    except:
      pass;

    print "Time get base data: ", time.clock() - start
    start = time.clock()

    # определение, нет ли среди вытянутых объектов, системных
    # объект считается системным, если вложен в системную библиотеку, либо содержит системное свойство(ссылку)
    # также объект косвенно - системный, если его parent(любого уровня) системный,
    # также объект системный, если это ярлык на системный объект(не косвенно системный)
    # из результата выбранны объектов вытягиваем все объекты по datalink
    first_level =  esudapi.get_leveldata_by_data_links(result)
    second_level =  esudapi.get_leveldata_by_data_links(first_level)
    result.extend(first_level)
    result.extend(second_level)
    # если необходим третий уровень данных
    if need_third_level:
      third_level =  esudapi.get_leveldata_by_data_links(second_level, True)
      result.extend(third_level)

    # отсеевание дубликатов
    data_result = {'data':{}, 'childs':{}}
    for row in result:
      if row['_id'] not in data_result['data']:
        data_result['data'][row['_id']] = row
        if row['parent_id'] not in data_result['childs']:
          data_result['childs'][row['parent_id']] = []
        data_result['childs'][row['parent_id']].append(row['_id'])

    # строим дерево из получившегося результата
    # по дереву проверяем и выставляем системность, дерево начинаем от самого верхнего парента
    print "Time get system objects:", time.clock() - start
    start = time.clock()

    # Поиск ярлыков на элементы с типом изделия. проставление в ярлыки свойства от изделий оригиналов
    for row_key in data_result['data']:
      if data_result['data'][row_key].get('type') == 'product' and data_result['data'][row_key].get('datalink'):
        original_product = esudapi.get_elem(data_result,data_result['data'][row_key]['datalink'])
        if original_product:
          data_result['data'][row_key]['properties'] = original_product.get('properties', [])

    print "Time get link objects:", time.clock() - start
    start = time.clock()
    tree_result = esudapi.make_local_tree(data_result, None)
    print "Time build local tree:", time.clock() - start
    start = time.clock()
    # сжатие данных gzip-ом
    res = routine.JSONEncoder().encode({'status': 'ok','data':data_result['data'].values(), 'tree': tree_result })
    response.add_header("Content-Encoding", "gzip")
    s = StringIO.StringIO()
    with gzip.GzipFile(fileobj=s, mode='w') as f:
      f.write(res)
    print "Time zip tree is: ", time.clock() - start
    print "Time: ", time.clock() - full_time
    return s.getvalue()

    # return routine.JSONEncoder().encode({'status': 'ok','data':data_result['data'].values(), 'tree': tree_result })
  except Exception, exc:
    print('Error! Get esud data.' + str(exc))
    excType = exc.__class__.__name__
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@get('/handlers/esud/search')
def search_by_name():
  '''
    Функция поиска объектов по названию
  '''
  result = []
  userlib.check_handler_access("esud","r")
  param = request.query.decode()
  query = param['query'];
  try:
    if not query:
      return routine.JSONEncoder().encode({'status': 'error','msg':'Не заданы условия поиска.'})
    if query.startswith('"') and query.endswith('"'):
      condition = query[1:-1]
    else:
      condition = re.compile(re.escape(query), re.IGNORECASE)

    #dataItems = datamodel.get({'name':condition,'status':{'$ne':'del'} }, None)
    dataItems = datamodel.get({
      '$or':
      [
        {'name':condition},
        {'number':condition},
      ],
      'status':{'$ne':'del'}}, None)
    if not dataItems or len(dataItems)==0:
      return routine.JSONEncoder().encode({'status': 'ok','msg':'По заданным условиям ничего не найдено.', 'data': []})
    # сбор идентификаторов элементов из найденных путей
    ids = []
    for item in dataItems:
      if item['path']:
        path_ids = item['path'].split('-')
        for i in path_ids:
          id_item = ObjectId(i)
          if not id_item in ids:
            ids.append(id_item)
    # получение имен по отобранным идентификаторам из путей
    nameItems = datamodel.get(
      {'_id': {'$in':ids}},
      {'_id':1, 'name':1})
    arrNameItems = {}
    for item in nameItems:
      #arrNameItems[str(item['_id'])] = item['name']
      arrNameItems[str(item['_id'])] = item
    # подставление названий элементов в пути конечных элементов
    for item in dataItems:
      item['dacoded_path'] = item['path']
      item['parent_object'] = arrNameItems.get(str(item['parent_id'])) if item.get('parent_id') else None
      if item['path']:
        path_ids = item['path'].split('-')
        item['dacoded_path'] = item['path']
        for id_item in path_ids:
          if id_item in arrNameItems:
            item['dacoded_path'] = item['dacoded_path'].replace(id_item, arrNameItems[id_item]['name'])
        item['dacoded_path'] = item['dacoded_path'].replace('-',' / ')
    #сортировка результата по названию элементов
    dataItems.sort(key = lambda x: (x['name']))

    return routine.JSONEncoder().encode({'status': 'ok','data':dataItems})
  except Exception, exc:
    print('Error! Get esud data.' + str(exc))
    excType = exc.__class__.__name__
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@get('/handlers/esud/get_full_tree/<element_id>')
def get_full_tree(element_id):
  """get full tree for element"""
  userlib.check_handler_access('esud','r')
  # получение данных
  full_time = time.clock()
  start = time.clock()
  list = datamodel.get_cached_data()
  # построение дерева
  start = time.clock()
  cache_data = {}
  tree = esudapi.make_full_tree(list,ObjectId(element_id), '',0, True,None,cache_data)
  print "Time build tree is: ", time.clock() - start
  # анализ дерева на необходимость добавления конфигураций для моделей и
  # добавление в него конфигураций
  start = time.clock()
  #node = list['data'][ObjectId(element_id)] if ObjectId(element_id) in list['data'] else None
  node = datamodel.get_by_id(ObjectId(element_id))
  tree['node'] = node
  esudapi.analize_tree_model_configuration(list, tree, [tree], False,cache_data)
  print "Time analize tree is: ", time.clock() - start
  start = time.clock()
  # сжатие данных gzip-ом
  res = routine.JSONEncoder().encode(tree)
  response.add_header("Content-Encoding", "gzip")
  s = StringIO.StringIO()
  with gzip.GzipFile(fileobj=s, mode='w') as f:
    f.write(res)
  print "Time zip tree is: ", time.clock() - start
  print "Time: ", time.clock() - full_time
  return s.getvalue()

@get('/handlers/esud/get_full_tree/<element_id>/<parent_id>')
def get_full_tree_parent(element_id,parent_id):
  """get full tree for element"""
  userlib.check_handler_access('esud','w')
  start = time.clock()
  list = datamodel.get_cached_data()
  # построение дерева
  cache_data = {}
  tree = esudapi.make_full_tree(list,ObjectId(element_id), '',0,False,None,cache_data)

  # получаем нод из БД, чтобы получить с ним историю его изменения
  node = datamodel.get_by_id(ObjectId(parent_id))
  tree = {'node':node,'children':[tree]}

  #tree = {'node':list['data'][ObjectId(parent_id)],'children':[tree]}
  # анализ дерева на необходимость добавления конфигураций для моделей и
  # добавление в него конфигураций
  node = list['data'][ObjectId(element_id)] if ObjectId(element_id) in list['data'] else None
  esudapi.analize_tree_model_configuration(list, tree, [node],True,cache_data)
  print "Time build tree is: ", time.clock() - start
  return routine.JSONEncoder().encode(tree['children'][0])

@delete('/handlers/esud/remove_treeelem')
def remove_treeelem():
  '''
    Функция удаления элемента из дерева изделия
  '''
  userlib.check_handler_access('esud','w')
  data = request.json
  # удаляем элемент из базы
  delete_element(data['elem_id'])
  # чистим property, которые были в паренте
  elem = datamodel.get_by_id(data['parent_id'])
  if 'properties' in elem:
    properties = elem['properties']
    new_prop = []
    for p in properties:
      if data['elem_id'] not in p['linkpath']:
        new_prop.append(p)
    datamodel.update(ObjectId(data['parent_id']),{'properties':new_prop})
  return routine.JSONEncoder().encode({"result":"success"})

@post('/handlers/esud/save_product_configuration')
def save_product_configuration():
  '''
    Функция сохранения конфигурации модели в свойствах изделия
  '''
  userlib.check_handler_access('esud','w')
  try:
    usr = userlib.get_cur_user()
    data = request.json['data']
    action = request.json['action']
    # если не заданы параметры для сохранения
    if not data or action=='':
      return routine.JSONEncoder().encode({'result':'error', 'msg':'Не заданы параметры для сохранения данных'})
    elem = datamodel.get_by_id(data['elem_id'])

    properties = elem.get('properties',[])
    # запись факта изменения свойств в историю
    history = elem.get('history',[])
    history.append({'user':usr['email'],'date': datetime.datetime.utcnow(),'data': deepcopy(elem.get('properties',[]))})

    data['property_id'] = ObjectId(data['property_id'])
    data['product_config'] = ObjectId(data['product_config'])
    data['elem_id'] = ObjectId(data['elem_id'])
    old_config = None

    for p in properties:
      if p.get('linkpath')==data['linkpath'] and p['property_id']==data['property_id'] and p.get('configuration_path','') == data['configuration_path']:
        old_config = p
        break

    # если добавление нового значения условия
    if action =='add':
      if old_config:
        is_find = False
        if 'product_configs' not in old_config:
          old_config['product_configs'] = []
        for v in old_config['product_configs']:
          if v == data['product_config']:
            is_find = True
            break
        if not is_find:
          old_config['product_configs'].append(data['product_config'])
      else:
        properties.append(
          {
            'type': 'config',
            'linkpath':data['linkpath'],
            'property_id':data['property_id'],
            'configuration_path':data['configuration_path'],
            'value':{'id':None, 'value':1},
            "unit":{'id':None, 'value':'шт'},
            'product_configs':[data['product_config']]
          })
    else:
      if old_config:
        if len(old_config.get('product_configs',[]))>0:
          new_values = []
          for v in old_config['product_configs']:
            if v != data['product_config']:
              new_values.append(v)
          old_config['product_configs'] = new_values
      else:
        properties.append(
          {
            'type': 'config',
            'linkpath':data['linkpath'],
            'property_id':data['property_id'],
            'configuration_path':data['configuration_path'],
            'value':{'id':None, 'value':1},
            "unit":{'id':None, 'value':'шт'},
            'product_configs':[]
          })


    # обновление данных в БД
    datamodel.update(data['elem_id'],{'properties':properties, 'history': history})

    return routine.JSONEncoder().encode({'result':'ok', 'data': properties})
  except Exception, exc:
    print('Error! Save configuration value.' + str(exc))
    excType = exc.__class__.__name__
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@post('/handlers/esud/save_condition_value')
def save_condition_value():
  '''
    Функция сохранения значения для условия в свойствах изделия
  '''
  userlib.check_handler_access('esud','w')
  try:
    usr = userlib.get_cur_user()
    data = request.json['data']
    #ction = request.json['action']
    # если не заданы параметры для сохранения
    if not data:# or action=='':
      return routine.JSONEncoder().encode({'result':'error', 'msg':''})
    # получить оригинальный объект изделия из БД
    elem = datamodel.get_by_id(data['elem_id'])
    properties = elem.get('properties',[])
    history = elem.get('history',[])
    history.append({'user':usr['email'],'date': datetime.datetime.utcnow(),'data': deepcopy(elem.get('properties',[]) )})

    data['condition_id'] = ObjectId(data['condition_id'])
    data['condition_values'] = data.get('condition_values',[])
    for c in data['condition_values']:
      c['id'] = ObjectId(c['id'])
    data['elem_id'] = ObjectId(data['elem_id'])
    old_condition = None
    # поиск условия
    for p in properties:
      if p.get('type')=='condition' and p.get('linkpath')==data['linkpath'] and p.get('condition_id')==data['condition_id'] and p.get('configuration_path','') == data['configuration_path']:
      #if p.get('type')=='condition' and p.get('linkpath')==data['linkpath'] and p.get('condition_id')==data['condition_id']:
        old_condition = p
        break

    if old_condition:
      old_condition['condition_values'] = data['condition_values']
    else:
      properties.append(
          {
            'type': data['type'],
            'elem_id':data['elem_id'] ,
            'condition_id': data['condition_id'],
            'configuration_path': data['configuration_path'],
            'linkpath': data['linkpath'],
            'condition_values' : data['condition_values'],
            'value':{'id':None, 'value':1},
            "unit":{'id':None, 'value':'шт'}
          })

    # обновление данных в БД
    datamodel.update(data['elem_id'],{'properties':properties, 'history': history})

    return routine.JSONEncoder().encode({'result':'ok', 'data': properties})
  except Exception, exc:
    print('Error! Save condition value.' + str(exc))
    excType = exc.__class__.__name__
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@post('/handlers/esud/save_property_value')
def save_property_value():
  '''
    Функция сохранения свойства изделия
  '''
  userlib.check_handler_access('esud','w')
  try:
    usr = userlib.get_cur_user()
    data = request.json['data']
    #print data
    action = request.json['action']
    elem = datamodel.get_by_id(data['elem_id'])
    datalink = data['datalink'] if 'datalink' in data else ''
    properties = elem.get('properties',[])
    is_find = False
    history = elem.get('history',[])
    history.append({'user':usr['email'],'date': datetime.datetime.utcnow(),'data': deepcopy(elem.get('properties',[]) )})

    data['property_id'] = ObjectId(data['property_id'])
    data['property_origin_id'] = ObjectId(data['property_origin_id']) if 'property_origin_id' in data and data['property_origin_id'] else None
    data['product_config'] = ObjectId(data['product_config']) if  data.get('product_config',None) else None
    if 'id' in data['value'] and data['value']['id']:
      data['value']['id']= ObjectId(data['value']['id'])
    else:
      data['value']['id'] = None
    if 'id' in data['unit'] and  data['unit']['id']:
      data['unit']['id']= ObjectId(data['unit']['id'])
    else:
      data['unit']['id'] = None
    finded_prop = None
    for p in properties:
      if p['type']=='property_value' and p['linkpath']==data['linkpath'] and 'property_id' in p and p['property_id']==data['property_id'] and (('configuration_path' in p and p['configuration_path']==data['configuration_path']) or ('configuration_path' not in p and data['configuration_path']=='')):
        is_find = True
        #p['value'] = data['value']
        #p['unit'] = data['unit']
        finded_prop = p
        break
    val = {'unit':data['unit'], 'value':data['value']}
    if data.get('not_reset',False):
      val['not_reset'] = True
    if finded_prop:
      if action=='reset':
        # находим среди элементов элемент с флагом not_reset, чтобы оставить их
        not_reset =[]
        for k in finded_prop['values']:
          if k['value']['id']!=data['value']['id'] and k.get('not_reset'):
            not_reset.append(k)

        not_reset.append(val)
        finded_prop['values'] = not_reset
      else:
        finded_val = None
        for k in finded_prop['values']:
          if (k['value']['id']==data['value']['id']) or (k['value']['id']==None and datalink== str(datamodel.SYSTEM_OBJECTS['OPEN_VAL'])):
            finded_val = k
        if finded_val:
          if action=='add':
            finded_val['value'] = data['value']
            finded_val['unit'] = data['unit']
            if data.get('not_reset',False):
              finded_val['not_reset'] = True
          else:
            finded_prop['values'].remove(finded_val)
        else:
          if action=='add':
            finded_prop['values'].append(val)
    else:
      if action=='add' or action=='reset':
        properties.append({'elem_id':data['elem_id'], 'type':'property_value', 'linkpath':data['linkpath'],'property_id':data['property_id'], 'property_origin_id': data['property_origin_id'], 'configuration_path':data['configuration_path'], 'values':[val], 'product_config':data['product_config']})
      else:
        properties.append({'elem_id':data['elem_id'], 'type':'property_value', 'linkpath':data['linkpath'],'property_id':data['property_id'], 'property_origin_id': data['property_origin_id'], 'configuration_path':data['configuration_path'], 'values':[], 'product_config':data['product_config']})


    # обновление данных в БД
    datamodel.update(data['elem_id'],{'properties':properties, 'history': history})

    return routine.JSONEncoder().encode({'result':'ok', 'data': properties})
  except Exception, exc:
    print('Error! Save property value.' + str(exc))
    excType = exc.__class__.__name__
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@post('/handlers/esud/return_property_to_origin_value')
def return_property_to_origin_value():
  '''
    Функция возврата свйоства к оригинальным значениям.
    Применяется если были изменения значений свойства в рамках крупного изделия
  '''
  userlib.check_handler_access('esud','w')
  try:
    usr = userlib.get_cur_user()
    data = request.json['data']
    elem = datamodel.get_by_id(data['elem_id'])
    datalink = data['datalink'] if 'datalink' in data else ''
    properties = []
    # if 'properties' in elem:
    #   properties = elem['properties']
    history = elem.get('history',[])
    history.append({'user':usr['email'],'date': datetime.datetime.utcnow(),'data': deepcopy(elem.get('properties',[]) )})

    is_find = False

    data['property_id'] = ObjectId(data['property_id'])
    data['property_origin_id'] = ObjectId(data['property_origin_id']) if 'property_origin_id' in data and data['property_origin_id'] else None
    data['product_config'] = ObjectId(data['product_config']) if  data.get('product_config',None) else None

    for p in elem.get('properties',[]):
      if not(p['type']=='property_value' and p['linkpath']==data['linkpath'] and 'property_id' in p and p['property_id']==data['property_id'] and (('configuration_path' in p and p['configuration_path']==data['configuration_path']) or ('configuration_path' not in p and data['configuration_path']==''))):
        properties.append(p);
    # обновление данных в БД
    datamodel.update(data['elem_id'],{'properties':properties, 'history': history})

    return routine.JSONEncoder().encode({'result':'ok', 'data': properties})
  except Exception, exc:
    print('Error! Save property value.' + str(exc))
    excType = exc.__class__.__name__
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@post('/handlers/esud/save_property')
def save_property():

  userlib.check_handler_access('esud','w')
  try:
    usr = userlib.get_cur_user()
    data = request.json
    elem = datamodel.get_by_id(data['elem_id'])
    properties = elem.get('properties',[])
    history = elem.get('history',[])
    history.append({'user':usr['email'],'date': datetime.datetime.utcnow(),'data': deepcopy(elem.get('properties',[]) )})


    is_find = False
    data['property_id'] = ObjectId(data['property_id'])
    data['property_origin_id'] = ObjectId(data['property_origin_id']) if 'property_origin_id' in data and data['property_origin_id'] else None

    data['product_config'] = ObjectId(data['product_config']) if  data.get('product_config',None) else None

    if 'id' in data['value'] and data['value']['id']:
      data['value']['id']= ObjectId(data['value']['id'])
    else:
      data['value']['id'] = None
    if 'id' in data['unit'] and  data['unit']['id']:
      data['unit']['id']= ObjectId(data['unit']['id'])
    else:
      data['unit']['id'] = None
    for p in properties:
      if p['linkpath']==data['linkpath'] and p['property_id']==data['property_id'] and (('configuration_path' in p and p['configuration_path']==data['configuration_path']) or ('configuration_path' not in p and data['configuration_path']=='')):
        is_find = True
        p['value'] = data['value']
        p['unit'] = data['unit']
        p['type'] = data['type']
        break
    if not is_find:
      properties.append({'type': data['type'], 'elem_id':data['elem_id'], 'linkpath':data['linkpath'],'property_id':data['property_id'], 'property_origin_id': data['property_origin_id'], 'configuration_path':data['configuration_path'], 'value':data["value"],"unit":data["unit"], 'product_config':data['product_config']})

    # обновление данных в БД
    datamodel.update(data['elem_id'],{'properties':properties, 'history': history})

    return routine.JSONEncoder().encode({'result':'ok', 'data': properties})
  except Exception, exc:
    print('Error! Save condition value.' + str(exc))
    excType = exc.__class__.__name__
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@post('/handlers/esud/get_products_by_ids')
def get_model_tree():
  '''
    Функция получения структуры заданных изделий.
    Подгрузка ведется по списку ID изделий
  '''
  userlib.check_handler_access('esud','r')
  try:
    result = []
    products_ids = request.json['data']
    if not products_ids or len(products_ids)==0:
      return routine.JSONEncoder().encode({'result':'error', 'msg':'Не заданы входные параметры.'})

    # получение данных
    full_time = time.clock()
    start = time.clock()
    list = datamodel.get_cached_data()
    print "Time get full_data from db is: ", time.clock() - start
    cache_data = {}
    for element_id in products_ids:
      # построение дерева
      start = time.clock()
      tree = esudapi.make_full_tree(list,ObjectId(element_id), '',0, True,None,cache_data)
      print "Time build tree is: ", time.clock() - start
      start = time.clock()
      node = list['data'][ObjectId(element_id)] if ObjectId(element_id) in list['data'] else None
      esudapi.analize_tree_model_configuration(list, tree, [tree], False,cache_data)
      print "Time analize tree is: ", time.clock() - start
      result.append(tree)

    start = time.clock()
    # сжатие данных gzip-ом
    res = routine.JSONEncoder().encode(result)
    response.add_header("Content-Encoding", "gzip")
    s = StringIO.StringIO()
    with gzip.GzipFile(fileobj=s, mode='w') as f:
      f.write(res)
    print "Time zip tree is: ", time.clock() - start
    print "Time: ", time.clock() - full_time
    return s.getvalue()
    #return routine.JSONEncoder().encode({'result':'ok', 'data': result})
  except Exception, exc:
    print('Error! Save condition value.' + str(exc))
    excType = exc.__class__.__name__
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@get("/handler/esud/refresh_tree/<key>")
def refresh_tree(key):
  '''
    Сбор дерева от заданного узла
  '''
  userlib.check_handler_access('esud','w')
  if key=='rebuild':
    arr = datamodel.get(None,None)
    root_nodes = [i for i in arr if i['parent_id'] == None]
    #reslist = []
    err_list = []
    for r in root_nodes:
      root = {'node':r,'children':[]}
      arr.pop(arr.index(r))
      esudapi.make_tree(arr,root)
      esudapi.refresh_paths(root,"",None,err_list)
    for e in err_list:
      datamodel.update(e['_id'],{'path':e['path']})
    return routine.JSONEncoder().encode(err_list)

@put('/handlers/esud/copyelem/<parent_id>')
def copyelem(parent_id):
  '''
    Копирование элемента дерева со всеми листьями в БД
  '''
  userlib.check_handler_access('esud','w')
  try:
    # элемент который необходимо скопирвоать
    elemToCopy = request.json
    if not elemToCopy:
      return routine.JSONEncoder().encode({'status': 'error','msg':'Ошибка! Не задан элемент для копирования.'})
    # элемент в который необходмо скопировать
    destination_elem = datamodel.get_by_id(parent_id) if parent_id and parent_id!='0' else None
    # выполенние процедуры копирования
    result = esudapi.api_copy_elem(elemToCopy, destination_elem)
    #return routine.JSONEncoder().encode({'status': 'success','data':result, 'new_item_id':root['node']['_id'] })
    return routine.JSONEncoder().encode({'status': 'success','data':result, 'new_item_id':elemToCopy['_id'] })

  except Exception, exc:
    excType = exc.__class__.__name__
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@put('/handlers/esud/create_product/<parent_id>')
def api_create_product(parent_id):
  '''
    Создание изделия в указанной папке на базе указанной модели
  '''
  userlib.check_handler_access('esud','w')
  try:
    result = []
    model = request.json
    if parent_id=='0':
      parent_id = None
    if not model:
      raise Exception("Ошибка! Не задана модель, на базе которой необходимо создать изделие.")

    # получение информации о папке, в которой создается изделие
    parent_info = None
    routine_index = 0
    new_name = model['name']
    if parent_id:
      # получение информации о родителе
      parent_info = datamodel.get_by_id(parent_id)
      # получить все объекты, в родительской дирректории
      dataItems = datamodel.get({'parent_id': ObjectId(parent_id),'status':{'$ne':'del'}},None)
      if dataItems and len(dataItems)>0:
        for i in dataItems:
          if (i.get('routine',0) or 0)>routine_index:
            routine_index = (i.get('routine',0) or 0)
          if i['name'] == new_name:
            new_name = 'КОПИЯ ' + new_name
    # структура нового изделия
    new_id = ObjectId()
    model_origin_id = ObjectId(model.get('datalink')) if model.get('datalink') else ObjectId(model['_id'])
    new_number = datamodel.model_get_next_sequence_product(model_origin_id)
    product_number = routine.pad(new_number, 3)
    new_object = {
      '_id': new_id,
      'number': "{0}.{1}".format(model['number'], product_number),
      'name': new_name,
      'parent_id': ObjectId(parent_id) if parent_id else None,
      'type': 'product',
      'path': (parent_info['path']+'-'+str(parent_id) if parent_info and parent_info.get('path') else str(parent_id))  if parent_id else '',
      'routine': routine_index,
      'note': '',
      'specification_seq' : 0,
      'specification_seq_arr' : []
    }
    datamodel.add(new_object)
    # обновление стстуса счетчика конфигурации
    datamodel.update_by(
      {'_id': model_origin_id, 'product_seq_arr.i': new_number},
      {'$set': {'product_seq_arr.$.status':True }}
    )
    result.append(new_object)
    # добавление модели во внутрь созданного излелия
    model['datalink'] = ObjectId(model.get('datalink')) if model.get('datalink') else ObjectId(model['_id'])
    model['_id'] = ObjectId()
    model['parent_id'] = new_id
    model['path'] = new_object['path']+'-'+str(new_object['_id'])
    model['routine'] = 0
    datamodel.add(model)
    result.append(model)

    return routine.JSONEncoder().encode({'status': 'success','data':result, 'new_item_id':new_object['_id'] })
  except Exception, exc:
    excType = exc.__class__.__name__
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@post('/handlers/esud/element')
def add_element():
  '''
    Добавление нового элемента
  '''
  userlib.check_handler_access('esud','w')
  obj = request.json

  if 'datalink' in obj and obj['datalink']:
    obj['datalink'] =ObjectId(obj['datalink'])

  if obj['parent_id'] !="" and obj['parent_id'] is not None:
    obj['parent_id'] =ObjectId(obj['parent_id'])
    # получение информации о родителе
    parent_info = datamodel.get_by_id(str(obj['parent_id']))
    # правило, что внутри объекта значения может быть только одна единица измерения
    if obj['type']=='unit' and parent_info and parent_info['type'] == 'value':
      # получение всех вложенных элементов первого уровня
      dataItems = datamodel.get({'parent_id': obj['parent_id'],'status':{'$ne':'del'}},None)
      if dataItems and len(dataItems)>0:
        for i in dataItems:
          if i['type']=='unit':
            abort(400, "Для данного значения уже заданы единицы измерения. Возможно ваши данные устарели. Обновите данные.")

    # правило, что внутри объекта изделия на первом уровне может быть только одна модель изделия
    # если издет добавление покупной модели изделия в изделие, то необходимо в изделие склонировать
    # ярлык на покупное свойство
    elif obj['type']=='product_model' and parent_info and parent_info['type'] == 'product':
      # получить всех детей данного родителя и проверить
      # чтобы в детях уже не было модели продукции
      dataItems = datamodel.get({'parent_id': parent_info['_id'],'status':{'$ne':'del'}},None)
      product_is_buy = False
      model_is_buy = False
      if dataItems and len(dataItems)>0:
        for i in dataItems:
          if i['type']=='product_model':
            abort(400, "Для данного изделия уже задана модель. Возможно ваши данные устарели. Обновите данные.")
          elif i['type'] == 'property' and 'datalink' in i and  i['datalink'] == datamodel.SYSTEM_OBJECTS['BUY_PROP']:
            product_is_buy = True

      # назначение артикула изделию
      model_number = ''
      origin_model = datamodel.get_by_id(str(obj['datalink']))
      model_number = origin_model.get('number')
      new_number = datamodel.model_get_next_sequence_product(origin_model['_id'])
      product_number = routine.pad(new_number, 3)
      datamodel.update(
        str(parent_info['_id']),
        {'number': "{0}.{1}".format(model_number, product_number)}
      )
      # обновление стстуса счетчика конфигурации
      datamodel.update_by(
        {'_id': origin_model['_id'], 'product_seq_arr.i': new_number},
        {'$set': {'product_seq_arr.$.status':True }}
      )

    # правило, что внутри объекта изделия или модели изделия на первом уровне может быть
    # только одна ссылка на покупное свойство
    elif obj['type']=='property' and 'datalink' in obj and (obj['datalink'] ==  datamodel.SYSTEM_OBJECTS['BUY_PROP'] or obj['datalink'] ==  datamodel.SYSTEM_OBJECTS['TECHNO_GROUP_PROP']):
      # получить всех детей данного родителя и проверить
      # чтобы в детях уже не было ссылки на покупное свойство
      dataItems = datamodel.get({'parent_id': parent_info['_id'],'status':{'$ne':'del'}},None)
      if dataItems and len(dataItems)>0:
        for i in dataItems:
          if 'datalink' in i and i['datalink'] == datamodel.SYSTEM_OBJECTS['BUY_PROP']:
            abort(400, "Для данного объекта уже задано свойство покупного изделия. Возможно ваши данные устарели. Обновите данные.")
          elif 'datalink' in i and (i['datalink'] == datamodel.SYSTEM_OBJECTS['TECHNO_GROUP_PROP'] or i['datalink'] == datamodel.SYSTEM_OBJECTS['BUY_GROUP_PROP'] ):
            abort(400, "Для данного объекта уже задано свойство обобщенной группы(покупные аналоги или технологические аналоги). Возможно ваши данные устарели. Обновите данные.")

      # если родитель, это модель изделия, то необходимо получить
      # все изделия, созданные на базе данной модели. Если есть активные изделия, то
      # положить ярлык на свойство в модель нельзя.
      if parent_info['type'] == 'product_model':
        # получение всех, кто ссылается на даную модель
        dataItems = datamodel.get(
          {
            'datalink': parent_info['_id'],
            'status':{'$ne':'del'},
          }, None)
        if dataItems and len(dataItems)>0:
            abort(400, "На данный объект есть активные ярлыки. Нельзя сделать объект покупным или обобщенным, если на его основе уже созданы ярлыки. Возможно ваши данные устарели. Обновите данные.")
      # если все проверки прошли, и в модель кладется покупное свойство,
      # то необходимо для модели поменять артикул и освабодить старый артикул
      if obj['datalink'] ==  datamodel.SYSTEM_OBJECTS['BUY_PROP']:
        old_number = routine.strToInt(parent_info['number'])
        new_number = countersmodel.get_next_sequence_with_confirm('data_models_buy')
        # обновление номера объекта
        datamodel.update(
          str(parent_info['_id']),
          {'number': routine.pad(new_number, 3)}
        )
        # применение нового номера счетчика
        countersmodel.update_by(
          {'_id': 'data_models_buy', 'seq_arr.i': new_number},
          {'$set': {'seq_arr.$.status':True }}
        )
        # освобождение старого номера счетчика
        countersmodel.update_by(
          {'_id': 'data_models_own', 'seq_arr.i': old_number},
          {'$set': {'seq_arr.$.status':False }}
        )

    # правило, что внутри объекта изделия или модели изделия на первом уровне может быть
    # только одна ссылка на свойство-объем
    elif obj['type']=='property' and 'datalink' in obj and obj['datalink'] ==  datamodel.SYSTEM_OBJECTS['VOL_PROP']:
      # получить всех детей данного родителя и проверить
      # чтобы в детях уже не было ссылки на покупное свойство
      dataItems = datamodel.get({'parent_id': parent_info['_id'],'status':{'$ne':'del'}},None)
      if dataItems and len(dataItems)>0:
        for i in dataItems:
          if 'datalink' in i and i['datalink'] == datamodel.SYSTEM_OBJECTS['VOL_PROP']:
            abort(400, "Для данного объекта уже задано свойство - объем. Возможно ваши данные устарели. Обновите данные.")

  # если добавление модели, то необходимо сформировать для нее артикул
  if obj.get('type')=='product_model' and not obj.get('datalink'):
    new_number = countersmodel.get_next_sequence_with_confirm('data_models_own')
    obj['number'] = routine.pad(new_number, 3)

    # применение нового номера счетчика
    countersmodel.update_by(
      {'_id': 'data_models_own', 'seq_arr.i': new_number},
      {'$set': {'seq_arr.$.status':True }}
    )

  # модель покупного изделия
  is_product_model_buy = obj['type']=='product_model_buy'
  if obj['type']=='product_model_buy':
    obj['_id'] = ObjectId()
    obj['type'] = 'product_model'

    # присвоение номера моделе
    new_number = countersmodel.get_next_sequence_with_confirm('data_models_buy')
    obj['number'] = routine.pad(new_number, 3)
    # применение нового номера счетчика
    countersmodel.update_by(
      {'_id': 'data_models_buy', 'seq_arr.i': new_number},
      {'$set': {'seq_arr.$.status':True }}
    )
    # получение информации о системном свойстве - "покупное изделие"
    tmp_prop = datamodel.get_by_id(datamodel.SYSTEM_OBJECTS['BUY_PROP'])
    datamodel.add({
      '_id': ObjectId(),
      'datalink': datamodel.SYSTEM_OBJECTS['BUY_PROP'],
      'status': '',
      'is_techno': False,
      'is_otbor': False,
      'open_value': False,
      'name': tmp_prop['name'],
      'alias': '',
      'is_objective_system': False,
      'number': '',
      'is_input': False,
      'is_system': False,
      'note': '',
      'parent_id': ObjectId(obj['_id']),
      'is_separate': False,
      'routine': 0,
      'is_optional': False,
      'path': obj['path'] + '-' + str(obj['_id']),
      'is_complect': False,
      'is_buy': False,
      'type': 'property',
      'is_inherit': False
    })

  # добавление требуемого объекта
  result = datamodel.add(obj)
  if is_product_model_buy:
    result['is_buy'] = True
  return routine.JSONEncoder().encode(result)


@get('/handlers/esud/element/<elem_id>')
def get_element(elem_id):
  '''
    Получение элемента
  '''
  userlib.check_handler_access('esud','r')
  # получить объект
  obj_db = datamodel.get_by_id(elem_id)
  return routine.JSONEncoder().encode(obj_db)

@put('/handlers/esud/element/<elem_id>')
def update_element(elem_id):
  '''
    Обновление данных элемента
  '''
  userlib.check_handler_access('esud','w')
  obj = request.json
  # получить обновляемый объект
  obj_db = datamodel.get_by_id(elem_id)
  # если обновился parent_id
  if str(obj_db['parent_id'])!=obj['parent_id']:
    # проверка на перемещение единицы измерения во внутрь значения в котором уже есть единицы измерения
    if obj['type']=='unit' and obj['parent_id'] is not None:
      # получение информации о родителе
      parent_info = datamodel.get_by_id(str(obj['parent_id']))
      if parent_info and parent_info['type'] == 'value':
        # получение всех вложенных элементов первого уровня
        dataItems = datamodel.get({'parent_id': parent_info['_id'],'status':{'$ne':'del'}},None)
        if dataItems and len(dataItems)>0:
          for i in dataItems:
            if i['type']=='unit':
              abort(400, "Для данного значения уже заданы единицы измерения.")

    datamodel.change_path((obj_db['path']+'-'+elem_id) if obj_db['path'] else elem_id,(obj['path']+'-'+elem_id) if obj['path'] else elem_id)
  routine.JSONEncoder().encode(datamodel.update_multy(
    {'datalink':ObjectId(elem_id), '$where':'(!this.alias || this.alias==this.name)'},
    {
      'name':obj['name'],
      'alias':obj['name'],
      'type':obj['type']
    }))
  routine.JSONEncoder().encode(datamodel.update_multy(
    {'datalink':ObjectId(elem_id), '$where':'(this.alias && this.alias!=this.name)'},
    {
      'alias':obj['name'],
      'type':obj['type']
    }))
  return routine.JSONEncoder().encode(datamodel.update_multy(
    #{'$or':[{'_id':ObjectId(elem_id)},{'datalink':ObjectId(elem_id)}]},
    {'_id':ObjectId(elem_id)},
    {
      'name':obj['name'],
      'type':obj['type'],
      'alias':obj.get('alias',''),
      'parent_id': ObjectId(obj['parent_id']) if obj['parent_id'] is not None else None,
      'path':obj['path'],
      'routine':obj['routine'],
      'note':obj['note'],
    }))

@put('/handlers/esud/updateposition')
def api_save_data():
  '''
    Обновление позиции элемента в списке
  '''
  userlib.check_handler_access('esudtree','w')
  dataToSave = request.json;
  #print( routine.JSONEncoder().encode(dataToSave))
  for item in dataToSave:
    datamodel.update(item['_id'], {'routine': item['routine']});
  return routine.JSONEncoder().encode({"result":"success"})

@delete('/handlers/esud/element/<elem_id>')
def delete_element(elem_id):
  '''
    Удаление элемента
  '''
  userlib.check_handler_access('esud','w')
  # получить удаляемый объект
  obj_db = datamodel.get_by_id(elem_id)
  linked_elems_id_to_remove = []
  #получить все элементы которые ссылаются на удаляемый элемент или его потомков
  regx = re.compile(elem_id, re.IGNORECASE)
  dataItems = datamodel.get(
    {
      '$or':
      [
        {'path':regx},
        {'_id': ObjectId(elem_id)},
      ],
      'status':{'$ne':'del'},
    }, None)

  # собратяь все ярлыки на элемент
  tmp_ids = []
  for i in dataItems:
    tmp_ids.append(i['_id'])
  linked_elems = []
  if len(tmp_ids)>0:
    linked_elems = datamodel.get({'datalink': {'$in':tmp_ids}}, None)
  if linked_elems and len(linked_elems)>0:
    for i in linked_elems:
      if not i['_id'] in linked_elems_id_to_remove:
        linked_elems_id_to_remove.append(i['_id'])

  path = (obj_db['path']+'-'+elem_id) if obj_db['path'] else elem_id
  regx = re.compile(path, re.IGNORECASE)
  # удалить всех потомков удаляемого элемента
  datamodel.remove_multi({'path':regx})
  # удалить сам элемент
  datamodel.remove(elem_id)
  # удалить все ссылки на элемент или его потомков
  if len(linked_elems_id_to_remove)>0:
    datamodel.remove_multi({'_id': {'$in':linked_elems_id_to_remove}})
  return routine.JSONEncoder().encode({"result":"success"})

@get('/handlers/esud/is_can_delete')
def is_can_delete():
  '''
    Проверка на возможность удаления элемента
  '''
  from apis.esud import  esudspecificationapi

  userlib.check_handler_access('esud','r')
  param = request.query.decode()
  search_elem_id = param['elem_id']
  try:
    if not search_elem_id:
      raise Exception("Не задан элемент.")
    # получение информации о теефоне
    row = datamodel.get_by_id(search_elem_id)
    # Нельзя удалить модель или конфигурацию, если на их базе есть активные спецификации
    if not row.get('datalink') and row.get('number') and (row.get('type') == 'product' or row.get('type') == 'product_model') and esudspecificationapi.have_specifications(row['number'], row['type']):
      if row['type'] == 'product':
        raise Exception("Для удаляемой конфигурации существуют спецификации. Прежде чем удалить конфигурацию необходимо удалить спецификации.")
      else:
        raise Exception("Для удаляемой модели конфигурации существуют спецификации. Прежде чем удалить данную модель необходимо удалить спецификации.")

    result = {'links': [], 'system_childs': []}
    # получение системных детей объекта
    data_result = datamodel.get_cached_data()
    # построение дерева для проверки нет ли у элемента системных детей
    data_tree = esudapi.make_local_tree(data_result, ObjectId(search_elem_id) )
    esudapi.get_system_childs(data_tree, result['system_childs'])
    # получение ссылок на объект и на его потомков
    result['links'] = esudapi.check_on_links(search_elem_id)
    return routine.JSONEncoder().encode({'status': 'ok', 'result': result })
  except Exception, exc:
    excType = exc.__class__.__name__
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@get('/handlers/esud/reset_optional')
def do_reset_optioanl_values():
  '''
  Метод проставляет во всех изделяех все значения для опциональных свойств, и для свойств с одним значением
  '''
  userlib.check_handler_access("esud","o")
  config.qu_default.enqueue_call(func=esudapi.reset_optional_values, args=None)

@put('/handlers/esud/create_object_by_template/<parent_id>')
def api_create_object_by_template(parent_id):
  '''
    Создание изделия в указанной папке на базе указанной модели
  '''
  userlib.check_handler_access('esud','w')
  try:
    result = []
    data = request.json
    template = data.get('template_elem')
    new_name = data.get('new_object_name')
    new_type = data.get('new_object_type')
    note = data.get('new_object_note')

    if parent_id=='0':
      parent_id = None
    if not template:
      raise Exception("Ошибка! Не задан шаблон, на базе которого необходимо создать объект.")

    # получение информации о папке, в которой создается изделие
    parent_info = None
    routine_index = 0
    if parent_id:
      # получение информации о родителе
      parent_info = datamodel.get_by_id(parent_id)
      # получить все объекты, в родительской дирректории
      dataItems = datamodel.get({'parent_id': ObjectId(parent_id),'status':{'$ne':'del'}},None)
      if dataItems and len(dataItems)>0:
        for i in dataItems:
          if (i.get('routine',0) or 0)>routine_index:
            routine_index = (i.get('routine',0) or 0)

    # структура нового изделия
    new_id = ObjectId()
    new_object = {
      '_id': new_id,
      'name': new_name,
      'parent_id': ObjectId(parent_id) if parent_id else None,
      'type': new_type,
      'path': (parent_info['path']+'-'+str(parent_id) if parent_info and parent_info.get('path') else str(parent_id))  if parent_id else '',
      'routine': routine_index,
      'note': note,
      'datalink': None
    }
    datamodel.add(new_object)
    result.append(new_object)

    # копирование содержимого шаблона в новый объект, созданный на базе шаблона
    elems_to_copy = datamodel.get({'parent_id': ObjectId(template['_id']),'status':{'$ne':'del'}},None)
    for elem_to_copy in elems_to_copy:
      result.extend(esudapi.api_copy_elem(elem_to_copy, new_object))

    return routine.JSONEncoder().encode({'status': 'success','data':result, 'new_item_id':new_id })
  except Exception, exc:
    excType = exc.__class__.__name__
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@put('/handlers/esud/redefine_object/<parent_id>')
def api_redefine_object(parent_id):
  '''
    Переопределение объекта в указанной папке
  '''
  userlib.check_handler_access('esud','w')
  try:
    result = []
    copy_object = request.json['elem']

    # получение информации о папке, в которой создается изделие
    parent_info = None
    routine_index = 0
    if parent_id:
      # получение информации о родителе
      parent_info = datamodel.get_by_id(parent_id)
      # получить все объекты, в родительской дирректории
      dataItems = datamodel.get({'parent_id': ObjectId(parent_id),'status':{'$ne':'del'}},None)
      if dataItems and len(dataItems)>0:
        for i in dataItems:
          if (i.get('routine',0) or 0)>routine_index:
            routine_index = (i.get('routine',0) or 0)

    # структура нового изделия
    new_id = ObjectId()
    new_object = {
      '_id': new_id,
      'name': copy_object['name'],
      'parent_id': ObjectId(parent_id) if parent_id else None,
      'type': copy_object['type'],
      'path': (parent_info['path']+'-'+str(parent_id) if parent_info and parent_info.get('path') else str(parent_id))  if parent_id else '',
      'routine': routine_index,
      'note': copy_object['note'],
      'datalink': ObjectId(copy_object['_id']) if not copy_object.get('datalink') else ObjectId(copy_object['datalink'])
    }
    datamodel.add(new_object)
    result.append(new_object)

    # # копирование содержимого шаблона в новый объект, созданный на базе шаблона
    # elems_to_copy = datamodel.get({'parent_id': ObjectId(template['_id']),'status':{'$ne':'del'}},None)
    # for elem_to_copy in elems_to_copy:
    #   result.extend(esudapi.api_copy_elem(elem_to_copy, new_object))
    return routine.JSONEncoder().encode({'status': 'success','data':result, 'new_item_id':new_id })
  except Exception, exc:
    excType = exc.__class__.__name__
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@get('/handlers/esud/get_model_properties/<model_number>')
def get_model_properties(model_number):
  '''
  Получить объект модель со всеми свойствами
  '''
  userlib.check_handler_access('esud','r')
  try:
     result = esudapi.get_model_properties(model_number);
     return routine.JSONEncoder().encode({'status': 'success','data':result})
  except Exception, exc:
    excType = exc.__class__.__name__
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@post('/handlers/esud/update_config_props')
def update_config_props():
  '''
    Обновление свойств конфигураций
    Входные параметры:
    [{"configs": ["557.001","557.002"], "props": [{"prop":"57a4fad85f0f19103e36cc5b", "val":"557", "unit":"мм"},{"prop":"57a62b235f0f19157aa1f45c", "val":"Чёрный", "unit":""}]}]
  '''
  userlib.check_handler_access("esud","w")
  try:
    #params = request.json
    post_data = request.body.read()
    params = json.loads(post_data)
    if not params or len(params) ==0:
      raise Exception("Заданы неверные входные параметры.")
    usr = userlib.get_cur_user()
    result = esudapi.update_config_props(params, usr)
    return routine.JSONEncoder().encode({'status':'ok','data':result})
  except Exception, exc:
    print('----Error. /handlers/esud/update_config_props; {0}'.format(str(exc)))
    excType = exc.__class__.__name__
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@get('/handlers/esud/undo_history_state/<element_id>')
def undo_history_state(element_id):
  '''
    Undo по истории изменения объекта
    Данная функция работает только для изделий
  '''
  userlib.check_handler_access('esud','w')
  try:
    usr = userlib.get_cur_user()
    node = datamodel.get_by_id(ObjectId(element_id))
    if len(node.get('history',[]))>0:
      node['history'].insert(0, {'user':usr['email'],'date': datetime.datetime.utcnow(),'data': deepcopy(node.get('properties',[]))})
      node['properties'] = node['history'].pop()['data'];
      datamodel.update(ObjectId(element_id),{'properties':node['properties'], 'history': node['history']})
    return routine.JSONEncoder().encode({'status': 'ok', 'data': node })
  except Exception, exc:
    print('----Error. /handlers/esud/undo_history_state; {0}'.format(str(exc)))
    excType = exc.__class__.__name__
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@get('/handlers/esud/redo_history_state/<element_id>')
def redo_history_state(element_id):
  '''
    Redo по истории изменения объекта
    Данная функция работает только для изделий
  '''
  userlib.check_handler_access('esud','w')
  try:
    usr = userlib.get_cur_user()
    node = datamodel.get_by_id(ObjectId(element_id))
    if len(node.get('history',[]))>0:
      node['history'].append({'user':usr['email'],'date': datetime.datetime.utcnow(),'data': deepcopy(node.get('properties',[]))})
      node['properties'] = node['history'].pop(0)['data'];
      datamodel.update(ObjectId(element_id),{'properties':node['properties'], 'history': node['history']})

    return routine.JSONEncoder().encode({'status': 'ok', 'data': node })
  except Exception, exc:
    print('----Error. /handlers/esud/undo_history_state; {0}'.format(str(exc)))
    excType = exc.__class__.__name__
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@get('/handlers/esud/test_pack_data')
def test_pack_data():
  data = datamodel.get_cached()

