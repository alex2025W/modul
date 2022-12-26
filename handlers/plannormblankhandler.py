#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route, get, post, put, request, error, abort, response, debug
import datetime
from bson.objectid import ObjectId
from libraries import userlib
from helpers import mailer
from models import planecalculationmodel, contractmodel, sectormodel, materialsgroupmodel, usermodel, noticemodel
import routine
from models import countersmodel
from libraries import excellib
from xlrd import open_workbook
from xlutils.copy import copy as wbcopy
from xlwt import Workbook
from traceback import print_exc
from copy import deepcopy,copy
import config
from helpers.google_api import drive

@put('/handlers/plannormblank/generate_blanks')
def api_generate_blanks():
  """
  Do generate blanks for selected sectors.
  Inner structure format:
   {
    "order_number": string,
    "split_sectors" :  'Bool',
    "notify_users": ''Bool'',
    'use_old_blanks': 'Bool',
    "sectors": {}
  }
  '"""
  response.content_type = "application/json; charset=UTF-8"
  userlib.check_handler_access("plannormblank","w")
  try:
    usr = userlib.get_cur_user()
    # get request info
    data = request.json;

    if not 'num' in data or data['num']=="":
      return {'status':'error', 'msg':'Не задан номер заказа.'}

    orderNumber = data['num'];
    order_number_params = orderNumber.split('.')
    if len(order_number_params)<2 or len(order_number_params)>3:
      return {'status':'error', 'msg':'Введен неверный номер заказа.'}

    contract_number = routine.strToInt(order_number_params[0])
    product_number = routine.strToInt(order_number_params[1])
    if contract_number ==0 or product_number ==0:
      return {'status':'error', 'msg':'Введен неверный номер заказа.'}

    product_unit_number = 0
    if len(order_number_params)>2:
      product_unit_number =routine.strToInt(order_number_params[2])
      if product_unit_number==0:
        return {'status':'error', 'msg':'Введен неверный номер заказа.'}

    # получение информации по договору
    contract = contractmodel.get_by({'number':contract_number,'$or': [{ "parent_id": { '$exists': False }},{ "parent_id":None},{"parent_id": ''}]});
    if contract is None:
      return {'status':'error', 'msg':'Указанный вами договор не найден.'}

    if not 'productions' in contract or len(contract['productions'])==0:
      return {'status':'error', 'msg':'По выбранному договору нет продукции.'}

    # сбор продукции по договору
    productions = []
    product_units_count = 1

    for product in contract['productions']:
      productions.append(product);

    # проверяем нет ли доп. соглашений по данному договору
    dop_contracts = contractmodel.get_list_by({'parent_id':contract['_id']});
    if dop_contracts is not None or dop_contracts.count()>0:
      for dop_contract in dop_contracts:
        if 'productions' in dop_contract:
          for product in dop_contract['productions']:
            productions.append(product);

    if product_unit_number>0:
      for product in productions:
        if product['number'] == product_number:
          if not 'units' in product or len(product['units'])==0:
            return {'status':'error', 'msg':'У выбранной продукции нет единиц.'}
          elif product_unit_number>len(product['units']):
            return {'status':'error', 'msg':'В продукции указанного заказа нет указанной единицы. Всего единиц: ' + str(len(product['units']))}
          else:
            product_units_count = len(product['units'])

    # получение списка плановых норм по номеру заказа
    plan_norms = planecalculationmodel.find_by({'contract_number':contract_number, 'product_number':product_number}, None)
    if plan_norms is None or plan_norms.count()==0:
      return {'status':'error', 'msg':'Для данного заказа нет утвержденных плановых норм..'}

    # получение списка участков
    sectors_arr = sectormodel.get_all_only_sectors()
    sectors = {}
    for sector in sectors_arr:
      sectors[sector['_id']]  = sector;

    # получение спика материалов
    arrDataMaterials = materialsgroupmodel.get_all_materials()
    dataMaterials = {}
    for row in arrDataMaterials:
      dataMaterials[row['_id']] = row;

    # сбор данных
    blank_number = countersmodel.get_next_sequence('plannorms.blanks')
    order_number = data['num']
    cur_date =  datetime.datetime.utcnow().strftime('%d.%m.%Y')
    # сбор отмеченных секторов для генерирования бланков
    sectors = {}
    for sector in data['sectors']:
      if sector['checked']:
        sectors[sector['_id']] = {'sector': sector, 'tmp_materials': {}, 'materials':[]};

    # сбор материалов из плановых норм
    tmp_materials = {}
    materials = []
    materials_ids = []
    for row in plan_norms:
      if str(row['sector_id']) in sectors and 'materials' in row:
        for plan_material in row['materials']:
          if plan_material['status'] == '1' and (not 'has_blank' in plan_material or plan_material['has_blank']==0 or not data['use_old_blanks']):
            if str(plan_material['materials_id']) in dataMaterials:
              plan_material['material_info'] = dataMaterials[str(plan_material['materials_id'])]
              material_unique_props = plan_material['material_info'].get('unique_props',[])
              for m_prop in material_unique_props:
                if m_prop['name'] == plan_material.get('unique_props'):
                  plan_material['unique_props_key'] = m_prop['key']
                  plan_material['unique_props_name'] = m_prop['name']
                  break;
            else:
              plan_material['material_info'] = None

            tmp_key = str(plan_material['materials_group_key']) +"-"+str(plan_material['materials_key'])+"-"+plan_material['unique_props']

            materials_ids.append(plan_material['_id']);

            tmp_material = None
            if tmp_key in tmp_materials:
              tmp_material = tmp_materials[tmp_key]
              # суммирование показателей
              tmp_material['pto_size'] += routine.strToFloat(plan_material['pto_size'])
            else:
              plan_material['pto_size'] =  routine.strToFloat(plan_material['pto_size'])
              tmp_materials[tmp_key] = copy(plan_material)

            if tmp_key in sectors[str(row['sector_id'])]['tmp_materials']:
              tmp_material = sectors[str(row['sector_id'])]['tmp_materials'][tmp_key]
              # суммированеи показателей
              tmp_material['pto_size'] += routine.strToFloat(plan_material['pto_size'])
            else:
              sectors[str(row['sector_id'])]['tmp_materials'][tmp_key] =copy(plan_material)

            #materials.append(plan_material);
            #sectors[str(row['sector_id'])]['materials'].append(plan_material)


    # формирование финального списка материалов
    #el = [x for x in mylist if x.attr == "foo"][0]
    for item in tmp_materials:
      materials.append(tmp_materials[item])
    for sector in sectors:
      for item in sectors[sector]['tmp_materials']:
        sectors[sector]['materials'].append(sectors[sector]['tmp_materials'][item])

    # сортировка элементов в нужном порядке
    materials.sort(key = lambda x: (x['materials_group_key'], x['materials_key']))
    for row in sectors:
      sectors[row]['materials'].sort(key = lambda x: (x['materials_group_key'], x['materials_key']))

    dataToSave = {
      'blank_number': blank_number,
      'order_number': order_number,
      'cur_date': cur_date,
      'product_units_count': 1 if product_unit_number>0 else product_units_count,
      'sectors': sectors,
      'materials': materials,
      'materials_ids': materials_ids
    }

    #return routine.JSONEncoder().encode({'status': 'ok','res':materials_ids})

    if len(materials)>0:
      # сгенерировать бланки
      dataToSave['blank_url'] = excellib. plannorms_make_blank(dataToSave, data['split_sectors'])
      if dataToSave['blank_url']!='':
        # обновить данные по материалам, проставить флаги о выдаче бланков
        # planecalculationmodel.update(
        #   {'materials._id':{'$in':materials_ids}},
        #   {'$set':{'materials.$.has_blank':1}},
        #   True, True)
        for id in materials_ids:
          planecalculationmodel.update({'materials._id':id},{'$set':{'materials.$.has_blank':1}},True, True)

        # разослать почтовые сообщения
        if data['notify_users']:
          _sendNotify(usr,dataToSave)
        return routine.JSONEncoder().encode({'status': 'ok','res':dataToSave})
      else:
        return routine.JSONEncoder().encode({'status': 'error','msg':'Ошибка загрузки бланка на Google диск.'})

  except Exception,exc:
    excType = exc.__class__.__name__
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@put('/handlers/plannormblank/send_blanks_notification')
def sendNotification():
  """prepare and send email notification"""

  response.content_type = "application/json; charset=UTF-8"
  userlib.check_handler_access("plannormblank","w")
  try:
    return routine.JSONEncoder().encode({'status': 'ok'})
  except Exception, exc:
    print('Error! Send plan norm blanks notification.')
    excType = exc.__class__.__name__
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})
    pass

