#!/usr/bin/python
# -*- coding: utf-8 -*-
import datetime, time, routine
from apis.esud import esudspecificationapi, esudapi
from models import datamodel, specificationmodel, template_cache_data_model
from copy import deepcopy,copy
from traceback import print_exc
import math
from bson.objectid import ObjectId
from classes.productionorder.stockmanager import StockManager

class TemplateBuilder:
	'''
		Супер класс сбора информации о шаблонах
	'''
	_list = None # список данных ЭСУД
	_templates = None # список собранных шаблонов

	def __init__(self, list):
		'''
			Конструктор
		'''
		self._list = list
		# подготовка шаблнов
		start = time.clock()
		self._templates = self.__prepare_templates()
		print 'Time prepare templates is: ', time.clock() - start

	def __prepare_templates(self):
		'''
		Получение и сборка всех шаблонов
		'''
		def get_shifrs_and_unique_props(row):
			'''
			Функция получения из объекта ЭСУд информацию о шифрах и уникальных свойствах
			row - объект ЭСУД
			'''
			res = {
				'shifr1': '',
				'shifr2': '',
				'unique_props_str': ''
			}
			for prop_row in row.get('properties',[]):
				if prop_row.get('datalink') and str(prop_row.get('datalink')) ==str(datamodel.SYSTEM_OBJECTS['SHIFR1_PROP']):
					try:
						res['shifr1'] = prop_row['values'][0]['value']
					except:
						pass
				elif prop_row.get('datalink') and str(prop_row.get('datalink')) ==str(datamodel.SYSTEM_OBJECTS['SHIFR2_PROP']):
					try:
						res['shifr2'] = prop_row['values'][0]['value']
					except:
						pass
				if prop_row.get('is_optional') and not prop_row.get('is_techno'):
					res['unique_props_str'] += '{0} : {1}{2}; '.format(prop_row.get('name','') or '', prop_row.get('value','') or '', ' '+prop_row.get('unit','') if prop_row.get('unit','') else '')
			return res

		# попытка получить шаблоны из КЭШа
		cache_templates = template_cache_data_model.get_list()
		if len(cache_templates)>0:
			return cache_templates
		else:
			result =[]
			data_templates = []
			templates_ids= []
			# получение идентификаторов всех  объектов, с типом  = template
			for row in self._list['data']:
				if self._list['data'][row].get('type') == 'template' and self._list['data'][row].get('status','')!='del':
					templates_ids.append(self._list['data'][row]['_id'])

			full_start = time.clock()
			# сбор шаблонов в деревья
			for i in templates_ids:
				start = time.clock()
				template = esudapi.make_local_tree(self._list, i)
				esudapi.clear_tree_from_types(template, ['library'])
				if template:
					result_template = {'node': template['node'], 'children': []}
					for child in template.get('children',[]):
						if child['node'].get('status', '')!='del':
							item_count = {'value': 1, 'unit': 'шт.', 'unit_origin_id': None}
							for prop in template['node'].get('properties',[]):
								if str(prop['property_id']) == str(child['node'].get('datalink',child['node'].get('_id'))):
									item_count = {
										'value': prop.get('value',{}).get('value',1),
										'unit': prop.get('unit',{}).get('value', 'шт.'),
										'unit_origin_id': prop.get('unit',{}).get('datalink',prop.get('unit',{}).get('_id',None)),
									}

									if item_count['unit'] == None:
										item_count['unit'] = 'шт.'

							if child['node']['type'] == 'product':
								tmp_tree = esudapi.make_full_tree(self._list,child['node']['_id'], '',0, True)
								esudapi.refresh_parent_node(tmp_tree)
								tmp_product_tree =  esudspecificationapi.prepare_tree_to_specificate(self._list, tmp_tree, [], None,  [], True)
								del tmp_product_tree['models']
								#child = prepare_data_from_config_to_specification(tmp_product_tree)
								child = tmp_product_tree
								# по свойствам можно выяснить единицу измерения объема изделия

							child['count'] = item_count
							result_template['children'].append(child)
					data_templates.append(result_template)

			# приведение информации о шаблоноах к более удобному виду
			for row_template in data_templates:
				tmp_inf = {
					'_id':row_template['node']['_id'], # идентификатор шаблона
					'name':row_template['node'].get('name'), # наименование шаблона
					'in_objects':[], # список входных изделий, из которых можно получить выходные изделия
					'out_objects': [], # список выходных изделий
					'count':1,  # количество штук входного материала, для изготовления всех  выходящих изделий
					'volume': 0, # объем материала, который будет затрачен на изготовение выходных изделий
					'is_from_buy': False # раскрой из покупного изделия
				}
				#------------------------------------------
				# iss_1303
				# если в шаблоне нет объекта с признаком вход разделительной операции, то брать покупное
				# изделие из состава выходящих с шаблона изделий, иначе брать объект с признаком...
				is_have_input_product = any(i for i in row_template['children'] if i['node']['type']=='product' and i['node'].get('is_input'))
				# если входное изделие не было задано явно, то разбираем деревья всех изделий находим в их составе покупные изделия,
				# собираем все найденные покупные изделия и помещаем их в список входящих
				if not is_have_input_product:
					tmp_inf['is_from_buy'] = True
					for row_template_item in row_template['children']:
						if row_template_item['node']['type']=='product':
							key = row_template_item['node']['number']
							# если изделие покупное, то автоматически помечаем его входным
							if row_template_item['node'].get('is_buy'):
								row_template_item['node']['is_input'] = True
								tmp_inf['in_objects'].append(key)
							elif not any(i for i in tmp_inf['out_objects'] if i['key'] == key):
								if row_template_item.get('sector'):
									# добавление изделния в выходные изделия шаблона
									sector_value = row_template_item['sector'].get('value',{}) or {}
									sector = {
										'name': sector_value.get('value','Не задан'),
										'origin_id': sector_value.get('datalink','') if sector_value.get('datalink') else sector_value.get('_id',''),
										'routine': row_template_item['sector'].get('routine') if 'sector' in row_template_item and row_template_item['sector'] else 0
									}
								else:
									sector = {'name':  'Не задан', 'origin_id': '', 'routine': 0}

								#  получение информации о шифрах и уникальных свойствах объекта
								shifrs_obj = get_shifrs_and_unique_props(row_template_item)
								# формирование нового объекта
								tmp_inf['out_objects'].append({
									'key': key,
									'count': row_template_item['count']['value'],
									'_id': row_template_item['node']['_id'],
									'sector': sector,
									'name': row_template_item['node']['name'],
									'shifr1': shifrs_obj['shifr1'],
									'shifr2': shifrs_obj['shifr2'],
									'unique_props_str': shifrs_obj['unique_props_str']
								})
								# строим дерево изделия,  по дереву узнаем есть ли покупные изделия в его сосставе,
								# если есть то берем их в качестве входных
								cache_data = {}
								tree = esudapi.make_full_tree_production(self._list, row_template_item['node']['_id'],False,None,cache_data)
								esudapi.clear_tree_from_types(tree, ['library'])
								esudapi.analize_tree_model_configuration(self._list, tree, [row_template_item['node']],True,cache_data, 3)
								esudapi.refresh_parent_node(tree)
								esudspecificationapi.prepare_properties_list(tree)
								errors = []
								tree['count'] = {'unit':'шт.', 'value':row_template_item['count'], 'is_calculate': False}
								product_tree =  esudspecificationapi.prepare_tree_to_specificate(self._list, tree, [], tree['node'].get('properties'), errors, False, True)
								# получить все покупные изделия в в структуре объекта
								buy_items = esudspecificationapi.get_buy_items(product_tree)
								for buy_item in buy_items:
									key = buy_item['node']['number']
									if not key in tmp_inf['in_objects']:
										tmp_inf['in_objects'].append(key)
				else:
					# если было задано входное изделие, то формируем данные относительно этого
					for row_template_item in row_template['children']:
						if row_template_item['node']['type']=='product':
							key = row_template_item['node']['number']
							if row_template_item['node'].get('is_input'):
								tmp_inf['in_objects'].append(key)
								tmp_inf['is_from_buy'] = row_template_item['node'].get('is_buy', False)
							elif row_template_item['node']['type']=='product' and not any(i for i in tmp_inf['out_objects'] if i['key'] == key):
								if row_template_item.get('sector'):
									# добавление изделния в выходные изделия шаблона
									sector_value = row_template_item['sector'].get('value',{}) or {}
									sector = {
										'name': sector_value.get('value','Не задан'),
										'origin_id': sector_value.get('datalink','') if sector_value.get('datalink') else sector_value.get('_id',''),
										'routine': row_template_item['sector'].get('routine') if 'sector' in row_template_item and row_template_item['sector'] else 0
									}
								else:
									sector = {'name':  'Не задан', 'origin_id': '', 'routine': 0}

								#  получение информации о шифрах и уникальных свойствах объекта
								shifrs_obj = get_shifrs_and_unique_props(row_template_item)
								# формирование нового объекта
								tmp_inf['out_objects'].append({
									'key': key,
									'count': row_template_item['count']['value'],
									'_id': row_template_item['node']['_id'],
									'sector': sector,
									'name': row_template_item['node']['name'],
									'shifr1': shifrs_obj['shifr1'],
									'shifr2': shifrs_obj['shifr2'],
									'unique_props_str': shifrs_obj['unique_props_str']
								})
				#-----------------------------------------------
				result.append(tmp_inf)

			# сохранение данных в КЭШ
			template_cache_data_model.add_multy(result)
			# возврат результата
			return result

