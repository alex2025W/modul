#!/usr/bin/python
# -*- coding: utf-8 -*-

import datetime
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
from models import contractmodel, workordermodel, paymentmodel, sectormodel
from helpers.google_api import calendar
from apis.workorder import workorderapi
from routine import JSONEncoder

def get_all_contract_numbers_for_filters(factory = None, is_signed = True):
  '''
    Получить номера всех активных договоров
    factory - название завода
  '''
  from models import contractmodel

  condition = {
    #'$or': [{'is_signed': 'yes' if is_signed else 'no'},{'timeline_visible':True}],
    '$and':[
      # only main contracts
      {'$or': [{'parent_id': {'$exists': False }},{'parent_id':None},{'parent_id': ''}]},
      # filter out old contracts
      {'$or': [{ 'status': { '$ne': 'completed' }}]},
      # not canceled
      {'$or': [{'is_canceled': {'$exists': False }},{'is_canceled':None},{'is_canceled': False}]},
    ]
  }

  if is_signed:
    condition['$or'] = [{'is_signed': 'yes'},{'timeline_visible':True}]

  if factory:
    condition['factory'] = factory

  result = [row['number'] for row in contractmodel.get_list_by(condition, {'number' : 1})]

  result.sort()
  return result

def get_all_orders_for_filters():
  '''
    Получить список номеров заказов по всем договорам для дальнейшего использования в филтрации
  '''
  result = []
  all_contracts = get_all_active_contracts(None, False)
  for contract_row in all_contracts:
    for product_row in contract_row.get('productions', []):
      #if product_row['number'] > 0:
      tmp_number = '{0}.{1}'.format(
        str(contract_row['number']),
        str(product_row['number'])
      )
      result.append(tmp_number)
        # for unit_row in product_row.get('units',[]):
        #   if unit_row['number'] > 0:
        #     tmp_number = '{0}.{1}.{2}'.format(
        #       str(contract_row['number']),
        #       str(product_row['number']),
        #       str(unit_row['number'])
        #     )
        #     result.append(tmp_number)
  result.sort()
  return result

def get_all_orders_with_units_for_filters():
  '''
    Получить список номеров заказов по всем договорам для дальнейшего использования в филтрации
  '''
  result = []
  all_contracts = get_all_active_contracts(None, False)
  for contract_row in all_contracts:
    for product_row in contract_row.get('productions', []):
      if product_row['number'] > 0:
        for unit_row in product_row.get('units',[]):
          if unit_row['number'] > 0:
            tmp_number = '{0}.{1}.{2}'.format(
              str(contract_row['number']),
              str(product_row['number']),
              str(unit_row['number'])
            )
            result.append(tmp_number)
  result.sort()
  return result

def get_all_active_contracts(factory=None, is_signed = True):
  '''
    Получить список не всех активных договоров, включая их допники
    factory - фабрика по которой необходима выгрузка, по умолчанию для всех
  '''
  contracts = []
  dop_agreements_grouped_by_contract = {}

  # получить основные договоры
  condition = {
    #'$or': [{'is_signed': 'yes'},{'timeline_visible':True}],
    '$and':[
      # only main contracts
      {'$or': [{'parent_id': {'$exists': False }},{'parent_id':None},{'parent_id': ''}]},
      # filter out old contracts
      {'$or': [{ 'status': { '$ne': 'completed' }}]},
      # not canceled
      {'$or': [{'is_canceled': {'$exists': False }},{'is_canceled':None},{'is_canceled': False}]},
    ]
  }
  if is_signed:
    condition['$or'] = {'is_signed': 'yes'},{'timeline_visible':True},
  if factory:
    condition['factory'] = factory

  for row in contractmodel.get_list_by(condition,
    {
      '_id': 1,
      'number': 1,
      'client_name': 1,
      'sign_date': 1,
      'productions': 1,
      'payment_uses': 1,
      'parent_id': 1
    }):
    contracts.append(row)

  # получить доп. соглашения
  condition = {
    '$or': [{'is_signed': 'yes'},{'timeline_visible':True}],
    '$and':[
      {'$and': [{'parent_id': {'$exists': True }},{'parent_id': {'$ne':None}},{'parent_id': {'$ne':''}}]},
      # filter out old contracts
      {'$or': [{ 'status': { '$ne': 'completed' }}]}
    ]
  }
  if factory:
    condition['factory'] = factory
  for row in contractmodel.get_list_by(condition,
    {
      '_id': 1,
      'number': 1,
      'client_name': 1,
      'sign_date': 1,
      'productions': 1,
      'payment_uses': 1,
      'parent_id':1
    }):

    if str(row['parent_id']) not in dop_agreements_grouped_by_contract:
      dop_agreements_grouped_by_contract[str(row['parent_id'])] = []
    dop_agreements_grouped_by_contract[str(row['parent_id'])].append(row)

  # смержить договора с доп. соглашениями
  for contract in contracts:
    if str(contract['_id']) in dop_agreements_grouped_by_contract:
      if not contract.get('productions'):
        contract['productions'] = []
      for dop_contract in dop_agreements_grouped_by_contract[str(contract['_id'])]:
        for product in dop_contract.get('productions'):
          contract['productions'].append(product)

  return contracts

def get_contract_with_dop_productions(contract_number):
  '''
    Получение информации о договоре с мержингом продукции из допников
  '''
  contract = contractmodel.get_by({'number':contract_number, '$or': [{'parent_id': {'$exists': False }},{'parent_id':None},{'parent_id': ''}]});
  if not contract.get('productions'):
    contract['productions'] = []
  # проверяем нет ли доп. соглашений по данному договору
  dop_contracts = contractmodel.get_list_by({'parent_id':contract['_id']});
  if dop_contracts is not None or dop_contracts.count()>0:
    for dop_contract in dop_contracts:
      for product in dop_contract.get('productions'):
        contract['productions'].append(product)

def contract_has_production(contract_number, product_number, unit_number):
  '''
    Получение информации о договоре с мержингом продукции из допников
  '''
  contract = contractmodel.get_by({'number':contract_number, '$or': [{'parent_id': {'$exists': False }},{'parent_id':None},{'parent_id': ''}]});
  if contract:
    for product in contract.get('productions',[]):
      if product['number'] == product_number:
        for unit in product.get('units',[]):
          if unit['number'] == unit_number:
            return True
    dop_contracts = contractmodel.get_list_by({'parent_id':contract['_id']});
    if dop_contracts is not None or dop_contracts.count()>0:
      for dop_contract in dop_contracts:
        for product in dop_contract.get('productions'):
          if product['number'] == product_number:
            for unit in product.get('units',[]):
              if unit['number'] == unit_number:
                return True
  return False

def remove_not_signed_contract_document(contract_id, user_email):
  '''
    Удаление неподписанного документа-договора из документов договора
    contract_id - id договора
    user_email - email пользователя
  '''
  from models import contractmodel
  contract_info = contractmodel.get_by({'_id': contract_id}, {'documents':1, 'number':1, '_id':1})
  if (contract_info.get('documents',{}) or {}).get('items',[]):
    for row in contract_info['documents']['items']:
      if row.get('type') == 'not_signed_contract':
        remove_document(contract_id, user_email, str(row['_id']))
        break

