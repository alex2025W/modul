#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route, view, get, post, put, request, error, abort, response, debug, static_file, template, redirect
import urllib, config
from libraries import userlib
from models import datamodel, specificationmodel
from apis.esud import  esudapi
from handlers import handler
import json
from routine import  JSONEncoder
import re

@route('/esud')
def esud():
  userlib.check_page_access('esud','r')
  # получить корневые объекты
  regx = re.compile("^[\w\d]+$", re.IGNORECASE)
  result = datamodel.get(
    {
      '$or':
        [
          {'parent_id': None},
          {'path': regx}
        ]
    },None)

  # получение системных объектов
  system_objects_info = datamodel.get({'_id': {'$in':datamodel.SYSTEM_OBJECTS.values()}},None)
  system_objects = {'items': datamodel.SYSTEM_OBJECTS, 'items_detail': system_objects_info}

  # определение, нет ли среди вытянутых объектов, системных
  # объект считается системным, если вложен в системную библиотеку, либо содержит системное свойство(ссылку)
  # также объект косвенно - системный, если его parent(любого уровня) системный,
  # также объект системный, если это ярлык на системный объект(не косвенно системный)
  # из результата выбранны объектов вытягиваем все объекты по datalink
  links_ids = []
  links_result = []
  for row in result:
    if 'datalink' in row and row['datalink'] and row['datalink'] not in links_ids:
      links_ids.append(row['datalink'])
  if len(links_ids)>0:
    links_result = datamodel.get({
      #'_id': {'$in':links_ids}
      '$or':[{'parent_id': {'$in':links_ids}},{'_id': {'$in':links_ids}}]
    },None)
  # из результата выбранных объектов по datalink вытягиваем
  # родителей на уровень вверх и детей на уровень вниз
  items_ids = []
  items_result = []
  if len(links_result)>0:
    result.extend(links_result)
    for row in links_result:
      items_ids.append(row['parent_id'])
  if len(items_ids)>0:
    items_result = datamodel.get({
      '_id': {'$in':items_ids}
      #'$or':[{'parent_id': {'$in':items_ids}},{'_id': {'$in':items_ids}}]
    },None)
    if len(items_result)>0:
      result.extend(items_result)

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
  tree_result = esudapi.make_local_tree(data_result, None)

  # построение страницы
  return template(
    'frontend/esud/templates/index',
    current_user=userlib.get_cur_user(),
    version = config.VERSION,
    menu=userlib.get_menu(),
    data = JSONEncoder().encode(data_result['data'].values()),
    system_objects = JSONEncoder().encode(system_objects)
  )

@route('/esud/calculation/<item_id>')
def esud_calculation(item_id):
  result = []
  data_info = None
  userlib.check_page_access('esud_calculation','r')
  # получить информацию об объекте
  if item_id:
    data_info = datamodel.get_by_id(item_id)

  # получение системных объектов
  system_objects_info = datamodel.get({'_id': {'$in':datamodel.SYSTEM_OBJECTS.values()}},None)
  system_objects = {'items': datamodel.SYSTEM_OBJECTS, 'items_detail': system_objects_info}

  # построение страницы
  return template('views/esud/esudcalculation', current_user=userlib.get_cur_user(), version = config.VERSION, menu=userlib.get_menu(), data = JSONEncoder().encode(data_info), system_objects = JSONEncoder().encode(system_objects))

'''
  Форма отображения спецификаций
'''
@route('/esud/specification')
def esud_specification():
  result = []
  data_info = None
  userlib.check_page_access('esud_specification','r')
  # получение системных объектов
  system_objects_info = datamodel.get({'_id': {'$in':datamodel.SYSTEM_OBJECTS.values()}},None)
  system_objects = {'items': datamodel.SYSTEM_OBJECTS, 'items_detail': system_objects_info}
  # получение всех моделей для системы фильтрации
  data_models = datamodel.get_all_active_models_short_info()
  # пробиваем тип моделей (покупные/собственного производства)
  list = datamodel.get_cached_data()
  for model in data_models:
    model['is_buy'] = esudapi.check_link_on_buy(list, model.get('datalink') if model.get('datalink') else model.get('_id'))

  # построение страницы
  return template('views/esud/esudspecification', current_user=userlib.get_cur_user(), version = config.VERSION, menu=userlib.get_menu(), data = None, system_objects = JSONEncoder().encode(system_objects), data_models= JSONEncoder().encode(data_models) )

#@route('/esud/specification/calculation/<item_id>')
@route('/esud/specification/calculation')
def esud_specification_calculation():
  from models import datamodel, specificationmodel
  usr = userlib.get_cur_user()
  result = []
  data_info = None
  userlib.check_page_access('esud_specification','r')
  # получить информацию об объекте
  # if item_id:
  #   data_info = specificationmodel.get_by_id(item_id)
  # получение системных объектов
  system_objects_info = datamodel.get({'_id': {'$in':datamodel.SYSTEM_OBJECTS.values()}},None)
  system_objects = {'items': datamodel.SYSTEM_OBJECTS, 'items_detail': system_objects_info}
  # информация о занятости страницы
  page_single_mode_info = handler.check_page_on_busy(usr, 'esud_specification_calculation')
  # построение страницы
  return template('views/esud/specification_calculation/main', current_user=userlib.get_cur_user(), version = config.VERSION, menu=userlib.get_menu(), data = data_info, system_objects = JSONEncoder().encode(system_objects), page_single_mode_info = JSONEncoder().encode(page_single_mode_info), single_mode_time= config.single_mode_time )

'''
  Форма-плагин обновления значений свойств спецификаций
'''
@route('/esud/esud_specification_update')
def esud_specification_update():
  return template('views/esud/esud_specification_update', current_user=userlib.get_cur_user(), version = config.VERSION, menu=userlib.get_menu(), data = None )

'''
  Форма отображения комплекта
'''
@route('/esud/complect')
def esud_complect():
  result = []
  data_info = None
  userlib.check_page_access('esud_complect','r')
  # получение системных объектов
  system_objects_info = datamodel.get({'_id': {'$in':datamodel.SYSTEM_OBJECTS.values()}},None)
  system_objects = {'items': datamodel.SYSTEM_OBJECTS, 'items_detail': system_objects_info}
  # построение страницы
  return template('views/esud/esudcomplect', current_user=userlib.get_cur_user(), version = config.VERSION, menu=userlib.get_menu(), data = None, system_objects = JSONEncoder().encode(system_objects))

'''
  Форма построения графа спецификации
'''
@route('/esud/specification/graph')
def esud_specification_graph():
  userlib.check_page_access('esudtreegraph','r')
  return template('views/esudspecificationgraph', current_user=userlib.get_cur_user(), version=config.VERSION, menu=userlib.get_menu())

'''
  Форма-плагин обновления значений свойств конфигураций
'''
@route('/esud/esud_configuration_update')
def esud_configuration_update():
  return template('views/esud/esud_configuration_update', current_user=userlib.get_cur_user(), version = config.VERSION, menu=userlib.get_menu(), data = None )



