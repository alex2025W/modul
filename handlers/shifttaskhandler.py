#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route, get, post, put, request, error, abort, response, debug, BaseRequest, template
import datetime, time, routine, config
import uuid
import bson
from bson.objectid import ObjectId
from traceback import print_exc
from libraries import userlib
from models import  specificationmodel, productionordermodel, shifttaskmodel, stockmodel, countersmodel
from apis.esud import shifttaskapi
import gzip
import StringIO

@get('/handlers/shift_task/search/<order_number>')
def get_order(order_number):
  '''
  Получение данных о спецификациях из заданий на производство по номеру заказа
  '''
  userlib.check_handler_access("shift_tasks","r")
  try:
    if not order_number:
      return routine.JSONEncoder().encode({'status': 'error','msg': 'Заданы неверные параметры для получения данных.', 'res': None})
    # получение информации о заданиях на производство по номеру заказа
    res = shifttaskapi.get_order(order_number)
    start = time.clock()
    # сжатие данных gzip-ом
    res = routine.JSONEncoder().encode({'status': 'ok', 'result':res})
    response.add_header("Content-Encoding", "gzip")
    s = StringIO.StringIO()
    with gzip.GzipFile(fileobj=s, mode='w') as f:
      f.write(res)
    print "Time zip is: ", time.clock() - start
    return s.getvalue()
  except Exception, exc:
    excType = exc.__class__.__name__
    print_exc()
    return {'result':None, 'status':'error', 'msg': str(exc)}

@get('/handlers/shift_task/get_techno_map/<order_number>')
def get_techno_map(order_number):
  '''
  Получение данных технологической карте заказа
  '''
  userlib.check_handler_access("shift_tasks","r")
  try:
    if not order_number:
      return routine.JSONEncoder().encode({'status': 'error','msg': 'Заданы неверные параметры для получения данных.', 'res': None})
    # получение информации о заданиях на производство по номеру заказа
    res = shifttaskapi.get_order_techno_map(order_number)
    start = time.clock()
    # сжатие данных gzip-ом
    res = routine.JSONEncoder().encode({'status': 'ok', 'result':res})
    response.add_header("Content-Encoding", "gzip")
    s = StringIO.StringIO()
    with gzip.GzipFile(fileobj=s, mode='w') as f:
      f.write(res)
    print "Time zip is: ", time.clock() - start
    return s.getvalue()
  except Exception, exc:
    excType = exc.__class__.__name__
    print_exc()
    return {'result':None, 'status':'error', 'msg': str(exc)}

@get('/handlers/shift_task/get/<task_number>')
def get_task(task_number):
  '''
  Получение данных о задании на смену
  '''
  userlib.check_handler_access("shift_tasks","r")
  try:
    if not task_number:
      raise Exception("Заданы неверные параметры для получения данных.")
    start = time.clock()
    # получение информации о задании на производство
    res = shifttaskmodel.get({'number': routine.strToInt(task_number)})
    if not res:
      raise Exception("Задание не найдено.")
    print "Full time get_task is: ", time.clock() - start

    return routine.JSONEncoder().encode({'status': 'ok', 'result':res})
  except Exception, exc:
    excType = exc.__class__.__name__
    print_exc()
    return {'result':None, 'status':'error', 'msg': str(exc)}

