#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route, get, post, put, request, error, abort, response, debug, delete
from libraries import userlib
from traceback import print_exc
from handlers.esud import esudhandler
from apis.esud import esudspecificationapi
import routine
import json
import datetime, time, routine, config

@get('/handlers/esudspecification/get/<number>')
def get_specification_structured_info(number):
	'''
	Получение структурированных данных о спецификации по номеру.
	В результате собранная спецификация по вложенной структуре.
	Происходит подгрузка всех чайлдов текущей спецификации.
	'''
	userlib.check_handler_access("esud_specification","r")
	try:
		if len(number.split('.'))<3:
			return routine.JSONEncoder().encode({'status': 'error','msg':'Заданы неверные параметры для получения данных.'})
		# информация о спецификации
		spec_info = esudspecificationapi.get_specification_info(number)
		# список спецификаций-родителей
		first_level_parents = esudspecificationapi.get_specification_first_level_parents(spec_info['number'])
		# технологическая карта
		techno_map = esudspecificationapi.build_techno_map([spec_info])
		return routine.JSONEncoder().encode({'status': 'ok','msg':'', 'data': spec_info, 'parents': first_level_parents, 'techno_map': techno_map})
	except Exception, exc:
		print('error')
		excType = exc.__class__.__name__
		print_exc()
		return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@get('/handlers/esudspecification/get_origin/<number>')
def get_specification_info(number):
	'''
	Получение исходных данных о спецификации по номеру
	Без подгрузки чайлдов текущей спецификации
	'''
	userlib.check_handler_access("esud_specification","r")
	try:
		from models import specificationmodel
		if len(number.split('.'))<3:
			raise Exception("Заданы неверные параметры для получения данных.")
		spec_info =specificationmodel.get_by({'number': number})
		if not spec_info:
			raise Exception("Спецификация не найдена.")
		return routine.JSONEncoder().encode({'status': 'ok','msg':'', 'data': spec_info})
	except Exception, exc:
		print('error')
		excType = exc.__class__.__name__
		print_exc()
		return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@post('/handlers/esudspecification/get_specifications_info')
def get_specifications_info():
	'''
	Получение списка спецификаци, без подгрузки их чайлдов
	'''
	userlib.check_handler_access("esud_specification","r")
	try:
		from models import specificationmodel
		tp_data = request.json
		request_data = {}
		for i in tp_data:
			request_data[i['number']] = i
		spec_numbers = []
		for i in request_data:
			spec_numbers.append(request_data[i]['number'])
		specs_list = specificationmodel.get_list_by({'number':{'$in': spec_numbers}})
		if not specs_list or len(specs_list)==0:
			raise Exception("Спецификации не заданы.")
		specs_list_dict = {}
		for i in specs_list:
			specs_list_dict[i['number']] = i

		for i in request_data:
			row = request_data[i]
			request_data[row['number']]['info'] = None if row['number'] not in specs_list_dict else specs_list_dict[row['number']]


		return routine.JSONEncoder().encode({'status': 'ok','msg':'', 'data': request_data})
	except Exception, exc:
		print('error')
		excType = exc.__class__.__name__
		print_exc()
		return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})


