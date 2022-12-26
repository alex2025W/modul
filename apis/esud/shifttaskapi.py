#!/usr/bin/python
# -*- coding: utf-8 -*-

import datetime
import bson
from bson.objectid import ObjectId
import datetime, time
from libraries import userlib
from models import  specificationmodel, productionordermodel, shifttaskmodel, datamodel
from models import countersmodel
import routine
import config
from traceback import print_exc
from copy import deepcopy,copy

def get_near_work_date(weekends, used_dates):
	'''
		Получение ближайшей свабодной рабочей даты.
		weekends - выходные дни
		used_dates - занятые рабочие даты
	'''
	# Берем текущую дату.  Если дата не выходной и не занята, то возвращаем ее.
	#Если дата занята или в списке выходных, то берем следующую дату.
	# Пока не получим требуемый результат
	res = ""
	cur_date = datetime.datetime.utcnow()
	cur_date_str = cur_date.strftime('%Y-%m-%d')
	while not res:
		if cur_date_str not in weekends and cur_date_str not in used_dates:
			return cur_date_str
		cur_date =  cur_date + datetime.timedelta(days= 1)
		cur_date_str = cur_date.strftime('%Y-%m-%d')

def extract_processes(items):
	'''
	функция раскладки тех. процессов в линию
	'''
	def make_extract(process):
		result = []
		result.append(process)
		for item in process.get('items', []):
			result.extend(make_extract(item))
		return result

	result = []
	if items:
		for process in items:
			result.extend(make_extract(process))
	return result

def get_time_execution(data):
	'''
	data - список деревьев ТП
	функция подсчета планового времени изготовления изделия
	подсчет ведется по списку всех тех. процессов объекта
	Для процессов находящихся на одном уровне, ведется не суммирование времени а выбор максимального
	'''

	tech_process = []
	# раскладываем деревья процессов в линию
	tech_process = extract_processes(data)

	res = {'value': 0}
	process_grouped_by_level = {}
	if tech_process:
		for row in tech_process:
			execution_count = 0
			next_level_time = 0;
			in_level_time = 0;

			if 'execution_count' in row:
				execution_count = routine.strToFloat(row['execution_count']['value'] )
			if 'next_level_time' in row:
				next_level_time = routine.strToFloat(row['next_level_time']['value'])
				if str(row['next_level_time']['unit_origin_id']) == str(datamodel.SYSTEM_OBJECTS['MIN_UNIT']):
					next_level_time = float(next_level_time)*60

			if 'in_level_time' in row:
				in_level_time = routine.strToFloat(row['in_level_time']['value']) *(execution_count-1) if execution_count>0 else 0
				if str(row['in_level_time']['unit_origin_id']) == str(datamodel.SYSTEM_OBJECTS['MIN_UNIT']):
					in_level_time = float(in_level_time)*60

			if 'execution_time' in row and execution_count:
				value = routine.strToFloat(row['execution_time']['value']) * execution_count
				# если измерение времени в секундах, то приводим его в минуты
				if str(row['execution_time']['unit_origin_id']) == str(datamodel.SYSTEM_OBJECTS['MIN_UNIT']):
					value = float(value)*60

				# Прибавление времени перехода к следующему этапу
				value+=next_level_time
				# Прибавление времени перехода внутри этапа
				value+=in_level_time

				if not row.get('level') in process_grouped_by_level:
					process_grouped_by_level[row.get('level')] = {'value':value}
				else:
					if value>process_grouped_by_level[row.get('level')]['value']:
						process_grouped_by_level[row.get('level')] = {'value':value}

		# суммирование результата для всех процессов
		for row in process_grouped_by_level.values():
			res['value']+= row['value']
	return res

def get_order_techno_map (order_number):
	'''
	Получение данных о спецификациях из заданий на производство по номеру заказа
	'''
	try:
		from apis.esud import esudspecificationapi
		res = {}
		start = time.clock()
		# выбор всех  заданий на произвосдство с указанным номером заказа
		production_orders = productionordermodel.get_list({'order.number': order_number}, {'products':1, 'order':1, 'number':1, 'items_to_develop':1})
		if not production_orders:
			raise Exception('По указанному номеру заказа нет заданий на производство.')
		print "Get data from db is: ", time.clock() - start
		start = time.clock()

		own_products = {}
		for row in production_orders:
			# заказные изделия
			for p_row in row['products']:
				if p_row['number'] not in own_products:
					own_products[p_row['number']] = p_row
				else:
					own_products[p_row['number']]['count']['value']+=p_row['count']['value']

		own_products_tree = [] # список из деревьев заказных изделий
		# подсчет готовых элементов для каждого участка по продуктам которые необходимо изготовить
		# также построение дерева заказных изделий
		#------ ПРОВЕРИТЬ ДАННЫЙ УЧАСТОК ВОЗМОЖНА ОПТИМИЗАЦИЯ--------------------
		for p_row in own_products.values():
			# получить структуру спецификации
			tmp_spec_tree = esudspecificationapi.get_specification_info(p_row['number'], p_row['count']['value'] )
			own_products_tree.append(tmp_spec_tree)
		#-----------------------------------------------------------------------------------------------------------------------
		print "Get own products data is: ", time.clock() - start
		start = time.clock()
		# подготовка результата
		res['techno_map'] = esudspecificationapi.build_techno_map(own_products_tree)
		print "Build techno map is: ", time.clock() - start
		return res

	except Exception, exc:
		print('Error! Get shift task data. ' + str(exc))
		excType = exc.__class__.__name__
		print_exc()
		raise Exception(str(exc))

