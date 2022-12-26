#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route, get, post, put, request, error, abort, response, debug, BaseRequest
import datetime, time, routine, config
from bson.objectid import ObjectId
from traceback import print_exc
from libraries import userlib
from models import  atsmodel, countersmodel
import gzip
import StringIO


@post('/handlers/ats/check_on_client/<phone>')
def check_client(phone):
	'''
	Проверка входящих заданий на совпадений с контактными  данными клиентов
	Если есть совпадения, то клиенты помечаются в заданиях
	'''
	userlib.check_handler_access("ats","w")
	from apis.ats import atsapi
	try:
		ats_data = atsmodel.get_list({'phone_number':phone}, {'phone_number':1, '_id':1})
		for row in ats_data:
			atsapi.check_on_client(row['phone_number'], row['_id'])
	except Exception, exc:
		print('---Error. /handlers/ats/check_on_clients; {0}'.format(str(exc)))
		excType = exc.__class__.__name__
		print_exc()
		return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})
	return routine.JSONEncoder().encode({'status':'ok'})


@get('/handlers/ats/check_on_clients')
def check_clients(date):
	'''
	Проверка входящих заданий на совпадений с контактными  данными клиентов
	Если есть совпадения, то клиенты помечаются в заданиях
	'''
	userlib.check_handler_access("ats","w")
	from apis.ats import atsapi
	try:
		atsapi.check_on_clients(date)
	except Exception, exc:
		print('---Error. /handlers/ats/check_on_clients; {0}'.format(str(exc)))
		excType = exc.__class__.__name__
		print_exc()


@post('/handlers/ats/get_list/<page>')
def get_ats_list(page):
	'''
		Получение списка заявко в АТС
	'''
	userlib.check_handler_access("ats","r")
	try:
		#from apis.ats import atsapi
		from models import atsmodel
		page = routine.strToInt(page)
		if not page:
			page=1
		data = atsmodel.get_list_by_page(None, None, 50, page)
		count = routine.ceil(routine.strToFloat(atsmodel.get_count(None))/50)
		return routine.JSONEncoder().encode({'status':'ok','data':data,'count':count})
	except Exception, exc:
		print('---Error. get_ats_list; {0}'.format(str(exc)))
		excType = exc.__class__.__name__
		print_exc()
		return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})


@post('/handlers/ats/check_and_update/<page>/<date>')
def check_and_update(page, date):
	check_clients(date)
	return get_ats_list(page)


@get('/handlers/ats/test_gspread')
def check_on_clients():
	'''
	Проверка входящих заданий на совпадений с контактными  данными клиентов
	Если есть совпадения, то клиенты помечаются в заданиях
	'''

	import gspread
	from models import  usermodel
	import os
	try:
		usr = userlib.get_cur_user()
		credentials = usermodel.get_user_credentials(usr['email'])
		# credentials = usermodel.refresh_user_credentials(usr['email'])
		gc = gspread.authorize(credentials)

		# If you want to be specific, use a key (which can be extracted from
		sh = gc.open_by_key('1F3CJZzBWKLjzpvLilEwsHP6G-hXjXoETZxEHq8xoaXw')
		# sh = gc.open_by_url('https://docs.google.com/spreadsheets/d/1F3CJZzBWKLjzpvLilEwsHP6G-hXjXoETZxEHq8xoaXw/edit#gid=0')
		# sh = gc.open("testMainList")
		# Select worksheet by index. Worksheet indexes start from zero
		worksheet = sh.get_worksheet(0)
		# With label
		val = worksheet.acell('B2').value
		worksheet.update_acell('B2', '666')
		return val
		return "ok"


		# I had the same problem, I'm writing general updated instructions to deal with the new OAuth2 credentials
		# @burnash you could add these to the readme. They recently changed the console.developers.google.com website and it's difficult to find updated instructions online.

		# 1) Go to console.developers.google.com -> APIs & auth -> APIs -> Drive API -> Enable API
		# 2) Credentials -> Add credentials -> Service account -> JSON -> Create
		# This will download a .json file
		# 3) Open the .json file with a text editor and copy the email address.
		# Open your sheet, go to Share and paste the email address and share with it.
		# 4) Use the following lines:
		# import json
		# import gspread
		# from oauth2client.client import SignedJwtAssertionCredentials
		# json_key = json.load(open('NAME_OF_DOWNLOADED.json'))
		# scope = ['https://spreadsheets.google.com/feeds']
		# credentials = SignedJwtAssertionCredentials(json_key['client_email'], json_key['private_key'], scope)
		# gc = gspread.authorize(credentials)
		# wks = gc.open("SHEET_NAME").sheet1

		# wks is your sheet and its methods will modify it.
		# Try:
		# wks.append_row(['test1','row_appended'])
		# This will append a row at the end of the sheet (usually a new sheet has 1000 void rows and therefore you need to scroll down to the 1001st to find it).



	except Exception, exc:
		print('---Error. /handlers/ats/test_gspread; {0}'.format(str(exc)))
		excType = exc.__class__.__name__
		print_exc()
