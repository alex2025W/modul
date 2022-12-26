#!/usr/bin/python
# -*- coding: utf-8 -*-
import json
from bottle import response, request, abort, redirect
from models import pagemodel, usermodel
import urllib
import datetime
from traceback import print_exc
from apis.services import crypto_helper
import config

# глобальный список пользователей
user_data_list = {}


def update_user_info():
  '''
    Обновить данные в кэше для пользователя
  '''
  global user_data_list
  try:
    dt = get_cookie()
    if dt!=None and 'email' in dt:
      from models import usermodel
      res = usermodel.get(dt['email'])
      res['type'] = dt['type'] if 'type' in dt else ''
      # пробиваем доступы по страницам
      pglist = {}
      if 'roles' in res:
        for r in res['roles']:
          for p in r['pages']:
            if p not in pglist:
              pglist[p] = r['pages'][p]
            else:
              for a in r['pages'][p]:
                if a!='additional' or r['pages'][p].get('o'):
                  pglist[p][a] =  r['pages'][p][a] #True
      res['pages'] = pglist
      user_data_list[dt['email']] = res
      return True
  except Exception,e:
    pass
  return False

def set_cookie(email, password, type):
  '''
    Формирование кук
  '''
  cc = {
    'email':email,
    'password':password,
    'type':type,
    'ip':request.environ.get('REMOTE_ADDR')
  }
  # response.set_cookie(config.cookie_settings['cookie_key'], json.dumps(cc), secret=config.cookie_settings['cookie_sign'], path='/', max_age=datetime.timedelta(days=365))
  response.set_cookie(
    config.cookie_settings['cookie_key'],
    crypto_helper.encrypt(json.dumps(cc), config.cookie_settings['cookie_sign']),
    path='/',
    max_age=datetime.timedelta(days=365),
    domain = config.cookie_settings['domain']
  )

def get_cookie():
  '''
    Получить значения куков
  '''
  try:
    #return json.loads(request.get_cookie(config.cookie_settings['cookie_key'], secret=config.cookie_settings['cookie_sign']))
    return json.loads( crypto_helper.decrypt(request.get_cookie(config.cookie_settings['cookie_key']), config.cookie_settings['cookie_sign']))
  except Exception, e:
    pass
  return None

def get_cur_user():
  '''
    Получить текущего пользователя
  '''
  dt = get_cookie()
  if dt!=None and 'email' in dt and dt['email'] in user_data_list:
    return user_data_list[dt['email']]
  return None

def default_page():
  '''
    Получить страницу по умолчанию для пользователя
  '''
  cu = get_cur_user()
  if cu:
    return cu['defaultpage'] if 'defaultpage' in cu else ''
  return None

def get_menu_old():
  '''
    Получить элементы меню, доступные текущему пользователю
  '''
  cu = get_cur_user()
  if cu==None:
    return []
  pages = pagemodel.get_list()
  res = []
  for p in pages:
    if (cu['admin']=='admin' or len(cu['pages'].get(p['id'],{}))>0 ) and p['visible']:
      res.append(p)
  # сортировка меню по алфавиту
  res.sort(key = lambda x: (x['title']))
  return res

def get_menu():
  '''
    Получение меню с группировкой по разделам
  '''
  from bson.objectid import ObjectId
  # get current user info or system user
  usr_info = get_cur_user()
  menu = {}
  if usr_info:
    # get all menu items
    pages =[]
    current_page = None
    # filter menu items by user access
    for p in pagemodel.pages:
      if (
        usr_info.get('admin')=='admin' or
        ( len(usr_info.get('pages',{}).get(p['id'],{}))==1 and  'additional' not in usr_info.get('pages',{}).get(p['id'],{}) )  or
        ( len(usr_info.get('pages',{}).get(p['id'],{})) >1 )
      ) and p['visible']:
        pages.append(p)

    for item in pages:
      if item.get('visible'):
        # if item['id'] == page_key:
        #   current_page = item
        if item.get('group'):
          if item['group'] not in menu:
            menu[item['group']] = {'group': item['group'], 'items':[], 'id': str(ObjectId())}
          menu[item['group']]['items'].append(item)
        else:
          menu[item['id']] = item

    menu = menu.values()
    menu.sort(key = lambda x: (x['group']))

    for row in menu:
      if row.get('items'):
        row['items'].sort(key = lambda x: (x['name']))

    new_menu = []
    for row in menu:
      items = row.get('items', [])
      new_items = []
      indexed_items = []
      for item in items:
        if 'index' in item:
          indexed_items.append(item)
        else:
          new_items.append(item)

      if indexed_items:
        for item in indexed_items:
          new_items.insert(item['index'], item)

      new_menu.append({
        'items': new_items,
        'group': row['group'],
        'id': row['id'],
      })

  return new_menu

