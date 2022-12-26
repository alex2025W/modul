#!/usr/bin/python
# -*- coding: utf-8 -*-
# from multiprocessing.reduction import _reset
# from billiard.py2.reduction import _reset

from bottle import abort
import pymongo
import bson
from datetime import datetime, time
import time as root_time
from bson.code import Code
import dirmodel
import usermodel
import config
import routine
from models import countersmodel
from models import historymodel
from traceback import print_exc

db = config.db

def upd(id, data):
  try:
    odb = db.orders
    o_id = odb.update({'_id': id},{'$set':data})
  except pymongo.errors.PyMongoError as e:
    print('ERROR. Order update. {0}'.format(str(e)))
    raise Exception(str(e))

def get_by_args(args=None, fields = None):
  '''
    Получение информации о требуемом объете по заданным параметрам
  '''
  try:
    return db.orders.find_one(args, fields)
  except pymongo.errors.PyMongoError as e:
    print('ERROR. Order get_by_args. {0}'.format(str(e)))
    raise Exception(str(e))

def update_by(cond, data, insert_if_notfound=True, multi_update=False):
  """ update workorder """
  try:
    db.orders.update(cond, data, upsert=insert_if_notfound,multi=multi_update)
  except pymongo.errors.OperationFailure as e:
    abort(400, e)
  except pymongo.errors.PyMongoError as e:
    abort(400, "server_error")

def update(id, data, editor, user, change_comment=''):

  del data['client_id']
  del data['client']
  del data['datetime']

  if 'error_history' in data:
    del data['error_history']

  if (len(data['products']) == 0):
    data['price'] = 0
    data['structure'] = '—'
    data['approx'] = 'no'
    data['approx_sq'] = 'no'
  else:
    _montaz = 0
    _delivery = 0
    ''' доставка и монтаж продукции '''
    _prod_additional = 0
    prod_price = 0
    prod_struc = ''
    data['approx'] = 'no'
    data['approx_sq'] = 'no'
    for prod in data['products']:
      try:
        prod['count'] = int(prod['count'])
      except Exception, e:
        prod['count'] = 0

      try:
        prod['price'] = routine.strToFloat(prod['price'])
      except Exception, e:
        prod['price'] = 0

      try:
        prod['sq'] = float(prod['sq'])
      except Exception, e:
        prod['sq'] = 0

      prod_price = prod_price + routine.strToFloat(prod['price'])*int(prod['count'])
      for p in prod['positions']:
        try:
          _prod_additional += routine.strToFloat(p['mont_price'])*(int(p['num']) if 'mont_price_type' not in p or not p['mont_price_type'] else 1)
        except Exception, e:
          pass
        try:
          _prod_additional += routine.strToFloat(p['delivery'])
        except Exception, e:
          pass

      prod_struc = prod_struc + prod['name'] + u'&nbsp;(' + str(prod['count']) +u'x'+ prod['type']+u'); '
      if prod.get('approx') == 'yes':
        data['approx'] = 'yes'
      if prod.get('approx_sq') == 'yes':
        data['approx_sq'] = 'yes'
      try:
        for pos in prod['positions']:
          _montaz +=  routine.strToFloat(pos['mont_price'])*(int(pos['num']) if 'mont_price_type' not in pos or not pos['mont_price_type'] else 1)
      except Exception, e:
        pass

    for service in data.get('services',[]):
      prod_struc = prod_struc + service['name'] + u'&nbsp;(' + service['type']+u'); '

    try:
      _montaz = routine.strToFloat(data['total_montaz'])
    except Exception, e:
      pass
    try:
      _delivery = routine.strToFloat(data['total_delivery'])
    except Exception, e:
      pass

    #data['price'] = int(prod_price + _montaz+_delivery+_prod_additional)
    data['price'] = routine.strToFloat(prod_price + _prod_additional)
    data['only_price'] = routine.strToFloat(prod_price)
    if (len(prod_struc)>0):
      prod_struc = prod_struc[:-2]
      data['structure'] = prod_struc

  services_price = 0
  for service in data.get('services',[]):
    try:
      service['price'] = routine.strToFloat(service['price'])
    except Exception, e:
      service['price'] = 0
    services_price += service['price']
  data['price'] = data['price'] + services_price

  initiators = list()
  for hist in data['history']:
    if hist['datetime'] == 'new' or 'upd' in hist['datetime']:
      if hist['datetime'] == 'new':
        hist['datetime'] = datetime.utcnow().strftime('%d.%m.%Y %H:%M:%S')
      hist['datetime'] = hist['datetime'].replace('upd', '')
      hist['manager'] = editor
      try:
        data['close_date'] = datetime.strptime(hist['enddate'],'%d.%m.%Y')
      except Exception, e:
        data['close_date'] = None
      try:
        data['finish_date'] = datetime.strptime(hist['finishdate'],'%d.%m.%Y')
      except Exception, e:
        data['finish_date'] = None

      data['datetime'] = datetime.utcnow()
      # data['manager'] = user

      #if (hist['comment'] == ''):
      # hist['comment'] = '—'
      #comment = hist['comment']
      #data['comment'] = comment
      data['chance'] = hist['chance']
      data['cur_chance'] = hist['chance']
      if (hist['condition'] == ''):
        cond = dirmodel.get(hist['condition_type'])
        hist['condition'] = cond
        data['condition'] = cond
      else:
        data['condition'] = hist['condition']
      data['condition_type'] = hist['condition_type']
      if (hist['condition_type'] == u'закрывающее'):
        data['closed'] = 'yes'
      else:
        data['closed'] = 'no'

      if (hist['condition'] ==  dirmodel.OrderConditions['REFUSE']):
        data['l_state_reason'] = hist['reason']
      elif (hist['condition'] == dirmodel.OrderConditions['EXAMINE']):
        data['l_state_reason'] = hist['reason']
      elif (hist['condition'] == dirmodel.OrderConditions['INTEREST']):

        data['l_state_reason'] = hist['reason']
      else:
        data['auto_changed'] = False
        data['l_state_reason'] = ''


      data['l_state_manager'] = user
      data['l_state_initiator'] = (hist.get('initiator','they') or 'they')

    # обновление комментариев в истории
    for c in hist['comments']:
        if not c.get('_id'):
          c['_id'] = bson.objectid.ObjectId()
        else:
          c['_id'] = bson.objectid.ObjectId(c['_id'])
        if not c.get('date_add') or c.get('date_add')=='new':
          c['date_add'] = datetime.utcnow()

        if not c.get('date_changed') or 'upd' in str(c.get('data_changed')):
          c['date_changed'] = datetime.utcnow()
          c['manager'] = editor

    initiators.append((hist.get('initiator','they') or 'they'))

    data['all_states_initiator_we'] = 'they' not in initiators
    data['all_states_initiator_they'] = 'we' not in initiators

    if 'log' in hist:
      for log in hist['log']:
        if log['datetime'] == 'new':
          log['datetime'] = datetime.utcnow().strftime('%d.%m.%Y %H:%M:%S')

  # вставляем комментарий для заявки из комментария последнего состояния
  if len(data['history'])>0:
    last_state = data['history'][len(data['history'])-1]
    comments = last_state.get('comments',[])
    data['comment'] = '-' if len(comments)==0 else comments[len(comments)-1].get('text','')


  data['history'].sort(key = lambda x: (routine.strToDateTime( x['datetime'])))



  for c in data.get('contracts', []):
    if 'contract_id' in c:
      c['contract_id'] = bson.objectid.ObjectId(c['contract_id'])
    if c.get('factory_id'):
      c['factory_id'] = bson.objectid.ObjectId(c['factory_id'])

  prev_chance = 0
  chance = 0
  try:
    chance = int(data['history'][-1]['chance'])
  except Exception, e:
    pass
  try:
    prev_chance = int(data['history'][-2]['chance'])
    data['history'][-1]['prev_chance'] = prev_chance
  except Exception, e:
    pass

  ch_str = ''
  if chance == 0:
    ch_str = '—'
  else:
    ch_str = str(chance)
  if prev_chance > 0 and prev_chance != chance:
    raznica = chance-prev_chance
    ch_str = ch_str+' ('+ ('+' if raznica>0 else '') +str(raznica)+')'
  data['chance_str'] = ch_str
  data['prev_chance'] = prev_chance

  tsknum = 0
  optsk = False
  for task in data['tasks']:
    tsknum = tsknum + 1
    if (task['datetime'] == 'new'):
      task['datetime'] = datetime.utcnow().strftime('%d.%m.%Y %H:%M:%S')
      if ('manager' not in task):
        task['manager'] = user

    if task['status'] == u'':
      data['task'] = task['condition']
      # data['task_date'] = task['closedatetime']

      data['task_date'] = datetime.strptime(task['closedatetime'],'%d.%m.%Y')

      optsk = True
  data['task_count'] = tsknum
  if not optsk:
    data['task'] = str(tsknum)
    data['task_date'] = ''

  odb = db.orders

  try:
    o_id = odb.update({'_id': bson.objectid.ObjectId(id)},{'$set':data})
    env = usermodel.get_env()
    env['datetime'] = datetime.utcnow()
    env['manager'] = user
    data['env'] = env
    #lodb.update({'_id': bson.objectid.ObjectId(id)},{'$push':{'logs':data}}, True)
    try:
      historymodel.add(id, 'app', change_comment, data, user )
    except Exception, exc:
      excType = exc.__class__.__name__
      print_exc()

    # обновление активности по заявке
    update_orders_activity([data['number']])

  except pymongo.errors.PyMongoError as e:
    print(e)
    abort(400,"server_error")
  return o_id

