#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route, get, post, put, request, error, abort, response, debug
import datetime
from bson.objectid import ObjectId
from libraries import userlib
from helpers import mailer
from models import productionordermodel, planshiftreason, usermodel, noticemodel, brigademodel, usermodel
import routine
from xlrd import open_workbook
from xlutils.copy import copy as wbcopy
from xlwt import Workbook, XFStyle, Alignment, Font
from traceback import print_exc
import calendar

def __gt(dt_str):
	dt, _, us= dt_str.partition(".")
	dt= datetime.datetime.strptime(dt, "%Y-%m-%dT%H:%M:%S")
	try:
		us=int(us.rstrip("Z"), 10)
	except:
		us=0
	return dt + datetime.timedelta(microseconds=us)

def prepare_reason_nodes(data):
	'''
		Подговтока данных для фиксации комментария к приичне переноса сроков по работе
	'''
	result = None
	if data and len(data)>0:
		result = []
		for row in data:
			tmp = [row['workorder_number']]
			if row['work_code']:
				tmp.append(row['work_code'])
			result.append(tmp)
	return result

@post('/handlers/newjoblog/check_workers')
def check_workers():
	'''
		Проверка работников на участие в других заданиях на производство на указанную дату
	'''
	response.content_type = "application/json; charset=UTF-8"
	userlib.check_handler_access("newjoblog","r")
	try:
		# get request info
		dataToSave = request.json
		usr = userlib.get_cur_user()
		# get parameters
		if not 'date' in dataToSave:
			return {'status':'error', 'msg':'Не задана дата.'}

		cur_date = datetime.datetime.strptime(dataToSave['date'], '%d/%m/%Y')

		# iss_363 проверка, не задействован ли кто-либо из работников на указанную дату в каком-либо задании на производство
		# проверка ведется для выставления трудового участия того или иного работника
		if dataToSave['workers'] is not None and len(dataToSave['workers'])>0:
			w_emails = []
			for w in dataToSave['workers']:
				w_emails.append(w['user_email'])

			cond = [
				{"$unwind": "$work_orders"},
				{"$project":{
					"_id":1,
					"number":1,
					"work_order_number": "$work_orders.number",
					"workers_participation":1,
					}
				},
				{"$unwind": "$workers_participation"},
				{"$project":{
					"_id":1,
					"number":1,
					"work_order_number": 1,
					"workers": "$workers_participation.workers",
					"fact_date": "$workers_participation.fact_date"
					}
				},
				{"$match": {
					"$and": [
						{'fact_date': {"$gte":datetime.datetime.strptime(dataToSave['date'], '%d/%m/%Y')}},
						{'fact_date': {"$lte":datetime.datetime.strptime(dataToSave['date'], '%d/%m/%Y').replace(hour=23, minute=59, second=59, microsecond = 0)}}
					]}
				},
				{"$unwind": "$workers"},
				{"$project":{
					"contract_id":1,
					"contract_number":1,
					"number":1,
					"fact_date": 1,
					"user_email": "$workers.user_email",
					}
				},
				{"$match": {
					'user_email': {"$in": w_emails},
					}
				}
			]

			db_res = productionordermodel.do_aggregate(cond)
			# группировка данных по работникам
			tmp_workers = {}
			for w in db_res:
				if w['user_email'] not in tmp_workers:
					tmp_workers[w['user_email']] = []
				if str(w['number']) not in tmp_workers[w['user_email']]:
					tmp_workers[w['user_email']].append(str(w['number']))

			# поверяем, не участвовал ли какой из работников на указанную дату в дргом договоре
			for w in dataToSave['workers']:
				if w['user_email'] in tmp_workers:
					w_production_orders = tmp_workers[w['user_email']]
					for w_production_order in w_production_orders:
						if w_production_order != str(dataToSave['work_order']['number']):
							return routine.JSONEncoder().encode({'status': 'error','msg':"Работник, {0}, на указанный день уже задействован в заказе на производство: {1}. Проверьте данные и повторите попытку.".format(w['user_fio'], w_production_order )})

		return routine.JSONEncoder().encode({'status': 'ok'})
	except Exception, e:
		print('Check workers error: ' + str(e))
		return routine.JSONEncoder().encode({'status': 'error','msg':str(e)})

