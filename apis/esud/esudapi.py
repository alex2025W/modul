#!/usr/bin/python
# -*- coding: utf-8 -*-
import datetime, time, routine, config
from bson.objectid import ObjectId
from bson.binary import Binary
from libraries import userlib
from models import datamodel, queuemodel, countersmodel
from traceback import print_exc
import re
from copy import deepcopy,copy
import hashlib
import gc

def api_background_load_product_tree(queue_key, zipped_data, usr):
  '''
    Подготовка данных для формирвоания графа изделия
    Подготовка ведется в background
    nodeId - идентификатор корневого элемента
  '''
  try:
    from apis.esud import esudspecificationapi
    # unzip data
    data = routine.JSONDecode(routine.decompress(zipped_data, "deflate"))
    if not data.get('nodeId'):
      queuemodel.update(queue_key, {'status': 'error', 'note': 'Заданы неверные параметры для получения данных.', 'data': None, 'finish_date': datetime.datetime.utcnow() })
      return

    # получение данных ЕСУД
    element_id = data.get('nodeId')
    start = time.clock()
    result = None
    list = datamodel.get_cached_data()

    # получение элемента по заданному идентификатору
    cur_elem = list['data'].get(ObjectId(element_id))
    # проверка типа элемента
    if not cur_elem:
      return routine.JSONEncoder().encode({'status': 'error','msg':'Указанный элемент не найден.'})
      # queuemodel.update(queue_key, {'status': 'error', 'note': 'Указанный элемент не найден.', 'data': None, 'finish_date': datetime.datetime.utcnow() })
      # return
    queuemodel.update(queue_key, {'status': 'in_progress', 'percent_complete': 20})
    errors = []
    if cur_elem['type']=='product':
      # построение дерева изделия и очистка его от библиотек
      cache_data = {}
      tree = make_full_tree_production(list, cur_elem['_id'],False,None,cache_data)
      clear_tree_from_types(tree, ['library'])
      queuemodel.update(queue_key, {'status': 'in_progress', 'percent_complete': 50})
      analize_tree_model_configuration(list, tree, [cur_elem],True,cache_data,None, 1, {'SHORT_ORIGINAL_CHILDREN':True})
      queuemodel.update(queue_key, {'status': 'in_progress', 'percent_complete': 70})
      cache_data = None
      refresh_parent_node(tree)
      tree['count'] = {'unit':'шт.', 'value':1, 'is_calculate': False}
      tree_to_graph = esudspecificationapi.prepare_tree_to_specificate(list, tree, [], tree['node'].get('properties'), errors, False, False)
      queuemodel.update(queue_key, {'status': 'in_progress', 'percent_complete': 90})
      tree = None
      # приведение дерева к требуемому виду графа
      result = make_graph_tree_product(tree_to_graph)
    elif cur_elem['type']=='product_model':
      # построение дерева моделей
      queuemodel.update(queue_key, {'status': 'in_progress', 'percent_complete': 60})
      tree = make_graph_tree(list,cur_elem['_id'], '',0)
      result = filter_tree_by_type(list, tree, "product_model")
    else:
      return routine.JSONEncoder().encode({'status': 'error','msg':'Граф можно построить только для моделей и изделий.'})

    print "Time build tree is: ", time.clock() - start
    # return routine.JSONEncoder().encode(result)

    res = routine.JSONEncoder().encode({
      'status': 'success',
      'data': result,
      'errors':errors,
      'nodeId': data.get('nodeId'),
      'nodePath': data.get('nodePath')
    })

    start = time.clock()
    queuemodel.update(queue_key, {'status': 'ok', 'note': '', 'data': Binary(routine.compress(res)), 'finish_date': datetime.datetime.utcnow() })

    print "Zip and save data is: ", time.clock() - start
    res = None
    gc.collect()

  except Exception, exc:
    print_exc()
    queuemodel.update(queue_key, {'status': 'error', 'note': str(exc), 'data': None, 'finish_date': datetime.datetime.utcnow() })

def api_copy_elem(elem_to_copy, destination_elem):
  '''
  Функция копирования одного элемента в другой (со всеми листьями)
  elem_to_copy - копируемый элемент
  destination_elem - элемент в который необходимо скопировать
  '''

  # если элемент копируется в другой элемент, то проверяем на две единицы измерения внутри значения
  # опредляем path родительского элемента
  parent_path = ''
  parent_id =  None
  if destination_elem:
    parent_id = str(destination_elem['_id'])
    parent_path = (destination_elem['path']+'-'+str(destination_elem['_id'])) if destination_elem['path'] else str(destination_elem['_id'])
    if destination_elem['type']=='value' and elem_to_copy['type']=='unit':
      dataItems = datamodel.get({'parent_id': destination_elem['_id'],'status':{'$ne':'del'}},None)
      # Dima 04.02.2016 - непонятно для чего такое ограничение
      # if dataItems and len(dataItems)>0:
      #   for i in dataItems:
      #     if i['type']=='unit':
      #       return routine.JSONEncoder().encode({'status': 'error','msg':'Для данного значения уже заданы единицы измерения'})

  regx = re.compile(str(elem_to_copy['_id']), re.IGNORECASE)
  dataItems = datamodel.get(
    {
      '$or':[{'path':regx},{'_id': ObjectId(str(elem_to_copy['_id']))}]
      #'status':{'$ne':'del'}
    }, None)
  # формируем из этих данных дерево
  root_node = [i for i in dataItems if str(i['_id']) == str(elem_to_copy['_id'])]
  root = {'node':root_node[0],'children':[]}
  dataItems.pop(dataItems.index(root['node']))
  make_tree(dataItems,root)
  root['node']['routine'] = elem_to_copy['routine']
  # назначаем id-шники для дерева и формируем новые path-ы
  clone_tree(None, root, parent_path,ObjectId(parent_id) if parent_id else None, True if root['node'].get('datalink') else False)

  if str(parent_id)==str(elem_to_copy['parent_id']):
    root['node']['name'] = "КОПИЯ "+root['node']['name']
  # превращаем все в array
  add_elems = []
  tree_to_array(root, add_elems)

  # моделям необходимо проставить номера
  new_models_buy = []
  new_models_own = []
  new_models_own_sequances = []
  new_models_buy_sequances = []

  for row in add_elems:
    if row.get('datalink'):
      row['note'] = ''
    if row.get('type')=="product_model" and not row.get('datalink'):
      # проверка на тип модели(своя/покупня)
      is_buy_model = False
      for child in add_elems:
        if child['parent_id'] == row['_id'] and child.get('datalink') == datamodel.SYSTEM_OBJECTS['BUY_PROP']:
          is_buy_model = True
          break
      if is_buy_model:
        new_models_buy.append(row)
      else:
        new_models_own.append(row)

  # получене требуемого количества номеров для собственных моделей
  if len(new_models_own)>0:
    i = 0
    while i<len(new_models_own):
      new_number = countersmodel.get_next_sequence_with_confirm('data_models_own')
      new_models_own_sequances.append({'_id':'data_models_own', 'i': new_number})
      new_models_own[i]['number'] = routine.pad(new_number, 3)
      new_models_own[i]['product_seq'] = 0
      new_models_own[i]['product_seq_arr'] = []
      i+=1

  # получене требуемого количества номеров для покупных моделей
  if len(new_models_buy)>0:
    i = 0
    while i<len(new_models_buy):
      new_number = countersmodel.get_next_sequence_with_confirm('data_models_buy')
      new_models_buy_sequances.append({'_id':'data_models_buy', 'i': new_number})
      new_models_buy[i]['number'] = routine.pad(new_number, 3)
      new_models_buy[i]['product_seq'] = 0
      new_models_buy[i]['product_seq_arr'] = []
      i+=1

  # изделиям необходимо проставить номера
  sequences = []  # список счетчиков на обновление
  for row in add_elems:
    if row.get('datalink'):
      row['note'] = ''
    if row.get('type')=="product" and not row.get('datalink'):
      # поиск модели на основе которой создано изделие
      for tmp_model in add_elems:
        if tmp_model.get('parent_id') == row['_id'] and tmp_model['type'] == 'product_model' and tmp_model.get('status')!='del':
          origin_model_id = tmp_model['datalink'] if  tmp_model.get('datalink') else tmp_model['_id']
          origin_model = dataItems = datamodel.get_by_id(str(origin_model_id))
          model_number = origin_model.get('number')
          new_number = datamodel.model_get_next_sequence_product(origin_model['_id'])
          sequences.append({'_id': origin_model['_id'], 'i': new_number})
          product_number = routine.pad(new_number, 3)
          row['number'] = "{0}.{1}".format(model_number, product_number)
          row['specification_seq'] = 0
          row['specification_seq_arr'] = []
          break

  # добавление результата в БД
  datamodel.add(add_elems)
  # обновление статусов счетчиков
  for seq in sequences:
    datamodel.update_by(
      {'_id': seq['_id'], 'product_seq_arr.i': seq['i']},
      {'$set': {'product_seq_arr.$.status':True }}
    )
  for seq in new_models_buy_sequances:
    countersmodel.update_by(
      {'_id': seq['_id'], 'seq_arr.i': seq['i']},
      {'$set': {'seq_arr.$.status':True }}
    )
  for seq in new_models_own_sequances:
    countersmodel.update_by(
      {'_id': seq['_id'], 'seq_arr.i': seq['i']},
      {'$set': {'seq_arr.$.status':True }}
    )

  return add_elems

