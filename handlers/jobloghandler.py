#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route, get, post, put, request, error, abort, response, debug
import datetime
from bson.objectid import ObjectId
from libraries import userlib
from helpers import mailer
from models import workordermodel, contractmodel, sectormodel, planshiftreason, usermodel, noticemodel, materialsgroupmodel, planecalculationmodel
import routine
#from libraries import excellib
from xlrd import open_workbook
from xlutils.copy import copy as wbcopy
from xlwt import Workbook, XFStyle, Alignment, Font
from traceback import print_exc
from apis.contract import contractapi
from apis.workorder import workorderapi, joblogapi
import config
from copy import deepcopy,copy

@post('/handlers/joblog/check_workers')
def check_workers():
  '''
    Проверка работников на участие в других договорах на указанную дату
  '''
  response.content_type = "application/json; charset=UTF-8"
  userlib.check_handler_access("joblog","r")
  try:
    # get request info
    dataToSave = request.json
    usr = userlib.get_cur_user()
    # get parameters
    if not 'date' in dataToSave:
      return {'status':'error', 'msg':'Не задана дата.'}

    cur_date = datetime.datetime.strptime(dataToSave['date'], '%d/%m/%Y')
    # iss_363 проверка, не задействован ли кто-либо из работников на указанную дату в каком-либо договоре
    # проверка ведется для выставления трудового участия того или иного работника
    if dataToSave['workers'] is not None and len(dataToSave['workers'])>0:
      w_emails = []
      for w in dataToSave['workers']:
        w_emails.append(w['user_email'])

      cond = [
        {"$project":{
          "contract_id":1,
          "contract_number":1,
          "number":1,
          "workers_participation":1,
          "type" : 1
          }
        },
        # {"$match": {'type': {'$ne':'Цех'}}},
        {"$unwind": "$workers_participation"},
        {"$project":{
          "contract_id":1,
          "contract_number":1,
          "number":1,
          "workers": "$workers_participation.workers",
          "fact_date": "$workers_participation.fact_date"
          }
        },
        {"$match": {
          "$and": [
            {'fact_date': {"$gte":datetime.datetime.strptime(dataToSave['date'], '%d/%m/%Y')}},
            {'fact_date': {"$lte":datetime.datetime.strptime(dataToSave['date'], '%d/%m/%Y').replace(hour=23, minute=59, second=59, microsecond = 0)}}
          ]}
        },
        {"$unwind": "$workers"},
        {"$project":{
          "contract_id":1,
          "contract_number":1,
          "number":1,
          "fact_date": 1,
          "user_email": "$workers.user_email",
          }
        },
        {"$match": {
          'user_email': {"$in": w_emails},
          }
        }
      ]

      db_res = workordermodel.do_aggregate(cond)
      # группировка данных по работникам
      tmp_workers = {}
      for w in db_res:
        if w['user_email'] not in tmp_workers:
          tmp_workers[w['user_email']] = []
        if str(w['contract_number']) not in tmp_workers[w['user_email']]:
          tmp_workers[w['user_email']].append(str(w['contract_number']))

      # поверяем, не участвовал ли какой из работников на указанную дату в дргом договоре
      for w in dataToSave['workers']:
        if w['user_email'] in tmp_workers:
          w_contracts = tmp_workers[w['user_email']]
          for w_contract in w_contracts:
            if w_contract != str(dataToSave['work_order']['contract_number']):
              return routine.JSONEncoder().encode({'status': 'error','msg':"Работник, {0}, на указанный день уже задействован на договоре: {1}. Проверьте данные и повторите попытку.".format(w['user_fio'], w_contract )})

    return routine.JSONEncoder().encode({'status': 'ok'})
  except Exception, e:
    print('Check workers error: ' + str(e))
    return routine.JSONEncoder().encode({'status': 'error','msg':str(e)})

