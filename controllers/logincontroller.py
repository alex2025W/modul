#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route, view, get, post, put, request, error, abort, response, debug, static_file, template, redirect,hook
import urllib
import config
from models import usermodel, pagemodel
from libraries import userlib


# обновлять данные авторизации
@hook('before_request')
def update_login_info():
	userlib.update_user_info()



@route('/login')
def login():
	userlib.logout()
	return template('views/login', current_user='', version = config.VERSION, url= usermodel.authorization_url(), useremail="", error=None)

@post('/login')
def login_with_password():
	# проверка пользователя
	dp = usermodel.login_with_password(request.POST["user-login"],request.POST["user-password"])
	if dp==None:
		return template('views/login', current_user='', version = config.VERSION, url= usermodel.authorization_url(), useremail=request.POST["user-login"], error="Неверный email или пароль.")
	if "q" in request.GET:
		redirect(request.GET['q'])
	else:
		redirect('/')


@get('/auth/')
def auth():
	param = request.query.decode()
	if ('error' in param):
		raise Exception(param['error'])
	code = param['code']
	usermodel.login_by_gmail(usermodel.set_user_credentials(code))

	redirect('/')


@route('/logout')
def logout():
	userlib.logout()
	redirect('/login')


@route('/')
def index():
	defpage = userlib.default_page()
	if defpage==None:
		redirect("/login")
	else:
		redirect(pagemodel.get_url(defpage))



@route('/menupage')
def menupage():
	usr = userlib.get_cur_user()
	if usr==None:
		redirect("/login")
	return template('views/menupage', current_user=usr, version = config.VERSION, menu = userlib.get_menu())