def sort_sectors_in_tree(data):
	'''
		Сортировка участков в данных.
		Сортировка построена на алгоритме построения последовательности входного и выходного участка
	'''
	def sort_sub_sectors(sector, sectors, result):
		copy_sectors = copy(sectors)
		if sector in copy_sectors:
			out_sectors =deepcopy(copy_sectors[sector]['out'])
			if sector in sectors:
				del sectors[sector]
			if len(out_sectors)>0:
				for j in out_sectors:
					if j not in result:
						result.append(j)
						sort_sub_sectors(j, sectors, result)

	def sort_sectors(sectors, result):
		# поиск участка, который нигде не задействован в качестве выходящего
		copy_sectors = copy(sectors)
		for i in copy_sectors:
			if len(copy_sectors[i]['in_out'])==0:
				result.append(i)
				out_sectors =deepcopy(copy_sectors[i]['out'])
				if i in sectors:
					del sectors[i]
				if len(out_sectors)>0:
					for j in out_sectors:
						if j not in result:
							result.append(j)
							sort_sub_sectors(j, sectors, result)
			else:
				if i in sectors:
					del sectors[i]

	result = []
	sectors = {}
	# отобрать все уникальные участки из данных
	for row in data:
		if not row['sector'] or not row['sector']['name']:
			row['sector'] =  {
				'name': 'Не задан',
				'origin_id': None,
				'routine': 0,
			}
		in_sector = row['sector'].get('name')

		if not row['parent_sector'] or not row['parent_sector']['name']:
			row['parent_sector'] =  {
				'name': 'Не задан',
				'origin_id': None,
				'routine': 0,
			}

		out_sector = row['parent_sector'].get('name')
		if in_sector:
			if in_sector not in sectors:
				sectors[in_sector] = {'out': [], 'in_out':[]}
			if out_sector and out_sector not in sectors[in_sector]['out'] and out_sector != in_sector:
				sectors[in_sector]['out'].append(out_sector)
			if out_sector and out_sector in sectors and in_sector not in sectors[out_sector]['in_out'] and out_sector != in_sector:
				sectors[out_sector]['in_out'].append(in_sector)
	# сортировка
	sorted_sectors = []

	while(sectors and len(sectors)>0):
		sort_sectors(sectors, sorted_sectors)

	structured_sectors = {}
	if(sorted_sectors and len(sorted_sectors)>0 ):
		i = 0
		for sector in sorted_sectors:
			i+=1
			structured_sectors[sector] = i

	# сбор данных по участкам
	for row in data:
		row['sector']['routine'] = structured_sectors.get(row['sector'].get('name','Не задан'),0)
	data.sort(key = lambda x:(x['sector'].get('routine'), x['number']))
	return structured_sectors

