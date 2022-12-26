#!/usr/bin/python
# -*- coding: utf-8 -*-
import datetime, time, routine, config
from bson.objectid import ObjectId
from bson.binary import Binary
from libraries import userlib
from models import datamodel, specificationmodel, complectmodel, queuemodel, countersmodel
from apis.esud import esudapi
from traceback import print_exc
import re
from copy import deepcopy,copy
import hashlib
import gc

def api_get_complectinfo(number):
  '''
  Функция получение информации о комплекте
  '''
  try:
    # информация о комплекте
    complect_info =  complectmodel.get_by({'number': number})
    if complect_info:
      # сбор информации о спецификациях, задействованных в комплекте
      need_specs_number = []
      for item in complect_info['items']:
        need_specs_number.append(item['specification']['number'])
      # получение необхдимых спецификаций
      need_specs_items = specificationmodel.get_list_by({'number':{'$in':need_specs_number } }, {'properties':1, 'number':1})
      need_specs_items_arr = {}
      for item in need_specs_items:
        need_specs_items_arr[item['number']] = item['properties']
      for item in complect_info['items']:
        item['specification']['properties'] = need_specs_items_arr.get(item['number'], [])
    return complect_info

  except Exception, exc:
    excType = exc.__class__.__name__
    print_exc()
    raise Exception(str(exc))


