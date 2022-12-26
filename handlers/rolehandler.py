#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route, get, post, put, delete, request, error, abort, response, debug
import json
import urllib
from bson.objectid import ObjectId
import config

from models import rolemodel
from libraries import userlib
import routine

@get('/handlers/role_data')
def role_get_list():
	userlib.check_handler_access('roles','r')
	return routine.JSONEncoder().encode(rolemodel.get_all())

@put('/handlers/role_data/')
def role_add_new():
	userlib.check_handler_access('roles','w')
	return routine.JSONEncoder().encode(rolemodel.add(request.json))

@get('/handlers/role_data/<role_id>')
def role_get_data(role_id):
	userlib.check_handler_access('roles','r')
	return routine.JSONEncoder().encode(rolemodel.get(role_id))


@put('/handlers/role_data/<role_id>')
def role_save_data(role_id):
	userlib.check_handler_access('roles','w')
	return routine.JSONEncoder().encode(rolemodel.update(role_id, request.json))

@delete('/handlers/role_data/<role_id>')
def role_delete_data(role_id):
	userlib.check_handler_access('roles','w')
	return routine.JSONEncoder().encode(rolemodel.remove(role_id))
