#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route, get, post, put, request, error, abort, response, debug
import datetime, time
from bson.objectid import ObjectId
from libraries import userlib
from models import sectormodel, materialsgroupmodel, usermodel, planecalculationmodel
import routine
import config
from copy import deepcopy,copy
from traceback import print_exc

@put('/handlers/conformity/savedata')
def api_save_data():
  '''
    Сохранение соответствий материалов работам
  '''
  response.content_type = "application/json; charset=UTF-8"
  userlib.check_handler_access("conformity","w")
  try:
    usr = userlib.get_cur_user()
    dataToSave = request.json
    works = []
    materials = []
    if dataToSave['work']['materials']:
      for i in dataToSave['work']['materials']:
        materials.append(ObjectId(i))
    if dataToSave['material']['works']:
      for i in dataToSave['material']['works']:
        works.append(ObjectId(i))
    # обновление материалов для работы
    sectormodel.update(
      {'works._id': ObjectId(dataToSave['work']['_id'])},
      {'works.$.materials':materials}
    )
    # обновление работ для материалов
    materialsgroupmodel.update(
      {'materials._id': ObjectId(dataToSave['material']['_id'])},
      {'materials.$.works':works}
    )
    return {'status':'ok'}
  except Exception,exc:
    excType = exc.__class__.__name__
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})