def remove_signed_contract_document(contract_id, user_email):
  '''
    Удаление подписанного документа-договора из документов договора
    contract_id - id договора
    user_email - email пользователя
  '''
  from models import contractmodel
  contract_info = contractmodel.get_by({'_id': contract_id}, {'documents':1, 'number':1, '_id':1})
  if (contract_info.get('documents',{}) or {}).get('items',[]):
    for row in contract_info['documents']['items']:
      if row.get('type') == 'signed_contract':
        remove_document(contract_id, user_email, str(row['_id']))
        break

def remove_document(contract_id, user_email, document_id):
  '''
    Удаление документа из договора
    contract_id - id договора
    user_email - email пользователя
    document_id - id удаляемого документа
  '''
  try:
    from models import contractmodel
    from helpers.google_api import drive
    row_document_to_remove = None

    contract_info = contractmodel.get_by({'_id': contract_id}, {'documents':1, 'number':1, '_id':1, 'user_email':1})
    if (contract_info.get('documents',{}) or {}).get('items',[]):
      new_items = []
      for row in contract_info['documents']['items']:
        if str(row['_id']) != str(document_id):
          new_items.append(row)
        else:
          contract_info['documents']['history'].append({
            'date': datetime.datetime.utcnow(),
            'user': user_email,
            'type': 'remove',
            'data': row
          })
          row_document_to_remove = row
      contract_info['documents']['items'] = new_items
      cond = {'_id': contract_id}
      # Добавление элемента в историю
      data = {"$set":{"documents":contract_info['documents']}}
      contractmodel.update(cond, data, True)

      # удаление документа с google диска
      if row_document_to_remove and row_document_to_remove.get('google_file_id'):
        drive.delete_file(drive.get_service(row_document_to_remove['user']), row_document_to_remove['google_file_id'])
        #drive.delete_file(drive.get_service(config.gogle_folder_creator), row_document_to_remove['google_file_id'])

  except Exception, exc:
    excType = exc.__class__.__name__
    print('------ERROR  remove contract document')
    print_exc()
    raise Exception(str(exc))


def add_new_document(contract_id, document_name, document_size, google_file_id, user_email, document_type):
  '''
    Добавление документа в договор.
    contract_id: ObjectId()
    document_name - название документа
    document_size - размер документа
    google_file_id - ID документа в GOOGLE
    user_email - пользователь, инициатор операции
  '''
  try:
    from models import contractmodel
    new_document_row = {
      '_id': ObjectId(),
      'date': datetime.datetime.utcnow(),
      'user': user_email,
      'google_file_id': google_file_id,
      'name': document_name,
      'size': document_size,
      'type': document_type
    }

    cond = {'_id': contract_id}
    # Добавление нового документа в БД
    data = {"$push":{"documents.items": new_document_row}}
    contractmodel.update(cond, data, True)

    # Добавление элемента в историю
    data = {"$push":{"documents.history": {
      'date': datetime.datetime.utcnow(),
      'user': user_email,
      'type': 'add',
      'data': new_document_row
    }}}
    contractmodel.update(cond, data, True)
    return new_document_row

  except Exception, exc:
    excType = exc.__class__.__name__
    print('------ERROR  add contract document')
    print_exc()
    raise Exception(str(exc))
  return None

def create_or_update_google_folder_catalogs(_id):
  '''
  Создание структуры дирректорий на гугл диске для хранения документов договора
  Структура дирректорий создается внутри дирректории гугл заявки, по которой создан договор
  _id  - идентификатор договора
  Создание документов работает только для основного договора
  Для доп. соглашений Google фолдер берется из основного договора
  '''
  from models import contractmodel, ordermodel
  from helpers.google_api import drive
  try:
    # информация о договоре
    contract_info = contractmodel.get_by({'_id':_id}, {'documents': 1, 'orders':1, 'number':1, 'user_email': 1, 'parent_id': 1})

    # список id фолдеров на гугл диске у заявок
    order_google_folders_ids = []
    # получаем информацию о всех, заявках привязанных к текущему договору
    orders_data = ordermodel.get_list({'_id': {'$in': [x['_id'] for x in contract_info['orders']] }}, { 'documents':1, 'number':1})
    # подключение сервиса для работы с гугл диском
    service = drive.get_service(config.google_api_user)
    # текущая информация о документах договора
    new_documents = contract_info.get('documents')
    # проходим по всем заявкам, смотрим у кого уже есть folder_id
    order_google_folders_ids = [{'order_folder_id':x['documents']['folder_id'], 'number': x['number']} for x in orders_data  if x.get('documents') and x['documents'].get('folder_id')]

    # если это основной договор
    if not contract_info.get('parent_id'):
      if len(order_google_folders_ids)<1:
        raise Exception(u"Ни одна из заявок, связанная с текущим договором, не содержит каталога документов.")

      # если каталог документов для договора еще не создавался, то подготавливаем для него структуру данных
      if not new_documents or not new_documents.get('google_folder_id'):
        new_documents = {
          'items': [],
          'history': [],
          'google_folder_id': None,
          'google_ready_folder_id': None
        }
        # выделяем основную заявку и для нее добавляем физически каталог договора
        order_google_folder_id = order_google_folders_ids[0]
        # проверяем, есть ли каталог - "Договоры" в папке документов заявки
        tmp_folders = drive.get_folder_by_name(service, order_google_folder_id['order_folder_id'], u"Договоры")
        # ID каталога - Договоры в каталоге документов заявки
        dogovori_folder_id = None
        if tmp_folders is not None and len(tmp_folders)>0:
          dogovori_folder_id = tmp_folders[0]['id']
        else:
          dogovori_folder_id = drive.insert_folder(service, u"Договоры", "", order_google_folder_id['order_folder_id'])
        if not dogovori_folder_id:
          raise Exception(u"Ошибка создания дирректории - Договоры, в каталоге заявки №{0}.".format(str(order_google_folder_id['number'])))

        # проверяем, есть ли каталог с номером договора в дирректории - "Договоры"
        tmp_folders = drive.get_folder_by_name(service, dogovori_folder_id, str(contract_info['number']))
        contract_folder_id = None
        if tmp_folders is not None and len(tmp_folders)>0:
          contract_folder_id = tmp_folders[0]['id']
        else:
          # в дирректорию с номером договора кладем структуру каталогов, определенную в шаблоне
          new_created_ids = drive.copy_folder(service, config.contracts_google_folder_id, str(contract_info['number']), dogovori_folder_id)
          contract_folder_id = new_created_ids[0]['dest_id']
          #contract_folder_id = drive.insert_folder(service, str(contract_info['number']), "", dogovori_folder_id)
        if not contract_folder_id:
          raise Exception(u"Ошибка создания дирректории с номером договора, в каталоге заявки.")

        # расшариваем фолдер создателю договора
        drive.share_folder(service,  contract_folder_id, [{'email': contract_info['user_email']}])

        # находим в созданной структуре каталогов дирректорию - "Готовые"
        tmp_folders = drive.get_folder_by_name(service, contract_folder_id, u"Готовые")
        destination_folder_id = None
        if tmp_folders is not None and len(tmp_folders)>0:
          destination_folder_id = tmp_folders[0]['id']
        if not destination_folder_id:
          raise Exception(u"Ошибка создания структуры каталогов для хранения документов договора.")

        # расшариваем фолдер создателю договора
        drive.share_folder(service,  destination_folder_id, [{'email': contract_info['user_email']}])
        new_documents['google_folder_id'] = contract_folder_id
        new_documents['google_ready_folder_id'] = destination_folder_id
        # обновление данных
        contractmodel.update({'_id':_id},{'$set':{'documents':new_documents}}, False, True)

        # # upload файла на gogle диск
        # media = MediaInMemoryUpload(fieldStorage.file.read())
        # new_file= drive.upload_file(config.gogle_folder_creator, destination_folder_id, fieldStorage.filename, media, fieldStorage.type)
        # if not new_file:
        #   raise Exception("Не удалось сохранить документ в каталог договора.")
        #----------------------
      else:
        contract_folder_id = new_documents['google_folder_id']
    else:
      # если это доп. соглашение, то смотрим google_folder у основного договора
      own_contract_info = contractmodel.get_by({'_id': contract_info.get('parent_id')}, {'documents': 1, 'orders':1, 'number':1, 'user_email': 1})
      if not new_documents or not new_documents.get('google_folder_id'):
        if not own_contract_info.get('documents') or not (own_contract_info.get('documents',{}) or {}).get('google_folder_id'):
          raise Exception(u"Ошибка получения каталога документов. Для ОД не задан каталог документов.")
        else:
          new_documents = {
            'items': [],
            'history': [],
            'google_folder_id': own_contract_info.get('documents').get('google_folder_id'),
            'google_ready_folder_id': own_contract_info.get('documents').get('google_ready_folder_id'),
          }
        contract_folder_id = new_documents['google_folder_id']
        contractmodel.update({'_id':contract_info.get('_id')},{'$set':{'documents':new_documents}}, False, True)
      else:
        contract_folder_id = new_documents['google_folder_id']


    # ---------------------------
    # для всех заявок, связанных с текщим договором, создаем каталог - "Договоры" на гугл диске, если таких еще нет
    # также
    #----------------------------
    if contract_folder_id:
      spaces = []
      for row in order_google_folders_ids:
        # проверяем, есть ли каталог - "Договоры" в папке документов заявки
        tmp_folders = drive.get_folder_by_name(service, row['order_folder_id'], u"Договоры")
        # ID каталога - Договоры в каталоге документов заявки
        dogovori_folder_id = None
        if tmp_folders is not None and len(tmp_folders)>0:
          dogovori_folder_id = tmp_folders[0]['id']
        else:
          dogovori_folder_id = drive.insert_folder(service, u"Договоры", "", row['order_folder_id'])
        if not dogovori_folder_id:
          print(u"Ошибка создания дирректории - Договоры, в каталоге заявки №{0}.".format(str(row['number'])))
        else:
          spaces.append({'id': dogovori_folder_id})
      # обновление списка расположений каталога документов договора на гугл диске
      drive.update_folder_spaces(service, contract_folder_id, spaces)


    return new_documents
  except Exception, exc:
    excType = exc.__class__.__name__
    print('------ERROR  create contract google folders.')
    print_exc()
    raise Exception(str(exc))
  return None

