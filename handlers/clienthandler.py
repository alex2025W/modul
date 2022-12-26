#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route, get, post, put, request, error, abort, response, debug
import re
import json
import urllib
import bson

from typing import Union
from bson.objectid import ObjectId

import config

import math
import datetime
from dateutil.parser import parse
from dateutil.relativedelta import *
import pprint
import operator

from models import usermodel
from models import clientmodel, contractmodel, contragentmodel
from models import ordermodel
from models import dirmodel, projectmodel

from routine import JSONEncoder
import routine
from libraries import userlib
import pymongo
import re


def ajax_result(result):
	result = {
		"jsonrpc":"2.0",
		"result": result,
		"id": None
	}
	return result

@get('/handlers/clientorders/')
def get_client_orders_cnt():
	userlib.check_handler_access("clients","r")
	param = request.query.decode()
	id = param['id']
	cnt = 1
	orc = ordermodel.get_orders_count_by_client([bson.objectid.ObjectId(id)])
	if len(orc) > 0:
		cnt = orc[id]
	return {'cnt':cnt}


@get('/handlers/clientnamefind/')
def find_client():
	param = request.query.decode()
	query = param['q']
	qtype = param.get("type",'')
	clients = clientmodel.find_by_name(query)
	agents = contragentmodel.find_by_name(query,qtype) if qtype else []

	res = []
	for a in agents:
		res.append({'id':str(a['id']), 'name': a['name'], 'addr':"", 'type': 'contragent', 'client_id': str(a.get('client_id')),'is_podpisant': False})
	for c in clients:
		if not any(x for x in res if str(x.get('client_id')) == str(c['id'])):
			res.append({'id':str(c['id']), 'name': c['name'], 'addr':c['addr'], 'type': 'client', 'is_podpisant': c.get('is_podpisant',False)})


	res.sort(key=lambda x: x['name'])

	return ajax_result(res)

@get('/handlers/clientfind/')
def find_client():
#    userlib.check_handler_access("clients","r")
	param = request.query.decode()
	query = param['q']
	# param = request.query.decode()
	# query = param['q']

	#try:
	clients = clientmodel.findb(query, '')
	# pprint.pprint(clients);
	data = []
	for c in clients['result']:
		cont =  ''
		if len(c['contacts'])>0:
			for co in c['contacts']:
				cont = cont + co['fio']
				if len(co['phone'])>0:
					cont = cont+', '+' '.join(co['phone'])
				if len(co['email'])>0:
					cont = cont+', '+' '.join(co['email'])
				cont =  cont + ', '
			cont = cont[:-2]
		data.append({'id':str(c['_id']), 'name': c['name'], 'len':len(c['name']),'cont':cont,'is_podpisant':c.get('is_podpisant',False)})
		data.sort(key=operator.itemgetter('len'))
	return ajax_result(data)

@get('/handlers/clientfind_email/')
def find_client_by_email():
	userlib.check_handler_access("clients","r")
	param = request.query.decode()
	email = param['q']

	clients = clientmodel.get_list({'contacts':{'$elemMatch':{'email':re.compile(email, re.IGNORECASE)}}},{'name':1})
	res = []
	for c in clients:
		res.append({'id':str(c['_id']), 'name':c['name'], 'cont':0})

	return ajax_result(res)

@get('/handlers/clientfind_phone/')
def find_client_by_phone():
	''' телефоны ищутся только по цифрам (остальные символы отбрасываются) '''
	userlib.check_handler_access("clients","r")
	from apis.client import clientapi

	try:
		param = request.query.decode()
		phone = param['q']
		res = clientapi.find_by_phone(phone)
		return ajax_result(res)
	except Exception, exc:
		print('----Error. /handlers/clientfind_phone/; {0}'.format(str(exc)) )
		return ajax_result([])

