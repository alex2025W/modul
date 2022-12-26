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

def get_all():
	'''
	Получение списка активных объектов
	'''
	try:
		data = []
		for d in db.complect.find({'status':{'$ne':'del'}}):
			data.append(d)
		return data
	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))

def add(data):
	try:
		db.complect.insert(data)
	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))
	return data

def remove(id):
	try:
		db.complect.update({'_id':ObjectId(id)},{'$set':{'status':'del'}})
	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))
	return True

def remove_multi(filter):
	try:
		db.complect.update(filter,{'$set':{'status':'del'}},multi=True)
	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))
	return True

def update(id, data):
	try:
		db.complect.update({'_id':ObjectId(id)},data)
	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))
	return data


def update_multy(filter,data):
	try:
		db.complect.update(filter,{'$set':data},multi=True)
	except pymongo.errors.OperationFailure:
		abort(400, "Operation failure")
	except pymongo.errors.PyMongoError as e:
		abort(400, "server_error")
	return data

def get_by_id(id):
	try:
		return db.complect.find_one({'_id':ObjectId(id)})
	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))

def get_by(args=None, fields = None):
	'''
		Получение информации о требуемом объете по заданным параметрам
	'''
	try:
		return db.complect.find_one(args, fields)
	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))

def get_list_by(args=None, fields = None):
	'''
		Получение списка объектов по заданным параметрам
	'''
	data=[]
	try:
		for d in db.complect.find(args, fields).sort([('number', 1)]):
			data.append(d)
		return data
	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))

def get_list_by_page(args=None, fields = None, page_size=50, page=1):
	'''
		Получение списка объектов по указаной странице.
		По умолчанию сортировка ведется по номеру объекта
	'''
	data=[]
	try:
		cursor = db.complect.find(args, fields).sort([('deep', -1),('number', 1)]).skip(page_size*(page-1)).limit(page_size)
		for d in cursor:
			data.append(d)
		return data
	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))

def get_count(cond):
	try:
		return db.complect.find(cond).count()
	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))

def do_aggregate(conditions_arr):
	try:
		dataResult = []
		for row in db.complect.aggregate(conditions_arr):
			dataResult.append(row)
		return dataResult
	except pymongo.errors.PyMongoError as e:
		raise Exception("Error! Can't get data: %s" %(str(e)))