def add_google_group(order_number, client_name):
  '''
    Добавление гугл группы
  '''
  from helpers.google_api import groups
  from models import usermodel
  from helpers import mailer
  try:
    # параметры новой группы
    new_group_key = str(order_number) + '@modul.org'
    new_group_name = client_name
    print('-----------')
    print('Start create new google group: {0}'.format(new_group_key))
    # объект для работы с группами
    google_groups_obj = groups.google_groups(config.google_groups_user_admin)

    # добавление новой группы

    new_group = None
    try:
      new_group = google_groups_obj.get_group(new_group_key)
    except:
      print('Error. Get info for group: '+group_key)
      print_exc()
      pass

    if not new_group:
      new_group = google_groups_obj.add_group(new_group_key, new_group_name)

    # изменение настроек группы
    print('Set group settings')
    google_groups_settings_obj = groups.google_groups_settings(config.google_groups_user_admin)
    google_groups_settings_obj.update(new_group_key, {'isArchived': 'true'})
    # добавление текущего пользователя в качестве участника группы
    try:
      print('Add group owner')
      google_groups_obj.insert_group_member(new_group_key, config.google_groups_user_admin, 'OWNER')
    except:
      print('Error add member to goole group: {0}; {1}'.format(new_group_key, config.google_groups_user_admin))

    # добавление пользователей на группу с шаблонной группы
    result_members = [] # пользователи которые стали участниками новой группы
    print('Set template members')
    old_members = google_groups_obj.get_members(config.google_groups_template)
    for member in old_members:
      result_members.append({'email':member['email'], 'fio':''})
      try:
        google_groups_obj.insert_group_member(new_group_key, member['email'], member['role'])
      except:
        print_exc()
        print('Error add member to goole group: {0}; {1}'.format(new_group_key, member['email']))

    print('Save info about group to contract')
    # фиксируем в договоре, что для договора создана гугл группа
    contractmodel.update({'number': routine.strToInt(order_number)},{'$set':{'google_group':{
      'key': '{0}@modul.org'.format(str(order_number)),
      'date': datetime.datetime.utcnow()
    }}}, False, True)

    # Формирование письма для оповещения пользователей группы
    # получение информации о заказе
    contract = contractmodel.get_by({'number': routine.strToInt(order_number)})
    if not contract:
      raise Exception(u'Договор: {0} не найден.'.format(str(order_number)))

    # сбор информации  об участниках
    all_users = {}
    for row in usermodel.get_all():
      all_users[row['email']] = row.get('fio', u'Не задан')
    for row in result_members:
      if row['email'] in all_users:
        row['fio'] = all_users[row['email']]
    try:
      print('Prepare letter for group')
      letter_info = prepare_google_group_letter(contract, result_members)
      print('Send letter')
      mailer.send(letter_info['header'], letter_info['body'], [{'email': new_group_key, 'fio': ''}], True, None)
    except:
      print('Error. Cant prepare_google_group_letter.')
      pass

    print('Operation complete')

  except Exception, exc:
    excType = exc.__class__.__name__
    print('------ERROR add_google_group')
    print_exc()

def get_parent_productions(parent_id, cur_number):
  from models import contractmodel
  additional = contractmodel.get_list_by({'$or':[{'_id':parent_id},{'parent_id':parent_id, 'number' :{'$lt':cur_number}}]},{'productions':1})
  parent_productions = []
  for a in additional:
    for p in a['productions']:
      parent_productions.append(p)
  return parent_productions

def get_filter_by_num(num):
  if num == '0':
    return {'$gt':0, '$lt': 500}
  elif num == '1':
    return { '$gte': 500, '$lt': 1000000 }
  elif num == '2':
    return { '$gte': 1000000, '$lt': 10000000 }
  elif num == '3':
    return { '$gte': 10000000}

def convertDt(dt_str):
  dt_str = dt_str[:19]
  return datetime.datetime.strptime(dt_str,'%Y-%m-%dT%H:%M:%S')

def fill_Arr(arr, fields, typet='id'):
  for k in arr:
    if isinstance(k,list):
      fill_Arr(k, fields,typet)
    if isinstance(k,dict):
      fill_Obj(k,fields,typet)

def fill_Obj(model, fields, typet='id'):
  '''for k in dir(model):'''
  for k in model.keys():
    if k in fields and isinstance(model[k],unicode):
      if typet=='id':
        model[k] = ObjectId(model[k]) if model[k] else model[k]
      else:
        model[k] = convertDt(str(model[k])) if model[k] else None
    if isinstance(model[k],list):
      fill_Arr(model[k], fields,typet)
    if isinstance(model[k],dict):
      fill_Obj(model[k],fields,typet)

