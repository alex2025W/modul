#!/usr/bin/python
# -*- coding: utf-8 -*-

import datetime
from datetime import date
from dateutil.parser import parse
from dateutil.relativedelta import *
from bson.objectid import ObjectId
from libraries import userlib
from models import countersmodel
import routine
import config
from traceback import print_exc
from copy import deepcopy,copy
from models import noticemodel

def get_all_orders_by_active_workorders():
  '''
    Получить все номера заказов из активных нарядов
  '''
  from models import workordermodel, contractmodel
  result = []
  kaluga_contracts = []
  kaluga_contracts = [
    str(row['_id']) for row in contractmodel.get_list_by(
      {
        'factory': u'Калуга',
        '$or': [{'parent_id': {'$exists': False }},{'parent_id':None},{'parent_id': ''}],
      },
      {'number' : 1}
    )
  ]

  return [
    '{0}.{1}.{2}'.format(row['contract_number'],row['production_number'],row['production_unit_number'])
    for row in workordermodel.get_all_active_orders() if str(row['contract_id']) in kaluga_contracts
  ]

def get_alias(is_contract_plan):
  '''
  алиасы для однотипных полей собственных планов и планов по договору
  '''
  alias_key = 'contract_plan' if is_contract_plan else 'self_plan'
  aliases = {
    'self_plan': {
      'date_start': 'date_start',
      'date_finish': 'date_finish',
      'date_start_with_shift': 'date_start_with_shift',
      'date_finish_with_shift': 'date_finish_with_shift',
      'depends_on':'depends_on',
      'plan_shifts': 'plan_shifts',
      'use_conditional_date':'use_conditional_date',
      'edit_conditional_date':'edit_conditional_date',
      'old_dates_info': 'old_dates_info',
      'days_count': 'days_count',
    },
    'contract_plan':{
      'date_start': 'contract_plan_date_start',
      'date_finish': 'contract_plan_date_finish',
      'date_start_with_shift': 'contract_plan_date_start_with_shift',
      'date_finish_with_shift': 'contract_plan_date_finish_with_shift',
      'depends_on':'contract_plan_depends_on',
      'plan_shifts': 'contract_plan_shifts',
      'use_conditional_date':'contract_plan_use_conditional_date',
      'old_dates_info': 'contract_plan_old_dates_info',
      'edit_conditional_date':'contract_plan_edit_conditional_date',
      'days_count': 'contract_plan_days_count',
    }
  }
  return aliases[alias_key]

def prepare_data(data):
  '''
    Подготовка данных по нарядам
  '''
  from models import workordermodel, sectormodel, contractmodel
  if len(data) == 0:
    return None

  # получение информации об участках
  arrDataSectors = sectormodel.get_all_sectors_and_works()
  dataSectors = {}
  dataWorks = {}
  for row in arrDataSectors:
    dataSectors[str(row['_id'])] = row;
    for w_row in row.get('works',[]):
      dataWorks[str(w_row['_id'])] = w_row

  contract = data[0]['contract_number']
  # получение информации о договоре
  contract_info = contractmodel.get_by({'number':routine.strToInt(contract)})
  if not contract_info:
    return None
  # доп. соглашения
  contract_info['additional_contracts'] = []
  for c in contractmodel.get_list_by({'parent_id':contract_info['_id']}):
    contract_info['additional_contracts'].append(c)
  contract_productions = {}
  for row in contract_info.get('productions',[]):
    contract_productions[str(row['_id'])] = row
  for c in contract_info.get('additional_contracts',[]):
    for row in c['productions']:
      contract_productions[str(row['_id'])] = row
  # добавление недостающих данных
  for row in data:
    row['production_name'] = contract_productions[str(row['production_id'])]['name'] if contract_productions.get(str(row['production_id'])) else row.get('production_name','') + ' - удалено'
    row['production_unit_number'] = row['production_units'][0]['unit_number']
    row['sector_name'] = dataSectors[str(row['sector_id'])]['name']
    row['sector_type'] = dataSectors[str(row['sector_id'])]['type']
    row['is_auto'] = dataSectors[str(row['sector_id'])].get('is_auto', False)
    for work_row in row['plan_work']:
      find_work = dataWorks.get(str(work_row['work_id']), None)

      work_row['sector_code'] = row['sector_code']
      work_row['sector_id'] = row['sector_id']

      work_row['name'] = (find_work or {}).get('name', 'Не найдена')
      work_row['is_auto'] = (find_work or {}).get('is_auto', False)
      if work_row['scope']==0:
        work_row['scope'] = find_work.get('default_value',0)
      try:
        work_row['date_start'] = work_row['date_start'].strftime('%d.%m.%Y')
        work_row['date_start_with_shift'] = work_row['date_start_with_shift'].strftime('%d.%m.%Y')
      except Exception, e:
        pass
      try:
        work_row['date_finish'] = work_row['date_finish'].strftime('%d.%m.%Y')
        work_row['date_finish_with_shift'] = work_row['date_finish_with_shift'].strftime('%d.%m.%Y')
      except Exception, e:
        pass
      #------
      try:
        work_row['contract_plan_date_start'] = work_row['contract_plan_date_start'].strftime('%d.%m.%Y')
        work_row['contract_plan_date_start_with_shift'] = work_row['contract_plan_date_start_with_shift'].strftime('%d.%m.%Y')
      except Exception, e:
        pass
      try:
        work_row['contract_plan_date_finish'] = work_row['contract_plan_date_finish'].strftime('%d.%m.%Y')
        work_row['contract_plan_date_finish_with_shift'] = work_row['contract_plan_date_finish_with_shift'].strftime('%d.%m.%Y')
      except Exception, e:
        pass

    if row['plan_work']:
      row['plan_work'].sort(key=lambda x: (x.get('routine')))

  #сортировка данных
  data.sort(key = lambda x: (x['contract_number'], x['production_number'], x['production_unit_number'], x['sector_type'], x['sector_code'], x['number']))
  return data

def get_work_orders(contract, product, unit, workorder_number, filter_sectors, filter_workorders, filter_works):
  '''
  Функция получения списка нарядов, по заданным парамтерам поиска.
  contract - Номер договора
  product - Номер продукции
  unit - номер единицы продукции
  workorder_number - номер наряда
  filter_sectors - ['10','20','30']
  filter_workorders - ['all', 'completed', 'opened']
  filter_works - ['', 'multiselect-all', 'no_volumes', 'no_days', 'no_dates']
  '''
  from models import workordermodel
  result = []
  # подготовка условия выборки
  query = {}
  if contract:
    query['contract_number'] =routine.strToInt(contract)
  if product:
    query['production_number'] =routine.strToInt(product)
  if unit:
    query['production_units.unit_number'] = routine.strToInt(unit)
  if workorder_number:
    query['number'] = routine.strToInt(workorder_number)
  # фильтр по участкам
  if filter_sectors and len(filter_sectors)>0:
    query['sector_code'] = {'$in': [routine.strToInt(i) for i in filter_sectors]}
  # фильтр по нарядам
  if filter_workorders and len(filter_workorders)==1 and 'all' not in filter_workorders:
    query['status'] = '' if filter_workorders[0] == 'opened' else 'completed'

  # выборка нарядов из БД
  data = workordermodel.get(query, None)
  # подготовка результата
  return prepare_data(data)

def make_work_order_plan_dates_notification():
  '''
  Напоминание о наступлении/окончании планов по нарядам.
  Напоминание происходит за 7-3-1 рабочие дня
  '''

  from models import noticemodel, usermodel, dirmodel

  # лкальная функция группировки данных
  def group_data(result, group_key):
    # группировка данных по result_start
    g_result = {}
    for row in result:
      # группировка по дате
      if str(row[group_key]) not in g_result:
        g_result[str(row[group_key])] = {group_key: row[group_key], 'items': {} }
      row_date = g_result[str(row[group_key])]['items']

      # группировка по номеру договора
      if row['contract_number'] not in row_date:
        row_date[row['contract_number']] = {'contract_number':  row['contract_number'], 'client_name': row['client_name'], 'items': {}}
      row_contract = row_date[row['contract_number']]['items']

      # группировка по номеру заказа
      order_key = '{0}.{1}.{2}'.format(str(row['contract_number']), str(row['production_number']), str(row['production_unit_number']))
      if order_key not in row_contract:
        row_contract[order_key] = {'order_key':  order_key, 'items': {}, 'production_number':row['production_number'], 'production_unit_number':row['production_unit_number'], 'contract_number':row['contract_number'], 'production_name': row['production_name']}
      row_order = row_contract[order_key]['items']

      # группировка по направлению работ
      if row['sector_type'] not in row_order:
        row_order[row['sector_type']] = {'sector_type':  row['sector_type'], 'items': {}}
      row_sector_type = row_order[row['sector_type']]['items']

      # группировка по номеру наряда
      if row['workorder_number'] not in row_sector_type:
        row_sector_type[row['workorder_number']] = {'workorder_number':  row['workorder_number'], 'items': [], 'sector_name': row['sector_name']}
      row_work_order = row_sector_type[row['workorder_number']]['items']

      # группировка по работе
      row_work_order.append(row)
    return g_result

  # локальная функция подготовки данных на отправку
  # Формат - HTML
  # group_key - ["date_start_with_shift", "date_finish_with_shift"]
  # start_level - первый уровень данных
  # dates_labels - пометка к датам - ["вчера", "сегодня", "через 7 дней"....]
  def prepare_data(data, group_key, start_level_label, dates_labels):
    result = "<ul style = 'margin-left:2px; padding-left:10px;'>";
    #[НОМЕР ДОГОВОРА] НАЗВАНИЕ ЗАКАЗЧИКА / [НОМЕР ЗАКАЗА] НАЗВАНИЕ ПРОДУКЦИИ / НАЗВАНИЕ НАПРАВЛЕНИЯ РАБОТ / [НОМЕР НАРЯДА] НАЗВАНИЕ УЧАСТКА / [КОД РАБОТЫ] НАЗВАНИЕ РАБОТЫ
    data = data.values()
    data.sort(key = lambda x:(x[group_key]))
    for row_date_start in data:
      # сбор договоров
      tmp_contract_html = ""
      contract_items = row_date_start['items'].values()
      contract_items.sort(key=lambda x:(x['contract_number']))
      for tmp_contract_row in contract_items:
        # сбор заказов
        tmp_order_html = ""
        order_items = tmp_contract_row['items'].values()
        order_items.sort(key=lambda x:(x['production_number'], x['production_unit_number'], x['production_name'] ))
        for tmp_order_row in order_items:
          order_key = '{0}.{1}.{2}'.format(str(tmp_order_row['contract_number']), str(tmp_order_row['production_number']), str(tmp_order_row['production_unit_number']))
          tmp_sector_type_html = ""
          sector_type_items = tmp_order_row['items'].values()
          sector_type_items.sort(key=lambda x:(x['sector_type']))
          for tmp_sector_type_row in sector_type_items:
            tmp_work_order_html = ""
            work_order_items = tmp_sector_type_row['items'].values()
            work_order_items.sort(key=lambda x:(x['workorder_number'], x['sector_name']))
            for tmp_work_order_row in work_order_items:
              tmp_work_html = ""
              work_items = tmp_work_order_row['items']
              work_items.sort(key=lambda x: (x['work_code']))
              for tmp_work_row in work_items:
                tmp_work_html+="<li style = 'font-size:12px;'>[{0}] {1}</li>".format(tmp_work_row['work_code'], tmp_work_row['work_name'])

              tmp_work_order_html+="<li style = 'font-size:12px;'>[{0}] {1}<ul style = 'margin-left:2px; padding-left:10px;'>{2}</ul></li>".format(str( routine.strToInt(tmp_work_order_row['workorder_number'])), tmp_work_order_row['sector_name'], tmp_work_html)
            tmp_sector_type_html+="<li>{0}<ul style = 'margin-left:2px; padding-left:10px;'>{1}</ul></li>".format(tmp_sector_type_row['sector_type'] , tmp_work_order_html)
          tmp_order_html+="<li style = 'font-size:14px;'>[{0}] {1}<ul style = 'margin-left:2px; padding-left:10px;'>{2}</ul></li>".format(order_key,tmp_order_row['production_name'] , tmp_sector_type_html)
        tmp_contract_html+="<li style = 'font-size:16px;'>{0} [{1}]<ul style = 'margin-left:2px; padding-left:10px;'>{2}</ul></li>".format(str(tmp_contract_row['contract_number']),tmp_contract_row['client_name'] , tmp_order_html)
      tmp_date_start_html="<li style = 'font-size:16px;'>{0}<ul style = 'margin-left:2px; padding-left:10px;'>{1}</ul></li>".format(dates_labels[row_date_start[group_key].strftime('%d.%m.%Y')], tmp_contract_html)
      result += tmp_date_start_html
    result += "</ul>";
    result = "<ul style = 'margin-left:2px; padding-left:10px;'><li style = 'font-size:16px;'>" + start_level_label +result+ "</li></ul>"
    return result

  from models import workordermodel, sectormodel, contractmodel
  from helpers import mailer
  result_start = []
  result_finish = []
  today = datetime.datetime.utcnow()
  # today = datetime.datetime.today()
  start_date = today.replace(hour=0, minute=0, second=0,microsecond=0)
  end_date = today.replace(hour=23, minute=59, second=59,microsecond=0)
  weekends = routine.get_weekends()
  # получение информации по участкам
  data_sectors = sectormodel.get_all_only_sectors()
  sectors_info = {}
  for sector_info in data_sectors:
    sectors_info[str(sector_info['_id'])] = sector_info
  # получение информации по всем работам
  data_works = sectormodel.get_all_only_works()
  # start_7_days = routine.add_work_days_soft(start_date, 7,weekends)
  # end_7_days = routine.add_work_days_soft(end_date, 7,weekends)
  # start_3_days = routine.add_work_days_soft(start_date, 3,weekends)
  # end_3_days = routine.add_work_days_soft(end_date, 3,weekends)
  # start_1_days = routine.add_work_days_soft(start_date, 1,weekends)
  # end_1_days = routine.add_work_days_soft(end_date, 1,weekends)
  start_7_days = start_date+relativedelta(days = +7)
  end_7_days = end_date+relativedelta(days = +7)
  start_3_days = start_date+relativedelta(days = +3)
  end_3_days = end_date+relativedelta(days = +3)
  start_1_days = start_date+relativedelta(days = +1)
  end_1_days = end_date+relativedelta(days = +1)
  data = workordermodel.get_list_by(
    {
      'plan_work.need_notification': True,
      '$or': [
        {'plan_work.date_start_with_shift':
        {
          '$gte': start_7_days,
          '$lte': end_7_days
        }},
        {'plan_work.date_start_with_shift':
        {
          '$gte': start_3_days,
          '$lte': end_3_days
        }},
        {'plan_work.date_start_with_shift':
        {
          '$gte': start_1_days,
          '$lte': end_1_days
        }},
        {'plan_work.date_finish_with_shift':
        {
          '$gte': start_7_days,
          '$lte': end_7_days
        }},
        {'plan_work.date_finish_with_shift':
        {
          '$gte': start_3_days,
          '$lte': end_3_days
        }},
        {'plan_work.date_finish_with_shift':
        {
          '$gte': start_1_days,
          '$lte': end_1_days
        }}
      ]
    },
    {
      'number':1,
      'plan_work':1,
      'sector_id':1,
      'sector_code':1,
      'date_start_with_shift':1,
      'date_finish_with_shift':1,
      'production_number':1,
      'production_name':1,
      'contract_id':1,
      'contract_number':1,
      'production_units':1
    }
  )
  # если есть данные на отправку
  if data and len(data)>0:
    # получение информации о договорах, задействованных в нарядах
    contract_ids = []
    for row in data:
      if row['contract_id'] not in contract_ids:
        contract_ids.append(row['contract_id'])
    data_contracts = contractmodel.get_list_by({'_id': {'$in': contract_ids}}, {'client_name':1} )
    contracts_info = {}
    for row in data_contracts:
      contracts_info[str(row['_id'])] = row
    # подготовка результирующих данных
    for row in data:
      for plan_work in row['plan_work']:
        if plan_work.get('need_notification') and plan_work.get('status')!='completed' and plan_work.get('date_start_with_shift') and ((plan_work['date_start_with_shift']>=start_7_days and plan_work['date_start_with_shift']<=end_7_days) or (plan_work['date_start_with_shift']>=start_3_days and plan_work['date_start_with_shift']<=end_3_days) or (plan_work['date_start_with_shift']>=start_1_days and plan_work['date_start_with_shift']<=end_1_days)):
          result_start.append({
            'work_code':plan_work['code'],
            'work_id':plan_work['work_id'],
            'work_name': (data_works.get(str(row['sector_code']) + '_' + str(plan_work['code'])) or {}).get('name'),
            'date_start_with_shift': plan_work['date_start_with_shift'],
            'date_finish_with_shift': plan_work['date_finish_with_shift'],
            'contract_number':row['contract_number'],
            'client_name':contracts_info[str(row['contract_id'])].get('client_name'),
            'production_number':row['production_number'],
            'production_name':row['production_name'],
            'sector_type': sectors_info[str(row['sector_id'])]['type'],
            'sector_name': sectors_info[str(row['sector_id'])]['name'],
            'sector_code': row['sector_code'],
            'production_unit_number': row['production_units'][0]['unit_number'],
            'workorder_number': row['number']
            })
        if plan_work.get('need_notification') and  plan_work.get('status')!='completed' and plan_work.get('date_finish_with_shift') and ((plan_work['date_finish_with_shift']>=start_7_days and plan_work['date_finish_with_shift']<=end_7_days) or (plan_work['date_finish_with_shift']>=start_3_days and plan_work['date_finish_with_shift']<=end_3_days) or (plan_work['date_finish_with_shift']>=start_1_days and plan_work['date_finish_with_shift']<=end_1_days)):
          result_finish.append({
            'work_code':plan_work['code'],
            'work_id':plan_work['work_id'],
            'work_name': (data_works.get(str(row['sector_code']) + '_' + str(plan_work['code'])) or {}).get('name'),
            'date_start_with_shift': plan_work['date_start_with_shift'],
            'date_finish_with_shift': plan_work['date_finish_with_shift'],
            'contract_number':row['contract_number'],
            'client_name':contracts_info[str(row['contract_id'])].get('client_name'),
            'production_number':row['production_number'],
            'production_name':row['production_name'],
            'sector_type': sectors_info[str(row['sector_id'])]['type'],
            'sector_name': sectors_info[str(row['sector_id'])]['name'],
            'sector_code': row['sector_code'],
            'production_unit_number': row['production_units'][0]['unit_number'],
            'workorder_number': row['number']
            })
    # сортировка результирующих данных
    result_start.sort(key = lambda x: (x['date_start_with_shift'], x['contract_number'], x['production_number'], x['production_unit_number'], x['sector_type'], x['sector_code'], x['workorder_number'], x['work_code'] ))
    result_finish.sort(key = lambda x: (x['date_finish_with_shift'], x['contract_number'], x['production_number'], x['production_unit_number'], x['sector_type'], x['sector_code'], x['workorder_number'], x['work_code'] ))
    # пометки к датам
    dates_labels = {
      start_7_days.strftime('%d.%m.%Y'): "Через 7 дней",
      end_7_days.strftime('%d.%m.%Y'): "Через 7 дней",
      start_3_days.strftime('%d.%m.%Y'): "Через 3 дня",
      end_3_days.strftime('%d.%m.%Y'): "Через 3 дня",
      start_1_days.strftime('%d.%m.%Y'): "Завтра",
      end_1_days.strftime('%d.%m.%Y'): "Завтра",
    }

    # получение всех направление работ, задействованные в рассылке
    used_sector_types = {}
    for row in result_start:
      used_sector_types[row['sector_type']] = row['sector_type']
    for row in result_finish:
      used_sector_types[row['sector_type']] = row['sector_type']
    used_sector_types = used_sector_types.values()

    # группировка и подготовка HTML
    html_body = ''
    if result_start and len(result_start)>0:
      g_result = group_data(result_start, 'date_start_with_shift')
      html_body += prepare_data(g_result, "date_start_with_shift", "Начинаются" , dates_labels)
    if result_finish and len(result_finish)>0:
      g_result = group_data(result_finish, 'date_finish_with_shift')
      html_body += prepare_data(g_result, "date_finish_with_shift", "Заканчиваются",  dates_labels)
    if html_body:
      # рассылка почты
      notice_users = usermodel.get_list({'notice.key': noticemodel.notice_keys['workorders']['key'], 'stat': {'$ne':'disabled' }},{'email':1,'fio':1})

      #-------------------------------------------------------------------------------------------------------------------------------
      # iss: 1441
      # получаем пользоваталей ответственных за направления работ
      dirs = dirmodel.get_by_type(dirmodel.SectorTypesKey)
      # группируем справочник по назаниям направлений
      dirs_arr = {}
      for row in dirs:
        if row.get('users'):
          row['users'] = routine.JSONDecode(row['users'])
        dirs_arr[row['name']] = row
      # проходим по задействованным направлениям и смотрим есть ли ответственные за данные направления
      for sector_type in used_sector_types:
        if sector_type in dirs_arr and dirs_arr[sector_type].get('users'):
          for resposible_user  in dirs_arr[sector_type]['users']:
            notice_users.append({
              'email': resposible_user.get('email'),
              'fio': resposible_user.get('fio'),
            })
      #------------------------------------------------------------------------------------------------------------------------------
      mailer.send(u'Напоминание о планах', html_body, notice_users, True)

