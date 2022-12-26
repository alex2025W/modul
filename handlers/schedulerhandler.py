#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route, get, post, put, request, error, abort, response, debug, BaseRequest
import datetime
import time
import  config
from bson.objectid import ObjectId
from traceback import print_exc
import StringIO
from models import schedulerlogmodel

#-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
# Циклические задачи------------------------------------------------------------------------------------------------------------------------------------
#-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
@get('/handlers/scheduler/send_queue_emails') #(second=30)
def send_queue_emails():
	'''
		Проверка на наличие неотправленных писем, и отправка их
	'''
	try:
		from helpers import mailer
		print('----start send mail----')
		mailer.do_send_all()
		print('----finish send mail----')
	except Exception, exc:
		print('send_queue_emails error. Exception: ' + str(exc))
		print_exc()

#-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
# Одноразовые задачи-----------------------------------------------------------------------------------------------------------------------------------
#-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
@get('/handlers/scheduler/configuration_rebuild_cache') #(hour=21, minute=00)
def configuration_rebuild_cache():
	'''
		Постройка КЭШей конфигураций, у которых еще нет КЭШей
	'''
	try:
		log_id = schedulerlogmodel.add_log('configuration_rebuild_cache')
		from apis.esud import esudspecificationapi
		config.qu_low.enqueue_call(func=esudspecificationapi.rebuild_all_configs_cache, args=None, timeout=20000)
		schedulerlogmodel.finish_schedule(log_id)
		#esudspecificationapi.rebuild_all_configs_cache()
	except Exception, exc:
		print('configuration_rebuild_cache error. Exception: ' + str(exc))
		print_exc()

@get('/handlers/scheduler/specification_rebuild_cache') #(hour=22, minute=30)
def specification_rebuild_cache():
	'''
		Постройка КЭШей спецификаций, у которых еще нет КЭШей
	'''
	from apis.esud import esudspecificationapi
	try:
		print('start build specification_rebuild_cache' )
		log_id = schedulerlogmodel.add_log('specification_rebuild_cache')
		config.qu_low.enqueue_call(func=esudspecificationapi.rebuild_specifications_cache, args=None, timeout=20000)
		schedulerlogmodel.finish_schedule(log_id)
		print('finish specification_rebuild_cache')
	except Exception, exc:
		print('specification_rebuild_cache error. Exception: ' + str(exc))
		print_exc()

@get('/handlers/scheduler/work_order_start_plan_dates_notification') #(hour=22, minute=50)
def work_order_start_plan_dates_notification():
	'''
		Напоминание о наступлении планов по нарядам.
		Напоминание происходит за 7-3-1 рабочие дня
	'''
	try:
		from apis.workorder import workorderapi
		log_id = schedulerlogmodel.add_log('work_order_start_plan_dates_notification')
		print('start work_order_start_plan_dates_notification')
		workorderapi.make_work_order_plan_dates_notification()
		print('finish work_order_start_plan_dates_notification')
		schedulerlogmodel.finish_schedule(log_id)
	except Exception, exc:
		print('work_order_start_plan_dates_notification. Exception: ' + str(exc))
		print_exc()

@get('/handlers/scheduler/calendar_weekends_job') #(hour=23, minute=00)
def calendar_weekends_job():
	'''
		Заполнение праздничных дней в БД, по календарю GOOGLE
	'''
	from controllers import weekendscontroller
	print('start calendar_weekends_job')
	log_id = schedulerlogmodel.add_log('calendar_weekends_job')
	try:
		weekendscontroller.do_sync()
		print('finish calendar_weekends_job')
		schedulerlogmodel.finish_schedule(log_id)
	except Exception, exc:
		excType = exc.__class__.__name__
		print('calendar_weekends error. Exception: ' + str(exc))
		print_exc()

@get('/handlers/scheduler/clearmessages_job') #(hour=23, minute=10)
def clearmessages_job():
	'''
		Очистка сообщений для менеджеров
	'''
	from apis.crm import orderapi
	from models import msgmodel, ordermodel
	print('start clearmessages_job')
	log_id = schedulerlogmodel.add_log('clearmessages_job')
	try:
		# get data
		msgData = msgmodel.get_by({'enabled':True})
		for item in msgData:
			try:
				check_res = orderapi.ch_ordr(item['type'], str(item['order_id']))
				if check_res == True:
					# обновление состояния сообщения
					msgmodel.update({'type':item['type'], 'order_id': item['order_id']}, {'enabled':False,'closed_by_manager':False})
					# обновляем данные в истории ошибок
					ordermodel.close_err_history(item['order_id'], item['type'],'')
			except Exception, e:
				print('ch_ordr error. Order: {0}. Exception: {1}'.format(item.get('order_id', '-'), str(e)) )
				pass
		print('finish clearmessages_job')
		schedulerlogmodel.finish_schedule(log_id)
	except Exception, exc:
		print('clearmessages error. Exception: ' + str(exc))
		print_exc()

