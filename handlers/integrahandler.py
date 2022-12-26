#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route, get, post, put, request, error, abort, response, debug
import datetime, time
from bson.objectid import ObjectId
import json
from libraries import userlib
import routine
from models import countersmodel
from traceback import print_exc
import config
from copy import deepcopy,copy

@post('/handlers/integra/ats/')
def run():
  '''Интеграция с ATS'''
  try:
    print('--------INTEGRA-----------------------------')
    # post_data = request.body.read()
    # post_data = json.loads(post_data)["data"]
    # print post_data #this goes to log file only, not to client
    post_data = None
    try:
      for file_row in request.files:
        post_data =  json.loads(request.files[file_row].file.read())["data"]
        break
    except:
      pass
    if not post_data:
      post_data = request.body.read()
      post_data = json.loads(post_data)["data"]
    print('--------END INTEGRA---------------------')

    #--------------JOBLOG-----------------------------------------------------------------------------------
    if post_data['key'] == 'joblog':
      from models import planecalculationmodel
      bad_items = []
      data = post_data['data']
      if data and len(data)>0:
        for row in data:
          try:
            cond={
              'contract_number': routine.strToInt(row['contract_number']),
              'product_number': routine.strToInt(row['product_number']),
              'materials':
              {
                '$elemMatch':
                  {
                    'materials_group_key':routine.strToInt(row['material_group_key']),
                    'materials_key':routine.strToInt(row['material_key'])
                  }
              }
            }

            if 'unique_prop' in row and row['unique_prop']!='':
              cond['materials']['$elemMatch']['unique_props'] = row['unique_prop']

            fact_material= {
              '_id': ObjectId(),
              'date_change': datetime.datetime.utcnow(),
              'note': 'Автообновление из 1С',
              'scope': routine.strToFloat(row['size'])
            }
            row_data = {'$push': {'materials.$.fact_material': fact_material}}

            # update in database
            planecalculationmodel.update(cond, row_data, True, True)
          except Exception,e:
            row['err_msg'] =  str(e)
            bad_items.append(row)
            pass

        if len(bad_items)>0:
          return routine.JSONEncoder().encode({'status': 'error','msg':'Data update error.','data':bad_items})
        else:
          return routine.JSONEncoder().encode({'status': 'ok','data':data})
      else:
        return routine.JSONEncoder().encode({'status': 'error','msg':'No data to update'})

    #--------------JOBLOG--------------------------------------------------------------------------------------------------------------------------------------
    elif post_data['key'] == 'crm':
      from models import atsmodel
      from apis.client import clientapi

      data = post_data['data']
      for row in data:
        try:
          row['date'] = datetime.datetime.fromtimestamp(int(row['date']))
        except:
          print("Can't convert {0} to datetine".format(row["date"]))
          row["date"] = None
          pass
        row['origin_phone_number'] = row['phone_number']
        ph = row['phone_number']
        if ph[0]=='+':
          ph = ph[1:]
        if len(ph)==11 and ph[0]=='8':
          ph = '7'+ph[1:]
        if len(ph)==10:
          ph = '7'+ph
        row['phone_number'] = ph

        client = None
        clients = clientapi.find_by_phone(ph)
        if len(clients)>0:
          client = clients[0]
        row['client_check_date'] = datetime.datetime.utcnow()
        row['client'] = client

        atsmodel.add(row)
      return routine.JSONEncoder().encode({'status': 'ok','data':data})
    else:
      return routine.JSONEncoder().encode({'status': 'error','msg':'Invalid operation key'})


  except Exception, exc:
    print('Error! ATS Integration fail.' + str(exc))
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@post('/handlers/integra/1c/')
def integra_1c():
  '''
    Интеграция с 1С
  '''
  try:
    from apis.plannorms import plannormsapi
    post_data = None
    try:
      for file_row in request.files:
        post_data =  json.loads(request.files[file_row].file.read())['data']
        break
    except:
      pass
    if not post_data:
      post_data = request.body.read()
      post_data = json.loads(post_data)['data']

    if post_data:
      #--------------MTO------------------------------------------------------------------------------------
      if post_data['key'] == 'mto':
        print('--------START 1C ORDERS INTEGRA-----------------------------')
        from models import integra_1s_orders_calculation_model
        # статусы на автозамену
        status_keys = {
          u'Нормы': 'norms',
          u'В оплате': 'inpay',
          u'Оплачено': 'payed',
          u'На складе': 'onstore',
          u'В производстве':'onwork'
        }
        # список номеров заказов пришедших на обновление данных
        parsed_order_numbers = []
        # все данные на обновление
        data = post_data['data']
        # формирование данных
        items = []
        for row in data:
          new_row = {
            'order_number': row[u'Заказ'],
            'material_full_code': row[u'Артикул'],
            'sector_code': row.get(u'Участок'),

            'category_id': row.get(u'Категория'),
            'group_id': row.get(u'Группа'),

            'price': row.get(u'Цена'),
            'status_history':[]
          }

          # "Цена": {
          #   'price': None,                  # цена
          #   'date': None,                   # дата факта
          #   'account': None,                # счет
          #   'good_code_1c': None,           # код товара
          #   'coef_si_div_iu': None,         # коэффициент на который умножается цена
          #   'account_type': None,           # источник текущей цены
          #   'invoice_unit': None,           # Ед. оплаты
          # },

          if new_row['order_number'] not in parsed_order_numbers:
            parsed_order_numbers.append(new_row['order_number'])

          for status in row[u'Статусы']:
            new_row['status_history'].append({
              'status': status_keys[status[u'Статус']],
              'size': routine.strToFloat(status[u'Объем']),
            })
          items.append(new_row)

        # перед обновлением проставление флагов, какие статусы и объемы уже были пробиты в системе ранее
        integra_1s_orders_calculation_model.add({
          'items': items,
          'date': datetime.datetime.utcnow(),
        })

        # обновление статуса в закупках
        plannormsapi.update_statuses_from_1c(items)

      print('--------FINISH 1C ORDERS INTEGRA-----------------------------')
      return routine.JSONEncoder().encode({'status': 'ok'})
    return routine.JSONEncoder().encode({'status': 'error','msg':'Data not found'})
  except Exception, exc:
    print('Error! 1C Orders Integration fail.' + str(exc))
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@get('/handlers/test-integra/1c/')
def test_integra_1c():
  '''
    Интеграция с 1С
  '''
  try:
    from apis.plannorms import plannormsapi
    from models import integra_1s_orders_calculation_model
    # items =[
    #     {
    #         "material_full_code" : "10.10.4",
    #         "group_id" : "5b2387214486f40008466019",
    #         "sector_code" : "",
    #         "price" : {
    #             "good_code_1c" : "00-00011407",
    #             "account" : "0000-000878",
    #             "account_type" : "Цена последней закупки",
    #             "price" : 462.02,
    #             "coef_si_div_iu" : 59.999988,
    #             "date" : "19.07.2018 16:33:48"
    #         },
    #         "category_id" : "5b23b10077349600082277cf",
    #         "order_number" : "1315.1.1",
    #         "status_history" : [
    #             {
    #                 "status" : "inpay",
    #                 "size" : 0
    #             },
    #             {
    #                 "status" : "payed",
    #                 "size" : 3000.0
    #             },
    #             {
    #                 "status" : "onstore",
    #                 "size" : 1140.0
    #             },
    #             {
    #                 "status" : "onwork",
    #                 "size" : 1500.0
    #             }
    #         ]
    #     }
    # ]

    # plannormsapi.update_statuses_from_1c(items)
    # print('--------FINISH 1C ORDERS INTEGRA-----------------------------')
    # return routine.JSONEncoder().encode({'status': 'ok'})
    # статусы на автозамену
    status_keys = {
      'Нормы': 'norms',
      'В оплате': 'inpay',
      'Оплачено': 'payed',
      'На складе': 'onstore',
      'В производстве':'onwork'
    }
    # список номеров заказов пришедших на обновление данных
    parsed_order_numbers = []
    # все данные на обновление
    data =[
      {
        "Заказ": "1287.1.1",
        "Артикул": "240.76.2",
        "Участок": "16",
        "Цена": {
          'price': None,                  # цена
          'date': None,                   # дата факта
          'account': None,                # счет
          'good_code_1c': None,           # код товара
          'coef_si_div_iu': None,         # коэффициент на который умножается цена
          'account_type': None,           # источник текущей цены
        },
        "Статусы": [
          {
              "Статус": "В оплате",
              "Объем": 0,
          },
          {
              "Статус": "Оплачено",
              "Объем": 200,
          },
          {
              "Статус": "На складе",
              "Объем": 0,
          },
          {
              "Статус": "В производстве",
              "Объем": 200,
          }
        ]
      },
      {
        "Заказ": "1287.1.1",
        "Артикул": "240.76.1",
        "Участок": "16",
        "Статусы": [
          {
            "Статус": "В оплате",
            "Объем": 0,
          },
          {
            "Статус": "Оплачено",
            "Объем": 200,
          },
          {
            "Статус": "На складе",
            "Объем": 0,
          },
          {
            "Статус": "В производстве",
            "Объем": 200,
          }
        ]
      }]
    #
    # формирование данных
    items = []
    for row in data:
      new_row = {
        'order_number': row['Заказ'],
        'material_full_code': row['Артикул'],
        'sector_code': row.get('Участок'),
        'status_history':[]
      }

      if new_row['order_number'] not in parsed_order_numbers:
        parsed_order_numbers.append(new_row['order_number'])

      for status in row['Статусы']:
        new_row['status_history'].append({
          'status': status_keys[status['Статус']],
          'size': routine.strToFloat(status['Объем']),
        })
      items.append(new_row)

    # перед обновлением проставление флагов, какие статусы и объемы уже были пробиты в системе ранее
    integra_1s_orders_calculation_model.add({
      'items': items,
      'date': datetime.datetime.utcnow(),
    })

    # print('-------')
    # print(routine.JSONEncoder().encode(items))
    # print('-------')

    # обновление статуса в закупках
    plannormsapi.update_statuses_from_1c(items)

    print('--------FINISH 1C ORDERS INTEGRA-----------------------------')
    return routine.JSONEncoder().encode({'status': 'ok'})

  except Exception, exc:
    print('Error! 1C Orders Integration fail.' + str(exc))
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})


