#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route, get, post, put, request, error, abort, response, debug, BaseRequest
BaseRequest.MEMFILE_MAX = 1024 * 1024 *100
import datetime
import pprint
import uuid
import bson
from bson.objectid import ObjectId
from models import  planshiftreason, noticemodel, usermodel, productionordermodel
from helpers import mailer
from bson.objectid import ObjectId
from libraries import excellib, userlib
from models import countersmodel
import routine
import config
from traceback import print_exc
from copy import deepcopy,copy
from libraries import excellib
from xlrd import open_workbook
from xlutils.copy import copy as wbcopy
from xlwt import Workbook, XFStyle, Alignment, Font

@get('/handlers/newworkorder/')
def get_order():
	userlib.check_handler_access("newworkorder","r")
	try:
		param = request.query.decode()
		number = routine.strToInt(param['number'])
		if number==0:
			return routine.JSONEncoder().encode({'status': 'error','msg': 'Заданы неверные параметры для получения данных.', 'res': None})
		res = productionordermodel.get({'number':number},{'number':1, 'work_orders':1, 'product':1})
		if not res:
			return routine.JSONEncoder().encode({'status': 'error','msg': 'Задание не найдено.', 'result': None})
		return routine.JSONEncoder().encode({'status': 'ok', 'result':res})
	except Exception, exc:
		excType = exc.__class__.__name__
		print_exc()
		return {'result':None, 'status':'error', 'msg': str(exc)}


@get('/handlers/newworkorder_excel/<number>')
def get_order(number):
	userlib.check_handler_access("newworkorder","r")
	try:
		param = request.query.decode()
		number = routine.strToInt(number)
		if number==0:
			return routine.JSONEncoder().encode({'status': 'error','msg': 'Заданы неверные параметры для получения данных.', 'res': None})
		res = productionordermodel.get({'number':number},{'number':1, 'work_orders':1, 'product':1})
		if not res:
			return routine.JSONEncoder().encode({'status': 'error','msg': 'Задание не найдено.', 'result': None})

		response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=UTF-8'
		response.headers['Content-Type'] = 'application/vnd.ms-excel'
		response.headers['Content-Disposition'] = 'attachment; filename=newworkorder_'+str(number)+'.xls'


		import StringIO
		output = StringIO.StringIO()
		wb = Workbook(encoding='utf-8')
		ws = wb.add_sheet('Data')

		date_format = XFStyle()
		date_format.num_format_str = 'dd/mm/yyyy'


		font1 = Font()
		font1.name = 'Times New Roman'
		font1.bold = True
		al1 = Alignment()
		al1.horz = Alignment.HORZ_LEFT
		al1.vert = Alignment.VERT_CENTER
		al1.wrap = Alignment.WRAP_AT_RIGHT
		style1 = XFStyle()
		style1.alignment = al1
		style1.font = font1

		style2 = XFStyle()
		style2.alignment = al1


		#set header------------
		ws.col(0).width = 256 * 10 # Номер задания
		ws.col(1).width = 256 * 40 # [Артикул] Название изделия (конечного)
		ws.col(2).width = 256 * 15 # Номер наряда
		ws.col(3).width = 256 * 50 # Название участка
		ws.col(4).width = 256 * 50 #  [Артикул] Название изделия (ДСЕ)
		ws.col(5).width = 256 * 10 #  Кол-во
		ws.col(6).width = 256 * 20 # Дата начала
		ws.col(7).width = 256 * 10 # Дней
		ws.col(8).width = 256 * 20 # Дата начала

		ws.write(0,0, u"Номер задания".encode("utf-8"),style1)
		ws.write(0,1, u"Название изделия".encode("utf-8"),style1)
		ws.write(0,2, u"Номер наряда".encode("utf-8"),style1)
		ws.write(0,3, u"Название участка".encode("utf-8"),style1)
		ws.write(0,4, u"Название изделия (ДСЕ)".encode("utf-8"),style1)
		ws.write(0,5, u"Кол-во".encode("utf-8"),style1)
		ws.write(0,6, u"Дата начала".encode("utf-8"),style1)
		ws.write(0,7, u"Дней".encode("utf-8"),style1)
		ws.write(0,8, u"Дата окончания".encode("utf-8"),style1)


		index = 1
		for wo in res.get('work_orders',[]):
			for it in wo.get('items',[]):
				ws.write(index,0, str(res.get('number')),style2)
				ws.write(index,1, '['+res.get('product').get('number')+'] '+res.get('product').get('name'),style2)
				ws.write(index,2, wo.get('number'),style2)
				ws.write(index,3, wo.get('sector').get('name'),style2)
				ws.write(index,4,'['+it.get('number')+'] '+it.get('name') ,style2)
				ws.write(index,5, str(it.get('count').get('value'))+' '+it.get('count').get('unit'),style2)
				if it.get('date_start_with_shift'):
					ws.write(index,6, it.get('date_start_with_shift'),date_format)
				else:
					ws.write(index,6, '',style1)
				if it.get('date_finish_with_shift'):
					ws.write(index,8, it.get('date_finish_with_shift'),date_format)
				else:
					ws.write(index,8, '',style1)
				dnum = None
				if it.get('date_finish_with_shift') and it.get('date_start_with_shift'):
					dnum = (it.get('date_finish_with_shift')-it.get('date_start_with_shift')).days+1
				elif it.get('days_count'):
					dnum = it.get('days_count')
				ws.write(index,7, dnum if dnum else '',style2)
				index = index+1


		wb.save(output)
		output.seek(0)
		return output.read()

	except Exception, exc:
		excType = exc.__class__.__name__
		print_exc()
		return {'result':None, 'status':'error', 'msg': str(exc)}

