#!/usr/bin/python
# -*- coding: utf-8 -*-
import config
import json
import pymongo
import datetime, time
from bson.objectid import ObjectId
from bson.binary import Binary
import bson
import routine
db = config.db

##################
# Модель для работы с КЭШ жданными по конфигурациям
# КЭШ состоит из полностью собрабнной фонфигурации
##################

def get_empy():
	'''
	Получение списка номеров конфигруаций для которых требыется перестроить КЭШ
	'''
	res = []
	for row in db.configuration_data_cache.find({'zip_data': None},{ 'number':1}):
		res.append(row['number'])
	return res

def get(number):
	'''
	Получение КЭШа структурированных данных
	number - номер конфигурации
	'''
	try:
		row = db.configuration_data_cache.find_one({'number': number})
		if row and row.get('zip_data'):
			return routine.JSONDecode(routine.decompress(row['zip_data'] ))
		else:
			raise Exception('--Cahce data for : {0} is not exists'.format(number))
	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))

def update(number, data):
	'''
	Обновление КЭШ данных. Внутри функции происходит преобразоване данных к JSON и их архивация
	number - номер конфигурации
	data - данные по конфигурации
	'''
	try:
		data = { 'zip_data': Binary(routine.compress(routine.JSONEncoder().encode(data))), 'date': datetime.datetime.utcnow()}
		db.configuration_data_cache.update({'number': number},{'$set':data}, upsert=True)
	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))

def clear():
	'''
	Сброс КЭШа всех конфигураций
	'''
	try:
		db.configuration_data_cache.update({},{'$set':{'zip_data':None}},multi=True)
	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))


