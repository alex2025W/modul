#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import error, abort
import config
import json
import pymongo
import datetime, time
import re
from bson.objectid import ObjectId
import bson
from libraries import userlib
db = config.db


def add(subject, body, recipients, send_as_html=False, user_email=None, user_fio=None):
	try:
		data = {
			'subject':subject,
			'body':body,
			'recipients':recipients,
			'send_as_html':send_as_html,
			'user_email':user_email,
			'user_fio':user_fio,
			'date_added': datetime.datetime.utcnow(),
			'status':'new',
			'send_attempt':0,
			'last_attempt_date':None
		}
		db.emailqueue.insert(data)
	except Exception, e:
		print('Email queue add error: ' + str(e))
		pass


def get_list(filter, fields=None):
	""" get contract by filter """
	try:
		return db.emailqueue.find(filter, fields).sort('date_added', direction=1)
	except Exception, e:
		print('Email queue get error: ' + str(e))
		pass

def update(cond, data, insert_if_notfound=True, multi_update=False):
	try:
		db.emailqueue.update(cond, data, upsert=insert_if_notfound,multi=multi_update)
	except Exception, e:
		print('Email queue update error: ' + str(e))
		pass