def reset_orders(contract):
  from models import ordermodel
  # ордеры обновляются только для основных договоров. допы не обновляются
  if not contract.get('parent_id'):
    ordermodel.update_by({'contracts.contract_id':ObjectId(contract['_id'])},{'$pull':{'contracts':{'contract_id':contract['_id']}}},False,True)
    for o in contract.get('orders',[]):
      ordermodel.update_by({'_id':ObjectId(o.get('_id'))},{'$push':{'contracts':{'contract_id':contract['_id'], 'number':contract['number'],'sign_date':contract['sign_date'],'is_signed':contract['is_signed'],'deadline':contract['deadline'],'factory_id':contract['factory_id'], 'factory':contract['factory']}}})
    #if contract.get('order_id'):
    # ordermodel.update_by({'_id':ObjectId(contract.get('order_id'))},{'$push':{'contracts':{'contract_id':contract['_id'], 'number':contract['number'],'sign_date':contract['sign_date'],'is_signed':contract['is_signed'],'deadline':contract['deadline'],'factory_id':contract['factory_id'], 'factory':contract['factory']}}})

'''
  Назначение планового платежа (делается из нарядов)
  {
    "contract_id": ObjectId, ID договора
    "payment_id": ObjectId, // ID платежа
    "start_date": DateTime, // дата начала
    "finish_date": DateTime, // дата окончания
    "note": String, // пометка к изменению
  }
'''
'''def set_plan_payment(data):
  contract = contractmodel.get(data.get('contract_id'))
  if not contract:
    return False
  is_find = False
  for p in contract:
    if str(p['_id'])==str(data.get('payment_id')):
      is_find = True
      p['period'] = 'by_period'
      p['date'] = data.get('start_date')
      p['date_end'] = data.get('finish_date')
      if data.get('note'):
        p['note'] = data.get('note')
      break
  if is_find:
    contractmodel.update({'_id':contract['_id']}, contract)
  return is_find'''


'''
  Обновить список плановых платежей
'''
def update_plan_payments(work_pays, user_email):
  # разбираем данные по договорам
  contracts = {}
  for wp in work_pays:
    if not contracts.get(str(wp.get('contract_id',''))):
      contracts[str(wp.get('contract_id'))] = []
    contracts[str(wp.get('contract_id'))].append(wp)

  # обновляем договора поочередно
  for c in contracts:
    contract = contractmodel.get(ObjectId(c))
    works = contracts[c]
    if contract:
      is_find = False
      for pay in contract.get('payments',[]):
        for work in works:
          if str(work.get('payment_id'))==str(pay.get('_id')):
            is_find = True
            pay['period'] = 'by_period'
            pay['date'] =  work.get('date_start_with_shift',work.get('date_start'))
            pay['date_end'] = work.get('date_finish_with_shift',work.get('date_finish'))
            pay['date_change'] = datetime.datetime.utcnow()
            pay['contract_plan_depends_on'] = work.get('contract_plan_depends_on')
            pay['depends_on'] = work.get('depends_on')
      if is_find:
        calculate_finance(contract)
        contractmodel.update({'_id':contract['_id']}, contract)
        create_plan_pays(contract['_id'], user_email)

'''
  Добавить фактический платежи
  параметр- список с данными:
    'contract_id': id договора
    'payment_id':id платежа,
    'date_start_with_shift': дата платежа со смещением,
    'date_finish_with_shift':дата платежа со смещением,
    'date_start': дата платежа без смещения,
    'date_finish': дата платежа без смещения,
    'fact_work': список фактических работ
'''
def add_fact_payments(payments, user_email):
  #print 'add-fact-payments'
  tmp_pays = {}
  for p in payments:
    if not tmp_pays.get(str(p.get('contract_id'))):
      tmp_pays[str(p.get('contract_id'))] = []
    tmp_pays[str(p.get('contract_id'))].append(p)

  #добавляются допники
  tmp_pays_additional = copy(tmp_pays)
  for cid in tmp_pays:
    additional = contractmodel.get_list_by({'parent_id': ObjectId(cid)},{'_id':1})
    for ad in additional:
      if not tmp_pays_additional.get(str(ad.get('_id'))):
        tmp_pays_additional[str(ad.get('_id'))] = []
      for el in tmp_pays[cid]:
        tmp_pays_additional[str(ad.get('_id'))].append(el)
  tmp_pays = tmp_pays_additional

  for cid in tmp_pays:
    contract = contractmodel.get(ObjectId(cid))
    is_fact_update = False
    is_plan_update = False
    fact_update_list = []
    if contract:
      contract_pays = tmp_pays[cid]
      for pay in contract.get('payments'):
        for cp in contract_pays:
          if str(pay['_id'])==str(cp['payment_id']):
            is_fact_update = True
            # добавляю факты
            if 'events' not in pay:
              pay['events']=[]
            for fact in cp['fact_work']:
              event = {
                "comments" : [],
                "date_start" : fact['date'],
                "size" : fact['scope'],
                "type" : "fact_payment",
                "user_email" : user_email,
                "date_change" : datetime.datetime.utcnow(),
                "fact_work_id": fact.get("_id"),
                "_id" : ObjectId()
              }
              fact_update_list.append({'contract_id':contract['_id'], 'payment_id':pay['_id'],'event_id':event['_id']})
              pay['events'].append(event)
            # проверяем, не изменились ли даты плановых платежей
            if cp.get('date_start_with_shift') and str(pay['date'])!=str(cp.get('date_start_with_shift')):
              is_plan_update = True
              pay['date'] = cp.get('date_start_with_shift')
            if cp.get('date_finish_with_shift') and str(pay['date_end'])!=str(cp.get('date_finish_with_shift')):
              is_plan_update = True
              pay['date_end'] = cp.get('date_finish_with_shift')
            break
    if is_fact_update or is_plan_update:
      calculate_finance(contract)
      contractmodel.update({'_id':contract['_id']}, contract)
      if is_plan_update:
        create_plan_pays(contract['_id'], user_email)
      if is_fact_update:
        for e in fact_update_list:
          update_fact_calendar_event(e['contract_id'], e['payment_id'], e['event_id'], user_email)


