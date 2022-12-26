#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route, view, get, post, put, request, error, abort, response, debug, static_file, template, redirect
import urllib
import config
from libraries import userlib
from models import workordermodel, planshiftreason, materialsgroupmodel,sectormodel
import json
from routine import  JSONEncoder

@get('/esudtreegraph')
def get_form():
	userlib.check_page_access('esudtreegraph','r')
	return template('views/esudtreegraph', current_user=userlib.get_cur_user(), version=config.VERSION, menu=userlib.get_menu())
