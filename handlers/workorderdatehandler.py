#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route, get, post, put, request, error, abort, response, debug, BaseRequest
BaseRequest.MEMFILE_MAX = 1024 * 1024 * 100
import datetime
import bson
from bson.objectid import ObjectId
from libraries import userlib
import routine
import config
from models import workordermodel, contractmodel, planshiftreason,sectormodel, noticemodel, usermodel,claimsmodel
from helpers import mailer
from routine import strToInt, JSONEncoder
from bson.objectid import ObjectId
from models import countersmodel
from traceback import print_exc
from copy import deepcopy,copy
from xlrd import open_workbook
from xlutils.copy import copy as wbcopy
from xlwt import Workbook, XFStyle, Alignment, Font

from apis.workorder import workorderapi
from apis.contract import contractapi
from traceback import print_exc

@get('/handlers/workorder/notify')
def workorder_notify():
  '''
  Функция принудительного вызова опопвещений о ближайших планах
  '''
  return workorderapi.make_work_order_plan_dates_notification()

# @get('/handlers/workorderdate/search/<search_number>/<search_type>')
# def get_work_orders(search_number, search_type):
@post('/handlers/workorderdate/search/')
def get_work_orders():
  '''
  Получить данные по нарядам по входным параметрам
  Входные параметры могут быть: [номер договора, номер заказа, номер наряда]
  '''
  import gzip
  import StringIO

  userlib.check_handler_access("workorderdate","r")
  try:
    search_number = request.json['search_number']
    search_type = request.json['search_type']
    filter_sectors = request.json['filter_sectors']
    filter_workorders = request.json['filter_workorders']
    filter_works = request.json['filter_works']
    contract = None # номер договора
    product = None # номер продукции
    unit = None # номер единицы продукции
    workorder_number = None # номер наряда
    # результирующие переменные
    res_contract_info = None
    res_work_orders  = None
    # получение параметров поиска
    args = search_number.split('.')
    if search_type=='contract':
      contract = int(args[0])
    elif search_type=='order':
      contract = int(args[0])
      product = int(args[1])
      unit  = int(args[2]) if len(args)>2 else None
    elif search_type == 'workorder':
      workorder_number = int(args[0])
    # получение данных о нарядах  по заданным парамтрам
    res_work_orders = workorderapi.get_work_orders(contract, product, unit, workorder_number, filter_sectors, filter_workorders, filter_works)

    if search_type == 'workorder':
      if not res_work_orders or len(res_work_orders)==0:
        return {'result':None, 'status':'error', 'msg': 'По заданным параметрам наряды не найдены.'}
      contract = res_work_orders[0]['contract_number']
      product = res_work_orders[0]['production_number']
      unit = res_work_orders[0]['production_unit_number']

    # получение информации о договоре и его продукции
    contract_products_data = contractmodel.get_all_products_include_additional(int(contract))
    contract_data = contractmodel.get_by_number(contract)

    # формируем результат по договору
    res_contract_info = {
      'number': contract,
      'orders': []
    }
    if contract_products_data:
      for product_id in contract_products_data:
        product_row = contract_products_data[product_id]
        for unit_row in product_row.get('units', []):
          if (not product and product!=0) or product == product_row['number']:
            if (not unit and unit!=0) or unit == unit_row['number']:
              # tmp_key = '{0}.{1}.{2}'.format(str(contract), str(product_row['number']), str(unit_row['number']))
              res_contract_info['orders'].append({
                'info': {
                  'contract_number': contract_data['number'],
                  'contract_id': contract_data['_id'],
                  'production_number': product_row['number'],
                  'production_name': product_row['name'],
                  'production_id': product_row['_id'],
                  'production_unit_number': unit_row['number'],
                  'production_unit_id': unit_row['_id']
                }
              })
    res_contract_info['orders'].sort(key=lambda x:(x['info']['contract_number'], x['info']['production_number'], x['info']['production_unit_number']))
    # сжатие данных gzip-ом
    res = routine.JSONEncoder().encode({'status': 'ok', 'work_orders':res_work_orders, 'contract_info': res_contract_info})
    response.add_header("Content-Encoding", "gzip")
    s = StringIO.StringIO()
    with gzip.GzipFile(fileobj=s, mode='w') as f:
      f.write(res)
    return s.getvalue()
  except Exception, exc:
    excType = exc.__class__.__name__
    print_exc()
    return {'result':None, 'status':'error', 'msg': str(exc)}

