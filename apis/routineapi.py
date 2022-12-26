#!/usr/bin/python
# -*- coding: utf-8 -*-
import config
from traceback import print_exc

def get_common_info(page_key):
	'''
		Get all pages common information
		- Menu structure
		- Current user info
		- All users info
	'''
	from models import usermodel, pagemodel
	from models_v2.weekends_model import WeekendsModel
	from libraries import userlib
	from bson.objectid import ObjectId

	try:
		# get current user info or system user
		usr_info = userlib.get_cur_user()
		# if not usr_info:
		# 	usr_info = usermodel.get('nobody@modul.org')
		if 'password' in usr_info:
			del usr_info['password']
			del usr_info['credentials']

		# get all menu items
		menu = {}
		pages =[]
		current_page = None
		# filter menu items by user access
		for p in pagemodel.pages:
			if (usr_info.get('admin')=='admin' or len(usr_info.get('pages',{}).get(p['id'],{}))>0 ) and p['visible']:
				pages.append(p)

		for item in pages:
			if item.get('visible'):
				if item['id'] == page_key:
					current_page = item
				if item.get('group'):
					if item['group'] not in menu:
						menu[item['group']] = {'group': item['group'], 'items':[], 'id': str(ObjectId())}
					menu[item['group']]['items'].append(item)
				else:
					menu[item['id']] = item
		menu = menu.values()
		menu.sort(key = lambda x: (x['group']))
		for row in menu:
			if row.get('items'):
				row['items'].sort(key = lambda x: (x['name']))

		# get weekends
		weekendsModel = WeekendsModel()

		# return result
		return {
			'menu': menu,
			'user': usr_info,
			'users': usermodel.get_all(),
			'currentPage': current_page,
			'weekends': weekendsModel.get().get('weekends',[])
		}

	except Exception, exc:
		print('Error. routineapi.get_common_info: {0}'.format(str(exc)))
		excType = exc.__class__.__name__
		print_exc()
		raise Exception('Error. routineapi.get_common_info: {0}'.format(str(exc)))
