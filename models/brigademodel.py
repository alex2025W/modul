#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import abort
from config import db
import json
import pymongo
import datetime
from bson.objectid import ObjectId

"""DataBase Fields"""
BRIGADE = dict(
	ID="_id", # идентификатор бригады
	CODE="code", # код бригады
	TEAMLEAD="teamlead", # бригадир
)

"""Methods"""
def get_all():
	""" get all brigades """
	try:
		result = []
		dataResult = db.m_brigade.find().sort('teamlead', direction=1)
		for row in dataResult:
			row["_id"] = str(row["_id"])
			result.append(row)
		return result

	except pymongo.errors.PyMongoError as e:
		abort(400, "server_error")

def get(id):
	"""get full info about  brigade"""
	try:
		return db.m_brigade.find_one({'_id': bson.objectid.ObjectId(id)})
	except pymongo.errors.PyMongoError as e:
		abort(400,"server_error")

def set(query, info):
	"""Бригады связаны с таблицей  участков, изменяя-какую либо информацию о бригаде необходимо менять ее и в участках. При удалении бригады, она также должна удалиться из участокв"""
