# -*- coding: utf-8 -*-

from bottle import route, view, get, post, put, request, error, abort, response, debug, static_file, template, redirect
import urllib
import config
import clientcontroller
from models import usermodel
from models import clientmodel
from models import dirmodel
from models import ordermodel
from libraries import userlib
from bson.objectid import ObjectId
from handlers import orderhandler

@route('/google_catalogs_check_rights')
@route('/google_catalogs_check_rights/')
def google_catalogs_check_right():
  userlib.check_page_access('google_catalogs_check_right','w')
  return template('frontend/google_catalogs_check_rights/templates/index', current_user=userlib.get_cur_user(), version = config.VERSION, menu=userlib.get_menu(), users = clientcontroller.get_users())

@route('/crm_google_catalogs_rights')
@route('/crm_google_catalogs_rights/')
def crm_google_catalogs_right():
  userlib.check_page_access('crm_google_catalogs_right','w')
  return template('frontend/crm_google_catalogs_rights/templates/index', current_user=userlib.get_cur_user(), version = config.VERSION, menu=userlib.get_menu(), users = clientcontroller.get_users())

@route('/crm/transfer')
def order_transfer():
  # userlib.check_page_access('claims','r')
  return template('views/transfer', current_user=userlib.get_cur_user(), version = config.VERSION, menu=userlib.get_menu(), users = clientcontroller.get_users())

@route('/crm/<order_number>')
def order_page(order_number):
  userlib.check_page_access("app","r")
  # проверка на доступность
  acc = userlib.get_crm_access_user_list()
  param = None
  try:
    param = ordermodel.get_by({'number':int(order_number)})
  except:
    pass
  if not param:
    try:
      param = ordermodel.get_by({'_id':ObjectId(order_number)})
    except:
      pass

  if not param:
    abort(403,'Заявка не неайдена.')

  if acc and param['manager'] not in acc:
    abort(403,'Доступ запрещен')

  # добавляем условие, что заявки в режиме ожидания доступны только админу или создателю заявки
  if param.get('state','')=='wait':
    cu = userlib.get_cur_user()
    if cu['admin']!="admin" and param['manager']!=cu['email']:
      abort(403,'Доступ запрещен')

  # получение полной информации о клиенте заявки
  #client_data_info = clientmodel.get(param['client_id'])
  return template(
    'views/crm/order',
    order_number=order_number,
    order_id=str(param['_id']),
    order_client_id=str(param['client_id']),
    order_client=param['client'],
    order_state=param['state'],
    order_condition=param['condition'],
    current_user=userlib.get_cur_user(),
    version=config.VERSION,
    dicts=clientcontroller.get_dictionary(False),
    all_users=userlib.get_crm_user_list(),
    users=clientcontroller.get_users(),
    menu=userlib.get_menu(),
    orders_conditions=dirmodel.OrderConditions
  )

@route('/crm/new/client/<client_id>')
def order_page(client_id):
  userlib.check_page_access("app","r")
  param = clientmodel.get(client_id)
  # проверка на доступность
  acc = userlib.get_crm_access_user_list()
  if param['manager'] not in acc:
    abort(403,'Доступ запрещен')
  return template('views/crm/order', order_number='new', order_id='new', order_client_id=client_id, order_client=param['name'], current_user=userlib.get_cur_user(), version = config.VERSION, dicts=clientcontroller.get_dictionary(False), users = clientcontroller.get_users(), menu=userlib.get_menu())
