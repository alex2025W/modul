#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import error, abort
import config
import json
import pymongo
import datetime, time
from bson.objectid import ObjectId
import calendar
import routine
db = config.db

def get_by(filter, fields=None):
  """ get workorder by filter """
  try:
    return db.m_workorder.find_one(filter, fields)
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))

def get_list_by(filter,fields=None):
  """ get list items by filter """
  try:
    res = []
    for cl in db.m_workorder.find(filter,fields):
      res.append(cl)
    return res
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))

def get(args, fields=None):
  """ get workorder by filter """
  try:
    res = []
    data = db.m_workorder.find(args, fields)
    for row in data:
      res.append(row)
    return res
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))

def get_sectors(args):
  try:
    wdb = db.m_sector
    data = wdb.find(args)
    return data
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))

def update_all(id, data):
  odb = db.m_workorder
  o_id = odb.update({'_id': id},data)

def update(cond, data, insert_if_notfound=True, multi_update=False):
  """ update workorder """
  try:
    db.m_workorder.update(cond, data, upsert=insert_if_notfound,multi=multi_update)
  except pymongo.errors.OperationFailure as e:
    raise Exception(str(e))
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))

def add(data):
  try:
    db.m_workorder.insert(data)
  except pymongo.errors.OperationFailure:
    abort(400, "Operation failure")
  except pymongo.errors.PyMongoError as e:
    abort(400, "server_error")
  return data

def get_list_by_page(args,page=1,page_size=50,fields=None):
  '''
    Получение списка объектов по указаной странице.
  '''
  data=[]
  try:
    cursor = db.m_workorder.find(args, fields).sort([
      ('contract_number', -1),
      ('production_number', 1),
      ('sector_code', 1)
    ]).skip(page_size*(page-1)).limit(page_size)
    for row in cursor:
      data.append(row)
    return data
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))

def get_count(cond):
  try:
    return db.m_workorder.find(cond).count()
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))

def  get_fact_work_stat(order_numbers):
  '''
    Get fact works statistic by order_numbers

    Returns:
    A dict with fatc works.
    Data grouped by: contract number, product number, product unit number
  '''
  import sectormodel, contractmodel
  import brigademodel

  order_numbers_arr = order_numbers.split(';') if order_numbers else None
  result = None
  try:
    dataResult = []
    # get data from calculation collection
    dataResultCursor = db.m_workorder.aggregate([
      {"$project":
        {
          "contract_id":1,
          "contract_number":1,
          "number":1,
          "sector_id":1,
          "sector_code":1,
          'production_id':1,
          'production_name':1,
          'production_number':1,
          "plan_work":1,
          "production_units":1,
          #"units_count":  { '$size': "$production_units" }
        }
      },
      # {"$match": {'contract_number': contract_number} if contract_number else {} },
      #{"$match": {'_id':ObjectId("53165c7dab9e8d000278d5fa")}},
      {"$unwind": "$production_units"},
      {"$project":
        {
          "contract_id":"$contract_id",
          "contract_number":"$contract_number",
          "sector_id":"$sector_id",
          "sector_code":"$sector_code",
          "number":"$number",
          "production_id":"$production_id",
          "production_name":"$production_name",
          "production_number":"$production_number",
          "production_unit_id": "$production_units.unit_id",
          "production_unit_number": "$production_units.unit_number",
          "plan_work":"$plan_work",
          "status_log":"$status_log",
          #"units_count": "$units_count"
          "order": {
            '$concat': [
              {"$substr":["$contract_number", 0, -1 ]},
              '.',
              {"$substr":["$production_number", 0, -1 ]},
              '.',
              {"$substr":["$production_units.unit_number", 0, -1 ]}
            ]
          }
        }
      },
      # {"$match": {'production_number': product_number} if product_number else {} },
      {"$match": {'order': {'$in': order_numbers_arr}} if order_numbers_arr else {} },
      {"$unwind": "$plan_work"},
      {"$project":
        {
          "contract_id":"$contract_id",
          "contract_number":"$contract_number",
          "number":"$number",
          "sector_id":"$sector_id",
          "sector_code":"$sector_code",
          "production_id":"$production_id",
          "production_name":"$production_name",
          "production_number":"$production_number",
          "production_unit_id": "$production_units.unit_id",
          "production_unit_number": "$production_unit_number",
          "plan_work_scope":"$plan_work.scope",
          "plan_work_status":"$plan_work.status",
          "plan_work_code":"$plan_work.code",
          "plan_work_id":"$plan_work.work_id",
          "plan_work_date_start":"$plan_work.date_start",
          "plan_work_date_finish":"$plan_work.date_finish",
          "fact_work":"$plan_work.fact_work",
          "order": 1,
          #"units_count": "$units_count"
        }
      },
      # {"$match": {'production_unit_number': unit_number} if unit_number else {} },
      {"$unwind": "$fact_work"},
      {"$project":
        {
          "contract_id":"$contract_id",
          "contract_number":"$contract_number",
          "number":"$number",
          "sector_id":"$sector_id",
          "sector_code":"$sector_code",
          "production_id":"$production_id",
          "production_name":"$production_name",
          "production_number":"$production_number",
          "production_unit_id": "$production_unit_id",
          "production_unit_number": "$production_unit_number",
          "plan_work_scope":"$plan_work_scope",
          "plan_work_status":"$plan_work_status",
          "plan_work_code":"$plan_work_code",
          "plan_work_id":"$plan_work_id",
          "plan_work_date_start":"$plan_work_date_start",
          "plan_work_date_finish":"$plan_work_date_finish",
          "fact_work_scope":"$fact_work.scope",
          "fact_work_brigade_id":"$fact_work.brigade_id",
          "fact_work_date":"$fact_work.date",
          "fact_work_weekend":"$fact_work.weekend",
          "order":1
          #"units_count": "$units_count"
        }
      },
      #{"$match": {$and: [{'fact_work_date': {$lt: new Date('May 07, 2014')}},{'fact_work_date': {$gt: new Date('May 05, 2014')}}]}},
      ])

    for cData in dataResultCursor:
      dataResult.append(cData)

    # get sectors list
    arrDataSectors = sectormodel.get_all_only_sectors()
    dataSectors = {}
    for row in arrDataSectors:
      dataSectors[str(row['_id'])] = row;

    # get works list
    dataWorks = sectormodel.get_all_works()

    # get brigade list
    arrDataBrigades = brigademodel.get_all()
    dataBrigades = {}
    for row in arrDataBrigades:
      dataBrigades[str(row['_id'])] = row;

    need_contracts_ids = []
    # collect data
    for cData in dataResult:
      if not cData['contract_id'] in need_contracts_ids:
        need_contracts_ids.append(cData['contract_id'])

      cData['work_name'] = ""
      cData['work_code'] = ""
      cData['work_unit'] = ""
      cData['work_price'] = 0
      cData['sector_name'] = ""
      cData['sector_code'] = ""
      cData['brigade_teamlead'] = ""
      cData['brigade_code'] = ""
      cData['brigade_teamlead'] = ""
      cData['fact_work_year'] = cData['fact_work_date'].year
      cData['fact_work_month'] = cData['fact_work_date'].month

      sector_id = str(cData['sector_id'])
      work_id = str(cData['plan_work_id'])
      brigade_id = str(cData['fact_work_brigade_id']) if cData.get('fact_work_brigade_id') else ''
      if sector_id in dataSectors:
        cData['sector_name'] = dataSectors[sector_id]['name']
        cData['sector_code'] = dataSectors[sector_id]['code']
      if work_id in dataWorks:
        cData['work_name'] = dataWorks[work_id]['name']
        cData['work_code'] = dataWorks[work_id]['code']
        cData['work_unit'] = dataWorks[work_id]['unit']
        cData['work_price'] = dataWorks[work_id]['price']

      if brigade_id in dataBrigades:
        cData['brigade_teamlead'] = dataBrigades[brigade_id]['teamlead']
        cData['brigade_code'] = dataBrigades[brigade_id]['code']

    # получение информации от ребуемых договорах
    contracts = contractmodel.get_list_by({'_id':{'$in':  need_contracts_ids}}, {'_id':1, 'productions': 1, 'number': 1})
    contracts_tmp = {}
    for contract in contracts:
      if contract.get('productions') and len(contract.get('productions'))>0:
        for product in contract['productions']:
          key = str(contract['_id']) + '_' + str(product['_id'])
          if not key in contracts_tmp:
            contracts_tmp[key] = len(product['units'])


    for cData in dataResult:
      key = str(cData['contract_id']) + '_' + str(cData['production_id'])
      cData['units_count'] = contracts_tmp.get(key, 1)


    return dataResult
  except pymongo.errors.PyMongoError as e:
    raise Exception("Can't get fact works statistic: %s" %(str(e)))

