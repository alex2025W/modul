#!/usr/bin/python
# -*- coding: utf-8 -*-

class StockManager:
	'''
		Класс для управления складскими объемами в вычислениях
	'''
	@staticmethod
	def calculate_stock_volume(elem, stock_items, need_vol=10000):
		'''
			Функция отбора требуемого объема от складского элемента.
			На вход подается элемент для которого требуется проверка на складе, а также список складских позиций.
			Организуется цикл по складским позициям, пока не наберется нужный объем или не закончатся позиции
			elem - элемент для которого требуется подборка со склада
			stock_items - список складских элементов в формате: [item['_id]] = item
			(содержит только объемы подходящие для текущего элемента) stock_items = stock.get(str(elem['_id']),[])
			need_vol - требуемый объем, по умолчанию задано максимальное значение
		'''
		if need_vol>0:
			for s_i in stock_items:
				if s_i['count'].get('current_value',0)>0:
					# если объем со склада может браться частями
					if s_i.get('can_be_divided'):
						if need_vol >= s_i['count']['current_value']:
							elem['count_from_stock']['value'] += s_i['count']['current_value']
							elem['count_from_stock']['items'].append({
								'_id': s_i['_id'],
								'value': s_i['count']['current_value']
							})
							s_i['count']['current_value'] = 0
						else:
							elem['count_from_stock']['value'] += need_vol
							elem['count_from_stock']['items'].append({
								'_id': s_i['_id'],
								'value': need_vol
							})
							s_i['count']['current_value'] = s_i['count']['current_value']- need_vol
					else:
						if need_vol >= s_i['count']['current_value']:
							elem['count_from_stock']['value'] += s_i['count']['current_value']
							elem['count_from_stock']['items'].append({
								'_id': s_i['_id'],
								'value': s_i['count']['current_value']
							})
							s_i['count']['current_value'] = 0
				# прекращаем смотреть на складе, если достигли требуемого объема
				if elem['count_from_stock']['value']>= need_vol:
					break