@post('/handlers/workorderdate/get_transfer_info')
def get_transfer_info():
  '''
    Получение информации о переносах сроков и затронутых нарядах при переносах
  '''
  # проверка досутпов
  userlib.check_handler_access("workorderdate","w")
  response.content_type = "application/json; charset=UTF-8"
  try:
    usr = userlib.get_cur_user()
    # список нарядов с работами на сохранение
    data_to_save = request.json['data_to_save']
    # вызов функции сохранения данных
    data = workorderapi.get_transfers_detail_info(data_to_save, usr['email'], usr.get('fio'))

    return routine.JSONEncoder().encode({'status': 'ok', 'data': data })
  except Exception,exc:
    excType = exc.__class__.__name__
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@put('/handlers/workorderdate/save')
def save_work_order_dates():
  '''
  Сохранение измененных плановых дат нарядов.
  Сохранение переносов сроков, если такие имеются
  Сохранение простоев, если такие имеются
  С клиента приходит  список нарядов, каждый из которых имеет вложенный список plan_work
  В рамках сохранения:
    1. Проверяется выход за укрупненное планирование
    2. Обновляются данные по привязанным платежам
    3. Проверяются переносы сроков нарядов и работ
    4. Выполняется рассылка о наличии переноса сроков
    5. Сохраняются простои работ
  '''
  import uuid
  # проверка досутпов
  userlib.check_handler_access("workorderdate","w")
  response.content_type = "application/json; charset=UTF-8"
  try:
    usr = userlib.get_cur_user()
    # уникальный ключ в рамках сохранения данных
    group_key = str(uuid.uuid1())
    # сохранение данных по простоям
    if request.json.get('holds'):
      workorderapi.save_holds(group_key, request.json['holds'], usr['email'])
    # вызов функции сохранения данных по датам
    if request.json.get('data_to_save'):
      workorderapi.save_work_order_dates(
        group_key,
        request.json['data_to_save'],
        usr['email'],
        usr.get('fio')
      )
    return routine.JSONEncoder().encode({'status': 'ok' })
  except Exception,exc:
    excType = exc.__class__.__name__
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@post('/handlers/workorderdate/check_reason_note_format')
def check_reason_note_format():
  '''
    Функция проверки корректности формата данных комментария к причине переноса сроков
  '''
  try:
    userlib.check_handler_access('workorderdate','w')
    workorderapi.check_reason_note_format(request.json['data'], request.json['reason'])
    return routine.JSONEncoder().encode({'status':'ok'})
  except Exception,exc:
    excType = exc.__class__.__name__
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@get('/handlers/workorderdate/cancel_shift/<shift_key>/<mail_header:path>')
def cancel_shift(shift_key, mail_header):
  '''
  Функция отмены переноса сроков по работам наряда.
  shift_key - уникальный ключ переноса
  mail_header - заголовок письма
  '''
  userlib.check_handler_access("workorderdate","w")
  usr = userlib.get_cur_user()
  try:
    workorderapi.cancel_shift(shift_key, mail_header, '',usr['email'], usr.get('fio'))
    return routine.JSONEncoder().encode({'status': 'ok'})
  except Exception, exc:
    excType = exc.__class__.__name__
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@post('/handlers/workorderdate/cancel_shift/')
def cancel_shift():
  '''
    Функция отмены переноса сроков по работам наряда.
  '''

  # Отменять корректировки могут только пользователи с расширенными правами
  if not userlib.check_handler_additional_access("workorderdate","cancel_transfer"):
    return routine.JSONEncoder().encode({'status': 'error','msg':'Доступ запрещен. У вас недостаточно прав для отмены корректировок.'})

  response.content_type = "application/json; charset=UTF-8"
  # получение парамтеров корректировки
  param = request.json

  shift_key = param['shift_key']
  mail_header = param['shift_header']
  note = param['shift_comment']
  usr = userlib.get_cur_user()
  try:
    workorderapi.cancel_shift(shift_key, mail_header, note, usr['email'], usr.get('fio'))
    return routine.JSONEncoder().encode({'status': 'ok'})
  except Exception, exc:
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})