@put('/handlers/shift_task/savedata')
def save_data():
  '''
  Сохранение новых сменных заданий
  '''
  response.content_type = "application/json; charset=UTF-8"
  userlib.check_handler_access("shift_tasks","w")
  try:
    usr = userlib.get_cur_user()
    # get request info
    dataToSave = request.json;
    if not dataToSave or len(dataToSave)==0:
      return routine.JSONEncoder().encode({'status': 'error','msg':'Ошибка сохранения. Нет данных на сохранение.'})
    # # информация об участке на который выдается задание
    # sector_info = dataToSave['sector']
    # информация о спецификациях, попавших в задание
    data_info = dataToSave['data']
    # информация о заказе
    order_info = dataToSave['order_info']
    # комментарий
    note = dataToSave.get('note','')
    # шаблоны раскроя, еслиыбли применены
    templates = dataToSave.get('templates',None)
    # проходим по всем шаблонам и в поле qty кладем  значение поля count
    if templates:
      for template in templates:
        template['qty'] = template.get('count',0)
        # удаление лишних данных
        del template['applied_to']
        del template['applied_count']
        del template['fact_count']

    # Некорректные даты для заданий. Все, что меньше текущей даты, то некорректно
    incorrect_dates = []

    # даты на которые необходимо создать задания
    task_dates = []
    for task_date_str in dataToSave['dates']:
      task_date = datetime.datetime.strptime(task_date_str, '%d/%m/%Y')
      task_dates.append(task_date)
      if task_date <datetime.datetime.combine( datetime.datetime.utcnow(),datetime.time.min):
        incorrect_dates.append(task_date)

    if len(incorrect_dates)>0 and not usr.get('admin'):
      return routine.JSONEncoder().encode({'status': 'error','msg': 'Некоторые даты меньше текущей. Проверьте все даты и повторите попытку.', 'result': incorrect_dates})

    production_orders = productionordermodel.get_list({'order.number': order_info['number']}, {'product':1, 'order':1, 'number':1, 'items_to_develop':1})
    if not production_orders:
      return routine.JSONEncoder().encode({'status': 'error','msg': 'По указанному номеру заказа нет заданий на производство.', 'result': None})


    # группируем данные по участкам
    data_grouped_by_sectors = {}
    for row in data_info:
      if row['sector']['origin_id'] not in data_grouped_by_sectors:
        data_grouped_by_sectors[row['sector']['origin_id']] = {'sector_info': row['sector'], 'items': []}
      data_grouped_by_sectors[row['sector']['origin_id']]['items'].append(row)

    new_shift_task_numbers = []
    for sector_group_row in data_grouped_by_sectors.values():
      sector_info = sector_group_row['sector_info']
      data_info = sector_group_row['items']
      for task_date in task_dates:
        # создание нового задания на смену
        shift_task = {
          '_id': ObjectId(),
          'number': countersmodel.get_next_sequence('shift_task'),
          'manager_add' : usr['email'],
          'date_add' : datetime.datetime.utcnow(),
          'date' : task_date, # дата на которую выдано задание
          'items': [], # объемы спецификаций, вошедших в задание
          # история изменений
          'history': [{
            '_id': ObjectId(),
            'type' : 'add',
            'user' : usr['email'],
            'date' : datetime.datetime.utcnow()
          }],
          # заказ
          'order':  order_info,
          'sector': {
            'name': sector_info['name'],
            'origin_id': sector_info['origin_id'],
          },
          'note': note,
          'templates': templates
        }
        # внесение информации о спецификациях
        for row in data_info:
          shift_task['items'].append({
            '_id': ObjectId(row['_id']),
            'number': row['number'],
            'name': row['name'],
            'count': {
              'value': routine.strToFloat(row['volume']),
              'unit': row['count']['unit']
            },
            'parent_sector': row.get('parent_sector')
          })

        # добавление задания в БД
        shifttaskmodel.add(shift_task)
        new_shift_task_numbers.append(shift_task['number'])

    # получение обновленных данных
    res = shifttaskapi.get_order(order_info['number'])
    return routine.JSONEncoder().encode({'status': 'ok','result':res, 'new_tasks_numbers': new_shift_task_numbers })
  except Exception,exc:
    excType = exc.__class__.__name__
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@get('/handlers/shift_task_facts/search/<search_date>')
def get_order(search_date):
  '''
  Получение данных о сменных заданиях по дате
  '''
  userlib.check_handler_access("shift_task_facts","r")
  try:
    try:
      search_date = search_date.replace('_', '/')
      search_date =  datetime.datetime.strptime(search_date, '%d/%m/%Y')
    except:
      return {'status':'error', 'msg':'Задан не верный формат даты смены.'}
    if not search_date:
      return routine.JSONEncoder().encode({'status': 'error','msg': 'Укажите дату смены.', 'res': None})
    # получение информации о сменных заданиях по дате
    result = shifttaskapi.get_order_by_date(search_date)
    start = time.clock()
    result = routine.JSONEncoder().encode({'status': 'ok', 'result':result})
    response.add_header("Content-Encoding", "gzip")
    s = StringIO.StringIO()
    with gzip.GzipFile(fileobj=s, mode='w') as f:
      f.write(result)
    print "Time zip is: ", time.clock() - start
    return s.getvalue()

  except Exception, exc:
    excType = exc.__class__.__name__
    print_exc()
    return {'result':None, 'status':'error', 'msg': str(exc)}