@put('/handlers/newjoblog/savedata')
def api_save_data():
	#return {'status':'ok'}
	'''
	Save fact dates and scopes for works.
	Inner structure format:
	 {
		"brigade_id" :  'String',
		"weekend": ''True/False'',
		"fact_scope": 'Double',
		"date": 'dd/mm/yyyy',
		fact_works:
		{
			'id',
			'work_id',
			'code',
			'name' ,
			'unit' ,
			'plan_scope',
			'fact_scope' ,
			'balance',
			'status',
			'date_start',
			'date_finish',
			reason,
                                            note,
                                            type,
                                            shift
		},
		work_order:
		{
			'number',
			'_id',
			'contract_number',
			'contract_id',
			'product_number',
			'product_name',
			'product_id',
			'sector_code',
			'sector_name'
		}
	};
	'''
	response.content_type = "application/json; charset=UTF-8"
	userlib.check_handler_access("newjoblog","w")
	try:
		usr = userlib.get_cur_user()
		# get request info
		dataToSave = request.json;

		# получение инфомрации о заказе на производство
		production_order = productionordermodel.get(
			{'number': routine.strToInt(dataToSave['work_order']['production_order_number'])},
			{
				'_id':1,
				'number':1,
				'product':1,
				'work_orders':1
			}
		)
		if not production_order:
			return {'status':'error', 'msg':'Заказ на производство не найден.'}
		# получение инфомрации о текущем наряде
		worder = None
		try:
			worder = (i for i in production_order['work_orders'] if str(i['_id']) == str(dataToSave['work_order']['_id']) ).next()
		except:
			return routine.JSONEncoder().encode({'status': 'error','msg':"Ошибка получения данных о текущем наряде. Наряд не найден."})


		#--------------------------------------------------------------------------------------------------------------------------------------------------------------
		# Проверка формата уточнений
		if dataToSave['fact_works'] is not None and len(dataToSave['fact_works'])>0:
			cur_date = datetime.datetime.strptime(dataToSave['date'], '%d/%m/%Y')
			#cur_date = datetime.datetime.today().replace(hour=0, minute=0, second=0, microsecond = 0)
			groupped_data = {}
			for item in dataToSave['fact_works']:
				if str(item.get('transfer_reason_id','')) in planshiftreason.SYSTEM_IDS or str(item.get('reason_id','')) in planshiftreason.SYSTEM_IDS:
						reason_notes = item.get('reason_note_obj', [])
						for row in reason_notes:
							if row['workorder_number'] not in groupped_data:
								groupped_data[row['workorder_number']] = []
							if row['work_code'] and row['work_code'] not in groupped_data[row['workorder_number']]:
								groupped_data[row['workorder_number']].append(row['work_code'])
			if len(groupped_data)>0:
				# получение из бд информации о работах и нарядах
				conds = []
				for item_number in groupped_data:
					tmp_cond = {'number': item_number}
					if len(groupped_data[item_number])>0:
						tmp_cond['plan_work_code'] = {'$in': groupped_data[item_number]}
					conds.append(tmp_cond)

				cond = [
					{'$unwind': "$work_orders"},
					{"$project":
						{
							"production_order_id":"$_id",
							"production_order_number":"$number",
							"number":"$work_orders.number",
							"date_start_with_shift":"$work_orders.date_start_with_shift",
							"date_finish_with_shift":"$work_orders.date_finish_with_shift",
							"items":"$work_orders.items"
						}
					},
					{"$match": {'number': {"$in":groupped_data.keys()} }},
					{"$unwind": "$items"},
					{"$project":
						{
							"production_order_id":1,
							"production_order_number":1,
							"number":1,
							"date_start_with_shift": 1,
							"date_finish_with_shift": 1,
							"plan_work_date_start_with_shift":"$items.date_start_with_shift",
							"plan_work_date_finish_with_shift":"$items.date_finish_with_shift",
							"plan_work_code": "$items.number",
						}
					},
					{"$match": {'$or':conds}}
				]
				db_res = productionordermodel.do_aggregate(cond)

				for item in dataToSave['fact_works']:
					if str(item.get('transfer_reason_id','')) in planshiftreason.SYSTEM_IDS or str(item.get('reason_id','')) in planshiftreason.SYSTEM_IDS:
						reason_notes = item.get('reason_note_obj', [])

						reason = str(item.get('transfer_reason_id','')) if str(item.get('transfer_reason_id','')) in planshiftreason.SYSTEM_IDS else str(item.get('reason_id',''))

						for row in reason_notes:
							data_item = None
							date_start = None
							date_finish = None
							if row['work_code']:
								try:
									data_item =  (i for i in db_res if i['number'] == row['workorder_number'] and i['plan_work_code'] == row['work_code']).next()
									date_start = data_item['plan_work_date_start_with_shift']
									date_finish = data_item['plan_work_date_finish_with_shift']
								except:
									pass
							else:
								try:
									data_item =  (i for i in db_res if i['number'] == row['workorder_number']).next()
									date_start = data_item['date_start_with_shift']
									date_finish = data_item['date_finish_with_shift']
								except:
									pass

							# если элемент не найден, то ошибка
							if not data_item:
								return routine.JSONEncoder().encode({'status':'error', 'data': row, 'msg': 'Ошибка проверки формата уточнения к причинам переноса. Убедитесь что все указанные, в уточнениях, наряды и работы корректны.'})
							try:
								# проверка работ на принадлежность к указанной причине
								if reason == planshiftreason.SYSTEM_OBJECTS['NOT_PLAN_WORK']:
									if date_start<=cur_date and date_finish>=cur_date:
									 	return routine.JSONEncoder().encode({'status': 'error', 'data': row, 'msg':'Для некоторых работ в качестве причины отлонений указана: "Другая внеплановая работа", но среди работ, указанных в уточнении, есть работы, запланированные на указанную дату. Проверьте данные или выберите другую причину отклонений.'})
								elif reason == planshiftreason.SYSTEM_OBJECTS['PLAN_WORK']:
									if not(date_start<=cur_date and date_finish>=cur_date):
									 	return routine.JSONEncoder().encode({'status': 'error', 'data': row,'msg':'Для некоторых работ в качестве причины отлонений указана: "Другая плановая работа", но среди работ, указанных в уточнении, есть работы, не запланированные на указанную дату. Проверьте данные или выберите другую причину отклонений.'})
							except:
								pass
		#--------------------------------------------------------------------------------------------------------------------------------------------------------------

		worder_date_start_with_shift = None
		worder_date_finish_with_shift = None
		if dataToSave['fact_works'] is not None and len(dataToSave['fact_works'])>0:
			for item in dataToSave['fact_works']:
				# поиск плановой работы в изменяемом наряде
				plan_work = (i for i in worder['items'] if str(i['_id']) == str(item['id']) ).next()
				if 'fact_work' not in plan_work:
						plan_work['fact_work'] = []
				if 'status_log' not in plan_work:
						plan_work['status_log'] = []
				if 'plan_shifts' not in plan_work:
						plan_work['plan_shifts'] = []

				# add new fact if scope>0
				if  routine.strToFloat(item['fact_scope'])>0 or (item['old_status']!=item['status'] and item['status']=='completed'):
				#if  routine.strToFloat(item['fact_scope'])>0 or item['old_status']!=item['status']:
					if item['status']=='':
						item['status'] = 'on_work'
					fact_work = {
						'_id': ObjectId(),
						'date_change': datetime.datetime.utcnow(),
						'brigade_id': ObjectId(dataToSave['brigade_id']) if dataToSave.get('brigade_id') else None,
						'date':datetime.datetime.strptime(dataToSave['date'], '%d/%m/%Y'),
						'user_email': usr['email'],
						'scope': routine.strToFloat(item['fact_scope']),
						'weekend': True if dataToSave['weekend']==True else False
					}

					if 'fact_work' not in plan_work:
						plan_work['fact_work'] = []
					plan_work['fact_work'].append(fact_work)
					plan_work['last_fact_date'] = datetime.datetime.strptime(dataToSave['date'], '%d/%m/%Y')

				# update work status
				if routine.strToFloat(item['fact_scope']) == routine.strToFloat(item['balance']) and routine.strToFloat(item['fact_scope'])>0:
					item['status']='completed'
				if(item['old_status']!=item['status'] or item['repeat'] or item['status']=='on_work'):
					status_log_item = {
							'_id': ObjectId(),
							'date_change': datetime.datetime.utcnow(),
							'brigade_id': ObjectId(dataToSave['brigade_id']) if dataToSave['brigade_id'] else None,
							'date':datetime.datetime.strptime(dataToSave['date'], '%d/%m/%Y'),
							'user_email': usr['email'],
							'reason_id': ObjectId(item['reason_id']) if 'reason_id' in item and item['reason_id']!='' and item['reason_id'] is not None else '',
							'reason': item['reason'] if 'reason' in item else '',
							'reason_nodes': prepare_reason_nodes(item.get('reason_note_obj', None)) if item.get('reason','')!='' else None,
							'note': item['note'] if 'note' in item else '',
							'status': item['status'],
							'source': 'fact'
						}
					plan_work['status'] = item['status']
					plan_work['status_log'].append(status_log_item)

				# if need date shift
				if 'shift' in item and routine.strToInt(item['shift'])!=0 and 'transfer_reason_id' in item:
					plan_shift = {
						'_id': ObjectId(),
						'date_change': datetime.datetime.utcnow(),
						'user_email': usr['email'],
						'reason_id': ObjectId(item['transfer_reason_id']),
						'reason': item['transfer_reason'],
						'reason_nodes': prepare_reason_nodes(item.get('reason_note_obj', None)),
						'type': item['type'],
						'shift': routine.strToInt(item['shift']),
						'note': item['note'],
						'source': 'fact'
					}
					plan_work['plan_shifts'].append(plan_shift)

					# update date_start_with_shift and date_finish_with_shift using cur shift value
					date_start_with_shift = None;
					date_finish_with_shift = None;
					for plan_work in worder['items']:
						if str(plan_work['_id'])==item['id']:
							date_start_with_shift = plan_work['date_start_with_shift'] if plan_work['date_start_with_shift'] is not None else plan_work['date_start']
							date_finish_with_shift = plan_work['date_finish_with_shift'] if plan_work['date_finish_with_shift'] is not None else plan_work['date_finish']
							break
					if item['type']=='start':
						date_start_with_shift = date_start_with_shift + datetime.timedelta(days= routine.strToInt(item['shift']))
					elif item['type'] == 'finish':
						date_finish_with_shift = date_finish_with_shift + datetime.timedelta(days= routine.strToInt(item['shift']))
					else:
						date_start_with_shift = date_start_with_shift + datetime.timedelta(days= routine.strToInt(item['shift']))
						date_finish_with_shift = date_finish_with_shift + datetime.timedelta(days= routine.strToInt(item['shift']))

					plan_work['date_start_with_shift'] = date_start_with_shift
					plan_work['date_finish_with_shift'] = date_finish_with_shift

					if not worder_date_start_with_shift or worder_date_start_with_shift > date_start_with_shift:
							worder_date_start_with_shift = date_start_with_shift

					if not worder_date_finish_with_shift or worder_date_finish_with_shift < date_finish_with_shift:
							worder_date_finish_with_shift = date_finish_with_shift

			# обновление даты всего наряда с учетом переносов, если требуется
			if worder_date_start_with_shift and worder['date_start_with_shift'] and  worder_date_start_with_shift<worder['date_start_with_shift']:
				worder['date_start_with_shift'] = worder_date_start_with_shift
			if worder_date_finish_with_shift and worder['date_finish_with_shift'] and  worder_date_finish_with_shift>worder['date_finish_with_shift']:
				worder['date_finish_with_shift'] = worder_date_finish_with_shift

		# if dataToSave['fact_materials'] is not None and len(dataToSave['fact_materials'])>0:
		# 	for item in dataToSave['fact_materials']:
		# 		# add new fact if scope>0
		# 		if routine.strToFloat(item['fact_scope'])>0:
		# 			fact_material= {
		# 				'_id': ObjectId(),
		# 				'date_change': datetime.datetime.utcnow(),
		# 				'brigade_id': ObjectId(dataToSave['brigade_id']) if dataToSave['brigade_id'] else None,
		# 				'date':datetime.datetime.strptime(dataToSave['date'], '%d/%m/%Y'),
		# 				'user_email': usr['email'],
		# 				'scope': routine.strToFloat(item['fact_scope'])
		# 			}
		# 			#cond={'_id': ObjectId(dataToSave['plan_norm']['_id']), 'materials._id':ObjectId(item['_id'])}
		# 			cond={'materials._id':ObjectId(item['_id'])}
		# 			data = {"$push": { "materials.$.fact_material": fact_material}}
		# 			planecalculationmodel.update(cond, data, True)

		# сохранение процента участия работников на наряде
		if dataToSave['fact_works'] is not None and len(dataToSave['fact_works'])>0 and dataToSave['workers'] is not None and len(dataToSave['workers'])>0:

			if 'workers_participation' not in worder:
				worder['workers_participation'] = []
			worder['workers_participation'].append({
						'_id': ObjectId(),
						'status': 'active',
						'workers': dataToSave['workers'],
						'date': datetime.datetime.utcnow(),
						'fact_date': datetime.datetime.strptime(dataToSave['date'], '%d/%m/%Y'),
						'history':  [{
							"type" : "add",
							"user" : usr['email'],
							"date" : datetime.datetime.utcnow()
						}]
					})

		#Если все работы наряда завершены, то необходимо зафиксировать это на уровне наряда
		completed_works_count = 0
		last_fact_date = None
		for plan_work in worder['items']:
			if plan_work['status'] != 'completed':
				break
			else:
				completed_works_count+=1
				if not last_fact_date or ('last_fact_date' in plan_work and last_fact_date<plan_work['last_fact_date']):
					last_fact_date=plan_work['last_fact_date']
		if len(worder['items']) == completed_works_count:
			worder['status'] = 'completed'
			worder['status_date'] = last_fact_date

		worder['date_change'] = datetime.datetime.utcnow()
		worder['user_email'] = usr['email']

		# сохранение изменений по наряду
		productionordermodel.update({'work_orders._id':worder['_id']}, {'$set':{'work_orders.$':worder}}, True)

		#--------------------------------------------------------------------------------------------------------------
		# Если все наряды в задании завершены, то необходимо закрыть задание
		# с датой последнего закрытого наряда
		production_order = productionordermodel.get(
			{'_id': production_order['_id']},
			{
				'_id':1,
				'number':1,
				'work_orders':1
			}
		)

		last_finish_date = None
		have_not_finished_workorders = False

		for wo in production_order['work_orders']:
			if wo.get('status',None) != 'completed':
				have_not_finished_workorders = True;
				break;
			if not last_finish_date or wo.get('status_date') >last_finish_date:
				last_finish_date = wo['status_date']

		if not have_not_finished_workorders:
			production_order['status'] = 'completed'
			production_order['status_date'] = last_finish_date

			productionordermodel.update({'_id': production_order['_id']}, {
				'$set':{
					'status' : 'completed',
					'status_date': last_finish_date
				}
			}, True)


		return {'status':'ok'}
	except Exception,exc:
		excType = exc.__class__.__name__
		print_exc()
		return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@put('/handlers/newjoblog/send_notification')
