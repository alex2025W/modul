#!/usr/bin/python
# -*- coding: utf-8 -*-
import traceback
from bottle import get, put, post, request, response, redirect, static_file, template
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from dateutil.parser import parse
import time
from models import sectormodel, usermodel, noticemodel, workordermodel, contractmodel
from config import db
from routine import JSONEncoder
import routine
from bson.objectid import ObjectId
import json
import config
from traceback import print_exc

from libraries import userlib
from helpers import mailer

need_login_error = { "error": "Пожалуйста, <a href='/login'>авторизируйтесь</a>" };

@get('/timeline')
def timeline_redirect_to_root():
  redirect('/timeline/', 301)

@get('/timeline/editor')
def timeline_editor_redirect_to_root():
  redirect('/timeline/editor/', 301)

@get('/timeline/api/get_data')
def api_get_data():
  import gzip
  import StringIO
  response.headers['Access-Control-Allow-Origin'] = '*'
  response.content_type = "application/json; charset=UTF-8"

  # get params from request
  contract_numbers = []
  params = request.query.decode()
  if params and params.get('contracts'):
    contract_numbers = [routine.strToInt(number) for number in  params['contracts'].split(',')]

  start = time.clock()
  try:
    json_contents = build_json(contract_numbers)
  except:
    response.status = 500
    json_contents = '{"error": %s}' % json.dumps(traceback.format_exc())
  if request.query.callback:
    json_contents = request.query.callback + "(" + json_contents + ")"
  print "Time get timeline is: ", time.clock() - start

  # ZIP data
  start = time.clock()
  # сжатие данных gzip-ом
  response.add_header("Content-Encoding", "gzip")
  s = StringIO.StringIO()
  with gzip.GzipFile(fileobj=s, mode='w') as f:
    f.write(json_contents)
  print "Time zip timeline is: ", time.clock() - start

  start = time.clock()
  res = s.getvalue()
  print "Time get zipped timeline data is: ", time.clock() - start
  return res

@get('/timeline/api/get_user_id')
def api_get_user_id():
  response.headers['Access-Control-Allow-Origin'] = '*'
  response.content_type = "application/json; charset=UTF-8"
  usr = userlib.get_cur_user()
  if (not usr):
    response.status = 500;
    return need_login_error
  user_id = usr['email']
  return '"' + user_id + '"'

@get('/timeline/api/check_auth')
def api_check_auth():
  usr = userlib.get_cur_user()
  if (not usr):
    redirect("/login")
  return """
    <div style="margin: 2em auto; text-align: center">
      <h2>Авторизация прошла успешно</h2>
      Попробуйте ещё раз открыть график производства.
    </div>
  """

"""
  Возвращает спиок групп материалов связанных с указанной работой
"""
@get('/timeline/api/get_materials_by_work/<sector_code:int>/<work_code:int>')
def api_get_materials_by_work(sector_code, work_code):
  response.headers['Access-Control-Allow-Origin'] = '*'
  response.content_type = "application/json; charset=UTF-8"

  try:
    material_groups = []
    works = db.m_sector.find_one({"code": sector_code, "works.code": work_code}, {"_id": 0, "works.$": 1})
    if works:
      material_ids = works['works'][0].get('materials', [])
      material_groups_raw = db.m_materialsgroup.find({"materials._id": {"$in": material_ids}})
      for material_group in material_groups_raw:
        material_groups.append({
          "name": material_group['name'],
          })
    json_contents = JSONEncoder().encode(
      material_groups
      )
  except:
    response.status = 500
    json_contents = '{"error": %s}' % json.dumps(traceback.format_exc())

  return json_contents


"""
  Возвращает спиок групп материалов выбранных для заданного наряда
"""
@get('/timeline/api/get_materials_by_workorder/<workorder_number:int>')
def api_get_materials_by_work(workorder_number):
  response.headers['Access-Control-Allow-Origin'] = '*'
  response.content_type = "application/json; charset=UTF-8"

  try:
    workorder_details = db.m_workorder.find_one({"number": workorder_number}, {"_id": 0, "production_id": 1, "sector_id": 1})
    material_groups = []
    if workorder_details:
      material_ids = db.m_calculation.find_one(
          {"production_id": workorder_details["production_id"], "sector_id": workorder_details["sector_id"]},
          {"_id": 0, "materials.materials_id": 1, "materials.materials_group_id": 1})
      if material_ids:
        group_ids = list(set([material["materials_group_id"] for material in material_ids["materials"]]))
        # TODO: also make unique list of material_ids here

        material_groups_raw = db.m_materialsgroup.find({"_id": {"$in": group_ids}})
        for material_group in material_groups_raw:
          material_groups.append({
            "name": material_group['name'],
            })
    json_contents = JSONEncoder().encode(
      material_groups
      )
  except:
    response.status = 500
    json_contents = '{"error": %s}' % json.dumps(traceback.format_exc())

  return json_contents


