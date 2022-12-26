#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route, get, post, put, request, error, abort, response, debug
import json
import urllib
import bson
from models import contractmodel, ordermodel, clientmodel, historymodel,workordermodel
from routine import JSONEncoder, moscow_tz_offset
from bson.objectid import ObjectId
from models import countersmodel
import routine
import datetime, time
from libraries import userlib
import config
from helpers.google_api import calendar
import copy
import math, sys
import re
import operator
from traceback import print_exc
from apis.contract import contractapi
from handlers import orderhandler
from apis.workorder import workorderapi
from apis.stats import statsapi

FACTORY_KALUGA_ID = ObjectId("5305d15472ab560009030c0e")

@get('/handlers/contracts/search_contract')
def search_contract_by_num():
  '''
  Получение детализации договора по номеру.
  '''

  userlib.check_handler_access("contracts","r")
  res = {
    'status': 'ok',
    'contract': None,
    #'linked_contracts': [] # другие договора, созданные по одной заявке
  }
  param = request.query.decode()
  if not 'num' in param:
    return {'status':'error', 'msg':'Не задан номер договора.'}
  parent_id = ''
  if 'parent_num' in param and param['parent_num']:
    pr = contractmodel.get_by({'number':routine.strToInt(param['parent_num']), '$or':[{'parent_id':{'$exists':False}},{'parent_id':''}, {'parent_id':None}]},{})
    if pr:
      parent_id = pr['_id']
  res['contract'] = contractmodel.get_by({'number':routine.strToInt(param['num']), 'parent_id':parent_id })

  # добавляем доп. соглашения
  if res['contract']:
    alist = []
    for c in contractmodel.get_list_by({'parent_id':res['contract']['_id']},{'number':1, 'date_add':1, 'is_signed':1}):
      alist.append(c)
    res['contract']['additional_contracts'] = alist

  # добавляем № договора к доп. соглашению
  if res['contract'] and 'parent_id' in res['contract'] and res['contract']['parent_id']:
    pr = contractmodel.get_by({'_id':res['contract']['parent_id']},{'number':1, 'date_add':1})
    # добавляем продукция из контактов и допов
    parent_productions =  contractapi.get_parent_productions(res['contract']['parent_id'],res['contract']['number'])

    res['parent_productions'] = parent_productions
    res['contract']['parent_number'] = pr['number']
    res['contract']['parent_date_add'] = pr['date_add']

  # iss:953 [добавляем информацию о связанных договорах по заявке]
  # iss:1023 [добавление идентификатора каталога документов для заявки]
  if res['contract'] and res['contract'].get('orders'):
    # получить список договоров, задействованных в заявке
    linked_contracts = []
    folder_id = None
    for o in res['contract'].get('orders'):
      order_data = ordermodel.get_by_args({'_id': ObjectId(o['_id'])}, {'contracts': 1, 'documents':1})
      linked_contracts += order_data.get('contracts',[])
      if not folder_id:
        folder_id = (order_data.get('documents',{}) or {}).get('folder_id')
    res['contract']['linked_contracts'] = linked_contracts
    res['contract']['order_folder_id'] = folder_id

  # добавляем информация о нарядах iss:#1394
  if res.get('contract'):
    res['workorders'] = workordermodel.get_list_by({'contract_id':res['contract'].get('_id')}, {'number':1, 'plan_work':1} )

  return JSONEncoder().encode(res)




@post('/handlers/contracts/get_list/<page>')
def get_contract_list(page):
  userlib.check_handler_access("contracts","r")

  filters_fac = request.forms.get('factories')
  filters_st = request.forms.get('statuses')
  filters_debt = request.forms.get('debt')
  #print filters_debt
  filters = {
    'parent_id':'',
  }

  ands = []

  if filters_fac:
    flist = filters_fac.split(",")
    fobj_list = []
    for f in flist:
      if f !='multiselect-all':
        fobj_list.append(ObjectId(f))
    if len(fobj_list)>0:
      filters['factory_id'] = {'$in':fobj_list}

  if filters_st:
    flist = filters_st.split(",")
    st = []
    for f in flist:
      if f=='0':
        st.append({'is_signed':'yes'})
      if f=='1':
        st.append({'is_signed':'no'})
      if f=='2':
        st.append({'is_canceled':True})
    if len(st)>0:
      filters['$and'] = st

  if filters_debt:
    flist = filters_debt.split(",")
    ands.append({'is_signed':'yes'})
    ands.append({'is_canceled':{'$ne' : True}})
    conditions = []
    for f in flist:
      if f !='multiselect-all':
        conditions.append({'debt': contractapi.get_filter_by_num(f)})
    if len(conditions)>0:
      if '$or' in filters:
        filters['$or'].extend(conditions)
      else:
        filters['$or'] = conditions

  cu = userlib.get_cur_user()
  if cu['admin']!="admin":
    access = userlib.get_page_access('contracts')
    result = False
    if access['role']!='admin' and access['access'] and 'o' in access['access'] and access['access'].get('additional') and 'type' in access['access']['additional']:
      if access['access']['additional']['type'] != 'all':
        users = userlib.get_access_user_list('contracts')
        if '$or' not in filters:
          filters['$or'] = list()
        filters['$or'].append({'history.type': 'create', 'history.user': {'$in' : users} })

  if 'contracts' in cu['pages']:
    user_role_pages = cu['pages']['contracts']
  else:
    user_role_pages = []

  acc = userlib.get_access_user_list('contracts')
  if acc:
    ands.append({'user_email':{'$in':acc}})

  res = {}

  if len(ands)>0:
      filters['$and'] = ands

  print filters

  c_curs = contractmodel.get_all(filters,{'number':1, 'client_name':1, 'client_signator':1, 'factory':1, 'debt':1, 'is_signed':1, 'is_canceled':1 },50,int(page))
  contracts = []
  if c_curs:
    for c in c_curs:
      contracts.append(c)
  count = contractmodel.get_count(filters)

  return JSONEncoder().encode({'status':'ok','contracts':contracts,'count':count})

@post('/handlers/contracts/clientfind/')
def cnt_find_client_handler():
  userlib.check_handler_access("clients","r")
  query = request.forms.get('q')

  regx1 = re.compile(query+'.*', re.IGNORECASE)

  clients = clientmodel.get_list({'name':regx1},{'contacts':1, 'name':1, 'addr':1})

  #try:
  #clients = clientmodel.findb(query, cl)
  # pprint.pprint(clients);
  data = []
  for c in clients:
    cont =  ''
    if len(c['contacts'])>0:
      for co in c['contacts']:
        cont = cont + co['fio']
        if len(co['phone'])>0:
          cont = cont+', '+' '.join(co['phone'])
        if len(co['email'])>0:
          cont = cont+', '+' '.join(co['email'])
        cont =  cont + ', '
      cont = cont[:-2]
    data.append({'id':str(c['_id']), 'name': c['name'], 'len':len(c['name']),'cont':cont})
  data.sort(key=operator.itemgetter('len'))
  return JSONEncoder().encode({'result':data})


@get('/handlers/contracts/get_contract_number')
def get_contract_number():
  userlib.check_handler_access("contracts","r")
  res = {}
  param = request.query.decode()
  contract = contractmodel.get_by({'_id':ObjectId(param['parent_id'])},{'number':1, 'orders':1, 'client_id':1, 'client_name':1, 'client_signator':1, 'factory_id':1, 'factory':1, 'is_signed':1})
  if not contract:
    return JSONEncoder().encode({'status':'error','msg':"Договор не найден."})

  # проверка на подписанность основного договора
  if not contract.get('is_signed')=='yes':
    print contact.get('number')
    print contact.get('is_signed')
    return JSONEncoder().encode({'status':'error','msg':"Нельзя добавить дополнительное соглашение, пока не подписан основной договор и все его дополнительные соглашения.."})

  # проверка на подписанность всех доп. соглашений
  dops = contractmodel.get_list_by({'parent_id':ObjectId(param['parent_id'])},{'number':1,'orders':1,'client_id':1, 'client_name':1, 'client_signator':1, 'factory_id':1, 'factory':1, 'is_signed':1})

  for dop in dops:
    if not dop.get('is_signed')=='yes':
      return JSONEncoder().encode({'status':'error','msg':"Нельзя добавить дополнительное соглашение, пока не подписан основной договор и все его дополнительные соглашения.."})

  # получить все продукции для доп. соглашений
  contract['parent_productions'] = contractapi.get_parent_productions(ObjectId(param['parent_id']),sys.maxint)
  if contract:
    return JSONEncoder().encode({'status':'ok', 'contract':contract})
  else:
    return JSONEncoder().encode({'status':'error','msg':"Договор не найден."})


