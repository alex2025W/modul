#!/usr/bin/python
# -*- coding: utf-8 -*-
import datetime, time, routine, config
from bson.objectid import ObjectId
from bson.binary import Binary
from libraries import userlib
from models import datamodel, specificationmodel, queuemodel, configuration_cache_data_model, historymodel, countersmodel
from apis.esud import  esudapi
from traceback import print_exc
from collections import OrderedDict
import re
from copy import deepcopy,copy
import hashlib
import gc
import config

def rebuild_all_specifications_cache():
	'''
		Перестроение КЭШ всех спецификаций.
		Под перестроением КЭШ понимается очистка и перестроение полей "struct" и "include"
	'''
	# очистить КЭШ всех спецификаций
	specificationmodel.update_multy({}, {'struct':'', 'include': [] })
	# перестроить КЭШ
	rebuild_specifications_cache()

def rebuild_specifications_cache(numbers = None):
	'''
		Постройка КЭШей спецификаций, у которых КЭШ еще не помстроен
	'''
	start = time.clock()
	if not numbers:
		# получить список спецификаций с пустым КЭШем
		data = specificationmodel.get_list_by({'struct': ''}, {'number':1})
	else:
		# получить список спецификаций с пустым КЭШем и входящих в заданные номера
		data = specificationmodel.get_list_by({'number': {'$in': numbers}, 'struct': '' }, {'number':1})

	for item in data:
		try:
			print('Rebuild specification struct for: {0}'.format(item['number']))
			specificationmodel.get_specification_struct(item['number'])
		except Exception, exc:
			print('Error! rebuild_specifications_cache - '+ item['number'] +'; '+ str(exc))
			excType = exc.__class__.__name__
			print_exc()
			pass

	print "Time rebuild_specifications_cache  is: ", time.clock() - start


def get_specification_struct(number):
	'''
		Получение структуры спецификации
		number - номер спецификации
		Структура берется из КЭШа, если КЭШ пустой, то строится структура и сохоаняется ее КЭШ
	'''
	# информация о спецификации
	spec_info =specificationmodel.get_by({'number': number})
	if not spec_info:
		raise Exception("Спецификация не найдена.")

	# если КЭШ структуры пустой, то строим его и пересохораняем
	if not spec_info.get('struct'):
		return specificationmodel.get_specification_struct(number)
	else:
		return {'struct': routine.JSONDecode(spec_info['struct']), 'include': spec_info['include']}


def get_specification_first_level_parents(number, allowed_numbers=None):
	'''
		Получить список спецификаций, в которые данная спецификация входит на первом уровне
		number - номер входящей спецификации
		allowed_numbers - список разрешеных номеров спецификаций, в рамках которых идет поиск
	'''
	result = []
	try:
		result = specificationmodel.get_short({'first_level_items.number': number})
		if allowed_numbers and len(allowed_numbers)>0:
			return [row for row in result if row['number'] in allowed_numbers]
		else:
			return result
	except Exception, exc:
		print('Error! get_specification_first_level_parents  - '+ str(number) +'; '+ str(exc))
		print_exc()
		pass
	return result

def get_specification_info(number, vol=1):
	'''
		Получение данных о спецификации
		number - номер спецификации
		vol - требуемый объем
	'''
	spec_info = None
	# информация о спецификации
	spec_info =specificationmodel.get_by({'number': number})
	if not spec_info:
		raise Exception("Спецификация не найдена.")
	# получение списка спецификаций, из которых состоит текущая спецификация
	include_objects = {}
	include_ids = []

	spec_info['count']['origin_value'] = 1
	spec_info['count']['value'] = vol

	tmp_info = get_specification_struct(number)
	if len(tmp_info['include'])>0:
		include_ids = [row['_id'] for row in tmp_info['include']]
		tmp_data = specificationmodel.get_short({'_id': {'$in':include_ids}})
		for row in tmp_data:
			include_objects[str(row['_id'])] = row
		fill_specification_structure(include_objects, tmp_info['struct'], vol, spec_info)

	del spec_info['struct']
	del spec_info['include']
	if 'first_level_items' in spec_info:
		del spec_info['first_level_items']
	return spec_info

def get_specification_info_by_id(id, vol=1):
	'''
		Получение данных о спецификации
		id - идентификатор спецификации
		vol - требуемый объем
	'''
	spec_info = None
	# информация о спецификации
	spec_info =specificationmodel.get_by({'_id':  ObjectId(id)})
	if not spec_info:
		raise Exception("Спецификация не найдена.")
	# получение списка спецификаций, из которых состоит текущая спецификация
	include_objects = {}
	include_ids = []

	spec_info['count']['origin_value'] = 1
	spec_info['count']['value'] = vol

	tmp_info = get_specification_struct(spec_info['number'])
	if len(tmp_info['include'])>0:
		include_ids = [row['_id'] for row in tmp_info['include']]
		tmp_data = specificationmodel.get_short({'_id': {'$in':include_ids}})
		for row in tmp_data:
			include_objects[str(row['_id'])] = row
		fill_specification_structure(include_objects, tmp_info['struct'], vol, spec_info)
	del spec_info['struct']
	del spec_info['include']
	if 'first_level_items' in spec_info:
		del spec_info['first_level_items']
	return spec_info

def get_el_by_id(arr, id):
	'''
		Получение требуемого элемента в списке
	'''
	for a in arr:
		if a['node']['_id']==id:
			return a
	return None

def get_units_and_values(data, units, values, conditions = []):
	'''
	Получение списка значений и единиц измерений внутри свойства
	'''
	if 'children' in data and len(data['children'])>0:
		for child in data['children']:
			if child['node'].get('status','')!='del':
				# если встретилось условие, то останавливаем сбор значений и свойств
				if child['node']['type']=='condition':
					conditions.append(child)
				else:
					nunits = []
					nvalues = []
					nconditions = []
					get_units_and_values(child, nunits, nvalues, nconditions)

					if child['node']['type']=='unit':
						child['unit'] = nunits[0] if len(nunits)>0 else None
						units.append(child)

					elif child['node']['type']=='value':
						values.append(child)
						for k in nvalues:
							values.append(k)

def fill_specification_structure(list, struct, vol, spec_info = None):
	'''
	Сбор структуры спецификации.
	spec_info - спецификация для которой происходит сбор структуры
	list  - список объектов спецификаций, задействованных в структуре
	struct - структура спецификации
	В результате применения данной функции. все спецификации в дереве получат  - sector
	'''

	# локальная функция сбора структуры
	def do_fill(list, struct, vol, parent_item=None):
		result = []
		for item in struct['items']:
			tmp_item = list[item['_id']]
			new_item = deepcopy(tmp_item)
			new_item['count'] = item['count']
			new_item['count']['origin_value'] = new_item['count'].get('value',0)
			new_item['count']['value'] = new_item['count'].get('value',0) * vol
			new_item['group'] = item.get('group')
			new_item['vol_tolerance'] = item.get('vol_tolerance')
			new_item['tolerance_on_vol'] = item.get('tolerance_on_vol')
			new_item['vol_count'] = item.get('vol_count')
			new_item['is_buy'] = item.get('is_buy', False)

			# если участок не был задан, то пробиваем структуру по умолчанию
			if not new_item['sector'] or not new_item['sector']['name']:
				new_item['sector'] =  {
					'name': 'Не задан',
					'origin_id': None,
					'routine': 0,
					'by_parent': False
				}
			# берем участок родителя
			elif new_item['sector'].get('by_parent') and parent_item:
				new_item['sector'] = deepcopy(parent_item.get('sector'))

			parent_item = new_item
			new_item['items']  = do_fill(list, item, new_item['count'].get('value',0), parent_item)
			result.append(new_item)
		return result

	# если задана спецификация для которой идет построение структуры, то результат сразу заносится в нее
	# иначе возвращается построенная структура
	if spec_info:
		# формирование структуры заданной спецификации
		spec_info['items'] = do_fill(list, struct, vol, spec_info)
		return spec_info['items']
	else:
		return do_fill(list, struct, vol)

def get_product_volume(node, units, values, up_to_root = False, level = 0):
	'''
		Получение объема продукции
		Пробежка по конфигурациям начиная от текущего элемента и до самого корня дерева
	'''
	current_unit = {'id':units[0]['node']['_id'], 'value':units[0]['node']['name'], 'datalink': units[0]['node'].get('datalink') } if len(units)>0 else {'id':None, 'value':None, 'datalink': None}
	current_value = {'id':values[0]['node']['_id'], 'value':values[0]['node']['name'], 'datalink':values[0]['node'].get('datalink')} if len(values)>0 else {'id':None, 'value':None, 'datalink': None}
	prNode = node
	config_path = ''
	prop = None
	while prNode:
		if prNode['node'].get('type')=='product':
			for prop in prNode['node'].get('properties', []):
				if prop.get('linkpath')==node.get('linkpath') and prop.get('configuration_path','')== config_path and prop.get('property_id') == node['node']['_id'] and prop.get('type')=='config':
					# проверка, есть ли данное значение в списке доступных
					# также ведется проверка на значения введенные в ручную через текстовое поле
					tmp_prop_val = prop.get('value',{})
					if not tmp_prop_val.get('id') and tmp_prop_val.get('value') and len(values)==0:
						if prop.get('unit') and prop['unit'].get('id'):
							current_unit = prop.get('unit')
						current_value = prop.get('value')
					else:
						for vl in values:
							if vl['node']['_id'] == prop.get('value',{}).get('id'):
								if prop.get('unit') and prop['unit'].get('id'):
									current_unit = prop.get('unit')
								current_value = prop.get('value')
								current_value['datalink'] = vl['node'].get('datalink')
								break
						for vl in units:
							if vl['node']['_id'] == current_unit['id']:
								current_unit['datalink'] = vl['node'].get('datalink')
								break
			config_path=str(prNode['node']['_id'])+ "-" + config_path if config_path else str(prNode['node']['_id'])
			# увеличиваем уровень вложенности
			level+=1
			# проверка на допустимый уровень вложенности
			if not up_to_root and level>=2:
				break
		prNode = prNode.get('parent_node')
	# проверяем отобранный unit на существование в модели
	unit_exist = False
	for vl in units:
		if vl['node']['_id'] == current_unit['id']:
			unit_exist = True
			break
	if not unit_exist:
		current_unit = {'id':units[0]['node']['_id'], 'value':units[0]['node']['name'], 'datalink': units[0]['node'].get('datalink') } if len(units)>0 else {'id':None, 'value':None, 'datalink': None}
	return {'unit':current_unit, 'value':current_value, 'prop':prop}

def get_fast_product_volume(node, units, values):
	'''
	Получение объама продукции
	'''
	current_unit = {'id':units[0]['node']['_id'], 'value':units[0]['node']['name'], 'datalink': units[0]['node'].get('datalink') } if len(units)>0 else {'id':None, 'value':None, 'datalink': None}
	current_value = {'id':values[0]['node']['_id'], 'value':values[0]['node']['name'], 'datalink':values[0]['node'].get('datalink')} if len(values)>0 else {'id':None, 'value':None, 'datalink': None}
	prop = None
	key = node.get('linkpath')+"###"+str(node['node']['_id'])+"###config"
	for c in node.get('config_list',[]):
		if key in c.get('properties_map'):
			# проверка, есть ли данное значение в списке доступных
			# также ведется проверка на значения введенные в ручную через текстовое поле
			tmp_prop_val = c['properties_map'][key].get('value',{})
			if not tmp_prop_val.get('id') and tmp_prop_val.get('value') and len(values)==0:
				if c['properties_map'][key].get('unit') and c['properties_map'][key]['unit'].get('id'):
					current_unit = c['properties_map'][key].get('unit')
				current_value = c['properties_map'][key].get('value')
			else:
				for vl in values:
					if vl['node']['_id'] == current_value['id']:
						if c['properties_map'][key].get('unit') and  c['properties_map'][key]['unit'].get('id'):
							current_unit = c['properties_map'][key].get('unit')
						current_value = c['properties_map'][key].get('value')
						current_value['datalink'] = vl['node'].get('datalink')
						break
				for vl in units:
					if vl['node']['_id'] == current_unit['id']:
						current_unit['datalink'] = vl['node'].get('datalink')
						break
			break
	# проверяем отобранный unit на существование в модели
	unit_exist = False
	for vl in units:
		if vl['node']['_id'] == current_unit['id']:
			unit_exist = True
			break
	if not unit_exist:
		current_unit = {'id':units[0]['node']['_id'], 'value':units[0]['node']['name'], 'datalink': units[0]['node'].get('datalink') } if len(units)>0 else {'id':None, 'value':None, 'datalink': None}
	return {'unit':current_unit, 'value':current_value, 'prop':prop};