@put('/handlers/joblog/savedata')
def save():
  '''
    Сохранение фактов по наряду
  '''
  response.content_type = "application/json; charset=UTF-8"
  userlib.check_handler_access("joblog","w")
  from apis.workorder import joblogapi
  import uuid
  try:
    # уникальный ключ в рамках сохранения данных
    group_key = str(uuid.uuid1())
    # текущий пользователь
    usr = userlib.get_cur_user()
    # сохранение данных
    joblogapi.save(group_key, deepcopy(request.json), usr['email'])
    # рассылка уведомлений, если требуеются
    if request.json.get('have_transfers') or request.json.get('have_holds') or request.json.get('have_rejects') or request.json.get('have_pauses'):
      joblogapi.send_notification(group_key, request.json, usr['email'], usr.get('fio',''))
    return {'status':'ok'}
  except Exception,exc:
    excType = exc.__class__.__name__
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@post('/handlers/joblog/get_list/<page>')
def get_list_data(page):
  '''
    Get workorders data list by filters
    search_date - отчетная дата. Берем только наряды которые подпадают под отчетную дату.
  '''
  userlib.check_handler_access("joblog","r")
  try:
    usr = userlib.get_cur_user()
    # данные о фильтрах
    page = routine.strToInt(page)
    if not page:
      page=1
    request_data = request.json
    orders = request_data.get('orders', [])
    sector_types = request_data.get('sector_types', [])
    sectors = request_data.get('sectors', [])
    fact_status = request_data.get('fact_status', None)

    # T00:00:00.000Z
    # print datetime.strftime(now, "%Y-%m-%dT%H:%M:%S.000Z")
    dt = datetime.datetime.utcnow()
    search_date = datetime.datetime.strptime(request_data['date'], '%d.%m.%Y') if request_data.get('date', None) else dt.replace(hour=0, minute=0, second=0, microsecond=0)

    # получение данных по фильтрам
    result = joblogapi.get_list_by_conditions(page, search_date, orders, sector_types, sectors, fact_status)
    # получение KTU статистики (можно оптимизировать)
    ktu_statistic_result = joblogapi.get_ktu_statistics(search_date, orders, sector_types, sectors, fact_status)

    return routine.JSONEncoder().encode({
      'status':'ok',
      'data':result['data'],
      'count':result['count'],
      'ktu_statistic_data': ktu_statistic_result
    })
  except Exception, exc:
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@get('/handlers/joblog/open_work_order/')
def open_work_order():
  '''
    Get  full work order info by number with fact works
  '''
  userlib.check_handler_access("joblog","r")
  result = {}
  try:
    usr = userlib.get_cur_user()
    # get parameters
    param = request.query.decode()
    if not 'num' in param:
      return {'status':'error', 'msg':'Не задан номер наряда.'}
    workOrderNumber = param['num'];
    # get info by workorder number
    worder = workordermodel.get_by({'number':routine.strToInt(workOrderNumber)})
    if worder is None:
      return {'status':'error', 'msg':'Наряд не найден.'}
    if not 'contract_id' in worder:
      return {'status':'error', 'msg':'Ошибка структуры данных наряда. Для данного наряда не задан договор.'}
    if not 'sector_id' in worder:
      return {'status':'error', 'msg':'Ошибка структуры данных наряда. Для данного наряда не задан участок.'}
    if not 'plan_work' in worder:
      return {'status':'error', 'msg':'Ошибка структуры данных наряда. Для данного наряда не заданы работы.'}

    # Проверка на наличие в заказе участка с кодом 3 (iss: #165)
    # Просто сбор всех кодов участков  на всем заказе
    all_sectors_in_order = []
    all_worders = workordermodel.get({'contract_number':worder['contract_number'],'production_number':worder['production_number'] }, None)

    for row in all_worders:
      if not row['sector_code'] in all_sectors_in_order:
        all_sectors_in_order.append(row['sector_code'])

    # get contract info by id
    contract = contractmodel.get_by({'_id':worder['contract_id']})
    if contract is None:
      return {'status':'error', 'msg':'Не найден договор, указанный для данного наряда.'}

    # get sector info with brigades
    sector = sectormodel.get(str(worder['sector_id']))
    if sector is None:
      return {'status':'error', 'msg':'Не найден участок, указанный для данного наряда.'}
    if not 'works' in sector:
      return {'status':'error', 'msg':'Для участка, задействованного в данном наряде не заданы работы.'}

    # получить список бригад участка
    brigades = sector.get('brigades')
    # получить список работ на участке
    sectorWorks = {}
    for work in sector["works"]:
      sectorWorks[str(work['_id'])] = {
          "_id": work["_id"],
          "name": work["name"],
          "code": work["code"],
          "unit": work["unit"],
          "routine": work.get('routine', 0)
          }

    # сбор данных
    completedWorksCount = 0
    resultWorks = [] # результирующий список работ
    resultWorksHistory = [] # результирующий список истории фактов и изменения статусов

    min_start_date = None # минимальная дата в наряде, учитываются планы и факты
    max_finish_date = None # максимальная дата в наряде. учитываются планы и факты

    for planWork in worder.get("plan_work"):
      fact_dates = []
      max_fact_date = None;
      min_fact_date = None;
      # фиксируем завершенные работы
      if planWork['status'] == 'completed':
        completedWorksCount = completedWorksCount+1

      cur_plan_start_date = planWork.get('date_start_with_shift', planWork.get('date_start', None))
      cur_plan_finish_date = planWork.get('date_finish_with_shift', planWork.get('date_finish', None))

      if (not min_start_date and cur_plan_start_date) or (cur_plan_start_date and min_start_date > cur_plan_start_date):
        min_start_date = cur_plan_start_date

      if (not max_finish_date and cur_plan_finish_date) or (cur_plan_finish_date and max_finish_date < cur_plan_finish_date):
        max_finish_date = cur_plan_finish_date

      # объединение фактов и статусов в один список
      # nреудется для подсчета балланса и сортировки всего списка по дате
      work_status_history_list = []
      # collect facts
      for factWork in planWork.get('fact_work',[]) or []:
        tmp_row = {
          'code' : planWork['code'],
          'name': sectorWorks[str(planWork['work_id'])]['name'] if str(planWork['work_id']) in sectorWorks else '---',
          'unit' : sectorWorks[str(planWork['work_id'])]['unit'] if str(planWork['work_id']) in sectorWorks else '---',
          'plan_scope': planWork['scope'],
          '_id' : str(factWork['_id']),
          'balance': 0,
          'fact_scope': factWork['scope'],
          'user_email': factWork['user_email'],
          'date': factWork['date'],
          'date_change': factWork['date_change'],
          'status': 'on_work',
          'note': factWork.get('note','')
        }
        try:
          if not factWork['date'].strftime('%d/%m/%Y') in fact_dates:
            fact_dates.append(factWork['date'].strftime('%d/%m/%Y'))
            if not max_fact_date or max_fact_date < factWork['date']:
              max_fact_date = factWork['date']
            if not min_fact_date or min_fact_date > factWork['date']:
              min_fact_date = factWork['date']

            if (not min_start_date and min_fact_date) or (min_fact_date and min_start_date > min_fact_date):
              min_start_date = min_fact_date

            if (not max_finish_date and max_fact_date) or (max_fact_date and max_finish_date < max_fact_date):
              max_finish_date = max_fact_date

        except:
          pass
        work_status_history_list.append(tmp_row)
      # collect statuses
      if 'status_log' in planWork:
        planWork['status_log'].sort(key = lambda x: (x['date']))
        for status_row in planWork['status_log']:
          tmp_row = {
            'code' : planWork['code'],
            'name': sectorWorks[str(planWork['work_id'])]['name'] if str(planWork['work_id']) in sectorWorks else '---',
            'unit' : sectorWorks[str(planWork['work_id'])]['unit'] if str(planWork['work_id']) in sectorWorks else '---',
            'plan_scope': planWork['scope'],
            '_id' : str(status_row['_id']),
            'balance': 0,
            'fact_scope': 0,
            'user_email': status_row['user_email'],
            'date': status_row['date'],
            'date_change': status_row['date_change'],
            'status': status_row.get('status','on_work'),
            'note': status_row.get('note','')
          }

          # если на дату факта есть статус = completed, то работа была завершена данным фактом
          # необходимо из результирующего сипка удалить данный статус
          for row in work_status_history_list:
            if row['date'].strftime('%d/%m/%Y') == tmp_row['date'].strftime('%d/%m/%Y') and (tmp_row['status'] == 'on_work' or tmp_row['status'] == 'completed' or tmp_row['status'] == 'on_work_with_reject'):
              tmp_row['fact_scope'] = row['fact_scope']
              work_status_history_list.remove(row)
              break
          work_status_history_list.append(tmp_row)

      work_status_history_list.sort(key = lambda x: (x['date'], x['code']))
      factSize = 0.0
      for row in work_status_history_list:
        factSize = factSize + row['fact_scope']
        row['balance'] = planWork['scope'] - factSize
      resultWorksHistory.extend(work_status_history_list)

      resultWork = {
        'id' : str(planWork['_id']),
        'payment_id':  planWork.get('payment_id',''),
        'work_id' : planWork['work_id'],
        'code' : planWork['code'],
        'name' : sectorWorks[str(planWork['work_id'])]['name'] if str(planWork['work_id']) in sectorWorks else '---',
        'unit' : sectorWorks[str(planWork['work_id'])]['unit'] if str(planWork['work_id']) in sectorWorks else '---',
        'plan_scope' : planWork['scope'],
        'fact_scope' : 0,
        'balance': planWork['scope'] - factSize,
        'status':planWork['status'],
        'old_status':planWork['status'],
        'date_start': planWork['date_start'],
        'date_finish': planWork['date_finish'],
        'date_start_with_shift': planWork.get('date_start_with_shift', None),
        'date_finish_with_shift': planWork.get('date_finish_with_shift', None),
        'reason_id' : '',
        'reason':'',
        'note': '',
        'type':'',
        'shift':0,
        'fact_dates' : fact_dates,
        'max_fact_date': max_fact_date,
        'min_fact_date': min_fact_date,
        'status_log':planWork['status_log'],
        'payment_id': planWork.get('payment_id'),
        'routine' : sectorWorks[str(planWork['work_id'])].get('routine',0) if str(planWork['work_id']) in sectorWorks else 0,
      }
      resultWorks.append(resultWork);

    resultWorks.sort(key=lambda x:(x['routine'], x['name']))
    resultWorksHistory.sort(key=lambda x:(x['date']), reverse=True)

    # Получить все материалы из справчника материалов,
    # для котороых текущий участок является выпускающим
    dataMaterials = materialsgroupmodel.get_materials({
      '$or':
      [
        {'manufact_sector_id': sector['_id']},
        {'out_sector_id': sector['_id']},
      ]
    })
    arrMaterials = {}
    for material_row in dataMaterials:
      arrMaterials[material_row['_id']] = material_row

    resultMaterials = []
    resultPlanNorm = None

    if len(arrMaterials)>0:
      # Находим отобранные материалы в плановых нормах созданных для текущего заказа и участка
      dataPlanNorms = planecalculationmodel.find_by({
        'contract_id':worder['contract_id'],
        #'sector_id':worder['sector_id'],
        'production_id':worder['production_id'],
      }, None)


      for dataPlanNorm in dataPlanNorms:
        # Находим в плановой норме материалы, выпускаемые заводом
        if dataPlanNorm and 'materials' in dataPlanNorm and dataPlanNorm['materials'] and len(dataPlanNorm['materials']):
          for material_row in dataPlanNorm['materials']:
            if material_row['materials_id'] in arrMaterials and material_row['status']=='1' and routine.strToFloat(material_row['pto_size'])>0:
              factSize = 0.0
              #material_row['name'] = arrMaterials[material_row['materials_id']]['name']

              #  get all fact dates for the work
              if 'fact_material' in material_row:
                for factMaterial in material_row['fact_material']:
                  factSize = factSize + factMaterial['scope']

              # список уникальных свойств материала из справочника
              material_unique_props = arrMaterials[material_row['materials_id']].get('unique_props', None)
              cur_unique_prop = material_row.get('unique_props', None)
              material_unique_prop = None
              if cur_unique_prop and material_unique_props:
                for prop in material_unique_props:
                  if prop['name']==cur_unique_prop:
                    material_unique_prop = prop
                    break

              resultMaterial = {
                '_id':material_row['_id'],
                'name':arrMaterials[material_row['materials_id']]['name'],
                'plan_scope':routine.strToFloat(material_row['pto_size']),
                'balance': routine.strToFloat(material_row['pto_size'])- factSize,
                'code':material_row['materials_key'],
                'group_code': arrMaterials[material_row['materials_id']]['group_code'],
                'unit_pto': arrMaterials[material_row['materials_id']]['unit_pto'],
                'unit_purchase':arrMaterials[material_row['materials_id']]['unit_purchase'],
                'fact_scope' : 0,
                'unique_props_key': material_unique_prop['key'] if material_unique_prop else None,
                'unique_props_name': material_unique_prop['name'] if material_unique_prop else None,
              }
              resultMaterials.append(resultMaterial);
      resultMaterials.sort(key = lambda x: (x['name']))

    # сортировка истории трудового участия по фактической дате
    workers_history = worder.get('workers_participation',[])
    workers_history.sort(key = lambda x: (x['fact_date']), reverse=True)


    # prepare data
    #result['brigades'] = brigades;
    result['all_sectors_in_order'] = all_sectors_in_order
    result['plan_norm'] = None
    result['materials'] = resultMaterials
    result['works'] = resultWorks
    result['works_history'] = resultWorksHistory
    #result['workers'] = worder.get('workers')
    result['workers'] = workers_history[0]['workers'] if workers_history and len(workers_history)>0 else None

    result['sector'] = sector
    result['weekend'] = routine.isDateWeekEnd(usr['email'],datetime.datetime.utcnow())
    result['workers_history'] = workers_history
    result['workorder'] = {
      'number': worder['number'],
      '_id': worder['_id'],
      'contract_number': worder['contract_number'],
      'contract_id': worder['contract_id'],
      'product_number':worder['production_number'],
      'product_name':worder['production_name'],
      'product_id': worder['production_id'],
      'sector_code': sector['code'],
      'sector_name': sector['name'],
      'sector_type': sector['type'],
      'date_change': worder['date_change'],
      'user_email': worder['user_email'],
      'production_units': worder['production_units'],
      'plan_work': worder['plan_work'],
      'status': worder.get('status'),
      'auto_ktu': worder.get('auto_ktu',False),
      'min_start_date': min_start_date,
      'max_finish_date': max_finish_date
    }

  except Exception,exc:
    excType = exc.__class__.__name__
    print_exc()
    raise exc
  return routine.JSONEncoder().encode( {'status': 'ok','msg':'', 'result':result})

