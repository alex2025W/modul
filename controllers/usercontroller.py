#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route, view, get, post, put, request, error, abort, response, debug, static_file, template, redirect
import urllib
import config
from models import rolemodel
from models import pagemodel
from libraries import userlib
import json
import routine


def get_roles():	
	roles = []
	for r in rolemodel.get_all():
		roles.append({'id':r['id'], 'title':r['title'] if 'title' in r else ''})
	return roles

@route('/user')
def user():
	userlib.check_page_access('users','r')
	return template('views/user', current_user=userlib.get_cur_user(), version = config.VERSION, roles=routine.JSONEncoder().encode(get_roles()),pages=routine.JSONEncoder().encode(pagemodel.get_list()), menu=userlib.get_menu())