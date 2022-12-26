#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import error, abort
import json
import pymongo
import bson
import os
import datetime
from bson.objectid import ObjectId


from pymongo import MongoClient
from bson.code import Code

import usermodel

import config

db = config.db

def get_all():
	""" Get all roles """
	try:
		roles = []

		for role in db.roles.find(sort=[('title',1)]):
			role["id"] = str(role.pop("_id"))
			roles.append(role)
		return roles
	except pymongo.errors.PyMongoError as e:
		abort(400, "server_error")


def get(role_id):
	""" Get role by Id """
	try:
		role = db.roles.find_one({"_id":bson.objectid.ObjectId(role_id)})
		role["id"] = str(role.pop("_id"))		
		return role
	except pymongo.errors.PyMongoError as e:
		abort(400, "server_error")

def add(raw_json):
	data = {
		'title': raw_json['title'],
		'users': raw_json['users'],
		'pages': raw_json['pages']
	}
	try:
		data["id"] = str(db.roles.insert(data))
		del data['_id']
		usermodel.update_roles(data["id"],raw_json['users'],raw_json['pages'])
	except pymongo.errors.OperationFailure:
		abort(400, "Operation failure")
	except pymongo.errors.PyMongoError as e:
		abort(400, "server_error")
	return data

def update(role_id, raw_json):
	data = {
		'title': raw_json['title'],
		'users': raw_json['users'],
		'pages': raw_json['pages']
	}
	try: 
		role = db.roles.find_and_modify({"_id": ObjectId(role_id)},update={"$set":data},new=True)		
		role["id"] = str(role.pop("_id"))
		usermodel.update_roles(role_id,raw_json['users'],raw_json['pages'])
	except pymongo.errors.OperationFailure:
		abort(400, "Operation failure")
	except pymongo.errors.PyMongoError as e:
		abort(400, "server_error")
	return role

def remove(role_id):
	try: 
		db.roles.remove({"_id": ObjectId(role_id)})
	except pymongo.errors.OperationFailure:
		abort(400, "Operation failure")
	except pymongo.errors.PyMongoError as e:
		abort(400, "server_error")
	return {"result":"success"}

def get_by_list(ids):
	ids_obj = [];
	for i in ids:
		ids_obj.append(ObjectId(i))
	roles = db.roles.find({"_id":{"$in":ids_obj}})
	res = []
	for ro in roles:
		res.append({'role':str(ro["_id"]), 'pages': ro["pages"]});
	return res

# обновить данные о пользователе в ролях (в списке содеражатся только роли, доступные пользователю)
def update_users(user_id, roles_list):
	# сначала удаляем пользователя там, где он не нужен
	db.roles.update({'users':{'$in':[str(user_id)]}},{'$pull': { 'users': str(user_id) } }, multi=True )
	# затем добавляем туда, куда надо
	rlistId = []
	for el in roles_list:
		rlistId.append(ObjectId(el))	
	db.roles.update({"_id":{'$in':rlistId}},{'$push':{'users':str(user_id)}}, multi=True)