@get('/handlers/joblog/getplandates/')
def getplandates():
  """get  works plan dates by workorder number """
  userlib.check_handler_access("joblog","w")
  result = {}
  try:
    resultWorks = {}
    # get parameters
    param = request.query.decode()
    if not 'num' in param:
      return {'status':'error', 'msg':'Не задан номер наряда.'}
    workOrderNumber = param['num'];
    #workOrderNumber = request.json['num'];

    # get info by workorder number
    worder = workordermodel.get_by({'number':routine.strToInt(workOrderNumber)})
    if worder is None:
      return {'status':'error', 'msg':'Наряд не найден.'}
    if not 'plan_work' in worder:
      return {'status':'error', 'msg':'Ошибка структуры данных наряда. Для данного наряда не заданы работы.'}

    for planWork in worder['plan_work']:
      if not planWork['date_start'] is None:
        dateStart = planWork['date_start']
        dateFinish = planWork['date_finish']
        curDateStart = dateStart
        curDateFinish = dateFinish
        if 'plan_shifts' in planWork:
          for planShift in planWork['plan_shifts']:
            if planShift['type']=='start':
              curDateStart = curDateStart + datetime.timedelta(days=planShift['shift']);
            elif planShift['type'] == 'finish':
              curDateFinish = curDateFinish + datetime.timedelta(days=planShift['shift']);
            else:
              curDateStart = curDateStart + datetime.timedelta(days=planShift['shift']);
              curDateFinish = curDateFinish + datetime.timedelta(days=planShift['shift']);

        # проверка по фактам, по условию если факт начался раньше плана, то переноса не фиксируется
        haveFacts = False
        if 'fact_work' in planWork and planWork['fact_work'] and len(planWork['fact_work'])>0:
          haveFacts = True

        resultWork = {
          'work_id': planWork['work_id'],
          'work_code':planWork['code'],
          'date_start': curDateStart,
          'date_finish':curDateFinish,
          'have_facts': haveFacts
          }
        resultWorks[str(planWork['work_id'])] = resultWork

    result = resultWorks
  except Exception, e:
    raise e
  return routine.JSONEncoder().encode( {'status':'ok', 'msg':'', 'result':result})