def api_background_save(queue_key,  usr):
  '''
  Сохранение комлпекта в бэкграунде
  '''

  # локальная функция подготовки данных к сохранению
  def prepare_data(data):
    # Функция формирования prop_key для заданных свойств
    def make_prop_keys(props):
      if props:
        for prop in props:
          prop['prop_key']= prop['name'] + '_' + str((prop['value'] or {}).get('value',''))+'_' +str(((prop['value'] or{}).get('unit',{}) or {}).get('name',''))

    # Функция получения изделий в моделе
    def get_model_items(model, group, result):
      if model.get('is_techno_group') or model.get('is_buy_group'):
        group.append({
          'name': model['node']['name'],
          'origin_id': model['node'].get('datalink') if model['node'].get('datalink') else model['node'].get('_id'),
          'is_techno_group': model.get('is_techno_group'),
          'is_buy_group': model.get('is_buy_group'),

        })
        for cm in model.get('models',[]):
          get_model_items(cm, group, result)
      else:
        for p in model.get('items',[]):
          p['group'] = group
          result.append(p)

    # Функция формирования автоматического комента
    def get_auto_note(props):
      if props:
        try:
          note =  ["{0}: {1}{2}".format(prop.get('name',''), prop.get('value',''),  ' ' + prop.get('unit') if  prop.get('unit',None) else '' ) for prop in props]
          return '; '.join(note)
        except:
          return ''
    result = {
      '_id': None, # идентификатор комплекта
      'note': data.get('note',''), # пользовательская пометка
      'auto_note': data.get('auto_note',''), # автоматическая пометка
      'number': '', # номер комплекта
      'name': data['node']['name'],# наименование
      'config_number': data['node']['number'],# номер конфигурации на базе которой создается комлпект
      'config_id': data['node']['_id'], # id конфигурации на базе которой создается комлпект
      'group': data.get('group',[]), # название группирующей модели если входит в такую
      'properties': [], # свойства комплекта
      # количество на уровне изделия
      'count':
      {
        'value': data['count'].get('origin_value',0),
        'unit': data['count']['unit'],
        'unit_origin_id': data['count'].get('unit_datalink') if data['count'].get('unit_datalink') else data['count'].get('unit_id')
      },
      'items': [] # конфигурации комплекта
    }

    # свойства
    # формирование ключей для свойств
    make_prop_keys(data['properties'])
    # сортировка по ключам - спецификациям
    data['properties'].sort(key = lambda x: (x['prop_key']))
    for prop in data['properties']:
      if prop.get('is_specification'):
        if str(prop.get('datalink')) != str(datamodel.SYSTEM_OBJECTS['VOL_TOLERANCE_PROP']) and str(prop.get('datalink')) != str(datamodel.SYSTEM_OBJECTS['VOL_PER_UNIT_PROP']) and  str(prop.get('datalink')) != str(datamodel.SYSTEM_OBJECTS['AMOUNT_PROP']) and  str(prop.get('datalink')) != str(datamodel.SYSTEM_OBJECTS['TOLERANCE_ON_VOL_PROP']):
          # если значение свойства получается путем наследования, то необходимо брать
          # отнаследованное значение
          tmp_value = (prop.get('value',{})or{})
          tmp_unit = ((prop.get('value',{})or{}).get('unit',{}) or {})
          tmp_sub_unit = (tmp_unit.get('unit',{})or{})
          if tmp_value.get('is_inherit'):
            tmp_value = (prop.get('inherited_value',{})or{})
            tmp_unit = ((prop.get('inherited_value',{})or{}).get('unit',{}) or {})
            tmp_sub_unit = (tmp_unit.get('unit',{})or{})
          tmp_new_prop = {
            'origin_id':  prop.get('datalink') if prop.get('datalink') else prop.get('_id') ,
            'name': prop.get('name'),
            'value': tmp_value.get('value'),
            'value_origin_id': tmp_value.get('datalink') if  tmp_value.get('datalink') else tmp_value.get('_id'),
            'unit': tmp_unit.get('name'),
            'unit_origin_id': tmp_unit.get('datalink') if tmp_unit.get('datalink') else tmp_unit.get('_id'),
            'sub_unit': tmp_sub_unit.get('name'),
            'sub_unit_origin_id': tmp_sub_unit.get('datalink') if tmp_sub_unit.get('datalink') else tmp_sub_unit.get('_id'),
            'routine': prop.get('routine'),
            'is_optional': prop.get('is_optional') or prop.get('is_inherit'), # опциональное свойство  или нет
            'is_techno': prop.get('is_techno'), # технологическое свойство  или нет
          }
          result['properties'].append(tmp_new_prop)

    # формирование автоматической пометки
    result['auto_note'] = get_auto_note(result['properties'])
    for model in data.get('models',[]):
      items = []
      get_model_items(model,[], items)
      if items and len(items)>0:
        for item in items:
          #new_item = prepare_data_from_config_to_specification(item)
          new_item = {
            '_id': item['node']['_id'],
            'model_id' :item['model_id'],
            'number': item['node']['number'],
            'name': item['node']['name'],
            'group': item.get('group',[]), # название группирующей модели если входит в такую
            # количество на уровне изделия
            'count':
            {
              'value': item['count'].get('value',0),
              'unit': item['count']['unit'],
              'unit_origin_id': item['count'].get('unit_datalink') if item['count'].get('unit_datalink') else item['count'].get('unit_id')
            },
            'properties': [], # свойства
            'is_clone': item.get('is_clone',False), # свойства
          }
          for prop in item['properties']:
            if prop.get('is_specification'):
              if str(prop.get('datalink')) != str(datamodel.SYSTEM_OBJECTS['VOL_TOLERANCE_PROP']) and str(prop.get('datalink')) != str(datamodel.SYSTEM_OBJECTS['VOL_PER_UNIT_PROP']) and  str(prop.get('datalink')) != str(datamodel.SYSTEM_OBJECTS['AMOUNT_PROP']) and  str(prop.get('datalink')) != str(datamodel.SYSTEM_OBJECTS['TOLERANCE_ON_VOL_PROP']):
                # если значение свойства получается путем наследования, то необходимо брать
                # отнаследованное значение
                tmp_val = prop.get('value') or {}
                if tmp_value.get('is_inherit'):
                  tmp_val = tmp_val.get('inherited_value') or {}
                new_item['properties'].append(
                  {
                    'origin_id':  prop.get('datalink') if prop.get('datalink') else prop.get('_id') ,
                    'name': prop.get('name'),
                    'value': tmp_val.get('value'),
                    'unit': (tmp_val.get('unit') or {}).get('name'),
                    'unit_origin_id': (tmp_val.get('unit',{}) or {}).get('datalink') if  (tmp_val.get('unit',{}) or {}).get('datalink') else (tmp_val.get('unit',{}) or {}).get('_id'),
                    'value_origin_id': tmp_val.get('datalink') if tmp_val.get('datalink') else tmp_val.get('_id'),
                    'is_optional': prop.get('is_optional') or prop.get('is_inherit'), # опциональное свойство  или нет
                    'is_techno': prop.get('is_techno') # технологическое свойство  или нет
                  })

          new_item['specification'] ={
            'name': item['specification']['name'],
            'number': item['specification']['number'],
            'config_number': item['specification']['config_number'],
            'is_buy': item['specification']['is_buy'],
          }
          result['items'].append(new_item)
    return result

  # kjrfkmyfz функция сохранения комлпекта
  # usr - пользователь
  # data - дерево данных комлпекта на сохранение
  # old_complect_info -  информация о старом комплекте
  def save_data(usr, data, old_complect_info, data_save_type):
    new_complect_number = None
    if not old_complect_info or data_save_type == 'new':
      # получить номер для новой спецификации
      new_complect_id = ObjectId()
      new_complect_number =  datamodel.get_next_sequence_complect(ObjectId(data['config_id']))

      data['_id'] = new_complect_id
      data['number'] = data['config_number'] + '.' + str(routine.pad(new_complect_number, 4))
      # блок истории
      data['history']=[{
        'date': datetime.datetime.utcnow(),
        'user': usr['email'],
        'type': 'add'
      }]
      data['add'] = {
        'date': datetime.datetime.utcnow(),
        'user': usr['email'],
      }
      # дата модификации комплекта
      data['last_change']={
        'date': datetime.datetime.utcnow(),
        'user': usr['email']
      }
      # добавление новой спецификации
      complectmodel.add(data)
      # обновление статуса по счетчику
      if new_complect_number:
        datamodel.update_by(
          {'_id': ObjectId(data['config_id']), 'complect_seq_arr.i': new_complect_number},
          {'$set': {'complect_seq_arr.$.status':True }}
        )

    else:
      # если пересохранение старого комлпекта
      data['_id'] = ObjectId(old_complect_info['_id'])
      data['number'] = old_complect_info['number']

      # блок истории
      data['history']=[{
        'date': datetime.datetime.utcnow(),
        'user': usr['email'],
        'type': 'update'
      }]
      data['update'] = {
        'date': datetime.datetime.utcnow(),
        'user': usr['email'],
      }
      data['last_change']={
        'date': datetime.datetime.utcnow(),
        'user': usr['email']
      }
      # обновление спецификации
      complectmodel.update(str(data['_id']), data)
    return data

  try:
    # получение параметров на обработку из БД
    zipped_data =  queuemodel.get({'_id':ObjectId(queue_key)}, None)['params']
    data = routine.JSONDecode(routine.decompress(zipped_data, "deflate"))
    # тип сохранения данных(касается только сохранения существующих спецификаций)
    data_save_type = data.get('save_type')

    # если идет создание новой спецификации и введена пользовательская пометка
    # необходимо проверить ее на уникальность в рамках исходной конфигурации
    if  (not data.get('complect_info') or data_save_type == 'new') and  data['data'].get('note'):
      # получение комлпектов с указанной пометкой
      tmp_data = complectmodel.get_list_by({'config_number': data['data']['node']['number'], 'note': data['data']['note'] })
      if len(tmp_data)>0:
        queuemodel.update(queue_key, {'status': 'error', 'note': 'В системе уже есть комлпекты с указанным примечанием: {0}. Измените примечание и повторите попытку.'.format('; '.join([row['number'] for row in tmp_data])), 'data': None, 'finish_date': datetime.datetime.utcnow() })
        return

    queuemodel.update(queue_key, {'status': 'in_progress', 'percent_complete': 40, 'params': None})
    start = time.clock()
    print "Start save complect"
    # приведение данных к нужному формату
    new_data = prepare_data(data.get('data'))
    print "Time prepare data  is: ", time.clock() - start
    start = time.clock()
    # сохранение комлпекта
    new_complect = save_data(usr, new_data, data.get('complect_info'), data_save_type)
    queuemodel.update(queue_key, {'status': 'in_progress', 'percent_complete':90})
    print "Time save complect is: ", time.clock() - start
    complect_info = None
    try:
      complect_info = api_get_complectinfo(new_complect['number'])
    except:
      pass

    res = routine.JSONEncoder().encode({'status': 'ok', 'complect_info': new_complect, 'complect_data': complect_info})
    queuemodel.update(queue_key, {'status': 'ok', 'note': '', 'data': Binary(routine.compress(res)), 'finish_date': datetime.datetime.utcnow()})
    gc.collect()
  except Exception, exc:
    excType = exc.__class__.__name__
    print_exc()
    queuemodel.update(queue_key, {'status': 'error', 'note': str(exc), 'data': None, 'finish_date': datetime.datetime.utcnow() })