def sendNotification():
	'''
		Отправка почтового сообщения.
	'''
	response.content_type = "application/json; charset=UTF-8"
	userlib.check_handler_access("newjoblog","w")
	try:
		usr = userlib.get_cur_user()
		# get request info
		data = request.json



		# # данные о наряде из БД
		# old_order = workordermodel.get_by({'_id':ObjectId(data['work_order']['_id'])})
		# # данные об участках
		# arrDataSectors = sectormodel.get_all_only_sectors()
		# dataSectors = {}
		# for row in arrDataSectors:
		# 	dataSectors[str(row['code'])] = row;
		# # номер единицы продукции, по которой идет оповещение
		# product_unit_number = ""
		# if 'production_units' in data['work_order']:
		# 	product_unit_number ="*" if len(data['work_order']['production_units'])>1 else data['work_order']['production_units'][0]['unit_number']

		# # получение инфомрации о заказе на производство
		# production_order = productionordermodel.get(
		# 	{'work_orders._id':ObjectId(data['work_order']['_id'])},
		# 	{
		# 		'_id':1,
		# 		'number':1,
		# 		'product':1,
		# 		'work_orders.$':1
		# 	}
		# )
		# if not production_order:
		# 	print('Error! Work order: {0} not fount'.format(str(data['work_order']['number'])))
		# 	return {'status':'error', 'msg':'Наряд не найден.'}
		# # получение инфомрации о текущем наряде
		# worder = (i for i in production_order['work_orders'] if i['number'] == routine.strToInt(data['work_order']['number'])).next()


		# группировка данных
		data_grouped = {'shifts': {}, 'holds': {}, 'pauses': {}}
		for item in data['fact_works']:
			key = item.get('transfer_reason','') + item.get('reason','') + '_' + item.get('note','')
			# переносы
			if 'shift' in item and routine.strToInt(item['shift'])!=0 and item['status']!='on_hold' and item['status']!='on_pause':
				if not key in data_grouped['shifts']:
					data_grouped['shifts'][key] = {'reason': item['transfer_reason'], 'note': item['note'],'reason_nodes': prepare_reason_nodes(item.get('reason_note_obj', None)) , 'items': []}
				data_grouped['shifts'][key]['items'].append(item)
			# простои
			if((item['old_status']!=item['status'] or item['repeat']) and item['status']=='on_hold'):
				if not key in data_grouped['holds']:
					data_grouped['holds'][key] = {'reason': item['reason'], 'note': item['note'],'reason_nodes': prepare_reason_nodes(item.get('reason_note_obj', None)), 'items': []}
				data_grouped['holds'][key]['items'].append(item)
			# приостановки
			if((item['old_status']!=item['status'] or item['repeat']) and item['status']=='on_pause'):
				if not key in data_grouped['pauses']:
					data_grouped['pauses'][key] = {'reason': item['reason'], 'note': item['note'],'reason_nodes': prepare_reason_nodes(item.get('reason_note_obj', None)), 'items': []}
				data_grouped['pauses'][key]['items'].append(item)

		# подготовка письма
		# тема письма
		header= "Заказ на производство № " + str(data['work_order']['production_order_number']) + ' - отклонения'
		# Формирование содержимого письма
		body= usr['fio']+' ('+usr['email']+') сообщает: <br/><br/>' if 'fio' in usr else usr['email'] + "сообщает: <br/><br/>"
		# # направление работ
		# body = body + "Направление работ: " + dataSectors[str(data['work_order']['sector_code'])]['type'] +" <br/>"
		# участок
		body=body+"Участок: "+data['work_order'].get('sector',{}).get('name')+  "<br/>"
		# наряд
		body=body+"Наряд: " + '<a href = "http://int.modul.org/timeline/#search='+str(data['work_order']['number'])+'">'+str(data['work_order']['number'])+'</a>' + '<br/><br/>'

		tmpBody = ''
		# ---------
		# Уведомления о переносе сроков работ
		# ---------
		i=0
		if len(data_grouped['shifts'])>0:
			tmpBody =  tmpBody+"<b>Перенесены плановые даты (перенос по факту).</b><br/>"
			for item_group_key in data_grouped['shifts']:
				item_group = data_grouped['shifts'][item_group_key]
				if i>0:
					tmpBody=tmpBody+"<br/>"
				tmpBody=tmpBody+"Причина: " + item_group['reason']+ '<br/>'

				if item_group['reason_nodes'] and len(item_group['reason_nodes'])>0:
					reason_nodes = ""
					for r_n in item_group['reason_nodes']:
						reason_nodes += '<a href = "http://int.modul.org/timeline/#sort=sort_by_date_finish/completed_filter=work/search={0}">{1}</a>, '.format('/'.join([str(x) for x in r_n]), '/'.join([str(x) for x in r_n]))
					reason_nodes = reason_nodes[:-2]
					if reason_nodes:
						tmpBody=tmpBody+"Уточнение причины: " + reason_nodes + '<br/>'

				tmpBody=tmpBody+"Комментарий: " + item_group['note'] + '<br/><br/>'

				for item in item_group['items']:
					transferType = ''
					if item['type']=='start':
						transferType = 'дата начала работ'
					elif item['type']=='finish':
						transferType = 'дата окончания работ'
					elif item['type']=='both':
						transferType = 'обе даты'

					transfer_date_info = {
						'old_date_start_with_shift': None,
						'old_date_finish_with_shift': None,
						'new_date_start_with_shift': None,
						'new_date_finish_with_shift': None
					}
					# поиск старых дат для работы
					for pl_work_info in data['work_order']['items']:
					 	if str(pl_work_info['_id'])== str(item['id']):
					 		tmp_st_date = datetime.datetime.strptime(pl_work_info['date_start_with_shift'],"%Y-%m-%dT%H:%M:%S")
					 		tmp_fn_date = datetime.datetime.strptime(pl_work_info['date_finish_with_shift'],"%Y-%m-%dT%H:%M:%S")
					 		transfer_date_info['old_date_start_with_shift'] = tmp_st_date
					 		transfer_date_info['old_date_finish_with_shift'] = tmp_fn_date
					 		break
					# поиск новых дат для работы
					for pl_work_info in old_order['items']:
						if str(pl_work_info['_id'])== str(item['id']):
					 		transfer_date_info['new_date_start_with_shift'] = pl_work_info['date_start_with_shift']
					 		transfer_date_info['new_date_finish_with_shift'] = pl_work_info['date_finish_with_shift']
					 		break
					dates_info = u"""; (было: {0}-{1}; стало: {2}-{3})""".format(transfer_date_info['old_date_start_with_shift'].strftime('%d.%m.%Y'), transfer_date_info['old_date_finish_with_shift'].strftime('%d.%m.%Y'), transfer_date_info['new_date_start_with_shift'].strftime('%d.%m.%Y'), transfer_date_info['new_date_finish_with_shift'].strftime('%d.%m.%Y'))

					tmpBody=tmpBody+"Работа: ["+str(item['code']) + "] " + item['name'] + '<br/>'
					tmpBody=tmpBody+"Количество дней: " + str(item['shift']) + dates_info +'<br/>'
					tmpBody=tmpBody+"Тип переноса: " + transferType+ '<br/>'
				i+=1
			tmpBody=tmpBody+'<br/>'

		# ---------
		# Уведомления о простое работ
		# ---------
		i = 0
		if len(data_grouped['holds'])>0:
			tmpBody = tmpBody+"<b>Простой работ.</b><br/>"
			for item_group_key in data_grouped['holds']:
				item_group = data_grouped['holds'][item_group_key]
				if i>0:
					tmpBody=tmpBody+"<br/>"
				tmpBody=tmpBody+"Причина: " + item_group['reason']+ '<br/>'

				if item_group['reason_nodes'] and len(item_group['reason_nodes'])>0:
					reason_nodes = ""
					for r_n in item_group['reason_nodes']:
						reason_nodes += '<a href = "http://int.modul.org/timeline/#sort=sort_by_date_finish/completed_filter=work/search={0}">{1}</a>, '.format('/'.join([str(x) for x in r_n]), '/'.join([str(x) for x in r_n]))
					reason_nodes = reason_nodes[:-2]
					if reason_nodes:
						tmpBody=tmpBody+"Уточнение причины: " + reason_nodes + '<br/>'

				tmpBody=tmpBody+"Комментарий: " + item_group['note'] + '<br/><br/>'
				for item in item_group['items']:
					tmpBody=tmpBody+"Работа: ["+str(item['code']) + "] " + item['name'] + '<br/>'
				i+=1
			tmpBody=tmpBody+'<br/>'

		# ---------
		# Уведомления о приостановке работ
		# ---------
		i=0
		if len(data_grouped['pauses'])>0:
			tmpBody = tmpBody+"<b>Приостановка работ.</b><br/>"
			for item_group_key in data_grouped['pauses']:
				item_group = data_grouped['pauses'][item_group_key]
				if i>0:
					tmpBody=tmpBody+"<br/>"
				tmpBody=tmpBody+"Причина: " + item_group['reason']+ '<br/>'

				if item_group['reason_nodes'] and len(item_group['reason_nodes'])>0:
					reason_nodes = ""
					for r_n in item_group['reason_nodes']:
						reason_nodes += '<a href = "http://int.modul.org/timeline/#sort=sort_by_date_finish/completed_filter=work/search={0}">{1}</a>, '.format('/'.join([str(x) for x in r_n]), '/'.join([str(x) for x in r_n]))
					reason_nodes = reason_nodes[:-2]
					if reason_nodes:
						tmpBody=tmpBody+"Уточнение причины: " + reason_nodes + '<br/>'


				tmpBody=tmpBody+"Комментарий: " + item_group['note'] + '<br/><br/>'
				for item in item_group['items']:
					tmpBody=tmpBody+"Работа: ["+str(item['code']) + "] " + item['name'] + '<br/>'
				i+=1
			#tmpBody=tmpBody+'<br/>'

		if tmpBody != '':
			# получить пользователей, которым будет идти рассылка
			notice_users = usermodel.get_list(
				{'notice.key': noticemodel.notice_keys['workorder_plan_shifts']['key'], 'stat': {'$ne':'disabled' }},
				{'email':1,'fio':1})
			# вызвать функцию отправки сообщения
			print('---------------SEND EMAIL-----------------')
			mailer.send(header,body + tmpBody,notice_users, True,usr.get('email'))

		return routine.JSONEncoder().encode({'status': 'ok'})
	except Exception,exc:
		excType = exc.__class__.__name__
		print_exc()
		return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@get('/handlers/newjoblog/search/')
