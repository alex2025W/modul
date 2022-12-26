#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route, get, post, put, request, error, abort, response, debug
import json
import bson
import urllib
from bson.objectid import ObjectId
import config

import math
import datetime
from dateutil.parser import parse
from dateutil.relativedelta import *
import pprint
import operator

from libraries import userlib


# получить конечную дату с учетом выходных и праздников
def _getFinalWorkDate(start_date, day_count):
				day_count = int(day_count)
				ed_date = start_date
				weekends = (config.db.weekends.find_one({}, {'weekends': 1}) or {}).get("weekends", [])
				if day_count>0:
					while day_count>0:
									ed_date = ed_date+datetime.timedelta(days=1)
									strdt = ed_date.strftime('%Y-%m-%d')
									if not strdt in weekends:
													day_count = day_count-1
				else:
					while day_count<0:
									ed_date = ed_date-datetime.timedelta(days=1)
									strdt = ed_date.strftime('%Y-%m-%d')
									if not strdt in weekends:
													day_count = day_count+1

				return ed_date

# получить число рабочих дней
def _getFinalWorkDays(start_date, end_date):
				diff = start_date - end_date
				if diff.days < 0:
								ed_date = start_date
								fd_date = end_date
				else:
								ed_date = end_date
								fd_date = start_date

				weekends = (config.db.weekends.find_one({}, {'weekends': 1}) or {}).get("weekends", [])
				work_days = 0

				while (ed_date-fd_date).days < 0:
								ed_date = ed_date+datetime.timedelta(days=1)
								strdt = ed_date.strftime('%Y-%m-%d')
								if not strdt in weekends:
												work_days = work_days+1
				return work_days


@post('/handlers/calculator')
def calculator():
				userlib.check_handler_access("date_calculators","r")
				param = request.json
				if param['operator'] == u'date_plus_work_day':
								a = datetime.datetime.strptime(str(param['a']),'%d.%m.%Y')
								b = param['b']
								return {'result': _getFinalWorkDate(a, b).strftime('%d.%m.%Y')}
				else:
								a = datetime.datetime.strptime(str(param['a']),'%d.%m.%Y')
								b = datetime.datetime.strptime(str(param['b']),'%d.%m.%Y')
								return {'result': _getFinalWorkDays(a,b)}