def get_order(order_number):
	'''
		Получение данных о спецификациях из заданий на производство по номеру заказа
	'''
	def calculate_used(prepared_orders, specifications_struct_data):
		'''
			локальная функция подсчета. какие части в каком количестве
			задействованы в готовых изделиях
			prepared_orders - список всех обработанных спецификации в задании
			specifications_struct_data - детализация спецификаций, участвующих в задании
		'''
		# проход по всем спецификациям, подсчет количества по структуре
		for row_i in specifications_struct_data:
			row = specifications_struct_data[row_i]
			for item in row['first_level_items']:
				if item['number'] in prepared_orders:
					if row['number'] not in prepared_orders[item['number']]['count']['used_detail']:
						prepared_orders[item['number']]['count']['used_detail'][row['number']] = 0;
					prepared_orders[item['number']]['count']['used_detail'][row['number']] += routine.strToFloat(item['count']['value'])
		for row_i in prepared_orders:
			row = prepared_orders[row_i]
			for spec_number in row['count']['used_detail']:
				row['count']['used_detail'][spec_number] *= prepared_orders[spec_number]['count']['handed']
				row['count']['used']+=row['count']['used_detail'][spec_number]

	def claculate_count_objects_maded_by_existing_parts(product, product_items, existing_items):
		'''
			локальная функция подсчета, количества итоговой продукции, которую можно
			изготовить из имеющихся частей
			product - тот кого изготавливаем и по кому ведем подсчет
			product_items = [{}]  - список детей с количествами, которые требуется на изготовление "product"
			exisiting_items = [{}] - список готовых частей на участке
			уже сделаный объем текущего продукта + количество высчитывается как минимальное отношения между двумя объемами одинаковых спецификаиций
		'''
		result = None
		i = 0
		# снчала ищем сколько готово объема текущего продукта
		ready_product_count = 0
		try:
			tmp_part =  (i for i in existing_items if i['number']==product['number'] ).next()
			ready_product_count = tmp_part['count']['handed']
		except:
			pass
		# подсчитываем объем составных частей гтового продукта и узнаем сколько еще можно сделать из
		# найденных частей
		for  row in product_items:
			# поиск спецификации в готовых частях
			try:
				tmp_part =  (i for i in existing_items if i['number']==row['number'] ).next()
				tmp_count =  routine.floor(tmp_part['count']['handed']/row['count']['value'])
				if not i:
					result = tmp_count
					i=1
				if tmp_count<result:
					result = tmp_count
			except:
				pass
		return ready_product_count + result if result and result>0 else ready_product_count+ 0

	def get_templates(data, shift_tasks):
		'''
			Локальная функция получения списка шаблонов, примененых в расчетах
			data - список рассчетов (заданий на производство)
			shift_tasks - сменные задания
		'''
		def link_templates(data):
			'''
				Привязка взаимосвязанных шаблонов.
				Взаимосвязанными считаем те, входный материал которых получается из другого шаблона
			'''
			for row in data:
				# если на входе покупной материал, то шаблоны не могут быть связанными
				if not row['in_object'].get('is_buy', False):
					linked_templates = []
					for item in data:
						if row != item:
							for out_object in item.get('out_objects',[]):
								if out_object['_id'] == row['in_object']['_id']:
									linked_templates.append(item['_id'])
					row['linked_templates'] = linked_templates

		def sort_templates(data):
			'''
				Сортировка по номеру шаблона в названии
			'''
			for row in data:
				row['routine']= row['name'].split(' ')[0]

		def fill_facts(data, shift_tasks):
			'''
			 	Заполнение параметров
			 	applied_to - где был применен шаблон и сколько раз
			 	fact-count - сколько раз был фактически применен шаблон
			'''
			# сбор всех шаблонов, задействованных в сменках
			for shift_task_row in shift_tasks:
				if shift_task_row.get('templates'):
					used_templates = {}
					for template_row in shift_task_row['templates']:
						data[template_row['_id']]['fact_count']+=template_row.get('fact_count', 0) if shift_task_row.get('complete') else template_row['count']
						if template_row.get('used_templates'):
							for used_template in template_row['used_templates']:
								data[used_template['_id']]['applied_to'].append({
										'_id': template_row['_id'],
										'name': template_row['name'],
										'count': template_row['count'],
										'shift_task_id': shift_task_row['_id'],
										'shift_task_number': shift_task_row['number'],
									})
								data[used_template['_id']]['applied_count']+=template_row['count']

		def make_info_object(item, template, is_buy_items):
			'''
				Функция формирующая объект с информацией о темплейте
			'''
			return {
				'name': template['template'].get('name'),
				'_id': template['template'].get('_id'),
				'qty': template.get('qty',0),
				'linked_templates': None,
				'fact_count' :0, # сколько раз задействован в сменных заданиях
				'applied_to':[],	#  для каких шаблонов из каких заданий данный шаблон уже применен
				'applied_count': 0,
				'in_object': {
					'_id': item['_id'],
					'name': item['name'],
					'number': item['number'],
					'is_buy': is_buy_items,
					'count': 1,
					'sector': item.get('sector')
				},
				'out_objects': [
					{
						'_id': i['selected_specification']['_id'],
						'number': i['selected_specification']['number'],
						'name': i['selected_specification']['name'],
						'count': i['count'],
						'unique_props_str': i.get('unique_props_str',''),
						#'sector': i.get('sector')
					}
					for i in template['template']['out_objects']
				],
				'sector_id': template['template']['out_objects'][0]['sector'].get('origin_id') or template['template']['out_objects'][0]['sector'].get('orgin_id') if template['template']['out_objects'][0].get('sector') else '',
				'sector_name': template['template']['out_objects'][0]['sector'].get('name') if template['template']['out_objects'][0].get('sector') else 'Не задан',
				'sector_routine': template['template']['out_objects'][0]['sector'].get('routine') if template['template']['out_objects'][0].get('sector') else 0,
			}
		res = {}
		for row in data:
			# шаблоны раскроя применяются как над покупными так и над собственными изделиями
			for key in ['items_to_develop', 'items_to_buy']:
				for item in row[key]:
					if item.get('templates') and len(item.get('templates'))>0:
						is_buy_items = key=='items_to_buy'
						for template in item['templates']:
							if not template['template']['_id'] in res:
								res[template['template']['_id']] =  make_info_object(item, template, is_buy_items)
							else:
								res[template['template']['_id']]['qty']+=template.get('qty',0)
								#res[template['template']['_id']]['fact_count']+=template.get('fact_count',0)

		# привязываем взаимосвязанные шаблоны
		link_templates(res.values())
		# пробиваем сортировочный параметр шаблонам
		sort_templates(res.values())
		# пробиваем факты по шаблонам, под фактами подразумевается использование шаблонов в сменных заданиях
		fill_facts(res, shift_tasks)

		# результат
		return res.values()

	#-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	# основной код--------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	#-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	try:
		from apis.esud import esudspecificationapi, esudproductionorderapi
		start = time.clock()
		# результирующая структура
		res = {'sectors': [], 'data': [], 'weekends': [], 'order_info':{}, 'templates': []}
		# выбор всех  заданий на произвосдство с указанным номером заказа
		production_orders = productionordermodel.get_list({'order.number': order_number}, {'products':1, 'order':1, 'number':1, 'items_to_develop':1, 'items_to_buy':1})
		if not production_orders:
			raise Exception('По указанному номеру заказа нет заданий на производство.')
		print "Get data from db is: ", time.clock() - start
		start = time.clock()

		# Подготовка информации.
		# получение выходных дней из календаря
		weekends = {}
		for i in (config.db.weekends.find_one({}, {'weekends': 1}) or {}).get("weekends", []):
			weekends[i] = i

		# В заказе могут быть одинаковые позиции, для таких позиций необходимо скаладывать объемы
		prepared_orders = {}
		sectors = {} # список всех участков, задействованных в заказе
		specification_numbers = {} # список уникальных номеров спецификаций, задействованных в заказе
		order = {} # информация о заказе по которому ижет поиск
		order = production_orders[0]['order']

		# продукты которые необходимо изготовить по заказу------------------------------------------------------------------------
		own_products = {}
		for row in production_orders:
			# заказные изделия
			for p_row in row['products']:
				if p_row['number'] not in own_products:
					own_products[p_row['number']] = p_row
				else:
					own_products[p_row['number']]['count']['value']+=p_row['count']['value']

			# сбор номеров всех спецификаций задействованных в задании
			# для получения детализации по ним
			for item in row['items_to_develop']:
				# сбор номеров спецификаций
				specification_numbers[item['number']] = item['number']
			# получение информации о спецификациях, задействованных в заказе
			specifications_struct = specificationmodel.get_list_by({'number': {'$in': specification_numbers.values()}}, {'number':1, 'name':1, 'deep': 1, 'tech_process_operations': 1, 'struct':1, 'first_level_items':1, 'include':1 })
			specifications_struct_data = {}
			for item in specifications_struct:
				specifications_struct_data[item['number']] = item

			 # контейнер для повторяющихся спеуификаций при построении структуры
			specification_items_cache = {}

			# сбор элементов на изготовление
			for item in row['items_to_develop']:
				# сбор участков
				if item['sector']['origin_id'] not in sectors:
					sectors[item['sector']['origin_id']] = copy(item['sector'])
				# сбор спецификаций
				if item['number'] not in prepared_orders:
					prepared_orders[item['number']] = {
						'sector': item['sector'],
						'parent_sector': item.get('parent_sector'),
						'_id': item['_id'],
						'name': item['name'],
						'number': item['number'],
						'deep': specifications_struct_data[item['number']]['deep'],
						'count': {
							'value': item['to_develop']['value'], # плановый объем
							'issued':0, 	# выдано
							'real_issued':0, # выдано с учетом сданных фактов #995 (не в производстве)
							'used':0, 	# израсходовано
							'used_detail':{}, # детализация, куда израсходованы
							'handed': 0, 	# сдано
							'balance': item['to_develop']['value'], 	# остаток
							'unit': item['to_develop']['unit']
						},
						'production_orders': {str(row['number']):  item['to_develop']['value']},
						'issued_shift_tasks': {}, # сменные задания для - "выдано"
						'handed_shift_tasks': {}, # сменные задания для фактов
						#'tech_process_operations': specifications_struct_data[item['number']].get('tech_process_operations')
						'plan_execution_time': get_time_execution(routine.JSONDecode(specifications_struct_data[item['number']].get('tech_process_operations'))) if specifications_struct_data[item['number']].get('tech_process_operations') else {'value': 0},
						# расчет веса на единицу объема (переделать на системное свойство)
						'weight_per_unit': esudspecificationapi.get_weight(specifications_struct_data[item['number']], specification_items_cache)
					}
				else:
					prepared_orders[item['number']]['count']['value'] += item['to_develop']['value']
					prepared_orders[item['number']]['count']['balance'] += item['to_develop']['value']
					if item['to_develop']['value']!=0:
						if str(row['number']) in prepared_orders[item['number']]['production_orders']:
							prepared_orders[item['number']]['production_orders'][str(row['number'])]+=item['to_develop']['value']
						else:
							prepared_orders[item['number']]['production_orders'][str(row['number'])]=item['to_develop']['value']
		#---------------------------------------------------------------------------------
		print "Prepare data is: ", time.clock() - start

		start = time.clock()
		# выбор информации о сменных заданиях по указанному номеру заказ
		shift_tasks = shifttaskmodel.get_list({'order.number': order_number})
		# сбор информации о шаблонах раскроя, примененных при расчетах
		res['templates'] = get_templates(production_orders, shift_tasks)
		shift_task_items_volumes = {} # объемы спецификаций задействованные в других заданиях
		sector_used_dates = {} # занятые даты по участкам
		all_used_dates = {} # все занятые даты в заказе
		for shift_task in shift_tasks:
			# получение дат задействованных в заданиях по участкам
			if not shift_task['sector']['origin_id'] in sector_used_dates:
				sector_used_dates[shift_task['sector']['origin_id']] = {}

			tmp_date = shift_task['date'].strftime('%Y-%m-%d')
			if tmp_date not in sector_used_dates[shift_task['sector']['origin_id']]:
				sector_used_dates[shift_task['sector']['origin_id']][tmp_date] = []
			if tmp_date not in all_used_dates:
				all_used_dates[tmp_date] = []
			# добавление не закрытых заданий на смену по указанноому участку и дате
			sector_used_dates[shift_task['sector']['origin_id']][tmp_date].append(shift_task['number'])
			all_used_dates[tmp_date].append(shift_task['number'])
			# получение объемов спецификаций, задействованных в сменых заданиях
			for row in shift_task['items']:
				if row['number'] not in shift_task_items_volumes:
					shift_task_items_volumes[row['number']] = {
						'value': 0, # плановый объем
						'real_value': 0, # количество с учетом факта
						'issued_shift_tasks':{}, # сменные задания для - "выдано"
						'handed_shift_tasks':{}, # сменные задания для фактов
						'fact_value':0, # фактический объем
						'ballance': 0 # баланс между фактом и планом
					}
				shift_task_items_volumes[row['number']]['value']+=row['count']['value']
				# подсчет выданных объекмов по сменным заданиям
				if shift_task['number'] not in shift_task_items_volumes[row['number']]['issued_shift_tasks']:
					shift_task_items_volumes[row['number']]['issued_shift_tasks'][shift_task['number']] = {'count': 0, 'date': shift_task['date']}
				shift_task_items_volumes[row['number']]['issued_shift_tasks'][shift_task['number']]['count'] += row['count']['value']
				if 'fact' in row and row['fact']:
					# подсчет факта
					shift_task_items_volumes[row['number']]['fact_value']+=row.get('fact',{}).get('value',0)
					# подсчет остатка
					shift_task_items_volumes[row['number']]['ballance']+=row.get('fact',{}).get('value',0)
					# подсчет количества с учтоем факта
					shift_task_items_volumes[row['number']]['real_value']+=row.get('fact',{}).get('value',0)
					# подсчет фактов по сменным заданиям
					if shift_task['number'] not in shift_task_items_volumes[row['number']]['handed_shift_tasks']:
						shift_task_items_volumes[row['number']]['handed_shift_tasks'][shift_task['number']] = {'count': 0, 'date': row.get('fact',{}).get('date',None), 'task_date': shift_task['date']}
					shift_task_items_volumes[row['number']]['handed_shift_tasks'][shift_task['number']]['count'] += row.get('fact',{}).get('value',0)
				else:
					shift_task_items_volumes[row['number']]['ballance']+=row['count']['value']
					shift_task_items_volumes[row['number']]['real_value']+=row['count']['value']

		# мержинг данных и пересчет количественных значений
		for row_i in prepared_orders:
			row = prepared_orders[row_i]
			row['count']['issued'] = shift_task_items_volumes.get(row['number'], {}).get('value',0)
			row['count']['handed'] = shift_task_items_volumes.get(row['number'], {}).get('fact_value',0)
			row['count']['real_issued'] = shift_task_items_volumes.get(row['number'], {}).get('real_value',0)
			# 28.12.2015 --  #897 (остаток считаем, как: значение по заданию - сдано по факту)----------------
			# if row['count']['issued']>0 or row['count']['handed']>0:
			# 	row['count']['balance'] = row['count']['value'] - shift_task_items_volumes.get(row['number'], {}).get('ballance',0)
			row['count']['balance'] = row['count']['value'] - row['count']['handed']
			#-------------------------------------------------------------------------------------------------------------------------------------------------
			row['issued_shift_tasks'] = shift_task_items_volumes.get(row['number'], {}).get('issued_shift_tasks',{})
			row['handed_shift_tasks'] = shift_task_items_volumes.get(row['number'], {}).get('handed_shift_tasks',{})
			#row['count']['balance'] = row['count']['value'] - max(row['count']['handed'], row['count']['issued'])
			#row['count']['balance'] = row['count']['value'] - row['count']['handed'] - row['count']['issued']

		print "All order prepare  is: ", time.clock() - start

		#987(Подсчет использованных изделий в более крупных)
		start = time.clock()
		calculate_used(prepared_orders, specifications_struct_data)
		print "Calculate used volumes is: ", time.clock() - start

		start = time.clock()
		prepared_orders = prepared_orders.values()
		own_products_tree = [] # список из деревьев заказных изделий

		# подсчет готовых элементов для каждого участка по продуктам которые необходимо изготовить
		# также построение дерева заказных изделий
		#------ ПРОВЕРИТЬ ДАННЫЙ УЧАСТОК ВОЗМОЖНА ОПТИМИЗАЦИЯ--------------------
		for p_row in own_products.values():
			p_row['spec_linear_data'] = {}
			# получить структуру спецификации
			tmp_spec_tree = esudspecificationapi.get_specification_info(p_row['number'], p_row['count']['value'] )
			p_row["deep"] = tmp_spec_tree['deep'];
			own_products_tree.append(tmp_spec_tree)
			esudspecificationapi.get_linear_data_specification(tmp_spec_tree, 1, p_row['spec_linear_data'])
		#-----------------------------------------------------------------------------------------------------------------------
		print "Get all order specifications  is: ", time.clock() - start
		start = time.clock()
		# проставление ближайших свободных рабочих дней на участке
		# а также сбор занятых дат
		sectors = sectors.values()
		sectors.sort(key = lambda x: (x['name']))
		for sector in sectors:
			sector['used_dates'] = sector_used_dates.get(sector['origin_id'],{})
			sector['near_free_work_date'] = get_near_work_date(weekends, sector['used_dates'])
			sector['own_products'] = []
			# объекты, изготавливаемые на данном участке
			tmp_sector_specifications = [row for row in prepared_orders if row['sector']['origin_id'] == sector['origin_id']]
			#count_objects_maded_by_existing_parts
			# подсчет количества итоговых объектов заказа, которые могут быть изготовлены из
			# готовых объектов текущего участка
			for p_row in own_products.values():
				tmp_sector_product_specifications = [row for row in p_row['spec_linear_data'].values() if row.get('sector',{}).get('origin_id') ==  sector['origin_id']]
				sector['own_products'].append({
					'_id': p_row['_id'],
					'number': p_row['number'],
					'name': p_row['name'],
					'count': p_row['count'],
					'deep':  p_row['deep'],
					'completed': claculate_count_objects_maded_by_existing_parts(p_row, tmp_sector_product_specifications, tmp_sector_specifications)
				})

		#994
		#Подсчет параметров для всего заказа(used_dates, near_free_work_date, own_products)
		full_order_params = {
			'used_dates': all_used_dates,
			'near_free_work_date': get_near_work_date(weekends, all_used_dates),
			'own_products': [],
		}
		for p_row in own_products.values():
			full_order_params['own_products'].append({
				'_id': p_row['_id'],
				'number': p_row['number'],
				'name': p_row['name'],
				'count': p_row['count'],
				'deep':  p_row['deep'],
				'completed': claculate_count_objects_maded_by_existing_parts(p_row, p_row['spec_linear_data'].values(), prepared_orders)
			})

		# получение информации о спецификациях, задействованных в заказе
		# specifications_struct = specificationmodel.get_list_by({'number': {'$in': specification_numbers.values()}}, {'number':1, 'struct':1 })
		# подготовка результата
		res['data'] = prepared_orders

		res['sorted_sectors'] = sort_sectors_in_tree(prepared_orders)
		# проставление флага соортировки учаскам
		for sector_row in sectors:
			sector_row['routine'] = res['sorted_sectors'].get(sector_row['name'],0)
		sectors.sort(key=lambda x:(x['routine']))

		# получение всех спецификаций, которые получаются раскроем
		specifications_from_templates = []
		if res['templates'] and len(res['templates'])>0:
			for template_row in res['templates']:
				for out_object_row in template_row['out_objects']:
					specifications_from_templates.append(out_object_row['_id'])

		# финальная обработка данных
		for data_row in res['data']:
			# флаг необходимости использования шаблонов раскроя для получения текущего материала
			data_row['need_templates'] = data_row['_id'] in specifications_from_templates
			data_row['use_templates'] = True
			# iss_1265. Получение информации о том, куда входит данная спецификация на первом уровне
			data_row['parents'] = esudspecificationapi.get_specification_first_level_parents(data_row['number'], [row['number'] for row in res['data'] ])
			# проставление в данных нового порядка сортировки
			if data_row.get('sector'):
				data_row['sector']['routine'] = res['sorted_sectors'].get(data_row['sector']['name'],0)
		res['data'].sort(key = lambda x: (x['sector']['routine'], x['name']))

		#res['data'].sort(key = lambda x: (x['sector']['name'], x['name']))
		res['sectors'] = sectors
		res['full_order_params'] = full_order_params
		res['weekends'] = weekends.values() # все выходные дни в году
		res['order_info'] = order # информация о заказе
		res['techno_map'] = esudspecificationapi.build_techno_map(own_products_tree)
		res['all_used_specifications'] = specifications_struct_data
		return res
	except Exception, exc:
		print('Error! Get shift task data. ' + str(exc))
		excType = exc.__class__.__name__
		print_exc()
		raise Exception(str(exc))

