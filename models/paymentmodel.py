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

import dirmodel

import config

db = config.db

# deprecated
def get_type_list_old():
	""" Get all payment types """
	try:
		res = []
		for cl in db.payment_type.find(sort=[('code',1)]):
			cl["_id"] = str(cl["_id"])
			res.append(cl)
		return res
	except pymongo.errors.PyMongoError as e:
		abort(400, "server_error")

def get_type_list():
	dr = dirmodel.get_by_type(16)
	res = []
	for cl in dr:
		if cl['stat'] == 'enabled':
			cl["_id"] = str(cl["_id"])
			res.append(cl)
	return res


def get_use_list():
	""" Get all payment uses """
	try:
		res = []
		for cl in db.payment_use.find(sort=[('code',1)]):
			cl["_id"] = str(cl["_id"])
			res.append(cl)
		return res
	except pymongo.errors.PyMongoError as e:
		abort(400, "server_error")

def get_currency_list():
	""" Get all currency """
	try:
		res = []
		for cl in db.currency.find():
			cl["_id"] = str(cl["_id"])
			res.append(cl)
		return res
	except pymongo.errors.PyMongoError as e:
		abort(400, "server_error")