def find_prop_value(product, prop):
  '''
  Получить выбранные значения для свойства в изделии
  '''
  if 'properties' not in product:
    product['properties'] = []
  for p in product['properties']:
    if prop['linkpath']==p.get('linkpath') and p.get('configuration_path','')== '' and p.get('property_id') == prop['node']['_id'] and p.get('type')=='property_value':
      return p
  return None

def reset_optional_values():
  '''
    Скинуть все опциональыне значения конфигурации
  '''
  # получаем все данные из БД
  list = datamodel.get_cached_data()
  # получаем все изделия
  izd_list = []
  for el in list['data']:
    dt = list['data'][el]
    if dt.get("type")=='product':
      izd_list.append(dt)
  izd_count = len(izd_list)
  cnt = 0
  for izd in izd_list:
    is_changed = False
    cnt = cnt+1
    print str(cnt)+u" из "+str(izd_count)
    # строим дерево для изделия
    cache_data = {}
    tree = make_full_tree(list,izd['_id'], '',0, True,None,cache_data)
    # получить все свойства дерева
    prop_list= []
    get_properties(tree, prop_list,0)
    for p in prop_list:
      # получить значения
      units = []
      values = []
      get_all_units_and_values(p,units,values)
      # если св-во опциональное или кол-во значений равно единице, выбираем всех
      if p['node'].get('is_optional',False) or len(values)==1:
        # устанавливаем в качестве unit-а первое значение, если есть.
        cur_unit = {'id':None, 'value':None}
        if len(units)>0:
          cur_unit['id'] = units[0]['node']['_id']
          cur_unit['value'] = units[0]['node']['name']
        # создаем список values-сов
        cur_values = []
        for v in values:
          val = '' if str(v['node']['datalink'])==str(datamodel.SYSTEM_OBJECTS['OPEN_VAL']) else v['node']['name']
          cur_values.append({'value':{'id':v['node']['_id'], 'value': val }, 'unit':cur_unit})
        # ищем, выставлены ли properties для этого свойства внутри изделия
        sel_prop = find_prop_value(izd, p)
        if sel_prop:
          # изменяем unit-ы и открытые значения
          for v2 in cur_values:
            for v1 in sel_prop['values']:
              if (str(v1['value']['id'])==str(v2['value']['id'])) or (not v1['value']['id'] and v2['value']['value']==''):
                v2['value']['value'] = v1['value']['value']
                v2['unit'] = v1['unit']
          sel_prop['values'] = cur_values
          is_changed = True
        else:
          new_prop = {'property_id':p['node']['_id'], 'linkpath':p['linkpath'], 'property_origin_id':p['node']['datalink'],'type':'property_value', 'configuration_path':'', 'values':cur_values}
          izd['properties'].append(new_prop)
          is_changed = True
    if is_changed:
      datamodel.update(ObjectId(izd['_id']),{'properties':izd['properties']})
  print 'finished'

# получить все значеия свойства игнорирую библиотеки
def get_all_units_and_values(prop, units, values):
  for child in prop['children']:
    if child['node'].get('status','')!='del':
      if child['node']['type']=='unit':
        units.append(child)
      elif child['node']['type']=='value':
        values.append(child)
      elif child['node']['type']=='library':
        get_all_units_and_values(child,units,values)

# вытянуть все свойства изделия
def get_properties(el, prop_list, deep):
  #print el['node']['type']
  if not el:
    return
  if el['node']['type']=='product_model' and deep>1:
    return
  if el['node']['type']=='property':
    prop_list.append(el)
  for c in el['children']:
      get_properties(c, prop_list, deep+1)

def clear_tree_from_types(elem, object_types):
  '''
  Очистка дерева от указанных типов.
  Содержимое очищаемых типов мержится к более верхнему уровню
  Исключением являются сисмемные объекты
  '''
  if elem:
    copy_children = []
    is_ignored = False
    for e in elem.get('children',[]):
      if e['node']['type'] in object_types and (e['node']['_id'] not in datamodel.SYSTEM_OBJECTS_IDS and  e['node'].get('datalink') not in datamodel.SYSTEM_OBJECTS_IDS) :
        is_ignored = True
        for ce in e['children']:
          copy_children.append(ce)
      else:
        copy_children.append(e)
    if is_ignored:
      elem['children'] = copy_children
      clear_tree_from_types(elem, object_types)
    else:
      for e in elem['children']:
        clear_tree_from_types(e, object_types)

def analize_tree_model_configuration(list, elem, parents, is_configuration_insert=True, original_elem_list = {}, deep=None, current_level=1,addition_options={}):
  '''
  Анализирование и дополнение дерева конфигурациями для моделей
  issue #109
  Конфигурация модели необходима:
  1. Если текщая модель вложена в другую модель,
  2. И если на одном уровне с текущей моделью есть объект - "Операция"
  3. И если та модель в которую вложена текущая, в свою очередь вложена в изделие

  deep - вложенность до которой необходимо выполнять анализ
  current_level - текущий уровень анализа
  addition_options - дополнительные настройки: SHORT_ORIGINAL_CHILDREN (в случае true в списке original_children оставляет только свойства объема)
  '''

  def get_node_selected_config(node, parents):
    '''
    Получение конфигурации для текущей модели.
    Поиск идет до самого корня изделия
    '''
    result = None
    config_path = ""
    if parents and len(parents)>0:
      i = len(parents)-1
      while i>0:
        pr_node = parents[i]['node']
        if pr_node['type']=='product':
          node_props = pr_node.get('properties',[])
          for prop in node_props:
            if prop.get('type')=='config' and prop.get('linkpath')==node.get('linkpath') and prop.get('configuration_path','')==config_path and str(prop['property_id'])==str(node['node']['_id']):
              result = prop
          config_path = str(pr_node['_id']) + '-'+config_path if config_path !='' else str(pr_node['_id'])
        i-=1
    return result

  # проверка на уровень обраотки
  if deep and current_level>deep:
    return

  new_parents  = copy(parents)
  new_parents.append(elem)
  # если элементу нужна параметризация, то выполянем ее
  # иначе проваливаемся по дереву, фиксируя родителя

  if elem and 'node' in elem and elem['node']['type']=='product_model' and  not  (elem['node'].get('is_techno_group') or elem['node'].get('is_buy_group')) and len(parents)>1 and  'node' in parents[len(parents)-1] and parents[len(parents)-1]['node']['type']=='product_model' and 'node' in parents[len(parents)-2] and ( (parents[len(parents)-1]['node']['type']=='product_model' and (parents[len(parents)-1]['node'].get('is_techno_group') or parents[len(parents)-1]['node'].get('is_buy_group'))) or (parents[len(parents)-2]['node']['type']=='product' and any([i for i in parents[len(parents)-1]['children'] if 'node' in i and i['node']['type'] == 'operation' or (i['node']['type'] == 'property' and 'datalink' in i and i['datalink'] == datamodel.SYSTEM_OBJECTS['BUY_PROP'])]))
    ):
    # получить список всех изделий созданных на основе текущей модели
    products = get_products_by_productmodel_link(list,elem['node'])
    elem['need_configuration'] = True
    elem['products'] = products
    #elem['origin_children'] = copy(elem['children'])
    if addition_options.get('SHORT_ORIGINAL_CHILDREN'):
      oc = []
      for c in elem['children']:
        if c['node'].get('datalink')== datamodel.SYSTEM_OBJECTS['VOL_PROP']:
          oc.append(c)
      elem['origin_children'] = oc
    else:
      elem['origin_children'] = elem['children']
    elem['children'] = []

    # if products and len(products)>0 and len(parents)>=2 and parents[len(parents)-2]['node']['type']=='product' and 'properties' in parents[len(parents)-2]['node']:

    if products and len(products)>0 and len(parents)>=2:
      if is_configuration_insert:
        # iss_600
        # выбор конфигурации в группе покупных изделий - аналогов
        # для таких групп не ведется проверка выбранности той или иной конфигурации
        # конфигурации берутся автоматически, иначе работает логика с конфигурациями выбранными
        # пользователем в ручную
        is_buy_group = parents[len(parents)-1]['node'].get('is_buy_group')
        if is_buy_group:
          elem['children'] = []
          for product in products:
            product = make_full_tree_production(list, product['_id'], False, None, original_elem_list)
            if product:
              clear_tree_from_types(product, ['library'])
              current_level+=1
              analize_tree_model_configuration(list, product,new_parents,is_configuration_insert,original_elem_list, deep, current_level,addition_options)
              elem['children'].append(product)
        else:
          # необходимо получить конфиг
          sel_config = get_node_selected_config(elem, parents)
          #iss_374(множественные конфигурации)
          # пометить, что конфигурация требует подгрузки с сервера
          if sel_config and len(sel_config.get('product_configs',[]))>0:
            elem['children'] = []
            for sel_product_config in sel_config['product_configs']:
              #product = make_full_tree(list,sel_product_config, '',0,False,None,original_elem_list)
              product = make_full_tree_production(list, sel_product_config, False, None, original_elem_list)
              if product:
                clear_tree_from_types(product, ['library'])
                current_level+=1
                analize_tree_model_configuration(list, product,new_parents,is_configuration_insert,original_elem_list, deep, current_level,addition_options)
                elem['children'].append(product)
      else:
        elem['node']['need_update'] = True
  elif elem:
    children = elem['children']
    for c in children:
      analize_tree_model_configuration(list, c, new_parents,is_configuration_insert,original_elem_list, deep, current_level,addition_options)

