#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route, get, post, put, request, error, abort, response, debug
import datetime, time
from bson.objectid import ObjectId
from libraries import userlib
from models import usermodel, productionordermodel
import routine
from models import countersmodel
from traceback import print_exc
import config

@get('/handlers/purchaseorder/search/')
def search():
	'''
		Получение информации по заданным заданиям на закупку
	'''
	userlib.check_handler_access("purchaseorder","r")
	try:
		return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})
		#return routine.JSONEncoder().encode({'status': 'ok','data':result})
	except Exception, exc:
		print('Error! Get purchase orders info.' + str(exc))
		excType = exc.__class__.__name__
		print_exc()
		return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@get('/handlers/purchaseorder/get_statistic/')
def api_get_purchaseorder_statistic():
	'''
		Статистика по заданиям на закупку
	'''
	userlib.check_handler_access("purchaseorder","r")
	response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=UTF-8'
	response.headers['Content-Type'] = 'application/vnd.ms-excel'
	response.headers['Content-Disposition'] = 'attachment; filename=purchase_orders_'+ datetime.datetime.utcnow().strftime('%d_%m_%Y_%H_%M_%S')+'.xls'
	try:
		param = request.query.decode()
		sectors = [value for value in param['sectors'].split(';')] if param['sectors']!="" else []
		orders = [routine.strToInt(value) for value in param['orders'].split(';')] if param['orders']!="" else []
		data = __get_purchaseorder_statistic(sectors, orders)
		return __make_purchaseorder_statistic(data)
	except Exception, exc:
		excType = exc.__class__.__name__
		print_exc()
		print('Generate purchase order statistic error: ' + str(exc))
		return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@get('/handlers/purchasenorms/get_statistic/')
def api_get_purchasenorms_statistic():
	'''
		Статистика по заданиям на закупку
	'''
	userlib.check_handler_access("purchasenorms","r")
	response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=UTF-8'
	response.headers['Content-Type'] = 'application/vnd.ms-excel'
	response.headers['Content-Disposition'] = 'attachment; filename=purchase_norms_'+ datetime.datetime.utcnow().strftime('%d_%m_%Y_%H_%M_%S')+'.xls'
	try:
		param = request.query.decode()
		#sectors = [value for value in param['sectors'].split(';')] if param['sectors']!="" else []
		sectors = [value for value in param['sectors'].split(';')] if param['sectors']!="" else []
		orders = [routine.strToInt(value) for value in param['orders'].split(',')] if param['orders']!="" else []
		data = __get_purchasenorms_statistic(sectors, orders)
		return __make_purchasenorms_statistic(data)
	except Exception, exc:
		excType = exc.__class__.__name__
		print_exc()
		print('Generate purchase order statistic error: ' + str(exc))
		return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

###--------------------------------------------------------------------------------------------------------------------------------------------
### API функции
###--------------------------------------------------------------------------------------------------------------------------------------------
def __get_purchaseorder_statistic(sectors, orders):
	'''
		Формирование данных для статистики по заданиям на закупку
		sectors - список названий секторов
		orders - список номеров заданий на производство
	'''
	result = []

	# получение спика пользователей
	arrDataUsers = usermodel.get_all()
	dataUsers = {}
	for row in arrDataUsers:
		dataUsers[row['email']] = row;


	# получение списка заказов по заданным критериям
	condition = {}
	if orders and len(orders)>0:
		condition['number'] = {'$in':orders}
	data = productionordermodel.get_list(condition, {'_id':1, 'number':1, 'products':1, 'work_orders':1, 'items_to_buy':1, 'history':1, 'order':1})

	for order in data:
		# сбор информации по нарядам и датам начала работ в нарядах
		g_worders = {}
		for worder in order['work_orders']:
			g_worders[worder['sector']['name']] = {
				'date_start_with_shift': worder['date_start_with_shift'],
				'status': 'Не начата',
				'number': worder['number']
			}
			if worder['status']=='completed':
				g_worders[worder['sector']['name']]['status'] = 'Закончена'
			else:
				for item in worder['items']:
					if len(item.get('fact_work',[]))>0:
						g_worders[worder['sector']['name']]['status'] = 'Начата'
						break

		# формирование выходного элемента
		for item in order['items_to_buy']:
			cur_sector_name = (item['sector']or{}).get('name','Не задан')
			if len(sectors)==0 or  item['to_buy'] and item['to_buy']['value']>0 and cur_sector_name in sectors:
				history_user = dataUsers.get( item['history'][-1]['user'] if len(item.get('history',[]))>0 else order['history'][-1]['user'],'')or{}
				new_item = {
					'order_number': order['order']['number'],
					'production_order_number': order['number'],
					'product_number':  '; '.join([row['number'] for row in order['products']]),
					'sector_number': '',
					'sector_name': cur_sector_name,
					'date_start_with_shift': g_worders.get(cur_sector_name,{}).get('date_start_with_shift', None),
					'item_group': '',
					'item_number': item['number'],
					'item_name': item['name'],
					'unique_props': item.get('unique_props',''),
					'to_buy': item['to_buy'],
					'status': g_worders.get(cur_sector_name,{}).get('status', 'Не начата'),
					'work_order_number': g_worders.get(cur_sector_name,{}).get('number', ''),
					'date_change': item['history'][-1]['date'] if len(item.get('history',[]))>0 else order['history'][-1]['date'],
					'user_fio': history_user.get('fio',''),
					'user_email': history_user.get('email',''),
				}
				result.append(new_item)

	result.sort(key = lambda x: (x['production_order_number'],x['product_number'],x['item_number'],x['sector_number']))
	return result