###### CELLS ########
"""
  Возвращает список всех ячеек с комментариями
"""
@get('/timeline/api/cells')
def api_cells_get():
  import gzip
  import StringIO
  response.content_type = "application/json; charset=UTF-8"
  start = time.clock()
  cells = [cell for cell in db.tl_cells.find()]
  json_contents = JSONEncoder().encode(cells)
  print "Time get timeline cells is: ", time.clock() - start

  # ZIP data
  start = time.clock()
  # сжатие данных gzip-ом
  response.add_header("Content-Encoding", "gzip")
  s = StringIO.StringIO()
  with gzip.GzipFile(fileobj=s, mode='w') as f:
    f.write(json_contents)
  print "Time zip timeline cells is: ", time.clock() - start
  return s.getvalue()

  #return json_contents


"""
  Сохраняет данные в ячейке с комментариями
"""
@put('/timeline/api/cells')
def api_cells_create():
  def makeMailBody(cell,operation):
    usr = userlib.get_cur_user()
    mail_body = ''
    new_comment = cell["comments"][-1]
    if operation=='requestplan':
      mail_body+='<br/>Запрос на подтверждение планов от {0}'.format(usr.get('fio',''))
    elif operation=="confirmplan":
      mail_body += '<br/>Подтверждение планов от {0}'.format(usr.get('fio',''))
    if new_comment.get('comment'):
      mail_body += '<br/>{0}<br/>{1} ({2})'.format(new_comment['comment'].replace('\r\n', '<br/>').replace('\n', '<br/>') ,usr.get('fio',''), new_comment['user'])
    if operation=='requestplan':
      mail_body+='<br/><br/><a href="{0}" >Подтвердить планы</a>'.format(config.site_url+'/timeline/confirmplan?cid='+cell["_id"])
      mail_body+='<br/><br/><a href="{0}" >Подтвердить на графике</a>'.format(config.site_url+'/timeline/#confirmplan='+cell["_id"])
    mail_body+='<br/><br/>Ссылка на комментарий: <a href="{0}" >{1}</a>'.format(config.site_url+'/timeline/#open_comment='+cell["_id"], config.site_url+'/timeline/#open_comment='+cell["_id"])
    return mail_body


  response.content_type = "application/json; charset=UTF-8"
  cell = request.json
  cell["date"] = parse(cell["date"])


  new_comment = cell["comments"][-1]
  new_comment["created_at"] = datetime.now()
  operation = 'requestplan' if new_comment.get('type')=='requestplan' else 'confirmplan' if new_comment.get('type')=='confirmplan' else 'new_comment'

  db_cell = db.tl_cells.find_one({"_id": cell["_id"]}, {"_id": 1,'comments':1})

  if not db_cell:
    # create
    cell = db.tl_cells.find_and_modify({"_id": cell["_id"]}, update=cell, upsert=True, new=True)
  else:
    # нельзя послать дважды запрос на подтверждение и подтвердить планы
    if operation=='requestplan' or operation=='confirmplan':
      has_plan = [x for x in db_cell.get('comments',[]) if x.get('type')==operation]
      if has_plan:
        return JSONEncoder().encode(db_cell)
    cell = db.tl_cells.find_and_modify(
        {"_id": cell["_id"]},
        update = { "$push": { "comments": new_comment } },
        new=True
        )

  # Отправка комента на почту всем пользователям, добавленным в рассылку
  # Заказ: 1055.1.1
  # Направление: Монтаж
  # Дата: 07.03.2018
  # Участок: [101] Подготовительные работы
  # Наряд: 3951
  # Работа: [10] Назначить ответственного за монтаж
  # Текст: Ответственный за строительство данного проекта мною назначен производитель работ:
  # разбор строки нода
  mail_body = ""

  params = cell['node_id'].split('/')
  contract_number = params[1] if len(params) > 1 else None
  order_number = params[2] if len(params) > 2 else None
  sector_type = params[3] if len(params) > 3 else None
  workorder_number = params[4] if len(params) > 4 else None
  work_code = params[5] if len(params) > 5 else None
  # формирование текста письма
  if order_number:
    mail_body += 'Заказ: {0}<br/>'.format(order_number)
  if sector_type:
    mail_body += 'Направление: {0}<br/>'.format(sector_type)

  # дата события
  mail_body += 'Дата: ' + datetime.now().strftime('%d.%m.%Y')

  sector_info = None
  if workorder_number:
    # получение информации о наряде
    workorder_data = workordermodel.get(
      {'number': int(workorder_number)},
      {'sector_id':1, 'sector_code':1})
    if workorder_data:
      workorder_info = list(workorder_data)[0]
      sector_id = workorder_info['sector_id']
      # получение информации об участке
      sector_info = get_sector(str(sector_id))
      if sector_info:
        mail_body += 'Участок: [{0}] {1}<br/>'.format(sector_info['code'], sector_info['name'])
        mail_body += 'Наряд: {0}<br/>'.format(workorder_number)
        # получение информации о работе
        if work_code:
          sector_data = sectormodel.get_by({'_id': sector_id,'works.code': int(work_code)},{'works.$':1})
          if len(sector_data)>0:
            if sector_data[0]['works'] and len(sector_data[0]['works'])>0:
              work_info = sector_data[0]['works'][0]
              mail_body += 'Работа: [{0}] {1}<br/>'.format(work_info['code'], work_info['name'])
  usr = userlib.get_cur_user()

  #-------------------------------------------------------------------------
  notice_users = usermodel.get_list(
    {
      'notice.key': noticemodel.notice_keys['timeline_comments']['key'],
      'stat': {'$ne':'disabled' }
    },
    {'email':1,'fio':1}
  )
   # добавение группы договора на оповещение
  contract_group_info = contractmodel.get_google_group_info(contract_number)
  if contract_group_info:
    notice_users.append({'email': contract_group_info['key'], 'fio': ''})
  else:
    notice_users.append({'email': config.contracts_report_recepient, 'fio': ''})
  #-------------------------------------------------------------------------
  mail_header = (cell['node_id'].replace('./'+contract_number+'/','') if order_number else (contract_number or ''))
  mail_header = mail_header.replace('/'+params[6],'') if len(params)>6 else mail_header
  # add sector info
  mail_header = mail_header.replace('/'+params[3], '/'+params[3]+'/'+sector_info['name']) if len(params)>3 and sector_info else mail_header
  mail_header = '[ГПР] '+ mail_header +(' - Комментарий' if operation=='new_comment' else (u' - Запрос на подтверждение планов' if operation=='requestplan' else u' - Подтверждение планов'))

  mail_body+=makeMailBody(cell, operation)
  mailer.send(mail_header, mail_body, notice_users, True,usr['email'])
  json_contents = JSONEncoder().encode(cell)
  return json_contents