@post('/handlers/contracts/search_order')
def search_order_by_num():
  #userlib.check_handler_access("contracts","r")
  current_user = userlib.get_cur_user()
  acc = userlib.get_crm_access_user_list() or []
  res = {}
  if current_user:
    res['status']='ok'
    q = request.forms.get('q')
    if q:
      res['result'] = ordermodel.get_list({'$where':'/^'+q+'.*/.test(this.number)'},{'_id':1, 'number':1, 'client_id':1, 'client':1, 'manager':1})
      for order in res['result']:
        order['have_access'] = userlib.check_order_access(order['manager'])
  return JSONEncoder().encode(res)


@post('/handlers/contracts/search_contract_forinput')
def search_contract_forinput():
  userlib.check_handler_access("contracts","r")
  res = {}
  res['status']='ok'
  q = request.forms.get('q')
  res['result'] = []
  if q:
    clist = contractmodel.get_list_by({'$where':'/^'+q+'.*/.test(this.number)', '$or':[{'parent_id':{'$exists':False}},{'parent_id':''}, {'parent_id':None}] },{'_id':1, 'number':1, 'is_signed':1, 'draft':1 })
    for c in clist:
      if c.get('draft'):
        c['draft'] = True
      else:
        c['draft'] = False
      res['result'].append(c)
  return JSONEncoder().encode(res)


@post('/handlers/contracts/search_order_tn')
def search_order_by_num():
  userlib.check_handler_access("contracts","r")
  usr = userlib.get_cur_user()
  res = []
  if usr:
    q = request.forms.get('q')
    if q:
      r = ordermodel.get_list({'$where':'/^'+q+'.*/.test(this.number)'},{'_id':1, 'number':1})
      for q in r:
        res.append({'id':q['_id'], 'name': str(q['number'])})

  return JSONEncoder().encode(res)