def get_condition_selected_values(node):
	'''
	Функция получения выбранных значений условий в рамках всего изделия
	'''
	result = None
	prNode = node
	config_path = ""
	node_linkpath = node['linkpath']+"-"+str(node['node']['_id']) if node.get('linkpath') else str(node['node']['_id'])
	while prNode:
		if prNode['node']['type']=="product":
			for prop in prNode['node'].get('properties',[]):
				if prop.get('type')=='condition' and prop.get('linkpath','').find(node_linkpath)==0 and (prop.get('configuration_path','')==config_path and prop.get('condition_id')==node['node']['_id']):
					result = prop
			config_path=str(prNode['node']['_id'])+ '-'+config_path if config_path!='' else str(prNode['node']['_id'])
		prNode = prNode.get('parent_node')
	return result

def get_condition_value(data, val_path, id_path, linkpath):
	'''
	Функция получения списка значений объекта - условие
	'''
	result = None
	if data and data['node'].get('status')!='del':
		#if data['node']['type']=='value':
		if len(data.get('children',[]))==0:
			data['linkpath'] = linkpath
			data['val_path'] = val_path
			data['id_path'] = id_path#.append(data['node'])
			result = data
		else:
			linkpath = linkpath + '-' + str(data['node']['_id']) if linkpath else str(data['node']['_id'])
			val_path = val_path + ' / ' + data['node']['name'] if val_path else data['node']['name']
			id_path.append(data['node'])
			child = data['children'][0]
			result = get_condition_value(child, val_path, id_path, linkpath);
	return result

def get_open_value( values):
	'''
		Функция получения открытого значения из списка всех значений свойства
	'''
	for val in values:
		if val['node'].get('datalink') == datamodel.SYSTEM_OBJECTS['OPEN_VAL']:
			return val
	return None

def get_fast_propeties_value(node, units, values):
	'''
		Функция получения выбранных значений для свойства
	'''
	res = []
	key = node.get('linkpath')+"###"+str(node['node']['_id'])+"###property_value"
	for c in node.get('config_list',[]):
		if key in c.get('properties_map'):
			pr_values = c['properties_map'][key].get('values',[])
			# проверяем, осталось ли хотя бы одно значение из выбранных в этом изделии (или все удалили)
			is_find = False
			for v1 in values:
				for v2 in pr_values:
					if str(v2['value']['id'])==str(v1['node']['_id']):
						is_find = True
						break
				if is_find:
					break
			if is_find:
				res = []
				for val in pr_values:
					# если задан идентификатор значения, то ищем значение в основных жанных
					# иначе ищем открытое значение в списке всех значений свойства и работаем с ним
					if val['value']['id']:
						tmp_el = get_el_by_id(values,val['value']['id'])
					else:
						tmp_el = get_open_value(values)
					if tmp_el:
						tmp_unit = None
						if val['unit']['id']:
							tmp_unit = get_el_by_id(units, val['unit']['id'])
						if not tmp_unit and units and len(units)>0:
							tmp_unit = units[0]

						el = {
							'_id':tmp_el['node']['_id'],
							'name':tmp_el['node']['name'],
							'datalink': tmp_el['node']['datalink'],
							'value': val['value']['value'] if not val['value']['id']  or tmp_el['node'].get('datalink','') == datamodel.SYSTEM_OBJECTS['OPEN_VAL'] or tmp_el['node'].get('_id','') == datamodel.SYSTEM_OBJECTS['OPEN_VAL'] else tmp_el['node']['name'],
							'unit':None,
							'conditions':[],
						}
						if tmp_unit:
							el['unit'] = {
								'_id':tmp_unit['node']['_id'],
								'name':tmp_unit['node']['name'],
								'datalink':tmp_unit['node']['datalink']
							}
							# сбор комплексных единиц измерения
							if tmp_unit.get("children"):
								tmp_complex_units = []
								get_units_and_values(tmp_unit, tmp_complex_units, [])
								if len(tmp_complex_units)>0:
									el['unit']['unit'] = {
										'_id':tmp_complex_units[0]['node']['_id'],
										'name':tmp_complex_units[0]['node']['name'],
										'datalink':tmp_complex_units[0]['node']['datalink'],
									}
						# сбор условий для значения
						for child in tmp_el.get('children',[]):
							if child['node']['type']=='condition':
								el['conditions'].extend(get_selected_condition_values(child))
						res.append(el)
				break
	# если в изделии значение не выбрано, то пытаемся взять значение по умолчанию (с флагом is_default)
	if len(res)==0:
		for v in values:
			if v['node'].get('is_default'):
				el = {
					'_id':v['node']['_id'],
					'name':v['node']['name'],
					'datalink': v['node']['datalink'],
					'value': '' if  v['node'].get('datalink','') == datamodel.SYSTEM_OBJECTS['OPEN_VAL'] or v['node'].get('_id','') == datamodel.SYSTEM_OBJECTS['OPEN_VAL'] else v['node']['name'],
					'unit':None,
					'conditions':[],
				}
				if units and len(units)>0:
					el['unit'] = {
						'_id':units[0]['node']['_id'],
						'name':units[0]['node']['name'],
						'datalink':units[0]['node']['datalink']
					}
					# сбор комплексных единиц измерения
					if units[0].get("children"):
						tmp_complex_units = []
						get_units_and_values(units[0], tmp_complex_units, [])
						if len(tmp_complex_units)>0:
							el['unit']['unit'] = {
								'_id':tmp_complex_units[0]['node']['_id'],
								'name':tmp_complex_units[0]['node']['name'],
								'datalink':tmp_complex_units[0]['node']['datalink'],
							}
				# сбор условий для значения
				for child in v.get('children',[]):
					if child['node']['type']=='condition':
						el['conditions'].extend(get_selected_condition_values(child))
				res.append(el)
				break
	return res

def get_node_value(node, units, values, up_to_root = False, level = 0):
	'''
		Получение значений свойства
		Пробежка по конфигурациям начиная от текущего элемента и до самого корня дерева, для значений свойтсв

		level - текущий уровень родителя
		up_to_root - флаг, указывающий нужно ли пробегать до самого корневого изделия.
		Если флаг будет  = True, то это будет означать что в ЭСУД включено сквозное редактирование
		до любого уровня вложенности. Если флаг = False, то проверка идет толкьо на 2 уровня вверх.
	'''
	prNode = node
	config_path = ''
	fprop = None
	while prNode:
		if prNode['node'].get('type')=='product':
			for prop in prNode['node'].get('properties', []):
				if prop.get('linkpath')==node.get('linkpath') and prop.get('configuration_path','')== config_path and prop.get('property_id') == node['node']['_id'] and prop.get('type')=='property_value':
					# проверяем, осталось ли хотя бы одно значение из выбранных в этом изделии (или все удалили)
					is_find = False
					for v1 in values:
						for v2 in prop.get('values',[]):
							if str(v2['value']['id'])==str(v1['node']['_id']):
								is_find = True
								break
						if is_find:
							break
					if is_find:
						fprop = prop

			config_path=str(prNode['node']['_id'])+ "-" + config_path if config_path else str(prNode['node']['_id'])
			# увеличиваем уровень вложенности
			level+=1
			# проверка на допустимый уровень вложенности
			if not up_to_root and level>=2:
				break
		prNode = prNode.get('parent_node')
	res = []
	if fprop:
		for val in fprop.get('values',[]):
			if val['value']['id']:
				tmp_el = get_el_by_id(values,val['value']['id'])
			else:
				tmp_el = get_open_value(values)

			if tmp_el:
				#tmp_unit = get_el_by_id(units, val['unit']['id'])
				tmp_unit = None
				if val['unit']['id']:
					tmp_unit = get_el_by_id(units, val['unit']['id'])
				if not tmp_unit and units and len(units)>0:
					tmp_unit = units[0]
				el = {
					'_id':tmp_el['node']['_id'],
					'name':tmp_el['node']['name'],
					'datalink': tmp_el['node']['datalink'],
					'value': val['value']['value'] if not val['value']['id']  or tmp_el['node'].get('datalink','') == datamodel.SYSTEM_OBJECTS['OPEN_VAL'] or tmp_el['node'].get('_id','') == datamodel.SYSTEM_OBJECTS['OPEN_VAL'] else tmp_el['node']['name'],
					'unit':None,
					'conditions': []
				}
				if tmp_unit:
					el['unit'] = {
						'_id':tmp_unit['node']['_id'],
						'name':tmp_unit['node']['name'],
						'datalink':tmp_unit['node']['datalink'],
					}
					# сбор комплексных единиц измерения
					if tmp_unit.get("children"):
						tmp_complex_units = []
						get_units_and_values(tmp_unit, tmp_complex_units, [])
						if len(tmp_complex_units)>0:
							el['unit']['unit'] = {
								'_id':tmp_complex_units[0]['node']['_id'],
								'name':tmp_complex_units[0]['node']['name'],
								'datalink':tmp_complex_units[0]['node']['datalink'],
							}
				# сбор условий для значения
				for child in tmp_el.get('children',[]):
					if child['node']['type']=='condition':
						el['conditions'].extend(get_selected_condition_values(child))
				res.append(el)

	# если в изделии значение не выбрано, то пытаемся взять значение по умолчанию (с флагом is_default)
	if len(res)==0:
		for v in values:
			if v['node'].get('is_default'):
				el = {
					'_id':v['node']['_id'],
					'name':v['node']['name'],
					'datalink': v['node']['datalink'],
					#'value':val['value']['value'],
					'value': '' if  v['node'].get('datalink','') == datamodel.SYSTEM_OBJECTS['OPEN_VAL'] or v['node'].get('_id','') == datamodel.SYSTEM_OBJECTS['OPEN_VAL'] else v['node']['name'],
					'unit':None,
					'conditions':[],
				}
				if units and len(units)>0:
					el['unit'] = {
						'_id':units[0]['node']['_id'],
						'name':units[0]['node']['name'],
						'datalink':units[0]['node']['datalink'],
					}
					# сбор комплексных единиц измерения
					if units[0].get("children"):
						tmp_complex_units = []
						get_units_and_values(units[0], tmp_complex_units, [])
						if len(tmp_complex_units)>0:
							el['unit']['unit'] = {
								'_id':tmp_complex_units[0]['node']['_id'],
								'name':tmp_complex_units[0]['node']['name'],
								'datalink':tmp_complex_units[0]['node']['datalink'],
							}

				# сбор условий для значения
				for child in v.get('children',[]):
					if child['node']['type']=='condition':
						el['conditions'].extend(get_selected_condition_values(child))
				res.append(el)
				break

	return res

def get_inherited_propertie(data):
	'''
	Функция поиска унаследованного свойства
	'''
	if not data.get('parent_node') or not data.get('parent_node',{}).get('parent_node'):
		return ''
	prNode = data.get('parent_node',{}).get('parent_node')
	while prNode:
		for c in prNode.get('children',[]):
			if c['node']['type']==data['node']['type'] and c['node']['name']==data['node']['name']:
				units = []
				values = []
				get_units_and_values(c, units, values)
				return get_node_value(c, units, values)
		prNode = prNode.get('parent_node')
	return None


def get_selected_condition_values(child):
	'''
	Функция получения выбранных значений условия
	'''
	result = []
	sel_val = get_condition_selected_values(child)
	if len(child.get('children', []))>0:
		for cchild in child.get('children', []):
			linkpath = child['linkpath'] + '-' + str(child['node']['_id']) if child.get('linkpath') else str(child['node']['_id'])
			cond_val = get_condition_value(cchild, '',[], linkpath);
			if cond_val:
				is_checked = False
				if sel_val:
					for s_j in sel_val['condition_values']:
						if s_j['id']==cond_val['node']['_id'] and s_j.get('linkpath')==cond_val.get('linkpath') and s_j.get('configuration_path',"").replace(child.get('configuration_path','')+'-','').replace(child.get('configuration_path',''),'')==cond_val.get('configuration_path','').replace(child.get('configuration_path','')+'-','').replace(child.get('configuration_path',''),''):
							is_checked = True
				if is_checked:
					result.append({
							'group_name':child['node']['name'],
							'group_key':child['node']['_id'],
							'node': cond_val['node'],
							'val_path': cond_val['val_path'],
							'id_path': cond_val['id_path'],
							'configuration_path': cond_val['configuration_path'],
							'linkpath': cond_val['linkpath'],
							'is_valid': True if cond_val['node'] else False,
							'is_otbor': True if child['node'].get('is_otbor') else False
						})
	return result


def check_val_on_sys(el):
	'''
	Локальная функция проверки значения свойства на принадлежность
	к системным значениям
	'''
	if el.get("datalink")==datamodel.SYSTEM_OBJECTS['INHERIT_PROP'] or el.get("value")==u"(Унаследованное)":
		el['is_inherit'] = True
		has_inherit_value = True
	elif el.get("datalink")==datamodel.SYSTEM_OBJECTS['OPEN_VAL'] or el.get("value")==u"(Открытое значение)":
		el['is_open'] = True
	elif el.get("datalink")==datamodel.SYSTEM_OBJECTS['CALCULATED_VAL'] or el.get("value")==u"(Вычисляемое)":
		el['is_calculate'] = True
	return  el

