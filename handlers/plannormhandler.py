#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route, get, post, put, request, error, abort, response, debug
import datetime
from bson.objectid import ObjectId
from libraries import userlib
from helpers import mailer
from models import contractmodel, usermodel, planecalculationmodel, workordermodel, materialsgroupmodel,sectormodel,noticemodel, plan_norms_xls_imports_model, countersmodel
import routine
from libraries import excellib
from traceback import print_exc
from copy import deepcopy,copy
from helpers import mailer
from apis.integra1c import integra1capi
from apis.plannorms import plannormsapi
import config
import os

@put('/handlers/plannorm/import_data/')
def import_data():
  '''
    Импортирование данных в нормы
  '''
  userlib.check_handler_access("plannorm","w")
  usr = userlib.get_cur_user()
  try:
    # получение входящих параметров
    params = request.json
    result_data = plannormsapi.import_xls_data(params, usr['email'])
    if result_data['status']=='error':
      return routine.JSONEncoder().encode({
        'status': 'error',
        'msg':'Проверьте ошибки и повторите попытку.',
        'result_log': result_data['result_log'],
        'data': result_data['data'] ,
        'materialsgroups':sorted(materialsgroupmodel.get_all(), key=lambda a:a['name'])
      })
    else:
      return routine.JSONEncoder().encode({'status': 'ok', 'data': result_data['data'], 'result_log': None})
  except Exception,exc:
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc), 'result_log': None, 'data': None})

@put('/handlers/plannorm/required_groups/')
def required_groups():
  '''
    Сохранение групп материалов требуемых в заказах
  '''
  userlib.check_handler_access("plannorm","w")
  usr = userlib.get_cur_user()
  try:
    # получение входящих параметров
    params = request.json
    result_data = plannormsapi.save_required_groups(params, usr['email'])
    return routine.JSONEncoder().encode({'status': 'ok'})
  except Exception,exc:
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg': str(exc)})

@post('/handlers/plannorm/upload_document/')
def upload_document():
  # локальная функция получения размера файла
  def get_file_size( file):
    file.seek(0, 2)  # Seek to the end of the file
    size = file.tell()  # Get the position of EOF
    file.seek(0)  # Reset the file position to the beginning
    return size

  userlib.check_handler_access('plannorm','w')
  from apiclient.http import MediaInMemoryUpload

  try:
    result = {}
    for name, fieldStorage in request.POST.items():
      if type(fieldStorage) is unicode:
        continue
      filename, file_extension = os.path.splitext(fieldStorage.filename)
      new_file_name = 'plan_norm_import_' +datetime.datetime.utcnow().strftime('%d_%m_%Y_%H_%M_%S')+file_extension
      result['name'] = new_file_name
      result['type'] = fieldStorage.type
      result['size'] = get_file_size(fieldStorage.file)
      # физическое сохранение файла на диск
      # inputfile = open('d:/test/%s'%result['name'], 'wb')
      inputfile = open(os.path.join(os.path.dirname(__file__),'..','temp',new_file_name), 'wb')
      inputfile.write(fieldStorage.file.read())
      inputfile.close()
    return routine.JSONEncoder().encode({'status': 'ok', 'data': result})
  except Exception,exc:
    excType = exc.__class__.__name__
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@get('/handlers/plannorm/search/')
def search():
  '''
    Получение плановых норм по номеру договора
  '''
  userlib.check_handler_access("plannorm","r")
  result = {}
  try:
    usr = userlib.get_cur_user()
    # get parameters
    param = request.query.decode()
    if not 'num' in param:
      return {'status':'error', 'msg':'Не задан номер договора.'}
    result = plannormsapi.get_norms_by_type_and_number(param.get('type', 'order'), param['num'])
    return routine.JSONEncoder().encode({'status':'ok', 'data':result})
  except Exception, exc:
    print('Error! Get plan norms.')
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})
    pass

