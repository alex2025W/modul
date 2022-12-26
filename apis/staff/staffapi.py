#!/usr/bin/python
# -*- coding: utf-8 -*-
import datetime
from datetime import date, timedelta
from routine import JSONEncoder
from bson.objectid import ObjectId
from libraries import userlib
import routine
import config
from traceback import print_exc
from models_v2.absence_model import AbsenceModel


def add_absence(data, usr):
    '''
            Save absence information to DB
    '''
    try:
        #atsmodel.update(id, {'client_check_date': datetime.datetime.utcnow(), 'client': client } )
        absenceModel = AbsenceModel()
        data_to_save = {
            'user': usr['email'] if usr else '',
            'date': datetime.datetime.utcnow(),
            'reason': data['reason'],
            'is_full_day': data['is_full_day'],
            'date_from': datetime.datetime.strptime(data['date_from'], '%d.%m.%Y %H:%M'),
            'date_to': datetime.datetime.strptime(data['date_to'], '%d.%m.%Y %H:%M'),
            'notify_moscow': data['notify_moscow'],
            'notify_kaluga': data['notify_kaluga'],
            'notify_penza': data['notify_penza'],
            'comment': data['comment'],
        }
        # save data to DB
        absenceModel.add(data_to_save)
        # send email notification
        prepare_and_send_email_notification(data_to_save)
    except Exception, exc:
        print('---Error. staffapi.save; {0}'.format(str(exc)))
        print_exc()
        raise Exception('---Error. staffapi.save; {0}'.format(str(exc)))


def prepare_and_send_email_notification(data):
    '''
            Prepare mail message from data and send it
            g-kaluga@modul.org
            g-moscow@modul.org
            g-penza@modul.org
    '''
    try:
        from helpers import mailer

        def unpack_reason(key):
            reasons = [
                {'key': 'personal', 'name': 'по личным делам'},
                {'key': 'work', 'name': 'по рабочим делам'},
                {'key': 'holiday', 'name': 'отпуск'},
                {'key': 'business_trip', 'name': 'командировка'}
            ]
            return next((x for x in reasons if x['key'] == key))['name']

        # prepare and send mail
        html_body = ""
        notice_users = []

        if data.get('notify_moscow'):
            notice_users.append(
                {'email': 'g-moscow@modul.org', 'fio': 'Москва'})
        if data.get('notify_kaluga'):
            notice_users.append(
                {'email': 'g-kaluga@modul.org', 'fio': 'Калуга'})
        if data.get('notify_penza'):
            notice_users.append({'email': 'g-penza@modul.org', 'fio': 'Пенза'})

        html_body = "<strong>Причина: </strong>{0}<br/><br/>".format(
            unpack_reason(data['reason']))
        date_from_str = data.get('date_from').strftime(
            '%d.%m.%Y') if data['is_full_day'] == "yes" else data.get('date_from').strftime('%d.%m.%Y %H:%M')
        date_to_str = data.get('date_to').strftime(
            '%d.%m.%Y') if data['is_full_day'] == "yes" else data.get('date_to').strftime('%d.%m.%Y %H:%M')
        html_body += "<strong>Дата</strong> с {0} по {1}<br/><br/>".format(
            date_from_str, date_to_str)
        html_body += "<strong>Примечание: </strong>{0}".format(
            data.get('comment').replace('\r\n', '<br/>'))

        mailer.send(u'Отсутствие', html_body,
                    notice_users, True, data.get('user'))

    except Exception, exc:
        print(
            '---Error. staffapi.prepare_and_send_email_notification; {0}'.format(str(exc)))
        print_exc()
        raise Exception(
            '---Error. staffapi.prepare_and_send_email_notification; {0}'.format(str(exc)))


def get_all():
    '''
            Get full list of absences
    '''
    try:
        absenceModel = AbsenceModel()
        return absenceModel.get_list()
    except Exception, exc:
        print('---Error. staffapi.get_all; {0}'.format(str(exc)))
        print_exc()
        raise Exception('---Error. staffapi.get_all; {0}'.format(str(exc)))