def link_work_to_work(linked_work_obj, current_workorder_number, current_work_obj, days_before_start, usr_email, is_contract_plan):
  '''
  Установка зависимости одной работы от другой
  linked_work_obj: {'workorder_number': '', 'work_number': ''}
  current_workorder_number: номер наряда в который входит зависимая работа
  current_work_obj: информация о зависимой работе
  days_before_start: количество дней до старта зависимой работы после окончания главной работы
  usr_email - email менеджера
  is_contract_plan - флаг сохранения планов по договору
  '''
  from models import workordermodel
  from apis.contract import contractapi
  # задаем алиасы для сохраняемых полей.
  # Т.к функция одна на сохранение собственных планов и планов по договору
  # и отличие в ней лишь в названии однотипных полей, то принято решение вести поля через алиасы
  als = get_alias(is_contract_plan)

  # получаем информацию о наряде и работе из которой берем дату плана
  linked_work_data = workordermodel.get(
    {
      'number': routine.strToInt(linked_work_obj['workorder_number']),
      'plan_work.code':routine.strToInt(linked_work_obj['work_number'])
    },
    {
      'plan_work.$':1,
      'number':1
    }
  )
  if not linked_work_data or len(linked_work_data)==0:
    raise Exception('Задача с указанными параметрами не найдена.')
  linked_work_data = linked_work_data[0]

  # получаем информацию о текущей работе, даты которой будут зависеть от основной
  current_work_data = workordermodel.get(
    {
      'number': routine.strToInt(current_workorder_number),
      'plan_work._id':ObjectId(current_work_obj['_id'])
    },
    {
      'number':1,
      'date_start_with_shift':1,
      'date_finish_with_shift':1,
      'date_start': 1,
      'date_finish': 1,
      'contract_plan_date_start_with_shift':1,
      'contract_plan_date_finish_with_shift':1,
      'contract_plan_date_start': 1,
      'contract_plan_date_finish': 1,
      'plan_work.$':1
    }
  )
  if not current_work_data or len(current_work_data)==0:
    raise Exception('Зависимая задача с указанными параметрами не найдена.')
  current_work_data = current_work_data[0]

  # Подготовка и сохранение данных.
  # При сохранении происходит сброс истории переноса сроков и пересчет даты начала и окончания задачи
  depends_on = {
    'workorder_id': str(linked_work_data['_id']),
    'work_id': str(linked_work_data['plan_work'][0]['_id']),
    'workorder_number': linked_work_data['number'],
    'work_code': linked_work_data['plan_work'][0]['code'],
    'date': linked_work_data['plan_work'][0].get(als['date_finish_with_shift']),
    'days_before_start': days_before_start,
    'date_change': datetime.datetime.utcnow(),
    'user':usr_email
  }
  work_date_start = None
  work_date_finish = None

  if depends_on['date']:
    # пересчет даты начала и окончания задачи
    work_date_start = depends_on['date'] + datetime.timedelta(days= routine.strToInt(days_before_start))
    tmp_days_count =  current_work_data['plan_work'][0].get(als['days_count'],0)
    if tmp_days_count==0:
      tmp_days_count  =1
    # если уже была задана дата финиша, то используем ее для вычисления длительности
    if(current_work_data['plan_work'][0].get(als['date_finish_with_shift']) and current_work_data['plan_work'][0].get(als['date_start_with_shift'])):
      tmp_days_count = (current_work_data['plan_work'][0].get(als['date_finish_with_shift']) - current_work_data['plan_work'][0].get(als['date_start_with_shift'])).days
    work_date_finish = work_date_start + datetime.timedelta(days= tmp_days_count)

  # сбор старой информации о датах
  old_dates_info = {
    als['date_start_with_shift']: current_work_data['plan_work'][0].get(als['date_start_with_shift']),
    als['date_finish_with_shift']: current_work_data['plan_work'][0].get(als['date_finish_with_shift']),
    als['plan_shifts']: current_work_data['plan_work'][0].get(als['plan_shifts']),
  }
  workordermodel.update({'_id': current_work_data['_id'], 'plan_work._id': current_work_data['plan_work'][0]['_id'] }, {"$set":
    {
      'plan_work.$.'+als['depends_on']:depends_on,
      'plan_work.$.'+als['use_conditional_date']: True,
      'plan_work.$.'+als['plan_shifts']: [],
      'plan_work.$.'+als['date_start']: work_date_start,
      'plan_work.$.'+als['date_start_with_shift']: work_date_start,
      'plan_work.$.'+als['date_finish_with_shift']: work_date_finish,
      'plan_work.$.'+als['date_finish']: work_date_finish,
      'plan_work.$.'+als['old_dates_info']: old_dates_info if not current_work_data['plan_work'][0].get(als['old_dates_info']) else current_work_data['plan_work'][0].get(als['old_dates_info'])
    }
  })


  # пересчет и обновление дат всего наряда
  if depends_on['date']:
    workorder_date_start_with_shift = current_work_data[als['date_start_with_shift']] if current_work_data.get(als['date_start_with_shift']) and current_work_data.get(als['date_start_with_shift'])<work_date_start else work_date_start
    workorder_date_finish_with_shift = current_work_data[als['date_finish_with_shift']] if current_work_data.get(als['date_finish_with_shift']) and current_work_data.get(als['date_finish_with_shift'])<work_date_finish else work_date_finish
    workorder_date_start = current_work_data[als['date_start']] if current_work_data.get(als['date_start']) else work_date_start
    workorder_date_finish = current_work_data[als['date_finish']] if current_work_data.get(als['date_finish']) else work_date_finish
    workordermodel.update({'_id': current_work_data['_id']}, {"$set":
      {
        als['date_start_with_shift']: workorder_date_start_with_shift,
        als['date_finish_with_shift']: workorder_date_finish_with_shift,
        als['date_start']: workorder_date_start,
        als['date_finish']: workorder_date_finish,
      }
    })

  # получение обновленных даных по работе
  result = workordermodel.get(
    {
      'number': routine.strToInt(current_workorder_number),
      'plan_work._id':ObjectId(current_work_obj['_id'])
    },
    {
      'plan_work.$':1,
      '_id': 1
    }
  )

  #-------------------------------------------------------------------------------------------------------
  # если работа привязана к платежу, то необходимо прокинуть информацию о датах в договор
  # прокинуть в договоры
  payments_to_save = prepare_payments_from_workorders(result)
  if len(payments_to_save)>0:
    try:
      contractapi.update_plan_payments(payments_to_save, usr_email)
    except Exception, lexc:
      print('Error! update_plan_payments. Detail: {0}'.format(str(lexc)))
      print_exc()
  #-------------------------------------------------------------------------------------------------------

  return result[0]['plan_work'][0]

def link_group_work_to_work(linked_work_obj, data_to_link, days_before_start, usr_email):
  '''
  Установка зависимости группы работ от другой
  linked_work_obj: {'workorder_number': '', 'work_number': ''}
  data_to_link - [{'workorder_number': '', 'works': [id]}]
  days_before_start: количество дней до старта зависимой работы после окончания главной работы
  '''
  from models import workordermodel
  from apis.contract import contractapi
  # получаем информацию о главной работе по номеру наряда и номеру работы
  linked_work_data = workordermodel.get(
    {
      'number': routine.strToInt(linked_work_obj['workorder_number']),
      'plan_work.code':routine.strToInt(linked_work_obj['work_number'])
    },
    {
      'plan_work.$':1,
      'number':1
    }
  )
  if not linked_work_data or len(linked_work_data)==0:
    raise Exception('Задача с указанными параметрами не найдена.')
  linked_work_data = linked_work_data[0]

  for row in data_to_link:
    # получаем информацию о текущей работе
    current_workorder_data = workordermodel.get_by(
      {
        'number': routine.strToInt(row['workorder_number'])
      },
      {
        'number':1,
        'date_start_with_shift':1,
        'date_finish_with_shift':1,
        'date_start': 1,
        'date_finish': 1,
        'plan_work':1
      }
    )
    if current_workorder_data and current_workorder_data.get('plan_work'):
      # Подготовка и сохранение данных.
      # При сохранении происходит сброс истории переноса сроков и пересчет даты начала и окончания задачи
      depends_on = {
        'workorder_id': str(linked_work_data['_id']),
        'work_id': str(linked_work_data['plan_work'][0]['_id']),
        'workorder_number': linked_work_data['number'],
        'work_code': linked_work_data['plan_work'][0]['code'],
        'date': linked_work_data['plan_work'][0].get('date_finish_with_shift'),
        'days_before_start': days_before_start,
        'date_change': datetime.datetime.utcnow(),
        'user':usr_email
      }

      work_date_start = None
      work_date_finish = None
      max_work_date_finish = None

      if depends_on['date']:
        # пересчет даты начала
        work_date_start = depends_on['date'] + datetime.timedelta(days= routine.strToInt(days_before_start))

      for work_item in current_workorder_data['plan_work']:
        if work_date_start:
          # пересчет даты окончания
          tmp_days_count = work_item.get('days_count',0)
          # if tmp_days_count==0:
          #   tmp_days_count  =1
          # если уже была задана дата финиша, то используем ее для вычисления длительности
          if(work_item.get('date_finish_with_shift') and work_item.get('date_start_with_shift')) :
            tmp_days_count = (work_item.get('date_finish_with_shift') -work_item.get('date_start_with_shift')).days
          work_date_finish = work_date_start + datetime.timedelta(days= tmp_days_count)

          if not max_work_date_finish or max_work_date_finish<work_date_finish:
            max_work_date_finish = work_date_finish


        # сбор старой информации о датах
        old_dates_info = {
          'date_start_with_shift': work_item.get('date_start_with_shift'),
          'date_finish_with_shift': work_item.get('date_finish_with_shift'),
          'plan_shifts': work_item.get('plan_shifts'),
        }

        work_item['plan_shifts'] = []
        work_item['depends_on'] = depends_on
        work_item['use_conditional_date'] = True
        work_item['date_start'] = work_date_start
        work_item['date_start_with_shift'] = work_date_start
        work_item['date_finish_with_shift'] = work_date_finish
        work_item['date_finish'] = work_date_finish
        work_item['old_dates_info'] = old_dates_info if not work_item.get('old_dates_info') else work_item['old_dates_info']

      workorder_date_start_with_shift = None
      workorder_date_finish_with_shift = None
      workorder_date_start = None
      workorder_date_finish = None
      if depends_on['date']:
        workorder_date_start_with_shift = current_workorder_data['date_start_with_shift'] if current_workorder_data.get('date_start_with_shift') and current_workorder_data['date_start_with_shift']<work_date_start else work_date_start
        workorder_date_finish_with_shift = current_workorder_data['date_finish_with_shift'] if current_workorder_data.get('date_finish_with_shift') and current_workorder_data['date_finish_with_shift']<max_work_date_finish else max_work_date_finish
        workorder_date_start = current_workorder_data['date_start'] if current_workorder_data.get('date_start') else work_date_start
        workorder_date_finish = current_workorder_data['date_finish'] if current_workorder_data.get('date_finish') else max_work_date_finish


      # обновление наряда в БД
      workordermodel.update({'_id': current_workorder_data['_id']}, {"$set":
        {
          'plan_work': current_workorder_data['plan_work'],
          'date_start_with_shift': workorder_date_start_with_shift,
          'date_finish_with_shift': workorder_date_finish_with_shift,
          'date_start': workorder_date_start,
          'date_finish': workorder_date_finish
        }
      })

      # получение обновленной информации о наряде и
      # получение обновленных даных по работе
      result = workordermodel.get(
        {
          '_id': current_workorder_data['_id']
        },
        {
          'plan_work':1,
          '_id': 1
        }
      )

      #-----------------------------------------------------------------------------------------------------
      # сбор информации о работах привязанных к платежам
      payments_to_save = prepare_payments_from_workorders(result)
      if payments_to_save and len(payments_to_save)>0:
        try:
          contractapi.update_plan_payments(payments_to_save, usr_email)
        except Exception, lexc:
          print('Error! update_plan_payments. Detail: {0}'.format(str(lexc)))
          print_exc()
      #-----------------------------------------------------------------------------------------------------

def unlink_work_from_work(current_workorder_number, current_work_obj, is_contract_plan, usr_email=''):
  '''
  Удаление зависимости одной работы от другой
  current_workorder_number: номер наряда в который входит зависимая работа
  current_work_obj: информация о зависимой работе
  '''
  from models import workordermodel
  from apis.contract import contractapi
  # задаем алиасы для сохраняемых полей.
  # Т.к функция одна на сохранение собственных планов и планов по договору
  # и отличие в ней лишь в названии однотипных полей, то принято решение вести поля через алиасы
  als = get_alias(is_contract_plan)
  workordermodel.update({'number': routine.strToInt(current_workorder_number), 'plan_work._id': ObjectId(current_work_obj['_id'])}, {"$set":{'plan_work.$.'+als['depends_on']:None, 'plan_work.$.'+als['use_conditional_date']: False}})

  # получение обновленных даных по работе
  result = workordermodel.get(
    {
      'number': routine.strToInt(current_workorder_number),
      'plan_work._id':ObjectId(current_work_obj['_id'])
    },
    {
      'plan_work.$':1,
      '_id': 1
    }
  )
  #---------------------------------------------------------------------------------------------------------
  # если работа привязана к платежу, то необходимо прокинуть информацию о датах в договор
  # прокинуть в договоры
  payments_to_save = prepare_payments_from_workorders(result)
  if payments_to_save and len(payments_to_save)>0:
    try:
      contractapi.update_plan_payments(payments_to_save, usr_email)
    except Exception, lexc:
      print('Error! update_plan_payments. Detail: {0}'.format(str(lexc)))
      print_exc()
  #---------------------------------------------------------------------------------------------------------

def unlink_group_work_from_work(data):
  '''
  Удаление зависимости группы работ от других работ
  data - [{'workorder_number': '', 'works': [id]}]
  '''
  from models import workordermodel
  from apis.contract import contractapi
  for row in data:
    for work_id in row['works']:
      # обновить инфо
      workordermodel.update(
        {
          'number': routine.strToInt(row['workorder_number']),
          'plan_work._id': ObjectId(work_id)
        },
        {"$set":{'plan_work.$.depends_on':None, 'plan_work.$.use_conditional_date': False}}
      )

      # получение обновленных даных по работе
      result = workordermodel.get(
        {
          'number': routine.strToInt(row['workorder_number']),
          'plan_work._id':ObjectId(work_id)
        },
        {
          'plan_work.$':1,
          '_id': 1
        }
      )
      #-----------------------------------------------------------------------------------------------------
      # если работа привязана к платежу, то необходимо прокинуть информацию о датах в договор
      # прокинуть в договоры
      payments_to_save = prepare_payments_from_workorders(result)
      if payments_to_save and len(payments_to_save)>0:
        try:
          contractapi.update_plan_payments(payments_to_save, usr_email)
        except Exception, lexc:
          print('Error! update_plan_payments. Detail: {0}'.format(str(lexc)))
          print_exc()
      #-----------------------------------------------------------------------------------------------------

def get_linked_tasks_dates(work_orders_to_save, is_contract_plan = False):
  '''
    Получение инфомрации о зависимых задачах
  '''
  from models import workordermodel
  # выставление алиаса названия полей (собственные и договорные планы)
  als = get_alias(is_contract_plan)
  works_on_check = []
  # сбор ID всех работ участвующих в проверке
  for wo_row in work_orders_to_save:
    for w_row in wo_row.get('plan_work',[]):
      works_on_check.append(str(w_row['_id']))

  # получаем зависимые задачи по ID работ
  linked_workorders = workordermodel.get(
    {'plan_work.'+als['depends_on']+'.work_id': {'$in': works_on_check}},
    {
      'number':1,
      '_id': 1,
      'date_start_with_shift': 1,
      'date_finish_with_shift': 1,
      'date_start': 1,
      'date_finish': 1,
      'contract_plan_date_start_with_shift': 1,
      'contract_plan_date_finish_with_shift': 1,
      'contract_plan_date_start': 1,
      'contract_plan_date_finish': 1,
      'status': 1,
      'plan_work.$':1
    }
  )
  return linked_workorders

def update_linked_tasks_dates(work_orders_to_save, usr_email, is_contract_plan = False, group_key=''):
  '''
  Обновление дат зависимых задач
  orders_to_save - список нарядов с работами, даты которых необходимо проверить на наличие прилинкованных задач
  group_key - ключ переноса группы
  is_contract_plan - флаг для обновления собственных пданов или по договору
  '''

  from models import workordermodel
  from apis.contract import contractapi
  # выставление алиаса названия полей (собственные и договорные планы)
  als = get_alias(is_contract_plan)
  works_grouped_by_id = {}
  # сбор ID всех работ участвующих в проверке
  for wo_row in work_orders_to_save:
    for w_row in wo_row.get('plan_work',[]):
      works_grouped_by_id[str(w_row['_id'])] = w_row

  # получаем зависимые задачи по ID работ
  linked_workorders = get_linked_tasks_dates(work_orders_to_save, is_contract_plan)

  # обработка данных
  for wo_row in linked_workorders:
    for w_row in wo_row.get('plan_work',[]):
      main_work_info = works_grouped_by_id.get(str(w_row[als['depends_on']]['work_id']))
      # если дата окончания основной работы отличается от даты указанной в зависимой работе, то необходимо
      # обновить информацию зависимости
      if main_work_info.get(als['date_finish_with_shift']) and main_work_info.get(als['date_finish_with_shift']) != w_row[als['depends_on']]['date']:
        w_row[als['depends_on']]['date'] = main_work_info.get(als['date_finish_with_shift'])

        # если на момент изменения даты основной работы, у зависимой работы дата еще не пробита,
        # то берем ей дату окончания основной работы

        # количество дней на перенос
        try:
          shift_days = (main_work_info.get(als['date_finish_with_shift']) - (w_row.get(als['date_start_with_shift'])- datetime.timedelta(days= routine.strToInt(w_row[als['depends_on']]['days_before_start'])))).days
        except Exception, exc1:
          shift_days = 0
          print_exc()
          pass

        work_date_start = None
        work_date_finish = None
        if w_row[als['depends_on']]['date']:
          # пересчет даты начала и окончания задачи
          work_date_start = main_work_info.get(als['date_finish_with_shift']) + datetime.timedelta(days= routine.strToInt(w_row[als['depends_on']]['days_before_start']))
          # tmp_days_count =  main_work_info.get(als['days_count'],0)
          # if tmp_days_count==0:
          #   tmp_days_count  =1
          tmp_days_count =(main_work_info.get(als['date_finish_with_shift']) - main_work_info.get(als['date_start_with_shift'])).days
          # если уже была задана дата финиша, то используем ее для вычисления длительности
          if(w_row.get(als['date_finish_with_shift']) and w_row.get(als['date_start_with_shift'])):
            tmp_days_count = (w_row.get(als['date_finish_with_shift']) - w_row.get(als['date_start_with_shift'])).days
          work_date_finish = work_date_start + datetime.timedelta(days= tmp_days_count)

        # обновление в БД
        workordermodel.update({'_id': wo_row['_id'], 'plan_work._id': w_row['_id']}, {
          '$set':
            {
              'plan_work.$.'+als['depends_on']:w_row[als['depends_on']],
              'plan_work.$.'+als['date_start']: work_date_start if not w_row.get(als['date_start']) else w_row.get(als['date_start']),
              'plan_work.$.'+als['date_finish']: work_date_finish if not w_row.get(als['date_finish']) else w_row.get(als['date_finish']),
              'plan_work.$.'+als['date_start_with_shift']: work_date_start,
              'plan_work.$.'+als['date_finish_with_shift']: work_date_finish
            },
          '$push':
            {
              'plan_work.$.'+als['plan_shifts']:  {
                '_id': ObjectId(),
                'date_change': datetime.datetime.utcnow(),
                'user_email': usr_email,
                'reason_id': None,
                'reason': '',
                'reason_nodes': None,
                'type': 'both',
                'shift': shift_days,
                'note': 'Автоматическая корректировка зависимой работы.',
                'source': 'plan',
                'group_key': group_key
              }
            }
        })

        # пересчет и обновление дат всего наряда
        if w_row[als['depends_on']]['date']:
          workorder_date_start_with_shift = wo_row[als['date_start_with_shift']] if wo_row.get(als['date_start_with_shift']) and wo_row[als['date_start_with_shift']]<work_date_start else work_date_start
          workorder_date_finish_with_shift = wo_row[als['date_finish_with_shift']] if wo_row.get(als['date_finish_with_shift']) and wo_row[als['date_finish_with_shift']]<work_date_finish else work_date_finish
          workorder_date_start = wo_row[als['date_start']] if wo_row.get(als['date_start']) else work_date_start
          workorder_date_finish = wo_row[als['date_finish']] if wo_row.get(als['date_finish']) else work_date_finish
          workordermodel.update({'_id': wo_row['_id']}, {"$set":
            {
              als['date_start_with_shift']: workorder_date_start_with_shift,
              als['date_finish_with_shift']: workorder_date_finish_with_shift,
              als['date_start']: workorder_date_start,
              als['date_finish']: workorder_date_finish,
            }
          })
          #-------------------------------------------------------------------------------------------------
          # если работа привязана к платежу, то необходимо прокинуть информацию о датах в договор
          # прокинуть в договоры
          # получение обновленных даных по работе
          result = workordermodel.get(
            { '_id': wo_row['_id'], 'plan_work._id':w_row['_id'] },
            { 'plan_work.$':1, '_id': 1 }
          )
          payments_to_save = prepare_payments_from_workorders(result)
          if payments_to_save and len(payments_to_save)>0:
            try:
              contractapi.update_plan_payments(payments_to_save, usr_email)
            except Exception, lexc:
              print('Error! update_plan_payments. Detail: {0}'.format(str(lexc)))
              print_exc()
          #-------------------------------------------------------------------------------------------------

  # возвращение в результат прилинкованных работ
  return linked_workorders

def close_contract_and_all_workorders_if_works_completed(number, usr_email=""):
  '''
    Закрыть договор и все его наряды, если все работы нарядов завершены
  '''
  from models import workordermodel, contractmodel
  contract_info = contractmodel.get_by({'number':number, '$or': [{ 'parent_id': { '$exists': False }},{'parent_id':None},{'parent_id': ''}]},{'_id':1, 'number':1})
  all_contract_workorders = workordermodel.get({'contract_id': contract_info['_id']},{'_id':1, 'number':1})
  close_workorder_if_all_works_completed([row['_id'] for row in all_contract_workorders])
  # close_contract_if_all_workorders_completed(number)