def search():
	'''
		Получение информации о наряде со всеми его фактами
	'''
	userlib.check_handler_access("newjoblog","r")
	result = {}
	try:
		usr = userlib.get_cur_user()
		# get parameters
		param = request.query.decode()
		if not 'num' in param:
			return {'status':'error', 'msg':'Не задан номер наряда.'}
		workOrderNumber = routine.strToInt(param['num'])

		# получение инфомрации о заказе на производство
		production_order = productionordermodel.get(
			{'work_orders.number':workOrderNumber},
			{
				'_id':1,
				'number':1,
				'product':1,
				'work_orders.$':1
			}
		)
		if not production_order:
			return {'status':'error', 'msg':'Наряд не найден.'}

		# получение инфомрации о текущем наряде
		worder = (i for i in production_order['work_orders'] if i['number'] == workOrderNumber).next()
		worder['production_order_number'] = production_order['number']
		worder['product'] = production_order['product']

		# if not 'contract_id' in worder:
		# 	return {'status':'error', 'msg':'Ошибка структуры данных наряда. Для данного наряда не задан договор.'}
		# if not 'sector_id' in worder:
		# 	return {'status':'error', 'msg':'Ошибка структуры данных наряда. Для данного наряда не задан участок.'}
		if not 'items' in worder:
			return {'status':'error', 'msg':'Ошибка структуры данных наряда. Для данного наряда не заданы работы.'}

		all_sectors_in_order = []
		# # Проверка на наличие в заказе участка с кодом 3 (iss: #165)
		# # Просто сбор всех кодов участков  на всем заказе
		# all_sectors_in_order = []
		# all_worders = workordermodel.get({'contract_number':worder['contract_number'],'production_number':worder['production_number'] }, None)

		# for row in all_worders:
		# 	if not row['sector_code'] in all_sectors_in_order:
		# 		all_sectors_in_order.append(row['sector_code'])

		# # get contract info by id
		# contract = contractmodel.get_by({'_id':worder['contract_id']})
		# if contract is None:
		# 	return {'status':'error', 'msg':'Не найден договор, указанный для данного наряда.'}

		# # get sector info with brigades
		# sector = sectormodel.get(str(worder['sector_id']))
		# if sector is None:
		# 	return {'status':'error', 'msg':'Не найден участок, указанный для данного наряда.'}
		# if not 'works' in sector:
		# 	return {'status':'error', 'msg':'Для участка, задействованного в данном наряде не заданы работы.'}

		# # get list of brigades
		# if 'brigades' in sector:
		# 	brigades = sector['brigades']

		# get brigade list
		brigades = brigademodel.get_all()
		# dataBrigades = {}
		# for row in arrDataBrigades:
		# 	dataBrigades[str(row['_id'])] = row;

		# sectorWorks = {}
		# for work in sector["works"]:
		# 	sectorWorks[str(work['_id'])] = {
		# 			"_id": work["_id"],
		# 			"name": work["name"],
		# 			"code": work["code"],
		# 			"unit": work["unit"]
		# 			}

		# проверка на завершенность наряда
		completedWorksCount = 0
		resultWorks = []
		for planWork in worder["items"]:
			if planWork['status'] == 'completed':
				completedWorksCount = completedWorksCount+1
			factSize = 0.0
			fact_dates = []

			#  получение всех фактических дат для работы
			if 'fact_work' in planWork:
				for factWork in planWork['fact_work']:
					factSize = factSize + factWork['scope']
					try:
						if not factWork['date'].strftime('%d/%m/%Y') in fact_dates:
							fact_dates.append(factWork['date'].strftime('%d/%m/%Y'))
					except:
						pass
			if 'status_log' in planWork:
				planWork['status_log'].sort(key = lambda x: (x['date']))

			resultWork = {
				'id' : planWork['_id'],
				'work_id' : planWork['_id'],
				'code' : planWork['number'],
				'name' : planWork['name'],
				'unit' : planWork['to_develop']['unit'],
				'plan_scope' : planWork['to_develop']['value'],
				'fact_scope' : 0,
				'balance': planWork['to_develop']['value'] - factSize,
				'status':planWork['status'],
				'old_status':planWork['status'],
				'date_start': planWork['date_start'],
				'date_finish': planWork['date_finish'],
				'reason_id' : '',
				'reason':'',
				'note': '',
				'type':'',
				'shift':0,
				'fact_dates' : fact_dates,
				'status_log':planWork['status_log']
			}
			resultWorks.append(resultWork);

		#if completedWorksCount == len(worder["plan_work"]):
		#	return {'status':'error', 'msg':'Наряд закрыт.'}

		resultMaterials = []
		# # Получить все материалы из справчника материалов,
		# # для котороых текущий участок является выпускающим
		# dataMaterials = materialsgroupmodel.get_materials({
		# 	'$or':
		# 	[
		# 		{'manufact_sector_id': sector['_id']},
		# 		{'out_sector_id': sector['_id']},
		# 	]
		# })
		# arrMaterials = {}
		# for material_row in dataMaterials:
		# 	arrMaterials[material_row['_id']] = material_row

		# resultMaterials = []
		# resultPlanNorm = None

		# if len(arrMaterials)>0:
		# 	# Находим отобранные материалы в плановых нормах созданных для текущего заказа и участка
		# 	dataPlanNorms = planecalculationmodel.find_by({
		# 		'contract_id':worder['contract_id'],
		# 		#'sector_id':worder['sector_id'],
		# 		'production_id':worder['production_id'],
		# 	}, None)


		# 	for dataPlanNorm in dataPlanNorms:
		# 		# Находим в плановой норме материалы, выпускаемые заводом
		# 		if dataPlanNorm and 'materials' in dataPlanNorm and dataPlanNorm['materials'] and len(dataPlanNorm['materials']):
		# 			for material_row in dataPlanNorm['materials']:
		# 				if material_row['materials_id'] in arrMaterials and material_row['status']=='1' and routine.strToFloat(material_row['pto_size'])>0:
		# 					factSize = 0.0
		# 					#material_row['name'] = arrMaterials[material_row['materials_id']]['name']

		# 					#  get all fact dates for the work
		# 					if 'fact_material' in material_row:
		# 						for factMaterial in material_row['fact_material']:
		# 							factSize = factSize + factMaterial['scope']

		# 					# список уникальных свойств материала из справочника
		# 					material_unique_props = arrMaterials[material_row['materials_id']].get('unique_props', None)
		# 					cur_unique_prop = material_row.get('unique_props', None)
		# 					material_unique_prop = None
		# 					if cur_unique_prop and material_unique_props:
		# 						for prop in material_unique_props:
		# 							if prop['name']==cur_unique_prop:
		# 								material_unique_prop = prop
		# 								break

		# 					resultMaterial = {
		# 						'_id':material_row['_id'],
		# 						'name':arrMaterials[material_row['materials_id']]['name'],
		# 						'plan_scope':routine.strToFloat(material_row['pto_size']),
		# 						'balance': routine.strToFloat(material_row['pto_size'])- factSize,
		# 						'code':material_row['materials_key'],
		# 						'group_code': arrMaterials[material_row['materials_id']]['group_code'],
		# 						'unit_pto': arrMaterials[material_row['materials_id']]['unit_pto'],
		# 						'unit_purchase':arrMaterials[material_row['materials_id']]['unit_purchase'],
		# 						'fact_scope' : 0,
		# 						'unique_props_key': material_unique_prop['key'] if material_unique_prop else None,
		# 						'unique_props_name': material_unique_prop['name'] if material_unique_prop else None,
		# 					}
		# 					resultMaterials.append(resultMaterial);
		# 	resultMaterials.sort(key = lambda x: (x['name']))

		# сортировка истории трудового участия по фактической дате
		workers_history = worder.get('workers_participation',[])
		workers_history.sort(key = lambda x: (x['fact_date']), reverse=True)

		# prepare data
		result['brigades'] = brigades
		result['all_sectors_in_order'] = all_sectors_in_order
		result['plan_norm'] = None
		result['materials'] = resultMaterials
		result['works'] = resultWorks
		result['workers'] = workers_history[0]['workers'] if workers_history and len(workers_history)>0 else None
		worder['sector']['brigades'] = brigades
		result['sector'] = worder['sector']
		result['weekend'] = routine.isDateWeekEnd(usr['email'],datetime.datetime.utcnow())
		result['workers_history'] = workers_history
		result['workorder'] = worder

	except Exception,exc:
		excType = exc.__class__.__name__
		print_exc()
		raise exc
	return routine.JSONEncoder().encode( {'status': 'ok','msg':'', 'result':result})

@get('/handlers/newjoblog/getplandates/')
def getplandates():
	'''
		Получение всех плановых дат по нярду
	'''
	userlib.check_handler_access("newjoblog","w")
	result = {}
	try:
		resultWorks = {}
		# get parameters
		param = request.query.decode()
		if not 'num' in param:
			return {'status':'error', 'msg':'Не задан номер наряда.'}
		workOrderNumber = param['num'];
		#worder = workordermodel.get_by({'number':routine.strToInt(workOrderNumber)})
		worder = None
		try:
			worder = productionordermodel.get({'work_orders.number':routine.strToInt(workOrderNumber)}, {'work_orders.$':1})['work_orders'][0]
		except:
			pass

		if worder is None:
			return {'status':'error', 'msg':'Наряд не найден.'}
		if not 'items' in worder:
			return {'status':'error', 'msg':'Ошибка структуры данных наряда. Для данного наряда не заданы работы.'}

		for planWork in worder['items']:
			if not planWork['date_start'] is None:
				dateStart = planWork['date_start']
				dateFinish = planWork['date_finish']
				curDateStart = dateStart
				curDateFinish = dateFinish
				if 'plan_shifts' in planWork:
					for planShift in planWork['plan_shifts']:
						if planShift['type']=='start':
							curDateStart = curDateStart + datetime.timedelta(days=planShift['shift']);
						elif planShift['type'] == 'finish':
							curDateFinish = curDateFinish + datetime.timedelta(days=planShift['shift']);
						else:
							curDateStart = curDateStart + datetime.timedelta(days=planShift['shift']);
							curDateFinish = curDateFinish + datetime.timedelta(days=planShift['shift']);

				# проверка по фактам, по условию если факт начался раньше плана, то переноса не фиксируется
				haveFacts = False
				if 'fact_work' in planWork:
					haveFacts = True

				resultWork = {
				 	'work_id': planWork['_id'],
				 	'work_code':planWork['number'],
				 	'date_start': curDateStart,
				 	'date_finish':curDateFinish,
				 	'have_facts': haveFacts
				 	}
				resultWorks[str(planWork['_id'])] = resultWork

		result = resultWorks
	except Exception, e:
		raise e
	return routine.JSONEncoder().encode( {'status':'ok', 'msg':'', 'result':result})