def add(data, user, change_comment=''):
  '''
    Создание новой заявки
  '''
  import clientmodel
  data['added'] = datetime.utcnow()
  data['added_by'] = user
  data['client_id'] = bson.objectid.ObjectId(data['client_id'])
  data['prev_chance'] = 0
  data['chance'] = 0
  data['cur_chance'] = 0
  cl = clientmodel.get(data['client_id'])
  data['client'] = cl['name']
  if (len(data['products']) == 0):
    data['price'] = 0
    data['structure'] = '—'
    data['approx'] = 'no'
    data['approx_sq'] = 'no'
    data['sq'] = 0
  else:
    prod_sq = 0
    prod_price = 0
    prod_struc = ''
    _montaz = 0
    _delivery = 0
    ''' доставка и монтаж продукции '''
    _prod_additional = 0
    data['approx'] = 'no'
    data['approx_sq'] = 'no'

    for prod in data['products']:
      try:
        prod['count'] = int(prod['count'])
      except Exception, e:
        prod['count'] = 0
      try:
        prod['price'] = routine.strToFloat(prod['price'])
      except Exception, e:
        prod['price'] = 0
      try:
        prod['sq'] = routine.strToFloat(prod['sq'])
      except Exception, e:
        prod['sq'] = 0

      prod_price = prod_price + routine.strToFloat(prod['price'])*int(prod['count'])
      prod_struc = prod_struc + prod['name'] + u'&nbsp;(' + str(prod['count']) +u'x'+ prod['type']+u'); '
      prod_sq = prod_sq + (prod['sq'] * prod['count'])
      for p in prod['positions']:
        try:
          _prod_additional = _prod_additional+routine.strToFloat(p['mont_price'])*(int(p['num']) if 'mont_price_type' not in p or not p['mont_price_type'] else 1)
        except Exception, e:
          pass
        try:
          _prod_additional = _prod_additional+routine.strToFloat(p['delivery'])
        except Exception, e:
          pass

      if (prod['approx'] == 'yes'):
        data['approx'] = 'yes'
      if (prod['approx_sq'] == 'yes'):
        data['approx_sq'] = 'yes'
      try:
        for pos in prod['positions']:
          _montaz =  _montaz + int(routine.strToFloat['mont_price'])*(int(pos['num']) if 'mont_price_type' not in pos or not pos['mont_price_type'] else 1)
      except Exception, e:
        pass
    try:
      _montaz = routine.strToFloat(data['total_montaz'])
    except Exception, e:
      pass
    try:
      _delivery = routine.strToFloat(data['total_delivery'])
    except Exception, e:
      pass

    data['price'] = routine.strToFloat(prod_price + _montaz+_delivery+_prod_additional)
    data['only_price'] = routine.strToFloat(prod_price)
    data['sq'] = routine.strToFloat(prod_sq)

    if (len(prod_struc)>0):
      prod_struc = prod_struc[:-2]
      data['structure'] = prod_struc

  services_price = 0
  for service in data.get('services',[]):
    try:
      service['price'] = routine.strToFloat(service['price'])
    except Exception, e:
      service['price'] = 0
    services_price += service['price']

  if (len(data['history']) == 0):
    data['manager'] = user
    data['datetime'] = datetime.utcnow()
    data['comment'] = '—'
    data['condition_type'] = u'начальное'
    # data['condition'] = dirmodel.get(data['condition_type'])
    data['condition'] = dirmodel.OrderConditions['INTEREST']

    data['history'].append({'datetime':datetime.utcnow().strftime('%d.%m.%Y %H:%M:%S'), 'manager':user, 'comment':'—', 'condition': data['condition'], 'condition_type' : u'начальное'})
  else:
    for hist in data['history']:
      if (hist['datetime'] == 'new'):
        hist['datetime'] = datetime.utcnow().strftime('%d.%m.%Y %H:%M:%S')
        hist['manager'] = user
        data['manager'] = user
        data['chance'] = hist['chance']
        data['cur_chance'] = hist['chance']
        if hist['chance'] > 0:
          data['chance_str'] = hist['chance']
        else:
          data['chance_str'] = '—'
        data['datetime'] = datetime.utcnow()
        try:
          data['close_date'] = datetime.strptime(hist['enddate'],'%d.%m.%Y')
        except Exception, e:
          data['close_date'] = None
        try:
          data['finish_date'] = datetime.strptime(hist['finishdate'],'%d.%m.%Y')
        except Exception, e:
          data['finish_date'] = None
        if (hist['comment'] == ''):
          hist['comment'] = '—'
        comment = hist['comment']
        #if len(comment)>20:
        # comment = comment[:20]+'...'
        data['comment'] = comment
        if (hist['condition'] == ''):
          cond = dirmodel.get(hist['condition_type'])
          hist['condition'] = cond
          data['condition'] = cond
        else:
          data['condition'] = hist['condition']
        data['condition_type'] = hist['condition_type']
        if (hist['condition_type'] == u'закрывающее'):
          data['closed'] = 'yes'
      # обновление комментариев в истории
      for c in hist.get('comments',[]):
        if not c.get('_id'):
          c['_id'] = bson.objectid.ObjectId()
        else:
          c['_id'] = bson.objectid.ObjectId(c['_id'])
        if not c.get('date_add') or c.get('date_add')=='new':
          c['date_add'] = datetime.utcnow()

        if not c.get('date_changed') or 'upd' in str(c.get('data_changed')):
          c['date_changed'] = datetime.utcnow()
          c['manager'] = user

  #-----------------------------------------------------------------------------------------------------------------------------------------
  # пересчет параметров
  #f_state                // первое состояние
  #f_state_date          // дата первого состояния
  #l_state                 // последнее состояние
  #l_state_date          // дата последнего состояния
  #prelast_state          // предпоследнее состояние
  #prelast_state_date    // дата предпоследнего состояния
  #last_close_date        // последняя не пустая дата закрытия во всей истории состояний
  #cur_close_date        // планируемая дата закрытия из последнего состояния
  #close_date            // планируемая дата закрытия из последнего состояния
  #last_finish_date       // последняя не пустая дата сдачи объекта во всей истории состояний
  #cur_finish_date         // планируемая дата сдачи из последнего состояния
  #finish_date             // планируемая дата сдачи из последнего состояния
  # prelast_days_count   // Дней от начала до предпоследнего состояния
  # last_days_count     // Дней от начала до последнего состояния
  # close_days_count    // Дней от планируемой даты закрытия до последнего состояния
  # finish_days_count   // Дней от планируемой даты сдачи до последнего состояния

  hist = data['history'][0]
  if data['l_state'] and data['l_state'] !="":
    data['prelast_state'] = data['l_state']
    data['prelast_state_date'] = datetime.strptime(str(data['l_state_date']),'%d.%m.%Y %H:%M:%S')
    data['prelast_state_date_short'] = int(root_time.mktime(data['prelast_state_date'].timetuple())/60/60/24 )
  else:
    data['prelast_state'] = hist['condition']
    data['prelast_state_date'] = datetime.utcnow()
    data['prelast_state_date_short'] = int(root_time.mktime(data['prelast_state_date'].timetuple())/60/60/24 )

  if not data['f_state'] or data['f_state']=="":
    data['f_state'] = hist['condition']
    data['f_state_date'] = datetime.utcnow()
    data['f_state_date_short'] = int(root_time.mktime(data['f_state_date'].timetuple())/60/60/24 )
  else:
    data['f_state_date'] = datetime.strptime(str(data['f_state_date']),'%d.%m.%Y %H:%M:%S')
    data['f_state_date_short'] = int(root_time.mktime(data['f_state_date'].timetuple())/60/60/24 )

  data['l_state'] = hist['condition']
  data['l_state_reason'] = hist.get('reason','')
  data['l_state_date'] = datetime.utcnow()
  data['l_state_date_short'] = int(root_time.mktime(data['l_state_date'].timetuple())/60/60/24 )
  data['l_state_manager'] = hist.get('manager','')
  data['l_state_initiator'] = hist.get('initiator','they') or 'they'
  data['f_state_initiator'] = hist.get('initiator','they') or 'they'

  data['all_states_initiator_we'] = (data['l_state_initiator'] == 'we')
  data['all_states_initiator_they'] = (data['l_state_initiator'] == 'they')

  if 'enddate' in hist and hist['enddate'] :
    enddate = datetime.strptime(str(hist['enddate']), "%d.%m.%Y")
    data['close_date'] = enddate
    data['cur_close_date'] = enddate
    data['last_close_date'] = enddate
  else:
    data['close_date'] = None
    data['cur_close_date'] = None
    data['last_close_date'] = None

  if 'finishdate' in hist and hist['finishdate'] :
    finishdate = datetime.strptime(str(hist['finishdate']), "%d.%m.%Y")
    data['finish_date'] = finishdate
    data['cur_finish_date'] = finishdate
    data['last_finish_date'] = finishdate
  else:
    data['finish_date'] = None
    data['cur_finish_date'] = None
    data['last_finish_date'] = None

  data['prelast_days_count'] = (data['prelast_state_date']- data['f_state_date']).days
  data['last_days_count'] = (data['l_state_date']- data['f_state_date']).days
  data['diff_last_prelast_days_count'] = data['last_days_count'] - data['prelast_days_count']

  if data['last_close_date']:
    data['close_days_count'] = (data['last_close_date']- data['l_state_date']).days
  else:
    data['close_days_count'] = None

  if data['last_finish_date']:
    data['finish_days_count'] = (data['last_finish_date']- data['l_state_date']).days
  else:
    data['finish_days_count'] = None
  #--------------------------------------------------------------------------------------------------------------------------------------------------

  odb = db.orders
  #lodb = db.orderlogs
  try:
    o_id = odb.insert(data)
    env = usermodel.get_env()
    env['datetime'] = datetime.utcnow()
    env['manager'] = user
    data['env'] = env
    #lodb.insert(data)
    try:
      historymodel.add(o_id, 'app', change_comment, data, user.get('email'))
    except:
      pass

    # обновление активности по заявке
    update_orders_activity([data['number']])

  except pymongo.errors.PyMongoError as e:
    abort(400,"server_error")
  return o_id