@put('/handlers/plannorm/update/')
def update():
  '''
  Обновление норм по заданным параметрам
  {
    "_id":"582c5f45d69535246cf3d2af",
    "comment":"",
    "materials":
      [
        {"global_id":"5305d1715174c35412f22dcc","material_id":"582c5f45d69535246cf3d2ad","pto_size":"2","unique_props":
          [{"is_active":true,"_id":"54082c32301f1d320565f94a","type":"prop","name":"противопожарная","key":1}],"status":"5"},
        {"global_id":"5305d1715174c35412f22dc8","material_id":"582c759fd69535246cf3d2c2","pto_size":"2","unique_props":
          [{"type":"prop","_id":"58246ea4163e520004908bd3","is_active":true,"name":"Ral 5005","key":1}],"status":"0"}
      ]
    }
  '''
  userlib.check_handler_access("plannorm","w")
  usr = userlib.get_cur_user()

  # получение входящих параметров
  param = request.json

  # получаем идентификаторы материалов, участвующие в сохранении
  materials_catalog = {} # информация о материалах из справочника, которые участвуют в текущей плановой норме
  materials_catalog_unique_props = {} # список материалов с уникальными свойствами
  materials_catalog_unique_presets = {} # список материалов с уникальными пресетами

  materials_id = [] # список идентификаторов справочных материалов, пришедших на сохранение
  norm_materials_id = [] #список идентификторов материалов из плановой нормы
  change_history_list = [] # список изменений

  # преобразрвание ID гуппы к нужному типу
  group_id = ObjectId(param['group_id'])
  # сбор идентификаторов материалов пришедших на сохранение
  for row_material in param['materials']:
    if(row_material['global_id'] and not ObjectId(row_material['global_id']) in materials_id):
      materials_id.append(ObjectId(row_material['global_id']))
    if(row_material['material_id'] and not str(row_material['material_id']) in norm_materials_id):
      norm_materials_id.append(str(row_material['material_id']))
  # сбор материалов и их уникальных характеристик из справочника материалов
  for row_material in materialsgroupmodel.get_materials_unique_props({'_id':{'$in':materials_id}}).values():
    materials_catalog[str(row_material['_id'])] = row_material
    # собираем уникальные характеристики материала
    for row_prop in row_material.get('unique_props',[]):
      # делим характеристики на простые своийства и пресеты
      if row_prop.get('type', 'prop') == 'prop':
        tmp_key = '{0}_{1}'.format(str(row_material['_id']), str(row_prop['key']))
        materials_catalog_unique_props[tmp_key] = row_prop
      else:
        tmp_key = '{0}_{1}'.format(str(row_material['_id']), row_prop['hash'])
        materials_catalog_unique_presets[tmp_key] = row_prop


  # подготовка данных на обновление
  # получение актуальной информации о требуемых плановых нормах из БД
  obj = planecalculationmodel.get(ObjectId(param['_id']))
  obj['date_change'] = datetime.datetime.utcnow()
  obj['user_email'] = usr['email']
  #obj['remarks'] = param.get('remarks')
  if 'group_remarks' not in obj or not obj['group_remarks']:
    obj['group_remarks'] = {}
  obj['group_remarks'][str(group_id)] = param.get('remarks')
  # список обновленных материалов
  new_materials_list = []

  # материалы, обновляемые непосредственно в справочнике материалов
  # требуются для синхронизации с 1с
  changed_materials_in_dict = []

  # удаление из норм материалов, которые не пришли  от клиента
  for old_row_material in obj.get('materials',[]):
    if str(old_row_material['_id'])  in norm_materials_id or str(old_row_material['materials_group_id'])!=group_id:
      new_materials_list.append(old_row_material)
  for row_material in param['materials']:
    # добавляем новые материалы в нормы, берем тех у кого "material_id" == ""
    if not row_material.get('material_id'):

      #---------------------
      # проверяем текущие индивидуальные характеристики и вносим обновление в справочник материалов
      tmp_unique_props_names_str = ''
      tmp_unique_props_keys_str = ''
      tmp_unique_props_names_list = []
      tmp_unique_props_keys_list = []
      new_unique_props_info = {'key':None, 'name':'', 'items':[], 'type': 'prop' }
      if row_material.get('unique_props_info') and len(row_material['unique_props_info'].get('items',[]))>0:
        unique_props_items = row_material['unique_props_info']['items']
        unique_props_items.sort(key = lambda x:(x['key']))
        for u_prop in unique_props_items:
          tmp_unique_props_keys_list.append(str(u_prop['key']))
          tmp_unique_props_names_list.append(u_prop['name'])
        tmp_unique_props_names_str = '; '.join(tmp_unique_props_names_list)
        tmp_unique_props_keys_str = '_'.join(tmp_unique_props_keys_list) # hash for preset

        # разбиваем обработку простых свойств и пресетов
        if len(unique_props_items)>1:
          # проверяем, есть ли в справочнике материалов пресет с указанным кодом
          tmp_key = '{0}_{1}'.format(str(row_material['global_id']), tmp_unique_props_keys_str)
          # если данной уникальной характеристики еще нет в справочнике, то добавляем ее в него
          if tmp_key not in materials_catalog_unique_presets:
            tmp_new_material_prop = materialsgroupmodel.add_new_unique_preset(ObjectId(mg['materials_id']), unique_props_items)
            changed_materials_in_dict.append(ObjectId(mg['materials_id']))
            materials_catalog_unique_presets[tmp_key] = tmp_new_material_prop
          else:
            tmp_new_material_prop = materials_catalog_unique_presets[tmp_key]
        else:
          # проверяем, есть ли в справочнике материалов характеристика с указанным кодом
          tmp_key = '{0}_{1}'.format(str(row_material['global_id']), str(unique_props_items[0]['key'] ))
          tmp_new_material_prop = materials_catalog_unique_props[tmp_key]

        new_unique_props_info = tmp_new_material_prop
        if tmp_new_material_prop.get('type')=='prop':
          new_unique_props_info['items'] = [deepcopy(tmp_new_material_prop)]
      #------------------------

      new_materials_list.append({
        '_id': ObjectId(),
        'pto_size': row_material['pto_size'],
        'purchase_statuses': [],
        'purchase_status': '',
        'unit_price': 0,
        'contract_number': obj["contract_number"],
        'status': row_material['status'],
        'materials_id': ObjectId(row_material['global_id']),
        'purchase_user_email': '',
        'fact_price': 0,
        'fact_size': 0,
        'date_change': datetime.datetime.utcnow(),
        'user_email': usr['email'],
        'date_confirm': None,
        'purchase_date_confirm': None,
        'unique_props': "",
        'unique_props_info' : {'key':None, 'name':'', 'items':[], 'type': 'prop'},
        'has_blank': 0,
        'unit_production': 1,
        'materials_group_id' :ObjectId(materials_catalog[str(row_material['global_id'])]['group_id']) if materials_catalog.get(str(row_material['global_id'])) else None,
        'materials_group_key' : materials_catalog[str(row_material['global_id'])]['group_code'] if materials_catalog.get(str(row_material['global_id'])) else None,
        'materials_key' : materials_catalog[str(row_material['global_id'])]['code'] if materials_catalog.get(str(row_material['global_id'])) else None,
        'unique_props' : tmp_unique_props_names_str,
        'unique_props_info': new_unique_props_info,
        # 'allowance': 0,
        # 'note': ''
        'allowance': routine.strToFloat(row_material.get('allowance', 0)),
        'note': row_material.get('note', '')
      })

      # добавление записи в историю
      change_history_list.append({'type':'add', 'new':row_material})
    else:
      # редактирование материала
      # Также идет проверка на наличие необхдимого пресета характеристик в справочнике материалов,
      # если такого пресета нет, то он создается и заносится в справочник.
      # Также собранная информация о пресете сохраняется строкой в поле "unique_props", редактировуемго материала нормы
      mg = None
      try:
        mg =  (i for i in new_materials_list if str(i['_id']) == row_material['material_id']).next()
      except:
        pass

      # если материал найден среди существующих в БД нормы
      if mg and ((mg['status']!='3' and mg['status']!=1) or userlib.has_access('plannorm','o')):
        #------------------------
        # проверяем текущие индивидуальные характеристики и вносим обновление в справочник материалов
        tmp_unique_props_names_str = ''
        tmp_unique_props_keys_str = ''
        tmp_unique_props_names_list = []
        tmp_unique_props_keys_list = []
        new_unique_props_info = {'key':None, 'name':'', 'items':[], 'type': 'prop' }
        if row_material.get('unique_props_info') and len(row_material['unique_props_info'].get('items',[]))>0:
          unique_props_items = row_material['unique_props_info']['items']
          unique_props_items.sort(key = lambda x:(x['key']))
          for u_prop in unique_props_items:
            tmp_unique_props_keys_list.append(str(u_prop['key']))
            tmp_unique_props_names_list.append(u_prop['name'])
          tmp_unique_props_names_str = '; '.join(tmp_unique_props_names_list)
          tmp_unique_props_keys_str = '_'.join(tmp_unique_props_keys_list) # hash for preset

          # разбиваем обработку простых свойств и пресетов
          if len(unique_props_items)>1:
            # проверяем, есть ли в справочнике материалов пресет с указанным кодом
            tmp_key = '{0}_{1}'.format(str(mg['materials_id']), tmp_unique_props_keys_str)
            # если данной уникальной характеристики еще нет в справочнике, то добавляем ее в него
            if tmp_key not in materials_catalog_unique_presets:
              tmp_new_material_prop = materialsgroupmodel.add_new_unique_preset(ObjectId(mg['materials_id']), unique_props_items)
              changed_materials_in_dict.append(ObjectId(mg['materials_id']))
              materials_catalog_unique_presets[tmp_key] = tmp_new_material_prop
            else:
              tmp_new_material_prop = materials_catalog_unique_presets[tmp_key]
          else:
            # проверяем, есть ли в справочнике материалов характеристика с указанным кодом
            tmp_key = '{0}_{1}'.format(str(mg['materials_id']), str(unique_props_items[0]['key'] ))
            tmp_new_material_prop = materials_catalog_unique_props[tmp_key]

          mg['unique_props_info'] = tmp_new_material_prop
          if tmp_new_material_prop.get('type')=='prop':
            mg['unique_props_info']['items'] = [deepcopy(tmp_new_material_prop)]
        #------------------------

        if mg['status']!='1' and row_material['status']=='1':
          mg['date_confirm'] =  datetime.datetime.utcnow()
          mg['purchase_status'] = '0'
          new_purchase_status ={
            'purchase_status':'0',
            'purchase_user_email':usr['email'],
            'purchase_date_confirm':datetime.datetime.utcnow()
          }
          if 'purchase_statuses' in mg:
            mg['purchase_statuses'].append(new_purchase_status)
          else:
            mg['purchase_statuses'] = [new_purchase_status]

        if mg['status']!=row_material['status']:
          new_status ={
            'status':row_material['status'],
            'user_email':usr['email'],
            'date_confirm':datetime.datetime.utcnow()
          }
          if 'statuses' in mg:
            mg['statuses'].append(new_status)
          else:
            mg['statuses'] = [new_status]
        if str(mg['status'])!=str(row_material['status']) or str(mg['pto_size'])!=str(row_material['pto_size']) or mg['unique_props']!=tmp_unique_props_names_str:
          change_history_list.append({'type':'edit', 'old': {'status':mg['status'], 'pto_size':mg['pto_size'], 'unique_props':mg['unique_props'], 'material_id': mg.get('material_id','')}, 'new':row_material})

        mg['status'] = row_material['status']
        mg['pto_size'] = row_material['pto_size']
        mg['unique_props'] = tmp_unique_props_names_str
        mg['date_change'] = datetime.datetime.utcnow()
        mg['user_email'] = usr['email']
        mg['allowance'] = routine.strToFloat(row_material.get('allowance', 0))
        mg['note'] = row_material.get('note', '')


  obj['materials'] = new_materials_list
  if param['comment']!='':
    if 'group_comments' not in obj:
      obj['group_comments'] = []
    com_elem = {}
    com_elem['_id'] = ObjectId()
    com_elem['user_email'] = usr['email']
    com_elem['date_change'] = datetime.datetime.utcnow()
    com_elem['text'] = param['comment']
    com_elem['group_id'] = group_id
    obj['group_comments'].append(com_elem)

  # обновление истории изменения плановой нормы
  if len(change_history_list)>0:
    chistory = obj.get('change_history',[])
    chistory.append({'type':'update','date': datetime.datetime.utcnow(), 'user':usr['email'], 'data': change_history_list})
    obj['change_history'] = chistory

  if len(param.get('correction',[]))>0:
    if 'corrections' not in obj:
      obj['corrections'] = []
    param['correction']['user_email'] = usr['email']
    param['correction']['date_change'] = datetime.datetime.utcnow()
    obj['corrections'].append(param['correction'])

    # формируется письмо с корректировками для отправки
    mail_body = u"Корректировка объёмов спецификации.<br><br>"
    mail_body += u'Причина корректировки:<br>'
    mail_body += param.get('correction',{}).get('comment','')+'<br><br>'
    mail_body += u'Скорректированно - <br><br>'

    statuses = {
      "4":"Не определено",
      "5":"Требуется",
      "0":"В расчете",
      "3":"На согласовании",
      "1":"Согласовано",
      "2":"Отклонено"
    }

    for c in param.get('correction',{}).get('correction_list',[]):
      mail_body += str(obj['contract_number'])+'.'+str(obj['product_number'])+" / "+obj.get('sector_name','')+' ['+str(obj.get('sector_code',''))+']'+' / '+c['material']['group']['name']+' ['+str(c['material']['group']['code'])+']'+' / '+c['material']['material']['name']+' ['+str(c['material']['material']['code'])+']'+'<br>'
      mail_body += u'- Было: '+str(c.get('old_pto_size')) +' '+ c.get('unit_pto')+'. Статус: '+ statuses.get(str(c.get('old_status')),'')+'.<br>'
      mail_body += u'- Стало: '+str(c.get('pto_size')) +' '+ c.get('unit_pto')+'. Статус: '+ statuses.get(str(c.get('status')),'')+'.<br><br>'


    mail_body+='Пользователь: '+usr['fio']+' ('+usr['email']+')'
    try:
      notice_users = usermodel.get_list(
        {
          'notice.key': noticemodel.notice_keys['specification']['key'],
          'stat': {'$ne':'disabled' }
        },
        {'email':1,'fio':1}
      )
      # добавение группы договора на оповещение
      contract_group_info = contractmodel.get_google_group_info(obj['contract_number'])
      if contract_group_info:
        notice_users.append({'email': contract_group_info['key'], 'fio': ''})
      else:
        notice_users.append({'email': config.contracts_report_recepient, 'fio': ''})

      mailer.send(
        u'Корректировка объёмов спецификации '+str(obj['contract_number'])+'.'+str(obj['product_number']),
        mail_body,
        notice_users,
        True,
        usr['email']
      )
    except Exception,exc:
      print_exc()
      pass

  # обновление данных в БД
  planecalculationmodel.update({'_id':obj['_id']},obj)

  # вызов функции синхронизации данных с 1С
  if config.use_worker:
    # справочник материалов
    for mat_id in changed_materials_in_dict:
      config.qu_default.enqueue_call(
        func=integra1capi.update_material,
        args=(mat_id, usr['email']), timeout=60
      )
    # плановые нормы
    config.qu_default.enqueue_call(
      func=integra1capi.update_plan_norms,
      args=(obj['_id'], usr['email']),timeout=60
    )
  else:
    # справочник материалов
    for mat_id in changed_materials_in_dict:
      integra1capi.update_material(mat_id, usr['email'])
    # плановые нормы
    integra1capi.update_plan_norms(obj['_id'],usr['email'])

  return routine.JSONEncoder().encode({'status':'ok','result':obj,'materialsgroups':sorted(materialsgroupmodel.get_all(),key=lambda a:a['name'])})