class TemplateManager:
	'''
		Супер класс управления шаблонами раскроя
	'''
	_list = None # список данных ЭСУД
	_all_specifications = None # справочник всех спецификаций, участвующих в рассчете
	_templates = None # список собранных шаблонов

	def __init__(self, list, templates, all_specifications=None):
		'''
			Конструктор
		'''
		self._list = list
		self._all_specifications = all_specifications
		# подготовка шаблнов
		start = time.clock()
		self._templates = templates
		print 'Time prepare templates is: ', time.clock() - start

	def _find_templates_for_object(self, in_object_key, out_objects_keys, only_not_from_buy = False):
		'''
		Поиск подходящих шаблонов для изготовления изделия
		in_object_key - входящее  изделие, то из чего будет делаться, может быть пустым, тогда будут браться все шаблоны, у окго на выходе
		у окго на выходе есть  хотя бы одно выходящее изделие
		out_objects_keys = [] - список артикулов изделий, которые нужно получить из входящего
		Результатом является набор шаблонов, которые имеют искомый входящий объект и
		хотя бы один искомый выходящий объект.
		Также для всех выходящих изделий помечаются шаблоны, на основе которых это изделие
		может быть изготовлено.
		only_not_from_buy - только шаблоны, которые на входе имеют не покупные материалы
		'''
		res = []
		if self._templates and len(self._templates)>0:
			for row_template in self._templates:
				# проверка на фильтр по шаблонам, которые на входе имеют не покупные изделия
				if not only_not_from_buy  or (only_not_from_buy and not row_template['is_from_buy']):
					have_in_object = False
					have_out_object = False
					if len(row_template['in_objects']) and len(row_template['out_objects'])>0:

						if not in_object_key or in_object_key in row_template['in_objects']:
							have_in_object = True
						# если входящий объект надйен, то необходимо просмотреть,
						# можно ли используя данный шаблон изготовить какие-либо из требуемых выходных изделий
						if have_in_object:
							for row_template_item in row_template['out_objects']:
								if row_template_item['key'] in out_objects_keys:
									have_out_object = True
									break
					if have_in_object and have_out_object:
						res.append(row_template)

		# проверяем, сможет ли набор всех полученных шаблонов получить на выходе требуемые объекты
		tmp_out_keys = {}
		for key in out_objects_keys:
			tmp_out_keys[key] = 1
		for i in res:
			i['out_objects'].sort(key = lambda x:(x['key']))
			for j in i['out_objects']:
				if j['key'] in tmp_out_keys:
					del tmp_out_keys[j['key']]
			if len(tmp_out_keys)==0:
				break;
		if len(tmp_out_keys)==0:
			return res
		else:
			return []


