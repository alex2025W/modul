#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route, view, get, post, put, request, error, abort, response, debug, static_file, template, redirect
import urllib
import config
from models import usermodel
from models import clientmodel
from models import dirmodel
from libraries import userlib

from routine import JSONEncoder
def get_users():
  data = []
  acc = userlib.get_crm_access_user_list()
  args = None
  if acc:
    args = {'email':{'$in':acc}}
  users = usermodel.get_all(args)
  for u in users:
    data.append(u)
  return data

def get_clients():
  # вводим ограничения для пользователей с расширенными правами доступа
  acc = userlib.get_crm_access_user_list()
  args = None
  if acc:
    args = {'manager':{'$in':acc}}
  print args
  clients = clientmodel.get_all_by(args)
  data = []
  for dr in clients:
    if 'inn' not in dr:
      dr['inn'] = ''
    data.append(dr)
  return data

def get_dictionary(all):
  dirs = dirmodel.get_all(all)
  data = []
  for dr in dirs:
    if 'price' not in dr:
      dr['price'] = 'disabled'
    if 'structure' not in dr:
      dr['structure'] = 'disabled'
    data.append(dr)
  return data

@route('/incoming')
def incoming():
  userlib.check_page_access("incoming","r")
  return template('views/incoming', current_user=userlib.get_cur_user(), version = config.VERSION, dicts=get_dictionary(False), users = get_users(), menu=userlib.get_menu())