def prepare_tree_to_specificate(list, elem, parents, first_parent_properties, errors, is_short = False, fast_prop_list = False):
	'''
	Анализ дерева, сбор фактических свойств, объемов, операций
	В результате на выходе иерархия изделий
	Также при сборке ведется обработка формул  в полях объемов.
	Формулы вычисляются и заменяются числовыми значениями.
	'''

	# Локальная функция получения списка процессов(операций)
	def get_tech_processes(elem, level=1):
		# сбор условий для процесса
		process_conditions = get_process_conditions(elem)
		sel_conditions = []
		for cond in process_conditions:
			sel_conditions.extend(get_selected_condition_values(cond))
		tmp_process = {
			'_id':elem['node']['_id'],
			'datalink':elem['node'].get('datalink'),
			'is_system': elem['node'].get('is_system'), # системный процесс
			'is_objective_system': elem['node'].get('is_objective_system'), # косвенно системный
			'name':elem['node']['name'],
			'is_separate': elem['node'].get('is_separate'),  # разделительный процесс
			'note': elem['node'].get('note'),  # пометка
			'properties': [], # свойства процесса,
			'conditions':sel_conditions,  #  условия
			'level': level, # уровень процесса, когда несколько процессов на одном уровне
			'items':[] # вложенные процессы
		}
		level+=1
		# сбор свойств и значений для процесса, минуя библиотеки
		process_props = get_process_props(elem)
		for elem_prop in process_props:
			try:
				# получение всех значений свойства
				units = []
				values = []
				conditions = []
				sel_conditions = []
				get_units_and_values(elem_prop, units, values, conditions)
				cs = [check_val_on_sys(tmp_el) for tmp_el in (get_fast_propeties_value(elem_prop,units,values) if fast_prop_list else get_node_value(elem_prop,units,values))]
				# условия
				for cond in conditions:
					sel_conditions.extend(get_selected_condition_values(cond))
				# текущим значением считаем первое значение из списка
				cur_val = cs[0] if len(cs)==1 else None
				tmp_prop = {
					'_id':elem_prop['node']['_id'],
					'datalink':elem_prop['node'].get('datalink'),
					'is_system': elem_prop['node'].get('is_system'), # системное свойство
					'is_objective_system': elem_prop['node'].get('is_objective_system'), # косвенно системное
					'name':elem_prop['node']['name'],
					'value': cur_val,
					'routine': elem_prop['node'].get('routine',0),
					'conditions': sel_conditions
				}
				tmp_process['properties'].append(tmp_prop)
			except Exception, exc:
				print('Error! Get props for process - '+ str(elem['node']['_id']) +'; '+ str(exc))
				excType = exc.__class__.__name__
				print_exc()
				pass
		# сбор вложенных процессов
		for row in elem.get('children', []):
			if row['node'].get('type') == 'process':
				tmp_process['items'].append(get_tech_processes(row, level))
		return tmp_process

	# Локальная функция получения свойств
	def get_process_props(elem):
		result = []
		for row in elem.get('children', []):
			if row['node'].get('type') == 'property':
				result.append(row)
		return result

	# Локальная функция получения условий
	def get_process_conditions(elem):
		result = []
		for row in elem.get('children', []):
			if row['node'].get('type') == 'condition':
				result.append(row)
		return result

	# Локальная функция получения детей группирующей модели
	def get_group_model_items(list, result, new_parents, elem,  errors):
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
					get_group_model_items(list, tmp_model_info, new_parents, child, errors)
				else:
					# запускаем цикл по моделям в группе
					if child['node']['type'] == 'product_model' and child.get('need_configuration'):
						prepare_config_props(list,result, new_parents, child, errors)

	# Локальная функция проверки значения на формулу
	def check_val_on_formula(val):
		return  val and str(val)[0] == '='

	# # Локальная функция вычисления формулы
	# def calculate_formula(data_product, formula):
	# 	# Локальная функция поиска значения по ID в верх по дереву до самого корня
	# 	def get_prop_value(data, prop_id):
	# 		parent = data
	# 		while(parent):
	# 			if parent.get('node') and parent['node']['type'] == 'product':
	# 				for tmp_prop in parent.get('properties',[]):
	# 					if(str(tmp_prop['_id']) == prop_id || str(tmp_prop['datalink']) == prop_id)
	# 						return tmp_prop['value']['value']
	# 				parent = parent.parent
	# 		return None

	# 	#  результирующая переменная
	# 	res = {'value':0, 'error':''}
	# 	formula = formula.replace('=', '')
	# 	# получить все идентификаторы задействоаные в формуле
	# 	regx = re.compile('([a-z0-9]{24})' , re.IGNORECASE)
	# 	tmp_ids = {}
	# 	tmp =  re.findall(regx, formula)
	# 	print('------')
	# 	print(tmp)
	# 	print('------')

	# 	for var i in tmp:
	# 		tmp_ids[i] = None
	# 	have_null_values = False
	# 	for prop_id in tmp_ids:
	# 		# вместо идентификаторов подставить значения
	# 		tmp_ids[prop_id] = get_prop_value(data_product, str(prop_id))
	# 		if not tmp_ids[prop_id]:
	# 			have_null_values = True
	# 		else
	# 			formula = formula.replace(prop_id, tmp_ids[prop_id])
	# 			print('--------')
	# 			print(formula)
	# 			print('--------')

	# 	# если есть значения, которые не удалось найти, то генерим ошибку
	# 	if have_null_values:
	# 		res['error'] = 'Не удалось получить значения для: '
	# 		for prop_id in tmp_ids:
	# 			if not tmp_ids[prop_id]:
	# 				res['error']+=prop_id + ' '
	# 	else:
	# 		 # выполнить формулу
	# 		 # если выполнить не удалось, то генерим ошибку
	# 		try:
	# 			res['value'] = routine.strToFloat(eval(formula.replace(',','.')))
	# 			res['error'] = None
	# 		except:
	# 			res['error'] = 'Не удалось выполнить расчет по формуле: ' +formula

	# 	print('-------------')
	# 	print(res)
	# 	print('-------------')
	# 	return res

	# Локкальная функция сбора конфигураций модели
	def prepare_config_props(list, result, new_parents, child, errors):
		'''
		Вытягивание количествоенного значание для конфигурации.
		'''
		units = []
		values = []
		cs = None
		unit_datalink=None
		current_unit = {}
		current_value = 0
		is_calculate = False
		is_formula = False
		formula = ''
		try:
			for ce in child.get('origin_children',[]):
				if ce['node']['datalink'] == datamodel.SYSTEM_OBJECTS['VOL_PROP']:
					get_units_and_values(ce, units, values)
					cs = get_fast_product_volume(child,units,values) if fast_prop_list else get_product_volume(child,units,values)
					break
		except Exception, exc:
			print('Error! Config props calculation.' + str(exc))
			excType = exc.__class__.__name__
			print_exc()
			pass

		# определение единиц измерения
		if cs and cs.get('unit') and cs.get('unit',{}).get('value'):
			current_unit = cs.get('unit',{})
			current_unit_id = ObjectId(current_unit.get('id')) if current_unit.get('id') else None
			# поиск элемента по ID
			if current_unit_id and current_unit_id in list['data']:
				tmp_el = list['data'][current_unit_id]
				# если элемент это ярлык, то получение ссылки на оригинал
				if tmp_el and tmp_el.get('datalink'):
					unit_datalink = str(tmp_el.get('datalink'))

		current_value = cs.get('value').get('value',0) if cs and cs.get('value') else 0
		if current_value == '(Вычисляемое)':
			is_calculate = True
			current_value = 1
		elif check_val_on_formula(current_value):
			is_formula = True
			formula = current_value
			current_value = 1
			#formula_res = calculate_formula()

		# модель попадает в результат если необходимое ее количество больше 0
		if routine.strToFloat(current_value)>0:
			tmp_model_info = {
					'items':[],
					'node':child['node']
				}
			for conf in child.get('children',[]):
				if conf['node']['type']=='product':
					# проставляем количество данных изделий необходимых для изготовления родителя
					conf['count'] = {'unit':'шт.', 'unit_id': None, 'unit_datalink': None, 'value':1, 'is_calculate': False}
					conf['count'] = {
						'unit': current_unit.get('value', '?'),
						'unit_id': current_unit.get('id', None),
						'unit_datalink': unit_datalink,
						'value':current_value,
						'is_calculate': is_calculate,
						'is_formula': is_formula,
						'formula': formula
					}
					# добавляем рекурсию по новому изделию-конфигурации
					tmp_model_info['items'].append(prepare_tree_to_specificate(list, conf, new_parents, first_parent_properties,  errors,is_short, fast_prop_list))
			result['models'].append(tmp_model_info)


	#--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	#--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	#-------Основная функция---------------------------------------------------------------------------------------------------------------------------------------------------------
	#--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	#--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	new_parents = copy(parents)
	new_parents.append(elem)
	# если это начало расчета, то необходимо узнать единицы измерения объема текущей конфигурации
	# для этого надо пробежать по детям модели конфигурации и найти свойство описывающее объем
	if len(parents)==0:
		units = []
		values = []
		cs = None
		unit_datalink=None
		current_unit = {}
		try:
			for ch in elem.get('children',[]):
				if ch['node']['type'] == 'product_model':
					for ce in ch.get('children',[]):
						if ce['node']['datalink'] == datamodel.SYSTEM_OBJECTS['VOL_PROP']:
							get_units_and_values(ce, units, values)
							cs = get_fast_product_volume(ch,units,values) if fast_prop_list else get_product_volume(ch,units,values)
							break
		except Exception, exc:
			print('Error! Config props calculation.' + str(exc))
			excType = exc.__class__.__name__
			print_exc()

		# определение единиц измерения
		if cs and cs.get('unit') and cs.get('unit',{}).get('value'):
			current_unit = cs.get('unit',{})
			current_unit_id = ObjectId(current_unit.get('id')) if current_unit.get('id') else None
			# поиск элемента по ID
			if current_unit_id and current_unit_id in list['data']:
				tmp_el = list['data'][current_unit_id]
				# если элемент это ярлык, то получение ссылки на оригинал
				if tmp_el and tmp_el.get('datalink'):
					unit_datalink = str(tmp_el.get('datalink'))

		elem['count'] = {
			'unit': current_unit.get('value', '?'),
			'unit_id': current_unit.get('id', None),
			'unit_datalink': unit_datalink,
			'value': routine.strToFloat(elem.get('count',{}).get('value', 0)),
			'is_calculate': False,
			'is_formula': False,
			'formula':''
		}

	result ={
		'node': elem['node'],
		'model_id': None,
		'count': elem.get('count', {'unit':'шт.', 'unit_id': None, 'unit_datalink': None, 'value':1, 'is_calculate': False, 'is_formula': False, 'formula':''}),
		'properties':[],
		'conditions':[],
		'operations':[],
		'tech_process_operations':[],
		'models':[],
		'specification_key':'',# ключ-спецификация по набору свойств,
		'sector':None,
		'configuration_path':elem.get('configuration_path',''),
	}

	# пересчет требуемого количества изделий, в зависимости от количества родителя
	if len(parents)>0:
		parent_count_val = routine.strToFloat(parents[len(parents)-1]['count'].get('value', 0))
		elem_count_val = routine.strToFloat(elem['count'].get('value', 0))
		elem['count']['origin_value'] = elem_count_val
		elem['count']['value'] = parent_count_val * elem_count_val

	# на первом уровне изделия, всегда лежит модель изделия на базе которой собрано изделие
	if 'children' in elem and len(elem['children'])>0:
		for model_child in elem['children']:
			result['model_id'] = model_child['node'].get('datalink',model_child['node']['_id'])
			if 'children' in model_child and len(model_child['children'])>0:
				# в модели изделия требующей конфигурации, на первом уровне всегда
				# должно лежать изделие-конфигурация, иначе ошибка
				for child in model_child['children']:
					# если свойство и значение данного свойства сохранено в изделии
					if child['node']['type'] == 'property':
						elem_prop = {'unit':{'value':'шт.', 'id':None},'value':{'value':0, 'id':None}}
						try:
							# получение всех значений свойства
							units = []
							values = []
							conditions = []
							sel_conditions = []
							get_units_and_values(child, units, values, conditions)
							cs = [check_val_on_sys(tmp_el) for tmp_el in (get_fast_propeties_value(child,units,values) if fast_prop_list else get_node_value(child,units,values))]
							# если свойство - опциональное, то берем все его значения
							if child['node'].get('is_optional'):
								tmp_units =  [
									{
										'_id':n_val['node']['_id'],
										'name':n_val['node']['name'],
										'datalink': n_val['node']['datalink'],
										'unit': {'_id': n_val['unit']['node']['_id'], 'name': n_val['unit']['node']['name'],'datalink': n_val['unit']['node']['datalink']} if n_val.get('unit') else None
									} for n_val in units
								]

								cs_tmp = cs
								cs_res = []
								for v in values:
									el = {
										'_id':v['node']['_id'],
										'name':v['node']['name'],
										'datalink': v['node']['datalink'],
										'value':v['node']['name'],
										#'value':'',
										'unit':None,
										'units': tmp_units,
										'conditions':[],
									}

									# сбор условий для значения
									for c_child in v.get('children',[]):
										if c_child['node']['type']=='condition':
											el['conditions'].extend(get_selected_condition_values(c_child))
									cs_res.append(check_val_on_sys(el))
								cs = cs_res

								# выставляем ед. измерения из изделия
								for c1 in cs:
									for c2 in cs_tmp:
										if str(c1['_id'])==str(c2['_id']):
											c1['unit'] = c2['unit']
											if c2['value']:
												c1['value'] = c2['value']
							# условия
							for cond in conditions:
								sel_conditions.extend(get_selected_condition_values(cond))

							# проверяем, есть ли среди списка значений  - открытых значений - формул
							for c_val in cs:
								if c_val.get('is_open') and check_val_on_formula(c_val.get('value')):
									c_val['is_formula'] = True
									c_val['formula'] = c_val.get('value')

							# текущим значением считаем первое значение из списка
							cur_val = cs[0] if len(cs)==1 else None
							#cur_val = None

							tmp_prop = {
								'_id':child['node']['_id'],
								'datalink':child['node'].get('datalink'),
								'is_system': child['node'].get('is_system'), # системное свойство
								'is_objective_system': child['node'].get('is_objective_system'), # косвенно системное
								'name':child['node']['name'],
								'values': cs,
								'value': cur_val,
								'routine': child['node'].get('routine',0),
								#'original_values': values if child['node'].get('is_optional') and not is_short else None,
								#'original_units': units if child['node'].get('is_optional') and not is_short else None,
								'original_values': None,
								'original_units': None,
								#'prop_key': child['node']['name'] + '_' + '_'.join([(str(ix['value'])+'_'+str((ix.get('unit',{}) or {}).get("name",'?')) )for ix in cs ]),  #+ str(cur_unit.get('value','?')) + '_' + str(cur_val), # ключ свойства
								'is_specification': True if (not child['node']['_id'] in datamodel.SYSTEM_OBJECTS_IDS and not child['node'].get('datalink') in datamodel.SYSTEM_OBJECTS_IDS) or child['node']['_id'] in datamodel.SYSTEM_SPECIFICATION_OBJECTS_IDS or  child['node'].get('datalink') in datamodel.SYSTEM_SPECIFICATION_OBJECTS_IDS else False,
								'is_optional': child['node'].get('is_optional'),
								'is_techno': child['node'].get('is_techno'),
								'is_modefied':False,
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

					# если встретили объект тех. процесс, то раскладываем дерево вложенных процессво и получаем линеный список
					#942 + 	# 938
					# в результат добавляем перевернутый список процессво, чем ниже уровень в дереве процессов, тем он первее
					elif child['node']['type'] == 'process':
						#result['tech_process_operations'] = get_tech_processes(child)[::-1]
						result['tech_process_operations'].append(get_tech_processes(child))

					# если условие
					elif child['node']['type'] == 'condition':
						result['conditions'].extend(get_selected_condition_values(child))

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
							get_group_model_items(list, tmp_model_info, new_parents, child, errors)
						# если модель требует кофигурации, то получаем конфигурацию модели
						# затем рекурсия стартуется от найденной конфигурации
						elif child.get('need_configuration'):
							prepare_config_props(list, result, new_parents, child, errors)
	return result

def clear_nonused_data(tree):
	'''
		Удалить лишниее данные(делающие объем) из спецификации
	'''
	if 'node' in tree:
		tree['node'] = copy(tree['node'])
		if 'properties' in tree['node']:
			del tree['node']['properties']
		if 'path' in tree['node']:
			del tree['node']['path']
		if 'note' in tree['node']:
			del tree['node']['note']
	if 'models' in tree:
		for m in tree['models']:
			clear_nonused_data(m)
	if 'items' in tree:
		for i in tree['items']:
			clear_nonused_data(i)

def prepare_properties_list(node, config_list=[]):
	'''
	 собираеются properties в единый список
	'''
	new_config_list = config_list
	node['config_list'] = config_list
	if node['node'].get('type')=='product':
		node['properties_map'] = {}
		for prop in node['node'].get('properties', []):
			key = prop.get('linkpath')+"###"+str(prop.get("property_id"))+"###" + prop.get('type','')
			node['properties_map'][key] = prop
		new_config_list = copy(config_list)
		new_config_list.append(node)

	for c in node.get('children',[]):
		prepare_properties_list(c, new_config_list)

def get_sectors():
	'''
		Функция получения учстков.
		Получение ведется относительно системного свойства -  54d0a16d7bad640003abbbe5
		В выборку попадают все значения данного свойства
		Результатом является список объектов:
		{'_id': '', 'name': '', code:''}
	'''
	try:
		result = []
		list = datamodel.get_structured(None,None)
		# построение дерева
		tree = esudapi.make_full_tree(list, datamodel.SYSTEM_OBJECTS['SECTOR_PROP'],'', 0)
		esudapi.clear_tree_from_types(tree, ['library'])
		values = []
		units = []
		get_units_and_values(tree, units, values)
		for row in values:
			result.append({
					'_id': row['node']['_id'],
					'name': row['node']['name'],
					'code': row['node']['name'],
				})
		return result
	except Exception, exc:
		print('Error! Get sectors data. ' + str(exc))
		excType = exc.__class__.__name__
		print_exc()
		raise Exception(str(exc))


def get_model_items(model, group, result):
	'''
		Функция получения изделий в модели
		В функцию подается результат от - prepare_tree_to_specificate
	'''
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

def prepare_data_from_config_to_specification(data):
	''''
		Преобразование объекта из структура конфигурации в структуру спецификации
	'''
	# Функция формирования prop_key для заданных свойств
	def make_prop_keys(props):
		if props:
			for prop in props:
				prop['prop_key']= prop['name'] + '_' + str((prop['value'] or {}).get('value',''))+'_' +str(((prop['value'] or{}).get('unit',{}) or {}).get('name',''))

	# Функция формирования автоматического комента
	def get_auto_note(props):
		if props:
			try:
				note =  ["{0}: {1}{2}".format(prop.get('name',''), prop.get('value',''),  ' ' + prop.get('unit') if  prop.get('unit',None) else '' ) for prop in props]
				return '; '.join(note)
			except:
				return ''

	# функция формирование правильной структуры тех/ процесса
	def prepare_tech_process(items):
		def make_tech_process(op):
			new_properties = []
			for prop in op['properties']:
				tmp_value = (prop.get('value',{})or{})
				tmp_unit = ((prop.get('value',{})or{}).get('unit',{}) or {})
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
				}

				if str(prop.get('datalink') if prop.get('datalink') else prop.get('_id')) == str(datamodel.SYSTEM_OBJECTS['EXECUTION_TIME_PROP']):
					op['execution_time'] = tmp_new_prop
				elif str(prop.get('datalink') if prop.get('datalink') else prop.get('_id')) == str(datamodel.SYSTEM_OBJECTS['EXECUTION_COUNT_PROP']):
					op['execution_count'] = tmp_new_prop
				elif str(prop.get('datalink') if prop.get('datalink') else prop.get('_id')) == str(datamodel.SYSTEM_OBJECTS['NEXT_LEVEL_TIME']):
					op['next_level_time'] = tmp_new_prop
				elif str(prop.get('datalink') if prop.get('datalink') else prop.get('_id')) == str(datamodel.SYSTEM_OBJECTS['IN_LEVEL_TIME']):
					op['in_level_time'] = tmp_new_prop
				else:
					# если значение свойства получается путем наследования, то необходимо брать
					# отнаследованное значение
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
						}
					new_properties.append(tmp_new_prop)
			op['properties'] = new_properties
			for item in op.get('items', []):
				make_tech_process(item)

		for op in items:
			make_tech_process(op)
		return items

	# сбор строки спецификации для дальнейшего преобразования в hash
	specification_key = '{0}'.format(data['node']['number'])
	specification_out_key = '{0}#{1}#{2}'.format(data['node']['number'], data['count'].get('origin_value',0), data['count']['unit'])

	# сбор информации об участке, если он задан
	sector = None
	if data.get('sector'):
		tmp_origin_id = (data['sector'].get('value',{}) or {}).get('datalink') if (data['sector'].get('value',{}) or {}).get('datalink') else (data['sector'].get('value',{}) or {}).get('_id')
		sector = {
			'name': (data['sector'].get('value', {}) or {}).get('value','Не задан') ,
			'origin_id': tmp_origin_id,
			'routine': 0,
			'by_parent': True if str(tmp_origin_id) ==str(datamodel.SYSTEM_OBJECTS['SECTOR_BY_PARENT_VAL']) else False
		}

	result = {
		'_id': None, # идентификатор спецификации
		'note': data.get('note',''), # пользовательская пометка к спецификации
		'auto_note': data.get('auto_note',''), # автоматическая пометка к спецификации
		'number': '', # номер спецификации, назначается при сохранении
		'name': data['node']['name'],# наименование
		'config_number': data['node']['number'],# номер изделия на базе которого создается спецификация
		'config_id': data['node']['_id'], # id изделия на базе которого создается спецификация
		'routine': data['node']['routine'],
		'is_buy': data['node'].get('is_buy', False), # покупное изделие
		'is_separate': data.get('is_separate', False), # изделие образуется в результате разделительной операции
		'group': data.get('group',[]), # название группирующей модели если входит в такую
		'struct': '',# структура дерева спецификаций, из которых состоит данная спецификация
		'first_level_items': [],# список чайлдов на первом уровне спецификации
		'include': {},# линейный список всех спецификаций и их количество, входящие в текущую спецификацию
		'model_id': data['model_id'],
		'sector': sector,
		# объем допуска
		'vol_tolerance': {
			'value': None,
			'unit': None,
			'unit_origin_id':  None,
			'value_origin_id':  None,
			'sub_unit': None,
			'sub_unit_origin_id':  None,
		},
		# допуск на объем
		'tolerance_on_vol': {
			'value': None,
			'unit': None,
			'unit_origin_id':  None,
			'value_origin_id':  None,
			'sub_unit': None,
			'sub_unit_origin_id':  None,
		},
		# объем на 1 штуку, по умолчанию значение должно быть равным 1
		# 'vol_per_unit': {
		# 	'value': 1,
		# 	'unit': None,
		# 	'unit_origin_id':  None,
		#	'value_origin_id':  None
		# },
		# количество в штуках, указанное внутри изделия, используется при рассчетах норм
		'vol_count': {
			'value': None,
			'unit': None,
			'unit_origin_id':  None,
			'value_origin_id':  None,
			'sub_unit': None,
			'sub_unit_origin_id':  None,
		},
		'specification_key_hash':'',
		'specification_out_key_hash':'',
		# количество на уровне изделия
		'count':
		{
			'value': data['count'].get('origin_value',0),
			'unit': data['count']['unit'],
			'unit_origin_id': data['count'].get('unit_datalink') if data['count'].get('unit_datalink') else data['count'].get('unit_id'),
		},
		'operations': [],
		'tech_process_operations': routine.JSONEncoder().encode(prepare_tech_process(data.get('tech_process_operations'))) if data.get('tech_process_operations') else None,
		'properties': [],
		'items': []
	}
	# операции
	for op in data.get('operations',[]):
		result['operations'].append(
			{
				'origin_id':  op['node'].get('datalink') if op['node'].get('datalink') else op['node'].get('_id'),
				'name': op['node'].get('name'),
				'is_separate': op['node'].get('is_separate'),
				'routine': op['node'].get('routine'),
				'note': op['node'].get('note'),
			})

	# # операции тех. процесса  #938
	# for op in data.get('tech_process_operations',[]):
	# 	tmp_operation = {
	# 		'origin_id':  op.get('datalink') if op.get('datalink') else op.get('_id'),
	# 		'name': op.get('name'),
	# 		'is_separate': op.get('is_separate'),
	# 		'note': op.get('note'),
	# 		'properties': [],
	# 		'level': op.get('level')
	# 	}
	# 	for prop in op['properties']:
	# 		tmp_value = (prop.get('value',{})or{})
	# 		tmp_unit = ((prop.get('value',{})or{}).get('unit',{}) or {})
	# 		tmp_sub_unit = (tmp_unit.get('unit',{})or{})
	# 		tmp_new_prop = {
	# 			'origin_id':  prop.get('datalink') if prop.get('datalink') else prop.get('_id') ,
	# 			'name': prop.get('name'),
	# 			'value': tmp_value.get('value'),
	# 			'value_origin_id': tmp_value.get('datalink') if  tmp_value.get('datalink') else tmp_value.get('_id'),
	# 			'unit': tmp_unit.get('name'),
	# 			'unit_origin_id': tmp_unit.get('datalink') if tmp_unit.get('datalink') else tmp_unit.get('_id'),
	# 			'sub_unit': tmp_sub_unit.get('name'),
	# 			'sub_unit_origin_id': tmp_sub_unit.get('datalink') if tmp_sub_unit.get('datalink') else tmp_sub_unit.get('_id'),
	# 		}

	# 		if str(prop.get('datalink') if prop.get('datalink') else prop.get('_id')) == str(datamodel.SYSTEM_OBJECTS['EXECUTION_TIME_PROP']):
	# 			tmp_operation['execution_time'] = tmp_new_prop
	# 		elif str(prop.get('datalink') if prop.get('datalink') else prop.get('_id')) == str(datamodel.SYSTEM_OBJECTS['EXECUTION_COUNT_PROP']):
	# 			tmp_operation['execution_count'] = tmp_new_prop
	# 		else:
	# 			# если значение свойства получается путем наследования, то необходимо брать
	# 			# отнаследованное значение

	# 			if tmp_value.get('is_inherit'):
	# 				tmp_value = (prop.get('inherited_value',{})or{})
	# 				tmp_unit = ((prop.get('inherited_value',{})or{}).get('unit',{}) or {})
	# 				tmp_sub_unit = (tmp_unit.get('unit',{})or{})
	# 				tmp_new_prop = {
	# 					'origin_id':  prop.get('datalink') if prop.get('datalink') else prop.get('_id') ,
	# 					'name': prop.get('name'),
	# 					'value': tmp_value.get('value'),
	# 					'value_origin_id': tmp_value.get('datalink') if  tmp_value.get('datalink') else tmp_value.get('_id'),
	# 					'unit': tmp_unit.get('name'),
	# 					'unit_origin_id': tmp_unit.get('datalink') if tmp_unit.get('datalink') else tmp_unit.get('_id'),
	# 					'sub_unit': tmp_sub_unit.get('name'),
	# 					'sub_unit_origin_id': tmp_sub_unit.get('datalink') if tmp_sub_unit.get('datalink') else tmp_sub_unit.get('_id'),
	# 				}
	# 			tmp_operation['properties'].append(tmp_new_prop)
	# 	result['tech_process_operations'].append(tmp_operation)

	# свойства
	# формирование ключей для свойств
	make_prop_keys(data['properties'])
	# сортировка по ключам - спецификациям
	data['properties'].sort(key = lambda x: (x['prop_key']))
	for prop in data['properties']:

		tmp_value = (prop.get('value',{})or{})
		tmp_unit = ((prop.get('value',{})or{}).get('unit',{}) or {})
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
		}
		# объем допуска
		if str(prop.get('datalink')) == str(datamodel.SYSTEM_OBJECTS['VOL_TOLERANCE_PROP']):
			result['vol_tolerance'] = tmp_new_prop
		if str(prop.get('datalink')) == str(datamodel.SYSTEM_OBJECTS['TOLERANCE_ON_VOL_PROP']):
			result['tolerance_on_vol'] = tmp_new_prop
		# объем на 1 штуку
		if str(prop.get('datalink')) == str(datamodel.SYSTEM_OBJECTS['VOL_PER_UNIT_PROP']):
			result['vol_per_unit'] = tmp_new_prop
		# внутренний объем(количество в штуках)
		if str(prop.get('datalink')) == str(datamodel.SYSTEM_OBJECTS['AMOUNT_PROP']):
			result['vol_count'] = tmp_new_prop
		# в ХЭШ попадают только опциональные свойства
		if prop.get('is_optional'):
			specification_key+='{0}#{1}'.format(prop['name'], tmp_value.get('value'))
			specification_out_key+='{0}#{1}'.format(prop['name'], tmp_value.get('value'))

		# в итоговые свойства попадают только свойства - спецификации
		# также из итоговых свойств исключаем свйоства, которые выносим на верхний уровень
		if prop.get('is_specification'):
			if str(prop.get('datalink')) != str(datamodel.SYSTEM_OBJECTS['VOL_TOLERANCE_PROP']) and str(prop.get('datalink')) != str(datamodel.SYSTEM_OBJECTS['VOL_PER_UNIT_PROP']) and  str(prop.get('datalink')) != str(datamodel.SYSTEM_OBJECTS['AMOUNT_PROP']) and  str(prop.get('datalink')) != str(datamodel.SYSTEM_OBJECTS['TOLERANCE_ON_VOL_PROP']):
				# если значение свойства получается путем наследования, то необходимо брать
				# отнаследованное значение
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
				new_item = prepare_data_from_config_to_specification(item)
				result['items'].append(new_item)
				specification_key+=new_item['specification_out_key_hash']
				specification_out_key+=new_item['specification_out_key_hash']

	result['specification_key_hash'] = hashlib.md5(specification_key).hexdigest()
	result['specification_out_key_hash'] = hashlib.md5(specification_out_key).hexdigest()
	return result


