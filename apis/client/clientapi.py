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

def find_by_phone(phone):
	'''
	Поиск клиентов по номеру телефона
	phone - входной номер телефона
	'''
	import re
	from models import clientmodel
	try:
		if phone[0]=='8' or phone[0]=='7':
			phone = phone[1:]
		if phone[:2]=='+7':
			phone = phone[2:]
		digits = re.sub("\D", "", phone)
		res = []

		if len(digits)>0:
			# создаем regex, которые будет искать только по цифрам
			reg = '\\D*'+'\\D*'.join(digits)+'\\D*'
			clients = clientmodel.get_list({'contacts':{'$elemMatch':{'phone':re.compile(reg, re.IGNORECASE)}}},{'name':1})
			for c in clients:
				res.append({'id':str(c['_id']), 'name':c['name'], 'cont':0})
		return res
	except Exception, exc:
		excType = exc.__class__.__name__
		print_exc()
		raise Exception(str(exc))

def get_clients_tags():
	'''
	Получение тэгов клиентов.
	Названия тегов берутся из основных  данных по клиентам.
	Сортировка ведется по количеству использования тега и по названию
	'''

	from models import clientmodel

	# получение количества использования тегов
	cond = [
		{"$project":{
				"tags":1
			}
		},
		{"$unwind": "$tags"},
		{"$group":{
				"_id":{"tags":"$tags"},
				"count": { "$sum": 1 }
			}
		},
		{"$project":{
				"_id":0,
				"tag":"$_id.tags",
				"count":"$count"
			}
		},
		{"$sort" : {"tag":1} }
	]

	data_res = clientmodel.do_aggregate(cond)
	return data_res