def close_contract_if_all_workorders_completed(number, usr_email=""):
  '''
   Зактыть договор, если все наряды завершены
   Открыть договор, если не все наряды заврешены
   number - номер договора
  '''
  from models import workordermodel, contractmodel
  try:
    contract_info = contractmodel.get_by({'number':number, '$or': [{ 'parent_id': { '$exists': False }},{'parent_id':None},{'parent_id': ''}]},None)

    all_contract_workorders = workordermodel.get({'contract_id': contract_info['_id']},None)
    data_workorders = []
    have_not_finished_workorders = False
    not_finished_workorders = []
    not_finished_units = []
    last_finish_date = None

    # проверка на завершенность всех нарялов в рамках договора
    for row_workorder in all_contract_workorders:
      data_workorders.append(row_workorder)
      if row_workorder.get('status',None) != 'completed':
        have_not_finished_workorders = True;
        not_finished_workorders.append(row_workorder['number'])
        break;
      if not last_finish_date or row_workorder['status_date']>last_finish_date:
        last_finish_date = row_workorder['status_date']

    # если все наряды завершены, проверяем на наличие нарядов на все единицы продукции договора
    # из проверки исключается удаленная продукция
    # также исключается нулевая продукция на которую нет платежей.
    if not have_not_finished_workorders:
      contract_productions = {}
      # проверка ведется только по основному договору, ДС не включены
      # contract_info = contractmodel.get_by({'number':number, '$or': [{ 'parent_id': { '$exists': False }},{'parent_id':None},{'parent_id': ''}]},None)
      # сбор продукции из договора
      if 'productions' in contract_info and len(contract_info['productions'])>0:
        for product_row in contract_info['productions']:
          # в проверке участвует только не удаленная продукция
          if product_row.get('status')!='del' and product_row['number']>0:
            contract_productions[str(product_row['_id'])] = {'number': product_row['number'], 'units':{}}
            if 'units' in product_row and len(product_row['units'])>0:
              for unit_row in product_row['units']:
                if unit_row['number']>0:
                  contract_productions[str(product_row['_id'])]['units'][str(unit_row['_id'])] = {'number': unit_row['number'], 'status': False}
                  #print(str(product_row['_id']) + "====" + str(unit_row['_id']))

      for row_workorder in data_workorders:
        if 'production_units' in row_workorder and len(row_workorder['production_units'])>0:
          for workorder_unt_row in row_workorder['production_units']:
            try:
              contract_productions[str(workorder_unt_row['production_id'])]['units'][str(workorder_unt_row['unit_id'])]['status'] = True
            except:
              pass

      # проверка на наличие единиц продукции на которые нет нарядов
      # если таких нет, то необходимо выставить статус завершенности договору
      have_not_finished_units = False
      for i in contract_productions:
        for j in contract_productions[i]['units']:
          if not contract_productions[i]['units'][j]['status']:
            have_not_finished_units = True;
            not_finished_units.append(i + '====='+j)
            break;

      if not have_not_finished_units:
        if contract_info.get('status')!='completed':
          contractmodel.update(
            {
              '_id': contract_info['_id']
            },
            {
              '$set':
              {
                'status' : 'completed',
                'status_date': last_finish_date
              }
            }
          )
      else:
        if contract_info.get('status')=='completed':
          contractmodel.update(
            {
              '_id': contract_info['_id']
            },
            {
              '$set':
              {
                'status' : '',
                'status_date': datetime.datetime.utcnow(),
              }
            }
          )
  except Exception, exc:
    print('Error! Function: close_contract_if_all_workorders_completed ' + str(exc))
    excType = exc.__class__.__name__
    print_exc()
    raise Exception(str(exc))


def close_workorder_if_all_works_completed(_ids, usr_email=""):
    '''
      Если все работы наряда завершены, то необходимо зафиксировать это на уровне наряда
      Иначе проставить наряду состояние открытого
      _ids - список id нарядов
    '''
    from models import workordermodel
    try:
      order_info = None
      for _id in _ids:
        order_info = workordermodel.get_by({'_id': _id})
        if order_info and 'plan_work' in order_info:
          completed_works_count = 0
          last_fact_date = None
          for plan_work in order_info['plan_work']:
            if plan_work['status'] != 'completed':
              break
            else:
              completed_works_count+=1
              if not last_fact_date or ('last_fact_date' in plan_work and last_fact_date<plan_work['last_fact_date']):
                last_fact_date=plan_work['last_fact_date']

          if len(order_info['plan_work']) == completed_works_count:
            if order_info.get('status')!="completed":
              cond={'_id':order_info['_id']}
              data = {"$set":
                {
                  "status": 'completed' ,
                  "status_date": last_fact_date,
                  'date_change': datetime.datetime.utcnow(),
                  'user_email': usr_email
                }
              }
              workordermodel.update(cond, data, True)
          else:
            if order_info.get('status')=="completed":
              cond={'_id':order_info['_id']}
              data = {"$set":
                {
                  "status": '' ,
                  "status_date": datetime.datetime.utcnow(),
                  'date_change': datetime.datetime.utcnow(),
                  'user_email': usr_email
                }
              }
              workordermodel.update(cond, data, True)
      # закрыть договор, если все наряды завершены
      if order_info:
        close_contract_if_all_workorders_completed(order_info['contract_number'], usr_email)
    except Exception, exc:
      print('Error! Function: close_workorder_if_all_works_completed ' + str(exc))
      excType = exc.__class__.__name__
      print_exc()
      raise Exception(str(exc))

def close_job_by_payment(payment_id, usr_email=""):
  '''
    #1108
    Функция для закрытия работы наряда, привязанной к платежу, нулевым фактом
    payment_id - id платежа. по которому необходимо закрыть работу наряда
  '''
  from models import workordermodel
  try:
    cur_date = datetime.datetime.today().replace(hour=0, minute=0, second=0, microsecond = 0)

    # получение информации о наряде и работе из БД
    cond={'plan_work.payment_id':ObjectId(payment_id)}
    fields = {'_id':1, 'number':1, 'plan_work.$':1}
    order_info = workordermodel.get_by(cond, fields)

    if order_info and order_info.get('plan_work') and order_info['plan_work'][0].get('status','')!='completed':
      fact_work = {
        '_id': ObjectId(),
        'date_change': datetime.datetime.utcnow(),
        'brigade_id': None,
        'date':cur_date,
        'user_email': usr_email,
        'scope': 0,
        'weekend': False,
        'auto_completed': True,
        'status': "completed",
        'note': 'Автоматически заврешена при удалении платежа.'
      }
      status_log_item = {
          '_id': ObjectId(),
          'date_change': datetime.datetime.utcnow(),
          'brigade_id': None,
          'date':cur_date,
          'user_email': usr_email,
          'reason_id': '',
          'reason': '',
          'reason_nodes': None,
          'note': 'Автоматически заврешена при удалении платежа.',
          'status': 'completed',
          'source': 'fact'
      }
      # сохранение в БД
      data = {"$set": {"plan_work.$.status": "completed", 'plan_work.$.status_date': cur_date, 'plan_work.$.last_fact_date': cur_date}}

      workordermodel.update(cond, data, True)
      data = {"$push":{"plan_work.$.status_log": status_log_item}}
      workordermodel.update(cond, data, True)
      data = {"$push":{"plan_work.$.fact_work": fact_work}}
      workordermodel.update(cond, data, True)
      # закрыть весь наряд, если все работы в нем завершены
      close_workorder_if_all_works_completed([order_info['_id']], usr_email)
  except Exception, exc:
    print('Error! Close job with zero fact. ' + str(exc))
    excType = exc.__class__.__name__
    print_exc()
    raise Exception(str(exc))

def remove_work_from_workorder(workorder_number, work_id, usr_email):
  '''
    Функция удаления работы из наряда.
    workorder_number - номер наряда
    work_id - идентификатор работы на удаление
  '''
  from models import workordermodel
  try:
    # получить наряд из БД
    new_works = [];
    order_info = workordermodel.get_by({'number': workorder_number})
    # найти удаляемую работу
    for work in order_info.get('plan_work', []):
      if(str(work['_id']) ==  str(work_id)):
        # если по работе есть факты, то удалить нельзя
        if work.get('fact_work',[]) and len(work.get('fact_work',[]))>0:
          raise Exception('По данной работе уже есть факты. Нельз удалить работу по которой были факты.')
      else:
        new_works.append(work)
    # если на наряде не осталось работ, то необходимо удалить весь наряд
    if len(new_works) == 0:
      workordermodel.remove(order_info['_id'])
    else:
      workordermodel.update({'_id': order_info['_id']}, {'$set': {'plan_work': new_works}})

    # закрыть/открыть весь наряд, если все работы в нем завершены
    close_workorder_if_all_works_completed([order_info['_id']], usr_email)

  except Exception, exc:
    print('Error! remove_work_from_workorder. ' + str(exc))
    excType = exc.__class__.__name__
    print_exc()
    raise Exception(str(exc))

def remove_workorder(number, usr_email):
  '''
    Функция удаления наряда.
    number - номер наряда
  '''
  from models import workordermodel
  try:
    # получить наряд из БД
    order_info = workordermodel.get_by({'number': number})
    # найти удаляемую работу
    for work in order_info.get('plan_work', []):
      # если по работе есть факты, то удалить нельзя
      if work.get('fact_work',[]) and len(work.get('fact_work',[]))>0:
        raise Exception('Данный наряд содержит работы по которым уже есть факты. Нельз удалить наряд по которому есть факты.')
    workordermodel.remove(order_info['_id'])

    # закрыть договор, если все наряды завершены
    close_contract_if_all_workorders_completed(order_info['contract_number'],usr_email)
  except Exception, exc:
    print('Error! remove_workorder. ' + str(exc))
    excType = exc.__class__.__name__
    print_exc()
    raise Exception(str(exc))

def send_newworkorders_email(numbers, usr_email, usr_fio):
  '''
    Рассылка уведомлений о новых нарядах
    numbers - список объектов номеров нарядов с номерами заказов
  '''
  from helpers import mailer
  from models import  sectormodel, noticemodel, usermodel, contractmodel
  try:
    usr = userlib.get_cur_user()
    # получить все участки и сгруппировать их по ID
    data = sectormodel.get_by({'is_active':1},{'_id':1,'code':1,'name':1,'type':1,})
    data_sectors = {}
    for sector_row in data:
      data_sectors[str(sector_row['_id'])] = sector_row

    # получаетли писем----------------------------------------
    notice_users = usermodel.get_list(
      {
        'notice.key': noticemodel.notice_keys['workorder_data']['key'],
        'stat': {'$ne':'disabled' }
      },
      { 'email':1, 'fio':1 }
    )
    # # добавение группы договора на оповещение
    # contract_group_info = contractmodel.get_google_group_info(numbers[0]['contract_number'])
    # if contract_group_info:
    #   notice_users.append({'email': contract_group_info['key'], 'fio': ''})
    # else:
    #   notice_users.append({'email': config.contracts_report_recepient, 'fio': ''})
    # ---------------------------------------------------------

    # вызвать функцию отправки сообщения
    # print('-------------SEND EMAIL--------------------')
    header = "Новые наряды: "
    numstr = ''
    numstr_txt = ''

    for item in numbers:
      key =  './'+str(item['contract_number']) + '/' + str(item['contract_number']) + '.' + str(item['production_number']) + '.' + str(item['unit_number']) + '/' + data_sectors[str(item['sector_id'])]['type'] + '/'+str(item['number'])

      numstr_txt = numstr_txt+('' if numstr_txt=='' else ',')+key
      #http://int.modul.org/timeline/#search=4281
      numstr += ('' if numstr=='' else ', ') + '<a href = "http://int.modul.org/timeline/#search='+key+'">'+key+'</a>'

    header = "Новые наряды: "+numstr_txt
    body = usr_fio+' ('+usr_email+') сообщает: <br/>' if usr_fio else usr_email + "сообщает: <br/>"
    body = body + "Созданы новые наряды: "+ numstr
    mailer.send(header,body,notice_users, True, usr_email)
  except Exception, e:
    print('Error! send_newworkorders_email. ' + str(e))
    print_exc()

def send_blanks_email(fileurl):
  '''
    Рассылка уведомлений о новых бланках
    fileurl - адрес на гугл диске, где созданы бланки
  '''
  from helpers import mailer
  from models import  sectormodel, noticemodel, usermodel
  try:
    usr = userlib.get_cur_user()
    notice_users = usermodel.get_list(
      {'notice.key': noticemodel.notice_keys['workorder_new_blanks']['key'], 'stat': {'$ne':'disabled' }},
      {'email':1,'fio':1}
    )
    # вызвать функцию отправки сообщения
    header = 'Созданы новые бланки'
    body = usr['fio']+' ('+usr['email']+') сообщает: \n' if 'fio' in usr else usr['email'] + "сообщает: \n"
    body = body + "Созданы новые бланки. Скачать можно по ссылке: "+fileurl
    mailer.send(header,body,notice_users)
  except Exception, e:
    print('Error! send_blanks_email. ' + str(e))
    print_exc()

def close_workorders(params, note, usr_email):
  '''
    #1138
    Закыть указанные наряды
    Закрываются все работы внутри наряда, затем наряд, затем проверка на необходимость закрытия всего договора
    params - список [{'_id', 'number'}]
    usr_email - почтовый адрес пользователя
    note - пометка
  '''
  from models import workordermodel
  try:
    contract_number = None # номер договора, который необходимо проверить на завершенность
    cur_date = datetime.datetime.today().replace(hour=0, minute=0, second=0, microsecond = 0)
    # получить список нарядов по входным параметрам
    wo_ids = [ObjectId(row['_id']) for row in params]
    wo_list_data = workordermodel.get_list_by({'_id': {'$in': wo_ids}}, {'_id':1, 'number':1, 'contract_number':1, 'plan_work':1, 'status':1, 'status_date':1, 'note':1})
    for wo_row in wo_list_data:
      contract_number = wo_row.get('contract_number')
      if wo_row.get('status') != 'completed' and len(wo_row.get('plan_work', []) or [] )>0:
        for w_row in wo_row.get('plan_work'):
          if w_row.get('status')!='completed':
            w_row['status'] = 'completed'
            w_row['status_date'] = cur_date
            w_row['last_fact_date'] = cur_date

            fact_work = {
              '_id': ObjectId(),
              'date_change': datetime.datetime.utcnow(),
              'brigade_id': None,
              'date':cur_date,
              'user_email': usr_email,
              'scope': 0,
              'weekend': False,
              'auto_completed': True,
              'status': "completed",
              'note': note
            }
            status_log_item = {
                '_id': ObjectId(),
                'date_change': datetime.datetime.utcnow(),
                'brigade_id': None,
                'date':cur_date,
                'user_email': usr_email,
                'reason_id': '',
                'reason': '',
                'reason_nodes': None,
                'note': note,
                'status': 'completed',
                'source': 'fact',
                'auto_completed': True
            }

            # добавление записи в лог статусов
            if len(w_row.get('status_log',[]) or [])==0:
              w_row['status_log'] = []
            w_row['status_log'].append(status_log_item)

            # добавление записи в факты
            if len(w_row.get('fact_work',[]) or [])==0:
              w_row['fact_work'] = []
            w_row['fact_work'].append(fact_work)

          # проставление статуса всему наряду
          wo_row['status'] = 'completed'
          wo_row['status_date'] = cur_date
          wo_row['date_change'] = datetime.datetime.utcnow()
          wo_row['user_email'] = usr_email
      # обновление наряда в БД
      workordermodel.update({'_id':wo_row['_id']}, {'$set': wo_row}, True)
    # закрыть договор, если все наряды завершены
    close_contract_if_all_workorders_completed(contract_number, usr_email)
  except Exception, exc:
    print('Error! Close job with zero fact. ' + str(exc))
    excType = exc.__class__.__name__
    print_exc()
    raise Exception(str(exc))

def transfer_fact(transfer_to_work, transfer_from, volume, note, usr_email):
  '''
    # 1141
    Перезачесть факт из одного наряда в другой
    transfer_to_work_id - id работы в наряде, на которую надо зачесть факт
    transfer_from - информаци о наряде и работе с которых необходимо забрать факт {'workorder_number', 'work_number'}
    volume - объем перезачета
    note - пометка
    usr_email - адрес менеджера
    ----------
    должны совпасть участки, единицы измерения, объем перезачета не должен превышать факт работы с который идет перезачет,
  '''
  from models import workordermodel
  from apis.contract import contractapi
  try:
    cur_date = datetime.datetime.today().replace(hour=0, minute=0, second=0, microsecond = 0)
    # получение информации о наряде в который будет идти перезачет
    transfer_to_workorder_data = workordermodel.get_by(
      {
        'plan_work._id': ObjectId(transfer_to_work['id'])
      },
      {
        'plan_work':1,
        'number':1,
        'sector_id': 1,
        'contract_id':1
      }
    )
    # получение информации о наряде и работе с которых необходимо сделать перезачет
    transfer_from_workorder_data = workordermodel.get_by(
      {
        'number': routine.strToInt(transfer_from['workorder_number']),
        'plan_work.code':routine.strToInt(transfer_from['work_number'])
      },
      {
        'plan_work':1,
        'number':1,
        'sector_id':1,
        'contract_id':1
      }
    )

    # проверка существования наряда
    if not transfer_from_workorder_data or len(transfer_from_workorder_data.get('plan_work',[]))==0:
      raise Exception('Не найден источник зачета.')

    # проверка существования указанной реботы в наряде
    try:
      transfer_from_work_data = (x for x in transfer_from_workorder_data['plan_work'] if x['code'] ==  routine.strToInt(transfer_from['work_number'])).next()
    except:
      raise Exception('Не найден источник зачета.')

    # получение работы на которую осуществляется перезачет
    try:
      transfer_to_work_data = (x for x in transfer_to_workorder_data['plan_work'] if x['code'] ==  routine.strToInt(transfer_to_work['code'])).next()
    except:
      raise Exception('Не найден приемник зачета.')

    # проверка на совпадение единиц измерения работ из которой перенос идет и в которую
    if transfer_to_work_data.get('unit','') != transfer_from_work_data.get('unit',''):
      raise Exception('Не совпадение единиц измерения работ участвующих в зачете.')

    # проверка на участки
    if str(transfer_to_workorder_data.get('sector_id')) != str(transfer_from_workorder_data['sector_id']):
      raise Exception('Работы, участвующие в зачете имеют разные единицы измерения.')

    # проверка объема
    volume = routine.strToFloat(volume)
    if not volume:
      raise Exception('Не задан объем зачета.')

    # проверка доступного объема факта у работы с которой происходит перезачет, если объекм факта недостаточен, то это ошибка
    transfer_from_work_summ_fact = 0
    for row in  transfer_from_work_data.get('fact_work',[]):
      transfer_from_work_summ_fact += row.get('scope',0)
    if volume>transfer_from_work_summ_fact:
      raise Exception('Недостаточно фактического объёма в источнике зачёта (откуда требуется зачесть).')
    transfer_to_work_summ_fact = 0
    for row in  transfer_to_work_data.get('fact_work',[]):
      transfer_to_work_summ_fact += row.get('scope',0)

    if not transfer_to_work_data.get('date_finish') or not transfer_to_work_data.get('date_start') or not transfer_from_work_data.get('date_finish') or not transfer_from_work_data.get('date_start'):
      raise Exception('Для работ, участвующих в зачёте, не заданы плановые даты.')

    #----------------------------------------------------------------------------------------------------------------------------------------------------
    # вычет факта из наряда
    # если план и факт совпадают, и работа не закрыта, то необходимо закрыть работу, иначе статус - on_work
    #----------------------------------------------------------------------------------------------------------------------------------------------------
    new_status = 'on_work'
    if transfer_from_work_data['scope'] == (transfer_from_work_summ_fact - volume):
      new_status = 'completed'
    transfer_from_work_data['status'] = new_status
    transfer_from_work_data['status_date'] = cur_date
    transfer_from_work_data['last_fact_date'] = cur_date
    fact_work = {
      '_id': ObjectId(),
      'date_change': datetime.datetime.utcnow(),
      'brigade_id': None,
      'date':cur_date,
      'user_email': usr_email,
      'scope': -volume,
      'weekend': False,
      'status': new_status,
      'note': note,
      'transfer_to': {
        'workorder_number': transfer_to_workorder_data['number'],
        'workorder_id': transfer_to_workorder_data['_id'],
        'work_number':  transfer_to_work_data['code'],
        'work_id':  transfer_to_work_data['_id']
      }

    }
    status_log_item = {
      '_id': ObjectId(),
      'date_change': datetime.datetime.utcnow(),
      'brigade_id': None,
      'date':cur_date,
      'user_email': usr_email,
      'reason_id': '',
      'reason': '',
      'reason_nodes': None,
      'note': note,
      'status': new_status,
      'source': 'fact'
    }
    # добавление записи в лог статусов
    if len(transfer_from_work_data.get('status_log',[]) or [])==0:
      transfer_from_work_data['status_log'] = []
    transfer_from_work_data['status_log'].append(status_log_item)
    # добавление записи в факты
    if len(transfer_from_work_data.get('fact_work',[]) or [])==0:
      transfer_from_work_data['fact_work'] = []
    transfer_from_work_data['fact_work'].append(fact_work)
    # сохранение в БД
    data = {'$set': {'plan_work.$': transfer_from_work_data}}
    cond={'plan_work._id':transfer_from_work_data['_id']}
    workordermodel.update(cond, data, True)

    # список фактов для обновления в
    pays_data = []
    # обновить факт в договорах
    pays_data.append({'contract_id': transfer_from_workorder_data['contract_id'], 'payment_id':transfer_from_work_data.get('payment_id'), 'date_start_with_shift': transfer_from_work_data.get('date_start_with_shift'), 'date_finish_with_shift':transfer_from_work_data.get('date_finish_with_shift'), 'date_start': transfer_from_work_data.get('date_start'), 'date_finish': transfer_from_work_data.get('date_finish'), 'fact_work': [fact_work] })

    # contractapi.add_fact_payments(pays_data, usr_email)

    # закрыть весь наряд, если все работы в нем завершены
    if not config.use_worker:
      close_workorder_if_all_works_completed([transfer_from_workorder_data['_id']], usr_email)
    else:
      config.qu_default.enqueue_call(func=close_workorder_if_all_works_completed, args=([transfer_from_workorder_data['_id']], usr_email))
    #----------------------------------------------------------------------------------------------------------------------------------

    #----------------------------------------------------------------------------------------------------------------------------------------------------
    # зачет факта в наряд
    # если план и факт совпадают, и работа не закрыта, то необходимо закрыть работу, иначе статус - on_work
    #----------------------------------------------------------------------------------------------------------------------------------------------------
    new_status = 'on_work'
    if transfer_to_work_data['scope'] == (transfer_to_work_summ_fact + volume):
      new_status = 'completed'
    transfer_to_work_data['status'] = new_status
    transfer_to_work_data['status_date'] = cur_date
    transfer_to_work_data['last_fact_date'] = cur_date
    fact_work = {
      '_id': ObjectId(),
      'date_change': datetime.datetime.utcnow(),
      'brigade_id': None,
      'date':cur_date,
      'user_email': usr_email,
      'scope': volume,
      'weekend': False,
      'status': new_status,
      'note': note,
      #'transfer_from_work': transfer_from_work_data['_id']
      'transfer_from': {
        'workorder_number': transfer_from_workorder_data['number'],
        'workorder_id': transfer_from_workorder_data['_id'],
        'work_number':  transfer_from_work_data['code'],
        'work_id':  transfer_from_work_data['_id']
      }
    }
    status_log_item = {
      '_id': ObjectId(),
      'date_change': datetime.datetime.utcnow(),
      'brigade_id': None,
      'date':cur_date,
      'user_email': usr_email,
      'reason_id': '',
      'reason': '',
      'reason_nodes': None,
      'note': note,
      'status': new_status,
      'source': 'fact'
    }
    # добавление записи в лог статусов
    if len(transfer_to_work_data.get('status_log',[]) or [])==0:
      transfer_to_work_data['status_log'] = []
    transfer_to_work_data['status_log'].append(status_log_item)
    # добавление записи в факты
    if len(transfer_to_work_data.get('fact_work',[]) or [])==0:
      transfer_to_work_data['fact_work'] = []
    transfer_to_work_data['fact_work'].append(fact_work)
    # сохранение в БД
    data = {'$set': {'plan_work.$': transfer_to_work_data}}
    cond={'plan_work._id':transfer_to_work_data['_id']}
    workordermodel.update(cond, data, True)

    # закрыть весь наряд, если все работы в нем завершены
    if not config.use_worker:
      close_workorder_if_all_works_completed([transfer_to_workorder_data['_id']], usr_email)
    else:
      config.qu_default.enqueue_call(func=close_workorder_if_all_works_completed, args=([transfer_to_workorder_data['_id']], usr_email))
    #------------------------------------------------------------------------------------------------------------------------------------------------------

    #----------------------------------------------------------------------------------------------------------------------------------------------------
    # обновить факт в договорах
    #----------------------------------------------------------------------------------------------------------------------------------------------------
    # print('before update facts')
    pays_data.append({'contract_id': transfer_to_workorder_data['contract_id'], 'payment_id':transfer_to_work_data.get('payment_id'), 'date_start_with_shift': transfer_to_work_data.get('date_start_with_shift'), 'date_finish_with_shift':transfer_to_work_data.get('date_finish_with_shift'), 'date_start': transfer_to_work_data.get('date_start'), 'date_finish': transfer_to_work_data.get('date_finish'), 'fact_work': [fact_work] })
    # print(routine.JSONEncoder().encode(pays_data) )
    contractapi.add_fact_payments(pays_data, usr_email)
    # print('after update facts')
  except Exception, exc:
    print('Error! Transfer fact from one work to another ' + str(exc))
    print_exc()
    raise Exception(str(exc))