@route('/handlers/clientfind/<cl>', ['GET', 'POST'])
def find_client_handler(cl):
	userlib.check_handler_access("clients","r")
	if request.method == 'POST':
		query = request.forms.get('q')
	else:
		query = request.query.get('q')
	# param = request.query.decode()
	# query = param['q']

	# поиск в группах
	regx1 = re.compile(query.replace('+','\+')+'.*', re.IGNORECASE)
	gr_cur = clientmodel.get_groups_by({'name':regx1})
	groups = []
	gr_ids = []
	for g in gr_cur:
		if not g['name'] in gr_ids:
			gr_ids.append(g['name'])
			groups.append(g)
	# поиск клиентов по всем найденным группам
	if len(gr_ids)>0:
		all_clients = clientmodel.get_list({'group':{'$in':gr_ids}},{'name':1,'group':1})
		for g in groups:
			g['clients'] = []
			for c in all_clients:
				if c['group']==g['name']:
					g['clients'].append({'id':c['_id'], 'name':c['name']})


	# получаем доступы для клиентов
	acc = userlib.get_crm_access_user_list()
	# поиск среди клиентов
	clients = clientmodel.findb(query, cl)
	data = []
	for g in groups:
		data.append({'id':'gr_'+str(g['_id']), 'name':g['name'], 'len':len(g['name']), 'cont': u'Группа: '+(','.join([x["name"] for x in g['clients']])) })

	for c in clients['result']:
		# отсеиваем ненужных клиентов по уровню доступа (acc)
			cont =  ''
			have_access = False
			name = c['name']
			if not acc or c['manager'] in acc:
				have_access = True
				if c.get('put_addr') and c.get('addr'):
					name = name+' '+c.get('addr')
				if len(c['contacts'])>0:
					for co in c['contacts']:
						cont = cont + co['fio']
						if len(co['phone'])>0:
							cont = cont+', '+' '.join(co['phone'])
						if len(co['email'])>0:
							cont = cont+', '+' '.join(co['email'])
						cont =  cont + ', '
					cont = cont[:-2]
			data.append({'id':str(c['_id']), 'name': name, 'group':c.get('group'), 'len':len(c['name']),'cont':cont, 'have_access':have_access,'is_podpisant':c.get('is_podpisant',False)})
			data.sort(key=operator.itemgetter('len'))
	return ajax_result(data)
	#return JSONEncoder().encode({"jsonrpc":"2.0","result": data, "groups":groups, "id": None})
	#except Exception, e:
	#    abort(400, str(e))


@put('/handlers/mergeclient/<key>')
def merge_client(key):
	userlib.check_handler_access("clients","w")
	param = request.json
	_id = bson.objectid.ObjectId(key)
	# ищем клиента
	curcl = clientmodel.find_by({'_id': _id})
	if not curcl:
		abort(400, 'Клиент не найден.')
	# ищем другого клиента с таким именем
	oldcl = clientmodel.find_by({'_id':{'$ne': _id},'name': param['name']})
	if not oldcl:
		abort(400, 'Клиент не найден.')

	if (oldcl['addr'] != curcl['addr']):
		oldcl['addr'] = oldcl['addr'] + u' / ' + curcl['addr']

	for cont in curcl['contacts']:
		if cont not in oldcl['contacts']:
			oldcl['contacts'].append(cont)
	old_id = str(oldcl['_id'])
	del oldcl['_id']
	usr = userlib.get_cur_user()
	clientmodel.update(old_id, oldcl, usr['email'])
	ordermodel.update_client(_id, bson.objectid.ObjectId(old_id), oldcl['name'])
	contractmodel.update_client(_id, bson.objectid.ObjectId(old_id), oldcl['name'])

	clientmodel.update_by({'podpisants._id':bson.objectid.ObjectId(_id)},{'podpisants.$.name':oldcl['name'],'podpisants.$.addr':oldcl.get('addr','')},usr)

	clientmodel.delete(_id)
	return {'msg':'ok'}