def api_background_calculate(queue_key, zipped_data, usr):
  '''
  Функция сбора дерева комплекта
  Функция выполняется в бэкграунде, используя воркеры.
  queue_key - идентификатор очереди
  number - номер модели/конфигурации/комплекта
  '''
  from apis.esud import esudspecificationapi
  from models import queuemodel
  try:
    cache_data = {}
    # unzip data
    data = routine.JSONDecode(routine.decompress(zipped_data, "deflate"))
    percent_complete =10;
    if not data.get('number'):
      queuemodel.update(queue_key, {'status': 'error', 'note': 'Заданы неверные параметры для получения данных.', 'data': None, 'finish_date': datetime.datetime.utcnow() })
      return
    number = data.get('number')
    config_number = None # Артикул конфигурации
    complect_number = None  # Артикул комплекта
    if not number:
      queuemodel.update(queue_key, {'status': 'error', 'note': 'Заданы неверные параметры для получения данных.', 'data': None, 'finish_date': datetime.datetime.utcnow() })
      return
    number_items = number.split('.')
    if len(number_items)>3:
      queuemodel.update(queue_key, {'status': 'error', 'note': 'Заданы неверные параметры для получения данных.', 'data': None, 'finish_date': datetime.datetime.utcnow() })
      return

    config_number = "{0}".format(str(number_items[0]))

    if len(number_items)>1:
      config_number = "{0}.{1}".format(str(number_items[0]), str(number_items[1])) if str(number_items[1])!="000" else str(number_items[0])
    if len(number_items)>2:
      complect_number = "{0}.{1}.{2}".format(str(number_items[0]), str(number_items[1]), str(number_items[2]))

    complect_info = None   # Информация о комплекте со всей вложеной структурой
    complect_node = None   #  Краткая информация о комплекте

    # если в качестве параметра пришел номер комплекта, то подгружаем структуру комплекта
    if complect_number:
      # информация о комплекте
      # complect_info =complectmodel.get_by({'number': complect_number})
      complect_info = api_get_complectinfo(complect_number)
      if not complect_info:
        queuemodel.update(queue_key, {'status': 'error', 'note': 'Комплект не найден.', 'finish_date': datetime.datetime.utcnow()})
        return None

      # форматирование нода комплекта
      complect_node = {
        'name': complect_info['name'],
        'number': complect_info['number'],
        'config_number': complect_info['config_number'],
        '_id': complect_info['_id'],
        'note': complect_info.get('note',''),
        'auto_note': complect_info.get('auto_note','')
      }

    # получение noda искомой конфигурации/модели
    node = datamodel.get_by({'number': config_number, 'datalink': None, 'status':{'$ne':'del'}})
    if not node:
      queuemodel.update(queue_key, {'status': 'error', 'note': 'Конфигурация не найдена.' if  len(number_items)>1 else 'Модель не найдена', 'finish_date': datetime.datetime.utcnow()})
      return None
    if node.get('type') != 'product' and node.get('type') != 'product_model':
      queuemodel.update(queue_key, {'status': 'error', 'note': 'Неверный тип объекта. Комплект может быть сформирован только из модели или изделия', 'finish_date': datetime.datetime.utcnow()})
      return None

    start = time.clock()
    list = datamodel.get_structured(None,None)
    # построить дерево модели/изделия со всеми свойствами и конфигурациями
    tree = esudapi.make_full_tree_production(list, node['_id'], True, None, cache_data)
    # очистить дерево от библиотек
    esudapi.clear_tree_from_types(tree, ['library'])
    product_tree = None
    errors = []
    if node['type'] == 'product_model':
      # подговтоить дерево из модели для построения комплекта
      esudapi.fill_model_configs(list, tree, [node])
      # проставить ссылки на родителей
      esudapi.refresh_parent_node(tree)
      product_tree =  prepare_tree_to_complect(list, tree, errors)
      product_tree['node']['type'] = 'product'
      product_tree['count'] = {'unit':'шт.', 'value':1, 'is_calculate': False}
      # принято решение, что
      product_tree['node']['number'] = product_tree['node']['number']+'.000'

      queuemodel.update(queue_key, {'status': 'in_progress', 'percent_complete': 40})
    elif node['type'] == 'product':
      # для изделия идем по пути спецификаций и собираем данные по их правилам
      esudapi.analize_tree_model_configuration(list, tree, [node],True,cache_data, 2, 1, {'SHORT_ORIGINAL_CHILDREN':True})
      esudapi.refresh_parent_node(tree)
      # esudspecificationapi.prepare_properties_list(tree)
      tree['count'] = {'unit':'шт.', 'value':1, 'is_calculate': False}
      product_tree =  esudspecificationapi.prepare_tree_to_specificate(list, tree, [], tree['node'].get('properties'),  errors, False, False)
      queuemodel.update(queue_key, {'status': 'in_progress', 'percent_complete': 40})
    print "Prepare data is: ", time.clock() - start
    # получение специйикаций по заданным номерам моделей
    start = time.clock()
    tmp_tree_cofigs = []
    tmp_tree_cofigs_numbers = []
    get_all_configs_in_tree(product_tree, tmp_tree_cofigs)
    for config in tmp_tree_cofigs:
      if config['node']['number'] not in tmp_tree_cofigs_numbers:
        tmp_tree_cofigs_numbers.append(config['node']['number'])
    specification_list = []
    specification_list_arr = {}
    if len(tmp_tree_cofigs_numbers)>0:
      specification_list = specificationmodel.get_list_by(
        {'config_number':{'$in':tmp_tree_cofigs_numbers }},
        {'name':1, 'number': 1, 'config_number':1, 'is_buy':1, 'properties':1, 'sector':1}
      )

    # группировка отобранных спецификаций по номерам конфигураций
    for spec in specification_list:
      if not spec['config_number'] in specification_list_arr:
        specification_list_arr[spec['config_number']] = []
      specification_list_arr[spec['config_number']].append(spec)

    print "Get specifications data is: ", time.clock() - start
    queuemodel.update(queue_key, {'status': 'in_progress', 'percent_complete': 90})

    # сжатие данных gzip-ом
    start = time.clock()
    #clear_nonused_data(tree_to_specificate)
    res = routine.JSONEncoder().encode({
      'status': 'success',
      'errors':errors,
      'config_info': node,
      'config_data': product_tree,
      'complect_data': complect_info,
      #'complect_info': complect_info,
      'specification_list': specification_list_arr
    })
    start = time.clock()
    queuemodel.update(queue_key, {'status': 'ok', 'note': '', 'data': Binary(routine.compress(res)), 'finish_date': datetime.datetime.utcnow() })
    print "Zip and save data is: ", time.clock() - start
  except Exception, exc:
    excType = exc.__class__.__name__
    print_exc()
    queuemodel.update(queue_key, {'status': 'error', 'note': str(exc), 'data': None, 'finish_date': datetime.datetime.utcnow()  })

