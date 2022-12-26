#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import get, post, put, request, response
import json

from models import suppliermodel
from libraries import userlib

need_login_error = { "error": "Пожалуйста, <a href='/login'>авторизируйтесь</a>" };

@get('/suppliers/api/suppliers/<supplier_id>/goods')
def api_goods_list(supplier_id):
	response.content_type = "application/json; charset=UTF-8"
	userlib.check_handler_access('suppliers','r')
	return json.dumps(suppliermodel.get_goods(supplier_id))

@post('/suppliers/api/suppliers/<supplier_id>/goods')
def api_new_good(supplier_id):
	response.content_type = "application/json; charset=UTF-8"
	userlib.check_handler_access('suppliers','w')
	return json.dumps(suppliermodel.add_good(supplier_id, request.json))

@put('/suppliers/api/suppliers/<supplier_id>/goods/<good_id>')
def api_update_good(supplier_id, good_id):
	response.content_type = "application/json; charset=UTF-8"
	userlib.check_handler_access('suppliers','w')
	return json.dumps(suppliermodel.update_good(supplier_id, good_id, request.json))
