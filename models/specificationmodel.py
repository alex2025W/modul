#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import error, abort
import config
import routine
import json
import pymongo
import datetime, time
import re
from bson.objectid import ObjectId
import bson
db = config.db


def get_all():
	'''
	Получение списка активных спецификаций
	'''
	try:
		data = []
		for d in db.specification.find({'status':{'$ne':'del'}}):
			data.append(d)
		return data
	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))

def add(data):

	try:
		db.specification.insert(data)
	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))
	return data

def remove(id):
	try:
		db.specification.update({'_id':ObjectId(id)},{'$set':{'status':'del'}})
	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))
	return True

def remove_multi(filter):
	try:
		db.specification.update(filter,{'$set':{'status':'del'}},multi=True)
	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))
	return True

def update(id, data, need_rebuild_specification_struct = True):
	try:
		print('RUN update specification: {0}'.format(id))

		if '_id' in data:
			del data['_id']
		# обновить спецификацию
		db.specification.update({'_id':ObjectId(id)}, {'$set': data})
		data['_id'] = ObjectId(id)

		# пересбор КЭШей структур  спецификаций, в которых была задействована текущая
		specs_numbers = []
		if need_rebuild_specification_struct:
			for row in db.specification.find({'include._id': ObjectId(id)}, {'number':1}):
				specs_numbers.append(row['number'])
			# сбросить КЭШ спецификаций, включающие текущую
			db.specification.update({'include._id': ObjectId(id)},{'$set':{'struct':'', 'include': [] }},multi=True)
			if len(specs_numbers)>0:
				if config.use_worker:
					config.qu_low.enqueue_call(func=rebuild_specification_struct_cache, args=(specs_numbers,))
				else:
					rebuild_specification_struct_cache(specs_numbers)
	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))
	return data

def update_by(args, data):
	try:
		db.specification.update(args,{'$set':data})
	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))

def update_multy(filter,data):
	try:
		db.specification.update(filter,{'$set':data},multi=True)
	except pymongo.errors.OperationFailure:
		abort(400, "Operation failure")
	except pymongo.errors.PyMongoError as e:
		abort(400, "server_error")
	return data

def get_short(args):
	'''
	Функция получения основной информации об объекте без учеа вложенностей
	'''
	data=[]
	fields ={
		'_id' : 1,
		'sector' : 1,
		'model_id' : 1,
		'name' : 1,
		'vol_tolerance' : 1,
		'tolerance_on_vol' : 1,
		'routine' : 1,
		'count' : 1,
		'number' :1,
		'vol_count' :1,
		'config_id' :1,
		'vol_per_unit' : 1,
		'operations':1,
		'is_buy' : 1,
		'config_number' : 1,
		'specification_key_hash' : 1,
		'properties' :1,
		'is_separate':1,
		'note': 1,
		'history': 1,
		'first_level_items':1
	}
	try:
		for d in db.specification.find(args, fields).sort([('name', 1)]):
			data.append(d)
		return data
	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))

def get_by_id(id, fields = {'calculation':0}):
	try:
		spec =  db.specification.find_one({'_id':ObjectId(id)}, fields)
		# обновление кэша структуры спецификации, если есть запрос по нему и он еще не создан
		if not spec.get('struct'):
			struct_info = get_specification_struct(spec['number'])
			spec['struct'] = routine.JSONEncoder().encode(struct_info['struct'])
			spec['include'] = struct_info['include']
		return spec

	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))

def get_by(args=None, fields = {'calculation':0}):
	'''
		Получение информации о требуемом объете по заданным параметрам
	'''
	try:
		spec =  db.specification.find_one(args, fields)
		# обновление кэша структуры спецификации, если есть запрос по нему и он еще не создан
		if spec and fields and 'struct' in fields and not spec.get('struct'):
			struct_info = get_specification_struct(spec['number'])
			spec['struct'] = routine.JSONEncoder().encode(struct_info['struct'])
			if 'include' in fields:
				spec['include'] = struct_info['include']
		return spec
	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))

def get_list_by(args=None, fields = {'history':0, 'calculation':0}):
	'''
		Получение списка объектов по заданным параметрам
	'''
	data=[]
	try:
		for spec in db.specification.find(args, fields).sort([('number', 1)]):
			# обновление кэша структуры спецификации, если есть запрос по нему и он еще не создан
			if spec and fields and 'struct' in fields and not spec.get('struct'):
				struct_info = get_specification_struct(spec['number'])
				spec['struct'] = routine.JSONEncoder().encode(struct_info['struct'])
				if 'include' in fields:
					spec['include'] = struct_info['include']
			data.append(spec)
		return data
	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))

def get_list_by_page(args=None, fields = {'history':0, 'calculation':0}, page_size=50, page=1):
	'''
		Получение списка объектов по указаной странице.
		По умолчанию сортировка ведется по номеру спецификации
	'''
	data=[]
	try:
		cursor = db.specification.find(args, fields).sort([('deep', -1),('number', 1)]).skip(page_size*(page-1)).limit(page_size)
		for spec in cursor:
			# обновление кэша структуры спецификации, если есть запрос по нему и он еще не создан
			if spec and fields and 'struct' in fields and not spec.get('struct'):
				struct_info = get_specification_struct(spec['number'])
				spec['struct'] = routine.JSONEncoder().encode(struct_info['struct'])
				if 'include' in fields:
					spec['include'] = struct_info['include']
			data.append(spec)
		return data
	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))

