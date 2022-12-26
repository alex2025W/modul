#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route, template
import urllib, config
from libraries import userlib
from routine import  JSONEncoder

@route('/shift_tasks')
@route('/shift_tasks/')
def esud_shift_task():
  '''
    Страница выдачи сменных заданий на производство
  '''
  from models import productionordermodel
  usr = userlib.get_cur_user()
  result = []
  data_info = None
  userlib.check_page_access('shift_tasks','r')
  # получение выходных дней из календаря
  weekends = (config.db.weekends.find_one({}, {'weekends': 1}) or {}).get("weekends", [])
  # получение номеров заказов
  orders =productionordermodel.get_unique_orders()
  # построение страницы
  return template(
    'frontend/shift_task/templates/plan/main',
    current_user=userlib.get_cur_user(),
    version = config.VERSION,
    menu=userlib.get_menu(),
    data = None,
    system_objects = None,
    weekends =  JSONEncoder().encode(weekends),
    orders =  JSONEncoder().encode(orders)
  )

@route('/shift_task/facts')
def esud_shift_task_facts():
  '''
    Страница заполнения фактов по сменным заданиям
  '''
  from models import datamodel, specificationmodel
  from controllers import clientcontroller
  usr = userlib.get_cur_user()
  result = []
  data_info = None
  userlib.check_page_access('shift_task_facts','r')
  # построение страницы
  return template(
    'frontend/shift_task/templates/fact/main',
    current_user=userlib.get_cur_user(),
    version = config.VERSION,
    menu=userlib.get_menu(),
    users = clientcontroller.get_users(),
    data = None,
    system_objects = None
  )