@put('/handlers/newworkorder/')
def save_order():
	'''
		Сохранение измененных плановых дат наряда.
		Сохранение переносов сроков, если такие имеются
	'''
	try:
		userlib.check_handler_access("newworkorder","w")
		usr = userlib.get_cur_user()
		param = request.json
		# структура сбора данных о переносах сроков
		transfer_info = None
		transfer_date_info = {
			'old_date_start_with_shift': None,
			'old_date_finish_with_shift': None,
			'new_date_start_with_shift': None,
			'new_date_finish_with_shift': None,
		}
		transfer_data = []
		# ключ для группового переноса сроков
		group_key = str(uuid.uuid1())
		# если данных на сохранение нет, то ошибка
		if param is not None:
			# номер текущего заказа на производство
			production_order_number = routine.strToInt(param['number'])

			# получение информации о задании на производство
			production_order = productionordermodel.get({'number':production_order_number},{'number':1, 'work_orders':1, 'product':1})
			if not production_order:
				return routine.JSONEncoder().encode({'status': 'error','msg': 'Ошибка сохранения данных. Не найдено задание на производство.', 'result': None})
			# список нарядов на сохранение
			reg = param['work_orders']

			# ----------------------------------------------------------------------------------------------------------------------------------------------------------------------
			# Подготовка данных о нарядах на сохранение--------------------------------------------------------------------------------------------
			# ----------------------------------------------------------------------------------------------------------------------------------------------------------------------
			work_orders_to_save = []
			transfer_orders = []
			for ordr in reg:
				# получение обрабатываемого наряда из данных полученных из БД
				workordr =  (i for i in production_order['work_orders'] if str(i['_id']) == ordr['_id']).next()
				work_order_key = str(workordr['number'])
				if userlib.has_access("newworkorder","o"):
					workordr['locked'] = ordr.get('locked', False)
				db_works = workordr['items']

				# ищем в работах наименьшую и наибольшую дату и ставим их в workorder
				min_date = None
				max_date = None
				min_date_with_shift = None
				max_date_with_shift = None
				transfer_plans = []
				for plan in ordr['items']:
					st_date = None
					fn_date = None
					st_date_with_shift = None
					fn_date_with_shift = None

					if plan['date_start'] is not None:
						st_date = datetime.datetime.strptime(plan['date_start']+' 00:00:00','%d.%m.%Y %H:%M:%S')
						if not min_date or min_date > st_date:
							min_date = st_date

					if plan['date_finish'] is not None:
						fn_date = datetime.datetime.strptime(plan['date_finish']+' 00:00:00','%d.%m.%Y %H:%M:%S')
						if not max_date or max_date < fn_date:
							max_date = fn_date

					# поиск требуемой плановой работы из данных БД
					find_work = (i for i in db_works if str(i['_id']) == str(plan['_id'])).next()


					# сохранение количетсва дней, если указано было
					#if routine.strToInt(plan.get('days_count',0))>0:
					find_work['days_count'] = routine.strToInt(plan.get('days_count',0))

					# запись в истории о первом назначении плановой даты на работу
					# если пдановые даты еще не назначались, и заданы плановые даты пользователем
					# то вносим в историю факт назначения плановых дат
					if (not find_work.get('date_start') or not find_work.get('date_finish')) and (st_date or fn_date):
						if 'history' in find_work and find_work['history'] and len(find_work['history'])>0:
							find_work['history'].append({
								'date': datetime.datetime.utcnow(),
								'user': usr['email'],
								'type': 'set_plan_dates'
							})
						else:
							find_work['history'] = [{
								'date': datetime.datetime.utcnow(),
								'user': usr['email'],
								'type': 'set_plan_dates'
							}]

					find_work['date_start'] = st_date
					find_work['date_finish'] = fn_date

					if userlib.has_access("newworkorder","o"):
						find_work['locked'] = plan.get('locked', False)

					if 'date_start_with_shift' not in find_work or find_work['date_start_with_shift'] is None:
						find_work['date_start_with_shift'] = find_work['date_start']
					if 'date_finish_with_shift' not in find_work or find_work['date_finish_with_shift'] is None:
						find_work['date_finish_with_shift'] = find_work['date_finish']

					# сбор информации для фиксации переносов
					try:
						plan_shifts_arr = plan['plan_shifts']
						include_work_to_transfer = False
						for plan_shifts in plan_shifts_arr:
							if plan_shifts['date_change'] == 'new':
								include_work_to_transfer = True
								# фиксация старых дат по группе переноса
								if transfer_date_info['old_date_start_with_shift'] is None or ( find_work['date_start_with_shift'] and find_work['date_start_with_shift']< transfer_date_info['old_date_start_with_shift']):
									transfer_date_info['old_date_start_with_shift'] = copy(find_work['date_start_with_shift'])
								if transfer_date_info['old_date_finish_with_shift'] is None or (find_work['date_finish_with_shift'] and find_work['date_finish_with_shift']> transfer_date_info['old_date_finish_with_shift']):
									transfer_date_info['old_date_finish_with_shift'] = copy(find_work['date_finish_with_shift'])

								plan_shifts['date_change'] = datetime.datetime.utcnow()
								plan_shifts['reason_id'] =  bson.objectid.ObjectId(plan_shifts['reason_id'])
								plan_shifts['shift'] =  int(plan_shifts['shift'])
								plan_shifts['user_email'] = usr['email']
								plan_shifts['group_key'] = group_key
								plan_shifts['source'] = 'plan'
								plan_shifts['_id'] = bson.objectid.ObjectId()
								if 'plan_shifts' in find_work:
									find_work['plan_shifts'].append(plan_shifts)
								else:
									find_work['plan_shifts'] = [plan_shifts]

								if not transfer_info:
									transfer_info = plan_shifts

								# update date_start_with_shift and date_finish_with_shift using cur shift value
								if plan_shifts['type']=='start':
									tmp_date_start_with_shift =  find_work['date_start_with_shift'] + datetime.timedelta(days= routine.strToInt(plan_shifts['shift']))

									# iss_421-------------------
									# если новая плановая дата начала превышает дату простоя,
									# то необходимо скинуть простой добавлением нового статуса
									status_log  = find_work.get('status_log',[])
									if len(status_log)>0:
										status_log.sort(key = lambda x: (x['date']))
										last_status = status_log[-1]
										if (last_status.get('status') == 'on_hold'  or last_status.get('status') == 'on_pause' ) and status['date']<tmp_date_start_with_shift:
											status_log_item = {
												'_id': ObjectId(),
												'date_change': datetime.datetime.utcnow(),
												'brigade_id': None,
												#'date':tmp_date_start_with_shift,
												'date':datetime.datetime.utcnow(),
												'user_email': usr['email'],
												'reason_id': '',
												'reason': '',
												'reason_nodes': None,
												'note': 'Автоматическая смена статуса.',
												'status': 'on_work',
												'source': 'plan'
											}
											find_work['status_log'].append(status_log_item)
											find_work['status'] = 'on_work'

									find_work['date_start_with_shift'] =  tmp_date_start_with_shift
								elif plan_shifts['type'] == 'finish':
									find_work['date_finish_with_shift'] =  find_work['date_finish_with_shift'] + datetime.timedelta(days= routine.strToInt(plan_shifts['shift']))
								else:
									tmp_date_start_with_shift =  find_work['date_start_with_shift'] + datetime.timedelta(days= routine.strToInt(plan_shifts['shift']))

									# iss_421-------------------
									# если новая плановая дата начала превышает дату простоя,
									# то необходимо скинуть простой добавлением нового статуса
									status_log  = find_work.get('status_log',[])
									if len(status_log)>0:
										status_log.sort(key = lambda x: (x['date']))
										last_status = status_log[-1]
										if (last_status.get('status') == 'on_hold'  or last_status.get('status') == 'on_pause' ) and last_status['date']<tmp_date_start_with_shift:
											status_log_item = {
												'_id': ObjectId(),
												'date_change': datetime.datetime.utcnow(),
												'brigade_id': None,
												#'date':tmp_date_start_with_shift,
												'date':datetime.datetime.utcnow(),
												'user_email': usr['email'],
												'reason_id': '',
												'reason': '',
												'reason_nodes': None,
												'note': 'Автоматическая смена статуса.',
												'status': 'on_work',
												'source': 'plan'
											}
											find_work['status_log'].append(status_log_item)
											find_work['status'] = 'on_work'
									#-------------------------------

									find_work['date_start_with_shift'] =   find_work['date_start_with_shift'] + datetime.timedelta(days= routine.strToInt(plan_shifts['shift']))
									find_work['date_finish_with_shift'] =  find_work['date_finish_with_shift'] + datetime.timedelta(days= routine.strToInt(plan_shifts['shift']))

								if transfer_date_info['new_date_start_with_shift'] is None or  find_work['date_start_with_shift']< transfer_date_info['new_date_start_with_shift']:
									transfer_date_info['new_date_start_with_shift'] = copy(find_work['date_start_with_shift'])
								if transfer_date_info['new_date_finish_with_shift'] is None or find_work['date_finish_with_shift']> transfer_date_info['new_date_finish_with_shift']:
									transfer_date_info['new_date_finish_with_shift'] = copy(find_work['date_finish_with_shift'])

						# если работа попадает в перенос
						if include_work_to_transfer:
							transfer_plans.append(u'Работа: [{0}]{1}'.format(plan['number'],plan['name']))
					except Exception, e:
						pass

					# calculate dates with shift for all workorder
					if find_work['date_start_with_shift'] is not None:
						st_date_with_shift = find_work['date_start_with_shift']
						if not min_date_with_shift or min_date_with_shift > st_date_with_shift:
							min_date_with_shift = st_date_with_shift
					if find_work['date_finish_with_shift'] is not None:
						fn_date_with_shift = find_work['date_finish_with_shift']
						if not max_date_with_shift or max_date_with_shift < fn_date_with_shift:
							max_date_with_shift = fn_date_with_shift

				linkNumber= '<a href = "http://int.modul.org/timeline/#sort=sort_by_date_finish/completed_filter=work/search='+str(ordr['number'])+'">'+str(ordr['number'])+'</a>'

				if 'shifted' in workordr and workordr['shifted'] == 'shifted':
					transfer_orders.append(u"""<br/>Участок {0}:<br/>""".format((ordr.get('sector',{}) or {}).get('name','Не задан')  ))
					transfer_orders.append(u'{0}: Весь наряд.'.format(linkNumber))
				elif len(transfer_plans)>0:
					transfer_orders.append(u"""<br/>Участок {0}:<br/>""".format((ordr.get('sector',{}) or {}).get('name','Не задан')  ))
					transfer_orders.append(u"""Наряд: {0}<br/>{1}""".format(linkNumber, '<br/>'.join([str(x) for x in transfer_plans])))

				workordr['date_start'] = min_date
				workordr['date_finish'] = max_date
				workordr['date_start_with_shift'] = min_date_with_shift
				workordr['date_finish_with_shift'] = max_date_with_shift

				work_orders_to_save.append(workordr)

			if len(transfer_orders)>0:
				transfer_data.append('<br/>'.join([str(x) for x in transfer_orders]))

			# ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------
			# Сохранение изменений по данным нарядов
			# ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------
			# for workordr in work_orders_to_save:
			# 	ord_id = workordr['_id']
			# 	del workordr['_id']
			# 	workordermodel.update_all(ord_id, workordr)
			productionordermodel.update_by_id(str(production_order['_id']), {'work_orders':work_orders_to_save})


			# ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------
			# Рассылка почтовых уведомлений
			# ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------
			if transfer_info and len(transfer_info)>0:
				dates_info = u"""(было: {0}-{1}; стало: {2}-{3})""".format(transfer_date_info['old_date_start_with_shift'].strftime('%d.%m.%Y'), transfer_date_info['old_date_finish_with_shift'].strftime('%d.%m.%Y'), transfer_date_info['new_date_start_with_shift'].strftime('%d.%m.%Y'), transfer_date_info['new_date_finish_with_shift'].strftime('%d.%m.%Y'))
				t_type={'start':u'Изменение длительности','finish':u'Изменение длительности', 'both':u'Перенос без изменения длительности'}
				#transfer_type = u'Перенесены плановые даты.'
				transfer_type = t_type[transfer_info['type']]
				if transfer_info['type'] != 'both':
					old_duration = transfer_date_info['old_date_finish_with_shift'] - transfer_date_info['old_date_start_with_shift']
					new_duration = transfer_date_info['new_date_finish_with_shift'] - transfer_date_info['new_date_start_with_shift']
					if old_duration.days>new_duration.days:
						transfer_type = u'Сокращена длительность работ.'
					else:
						transfer_type = u'Увеличена длительность работ.'

				mail_body = usr['fio']+' ('+usr['email']+') сообщает: <br/>' if 'fio' in usr else usr['email'] + "сообщает: <br/>"
				# если есть уточнение к причине переноса
				if transfer_info['reason_nodes'] and len(transfer_info['reason_nodes'])>0:
					reason_nodes = ""
					for r_n in transfer_info['reason_nodes']:
						reason_nodes += '<a href = "http://int.modul.org/timeline/#sort=sort_by_date_finish/completed_filter=work/search={0}">{1}</a>, '.format('/'.join([str(x) for x in r_n]), '/'.join([str(x) for x in r_n]))
					reason_nodes = reason_nodes[:-2]
					mail_body = mail_body+ transfer_type + u"""<br/>Количество дней: {0}; {4}<br/>Тип корректировки: {1}<br/>Причина переноса: {2}<br/>Уточнение причины: {3}<br/>Комментарий: {4}""".format(transfer_info['shift'], t_type[transfer_info['type']], transfer_info['reason'], reason_nodes, transfer_info['note'], dates_info)
				else:
					mail_body = mail_body+ transfer_type + u"""<br/>Количество дней: {0}; {4}<br/>Тип корректировки: {1}<br/>Причина переноса: {2}<br/>Комментарий: {3}""".format(transfer_info['shift'], t_type[transfer_info['type']], transfer_info['reason'],transfer_info['note'], dates_info)

				mail_body = mail_body+'<br/>'+'<br/>'.join([str(x) for x in transfer_data])
				mail_header = str(production_order_number)+ ' - ' + transfer_type
				notice_users = usermodel.get_list({'notice.key': noticemodel.notice_keys['workorder_plan_shifts']['key'], 'stat': {'$ne':'disabled' } },{'email':1,'fio':1})

				# добавление в письмо кнопки для отмены корректировки
				cancel_button = "<br/><br/><a href = '{0}/handlers/newworkorder/cancel_shift/{1}/{2}'><b>Отменить корректировку</b></a>".format(config.site_url, group_key, mail_header)

				global_dates_msg = ''
				mailer.send(mail_header, mail_body + global_dates_msg+cancel_button, notice_users, True,usr['email'])

			#res = get_ordr(contract, product, unit)
			production_order = productionordermodel.get({'number':production_order_number},{'number':1, 'work_orders':1, 'product':1})
			return routine.JSONEncoder().encode({'status': 'ok', 'result':production_order, 'msg':'Данные успешно сохранены.'})

		return routine.JSONEncoder().encode({'status': 'error','msg': 'Нет данных на сохранение.', 'result': None})
	except Exception, exc:
		excType = exc.__class__.__name__
		print_exc()
		return {'result':None, 'status':'error', 'msg': str(exc)}