@get('/handlers/conformity/get_material_info/<group_code>/<material_code>')
def get_material_info(group_code, material_code):
  '''
    Получение информации о материале
  '''
  userlib.check_handler_access("conformity","w")
  try:
    dataMaterials = materialsgroupmodel.get_materials({'group_code':routine.strToInt(group_code), 'code':routine.strToInt(material_code)})
    if len(dataMaterials)>0:
      result = dataMaterials[0]
      to_remove = ['group_name','works','date_change', 'user_email']
      for field in to_remove:
        del result[field]
      return routine.JSONEncoder().encode( {'status': 'ok','msg':'', 'data':result})
    return routine.JSONEncoder().encode({'status': 'error','msg':'Материал не найден.'})

  except Exception, exc:
    print('---Error. /handlers/conformity/get_material_info; {0}'.format(str(exc)))
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@put('/handlers/conformity/save_material_info')
def save_material_info():
  '''
    Сохранение информации о материале
  '''
  from apis.integra1c import integra1capi
  from apis.plannorms import plannormsapi
  from models import historymodel, countersmodel
  response.content_type = 'application/json; charset=UTF-8'
  userlib.check_handler_access('conformity','w')
  try:
    start = time.clock()
    usr = userlib.get_cur_user()
    dataToSave = request.json
    # тэги материалов
    old_tags = []
    new_tags = []
    need_update_tags = False
    # лейблы материалов
    old_labels = []
    new_labels = []
    need_update_labels = False

    if dataToSave['_id']:
      dataToSave['_id'] = ObjectId(dataToSave['_id'])

      # добавление в историю слепка материала из БД
      old_material_info = materialsgroupmodel.get_one({
        'materials._id': dataToSave['_id']},
        {'materials.$':1}
      )
      historymodel.add(
        dataToSave['_id'],
        'material',
        '',
        old_material_info['materials'][0],
        usr.get('email')
      )
      old_tags = old_material_info['materials'][0].get('tags')
      old_labels = old_material_info['materials'][0].get('labels')

    if dataToSave['manufact_sector_id']:
      dataToSave['manufact_sector_id'] = ObjectId(dataToSave['manufact_sector_id'])
    if dataToSave['out_sector_id']:
      dataToSave['out_sector_id'] = ObjectId(dataToSave['out_sector_id'])

    if dataToSave.get('unique_props'):
      for prop in dataToSave.get('unique_props'):
        if prop['_id']:
          prop['_id'] = ObjectId(prop['_id'])
        else:
          # ессли добавление новой характеристики
          prop['_id'] = ObjectId()
          # if not prop.get('is_active',''):
          #   prop['is_active'] = True
          prop['global_code'] = routine.insert_dash(routine.pad(countersmodel.get_next_sequence('materials'), 6), 3)

        prop['user_email'] = usr['email']
        prop['date_change'] = datetime.datetime.utcnow()

    dataToSave['user_email'] = usr['email']
    dataToSave['date_change'] = datetime.datetime.utcnow()

    # нормализация тэгов если есть такие
    if dataToSave.get('tags') and len(dataToSave['tags'])>0:
      dataToSave['tags'].sort()
      new_tags = dataToSave['tags']
      if (not old_tags and new_tags) or (old_tags and len(old_tags)>0 and '#'.join(old_tags) != '#'.join(new_tags)):
        need_update_tags = True

    # нормализация лейблов
    if dataToSave.get('labels') and len(dataToSave['labels']) > 0:
      new_labels = dataToSave['labels']
      if (not old_labels and new_labels) or (old_labels and len(old_labels) > 0 and '#'.join([lbl['full_id'] for lbl in old_labels]) != '#'.join([lbl['full_id'] for lbl in new_labels])):
        need_update_labels = True

    if dataToSave.get('_id'):
      # при обновлении данных, проверяем не были ли обновлены индивидуальные характеристики
      # для этого получаем информацию о характеристиках из бд и проходим по его уникальным характеристикам
      # список для хранения всех измененных характеристик, для последуещего обновления норм
      changed_props = []
      if dataToSave.get('unique_props'):
        tmp_props = materialsgroupmodel.get_unique_props({'material_id': dataToSave['_id']})
        if len(tmp_props)>0:
          old_props = {}
          for old_prop in tmp_props:
            old_props[str(old_prop['prop_id'])] = old_prop

          # проверка по простым характеристикам
          for prop in dataToSave.get('unique_props'):
            if prop.get('type')=='prop' and str(prop['_id']) in old_props and prop['name']!=old_props[str(prop['_id'])]['prop_name']:
              prop['date_change'] = datetime.datetime.utcnow()
              changed_props.append(prop)
              # если название свойства было изменено, то выполняем обновление пресетов, где данное свойство было задействовано
              # также находим все нормы, в которых был задействован данный материал
              for preset_prop in dataToSave.get('unique_props'):
                for preset_prop_item in preset_prop.get('items',[]):
                  if str(preset_prop_item['_id']) == str(prop['_id']):
                    # если в пресете используется измененное свойство, то обновляем пресет
                    preset_prop_item['name'] = prop['name']
                    if routine.normalize_string(prop['name'])!='' and routine.normalize_string(prop['name'])!='':
                      preset_prop['name'] = preset_prop['name'].replace(old_props[str(prop['_id'])]['prop_name'], prop['name'])
                      preset_prop['date_change'] = datetime.datetime.utcnow()
                    #changed_props.append(preset_prop)

          # проверка по составным характеристикам
          for prop in dataToSave.get('unique_props'):
            if prop.get('type')=='preset' and str(prop['_id']) in old_props and prop['name']!=old_props[str(prop['_id'])]['prop_name']:
              prop['date_change'] = datetime.datetime.utcnow()
              changed_props.append(prop)

      tmp_update = {}
      for key in dataToSave:
        tmp_update['materials.$.' + key] = dataToSave[key]
      materialsgroupmodel.update({'materials._id': dataToSave['_id']}, tmp_update)
      print 'Update material info time: ', time.clock() - start


      # если есть измененные характеристики, то вносим изменения в плановых нормах
      if len(changed_props)>0:
        for prop in changed_props:
          # получение норм в которых задействовано данная характеристика
          plan_norms = planecalculationmodel.get_list_by({'materials.unique_props_info._id': prop['_id']}, {'materials.$':1})
          if len(plan_norms)>0:
            for plan_norm_row in plan_norms:
              for plan_material_row in plan_norm_row['materials']:
                plan_material_row['unique_props'] = prop['name']
                if plan_material_row.get('unique_props_info'):
                  plan_material_row['unique_props_info']['name'] = prop['name']
                  if plan_material_row['unique_props_info'].get('items') and len(plan_material_row['unique_props_info'])>0:
                    if plan_material_row['unique_props_info'].get('type') == 'prop' :
                      for plan_unique_prop_item in plan_material_row['unique_props_info']['items']:
                        plan_unique_prop_item['name'] = prop['name']
                    else:
                      for plan_unique_prop_item in plan_material_row['unique_props_info']['items']:
                        for unique_prop_item in prop.get('items',[]):
                          if str(plan_unique_prop_item['_id']) == str(unique_prop_item['_id']):
                            plan_unique_prop_item['name'] = unique_prop_item['name']
                # обновление материала в плановой норме
                planecalculationmodel.update(
                  {'_id': plan_norm_row['_id'], 'materials._id': plan_material_row['_id']},
                  {'$set': {'materials.$': plan_material_row}}
                )
      print 'Update plan norms material info time: ', time.clock() - start
    else:
      # добавление нового материала
      dataToSave['_id'] = ObjectId()
      # получение глобального сквозного кода материала
      dataToSave['global_code'] = routine.insert_dash(routine.pad(countersmodel.get_next_sequence('materials'), 6), 3)
      dataToSave['works'] = []
      dataToSave['supplier_code'] = ''
      # получить код для нового материала
      dataToSave['code'] = materialsgroupmodel.get_next_sequence_material(dataToSave['group_code'], dataToSave.get('type','standart'))
      materialsgroupmodel.add_material_to_group(dataToSave['group_code'], dataToSave)
      materialsgroupmodel.apply_sequence_material(dataToSave['group_code'], dataToSave['code'], dataToSave.get('type','standart'))

    if config.use_worker:
      # если обновились тэги по материалу, то вызвать обновление в спецификациях
      if need_update_tags:
        config.qu_default.enqueue_call(func=plannormsapi.update_material_tags, args=(dataToSave['_id'], new_tags), timeout=60)
      # если обновились леиблы по материалу, то вызвать обновление в спецификациях
      # if need_update_labels:
      #   config.qu_default.enqueue_call(func=plannormsapi.update_material_lebels, args=(dataToSave['_id'], new_labels), timeout=60)
      # вызоов функции синхронизации материала с 1С
      config.qu_default.enqueue_call(func=integra1capi.update_material, args=(dataToSave['_id'], usr['email']), timeout=60)
    else:
      # если обновились тэги по материалу, то вызвать обновление в спецификациях
      if need_update_tags:
        plannormsapi.update_material_tags(dataToSave['_id'], new_tags)

      # # если обновились лейблы по материалу, то вызвать обновление в спецификациях
      # if need_update_labels:
      #   plannormsapi.update_material_labels(dataToSave['_id'], new_labels)

      # выхов функции синхронизации материала с 1С
      integra1capi.update_material(dataToSave['_id'],usr['email'])

    return routine.JSONEncoder().encode({'status': 'ok','data':dataToSave})
  except Exception,exc:
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@get('/handlers/conformity/search_linked_materials/')
def search_linked_materials():
  '''
    Поиск материалов по названию
  '''
  import re
  userlib.check_handler_access("conformity","r")
  q = request.query.get('q')
  data = materialsgroupmodel.get_materials({'name':re.compile('.*'+q+'.*', re.IGNORECASE)})
  res = []
  for row in data:
    row['label'] = '{0}.{1} {2}'.format(row['group_code'], row['code'], row['name'])
    res.append(row)
    if len(res)>20:
      break
  return routine.JSONEncoder().encode(res)