def add_workorder(contract, payment, user_email, is_test = False):
  # находим unit, для которого будет созданя наряд
  contract_id = contract.get('_id');
  contract_number = contract.get('number')
  parent_contract = None
  additional_id = None
  if contract.get('parent_id'):
    additional_id=contract_id
    parent_contract = contractmodel.get_by({'_id': contract['parent_id']})
    contract_id = parent_contract['_id']
    contract_number = parent_contract['number']

  production_id = None
  unit_id = None
  # по определенной продукции и (товар или услуга)
  if payment.get('by_production') or payment.get('by_service'):# and (payment.get('payment_use',{}).get('code')==1 or payment.get('payment_use',{}).get('code')==3):
    # проверка продукций
    prod_list = []
    unit_list = []
    for u in payment.get('units',[]):
      if str(u.get('production_id')) not in prod_list:
        prod_list.append(str(u.get('production_id')))
      if str(u.get('unit_id')) not in unit_list:
        unit_list.append(str(u.get('unit_id')))

    if len(prod_list)==1:
      production_id = prod_list[0]
    if len(unit_list)==1:
      unit_id=unit_list[0]

  production = None
  unit = None
  # если задан production_id, то ищем его в спике продукций договора
  if production_id:
    for p in contract.get('productions',[]):
      if str(p.get('_id'))==production_id:
        production = p
        break
    if production and unit_id:
      for u in production.get('units'):
        if str(u.get('_id'))==unit_id:
          unit = u
          break
  if not production:
    # выставляем нуливую продукцию
    contr_prod = contract if not parent_contract else parent_contract
    for p in contr_prod.get('productions',[]):
      if p.get('number')==0:
        production = p
        break
  if not production:
    print 'production not found'
    return None

  if not unit:
    # выставляем нуливую единицу продукции
    for u in production.get('units',[]):
      if u['number']==0:
        unit = u
        break

  if not unit:
    print 'unit not found'
    return None

  # получить список payment_type
  paymentmodel.get_type_list()

  work_id = None
  sector_id =None
  # получить список payment_type
  pay_types = paymentmodel.get_type_list()
  for pt in pay_types:
    if str(pt.get('_id'))==str(payment.get('payment_type',{}).get('_id')):
      work_id = pt.get('work_id')
      sector_id = pt.get('sector_id')
      break

  if not work_id or not sector_id:
    print 'work_id or sector_id not found'
    return None

  sector = sectormodel.get(sector_id)
  if not sector:
    print 'sector not found'
    return None

  work_code = None
  for w in sector.get('works',[]):
    if w['_id']==work_id:
      work_code = w['code']
      break

  if work_code==None:
    print 'workcode not found'
    return None

  work_tp_id = ObjectId()

  # найти подобный наряд
  workorders_list = workordermodel.get_list_by({'contract_id':contract_id, 'additional_id':additional_id, "production_id":production['_id'], 'production_units.unit_id':unit['_id'],'sector_id':sector['_id'], 'plan_work.payment_data.payment_use_code':payment.get('payment_use',{}).get('code',0)})
  #workorder = workordermodel.get_by({'contract_id':contract_id, 'additional_id':additional_id, "production_id":production['_id'], 'production_units.unit_id':unit['_id'],'sector_id':sector['_id'], 'plan_work.payment_data.payment_use_code':payment.get('payment_use',{}).get('code',0)})
  is_find = False
  for workorder in workorders_list:
    is_same_found = False
    for pw in workorder.get('plan_work'):
      if pw.get('work_id')==work_id:
        is_same_found = True
    if not is_same_found:
      is_find = True
      workorder.get('plan_work').append({
        '_id':work_tp_id,
        "user_email" : user_email,
        "scope" : payment.get('size'),
        "work_id" : work_id,
        "date_change" : datetime.datetime.utcnow(),
        "code" : work_code,
        "date_finish" : None,
        "date_start" : None,
        "fact_work" : [],
        "completed" : False,
        "status" : "",
        "status_log" : [ ],
        "date_start_with_shift" : None,
        "date_finish_with_shift" : None,
        "last_fact_date" : None,
        'payment_id':payment.get('_id'),
        "payment_data":{
          'payment_use_code':payment.get('payment_use',{}).get('code',0),
          'payment_use_name':payment.get('payment_use',{}).get('name',""),
          'contract_id':contract['_id'],
          'contract_number':contract['number'],
          'payment_type_id':payment.get('payment_type',{}).get('_id')
          }
        })
      if not is_test:
        workordermodel.update({'_id':workorder['_id']},workorder,False)

        #---------------------------------------------------------------------------------------------------------------------------------------------------------
        # закрыть весь наряд, если все работы в нем завершены
        if not config.use_worker:
          workorderapi.close_workorder_if_all_works_completed([workorder['_id']], user_email)
        else:
          config.qu_default.enqueue_call(func=workorderapi.close_workorder_if_all_works_completed, args=([workorder['_id']], user_email))
        #----------------------------------------------------------------------------------------------------------------------------------------------------------
      break

  if not is_find:
    workorder = { "sector_code" : sector.get('code'), "plan_work" : [
        {
        '_id':work_tp_id,
        "user_email" : user_email,
        "scope" : payment.get('size'),
        "work_id" : work_id,
        "date_change" : datetime.datetime.utcnow(),
        "code" : work_code,
        "date_finish" : None,
        "date_start" : None,
        "fact_work" : [],
        "completed" : False,
        "status" : "",
        "status_log" : [ ],
        "date_start_with_shift" : None,
        "date_finish_with_shift" : None,
        "last_fact_date" : None,
        "payment_id":payment.get('_id'),
        "payment_data":{
            'payment_use_code':payment.get('payment_use',{}).get('code',0),
            'payment_use_name':payment.get('payment_use',{}).get('name',""),
            'contract_id':contract['_id'],
            'contract_number':contract['number'],
            'payment_type_id':payment.get('payment_type',{}).get('_id')
          }
        }
      ],
      "production_id" : production['_id'],
      "date_finish" : None,
      "production_number" : production['number'],
      "blanks" : [
      ],
      "contract_id" : contract_id,
      'additional_id':additional_id,
      "user_email" : user_email,
      "production_name" : production['name'],
      "production_units" : [
        {
          "user_email" : user_email,
          "unit_number" : unit['number'],
          "production_number" : production['number'],
          "production_id" : production['_id'],
          "date_change" : datetime.datetime.utcnow(),
          "unit_id" : unit['_id']
        }
      ],
      "contract_number" : contract_number,
      "note" : "",
      "sector_id" : sector['_id'],
      "date_change" : datetime.datetime.utcnow(),
      "date_start" : datetime.datetime.utcnow(),
      "number" : countersmodel.get_next_sequence('workorders') if not is_test else 0,
      "date_start_with_shift" : None,
      "date_finish_with_shift" : None,
      "status" : '',
      "status_date" : None,
      'auto_ktu':True,
      'history':[
        { 'date': datetime.datetime.utcnow(),
          'user': user_email,
          'type': 'create'
        }
      ]
    }
    if not is_test:
      workordermodel.add(workorder)


  #return None
  if is_test:
    return True
  else:
    return {'_id':workorder['_id'], 'work_id':work_tp_id, 'number': workorder['number']}


''' изменить стоимость наряда для платежа'''
def update_workorder(contract, payment, user_email):
  workord = workordermodel.get_by({'_id':payment.get('work_order_id')})
  if not workord:
    return False

  if payment.get('is_canceled', False):
    workorderapi.close_job_by_payment(payment.get('_id'), user_email)
    return True
  else:
  #print workord
    for w in workord.get('plan_work',[]):
      if w['_id']==payment.get('work_id'):
        w['scope']=payment.get('size')
        workordermodel.update_all(workord['_id'], workord)
        return True

  return False

