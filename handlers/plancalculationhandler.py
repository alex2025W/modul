#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route, get, post, put, request, error, abort, response, debug
import json
import urllib
from bson.objectid import ObjectId
import config
from models import planecalculationmodel, workordermodel, contractmodel, usermodel, materialsgroupmodel
from libraries import userlib, excellib
from xlrd import open_workbook
from xlutils.copy import copy as wbcopy
from xlwt import Workbook, XFStyle, Alignment, Font
from traceback import print_exc
from copy import deepcopy,copy
import datetime, time
import routine

from apis.plannorms import plannormsapi

@put('/handlers/planecalculation/savedata')
def api_save_order_statuses():
  """Save purchase statuses"""
  response.content_type = "application/json; charset=UTF-8"
  userlib.check_handler_access("planecalculation","w")
  usr = userlib.get_cur_user()
  # get request info
  dataToSave = request.json;
  for item in dataToSave:
    updateItem={
      'calculation_id': item['calculation_id'],
      'id': item['id'],
      'status': item['status']
    }
    planecalculationmodel.update_materials_status(updateItem, usr);

  return {'status':'ok'}


@post('/handlers/planecalculation/getorderstatistic')
def api_get_order_statistic():
  """Get purchase filter items"""
  response.content_type = "application/json; charset=UTF-8"
  userlib.check_handler_access("planecalculation","r")
  return json.dumps(planecalculationmodel.get_purchase_statistic())


@get('/handlers/planecalculation/getordercalculationdata')
def api_get_order_calculation():
  """Get purchase items by filters"""
  userlib.check_handler_access("planecalculation","r")

  param = request.query.decode()
  filterData = json.loads(param['filter'])
  filterType = param['type']
  contractNumbers = [];
  sectorIds = [];
  orderNumbers = [];

  # fill order numbers
  for i in filterData['orders']:
    item = filterData['orders'][i]
    orderNumber = item['number']
    contractNumber = routine.strToInt(orderNumber.split('.')[0])
    orderNumbers.append(item['number'])
    contractNumbers.append(contractNumber)
    contractNumbers = list(set(contractNumbers))

  for i in filterData['sectors']:
    item = filterData['sectors'][i]
    sectorIds.append(ObjectId(item['id']))

  result =planecalculationmodel.find_calculation_materials_by(contractNumbers,orderNumbers,sectorIds, filterType)
  return json.dumps(result);

@get('/handlers/planecalculation/get_statistic/')
def api_get_statistic():

  # get parameters
  param = request.query.decode()
  if not 'num' in param or param['num']=="":
    return {'status':'error', 'msg':'Please. Set order number.'}

  userlib.check_handler_access("planecalculation","r")
  response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=UTF-8'
  response.headers['Content-Type'] = 'application/vnd.ms-excel'
  response.headers['Content-Disposition'] = 'attachment; filename=plan_calculation_'+param['num'].replace('.','_').replace(',','+')+'_'+ datetime.datetime.utcnow().strftime('%d_%m_%Y_%H_%M_%S')+'.xls'
  try:
    order_numbers = param['num'].split(',')
    usr = userlib.get_cur_user()
    # получение всех ном
    data = __get_calculation_statistic(order_numbers)
    # return routine.JSONEncoder().encode(data)
    return __make_calculation_statistic(data)
    #return routine.JSONEncoder().encode({'status': 'ok', 'result': data})
  except Exception, exc:
    excType = exc.__class__.__name__
    print_exc()
    print('Generate plan calculation statistic error: ' + str(exc))
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