def cancel_shift(shift_key, mail_header, comment, usr_email, usr_fio):
  '''
  Функция отмены переноса сроков по работам наряда.
  shift_key - уникальный ключ переноса
  mail_header - заголовок с которым необходимо отправить письмо
  '''
  from models import workordermodel, usermodel, noticemodel, contractmodel
  from apis.contract import contractapi
  from helpers import mailer
  try:
    if not shift_key:
      raise Exception('Не задан ключ переноса.')

    # цикл по алиасам собственных и договорных планов
    for als in ['','contract_plan_']:
      # получение по ключу нарядов и работ, отклонения по которым необходимо отменить
      cond = [
        {'$project':
          {
            '_id':1,
            'contract_id':1,
            'contract_number':1,
            'number':1,
            'production_id':1,
            'production_name':1,
            'production_number':1,
            als+'date_start_with_shift': 1,
            als+'date_finish_with_shift': 1,
            'plan_work':1,
          }
        },
        {'$unwind': '$plan_work'},
        {'$project':
          {
            '_id':1,
            'contract_id':1,
            'contract_number':1,
            'number':1,
            'production_id':1,
            'production_name':1,
            'production_number':1,
            als+'date_start_with_shift': 1,
            als+'date_finish_with_shift': 1,
            'plan_work_id':'$plan_work._id',
            'plan_work_code':'$plan_work.code',
            als+'plan_shifts':'$plan_work.'+als+'plan_shifts',
            als+'plan_work_date_start_with_shift':'$plan_work.'+als+'date_start_with_shift',
            als+'plan_work_date_finish_with_shift':'$plan_work.'+als+'date_finish_with_shift',
          }
        },
        {'$unwind': '$'+als+'plan_shifts'},
        {'$project':
          {
            '_id':1,
            'contract_id':1,
            'contract_number':1,
            'number':1,
            'production_id':1,
            'production_name':1,
            'production_number':1,
            als+'date_start_with_shift': 1,
            als+'date_finish_with_shift': 1,
            'plan_work_id':1,
            'plan_work_code':1,
            als+'plan_work_date_start_with_shift':1,
            als+'plan_work_date_finish_with_shift':1,
            als+'plan_shifts':1,
            als+'plan_shifts_group_key':'$'+als+'plan_shifts.group_key',
          }
        },
        {'$match': {als+'plan_shifts_group_key':shift_key}}
      ]
      transfers_res =  workordermodel.do_aggregate(cond)

      if transfers_res and len(transfers_res)>0:
        contract_number = transfers_res[0]['contract_number']

      # отмена переносов в БД и пересчет плановых дат работы и наряда в целом
      # группировка данных по нарядам
      grouped_data = {}
      for row in transfers_res:
        if(row['number'] not in grouped_data):
          grouped_data[row['number']] ={
            'info': {
              '_id': row['_id'],
              'number': row['number'],
              als+'date_start_with_shift': row[als+'date_start_with_shift'],
              als+'date_finish_with_shift': row[als+'date_finish_with_shift'],
              als+'new_date_start_with_shift': row[als+'date_start_with_shift'],
              als+'new_date_finish_with_shift': row[als+'date_finish_with_shift'],
            },
            'data':[]
          }
        grouped_data[row['number']]['data'].append(row)
        # выполнение отмены переносов
        planShift = row[als+'plan_shifts']
        curDateStart = row[als+'plan_work_date_start_with_shift']
        curDateFinish = row[als+'plan_work_date_finish_with_shift']
        if planShift['type']=='start':
          curDateStart = curDateStart - datetime.timedelta(days=planShift['shift'])
        elif planShift['type'] == 'finish':
          curDateFinish = curDateFinish - datetime.timedelta(days=planShift['shift'])
        else:
          curDateStart = curDateStart - datetime.timedelta(days=planShift['shift'])
          curDateFinish = curDateFinish - datetime.timedelta(days=planShift['shift'])
        row[als+'plan_work_new_date_start_with_shift'] = curDateStart
        row[als+'plan_work_new_date_finish_with_shift'] = curDateFinish
        if curDateStart < row[als+'date_start_with_shift']:
          grouped_data[row['number']]['info'][als+'new_date_start_with_shift'] = curDateStart
        if curDateFinish > row[als+'date_finish_with_shift']:
          grouped_data[row['number']]['info'][als+'new_date_finish_with_shift'] = curDateFinish

      # обновление данных в БД по каждому наряду
      for row_key in grouped_data:
        row = grouped_data[row_key]
        worder = workordermodel.get_by({'_id':row['info']['_id']})
        cond={'_id':row['info']['_id']}
        data = {
          '$set':{
            als+'date_start_with_shift': row['info'][als+'new_date_start_with_shift'],
            als+'date_finish_with_shift': row['info'][als+'new_date_finish_with_shift'],
          }
        }

        # обновление дат наряда
        workordermodel.update(cond, data, True)
        for plan_work_row in row['data']:
          planShift = plan_work_row[als+'plan_shifts']
          cond={'_id':row['info']['_id'], 'plan_work._id': plan_work_row['plan_work_id']}
          data = {
            '$set':{
              'plan_work.$.'+als+'date_start_with_shift': plan_work_row[als+'plan_work_new_date_start_with_shift'],
              'plan_work.$.'+als+'date_finish_with_shift': plan_work_row[als+'plan_work_new_date_finish_with_shift'],
            }
          }
          # обновление даты плановой работы
          workordermodel.update(cond, data, True)
          data = {'$push':{'plan_work.$.history': {
            'date': datetime.datetime.utcnow(),
            'user': usr_email,
            'type': 'cancel_'+als+'shift',
            'data': planShift,
            'note': comment
          }}}
          # запись информации в историю работы
          workordermodel.update(cond, data, True)
          # удаление записи из сека данных по переносам
          new_plan_shifts = []
          for wo_row in worder['plan_work']:
            if wo_row['_id'] == plan_work_row['plan_work_id']:
              for ps_row in wo_row[als+'plan_shifts']:
                if ps_row['_id'] !=planShift['_id']:
                  new_plan_shifts.append(ps_row)

          data = {'$set':{'plan_work.$.'+als+'plan_shifts': new_plan_shifts}}
          workordermodel.update(cond, data, True)

    # iss_1282 Отмена корректировки, сделанной по факту
    # найти все наряды, у которых plan_work содержит facts или status_log с указанным ключем
    wo_to_check = []
    dbWorkOrders = workordermodel.get({
      '$or':[
        {'plan_work.fact_work.group_key':shift_key},
        {'plan_work.status_log.group_key':shift_key},
        {'plan_work.workers_participation.group_key':shift_key},
      ]})

    for wo_row in dbWorkOrders:
      # сбор всех идентификаторов наряда для дальнейшей проверки
      wo_to_check.append(wo_row['_id'])
      for pw_row in wo_row.get('plan_work',[]):
        # списки для хранения обновленных данных
        new_fact_work = []
        new_workers_participation = []
        new_status_log = []
        # если есть факты
        if pw_row.get('fact_work') and len(pw_row.get('fact_work'))>0:
          # сортировка фактов по дате
          row['fact_work'].sort(key = lambda x: (x['date']))
          for row in pw_row['fact_work']:
            if row.get('group_key')!=shift_key:
              # если факт был по платежу, то необходимо это обработать
              new_fact_work.append(row)
        # если есть рабочее участие
        if pw_row.get('workers_participation') and len(pw_row.get('workers_participation'))>0:
          for row in pw_row['workers_participation']:
            if row.get('group_key')!=shift_key:
              new_workers_participation.append(row)
        # если есть запись в статусах
        if pw_row.get('status_log') and len(pw_row.get('status_log'))>0:
          for row in pw_row['status_log']:
            if row.get('group_key')!=shift_key:
              new_status_log.append(row)

        pw_row['fact_work'] = new_fact_work
        pw_row['workers_participation'] = new_workers_participation
        pw_row['status_log'] = new_status_log
        pw_row['status'] = new_status_log[-1]['status'] if len(new_status_log)>0 else ''

      # обновление данных в БД
      workordermodel.update({ '_id':wo_row['_id']},{'$set':{'plan_work': wo_row.get('plan_work',[])}}, True)
    # закрыть все отобранные наряды, если все работы в нем завершены
    if not config.use_worker:
      close_workorder_if_all_works_completed(wo_to_check, usr_email)
    else:
      config.qu_default.enqueue_call(func=close_workorder_if_all_works_completed, args=(wo_to_check, usr_email))
    #-----------------------------------------------------------------------------------------------
    # отправка уведомления на почту об отмене переносов
    if mail_header:
      notice_users = usermodel.get_list(
        {
          'notice.key': noticemodel.notice_keys['workorder_plan_shifts']['key'],
          'stat': {'$ne':'disabled' }
        },
        {'email':1,'fio':1}
      )
      # добавение группы договора на оповещение
      contract_group_info = contractmodel.get_google_group_info(contract_number)
      if contract_group_info:
        notice_users.append({'email': contract_group_info['key'], 'fio': ''})
      else:
        notice_users.append({'email': config.contracts_report_recepient, 'fio': ''})

      mail_body = usr_fio+' ('+usr_email+') отменил корректировку.' if usr_fio else usr_email + 'отменил корректировку.'
      mail_body +='<br><br>Примечание:<br> {0}'.format(comment.replace('\r\n', '<br/>'))
      mailer.send(mail_header, mail_body, notice_users, True, usr_email)

  except Exception, exc:
    print('Error! Cancel shift: {0}. Detail: {1}'.format(shift_key, str(exc)))
    excType = exc.__class__.__name__
    print_exc()
    raise Exception(str(exc))

def add_blanks(wObjList, usr_email):
  '''
  Функция добавления бланков в наряды
  wObjList - список идентификаторов нарядов
  '''
  from models import workordermodel, sectormodel
  from libraries import excellib
  try:
    # получить все наряды
    dbWorkOrders = workordermodel.get({'_id':{'$in':wObjList}},{'_id':1,'number':1,'contract_number':1, 'production_number':1, 'production_units':1, 'plan_work':1, 'sector_id':1})
    workOrders = []
    wSectIdList = []
    for dwo in dbWorkOrders:
      workOrders.append(dwo)
      if dwo['sector_id'] not in wSectIdList:
        wSectIdList.append(dwo['sector_id'])

    # вытащить сектора для нарядов
    dbSectList = sectormodel.get_sectors({'_id':{'$in':wSectIdList}})
    for s in dbSectList:
      for w in workOrders:
        if s['_id']==w['sector_id']:
          w['sector'] = s
          # заполняются значения для работ
          for pw in w['plan_work']:
            for sw in s['works']:
              if pw['work_id']==sw['_id']:
                pw['work'] = sw
                break
    # # создается XLS и скидывается на гуглдиск. результатом является ссылка на файл на гуглдиске
    # fileUrl = ''
    # fileUrl = excellib.make_workorder_blank(workOrders)
    # # пишется в базу созданный бланк
    # blank = {'date_change':datetime.datetime.utcnow(),'date':datetime.datetime.utcnow(),'_id':ObjectId(),'user_email':usr_email}
    # workordermodel.update({'_id':{'$in':wObjList}},{'$set':{'user_email':usr_email,'date_change':datetime.datetime.utcnow()},'$push':{'blanks':blank}},False,True)
    # # запуск фоновой рассылки уведомлений о новых бланках
    # if not config.use_worker:
    #   result = send_blanks_email(fileUrl)
    # else:
    #   config.qu_default.enqueue_call(func=send_blanks_email, args=(fileUrl,))
    # return fileUrl

    # пишется в базу созданный бланк
    blank = {
      'date_change':datetime.datetime.utcnow(),
      'date':datetime.datetime.utcnow(),
      '_id':ObjectId(),
      'user_email':usr_email
    }
    workordermodel.update({'_id':{'$in':wObjList}},{'$set':{
        'user_email':usr_email,
        'date_change':datetime.datetime.utcnow()
      },
      '$push' : {'blanks' : blank}
    },False,True)
    return excellib.make_workorder_blank(workOrders)
  except Exception, exc:
    print('Error! add_blanks. Detail: {0}'.format(str(exc)))
    print_exc()
    raise Exception(str(exc))

def check_reason_note_format(data, reason):
  '''
    Функция проверки корректности формата данных комментария к причине переноса сроков
  '''
  from models import workordermodel, sectormodel, planshiftreason

  try:
    cur_date = datetime.datetime.today().replace(hour=0, minute=0, second=0, microsecond = 0)
    if not data or len(data)==0:
      raise Exception('Не задано уточнение к причине переноса.')

    # группировка всех уточнений по нарядам и работам
    groupped_data = {}
    for row in data:
      if row['workorder_number'] not in groupped_data:
        groupped_data[row['workorder_number']] = []
      if row['work_code'] and row['work_code'] not in groupped_data[row['workorder_number']]:
        groupped_data[row['workorder_number']].append(row['work_code'])

    # получение из бд информации о работах и нарядах
    conds = []
    for item_number in groupped_data:
      tmp_cond = {'number': item_number}
      if len(groupped_data[item_number])>0:
        tmp_cond['plan_work_code'] = {'$in': groupped_data[item_number]}
      conds.append(tmp_cond)

    cond = [
      {"$project":
        {
          "contract_id":1,
          "contract_number":1,
          "number":1,
          "date_start_with_shift":1,
          "date_finish_with_shift":1,
          "contract_plan_date_start_with_shift":1,
          "contract_plan_date_finish_with_shift":1,
          "plan_work":1
        }
      },
      {"$match": {'number': {"$in":groupped_data.keys()} }},
      {"$unwind": "$plan_work"},
      {"$project":
        {
          "contract_id":"$contract_id",
          "contract_number":"$contract_number",
          "number":"$number",
          "date_start_with_shift": "$date_start_with_shift",
          "date_finish_with_shift": "$date_finish_with_shift",
          "plan_work_date_start_with_shift":"$plan_work.date_start_with_shift",
          "plan_work_date_finish_with_shift":"$plan_work.date_finish_with_shift",
          "contract_plan_date_start_with_shift": "$contract_plan_date_start_with_shift",
          "contract_plan_date_finish_with_shift": "$contract_plan_date_finish_with_shift",
          "plan_work_contract_plan_date_start_with_shift":"$plan_work.contract_plan_date_start_with_shift",
          "plan_work_contract_plan_date_finish_with_shift":"$plan_work.contract_plan_date_finish_with_shift",
          "plan_work_code": "$plan_work.code",
        }
      },
      {"$match": {'$or':conds}}
    ]

    db_res =  workordermodel.do_aggregate(cond)
    for row in data:
      data_item = None
      date_start = None
      date_finish = None
      contract_plan_date_start = None
      contract_plan_date_finish = None
      if row['work_code']:
        try:
          data_item =  (i for i in db_res if i['number'] == row['workorder_number'] and i['plan_work_code'] == row['work_code']).next()
          date_start = data_item['plan_work_date_start_with_shift']
          date_finish = data_item['plan_work_date_finish_with_shift']
          contract_plan_date_start = data_item['plan_work_contract_plan_date_start_with_shift']
          contract_plan_date_finish = data_item['plan_work_contract_plan_date_finish_with_shift']
        except:
          pass
      else:
        try:
          data_item =  (i for i in db_res if i['number'] == row['workorder_number']).next()
          date_start = data_item['date_start_with_shift']
          date_finish = data_item['date_finish_with_shift']
          contract_plan_date_start = data_item['contract_plan_date_start_with_shift']
          contract_plan_date_finish = data_item['contract_plan_date_finish_with_shift']
        except:
          pass

      # если элемент не найден, то ошибка
      if not data_item:
        raise Exception('Ошибка проверки формата уточнения к причине переноса. Убедитесь что все указанные наряды и работы корректны.')

      # try:
      #   # проверка работ на принадлежность к указанной причине
      #   if reason == planshiftreason.SYSTEM_OBJECTS['NOT_PLAN_WORK']:
      #     if date_start<=cur_date and date_finish>=cur_date:
      #       raise Exception('Среди работ, указанных в уточнении, есть работы, запланированные на указанную дату. Проверьте данные или выберите другую причину переноса плановых дат.')
      #   elif reason == planshiftreason.SYSTEM_OBJECTS['PLAN_WORK']:
      #     if not(date_start<=cur_date and date_finish>=cur_date):
      #       raise Exception('Среди работ, указанных в уточнении, есть работы, не запланированные на указанную дату. Проверьте данные или выберите другую причину переноса плановых дат.')
      # except:
      #   pass


  except Exception, exc:
    print('Error! :check_reason_note_format. Detail: {0}'.format(str(exc)))
    excType = exc.__class__.__name__
    print_exc()
    raise Exception(str(exc))

