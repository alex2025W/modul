#!/usr/bin/python
# -*- coding: utf-8 -*-

import datetime, time
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

def get_all_numbers_for_filters():
  '''
    Get all specification numbers for filters.
    Only for records with {document_type: 'template'}
  '''
  from models import planecalculationmodel
  try:
    return [str(int(row['code'])) for row in planecalculationmodel.get_list_by({'document_type': 'template'}, {'code':1})]
  except Exception, exc:
    print('Error!: get_all_numbers_for_filters. Detail: {0}'.format(str(exc)))
    print_exc()
    raise Exception(str(exc))

def get_all_templates():
  '''
    Get all specification numbers for filters.
    Only for records with {document_type: 'template'}
  '''
  from models import planecalculationmodel
  try:
    return planecalculationmodel.get_list_by({'document_type': 'template'}, {'code':1, 'note':1, '_id': 1})
  except Exception, exc:
    print('Error!: get_all_templates. Detail: {0}'.format(str(exc)))
    print_exc()
    raise Exception(str(exc))

def get_object_info(search_obj):
  '''
    Get information about contract/order by some params
    -----------
    search_obj = {'number', document_type}
    document_type = ['order', 'contract', 'template']
  '''

  from models import contractmodel, ordermodel, planecalculationmodel
  try:
    object_info = None
    specification_info = None

    if not search_obj or not search_obj['number']:
      raise Exception('Не задан номер объекта для поиска.')

    # ПОИСК ПО НОМЕРУ ЗАКАЗА ----------------------------------------------------------------------
    if search_obj['document_type'] == 'contract':
      tmp = search_obj['number'].split('.')
      if len(tmp)<2:
        raise Exception('Неверный номер заказа.')

      # получение информации о договоре
      tmpObject = contractmodel.get_by({
        'number':routine.strToInt(tmp[0]),
        '$or': [
          {'parent_id': {'$exists': False}},
          {'parent_id':None},
          {'parent_id': ''}
        ]
      })
      if not tmpObject:
        raise Exception('Указанный договор не найден.')

      # доп. соглашения
      tmpObject['additional_contracts'] = []
      for c in contractmodel.get_list_by({'parent_id':tmpObject['_id']}):
        tmpObject['additional_contracts'].append(c)

      # получение продукции с договора и со всех его допников договора
      productions_data = {}
      for row in tmpObject.get('productions',[]):
        if row['number']>0:
          productions_data[str(row['_id'])] = row
      # получение продукции из допников
      for c in tmpObject.get('additional_contracts',[]):
        for row in c['productions']:
          productions_data[str(row['_id'])] = row

      # если в договоре нет позиции с указаным номером, то ошибка
      product = None
      for row in productions_data.values():
        if str(row['number']) == tmp[1]:
          product = row
          break
      if not product:
        raise Exception('Указанный заказ не найден.')

      units = [row['number'] for row in product.get('units',[]) if row['number']>0]
      units.sort()

      object_info = {
        'document_type': 'contract',
        'specification_number': None,
        '_id': tmpObject['_id'],
        'number': tmpObject['number'],
        'order_number': '{0}.{1}'.format(str(tmpObject['number']), str(product['number'])),
        'product': {
          '_id': product['_id'],
          'number': product['number'],
          'name': product['name']
        },
        'units': units
      }

    # ПОИСК ПО НОМЕРУ ЗАЯВКИ ----------------------------------------------------------------------
    if search_obj['document_type'] == 'order':
      tmp = search_obj['number'].split('.')
      if len(tmp)<2:
        raise Exception('Неверный номер заявки.')
      # получение информации о заявке
      tmpObject = ordermodel.get_by_args({'number':routine.strToInt(tmp[0])})
      if not tmpObject:
        raise Exception('Указанная заявка не найдена.')

      # если в заявке нет позиции с указаным номером, то ошибка
      product = None
      if len(tmpObject.get('products',[])) < routine.strToInt(tmp[1]):
        raise Exception('Указанная заявка не найдена.')
      product = tmpObject['products'][routine.strToInt(tmp[1])-1]

      object_info = {
        'document_type': 'order',
        'specification_number': None,
        '_id': tmpObject['_id'],
        'number': tmpObject['number'],
        'order_number': '{0}.{1}'.format(str(tmpObject['number']), tmp[1]),
        'product': {
          '_id': product['_id'],
          'number': routine.strToInt(tmp[1]),
          'name': product['name']
        },
        'units': None
      }

    return object_info

  except Exception, exc:
    print('Error!: get_norms_by_order_number. Detail: {0}'.format(str(exc)))
    print_exc()
    raise Exception(str(exc))

def get_norms_by_search_number(search_obj):
  '''
    Получение норм по номеру заказа/заявки/шаблона
    search_obj = {'number', document_type}
    document_type = ['order', 'contract', 'template']
  '''
  from models import planecalculationmodel, contractmodel, ordermodel

  try:
    object_info = None
    specification_info = None

    if not search_obj or not search_obj['number']:
      raise Exception('Не задан номер объекта для поиска.')

    # ПОИСК ПО НОМЕРУ ЗАКАЗА ----------------------------------------------------------------------
    if search_obj['document_type'] == 'contract':
      tmp = search_obj['number'].split('.')
      if len(tmp)<2:
        raise Exception('Неверный номер заказа.')

      # получение информации о договоре
      tmpObject = contractmodel.get_by({
        'number':routine.strToInt(tmp[0]),
        '$or': [
          {'parent_id': {'$exists': False}},
          {'parent_id':None},
          {'parent_id': ''}
        ]
      })
      if not tmpObject:
        raise Exception('Указанный договор не найден.')

      # доп. соглашения
      tmpObject['additional_contracts'] = []
      for c in contractmodel.get_list_by({'parent_id':tmpObject['_id']}):
        tmpObject['additional_contracts'].append(c)

      # получение продукции с договора и со всех его допников договора
      productions_data = {}
      for row in tmpObject.get('productions',[]):
        if row['number']>0:
          productions_data[str(row['_id'])] = row
      # получение продукции из допников
      for c in tmpObject.get('additional_contracts',[]):
        for row in c['productions']:
          productions_data[str(row['_id'])] = row

      # если в договоре нет позиции с указаным номером, то ошибка
      product = None
      for row in productions_data.values():
        if str(row['number']) == tmp[1]:
          product = row
          break
      if not product:
        raise Exception('Указанный заказ не найден.')

      units = [row['number'] for row in product.get('units',[]) if row['number']>0]
      units.sort()

      # получение информации о спецификации
      specification_info = planecalculationmodel.get_by({
        'contract_id': ObjectId(tmpObject['_id']),
        'production_id': ObjectId(product['_id'])
      }, None)

      object_info = {
        'specification_number': routine.strToInt(specification_info['code']) if specification_info else '',
        'document_type': 'contract',
        '_id': tmpObject['_id'],
        'number': tmpObject['number'],
        'order_number': '{0}.{1}'.format(str(tmpObject['number']), str(product['number'])),
        'product': {
          '_id': product['_id'],
          'number': product['number'],
          'name': product['name']
        },
        'units': units
      }

    # ПОИСК ПО НОМЕРУ ЗАЯВКИ ----------------------------------------------------------------------
    if search_obj['document_type'] == 'order':
      tmp = search_obj['number'].split('.')
      if len(tmp)<2:
        raise Exception('Неверный номер заявки.')
      # получение информации о заявке
      tmpObject = ordermodel.get_by_args({'number':routine.strToInt(tmp[0])})
      if not tmpObject:
        raise Exception('Указанная заявка не найдена.')

      # если в заявке нет позиции с указаным номером, то ошибка
      product = None
      if len(tmpObject.get('products',[])) < routine.strToInt(tmp[1]):
        raise Exception('Указанная заявка не найдена.')
      product = tmpObject['products'][routine.strToInt(tmp[1])-1]

      # получение краткой информации о спецификации
      specification_info = planecalculationmodel.get_by({
        'crm_id': tmpObject['_id'],
        'production_id': product['_id']
      }, None)

      object_info = {
        'specification_number': routine.strToInt(specification_info['code']) if specification_info else '',
        'document_type': 'order',
        '_id': tmpObject['_id'],
        'number': tmpObject['number'],
        'order_number': '{0}.{1}'.format(str(tmpObject['number']), tmp[1]),
        'product': {
          '_id': product['_id'],
          'number': routine.strToInt(tmp[1]),
          'name': product['name']
        },
        'units': None
      }

    # ПОИСК ПО СПЕЦИФИКАЦИИ/ШАБЛОНУ ----------------------------------------------------------------------
    if search_obj['document_type'] == 'template':
      # получение краткой информации о спецификации
      specification_info = planecalculationmodel.get_by({
        'code': routine.strToInt(search_obj['number'])
      }, None)

      if not specification_info:
        raise Exception('Шаблон не найден.')

      object_info = {
        'specification_number': routine.strToInt(specification_info['code']),
        'document_type': 'template',
        '_id': None,
        'number': None,
        'order_number': None,
        'product': None,
        'units': None
      }

      # Получение инфомрации о заказе/заявке по номеру спецификации
      document_type = specification_info['document_type'] if specification_info.get('document_type') else 'contract'

      # get contract info
      if document_type == 'contract' and specification_info.get('contract_id'):
        # получение информации о договоре
        tmpObject = contractmodel.get_by({ '_id': specification_info['contract_id'] })
        if not tmpObject:
          raise Exception('Договор указанный в спецификации не найден.')

        # доп. соглашения
        tmpObject['additional_contracts'] = []
        for c in contractmodel.get_list_by({'parent_id':tmpObject['_id']}):
          tmpObject['additional_contracts'].append(c)

        # получение продукции с договора и со всех его допников договора
        productions_data = {}
        for row in tmpObject.get('productions',[]):
          if row['number']>0:
            productions_data[str(row['_id'])] = row
        # получение продукции из допников
        for c in tmpObject.get('additional_contracts',[]):
          for row in c['productions']:
            productions_data[str(row['_id'])] = row

        # если в договоре нет позиции с указаным номером, то ошибка
        product = None
        for row in productions_data.values():
          if str(row['_id']) == str(specification_info['production_id']):
            product = row
            break
        if not product:
          raise Exception('Заказ указанный в спецификации не найден.')

        units = [row['number'] for row in product.get('units',[]) if row['number']>0]
        units.sort()

        object_info['_id'] = tmpObject['_id']
        object_info['number'] = tmpObject['number']
        object_info['product'] = {
          '_id': product['_id'],
          'number': product['number'],
          'name': product['name']
        }
        object_info['units'] = units
        object_info['order_number'] = '{0}.{1}'.format(str(tmpObject['number']), str(product['number']))

      # get crm order info
      elif document_type == 'order' and specification_info.get('crm_id'):
        # получение информации о заявке
        tmpObject = ordermodel.get_by_args({'_id': specification_info.get('crm_id')})
        if not tmpObject:
          raise Exception('Заявка указанная в спецификации на нейдена.')

        # если в заявке нет позиции с указаным номером, то ошибка
        product = None
        if len(tmpObject.get('products',[])) < specification_info['product_number']:
          raise Exception('Заявка указанная в спецификации на нейдена.')
        product = tmpObject['products'][specification_info['product_number']-1]

        object_info['_id'] = tmpObject['_id']
        object_info['number'] = tmpObject['number']
        object_info['product'] = {
          '_id': product['_id'],
          'number': specification_info['product_number'],
          'name': product['name']
        }
        object_info['units'] = None
        object_info['order_number'] = '{0}.{1}'.format(str(tmpObject['number']), str(object_info['product']['number']))

    return {
      'object_info': object_info,
      'specification_info': specification_info
    }
  except Exception, exc:
    print('Error!: get_norms_by_order_number. Detail: {0}'.format(str(exc)))
    print_exc()
    raise Exception(str(exc))

