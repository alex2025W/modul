#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import error, abort
import pymongo
from datetime import date, datetime, time
from pymongo import MongoClient
import config
from models import countersmodel
db = config.db

def add_outgoing(data):
  data['number'] = countersmodel.get_next_sequence('outgoing')
  data['date'] = datetime.utcnow()
  try:
    db.outgoing.insert(data)
    return data
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))

def get_outgoing():
  data = []
  try:
    for d in db.outgoing.find().sort('date', direction=1):
      del d['_id']
      d['date'] = d['date'].strftime('%d.%m.%Y')
      data.append(d)
    return data
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))
