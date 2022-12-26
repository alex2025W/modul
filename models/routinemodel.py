#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import error, abort
import config
import json
import pymongo
import datetime
import time
import re
from bson.objectid import ObjectId
import bson
db = config.db


def get(args, fields=None):
    try:
        return db.routine.find_one(args, fields)
    except pymongo.errors.PyMongoError as e:
        raise Exception(str(e))


def get_list(args, fields=None):
    data = []
    try:
        for d in db.routine.find(args, fields):
            data.append(d)
        return data
    except pymongo.errors.PyMongoError as e:
        raise Exception(str(e))


def update(args, data):
    try:
        db.routine.update(args, {'$set': data})
    except pymongo.errors.OperationFailure:
        abort(400, "Operation failure")
    except pymongo.errors.PyMongoError as e:
        abort(400, "server_error")
    return data


def push(args, data):
    try:
        db.routine.update(args, {'$push': data})
    except pymongo.errors.OperationFailure:
        abort(400, "Operation failure")
    except pymongo.errors.PyMongoError as e:
        abort(400, "server_error")
    return data


def update_multy(filter, data):
    try:
        db.routine.update(filter, {'$set': data}, multi=True)
    except pymongo.errors.OperationFailure:
        abort(400, "Operation failure")
    except pymongo.errors.PyMongoError as e:
        abort(400, "server_error")
    return data


def do_aggregate(conditions_arr):
    try:
        dataResult = []
        for row in db.routine.aggregate(conditions_arr):
            dataResult.append(row)
        return dataResult
    except pymongo.errors.PyMongoError as e:
        raise Exception("Error! Can't get data: %s" % (str(e)))