@get('/handlers/plannormblank/search/')
def search():
  """get  information about blanks for plan norms by order number"""

  userlib.check_handler_access("plannormblank","r")
  result = {}
  try:
    usr = userlib.get_cur_user()

    # get parameters
    param = request.query.decode()
    if not 'num' in param or param['num']=="":
      return {'status':'error', 'msg':'Не задан номер заказа.'}
    orderNumber = param['num'];
    order_number_params = orderNumber.split('.')
    if len(order_number_params)<2 or len(order_number_params)>3:
      return {'status':'error', 'msg':'Введен неверный номер заказа.'}
    contract_number = routine.strToInt(order_number_params[0])
    product_number = routine.strToInt(order_number_params[1])
    if contract_number ==0 or product_number ==0:
      return {'status':'error', 'msg':'Введен неверный номер заказа.'}
    product_unit_number = 0
    if len(order_number_params)>2:
      product_unit_number =routine.strToInt(order_number_params[2])
      if product_unit_number==0:
        return {'status':'error', 'msg':'Введен неверный номер заказа.'}

    # получение информации по договору
    contract = contractmodel.get_by({'number':contract_number, '$or': [{ "parent_id": { '$exists': False }},{ "parent_id":None},{"parent_id": ''}]});
    if contract is None:
      return {'status':'error', 'msg':'Указанный вами договор не найден.'}

    if not 'productions' in contract or len(contract['productions'])==0:
      return {'status':'error', 'msg':'По выбранному договору нет продукции.'}

    # сбор продукции по договору
    productions = []

    for product in contract['productions']:
      productions.append(product);

    # проверяем нет ли доп. соглашений по данному договору
    dop_contracts = contractmodel.get_list_by({'parent_id':contract['_id']});
    if dop_contracts is not None or dop_contracts.count()>0:
      for dop_contract in dop_contracts:
        if 'productions' in dop_contract:
          for product in dop_contract['productions']:
            productions.append(product);

    if product_unit_number>0:
      for product in productions:
        if product['number'] == product_number:
          if not 'units' in product or len(product['units'])==0:
            return {'status':'error', 'msg':'У выюранной продукции нет единиц.'}
          elif product_unit_number>len(product['units']):
            return {'status':'error', 'msg':'В продукции указанного заказа нет указанной единицы. Всего единиц: ' + str(len(product['units']))}

    # получение списка плановых норм по номеру заказа
    plan_norms = planecalculationmodel.find_by({'contract_number':contract_number, 'product_number':product_number}, None)
    if plan_norms is None or plan_norms.count()==0:
      return {'status':'error', 'msg':'Для данного заказа нет утвержденных плановых норм..'}

    # получение списка участков
    sectors_arr = sectormodel.get_all_only_sectors()
    sectors = {}
    for sector in sectors_arr:
      sectors[sector['_id']]  = sector;

    # сбор данных
    result = []
    for row in plan_norms:
      haveConfirmedItems = False
      haveItemsWithoutBlank = False
      if str(row['sector_id']) in sectors and 'materials' in row and len(row['materials'])>0:
        for material in row['materials']:
          if material['status'] == '1':
            haveConfirmedItems = True
          if not 'has_blank' in material or material['has_blank']==0:
            haveItemsWithoutBlank = True
      if haveConfirmedItems:
        res_sector = sectors[str(row['sector_id'])]
        res_sector['haveItemsWithoutBlank'] = haveItemsWithoutBlank
        result.append(res_sector)

    # сортировка списка участков по группе и по порядку работ
    result.sort(key = lambda w: w['routine'])

    return routine.JSONEncoder().encode({'status': 'ok','data':result})
  except Exception, exc:
    print('Error! Get plan norms blanks.')
    excType = exc.__class__.__name__
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})
    pass

