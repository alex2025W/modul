#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route, view, get, post, put, request, error, abort, response, debug, static_file, template, redirect
import urllib
import config
from models import usermodel
from libraries import userlib

@route('/calculator')
def calculator():
	userlib.check_page_access("date_calculators","r")
	return template('views/calculator',
		current_user=userlib.get_cur_user(),
		version = config.VERSION,
		menu=userlib.get_menu())
