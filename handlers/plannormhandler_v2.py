#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import  get, post, put, request, response
import datetime
import os
from traceback import print_exc
#--------
from libraries import userlib
import routine
import config

@post('/handlers/plannorm_v2/close/')
def close():
  '''
    Закрытие пользователем спецификации
  '''
  from apis.services import multi_page_access_helper
  try:
    request_data = request.json
    multi_page_access_helper.remove_user_from_page(request_data.get('page_key'), userlib.get_cur_user())
    return routine.JSONEncoder().encode({ 'status':'ok' })
  except Exception, exc:
    print_exc()
    return routine.JSONEncoder().encode( {'status':'error', 'msg': str(exc)})

@post('/handlers/plannorm_v2/search/')
def search():
  '''
    Получение плановых норм по номеру заказа
    searchObj = {'number', document_type}
    document_type = ['order', 'contract', 'template']
  '''
  import gzip
  import StringIO
  from apis.esud import esudapi
  from apis.plannorms import plannormsapi_v2
  from apis.services import multi_page_access_helper
  from models import materialsgroupmodel
  userlib.check_handler_access("plannorm", "r")

  try:
    request_data = request.json

    # номер заказа
    search_obj = request_data.get('search_obj')

    # нужно ли грузить справочник разделов и групп из ЭСУД
    need_materials_dictionary = request_data.get('need_materials')

    if not search_obj or not search_obj.get('number'):
      raise Exception('Не заданы критерии поиска данных.')

    # справочник разделов и групп из ЭСУД
    groups = esudapi.get_simple_dir_tree_with_sectors()
    linear_groups = esudapi.makeLinearsGroups(groups)

    # справочник материалов
    materials = { str(v['_id']):v for v in materialsgroupmodel.get_materials() }

    # информация по рассчетам
    data = plannormsapi_v2.get_norms_by_search_number(search_obj)

    # подготовка материалов спецификакий
    # добавление информации о разделах и группах
    specification_info = data['specification_info']

    if specification_info:
      for row in specification_info.get('materials', []):
        # дозаполнение данных из справочника категорий
        if row.get('sector_id'):
          row['sector_routine'] = linear_groups[row['sector_id']].get('routine')
          row['sector_number'] = linear_groups[row['sector_id']].get('number')
          row['sector_name'] = linear_groups[row['sector_id']].get('name')
        if row.get('category_id') and row['category_id'] in linear_groups:
          row['category_routine'] = linear_groups[row['category_id']].get('routine',0)
          row['category_number'] = linear_groups[row['category_id']].get('number')
          row['category_name'] = linear_groups[row['category_id']].get('name')
        if row.get('group_id'):
          row['group_routine'] = linear_groups[row['group_id']].get('routine')
          row['group_number'] = linear_groups[row['group_id']].get('number')
          row['group_name'] = linear_groups[row['group_id']].get('name')

        # дозаоплнение данных из справочника материалов
        row['materials_global_code'] = materials.get(str(row['materials_id']),{}).get('global_code')
        row['materials_unit_pto'] = materials.get(str(row['materials_id']),{}).get('unit_pto','')
        row['materials_name'] = materials.get(str(row['materials_id']),{}).get('name','')
        row['materials_group_name'] = materials.get(str(row['materials_id']),{}).get('group_name','')

      # multi page access--------------
      multi_page_access_helper.add_new_user_to_page(
        'orderspecification2#' + str(specification_info['_id']),
        userlib.get_cur_user()
      )
      # -------------------------------

    res = routine.JSONEncoder().encode({
      'status': 'ok',
      'object_info': data['object_info'],
      'data': specification_info,
      'groups': groups,
      'materials': materials if need_materials_dictionary == 'yes' else None,
      'access_page_info': multi_page_access_helper.get_page_info('orderspecification2#' + str(specification_info['_id'])) if specification_info else None
    })

    response.add_header('Content-Encoding', 'gzip')
    s = StringIO.StringIO()
    with gzip.GzipFile(fileobj=s, mode='w') as f:
      f.write(res)
    return s.getvalue()

  except Exception, exc:
    print_exc()
    return {'status':'error', 'msg': str(exc)}


