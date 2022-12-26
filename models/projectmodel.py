#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import abort
from config import db
import json
import pymongo
import datetime
from models import countersmodel
import routine
import copy
from bson.objectid import ObjectId



def add(data):
	try:
		db.projects.insert(data)
		return data
	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))

def update(cond, data, insert_if_notfound=True, multi_update=False):
	""" update contract """
	try:
		db.projects.update(cond, data, upsert=insert_if_notfound,multi=multi_update)
	except pymongo.errors.OperationFailure as e:
		abort(400, e)
	except pymongo.errors.PyMongoError as e:
		abort(400, "server_error")

def get(filter):
	try:
		return db.projects.find_one(filter)
	except pymongo.errors.OperationFailure as e:
		abort(400, e)
	except pymongo.errors.PyMongoError as e:
		abort(400, "server_error")



def get_all(filter, fields=None, page_size=50, page=1):
	try:
		prlist = db.projects.find(filter, fields).sort('number', pymongo.DESCENDING ).skip(page_size*(page-1)).limit(page_size)
		res = []
		for p in prlist:
			res.append(p)
		return res
	except pymongo.errors.OperationFailure as e:
		abort(400, e)
	except pymongo.errors.PyMongoError as e:
		abort(400, "server_error")


def update_client(client_id, client_name):
	try:
		prlist = db.projects.find({'clients.id':client_id}, {'clients':1})
		for p in prlist:
			for c in p['clients']:
				if c['id']==client_id:
					c['name'] = client_name
			db.projects.update({'_id':p['_id']},{'$set':{'clients':p['clients']}})
	except pymongo.errors.OperationFailure as e:
		pass
	except pymongo.errors.PyMongoError as e:
		pass


def get_count(filter):
	odb = db.projects
	try:
		oo = odb.find(filter).count()
	except pymongo.errors.PyMongoError as e:
		abort(400,"server_error")
	return oo