def add_new_specification(object_info, usr_email):
  '''
    Добавление новой спецификации
    Добавение срецификаций происходит на спец. участок
    object_info = {
      'specification_number',
      'document_type',
      '_id',
      'number',
      'product': {
        '_id',
        'number',
        'name'
      }
    }
  '''
  from models import planecalculationmodel, countersmodel, sectormodel
  try:
    # получение информации по участке
    sector_info = sectormodel.get(sectormodel.SPECIFICATION_SECTOR_ID)

    print(object_info)

    # подготовка нового объекта
    data = {
      '_id' : ObjectId(),
      'code' : countersmodel.get_next_sequence('plannorms'),
      'document_type' : object_info['document_type'] if object_info else 'template',
      'contract_id' : None,
      'contract_number' : None,
      'order_number' : None,
      'product_number' : None,
      'production_id' : None,
      'crm_id': None,
      'crm_number': None,
      'sector_id' : sector_info['_id'],
      'sector_code' : sector_info['code'],
      'sector_name' : sector_info['name'],
      'materials' : [ ],
      'remarks' : { "contains_remark" : False },
      'group_remarks' : None,
      'date_change' : datetime.datetime.utcnow(),
      'user_email' : usr_email,
      'groups_calculation': [],
      'materials_history': [],  # текстовая история изменения материалов
      'import_history': [],     # история импорта данных
      'groups_calculation_history': [], # история укрупненного планирования
    }

    if object_info:
      if object_info['document_type'] == 'contract':
        data['contract_id'] = ObjectId(object_info['_id'])
        data['contract_number'] = routine.strToInt(object_info['number'])
        data['order_number'] = '{0}.{1}'.format(
          str(object_info['number']),
          str(object_info['product']['number'])
        )
        data['product_number'] = routine.strToInt(object_info['product']['number'])
        data['production_id'] = ObjectId(object_info['product']['_id'])

      elif object_info['document_type'] == 'order':
        data['crm_id'] = ObjectId(object_info['_id'])
        data['crm_number'] = routine.strToInt(object_info['number'])
        data['order_number'] = '{0}.{1}'.format(
          str(object_info['number']),
          str(object_info['product']['number'])
        )
        data['product_number'] = routine.strToInt(object_info['product']['number'])
        data['production_id'] = ObjectId(object_info['product']['_id'])

    # добавление в БД
    planecalculationmodel.add(data)
    return data
  except Exception, exc:
    print('Error!: add_new_specification. Detail: {0}'.format(str(exc)))
    print_exc()
    raise Exception(str(exc))

def add_new_specification_by(object_info, search_obj, usr_email):
  '''
    Add new scpecification according contract/order/template
    object_info = {
      'specification_number',
      'document_type',
      '_id',
      'number',
      'product': {
        '_id',
        'number',
        'name'
      }
    }
    -----------------
    search_obj = {'number', document_type}
    document_type = ['order', 'contract', 'template']
  '''
  from models import planecalculationmodel
  try:
    # create new specification
    new_specification = add_new_specification(object_info, usr_email)
    # if need load data from another specification
    if search_obj and search_obj.get('number'):
      # get information about specification masterials
      specification_donor = get_norms_by_search_number(search_obj)
      if specification_donor['specification_info']:
        new_specification['materials'] = specification_donor['specification_info']['materials']
        for row in new_specification['materials']:
          row['_id'] = ObjectId()
        new_specification['copied_from'] = {
          'specification_id': specification_donor['specification_info']['_id'],
          'date': datetime.datetime.utcnow(),
          'usr_email': usr_email
        }
      # update specification
      planecalculationmodel.update(
        {'_id': new_specification['_id']},
        {'$set': {
          'materials': new_specification['materials'],
          'copied_from': new_specification.get('copied_from'),
          'date_change': datetime.datetime.utcnow(),
          'user_email': usr_email
        }}
      )
    return new_specification
  except Exception, exc:
    print('Error!: add_new_specification_by. Detail: {0}'.format(str(exc)))
    print_exc()
    raise Exception(str(exc))

def save_groups_values(specification_id, data, usr_email):
  '''
    Сохранение данных по групповым расчетам
    Если ID спецификации не задан, то ошибка
  '''
  from models import planecalculationmodel
  try:
    if not specification_id:
      raise Exception('Не задана спецификация.')
    specification = planecalculationmodel.get_by({'_id': ObjectId(specification_id)}, None)
    if not specification:
      raise Exception('Спецификация не найдена.')

    if not specification.get('groups_calculation_history'):
      specification['groups_calculation_history'] = []

    rows_to_add = []
    # update only data for current sector
    if specification.get('groups_calculation') and len(specification.get('groups_calculation')) > 0:
      for new_row in data:
        try:
          old_row = (
            row for row in specification['groups_calculation'] if row['_id'] == new_row['_id']
          ).next()
          old_row['value'] = new_row['value']
          old_row['autocalc'] = new_row['autocalc']
        except:
          rows_to_add.append(new_row)
          pass
      if len(rows_to_add) > 0:
        specification['groups_calculation'].extend(rows_to_add)
    else:
      specification['groups_calculation'] = data
    specification['groups_calculation_history'].append({
      'user_email': usr_email,
      'date_change': datetime.datetime.utcnow(),
      'data': specification['groups_calculation'],
    })
    specification['date_change'] = datetime.datetime.utcnow()
    specification['user_email'] = usr_email
    # обновление инфомрации в БД
    planecalculationmodel.update({'_id':specification['_id']}, {'$set':{
      'user_email': usr_email,
      'date_change': datetime.datetime.utcnow(),
      'groups_calculation': specification['groups_calculation'],
      'groups_calculation_history': specification['groups_calculation_history']
    }})
    return specification

  except Exception, exc:
    print('Error!: save_groups_values. Detail: {0}'.format(str(exc)))
    print_exc()
    raise Exception(str(exc))