@post('/handlers/plannorm_v2/save_group_calculations/')
def save_group_calculations():
  '''
    Сохранение групповых расчетов
  '''
  from apis.plannorms import plannormsapi_v2
  userlib.check_handler_access("plannorm","r")

  try:
    usr = userlib.get_cur_user()

    request_data = request.json
    # data vith groups and values
    data = request_data.get('data')
    # specification id if exists
    specification_id = request_data.get('specification_id')
    # save data
    specification = plannormsapi_v2.save_groups_values(
      specification_id,
      data,
      usr["email"]
    )

    # # вызов функции синхронизации материала с 1С
    # specification_id = specification['_id']
    # if config.use_worker:
    #   config.qu_default.enqueue_call(
    #     func=integra1capi.update_plan_norms,
    #     args=(specification_id, usr['email'])
    #   ,timeout=5000)
    # else:
    #   integra1capi.update_plan_norms(specification_id,usr['email'])
    # #------

    return routine.JSONEncoder().encode({'status':'ok', 'msg': '', 'data': specification })
  except Exception, exc:
    print_exc()
    return {'status':'error', 'msg': str(exc)}

@post('/handlers/plannorm_v2/add_new_material_to_calculation/')
def add_new_material_to_calculation():
  '''
    Добавление нового материала в расчеты
  '''
  from apis.plannorms import plannormsapi_v2
  from apis.integra1c import integra1capi
  userlib.check_handler_access("plannorm","r")

  try:
    usr = userlib.get_cur_user()
    request_data = request.json
    material_to_save = request_data.get('material')
    specification_id = request_data.get('specification_id')
    # save data
    result = plannormsapi_v2.add_new_material_to_calculation(
      material_to_save,
      specification_id,
      usr['email'],
      usr.get('fio',''),
    )

    # вызов функции синхронизации материала с 1С
    if config.use_worker:
      config.qu_default.enqueue_call(
        func=integra1capi.update_plan_norms,
        args=(specification_id, usr['email'])
      ,timeout=5000)
    else:
      integra1capi.update_plan_norms(specification_id,usr['email'])
    #------
    return routine.JSONEncoder().encode({'status':'ok', 'msg': '', 'data': result })
  except Exception, exc:
    print_exc()
    return {'status':'error', 'msg': str(exc)}

@post('/handlers/plannorm_v2/remove_material_from_calculation/')
def remove_material_from_calculation():
  '''
    Добавление нового материала в расчеты
  '''
  from apis.plannorms import plannormsapi_v2
  from apis.integra1c import integra1capi
  userlib.check_handler_access("plannorm","r")

  try:
    usr = userlib.get_cur_user()
    request_data = request.json
    material_id = request_data.get('material_id')
    category_id = request_data.get('category_id')
    group_id = request_data.get('group_id')
    specification_id = request_data.get('specification_id')
    # save data
    result = plannormsapi_v2.remove_material_from_calculation(material_id, category_id, group_id, specification_id, usr['email'], usr.get('fio',''))

    # вызов функции синхронизации материала с 1С
    if config.use_worker:
      config.qu_default.enqueue_call(
        func=integra1capi.update_plan_norms,
        args=(specification_id, usr['email'])
      ,timeout=5000)
    else:
      integra1capi.update_plan_norms(specification_id,usr['email'])
    #------

    return routine.JSONEncoder().encode({'status':'ok', 'msg': '', 'data': result })
  except Exception, exc:
    print_exc()
    return {'status':'error', 'msg': str(exc)}


