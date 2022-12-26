#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route, get, post, put, request, error, abort, response, debug
import config
import json
from bson.objectid import ObjectId
import datetime
from libraries import userlib
import routine
from routine import JSONEncoder
from threading import Lock
from apis.crm import orderapi
from traceback import print_exc

@put('/handlers/order/<key>')
def update_order(key):
  '''
    Обновление заявки
  '''
  try:
    result = orderapi.update_order(key, request.json, userlib.get_cur_user())
    return routine.JSONEncoder().encode(result)
  except Exception, exc:
    print_exc()
    if str(exc) == 'access_error':
      abort(401,"access_error")


@get('/handlers/crm/check_on_google_folder/<number>/<is_new>')
def check_on_google_folder(number, is_new):
    """ Проверка успешности создания папок на стороне Google диска """
    userlib.check_handler_access("app", "r")
    if is_new == 'true':
        is_new = True
    elif is_new == 'false':
        is_new = False
    else:
        abort(400, 'is_new argument must be boolean')

    return routine.JSONEncoder().encode(orderapi.check_on_google_folder(number, is_new, userlib.get_cur_user()))


@put('/handlers/order/')
def save_order():
  '''
    Добавление новой заявки
  '''
  from models import  clientmodel, ordermodel, countersmodel
  userlib.check_handler_access("app","w")
  param = request.json
  del param['id']
  manager = param['cur_manager']
  # считаем среднюю стоимость за кв. метр
  param['sq_price'] = param['price']/param['sq'] if 'sq' in param and param['sq'] else 0
  usr = userlib.get_cur_user()
  if usr['email'] != manager:
    abort(401,"access_error")
  try:
    del param['cur_manager']
  except Exception, e:
    pass
  # get new order number
  param['number'] =countersmodel.get_next_sequence("orders")
  cl = ordermodel.add(param, usr['email'])
  clientmodel.upd(ObjectId(param['client_id']), {'last_contact_date':param.get('l_state_date',datetime.datetime.utcnow())})
  ordr = get_order_by_id(str(param['_id']))
  return ordr

@get('/handlers/numorder/<key>')
def get_order_by_number(key):
  '''
    Получение информации о заяке по номеру
  '''
  from models import ordermodel
  userlib.check_handler_access("app","r")
  param = ordermodel.get_by({'number':int(key)})
  # проверяем, может ли текущий пользователь обновить эту заявку
  acc = userlib.get_crm_access_user_list()
  if acc and param['manager'] not in acc:
    abort(401,"Доступ запрещен")
  return orderapi.return_order(param,acc)

@get('/handlers/order/<key>')
def get_order_by_id(key):
  '''
    Получение информации о заявке по идентификатору
  '''
  from models import ordermodel
  userlib.check_handler_access("app","r")
  param = ordermodel.get(key)
  # проверяем, может ли текущий пользователь обновить эту заявку
  acc = userlib.get_crm_access_user_list()
  if acc and param['manager'] not in acc:
    abort(401,"Доступ запрещен")
  ordr = orderapi.return_order(param,acc)
  result = JSONEncoder().encode(ordr)
  return result

@get('/handlers/order_list/<key_list>')
def get_order_list_by_id(key_list):
  '''
    получение списка заявок по идентификаторам. идентификаторы перечисляются через запятую
  '''
  from models import ordermodel
  userlib.check_handler_access("app","r")

  ids = [ObjectId(i) for i in key_list.split(',')]

  orders = ordermodel.get_list({'_id':{'$in':ids}},None)
  # проверяем, может ли текущий пользователь обновить эту заявку
  acc = userlib.get_crm_access_user_list()
  if acc and param['manager'] not in acc:
    abort(401,"Доступ запрещен")
  res = []
  for o in orders:
    res.append(orderapi.return_order(o,acc))
  return JSONEncoder().encode(res)

@get('/handlers/checkorder/<ctype>/<key>/<cond>')
def check_order(ctype, key, cond):
  '''
     Проверка заявки на ошибки
  '''
  userlib.check_handler_access("app","r")
  param = orderapi.ch_ordr(ctype, key, cond)
  if param:
    return {'result': 'yes'}
  else:
    return {'result': 'no'}

@get('/handlers/checkorderok/<ctype>/<key>')
def checkorderok(ctype, key):
  '''
    Обработка успешной проверки заявки
  '''
  from models import ordermodel, msgmodel
  userlib.check_handler_access("app","r")
  param = orderapi.ch_ordr(ctype, key)
  if not param and ctype=='de':
    msgmodel.update({'type':ctype, 'order_id': ObjectId(key)}, {'closed_by_manager':True})
    return {'result': 'yes'}
  else:
    if param:
      msgmodel.update({'type':ctype, 'order_id': ObjectId(key)}, {'enabled':False,'closed_by_manager':False})
      usr = userlib.get_cur_user()
      ordermodel.close_err_history(ObjectId(key), ctype, usr['email'])
      return {'result': 'yes'}
    else:
      return {'result': 'no'}

