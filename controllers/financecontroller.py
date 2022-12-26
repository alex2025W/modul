#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route, view, get, post, put, request, error, abort, response, debug, static_file, template, redirect
import urllib
import config
from models import usermodel, contractmodel, schedulerlogmodel
from libraries import userlib


@route('/finance')
def dir():	
	userlib.check_page_access("finance","r")
	#cres = contractmodel.get_opened_finance_info()
	return template('views/finance', current_user=userlib.get_cur_user(), version = config.VERSION, menu=userlib.get_menu(), last_update_date=schedulerlogmodel.get_last_date('update_contracts_debts'))
