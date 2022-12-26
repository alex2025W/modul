#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import error, abort
import config
import json
import pymongo
import datetime, time
import re
from bson.objectid import ObjectId
import bson
db = config.db

#--------------------------------------------------------------------
# {
# 	'_id': 						// id складской единицы
# 	'can_be_divided': ,		// может делиться (yes/no)
# 	# информация о задании на проивзодство(откуда возникло изделие)
# 	'production_orders':[{
# 		'_id': 					// id задания на производство(калькуляция)
# 		'number': 				// номер задания на производство(калькуляция)
# 	}],
# 	# информация о заказе
# 	'order':{
# 		'product_unit_number': // номер единицы продукции
# 		'number" 				 // номер заказа: "1.12.1"
# 		'product_number" 		// номер продукта
# 		'contract_number" 	// номер контракта
#	},
# 	# описание спецификации
# 	'item':{
# 		'_id'					// идентификатор спецификации
# 		'number' 				// артикул спецификации
# 		'name'					// название спецификации
# 	},
# 	# объект, пописывающий текущий объем по данной спецификации
# 	'count': {
# 		'unit': 					// единица измерения
# 		'value': 				// объем по расчетам
# 		'current_value': 		// текущее значение (рассчитывается)
# 		'received_value': 		// исполненный(полученный) объем
# 		'develop_value': 		// объем в производстве
# 		'used_value': 			// использованный объем
# 	},
# 	# история изменения объемов
# 	'history':[{
# 		'_id': 					//
# 		'value': 				// текущее плановое значение
# 		'current_value': 		// текущее значение
# 		'note': 					// пометка
# 		'production_order':	// информация о расчете
# 		'order': 				// информация о заказе
# 		'item': {
# 			'spec_id': 			// id спецификации
# 			'spec_number': 	// номер спецификации
# 		},
# 		'user' : 					// пользователь внесший изменение
# 		'date' : 					//дата изменения
# 		'status': 				// статус - [order, used, develop, received]
# 	}],
# 	# история актуальных остатков, при каждом изменении любыъх объемов, данное изменение попадает в историю остатков
#	# по данной истории мы в последствии рассчитываем актуальные остатки на конкретную дату
# 	'remains':[{
# 		"_id" : 					//
# 		"date" : 				// дата изменения объема
# 		'value': 				// объем по расчетам
# 		'current_value': 		// текущее значение (рассчитывается)
# 		'received_value': 		// исполненный(полученный) объем
# 		'develop_value': 		// объем в производстве
# 		'used_value': 			// использованный объем
# 		"user" : 				// пользователь, внесший изменение
#	}]
# }
#-------------------------------------------------------------------
#-------------------------------------------------------------------
# Доступные статусы по истории
# order - заказанный объем
# used - использованный объем
# develop - объем в производстве
# received - оприходованный объем
#-------------------------------------------------------------------

def get(args, fields):
	try:
		return db.stock.find_one(args, fields)
	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))

def get_list(args, fields=None):
	data=[]
	try:
		for d in db.stock.find(args, fields):
			data.append(d)
		return data
	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))

def add(data):
	try:
		db.stock.insert(data)
	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))

def update(id, data):
	try:
		db.stock.update({'_id':ObjectId(id)},{'$set':data})
	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))
	return data


def update_multy(filter,data):
	try:
		db.stock.update(filter,{'$set':data},multi=True)
	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))
	return data

def do_aggregate(conditions_arr):
	'''
	Шаблон для выполнения аггрегированных запросов
	'''
	try:
		dataResult = []
		for row in db.stock.aggregate(conditions_arr):
			dataResult.append(row)
		return dataResult
	except pymongo.errors.PyMongoError as e:
		raise Exception("Error! Can't get data: %s" %(str(e)))

def get_actual_volumes(spec_ids = None, stock_order_number = None):
	'''
	Получение актуальных объемов по заданным идентификаторам спецификаций
	spec_ids - список идентификаторов требуемых спецификаций
	stock_order_number - номер заказа, в рамках которого получаются актуальные объемы
	'''
	data=[]
	try:
		#condition = {'item._id':{'$in':[str(id) for id in spec_ids]}, 'count.current_value': {'$gt':0}}
		condition = {'count.current_value': {'$gt':0}}
		# если задан список идентификаторов спецификаций
		if spec_ids and len(spec_ids)>0:
			condition['item._id'] = {'$in':[str(id) for id in spec_ids]}
		# если задано номер заказа
		if stock_order_number:
			condition['order.number'] = stock_order_number
		fields = {'_id' : 1, 'can_be_divided' : 1, 'item' : 1, 'production_order' : 1, 'production_orders' : 1, 'count' : 1, 'order':1, 'remains':1}
		for d in db.stock.find(condition, fields):
			data.append(d)
		return data
	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))

def get_volumes(ids):
	'''
	Получение актуальных объемов по заданным идентификаторам спецификаций
	spec_ids - список идентификаторов требуемых спецификаций
	'''
	data=[]
	try:
		condition = {'_id':{'$in':ids}}
		fields = {'_id' : 1, 'can_be_divided' : 1, 'item' : 1, 'production_order' : 1, 'production_orders' : 1, 'count' : 1, 'history':1, 'order':1, 'remains':1}
		for d in db.stock.find(condition, fields):
			data.append(d)
		return data
	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))
