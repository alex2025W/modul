#!/usr/bin/python
# -*- coding: utf-8 -*-
import json
import httplib2
from apiclient.discovery import build
from models import usermodel
import exceptions
import datetime

def get_service(user_email):
	#try:
	credentials = usermodel.get_user_credentials(user_email)
	http = httplib2.Http()
	http = credentials.authorize(http)
	service = build('calendar', 'v3', http=http)
	return service
	#except Exception, e:
	#	print('error get service:' + str(e))
	#	pass
	#return None

def get_event(user_email, calendar_id, event_id):
	'''Get calendar event'''
	try:
		service = get_service(user_email)
		if service is not None:
			return service.events().get(calendarId=calendar_id, eventId=event_id).execute()
	except Exception, e:
		if str(e)!='Not Found':
			return None
		raise Exception(str(e))
	return None

def get_events_by_date(user_email, calendar_id, date):
	'''Get calendar events by date'''
	try:
		max_date = date + datetime.timedelta(hours=23)
		min_date = date
		service = get_service(user_email)
		if service is not None:
			return service.events().list(calendarId=calendar_id, timeMax=str(max_date.isoformat())+'.04Z', timeMin=str(min_date.isoformat())+'.04Z').execute()
	except Exception, e:
		print('Calendar events list error: '+str(e))
		if str(e)!='Not Found':
			return None
		raise Exception(str(e))
	return None

def get_events_by_date_range(calendar_id, date_from, date_to):
	""" Get calendar events whithin date range """
	try:
		min_date = date_from
		max_date = date_to + datetime.timedelta(hours=23)
		# works only for public calendars
		service = get_service("nobody@modul.org")
		if service:
			return service.events().list(
					calendarId=calendar_id,
					maxResults=2500,
					orderBy='startTime',
					singleEvents=True,
					timeMin=str(min_date.isoformat())+'Z',
					timeMax=str(max_date.isoformat())+'Z',
					fields='updated,items(end,start,summary)',
					).execute()
	except Exception, e:
		print('Calendar events list error: '+str(e))
		if str(e)!='Not Found':
			return None
		raise Exception(str(e))
	return None

def add_event(user_email, calendar_id, event_info):
	'''Add calendar event
	event = {
		"id": "7n6f7a9g",
		'summary': 'Appointment',
		'location': 'Somewhere',
		'start': {'dateTime': '2014-04-12T10:00:00.000-07:00'},
		'end': {'dateTime': '2014-04-12T10:25:00.000-07:00'},
		# 'attendees': [
		# 	{
		# 		'email': 'attendeeEmail',
		# 		# Other attendee's data...
		# 	},
		# ...
		# ],
	}
	'''
	#try:
	service = get_service(user_email)
	if service is not None:
		return service.events().insert(calendarId=calendar_id, body=event_info).execute()
	#except Exception, e:
	#	print('Add event error: '+str(e))
	#	pass
	#return None

def update_event(user_email, calendar_id, event_id, event_info):
	'''Update calendar event'''
	#try:
	service = get_service(user_email)
	if service is not None:
		return service.events().update(calendarId=calendar_id, eventId=event_id, body=event_info).execute()
	#except Exception, e:
	#	print(str(e))
	#	pass
	#return None

def remove_event(user_email, calendar_id, event_id):
	'''Remove calendar event'''
	#try:
	service = get_service(user_email)
	if service is not None:
		return service.events().delete(calendarId=calendar_id, eventId=event_id).execute()
	#except Exception, e:
	#	print(str(e))
	#	pass
	#return False