def add_new_material_to_calculation(material_to_save, specification_id, usr_email, usr_fio):
  '''
    Add new material to specifications
  '''
  from models import planecalculationmodel

  try:
    # check on enter params
    if not specification_id:
      raise Exception('Не задана спецификация.')
    if not material_to_save:
      raise Exception('Не задан материал.')

    # get specification information
    specification = planecalculationmodel.get_by({'_id': ObjectId(specification_id)}, None)
    if not specification:
      raise Exception('Спецификация не найдена.')

    if not specification.get('materials_history'):
      specification['materials_history'] = []

    # prepare material information for specification
    new_material = {
      '_id': ObjectId(),
      'pto_size': 0,
      'unit_price': 0,
      'contract_number': specification.get('contract_number'),
      'status': planecalculationmodel.CALCULATION_STATUS['INCALCULATE'],
      'materials_id': ObjectId(material_to_save['material_id']),
      'fact_price': 0,
      'fact_size': 0,
      'date_change': datetime.datetime.utcnow(),
      'user_email': usr_email,
      'date_confirm': None,
      #'unique_props': "",
      'unique_props_info' : None,
      'has_blank': 0,
      'unit_production': 1,
      'materials_group_id' : material_to_save['material_group_id'],
      'materials_group_key' : material_to_save['material_group_code'],
      'materials_key' : material_to_save['material_code'],
      'materials_name' : material_to_save['material_name'],
      'materials_global_code': material_to_save['material_global_code'],
      'allowance': 0,
      'note': '',
      'category_id': material_to_save.get('category_id'),
      'sector_id': material_to_save.get('sector_id'),
      'group_id': material_to_save.get('group_id'),
      'materials_unit_pto': material_to_save.get('material_unit_pto'),
      'purchase_status': '',
      'purchase_user_email': '',
      'purchase_date_confirm': None,
      'purchase_statuses': [],
      'statuses': [{
        'status':planecalculationmodel.CALCULATION_STATUS['INCALCULATE'],
        'user_email':usr_email,
        'date_confirm':datetime.datetime.utcnow()
      }]
    }

    # save new material
    if not specification.get('materials'):
      specification['materials'] = []
    specification['materials'].append(new_material)

    # history
    specification['materials_history'].append({
      'user_email': usr_email,
      'user_fio': usr_fio,
      'date': datetime.datetime.utcnow(),
      'type': 'add',
      'material_info': {
        '_id': str(new_material['_id']),
        'materials_id': str(new_material['materials_id']),
        'materials_key' : new_material['materials_key'],
        'materials_group_key' : new_material['materials_group_key'],
        'materials_name' : new_material['materials_name'],
        'materials_global_code': new_material['materials_global_code'],
        'unique_props_info': None,
        #-----
        'category_id': new_material.get('category_id'),
        'sector_id': new_material.get('sector_id'),
        'group_id': new_material.get('group_id'),
        'status': new_material.get('status'),
      }
    })

    planecalculationmodel.update(
      {'_id': ObjectId(specification_id)},
      {'$set': {
        'materials': specification['materials'],
        'date_change': datetime.datetime.utcnow(),
        'user_email': usr_email,
        'materials_history': specification['materials_history']
      }}
    )

    # add category and groip information
    new_material['sector_routine'] = material_to_save.get('sector_routine')
    new_material['sector_number'] = material_to_save.get('sector_number')
    new_material['ector_id'] = material_to_save.get('sector_id')
    new_material['sector_name'] = material_to_save.get('sector_name')
    new_material['category_routine'] = material_to_save.get('category_routine')
    new_material['category_number'] = material_to_save.get('category_number')
    new_material['category_id'] = material_to_save.get('category_id')
    new_material['category_name'] = material_to_save.get('category_name')
    new_material['group_number'] = material_to_save.get('group_number')
    new_material['group_routine'] = material_to_save.get('group_routine')
    new_material['group_id'] = material_to_save.get('group_id')
    new_material['group_name'] = material_to_save.get('group_name')

    return new_material
  except Exception, exc:
    print('Error!: save_groups_values. Detail: {0}'.format(str(exc)))
    print_exc()
    raise Exception(str(exc))

def remove_material_from_calculation(material_id, category_id, group_id, specification_id, usr_email, usr_fio):
  '''
    Add new mayerial to specifications
  '''
  from models import planecalculationmodel, materialsgroupmodel

  try:
    # check on enter params
    if not specification_id:
      raise Exception('Не задана спецификация.')
    if not material_id:
      raise Exception('Не задан материал.')

    # get specification information
    specification = planecalculationmodel.get_by({'_id': ObjectId(specification_id)}, None)
    if not specification:
      raise Exception('Спецификация не найдена.')

    if not specification.get('materials_history'):
      specification['materials_history'] = []
    materials_to_save = []

    # справочник материалов
    materials = { str(v['_id']):v for v in materialsgroupmodel.get_materials() }

    for row in specification.get('materials',[]):
      if material_id != str(row['materials_id']) or (category_id != row['category_id'] and group_id != row['group_id']):
        materials_to_save.append(row)
      else:
        # history
        specification['materials_history'].append({
          'user_email': usr_email,
          'user_fio': usr_fio,
          'date': datetime.datetime.utcnow(),
          'type': 'remove',
          'material_info': {
            '_id': str(row['_id']),
            'materials_id': str(row['materials_id']),
            'materials_key' : row['materials_key'],
            'materials_group_key' : row['materials_group_key'],
            # 'materials_name' : row['materials_name'],
            'materials_name': materials.get(str(row['materials_id']),{}).get('name',''),
            # 'materials_global_code': row['materials_global_code'],
            # 'materials_global_code': materials.get(str(row['materials_id']),{}).get('global_code',''),
            'unique_props_info': None,
            #-----
            'category_id': row.get('category_id'),
            'sector_id': row.get('sector_id'),
            'group_id': row.get('group_id'),
            'status': row.get('status'),
          }
        })

    # remove material from specification
    planecalculationmodel.update(
      {'_id': ObjectId(specification_id)},
      {'$set': {
        'materials': materials_to_save,
        'date_change': datetime.datetime.utcnow(),
        'user_email': usr_email,
        'materials_history': specification['materials_history']
      }}
    )

  except Exception, exc:
    print('Error!: remove_material_from_calculation. Detail: {0}'.format(str(exc)))
    print_exc()
    raise Exception(str(exc))