def filter_tree_by_type(list, elem, object_type):
  '''
    Анализирование дерева и отбор по нему объектов указанного типа.
  '''

  if elem['node']['type'] == object_type:
    result = {'node':elem['node'], 'children':[], 'name':elem['node']['name'], 'article': elem['article'], 'path': elem['linkpath']}

    for c in elem['children']:
      ce = filter_tree_by_type(list,c, object_type)
      if ce:
        result['children'].append(ce)
    return result
  else:
    return None

def fill_model_configs(list, elem, parents):
  '''
  Анализирование и дополнение дерева конфигурациями для моделей
  Заполенение ведется только для моделей первого уровня
  На вход поступает модель.
  '''
  new_parents = copy(parents)
  new_parents.append(elem)
  if elem and 'node' in elem and elem['node']['type']=='product_model' and not  (elem['node'].get('is_techno_group') or elem['node'].get('is_buy_group')) and len(parents)>1:

    # если среди родителей есть не групповая модель и она не первая в списке,
    # то конфиги для такой модели грузить не нужно
    i = len(parents)
    while i >=0:
      i = i-1
      if parents[i].get('node') and parents[i]['node']['type'] == 'product_model' and i>1:
        return

    # получить список всех изделий созданных на основе текущей модели
    elem['need_configuration'] = True
    products = get_products_by_productmodel_link(list,elem['node'])
    elem['products'] = []
    #elem['origin_children'] = elem['children']
    #elem['children'] = []
    if products and len(products)>0:
      for product in products:
        product = make_full_tree_production(list, product['_id'], True, None)
        if product:
          elem['products'].append(product)
          #elem['children'].append(product)
  elif elem:
    children = elem['children']
    for c in children:
      fill_model_configs(list, c, new_parents)

def clear_parent_node(parent):
  '''
    Рекурсивная функция обнуления ссылок на родителей в дереве
  '''
  if 'parent_node' in parent:
    del parent['parent_node']
  if 'config_list' in parent:
    del parent['config_list']
  for c in parent.get('children',[]):
    #c['parent_node'] = None
    clear_parent_node(c)

def refresh_parent_node(parent):
  '''
    Рекурсивная функция проставления конфигурационных путей по дереву.
    Также функция помечает для каждого элемента его родителя
  '''
  if not parent.get('configuration_path'):
    parent['configuration_path'] = ''

  for c in parent.get('children',[]):
    c['parent_node'] = parent
    c['configuration_path'] = parent['configuration_path']
    if c['node']['type'] == 'product':
      c['configuration_path'] = c['configuration_path'] + '-' + str(c['node']['_id']) if c['configuration_path'] else str(c['node']['_id'])
    refresh_parent_node(c)

def make_graph_tree(list, elem_id, linkpath, deep):
  '''
    Рекурсивная функция построения дерева объектов для графа
  '''
  # если достигнута вложенность больше 200
  if deep>200:
    print 'Deep mo then 200 by: ' +str(elem_id)
    return None

  node = list['data'][elem_id] if elem_id in list['data'] else None
  if node and ('status' not in node or node['status']!='del'):
    result = {'node':node, 'children':[], 'name':node['name'], 'article': node.get('number'), 'linkpath': linkpath}
    # если линк, то вытягиваем дерево основного элемента, а затем мержим
    if 'datalink' in node and node['datalink']!=None and (node['type']!='property' or not has_childs(list,node['_id'])):
      if node['type']!='product':
        linkpath = (linkpath+"-"+str(node['_id'])) if linkpath else str(node['_id'])
      # строим дерево для основного элемента
      res = make_graph_tree(list,node['datalink'], linkpath, deep+1)
      if 'properties' in res['node']:
        node['properties'] = None
        node['properties'] = res['node']['properties']
      if not res:
        res = {'node':None, 'children':[], 'name':'', 'article': ''}

      # вытягиваем деревья для чайлдов линка
      children = get_childs(list, elem_id)
      child_tree = []

      for c in children:
        ce = make_graph_tree(list,c["_id"], linkpath, deep+1)
        if ce:
          child_tree.append(ce)
      # мержим
      res_childs = []
      for r in res['children']:
        is_find = False
        for c in child_tree:
          if r['node']['name']==c['node']['name'] and r['node']['type']==c['node']['type']:
            is_find = True
            res_childs.append(c)
            child_tree.remove(c)
            break
        if not is_find:
          res_childs.append(r)
      for c in child_tree:
        res_childs.append(c)
      result['children'] = res_childs
    else:
      children = get_childs(list, elem_id)
      child_tree = []
      for c in children:
        ce = make_graph_tree(list,c["_id"], linkpath, deep+1)
        if ce:
          child_tree.append(ce)
      result['children'] = child_tree
    # сортируем child-ов
    result['children'].sort(key=lambda c:c['node']['routine'])
    return result
  else:
    return None

def make_graph_tree_product(elem):
  '''
    Рекурсивная функция преобразования дерева изделия для графа
    Выходной формат: {node, name, children, article}
    elem - нод дерева объектов
  '''
  # Функция получения изделий в моделе
  def get_model_items(model, group, result):
    if model.get('is_techno_group') or model.get('is_buy_group'):
      for cm in model.get('models',[]):
        group.append({
            'name': model['node']['name'],
            'origin_id': model['node'].get('datalink',model['node'].get('unit_id'))
          })
        get_model_items(cm, group, result)
    else:

      group_id = str(ObjectId()) if len(model.get('items',[]))>1 else ""
      for p in model.get('items',[]):
        p['group'] = group
        p['group_id'] = group_id
        result.append(p)

  result = {
    'node':elem['node'], 'children':[],
    'name':elem['node']['name'],
    'article': elem['node']['number'],
    'path': elem.get('configuration_path',''),
    'group_id': elem.get('group_id','')
  }

  for model in elem.get('models',[]):
    items = []
    get_model_items(model,[], items)
    if items and len(items)>0:
      for item in items:
        ce = make_graph_tree_product(item)
        if ce:
          result['children'].append(ce)
  return result

def make_tree(list, node):
  '''
    Функция построения простого дерева без принципов наследования
  '''
  children = [i for i in list if i['parent_id'] == node['node']['_id']]
  for c in children:
    list.pop(list.index(c))
    c_node = {'node':c, 'children':[]}
    make_tree(list,c_node)
    node['children'].append(c_node)

def is_parents_has_type(data, elem, search_type):
  '''
    Поиск по дереву вверх элемента с указанным типом
  '''
  if elem:
    parent_id = elem['parent_id']
    if parent_id:
      count = 0
      while parent_id and count<200:
        try:
          curItem = (item for item in data if item["_id"] == parent_id).next()
        except:
          return False
        if curItem:
          if curItem['type'] == search_type:
            return True
          parent_id = curItem['parent_id']
        else:
          return False
        count+=1
  return False

