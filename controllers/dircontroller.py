#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route, template
import config
from models import dirmodel
from libraries import userlib

def get_dictionary(all):
  dirs = dirmodel.get_all(all)
  data = []
  for dr in dirs:
    if 'price' not in dr:
      dr['price'] = 'disabled'
    if 'structure' not in dr:
      dr['structure'] = 'disabled'
    if 'days' not in dr:
      dr['days'] = 0
    data.append(dr)
  return data

@route('/dir')
def dir():
  userlib.check_page_access("dir","r")
  return template('frontend/directory/templates/index',
    current_user=userlib.get_cur_user(),
    version = config.VERSION,
    dicts = get_dictionary(True),
    menu=userlib.get_menu(),
    OrderConditions=dirmodel.OrderConditions
  )

