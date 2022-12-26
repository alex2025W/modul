#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route, get, post, put, request, error, abort, response, debug, BaseRequest
BaseRequest.MEMFILE_MAX = 1024 * 1024 * 100
import datetime
import pprint
import uuid
import bson
from bson.objectid import ObjectId
from libraries import userlib
import routine
import config
from models import workordermodel, contractmodel, planshiftreason,sectormodel, noticemodel, usermodel,claimsmodel
from helpers import mailer
from routine import strToInt, JSONEncoder
from bson.objectid import ObjectId
from libraries import excellib
from models import countersmodel
from traceback import print_exc
from copy import deepcopy,copy
from xlrd import open_workbook
from xlutils.copy import copy as wbcopy
from xlwt import Workbook, XFStyle, Alignment, Font

from apis.workorder import workorderapi
import gzip
import StringIO

@get('/handlers/workorder_getclaims/')
def get_workorder_claims():
  userlib.check_handler_access("workorderdate","r")
  q = request.query['q']
  ls = claimsmodel.get_list_by({}, None)
  res = []
  for cl in ls:
    if q in str(cl['number']):
      res.append({'id':cl['_id'],'name':str(cl['number'])})
      if len(res)>20:
        break
  return routine.JSONEncoder().encode(res)

@post('/handlers/contract_find')
def contract_find():
  '''
  Поиск нарядов для формы - "Наряды"
  Входными параметрами могут быть: {номер наряда, номер договора, номер заказа}
  '''
  userlib.check_handler_access("workorderdate","r")
  # поиск по номеру договора
  contract = None
  if request.json['type']=='contract':
    contract = contractmodel.get_by({'number':strToInt(request.json['num']), '$or': [{ "parent_id": { '$exists': False }},{ "parent_id":None},{"parent_id": ''}]})
  elif request.json['type']=='order':
    args = request.json['num'].split('.')
    if len(args)==1:
      return {'status':'error', 'msg':'Указан неверный номер заказа.'}
    contract_number = int(args[0])
    product_number = int(args[1])
    contract = contractmodel.get_by({'number':contract_number, '$or': [{ "parent_id": { '$exists': False }},{ "parent_id":None},{"parent_id": ''}]})
  else:
    # поиск по номеру наряда
    worder = workordermodel.get_by({'number':strToInt(request.json['num'])})
    if worder is not None:
      contract = contractmodel.get_by({'_id':worder['contract_id']})
    pass

  if contract is None:
    if request.json['type']=='contract':
      return {'status':'error', 'msg':'Договор не найден. Повторите попытку.'}
    elif request.json['type']=='workorder':
      return {'status':'error', 'msg':'Наряд не найден. Повторите попытку.'}
    else:
      return {'status':'error', 'msg':'Заказ не найден. Повторите попытку.'}

  # добавляем допники к контракту
  dop_list = contractmodel.get_list_by({'parent_id': contract['_id']})
  # добавляем продукцию из них в договору
  for d in dop_list:
    for p in d['productions']:
      contract['productions'].append(p)

  sectorsIds = []
  # заполняются наряды для контракта
  wOrdCursor = workordermodel.get(
    {
      'contract_id':contract['_id']
    },
    {
      '_id':1,'sector_id':1,
      'production_id':1,
      'production_number':1,
      'sector_code':1,
      'production_id':1,
      'number':1,
      'production_units':1,
      'plan_work':1,
      'blanks':1,
      'status':1,
      'status_date': 1,
      'remarks':1
    })

  wOrders = []
  for wo in wOrdCursor:
    for prod in contract['productions']:
      prod['sectors']={}
      # убираю единицы со статусом added
      i=0
      while i<len(prod['units']):
        if prod['units'][i]['status']=='added':
          prod['units'].remove(prod['units'][i])
        else:
          i=i+1
      for u in prod['units']:
        for wu in wo['production_units']:
          if wu['unit_id']==u['_id']:
            if 'workorderlist' not in u:
              u['workorderlist']=[]
            u['workorderlist'].append(wo['_id'])
    if wo['sector_id'] not in sectorsIds:
      sectorsIds.append(wo['sector_id'])
    wOrders.append(wo)
  # получаем сектора
  sDBList = sectormodel.get_sectors({'_id':{'$in':sectorsIds}})
  sList = {}
  for s in sDBList:
    sList[str(s['_id'])] = s
  # убираем продукции, у которых нет единиц продукций
  i=0
  while i<len(contract['productions']):
    bl = False
    for u in contract['productions'][i]['units']:
      if u['status']!='added':
        bl= True
    if bl==False:
      del contract['productions'][i]
    else:
      i = i+1
  for prod in contract['productions']:
    for wo in wOrders:
      if 'production_id' in wo and wo['production_id']==prod['_id']:
        if str(wo['sector_id']) not in prod['sectors']:
          so = sList[str(wo['sector_id'])]
          prod['sectors'][str(wo['sector_id'])] = {'_id':so['_id'],'code':so['code'],'name':so['name'],'worders':[]}
        prod['sectors'][str(wo['sector_id'])]['worders'].append(wo)


  res = routine.JSONEncoder().encode( {'status':'ok', 'contract':JSONEncoder().encode(contract)})

  response.add_header("Content-Encoding", "gzip")
  s = StringIO.StringIO()
  with gzip.GzipFile(fileobj=s, mode='w') as f:
    f.write(res)
  return s.getvalue()