@get('/handlers/joblog/getshiftreasonlist/')
def getshiftreasonlist():
  """get  list of shift date reasons for works"""
  userlib.check_handler_access("joblog","r")
  result = {}
  try:
    result = planshiftreason.get_all_active();
    return routine.JSONEncoder().encode( {'status':'ok', 'msg':'', 'result':result})
  except Exception, e:
    return routine.JSONEncoder().encode( {'status':'error', 'msg':'Ошибка получения списка причин переноса плановых дат. Подробности: ' + str(e), 'result':result})
    raise e

@get('/handlers/joblog/get_statistic/<orders>')
def api_get_statistic(orders):
  userlib.check_handler_access("joblog","r")
  response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=UTF-8'
  response.headers['Content-Type'] = 'application/vnd.ms-excel'
  response.headers['Content-Disposition'] = 'attachment; filename=fact_works_'+ datetime.datetime.utcnow().strftime('%d_%m_%Y_%H_%M_%S')+'.xls'
  try:
    usr = userlib.get_cur_user()
    data = workordermodel.get_fact_work_stat(orders)
    return __make_fact_works_statistic(data)
  except Exception, exc:
    excType = exc.__class__.__name__
    print_exc()
    print('Generate fact works statistic error: ' + str(exc))
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})


def __make_fact_works_statistic(data):
  '''Генерация XLS файла со статистикой по фактическим работам'''
  import StringIO
  output = StringIO.StringIO()
  wb = Workbook(encoding='utf-8')
  ws = wb.add_sheet('Data')
  #set header------------
  ws.write(0,0, u"Номер наряда".encode("utf-8"))
  ws.write(0,1, u"Номер продукции".encode("utf-8"))
  ws.write(0,2, u"Номер единицы продукции".encode("utf-8"))
  ws.write(0,3, u"Номер заказа".encode("utf-8"))
  ws.write(0,4, u"Код работы".encode("utf-8"))
  ws.write(0,5, u"Наименование работы".encode("utf-8"))
  ws.write(0,6, u"Ед. изм.".encode("utf-8"))
  ws.write(0,7, u"Цена за еденицу".encode("utf-8"))
  ws.write(0,8, u"Вып. Объём".encode("utf-8"))
  ws.write(0,9, u"Сумма".encode("utf-8"))
  ws.write(0,10, u"Дата".encode("utf-8"))
  ws.write(0,11, u"Год".encode("utf-8"))
  ws.write(0,12, u"Месяц".encode("utf-8"))
  ws.write(0,13, u"Бригадир".encode("utf-8"))
  ws.write(0,14, u"Код участка".encode("utf-8"))
  ws.write(0,15, u"Участок".encode("utf-8"))
  ws.write(0,16, u"Внерабочее время".encode("utf-8"))
  ws.write(0,17, u"Заказ по учету".encode("utf-8"))

  rowIndex = 1
  if data is not None:
    for row in data:
      if row.get('units_count',1) >1:
        order_by_norm = str(row['contract_number'])+'.'+ str(row['production_number']) + '.' + str(row['production_unit_number'])
      else:
        order_by_norm = str(row['contract_number'])+'.'+ str(row['production_number'])

      ws.write(rowIndex, 0, str(row['number']))
      ws.write(rowIndex, 1, str(row['production_number']))
      ws.write(rowIndex, 2, str(row['production_unit_number']))
      ws.write(rowIndex, 3, str(row['contract_number'])+'.'+ str(row['production_number']) + '.' + str(row['production_unit_number']))
      ws.write(rowIndex, 4, str(row['plan_work_code']))
      ws.write(rowIndex, 5, str(row['work_name']))
      ws.write(rowIndex, 6, str(row['work_unit']))
      ws.write(rowIndex, 7, row['work_price'])
      ws.write(rowIndex, 8, row['fact_work_scope'])
      ws.write(rowIndex, 9, row['fact_work_scope'] * row['work_price'])
      ws.write(rowIndex, 10, row['fact_work_date'].strftime('%d.%m.%Y'))
      ws.write(rowIndex, 11, row['fact_work_year'])
      ws.write(rowIndex, 12, row['fact_work_month'])
      ws.write(rowIndex, 13, row['brigade_teamlead'])
      ws.write(rowIndex, 14, row['sector_code'])
      ws.write(rowIndex, 15, row['sector_name'])
      ws.write(rowIndex, 16, row['fact_work_weekend'] if 'fact_work_weekend' in row else '')
      ws.write(rowIndex, 17, order_by_norm)
      rowIndex+=1
  wb.save(output)
  output.seek(0)
  return output.read()