def make_full_tree(list, elem_id, linkpath, deep, is_short = False, parents_list=None, original_elem_list = {}, deep_level = 200):
  '''
  Рекурсивная функция построения дерева объектов изделия (в случаем построение краткого списка
  без вложенных моделей, передаем is_short=True)
  original_elem_list - список закэшированных объектов
  '''
  # если достигнута вложенность больше 200
  if deep>deep_level:
    return None
  if deep>200:
    print 'Deep mo then 200 by: ' +str(elem_id)
    return None

  #node = list['data'][elem_id] if elem_id in list['data'] else None
  node = list['data'].get(elem_id,None)
  if node and node.get('status')!='del':
    result = {'node':node, 'children':[], 'linkpath':linkpath}

    # в случае ветки условия, вызывается собственная функция сбора информации об условии
    if node['type']=='condition':
      # вытягиваем чайлды условия
      children = get_childs_ignore_libs(list, node.get('datalink') or elem_id)
      for c in children:
        if c.get('status')!='del':
          # проверка объекта на отбор
          if c['datalink'] == datamodel.SYSTEM_OBJECTS['OTBOR_PROP']:
            node['is_otbor']= True
          ce = make_condition_branch(list,c["_id"], linkpath)
          if ce:
            result['children'].append(ce)
      return result

    # в случае укороченного дерева отсееваем модели внутри моделей
    if is_short and node['type']=='product_model':
      parent_node = None if parents_list is None else parents_list[len(parents_list)-1]['node']
      if parent_node and parent_node['type']=='product_model' and not check_link_on_group(list, parent_node['_id']) and not check_link_on_group(list, parent_node['datalink']) and len(parents_list)>1:
        pre_parent_node = parents_list[len(parents_list)-2]['node']
        if pre_parent_node['type']!='product':
          return result

    # в случае если модель изделия вложена в технологический процесс, то сбор данных по ней не ведем
    if node['type']=='product_model' and parents_list:
      for parent_el in parents_list:
        if parent_el['node']['type'] == "process":
          return result

    # строится список родительских узлом для всего дерева
    parents_list_deep = [] if parents_list is None else copy(parents_list)
    parents_list_deep.append(result)




    # если линк, то вытягиваем дерево основного элемента, а затем мержим
    # Для свойств работает правило переопределения значений, т.е если мы кладем ярлык на модель, то
    # необходимо подгрузить все оюъеты на которые ссылается данный ярлык и смержить их .
    # Если на входе ярлык на свойство, в который вложено какое-то значение, то должно сработать правило переопределения, и данная проверка не должна отработать
    if node.get('datalink')!=None and (node['type']!='property' or (not has_types(list,node['_id'], ['value', 'unit']) )):
    #if node.get('datalink'):

      if node['type']!='product':
        linkpath = (linkpath+"-"+str(node['_id'])) if linkpath else str(node['_id'])
      sys_statuses = check_object_on_system_types(list, node['datalink'],node, parents_list)
      for s_key in sys_statuses:
        node[s_key] = sys_statuses[s_key]
      node['is_buy']= check_link_on_buy(list, node['datalink'])
      node['is_system']= check_link_on_system(list, node['datalink'])
      # строим дерево для основного элемента
      if node['datalink'] in original_elem_list:

        res = fast_elem_copy(original_elem_list[node['datalink']], parents_list)
        fill_link_path(res,linkpath)
      else:
        res = make_full_tree(list,node['datalink'], '', deep+1, is_short, parents_list,original_elem_list, deep_level)
        original_elem_list[node['datalink']] = res
        res = fast_elem_copy(res)
        fill_link_path(res,linkpath)

      if not res:
        res = {'node':None, 'children':[]}
      else:
        if 'properties' in res['node']:
          node['properties'] = None
          node['properties'] = res['node']['properties']

      # вытягиваем деревья для чайлдов линка
      children = get_childs(list, elem_id)
      child_tree = []

      #is_parent_system = False
      is_parent_system = True if node.get('is_system') or node.get('is_objective_system') else False


      for c in children:
        if c.get('status')!='del' and 'datalink' in c :
          sys_statuses = check_object_on_system_types(list, c['datalink'], node, parents_list)
          for s_key in sys_statuses:
            if sys_statuses[s_key]:
              node[s_key] = sys_statuses[s_key]
          check_on_sys_child(node,c,list,parents_list)
      for c in children:
        if c.get('status')!='del':
          c['is_objective_system'] = is_parent_system
          ce = make_full_tree(list,c["_id"], linkpath, deep+1, is_short, parents_list_deep,original_elem_list,deep_level)
          if ce:
            child_tree.append(ce)
      # мержим
      res_childs = []
      for r in res['children']:

        is_find = False
        for c in child_tree:
          if r['node']['name']==c['node']['name'] and r['node']['type']==c['node']['type']:
            is_find = True
            #print c
            res_childs.append(c)
            child_tree.remove(c)
            break
        if not is_find:
          check_on_sys_child(node,r['node'],list,parents_list)
          res_childs.append(r)
      for c in child_tree:
        res_childs.append(c)
      result['children'] = res_childs
    else:
      children = get_childs(list, elem_id)
      child_tree = []
      if node.get('datalink'):
        node['is_system']= check_link_on_system(list, node['datalink'])
      #is_parent_system = False
      is_parent_system = True if node.get('is_system') or node.get('is_objective_system') else False


      for c in children:
        if c.get('status')!='del' and 'datalink' in c :
          sys_statuses = check_object_on_system_types(list, c['datalink'],node, parents_list)
          for s_key in sys_statuses:
            if sys_statuses[s_key]:
              node[s_key] = sys_statuses[s_key]
          check_on_sys_child(node,c,list,parents_list)

      for c in children:
        if c.get('status')!='del':
          c['is_objective_system'] = is_parent_system
          ce = make_full_tree(list,c["_id"], linkpath, deep+1, is_short, parents_list_deep,original_elem_list,deep_level)
          if ce:
            child_tree.append(ce)

      result['children'] = child_tree
    # сортируем child-ов
    result['children'].sort(key=lambda c:c['node']['routine'])

    return result
  else:
    #print 'err-'+str(node['_id'])
    return None

def make_full_tree_production(list, elem_id, is_short = False, parents_list=None, original_elem_list = {}, deep_level=200):
  '''
  Метод создает дерево объектов для конкретной продукции с кэшированием
  '''
  key = 'pr_'+str(elem_id)
  if key in original_elem_list:
    parents_list = [{'node':list['data'][elem_id],'children':[], 'linkpath':''}]
    return fast_elem_copy(original_elem_list[key], parents_list)
  else:
    res = make_full_tree(list, elem_id, '', 0, is_short, parents_list, original_elem_list, deep_level)
    original_elem_list[key] = res
    # сдесь возможна оптимизация, если в fast_elem_copy чилдренов брать не только зи children, но и из origin_children, тогда возвращать можно не копию res, а сам res
    return fast_elem_copy(res)
  # # проверяем, есть ли данные в кэше
  # res = datacachemodel.get_by({'product_id':elem_id, 'is_short':is_short},None)
  # if not res:
  #   res = make_full_tree(list, elem_id, '', 0, is_short, parents_list, original_elem_list)
  #   res = datacachemodel.add({'product_id':elem_id, 'is_short':is_short, 'data':res})
  # return res['data']

def check_on_sys_child(node, child,list, parents_list):
  datalink = child.get('datalink')
  c = child
  if datalink == datamodel.SYSTEM_OBJECTS['SYS_PROP']:
    node['is_system'] = True
  elif datalink == datamodel.SYSTEM_OBJECTS['BUY_PROP']:
    node['is_buy'] = True
  if c['type']=='product_model' and node['type']=='product' and not node.get('is_buy', False):
    node['is_buy'] = check_link_on_buy(list, datalink)
  if node['type'] == 'operation' and not node.get('is_separate',False):
    if datalink == datamodel.SYSTEM_OBJECTS['SEP_PROP']:
      node['is_separate']= True
  if node['type'] == 'product' and datalink== datamodel.SYSTEM_OBJECTS['IN_PROP']:
    node['is_input']= True
  if node['type'] == 'value' and not node.get('is_inherit',False):
    if datalink == datamodel.SYSTEM_OBJECTS['INHERIT_PROP']:
      node['is_inherit']= True
  if node['type'] == 'value' and not node.get('is_default', False):
    if datalink == datamodel.SYSTEM_OBJECTS['DEFAULT_VAL']:
      node['is_default']= True
  # проверка объекта на группирующий(технологические аналоги)
  if node['type'] == 'product_model' and datalink == datamodel.SYSTEM_OBJECTS['TECHNO_GROUP_PROP']:
    node['is_techno_group']= True
  # проверка объекта на группирующий (покупные аналоги)
  if node['type'] == 'product_model' and datalink == datamodel.SYSTEM_OBJECTS['BUY_GROUP_PROP']:
    node['is_buy_group']= True
  # проверка объекта на группирующий (технологические аналоги)
  if node['type'] == 'product_model' and datalink == datamodel.SYSTEM_OBJECTS['BUY_GROUP_PROP']:
    node['is_buy_group']= True
  # проверка объекта на комплект
  if node['type'] == 'product_model' and datalink == datamodel.SYSTEM_OBJECTS['COMPLECT_PROP']:
    node['is_complect']= True
  # проверка свойства на опциональное
  if node['type'] == 'property' and check_on_option(parents_list, node, c):
    node['is_optional']= True
  # проверка свойства на технологическое
  if node['type'] == 'property' and not node.get('is_techno',False):
    if datalink == datamodel.SYSTEM_OBJECTS['TECHNO_PROP']:
      node['is_techno']= True