@post('/handlers/newworkorder/check_reason_note_format')
def check_reason_note_format():
	'''
		Функция проверки корректности формата данных комментария к причине переноса сроков
	'''
	userlib.check_handler_access('newworkorder','w')
	cur_date = datetime.datetime.today().replace(hour=0, minute=0, second=0, microsecond = 0)

	data = request.json['data'];
	reason = request.json['reason']
	if not data or len(data)==0:
		return routine.JSONEncoder().encode({'status': 'error','msg':'Не задано уточнение к причине переноса.'})

	# группировка всех уточнений по нарядам и работам
	groupped_data = {}
	for row in data:
		if row['workorder_number'] not in groupped_data:
			groupped_data[row['workorder_number']] = []
		if row['work_code'] and row['work_code'] not in groupped_data[row['workorder_number']]:
			groupped_data[row['workorder_number']].append(row['work_code'])

	# получение из бд информации о работах и нарядах
	conds = []
	for item_number in groupped_data:
		tmp_cond = {'number': item_number}
		if len(groupped_data[item_number])>0:
			tmp_cond['plan_work_code'] = {'$in': groupped_data[item_number]}
		conds.append(tmp_cond)

	cond =[
		{"$project":
			{
				"work_orders":1,
			}
		},
		{"$match": {'work_orders.number': {"$in":groupped_data.keys() }}},
		{"$unwind": "$work_orders"},
		{"$project":
			{
				"number":"$work_orders.number",
				"date_start_with_shift": "$work_orders.date_start_with_shift",
				"date_finish_with_shift": "$work_orders.date_finish_with_shift",
				"items":"$work_orders.items"

			}
		},
		{"$match": {'number': {"$in":groupped_data.keys()}}},
		{"$unwind": "$items"},
		{"$project":
			{
				"number":"$number",
				"date_start_with_shift": "$date_start_with_shift",
				"date_finish_with_shift": "$date_finish_with_shift",
				"plan_work_date_start_with_shift":"$items.date_start_with_shift",
				"plan_work_date_finish_with_shift":"$items.date_finish_with_shift",
				"plan_work_code": "$items.number",
			}
		},
		{"$match": {'$or':conds}}
	]
	db_res =  productionordermodel.do_aggregate(cond)
	for row in data:
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
			return routine.JSONEncoder().encode({'status':'error', 'data': row, 'msg': 'Ошибка проверки формата уточнения к причине переноса. Убедитесь что все указанные наряды и работы корректны.'})
		try:
			# проверка работ на принадлежность к указанной причине
			if reason == planshiftreason.SYSTEM_OBJECTS['NOT_PLAN_WORK']:
				if date_start<=cur_date and date_finish>=cur_date:
				 	return routine.JSONEncoder().encode({'status': 'error','msg':'Среди работ, указанных в уточнении, есть работы, запланированные на указанную дату. Проверьте данные или выберите другую причину переноса плановых дат.'})
			elif reason == planshiftreason.SYSTEM_OBJECTS['PLAN_WORK']:
				if not(date_start<=cur_date and date_finish>=cur_date):
				 	return routine.JSONEncoder().encode({'status': 'error','msg':'Среди работ, указанных в уточнении, есть работы, не запланированные на указанную дату. Проверьте данные или выберите другую причину переноса плановых дат.'})
		except:
			pass
	return routine.JSONEncoder().encode({'status':'ok'})