def api_background_save_specification(queue_key,  usr):
	'''
	Сохранение спецификации в бэкграунде
	'''
	# функция разложения дерева объектов в линейный список
	def get_line_data(data, result):
		result.append(data)
		for i in data.get('items', []):
			get_line_data(i, result)

	# функция сбора по дереву одинаковых объектов с подсчетом их количества
	# line_result = {}
	# tree_result = {'items':[]}
	def get_structed_line_data(data, line_result, tree_result, first_level_items):
		for item in data['items']:
			# построение линейного списка объектов - спецификаций
			if str(item['_id']) not in line_result:
				line_result[str(item['_id'])] = {
					'_id': item['_id'],
					'name': item['name'],
					'number': item['number'],
					'count': [{
						'unit': item['count']['unit'],
						'value': item['count']['value'],
						'unit_origin_id': item['count']['unit_origin_id']
					}]
				}

			for ci in item['include']:
				#ci = item['include'][i]
				if str(ci['_id']) not in line_result:
					line_result[str(ci['_id'])] =  ci
				# else:
				# 	row = line_result[str(ci['_id'])]
				# 	has_unit = False
				# 	for rc in row['count']:
				# 		for rci in ci['count']:
				# 			if rc['unit_origin_id'] == rci['unit_origin_id']:
				# 				rc['value']+=rci.get('value', 0)
				# 				has_unit = True
				# 		if not has_unit:
				# 			row['count'].append({
				# 				'unit': rci['unit'],
				# 				'value': rci['value'],
				# 				'unit_origin_id': rci['unit_origin_id']
				# 			})

			# постоорение дерева объектов - спецификаций
			tree_result['items'].append(
				{
					'_id': item['_id'],
					'name': item['name'],
					'number': item['number'],
					'group': item.get('group', []),
					'is_buy': item.get('is_buy', False), # покупное изделие
					'count': {
						'unit': item['count']['unit'],
						'value': item['count']['value'],
						'unit_origin_id': item['count']['unit_origin_id']
					},
					'vol_tolerance': deepcopy(item['vol_tolerance']) if item.get('vol_tolerance') else  {'value': None,'unit': None,'unit_origin_id':  None, 'value_origin_id': None},
					'tolerance_on_vol': deepcopy(item['tolerance_on_vol']) if item.get('tolerance_on_vol') else  {'value': None,'unit': None,'unit_origin_id':  None, 'value_origin_id': None},
					'vol_count': deepcopy(item['vol_count']) if item.get('vol_count') else {'value': None,'unit': None,'unit_origin_id':  None, 'value_origin_id': None},
					'items': routine.JSONDecode(item['struct']).get('items',[])
				})

			# чайлды первого уровня
			first_level_items.append(
				{
					'_id': item['_id'],
					'name': item['name'],
					'number': item['number'],
					'group': item.get('group', []),
					'is_buy': item.get('is_buy', False), # покупное изделие
					'count': {
						'unit': item['count']['unit'],
						'value': item['count']['value'],
						'unit_origin_id': item['count']['unit_origin_id']
					},
					'vol_tolerance': deepcopy(item['vol_tolerance']) if item.get('vol_tolerance') else  {'value': None,'unit': None,'unit_origin_id':  None, 'value_origin_id': None},
					'tolerance_on_vol': deepcopy(item['tolerance_on_vol']) if item.get('tolerance_on_vol') else  {'value': None,'unit': None,'unit_origin_id':  None, 'value_origin_id': None},
					'vol_count': deepcopy(item['vol_count']) if item.get('vol_count') else {'value': None,'unit': None,'unit_origin_id':  None, 'value_origin_id': None},
					'specification_key_hash': item.get('specification_key_hash', None),
				})

	#Функция подсчета глубины дерева
	def calculate_tree_deep(tree, deep):
		new_deep = 0
		for item in tree['items']:
			tmp_deep = calculate_tree_deep(item, deep+1)
			if tmp_deep>new_deep:
				new_deep = tmp_deep
		if new_deep>deep:
			deep = new_deep
		return deep

	# функция сохранения новых спецификаций
	# usr - пользователь
	# data - дерево новой спецификации
	# old_specifications - список существующих спецификаций из БД
	# old_specification_info -  информация о старой спецификации, передеается в случае редактирования спецификации
	def save_data(usr, data, old_specifications, old_specification_info, data_save_type):
		i = 0
		for item in data['items']:
			data['items'][i] = save_data(usr, item, old_specifications, None,data_save_type)
			i+=1

		if data['specification_key_hash'] in old_specifications and (not old_specification_info or data_save_type == 'new'):
			old_data_item = deepcopy(old_specifications[data['specification_key_hash']])
			old_data_item['count'] = deepcopy(data['count'])
			old_data_item['vol_tolerance'] = deepcopy(data['vol_tolerance'])
			old_data_item['tolerance_on_vol'] = deepcopy(data['tolerance_on_vol'])
			old_data_item['vol_count'] = deepcopy(data['vol_count'])
			old_data_item['calculation'] = None
			# подменяем объект-конфигурацию в дереве соответсвующей спецификацией
			data = old_data_item
		else:
			new_specification_number = None
			if not old_specification_info or data_save_type == 'new':
				# получить номер для новой спецификации
				new_specification_id = ObjectId()
				new_specification_number =  datamodel.product_get_next_sequence_specification(ObjectId(data['config_id']))
				new_specification = deepcopy(data)
				new_specification['_id'] = new_specification_id
				new_specification['number'] = new_specification['config_number'] + '.' + str(routine.pad(new_specification_number, 3))
			else:
				# если пересохранение старой спецификации
				new_specification = deepcopy(data)
				new_specification['_id'] = ObjectId(old_specification_info['_id'])
				new_specification['number'] = old_specification_info['number']
				new_specification['history'] = old_specification_info.get('history',[])

			# выставление свойств для самостоятельной спецификации
			new_specification['count']['value'] = 1
			# 25.12.2015 материалы могут иметь самостоятельные допуски, поэтому обнуление допусков было отменено
			# new_specification['vol_tolerance']['value'] = None
			# new_specification['tolerance_on_vol']['value'] = None
			new_specification['vol_count']['value'] = None

			line_result = {}
			tree_result = {'items':[]}
			first_level_items = []
			get_structed_line_data(data, line_result, tree_result, first_level_items)

			new_specification['struct'] =  routine.JSONEncoder().encode(tree_result)
			new_specification['include'] =  line_result.values()
			# сохранение первого уровня
			new_specification['first_level_items'] = first_level_items
			# количество детей у спецификации(первый уровень)
			new_specification['child_count'] = len(first_level_items)
			# количество потомков у спецификации(со всех уровней)
			new_specification['descendant_count'] = len(new_specification['include'])
			new_specification['deep'] = calculate_tree_deep(tree_result, 0)

			del new_specification['items']  # удаление списка детей из итоговой спецификации, он не требуется
			del new_specification['group'] # удаление информации о группе из итоговой спецификации
			del new_specification['specification_out_key_hash'] # удаление тsемпового хэша

			# добавление спецификации в список задействованных, для дальнейшего использования
			old_specifications[new_specification['specification_key_hash']] = deepcopy(new_specification)
			# дата модификации спецификации
			new_specification['last_change']={
				'date': datetime.datetime.utcnow(),
				'user': usr['email']
			}
			# сохранение новой спецификации в БД
			if not old_specification_info or data_save_type == 'new':
				# блок истории
				new_specification['history']=[{
					'date': datetime.datetime.utcnow(),
					'user': usr['email'],
					'type': 'add'
				}]
				new_specification['add'] = {
					'date': datetime.datetime.utcnow(),
					'user': usr['email'],
				}
				# добавление новой спецификации
				specificationmodel.add(new_specification)
				# обновление статуса по счетчику
				if new_specification_number:
					datamodel.update_by(
						{'_id': ObjectId(data['config_id']), 'specification_seq_arr.i': new_specification_number},
						{'$set': {'specification_seq_arr.$.status':True }}
					)
			else:
				tmp_old_specification = specificationmodel.get_by_id(str(new_specification['_id']))
				# блок истории
				new_specification['history'] = tmp_old_specification.get('history',[])
				del tmp_old_specification['history']
				new_specification['history'].append({
					'date': datetime.datetime.utcnow(),
					'user': usr['email'],
					'type': 'update',
					'note': new_specification.get('note'),
					#'data': Binary(routine.compress(routine.JSONEncoder().encode(tmp_old_specification)))
				})
				new_specification['update'] = {
					'date': datetime.datetime.utcnow(),
					'user': usr['email'],
				}
				# обновление спецификации
				specificationmodel.update(str(new_specification['_id']), new_specification)

				# занесение в глобальную историю изменение спецификации
				historymodel.add(new_specification['_id'], 'specification', new_specification.get('note'), Binary(routine.compress(routine.JSONEncoder().encode(tmp_old_specification))),usr.get('email'))

				# обновление статуса по счетчику
				if new_specification_number:
					datamodel.update_by(
						{'_id': ObjectId(data['config_id']), 'specification_seq_arr.i': new_specification_number},
						{'specification_seq_arr.$.status':True }
					)
				# вызов функции обновления калькуляции по спецификации
				# рассчет калькуляции заносится в КЭШ
				update_calculation_cache(new_specification['number'])


			# восстановление значений свойств спецификации с учетом значений в дереве конфигурации
			new_specification['count']['value'] = data['count']['value']
			new_specification['vol_tolerance']['value'] =data['vol_tolerance']['value']
			new_specification['tolerance_on_vol']['value'] =data['tolerance_on_vol']['value']
			new_specification['vol_count']['value'] = data['vol_count']['value']
			new_specification['group'] = data.get('group',None)

			data = new_specification
		return data

	try:
		# unzip data

		# получение параметров на обработку из БД
		zipped_data =  queuemodel.get({'_id':ObjectId(queue_key)}, None)['params']
		data = routine.JSONDecode(routine.decompress(zipped_data, "deflate"))
		# тип сохранения данных(касается только сохранения существующих спецификаций)
		data_save_type = data.get('save_type')

		# # если идет создание новой спецификации и введена пользовательская пометка
		# # необходимо проверить ее на уникальность в рамках исходной конфигурации
		# if (not data.get('specification_info') or data_save_type == 'new') and  data['data'].get('note'):
		# 	# получение спецификаций с указанной пометкой
		# 	tmp_specs = specificationmodel.get_short({'config_number': data['data']['node']['number'], 'note': data['data']['note'] })
		# 	if len(tmp_specs)>0:
		# 		queuemodel.update(queue_key, {'status': 'error', 'note': 'В системе уже есть спецификации с указанным примечанием: {0}. Измените примечание и повторите попытку.'.format('; '.join([row['number'] for row in tmp_specs])), 'data': None, 'finish_date': datetime.datetime.utcnow() })
		# 		return

		queuemodel.update(queue_key, {'status': 'in_progress', 'percent_complete': 40, 'params': None})
		start = time.clock()
		print "Start save specification"
		# приведение данных к нужному формату
		new_data = prepare_data_from_config_to_specification(data.get('data'))
		queuemodel.update(queue_key, {'status': 'in_progress', 'percent_complete': 60})
		print "Time prepare data  is: ", time.clock() - start
		start = time.clock()
		# получене линейного списка объектов
		line_data = []
		get_line_data(new_data, line_data)
		# сбор хэш тегов которые необходимо проверить в базе спецификаций
		hashes_to_check = []
		for i in line_data:
			hashes_to_check.append(i['specification_key_hash'])
		# получение существующих спецификаций по собранным хэшь тегам
		old_specifications_arr = {}
		old_specifications = specificationmodel.get_list_by({'specification_key_hash':{'$in':hashes_to_check}}, None)
		if len(old_specifications)>0:
			for os in old_specifications:
				old_specifications_arr[os['specification_key_hash']] = os
		queuemodel.update(queue_key, {'status': 'in_progress', 'percent_complete':80})
		print "Time build specification is: ", time.clock() - start
		start = time.clock()
		# сохранение новых спецификаций
		new_specification = save_data(usr, new_data, old_specifications_arr, data.get('specification_info'), data_save_type)
		queuemodel.update(queue_key, {'status': 'in_progress', 'percent_complete':90})
		print "Time save specification is: ", time.clock() - start
		try:
			# получение обновленной информации о спецификации
			spec_info = get_specification_info(new_specification['number'])
			# обновление тех  карты спецификации
			if config.use_worker:
				config.qu_low.enqueue_call(func=rebuild_techno_map, args=(new_specification['number'],))
			else:
				rebuild_techno_map(new_specification['number'])
		except Exception, exc1:
			print_exc()
			spec_info = None

		res = routine.JSONEncoder().encode({'status': 'ok', 'specification_info': new_specification, 'specification_data': spec_info})
		queuemodel.update(queue_key, {'status': 'ok', 'note': '', 'data': Binary(routine.compress(res)), 'finish_date': datetime.datetime.utcnow()})
		res = None
		new_specification = None
		gc.collect()
	except Exception, exc:
		excType = exc.__class__.__name__
		print_exc()
		queuemodel.update(queue_key, {'status': 'error', 'note': str(exc), 'data': None, 'finish_date': datetime.datetime.utcnow() })

