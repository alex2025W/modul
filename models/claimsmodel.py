#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import error, abort
import json
import pymongo
import datetime
import os
import bson
from pymongo import MongoClient
import re

import config

db = config.db

def get_all():
	""" Get all claims """
	try:
		res = []

		for cl in db.claims.find(sort=[('created',1)]):
			cl["_id"] = str(cl["_id"])
			res.append(cl)
		return res
	except pymongo.errors.PyMongoError as e:
		abort(400, "server_error")

def get_list_by(filter,fields=None):
	""" get contract by filter """
	try:
		res = []
		for cl in db.claims.find(filter,fields):
			cl["_id"] = str(cl["_id"])
			res.append(cl)
		return res
	except pymongo.errors.PyMongoError as e:
		abort(400, "server_error")

def add(data):
	""" Add new claim """
	try:
		md_id = db.claims.insert(data)
		return md_id
	except pymongo.errors.PyMongoError as e:
		abort(400, "server_error")

def update(id, data):
	""" update claim """
	try:
		# исключить необновляемые поля
		data.pop('_id')
		data.pop('created')
		data.pop('number')
		md_id= db.claims.update({'_id': bson.objectid.ObjectId(id)}, {'$set':data})
		return md_id
	except pymongo.errors.PyMongoError as e:
		abort(400, "server_error")


def do_aggregate(conditions_arr):
	'''
	Универсальная функция выполнения aggregate
	'''
	try:
		dataResult = []
		for row in db.claims.aggregate(conditions_arr):
			dataResult.append(row)
		return dataResult
	except pymongo.errors.PyMongoError as e:
		raise Exception("Error! Can't get data: %s" %(str(e)))