@get('/handlers/newjoblog/getshiftreasonlist/')
def getshiftreasonlist():
	'''
		Получение списка причин переноса плановых дат
	'''
	userlib.check_handler_access("newjoblog","r")
	result = {}
	try:
		result = planshiftreason.get_all_active();
		return routine.JSONEncoder().encode( {'status':'ok', 'msg':'', 'result':result})
	except Exception, e:
		return routine.JSONEncoder().encode( {'status':'error', 'msg':'Ошибка получения списка причин переноса плановых дат. Подробности: ' + str(e), 'result':result})
		raise e

@get('/handlers/newjoblog/get_statistic/')
def api_get_statistic():
	userlib.check_handler_access("newjoblog","r")
	response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=UTF-8'
	response.headers['Content-Type'] = 'application/vnd.ms-excel'
	response.headers['Content-Disposition'] = 'attachment; filename=fact_works_'+ datetime.datetime.utcnow().strftime('%d_%m_%Y_%H_%M_%S')+'.xls'
	try:
		usr = userlib.get_cur_user()
		#data = workordermodel.get_fact_work_stat()
		data = None
		dataResult =  productionordermodel.do_aggregate([
			{"$unwind": "$work_orders"},
			{"$project":
				{
					"production_order_number":"$number",
					"production_order_id":"$_id",
					"product":1,
					"number":"$work_orders.number",
					"sector":"$work_orders.sector",
					"plan_work":"$work_orders.items",
				}
			},
			{"$unwind": "$plan_work"},
			{"$project":
				{
					"production_order_number":1,
					"production_order_id":1,
					"product":1,
					"number":1,
					"sector":1,
					"plan_work_scope":"$plan_work.to_develop.value",
					"plan_work_status":"$plan_work.status",
					"plan_work_code":"$plan_work.number",
					"plan_work_name":"$plan_work.name",
					"plan_work_unit":"$plan_work.to_develop.unit",
					"plan_work_id":"$plan_work._id",
					"plan_work_date_start":"$plan_work.date_start",
					"plan_work_date_finish":"$plan_work.date_finish",
					"fact_work":"$plan_work.fact_work"
				}
			},
			{"$unwind": "$fact_work"},
			{"$project":
				{
					"production_order_number":1,
					"production_order_id":1,
					"product":1,
					"number":1,
					"sector":1,
					"plan_work_scope":1,
					"plan_work_status":1,
					"plan_work_code":1,
					"plan_work_id":1,
					"plan_work_date_start":1,
					"plan_work_date_finish":1,
					"fact_work_scope":"$fact_work.scope",
					"fact_work_brigade_id":"$fact_work.brigade_id",
					"fact_work_date":"$fact_work.date",
					"fact_work_weekend":"$fact_work.weekend",
					"plan_work_name":1,
					"plan_work_unit":1
				}
			}
		])

		# get brigade list
		arrDataBrigades = brigademodel.get_all()
		dataBrigades = {}
		for row in arrDataBrigades:
			dataBrigades[str(row['_id'])] = row
		# collect data
		for cData in dataResult:

			cData['brigade_code'] = ""
			cData['brigade_teamlead'] = ""
			cData['fact_work_year'] = cData['fact_work_date'].year
			cData['fact_work_month'] = cData['fact_work_date'].month
			brigade_id = str(cData.get('fact_work_brigade_id')) if cData.get('fact_work_brigade_id') else ''
			if brigade_id in dataBrigades:
				cData['brigade_teamlead'] = dataBrigades[brigade_id]['teamlead']
				cData['brigade_code'] = dataBrigades[brigade_id]['code']

		return __make_fact_works_statistic(dataResult)

	except Exception, exc:
		excType = exc.__class__.__name__
		print_exc()
		print('Generate fact works statistic error: ' + str(exc))
		return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})


def __make_fact_works_statistic(data):
	'''Генерация XLS файла со статистикой по фактическим работам'''
	import StringIO
	output = StringIO.StringIO()
	wb = Workbook(encoding='utf-8')
	ws = wb.add_sheet('Data')
	#set header------------
	ws.write(0,0, u"Номер наряда".encode("utf-8"))
	#ws.write(0,1, u"Номер продукции".encode("utf-8"))
	#ws.write(0,2, u"Номер единицы продукции".encode("utf-8"))
	ws.write(0,1, u"Номер заказа".encode("utf-8"))
	ws.write(0,2, u"Код работы".encode("utf-8"))
	ws.write(0,3, u"Наименование работы".encode("utf-8"))
	ws.write(0,4, u"Ед. изм.".encode("utf-8"))
	#ws.write(0,7, u"Цена за еденицу".encode("utf-8"))
	ws.write(0,5, u"Вып. Объём".encode("utf-8"))
	#ws.write(0,6, u"Сумма".encode("utf-8"))
	ws.write(0,6, u"Дата".encode("utf-8"))
	ws.write(0,7, u"Год".encode("utf-8"))
	ws.write(0,8, u"Месяц".encode("utf-8"))
	ws.write(0,9, u"Бригадир".encode("utf-8"))
	#ws.write(0,11, u"Код участка".encode("utf-8"))
	ws.write(0,10, u"Участок".encode("utf-8"))
	ws.write(0,11, u"Внерабочее время".encode("utf-8"))

	rowIndex = 1
	if data is not None:
		for row in data:
			ws.write(rowIndex, 0, str(row['number']))
			ws.write(rowIndex, 1, str(row['production_order_number'])+ ' [' +row['product']['number'] +']')
			#ws.write(rowIndex, 3, str(row['contract_number'])+'.'+ str(row['production_number']) + '.' + str(row['production_unit_number']))
			ws.write(rowIndex, 2, str(row['plan_work_code']))
			ws.write(rowIndex, 3, str(row['plan_work_name']))
			ws.write(rowIndex, 4, str(row['plan_work_unit']))
			#ws.write(rowIndex, 7, row['work_price'])
			ws.write(rowIndex, 5, row['fact_work_scope'])
			#ws.write(rowIndex, 6, row['fact_work_scope'] * row['work_price'])
			ws.write(rowIndex, 6, row['fact_work_date'].strftime('%d.%m.%Y'))
			ws.write(rowIndex, 7, row['fact_work_year'])
			ws.write(rowIndex, 8, row['fact_work_month'])
			ws.write(rowIndex, 9, row['brigade_teamlead'])
			#ws.write(rowIndex, 14, row['sector_code'])
			ws.write(rowIndex, 10, row['sector'].get('name','Не задан'))
			ws.write(rowIndex, 11, row['fact_work_weekend'] if 'fact_work_weekend' in row else '')
			rowIndex+=1
	wb.save(output)
	output.seek(0)
	return output.read()

