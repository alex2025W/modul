#!/usr/bin/python
# -*- coding: utf-8 -*-

import datetime
from datetime import date
import time as root_time
from dateutil.parser import parse
from dateutil.relativedelta import *
from bson.objectid import ObjectId
from libraries import userlib
from models import countersmodel
import routine
import config
from traceback import print_exc
from copy import deepcopy,copy


def check_on_client(phone_number, id):
	'''
	Поиск клиентов с указанным номером и обновление входящего запроса
	'''
	from apis.client import clientapi
	from models import atsmodel
	try:
		client = None
		clients = clientapi.find_by_phone(phone_number)
		if len(clients)>0:
			client = clients[0]
		# обновление заявки
		atsmodel.update(id, {'client_check_date': datetime.datetime.utcnow(), 'client': client } )
	except Exception, exc:
		print('---Error. atsapi.check_on_client; {0}'.format(str(exc)))
		excType = exc.__class__.__name__
		print_exc()
		raise Exception('---Error. atsapi.check_on_client; {0}'.format(str(exc)))


def check_on_clients(date='now'):
	'''
	Проверка входящих заданий на совпадения с контактными  данными клиентов
	Если есть совпадения, то клиенты помечаются в заданиях
	'''
	from apis.client import clientapi
	from models import atsmodel
	try:
		# получение списка входных заявок, которые еще не проверялись
		# у таких заявок dtae_check должно быть пустым или отсутствовать
		#ats_data = atsmodel.get_list({'$or':[{'client_check_date':{'$exists':False}},{'client_check_date':None}] })
		ats_data = list()

		date = datetime.datetime.utcnow() if date == 'now' else datetime.datetime.strptime(date, '%d.%m.%Y')
		date_start = date.replace(hour=00, minute=01)
		date_finish = date.replace(hour=23, minute=59)
		ats_data = atsmodel.get_list({'date': {'$lte': date_finish}, 'date': {'$gte': date_start}})

		for row in ats_data:
			if row.get('phone_number'):
				check_on_client(row['phone_number'], str(row['_id']))

	except Exception, exc:
		print('---Error. atsapi.check_on_clients; {0}'.format(str(exc)))
		excType = exc.__class__.__name__
		print_exc()
		raise Exception('---Error. atsapi.check_on_clients; {0}'.format(str(exc)))