def get_total():
  odb = db.orders
  oo = odb.find({'structure':u'ПУСТО'})
  return oo

def get_total2(usl):
  odb = db.orders
  oo = odb.find(usl)
  return oo

def get_total3(usl, flds):
  odb = db.orders
  oo = odb.find(usl, flds)
  return oo

def get_all(cond, sort, tsort, page=1):

  page_size = 10

  odb = db.orders
  try:
    if (len(cond)>0):
      oo = odb.find(cond).sort(tsort, direction=sort).skip(page_size*(page-1)).limit(page_size)
    else:
      oo = odb.find().sort(tsort, direction=sort).skip(page_size*(page-1)).limit(page_size)
  except pymongo.errors.PyMongoError as e:
    abort(400,"server_error")
  return oo

def get_all_new(cond, sort, page=1):
  page_size = 10
  odb = db.orders
  try:
    if len(sort)>0:
      if (len(cond)>0):
        oo = odb.find(cond).sort(sort).skip(page_size*(page-1)).limit(page_size)
      else:
        oo = odb.find().sort(sort).skip(page_size*(page-1)).limit(page_size)
    else:
      if (len(cond)>0):
        oo = odb.find(cond).skip(page_size*(page-1)).limit(page_size)
      else:
        oo = odb.find().skip(page_size*(page-1)).limit(page_size)

  except pymongo.errors.PyMongoError as e:
    abort(400,"server_error")
  return oo