'''
  Сохранение договора
'''
@post('/handlers/contracts/save_contract')
def save_contract():
  # метод заполнения истории изменений.
  # data - данные контракта
  # newprod_ids - идентификаторы новой продукции
  def fill_change_history(data, newprod_ids):
    #---------------------------------------------
    for ch in data.get('change_history',[]):
      if not ch.get('_id'):
        ch['_id'] = ObjectId()
        if len(data.get('edit_history',[]))>0:
          ch['additional_id'] = data['edit_history'][-1]['additional_id']
          ch['additional_number'] = data['edit_history'][-1]['additional_number']
      if ch.get('object_id','').find('new_')==0:
        ch['object_id'] = newprod_ids[ch.get('object_id')] or ObjectId()

  from apis.crm import orderapi
  # проверка доступа
  userlib.check_handler_access("contracts","w")
  # данные от клиента
  data = request.json
  # начальные параметры
  is_new = True               # добавление нового договора
  is_signed = False           # договор подписан
  cur_user = userlib.get_cur_user()   # текущий пользователь
  products_count = 0          # счетчик продукции в договоре (глобальный с учетом доп. соглашений)
  products_to_remove = []       # список продукци на удаление


  # если редактирование существующего договора
  if data.get('_id'):
    is_new = False
    products_count = routine.strToInt(data.get('products_count',0))
    sdt = contractmodel.get_by({'_id':ObjectId(data['_id'])},{'is_signed':1})
    '''if sdt.get('is_signed')=='yes':
      is_signed = True
    else:
      if data['is_signed']=='yes' and not data.get('parent_id'):
        for o in data.get('orders',[]):
          orderapi.autosign_order(o['number'])'''
    if data['is_signed']=='yes' and not data.get('parent_id'):
      for o in data.get('orders',[]):
        orderapi.autosign_order(o['number'])
        #orderapi.autosign_order(data['order_number'])
  else:
    # получение идентификатора для нового договора
    data['_id'] = ObjectId()
    # если это доп. соглашение, то получаем для него номер из количества допников в договоре
    # иначе из глобального счетчика по договорам
    if data.get('parent_id'):
      addlist = contractmodel.get_list_by({'parent_id':ObjectId( data['parent_id'])},{})
      data['number'] = addlist.count()+1
    else:
      data['number'] = countersmodel.get_next_sequence("contracts")
      data['product_seq'] = 0
      data['product_seq_arr'] = []
    if data.get('is_signed')=='yes' and not data.get('parent_id'):
      for o in data.get('orders',[]):
          orderapi.autosign_order(o['number'])
      #orderapi.autosign_order(data['order_number'])

  # запуск процедуры переопределения прав доступа к документам на google диске
  if data.get('is_signed')=='yes' and not data.get('google_group') and not data.get('parent_id'):
    try:
      if not config.use_worker:
        contractapi.add_google_group(data['number'], data['client_name'])
      else:
        config.qu_default.enqueue_call(func=contractapi.add_google_group, args=(data['number'], data['client_name']))
    except Exception, exc:
      print exc
  #--------------------------------------------
  # если указан подписант, добаляем его в клиентов
  if data.get('client_signator'):
    if data.get('client_signator_id',''):
      data['client_signator_id'] = ObjectId(data['client_signator_id'])
      clientmodel.update_by({'_id':data['client_signator_id'],'is_podpisant':{'$ne':True}},{'is_podpisant':True},cur_user)
    else:
      obj = {'_id':ObjectId(), 'name':data.get('client_signator'), 'addr':'', 'added':datetime.datetime.utcnow(), 'added_by':cur_user['email'], 'manager':cur_user['email'], 'agent':False, 'base_group':'no', 'cl':'nocl','group':'','iscl':'','history_work_status':[], 'contacts':[], 'current_work_status': {'status':'active', 'note': ''}, 'is_podpisant':True }
      data['client_signator_id'] = obj['_id']
      clientmodel.add(obj,cur_user)
  #---------------------------------------------
  # получение родительского договора для допника
  parent_data = None
  if data.get('parent_id'):
    parent_data = contractmodel.get_by({'_id': ObjectId(data['parent_id'])},{'number':1, 'date_add':1,'products_count':1,'draft':1})
    products_count = parent_data.get('products_count',0)

    '''# проверяем, не редактируется ли допник на основании сохраняемого ДС
    if parent_data.get('draft'):
      try:
        draft = json.loads(parent_data.get('draft'))
        if draft.get('base_additional') and str(draft.get('base_additional').get('_id'))==str(data['_id']):
          if draft
      except:
        pass
    '''



  # если идет создание нового договора или редактирование не подписанного договора
  # или у пользователя супер права
  if is_new or not is_signed or userlib.has_access('contracts','o'):
    data['user_email'] = cur_user['email']
    data['date_change'] = datetime.datetime.utcnow()
    newprod_ids = {} # идентификаторы новой продукции


    # если это основной договор
    if not data.get('parent_id'):
      # ищем элемент "Вся продукция в списке продукции"
      i=0
      is_find = False
      for p in data['productions']:
        if p.get('product_type')=='full_contract':
          is_find = True
          break;
        else:
          i=i+1
      # если не найдено, то добавляем в первую позицию
      if not is_find:
        o = ObjectId()
        nlr_pr ={"count" : 1,"approx" : "no","square" : 0,"product_type" : "full_contract","target" : "","positions" : [], "price" : 0, "number" : 0,"height" : "", "date_change" : datetime.datetime.utcnow(), "width" : "","length" : "","addrs" : "","units" : [{"status" : "ready_to_develop","number" : 0,"date_change" : datetime.datetime.utcnow(),"statuses" : [ {"status" : "added","date_change" : datetime.datetime.utcnow(),"user_email" : cur_user['email']}, {"status" : "ready_to_develop","date_change" : datetime.datetime.utcnow(),"user_email" : cur_user['email']}],"production_id" : o ,"_id" : ObjectId(),"user_email" : cur_user['email']}],"is_complect" : False,"_id" : o,"type" : "","user_email" : cur_user['email'],"name" : "Весь договор"}
        data['productions'].insert(0,nlr_pr)
      else:
        # иначе перемещаем в нуливую позицию
        if i!=0:
          data['productions'].insert(0, data['productions'].pop(i))

    # продукция парента и предыдущих допо (если есть)
    parent_productions = []
    if parent_data:
      parent_productions = contractapi.get_parent_productions(parent_data['_id'],data['number'])

    for p in data['productions']:
      if p.get('status') == 'del':
        products_to_remove.append(p['number'])
        del p
      else:
        if p.get('product_type')!='full_contract':
          #новая продукция
          if p['_id'].find("new_")==0:
            o = ObjectId()
            newprod_ids[p['_id']] = o
            p['_id'] = o
            p['user_email'] = cur_user['email']
            p['date_change'] = datetime.datetime.utcnow()

          # если у продукции еще нет номера, то необходимо его получить
          if not p.get('number'):
            products_count = products_count+1
            #p["number"] = products_count
            # если это не создание нового договора, у которого еще нет счетчика, то
            # счетчик необходимо сформировать на лету, иначе счетчик ведется через БД
            if not is_new or data.get('parent_id'):
              p["number"] = contractapi.get_next_sequence_product(ObjectId(data.get('parent_id') or data.get('_id')))
            else:
              data['product_seq'] = products_count
              data['product_seq_arr'].append({'i': products_count,  'status': False, 'date': datetime.datetime.utcnow()})
              p["number"] = products_count


          # для услуг
          if p.get('product_type')=='service':
            # убираем лишние unit-ы (которых нет в продукции)
            newarr = []
            for u in p['service_units']:
              if u['production_id'].find("new_")==0:
                if u['production_id'] in newprod_ids:
                  u['production_id'] = newprod_ids[u['production_id']]
              for pr in data['productions']:
                if str(pr['_id'])==str(u['production_id']):
                  for un in pr['units']:
                    if un['number']==u['unit_number']:
                      u['unit_id'] = un['_id']
                      newarr.append(u)
                      break
                  break
              # ищем в продукции парентов и допов.
              for pr in parent_productions:
                if str(pr['_id'])==str(u['production_id']):
                  for un in pr['units']:
                    if un['number']==u['unit_number']:
                      u['unit_id'] = un['_id']
                      newarr.append(u)
                      break
                  break
            p['service_units'] = newarr
          # конец блока обработки услуг
          if 'units' not in p:
            p['units'] = []
          # добавляем нуливую единицу продукции
          i=0
          is_find = False
          for u in p['units']:
            if u.get('number')==0:
              is_find = True
              break;
            else:
              i=i+1
          # если не найдено, то добавляем в первую позицию
          if not is_find:
            u = {'production_id':p['_id'], 'status':"ready_to_develop", 'number':0, '_id':ObjectId(),'date_change':datetime.datetime.utcnow(), 'user_email':cur_user['email'], 'statuses':[{'status':"added",'date_change':datetime.datetime.utcnow(), 'user_email':cur_user['email']},{'status':"ready_to_develop",'date_change':datetime.datetime.utcnow(), 'user_email':cur_user['email']}]}
            p['units'].insert(0,u)
          else:
            # иначе перемещаем в нуливую позицию
            if i!=0:
              p['units'].insert(0, p['units'].pop(i))
          # конец блока доблавния нуливой единицы продукции
          i=0
          # обрезаем список unit-ов
          if len(p['units'])>(p['count']+1):
            p['units'] = p['units'][:p['count']+1]
          while i<(p['count']+1):
            if len(p['units'])>i:
              p['units'][i]['number'] = i
            else:
              u = {'production_id':p['_id'], 'status':"ready_to_develop", 'number':(i), '_id':ObjectId(),'date_change':datetime.datetime.utcnow(), 'user_email':cur_user['email'], 'statuses':[{'status':"added",'date_change':datetime.datetime.utcnow(), 'user_email':cur_user['email']},{'status':"ready_to_develop",'date_change':datetime.datetime.utcnow(), 'user_email':cur_user['email']}]}
              p['units'].append(u)
            i=i+1
          for u in p['units']:
            if str(u['production_id']).find("new_")==0:
              if u['production_id'] in newprod_ids:
                u['production_id'] = newprod_ids[u['production_id']]

    num = 1
    for p in data['payments']:
      #новый платеж
      if not p.get('_id') or p.get('_id').find("new_")==0: #'_id' not in p or not p['_id']:
        o = ObjectId()
        newprod_ids[p['_id']] = o
        p['_id'] = o
        p['user_email'] = cur_user['email']
        p['date_add'] = datetime.datetime.utcnow()
        p['date_change'] = datetime.datetime.utcnow()

      p['number'] = num
      num = num+1
      if 'units' not in p:
        p['units'] = []
      #убираем лишние unit-ы (которых нет в продукции)
      newarr = []
      for u in p['units']:
        if u['production_id'].find("new_")==0:
          if u['production_id'] in newprod_ids:
            u['production_id'] = newprod_ids[u['production_id']]
        for pr in data['productions']:
          if not pr.get('product_type') and str(pr['_id'])==str(u['production_id']):
            for un in pr['units']:
              if un['number']==u['unit_number']:
                u['unit_id'] = un['_id']
                newarr.append(u)
                break
            break
      p['units'] = newarr
      # убираем лишние услуги
      newarr = []
      for s in p['services']:
        if s['service_id'].find("new_")==0:
          if s['service_id'] in newprod_ids:
            s['service_id'] = newprod_ids[s['service_id']]
        for sr in data['productions']:
          if sr.get('product_type')=='service' and str(sr['_id'])==str(s['service_id']):
            newarr.append(s)
      p['services'] = newarr
      # добавляем для услуг ед. продукции
      if p.get('by_service') and len(p['services'])==1 and len(p['units'])==0:
        for pr in data['productions']:
          if str(pr['_id'])==str(p['services'][0]['service_id']):
            p['units'].append({'production_id':pr['_id'], 'unit_number':0, 'unit_id':pr['units'][0]['_id']})

      # обработка коментариев к платежу
      for comment in p['comments']:
        # проверка на новые коментарии
        if comment['_id'] == "new":
          comment['_id'] = ObjectId()
        else:
          comment['_id'] = ObjectId(comment['_id'])
        comment["date_add"] = contractapi.convertDt(comment["date_add"])

    if 'history' not in data:
      data['history'] = []
    data['history'].append({'date':datetime.datetime.utcnow(), 'user':cur_user['email'], 'type': 'create' if is_new else 'change'})
    # даты делаем датами, а id - ObjectId
    contractapi.fill_Obj(data,['_id','client_id','factory_id','parent_id','order_id','production_id','unit_id','service_id','work_id', 'work_order_id'],'id')
    contractapi.fill_Obj(data,['_id','date','date_add','date_change','deadline','pay_date','sign_date','date_end','date_start','canceled_date','deleted_date'],'date')
    data['products_count'] = products_count
    if data.get('is_signed')=='yes':
      check_workorders(data)

    # данные истории изменений
    if data.get('edit_history'):
      for h in data.get('edit_history'):
        if not h.get('user_email'):
          h['user_email'] = cur_user['email']
        if not h.get('date_add'):
          h['date_add'] = datetime.datetime.utcnow()


    fill_change_history(data, newprod_ids)

    # обновление данных в БД
    if is_new:
      del data['draft']
      contractapi.calculate_finance(data)
      contractmodel.add(data)
    else:
      data['draft']= None
      if 'product_seq_arr' in data:
        del data['product_seq_arr']
      if 'product_seq' in data:
        del data['product_seq']
      contract_id = ObjectId(data['_id'])
      del data['_id']
      contractapi.calculate_finance(data)
      contractmodel.update({'_id':contract_id},{'$set':data})
      data['_id'] = contract_id

    # добавить в историю
    if data.get('is_signed')=='yes':
      historymodel.add(contract_id, 'contract', '', data, cur_user.get('email'))


    # подтверждение статусов номеров продукции в глобальном счетчике продукции договора
    for p in data['productions']:
      contractapi.confirm_sequence_product(ObjectId(data.get('parent_id') or contract_id), p['number'])
    # освабождение индексов из под удаленных продукций
    #for p_num in products_to_remove:
    # contractapi.remove_sequence_product(ObjectId(data.get('parent_id') or data.get('_id')), p_num)


    # если было обновление доп. соглашения, то необходимо обновить количество всей продукции с учетом допников в основном договоре
    if parent_data:
      contractmodel.update({'_id':parent_data['_id']},{'$set':{'products_count':products_count}})

    if data.get('parent_id'):
      data['parent_number'] = parent_data['number']
      data['parent_date_add'] = parent_data['date_add']
    else:
      # обновляется завод для всех доп. соглашений, если меняется завод для основного договора
      contractmodel.update({'parent_id':contract_id},{'$set':{'factory':data['factory'], 'factory_id':data['factory_id']}}, False, True)

    # создаются события в календаре (таск 1020, пенза делается как калуга)
    if data.get('is_signed')=='yes':
      create_workorders(data)
      '''if str(data['factory_id'])==str(FACTORY_KALUGA_ID):
        create_workorders(data)
      else:
        create_plan_pays(data['_id'])'''

    # обновляем заявки
    try:
      contractapi.reset_orders(data)
    except Exception, exc:
      excType = exc.__class__.__name__
      print exc


    if not data.get('parent_id'):
      close_contract_if_all_workorders_completed(data['number'], cur_user['email'] )

    # для допников ID фолдера берется из основного
    #if not data.get('parent_id'):
    data['documents'] = contractapi.create_or_update_google_folder_catalogs(ObjectId(contract_id))

    return JSONEncoder().encode(data)
  # если редактирование договора
  else:
    newprod_ids = {}
    contract = contractmodel.get_by({'_id':ObjectId(data['_id'])})
    # заносим общие данные, которые доступны всегда
    contract['user_email'] = cur_user['email']
    contract['date_change'] = datetime.datetime.utcnow()
    if 'history' not in contract:
      contract['history'] = []
    contract['history'].append({'date':datetime.datetime.utcnow(), 'user':cur_user['email'], 'type': 'change'})
    contract['date_add'] = contractapi.convertDt(str(data['date_add'])) if data['date_add'] else None
    contract['client_id'] = ObjectId(data['client_id'])
    contract['client_name'] = data['client_name']
    contract['client_signator'] = data['client_signator']
    contract['factory_id'] = ObjectId(data['factory_id']) if data['factory_id'] else None
    contract['factory'] = data['factory']
    contract['note'] = data['note']
    #contract['order_number'] = data['order_number']
    #contract['order_id'] =  ObjectId(data['order_id'])
    contract['orders'] = data['orders']
    if contract['is_signed']=='no':
      if data['is_signed']=='yes':
        contract['is_signed'] = data['is_signed']
        contract['sign_date'] = contractapi.convertDt(str(data['sign_date'])) if data['sign_date'] else None
        contract['deadline'] = contractapi.convertDt(str(data['deadline'])) if data['deadline'] else None
    else:
      contract['deadline'] = contractapi.convertDt(str(data['deadline'])) if data['deadline'] else None

    # заполняем payment_uses
    contract['payment_uses'] = data['payment_uses']
    parent_data = None
    if contract.get('parent_id'):
      parent_data = contractmodel.get_by({'_id': contract['parent_id']},{'number':1, 'date_add':1})

    # заполняем платежи
    for p in data['payments']:
      pp = p
      # новый платеж
      if  not p.get('_id') or p.get('_id').find("new_")==0: #'_id' not in p or not p['_id']:
        o = ObjectId()
        newprod_ids[p['_id']] = o
        pp['_id'] = o
        pp['user_email'] = cur_user['email']
        pp['date_add'] = datetime.datetime.utcnow()
        pp['date_change'] = datetime.datetime.utcnow()
        contract['payments'].append(pp)
      else:
        for cp in contract['payments']:
          if str(cp['_id'])==str(p['_id']):
            pp = cp
            pp['size'] = p['size']
            pp['note'] = p['note']
            pp['currency'] = p['currency']
            pp['day_count'] = p['day_count']
            pp['date'] = p['date']
            pp['period'] = p['period']
            pp['by_production'] = p['by_production']
            pp['date_end'] = p['date_end']
            pp['date_add'] = p['date_add']
            pp['payment_type'] = p['payment_type']
            if 'is_canceled' in p:
              pp['is_canceled'] = p['is_canceled']
            if 'cancelation_comment' in p:
              pp['cancelation_comment'] = p['cancelation_comment']
            if 'is_canceled' in p and p['is_canceled']:
              has_fact = False
              if 'events' in pp:
                for e in pp['events']:
                  if e['type']=='additional_payment' or e['type']=='fact_payment':
                    has_fact = True
              if has_fact:
                pp['is_canceled'] = False


            break



      if 'units' not in p:
        p['units'] = []
      # убираем лишние unit-ы (которых нет в продукции)
      newarr = []
      for u in p['units']:
        for pr in data['productions']:
          if not pr.get('product_type') and str(pr['_id'])==str(u['production_id']):
            for un in pr['units']:
              if un['number']==u['unit_number']:
                u['unit_id'] = un['_id']
                newarr.append(u)
                break
            break
      pp['units'] = newarr
      # убираем лишние услуги
      newarr = []
      for s in p['services']:
        for sr in data['productions']:
          if sr.get('product_type')=='service' and str(sr['_id'])==str(s['service_id']):
            newarr.append(s)
      pp['services'] = newarr

      # добавляем для услуг ед. продукции
      if p.get('by_service') and len(p['services'])==1 and len(p['units'])==0:
        for pr in data['productions']:
          if str(pr['_id'])==str(p['services'][0]['service_id']):
            p['units'].append({'production_id':pr['_id'], 'unit_number':0, 'unit_id':pr['units'][0]['_id']})

      # обработка коментариев к платежу
      newarr = []
      for comment in p.get('comments',[]):
        # проверка на новые коментарии
        if comment['_id'] == "new":
          comment['_id'] = ObjectId()
        else:
          comment['_id'] = ObjectId(comment['_id'])
        comment["date_add"] = contractapi.convertDt(comment["date_add"])

        newarr.append(comment)
      pp['comments'] = newarr
      contractapi.fill_Obj(pp,['_id','client_id','factory_id','parent_id','order_id','production_id','unit_id','service_id','work_id', 'work_order_id'],'id')
      contractapi.fill_Obj(pp,['_id','date','date_add','date_change','deadline','pay_date','sign_date','date_end','date_start'],'date')

    num = 1
    for p in contract['payments']:
      p['number'] = num
      num = num+1
    if contract.get('is_signed')=='yes':
      check_workorders(data)

    fill_change_history(data, newprod_ids)

    contract['draft'] = None
    if 'product_seq_arr' in contract:
      del contract['product_seq_arr']
    if 'product_seq' in contract:
      del contract['product_seq']
    contract_id = ObjectId(contract['_id'])
    del contract['_id']
    contractapi.calculate_finance(contract)
    contractmodel.update({'_id':contract_id},{'$set':contract})
    contract['_id'] = contract_id

    if 'parent_id' in contract and contract['parent_id']:
      pr = contractmodel.get_by({'_id': contract['parent_id']},{'number':1, 'date_add':1})
      contract['parent_number'] = pr['number']
      contract['parent_date_add'] = pr['date_add']

    # создаются события в календаре (1020 пенза как калуга)
    if contract.get('is_signed')=='yes':
      create_workorders(contract)
      '''if str(contract['factory_id'])==str(FACTORY_KALUGA_ID):
        create_workorders(contract)
      else:
        create_plan_pays(contract['_id'])'''
    if not contract.get('parent_id'):
      close_contract_if_all_workorders_completed(contract['number'], cur_user['email'] )
    # обновляем заявки
    try:
      contractapi.reset_orders(contract)
    except Exception, exc:
      excType = exc.__class__.__name__
      print exc



    # проверяем на наличие необходимой структуры каталогов на гугл диске
    # каталог документов создается только для основных договоров
    # для допников ID фолдера берется из основного
    #if not data.get('parent_id'):
    data['documents'] = contractapi.create_or_update_google_folder_catalogs(ObjectId(contract_id))
    return JSONEncoder().encode(contract)

