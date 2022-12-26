#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import abort
from config import db
import json
import pymongo
import datetime
from bson.objectid import ObjectId
import re

def find_by_name(name,qtype):
    limit = 10
    clientdb = db.contragent
    regx1 = re.compile(name+'.*', re.IGNORECASE)

    # сначала ищем по имени
    findres = []

    try:
        byname = clientdb.find({'name':regx1, "type":qtype}).limit(limit)
        for byn in byname:
            findres.append({
                'id':str(byn['_id']),
                'name': byn['name'],
                'addr': "",
                'client_id':byn.get('client_id',"")
                })

    except pymongo.errors.PyMongoError as e:
        abort(400,"server_error")

    return findres


def add(data):
	try:
		db.contragent.insert(data)
	except pymongo.errors.PyMongoError as e:
		abort(400,"server_error")

	return data