@put('/handlers/checkclient/<key>')
def check_client(key):
	userlib.check_handler_access("clients","w")
	param = request.json
	_id = bson.objectid.ObjectId(key)
	# ищем клиента с таким именем
	oldcl = clientmodel.find_by({'_id':{'$ne': _id},'name': param['name']})
	if oldcl:
		# найден еще 1 клиент с таким именем
		if 'inn' in oldcl:
			# проверяем инн
			if param['inn'] == u'' or param['inn'] == oldcl['inn']:
				# ошибка - такой клиент существует
				return {'msg':'exists'}
		else:
			if param['inn'] == u'':
				return {'msg':'exists'}

	if param['inn'] == u'':
		del param['inn']

	usr = userlib.get_cur_user()
	cl = clientmodel.update(key, param, usr['email'])
	ordermodel.update_client(_id, _id, param['name'])
	clientmodel.update_by({'podpisants._id':bson.objectid.ObjectId(_id)},{'podpisants.$.name':param['name'],'podpisants.$.addr':param.get('addr','')},usr)
	# обновить клиента в списке подписантов
	clientmodel.update_by({'podpisants._id':_id},{'podpisants.$.name':param['name'],'podpisants.$.addr':param.get('addr','')},usr)
	return {'msg':'ok'}


@post('/handlers/client/status')
def update_client_status():
	userlib.check_handler_access("clients","w")

	param = request.json

	acc = userlib.get_crm_access_user_list()

	#try:
	_id = param['id']
	del param['id']
	usr = userlib.get_cur_user()

	cl = clientmodel.update_status(_id, param, usr['email'])
	param['id'] = _id

	try:
		del param['modified']
	except Exception, e:
		pass
	try:
		del param['modified_by']
	except Exception, e:
		pass
	return param


@put('/handlers/client/<key>')
def update_client(key):
	userlib.check_handler_access("clients","w")

	param = request.json

	acc = userlib.get_crm_access_user_list()

	#try:
	_id = param['id']
	del param['id']
	try:
		if param['inn'] == u'':
			del param['inn']
	except Exception, e:
		pass
	usr = userlib.get_cur_user()

	if param.get('type','') != '':
		rr = dirmodel.get_one({'name': param['type'],'type':12})
		if not rr:
			dirmodel.add({'name':param['type'], 'type': 12,  'stat':'enabled', 'number':0})

	podpisants_id = []
	for p in param.get('podpisants',[]):
		if p.get('_id','').startswith('new'):
			obj = {'_id':ObjectId(), 'name':p.get('name'), 'addr':p.get('addr'), 'agent':False, 'base_group':'no', 'cl':'nocl','group':'','iscl':'','history_work_status':[], 'contacts':[], 'current_work_status': {'status':'active', 'note': ''}, 'is_podpisant':True }
			p['_id'] = obj['_id']
			clientmodel.add(obj,usr)
		else:
			p['_id'] = ObjectId(p['_id'])
			podpisants_id.append(p['_id'])

	if len(podpisants_id):
		clientmodel.update_by({'_id':{'$in':podpisants_id},'is_podpisant':{'$ne':True}},{'is_podpisant':True},usr)


	cl = clientmodel.update(_id, param, usr['email'])
	ordermodel.update_client(bson.objectid.ObjectId(_id), bson.objectid.ObjectId(_id), param['name'])
	clientmodel.update_by({'podpisants._id':bson.objectid.ObjectId(_id)},{'podpisants.$.name':param['name'],'podpisants.$.addr':param.get('addr','')},usr)
	param['id'] = _id

	try:
		del param['modified']
	except Exception, e:
		pass
	try:
		del param['modified_by']
	except Exception, e:
		pass
	return JSONEncoder().encode(param)

	# except Exception, e:
	#     abort(400, str(e))

@post('/handlers/updclient')
def update_client():
	userlib.check_handler_access("clients","w")
	key =request.forms.get('pk')
	data = {'name':request.forms.get('value')}
	usr = userlib.get_cur_user()
	cl = clientmodel.update(key, data, usr['email'])
	return {'status':'ok'}

@post('/handlers/client/check_base')
def check_base():
	userlib.check_handler_access("clients","w")
	_id = request.forms.get('id')
	group = request.forms.get('group')
	cl = clientmodel.find_by({'group':group, 'base_group': 'yes'})
	if (cl):
		return {'result':'no'}
	else:
		return {'result':'ok'}

