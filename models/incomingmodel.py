#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import error, abort
import pymongo
import bson
from datetime import date, datetime, time
import config
from models import countersmodel
db = config.db

def add(data):
  data['number'] = countersmodel.get_next_sequence('incoming')
  data['date'] = datetime.utcnow()
  try:
    db.incoming.insert(data)
    return data
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))

def get():
  data = []
  try:
    for d in db.incoming.find().sort('date', direction=1):
      del d['_id']
      d['date'] = d['date'].strftime('%d.%m.%Y')
      data.append(d)
    return data
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))