@get('/handlers/scheduler/scheduled_job') #(hour=23, minute=20)
def scheduled_job():
	'''
		Сбор информации об ошибках в заявках
	'''
	from apis.crm import orderapi
	try:
		print('Start scheduled_job')
		log_id = schedulerlogmodel.add_log('scheduled_job')
		orderapi.check_orders_on_errors()
		print('Finish scheduled_job')
		schedulerlogmodel.finish_schedule(log_id)
	except Exception, exc:
		print(str(exc))

@get('/handlers/scheduler/abc_client_history') #(hour=23, minute=30)
def abc_client_history():
	'''
		пересчитать историю для клиентов по абс классификации
	'''
	from models import clientmodel
	try:
		print('start abc_client_history')
		log_id = schedulerlogmodel.add_log('abc_client_history')
		#clientmodel.abc_recalc()
		config.qu_default.enqueue_call(func=clientmodel.abc_recalc, args=None)
		print('finish abc_client_history')
		schedulerlogmodel.finish_schedule(log_id)
	except Exception, exc:
		excType = exc.__class__.__name__
		print('abc_client_history error. Exception: ' + str(exc))
		print_exc()

@get('/handlers/scheduler/clear_queue') #(hour=23, minute=40)
def clear_queue():
	'''
		Очистка таблицы-очереди с результатом бэкграундных вычислений
	'''
	from models import queuemodel
	try:
		print('start clear_queue')
		log_id = schedulerlogmodel.add_log('clear_queue')
		queuemodel.clear()
		print('finish clear_queue')
		schedulerlogmodel.finish_schedule(log_id)
	except Exception, exc:
		print('clear_queue error. Exception: ' + str(exc))
		print_exc()

@get('/handlers/scheduler/ats_check_clients') #(hour=23, minute=50)
def ats_check_clients():
	'''
		Проверка входящих заданий на совпадений с контактными  данными клиентов
		Если есть совпадения, то клиенты помечаются в заданиях
	'''
	from apis.ats import atsapi
	try:
		print('start ats_check_clients')
		log_id = schedulerlogmodel.add_log('ats_check_clients')
		#atsapi.check_on_clients()
		config.qu_default.enqueue_call(func=atsapi.check_on_clients, args=None)
		print('finish ats_check_clients')
		schedulerlogmodel.finish_schedule(log_id)
	except Exception, exc:
		print('ats_check_clients error. Exception: ' + str(exc))
		print_exc()

@get('/handlers/scheduler/update_contracts_debts') #(hour=01, minute=00)
def update_contracts_debts():
	'''
		пересчитывать задолженности по договорам
	'''
	from models import contractmodel
	from apis.contract import contractapi
	print('start update_contracts_debts')
	log_id = schedulerlogmodel.add_log('update_contracts_debts')
	try:
		contracts = contractmodel.get_list_by({'payments':{'$exists':True}}, {'payments':1})
		for c in contracts:
			debt = contractapi.calculate_debt(c)
			if c.get('debt')!=debt:
				contractmodel.update({'_id':c['_id']}, {'$set':{'debt':debt}}, False, False)
		schedulerlogmodel.finish_schedule(log_id)
		print('finish update_contracts_debts')
	except Exception, exc:
		print('update_contracts_debts error. Exception: ' + str(exc))
		print_exc()


#-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
# Одноразовые задачи-----------------------------------------------------------------------------------------------------------------------------------
#-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
@get('/handlers/scheduler/copy_db_dump_to_google') #(hour=01, minute=10)
def copy_db_dump_to_google():
	'''
		Копирование последнего дампа БД в каталог GOOGLE
	'''
	from helpers.google_api import drive
	import os
	from apiclient.http import MediaInMemoryUpload
	from models import usermodel
	# локальная функция получения последнего измененного файла в дирректории
	def get_last_modified_file(folder):
		date = None
		files = os.listdir(folder)
		if files:
			files = [os.path.join(folder, file) for file in files]
			files = [file for file in files if os.path.isfile(file)]
			file_path = max(files, key=os.path.getctime)
			in_file = open(file_path, "rb") # opening for [r]eading as [b]inary
			data = in_file.read() # if  you only wanted to read 512 bytes, do .read(512)
			in_file.close()
			return {
				'path': file_path,
				'name': os.path.split(file_path)[1],
				'data': data
			}
		return None
	try:
		usermodel.refresh_user_credentials(config.google_api_user)
		# получение последнего по дате  файла с дампом
		# folder = 'D:/OurWork/Modul_Zavod/dumps/'
		folder = '/var/www/mongo/backup/'
		fieldStorage = get_last_modified_file(folder)
		# если файл существует
		if fieldStorage:
			print('Start upload DB dump: '+ fieldStorage['name'])
			media = MediaInMemoryUpload(fieldStorage['data'])
			file_name = fieldStorage['name']
			content_type = 'application/tar+gzip'

			# upload файла на gogle диск
			new_file= drive.upload_file(config.google_api_user, config.db_dumps_google_folder, file_name, media, content_type)
			if not new_file:
				raise Exception("Не удалось скопировать DB дамп  в каталог GOOGLE.")
			else:
				os.remove(fieldStorage['path'])
				print('DB dump upload complete: ' + fieldStorage['name'])
		else:
			raise Exception("DB дампы не найдены.")
	except Exception, exc:
		print(u'copy_db_dump_to_google error. Exception: ' + str(exc))
		print_exc()