@post('/handlers/client/groups')
def get_gr():
	userlib.check_handler_access("clients","w")
	cl = clientmodel.get_groups()
	ret = []
	for x in cl:
		#ret.append(x['name'])
		ret.append({'id':x['name'], 'text':x['name']})
	return json.dumps(ret)

@post('/handlers/client/check_group')
def check_gr():
	userlib.check_handler_access("clients","w")
	group = request.forms.get('group')
	cl = clientmodel.find_by({'group':group})
	if (cl):
		return {'result':'ok'}
	else:
		return {'result':'no'}

@post('/handlers/client/del_group')
def del_gr():
	userlib.check_handler_access("clients","w")
	group = request.forms.get('group')
	cl = clientmodel.del_group({'name':group})
	return {'result':'ok'}


@get('/handlers/client/<key>')
def get_client(key):
	userlib.check_handler_access("clients","r")
	#try:
	param = clientmodel.get(key)

	acc = userlib.get_crm_access_user_list()

	if acc and param['manager'] not in acc:
		abort(401, "Доступ запрещен")

	param['id'] = str(param['_id'])

	#print param

	if '_id' in param:
		del param['_id']
	if 'added' in param:
		del param['added']
	if 'added_by' in param:
		del param['added_by']
	if 'manager' in param:
		del param['manager']
	if ('site' not in param):
		param['site'] = ''
		param['site_status'] = ''
		param['site_date'] = ''
	try:
		if 'modified' in param:
			del param['modified']
	except Exception, e:
		pass
	try:
		if 'modified_by' in param:
			del param['modified_by']
	except Exception, e:
		pass
	return JSONEncoder().encode(param)

@get('/handlers/client_group/<key>')
def get_client(key):
	userlib.check_handler_access("clients","r")
	#try:
	param = clientmodel.get(key)

	acc = userlib.get_crm_access_user_list()

	if acc and param['manager'] not in acc:
		abort(401, "Доступ запрещен")

	param['id'] = str(param['_id'])
	if '_id' in param:
		del param['_id']
	if 'added' in param:
		del param['added']
	if 'added_by' in param:
		del param['added_by']
	if 'manager' in param:
		del param['manager']
	if ('site' not in param):
		param['site'] = ''
		param['site_status'] = ''
		param['site_date'] = ''
	try:
		del param['modified']
	except Exception, e:
		pass
	try:
		del param['modified_by']
	except Exception, e:
		pass

	if 'group' in param:
		clients = clientmodel.get_all_by({'group': param['group']})
		for client in clients:
			for contact in client['contacts']:
				item_exists = False
				for item in param['contacts']:
					if contact['fio'] == item['fio']:
						item_exists = True
						item['client_id'] = client['_id']
						item['client_name'] = client['name']
						break
				if not item_exists:
					contact['client_id'] = client['_id']
					contact['client_name'] = client['name']
					param['contacts'].append(contact)
	else:
		contacts = param['contacts']
		for contact in contacts:
			contact['client_id'] = param['id']
			contact['client_name'] = param['name']
			contact['client_self'] = 1

		param['contacts'] = contacts

	try:
		param['contacts'].sort(key = lambda x: (x.get('fio',''), x.get('client_name','') ))
	except:
		pass

	return JSONEncoder().encode(param)
	#except Exception, e:
	#    abort(400, str(e))


@get('/handlers/clients/')
def get_clients():
	userlib.check_handler_access("clients","w")
	param = request.query.decode()
	ret = []
	acc = userlib.get_crm_access_user_list()
	if len(param)>0:
		ands = []
		if 'cl' in param:
			ands.append({'cl':param['cl']})
		if acc:
			ands.append({'manager':{'$in':acc}})
		clients = clientmodel.get_all_by({'$and':ands})
	else:
		if acc:
			clients = clientmodel.get_all_by({'manager':{'$in':acc}})
		else:
			clients = clientmodel.get_all()
	for dr in clients:
		ret.append({
			'id': str(dr['_id']),
			'name': dr['name'],
			'inn': dr['inn'] if 'inn' in dr else '',
			'group': dr['group'] if 'group' in dr else '',
			'base_group': dr['base_group'] if 'base_group' in dr else 'no',
			'cl': dr['cl'] if 'cl' in dr else 'notcl'
			})
	return json.dumps(ret)

