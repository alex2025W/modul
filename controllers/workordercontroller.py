#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route, view, get, post, put, request, template
import urllib
import config
from libraries import userlib
from models import  planshiftreason, sectormodel, brigademodel, usermodel
import json
from routine import  JSONEncoder

@route('/workorderdate')
@route('/workorders')
def get_dates():
  '''
    Форма плановых дат нарядов
  '''
  userlib.check_page_access('workorderdate','r')
  from controllers import clientcontroller
  from models import sectormodel
  sector_types = sectormodel.get_all_sector_types()
  works = sectormodel.get_all_sectors_and_works()
  sectors = sectormodel.get_all_only_sectors()
  sectors.sort(key=lambda x:(x.get('type'), x.get('name')))
  # группировка участков по типу
  grouped_sectors = {}
  for row in sectors:
    if row.get('type') not in grouped_sectors:
      grouped_sectors[row.get('type')] = {'info':{'name': row.get('type')}, 'items':[]}
    grouped_sectors[row.get('type')]['items'].append(row)
  sectors = grouped_sectors.values()
  #sectors.sort(key=lambda x:(x['info']['name']))

  ## получение списка пользователей с ролью = "рабочий"
  all_workers = usermodel.get_list({
      'roles.role': str(usermodel.SYSTEM_ROLES['SYS_WORKER']),
      'stat': {'$ne':'disabled' }
    },
    {
      'email':1,
      'fio':1
    }
  )

  return template('frontend/work_order/templates/index',
    current_user=userlib.get_cur_user(),
    version = config.VERSION,
    plans=planshiftreason.get_all_active(),
    menu=userlib.get_menu(),
    sector_types = sector_types,
    sectors = sectors,
    planshiftreason_system_objects = JSONEncoder().encode(planshiftreason.SYSTEM_OBJECTS),
    works=JSONEncoder().encode(works),
    users = clientcontroller.get_users(),
    all_workers = JSONEncoder().encode(all_workers),
  )

@route('/workorder/cancel_shift')
@route('/workorderdate/cancel_shift')
def cancel_shift_page():
  '''
    Форма отмены корректировки
  '''
  userlib.check_page_access('workorderdate','r')
  params = request.query.decode()
  return template('frontend/work_order_cancel_shift/templates/index',
    current_user=userlib.get_cur_user(),
    version = config.VERSION,
    plans=planshiftreason.get_all_active(),
    menu=userlib.get_menu(),
    params = params
  )

@route('/newworkorder')
def get_new_workorder():
  '''
    Новая форма нарядов с привязкой к ЭСУД
  '''
  userlib.check_page_access('newworkorder','r')
  return template('views/newworkorder', current_user=userlib.get_cur_user(), version = config.VERSION, plans=planshiftreason.get_all_active(), menu=userlib.get_menu() , planshiftreason_system_objects = JSONEncoder().encode(planshiftreason.SYSTEM_OBJECTS))