@post('/handlers/contracts/cancel_contract')
def cancel_contract():
  '''
    Расторжение договора
  '''
  userlib.check_handler_access("contracts","w")
  contract_id = request.forms.get('contract_id')
  cancel_reason = request.forms.get('cancel_reason')
  if not contract_id:
    return {'status':'error', 'msg':'Не задан номер договора.'}
  contractmodel.update({'_id':ObjectId(contract_id)},{'$set':{'is_canceled':True, 'cancel_date':datetime.datetime.utcnow(), 'cancel_reason': cancel_reason }})
  return JSONEncoder().encode({'status':'ok','cancel_date':datetime.datetime.utcnow()})


@get('/handlers/contracts/search_contract_payments')
def search_contract_payments():
  userlib.check_handler_access("factpayments","r")
  res = {}
  res['status']='ok'
  param = request.query.decode()
  if not 'num' in param:
    return {'status':'error', 'msg':'Не задан номер договора.'}
  parent_id = ''
  res['contract'] = contractmodel.get_by({'number':routine.strToInt(param['num']), 'parent_id':parent_id },{'number':1, 'payments':1,'productions':1, 'services':1, 'factory':1})
  # добавляем доп. соглашения
  if res['contract']:
    alist = []
    for c in contractmodel.get_list_by({'parent_id':res['contract']['_id']},{'number':1, 'payments':1, 'parent_id':1,'productions':1, 'services':1}):
      alist.append(c)
    res['contract']['additional_contracts'] = alist
  return JSONEncoder().encode(res)


