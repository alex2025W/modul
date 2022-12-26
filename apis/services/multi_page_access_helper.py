#!/usr/bin/python
# -*- coding: utf-8 -*-
import config
from traceback import print_exc
import datetime, time
from models import usermodel, routinemodel  
from bson.objectid import ObjectId

__key = 'multiple_page_access'

def create_page_info(page_key):
  '''
    Add new page to multiple_pages_access
  '''
  try:
    page_info = routinemodel.get({'key' : __key, 'data.key': page_key}, {'data.$':1})
    if not page_info:
      page_info = {
        'key': page_key,
        'users': []
      }      
      routinemodel.push({'key' : __key}, {'data': page_info})   
    else:
      page_info = page_info['data'][0]
    return page_info
  except Exception, exc:
    print('Error. multi_page_access_helper.create_page_info: {0}'.format(str(exc)))    
    print_exc()
    raise Exception('Error. multi_page_access_helper.create_page_info: {0}'.format(str(exc)))

def get_page_info(page_key):
  '''
    Get all users on page with time information   
  '''
  from libraries import userlib
  try:
    # get current user info or system user    
    page_info = routinemodel.get({'key' : __key, 'data.key': page_key}, {'data.$':1})
    if not page_info:
      page_info = create_page_info(page_key)
    else:
      page_info = page_info['data'][0]
    if len(page_info['users']) > 0:
      page_info['users'].sort(key = lambda x: (x['date']))

    current_user = userlib.get_cur_user()
    page_info['current_user'] = {'email': current_user['email'], 'name': current_user['fio']}
    return page_info
  except Exception, exc:
    print('Error. multi_page_access_helper.get_page_info: {0}'.format(str(exc)))    
    print_exc()
    raise Exception('Error. multi_page_access_helper.get_page_info: {0}'.format(str(exc)))

def update_page_info(page_key, page_info):
  '''
    Update information about page by key
  '''
  try:       
    del page_info['current_user']
    routinemodel.update({'key' : __key, 'data.key': page_key}, {'data.$': page_info})   
  except Exception, exc:
    print('Error. multi_page_access_helper.update_page_info: {0}'.format(str(exc)))    
    print_exc()
    raise Exception('Error. multi_page_access_helper.update_page_info: {0}'.format(str(exc)))


def add_new_user_to_page(page_key, user_info):
  '''
    Add new user to page
  '''
  try:
    page_info = get_page_info(page_key)
    # check if user already checked on the page
    page_user = None    
    try:
      page_user = (item for item in page_info['users'] if item["email"] == user_info['email']).next()
      page_user['date'] = datetime.datetime.utcnow()
      page_user['count'] += 1

    except:
      page_user = {
        'email': user_info['email'],
        'name': user_info['fio'],
        'date': datetime.datetime.utcnow(),
        'count': 1
      }
      page_info['users'].append(page_user)

    # update information about page
    update_page_info(page_key, page_info)    
    return page_info
  except Exception, exc:
    print('Error. multi_page_access_helper.add_new_user_to_page: {0}'.format(str(exc)))    
    print_exc()
    raise Exception('Error. multi_page_access_helper.add_new_user_to_page: {0}'.format(str(exc)))

def remove_user_from_page(page_key, user_info):
  '''
    Remove user from pagexs
  '''
  try:
    page_info = get_page_info(page_key)    

    try:
      page_user = (item for item in page_info['users'] if item["email"] == user_info['email']).next()      
      if page_user['count'] == 1:
        page_info['users'] = [row for row in page_info['users'] if row['email'] != user_info['email']]
      else:
        page_user['count'] -= 1
    except:
      pass    
    # update information about page
    update_page_info(page_key, page_info)    
    return page_info
  except Exception, exc:
    print('Error. multi_page_access_helper.add_new_user_to_page: {0}'.format(str(exc)))    
    print_exc()
    raise Exception('Error. multi_page_access_helper.add_new_user_to_page: {0}'.format(str(exc)))