def _sendNotify(usr, data):
  """send notify about created blanks"""
  try:
    header= "Спецификации заказов. Создан новый бланк № " + str(data['blank_number'])
    body= usr['fio']+' ('+usr['email']+') сообщает: \n' if 'fio' in usr else usr['email'] + "сообщает: \n"
    body+= "Заказ: " + data['order_number'] + '\n'
    body+= "Участки:\n"
    for i in data['sectors']:
      sector = data['sectors'][i]
      body+= sector['sector']['name'] + ' [' + str(sector['sector']['code']) + ']' + '\n'
    body+='\n' + "Ссылка на созданный бланк: " + data['blank_url']  + '\n';
    body+='\n' + "Все бланки здесь: https://drive.google.com/#folders/" + config.plan_norm_blanks_folder_id

    notice_users = usermodel.get_list(
        {'notice.key': noticemodel.notice_keys['plannorm_new_blanks']['key'], 'stat': {'$ne':'disabled' }},
        {'email':1,'fio':1})
    # вызвать функцию отправки сообщения
    print('-------------SEND PLAN NORM NEW BLANK EMAIL--------------------')
    mailer.send(header,body ,notice_users, True, usr['email'])
    print('--------------------------------')
  except Exception, exc:
    print('Error! Send plan norm blanks notification.')
    excType = exc.__class__.__name__
    print_exc()
    pass


