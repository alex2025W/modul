#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import error, abort
import config
import json
import datetime, time
import re
from bson.objectid import ObjectId
db = config.db
from traceback import print_exc


def add(obj_id, type, comment, data, user_email):
  try:
    # если есть запись, то добавляем статус
    res = db.history.find_one({'obj_id':ObjectId(obj_id), 'type':type},{})
    if res:
      logs = {'date':datetime.datetime.utcnow(), 'user':user_email, 'data':data, 'comment':comment}
      db.history.update({'_id':res['_id']}, {'$push':{'logs':logs}})
    else:
      dt = {'obj_id':ObjectId(obj_id), 'type':type, 'logs':[ {'date': datetime.datetime.utcnow(), 'user':user_email, 'data':data, 'comment':comment} ] }
      db.history.insert(dt)
  except Exception, exc:
    excType = exc.__class__.__name__
    print_exc()
    raise Exception(str(exc))