def get_all_configs_in_tree(elem, result):
  '''
  Функция получения  всех изделий в модели
  '''
  def get_model_items(model, group, result):
    if model.get('is_techno_group') or model.get('is_buy_group'):
      group.append({
        'name': model['node']['name'],
        'origin_id': model['node'].get('datalink') if model['node'].get('datalink') else model['node'].get('_id'),
        'is_techno_group': model.get('is_techno_group'),
        'is_buy_group': model.get('is_buy_group'),

      })
      for cm in model.get('models',[]):
        get_model_items(cm, group, result)
    else:
      for p in model.get('items',[]):
        p['group'] = group
        result.append(p)
  # основное тело функции
  for model in elem.get('models',[]):
    items = []
    get_model_items(model,[], items)
    for item in items:
      result.append(item)
      get_all_configs_in_tree(item, result)

def prepare_tree_to_complect(list, elem, errors):
  '''
  Анализ дерева, сбор фактических свойств, объемов, операций
  В результате на выходе иерархия изделий в базовой моделе
  '''
  from apis.esud import esudspecificationapi

  # Локальная функция получения детей группирующей модели
  def get_group_model_items(list, result,  elem,  errors):
    if len(elem['children'])==0:
      errors.append({'node': elem['node'], 'error': 'empty group model'})
    else:
      for child in elem['children']:
        if child['node'].get('is_techno_group') or child['node'].get('is_buy_group'):
          tmp_model_info = {
            'models':[],
            'node':child['node'],
            'is_techno_group': child['node'].get('is_techno_group'),
            'is_buy_group': child['node'].get('is_buy_group'),
          }
          result['models'].append(tmp_model_info)
          # рекурсивная функция получения детей групповой модели
          get_group_model_items(list, tmp_model_info,  child, errors)
        else:
          # запускаем цикл по моделям в группе
          if child['node']['type'] == 'product_model':
            tmp_model =   {'items': [],'node': child['node']}
            for product in child.get('products',[]):
              product['count'] = {'unit':'шт.', 'value':1, 'is_calculate': False}
              tmp_model['items'].append(esudspecificationapi.prepare_tree_to_specificate(list, product, [], product['node'].get('properties'), errors, True, False))
            result['models'].append(tmp_model)

  #--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  #--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  #-------Основная функция------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  #--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  #--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  try:
    result ={'node': elem['node'],'properties':[],'operations':[],'models':[]}
    for child in elem['children']:
      # если свойство и значение данного свойства сохранено в изделии
      if child['node']['type'] == 'property':
        elem_prop = {'unit':{'value':'шт.', 'id':None},'value':{'value':0, 'id':None}}
        try:
          # получение всех значений свойства
          units = []
          values = []
          conditions = []
          sel_conditions = []
          esudspecificationapi.get_units_and_values(child, units, values, conditions)
          cs = [esudspecificationapi.check_val_on_sys(tmp_el) for tmp_el in  esudspecificationapi.get_node_value(child,units,values)]
          # берем все значения свойств
          tmp_units =  [{'_id':n_val['node']['_id'], 'name':n_val['node']['name'], 'datalink': n_val['node']['datalink'], 'unit': n_val.get('unit')} for n_val in units]
          cs_tmp = cs
          cs_res = []
          for v in values:
            el = {
              '_id':v['node']['_id'],
              'name':v['node']['name'],
              'datalink': v['node']['datalink'],
              'value':v['node']['name'],
              'unit':None,
              'units': tmp_units,
              'conditions':[],
            }
            # сбор условий для значения
            for c_child in v.get('children',[]):
              if c_child['node']['type']=='condition':
                el['conditions'].extend(esudspecificationapi.get_selected_condition_values(c_child))
            cs_res.append(esudspecificationapi.check_val_on_sys(el))
          cs = cs_res

          # условия-----
          for cond in conditions:
            sel_conditions.extend(esudspecificationapi.get_selected_condition_values(cond))
          # проверяем, есть ли среди списка значений  - открытых значений - формул
          for c_val in cs:
            if c_val.get('is_open') and c_val.get('value') and c_val.get('value')[0] == '=':
              c_val['is_formula'] = True
              c_val['formula'] = c_val.get('value')

          # # текущим значением считаем первое значение из списка
          cur_val = None
          tmp_prop = {
            '_id':child['node']['_id'],
            'datalink':child['node'].get('datalink'),
            'is_system': child['node'].get('is_system'), # системное свойство
            'is_objective_system': child['node'].get('is_objective_system'), # косвенно системное
            'name':child['node']['name'],
            'values': cs,
            'value': cur_val,
            'routine': child['node'].get('routine',0),
            'original_values': None,
            'original_units': None,
            'is_specification': True if (not child['node']['_id'] in datamodel.SYSTEM_OBJECTS_IDS and not child['node'].get('datalink') in datamodel.SYSTEM_OBJECTS_IDS) or child['node']['_id'] in datamodel.SYSTEM_SPECIFICATION_OBJECTS_IDS or  child['node'].get('datalink') in datamodel.SYSTEM_SPECIFICATION_OBJECTS_IDS else False,
            'is_optional': child['node'].get('is_optional'),
            'is_techno': child['node'].get('is_techno'),
            'conditions': sel_conditions
          }

          # выделение свойства участка
          if tmp_prop.get('datalink')==datamodel.SYSTEM_OBJECTS['SECTOR_PROP']:
            result['sector'] = tmp_prop

          result['properties'].append(tmp_prop)
          #------------
        except Exception, exc:
          print('Error! Get props calculation.' + str(exc))
          excType = exc.__class__.__name__
          print_exc()
          pass

      # если операция
      elif child['node']['type'] == 'operation':
        # В данном алгоритме операции собираются по типу дерева изделий, в алгоритм не заложен отбор истинных значений свойств, установленных для конкретного изделия. В дальнейшем необходимо выполнять функцияю = getunitsandvalues и определять по типу свойств реализованных выше, истинные значения для операций
        #result['operations'].append(child['node'])
        esudapi.clear_parent_node(child)
        result['operations'].append(child)
        if child['node'].get('is_separate'):
          result['is_separate'] = True

      # если модель изделия, то необходимо проверить на конфигурацию
      # либо модель может быть обобщающей
      elif child['node']['type'] == 'product_model':
        # если модель группирующая
        if child['node'].get('is_techno_group') or child['node'].get('is_buy_group'):
          tmp_model_info = {
            'models':[],
            'node':child['node'],
            'is_techno_group': child['node'].get('is_techno_group'),
            'is_buy_group': child['node'].get('is_buy_group'),
          }
          result['models'].append(tmp_model_info)
          # рекурсивная функция получения детей групповой модели
          get_group_model_items(list, tmp_model_info, child, errors);
        # если модель требует кофигурации, то получаем конфигурацию модели
        # затем рекурсия стартуется от найденной конфигурации
        elif child.get('need_configuration'):
          tmp_model =   {'items': [],'node': child['node']}
          for product in child.get('products',[]):
            esudapi.refresh_parent_node(product)
            product['count'] = {'unit':'шт.', 'value':1, 'is_calculate': False}
            tmp_model['items'].append(esudspecificationapi.prepare_tree_to_specificate(list, product, [], product['node'].get('properties'), errors, True, False))
          result['models'].append(tmp_model)
    return result
  except Exception, exc:
    print('----Error. esudcomplectapi.prepare_tree_to_complect; {0}'.format(str(exc)))
    excType = exc.__class__.__name__
    print_exc()
    raise Exception(str(exc))