@post('/handlers/plannorm_v2/save/')
def save():
  '''
    Save materials to specifiaction
  '''
  from apis.plannorms import plannormsapi_v2
  from apis.integra1c import integra1capi
  from apis.esud import esudapi
  from models import materialsgroupmodel, datamodel
  userlib.check_handler_access("plannorm","r")

  try:
    usr = userlib.get_cur_user()
    request_data = request.json
    note = request_data.get('note')
    materials_to_save = request_data.get('materials')
    specification_id = request_data.get('specification_id')
    # save data
    result = plannormsapi_v2.save_calculation(materials_to_save, specification_id, note, usr['email'], usr.get('fio',''))

    # dictionary of categories and groups
    groups = esudapi.get_simple_dir_tree_with_sectors()
    linear_groups = esudapi.makeLinearsGroups(groups)
    # справочник материалов
    materials = { str(v['_id']):v for v in materialsgroupmodel.get_materials() }
    # подготовка материалов спецификакий
    # добавление информации о разделах и группах
    for row in result.get('materials', []):
      # дозаполнение данных из справочника категорий
      if row.get('category_id') and row['category_id'] in linear_groups:
        row['category_routine'] = linear_groups[row['category_id']].get('routine',0)
        row['category_number'] = linear_groups[row['category_id']].get('number')
        row['category_name'] = linear_groups[row['category_id']].get('name')
      if row.get('group_id'):
        row['group_routine'] = linear_groups[row['group_id']].get('routine')
        row['group_number'] = linear_groups[row['group_id']].get('number')
        row['group_name'] = linear_groups[row['group_id']].get('name')
      if row.get('sector_id'):
        row['sector_routine'] = linear_groups[row['sector_id']].get('routine')
        row['sector_number'] = linear_groups[row['sector_id']].get('number')
        row['sector_name'] = linear_groups[row['sector_id']].get('name')

      # дозаоплнение данных из справочника материалов
      row['materials_global_code'] = materials.get(str(row['materials_id']),{}).get('global_code')
      row['materials_unit_pto'] = materials.get(str(row['materials_id']),{}).get('unit_pto','')
      row['materials_name'] = materials.get(str(row['materials_id']),{}).get('name','')
      row['materials_group_name'] = materials.get(str(row['materials_id']),{}).get('group_name','')

    # вызов функции синхронизации материала с 1С
    if config.use_worker:
      config.qu_default.enqueue_call(
        func=integra1capi.update_plan_norms,
        args=(specification_id, usr['email'])
      ,timeout=5000)
    else:
      integra1capi.update_plan_norms(specification_id,usr['email'])
    #------
    #
    return routine.JSONEncoder().encode({'status':'ok', 'msg': '', 'data': result })
  except Exception, exc:
    print_exc()
    return {'status':'error', 'msg': str(exc)}

@post('/handlers/plannorm_v2/add_new_specification/')
def add_new_specification():
  '''
    Add new specification
    ---------------------------
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
    ------------------
    search_obj = {'number', document_type}
    document_type = ['order', 'contract', 'template']
  '''
  from apis.plannorms import plannormsapi_v2
  from apis.integra1c import integra1capi
  userlib.check_handler_access("plannorm","w")

  try:
    usr = userlib.get_cur_user()
    request_data = request.json
    object_info = request_data.get('object_info') if request_data.get('object_info') else None
    search_obj = request_data.get('search_obj')
    result = plannormsapi_v2.add_new_specification_by(object_info, search_obj, usr['email'])

    # вызов функции синхронизации материала с 1С
    specification_id = result['_id']
    if config.use_worker:
      config.qu_default.enqueue_call(
        func=integra1capi.update_plan_norms,
        args=(specification_id, usr['email'])
      ,timeout=5000)
    else:
      integra1capi.update_plan_norms(specification_id,usr['email'])
    #------
    return routine.JSONEncoder().encode({
      'status':'ok',
      'data': result,
    })
  except Exception, exc:
    print_exc()
    return {'status':'error', 'msg': str(exc)}

