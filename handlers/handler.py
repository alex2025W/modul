#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route, get, post, put, request, error, abort, response, debug
import json
import urllib
from bson.objectid import ObjectId
import datetime, time, routine,  config
from models import usermodel, routinemodel, msgmodel
from libraries import userlib
from traceback import print_exc

def ajax_error(code, msg):
	result = {
		"jsonrpc":"2.0",
		"error":{
			"code":code,
			"message":msg
		},
		"id": None
	}
	return result

def ajax_result(result):
	result = {
		"jsonrpc":"2.0",
		"result": result,
		"id": None
	}
	return result

@get('/handlers/ver/')
def get_version():
	'''
		Получение версии
	'''
	return {'ver':str(config.VERSION)}

@get('/handlers/routine/get_common_info/<page_key>')
def get_common_info(page_key):
	'''
		To get common information for all pages
		 - Info about current user
		 - Info about menu structure
		 - Info about all users in system
		 - Info about weekends
	'''

	from apis import routineapi
	try:
		return routine.JSONEncoder().encode( { 'status': 'ok','msg':'', 'data': routineapi.get_common_info(page_key) })
	except Exception, exc:
		excType = exc.__class__.__name__
		print_exc()
		return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})


#-----------------------------------------------------------------------------------------------------------------------------
#------Обработчики однопользовательского режима работы с формой--------------
#-----------------------------------------------------------------------------------------------------------------------------
def check_page_on_busy(usr, page_key):
	try:
		info = routinemodel.get({'key':'page_single_mode', 'page_key':page_key})
		if not info:
			raise Exception('Ошибка определения статуса формы. Форма не найдена: ' + page_key)
		# если статус страницы = "свободна", то необходимо занять ее текущим пользователем
		# если формой не пользовались более 10 мин, то форма занимается текущим пользователем
		# иначе возврат информации о статусе страницы
		if info.get('status','') =='free' or 	(info.get('status') == 'busy' and (not info.get('status_date') or (datetime.datetime.utcnow() - info.get('status_date')).seconds//60>config.single_mode_time+1)) :
			info['status'] = 'busy'
			info['status_date'] = datetime.datetime.utcnow()
			info['last_update'] = datetime.datetime.utcnow()
			info['user_email'] = usr['email']
			info['user_name'] = usr['fio']
			del info['_id']
			routinemodel.update({'key':'page_single_mode', 'page_key':page_key}, info)
		return info
	except Exception, exc:
		excType = exc.__class__.__name__
		print_exc()
		return None

@get('/handlers/routine/single_mode/check_page_on_busy/<page_key>')
def api_check_page_on_busy(page_key):
	try:
		usr = userlib.get_cur_user()
		if not usr:
			return routine.JSONEncoder().encode({'status': 'error', 'msg': 'Доступ запрещен.'})
		if not page_key:
			return routine.JSONEncoder().encode({'status': 'error', 'msg': 'Ошибка определения статуса формы. Не задан ключ формы. '})
		info = check_page_on_busy(usr,page_key)
		return routine.JSONEncoder().encode({'status': 'ok', 'msg': '', 'data': info})
	except Exception, exc:
		excType = exc.__class__.__name__
		print_exc()
		return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@post('/handlers/routine/single_mode/update_page_busy_status/<page_key>/<status>')
def update_page_busy_status(page_key, status):
	try:
		usr = userlib.get_cur_user()
		if not usr:
			return routine.JSONEncoder().encode({'status': 'error', 'msg': 'Доступ запрещен.'})
		if not page_key:
			return routine.JSONEncoder().encode({'status': 'error', 'msg': 'Ошибка обновления статуса формы. Не задан ключ формы.'})
		info = routinemodel.get({'key':'page_single_mode', 'page_key':page_key})
		if not info:
			return routine.JSONEncoder().encode({'status': 'error', 'msg': 'Ошибка обновления статуса формы. Форма не найдена.'})

		del info['_id']
		# освободить страницу может только пользователь, ее занявший
		if status == 'get_access':
			info["status"] = 'busy'
			info['status_date'] = datetime.datetime.utcnow()
			info['last_update'] = datetime.datetime.utcnow()
			info['user_email'] = usr['email']
			info['user_name'] = usr['fio']
		elif status == 'free' and usr['email'] == info['user_email']:
			info["status"] = status
			info["status_date"] = None
			info["user_email"] = None
			info["user_name"] = None
			info["last_update"] = None
		elif status != 'free' and (usr['email'] == info['user_email'] or not info.get('status_date') or (datetime.datetime.utcnow() - info.get('status_date')).seconds//3600>config.single_mode_time+1):
				info["status"] = status
				info['status_date'] = datetime.datetime.utcnow()
				info['last_update'] = datetime.datetime.utcnow()
				info['user_email'] = usr['email']
				info['user_name'] = usr['fio']

		routinemodel.update({'key':'page_single_mode', 'page_key':page_key}, info)
		return routine.JSONEncoder().encode({'status': 'ok', 'data': info})
	except Exception, exc:
		excType = exc.__class__.__name__
		print_exc()
		return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})


@get('/handlers/routine/get_weekends/')
def get_weekends():
	'''
		Получение всех выходных дней
	'''

	try:
		weekends = (config.db.weekends.find_one({}, {'weekends': 1}) or {}).get("weekends", [])
		return routine.JSONEncoder().encode({'status': 'ok', 'data': weekends})
	except Exception, exc:
		excType = exc.__class__.__name__
		print_exc()
		return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})