def get_orders_used_dates(orders_numbers):
	''''
	блок расчета всех занятых дней в рамках заказа и участка
	также рассчитывается ближайшая свободная рабочая дата
	'''
	weekends = {}
	for i in (config.db.weekends.find_one({}, {'weekends': 1}) or {}).get("weekends", []):
		weekends[i] = i

	result = {}
	# получить все сменные задания по всем найденным заказам
	shift_tasks = shifttaskmodel.get_list({'order.number': {'$in':orders_numbers}})
	# группировка сменных заданий по заказам
	shift_tasks_grouped_by_orders = {}
	for row in shift_tasks:
		if row['order']['number'] not in shift_tasks_grouped_by_orders:
			shift_tasks_grouped_by_orders[row['order']['number']] = []
		shift_tasks_grouped_by_orders[row['order']['number']].append(row)

	for order_number in shift_tasks_grouped_by_orders:
		sector_used_dates = {} # занятые даты по участкам
		all_used_dates = {} # все занятые даты в заказе

		for shift_task in shift_tasks_grouped_by_orders[order_number]:
			# получение дат задействованных в заданиях по участкам
			if not shift_task['sector']['origin_id'] in sector_used_dates:
				sector_used_dates[shift_task['sector']['origin_id']] = {'dates': {}, 'near_free_work_date': None}

			tmp_date = shift_task['date'].strftime('%Y-%m-%d')

			if tmp_date not in sector_used_dates[shift_task['sector']['origin_id']]['dates']:
				sector_used_dates[shift_task['sector']['origin_id']]['dates'][tmp_date] = []

			if tmp_date not in all_used_dates:
				all_used_dates[tmp_date] = []
			# добавление не закрытых заданий на смену по указанноому участку и дате
			sector_used_dates[shift_task['sector']['origin_id']]['dates'][tmp_date].append(shift_task['number'])
			all_used_dates[tmp_date].append(shift_task['number'])

		for sector_id in sector_used_dates:
			sector_used_dates[sector_id]['near_free_work_date'] =get_near_work_date(weekends, sector_used_dates[sector_id]['dates'])

		result[order_number] = {
			'sector_used_dates':sector_used_dates,
			'all_used_dates':all_used_dates,
		}

	return result