"""
  Возвращает список посещений ячеек указанным юзером
"""
@get('/timeline/api/cells/visitors/<user>')
def api_cells_get_visits(user):
  response.content_type = "application/json; charset=UTF-8"
  visits = [visit for visit in db.tl_cell_visitors.find({"user": user}, {"_id":0})]
  json_contents = JSONEncoder().encode(visits)
  return json_contents


"""
  Сохраняет дату последнего просмотра комментариев в ячейке
"""
@put('/timeline/api/cells/visitors')
def api_cells_update_visit():
  response.content_type = "application/json; charset=UTF-8"
  visitor = request.json
  print visitor['seen_at']
  print parse(visitor['seen_at'])
  visitor = db.tl_cell_visitors.find_and_modify(
      {"cell_id": visitor["cell_id"], "user": visitor["user"]},
      update={"$set": {"seen_at": parse(visitor['seen_at'])}},
      upsert=True, new=True
    )
  json_contents = JSONEncoder().encode(visitor)
  return json_contents


"""
  Обновление флага need_notification (оповещение о начале плана)
"""
@post('/timeline/api/update_need_notification')
def update_need_notification():
  response.content_type = "application/json; charset=UTF-8"
  userlib.check_handler_access("timeline","w")
  try:
    usr = userlib.get_cur_user()
    client_data = request.json;
    if not client_data:
      return routine.JSONEncoder().encode({'status': 'error','msg':'Ошибка сохранения. Нет данных на сохранение.'})

    node_type = client_data['node_type']
    need_notification = client_data['need_notification']

    params = client_data['id'].split('/')
    contract_number = params[1] if len(params) > 1 else None
    order_number = params[2] if len(params) > 2 else None
    sector_type = params[3] if len(params) > 3 else None
    workorder_number = params[4] if len(params) > 4 else None
    work_code = params[5] if len(params) > 5 else None

    if node_type == 'work' or node_type == 'workorder':
      # получить данные по номеру наряда
      data = workordermodel.get_by({'number': int(workorder_number)},{'plan_work':1})
      all_works_need_notification = True
      if data:
        if work_code:
          for row_work in data.get('plan_work',[]):
            if str(row_work['code'])==work_code:
              row_work['need_notification'] = need_notification
              if not row_work['need_notification']:
                all_works_need_notification = False
        else:
          for row_work in data.get('plan_work',[]):
            row_work['need_notification'] = need_notification
          all_works_need_notification = need_notification

        workordermodel.update({'_id': data['_id']}, {'$set':{'need_notification': all_works_need_notification, 'plan_work': data.get('plan_work',[])}}, True)
    else:
      work_orders_to_update = client_data['work_orders']
      condition = {'number': {'$in':work_orders_to_update}}
      data = workordermodel.get(condition, {'plan_work':1})
      for row in data:
        for work_row in row.get('plan_work',[]):
          work_row['need_notification'] = need_notification
        workordermodel.update({'_id':row['_id']},{'$set':{'need_notification':need_notification, 'plan_work': row.get('plan_work',[]) }}, True )

    return routine.JSONEncoder().encode({'status': 'ok'})
  except Exception,exc:
    excType = exc.__class__.__name__
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})


###### SECTORS ########
"""
  Возвращает список участков цеха с датами завершения планируемых работ
"""
@get('/timeline/api/sectors')
def api_get_sectors():
  response.content_type = "application/json; charset=UTF-8"

  sectors = []
  for sector in db.m_sector.find({"type": "Цех"}, {"_id": 1, "name": 1}):
    sector_finish_date = None
    for workorder in db.m_workorder.find({
        "sector_id": sector["_id"],
        "date_finish_with_shift": {"$ne": None},
        "plan_work": { "$elemMatch": { "status": { "$ne": "completed" } } },
        },
        {"_id": 0, "date_finish_with_shift": 1}
      ):
      sector_finish_date = max(sector_finish_date or datetime.min, workorder["date_finish_with_shift"])
    sectors.append({
      "name": sector["name"],
      "finish_date": date_to_day_string(sector_finish_date),
      })

  json_contents = JSONEncoder().encode({"sectors": sectors})
  return json_contents

