#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route, get, post, put, request, error, abort, response, debug, delete
from libraries import userlib
from traceback import print_exc
from handlers.esud import esudhandler
from apis.esud import esudcomplectapi
import routine
import json

@post('/handlers/esudcomplect/get_list/<page>')
def get_complect_list(page):
	'''
		Получение списка комплектов по заданной странице
	'''
	userlib.check_handler_access("esud_complect","r")
	try:
		from models import complectmodel
		page = routine.strToInt(page)
		if not page:
			page=1
		data = complectmodel.get_list_by_page(None, {'number':1, 'name': 1, 'history': 1, 'note':1}, 50, page)
		count = routine.ceil(routine.strToFloat(complectmodel.get_count(None))/50)
		return routine.JSONEncoder().encode({'status':'ok','data':data,'count':count})
	except Exception, exc:
		print('error')
		excType = exc.__class__.__name__
		print_exc()
		return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@get('/handlers/esudcomplect/prepare_from_model/<number>')
def prepare_from_model(number):
	'''
		Тестовая функция сбора комплекта по модели
	'''
	userlib.check_handler_access("esud_complect","r")
	from models import productionordermodel, datamodel
	try:
		result = esudcomplectapi.test_prepare_from_model(number)
		return routine.JSONEncoder().encode({'status':'ok','data':result})
	except Exception, exc:
		print('----Error. /handlers/esudcomplect/prepare_from_model/; {0}'.format(str(exc)))
		excType = exc.__class__.__name__
		print_exc()
		return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@get('/handlers/esudcomplect/get_complect_info/<number>')
def get_complect_info(number):
	'''
	Получение комплектf по заданному номеру
	'''
	userlib.check_handler_access("esud_complect","r")
	try:
		from models import specificationmodel, complectmodel
		if not number:
			raise Exception("Не задан номер комплекта.")
		complect = complectmodel.get_by({'number': number})
		if not complect:
			raise Exception("Комплект не найден.")
		return routine.JSONEncoder().encode({'status': 'ok','msg':'', 'data': complect})
	except Exception, exc:
		print('----Error. /handlers/esudcomplect/get_complect_info; {0}'.format(str(exc)))
		excType = exc.__class__.__name__
		print_exc()
		return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})


