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

def get_list_by_conditions(page, search_date, orders, sector_types, sectors, fact_status):
  '''
    Get workorders data list by filters
    page - текущая страница
    search_date - отчетная дата.
    orders - список номеров заказов (922.1, 1055.2)
    sector_types - направления работ
    sectors - участки
    fact_status - был ли факт по работе ('on_work', 'on_hold','no_data', '') на указанную дату
  '''
  from models import workordermodel, sectormodel, usermodel
  try:
    # данные по участкам и направлениям
    arrDataSectors = sectormodel.get_all_only_sectors()
    dataSectors = {}
    dataSectorTypes = {}
    for row in arrDataSectors:
      dataSectors[str(row['code'])] = row;
      if row['type'] not in dataSectorTypes:
        dataSectorTypes[row['type']] = []
      dataSectorTypes[row['type']].append(row['code'])
    # данные по пользователям
    # Наряд, Участок, Заказ, Отчёт (да / нет)
    condition = {
      '$and':[
        {'status':{'$ne':'completed'}},
        {'$or': [
          {'plan_work':{'$elemMatch':{
            'date_start_with_shift': {'$lte': search_date},
            'date_finish_with_shift': {'$gte': search_date}
          }}},
          {'plan_work.date_finish_with_shift': {'$lte': search_date} },
          {'plan_work.fact_work.date':search_date },
          {'workers_participation.fact_work.date':search_date },
        ]}
      ]
    }

    # заказы
    if orders and len(orders) > 0:
      tmp_condition = { '$or' : [] }
      for row in orders:
        tmp = row.split('.')
        tmp_condition['$or'].append({
          'contract_number': routine.strToInt(tmp[0]),
          'production_number': routine.strToInt(tmp[1]),
          'production_units.unit_number': routine.strToInt(tmp[2])
        })
      condition['$and'].append(tmp_condition)
    # направления работ и участки
    if sector_types and len(sector_types) > 0:
      tmp_sector_types = {}
      for sector_type in sector_types:
        tmp_sector_types[sector_type] = []
      if sectors and len(sectors) > 0:
        for sector_type in sector_types:
          for sector_code in sectors:
            tmp_sector = dataSectors[str(sector_code)]
            if tmp_sector.get('type')==sector_type:
              tmp_sector_types[sector_type].append(routine.strToInt(sector_code))

      for sector_type in tmp_sector_types:
        if len(tmp_sector_types[sector_type])==0:
          tmp_sector_types[sector_type] = dataSectorTypes.get(sector_type,[])
      sectors = []
      for sector_type in tmp_sector_types:
        sectors.extend(tmp_sector_types[sector_type])
    if sectors and len(sectors) > 0:
      sectors = [routine.strToInt(code) for code in sectors]
      condition['$and'].append({
        'sector_code': {'$in': sectors}
      })

    # фильтрация по статусу
    if fact_status:
      if fact_status=='on_work':
        condition['$and'].append({'plan_work.fact_work.date': search_date})
      elif fact_status=='on_hold':
        condition['$and'].append({
          'plan_work.status_log':{'$elemMatch':{'date': search_date, 'status': 'on_hold'}}
        })
        # condition['$and'].append({'plan_work.status_log.date': search_date})
        # condition['$and'].append({'plan_work.status_log.status': 'on_hold'})
        # condition['$and'].append({
        #   'plan_work.status_log.date': search_date,
        #   'plan_work.status_log.status':'on_hold'
        # })
      elif fact_status=='no_data':
        # оставляем только те наряды, у которых среди фактов или статусов по работам нет
        # даты равной search_date
        condition['$and'].append({'plan_work.fact_work.date': {'$ne':search_date}})
        condition['$and'].append({'plan_work.status_log.date': {'$ne':search_date}})

    # print('-------------')
    # print(condition)
    # print('-------------')
    #
    # получение данных по условию
    data = workordermodel.get_list_by_page(condition, page, 500)
    data_count = routine.ceil(routine.strToFloat(workordermodel.get_count(condition))/500)

    # формирование результата
    result = []
    for row in data:
      # находим был ли факт на указанную дату
      fact_info = {'on_work':0, 'on_hold': 0}
      search_date_str = search_date.strftime('%d/%m/%Y')
      have_facts = 0 # сколкьо работ имеют факт на указанную дату

      for plan_work_row in row.get('plan_work', []):
        for fact_work_row in plan_work_row.get('fact_work',[]):
          if fact_work_row['date'].strftime('%d/%m/%Y')==search_date_str:
            fact_info['on_work'] += 1
            have_facts+=1
            # user_info = usermodel.get(fact_work_row['user_email'])
            # fact_info = {
            #   'date_change': fact_work_row['date_change'],
            #   'user_email': fact_work_row['user_email'],
            #   'fio': user_info['fio'] if user_info else ''
            # }
            break


        for status_log_row in plan_work_row.get('status_log',[]):
          if status_log_row['date'].strftime('%d/%m/%Y')==search_date_str and status_log_row['status'] == 'on_hold':
            fact_info['on_hold'] += 1
            have_facts+=1
            break

        fact_info_result = []
        if fact_info['on_hold']==0 and fact_info['on_work']==0:
          fact_info_result.append('нет данных')
        if fact_info['on_hold'] > 0:
          fact_info_result.append('простой')
        if fact_info['on_work'] > 0:
          fact_info_result.append('факт')

      result.append({
        'number': row['number'],
        'sector_code': row['sector_code'],
        'sector_id': row['sector_id'],
        'sector_name': dataSectors.get(str(row['sector_code']),{}).get('name',''),
        'sector_type': dataSectors.get(str(row['sector_code']),{}).get('type',''),
        'contract_number': row['contract_number'],
        'product_number': row['production_number'],
        'product_name': row['production_name'],
        'unit_number': row['production_units'][0]['unit_number'],
        'order_number': '{0}.{1}.{2}'.format(str(row['contract_number']),str(row['production_number']),str(row['production_units'][0]['unit_number'])),
        'fact_info': ', '.join(fact_info_result)
      })

    result.sort(key = lambda x: (x['order_number'], x['number'], x['sector_code']) )
    return { 'data': result, 'count': data_count }
  except Exception, exc:
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