@get('/handlers/joblog/get_qstatistic/')
def api_get_statistic():
  userlib.check_handler_access("joblog","r")
  response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=UTF-8'
  response.headers['Content-Type'] = 'application/vnd.ms-excel'
  response.headers['Content-Disposition'] = 'attachment; filename=fact_works_'+ datetime.datetime.utcnow().strftime('%d_%m_%Y_%H_%M_%S')+'.xls'
  try:
    param = request.query.decode()
    years = [routine.strToInt(value) for value in param['years'].split(',')] if param['years']!="" else []
    months = [routine.strToInt(value) for value in param['months'].split(',')] if param['months']!="" else []
    sectors = [routine.strToInt(value) for value in param['sectors'].split(',')] if param['sectors']!="" else []
    teams = [value for value in param['teams'].split(',')] if param['teams']!="" else []
    is_symple_view = True if param.get('symple_view','')=='true' else False
    include_not_completed = True if param.get('include_not_completed','')=='true' else False

    if is_symple_view:
      # статистика по объемам работ с использованием трудового участия работников
      data = workordermodel.get_fact_work_stat2(sectors, years[0], months, include_not_completed)
      return __make_fact_works_statistic2(data, years[0], months[0], is_symple_view)
    else:
      # статистика по объемам работ с использованием бригадиров
      data = workordermodel.get_fact_work_stat1(sectors, years[0], months, teams)
      return __make_fact_works_statistic1(data, years[0], months[0], is_symple_view)


    #return routine.JSONEncoder().encode({'status': 'ok', 'result': data})
  except Exception, exc:
    excType = exc.__class__.__name__
    print_exc()
    print('Generate fact works query statistic error: ' + str(exc))
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

