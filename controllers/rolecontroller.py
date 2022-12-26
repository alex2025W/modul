#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route, view, get, post, put, request, error, abort, response, debug, static_file, template, redirect
import urllib
import config
from models import usermodel
from libraries import userlib
from models import pagemodel
import json


def get_users_list():	
	return usermodel.get_all()

@route('/role')
def user():
	userlib.check_page_access('roles','r')
	return template('views/role', current_user=userlib.get_cur_user(), version = config.VERSION,users=json.dumps(get_users_list()),pages=json.dumps(pagemodel.get_list()),menu=userlib.get_menu())