@put('/handlers/clientitem/<key>')
def upd_client(key):
	userlib.check_handler_access("clients","w")
	usr = userlib.get_cur_user()
	param = request.json

	if param['inn'] == '':
		del param['inn']

	_id = param['id']
	del param['id']

	if (param['base_group'] == 'yes'):
		clientmodel.update_by({'group': param['group'], 'base_group': 'yes'}, {'base_group': 'no'}, usr['email'])

	if 'rename_group' in param:
		clientmodel.update_by({'group': param['rename_group']}, {'group': param['group']}, usr['email'])
		clientmodel.update_group({'name':param['rename_group']}, {'name':param['group']})
		del param['rename_group']
	elif param['group'] != u'':
		clientmodel.update_group({'name':param['group']}, {'name':param['group']})

	cl = clientmodel.update(_id, param, usr['email'])
	param['id'] = _id
	try:
		del param['added']
	except:
		pass
	try:
		del param['added_by']
	except:
		pass
	try:
		del param['manager']
	except:
		pass
	try:
		del param['modified']
	except Exception, e:
		pass
	try:
		del param['modified_by']
	except Exception, e:
		pass
	return param

@put('/handlers/client/')
def save_client():

	userlib.check_handler_access("clients","w")
	usr = userlib.get_cur_user()
	param = request.json

	if param['inn'] == '':
		del param['inn']

	if (param['type'] != ''):
		rr = dirmodel.get_one({'name': param['type'],'type':12})
		if not rr:
			dirmodel.add({'name':param['type'], 'type': 12,  'stat':'enabled', 'number':0})

	neworder = param.get('neworder')
	if param.get('neworder'):
		del param['neworder']

	#try:
	if (param['id'] == ''):
		del param['id']
		cl = clientmodel.add(param, usr['email'])

		if neworder:
			pass

	else:
		_id = param['id']
		del param['id']
		cl = clientmodel.update(_id, param, usr['email'])



	param['id'] = str(param['_id'])
	del param['_id']
	del param['added']
	del param['added_by']
	del param['manager']
	try:
		del param['modified']
	except Exception, e:
		pass
	try:
		del param['modified_by']
	except Exception, e:
		pass
	return param

	#except Exception, e:
	#    abort(400, str(e))

@get('/convert_clients/')
def convert_clients():

	dirs = dirmodel.get_by_type(12)
	tp = []
	for d in dirs:
		tp.append(d['name'])

	clients = clientmodel.get_all()
	for dr in clients:
		name = dr['name']
		foo =  [x for x in tp if x.lower() in name.lower()]
		if (len(foo) > 0):
			newname = re.sub('^\s*'+foo[0]+'\s*', '', name)
			newname = re.sub('\s*,\s*'+foo[0]+'\s*$', '', newname)
			newname = re.sub('\"', '', newname)
			newclient = dr.copy()
			_id = str(newclient['_id'])
			del newclient['_id']
			newclient['name'] = newname
			newclient['type'] = foo[0]
			clientmodel.update(_id, newclient, 'system')

	return 'ok'


