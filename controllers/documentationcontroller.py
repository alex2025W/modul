#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route, template
import config
from libraries import userlib
from routine import  JSONEncoder
from models import sectormodel, contractmodel

@route('/projectdocumentation')
def projectdocumentation():
  userlib.check_page_access('projectdocumentation','r')
  google_api_config = JSONEncoder().encode({
    'client_id': config.google_api_config['client_id'],
    'scope': config.google_api_config['scope']
  })
  return template(
    'frontend/project_documentation/templates/index',
    current_user=userlib.get_cur_user(),
    version = config.VERSION,
    menu=userlib.get_menu(),
    orders=JSONEncoder().encode(contractmodel.get_all_opened_orders()),
    sectors=JSONEncoder().encode(sectormodel.get_by({'type':u"Проектные работы"}, {"name":1})),
    google_api_config=google_api_config,
    all_users=userlib.get_crm_user_list()
  )