@get('/handlers/integra/get_actual_plan_norms/<key>/<order_number>')
def get_actual_plan_norms(key, order_number):
  '''
    Получение актуальных плановых норм по номеру заказа
    key - уникальный ключ для проверки правомерности запроса
    order_number - номер заказа
  '''
  try:
    if key != config.integra_1c_settings['key']:
      raise Exception("Ошибка. Не авторизованный запрос")
    from apis.plannorms import plannormsapi_v2
    res = plannormsapi_v2.get_actual_plan_norms(order_number)
    return routine.JSONEncoder().encode({'status': 'ok', 'data': res})
  except Exception, exc:
    print('Error! 1C Get actual plan norms fail.' + str(exc))
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})


@get('/handlers/integra/get_all_sectors/<key>')
def get_all_sectors(key):
  '''
    Получение справочника всех индивидуальных характеристик
  '''
  from models import sectormodel
  try:
    if key != config.integra_1c_settings['key']:
      raise Exception('Ошибка. Не авторизованный запрос')
    all_sectors = sectormodel.get_all_only_sectors()
    return routine.JSONEncoder().encode({'status': 'ok', 'data': all_sectors})
  except Exception, exc:
    print('Error! 1C Get all unique props.' + str(exc))
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@get('/handlers/integra/get_materials/<key>/<type>')
def get_materials(key, type):
  '''
    Получение справочника всех материалов
    type - ['all','new']
  '''
  from models import materialsgroupmodel, routinemodel
  try:
    if key != config.integra_1c_settings['key']:
      raise Exception('Ошибка. Не авторизованный запрос')
    args = {}
    # получаем дату последнего обновления
    last_date =  routinemodel.get({'key':'integra_1c_materials'})['last_update']
    # получить тип запроса(все данные или )
    if type == 'new' and last_date:
      args = {'date_change': {'$gte': last_date}}

    # получение даных
    all_materials = materialsgroupmodel.get_materials(args)
    res = []
    for row in all_materials:
      res.append({
        'group_id': row['group_id'],
        'group_code': row['group_code'],
        'group_name': row['group_name'],
        # material info
        'labels': prepare_materials_labels(row.get('labels',[])),
        'material_id': row['_id'],
        'material_code': row['code'],
        'material_name': row['name'],
        'material_unit_pto': row['unit_pto'],
        'material_unit_pto_value': row['unit_pto_value'],
        'material_is_active': row['is_active'],
        'material_user_email': row['user_email'],
        'material_date_change': routine.dateUtcToMoscow(row['date_change']).strftime('%d.%m.%Y %H:%M:%S')
      })
    # обновление даты последней синхронизации
    routinemodel.update({'key':'integra_1c_materials'}, {'last_update':datetime.datetime.utcnow() })
    # возврат результата
    return routine.JSONEncoder().encode({'status': 'ok', 'data': res})
  except Exception, exc:
    print('Error! 1C Get materials.' + str(exc))
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@get('/handlers/integra/get_unique_props/<key>/<type>')
def get_unique_props(key, type):
  '''
    Получение справочника всех индивидуальных характеристик
    type - ['all','new']
  '''
  from models import materialsgroupmodel, routinemodel
  try:
    if key != config.integra_1c_settings['key']:
      raise Exception('Ошибка. Не авторизованный запрос')

    args = {}
    # получаем дату последнего обновления
    last_date =  routinemodel.get({'key':'integra_1c_unique_props'})['last_update']
    # получить тип запроса(все данные или )
    if type == 'new' and last_date:
      args = {'prop_date_change': {'$gte': last_date}}
    res = materialsgroupmodel.get_unique_props(args)
    for row in res:
      row['prop_date_change'] = routine.dateUtcToMoscow(row['prop_date_change']).strftime('%d.%m.%Y %H:%M:%S') if row.get('prop_date_change') else None

    # обновление даты последней синхронизации
    routinemodel.update({'key':'integra_1c_unique_props'}, {'last_update':datetime.datetime.utcnow() })
    # возврат результата
    return routine.JSONEncoder().encode({'status': 'ok', 'data': res})
  except Exception, exc:
    print('Error! 1C Get all unique props.' + str(exc))
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})


