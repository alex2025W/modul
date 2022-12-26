#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route, get, post, put, request, error, abort, response, debug
import datetime
from bson.objectid import ObjectId
from libraries import userlib
from models import usermodel, msgmodel
from models import ordermodel
from models import dirmodel
import routine
from dateutil.relativedelta import *
from dateutil.parser import parse
import config


@get('/handlers/errors/search/')
def search():
    """get  full work order info witj fact works"""
    userlib.check_handler_access("errors", "r")
    result = []
    try:
        # search users
        users = []
        # Filter
        filter = {'enabled': True}
        # get parameters
        param = request.query.decode()
        if 'users' in param and param['users'] != "":
            users = param['users'].split(";")
        # get data
        if len(users) > 0:
            filter['manager'] = {'$in': users}

        # получение ошибок из стаблицы системных сообщений пользователя
        msgData = msgmodel.get_by(filter)
        for item in msgData:
            if item['type'] == 'ps':
                item['msg'] = 'Необходимо установить точную цену и состав заявки'
            elif item['type'] == 'p':
                item['msg'] = 'Необходимо установить точную цену заявки'
            elif item['type'] == 's':
                item['msg'] = 'Необходимо установить точный состав заявки'
            elif item['type'] == 'de':
                item['msg'] = 'Срок нахождения заявки в текущем состоянии превышен. Требуется дальнейшее движение по заявке или перевод её в одно из закрывающих состояний.'
            result.append(item)

        # получение информации о просроченных задачах
        badHistoryData = ordermodel.get_overdue_tasks(users)
        for item in badHistoryData:
            item['msg'] = 'Просроченная задача: {0}'.format(item['condition'])
            result.append(item)

        # получение информации о заявках у которых вероятность выше 50% и нет даты закрытия
        badHistoryData = ordermodel.get_empty_finish_date_tasks(users)
        for item in badHistoryData:
            item['msg'] = 'Вероятность выше 50% и нет даты закрытия'
            result.append(item)

        # сортировка данных
        result.sort(key=lambda x: (x['manager'], x['datetime']))

    except Exception, exc:
        excType = exc.__class__.__name__
        print('Error. search_errors.  Exception: ' + str(exc))
    return routine.JSONEncoder().encode({'status': 'ok', 'msg': '', 'result': routine.JSONEncoder().encode(result)})


@get('/handlers/errors/check/')
def check_all_orders():
    """check on actual errors and close not actual"""
    from handlers import orderhandler
    from apis.crm import orderapi
    import time
    userlib.check_handler_access("errors", "r")
    result = {}
    try:
        users = []
        filter = {'enabled': True}
        msgData = msgmodel.get_by(filter)
        for item in msgData:
            check_res = orderapi.ch_ordr(item['type'], str(item['order_id']))
            if check_res == True:
                # обновление состояния сообщения
                msgmodel.update({'type': item['type'], 'order_id': item['order_id']}, {
                                'enabled': False, 'closed_by_manager': False})
                # обновляем данные в истории ошибок
                usr = userlib.get_cur_user()
                ordermodel.close_err_history(
                    item['order_id'], item['type'], usr['email'])
                result[str(item['_id'])] = check_res
        return routine.JSONEncoder().encode({'status': 'ok', 'msg': '', 'result': routine.JSONEncoder().encode(result)})
    except Exception, exc:
        excType = exc.__class__.__name__
        print('Error. check_all_orders.  Exception: ' + str(exc))
    return routine.JSONEncoder().encode({'status': 'ok', 'msg': '', 'result': routine.JSONEncoder().encode(result)})


def check_order(order_id):
    '''
    Проверка конкретной заявки на ошибки. Очистка коллекции сообщений от ошибок по заявке.
    order_id - object
    '''
    from handlers import orderhandler
    from apis.crm import orderapi
    try:
        msgData = msgmodel.get_by({'order_id': order_id, 'enabled': True})
        for item in msgData:
            check_res = orderapi.ch_ordr(item['type'], str(item['order_id']))
            if check_res == True:
                msgmodel.update({'type': item['type'], 'order_id': item['order_id']}, {
                                'enabled': False, 'closed_by_manager': False})
                # обновляем данные в истории ошибок
                usr = userlib.get_cur_user()
                ordermodel.close_err_history(
                    item['order_id'], item['type'], usr['email'] if usr else '')
    except Exception, e:
        raise e