@post('/handlers/get_user_or_group')
def get_user_or_group():
  '''
    Получение информации о клиенте
  '''
  from models import   clientmodel
  userlib.check_handler_access("app","r")
  etype = request.forms.get('type')
  eid = request.forms.get('id')
  if etype=='gr':
    return {'type':'gr', 'id': 'gr_'+eid, 'name':eid}
  else:
    cl = clientmodel.get(eid)
    if cl:
      return {'type':'cl', 'id': str(cl['_id']), 'name':cl['name']}
  return {'type':'err'}

itogo_lock = Lock()
@get('/handlers/itogo/')
def get_itogo():
  '''
    Получение итоговой статистики по всем заявкам
  '''
  userlib.check_handler_access("app","r")
  try:
    result = None
    with itogo_lock:
      result = orderapi.get_itogo(request.query.decode(), userlib.get_cur_user())
    return json.dumps(result)
  except Exception, exc:
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@get('/handlers/manager/')
def get_manager_itogo():
  '''
    Подсчет ИТОГО по менеджеру
  '''
  userlib.check_handler_access("app","r")
  try:
    result = orderapi.get_manager_itogo(request.query.decode(), userlib.get_cur_user())
    return json.dumps(result)
  except Exception, exc:
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@post('/handlers/similar')
def similar():
  '''
    Поиск похожих заявок
  '''
  userlib.check_handler_access("app","r")
  return {'status': 'ok', 'data':orderapi.similar(request.json)}

@post('/handlers/favorite')
def favorite():
  from models import ordermodel
  userlib.check_handler_access("app","r")
  id = request.forms.get('id')
  fav = request.forms.get('favorite')
  try:
    ordermodel.upd(ObjectId(id), {'favorite':fav})
  except Exception, e:
    return {'status':'error'}
  return {'status': 'ok'}

@post('/handlers/public')
def public():
  from models import ordermodel
  userlib.check_handler_access("app","r")
  order_id = request.forms.get('id')
  try:
    ordermodel.upd(ObjectId(order_id),{'state':'published'})
  except Exception, e:
    return {'status':'error'}
  return {'status': 'ok'}

@post('/handlers/send_error')
def send_error():
  from models import usermodel
  from helpers import mailer
  userlib.check_handler_access("app","r")
  msg = request.forms.get('msg')
  usr = userlib.get_cur_user()
  title = u'[CRM] Ошибка сервера'
  body = u'Ошибка от пользователя {}<br>'.format(usr['email'])+msg
  try:
    # send
    notice_users = usermodel.get_list({'admin':'admin', 'stat': {'$ne':'disabled' }},{'email':1,'fio':1})
    mailer.send(title, body, notice_users, True, usr['email'])
  except Exception, e:
    return {'status':'error'}
  return {'status': 'ok'}

@post('/handlers/test_site')
def test_site():
  '''
    Проверка на существование сайта
  '''
  userlib.check_handler_access("app","r")
  try:
    result = orderapi.test_site(request.forms.get('site'))
    if result:
      return {'status': 'ok'}
    return {'status': 'error'}
  except Exception, exc:
    return {'status': 'error', 'detail': str(exc)}

@post('/handlers/call')
def call():
  '''
    Звонок от менеджера клиенту
  '''
  userlib.check_handler_access("app","r")
  import requests
  try:
    phone = request.forms.get('phone')
    manager_phone = request.forms.get('manager_phone')
    result = 'error'
    r = requests.get('http://88.198.197.122:8089/ascrm/rawman?action=login&username=ascrm&secret=29ULLB83FM4DJkSf58Jq')
    if (r.text.find('error') != -1):
      return {'status': 'error', 'msg': r.text}
    r1 = requests.get('http://88.198.197.122:8089/ascrm/rawman?Action=Originate&Channel=SIP/'+manager_phone+'&Context=DLPN_Moscow&Exten='+phone+'&Priority=1&Context=CallingRule_Moscow_all_8X&Async=true', cookies=r.cookies)
    if (r1.text.find('error') != -1):
      return {'status': 'error', 'msg': r1.text}
    else:
      return {'status': 'ok'}
  except Exception, exc:
    return {'status': 'error'}
  return {'status': 'ok'}


@get('/handlers/orders/')
def get_orders():
  '''
    Получение списка заявок
  '''
  userlib.check_handler_access("app","r")
  ordrs = orderapi.get_orders(request.query.decode())
  return JSONEncoder().encode(ordrs)

@get('/handlers/msg')
def get_msg():
  '''
    Получение сообщений для менеджеров ЦРМ
  '''
  usr = userlib.get_cur_user()
  msgs = []
  if usr!=None:
    msgs = orderapi.get_msg(usr)
  return JSONEncoder().encode({'mess':msgs})

