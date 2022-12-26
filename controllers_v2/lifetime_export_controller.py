#!/usr/bin/python
# -*- coding: utf-8 -*-

from datetime import datetime
from datetime import timedelta
from copy import copy
from traceback import print_exc

from bottle import (
    route,
    template,
    response,
    request,
)

from config import (
    VERSION,
    lifetime_report_google_spreadsheet_id,
)
from routine import (
    strToDateTime,
    strToInt,
    moscow_tz_offset,
)
from helpers.google.spreadsheets import spreadsheet_update


from libraries import userlib


@route('/lifetime-export')
def lifetime_export():
    """

    :return:
    """
    userlib.check_page_access('lifetime', 'r')
    return template(
        'views/lifetime-export',
        version=VERSION,
        current_user=userlib.get_cur_user(),
        menu=userlib.get_menu(),
    )


@route('/stats/crm/lifetime')
def crm_vers10():
    # type: () -> dict
    """
    #1987 CRM. Жизненный цикл (lifetime) - выгрузка
    -----
    Номер календарной недели создания заявки
    Код заявки
    Дата создания завявки
    Первый контакт
    Менеджер заявки
    АО
    АЗ
    АЗ / АО
    Номер календарной недели состояния
    Дата и время состояния
    Тип состояния
    Состояние заявки
    Уточнение состояния
    Состояние первое?
    Вероятность
    Инициатор контакта
    Контактное лицо
    Дата сдачи объекта
    Дата подписания договора
    Примечание
    Автор примечания

  :return:
  """
    from models import ordermodel, usermodel, dirmodel

    userlib.check_page_access('stats', 'r')
    userlib.get_cur_user()

    date_from = request.query.get('from')
    date_to = request.query.get('to')
    order_ids = request.query.get('orders')

    spreadsheet_utl = 'https://docs.google.com/spreadsheets/d/{}/edit#gid=0'.format(
        lifetime_report_google_spreadsheet_id
    )

    if order_ids:
        order_ids = [int(order_id) for order_id in order_ids.split(',') if order_id.isdigit()]

    if not date_from:
        if not order_ids:
            return {
                'status': 'error',
                'msg': u'Wrong query. Date "from" or order ids are required'
            }

    try:
        if date_from:
            try:
                date_from = datetime.strptime(date_from, '%Y-%m-%d').replace(
                    hour=0,
                    minute=0,
                    second=0,
                    microsecond=0
                )
            except ValueError:
                return {'status': 'error', 'msg': u'Wrong "from" date format. Correct format: 2018-03-21'}

        if date_to:
            try:
                date_to = datetime.strptime(date_to, '%Y-%m-%d').replace(
                    hour=23,
                    minute=59,
                    second=59,
                    microsecond=0
                )
            except ValueError:
                return {'status': 'error', 'msg': u'Wrong "to" date format. Correct format: 2018-03-21'}

        if all([date_from, date_to]):
            if date_from >= date_to:
                return {'status': 'error', 'msg': u'Date "from" must be lower than date "to"'}

        users = {}
        for row in usermodel.get_list(None, {'email': 1, 'fio': 1}):
            users[row['email']] = row

        conditions = dirmodel.get_conditions()

        order_filter = {}
        if order_ids:
            order_filter['number'] = {'$in': order_ids}

        if date_from:
            date_from_condition = {'added': {'$gte': date_from}}
            if '$and' not in order_filter:
                order_filter['$and'] = [date_from_condition]
            else:
                order_filter['$and'].append(date_from_condition)

        if date_to:
            date_to_condition = {'added': {'$lte': date_to}}
            if '$and' not in order_filter:
                order_filter['$and'] = [date_to_condition]
            else:
                order_filter['$and'].append(date_to_condition)

        try:
            db_res = ordermodel.do_aggregate([
                {'$project': {
                    '_id': 1,
                    'number': 1,
                    'added': 1,
                    'history': 1,
                    'manager': 1,
                    'client': 1,
                    'activity': 1,
                    'activity_significant': 1,
                    'activity_percent': 1,
                    'close_date': 1,
                    'sq': 1,
                    'price': 1,
                }},
                {'$unwind': '$history'},
                {'$project': {
                    'datetime_str': {'$concat': [
                        {'$substr': ['$history.datetime', 6, 4]},
                        {'$substr': ['$history.datetime', 3, 2]},
                        {'$substr': ['$history.datetime', 0, 2]}
                    ]},

                    'datetime': '$history.datetime',
                    'finishdate': '$history.finishdate',
                    'enddate': '$history.enddate',
                    'chance': '$history.chance',
                    'prev_chance': '$history.prev_chance',
                    'condition_type': '$history.condition_type',
                    'condition': '$history.condition',
                    'reason': '$history.reason',
                    'initiator': '$history.initiator',
                    'contact': '$history.contact',
                    'firstcontact': '$history.firstcontact',
                    'comments': '$history.comments',
                    '_id': 1,
                    'number': 1,
                    'client': 1,
                    'added': 1,
                    'manager': 1,
                    'activity': 1,
                    'activity_significant': 1,
                    'activity_percent': 1,
                    'close_date': 1,
                    'sq': 1,
                    'price': 1,
                }},
                {'$match': order_filter},
                {'$sort': {'number': 1, 'datetime_str': 1}}
            ])
        except Exception as e:
            if 'Sort exceeded memory limit' in e.message:
                return {'status': 'error', 'msg': u'Too many results. Please correct your query'}
            raise Exception(e.message)

        result = []
        data = []
        data += db_res
        for row in data:
            row['datetime'] = strToDateTime(row['datetime'])

        data.sort(key=lambda x: (x['number'], x['datetime']))

        # группировка данных по заявкам
        # получение последней даты заявки, если между последней датой и датой заданной в условии
        # промежуток больше недели, дублируем последнее состояние, но с новой датой
        grouped_data = {}
        finish_date = datetime.now().replace(hour=23, minute=59, second=59, microsecond=0)
        finish_date_calendar_week = strToInt(finish_date.strftime("%V"))

        for row in data:
            if str(row['_id']) not in grouped_data:
                grouped_data[str(row['_id'])] = []
            grouped_data[str(row['_id'])].append(row)

        data = []

        for _id in grouped_data:
            items = grouped_data[_id]
            if len(items) == 1:
                item = items[0]
                item['is_first_state'] = True
                item['is_last_state'] = True
            else:
                last_item = items[-1]
                first_item = items[0]
                first_item['is_first_state'] = True
                last_item['is_last_state'] = True

                # учитываем только тех, у кого состояние не закрывающее
                if last_item['condition_type'] != u"закрывающее":
                    last_item_calendar_week = strToInt(
                        last_item['datetime'].strftime("%V") if last_item['datetime'] else ''
                    )
                    if finish_date_calendar_week > last_item_calendar_week:
                        tmp_row = copy(last_item)
                        tmp_row['datetime'] = finish_date
                        tmp_row['is_virtual'] = True
                        tmp_row['is_last_state'] = False
                        tmp_row['is_first_state'] = False

                        if len(items) > 1:
                            items.append(tmp_row)

            data.extend(items)

        order_number = None
        first_contact = None
        is_first_state = False
        prev_calendar_week = None
        prev_row = None

        for row in data:
            current_calendar_week = strToInt(row['datetime'].strftime("%V") if row['datetime'] else '')
            kind_of_state = ''
            if row.get('is_first_state'):
                kind_of_state = 'первое'
            elif row.get('is_last_state'):
                kind_of_state = 'последнее'

            if order_number != row['number']:
                order_number = row['number']
                first_contact = row.get('firstcontact')
                is_first_state = True
                kind_of_state = 'первое'
                prev_calendar_week = current_calendar_week
                prev_row = None

            comment = row.get('comments', [])[0] if len(row.get('comments', [])) > 0 else None
            tmp = {
                'week_number': row['added'].strftime("%V") if row.get('added') else '',
                'year': row['added'].year if row.get('added') else '',
                'number': row['number'],
                'client': row.get('client', ''),
                'sq': row['sq'],
                'price': row['price'],
                'added': (row['added'] + timedelta(hours=moscow_tz_offset)).strftime(
                    '%d.%m.%Y %H:%M:%S') if row.get('added') else '',
                'firstcontact': first_contact,
                'manager': users[row['manager']].get('fio') if row['manager'] in users and users[
                    row['manager']] else '-',
                'activity': row.get('activity', 0),
                'activity_significant': row.get('activity_significant', 0),
                'activity_percent': row.get('activity_percent', 0),
                'state_week_number': current_calendar_week,
                'state_year': row['datetime'].year if row['datetime'] else '',
                'state_date': row['datetime'].strftime('%d.%m.%Y %H:%M:%S') if not row.get('is_virtual') else '',
                'state_type': row.get('condition_type', ''),
                'state_condition': conditions.get(row['condition'], ''),
                'state_condition_reason': row.get('reason', ''),
                'state_is_first': 'да' if is_first_state else 'нет',
                'kinde_of_state': kind_of_state,
                'state_chance': row.get('chance', ''),
                'state_initiator': 'мы' if row.get('initiator') == 'we' else 'они',
                'state_contact': row.get('contact', ''),
                'state_finishdate': row.get('finishdate', ''),
                'state_closedate': row.get('close_date').strftime('%d.%m.%Y') if row.get('close_date') else None,
                'state_comment': comment.get('text', '') if comment else '',
                'state_comment_author': users[comment['manager']].get('fio') if comment and comment.get(
                    'manager') and comment.get('manager') in users else '',
            }

            if current_calendar_week > prev_calendar_week + 1:
                i = prev_calendar_week + 1
                while i < current_calendar_week:
                    copy_tmp = copy(prev_row)
                    copy_tmp['state_week_number'] = i
                    copy_tmp['state_date'] = ''
                    result.append(copy_tmp)
                    i += 1

            prev_calendar_week = current_calendar_week
            prev_row = tmp
            result.append(tmp)
            is_first_state = False

        values = []
        for row in sorted(result, key=lambda x: x['number']):
            values.append([
                row['year'],
                row['week_number'],
                row['number'],
                row['client'],
                row['added'],
                row['sq'],
                row['price'],
                row['firstcontact'],
                row['manager'],
                row['activity'],
                row['activity_significant'],
                row['activity_percent'],
                row['state_year'],
                row['state_week_number'],
                row['state_date'],
                row['state_type'],
                row['state_condition'],
                row['state_condition_reason'],
                # row['state_is_first'],
                row['kinde_of_state'],
                row['state_chance'],
                row['state_initiator'],
                row['state_contact'],
                row['state_finishdate'],
                row['state_closedate'],
                row['state_comment'],
                row['state_comment_author']
            ])

        if not values:
            raise ValueError('Data not found for query: {}'.format(request.query_string))

        result = spreadsheet_update(
            lifetime_report_google_spreadsheet_id,
            u'Данные',
            'A2:Z{}'.format(len(values) + 1),
            values
        )

        if result is not False:
            response.status = 303
            response.set_header('Location', spreadsheet_utl)
        else:
            return {'status': 'error', 'msg': 'Unable to write date into spreadsheet: {}'.format(spreadsheet_utl)}
    except Exception, exc:
        print('Error! crm_lifetime ' + str(exc))
        print_exc()
        return {'status': 'error', 'msg': 'Error! Msg: ' + str(exc)}