def test_prepare_from_model(number):
  '''
    Тестовая функция подготовки комплекта из модели/изделия
  '''
  try:
    from apis.esud import esudspecificationapi
    # получить данные ЭСУД
    start = time.clock()
    # получение и обработка данных
    list = datamodel.get_structured(None,None)
    cache_data = {}
    print "Get ESUD data is: ", time.clock() - start
    start = time.clock()
    # получить данные о модели
    cur_elem = datamodel.get_by({'number': number, 'datalink': None, 'status':{'$ne':'del'}})

    # tree = esudapi.make_full_tree_production(list, ObjectId("55ae93a2bdb25f0003370a90"), True, None)
    # esudapi.refresh_parent_node(tree)
    # product_tree =  esudspecificationapi.prepare_tree_to_specificate(list, tree, [], tree['node'].get('properties'),  [], False, False)
    # return  product_tree

    if cur_elem:
      start = time.clock()
      # построить дерево модели со всеми свойствами и конфигурациями
      tree = esudapi.make_full_tree_production(list, cur_elem['_id'], True, None, cache_data)
      # очистить дерево от библиотек
      esudapi.clear_tree_from_types(tree, ['library'])
      product_tree = None
      errors = []
      if cur_elem['type'] == 'product_model':
        # подговтоить дерево из модели для построения комплекта
        esudapi.fill_model_configs(list, tree, [cur_elem])
        # # проставить ссылки на родителей
        # esudapi.refresh_parent_node(tree)
        product_tree =  prepare_tree_to_complect(list, tree, errors)
        product_tree['node']['type'] = 'product'
        product_tree['count'] = {'unit':'шт.', 'value':1, 'is_calculate': False}
        # принято решение, что
        product_tree['node']['number'] = product_tree['node']['number']+'.000'
      elif cur_elem['type'] == 'product':
        # для изделия идем по пути спецификаций и собираем данные по их правилам
        esudapi.analize_tree_model_configuration(list, tree, [cur_elem],True,cache_data, 2, 1, {'SHORT_ORIGINAL_CHILDREN':True})
        esudapi.refresh_parent_node(tree)
        # esudspecificationapi.prepare_properties_list(tree)
        tree['count'] = {'unit':'шт.', 'value':1, 'is_calculate': False}
        product_tree =  esudspecificationapi.prepare_tree_to_specificate(list, tree, [], tree['node'].get('properties'),  errors, False, False)

      print "Prepare data is: ", time.clock() - start
      # получение специйикаций по заданным номерам моделей
      start = time.clock()
      tmp_tree_cofigs = []
      tmp_tree_cofigs_numbers = []
      get_all_configs_in_tree(product_tree, tmp_tree_cofigs)
      for config in tmp_tree_cofigs:
        if config['node']['number'] not in tmp_tree_cofigs_numbers:
          tmp_tree_cofigs_numbers.append(config['node']['number'])
      specification_list = []
      if len(tmp_tree_cofigs_numbers)>0:
        specification_list = specificationmodel.get_list_by({'config_number':{'$in':tmp_tree_cofigs_numbers }}, {'name':1, 'number': 1, 'config_number':1})
      print "Get specifications data is: ", time.clock() - start
      return{'specification_list': specification_list, 'product_tree':product_tree}
      # return product_tree
  except Exception, exc:
    print('----Error. esudcomplectapi.test_prepare_from_config; {0}'.format(str(exc)))
    excType = exc.__class__.__name__
    print_exc()
    raise Exception(str(exc))