#----РЕЖИМ РЕДАКТИРОВАНИЯ------------------------------------------------------
# template
@get('/timeline/editor/')
def timeline_editor():
  userlib.check_page_access("timeline_editor","r")
  return template('timeline/index', mode='edit', all_users=userlib.get_crm_user_list(), version=config.VERSION)
# static files
@get('/timeline/editor/<filepath:path>')
def timeline_editor(filepath="index.tpl"):
  return static_file(filepath, root="timeline")

#----РЕЖИМ ПРОСМОТРА------------------------------------------------------
# template
@get('/timeline/')
def timeline():
  userlib.check_page_access("timeline","r")
  return template(
    'timeline/index',
    mode='view',
    all_users=userlib.get_crm_user_list(),
    contracts='',
    version=config.VERSION
  )

@get('/timeline/<contracts>')
def timeline(contracts):
  userlib.check_page_access("timeline","r")
  return template(
    'timeline/index',
    mode = 'view',
    all_users = userlib.get_crm_user_list(),
    contracts = contracts,
    version=config.VERSION
  )

# static files
@get('/timeline/<filepath:path>')
def timeline(filepath="index.tpl"):
  return static_file(filepath, root="timeline")

def build_json(contract_numbers = []):
  # local function for need notification checking
  def check_on_notify_events(data):
    for node in data.get('nodes',[]):
      if node["node_type"] == "workorder":
        # check all workorder works on notify flag
        need_notification = True
        for work in node.get('nodes'):
          if not work.get('need_notification'):
            need_notification = False
            break
        node['need_notification'] = need_notification
      else:
        check_on_notify_events(node)
    need_notification = True
    for node in data.get('nodes',[]):
      if not node.get('need_notification'):
          need_notification = False
          break
    data['need_notification'] = need_notification
  res = []

  #------NEW realization------------------------------------------------------------
  contracts = []
  dop_agreements_grouped_by_contract = {}

  conditions = {
    'factory': u'Калуга',
    #'is_signed': 'yes',
    '$or': [{'is_signed': 'yes'},{'timeline_visible':True}],
    '$and':[
      # only main contracts
      {'$or': [{'parent_id': {'$exists': False }},{'parent_id':None},{'parent_id': ''}]},
      # filter out old contracts
      {'$or': [{ 'status': { '$ne': 'completed' } },  { 'status_date': { '$gt': datetime.now() - timedelta(days=60) } }]},
      # not canceled
      {'$or': [{'is_canceled': {'$exists': False }},{'is_canceled':None},{'is_canceled': False}]},
    ]
  }

  if contract_numbers and len(contract_numbers)>0:
    conditions['number'] = {'$in': contract_numbers}

  contract_ids = []
  # получить основные договоры
  for row in db.m_contract.find(conditions, {
      '_id': 1,
      'number': 1,
      'client_name': 1,
      'sign_date': 1,
      'productions': 1,
      'payment_uses': 1,
      'parent_id':1
      }):
    contracts.append(row)
    contract_ids.append(row['_id'])

  # получить доп. соглашения
  for row in db.m_contract.find({
    'factory': u'Калуга',
    '$or': [{'is_signed': 'yes'},{'timeline_visible':True}],
    '$and':[
      # only main contracts
      #{'$and': [{'parent_id': {'$exists': True }},{'parent_id': {'$ne':None}},{'parent_id': {'$ne':''}}]},
      #
      {'parent_id': {'$in': contract_ids}},
      # filter out old contracts
      {'$or': [{ 'status': { '$ne': 'completed' } },  { 'status_date': { '$gt': datetime.now() - timedelta(days=60) } }]}
    ]
    }, {
      '_id': 1,
      'number': 1,
      'client_name': 1,
      'sign_date': 1,
      'productions': 1,
      'payment_uses': 1,
      'parent_id':1
      }):

    if str(row['parent_id']) not in dop_agreements_grouped_by_contract:
      dop_agreements_grouped_by_contract[str(row['parent_id'])] = []
    dop_agreements_grouped_by_contract[str(row['parent_id'])].append(row)

  # смержить договора с доп. соглашениями
  for contract in contracts:
    if str(contract['_id']) in dop_agreements_grouped_by_contract:
      if not contract.get('productions'):
        contract['productions'] = []
      for dop_contract in dop_agreements_grouped_by_contract[str(contract['_id'])]:
        for product in dop_contract.get('productions'):
          contract['productions'].append(product)
  #------------------------------------------------------------------

  #----------OLD realization-------------------------
  # for row in db.m_contract.find({
  #   "factory": u"Калуга",
  #   "is_signed": "yes",
  #   # filter out old contracts
  #   "$or": [
  #     { "status": { "$ne": "completed" } },
  #     { "status_date": { "$gt": datetime.now() - timedelta(days=30) } }
  #   ]
  #   }, {
  #     "_id": 1,
  #     "number": 1,
  #     "client_name": 1,
  #     "sign_date": 1,
  #     "productions": 1,
  #     "payment_uses": 1
  #     }):
  #   contract = build_contract(row)
  #   res.append(contract)
  #------------------------------------------------------

  for row in contracts:
    contract = build_contract(row)
    res.append(contract)

  data = { "name": "Договоры", "nodes": [] }
  data["nodes"] = res

  # check all data on needing notify events
  check_on_notify_events(data)

  return json.dumps({
    "data": data,
    "sector_names": get_sector_names(),
    "works": sectormodel.get_all_only_works(),
    "weekends": get_weekends(),
    },
    # sort_keys=True,
    # indent=4,
    # separators=(',', ': '),
    cls=JSONEncoder)

