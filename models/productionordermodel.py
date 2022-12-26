#!/usr/bin/python
# -*- coding: utf-8 -*-
#
# Задания на производство
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
		return db.production_order.find_one(args, fields)
	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))

def get_list(args, fields):
	data=[]
	try:
		for d in db.production_order.find(args, fields):
			data.append(d)
		return data
	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))

def add(data):
	try:
		db.production_order.insert(data)
	except pymongo.errors.OperationFailure as e:
		abort(400, e)
	except pymongo.errors.PyMongoError as e:
		abort(400, "server_error")

def update_by_id(id, data):
	try:
		db.production_order.update({'_id':ObjectId(id)},{'$set':data})
	except pymongo.errors.OperationFailure:
		abort(400, "Operation failure")
	except pymongo.errors.PyMongoError as e:
		abort(400, "server_error")
	return data

def update(cond, data, insert_if_notfound=True, multi_update=False):
	""" update workorder """
	try:
		db.production_order.update(cond, data, upsert=insert_if_notfound,multi=multi_update)
	except pymongo.errors.OperationFailure as e:
		abort(400, e)
	except pymongo.errors.PyMongoError as e:
		abort(400, "server_error")

def update_multy(filter,data):
	try:
		db.production_order.update(filter,{'$set':data},multi=True)
	except pymongo.errors.OperationFailure:
		abort(400, "Operation failure")
	except pymongo.errors.PyMongoError as e:
		abort(400, "server_error")
	return data

def do_aggregate(conditions_arr):
	try:
		dataResult = []
		for row in db.production_order.aggregate(conditions_arr):
			dataResult.append(row)
		return dataResult
	except pymongo.errors.PyMongoError as e:
		raise Exception("Error! Can't get data: %s" %(str(e)))

def get_unique_orders():
	'''
	Получение списка номеров заказов, задействованных в производстве
	'''
	try:
		cond =[
			{"$project":{"order":1}},
			{"$group":{"_id":{"number":"$order.number","contract_number":"$order.contract_number","product_number":"$order.product_number","product_unit_number":"$order.product_unit_number" }}},
			{"$project":{
				"_id":0,
				"number" : "$_id.number",
				"contract_number" : "$_id.contract_number",
				"product_number" : "$_id.product_number",
				"product_unit_number" : "$_id.product_unit_number"
				}
			},
			{"$sort" : { "contract_number" : 1, "product_number": 1, "product_unit_number":1} },
		]

		dataResult = []
		for row in db.production_order.aggregate(cond):
			dataResult.append(row)

		return dataResult
	except pymongo.errors.PyMongoError as e:
		raise Exception("Error! Can't get data: %s" %(str(e)))
