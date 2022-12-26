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
		return db.plan_norms_xls_imports.find_one(args, fields)
	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))

def get_list(args=None, fields=None):
	data=[]
	try:
		for d in db.plan_norms_xls_imports.find(args, fields):
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
		cursor = db.plan_norms_xls_imports.find(args, fields).sort([('date', -1)]).skip(page_size*(page-1)).limit(page_size)
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
		return db.plan_norms_xls_imports.find(cond).count()
	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))

def add(data):
	try:
		db.plan_norms_xls_imports.insert(data)
	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))

def update(id, data):
	try:
		db.plan_norms_xls_imports.update({'_id':ObjectId(id)},{'$set':data})
	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))
	return data


def update_multy(filter,data):
	try:
		db.plan_norms_xls_imports.update(filter,{'$set':data},multi=True)
	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))
	return data

def do_aggregate(conditions_arr):
	'''
	Шаблон для выполнения аггрегированных запросов
	'''
	try:
		dataResult = []
		for row in db.plan_norms_xls_imports.aggregate(conditions_arr):
			dataResult.append(row)
		return dataResult
	except pymongo.errors.PyMongoError as e:
		raise Exception("Error! Can't get data: %s" %(str(e)))