@post('/handlers/contracts/save_fact_payment')
def save_fact_payment():
  try:
    userlib.check_handler_access("factpayments","w")
    event_id = request.forms.get('event_id')
    payment_id = request.forms.get('payment_id')
    contract_id = request.forms.get('contract_id')
    if event_id:
      userlib.check_handler_access("factpayments","o")
    res = {'status':'error', 'msg':"Событие не найдено"}
    contract = contractmodel.get_by({'_id':ObjectId(contract_id)})
    payment = None
    for p in contract['payments']:
      if str(p['_id'])==payment_id:
        payment = p
        break
    if payment:
      if 'is_canceled' in payment and payment['is_canceled']:
        res = {'status':'error', 'msg':"Платеж был отменен"}
      else:
        cur_user = userlib.get_cur_user()
        event = None
        if not event_id:
          event = {'date_start':datetime.datetime.strptime(request.forms.get('date_start'),'%d.%m.%Y'),'_id':ObjectId(), 'comments':[], 'size':routine.strToFloat(request.forms.get('size')), 'date_change':datetime.datetime.utcnow(), 'user_email':cur_user['email'],'type':'fact_payment'}
          payment['events'].append(event)
        else:
          for e in payment['events']:
            if str(e['_id'])==event_id:
              event = e
              event['date_start'] = datetime.datetime.strptime(request.forms.get('date_start'),'%d.%m.%Y')
              event['size'] = routine.strToFloat(request.forms.get('size'))
              event['date_change'] = datetime.datetime.utcnow()
              event['user_email'] = cur_user['email']
              break
        if event:
          if request.forms.get('comment'):
            event['comments'].append({'_id':ObjectId(), 'note':request.forms.get('comment'), 'user_email':cur_user['email'], 'date_change':datetime.datetime.utcnow()})
          is_fact = True
          for e in payment['events']:
            if e['type']=='fact_payment' or e['type']=='additional_payment':
              if is_fact:
                e['type'] = 'fact_payment'
                is_fact = False
              else:
                e['type'] = 'additional_payment'
          # проверка, чтобы фактические платежи не превосходили плановые
          sz = payment['size']
          psz = 0
          for e in payment['events']:
            psz+=e['size']

          if psz>sz:
            res = {'status':'error', 'msg':"Размер фактического платежа превосходит размер планового платежа."}
          else:
            contractapi.calculate_finance(contract)
            contractmodel.update({'_id':ObjectId(contract['_id'])},contract)
            update_fact_calendar_event(contract_id, payment_id, event_id)
            res = {'status':'ok', 'payment':payment}
    return JSONEncoder().encode(res)
  except Exception, exc:
    return  {'status':'error', 'msg': str(exc)}



@post('/handlers/contracts/delete_fact_payment')
def delete_fact_payment():
  userlib.check_handler_access("factpayments","w")
  userlib.check_handler_access("factpayments","o")

  event_id = request.forms.get('event_id')
  payment_id = request.forms.get('payment_id')
  contract_id = request.forms.get('contract_id')

  res = {'status':'error', 'msg':"Событие не найдено"}
  contract = contractmodel.get_by({'_id':ObjectId(contract_id)})
  payment = None
  for p in contract['payments']:
    if str(p['_id'])==payment_id:
      payment = p
      break
  if payment:
    cur_user = userlib.get_cur_user()
    rs = []
    for x in payment['events']:
      if str(x['_id'])!=event_id:
        rs.append(x)
    payment['events'] = rs
    is_fact = True
    for e in payment['events']:
      if e['type']=='fact_payment' or e['type']=='additional_payment':
        if is_fact:
          e['type'] = 'fact_payment'
          is_fact = False
        else:
          e['type'] = 'additional_payment'
    contractapi.calculate_finance(contract)
    contractmodel.update({'_id':ObjectId(contract['_id'])},contract)

    delete_fact_calendar_event(contract_id, payment_id, event_id)

    res = {'status':'ok', 'payment':payment}
  return JSONEncoder().encode(res)


@post('/handlers/contracts/remove_document/<contract_id>')
def remove_document(contract_id):
  try:
    userlib.check_handler_access("contracts","w")
    from helpers.google_api import drive
    data = request.json;
    if not data or not contract_id:
      return routine.JSONEncoder().encode({'status': 'error','msg':'Ошибка удаления документа. Повторите попытку.'})
    # удаление документа из БД
    usr = userlib.get_cur_user()
    contractapi.remove_document(ObjectId(contract_id), usr['email'], data['_id'])
    # # удаление документа с google диска
    # drive.delete_file(drive.get_service(config.gogle_folder_creator), data['google_file_id'])

    return routine.JSONEncoder().encode({'status': 'ok'})
  except Exception,exc:
    excType = exc.__class__.__name__
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})


