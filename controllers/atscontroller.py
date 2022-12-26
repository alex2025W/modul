#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route, view, get, post, put, request, error, abort, response, debug, static_file, template, redirect
import urllib, config
from routine import  JSONEncoder
from libraries import userlib

@route('/crm/ats')
def ats_list():
	'''
	Страница списка входящих заявок по ЦРМ
	'''
	usr = userlib.get_cur_user()
	userlib.check_page_access('ats','r')
	# построение страницы
	return template('views/ats', current_user=userlib.get_cur_user(), version = config.VERSION, menu=userlib.get_menu(), data = None, system_objects = None)