def get_count(cond):
  odb = db.orders
  try:
    if (len(cond)>0):
      oo = odb.find(cond).count()
    else:
      oo = odb.find().count()
  except pymongo.errors.PyMongoError as e:
    abort(400,"server_error")
  return oo

def get(id):

  odb = db.orders
  try:
    oo = odb.find_one({'_id': bson.objectid.ObjectId(id)})
  except pymongo.errors.PyMongoError as e:
    abort(400,"server_error")
  return oo

def get_by(args):
  odb = db.orders
  try:
    oo = odb.find_one(args)
  except pymongo.errors.PyMongoError as e:
    abort(400,"server_error")
  return oo


def get_top(cond):
  odb = db.orders
  oo = []
  for row in odb.aggregate([
    {"$match": cond},
    {"$unwind":"$products"},
    {"$project":{"prname": "$products.name"}},
    {"$group": {"_id" : "$prname" , "number" : { "$sum" : 1 } } },
    {"$sort" : {"number" : -1 } },
    {"$limit" : 10 }
  ]):
    oo.append(row)

  return oo

# получить общее количество записей в истории по каждому менеджеру
def get_manager_activity(cond):
  gt_date = cond['gt_date'].strftime('%Y%m%d')
  lt_date = cond['lt_date'].strftime('%Y%m%d')
  aggregate = db.orders.aggregate([
    {'$project': { 'datetime':1, 'history':1} },
    {'$unwind':'$history'},
    {'$project':{
      'day':{'$substr':['$history.datetime', 0,2]},
      'month': {'$substr':['$history.datetime', 3,2]},
      'year': {'$substr':['$history.datetime', 6,4]},
      'manager': '$history.manager'
    }},
    {'$project':{
      'datestr':{'$concat':['$year','$month','$day']},
      'manager': 1
    }},
    {'$match':{
      '$and':[
        {'datestr':{'$gte':gt_date}},
        {'datestr':{'$lte':lt_date}}
      ]
    }},
    {'$group': {'_id':'$manager', 'count': { '$sum': 1 }}}
  ])
  result = {}
  for item in aggregate:
    result[item['_id']] = item['count']
  return result