def prepare_material_to_history(action, old_row, new_row, usr_email, usr_fio, materials):
  '''
    Prepare information about material to history
    materials - dictionary of materials
  '''
  result = None
  new_props_unique_props_info = None
  old_props_unique_props_info = None

  if new_row.get('unique_props_info'):
    new_props_unique_props_info = {
      '_id': new_row['unique_props_info'].get('_id'),
      'key': new_row['unique_props_info'].get('key'),
      'global_code': new_row['unique_props_info'].get('global_code'),
      'name': new_row['unique_props_info'].get('name'),
      'type': new_row['unique_props_info'].get('type')
    }
  if old_row and old_row.get('unique_props_info'):
    old_props_unique_props_info = {
      '_id': old_row['unique_props_info'].get('_id'),
      'key': old_row['unique_props_info'].get('key'),
      'global_code': old_row['unique_props_info'].get('global_code'),
      'name': old_row['unique_props_info'].get('name'),
      'type': old_row['unique_props_info'].get('type')
    }

  if action == 'add':
    result = {
      'user_email': usr_email,
      'user_fio': usr_fio,
      'date': datetime.datetime.utcnow(),
      'type': 'add',
      'material_info': {
        '_id': str(new_row['_id']),
        'materials_id': str(new_row['materials_id']),
        'materials_key' : new_row['materials_key'],
        'materials_group_key' : new_row['materials_group_key'],
        #'materials_name' : new_row['materials_name'],
        'materials_name': materials.get(str(new_row['materials_id']),{}).get('name',''),
        # 'materials_global_code': new_row['materials_global_code'],
        # 'materials_global_code': materials.get(str(new_row['materials_id']),{}).get('global_code',''),
        'unique_props_info': new_props_unique_props_info,
        #-----
        'category_id': new_row.get('category_id'),
        'sector_id': new_row.get('sector_id'),
        'group_id': new_row.get('group_id'),
        'status': new_row.get('status'),
      }
    }
  elif action == 'remove':
    result = {
      'user_email': usr_email,
      'user_fio': usr_fio,
      'date': datetime.datetime.utcnow(),
      'type': 'remove',
      'material_info': {
        '_id': str(old_row['_id']),
        'materials_id': str(old_row['materials_id']),
        'materials_key' : old_row['materials_key'],
        'materials_group_key' : old_row['materials_group_key'],
        #'materials_name' : old_row['materials_name'],
        'materials_name': materials.get(str(old_row['materials_id']),{}).get('name',''),
        # 'materials_global_code': old_row['materials_global_code'],
        # 'materials_global_code': materials.get(str(old_row['materials_id']),{}).get('global_code',''),
        'unique_props_info': old_props_unique_props_info,
        #-----
        'category_id': old_row.get('category_id'),
        'sector_id': old_row.get('sector_id'),
        'group_id': old_row.get('group_id'),
        'status': old_row.get('status'),
      }
    }
  elif action == 'edit':
    if old_row.get('pto_size') != new_row.get('pto_size') or old_row.get('note') != new_row.get('note') or old_row.get('status') != new_row.get('status') or ((not old_row.get('unique_props_info') and new_row.get('unique_props_info')) or (old_row.get('unique_props_info') and not new_row.get('unique_props_info')) or (old_row.get('unique_props_info') and new_row.get('unique_props_info') and old_row.get('unique_props_info',{}).get('_id') != new_row.get('unique_props_info',{}).get('_id'))):
      result = {
        'user_email': usr_email,
        'user_fio': usr_fio,
        'date': datetime.datetime.utcnow(),
        'type': 'edit',
        'old_material_info': {
          '_id': str(old_row['_id']),
          'materials_id': str(old_row['materials_id']),
          'materials_key' : old_row['materials_key'],
          'materials_group_key' : old_row['materials_group_key'],
          #'materials_name' : old_row.get('materials_name',''),
          'materials_name': materials.get(str(old_row['materials_id']),{}).get('name',''),
          # 'materials_global_code': old_row['materials_global_code'],
          # 'materials_global_code': materials.get(str(old_row['materials_id']),{}).get('global_code',''),
          'unique_props_info': old_props_unique_props_info,
          #-----
          'category_id': old_row.get('category_id'),
          'sector_id': old_row.get('sector_id'),
          'group_id': old_row.get('group_id'),
          'status': old_row.get('status'),
          #-----
          'pto_size': old_row.get('pto_size'),
          'note': old_row.get('note'),
          'allowance': old_row.get('allowance'),
          'unique_props_info': old_row.get('unique_props_info'),
        },
        'material_info': {
          '_id': str(new_row['_id']),
          'materials_id': str(new_row['materials_id']),
          'materials_key' : new_row['materials_key'],
          'materials_group_key' : new_row['materials_group_key'],
          #'materials_name' : new_row['materials_name'],
          'materials_name': materials.get(str(new_row['materials_id']),{}).get('name',''),
          # 'materials_global_code': new_row['materials_global_code'],
          # 'materials_global_code': materials.get(str(new_row['materials_id']),{}).get('global_code',''),
          'unique_props_info': new_props_unique_props_info,
          #-----
          'category_id': new_row.get('category_id'),
          'sector_id': new_row.get('sector_id'),
          'group_id': new_row.get('group_id'),
          'status': new_row.get('status'),
          #-----
          'pto_size': new_row.get('pto_size'),
          'note': new_row.get('note'),
          'allowance': new_row.get('allowance'),
          'unique_props_info': new_row.get('unique_props_info'),
        }
      }
  return result

def save_calculation(materials_to_save, specification_id, note, usr_email, usr_fio):
  '''
    Upadate calculation
  '''
  from models import planecalculationmodel, materialsgroupmodel

  try:
    # check on enter params
    if not specification_id:
      raise Exception('Не задана спецификация.')
    # get specification information
    specification = planecalculationmodel.get_by({'_id': ObjectId(specification_id)}, None)
    if not specification:
      raise Exception('Спецификация не найдена.')
    # history
    if not specification.get('materials_history'):
      specification['materials_history'] = []

    # справочник материалов
    materials_dictionary = { str(v['_id']):v for v in materialsgroupmodel.get_materials() }

    materials_to_add = []
    materials_to_delete = {}
    materials_to_update = {}

    for row in materials_to_save:
      if not row['_id']:
        materials_to_add.append(row)
      elif str(row['status']) =='-1':
        materials_to_delete[str(row['_id'])] = row
      else:
        materials_to_update[str(row['_id'])] = row

    old_materials = specification.get('materials', [])
    new_materials = []
    for row in old_materials:
      if str(row['_id']) in materials_to_update:
        tmp_material = materials_to_update[str(row['_id'])]
        # history---
        tmp_history_row = prepare_material_to_history('edit', row, tmp_material, usr_email, usr_fio, materials_dictionary)
        if tmp_history_row:
          specification['materials_history'].append(tmp_history_row)
        #-----
        if str(row['status']) != '1' and str(tmp_material['status']) == '1':
          row['date_confirm'] =  datetime.datetime.utcnow()
          row['purchase_status'] = '0'
          new_purchase_status = {
            'purchase_status':'0',
            'purchase_user_email': usr_email,
            'purchase_date_confirm': datetime.datetime.utcnow()
          }
          if not 'purchase_statuses' in row:
            row['purchase_statuses'] = []
          row['purchase_statuses'].append(new_purchase_status)

        if row['status'] != tmp_material['status']:
          new_status ={
            'status': str(tmp_material['status']),
            'user_email':usr_email,
            'date_confirm':datetime.datetime.utcnow()
          }
          if 'statuses' in row:
            row['statuses'].append(new_status)
          else:
            old_status ={
              'status': str(row['status']),
              'user_email':usr_email,
              'date_confirm':datetime.datetime.utcnow()
            }
            row['statuses'] = [old_status, new_status]

        row['pto_size'] = routine.strToFloat(tmp_material['pto_size'])
        row['note'] = tmp_material['note']
        row['allowance'] = routine.strToFloat(tmp_material['allowance'])
        row['status'] = tmp_material['status']
        row['unique_props_info'] = tmp_material['unique_props_info']

        new_materials.append(row)
      elif str(row['_id']) not in materials_to_delete and str(row['_id']):
        new_materials.append(row)
      elif str(row['_id']) in materials_to_delete and str(row['_id']):
        specification['materials_history'].append(prepare_material_to_history('remove', row, None, usr_email, usr_fio, materials_dictionary))

    if len(materials_to_add) > 0:
      for row in materials_to_add:
        row['_id'] = ObjectId()
        row['statuses'] = [{
          'status': str(row['status']),
          'user_email':usr_email,
          'date_confirm':datetime.datetime.utcnow()
        }]
        new_materials.append(row)
        specification['materials_history'].append(prepare_material_to_history('add', None, row, usr_email, usr_fio, materials_dictionary))

    planecalculationmodel.update(
      {'_id': ObjectId(specification_id)},
      {'$set': {
        'materials': new_materials,
        'note': note,
        'date_change': datetime.datetime.utcnow(),
        'user_email': usr_email,
        'materials_history': specification['materials_history']
      }}
    )

    return planecalculationmodel.get_by({'_id': ObjectId(specification_id)}, None)

  except Exception, exc:
    print('Error!: save_calculation. Detail: {0}'.format(str(exc)))
    print_exc()
    raise Exception(str(exc))

def set_order_to_specification(specification_id, search_obj, usr_email):
  '''
    Set order to existing specification - template
    Order can ge setted only for specifications templates
    -----
    specification_id - id updated specification
    search_obj = {'number', document_type}
  '''
  from models import planecalculationmodel
  try:
    # get information about specification
    data = planecalculationmodel.get_by({'_id': ObjectId(specification_id)}, None)
    if not data:
      raise Exception('Спецификация не найдена.')
    if not data.get('document_type') or data.get('document_type' ) != 'template':
      raise Exception('К заказу или заявке можно привязать только спецификации-шаблоны.')

    # get information about order
    object_info = get_object_info(search_obj)
    object_info['specification_number'] = routine.strToInt(data['code'])

    data['document_type'] = object_info['document_type']

    if object_info['document_type'] == 'contract':
      data['contract_id'] = ObjectId(object_info['_id'])
      data['contract_number'] = routine.strToInt(object_info['number'])
      data['order_number'] = '{0}.{1}'.format(
        str(object_info['number']),
        str(object_info['product']['number'])
      )
      data['product_number'] = routine.strToInt(object_info['product']['number'])
      data['production_id'] = ObjectId(object_info['product']['_id'])

    elif object_info['document_type'] == 'order':
      data['crm_id'] = ObjectId(object_info['_id'])
      data['crm_number'] = routine.strToInt(object_info['number'])
      data['order_number'] = '{0}.{1}'.format(
        str(object_info['number']),
        str(object_info['product']['number'])
      )
      data['product_number'] = routine.strToInt(object_info['product']['number'])
      data['production_id'] =ObjectId(object_info['product']['_id'])

    data['date_change'] = datetime.datetime.utcnow()
    data['user_email'] = usr_email

    # update specification
    planecalculationmodel.update({'_id': data['_id']}, data)

    return {
      'object_info': object_info,
      'specification_info': data
    }

  except Exception, exc:
    print('Error!: set_order_to_specification. Detail: {0}'.format(str(exc)))
    print_exc()
    raise Exception(str(exc))