def __make_purchaseorder_statistic(data):
	'''
		Построение отчета по данным для статистики
	'''
	import StringIO
	from xlrd import open_workbook
	from xlutils.copy import copy as wbcopy
	from xlwt import Workbook, XFStyle, Alignment

	output = StringIO.StringIO()
	wb = Workbook(encoding='utf-8')
	ws = wb.add_sheet('Data')

	date_format = XFStyle()
	date_format.num_format_str = 'dd/mm/yyyy'

	datetime_format = XFStyle()
	datetime_format.num_format_str = 'dd/mm/yyyy HH:MM'

	al1 = Alignment()
	al1.horz = Alignment.HORZ_LEFT
	al1.vert = Alignment.VERT_TOP
	al1.wrap = Alignment.WRAP_AT_RIGHT
	style1 = XFStyle()
	style1.alignment = al1

	#set header------------
	ws.col(0).width = 256 * 20 # номер заказа
	ws.col(1).width = 256 * 20 # номер задания на производство
	ws.col(2).width = 256 * 20 # артикул изготавливаемого изделия
	ws.col(3).width = 256 * 10 # Код участка
	ws.col(4).width = 256 * 25 # наименование участка
	ws.col(5).width = 256 * 20 # дата начала работ на участке
	ws.col(6).width = 256 * 25 # наименование  группы материалов
	ws.col(7).width = 256 * 20 # код материала
	ws.col(8).width = 256 * 45 # материал
	ws.col(9).width = 256 * 25 # индивидуальные характеристики материала
	ws.col(10).width = 256 * 10 # объем на закупку
	ws.col(11).width = 256 * 10 # единицы измерения
	ws.col(12).width = 256 * 10 # статус работы на участке
	ws.col(13).width = 256 * 10 # список нарядов
	ws.col(14).width = 256 * 15 # дата изменения
	ws.col(15).width = 256 * 30 # пользователь внесший изменения

	ws.write(0,0, u"Заказ".encode("utf-8"),style1)
	ws.write(0,1, u"Задание".encode("utf-8"),style1)
	ws.write(0,2, u"Изделие".encode("utf-8"),style1)
	ws.write(0,3, u"Код Участка".encode("utf-8"),style1)
	ws.write(0,4, u"Участок".encode("utf-8"),style1)
	ws.write(0,5, u"Дата начала работ на участке".encode("utf-8"),style1)
	ws.write(0,6, u"Группа материалов".encode("utf-8"),style1)
	ws.write(0,7, u"Код материала".encode("utf-8"),style1)
	ws.write(0,8, u"Материал".encode("utf-8"),style1)
	ws.write(0,9, u"Инд. характеристики".encode("utf-8"),style1)
	ws.write(0,10, u"Объем на закупку".encode("utf-8"),style1)
	ws.write(0,11, u"Ед. изм.".encode("utf-8"),style1)
	ws.write(0,12, u"Статус работ по участку".encode("utf-8"),style1)
	ws.write(0,14, u"Дата изменений".encode("utf-8"),style1)
	ws.write(0,13, u"Номер наряда".encode("utf-8"),style1)
	ws.write(0,15, u"Пользователь".encode("utf-8"),style1)

	rowIndex = 1
	for row in data:
		ws.write(rowIndex, 0, row['order_number'])
		ws.write(rowIndex, 1, str(row['production_order_number']) )
		ws.write(rowIndex, 2, str(row['product_number']))
		ws.write(rowIndex, 3, row['sector_number'])
		ws.write(rowIndex, 4, row['sector_name'],style1)
		ws.write(rowIndex, 5, row['date_start_with_shift'], date_format)
		ws.write(rowIndex, 6, row['item_group'])
		ws.write(rowIndex, 7, row['item_number'] )
		ws.write(rowIndex, 8, row['item_name'], style1)
		ws.write(rowIndex, 9, row['unique_props'], style1)
		ws.write(rowIndex, 10, row['to_buy']['value'])
		ws.write(rowIndex, 11, row['to_buy']['unit'])
		ws.write(rowIndex, 12, row['status'])
		ws.write(rowIndex, 13, row['work_order_number'])
		ws.write(rowIndex, 14, row['date_change'] +  datetime.timedelta(hours=routine.moscow_tz_offset),datetime_format)
		ws.write(rowIndex, 15, row['user_fio'] + ' ('+row['user_email']+')',style1)
		rowIndex+=1
	wb.save(output)
	output.seek(0)
	return output.read()