@get('/handlers/contracts/get_documents/<contract_id>')
def get_documents(contract_id):
  try:
    userlib.check_handler_access("contracts","r")
    # получение информации о договоре по его ID
    contract_info = contractmodel.get_by({'_id': ObjectId(contract_id)}, {'documents':1, 'number':1, '_id':1})
    #data = contract_info['documents']['items'] if (contract_info.get('documents',{}) or {}).get('items') else []
    data = contract_info.get('documents')
    return routine.JSONEncoder().encode({'status': 'ok', 'data': data})
  except Exception,exc:
    excType = exc.__class__.__name__
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@post('/handlers/contracts/upload_document/<contract_id>')
def upload_document(contract_id):
  userlib.check_handler_access("contracts","w")
  try:
    data = request.json;
    if not contract_id:
      raise Exception("Не задан договор.")
    if not data:
      raise Exception("Нет данных на сохранение.")

    # получение информации о договоре по его ID
    contract_info = contractmodel.get_by({'_id': ObjectId(contract_id)}, {'orders':1, 'number':1, '_id':1})
    if not contract_info:
      raise Exception("Договор не найден.")
    usr = userlib.get_cur_user()

    # если попытка загрузить файл неподписанного договора, то необходимо удалить старый предаврительно
    if data.get('document_type') == 'not_signed_contract':
      contractapi.remove_not_signed_contract_document(ObjectId(contract_id), usr['email'])
    elif data.get('document_type') == 'signed_contract':
      contractapi.remove_signed_contract_document(ObjectId(contract_id), usr['email'])

    # сохранение информации о документе в БД
    new_document = contractapi.add_new_document(ObjectId(contract_id), data['name'], data['size'], data['google_file_id'], usr['email'], data.get('document_type'))

    return routine.JSONEncoder().encode({'status': 'ok', 'data': new_document})
  except Exception,exc:
    excType = exc.__class__.__name__
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})


@post('/handlers/contract/link_product')
def link_product():
  '''
  Привязка продукции из основного договора к продукции допника
  #1070
  {'linked_product':linked_product_obj, 'contract_id': this.model.get('_id'), 'current_product_id': id}
  '''
  userlib.check_handler_access("contracts","w")
  try:
    usr = userlib.get_cur_user()
    data = request.json;
    if not data:
      raise Exception("Нет данных на сохранение.")
    # получение информации об основном договоре по его number
    contract_info = contractmodel.get_by({'number': routine.strToInt(data['linked_product']['contract_number']) }, {'number':1, '_id':1, 'productions':1})
    if not contract_info:
      raise Exception("Указан не существующий договор.")
    # проверка на существование указанной продукции
    if not contract_info.get('productions') or len(contract_info.get('productions',[]))==0:
      raise Exception("Указанный договор не содрежит продукцию")

    product_info = None
    for row in contract_info.get('productions'):
      if row['number'] == routine.strToInt(data['linked_product']['product_number']):
        product_info = row
        break
    if not product_info:
      raise Exception("Указанный договор не содержит продукцию № {0}".format(data['linked_product']['product_number']))


    # получение информации о доп. соглашении и его продукции
    dop_info = contractmodel.get_by({'_id': ObjectId(data['contract_id']) }, {'number':1, '_id':1, 'productions':1, 'parent_id':1})
    if not contract_info:
      raise Exception("Указано не существующее доп. соглашение")
    # проверка на существование указанной продукции
    if not dop_info.get('productions') or len(dop_info.get('productions',[]))==0:
      raise Exception("Указанное доп. соглашение не содрежит продукцию")

    dop_product_info = None
    for row in dop_info.get('productions'):
      if row['_id'] == ObjectId(data['current_product_id']):
        dop_product_info = row
        break
    if not dop_product_info:
      raise Exception("Указанное доп. соглашение не содержит указанную пролдукцию")

    if contract_info['_id'] != dop_info.get('parent_id'):
      raise Exception("Текущее доп. соглашение не относится к указанному договору")

    # внесение информации о прилинкованной продукции из допника в основной договор
    contractmodel.update(
      {
        '_id': contract_info['_id'],
        'productions._id': product_info['_id']
      },
      {
        '$set':
        {
          'productions.$.linked_production':
          {
            "contract_id": str(dop_info['_id']),
            "contract_number": dop_info['number'],
            "product_id": str(dop_product_info['_id']),
            "product_number": dop_product_info['number'],
            "user": usr["email"],
            "date": datetime.datetime.utcnow()
          }
        }
      }
    )


    # внесение информации о прилинкованной продукции из основного договора в допник
    dop_linked_production = {
      "contract_id": str(contract_info['_id']),
      "contract_number": contract_info['number'],
      "product_id": str(product_info['_id']),
      "product_number": product_info['number'],
      "user": usr["email"],
      "date": datetime.datetime.utcnow()
    }

    contractmodel.update(
      {'_id': dop_info['_id'],'productions._id': dop_product_info['_id']},
      {'$set': {'productions.$.linked_production':dop_linked_production}}
    )

    return routine.JSONEncoder().encode({'status': 'ok', 'data': dop_linked_production})
  except Exception,exc:
    excType = exc.__class__.__name__
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

# @post('/handlers/contracts/upload_document/<contract_id>/<document_type>')
# def upload_document(contract_id, document_type):
#   '''
#   Аплоадинг документа
#   contract_id - идентификатор договора
#   document_type - тип документа: [additional, not_signed_contract, signed_contract]
#   '''
#   # локальная функция получения размера файла
#   def get_file_size( file):
#     file.seek(0, 2)  # Seek to the end of the file
#     size = file.tell()  # Get the position of EOF
#     file.seek(0)  # Reset the file position to the beginning
#     return size

#   return {'error':'OK'}

#   userlib.check_handler_access("contract","w")
#   from helpers.google_api import drive
#   from apiclient.http import MediaInMemoryUpload
#   # получение информации о договоре по его ID
#   contract_info = contractmodel.get_by({'_id': ObjectId(contract_id)}, {'order_number':1, 'number':1, '_id':1, 'order_id':1})
#   if not contract_info:
#     raise Exception("Договор не найден.")
#   order_data = ordermodel.get_by_args({'_id': contract_info['order_id']}, { 'documents':1})
#   order_google_folder_id =  (order_data.get('documents',{}) or {}).get('folder_id')
#   if not order_google_folder_id:
#     raise Exception("Для заявки не задан каталог документов.")
#   usr = userlib.get_cur_user()

#   results = []

#   uploads = request.files.getall('files[]')

#   for fieldStorage in uploads:

#   #for file_row in request.files:
#   #for name, fieldStorage in request.POST.items():

#     # if type(fieldStorage) is unicode:
#     #   continue

#     result = {}
#     result['name'] = urllib.unquote(fieldStorage.filename)
#     result['type'] = fieldStorage.type
#     result['size'] = get_file_size(fieldStorage.file)

#     # если попытка загрузить файл неподписанного договора, то необходимо удалить старый предаврительно
#     if document_type == 'not_signed_contract':
#       contractapi.remove_not_signed_contract_document(ObjectId(contract_id), usr['email'])
#     if document_type == 'signed_contract':
#       contractapi.remove_signed_contract_document(ObjectId(contract_id), usr['email'])

#     # ---------------
#     # сохранение файла на гугл диск
#     service = drive.get_service(config.gogle_folder_creator)
#     # проверяем, есть ли каталог - "Договоры" в папке документов заявки
#     tmp_folders = drive.get_folder_by_name(service, order_google_folder_id, u"Договоры")
#     # ID каталога - Договоры в каталоге документов заявки
#     dogovori_folder_id = None
#     if tmp_folders is not None and len(tmp_folders)>0:
#       dogovori_folder_id = tmp_folders[0]['id']
#     else:
#       dogovori_folder_id = drive.insert_folder(service, u"Договоры", "", order_google_folder_id)
#     if not dogovori_folder_id:
#       raise Exception("Ошибка создания дирректории - Договоры, в каталоге заявки.")