def check_if_link_available(object_info, search_obj, operation_type, usr_email, sector_id, category_id, group_id):
  '''
    Check if available link one specification to another
    --------------
    object_info = {
      'specification_number',
      'document_type',
      '_id',
      'number',
      'product': {
        '_id',
        'number',
        'name'
      }
    }
    search_obj = {'number', 'document_type'}
    operation_type = import/export
    sector_id - id of sector to transfer
    category_id  - id of category fo transfer
    group_id - id of group to transfer
  '''

  from models import planecalculationmodel
  try:
    object_info_detail = get_norms_by_search_number({
      'number': object_info['order_number'] if object_info['document_type']!='template' else object_info['specification_number'],
      'document_type': object_info['document_type']
    })
    search_obj_detail = get_norms_by_search_number(search_obj)

    if operation_type == 'export':
      if search_obj_detail['specification_info'] and search_obj_detail['specification_info'].get('materials') and len(search_obj_detail['specification_info'].get('materials')) > 0:

        if group_id and any(str(item.get('group_id','')) == group_id for item in search_obj_detail['specification_info'].get('materials')):
          return {
            'can_be_linked': False,
            'msg': 'Внимание. Расчёты в совпадающих "категория/группа" будут перезаписаны'
          }
        elif category_id and any(str(item.get('category_id','')) == category_id for item in search_obj_detail['specification_info'].get('materials')):
          return {
            'can_be_linked': False,
            'msg': 'Внимание. Расчёты в совпадающих "категория/группа" будут перезаписаны'
          }
        elif sector_id and any(str(item.get('sector_id','')) == sector_id for item in search_obj_detail['specification_info'].get('materials')):
          return {
            'can_be_linked': False,
            'msg': 'Внимание. Расчёты в совпадающих "категория/группа" будут перезаписаны'
          }
        elif not group_id and not category_id and not sector_id:
          return {
            'can_be_linked': False,
            'msg': 'Внимание. Расчёты в совпадающих "категория/группа" будут перезаписаны'
          }
    else:
      if not search_obj_detail['specification_info']:
        raise Exception('Искомый документ не содержит расчетов.')

      if object_info_detail['specification_info'] and object_info_detail['specification_info'].get('materials') and len(object_info_detail['specification_info']['materials']) > 0:

        if group_id and any(str(item.get('group_id','')) == group_id for item in object_info_detail['specification_info'].get('materials')):
          return {
            'can_be_linked': False,
            'msg': 'Внимание. Расчёты в совпадающих "категория/группа" будут перезаписаны'
          }
        elif category_id and any(str(item.get('category_id','')) == category_id for item in object_info_detail['specification_info'].get('materials')):
          return {
            'can_be_linked': False,
            'msg': 'Внимание. Расчёты в совпадающих "категория/группа" будут перезаписаны'
          }
        elif sector_id and any(str(item.get('sector_id','')) == sector_id for item in object_info_detail['specification_info'].get('materials')):
          return {
            'can_be_linked': False,
            'msg': 'Внимание. Расчёты в совпадающих "категория/группа" будут перезаписаны'
          }
        elif not group_id and not category_id and not sector_id:
          return {
            'can_be_linked': False,
            'msg': 'Внимание. Расчёты в совпадающих "категория/группа" будут перезаписаны'
          }

    return {
      'can_be_linked': True,
      'msg': ''
    }

  except Exception, exc:
    print('Error!: check_if_link_available. Detail: {0}'.format(str(exc)))
    print_exc()
    raise Exception(str(exc))

def link_specification(object_info, search_obj, operation_type, usr_email, usr_fio, sector_id, category_id, group_id):
  '''
    Link one specification to another
    --------------
    object_info = {
      'specification_number',
      'document_type',
      '_id',
      'number',
      'product': {
        '_id',
        'number',
        'name'
      }
    }
    search_obj = {'number', 'document_type'}
    operation_type = import/export
    sector_id - id of sector to transfer
    category_id  - id of category fo transfer
    group_id - id of group to transfer
  '''

  from models import planecalculationmodel
  try:
    res = None
    object_info_detail = get_norms_by_search_number({
      'number': object_info['order_number'] if object_info['document_type']!='template' else object_info['specification_number'],
      'document_type': object_info['document_type']
    })
    search_obj_detail = get_norms_by_search_number(search_obj)
    if operation_type == 'export':
      specification_to_update = search_obj_detail['specification_info']

      history_item = {
        'date': datetime.datetime.utcnow(),
        'user_email': usr_email,
        'user_fio': usr_fio,
        'old_data': specification_to_update['materials'],
        'new_data': None
      }
      if not specification_to_update.get('import_history'):
        specification_to_update['import_history'] = []

      if group_id:
        # remove all old materials with that group
        new_materials = [row for row in object_info_detail['specification_info']['materials'] or [] if (str(row.get('group_id','')) ==  group_id and str(row.get('category_id','')) ==  category_id and str(row.get('sector_id','')) == sector_id) ]
        if len(new_materials) == 0:
          raise Exception('Текущий документ не содержит расчетов по указанной группе.')
        history_item['new_data'] = new_materials
        new_materials.extend([row for row in specification_to_update['materials'] or [] if str(row.get('group_id','')) != group_id])
        specification_to_update['materials'] = new_materials
      elif category_id:
        # remove all old materials with that category
        new_materials = [row for row in object_info_detail['specification_info']['materials'] or [] if (str(row.get('category_id','')) ==  category_id and str(row.get('sector_id','')) == sector_id) ]
        if len(new_materials) == 0:
          raise Exception('Текущий документ не содержит расчетов по указанной категории.')
        history_item['new_data'] = new_materials
        new_materials.extend([row for row in specification_to_update['materials'] or [] if str(row.get('category_id','')) != category_id ])
        specification_to_update['materials'] = new_materials
      elif sector_id:
        # remove all old materials with that sector
        new_materials = [row for row in object_info_detail['specification_info']['materials'] or [] if (str(row.get('sector_id','')) == sector_id) ]
        if len(new_materials) == 0:
          raise Exception('Текущий документ не содержит расчетов по указанному направлению.')
        history_item['new_data'] = new_materials
        new_materials.extend([row for row in specification_to_update['materials'] or [] if (str(row.get('sector_id','')) != sector_id)  ])
        specification_to_update['materials'] = new_materials
      else:
        history_item['new_data'] = object_info_detail['specification_info']['materials']
        specification_to_update['materials'] = object_info_detail['specification_info']['materials']

      specification_to_update['date_change'] = datetime.datetime.utcnow()
      specification_to_update['user_email'] = usr_email
      specification_to_update['copied_from'] = {
        'specification_id': specification_to_update['_id'],
        'date': datetime.datetime.utcnow(),
        'user_email': usr_email
      }
      specification_to_update['import_history'].append(history_item)

      # update specification
      planecalculationmodel.update({'_id': specification_to_update['_id']}, {'$set':{
        'materials': specification_to_update['materials'],
        'date_change': specification_to_update['date_change'],
        'user_email': specification_to_update['user_email'],
        'copied_from': specification_to_update['copied_from'],
        'import_history': specification_to_update['import_history']
      }})
    else:
      specification_to_update = object_info_detail['specification_info']

      history_item = {
        'date': datetime.datetime.utcnow(),
        'user_email': usr_email,
        'user_fio': usr_fio,
        'old_data': specification_to_update['materials'],
        'new_data': None
      }
      if not specification_to_update.get('import_history'):
        specification_to_update['import_history'] = []

      if group_id:
        # remove all old materials with that group
        new_materials = [row for row in search_obj_detail['specification_info']['materials'] or [] if (str(row.get('group_id','')) ==  group_id and str(row.get('category_id','')) ==  category_id and str(row.get('sector_id','')) == sector_id) ]
        if len(new_materials) == 0:
          raise Exception('Искомый документ не содержит расчетов по указанной группе.')
        history_item['new_data'] = new_materials
        new_materials.extend([row for row in specification_to_update['materials'] or [] if str(row.get('group_id','')) != group_id ])
        specification_to_update['materials'] = new_materials
      elif category_id:
        # remove all old materials with that category
        new_materials = [row for row in search_obj_detail['specification_info']['materials'] or [] if (str(row.get('category_id','')) ==  category_id and str(row.get('sector_id','')) == sector_id) ]
        if len(new_materials) == 0:
          raise Exception('Искомый документ не содержит расчетов по указанной категории.')
        history_item['new_data'] = new_materials
        new_materials.extend([row for row in specification_to_update['materials'] or [] if str(row.get('category_id','')) != category_id])
        specification_to_update['materials'] = new_materials
      elif sector_id:
        # remove all old materials with that sector
        new_materials = [row for row in search_obj_detail['specification_info']['materials'] or [] if (str(row.get('sector_id','')) == sector_id) ]
        if len(new_materials) == 0:
          raise Exception('Искомый документ не содержит расчетов по указанному направлению.')
        history_item['new_data'] = new_materials
        new_materials.extend([row for row in specification_to_update['materials'] or [] if str(row.get('sector_id','')) != sector_id ])
        specification_to_update['materials'] = new_materials
      else:
        history_item['new_data'] = search_obj_detail['specification_info']['materials']
        specification_to_update['materials'] = search_obj_detail['specification_info']['materials']

      specification_to_update['date_change'] = datetime.datetime.utcnow()
      specification_to_update['user_email'] = usr_email
      specification_to_update['copied_from'] = {
        'specification_id': search_obj_detail['specification_info']['_id'],
        'date': datetime.datetime.utcnow(),
        'user_email': usr_email
      }
      specification_to_update['import_history'].append(history_item)
      # update specification
      planecalculationmodel.update({'_id': specification_to_update['_id']}, {'$set':{
        'materials': specification_to_update['materials'],
        'date_change': specification_to_update['date_change'],
        'user_email': specification_to_update['user_email'],
        'copied_from': specification_to_update['copied_from'],
        'import_history': specification_to_update['import_history']
      }})

    return {
      'object_info': object_info,
      'search_obj': search_obj,
      'object_info_detail': object_info_detail
    }

  except Exception, exc:
    print('Error!: check_if_link_available. Detail: {0}'.format(str(exc)))
    print_exc()
    raise Exception(str(exc))