# получить общее количество записей в истории по каждому менеджеру
def get_manager_activity_significant(cond):

  gt_date = cond['gt_date'].strftime('%Y%m%d')
  lt_date = cond['lt_date'].strftime('%Y%m%d')

  aggregate = db.orders.aggregate([
    {'$project': { 'datetime':1, 'history':1, 'number':1} },
    {'$unwind':'$history'},
    {'$project':{
      'day':{'$substr':['$history.datetime', 0,2]},
      'month': {'$substr':['$history.datetime', 3,2]},
      'year': {'$substr':['$history.datetime', 6,4]},
      'manager': '$history.manager',
      'chance': '$history.chance',
      'order_number':'$number'
    }},
    {'$project':{
      'datestr':{'$concat':['$year','$month','$day']},
      'manager': 1,
      'chance': 1,
      'order_number':1
    }},
    #{'$match':{
    # '$and':[
    #   {'datestr':{'$gte':gt_date}},
    #   {'datestr':{'$lte':lt_date}}
    # ]
    #}},
    {'$group': {'_id':'$order_number', 'cond': { '$push': {'chance': '$chance', 'date':'$datestr','manager':'$manager'} }}}
  ])

  result = {}
  for item in aggregate:
    cond_list = item.get('cond',[])
    cond_list.sort(key=lambda x:(x['date']))
    last_chance = 0

    if cond_list and len(cond_list) > 0:
      last_chance = cond_list[0].get('chance', 0)

    for c in cond_list:
      if c.get('chance', 0) > last_chance:
        if c.get('date') >= gt_date and c.get('date') <= lt_date:
          result[c.get('manager')] = result.get(c.get('manager'),0) + 1
        last_chance = c.get('chance', 0)

  return result

def get_manager_stat(cond):
  odb = db.orders

  map = Code("""function(){
  emit({manager: this.manager, condition: this.condition, condition_type: this.condition_type}, {sq: this.sq, price: this.price, count:1, products:this.products, closed:this.closed})
  }""")
  reduce = Code("""function(key, vals){
  var res = {sq: 0, price:0, count:0, products:null, closed:''};
  vals.forEach(function(foo){
      res.sq += foo.sq || 0;
      res.closed = foo.closed;
      res.price += foo.price || 0;
      res.products = foo.products;
      res.count += foo.count;

  });
  return res;
}""")
  finalize = Code("""function(key, vals){
  var res = {sq: 0, price:0, count:0, closed:''};
  res.sq = vals.sq||0;
  res.price = vals.price||0;
  res.closed = vals.closed;
  res.count = vals.count||0;
  return res;
}""")
  result = odb.map_reduce(map, reduce, "manager_stat", query=cond, finalize = finalize)
  return result

def get_manager_stat_old(cond):
  odb = db.orders

  map = Code("""function(){
  emit({manager: this.manager, condition: this.condition}, {sq: this.sq, price: this.price, count:0, products:this.products, closed:this.closed})
  }""")
  reduce = Code("""function(key, vals){
  var res = {sq: 0, price:0, count:0, products:null, closed:''};
  vals.forEach(function(foo){
      res.sq += foo.sq || 0;
      res.closed = foo.closed;
      res.price += foo.price || 0;
      res.products = foo.products;
      res.count += foo.count;
      var cnt = 0;
      if (foo.products){
        foo.products.forEach(function(boo){
          cnt += boo.count;
        });
        res.count += cnt;
      }

  });
  return res;
}""")
  finalize = Code("""function(key, vals){
  var res = {sq: 0, price:0, count:0, closed:''};
  res.sq = vals.sq||0;
  res.price = vals.price||0;
  res.closed = vals.closed;
  if (vals.count === 0){
    vals.products.forEach(function(bar){
      res.count += bar.count||0;
    });
  }
  res.count += vals.count||0;
  return res;
}""")
  result = odb.map_reduce(map, reduce, "manager_stat", query=cond, finalize = finalize)
  return result


def get_stat_new(cond):
  odb = db.orders

  map = Code("""function(){
    emit(
      {condition: this.condition},
      {sq: this.sq, price: this.price, count:1})
}""")

  reduce = Code("""function(key, vals){
 var res = {sq: 0, price:0, count:0};
  vals.forEach(function(foo){
      res.sq += foo.sq || 0;
      res.price += foo.price || 0;
      res.count += foo.count;

  });
  return res;
}""")
  finalize = Code("""function(key, vals){
    var res = {sq: 0, price:0, count:0, aver: 0};
    res.sq = vals.sq||0;
  res.price = vals.price||0;
  res.count = vals.count||0;
  res.aver = ((vals.sq>0)? vals.price/vals.sq||0:0);
  return res;
}""")
  result = odb.map_reduce(map, reduce, "itogo_result", query=cond, finalize = finalize)
  return result


def get_stat(cond): # deprecated
  odb = db.orders

  map = Code("function() {if (!this.condition) {return;}emit(this.condition,{summa:0, number:1, square:0.0, count:0, el:this});}")
  reduce = Code("function(previous, current) {var summa = 0; var square = 0.0; var number = 0; var count = 0; var type = ''; for(var i in current){summa+=current[i].summa||0; number+=current[i].number; square += current[i].square; count += current[i].count; if('el' in current[i]){summa+= current[i].el.price; type = current[i].el.condition_type; if ('products' in current[i].el && current[i].el.products.length>0){current[i].el.products.forEach(function(el){square += el.sq*el.count; count += el.count; }); } } } return {summa:summa,number:number, square: square, count: count, type: type}; }")
  finalize =  Code("function(previous, current) {var summa = 0; var square = 0.0; var number = 0; var count = 0; var type = ''; summa+=current.summa||0; number+=current.number; square += current.square; count += current.count; if('el' in current){summa+= current.el.price||0; type = current.el.condition_type; if ('products' in current.el && current.el.products.length>0){current.el.products.forEach(function(el){square += el.sq*el.count; count += el.count; }); } } return {summa:summa,number:number, square: square, count: count, type: type}; }")
  result = odb.map_reduce(map, reduce, "myresults", query=cond, finalize = finalize)
  return result

  # oo = odb.aggregate([
  #     {"$match": cond},
  #     {"$unwind":"$products"},
  #     {"$project": {"sq": "$products.sq", "cnt":"$products.count", "ord_id":"$_id", "condition": "$condition", "price": "$price", "type":"$condition_type"}},
  #     {"$group":{"_id": "$ord_id", "sq": { "$sum" : "$sq" }, "cnt":{"$sum":"$cnt"}, "condition":{"$last":"$condition" }, "price":{"$last":"$price"}, "type":{"$last":"$type" }}},
  #     {"$group": {"_id" : "$condition", "number" : { "$sum" : 1 }, "summa": { "$sum" : "$price" }, "square": { "$sum" : "$sq" }, "count": { "$sum" : "$cnt" }, 'type':{"$first":"$type"} } }
  #   ])
  # return oo