@get('/handlers/plannormblank/get_statistic/')
def api_get_statistic():

  # get parameters
  param = request.query.decode()
  if not 'num' in param or param['num']=="":
    return {'status':'error', 'msg':'Не задан номер заказа.'}

  userlib.check_handler_access("plannorm","r")
  response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=UTF-8'
  response.headers['Content-Type'] = 'application/vnd.ms-excel'
  response.headers['Content-Disposition'] = 'attachment; filename=order_specification_'+param['num']+'_'+ datetime.datetime.utcnow().strftime('%d_%m_%Y_%H_%M_%S')+'.xls'
  try:
    contract_number = routine.strToInt(param['num'])
    usr = userlib.get_cur_user()
    # получение всех ном
    data = planecalculationmodel.get_stat(contract_number)

    #------------
    # получение информации по договору
    contract = contractmodel.get_by({'number':contract_number, '$or': [{ "parent_id": { '$exists': False }},{ "parent_id":None},{"parent_id": ''}]});
    if contract is None:
      return {'status':'error', 'msg':'Указанный вами договор не найден.'}

    if not 'productions' in contract or len(contract['productions'])==0:
      return {'status':'error', 'msg':'По выбранному договору нет продукции.'}

    # сбор продукции по договору
    productions = []
    for product in contract['productions']:
      productions.append(product);
    # проверяем нет ли доп. соглашений по данному договору
    dop_contracts = contractmodel.get_list_by({'parent_id':contract['_id']});
    if dop_contracts is not None or dop_contracts.count()>0:
      for dop_contract in dop_contracts:
        if 'productions' in dop_contract:
          for product in dop_contract['productions']:
            productions.append(product);
    # подсчет единиц в каждой продукции
    arr_products = {}
    for product in productions:
      if product['number'] not in arr_products and product['number']>0:
        arr_products[product['number']] = 0
      # считаем юниты в продукции, исключая нулевые
      for u_row in product.get('units',[]):
        if u_row.get('number')>0:
          arr_products[product['number']] += 1
    #----------------

    return __make_plan_norms_statistic(data, arr_products)
    #return routine.JSONEncoder().encode({'status': 'ok', 'result': data})
  except Exception, exc:
    excType = exc.__class__.__name__
    print_exc()
    print('Generate fact works statistic error: ' + str(exc))
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

def __make_plan_norms_statistic(data, arr_products):
  def decode_status(val):
    vals = {
      '0': 'В расчете',
      '1': 'Согласовано',
      '2': 'Отклонено',
      '3': 'На согласовании',
      '4': 'Не определено',
      '5': 'Требуется',
    }
    return vals.get(str(val), 'Не определено')

  # получение списка групп матераилов
  groups = {}
  for row in materialsgroupmodel.get_all_only_groups():
    groups[row['code']] = row;

  '''Генерация XLS файла со статистикой по фактическим работам'''
  import StringIO
  output = StringIO.StringIO()
  wb = Workbook(encoding='utf-8')
  ws = wb.add_sheet('Data')
  #set header------------
  ws.col(0).width = 256 * 10              # 10 characters wide (-ish)
  ws.col(1).width = 256 * 10              # 10 characters wide (-ish)
  ws.col(2).width = 256 * 70              # 200 characters wide (-ish)
  ws.col(3).width = 256 * 50              # 200 characters wide (-ish)
  ws.col(4).width = 256 * 20              # 200 characters wide (-ish)
  ws.col(5).width = 256 * 20              # 200 characters wide (-ish)
  ws.col(6).width = 256 * 60              # 20 characters wide (-ish)
  ws.col(7).width = 256 * 20              # 20 characters wide (-ish)
  ws.write(0,0, u"Заказ".encode("utf-8"))
  ws.write(0,1, u"Артикул".encode("utf-8"))
  ws.write(0,2, u"Материал".encode("utf-8"))
  ws.write(0,3, u"Инд. характеристика".encode("utf-8"))
  ws.write(0,4, u"Ед. изм".encode("utf-8"))
  ws.write(0,5, u"Объем".encode("utf-8"))
  ws.write(0,6, u"Группа".encode("utf-8"))
  ws.write(0,7, u"Статус".encode("utf-8"))

  rowIndex = 1
  if data is not None:
    for row in data:
      ws.write(rowIndex, 0, str(row['order_number']))
      unique_prop_key = ""
      if(row['unique_props'] and row['unique_props']!="" and  row['material_unique_props'] and len(row['material_unique_props'])>0):
        for unique_prop in row['material_unique_props']:
          if unique_prop['name'] == row['unique_props']:
            unique_prop_key = '.' + str(unique_prop['key'])
            break

      ws.write(rowIndex, 1, str(row['materials_group_key'])+'.'+str(row['materials_key'])+unique_prop_key)
      ws.write(rowIndex, 2, row['material_name'])
      ws.write(rowIndex, 3, row['unique_props'])
      ws.write(rowIndex, 4, row['unit_pto'])
      ws.write(rowIndex, 5, routine.strToFloat(row['pto_size'])* arr_products[row['product_number']])
      ws.write(rowIndex, 6, (groups.get(row['materials_group_key'], {}) or {}).get('name',''))
      ws.write(rowIndex, 7, decode_status(row.get('status')))

      rowIndex+=1
  wb.save(output)
  output.seek(0)
  return output.read()