def get_report_data(specification_number, unit_number):
  '''
    Get data for report
    unit_number - string number of unit of production (only for contract specification)
    If unit number not is '' then do not calculate facts
  '''
  from models import planecalculationmodel, materialsgroupmodel
  from apis.esud import esudapi

  # recalculate volumes according user group volumes
  def re_calculate_volumes(document_number, tree, group_volumes, result):
    for row in tree:
      # recursion
      if row['type'] != 'group':
        re_calculate_volumes(document_number, row.get('items',[]), group_volumes, result)
      # check data
      row['calculated_value'] = group_volumes[row['_id']]['value'] if row['_id'] in group_volumes else 0
      # add data to result only if group calculated value > 0
      if row['type'] == 'group':
        sector_info = row['parent']['parent']
        category_info = row['parent']
        if len(row.get('items', [])) == 0 and row['calculated_value'] > 0:
          category_info['added'] = True
          sector_info['added'] = True
          result.append({
            'document_number': document_number, # Заказ
            'material_key':'-',
            'material_group_key': '-',
            'material_name': '-',
            'sku_name': '-',
            'unit_purchase': '-',
            'unit_pto': 'руб.',
            'material_group_name': '-',
            'unique_props_key': '-',
            'unique_props_name': '-',
            'unique_props_info': '-',
            'material_full_key': '-',
            #---
            'sector_id': str(sector_info['_id']),
            'sector_index': sector_info['index'],
            'sector_name': sector_info['name'],
            'category_id': str(category_info['_id']),
            'category_index': category_info['index'],
            'category_name': category_info['name'],
            'group_id': str(row['_id']),
            'group_index': row['index'],
            'group_name': row['name'],
            #---
            'pto_size': row['calculated_value'],
            'plan_price': {
              'price': 1,             # Цена за единицу план без НДС
              'date':'',              # Цена план, дата
              'document':'',          # Цена план, документ
              'goods_code':'',        # Цена план, код товара
              'summ_price': row['calculated_value'], # Сумма план без НДС
              'coef_si_div_iu': 0,    # коэффициенn
              'account_type': '',     # закупка / приход / прайс
              'invoice_unit': '',     # Ед. оплаты
            },
            'fact_price': {
              'price': 0,             # Цена факт без НДС
              'date':'',              # Цена факт, дата
              'document':'',          # Цена факт, документ
              'goods_code':'',        # Цена факт, код товара
              'summ_price': 0,        # Сумма факт без НДС
              'coef_si_div_iu': 0,    # коэффициенn
              'account_type': '',     # закупка / приход / прайс
              'invoice_unit': '',     # Ед. оплаты
            },
            'fact_volumes': {
              'inpay': 0,             # в оплате
              'payed': 0,             # оплачено
              'onstore': 0,           # на складе
              'onwork': 0,            # отгружено
              'notpayed': 0,          # требуется оплата
              'notonwork': 0,         # не отгружено
            },
            #---
            'note': '-',
            'status': '-',
          })
        elif len(row.get('items', [])) > 0:
          category_info['added'] = True
          sector_info['added'] = True
      elif row['type'] == 'category' and row['calculated_value'] > 0 and not row.get('added'):
        sector_info = row['parent']
        sector_info['added'] = True
        result.append({
          'document_number': document_number, # Заказ
          'material_key':'-',
          'material_group_key': '-',
          'material_name': '-',
          'sku_name': '-',
          'unit_purchase': '-',
          'unit_pto': 'руб.',
          'material_group_name': '-',
          'unique_props_key': '-',
          'unique_props_name': '-',
          'unique_props_info': '-',
          'material_full_key': '-',
          #---
          'sector_id': str(sector_info['_id']),
          'sector_index': sector_info['index'],
          'sector_name': sector_info['name'],
          'category_id': str(row['_id']),
          'category_index': row['index'],
          'category_name': row['name'],
          'group_id': '',
          'group_index': '',
          'group_name': '',
          #---
          'pto_size': row['calculated_value'],
          'plan_price': {
            'price': 1,             # Цена за единицу план без НДС
            'date':'',              # Цена план, дата
            'document':'',          # Цена план, документ
            'goods_code':'',        # Цена план, код товара
            'summ_price': row['calculated_value'], # Сумма план без НДС
            'coef_si_div_iu': 0,    # коэффициенn
            'account_type': '',     # закупка / приход / прайс
            'invoice_unit': '',     # Ед. оплаты
          },
          'fact_price': {
            'price': 0,             # Цена факт без НДС
            'date':'',              # Цена факт, дата
            'document':'',          # Цена факт, документ
            'goods_code':'',        # Цена факт, код товара
            'summ_price': 0,        # Сумма факт без НДС
            'coef_si_div_iu': 0,    # коэффициенn
            'account_type': '',     # закупка / приход / прайс
            'invoice_unit': '',     # Ед. оплаты
          },
          'fact_volumes': {
            'inpay': 0,             # в оплате
            'payed': 0,             # оплачено
            'onstore': 0,           # на складе
            'onwork': 0,            # отгружено
            'notpayed': 0,          # требуется оплата
            'notonwork': 0,         # не отгружено
          },
          #---
          'note': '-',
          'status': '-',
        })
      elif row['type'] == 'sector' and row['calculated_value'] > 0 and not row.get('added'):
        result.append({
          'document_number': document_number, # Заказ
          'material_key':'-',
          'material_group_key': '-',
          'material_name': '-',
          'sku_name': '-',
          'unit_purchase': '-',
          'unit_pto': 'руб.',
          'material_group_name': '-',
          'unique_props_key': '-',
          'unique_props_name': '-',
          'unique_props_info': '-',
          'material_full_key': '-',
          #---
          'sector_id': str(row['_id']),
          'sector_index': row['index'],
          'sector_name': row['name'],
          'category_id': '',
          'category_index': '',
          'category_name': '',
          'group_id': '',
          'group_index': '',
          'group_name': '',
          #---
          'pto_size': row['calculated_value'],
          'plan_price': {
            'price': 1,             # Цена за единицу план без НДС
            'date':'',              # Цена план, дата
            'document':'',          # Цена план, документ
            'goods_code':'',        # Цена план, код товара
            'summ_price': row['calculated_value'], # Сумма план без НДС
            'coef_si_div_iu': 0,    # коэффициенn
            'account_type': '',     # закупка / приход / прайс
            'invoice_unit': '',     # Ед. оплаты
          },
          'fact_price': {
            'price': 0,             # Цена факт без НДС
            'date':'',              # Цена факт, дата
            'document':'',          # Цена факт, документ
            'goods_code':'',        # Цена факт, код товара
            'summ_price': 0,        # Сумма факт без НДС
            'coef_si_div_iu': 0,    # коэффициенn
            'account_type': '',     # закупка / приход / прайс
            'invoice_unit': '',     # Ед. оплаты
          },
          'fact_volumes': {
            'inpay': 0,             # в оплате
            'payed': 0,             # оплачено
            'onstore': 0,           # на складе
            'onwork': 0,            # отгружено
            'notpayed': 0,          # требуется оплата
            'notonwork': 0,         # не отгружено
          },
          #---
          'note': '-',
          'status': '-',
        })

  result_materials =[]
  try:
    start = time.clock()
    print "Start get_report_data"
    data = planecalculationmodel.get_by({'code': specification_number}, None)
    if not data:
      raise Exception('Спецификация не найдена')
    print "Time get data  is: ", time.clock() - start
    start = time.clock()

    # get materials dictionary
    dataMaterials = {'{0}_{1}'.format(str(row.get('group_code','0')), str(row.get('code','0'))): row for row in materialsgroupmodel.get_all_materials()}

    # dictionary of categories and groups
    # groups = esudapi.get_simple_dir_tree(datamodel.SYSTEM_OBJECTS['MATERIALS_DIR_LYB'])
    groups = esudapi.get_simple_dir_tree_with_sectors()
    linear_groups = esudapi.makeLinearsGroupsWithParents(groups)

    print "Time get dictionaries is: ", time.clock() - start
    start = time.clock()

    document_number = ''
    if not data.get('document_type') or data['document_type'] == 'contract':
      document_number = '{0}.{1}'.format(data['order_number'], unit_number)
    elif data['document_type'] == 'order':
      document_number = data['order_number']
    else:
      document_number = routine.strToInt(data['code'])

    for m_row in data.get('materials',[]):
      key = '{0}_{1}'.format(str(m_row.get('materials_group_key','0')), str(m_row.get('materials_key','0')))
      # unique_props_info = m_row['unique_props_info']
      # получаем уникальные характеристики из справочника
      unique_props_info = None
      material_info = dataMaterials[key] if key in dataMaterials else None

      if m_row['unique_props_info']:
        for up in dataMaterials[key].get('unique_props',[]):
          if m_row['unique_props_info'].get('_id') and str(m_row['unique_props_info']['_id']) == str(up['_id']):
            unique_props_info = up
            break

      fact_volumes = {
        'inpay': 0,             # в оплате
        'payed': 0,             # оплачено
        'onstore': 0,           # на складе
        'onwork': 0,            # отгружено
        'notpayed': 0,          # требуется оплата
        'notonwork': 0,         # не отгружено
      }
      plan_price = {
        'price': 0,             # Цена за единицу план без НДС
        'date':'',              # Цена план, дата
        'document':'',          # Цена план, документ
        'goods_code':'',        # Цена план, код товара
        'summ_price': 0,        # Сумма план без НДС
        'coef_si_div_iu': 1,    # коэффициенn
        'account_type': '',     # закупка / приход / прайс
        'invoice_unit': '',     # Ед. оплаты
      }
      fact_price = {
        'price': 0,             # Цена факт без НДС
        'date':'',              # Цена факт, дата
        'document':'',          # Цена факт, документ
        'goods_code':'',        # Цена факт, код товара
        'summ_price': 0,        # Сумма факт без НДС
        'coef_si_div_iu': 1,    # коэффициенn
        'account_type': '',     # закупка / приход / прайс
        'invoice_unit': '',     # Ед. оплаты
      }

      if unique_props_info and unique_props_info.get('last_goods'):
        plan_price['coef_si_div_iu'] =unique_props_info['last_goods'].get('coef_si_div_iu', 1)
        plan_price['price'] =unique_props_info['last_goods'].get('price', 0) / (routine.strToFloat(plan_price['coef_si_div_iu']) or 1)
        plan_price['date'] = unique_props_info['last_goods'].get('date', '')
        plan_price['document'] = unique_props_info['last_goods'].get('account', '')
        plan_price['goods_code'] = unique_props_info['last_goods'].get('good_code_1c', '')
        plan_price['summ_price'] = plan_price['price'] * routine.strToFloat(m_row['pto_size'])
      elif material_info and material_info.get('last_goods'):
        plan_price['coef_si_div_iu'] =material_info['last_goods'].get('coef_si_div_iu', 1)
        plan_price['price'] =material_info['last_goods'].get('price', 0) / (routine.strToFloat(plan_price['coef_si_div_iu']) or 1)
        plan_price['date'] = material_info['last_goods'].get('date', '')
        plan_price['document'] = material_info['last_goods'].get('account', '')
        plan_price['goods_code'] = material_info['last_goods'].get('good_code_1c', '')
        plan_price['summ_price'] = plan_price['price'] * routine.strToFloat(m_row['pto_size'])

      if unit_number and m_row.get('facts') and m_row['facts'].get(unit_number):
        # fact volumes
        facts_obj = m_row['facts'][unit_number]
        fact_volumes['inpay'] = facts_obj.get('inpay',0)
        fact_volumes['payed'] = facts_obj.get('payed',0)
        fact_volumes['onstore'] = facts_obj.get('onstore',0)
        fact_volumes['onwork'] = facts_obj.get('onwork',0)
        fact_volumes['notonwork'] = routine.strToFloat(m_row['pto_size']) - fact_volumes['onwork']
        if (fact_volumes.get('onwork',0) + fact_volumes.get('onstore',0)) > fact_volumes.get('payed',0):
          fact_volumes['notpayed'] = routine.strToFloat(m_row['pto_size']) - (fact_volumes.get('onwork',0) + fact_volumes.get('onstore',0))
        else:
          fact_volumes['notpayed'] = routine.strToFloat(m_row['pto_size']) - fact_volumes.get('payed',0)

        # fact price
        fact_price['coef_si_div_iu'] = facts_obj.get('coef_si_div_iu', 1)
        fact_price['price'] = facts_obj.get('price', 0) / ( routine.strToFloat(fact_price['coef_si_div_iu']) or 1)
        fact_price['date'] = facts_obj.get('date', '')
        fact_price['document'] = facts_obj.get('account', '')
        fact_price['goods_code'] = facts_obj.get('good_code_1c', '')
        fact_price['summ_price'] = fact_price['price'] * routine.strToFloat(m_row['pto_size'])

        # fact_price['price'] = facts_obj.get('price', 0)
        # fact_price['summ_price'] = facts_obj.get('price', 0) * routine.strToFloat(m_row['pto_size'])

      # geat category and group details
      sector_info = linear_groups.get(m_row.get('sector_id'))
      category_info = linear_groups.get(m_row.get('category_id'))
      group_info = linear_groups.get(m_row.get('group_id'))
      material_full_key = '{0}.{1}'.format(
        m_row.get('materials_group_key',''),
        m_row.get('materials_key','')
      )
      # add unique props key to full code
      if unique_props_info:
        material_full_key += '.{0}'.format(unique_props_info['key'])

      # final object
      tmp={
        'document_number': document_number, # Заказ
        'material_key':m_row.get('materials_key'),
        'material_group_key': m_row.get('materials_group_key','') or '',
        'material_name': dataMaterials[key]['name'] if key in dataMaterials else 'Не известно',
        'sku_name': dataMaterials[key].get('sku_name','') if key in dataMaterials else '',
        'unit_purchase': dataMaterials[key].get('unit_purchase','') if key in dataMaterials else '',
        'unit_pto': dataMaterials[key].get('unit_pto','') if key in dataMaterials else '',
        'material_group_name': dataMaterials[key]['group_name'] if key in dataMaterials else 'Не известно',
        'unique_props_key': unique_props_info['key'] if unique_props_info else '',
        'unique_props_name': unique_props_info['name'] if unique_props_info else '',
        'unique_props_info': unique_props_info,
        'material_full_key': material_full_key,
        #---
        'sector_id': m_row.get('sector_id'),
        'sector_index': sector_info['index'] if sector_info else 0,
        'sector_name': sector_info['name'] if sector_info else 'Не задано',
        'category_id': m_row.get('category_id'),
        'category_index': category_info['index'] if category_info else 0,
        'category_name': category_info['name'] if category_info else 'Не задана',
        'group_id': m_row.get('group_id'),
        'group_index': group_info['index'] if group_info else 0,
        'group_name': group_info['name'] if group_info else '',
        #---
        'pto_size': routine.strToFloat(m_row['pto_size']),    # объем
        'plan_price': plan_price,
        'fact_price': fact_price,
        'fact_volumes': fact_volumes,
        #---
        'note': m_row.get('note',''),
        'status': m_row['status'],
      }
      result_materials.append(tmp)


    print "Time prepare data is: ", time.clock() - start
    start = time.clock()

    # check report data for all directions and merge data
    # with groups calculations (groups_calculation)
    groups_calculation_values = {}
    if data.get('groups_calculation'):
      groups_calculation_values = { row['_id']: row for row in data['groups_calculation'] }

    for row in result_materials:
      if row['group_id'] in linear_groups:
        if not linear_groups[row['group_id']].get('items'):
          linear_groups[row['group_id']]['items'] = []
        linear_groups[row['group_id']]['items'].append(row)

    # recalculate group volumes
    re_calculate_volumes(document_number, groups, groups_calculation_values, result_materials)

    # сортировка данных
    result_materials.sort(key=lambda x: (
      x.get('sector_index'),
      x.get('category_index'),
      x.get('group_index'),
      x.get('material_group_key'),
      x.get('material_key'),
    ))

    return result_materials

  except Exception, exc:
    print('Error!: get_report_data. Detail: {0}'.format(str(exc)))
    print_exc()
    raise Exception(str(exc))

