#!/usr/bin/python
# -*- coding: utf-8 -*-
import logging
import time

from json import dumps
from datetime import datetime

from bottle import route
from bottle import template
from bottle import response
from bottle import request

import config
from libraries import userlib

from helpers.clickhouse import client
from helpers.clickhouse import current_data_version_get
from helpers.clickhouse import DEFAULT_DATETIME_FORMAT

DEFAULT_QUERY_INTERVAL_DAYS = 7


def to_seconds(date):
    return time.mktime(date.timetuple())


def convert_datetime(string, datetime_format):
    """
    Converting datetime string into Clickhouse datetime
    format. Like: YYYY-MM-DD

    :param string: datetime string
    :param datetime_format: pythonic format of given datetime string
    :return: Clickhouse-formatted datetime string
    """
    if not isinstance(string, str):
        return False

    try:
        d = datetime.strptime(string, datetime_format)
        return d.strftime(DEFAULT_DATETIME_FORMAT)
    except ValueError:
        return False


@route('/money')
def money():
    """

    :return:
    """

    userlib.check_page_access('money', 'r')
    return template(
        'views/money',
        version=config.VERSION,
        current_user=userlib.get_cur_user(),
        menu=userlib.get_menu(),
    )


@route('/money/api/planned-expenses')
def planned_expenses():
    """

    :return:
    """
    result = []
    conditions = []
    userlib.check_page_access('money', 'r')
    response.content_type = 'application/json'

    date_from = request.query.get('date_from', None)
    date_to = request.query.get('date_to', None)

    data_version = current_data_version_get()
    if data_version is None:
        logging.error('Unable to load current data version of ClickHouse MoneyData')
        response.status = 500
        return dumps([])

    query = '''
        SELECT 
            * 
        FROM 
            planned_expenses
        WHERE 
            version = {} 
        AND 
    '''.format(data_version)

    if any([date_from, date_to]):
        if date_from:
            date_from = convert_datetime(date_from, '%d.%m.%Y')
            if not date_from:
                response.status = 400
                return {
                    'status': 'error',
                    'msg': 'Unable to parse datetime "From"'
                }
            else:
                conditions.append("created >= '{}'".format(date_from))

        if date_to:
            date_to = convert_datetime(date_to, '%d.%m.%Y')
            if not date_to:
                response.status = 400
                return {
                    'status': 'error',
                    'msg': 'Unable to parse datetime "To"'
                }
            else:
                conditions.append("created <= '{}'".format(date_to))

        if len(conditions) == 1:
            query += ' {}'.format(conditions[0])
        else:
            query += ' AND '.join(conditions)

    query += ' ORDER BY created'

    try:
        rows = client.execute(query)
    except Exception as e:
        logging.critical('Unable to query "planned_expenses" table. Reason: {}'.format(e))
        response.status = 500
        return dumps([])

    for row in rows:
        row = list(row)
        row[1] = int(to_seconds(row[1]))
        result.append(row)

    return dumps(result)


@route('/money/api/planned-incomes')
def planned_incomes():
    """

    :return:
    """
    result = []
    conditions = []
    userlib.check_page_access('money', 'r')
    response.content_type = 'application/json'

    date_from = request.query.get('date_from', None)
    date_to = request.query.get('date_to', None)

    data_version = current_data_version_get()
    if data_version is None:
        logging.error('Unable to load current data version of ClickHouse MoneyData')
        response.status = 500
        return dumps([])

    query = '''
        SELECT 
            * 
        FROM 
            planned_incomes 
        WHERE 
            version = {} 
        AND 
    '''.format(data_version)

    if any([date_from, date_to]):
        if date_from:
            date_from = convert_datetime(date_from, '%d.%m.%Y')
            if not date_from:
                response.status = 400
                return {
                    'status': 'error',
                    'msg': 'Unable to parse datetime "From"'
                }
            else:
                conditions.append("created >= '{}'".format(date_from))

        if date_to:
            date_to = convert_datetime(date_to, '%d.%m.%Y')
            if not date_to:
                response.status = 400
                return {
                    'status': 'error',
                    'msg': 'Unable to parse datetime "To"'
                }
            else:
                conditions.append("created <= '{}'".format(date_to))

        if len(conditions) == 1:
            query += ' {}'.format(conditions[0])
        else:
            query += ' AND '.join(conditions)

    query += ' ORDER BY created'

    try:
        rows = client.execute(query)
    except Exception as e:
        logging.critical('Unable to query "planned_incomes" table. Reason: {}'.format(e))
        response.status = 500
        return dumps([])

    for row in rows:
        row = list(row)
        row[1] = int(to_seconds(row[1]))
        result.append(row)

    return dumps(result)


@route('/money/api/planned-balance')
def planned_balance():
    """

    :return:
    """
    result = []
    conditions = []
    userlib.check_page_access('money', 'r')
    response.content_type = 'application/json'

    date_from = request.query.get('date_from', None)
    date_to = request.query.get('date_to', None)

    data_version = current_data_version_get()
    if data_version is None:
        logging.error('Unable to load current data version of ClickHouse MoneyData')
        response.status = 500
        return dumps([])

    query = '''
        SELECT 
            * 
        FROM 
            planned_balance
        WHERE 
            version = {} 
        AND 
    '''.format(data_version)

    if any([date_from, date_to]):
        if date_from:
            date_from = convert_datetime(date_from, '%d.%m.%Y')
            if not date_from:
                response.status = 400
                return {
                    'status': 'error',
                    'msg': 'Unable to parse datetime "From"'
                }
            else:
                conditions.append("created >= '{}'".format(date_from))

        if date_to:
            date_to = convert_datetime(date_to, '%d.%m.%Y')
            if not date_to:
                response.status = 400
                return {
                    'status': 'error',
                    'msg': 'Unable to parse datetime "To"'
                }
            else:
                conditions.append("created <= '{}'".format(date_to))

        if len(conditions) == 1:
            query += ' {}'.format(conditions[0])
        else:
            query += ' AND '.join(conditions)

    query += ' ORDER BY created'

    try:
        rows = client.execute(query)
    except Exception as e:
        logging.critical('Unable to query "planned_balance" table. Reason: {}'.format(e))
        response.status = 500
        return dumps([])

    for row in rows:
        row = list(row)
        row[1] = int(to_seconds(row[1]))
        result.append(row)

    return dumps(result)
