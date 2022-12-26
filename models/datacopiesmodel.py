#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import error, abort
import config
import json
import pymongo
import datetime
import re
from bson.objectid import ObjectId
import bson
db = config.db

"""DataBase Fields"""
DATACOPIES = dict(
	ID="_id", # идентификатор	
	DATE="date", # дата создания
	TREE="tree" # данные
)

def add(data):
	try:		
		db.data_copies.insert(data)
	except pymongo.errors.OperationFailure:
		abort(400, "Operation failure")
	except pymongo.errors.PyMongoError as e:
		abort(400, "server_error")
	return data

def get_all_list():
	try:		
		data = []
		for d in db.data_copies.find({},{'_id':1,'date':1}):
			data.append(d)
		return data		
	except pymongo.errors.OperationFailure:
		abort(400, "Operation failure")
	except pymongo.errors.PyMongoError as e:
		abort(400, "server_error")	