class WasteTemplateManager(TemplateManager):
	'''
		 Менеджер применения шаблонов раскроя  для изделий собственного производства
	'''
	_stock = None # складские объемы
	_calculation_result = None # результат рассчетов
	# _elems_from_cuts = None # конфиггурации, доступные от нарезки покупных изделий [{'count':10, 'out_object':{}}]
	# _items_maked_from_buy_items = None # изделия собственного производства, получаемые нарезкой из покупных

	def __init__(self, list, templates, all_specifications, stock):
		'''
			 вызов суперкласса
			 all_specifications - справочник всех спецификаций, участвующих в расчете
		'''
		# вызов конструктора суперкласса
		TemplateManager.__init__(self, list, templates, all_specifications)
		# заполнение свойств
		self._stock = stock

	def _find_templates_for_object(self, in_objects, out_object):
		'''
		Функция подбора подходящих шаблонов
		in_objects - входящие объекты, по сути отход из которого будет идти крой
		out_object - объект, который требуется получить от собственого раскроя
		'''

		result = []
		for in_row in in_objects:
			# проверяем на совместимость входящего объекта  и требуемого
			# они должны получаться из одной и тойже спецификации
			if any(i for i in out_object['first_level_items']  if i['number'] == in_row['object']['in_object']['number']):
				# получаем все темплейты, которые могут изготовить требуемое изделие
				templates = TemplateManager._find_templates_for_object(self, in_row['object']['key'], [out_object['config_number']], True)
				for tmpl_row in templates:
					tmpl_row['in_specification'] = in_row['object']['selected_specification']
					for out_tmpl_row in tmpl_row['out_objects']:
						if out_tmpl_row['key'] == out_object['config_number']:
							data_specification_info =specificationmodel.get_short({'_id': ObjectId(out_object['_id'])})[0]
							out_tmpl_row['selected_specification'] = data_specification_info
							#out_tmpl_row['selected_specification'] = deepcopy(out_object)
					result.append(tmpl_row)
		return result

	def run(self, out_objects_from_buy_templates, items_maked_from_buy_items):
		'''
			Запуск расчетов
			out_objects_from_buy_templates -  конфиггурации, доступные от нарезки покупных изделий [{'count_value':10, 'object':{}}]
			items_maked_from_buy_items - изделия собственного производства, получаемые нарезкой из покупных
		'''

		# идем по изделиям, получаемым из покупных, подыскиваем для них шаблоны собственного кроя,
		# по которым можно получить  данные изделия. В найденных шаблонах сомтрим входной элемент (из чего будет крой идти)
		tmp_specifications = {}
		for row in items_maked_from_buy_items.values():
			# row - напрмиер, заглушка получаемая из возвратного отхода
			row['own_templates'] = { 'items': [], 'can_produce':0 }
			# количество изделий(заглушек), которые требуется(осталось) изготовить
			remainig_volume = row['count']['value']
			# все шаблоны, которые могут изготовить требуемое изделие
			tmp_templates = self._find_templates_for_object(out_objects_from_buy_templates, row)
			# print('---------------------')
			# print(routine.JSONEncoder().encode(tmp_templates))
			# print('---------------------')

			if len(tmp_templates)>0:
				for template_row in tmp_templates:
					in_object_key = template_row['in_specification']['config_number']
					tmp = {
						'count_from_order': {
							'value': 0,
							'can_produce': 0,
						}, # объем, полученный в рамках выполнения заказа
						'count_from_stock': {
							'value':0,
							'items':[],
							'can_produce':0
						}, # объем на складе
						'template': template_row, # шаблон, по которому будет идти крой
						'qty': 0, # сколько раз надо применить шаблон, чтобы достичь требуемого результата
						'can_produce':  0, # объем, который можно получить используя данный шаблон
						'value':  0, # количество отхода, которое нужно затратить чтобы получить требуемы результат
						'src_item_key': template_row['in_specification']['config_number'], # исходный код материала из которого будет идти нарезка (Возвратный отход)
						'need_item_key': row['number'] # требуемый на изготовление объект (Заглушка)
					}

					# ищем с собсвтенном шаблоне, сколько требуемого изделия мы можем получить за один цикл
					# сколько заглушек можем получить из ВО1 на одном проходе
					src_vol_per_item = 0
					for out_tmpl_row in template_row.get('out_objects',[]):
						if out_tmpl_row['key'] == row['config_number']:
							src_vol_per_item = out_tmpl_row['count']
							break;

					# определяем сколько штук исходного материала (возвратного отхода)
					# трубетется чтобы изготовить требуемое количество изделий
					need_src_count = math.ceil(float(remainig_volume) / out_tmpl_row['count'])

					# in_object_key - например возвратный отход 1 (материал для нарезки)
					# необходдимо просмотреть все выходящие объекты от покупного расскроя, и посмотреть какой объем от покупного раскроя мы имеем
					# Возможна ситуация когда в рамках заказа, из одного и тогоже возвратного отхода делаются разные изделия,
					for buy_template_out_object in out_objects_from_buy_templates:
						# если набран требуемый объем, то продолжать сбор теплейтов не нужно
						if remainig_volume<=0:
							break;
						# print('--------')
						# print(in_object_key)
						# print(buy_template_out_object['object']['selected_specification']['number'])
						# print('--------')
						if in_object_key == buy_template_out_object['object']['selected_specification']['config_number']:

							# print('--------------------------')
							# print(buy_template_out_object['count_value'])
							# print(template_row['name'])
							# print(remainig_volume)
							# print(need_src_count)

							# с заказа нужно брать не больше требуемого объема отхода, остальное отправится на склад
							# если требуемый объем материала, меньше объема получаемого в рамках раскроя покупного изделия в заказе
							# то из заказа берем только требуемое количество

							# if buy_template_out_object['object']['key']=='618.288':
							# 	print('----------')
							# 	print(buy_template_out_object['count_value'])
							# 	print('----------')

							if need_src_count<=buy_template_out_object['count_value']:
								tmp['count_from_order']['value'] = need_src_count
								#tmp['count_from_order']['can_produce'] = remainig_volume
								tmp['count_from_order']['can_produce'] = need_src_count*src_vol_per_item
								# вычитаем из доступного количетсва отобранное на производство по шаблону
								buy_template_out_object['count_value']-=need_src_count
								remainig_volume = 0
								need_src_count = 0
							else:
								tmp['count_from_order']['value'] = buy_template_out_object['count_value']
								tmp['count_from_order']['can_produce'] = buy_template_out_object['count_value'] * src_vol_per_item
								remainig_volume -=  (buy_template_out_object['count_value']*src_vol_per_item)
								need_src_count = math.ceil(float(remainig_volume) / src_vol_per_item)
								# вычитаем из доступного количетсва отобранное на производство по шаблону
								buy_template_out_object['count_value'] =0

					# подсчитываем общий объем от раскроя отхода с задания и со склада
					tmp['can_produce'] = tmp['count_from_stock']['can_produce'] + tmp['count_from_order']['can_produce']
					tmp['value'] = tmp['count_from_stock']['value'] + tmp['count_from_order']['value']
					# подсчитываем сколько раз надо применить шаблон, чотбы получить требуемый результат
					tmp['qty'] = math.ceil(tmp['can_produce']/float(src_vol_per_item))

					# добавление расчетов в результирующий список
					row['own_templates']['items'].append(tmp)
					# если набран требуемый объем, то продолжать сбор теплейтов не нужно
					if remainig_volume<=0:
						break;

				# сортируем результат, сверху оказываются шаблоны по которым из производства можно взять больше объемов
				row['own_templates']['items'].sort(key = lambda x:(x['count_from_order']['can_produce']) )

				# для отобранных шаблонов, если еще требуется добравть объемов, смотрим их на складе
				# Получить объемы со склада. Проблемма в том, что в результате раскроя мы получаем не спецификации а конфигурации.
				# Склад хранит объемы именно для спецификаций. Поэтому для получения объемов со склада необходимо конфигурации
				# превратить в спецификации
				# Получаем все спецификации по конфигурации
				if remainig_volume>0:
					for new_template_row in row['own_templates']['items']:
						stock_items = []
						data_specifications_info =specificationmodel.get_list_by({'number': {'$in': [new_template_row['src_item_key']]} })
						for spec_row in data_specifications_info:
							stock_items.extend(self._stock.get(str(spec_row['_id']),[]))
						StockManager.calculate_stock_volume(new_template_row, stock_items, need_src_count)
						need_src_count -= new_template_row['count_from_stock']['value']
						new_template_row['count_from_stock']['can_produce'] = new_template_row['count_from_stock']['value'] * src_vol_per_item
						remainig_volume -= new_template_row['count_from_stock']['can_produce']
						new_template_row['can_produce'] = new_template_row['count_from_stock']['can_produce'] + new_template_row['count_from_order']['can_produce']
						new_template_row['value'] = new_template_row['count_from_stock']['value'] + new_template_row['count_from_order']['value']
						if remainig_volume<=0:
							break;


				# отсеиваем шаблоны по которым ничего произвести нельзя
				row['own_templates']['items'] = [i for i in row['own_templates']['items'] if i['can_produce']>0]

				tmp_specifications = {}
				for new_template_row in row['own_templates']['items']:
					row['own_templates']['can_produce']+=new_template_row['can_produce']

					# # В шаблонах в качестве выходных элементов отбираются конфигурации
					# # В итоговых расчетах нам необходимы спецификации.
					# # Заполнение шаблонных конфигураций спецификациями, если такие есть
					# for t_row in new_template_row['template']['out_objects']:
					# 	sps = []
					# 	if t_row['key'] not in tmp_specifications:
					# 		tmp_specifications[t_row['key']] = []
					# 		# получение спецификаций из БД
					# 		tmp_specifications[t_row['key']] = specificationmodel.get_short({'config_number': t_row['key']})
					# 	t_row['specifications'] = tmp_specifications[t_row['key']]

					# В шаблонах в качестве выходных элементов отбираются конфигурации
					# В итоговых расчетах нам необходимы спецификации.
					# Заполнение шаблонных конфигураций спецификациями, если такие есть
					for t_row in new_template_row['template']['out_objects']:
						if not t_row.get('selected_specification'):
							sps = []
							if t_row['key'] not in tmp_specifications:
								tmp_specifications[t_row['key']] = []
								# получение спецификаций из БД
								tmp_specifications[t_row['key']] = specificationmodel.get_short({'config_number': t_row['key']})
							t_row['selected_specification'] = None

							#t_row['in_object'] = {'number': row['number']}
							in_object_spec_numbers = [i['number'] for i in row['first_level_items']]
							# определяем подходящую спецификацию
							if len(tmp_specifications[t_row['key']])>0:
								for spec_row in tmp_specifications[t_row['key']]:
									if any(i for i in spec_row['first_level_items'] if i['number'] in in_object_spec_numbers):
										t_row['selected_specification'] = spec_row
										break

			# print('---------------------')
			# print(routine.JSONEncoder().encode(row))
			# print('---------------------')
		self._calculation_result = items_maked_from_buy_items.values()
		return self._calculation_result