@post('/handlers/workorderdate/link_work_to_work')
def link_work_to_work():
  '''
  Установка зависимости одной работы от другой
  '''
  from traceback import print_exc
  userlib.check_handler_access("workorderdate","w")
  response.content_type = "application/json; charset=UTF-8"
  try:
    result = None
    usr = userlib.get_cur_user()
    param = request.json
    # главная работа, от даты которой будет зависеть дата текущей работы
    # {'workorder_number': '', 'work_number': ''}
    linked_work_obj = param['linked_work']
    # номер наряда к которому относится текущая работа
    current_workorder_number = param['workorder_number']
    # информация о текущей работе
    current_work_obj = param['current_work']
    # количество дней перед стартом текущей работы
    days_before_start = routine.strToInt(param['days_before_start'])
    # линковка для планов по договору или для собственных планов
    is_contract_plan = param.get('is_contract_plan',False)
    result =  workorderapi.link_work_to_work(linked_work_obj, current_workorder_number, current_work_obj, days_before_start, usr['email'], is_contract_plan)
    return routine.JSONEncoder().encode({'status': 'ok', 'data': result})
  except Exception, exc:
    excType = exc.__class__.__name__
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@post('/handlers/workorderdate/link_group_work_to_work')
def link_group_work_to_work():
  '''
  Установка зависимости одной работы от другой
  '''
  from traceback import print_exc
  userlib.check_handler_access("workorderdate","w")
  response.content_type = "application/json; charset=UTF-8"
  try:
    result = None
    usr = userlib.get_cur_user()
    param = request.json
    # главная работа, от даты которой будет зависеть дата текущей работы
    # {'workorder_number': '', 'work_number': ''}
    linked_work_obj = param['linked_work']
    # количество дней перед стартом текущей работы
    days_before_start = routine.strToInt(param['days_before_start'])
    # работы которым необходимо задать условные даты
    data_to_link = param['data_to_link']
    result =  workorderapi.link_group_work_to_work(linked_work_obj, data_to_link, days_before_start,usr['email'])
    return routine.JSONEncoder().encode({'status': 'ok'})
  except Exception, exc:
    excType = exc.__class__.__name__
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@post('/handlers/workorderdate/unlink_work_from_work')
def unlink_work_from_work():
  '''
  Удаление зависимости одной работы от другой
  '''
  from traceback import print_exc
  userlib.check_handler_access("workorderdate","w")
  response.content_type = "application/json; charset=UTF-8"
  try:
    usr = userlib.get_cur_user()
    param = request.json
    # номер наряда к которому относится текущая работа
    current_workorder_number = param['workorder_number']
    # информация о текущей работе
    current_work_obj = param['current_work']
    # по договору или для собственных планов
    is_contract_plan = param.get('is_contract_plan',False)
    workorderapi.unlink_work_from_work(current_workorder_number, current_work_obj,is_contract_plan, usr['email'])
    return routine.JSONEncoder().encode({'status': 'ok'})
  except Exception, exc:
    excType = exc.__class__.__name__
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@post('/handlers/workorderdate/unlink_group_work_from_work')
def unlink_group_work_from_work():
  '''
  Удаление зависимости группы работ от других работ
  '''
  from traceback import print_exc
  userlib.check_handler_access("workorderdate","w")
  response.content_type = "application/json; charset=UTF-8"
  try:
    usr = userlib.get_cur_user()
    param = request.json
    workorderapi.unlink_group_work_from_work(param)
    return routine.JSONEncoder().encode({'status': 'ok'})
  except Exception, exc:
    excType = exc.__class__.__name__
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@post('/handlers/workorderdate/remove_work_from_workorder')
def remove_work_from_workorder():
  '''
  Удаление работы с наряда
  При удалении идет проверка на наличие фактов у данной работы. Работу с фактами удалит нельзя
  '''
  from traceback import print_exc
  userlib.check_handler_access("workorderdate","w")
  response.content_type = "application/json; charset=UTF-8"
  try:
    usr = userlib.get_cur_user()
    param = request.json
    workorderapi.remove_work_from_workorder(routine.strToInt(param['workorder_number']), param['work']['_id'], usr['email'])
    return routine.JSONEncoder().encode({'status': 'ok'})
  except Exception, exc:
    excType = exc.__class__.__name__
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@post('/handlers/workorderdate/remove_workorder')
def remove_workorder():
  '''
  Удаление наряда
  Удалить наряд возможно только если по нему не было фактов, если есть факты удалить нард нельзя
  '''
  from traceback import print_exc
  userlib.check_handler_access("workorderdate","w")
  response.content_type = "application/json; charset=UTF-8"
  try:
    usr = userlib.get_cur_user()
    param = request.json
    workorderapi.remove_workorder(routine.strToInt(param['workorder_number']), usr['email'])
    return routine.JSONEncoder().encode({'status': 'ok'})
  except Exception, exc:
    excType = exc.__class__.__name__
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@put('/handlers/workorder/add_workorder')
def add_workorder():
  '''
    Функция добавления новых нарядов
  '''
  userlib.check_handler_access("workorderdate","w")
  response.content_type = "application/json; charset=UTF-8"
  try:
    usr = userlib.get_cur_user()
    res = workorderapi.add_workorder(
      request.json['data'],
      usr['email']
    )
    return routine.JSONEncoder().encode({'status':'ok', 'result':res})
  except Exception, exc:
    excType = exc.__class__.__name__
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@put('/handlers/workorder/edit_workorder')
def edit_workorder():
  '''
    Функция редактирования существующего наряда
  '''
  userlib.check_handler_access("workorderdate","w")
  response.content_type = "application/json; charset=UTF-8"
  try:
    usr = userlib.get_cur_user()
    res = workorderapi.edit_workorder(
      request.json['data'],
      request.json['workorder_id'],
      usr['email']
    )
    return routine.JSONEncoder().encode({'status':'ok', 'result':res})
  except Exception, exc:
    excType = exc.__class__.__name__
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