@post('/handlers/esudspecification/get_list/<page>')
def get_specification_list(page):
	'''
		Получение списка спецификаций по заданной странице
	'''

	# локальная функция отбора спецификаций по фильтрам
	def filter_by(data, filters):
		result = []
		for row in data:
			condition_group_checked = True
			for q_prop in filters:
				prop_checked = False
				for prop in (row.get('properties', []) or []):
					if str(prop.get('origin_id')) == str(q_prop['_id']):
						for q_value in q_prop['values']:
							if str(q_value['_id']) == str(prop['value_origin_id']) and ( not q_value['value']  or q_value['value'] == prop['value']):
							#if str(q_value['_id']) == str(prop['value_origin_id']):
								prop_checked = True
								break

				# проверка на участок
				if str(datamodel.SYSTEM_OBJECTS['SECTOR_PROP']) == str(q_prop['_id']):
					prop = row.get('sector',{}) or {}
					for q_value in q_prop['values']:
							if str(q_value['_id']) == str(prop.get('origin_id')) and ( not q_value['value']  or q_value['value'] == prop.get('name')):
								prop_checked = True
								break

				if not prop_checked:
					condition_group_checked = False;
					break
			if condition_group_checked:
				result.append(row)
		return result

	userlib.check_handler_access("esud_specification","r")
	try:
		from models import specificationmodel, datamodel

		data = []
		count = 0
		page_size = 50
		page = routine.strToInt(page)
		if not page:
			page=1

		# данные о фильтрах
		request_data = request.json
		# вид отображаемых изделий
		show_product_types = request_data.get('show_product_types')
		if request_data and request_data.get('model_number'):
			model_number = request_data.get('model_number')
			filters = request_data.get('filters') # [{'_id':'', 'values':['_id':'', 'value':'']}]
			parent_model_number = request_data.get('parent_model_number')
			parent_filters = request_data.get('parent_model_sel_filters')

			# если задана родительская модель, то сначала производим отбор по ней
			if parent_model_number:
				parent_model_data = datamodel.get_by({'number': parent_model_number, 'type':'product_model', 'datalink': None, 'status':{'$ne':'del'}})
				if not parent_model_data:
					raise Exception("Ошибка! Родительская модель не найдена.")
				# вытянуть все спецификации по модели
				data = specificationmodel.get_list_by({'model_id': str(parent_model_data['_id'])}, {'number':1, 'name': 1, 'history': 1, 'properties': 1, 'note':1, 'deep': 1, 'descendant_count':1, 'child_count':1, 'first_level_items':1})
				# найти среди них подходящие по фильтру свойств
				if parent_filters and len(parent_filters)>0:
					data = filter_by(data, parent_filters)

				numbers = []
				# среди найденных спецификаций, смотрим у кого в детях первого уровня есть  спецификации созданые
				# по модели первого уровня фильтрации
				for row in data:
					for item in row.get('first_level_items',[]):
						if item['number'][:3]==model_number:
							numbers.append(item['number'])
				# получаем список спецификаций по отобранному номеру
				data = []
				if len(numbers)>0:
					data = specificationmodel.get_list_by({'number': {'$in':numbers} }, {'is_buy':1,'number':1, 'name': 1, 'history': 1, 'properties': 1, 'note':1, 'deep': 1, 'descendant_count':1, 'child_count':1})
					# найти среди них подходящие по фильтру свойств
					if filters and len(filters)>0:
						data = filter_by(data, filters)[page_size*(page-1):]
					else:
						data = data[page_size*(page-1):]
					count = routine.ceil(routine.strToFloat(len(data)/page_size))

			else:
				cur_model_data = datamodel.get_by({'number': model_number, 'type':'product_model', 'datalink': None, 'status':{'$ne':'del'}})
				if not cur_model_data:
					raise Exception("Ошибка! Модель не найдена.")

				# вытянуть все спецификации по модели
				data = specificationmodel.get_list_by({'model_id': str(cur_model_data['_id'])}, {'is_buy':1,'number':1, 'name': 1, 'history': 1, 'properties': 1, 'note':1, 'deep': 1, 'descendant_count':1, 'child_count':1})
				# найти среди них подходящие по фильтру свойств
				if filters and len(filters)>0:
					data = filter_by(data, filters)[page_size*(page-1):]
				else:
					data = data[page_size*(page-1):]
				count = routine.ceil(routine.strToFloat(len(data)/page_size))
		else:
			condition = None
			if show_product_types == 'own':
				condition = {'is_buy': False}
			elif show_product_types == 'buy':
				condition = {'is_buy': True}
			data = specificationmodel.get_list_by_page(condition, {'is_buy':1,'number':1, 'name': 1, 'history': 1, 'properties': 1, 'note':1, 'deep': 1, 'descendant_count':1, 'child_count':1}, 50, page)
			count = routine.ceil(routine.strToFloat(specificationmodel.get_count(condition))/50)

		return routine.JSONEncoder().encode({'status':'ok','data':data,'count':count})
	except Exception, exc:
		print('error')
		excType = exc.__class__.__name__
		print_exc()
		return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@post('/handlers/esudspecification/update_config_props')
