#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route, get, post, put, request, error, abort, response, debug
import json
import urllib
import bson
from models import projectmodel
from routine import JSONEncoder, moscow_tz_offset
from bson.objectid import ObjectId
from models import countersmodel
import routine
import datetime
from libraries import userlib
import config
import re



@post("/handlers/projects/project")
def add_project():
	userlib.check_handler_access("app","w")
	param = request.json
	cur_user = userlib.get_cur_user()
	param['date_add'] = datetime.datetime.utcnow()
	param['added_by'] = cur_user['email']
	param['date_edit'] = datetime.datetime.utcnow()
	param['edited_by'] = cur_user['email']

	for c in param.get('clients',[]):
		c['id'] = ObjectId(c['id'])

	projectmodel.add(param)
	reset_orders(param)
	return JSONEncoder().encode(param)

def reset_orders(project):
	from models import ordermodel
	# ордеры обновляются только для основных договоров. допы не обновляются
	ordermodel.update_by({'projects.project_id':project['_id']},{'$pull':{'projects':{'project_id':project['_id']}}},False,True)
	#print project
	for o in project.get('linked_orders',[]):
		#print (o)
		ordermodel.update_by({'number':o},{'$push':{'projects':{'project_id':project['_id'], 'project_name':project['project_name']}}})



@put("/handlers/projects/project")
def update_project():
	userlib.check_handler_access("app","w")
	param = request.json
	cur_user = userlib.get_cur_user()
	param['date_edit'] = datetime.datetime.utcnow()
	param['edited_by'] = cur_user['email']
	param['_id'] = ObjectId(param["_id"])

	for c in param.get('clients',[]):
		c['id'] = ObjectId(c['id'])

	projectmodel.update({'_id':param['_id']},param)
	reset_orders(param)
	return JSONEncoder().encode(param)


@get("/handlers/projects/project/<pid>")
def get_project(pid):
	return JSONEncoder().encode(projectmodel.get({'_id':ObjectId(pid)}))


@post("/handlers/projects/list/<page>")
def get_list(page):
	userlib.check_handler_access("app","r")
	cond = {}
	if request.forms.get('q'):
		regx1 = re.compile('.*'+request.forms.get('q')+'.*', re.IGNORECASE)
		cond = {'project_name':regx1}
	if page=='all':
		import sys
		res = {'result':'ok', 'projects':projectmodel.get_all(cond,None,sys.maxint,1),'count':projectmodel.get_count({})}
	else:
		res = {'result':'ok', 'projects':projectmodel.get_all(cond,None,50,int(page)),'count':projectmodel.get_count({})}
	return JSONEncoder().encode(res)

'''@post("/handlers/projects/find")
def find()
	userlib.check_handler_access("app","r")
	query = request.forms.get('q')
	regx1 = re.compile(query+'.*', re.IGNORECASE)
	projects = projectmodel.get_all({'project_name':regx1},None,sys.maxint,1)
	return {'result':'ok', 'projects':projects, 'count': len(projects) } '''



@route("/handlers/projects/search_tn", ['GET', 'POST'])
def search_tn():
	userlib.check_handler_access("app","r")
	if request.method == 'POST':
		query = request.forms.get('q')
	else:
		query = request.query.get('q')

	regx1 = re.compile(query+'.*', re.IGNORECASE)
	projects = projectmodel.get_all({'project_name':regx1},{'project_name':1},20,1)
	res = []
	for p in projects:
		res.append({'id':p['_id'], 'name':p['project_name']})
	return JSONEncoder().encode(res)