def __get_purchasenorms_statistic(sectors, orders):
	'''
		Формирование данных для статистики по нормам на закупку
		sectors - список названий секторов
		orders - список номеров заданий на производство
	'''
	result = []

	# получение спика пользователей
	arrDataUsers = usermodel.get_all()
	dataUsers = {}
	for row in arrDataUsers:
		dataUsers[row['email']] = row;


	# получение списка заказов по заданным критериям
	condition = {}
	if orders and len(orders)>0:
		condition['number'] = {'$in':orders}
	data = productionordermodel.get_list(condition, {'_id':1, 'number':1, 'products':1, 'work_orders':1, 'items_to_buy':1, 'history':1, 'order':1})

	for order in data:
		# # сбор информации по нарядам и датам начала работ в нарядах
		# g_worders = {}
		# for worder in order['work_orders']:
		# 	g_worders[worder['sector']['name']] = {
		# 		'date_start_with_shift': worder['date_start_with_shift'],
		# 		'status': 'Не начата',
		# 		'number': worder['number']
		# 	}
		# 	if worder['status']=='completed':
		# 		g_worders[worder['sector']['name']]['status'] = 'Закончена'
		# 	else:
		# 		for item in worder['items']:
		# 			if len(item.get('fact_work',[]))>0:
		# 				g_worders[worder['sector']['name']]['status'] = 'Начата'
		# 				break

		# формирование выходного элемента
		for item in order['items_to_buy']:
			cur_sector_name = (item['sector']or{}).get('name','Не задан')
			# if len(sectors)==0 or  item['to_buy'] and item['to_buy']['value']>0 and cur_sector_name in sectors:
			if item['to_buy'] and item['to_buy']['value']>0:
				history_user = dataUsers.get( item['history'][-1]['user'] if len(item.get('history',[]))>0 else order['history'][-1]['user'],'')or{}
				new_item = {
					'order_number': order['order']['number'],
					'production_order_number': order['number'],
					'product_number':  '; '.join([row['number'] for row in order['products']]),
					#'sector_number': '',
					#'sector_name': cur_sector_name,
					#'date_start_with_shift': g_worders.get(cur_sector_name,{}).get('date_start_with_shift', None),
					'item_group': '',
					'item_number': item['number'],
					'item_name': item['name'],
					'unique_props': item.get('unique_props',''),
					'to_buy': item['to_buy'],
					#'status': g_worders.get(cur_sector_name,{}).get('status', 'Не начата'),
					#'work_order_number': g_worders.get(cur_sector_name,{}).get('number', ''),
					#'date_change': item['history'][-1]['date'] if len(item.get('history',[]))>0 else order['history'][-1]['date'],
					#'user_fio': history_user.get('fio',''),
					#'user_email': history_user.get('email',''),
				}
				result.append(new_item)

	result.sort(key = lambda x: (x['production_order_number'],x['product_number'],x['item_number']))
	return result

