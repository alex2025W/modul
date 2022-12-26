#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route, view, get, post, put, request, error, abort, response, debug, static_file, template, redirect
import urllib
import config
from models import usermodel
from models import dirmodel
from libraries import userlib

def get_dictionary(all):
	dirs = dirmodel.get_all(all)
	data = []
	for dr in dirs:
		if 'price' not in dr:
			dr['price'] = 'disabled'
		if 'structure' not in dr:
			dr['structure'] = 'disabled'
		data.append(dr)
	return data

def get_users():
	users = usermodel.get_all()
	data = []
	for u in users:
		data.append(u)
	return data

@route('/logs')
def logs():	
	userlib.check_page_access('logs','r')
	return template('views/logs', current_user=userlib.get_cur_user(), version = config.VERSION, dicts=get_dictionary(False), users = get_users(), menu=userlib.get_menu())