def __make_fact_works_statistic1(data_info, year, month, is_symple_view ):
  '''
    Генерация XLS файла со статистикой по фактическим работам
    по заданным параметрам. Реализация для бригад.
    Task: #136
  '''
  import StringIO
  monthNames = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
  output = StringIO.StringIO()
  wb = Workbook(encoding='utf-8')
  wb.active_sheet = 0

  # styles
  al1 = Alignment()
  al1.horz = Alignment.HORZ_LEFT
  al1.vert = Alignment.VERT_TOP
  al1.wrap = Alignment.WRAP_AT_RIGHT
  font = Font()
  font.bold = True

  font1 = Font()
  font1.bold = True
  font1.height = 220

  style1 = XFStyle()
  style1.alignment = al1

  style_itogo = XFStyle()
  #style_itogo.alignment = al1
  style_itogo.font = font

  style_itogo1 = XFStyle()
  #style_itogo.alignment = al1
  style_itogo1.font = font1

  style_header = XFStyle()
  style_header.alignment = al1
  style_header.font = font

  style_header1 = XFStyle()
  style_header1.alignment = al1
  style_header1.font = font1

  style_big_text = XFStyle()
  style_big_text.alignment = al1

  it = 0
  for item in data_info:
    team_info = data_info[item].get('team',{'code':str(ObjectId()), 'teamlead':'Не задан'}) or {'code':str(ObjectId()), 'teamlead':'Не задан'}
    data = data_info[item]['data']

    it+=1
    ws=None
    ws = wb.add_sheet(str(team_info['code']) + '__' + str(team_info['teamlead']) )

    # columns width
    ws.col(0).width = 256 * 10 # номер наряда
    ws.col(1).width = 256 * 10 # Номер заказа
    ws.col(2).width = 256 * 10 # Код работы
    ws.col(3).width = 256 * 65 # Наименование работы
    ws.col(4).width = 256 * 10 # Ед. изм
    ws.col(5).width = 256 * 10 # Цена за ед.
    ws.col(6).width = 256 * 20 # Вып. объем
    ws.col(7).width = 256 * 20 # Сумма
    ws.col(8).width = 256 * 10 # заказ по учету

    # Информация о выбранных фильтрах
    ws.write(0,0, u"Год:".encode("utf-8"), style_header1)
    ws.write(0,1, str(year), style_header1)
    ws.write(1,0, u"Месяц:".encode("utf-8"), style_header1)
    ws.write(1,1, monthNames[routine.strToInt(month) - 1], style_header1)
    ws.write(2,0, u"Бригада:".encode("utf-8"), style_header1)
    ws.write(2,1, '['+str(team_info['code'])+']' + ' ' + team_info['teamlead'], style_header1)
    ws.merge(0, 0, 1, 7)
    ws.merge(1, 1, 1, 7)
    ws.merge(2, 2, 1, 7)

    #set header------------
    ws.write(4,0, u"Номер наряда".encode("utf-8"), style_header)
    #ws.write(0,1, u"Номер продукции".encode("utf-8"), style_header)
    #ws.write(0,2, u"Номер единицы продукции".encode("utf-8"), style_header)
    ws.write(4,1, u"Номер заказа".encode("utf-8"), style_header)
    ws.write(4,2, u"Код работы".encode("utf-8"), style_header)
    ws.write(4,3, u"Наименование работы".encode("utf-8"), style_header)
    ws.write(4,4, u"Ед. изм.".encode("utf-8"), style_header)
    ws.write(4,5, u"Цена за еденицу".encode("utf-8"), style_header)
    ws.write(4,6, u"Вып. Объём".encode("utf-8"), style_header)
    ws.write(4,7, u"Сумма".encode("utf-8"), style_header)
    ws.write(4,8, u"Заказ по учету".encode("utf-8"))
    #ws.write(0,10, u"Дата".encode("utf-8"), style_header)
    #ws.write(0,11, u"Год".encode("utf-8"), style_header)
    #ws.write(0,12, u"Месяц".encode("utf-8"), style_header)
    #ws.write(0,13, u"Бригадир".encode("utf-8"), style_header)
    #ws.write(0,14, u"Код участка".encode("utf-8"), style_header)
    #ws.write(0,15, u"Участок".encode("utf-8"), style_header)
    #ws.write(0,16, u"Внерабочее время".encode("utf-8"), style_header)

    rowIndex = 6
    cur_work_order = None
    is_first_row = True
    summ = {
      'full_work_scope': 0,
      'full_work_price':0,
      'order_work_scope': 0,
      'order_work_price':0
    }

    for row in data:
      if cur_work_order != row['number']:
        cur_work_order = row['number']
        if not is_first_row and not is_symple_view:
          # итого
          ws.write(rowIndex, 6, summ['order_work_scope'], style_itogo)
          ws.write(rowIndex, 7, summ['order_work_price'], style_itogo)
          summ['order_work_scope'] = 0
          summ['order_work_price'] = 0
          rowIndex+=2

      is_first_row = False
      row_work_price = row['fact_work_scope'] * row['work_price']

      if row.get('units_count',1) >1:
        order_by_norm = str(row['contract_number'])+'.'+ str(row['production_number']) + '.' + str(row['production_unit_number'])
      else:
        order_by_norm = str(row['contract_number'])+'.'+ str(row['production_number'])


      ws.write(rowIndex, 0, str(row['number']))
      #ws.write(rowIndex, 1, str(row['production_number']))
      #ws.write(rowIndex, 2, str(row['production_unit_number']))
      ws.write(rowIndex, 1, str(row['contract_number'])+'.'+ str(row['production_number']) + '.' + str(row['production_unit_number']))
      ws.write(rowIndex, 2, str(row['plan_work_code']))
      ws.write(rowIndex, 3, str(row['work_name']), style_big_text)
      ws.write(rowIndex, 4, str(row['work_unit']))
      ws.write(rowIndex, 5, row['work_price'])
      ws.write(rowIndex, 6, row['fact_work_scope'])
      ws.write(rowIndex, 7, row_work_price)
      ws.write(rowIndex, 8, order_by_norm)

      #ws.write(rowIndex, 10, row['fact_work_date'].strftime('%d.%m.%Y'))
      #ws.write(rowIndex, 11, row['fact_work_year'])
      #ws.write(rowIndex, 12, row['fact_work_month'])
      #ws.write(rowIndex, 13, row['brigade_teamlead'])
      #ws.write(rowIndex, 14, row['sector_code'])
      #ws.write(rowIndex, 15, row['sector_name'])
      #ws.write(rowIndex, 16, u"Да".encode("utf-8") if 'fact_work_weekend' in row and row['fact_work_weekend']  else '')

      summ['order_work_price'] += row_work_price
      summ['order_work_scope'] += row['fact_work_scope']
      summ['full_work_price'] += row_work_price
      summ['full_work_scope'] += row['fact_work_scope']

      rowIndex+=1

    if not is_symple_view:
      if summ['order_work_price']>0 or summ['order_work_scope']>0:
        ws.write(rowIndex, 6, summ['order_work_scope'], style_itogo)
        ws.write(rowIndex, 7, summ['order_work_price'], style_itogo)
        rowIndex+=2

      if summ['full_work_price']>0 or summ['full_work_scope']>0:
        ws.write(rowIndex, 6, summ['full_work_scope'],style_itogo1)
        ws.write(rowIndex, 7, summ['full_work_price'],style_itogo1)

  #---------
  #заполенние общего листа данных
  #---------
  it = 0
  ws=None
  ws = wb.add_sheet('data')
  # columns width
  ws.col(0).width = 256 * 10 # код бригадира
  ws.col(1).width = 256 * 30 # Фио бригадира
  ws.col(2).width = 256 * 20 # номер заказа
  ws.col(3).width = 256 * 10 # номер наряда
  ws.col(4).width = 256 * 10 # Код работы
  ws.col(5).width = 256 * 10 # заказ по учету
  #set header------------
  ws.write(0,0, u"Код бригадира".encode("utf-8"), style_header)
  ws.write(0,1, u"ФИО".encode("utf-8"), style_header)
  ws.write(0,2, u"Номер заказа".encode("utf-8"), style_header)
  ws.write(0,3, u"Номер наряда".encode("utf-8"), style_header)
  ws.write(0,4, u"Код работы".encode("utf-8"), style_header)
  ws.write(0,5, u"Заказ по учету".encode("utf-8"), style_header)

  rowIndex = 1
  for item in data_info:
    team_info = data_info[item]['team']
    data = data_info[item]['data']
    for row in data:

      if row.get('units_count',1) >1:
        order_by_norm = str(row['contract_number'])+'.'+ str(row['production_number']) + '.' + str(row['production_unit_number'])
      else:
        order_by_norm = str(row['contract_number'])+'.'+ str(row['production_number'])

      #ws = wb.add_sheet(str(team_info['code']) + '__' + str(team_info['teamlead']) )
      ws.write(rowIndex, 0, str(team_info['code']))
      ws.write(rowIndex, 1, str(team_info['teamlead']))
      ws.write(rowIndex, 2, str(row['contract_number'])+'.'+ str(row['production_number']) + '.' + str(row['production_unit_number']))
      ws.write(rowIndex, 3, row['number'])
      ws.write(rowIndex, 4, row['plan_work_code'])
      ws.write(rowIndex, 5, order_by_norm)
      rowIndex+=1
  wb.save(output)
  output.seek(0)
  return output.read()

