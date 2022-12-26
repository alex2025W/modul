#!/usr/bin/python
# -*- coding: utf-8 -*-
import logging
import time

from json import dumps

from bottle import route
from bottle import template
from bottle import response
from bottle import request

import config
from libraries import userlib

from helpers.clickhouse import client
from helpers.clickhouse import timestamp_datetime


DEFAULT_QUERY_INTERVAL_DAYS = 7


def to_seconds(date):
    return time.mktime(date.timetuple())


@route('/sales-funnel')
@route('/sales-funnel/')
def money():
    """

    :return:
    """

    userlib.check_page_access('sales-funnel', 'r')
    return template(
        'views/sales-funnel',
        version=config.VERSION,
        current_user=userlib.get_cur_user(),
        menu=userlib.get_menu(),
    )


@route('/sales-funnel/api/statuses')
def sales_funnel():
    """

    :return:
    """
    result = []
    userlib.check_page_access('sales-funnel', 'r')
    response.content_type = 'application/json'
    date_from = request.query.get('date_from', None)
    date_to = request.query.get('date_to', None)
    datetime_conditions = []

    query = '''
        SELECT 
            count(*) AS count, 
            status 
        FROM (
            SELECT 
                number, 
                all_orders.status AS status, 
                created 
            FROM 
                default.orders filtered_orders,
                (
                    SELECT 
                        number, stc.text AS status
                    FROM 
                        default.order_history oh, 
                        default.status_to_code stc
                    WHERE 
                        oh.status in ('CONTRACT_SIGN', 'INTEREST', 'SEND_KP') 
                    AND 
                        oh.status = stc.status 
                    GROUP BY 
                        number, stc.text
                    UNION ALL 
                    SELECT 
                        number, 'Создано' AS status
                    FROM 
                        default.orders
                ) AS all_orders
            WHERE 
                filtered_orders.number = all_orders.number
            AND
        
    '''

    if any([date_from, date_to]):
        if date_from:
            # todo:
            date_from = int(date_from) + 3600
            datetime_conditions.append("filtered_orders.created >= '{}'".format(timestamp_datetime(date_from)))

        if date_to:
            # todo:
            date_to = int(date_to) + 3600
            datetime_conditions.append("filtered_orders.created <= '{}'".format(timestamp_datetime(date_to)))

    if len(datetime_conditions) == 1:
        query += ' {}'.format(datetime_conditions[0])
    else:
        query += ' AND '.join(datetime_conditions)

    query += ') GROUP BY status ORDER BY count DESC'

    try:
        rows = client.execute(query)
    except Exception as e:
        logging.critical('Unable to query "planned_expenses" table. Reason: {}'.format(e))
        response.status = 500
        return dumps([])

    for row in rows:
        result.append(row)

    return dumps(result)
