#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import error, abort
import json
import pymongo
import datetime
import os
import bson
from pymongo import MongoClient
import re

from models import ordermodel, projectmodel

import config
import routine

# bсточник информации
info_soure = {'personal': u'Получена лично' , 'public': u'Открытые источники'}


db = config.db


def finda(name, cl):
	clientdb = db.clients
	regx1 = re.compile(name+'.*', re.IGNORECASE)
	regx2 = re.compile(name+'.*', re.IGNORECASE)

	non_decimal = re.compile(ur'[^\d]+')
	dname = non_decimal.sub('', name)

	phonearr = {}

	if len(dname)>=3:
		andph = []
		num = 1
		ph = [ dname[start:start+num] for start in range(0, len(dname), num) ]
		# for op in ph:
		# 	andph.append({'contacts.phone': re.compile(op+'.*', re.IGNORECASE)})
		# phonearr['$and'] = andph
		phonearr['contacts.phone'] = re.compile('[\s\(\)\-]?'.join(ph))
	else:
		phonearr['contacts.phone'] = regx2

	data = {}
	if (cl == 'cl'):
		data['cl'] = 'cl'

	oo = []
	try:
		for row in clientdb.aggregate([
			{"$match": data},
			{'$project':{'name':'$name', 'addr':'$addr', 'contacts': '$contacts', 'id': '$_id'}},
			{"$unwind":"$contacts"},
			{"$match": { "$or":[{'contacts.fio': regx2}, {'addr': regx2}, {'name': regx1}, {'contacts.email': regx1}, phonearr]}},
			{"$group": {"_id":"$id", "addr":{"$last":"$addr"}, "name":{"$last":"$name"}, "contacts":{"$addToSet":"$contacts"}}},
			{"$limit" : 10 }
		]):
			oo.append(row)

	except pymongo.errors.PyMongoError as e:
		abort(400,"server_error")
	return oo

def find_by_name(name):
	limit = 10
	clientdb = db.clients
	regx1 = re.compile(name+'.*', re.IGNORECASE)

	# сначала ищем по имени
	findres = []

	try:
		byname = clientdb.find({'name':regx1}).limit(limit)
		for byn in byname:
			findres.append({
				'id':str(byn['_id']),
				'name': byn['name'],
				'addr': byn['addr'],
				'is_podpisant': byn.get('is_podpisant',False)
				})

	except pymongo.errors.PyMongoError as e:
		abort(400,"server_error")

	return findres