def __make_fact_works_statistic2(data_info, year, month, is_symple_view ):
  '''
    Генерация XLS файла со статистикой по фактическим работам
    по заданным параметрам. Реализация для работников с учетом трудовых расчетов
  '''
  import StringIO
  monthNames = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
  output = StringIO.StringIO()
  wb = Workbook(encoding='utf-8')
  wb.active_sheet = 0

  # styles
  al1 = Alignment()
  al1.horz = Alignment.HORZ_LEFT
  al1.vert = Alignment.VERT_TOP
  al1.wrap = Alignment.WRAP_AT_RIGHT
  font = Font()
  font.bold = True

  font1 = Font()
  font1.bold = True
  font1.height = 220

  style1 = XFStyle()
  style1.alignment = al1

  style_itogo = XFStyle()
  #style_itogo.alignment = al1
  style_itogo.font = font

  style_itogo1 = XFStyle()
  #style_itogo.alignment = al1
  style_itogo1.font = font1

  style_header = XFStyle()
  style_header.alignment = al1
  style_header.font = font

  style_header1 = XFStyle()
  style_header1.alignment = al1
  style_header1.font = font1

  style_big_text = XFStyle()
  style_big_text.alignment = al1
  #---------
  #заполенние общего листа данных
  #---------
  it = 0
  ws=None
  ws = wb.add_sheet('Data')
  # columns width
  ws.col(0).width = 256 * 10 # месяц
  ws.col(1).width = 256 * 10 # код работника
  ws.col(2).width = 256 * 30 # Фио бригадира
  ws.col(3).width = 256 * 20 # номер заказа
  ws.col(4).width = 256 * 10 # номер наряда
  ws.col(5).width = 256 * 10 # код участка
  ws.col(6).width = 256 * 20 # участок
  ws.col(7).width = 256 * 20 # направление
  ws.col(8).width = 256 * 10 # Код работы
  ws.col(9).width = 256 * 65 # Наименование работы
  ws.col(10).width = 256 * 10 # Ед. изм
  ws.col(11).width = 256 * 10 # Цена за ед.
  ws.col(12).width = 256 * 20 # Весь. объем
  ws.col(13).width = 256 * 20 # % участия
  ws.col(14).width = 256 * 20 # % участия в работе
  ws.col(15).width = 256 * 20 # Вып. объем
  ws.col(16).width = 256 * 20 # Сумма
  ws.col(17).width = 256 * 20 # Сумма
  ws.col(18).width = 256 * 10 # заказ по учету
  #set header------------
  ws.write(0,0, u"Месяц".encode("utf-8"), style_header)
  ws.write(0,1, u"Код работника".encode("utf-8"), style_header)
  ws.write(0,2, u"ФИО".encode("utf-8"), style_header)
  ws.write(0,3, u"Номер заказа".encode("utf-8"), style_header)
  ws.write(0,4, u"Номер наряда".encode("utf-8"), style_header)
  ws.write(0,5, u"Код участка".encode("utf-8"), style_header)
  ws.write(0,6, u"Участок".encode("utf-8"), style_header)
  ws.write(0,7, u"Направление".encode("utf-8"), style_header)
  ws.write(0,8, u"Код работы".encode("utf-8"), style_header)
  ws.write(0,9, u"Наименование работы".encode("utf-8"), style_header)
  ws.write(0,10, u"Ед. изм.".encode("utf-8"), style_header)
  ws.write(0,11, u"Цена за еденицу".encode("utf-8"), style_header)
  ws.write(0,12, u"Весь Объём".encode("utf-8"), style_header)
  ws.write(0,13, u"% участия в работе".encode("utf-8"), style_header)
  ws.write(0,14, u"% участия в наряде".encode("utf-8"), style_header)
  ws.write(0,15, u"Вып. Объём".encode("utf-8"), style_header)
  ws.write(0,16, u"Сумма".encode("utf-8"), style_header)
  ws.write(0,17, u"Статус наряда".encode("utf-8"), style_header)
  ws.write(0,18, u"Заказ по учету".encode("utf-8"), style_header)

  rowIndex = 1
  for item in data_info:
    team_info = data_info[item]['worker']
    for workorder_number  in data_info[item]['data']:
      for plan_work_code in data_info[item]['data'][workorder_number]['items']:
        row = data_info[item]['data'][workorder_number]['items'][plan_work_code]

        if row['info'].get('units_count',1) >1:
          order_by_norm = str(row['info']['contract_number'])+'.'+ str(row['info']['production_number']) + '.' + str(row['info']['production_unit_number'])
        else:
          order_by_norm = str(row['info']['contract_number'])+'.'+ str(row['info']['production_number'])


        ws.write(rowIndex, 0, monthNames[routine.strToInt(month) - 1])
        ws.write(rowIndex, 1, str(team_info['code']))
        ws.write(rowIndex, 2, str(team_info['fio']))
        ws.write(rowIndex, 3, str(row['info']['contract_number'])+'.'+ str(row['info']['production_number']) + '.' + str(row['info']['production_unit_number']))
        ws.write(rowIndex, 4, row['info']['number'])
        ws.write(rowIndex, 5, row['info']['sector_code'])
        ws.write(rowIndex, 6, row['info']['sector_name'])
        ws.write(rowIndex, 7, row['info']['sector_type'])
        ws.write(rowIndex, 8, row['info']['plan_work_code'])
        ws.write(rowIndex, 9, str(row['info']['work_name']), style_big_text)
        ws.write(rowIndex, 10, str(row['info']['work_unit']))
        # пересчет параметров с учетом процентов участия
        worker_proportion = float(row['full_proportion'])/len(row['items'])
        fact_work_scope = (row['info']['full_fact_scope'] * float(worker_proportion))/100
        row_work_price = float(fact_work_scope) * row['info']['work_price']
        every_work_proportion = float(data_info[item]['data'][workorder_number]['full_proportion'])/row['info']['all_works_count']
        ws.write(rowIndex, 11, row['info']['work_price'])     # цена за единицу
        ws.write(rowIndex, 12, row['info']['full_fact_scope'])        # весь объем
        ws.write(rowIndex, 13, worker_proportion)       # % участия в работе
        ws.write(rowIndex, 14, every_work_proportion)     # % участия в наряде
        ws.write(rowIndex, 15, fact_work_scope)       # выполненный объем
        ws.write(rowIndex, 16, row_work_price)        # сумма
        ws.write(rowIndex, 17, 'Закрыт' if row['info']['status'] =='completed' else 'Не закрыт' ) # статус наряда
        ws.write(rowIndex, 18, order_by_norm)       # заказ по учету

        rowIndex+=1
  wb.save(output)
  output.seek(0)
  return output.read()

@get('/handlers/joblog/search_workorder_numbers/')
def get_workorder_numbers():
  '''
    Поиск наряда по маске номера
  '''
  userlib.check_handler_access("joblog","r")
  q = request.query['q']
  ls = workordermodel.get_list_by({},{'number':1})
  res = []
  for cl in ls:
    if q in str(cl['number']):
      res.append({'id':cl['_id'],'name':str(cl['number'])})
      if len(res)>7:
        break
  return routine.JSONEncoder().encode(res)

@get('/handlers/joblog/get_workers/<number>')
def get_workers(number):
  '''
    Получение списка работников на наряде
  '''
  userlib.check_handler_access("joblog","r")
  if not number:
    return {'status':'error', 'msg':'Не задан номер наряда. '}
  data = workordermodel.get_by({'number':routine.strToInt(number)})
  if not data:
    return {'status':'error', 'msg':'Наряд не найден. Повторите попытку.'}

  workers_history = data.get('workers_participation',[])
  workers_history.sort(key = lambda x: (x['fact_date']))
  workers = workers_history[len(workers_history)-1]['workers'] if len(workers_history)>0 else None

  return routine.JSONEncoder().encode({'status':'ok', 'data': workers})

