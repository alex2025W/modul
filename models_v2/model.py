#!/usr/bin/python
# -*- coding: utf-8 -*-
import pymongo
import datetime, time
import re
import bson

class Model:
  '''
    Base DB model class
  '''
  _collection = None # db data collection

  def __init__(self, collection):
    self._collection = collection

  def get(self, args = None, fields = None):
    try:
      return self._collection.find_one(args, fields)
    except pymongo.errors.PyMongoError as e:
      raise Exception(str(e))

  def get_list(self, args = None, fields = None):
    data=[]
    try:
      for d in self._collection.find(args, fields):
        data.append(d)
      return data
    except pymongo.errors.PyMongoError as e:
      raise Exception(str(e))

  def add(self, data):
    try:
      self._collection.insert(data)
    except pymongo.errors.OperationFailure as e:
      raise Exception(str(e))
    except pymongo.errors.PyMongoError as e:
      raise Exception(str(e))

  def update_by_id(self, id, data):
    try:
      self._collection.update({'_id':ObjectId(id)},{'$set':data})
    except pymongo.errors.OperationFailure:
      raise Exception(str(e))
    except pymongo.errors.PyMongoError as e:
      raise Exception(str(e))
    return data

  def update(self, cond, data, insert_if_notfound=True, multi_update=False):
    try:
      self._collection.update(cond, data, upsert=insert_if_notfound,multi=multi_update)
    except pymongo.errors.OperationFailure as e:
      raise Exception(str(e))
    except pymongo.errors.PyMongoError as e:
      raise Exception(str(e))

  def update_multy(self, filter,data):
    try:
      self._collection.update(filter,{'$set':data},multi=True)
    except pymongo.errors.OperationFailure:
      raise Exception(str(e))
    except pymongo.errors.PyMongoError as e:
      raise Exception(str(e))
    return data

  def clear(self):
    try:
      self._collection.remove(None)
    except pymongo.errors.OperationFailure:
      raise Exception(str(e))
    except pymongo.errors.PyMongoError as e:
      raise Exception(str(e))
    return True

  def remove(self, args):
    try:
      self._collection.remove(args)
    except pymongo.errors.OperationFailure:
      raise Exception(str(e))
    except pymongo.errors.PyMongoError as e:
      raise Exception(str(e))
    return True

  def do_aggregate(self, conditions_arr):
    try:
      dataResult = []
      for row in self._collection.aggregate(conditions_arr):
        dataResult.append(row)
      return dataResult
    except pymongo.errors.PyMongoError as e:
      raise Exception("Error! Can't get data: %s" %(str(e)))