@get('/handlers/newjoblog/get_qstatistic/')
def api_get_statistic():
	'''
		Статистика по выполненной работе
		На вбор предоставляется две статистики.
		1 - статистика с бригадирами
		2 - статистика с трудовым участием
	'''

	def get_fact_work_stat2(sectors, year, months, include_not_completed=False):
		'''
			Сбор статистики по объемам выполненных работ с трудовым участием работников
		'''
		result = {}
		# если в условии заданы месяца, то необходимо определить максимальный и минимальный месяц
		min_month = 1
		max_month = 12
		if len(months)>0:
			min_month = min(months)
			max_month = max(months)
		# определение диапазона дат для поиска
		start_date = datetime.datetime( year, min_month, 1, 0, 0, 0, 0)
		finish_date= datetime.datetime( year, max_month, calendar.monthrange(year, max_month)[1] , 23, 59, 59, 0)
		#смотреть только завершенные наряды
		condition = {}
		if not include_not_completed:
			condition['status'] = 'completed'
			condition['status_date'] = {'$gte': start_date, '$lte': finish_date}
		else:
			condition['plan_work.fact_work.date'] = {'$gte': start_date, '$lte': finish_date}

		# ставим в условии получать только те наряды по которым есть трудовые расчеты
		condition['workers_participation'] = {'$exists': 1}
		# condition['$where'] = "this.workers_participation.length > 0"

		# добавление участков в условие
		if sectors and len(sectors)>0:
			condition['sector_code'] = {'$in':sectors}

		# get data from calculation collection
		# dataResult = db.m_workorder.find(condition,None)
		dataResult =  productionordermodel.do_aggregate([
			{"$unwind": "$work_orders"},
			{"$project":
				{
					"production_order_number":"$number",
					"production_order_id":"$_id",
					"product":1,
					"status":"$work_orders.status",
					"status_date":"$work_orders.status_date",
					"number":"$work_orders.number",
					"sector":"$work_orders.sector",
					"plan_work":"$work_orders.items",
					"workers_participation": "$work_orders.workers_participation",
				}
			},
			{"$match": condition}
		])

		print(routine.JSONEncoder().encode(condition) )

		# get brigade list
		arrDataBrigades = brigademodel.get_all()
		dataBrigades = {}
		for row in arrDataBrigades:
			dataBrigades[str(row['_id'])] = row;

		arrDataWorkers = usermodel.get_list({'roles.role': str(usermodel.SYSTEM_ROLES['SYS_WORKER'])},None)
		dataWorkers = {}
		for row in arrDataWorkers:
			dataWorkers[str(row['_id'])] = row;

		if dataResult:
			tmpResult1 = []
			tmpWorkOrdersArr = {}
			for row in dataResult:
				tmpResult1.append(row)
				tmpWorkOrdersArr[row['number']] = row


			# # разбивка по единицам продукции
			# tmpResult1 = []
			# for row in tmpResult:
			# 	if len(row['production_units'])>0:
			# 		sector_id = str(row['sector_id'])
			# 		for row_production_units in row['production_units']:
			# 			tmp_object = {
			# 				"contract_id": row["contract_id"],
			# 				"contract_number":row["contract_number"],
			# 				"sector_id":row["sector_id"],
			# 				"status":row.get("status",''),
			# 				"sector_code":row["sector_code"],
			# 				"sector_name": dataSectors[str(row["sector_code"])]['name'] if str(row["sector_code"]) in dataSectors else None,
			# 				"sector_type": dataSectors[str(row["sector_code"])]['type'] if str(row["sector_code"]) in dataSectors else None,
			# 				"number":row["number"],
			# 				"production_id":row["production_id"],
			# 				"production_name":row["production_name"],
			# 				"production_number":row["production_number"],
			# 				"production_unit_id": row_production_units["unit_id"],
			# 				"production_unit_number": row_production_units["unit_number"],
			# 				"plan_work":row["plan_work"],
			# 				'all_works_count': len(row.get('plan_work',[])),
			# 				"workers": row["workers_participation"]
			# 			}
			# 			tmpResult1.append(tmp_object)
			# разбивка по плановым работам
			tmpResult = []
			for row in tmpResult1:
				if len(row['plan_work'])>0:
					for row_plan_work in row['plan_work']:
						tmp_object = {
							#"contract_id": row["contract_id"],
							#"contract_number":row["contract_number"],
							"production_order_number": row["production_order_number"],
							"number":row["number"],
							"status":row["status"],
							#"sector_id":row["sector_id"],
							"sector_code":'',
							"sector_name": row['sector'].get('name', 'Не задан'),
							"sector_type": '',
							#"production_id":row["production_id"],
							"production_name":row["product"]['name'],
							"production_number":row["product"]['number'],
							#"production_unit_id": row["production_unit_id"],
							#"production_unit_number": row["production_unit_number"],
							"workers": row["workers_participation"],
							"plan_work_scope":row_plan_work["count"]['value'],
							"plan_work_status":row_plan_work["status"],
							"plan_work_code":row_plan_work["number"],
							"plan_work_id":row_plan_work["_id"],
							"plan_work_date_start":row_plan_work["date_start"],
							"plan_work_date_finish":row_plan_work["date_finish"],
							"fact_work":row_plan_work.get('fact_work',[]),
							'all_works_count': len(row.get('plan_work',[])),
							'work_name':row_plan_work['name'],
							'work_code':row_plan_work['number'],
							'work_unit' :row_plan_work['count']['unit'],
							'work_price' : 0

						}
						tmpResult.append(tmp_object)

			# подсчет фактически выполненного объема работ
			for row in tmpResult:
				if len(row['fact_work'])>0:
					row['full_fact_scope'] = 0
					for row_fact_work in row['fact_work']:
						row['full_fact_scope']+=row_fact_work['scope']

			# разбивка по фактическим работам
			tmpResult1 = []
			for row in tmpResult:
				if len(row['fact_work'])>0:

					for row_fact_work in row['fact_work']:
						brigade_id = str(row_fact_work['brigade_id']) if row_fact_work.get('brigade_id') else ''
						tmp_object = {
							#"contract_id": row["contract_id"],
							#"contract_number":row["contract_number"],
							"production_order_number": row["production_order_number"],
							"number":row["number"],
							"status":row["status"],
							#"sector_id":row["sector_id"],
							"sector_code":row["sector_code"],
							"sector_name": row['sector_name'],
							"sector_type": row['sector_type'],
							#"production_id":row["production_id"],
							"production_name":row["production_name"],
							"production_number":row["production_number"],
							#"production_unit_id": row["production_unit_id"],
							#"production_unit_number": row["production_unit_number"],
							"plan_work_scope":row["plan_work_scope"],
							"plan_work_status":row["plan_work_status"],
							"plan_work_code":row["plan_work_code"],
							"plan_work_id":row["plan_work_id"],
							"plan_work_date_start":row["plan_work_date_start"],
							"plan_work_date_finish":row["plan_work_date_finish"],
							'full_fact_scope': row['full_fact_scope'],
							'all_works_count':row['all_works_count'],
							"workers": row["workers"],
							"fact_work_scope":row_fact_work["scope"],
							"fact_work_brigade_id":str(row_fact_work["brigade_id"]) if row_fact_work["brigade_id"] else '',
							"fact_work_date":row_fact_work["date"],
							"fact_work_weekend":row_fact_work["weekend"],
							"fact_work_year" : row_fact_work["date"].year,
							"fact_work_month" : row_fact_work["date"].month,
							"brigade_teamlead": dataBrigades[brigade_id]['teamlead'] if brigade_id in dataBrigades else None,
							"brigade_code": dataBrigades[brigade_id]['code'] if brigade_id in dataBrigades else None,
							"work_name": row.get('work_name', None),
							"work_code": row.get('work_code', None),
							"work_unit": row.get('work_unit', None),
							"work_price": row.get('work_price', None)

						}
						tmpResult1.append(tmp_object)

			# разбивка по трудовым расчетам работников
			tmpResult = []
			for row in tmpResult1:
				if len(row['workers'])>0:
					for row_worker in row['workers']:
						if row_worker['fact_date'] == row["fact_work_date"]:
							for row_worker_item in row_worker['workers']:
								tmp_object = {
									#"contract_id": row["contract_id"],
									#"contract_number":row["contract_number"],
									"production_order_number": row["production_order_number"],
									"number":row["number"],
									"status":row["status"],
									#"sector_id":row["sector_id"],
									"sector_code":row["sector_code"],
									"sector_name": row['sector_name'],
									"sector_type": row['sector_type'],
									#"production_id":row["production_id"],
									"production_name":row["production_name"],
									"production_number":row["production_number"],
									#"production_unit_id": row["production_unit_id"],
									#"production_unit_number": row["production_unit_number"],
									"plan_work_scope":row["plan_work_scope"],
									"plan_work_status":row["plan_work_status"],
									"plan_work_code":row["plan_work_code"],
									"plan_work_id":row["plan_work_id"],
									"plan_work_date_start":row["plan_work_date_start"],
									"plan_work_date_finish":row["plan_work_date_finish"],
									'full_fact_scope': row['full_fact_scope'],
									'all_works_count':row['all_works_count'],
									"fact_work_scope":row["fact_work_scope"],
									"fact_work_brigade_id":row.get("fact_work_brigade_id",''),
									"fact_work_date":row["fact_work_date"],
									"fact_work_weekend":row["fact_work_weekend"],
									"fact_work_year" : row["fact_work_year"],
									"fact_work_month" : row["fact_work_month"],
									"brigade_teamlead": row["brigade_teamlead"],
									"brigade_code": row["brigade_code"],
									"work_name": row["work_name"],
									"work_code": row["work_code"],
									"work_unit": row["work_unit"],
									"work_price": row["work_price"],
									"worker_fio": row_worker_item["user_fio"],
									"worker_email": row_worker_item["user_email"],
									"worker_proportion": row_worker_item["proportion"],
									"worker_code": dataWorkers.get(str(row_worker_item["user_id"]),{}).get('table',''),
									"worker_id": str(row_worker_item["user_id"])
								}
								tmpResult.append(tmp_object)
			tmpResult.sort(key = lambda x: (x['worker_fio'], x['production_order_number'],x['production_number'], x['number']))

			for row in tmpResult:
				if not row['worker_email'] in result:
					result[row['worker_email']] = {
						'data': {},
						'worker': {
							'fio': row['worker_fio'],
							'email': row['worker_email'],
							'code': row['worker_code'],
						}
					}

				if not row['number'] in result[row['worker_email']]['data']:
					result[row['worker_email']]['data'][row['number']] = {
						'items': {},
						'full_proportion': 0, # суммарная пропорция по всем работам наряда, в которых участвовал
					}

				if not str(row['plan_work_id']) in result[row['worker_email']]['data'][row['number']]:
					result[row['worker_email']]['data'][row['number']]['items'][str(row['plan_work_id'])] = {
						'items': [row],
						'info': row,
						'worker_full_fact_scope': row['fact_work_scope'],
						'full_proportion':  row['worker_proportion']
					}
				else:
					result[row['worker_email']]['data'][row['number']]['items'][str(row['plan_work_id'])]['items'].append(row)
					result[row['worker_email']]['data'][row['number']]['items'][str(row['plan_work_id'])]['worker_full_fact_scope']+=row['fact_work_scope']
					result[row['worker_email']]['data'][row['number']]['items'][str(row['plan_work_id'])]['full_proportion']+=row['worker_proportion']

			# подсчет данных
			for item in result:
				for workorder_number in result[item]['data']:
					full_proportion = 0
					for plan_work_code in result[item]['data'][workorder_number]['items']:
						row = result[item]['data'][workorder_number]['items'][plan_work_code]
						worker_proportion = float(row['full_proportion'])/len(row['items'])
						full_proportion=full_proportion+worker_proportion
					result[item]['data'][workorder_number]['full_proportion'] = full_proportion

		return result



	userlib.check_handler_access("newjoblog","r")
	response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=UTF-8'
	response.headers['Content-Type'] = 'application/vnd.ms-excel'
	response.headers['Content-Disposition'] = 'attachment; filename=fact_works_'+ datetime.datetime.utcnow().strftime('%d_%m_%Y_%H_%M_%S')+'.xls'
	try:
		param = request.query.decode()
		years = [routine.strToInt(value) for value in param['years'].split(',')] if param['years']!="" else []
		months = [routine.strToInt(value) for value in param['months'].split(',')] if param['months']!="" else []
		sectors = [routine.strToInt(value) for value in param['sectors'].split(',')] if param['sectors']!="" else []
		teams = [value for value in param['teams'].split(',')] if param['teams']!="" else []
		is_symple_view = True if param.get('symple_view','')=='true' else False
		include_not_completed = True if param.get('include_not_completed','')=='true' else False

		# if is_symple_view:
		# статистика по объемам работ с использованием трудового участия работников

		data = get_fact_work_stat2(sectors, years[0], months, include_not_completed)
		return __make_fact_works_statistic2(data, years[0], months[0], is_symple_view)

		# else:
		# 	# статистика по объемам работ с использованием бригадиров
		# 	data = productionordermodel.get_fact_work_stat1(sectors, years[0], months, teams)
		# 	return __make_fact_works_statistic1(data, years[0], months[0], is_symple_view)

	except Exception, exc:
		excType = exc.__class__.__name__
		print_exc()
		print('Generate fact works query statistic error: ' + str(exc))
		return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

# def __make_fact_works_statistic1(data_info, year, month, is_symple_view ):
# 	'''
# 		Генерация XLS файла со статистикой по фактическим работам
# 		по заданным параметрам. Реализация для бригад.
# 		Task: #136
# 	'''
# 	import StringIO
# 	monthNames = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
# 	output = StringIO.StringIO()
# 	wb = Workbook(encoding='utf-8')
# 	wb.active_sheet = 0

