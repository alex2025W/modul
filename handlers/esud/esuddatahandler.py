#!/usr/bin/python
# -*- coding: utf-8 -*-

from bottle import get, post, put, request, response,delete
from models import datamodel, datacopiesmodel
import routine
import bson
import bson.json_util
import re
from libraries import userlib
import datetime

from traceback import print_exc
from copy import deepcopy,copy

def get_elems_by_path(list,path):
	res = []
	for a in list:
		if a['path']==path:
			res.append(a)
	return res


def sort_comp(list,res,path,pos):
	cnt = get_elems_by_path(list,path)
	cnt = sorted(cnt, key=lambda e:e['routine'])
	for e in cnt:
		pos = pos+1
		res.insert(pos,e)
		list.pop(list.index(e))
	for p in cnt:
		sort_comp( list, res, (p['path']+'-'+str(p['_id'])) if p['path'] else str(p['_id']), res.index(p))


@get('/handlers/esuddata/getlist')
def get_esud_list():
	userlib.check_handler_access('esudtree','r')
	arr = datamodel.get_all()
	# сортируем список
	res = []
	sort_comp(arr,res,'',0)
	#for e in res:
	#	print e['path']+'-'+str(e['_id']) if e['path'] else str(e['_id'])
	return routine.JSONEncoder().encode(res)

@post('/handlers/esuddata/element')
def add_element():
	userlib.check_handler_access('esudtree','w')
	#print request.json
	obj = request.json
	if obj['parent_id'] !="" and obj['parent_id'] is not None:
		obj['parent_id'] = bson.objectid.ObjectId(obj['parent_id'])

	if 'datalink' in obj and obj['datalink']:
		obj['datalink'] =bson.objectid.ObjectId(obj['datalink'])
	return routine.JSONEncoder().encode(datamodel.add(obj))

@put('/handlers/esuddata/element/<elem_id>')
def update_element(elem_id):
	userlib.check_handler_access('esudtree','w')
	obj = request.json
	# получить обновляемый объект
	obj_db = datamodel.get_by_id(elem_id)
	# если обновился parent_id
	if str(obj_db['parent_id'])!=obj['parent_id']:
		datamodel.change_path((obj_db['path']+'-'+elem_id) if obj_db['path'] else elem_id,(obj['path']+'-'+elem_id) if obj['path'] else elem_id)
	routine.JSONEncoder().encode(datamodel.update_multy(
		{'datalink':bson.objectid.ObjectId(elem_id)},
		{
			'name':obj['name'],
			'type':obj['type'],
			'routine':obj['routine'],
			'note':obj['note']
		}))
	return routine.JSONEncoder().encode(datamodel.update_multy(
		{'_id':bson.objectid.ObjectId(elem_id)},
		{
			'name':obj['name'],
			'type':obj['type'],
			'parent_id': bson.objectid.ObjectId(obj['parent_id']) if obj['parent_id'] is not None else None,
			'path':obj['path'],
			'routine':obj['routine'],
			'note':obj['note']
		}))

@delete('/handlers/esuddata/element/<elem_id>')
def delete_element(elem_id):
	userlib.check_handler_access('esudtree','w')
	# получить удаляемый объект
	obj_db = datamodel.get_by_id(elem_id)
	path = (obj_db['path']+'-'+elem_id) if obj_db['path'] else elem_id
	regx = re.compile(path, re.IGNORECASE)
	datamodel.remove_multi({'path':regx})
	datamodel.remove(elem_id)
	return routine.JSONEncoder().encode({"result":"success"})

@put('/handlers/esuddata/updateposition')
def api_save_data():
	"""
	UPDATE routine field
	"""
	userlib.check_handler_access('esudtree','w')
	dataToSave = request.json;
	#print( routine.JSONEncoder().encode(dataToSave))
	for item in dataToSave:
		datamodel.update(item['_id'], {'routine': item['routine']});
	return routine.JSONEncoder().encode({"result":"success"})


@post('/handlers/esuddata/clonetree')
def clone_tree():
	userlib.check_handler_access('esudtree','w')
	arr = datamodel.get_all()
	data = {datacopiesmodel.DATACOPIES['DATE']:datetime.datetime.utcnow(),datacopiesmodel.DATACOPIES['TREE']:bson.json_util.dumps(arr)}
	datacopiesmodel.add(data)
	return routine.JSONEncoder().encode(data)

@get("/handlers/esuddata/gettreeclonelist")
def get_clone_list():
	userlib.check_handler_access('esudtree','r')
	arr = datacopiesmodel.get_all_list()
	return routine.JSONEncoder().encode(arr)


@put('/handlers/esuddata/copyelem')
def api_copy_data():
	"""
	Copy elem
	"""
	userlib.check_handler_access('esudtree','w')
	try:
		elemToCopy = request.json
		copyedElem = None
		if not elemToCopy:
			return routine.JSONEncoder().encode({'status': 'error','msg':'Ошибка! Не задан элемент для копирования.'})

		# получение всех элементов у которых текущий является родителем
		# dataItems = datamodel.get(
		# 			{
		# 				'$or':
		# 				[
		# 					{'parent_id': bson.objectid.ObjectId(elemToCopy['_id'])},
		# 					{'_id': bson.objectid.ObjectId(elemToCopy['_id'])},
		# 				],
		# 				'status':{'$ne':'del'}
		# 			}
		# 			,None)

		regx = re.compile(elemToCopy['_id'], re.IGNORECASE)
		dataItems = datamodel.get(
			{
			'$or':
			[
				{'path':regx},
				{'_id': bson.objectid.ObjectId(elemToCopy['_id'])},
			],
			'status':{'$ne':'del'}
			}, None)


		# создание массива соответствий идентификаторов оригиналов и новых индентификаторов
		idsConformity = {}
		dataItemsCopy = []
		for item in dataItems:
			idsConformity[item['_id']] = bson.objectid.ObjectId()
			copyItem = copy(item)
			if str(item['_id']) == elemToCopy['_id']:
				copyItem['name'] = 'КОПИЯ ' + copyItem['name']
				copyedElem = copyItem
				idsConformity[item['parent_id']] = item['parent_id']
			dataItemsCopy.append(copyItem)

		for item in dataItems:
			copy_id = idsConformity[item['_id']]
			copy_parent_id = idsConformity[item['parent_id']]  if item['parent_id'] else None
			for copyItem in dataItemsCopy:
				# подмена _id
				if copyItem['_id'] == item['_id']:
					copyItem['_id'] = copy_id
					copyItem['parent_id'] = copy_parent_id
				# замена path
				if copyItem['path']!="":
					copyItem['path'] = copyItem['path'].replace(str(item['_id']), str(copy_id))
					if item['parent_id']:
						copyItem['path'] = copyItem['path'].replace(str(item['parent_id']), str(copy_parent_id))

		# добавление результата в БД
		datamodel.add(dataItemsCopy);

		# сортируем список
		result = []
		sort_comp(dataItemsCopy,result, copyedElem['path'] ,0)

		return routine.JSONEncoder().encode({'status': 'success','data':result, 'old_data':dataItems })
	except Exception, exc:
		excType = exc.__class__.__name__
		print_exc()
		return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