def api_background_calculate_specification(queue_key, zipped_data, usr):
	'''
		Функция сбора дерева изделия для заполнения свойств и генерирования спецификаций
		Функция выполняется в бэкграунде, используя воркеры.
		queue_key - идентификатор очереди
		number - номер конфигурации/спецификации
	'''
	try:
		print('#####################')
		print(queue_key)
		print('#####################')

		queuemodel.update(queue_key, {'status': 'in_progress', 'percent_complete': 10})

		# unzip data
		data = routine.JSONDecode(routine.decompress(zipped_data, "deflate"))
		percent_complete =10
		if not data.get('number'):
			queuemodel.update(queue_key, {'status': 'error', 'note': 'Заданы неверные параметры для получения данных.', 'data': None, 'finish_date': datetime.datetime.utcnow() })
			return

		number = data.get('number')
		config_number = None # Артикул конфигурации
		spec_number = None   # Артикул спецификации
		first_level_parents = None # у кого данная спецификация входит в первый уровень детей
		if not number:
			queuemodel.update(queue_key, {'status': 'error', 'note': 'Заданы неверные параметры для получения данных.', 'data': None, 'finish_date': datetime.datetime.utcnow() })
			return
		number_items = number.split('.')
		if len(number_items)<2 or len(number_items)>3:
			queuemodel.update(queue_key, {'status': 'error', 'note': 'Заданы неверные параметры для получения данных.', 'data': None, 'finish_date': datetime.datetime.utcnow() })
			return
		config_number = "{0}.{1}".format(str(number_items[0]), str(number_items[1]))
		if len(number_items)>2:
			spec_number = "{0}.{1}.{2}".format(str(number_items[0]), str(number_items[1]), str(number_items[2]))

		spec_info = None           # Информация о спецификации со всей вложеной структурой
		spec_node = None 	  #  Краткая информация о спецификации

		# если в качестве параметра пришел номер спецификации, то подгружаем структуру спецификации
		if spec_number:
			# информация о спецификации
			spec_info =specificationmodel.get_by({'number': spec_number})
			if not spec_info:
				queuemodel.update(queue_key, {'status': 'error', 'note': 'Спецификация не найдена.', 'finish_date': datetime.datetime.utcnow()})
				return None
			first_level_parents = get_specification_first_level_parents(spec_info['number'])
			# формаирование нода спецификации
			spec_node = {
				'name': spec_info['name'],
				'config_id': spec_info['config_id'],
				'number': spec_info['number'],
				'config_number': spec_info['config_number'],
				'_id': spec_info['_id'],
				'note': spec_info.get('note',''),
				'auto_note': spec_info.get('auto_note',''),
			}
			# получение списка спецификаций, из которых состоит текущая спецификация
			include_objects = {}
			include_ids = []
			tmp_info = get_specification_struct(spec_number)
			if len(tmp_info['include'])>0:
				include_ids = [row['_id'] for row in tmp_info['include']]
				tmp_data = specificationmodel.get_short({'_id': {'$in':include_ids}})
				for row in tmp_data:
					include_objects[str(row['_id'])] = row
				fill_specification_structure(include_objects, tmp_info['struct'], 1, spec_info)
			del spec_info['struct']
			del spec_info['include']
			if 'first_level_items' in spec_info:
				del spec_info['first_level_items']

		# получение noda искомой конфигурации
		node = datamodel.get_by({'number': config_number, 'datalink': None, 'status':{'$ne':'del'}})
		if not node:
			queuemodel.update(queue_key, {'status': 'error', 'note': 'Конфигурация не найдена.', 'finish_date': datetime.datetime.utcnow()})
			return None
		if node.get('type') != 'product':
			queuemodel.update(queue_key, {'status': 'error', 'note': 'Неверный тип объекта.', 'finish_date': datetime.datetime.utcnow()})
			return None

		# Поиск данных по собранной конфигурации в КЭШЕ
		# Если в КЭШЕ данных нет, то производим сбор конфигурации
		tree_to_specificate = None
		errors = []
		print('Check on cache for configuration: {0}'.format(config_number))
		try:
			start = time.clock()
			tree_to_specificate = configuration_cache_data_model.get(config_number)
			if tree_to_specificate:
				print "Cache daata exists. Time get data is: ", time.clock() - start
				queuemodel.update(queue_key, {'status': 'in_progress', 'percent_complete': 90})
		except Exception, exc:
			excType = exc.__class__.__name__
			print_exc()

		if not tree_to_specificate:
			print('No cache for configuration: {0}'.format(config_number))
			start = time.clock()
			# получение и обработка данных
			list = datamodel.get_structured(None,None)
			queuemodel.update(queue_key, {'status': 'in_progress', 'percent_complete': 15})
			# построение дерева и очистка его от библиотек
			cache_data = {} # список закэшированных объектов. используется для ускорения работы make_full_tree
			#tree = esudapi.make_full_tree(list, item_id, '', 0,False,None,cache_data)
			tree = esudapi.make_full_tree_production(list, node['_id'],False,None,cache_data)

			# если дерево построилось
			if tree:
				queuemodel.update(queue_key, {'status': 'in_progress', 'percent_complete': 40})
				print "Time first build tree is: ", time.clock() - start
				start = time.clock()
				# анализ дерева на конфигурации и подставление выбранных конфигураций
				esudapi.analize_tree_model_configuration(list, tree, [node],True,cache_data,None, 1, {'SHORT_ORIGINAL_CHILDREN':True})
				esudapi.clear_tree_from_types(tree, ['library'])
				cache_data = None
				gc.collect()
				queuemodel.update(queue_key, {'status': 'in_progress', 'percent_complete': 70})
				print "Time analize tree is: ", time.clock() - start
				start = time.clock()
				# проставление конфигурационных путей
				esudapi.refresh_parent_node(tree)
				# собираеются properties в единый список
				#prepare_properties_list(tree)
				print "Time prepare to spec structure is: ", time.clock() - start
				start = time.clock()
				# подготовка дерева к вычислениям
				# задаем в исходные данные количество изделий, необходимых для изготовления
				tree['count'] = {'unit':'шт.', 'value':1, 'is_calculate': False}
				tree_to_specificate = prepare_tree_to_specificate(list, tree, [], tree['node'].get('properties'), errors)

				tree = None
				list = None
				gc.collect()
				queuemodel.update(queue_key, {'status': 'in_progress', 'percent_complete': 90})
				print "Time prepare spec structure is: ", time.clock() - start
				clear_nonused_data(tree_to_specificate)
			else:
				raise Exception("Не удалось построить дерево конфигурации.")

			# Кэширование данных конфигурации
			start = time.clock()
			configuration_cache_data_model.update(config_number, tree_to_specificate)
			print "Prepare data to cache is: ", time.clock() - start

		# построение технологической карты
		techno_map = build_techno_map([spec_info]) if spec_info else None

		res = routine.JSONEncoder().encode({
			'status': 'success',
			'config_data': tree_to_specificate,
			'errors':errors,
			'product_info': node,
			'specification_data': spec_info,
			'parents': first_level_parents,
			'specification_info': spec_node,
			'techno_map': techno_map
		})

		start = time.clock()
		queuemodel.update(queue_key, {'status': 'ok', 'note': '', 'data': Binary(routine.compress(res)), 'finish_date': datetime.datetime.utcnow() })
		print "Zip and save data is: ", time.clock() - start
		res = None
		gc.collect()
	except Exception, exc:
		excType = exc.__class__.__name__
		print_exc()
		queuemodel.update(queue_key, {'status': 'error', 'note': str(exc), 'data': None, 'finish_date': datetime.datetime.utcnow()  })