# 	# styles
# 	al1 = Alignment()
# 	al1.horz = Alignment.HORZ_LEFT
# 	al1.vert = Alignment.VERT_TOP
# 	al1.wrap = Alignment.WRAP_AT_RIGHT
# 	font = Font()
# 	font.bold = True

# 	font1 = Font()
# 	font1.bold = True
# 	font1.height = 220

# 	style1 = XFStyle()
# 	style1.alignment = al1

# 	style_itogo = XFStyle()
# 	#style_itogo.alignment = al1
# 	style_itogo.font = font

# 	style_itogo1 = XFStyle()
# 	#style_itogo.alignment = al1
# 	style_itogo1.font = font1

# 	style_header = XFStyle()
# 	style_header.alignment = al1
# 	style_header.font = font

# 	style_header1 = XFStyle()
# 	style_header1.alignment = al1
# 	style_header1.font = font1

# 	style_big_text = XFStyle()
# 	style_big_text.alignment = al1

# 	it = 0
# 	for item in data_info:
# 		#if len(data_info[item]['data'])>0:
# 		#sector_info = data_info[item]['sector']
# 		team_info = data_info[item]['team']
# 		data = data_info[item]['data']

# 		it+=1
# 		ws=None
# 		ws = wb.add_sheet(str(team_info['code']) + '__' + str(team_info['teamlead']) )

# 		# columns width
# 		ws.col(0).width = 256 * 10 # номер наряда
# 		ws.col(1).width = 256 * 10 # Номер заказа
# 		ws.col(2).width = 256 * 10 # Код работы
# 		ws.col(3).width = 256 * 65 # Наименование работы
# 		ws.col(4).width = 256 * 10 # Ед. изм
# 		ws.col(5).width = 256 * 10 # Цена за ед.
# 		ws.col(6).width = 256 * 20 # Вып. объем
# 		ws.col(7).width = 256 * 20 # Сумма

# 		# Информация о выбранных фильтрах
# 		ws.write(0,0, u"Год:".encode("utf-8"), style_header1)
# 		ws.write(0,1, str(year), style_header1)
# 		ws.write(1,0, u"Месяц:".encode("utf-8"), style_header1)
# 		ws.write(1,1, monthNames[routine.strToInt(month) - 1], style_header1)
# 		ws.write(2,0, u"Бригада:".encode("utf-8"), style_header1)
# 		ws.write(2,1, '['+str(team_info['code'])+']' + ' ' + team_info['teamlead'], style_header1)
# 		ws.merge(0, 0, 1, 7)
# 		ws.merge(1, 1, 1, 7)
# 		ws.merge(2, 2, 1, 7)

# 		#set header------------
# 		ws.write(4,0, u"Номер наряда".encode("utf-8"), style_header)
# 		#ws.write(0,1, u"Номер продукции".encode("utf-8"), style_header)
# 		#ws.write(0,2, u"Номер единицы продукции".encode("utf-8"), style_header)
# 		ws.write(4,1, u"Номер заказа".encode("utf-8"), style_header)
# 		ws.write(4,2, u"Код работы".encode("utf-8"), style_header)
# 		ws.write(4,3, u"Наименование работы".encode("utf-8"), style_header)
# 		ws.write(4,4, u"Ед. изм.".encode("utf-8"), style_header)
# 		ws.write(4,5, u"Цена за еденицу".encode("utf-8"), style_header)
# 		ws.write(4,6, u"Вып. Объём".encode("utf-8"), style_header)
# 		ws.write(4,7, u"Сумма".encode("utf-8"), style_header)
# 		#ws.write(0,10, u"Дата".encode("utf-8"), style_header)
# 		#ws.write(0,11, u"Год".encode("utf-8"), style_header)
# 		#ws.write(0,12, u"Месяц".encode("utf-8"), style_header)
# 		#ws.write(0,13, u"Бригадир".encode("utf-8"), style_header)
# 		#ws.write(0,14, u"Код участка".encode("utf-8"), style_header)
# 		#ws.write(0,15, u"Участок".encode("utf-8"), style_header)
# 		#ws.write(0,16, u"Внерабочее время".encode("utf-8"), style_header)

# 		rowIndex = 6
# 		cur_work_order = None
# 		is_first_row = True
# 		summ = {
# 			'full_work_scope': 0,
# 			'full_work_price':0,
# 			'order_work_scope': 0,
# 			'order_work_price':0
# 		}

# 		for row in data:
# 			if cur_work_order != row['number']:
# 				cur_work_order = row['number']
# 				if not is_first_row and not is_symple_view:
# 					# итого
# 					ws.write(rowIndex, 6, summ['order_work_scope'], style_itogo)
# 					ws.write(rowIndex, 7, summ['order_work_price'], style_itogo)
# 					summ['order_work_scope'] = 0
# 					summ['order_work_price'] = 0
# 					rowIndex+=2

# 			is_first_row = False
# 			row_work_price = row['fact_work_scope'] * row['work_price']
# 			ws.write(rowIndex, 0, str(row['number']))
# 			#ws.write(rowIndex, 1, str(row['production_number']))
# 			#ws.write(rowIndex, 2, str(row['production_unit_number']))
# 			ws.write(rowIndex, 1, str(row['contract_number'])+'.'+ str(row['production_number']) + '.' + str(row['production_unit_number']))
# 			ws.write(rowIndex, 2, str(row['plan_work_code']))
# 			ws.write(rowIndex, 3, str(row['work_name']), style_big_text)
# 			ws.write(rowIndex, 4, str(row['work_unit']))
# 			ws.write(rowIndex, 5, row['work_price'])
# 			ws.write(rowIndex, 6, row['fact_work_scope'])
# 			ws.write(rowIndex, 7, row_work_price)
# 			#ws.write(rowIndex, 10, row['fact_work_date'].strftime('%d.%m.%Y'))
# 			#ws.write(rowIndex, 11, row['fact_work_year'])
# 			#ws.write(rowIndex, 12, row['fact_work_month'])
# 			#ws.write(rowIndex, 13, row['brigade_teamlead'])
# 			#ws.write(rowIndex, 14, row['sector_code'])
# 			#ws.write(rowIndex, 15, row['sector_name'])
# 			#ws.write(rowIndex, 16, u"Да".encode("utf-8") if 'fact_work_weekend' in row and row['fact_work_weekend']  else '')

# 			summ['order_work_price'] += row_work_price
# 			summ['order_work_scope'] += row['fact_work_scope']
# 			summ['full_work_price'] += row_work_price
# 			summ['full_work_scope'] += row['fact_work_scope']

# 			rowIndex+=1

# 		if not is_symple_view:
# 			if summ['order_work_price']>0 or summ['order_work_scope']>0:
# 				ws.write(rowIndex, 6, summ['order_work_scope'], style_itogo)
# 				ws.write(rowIndex, 7, summ['order_work_price'], style_itogo)
# 				rowIndex+=2

# 			if summ['full_work_price']>0 or summ['full_work_scope']>0:
# 				ws.write(rowIndex, 6, summ['full_work_scope'],style_itogo1)
# 				ws.write(rowIndex, 7, summ['full_work_price'],style_itogo1)

# 	#---------
# 	#заполенние общего листа данных
# 	#---------
# 	it = 0
# 	ws=None
# 	ws = wb.add_sheet('data')
# 	# columns width
# 	ws.col(0).width = 256 * 10 # код бригадира
# 	ws.col(1).width = 256 * 30 # Фио бригадира
# 	ws.col(2).width = 256 * 20 # номер заказа
# 	ws.col(3).width = 256 * 10 # номер наряда
# 	ws.col(4).width = 256 * 10 # Код работы
# 	#set header------------
# 	ws.write(0,0, u"Код бригадира".encode("utf-8"), style_header)
# 	ws.write(0,1, u"ФИО".encode("utf-8"), style_header)
# 	ws.write(0,2, u"Номер заказа".encode("utf-8"), style_header)
# 	ws.write(0,3, u"Номер наряда".encode("utf-8"), style_header)
# 	ws.write(0,4, u"Код работы".encode("utf-8"), style_header)

# 	rowIndex = 1
# 	for item in data_info:
# 		team_info = data_info[item]['team']
# 		data = data_info[item]['data']
# 		for row in data:
# 			#ws = wb.add_sheet(str(team_info['code']) + '__' + str(team_info['teamlead']) )
# 			ws.write(rowIndex, 0, str(team_info['code']))
# 			ws.write(rowIndex, 1, str(team_info['teamlead']))
# 			ws.write(rowIndex, 2, str(row['contract_number'])+'.'+ str(row['production_number']) + '.' + str(row['production_unit_number']))
# 			ws.write(rowIndex, 3, row['number'])
# 			ws.write(rowIndex, 4, row['plan_work_code'])
# 			rowIndex+=1
# 	wb.save(output)
# 	output.seek(0)
# 	return output.read()

