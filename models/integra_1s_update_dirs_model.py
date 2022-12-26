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

def get(args, fields):
	try:
		return db.integra_1s_update_dirs_model.find_one(args, fields)
	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))

def get_list(args=None, fields=None):
	data=[]
	try:
		for d in db.integra_1s_update_dirs_model.find(args, fields):
			data.append(d)
		return data
	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))

def get_list_by_page(args=None, fields = None, page_size=50, page=1):
	'''
		Получение списка объектов по указаной странице.
		По умолчанию сортировка ведется по номеру спецификации
	'''
	data=[]
	try:
		cursor = db.integra_1s_update_dirs_model.find(args, fields).sort([('date', -1)]).skip(page_size*(page-1)).limit(page_size)
		for d in cursor:
			data.append(d)
		return data
	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))

def get_count(cond):
	'''
	Получение количества записей по условию
	'''
	try:
		return db.integra_1s_update_dirs_model.find(cond).count()
	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))

def add(data):
	try:
		db.integra_1s_update_dirs_model.insert(data)
	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))

def update(args, data):
	try:
		db.integra_1s_update_dirs_model.update(args,{'$set':data})
	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))
	return data

def remove(document_number):
	try:
		db.integra_1s_update_dirs_model.remove({'document_number':document_number})
	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))

def update_multy(filter,data):
	try:
		db.integra_1s_update_dirs_model.update(filter,{'$set':data},multi=True)
	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))
	return data

def do_aggregate(conditions_arr):
	'''
	Шаблон для выполнения аггрегированных запросов
	'''
	try:
		dataResult = []
		for row in db.integra_1s_update_dirs_model.aggregate(conditions_arr):
			dataResult.append(row)
		return dataResult
	except pymongo.errors.PyMongoError as e:
		raise Exception("Error! Can't get data: %s" %(str(e)))