def get_old_new(cond):
  odb = db.orders
  map = Code("function() {if (!this.condition) {return;}emit(null,{summa:0, number:1, square:0.0, count:0, el:this});}")
  reduce = Code("function(previous, current) {var summa = 0; var square = 0.0; var number = 0; var count = 0; var type = ''; for(var i in current){summa+=current[i].summa||0; number+=current[i].number; square += current[i].square; count += current[i].count; if('el' in current[i]){summa+= current[i].el.price||0; type = current[i].el.condition_type; if ('products' in current[i].el && current[i].el.products.length>0){current[i].el.products.forEach(function(el){square += el.sq*el.count; count += el.count; }); } } } return {summa:summa,number:number, square: square, count: count, type: type}; }")
  finalize =  Code("function(previous, current) {var summa = 0; var square = 0.0; var number = 0; var count = 0; var type = ''; summa+=current.summa||0; number+=current.number; square += current.square; count += current.count; if('el' in current){summa+= current.el.price||0; type = current.el.condition_type; if ('products' in current.el && current.el.products.length>0){current.el.products.forEach(function(el){square += el.sq*el.count; count += el.count; }); } } return {summa:summa,number:number, square: square, count: count, type: type}; }")
  result = odb.map_reduce(map, reduce, "myresults", query=cond, finalize = finalize)
  return result
  # oo = odb.aggregate([
  #     {"$match": cond},
  #     {"$unwind":"$products"},
  #     {"$project": {"sq": "$products.sq", "cnt":"$products.count", "condition": "$condition", "ord_id":"$_id", "price": "$price", "type":"$condition_type"}},
  #     {"$group":{"_id": "$ord_id", "sq": { "$sum" : "$sq" }, "cnt":{"$sum":"$cnt"}, "condition":{"$last":"$condition" }, "price":{"$last":"$price"}, "type":{"$last":"$type" }}},
  #     {"$group": {"_id" : 1, "number" : { "$sum" : 1 }, "summa": { "$sum" : "$price" }, "square": { "$sum" : "$sq" }, "count": { "$sum" : "$cnt" }, 'type':{"$first":"$type"} } }
  #   ])
  # return oo

def add_inbox(data):
  data['number'] = countersmodel.get_next_sequence('inbox')
  data['date'] = datetime.utcnow()
  try:
    db.outgoing.insert(data)
    return data
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))


def get_inbox():
  data = []
  try:
    for d in db.outgoing.find().sort('date', direction=1):
      del d['_id']
      d['date'] = d['date'].strftime('%d.%m.%Y')
      data.append(d)
    return data
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))

def get_client(cond):
  odb = db.orders
  oo = odb.aggregate([
      {"$match": cond},
      {"$project": {"client": "$client_id", "_id":0}},
      {"$group": {"_id" : "$client" } }
    ])
  clients = []
  for o in oo:
    clients.append(o['_id'])
  clientdb = db.clients
  allcl = clientdb.find({'_id':{'$in':clients}}).count()

  dates = []
  if '$and' in cond:
    dates = [{'added' : dt['datetime']} for dt in cond['$and'] if 'datetime' in dt]
    if len(dates)==0:
      dates = [{'added' : dt['added']} for dt in cond['$and'] if 'added' in dt]

  and_rec = [{'wherefind':u'Рекомендация'}]
  # oldcl = clientdb.find({'_id':{'$in':clients}, 'wherefind':u'Старый заказчик'}).count()
  # reccl = clientdb.find({'_id':{'$in':clients}, 'wherefind':u'Рекомендация'}).count()
  # newcl = clientdb.find({'_id':{'$in':clients}, 'wherefind':{'$ne':u'Старый заказчик'}}).count()
  if len(dates)>0:
    newcl = clientdb.find({'_id':{'$in':clients}, '$and':dates}).count()
    and_rec += dates
  else:
    newcl = clientdb.find({'_id':{'$in':clients}}).count()

  oldcl = allcl - newcl

  reccl = clientdb.find({'_id':{'$in':clients}, '$and':and_rec}).count()

  tmpAllCl = (allcl if allcl>0 else 1)

  return {'all': allcl,
      'old': str(oldcl) + u' ('+ str(int(oldcl*100/tmpAllCl)) +u'%)',
      'rec': str(reccl)+ u' ('+ str(int(reccl*100/tmpAllCl)) +u'%)',
      'new': str(newcl)+u' ('+ str(int(newcl*100/tmpAllCl)) +u'%)'
    }

def update_client(old_id, new_id, new_name):
  odb = db.orders
  try:
    oo = odb.update({'client_id': old_id}, {'$set':{'client_id': new_id, 'client':new_name}}, multi=True)
  except pymongo.errors.PyMongoError as e:
    abort(400,"server_error")
  return oo