@put('/handlers/plannorm/add_new/')
def add_new():
  '''
    Добавление новых норм
  '''
  userlib.check_handler_access("plannorm","w")
  usr = userlib.get_cur_user()
  param = request.json
  contract_id = ObjectId(param['contract_id'])
  production_id = ObjectId(param["production_id"])
  contract = contractmodel.get_by({'_id':contract_id,'productions._id':production_id},{'number':1,'productions.$':1})
  if contract==None:
    return routine.JSONEncoder().encode({'status':'error','msg':"Договор и/или продукция были удалены"})
  # получаю данные плановой нормы
  normlist = planecalculationmodel.find_by({'contract_id':contract_id,"production_id":production_id},{'sector_id':1})
  used_sectors = []
  for n in normlist:
    used_sectors.append(str(n['sector_id']))
  # собираем id материалов для добавления
  glmat_list = materialsgroupmodel.get_all_materials()
  res_sectors = []
  for s in param['sectors']:
    if s['sector_id'] not in used_sectors:
      used_sectors.append(s['sector_id'])
      cursector = sectormodel.get(ObjectId(s['sector_id']))
      if cursector!=None:
        newsec = {'_id': ObjectId()}
        newsec['code'] = countersmodel.get_next_sequence('plannorms')
        newsec['contract_id'] = contract_id
        newsec['contract_number'] = contract["number"]
        newsec['date_change'] = datetime.datetime.utcnow()
        newsec['order_number'] = str(contract['number'])+"."+str(contract['productions'][0]['number'])
        newsec['product_number'] = contract['productions'][0]['number']
        newsec['production_id'] = production_id
        newsec['sector_id'] = ObjectId(s['sector_id'])
        newsec['sector_name'] = cursector['name']
        newsec['user_email'] = usr["email"]
        newsec['sector_code'] = cursector["code"]
        newsec['remarks'] = s.get('remarks')
        newsec['materials'] = []
        for m in s['materials']:
          adm = {}
          adm['pto_size'] = m['pto_size']
          adm["purchase_statuses"] =[]
          adm["purchase_status"] = ""
          adm["unit_price"] = 0
          adm["contract_number"] =contract["number"]
          adm["status"] = 5
          adm["materials_id"] = ObjectId(m['global_id'])
          adm["purchase_user_email"] = ""
          adm["fact_price"] = 0
          adm["fact_size"] = 0
          adm["date_change"] = datetime.datetime.utcnow()
          adm["user_email"] = usr['email']
          adm["date_confirm"] = None
          adm["purchase_date_confirm"] = None
          adm["unique_props"] = ""
          adm["unique_props_info"] = {'key':None, 'name':'', 'items':[], 'type': 'prop' }
          adm["has_blank"] = 0
          adm["unit_production"] = 1
          adm["_id"] = ObjectId()
          for gme in glmat_list:
            if gme["_id"]==m['global_id']:
              adm["materials_group_id"] =ObjectId(gme["group_id"])
              adm["materials_group_key"] = gme["group_code"]
              adm["materials_key"] = gme["code"]
              break
          newsec['materials'].append(adm)
        if 'comment' in s and s['comment']!="":
          newsec['comments'] = [{'date_change':datetime.datetime.utcnow(),'_id':ObjectId(),'user_email':usr['email'],'text':s['comment']}]
        newsec['change_history'] = [{'type':'add', 'date': datetime.datetime.utcnow(), 'user':usr['email'], 'data': s }]

        # сохранение данных  в БД
        planecalculationmodel.add(newsec)

        # вызов функции синхронизации материала с 1С
        if config.use_worker:
          config.qu_default.enqueue_call(func=integra1capi.update_plan_norms, args=(newsec['_id'], usr['email']),timeout=5000)
        else:
          integra1capi.update_plan_norms(newsec['_id'],usr['email'])

        newsec['routine'] = cursector['routine']
        res_sectors.append(newsec)
  return routine.JSONEncoder().encode({'status':'ok','result':res_sectors, 'materialsgroups':sorted(materialsgroupmodel.get_all(),key=lambda a:a['name'])})