# получить список подписантов для клиента
@get('/handlers/client/podpisants/<client_id>')
def get_podpisants(client_id):
	userlib.check_handler_access("clients","w")
	param = request.query.decode()

	# поиск подписантов клиента
	podpisants = contractmodel.get_list_by({'client_id':ObjectId(client_id), 'client_signator_id':{'$ne':None}}, {'client_signator':1, 'client_signator_id':1, 'number':1})

	podpis_obj = {}
	for p in podpisants:
		if not podpis_obj.get(str(p['client_signator_id'])):
			podpis_obj[str(p['client_signator_id'])] = []
		podpis_obj[str(p['client_signator_id'])].append(p)

	podlist = []
	for p in podpis_obj:
		podlist.append({'id':podpis_obj[p][0]['client_signator_id'], 'name':podpis_obj[p][0]['client_signator'], 'list':podpis_obj[p]})

	res = {'podpisants':podlist}

	# поиск клиентов, у которых этот является подписантом
	podpisants = contractmodel.get_list_by({'client_signator_id':ObjectId(client_id), 'client_id':{'$ne':None}}, {'client_id':1, 'client_name':1, 'number':1})
	podpis_obj = {}
	for p in podpisants:
		if not podpis_obj.get(str(p['client_id'])):
			podpis_obj[str(p['client_id'])] = []
		podpis_obj[str(p['client_id'])].append(p)

	podlist = []
	for p in podpis_obj:
		podlist.append({'id':podpis_obj[p][0]['client_id'], 'name':podpis_obj[p][0]['client_name'], 'list':podpis_obj[p]})

	res['clpodpis'] = podlist

	return JSONEncoder().encode(res)


def sort_client_by_last_contact_date(client):
	# type: (dict) -> datetime.datetime
	"""
	Return 'last_contact_date' filed of client as datetime.datetime

	If 'last_contact_date' field does not exists in client data
	function will return datetime.datetime.min

	If 'last_contact_date' field is not instance of datetime.datetime
	but it's instance of string (or unicode) function will try to parse it to datetime as ISO format.

	:param client: client data as dictionary
	:return: datetime.datetime
	"""

	if 'last_contact_date' not in client:
		return datetime.datetime.min
	else:
		last_contact_date = client['last_contact_date']

	if isinstance(last_contact_date, datetime.datetime):
		return client['last_contact_date']
	else:
		if last_contact_date is None:
			return datetime.datetime.min

		if isinstance(last_contact_date, unicode) or isinstance(last_contact_date, str):
			try:
				return datetime.datetime.strptime(last_contact_date, '%Y-%m-%dT%H:%M:%S.%f')
			except ValueError as e:
				return datetime.datetime.min
		else:
			return datetime.datetime.min


@post('/handlers/client/get_abc_list/<page>')
def get_abc_list(page):
	'''
	Получить список ABC клиентов, по заданным параметрам
	page - текущая страница
	'''
	userlib.check_handler_access("clients", "r")
	# фильтр - Кат., руб. (A, B, C)
	filters_money = request.forms.get('money_type')
	# фильтр - M2., руб. (A, B, C)
	filters_square = request.forms.get('square_type')
	# сортировка
	sort_field = request.forms.get('sort[field]', 'name')
	sort_direction = request.forms.get('sort[direction]', 'ASC')

	# фильтр по умолчанию
	filters = {'abc_history': {'$exists': True}}
	ands = []
	# по деньгам
	if filters_money:
		flist = filters_money.split(",")
		ors = [{"last_abc_status.price."+key: True} for key in [f for f in flist if f != 'multiselect-all' and f != 'is_b']]
		if 'is_b' in flist:
			ors.append({
				'$and': [
					{
						'last_abc_status.price.is_a': {
							'$ne': True
						}
					}, {
						'last_abc_status.price.is_c': {
							'$ne': True
						}
					}
				]
			})
		if len(ors) > 0:
			ands.append({'$or': ors})

	# по площади
	if filters_square:
		flist = filters_square.split(",")
		ors = [{"last_abc_status.square."+key: True} for key in [f for f in flist if f != 'multiselect-all' and f != 'is_b']]
		if 'is_b' in flist:
			ors.append({
				'$and': [
					{
						'last_abc_status.square.is_a': {
							'$ne': True
						}
					}, {
						'last_abc_status.square.is_c': {
							'$ne': True
						}
					}
				]
			})
		if len(ors) > 0:
			ands.append({'$or': ors})
	if len(ands) > 0:
		filters['$and'] = ands

	# основные данные
	data = clientmodel.get_list(filters, {'name': 1, 'last_abc_status': 1, 'last_contact_date': 1, '_id': 1})
	if data and len(data) > 0:
		# вытягиваем заявки клиентов
		orders = ordermodel.get_order_by_clients({})
		for row in data:
			if orders.get(row['_id']):
				row['orders'] = orders.get(row['_id'])
			else:
				row['orders'] = []

	if sort_field == 'name':
		data.sort(key=lambda order: order.get('name', '').lower(), reverse=sort_direction == "DESC")
	elif sort_field == 'last_contact_date':
		data.sort(key=sort_client_by_last_contact_date, reverse=sort_direction == "DESC")
	elif sort_field == 'abc-price':
		data.sort(key=lambda order: ('a' if order.get('last_abc_status')['price']['is_a'] else 'c' if order.get('last_abc_status')['price']['is_c'] else 'b') if order.get('last_abc_status') else 'c', reverse = sort_direction=="DESC")
	elif sort_field == 'abc-sq':
		data.sort(key=lambda order: ('a' if order.get('last_abc_status')['square']['is_a'] else 'c' if order.get('last_abc_status')['square']['is_c'] else 'b') if order.get('last_abc_status') else 'c', reverse = sort_direction=="DESC")
	elif sort_field == 'order_count':
		data.sort(key=lambda order: len(order['orders']), reverse=sort_direction == "DESC")
	# данные отсеиваются по пейджингу
	page = (int)(page)
	page = data[(page-1)*50:page*50]
	return JSONEncoder().encode({'status': 'ok', 'clients': page, 'count': len(data)})