def create_plan_pays(contract_id, user_email):
  contract = contractmodel.get_by({'_id':ObjectId(contract_id)})
  if contract.get('is_signed')!='yes':
    return
  parent_contract = None
  if contract['parent_id']:
    parent_contract = contractmodel.get_by({'_id':contract['parent_id']})
  for p in contract['payments']:
    if p['period'] and p['date']:
      try:
        if len(p['events'])==0:

          event = make_plan_pay_calendar_event(contract,parent_contract,p)
          day_event = deepcopy(event)
          calendarplan = config.plan_kaluga_calendar if event['location']=='Калуга' else config.plan_penza_calendar
          day_calendar = config.plan_day_kaluga_calendar if event['location']=='Калуга' else config.plan_day_penza_calendar

          if 'is_canceled' in p and p['is_canceled']:
            delete_calendar_event(user_email,p['_id'],calendarplan)
            delete_calendar_event(user_email,p['_id'],day_calendar)
          else:
            event['reminders'] = {
              "useDefault": False,
              "overrides": [
                {
                  "method": "email",
                  "minutes": 1440
                },
                {
                  "method": "email",
                  "minutes": 1
                }
              ]
            }

            # расчет оповещений в середине платежа
            st_date = p['date']
            ed_date = p['date']

            if p['period']=='by_period':
              ed_date = p['date_end']
            else:
              if p['period']=='by_event':
                # task 508, платежи по периодну начинать на день позже
                st_date = _getFinalWorkDate(p['date'], 1)
                ed_date = _getFinalWorkDate(p['date'], p['day_count']) #p['date']+datetime.timedelta(days=int(p['day_count']))

            date_diff = ed_date-st_date
            if date_diff.total_seconds()//(60*60)>=48:
              date_diff = date_diff/2
              sDate = (st_date+date_diff).replace(hour=8, minute=0)
              cntHrs = (ed_date-sDate).total_seconds()//(60*60)
              event['reminders']['overrides'].append({'method':'email','minutes':cntHrs*60})
            update_calendar_event(user_email, event,calendarplan)
            day_event['end'] = day_event['start']
            update_calendar_event(user_email, day_event,day_calendar)
      except Exception, exc:
        excType = exc.__class__.__name__
        print exc;
        pass

def make_plan_pay_calendar_event(data, parent_data, payment):
  summary = ((str(parent_data['number'])+'.') if parent_data else '')+str(data['number'])+('*' if payment['note'] else '')+'. '+payment['payment_type']['name']+'. '+(routine.float_format_money(float(payment['size'])) if payment['size'] else '0')+' '+(payment['currency']['name'] if 'currency' in payment else 'руб')+'. '
  summary = summary+payment['payment_use']['name']+' ';
  if payment['payment_use']['code']==3:
    if 'by_service' not in payment or not payment['by_service']:
      summary = summary+'(все услуги)'
    else:
      pstr = ''
      for ss in data['productions']:
        if ss.get('product_type')=='service':
          for s in payment['services']:
            if str(ss['_id'])==str(s['service_id']):
              if pstr:
                pstr = pstr+', '
              pstr = pstr+str(ss['number'])
              break
      summary=summary+'('+pstr+')'
  else:
    if not payment['by_production']:
      summary = summary+'(вся продукция)'
    else:
      # группировка unit-ов по продукции
      pu = {}
      for u in payment['units']:
        if str(u['production_id']) not in pu:
          pu[str(u['production_id'])] = {'units':[], 'id':str(u['production_id'])};
        pu[str(u['production_id'])]['units'].append(u['unit_number'])
      pstr = ''
      for p in pu:
        # поиск номера продукции
        pi = 1
        for prod in data['productions']:
          if not prod.get('product_type') and str(prod['_id'])==pu[p]['id']:
            pi =prod['number']
            break
        if pstr:
          pstr = pstr+'; '
        pstr = pstr+str(pi)+":"+', '.join([str(x) for x in pu[p]['units']])
      summary=summary+'('+pstr+')'
  summary = summary+'. '
  day_end = payment['date']
  day_start = payment['date']
  if payment['period']=='by_period':
    summary = summary+payment['date'].strftime('%d.%m.%Y')+'-'+payment['date_end'].strftime('%d.%m.%Y')
    day_end = payment['date_end']
  else:
    if payment['period']=='by_event':
      summary = summary+str(payment['day_count'])+' раб. '+routine.declension(int(payment['day_count']),['день','дня','дней'])
      #day_end =  payment['date']+datetime.timedelta(days=int(payment['day_count']))
      # task 508, платежи по периодну начинать на день позже
      day_start = _getFinalWorkDate(day_start,1)
      day_end = _getFinalWorkDate(payment['date'],payment['day_count'])
    else:
      summary = summary+payment['date'].strftime('%d.%m.%Y')

  description = (data['client_name'] if data['client_name'] else data['client_signator'])+'\r\n'+payment['date_change'].strftime('%d.%m.%Y')+' ('+payment['user_email']+')'+(('\r\n'+payment['note']) if payment['note'] else '')+('\r\nДо подписания договора' if data['is_signed']=='no' or data['sign_date']>payment['date'] else '')
  return {'id':str(payment['_id']), 'summary':summary, 'description':description, 'location':data['factory'],'start':{'dateTime':day_start.strftime('%Y-%m-%dT%H:%M:%S'),"timeZone": "Europe/Moscow"},'end':{'dateTime':day_end.strftime('%Y-%m-%dT%H:%M:%S'),"timeZone": "Europe/Moscow"}}

# получить конечную дату с учетом выходных и праздников
def _getFinalWorkDate(start_date, day_count):
  day_count = int(day_count)
  ed_date = start_date
  weekends = (config.db.weekends.find_one({}, {'weekends': 1}) or {}).get("weekends", [])
  while day_count>0:
    ed_date = ed_date+datetime.timedelta(days=1)
    strdt = ed_date.strftime('%Y-%m-%d')
    if not strdt in weekends:
      day_count = day_count-1
  return ed_date

def update_calendar_event(user_email,event, calendar_dt):
  res = None
  try:
    old_event = calendar.get_event(user_email, calendar_dt, event['id'] )

    if old_event is None:
      res = calendar.add_event(user_email, calendar_dt, event)
    else:
      new_sequence = 1
      try:
        if 'sequence' in old_event:
          new_sequence = old_event['sequence'] +1
      except:
        new_sequence = 1
        pass
      event['sequence']= new_sequence
      res = calendar.update_event(user_email, calendar_dt, event['id'], event)
  except Exception, exc:
    print('Error! update_fact_calendar_event ' + str(exc))
    excType = exc.__class__.__name__
    print_exc()
  print 'calendar event updated'
  return res

def update_fact_calendar_event(contract_id, payment_id, event_id, user_email):
  print('----start calendar fact  event update-----')
  try:
    contract = contractmodel.get_by({'_id':ObjectId(contract_id)})
    if contract.get('is_signed')!='yes':
      return
    parent_contract = None
    print contract_id
    print payment_id
    print event_id
    if contract['parent_id']:
      parent_contract = contractmodel.get_by({'_id':contract['parent_id']})
    for plan in contract['payments']:
      if str(plan['_id'])==str(payment_id):
        for fact in plan['events']:
          fe = make_fact_calendar_event(contract, parent_contract,plan,fact)
          calendarfact = config.fact_kaluga_calendar if fe['location']=='Калуга' else config.fact_penza_calendar
          update_calendar_event(user_email,fe, calendarfact)
        if len(plan['events'])>0:
          calendarplan = config.plan_kaluga_calendar if fe['location']=='Калуга' else config.plan_penza_calendar
          calendarplan_day = config.plan_day_kaluga_calendar if fe['location']=='Калуга' else config.plan_day_penza_calendar
          delete_calendar_event(user_email,payment_id,calendarplan)
          delete_calendar_event(user_email,payment_id,calendarplan_day)
        break
  except Exception, exc:
    print('Error! update_fact_calendar_event ' + str(exc))
    excType = exc.__class__.__name__
    print_exc()

  print('----end calendar fact event update-----')

