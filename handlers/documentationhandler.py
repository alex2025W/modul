#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import get, post, put, request, error
import urllib
import config
import json
from bson.objectid import ObjectId
import datetime
from libraries import userlib
from routine import  JSONEncoder
from models import sectormodel, contractmodel, projectdocumentationmodel
from traceback import print_exc

@get('/documentation/update_folder_id/')
def update_folder_id():
  '''
    Разова функция для массового обновления ID Google каталога
    для каждой заявки куда скидываются документы
  '''
  from helpers.google_api import drive
  try:
    userlib.check_page_access('projectdocumentation','w')
    # получить все договоры и их идентификаторы каталогов
    service = drive.get_service(config.google_api_user)
    contracts = {}
    for row in contractmodel.get_list_by({
      # only main contracts
      '$or': [{'parent_id': {'$exists': False }},{'parent_id':None},{'parent_id': ''}]
      },
      {
        '_id': 1,
        'number': 1,
        'documents':1
      }):
      try:
        if row.get('documents') and 'google_folder_id' in row['documents']:
          google_folder_id = row['documents']['google_folder_id']
          project_docs_folder_id = None
          tmp_folders = drive.get_folder_by_name(service, google_folder_id, u'Проектная документация')
          if tmp_folders is not None and len(tmp_folders)>0:
            project_docs_folder_id = tmp_folders[0]['id']
          # else:
          #   project_docs_folder_id = drive.insert_folder(
          #     service,
          #     u"Проектная документация",
          #     "",
          #     google_folder_id
          #   )
          if project_docs_folder_id:
            contracts[str(row['number'])] = project_docs_folder_id
      except Exception, exc1:
        print_exc()
        #print('error')
        #print('--------------------')
        pass

    print(contracts)
    print('Get contract folder ID complete')
    # получить все заявки и обновить им идентификатор
    for x in projectdocumentationmodel.get_list(None, {'_id':1, 'order_number':1}):
      contract_number = x['order_number'].split('.')[0]
      if contract_number in contracts and contracts[contract_number]:
        folder_id = contracts[contract_number]
        projectdocumentationmodel.update_by_id(x['_id'], {'folder_id': folder_id})
    return 'OK';
  except Exception, exc:
    print_exc()
    return str(exc)

@get('/documentation/checkcontractfolder/<order>')
def checkcontractfolder(order):
  from helpers.google_api import drive
  try:
    userlib.check_page_access('projectdocumentation','w')
    contract_number = (int)(order.split('.')[0])
    contract = contractmodel.get_by({'number':contract_number},{'documents':1})
    if not contract.get('documents') or not contract.get('documents').get('google_folder_id'):
      raise Exception(u"Договор не содержит каталога документов")
    # подключение сервиса для работы с гугл диском
    service = drive.get_service(config.google_api_user)
    google_folder_id = contract.get('documents').get('google_folder_id')
    project_docs_folder_id = None
    tmp_folders = drive.get_folder_by_name(service, google_folder_id, u'Проектная документация')
    if tmp_folders is not None and len(tmp_folders)>0:
      project_docs_folder_id = tmp_folders[0]['id']
    else:
      project_docs_folder_id = drive.insert_folder(service, u"Проектная документация", "", google_folder_id)
    if not project_docs_folder_id:
      raise Exception(u"Ошибка создания дирректории для записи документации.")
  except Exception, exc:
    return JSONEncoder().encode({'status':'error', 'message':str(exc)})
  return JSONEncoder().encode({'status':'ok', 'folder_id': project_docs_folder_id})


@put('/documentation/add_additional_documentation')
def add_project_documentation():
  userlib.check_page_access('projectdocumentation','w')
  data = None
  try:
    cur_user = userlib.get_cur_user() # текущий пользователь
    # данные от клиента
    data = request.json
    # получить текущий проект документации
    old_data = projectdocumentationmodel.get({'_id': ObjectId(data['_id'])})
    if not old_data.get('dop_files'):
      old_data['dop_files'] = []
    # внести изменения
    old_data['dop_files'].append({
      '_id': ObjectId(),
      'user': cur_user['email'],
      'date_added': datetime.datetime.utcnow(),
      'name': data['name'],
      'size': data['size'],
      'google_file_id': data['google_file_id']
    });
    # сохранить новые данные
    projectdocumentationmodel.update_by_id(ObjectId(data['_id']), {'dop_files': old_data['dop_files']})
    # результат
    return JSONEncoder().encode({'status':'ok', 'data': old_data['dop_files']})
  except Exception, exc:
    print_exc()
    return JSONEncoder().encode({'status':'error', 'message':str(exc)})


@put('/documentation/add_project_documentation')
def add_project_documentation():
  userlib.check_page_access('projectdocumentation','w')
  data = None
  try:
    cur_user = userlib.get_cur_user() # текущий пользователь
    # данные от клиента
    data = request.json
    # добавляем id и пр. к файлам
    for f in data.get('pdf_files',[]):
      f['_id'] = ObjectId()
      f['user'] = cur_user['email']
      f['date_added'] = datetime.datetime.utcnow()
    for f in data.get('source_files',[]):
      f['_id'] = ObjectId()
      f['user'] = cur_user['email']
      f['date_added'] = datetime.datetime.utcnow()
    data['section']['_id'] = ObjectId(data['section']['_id'])
    data['date_added'] = datetime.datetime.utcnow()
    data['date_changed'] = datetime.datetime.utcnow()
    data['user_added'] = cur_user['email']
    projectdocumentationmodel.add(data)
  except Exception, exc:
    print_exc()
    return JSONEncoder().encode({'status':'error', 'message':str(exc)})
  return JSONEncoder().encode({'status':'ok', 'data': data})

@post('/documentation/get_project_documentation_list')
def get_project_documentation_list():
  userlib.check_page_access('projectdocumentation','r')
  try:
    # данные фильтра
    data = request.json
    dfilter = {}
    if data.get('orders'):
      dfilter['order_number'] = {'$in':data.get('orders',[])}
    if data.get('sections'):
      dfilter['section._id'] =  {'$in': [ObjectId(x) for x in data.get('sections',[])]}
    if data.get('stage'):
      dfilter['stage'] = data.get('stage')
    if data.get('is_agreed')=='yes':
      dfilter['is_customer_agree'] = True
    elif data.get('is_agreed')=='no':
      dfilter['is_customer_agree'] = False
    #print dfilter
    docs = []
    for x in projectdocumentationmodel.get_all(dfilter,None,data['last_redaction']=='yes', data['group_sections']=='yes', 50,int(data.get('page',1))):
      docs.append(x)
    count = projectdocumentationmodel.get_count(dfilter, data['last_redaction']=='yes')

    return JSONEncoder().encode({'status':'ok','docs':docs,'count':count})
  except Exception, exc:
    print_exc()
    return JSONEncoder().encode({'status':'error', 'message':str(exc)})