def findb(name, cl):
	name = name.replace('+','\+')
	limit = 10
	clientdb = db.clients
	regx1 = re.compile(name+'.*', re.IGNORECASE)
	regx2 = re.compile(name+'.*', re.IGNORECASE)


	# сначала ищем по имени
	findres = []

	try:
		byname = clientdb.find({'name':regx1}).limit(limit)
		for byn in byname:
			findres.append({
				'_id':byn['_id'],
				'name': byn['name'],
				'addr': byn['addr'],
				'contacts': [byn['contacts'][0]] if len(byn['contacts']) > 0 else [],
				'added_by':byn.get('added_by'),
				'manager':byn.get('manager'),
				'group': byn.get('group'),
				'is_podpisant':byn.get('is_podpisant',False)
				})

	except pymongo.errors.PyMongoError as e:
		abort(400,"server_error")

	if len(findres) >= limit:
		return {'result':findres[:10]}

	# ищем по адресу
	name_indexer = dict((str(p['_id']), i) for i, p in enumerate(findres))
	try:
		byname = clientdb.find({'addr':regx1}).limit(limit)
		for byn in byname:
			# itm = next((item for item in findres if str(item["_id"]) == str(byn['_id'])), None)
			itm = name_indexer.get(str(byn['_id']), -1)
			if itm == -1:
				findres.append({
					'_id':byn['_id'],
					'name': byn['name'], # + ' '+ byn['addr'],
					'addr': byn['addr'],
					'contacts': [byn['contacts'][0]] if len(byn['contacts']) > 0 else [],
					'added_by':byn['added_by'],
					'put_addr':True,
					'is_podpisant':byn.get('is_podpisant',False)
					})
	except pymongo.errors.PyMongoError as e:
		abort(400,"server_error")

	if len(findres) >= limit:
		return {'result':findres[:10]}

	# ищем по контактам

	name_indexer = dict((str(p['_id']), i) for i, p in enumerate(findres))

	phone = name
	if phone[0]=='8' or phone[0]=='7':
		phone = phone[1:]
	if phone[:2]=='+7':
		phone = phone[2:]
	not_digits = re.sub("[\d\s-]*","",phone)
	phonearr = {}
	if len(not_digits)==0:
		digits = re.sub("\D", "", phone)
		#digits = re.sub("\-\s", "", phone)
		res = []
		if len(digits)>0:
			reg = '\\D*'+'\\D*'.join(digits)+'\\D*'
			phonearr['contacts.phone'] = re.compile(reg, re.IGNORECASE)
		else:
			phonearr['contacts.phone'] = regx2
	else:
		phonearr['contacts.phone'] = regx2

	# non_decimal = re.compile(ur'[^\d]+')
	# dname = non_decimal.sub('', name)
	# phonearr = {}
	# if len(dname)>=3 and '@' not in name:
	# 	andph = []
	# 	num = 1
	# 	ph = [ dname[start:start+num] for start in range(0, len(dname), num) ]
	# 	phonearr['contacts.phone'] = re.compile('[\s\(\)\-]?'+'[\s\(\)\-]?'.join(ph))
	# else:
	# 	phonearr['contacts.phone'] = regx2

	data = {}
	if (cl == 'cl'):
		data['cl'] = 'cl'
	try:
		oo = []
		for row in clientdb.aggregate([
			{"$match": data},
			{'$project':{'name':'$name', 'addr':'$addr', 'contacts': '$contacts', 'id': '$_id', 'added_by':'$added_by', 'manager':'$manager','is_podpisant':'$is_podpisant'}},
			{"$unwind":"$contacts"},
			{"$match": { "$or":[{'contacts.fio': regx2}, {'contacts.email': regx1} , phonearr]}},
			{"$group": {"_id":"$id", "addr":{"$last":"$addr"}, "name":{"$last":"$name"}, "contacts":{"$addToSet":"$contacts"},  "added_by":{"$last":"$added_by"}, "manager":{"$last":"$manager"},"is_podpisant":{"$last":"$is_podpisant"}}},
			{"$limit" : 10 }
		]):
			oo.append(row)

		for c in oo:
			# itm = next((item for item in findres if str(item["_id"]) == str(c['_id'])), None)
			itm = name_indexer.get(str(c['_id']), -1)
			if itm == -1:
				findres.append({
					'_id':c['_id'],
					'name': c['name'],
					'addr': c['addr'],
					'contacts': c['contacts'],
					'added_by':c['added_by'],
					'manager':c.get('manager'),
					'is_podpisant':c.get('is_podpisant')
					})
			else:
				findres[itm] = {
					'_id':c['_id'],
					'name': c['name'],# + ' '+ c['addr'],
					'addr': c['addr'],
					'contacts': c['contacts'],
					'added_by':c['added_by'],
					'manager':c.get('manager'),
					'is_podpisant':c.get('is_podpisant'),
					'put_addr':True
					}

	except pymongo.errors.PyMongoError as e:
		abort(400,"server_error")

	# ---------------------------------------------------------
	return {'result': set_client_order_count(findres[:10])}

def set_client_order_count(findres):
	# считаем кол-во заказов
	allcls = []
	ff = findres[:10]
	for f in ff:
		allcls.append(f['_id'])

	orc = ordermodel.get_orders_count_by_client(allcls)

	for f in ff:
		f['cnt'] = orc.get(str(f['_id']), 0)

	return ff

def find(name, cl):
	clientdb = db.clients
	regx = re.compile("^"+name+'.*', re.IGNORECASE)
	data = {'name': regx}
	if (cl == 'cl'):
		data['cl'] = 'cl'
	try:
		# INDEX name, cl
		clients = clientdb.find(data)
		return clients
	except pymongo.errors.PyMongoError as e:
		abort(400,"server_error")

def get(key):
	clientdb = db.clients
	try:
		client = clientdb.find_one({'_id': bson.objectid.ObjectId(key)})
		return client
	except pymongo.errors.PyMongoError as e:
		abort(400,"server_error")

def find_by(param):
	clientdb = db.clients
	try:
		client = clientdb.find_one(param)
		return client
	except pymongo.errors.PyMongoError as e:
		abort(400,"server_error")



def get_all():
	"""Get all"""
	clientdb = db.clients
	try:
		clnts = clientdb.find().sort('sname', direction=1)
		return clnts
	except pymongo.errors.PyMongoError as e:
		abort(400,"server_error")

def get_all_by(param):
	"""Get all"""
	clientdb = db.clients
	try:
		clnts = clientdb.find(param).sort('sname', direction=1)
		return clnts
	except pymongo.errors.PyMongoError as e:
		abort(400,"server_error")


