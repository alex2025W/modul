#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route, template
import urllib
import config
import json
from libraries import userlib
from models import paymentmodel, contractmodel, dirmodel
from routine import  JSONEncoder
from controllers import clientcontroller

@route('/contracts')
def get_contracts():
  '''
    Список договоров
  '''
  userlib.check_page_access('contracts','r')
  # парамтеры для работы с GOOGLE API
  google_api_config = JSONEncoder().encode({'client_id': config.google_api_config['client_id'], 'scope': config.google_api_config['scope']})
  return template(
    'frontend/contract/templates/index',
    current_user=userlib.get_cur_user(),
    version = config.VERSION,
    menu=userlib.get_menu(),
    dicts=clientcontroller.get_dictionary(False),
    payment_types=JSONEncoder().encode(paymentmodel.get_type_list()),
    payment_uses=JSONEncoder().encode(paymentmodel.get_use_list()),
    currency_list=JSONEncoder().encode(paymentmodel.get_currency_list()),
    all_users=userlib.get_crm_user_list() ,
    factory_list = JSONEncoder().encode(contractmodel.get_factory_list()),
    google_api_config =  google_api_config,
    order_positions = JSONEncoder().encode([x for x in dirmodel.get_list_by({'type':17, 'stat':'enabled'},{'number':1, 'name':1, 'note':1 })]))

@route("/factpayments")
def get_factpayments():
  '''
    Список фактических платежей
  '''
  userlib.check_page_access('factpayments','r')
  return template('views/factpayments', current_user=userlib.get_cur_user(), version = config.VERSION, menu=userlib.get_menu(), dicts=clientcontroller.get_dictionary(False), currency_list=JSONEncoder().encode(paymentmodel.get_currency_list()))