def download_to_google(specification_code, unit_number, usr_email):
  '''
    Download specification data to google
  '''
  from models import planecalculationmodel
  from helpers.google_api import drive, spreadsheet
  from models import planecalculationmodel
  from apis.esud import esudapi

  try:
    # get specification info
    specification_info = planecalculationmodel.get_by({'code': routine.strToInt(specification_code)},
      {
        '_id':1,
        'code':1,
        'documents': 1,
        'document_type': 1,
        'order_number':1,
      }
    )

    if not specification_info:
      raise Exception('Спецификация не найдена.')

    if not unit_number:
      unit_number = '0'

    unit_number = str(unit_number)

    if not specification_info.get('documents'):
      specification_info['documents'] = {'reports': {unit_number: ''}}
    elif not specification_info['documents'].get('reports'):
      specification_info['documents']['reports'] = {unit_number: ''}
    elif not specification_info['documents']['reports'].get(unit_number):
      specification_info['documents']['reports'][unit_number] = ''

    report_document_id = specification_info['documents']['reports'][unit_number]

    # if document not exists then create it
    if not report_document_id:
      new_report_file_name = ''
      if specification_info.get('document_type') == 'template':
        new_report_file_name='Шаблон расчет ({0})'.format(str(routine.strToInt(specification_info['code'])))
      elif specification_info.get('document_type') == 'order':
        new_report_file_name='{0} расчет'.format(specification_info['order_number'])
      else:
        new_report_file_name='{0}.{1} расчет'.format(specification_info['order_number'], unit_number)

      # connect to google disc service
      service = drive.get_service(config.google_api_user)
      report_document_id = drive.copy_file(
        service,
        config.specification_report_template,
        new_report_file_name,
        config.specifications_folder
      )

      if not report_document_id:
        raise Exception('Не удалось создать отчет на гугл диске. Повторите попытку позже.')

      specification_info['documents']['reports'][unit_number] = report_document_id
      # update specification in DB
      planecalculationmodel.update(
        {'_id': specification_info['_id']},
        {'$set':{ 'documents': specification_info['documents'] }}
      )

    # get report data
    report_data = get_report_data(specification_info['code'], unit_number)

    # fill document-------------------------------------------------------------------------------
    spreadsheet_obj = spreadsheet.Spreadsheet(config.google_api_user, report_document_id)

    values = []
    for row in report_data:
      plan_price_date =''
      if row['plan_price']['date']:
        try:
          plan_price_date = row['plan_price']['date'].strftime('%d.%m.%Y %H:%M:%S')
        except:
          print('plan_price_date error {0}'.format(row['plan_price']['date']))
          plan_price_date = ''

      fact_price_date =''
      if row['fact_price']['date']:
        try:
          fact_price_date = row['fact_price']['date'].strftime('%d.%m.%Y %H:%M:%S')
        except:
          print('fact_price_date error {0}'.format(row['fact_price']['date']))
          fact_price_date = ''

      note = ''
      if not row['plan_price']['price']:
        note += 'Нет цены плановой; '
      if not row['plan_price']['coef_si_div_iu']:
        note += 'Нет коэффициента планового; '
      if not row['fact_price']['price']:
        note += 'Нет цены фактической; '
      if not row['fact_price']['coef_si_div_iu']:
        note += 'Нет коэффициента фактического; '

      values.append([
        row['document_number'],                 # Заказ
        '{0}. {1}'.format(routine.pad(row['sector_index'], 2), row['sector_name']) if row['sector_id'] else '-',  # Раздел
        '{0}. {1}'.format(routine.pad(row['category_index'], 2), row['category_name']) if row['category_name'] else '-',  # Категория
        '{0}. {1}'.format(routine.pad(row['group_index'], 2), row['group_name']) if row['group_name'] else '-',        # Группа
        row['material_group_name'],           # Группа товаров
        planecalculationmodel.decode_status(row['status']),                              # Статус
        str(row['material_full_key']),        # Артикул материала
        row['material_name'],                 # Материал
        row['unique_props_name'],             # Характеристика
        row['note'],                          # Примечание
        row['unit_pto'],                      # Ед. изм
        row['pto_size'],                      # Объём по спецификации
        row['fact_volumes']['inpay'],         # в оплате
        row['fact_volumes']['payed'],         # оплачено
        row['fact_volumes']['onstore'],       # на складе
        row['fact_volumes']['onwork'],        # отгружено
        row['fact_volumes']['notonwork'],     # не отгружено
        row['fact_volumes']['notpayed'],      # Требуется оплата
        row['plan_price']['price'],           # Цена план без НДС
        plan_price_date,
        row['plan_price']['document'],        # Цена план, документ
        row['plan_price']['goods_code'],      # Цена план, код товара
        row['plan_price']['summ_price'],      # Сумма план без НДС
        row['fact_price']['price'],           # Цена факт без НДС
        fact_price_date,
        row['fact_price']['document'],        # Цена факт, документ
        row['fact_price']['goods_code'],      # Цена факт, код товара
        row['fact_price']['summ_price'],      # Сумма факт без НДС
        note
      ])

    #spreadsheet_obj.prepare_setValues(u'data','A2:J%d' % (1000), [['','','','','','','','','',''] for i in xrange(997)])
    spreadsheet_obj.prepare_delete_all_rows_from(u'data', 2)
    spreadsheet_obj.prepare_add_rows(u'data', len(values))
    spreadsheet_obj.prepare_setValues(u'data','A2:AC%d' % (len(values)+1), values)
    spreadsheet_obj.runPrepared()
    #----------------------------------------------------------------------------------------------

    return report_document_id

  except Exception, exc:
    print('Error!: download_to_google. Detail: {0}'.format(str(exc)))
    print_exc()
    raise Exception(str(exc))