def build_contract(raw_contract):
  contract = {
    "node_type": "contract",
    "name": raw_contract["number"],
    "client_name": raw_contract["client_name"],
    "sign_date": raw_contract.get("sign_date",None), # for sorting
    "done": raw_contract.get('status', None) == 'completed',
    "nodes": [],
    "settings": False,
    "have_different_settings": False
  }
  for production in raw_contract.get('productions', []):
    if production.get('status')!='del':
      for unit in production.get("units", []):
        order = build_order(raw_contract, production, unit)
        # iss_1051 [убрать с графика заказы с нулевыми движениями]
        if order and len(order["nodes"])>0:
          contract["nodes"].append(order)

  if contract["nodes"]:
    contract["troubleshooting"] = any(map(lambda n: n.get("troubleshooting", False), contract['nodes']))
    try:
      contract["settings"] = (row['settings'] for row in contract["nodes"] if row['settings']).next()
    except:
      pass
    contract["have_different_settings"] = any(row['have_different_settings'] for row in contract["nodes"])

  return contract

def build_order(raw_contract, production, unit):
  '''
    Выводим только заказы, достигшие статуса ready_for_develop
  '''
  ready_to_develop_status = next((status for status in unit.get('statuses', []) if status['status'] == 'ready_to_develop'), None)
  if not ready_to_develop_status: return None

  order = {
    "node_type": "order",
    "name": '.'.join([str(i['number']) for i in [raw_contract, production, unit]]),
    "done": False,
    "production_name": production["name"],
    "ready_date": ready_to_develop_status["date_change"],
    "nodes": build_work_types(raw_contract, production, unit),
    "settings": False,
    "have_different_settings": False
    }

  if order["nodes"]:
    order["done"] = reduce(lambda all_done, wt: all_done and wt["done"], order["nodes"], True)
    order["troubleshooting"] = any(map(lambda n: n.get("troubleshooting", False), order['nodes']))

    try:
      order["settings"] = (row['settings'] for row in order["nodes"] if row['settings']).next()
    except:
      pass

    order["have_different_settings"] = any(row['have_different_settings'] for row in order["nodes"])

  return order

def build_work_types(raw_contract, production, unit):
  work_types = {}

  # Показываем Цех только если товар оплачен
  # iss_1051 [Не показываем цех для нулевой продукции]
  # if unit.get('number')>0 and next((pu for pu in raw_contract.get('payment_uses', []) if pu["payment_use"]["name"] == u"Товар"), None):
  #   work_types[u"Цех"] = {
  #     "node_type": "work_type",
  #     "name": u"Цех",
  #     "__any_sector_routine": -2,
  #     "done": False,
  #     "nodes": []
  #     }

  # отключили эту фичу, т.к. монтаж можно проставить только на весь договор,
  # а внутри могут быть заказы без монтажа вообще.
  # 13.09.2014
  # """ Показываем Монтаж только если монтаж оплачен """
  # if next((pu for pu in raw_contract.get('payment_uses', []) if pu["payment_use"]["name"] == u"Монтаж"), None):
  #   work_types[u"Монтаж"] = {
  #     "node_type": "work_type",
  #     "name": u"Монтаж",
  #     "__any_sector_routine": -1,
  #     "done": False,
  #     "nodes": []
  #     }

  """ Остальные типы работ создаются в процессе формирования нарядов """
  build_workorders(work_types, raw_contract, production, unit)

  """ sort work_types by sector routine """
  return sorted(work_types.values(), key=lambda wt: wt.pop('__any_sector_routine'))

