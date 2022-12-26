#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route, view, get, post, put, request, error, abort, response, debug, static_file, template, redirect
import urllib
import config
from models import usermodel, schedulerlogmodel, clientmodel, ordermodel, dirmodel
from libraries import userlib
from routine import JSONEncoder
from apis.client import clientapi


def get_users():
    data = []
    acc = userlib.get_crm_access_user_list()
    args = None
    if acc:
        args = {'email': {'$in': acc}}
    users = usermodel.get_all(args)
    for u in users:
        data.append(u)
    return data


def get_clients():
    # вводим ограничения для пользователей с расширенными правами доступа
    acc = userlib.get_crm_access_user_list()
    args = None
    if acc:
        args = {'manager': {'$in': acc}}
    clients = clientmodel.get_all_by(args)
    data = []
    for dr in clients:
        if 'inn' not in dr:
            dr['inn'] = ''
        data.append(dr)
    return data


def get_dictionary(all):
    dirs = dirmodel.get_all(all)
    data = []
    for dr in dirs:
        if 'price' not in dr:
            dr['price'] = 'disabled'
        if 'structure' not in dr:
            dr['structure'] = 'disabled'
        data.append(dr)
    return data


@route('/app')
@route('/crm')
def applications():
    userlib.check_page_access("app", "r")
    # получаем все доступные тэги клиентов
    clients_tags = JSONEncoder().encode(clientapi.get_clients_tags())

    return template(
        'views/crm/client',
        current_user=userlib.get_cur_user(),
        version=config.VERSION,
        dicts=get_dictionary(False),
        all_users=userlib.get_crm_user_list(),
        users=get_users(),
        menu=userlib.get_menu(),
        show_failures_orders=usermodel.check_role_credentials(
            userlib.get_cur_user()['email'], ['pages', 'app', 'additional', 'failures']),
        clients_tags=clients_tags,
        activate_managers=ordermodel.get_active_managers(),
        orders_conditions=dirmodel.OrderConditions
    )


@route('/client')
def client():
    userlib.check_page_access("clients", "r")
    return template(
        'views/crm/clientlist',
        current_user=userlib.get_cur_user(),
        version=config.VERSION,
        clients=get_clients(),
        menu=userlib.get_menu(),
        orders_conditions=dirmodel.OrderConditions
    )


@route('/client-card/<key>')
def get_clientcard(key):
    userlib.check_page_access("clients", "r")

    if (key != 'new'):
        cl = clientmodel.get(key)
        acc = userlib.get_crm_access_user_list()
        if acc and cl['manager'] not in acc:
            abort(403, "Доступ запрещен")
    else:
        cl = {'_id': '', 'name': u'Новый'}

    # получаем все доступные тэги клиентов
    clients_tags = JSONEncoder().encode(clientapi.get_clients_tags())

    return template('views/crm/clientcard', current_user=userlib.get_cur_user(), version=config.VERSION, is_add_order=False, dicts=get_dictionary(False), client=cl, client_data=None, menu=userlib.get_menu(), all_users=userlib.get_crm_user_list(), clients_tags=clients_tags, orders_conditions=dirmodel.OrderConditions)


@route('/client-card/new/')
@route('/client-card/new/<name_or_id>')
def new_clientcard(name_or_id=""):
    userlib.check_page_access("clients", "r")
    ncl = None
    if name_or_id:
        try:
            ncl = clientmodel.get(name_or_id)
        except Exception, e:
            pass
    acc = userlib.get_crm_access_user_list()
    if acc and ncl and ncl['manager'] not in acc:
        abort(403, "Доступ запрещен")
    cl = {'_id': '', 'name': name_or_id}
    if ncl:
        ncl['id'] = ncl['_id']
        del ncl['_id']
        ncl = JSONEncoder().encode(ncl)
    # получаем все доступные тэги клиентов
    clients_tags = JSONEncoder().encode(clientapi.get_clients_tags())
    return template(
        'views/crm/clientcard',
        current_user=userlib.get_cur_user(),
        version=config.VERSION,
        is_add_order=True,
        dicts=get_dictionary(False),
        client=cl,
        client_data=ncl,
        menu=userlib.get_menu(),
        all_users=userlib.get_crm_user_list(),
        clients_tags=clients_tags,
        orders_conditions=dirmodel.OrderConditions
    )


@route('/clients_category')
def get_clients_category():
    userlib.check_page_access("clients_category", "r")

    return template('views/crm/clients_category', current_user=userlib.get_cur_user(), version=config.VERSION, menu=userlib.get_menu(), dicts=get_dictionary(False), last_update_date=schedulerlogmodel.get_last_date('abc_client_history'), orders_conditions=dirmodel.OrderConditions)
