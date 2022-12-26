#!/usr/bin/python
# -*- coding: utf-8 -*-
import datetime, time, routine
from apis.esud import esudspecificationapi, esudapi
from models import datamodel, specificationmodel
from copy import deepcopy,copy
import math
from bson.objectid import ObjectId
from classes.productionorder.templatemanager import *
from classes.productionorder.stockmanager import *
from traceback import print_exc


class BuyCalculator:
	'''
		Класс для вычисления потребности покупных изделий в рамках расчета
	'''
	_list = None # список данных ЭСУД
	_all_specs_short_info = None # справочник всех спецификаций, участвующих в рассчете
	_elems_to_calculate = None # список спецификаций, переданных на вход рассчета
	_grouped_stock_items = None # сгруппированные по спецификациям складские объемы
	_stock = None # складские объемы
	_templateManager = None # объект управления темплейтами - TemplateManager class
	_use_cut_templates = False # использовать шаблоны раскроя
	_use_returned_waste = False # использовать возвратный отход при расчетах
	_use_not_returned_waste = False # использовать не возвратный отход при расчетах
	#------------------------
	own_items_maked_from_buy_items = None # изделия собственного производства сгруппированные по покпным
	calculated_tree = None # результат рассчета

	def __init__(self, list, templateManager, all_specs_short_info, elems_to_calculate, grouped_stock_items = None, use_cut_templates = False, use_returned_waste = False, use_not_returned_waste = False):
		self._list = list
		self._all_specs_short_info = all_specs_short_info
		self._elems_to_calculate = elems_to_calculate
		self._stock = grouped_stock_items
		self._use_cut_templates = use_cut_templates
		self._use_returned_waste = use_returned_waste
		self._use_not_returned_waste = use_not_returned_waste
		# объект управления шаблонами раскроя
		self._templateManager = templateManager

	def __recalculate_count_value(self, elem, minus_vol):
		'''
		пересчет объемов по всему дереву вниз
		minus_vol - объем на который надо уменьшить
		'''
		for child in elem.get('items',[]):
			# объем на единицу родителя
			vol_per_unit = routine.strToFloat(child['count']['value']) / routine.strToFloat(elem['count']['origin_value'])
			child['count']['origin_value'] = child['count']['value']
			child['count']['value'] = routine.strToFloat(child['count']['value']) - (vol_per_unit * minus_vol)
			self.__recalculate_count_value(child, (vol_per_unit * minus_vol))

	def __apply_stock(self, elem):
		'''
			функция применения склада по всему дереву изделия
		'''
		if not elem['is_buy']:
			elem['count_from_stock'] = {'value': 0, 'items': []}
			elem['count_to_produce'] = {'value': elem['count']['value']}
			if elem['count_to_produce']['value']>0:
				StockManager.calculate_stock_volume(elem, self._stock.get(str(elem['_id']),[]), elem['count']['value'])
				elem['count_to_produce']['value'] = elem['count']['value']-elem['count_from_stock']['value']
				# если применили склад, то необходимо уменьшить требуемые объемы вниз по дереву
				if elem['count_to_produce']['value'] != elem['count']['value']:
					elem['count']['origin_value'] = elem['count']['value']
					self.__recalculate_count_value(elem, elem['count_from_stock']['value'])
				for child in elem.get('items',[]):
					self.__apply_stock(child)
			else:
				elem['items'] = []

	def __recalculate_with_waste_volumes(self, elem, waste_volumes):
		'''
			Пересчет объемов с рассчетами от отходов
			elem - объект на пересчет
			waste_volumes - объемы, которые можно сделать из отходов
			waste_volumes = {'618.278.001': 30, '618.278.002': 40} - можно произвести из возвратного отхода
		'''
		if waste_volumes:
			# если элемент есть среди тех. кого можно получить из отходов
			if elem.get('count_to_produce') and elem['count_to_produce']['value']>0 and elem['number'] in waste_volumes and waste_volumes[elem['number']]>0:
				# print('------------------')
				# print(elem['number'])
				# print(elem['count_to_produce']['value'])
				# print(waste_volumes[elem['number']])
				# print('------------------')

				if elem['count_to_produce']['value']<=waste_volumes[elem['number']]:
					#  если требуется изготовить меньший объем, чем имеем с возвратного отхода
					waste_volumes[elem['number']]-=elem['count_to_produce']['value']
					elem['count_to_produce']['value'] = 0
					elem['items'] = []
				else:
					# если требуется больше чем может предоставить возвратный отход
					elem['count_to_produce']['value'] -= waste_volumes[elem['number']]
					waste_volumes[elem['number']]=0
					# если уменьшили требуемый объем, то необходимо уменьшить все объемы вниз по дереву
					if elem['count_to_produce']['value'] != elem['count']['value']:
						elem['count']['origin_value'] = elem['count']['value']
						self.__recalculate_count_value(elem, waste_volumes[elem['number']])

			# запуск рекурсии
			for child in elem.get('items',[]):
				self.__recalculate_with_waste_volumes(child, waste_volumes)

	def __claculate_vol_tolerance(self, child_row, parent_row=None):
		'''
			Расчет невозвратных потерь и отходов, заданных в структуре (объем допуска и допуск на объем)
		'''
		# заданное значение невозвратных потерь и отходов
		vol_tolerance = 0
		# допуск на объем (допуск на потери)
		tolerance_on_vol = 0
		# коэффициент применения допуска. Вычисляется из объема допуска и допуска на объем
		tolerance_koef = 1
		# объем на 1 штуку, может быть пустой. Если пустой то берется чистый объем и штуки не рассчитываются
		vol_per_unit = None
		# количество штук
		vol_amount = 0
		# Объем по нормам на 1 штуку изготавливаемого изделия
		parent_count = routine.strToFloat(parent_row['count']['value']) if parent_row else 1
		vol_bynorm = routine.strToFloat(child_row['count']['value']) / parent_count

		# если задан, объем допуска, то получаем его
		if child_row.get('vol_tolerance'):
			vol_tolerance = routine.strToFloat(child_row['vol_tolerance'].get('value',0))
			if vol_tolerance>0 and str(child_row['vol_tolerance'].get('unit_origin_id','')) == str(datamodel.SYSTEM_OBJECTS['PERCENT_UNIT']):
				vol_tolerance =   vol_bynorm*vol_tolerance/100

		# если задан, допуск на объем, то расчитываем коэффициент, сколько раз необходимо применить объем допуска
		if child_row.get('tolerance_on_vol'):
			#---iss_587-------------------------------------------------------
			# если допуск на объем = 0, то объем допуска никогда не прмиеняется.
			# если допуск на объем = любое значение, то объем допуска применяется всегда
			if str(child_row['tolerance_on_vol'].get('value_origin_id','')) != str(datamodel.SYSTEM_OBJECTS['ANY_VAL']):
				tolerance_on_vol = routine.strToFloat(child_row['tolerance_on_vol'].get('value',0))
				if tolerance_on_vol>0:
					if vol_bynorm<tolerance_on_vol:
						vol_tolerance = 0
					else:
						tolerance_koef = math.trunc(vol_bynorm / tolerance_on_vol)
						vol_tolerance = vol_tolerance*tolerance_koef
				else:
					vol_tolerance = 0
		else:
			vol_tolerance = 0

		# если объем допуска (невозвратный отход) измеряется в штуках и получается не целое число, то округляем до целого в большую сторону
		if str(child_row['count'].get('unit_origin_id',''))== str(datamodel.SYSTEM_OBJECTS['PIECE_VAL']):
			vol_tolerance = math.ceil(vol_tolerance)

		# возврат пересчитанного объема невозвратных потерь
		return vol_tolerance

	def __run_calculate_own_items_maked_from_buy_items(self, elem, parents, result):
		'''
			функция выполнения расчета и группировки изделий
		'''
		new_parents = copy(parents)
		new_parents.append(elem)
		# отбор всех покупных изделий и добавление им в детей объектов, которые необходимо изготовить
		if elem['is_buy']:
			# если требуется подсчет покупных объемов для изготавливаемых изделий
			# то продолжаем вычисления
			if not elem['number'] in result:
				tmp_elem = deepcopy(elem)
				tmp_elem['parent_sector'] = parents[len(parents)-1]['sector']  if len(parents)>0  else None
				if tmp_elem.get('items'):
					del tmp_elem['items']
				result[elem['number']] = {'elem': tmp_elem, 'items': []}
			else:
				result[elem['number']]['elem']['count']['value']+=elem['count']['value']

			# отбор объектов, которые необходимо изготовить на основе покупного объекта
			if len(parents)>0:
				parent_elem = parents[len(parents)-1]
				have_parent_in_list = False
				tmp_parent_elem = deepcopy(parent_elem)
				tmp_parent_elem['parent_sector']= parents[len(parents)-1]['sector']  if len(parents)>1  else None
				tmp_parent_elem['vol_amount'] = 0 # количество  в штуках
				tmp_parent_elem['vol_full'] = 0 # объем на закупку
				tmp_parent_elem['vol_bynorm'] = 0 # объем по нормам
				if tmp_parent_elem.get('items'):
					del tmp_parent_elem['items']
				# количество штук
				vol_amount = 0
				# объем всего (на закупку)
				vol_full = 0


				# вычисление объемов и допусков для элементов, для которых нет разделительной операции
				# результат записывается в объекты изделий, для которых необходимы указанные покупные изделия
				if tmp_parent_elem['count_to_produce']['value']>0:


					# объем допуска (невозвратный отход)
					vol_tolerance = self.__claculate_vol_tolerance(elem, tmp_parent_elem)
					# объем на 1 штуку, может быть пустой. Если пустой то берется чистый объем и штуки не рассчитываются
					vol_per_unit = None
					vol_per_unit = elem.get('vol_per_unit', {})
					#----iss_596------------------------------------------------------------------------------------------
					# объем на закупку
					vol_full = routine.strToFloat(elem['count']['value']) + (vol_tolerance * routine.strToFloat(tmp_parent_elem['count']['value']))
					# количество штук, считаем если только задан объем на 1шт.
					if vol_per_unit.get('value'):
						vol_amount = vol_full/(routine.strToFloat(vol_per_unit.get('value', 1)) or 1)
					# занесение расчетов в результат
					tmp_parent_elem['vol_amount'] = vol_amount # количество в штуках
					tmp_parent_elem['vol_full'] = vol_full # объем всего(на закупку)

					# -------------------------------------------------------------------------------
					# проверяем, нет ли уже такого parent  в списке изготваливаемых изделий
					# если parent есть, то необходимо сложить их количества
					# данная проверка необходима на тот слуяай, если напрмиер из листа метала можно сделать
					# 3 пенька, но эти пеньки отличаются по параметрам и необходимы для разных изделий
					# а по идентификатору они одинаковые
					# --------------------------------------------------------------------------------
					for row in result[elem['number']]['items']:
						if row['number'] == tmp_parent_elem['number']:
							row['vol_bynorm']+=routine.strToFloat(elem['count']['value'])
							row['count']['value']+=tmp_parent_elem['count']['value']
							row['count_from_stock']['value']+=tmp_parent_elem['count_from_stock']['value']
							row['count_from_stock']['items'].extend(tmp_parent_elem['count_from_stock']['items'])
							row['count_to_produce']['value']+=tmp_parent_elem['count_to_produce']['value']
							row['vol_amount'] += vol_amount # количество в штуках
							row['vol_full'] += vol_full # объем всего(на закупку)
							have_parent_in_list = True
							break

				if not have_parent_in_list:
					# суммируем объемы по нормам для элементов- родителей покупных
					tmp_parent_elem['vol_bynorm'] = routine.strToFloat(elem['count']['value'])
					# добавление в покупной объет, очередного элемента в котором требуется данное покупное
					# если только в списке еще нет такого
					result[elem['number']]['items'].append(tmp_parent_elem)

		for child in elem.get('items',[]):
			self.__run_calculate_own_items_maked_from_buy_items(child, new_parents, result)

	def __calculate_own_items_maked_from_buy_items(self, can_produce_from_waste=None):
		'''
			Функция получения и подсчета требуемого объема покупных изделий,
			из которых изготваливаются собственные изделия
			Ведется группировка данных по покупным изделиям, с включением того,
			что необходимо изготовить на основе этих покупных изделий.
			Результат - список покупных изделий, содержащих изделия собственного производства
			 [{
				'number': '',
				'elem': {},
				'items': [{
					'parent_sector': {},
					'vol_amount': 0,
					'vol_full': 0,
					'vol_bynorm': 0,
				}]
			}]
			can_produce_from_waste = {'618.278.001': 30, '618.278.002': 40} - можно произвести из возвратного отхода
		'''
		tmp_calculated_tree = {}
		# расчет для всех заданных элементов
		for elem in self._elems_to_calculate:
			if elem['count_to_produce']['value']>0:
				# применение склада к входящим данным
				# self.__apply_stock(elem)

				# пересчет объемов с учетом того, что можно изготовить из отходов
				self.__recalculate_with_waste_volumes(elem, can_produce_from_waste)

				# запуск основного расчета объемов
				self.__run_calculate_own_items_maked_from_buy_items(elem, [], tmp_calculated_tree)
		# возврат результата
		self.own_items_maked_from_buy_items = tmp_calculated_tree.values()
		return self.own_items_maked_from_buy_items


	def run(self, can_produce_from_waste=None):
		'''
		Основная функция расчета объемов покупных изделий
		Здесь же ведется проверка на необходимость нарезки покупного изделия и
		ведется подсчет количества необходимых покупных изделий без применения нарезки по наминалу
		Также для изделий собственного производства применяется склад.
		Также просиходит применение шаблонов раскроя для изделий, получаемых путем нарезки.
		can_produce_from_waste - изделия, которые могут быть сделаны из отходов, для таких изделий уменьшаем объемы в рассчете
		can_produce_from_waste = {'618.278.001': 30, '618.278.002': 40}
		'''

		# рассчет и группировка собственных изделий по покупным
		tmp_calculated_tree = self.__calculate_own_items_maked_from_buy_items(can_produce_from_waste)


		# 31/12/2015 Доработка по которой, если среди списка изделий получаемых из покупного изделия, часть получается
		# путем раскроя, а другая часть получается не раскроем, то необходимо применить шаблоны раскроя к требуемым изделиям
		# полученный результат необходимо сложить
		calculated_tree = []
		for row in tmp_calculated_tree:
			# применение шаблонов раскроя
			have_templates = False
			if self._use_cut_templates:
				templated_row = self._templateManager.apply_templates(deepcopy(row))
			else:
				templated_row =deepcopy(row)

			# помечаем, если подобрана комбинация шаблонов
			if templated_row.get('templates_combs'):
				have_templates = True
			# подсчет итоговых объемов на закупку
			vol_full = 0 # объем на закупку
			vol_amount = 0 # количество материала в штуках
			vol_full_waste = 0 # полный отход
			vol_returned_waste = 0 # возвратный отход
			vol_not_returned_waste = 0 # невозвратный отход
			vol_not_defined_waste = 0 # неопределенный  отход
			# Проверка требуемых изделий собственного производства на складе.
			# Подсчет финальных объемов
			if len(row['items'])>0:
				for item in row['items']:
					# если подобраны шаблоны раскроя, то изделия получаемые нарезкой по шаблонам учитывать не нужно
					# объемы по таким изделиям будут взяты из раскроя
					if not have_templates or not item['is_separate']:
						if item.get('vol_amount'):
							vol_amount+= item['vol_amount']
						if item.get('vol_full'):
							vol_full+=item['vol_full']
			else:
				vol_full = row['elem']['count']['value']

			# (если нет изделий получаемых от раскроя или нет шаблонов раскроя) и объем не пустой
			if vol_full>0:
				#----iss_596------------------------------------------------------------------------------------------
				# округление полного объема согласно кратности объема на 1 шт.
				vol_full_by_norms = vol_full
				if row['elem'].get('vol_per_unit') and routine.strToFloat(row['elem'].get('vol_per_unit', {}).get('value',0))>0:
					vol_per_unit = routine.strToFloat(row['elem'].get('vol_per_unit', {}).get('value',0))
					if vol_full<vol_per_unit:
						vol_full = vol_per_unit
						vol_amount = 1
					elif vol_per_unit>0:
						vol_full = routine.ceil(vol_full/vol_per_unit)*vol_per_unit
						vol_amount = vol_full/vol_per_unit
				else:
					vol_amount = 0

				# подсчет общих отходов
				elem_count_value = routine.strToFloat(row['elem']['count']['value']) if not have_templates else routine.strToFloat(row['elem']['count']['value']) - routine.strToFloat(templated_row['elem']['count']['value'])
				vol_full_waste = vol_full -  elem_count_value
				vol_not_returned_waste = vol_full_by_norms -  elem_count_value
				vol_not_defined_waste = vol_full_waste - vol_not_returned_waste
				vol_returned_waste = vol_full_waste - vol_not_returned_waste
				# если единицы измерения = шт., то присваиваем количеству требуемый объем
				if not vol_amount and str(row['elem']['count'].get('unit_origin_id',''))== str(datamodel.SYSTEM_OBJECTS['PIECE_VAL']):
					vol_amount = vol_full
				#---------------------------------------------------------------------------------------------------------

				# if row['elem']['config_number'] == "017.003":
				# 	print('_______')
				# 	print('vol_full_by_norms = {0}'.format(str(vol_full_by_norms)))
				# 	print('vol_full = {0}'.format(str(vol_full)))
				# 	print('count = {0}'.format(str(row['elem']['count']['value'])))
				# 	print('_______')

				# финальные объемы покупного изделия
				row['elem']['vol_amount'] = vol_amount
				row['elem']['vol_full'] = vol_full
				row['elem']['vol_full_waste'] = vol_full_waste
				row['elem']['vol_returned_waste'] = vol_returned_waste
				row['elem']['vol_not_returned_waste'] = vol_not_returned_waste
				row['elem']['vol_not_defined_waste'] = vol_not_defined_waste
				# прибавляем объемы от раскроя, если были подобраны шаблоны
				if have_templates:
					row['elem']['vol_amount'] += templated_row['elem']['vol_amount']
					row['elem']['vol_full'] += templated_row['elem']['vol_full']
					row['elem']['vol_full_waste'] += templated_row['elem']['vol_full_waste']
					row['elem']['vol_returned_waste'] += templated_row['elem']['vol_returned_waste']
					row['elem']['vol_not_returned_waste'] += templated_row['elem']['vol_not_returned_waste']
					row['elem']['vol_not_defined_waste'] += templated_row['elem']['vol_not_defined_waste']
					row['templates_combs'] = templated_row.get('templates_combs')
				calculated_tree.append(row)
			else:
				calculated_tree.append(templated_row)

		calculated_tree.sort(key = lambda x:(x['elem']['number']))

		# применение склада к итоговым объемам на закупку
		for row in calculated_tree:
			row['elem']['count_from_stock'] = {'value': 0, 'items': []}
			if routine.strToFloat(row['elem'].get('vol_full',0))>0:
				stock_items = self._stock.get(str(row['elem']['_id']),[])
				for s_i in stock_items:
					if s_i['count'].get('current_value',0)>0:
						need_vol = (row['elem']['vol_full'] - row['elem']['count_from_stock']['value'])
						# если объем со склада может браться частями
						if s_i.get('can_be_divided'):
							if need_vol >= s_i['count']['current_value']:
								row['elem']['count_from_stock']['value'] += s_i['count']['current_value']
								row['elem']['count_from_stock']['items'].append({
									'_id': s_i['_id'],
									'value': s_i['count']['current_value']
								})
								s_i['count']['current_value'] = 0
							else:
								row['elem']['count_from_stock']['value'] += need_vol
								row['elem']['count_from_stock']['items'].append({
									'_id': s_i['_id'],
									'value': need_vol
								})
								s_i['count']['current_value'] = s_i['count']['current_value']-need_vol
						else:
							if need_vol >= s_i['count']['current_value']:
								row['elem']['count_from_stock']['value'] += s_i['count']['current_value']
								row['elem']['count_from_stock']['items'].append({
									'_id': s_i['_id'],
									'value': s_i['count']['current_value']
								})
								s_i['count']['current_value'] = 0
					# прекращаем смотреть на складе, если достигли требуемого объема
					if row['elem']['count_from_stock']['value']>= row['elem']['vol_full']:
						break
		self.calculated_tree = calculated_tree
		return calculated_tree

	def get_templates_comb_out_objects(self):
		'''
			Функция сбора выходных ДСЕ(конфигураций), получаемых в результате расскроя
			В результате раскроя всегда получаются конфигурации, функция ведет суммарный подсчет
			объемов выходящих конфигураций
		'''
		templates_comb_out_objects = {}
		if self.calculated_tree:
			templates_comb_out_objects = {}
			for row in self.calculated_tree:
				if row.get('templates_combs'):
					for template in row['templates_combs']['templates']:
						for out_item in template['template']['out_objects']:
							if out_item['key'] not in templates_comb_out_objects:
								templates_comb_out_objects[out_item['key']] = {'count_value': 0, 'object': out_item, 'in_object': {'number': row['elem']['number']}}
							# template['qty'] - сколько раз прмиеняется шаблон для получения требуемого количества
							templates_comb_out_objects[out_item['key']]['count_value']+=routine.strToFloat(out_item['count']) * template['qty']
		return templates_comb_out_objects