def get_orders_count_by_client(clients,ands=None):
  odb = db.orders
  match = {'client_id':{'$in':clients}}
  if ands:
    match['$and'] = ands
  #print '---------------------------------------------------------'
  #print match
  #print '---------------------------------------------------------'
  oo = odb.aggregate([
      {"$match": match},
      {"$group": {"_id" : "$client_id" , "number" : { "$sum" : 1 } } }
    ])
  res = {}
  for o in oo:
    res[str(o['_id'])] = o['number']
  return res

def get_signed_summ():
  odb = db.orders
  oo = []
  for row in odb.aggregate([

    {'$match': {'condition': dirmodel.OrderConditions['CONTRACT_SIGN']}},

    {"$group": {"_id" : "$client_id",
          'total_price': { '$sum': '$price' },
          'total_sq': {'$sum': '$sq'}}
      }
  ]):
    oo.append(row)
  return oo

def update_orders_containing_overdue_tasks():
  '''
    Изменение статуса просроченных задач
  '''
  orders = get_orders_containing_overdue_tasks()
  curDate = datetime.utcnow()
  for order in orders:
    tasks = order['tasks']
    for task in tasks:
      date_time = datetime.combine(datetime.strptime(task['closedatetime'].split(' ')[0],'%d.%m.%Y'), time.max)
      if curDate > date_time and task['status'] == '':
        task['status'] = u'завершена'
        task['overdue'] = True
        upd(order['_id'], {'tasks': tasks})

def get_orders_containing_overdue_tasks():
  '''
    Получение списка заявок содержащих просроченне задачи
  '''
  result = []
  condition = {'closed':'no'}

  dataResult =db.orders.aggregate([
    {"$match":condition},
    {"$unwind": "$tasks"},
    {"$project":{
      "order_id":"$_id",
      "closed":"$closed",
      "status":"$tasks.status",
      "datetime":"$tasks.closedatetime",
      }
    },
    {"$match":{'status':''} },
  ])

  if(dataResult):
    curDate = datetime.utcnow()
    for row in dataResult:
      # только просроченые задачи
      try:
        row['datetime'] =datetime.combine(datetime.strptime(row['datetime'],'%d.%m.%Y'), time.max)
        row['type'] = 'task_overdue'
        if(curDate>row['datetime']):
          result.append(row)
      except Exception, e:
        pass
  orders = [get(item['order_id']) for item in result]
  return orders

def get_overdue_tasks(users):
  '''
    Получение информации о просроченных задачах менеджеров.
    managers - список менеджеров, задачи по которым необходимо получить
  '''
  result = []
  # condition = {'closed':'no'}
  # condition = {'condition': {'$ne':dirmodel.OrderConditions['REFUSE']}}

  condition = {}
  condition1 = {}
  if users and len(users)>0:
    condition['tasks.manager'] = {'$in':users}
    condition1 = {'status':'', 'manager': {'$in':users}}
  else:
    users = []
    condition1 = {'status':''}

  dataResult =db.orders.aggregate([
    {"$match":condition},
    {"$unwind": "$tasks"},
    {"$project":{
      "order_id":"$_id",
      "number":"$number",
      "order_number":"$number",
      "client":"$client",
      "client_id":"$client_id",
      "closed":"$closed",
      "manager":"$manager",
      "comment":"$tasks.comment",
      "status":"$tasks.status",
      "task_id":"$tasks._id",
      "date_add":"$tasks.datetime",
      "datetime":"$tasks.closedatetime",
      "condition":"$tasks.condition",
      }
    },
    {"$match":condition1},
    {"$sort":{"manager": 1, "closedatetime":1}}
  ])

  if(dataResult):
    # curDate = datetime.utcnow()
    curDate = routine.dateUtcToMoscow(datetime.utcnow())

    for row in dataResult:
      # только просроченые задачи
      try:
        row['datetime'] =datetime.combine(datetime.strptime(row['datetime'],'%d.%m.%Y'), time.max)
        row['type'] = 'task_overdue'
        if(curDate>row['datetime']):
          result.append(row)
          #добавляем в историю ошибок ordermodel.add_to_err_history
          add_to_err_history(row['order_id'], row['type'], row['manager'], {'task_id':row['task_id']})
      except Exception, e:
        print('-------Error get_overdue_tasks: {0}'.format(str(e)))
        pass
  return result


def get_empty_finish_date_tasks(users=None):
  '''
    #1466. Ошибка CRM: вероятность выше 50% и нет даты закрытия
  '''
  result = []
  condition = {'closed':'no', 'cur_chance':{'$gt':50}, 'close_date': None, 'condition_type': {'$ne':'закрывающее'}}
  if users and len(users)>0:
    condition['manager'] = {'$in':users}

  dataResult =get_list(condition, {
    '_id':1,
    'number':1,
    'datetime':1,
    'client':1,
    'client_id': 1,
    'manager':1,
    'error_history':1,
    'closed':1,
    'condition_type':1
  })

  for row in dataResult:
    row['order_id'] = row['_id']
    row['order_number'] = row['number']
    row['type'] = 'empty_finish_date'
    curDate = routine.dateUtcToMoscow(datetime.utcnow())
    try:
      result.append(row)
      #добавляем в историю ошибок ordermodel.add_to_err_history
      add_to_err_history(row['order_id'], row['type'], row['manager'])
    except Exception, e:
      print('-------Error get_empty_finish_date_tasks: {0}'.format(str(e)))
      pass
  return result

def add_to_err_history(order_id, error_type, manager_email, additional = None):
  '''
    Добавить элемент в историю ошибок для заявки
  '''
  #from libraries import userlib
  try:
    order = db.orders.find_one({'_id':order_id}, {'error_history':1})
    if order:
      order['error_history'] = order.get('error_history',[])

      # если просрочка задачи, то проверить, нет ли для этой задачи уже поля в истории
      if error_type=="task_overdue" and additional and additional.get('task_id'):
        is_find  = False
        for h in order['error_history']:
          if h['type']=='task_overdue' and h.get('additional',{}).get('task_id',None)==additional.get('task_id'):
            is_find = True
            break
        if is_find:
          return
      elif error_type =='empty_finish_date':
        is_find  = False
        for h in order['error_history']:
          if h['type']=='empty_finish_date' and h.get('enabled',False):
            is_find = True
            break
        if is_find:
          return

      order['error_history'].append({'_id':bson.objectid.ObjectId(), 'type':error_type, 'additional':additional, 'notice_list':[], 'open_manager':manager_email, 'open_date': datetime.utcnow(), 'enabled':True})

      del order['_id']
      db.orders.update({'_id': order_id},{'$set':order})

  except Exception, exc:
    print(str(exc))