# @put('/handlers/workorder/add_blanks')
# def add_blanks():
#   '''
#   Функция добавления бланков в наряды
#   '''
#   userlib.check_handler_access("workorderdate","w")
#   response.content_type = "application/json; charset=UTF-8"
#   usr = userlib.get_cur_user()
#   try:
#     wObjList = []
#     # сформировать список Id Для нарядов
#     for w in request.json['data_to_save']:
#       wObjList.append(ObjectId(w))
#     # вызов API
#     fileUrl = workorderapi.add_blanks(wObjList, usr['email'])
#     return routine.JSONEncoder().encode({'status':'ok','fileurl':fileUrl})
#   except Exception, exc:
#     excType = exc.__class__.__name__
#     print_exc()
#     return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})
#

@get('/handlers/workorder/add_blanks/<ids>')
def add_blanks(ids):
  '''
    Функция добавления бланков в наряды
  '''
  userlib.check_handler_access("workorderdate","w")
  usr = userlib.get_cur_user()
  try:
    res = workorderapi.add_blanks([ObjectId(w) for w in ids.split(';')], usr['email'])
    response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=UTF-8'
    response.headers['Content-Type'] = 'application/vnd.ms-excel'
    response.headers['Content-Disposition'] = 'attachment; filename='+ res['file_name']
    return res['stream'].getvalue()
  except Exception, exc:
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@put('/handlers/workorder/close_workorders')
def close_workorders():
  '''
    Функция закрытия нарядов
  '''
  userlib.check_handler_access("workorderdate","w")
  response.content_type = "application/json; charset=UTF-8"
  try:
    data_to_save = request.json['data_to_save'] # список номеров нарядов с id
    note = request.json['note'] # пометка
    result = workorderapi.close_workorders(data_to_save, note, userlib.get_cur_user()['email'])
    return routine.JSONEncoder().encode({'status':'ok'})
  except Exception, exc:
    excType = exc.__class__.__name__
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})