@get('/handlers/integra/get_material/<key>/<id>')
def get_material(key, id):
  '''
    Получение информации о конкретном материале
    id - идентификатор материала
  '''
  from models import materialsgroupmodel
  try:
    if key != config.integra_1c_settings['key']:
      raise Exception('Ошибка. Не авторизованный запрос')
    args = {'_id': ObjectId(id)}

    # получение даных
    all_materials = materialsgroupmodel.get_materials(args)
    res = []
    for row in all_materials:
      res.append({
        'group_id': row['group_id'],
        'group_code': row['group_code'],
        'group_name': row['group_name'],
        # material info
        'labels': prepare_materials_labels(row.get('labels',[])),
        'material_id': row['_id'],
        'material_code': row['code'],
        'material_name': row['name'],
        'material_unit_pto': row['unit_pto'],
        'material_unit_pto_value': row['unit_pto_value'],
        'material_is_active': row['is_active'],
        'material_user_email': row['user_email'],
        'material_date_change': routine.dateUtcToMoscow(row['date_change']).strftime('%d.%m.%Y %H:%M:%S')
      })
    # возврат результата
    return routine.JSONEncoder().encode({'status': 'ok', 'data': res})
  except Exception, exc:
    print('Error! 1C Get materials.' + str(exc))
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@get('/handlers/integra/get_material_unique_props/<key>/<id>')
def get_unique_prop(key, id):
  '''
    Получение справочника всех индивидуальных характеристик
    id - идентификатор материала
  '''
  from models import materialsgroupmodel
  try:
    if key != config.integra_1c_settings['key']:
      raise Exception('Ошибка. Не авторизованный запрос')

    args = {'material_id': ObjectId(id)}
    res = materialsgroupmodel.get_unique_props(args)
    for row in res:
      row['prop_date_change'] = routine.dateUtcToMoscow(row['prop_date_change']).strftime('%d.%m.%Y %H:%M:%S')

    # возврат результата
    return routine.JSONEncoder().encode({'status': 'ok', 'data': res})
  except Exception, exc:
    print('Error! 1C Get material all unique props.' + str(exc))
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@get('/handlers/integra/get_unique_prop/<key>/<id>')
def integra_get_unique_prop(key, id):
  '''
    Получение справочника всех индивидуальных характеристик
    id - идентификатор характеристики
  '''
  from models import materialsgroupmodel
  try:
    if key != config.integra_1c_settings['key']:
      raise Exception('Ошибка. Не авторизованный запрос')

    args = {'prop_id': ObjectId(id)}
    res = materialsgroupmodel.get_unique_props(args)
    for row in res:
      row['prop_date_change'] = routine.dateUtcToMoscow(row['prop_date_change']).strftime('%d.%m.%Y %H:%M:%S')

    # возврат результата
    return routine.JSONEncoder().encode({'status': 'ok', 'data': res})
  except Exception, exc:
    print('Error! 1C Get all unique props.' + str(exc))
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@post('/handlers/integra/1c/update/material_price/')
def integra_1c_update_material_price():
  '''
    Интеграция с 1С стоимостей товаров

      {
        material_key: "25.11.5",
        price: 1648.31,
        date: "20.06.2018 14:44:56",
        account: "00-00000256",
        good_code_1c: "00-00013339",
        coef_si_div_iu: 1,
        account_type: "Прайсовая цена"
      }
  '''

  def recalculate_price(obj, data_price):
    '''
      obj - updatable object
      data_price - information with price data
    '''
    if 'last_goods' not in obj:
      obj['last_goods'] = {}
    obj['last_goods']['price'] = routine.strToFloat(data_price.get('price', 0))
    obj['last_goods']['date'] = routine.strToDateTime(data_price.get('date', None))
    obj['last_goods']['account'] = data_price.get('account','')
    obj['last_goods']['good_code_1c'] = data_price.get('good_code_1c','')
    obj['last_goods']['coef_si_div_iu'] = routine.strToFloat(data_price.get('coef_si_div_iu', 1))
    obj['last_goods']['account_type'] = data_price.get('account_type','')
    obj['average_goods_price'] = 0
    if 'goods_prices_history' not in obj:
      obj['goods_prices_history'] = []
    obj['goods_prices_history'].append(obj['last_goods'])
    summ_price = 0
    for row in obj['goods_prices_history']:
      summ_price += routine.strToFloat(row.get('price', 0))
    obj['average_goods_price'] = float(summ_price) / len(obj['goods_prices_history'])

  from models import materialsgroupmodel
  try:
    post_data = None
    try:
      for file_row in request.files:
        post_data =  json.loads(request.files[file_row].file.read())['data']
        break
    except:
      pass
    if not post_data:
      post_data = request.body.read()
      post_data = json.loads(post_data)['data']

    post_data = post_data['data']

    if not post_data or not post_data.get('material_key'):
      raise Exception('Error. Invalid data format')

    print('--------START 1C MATERIAL PRICE IMPORT-----------------------------')

    # get material information by his code
    material_key_src = post_data['material_key'].split('.')
    group_key = routine.strToInt(material_key_src[0])
    material_key = routine.strToInt(material_key_src[1])
    prop_key = routine.strToInt(material_key_src[2]) if len(material_key_src) > 2 else None

    data_material = materialsgroupmodel.get_one({
      'code': group_key,
      'materials.code': material_key
    },{'materials.$':1})

    if not data_material or not data_material.get('materials') or len(data_material['materials'])==0:
      raise Exception('Error. Material not found.')

    data_material = data_material['materials'][0]

    if prop_key:
      try:
        data_prop = (row for row in data_material.get('unique_props',[]) if row["key"] == prop_key).next()
        recalculate_price(data_prop, post_data)
      except:
        raise Exception('Error. Unique prop not found.')
    else:
      recalculate_price(data_material, post_data)

    # обновление материала в БД
    materialsgroupmodel.update({'materials._id': ObjectId(data_material['_id'])}, {'materials.$': data_material})

    print('--------FINISH 1C MATERIAL PRICE IMPORT-----------------------------')
    return routine.JSONEncoder().encode({'status': 'ok'})
  except Exception, exc:
    print('Error! 1C Orders Integration fail.' + str(exc))
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@post('/handlers/integra/1c/materials/prices/')
def integra_1c_materials_prices():
  '''
    Интеграция с 1С стоимостей товаров
     [
      {
        "number": "1.1",
        "group": "Металл",
        "name": "Лист г/к 3х1250х2500 ГОСТ 16523-97",
        "prop": "",
        "prev_price": "31360,42",
        "prev_date": "14.11.2016 9:38:08",
        "last_price": "31360,58",
        "last_date": "14.11.2016 9:47:37",
        "prev_account": "1201",
        "last_account": "1201"
      },
    ]
  '''
  from models import materialsgroupmodel
  try:
    post_data = None
    try:
      for file_row in request.files:
        post_data =  json.loads(request.files[file_row].file.read())['data']
        break
    except:
      pass
    if not post_data:
      post_data = request.body.read()
      post_data = json.loads(post_data)['data']

    if post_data:
      print('--------START 1C PRICES INTEGRA-----------------------------')
      # групировка входных данных по номеру
      data_prices = {}
      for row in post_data['data']:
        data_prices[row['number']] = row

      # получение данных справочника материалов
      data_materials = materialsgroupmodel.get_all()
      for group_row in data_materials:
        for material_row in group_row.get('materials',[]):
          key = '{0}.{1}'.format(str(group_row['code']), str(material_row['code']))
          if key in data_prices:
            material_row['prev_price'] = routine.strToFloat(data_prices[key]['prev_price'])
            material_row['prev_date'] = routine.strToDateTime(data_prices[key]['prev_date'])
            material_row['last_price'] = routine.strToFloat(data_prices[key]['last_price'])
            material_row['last_date'] = routine.strToDateTime(data_prices[key]['last_date'])
            material_row['prev_price_account'] = data_prices[key]['prev_account']
            material_row['last_price_account'] = data_prices[key]['last_account']

          if material_row.get('unique_props'):
            for prop_row in material_row['unique_props']:
              key = '{0}.{1}.{2}'.format(str(group_row['code']), str(material_row['code']), str(prop_row['key']))
              if key in data_prices:
                prop_row['prev_price'] = routine.strToFloat(data_prices[key]['prev_price'])
                prop_row['prev_date'] = routine.strToDateTime(data_prices[key]['prev_date'])
                prop_row['last_price'] = routine.strToFloat(data_prices[key]['last_price'])
                prop_row['last_date'] = routine.strToDateTime(data_prices[key]['last_date'])
                prop_row['prev_price_account'] = data_prices[key]['prev_account']
                prop_row['last_price_account'] = data_prices[key]['last_account']

        # обновление материалов
        materialsgroupmodel.update({'_id': ObjectId(group_row['_id'])}, {'materials':group_row['materials']})

      print('--------FINISH 1C PRICES INTEGRA-----------------------------')
      return routine.JSONEncoder().encode({'status': 'ok'})
    return routine.JSONEncoder().encode({'status': 'error','msg':'Data not found'})
  except Exception, exc:
    print('Error! 1C Orders Integration fail.' + str(exc))
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@post('/handlers/integra/1c/materials/lastgoods/prices/')
def integra_1c_materials_lastgoods_prices():
  '''
    Интеграция с 1С последней стоимости товара
    Входящий формат:
     [
      {
        number,
        group,
        name,
        prop,
        last_goods:{
          price,
          date,
          account,
          good_code_1c,
          coef_si_div_iu,
          account_type,
          invoice_unit
        },
        goods_prices_history: [{
          price,
          date,
          account,
          good_code_1c,
          coef_si_div_iu,
          account_type,
          invoice_unit
        }]
      },
    ]
    Процессинг:
    Данные записываются либо в объект характеристики, либо в объект самого материала.
    Если во входных параметрах есть информация о характеристике, то данные пишутся в нее, иначе в материал.
    Данные пишутся в объект - last_goods

  '''
  from models import materialsgroupmodel
  try:
    post_data = None
    try:
      for file_row in request.files:
        post_data =  json.loads(request.files[file_row].file.read())['data']
        break
    except:
      pass
    if not post_data:
      post_data = request.body.read()
      post_data = json.loads(post_data)['data']

    if post_data:
      print('--------START 1C LAST GOODS INTEGRA-----------------------------')
      # групировка входных данных по номеру
      data_prices = {}
      for row in post_data['data']:
        data_prices[row['number']] = row

      # получение данных справочника материалов
      data_materials = materialsgroupmodel.get_all()
      for group_row in data_materials:
        for material_row in group_row.get('materials',[]):
          key = '{0}.{1}'.format(str(group_row['code']), str(material_row['code']))
          if key in data_prices:
            data_price_row = data_prices[key]['last_goods']
            if 'last_goods' not in material_row:
              material_row['last_goods'] = {}

            material_row['last_goods']['price'] = routine.strToFloat(data_price_row.get('price', 0))
            material_row['last_goods']['date'] = routine.strToDateTime(data_price_row.get('date', None))
            material_row['last_goods']['account'] = data_price_row.get('account','')
            material_row['last_goods']['good_code_1c'] = data_price_row.get('good_code_1c','')
            material_row['last_goods']['coef_si_div_iu'] = routine.strToFloat(data_price_row.get('coef_si_div_iu', 1))
            material_row['last_goods']['account_type'] = data_price_row.get('account_type','')
            material_row['last_goods']['invoice_unit'] = data_price_row.get('invoice_unit','')

            material_row['average_goods_price'] = 0
            goods_prices_history = data_prices[key].get('goods_prices_history',[])
            #if 'goods_prices_history' not in material_row:
            material_row['goods_prices_history'] = []

            if len(goods_prices_history)>0:
              summ_price = 0
              for data_price_row in goods_prices_history:
                summ_price += routine.strToFloat(data_price_row.get('price', 0))
                material_row['goods_prices_history'].append({
                  'price': routine.strToFloat(data_price_row.get('price', 0)),
                  'date': routine.strToDateTime(data_price_row.get('date', None)),
                  'account': data_price_row.get('account',''),
                  'good_code_1c': data_price_row.get('good_code_1c',''),
                  'account_type': data_price_row.get('account_type',''),
                  'invoice_unit': data_price_row.get('invoice_unit',''),
                  'coef_si_div_iu': routine.strToFloat(data_price_row.get('coef_si_div_iu', 1))
                })
              material_row['average_goods_price'] = float(summ_price) / len(goods_prices_history)

          if material_row.get('unique_props'):
            for prop_row in material_row['unique_props']:
              key = '{0}.{1}.{2}'.format(str(group_row['code']), str(material_row['code']), str(prop_row['key']))
              if key in data_prices:
                data_price_row = data_prices[key]['last_goods']
                if 'last_goods' not in prop_row:
                  prop_row['last_goods'] = {}
                prop_row['last_goods']['price'] = routine.strToFloat(data_price_row.get('price', 0))
                prop_row['last_goods']['date'] = routine.strToDateTime(data_price_row.get('date', None))
                prop_row['last_goods']['account'] = data_price_row.get('account','')
                prop_row['last_goods']['good_code_1c'] = data_price_row.get('good_code_1c','')
                prop_row['last_goods']['account_type'] = data_price_row.get('account_type','')
                prop_row['last_goods']['invoice_unit'] = data_price_row.get('invoice_unit','')
                prop_row['last_goods']['coef_si_div_iu'] = routine.strToFloat(data_price_row.get('coef_si_div_iu', 1))

                goods_prices_history = data_prices[key].get('goods_prices_history',[])
                prop_row['average_goods_price'] = 0
                # if 'goods_prices_history' not in prop_row:
                prop_row['goods_prices_history'] = []

                if len(goods_prices_history)>0:
                  summ_price = 0
                  for data_price_row in goods_prices_history:
                    summ_price += routine.strToFloat(data_price_row.get('price', 0))
                    prop_row['goods_prices_history'].append({
                      'price': routine.strToFloat(data_price_row.get('price', 0)),
                      'date': routine.strToDateTime(data_price_row.get('date', None)),
                      'account': data_price_row.get('account',''),
                      'account_type': data_price_row.get('account_type',''),
                      'invoice_unit': data_price_row.get('invoice_unit',''),
                      'good_code_1c': data_price_row.get('good_code_1c',''),
                      'coef_si_div_iu': routine.strToFloat(data_price_row.get('coef_si_div_iu', 1))
                    })
                  prop_row['average_goods_price'] = float(summ_price) / len(goods_prices_history)

        # обновление материалов
        materialsgroupmodel.update(
          {'_id': ObjectId(group_row['_id'])},
          {'materials':group_row['materials']}
        )

      print('--------FINISH 1C LAST GOODS INTEGRA-----------------------------')
      return routine.JSONEncoder().encode({'status': 'ok'})
    return routine.JSONEncoder().encode({'status': 'error','msg':'Data not found'})
  except Exception, exc:
    print('Error! 1C Orders Integration fail.' + str(exc))
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@get('/handlers/integra/get_categories_and_groups/<key>')
def get_categories_and_groups(key):
  '''
    Получение справочника ЭСУД разделов и групп
  '''
  from apis.esud import esudapi
  from models import datamodel
  try:
    if key != config.integra_1c_settings['key']:
      raise Exception('Ошибка. Не авторизованный запрос')
    result = esudapi.get_simple_dir_tree(datamodel.SYSTEM_OBJECTS['MATERIALS_DIR_LYB'])
    # result = esudapi.get_simple_dir_tree_with_sectors()
    # result = esudapi.get_2level_simple_dir_tree()
    return routine.JSONEncoder().encode({ 'status': 'ok', 'msg': '', 'data': result })
  except Exception, exc:
    print('Error! 1C Get categories and groups.' + str(exc))
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