def make_local_tree(list, elem_id, parents_list=None):
  '''
    Рекурсивная функция построения дерева объектов
    для определения системных объектов
  '''
  node = None
  if elem_id:
    if elem_id not in list['data']:
      return None
    node =list['data'][elem_id]
    if node.get('status','')=='del':
      return None

  result = {'node':node, 'children':[]}

  parents_list_deep = [] if parents_list is None else copy(parents_list)
  parents_list_deep.append(result)

  if node and node.get('datalink'):
    # проверка на системные статусы
    sys_statuses = check_object_on_system_types(list, node['datalink'], node, parents_list)
    for s_key in sys_statuses:
      node[s_key] = sys_statuses[s_key]
    node['is_buy']= check_link_on_buy(list, node['datalink'])
    node['is_system']= check_link_on_system(list, node['datalink'])

  children = get_childs(list, elem_id)
  child_tree = []
  is_parent_system = False
  if node:
    is_parent_system = True if node.get('is_system') or node.get('is_objective_system') else False
    for c in children:
      if 'datalink' in c :
        # проверка на системные статусы
        sys_statuses = check_object_on_system_types(list, c['datalink'],node, parents_list)
        for s_key in sys_statuses:
          if sys_statuses[s_key]:
            node[s_key] = sys_statuses[s_key]
        check_on_sys_child(node,c,list,parents_list)
    if node['_id']==datamodel.SYSTEM_OBJECTS['SYS_LYB']:
      node['is_system'] = True
      is_parent_system = True

  for c in children:
    c['is_objective_system'] = is_parent_system
    ce = make_local_tree(list,c["_id"],parents_list_deep)
    if ce:
      child_tree.append(ce)
  result['children'] = child_tree
  return result

def fast_elem_copy(elem, parents_list = None):
  '''
  Быстрое копирование node (переопределяет списочные типы и linkpath)
  для опционалных свойств требуется проверять properties у продукта (не снята ли галочка "Опция")
  '''
  if elem:
    ne = {'node':elem['node'], 'linkpath':elem['linkpath']}
    # copy(elem)
    #clist = elem['children'] if not 'origin_children' in elem else elem['origin_children']
    clist = elem['children']
    cne = []
    if ne['node']['type'] == 'property' and parents_list:
      is_optional = False
      for c in clist:
        if check_on_option(parents_list, ne['node'], c['node']):
          is_optional = True
        p = fast_elem_copy(c)
        cne.append(p)
      if is_optional!=ne['node'].get('is_optional',False):
        ne['node'] = copy(ne['node'])
        ne['node']['is_optional'] = is_optional
      ne['children'] = cne
    else:
      for c in clist:
        p = fast_elem_copy(c, parents_list)
        cne.append(p)
      ne['children'] = cne
    return ne

def fill_link_path(node, linkpath):
  '''
  Заполняет linkpath-ы для закэшированных объектов
  '''
  if linkpath and node:
    node['linkpath'] = (linkpath+"-"+str(node['linkpath'])) if node.get('linkpath') else linkpath
    for c in node['children']:
      fill_link_path(c,linkpath)


def make_condition_branch(list, elem_id, linkpath):
  '''
  Сбор ветки условий. Сбор продолжается до первого встретившегося значения.
  собираются только ноды - ярлыки без их разыменования
  '''
  node = list['data'][elem_id] if elem_id in list['data'] else None
  if node and ('status' not in node or node['status']!='del'):
    result = {'node':node, 'children':[], 'linkpath':linkpath}

    # вытягиваем чайлды условия
    children = get_childs(list, elem_id)
    for c in children:
      ce = make_condition_branch(list,c["_id"], linkpath)
      if ce:
        result['children'].append(ce)
    return result
  return None

def check_link_on_buy(list, elem_id):
  '''
    Проверка ярлыка объекта на статус покупного
    Модель покупная, если содежит среди детей ярлык на покупное свойство
    Изделие покупное, если содержит ярлык на покупную модель
  '''
  if elem_id not in list['data']:
    return False
  # получение элемента по ссылке
  node =list['data'][elem_id]
  # получение всех детей элемента,и проверка нет ли среди них ссылки на свойство (покупное)
  children = get_childs(list, elem_id)
  if node['type'] == 'product':
    for c in children:
      if c['type']=='product_model' and 'datalink' in c :
        if check_link_on_buy(list, c['datalink']):
          return True
  else:
    for c in children:
      if c['type']=='property' and 'datalink' in c and c['datalink'] == datamodel.SYSTEM_OBJECTS['BUY_PROP'] and  ('status' not in c or c['status']!='del'):
        return True
  return False

def check_link_on_system(list, elem_id):
  '''
    Проверка ярлыка на системность. Ярлык является системным, если ссылается на объект
    в который вложено системное свойство(.system) или объект находится в системной библиотеке(.system)
    или ярлык ссылается на системное свойство .system
  '''
  if elem_id not in list['data']:
    return False
  if elem_id == datamodel.SYSTEM_OBJECTS['SYS_PROP']:
    return True
  # получение элемента по ссылке
  node =list['data'][elem_id]

  # получение всех детей элемента,и проверка нет ли среди них ссылки на свойство (.sys)
  children = get_childs(list, elem_id)
  for c in children:
    if c['type']=='property' and 'datalink' in c and c['datalink'] == datamodel.SYSTEM_OBJECTS['SYS_PROP']:
      return True

  # получение родителя элемента, и проверка не является ли он библиотекой (.system)
  if node['parent_id'] and node['parent_id'] in list['data']:
    parent_node = list['data'][node['parent_id']]
    if parent_node['_id'] == datamodel.SYSTEM_OBJECTS['SYS_LYB']:
      return True
  return False

def check_link_on_separate(list, elem_id):
  '''
    Проверка ярлыка объекта на статус разделительного
  '''
  if elem_id not in list['data']:
    return False
  # получение элемента по ссылке
  # node =list['data'][elem_id]
  # получение всех детей элемента,и проверка нет ли среди них ссылки на свойство (разделительное)
  children = get_childs(list, elem_id)
  for c in children:
    if c['type']=='property' and 'datalink' in c and c['datalink'] == datamodel.SYSTEM_OBJECTS['SEP_PROP'] and  ('status' not in c or c['status']!='del'):
      return True
  return False

def check_link_on_input(list, elem_id):
  '''
    Проверка ярлыка объекта на статус входного объекта
    Используется в шаблонах, для определения, какой объект в списке является входным
    Объект является входным, если содержит в себе ссылку на системное свойство - (вход разделительной операции)
  '''
  if elem_id not in list['data']:
    return False
  # получение элемента по ссылке
  # node =list['data'][elem_id]
  # получение всех детей элемента,и проверка нет ли среди них ссылки на свойство (разделительное)
  children = get_childs(list, elem_id)
  for c in children:
    if c['type']=='property' and 'datalink' in c and c['datalink'] == datamodel.SYSTEM_OBJECTS['IN_PROP'] and  ('status' not in c or c['status']!='del'):
      return True
  return False

def check_link_on_group(list, elem_id):
  '''
    Проверка ярлыка объекта на статус группирующего
    Используется в моелях для определения статуса модели в качестве группы
    Модель является группирующей если содержит в себе свойство: TECHNO_GROUP_PROP или BUY_GROUP_PROP
  '''
  if elem_id not in list['data']:
    return False
  # получение всех детей элемента,и проверка нет ли среди них ссылки на свойство (разделительное)
  children = get_childs(list, elem_id)
  for c in children:
    if c['type']=='property' and (c.get('datalink') == datamodel.SYSTEM_OBJECTS['TECHNO_GROUP_PROP'] or c.get('datalink') == datamodel.SYSTEM_OBJECTS['BUY_GROUP_PROP']) and c.get('status')!='del':
      return True
  return False

def check_link_on_inherit(list, elem_id):
  '''
    Проверка ярлыка объекта на статус наследуемого
  '''
  if elem_id not in list['data']:
    return False
  # получение элемента по ссылке
  # node =list['data'][elem_id]
  # получение всех детей элемента,и проверка нет ли среди них ссылки на свойство (разделительное)
  children = get_childs(list, elem_id)
  for c in children:
    if c['type']=='property' and 'datalink' in c and c['datalink'] == datamodel.SYSTEM_OBJECTS['INHERIT_PROP'] and ('status' not in c or c['status']!='del'):
      return True
  return False

def check_link_on_default(list, elem_id):
  '''
    Проверка ярлыка объекта на статус значения по умолчанию
  '''
  if elem_id not in list['data']:
    return False
  # получение всех детей элемента,и проверка нет ли среди них ссылки на свойство (разделительное)
  children = get_childs(list, elem_id)
  for c in children:
    if c['type']=='property' and c.get('datalink') ==  datamodel.SYSTEM_OBJECTS['DEFAULT_VAL'] and c.get('status','')!='del':
      return True
  return False

def check_link_on_complect(list, elem_id):
  '''
    Проверка ярлыка объекта на статус  - комплекта
  '''
  if elem_id not in list['data']:
    return False
  children = get_childs(list, elem_id)
  for c in children:
    if c['type']=='property' and c.get('datalink') ==  datamodel.SYSTEM_OBJECTS['COMPLECT_PROP'] and c.get('status','')!='del':
      return True
  return False