def build_workorders(work_types, raw_contract, production, unit):
  work_types_done = {}
  work_types_teamleads = {}
  work_types_troubleshooting = {}
  # month_ago = datetime.now() - timedelta(days=30)
  for raw_workorder in db.m_workorder.find({
      "contract_id": raw_contract["_id"],
      "production_id": production["_id"],
      "production_units.unit_id": unit["_id"],
    }, {
      "_id": 0,
      "number": 1,
      "sector_id": 1,
      "plan_work": 1,
      "remarks.contains_remark": 1,
      "use_weekends": 1,
      "need_notification": 1,
      "settings": 1
    }):
    sector = get_sector(raw_workorder["sector_id"])
    work_type_name = sector["type"]

    # Добавляем тип работ отличный от Цеха, если есть наряд с этим типом работ
    #if work_type_name != u"Цех" and work_type_name not in work_types:
    if work_type_name not in work_types:
      work_types[work_type_name] = {
        "node_type": "work_type",
        "name": work_type_name,
        "done": False,
        "nodes": [],
        "settings": False,
        "have_different_settings": False
        }

    workorder = build_workorder(raw_workorder, sector)
    # any routine from the sector is valid for ordering work-types
    work_types[work_type_name]["__any_sector_routine"] = sector["routine"]

    # calculate done status by workorder
    if work_type_name not in work_types_done:
      work_types_done[work_type_name] = True
    if not workorder["done"]:
      work_types_done[work_type_name] = False

    # accumulate teamleads from inner workorders
    work_types_teamleads[work_type_name] = work_types_teamleads.get(work_type_name, set()).union(workorder.get("teamleads", set()))

    # propogate troubleshooting status to the parent nodes
    if work_type_name not in work_types_troubleshooting:
      work_types_troubleshooting[work_type_name] = False
    if workorder["troubleshooting"]:
      work_types_troubleshooting[work_type_name] = True

    work_types[work_type_name]["nodes"].append(workorder)

  # update done status for work-types with workorders
  for work_type_name, is_done in work_types_done.iteritems():
    work_types[work_type_name]["done"] = is_done

  # update troubleshooting status for work-types with workorders
  for work_type_name, is_troubleshooting in work_types_troubleshooting.iteritems():
    work_types[work_type_name]["troubleshooting"] = is_troubleshooting

  # fill teamleads for the work-type
  for work_type_name, teamleads_set in work_types_teamleads.iteritems():
    work_types[work_type_name]["teamleads"] = sorted(teamleads_set)

  # sort workorders by sector routine
  for work_type in work_types.values():
    work_type["nodes"] = sorted(work_type["nodes"], lambda a,b: a["sector_routine"] - b["sector_routine"])

    try:
      work_type["settings"] = (row['settings'] for row in work_type["nodes"] if row['settings']).next()
    except:
      pass

    work_type["have_different_settings"] = any(row['have_different_settings'] for row in work_type["nodes"])

def build_workorder(raw_workorder, sector):
  workorder = {
    "node_type": "workorder",
    "name": raw_workorder["number"],
    "done": raw_workorder.get("status", None) == "completed",
    "sector_id": int(sector["code"]),
    "sector_name_id": get_sector_name_id(sector["name"]),
    "sector_routine": int(sector["routine"]),
    "troubleshooting": raw_workorder.get("remarks", {}).get('contains_remark', False),
    "nodes": [],
    "need_notification": raw_workorder.get("need_notification", False),
    "settings": None,
    "have_different_settings": False,
  }
  settings_keys = {}
  if raw_workorder.get('plan_work', None):
    workorder_brigade_ids = set()
    for raw_plan_work in raw_workorder["plan_work"]:
      if raw_plan_work.get("fact_work", None):
        """ collect brigade ids to calculate workorder teamleads """
        workorder_brigade_ids = workorder_brigade_ids.union(set(
          [fw['brigade_id'] for fw in raw_plan_work['fact_work'] if fw['brigade_id']]
          ))
      plan_work = build_plan_work(raw_plan_work, raw_workorder, sector)
      workorder["nodes"].append(plan_work)
      if plan_work.get('settings'):
        settings_keys[plan_work['settings']['group_key']] = plan_work['settings']['group_key']
        workorder['settings'] = plan_work['settings']

    # проверка  на наличие разных настроек для чайлдов наряда
    if len(settings_keys)>1:
      workorder["have_different_settings"] = True

    # сортировка работ по routine и имени
    workorder["nodes"].sort(key = lambda x:(x['routine'], x['name'] ))

    if workorder_brigade_ids:
      workorder["teamleads"] = get_teamleads(workorder_brigade_ids)

  return workorder