def  get_fact_work_stat1(sectors, year, months, teams):
  '''
    Сбор статистики по объемам выполненных работ с участием бригадиров

    Returns:
    A dict with fatc works.
    Data grouped by: contract number, product number, product unit number
  '''
  import sectormodel, contractmodel
  import brigademodel

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

  condition = {}

  #---смотреть только завершенные наряды--------
  condition['status'] = 'completed'
  condition['status_date'] = {'$gte': start_date, '$lte': finish_date}

  #condition['date_finish_with_shift'] = {'$gte': start_date}
  #condition['date_finish_with_shift'] = {'$lte': finish_date}
  if sectors and len(sectors)>0:
    condition['sector_code'] = {'$in':sectors}

  try:
    # get data from calculation collection
    dataResult = db.m_workorder.find(condition,None)

    # get sectors list
    arrDataSectors = sectormodel.get_all_only_sectors()
    dataSectors = {}
    for row in arrDataSectors:
      dataSectors[str(row['code'])] = row;

    # get brigade list
    arrDataBrigades = brigademodel.get_all()
    dataBrigades = {}
    for row in arrDataBrigades:
      dataBrigades[str(row['_id'])] = row;

    # if sectors and len(sectors)>0:
    #   for sector_code in sectors:
    #     result[sector_code] = {'data': [], 'sector': dataSectors.get(str(sector_code), None)}
    # else:
    #   for row in arrDataSectors:
    #     result[row['code']] = {'data': [], 'sector': row}

    if teams and len(teams)>0:
      for team_id in teams:
        result[team_id] = {'data': [], 'team': dataBrigades.get(str(team_id), None)}
    else:
      for row in arrDataBrigades:
        result[str(row['_id'])] = {'data': [], 'team': row}

    need_teams = len(teams)>0
    if dataResult and dataResult.count()>0:
      # get works list
      dataWorks = sectormodel.get_all_works()

      # Находим закрыте наряды на указанную дату
      # Наряд считается закрытым на указанную дату, если для каждой плановой работы
      # в логе статусов проставлен статус = "complete" и дата попадает в заданный диапазон

      tmpResult = []
      for row in dataResult:
        tmpResult.append(row)


      # кусок кода проверял наряд на завершенность. После доработок было введено поле отдельное для наряда, в котором фиксировался текущий статус наряда и дата этого статуса
      # # Отбираем все наряды удовлетворяющие заданным условиям
      # for row in dataResult:
      #   completedWorks = []
      #   if len(row['plan_work'])>0:
      #     for row_plan_work in row['plan_work']:
      #       if 'status_log' in row_plan_work and len(row_plan_work['status_log'])>0:
      #         for row_status_log in row_plan_work['status_log']:
      #           #if row_status_log['status']=='completed' and row_status_log['date']>=start_date and row_status_log['date']<=finish_date:
      #           if row_status_log['status']=='completed':
      #             completedWorks.append(row_plan_work)
      #             break

      #   if row['number']==3988:
      #     print('-----------')
      #     print(len(completedWorks))
      #     print(len(row['plan_work']))
      #     print('-----------')
      #   if len(completedWorks)>0 and len(completedWorks) == len(row['plan_work']):
      #     tmpResult.append(row)

      tmpResult1 = []
      for row in tmpResult:
        if len(row['production_units'])>0:
          sector_id = str(row['sector_id'])
          for row_production_units in row['production_units']:
            tmp_object = {
              "contract_id": row["contract_id"],
              "contract_number":row["contract_number"],
              "sector_id":row["sector_id"],
              "sector_code":row["sector_code"],
              "sector_name": dataSectors[sector_id]['name'] if sector_id in dataSectors else None,
              "number":row["number"],
              "production_id":row["production_id"],
              "production_name":row["production_name"],
              "production_number":row["production_number"],
              "production_unit_id": row_production_units["unit_id"],
              "production_unit_number": row_production_units["unit_number"],
              "plan_work":row["plan_work"],
              #"units_count": len(row['production_units'])
            }
            tmpResult1.append(tmp_object)
      tmpResult = []
      for row in tmpResult1:
        if len(row['plan_work'])>0:
          for row_plan_work in row['plan_work']:
            tmp_object = {
              "contract_id": row["contract_id"],
              "contract_number":row["contract_number"],
              "number":row["number"],
              "sector_id":row["sector_id"],
              "sector_code":row["sector_code"],
              "sector_name": row['sector_name'],
              "production_id":row["production_id"],
              "production_name":row["production_name"],
              "production_number":row["production_number"],
              "production_unit_id": row["production_unit_id"],
              "production_unit_number": row["production_unit_number"],
              "plan_work_scope":row_plan_work["scope"],
              "plan_work_status":row_plan_work["status"],
              "plan_work_code":row_plan_work["code"],
              "plan_work_id":row_plan_work["work_id"],
              "plan_work_date_start":row_plan_work["date_start"],
              "plan_work_date_finish":row_plan_work["date_finish"],
              "fact_work":row_plan_work.get('fact_work',[]),
              #"units_count": row["units_count"],
            }
            tmpResult.append(tmp_object)
      tmpResult1 = []
      for row in tmpResult:
        if len(row['fact_work'])>0:
          work_id = str(row['plan_work_id'])
          if work_id in dataWorks:
            row['work_name'] = dataWorks[work_id]['name']
            row['work_code'] = dataWorks[work_id]['code']
            row['work_unit'] = dataWorks[work_id]['unit']
            row['work_price'] = dataWorks[work_id]['price']

          for row_fact_work in row['fact_work']:
            brigade_id = str(row_fact_work['brigade_id']) if row_fact_work.get('brigade_id') else ''

            tmp_object = {
              "contract_id": row["contract_id"],
              "contract_number":row["contract_number"],
              "number":row["number"],
              "sector_id":row["sector_id"],
              "sector_code":row["sector_code"],
              "sector_name": row['sector_name'],
              "production_id":row["production_id"],
              "production_name":row["production_name"],
              "production_number":row["production_number"],
              "production_unit_id": row["production_unit_id"],
              "production_unit_number": row["production_unit_number"],
              "plan_work_scope":row["plan_work_scope"],
              "plan_work_status":row["plan_work_status"],
              "plan_work_code":row["plan_work_code"],
              "plan_work_id":row["plan_work_id"],
              "plan_work_date_start":row["plan_work_date_start"],
              "plan_work_date_finish":row["plan_work_date_finish"],
              "fact_work_scope":row_fact_work["scope"],
              "fact_work_brigade_id":str(row_fact_work["brigade_id"]) if row_fact_work.get('brigade_id') else '',
              "fact_work_date":row_fact_work["date"],
              "fact_work_weekend":row_fact_work["weekend"],
              "fact_work_year" : row_fact_work["date"].year,
              "fact_work_month" : row_fact_work["date"].month,
              "brigade_teamlead": dataBrigades[brigade_id]['teamlead'] if brigade_id in dataBrigades else None,
              "brigade_code": dataBrigades[brigade_id]['code'] if brigade_id in dataBrigades else None,
              "work_name": row.get('work_name', None),
              "work_code": row.get('work_code', None),
              "work_unit": row.get('work_unit', None),
              "work_price": row.get('work_price', None),
              #"units_count": row["units_count"],
            }

            # отсеевание лишних бригад
            if not need_teams  or tmp_object['fact_work_brigade_id'] in teams:
              tmpResult1.append(tmp_object)

      tmpResult1.sort(key = lambda x: (x['brigade_teamlead'], x['contract_number'],x['production_number'], x['production_unit_number'], x['number']))

      # # group data by sectors
      # for row in tmpResult1:
      #   if not row['sector_code'] in result:
      #     result[row['sector_code']] = {'data': [], 'sector': dataSectors.get(str(row['sector_id']), None)}
      #   result[row['sector_code']]['data'].append(row)

      need_contracts_ids = []
      # group data by brigades
      for row in tmpResult1:
        if not row['contract_id'] in need_contracts_ids:
          need_contracts_ids.append(row['contract_id'])

        if not row['fact_work_brigade_id'] in result:
          result[row['fact_work_brigade_id']] = {'data': [], 'team': dataBrigades.get(str(row['fact_work_brigade_id']), None)}
        result[row['fact_work_brigade_id']]['data'].append(row)

      # получение информации от ребуемых договорах
      contracts = contractmodel.get_list_by({'_id':{'$in':  need_contracts_ids}}, {'_id':1, 'productions': 1, 'number': 1})
      contracts_tmp = {}
      for contract in contracts:
        if contract.get('productions') and len(contract.get('productions'))>0:
          for product in contract['productions']:
            key = str(contract['_id']) + '_' + str(product['_id'])
            if not key in contracts_tmp:
              contracts_tmp[key] = len(product['units'])

      for row in tmpResult1:
        key = str(row['contract_id']) + '_' + str(row['production_id'])
        row['units_count'] = contracts_tmp.get(key, 0)



    return result
  except pymongo.errors.PyMongoError as e:
    raise Exception("Can't get fact works statistic: %s" %(str(e)))