def rebuild_all_configs_cache():
	'''
		Перестроение всех КЭШ конфигураций
	'''
	# получение номеров конфигураций, для кого требуется перестроить КЭШ
	config_nums = configuration_cache_data_model.get_empy()
	for config_number in config_nums:
		try:
			start = time.clock()
			print('Start build cahce for: {0}'.format(config_number))
			data = buil_config_cache_struct(config_number)
			configuration_cache_data_model.update(config_number, data)
			print('Finish build cahce for: {0}; Time: {1}'.format(config_number, time.clock()))
			# data= None
			# gc.collect()
		except:
			print('--Error cache building for: {0}'.format(config_number) )

def buil_config_cache_struct(config_number):
	'''
		Построение КЭШа конфигурации
		config_number - номер конфигурации
	'''
	# получение noda искомой конфигурации
	node = datamodel.get_by({'number': config_number, 'datalink': None, 'status':{'$ne':'del'}})
	if not node:
		raise Exception("Конфигурация не найдена.")

	tree_to_specificate = None
	errors = []
	start = time.clock()
	# получение и обработка данных
	list = datamodel.get_structured(None,None)
	# построение дерева и очистка его от библиотек
	cache_data = {} # список закэшированных объектов. используется для ускорения работы make_full_tree
	tree = esudapi.make_full_tree_production(list, node['_id'],False,None,cache_data)
	# если дерево построилось
	if tree:
		print "Time first build tree is: ", time.clock() - start
		start = time.clock()
		# анализ дерева на конфигурации и подставление выбранных конфигураций
		esudapi.analize_tree_model_configuration(list, tree, [node],True,cache_data,None, 1, {'SHORT_ORIGINAL_CHILDREN':True})
		esudapi.clear_tree_from_types(tree, ['library'])
		cache_data = None
		gc.collect()
		print "Time analize tree is: ", time.clock() - start
		start = time.clock()
		# проставление конфигурационных путей
		esudapi.refresh_parent_node(tree)
		# собираеются properties в единый список
		print "Time prepare to spec structure is: ", time.clock() - start
		start = time.clock()
		# подготовка дерева к вычислениям
		# задаем в исходные данные количество изделий, необходимых для изготовления
		tree['count'] = {'unit':'шт.', 'value':1, 'is_calculate': False}
		tree_to_specificate = prepare_tree_to_specificate(list, tree, [], tree['node'].get('properties'), errors, False, False)# properties_list)
		tree = None
		list = None
		gc.collect()
		print "Time prepare spec structure is: ", time.clock() - start
		clear_nonused_data(tree_to_specificate)
	return tree_to_specificate