@post('/handlers/plannorm_v2/set_order_to_specification/')
def set_order_to_specification():
  '''
    Set order to specification
    --------------
    specification_id - id of specification to update
    search_obj = {'number', document_type}
  '''
  from apis.plannorms import plannormsapi_v2
  from apis.integra1c import integra1capi
  userlib.check_handler_access("plannorm","w")

  try:
    usr = userlib.get_cur_user()
    request_data = request.json
    specification_id = request_data.get('specification_id')
    search_obj = request_data.get('search_obj')
    result = plannormsapi_v2.set_order_to_specification(specification_id, search_obj, usr['email'])


    # вызов функции синхронизации материала с 1С
    if config.use_worker:
      config.qu_default.enqueue_call(
        func=integra1capi.update_plan_norms,
        args=(specification_id, usr['email'])
      ,timeout=5000)
    else:
      integra1capi.update_plan_norms(specification_id,usr['email'])
    #------

    res = routine.JSONEncoder().encode({
      'status': 'ok',
      'order': result['object_info'],
      'data': result['specification_info']
    })
    response.add_header('Content-Encoding', 'gzip')
    s = StringIO.StringIO()
    with gzip.GzipFile(fileobj=s, mode='w') as f:
      f.write(res)
    return s.getvalue()

  except Exception, exc:
    print_exc()
    return {'status':'error', 'msg': str(exc)}


@post('/handlers/plannorm_v2/check_if_link_available/')
def check_if_link_available():
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
    search_obj = {'number', document_type}
    operation_type = import/export
    sector_id - id of sector to transfer
    category_id  - id of category fo transfer
    group_id - id of group to transfer
  '''
  from apis.plannorms import plannormsapi_v2
  userlib.check_handler_access("plannorm","w")

  try:
    usr = userlib.get_cur_user()
    request_data = request.json

    object_info = request_data.get('object_info')
    search_obj = request_data.get('search_obj')
    operation_type = request_data.get('operation_type')
    sector_id = request_data.get('sector_id')
    category_id = request_data.get('category_id')
    group_id = request_data.get('group_id')

    result = plannormsapi_v2.check_if_link_available(
      object_info,
      search_obj,
      operation_type,
      usr['email'],
      sector_id,
      category_id,
      group_id
    )

    return routine.JSONEncoder().encode({
      'status': 'ok',
      'can_be_linked': result['can_be_linked'],
      'msg': result['msg'],
    })
  except Exception, exc:
    print_exc()
    return {'status':'error', 'msg': str(exc)}

@post('/handlers/plannorm_v2/link_specification/')
def link_specification():
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
    search_obj = {'number', document_type}
    operation_type = import/export
    sector_id - id of sector to transfer
    category_id  - id of category fo transfer
    group_id - id of group to transfer
  '''
  from apis.plannorms import plannormsapi_v2
  from apis.integra1c import integra1capi
  userlib.check_handler_access("plannorm","w")

  try:
    usr = userlib.get_cur_user()
    request_data = request.json
    object_info = request_data.get('object_info')
    search_obj = request_data.get('search_obj')
    operation_type = request_data.get('operation_type')
    sector_id = request_data.get('sector_id')
    category_id = request_data.get('category_id')
    group_id = request_data.get('group_id')

    result = plannormsapi_v2.link_specification(
      object_info,
      search_obj,
      operation_type,
      usr['email'],
      usr.get('fio', ''),
      sector_id,
      category_id,
      group_id
    )


    # вызов функции синхронизации материала с 1С
    specification_id = result['object_info_detail']['specification_info']['_id']

    if config.use_worker:
      config.qu_default.enqueue_call(
        func=integra1capi.update_plan_norms,
        args=(specification_id, usr['email'])
      ,timeout=5000)
    else:
      integra1capi.update_plan_norms(specification_id, usr['email'])
    #------

    return routine.JSONEncoder().encode({
      'status': 'ok',
      'msg': '',
    })
  except Exception, exc:
    print_exc()
    return {'status':'error', 'msg': str(exc)}


@get('/handlers/plannorm_v2/download_to_google/<specification_number>')
def download_to_google_test(specification_number):
  '''
    Download specification data to google
  '''
  from apis.plannorms import plannormsapi_v2
  userlib.check_handler_access("plannorm","r")
  try:
    usr = userlib.get_cur_user()
    data = plannormsapi_v2.get_report_data(routine.strToInt(specification_number), 1)
    return routine.JSONEncoder().encode(data)
  except Exception, exc:
    print_exc()
    return {'status':'error', 'msg': str(exc)}

