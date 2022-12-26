#!/usr/bin/python
# -*- coding: utf-8 -*-
import json
import sys,  os, signal, string
import config
from string import replace
import smtplib
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart
from email.header import Header, make_header
import threading
import datetime
from models import emailqueuemodel, usermodel


def __prepare(email_from, subject, body, recipient, send_as_html):
	'''
		Подготовка письма к отправке
		В получателях только один человек
	'''
	if not email_from:
		email_from = config.smtp_settings['from']

	russian ="utf-8" # кодировка сообщения
	# формируется письмо
	msg = MIMEMultipart()
	msg['From'] = make_header([(email_from, russian)])
	msg['To'] = make_header([(recipient['fio'].encode('utf-8') if 'fio' in recipient else recipient['email'], russian)])
	msg['Subject'] = Header(subject.encode('utf-8'), russian)
	msg['Disposition-Notification-To'] = Header('k@modul.org')
	if send_as_html==True:
		body = body.replace('\r\n', '<br/>')
		body = body.replace('\n', '<br/>')
		body = '<html><body>'+body+'</body></html>'
		msg.attach(MIMEText(body.encode('utf-8'),'html',russian))
	else:
		msg.attach(MIMEText(body.encode('utf-8'),'plain',russian))
	return msg

def __prepare_for_multiple(user_from, subject, body, recipients, send_as_html):
	"""
		Подготовка письма к отправке
		В получателях много людей
		email_from - тот от кого будет вестись рассылка
	"""
	russian ='utf-8' # кодировка сообщения
	# формируется письмо
	msg = MIMEMultipart()

	# подготовка информации об отправителе
	email_from = None
	fio_from = None
	if not user_from:
		email_from = config.smtp_settings['from']
		fio_from = config.smtp_settings.get('fio','')
	else:
		email_from = user_from.get('email')
		fio_from = user_from.get('fio','')

	#msg['From'] = make_header([(email_from, russian)])
	# if fio_from:
	# 	msg['From'] = formataddr((str(Header(fio_from, 'utf-8')), email_from))
	# else:
	# 	msg['From'] = make_header([(fio_from.encode('utf-8') if fio_from else email_from, russian)])
	# recipients = ['info.dmitry.cherkasov@gmail.com']

	msg['From'] = make_header([(fio_from.encode('utf-8') if fio_from else email_from, russian)])
	msg.add_header('reply-to', email_from)

	msg['To'] = ', '.join(recipients)
	msg['Subject'] = Header(subject.encode('utf-8'), russian)
	msg['Disposition-Notification-To'] = Header('k@modul.org')
	if send_as_html==True:
		body = body.replace('\r\n', '<br/>')
		body = body.replace('\n', '<br/>')
		body = '<html><body>'+body+'</body></html>'
		msg.attach(MIMEText(body.encode('utf-8'),'html',russian))
	else:
		msg.attach(MIMEText(body.encode('utf-8'),'plain',russian))
	return msg


def send(subject, body, recipients, send_as_html=False, user_email=None):
 	"""
		Send email fucntionыа
		recipients= [] - list of email adresses {'fio', 'email'}
 	"""
	if recipients and len(recipients)>0:
		user_fio = None
		if user_email:
			user_info = usermodel.get(user_email)
			if user_info:
				user_fio = user_info.get('fio')

		emailqueuemodel.add(subject, body, recipients, send_as_html, user_email, user_fio)
		do_send_all()


def do_send(smtp, user_from, subject, body, recipients, send_as_html=False):
	"""
	Send email function
	recipients= [] - list of email addresses {'fio', 'email'}
	"""
	result = True

	if not isinstance(recipients, list):
		raise TypeError('recipients attribute must be instance of list. Got: {}'.format(type(recipients)))

	try:
		if recipients and len(recipients) > 0:
			recipients_emails = [row['email'] for row in recipients]
			try:

				if not user_from:
					email_from = config.smtp_settings['from']
				else:
					email_from = user_from.get('email')

				msg = __prepare_for_multiple(user_from, subject, body, recipients_emails, send_as_html)
				# smtp.sendmail(config.smtp_settings['email'], recipients_emails, msg.as_string())
				smtp.sendmail(email_from, recipients_emails, msg.as_string())
			except Exception, e:
				print('Mail sending error: ' + str(e))
				print(recipients_emails)
				result = False
		else:
			print('Mail sending error. The list of recepients are empty.')
	except Exception, e:
		print('SMTP error: ' + str(e))
		result = False
	return result

is_everything_sending = False
def do_send_all():
	global is_everything_sending
	# если еще не все письма отправлены
	if not is_everything_sending:
		# выполняем рассылку
		is_everything_sending = True
		# подключаемся к SMTP
		smtp = smtplib.SMTP(config.smtp_settings['host'],config.smtp_settings['port'])
		# если необходима авторизация, то выполняем ее
		if config.smtp_settings['auth']:
			if config.smtp_settings['tls']:
				smtp.starttls()
			smtp.ehlo()
			smtp.login(config.smtp_settings['user'],config.smtp_settings['password'])
		try:
			for e in emailqueuemodel.get_list({'status':{'$ne':'complete'}}):
				# получение информации о пользователе
				user_info = None
				if e.get('user_email'):
					user_info = usermodel.get(e.get('user_email'))

				res = True
				try:
					res = do_send(smtp, user_info,  e.get('subject'), e.get('body'), e.get('recipients'), e.get('send_as_html'))
				except Exception, e:
					print('SMTP error: ' + str(e))
					res = False
				if res:
					emailqueuemodel.update({'_id':e['_id']},{'$set':{'status':'complete', 'last_attempt_date':datetime.datetime.utcnow()}, '$inc':{'send_attempt':1}})
				else:
					emailqueuemodel.update({'_id':e['_id']},{'$set':{'status':'error', 'last_attempt_date':datetime.datetime.utcnow()}, '$inc':{'send_attempt':1}})
		except Exception, e:
			print('SEND queue error: ' + str(e))
			pass
		# помечаем что не все отправялено
		is_everything_sending = False
		# закрываем соединение
		smtp.quit()
