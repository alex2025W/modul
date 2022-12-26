#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route, view, get, post, put, request, template
import urllib
import config
from libraries import userlib
from models import  planshiftreason, sectormodel, brigademodel, usermodel, dirmodel
import json
from routine import  JSONEncoder

@route('/joblog')
def joblog():
  '''
    Журнал работ
  '''
  from apis.contract import contractapi
  from apis.workorder import workorderapi
  userlib.check_page_access('joblog','r')
  # get sectors list
  arrDataSectors = sectormodel.get_all_only_sectors()
  dataSectors = {}
  for row in arrDataSectors:
    if row['is_active']==1:
      dataSectors[str(row['_id'])] = row;
  # get brigades list
  arrDataBrigades = brigademodel.get_all()
  # получение выходных дней из календаря
  weekends = (config.db.weekends.find_one({}, {'weekends': 1}) or {}).get("weekends", [])
  # получение списка пользователей с ролью = "рабочий"
  all_workers = usermodel.get_list({
      'roles.role': str(usermodel.SYSTEM_ROLES['SYS_WORKER']),
      'stat': {'$ne':'disabled' }
    },
    {
      'email':1,
      'fio':1
    }
  )
  # текущий пользователь
  usr = userlib.get_cur_user()
  # детализация по текущему пользователю
  user_detail_info = usermodel.get_by_id(usr['_id'])
  # старые настройки страницы
  pages_settings = user_detail_info.get('pages_settings',{})
  # получение информации о предсохраненных пользовательских насторйках для журнала
  user_filters_info = pages_settings.get('joblog',{
    'checked': False,
    'filters': {}
  })

  return template(
    'frontend/joblog/templates/index',
    current_user=userlib.get_cur_user(),
    version = config.VERSION,
    menu=userlib.get_menu(),
    sectors = JSONEncoder().encode(dataSectors.values()),
    all_workers = JSONEncoder().encode(all_workers),
    teams = JSONEncoder().encode(arrDataBrigades),
    planshiftreason_system_objects = JSONEncoder().encode(planshiftreason.SYSTEM_OBJECTS),
    weekends = JSONEncoder().encode(weekends),
    order_numbers = workorderapi.get_all_orders_by_active_workorders(),
    sector_types = sectormodel.get_all_sector_types(),
    user_filters_info = JSONEncoder().encode(user_filters_info), # информация о фильтрах, которые сохранил
    time_sheet_reasons = JSONEncoder().encode([x for x in dirmodel.get_list_by({'type':20, 'stat':'enabled'},{'number':1, 'name':1, 'note':1 })])
  )

@route('/joblog/statistic')
def joblog_statistic():
  '''
    Журнал работ. Статистика
  '''
  from apis.contract import contractapi
  from apis.workorder import workorderapi
  userlib.check_page_access('joblog_statistic','r')
  sectors = sectormodel.get_all_only_sectors()
  sectors.sort(key=lambda x:(x.get('type'), x.get('name')))
  # группировка участков по типу
  grouped_sectors = {}
  for row in sectors:
    if row.get('type') not in grouped_sectors:
      grouped_sectors[row.get('type')] = {'info':{'name': row.get('type')}, 'items':[]}
    grouped_sectors[row.get('type')]['items'].append(row)
  sectors = grouped_sectors.values()

  # текущий пользователь
  usr = userlib.get_cur_user()
  # детализация по текущему пользователю
  user_detail_info = usermodel.get_by_id(usr['_id'])
  # старые настройки страницы
  pages_settings = user_detail_info.get('pages_settings',{})
  # получение информации о предсохраненных пользовательских насторйках для журнала
  user_filters_info = pages_settings.get('joblog_statistic',{
    'checked': False,
    'filters': {}
  })

  return template(
    'frontend/joblog_statistic/templates/index',
    current_user = usr,
    version = config.VERSION,
    menu = userlib.get_menu(),
    sectors = sectors,
    order_numbers = workorderapi.get_all_orders_by_active_workorders(),
    sector_types = sectormodel.get_all_sector_types(),
    user_filters_info = JSONEncoder().encode(user_filters_info), # информация о фильтрах, которые сохранил
  )


@route('/newjoblog')
def get_new_jobtickets():
  '''
    Новый журнал работ c привязкой к ЭСУД
  '''
  userlib.check_page_access('newjoblog','r')
  # get brigades list
  arrDataBrigades = brigademodel.get_all()
  # получение выходных дней из календаря
  weekends = (config.db.weekends.find_one({}, {'weekends': 1}) or {}).get("weekends", [])
  # получение списка пользователей с ролью = "рабочий"
  all_workers = usermodel.get_list({'roles.role': str(usermodel.SYSTEM_ROLES['SYS_WORKER']), 'stat': {'$ne':'disabled' } },{'email':1,'fio':1})
  # получение участков
  dataSectors = {}
  return template('views/newjoblog', current_user=userlib.get_cur_user(), version = config.VERSION, menu=userlib.get_menu(), sectors = JSONEncoder().encode(dataSectors),  all_workers = JSONEncoder().encode(all_workers), teams = JSONEncoder().encode(arrDataBrigades), planshiftreason_system_objects = JSONEncoder().encode(planshiftreason.SYSTEM_OBJECTS), weekends =  JSONEncoder().encode(weekends))