def add_workorder(data, usr_email):
  '''
    Функция добавления новых нарядов
  '''
  from models import workordermodel, sectormodel, contractmodel
  try:
    sectorsIds = []
    res = []
    unitsIds = []
    contractId=None
    data_to_send = [] # данные на рассылку

    # проверка на укрупненное планирование
    # если создаются наряды на направлении цех или монтаж, но еще не созданы наряды на участок 90 и 91, то это ошибка планирования
    # получить все существующие наряды по текущему заказу
    exists_workorders = workordermodel.get_list_by({'production_id': ObjectId(data[0]['production_id'])})
    if exists_workorders and len(exists_workorders)>0:
      is_ceh_plan_90 = False
      is_ceh_plan_other = False
      is_mon_plan_91 = False
      is_mon_plan_other = False

      for row in data:
        if row.get('type') == u'Цех':
          is_ceh_plan_other = True
        if routine.strToInt(row.get('sector_code'))==90:
          is_ceh_plan_90 = True

        if row.get('type') == u'Монтаж':
          is_mon_plan_other = True
        if routine.strToInt(row.get('sector_code'))==91:
          is_mon_plan_91 = True

      for row in exists_workorders:
        if row.get('sector_code') == 90:
          is_ceh_plan_90 = True
        if row.get('sector_code') == 91:
          is_mon_plan_91 = True

      if (is_ceh_plan_other and not is_ceh_plan_90) or (is_mon_plan_other and not is_mon_plan_91):
        raise Exception('Ошибка создания нарядов. Нет укрупнённого планирования.')

    for d in data:
      d['sector_id'] = ObjectId(d['sector_id'])
      if d['sector_id'] not in sectorsIds:
        sectorsIds.append(d['sector_id'])
      d['contract_id'] = ObjectId(d['contract_id'])
      contractId = ObjectId(d['contract_id'])
      d['production_id'] = ObjectId(d['production_id'])
      d['user_email'] = usr_email
      d['date_start'] = None
      d['date_finish'] = None
      d['contract_plan_date_start'] = None
      d['contract_plan_date_finish'] = None
      d['date_change'] = datetime.datetime.utcnow()
      d['number'] = countersmodel.get_next_sequence('workorders')
      d['status'] = ''
      d['status_date'] = None
      d['use_weekends'] = True
      d['need_notification'] = False
      d['use_conditional_date'] = False
      d['use_contract_plan'] = False
      d['people'] = 0
      d['auto_ktu'] = True
      for pu in d['production_units']:
        pu['unit_id'] = ObjectId(pu['unit_id'])
        unitsIds.append(ObjectId(pu['unit_id']))
        pu['production_id'] = ObjectId(pu['production_id'])
        pu['user_email'] = usr_email
        pu['date_change'] = datetime.datetime.utcnow()
      for pw in d['plan_work']:
        pw['_id'] = ObjectId()
        pw['work_id'] = ObjectId(pw['work_id'])
        pw['user_email'] = usr_email
        pw['date_change'] = datetime.datetime.utcnow()
        pw['status'] = ''
        pw['status_log'] = []
        pw['fact_work']=[]
        pw['date_start'] = None
        pw['date_finish'] = None
        pw['date_start_with_shift'] = None
        pw['date_finish_with_shift'] = None
        pw['use_weekends'] = True
        pw['use_conditional_date'] = False
        pw['need_notification'] = False
        pw['use_contract_plan'] = False
        pw['payment_id'] =  None
        pw['contract_plan_date_start'] = None
        pw['contract_plan_date_finish'] = None
        pw['contract_plan_date_start_with_shift'] = None
        pw['contract_plan_date_finish_with_shift'] = None
        pw['contract_plan_use_weekends'] = True
        pw['contract_plan_use_conditional_date'] = False
        pw['contract_plan_need_notification'] = False
        pw['is_unit_percent'] = True

      # добавление блока истории в наряд
      d['history'] = [
        {
          'date': datetime.datetime.utcnow(),
          'user': usr_email,
          'type': 'create'
        }
      ]
      res.append(workordermodel.add(d))

      # добавление данных на рассылку
      data_to_send.append({
        'contract_number': d['contract_number'],
        'production_number': d['production_number'],
        'unit_number': d['production_units'][0]['unit_number'],
        'sector_id': d['sector_id'],
        'number': d['number']
      })

    # запуск фоновой рассылки уведомлений о новых нарядах
    if not config.use_worker:
      result = send_newworkorders_email(data_to_send, usr_email,'')
    else:
      config.qu_default.enqueue_call(func=send_newworkorders_email, args=(data_to_send, usr_email,''))

    # получаем сектора
    sDBList = sectormodel.get_sectors({'_id':{'$in':sectorsIds}})
    sList = {}
    for s in sDBList:
      sList[str(s['_id'])] = s
    for d in res:
      # добавляем инфу о секторе
      so = sList[str(d['sector_id'])]
      d['sector'] = {'_id':so['_id'],'code':so['code'],'name':so['name']}
    # обновляем статусы unit-ов
    if contractId!=None:
      contract = contractmodel.get(contractId)
      isChanged = False
      # Если происходит добавление нарядов в договор, и договор закрыт
      # то необходимо сбросить флаг о завершенности договора
      if contract.get('status','') =='completed':
        contract['status'] = ''
        contract['status_date'] = None
        isChanged=True

      for p in contract['productions']:
        for u in p['units']:
          if u['_id'] in unitsIds and u['status']=='ready_to_develop':
            isChanged=True
            u['statuses'].append({'status':'develop','date_change':datetime.datetime.utcnow(),'user_email':usr_email})
            u['status']='develop'
            u['user_email'] = usr_email
            u['date_change'] = datetime.datetime.utcnow()
      if isChanged:
        del contract['_id']
        contractmodel.update({'_id':contractId},contract)
    return prepare_data(res)
  except Exception, exc:
    print('Error! : add_workorder. Detail: {0}'.format(str(exc)))
    excType = exc.__class__.__name__
    print_exc()
    raise Exception(str(exc))

def edit_workorder(data, workorder_id, usr_email):
  '''
    Функция редактирования существующего наряда
  '''
  from models import workordermodel, sectormodel, contractmodel
  try:
    res = {}
    wo = workordermodel.get_by({"_id": ObjectId(workorder_id)})
    if 'plan_work' not in wo:
      wo['plan_work'] = []
    is_changed = True

    # добавляются новые записи
    for j in data['plan_work']:
      res = {}
      res['_id'] = ObjectId()
      res['code'] = j['code']
      res['work_id'] = ObjectId(j["work_id"])
      res["status"] =''
      res['status_log'] = []
      res["date_finish"] = None
      res["date_start"] = None
      res['date_start_with_shift'] = None
      res['date_finish_with_shift'] = None
      res['date_change'] = datetime.datetime.utcnow()
      res['user_email'] = usr_email
      res['scope']=routine.strToFloat(j['scope'])
      res['is_unit_percent']=j.get('is_unit_percent',False)
      res['days_count']=j.get('days_count',1)
      res['payment_id'] =  j.get('payment_id')
      res['unit'] =  j.get('unit')
      res['use_contract_plan'] = False
      res["contract_plan_date_finish"] = None
      res["contract_plan_date_start"] = None
      res['contract_plan_date_start_with_shift'] = None
      res['contract_plan_date_finish_with_shift'] = None
      res['contract_plan_days_count']=j.get('contract_plan_days_count',0)
      res['settings'] = wo.get('settings')

      wo['plan_work'].append(res)
      is_changed = True
    # если были изменения в списке работ, то меняется и весь наряд
    if is_changed:
      wo['date_change'] = datetime.datetime.utcnow()
      wo['user_email'] = usr_email

      if 'history' in wo and wo['history'] and len(wo['history'])>0:
        wo['history'].append({
          'date': datetime.datetime.utcnow(),
          'user': usr_email,
          'type': 'change'
          })
      else:
        wo['history'] = [
          {
            'date': datetime.datetime.utcnow(),
            'user': usr_email,
            'type': 'change'
          }
        ]

    # запись данных в БД
    wid = wo['_id']
    del wo['_id']
    workordermodel.update({"_id":wid},{ '$set':wo},False)
    wo['_id'] = wid
    return prepare_data([wo])
  except Exception, exc:
    print('Error! : edit_workorder. Detail: {0}'.format(str(exc)))
    excType = exc.__class__.__name__
    print_exc()
    raise Exception(str(exc))


def get_global_group_dates(data_work_orders, sectors_info):
  '''
  data_work_orders - список нарядов в рамках которых надо сформировать структуру данных
  sectors_info - список участков, сгруппированных по ID = {}
  Результат функции получения сгруппированной по датам информации о нарядах
  Функция используется при сохранении плановых дат нарядов
  Выходным парамтером является структура дат, содержащая наряды: {наряд, участок, направление работ, заказ, договор}
  '''
  from models import workordermodel, sectormodel, contractmodel
  # результирующая переменная
  global_group_dates = {}
  # --------------------------------------------------------------------------------------------------------
  # построение структуры дат вида: договор/ заказ/ направление работ/ участок/ наряд-------------------------
  # --------------------------------------------------------------------------------------------------------
  # группировка данных по требуемой структуре
  for item in data_work_orders:
    if item.get('status')!='completed':
      # contract level
      contract_key = str(item['contract_number'])
      if contract_key not in global_group_dates:
        global_group_dates[contract_key] = {
          'key': contract_key,
          'info':{
            'date_start':item.get('date_start_with_shift'),
            'date_finish':item.get('date_finish_with_shift'),
            'new_date_start':item.get('date_start_with_shift'),
            'new_date_finish':item.get('date_finish_with_shift'),
            #-----
            'contract_plan_date_start':item.get('contract_plan_date_start_with_shift'),
            'contract_plan_date_finish':item.get('contract_plan_date_finish_with_shift'),
            'contract_plan_new_date_start':item.get('contract_plan_date_start_with_shift'),
            'contract_plan_new_date_finish':item.get('contract_plan_date_finish_with_shift'),
            'use_contract_plan': item.get('use_contract_plan',False),
            'important_level': False
          },
          'orders':{}
        }
      else:
        if item.get('date_start_with_shift') and (not global_group_dates[contract_key]['info']['date_start'] or item.get('date_start_with_shift')<global_group_dates[contract_key]['info']['date_start']):
            global_group_dates[contract_key]['info']['date_start'] = item.get('date_start_with_shift')
            global_group_dates[contract_key]['info']['new_date_start'] = item.get('date_start_with_shift')
        if item.get('date_finish_with_shift') and (not global_group_dates[contract_key]['info']['date_finish'] or item.get('date_finish_with_shift')>global_group_dates[contract_key]['info']['date_finish']):
          global_group_dates[contract_key]['info']['date_finish'] = item.get('date_finish_with_shift')
          global_group_dates[contract_key]['info']['new_date_finish'] = item.get('date_finish_with_shift')
        #-------
        if item.get('contract_plan_date_start_with_shift') and (not global_group_dates[contract_key]['info']['contract_plan_date_start'] or item.get('contract_plan_date_start_with_shift')<global_group_dates[contract_key]['info']['contract_plan_date_start']):
            global_group_dates[contract_key]['info']['contract_plan_date_start'] = item.get('contract_plan_date_start_with_shift')
            global_group_dates[contract_key]['info']['contract_plan_new_date_start'] = item.get('contract_plan_date_start_with_shift')
        if item.get('contract_plan_date_finish_with_shift') and (not global_group_dates[contract_key]['info']['contract_plan_date_finish'] or item.get('contract_plan_date_finish_with_shift')>global_group_dates[contract_key]['info']['contract_plan_date_finish']):
          global_group_dates[contract_key]['info']['contract_plan_date_finish'] = item.get('contract_plan_date_finish_with_shift')
          global_group_dates[contract_key]['info']['contract_plan_new_date_finish'] = item.get('contract_plan_date_finish_with_shift')

      # order level
      orders = global_group_dates[contract_key]['orders']
      order_key = '{0}.{1}.{2}'.format(str(contract_key), str(item['production_number']), str(item['production_units'][0]['unit_number']))
      if order_key not in orders:
        orders[order_key] = {
          'key': order_key,
          'info': {
            'date_start':item.get('date_start_with_shift'),
            'date_finish':item.get('date_finish_with_shift'),
            'new_date_start':item.get('date_start_with_shift'),
            'new_date_finish':item.get('date_finish_with_shift'),
            #----
            'contract_plan_date_start':item.get('contract_plan_date_start_with_shift'),
            'contract_plan_date_finish':item.get('contract_plan_date_finish_with_shift'),
            'contract_plan_new_date_start':item.get('contract_plan_date_start_with_shift'),
            'contract_plan_new_date_finish':item.get('contract_plan_date_finish_with_shift'),
            'use_contract_plan': item.get('use_contract_plan',False),
            'important_level': False
          },
          'sector_types':{}
        }
      else:
        if item.get('date_start_with_shift') and (not orders[order_key]['info']['date_start'] or item.get('date_start_with_shift')<orders[order_key]['info']['date_start']):
          orders[order_key]['info']['date_start'] = item.get('date_start_with_shift')
          orders[order_key]['info']['new_date_start'] = item.get('date_start_with_shift')
        if item.get('date_finish_with_shift') and (not orders[order_key]['info']['date_finish'] or item.get('date_finish_with_shift')>orders[order_key]['info']['date_finish']):
          orders[order_key]['info']['date_finish'] = item.get('date_finish_with_shift')
          orders[order_key]['info']['new_date_finish'] = item.get('date_finish_with_shift')
        #----
        if item.get('contract_plan_date_start_with_shift') and (not orders[order_key]['info']['contract_plan_date_start'] or item.get('contract_plan_date_start_with_shift')<orders[order_key]['info']['contract_plan_date_start']):
          orders[order_key]['info']['contract_plan_date_start'] = item.get('contract_plan_date_start_with_shift')
          orders[order_key]['info']['contract_plan_new_date_start'] = item.get('contract_plan_date_start_with_shift')
        if item.get('contract_plan_date_finish_with_shift') and (not orders[order_key]['info']['contract_plan_date_finish'] or item.get('contract_plan_date_finish_with_shift')>orders[order_key]['info']['contract_plan_date_finish']):
          orders[order_key]['info']['contract_plan_date_finish'] = item.get('contract_plan_date_finish_with_shift')
          orders[order_key]['info']['contract_plan_new_date_finish'] = item.get('contract_plan_date_finish_with_shift')

      # sector type level
      sector_types = orders[order_key]['sector_types']
      sector_type_name = sectors_info[str(item['sector_id'])]['type']
      if sector_type_name not in sector_types:
        sector_types[sector_type_name] = {
          'key': sector_type_name,
          'info': {
            'date_start':item.get('date_start_with_shift'),
            'date_finish':item.get('date_finish_with_shift'),
            'new_date_start':item.get('date_start_with_shift'),
            'new_date_finish':item.get('date_finish_with_shift'),
            #----
            'contract_plan_date_start':item.get('contract_plan_date_start_with_shift'),
            'contract_plan_date_finish':item.get('contract_plan_date_finish_with_shift'),
            'contract_plan_new_date_start':item.get('contract_plan_date_start_with_shift'),
            'contract_plan_new_date_finish':item.get('contract_plan_date_finish_with_shift'),
            'use_contract_plan': item.get('use_contract_plan',False),
            'important_level': False

          },
          'sectors': {}
        }
      else:
        if item.get('date_start_with_shift') and (not sector_types[sector_type_name]['info']['date_start'] or item.get('date_start_with_shift')<sector_types[sector_type_name]['info']['date_start']):
          sector_types[sector_type_name]['info']['date_start'] = item.get('date_start_with_shift')
          sector_types[sector_type_name]['info']['new_date_start'] = item.get('date_start_with_shift')
        if item.get('date_finish_with_shift') and (not sector_types[sector_type_name]['info']['date_finish'] or item.get('date_finish_with_shift')>sector_types[sector_type_name]['info']['date_finish']):
          sector_types[sector_type_name]['info']['date_finish'] = item.get('date_finish_with_shift')
          sector_types[sector_type_name]['info']['new_date_finish'] = item.get('date_finish_with_shift')
        #------
        if item.get('contract_plan_date_start_with_shift') and (not sector_types[sector_type_name]['info']['contract_plan_date_start'] or item.get('contract_plan_date_start_with_shift')<sector_types[sector_type_name]['info']['contract_plan_date_start']):
          sector_types[sector_type_name]['info']['contract_plan_date_start'] = item.get('contract_plan_date_start_with_shift')
          sector_types[sector_type_name]['info']['contract_plan_new_date_start'] = item.get('contract_plan_date_start_with_shift')
        if item.get('contract_plan_date_finish_with_shift') and (not sector_types[sector_type_name]['info']['contract_plan_date_finish'] or item.get('contract_plan_date_finish_with_shift')>sector_types[sector_type_name]['info']['contract_plan_date_finish']):
          sector_types[sector_type_name]['info']['contract_plan_date_finish'] = item.get('contract_plan_date_finish_with_shift')
          sector_types[sector_type_name]['info']['contract_plan_new_date_finish'] = item.get('contract_plan_date_finish_with_shift')

      # sector level
      sectors = sector_types[sector_type_name]['sectors']
      sector_key = str(item['sector_id'])
      if sector_key not in sectors:
        sectors[sector_key] = {
          'key': sector_key,
          'info': {
            'date_start':item.get('date_start_with_shift'),
            'date_finish':item.get('date_finish_with_shift'),
            'new_date_start':item.get('date_start_with_shift'),
            'new_date_finish':item.get('date_finish_with_shift'),
            'code': sectors_info[str(item['sector_id'])]['code'],
            'name': sectors_info[str(item['sector_id'])]['name'],
            'type': sector_type_name,
            #----
            'contract_plan_date_start':item.get('contract_plan_date_start_with_shift'),
            'contract_plan_date_finish':item.get('contract_plan_date_finish_with_shift'),
            'contract_plan_new_date_start':item.get('contract_plan_date_start_with_shift'),
            'contract_plan_new_date_finish':item.get('contract_plan_date_finish_with_shift'),
            'use_contract_plan': item.get('use_contract_plan',False),
            'important_level': False
          },
          'work_orders': {}
        }
      else:
        if item.get('date_start_with_shift') and (not sectors[sector_key]['info']['date_start'] or item.get('date_start_with_shift')<sectors[sector_key]['info']['date_start']):
          sectors[sector_key]['info']['date_start'] = item.get('date_start_with_shift')
          sectors[sector_key]['info']['new_date_start'] = item.get('date_start_with_shift')
        if item.get('date_finish_with_shift') and (not sectors[sector_key]['info']['date_finish'] or item.get('date_finish_with_shift')>sectors[sector_key]['info']['date_finish']):
          sectors[sector_key]['info']['date_finish'] = item.get('date_finish_with_shift')
          sectors[sector_key]['info']['new_date_finish'] = item.get('date_finish_with_shift')
        #-------------
        if item.get('contract_plan_date_start_with_shift') and (not sectors[sector_key]['info']['contract_plan_date_start'] or item.get('contract_plan_date_start_with_shift')<sectors[sector_key]['info']['contract_plan_date_start']):
          sectors[sector_key]['info']['contract_plan_date_start'] = item.get('contract_plan_date_start_with_shift')
          sectors[sector_key]['info']['contract_plan_new_date_start'] = item.get('contract_plan_date_start_with_shift')
        if item.get('contract_plan_date_finish_with_shift') and (not sectors[sector_key]['info']['contract_plan_date_finish'] or item.get('contract_plan_date_finish_with_shift')>sectors[sector_key]['info']['contract_plan_date_finish']):
          sectors[sector_key]['info']['contract_plan_date_finish'] = item.get('contract_plan_date_finish_with_shift')
          sectors[sector_key]['info']['contract_plan_new_date_finish'] = item.get('contract_plan_date_finish_with_shift')

      # work order level
      work_orders = sectors[sector_key]['work_orders']
      work_order_key = str(routine.strToInt(item['number']))
      if work_order_key not in work_orders:
        work_orders[work_order_key] = {
          'key': work_order_key,
          'info': {
            'date_start':item.get('date_start_with_shift'),
            'date_finish':item.get('date_finish_with_shift'),
            'new_date_start':item.get('date_start_with_shift'),
            'new_date_finish':item.get('date_finish_with_shift'),
            #----
            'contract_plan_date_start':item.get('contract_plan_date_start_with_shift'),
            'contract_plan_date_finish':item.get('contract_plan_date_finish_with_shift'),
            'contract_plan_new_date_start':item.get('contract_plan_date_start_with_shift'),
            'contract_plan_new_date_finish':item.get('contract_plan_date_finish_with_shift'),
            'use_contract_plan': item.get('use_contract_plan',False),
            'important_level': len(item.get('plan_work',[]))>1
          },
          'locked': item.get('locked', False),
          'use_weekends': item.get('use_weekends', False),
          'use_conditional_date': item.get('use_conditional_date',False),
          #----
          'contract_plan_locked': item.get('contract_plan_locked', False),
          'contract_plan_use_weekends': item.get('contract_plan_use_weekends', False),
          'contract_plan_use_conditional_date': item.get('contract_plan_use_conditional_date',False),
          'use_contract_plan': item.get('use_contract_plan',False),
          'plan_work': item.get('plan_work',[])
        }

        # если в наряде не одна работа, то всю ветку считаем важной.
        if len(item.get('plan_work',[]))>1:
          global_group_dates[contract_key]['info']['important_level'] = True
          orders[order_key]['info']['important_level'] = True
          sector_types[sector_type_name]['info']['important_level'] = True
          sectors[sector_key]['info']['important_level'] = True


      else:
        if item.get('date_start_with_shift') and (not work_orders[work_order_key]['info']['date_start'] or item.get('date_start_with_shift')<work_orders[work_order_key]['info']['date_start']):
          work_orders[work_order_key]['info']['date_start'] = item.get('date_start_with_shift')
          work_orders[work_order_key]['info']['new_date_start'] = item.get('date_start_with_shift')
        if item.get('date_finish_with_shift') and (not work_orders[work_order_key]['info']['date_finish'] or item.get('date_finish_with_shift')>work_orders[work_order_key]['info']['date_finish']):
          work_orders[work_order_key]['info']['date_finish'] = item.get('date_finish_with_shift')
          work_orders[work_order_key]['info']['new_date_finish'] = item.get('date_finish_with_shift')
        #-----
        if item.get('contract_plan_date_start_with_shift') and (not work_orders[work_order_key]['info']['contract_plan_date_start'] or item.get('contract_plan_date_start_with_shift')<work_orders[work_order_key]['info']['contract_plan_date_start']):
          work_orders[work_order_key]['info']['contract_plan_date_start'] = item.get('contract_plan_date_start_with_shift')
          work_orders[work_order_key]['info']['contract_plan_new_date_start'] = item.get('contract_plan_date_start_with_shift')
        if item.get('contract_plan_date_finish_with_shift') and (not work_orders[work_order_key]['info']['contract_plan_date_finish'] or item.get('contract_plan_date_finish_with_shift')>work_orders[work_order_key]['info']['contract_plan_date_finish']):
          work_orders[work_order_key]['info']['contract_plan_date_finish'] = item.get('contract_plan_date_finish_with_shift')
          work_orders[work_order_key]['info']['contract_plan_new_date_finish'] = item.get('contract_plan_date_finish_with_shift')

  return global_group_dates