def get_actual_plan_norms(order_number):
  '''
    Получение плановых норм со статусом - Утверждено и Отклонено по номеру заказа.
    order_number - номер заказа
    Результат функции - список материалов с утвержденными объемами
  '''
  # локальная функция преобразования номера заказа из номера заказа 1С
  def prepare_order_number(val):
    return '{0}.{1}'.format(val.split('.')[0], val.split('.')[1])

  from models import planecalculationmodel, materialsgroupmodel, datamodel
  result =[]
  try:
    # приведение номера заказа к формату "номердоговора.номер продукции"
    order_number = prepare_order_number(order_number)
    # получение спика материалов
    arrDataMaterials = materialsgroupmodel.get_all_materials()
    dataMaterials = {}
    for row in arrDataMaterials:
      key = '{0}_{1}'.format(str(row.get('group_code','0')), str(row.get('code','0')))
      dataMaterials[key] = row
    # получение плановых норм по заказу
    plan_calculation_data = planecalculationmodel.get_list_by({'order_number': {'$in': [order_number]}, 'document_type': 'contract' })
    if len(plan_calculation_data)==0:
      raise Exception("По данному заказу нет плановых норм")
    # ищем выбранную уникальную характеристику
    for row in plan_calculation_data:
      for m_row in row.get('materials',[]):
        #если объем материала согласован и направление  - материалы
        #if (m_row.get('status') == '1' or m_row.get('status') == '2') and (not m_row.get('sector_id') or str(m_row.get('sector_id')) == str(datamodel.SYSTEM_OBJECTS['MATERIALS_DIR_LYB'])):
        if str(m_row.get('status')) in ['1','2']:
          cur_material = dataMaterials.get('{0}_{1}'.format(str(m_row['materials_group_key']), str(m_row['materials_key'])))
          tmp={
            'note':m_row.get('note',''),
            'material_id':m_row.get('materials_id'),
            'material_key':m_row.get('materials_key'),
            'material_group_id': m_row.get('materials_group_id'),
            'material_group_key': m_row.get('materials_group_key'),
            'material_name': cur_material['name'] if cur_material else 'Не известно',
            'material_group_name': cur_material['group_name'] if cur_material else 'Не известно',
            'sku_name': cur_material.get('sku_name','') if cur_material else '',
            'unit_purchase': cur_material.get('unit_purchase','') if cur_material else '',
            'unit_pto': cur_material.get('unit_pto','') if cur_material else '',
            'unique_props_key':m_row['unique_props_info']['key'] if m_row.get('unique_props_info') else '',
            'unique_props_name': m_row['unique_props_info']['name']  if m_row.get('unique_props_info') else '',
            'unique_props_id': m_row['unique_props_info'].get('_id') if m_row.get('unique_props_info') else '',
            'category_id': m_row.get('category_id'),
            'group_id': m_row.get('group_id'),
            'size': m_row['pto_size'],
            'status': m_row.get('status','')
            # 'sector_code': row.get('sector_code',''),
            # 'sector_name': row.get('sector_name',''),
            # 'sector_id': row.get('sector_id',''),
          }
          result.append(tmp)
    return result
  except Exception, exc:
    print('Error!: actual_plan_norms. Detail: {0}'.format(str(exc)))
    print_exc()
    raise Exception(str(exc))