def update_config_props(params):
	'''
		Обновление свойств спецификаций, по свойству конфиуграции
		Входные параметры:
		params = [{'config': '533.068', 'props': ['54d0a16d7bad640003abbbe5']}]
		config - номер конфигурации, по которой будут искаться спецификации
		props - список свойств, значения которых надо проставить в спецификациях
	'''
	result = []
	from models import productionordermodel, shifttaskmodel
	try:
		# получить данные ЭСУД
		start = time.clock()
		# получение и обработка данных
		list = datamodel.get_structured(None,None)
		cache_data = {}
		print "Get ESUD data is: ", time.clock() - start
		start = time.clock()
		for param in params:
			# получить данные о конфигурации
			cur_elem = datamodel.get_by({'number': param['config'], 'datalink': None, 'status':{'$ne':'del'}})
			if cur_elem:
				# построить спецификацию по заданной конфигурации
				tree = esudapi.make_full_tree_production(list, cur_elem['_id'], True, None, cache_data)
				esudapi.clear_tree_from_types(tree, ['library'])
				#esudapi.analize_tree_model_configuration(list, tree, [cur_elem],True,cache_data, 2, 1, {'SHORT_ORIGINAL_CHILDREN':True})
				esudapi.refresh_parent_node(tree)
				prepare_properties_list(tree)
				errors = []
				tree['count'] = {'unit':'шт.', 'value':1, 'is_calculate': False}
				product_tree =  prepare_tree_to_specificate(list, tree, [], tree['node'].get('properties'),  errors, False, True)


				# преобразование дерева конфигурации к спецификации
				spec_tree = prepare_data_from_config_to_specification(product_tree)

				# Получить все спецификации, созданные на основе заданной конфиуграции
				spec_list = specificationmodel.get_list_by({'config_number': param['config']}, {'number':1, 'name': 1,'properties': 1, 'sector':1})

				if not spec_list or len(spec_list)==0:
					result.append({
							'number': param['config'],
							'prop_name': u'Нет спецификаций',
							'prop_value': '',
							'status': 'error'
						})

				new_sector = None
				new_name = None

				# Обновить заданые свойства у найденных спецификаций
				# Если свойство есть, то обновить, если нет то добавить или удалить
				for prop_id in param['props']:
					changed_prop = None
					# проверка на название
					if prop_id == 'name':
						for c_spec in spec_list:
							c_spec['name'] = spec_tree['name']
							new_name = spec_tree['name']
							result.append({
								'number': c_spec['number'],
								'prop_name': u'Название',
								'prop_value': spec_tree['name'],
								'status': 'ok'
							})

					# проверка на системное свойство - участок
					elif prop_id == str((spec_tree.get('sector',{}) or {}).get('origin_id')):
						for c_spec in spec_list:
							spec_tree['sector']['origin_id'] = str(spec_tree['sector']['origin_id'])
							c_spec['sector'] = spec_tree['sector']
							new_sector = spec_tree['sector']
							result.append({
								'number': c_spec['number'],
								'prop_name': u'Участок',
								'prop_value': spec_tree['sector']['name'],
								'status': 'ok'
							})
					# ищем заданное по условию свойство, среди свойств спецификации
					else:
						try:
							changed_prop =  (i for i in spec_tree['properties'] if str(i.get('origin_id',''))==prop_id ).next()
							# если свойство переданное в параметрах действительно существует
							# то проводим манипуляции с его обновлением во всех наденных спецификациях
							if changed_prop:
								for c_spec in spec_list:
									prop_exist = False
									new_props = []
									for c_prop in c_spec['properties']:
										if c_prop['origin_id'] == prop_id:
											new_props.append(changed_prop)
											result.append({
												'number': c_spec['number'],
												'prop_name': c_prop['name'],
												'prop_value': c_prop['value'],
												'status': 'ok'
											})
											prop_exist = True
										else:
											new_props.append(c_prop)
											# result.append({
											# 	'number': c_spec['number'],
											# 	'prop_name': c_prop['name'],
											# 	'prop_value': c_prop['value'],
											# 	'status': 'ok'
											# })

									if not prop_exist:
										new_props.append(changed_prop)
										result.append({
												'number': c_spec['number'],
												'prop_name': changed_prop['name'],
												'prop_value': changed_prop['value'],
												'status': 'ok'
											})
									c_spec['properties'] = new_props
						except Exception, exc:
							print('----Error. Detail:{0}'.format(str(exc)))
							print_exc()
							pass


				# обновить информацию по всем найденным cпецификациям
				for c_spec in spec_list:
					try:
						specificationmodel.update(str(c_spec['_id']), {'sector': c_spec.get('sector'),'name': c_spec.get('name'), 'properties': c_spec['properties'] })
					except Exception, exc:
						print('----Error. specificationmodel.update: {0}. Detail:'.format(c_spec['number'],str(exc)))
						excType = exc.__class__.__name__
						print_exc()

						for row in result:
							if row['number'] == c_spec['number']:
								row['status'] = 'error'
								row['msg'] = str(exc)
						pass


				if new_sector or new_name:
					# Обновить информацию в заданиях на производство (только участок или имя)
					production_orders = productionordermodel.get_list(
						{'$or':[{'items_to_develop.config_number': param['config']},{'items_to_buy.config_number': param['config']}]},
						{'items_to_develop':1, 'items_to_buy':1}
					)

					for production_order in production_orders:
						for item in production_order.get('items_to_develop',[]):
							if item['config_number'] == param['config']:
								if new_sector:
									item['sector'] = new_sector
								if new_name:
									item['name'] = new_name
						for item in production_order.get('items_to_buy',[]):
							if item['config_number'] == param['config']:
								if new_sector:
									item['sector'] = new_sector
								if new_name:
									item['name'] = new_name
						productionordermodel.update_by_id(str(production_order['_id']), {'items_to_develop': production_order.get('items_to_develop',[]), 'items_to_buy': production_order.get('items_to_buy',[])})

					# Обновить информацию в сменных заданиях (только участок или имя)
					shift_tasks = shifttaskmodel.get_list({'items.number': re.compile(param['config']+'.', re.IGNORECASE)})
					for shift_task in shift_tasks:
						if new_sector:
							shift_task['sector'] = new_sector
						if new_name:
							for item in shift_task.get('items',[]):
								if param['config']+'.' in item['number']:
									item['name'] = new_name
						shifttaskmodel.update_by_id(shift_task['_id'], {'sector': shift_task.get('sector'), 'items': shift_task.get('items',[])})

		print "Analyse and update data is: ", time.clock() - start
		return result

	except Exception, exc:
		print('----Error. esudspecificationapi.update_config_props; {0}'.format(str(exc)))
		excType = exc.__class__.__name__
		print_exc()
		raise Exception(str(exc))


def get_linear_data_specification(node, count, result):
	'''
		Преобразование дерева спецификации к лиенйному списку вложенностей.
		Также в процессе преобразования ведется подсчет объекмов каждого уникального чайлда
	'''
	try:
		if len(node.get('items',[]))>0:
			for row in node['items']:
				if row['number'] in result:
					result[row['number']]['count']['value'] += routine.strToFloat(row['count']['value']) * count
				else:
					result[row['number']] = {
						'count': row['count'],
						'number': row['number'],
						'name': row['name'],
						'sector': row['sector']
					}
					result[row['number']]['count']['value']= routine.strToFloat(row['count']['value']) * count
				# get_linear_data_specification(row, routine.strToFloat(row['count']['value']) * count, result)
				get_linear_data_specification(row, count, result)
	except Exception, exc:
		print('----Error. get_linear_data_specification; {0}'.format(str(exc)))
		excType = exc.__class__.__name__
		print_exc()
		raise Exception(str(exc))