def update_config_props():
	'''
		Обновление свойств спецификаций, по свойству конфиуграции
		Входные параметры:
		[{'config': '533.068', 'props': ['54d0a16d7bad640003abbbe5']}]
		config - номер конфигурации, по которой будут искаться спецификации
		props - список свойств, значения которых надо проставить в спецификациях
	'''
	userlib.check_handler_access("esud_specification_update","w")
	try:
		#params = request.json
		post_data = request.body.read()
		params = json.loads(post_data)
		# входные параметры
		# params = [{'config': '533.068', 'props': ['54d0a1897bad640003abbbe8']}]
		if not params or len(params) ==0:
			raise Exception("Заданы неверные входные параметры.")
		result = esudspecificationapi.update_config_props(params)
		return routine.JSONEncoder().encode({'status':'ok','data':result})
	except Exception, exc:
		print('----Error. /handlers/esudspecification/update_config_props; {0}'.format(str(exc)))
		excType = exc.__class__.__name__
		print_exc()
		return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@get('/handlers/esudspecification/prepare_from_config/<number>')
def prepare_from_config(number):
	'''
		Тестовая функция сбора конфигурации
	'''
	userlib.check_handler_access("esud_specification","r")
	from models import productionordermodel, datamodel

	try:

		result = esudspecificationapi.test_prepare_from_config(number)
		return routine.JSONEncoder().encode({'status':'ok','data':result})
	except Exception, exc:
		print('----Error. /handlers/esudspecification/update_config_props; {0}'.format(str(exc)))
		excType = exc.__class__.__name__
		print_exc()
		return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@post('/handlers/esudspecification/get_specifications_and_complects_info')
def get_specifications_and_complects_info():
	'''
	Получение списка спецификаци, без подгрузки их чайлдов
	Получение списка комплектов с вложенными спецификациями
	'''
	userlib.check_handler_access("esud_specification","r")
	userlib.check_handler_access("esud_complect","r")
	try:
		from models import specificationmodel
		from models import complectmodel
		request_data = request.json
		result_specifications = {}
		result_complects = {}
		request_specifications = request_data['specs']
		request_complects = request_data['complects']

		# get specifications-------------------------
		for i in request_specifications:
			result_specifications[i['number']] = i
		spec_numbers = []
		for i in result_specifications:
			spec_numbers.append(result_specifications[i]['number'])
		specs_list = specificationmodel.get_list_by({'number':{'$in': spec_numbers}}, {'calculation':0})
		specs_list_dict = {}
		for i in specs_list:
			specs_list_dict[i['number']] = i
		for row in request_specifications:
			row['info'] = None if row['number'] not in specs_list_dict else specs_list_dict[row['number']]

		# get complects-------------------------------
		for i in request_complects:
			result_complects[i['number']] = i
		complect_numbers = []
		for i in result_complects:
			complect_numbers.append(result_complects[i]['number'])
		complects_list = complectmodel.get_list_by({'number':{'$in': complect_numbers}}, {'calculation':0})
		complects_list_dict = {}

		# сбор спецификаций, задействованных в комплекте
		spec_numbers = []
		for complect_row in complects_list:
			for row in complect_row.get('items',[]):
				spec_numbers.append(row['specification']['number'])
		specs_list = specificationmodel.get_list_by({'number':{'$in': spec_numbers}}, {'calculation':0})
		specs_list_dict = {}
		for i in specs_list:
			specs_list_dict[i['number']] = i
		# пробить информацию о спецификациях в комплект
		for complect_row in complects_list:
			for row in complect_row.get('items',[]):
				row['specification']['history'] = specs_list_dict[row['specification']['number']]['history']
			complects_list_dict[complect_row['number']] = complect_row

		for row in request_complects:
			row['info'] = None if row['number'] not in complects_list_dict else complects_list_dict[row['number']]

		return routine.JSONEncoder().encode({'status': 'ok','msg':'', 'specs': request_specifications, 'complects': request_complects})
	except Exception, exc:
		excType = exc.__class__.__name__
		print_exc()
		return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@get('/handlers/esudspecification/get_graph/<id>')