@get('/handlers/workorder/check_on_closed/<numbers>')
def check_on_closed(numbers):
  '''
    Check workorders on closed.
    If all plan works in workorder are closed then need to close workorder too
    order - "4324 234 234 23423" -  string with list of  workorders
  '''
  try:
    userlib.check_handler_access("workorderdate","w")
    numbers = list(map(lambda x: routine.strToInt(x), routine.normalize_string(numbers).split(' ')))
    usr = userlib.get_cur_user()
    # get list of workorders from DB
    ids = [ row['_id']  for row in  workordermodel.get_list_by({'number':{'$in': numbers}},{'_id':1}) ]
    # close workorders if it necessary
    workorderapi.close_workorder_if_all_works_completed(ids, usr['email'])
    return routine.JSONEncoder().encode({'status': 'ok'})
  except Exception, exc:
    excType = exc.__class__.__name__
    print_exc()
    print('Error! check_on_closed: ' + str(exc))
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@put('/handlers/workorder/add_new_work')
def add_new_work():
  '''
    Функция добавления работы на участок
  '''
  userlib.check_handler_access("workorderdate","w")
  response.content_type = "application/json; charset=UTF-8"
  try:
    usr = userlib.get_cur_user()
    res = workorderapi.add_new_work(
      request.json['name'],
      request.json['unit'],
      request.json['sector']['sector_code'],
      request.json['comment'],
      request.json['work_type']=='specific', # common/specific
      usr['email']
    )
    return routine.JSONEncoder().encode({'status':'ok', 'result':res})
  except Exception, exc:
    excType = exc.__class__.__name__
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@post('/handlers/workorderdate/save_settings')
def save_work_orders_settings():
  '''
    Сохранение календарных и ресурсных настроек по нарядам и работам
  '''
  import uuid
  # проверка досутпов
  userlib.check_handler_access("workorderdate","w")
  response.content_type = "application/json; charset=UTF-8"
  try:
    usr = userlib.get_cur_user()
    # уникальный ключ в рамках сохранения данных
    group_key = str(uuid.uuid1())
    # сохранение
    workorderapi.save_work_orders_settings(
        group_key,
        request.json['work_orders'],
        request.json['settings'],
        usr['email'],
        usr.get('fio')
      )
    return routine.JSONEncoder().encode({'status': 'ok' })
  except Exception,exc:
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@post('/handlers/workorderdate/remove_settings')
def remove_work_orders_settings():
  '''
    Удаление календарных и ресурсных настроек по нарядам и работам
  '''
  import uuid
  # проверка досутпов
  userlib.check_handler_access("workorderdate","w")
  response.content_type = "application/json; charset=UTF-8"
  try:
    usr = userlib.get_cur_user()
    # сохранение
    workorderapi.remove_work_orders_settings(
      request.json['work_orders'],
      usr['email'],
      usr.get('fio')
    )
    return routine.JSONEncoder().encode({'status': 'ok' })
  except Exception,exc:
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@post('/handlers/workorderdate/save_pause')
def save_work_orders_settings():
  '''
    Приостановка планов
  '''
  import uuid
  # проверка досутпов
  userlib.check_handler_access("workorderdate","w")
  response.content_type = "application/json; charset=UTF-8"
  try:
    usr = userlib.get_cur_user()
    # уникальный ключ в рамках сохранения данных
    group_key = str(uuid.uuid1())
    # сохранение
    workorderapi.save_work_orders_pause(
        group_key,
        request.json['work_orders'],
        request.json['pause'],
        usr['email'],
        usr.get('fio')
      )
    return routine.JSONEncoder().encode({'status': 'ok' })
  except Exception,exc:
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@post('/handlers/workorderdate/remove_pause')
def remove_work_orders_settings():
  '''
    Отмена приостановки планов
  '''
  import uuid
  # проверка досутпов
  userlib.check_handler_access("workorderdate","w")
  response.content_type = "application/json; charset=UTF-8"
  try:
    usr = userlib.get_cur_user()
    # сохранение
    workorderapi.remove_work_orders_pause(
      request.json['work_orders'],
      usr['email'],
      usr.get('fio')
    )
    return routine.JSONEncoder().encode({'status': 'ok' })
  except Exception,exc:
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})