def build_techno_map(specifications, use_cache_techno_maps = True):
	'''
		Построение оптимальной технологической карты спецификаций
		specifications - список деревьев спецификаций
		use_cache_techno_maps - флаг использования готовых карт тех. процессов для спецификаций.В противном случае происходит расчет карты на лету
		Построение карты происходит согласно операциям на каждом уровне изделия
	'''

	# Локальная функция получения линейного списка операций в дереве спецификаций
	# node - узел дерева
	# res - результирующий список оераций
	# level  - текущий уровень в дереве
	# res = {0:{'operation_id':{}}, 1: {'operation_id':{}}}
	def get_operations(node, res, cur_op_list = None):
		cur_op_list = copy(cur_op_list) if cur_op_list else []
		if len(node.get('operations',[]) or [] )>0:
			# на одном уровне не может быть повторяющихся операций
			for tmp_operation in node['operations']:
					cur_op_list.append(tmp_operation)#.insert(0,tmp_operation)
		if len(node.get('items',[]) or [])==0:
			res.append(cur_op_list)
		else:
			for item in node.get('items'):
				get_operations(item, res, cur_op_list)

	# функция склеивания списков
	def merge_operations_list(result, additional, level):
		# рекурсивная функция, которая строит все возможные варианты совпадения по элементам
		def merge_next_elem (res, i_list, group, index):
			if index>=len(group.keys()):
				if len(i_list['arr'])>len(res['arr']):
					res['arr'] = i_list['arr']
				#res.append(i_list)
			else:
				if  (len(group.keys())-len(res['arr']))<(index-len(i_list['arr'])):
					return
				for e in group[group.keys()[index]]:
					if i_list['max']<e:
						l = {'max':e, 'arr':copy(i_list['arr'])}
						l['arr'].append({'k':group.keys()[index],'v':e})
						merge_next_elem(res,l,group,index+1)
				merge_next_elem(res,i_list,group,index+1)
		# сначала группируем индексы элементов по совпадениям (ключивой элемент - result, дополнительные - additional)
		group = OrderedDict()
		i=0
		for r in result:
			j=0
			for a in additional:
				if r['origin_id']==a['origin_id']:
					if i not in group:
						group[i] = []
					group[i].append(j)
				j+=1
			i+=1
		#res_group = []
		#print group
		res_elem = {'arr':[]}
		merge_next_elem(res_elem,{'max':-1, 'arr':[]},group,0)
		if len(res_elem['arr'])>0:
			# сортирую по длине совпадений. чем больше совпадений в списках, тем короче будет итоговый список после склейки
			#res_group.sort(key=lambda x:-len(x['arr']))
			# склеиваю списки в result
			index = 0
			r_index = 0
			add_index = 0 # при расширении списка индексы в итоговом списке будут так же смещаться
			for e in res_elem['arr']:
				# если есть пропуски, добавляем их в результат
				while e['v']>index:
					#dt = {'operation':{'origin_id':additional[index]['origin_id'],'name':additional[index]['name']},'is_additive':True,'list':[None for i in range(level)]+[additional[index]]}
					dt = {'origin_id':additional[index]['origin_id'],'name':additional[index]['name']}
					result.insert(e['k']+add_index,dt)
					add_index+=1
					index+=1
				#result[e['k']+add_index]['list'].append(additional[e['v']])
				index+=1
			# добавляем неиспользованные элементы
			'''for r in result:
				while len(r['list'])<(level+1):
					r['list'].append(None)'''
			# добавляем в конец недостающие элементы
			while index<len(additional):
				#dt = {'operation':{'origin_id':additional[index]['origin_id'],'name':additional[index]['name']},'is_additive':True,'list':[None for i in range(level)]+[additional[index]]}
				dt = {'origin_id':additional[index]['origin_id'],'name':additional[index]['name']}
				result.append(dt)
				index+=1
		else:
			# иначе добавляем все элементы добавляемого списка в конец
			index = 0
			while index<len(additional):
				#dt = {'operation':{'origin_id':additional[index]['origin_id'],'name':additional[index]['name']},'is_additive':True,'list':[None for i in range(level)]+[additional[index]]}
				dt = {'origin_id':additional[index]['origin_id'],'name':additional[index]['name']}
				result.append(dt)
				index+=1

	# рекурсивная функция, которая перебирает разные варианты расстановки изделий для получения самого короткого списка операций
	# параметр optimal_level определяет, какое минимальное кол-во оперций было получено на предыдущих шагах
	def make_optimal(op_list, tmp_operations, index, optimal_data):
		if index==len(tmp_operations):
			# считаем значение
			res_list = copy(op_list)
			level=1
			for opl in tmp_operations:
				merge_operations_list(res_list, opl, level)
				if len(optimal_data['data'])!=0 and len(res_list)>=len(optimal_data['data']):
					return False
				level+=1
			optimal_data['data'] = res_list
		else:
			j=index
			while j<len(tmp_operations):
				tmp_operations[index],tmp_operations[j] = tmp_operations[j],tmp_operations[index]
				res = make_optimal(op_list, tmp_operations,index+1, optimal_data)
				tmp_operations[index],tmp_operations[j] = tmp_operations[j],tmp_operations[index]
				if res==False:
					return False
				j+=1
		return True

	def get_operation_tree(item,  op_list, next_index ):
		#res = {'name':item.get('name'), '_id':item.get('_id'), 'number':item.get('number'), 'count':item.get('count'), 'operation':prev_opration, 'childrens':[]}
		res = []
		i = next_index
		while i<len(op_list):
			if len(item.get('operations',[]))>0:
				for o in item.get('operations',[]):
					if o['origin_id']==op_list[i].get('origin_id'):
						for c in item.get('items',[]):
							res.append( {'name':c.get('name'), '_id':c.get('_id'), 'number':c.get('number'), 'is_buy':c.get('is_buy'), 'count':c.get('count'), 'operation':o, 'level':i+1, 'children':get_operation_tree(c,op_list, i+1)})
						return res
			i+=1
		return res

	# раскрутить дерево по полученному списку операций
	def make_operation_tree(op_list, specifications):
		res_tree = []
		for item in specifications:
			res_tree.append( {'name':item.get('name'), '_id':item.get('_id'), 'number':item.get('number'), 'is_buy':item.get('is_buy'), 'count':item.get('count'), 'operation':None, 'children':get_operation_tree(item,op_list, 0), 'level':0})
			#res_tree.append(get_operation_tree(item,op_list,0))
		return res_tree
	try:
		res = None
		start = time.clock()
		print "Start build techno map"
		res_operations = [] # итоговый список операций (столбцы)
		for item in specifications:
			# если необходимо использовать гтовый КЭШ технологической карты, то используем его
			# иначе создаем новый
			if item.get('techno_map') and use_cache_techno_maps :
				res_operations.append(routine.JSONDecode(item['techno_map']) )
			else:
				tmp_operations = []
				get_operations(item, tmp_operations)
				if len(tmp_operations)>0:
					# в качестве эталонного изначально выступает самый длинный элемент
					tmp_operations.sort(key=lambda x:-len(x))
					op_list = []
					for i in tmp_operations[0]:
						op_list.append({'origin_id':i['origin_id'], 'name':i['name']})
					tmp_operations.remove(tmp_operations[0])
					res_data = {'data':[]}
					make_optimal(op_list, tmp_operations, 0, res_data)

					# Сохранение карты в БД
					specificationmodel.update(str(item['_id']), {'techno_map': routine.JSONEncoder().encode (res_data['data']) }, False)
					res_operations.append(res_data['data'])

		# Мержинг всех технологических карт в единый список
		if len(res_operations)>1:
			# в качестве эталонного изначально выступает самый длинный элемент
			res_operations.sort(key=lambda x:-len(x))
			op_list = []
			for i in res_operations[0]:
				op_list.append({'origin_id':i['origin_id'], 'name':i['name']})
			res_operations.remove(res_operations[0])
			res_data = {'data':[]}
			make_optimal(op_list, res_operations, 0, res_data)
			res_operations = op_list
		else:
			res_operations = res_operations[0]

		res = {'operations':res_operations, 'tree': make_operation_tree(res_operations,specifications)}
		print "Time build techno map  is: ", time.clock() - start
		return res

	except Exception, exc:
		print('----Error. build_techno_map; {0}'.format(str(exc)))
		excType = exc.__class__.__name__
		print_exc()
		raise Exception(str(exc))

def rebuild_techno_map(number):
	'''
		Обновление карты спецификации
	'''
	try:
		spec_info = get_specification_info(number)
		build_techno_map([spec_info], True)
	except Exception, exc:
		print('Error! rebuild_techno_map. ' + str(exc))
		excType = exc.__class__.__name__
		print_exc()
		raise Exception(str(exc))

def build_graph(id, vol):
	'''
		Функция построения графа спецификации.
	'''
	# функция подготовки данных
	def prepare_data(elem):
		result = {
			'node':{'_id': elem['_id']},
			'name':elem['name'],
			'article': elem['number'],
			'count': elem['count'],
			'children': [],
			'path': elem.get('path','')
		}
		for item in elem.get('items'):
			item['path'] = elem.get('path','') + '-' + str(elem['_id']) if elem.get('path') else str(elem['_id'])
			result['children'].append(prepare_data(item))
		return result
	try:
		data = prepare_data(get_specification_info_by_id(id, vol))
		return data
	except Exception, exc:
		print('Error! build_graph. ' + str(exc))
		excType = exc.__class__.__name__
		print_exc()
		raise Exception(str(exc))

def convert_old_tech_process_to_new():
	'''
		Функция-преобразователь старой структуры тех. процессов в новую
	'''
	def build_tree(items):
		grouped_items = {}
		levels = []
		result = []
		for item in items:
			if item['level'] not in grouped_items:
				grouped_items[item['level']] = []
			item['items'] = []
			grouped_items[item['level']].append(item)
			if item['level'] not in levels:
				levels.append(item['level'])


		for level in levels:
			if level==1:
				result.extend(grouped_items[level])
			else:
				grouped_items[level-1][0]['items'].extend(grouped_items[level])
		return result

	data = specificationmodel.get_list_by({'tech_process_operations':{'$exists': True}}, {'number':1, 'tech_process_operations': 1})
	for row in data:
		try:
			if row['tech_process_operations']:
				print('------')
				print('rebuild: {0}'.format(row['number']))
				if not row['tech_process_operations'][0].get('level'):
					j = len(row['tech_process_operations'])
					for item in row['tech_process_operations']:
						item['level'] = j
						j-=1
				row['tech_process_operations'].sort(key = lambda x: (x['level']))
				new_tech_process_operations = build_tree(row['tech_process_operations'])
				specificationmodel.update(row['_id'], {'tech_process_operations': routine.JSONEncoder().encode(new_tech_process_operations)}, False)
		except Exception, exc:
			print('----Error. esudspecificationapi.test_prepare_from_config; {0}'.format(str(exc)))
			excType = exc.__class__.__name__
			print_exc()


def test_prepare_from_config(number):
	'''
		Тестовая функция подготовки конфигурации
	'''
	from models import productionordermodel
	try:
		# получить данные ЭСУД
		start = time.clock()
		# получение и обработка данных
		list = datamodel.get_structured(None,None)
		cache_data = {}
		print "Get ESUD data is: ", time.clock() - start
		start = time.clock()

		# получить данные о конфигурации
		cur_elem = datamodel.get_by({'number': number, 'datalink': None, 'status':{'$ne':'del'}})
		if cur_elem:
			# построить спецификацию по заданной конфигурации
			tree = esudapi.make_full_tree_production(list, cur_elem['_id'], True, None, cache_data)
			esudapi.clear_tree_from_types(tree, ['library'])
			esudapi.analize_tree_model_configuration(list, tree, [cur_elem],True,cache_data, 2, 1, {'SHORT_ORIGINAL_CHILDREN':True})
			esudapi.refresh_parent_node(tree)
			prepare_properties_list(tree)
			errors = []
			tree['count'] = {'unit':'шт.', 'value':1, 'is_calculate': False}
			product_tree =  prepare_tree_to_specificate(list, tree, [], tree['node'].get('properties'),  errors, False, True)

			return product_tree
			# преобразование дерева конфигурации к спецификации
			spec_tree = prepare_data_from_config_to_specification(product_tree)
			return spec_tree
	except Exception, exc:
		print('----Error. esudspecificationapi.test_prepare_from_config; {0}'.format(str(exc)))
		excType = exc.__class__.__name__
		print_exc()
		raise Exception(str(exc))

def get_weight(spec_info, specification_items_cache):
	'''
		Функция получения веса изделия
		Изначально вес имеют покупные изделия. Данная функция вычисляет рекурсивно вес для
		крупных изделий, использующих покупные
	'''
	# локальная рекурсивная функция подсчета веса по дереву
	def do_calculate(ispec_info, tems):
		# функция-рекурсия
		def process_item(item):
			res = 0
			for row in item.get('items'):
				res +=  routine.strToFloat(process_item(row))
			for prop in item.get('properties',[]):
				if str(prop['origin_id']) == str(datamodel.SYSTEM_OBJECTS['WEIGHT_ON_VOLUME']):
					res = item['count'].get('value',0) *routine.strToFloat(prop['value'])
					break
			return res
		#----------------------
		res = 0
		for item in items:
			res += routine.strToFloat(process_item(item))
		return res
	#---------------------------------
	result = 0
	try:
		spec_info_items = []
		if len(spec_info.get('include',[]))>0:
			include_ids = [row['_id'] for row in spec_info['include'] if str(row['_id']) not in specification_items_cache]
			tmp_data = specificationmodel.get_short({'_id': {'$in':include_ids}})
			for row in tmp_data:
				specification_items_cache[str(row['_id'])] = row
			items = fill_specification_structure(specification_items_cache,  routine.JSONDecode(spec_info['struct']), 1)
			result = do_calculate(spec_info, items)

	except Exception, exc:
		excType = exc.__class__.__name__
		print_exc()
	return result

def update_calculation_cache(spec_number):
	'''
		Вызов функции обновления калькуляции по спецификации, рассчет калькуляции заносится в КЭШ
		Вместе с рассчетом калькуляции строится технологическая карта
		spec_number - номер спецификации
	'''
	try:
		usr = userlib.get_cur_user()
		if not config.use_worker:
			run_update_calculation_cache(spec_number)
		else:
			config.qu_low.enqueue_call(func=run_update_calculation_cache, args=(spec_number,))
	except Exception, exc:
		print('Error! update calculation cache. ' + str(exc))
		excType = exc.__class__.__name__
		print_exc()
		raise Exception(str(exc))

def run_update_calculation_cache(number):
	'''
		Функция информационного рассчета задания на производство по спецификации.
		При рассчете не учитывается склад и спецификация берется в количестве 1 шт.
		Также функция рассчитывает технологическую карту задания на производство
		number - номер спецификации
	'''
	from apis.esud import  esudproductionorderapi
	try:
		# получение информации о спецификации
		spec_info =specificationmodel.get_by({'number': number}, {'number':1, 'techno_map':1})
		if not spec_info:
			raise Exception("Спецификация не найдена.")

		# помечаем, что началось обновление расчетов для спецификации
		specificationmodel.update(str(spec_info['_id']), {
			'calculation': {
				'data': None,
				'status': 'in_process',
				'date': datetime.datetime.utcnow()
			}
		}, False)

		# калькуляция по спецификации
		data = {
			'use_returned_waste': False,
			'use_not_returned_waste': False,
			'use_stock': False,
			'stock_order_number': '',
			'specifications': [{'number': number, 'count':1}]
		}
		data_calculation = esudproductionorderapi.api_background_calculate(data)

		# обновление спецификации без обновления кэша структуры
		specificationmodel.update(str(spec_info['_id']), {
			'calculation': {
				'data': Binary(routine.compress(routine.JSONEncoder().encode(data_calculation))),
				'status': 'complete',
				'date': datetime.datetime.utcnow()
			}
		}, False)
	except Exception, exc:
		print('Error! run_update_calculation. ' + str(exc))
		print_exc()
		raise Exception(str(exc))

def get_buy_items(data):
	'''
		Функция получения покупных изделий в структуре изделия.
		В функцию подается результат от - prepare_tree_to_specificate
	'''
	try:
		result = []
		for model in data.get('models',[]):
			items = []
			get_model_items(model,[], items)
			if items and len(items)>0:
				for item in items:
					if item['node'].get('is_buy'):
						result.append(item)
		return result
	except Exception, exc:
		print('Error! get_buy_items. ' + str(exc))
		print_exc()
		raise Exception(str(exc))

def have_specifications(number, object_type):
	'''
		Функция проверки существования спецификаций, относящихся к заданной конфигурации/модели
		number - номер конфигурации/модели
		object_type - тип [product, product_model]
	'''
	try:
		if object_type=='product':
			condition = {'config_number':number}
		else:
			condition = {'config_number':re.compile(number+'.', re.IGNORECASE) }
		result = specificationmodel.get_list_by(condition, fields = {'number':1})
		return len(result)>0
	except Exception, exc:
		print('Error! have_specifications. ' + str(exc))
		print_exc()
		raise Exception(str(exc))