def get_specification_graph(id):
	'''
	Получение графа спецификации по идентификатору
	'''
	count = 1
	userlib.check_handler_access("esud_specification","r")
	try:
		data_graph = esudspecificationapi.build_graph(id, count)
		return routine.JSONEncoder().encode(data_graph)
	except Exception, exc:
		excType = exc.__class__.__name__
		print_exc()
		return None


@get('/handlers/esudspecification/rebuild_all_cache/')
def rebuild_all_specifications_cache():
	'''
	Перестроение КЭШ всех спецификаций
	Под перестроением КЭШ понимается очистка и перестроение полей "struct" и "include"
	'''
	userlib.check_handler_access("esud_specification","w")
	try:
		print('start build specification_rebuild_cache' )
		if config.use_worker:
			config.qu_low.enqueue_call(func=esudspecificationapi.rebuild_all_specifications_cache, args=None, timeout=20000)
		else:
			esudspecificationapi.rebuild_all_specifications_cache()
		print('finish specification_rebuild_cache')
	except Exception, exc:
		excType = exc.__class__.__name__
		print_exc()
		return None

@get('/handlers/esudspecification/rebuild_all_configs_cache/')
def rebuild_all_configs_cache():
	'''
	Перестроение КЭШ всех конфигураций
	КЭШ хранится в отдельной таблице
	'''
	userlib.check_handler_access("esud_specification","w")
	try:
		print('start build rebuild_all_configs_cache' )
		if config.use_worker:
			config.qu_low.enqueue_call(func=esudspecificationapi.rebuild_all_configs_cache, args=None, timeout=20000)
		else:
			esudspecificationapi.rebuild_all_configs_cache()
		print('finish rebuild_all_configs_cache')
	except Exception, exc:
		excType = exc.__class__.__name__
		print_exc()
		return None

@get('/handlers/esudspecification/get_calculation_cache/<number>')
def get_calculation_cache(number):
	'''
		Получение КЭШа калькуляции
		Если КЭША еще нет, то запускается функция расчета КЭША
		Если КЭШ есть, то берем его
		number - номер спецификации по которой необходимо получить расчеты
		need_rebuild - флаг,  указыващий на необходимость обновления КЭШа расчета
	'''
	from models import specificationmodel
	try:
		# получение КЭШа, если кэша нет, то запускаем его построение
		result = specificationmodel.get_by({'number': number}, {'calculation':1})

		if not result or not result.get('calculation') or (result['calculation'].get('status','') == 'in_process' and (not result['calculation'].get('date') or routine.floor(((datetime.datetime.utcnow() - result['calculation'].get('date')).seconds) / 60)>10)):
			if result.get('calculation') and result['calculation'].get('date'):
				print('--------')
				print(routine.floor(((datetime.datetime.utcnow() - result['calculation'].get('date')).seconds)))
				print('##')
				print(routine.floor(((datetime.datetime.utcnow() - result['calculation'].get('date')).seconds) / 60))
				print('---------')
			esudspecificationapi.update_calculation_cache(number)
			return routine.JSONEncoder().encode({'status': 'in_process', 'data': None})
		else:
			# результат
			if result['calculation']['data']:
				response.add_header("Content-Encoding", "gzip")
				return str(result['calculation']['data'])
			return routine.JSONEncoder().encode({'status': 'in_process', 'data': None})
	except Exception, exc:
		excType = exc.__class__.__name__
		print_exc()
		return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})


###---------------------------------------------------------------------------------------------------------------------------------------
###-----------------TESTS------------------------------------------------------------------------------------------------------------
###---------------------------------------------------------------------------------------------------------------------------------------
# @get('/handlers/esudspecification/test_build_calculation')
# def test_build_calculation():
# 	esudspecificationapi.run_update_calculation_cache('689.007.001')

# @get('/handlers/esudspecification/build_techno_map')
# def build_techno_map():
# 	try:
# 		from models import specificationmodel
# 		specifications = specificationmodel.get_list_by(None, {'number':1})
# 		for specification in specifications:
# 			print(specification['number'])
# 			esudspecificationapi.rebuild_techno_map(specification['number'])
# 	except Exception, exc:
# 		excType = exc.__class__.__name__
# 		print_exc()
# 		return None