@put('/handlers/shift_task_facts/savedata')
def shift_task_facts_save_data():
  '''
  Сохранение фактов по заданной смене
  '''
  response.content_type = "application/json; charset=UTF-8"
  userlib.check_handler_access('shift_task_facts','w')
  try:
    usr = userlib.get_cur_user()
    # get request info
    data = request.json;
    if not data:
      return routine.JSONEncoder().encode({'status': 'error','msg':'Ошибка сохранения. Нет данных на сохранение.'})
    dataToSave = data['task']
    saveType = data.get('type','save')
    templates = dataToSave.get('templates', None)

    # print('-----')
    # print(templates)
    # print('-----')

    is_weekend =  routine.isDateWeekEnd(usr['email'],datetime.datetime.utcnow())
    # результирующий объект на сохранение
    result_to_save = {}

    # подготовка данных к сохранению
    for item in dataToSave['items']:
      item['_id'] = ObjectId(item['_id'])
      if not item.get('pre_fact'):
        item['pre_fact'] = {'value': 0, 'history':[]}
      if not item.get('pre_fact_weight'):
        item['pre_fact_weight'] = 0
      if not item.get('pre_fact_time'):
        item['pre_fact_time'] = 0
      # получение занчения факта
      fact_value = item['fact'].get('value',0) if item['fact'] else 0
      # удаление факта из объекта
      if 'fact' in item:
        del item['fact']
      # заполнение данных на сохранение
      item['pre_fact']['user'] = usr['email']
      item['pre_fact']['date'] = datetime.datetime.utcnow()
      item['pre_fact']['value'] += fact_value
      item['pre_fact']['weekend'] = is_weekend
      if not item['pre_fact'].get('history'):
        item['pre_fact']['history'] = []
      item['pre_fact']['history'].append({
        'user' : usr['email'],
        'date' : datetime.datetime.utcnow(),
        'value':  fact_value,
        'weekend' : is_weekend,
        'fact_weight': item.get('fact_weight',0),
        'fact_time': item.get('fact_time',0)
      })

      item['pre_fact_weight']+=item.get('fact_weight',0)
      item['pre_fact_time']+=item.get('fact_time',0)

      # если идет проводка данных
      if saveType =='save':
        item['fact'] = {
          'user': usr['email'],
          'date': datetime.datetime.utcnow(),
          'value': item['pre_fact'].get('value',0),
          'weekend': is_weekend,
        }
        item['fact_weight']+=item['pre_fact_weight']
        item['fact_time']+=item['pre_fact_time']

    result_to_save['items'] = dataToSave['items']

    # если идет именно проводка факта, то необходимо выставить флаг заверешнности
    # а также перезаписать информацию о шаблонах
    if saveType =='save':
      # информация о завершенности
      result_to_save['complete'] = {
        'user' : usr['email'],
        'date' : datetime.datetime.utcnow(),
        'weekend' : is_weekend
      }
      # информация о шаблонах раскроя
      result_to_save['templates'] = templates

    # сохранение данных с записью в историю
    shifttaskmodel.update({'_id': ObjectId(dataToSave['_id'])},{
      '$set':result_to_save,
      '$push': {
        'history': {
          '_id': ObjectId(),
          'type' : 'change',
          'user' : usr['email'],
          'date' : datetime.datetime.utcnow()
        }
      }
    })

    #issue #1344
    #-----------------------------------------------------------------------------------------------------------------------------------
    # для объектов идущих на склад  необходимо внести объемы на склад
    if saveType =='save':
      # получаем в рамках заказа все объекты со склада
      current_stock_data = stockmodel.get_list({'order.number':dataToSave['order']['number']})
      if current_stock_data and len(current_stock_data)>0:
        groupped_stock_data = {}
        new_data_to_update = {}
        # группируем объекты со склада по номеру заказа и артикулу изделия
        for row in current_stock_data:
          groupped_stock_data[row['item']['number']] = row
        for item in dataToSave['items']:
          # если данное изделие сменного задания идет на склад, то вносим соответствующие изменения в объекте со склада
          if item['number'] in groupped_stock_data:
            # получение занчения факта
            fact_value = item['fact'].get('value',0) if item['fact'] else 0
            if fact_value>0:
              edit_row = groupped_stock_data[item['number']]
              # помечаем объект на обновление
              new_data_to_update[item['number']] = edit_row

              # заносим информацию об изменении объема в историю
              edit_row['history'].append({
                '_id': ObjectId(),
                'value': edit_row['count']['value'],
                'current_value': edit_row['count']['current_value'],
                'received_value': fact_value,
                'note': '',
                'item': {
                  'spec_id': item['_id'],
                  'spec_number': item['number']
                },
                'shift_task':{
                  '_id':dataToSave['_id'],
                  'number': dataToSave['number']
                },
                'user' : usr['email'],
                'date' : datetime.datetime.utcnow(),
                'status': 'received'  # получено на склад (оприходованный объем)
                              })
              # заносим информацию в объемы
              edit_row['count']['received_value']+=fact_value
              # добавляем данные в  remains
              edit_row['remains'].append({
                '_id': ObjectId(),
                'value': edit_row['count']['value'],
                'current_value': edit_row['count']['current_value'],
                'received_value': edit_row['count']['received_value'],
                'develop_value': edit_row['count']['develop_value'],
                'used_value': edit_row['count']['used_value'],
                'user' : usr['email'],
                'date' : datetime.datetime.utcnow(),
              })

        # сохраняем изменения на склад
        if len(new_data_to_update)>0:
          for i in new_data_to_update:
            row = new_data_to_update[i]
            _id = row['_id']
            del row['_id']
            stockmodel.update(_id, row)
    #-----------------------------------------------------------------------------------------------------------------------------------

    # получение обновленных данных из БД
    res = shifttaskmodel.get({'_id': ObjectId(dataToSave['_id'])})
    return routine.JSONEncoder().encode({'status': 'ok','result':res })
  except Exception,exc:
    excType = exc.__class__.__name__
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@get('/handlers/shift_task_facts/report/xls/<number>')
def get_stats_shifttaks_facts_report_xls(number):
  '''
  Выгрузка по фактам заданного сменного задания в XLS
  '''
  from xlrd import open_workbook
  from xlutils.copy import copy as wbcopy
  from xlwt import Workbook, XFStyle, Alignment, Font
  import StringIO
  userlib.check_page_access('shift_task_facts','r')
  response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=UTF-8'
  response.headers['Content-Type'] = 'application/vnd.ms-excel'
  response.headers['Content-Disposition'] = 'attachment; filename=shift_task_facts_{0}.xls'.format(str(number))
  try:
    # получение информации о сменном задании по номеру
    data = shifttaskapi.get_order_by_number(number)
    #Генерация XLS файла
    output = StringIO.StringIO()
    wb = Workbook(encoding='utf-8')
    ws = wb.add_sheet('Data')
    # styles
    al1 = Alignment()
    al1.horz = Alignment.HORZ_LEFT
    al1.vert = Alignment.VERT_TOP
    al1.wrap = Alignment.WRAP_AT_RIGHT
    font = Font()
    font.bold = True
    style1 = XFStyle()
    style1.alignment = al1
    style_header = XFStyle()
    style_header.alignment = al1
    style_header.font = font
    #set header------------
    ws.write(0,0, u"№".encode("utf-8"),style_header)
    ws.write(0,1, u"Артикул".encode("utf-8"),style_header)
    ws.write(0,2, u"Название".encode("utf-8"),style_header)
    ws.write(0,3, u"Кол-во, шт".encode("utf-8"),style_header)
    ws.write(0,4, u"Факт".encode("utf-8"),style_header)
    # columns width
    ws.col(0).width = 256 * 5 # №
    ws.col(1).width = 256 * 15 # Артикул
    ws.col(2).width = 256 * 50 # Название
    ws.col(3).width = 256 * 15 # Кол-во, шт
    ws.col(4).width = 256 * 15 # Факт
    rowIndex = 1
    for row in data['data']['items']:
      ws.write(rowIndex,0, str(rowIndex),style1)
      ws.write(rowIndex,1, row['number'],style1)
      ws.write(rowIndex,2, row['name'],style1)
      ws.write(rowIndex,3, row['count'].get('value',''),style1)
      ws.write(rowIndex,4, '',style1)
      rowIndex+=1
    wb.save(output)
    output.seek(0)
    return output.read()
  except Exception, exc:
    print('Error! get_stats_shifttaks_facts_report_xls.' + str(exc))
    excType = exc.__class__.__name__
    print_exc()
    return {'status':'error', 'msg':'Error! Msg: '+ str(exc)}

@get('/handlers/shift_task_facts/report/pdf/<number>')
def get_stats_shifttaks_facts_report_pdf(number):
  '''
  Выгрузка по фактам заданного сменного задания в PDF
  '''
  from StringIO import StringIO
  from xhtml2pdf import pisa
  response.headers['Content-Type'] = 'application/pdf'
  response.headers['Content-Disposition'] = 'inline; filename=shift_task_facts_{0}.pdf'.format(str(number))
  userlib.check_page_access('shift_task_facts','r')
  try:
    # получение информации о сменном задании по номеру
    data = shifttaskapi.get_order_by_number(number)
    xhtml = template('frontend/shift_task/templates/fact/shift_task_facts_pdf', data=data['data'])
    output =  StringIO()
    pisa.CreatePDF(StringIO(xhtml.encode('utf-8')), output, encoding='UTF-8')
    output.seek(0)
    return output.read()
  except Exception, exc:
    print('Error! get_stats_shifttaks_facts_report_pdf.' + str(exc))
    excType = exc.__class__.__name__
    print_exc()
    return {'status':'error', 'msg':'Error! Msg: '+ str(exc)}