@post('/handlers/save_workorder')
def save_workorder():
  '''
  Функция сохранения отредактированнного наряда
  '''
  userlib.check_handler_access("workorderdate","w")
  wo = workordermodel.get_by({"_id": ObjectId(request.json['w_id'])})
  if 'plan_work' not in wo:
    wo['plan_work'] = []
  # удаляются записи, которые нужно удалить и обновляются, которые нужно обновить
  i = 0
  is_changed = False
  jWorks = request.json["works"]
  wo['remarks'] = request.json['remarks']
  while (i<len(wo['plan_work'])):
    w = wo['plan_work'][i]
    is_find = False
    for j in jWorks:
      if str(w['work_id'])==j['_id']:
        if w['scope']!=j['scope'] or ('days_count' not in w and j['days']>0) or ('days_count' in w and w['days_count']!=j['days']):
          w['date_change'] = datetime.datetime.utcnow()
          w['user_email'] = userlib.get_cur_user()['email']
          w['scope']=j['scope']
          w['days_count']=j['days']
          is_changed = True
        is_find = True
        jWorks.remove(j)
        break
    if is_find==False:
      wo['plan_work'].remove(w)
    else:
      i=i+1
  # добавляются новые записи
  for j in jWorks:
    res = {}
    res['_id'] = ObjectId()
    res['code'] = j['code']
    res['work_id'] = ObjectId(j["_id"])
    res["status"] =''
    res['status_log'] = []
    res["date_finish"] = None
    res["date_start"] = None
    res['date_start_with_shift'] = None
    res['date_finish_with_shift'] = None
    res['date_change'] = datetime.datetime.utcnow()
    res['user_email'] = userlib.get_cur_user()['email']
    res['scope']=j['scope']
    res['days_count']=j['days']
    res['payment_id'] =  j.get('payment_id')
    res['unit'] =  j.get('unit')
    wo['plan_work'].append(res)
    #print res
    is_changed = True
  # если были изменения в списке работ, то меняется и весь наряд
  if is_changed:
    wo['date_change'] = datetime.datetime.utcnow()
    wo['user_email'] = userlib.get_cur_user()['email']

    if 'history' in wo and wo['history'] and len(wo['history'])>0:
      wo['history'].append({
        'date': datetime.datetime.utcnow(),
        'user': userlib.get_cur_user()['email'],
        'type': 'change'
        })
    else:
      wo['history'] = [
        {
          'date': datetime.datetime.utcnow(),
          'user': userlib.get_cur_user()['email'],
          'type': 'change'
        }
      ]

  wid = wo['_id']
  del wo['_id']
  workordermodel.update({"_id":wid},{ '$set':wo},False)
  wo['_id'] = wid
  return {'status':'ok', 'result':JSONEncoder().encode(wo)}