def __make_purchasenorms_statistic(data):
	'''
		Построение отчета по данным для статистики
	'''
	import StringIO
	from xlrd import open_workbook
	from xlutils.copy import copy as wbcopy
	from xlwt import Workbook, XFStyle, Alignment

	output = StringIO.StringIO()
	wb = Workbook(encoding='utf-8')
	ws = wb.add_sheet('Data')

	date_format = XFStyle()
	date_format.num_format_str = 'dd/mm/yyyy'

	datetime_format = XFStyle()
	datetime_format.num_format_str = 'dd/mm/yyyy HH:MM'

	al1 = Alignment()
	al1.horz = Alignment.HORZ_LEFT
	al1.vert = Alignment.VERT_TOP
	al1.wrap = Alignment.WRAP_AT_RIGHT
	style1 = XFStyle()
	style1.alignment = al1

	#set header------------
	ws.col(0).width = 256 * 20 # номер заказа
	ws.col(1).width = 256 * 20 # номер задания на производство
	ws.col(2).width = 256 * 20 # артикул изготавливаемого изделия
	ws.col(3).width = 256 * 20 # код материала
	ws.col(4).width = 256 * 45 # материал
	ws.col(5).width = 256 * 25 # индивидуальные характеристики материала
	ws.col(6).width = 256 * 10 # объем на закупку
	ws.col(7).width = 256 * 10 # единицы измерения

	#ws.col(8).width = 256 * 15 # Ед. объема
	ws.col(9).width = 256 * 15 # Чистый расход
	ws.col(10).width = 256 * 15 # Объем со склада
	ws.col(11).width = 256 * 15 # Отход, всего
	ws.col(12).width = 256 * 15 # Отход, возвратный
	ws.col(13).width = 256 * 15 # Отход, невозвратный
	ws.col(14).width = 256 * 15 # Объем потребности
	#ws.col(15).width = 256 * 15 # Кол. шт.


	ws.write(0,0, u"Заказ".encode("utf-8"),style1)
	ws.write(0,1, u"Задание".encode("utf-8"),style1)
	ws.write(0,2, u"Изделие".encode("utf-8"),style1)
	ws.write(0,3, u"Код материала".encode("utf-8"),style1)
	ws.write(0,4, u"Материал".encode("utf-8"),style1)
	ws.write(0,5, u"Инд. характеристики".encode("utf-8"),style1)
	ws.write(0,6, u"Норма расхода".encode("utf-8"),style1)
	#ws.write(0,7, u"Ед. изм.".encode("utf-8"),style1)

	ws.write(0,7, u"Ед. объема".encode("utf-8"),style1)
	ws.write(0,8, u"Чистый расход".encode("utf-8"),style1)
	ws.write(0,9, u"Объем со склада".encode("utf-8"),style1)
	ws.write(0,10, u"Отход, всего".encode("utf-8"),style1)
	ws.write(0,11, u"Отход, возвратный".encode("utf-8"),style1)
	ws.write(0,12, u"Отход, невозвратный".encode("utf-8"),style1)
	ws.write(0,13, u"Объем потребности".encode("utf-8"),style1)
	ws.write(0,14, u"Кол. шт.".encode("utf-8"),style1)

	rowIndex = 1
	for row in data:
		ws.write(rowIndex, 0, row['order_number'])
		ws.write(rowIndex, 1, str(row['production_order_number']) )
		ws.write(rowIndex, 2, str(row['product_number']))
		ws.write(rowIndex, 3, row['item_number'] )
		ws.write(rowIndex, 4, row['item_name'], style1)
		ws.write(rowIndex, 5, row['unique_props'], style1)
		ws.write(rowIndex, 6, row['to_buy'].get('vol_by_norm',0) + row['to_buy'].get('vol_not_returned_waste',0))
		ws.write(rowIndex, 7, row['to_buy']['unit'])

		ws.write(rowIndex, 8, row['to_buy'].get('vol_by_norm',0))
		ws.write(rowIndex, 9, row['from_stock']['value'] if row.get('from_stock') else 0)
		ws.write(rowIndex, 10, row['to_buy'].get('vol_full_waste',0))
		ws.write(rowIndex, 11, row['to_buy'].get('vol_returned_waste',0))
		ws.write(rowIndex, 12, row['to_buy'].get('vol_not_returned_waste',0))
		ws.write(rowIndex, 13, row['to_buy'].get('value',0))
		ws.write(rowIndex, 14, row['to_buy'].get('vol_amount',0))
		rowIndex+=1
	wb.save(output)
	output.seek(0)
	return output.read()
