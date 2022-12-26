#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route, view, get, post, put, request, error, abort, response, debug, static_file, template, redirect
import urllib
import config
from config import db
from libraries import userlib
from models import workordermodel, sectormodel
from handlers import statshandler
import json
from routine import  JSONEncoder

@route('/stats/production')
def get_form():
	# получение выходных дней из календаря
	weekends = (db.weekends.find_one({}, {'weekends': 1}) or {}).get("weekends", [])

	userlib.check_page_access('stats','r')
	data = statshandler.get_stats_production()
	return template('views/stats/stats', current_user=userlib.get_cur_user(), version = config.VERSION, menu=userlib.get_menu(), data=JSONEncoder().encode(data), weekends =  JSONEncoder().encode(weekends))