@put('/handlers/add_workorder')
def add_workorder():
  '''
  Функция добавления новых нарядов
  '''
  # добавить наряды
  userlib.check_handler_access("workorderdate","w")
  data = request.json['works']
  sectorsIds = []
  res = []
  unitsIds = []
  contractId=None
  for d in data:
    d['sector_id'] = ObjectId(d['sector_id'])
    if d['sector_id'] not in sectorsIds:
      sectorsIds.append(d['sector_id'])
    d['contract_id'] = ObjectId(d['contract_id'])
    contractId = ObjectId(d['contract_id'])
    d['production_id'] = ObjectId(d['production_id'])
    d['user_email'] = userlib.get_cur_user()['email']
    d['date_start'] = None
    d['date_finish'] = None
    d['date_change'] = datetime.datetime.utcnow()
    d['number'] = countersmodel.get_next_sequence('workorders')
    d['status'] = ''
    d['status_date'] = None
    d['use_weekends'] = True
    d['need_notification'] = False
    d['use_conditional_date'] = False
    d['auto_ktu'] = True
    for pu in d['production_units']:
      pu['unit_id'] = ObjectId(pu['unit_id'])
      unitsIds.append(ObjectId(pu['unit_id']))
      pu['production_id'] = ObjectId(pu['production_id'])
      pu['user_email'] = userlib.get_cur_user()['email']
      pu['date_change'] = datetime.datetime.utcnow()
    for pw in d['plan_work']:
      pw['_id'] = ObjectId()
      pw['work_id'] = ObjectId(pw['work_id'])
      pw['user_email'] = userlib.get_cur_user()['email']
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
      pw['payment_id'] =  None

    # добавление блока истории в наряд
    d['history'] = [
      {
        'date': datetime.datetime.utcnow(),
        'user': userlib.get_cur_user()['email'],
        'type': 'create'
      }
    ]

    res.append(workordermodel.add(d))
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
          u['statuses'].append({'status':'develop','date_change':datetime.datetime.utcnow(),'user_email':userlib.get_cur_user()['email']})
          u['status']='develop'
          u['user_email'] = userlib.get_cur_user()['email']
          u['date_change'] = datetime.datetime.utcnow()
    if isChanged:
      del contract['_id']
      contractmodel.update({'_id':contractId},contract)


  return {'status':'ok', 'result':JSONEncoder().encode(res)}


@post('/handlers/add_blanks')
def add_blanks():
  '''
  Функция добавления бланков в наряды
  '''
  userlib.check_handler_access("workorderdate","w")
  wList = request.json['worders']
  wObjList = []
  # сформировать список Id Для нарядов
  for w in wList:
    wObjList.append(ObjectId(w))
  # получить все наряды
  dbWorkOrders = workordermodel.get({'_id':{'$in':wObjList}},{'_id':1,'number':1,'contract_number':1, 'production_number':1, 'production_units':1, 'plan_work':1, 'sector_id':1  })
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
  # создается XLS и скидывается на гуглдиск. результатом является ссылка на файл на гуглдиске
  fileUrl = excellib.make_workorder_blank(workOrders)
  # пишется в базу созданный бланк
  blank = {'date_change':datetime.datetime.utcnow(),'date':datetime.datetime.utcnow(),'_id':ObjectId(),'user_email':userlib.get_cur_user()['email']}
  workordermodel.update({'_id':{'$in':wObjList}},{'$set':{'user_email':userlib.get_cur_user()['email'],'date_change':datetime.datetime.utcnow()},'$push':{'blanks':blank}},False,True)
  return {'status':'ok','fileurl':fileUrl}