def get_today_tasks(users):
  '''
    Получение информации о сегодняшних задачах менеджеров.
    managers - список менеджеров, задачи по которым необходимо получить
  '''
  result = []
  condition = {'closed':'no'}

  if users and len(users)>0:
    condition['tasks.manager'] = {'$in':users}
    condition1 = {'status':'', 'manager': {'$in':users} }
  else:
    users = []
    condition1 = {'status':''}

  dataResult =db.orders.aggregate([
    {"$match":condition},
    {"$unwind": "$tasks"},
    {"$project":{
      "order_id":"$_id",
      "order_number":"$number",
      "client":"$client",
      "client_id":"$client_id",
      "closed":"$closed",
      "manager":"$manager",
      "comment":"$tasks.comment",
      "status":"$tasks.status",
      "date_add":"$tasks.datetime",
      "datetime":"$tasks.closedatetime",
      "condition":"$tasks.condition",
      }
    },
    {"$match":condition1},
    {"$sort":{"manager": 1, "closedatetime":1}}
  ])

  if(dataResult):
    curDate = datetime.utcnow().strftime('%d.%m.%Y')
    for row in dataResult:
      # только просроченые задачи
      try:
        row['type'] = 'task_today'
        if(row['datetime'] == curDate):
          result.append(row)
      except Exception, e:
        pass
  return result


def do_aggregate(conditions_arr):
  '''
  Универсальная функция выполнения aggregate
  '''
  try:
    dataResult = db.orders.aggregate(conditions_arr)
    return dataResult
  except pymongo.errors.PyMongoError as e:
    raise Exception("Error! Can't get orders: %s" %(str(e)))

def get_list(args, fields):
  '''
    Список по условию
  '''
  try:
    return [d for d in db.orders.find(args, fields).sort('number')]
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))

def close_err_history(order_id, error_type, manager_email, additional=None):
  '''
    Закрыть ошибку в истории ошибок
  '''
  from libraries import userlib
  try:
    order = db.orders.find_one({'_id':order_id}, {'error_history':1})
    if order:
      order['error_history'] = order.get('error_history',[])
      for h in order['error_history']:
        if h['type']==error_type and (error_type!='task_overdue' or h.get('additional',{}).get('task_id')==additional.get('task_id')) and h['enabled']==True:
          h['enabled'] = False
          h['finished_manager'] = manager_email
          h['finished_date'] = datetime.utcnow()
      del order['_id']
      db.orders.update({'_id': order_id},{'$set':order})
  except Exception, exc:
    print(str(exc))

def add_send_email_to_error_history(order_id, error_type, additional=None):
  '''
    Добавить информацию об отправке email-а об ошибке (фиксируется время отправки)
  '''
  #from libraries import userlib
  try:
    order = db.orders.find_one({'_id':order_id}, {'error_history':1})
    if order:
      order['error_history'] = order.get('error_history',[])
      for h in order['error_history']:
        if h['type']==error_type and (error_type!='task_overdue' or h.get('additional',{}).get('task_id')==additional.get('task_id')) and h['enabled']==True:
          h['notice_list'] = h.get('notice_list',[])
          h['notice_list'].append(datetime.utcnow())
      del order['_id']
      db.orders.update({'_id': order_id},{'$set':order})
  except Exception, exc:
    print(str(exc))

def get_active_managers():
  '''
    получить список менеджеров, у которых есть незакрытые заявки
  '''
  dtlist = db.orders.aggregate([
    {'$match':{'condition_type':{'$ne':u'закрывающее'}}},
    {'$group':{'_id':'$manager'}}
    ])
  return [x['_id'] for x in dtlist]

def get_order_by_clients(cond):
  '''
    получить заявки сгруппированные по клиентам
  '''
  odb = db.orders
  res = {}
  for o in odb.aggregate([
      {"$match": cond},
      #{"$project": {"client": "$client_id", "_id":0}},
      {"$group": {"_id" : "$client_id", "orders":{'$push': '$_id'} } }
    ]):
    res[o.get('_id')] = o.get('orders')
  return res

def update_orders_activity(orders = None):
  '''
    Подсчет и обновление активности по указанным заявкам
    orders - array of orders numbers to update
  '''
  try:
    condition = {}

    if orders and len(orders) > 0:
      condition['number'] = {'$in': [int(order_id) for order_id in orders]}

    dataResult = get_list(condition, {'_id': 1, 'number': 1, 'history': 1})

    for row in dataResult:
      activity = 0
      activity_significant = 0
      activity_percent = 0
      if row.get('history') and len(row['history']) > 0:
        row['history'].sort(key = lambda x: (routine.strToDateTime( x['datetime'])))
        activity = len(row['history'])

        last_chance = 0
        if row['history'] and len(row['history']) > 0:
          last_chance = row['history'][0].get('chance', 0)

        for h_row in row['history']:
          if h_row.get('chance',0) > last_chance:
            activity_significant += 1
            if activity > 0:
              activity_percent = round(float(activity_significant) / float(activity) * 100, 0)
            else:
              activity_percent = 0
          last_chance = h_row.get('chance',0)

      # update order
      upd(row['_id'], {
        'activity': activity,
        'activity_significant': activity_significant,
        'activity_percent': activity_percent
      })
  except Exception, exc:
    print('Error! Get CRM update_order_activity ' + str(exc))
    print_exc()
    raise Exception(str(exc))
