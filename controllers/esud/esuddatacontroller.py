#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route, view, get, post, put, request, error, abort, response, debug, static_file, template, redirect
import urllib
import config
from libraries import userlib
from models import datamodel
import routine
from routine import  JSONEncoder

def get_elems_by_path(list,path):
	res = []
	for a in list:
		if a['path']==path:
			res.append(a)
	return res


def sort_comp(list,res,path,pos):
	cnt = get_elems_by_path(list,path)
	cnt = sorted(cnt, key=lambda e:e['routine'])
	for e in cnt:
		pos = pos+1
		res.insert(pos,e)
		list.pop(list.index(e))
	for p in cnt:
		sort_comp( list, res, (p['path']+'-'+str(p['_id'])) if p['path'] else str(p['_id']), res.index(p))

@route('/esudtree')
def user():
	userlib.check_handler_access('esudtree','r')
	tree_data = datamodel.get_all()
	res = []
	sort_comp(tree_data,res,'',0)
	return template('views/esud/esudtree', current_user=userlib.get_cur_user(), version = config.VERSION,  menu=userlib.get_menu(),tree_data=JSONEncoder().encode(res))
