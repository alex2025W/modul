#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import abort
from config import db
import json
import pymongo
import datetime
from bson.objectid import ObjectId

# идентификаторы при выборе которых открываются доп
SYSTEM_IDS = ['543d0ba518591770d4120949', '54645b3a18591770d4120a09', '54645b6418591770d4120a0a']
SYSTEM_OBJECTS = {
	'ANOTHER_WORK':"543d0ba518591770d4120949",	# Другая работа
	'NOT_PLAN_WORK':"54645b3a18591770d4120a09",	# Внеплановая работа
	'PLAN_WORK':"54645b6418591770d4120a0a",		# Плановая работа
	'OTHER':"530aff2b5174c35412f293b1"			# Другое
}

"""Methods"""
def get_all():
	""" get all items """
	try:
		result = []
		dataResult = db.m_plan_shift_reason.find().sort('routine', direction=1)
		for row in dataResult:
			result.append(row)
		return result
	except pymongo.errors.PyMongoError as e:
		abort(400, "server_error")

def get_all_active():
	""" get all items """
	try:
		result = []
		dataResult = db.m_plan_shift_reason.find({'is_active': True}).sort('routine', direction=1)
		for row in dataResult:
			result.append(row)
		return result
	except pymongo.errors.PyMongoError as e:
		abort(400, "server_error")