def make_fact_calendar_event(contract, parent_contract, payment, event):
  summary = ((str(parent_contract['number'])+'.') if parent_contract else '')+str(contract['number'])+('*' if payment['note'] else '')+'. '+payment['payment_type']['name']+'. '+(routine.float_format_money(float(payment['size'])) if payment['size'] else '0')+' '+(payment['currency']['name'] if 'currency' in payment else 'руб')+'. '
  rest = payment['size']-event['size']
  if rest>0:
    summary = summary+'(-'+(routine.float_format_money(rest))+') '

  summary = summary+payment['payment_use']['name']+' ';
  if payment['payment_use']['code']==3:
    if 'by_service' not in payment or not payment['by_service']:
      summary = summary+'(все услуги)'
    else:
      pstr = ''
      for ss in contract['productions']:
        if ss.get('product_type')=='service':
          for s in payment['services']:
            if str(ss['_id'])==str(s['service_id']):
              if pstr:
                pstr = pstr+', '
              pstr = pstr+str(ss['number'])
              break
      summary=summary+'('+pstr+')'
  else:
    if not payment['by_production']:
      summary = summary+'(вся продукция)'
    else:
      # группировка unit-ов по продукции
      pu = {}
      for u in payment['units']:
        if str(u['production_id']) not in pu:
          pu[str(u['production_id'])] = {'units':[], 'id':str(u['production_id'])};
        pu[str(u['production_id'])]['units'].append(u['unit_number'])
      pstr = ''
      for p in pu:
        # поиск номера продукции
        pi = 1
        for prod in contract['productions']:
          if not prod.get('product_type') and str(prod['_id'])==pu[p]['id']:
            pi = prod['number']
            break

        if pstr:
          pstr = pstr+'; '
        pstr = pstr+str(pi)+":"+', '.join([str(x) for x in pu[p]['units']])
      summary=summary+'('+pstr+')'
  summary = summary+'. '


  if payment['period']=='by_period':
    summary = summary+payment['date'].strftime('%d.%m.%Y')+'-'+payment['date_end'].strftime('%d.%m.%Y')
  else:
    if payment['period']=='by_event':
      summary = summary+str(payment['day_count'])+' раб. '+routine.declension(int(payment['day_count']),['день','дня','дней'])
    else:
      summary = summary+payment['date'].strftime('%d.%m.%Y')
  description = (('Недоплата:'+routine.float_format_money(float(event['size']))) if event['size'] and event['size']<payment['size'] else '')
  for c in event['comments']:
    if description:
      description=description+'\r\n'
    description=description+c['note']

  return {'id':str(event['_id']), 'summary':summary, 'description':description, 'location':contract['factory'],'start':{'date':event['date_start'].strftime('%Y-%m-%d')},'end':{'date':event['date_start'].strftime('%Y-%m-%d')}}

def delete_fact_calendar_event(contract_id, payment_id, event_id, user_email):
  try:
    contract = contractmodel.get_by({'_id':ObjectId(contract_id)})
    delete_calendar_event(user_email, event_id, config.fact_kaluga_calendar if contract['factory']=='Калуга' else config.fact_penza_calendar)
    contractapi.create_plan_pays(contract_id, user_email)
  except Exception, e:
    print('delete_calendar_event: ' + str(e))

def delete_calendar_event(user_email, ev_id, calendar_dt):
  try:
    old_event = calendar.get_event(user_email, calendar_dt, ev_id )
    if old_event:
      calendar.remove_event(user_email, calendar_dt, ev_id)
  except Exception, e:
    print('delete_calendar_event: ' + str(e))

def get_next_sequence_product(contract_id):
  '''
    Получение номера для новой продукции
  '''
  try:
    return contractmodel.get_next_sequence_product(ObjectId(contract_id))
  except Exception,exc:
    print(str(exc))
    raise Exception(str(exc))

def confirm_sequence_product(contract_id, i):
  '''
    Подтверждение счетчика продукции
  '''
  try:
    contractmodel.confirm_sequence_product(ObjectId(contract_id), i)
  except Exception,exc:
    print(str(exc))
    raise Exception(str(exc))

def remove_sequence_product(contract_id, i):
  '''
    Освабождение счетчика продукции
  '''
  try:
    contractmodel.remove_sequence_product(ObjectId(contract_id), i)
  except Exception,exc:
    print(str(exc))
    raise Exception(str(exc))

#---------------------------------------------------------------------------------------------------
#---------------- РАЗОВЫЕ ФУНКЦИИ-СКРИПТЫ-----------------------------------------------------------
#---------------------------------------------------------------------------------------------------
def create_google_folder_for_each_contract():
  from models import contractmodel, ordermodel
  try:
    # получение списка договоров по заданным параметрам
    data_contracts = contractmodel.get_list_by({'parent_id':''}, {'documents':1, 'user_email':1, 'number':1, 'order_id':1, 'order_number':1})
    for contract_row in data_contracts:
      print('------')
      print(contract_row['number'])
      print('---')
      print(contract_row['order_number'])
      if contract_row.get('order_id'):
        #tmp_info = create_google_folder_catalogs(contract_info)

        new_documents = contract_row.get('documents')
        if not new_documents:
          new_documents = {
            'items': [],
            'history': [],
            'google_folder_id': None,
            'google_ready_folder_id': None
          }
        if not new_documents.get('google_folder_id'):
          # создаем структуру каталогово на гугл диске
          new_google_folders_data = None
          try:
            new_google_folders_data = create_google_folder_catalogs(contract_row)
            print('------')
            print(new_google_folders_data)
            print('------')
          except Exception, exc:
            print_exc()
          if new_google_folders_data:
            new_documents['google_folder_id'] = new_google_folders_data['google_folder_id']
            new_documents['google_ready_folder_id'] = new_google_folders_data['google_ready_folder_id']
          # обновление данных
          contractmodel.update({'_id':ObjectId(contract_row['_id'])},{'$set':{'documents':new_documents}}, False, True)
      print('complete')
      print('-----------------')
  except Exception, exc:
    excType = exc.__class__.__name__
    print('------ERROR---')
    print_exc()
    raise Exception(str(exc))

# подсчет задолженности по конткрату
def calculate_debt(contract):
  debt = 0
  # получить все наряды для этого контракта
  workorders = workordermodel.get_list_by({'contract_id':contract.get('_id')}, {'number':1, 'plan_work':1} )

  for pay in contract.get('payments',[]):
    if not pay.get('is_canceled', 0):
      # сначала найти наряд для платежа
      work = None
      if pay.get('work_order_id') and pay.get('work_id'):
        for w in workorders:
          if w['_id']==pay.get('work_order_id'):
            for wp in w.get('plan_work',[]):
              if wp['_id']==pay.get('work_id'):
                work = wp
                break
      edate = None
      if work:
        edate = work.get('contract_plan_date_finish_with_shift') or work.get('contract_plan_date_start_with_shift') or work.get('contract_plan_date_finish') or work.get('contract_plan_date_start') or work.get('date_start_with_shift') or work.get('date_finish_with_shift') or work.get('date_finish') or work.get('date_start')
      events = pay.get('events', [])
      pay_size = 0
      for event in events:
        pay_size += event.get('size', 0)
      if not edate:
        edate = pay['date']
        if pay.get('period') == 'by_period':
          edate = pay.get('date_end')
        elif pay['period'] == 'by_event':
          edate = edate + datetime.timedelta(days=pay.get('day_count',0)+1)
      if edate and edate < datetime.datetime.now():
        debt += pay['size'] - pay_size
  return debt