def __get_calculation_statistic(order_numbers):
  '''Get plan calculation statistic without works'''

  from models import sectormodel, materialsgroupmodel
  resultData =[]

  # get contract and products to search
  contract_numbers = []
  product_numbers = []
  for i in order_numbers:
    tmp_number = i.split('.')
    contract_number = routine.strToInt(tmp_number[0])
    if not contract_number in contract_numbers:
      contract_numbers.append(contract_number)
    if len(tmp_number)>1:
      product_number = routine.strToInt(tmp_number[1])
      if not product_number in product_numbers:
        product_numbers.append(product_number)

  # get sectors list
  arrDataSectors = sectormodel.get_all_only_sectors()
  dataSectors = {}
  for row in arrDataSectors:
    dataSectors[str(row['_id'])] = row;

  # получение спика материалов
  arrDataMaterials = materialsgroupmodel.get_all_materials()
  dataMaterials = {}
  for row in arrDataMaterials:
    dataMaterials[row['_id']] = row;

  # получение спика групп материалов
  arrDataMaterialsGroup = materialsgroupmodel.get_all_only_groups()
  dataMaterialsGroup = {}
  for row in arrDataMaterialsGroup:
    dataMaterialsGroup[row['_id']] = row;

  # получение спика пользователей
  arrDataUsers = usermodel.get_all()
  dataUsers = {}
  for row in arrDataUsers:
    dataUsers[row['email']] = row;

  # Получение номеров нарядов сгруппированных по заказам и участкам из таблицы нарядов
  dataWorkOrderSectors = workordermodel.get_only_sectors(contract_numbers, product_numbers)
  # получение плановых норм
  dataPlanCalculationMaterials = planecalculationmodel.get_calculation_stat(contract_numbers, product_numbers)
  # get  information about production by contract_numbers
  dataProducts = contractmodel.get_all_products_by_contractnumbers(contract_numbers)


  # prepare workorder data
  dataWorkOrderWorksGrouped = {}
  for item in dataWorkOrderSectors:
    key = str(item['contract_number'])+"_" + str(item['production_number'])+"_" + str(item['production_unit_number'])+"_" +str(item['sector_code'])
    plan_sector_statuses = {'started':False, 'completed':False}
    plan_sector_status = 'Не начата'

    min_start_date = None
    if 'plan_work' in item and len(item['plan_work'])>0:
      for i in item['plan_work']:
        for j in i:
          plan_work = j
          # get plan_work_status
          if plan_work['status'] == 'completed':
            plan_sector_statuses['completed'] = True
          elif 'fact_work' in plan_work and len(plan_work['fact_work'])>0:
            plan_sector_statuses['started'] = True

          # get sector date start
          if (min_start_date is not None and 'date_start_with_shift' in plan_work and plan_work['date_start_with_shift'] is not None and plan_work['date_start_with_shift'] !='' and plan_work['date_start_with_shift'] <min_start_date) or (min_start_date is None):
                min_start_date = plan_work['date_start_with_shift']


    if not plan_sector_statuses['started'] and not  plan_sector_statuses['completed']:
      plan_sector_status = 'Не начата'
    elif plan_sector_statuses['completed'] and not plan_sector_statuses['started']:
      plan_sector_status = 'Закончена'
    else:
      plan_sector_status = 'Начата'
    dataWorkOrderWorksGrouped[key] = {'numbers':item['numbers'], 'plan_work_status':plan_sector_status, 'sector_date_start':min_start_date}

  #prepare result
  for item in dataPlanCalculationMaterials:
    product = dataProducts.get(str(item['production_id']))
    if product and 'units' in product and product.get('number')>0:
      for product_unit in product['units']:
        if product_unit['number']>0:
          key = '{0}_{1}_{2}_{3}'.format(
            str(item['contract_number']),
            str(item['product_number']),
            str(product_unit['number']),
            str(item['sector_code'])
          )
          dataWorkOrder = dataWorkOrderWorksGrouped[key] if key in dataWorkOrderWorksGrouped else None
          size = routine.strToFloat(item['pto_size']) * dataMaterials[str(item['material_id'])]['unit_purchase_value']

          # получение информации об уникальное характеристике
          unique_prop_key = ""
          sel_unique_prop = None
          if item.get('unique_props_info'):
            unique_prop_key = item['unique_props_info']['key']
            #sel_unique_prop = item['unique_props_info']
            # получение характеристики из справочника материалов
            for unique_prop in dataMaterials[str(item['material_id'])].get('unique_props',[]):
              if str(unique_prop['key']) == str(item['unique_props_info']['key']):
                sel_unique_prop = unique_prop
                break
          else:
            # старая реализация, оставлено на случай если попадутся в БД, данные у которых не учтен новый формат
            if(item.get('unique_props') and item['unique_props']!="" and 'unique_props' in  dataMaterials[str(item['material_id'])] and len(dataMaterials[str(item['material_id'])]['unique_props'])>0):
              for unique_prop in dataMaterials[str(item['material_id'])]['unique_props']:
                if unique_prop['name'] == item['unique_props']:
                  unique_prop_key = str(unique_prop['key'])
                  sel_unique_prop = unique_prop
                  break

          material_row = {
            'contract_number': item['contract_number'],
            'product_unit_number': product_unit['number'],
            'product_number': item['product_number'],
            'material_group_key': dataMaterials[str(item['material_id'])]['group_code'],
            'material_group_name': dataMaterials[str(item['material_id'])]['group_name'],
            'material_key': dataMaterials[str(item['material_id'])]['code'],
            'material_name': dataMaterials[str(item['material_id'])]['name'],
            'material_unit_pto': dataMaterials[str(item['material_id'])]['unit_pto'],
            'material_unit': dataMaterials[str(item['material_id'])]['unit_purchase'],
            'size': size,
            #'full_size': size * product_units_count,
            #'product_units_count': product_units_count,
            'pto_size': routine.strToFloat(item['pto_size']),
            'facts': item['facts'].get(str(product_unit['number'])) if item.get('facts') and item['facts'].get(str(product_unit['number'])) else {},
            #'pto_full_size': routine.strToFloat(item['pto_size']) * product_units_count,
            'material_unique_props': item.get('unique_props',''),
            'material_unique_props_key': unique_prop_key,           #-----
            # Информация о последней проводке по товару из 1С
            'last_goods': sel_unique_prop.get('last_goods') if sel_unique_prop else dataMaterials[str(item['material_id'])].get('last_goods'),
            'order_number': str(item['contract_number'])+"." + str(item['product_number']) + '.' + str(product_unit['number']),
            'sector_type': dataSectors[str(item['sector_id'])]['type'] if str(item['sector_id']) in dataSectors else'',
            'sector_code':item['sector_code'],
            'status':str(item['status']),
            'sector_name': item['sector_name'],
            'note': item.get('note',''),
            'sector_status': dataWorkOrderWorksGrouped[key]['plan_work_status'] if key in dataWorkOrderWorksGrouped else 'не начата',
            'work_order_numbers': '; '.join(str(routine.strToInt(x)) for x in dataWorkOrder['numbers']) if dataWorkOrder else '',
            'sector_date_start':dataWorkOrderWorksGrouped[key]['sector_date_start'] if key in dataWorkOrderWorksGrouped else '',
            'info': item,
            'date_change': item['date_change'],
            'user_email': item['user_email'],
            'user_name': dataUsers[item['user_email']].get('fio','') if item['user_email'] in dataUsers else ''
          }
          resultData.append(material_row)
  # sort result
  if resultData and len(resultData)>0:
    resultData.sort(key = lambda x: (x['contract_number'],x['product_number'],x['product_unit_number'],x['sector_code']))
  return resultData

