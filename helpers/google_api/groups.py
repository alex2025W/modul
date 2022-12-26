#!/usr/bin/python
# -*- coding: utf-8 -*-
import json
import httplib2
from httplib import BadStatusLine
from apiclient.http import BatchHttpRequest
from apiclient.discovery import build
from apiclient import errors
from models import usermodel
import exceptions
import datetime
from copy import deepcopy,copy
from traceback import print_exc
# from oauth2client.client import SignedJwtAssertionCredentials

class google_groups_settings:
	'''
		Class for working with google groups setting
	'''
	_user_email = "" # email for acces to groups
	_service = None # google service

	def __init__(self, user_email):
		'''
			Constructor
		'''
		self._user_email = user_email
		self._service = self.__get_service(user_email)
		if not self._service:
			raise Exception('------ERROR get google service------')
	def get_user_email():
		'''prop for get user email'''
		return self._user_email

	def __get_service(self, user_email):
		'''
			Get credentials for user by email
		'''
		try:
			credentials = usermodel.get_user_credentials(user_email)
			if not credentials:
				print('------Error! Null credentials for user:{0}'.format(user_email))
				return None

			http = httplib2.Http()
			http = credentials.authorize(http)
			_service = build('groupssettings', 'v1', http=http)
			return _service
		except Exception, exc:
			excType = exc.__class__.__name__
			print('------ERROR get credentials------')
			print_exc()
		return None

	def update(self, group_key, params):
		'''
			Edit group settings
			param - key of parameter
			value - value to change
		'''
		try:
			body = params
			#print(dir(self._service.groups()))
			return self._service.groups().update(groupUniqueId=group_key, body=body).execute()
		except Exception, e:
			raise Exception(str(e))
		return None


class google_groups:
	'''
		Class for working with google groups
	'''
	_user_email = "" # email for acces to groups
	_service = None # google service

	def __init__(self, user_email):
		'''Constructor'''
		self._user_email = user_email
		self._service = self.__get_service(user_email)
		if not self._service:
			raise Exception('------ERROR get google service------')
	def get_user_email():
		'''prop for get user email'''
		return self._user_email

	def __get_service(self, user_email):
		'''
		Get credentials for user by email
		'''
		try:
			# #SERVICE_EMAIL = "129846579067-b992a5p654557h0dhnd90brfjkep8kfe@developer.gserviceaccount.com"
			# SERVICE_EMAIL = "modul-google-groups@api-project-129846579067.iam.gserviceaccount.com"
			# OAUTH_SCOPE = [
			# 	'https://www.googleapis.com/auth/admin.directory.group.member',
			# 	'https://www.googleapis.com/auth/admin.directory.group'
			# ]
			# with open('API Project-c295827e5c8d.p12') as f:
			# 	PRIVATE_KEY = f.read()
			# # print('-----------')
			# # print(PRIVATE_KEY)
			# # print('-----------')
			# credentials = SignedJwtAssertionCredentials(SERVICE_EMAIL, PRIVATE_KEY, OAUTH_SCOPE, sub=user_email)
			# # print('---credentials----')
			# # print(credentials)
			# # print('----------')

			credentials = usermodel.get_user_credentials(user_email)
			if not credentials:
				print('------Error! Null credentials for user:{0}'.format(user_email))
				return None

			http = httplib2.Http()
			http = credentials.authorize(http)
			_service = build('admin', 'directory_v1', http=http)
			return _service
		except Exception, exc:
			excType = exc.__class__.__name__
			print('------ERROR get credentials------')
			print_exc()
		return None

	def get_group(self, group_key):
		'''
		Get group info by key
		'''
		try:
			return self._service.groups().get(groupKey=group_key).execute()
		except Exception, e:
			# raise Exception(str(e))
			print_exc()
		return None

	def add_group(self, group_key, group_name = "", description = ""):
		'''
		Add new group
		'''
		try:
			body = {
				"email": group_key,
				"descritpion": description,
				"name": group_name
			}
			return self._service.groups().insert(body=body).execute()
		except Exception, e:
			raise Exception(str(e))
		return None

	def get_members(self, group_key):
		'''
		Get group members list
		'''
		try:
			res =  self._service.members().list(groupKey=group_key).execute()
			if res.has_key('members'):
				return res['members']
			return None
		except Exception, e:
			#raise Exception(str(e))
			print_exc()
		return None

	def insert_group_member(self, group_key, new_member_email, role="OWNER"):
		'''
		Add member from group
		'''
		try:
			body = {"email": new_member_email,"role": role}
			return self._service.members().insert(groupKey=group_key, body=body).execute()
		except Exception, e:
			raise Exception(str(e))
		return None

	def del_group_member(self, group_key, member_email):
		'''
		Remove member from group
		'''
		try:
			body = {"email": member_email,"role": "OWNER"}
			return _service.members().delete(groupKey=group_key, memberKey=remove_member_email).execute()
		except Exception, e:
			raise Exception(str(e))
		return None

	def update_settings(self, group_key, params):
		'''
			Edit group settings
			param - key of parameter
			value - value to change
		'''
		try:
			body = params
			# print(dir(self._service))
			return self._service.groups().update(groupKey=group_key,  body=body).execute()
		except Exception, e:
			raise Exception(str(e))
		return None