@post('/handlers/plannorm_v2/download_to_google/')
def download_to_google():
  '''
    Download specification data to google
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
  '''
  from apis.plannorms import plannormsapi_v2
  userlib.check_handler_access("plannorm","r")

  try:
    usr = userlib.get_cur_user()
    request_data = request.json
    object_info = request_data.get('object_info')
    product_unit_number = request_data.get('product_unit_number')
    document_id = plannormsapi_v2.download_to_google(
      routine.strToInt(object_info['specification_number']),
      product_unit_number,
      usr['email']
    )
    return routine.JSONEncoder().encode({
      'status': 'ok',
      'msg': '',
      'document_id': document_id
    })
  except Exception, exc:
    print_exc()
    return {'status':'error', 'msg': str(exc)}

@get('/handlers/plannorm_v2/get_dir/<specification_number>')
def get_dir(specification_number):
  '''
    Get report data for tests
  '''
  from apis.plannorms import plannormsapi_v2
  userlib.check_handler_access("plannorm","r")
  try:
    usr = userlib.get_cur_user()
    data = plannormsapi_v2.get_report_data(routine.strToInt(specification_number), 1)
    return routine.JSONEncoder().encode(data)
  except Exception, exc:
    print_exc()
    return {'status':'error', 'msg': str(exc)}

@get('/handlers/plannorm_v2/get_data_for_material_edit_form/<material_id>')
def get_data_for_material_edit_form(material_id):
  '''
    Get data for material edit form
  '''
  from apis.esud import esudapi
  from models import sectormodel, materialsgroupmodel
  from bson.objectid import ObjectId
  userlib.check_handler_access("plannorm","r")

  try:
    usr = userlib.get_cur_user()
    data_sectors = []
    data_materials_groups = []
    # получение участков и работ
    data_sectors_cursor = sectormodel.get_by(
      {'is_active':1},
      {
        '_id':1,
        'name':1,
        'routine':1,
        'type':1,
        'is_active':1,
        'code':1,
        'works._id':1,
        'works.code':1,
        'works.name':1,
        'works.is_active':1,
        'works.routine':1,
        'works.materials':1
      }
    )
    data_sectors_cursor.sort(key = lambda x: (x['type'],x['name']))
    for i in data_sectors_cursor:
      i.get('works',[]).sort(key = lambda x: x['name'])
      data_sectors.append(i)

    # получение групп материалов и материалов
    data_materials_groups_cursor = materialsgroupmodel.get_by(
      {'is_active':1},
      {
        '_id':1,
        'name':1,
        'routine':1,
        'is_active':1,
        'code':1,
        'materials._id':1,
        'materials.code':1,
        'materials.name':1,
        'materials.is_active':1,
        'materials.routine':1,
        'materials.works':1
      }
    ).sort([('name',1),("materials.name",1)])
    for i in data_materials_groups_cursor:
      i.get('materials',[]).sort(key = lambda x: x['name'])
      data_materials_groups.append(i)

    # получение списка единиц измерений
    material_units = materialsgroupmodel.get_all_units()
    # получение меток из ЭСУД
    labels = esudapi.get_simple_dir_tree_with_sectors()

    # получение информации о материале, если задан в условии его идентификатор
    data_material_info = {}
    if material_id != "new":
      dataMaterials = materialsgroupmodel.get_materials({'_id': ObjectId(material_id) })
      if len(dataMaterials)==0:
        raise Exception('Материал не найден.')
      data_material_info = dataMaterials[0]
      # to_remove = ['group_name','works','date_change', 'user_email']
      # for field in to_remove:
      #   del result[field]

    return routine.JSONEncoder().encode({'status':'ok', 'data':{
      'material_info': data_material_info,
      'sectors':data_sectors,
      'materials_groups':data_materials_groups,
      'material_units': material_units,
      'labels': labels
    }})
  except Exception, exc:
    print_exc()
    return {'status':'error', 'msg': str(exc)}