def recalculate_workorders_dates (data_work_orders):
  '''
  data_work_orders - список нарядов в рамках которых надо сформировать структуру данных
  Функция выполняет пересчет плановых дат всех нарядов поданных на вход, используя даты их работ

  Функция обновляет поданные на вход данные, а также возвращает минимальную и максимальную
  дату по всем нарядам, поданным на вход
  '''
  result = {
    'date_start': None,
    'date_finish': None,
    'date_start_with_shift': None,
    'date_finish_with_shift': None,
    'contract_plan_date_start': None,
    'contract_plan_date_finish': None,
    'contract_plan_date_start_with_shift': None,
    'contract_plan_date_finish_with_shift': None,
  }

  if data_work_orders and len(data_work_orders)>0:
    for als in ['','contract_plan_']:
      for wo_row in data_work_orders:
        try:
          min_date =None
          max_date =None
          min_date_with_shift =None
          max_date_with_shift =None
          for pw_row in wo_row.get('plan_work',[]) or []:
            try:
              if pw_row.get(als+'date_start') and(not min_date or min_date > pw_row.get(als+'date_start')):
                min_date = pw_row.get(als+'date_start')
              if pw_row.get(als+'date_finish') and(not max_date or max_date < pw_row.get(als+'date_finish')):
                max_date = pw_row.get(als+'date_finish')
              if pw_row.get(als+'date_start_with_shift') and(not min_date_with_shift or min_date_with_shift > pw_row.get(als+'date_start_with_shift')):
                min_date_with_shift = pw_row.get(als+'date_start_with_shift')
              if pw_row.get(als+'date_finish_with_shift') and(not max_date_with_shift or max_date_with_shift < pw_row.get(als+'date_finish_with_shift')):
                max_date_with_shift = pw_row.get(als+'date_finish_with_shift')
            except Exception, lexc:
              print_exc()
              pass

          # обновение дат наряда
          wo_row[als+'date_start'] = min_date
          wo_row[als+'date_finish'] = max_date
          wo_row[als+'date_start_with_shift'] = min_date_with_shift
          wo_row[als+'date_finish_with_shift'] = max_date_with_shift

          # обновление результирующих дат
          if min_date and(not result.get(als+'date_start') or result.get(als+'date_start')>min_date):
            result[als+'date_start'] = min_date
          if max_date and(not result.get(als+'date_finish') or result.get(als+'date_finish')<max_date):
            result[als+'date_finish'] = max_date
          if min_date_with_shift and(not result.get(als+'date_start_with_shift') or result.get(als+'date_start_with_shift')>min_date_with_shift):
            result[als+'date_start_with_shift'] = min_date_with_shift
          if max_date_with_shift and(not result.get(als+'date_finish_with_shift') or result.get(als+'date_finish_with_shift')<max_date_with_shift):
            result[als+'date_finish_with_shift'] = max_date_with_shift
        except Exception, wexc:
          print_exc()
          pass
  return result

def check_on_enlarged_plans(global_group_dates, work_orders_to_save, sectors_info):
  '''
   Блок проверки, iss: #319(Запрет вылезать за укрупненное планирование)--------------------------------------------------
   Даты работ и нарядов не могут выходить за залоченные даты укрупненного планирования
   проверка ведется в рамках всего договора + учитываются  только поданные на сохранение наряды
   global_group_dates - договор/ заказ/ направление работ/ участок/ наряд-------------------------
   work_orders_to_save - наряды поданные на сохранение
   sectors_info - информация об участках
  '''
  try:
    # участки укрупненного планирования
    tmp_big_sectors = {'5433ec915174c35412f29ddd':{'code': 90, 'type': u'Цех', '_id': '5433ec915174c35412f29ddd'},'5433ec915174c35412f29ddc':{'code': 91, 'type': u'Монтаж', '_id': '5433ec915174c35412f29ddc'}}
    for wo_row in work_orders_to_save:

      # сам укрупненный наряд проверять не нужно
      if str(wo_row['sector_id']) not in tmp_big_sectors:
        # получение дат для урупненного планирования из глобальной структуры дат
        enlarge_sector_info =None
        order_key = '{0}.{1}.{2}'.format(str(wo_row['contract_number']), str(wo_row['production_number']), str(wo_row['production_units'][0]['unit_number']))
        for big_sector_row in tmp_big_sectors.values():
          try:
            enlarge_sector_info = global_group_dates[str(wo_row['contract_number'])]['orders'][order_key]['sector_types'] [sectors_info[str(wo_row['sector_id'])]['type']]['sectors'].get(big_sector_row['_id'])
            if enlarge_sector_info:
              break
          except:
            pass

        # собственное планирование
        if enlarge_sector_info and wo_row.get('date_start_with_shift') and wo_row.get('date_finish_with_shift') and ((enlarge_sector_info['info'].get('new_date_start') and enlarge_sector_info['info'].get('new_date_start')>wo_row.get('date_start_with_shift')) or (enlarge_sector_info['info'].get('new_date_finish') and enlarge_sector_info['info'].get('new_date_finish')<wo_row.get('date_finish_with_shift'))):
          raise Exception('Ошибка нашего планирования! Наряд: {0}, выходит за пределы допустимых дат укрупненного планирования по направлению работ: "{1}".'.format(routine.strToInt(wo_row['number']), u''+sectors_info[str(wo_row['sector_id'])]['type']))

        # планирование по договору
        if enlarge_sector_info and wo_row.get('use_contract_plan') and wo_row.get('contract_plan_date_start_with_shift') and wo_row.get('contract_plan_date_finish_with_shift') and ((enlarge_sector_info['info'].get('contract_plan_new_date_start') and enlarge_sector_info['info'].get('contract_plan_new_date_start')>wo_row.get('contract_plan_date_start_with_shift')) or(enlarge_sector_info['info'].get('contract_plan_new_date_finish') and enlarge_sector_info['info'].get('contract_plan_new_date_finish')<wo_row.get('contract_plan_date_finish_with_shift'))):
          raise Exception('Ошибка договорного планирования! Наряд: {0}, выходит за пределы допустимых дат укрупненного планирования по направлению работ: "{1}".'.format(routine.strToInt(wo_row['number']), u''+sectors_info[str(wo_row['sector_id'])]['type']))

  except Exception, exc:
    print('Error!: check_on_enlarged_plans. Detail: {0}'.format(str(exc)))
    excType = exc.__class__.__name__
    print_exc()
    raise Exception(str(exc))

def get_workorders_all_levels_count(data, sectors_info):
  '''
  получить количества объектов на разных уровнях структуры договора
  речь идет о том сколько заказов в договоре, сколько направлений работ в каждом заказе
  сколько участков в каждом направлении, сколько нарядов в каждом участке
  сколько работ в каждом наряде
  data - список нарядов с работами
  sectors_info - список участков
  '''
  result = {}

  for wo_row in data:
    # ключ заказа
    order_key = '{0}.{1}.{2}'.format(str(wo_row['contract_number']), str(wo_row['production_number']), str(wo_row['production_units'][0]['unit_number']))
    # участок
    sector = sectors_info.get(str(wo_row.get('sector_id')))
    # направление работ
    sector_type = sector['type']

    # уровень заказа
    if not order_key in result:
      result[order_key] = {'key': order_key, 'items':{}, 'count':0}
    line_sector_types = result[order_key]
    # уровень направления работ
    if not sector_type in line_sector_types['items']:
      line_sector_types['count']+=1
      line_sector_types['items'][sector_type] = {'key': sector_type, 'items': {}, 'count': 0}
    line_sectors = line_sector_types['items'][sector_type]
    # уровень участка
    if not str(sector['_id']) in line_sectors['items']:
      line_sectors['items'][str(sector['_id'])] = {'key': str(sector['_id']), 'items': {}, 'count':0}
      line_sectors['count']+=1
    line_work_orders = line_sectors['items'][str(sector['_id'])]
    # уровень наряда
    if not routine.strToInt(wo_row['number']) in line_work_orders['items']:
      line_work_orders['items'][routine.strToInt(wo_row['number'])] = {'key': routine.strToInt(wo_row['number']), 'count': 0}
      line_work_orders['count']+=1

    line_works = line_work_orders['items'][routine.strToInt(wo_row['number'])]
    line_works['count'] = len(wo_row.get('plan_work',[]))

    # # уровень работы
    # for w_row in wo_row.get('plan_work',[]):
    #   if not w_row['code'] in line_works[]
    #   line_work_orders[routine.strToInt(wo_row['number'])]['count']+=1
  return result

def update_global_group_dates(work_orders_data, global_group_dates, sectors_info):
  '''
  Обновление новых дат в глобальной структуре плановых дат в рамках договора
  фиксация изменений дат  в глобальной структуре договор-заказ-направление работ-участок-наряд---
  данная фиксация необходимо, чтобы в последствии определить на что повлияло изменение плановых дат
  work_orders_data - список нарядов с обновленными датами
  global_group_dates - глобальная структура дат
  '''
  try:
    for wo_row in work_orders_data:
      if wo_row.get('status')!='completed':
        contract_key = str(wo_row['contract_number'])
        # ключ заказа
        order_key = '{0}.{1}.{2}'.format(str(wo_row['contract_number']), str(wo_row['production_number']), str(wo_row['production_units'][0]['unit_number']))
        # участок
        sector = sectors_info.get(str(wo_row.get('sector_id')))
        sector_key = str(wo_row.get('sector_id'))
        # направление работ
        sector_type_name = sector['type']
        work_order_key = str(routine.strToInt(wo_row['number']))

        for als in ['','contract_plan_']:
          min_date_with_shift = wo_row.get(als+'date_start_with_shift')
          max_date_with_shift = wo_row.get(als+'date_finish_with_shift')
          g_contract = global_group_dates[contract_key]
          if g_contract['info'][als+'date_start'] and min_date_with_shift and min_date_with_shift< g_contract['info'][als+'date_start']:
            g_contract['info'][als+'new_date_start'] = min_date_with_shift
          if g_contract['info'][als+'date_finish'] and max_date_with_shift and max_date_with_shift>g_contract['info'][als+'date_finish']:
            g_contract['info'][als+'new_date_finish'] = max_date_with_shift
          # order
          if order_key in g_contract['orders']:
            g_order = g_contract['orders'][order_key]
            if g_order['info'][als+'date_start'] and min_date_with_shift and min_date_with_shift< g_order['info'][als+'date_start']:
              g_order['info'][als+'new_date_start'] = min_date_with_shift
            if g_order['info'][als+'date_finish'] and max_date_with_shift and max_date_with_shift>g_order['info'][als+'date_finish']:
              g_order['info'][als+'new_date_finish'] = max_date_with_shift
            # sector type
            if sector_type_name  in g_order['sector_types']:
              g_sector_type = g_order['sector_types'][sector_type_name]
              if g_sector_type['info'][als+'date_start'] and min_date_with_shift and min_date_with_shift< g_sector_type['info'][als+'date_start']:
                g_sector_type['info'][als+'new_date_start'] = min_date_with_shift
              if g_sector_type['info'][als+'date_finish'] and max_date_with_shift and max_date_with_shift>g_sector_type['info'][als+'date_finish']:
                g_sector_type['info'][als+'new_date_finish'] = max_date_with_shift
              # sector
              if sector_key in g_sector_type['sectors']:
                g_sector = g_sector_type['sectors'][sector_key]
                if g_sector['info'][als+'date_start'] and min_date_with_shift and min_date_with_shift< g_sector['info'][als+'date_start']:
                  g_sector['info'][als+'new_date_start'] = min_date_with_shift
                if g_sector['info'][als+'date_finish'] and max_date_with_shift and max_date_with_shift>g_sector['info'][als+'date_finish']:
                  g_sector['info'][als+'new_date_finish'] = max_date_with_shift
                # work order
                if work_order_key in g_sector['work_orders']:
                  g_work_order = g_sector['work_orders'][work_order_key]
                  if g_work_order['info'][als+'date_start'] and min_date_with_shift and min_date_with_shift< g_work_order['info'][als+'date_start']:
                    g_work_order['info'][als+'new_date_start'] = min_date_with_shift
                  if g_work_order['info'][als+'date_finish'] and max_date_with_shift and max_date_with_shift>g_work_order['info'][als+'date_finish']:
                    g_work_order['info'][als+'new_date_finish'] = max_date_with_shift

  except Exception, exc:
    print('Error!: update_global_group_dates. Detail: {0}'.format(str(exc)))
    excType = exc.__class__.__name__
    print_exc()
    #raise Exception(str(exc))

def prepare_and_send_workorders_transfers_info(group_key, data_to_save, new_work_orders_data, linked_tasks, contract_plan_linked_tasks, global_group_dates,sectors_info, data_works, usr_email, usr_fio):
  '''
    Отправлка почтового уведомления о произошедших сдвигах по датам нарядов после переносов
  '''
  try:
    from helpers import mailer
    # print('-------------')
    # print('mailer.send:{0}'.format(usr_email if usr_email else 'no email'))

    # получение данных на отправку
    data = get_workorders_transfers_info(
      group_key,
      data_to_save,
      new_work_orders_data,
      linked_tasks,
      contract_plan_linked_tasks,
      global_group_dates,
      sectors_info, data_works,
      usr_email,
      usr_fio
    )
    if data:
      # print('mailer.send:{0}'.format(usr_email if usr_email else 'no email'))
      # print('-------------')
      mailer.send(
        data['mail_header'].replace(u'[ГПР]',u'[ГПР] Важно!'),
        data['mail_user'] + data['mail_body'] +data['linked_tasks_msg']+data['contract_plan_linked_tasks_msg']+data['cancel_button'],
        data['notice_users'],
        True,
        usr_email
      )
  except Exception, exc:
    print('Error!: prepare_and_send_workorders_transfers_info. Detail: {0}'.format(str(exc)))
    excType = exc.__class__.__name__
    print_exc()
    raise Exception(str(exc))