class OwnCalculator:
	'''
		Класс для расчета объемов изделий собственного производства
	'''
	_list = None # список данных ЭСУД
	_all_specs_short_info = None # справочник всех спецификаций, участвующих в рассчете
	_elems_to_calculate = None # список спецификаций, переданных на вход рассчета
	_grouped_stock_items = None # сгруппированные по спецификациям складские объемы
	_stock = None # складские объемы
	_use_cut_templates = False # использовать шаблоны раскроя
	_templateManager = None # объект управления темплейтами - TemplateManager class
	#------------------------

	def __init__(self, templateManager, list, all_specs_short_info, elems_to_calculate, grouped_stock_items, use_cut_templates ):
		self._list = list
		# информация обо всех специфкациях участвующих в рассчете
		self._all_specs_short_info = all_specs_short_info
		# информация об входных специфкациях в расчете
		self._elems_to_calculate = elems_to_calculate
		# складские объемы
		self._stock = grouped_stock_items
		# флаг использования шаблоново расчета
		self._use_cut_templates = use_cut_templates
		# объект управления шаблонами раскроя
		self._templateManager = templateManager

	def __apply_stock(self, stock, elem):
		'''
			функция применения склада по всему дереву изделия
		'''
		if not elem['is_buy']:
			elem['count_from_stock'] = {'value': 0, 'items': []}
			elem['count_to_produce'] = {'value': elem['count']['value']}
			if elem['count_to_produce']['value']>0:
				StockManager.calculate_stock_volume(elem, stock.get(str(elem['_id']),[]), elem['count']['value'])
				elem['count_to_produce']['value'] = elem['count']['value']-elem['count_from_stock']['value']
				# если применили склад, то необходимо уменьшить требуемые объемы вниз по дереву
				if elem['count_to_produce']['value'] != elem['count']['value']:
					elem['count']['origin_value'] = elem['count']['value']
					self.__recalculate_count_value(elem, elem['count_from_stock']['value'])
				for child in elem.get('items',[]):
					self.__apply_stock(stock,child)
			else:
				elem['items'] = []

	def __recalculate_count_value(self, elem, minus_vol):
		'''
			пересчет объемов по всему дереву вниз
			minus_vol - объем на который надо уменьшить
		'''
		for child in elem.get('items',[]):
			# объем на единицу родителя
			vol_per_unit = routine.strToFloat(child['count']['value']) / routine.strToFloat(elem['count']['origin_value'])
			child['count']['origin_value'] = child['count']['value']
			child['count']['value'] = routine.strToFloat(child['count']['value']) - (vol_per_unit * minus_vol)
			self.__recalculate_count_value(child, (vol_per_unit * minus_vol))

	def __claculate_vol_tolerance(self, child_row, parent_row=None):
		'''
			Расчет невозвратных потерь и отходов, заданных в структуре (объем допуска и допуск на объем)
		'''
		# заданное значение невозвратных потерь и отходов
		vol_tolerance = 0
		# допуск на объем (допуск на потери)
		tolerance_on_vol = 0
		# коэффициент применения допуска. Вычисляется из объема допуска и допуска на объем
		tolerance_koef = 1
		# объем на 1 штуку, может быть пустой. Если пустой то берется чистый объем и штуки не рассчитываются
		vol_per_unit = None
		# количество штук
		vol_amount = 0
		# Объем по нормам на 1 штуку изготавливаемого изделия
		parent_count = routine.strToFloat(parent_row['count']['value']) if parent_row else 1
		vol_bynorm = routine.strToFloat(child_row['count']['value']) / parent_count

		# если задан, объем допуска, то получаем его
		if child_row.get('vol_tolerance'):
			vol_tolerance = routine.strToFloat(child_row['vol_tolerance'].get('value',0))
			if vol_tolerance>0 and str(child_row['vol_tolerance'].get('unit_origin_id','')) == str(datamodel.SYSTEM_OBJECTS['PERCENT_UNIT']):
				vol_tolerance =   vol_bynorm*vol_tolerance/100

		# если задан, допуск на объем, то расчитываем коэффициент, сколько раз необходимо применить объем допуска
		if child_row.get('tolerance_on_vol'):
			#---iss_587-------------------------------------------------------
			# если допуск на объем = 0, то объем допуска никогда не прмиеняется.
			# если допуск на объем = любое значение, то объем допуска применяется всегда
			if str(child_row['tolerance_on_vol'].get('value_origin_id','')) != str(datamodel.SYSTEM_OBJECTS['ANY_VAL']):
				tolerance_on_vol = routine.strToFloat(child_row['tolerance_on_vol'].get('value',0))
				if tolerance_on_vol>0:
					if vol_bynorm<tolerance_on_vol:
						vol_tolerance = 0
					else:
						tolerance_koef = math.trunc(vol_bynorm / tolerance_on_vol)
						vol_tolerance = vol_tolerance*tolerance_koef
				else:
					vol_tolerance = 0
		else:
			vol_tolerance = 0

		# если объем допуска (невозвратный отход) измеряется в штуках и получается не целое число, то округляем до целого в большую сторону
		if str(child_row['count'].get('unit_origin_id',''))== str(datamodel.SYSTEM_OBJECTS['PIECE_VAL']):
			vol_tolerance = math.ceil(vol_tolerance)

		# возврат пересчитанного объема невозвратных потерь
		return vol_tolerance

	def __run_calculate_items_maked_using_cutting(self, elem, parents, result):
		'''
			функция выполнения расчета и группировки изделий
		'''
		new_parents = copy(parents)
		new_parents.append(elem)
		# отбор всех покупных изделий и добавление им в детей объектов, которые необходимо изготовить
		if not elem.get('is_buy'):

			# сектор на котором идет производство объекта
			elem_sector = elem.get('sector')
			# сектор на которы требуется текущий объект
			parent_sector = parents[len(parents)-1].get('sector',{}) if len(parents)>0 else {}

			# если требуется подсчет покупных объемов для изготавливаемых изделий
			# то продолжаем вычисления
			if not elem['number'] in result:
				tmp_elem = deepcopy(elem)
				if not tmp_elem.get('parent_sector'):
					tmp_elem['parent_sector'] = parent_sector
				if tmp_elem.get('items'):
					del tmp_elem['items']
				result[elem['number']] = {'elem': tmp_elem, 'items': []}
			else:
				result[elem['number']]['elem']['count']['value']+=elem['count']['value']
				result[elem['number']]['elem']['count_to_produce']['value']+=elem['count_to_produce']['value']

			# отбор объектов, которые необходимо изготовить на основе покупного объекта
			if len(parents)>0:
				parent_elem = parents[len(parents)-1]
				have_parent_in_list = False
				tmp_parent_elem = deepcopy(parent_elem)
				if not tmp_parent_elem.get('parent_sector'):
					tmp_parent_elem['parent_sector']= parents[len(parents)-1]['sector']  if len(parents)>1  else {}
				tmp_parent_elem['vol_amount'] = 0 # количество  в штуках
				tmp_parent_elem['vol_full'] = 0 # объем на закупку
				tmp_parent_elem['vol_bynorm'] = 0 # объем по нормам
				if tmp_parent_elem.get('items'):
					del tmp_parent_elem['items']
				# количество штук
				vol_amount = 0
				# объем всего (на закупку)
				vol_full = 0
				# вычисление объемов и допусков для элементов, для которых нет разделительной операции
				# результат записывается в объекты изделий, для которых необходимы указанные покупные изделия
				if tmp_parent_elem['count_to_produce']['value']>0:
					# объем допуска (невозвратный отход)
					vol_tolerance = self.__claculate_vol_tolerance(elem, tmp_parent_elem)
					# объем на 1 штуку, может быть пустой. Если пустой то берется чистый объем и штуки не рассчитываются
					vol_per_unit = None
					vol_per_unit = elem.get('vol_per_unit', {})
					#----iss_596------------------------------------------------------------------------------------------
					# объем на закупку
					vol_full = routine.strToFloat(elem['count']['value']) + (vol_tolerance * routine.strToFloat(tmp_parent_elem['count']['value']))
					# количество штук, считаем если только задан объем на 1шт.
					if vol_per_unit.get('value'):
						vol_amount = vol_full/(routine.strToFloat(vol_per_unit.get('value', 1)) or 1)
					# занесение расчетов в результат
					tmp_parent_elem['vol_amount'] = vol_amount # количество в штуках
					tmp_parent_elem['vol_full'] = vol_full # объем всего(на закупку)

					# -------------------------------------------------------------------------------
					# проверяем, нет ли уже такого parent  в списке изготваливаемых изделий
					# если parent есть, то необходимо сложить их количества
					# данная проверка необходима на тот слуяай, если напрмиер из листа метала можно сделать
					# 3 пенька, но эти пеньки отличаются по параметрам и необходимы для разных изделий
					# а по идентификатору они одинаковые
					# --------------------------------------------------------------------------------
					for row in result[elem['number']]['items']:
						if row['number'] == tmp_parent_elem['number']:
							row['vol_bynorm']+=routine.strToFloat(elem['count']['value'])
							row['count']['value']+=tmp_parent_elem['count']['value']
							row['count_from_stock']['value']+=tmp_parent_elem['count_from_stock']['value']
							row['count_from_stock']['items'].extend(tmp_parent_elem['count_from_stock']['items'])
							row['count_to_produce']['value']+=tmp_parent_elem['count_to_produce']['value']
							row['vol_amount'] += vol_amount # количество в штуках
							row['vol_full'] += vol_full # объем всего(на закупку)
							have_parent_in_list = True
							break

				if not have_parent_in_list:
					# суммируем объемы по нормам для элементов- родителей покупных
					tmp_parent_elem['vol_bynorm'] = routine.strToFloat(elem['count']['value'])
					# добавление в покупной объет, очередного элемента в котором требуется данное покупное
					# если только в списке еще нет такого
					result[elem['number']]['items'].append(tmp_parent_elem)

		for child in elem.get('items',[]):
			self.__run_calculate_items_maked_using_cutting(child, new_parents, result)

	def __calculate_items_maked_using_cutting(self, stock):
		'''
			Функция получения и подсчета требуемого объема изделий-материалов,
			из которых изготваливаются изделия путем нарезки
			Ведется группировка данных по изделиям-материалам, с включением того,
			что необходимо изготовить на основе этих изделий-материалов.
			Результат - список изделий
			 [{
				'number': '',
				'elem': {},
				'items': [{
					'parent_sector': {},
					'vol_amount': 0,
					'vol_full': 0,
					'vol_bynorm': 0,
				}]
			}]
			stock - складские объемы
		'''
		tmp_calculated_tree = {}
		# расчет для всех заданных элементов
		for elem in self._elems_to_calculate:
			if elem['count_to_produce']['value']>0:
				# попытка применения склада на каждом уровне изделий, кроме базового уровня
				# к корневому элементу склад применяется изначально
				#if not elem.get('base_elem'):
				self.__apply_stock(stock, elem)
				# запуск основного расчета объемов
				self.__run_calculate_items_maked_using_cutting(elem, [], tmp_calculated_tree)

		self.items_maked_using_cutting = tmp_calculated_tree.values()
		return self.items_maked_using_cutting

	def __apply_cutting_templates(self):
		'''
			Поиск объектов, которые полуаются путем нарезки.
			Применение к найденным объектам шаблонов раскроя
		'''
		# находим объекты, получаемые нарезкой, и группируем их по объектам из которых будет идти нарезка
		tmp_calculated_tree = self.__calculate_items_maked_using_cutting(deepcopy(self._stock))

		#если среди списка изделий получаемых из покупного изделия, часть получается
		# путем раскроя, а другая часть получается не раскроем, то необходимо применить шаблоны раскроя к требуемым изделиям
		# полученный результат необходимо сложить
		calculated_tree = []
		for row in tmp_calculated_tree:
			# применение шаблонов раскроя
			have_templates = False
			if self._use_cut_templates:
				templated_row = self._templateManager.apply_templates(deepcopy(row))
			else:
				templated_row =deepcopy(row)

			# помечаем, если подобрана комбинация шаблонов
			if templated_row.get('templates_combs'):
				have_templates = True
			# подсчет итоговых объемов на закупку
			vol_full = 0 # объем на закупку
			vol_amount = 0 # количество материала в штуках
			vol_full_waste = 0 # полный отход
			vol_returned_waste = 0 # возвратный отход
			vol_not_returned_waste = 0 # невозвратный отход
			vol_not_defined_waste = 0 # неопределенный  отход
			# Проверка требуемых изделий собственного производства на складе.
			# Подсчет финальных объемов
			if len(row['items'])>0:
				for item in row['items']:
					# если подобраны шаблоны раскроя, то изделия получаемые нарезкой по шаблонам учитывать не нужно
					# объемы по таким изделиям будут взяты из раскроя
					if not have_templates or not item['is_separate']:
						if item.get('vol_amount'):
							vol_amount+= item['vol_amount']
						if item.get('vol_full'):
							vol_full+=item['vol_full']
			else:
				vol_full = row['elem']['count']['value']

			# (если нет изделий получаемых от раскроя или нет шаблонов раскроя) и объем не пустой
			if vol_full>0:
				#----iss_596------------------------------------------------------------------------------------------
				# округление полного объема согласно кратности объема на 1 шт.
				vol_full_by_norms = vol_full
				if row['elem'].get('vol_per_unit') and routine.strToFloat(row['elem'].get('vol_per_unit', {}).get('value',0))>0:
					vol_per_unit = routine.strToFloat(row['elem'].get('vol_per_unit', {}).get('value',0))
					if vol_full<vol_per_unit:
						vol_full = vol_per_unit
						vol_amount = 1
					elif vol_per_unit>0:
						vol_full = routine.ceil(vol_full/vol_per_unit)*vol_per_unit
						vol_amount = vol_full/vol_per_unit
				else:
					vol_amount = 0

				# подсчет общих отходов
				elem_count_value = routine.strToFloat(row['elem']['count']['value']) if not have_templates else routine.strToFloat(row['elem']['count']['value']) - routine.strToFloat(templated_row['elem']['count']['value'])
				vol_full_waste = vol_full -  elem_count_value
				vol_not_returned_waste = vol_full_by_norms -  elem_count_value
				vol_not_defined_waste = vol_full_waste - vol_not_returned_waste
				vol_returned_waste = vol_full_waste - vol_not_returned_waste
				# если единицы измерения = шт., то присваиваем количеству требуемый объем
				if not vol_amount and str(row['elem']['count'].get('unit_origin_id',''))== str(datamodel.SYSTEM_OBJECTS['PIECE_VAL']):
					vol_amount = vol_full
				#---------------------------------------------------------------------------------------------------------
				# финальные объемы покупного изделия
				row['elem']['vol_amount'] = vol_amount
				row['elem']['vol_full'] = vol_full
				row['elem']['vol_full_waste'] = vol_full_waste
				row['elem']['vol_returned_waste'] = vol_returned_waste
				row['elem']['vol_not_returned_waste'] = vol_not_returned_waste
				row['elem']['vol_not_defined_waste'] = vol_not_defined_waste
				# прибавляем объемы от раскроя, если были подобраны шаблоны
				if have_templates:
					row['elem']['vol_amount'] += templated_row['elem']['vol_amount']
					row['elem']['vol_full'] += templated_row['elem']['vol_full']
					row['elem']['vol_full_waste'] += templated_row['elem']['vol_full_waste']
					row['elem']['vol_returned_waste'] += templated_row['elem']['vol_returned_waste']
					row['elem']['vol_not_returned_waste'] += templated_row['elem']['vol_not_returned_waste']
					row['elem']['vol_not_defined_waste'] += templated_row['elem']['vol_not_defined_waste']
					row['templates_combs'] = templated_row.get('templates_combs')
				calculated_tree.append(row)
			else:
				calculated_tree.append(templated_row)

		calculated_tree.sort(key = lambda x:(x['elem']['number']))
		# применение склада к итоговым объемам на закупку
		for row in calculated_tree:
			row['elem']['count_from_stock'] = {'value': 0, 'items': []}
			if routine.strToFloat(row['elem'].get('vol_full',0))>0:
				stock_items = self._stock.get(str(row['elem']['_id']),[])
				for s_i in stock_items:
					if s_i['count'].get('current_value',0)>0:
						need_vol = (row['elem']['vol_full'] - row['elem']['count_from_stock']['value'])
						# если объем со склада может браться частями
						if s_i.get('can_be_divided'):
							if need_vol >= s_i['count']['current_value']:
								row['elem']['count_from_stock']['value'] += s_i['count']['current_value']
								row['elem']['count_from_stock']['items'].append({
									'_id': s_i['_id'],
									'value': s_i['count']['current_value']
								})
								s_i['count']['current_value'] = 0
							else:
								row['elem']['count_from_stock']['value'] += need_vol
								row['elem']['count_from_stock']['items'].append({
									'_id': s_i['_id'],
									'value': need_vol
								})
								s_i['count']['current_value'] = s_i['count']['current_value']-need_vol
						else:
							if need_vol >= s_i['count']['current_value']:
								row['elem']['count_from_stock']['value'] += s_i['count']['current_value']
								row['elem']['count_from_stock']['items'].append({
									'_id': s_i['_id'],
									'value': s_i['count']['current_value']
								})
								s_i['count']['current_value'] = 0
					# прекращаем смотреть на складе, если достигли требуемого объема
					if row['elem']['count_from_stock']['value']>= row['elem']['vol_full']:
						break
		#self.calculated_tree = calculated_tree

		# print('---------------------')
		# print(routine.JSONEncoder().encode(calculated_tree))
		# print('---------------------')
		return calculated_tree

	def _get_templates_comb_out_objects(self, data):
		'''
			Функция сбора выходных ДСЕ(конфигураций), получаемых в результате расскроя
			В результате раскроя всегда получаются конфигурации, функция ведет суммарный подсчет
			объемов выходящих конфигураций
		'''
		templates_comb_out_objects = {}
		if data:
			templates_comb_out_objects = {}
			for row in data:
				if row.get('templates'):
					for template in row['templates']:
						for out_item in template['template']['out_objects']:
							if out_item.get('selected_specification'):
								if out_item['selected_specification']['number'] not in templates_comb_out_objects:
									templates_comb_out_objects[out_item['selected_specification']['number']] = {'count_value': 0, 'object': out_item['selected_specification'], 'in_object': {'number': row['elem']['number']}}
								# template['qty'] - сколько раз прмиеняется шаблон для получения требуемого количества
								templates_comb_out_objects[out_item['selected_specification']['number']]['count_value']+=routine.strToFloat(out_item['count']) * template['qty']
		return templates_comb_out_objects

	def __run_own_tree_calculate(self, elem, parents, result):
		'''
			Основная функция расчета
		'''
		# сбор родителей объекта в список
		new_parents = copy(parents)
		new_parents.append(elem)
		# сбор конечных объектов собственного производства, покупные отсеиваются
		if not elem.get('is_buy'):
			# сектор на котором идет производство объекта
			elem_sector = elem.get('sector')
			# сектор на которы требуется текущий объект
			parent_sector = parents[len(parents)-1].get('sector',{}) if len(parents)>0 else {}

			# попытка применения склада на каждом уровне изделий, кроме базового уровня
			# к корневому элементу склад применяется изначально
			if not elem.get('base_elem'):
				elem['count_from_stock'] = {'value': 0, 'items': []}
				elem['count_to_produce'] = {'value': elem['count']['value']}
				if elem['count']['value']>0:
					stock_items = self._stock.get(str(elem['_id']),[])
					StockManager.calculate_stock_volume(elem, stock_items, elem['count']['value'])
					elem['count_to_produce']['value'] = elem['count']['value']-elem['count_from_stock']['value']
					elem['count']['origin_value'] = elem['count']['value']
					# если применили склад, то необходимо уменьшить требуемые объемы вниз по дереву
					if elem['count_to_produce']['value']>0:
						if elem['count_to_produce']['value'] != elem['count']['value']:
							self.__recalculate_count_value(elem, elem['count_from_stock']['value'])
					else:
						elem['items'] = []

			if not elem['number'] in result:
				tmp_elem = deepcopy(elem)

				# if 'items' in tmp_elem:
				# 	del tmp_elem['items']

				if not tmp_elem.get('parent_sector'):
					tmp_elem['parent_sector'] = parent_sector
				result[elem['number']] = {'elem': tmp_elem, 'items': []}
			else:
				result[elem['number']]['elem']['count']['value']+=elem['count']['value']
				result[elem['number']]['elem']['count_to_produce']['value']+=elem['count_to_produce']['value']

		for child in elem.get('items',[]):
			self.__run_own_tree_calculate(child, new_parents, result)


	def __fix_volumes_after_cutting(self, data):
		'''
			пересчет объемов, если был раскрой. Данный пересчет выполняется вниз по структуре.
			data - список объектов отобранных для производства
		'''
		def recalculate(data, number, vol):
			'''
				Рекурсивная функция выполнения пересчета объемов
			'''
			row = None
			try:
				row = (item for item in data if item['elem']["number"] == number).next()

				# пересчет объемов на производство
				# если объем был задан на входе рассчета руками, то его объем нельзя уменьшить меньше чем это значение
				if not row['elem'].get('base_elem'):
					row['elem']['count']['origin_value'] = vol
					row['elem']['count']['value'] = vol
					row['elem']['count_to_produce']['value'] = vol
				else:
					if row['elem']['count'].get('origin_count',0)<vol:
						row['elem']['count']['value'] = vol
						row['elem']['count_to_produce']['value'] = vol
					else:
						row['elem']['count']['value'] = row['elem']['count']['origin_count']
						row['elem']['count_to_produce']['value'] = row['elem']['count']['origin_count']

				# пересчет объемов со склада, если такие брались, если брался лишний объем, то его необходимо вернуть
				if row['elem']['count_from_stock']['value']>0:
					if row['elem']['count_to_produce']['value']>=row['elem']['count_from_stock']['value']:
						row['elem']['count_to_produce']['value'] -= row['elem']['count_from_stock']['value']
					else:
						row['elem']['count_from_stock']['value'] = row['elem']['count_to_produce']['value']
						# отсеевание лишних объектов-единиц со склада
						new_from_stock_items = []
						for stock_item in row['elem']['count_from_stock']['items']:
							if row['elem']['count_to_produce']['value']>0:
								row['elem']['count_to_produce']['value']-=stock_item['value']
								new_from_stock_items.append(stock_item)
							else:
								break
						row['elem']['count_from_stock']['items'] = new_from_stock_items
						row['elem']['count_to_produce']['value'] =0

				# смотрим объекты из которых изготваливается текущий и пересчитываем их объемы
				for fl_item in row['elem'].get('first_level_items',[]):
					recalculate(data, fl_item['number'], fl_item['count']['value'] * row['elem']['count_to_produce']['value'])
			except:
				pass

		for row in data:
			# изначально проверяем те объекты, к которым был применен раскрой
			if 'templates' in row and row['templates']:
				# смотрим объекты из которых изготваливается текущий и пересчитываем их объемы
				for fl_item in row['elem'].get('first_level_items',[]):
					recalculate(data, fl_item['number'], fl_item['count']['value'] * row['elem']['count']['value'] )

	def run(self):
		'''
		Отбор изделий собственного производства с группировкой по участкам.
		Отбор изделий ведется по правилам отбора выпускаемых участком изделий.
		А именно: если участок родительского изделия НЕ равен участку данного изделия, то данное изделие выпускаемое.
		Также необходимо запоминать, участок - получатель изделия. Получатель изделия - это участок, который задан для
		объекта-родителия текущего элемента
		'''
		# применение раскроя, если необходимо
		elems_with_templates = {}
		if self._use_cut_templates:
			tmp_calculated_tree = self.__apply_cutting_templates()
			# группируем объекты, для которых применен шаблон раскроя
			for row in tmp_calculated_tree:
				if row.get('templates_combs'):
					elems_with_templates[row['elem']['number']] = row

		tmp_calculated_tree = {}

		for elem in self._elems_to_calculate:
			# если требуется производство данного объекта, то запускается расчет по нему
			# иначе, просто добавляем объект в результат с текущими значениями объемов
			if elem['count_to_produce']['value']>0:
				self.__run_own_tree_calculate(elem, [], tmp_calculated_tree)
			else:
				if not elem['number'] in tmp_calculated_tree:
					tmp_calculated_tree[elem['number']] = {'elem': deepcopy(elem), 'items': []}
				else:
					tmp_calculated_tree[elem['number']]['elem']['count']['value']+=elem['count']['value']

		# сбор результата
		own_calculated_tree = [row for row in tmp_calculated_tree.values() if row['elem']['count']['value']>0]

		# смотрим, если к кому-то был применен раскрой, то делаем пересчет объемов
		# с учетом раскроя
		for row in own_calculated_tree:
			if row['elem']['number'] in elems_with_templates:
				templated_row = elems_with_templates[row['elem']['number']]
				row['templates'] = templated_row['templates_combs']['templates']
				# !!!!!!!!!!!!!!!!!!!
				# !!!!!!!! Пока не учитиываем, что от собственного раскроя могут быть побочные объекты типа отходов
				#!!!!!!!!!!!!!!!!!!!!!!
				# пересчет объемов на производство
				# если объем был задан на входе рассчета руками, то его объем нельзя уменьшить меньше чем это значение
				if not row['elem'].get('base_elem'):
					row['elem']['count']['origin_value'] = templated_row['elem'].get('vol_amount',0)
					row['elem']['count']['value'] = templated_row['elem'].get('vol_amount',0)
					row['elem']['count_to_produce']['value'] = templated_row['elem'].get('vol_amount',0)
				else:
					if row['elem']['count'].get('origin_count',0)<templated_row['elem'].get('vol_amount',0):
						row['elem']['count']['value'] = templated_row['elem'].get('vol_amount',0)
						row['elem']['count_to_produce']['value'] = templated_row['elem'].get('vol_amount',0)
					else:
						row['elem']['count']['value'] = row['elem']['count']['origin_count']
						row['elem']['count_to_produce']['value'] = row['elem']['count']['origin_count']

				# пересчет объемов со склада, если такие брались, если брался лишний объем, то его необходимо вернуть
				if row['elem']['count_from_stock']['value']>0:
					if row['elem']['count_to_produce']['value']>=row['elem']['count_from_stock']['value']:
						row['elem']['count_to_produce']['value'] -= row['elem']['count_from_stock']['value']
						# row['elem']['count_from_stock']['value'] = 0
						# row['elem']['count_from_stock']['items'] = []
					else:
						row['elem']['count_from_stock']['value'] = row['elem']['count_to_produce']['value']
						# отсеевание лишних объектов-единиц со склада
						new_from_stock_items = []
						for stock_item in row['elem']['count_from_stock']['items']:
							if row['elem']['count_to_produce']['value']>0:
								row['elem']['count_to_produce']['value']-=stock_item['value']
								new_from_stock_items.append(stock_item)
							else:
								break
						row['elem']['count_from_stock']['items'] = new_from_stock_items
						row['elem']['count_to_produce']['value'] =0

		# также необходимо пересчитать объемы в производство для элементов, которые будут изгнотовлены по шаблону
		# например по заданию может требоваться 10 уток, а из шаблона выходит 50
		templates_combs_out_objects = self._get_templates_comb_out_objects(own_calculated_tree)

		for row in own_calculated_tree:
			if row['elem']['number'] in templates_combs_out_objects:
				# пересчет объема на производство
				if templates_combs_out_objects[row['elem']['number']]['count_value']>row['elem']['count_to_produce']['value']:
					row['elem']['count_to_produce']['value'] = templates_combs_out_objects[row['elem']['number']]['count_value']

				# пересчет объемов со склада, если такие брались, если брался лишний объем, то его необходимо вернуть
				if row['elem']['count_from_stock']['value']>0:
					if row['elem']['count_to_produce']['value']>=row['elem']['count_from_stock']['value']:
						row['elem']['count_to_produce']['value'] -= row['elem']['count_from_stock']['value']
					else:
						row['elem']['count_from_stock']['value'] = row['elem']['count_to_produce']['value']
						# отсеевание лишних объектов-единиц со склада
						new_from_stock_items = []
						for stock_item in row['elem']['count_from_stock']['items']:
							if row['elem']['count_to_produce']['value']>0:
								row['elem']['count_to_produce']['value']-=stock_item['value']
								new_from_stock_items.append(stock_item)
							else:
								break
						row['elem']['count_from_stock']['items'] = new_from_stock_items
						row['elem']['count_to_produce']['value'] =0

		# В результате применения раскроя, могли уменьшиться требыемы еобъемы для вложенных материалов
		# Например до применения шаблонов, нам трбовалось 10 заглушек, котоыре готовились из пластин, на 1 заглушку одну пластину.
		# после применения раскроя, нам стало требоваться 1 заглушка, следовательно и пластин для ее изготовдения требуется одна
		self.__fix_volumes_after_cutting(own_calculated_tree)

		# в результирующих данных оставляем вложенные items только  у тех обхектов, которые изготавливаются из покупных изделий
		# для этих покупных изделий необходимо сделать перерасчет количества
		for row in own_calculated_tree:
			if any(i for i in row['elem']['items'] if i['is_buy']):
				new_buy_items = []
				for item in row['elem']['items']:
					if item['is_buy']:
						item['count']['value'] = row['elem']['count_to_produce']['value']*item['count']['origin_value']
						new_buy_items.append(item)
				row['elem']['items'] = new_buy_items
			else:
				del row['elem']['items']

		# print('---------------------')
		# print(routine.JSONEncoder().encode(own_calculated_tree))
		# print('---------------------')

		return own_calculated_tree