def save(group_key, data_to_save, usr_email):
  '''
    Сохранение фактов  по наряду
    usr_email -  почтоый адрес пользователя
    data_to_save-
     {
      "brigade_id" :  'String',
      "weekend": ''True/False'',
      "fact_scope": 'Double',
      "date": 'dd/mm/yyyy',
      fact_works:[
      {
        'id',
        'work_id',
        'code',
        'name' ,
        'unit' ,
        'plan_scope',
        'fact_scope' ,
        'balance',
        'status',
        'date_start',
        'date_finish',
        'reason',
        'note',
        'type',
        'shift'
      }],
      work_order:
      {
        'number',
        '_id',
        'contract_number',
        'contract_id',
        'product_number',
        'product_name',
        'product_id',
        'sector_code',
        'sector_name'
      }
    }
  '''
  from models import workordermodel, planshiftreason, planecalculationmodel
  from apis.workorder import workorderapi
  from apis.contract import contractapi
  try:
    # get old order info
    old_orders = workordermodel.get({'_id':ObjectId(data_to_save['work_order']['_id'])},None)
    # check for last date change
    old_order = None
    if old_orders!=None:
      for old_order in old_orders:
        if(old_order['date_change']>routine.__gt(data_to_save['work_order']['date_change'])):
          raise Exception('Во время редактирования данных, пользователь: {0} изменил наряд. Обновите форму для получения обновленных данных.'.format(old_order['user_email']))
    else:
      raise Exception('Ошибка получения данных о текущем наряде. Повторите попытку.')

    #-------------------------------------------------------------------------------------------------------
    # Проверка уточнений к причинам переноса
    if data_to_save['fact_works'] is not None and len(data_to_save['fact_works'])>0:
      cur_date = datetime.datetime.strptime(data_to_save['date'], '%d/%m/%Y')
      groupped_data = {}
      for item in data_to_save['fact_works']:
        if str(item.get('transfer_reason_id','')) in planshiftreason.SYSTEM_IDS or str(item.get('reason_id','')) in planshiftreason.SYSTEM_IDS:
            reason_notes = item.get('reason_note_obj', [])
            for row in reason_notes:
              if row['workorder_number'] not in groupped_data:
                groupped_data[row['workorder_number']] = []
              if row['work_code'] and row['work_code'] not in groupped_data[row['workorder_number']]:
                groupped_data[row['workorder_number']].append(row['work_code'])

      if len(groupped_data)>0:
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
              "plan_work_code": "$plan_work.code",
            }
          },
          {"$match": {'$or':conds}}
        ]
        db_res = workordermodel.do_aggregate(cond)

        for item in data_to_save['fact_works']:
          if str(item.get('transfer_reason_id','')) in planshiftreason.SYSTEM_IDS or str(item.get('reason_id','')) in planshiftreason.SYSTEM_IDS:
            reason_notes = item.get('reason_note_obj', [])
            reason = str(item.get('transfer_reason_id','')) if str(item.get('transfer_reason_id','')) in planshiftreason.SYSTEM_IDS else str(item.get('reason_id',''))
            for row in reason_notes:
              data_item = None
              date_start = None
              date_finish = None
              if row['work_code']:
                try:
                  data_item =  (i for i in db_res if i['number'] == row['workorder_number'] and i['plan_work_code'] == row['work_code']).next()
                  date_start = data_item['plan_work_date_start_with_shift']
                  date_finish = data_item['plan_work_date_finish_with_shift']
                except:
                  pass
              else:
                try:
                  data_item =  (i for i in db_res if i['number'] == row['workorder_number']).next()
                  date_start = data_item['date_start_with_shift']
                  date_finish = data_item['date_finish_with_shift']
                except:
                  pass
              # если элемент не найден, то ошибка
              if not data_item:
                raise Exception('Ошибка проверки формата уточнения к причинам переноса. Убедитесь что все указанные, в уточнениях, наряды и работы корректны.')
              try:
                # проверка работ на принадлежность к указанной причине
                if reason == planshiftreason.SYSTEM_OBJECTS['NOT_PLAN_WORK']:
                  if date_start<=cur_date and date_finish>=cur_date:
                    raise Exception('Для некоторых работ в качестве причины отлонений указана: "Другая внеплановая работа", но среди работ, указанных в уточнении, есть работы, запланированные на указанную дату. Проверьте данные или выберите другую причину отклонений.')
                elif reason == planshiftreason.SYSTEM_OBJECTS['PLAN_WORK']:
                  if not(date_start<=cur_date and date_finish>=cur_date):
                    raise Exception('Для некоторых работ в качестве причины отлонений указана: "Другая плановая работа", но среди работ, указанных в уточнении, есть работы, не запланированные на указанную дату. Проверьте данные или выберите другую причину отклонений.')
              except:
                pass
    #-------------------------------------------------------------------------------------------------------
    # Сбор основноых данных на сохранение
    worder_date_start_with_shift = None
    worder_date_finish_with_shift = None
    payments_plan_works = {}
    if data_to_save['fact_works'] is not None and len(data_to_save['fact_works'])>0:
      for item in data_to_save['fact_works']:
        # add new fact if scope>0
        if routine.strToFloat(item['fact_scope'])>0 or (item['old_status']!=item['status'] and item['status']=='completed'):
          if item['status']=='':
            item['status'] = 'on_work'
          fact_work = {
            '_id': ObjectId(),
            'date_change': datetime.datetime.utcnow(),
            'brigade_id': ObjectId(data_to_save['brigade_id']),
            'date':datetime.datetime.strptime(data_to_save['date'], '%d/%m/%Y'),
            'user_email': usr_email,
            'scope': routine.strToFloat(item['fact_scope']),
            'weekend': True if data_to_save['weekend']==True else False,
            'group_key': group_key
          }
          # добавляем новый факт в БД
          cond={'plan_work._id':ObjectId(item['id'])}
          data = {"$push": { "plan_work.$.fact_work": fact_work}}
          workordermodel.update(cond, data, True)
          # обновляем дату плана, по дате факта
          data = {"$set": {"plan_work.$.last_fact_date": datetime.datetime.strptime(data_to_save['date'], '%d/%m/%Y')}}
          workordermodel.update(cond, data, True)
          #944-------------------------------------------------------------------------------------------
          # сбор информации по работам, связанным с платежами
          if item.get("payment_id"):
            if item['id'] not in payments_plan_works:
              payments_plan_works[item['id']] = {'fact_work': [], '_id': ObjectId(item['id']), 'payment_id':item.get('payment_id')}
            payments_plan_works[item['id']]['fact_work'].append(fact_work)

        # обновление статуса работы
        if routine.strToFloat(item['fact_scope']) == routine.strToFloat(item['balance']) and routine.strToFloat(item['fact_scope'])>0:
          item['status']='completed'

        #if(item['old_status']!=item['status'] or item['repeat'] or item['status']=='on_work' or item['status']=='on_work_with_reject'):

        cond={'plan_work._id':ObjectId(item['id'])}
        status_log_item = {
            '_id': ObjectId(),
            'date_change': datetime.datetime.utcnow(),
            'brigade_id': ObjectId(data_to_save['brigade_id']) if data_to_save['brigade_id'] else None,
            'date':datetime.datetime.strptime(data_to_save['date'], '%d/%m/%Y'),
            'user_email': usr_email,
            'reason_id': ObjectId(item['reason_id']) if 'reason_id' in item and item['reason_id']!='' and item['reason_id'] is not None else '',
            'reason': item['reason'] if 'reason' in item else '',
            'reason_nodes': prepare_reason_nodes(item.get('reason_note_obj', None)) if item.get('reason','')!='' else None,
            'note': item['note'] if 'note' in item else '',
            'status': item['status'],
            'source': 'fact',
            'group_key': group_key
          }
        data = {"$set": {"plan_work.$.status": item['status']}}
        workordermodel.update(cond, data, True)
        data = {"$push":{"plan_work.$.status_log": status_log_item}}
        workordermodel.update(cond, data, True)

        # if need date shift
        if 'shift' in item and routine.strToInt(item['shift'])!=0 and 'transfer_reason_id' in item:
          plan_shift = {
            '_id': ObjectId(),
            'date_change': datetime.datetime.utcnow(),
            'user_email': usr_email,
            'reason_id': ObjectId(item['transfer_reason_id']),
            'reason': item['transfer_reason'],
            'reason_nodes': prepare_reason_nodes(item.get('reason_note_obj', None)),
            'type': item['type'],
            'shift': routine.strToInt(item['shift']),
            'note': item.get('transfer_note',''),
            'source': 'fact',
            'group_key': group_key
          }
          cond={'plan_work._id':ObjectId(item['id'])}
          data = {"$push": { "plan_work.$.plan_shifts": plan_shift}}
          workordermodel.update(cond, data, True)

          # # update date_start_with_shift and date_finish_with_shift using cur shift value
          # date_start_with_shift = None
          # date_finish_with_shift = None
          # for plan_work in old_order['plan_work']:
          #   if str(plan_work['_id'])==item['id']:
          #     date_start_with_shift = plan_work['date_start_with_shift'] if plan_work['date_start_with_shift'] is not None else plan_work['date_start']
          #     date_finish_with_shift = plan_work['date_finish_with_shift'] if plan_work['date_finish_with_shift'] is not None else plan_work['date_finish']
          #     break
          # if item['type']=='start':
          #   date_start_with_shift = date_start_with_shift + datetime.timedelta(days= routine.strToInt(item['shift']))
          # elif item['type'] == 'finish':
          #   date_finish_with_shift = date_finish_with_shift + datetime.timedelta(days= routine.strToInt(item['shift']))
          # else:
          #   date_start_with_shift = date_start_with_shift + datetime.timedelta(days= routine.strToInt(item['shift']))
          #   date_finish_with_shift = date_finish_with_shift + datetime.timedelta(days= routine.strToInt(item['shift']))
          # data = {"$set": {"plan_work.$.date_start_with_shift": date_start_with_shift,"plan_work.$.date_finish_with_shift": date_finish_with_shift}}

          # if not worder_date_start_with_shift or worder_date_start_with_shift > date_start_with_shift:
          #     worder_date_start_with_shift = date_start_with_shift
          # if not worder_date_finish_with_shift or worder_date_finish_with_shift < date_finish_with_shift:
          #     worder_date_finish_with_shift = date_finish_with_shift
          # workordermodel.update(cond, data, True)

      #-----------------------------------------------------------------------------------------------------
      #-- Вызов API обновления патежей, связанных с работами
      if len(payments_plan_works)>0:
        # получание списка ID плановых работ на обновление.
        # по плановым раьотам необходимо обновить плановые даты платежей
        tmp_workorder = workordermodel.get_by({'_id':ObjectId(data_to_save['work_order']['_id'])})
        pays_data = []
        for pw_row in payments_plan_works.values():
          for pw in tmp_workorder['plan_work']:
            if str(pw_row['_id'])==str(pw['_id']):
              pays_data.append({'contract_id': tmp_workorder['contract_id'], 'payment_id':pw.get('payment_id'), 'date_start_with_shift': pw['date_start_with_shift'], 'date_finish_with_shift':pw['date_finish_with_shift'], 'date_start': pw['date_start'], 'date_finish': pw['date_finish'], 'fact_work': payments_plan_works[str(pw_row['_id'])]['fact_work'] })
              break
        contractapi.add_fact_payments(pays_data, usr_email)
      #-----------------------------------------------------------------------------------------------------

      # обновление даты всего наряда с учетом переносов, если требуется
      if worder_date_start_with_shift and old_order['date_start_with_shift'] and  worder_date_start_with_shift<old_order['date_start_with_shift']:
        old_order['date_start_with_shift'] = worder_date_start_with_shift
      if worder_date_finish_with_shift and old_order['date_finish_with_shift'] and  worder_date_finish_with_shift>old_order['date_finish_with_shift']:
        old_order['date_finish_with_shift'] = worder_date_finish_with_shift

      cond={'_id':ObjectId(old_order['_id'])}
      data = {"$set":{"date_start_with_shift": old_order.get('date_start_with_shift') ,"date_finish_with_shift": old_order.get('date_finish_with_shift') }}
      workordermodel.update(cond, data, True)

    if data_to_save['fact_materials'] is not None and len(data_to_save['fact_materials'])>0:
      for item in data_to_save['fact_materials']:
        # add new fact if scope>0
        if routine.strToFloat(item['fact_scope'])>0:
          fact_material= {
            '_id': ObjectId(),
            'date_change': datetime.datetime.utcnow(),
            'brigade_id': ObjectId(data_to_save['brigade_id']) if data_to_save['brigade_id'] else None,
            'date':datetime.datetime.strptime(data_to_save['date'], '%d/%m/%Y'),
            'user_email': usr_email,
            'scope': routine.strToFloat(item['fact_scope']),
            'group_key': group_key
          }
          #cond={'_id': ObjectId(data_to_save['plan_norm']['_id']), 'materials._id':ObjectId(item['_id'])}
          cond={'materials._id':ObjectId(item['_id'])}
          data = {"$push": { "materials.$.fact_material": fact_material}}
          planecalculationmodel.update(cond, data, True)

    # сохранение процента участия работников на наряде
    if data_to_save['fact_works'] is not None and len(data_to_save['fact_works'])>0 and data_to_save['workers'] is not None and len(data_to_save['workers'])>0:
      cond={'_id':ObjectId(data_to_save['work_order']['_id'])}
      data = {"$push":{
          "workers_participation": {
            '_id': ObjectId(),
            'status': 'active',
            'workers': data_to_save['workers'],
            'date': datetime.datetime.utcnow(),
            'fact_date': datetime.datetime.strptime(data_to_save['date'], '%d/%m/%Y'),
            'group_key': group_key,
            'history':  [{
              "type" : "add",
              "user" : usr_email,
              "date" : datetime.datetime.utcnow()
            }]
          }
        }
      }
      workordermodel.update(cond, data, True)

    # Обновление времени последнего обновления данных по наряду
    cond={'_id':ObjectId(data_to_save['work_order']['_id'])}
    data = {"$set":{'date_change': datetime.datetime.utcnow(),'user_email': usr_email}}
    workordermodel.update(cond, data, True)

    # закрыть весь наряд, если все работы в нем завершены
    if not config.use_worker:
      workorderapi.close_workorder_if_all_works_completed([ObjectId(data_to_save['work_order']['_id'])], usr_email)
    else:
      config.qu_default.enqueue_call(func=workorderapi.close_workorder_if_all_works_completed, args=([ObjectId(data_to_save['work_order']['_id'])], usr_email))
    #-------------------------------------------------------------------------------------------------------

  except Exception, exc:
    print(u'Error! : save_fact_works. Detail: {0}'.format(str(exc)))
    print_exc()
    raise Exception(str(exc))

