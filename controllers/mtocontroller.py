#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import get, template
import config
from libraries import userlib
from routine import  JSONEncoder

@get('/mto')
@get('/planecalculation')
def mto():
  '''
    Новая форма МТО
  '''
  userlib.check_page_access('planecalculation','r')
  from models import sectormodel, materialsgroupmodel, usermodel
  from controllers import clientcontroller
  from apis.contract import contractapi
  from apis.workorder import workorderapi
  # get sectors list
  arrDataSectors = sectormodel.get_all_only_sectors()
  dataSectors = {}
  for row in arrDataSectors:
    if row['is_active']==1:
      dataSectors[str(row['_id'])] = row;
  # текущий пользователь
  usr = userlib.get_cur_user()
  # детализация по текущему пользователю
  user_detail_info = usermodel.get_by_id(usr['_id'])
  # настройки страницы
  pages_settings = user_detail_info.get('pages_settings',{})
   # получение информации о предсохраненных пользовательских насторйках для МТО
  user_filters_info = pages_settings.get('mto',{
    'checked': False,
    'filters': {}
  })
  # get materials
  materials_groups = materialsgroupmodel.get_all_only_groups()

  return template(
    'frontend/mto/templates/index',
    current_user=userlib.get_cur_user(),
    version = config.VERSION,
    menu=userlib.get_menu(),
    #contract_numbers = contractapi.get_all_contract_numbers_for_filters(u'Калуга'),
    contract_numbers = contractapi.get_all_contract_numbers_for_filters(None, False),
    # order_numbers = [ { 'number': row } for row in workorderapi.get_all_orders_by_active_workorders()],
    order_numbers =  [ { 'number': row } for row in contractapi.get_all_orders_with_units_for_filters()],
    sectors = JSONEncoder().encode(dataSectors.values()),
    sector_types = sectormodel.get_all_sector_types(),
    materials_groups=materials_groups,
    users = clientcontroller.get_users(),
    user_filters_info = JSONEncoder().encode(user_filters_info), # информация о фильтрах, которые сохранил
  )
