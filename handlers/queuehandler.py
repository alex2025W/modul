#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route, get, post, put, request, error, abort, response, debug, BaseRequest
BaseRequest.MEMFILE_MAX = 1024 * 1024*100
import json
import urllib
from bson.objectid import ObjectId
from bson.binary import Binary
import datetime, time, routine,  config
from models import usermodel, queuemodel
from apis.esud import esudspecificationapi
from libraries import userlib
from traceback import print_exc

@get('/handlers/queue/check_status/<key>')
def api_check_status(key):
  '''
    Проверка статуса задания в очереди
  '''
  try:
    usr = userlib.get_cur_user()
    if not usr:
      return routine.JSONEncoder().encode({'status': 'error', 'msg': 'Доступ запрещен.'})
    # проверка ключа на правильность
    try:
      key = ObjectId(key)
    except:
      pass
    if not key:
      return routine.JSONEncoder().encode({'status': 'error', 'msg': 'Неверный ключ.'})

    # получение данных по ключу
    data =  queuemodel.get({'_id':key}, None)
    if not data:
      return routine.JSONEncoder().encode({'status': 'error', 'msg': 'Неверные входные параметры.'})

    # если выполнение операции не завершено, то возвращается статус текущей операции
    # иначе возвращаются полученные данные
    if data['status']!='ok':
      return routine.JSONEncoder().encode(data)
    else:
      if data.get('zip'):
        response.add_header("Content-Encoding", "gzip")
      # удаление записи из таблицы-очереди
      queuemodel.remove({'_id': data['_id']})
      # результат
      return str(data['data'])

    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})
  except Exception, exc:
    excType = exc.__class__.__name__
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@post('/handlers/queue/add_in_queue/<key>')
def add_in_queue(key):
  '''
    Добавление новой записи в очередь на исполнение
    key - какое задание добавить
  '''
  try:
    # проверка на доступ к форме
    usr = userlib.get_cur_user()
    if not usr:
      return routine.JSONEncoder().encode({'status': 'error', 'msg': 'Доступ запрещен.'})
    userlib.check_handler_access("esud_specification","r")

    usr = {'email': usr['email']}
    # получение сжатых данных от клиента
    data =  request.forms.data
    # data = request.json['data']
    # добавление задания в очередь
    queue_key =ObjectId()
    # определение операции которую необходимо добавить в очередь
    # расчет спецификации
    if key=="calculate_specification":
      from apis.esud import esudspecificationapi
      queuemodel.add({
        '_id': queue_key,
        'percent_complete': 0,
        'start_date': datetime.datetime.utcnow(),
        'user': usr['email'],
        'status': 'in_progress',
        'data': None,
        'params': None,
        'note': '',
        'zip': True,
        'key': 'calculate_specification'
      })

      if config.use_worker:
        config.qu_low.enqueue_call(func=esudspecificationapi.api_background_calculate_specification, args=(str(queue_key), data, usr))
      else:
        esudspecificationapi.api_background_calculate_specification(str(queue_key), data, usr)

    elif key=="save_specification":
      from apis.esud import esudspecificationapi
      userlib.check_handler_access("esud_specification","w")
      queuemodel.add({
        '_id': queue_key,
        'percent_complete': 0,
        'start_date': datetime.datetime.utcnow(),
        'user': usr['email'],
        'status': 'in_progress',
        'data': None,
        'params': data,
        'note': '',
        'zip': True,
        'key': 'save_specification'
      })
      if config.use_worker:
        config.qu_low.enqueue_call(func=esudspecificationapi.api_background_save_specification, args=(str(queue_key), usr))
      else:
        esudspecificationapi.api_background_save_specification(str(queue_key), usr)

    elif key=="load_product_tree":
      from apis.esud import esudapi
      userlib.check_handler_access("esud","r")
      queuemodel.add({
        '_id': queue_key,
        'percent_complete': 0,
        'start_date': datetime.datetime.utcnow(),
        'user': usr['email'],
        'status': 'in_progress',
        'data': None,
        'params': data,
        'note': '',
        'zip': True,
        'key': 'load_product_tree'
      })
      if config.use_worker:
        config.qu_low.enqueue_call(func=esudapi.api_background_load_product_tree, args=(str(queue_key), data, usr))
      else:
        esudapi.api_background_load_product_tree(str(queue_key), data, usr)
    # расчет комплекта
    elif key=="calculate_complect":
      from apis.esud import esudspecificationapi, esudcomplectapi
      queuemodel.add({
        '_id': queue_key,
        'percent_complete': 0,
        'start_date': datetime.datetime.utcnow(),
        'user': usr['email'],
        'status': 'in_progress',
        'data': None,
        'params': None,
        'note': '',
        'zip': True,
        'key': 'calculate_complect'
      })

      userlib.check_handler_access("esud_complect","r")
      if config.use_worker:
        config.qu_low.enqueue_call(func=esudcomplectapi.api_background_calculate, args=(str(queue_key), data, usr))
      else:
        esudcomplectapi.api_background_calculate(str(queue_key), data, usr)

    # сохранение комплекта
    elif key=="save_complect":
      from apis.esud import esudspecificationapi, esudcomplectapi
      userlib.check_handler_access("esud_complect","w")
      queuemodel.add({
        '_id': queue_key,
        'percent_complete': 0,
        'start_date': datetime.datetime.utcnow(),
        'user': usr['email'],
        'status': 'in_progress',
        'data': None,
        'params': data,
        'note': '',
        'zip': True,
        'key': 'save_complect'
      })
      if config.use_worker:
        config.qu_low.enqueue_call(func=esudcomplectapi.api_background_save, args=(str(queue_key), usr))
      else:
        esudcomplectapi.api_background_save(str(queue_key), usr)

    # расчет задания на производство
    elif key=='calculate_production_order':
      from apis.esud import esudproductionorderapi
      queuemodel.add({
        '_id': queue_key,
        'percent_complete': 0,
        'start_date': datetime.datetime.utcnow(),
        'user': usr['email'],
        'status': 'in_progress',
        'data': None,
        'params': None,
        'note': '',
        'zip': True,
        'key': 'calculate_production_order'
      })
      userlib.check_handler_access('esud_specification_calculation','r')
      if config.use_worker:
        config.qu_high.enqueue_call(func=esudproductionorderapi.api_background_calculate, args=(routine.JSONDecode(routine.decompress(data, 'deflate')),str(queue_key)))
      else:
        esudproductionorderapi.api_background_calculate(routine.JSONDecode(routine.decompress(data, 'deflate')), str(queue_key))

    elif key=="set_crm_google_catalogs_rights":
      from apis.crm import orderapi
      userlib.check_handler_access("crm_google_catalogs_right","w")
      queuemodel.add({
        '_id': queue_key,
        'percent_complete': 0,
        'start_date': datetime.datetime.utcnow(),
        'user': usr['email'],
        'status': 'in_progress',
        'data': None,
        'params': data,
        'note': '',
        'zip': True,
        'key': 'load_product_tree'
      })
      if config.use_worker:
        config.qu_low.enqueue_call(
          func=orderapi.set_google_catalogs_rights,
          args=(routine.JSONDecode(routine.decompress(data, 'deflate')), str(queue_key), usr)
        )
      else:
        orderapi.set_google_catalogs_rights(routine.JSONDecode(routine.decompress(data, 'deflate')), str(queue_key), usr)
    elif key=="google_catalogs_check_rights":

      from apis.crm import orderapi
      userlib.check_handler_access("google_catalogs_check_right","w")
      queuemodel.add({
        '_id': queue_key,
        'percent_complete': 0,
        'start_date': datetime.datetime.utcnow(),
        'user': usr['email'],
        'status': 'in_progress',
        'data': None,
        'params': data,
        'note': '',
        'zip': True,
        'key': 'load_product_tree'
      })
      if config.use_worker:
        config.qu_low.enqueue_call(
          func=orderapi.check_google_catalogs_rights,
          args=(routine.JSONDecode(routine.decompress(data, 'deflate')), str(queue_key), usr)
        )
      else:
        orderapi.check_google_catalogs_rights(routine.JSONDecode(routine.decompress(data, 'deflate')), str(queue_key), usr)

    return routine.JSONEncoder().encode({'status': 'ok', 'key': str(queue_key)})
  except Exception, exc:
    print('error')
    excType = exc.__class__.__name__
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})
