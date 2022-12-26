#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import abort
from config import db
import pymongo
from bson.objectid import ObjectId
from models import countersmodel

def get_all():
	""" Get all suppliers """
	try:
		suppliers = []
		for supplier in db.suppliers.find():
			supplier["id"] = str(supplier.pop("_id"))
			suppliers.append(supplier)
		return suppliers
	except pymongo.errors.PyMongoError as e:
		abort(400, "server_error")

def add(raw_json):
	data = {
		'name': raw_json['name'],
		'enabled': raw_json['enabled']
	}
	try:
		data["id"] = str(db.suppliers.insert(data))
		del data['_id']
	except pymongo.errors.OperationFailure:
		abort(400, "Поставщик с таким названием уже существует")
	except pymongo.errors.PyMongoError as e:
		abort(400, "server_error")
	return data

def update(supplier_id, raw_json):
	data = {
		'name': raw_json['name'],
		'enabled': raw_json['enabled']
	}
	try:
		supplier = db.suppliers.find_and_modify({"_id": ObjectId(supplier_id)}, update={"$set": data}, new=True)
		supplier["id"] = str(supplier.pop("_id"))
	except pymongo.errors.OperationFailure:
		abort(400, "Operation failure")
	except pymongo.errors.PyMongoError as e:
		abort(400, "server_error")
	return supplier

def get_goods(supplier_id):
	""" Get goods of the supplier """
	try:
		supplier = db.suppliers.find_one({"_id": ObjectId(supplier_id)}, { "goods": 1 })
		return supplier['goods']
	except KeyError as e:
		return []
	except pymongo.errors.PyMongoError as e:
		abort(400, "server_error")

def add_good(supplier_id, raw_json):
	data = {
		'supplier_code': raw_json['supplier_code'],
		'name': raw_json['name'],
		'enabled': raw_json['enabled'],
		'manufactor': raw_json['manufactor'],
		'sku': raw_json['sku'],
		'retail_delivery': raw_json['retail_delivery'],
		'sale_delivery': raw_json['sale_delivery'],
		'note': raw_json['note']
	}
	try:
		data['code'] = countersmodel.get_next_sequence('suppliers.goods')
		supplier = db.suppliers.find_and_modify(
				{ "_id": ObjectId(supplier_id) },
				update = {
					"$push": { "goods": data }
				},
				new=True
		)
		supplier["id"] = str(supplier.pop("_id"))
	except pymongo.errors.OperationFailure:
		abort(400, "Operation failure")
	except pymongo.errors.PyMongoError as e:
		abort(400, "server_error")
	return supplier

def update_good(supplier_id, good_id, raw_json):
	data = {
		'goods.$.supplier_code': raw_json.get('supplier_code'),
		'goods.$.name': raw_json.get('name'),
		'goods.$.enabled': raw_json.get('enabled'),
		'goods.$.manufactor': raw_json.get('manufactor'),
		'goods.$.sku': raw_json.get('sku'),
		'goods.$.retail_delivery': raw_json.get('retail_delivery'),
		'goods.$.sale_delivery': raw_json.get('sale_delivery'),
		'goods.$.note': raw_json.get('note')
	}
	try:
		supplier = db.suppliers.find_and_modify({ "_id": ObjectId(supplier_id), "goods.code": raw_json["code"] }, update = { "$set": data }, new = True )
		supplier["id"] = str(supplier.pop("_id"))
	except pymongo.errors.OperationFailure:
		abort(400, "Operation failure")
	except pymongo.errors.PyMongoError as e:
		abort(400, "server_error")
	return supplier