def send_notification(group_key, data, usr_email, usr_fio):
  '''
    Подготовка и отправка почтового сообщения о переносах сроков по факту
  '''
  from models import workordermodel, usermodel, sectormodel, noticemodel, contractmodel
  from helpers import mailer
  try:
    # данные о наряде из БД
    old_order = workordermodel.get_by({'_id':ObjectId(data['work_order']['_id'])})
    # данные об частках
    arrDataSectors = sectormodel.get_all_only_sectors()
    dataSectors = {}
    for row in arrDataSectors:
      dataSectors[str(row['code'])] = row;
    # номер единицы продукции, по которой идет оповещение
    product_unit_number = ""
    if 'production_units' in data['work_order']:
      product_unit_number ="*" if len(data['work_order']['production_units'])>1 else data['work_order']['production_units'][0]['unit_number']
    # группировка данных
    data_grouped = {'shifts': {}, 'holds': {}, 'pauses': {}, 'on_work_with_reject': {}}
    for item in data['fact_works']:
      key = item.get('transfer_reason','') + item.get('reason','') + '_' + item.get('note','')
      # переносы
      # if 'shift' in item and routine.strToInt(item['shift'])!=0 and item['status']!='on_hold' and item['status']!='on_pause':
      if 'shift' in item and routine.strToInt(item['shift'])!=0:
        if not key in data_grouped['shifts']:
          data_grouped['shifts'][key] = {'reason': item['transfer_reason'], 'note': item.get('transfer_note',''),'reason_nodes': prepare_reason_nodes(item.get('reason_note_obj', None)) , 'items': []}
        data_grouped['shifts'][key]['items'].append(item)
      # простои
      # if((item['old_status']!=item['status'] or item['repeat']) and item['status']=='on_hold'):
      if(item['status']=='on_hold'):
        if not key in data_grouped['holds']:
          data_grouped['holds'][key] = {'reason': item['reason'], 'note': item['note'],'reason_nodes': prepare_reason_nodes(item.get('reason_note_obj', None)), 'items': []}
        data_grouped['holds'][key]['items'].append(item)
      # приостановки
      # if((item['old_status']!=item['status'] or item['repeat']) and item['status']=='on_pause'):
      if(item['status']=='on_pause'):
        if not key in data_grouped['pauses']:
          data_grouped['pauses'][key] = {'reason': item['reason'], 'note': item['note'],'reason_nodes': prepare_reason_nodes(item.get('reason_note_obj', None)), 'items': []}
        data_grouped['pauses'][key]['items'].append(item)

      if(item['status']=='on_work_with_reject'):
        if not key in data_grouped['on_work_with_reject']:
          data_grouped['on_work_with_reject'][key] = {'reason': item['reason'], 'note': item['note'],'reason_nodes': prepare_reason_nodes(item.get('reason_note_obj', None)), 'items': []}
        data_grouped['on_work_with_reject'][key]['items'].append(item)

    # подготовка письма
    # тема письма
    header= "[ГПР] {0}.{1}.{2}/{3}/{4} - {5}".format(
      str(data['work_order']['contract_number']),
      str(data['work_order']['product_number']),
      str(product_unit_number),
      dataSectors[str(data['work_order']['sector_code'])]['type'],
      dataSectors[str(data['work_order']['sector_code'])]['name'],
      ' Отклонения по факту'
    )

    # Формирование содержимого письма
    body= usr_fio+' ('+usr_email+') сообщает: <br/><br/>' if usr_fio else usr_email + "сообщает: <br/><br/>"
    # направление работ
    body = body + "Направление работ: " + dataSectors[str(data['work_order']['sector_code'])]['type'] +" <br/>"
    # участок
    body=body+"Участок: ["  + str(data['work_order']['sector_code']) + '] ' +dataSectors[str(data['work_order']['sector_code'])]['name'] + "<br/>"
    # наряд
    body=body+"Наряд: " + '<a href = "http://int.modul.org/timeline/#search='+str(data['work_order']['number'])+'">'+str(data['work_order']['number'])+'</a>' + '<br/><br/>'
    tmpBody = ''

    # ---------
    # Уведомления о переносе сроков работ
    # ---------
    # print('------------')
    # print(routine.JSONEncoder().encode(data_grouped))
    # print('------------')

    i=0
    if len(data_grouped['shifts'])>0:
      tmpBody =  tmpBody+"<b>Перенесены плановые даты (перенос по факту).</b><br/>"
      for item_group_key in data_grouped['shifts']:
        item_group = data_grouped['shifts'][item_group_key]
        if i>0:
          tmpBody=tmpBody+"<br/>"
        tmpBody=tmpBody+"Причина: " + item_group['reason']+ '<br/>'

        if item_group['reason_nodes'] and len(item_group['reason_nodes'])>0:
          reason_nodes = ""
          for r_n in item_group['reason_nodes']:
            reason_nodes += '<a href = "http://int.modul.org/timeline/#sort=sort_by_date_finish/completed_filter=work/search={0}">{1}</a>, '.format('/'.join([str(x) for x in r_n]), '/'.join([str(x) for x in r_n]))
          reason_nodes = reason_nodes[:-2]
          if reason_nodes:
            tmpBody=tmpBody+"Уточнение причины: " + reason_nodes + '<br/>'

        tmpBody=tmpBody+"Комментарий: " + item_group['note'] + '<br/><br/>'

        for item in item_group['items']:
          transferType = ''
          if item['type']=='start':
            transferType = 'дата начала работ'
          elif item['type']=='finish':
            transferType = 'дата окончания работ'
          elif item['type']=='both':
            transferType = 'обе даты'

          transfer_date_info = {
            'old_date_start_with_shift': None,
            'old_date_finish_with_shift': None,
            'new_date_start_with_shift': None,
            'new_date_finish_with_shift': None
          }
          # поиск старых дат для работы
          for pl_work_info in data['work_order']['plan_work']:
            if str(pl_work_info['_id'])== str(item['id']):
              tmp_st_date = datetime.datetime.strptime(pl_work_info['date_start_with_shift'],"%Y-%m-%dT%H:%M:%S")
              tmp_fn_date = datetime.datetime.strptime(pl_work_info['date_finish_with_shift'],"%Y-%m-%dT%H:%M:%S")
              transfer_date_info['old_date_start_with_shift'] = tmp_st_date
              transfer_date_info['old_date_finish_with_shift'] = tmp_fn_date
              break
          # поиск новых дат для работы
          for pl_work_info in old_order['plan_work']:
            if str(pl_work_info['_id'])== str(item['id']):
              transfer_date_info['new_date_start_with_shift'] = pl_work_info['date_start_with_shift']
              transfer_date_info['new_date_finish_with_shift'] = pl_work_info['date_finish_with_shift']
              break
          dates_info = u"""; (было: {0}-{1}; стало: {2}-{3})""".format(transfer_date_info['old_date_start_with_shift'].strftime('%d.%m.%Y'), transfer_date_info['old_date_finish_with_shift'].strftime('%d.%m.%Y'), transfer_date_info['new_date_start_with_shift'].strftime('%d.%m.%Y'), transfer_date_info['new_date_finish_with_shift'].strftime('%d.%m.%Y'))

          tmpBody=tmpBody+"Работа: ["+str(item['code']) + "] " + item['name'] + '<br/>'
          tmpBody=tmpBody+"Количество дней: " + str(item['shift']) + dates_info +'<br/>'
          tmpBody=tmpBody+"Тип переноса: " + transferType+ '<br/>'
        i+=1
      tmpBody=tmpBody+'<br/>'

    # ---------
    # Уведомления о простое работ
    # ---------
    i = 0
    if len(data_grouped['holds'])>0:
      tmpBody = tmpBody+"<b>Простой работ.</b><br/>"
      for item_group_key in data_grouped['holds']:
        item_group = data_grouped['holds'][item_group_key]
        if i>0:
          tmpBody=tmpBody+"<br/>"
        tmpBody=tmpBody+"Причина: " + item_group['reason']+ '<br/>'

        if item_group['reason_nodes'] and len(item_group['reason_nodes'])>0:
          reason_nodes = ""
          for r_n in item_group['reason_nodes']:
            reason_nodes += '<a href = "http://int.modul.org/timeline/#sort=sort_by_date_finish/completed_filter=work/search={0}">{1}</a>, '.format('/'.join([str(x) for x in r_n]), '/'.join([str(x) for x in r_n]))
          reason_nodes = reason_nodes[:-2]
          if reason_nodes:
            tmpBody=tmpBody+"Уточнение причины: " + reason_nodes + '<br/>'

        tmpBody=tmpBody+"Комментарий: " + item_group['note'] + '<br/><br/>'
        for item in item_group['items']:
          tmpBody=tmpBody+"Работа: ["+str(item['code']) + "] " + item['name'] + '<br/>'
        i+=1
      tmpBody=tmpBody+'<br/>'

    # ---------
    # Уведомления о приостановке работ
    # ---------
    i=0
    if len(data_grouped['pauses'])>0:
      tmpBody = tmpBody+"<b>Приостановка работ.</b><br/>"
      for item_group_key in data_grouped['pauses']:
        item_group = data_grouped['pauses'][item_group_key]
        if i>0:
          tmpBody=tmpBody+"<br/>"
        tmpBody=tmpBody+"Причина: " + item_group['reason']+ '<br/>'
        if item_group['reason_nodes'] and len(item_group['reason_nodes'])>0:
          reason_nodes = ""
          for r_n in item_group['reason_nodes']:
            reason_nodes += '<a href = "http://int.modul.org/timeline/#sort=sort_by_date_finish/completed_filter=work/search={0}">{1}</a>, '.format('/'.join([str(x) for x in r_n]), '/'.join([str(x) for x in r_n]))
          reason_nodes = reason_nodes[:-2]
          if reason_nodes:
            tmpBody=tmpBody+"Уточнение причины: " + reason_nodes + '<br/>'
        tmpBody=tmpBody+"Комментарий: " + item_group['note'] + '<br/><br/>'
        for item in item_group['items']:
          tmpBody=tmpBody+"Работа: ["+str(item['code']) + "] " + item['name'] + '<br/>'
        i+=1

     # ---------
    # Уведомления о работах с отклонением
    # ---------
    i=0
    if len(data_grouped['on_work_with_reject'])>0:
      tmpBody = tmpBody+"<b>Работы с отклонением.</b><br/>"
      for item_group_key in data_grouped['on_work_with_reject']:
        item_group = data_grouped['on_work_with_reject'][item_group_key]
        if i>0:
          tmpBody=tmpBody+"<br/>"
        tmpBody=tmpBody+"Причина: " + item_group['reason']+ '<br/>'
        if item_group['reason_nodes'] and len(item_group['reason_nodes'])>0:
          reason_nodes = ""
          for r_n in item_group['reason_nodes']:
            reason_nodes += '<a href = "http://int.modul.org/timeline/#sort=sort_by_date_finish/completed_filter=work/search={0}">{1}</a>, '.format('/'.join([str(x) for x in r_n]), '/'.join([str(x) for x in r_n]))
          reason_nodes = reason_nodes[:-2]
          if reason_nodes:
            tmpBody=tmpBody+"Уточнение причины: " + reason_nodes + '<br/>'
        tmpBody=tmpBody+"Комментарий: " + item_group['note'] + '<br/><br/>'
        for item in item_group['items']:
          tmpBody=tmpBody+"Работа: ["+str(item['code']) + "] " + item['name'] + '<br/>'
        i+=1

    if tmpBody != '':
      # добавление в письмо кнопки для отмены корректировки
      # данная кнопка добавляется, елси только есть переносы сроков
      cancel_button = ''
      if len(data_grouped['shifts'])>0:
        cancel_button = "<br/><br/><a href = '{0}/workorderdate/cancel_shift?key={1}&note={2}'><b>Отменить корректировку</b></a>".format(config.site_url, group_key, header)
      tmpBody += cancel_button
      # получить пользователей, которым будет идти рассылка
      notice_users = usermodel.get_list(
        {
          'notice.key': noticemodel.notice_keys['workorder_plan_shifts']['key'],
          'stat': {'$ne':'disabled' }
        },
        {'email':1,'fio':1}
      )

      # добавение группы договора на оповещение
      contract_group_info = contractmodel.get_google_group_info(data['work_order']['contract_number'])
      if contract_group_info:
        notice_users.append({'email': contract_group_info['key'], 'fio': ''})
      else:
        notice_users.append({'email': config.contracts_report_recepient, 'fio': ''})

      # вызвать функцию отправки сообщения
      tmpBody = tmpBody.replace('\r\n', '<br/>')
      tmpBody = tmpBody.replace('\n', '<br/>')
      body = body.replace('\r\n', '<br/>')
      body = body.replace('\n', '<br/>')
      #notice_users = [{'email':'info.dmitry.cherkasov@gmail.com','fio':''}]
      mailer.send(header, body + tmpBody,notice_users, True, usr_email)
  except Exception, exc:
    print(u'Error! : send_fact_works_notifications. Detail: {0}'.format(str(exc)))
    print_exc()
    raise Exception(str(exc))