def get_fact_work_stat2(sectors, year, months, include_not_completed=False):
  '''
    Сбор статистики по объемам выполненных работ с трудовым участием работников
    Returns:
    A dict with fatc works.
    Data grouped by: contract number, product number, product unit number

  '''
  import sectormodel
  import brigademodel
  import usermodel
  import contractmodel

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
  condition['$where'] = "this.workers_participation.length > 0"
  # добавление участков в условие
  if sectors and len(sectors)>0:
    condition['sector_code'] = {'$in':sectors}

  try:
    # get data from calculation collection
    dataResult = db.m_workorder.find(condition,None)

    # get sectors list
    arrDataSectors = sectormodel.get_all_only_sectors()
    dataSectors = {}
    for row in arrDataSectors:
      dataSectors[str(row['code'])] = row;

    # get brigade list
    arrDataBrigades = brigademodel.get_all()
    dataBrigades = {}
    for row in arrDataBrigades:
      dataBrigades[str(row['_id'])] = row;

    # список пользователей с ролью = рабочий
    # arrDataWorkers = brigademodel.get_all()
    # dataBrigades = {}
    # for row in arrDataBrigades:
    #   dataBrigades[str(row['_id'])] = row;

    arrDataWorkers = usermodel.get_list({'roles.role': str(usermodel.SYSTEM_ROLES['SYS_WORKER'])},None)
    dataWorkers = {}
    for row in arrDataWorkers:
      dataWorkers[str(row['_id'])] = row;

    if dataResult and dataResult.count()>0:
      # get works list
      dataWorks = sectormodel.get_all_works()
      tmpResult = []
      tmpWorkOrdersArr = {}
      for row in dataResult:
        tmpResult.append(row)
        tmpWorkOrdersArr[row['number']] = row


      # разбивка по единицам продукции
      tmpResult1 = []
      for row in tmpResult:
        if len(row['production_units'])>0:
          sector_id = str(row['sector_id'])
          for row_production_units in row['production_units']:
            tmp_object = {
              "contract_id": row["contract_id"],
              "contract_number":row["contract_number"],
              "sector_id":row["sector_id"],
              "status":row.get("status",''),
              "sector_code":row["sector_code"],
              "sector_name": dataSectors[str(row["sector_code"])]['name'] if str(row["sector_code"]) in dataSectors else None,
              "sector_type": dataSectors[str(row["sector_code"])]['type'] if str(row["sector_code"]) in dataSectors else None,
              "number":row["number"],
              "production_id":row["production_id"],
              "production_name":row["production_name"],
              "production_number":row["production_number"],
              "production_unit_id": row_production_units["unit_id"],
              "production_unit_number": row_production_units["unit_number"],
              "plan_work":row["plan_work"],
              'all_works_count': len(row.get('plan_work',[])),
              "workers": row["workers_participation"],
              #"units_count": len(row['production_units'])
            }
            tmpResult1.append(tmp_object)
      # разбивка по плановым работам
      tmpResult = []
      for row in tmpResult1:
        if len(row['plan_work'])>0:
          for row_plan_work in row['plan_work']:
            tmp_object = {
              "contract_id": row["contract_id"],
              "contract_number":row["contract_number"],
              "number":row["number"],
              "status":row["status"],
              "sector_id":row["sector_id"],
              "sector_code":row["sector_code"],
              "sector_name": row['sector_name'],
              "sector_type": row['sector_type'],
              "production_id":row["production_id"],
              "production_name":row["production_name"],
              "production_number":row["production_number"],
              "production_unit_id": row["production_unit_id"],
              "production_unit_number": row["production_unit_number"],
              "workers": row["workers"],
              "plan_work_scope":row_plan_work["scope"],
              "plan_work_status":row_plan_work["status"],
              "plan_work_code":row_plan_work["code"],
              "plan_work_id":row_plan_work["work_id"],
              "plan_work_date_start":row_plan_work["date_start"],
              "plan_work_date_finish":row_plan_work["date_finish"],
              "fact_work":row_plan_work.get('fact_work',[]),
              'all_works_count': row['all_works_count'],
              #"units_count": row["units_count"]
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
          work_id = str(row['plan_work_id'])
          if work_id in dataWorks:
            row['work_name'] = dataWorks[work_id]['name']
            row['work_code'] = dataWorks[work_id]['code']
            row['work_unit'] = dataWorks[work_id]['unit']
            row['work_price'] = dataWorks[work_id]['price']

          for row_fact_work in row['fact_work']:
            brigade_id = str(row_fact_work['brigade_id']) if row_fact_work.get('brigade_id') else ''
            tmp_object = {
              "contract_id": row["contract_id"],
              "contract_number":row["contract_number"],
              "number":row["number"],
              "status":row["status"],
              "sector_id":row["sector_id"],
              "sector_code":row["sector_code"],
              "sector_name": row['sector_name'],
              "sector_type": row['sector_type'],
              "production_id":row["production_id"],
              "production_name":row["production_name"],
              "production_number":row["production_number"],
              "production_unit_id": row["production_unit_id"],
              "production_unit_number": row["production_unit_number"],
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
              "fact_work_brigade_id":str(row_fact_work["brigade_id"]) if row_fact_work.get('brigade_id') else '',
              "fact_work_date":row_fact_work["date"],
              "fact_work_weekend":row_fact_work["weekend"],
              "fact_work_year" : row_fact_work["date"].year,
              "fact_work_month" : row_fact_work["date"].month,
              "brigade_teamlead": dataBrigades[brigade_id]['teamlead'] if brigade_id in dataBrigades else None,
              "brigade_code": dataBrigades[brigade_id]['code'] if brigade_id in dataBrigades else None,
              "work_name": row.get('work_name', None),
              "work_code": row.get('work_code', None),
              "work_unit": row.get('work_unit', None),
              "work_price": row.get('work_price', None),
              #"units_count": row["units_count"]
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
                  "contract_id": row["contract_id"],
                  "contract_number":row["contract_number"],
                  "number":row["number"],
                  "status":row["status"],
                  "sector_id":row["sector_id"],
                  "sector_code":row["sector_code"],
                  "sector_name": row['sector_name'],
                  "sector_type": row['sector_type'],
                  "production_id":row["production_id"],
                  "production_name":row["production_name"],
                  "production_number":row["production_number"],
                  "production_unit_id": row["production_unit_id"],
                  "production_unit_number": row["production_unit_number"],
                  "plan_work_scope":row["plan_work_scope"],
                  "plan_work_status":row["plan_work_status"],
                  "plan_work_code":row["plan_work_code"],
                  "plan_work_id":row["plan_work_id"],
                  "plan_work_date_start":row["plan_work_date_start"],
                  "plan_work_date_finish":row["plan_work_date_finish"],
                  'full_fact_scope': row['full_fact_scope'],
                  'all_works_count':row['all_works_count'],
                  "fact_work_scope":row["fact_work_scope"],
                  "fact_work_brigade_id":row["fact_work_brigade_id"],
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
                  "worker_code": dataWorkers.get(str(row_worker_item["user_id"]),{}).get('table','') if row_worker_item.get('user_id') else '',
                  "worker_id": str(row_worker_item["user_id"]) if row_worker_item.get('user_id') else '',
                  #"units_count": row["units_count"]
                }
                tmpResult.append(tmp_object)
      tmpResult.sort(key = lambda x: (x['worker_fio'], x['contract_number'],x['production_number'], x['production_unit_number'], x['number']))


      need_contracts_ids = []
      # group data by brigades
      for row in tmpResult:
        if not row['contract_id'] in need_contracts_ids:
          need_contracts_ids.append(row['contract_id'])

      # получение информации от ребуемых договорах
      contracts = contractmodel.get_list_by({'_id':{'$in':  need_contracts_ids}}, {'_id':1, 'productions': 1, 'number': 1})
      contracts_tmp = {}
      for contract in contracts:
        if contract.get('productions') and len(contract.get('productions'))>0:
          for product in contract['productions']:
            key = str(contract['_id']) + '_' + str(product['_id'])
            if not key in contracts_tmp:
              contracts_tmp[key] = len(product['units'])

      for row in tmpResult:
        key = str(row['contract_id']) + '_' + str(row['production_id'])
        row['units_count'] = contracts_tmp.get(key, 0)


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
  except pymongo.errors.PyMongoError as e:
    raise Exception("Can't get fact works statistic: %s" %(str(e)))

def  get_plan_work_stat(contract_numbers, product_numbers):
  """Get plan works statistic
  order_number = ['921.1','922.2']

  Returns:
  A dict with plan works.
  Data grouped by: contract number, product number, sector_code, work_code
  """

  result = None
  try:
    # get data from calculation collection
    dataResult = []
    dataResultCursor =  db.m_workorder.aggregate([
      {"$project":{
          "contract_id":1,
          "contract_number":1,
          "number":1,
          "sector_id":1,
          "sector_code":1,
          "production_id":1,
          "production_name":1,
          "production_number":1,
          "plan_work":1,
          "production_units":1,
          "blanks":1
        }
      },
      {"$match":{
          "contract_number":{"$in":contract_numbers},
          "production_number":{"$in":product_numbers},
          "blanks":{"$not": {"$size": 0}}
          #"has_blank": True
        }
      },
      {"$unwind": "$production_units"},
      {"$project":{
          "contract_id":"$contract_id",
          "contract_number":"$contract_number",
          "sector_id":"$sector_id",
          "sector_code":"$sector_code",
          "number":"$number",
          "production_id":"$production_id",
          "production_name":"$production_name",
          "production_number":"$production_number",
          "production_unit_id": "$production_units.unit_id",
          "production_unit_number": "$production_units.unit_number",
          "plan_work":"$plan_work",
        }
      },
      {"$unwind": "$plan_work"},
      {"$project":{
          "contract_id":"$contract_id",
          "contract_number":"$contract_number",
          "number":"$number",
          "sector_id":"$sector_id",
          "sector_code":"$sector_code",
          "product_id":"$production_id",
          "product_name":"$production_name",
          "product_number":"$production_number",
          "product_unit_id": "$production_units.unit_id",
          "product_unit_number": "$production_unit_number",
          "plan_work_scope":"$plan_work.scope",
          "plan_work_status":"$plan_work.status",
          "plan_work_code":"$plan_work.code",
          "plan_work_id":"$plan_work.work_id",
          "plan_work_date_start":"$plan_work.date_start",
          "plan_work_date_finish":"$plan_work.date_finish",
          "plan_shifts":"$plan_work.plan_shifts",
          "fact_work": "$plan_work.fact_work"
        }
      },
      {"$sort" : { "contract_number" : 1, "product_number": 1, "product_unit_number":1, "sector_code": 1,'plan_work_code':1 } },
    ])

    for row in dataResultCursor:
      dataResult.append(row)

    return dataResult
  except pymongo.errors.PyMongoError as e:
    raise Exception("Can't get plan works statistic: %s" %(str(e)))

def  get_only_sectors(contract_numbers, product_numbers):
  """Get work order numbers grouped by order_number and sector
  contract_numbers = [921,922]
  product_numbers = [1,1]
  Data grouped by: contract number, product number, sector_code
  """

  result = None
  try:
    match = {}
    match["contract_number"] = {"$in":contract_numbers}
    if len(product_numbers)>0:
      match["production_number"] = {"$in":product_numbers}

    # get data from calculation collection
    dataResult = []
    dataResultCursor =  db.m_workorder.aggregate([
      {"$project":{
          "contract_id":1,
          "contract_number":1,
          "number":1,
          "sector_id":1,
          "sector_code":1,
          "production_id":1,
          "production_name":1,
          "production_number":1,
          "blanks":1,
          "plan_work":1,
          "production_units":1
        }
      },
      # {"$match":{
      #     "contract_number":{"$in":contract_numbers},
      #     "production_number":{"$in":product_numbers}
      #     #"blanks":{"$not": {"$size": 0}}
      #   }
      # },
      {'$match': match},
      {"$unwind": "$production_units"},
      {"$project":{
          "contract_number":1,
          "number":1,
          "sector_code":1,
          "production_name":1,
          "production_number":1,
          "plan_work":1,
          "production_unit_id": "$production_units.unit_id",
          "production_unit_number": "$production_units.unit_number",
        }
      },
      {"$group":{
          "_id":{"contract_number":"$contract_number","production_unit_number":"$production_unit_number", "sector_code":"$sector_code","production_number":"$production_number", "production_name":"$production_name"},
          "numbers":{"$addToSet":"$number"},
          "plan_work":{"$addToSet":"$plan_work"}
        }
      },
      {"$project":{
          "_id":0,
          "contract_number":"$_id.contract_number",
          "production_unit_number":"$_id.production_unit_number",
          "sector_code":"$_id.sector_code",
          "production_number":"$_id.production_number",
          "production_name":"$_id.production_name",
          "plan_work":"$_id.plan_work",
          "plan_work":1,
          "numbers":1
        }
      },
      {"$sort" : { "contract_number" : 1, "product_number": 1, "production_unit_number":1, "sector_code": 1 } },
    ])

    for row in dataResultCursor:
      dataResult.append(row)

    return dataResult
  except pymongo.errors.PyMongoError as e:
    raise Exception("Can't get plan works statistic: %s" %(str(e)))

def  get_brief_stat(start_date, end_date):
  '''
    Get brief statistic information
  '''

  result = None
  try:
    # get data from calculation collection
    dataResult = []
    dataResultCursor =  db.m_workorder.aggregate([
      {"$project":{
          "contract_id":1,
          "contract_number":1,
          "number":1,
          "sector_id":1,
          "sector_code":1,
          "production_id":1,
          "production_name":1,
          "production_number":1,
          "plan_work":1,
          "production_units":1
        }
      },
      # {"$match":{
      #   'number':8753,
      # }},
      {"$unwind": "$production_units"},
      {"$project":{
          "contract_id":"$contract_id",
          "contract_number":"$contract_number",
          "sector_id":"$sector_id",
          "sector_code":"$sector_code",
          "number":"$number",
          "production_id":"$production_id",
          "production_name":"$production_name",
          "production_number":"$production_number",
          "production_unit_id": "$production_units.unit_id",
          "production_unit_number": "$production_units.unit_number",
          "plan_work":"$plan_work",
        }
      },
      {"$unwind": "$plan_work"},
      {"$project":{
          "contract_id":"$contract_id",
          "contract_number":"$contract_number",
          "number":"$number",
          "sector_id":"$sector_id",
          "sector_code":"$sector_code",
          "product_id":"$production_id",
          "product_name":"$production_name",
          "product_number":"$production_number",
          "product_unit_id": "$production_units.unit_id",
          "product_unit_number": "$production_unit_number",
          "plan_work_scope":"$plan_work.scope",
          "plan_work_status":"$plan_work.status",
          "plan_work_code":"$plan_work.code",
          "plan_work_id":"$plan_work.work_id",
          "plan_work_date_start":"$plan_work.date_start",
          "plan_work_date_finish":"$plan_work.date_finish",
          "plan_work_date_start_with_shift":"$plan_work.date_start_with_shift",
          "plan_work_date_finish_with_shift":"$plan_work.date_finish_with_shift",
          "plan_work_status_log":"$plan_work.status_log"
        }
      },
      {"$match":{
        'plan_work_date_start_with_shift':{"$lt": end_date},
        'plan_work_date_finish_with_shift':{"$gt": start_date}
        }
      },
      {"$sort" : {
        "contract_number" : 1,
        "product_number": 1,
        "product_unit_number":1,
        "number": 1,
        'plan_work_code':1,
        'plan_work_date_start_with_shift':1,
        'plan_work_date_finish_with_shift':1
        }
      },
    ])

    for row in dataResultCursor:
      dataResult.append(row)

    return dataResult
  except pymongo.errors.PyMongoError as e:
    raise Exception("Can't get brief statistic: %s" %(str(e)))

def  get_brief_errors(start_date):
  '''
    Get brief bad statistic information
  '''

  result = None
  try:
    # get data from calculation collection
    dataResult = []
    dataResultCursor =  db.m_workorder.aggregate([
      {"$project":{
          "contract_id":1,
          "contract_number":1,
          "number":1,
          "sector_id":1,
          "sector_code":1,
          "production_id":1,
          "production_name":1,
          "production_number":1,
          "plan_work":1,
          "production_units":1,
          "status":1,
          "status_date":1
        }
      },
      {"$match":{
        #'number':8753,
        '$or':[
          {'status':{ '$exists': False}},
          {'status':''},
          {'status': 'complete', 'status_date':{"$gt": start_date} },
        ]
      }},
      {"$unwind": "$production_units"},
      {"$project":{
          "contract_id":"$contract_id",
          "contract_number":"$contract_number",
          "sector_id":"$sector_id",
          "sector_code":"$sector_code",
          "number":"$number",
          "production_id":"$production_id",
          "production_name":"$production_name",
          "production_number":"$production_number",
          "production_unit_id": "$production_units.unit_id",
          "production_unit_number": "$production_units.unit_number",
          "plan_work":"$plan_work",
        }
      },
      {"$unwind": "$plan_work"},
      {"$project":{
          "contract_id":"$contract_id",
          "contract_number":"$contract_number",
          "number":"$number",
          "sector_id":"$sector_id",
          "sector_code":"$sector_code",
          "product_id":"$production_id",
          "product_name":"$production_name",
          "product_number":"$production_number",
          "product_unit_id": "$production_units.unit_id",
          "product_unit_number": "$production_unit_number",
          "plan_work_scope":"$plan_work.scope",
          "plan_work_status":"$plan_work.status",
          "plan_work_code":"$plan_work.code",
          "plan_work_id":"$plan_work.work_id",
          "plan_work_date_start":"$plan_work.date_start",
          "plan_work_date_finish":"$plan_work.date_finish",
          "plan_work_date_start_with_shift":"$plan_work.date_start_with_shift",
          "plan_work_date_finish_with_shift":"$plan_work.date_finish_with_shift",
          "plan_work_date_finish_with_shift_n":{'$add': ["$plan_work.date_finish_with_shift", 30*24*60*60*1000]},
          "fact_work":"$plan_work.fact_work",
          "status_log":"$plan_work.status_log"
        }
      },
      {"$match":{
          'plan_work_date_start_with_shift':{"$lte": start_date}
        }
      },
      {"$sort" : {
        "contract_number" : 1,
        "product_number": 1,
        "product_unit_number":1,
        "number": 1,
        'plan_work_code':1,
        'plan_work_date_start_with_shift':1,
        'plan_work_date_finish_with_shift':1
        }
      },
    ])

    for row in dataResultCursor:
      dataResult.append(row)

    return dataResult
  except pymongo.errors.PyMongoError as e:
    raise Exception("Can't get brief statistic: %s" %(str(e)))

def get_stats_production():
  ''' Статистика по фактам производства'''

  result = None
  try:
    # get data from calculation collection
    dataResult = []
    dataResultCursor = db.m_workorder.aggregate([
      {"$project":{
          "contract_id":1,
          "contract_number":1,
          "sector_id":1,
          "sector_code":1,
          "plan_work":1,
        }
      },
      #{"$match":{"contract_number":{"$in":[922,1024]}}},
      {"$unwind": "$plan_work"},
      {"$project":{
          "contract_id":1,
          "contract_number":1,
          "sector_id":1,
          "sector_code":1,
          "fact_work": "$plan_work.fact_work",
        }
      },
      {"$unwind": "$fact_work"},
      {"$project":{
        "contract_id":1,
        "contract_number":1,
        "sector_id":1,
        "sector_code":1,
        "fact_work_date": "$fact_work.date",
        }
      },
      {"$group":{
        "_id":{"contract_id":"$contract_id","contract_number":"$contract_number","sector_code":"$sector_code"},
        "dates":{"$addToSet":"$fact_work_date"}
        }
      },
      {"$project":{
          "_id":0,
          "contract_number":"$_id.contract_number",
          "contract_id":"$_id.contract_id",
          "sector_code":"$_id.sector_code",
          "dates":1
        }
      },
      {"$sort" : { "contract_number" : 1, "sector_code": 1 } },
    ])

    for row in dataResultCursor:
      dataResult.append(row)

    return dataResult
  except pymongo.errors.PyMongoError as e:
    raise Exception("Can't get brief statistic: %s" %(str(e)))

def get_stats_workorders():
  '''
  Статистика по нарядам
  '''
  try:
    # get data from calculation collection
    dataResult = []
    dataResultCursor = db.m_workorder.aggregate([
      {"$project":{
        "contract_id":1,
        "contract_number":1,
        "sector_id":1,
        "sector_code":1,
        "number":1,
        "production_number": 1,
        "production_id": 1,
        #"production_name": 1,
        "production_units.unit_number":1,
        "plan_work.scope":1,
        "plan_work.work_id":1,
        "date_start_with_shift":1,
        "date_finish_with_shift":1
        }
      },
      #{"$match":{"contract_number":{"$in":[1028]}}},
      {"$match":{"date_start_with_shift":{"$gt": datetime.datetime(2013,12,31,23,59,59)}}},
      {"$unwind": "$production_units"},
      {"$project":{
        "contract_id":1,
        "contract_number":1,
        "sector_id":1,
        "sector_code":1,
        "number":1,
        "production_number": 1,
        "production_id": 1,
        #"production_name": 1,
        "unit_number":"$production_units.unit_number",
        "plan_work.scope":1,
        "plan_work.work_id":1,
        "date_start_with_shift":1,
        "date_finish_with_shift":1
        }
      },
      {"$sort" : { "contract_number" : 1, "sector_code": 1, "number":1 } },
    ])

    for row in dataResultCursor:
      dataResult.append(row)
    return dataResult
  except pymongo.errors.PyMongoError as e:
    raise Exception("Error! Can't get workorder statistic: %s" %(str(e)))

def get_fact_work_stat3():
  '''
    для определения фактических затрат на человеческие ресурсы при проведении СМР нам нужно будет вытащить следующую информацию:
    номер заказа (от него тип здания и м2)
    количество людей на заказе
    количество дней на заказе

  '''
  import sectormodel
  import brigademodel
  import usermodel
  import contractmodel

  result = {}
  #смотреть только завершенные наряды
  condition = {}
  # ставим в условии получать только те наряды по которым есть трудовые расчеты
  condition['workers_participation'] = {'$exists': 1}
  condition['$where'] = "this.workers_participation.length > 0"
  try:
    result = {}
    # get data from calculation collection
    dataDB = db.m_workorder.find(condition,{
      'sector_id': 1,
      'sector_code':1,
      'production_number':1,
      'production_id':1,
      'production_units':1,
      'number':1,
      'contract_id': 1,
      'contract_number':1,
      'workers_participation':1,
      'status':1,
      'plan_work':1
    })

    if dataDB and dataDB.count()>0:
      data = []
      need_contracts_ids = {}

      for row in dataDB:
        need_contracts_ids[str(row['contract_id'])] = row['contract_id']
        data.append(row)

      # получение информации от ребуемых договорах
      contracts = contractmodel.get_list_by({'_id':{'$in':  need_contracts_ids.values()}}, {'_id':1, 'productions': 1, 'number': 1})
      contracts_tmp = {}
      for contract in contracts:
        if contract.get('productions') and len(contract.get('productions'))>0:
          for product in contract['productions']:
            key = str(contract['_id']) + '_' + str(product['_id'])
            contracts_tmp[key] = product

      for row in data:
        order_key = '{0}_{1}_{2}'.format(str(row['contract_number']), str(row['production_number']), str(row['production_units'][0]['unit_number']))
        production_key = '{0}_{1}'.format(str(row['contract_id']), str(row['production_id']))
        if not order_key in result:
          result[order_key] = {
            'production_unit_number': row['production_units'][0]['unit_number'],
            'production_number': row['production_number'],
            'contract_number': row['contract_number'],
            'contract_id': row['contract_id'],
            'production_name': contracts_tmp.get(production_key,{}).get('name','Не определено'),
            'workers': {},
            'fact_dates': {}
          }

        result_workers = result[order_key]['workers']
        result_fact_dates = result[order_key]['fact_dates']
        for wp_row in row['workers_participation']:
          if wp_row.get('status')=='active':
            date_key = wp_row['fact_date'].strftime('%d_%m_%Y')
            for worker_row in wp_row['workers']:
              if worker_row.get('user_id'):
                worker_key = str(worker_row['user_id'])
                if worker_key not in result_workers:
                  result_workers[worker_key] = {
                    'user_id': worker_row['user_id'],
                    'user_email': worker_row['user_email'],
                    'user_fio': worker_row['user_fio'],
                    'dates': {}
                  }
                result_workers[worker_key]['dates'][date_key] = wp_row['fact_date']

        if row.get('plan_work') and len(row['plan_work'])>0:
          for pw_row in row['plan_work']:
            if pw_row.get('fact_work') and len(pw_row.get('fact_work'))>0:
              for fw_row in pw_row.get('fact_work'):
                date_key = fw_row['date'].strftime('%d_%m_%Y')
                result_fact_dates[date_key] = fw_row['date']


    result = result.values()
    result.sort(key=lambda x: (x['contract_number'], x['production_number'], x['production_unit_number'] ))
    return result
  except pymongo.errors.PyMongoError as e:
    raise Exception("Can't get fact works statistic: %s" %(str(e)))

def get_fact_work_stat4():
  '''
    для определения фактических затрат на человеческие ресурсы при проведении СМР нам нужно будет вытащить следующую информацию:
    номер заказа (от него тип здания и м2)
    участок СМР
    количество людей на участке
    количество дней на участке каждого человека (из этих двух показателей нам нужно получить количество чел/дней на участке)

  '''
  import sectormodel
  import brigademodel
  import usermodel
  import contractmodel

  result = {}

  #смотреть только завершенные наряды
  condition = {}
  # if not include_not_completed:
  #   condition['status'] = 'completed'
  #   condition['status_date'] = {'$gte': start_date, '$lte': finish_date}
  # else:
  #   condition['plan_work.fact_work.date'] = {'$gte': start_date, '$lte': finish_date}

  # ставим в условии получать только те наряды по которым есть трудовые расчеты
  condition['workers_participation'] = {'$exists': 1}
  condition['$where'] = "this.workers_participation.length > 0"
  # # добавление участков в условие
  # if sectors and len(sectors)>0:
  #   condition['sector_code'] = {'$in':sectors}

  try:
    result = {}
    # список для хранения дубликатов по датам на разных участках. Когда один человек в один день работал на разных участках, в разных заказах, то
    # в результате он должен получить не полный день, а половину
    dublies_result = {}
    # get data from calculation collection
    dataDB = db.m_workorder.find(condition,{
      'sector_id': 1,
      'sector_code':1,
      'production_number':1,
      'production_id':1,
      'production_units':1,
      'number':1,
      'contract_id': 1,
      'contract_number':1,
      'workers_participation':1,
      'status':1,
      'plan_work':1
    })

    if dataDB and dataDB.count()>0:
      data = []
      need_contracts_ids = {}
      # get sectors list
      arrDataSectors = sectormodel.get_all_only_sectors()
      dataSectors = {}
      for row in arrDataSectors:
        dataSectors[str(row['_id'])] = row;

      for row in dataDB:
        need_contracts_ids[str(row['contract_id'])] = row['contract_id']
        data.append(row)

      # получение информации от ребуемых договорах
      contracts = contractmodel.get_list_by({'_id':{'$in':  need_contracts_ids.values()}}, {'_id':1, 'productions': 1, 'number': 1})
      contracts_tmp = {}
      for contract in contracts:
        if contract.get('productions') and len(contract.get('productions'))>0:
          for product in contract['productions']:
            key = str(contract['_id']) + '_' + str(product['_id'])
            contracts_tmp[key] = product

      for row in data:
        order_key = '{0}_{1}_{2}'.format(
          str(row['contract_number']),
          str(row['production_number']),
          str(row['production_units'][0]['unit_number'])
        )
        order_sector_key = '{0}_{1}_{2}_{3}'.format(
          str(row['contract_number']),
          str(row['production_number']),
          str(row['production_units'][0]['unit_number']),
          str(row['sector_id'])
        )
        production_key = '{0}_{1}'.format(str(row['contract_id']), str(row['production_id']))


        if not order_sector_key in result:
          result[order_sector_key] = {
            'production_unit_number': row['production_units'][0]['unit_number'],
            'production_number': row['production_number'],
            'contract_number': row['contract_number'],
            'contract_id': row['contract_id'],
            'production_name': contracts_tmp.get(production_key,{}).get('name','Не определено'),
            'sector_id': str(row['sector_id']),
            'sector_code': row['sector_code'],
            'sector_name': dataSectors[str(row['sector_id'])]['name'] if str(row['sector_id']) in dataSectors else 'Не найден',
            'workers': {},
            'fact_dates': {}
          }

        result_workers = result[order_sector_key]['workers']
        result_fact_dates = result[order_sector_key]['fact_dates']
        for wp_row in row['workers_participation']:
          if wp_row.get('status')=='active':
            date_key = wp_row['fact_date'].strftime('%d_%m_%Y')
            for worker_row in wp_row['workers']:
              if worker_row.get('user_id'):
                worker_key = str(worker_row['user_id'])
                worker_date_key = date_key + '_' + worker_key

                if worker_key not in result_workers:
                  result_workers[worker_key] = {
                    'user_id': worker_row['user_id'],
                    'user_email': worker_row['user_email'],
                    'user_fio': worker_row['user_fio'],
                    'dates': {}
                  }
                #result_workers[worker_key]['dates'][date_key] = wp_row['fact_date']
                result_workers[worker_key]['dates'][date_key] = date_key

                # собираем дубли
                if worker_date_key not in dublies_result:
                  dublies_result[worker_date_key] = {'user_id': worker_row['user_id'], 'count': 0}
                dublies_result[worker_date_key]['count']+=1

        if row.get('plan_work') and len(row['plan_work'])>0:
          for pw_row in row['plan_work']:
            if pw_row.get('fact_work') and len(pw_row.get('fact_work'))>0:
              for fw_row in pw_row.get('fact_work'):
                date_key = fw_row['date'].strftime('%d_%m_%Y')
                result_fact_dates[date_key] = date_key

    result = result.values()
    result.sort(key=lambda x: (x['contract_number'], x['production_number'], x['production_unit_number'] , x['sector_code']))
    return { 'data': result, 'dublies': dublies_result }
  except pymongo.errors.PyMongoError as e:
    raise Exception("Can't get fact works statistic: %s" %(str(e)))

def get_fact_work_stat5(params):
  '''
    params: {
      'orders': [],
      'sectors': [],
      'date_from': date_from,
      'date_to': date_to
    }
    #1657 (Выборка по трудовому участию)
    Дата,
    Процент участия,
    Таб. номер,
    ФИО,
    Заказ,
    Направление,
    Участок,
  '''
  import sectormodel
  import brigademodel
  import usermodel
  import contractmodel

  result = []
  try:

     # get sectors list
    arrDataSectors = sectormodel.get_all_only_sectors()
    dataSectors = {}
    for row in arrDataSectors:
      dataSectors[str(row['_id'])] = row;

    # get main data
    # status
    condition = {'wp_status': 'active'}
    # sectors
    if params['sectors'] and len(params['sectors']) > 0:
      condition['sector_code'] = { '$in': [int(code) for code in params['sectors']] }
    # orders
    if params['orders'] and len(params['orders']) > 0:
      condition['order'] = { '$in': params['orders'] }
    # dates
    if params['date_from'] and params['date_to']:
      condition['$and'] = [
        {'wp_fact_date': {'$gte': params['date_from']}},
        {'wp_fact_date': {'$lte': params['date_to']}}
      ]
    elif params['date_from']:
      condition['wp_fact_date'] = {'$gte': params['date_from']}
    elif params['date_to']:
      condition['wp_fact_date'] = {'$lte': params['date_to']}

    dataResultCursor = db.m_workorder.aggregate([
      {"$project":
        {
          'sector_id': 1,
          'sector_code':1,
          'production_number':1,
          'production_id':1,
          #'production_units':1,
          'production_unit': { '$arrayElemAt': [ "$production_units", 0 ] },
          'number':1,
          'contract_id': 1,
          'contract_number':1,
          'workers_participation':1,
          'status':1,
        }
      },
      {"$unwind": "$workers_participation"},
      {"$project":
        {
          'sector_id': 1,
          'sector_code':1,
          'production_number':1,
          'production_id':1,
          #'production_unit': {'$first': '$production_units'},
          'production_unit': 1,
          'number':1,
          'contract_id': 1,
          'contract_number':1,
          'status':1,
          'wp_status': "$workers_participation.status",
          'wp_date': "$workers_participation.date",
          'wp_fact_date': "$workers_participation.fact_date",
          'wp_workers': "$workers_participation.workers",
          "order": {
            '$concat': [
              {"$substr":["$contract_number", 0, -1 ]},
              '.',
              {"$substr":["$production_number", 0, -1 ]},
              '.',
              {"$substr":["$production_unit.unit_number", 0, -1 ]}
            ]
          }
        }
      },
      {"$match": condition}
    ])

    need_contracts_ids = {}

    for row in dataResultCursor:
      need_contracts_ids[str(row['contract_id'])] = row['contract_id']
      result.append(row)

    if len(result)>0:
       # получение информации от ребуемых договорах
      contracts = contractmodel.get_list_by(
        {'_id':{'$in':  need_contracts_ids.values()}},
        {'_id':1, 'productions': 1, 'number': 1}
      )
      contracts_tmp = {}
      for contract in contracts:
        if contract.get('productions') and len(contract.get('productions'))>0:
          for product in contract['productions']:
            key = str(contract['_id']) + '_' + str(product['_id'])
            contracts_tmp[key] = product

      for row in result:
        production_key = '{0}_{1}'.format(str(row['contract_id']), str(row['production_id']))
        # row['order'] = '{0}.{1}.{2}'.format(str(row['contract_number']), str(row['production_number']), str(row['production_unit']['unit_number']))
        row['sector_name'] = dataSectors[str(row['sector_id'])]['name'] if str(row['sector_id']) in dataSectors else 'Не найден'
        row['sector_type'] = dataSectors[str(row['sector_id'])]['type'] if str(row['sector_id']) in dataSectors else 'Не найден'
        row['production_name'] =  contracts_tmp.get(production_key,{}).get('name','Не определено')

      result.sort(key = lambda row: (row['wp_fact_date']))
    return result
  except pymongo.errors.PyMongoError as e:
    raise Exception("Can't get get_fact_work_stat5: %s" %(str(e)))

def get_fact_work_stat6(date_from, date_to):
  '''
    #1660 (Выгрузка рабочих (КТУ) на указанный период - 2)
    Таб. номер,
    ФИО,
    Количество дней
  '''
  import sectormodel
  import brigademodel
  import usermodel
  import contractmodel
  result = {}
  try:
     # get sectors list
    arrDataSectors = sectormodel.get_all_only_sectors()
    dataSectors = {}
    for row in arrDataSectors:
      dataSectors[str(row['_id'])] = row;

    dataResultCursor = db.m_workorder.aggregate([
      {"$project":
        {
          'sector_id': 1,
          'sector_code':1,
          'production_number':1,
          'production_id':1,
          'production_units':1,
          'number':1,
          'contract_id': 1,
          'contract_number':1,
          'workers_participation':1,
          'status':1,
        }
      },
      {"$unwind": "$workers_participation"},
      {"$project":
        {
          'sector_id': 1,
          'sector_code':1,
          'production_number':1,
          'production_id':1,
          'production_units':1,
          'number':1,
          'contract_id': 1,
          'contract_number':1,
          'status':1,
          'wp_status': "$workers_participation.status",
          'wp_date': "$workers_participation.date",
          'wp_fact_date': "$workers_participation.fact_date",
          'wp_workers': "$workers_participation.workers"
        }
      },
      {"$match": {
        'wp_status': 'active',
        '$and': [
          {'wp_fact_date': {'$gte': date_from}},
          {'wp_fact_date': {'$lte': date_to}}
        ]
      }}
    ])

    need_contracts_ids = {}
    tmp_result = []
    for row in dataResultCursor:
      need_contracts_ids[str(row['contract_id'])] = row['contract_id']
      tmp_result.append(row)

    if len(tmp_result)>0:
       # получение информации от ребуемых договорах
      contracts = contractmodel.get_list_by(
        {'_id':{'$in':  need_contracts_ids.values()}},
        {'_id':1, 'productions': 1, 'number': 1}
      )
      contracts_tmp = {}
      for contract in contracts:
        if contract.get('productions') and len(contract.get('productions'))>0:
          for product in contract['productions']:
            key = str(contract['_id']) + '_' + str(product['_id'])
            contracts_tmp[key] = product

      # группировка данных по работникам с подсчетом количества уникальных дат
      # в которых они принимали участие
      for row in tmp_result:
        for wp_row in row['wp_workers']:
          if wp_row.get('user_fio','') not in result:
            result[wp_row['user_fio']] = {
              'fio': wp_row['user_fio'],
              'email': wp_row['user_email'],
              'dates': []
            }
          if row['wp_fact_date'].strftime('%d.%m.%Y') not in result[wp_row['user_fio']]['dates']:
            result[wp_row['user_fio']]['dates'].append(row['wp_fact_date'].strftime('%d.%m.%Y'))

      result = result.values()
      result.sort(key = lambda row: (row['fio']))
    return result
  except pymongo.errors.PyMongoError as e:
    raise Exception("Can't get get_fact_work_stat5: %s" %(str(e)))

def do_aggregate(conditions_arr):
  '''
  Универсальная функция выполнения aggregate
  '''
  try:
    dataResult = []
    for row in db.m_workorder.aggregate(conditions_arr):
      dataResult.append(row)
    return dataResult
  except pymongo.errors.PyMongoError as e:
    raise Exception("Error! Can't get workorders: %s" %(str(e)))


def remove(_id):
  '''
    Удаление по ID
  '''
  try:
    # записать наряд в коллекцию удаленных
    data = get_by({'_id':_id})
    db.m_workorder_removed.insert(data)
    db.m_workorder.remove({'_id': _id})
  except pymongo.errors.PyMongoError as e:
    raise Exception("Error! Can't remove workorder: %s" %(str(e)))

def get_all_active_orders():
  '''
    Получение всех заказов по активным нарядам
  '''
  try:
    dataResult = []
    dataResultCursor = db.m_workorder.aggregate([
      {"$project":{
          "contract_id":1,
          "contract_number":1,
          "production_number":1,
          "production_units":1,
          "status": 1
        }
      },
      {"$match":{
        'status':{'$ne':'completed'}
      }},
      {"$unwind": "$production_units"},
      {"$project":
        {
          "contract_id":1,
          "contract_number":1,
          "production_number":1,
          "production_unit_number": "$production_units.unit_number",
        }
      },
      {"$group":{
        "_id":{"contract_id":"$contract_id","contract_number":"$contract_number","production_number":"$production_number","production_unit_number":"$production_unit_number"}
        }
      },
      {"$project":{
          "_id":0,
          "contract_id":"$_id.contract_id",
          "contract_number":"$_id.contract_number",
          "production_number":"$_id.production_number",
          "production_unit_number":"$_id.production_unit_number",
          # "order_number": {
          #   '$concat': [
          #     '$_id.contract_number','.','$_id.production_number','.','$_id.production_unit_number'
          #   ]
          # }
          # itemDescription: { $concat: [ "$item", " - ", "$description" ] } }
        }
      },
      {"$sort" : { "contract_number" : 1, "production_number": 1, "production_unit_number": 1 } }
    ])
    for row in dataResultCursor:
      dataResult.append(row)
    dataResult.sort(key = lambda row: (row['contract_number'],row['production_number'],row['production_unit_number']))
    return dataResult
    #return ['{0}.{1}.{2}'.format(row['contract_number'],row['production_number'],row['production_unit_number']) for row in dataResult ]
  except pymongo.errors.PyMongoError as e:
    raise Exception("Error! Can't get active orders: %s" %(str(e)))
