#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route, view, get, post, put, request, error, abort, response, debug, static_file, template, redirect
import urllib
import config
from libraries import userlib
import json
from routine import  JSONEncoder

@route('/brief')
def get_form():
	userlib.check_page_access('brief','r')
	from models import sectormodel
	sector_types = sectormodel.get_all_sector_types()
	return template('frontend/brief/templates/index',
    current_user=userlib.get_cur_user(),
    version = config.VERSION,
    menu=userlib.get_menu(),
    sector_types = sector_types
  )