def prepare_materials_labels(labels):
  result = []
  if labels:
    for row in labels:
      result.append({
        'sector_id' : str(row['sector']['_id']) if row.get('sector') else '',
        'category_id' : str(row['category']['_id']),
        'group_id' :  str(row['group']['_id']),
        'full_id' : '{0}#{1}'.format(str(row['category']['_id']), str(row['group']['_id']))
      })
  return result

@get('/handlers/integra/get_sectors_categories_and_groups/<key>')
def get_sectors_categories_and_groups(key):
  '''
    Получение справочника ЭСУД разделов и групп
  '''
  from apis.esud import esudapi
  from models import routinemodel
  try:
    if key != config.integra_1c_settings['key']:
      raise Exception('Ошибка. Не авторизованный запрос')
    result = esudapi.get_simple_dir_tree_with_sectors()
    routinemodel.update({'key':'spec2_groups_cache'}, {
      'last_update':datetime.datetime.utcnow(),
      'data': routine.JSONEncoder().encode(result)
    })
    return routine.JSONEncoder().encode({'status': 'ok','msg':'', 'data':result})
  except Exception, exc:
    print('Error! 1C Get sectors categories and groups.' + str(exc))
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

# @get('/handlers/integra/check_soap')
# def check_soap():
#   import zeep
#   from requests import Session
#   from requests.auth import HTTPBasicAuth  # or HTTPDigestAuth, or OAuth1, etc.
#   from zeep import Client
#   from zeep.transports import Transport
#   session = Session()
#   session.auth = HTTPBasicAuth('WEB', '123456')
#   client = Client('http://62.148.153.242:5555/CopyNew/ws/INTWEB.1cws?wsdl',
#   transport=Transport(session=session))
#   res = client.service.INTWEBZAPROS('1')
#   print(res)
#   print('-----')
#   client.wsdl.dump()