def get_count(cond):
	try:
		return db.specification.find(cond).count()
	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))

def do_aggregate(conditions_arr):
	try:
		dataResult = []
		for row in db.specification.aggregate(conditions_arr):
			dataResult.append(row)
		return dataResult
	except pymongo.errors.PyMongoError as e:
		raise Exception("Error! Can't get data: %s" %(str(e)))

def get_specification_struct(number):
	'''
		Получение заполненной структуры спецификации
		number - номер спецификации
		count - требуемый объем
		result = []
	'''
	from copy import deepcopy,copy
	import datetime, time, routine

	### локальная функция построения дерева спецификации
	### построение рекурсивное
	def prepare_specification_struct(include_objects, number):
		result = []
		if number not in include_objects:
			row = db.specification.find_one({'number': number}, {'_id':1, 'name':1, 'number':1, 'group':1, 'count':1, 'vol_tolerance':1, 'tolerance_on_vol':1, 'vol_count':1, 'first_level_items':1, 'is_buy': 1})
			include_objects[row['number']] = row
		else:
			row = include_objects[number]

		if row and 'first_level_items' in row:
			for item in row['first_level_items']:
				tmp_elem = {
					'_id': item['_id'],
					'name': item['name'],
					'number': item['number'],
					'group': item.get('group', []),
					'is_buy': item.get('is_buy', False), # покупное изделие
					'count': {
						'unit': item['count']['unit'],
						#'value': item['count']['value'] * count,
						'value': item['count']['value'],
						'unit_origin_id': item['count']['unit_origin_id']
					},
					'vol_tolerance': deepcopy(item['vol_tolerance']) if item.get('vol_tolerance') else  {'value': None,'unit': None,'unit_origin_id':  None, 'value_origin_id': None},
					'tolerance_on_vol': deepcopy(item['tolerance_on_vol']) if item.get('tolerance_on_vol') else  {'value': None,'unit': None,'unit_origin_id':  None, 'value_origin_id': None},
					'vol_count': deepcopy(item['vol_count']) if item.get('vol_count') else {'value': None,'unit': None,'unit_origin_id':  None, 'value_origin_id': None},

					# 'items': prepare_specification_struct(include_objects, item['number'], item['count']['value'] * count)
					'items': prepare_specification_struct(include_objects, item['number'])
				}
				result.append(tmp_elem)
		return result
	try:
		start = time.clock()
		# результирующий список спецификаций
		include_objects = {}
		struct = routine.JSONEncoder().encode({'items': prepare_specification_struct(include_objects, number)})
		include_res = []

		for i in include_objects:
			if include_objects[i]['number'] != number:
				include_res.append({
					'_id': include_objects[i]['_id'],
					'number': include_objects[i]['number'],
					'name': include_objects[i]['name']
				})

		db.specification.update({'number':number},{'$set': {
			'struct': struct,
			'include': include_res
			}})

		print "Time get_specification_struct for {0} is {1}: ".format(number, time.clock() - start)

		return {'struct':  routine.JSONDecode(struct), 'include': include_res}
	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))

def clear_specs_struct(number):
	'''
		Очистка КЭШ  спецификаций, включающие в своей структуре указанную
		number - номер родительской спецификации, по которому происходит поиск
	'''
	try:
		# пересбор КЭШей структур  спецификаций, в которых была задействована текущая
		specs_numbers = []
		for row in db.specification.find({'include.number': number}, {'number':1}):
			specs_numbers.append(row['number'])
		update_multy({'include.number': number}, {'struct':'', 'include': [] })
		if len(specs_numbers)>0:
			if config.use_worker:
				config.qu_low.enqueue_call(func=rebuild_specification_struct_cache, args=(specs_numbers,))
			else:
				rebuild_specification_struct_cache(specs_numbers)

	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))

def rebuild_specification_struct_cache(numbers = []):
	'''
	Функция перестроения кэшей спецификаций, которые включают в себя указанные в параметрах.
	Смысл заключается в тоим, что если поменяли спецификацию, которая входила в более крупную спецификацию, то
	для данной крупной спецификации необходимо перестроить КЭШ ее структуры с у четом измененых детей.
	id - string
	number-string
	{'include._id': ObjectId(id)} или {'include.number': number}
	'''
	print('RUN rebuild_specification_struct_cache')

	# start = time.clock()
	# # номера спецификаций на перестроение КЭШЕЙ
	# specs_numbers = []
	# if id:
	# 	for row in db.specification.find({'include._id': ObjectId(id)}, {'number':1}):
	# 		specs_numbers.append(row['number'])
	# if number:
	# 	for row in db.specification.find({'include.number': number}, {'number':1}):
	# 		specs_numbers.append(row['number'])

	# print(specs_numbers)

	for number in numbers:
		start = time.clock()
		print "rebuild_specifications_cache for: {0} = {1}".format(number, str(time.clock() - start))
		get_specification_struct(number)

	print "Finish rebuild_specifications_cache "