@post('/handlers/send_blanks')
def send_blanks():
  '''
  Отправить письмо со ссылкой на новый бланк
  '''
  userlib.check_handler_access("workorderdate","w")
  try:
    usr = userlib.get_cur_user()
    notice_users = usermodel.get_list(
      {'notice.key': noticemodel.notice_keys['workorder_new_blanks']['key'], 'stat': {'$ne':'disabled' }},
      {'email':1,'fio':1}
    )
    # вызвать функцию отправки сообщения
    header = "Созданы новые бланки"
    body = usr['fio']+' ('+usr['email']+') сообщает: \n' if 'fio' in usr else usr['email'] + "сообщает: \n"
    body = body + "Созданы новые бланки. Скачать можно по ссылке: "+request.json['fileurl']
    mailer.send(header,body,notice_users, False, usr['email'])
    return routine.JSONEncoder().encode({'status': 'ok'})
  except Exception, e:
    print('Error:' + str(e))
    return routine.JSONEncoder().encode({'status': 'error','msg':str(e)})
    pass

@post('/handlers/send_newworkorders_email')
def send_newworkorders_email():
  '''
   отправить писмо о созданных нарядах
  '''
  userlib.check_handler_access("workorderdate","w")
  try:
    usr = userlib.get_cur_user()
    # получить все участки и сгруппировать их по ID
    data = sectormodel.get_by({'is_active':1},{'_id':1,'code':1,'name':1,'type':1,})
    data_sectors = {}
    for sector_row in data:
      data_sectors[str(sector_row['_id'])] = sector_row

    notice_users = usermodel.get_list(
      {
        'notice.key': noticemodel.notice_keys['workorder_data']['key'],
        'stat': {'$ne':'disabled' }
      },
      {'email':1,'fio':1}
    )

    contract_number = request.json['numbers'][0]['contract_number']
    # # добавение группы договора на оповещение
    # contract_group_info = contractmodel.get_google_group_info(contract_number)
    # if contract_group_info:
    #   notice_users.append({'email': contract_group_info['key'], 'fio': ''})
    # else:
    #   notice_users.append({'email': config.contracts_report_recepient, 'fio': ''})

    # вызвать функцию отправки сообщения
    header = "Новые наряды: "
    numstr = ''
    numstr_txt = ''

    for item in request.json['numbers']:
      key =  './'+str(item['contract_number']) + '/' + str(item['contract_number']) + '.' + str(item['production_number']) + '.' + str(item['unit_number']) + '/' + data_sectors[str(item['sector_id'])]['type'] + '/'+str(item['number'])

      numstr_txt = numstr_txt+('' if numstr_txt=='' else ',')+key
      #http://int.modul.org/timeline/#search=4281
      numstr += ('' if numstr=='' else ', ') + '<a href = "http://int.modul.org/timeline/#search='+key+'">'+key+'</a>'

    header = "Новые наряды: "+numstr_txt
    body = usr['fio']+' ('+usr['email']+') сообщает: <br/>' if 'fio' in usr else usr['email'] + "сообщает: <br/>"
    body = body + "Созданы новые наряды: "+ numstr
    mailer.send(header,body,notice_users, True,usr['email'])
    # print('--------------------------------')
    return routine.JSONEncoder().encode({'status': 'ok'})
  except Exception, e:
    print('Error:' + str(e))
    return routine.JSONEncoder().encode({'status': 'error','msg':str(e)})
    pass

