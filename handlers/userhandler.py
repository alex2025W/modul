#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route, get, post, put, request, error, abort, response, debug
import json
import urllib
from bson.objectid import ObjectId
import config

from models import usermodel
from libraries import userlib
import routine

@get('/handlers/user')
def user_get_list():
  userlib.check_handler_access('users','r')
  return json.dumps(usermodel.get_all())


@get('/handlers/user/<user_id>')
def user_get(user_id):
  userlib.check_handler_access('users','r')
  return json.dumps(usermodel.get_by_id(user_id))


@put('/handlers/user/')
def user_add_new():
  userlib.check_handler_access('users','w')
  return json.dumps(usermodel.add(request.json))

@put('/handlers/user/<user_id>')
def edit_user(user_id):
  userlib.check_handler_access('users','w')
  return json.dumps(usermodel.update(user_id,request.json))

@post('/handlers/user_save/<user_id>')
def user_save_data(user_id):
  userlib.check_handler_access('users','w')
  usermodel.update_admin(user_id,request.json["admin"],request.json["stat"])
  return "{}"

@get('/handlers/users/search/')
def get_users():
  userlib.check_handler_access('users','r')
  q = request.query['q'].decode('utf-8').lower()
  ls = usermodel.get_all()
  res = []
  for cl in ls:
    if q in (cl.get('fio','') + cl.get('email','')).lower():
      #name = '{0} ({1})'.format(cl.get('fio'), cl.get('email'))
      name = cl.get('fio','') if cl.get('fio','') else cl.get('email')
      res.append({'id':cl['id'],'name':name, 'fio': cl.get('fio'), 'email': cl.get('email') })
      if len(res)>20:
        break
  return routine.JSONEncoder().encode(res)

@post('/handlers/user/save_page_settings/')
def user_save_data():
  try:
    # ключ страницы для которой сохраняются настройки
    page = request.json['page']
    # текущий пользователь
    usr = userlib.get_cur_user()
    # детализация по текущему пользователю
    user_detail_info = usermodel.get_by_id(usr['_id'])
    # старые настройки страницы
    pages_settings = user_detail_info.get('pages_settings',{})
    pages_settings[page] = {
      'page': page,
      'checked': request.json["checked"],
      'filters': request.json["filters"]
    }
    # обновить данные в БД
    usermodel.update_user({'_id': usr['_id']}, {'$set':{'pages_settings': pages_settings}})
    return routine.JSONEncoder().encode({'status': 'ok'})
  except Exception,exc:
    excType = exc.__class__.__name__
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})
