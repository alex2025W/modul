#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route, get, post, put, request, error, abort, response, debug
import json
import urllib
import bson
from models import dirmodel, claimsmodel
from routine import JSONEncoder, moscow_tz_offset
from bson.objectid import ObjectId
from libraries import userlib
from models import countersmodel
import routine
import datetime
from traceback import print_exc

@get('/handlers/get_claims_data')
def get_claims_data():
	userlib.check_handler_access("claims","r")
	res = {}
	# получить категории
	res['categories'] = get_claims_categories()
	# получить тэги
	res['tags'] = get_claims_tags()
	# получить отклонения
	res['claims'] = claimsmodel.get_all()
	for c in res['claims']:
		c['created'] =  c['created']
	res['status']='ok'
	return JSONEncoder().encode(res)

def get_claims_categories():
	'''
	Получение категорий отклонений.
	Названия категорй берутся из справочника, количество использования
	той или иной категории берется из основных данных, сортировка категорий ведется по количеству
	использования той или иной категории
	'''
	userlib.check_handler_access("claims","r")

	# получение количества использования той или иной категоории
	cond = [
		{"$project":{
				"category":1,
				"contract":1,
		}},
		{"$group":{
				"_id":{"category":"$category"},
				"count": { "$sum": 1 }
			}
		},
		{"$project":{
				"_id":0,
				"category":"$_id.category",
				"count":"$count"
			}
		},
		{"$sort" : { "count" : 1} }
	]
	data_categories = claimsmodel.do_aggregate(cond)
	data_categories_arr = {}
	for c in data_categories:
		data_categories_arr[str(c['category'])] = c['count']

	# получение данных из справочника
	catlist = []
	for c in dirmodel.get_by_type(8):
		if c['stat']=='enabled':
			c['count'] = 0
			if str(c['_id']) in data_categories_arr:
				c['count'] = data_categories_arr[str(c['_id'])]
			catlist.append(c)

	# сортировка по количеству и названию
	#catlist.sort(key = lambda x: (-x['count'], x['name']))
	catlist.sort(key = lambda x: (x['name']))
	return catlist

def get_claims_tags():
	'''
	Получение тэгов отклонений.
	Названия тегов берутся из основных  данных.
	Сортировка ведется по количеству использования тега и по названию
	'''
	userlib.check_handler_access("claims","r")

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

	data_res = claimsmodel.do_aggregate(cond)
	return data_res

@get('/handlers/claims/get_categories')
def get_claims_data():
	userlib.check_handler_access("claims","r")
	try:
		return routine.JSONEncoder().encode({'status': 'success','data':get_claims_categories()})
	except Exception, exc:
		excType = exc.__class__.__name__
		print_exc()
		return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@get('/handlers/claims/get_tags')
def get_claims_data():
	userlib.check_handler_access("claims","r")
	try:
		return routine.JSONEncoder().encode({'status': 'success','data':get_claims_tags()})
	except Exception, exc:
		excType = exc.__class__.__name__
		print_exc()
		return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@post('/handlers/claim_data')
def add_claim_data():
	userlib.check_handler_access("claims","w")
	data = request.json
	if data['category']:
		data['category'] = ObjectId(data['category'])
	data['number'] = countersmodel.get_next_sequence('claims')
	data['created'] = datetime.datetime.utcnow()
	claimsmodel.add(data)
	return JSONEncoder().encode(data)


@put('/handlers/claim_data')
def update_claim_data():
	userlib.check_handler_access("claims","w")
	data = request.json
	if data['category']:
		data['category'] = ObjectId(data['category'])
	res = claimsmodel.update(data['_id'],data)
	return JSONEncoder().encode(data)
