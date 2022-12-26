#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import error, abort
import json
import pymongo
import bson
import os
import datetime
from pymongo import MongoClient
from bson.code import Code
import config
import sys
reload(sys)
sys.setdefaultencoding('utf8')
db = config.db

# ERRORS-----------------------------
# 'ps' - 'Необходимо установить точную цену и состав заявки'
# 'p':'Необходимо установить точную цену заявки'
# 's': 'Необходимо установить точный состав заявки'
# 'de':'Срок нахождения заявки в текущем состоянии превышен. Требуется дальнейшее движение по заявке или перевод её в одно из закрывающих состояний.'
# 'overdue_task': 'Просроченная задача'
# 'empty_finish_date': 'Вероятность выше 50% и нет даты закрытия'

def add(data):

	mdb = db.msg
	try:
		_id = mdb.insert(data)
	except pymongo.errors.PyMongoError as e:
		abort(400,"server_error")
	return _id

def upsert(key, data):

	mdb = db.msg
	try:
		_id = mdb.update(key, data, upsert=True)
	except pymongo.errors.PyMongoError as e:
		abort(400,"server_error")
	return _id


def get_by(args, fields=None):
	data=[]
	try:
		for d in db.msg.find(args, fields).sort([('manager',1), ("datetime",1)]):
			data.append(d)
		return data
	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))


def update(cond, data):
	mdb = db.msg
	try:
		res = mdb.update(cond, {'$set':data}, multi=True)
	except pymongo.errors.PyMongoError as e:
		abort(400,"server_error")
	return res
