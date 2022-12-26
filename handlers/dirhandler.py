#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route, get, post, put, request, error, abort, response, debug
import json
from bson.objectid import ObjectId
import config
import math
import datetime
from dateutil.parser import parse
from dateutil.relativedelta import *
import pprint
import operator
from models import dirmodel, clientmodel
from libraries import userlib

@post('/handlers/dir')
def add_dir():
	'''
		Добавление нового элемента в справочник
	'''
	userlib.check_handler_access("dir","w")
	param = request.json
	param['number'] = 0
	dirmodel.add(param)
	param['id'] = str(param['_id'])
	usr = userlib.get_cur_user()
	del param['_id']
	dirmodel.add_history(ObjectId(param['id']), param, usr['email'])
	return param

@post('/handlers/upddir')
def update_dir():
	'''
		Редактирование элемента в справочнике
	'''
	# проверка доступа
	userlib.check_handler_access("dir","w")
	# получение входных параметров
	key =request.forms.get('pk')
	dirtype = int(request.forms.get('dirtype'))
	name = request.forms.get('name')
	# определяем, что необходимо обновить
	if name in ['note', 'number', 'days', 'name']:
		data = {name:request.forms.get('value')}
		cl = dirmodel.updatenum(key, data, dirtype)
	return {'status':'ok'}

@post('/handlers/upddirid')
def update_dir_id():
	'''
		Обновление элемента справочника по его ID
	'''
	# проверка доступа
	userlib.check_handler_access("dir","w")
	# параметры на сохранение
	param = request.json
	p_id = param['id']
	del param['id']
	dirmodel.update_by_id(ObjectId(p_id), param)
	# если обновление ABC классификации
	if str(param.get('type',''))=='11':
		usr = userlib.get_cur_user()
		dirmodel.add_history(ObjectId(p_id), param, usr['email'])
		config.qu_default.enqueue_call(func=clientmodel.abc_recalc, args=None, timeout=1200)
	elif str(param.get('type',''))=='19':
		usr = userlib.get_cur_user()
		dirmodel.add_history(ObjectId(p_id), param, usr['email'])
	return {'status':'ok'}

@post('/handlers/dir/<id>')
def fetch_dir(id):
	'''
		Получение значений справочника
	'''
	userlib.check_handler_access("dir","w")
	param = request.json
	dirmodel.update(id, param, param['type'])
	return param