def get_workorders_transfers_info(group_key, data_to_save, new_work_orders_data, linked_tasks, contract_plan_linked_tasks, global_group_dates,sectors_info, data_works, usr_email, usr_fio):
  '''
    Подготовка и отправка сообщения о переносе сроков по плановым датам наряда
    data_to_save - исходные данные на сохранение
    new_work_orders_data - все наряды врамках договора с обновленными датами
    linked_tasks - задачи, которые связанны с сохраняемыми
    contract_plan_linked_tasks - договорные задачи, связанные с сохраняемыми
    global_group_dates - глоальная структура с датами по всему договору [наряд, участок, направление работ, заказ, договор]
    usr_email - адрес менеджера
    usr_fio - фио менеджера
    sectors_info - справочник участков
  '''
  from models import noticemodel, usermodel, contractmodel
  from helpers import mailer
  try:
    # результирующий объект с информацией о переносе
    transfer_result_info = {
      'transfer_contracts':[],
      'transfer_orders': [], # все номера заказов, в рамках которых произошла корректировка сроков
      'transfer_sector_types': [], # все направления работ, в рамках которых произошла корректировка сроков
      'transfer_sectors': [], # все участки в рамках которых произошел перенос
      # собственные планы
      'old_date_start_with_shift': None,
      'old_date_finish_with_shift': None,
      'new_date_start_with_shift': None,
      'new_date_finish_with_shift': None,
      'transfer_info': {
        'reason_id': None,
        'reason': None,
        'shift': None,
        'note': None,
        'type': None,
        'date_change':None,
        'reason_nodes': None
      },
      'items':{}, # уровни вложенности: заказ/ направление работ/ участок/ наряд/ работа
      # договорные планы
      'contract_plan_transfer_info': {
        'reason_id': None,
        'reason': None,
        'shift': None,
        'note': None,
        'type': None,
        'date_change':None,
        'reason_nodes': None
      },
      'contract_plan_old_date_start_with_shift': None,
      'contract_plan_old_date_finish_with_shift': None,
      'contract_plan_new_date_start_with_shift': None,
      'contract_plan_new_date_finish_with_shift': None,
      'contract_plan_items':{} # уровни вложенности: заказ/ направление работ/ участок/ наряд/ работа

    }

    contract_number = None

    # цикл по нарядам на сохранение
    for wo_row_to_save in data_to_save:
      # поиск наряда среди нарядов полученных из БД
      new_wo_row = None
      try:
        new_wo_row = (i for i in new_work_orders_data if str(i['_id']) == str(wo_row_to_save['_id'])).next()
      except Exception, lexc:
        print('Error! : Workorder:{0} not found in DB.'.format(str(wo_row_to_save['number'])))
        print_exc()
        pass
      # если изменяемый наряд существует
      if new_wo_row:
        contract_number = new_wo_row['contract_number']
        # получение группирующих парамтеров------
        # ключ заказа
        order_key = '{0}.{1}.{2}'.format(str(new_wo_row['contract_number']), str(new_wo_row['production_number']), str(new_wo_row['production_units'][0]['unit_number']))
        # участок
        sector = sectors_info.get(str(new_wo_row.get('sector_id')))
        sector_name = sector['name']
        # направление работ
        sector_type = sector['type']
        #-----------

        # цикл по работам наряда, поданному на сохранение
        for w_row_to_save in wo_row_to_save.get('plan_work',[]):
          # поиск работы  среди работ полученных из БД
          new_w_row = None
          try:
            new_w_row = (i for i in new_wo_row.get('plan_work',[]) if str(i['_id']) == str(w_row_to_save['_id'])).next()
          except Exception, lexc:
            print('Error! : Work:{0} not found in Workorder: {1} in DB.'.format(str(w_row_to_save.get('code')) ,str(wo_row_to_save.get('number'))))
            print_exc()
            pass
          # если работа найдена
          if new_w_row:
            # сохранение дат для своих и договорных планов
            for als in ['','contract_plan_']:
              include_work_to_transfer = False
              # сохранение переносов  дат для своих и договорных планов
              for psh_row_to_save in (w_row_to_save.get(als+'plan_shifts',[]) or []):
                if psh_row_to_save.get('date_change') == 'new':
                  include_work_to_transfer=True
                  # в результате помечаем какие заказы, направления, участки участвовали в переносе
                  if not order_key in transfer_result_info['transfer_contracts']:
                    transfer_result_info['transfer_contracts'].append(str(new_wo_row['contract_number']))
                  if not order_key in transfer_result_info['transfer_orders']:
                    transfer_result_info['transfer_orders'].append(order_key)
                  if not sector_type in transfer_result_info['transfer_sector_types']:
                    transfer_result_info['transfer_sector_types'].append(sector_type)
                  if not sector_name in transfer_result_info['transfer_sectors']:
                    transfer_result_info['transfer_sectors'].append(sector_name)

                  # сбор даты до переноса и после
                  if transfer_result_info[als+'old_date_start_with_shift'] is None or (w_row_to_save[als+'date_start_with_shift'] and w_row_to_save[als+'date_start_with_shift']< transfer_result_info[als+'old_date_start_with_shift']):
                      transfer_result_info[als+'old_date_start_with_shift'] = copy(w_row_to_save[als+'date_start_with_shift'])
                  if transfer_result_info[als+'old_date_finish_with_shift'] is None or (w_row_to_save[als+'date_finish_with_shift'] and w_row_to_save[als+'date_finish_with_shift']> transfer_result_info[als+'old_date_finish_with_shift']):
                      transfer_result_info[als+'old_date_finish_with_shift'] = copy(w_row_to_save[als+'date_finish_with_shift'])
                  if transfer_result_info[als+'new_date_start_with_shift'] is None or (new_w_row[als+'date_start_with_shift'] and new_w_row[als+'date_start_with_shift']< transfer_result_info[als+'new_date_start_with_shift']):
                      transfer_result_info[als+'new_date_start_with_shift'] = copy(new_w_row[als+'date_start_with_shift'])
                  if transfer_result_info[als+'new_date_finish_with_shift'] is None or (new_w_row[als+'date_finish_with_shift'] and new_w_row[als+'date_finish_with_shift']> transfer_result_info[als+'new_date_finish_with_shift']):
                      transfer_result_info[als+'new_date_finish_with_shift'] = copy(new_w_row[als+'date_finish_with_shift'])

                  # сбор информации о самом переносе
                  # Перенос - когда переносим обе даты
                  # Изменение длительности, когда меняем дату окончания
                  # Перенос и изменение длительности если меняется дата начала
                  # если меняется и дата начала и дата окончания, то система фиксирует два переноса
                  # перенос стартовой и конечной даты. Необходимо эти переносы объединить
                  # 1646
                  tmp_t_row = transfer_result_info[als+'transfer_info']
                  if not transfer_result_info[als+'transfer_info']['date_change']:
                    tmp_t_row['date_change'] = psh_row_to_save.get('date_change')
                    tmp_t_row['reason_id'] = psh_row_to_save.get('reason_id')
                    tmp_t_row['reason'] = psh_row_to_save.get('reason')
                    tmp_t_row['shift'] = psh_row_to_save.get('shift')
                    tmp_t_row['shift_finish'] = 0 if psh_row_to_save.get('type')=='start' else psh_row_to_save.get('shift')
                    tmp_t_row['note'] = psh_row_to_save.get('note')
                    tmp_t_row['type'] = psh_row_to_save.get('type')
                    tmp_t_row['reason_nodes'] = psh_row_to_save.get('reason_nodes')
                  elif psh_row_to_save.get('type')=='start':
                    tmp_t_row['shift'] = psh_row_to_save.get('shift')
                    tmp_t_row['type'] = psh_row_to_save.get('type')
                  elif psh_row_to_save.get('type')=='finish':
                    tmp_t_row['shift_finish'] = psh_row_to_save.get('shift')

              # если работа попадает в перенос
              if include_work_to_transfer:
                # уровень заказа
                if not order_key in transfer_result_info[als+'items']:
                  transfer_result_info[als+'items'][order_key] = {
                  'key': order_key,
                  'items':{},
                  'count':0,
                  'all_items_transfered': False
                }
                line_sector_types = transfer_result_info[als+'items'][order_key]
                # уровень направления работ
                if not sector_type in line_sector_types['items']:
                  line_sector_types['items'][sector_type] = {
                    'key': sector_type,
                    'items': {},
                    'count':0,
                    'all_items_transfered': False
                  }
                  line_sector_types['count']+=1
                line_sectors = line_sector_types['items'][sector_type]
                # уровень участка
                if not str(sector['_id']) in line_sectors['items']:
                  line_sectors['items'][str(sector['_id'])] = {
                    'key': str(sector['_id']),
                    'items': {},
                    'count': 0,
                    'all_items_transfered': False
                  }
                  line_sectors['count']+=1
                line_work_orders = line_sectors['items'][str(sector['_id'])]
                # уровень наряда
                if not routine.strToInt(new_wo_row['number']) in line_work_orders['items']:
                  line_work_orders['items'][routine.strToInt(new_wo_row['number'])] = {
                    'key': routine.strToInt(new_wo_row['number']),
                    'items': [],
                    'count':0,
                    'all_items_transfered': False
                  }
                  line_work_orders['count']+=1
                # уровень работы
                line_work_orders['items'][routine.strToInt(new_wo_row['number'])]['items'].append(u'Работа: [{0}]{1}'.format(w_row_to_save['code'],w_row_to_save['name']))
                line_work_orders['items'][routine.strToInt(new_wo_row['number'])]['count']+=1

    # получить количества объектов на разных уровнях структуры договора
    # речь идет о том сколько заказов в договоре, сколько направлений работ в каждом заказе
    # сколько участков в каждом направлении, сколько нарядов в каждом участке
    # сколько работ в каждом наряде
    all_levels_counts = get_workorders_all_levels_count(new_work_orders_data, sectors_info)
    # проверка на полные переносы, например если в наряде перенесены сроки на все работы
    # или на участке перенесены сроки на все наряды
    for als in ['','contract_plan_']:
      transfer_items = transfer_result_info[als+'items']
      for order_key in transfer_items:
        try:
          if transfer_items[order_key]['count'] == all_levels_counts[order_key]['count']:
            transfer_items[order_key]['all_items_transfered'] = True
          for sector_type in transfer_items[order_key]['items']:
            if transfer_items[order_key]['items'][sector_type]['count'] == all_levels_counts[order_key]['items'][sector_type]['count']:
              transfer_items[order_key]['items'][sector_type]['all_items_transfered'] = True
            for sector_id in transfer_items[order_key]['items'][sector_type]['items']:
              if transfer_items[order_key]['items'][sector_type]['items'][sector_id]['count'] == all_levels_counts[order_key]['items'][sector_type]['items'][sector_id]['count']:
                transfer_items[order_key]['items'][sector_type]['items'][sector_id]['all_items_transfered']=True
              for work_order_number in transfer_items[order_key]['items'][sector_type]['items'][sector_id]['items']:
                if transfer_items[order_key]['items'][sector_type]['items'][sector_id]['items'][work_order_number]['count'] == all_levels_counts[order_key]['items'][sector_type]['items'][sector_id]['items'][work_order_number]['count']:
                  transfer_items[order_key]['items'][sector_type]['items'][sector_id]['items'][work_order_number]['all_items_transfered'] = True
        except:
          pass

    # подготовка содержимого письма, если зафиксированны переносы
    if transfer_result_info['transfer_info']['date_change'] or transfer_result_info['contract_plan_transfer_info']['date_change']:
      mail_header = '[ГПР] '
      mail_body = ''
      mail_user = ''
      # пользователи для рассылки
      notice_users = usermodel.get_list(
        {
          'notice.key': noticemodel.notice_keys['workorder_plan_shifts']['key'],
          'stat': {'$ne':'disabled' }
        },
        {'email':1,'fio':1}
      )

      # добавение группы договора на оповещение
      contract_group_info = contractmodel.get_google_group_info(contract_number)
      if contract_group_info:
        notice_users.append({'email': contract_group_info['key'], 'fio': ''})
      else:
        notice_users.append({'email': config.contracts_report_recepient, 'fio': ''})

      # формирование заголовка письма-----------------------------------------------------------------------
      t_type={
        'start':u'Изменение длительности и перенос',
        'finish':u'Изменение длительности',
        'both':u'Перенос без изменения длительности'
      }
      # Для заголовка в приоретете берем онформацию о собственных планах.
      # Если собственные планы не переносились, то берем договорные планы
      als = '' if transfer_result_info['transfer_info']['date_change'] else 'contract_plan_'
      old_duration = transfer_result_info[als+'old_date_finish_with_shift'] - transfer_result_info[als+'old_date_start_with_shift']
      new_duration = transfer_result_info[als+'new_date_finish_with_shift'] - transfer_result_info[als+'new_date_start_with_shift']

      transfer_info = transfer_result_info[als+'transfer_info']

      if transfer_result_info[als+'transfer_info']['type'] in ['start', 'finish']:
        if old_duration.days > new_duration.days:
          transfer_type = u'Сокращение длительности.' if transfer_result_info[als+'transfer_info'] == 'finish' else u'Сокращение длительности и перенос.'
        else:
          transfer_type = u'Увеличение длительности.' if transfer_result_info[als+'transfer_info'] == 'finish' else u'Увеличение длительности и перенос.'
      else:
        transfer_type = t_type[transfer_info['type']]

      # если переносы осуществлялись в рамках конкретного заказа, то указываем это
      if len(transfer_result_info['transfer_orders'])==1:
        mail_header+=transfer_result_info['transfer_orders'][0]
      else:
        mail_header += transfer_result_info['transfer_contracts'][0]
      # если переносы осуществлялись в рамках конкретного направления работ, то указываем это
      if len(transfer_result_info['transfer_sector_types'])==1:
        mail_header+= '/' + transfer_result_info['transfer_sector_types'][0]
        if len(transfer_result_info['transfer_sectors'])==1:
          mail_header+= '/' + transfer_result_info['transfer_sectors'][0]
      mail_header +=  ' - ' + transfer_type

      #-----------------------------------------------------------------------------------------------------
      # формирование тела письма----------------------------------------------------------------------------
      mail_user = usr_fio+' ('+usr_email+') сообщает: <br/>' if usr_fio else usr_email + 'сообщает: <br/>'

      # корректировки
      for als in ['','contract_plan_']:
        if transfer_result_info[als+'transfer_info']['date_change'] and len(transfer_result_info[als+'items'])>0:

          old_duration = transfer_result_info[als+'old_date_finish_with_shift'] - transfer_result_info[als+'old_date_start_with_shift']
          new_duration = transfer_result_info[als+'new_date_finish_with_shift'] - transfer_result_info[als+'new_date_start_with_shift']

          if transfer_result_info[als+'transfer_info']['type'] in ['start', 'finish']:
            if old_duration.days > new_duration.days:
              transfer_type = u'Сокращение длительности.' if transfer_result_info[als+'transfer_info'] == 'finish' else u'Сокращение длительности и перенос.'
            else:
              transfer_type = u'Увеличение длительности.' if transfer_result_info[als+'transfer_info'] == 'finish' else u'Увеличение длительности и перенос.'
          else:
            transfer_type = t_type[transfer_info['type']]

          dates_info_str = ''
          if als=='contract_plan_':
            mail_body += '<br/><br/><b>Корректировка договорных планов.</b><br/>'
          else:
            mail_body += '<br/><br/><b>Корректировка собственных планов.</b><br/>'

          # даты до переноса и после переноса
          dates_info_str = u"""(было: {0}-{1}; стало: {2}-{3})""".format(transfer_result_info[als+'old_date_start_with_shift'].strftime('%d.%m.%Y'), transfer_result_info[als+'old_date_finish_with_shift'].strftime('%d.%m.%Y'), transfer_result_info[als+'new_date_start_with_shift'].strftime('%d.%m.%Y'), transfer_result_info[als+'new_date_finish_with_shift'].strftime('%d.%m.%Y'))

          # количество дней на которое произошел перенос
          shift_days = transfer_result_info[als+'transfer_info']['shift']

          if transfer_result_info[als+'transfer_info']['type'] != 'both':
          #   if old_duration.days>new_duration.days:
          #     transfer_type = u'Сокращение длительности работ.' transfer_result_info[als+'transfer_info'] == 'finish' else u'Сокращение длительности и перенос работ.'
          #   else:
          #     transfer_type = u'Увеличение длительности работ.' transfer_result_info[als+'transfer_info'] == 'finish' else u'Увеличение длительности и перенос работ.'
            # если идет изменение длительности, то надо в смещении считать не количество дней на которое
            # произошло фактичческое смещение, а разницу между длельностями старой и новой.
            shift_days = new_duration.days - old_duration.days

          # уточнение к причине переноса
          if transfer_result_info[als+'transfer_info']['reason_nodes'] and len(transfer_result_info[als+'transfer_info']['reason_nodes'])>0:
            reason_nodes = ""
            for r_n in transfer_result_info[als+'transfer_info']['reason_nodes']:
              reason_nodes += '<a href = "http://int.modul.org/timeline/#sort=sort_by_date_finish/completed_filter=work/search={0}">{1}</a>, '.format('/'.join([str(x) for x in r_n]), '/'.join([str(x) for x in r_n]))
            reason_nodes = reason_nodes[:-2]

            mail_body +=  transfer_type + u"""<br/>Количество дней: {0}; {5}<br/>Тип корректировки: {1}<br/>Причина переноса: {2}<br/>Уточнение причины: {3}<br/>Комментарий: {4}""".format(str(shift_days), t_type[transfer_result_info[als+'transfer_info']['type']], transfer_result_info[als+'transfer_info']['reason'], reason_nodes, transfer_result_info[als+'transfer_info']['note'], dates_info_str)
          else:
            mail_body += transfer_type + u"""<br/>Количество дней: {0}; {4}<br/>Тип корректировки: {1}<br/>Причина переноса: {2}<br/>Комментарий: {3}""".format(str(shift_days), t_type[transfer_result_info[als+'transfer_info']['type']], transfer_result_info[als+'transfer_info']['reason'],transfer_result_info[als+'transfer_info']['note'], dates_info_str)

          # сбор основного текста сообщения
          transfer_items = transfer_result_info[als+'items']
          for order_key in transfer_items:
            try:
              mail_body+=u'<br/> Заказ №{0}'.format(order_key)
              if transfer_items[order_key]['all_items_transfered'] and len(transfer_items[order_key]['items'])>1:
                mail_body+=u'<br/> Все направления'
              else:
                for sector_type in transfer_items[order_key]['items']:
                  mail_body+=u'<br/> Направление: {0}'.format(sector_type)
                  if transfer_items[order_key]['items'][sector_type]['all_items_transfered'] and len(transfer_items[order_key]['items'][sector_type]['items'])>1:
                    mail_body+=u'<br/> Все участки'
                  else:
                    for sector_id in transfer_items[order_key]['items'][sector_type]['items']:
                      mail_body+=u'<br/> Участок: [{0}] {1} '.format(sectors_info.get(sector_id)['code'], sectors_info.get(sector_id)['name'])
                      if transfer_items[order_key]['items'][sector_type]['items'][sector_id]['all_items_transfered'] and len(transfer_items[order_key]['items'][sector_type]['items'][sector_id]['items'])>1:
                        mail_body+=u'<br/> Все наряды'
                      else:
                        for work_order_number in transfer_items[order_key]['items'][sector_type]['items'][sector_id]['items']:
                          mail_body+=u'<br/> Наряд: {0} '.format(str(work_order_number))
                          if transfer_items[order_key]['items'][sector_type]['items'][sector_id]['items'][work_order_number]['all_items_transfered'] and len(transfer_items[order_key]['items'][sector_type]['items'][sector_id]['items'][work_order_number]['items'])>1:
                            mail_body+=u'<br/> Все работы'
                          else:
                            for t_work_row in transfer_items[order_key]['items'][sector_type]['items'][sector_id]['items'][work_order_number]['items']:
                              mail_body+='<br/>'+t_work_row
            except Exception, lexc:
              excType = lexc.__class__.__name__
              print_exc()
              pass

          # Проверка на глобальные изменения дат в заказе или договоре
          global_dates_msg = ''
          for g_contract_key in global_group_dates:
            g_contract = global_group_dates[g_contract_key]
            if g_contract['info']['important_level'] and( g_contract['info'][als+'date_start'] != g_contract['info'][als+'new_date_start'] or g_contract['info'][als+'date_finish'] != g_contract['info'][als+'new_date_finish']):
              global_dates_msg+="Договор: {0}<br/>".format(g_contract_key)

            if len(g_contract['orders'])>0:
              for g_order_key in g_contract['orders']:
                # в проверке участвуют не все заказы договора, а только те которые поступили на сохранение
                # и по котором есть корректировка сроков
                if g_order_key in transfer_result_info['transfer_orders']:
                  g_order = g_contract['orders'][g_order_key]
                  if g_order['info']['important_level'] and (g_order['info'][als+'date_start'] != g_order['info'][als+'new_date_start'] or g_order['info'][als+'date_finish'] != g_order['info'][als+'new_date_finish']):
                    global_dates_msg+="Заказ: {0}<br/>".format(g_order_key)
                  if len(g_order['sector_types'])>0:
                    for g_sector_type_key in g_order['sector_types']:
                      g_sector_type = g_order['sector_types'][g_sector_type_key]
                      if g_sector_type['info']['important_level'] and (g_sector_type['info'][als+'date_start'] != g_sector_type['info'][als+'new_date_start'] or g_sector_type['info'][als+'date_finish'] != g_sector_type['info'][als+'new_date_finish']):
                        global_dates_msg+="Направление работ: {0}<br/>".format(g_sector_type_key)
                      if len(g_sector_type['sectors'])>0:
                        for g_sector_key in g_sector_type['sectors']:
                          g_sector = g_sector_type['sectors'][g_sector_key]
                          if g_sector['info']['important_level'] and (g_sector['info'][als+'date_start'] != g_sector['info'][als+'new_date_start'] or g_sector['info'][als+'date_finish'] != g_sector['info'][als+'new_date_finish']):
                            # если на секторе перенесены все наряды, то сектор не помеяается отметкой  - "Важно"
                            # if not g_sector.get('transfer_all_workorders',False):
                            global_dates_msg+="Участок: [{0}] {1}<br/>".format(g_sector['info']['code'], g_sector['info']['name'])
                            if len(g_sector['work_orders'])>0:
                              for g_work_order_key in g_sector['work_orders']:
                                # iss_1455. Если в наряде всего одна работа,
                                g_work_order = g_sector['work_orders'][g_work_order_key]
                                if g_work_order['info']['important_level'] and (g_work_order['info'][als+'date_start'] != g_work_order['info'][als+'new_date_start'] or g_work_order['info'][als+'date_finish'] != g_work_order['info'][als+'new_date_finish']):
                                  #if not g_work_order.get('transfer_all_works', False):
                                  key =  './'+g_contract_key + '/' + g_order_key + '/' + g_sector_type_key+ '/'+g_work_order_key
                                  global_dates_msg+="Наряд: {0}<br/>".format('<a href = "http://int.modul.org/timeline/#search='+key+'">'+key+'</a>')
          if global_dates_msg!='':
            global_dates_msg = '<br/><br/>Важно! Корректировка затронула:<br/><br/>' + global_dates_msg
            mail_body+=global_dates_msg
            #mail_header = "Важно! "+ mail_header

      #----- зависимые по нашим планам задачи
      linked_tasks_msg = ''
      if linked_tasks and len(linked_tasks)>0:
        linked_tasks_msg = '<br/><br/>Связанные задачи по нашим планам:<br/><br/>'
        for lwo_row in linked_tasks:
          linked_tasks_msg+="Наряд: {0} ".format('<a href = "http://int.modul.org/timeline/#search='+str(routine.strToInt(lwo_row['number']))+'">'+str(routine.strToInt(lwo_row['number']))+'</a>')
          for lw_row in lwo_row['plan_work']:
            linked_tasks_msg+=u'<br/>Работа: [{0}]{1}'.format(lw_row['code'], (data_works.get(str(lw_row['work_id'])) or {}).get('name',''))
      #----- зависимые по договору задачи
      contract_plan_linked_tasks_msg = ''
      if contract_plan_linked_tasks and len(contract_plan_linked_tasks)>0:
        contract_plan_linked_tasks_msg = '<br/><br/>Связанные задачи по договору:<br/><br/>'
        for lwo_row in contract_plan_linked_tasks:
          contract_plan_linked_tasks_msg+="Наряд: {0} ".format('<a href = "http://int.modul.org/timeline/#search='+str(routine.strToInt(lwo_row['number']))+'">'+str(routine.strToInt(lwo_row['number']))+'</a>')
          for lw_row in lwo_row['plan_work']:
            contract_plan_linked_tasks_msg+=u'<br/>Работа: [{0}]{1}'.format(lw_row['code'], (data_works.get(str(lw_row['work_id'])) or {}).get('name',''))

      # добавление в письмо кнопки для отмены корректировки
      cancel_button = "<br/><br/><a href = '{0}/workorderdate/cancel_shift?key={1}&note={2}'><b>Отменить корректировку</b></a>".format(config.site_url, group_key, mail_header)

      return{
        'mail_header': mail_header,
        'mail_user': mail_user,
        'mail_body': mail_body,
        'linked_tasks_msg': linked_tasks_msg,
        'contract_plan_linked_tasks_msg': contract_plan_linked_tasks_msg,
        'cancel_button': cancel_button,
        'notice_users': notice_users
      }
    return None
  except Exception, exc:
    print('Error!: prepare_and_send_workorders_transfers_info. Detail: {0}'.format(str(exc)))
    excType = exc.__class__.__name__
    print_exc()
    raise Exception(str(exc))