@get('/handlers/plannorm/get_history/<contract_number>')
def get_plannorm_history(contract_number):
  userlib.check_handler_access("plannorm","r")
  result = {}
  try:
    usr = userlib.get_cur_user()
    # получаем договор
    contract = contractmodel.get_by({'number':routine.strToInt(contract_number), '$or': [{ "parent_id": { '$exists': False }},{ "parent_id":None},{"parent_id": ''}]})
    if contract==None:
      return {'status':'error', 'msg':'Указанный вами договор не найден. Попробуйте ввести другой номер договора.'}
    elif len(contract.get('productions',[]))==0:
      return {'status':'error', 'msg':'Для указанного договора нет продукции.'}
    # получаем допники
    dop_list = contractmodel.get_list_by({'parent_id': contract['_id']})
    # добавляем продукцию из них в договору
    for d in dop_list:
      for p in d['productions']:
        contract['productions'].append(p)
    # получаем сектора
    sectors = sectormodel.get_all_only_sectors()
    # получаем плановые нормы и историю
    normlist = planecalculationmodel.find_by({'contract_id':contract['_id']},{'code':1, 'comments':1, 'order_number':1,'product_number':1,'production_id':1,'sector_id':1,'sector_name':1, 'sector_code':1, 'materials':1, 'remarks':1, 'change_history':1}).sort("sector_code",1)
    # заносим нормы в продукции
    for n in normlist:
      n['routine'] = 0
      # заполняю routine для сектора
      for s in sectors:
        if s['_id']==str(n['sector_id']):
          n['routine'] = s['routine']
          break

      for p in contract['productions']:
        if p['_id']==n['production_id']:
          if 'sectorlist' not in p:
            p['sectorlist'] = []
          p['sectorlist'].append(n)
          break
    # добавляем работы из нарядов
    works = workordermodel.get({'contract_id':contract['_id'],'production_id':{'$exists':True}},{'production_id':1,'plan_work.work_id':1})
    for w in works:
      for p in contract['productions']:
        if p['_id']==w['production_id']:
          if 'workorder' not in p:
            p['workorder']=[]
          p['workorder'].append(w)
          break
    res = {'status':'ok', 'contract':contract}
    return routine.JSONEncoder().encode(res)
  except Exception, exc:
    print('Error! Get plan norms.')
    excType = exc.__class__.__name__
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})
    pass


@get('/handlers/plannorm/get_materials_to_1c/<order_number>')
def get_materials_to_1c(order_number):
  '''
    Получение данных которые будут отправляться в 1С по номеру заявки
  '''
  from apis.plannorms import plannormsapi
  userlib.check_handler_access("plannorm","r")
  result = {}
  try:
    usr = userlib.get_cur_user()
    res = plannormsapi.get_actual_plan_norms(order_number)
    return routine.JSONEncoder().encode(res)
  except Exception, exc:
    print('Error! get_materials_to_1c.')
    excType = exc.__class__.__name__
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})
    pass
