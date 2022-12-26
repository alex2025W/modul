#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route, get, post, put, request, error, abort, response, debug, delete
import datetime, time, routine, config
from libraries import userlib
from traceback import print_exc
import StringIO
@post('/handlers/productionorder/add')
def save_production_order():
	'''
		Сохранение нового задания на производство
	'''
	from apis.esud import esudproductionorderapi
	from apis.contract import contractapi

	from models import contractmodel
	userlib.check_handler_access('esud_specification_calculation','w')
	usr = userlib.get_cur_user()
	try:
		data = request.json
		if not data or len(data)==0:
			raise Exception("Ошибка сохранения. Нет данных на сохранение.")
		# проверка на обязательный номер заказа
		if not data['order_number']:
			raise Exception("Ошибка сохранения. Не задан номер заказа.")
		order_number_items  = data['order_number'].split('.')
		if len(order_number_items)<3:
			raise Exception("Ошибка сохранения. Неверный формат номера заказа.")
		# проверка, что все части заказа это целые числа
		for i in order_number_items:
			if not routine.strIsInt(i):
				raise Exception("Ошибка сохранения. Неверный формат номера заказа.")

		# проверка на существование такого заказа
		if not contractapi.contract_has_production(routine.strToInt(order_number_items[0]), routine.strToInt(order_number_items[1]), routine.strToInt(order_number_items[2])):
			raise Exception("Ошибка сохранения. Указанный заказ не найден.")

		data['order_number_items'] = order_number_items;
		# вызов функции сохранения
		result = esudproductionorderapi.add_production_order(data, usr)
		# возврат результата
		return routine.JSONEncoder().encode({'status': 'ok', 'data': result})
	except Exception, exc:
		excType = exc.__class__.__name__
		print_exc()
		print(str(exc))
		return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})