class BuyTemplateManager(TemplateManager):
	'''
		Менеджер применения шаблонов раскроя для покупных изделий
	'''
	_minimaze_returned_waste = False  # минимизировать возвратный отход
	_minimaze_not_returned_waste = False # минимизировать не возвратный отход

	def __init__(self, list, templates, all_specifications, minimaze_returned_waste = False, minimaze_not_returned_waste = False):
		# вызов суперкласса
		TemplateManager.__init__(self, list, templates, all_specifications)
		self._minimaze_returned_waste = minimaze_returned_waste
		self._minimaze_not_returned_waste = minimaze_not_returned_waste

	def __get_template_combs(self, out_items, good_templates, vol_per_unit):
		'''
		Формирование комбинаций из шаблонов для получения требуемых выходных объектов
		out_items - то, что требуется получить от раскроя
		good_templates - список шаблонов, которые можно использовать
		vol_per_unit - объем материала, из которого будет вестись раскрой  на 1 штуку
		'''
		result = []
		def is_vectors_has_links(vector1, vector2):
			i = 0
			while i<len(vector1):
				if vector1[i]>0 and vector2[i]>0:
					return True
				i+=1
			return False

		def intersect(a, b):
			""" return the intersection of two lists """
			return list(set(a) & set(b))

		def get_matrix(vector, matrix, result):
			for item in matrix:
				if item not in result and is_vectors_has_links(vector,item):
					if vector not in result:
						result.append(vector)
					if item not in result:
						result.append(item)
					get_matrix(item, matrix, result)


		def prepare_data(vector, matrix):
			all_vectors = []
			res_matrix = []
			if len(matrix)>2:
				complete=False
				iters=0
				while not complete and iters<100:
					iters+=1
					new_matrix = []
					for item in matrix:
						if item not in all_vectors:
							new_matrix.append(item)
					t_res = []
					if new_matrix:
						if(len(new_matrix)==2):
							if is_vectors_has_links(new_matrix[0],new_matrix[1]):
								res_matrix.append(new_matrix)
								all_vectors.extend(new_matrix)
							else:
								res_matrix.append([new_matrix[0]])
								res_matrix.append([new_matrix[1]])
							complete = True
						else:
							if len(new_matrix)>1:
								get_matrix(new_matrix[0], new_matrix[1:], t_res)
								if t_res:
									res_matrix.append(t_res)
									all_vectors.extend(t_res)
								else:
									res_matrix.append([new_matrix[0]])
									all_vectors.append(new_matrix[0])
							else:
								res_matrix.append([new_matrix[0]])
								all_vectors.append(new_matrix[0])
								complete = True
					else:
						complete = True
			else:
				res_matrix.append(matrix)

			# подготовка комбинаций
			combs = []
			for matrix in res_matrix:
				t_matrix = matrix
				comb = {'templates': t_matrix, 'vector': [0] * len(vector)}
				combs.append(comb)
				#tmp_template = []
				tmp_template = [0] * len(vector)
				for i in t_matrix:
					tmp_template = [x + y for x, y in zip(tmp_template, i)]
				i=0
				for item in tmp_template:
					if item:
						comb['vector'][i] = vector[i]
					i+=1
			return combs

		def extract(obj, template):
			i=0
			is_changed = False
			while i<len(obj):
				if obj[i]>0 and template[i]>0:
					is_changed = True
				i+=1
			if is_changed:
				i=0
				while i<len(obj):
					obj[i]-=template[i]
					i+=1
			return is_changed

		def is_full(obj):
			for i in obj:
				if i>0:
					return False
			return True

		def finddata(obj, templates, start_index, local_res, result):
			if len(result)>1000:
				return
			i=start_index
			while i<len(templates):
				obj_cpy = deepcopy(obj)
				local_res_cpy = deepcopy(local_res)
				local_res_cpy.append(i)
				t = templates[i]
				if extract(obj_cpy,t):
					if is_full(obj_cpy):
						result.append(local_res_cpy)
					else:
						finddata(obj_cpy,templates,i,local_res_cpy,result)
				i+=1

		# Отбор оптимальных комбинаций
		def get_optimal(result, vol_per_unit, templates,templates_volumes,minimaze_returned_waste = False, minimaze_not_returned_waste = False):

			def comparator(a,b):
				if len(a)>len(b):
					return 1
				if len(a)<len(b):
					return -1

				if minimaze_not_returned_waste:
					# считаем объем для а и для b:
					va = 0
					vb = 0
					for ia in a:
						va+=(vol_per_unit-templates_volumes[ia])
					for ib in b:
						vb+=(vol_per_unit-templates_volumes[ib])

					if va>vb:
						return 1
					if va<vb:
						return -1
				if minimaze_returned_waste:
					# считаем объем для а и для b:
					va = 0
					vb = 0
					for ia in a:
						va+=templates_volumes[ia]
					for ib in b:
						vb+=templates_volumes[ib]
					'''
						по сути тут считаеся полный объем сделанных деталей. учитывая, что сделанные детали - это некая константа, то мы можем утверждать, что разницы возвратных отходов
						напрямую зависит от размера общего объема (размер общего объема минус объем требуемых деталей)
					'''
					if va>vb:
						return 1
					if va<vb:
						return -1
				return 0
			result.sort(cmp=comparator)
			return result[:1]

		# метод подбирает оптимальное сочетание шаблонов из предоставленного списка шаблонов
		def calc_optimized_combs(optimized_result, koef):
			# собираем возможные варианты шаблонов
			result = []
			for r_r in optimized_result:
				res_list = {}
				for r in r_r:
					if r not in res_list:
						res_list[r] = 1
					else:
						res_list[r] = res_list[r]+1
				res_tmpl = []
				for r in res_list:
					ind = math.ceil(res_list[r]*koef)
					while ind:
						res_tmpl.append(r)
						ind-=1
				result.append(res_tmpl)
			return result


		def remove_unused_templates(result, templates, out_items_vector):
			'''
				Функция оптимизации результата, отсеивание лишних  итераций из результата
			'''
			all_data = [0]*len(out_items_vector)
			for t in result:
				i=0
				while i<len(all_data):
					all_data[i]+=templates[t][i]
					i+=1
			used_result = []
			j = 0
			while j<len(result):
				i=0
				r = result[j]
				can_remove = True
				while i<len(all_data) and can_remove:
					if out_items_vector[i]>(all_data[i]-templates[r][i]):
						can_remove = False
					i+=1
				if not can_remove:
					while(j<len(result) and result[j]==r):
						used_result.append(r)
						j+=1
				else:
					i=0
					while i<len(all_data):
						all_data[i]-=templates[r][i]
						i+=1
					j+=1
			return used_result


		# подготовка данных
		# оставить среди элементов шаблона только те, которые участвуют
		# в формировании результата
		templates_vectors = []
		out_items_vector = []
		for i in out_items:
			out_items_vector.append(i['key'])
		for i in good_templates:
			tmp_vector = [0] * len(out_items)
			for j in i['out_objects']:
				if j['key'] in out_items_vector:
					tmp_vector[out_items_vector.index(j['key'])] = j['count']
			#if tmp_vector not in templates_vectors:
			templates_vectors.append(tmp_vector)

		out_items_vector = []
		for i in out_items:
			out_items_vector.append(i['count'])

		# для оптимизации делаем следующее:
		# 1. сокращаем требуемые к выполнению детали по минимальному коэф. разницы с шаблонами
		# 2. Находим нужные шаблоны для комбинации
		# 3. Выбираем среди найденных шаблонов наиболее оптимальную комбинацию
		k = 0
		if templates_vectors:
			# находим список максимальных значений элементов в шаблонах
			sm_vector = None
			for t in templates_vectors:
				if not sm_vector:
					sm_vector = copy(t)
				else:
					i=0
					while i<len(t):
						sm_vector[i] = max(sm_vector[i],t[i])
						i+=1

			# считаем коэф. по кол-ву деталей, выбираем наименьшией
			i=0
			while i<len(sm_vector):
				k_tmp = (float(out_items_vector[i]))/(float(sm_vector[i])) if sm_vector[i] else 0
				if k_tmp>0 and (k==0 or k_tmp<k):
					k = k_tmp
				i+=1

		optimize_out_items_vector = out_items_vector if k<=1 else [ math.ceil(x / k) for x in out_items_vector]

		# ищем комбинации
		combs = prepare_data(optimize_out_items_vector, templates_vectors)

		# print('###########')
		# print(optimize_out_items_vector)
		# print('--')
		# print(out_items_vector)
		# print('---')
		# print(combs)
		# print('###########')


		data_res =  []
		for i in combs:
			index = 0
			result = []
			finddata(i['vector'],i['templates'],0,[],result)

			# формируем вектор объемов для шаблонов
			templates_volumes = []
			for t in i['templates']:
				templates_volumes.append(good_templates[templates_vectors.index(t)].get('volume'))

			opt = get_optimal(result,vol_per_unit, i['templates'], templates_volumes, self._minimaze_returned_waste, self._minimaze_not_returned_waste)[:1]
			opt = opt if k<=1 else calc_optimized_combs(opt, k)
			#opt = get_optimal(result, i['templates'])
			decoded_res = []
			for r_template in opt:
				for r_item in r_template:
					decoded_res.append(templates_vectors.index(i['templates'][r_item]))
			data_res.extend(decoded_res)
		data_res.sort()
		data_res = remove_unused_templates(data_res, templates_vectors, out_items_vector)
		return [data_res]

	def __get_model_items(self, model, group, result):
		'''
		Функция получения изделий в моделе спецификации
		'''
		if model.get('is_techno_group'):
			for cm in model.get('models',[]):
				group.append({
						'name': model['node']['name'],
						'origin_id': model['node'].get('datalink',model['node'].get('unit_id'))
					})
				self.__get_model_items(cm, group, result)
		else:
			for p in model.get('items',[]):
				p['group'] = group
				result.append(p)

	def __calculate_data(self, row, origin_specification_row):
		'''
		Подсчет требуемого объема материала в штуках, а также подсчет объема на закупку
		'''
		vol_full = 0 # объем на закупку
		vol_amount = 0 # количество материала в штуках
		# если применен шаблон раскроя, то
		if 'templates_combs' in row and row['templates_combs']:
			# чистый требуемый объем материала от комбинации раскроя
			vol_full = row['templates_combs']['volume']
			vol_per_unit = row['elem'].get('vol_per_unit', {})
			if not vol_per_unit.get('value') and str(vol_per_unit.get('unit_origin_id',''))== str(datamodel.SYSTEM_OBJECTS['PIECE_VAL']):
					vol_per_unit['value'] = 1
			else:
				vol_per_unit['value'] = routine.strToFloat(vol_per_unit.get('value',1))
			#----iss_596------------------------------------------------------------------------------------------
			vol_per_unit = vol_per_unit['value']
			#--- вернули старый алгоритм расчета количества по результату переписки от 10.12.2015 12:50
			vol_full_by_norms = vol_full # расход по нормам(чистый расход)
			# vol_full_by_norms = routine.ceil(vol_full_by_norms/vol_per_unit)*vol_per_unit
			vol_amount = row['templates_combs']['final_material_count']
			vol_full = row['templates_combs']['final_material_count'] * vol_per_unit
			#-----
			vol_full_waste = 0 # общий отходов
			vol_returned_waste = 0 # возвратный отход
			vol_not_returned_waste = 0 # невозвратный отход
			vol_not_defined_waste = 0 # неопределенный отход
			vol_not_returned_waste = vol_full -  vol_full_by_norms # объем потребности минус чистый расход
			vol_full_waste =vol_full -  vol_full_by_norms
			vol_returned_waste = vol_full_waste - vol_not_returned_waste
			vol_not_defined_waste = vol_full_waste - vol_not_returned_waste

			# 893 - Учет допусков на объем---------------------------------------------------------------------------------------------------------------
			# в рассчете участвует - origin_specification_row, хранит оригинальную информацию о спецификации. Необходимо
			# чтобы получить все оригинальные переметры спецификации
			# заданное значение невозвратных потерь и отходов
			vol_tolerance = 0
			# допуск на объем (допуск на потери)
			tolerance_on_vol = 0
			# коэффициент применения допуска. Вычисляется из объема допуска и допуска на объем
			tolerance_koef = 1
			vol_tolerance = routine.strToFloat((origin_specification_row['vol_tolerance'].get('value',0) or 0))
			tolerance_on_vol = routine.strToFloat((origin_specification_row['tolerance_on_vol'].get('value',0) or 0))
			if vol_tolerance>0 and tolerance_on_vol>0:
				tolerance_koef = math.trunc(vol_full / tolerance_on_vol)
				vol_tolerance = vol_tolerance*tolerance_koef
			vol_full+=vol_tolerance
			#-----------------------------------------------------------------------------------------------------------------------------------------------------------------
			row['elem']['count']['value'] = vol_full_by_norms
			row['elem']['vol_amount'] = vol_amount
			row['elem']['vol_full'] = vol_full
			row['elem']['vol_not_returned_waste'] = vol_not_returned_waste
			row['elem']['vol_full_waste'] = vol_full_waste
			row['elem']['vol_returned_waste'] = vol_returned_waste
			row['elem']['vol_not_defined_waste'] = 0

	def apply_templates(self, row):
		'''
		Применение шаблонов к расчетам
		row - требуемое изделие
		'''

		# Поиск среди покупных изделий, тех к кому применяются делительные операции
		# для этого смотрим все объекты, для изготовления которых требуется текущее
		# покупное изделие, и если среди найденных объектов есть делительные операции,
		# то помечаем их для дальнейшего подбора и применения шаблонов нарезки

		# спецификации сгруппированные по артиклам конфигураций
		tmp_specifications = {}
		#изделия которые получаютя путем нарезки
		out_items = []
		try:
			# сбор выходных объектов, которые необходимо изготовить путем нарезки
			for item in row['items']:
				if item['is_separate'] and item['count_to_produce']['value']>0 :
					out_items.append(item)

			# формирование комбинаций из реальных объектов - шаблонов
			result_template_combs = []
			if len(out_items)>0:
				out_items_ids = []
				# подготовка информации о требуемых выходных изделиях
				for row_item in out_items:
					# volume - объем на 1 шт материала из которого будет изготавливаться изделие
					#print(routine.JSONEncoder().encode(row_item))
					out_items_ids.append({
						'spec_key': row_item['number'],
						'key': row_item['config_number'],
						'count': row_item['count_to_produce']['value'],
						'vol_per_unit': row_item['vol_bynorm']/row_item['count_to_produce']['value']
					})
				# ключ входного объекта
				in_object_key =  row['elem']['config_number']
				good_templates = self._find_templates_for_object(in_object_key, [tmp['key'] for tmp in out_items_ids])

				# подсчет общего объема материала, который необходимо затратить для производства требуемых изделий
				# для каждого шаблона
				cache_data = {}
				for template in good_templates:
					vol_full = 0
					for out_item in template['out_objects']:
						out_item_node = self._list['data'].get(out_item['_id'])
						tree = esudapi.make_full_tree_production(self._list, out_item['_id'],False,None,cache_data)
						esudapi.clear_tree_from_types(tree, ['library'])
						esudapi.analize_tree_model_configuration(self._list, tree, [out_item_node],True,cache_data, 3 )
						esudapi.refresh_parent_node(tree)
						esudspecificationapi.prepare_properties_list(tree)
						errors = []
						tree['count'] = {'unit':'шт.', 'value':out_item['count'], 'is_calculate': False}
						product_tree =  esudspecificationapi.prepare_tree_to_specificate(self._list, tree, [], tree['node'].get('properties'), errors, False, True)
						# сбор сведений, сколько уходит чистого объема нашего материала  для изготовления текущего изделия
						# для этого в структуре изделия находим наш материал
						for model in product_tree.get('models',[]):
							items = []
							self.__get_model_items(model, [], items)
							if items and len(items)>0:
								for item in items:
									if item['node'].get('number') == row['elem']['config_number']:
										vol_full+= routine.strToFloat(item['count'].get('value',1))
					template['volume'] = vol_full

				# сортировка элементов
				out_items_ids.sort(key = lambda x:(x['key']))
				# подбор оптимальных комбинаций шаблонов
				vol_per_unit = (routine.strToFloat(row['elem'].get('vol_per_unit', {}).get('value', 1)) or 1) # объем на одну штуку материала
				template_combs = self.__get_template_combs(out_items_ids, good_templates, vol_per_unit)

				# print('---------------------')
				# print(out_items_ids)
				# print('###')
				# print(routine.JSONEncoder().encode(good_templates))
				# print('###')
				# print(routine.JSONEncoder().encode(template_combs))
				# print('---------------------')

				if len(template_combs)>0 and any(i for i in template_combs if len(i)>0):
					for i in template_combs:
						tmp_comb = {}
						res_comb = {'templates':[], '_id': str(ObjectId()), 'final_material_count':0, 'unit': row['elem']['count']['unit'], 'volume': 0}
						for j in i:
							if not j in tmp_comb:
								tmp_comb[j] = 0
							tmp_comb[j]+=1

						for j in tmp_comb:
							res_comb['templates'].append({'template': good_templates[j], 'qty': tmp_comb[j]})
							res_comb['final_material_count']+=tmp_comb[j]
							res_comb['volume']+=good_templates[j]['volume'] * tmp_comb[j]

							# В шаблонах в качестве выходных элементов отбираются конфигурации
							# В итоговых расчетах нам необходимы спецификации.
							# Заполнение шаблонных конфигураций спецификациями, если такие есть
							for t_row in good_templates[j]['out_objects']:
								sps = []
								if t_row['key'] not in tmp_specifications:
									tmp_specifications[t_row['key']] = []
									# получение спецификаций из БД
									tmp_specifications[t_row['key']] = specificationmodel.get_short({'config_number': t_row['key']})

								#t_row['specifications'] = tmp_specifications[t_row['key']]
								t_row['selected_specification'] = None
								t_row['in_object'] = {'number': row['elem']['number']}

								# определяем подходящую спецификацию
								if len(tmp_specifications[t_row['key']])>0:

									# первым шагом смотрим, что кроилось в рамках задания, возможно требуемая спецификация шла по заданию
									# тогда просто берем ее номер
									spec_number = None
									try:
										spec_number = (i for i in out_items_ids if i["key"] == t_row['key']).next()['spec_key']
									except:
										pass
									if spec_number:
										t_row['selected_specification'] = (i for i in tmp_specifications[t_row['key']] if i['number'] == spec_number).next()
									else:
										for spec_row in tmp_specifications[t_row['key']]:
											if any(i for i in spec_row['first_level_items'] if i['number']==t_row['in_object']['number']):
												t_row['selected_specification'] = spec_row
												break

							good_templates[j]['in_object'] = {'number': row['elem']['number']}

						result_template_combs.append(res_comb)
					result_template_combs.sort(key=lambda x:(x['final_material_count']))

				row['templates_combs'] = result_template_combs[0] if len(result_template_combs)>0 else None

				# пересчет требуемого количества, используя шаблоны раскроя
				# если шаблоны не заданы, то считается объем по входящим изделиям
				self.__calculate_data(row, self._all_specifications[str(row['elem']['_id'])])

		except Exception, exc:
			print('Error! Template calculation.' + str(exc))
			excType = exc.__class__.__name__
			print_exc()
			pass
		return row