@get('/handlers/workorder/get_statistic/')
def api_get_statistic():
  userlib.check_handler_access("workorderdate","r")
  result = {}
  response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=UTF-8'
  response.headers['Content-Type'] = 'application/vnd.ms-excel'
  response.headers['Content-Disposition'] = 'attachment; filename=workorders_stat_'+ datetime.datetime.utcnow().strftime('%d_%m_%Y_%H_%M_%S')+'.xls'
  try:
    # получить список работ из нарядов
    data_workorders = workordermodel.get_stats_workorders()
    # получить список активных участков и работ из справочника участков
    sector_types = {}
    data_sectors = sectormodel.get_by(
      {'is_active':1},
      {
        '_id':1,
        'code':1,
        'name':1,
        'is_active':1,
        'routine':1,
        'type':1,
        'works._id':1,
        'works.code':1,
        'works.name':1,
        'works.unit':1,
        'works.price':1,
        'works.routine':1,
      }
    )
    data_sectors_arr = {}
    for sector_row in data_sectors:
      sector_info = {
        '_id':sector_row['_id'],
        'code':sector_row['code'],
        'name':sector_row['name'],
        'is_active':sector_row['is_active'],
        'routine':sector_row['routine'],
        'type':sector_row['type'],
        'works': {}
      }
      if not sector_row['type'] in sector_types:
        sector_types[sector_row['type']] = {'name': sector_row['type'], 'sectors':{} }

      if not str(sector_row['_id']) in sector_types[sector_row['type']]['sectors']:
        sector_types[sector_row['type']]['sectors'][str(sector_row['_id'])] = {'sector_info': deepcopy(sector_info), 'workorders': {}}

      for work_row in sector_row['works']:
        sector_info['works'][str(work_row['_id'])] = work_row
      data_sectors_arr[str(sector_row['_id'])] = sector_info

    for row in data_workorders:
      if not row['contract_number'] in result:
        result[row['contract_number']] = {
          'contract_number':  row['contract_number'],
          'products': {}
        }

      res_products = result[row['contract_number']]['products']
      if not row['production_number'] in res_products:
        res_products[row['production_number']] = {
          'product': {
            '_id': row['production_id'],
            'number': row['production_number']
            #'name': row['production_name'],
          },
          'units': {}
        }
      res_units = res_products[row['production_number']]['units']
      if not row['unit_number'] in res_units:
        res_units[row['unit_number']] = {
          'unit': {
            'number': row['unit_number']
          },
          'sector_types': deepcopy(sector_types)
        }

      cur_sector_info = data_sectors_arr.get(str(row['sector_id']))
      cur_sector_type = cur_sector_info['type'] if cur_sector_info else None
      res_sector_types = res_units[row['unit_number']]['sector_types']
      if cur_sector_type and res_sector_types:
        sectors = res_sector_types[cur_sector_type]['sectors']
        if str(row['sector_id']) in sectors:
          workorders = sectors[str(row['sector_id'])]['workorders']
          if not row['number'] in workorders:
            workorders[row['number']] = {
                'workorder': {'number': row['number'], 'date_start_with_shift': row['date_start_with_shift'], 'date_finish_with_shift': row['date_finish_with_shift']},
                'works': [],
                'scope': 0
              }
          workorder = workorders[row['number']]

          if len(row['plan_work'])>0:
            for row_plan_work in row['plan_work']:
              full_work_info = data_sectors_arr[str(row['sector_id'])]['works'].get(str(row_plan_work['work_id']))
              if full_work_info:
                item_work_info = deepcopy(full_work_info)
                item_work_info['scope'] = row_plan_work['scope']
                workorder['works'].append(item_work_info)
                workorder['scope']+=row_plan_work['scope'] * item_work_info['price']

    # генерация результирующего XLS
    return __make_workorders_statistic(result)
    #return routine.JSONEncoder().encode({'status': 'ok', 'result': result})
  except Exception, exc:
    excType = exc.__class__.__name__
    print_exc()
    print('Error! Generate work order statistic: ' + str(exc))
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