def __make_calculation_statistic(data):
  '''Генерация XLS файла со статистикой по материалам заказа'''

  import StringIO
  output = StringIO.StringIO()
  wb = Workbook(encoding='utf-8')
  ws = wb.add_sheet('Data')
  date_format = XFStyle()
  date_format.num_format_str = 'dd/mm/yyyy'
  datetime_format = XFStyle()
  datetime_format.num_format_str = 'dd/mm/yyyy HH:MM'
  al1 = Alignment()
  al1.horz = Alignment.HORZ_LEFT
  al1.vert = Alignment.VERT_TOP
  # al1.wrap = Alignment.WRAP_AT_RIGHT
  style1 = XFStyle()
  style1.alignment = al1
  font_regular = Font()
  # font_regular.bold = True
  font_regular.height = 200 # 8 * 20, for 8 point
  style1.font = font_regular

  date_format.font = font_regular
  datetime_format.font = font_regular

  # header style
  al2 = Alignment()
  al2.horz = Alignment.HORZ_LEFT
  al2.vert = Alignment.VERT_TOP
  al2.wrap = Alignment.WRAP_AT_RIGHT
  style_header = XFStyle()
  style_header.alignment = al2
  font_header = Font()
  font_header.bold = True
  font_header.height = 160 # 8 * 20, for 8 point
  style_header.font = font_header

  ws.set_panes_frozen(True)
  ws.set_horz_split_pos(1)
  ws.set_vert_split_pos(1)
  ws.panes_frozen = True
  # ws.remove_splits = True

  #set header------------
  ws.col(0).width = 256 * 10 # Договор
  ws.col(1).width = 256 * 10 # Заказ
  ws.col(2).width = 256 * 10 # Направление
  ws.col(3).width = 256 * 40 # Участок
  ws.col(4).width = 256 * 15 # Дата начала работ на участке
  ws.col(5).width = 256 * 15 # Статус работ на участке
  ws.col(6).width = 256 * 10 # Номер наряда
  ws.col(7).width = 256 * 15 # Статус материала
  ws.col(8).width = 256 * 15 # Группа материалов
  ws.col(9).width = 256 * 10 # Артикул материала
  ws.col(10).width = 256 * 60 # Материал
  ws.col(11).width = 256 * 60 # Характеристика
  ws.col(12).width = 256 * 60 # примечание
  ws.col(13).width = 256 * 10 # Ед. изм
  ws.col(14).width = 256 * 10 # Объём по спецификации
  ws.col(15).width = 256 * 10 # Объём в оплате
  ws.col(16).width = 256 * 10 # Объём оплаченный
  ws.col(17).width = 256 * 10 # Объём на складе
  ws.col(18).width = 256 * 10 # Отгружено
  ws.col(19).width = 256 * 10 # Не отгружено
  ws.col(20).width = 256 * 10 # Не оплачено

  ws.col(21).width = 256 * 15 # Дата изменений
  ws.col(22).width = 256 * 30 # Пользователь
  ws.col(23).width = 256 * 15 # Цена, последняя (без НДС)
  ws.col(24).width = 256 * 15 # Дата посл. закупки
  ws.col(25).width = 256 * 15 # Посл. счёт
  ws.col(26).width = 256 * 15 # Посл. товар, код
  ws.col(27).width = 256 * 15 # Посл. товар, коэф

  ws.write(0,0, u"Договор".encode("utf-8"),style_header)
  ws.write(0,1, u"Заказ".encode("utf-8"),style_header)
  ws.write(0,2, u"Направление".encode("utf-8"),style_header)
  ws.write(0,3, u"Участок".encode("utf-8"),style_header)
  ws.write(0,4, u"Дата начала работ на участке".encode("utf-8"),style_header)
  ws.write(0,5, u"Статус работ на участке".encode("utf-8"),style_header)
  ws.write(0,6, u"Номер наряда".encode("utf-8"),style_header)
  ws.write(0,7, u"Статус материала".encode("utf-8"),style_header)
  ws.write(0,8, u"Группа материалов".encode("utf-8"),style_header)
  ws.write(0,9, u"Артикул материала".encode("utf-8"),style_header)
  ws.write(0,10, u"Материал".encode("utf-8"),style_header)
  ws.write(0,11, u"Характеристика".encode("utf-8"),style_header)
  ws.write(0,12, u"Примечание".encode("utf-8"),style_header)
  ws.write(0,13, u"Ед. изм".encode("utf-8"),style_header)
  ws.write(0,14, u"По спецификации".encode("utf-8"),style_header)
  ws.write(0,15, u"В оплате".encode("utf-8"),style_header)
  ws.write(0,16, u"Оплачено".encode("utf-8"),style_header)
  ws.write(0,17, u"На складе".encode("utf-8"),style_header)
  ws.write(0,18, u"Отгружено".encode("utf-8"),style_header)
  ws.write(0,19, u"Не отгружено".encode("utf-8"),style_header)
  ws.write(0,20, u"Не оплачено".encode("utf-8"),style_header)

  ws.write(0,21, u"Дата изменений".encode("utf-8"),style_header)
  ws.write(0,22, u"Пользователь".encode("utf-8"),style_header)
  ws.write(0,23, u"Цена, последняя (без НДС)".encode("utf-8"),style_header)
  ws.write(0,24, u"Дата посл. закупки".encode("utf-8"),style_header)
  ws.write(0,25, u"Посл. счёт".encode("utf-8"),style_header)
  ws.write(0,26, u"Посл. товар, код".encode("utf-8"),style_header)
  ws.write(0,27, u"Посл. товар, коэф".encode("utf-8"),style_header)

  rowIndex = 1
  if data is not None:
    for row in data:
      status = ""
      if row['status']=='0' or row['status']=='':
        status = 'в расчете'
      elif row['status']=='1':
        status = 'согласовано'
      elif row['status']=='2':
        status = 'отклонено'
      elif row['status']=='3':
        status = 'на согласовании'
      elif row['status']=='4':
        status = 'Не определено'
      elif row['status']=='5':
        status = 'Требуется'

      artickle = str(row['material_group_key'])+'.'+str(row['material_key'])
      if row['material_unique_props_key']:
        artickle +='.'+str( row['material_unique_props_key'])

      pto_size = row['pto_size'] if row['pto_size']>0 else 0
      on_work = row['facts'].get('onwork',0) or 0
      payed = row['facts'].get('payed',0) or 0
      onstore = row['facts'].get('onstore',0) or 0


      ws.write(rowIndex, 0, str(row['contract_number']), style1)
      ws.write(rowIndex, 1, str(row['order_number']), style1)
      ws.write(rowIndex, 2, str(row['sector_type']), style1)
      ws.write(rowIndex, 3, str(row['sector_name']),style1)
      ws.write(rowIndex, 4, row['sector_date_start'], date_format)
      ws.write(rowIndex, 5, row['sector_status'],style1)
      ws.write(rowIndex, 6, row['work_order_numbers'], style1)
      ws.write(rowIndex, 7, status, style1)
      ws.write(rowIndex, 8, str(row['material_group_name']),style1)
      ws.write(rowIndex, 9, artickle, style1)
      ws.write(rowIndex, 10, str(row['material_name']),style1)
      ws.write(rowIndex, 11, str(row['material_unique_props']),style1)
      ws.write(rowIndex, 12, str(row['note']),style1)

      ws.write(rowIndex, 13, row['material_unit_pto'], style1)
      ws.write(rowIndex, 14, row['pto_size'] if row['pto_size']>0 else 0, style1)
      ws.write(rowIndex, 15, row['facts'].get('inpay',0), style1)
      ws.write(rowIndex, 16, row['facts'].get('payed',0), style1)
      ws.write(rowIndex, 17, row['facts'].get('onstore',0), style1)
      ws.write(rowIndex, 18, row['facts'].get('onwork',0), style1)
      ws.write(rowIndex, 19, pto_size - on_work, style1)

      # требуется оплатить
      not_payed = 0
      if (on_work + onstore) > payed:
        not_payed = pto_size - (on_work + onstore)
      else:
        not_payed = pto_size - payed
      not_payed = 0 if not_payed < 0 else not_payed
      ws.write(rowIndex, 20, not_payed, style1)
      #-----


      date_change = routine.strToDateTime(row['date_change'])

      ws.write(rowIndex, 21, date_change + datetime.timedelta(hours=routine.moscow_tz_offset) if date_change else '',datetime_format)
      ws.write(rowIndex, 22, row['user_name'] + ' ('+row['user_email']+')',style1)
      if row.get('last_goods'):
        ws.write(rowIndex, 23, row['last_goods']['price'], style1)
        ws.write(rowIndex, 24, row['last_goods']['date'],date_format)
        ws.write(rowIndex, 25, row['last_goods']['account'],style1)
        ws.write(rowIndex, 26, row['last_goods']['good_code_1c'],style1)
        ws.write(rowIndex, 27, row['last_goods']['coef_si_div_iu'], style1)
      rowIndex+=1
  wb.save(output)
  output.seek(0)
  return output.read()