#-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
# API методы
#-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
def sort_sectors_in_tree(data):
	'''
		Сортировка данных по участкам. Сортировка ведется по иерархии участков
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
		if not row['elem']['sector'] or not row['elem']['sector']['name']:
			row['elem']['sector'] =  {
				'name': 'Не задан',
				'origin_id': None,
				'routine': 0,
			}
		in_sector = row['elem']['sector'].get('name')

		if not row['elem']['parent_sector'] or not row['elem']['parent_sector']['name']:
			row['elem']['parent_sector'] =  {
				'name': 'Не задан',
				'origin_id': None,
				'routine': 0,
			}

		out_sector = row['elem']['parent_sector'].get('name')
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
		row['elem']['sector']['routine'] = structured_sectors.get(row['elem']['sector'].get('name','Не задан'),0)
	data.sort(key = lambda x:(x['elem']['sector'].get('routine'), x['elem']['number']))
	return structured_sectors

def get_dop_items_after_templates(items, own_calculated_tree):
	'''
		Функция  сбора побочных элементов, полученных от раскроя
	'''

	# от раскроя мы получаем только конфиги, необходимо для данных конфигов подобрать варианты спецификаций
	own_to_stock = []
	for t_object in items:
		if t_object['count_value']>0:
			tmp_elem = {
				'elem': {
					'number': t_object['object']['key'],
					'name': t_object['object']['name'],
					'count':{'value': t_object['count_value']},
					'count_from_stock' : {'value': 0, 'items': []},
					'count_to_produce' : {'value': t_object['count_value']},
					'parent_sector': {'name': 'Склад'},
					'sector': t_object['object']['sector'],
					'to_stock': True,
					'selected_specification': t_object['object'].get('selected_specification')
					# 'specifications': t_object['object'].get('specifications',[])
				}
			}
			own_to_stock.append(tmp_elem)

	if len(own_to_stock)>0:
		# Если в результате раскроя получили объеты, которые брались со склада для исполнения текущего задания,
		# объекты со склада не берем, а берем те что получаются в производстве
		# также проставляем подходящую спецификацию для конфигурации от раскроя
		for row in own_to_stock:
			if row['elem']['selected_specification']:
				for own_item in own_calculated_tree:
					if own_item['elem']['number'] == row['elem']['selected_specification']['number']  and own_item['elem']['count_from_stock']['value']>0:
						if row['elem']['count_to_produce']['value']>=own_item['elem']['count_from_stock']['value']:
							row['elem']['count_to_produce']['value'] -= own_item['elem']['count_from_stock']['value']
							own_item['elem']['count_to_produce']['value'] += own_item['elem']['count_from_stock']['value']
							own_item['elem']['count_from_stock']['value'] = 0
							own_item['elem']['count_from_stock']['items'] = []
						else:
							own_item['elem']['count_to_produce']['value'] +=  row['elem']['count_to_produce']['value']
							own_item['elem']['count_from_stock']['value'] -= row['elem']['count_to_produce']['value']
							# отсеивание лишних объектов-единиц со склада
							new_from_stock_items = []
							for stock_item in own_item['elem']['count_from_stock']['items']:
								if row['elem']['count_to_produce']['value']>0:
									row['elem']['count_to_produce']['value']-=stock_item['value']
								else:
									new_from_stock_items.append(stock_item)
							own_item['elem']['count_from_stock']['items'] = new_from_stock_items
							row['elem']['count_to_produce']['value'] =0
	return own_to_stock

def merge_similar_own_items(own_calculated_tree):
	'''
		Объединение одинаковых объектов, требуемых на одних и тех же учасках
	'''
	res_own_calculated_tree = {}
	for el in own_calculated_tree:
		if el['elem'].get('selected_specification'):
			key = el['elem']['selected_specification']['number'] + u'_'+(el['elem'].get('parent_sector',{}) or {}).get('name','Не задан')
		else:
			key = el['elem']['number'] + u'_'+(el['elem'].get('parent_sector',{}) or {}).get('name','Не задан')
		if not key in res_own_calculated_tree:
			res_own_calculated_tree[key] = el
		else:
			res_own_calculated_tree[key]['elem']['count_to_produce']['value'] += el['elem']['count_to_produce']['value']
			res_own_calculated_tree[key]['elem']['count_from_stock']['value'] +=el['elem']['count_from_stock']['value']
			res_own_calculated_tree[key]['elem']['count']['value'] +=el['elem']['count']['value']
			if not res_own_calculated_tree[key].get('templates'):
				res_own_calculated_tree[key]['templates'] = []
			if el.get('templates'):
				res_own_calculated_tree[key]['templates'].extend(el['templates'])

	return res_own_calculated_tree.values();

def put_over_volumes_to_stock(own_calculated_tree):
	'''
		Если планируется произвести больше чем требуется, то излишки надо отправить на склад
	'''
	res_own_calculated_tree = {}
	own_to_stock = []
	for el in own_calculated_tree:
		if el['elem']['count_to_produce']['value']>el['elem']['count']['value'] and not el['elem'].get('base_elem') and not el['elem'].get('to_stock'):
			count_value = el['elem']['count_to_produce']['value'] - el['elem']['count']['value']
			tmp_elem = {
				'elem': {
					#'number': el['elem']['number'] if not el['elem'].get('selected_specification') else el['elem'].get('selected_specification')['number'],
					'number': el['elem']['number'],
					'name': el['elem']['name'],
					'count':{'value': count_value },
					'count_from_stock' : {'value': 0, 'items': []},
					'count_to_produce' : {'value': count_value},
					'parent_sector': {'name': 'Склад'},
					'sector': el['elem']['sector'],
					'to_stock': True,
					'selected_specification': copy(el['elem'])
				}
			}
			own_to_stock.append(tmp_elem)
			el['elem']['count_to_produce']['value']=el['elem']['count']['value']
	own_calculated_tree.extend(own_to_stock)
	return own_calculated_tree

	# res_own_calculated_tree = {}
	# own_to_stock = []
	# for el in own_calculated_tree:
	# 	if el['elem']['count_to_produce']['value']>el['elem']['count']['value'] and not el['elem'].get('base_elem') and not el['elem'].get('to_stock'):
	# 		tmp_elem = deepcopy(el)
	# 		tmp_elem['elem']['count_from_stock'] ={'value': 0, 'items': []}
	# 		tmp_elem['elem']['count'] ={'value': 0, 'origin_value':0}
	# 		tmp_elem['elem']['count_to_produce'] = {'value': el['elem']['count_to_produce']['value'] - el['elem']['count']['value']}
	# 		tmp_elem['elem']['parent_sector']= {'name': 'Склад'}
	# 		tmp_elem['elem']['to_stock']= True
	# 		own_to_stock.append(tmp_elem)
	# 		el['elem']['count_to_produce']['value']=el['elem']['count']['value']
	# own_calculated_tree.extend(own_to_stock)
	# return own_calculated_tree

def calculate(list, all_specs_short_info, elems_to_calculate, stock, use_cut_templates, use_returned_waste, use_not_returned_waste, progressManager):
	'''
		Основная функция выполнения расчета
		list - все данные эсуд
		all_specs_short_info - все спецификации, участвующие в расчете, включая вложенные
		elems_to_calculate - спецификации, поданные на вход рассчетов
		stock - складские объемы
		use_cut_templates - флаг необходимости использования шаблонов раскроя
		use_returned_waste - оптимизировать по возвратному отходу (толкьо для покупного раскроя)
		use_not_returned_waste- оптимизировать по невозвратному отходу (толкьо для покупного раскроя)
	'''
	# stock_copy = deepcopy(stock)
	#-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	# запуск построения шаблонов раскроя
	templates = []
	#-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	if use_cut_templates:
		templateBuilder = TemplateBuilder(list)
		templates = templateBuilder._templates
	#-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	# создание менеджера управления темплейтами
	templateManager = BuyTemplateManager(list, templates, all_specs_short_info, use_returned_waste, use_not_returned_waste)
	progressManager.progress(30)
	#-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	#-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	# запуск расчета собственных изделий
	start = time.clock()
	ownCalculator = OwnCalculator(templateManager ,list, all_specs_short_info, elems_to_calculate, stock, use_cut_templates)
	own_calculated_tree = ownCalculator.run()
	# Подготовка входных данных для покупного расчета
	elems_to_buy_calculate = []
	for row in own_calculated_tree:
		if any(i for i in row['elem'].get('items',[]) if i['is_buy']):
			elems_to_buy_calculate.append(row['elem'])
	print 'Time calculate own data is: ', time.clock() - start
	progressManager.progress(50)

	#-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	#-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	# запуск расчета покупных изделий
	#buyCalculator = BuyCalculator(list, templateManager, all_specs_short_info, deepcopy(elems_to_calculate), stock_copy, use_cut_templates, use_returned_waste, use_not_returned_waste)
	buyCalculator = BuyCalculator(list, templateManager, all_specs_short_info, elems_to_buy_calculate, stock, use_cut_templates, use_returned_waste, use_not_returned_waste)
	start = time.clock()
	buy_calculated_tree = buyCalculator.run()
	print 'Time calculate buy data is: ', time.clock() - start
	progressManager.progress(70)
	#-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	#-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	# Нарезка из возвратного отхода
	can_produce_from_waste = {}
	waste_template_calculation_result = []
	if use_cut_templates:
		# отбираем изделия, получаемые нарезкой из покупных изделий
		items_maked_from_buy_items = {}
		for buy_row in buyCalculator.own_items_maked_from_buy_items:
			for row in buy_row.get('items',[]):
				if row.get('is_separate'):
					items_maked_from_buy_items[row['config_number']] = row
		# объект управления шаблонами раскроя для собственных изделий
		wasteTemplateManager = WasteTemplateManager(list, templates, all_specs_short_info, stock)
		waste_template_calculation_result =  wasteTemplateManager.run(deepcopy(buyCalculator.get_templates_comb_out_objects().values()), items_maked_from_buy_items)
		can_produce_from_waste = {}
		for row in waste_template_calculation_result:
			if row.get('own_templates') and row['own_templates']['can_produce']>0:
				can_produce_from_waste[row['number']] = row['own_templates']['can_produce']
		# Перезапуск пересчета покупных объемов с учетом данных по расскрою из отходов
		# buyCalculator = BuyCalculator(list, all_specs_short_info, deepcopy(elems_to_calculate), deepcopy(stock), use_cut_templates, use_returned_waste, use_not_returned_waste)
		start = time.clock()
		buy_calculated_tree = buyCalculator.run(can_produce_from_waste)
		print 'Time recalculate buy data using waste  is: ', time.clock() - start
		progressManager.progress(80)
	#-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	#-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	# пересчет собственных изделий с учетом изделий от раскроя по шаблонам
	# Помечаем какое количество изделий от раскроя пойдут на склад, а какое требуется в производстве
	# Например, от раскроя получаем 10 пластин, в производстве нам требуется 5 таких плсти, следовательно 5  пластин от раскроя
	# пойдут на участки, а 5 пластин пойдет на склад
	# Но здесь также нажо учесть и объемы полученные от раскроя отхода
	# выходные ДСЕ(конфигураций), получаемых в результате расскроя покупных изделий
	templates_comb_out_objects = buyCalculator.get_templates_comb_out_objects()
	# row['elem']['count_to_produce']['value'] - какой объем результирующего объекта требуется всего
	# из данного объема нужно вычесть то, что получается от покупного раскроя и раскроя отходов
	# если в результате вычитаний остается еще какой-либо объем, то его надо отправить на склад
	for row in own_calculated_tree:
		vol_from_own_templates = 0 # объем от собственного раскроя
		# проход по результату раскроя отходов
		for own_row in waste_template_calculation_result:
			if row['elem']['number'] ==  own_row['number'] and  own_row.get('own_templates') and own_row['own_templates']['can_produce']>0:
				vol_from_own_templates = own_row['own_templates']['can_produce']
				break
		if row['elem'].get('config_number') in templates_comb_out_objects:
			templates_comb_out_objects[row['elem']['config_number']]['count_value'] -= row['elem']['count_to_produce']['value'] - vol_from_own_templates

	# добавление шаблонных спецификаций к результирующему списку изготавливаемых изделий
	own_to_stock = get_dop_items_after_templates(templates_comb_out_objects.values(), own_calculated_tree)
	for row in own_to_stock:
		if row['elem']['count_to_produce']['value'] >0:
			own_calculated_tree.append(row)
	#-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	#-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	# проходим по всем элементам, и объединяем одинаковые элементы, требуемые на одних и тех же участках
	own_calculated_tree = merge_similar_own_items(own_calculated_tree)
	#----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	#-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	# Обработка и добавление  результата от раскроя отходов
	if use_cut_templates:
		# После покупного раскроя, весь возвратный отход идет на склад, но нам он нужен в производстве, на склад  нужно
		# отправлять только тот, который  не задействован в производстве, для этого, проходим по всем
		# входным отходам в собственных шаблонах, и подсчитываем суммарный объем
		# требуемого отхода. Затем смотрим сколько полуили от покупного раскроя, и разницу отправляем на склад
		new_own_items = []
		# идем по требуемым изделиям, получаемым из отходов (заглушка)
		for row in waste_template_calculation_result:
			if row.get('own_templates') and row['own_templates']['can_produce']>0:
				# пересчитываем  объем, который будет отправлен в производство, раскрой возвратного отхода
				# может увеличить изначальный  план на производство
				for res_own_row in own_calculated_tree:
					if res_own_row['elem']['number'] == row['number']:
						if row['own_templates']['can_produce']>res_own_row['elem']['count_to_produce']['value']:
							res_own_row['elem']['count_to_produce']['value'] = row['own_templates']['can_produce']

						# Проставляем информацию какие дополнительные объекты получили на выходе от собственного раскроя
						# сбор информации идет аналогично сбору от покупного раскроя
						# также если такие объекты брались со склада, то необходимо их вернуть на склад и взять объемы с производства
						new_out_objects = []
						for template_row in row['own_templates'].get('items',[]):
							for out_object in template_row['template']['out_objects']:
								if out_object['key'] != row['config_number']:
									new_out_objects.append({
										'count_value': out_object['count'] * template_row['qty'],
										'object': out_object
										})

						# добавление шаблонных спецификаций к результирующему списку изготавливаемых изделий
						own_to_stock = get_dop_items_after_templates(new_out_objects, own_calculated_tree)
						for row_to_stock in own_to_stock:
							if row_to_stock['elem']['count_to_produce']['value'] >0:
								own_calculated_tree.append(row_to_stock)

				# по раскрою из отходов, смоторим какие именно отходы были применены, и для данных изделий
				# в результате производим пересчет объемов, с учетом того, сколько будет вязто со склада
				# также объем идущий на склад перенаправляем на другие участки на котором требуется данный отход
				for template_row in row['own_templates'].get('items',[]):
					for res_own_row in own_calculated_tree:
						if res_own_row['elem']['number'] == template_row['src_item_key'] and res_own_row['elem'].get('to_stock'):
							# клонируем основной объект, чтобы перенаправить объемы со склада на участки
							new_res_own_row = deepcopy(res_own_row)
							new_res_own_row['elem']['parent_sector'] = template_row['template']['out_objects'][0]['sector']
							new_res_own_row['elem']['to_stock'] = False

							# Проставляем сколько требуется возвратного отхода, чтобы получить требуемые изделия
							if not 'count' in new_res_own_row['elem'] or not 'value' in new_res_own_row['elem']['count'] or not new_res_own_row['elem']['count']['value']:
								new_res_own_row['elem']['count']['value'] = 0

							new_res_own_row['elem']['count']['value'] = template_row['value']
							new_res_own_row['elem']['count_to_produce']['value'] = template_row['value'] - template_row['count_from_stock']['value']

							if res_own_row['elem'].get('count') and res_own_row['elem'].get('count').get('value')>0:
								res_own_row['elem']['count']['value']-=template_row['value']

							# если использовали объем со склада
							if template_row['count_from_stock']['value']>0:
								if not 'count_from_stock' in new_res_own_row['elem'] or not 'value' in new_res_own_row['elem']['count_from_stock'] or not new_res_own_row['elem']['count_from_stock']['value']:
									new_res_own_row['elem']['count_from_stock']['value'] = 0
									new_res_own_row['elem']['count_from_stock']['items'] = []
								# Проставляем сколько возвртаного отхода будет взято со склада
								new_res_own_row['elem']['count_from_stock']['value'] =template_row['count_from_stock']['value']
								new_res_own_row['elem']['count_from_stock']['items'].extend(template_row['count_from_stock']['items'])
							res_own_row['elem']['count_to_produce']['value'] -= template_row['count_from_order']['value']

							# проставляем информацию какие варианты раскроя применяются к данному возвратному отходу
							new_res_own_row['templates'] = [template_row]
							new_own_items.append(new_res_own_row)
		own_calculated_tree.extend(new_own_items)
	#-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	#-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	# проходим по всем элементам, и объединяем одинаковые элементы, требуемые на одних и тех же участках
	own_calculated_tree = merge_similar_own_items(own_calculated_tree)
	# отсеиваем объекты с нулевыми объемами
	own_calculated_tree = [row for row in own_calculated_tree if row['elem']['count']['value']>0]
	# создание обхемов на склад, если в производстве планирвется сделать больше чем требуется
	own_calculated_tree = put_over_volumes_to_stock(own_calculated_tree)

	# print('----------------')
	# print(routine.JSONEncoder().encode(own_calculated_tree))
	# print('----------------')

	#------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	#------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
	# iss_1106 (расчет веса изделия)
	start = time.clock()
	# список уникальных номеров спецификаций, задействованных в заданиях
	specification_numbers = {}
	for item in own_calculated_tree:
		if item['elem'].get('selected_specification'):
			specification_numbers[item['elem']['selected_specification']['number']] = item['elem']['selected_specification']['number']
		specification_numbers[item['elem']['number']] = item['elem']['number']
	# получение информации о спецификациях, задействованных в заказе
	specifications_struct = specificationmodel.get_list_by(
		{
			'number': {'$in': specification_numbers.values()}
		},
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
	specification_items_cache = {} # контейнер для повторяющихся спеуификаций при построении структуры
	for row in own_calculated_tree:
		if row['elem'].get('selected_specification'):
			row['elem']['selected_specification']['weight_per_unit'] = esudspecificationapi.get_weight(specifications_struct_data[row['elem']['selected_specification']['number']], specification_items_cache)
		elif row['elem']['number'] in specifications_struct_data:
			row['elem']['weight_per_unit'] = esudspecificationapi.get_weight(specifications_struct_data.get(row['elem']['number']), specification_items_cache)
	print 'Time calculate weights is: ', time.clock() - start
	#-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

	# результат
	return {
		'buy_items': buy_calculated_tree,
		'own_items': own_calculated_tree,
		'sorted_sectors': sort_sectors_in_tree(own_calculated_tree)
	}
