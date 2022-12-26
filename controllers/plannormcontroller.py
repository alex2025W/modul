#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route, template
import config
from libraries import userlib
from models import materialsgroupmodel
from models import sectormodel
from routine import JSONEncoder

@route('/plannorm')
@route('/orderspecification')
def get_data():
  userlib.check_page_access('plannorm','r')
  return template(
    'frontend/plannorm/templates/index',
    current_user=userlib.get_cur_user(),
    version = config.VERSION,
    menu=userlib.get_menu(),
    sectors = JSONEncoder().encode(sectormodel.get_all_sectors_and_works()),
    all_users=userlib.get_crm_user_list() ,
    material_groups = JSONEncoder().encode(sorted(materialsgroupmodel.get_all(),
    key=lambda a:a.get('name','')))
  )

@route('/plannormblank')
@route('/specificationorderblank')
def get_blanks():
  userlib.check_page_access('plannormblank','r')
  return template(
    'frontend/plannormblank/templates/index',
    current_user = userlib.get_cur_user(),
    version = config.VERSION,
    menu = userlib.get_menu()
  )

@route('/plannorm2')
@route('/orderspecification2')
def orderspecification2():
  userlib.check_page_access('plannorm','r')
  from apis.contract import contractapi
  from apis.crm import orderapi
  from apis.plannorms import plannormsapi_v2

  contract_order_numbers = contractapi.get_all_orders_for_filters()
  crm_order_numbers = orderapi.get_all_orders_for_filters()
  templates = plannormsapi_v2.get_all_templates()
  templates.sort(key = lambda x: (x['code']))
  specification_numbers = [str(int(row['code'])) for row in templates]

  return template(
    'frontend/plannorm_v2/templates/index',
    current_user = userlib.get_cur_user(),
    version = config.VERSION,
    menu = userlib.get_menu(),
    sector = JSONEncoder().encode(sectormodel.get(sectormodel.SPECIFICATION_SECTOR_ID)),
    all_users = userlib.get_crm_user_list(),
    templates = JSONEncoder().encode(templates),
    search_numbers = JSONEncoder().encode({
      'contract_orders': contract_order_numbers,
      'crm_orders': crm_order_numbers,
      'specification_numbers': specification_numbers
    })
  )