def build_plan_work(raw_plan_work, raw_workorder, sector):
  # поиск информации о работе в справочнике работ участка
  tmp_work = None
  try:
    tmp_work =  (i for i in sector.get('works',[]) if i['code'] ==raw_plan_work["code"]).next()
    # print('--')
    # print(tmp_work['routine'])
    # print('--')
  except:
    pass

  plan_work = {
    "node_type": "work",
    "name": raw_plan_work["code"],
    "done": raw_plan_work['status'] == "completed",
    "work_code": raw_plan_work["code"],
    "settings": raw_plan_work.get("settings"),
    "sector_id": int(sector["code"]),
    "scope": float(raw_plan_work["scope"]),
    "plan": None,
    "use_weekends": raw_plan_work.get("use_weekends", False),
    "need_notification": raw_plan_work.get("need_notification", False),
    "routine": tmp_work.get('routine',0) if tmp_work else 0,
    "no_need_facts": tmp_work.get('no_need_facts',False) if tmp_work else False,
    "use_contract_plan": raw_plan_work.get("use_contract_plan", False),
    "contract_plan":None,
    "contract_plan_use_weekends": raw_plan_work.get("contract_plan_use_weekends", False),
    "contract_plan_need_notification": raw_plan_work.get("contract_plan_need_notification", False),
    "contract_plan_no_need_facts": tmp_work.get('contract_plan_no_need_facts',False) if tmp_work else False
    }

  is_work_has_plan = raw_plan_work['date_start'] and raw_plan_work['date_finish']
  if is_work_has_plan:
    plan_work["plan"] = {
      "start": date_to_day_string(raw_plan_work["date_start_with_shift"]),
      "finish": date_to_day_string(raw_plan_work["date_finish_with_shift"]),
      }
    plan_work['plan_before_shift'] = {
      "start": date_to_day_string(raw_plan_work["date_start"]),
      "finish": date_to_day_string(raw_plan_work["date_finish"]),
    }

    # if plan shifts then shift dates and fill plan_shift list
    if raw_plan_work.get('plan_shifts', None):
      # plan_work['plan_shifts'] = []
      plan_work['plan_shifts'] = {}

      absolute_shift = { 'start': 0, 'finish': 0 }
      last_shift = { 'start': 0, 'finish': 0 }

      for raw_plan_shift in raw_plan_work['plan_shifts']:
        pst = raw_plan_shift['type']
        if pst == 'both':
          last_shift['start'] = absolute_shift['start']
          last_shift['finish'] = absolute_shift['finish']
          absolute_shift['start'] += raw_plan_shift['shift']
          absolute_shift['finish'] += raw_plan_shift['shift']
        elif pst == 'finish':
          last_shift['finish'] = absolute_shift['finish']
          absolute_shift['finish'] += raw_plan_shift['shift']
        else:
          last_shift['start'] = absolute_shift['start']
          absolute_shift['start'] += raw_plan_shift['shift']

        # plan_work['plan_shifts'].append({
        #   'shift': int(raw_plan_shift['shift']),
        #   'type': raw_plan_shift['type'],
        #   'reason': raw_plan_shift['reason'],
        #   'note': raw_plan_shift['note'],
        #   'reason_nodes': raw_plan_shift.get('reason_nodes', []),
        #   'date_change': raw_plan_shift['date_change'],
        #   'user_email': raw_plan_shift['user_email'],
        #   })

        # 1646
        # если за раз произошла смена и старта и финиша
        # то при выводе считаем что это был перенос со смещением сроков
        # выводим как одна корректировка
        if raw_plan_shift['date_change'] not in plan_work['plan_shifts']:
          plan_work['plan_shifts'][raw_plan_shift['date_change']] = {
            'shift': int(raw_plan_shift['shift']),
            'shift_finish': 0 if raw_plan_shift['type'] == 'start' else int(raw_plan_shift['shift']),
            'type': raw_plan_shift['type'],
            'reason': raw_plan_shift['reason'],
            'note': raw_plan_shift['note'],
            'reason_nodes': raw_plan_shift.get('reason_nodes', []),
            'date_change': raw_plan_shift['date_change'],
            'user_email': raw_plan_shift['user_email'],
          }
        elif raw_plan_shift['type'] == 'start':
          plan_work['plan_shifts'][raw_plan_shift['date_change']]['shift'] = int(raw_plan_shift['shift'])
          plan_work['plan_shifts'][raw_plan_shift['date_change']]['type'] = raw_plan_shift['type']
        elif raw_plan_shift['type'] == 'finish':
          plan_work['plan_shifts'][raw_plan_shift['date_change']]['shift_finish'] = int(raw_plan_shift['shift'])

      plan_work['plan_shifts'] = plan_work['plan_shifts'].values()

      plan_work['plan_before_last_shift'] = {
        'start': date_to_day_string(raw_plan_work['date_start'] + timedelta(days=last_shift['start'])),
        'finish': date_to_day_string(raw_plan_work['date_finish'] + timedelta(days=last_shift['finish'])),
      }


  is_work_has_contract_plan = raw_plan_work.get('contract_plan_date_start') and raw_plan_work.get('contract_plan_date_finish')
  if is_work_has_contract_plan:

    if raw_plan_work.get("use_contract_plan", False):
      plan_work['contract_plan'] = {
        "start": date_to_day_string(raw_plan_work.get("contract_plan_date_start_with_shift")),
        "finish": date_to_day_string(raw_plan_work.get("contract_plan_date_finish_with_shift"))
      }
      plan_work['contract_plan_plan_before_shift'] = {
        "start": date_to_day_string(raw_plan_work["contract_plan_date_start"]),
        "finish": date_to_day_string(raw_plan_work["contract_plan_date_finish"]),
      }

    # if plan shifts then shift dates and fill plan_shift list
    if raw_plan_work.get('contract_plan_plan_shifts', None):
      plan_work['contract_plan_plan_shifts'] = []
      absolute_shift = { 'start': 0, 'finish': 0 }
      last_shift = { 'start': 0, 'finish': 0 }
      for raw_plan_shift in raw_plan_work['contract_plan_plan_shifts']:
        pst = raw_plan_shift['type']
        if pst == 'both':
          last_shift['start'] = absolute_shift['start']
          last_shift['finish'] = absolute_shift['finish']
          absolute_shift['start'] += raw_plan_shift['shift']
          absolute_shift['finish'] += raw_plan_shift['shift']
        elif pst == 'finish':
          last_shift['finish'] = absolute_shift['finish']
          absolute_shift['finish'] += raw_plan_shift['shift']
        else:
          last_shift['start'] = absolute_shift['start']
          absolute_shift['start'] += raw_plan_shift['shift']

        plan_work['contract_plan_plan_shifts'].append({
          'shift': int(raw_plan_shift['shift']),
          'type': raw_plan_shift['type'],
          'reason': raw_plan_shift['reason'],
          'note': raw_plan_shift['note'],
          'reason_nodes': raw_plan_shift.get('reason_nodes', []),
          'date_change': raw_plan_shift['date_change'],
          'user_email': raw_plan_shift['user_email'],
          })


      plan_work['contract_plan_plan_before_last_shift'] = {
        'start': date_to_day_string(raw_plan_work['contract_plan_date_start'] + timedelta(days=last_shift['start'])),
        'finish': date_to_day_string(raw_plan_work['contract_plan_date_finish'] + timedelta(days=last_shift['finish'])),
      }

  """ fill fact works as nodes array """
  if raw_plan_work.get('fact_work', None):
    plan_work["nodes"] = [{
      "node_type": "fact_work",
      "name": str(fact_work["date_change"])[:-7], # 2014-09-22 09:55:34.123456 → 2014-09-22 09:55:34
      "fact": {
        "date": date_to_day_string(fact_work["date"]),
        "scope": fact_work["scope"]
        }
      } for fact_work in raw_plan_work['fact_work']]

  """ fill status_log array with statuses """
  if raw_plan_work.get('status_log', None):
    plan_work["status_log"] = sorted([{
      "status": str(status["status"]),
      "reason": str(status.get("reason", "")),
      "note": str(status.get("note", "")),
      "reason_nodes": status.get("reason_nodes", []),
      "date": date_to_day_string(status["date"]),
      "date_change": status["date_change"],
      "user_email" : status["user_email"]
      } for status in raw_plan_work['status_log']], key=lambda status: status['date'])

  """ get plan-publish-date from work history """
  if len(raw_plan_work.get('history', [])) > 0:
    set_plan_dates = [entry['date'] for entry in raw_plan_work['history'] if entry['type'] == "set_plan_dates"]
    if len(set_plan_dates):
      plan_work["plan_publish_date"] = date_to_day_string(set_plan_dates[0])

  return plan_work

