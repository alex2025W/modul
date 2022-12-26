#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route, get, post, put, request
import datetime, time
from libraries import userlib
import routine
from traceback import print_exc
import config

@post('/handlers/service/get_multi_page_access_users')
def get_page_access_users():
  from apis.services import multi_page_access_helper
  try:
    page_key = request.json.get('page_key')
    return routine.JSONEncoder().encode({
      'status':'ok',
      'data': multi_page_access_helper.get_page_info(page_key)
    })
  except Exception, exc:
    print_exc()
    return routine.JSONEncoder().encode( {'status':'error', 'msg': str(exc)})

@post('/handlers/service/get_material_price')
def get_material_price():
# @get('/handlers/service/get_material_price/<order_number>/<material_search_key>')
# def get_material_price(order_number, material_search_key):
  '''
    GEt material price info
    If is setted order_number, then should get fact price info
    If is setted material_key, then should get plan price info
  '''
  from models import materialsgroupmodel, planecalculationmodel

  order_number = request.json.get('search_order_number')
  material_search_key = request.json.get('search_material_key')

  userlib.check_handler_access("material_price_page","r")
  try:
    result = {
      'info': None,
      'plan': {
        'is_buyed': 'yes',
        'coef_si_div_iu': 0,
        'price': 0,
        'date': '',
        'account': '',
        'account_type':'',
        'good_code_1c': ''
      },
      'fact':  {
        'is_buyed': 'no',
        'coef_si_div_iu': 0,
        'price': 0,
        'date': '',
        'account': '',
        'account_type':'',
        'good_code_1c': '',
      }
    }

    if not material_search_key:
      raise Exception('Не задан материал для поиска.')

    # get plan price info
    data_material = None

    material_key_src = material_search_key.split('.')
    if len(material_key_src)<2:
      raise Exception('Неверный код материала.')

    # get material information by his code
    group_key = routine.strToInt(material_key_src[0])
    material_key = routine.strToInt(material_key_src[1])
    prop_key = routine.strToInt(material_key_src[2]) if len(material_key_src) > 2 else None

    data_material = materialsgroupmodel.get_one({
      'code': group_key,
      'materials.code': material_key
    },{'materials.$':1})

    if not data_material or not data_material.get('materials') or len(data_material['materials'])==0:
      raise Exception('Материал не найден.')
    data_material = data_material['materials'][0]

    result['info']={
      '_id': data_material.get('_id'),
      'name': data_material.get('name'),
      'full_code': material_search_key,
    }

    if prop_key:
      try:
        data_prop = (row for row in data_material.get('unique_props',[]) if row["key"] == prop_key).next()
        if data_prop.get('last_goods'):
          result['plan'] = {
            'coef_si_div_iu': data_prop['last_goods'].get('coef_si_div_iu', 0),
            'price': data_prop['last_goods'].get('price', 0),
            'date': data_prop['last_goods'].get('date', ''),
            'account': data_prop['last_goods'].get('account', ''),
            'account_type': data_prop['last_goods'].get('account_type', ''),
            'invoice_unit': data_prop['last_goods'].get('invoice_unit', ''),
            'good_code_1c': data_prop['last_goods'].get('good_code_1c', ''),
          }
      except:
        raise Exception('У искомого материала нет указанной характеристики.')
    elif data_material.get('last_goods'):
      result['plan'] = {
        'coef_si_div_iu': data_material['last_goods'].get('coef_si_div_iu', 0),
        'price': data_material['last_goods'].get('price', 0),
        'date': data_material['last_goods'].get('date', ''),
        'account': data_material['last_goods'].get('account', ''),
        'account_type': data_material['last_goods'].get('account_type', ''),
        'invoice_unit': data_material['last_goods'].get('invoice_unit', ''),
        'good_code_1c': data_material['last_goods'].get('good_code_1c', ''),
      }
    # search fact price material
    if order_number:
      tmp = order_number.split('.')
      if len(tmp)<3:
        raise Exception('Неверный номер заказа.')
      unit_number = tmp[2]
      specification_data = planecalculationmodel.get_by({
        'order_number': '{0}.{1}'.format(tmp[0], tmp[1])
      }, None)
      if not specification_data:
        raise Exception('По указанному номеру заказа спецификация не найдена')

      tmp_search_material_key = '{0}_{1}'.format(group_key, material_key)
      for m_row in specification_data.get('materials',[]):
        key='{0}_{1}'.format(str(m_row.get('materials_group_key','0')), str(m_row.get('materials_key','0')))

        if key == tmp_search_material_key:
          if m_row.get('facts') and m_row['facts'].get(unit_number):
            facts_obj = m_row['facts'][unit_number]
            result['fact'] = {
              'is_buyed' : 'yes',
              'coef_si_div_iu': facts_obj.get('coef_si_div_iu', 0),
              'price': facts_obj.get('price', 0),
              'date': facts_obj.get('date', ''),
              'account': facts_obj.get('account', ''),
              'account_type': facts_obj.get('account_type', ''),
              'good_code_1c': facts_obj.get('good_code_1c', '')
            }
          else:
            result['fact']['is_buyed'] = 'no'
          break

    return routine.JSONEncoder().encode({'status':'ok', 'data': result})
  except Exception, exc:
    print_exc()
    return {'status':'error', 'msg': str(exc)}
