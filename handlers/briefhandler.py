#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route, get, post, put, request
import datetime, time
from bson.objectid import ObjectId
from traceback import print_exc
from copy import deepcopy,copy
#---
import routine
import config
from libraries import userlib
from models import workordermodel, contractmodel, sectormodel, usermodel, noticemodel, planshiftreason, countersmodel

@get('/handlers/brief/search/')
def search():
  '''
    Получение статистики по отклонениям и предстоящим работам
  '''
  userlib.check_handler_access("brief","r")
  have_result = False
  result = {
      'stat':None,
      'bad_stat':[],
      'sectors':{},
      'used_sectors': [],
      'used_reasons': [],
      'orders':{},
    }
  try:
    search_date = None
    usr = userlib.get_cur_user()
    # get parameters
    param = request.query.decode()
    if not 'date' in param or param['date']=="":
      return {'status':'error', 'msg':'Не задана дата.'}
    try:
      search_date =  datetime.datetime.strptime(param['date'], '%d/%m/%Y')
    except:
      return {'status':'error', 'msg':'Задан не верный формат даты.'}

    start_date = search_date+datetime.timedelta(days=-2)
    end_date = search_date+datetime.timedelta(days=2)
    # get works list
    dataWorks = sectormodel.get_all_works()
    # get sectors list
    arrDataSectors = sectormodel.get_all_only_sectors()
    dataSectors = {}
    for row in arrDataSectors:
      dataSectors[str(row['_id'])] = row;
    dataReasons = planshiftreason.get_all();
    today = search_date
    tomorrow = search_date+datetime.timedelta(days=1)
    yesterday = search_date+datetime.timedelta(days=-1)

    # получем договора, для которых доступна стартистика
    data_contracts = contractmodel.find_short({
      'factory': u'Калуга',
      #'is_signed': 'yes',
      '$or': [{'is_signed': 'yes'},{'timeline_visible':True}],
      '$and':[
        # only main contracts
        {'$or': [{'parent_id': {'$exists': False }},{'parent_id':None},{'parent_id': ''}]},
        # not canceled
        {'$or': [{'is_canceled': {'$exists': False }},{'is_canceled':None},{'is_canceled': False}]},
      ]
    })

    data_contracts_arr = {}
    for row in data_contracts:
      data_contracts_arr[str(row['_id'])] = row

    # get good data
    good_stat_data = workordermodel.get_brief_stat(start_date, end_date)
    # get bad data
    bad_stat_data = workordermodel.get_brief_errors(today)

    # фильтруем данные по допустимым договорам
    good_stat_data = [row for row in good_stat_data if str(row['contract_id']) in data_contracts_arr]
    bad_stat_data = [row for row in bad_stat_data if str(row['contract_id']) in data_contracts_arr]

    # prepare data
    for row in good_stat_data:
      order_number = str(row['contract_number']) +'.'+ str(row['product_number'])+ '.' + str(row['product_unit_number']);
      result['orders'][order_number] = {
        'number':order_number,
        'name': row['product_name'],
        'contract_number': row['contract_number'],
        'product_number': row['product_number'],
        'product_unit_number': row['product_unit_number']
      }
      row['client_name'] = data_contracts_arr[str(row['contract_id'])]['client_name'] if str(row['contract_id']) in data_contracts_arr else ''
      row['plan_work_name'] = dataWorks[str(row['plan_work_id'])]['name'] if str(row['plan_work_id']) in dataWorks else ''
      row['sector_name'] = dataSectors[str(row['sector_id'])]['name'] if str(row['sector_id']) in dataSectors else ''
      row['sector_type'] = dataSectors[str(row['sector_id'])]['type'] if str(row['sector_id']) in dataSectors else ''
      if(not row['sector_code'] in result['used_sectors']):
        result['used_sectors'].append(row['sector_code'])

      if(len(row['plan_work_status_log'])):
        row['plan_work_status_log'].sort(key = lambda x: (x['date']))

    for row in bad_stat_data:
      order_number = str(row['contract_number']) + '.' + str(row['product_number'])+ '.' + str(row['product_unit_number'])
      result['orders'][order_number] = {
        'number':order_number,
        'name': row['product_name'],
        'contract_number': row['contract_number'],
        'product_number': row['product_number'],
        'product_unit_number': row['product_unit_number']
      }
      row['client_name'] = data_contracts_arr[str(row['contract_id'])]['client_name'] if str(row['contract_id']) in data_contracts_arr else ''
      row['plan_work_name'] = dataWorks[str(row['plan_work_id'])]['name'] if str(row['plan_work_id']) in dataWorks else ''
      row['sector_name'] = dataSectors[str(row['sector_id'])]['name'] if str(row['sector_id']) in dataSectors else ''
      row['sector_type'] = dataSectors[str(row['sector_id'])]['type'] if str(row['sector_id']) in dataSectors else ''
      if(len(row['status_log'])):
        row['status_log'].sort(key = lambda x: (x['date']))

      # get today status according today date
      today_status = {}
      prev_status = {}
      # print('----------')
      # print(row['plan_work_code'])
      if len(row['status_log'])>1:
        i=1
        while i < len(row['status_log']):
          # print(today)
          # print('==')
          # print(row['status_log'][i-1]['date'])
          # print(row['status_log'][i]['date'])
          # print('==')
          # print(today>=row['status_log'][i-1]['date'] and today<row['status_log'][i]['date'])
          if today>=row['status_log'][i-1]['date'] and today<row['status_log'][i]['date']:
            today_status = row['status_log'][i-1]
            try:
              prev_status = row['status_log'][i-2]
            except:
              prev_status = {}
              pass
            break
          i+=1
        if not today_status:
          today_status =  row['status_log'][len(row['status_log'])-1]
          try:
            prev_status = row['status_log'][len(row['status_log'])-2]
          except:
            prev_status = {}
            pass
      elif len(row['status_log'])>0:
        today_status = row['status_log'][0]

      # print('===')
      # print(today_status)
      # print('----------')

      # get last fact work date according today date
      last_fact_work_date = None
      try:
        if 'fact_work' in row and row['fact_work'] is not None and len(row['fact_work'])>0:
          row['fact_work'].sort(key = lambda x: (x['date']))
          for fact_work_item in row['fact_work']:
            if fact_work_item['date']>today:
              break
            else:
              last_fact_work_date = fact_work_item['date'];
      except:
        pass

      if not last_fact_work_date:
        last_fact_work_date =  row['plan_work_date_start_with_shift']

      # print('----------')
      # print(row['plan_work_code'])
      # print(today_status.get('status',''))

      if (
        today_status.get('status','') == 'on_pause' or
        today_status.get('status','') == 'on_hold' or
        today_status.get('status','') == 'on_work_with_reject' or
        (
          today_status.get('status','') !='completed' and
          last_fact_work_date is not None and
          ((today-last_fact_work_date).days>2 or (today-last_fact_work_date).days==2 and (datetime.datetime.now() + datetime.timedelta(hours=routine.moscow_tz_offset)).hour>10)
        )
      ):

        # если текущий статус = on_work_with_reject и прошло уже больше 2 дней с даты
        # указанного статуса. то ставим ему статус  = on_work. Это сделано для отго, чтобы на следующий
        # день после работы с отклонением началась генериться ошибка - нет данных
        if today_status.get('status','') =='on_work_with_reject' and (today-today_status['date']).days > 1:
          today_status['status'] = 'on_work'

        # если текущий статус = в работе, но рабочий день еще не закончен, то берем предыдущий статус
        if today_status.get('status','') =='on_work' and (today-today_status['date']).days <= 1:
          today_status = prev_status

        row['reason'] = today_status.get('reason','')
        row['cur_status'] = today_status if today_status and len(today_status)>0 else None

        # заносим данные в результат
        #------- 1180-------------------------
        # берем только те работы , которых нет  в справочнике или работа есть и требуется проверка факта
        # для работ по которым выставлен флаг, что факты не требуются, отклонения начинаются на следующий день
        # после наступления финиша (#1180)
        no_need_facts = False
        if str(row['plan_work_id']) in dataWorks and dataWorks[str(row['plan_work_id'])].get('no_need_facts') and (today_status.get('status','') =='completed' or row['plan_work_date_finish_with_shift']>(today + datetime.timedelta(days=1))):
          no_need_facts = True
        #----------------------------------------
        if not no_need_facts:
          result['bad_stat'].append(row)
          if(not today_status.get('reason','') in result['used_reasons']):
            result['used_reasons'].append(today_status.get('reason',''))
          if(not row['sector_code'] in result['used_sectors']):
            result['used_sectors'].append(row['sector_code'])

    # sort orders
    result['orders'] = result['orders'].values();
    if(len(result['orders'])):
      result['orders'].sort(key = lambda x: (x['contract_number'], x['product_number'], x['product_unit_number']))

    result['stat'] = good_stat_data
    result['sectors'] = dataSectors
    result['sector_types'] = sectormodel.get_all_sector_types()
    result['reasons'] = dataReasons
    return routine.JSONEncoder().encode({'status': 'ok','data':result})
  except Exception, exc:
    print('Error! Get plan norms blanks.' + str(exc))
    excType = exc.__class__.__name__
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})