def check_link_on_techno(list, elem_id):
  '''
    Проверка ярлыка объекта на статус технологического
  '''
  if elem_id not in list['data']:
    return False
  children = get_childs(list, elem_id)
  for c in children:
    if c['type']=='property' and 'datalink' in c and c['datalink'] == datamodel.SYSTEM_OBJECTS['TECHNO_PROP'] and  ('status' not in c or c['status']!='del'):
      return True
  return False

def check_link_on_optional(list, elem_id):
  '''
    Проверка ярлыка объекта на статус опционального
  '''
  if elem_id not in list['data']:
    return False
  children = get_childs(list, elem_id)
  for c in children:
    if c['type']=='property' and c.get('datalink') ==  datamodel.SYSTEM_OBJECTS['OPTION_PROP'] and c.get('status','')!='del':
      return True
  return False

def check_object_on_system_types(list, elem_id, node_elem, parents_list):
  '''
  Функция проверки объета на системноть. Включает следующие проверки:

  *** (is_system) Проверка на системность. Ярлык является системным, если ссылается на объект
  в который вложено системное свойство(.system) или объект находится в системной библиотеке(.system)
  или ярлык ссылается на системное свойство .system

  *** (is_separate) Проверка ярлыка объекта на статус разделительного

  *** (is_input) Проверка ярлыка объекта на статус входного объекта
  Используется в шаблонах, для определения, какой объект в списке является входным
  Объект является входным, если содержит в себе ссылку на системное свойство - (вход разделительной операции)

  *** (is_techno_group) Проверка ярлыка объекта на статус группирующего (технологические аналоги)
  Используется в моелях для определения статуса модели в качестве группы

  *** (is_buy_grouop) Проверка ярлыка объекта на статус группирующего (покупные аналоги)
  Используется в моелях для определения статуса модели в качестве группы

  *** (is_inherit) Проверка ярлыка объекта на статус наследуемого

  *** (is_default) Проверка ярлыка объекта на статус значения по умолчанию

  *** (is_optional) Проверка ярлыка объекта на статус опционального

  *** (is_techno) Проверка ярлыка объекта на статус технологического

  *** (is_complect) Проверка ярлыка объекта на статус комплекта

  *** (is_otbor) Проверка ярлыка объекта на статус отбора

  Результатом выполнения функции является структура с названием вида системности и флага True/False
  '''
  # результирующая структура
  result = {
    #'is_system': False,  # системный
    'is_separate': False,   # разделительный
    'is_input': False,  # входящий
    'is_techno_group': False, # группирующий (технологические аналоги)
    'is_buy_group': False, # группирующий (покупные аналоги)
    'is_inherit': False,  # наследуемый
    'is_default': False,  # по умолчанию
    'is_optional': False,   # опциональный
    'is_techno': False,   # технологический
    'is_complect': False,   # опциональный
    'is_otbor': False   # отбор
  }
  # базовая проверка на существование объекта
  node =list['data'].get(elem_id)
  if not node:
    return result

  if node['parent_id'] and node['parent_id'] in list['data']:
    parent_node = list['data'][node['parent_id']]
  # получение всех детей элемента
  children = get_childs(list, elem_id)

  # проверка
  #if node.get('_id') == datamodel.SYSTEM_OBJECTS['SYS_PROP'] or node.get('datalink') == datamodel.SYSTEM_OBJECTS['SYS_PROP']:
  # result['is_system'] = True

  # проверка по детям
  for c in children:
    if c.get('status')!='del':
      # # систмный
      # if c.get('datalink') == datamodel.SYSTEM_OBJECTS['SYS_PROP']:
      #   result['is_system'] = True
      # разделительный
      # разделительный
      if c.get('datalink') == datamodel.SYSTEM_OBJECTS['COMPLECT_PROP']:
        result['is_complect'] = True
      if c.get('datalink') == datamodel.SYSTEM_OBJECTS['OTBOR_PROP']:
        result['is_otbor'] = True
      if c.get('datalink') == datamodel.SYSTEM_OBJECTS['SEP_PROP']:
        result['is_separate'] = True
      # входящий
      elif c.get('datalink') == datamodel.SYSTEM_OBJECTS['IN_PROP']:
        result['is_input'] = True
      # группирующий(технологические аналоги)
      elif c.get('datalink') == datamodel.SYSTEM_OBJECTS['TECHNO_GROUP_PROP']:
        result['is_techno_group'] = True
      # группирующий(покупные аналоги)
      elif c.get('datalink') == datamodel.SYSTEM_OBJECTS['BUY_GROUP_PROP']:
        result['is_buy_group'] = True
      # наследуемый
      elif c.get('datalink') == datamodel.SYSTEM_OBJECTS['INHERIT_PROP']:
        result['is_inherit'] = True
      # по умолчанию
      elif c.get('datalink') == datamodel.SYSTEM_OBJECTS['DEFAULT_VAL']:
        result['is_inherit'] = True
      # опциональный
      elif check_on_option(parents_list,node_elem,c):# c.get('datalink') == datamodel.SYSTEM_OBJECTS['OPTION_PROP']:
        result['is_optional'] = True
      elif c.get('datalink') == datamodel.SYSTEM_OBJECTS['TECHNO_PROP']:
        result['is_techno'] = True

  # # проверка по родителям
  # if parent_node:
  #   # системное
  #   if parent_node.get('_id') == datamodel.SYSTEM_OBJECTS['SYS_LYB']:
  #     result['is_system'] = True

  return result

def check_on_links(search_elem_id):
  '''
  Функция получения информации о наличии ссылок на элемент.
  '''
  result = []
  try:
    # search all childs for elem
    regx = re.compile(search_elem_id, re.IGNORECASE)
    dataItems = datamodel.get(
      {
        '$or':
        [
          {'path':regx},
          {'_id': ObjectId(search_elem_id)},
        ],
        'status':{'$ne':'del'},
      },None)

    # собратяь все ярлыки на элемент
    tmp_ids = []
    for i in dataItems:
      tmp_ids.append(i['_id'])
    linked_elems = []
    if len(tmp_ids)>0:
      linked_elems = datamodel.get({'datalink': {'$in':tmp_ids}, 'status':{'$ne':'del'},}, None)
    if linked_elems and len(linked_elems)>0:
      for i in linked_elems:
        if i not in result:
          result.append(i)
    return result
  except Exception, exc:
    excType = exc.__class__.__name__
    print_exc()
    raise Exception(u"Ошибка получения данных о ярлыках на объект. Подробности: %s. %s" %(excType,str(exc)))

def get_leveldata_by_data_links(data, include_real_id=False):
  '''
    Функция получения данных по ссылкам на 2 уровня вниз
  '''
  result = []
  links_ids = []
  links_result = []
  for row in data:
    if 'datalink' in row and row['datalink'] and row['datalink'] not in links_ids:
      links_ids.append(row['datalink'])

    # если помисо ссылок надо провалиться в реальыне объекты
    if include_real_id:
      if row['_id'] not in links_ids:
        links_ids.append(row['_id'])

  if len(links_ids)>0:
    links_result = datamodel.get({
      #'_id': {'$in':links_ids}
      '$or':[{'parent_id': {'$in':links_ids}},{'_id': {'$in':links_ids}}]
    },None)
  # из результата выбранных объектов по datalink вытягиваем
  # родителей на уровень вверх и детей на уровень вниз
  items_ids = []
  items_result = []
  if len(links_result)>0:
    result.extend(links_result)
    for row in links_result:
      items_ids.append(row['parent_id'])
  if len(items_ids)>0:
    items_result = datamodel.get({
      '_id': {'$in':items_ids}
      #'$or':[{'parent_id': {'$in':items_ids}},{'_id': {'$in':items_ids}}]
    },None)
    if len(items_result)>0:
      result.extend(items_result)

  return result

def check_on_option(parents_list, property, child):
  '''
    Функция проверяет, является св-во "property" опцией.
    Оценивается вложенное в "property" child, а так же продукция (а именно значения из списка properties), которое получается из списка родительский узлов "parents_list"
  '''

  if child['datalink'] == datamodel.SYSTEM_OBJECTS['OPTION_PROP'] and parents_list:
    for p in parents_list:
      if p['node'] and p['node']['type']=='product':
        product = p['node']
        for p in product.get('properties',[]):
          if p.get('property_id')==property.get('_id'):
            for v in p.get('values',[]):
              if v['value']['id']==child['_id']:
                if v['value']['value']=='off':
                  return False
                else:
                  if v['value']['value']=='on':
                    return True
                break
    return True

  '''if child['datalink'] == datamodel.SYSTEM_OBJECTS['OPTION_PROP']:
    is_option = True
    # проверяем значения из parents_list
    if parents_list and len(parents_list)>0 and parents_list[0]['node'] and parents_list[0]['node']['type']=='product':
      product = parents_list[0]['node']
      for p in product.get('properties',[]):
        if p.get('property_id')==property.get('_id'):
          for v in p.get('values',[]):
            print v['value']['id']
            if str(v['value']['id'])==str(child['_id']):
              if v['value']['value']=='off':
                is_option=False
              break
          break
    print is_option
    return is_option'''
  return False

