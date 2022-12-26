#!/usr/bin/python
# -*- coding: utf-8 -*-

import datetime
from datetime import date
import time as root_time
from bson.objectid import ObjectId
from libraries import userlib
from models import countersmodel
import routine
import config
from traceback import print_exc


def connect():
  '''
    Функция  соединения с 1С веб-сервисами
  '''
  from requests import Session
  from requests.auth import HTTPBasicAuth  # or HTTPDigestAuth, or OAuth1, etc.
  import zeep
  from zeep import Client
  from zeep.transports import Transport

  session = Session()
  session.auth = HTTPBasicAuth(config.integra_1c_settings['user'],config.integra_1c_settings['password'])
  return Client(config.integra_1c_settings['wsdl'], transport=Transport(session=session))


def update_material(material_id, usr_email):
  '''
    Функция обновления информации о материале и его инд. характеристиках в 1С
    Обновление происходит посредством веб-сервиса
  '''

  def prepare_materials_labels(labels):
    result = []
    if labels:
      for row in labels:
        result.append({
          'category_id' : str(row['category']['_id']),
          'group_id' :  str(row['group']['_id']),
          'full_id' : '{0}#{1}'.format(str(row['category']['_id']), str(row['group']['_id']))
        })
    return result;

  from models import materialsgroupmodel, integra_1s_update_dirs_model

  # получение информации о материале
  group_info = materialsgroupmodel.get_one({'materials._id':material_id}, {'_id':1, 'code':1, 'name':1, 'materials.$':1})
  material_info = group_info['materials'][0]

  # подготовка информации
  materials = [{
    'group_id': str(group_info['_id']),
    'group_name': group_info['name'],
    'group_code': group_info['code'],
    'labels': prepare_materials_labels(material_info.get('labels',[])),
    'material_id': str(material_info['_id']),
    'material_code': material_info['code'],
    'material_name': material_info['name'],
    'material_unit_pto': material_info['unit_pto'],
    'material_unit_pto_value': material_info['unit_pto_value'],
    'material_is_active': material_info['is_active'],
    'material_user_email': material_info['user_email'],
    'material_date_change': routine.dateUtcToMoscow(material_info['date_change']).strftime('%d.%m.%Y %H:%M:%S')
  }]

  unique_props = []
  if 'unique_props' in material_info and material_info.get('unique_props',[]):
    for prop_row in material_info.get('unique_props',[]):
      unique_props.append({
        'group_id':str(group_info['_id']),
        'group_code':group_info['code'],
        'group_name':group_info['name'],
        'material_id': str(material_info['_id']),
        'material_code': material_info['code'],
        'material_name': material_info['name'],
        'material_is_active': material_info['is_active'],
        'prop_is_active': prop_row.get('is_active',False),
        'prop_name': prop_row['name'],
        'prop_id': str(prop_row['_id']),
        'prop_key': prop_row['key'],
        'prop_date_change':routine.dateUtcToMoscow(prop_row.get('date_change', datetime.datetime.utcnow()) or datetime.datetime.utcnow()).strftime('%d.%m.%Y %H:%M:%S'),
        'prop_user_email':prop_row.get('user_email', 'nobody@modul.org')
      })

  try:
    # Соединение с 1С
    client = connect()
    print('----------------')
    print(routine.JSONEncoder().encode(materials))
    print('----------------')
    print(routine.JSONEncoder().encode(unique_props))
    print('----------------')
    # запись в лог информации об обновлении материалов
    # обновление материалов
    res = client.service.update_materials(routine.JSONEncoder().encode({'data': materials}))
    integra_1s_update_dirs_model.add({
      'user_email': usr_email,
      'date': datetime.datetime.utcnow(),
      'type': 'materials',
      'object_id': materials[0]['material_id'],
      'res': str(res)
    })

    print('-------------')
    print(res)
    print('-------------')

    # обновление характеристик
    res = client.service.update_props(routine.JSONEncoder().encode({'data':unique_props}))

    print('-------------')
    print(res)
    print('-------------')

    integra_1s_update_dirs_model.add({
      'user_email': usr_email,
      'date': datetime.datetime.utcnow(),
      'type': 'unique_props',
      'res': str(res)
    })

  except Exception, exc:
    print('Error! 1C materials update.' + str(exc))
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})


def update_plan_norms(plan_norm_id, usr_email):
  '''
    Функция обновления информации о плановых расчетах на стороне 1С
    Обновление происходит посредством веб-сервиса
    plan_norm_id - идентификатор  планового расчета
    usr_email - пользователь, внесший изменения
    Обновление происходит только тех норм на которые назначен заказ и договор подписан
  '''
  from models import integra_1s_update_dirs_model, planecalculationmodel, contractmodel
  from apis.plannorms import plannormsapi_v2

  try:
    obj = planecalculationmodel.get(ObjectId(plan_norm_id))

    # проверка типа спецификации
    # в 1с отправляются только спецификации на которые назначен заказ
    if obj.get('document_type') and obj.get('document_type') != 'contract':
      return
    # получение информации о договоре
    # в 1с отправляются только спецификации на которые назначены подписанные договоры
    contract_info = contractmodel.get_by({'_id': obj['contract_id']}, {'is_signed': 1})
    if not contract_info or contract_info.get('is_signed') != 'yes':
      return

    if obj:
      data = plannormsapi_v2.get_actual_plan_norms(obj['order_number'])
      # Соединение с 1С
      client = connect()
      res = client.service.update_plan_norms(routine.JSONEncoder().encode({
        'order': obj['order_number'],
        'user_email':usr_email,
        'data': data
      }))

      print('-------------')
      print(res)
      print('-------------')

      integra_1s_update_dirs_model.add({
        'user_email': usr_email,
        'date': datetime.datetime.utcnow(),
        'type': 'plan_norms',
        'object_id': plan_norm_id,
        'order_number': obj['order_number'],
        'res': str(res)
      })

  except Exception, exc:
    print('Error! 1C plan norms update.' + str(exc))
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})
