#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import error, abort, redirect, response, request
from urllib import urlencode
import json
import os
import pymongo
import bson
from pymongo import MongoClient
import requests
from typing import Union

from models import rolemodel, pagemodel
import config
import hashlib
import hmac
import routine
from oauth2client.client import OAuth2WebServerFlow,OAuth2Credentials
from oauth2client.file import Storage
import httplib2
from traceback import print_exc
from bson.objectid import ObjectId


db = config.db
# google oauth
des_password = "fea1196bc1fed3c5"

'''Идентификаторы системных ролей'''
SYSTEM_ROLES = {
  'SYS_WORKER':ObjectId("54e21cb6c53135000362ac32"),  # Системная роль - рабочий
  }

# авторизация гугл (разрешаем доступ к профилю, емейлу и календарю)
flow = OAuth2WebServerFlow(
  client_id=config.google_api_config['client_id'],
  client_secret=config.google_api_config['client_secret'],
  scope=config.google_api_config['scope'],
  redirect_uri=config.google_api_config['redirect_uri'],
  access_type='offline',
  #approval_prompt='force',
  prompt='consent'
)

def authorization_url():
  global flow
  return flow.step1_get_authorize_url()

def set_user_credentials(authorization_code):
  global flow
  credentials = flow.step2_exchange(authorization_code)
  email = credentials.id_token['email']

  update_user({'email':email},{'$set':{'credentials': credentials.to_json()}})

  #storage = Storage('credentials-%s.dat' % (email))
  #storage.put(credentials)
  return email

def get_user_credentials(email):
  #storage = Storage('credentials-%s.dat' % (email))
  #return storage.get()
  try:
    dt = db.users.find_one({'email':email},{'credentials':1})
    if not dt.get('credentials'):
      return None
    cr = OAuth2Credentials.from_json(dt['credentials'])
    return cr
  except Exception, e:
    print e
    return None

def refresh_user_credentials(email):
  cr = get_user_credentials(email)
  if cr:
    cr.refresh(httplib2.Http())
    update_user({'email':email},{'$set':{'credentials': cr.to_json()}})
    return cr
  return False

def remove_user_credentials(email):
  try:
    update_user({'email':email},{'$set':{'credentials': None}})
  except Exception, e:
    pass

def get_env():
  env = {'forwarded_for':'', 'remote':'', 'agent':''}
  try:
    env['forwarded_for'] = request.environ.get('HTTP_X_FORWARDED_FOR').split(',')[-1].strip()
  except Exception, e:
    pass
  try:
    env['remote'] = request.environ.get('REMOTE_ADDR')
  except Exception, e:
    pass
  try:
    env['agent'] = request.environ.get('HTTP_USER_AGENT')
  except Exception, e:
    pass
  return env

#########################

def get(email):
  userdb = db.users
  data = {'email':email, 'stat':'enabled'}
  try:
    user = userdb.find_one(data)
    return user
  except Exception, exc:
    excType = exc.__class__.__name__
    print_exc()
    abort(400,"server_error")

def get_list(args, fields):
  """ get users by filter """
  try:
    users = []
    for us in db.users.find(args, fields):
      users.append(us)
    return users
  except Exception, exc:
    excType = exc.__class__.__name__
    print_exc()
    abort(400,"server_error")

def login_with_password(email, password):
  from libraries import userlib
  # поиск пользователя в БД
  try:
    user = db.users.find_one({'email':email})
    if user:
      # проверяю пароль и ключ блокировки
      psw = _hash(email,password)
      if 'password' in user and psw==user['password'] and user['stat']=='enabled':
        userlib.set_cookie(email,psw,'psw')
        # должны вернуть страницу по умолчанию
        if 'defaultpage' in user and user['defaultpage']!="":
          return user['defaultpage']
        else:
          return ""
  except pymongo.errors.PyMongoError as e:
    pass
  return None

def login_by_gmail(email):
  from libraries import userlib
  try:
    #проверяем, если такой пользователь в БД
    user = db.users.find_one({'email':email})
    if user:
      #ключ блокировки
      if user['stat']=='enabled':
        userlib.set_cookie(email,'',"gmail")
        # должны вернуть страницу по умолчанию
        if 'defaultpage' in user and user['defaultpage']!="":
          return user['defaultpage']
        else:
          return ""
  except pymongo.errors.OperationFailure:
    pass
  except pymongo.errors.PyMongoError as e:
    pass
  abort(403,"Forbidden")

