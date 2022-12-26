#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route, view, get, post, put, request, error, abort, response, debug, static_file, template, redirect
import urllib
import config
from libraries import userlib
import json
from routine import  JSONEncoder

###
### Страница задания на закупку
###
@route('/stock')
def get_form():
	from models import productionordermodel, stockmodel
	from handlers import stockhandler
	userlib.check_page_access('stock','r')
	return template('views/stock', current_user=userlib.get_cur_user(), version = config.VERSION, menu=userlib.get_menu())