@get('/handlers/newworkorder/cancel_shift/<shift_key>/<mail_header>')
def cancel_shift(shift_key, mail_header):
	'''
	Функция отмены переноса сроков по работам наряда.
	shift_key - уникальный ключ переноса
	'''
	userlib.check_handler_access("newworkorder","w")
	usr = userlib.get_cur_user()
	if not shift_key:
		return routine.JSONEncoder().encode({'status': 'error','msg':u'Не задан ключ переноса.'})
	try:
		# получение по ключу нарядов и работ, отклонения по которым необходимо отменить
		# cond = [
		# 	{"$project":
		# 		{
		# 			"_id":1,
		# 			"contract_id":1,
		# 			"contract_number":1,
		# 			"number":1,
		# 			'production_id':1,
		# 			'production_name':1,
		# 			'production_number':1,
		# 			'date_start_with_shift': 1,
		# 			'date_finish_with_shift': 1,
		# 			"plan_work":1,
		# 		}
		# 	},
		# 	{"$unwind": "$plan_work"},
		# 	{"$project":
		# 		{
		# 			"_id":1,
		# 			"contract_id":1,
		# 			"contract_number":1,
		# 			"number":1,
		# 			'production_id':1,
		# 			'production_name':1,
		# 			'production_number':1,
		# 			'date_start_with_shift': 1,
		# 			'date_finish_with_shift': 1,
		# 			"plan_work_id":"$plan_work._id",
		# 			"plan_work_code":"$plan_work.code",
		# 			"plan_shifts":"$plan_work.plan_shifts",
		# 			"plan_work_date_start_with_shift":"$plan_work.date_start_with_shift",
		# 			"plan_work_date_finish_with_shift":"$plan_work.date_finish_with_shift",
		# 		}
		# 	},
		# 	{"$unwind": "$plan_shifts"},
		# 	{"$project":
		# 		{
		# 			"_id":1,
		# 			"contract_id":1,
		# 			"contract_number":1,
		# 			"number":1,
		# 			'production_id':1,
		# 			'production_name':1,
		# 			'production_number':1,
		# 			'date_start_with_shift': 1,
		# 			'date_finish_with_shift': 1,
		# 			"plan_work_id":1,
		# 			"plan_work_code":1,
		# 			'plan_work_date_start_with_shift':1,
		# 			'plan_work_date_finish_with_shift':1,
		# 			"plan_shifts":1,
		# 			"plan_shifts_group_key":"$plan_shifts.group_key",
		# 		}
		# 	},
		# 	{"$match": {'plan_shifts_group_key':shift_key}}
		# ]
		# transfers_res =  workordermodel.do_aggregate(cond)

		cond =[
			{"$project":
				{
					"work_orders":1,
				}
			},
			{"$unwind": "$work_orders"},
			{"$project":
				{
					"_id":"$work_orders._id",
					"number":"$work_orders.number",
					"date_start_with_shift": "$work_orders.date_start_with_shift",
					"date_finish_with_shift": "$work_orders.date_finish_with_shift",
					"items":"$work_orders.items"

				}
			},
			{"$unwind": "$items"},
			{"$project":
				{
					"_id":1,
					"number":1,
					"date_start_with_shift": 1,
					"date_finish_with_shift": 1,
					"plan_work_date_start_with_shift":"$items.date_start_with_shift",
					"plan_work_date_finish_with_shift":"$items.date_finish_with_shift",
					"plan_work_code": "$items.number",
					"plan_work_id": "$items._id",
					"plan_shifts":"$items.plan_shifts",
				}
			},
			{"$unwind": "$plan_shifts"},
			{"$project":
				{
					"_id":1,
					"number":1,
					"date_start_with_shift": 1,
					"date_finish_with_shift": 1,
					"plan_work_date_start_with_shift":1,
					"plan_work_date_finish_with_shift":1,
					"plan_work_code": 1,
					"plan_work_id":1,
					"plan_shifts":1,
					"plan_shifts_group_key":"$plan_shifts.group_key",
				}
			},
			{"$match": {'plan_shifts_group_key':shift_key}}
		]
		transfers_res =  productionordermodel.do_aggregate(cond)

		if not transfers_res or len(transfers_res)==0:
			# отправка уведомления на почту, что нет объектов по данному ключу переносов
			return routine.JSONEncoder().encode({'status': 'ok', 'msg': 'По данному ключу переносы не найдены. Возможно переносы сроков были отменены ранее.'})

		# отмена переносов в БД и пересчет плановых дат работы и наряда в целом
		# группировка данных по нарядам
		grouped_data = {}
		for row in transfers_res:
			if(row['number'] not in grouped_data):
				grouped_data[row['number']] ={
					'info': {
						'_id': row['_id'],
						'number': row['number'],
						'date_start_with_shift': row['date_start_with_shift'],
						'date_finish_with_shift': row['date_finish_with_shift'],
						'new_date_start_with_shift': None,
						'new_date_finish_with_shift': None,
					},
					'data':[]
				}
			grouped_data[row['number']]['data'].append(row)

			# выполнение отмены переносов
			planShift = row['plan_shifts']
			curDateStart = row['plan_work_date_start_with_shift']
			curDateFinish = row['plan_work_date_finish_with_shift']
			if planShift['type']=='start':
				curDateStart = curDateStart - datetime.timedelta(days=planShift['shift'])
			elif planShift['type'] == 'finish':
				curDateFinish = curDateFinish - datetime.timedelta(days=planShift['shift'])
			else:
				curDateStart = curDateStart - datetime.timedelta(days=planShift['shift'])
				curDateFinish = curDateFinish - datetime.timedelta(days=planShift['shift'])
			row['plan_work_new_date_start_with_shift'] = curDateStart
			row['plan_work_new_date_finish_with_shift'] = curDateFinish

			if not  grouped_data[row['number']]['info']['new_date_start_with_shift'] or curDateStart < grouped_data[row['number']]['info']['new_date_start_with_shift']:
				grouped_data[row['number']]['info']['new_date_start_with_shift'] = curDateStart
			if not grouped_data[row['number']]['info']['new_date_finish_with_shift'] or curDateFinish > grouped_data[row['number']]['info']['new_date_finish_with_shift'] :
				grouped_data[row['number']]['info']['new_date_finish_with_shift'] = curDateFinish

		# обновление данных в БД по каждому наряду
		for row_key in grouped_data:
			row = grouped_data[row_key]
			worder = productionordermodel.get({'work_orders._id':row['info']['_id']}, {'work_orders.$':1})['work_orders'][0]
			worder['date_start_with_shift'] = row['info']['new_date_start_with_shift']
			worder['date_finish_with_shift'] = row['info']['new_date_finish_with_shift']
			for plan_work_row in row['data']:
				planShift = plan_work_row['plan_shifts']
				plan_work = None
				try:
					plan_work =  (i for i in worder['items'] if str(i['_id']) == str(plan_work_row['plan_work_id'])).next()
					plan_work['date_start_with_shift'] = plan_work_row['plan_work_new_date_start_with_shift']
					plan_work['date_finish_with_shift'] = plan_work_row['plan_work_new_date_finish_with_shift']
					if not 'history' in plan_work or not plan_work['history']:
						plan_work['history'] = []
					plan_work['history'].append({
						'date': datetime.datetime.utcnow(),
						'user': usr['email'],
						'type': 'cancel_shift',
						'data': planShift
					})

					new_plan_shifts = []
					for ps_row in plan_work.get('plan_shifts',[]):
						if ps_row['_id'] !=planShift['_id']:
							new_plan_shifts.append(ps_row)
					plan_work['plan_shifts'] = new_plan_shifts
				except:
					pass
			productionordermodel.update({'work_orders._id':row['info']['_id']}, {'$set':{'work_orders.$':worder}}, True)

		# отправка уведомления на почту об отмене переносов
		if mail_header:
			notice_users = usermodel.get_list({'notice.key': noticemodel.notice_keys['workorder_plan_shifts']['key'], 'stat': {'$ne':'disabled' }},{'email':1,'fio':1})
			mail_body = usr['fio']+' ('+usr['email']+') отменил корректировку.' if 'fio' in usr else usr['email'] + "отменил корректировку."
			mailer.send(mail_header, mail_body, notice_users, True,usr['email'])

		return routine.JSONEncoder().encode({'status': 'ok'})
	except Exception, exc:
		excType = exc.__class__.__name__
		print_exc()
		return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})


