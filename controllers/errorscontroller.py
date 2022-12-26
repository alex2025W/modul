#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route, view, get, post, put, request, error, abort, response, debug, static_file, template, redirect
import urllib
import config
from models import usermodel
from models import dirmodel, msgmodel, ordermodel, schedulerlogmodel
from libraries import userlib
import routine

def get_users():
	'''Получение списка менеджеров по которым есть ошибки'''

	usr_emails = {}
	# получение ошибок из стаблицы системных сообщений пользователя
	msgData = msgmodel.get_by({'enabled':True},{'manager':1})
	for row in msgData:
		usr_emails[row['manager']] = row['manager']

	badHistoryData = ordermodel.get_overdue_tasks(None)
	for row in badHistoryData:
		usr_emails[row['manager']] = row['manager']

	users = usermodel.get_list({'email': {'$in':  usr_emails.values() }}, None)
	# data = []
	# # необходимы только пользователи с ролью - менеджер
	# for u in users:
	# 	for role in u.get('roles', []):
	# 		if str(role['role']) == '531f287486a2fa0002934afb':
	# 			data.append(u)
	# 			break
	# return data
	return users

@route('/errors')
def errors():
	userlib.check_page_access('errors','r')
	return template('views/errors', current_user=userlib.get_cur_user(), version = config.VERSION, users = get_users(), menu=userlib.get_menu(), last_update_date=schedulerlogmodel.get_last_date('scheduled_job'))
