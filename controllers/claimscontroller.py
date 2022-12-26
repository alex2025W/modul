#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route, view, get, post, put, request, error, abort, response, debug, static_file, template, redirect
import urllib
import config
from libraries import userlib
from models import workordermodel, planshiftreason, materialsgroupmodel,sectormodel
import json
from routine import  JSONEncoder

@route('/claims')
def get_claims():
	userlib.check_page_access('claims','r')
	return template('views/claims', current_user=userlib.get_cur_user(), version = config.VERSION, menu=userlib.get_menu())