@post('/handlers/crm/comment_textcomplete')
def comment_textcomplete():
	'''
		Получить список контактов, заявок, проектов и компаний, удовлетворящих запросу
	'''
	q = request.forms.get('q','').upper()
	order_id = request.forms.get('order_id')
	client_id = request.forms.get('client_id')
	additional_client_id = request.forms.get('additional_client_id')
	res = []
	if (q and order_id) or additional_client_id:
		# получить список контактов заявки
		#try:
		if additional_client_id:
			param = clientmodel.get(additional_client_id)
		else:
			param = clientmodel.get(client_id)
		contacts = []
		if 'group' in param:
			clients = clientmodel.get_all_by({'group': param['group']})
			for client in clients:
				for contact in client['contacts']:
					item_exists = False
					for item in contacts:
						if contact['fio'] == item['fio']:
							item_exists = True
							item['client_id'] = client['_id']
							item['client_name'] = client['name']
							break
					if not item_exists:
						contact['client_id'] = client['_id']
						contact['client_name'] = client['name']
						contacts.append(contact)
		else:
			contacts = param['contacts']
			for contact in contacts:
				contact['client_id'] = param['_id']
				contact['client_name'] = param['name']
				contact['client_self'] = 1
		contacts.sort(key = lambda x: (x.get('fio',''), x.get('client_name','') ))
		for cl in contacts:
			if re.search(q.decode('utf-8'),cl.get('fio'),re.IGNORECASE | re.UNICODE):
				res.append({'type':'contact', 'name': cl.get('fio'), 'key':cl.get('client_id') })
			#except Exception, ex:
			#	print ex
			#	pass
		if not additional_client_id:
			# получить список заявок
			o_list = ordermodel.get_list({'$where':'/^'+q+'.*/.test(this.number)'},{'_id':1, 'number':1})
			if o_list:
				# ограничиваем кол-во договоров 10-ю
				cnt = 0
				for o in o_list:
					res.append({'type':'order', 'name':str(o.get('number')), 'key':o.get('_id')})
					cnt+=1
					if cnt>10:
						break
			# получить список проектов
			p_list = projectmodel.get_all({'$where':'/^'+q+'.*/.test(this.project_name.toUpperCase())'},{'_id':1, 'project_name':1}, 10,1) # тоже вытягиваем только первые 10
			for p in p_list:
				res.append({'type':'project', 'name': p.get('project_name'), 'key': p.get('_id')})
			# получить список компаний
			for cl in clientmodel.get_all_by_filter({'$where':'/^'+q+'.*/.test(this.name.toUpperCase())'},{'_id':1, 'name':1}, 10,1):
				res.append({'type':'client', 'name':cl.get('name'), 'key':cl.get('_id')})
		res.sort( key= lambda x: (x.get('name')))
	return JSONEncoder().encode(res)
