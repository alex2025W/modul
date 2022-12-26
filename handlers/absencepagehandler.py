#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import get, post, request
import datetime, time, routine, config
from bson.objectid import ObjectId
from traceback import print_exc
from libraries import userlib

@post('/handlers/absence_page/save')
def save():
  '''
    Save data tfrom client
  '''
  userlib.check_handler_access('absence','w')
  from apis.staff import staffapi
  try:
    staffapi.add_absence(request.json, userlib.get_cur_user())
    return routine.JSONEncoder().encode({'status': 'ok','msg':''})
  except Exception, exc:
    print('---Error. /handlers/ats/check_on_clients; {0}'.format(str(exc)))
    excType = exc.__class__.__name__
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})
  return routine.JSONEncoder().encode({'status':'ok'})