@get('/handlers/crm/redefine_google_documetns_owners/<number>')
def redefine_google_documetns_owners(number):
  '''
    Переопределение прав на каталоги документов google
    number = 'all' или номер конкретной заявки
  '''
  userlib.check_handler_access("app","r")
  try:
    if not config.use_worker:
      orderapi.redefine_google_documetns_owners(number)
    else:
      config.qu_default.enqueue_call(func=orderapi.redefine_google_documetns_owners, args=(number,))
  except Exception, exc:
    print('------ERROR redefine_google_documetns_owners. {0}'.format(str(exc)))

@post('/handlers/transfer/order')
def transfer_order():
  '''
    Изменение менеждера у заявки
    Также менеджер меняется у клиента который был привязан к заявке
  '''
  userlib.check_handler_access("ordertransfer","w")
  try:
    result = orderapi.transfer_order(request.json)
    return routine.JSONEncoder().encode({'status': 'ok', 'result':result})
  except Exception, exc:
    print(str(exc))
    return routine.JSONEncoder().encode({'status': 'error', 'msg':str(exc)})

@get('/handlers/crm/remove_domain_permissions_from_crm_folder/<folder_id>')
def remove_domain_permissions_from_crm_folder(folder_id):
  '''
    Удаление доменной роли с каталога
    /handlers/crm/remove_domain_permissions_from_crm_folder/0B3_z3O8j2V1Dc0Z6Ui1CTkpGZkk
  '''
  userlib.check_handler_access('app','r')
  result = ''
  try:
    from helpers.google_api import drive
    service = drive.get_service(config.google_api_user)
    # получение всех подкаталогов в указанной дирректории
    folders = drive.get_folder_list(service, folder_id)
    # собрать все каталоги в подкаталогах
    if folders:
      for folder in folders:
        try:
          subfolders = drive.get_folder_list(service, folder['id'])
          if subfolders:
            for sfolder in subfolders:
              try:
                permissions = drive.retrieve_permissions(service, sfolder['id'])
                if permissions:
                  for f_permission in permissions:
                    if f_permission['type'] == 'domain':
                      try:
                        drive.remove_permission(service, sfolder['id'], f_permission['id'])
                      except Exception, exc3:
                        print('Exc3: {0}'.format(str(exc3)))
                        result+= 'Exc3: {0}'.format(str(exc3))
                        pass
              except Exception, exc2:
                print('Exc2: {0}'.format(str(exc2)))
                result+= 'Exc2: {0}'.format(str(exc2))
                pass
        except Exception, exc1:
          print('Exc1:  {0}'.format(str(exc1)))
          result+= 'Exc1:  {0}'.format(str(exc1))
          pass
        print('{0} - OK'.format(str(folder['title']) ))
    return result if len(result)>0 else 'OK'
  except Exception, exc:
    print('------ERROR remove_domain_permissions_from_crm_folder. {0}'.format(str(exc)))
    return '------ERROR remove_domain_permissions_from_crm_folder. {0}'.format(str(exc))

@get('/handlers/crm/get_google_documents_struct/<order_numbers>')
def get_google_documents_struct(order_numbers):
  '''
    Для всех заявок проверяется наличие документов на Google Disk.
    Если документы есть, то берется вся структура папкок и документов.
    На основании собранных данных строится виртуальная структура данных
    и сохраняется в БД на уровне заявки.
  '''
  userlib.check_handler_access('app','r')
  try:
    orderapi.get_google_documents_struct(
      None if not order_numbers or order_numbers == 'all' else order_numbers.split(';')
    )

    print('OK')
    return 'OK'
  except Exception, exc:
    print('------ERROR get_real_documents_struct. {0}'.format(str(exc)))
    return '------ERROR get_real_documents_struct. {0}'.format(str(exc))

@get('/handlers/crm/update_all_activity')
def update_all_activity():
  '''
    #1782 (Активность Общая (АО) и Активность Значимая (АЗ) для каждой заявк)
    Ведется подсчет по всем заявкам
  '''
  userlib.check_handler_access("app","w")
  from models import ordermodel
  try:
    print('Start orders activity update')
    ordermodel.update_orders_activity()
    print('Finish orders activity update')
    return 'COMPLETED'
  except Exception, exc:
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@get('/handlers/crm/update_activity/<order_numbers>')
def update_activity(order_numbers):
  '''
    #1782 (Активность Общая (АО) и Активность Значимая (АЗ) для указанных заявок
    order_number: id1;id2;id3;id
  '''
  userlib.check_handler_access("app","w")
  from models import ordermodel
  try:
    print('Start orders activity update')
    ordermodel.update_orders_activity(None if not order_numbers or order_numbers == 'all' else order_numbers.split(';'))
    print('Finish orders activity update')
    return 'COMPLETED'
  except Exception, exc:
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})
