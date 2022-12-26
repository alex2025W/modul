#!/usr/bin/python
# -*- coding: utf-8 -*-

import datetime
import bson
from bson.objectid import ObjectId
from libraries import userlib
from models import  stockmodel
from models import countersmodel
import routine
import config
from traceback import print_exc


def get_data_by_date(search_date_utc):
	'''
	Получение данных склада по дате
	'''
	try:
		# получение данных с сервера
		data = stockmodel.get_list({'history.date':{'$lte': search_date_utc}}, None)

		result = []
		# отбор данных по дате и группировка по спецификациям и статусам
		for row in data:
			tmp_item =  {
					'volume_by_plan': 0, # по плану
					'volume_in_develop': 0, # в производстве
					'volume_in_use': 0, # использовано
					'volume_received': 0, # получено на склад
					'item': row['item'],
					'unit': row['count']['unit'],
					'order': row.get('order'),
					'production_order': row.get('production_order'),
					'use_history': []
			}

			# сортировка истории по дате
			row['history'].sort(key = lambda x: (x['date']))
			# выбор из истории позиций со статусом = used
			use_history = [x for x in row['history'] if x['status'] == 'used']
			tmp_item['use_history'] =  use_history
			# если были движения по позиции, то смотрим объемы этого движения
			# иначе берем плановый объем
			if len(row.get('remains'))>0:
				# сортировка статусов по дате
				row['remains'].sort(key = lambda x: (x['date']))
				# получение статуса, соответсвующего условной дате
				today_status = {}
				prev_status = {}
				if len(row['remains'])>1:
					i=1
					while i < len(row['remains']):
						if search_date_utc>=row['remains'][i-1]['date'] and search_date_utc<row['remains'][i]['date']:
							today_status = row['remains'][i-1]
							try:
								prev_status = row['remains'][i-2]
							except:
								prev_status = {}
								pass
							break
						i+=1
					if not today_status:
						today_status =  row['remains'][len(row['remains'])-1]
						try:
							prev_status = row['remains'][len(row['remains'])-2]
						except:
							prev_status = {}
							pass
				elif len(row['remains'])>0:
					today_status = row['remains'][0]

				# # сортировка итории по драте
				# # если в ситории нет использования объемов, то принимаем текущий объем за фактический
				# # иначе по истории вычисляем объем на условную дату
				# today_volume = 0
				# if len(row['history'])>0:
				# 	row['history'].sort(key = lambda x: (x['date']))
				# 	# получение элемента истории, соответсвующего условной дате
				# 	today_hitem = None
				# 	prev_hitem = None
				# 	if len(row['history'])>1:
				# 		i=1
				# 		while i < len(row['history']):
				# 			if search_date_utc>=row['history'][i-1]['date'] and search_date_utc<row['history'][i]['date']:
				# 				today_hitem = row['history'][i-1]
				# 				try:
				# 					prev_hitem = row['history'][i-2]
				# 				except:
				# 					prev_hitem = {}
				# 					pass
				# 				break
				# 			i+=1
				# 		if not today_hitem:
				# 			today_hitem =  row['history'][len(row['history'])-1]
				# 			try:
				# 				prev_hitem = row['history'][len(row['history'])-2]
				# 			except:
				# 				prev_hitem = {}
				# 				pass
				# 	elif len(row['history'])>0:
				# 		today_hitem = row['history'][0]

				# 	if today_hitem:
				# 		today_volume = today_hitem['current_full_value']
				# else:
				# 	today_volume = row['count']['value']

				# # посдчет объема
				# if today_status['status'] =='develop':
				# 	result[row['item']['number']]['volume_in_develop']+=today_volume
				# elif today_status['status'] =='used':
				# 	result[row['item']['number']]['volume_in_use']+=today_volume


				tmp_item['volume_in_develop']+=today_status['develop_value']
				tmp_item['volume_received']+=today_status['received_value']
				tmp_item['volume_in_use']+=today_status['used_value']
				tmp_item['volume_by_plan']+=today_status['value']
			else:
				tmp_item['volume_by_plan']+=row['count']['value']

			result.append(tmp_item)

		result.sort(key = lambda x: (x['item']['number']))
		return result
	except Exception, exc:
		excType = exc.__class__.__name__
		print_exc()
		raise Exception(str(exc))
