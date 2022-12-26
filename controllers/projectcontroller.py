#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route, template
import config
from libraries import userlib

@route('/projects')
@route('/projects/')
def get_projects():
  userlib.check_page_access('client_projects','r')
  return template(
    'frontend/crm_projects/templates/index',
    current_user=userlib.get_cur_user(),
    version = config.VERSION,
    menu=userlib.get_menu()
  )