def __make_workorders_statistic(data):
  '''
    Генерация XLS файла со статистикой по всем нарядам
  '''
  import StringIO
  output = StringIO.StringIO()
  wb = Workbook(encoding='utf-8')
  ws = wb.add_sheet('Data')

  date_format = XFStyle()
  date_format.num_format_str = 'dd/mm/yyyy'
  datetime_format = XFStyle()
  datetime_format.num_format_str = 'dd/mm/yyyy HH:MM'

  #set header------------
  ws.write(0,0, u"Договор".encode("utf-8"))
  ws.write(0,1, u"Заказ".encode("utf-8"))
  ws.write(0,2, u"Направление работ".encode("utf-8"))
  ws.write(0,3, u"Код. уч.".encode("utf-8"))
  ws.write(0,4, u"Назв. уч.".encode("utf-8"))
  ws.write(0,5, u"Наряд".encode("utf-8"))
  ws.write(0,6, u"Код раб.".encode("utf-8"))
  ws.write(0,7, u"Назв. раб.".encode("utf-8"))
  ws.write(0,8, u"Цена на ед.".encode("utf-8"))
  ws.write(0,9, u"Ед. изм.".encode("utf-8"))
  ws.write(0,10, u"Объем".encode("utf-8"))
  ws.write(0,11, u"Сумма работ".encode("utf-8"))
  ws.write(0,12, u"Сумма наряд".encode("utf-8"))
  ws.write(0,13, u"Плановая дата начала работ".encode("utf-8"))
  ws.write(0,14, u"Плановая дата окончания работ".encode("utf-8"))

  # columns width
  ws.col(0).width = 256 * 10 # договор
  ws.col(1).width = 256 * 10 # Номер заказа
  ws.col(2).width = 256 * 20 # Направление работ
  ws.col(3).width = 256 * 10 # Код участка
  ws.col(4).width = 256 * 40 # Название участка
  ws.col(5).width = 256 * 10 # Наряд
  ws.col(6).width = 256 * 10 # Код работы
  ws.col(7).width = 256 * 40 # Название работы
  ws.col(8).width = 256 * 20 # Цена за единицу
  ws.col(9).width = 256 * 20 # Единица измерения
  ws.col(10).width = 256 * 20 # Объем
  ws.col(11).width = 256 * 20 # Сумма работ
  ws.col(12).width = 256 * 20 # Сумма наряд
  ws.col(13).width = 256 * 20 # Сумма работ
  ws.col(14).width = 256 * 20 # Сумма наряд

  rowIndex = 1
  if data is not None:
    for contract_row_number in data:
      contract_row= data[contract_row_number]
      products = contract_row.get('products',{})
      for product_row_number in products:
        product_row = products[product_row_number]
        units = product_row.get('units',{})
        for unit_row_number in units:
          unit_row = units[unit_row_number]
          sector_types = unit_row.get('sector_types',{})
          for sector_type_name in sector_types:
            sector_type_row = sector_types[sector_type_name]
            sectors = sector_type_row.get('sectors', {})
            for sector_row_id in sectors:
              sector_row = sectors[sector_row_id]
              workorders = sector_row.get('workorders', None)
              if workorders:
                for work_order_number in workorders:
                  workorder_row = workorders[work_order_number]
                  works = workorder_row.get('works', {})
                  for work in works:
                    ws.write(rowIndex,0, str(contract_row_number))
                    ws.write(rowIndex,1, str(contract_row_number)+'.'+ str(product_row_number) + '.' + str(unit_row_number))
                    ws.write(rowIndex,2, sector_type_name)
                    ws.write(rowIndex,3, str(sector_row['sector_info']['code']))
                    ws.write(rowIndex,4, sector_row['sector_info']['name'])
                    ws.write(rowIndex,5, str(work_order_number))
                    ws.write(rowIndex,6, str(work['code']))
                    ws.write(rowIndex,7, work['name'])
                    ws.write(rowIndex,8, work['price'])
                    ws.write(rowIndex,9, work['unit'])
                    ws.write(rowIndex,10, work['scope'])
                    ws.write(rowIndex,11, work['scope'] * work['price'])
                    ws.write(rowIndex,12, workorder_row['scope']),
                    ws.write(rowIndex,13, workorder_row['workorder']['date_start_with_shift'], date_format),
                    ws.write(rowIndex,14, workorder_row['workorder']['date_finish_with_shift'], date_format)


                    rowIndex+=1
              else:
                ws.write(rowIndex,0, str(contract_row_number))
                ws.write(rowIndex,1, str(contract_row_number)+'.'+ str(product_row_number) + '.' + str(unit_row_number))
                ws.write(rowIndex,2, sector_type_name)
                ws.write(rowIndex,3, str(sector_row['sector_info']['code']))
                ws.write(rowIndex,4, sector_row['sector_info']['name'])
                # ws.write(rowIndex,5, '')
                # ws.write(rowIndex,6, '')
                # ws.write(rowIndex,7, '')
                # ws.write(rowIndex,8, 0)
                # ws.write(rowIndex,9, '')
                # ws.write(rowIndex,10, 0)
                # ws.write(rowIndex,11, 0)
                # ws.write(rowIndex,12, 0)
                rowIndex+=1
  wb.save(output)
  output.seek(0)
  return output.read()
