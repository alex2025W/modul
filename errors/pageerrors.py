#!/usr/bin/python
# -*- coding: utf-8 -*-
#from gevent import monkey
#monkey.patch_all()
from bottle import route, view, get, post, put, request, error, abort, response, debug, static_file, template, redirect
import urllib
from libraries import userlib
import config
import json

@error(400)
def error400(error):
    response.content_type = "application/json; charset=UTF-8"
    return json.dumps({"error": error.output})

@error(401)
def error401(error):
    response.content_type = "application/json; charset=UTF-8"
    return json.dumps({"error": error.output})

@error(404)
def error404(error):
	userlib.update_user_info()
	return template('views/errorpage', current_user=userlib.get_cur_user(), version = config.VERSION, menu=userlib.get_menu(),error_code=404, error_message="Страница не найдена.")

@error(403)
def error403(error):
	userlib.update_user_info()
	return template('views/errorpage', current_user=userlib.get_cur_user(), version = config.VERSION, menu=userlib.get_menu(),error_code=403, error_message=error.output)