def get_order_by_date(search_date):
	'''
	Получение данных о сменных заданиях по дате
	'''
	from apis.esud import esudspecificationapi
	try:
		# получение информации о сменных заданияъ по дате
		data = shifttaskmodel.get_list({'date':search_date})
		specification_numbers = {} # список уникальных номеров спецификаций, задействованных в заданиях
		if not data:
			raise Exception('На указанную дату смены не найдены.')

		# получение информации о задействованных спецификациях
		for row in data:
			for item in row['items']:
				# сбор номеров спецификаций
				specification_numbers[item['number']] = item['number']

		specification_items_cache = {} # контейнер для повторяющихся спеуификаций при построении структуры
		# получение информации о спецификациях, задействованных в заказе
		specifications_struct = specificationmodel.get_list_by(
			{
				'number': {'$in': specification_numbers.values()}},
				{
					'number':1,
					'name':1,
					'deep': 1,
					'tech_process_operations': 1,
					'struct': 1,
					'first_level_items': 1,
					'include':1,
					'properties':1
			})

		specifications_struct_data = {}
		for item in specifications_struct:
			specifications_struct_data[item['number']] = item
			#specification_items_cache[str(item['_id'])] = item

		# группировка результата по участкам
		data.sort(key = lambda x: (x['date']))
		result = {
			'all_used_specifications': specifications_struct_data,
			'data': {}
		}
		# сбор номеров заказов со всех заданий
		all_orders_numbers = []
		for row in data:
			if row['order']['number'] not in all_orders_numbers:
				all_orders_numbers.append(row['order']['number'])
		# получение занятых дат по входным номерам заказов
		used_dates = get_orders_used_dates(all_orders_numbers)

		# подготовка результата
		for row in data:
			for item in row['items']:
				# пдановое время изготовления
				item['plan_execution_time'] =  get_time_execution(routine.JSONDecode(specifications_struct_data[item['number']].get('tech_process_operations'))) if specifications_struct_data[item['number']].get('tech_process_operations') else {'value': 0}
				# глубина берева
				item['deep'] = specifications_struct_data[item['number']].get('deep')
				# расчет веса на единицу объема (переделать на системное свойство)
				item['weight_per_unit'] = esudspecificationapi.get_weight(specifications_struct_data[item['number']], specification_items_cache)
			# сортировка по крупноте
			row['items'].sort(key = lambda x: (x['deep']), reverse=True)
			if row['sector']['origin_id'] not in result['data']:
				result['data'][row['sector']['origin_id']] = {
					'name': row['sector']['name'],
					'origin_id': row['sector']['origin_id'],
					'used_dates': used_dates[row['order']['number']]['sector_used_dates'][row['sector']['origin_id']].get('dates'),
					'near_free_work_date': used_dates[row['order']['number']]['sector_used_dates'][row['sector']['origin_id']].get('near_free_work_date'),
					'tasks': []
				}

			row['used_dates'] = used_dates[row['order']['number']]['sector_used_dates'][row['sector']['origin_id']].get('dates')
			row['near_free_work_date'] = used_dates[row['order']['number']]['sector_used_dates'][row['sector']['origin_id']].get('near_free_work_date')

			result['data'][row['sector']['origin_id']]['tasks'].append(row);
		result['data'] = result['data'].values()

		for row in result['data']:
			row['tasks'].sort(key = lambda x:(x['number']) )

		return result
	except Exception, exc:
		excType = exc.__class__.__name__
		print_exc()
		raise Exception(str(exc))