#     # проверяем, есть ли каталог с номером догвоора в дирректории - "Договоры"
#     tmp_folders = drive.get_folder_by_name(service, dogovori_folder_id, str(contract_info['number']))
#     contract_folder_id = None
#     if tmp_folders is not None and len(tmp_folders)>0:
#       contract_folder_id = tmp_folders[0]['id']
#     else:
#       # в дирректорию с номером договора кладем структуру каталогов, определенную в шаблоне
#       new_created_ids = drive.copy_folder(service,config.contracts_google_template_folder, str(contract_info['number']),dogovori_folder_id)
#       contract_folder_id = new_created_ids[0]['dest_id']
#       #contract_folder_id = drive.insert_folder(service, str(contract_info['number']), "", dogovori_folder_id)
#     if not contract_folder_id:
#       raise Exception("Ошибка создания дирректории с номером договора, в каталоге заявки.")

#     # находим в созданной структуре каталогов дирректорию - "Готовые"
#     tmp_folders = drive.get_folder_by_name(service, contract_folder_id, u"Готовые")
#     destination_folder_id = None
#     if tmp_folders is not None and len(tmp_folders)>0:
#       destination_folder_id = tmp_folders[0]['id']
#     if not destination_folder_id:
#       raise Exception("Ошибка создания структуры каталогов для хранения документов договора.")

#     # upload файла на gogle диск
#     media = MediaInMemoryUpload(fieldStorage.file.read())
#     new_file= drive.upload_file(config.gogle_folder_creator, destination_folder_id, fieldStorage.filename, media, fieldStorage.type)
#     if not new_file:
#       raise Exception("Не удалось сохранить документ в каталог договора.")
#     #----------------------

#     # физическое сохранение файла на диск
#     # inputfile = open('d:/test/%s'%result['name'], 'wb')
#     # inputfile.write(fieldStorage.file.read())
#     # inputfile.close()

#     # сохранение информации о документе в БД
#     contractapi.add_new_document(ObjectId(contract_id), result['name'], result['size'], new_file['id'], usr['email'], document_type)
#     results.append(result)
#   # i = 0;
#   # while i<10000000:
#   #   i+=1

#   return {'error':'OK'}

def create_plan_pays(contract_id):
  cur_user = userlib.get_cur_user()
  try:
    start = time.clock()
    contractapi.create_plan_pays(contract_id, cur_user['email'])
    print "Time _create_plan_pays is: ", time.clock() - start
  except Exception, exc:
    print('Error! create_plan_pays.' + str(exc))
    excType = exc.__class__.__name__
    print_exc()
    raise Exception("Ошибка обновления плановых платежей в календаре Google. Подробности: {0}.".format(str(exc)))



def delete_fact_calendar_event(contract_id, payment_id, event_id):
  cur_user = userlib.get_cur_user()
  try:
    start = time.clock()
    contractapi.delete_fact_calendar_event(contract_id, payment_id, event_id,cur_user['email'])
    print "Time _delete_fact_calendar_event is: ", time.clock() - start

  except Exception, exc:
    print('Error! delete_fact_calendar_event.' + str(exc))
    excType = exc.__class__.__name__
    print_exc()
    raise Exception("Ошибка обновления фактического платежа в календаре Google. Подробности: {0}.".format(str(exc)))



def update_fact_calendar_event(contract_id, payment_id, event_id):
  cur_user = userlib.get_cur_user()
  try:
    #_update_fact_calendar_event(contract_id, payment_id, event_id, cur_user['email'])
    #rq.enqueue(_update_fact_calendar_event,contract_id, payment_id, event_id, cur_user['email'])
    start = time.clock()
    contractapi.update_fact_calendar_event(contract_id, payment_id, event_id, cur_user['email'])
    print "Time _update_fact_calendar_event is: ", time.clock() - start
  except Exception, exc:
    print('Error! update_fact_calendar_event.' + str(exc))
    excType = exc.__class__.__name__
    print_exc()
    raise Exception("Ошибка обновления фактического платежа в календаре Google. Подробности: {0}.".format(str(exc)))



def check_workorders(contract):
  ''' функция проверяет, возможно ли создать наряды для договора'''
  cur_user = userlib.get_cur_user()
  try:
    for p in contract.get('payments',[]):
      if not p.get('work_order_id'):
        workorder = contractapi.add_workorder(contract, p, cur_user['email'], True)
        if not workorder:
          abort(400, u"Имеются ошибочные платежи")
  except Exception, exc:
    print('Error! Check workorders.' + str(exc))
    abort(400, u"Имеются пересекающиеся платежи")


# создать/изменить наряды для договора
def create_workorders(contract):
  cur_user = userlib.get_cur_user()
  is_changed = False
  for p in contract.get('payments',[]):
    if not p.get('work_order_id'):
      workorder = contractapi.add_workorder(contract, p, cur_user['email'])
      if workorder:
        p['work_order_id']= workorder['_id']
        p['work_id'] = workorder['work_id']
        p['work_order_number'] = workorder['number']
        is_changed = True
    else:
      contractapi.update_workorder(contract, p, cur_user['email'])

  if is_changed:
    contractmodel.update({'_id':contract['_id']},{'$set':contract})

@get('/handlers/contracts/get_next_sequence_product/<contract_id>')
def get_next_sequence_product(contract_id):
  try:
    userlib.check_handler_access('contracts','r')
    return routine.JSONEncoder().encode({'status': 'ok', 'data': contractapi.get_next_sequence_product(contract_id)})
  except Exception,exc:
    excType = exc.__class__.__name__
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})


@put('/handlers/contracts/save_draft')
def save_draft():
  # проверка доступа
  userlib.check_handler_access("contracts","w")
  cur_user = userlib.get_cur_user()   # текущий пользователь
  # данные от клиента
  data = request.json
  # получение идентификатора для нового договора
  if '_id' not in data or not data['_id']:
    data['_id'] = ObjectId()
    # если это доп. соглашение, то получаем для него номер из количества допников в договоре
    # иначе из глобального счетчика по договорам
    if data.get('parent_id'):
      addlist = contractmodel.get_list_by({'parent_id':ObjectId( data['parent_id'])},{})
      data['number'] = addlist.count()+1
    else:
      data['number'] = countersmodel.get_next_sequence("contracts")
      data['product_seq'] = 0
      data['product_seq_arr'] = []
    data['orders'] = data['draft']['orders']
    data['draft']['number'] = data['number']
    data['draft']['user_email']=data['user_email'] = cur_user['email']
    data['draft']['date_add']=data['date_add'] = datetime.datetime.utcnow()
    data['draft']['date_change']=data['date_change'] = datetime.datetime.utcnow()
    data['draft'] = routine.JSONEncoder().encode(data['draft'])

    contractapi.fill_Obj(data,['_id','client_id','factory_id','parent_id','order_id','production_id','unit_id','service_id','work_id', 'work_order_id'],'id')
    contractapi.fill_Obj(data,['_id','date','date_add','date_change','deadline','pay_date','sign_date','date_end','date_start','canceled_date','deleted_date'],'date')
    contractmodel.add(data)
  else:
    # проверка, если это основной договор, и редактируется на основании ДС, то нужно проверить, не подписан ли этот ДС уже
    if data['draft'].get('is_edited') and data['draft'].get('base_additional'):
      additional_id = data['draft'].get('base_additional').get('_id')
      additional = contractmodel.get(additional_id)
      if additional.get('is_signed')=='yes':
        raise Exception('ДС на основании которого редактируется договор, уже подписано')


    data['draft']['user_email']=cur_user['email']
    data['draft']['date_change']=datetime.datetime.utcnow()
    orders = [{'_id': ObjectId(x['_id']), 'number': x['number']} for x in data['draft']['orders']]
    contractmodel.update({'_id':ObjectId(data['_id'])},{'$set':{'draft':routine.JSONEncoder().encode(data['draft']), 'orders': orders }})
  try:
    # проверяем на наличие необходимой структуры каталогов на гугл диске
    # каталог документов создается только для основных договоров
    # для допников ID фолдера берется из основного
    #if not data.get('parent_id'):
    data['documents'] = contractapi.create_or_update_google_folder_catalogs(ObjectId(data['_id']))
  except Exception, exc:
    pass
  return JSONEncoder().encode(data)