def get_by_id(user_id):
  try:
    # INDEX email
    us = db.users.find_one({"_id":bson.objectid.ObjectId(user_id)})
    us["id"] = str(us.pop("_id"))
    #us['roles']=us['roles'].keys()
    roles = []
    if 'roles' in us:
      for r in us['roles']:
        roles.append(r['role'])
    us['roles'] = roles
    return us
  except Exception, exc:
    excType = exc.__class__.__name__
    print_exc()
    abort(400,"server_error")

def get_all(args=None):
  """Get all users"""
  userdb = db.users
  try:
    # INDEX email
    users = []
    for us in userdb.find(args,{'_id':1, 'fio':1,'email':1, 'admin':1, 'table':1, 'stat':1, 'roles':1, 'inner_phone':1, 'pages':1}).sort([('fio',1),('email',1)]):

      us["id"] = str(us.pop("_id"))
      users.append(us)
    return users
  except Exception, exc:
    excType = exc.__class__.__name__
    print_exc()
    abort(400,"server_error")

# кусок кода утащенный с crok для упаковки
def _hash(username, pwd):
  return  hmac.new(des_password,username+pwd,hashlib.sha1).hexdigest()


# сформировать запрос на обновление/добавление данных в таблицу
def _makePackage(data):
  # сначала вытягиваю роли для этого пользователя
  roles = rolemodel.get_by_list(data["roles"])
  res = {
    'fio':data['fio'],
    'email':data['email'],
    'table':data['table'],
    'defaultpage':data['defaultpage'],
    'admin':data['admin'],
    'stat':data['stat'],
    'roles':roles,
    'inner_phone': data.get('inner_phone','')
  }
  if data['password']!='':
    res['password'] = _hash(data['email'],data['password'])
  return res


def add(data):
  res = _makePackage(data)
  try:
     db.users.insert(res)
     rolemodel.update_users(res["_id"],data["roles"])
     return {'id':str(res["_id"])}
  except pymongo.errors.OperationFailure:
    abort(400,"Пользователь с таким Email уже существует")
  except Exception, exc:
    excType = exc.__class__.__name__
    print_exc()
    abort(400,"server_error")

def update(id, data):
  res = _makePackage(data)
  try:
    db.users.update({'_id': bson.objectid.ObjectId(id)}, {'$set':res})
    rolemodel.update_users(id,data["roles"])
    return {'id':id}
  except Exception, exc:
    excType = exc.__class__.__name__
    print_exc()
    abort(400,"server_error")

def update_user(filter,data):
  try:
    return db.users.update(filter, data)
  except Exception, exc:
    excType = exc.__class__.__name__
    print_exc()
    abort(400,"server_error")

def update_admin(id,admin, stat):
  savedt = {
    'admin':admin,
    'stat':stat
  }
  try:
    res = db.users.update({'_id': bson.objectid.ObjectId(id)}, {'$set':savedt})
  except pymongo.errors.PyMongoError as e:
    abort(400,"server_error")
  return res


# обновить доступы для списка пользователей ( в users_list храняться только пользователи, которым теперь доступна указанная роль)
def update_roles(role_id, users_list, access):
  # сначала удаляем роль там, где не надо
  db.users.update({'roles.role':str(role_id)},{'$pull': { 'roles': {'role':str(role_id)} } }, multi=True )
  # затем добавляем туда, куда надо
  ulistId = []
  for el in users_list:
    ulistId.append(bson.objectid.ObjectId(el))
  print access
  db.users.update({"_id":{'$in':ulistId}},{'$push':{'roles':{'role':str(role_id),'pages':access}}}, multi=True)


def check_role_credentials(email, credentials):
  result = 0
  user = get(email)
  for role in user['roles']:
    part = role
    for key in credentials:
      if part and key in part:
        part = part[key]
    result = result or part
  return result


def google_drive_sales_folder_id_set(email, folder_id):
    # type: (str, str) -> bool
    """

    :param email:
    :param folder_id:
    :return:
    """
    user = get(email)
    user['sales_folder_id'] = folder_id

    result = db.users.update_one({
        '_id': user['_id']
    }, {
        '$set': user
    })
    if result.acknowledged:
        return True
    else:
        return False


def google_drive_sales_folder_id_get(email):
    # type: (str) -> Union[None, str]
    """

    :param email:
    :return:
    """
    result = db.users.find_one({
        'email': email
    })

    return result.get('sales_folder_id', None)