def get_ktu_statistics(search_date, orders, sector_types, sectors, fact_status):
  '''
    Get KTU statistic by filters
    search_date - отчетная дата.
    orders - список номеров заказов (922.1, 1055.2)
    sector_types - направления работ
    sectors - участки
    fact_status - был ли факт по работе ('on_work', 'on_hold','no_data', '') на указанную дату
  '''
  from models import workordermodel, sectormodel, usermodel
  try:
    search_date_str = search_date.strftime('%d/%m/%Y')
    # данные по участкам и направлениям
    arrDataSectors = sectormodel.get_all_only_sectors()
    dataSectors = {}
    dataSectorTypes = {}
    for row in arrDataSectors:
      dataSectors[str(row['code'])] = row;
      if row['type'] not in dataSectorTypes:
        dataSectorTypes[row['type']] = []
      dataSectorTypes[row['type']].append(row['code'])
    # данные по пользователям
    # Наряд, Участок, Заказ, Отчёт (да / нет)
    condition = {
      '$and':[
        {'status':{'$ne':'completed'}},
        {'plan_work.date_start_with_shift':{'$lte': search_date}},
        {'plan_work.date_finish_with_shift':{'$gte': search_date}}
      ]
    }
    # заказы
    if orders and len(orders) > 0:
      tmp_condition = { '$or' : [] }
      for row in orders:
        tmp = row.split('.')
        tmp_condition['$or'].append({
          'contract_number': routine.strToInt(tmp[0]),
          'production_number': routine.strToInt(tmp[1]),
          'production_units.unit_number': routine.strToInt(tmp[2])
        })
      condition['$and'].append(tmp_condition)
    # направления работ и участки
    if sector_types and len(sector_types) > 0:
      tmp_sector_types = {}
      for sector_type in sector_types:
        tmp_sector_types[sector_type] = []
      if sectors and len(sectors) > 0:
        for sector_type in sector_types:
          for sector_code in sectors:
            tmp_sector = dataSectors[str(sector_code)]
            if tmp_sector.get('type')==sector_type:
              tmp_sector_types[sector_type].append(routine.strToInt(sector_code))

      for sector_type in tmp_sector_types:
        if len(tmp_sector_types[sector_type])==0:
          tmp_sector_types[sector_type] = dataSectorTypes.get(sector_type,[])
      sectors = []
      for sector_type in tmp_sector_types:
        sectors.extend(tmp_sector_types[sector_type])
    if sectors and len(sectors) > 0:
      sectors = [routine.strToInt(code) for code in sectors]
      condition['$and'].append({
        'sector_code': {'$in': sectors}
      })

    # фильтрация по статусу
    if fact_status:
      if fact_status=='on_work':
        condition['$and'].append({'plan_work.fact_work.date': search_date})
      elif fact_status=='on_hold':
        condition['$and'].append({
          'plan_work.status_log':{'$elemMatch':{'date': search_date, 'status': 'on_hold'}}
        })
      elif fact_status=='no_data':
        # оставляем только те наряды, у которых среди фактов или статусов по работам нет
        # даты равной search_date
        condition['$and'].append({'plan_work.fact_work.date': {'$ne':search_date}})
        condition['$and'].append({'plan_work.status_log.date': {'$ne':search_date}})

    # получение данных по условию
    data = workordermodel.get_list_by(condition)
    data.sort(key = lambda x: (x['contract_number'], x['production_number'], x['sector_code'], x['number']))

    for row in data:
      row['order_number'] = '{0}.{1}.{2}'.format(str(row['contract_number']),str(row['production_number']),str(row['production_units'][0]['unit_number']))
      row['unit_number'] = row['production_units'][0]['unit_number']
      row['sector_name'] = dataSectors.get(str(row['sector_code']),{}).get('name','')
      row['sector_type'] = dataSectors.get(str(row['sector_code']),{}).get('type','')
      # в трудовом участии оставляем только те записи, которые подпадают под
      # заданную дату
      new_workers_participation = []
      if row.get('workers_participation'):
        for wp_row in row['workers_participation']:
          if wp_row['fact_date'].strftime('%d/%m/%Y')==search_date_str:
            new_workers_participation.append(wp_row)
      row['workers_participation'] = new_workers_participation

    return data

  except Exception, exc:
    print_exc()
    raise Exception(str(exc))
