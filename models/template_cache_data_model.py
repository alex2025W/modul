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
# Модель для работы с КЭШ данными по шаблонам раскроя
# КЭШ состоит из полностью собранного шаблона
##################

def get_list(filter=None,fields=None):
	'''
		Получение списка обхектов
	'''
	try:
		res = []
		for row in db.template_data_cache.find(filter,fields):
			res.append(row)
		return res
	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))

def add_multy(items):
	'''
	Добавление сформированных шаблонов в КЭШ
	items - список объектов на добавление
	'''
	try:
		# очистка всех шаблонов, чтобы избежать дубликаты
		clear()
		# добавление новых
		db.template_data_cache.insert(items)
	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))

def clear():
	'''
		Сброс КЭШа всех шаблонов
	'''
	try:
		db.template_data_cache.remove({})
	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))