def get_order_by_number(number):
	'''
	Получение данных о сменном задании по номеру
	'''
	from apis.esud import esudspecificationapi
	# локальная функция получения уникальных свойств
	def get_unique_props(properties):
		result = ''
		if properties:
			for row in properties:
				if row.get('is_optional') or not row.get('is_techno'):
					result+='{0}: {1} {2}; '.format(row['name'], row['value'], row['unit'] if row.get('unit') else '')
		return result
	try:
		# получение информации о сменных заданияъ по дате
		data = shifttaskmodel.get({'number': routine.strToInt(number)})
		specification_numbers = {} # список уникальных номеров спецификаций, задействованных в задании
		if not data:
			raise Exception('Указанное сменное задание не найдено.')

		# получение информации о задействованных спецификациях в сменном задании
		for item in data['items']:
			# сбор номеров спецификаций
			specification_numbers[item['number']] = item['number']

		specification_items_cache = {} # контейнер для повторяющихся спецификаций при построении структуры
		# получение информации о спецификациях, задействованных в заказе
		specifications_struct = specificationmodel.get_list_by(
			{
				'number': {'$in': specification_numbers.values()}},
				{
					'number':1,
					'name':1,
					'deep': 1,
					'tech_process_operations': 1,
					'struct': 1,
					'first_level_items': 1,
					'include':1,
					'properties':1
			})
		specifications_struct_data = {}
		for item in specifications_struct:
			specifications_struct_data[item['number']] = item
			#specification_items_cache[str(item['_id'])] = item

		result = {
			'all_used_specifications': specifications_struct_data,
			'data': {}
		}
		for item in data['items']:
			# пдановое время изготовления
			item['plan_execution_time'] =  get_time_execution(routine.JSONDecode(specifications_struct_data[item['number']].get('tech_process_operations'))) if specifications_struct_data[item['number']].get('tech_process_operations') else {'value': 0}
			# глубина берева
			item['deep'] = specifications_struct_data[item['number']].get('deep')
			# расчет веса на единицу объема (переделать на системное свойство)
			item['weight_per_unit'] = esudspecificationapi.get_weight(specifications_struct_data[item['number']], specification_items_cache)
			item['unique_props'] = get_unique_props(item.get('properties',[]))
		data['items'].sort(key = lambda x: (x['deep']), reverse=True)
		result['data'] = data
		return result
	except Exception, exc:
		excType = exc.__class__.__name__
		print_exc()
		raise Exception(str(exc))