@put('/handlers/joblog/save_workers')
def api_save_workers():
  '''
  Функция сохранения данных по трудовому участию рабочих в наряде
  '''
  response.content_type = "application/json; charset=UTF-8"
  userlib.check_handler_access("joblog","w")
  try:
    usr = userlib.get_cur_user()
    # get request info
    dataToSave = request.json;
    if dataToSave['workers'] is not None and len(dataToSave['workers'])>0:
      cond={'_id':ObjectId(dataToSave['work_order']['_id'])}
      data = {"$push":{
          "workers_participation": {
            '_id': ObjectId(),
            'status': 'active',
            'workers': dataToSave['workers'],
            'date': datetime.datetime.utcnow(),
            'fact_date': datetime.datetime.utcnow(),
            'history':  [{
              "type" : "add",
              "user" : usr['email'],
              "date" : datetime.datetime.utcnow()
            }]
          }
        },
        '$set':{'auto_ktu':dataToSave['work_order'].get('auto_ktu')}
      }
      workordermodel.update(cond, data, True)
      return {'status':'ok'}
    else:
      return routine.JSONEncoder().encode({'status': 'error','msg':'Не задано трудовое участие. '})
  except Exception,exc:
    excType = exc.__class__.__name__
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@put('/handlers/joblog/update_workers_history')
def update_workers_history():
  '''
  Функция обновления данных в истории трудового участия работников
  '''
  response.content_type = "application/json; charset=UTF-8"
  userlib.check_handler_access("joblog","w")
  try:
    usr = userlib.get_cur_user()
    # get request info
    dataToSave = request.json;
    if dataToSave['workers'] is not None and len(dataToSave['workers'])>0:
      cond={'workers_participation._id':ObjectId(dataToSave['_id'])}
      data = {"$set":{"workers_participation.$.workers": dataToSave['workers']}}
      workordermodel.update(cond, data, True)
      log_item = {
        "type" : "edit",
        "user" : usr['email'],
        "date" : datetime.datetime.utcnow()
      }
      data = {"$push": { "workers_participation.$.history": log_item}}
      workordermodel.update(cond, data, True)
      return {'status':'ok'}
    else:
      return routine.JSONEncoder().encode({'status': 'error','msg':'Не задано трудовое участие. '})

  except Exception,exc:
    excType = exc.__class__.__name__
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@put('/handlers/joblog/remove_workers_history_item')
def update_workers_history_status():
  '''
  Функция удаления элемента из истории трудового участия
  По факту проставляется статус = removed
  '''
  response.content_type = "application/json; charset=UTF-8"
  userlib.check_handler_access("joblog","w")
  try:
    usr = userlib.get_cur_user()
    # get request info
    dataToSave = request.json;
    cond={'workers_participation._id':ObjectId(dataToSave['_id'])}
    data = {"$set":{"workers_participation.$.status": 'removed'}}
    workordermodel.update(cond, data, True)
    log_item = {
      "type" : "edit",
      "user" : usr['email'],
      "date" : datetime.datetime.utcnow()
    }
    data = {"$push": { "workers_participation.$.history": log_item}}
    workordermodel.update(cond, data, True)
    return {'status':'ok'}
  except Exception,exc:
    excType = exc.__class__.__name__
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@put('/handlers/joblog/transfer_fact')
def transfer_fact():
  '''
  #1141
  Функция переноса факта из одного наряда в другой
  '''
  response.content_type = "application/json; charset=UTF-8"
  userlib.check_handler_access("joblog","w")
  try:
    usr = userlib.get_cur_user()
    # get request info
    dataToSave = request.json;
    # подготовка данных
    transfer_to = request.json['transfer_to'] #plan_work object
    note = request.json['note']
    volume = request.json['volume']
    transfer_from = request.json['transfer_from'] # object {'workorder_number', 'work_number'}
    # вызов API функции перезачета факта
    workorderapi.transfer_fact(transfer_to, transfer_from, volume, note, usr['email'])
    #db.getCollection('m_workorder').find({'plan_work._id':ObjectId("57567f37ed460f0003d536cc")})
    return routine.JSONEncoder().encode({'status':'ok'})
  except Exception,exc:
    excType = exc.__class__.__name__
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@post('/handlers/joblog/get_ktu_statistic')
def get_ktu_statistic(page):
  '''
    #1678 Вывод статистики на отчетную дату
  '''
  userlib.check_handler_access("joblog","r")
  try:
    usr = userlib.get_cur_user()
    # get request params
    request_data = request.json
    orders = request_data.get('orders', [])
    sector_types = request_data.get('sector_types', [])
    sectors = request_data.get('sectors', [])
    fact_status = request_data.get('fact_status', None)
    dt = datetime.datetime.utcnow()
    search_date = datetime.datetime.strptime(request_data['date'], '%d.%m.%Y') if request_data.get('date', None) else dt.replace(hour=0, minute=0, second=0, microsecond=0)
    # получение данных по фильтрам
    result = joblogapi.get_ktu_statistic(search_date, orders, sector_types, sectors, fact_status)
    return routine.JSONEncoder().encode({'status':'ok','data':result})
  except Exception, exc:
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})


@post('/handlers/joblog/get_new_statistic/')
@post('/handlers/joblog/get_new_statistic')
def get_new_statistic():
  '''
    #1761 Выгрузка рабочих (КТУ). Версия2
  '''
  userlib.check_handler_access("joblog_statistic","r")
  try:
    usr = userlib.get_cur_user()
    # get request params
    request_data = request.json
    orders = request_data.get('orders', [])
    sectors = [int(sector_key) for sector_key in request_data.get('sectors', [])]
    date_from = datetime.datetime.strptime(request_data.get('date_from'), '%d.%m.%Y') if request_data.get('date_from') else ''
    date_to = datetime.datetime.strptime(request_data.get('date_to'), '%d.%m.%Y') if request_data.get('date_to') else ''

    # получение данных
    data = workordermodel.get_fact_work_stat5({
      'orders': orders,
      'sectors': sectors,
      'date_from': date_from,
      'date_to': date_to
    })
    return routine.JSONEncoder().encode({'status':'ok','data' : data})
  except Exception, exc:
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})
