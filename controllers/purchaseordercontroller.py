#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route, view, get, post, put, request, error, abort, response, debug, static_file, template, redirect
import urllib
import config
from libraries import userlib
import json
from apis.esud import esudspecificationapi
from routine import  JSONEncoder

###
### Страница задания на закупку
###
'''@route('/purchaseorder')
def get_form():
	from models import productionordermodel
	from apis.esud import esudspecificationapi
	userlib.check_page_access('purchaseorder','r')
	# список всех участков
	sectors = esudspecificationapi.get_sectors()
	# список всех номеров заказов
	orders = productionordermodel.get_list({}, {'_id':1, 'number':1, 'products':1})
	return template('views/purchaseorder', current_user=userlib.get_cur_user(), version = config.VERSION, menu=userlib.get_menu(), sectors = JSONEncoder().encode(sectors), orders =JSONEncoder().encode(orders))
'''


###
### Страница нормы расхода
###
@route('/purchasenorms')
def get_form():
	from models import productionordermodel
	from apis.esud import esudspecificationapi
	userlib.check_page_access('purchasenorms','r')
	# список всех участков
	sectors = esudspecificationapi.get_sectors()
	# список всех номеров заявок
	prod_list = productionordermodel.get_list({}, {'_id':1, 'number':1, 'products':1, 'order':1})
	# список заказов
	orders={}
	for p in prod_list:
		if p.get('order') and p['order'].get('number') in orders:
			orders[p['order'].get('number')].append({'_id':p['_id'], 'number':p['number'], 'products':p['products']})
		else:
			orders[p['order'].get('number')] = [{'_id':p['_id'], 'number':p['number'], 'products':p['products']}]

	return template('views/purchasenorms', current_user=userlib.get_cur_user(), version = config.VERSION, menu=userlib.get_menu(), sectors = JSONEncoder().encode(sectors), orders =JSONEncoder().encode(orders))