# список финансовой статистики по договорам
@get('/handlers/contracts/get_finance_info')
def get_finance_info():
  flist = contractmodel.get_opened_finance_info()
  moredata = []
  month_data = []
  if flist:
    for c in contractmodel.get_list_by({'_id':{'$in':flist['ids']}}, {'debt':1, 'total':1, 'number':1, 'parent_number':1}):
      moredata.append({'_id':c.get('_id'), 'debt': c.get('debt',0), 'total':c.get('total',{'cost':0, 'plan':0, 'fact':0}), 'number': c.get('number'), 'parent_number':c.get('parent_number')})
  rest = {'rest':0, 'contracts':[]}
  # подсчет остатков по месяцам
  for r in statsapi.get_finance(True):
    dt = r.get('end_date')
    if dt:
      mid = dt.year*12+dt.month
      search_dt = [x for x in month_data if x['_id']==mid]
      if search_dt:
        search_dt = search_dt[0]
      else:
        search_dt = {'_id':mid, 'month':dt.month, 'year':dt.year, 'rest':0, 'contracts':[]}
        month_data.append(search_dt)
    else:
      search_dt = rest
    search_dt['rest'] = search_dt['rest']+r.get('size',0)
    sc_contract =  [x for x in search_dt['contracts'] if str(x['number'])==str(r.get('contract_number'))]
    if not sc_contract:
      search_dt['contracts'].append({'number':r.get('contract_number'), 'size': r.get('size',0), 'orders': [{'number':r.get('order_number'), 'size':r.get('size',0) }]})
    else:
      sc_contract[0]['size'] = sc_contract[0]['size']+r.get('size',0)
      sc_contract[0]['orders'].append({'number':r.get('order_number'), 'size':r.get('size',0)})

  month_data.sort(key=lambda x: x['_id'], reverse=True)
  return JSONEncoder().encode({'total':flist, 'more':moredata, 'bymonth': month_data, 'bymonth_rest':rest })

@get('/handlers/contracts/add_google_group/<contract_number>')
def add_google_group(contract_number):
  '''
    Ручное добавление групп гугл по номеру договора
  '''
  try:
    data = contractmodel.get_by({'number':routine.strToInt(contract_number)})
    contractapi.add_google_group(contract_number, data.get('client_name','Не задан'))
  except Exception,exc:
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@get('/handlers/contracts/check_on_google_group/')
def check_on_google_group():
  '''
    Проверка на существование гугл групп для подписанных и незавершенных договоров
  '''
  try:
    res = contractapi.check_on_google_group()
    return routine.JSONEncoder().encode({'status': 'ok','data':res})
  except Exception,exc:
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})


@get('/handlers/contracts/get_google_group_letter/<contract_number>')
def get_google_group_letter(contract_number):
  '''
    Формирование письма, отправляемое в google группу при создании группы
  '''
  try:
    data = contractmodel.get_by({'number':routine.strToInt(contract_number)})
    letter_info = contractapi.prepare_google_group_letter(data, [])
    return letter_info['body']
  except Exception,exc:
    print_exc()
    return routine.JSONEncoder().encode({'status': 'error','msg':str(exc)})

@get('/handlers/contracts/close_contract_if_all_workorders_completed/<number>')
def test_close_contract_if_all_workorders_completed(number):
  workorderapi.close_contract_and_all_workorders_if_works_completed(routine.strToInt(number))

def close_contract_if_all_workorders_completed(number, user_email='r'):
  if not config.use_worker:
    workorderapi.close_contract_if_all_workorders_completed(number, user_email)
  else:
    config.qu_default.enqueue_call(func=workorderapi.close_contract_if_all_workorders_completed, args=(number, user_email))

@post('/handlers/contracts/add_payment_comment')
def add_payment_comment():
  '''
    добавить комментарий к платежу
  '''
  # данные от клиента
  data = request.json
  contract = contractmodel.get_by({'_id':ObjectId(data['contract_id'])})
  if contract:
    contract_id = ObjectId(contract['_id'])
    del contract['_id']
    comment = data.get('comment')
    comment["date_add"] = contractapi.convertDt(comment["date_add"])
    if data.get('is_draft') and contract.get('draft'):
      draft = json.loads(contract.get('draft'))
      for p in draft.get('payments',[]):
        if str(p.get('_id'))==data.get('payment_id'):
          comments = p.get('comments',[])
          comment['_id'] = ObjectId()
          comments.append(comment)
          p['comments'] = comments
      contract['draft'] = routine.JSONEncoder().encode(draft)
      contractmodel.update({'_id':contract_id},{'$set':contract})
    else:
      for p in contract.get('payments'):
        if str(p.get('_id'))==data.get('payment_id'):
            comments = p.get('comments',[])
            comment['_id'] = ObjectId()
            comments.append(comment)
            p['comments'] = comments
      contractmodel.update({'_id':contract_id},{'$set':contract})
  return routine.JSONEncoder().encode(comment)

#----------------------------------------------------------------
# Исходящие
#----------------------------------------------------------------
@post('/handlers/contracts/outgoing')
def add_outgoing():
  userlib.check_handler_access("outgoing","w")
  from models import outgoingmodel, contragentmodel
  param = request.json
  usr = userlib.get_cur_user()
  param["user"] = usr['email']
  # добавить нового пользователя в таблицу contragent
  if not param.get('contragent_id') and param.get('correspondent'):
    elem = contragentmodel.add({
      'name':param.get('correspondent'),
      'client_id': ObjectId(param.get('correspondent_id')) if param.get('correspondent_id') else None,'type':'adresat'
    })
    param['contragent_id'] = elem['_id']
  param["date"] = datetime.datetime.utcnow()
  if param.get('correspondent_id'):
    param['correspondent_id'] = ObjectId(param.get('correspondent_id'))
  data = outgoingmodel.add_outgoing(param)
  del data['_id']
  data['date'] = data['date'].strftime('%d.%m.%Y')
  return JSONEncoder().encode({'status': 'ok', 'data': data})

@get('/handlers/contracts/outgoinglist/')
def get_outgoing():
  from models import outgoingmodel
  userlib.check_handler_access("outgoing","r")
  data = outgoingmodel.get_outgoing()
  return JSONEncoder().encode(data)

#----------------------------------------------------------------
# Входящие
#----------------------------------------------------------------
@post('/handlers/contracts/incoming')
def add_outgoing():
  userlib.check_handler_access("incoming","w")
  from models import incomingmodel, contragentmodel
  param = request.json
  usr = userlib.get_cur_user()
  param["user"] = usr['email']
  # добавить нового пользователя в таблицу contragent
  if not param.get('contragent_id') and param.get('correspondent'):
    elem = contragentmodel.add({
      'name':param.get('correspondent'),
      'client_id': ObjectId(param.get('correspondent_id')) if param.get('correspondent_id') else None,'type':'adresat'
    })
    param['contragent_id'] = elem['_id']
  param["date"] = datetime.datetime.utcnow()
  if param.get('correspondent_id'):
    param['correspondent_id'] = ObjectId(param.get('correspondent_id'))
  data = incomingmodel.add(param)
  del data['_id']
  data['date'] = data['date'].strftime('%d.%m.%Y')
  return JSONEncoder().encode({'status': 'ok', 'data': data})

@get('/handlers/contracts/incominglist/')
def get_outgoing():
  from models import incomingmodel
  userlib.check_handler_access("incoming","r")
  data = incomingmodel.get()
  return JSONEncoder().encode(data)
