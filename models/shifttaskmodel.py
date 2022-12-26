#!/usr/bin/python
# -*- coding: utf-8 -*-
#
# Сменные задания
#
from bottle import error, abort
import config
import json
import pymongo
import datetime, time
import re
from bson.objectid import ObjectId
import bson
db = config.db

def get(args, fields=None):
	try:
		return db.shift_task.find_one(args, fields)
	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))

def get_list(args, fields= None):
	data=[]
	try:
		for d in db.shift_task.find(args, fields):
			data.append(d)
		return data
	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))

def add(data):
	try:
		db.shift_task.insert(data)
	except pymongo.errors.OperationFailure as e:
		raise Exception(str(e))
	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))

def update_by_id(id, data):
	try:
		db.shift_task.update({'_id':ObjectId(id)},{'$set':data})
	except pymongo.errors.OperationFailure:
		raise Exception(str(e))
	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))
	return data

def update(cond, data, insert_if_notfound=True, multi_update=False):
	""" update workorder """
	try:
		db.shift_task.update(cond, data, upsert=insert_if_notfound,multi=multi_update)
	except pymongo.errors.OperationFailure as e:
		raise Exception(str(e))
	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))

def update_multy(filter,data):
	try:
		db.shift_task.update(filter,{'$set':data},multi=True)
	except pymongo.errors.OperationFailure:
		raise Exception(str(e))
	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))
	return data

def do_aggregate(conditions_arr):
	try:
		dataResult = []
		for row in db.shift_task.aggregate(conditions_arr):
			dataResult.append(row)
		return dataResult
	except pymongo.errors.PyMongoError as e:
		raise Exception("Error! Can't get data: %s" %(str(e)))