def __make_fact_works_statistic2(data_info, year, month, is_symple_view ):
	'''
		Генерация XLS файла со статистикой по фактическим работам
		по заданным параметрам. Реализация для работников с учетом трудовых расчетов
	'''
	import StringIO
	monthNames = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
	output = StringIO.StringIO()
	wb = Workbook(encoding='utf-8')
	wb.active_sheet = 0

	# styles
	al1 = Alignment()
	al1.horz = Alignment.HORZ_LEFT
	al1.vert = Alignment.VERT_TOP
	al1.wrap = Alignment.WRAP_AT_RIGHT
	font = Font()
	font.bold = True

	font1 = Font()
	font1.bold = True
	font1.height = 220

	style1 = XFStyle()
	style1.alignment = al1

	style_itogo = XFStyle()
	#style_itogo.alignment = al1
	style_itogo.font = font

	style_itogo1 = XFStyle()
	#style_itogo.alignment = al1
	style_itogo1.font = font1

	style_header = XFStyle()
	style_header.alignment = al1
	style_header.font = font

	style_header1 = XFStyle()
	style_header1.alignment = al1
	style_header1.font = font1

	style_big_text = XFStyle()
	style_big_text.alignment = al1


	#---------
	#заполенние общего листа данных
	#---------
	it = 0
	ws=None
	ws = wb.add_sheet('Data')
	# columns width
	ws.col(0).width = 256 * 10 # месяц
	ws.col(1).width = 256 * 10 # код работника
	ws.col(2).width = 256 * 30 # Фио бригадира
	ws.col(3).width = 256 * 20 # номер заказа
	ws.col(4).width = 256 * 10 # номер наряда
	ws.col(5).width = 256 * 10 # код участка
	ws.col(6).width = 256 * 20 # участок
	ws.col(7).width = 256 * 20 # направление
	ws.col(8).width = 256 * 10 # Код работы
	ws.col(9).width = 256 * 65 # Наименование работы
	ws.col(10).width = 256 * 10 # Ед. изм
	ws.col(11).width = 256 * 10 # Цена за ед.
	ws.col(12).width = 256 * 20 # Весь. объем
	ws.col(13).width = 256 * 20 # % участия
	ws.col(14).width = 256 * 20 # % участия в работе
	ws.col(15).width = 256 * 20 # Вып. объем
	ws.col(16).width = 256 * 20 # Сумма
	ws.col(17).width = 256 * 20 # Сумма
	#set header------------
	ws.write(0,0, u"Месяц".encode("utf-8"), style_header)
	ws.write(0,1, u"Код работника".encode("utf-8"), style_header)
	ws.write(0,2, u"ФИО".encode("utf-8"), style_header)
	ws.write(0,3, u"Номер заказа".encode("utf-8"), style_header)
	ws.write(0,4, u"Номер наряда".encode("utf-8"), style_header)
	ws.write(0,5, u"Код участка".encode("utf-8"), style_header)
	ws.write(0,6, u"Участок".encode("utf-8"), style_header)
	ws.write(0,7, u"Направление".encode("utf-8"), style_header)
	ws.write(0,8, u"Код работы".encode("utf-8"), style_header)
	ws.write(0,9, u"Наименование работы".encode("utf-8"), style_header)
	ws.write(0,10, u"Ед. изм.".encode("utf-8"), style_header)
	ws.write(0,11, u"Цена за еденицу".encode("utf-8"), style_header)
	ws.write(0,12, u"Весь Объём".encode("utf-8"), style_header)
	ws.write(0,13, u"% участия в работе".encode("utf-8"), style_header)
	ws.write(0,14, u"% участия в наряде".encode("utf-8"), style_header)
	ws.write(0,15, u"Вып. Объём".encode("utf-8"), style_header)
	ws.write(0,16, u"Сумма".encode("utf-8"), style_header)
	ws.write(0,17, u"Статус наряда".encode("utf-8"), style_header)

	rowIndex = 1
	for item in data_info:
		team_info = data_info[item]['worker']
		for workorder_number  in data_info[item]['data']:
			for plan_work_code in data_info[item]['data'][workorder_number]['items']:
				row = data_info[item]['data'][workorder_number]['items'][plan_work_code]
				ws.write(rowIndex, 0, monthNames[routine.strToInt(month) - 1])
				ws.write(rowIndex, 1, str(team_info['code']))
				ws.write(rowIndex, 2, str(team_info['fio']))
				ws.write(rowIndex, 3, str(row['info']['production_order_number'])+'.'+ str(row['info']['production_number']))
				ws.write(rowIndex, 4, row['info']['number'])
				ws.write(rowIndex, 5, row['info']['sector_code'])
				ws.write(rowIndex, 6, row['info']['sector_name'])
				ws.write(rowIndex, 7, row['info']['sector_type'])
				ws.write(rowIndex, 8, row['info']['plan_work_code'])
				ws.write(rowIndex, 9, str(row['info']['work_name']), style_big_text)
				ws.write(rowIndex, 10, str(row['info']['work_unit']))
				# пересчет параметров с учетом процентов участия
				worker_proportion = float(row['full_proportion'])/len(row['items'])
				fact_work_scope = (row['info']['full_fact_scope'] * float(worker_proportion))/100
				row_work_price = float(fact_work_scope) * row['info']['work_price']
				every_work_proportion = float(data_info[item]['data'][workorder_number]['full_proportion'])/row['info']['all_works_count']
				ws.write(rowIndex, 11, row['info']['work_price'])			# цена за единицу
				ws.write(rowIndex, 12, row['info']['full_fact_scope'])				# весь объем
				ws.write(rowIndex, 13, worker_proportion)				# % участия в работе
				ws.write(rowIndex, 14, every_work_proportion)			# % участия в наряде
				ws.write(rowIndex, 15, fact_work_scope)				# выполненный объем
				ws.write(rowIndex, 16, row_work_price)				# сумма
				ws.write(rowIndex, 17, 'Закрыт' if row['info']['status'] =='completed' else 'Не закрыт' )	# статус наряда

				rowIndex+=1
	wb.save(output)
	output.seek(0)
	return output.read()

@get('/handlers/newjoblog/search_workorder_numbers/')
def get_workorder_numbers():
	'''
		Поиск наряда по маске номера
	'''
	userlib.check_handler_access("newjoblog","r")
	q = request.query['q']
	ls = productionordermodel.do_aggregate([
		{"$unwind": "$work_orders"},
		{"$project":{"number":"$work_orders.number"}}
	])
	res = []
	for cl in ls:
		if q in str(cl['number']):
			res.append({'id':cl['_id'],'name':str(cl['number'])})
			if len(res)>7:
				break
	return routine.JSONEncoder().encode(res)

@get('/handlers/newjoblog/get_workers/<number>')
def get_workers(number):
	'''
		Получение списка работников на наряде
	'''
	userlib.check_handler_access("newjoblog","r")
	if not number:
		return {'status':'error', 'msg':'Не задан номер наряда. '}
	data = None
	try:
		data = productionordermodel.get({'work_orders.number':routine.strToInt(number)}, {'work_orders.$':1})['work_orders'][0]
	except:
		pass
	if not data:
		return {'status':'error', 'msg':'Наряд не найден. Повторите попытку.'}
	workers_history = data.get('workers_participation',[])
	workers_history.sort(key = lambda x: (x['fact_date']))
	workers = workers_history[len(workers_history)-1]['workers'] if len(workers_history)>0 else None
	return routine.JSONEncoder().encode({'status':'ok', 'data': workers})

@put('/handlers/newjoblog/save_workers')
def api_save_workers():
	'''
	Функция сохранения данных по трудовому участию рабочих в наряде
	'''
	response.content_type = "application/json; charset=UTF-8"
	userlib.check_handler_access("newjoblog","w")
	try:
		usr = userlib.get_cur_user()
		dataToSave = request.json;
		if dataToSave['workers'] is not None and len(dataToSave['workers'])>0:
			try:
				worder = productionordermodel.get({'work_orders._id':row['info']['_id']}, {'work_orders.$':1})['work_orders'][0]
			except:
				return routine.JSONEncoder().encode({'status': 'error','msg':'Наряд не найден. '})
			if not 'workers_participation' in worder:
				worder['workers_participation'] = []
			worder['workers_participation'].append({
				'_id': ObjectId(),
				'status': 'active',
				'workers': dataToSave['workers'],
				'date': datetime.datetime.utcnow(),
				'fact_date': datetime.datetime.utcnow(),
				'history':  [{
					"type" : "add",
					"user" : usr['email'],
					"date" : datetime.datetime.utcnow()
				}]
			})
			productionordermodel.update({'work_orders._id':worder['_id']}, {'$set':{'work_orders.$':worder}}, True)
			return {'status':'ok'}
		else:
			return routine.JSONEncoder().encode({'status': 'error','msg':'Не задано трудовое участие. '})
	except Exception,exc:
		excType = exc.__class__.__name__
		print_exc()
		return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@put('/handlers/newjoblog/update_workers_history')
def update_workers_history():
	'''
	Функция обновления данных в истории трудового участия работников
	'''
	response.content_type = "application/json; charset=UTF-8"
	userlib.check_handler_access("newjoblog","w")
	try:
		usr = userlib.get_cur_user()
		# get request info
		dataToSave = request.json
		if dataToSave['workers'] is not None and len(dataToSave['workers'])>0:

			try:
				worder = productionordermodel.get({'work_orders.workers_participation._id':ObjectId(dataToSave['_id'])}, {'work_orders.$':1})['work_orders'][0]
			except:
				return routine.JSONEncoder().encode({'status': 'error','msg':'Наряд не найден. '})

			try:
				participation = (i for i in worder['workers_participation'] if str(i['_id']) == str(dataToSave['_id']) ).next()
			except:
				return routine.JSONEncoder().encode({'status': 'error','msg':'Трудовое участие не найдено. '})

			participation['workers'] = dataToSave['workers']
			if not 'history' in participation:
				participation['history'] = []
			participation['history'].append({
				"type" : "edit",
				"user" : usr['email'],
				"date" : datetime.datetime.utcnow()
			})
			productionordermodel.update({'work_orders._id':worder['_id']}, {'$set':{'work_orders.$':worder}}, True)
			return {'status':'ok'}
		else:
			return routine.JSONEncoder().encode({'status': 'error','msg':'Не задано трудовое участие. '})

	except Exception,exc:
		excType = exc.__class__.__name__
		print_exc()
		return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@put('/handlers/newjoblog/remove_workers_history_item')
def update_workers_history_status():
	'''
	Функция удаления элемента из истории трудового участия
	По факту проставляется статус = removed
	'''
	response.content_type = "application/json; charset=UTF-8"
	userlib.check_handler_access("newjoblog","w")
	try:
		usr = userlib.get_cur_user()
		dataToSave = request.json;

		try:
			worder = productionordermodel.get({'work_orders.workers_participation._id':ObjectId(dataToSave['_id'])}, {'work_orders.$':1})['work_orders'][0]
		except:
			return routine.JSONEncoder().encode({'status': 'error','msg':'Наряд не найден. '})

		try:
			participation = (i for i in worder['workers_participation'] if str(i['_id']) == str(dataToSave['_id']) ).next()
		except:
			return routine.JSONEncoder().encode({'status': 'error','msg':'Трудовое участие не найдено. '})

		participation['status'] = 'removed'
		if not 'history' in participation:
			participation['history'] = []
		participation['history'].append({
			"type" : "edit",
			"user" : usr['email'],
			"date" : datetime.datetime.utcnow()
		})
		productionordermodel.update({'work_orders._id':worder['_id']}, {'$set':{'work_orders.$':worder}}, True)
		return {'status':'ok'}
	except Exception,exc:
		excType = exc.__class__.__name__
		print_exc()
		return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})