@post('/handlers/planecalculation/get_mto_data')
def get_mto_data():
  '''
    Get MTO data by params
     params = {
       contracts: [],
       orders: [],
       sector_types: [],
       sectors: [],
       material_groups: []
    }
  '''
  import gzip
  import StringIO
  userlib.check_handler_access('planecalculation','r')

  try:
    request_data = request.json

    contracts = request_data.get('contracts', [])
    orders = request_data.get('orders', [])
    sector_types = request_data.get('sector_types', [])
    sectors = request_data.get('sectors', [])
    material_groups = request_data.get('material_groups', [])
    status = request_data.get('status', [])

    if not orders or len(orders)<1:
      raise Exception('Не заданы номера заказов по которым необходимы данные.')
    data = plannormsapi.get_mto_data(contracts, orders, sector_types, sectors, material_groups, status)
    res = routine.JSONEncoder().encode({
      'status': 'ok',
      'data':data['materials'],
      'comments': data['comments'],
      'integra_dates': data['integra_dates']
    })
    start = time.clock()

    response.add_header('Content-Encoding', 'gzip')
    s = StringIO.StringIO()
    with gzip.GzipFile(fileobj=s, mode='w') as f:
      f.write(res)

    print "Time zip data  is: ", time.clock() - start

    return s.getvalue()
  except Exception, exc:
    print_exc()
    return {'status':'error', 'msg': str(exc)}