@get('/handlers/conformity/search_material_by_code/')
def search_material_by_code():
  '''
    Поиск материалов по названию
  '''
  import re
  userlib.check_handler_access("conformity","r")
  q = request.query.get('q')
  data = materialsgroupmodel.get_materials({'name':re.compile('.*'+q+'.*', re.IGNORECASE)})
  res = []
  for row in data:
    row['label'] = '{0}.{1} {2}'.format(row['group_code'], row['code'], row['name'])
    res.append(row)
    if len(res)>20:
      break
  return routine.JSONEncoder().encode(res)

@get('/handlers/conformity/get_esud_material_groups/')
def get_esud_material_groups():
  '''
    Получение справолчника материалов
  '''
  userlib.check_handler_access("conformity","r")
  from apis.esud import esudapi
  from models import routinemodel
  try:
    result = esudapi.get_simple_dir_tree_with_sectors()
    routinemodel.update({'key':'spec2_groups_cache'}, {
      'last_update':datetime.datetime.utcnow(),
      'data': routine.JSONEncoder().encode(result)
    })
    return routine.JSONEncoder().encode({'status': 'ok','msg':'', 'data':result})
  except Exception, exc:
    print('---Error. /handlers/conformity/get_esud_material_groups; {0}'.format(str(exc)))
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})