def add(data, user):
	clientdb = db.clients
	codb = db.clientlogs
	data['added'] = datetime.datetime.utcnow()
	data['added_by'] = user
	data['manager'] = user
	data['sname'] = data['name'].lower()

	process_work_status(data, user)

	try:
		client_id = clientdb.insert(data)
		codb.insert(data)
		return client_id
	except pymongo.errors.OperationFailure as e:
		abort(400, "Такой клиент уже существует.")

	except pymongo.errors.PyMongoError as e:
		abort(400, "server_error")

	return client_id

def delete(id):
	clientdb = db.clients
	try:
		clientdb.remove({'_id': id})
		return 'ok'
	except pymongo.errors.PyMongoError as e:
		abort(400,"server_error")

def process_work_status(data, user):
	if 'current_work_status' in data:
		if data['current_work_status'].get('datetime') == 'new':
			data['current_work_status']['datetime'] = datetime.datetime.utcnow().strftime('%d.%m.%Y %H:%M:%S')
		if data['current_work_status'].get('manager') == 'self':
			data['current_work_status']['manager'] = user


	for hist in data['history_work_status']:
		if hist['datetime'] == 'new' or 'upd' in hist['datetime']:
			if hist['datetime'] == 'new':
				hist['datetime'] = datetime.datetime.utcnow().strftime('%d.%m.%Y %H:%M:%S')
		if hist['manager'] == 'self':
			hist['manager'] = user
	data['history_work_status'].append(data['current_work_status'])
	data['history_work_status'].sort(key = lambda x: (routine.strToDateTime( x.get('datetime'))))

def update_status(id, data, user):
	clientdb = db.clients
	codb = db.clientlogs
	orderdb = db.orders

	process_work_status(data, user)

	# data['modified'] = datetime.datetime.utcnow()
	# data['sname'] = data['name'].lower()
	# data['modified_by'] = user
	try:
		res = clientdb.update({'_id': bson.objectid.ObjectId(id)},
							  {'$set':{
							  	'history_work_status':data['history_work_status'],
								'current_work_status':data['current_work_status']
							  }})
	except pymongo.errors.OperationFailure:
		abort(400,"Такой клиент уже существует.")
	except pymongo.errors.PyMongoError as e:
		abort(400,"server_error")
	return data

def update(id, data, user):
	clientdb = db.clients
	codb = db.clientlogs
	orderdb = db.orders

	data['modified'] = datetime.datetime.utcnow()
	data['sname'] = data['name'].lower()
	data['modified_by'] = user
	try:
		res = clientdb.update({'_id': bson.objectid.ObjectId(id)}, {'$set':data})
		codb.update({'_id': bson.objectid.ObjectId(id)}, {'$push':{'logs':data}}, True)
		orderdb.update({'client_id': bson.objectid.ObjectId(id)}, {'$set':{'client':data['name']}})
		projectmodel.update_client(bson.objectid.ObjectId(id), data['name'])
	except pymongo.errors.OperationFailure:
		abort(400,"Такой клиент уже существует.")
	except pymongo.errors.PyMongoError as e:
		abort(400,"server_error")
	return data

def upd(id, data):
	cdb = db.clients
	o_id = cdb.update({'_id': id},{'$set':data})

def get_list(args, fields):
	'''
	Получить требуемые данные по условию
	'''
	data=[]
	try:
		for d in db.clients.find(args, fields):
			data.append(d)
		return data
	except pymongo.errors.PyMongoError as e:
		raise Exception(str(e))

def update_by(by, data, user):
	clientdb = db.clients
	try:
		oo = clientdb.update(by, {'$set':data}, multi=True)
	except pymongo.errors.PyMongoError as e:
		abort(400,"server_error")
	return oo

def get_groups():
	cdb = db.client_groups
	try:
		ret = cdb.find()
	except pymongo.errors.PyMongoError as e:
		abort(400,"server_error")
	return ret

def get_groups_by(data):
	cdb = db.client_groups
	try:
		ret = cdb.find(data)
	except pymongo.errors.PyMongoError as e:
		abort(400,"server_error")
	return ret

def update_group(gr1, data):
	cdb = db.client_groups
	try:
		ret = cdb.update(gr1, {'$set':data}, upsert = True)
		return ret
	except pymongo.errors.PyMongoError as e:
		pass

def del_group(gr):
	cdb = db.client_groups
	try:
		ret = cdb.remove(gr)
		return 'ok'
	except pymongo.errors.PyMongoError as e:
		abort(400,"server_error")