# расчитать суммарные финансы для договора
# общая стоимость договора, плановые платежи договора, общие факты по договору, задолженность (просроченные платежи)
def calculate_finance(contract):
  cost = 0
  plan = 0
  facts = 0
  # считаем общую стоимость договора
  cost = cost+routine.strToFloat(contract.get('goods_price',0) or 0)+routine.strToFloat(contract.get('montaz_price',0) or 0)+routine.strToFloat(contract.get('delivery_price',0) or 0)
  for p in contract.get('productions',[]):
    if p.get('status')!='del':
      if not p.get('product_type'):
        cnt = routine.strToFloat(p.get('complect_count',0) or p.get('count',0) or 0 )  if p.get('is_compect') else routine.strToFloat(p.get('count',0) or 0)
        cost = cost+cnt*routine.strToFloat(p.get('price',0) or 0)
        for pos in p.get('positions',[]):
          cost = cost+routine.strToFloat(pos.get('delivery',0) or 0)
          cost = cost + routine.strToFloat(pos.get('mont_price',0) or 0)*routine.strToFloat(1 if pos.get('mont_price_type') else pos.get('num',0))
      if p.get('product_type')=='service':
        cost = cost+routine.strToFloat(p.get('price',0) or 0)

  # cчитаем платежи
  for p in contract.get('payments',[]):
    if not p.get('is_canceled'):
      # планы
      plan = plan+routine.strToFloat(p.get('size'))
      ff = 0
      # факты
      for e in p.get('events',[]):
        ff = ff+routine.strToFloat(e.get('size',0) or 0)
      facts = facts+ff

  contract['total'] = {'cost':cost, 'plan':plan, 'fact': facts}
  contract['debt'] = calculate_debt(contract)

def check_on_google_group():
  '''
    Проверка всех договоров на существование гугл групп для них
  '''
  from helpers.google_api import groups
  from models import usermodel
  from helpers import mailer
  try:
    result = []
    # получение списка подписанных и незавершенных договоров
    contracts = contractmodel.get_list_by({
      'factory': u'Калуга',
      '$or': [{'is_signed': 'yes'},{'timeline_visible':True}],
      '$and':[
        # only main contracts
        {'$or': [{'parent_id': {'$exists': False }},{'parent_id':None},{'parent_id': ''}]},
        # filter out old contracts
        {'$or': [{ 'status': { '$ne': 'completed' }}]},
        # not canceled
        {'$or': [{'is_canceled': {'$exists': False }},{'is_canceled':None},{'is_canceled': False}]},
      ]
    })

    # объект для работы с группами
    google_groups_obj = groups.google_groups(config.google_groups_user_admin)

    # проходим по всем договорам и получаем информацию по группам
    for contract_row in contracts:
      tmp_inf = {
        'contract_number': contract_row['number'],
        'exist': False,
        'members': []
      }
      # ключ группы
      group_key = str(contract_row['number']) + '@modul.org'
      group_info = None
      try:
        group_info = None
        try:
          group_info = google_groups_obj.get_group(group_key)
        except:
          print('Error. Get info for group: '+group_key)
          print_exc()
          pass

        if group_info:
          result_members = []
          # фиксируем в договоре, что для договора создана гугл группа
          contractmodel.update({'_id':ObjectId(contract_row['_id'])},{'$set':{'google_group':{
            'key': group_key,
            'date': datetime.datetime.utcnow()
          }}}, False, True)

          members = google_groups_obj.get_members(group_key)
          tmp_inf['exist'] = True
          if members:
            tmp_inf['members'] = [{'role': member['role'], 'email': member['email']} for member in members]
          else:
            print('-------')
            print('add members for: {0}'.format(group_key))
            # добавление пользователей на группу с шаблонной группы
            old_members = google_groups_obj.get_members(config.google_groups_template)
            print('-------')
            for member in old_members:
              try:
                result_members.append({'email':member['email'], 'fio':''})
                google_groups_obj.insert_group_member(group_key, member['email'], member['role'])
              except:
                print_exc()
                print('Error add member to goole group: {0}; {1} - {2}'.format(group_key, member['email'], member['role']))
                pass
            try:
              result_members.append({'email':config.google_groups_user_admin, 'fio':''})
              google_groups_obj.insert_group_member(group_key, config.google_groups_user_admin, 'OWNER')
            except:
              print('------ERROR add member to goole group: {0}; {1}'.format(group_key, config.google_groups_user_admin))
          # отправка сообщения в группу
          try:
            print('Prepare letter for group')
            letter_info = prepare_google_group_letter(contract_row, result_members)
            print('Send letter')
            mailer.send(letter_info['header'], letter_info['body'], [{'email': group_key, 'fio': ''}], True, None)
          except:
            print('Error. Cant prepare_google_group_letter.')
            pass
        else:
          # если группа не найдена, то необходимо ее создать
          add_google_group(contract_row['number'], contract_row.get('client_name','Не задан'))
      except Exception, ex:
        print_exc()
        pass
      result.append(tmp_inf)
    return result
  except Exception, exc:
    excType = exc.__class__.__name__
    print('------ERROR check_on_google_group')
    print_exc()

def prepare_google_group_letter(contract, members=[]):
  '''
    Функция подготовки письма для отправки в GOOGLE GROUP
  '''
  from helpers.google_api import groups
  from models import usermodel
  from bottle import static_file, view, template
  import os
  try:
    result = {
      'header': 'Создана группа по договору: {0}. Заказчик: {1}'.format(str(contract['number']), contract.get('client_name','Не задан')),
      'body':''
    }

    # информация о группе
    group = {
      'name': contract.get('client_name','{0}@modul.org'.format(str(contract['number']))),
      'link': 'https://groups.google.com/a/modul.org/forum/#!forum/{0}'.format(str(contract['number']))
    }
    # сбор информации о позициях
    main_positions = []
    main_summ_info={'square':0, 'count':0}
    dop_positions = []
    for p in contract.get('productions',[]):
      if p.get('status')!='del' and p['number']>0 :
        tmp_inf = {
          'number': p['number'],
          'name': p['name'],
          'type': p['type'],
          'target': p.get('target',''),
          'count': len(p['units'])-1,
          'square': p['square'],
          'order_number': str(contract.get('number'))+'.'+str(p['number']),
          'product_type': p.get('product_type')
        }
        if p.get('product_type')!='service':
          main_positions.append(tmp_inf)
          main_summ_info['square']+=p['square']
          main_summ_info['count']+=p['count']
        else:
          dop_positions.append(tmp_inf)

    # #----------
    # new_group_key = str(contract['number']) + '@modul.org'
    # # объект для работы с группами
    # google_groups_obj = groups.google_groups(config.google_groups_user_admin)
    # members = [] # пользователи которые стали участниками новой группы
    # old_members = google_groups_obj.get_members(config.google_groups_template)
    # for member in old_members:
    #   members.append({'email':member['email'], 'fio':''})
    # print('=========')
    # print(members)
    # print('=========')
    # #-------

    result['body'] = template('views/crm/google_groups_letter_template', main_positions=main_positions, dop_positions=dop_positions, main_summ_info = main_summ_info, group=group, members = members).replace('\r\n', '').replace('\n','')
    return result

  except Exception, exc:
    print('------ERROR prepare_google_group_letter')
    print_exc()