_sectors = {}
def get_sector(sector_id):
  if sector_id not in _sectors:
    _sectors[sector_id] = db.m_sector.find_one({"_id": ObjectId(sector_id)},
        {"_id": 0, "type": 1, "routine": 1, "name": 1, "code_gaps": 1, "code": 1, 'works':1})
    if _sectors[sector_id].get('works'):
      _sectors[sector_id]['works'].sort(key=lambda x: (x['routine'], x['name']))
  return _sectors[sector_id]

_sector_names = {}
def get_sector_name_id(sector_name):
  if sector_name not in _sector_names:
    _sector_names[sector_name] = len(_sector_names)
  return _sector_names[sector_name]

def get_sector_names():
  return map(lambda a: a[0], sorted(_sector_names.items(), cmp=lambda a, b: a[1] - b[1]))

_teamleads = {}
def get_teamleads(brigade_id_set):
  query_ids = [brigade_id for brigade_id in brigade_id_set if brigade_id not in _teamleads]
  b_id_set = []
  if query_ids:
    for db_teamlead in db.m_brigade.find({"_id": {"$in": query_ids}}, {"_id": 1, "teamlead": 1}):
      _teamleads[db_teamlead["_id"]] = db_teamlead["teamlead"]
      b_id_set.append(db_teamlead["_id"])
  return sorted([_teamleads[brigade_id] for brigade_id in b_id_set])

def date_to_day_string(date):
  if date:
    return str(date)[:10]
  else:
    return None

def get_weekends():
  return (db.weekends.find_one({}, {'weekends': 1}) or {}).get("weekends", [])


# подтверждение планов (по ссылке из почты)
@get('/timeline/confirmplan')
def timeline_confirmplan():
  userlib.check_page_access("timeline","r")
  params = request.query.decode()

  db_cell = db.tl_cells.find_one({"_id":params.get('cid')})

  err_text = ""
  if not db_cell:
    err_text = "Запроса на подтверждение планов не найдено"
  else:
    # нельзя послать дважды запрос на подтверждение и подтвердить планы
      has_plan = [x for x in db_cell.get('comments',[]) if x.get('type')=='confirmplan']
      if has_plan:
        err_text = "Планы уже были подтверждены"
      params['date'] = db_cell.get('date')
      params['node_id'] = db_cell.get('node_id')
      params['comments'] = JSONEncoder().encode(db_cell.get('comments',[]))

  return template('timeline/views/confirmplan', current_user=userlib.get_cur_user(), version = config.VERSION, menu=userlib.get_menu(), params = params, err_text = err_text)
