# -*- coding: utf-8 -*-
from datetime import datetime

from routine import JSONEncoder
from libraries import userlib
from helpers.main import decode_order_status
from helpers.google import spreadsheets
from bottle import (
    route,
    template,
    response,
)
from config import (
    VERSION,
    db,
    order_export_spreadsheet_id,
)

# orders with lower chance won't be exported
MIN_ORDER_CHANCE = 60
SPREADSHEET_LIST_NAME = u'Данные'
DATE_TIME_FORMAT = '%d.%m.%Y %H:%M'


@route('/order-export')
def order_export():
    """

    :return:
    """
    userlib.check_page_access('order-export', 'r')
    return template(
        'views/order-export',
        version=VERSION,
        current_user=userlib.get_cur_user(),
        menu=userlib.get_menu(),
    )


@route('/stats/crm/order-export')
def order_export_to_spreadsheet():
    """

    :return:
    """
    userlib.check_page_access('order-export', 'r')
    response.content_type = 'application/json'
    orders_db = db.get_collection('orders')

    rows = []
    for order in (order for order in orders_db.find({'condition_type': 'промежуточное'})):
        order['l_state'] = decode_order_status(order['l_state'])
        try:
            condition = u'{}'.format(decode_order_status(order['condition']))

            condition_type = order.get('condition_type', False)
            if condition_type is False or condition_type != 'промежуточное':
                continue

            if isinstance(order['l_state_date'], datetime):
                l_state_date = order['l_state_date']
            else:
                l_state_date = 'Дата не задана'

            client_group = order.get('client_group', 'Группа не задана')
            if client_group is None:
                client_group = ''

            chance = order.get('chance', 0)
            if int(chance) < MIN_ORDER_CHANCE:
                continue

            rows.append([
                order['number'],
                order['manager'],
                order['client'],
                client_group,
                order.get('markup', 'Наценка не задана'),
                order['sq'],
                order['price'],
                order.get('chance', 'Вероятность не подсчитана'),
                condition,
                l_state_date.strftime(DATE_TIME_FORMAT)
            ])
        except Exception as e:
            print 'Got exception while processing export orders: {}'.format(e)
            response.status = 500
            response.content_type = 'application/json'
            return JSONEncoder().encode({
                'status': 'error',
                'data': {
                    'msg': 'Ошибка сервера'
                }
            })

    if not rows:
        response.status = 404
        response.content_type = 'application/json'
        return JSONEncoder().encode({
            'status': 'error',
            'data': {
                'msg': 'Заявки для выгрузки не найдены'
            }
        })

    spreadsheet_list_range = u'A2:J{}'.format(len(rows) + 1)
    spreadsheets.spreadsheet_update(
        order_export_spreadsheet_id,
        SPREADSHEET_LIST_NAME,
        spreadsheet_list_range,
        rows,
    )

    response.status = 200
    return JSONEncoder().encode({
        'status': 'success',
        'data': {
            'redirect_url': 'https://docs.google.com/spreadsheets/d/{}'.format(
                order_export_spreadsheet_id
            ),
            'msg': 'Данные успешно выгружены'
        }
    })