def abc_recalc():
	''' пересчитать значения abc классификации для всех клиентов'''
	# получаем параметры классификации из справочника
	abc = db.dirs.find_one({'type':11});
	orlist = ordermodel.get_signed_summ()

	clients = get_list({},{'abc_history':1, 'last_abc_status':1})

	for client in clients:
		is_save= False
		f_orders = [x for x in orlist if x['_id']==client['_id']]
		order = f_orders[0] if f_orders else None
		history = client['abc_history'] if 'abc_history' in client else []

		#считаем классификацию по клиенту
		abc_client = {'price':{'is_a':False, 'is_c':False}, 'square':{'is_a':False, 'is_c':False},'date':datetime.datetime.utcnow()}

		if order:
			if order['total_price']>abc['client_a_sum']:
				abc_client['price']['is_a'] = True
			if order['total_price']<abc['client_c_sum']:
				abc_client['price']['is_c'] = True
			if order['total_sq']>abc['client_a_square']:
				abc_client['square']['is_a'] = True
			if order['total_sq']<abc['client_c_square']:
				abc_client['square']['is_c'] = True
		else:
			abc_client['square']['is_c'] = True
			abc_client['price']['is_c'] = True

		if len(history)==0:
			history.append(abc_client)
			client['last_abc_status'] = abc_client
			is_save= True
		else:
			last_el = history[len(history)-1]
			if last_el['price']['is_a']!=abc_client['price']['is_a'] or last_el['price']['is_c']!=abc_client['price']['is_c'] or last_el['square']['is_a']!=abc_client['square']['is_a'] or last_el['square']['is_c']!=abc_client['square']['is_c']:
				history.append(abc_client)
				client['last_abc_status'] = abc_client
				is_save = True
		if is_save:
			db.clients.update({'_id':client['_id']},{'$set':{'last_abc_status':abc_client, 'abc_history':history}})
			#client['abc_history'] = history

			#db.clients.update({'_id':client['_id']},client)



	'''for order in orlist:
		is_save = False
		client = db.clients.find_one({'_id':order['_id']})
		history = client['abc_history'] if 'abc_history' in client else []
		#считаем классификацию по клиенту
		abc_client = {'price':{'is_a':False, 'is_c':False}, 'square':{'is_a':False, 'is_c':False},'date':datetime.datetime.utcnow()}
		if order['total_price']>abc['client_a_sum']:
			abc_client['price']['is_a'] = True
		if order['total_price']<abc['client_c_sum']:
			abc_client['price']['is_c'] = True
		if order['total_sq']>abc['client_a_square']:
			abc_client['square']['is_a'] = True
		if order['total_sq']<abc['client_c_square']:
			abc_client['square']['is_c'] = True
		#если history пустой, пишем туда первое значение, иначе, сравниваем с последним элементом в history. Если разница, то изменяем это значение\
		if len(history)==0:
			history.append(abc_client)
			client['last_abc_status'] = abc_client
			is_save= True
		else:
			last_el = history[len(history)-1]
			if last_el['price']['is_a']!=abc_client['price']['is_a'] or last_el['price']['is_c']!=abc_client['price']['is_c'] or last_el['square']['is_a']!=abc_client['square']['is_a'] or last_el['square']['is_c']!=abc_client['square']['is_c']:
				history.append(abc_client)
				client['last_abc_status'] = abc_client
				is_save = True
		if is_save:
			client['abc_history'] = history
			db.clients.update({'_id':client['_id']},client)'''

def do_aggregate(conditions_arr):
	'''
	Универсальная функция выполнения aggregate
	'''
	try:
		dataResult = []
		for row in db.clients.aggregate(conditions_arr):
			dataResult.append(row)
		return dataResult
	except pymongo.errors.PyMongoError as e:
		raise Exception("Error! Can't get data: %s" %(str(e)))

def get_count(cond):
	try:
		oo = db.clients.find(cond).count()
	except pymongo.errors.PyMongoError as e:
		abort(400,"server_error")
	return oo


def get_all_by_filter(filter, fields=None, page_size=50, page=1):
	try:
		res = []
		for row in db.clients.find(filter, fields).sort('last_contact_date', pymongo.DESCENDING ).skip(page_size*(page-1)).limit(page_size):
			res.append(row)
		return res
	except pymongo.errors.OperationFailure as e:
		abort(400, e)
	except pymongo.errors.PyMongoError as e:
		abort(400, "server_error")

''' не используется
def get_all_by_filter(filter, fields=None, sort=None, page_size=50, page=1):
	try:
		res = []
		data = db.clients.find(filter, fields)
		if sort:
			data = data.sort(sort['field'],sort['direction'])
		else:
			data = data.sort('last_contact_date', pymongo.DESCENDING)

		for row in data.skip(page_size*(page-1)).limit(page_size):
			res.append(row)
		return res
	except pymongo.errors.OperationFailure as e:
		abort(400, e)
	except pymongo.errors.PyMongoError as e:
		abort(400, "server_error") '''
