#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route, get, post, put, request, error, abort, response, debug
import datetime, time
from bson.objectid import ObjectId
from libraries import userlib
from models import usermodel, productionordermodel, stockmodel
import routine
from models import countersmodel
from traceback import print_exc
import config
from apis.esud import stockapi

@get('/handlers/stock/search/')
def search():
	'''
		Получение информации по позициям со склада на указанную дату и время
	'''
	userlib.check_handler_access("stock","r")
	try:
		search_date = None
		usr = userlib.get_cur_user()
		# get parameters
		param = request.query.decode()
		if not 'date' in param or param['date']=="" or not 'time' in param or param['time']=="":
			return {'status':'error', 'msg':'Не задана дата или время .'}
		try:
			search_date = datetime.datetime.strptime(param['date'] + ' ' + param['time'], '%d/%m/%Y %H:%M') + datetime.timedelta(minutes = 1)
		except:
			return {'status':'error', 'msg':'Задан не верный формат даты или времени.'}

		search_date_utc = routine.dateToUtc(search_date)
		result = stockapi.get_data_by_date(search_date_utc)
		return routine.JSONEncoder().encode({'status': 'ok','msg':'', 'data': result})
	except Exception, exc:
		print('Error! Get stock info.' + str(exc))
		excType = exc.__class__.__name__
		print_exc()
		return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})