def get_system_childs(data, result):
  '''
  Функция получения системных детей из дерева объектов, начиная с верхушки
  '''
  if data['node'].get('is_system'):
    result.append(data['node'])
  for c in data['children']:
    get_system_childs(c, result)

def tree_to_array(node, res):
  '''
  Преобразование дерева к списку
  '''
  res.append(node['node'])
  for c in node['children']:
    tree_to_array(c,res)

def refresh_paths(node, parent_path, parent_id,err_list):
  '''
  Функция обновления всех путей по дереву элементов,
  начиная от заданного родителя
  '''
  if node['node']['path']!=parent_path:
    err_list.append(node['node'])
    node['node']['path'] = parent_path
  for c in node['children']:
    refresh_paths(c,(parent_path+'-'+str(node['node']['_id'])) if parent_path else str(node['node']['_id']),node['node']['_id'],err_list)

def get_elem(list,elem_id):
  '''
    Поиск элемента по ID в списке данных
  '''
  if elem_id in list['data']:
    return list['data'][elem_id]
  return None

def get_products_by_productmodel_link(list,link):
  '''
    Поиск всей продукции созданной по указанной модели
    list - список данных
    link - ссылка на исходную модель продукции
  '''
  res_products = []
  if link['datalink']:
    original_product_model = get_elem(list,link['datalink'])
  else:
    original_product_model = link
  links_to_original_product_model =  list['links'].get(original_product_model['_id'], None)
  if original_product_model and links_to_original_product_model and len(links_to_original_product_model)>0:
    for i in links_to_original_product_model:
      item = get_elem(list, i)
      if 'parent_id' in item:
        item = get_elem(list, item['parent_id'])
        if item and item['type']=='product' and ('status' not in item or item['status']!='del') and item not in res_products:
          res_products.append(item)

  res_products.sort(key = lambda x: (x['name']))
  return res_products

def get_childs_ignore_libs(list,elem_id):
  '''
    Получить всех детей первого уровня элемента, игнорируя библиотеки
  '''
  result = []
  childs_id = list['childs'].get(elem_id,[])
  for i in childs_id:
    if i in list['data'] and list['data'][i].get('status')!='del':
      if list['data'][i]['type']=='library':
        nlist = get_childs_ignore_libs(list, list['data'][i]['_id'])
        if not nlist and list['data'][i].get('datalink'):
          nlist = get_childs_ignore_libs(list, list['data'][i].get('datalink'))
        print list['data'][i]['_id']
        print list['data'][i].get('datalink')
        result = result+nlist
      else:
        result.append(list['data'][i])
  return result

def clone_tree(copied_item, node, parent_path, parent_id, create_links=False):
  '''
  Функция клонирования дерева объектов
  create_links определяет, нужно ли копировать объект, или нужно создавать ссылку на объект
  '''
  new_id = ObjectId()

  # если клонирование изделия, то необходимо пробежаться по его свойствам
  # и в них поменять значения linkpath на новые
  if not copied_item:
    copied_item = node
    node['node']['copy_from_id'] = node['node']['_id']

  elif 'properties' in copied_item['node']:
    for prop in copied_item['node']['properties']:
      prop['linkpath'] = prop['linkpath'].replace(str(node['node']['_id']), str(new_id))

  if create_links and not node['node']['datalink']:
    node['node']['datalink'] = node['node']['_id']
    node['children'] = []

  # подмена идентификаторов и пути на новые значения
  node['node']['_id'] = new_id
  node['node']['parent_id'] = parent_id
  node['node']['path'] = parent_path

  # вызов рекурсии для чайлдов  элемента
  for c in node['children']:
    clone_tree(copied_item, c,(parent_path+'-'+str(new_id)) if parent_path else str(new_id),new_id, create_links)

def get_childs(list,elem_id):
  '''
    Получить всех детей первого уровня элемента
  '''
  result = []
  childs_id = list['childs'].get(elem_id,[])
  for i in childs_id:
    if i in list['data']:
      result.append(list['data'][i])
  return result

def has_types(list, elem_id, types):
  '''
    Функция проверки наличия в элементе указанных типов объектов.
    Проваливаение по детям идет вниз пока не встретится искомый тип.
    Проваливание идет только по библиотекам.
    Также ведется учет ярлыков.
  '''
  childs = get_childs(list, elem_id)
  for child in childs:
    if child.get('status','')!='del' and  child['type'] in types:
      return True
  for child in childs:
    if child.get('status','')!='del' and child['type'] == 'library':
      if has_types(list, child['_id'], types):
        return True
      if child.get('datalink') and has_types(list, child['datalink'], types):
        return True
  return False

def has_childs(list,elem_id):
  '''
    Проверка на наличие детей у элемента
  '''
  if elem_id in list['childs'] and len(list['childs'][elem_id])>0:
    return True
  return False

def get_first_level_parents(list, node, types = ['product_model']):
  '''
    Поиск всех парентов первого уровня для указанного объекта
    list - список данных
    node - объект для поиска
    types - типы которые необходимо вытянуть
  '''
  res = []
  original_node = get_elem(list,node['datalink']) if node.get('datalink') else node
  links_to_original_node =  list['links'].get(original_node['_id'], None)

  if original_node and links_to_original_node and len(links_to_original_node)>0:
    for i in links_to_original_node:
      item = get_elem(list, i)
      if 'parent_id' in item:
        item = get_elem(list, item['parent_id'])
        if item and item['type'] in types and item.get('status')!='del' and item not in res:
          res.append(item)

  res.sort(key = lambda x: (x['name']))
  return res

def get_model_properties(number, list = None):
  '''
    Функция получения всех свойств модели
  '''
  from apis.esud import esudcomplectapi
  result = None
  full_time =  time.clock()
  # получить данные о модели
  cur_elem = datamodel.get_by({'number': number, 'type':'product_model', 'datalink': None, 'status':{'$ne':'del'}})
  if not cur_elem:
    raise Exception("Ошибка! Модель не найдена.")
  # получить данные ЭСУД
  start = time.clock()
  if not list:
    # получение и обработка данных
    list = datamodel.get_cached_data()
  print "time get ESUD data is: ", time.clock() - start
  cache_data = {}
  start = time.clock()
  # построить дерево модели со всеми свойствами и конфигурациями
  tree = make_full_tree_production(list, cur_elem['_id'], True, None, cache_data)
  # очистить дерево от библиотек
  clear_tree_from_types(tree, ['library'])
  errors = []
  result =  esudcomplectapi.prepare_tree_to_complect(list, tree, errors)
  print "time prepare data is: ", time.clock() - start
  start = time.clock()
  # получить родительские модели для текущей
  parent_models = [ {'name': row['name'], '_id' : row['_id'], 'number': row['number']} for row in get_first_level_parents(list, cur_elem, ['product_model']) ]
  parent_models.sort(key=lambda x:x['number'])
  print "time get parent models is: ", time.clock() - start
  print "get_model_properties ful time  is: ", time.clock() - full_time
  return {'properties': result, 'parent_models': parent_models}

