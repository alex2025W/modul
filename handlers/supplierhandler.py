#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import get, post, put, request, response
import json

from models import suppliermodel
from libraries import userlib

need_login_error = { "error": "Пожалуйста, <a href='/login'>авторизируйтесь</a>" };

@get('/suppliers/api/suppliers')
def api_suppliers_list():
	response.content_type = "application/json; charset=UTF-8"
	userlib.check_handler_access('suppliers','r')
	return json.dumps(suppliermodel.get_all())

@post('/suppliers/api/suppliers')
def api_new_supplier():
	response.content_type = "application/json; charset=UTF-8"
	userlib.check_handler_access('suppliers','w')
	return json.dumps(suppliermodel.add(request.json))

@put('/suppliers/api/suppliers/<supplier_id>')
def api_update_supplier(supplier_id):
	response.content_type = "application/json; charset=UTF-8"
	userlib.check_handler_access('suppliers','w')
	return json.dumps(suppliermodel.update(supplier_id, request.json))