def prepare_data_to_save(group_key, data_to_save, usr_email, usr_fio):
  '''
    Подготовка данных к сохранению измененных плановых дат нарядов.
    data_to_save - список нарядов с работами на сохранение
    usr_email - пользователь, вызвавший сохранение
  '''
  from models import workordermodel, sectormodel, contractmodel
  import uuid
  try:
    if len(data_to_save)<1:
      raise Exception('Нет данных на сохранение.')
    # номер договора, в рамках которого происходит сохранение данных
    contract_number = routine.strToInt(data_to_save[0]['contract_number'])
    # получение информации по участкам
    data_sectors = sectormodel.get_all_only_sectors()
    sectors_info = {}
    for sector_info in data_sectors:
      sectors_info[str(sector_info['_id'])] = sector_info
    # получение справочника работ
    data_works = sectormodel.get_all_works();
    # fполучить текущую информацию о наряах из БД в рамках договора
    new_work_orders_data =workordermodel.get({'contract_number': contract_number})
    # получить сгруппированную структуру дат всех нарядов в договоре  вида:
    # наряд, участок, направление работ, заказ, договор-------------------------
    global_group_dates = get_global_group_dates(new_work_orders_data, sectors_info)

    # ------------------------------------------------------------------------------------------------------
    # Подготовка данных о нарядах на сохранение
    # ------------------------------------------------------------------------------------------------------
    work_orders_to_save = []
    # цикл по нарядам
    for wo_row_to_save in data_to_save:
      # поиск наряда среди нарядов полученных из БД
      new_wo_row = None
      try:
        new_wo_row = (i for i in new_work_orders_data if str(i['_id']) == str(wo_row_to_save['_id'])).next()
      except Exception, lexc:
        print('Error! : Workorder:{0} not found in DB.'.format(str(wo_row_to_save['number'])))
        print_exc()
        pass

      # если изменяемый наряд существует
      if new_wo_row:
        new_wo_row['remarks'] = wo_row_to_save.get('remarks')
        new_wo_row['use_weekends'] = wo_row_to_save.get('use_weekends', False)
        new_wo_row['need_notification'] = wo_row_to_save.get('need_notification', False)
        new_wo_row['use_conditional_date'] = wo_row_to_save.get('use_conditional_date', False)
        new_wo_row['locked'] = wo_row_to_save.get('locked', False)
        new_wo_row['people'] = wo_row_to_save.get('people', 0)
        #---
        new_wo_row['use_contract_plan'] = wo_row_to_save.get('use_contract_plan', False)
        new_wo_row['contract_plan_use_weekends'] = wo_row_to_save.get('contract_plan_use_weekends', False)
        new_wo_row['contract_plan_need_notification'] = wo_row_to_save.get('contract_plan_need_notification', False)
        new_wo_row['contract_plan_use_conditional_date'] = wo_row_to_save.get('contract_plan_use_conditional_date', False)
        new_wo_row['contract_plan_locked'] = wo_row_to_save.get('contract_plan_locked', False)
        # цикл по работам наряда, поданному на сохранение
        for w_row_to_save in wo_row_to_save.get('plan_work',[]):
          # поиск работы  среди работ полученных из БД
          new_w_row = None
          try:
            new_w_row = (i for i in new_wo_row.get('plan_work',[]) if str(i['_id']) == str(w_row_to_save['_id'])).next()
          except Exception, lexc:
            print('Error! : Work:{0} not found in Workorder: {1} in DB.'.format(str(w_row_to_save.get('code')) ,str(wo_row_to_save.get('number'))))
            print_exc()
            pass
          # если работа найдена
          if new_w_row:
            new_w_row['scope'] = routine.strToFloat(w_row_to_save.get('scope', ''))
            new_w_row['timing'] = routine.strToFloat(w_row_to_save.get('timing', ''))
            new_w_row['days_count'] = routine.strToInt(w_row_to_save.get('days_count', ''))
            new_w_row['is_unit_percent'] = w_row_to_save.get('is_unit_percent', False)
            new_w_row['use_weekends'] = w_row_to_save.get('use_weekends', False)
            new_w_row['need_notification'] = w_row_to_save.get('need_notification', False)
            new_w_row['use_contract_plan'] = w_row_to_save.get('use_contract_plan', False)
            new_w_row['use_conditional_date'] = w_row_to_save.get('use_conditional_date', False)
            new_w_row['locked'] = w_row_to_save.get('locked', False)
            #----
            new_w_row['use_contract_plan'] = w_row_to_save.get('use_contract_plan', False)
            new_w_row['contract_plan_use_weekends'] = w_row_to_save.get('contract_plan_use_weekends', False)
            new_w_row['contract_plan_need_notification'] = w_row_to_save.get('contract_plan_need_notification', False)
            new_w_row['contract_plan_use_conditional_date'] = w_row_to_save.get('contract_plan_use_conditional_date', False)
            new_w_row['contract_plan_locked'] = w_row_to_save.get('contract_plan_locked', False)
            new_w_row['contract_plan_days_count'] = routine.strToInt(w_row_to_save.get('contract_plan_days_count', ''))
            # сохранение дат для своих и договорных планов
            for als in ['','contract_plan_']:
              st_date = None
              fn_date = None
              st_date_with_shift = None
              fn_date_with_shift = None

              if w_row_to_save[als+'date_start'] is not None:
                st_date = routine.strToDateTime(w_row_to_save[als+'date_start'])
                w_row_to_save[als+'date_start'] = copy(st_date)
                w_row_to_save[als+'date_start'] = copy(st_date)
              if als+'date_start_with_shift' not in w_row_to_save or w_row_to_save[als+'date_start_with_shift'] is None:
                w_row_to_save[als+'date_start_with_shift'] = copy(st_date)
              else:
                w_row_to_save[als+'date_start_with_shift'] = routine.strToDateTime(w_row_to_save[als+'date_start_with_shift'])

              if w_row_to_save[als+'date_finish'] is not None:
                fn_date = routine.strToDateTime(w_row_to_save[als+'date_finish'])
                w_row_to_save[als+'date_finish'] = copy(fn_date)
                w_row_to_save[als+'date_finish'] = copy(fn_date)
              if als+'date_finish_with_shift' not in w_row_to_save or w_row_to_save[als+'date_finish_with_shift'] is None:
                w_row_to_save[als+'date_finish_with_shift'] = copy(fn_date)
              else:
                w_row_to_save[als+'date_finish_with_shift'] = routine.strToDateTime(w_row_to_save[als+'date_finish_with_shift'])

              # запись в истории о первом назначении плановой даты на работу
              # если пдановые даты еще не назначались, и заданы пдановые даты пользователем
              # то вносим в историю факт назначения плановых дат
              if (not new_w_row.get(als+'date_start') or not new_w_row.get(als+'date_finish')) and (st_date or fn_date):
                if new_w_row.get('history') and len(new_w_row['history'])>0:
                  new_w_row['history'].append({
                    'date': datetime.datetime.utcnow(),
                    'user': usr_email,
                    'type': 'set_'+als+'plan_dates'
                  })
                else:
                  new_w_row['history'] = [{
                    'date': datetime.datetime.utcnow(),
                    'user': usr_email,
                    'type': 'set_'+als+'plan_dates'
                  }]
              new_w_row[als+'date_start'] = st_date
              new_w_row[als+'date_finish'] = fn_date
              if als+'date_start_with_shift' not in new_w_row or new_w_row[als+'date_start_with_shift'] is None:
                new_w_row[als+'date_start_with_shift'] = new_w_row[als+'date_start']
              if als+'date_finish_with_shift' not in new_w_row or new_w_row[als+'date_finish_with_shift'] is None:
                new_w_row[als+'date_finish_with_shift'] = new_w_row[als+'date_finish']

              # сохранение переносов  дат для своих и договорных планов
              for tmp_psh_row_to_save in (w_row_to_save.get(als+'plan_shifts',[]) or []):
                if tmp_psh_row_to_save.get('date_change') == 'new':
                  psh_row_to_save = deepcopy(tmp_psh_row_to_save)
                  psh_row_to_save['date_change'] = datetime.datetime.utcnow()
                  psh_row_to_save['reason_id'] =  ObjectId(psh_row_to_save['reason_id'])
                  psh_row_to_save['shift'] =  routine.strToInt(psh_row_to_save['shift'])
                  psh_row_to_save['user_email'] = usr_email
                  psh_row_to_save['group_key'] = group_key
                  psh_row_to_save['source'] = 'plan'
                  psh_row_to_save['_id'] = ObjectId()
                  if als+'plan_shifts' in new_w_row:
                    new_w_row[als+'plan_shifts'].append(psh_row_to_save)
                  else:
                    new_w_row[als+'plan_shifts'] = [psh_row_to_save]

                  # пересчет дат работ с учетом переноса
                  if psh_row_to_save['type']=='start':
                    tmp_date_start_with_shift =  new_w_row[als+'date_start_with_shift'] + datetime.timedelta(days= routine.strToInt(psh_row_to_save['shift']))
                    # iss_421-------------------
                    # если новая плановая дата начала превышает дату простоя,
                    # то необходимо скинуть простой добавлением нового статуса
                    status_log  = new_w_row.get(als+'status_log',[]) or []
                    if len(status_log)>0:
                      status_log.sort(key = lambda x: (x['date']))
                      last_status = status_log[-1]
                      if (last_status.get('status') == 'on_hold'  or last_status.get('status') == 'on_pause' ) and last_status['date']<tmp_date_start_with_shift:
                        status_log_item = {
                          '_id': ObjectId(),
                          'date_change': datetime.datetime.utcnow(),
                          'brigade_id': None,
                          'date':datetime.datetime.utcnow(),
                          'user_email': usr_email,
                          'reason_id': '',
                          'reason': '',
                          'reason_nodes': None,
                          'note': 'Автоматическая смена статуса.',
                          'status': 'on_work',
                          'source': 'plan'
                        }
                        new_w_row[als+'status_log'].append(status_log_item)
                        new_w_row[als+'status'] = 'on_work'
                    #--------
                    new_w_row[als+'date_start_with_shift'] =  tmp_date_start_with_shift
                  elif psh_row_to_save['type'] == 'finish':
                    new_w_row[als+'date_finish_with_shift'] =  new_w_row[als+'date_finish_with_shift'] + datetime.timedelta(days= routine.strToInt(psh_row_to_save['shift']))
                  else:
                    tmp_date_start_with_shift =  new_w_row[als+'date_start_with_shift'] + datetime.timedelta(days= routine.strToInt(psh_row_to_save['shift']))
                    # iss_421-------------------
                    # если новая плановая дата начала превышает дату простоя,
                    # то необходимо скинуть простой добавлением нового статуса
                    status_log  = new_w_row.get(als+'status_log',[]) or []
                    if len(status_log)>0:
                      status_log.sort(key = lambda x: (x['date']))
                      last_status = status_log[-1]
                      if (last_status.get('status') == 'on_hold'  or last_status.get('status') == 'on_pause' ) and last_status['date']<tmp_date_start_with_shift:
                        status_log_item = {
                          '_id': ObjectId(),
                          'date_change': datetime.datetime.utcnow(),
                          'brigade_id': None,
                          'date':datetime.datetime.utcnow(),
                          'user_email': usr_email,
                          'reason_id': '',
                          'reason': '',
                          'reason_nodes': None,
                          'note': 'Автоматическая смена статуса.',
                          'status': 'on_work',
                          'source': 'plan'
                        }
                        new_w_row[als+'status_log'].append(status_log_item)
                        new_w_row[als+'status'] = 'on_work'
                    #-------------------------------
                    new_w_row[als+'date_start_with_shift'] =   new_w_row[als+'date_start_with_shift'] + datetime.timedelta(days= routine.strToInt(psh_row_to_save['shift']))
                    new_w_row[als+'date_finish_with_shift'] =  new_w_row[als+'date_finish_with_shift'] + datetime.timedelta(days= routine.strToInt(psh_row_to_save['shift']))

        # добавляем наряд в список на сохранение
        work_orders_to_save.append(new_wo_row)
    # пересчет дат нарядов, согласно датам их плановых работ
    # результатом являются максимальные и иминимальные даты в рамках поданных нарядов
    tmp_full_dates =  recalculate_workorders_dates(new_work_orders_data)
    # обновление новых дат в глобальной структуре
    update_global_group_dates(new_work_orders_data, global_group_dates, sectors_info)

    # ------------------------------------------------------------------------------------------------------
    # Подготовка данных для сохранения нарядов связанных с платежами
    # ------------------------------------------------------------------------------------------------------
    work_pays_to_update = prepare_payments_from_workorders(work_orders_to_save)

    # Собранные данные
    return {
      'new_work_orders_data': new_work_orders_data,
      'work_orders_to_save': work_orders_to_save,
      'group_key': group_key,
      'global_group_dates': global_group_dates,
      'sectors_info': sectors_info,
      'data_works': data_works,
      'work_pays_to_update' : work_pays_to_update
    }
  except Exception, exc:
    print('Error! : prepare_data_to_save. Detail: {0}'.format(str(exc)))
    print_exc()
    raise Exception(str(exc))

def prepare_payments_from_workorders(data):
  '''
    Подготовка данных по платежам из нарядов
  '''
  result =[]
  for workordr in data:
    ord_id = workordr['_id']
    for work_row in workordr.get('plan_work',[]):
      if work_row.get('payment_id'):
        result.append({
          'workorder_id': ord_id,
          'contract_id': work_row.get('payment_data',{}).get('contract_id'),
          '_id': work_row['_id'],
          'date_start': work_row.get('date_start'),
          'date_finish': work_row.get('date_finish'),
          'date_start_with_shift': work_row.get('date_start_with_shift'),
          'date_finish_with_shift': work_row.get('date_finish_with_shift'),
          'depends_on': work_row.get('depends_on'),
          #---
          'contract_plan_date_start': work_row.get('contract_plan_date_start'),
          'contract_plan_date_finish': work_row.get('contract_plan_date_finish'),
          'contract_plan_date_start_with_shift': work_row.get('contract_plan_date_start_with_shift'),
          'contract_plan_date_finish_with_shift': work_row.get('contract_plan_date_finish_with_shift'),
          'contract_plan_depends_on': work_row.get('contract_plan_depends_on'),
          #----
          'user_email': work_row['user_email'],
          'payment_id': work_row['payment_id'],
        })
  return result

def get_transfers_detail_info(data_to_save, usr_email, usr_fio):
  '''
    Получение детализации о том, есть ли переносы в сохраняемых датах,
    какие наряды будут затронуты, какие прилинкованные наряды есть
    Получение той информации, которая в конечном итоге отправляется  менеджеру на почту, при изменении каких-либо
    дат нарядов.
  '''
  import uuid
  new_data = prepare_data_to_save(str(uuid.uuid1()), data_to_save, usr_email, usr_fio)
  work_orders_to_save = new_data['work_orders_to_save']
  linked_tasks = None
  contract_plan_linked_tasks = None
  if len(work_orders_to_save)>0:
    linked_tasks = get_linked_tasks_dates(work_orders_to_save, False)
    contract_plan_linked_tasks = get_linked_tasks_dates(work_orders_to_save, True)

  # получение информации
  res = get_workorders_transfers_info(
    new_data['group_key'],
    data_to_save,
    new_data['new_work_orders_data'],
    linked_tasks,
    contract_plan_linked_tasks,
    new_data['global_group_dates'],
    new_data['sectors_info'],
    new_data['data_works'],
    usr_email,
    usr_fio
  )

  if res:
    res = '<b>Важно! '+res['mail_header'] +'</b><br><br>'+ res['mail_body'] +res['linked_tasks_msg']+res['contract_plan_linked_tasks_msg']
  return res

def save_work_order_dates(group_key, data_to_save, usr_email, usr_fio):
  '''
  Сохранение измененных плановых дат нарядов.
  Сохранение переносов сроков, если такие имеются
  data_to_save - список нарядов с работами на сохранение
  group_key - ключ на сохранение всех данных
  usr_email - пользователь выполняющий созранение
  usr_fio - пользователь выполняющий созранение

  В рамках сохранения:
    1. Проверяется выход за укрупненное планирование
    2. Обновляются данные по привязанным платежам
    3. Проверяются переносы сроков нарядов и работ
    4. Выполняется рассылка о наличии переноса сроков
  '''
  try:
    from models import workordermodel
    from apis.contract import contractapi
    # подготовка данных к сохранению
    new_data = prepare_data_to_save(group_key, data_to_save, usr_email, usr_fio)
    work_orders_to_save = new_data['work_orders_to_save']


    # iss: #319----------
    # проверка на выход за укрупненное планирование
    # отключена (Это скоро станет атавизмом с введением договорных сроков)
    # check_on_enlarged_plans(global_group_dates, work_orders_to_save, sectors_info)
    # ------------------------------------------------------------------------------------------------------
    # Сохранение изменений по данным нарядов в БД
    # ------------------------------------------------------------------------------------------------------
    for workordr in work_orders_to_save:
      ord_id = workordr['_id']
      workordermodel.update_all(ord_id, workordr)

    # ------------------------------------------------------------------------------------------------------
    # iss_1055
    # Поиск и обновление задач, даты которых завият от сохраняемых
    # ------------------------------------------------------------------------------------------------------
    linked_tasks = None
    contract_plan_linked_tasks = None
    if len(work_orders_to_save)>0:
      # обновление связаных собственных планов
      linked_tasks = update_linked_tasks_dates(
        work_orders_to_save,
        usr_email,
        False,
        group_key
      )
      # обновление связаных договорных планов
      contract_plan_linked_tasks = update_linked_tasks_dates(
        work_orders_to_save,
        usr_email,
        True,
        group_key
      )
    #-------------------------------------------------------------------------------------------------------
    # iss_1190
    # Проверка на завершенность нарядов, по которым произошли изменения
    #-------------------------------------------------------------------------------------------------------
    close_workorder_if_all_works_completed([x['_id'] for x in work_orders_to_save], usr_email)

    #-------------------------------------------------------------------------------------------------------
    # Сохранение платежей-
    try:
      contractapi.update_plan_payments(new_data['work_pays_to_update'], usr_email)
    except Exception, lexc:
      print('Error! update_plan_payments. Detail: {0}'.format(str(lexc)))
      print_exc()
    #-------------------------------------------------------------------------------------------------------

    #-------------------------------------------------------------------------------------------------------
    # собрать данные и выполнить рассылку
    #-------------------------------------------------------------------------------------------------------
    try:
      # print('-------')
      # print('prepare_and_send_workorders_transfers_info')
      # print(usr_email)
      # print('-------')
      prepare_and_send_workorders_transfers_info(
        group_key,
        data_to_save,
        new_data['new_work_orders_data'],
        linked_tasks,
        contract_plan_linked_tasks,
        new_data['global_group_dates'],
        new_data['sectors_info'],
        new_data['data_works'],
        usr_email,
        usr_fio
      )
    except Exception, lexc:
      print('Error! Prepare_and_send_workorders_transfers_info. Detail: {0}'.format(str(lexc)))
      print_exc()

  except Exception, exc:
    print('Error! : save_work_order_dates. Detail: {0}'.format(str(exc)))
    print_exc()
    raise Exception(str(exc))

def prepare_reason_nodes(data):
  '''
    Подговтока данных для фиксации комментария к приичне переноса сроков по работе
  '''
  result = None
  if data and len(data)>0:
    result = []
    for row in data:
      tmp = [row['workorder_number']]
      if row['work_code']:
        tmp.append(row['work_code'])
      result.append(tmp)
  return result

def save_holds(group_key, data_to_save, usr_email):
  '''
    Сохранение простоев
    data_to_save = {
      'reason_id': ,
      'reason': ,
      'note': ,
      'status': "on_stop",
      'reason_nodes':,
      'works':[] // список идентификаторов работ которым необходимо проставить простой
    }
  '''
  try:
    from models import workordermodel

    status_log_item = {
      '_id': ObjectId(),
      'date_change': datetime.datetime.utcnow(),
      'brigade_id': None,
      'date': datetime.datetime.strptime(data_to_save['date'], '%d.%m.%Y'),
      'user_email': usr_email,
      'reason_id': ObjectId(data_to_save['reason_id']) if 'reason_id' in data_to_save and data_to_save['reason_id']!='' and data_to_save['reason_id'] is not None else '',
      'reason': data_to_save['reason'] if 'reason' in data_to_save else '',
      'reason_nodes': data_to_save['reason_nodes'] if data_to_save.get('reason','')!='' else None,
      'note': data_to_save.get('note',''),
      'status': data_to_save['status'],
      'source': 'plan',
      'group_key': group_key
    }

    for row in data_to_save['works']:
      status_log_item['_id'] = ObjectId()
      cond={'plan_work._id': ObjectId(row)}
      data = {"$set": {"plan_work.$.status": data_to_save['status']}}
      workordermodel.update(cond, data, True)
      data = {"$push":{"plan_work.$.status_log": status_log_item}}
      workordermodel.update(cond, data, True)

  except Exception, exc:
    print('Error! : save_holds. Detail: {0}'.format(str(exc)))
    print_exc()
    raise Exception(str(exc))

def add_new_work(name, unit, sector_code, comment, is_specific, usr_email):
  '''
    Функция добавления новой работы в справочник работ
  '''
  from models import sectormodel
  try:
    return sectormodel.add_new_work(sector_code, name, unit, comment, is_specific, usr_email)
  except Exception, exc:
    print('Error! : Add new work to list. Detail: {0}'.format(str(exc)))
    print_exc()
    raise Exception(str(exc))

def save_work_orders_settings(group_key, work_orders, settings, usr_email, usr_fio):
  '''
    Сохранение календарных и есурсных настроек
    ----
    work_orders = [{
      checked: true, // флаг, указывающий что необходимо данные также хранить и на уровне наряда
      number: 9187,
      _id: '2v3r49ub234-crb92u39rc',
      works: [{
        code: 4,
        _id: 'sdmfi204nf02ienwwef34'
      }]
    }]
    ----
    settings:{
      calendar: {
        use_weekends: 'yes',
        workday: 8,
        workweek: 5
      },
      workers: [{
        user_email: "1_2017008134@int.modul.org",
        user_fio: "Просвирин Владислав Витальевич",
        user_id: "59b64fd1c5980af7e9cb24eb"
      }]
    }
  '''
  try:
    from models import workordermodel
    settings['group_key'] = group_key
    settings['date_change'] = datetime.datetime.utcnow()
    settings['user_email'] = usr_email
    for wo_row in work_orders:
      if wo_row.get('checked'):
        workordermodel.update(
          {'_id': ObjectId(wo_row['_id'])},
          {'$set': {'settings': settings}},
        True)
      # works
      for w_row in wo_row.get('works',[]):
        workordermodel.update(
          {'plan_work._id': ObjectId(w_row['_id'])},
          {'$set': {'plan_work.$.settings': settings}},
        True)
  except Exception, exc:
    print('Error! : save_work_orders_settings. Detail: {0}'.format(str(exc)))
    print_exc()
    raise Exception(str(exc))

def remove_work_orders_settings(work_orders, usr_email, usr_fio):
  '''
    Сохранение календарных и есурсных настроек
    ----
    work_orders = [{
      checked: true, // флаг, указывающий что необходимо данные также хранить и на уровне наряда
      number: 9187,
      _id: '2v3r49ub234-crb92u39rc',
      works: [{
        code: 4,
        _id: 'sdmfi204nf02ienwwef34'
      }]
    }]
  '''
  try:
    from models import workordermodel
    for wo_row in work_orders:
      if wo_row.get('checked'):
        workordermodel.update(
          {'_id': ObjectId(wo_row['_id'])},
          {'$set': {'settings': None}},
        True)
      # works
      for w_row in wo_row.get('works',[]):
        workordermodel.update(
          {'plan_work._id': ObjectId(w_row['_id'])},
          {'$set': {'plan_work.$.settings': None}},
        True)
  except Exception, exc:
    print('Error! : remove_work_orders_settings. Detail: {0}'.format(str(exc)))
    print_exc()
    raise Exception(str(exc))

def save_work_orders_pause(group_key, work_orders, info, usr_email, usr_fio):
  '''
    Сохранение приостановки планов
    ----
    work_orders = [{
      checked: true, // флаг, указывающий что необходимо данные также хранить и на уровне наряда
      number: 9187,
      _id: '2v3r49ub234-crb92u39rc',
      works: [{
        code: 4,
        _id: 'sdmfi204nf02ienwwef34'
      }]
    }]
    ----
    info:{
      date: null,         // дата глобальной приостановки
      reason_id: null,    // причина приостановки
      reason: '',         // причина приостановки
      reason_nodes: [],   // уточнения к причинам приостановки
      note: '',           // пометка
    }
  '''
  try:
    from models import workordermodel
    info['group_key'] = group_key
    info['date_change'] = datetime.datetime.utcnow()
    info['user_email'] = usr_email
    for wo_row in work_orders:
      # if wo_row.get('checked'):
      #   workordermodel.update(
      #     {'_id': ObjectId(wo_row['_id'])},
      #     {'$set': {'pause': info, 'status': 'pause', 'status_date': datetime.datetime.utcnow()}},
      #   True)
      # works
      for w_row in wo_row.get('works',[]):
        workordermodel.update(
          {'plan_work._id': ObjectId(w_row['_id'])},
          {'$set': {'plan_work.$.pause': info,'plan_work.$.status': 'pause', 'plan_work.$.status_date': datetime.datetime.utcnow()}},
        True)
  except Exception, exc:
    print('Error! : save_work_orders_pause. Detail: {0}'.format(str(exc)))
    print_exc()
    raise Exception(str(exc))

def remove_work_orders_pause(work_orders, usr_email, usr_fio):
  '''
    Сохранение календарных и есурсных настроек
    ----
    work_orders = [{
      checked: true, // флаг, указывающий что необходимо данные также хранить и на уровне наряда
      number: 9187,
      _id: '2v3r49ub234-crb92u39rc',
      works: [{
        code: 4,
        _id: 'sdmfi204nf02ienwwef34'
      }]
    }]
  '''
  try:
    from models import workordermodel
    for wo_row in work_orders:
      #if wo_row.get('checked'):
      # workordermodel.update(
      #   {'_id': ObjectId(wo_row['_id'])},
      #   {'$set': {'pause': None, 'status': '', 'status_date': None}},
      # True)
      # works
      for w_row in wo_row.get('works',[]):
        workordermodel.update(
          {'plan_work._id': ObjectId(w_row['_id'])},
          {'$set': {'plan_work.$.pause': None,'plan_work.$.status': '', 'plan_work.$.status_date': None}},
        True)
  except Exception, exc:
    print('Error! : remove_work_orders_pause. Detail: {0}'.format(str(exc)))
    print_exc()
    raise Exception(str(exc))