def update_config_props(params, usr):
  '''
    Обновление свойств конфигураций
    Входные параметры:
    [{"configs": ["557.001","557.002"], "props": [{"prop":"57a4fad85f0f19103e36cc5b", "val":"557", "unit":"мм"},{"prop":"57a62b235f0f19157aa1f45c", "val":"Чёрный", "unit":""}]}]
  '''
  result = []
  try:
    # получить данные ЭСУД
    start = time.clock()
    # получение и обработка данных
    list = datamodel.get_cached_data()

    # сбор информации о всех конфигурациях, задействованных в обновлении
    # плюс построение параметризованного объекта для каждой конфигурации
    configurations_cache = {}
    for param in params:
      # вытягивание указанных конфигураций
      for config_num in param['configs']:
        if config_num not in configurations_cache:
          configurations_cache[config_num] = get_model_properties(config_num.split('.')[0], list)

    print "Get ESUD data is: ", time.clock() - start
    start = time.clock()
    for param in params:
      # вытягивание указанных конфигураций
      for config_num in param['configs']:
        # получить данные о конфигурации
        node = datamodel.get_by({'number': config_num, 'datalink': None, 'status':{'$ne':'del'}})
        if node:
          # запись факта изменения свойств в историю
          if not node.get('history'):
            node['history'] = []
          node['history'].append({'user':usr['email'],'date': datetime.datetime.utcnow(),'data': node.get('properties'), 'note':'auto update' })
          datamodel.update(node['_id'],{'history': node['history']})

          # цикл по свойствам, которые необходимо поменять
          for prop_row in param['props']:
            # подготовка информации об изменяемом значении и единице измерения
            prop_info = None
            try:
              product_config_info = configurations_cache[config_num]['properties']
              prop_info = (item for item in product_config_info.get('properties',[]) if str(item['_id']) == prop_row['prop'] or str(item.get('datalink')) == prop_row['prop']).next()
            except:
              pass
            # получение информации о свойстве
            # prop_info = datamodel.get_by({'_id': ObjectId(prop_row['prop']), 'status':{'$ne':'del'}})
            print('----------------')
            print(prop_info)
            print('----------------')
            if prop_info:
              prop_info_origin_id = prop_info['datalink'] if prop_info.get('datalink') else prop_info['_id']
              # поиск информации о значении и единице измерения по их названиям
              # поиск ведется внутри указанного свойства
              # также сразу фиксируется открытое значение
              val_info = None
              open_val_info = None
              unit_info = None
              for item in prop_info.get('values',[]):
                if item.get('is_open', False):
                  open_val_info = item

                if str(item['_id']) == prop_row['val'] or str(item.get('datalink')) == prop_row['val']:
                #if item['name'].lower() == prop_row['val'].lower():
                  val_info = item
                  break
              if not val_info and open_val_info:
                  open_val_info['value'] = prop_row['val']
                  val_info = open_val_info
              if val_info:
                # поиск информации об указанной единице измерения
                # если единица измерения не указана, то берется первая доступная в списке
                if prop_row['unit']:
                  for item in val_info.get('units',[]):
                    if str(item['_id']) == prop_row['unit'] or str(item.get('datalink')) == prop_row['unit']:
                    #if item['name'].lower() == prop_row['unit'].lower():
                      unit_info = item
                      break
                elif val_info.get('units') and len(val_info['units'])>0:
                  unit_info = val_info['units'][0]
              else:
                result.append({
                  'number': config_num,
                  'prop_name': prop_info['name'],
                  'prop_value': prop_row['val'],
                  'status': 'error',
                  'msg' : 'Указанное значение не найдено в списке допустимых'
                })

              # среди свойств конфига ищем указанное. Если для свойства уже сохранялось
              # какое-либо значение, то обновляем значение на новое
              is_node_has_property =False
              node_prop = None
              for node_prop in node.get('properties',[]):
                if str(node_prop.get('property_origin_id')) == str(prop_info_origin_id):
                  is_node_has_property = True

              # если в списке свойств конфига, еще не сохранялось значение для указанного свойства
              # иначе если значение для указанного свойства уже указывалось, то ищем его в списке свойств конфига и обновляем
              if not is_node_has_property:
                config_model = get_childs(list, ObjectId(node['_id']))[0]
                # формируем информацию о свойстве и добавляем в список свойств конфига
                new_prop =  {
                  'configuration_path' : '',
                  'product_config' : None,
                  'linkpath' : str(config_model['_id']),
                  'elem_id' : str(node['_id']),
                  'values' : [
                    {
                      'value' : {
                          'id' :  ObjectId(val_info['_id']),
                          'value' : val_info['value']
                      },
                      'unit' : {
                          'id' : ObjectId(unit_info['_id']) if unit_info else None,
                          'value' :  unit_info['name'] if unit_info else None
                      },
                      'autoupdate': True
                    }
                  ],
                  'property_origin_id' : ObjectId(prop_info_origin_id),
                  'type' : 'property_value',
                  'property_id' : ObjectId(prop_info['_id'])
                }

                if not node.get('properties'):
                  node['properties'] = []
                node['properties'].append(new_prop)

              else:
                node_prop['values'] = [
                    {
                      'value' : {
                          'id' :  ObjectId(val_info['_id']),
                          'value' : val_info['value']
                      },
                      'unit' : {
                          'id' : ObjectId(unit_info['_id']) if unit_info else None,
                          'value' :  unit_info['name'] if unit_info else None
                      },
                      'autoupdate': True
                    }
                  ]
              result.append({
                'number': config_num,
                'prop_name': prop_row['prop'],
                'prop_value': val_info['value'] if val_info else '',
                'status': 'ok',
                'msg' : ''
              })
            else:
              result.append({
                'number': config_num,
                'prop_name': prop_row['prop'],
                'prop_value': '',
                'status': 'error',
                'msg' : 'свойство не найдено'
              })
          # обновить все свойства конфига
          datamodel.update_by(
            {'_id': node['_id']},
            {'$set': {'properties': node.get('properties',[])}}
          )
        else:
          result.append({
              'number': config_num,
              'prop_name': '',
              'prop_value': '',
              'status': 'error',
              'msg' : 'конфигурация не найдена'
            })

    print "Analyse and update data is: ", time.clock() - start
    return result

  except Exception, exc:
    print('----Error. esudspecificationapi.update_config_props; {0}'.format(str(exc)))
    print_exc()
    raise Exception(str(exc))


def get_simple_dir_tree_with_sectors():
  '''
    #1881. Спецификации 2.0. Третий уровень группировки
  '''
  result = []
  try:
    int_libs = datamodel.get({'_id': {'$in': datamodel.INT_DIR_LIBS }}, None)
    i = 1
    for lib in int_libs:
      result.append({
        '_id': str(lib['_id']),
        'linkpath': str(lib.get('linkpath','')),
        'name': lib['name'],
        'number': i,
        'routine': lib['routine'],
        'items': get_simple_dir_tree(lib['_id']),
        'index': i,
        'type': 'sector'
      })
      i += 1

    return result
  except Exception, exc:
    print('----Error. get_simple_dir_tree_with_sectors; {0}'.format(str(exc)))
    print_exc()
    raise Exception(str(exc))

def get_2level_simple_dir_tree():
  '''
    Все категории и группы по всем направлениям без включения самих направлений в результата
  '''
  result = []
  try:
    int_libs = datamodel.get({'_id': {'$in': datamodel.INT_DIR_LIBS }}, None)
    for lib in int_libs:
      result.extend(get_simple_dir_tree(lib['_id']))
    return result
  except Exception, exc:
    print('----Error. get_simple_dir_tree_with_sectors; {0}'.format(str(exc)))
    print_exc()
    raise Exception(str(exc))

def get_simple_dir_tree(dir_id):
  '''
    #1870. Общий справочник: Категория / Раздел / Группа (Материалы и Бюджет)
    _id - id конфигурации
    list - список данных
    datamodel.SYSTEM_OBJECTS['MATERIALS_DIR_LYB']
  '''
  from apis.esud import esudspecificationapi
  try:
    cache_data = {}
    result = []

    start = time.clock()
    list = datamodel.get_cached_data()
    print "Get data from db: ", time.clock() - start
    # получение всех объектов на первом уровне справочника материалов
    data = get_childs(list, dir_id)
    for node in data:
      if node.get('status')!='del' and node.get('type')=='product' and not node.get('datalink'):
        tree = make_full_tree_production(list, node['_id'], False, None, cache_data)
        clear_tree_from_types(tree, ['library'])
        refresh_parent_node(tree)
        esudspecificationapi.prepare_properties_list(tree)
        # clear_parent_node(tree)
        # return tree
        tmp_result = {
          '_id': str(tree['node']['_id']),
          'linkpath': str(tree['node'].get('linkpath','')),
          'name': tree['node']['name'],
          'number': tree['node']['number'],
          'routine': tree['node']['routine'],
          'items':[],
          'type': 'category'
        }
        for child in tree['children'][0]['children']:
          if child['node'].get('status') != 'del' and child['node'].get('type') == 'product_model':
            tmp_result['items'].append({
              '_id': str(child['node']['_id']),
              'linkpath': str(child['node'].get('linkpath','')),
              'name': child['node']['name'],
              'number': child['node']['number'],
              'routine': child['node']['routine'],
              'type': 'group'
            })
        tmp_result['items'].sort(key = lambda c: (c['routine']))
        i = 1
        for row in tmp_result['items']:
          row['index'] = i
          i += 1
        result.append(tmp_result)

    result.sort(key = lambda c:(c['routine']))
    i = 1
    for row in result:
      row['index'] = i
      i += 1

    return result
  except Exception, exc:
    print('----Error. get_simple_dir_tree; {0}'.format(str(exc)))
    print_exc()
    raise Exception(str(exc))

def makeLinearsGroups(data):
  '''
    Convet tree of groups and categories to linear view
  '''
  result = {}
  if data:
    for row in data:
      result[str(row['_id'])] = row
      result.update(makeLinearsGroups(row.get('items',[])))
  return result

def makeLinearsGroupsWithParents(data, parent = None):
  '''
    Convet tree of groups and categories to linear view
  '''
  result = {}
  if data:
    for row in data:
      row['parent'] = parent
      result[str(row['_id'])] = row
      result.update(makeLinearsGroupsWithParents(row.get('items',[]), row))
  return result