def is_logined():
  '''
    Проверка пользователя на авторизованность
  '''
  cu = get_cur_user()
  if cu:
    return cu.get('credentials', None) != None
  return False

def logout():
  '''
    Выход пользователя из приложения
  '''
  cookie = get_cookie()
  if cookie and 'email' in cookie:
    usermodel.remove_user_credentials(cookie['email'])
  response.set_cookie(config.cookie_settings['cookie_key'], '', secret=config.cookie_settings['cookie_sign'], path='/')

def has_access(page,access):
  '''
    Проверка доступа пользователя к конкретной странице
  '''
  cu = get_cur_user()
  if cu==None:
    return False
  if cu['admin']=='admin' or (page in cu['pages'] and access in cu['pages'][page]):
    return True
  return False

def get_page_access(page):
  '''
    Получение детализации доступа пользователя к определенной странице
  '''
  cu = get_cur_user()
  res = {'role':cu['admin'], 'access':None}
  if page in cu['pages']:
    res['access'] = cu['pages'][page]
  return res

def check_page_access(page, access):
  '''
    Проверить доступ текущего пользователя к старнице (Page - ключ страницы, access - ключ доступа: r - чтение, w - запись, o - расширенные)
  '''
  if not is_logined():
    redirect('/login?q='+urllib.quote(request.path))

  # обновление credentials пользователя
  usr = get_cur_user()
  try:
    if usr and usr.get('type')=='gmail' and usr.get('email'):
      if not usermodel.refresh_user_credentials(usr['email']):
        redirect('/login?q='+urllib.quote(request.path))
  except Exception, exc:
    print('Error! refresh_user_credentials.' + str(exc))
    excType = exc.__class__.__name__
    print_exc()

  # проверка на доступ
  if not has_access(page,access):
    abort(403,"Доступ запрещен")


def check_handler_access(page, access):
  '''
    Проверить доступ текущего пользователя к хендлеру (Page - ключ страницы, access - ключ доступа: r - чтение, w - запись, o - расширенные)
  '''
  # usermodel.refresh_user_credentials(usr['email'])
  if not has_access(page,access):
    abort(401,"Доступ запрещен")

def check_handler_additional_access(page, additional_access_key):
  '''
    Проверка расширенного доступа к странице
    page - страница к которой идет проверка доступа
    additional_access_key - ключ расширенного доступа
  '''
  cu = get_cur_user()
  access = get_page_access(page)
  if cu['admin'] == 'admin':
    return True
  if access['role']!='admin' and access['access'] and 'o' in access['access'] and 'additional' in access['access']:
    if access['access']['additional'].get(additional_access_key) == 1:
      return True
  return False

def check_order_access(manager):
  '''
    проверка доступа пользователя к заявке CRM
  '''
  cu = get_cur_user()
  access = get_page_access('app')
  result = False
  if cu['admin'] == 'admin':
    result = True
  if access['role']!='admin' and access['access'] and 'o' in access['access'] and 'additional' in access['access']:
    if access['access']['additional'].get('type') == 'all':
      result = True
    else:
      user_list = get_access_user_list('app')
      result = manager in user_list
  elif 'r' in access['access']:
    result = True
  return result

def get_access_user_list(page):
  '''
    Получить список доступных для текущего пользователя пользователей в указаном разделе
  '''
  access = get_page_access(page)
  args= None
  if access['role']!='admin' and access['access'] and 'o' in access['access'] and 'additional' in access['access']:
    cu = get_cur_user()
    add = access['access']['additional']
    if add:
      if add.get('type')=='onlymy':
        args = [cu['email']]
      elif add.get('type')=='shared':
        mnlist = add.get('managers',[])
        mnlist.append(cu['email'])
        args = mnlist
  return args

def get_crm_access_user_list():
  '''
    получить список доступных для текущего пользователя пользователей в CRM-е
  '''
  return get_access_user_list('app')

def get_crm_user_list():
  '''
    Получить список доступных для текущего пользователя пользователей в CRM-е
  '''
  users = usermodel.get_list({}, {'email':1, 'fio':1})
  return users
