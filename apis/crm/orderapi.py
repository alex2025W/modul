#!/usr/bin/python
# -*- coding: utf-8 -*-

import datetime
import math
import time as root_time

import routine
import config

from dateutil.parser import parse
from dateutil.relativedelta import *
from bson.objectid import ObjectId
from bson.binary import Binary
from libraries import userlib
from traceback import print_exc
from typing import Union
from typing import AnyStr

from models import usermodel
from models import contragentmodel
from models import clientmodel
from models import ordermodel
from models import msgmodel
from models import dirmodel
from models import noticemodel
from models import contractmodel
from models import routinemodel
from helpers.google_api import drive
from helpers.google_api.drive import path_create
from helpers.google_api.drive import path_check_is_exists
from helpers.google.drive import folder_create
from helpers.google.drive import folder_share
from helpers.google.drive import shortcut_create


def make_path_from_order_id(order_id, force_sorting_up_from=13000):
    # type: (int, int) -> str
    """
    Create Google Drive path from order id.

    Path format: thousands/hundreds/<full-order-id>
    Examples:

    1234   ->   1000/200/1234
    12345  ->  12000/300/12345
    123456 -> 123000/400/123456

    :param order_id: order id
    :return: path
    """

    force_sorting = True if order_id >= force_sorting_up_from else False

    if not isinstance(force_sorting_up_from, int):
        raise TypeError('force_sorting_up_from must be instance of int, got: {}'.format(type(force_sorting_up_from)))

    if not isinstance(order_id, int):
        raise TypeError('order_id must be instance of int, got: {}'.format(type(order_id)))

    if not force_sorting:
        path_pattern = '{thousands}/{hundreds}/{order_id}'
    else:
        path_pattern = '{thousands}/{hundreds}/!{order_id}'

    return path_pattern.format(
        thousands=order_id // 1000 * 1000,
        hundreds=(order_id % 1000) // 100 * 100,
        order_id=order_id
    )


def find_order_folder_on_google_drive(number):
    # type: (int) -> bool
    """
    Check if Google Drive order folder exists

    :param number: order id (human-readable)
    :return: folder existing as boolean
    """
    if not isinstance(number, int):
        number = routine.strToInt(number)

    google_drive_order_path = make_path_from_order_id(number)

    service = drive.get_service(config.google_api_user)
    if not service:
        raise RuntimeError('Ошибка при создании документов. Невозможно создать клиент Google Drive')

    folder_id_list = path_check_is_exists(
        service,
        config.orders_google_folder_id,
        google_drive_order_path
    )

    if folder_id_list:
        return True

    return False


def create_folders_from_template(target_folder_id):
    """
    Create child folders in target folder.

    List of child folders makes from template folder

    :param target_folder_id: Google Drive folder ID
    :return:
    """
    service = drive.get_service(config.google_api_user)
    child_folders = drive.get_folder_list(service, config.orders_google_template_folder_id)
    for folder in child_folders:
        created_folders = drive.path_create(service, target_folder_id, '/{}'.format(folder['name']))
        if not created_folders:
            raise RuntimeError('Ошибка при создании папок. Невозможно создать дочерние папки заявки')


def create_order_folder_on_google_drive(number, creator_email):
    # type: (int, str) -> bool
    """
    Create on Google Drive folder for specified order
    
    :param number: order short number
    :param creator_email:
    :return:
    """

    if not isinstance(number, int):
        number = routine.strToInt(number)

    def update_status(order, status, folder_id, note, user_email):
        # type: (dict, str, str, AnyStr, str) -> None
        """
        Update order status

        :param order:
        :param status:
        :param folder_id:
        :param note:
        :param user_email:
        :return:
        """
        if 'documents' not in order:
            order['documents'] = dict()

        if order['documents'] is None:
            order['documents'] = dict()

        order['documents']['status'] = status
        order['documents']['folder_id'] = folder_id
        order['documents']['datetime'] = datetime.datetime.utcnow()
        order['documents']['manager'] = user_email
        order['documents']['note'] = note

        if not order['documents'].get('history'):
            order['documents']['history'] = []

        order['documents']['history'].append({
            'type': status,
            'user': user_email,
            'date': datetime.datetime.utcnow(),
            'note': note
        })

        ordermodel.upd(order['_id'], {'documents': order['documents']})

    # информация о заявке
    folder_exists = False
    order = ordermodel.get_by_args({'number': number})
    google_drive_order_path = make_path_from_order_id(number)

    manager_email = order.get('manager', None)
    if not manager_email:
        update_status(
            order,
            'error',
            '',
            u'Не удалось получить e-mail менеджера',
            creator_email
        )
        return False
    manager = usermodel.get(manager_email)

    # получение информации о правах доступа к тому или иному документу
    acl = routinemodel.get({'key': 'crm_google_folder'})
    docs_accesses = {}

    for access_rule in acl.get('accesses', []):
        for folder_name in access_rule.get('folders', []):
            docs_accesses[folder_name] = {
                'access': access_rule.get('access', 'read'),
                'users': access_rule.get('users', []),
                'copy_to_my_drive': True,
                'my_drive_path': 'CRM/{0}'.format(number)
            }

    # обновление токенов пользователя от которого будет идти создание документов
    # usermodel.refresh_user_credentials(config.google_api_user)

    try:
        # создание номера заявки на гугл диске
        service = drive.get_service(config.google_api_user)
        if not service:
            raise RuntimeError('Ошибка при создании документов. Невозможно создать клиент Google Drive')

        # проверка существования папки для указанной заявки
        # если не существует то запускается процедура создания
        print('Google orders folder: {0}'.format(config.orders_google_container_folder))

        folder_id_list = path_check_is_exists(
            service,
            config.orders_google_folder_id,
            google_drive_order_path
        )
        if folder_id_list:
            print('------CRM. Google folder for: {0} already exist----------'.format(number))
            update_status(
                order,
                'ok',
                folder_id_list[-1],
                u'Для данной заявки каталог документов уже существует.',
                creator_email
            )
            print('------CRM. Google folder creation for: {0} complete'.format(number))
            folder_exists = True
        else:
            print('------CRM. Start create new google folder for: {0}----------'.format(number))
            folder_id_list = path_create(service, config.orders_google_folder_id, google_drive_order_path)

            if folder_id_list:
                update_status(order, 'ok', folder_id_list[-1], '', creator_email)
                for folder_id in folder_id_list:
                    folder_share(folder_id, manager_email, config.GOOGLE_ORGANISATION_DOMAIN_NAME)

                # удаление доменного доступа у всех дочерних директорий
                child_folders = drive.get_folder_list(service, folder_id_list[-1])
                if child_folders:
                    for folder in child_folders:
                        permissions = drive.retrieve_permissions(service, folder['id'])
                        if permissions:
                            for f_permission in permissions:
                                if f_permission['type'] == 'domain':
                                    drive.remove_permission(service, folder['id'], f_permission['id'])

                print('------CRM. Google folder creation for: {0} complete'.format(number))
                folder_exists = True
            else:
                print('------CRM. Error create new google folder for: {0}-----------'.format(number))
                update_status(order, 'error', '', u'Ошибка GOOGLE при создании документов.', creator_email)

                # удаление неудачного каталога
                drive.delete_file_by_name(service, config.orders_google_container_folder, number)

        if folder_exists:
            # создание дополнительных каталогов
            create_folders_from_template(folder_id_list[-1])

            manager_folder_id = usermodel.google_drive_sales_folder_id_get(manager_email)
            if not manager_folder_id:
                manager_folder_id = folder_create(
                    manager['fio'],
                    config.orders_google_folder_id,
                    desc='Личный каталог менеджера {}'.format(manager['fio'])
                )
                if not manager_folder_id:
                    update_status(
                        order,
                        'error',
                        '',
                        u'Не удалось создать каталог менеджера в папке с заявками',
                        creator_email
                    )
                    return False

                if not folder_share(manager_folder_id, manager_email, config.GOOGLE_ORGANISATION_DOMAIN_NAME):
                    update_status(
                        order,
                        'error',
                        '',
                        u'Не удалось расшарить менеджеру {} его личный каталог {}'.format(
                            manager_email, manager_folder_id
                        ),
                        creator_email
                    )
                    return False

                if not usermodel.google_drive_sales_folder_id_set(manager_email, manager_folder_id):
                    update_status(
                        order,
                        'error',
                        '',
                        u'Не удалось привязать менеджеру {} личный каталог {}'.format(
                            manager_email, manager_folder_id
                        ),
                        creator_email
                    )
                    return False

            shortcut_id = shortcut_create(order['number'], manager_folder_id, folder_id_list[-1])
            if not shortcut_id:
                update_status(
                    order,
                    'error',
                    '',
                    u'Не удалось создать ярлык на каталог заявки в каталоге менеджера {} -> {}'.format(
                        folder_id_list[-1], manager_folder_id
                    ),
                    creator_email
                )
                return False

            notice_users = usermodel.get_list(
                {
                    'notice.key': noticemodel.notice_keys['crm_admin']['key'],
                    'stat': {
                        '$ne': 'disabled'
                    },
                    'email': {
                        '$ne': order['documents']['manager']
                    }
                }, {
                    'email': 1,
                    'fio': 1
                }
            )
            notice_users.append({'email': order['documents']['manager'], 'fio': ''})
            # фамилия менеджера заявки
            manager_fio = usermodel.get(order['manager']).get('fio', '')
            # предоставление доступа к каталогу документов выбранным пользователям
            # отправка почтового уведомления ведется внутри процедуры предоставления доступа
            share_order_folder_on_google_drive(
                number,
                manager_fio,
                notice_users,
                order['documents']['folder_id']
            )
            # отправка почтового уведомления указанным пользователям
            send_google_folder_notification_ok(number, notice_users, order['documents']['folder_id'])
            # помещение расшаренной папки в "Мой диск/CRM"
            # move_order_folder_to_my_drive(notice_users, order['documents']['folder_id'])
        else:
            # отправка почтового уведомления пользователю, запустившему создание документов
            notice_users = [{'email': order['documents']['manager'], 'fio': ''}]
            send_google_folder_notification_error(number, notice_users, order['documents']['note'])

    except Exception as e:
        update_status(order, 'error', '', str(e), creator_email)
        print('------CRM. Error create new google folder for: {0}. Detail:{1}-----------'.format(number, str(e)))
        print_exc()
        return False

    return True


def share_order_folder_on_google_drive(number, manager_fio, users,  folder_id):
    '''
    Расшаиривание папки на гугл диске другим пользователям
    '''
    from helpers.google_api import drive
    from models import ordermodel
    try:
        # расшаирование папки выбранным пользователям
        service = drive.get_service(config.google_api_user)
        drive.share_folder(service, folder_id, users, u"Номер заявки: {0}. Менеджер: {1}.".format(number, manager_fio))
    except Exception, exc:
        excType = exc.__class__.__name__
        print('------ERROR share_order_folder_on_google_drive')
        print_exc()

def add_manager_to_order_folder_on_google_drive(numbers, manager):
    '''
    Добавление менеджера к документам на гугл диске для входных заявок
    numbers - номера заявок
    manager - email адрес менеджера
    '''
    from helpers.google_api import drive
    from models import ordermodel
    try:
        # расшаирование папки выбранным пользователям
        service = drive.get_service(config.google_api_user)
        folders_ids = []
        notice_users = [{'email': manager,'fio': ''}]
        numbers_arr = {}
        for row in numbers:
            numbers_arr[str(row)] = str(row)

        # получить идентификаторы каталогов документов по номерам заявок
        folders = drive.get_folder_list(service,config.orders_google_container_folder)
        for folder in folders:
            if folder['title'] in numbers_arr:
                folders_ids.append(folder['id'])

        # проставление доступов для всех каталогов
        for folder_id in folders_ids:
            drive.share_folder(service, folder_id, notice_users, '')
            # помещение расшаренной папки в "Мой диск/CRM"
            move_order_folder_to_my_drive(notice_users, folder_id)

    except Exception, exc:
        excType = exc.__class__.__name__
        print('------ERROR share_order_folder_on_google_drive')
        print_exc()

def move_order_folder_to_my_drive(users, folder_id):
    '''
    Помещение указанной папки в "МОЙ диск/CRM" пользователей
    users - список пользователей
    folder_id - папка которую необходимо поместить в мой диск
    '''
    from helpers.google_api import drive
    try:
        # расшаирование папки выбранным пользователям
        for user in users:
            try:
                service = drive.get_service(user['email'])
                #print('----')
                #print(user['email'])
                if service:
                    # поиск каталога CRM у пользователя, если каталога нет, то создаем его
                    folders = drive.get_folder_by_name(service,'root', 'CRM')
                    crm_folder_id = ''
                    if folders is not None and len(folders)>0:
                        #print('folder CRM already exist: {0}'.format(folders[0]['id']))
                        crm_folder_id = folders[0]['id']
                    else:
                        #print('create CRM folder')
                        crm_folder_id = drive.insert_folder(service, 'CRM', '')
                    # перемещение документа в "Мой Диск"
                    if crm_folder_id:
                        #print('Insert folder: {0} in CRM'.format(folder_id))
                        drive.insert_file_into_folder(service, crm_folder_id, folder_id)
                else:
                    print('----Error! move_order_folder_to_my_drive for user {0}, empty service.'.format(user['email']))
                #print('----')
            except Exception, exc:
                excType = exc.__class__.__name__
                print('------ERROR move_order_folder_to_my_drive for user: {0}; Detail: {1}'.format(user['email'], str(exc)))
                print_exc()
    except Exception, exc:
        excType = exc.__class__.__name__
        print('------ERROR move_order_folder_to_my_drive')
        print_exc()

def send_google_folder_notification_ok(number, notice_users, folder_id):
    '''
      Функция для отправки почтового уведомления с сообщением
      об успешности создания каталога документов для заявки
    '''
    from models import ordermodel
    from helpers import mailer
    header = "[CRM] Для заявки №{0} на гугл диске создан каталог документов".format(number);
    body = "Для заявки №{0} на гугл диске создан каталог документов. <br/> Теперь вы можете перейти к нему, кликнув на ссылку - <a href = 'https://drive.google.com/a/modul.org/#folders/{1}'>Документы</a>".format(number, folder_id)
    # отправка письма
    mailer.send(header, body, notice_users, True)

def send_google_folder_notification_error(number, notice_users, note):
    '''
      Функция для отправки почтового уведомления с сообщением
      об ошибке создания каталога документов для заявки
    '''
    from models import ordermodel
    from helpers import mailer
    header = "[CRM] Ошибка при создании каталога документов на гугл диске для заявки №{0}".format(number);
    body = "[CRM] Ошибка при создании каталога документов на гугл диске для заявки №{0}. <br/>Подробности: {1}".format(number, note)
    # отправка письма
    mailer.send(header, body, notice_users, True)

def send_order_notification(header,usr_email, key, notice_users):
    '''
      тест на 5388
      Отправка почтового уведомления с информацией о заявке
      old_order - информация о заявек перед изменением
      order - текущая информация о заявке
      crm@modul.org - адрес на который отправляется письмо
    '''
    from models import ordermodel, clientmodel
    from helpers import mailer

    order =  return_order(ordermodel.get(key))
    client = clientmodel.find_by({'_id': ObjectId(order['client_id']) })

    first_state = None         # первое состояние
    first_work_state = None     # первое состояние с категорией -  "в работе"
    last_state = None        # последнее состояние
    prelast_state = None        # предпоследнее состояние
    days_in_work = 0         # количество дней в работе
    full_days = 0             # количество дней всего
    if order.get('history') and len(order['history'])>0:
        # Сортировка истории состояний по дате
        order['history'].sort(key = lambda x: (routine.strToDateTime(x['datetime'])))
        # получение первого состояния
        first_state = order['history'][0]
        # получение первого состояние категории - "В работе"
        try:
            first_work_state = (row for row in order['history'] if row['condition_type'] == u"промежуточное" ).next()
        except:
            pass
        # получение последнего состояния
        last_state = order['history'][-1]
        prelast_state = last_state
        if len(order['history'])>1:
            prelast_state = order['history'][-2]


    # содержимое письма
    body = "Менеджер: {0} \r\n\r\n".format(usr_email)
    conds = dirmodel.get_conditions()

    #body += "Проект: {0} \r\n".format(order.get('project_name',''))

    order_projects_str = ''
    for project in order.get('projects',[]):
        if project.get('project_name'):
            order_projects_str+=project['project_name'] + '; '
    body += "Проекты: {0} \r\n".format(order_projects_str.encode('UTF-8'))

    # print('--------------')
    # print("Проекты: {0} \r\n".format(order_projects_str))
    # print('--------------')

    body += "Группа: {0} \r\n".format(order.get('client_group') if order.get('client_group') else '-'  )
    body += "Клиент: {0} \r\n".format(order.get('client',''))
    body += "Сайт: {0} \r\n".format(client.get('site') + '; Проверен: ' + client.get('site_date') if client.get('site') else '-' )
    body += "Контактных лиц: {0} \r\n\r\n".format(str(len(client.get('contacts',[]) or [])))
    body += "Состав заявки: {0} \r\n\r\n".format("; ".join([row['name'] + " (" + row['type'] + ")" for row in order['products']]))

    body += "Площадь: {0}{1} м2\r\n".format("~" if any([row for row in order['products'] if row['approx_sq']=='yes']) else '', routine.float_format_money(order['sq']))
    body += "Ср. за м2: {0}{1} р.\r\n".format("~" if any([row for row in order['products'] if row['approx']=='yes']) else '', routine.float_format_money(order['sq_price'] ))
    body += "Сумма: {0}{1} р.\r\n".format("~" if any([row for row in order['products'] if row['approx']=='yes']) else '', routine.float_format_money(order['price']))
    body += "Наценка: {0}{1}%\r\n\r\n".format(
        "~" if any([row for row in order['products'] if row['approx'] == 'yes']) else '',
        str(order['markup']))

    chance_progress = routine.strToInt(last_state['chance']) - routine.strToInt(prelast_state.get('chance', 0) or  0)
    chance = 'Не определена'
    if last_state and routine.strToInt(last_state.get('chance','0'))>0:
        chance = str(last_state['chance']) + '% [{0}{1}]'.format('+' if chance_progress>0 else '',  str(chance_progress) if chance_progress!=0 else 'без изменений')
    body += "Вероятность: {0}\r\n".format(chance)

    body += "Плановая дата закрытия: {0} \r\n".format(order.get('close_date') if order.get('close_date') else 'Не определена'  )
    body += "Плановая дата сдачи: {0} \r\n".format(order.get('finish_date') if order.get('finish_date') else 'Не определена'  )

    comments = last_state.get('comments',[])
    body += "Комментарий:\r\n{0}\r\n\r\n".format('-' if len(comments)==0 else routine.comment_format(comments[len(comments)-1].get('text','')))

    #body += "Комментарий: {0}\r\n\r\n".format(last_state.get('comment','-'))
    body += "Посл. состояние, {0}: {1} ({2})\r\n".format('Мы' if last_state.get('initiator', '') == 'we' else 'Они', routine.dateUtcToMoscow(routine.strToDateTime(last_state['datetime'])).strftime('%d.%m.%Y %H:%M:%S'), conds.get(last_state['condition'],last_state['condition']) + (' - ' + last_state.get('reason','')  if last_state.get('reason','')  else '' ))
    body += "Зарегистрировано, {0}: {1} ({2})\r\n".format('Мы' if first_state.get('initiator', '') == 'we' else 'Они', routine.dateUtcToMoscow(routine.strToDateTime(first_state['datetime'])).strftime('%d.%m.%Y %H:%M:%S'), conds.get(first_state['condition'],first_state['condition']) + (' - ' + first_state.get('reason','')  if first_state.get('reason','') else '' ))
    if first_work_state:
        #days_in_work = (routine.strToDateTime(first_work_state['datetime']) - routine.strToDateTime(first_state['datetime'])).days
        days_in_work = (routine.strToDateTime(last_state['datetime'])  - routine.strToDateTime(first_work_state['datetime'])).days
        body += "В работе, {0}: {1} ({2})\r\n".format('Мы' if first_work_state.get('initiator', '') == 'we' else 'Они', routine.dateUtcToMoscow(routine.strToDateTime(first_work_state['datetime'])).strftime('%d.%m.%Y %H:%M:%S'), conds.get(first_work_state['condition'],first_work_state['condition']) + (' - ' + first_work_state.get('reason','') if first_work_state.get('reason','') else '' ))
    full_days = (routine.strToDateTime(last_state['datetime']) - routine.strToDateTime(first_state['datetime'])).days
    body += "Дней: {0} (из них {1} в работе)\r\n".format(str(full_days), str(days_in_work))
    body += "Всего состояний: {0}\r\n\r\n".format(str(len(order['history'])))


    body += "Задачи по заявке:\r\n"
    body += "Всего: {0}\r\n".format(str(len(order.get('tasks',[]))))

    if order.get('tasks') and len(order['tasks'])>0:
        completed_count = 0
        completed_meets_count = 0
        current_task = None
        overdue_count = 0
        overdue_meets_count = 0

        for task in order['tasks']:
            if task['status'] == u'завершена':
                completed_count+=1
                if task['condition'] == u'Встреча':
                    completed_meets_count+=1
            elif task.get('overdue'):
                overdue_count+=1
                if task['condition'] == u'Встреча':
                    overdue_meets_count+=1
            elif task['status'] =='':
                current_task = task

        body += "Выполненных: {0} (из них встреч: {1})\r\n".format(str(completed_count), str(completed_meets_count))
        body += "Активная: {0}\r\n".format(current_task['condition'] + ', ' + current_task['closedatetime'] if current_task else '-')
        body += "Просроченных: {0} (из них встреч: {1})\r\n".format(str(overdue_count), str(overdue_meets_count))

    body += "\r\nОшибки по заявке:\r\n"
    body += "Всего: {0}\r\n".format(str(len(order.get('error_history',[]))))

    # текущих ошибок
    active_errors = 0
    # максимальная дата открытия ошибки
    max_error_date = datetime.datetime.utcnow()
    # общее число уведомлений на почту
    error_notices = 0

    for e in order.get('error_history',[]):
        if e['enabled']:
            active_errors = active_errors+1
            if e['open_date']<max_error_date:
                max_error_date = e['open_date']
            error_notices+=len(e.get('notice_list',[]))

    print max_error_date

    if active_errors>0:
        body += 'Текущих: {0} (не устраняется: {1} дн.; получено уведомлений по почте: {2})\r\n\r\n'.format(str(active_errors),str((datetime.datetime.utcnow()-max_error_date).days),str(error_notices))
    else:
        body += 'Текущих: 0\r\n\r\n'

    body += "Адрес заявки: <a href = 'http://int.modul.org/crm/{0}'>{1}</a> ".format(str(order['number']),str(order['number']))
    body = body.replace('\r\n', '<br/>')
    body = body.replace('\n', '<br/>')
    # return body
    # отправка письма
    mailer.send(header, body, notice_users, True, None)

def return_order(param, access=None):
    '''
    Подготовка информации о заявке
    '''
    from models import ordermodel, clientmodel
    # площадь
    sq = 0
    for prod in param['products']:
        sq = sq + prod['sq'] * prod['count']
    param['id'] = str(param['_id'])
    del param['_id']
    del param['added']
    try:
        del param['log']
    except Exception, e:
        pass
    # сколько заказов у клиента
    clientcnt = 0;
    try:
        clientcnt = ordermodel.get_orders_count_by_client([param['client_id']]).values()[0]
    except Exception, e:
        pass

    param['client_id'] = str(param['client_id'])
    client = clientmodel.get(param['client_id'])
    param['client_group'] = client.get('group')

    contact = u''
    if not access or client.get('manager') in access:
        if (len(client['contacts']) > 0):
            cont = client['contacts'][len(client['contacts'])-1]
            contact = contact + cont['fio'] + u'.'
            if len(cont['phone']) > 0:
                contact = contact + u'<br>Тел.: '
                for ph in cont['phone']:
                    contact = contact + ph + ', '
                contact = contact[:-2] + '.'
            if len(cont['email']) > 0:
                contact = contact + u'<br>'
                for em in cont['email']:
                    contact = contact + em + ', '
                contact = contact[:-2] + '.'
    if 'abc_history' in client and len(client['abc_history'])>0:
        param['client_abc'] = client['abc_history'][len(client['abc_history'])-1]
    if (len(client['contacts']) > 1):
        contact = contact + ' <a href="/client-card/{}" hrefb="javascript:;" class="client-card-lnk">Еще...</a>'.format(param['client_id'])
    param['client_info'] = contact

    param['datetime'] = param['datetime'].strftime('%d.%m.%Y %H:%M:%S')
    taskdate = ''
    try:
        taskdate = param['task_date'].strftime('%d.%m.%Y') if 'task_date' in param else ''
    except Exception, e:
        taskdate = param['task_date']
    param['task_date'] = taskdate

    param['f_state_date']=param['f_state_date'].strftime('%d.%m.%Y %H:%M:%S') if param['f_state_date'] else None
    param['l_state_date']=param['l_state_date'].strftime('%d.%m.%Y %H:%M:%S') if param['l_state_date'] else None
    param['prelast_state_date']=param['prelast_state_date'].strftime('%d.%m.%Y %H:%M:%S') if param['prelast_state_date'] else None

    #---
    param['last_close_date']=param['last_close_date'].strftime('%d.%m.%Y') if param['last_close_date'] else None
    param['cur_close_date']=param['cur_close_date'].strftime('%d.%m.%Y') if param['cur_close_date'] else None
    param['close_date']= param['close_date'].strftime('%d.%m.%Y') if param['close_date'] else None
    #---
    param['last_finish_date']=param['last_finish_date'].strftime('%d.%m.%Y') if param.get('last_finish_date') else None
    param['cur_finish_date']=param['cur_finish_date'].strftime('%d.%m.%Y') if param.get('cur_finish_date') else None
    param['finish_date']= param['finish_date'].strftime('%d.%m.%Y') if param.get('finish_date') else None

    param['dogovornum'] = ','.join(param['dogovornum']) if 'dogovornum' in param and len(param['dogovornum']) > 0  else ''
    param['chance_str'] =  param['chance_str'] if 'chance_str' in param else '—'
    param['clientcnt'] = clientcnt
    param['history'].sort(key = lambda x: (routine.strToDateTime(x['datetime'])))
    f_state = param['history'][0] if len(param['history']) > 0 else None
    l_state = param['history'][-1] if len(param['history']) > 1 else f_state
    prelast_state = param['history'][-2] if len(param['history']) > 1 else f_state

    param['f_state_manager'] = f_state.get('manager') if f_state else param.get('manager')
    param['f_state_initiator'] = 'Мы' if f_state and f_state.get('initiator', '') == 'we' else 'Они'
    param['prelast_state_manager'] = prelast_state.get('manager') if prelast_state else param['f_state_manager']
    param['prelast_state_initiator'] = 'Мы' if  prelast_state and prelast_state.get('initiator', '') == 'we' else 'Они'
    param['l_state_manager'] = l_state.get('manager') if l_state else param['f_state_manager']
    param['l_state_initiator'] = 'Мы' if l_state and  l_state.get('initiator', '') == 'we' else 'Они'

    param['abc_type'] = check_order_on_abc_type(param)

    return param


def redefine_google_documetns_owners (order_number):
    '''
    Переопределение владельцев на папки и документы заявок.
    - Снять все назначенные ранее парва
    - Добавить новые права согласно текущим владельцам заявок
    '''
    from models import ordermodel, clientmodel, usermodel, noticemodel
    from helpers.google_api import drive
    result = {}
    try:

        service = drive.get_service(config.google_api_user)
        if not service:
            raise Exception('------ERROR get service for user: {0}.---------'.format(config.google_api_user))
        # получение всех папок и документов в указанной дирректории
        folders = drive.get_folder_list(service,config.orders_google_container_folder)

        # сбор данных по заявкам
        orders_data = ordermodel.get_list(None, {'_id':1, 'manager':1, 'number':1})
        orders_arr = {}
        for order in orders_data:
            orders_arr[str(order['number'])] = order

        # получить всех администраторов для расшаривания им созданного каталога документов
        notice_users = usermodel.get_list({'notice.key': noticemodel.notice_keys['crm_admin']['key'], 'stat': {'$ne': 'disabled'} },{'email':1,'fio':1})

        # Основной цикл по номерам заявок - дирректориям
        for folder in folders:
            # если надйенная диррекория соответствует какой-либо заявке
            if (order_number=='all' or  folder['title'] == order_number) and folder['title'] in orders_arr:
                result[folder['title']] = 'False'

                order = orders_arr[folder['title']]
                tmp_notice_users = [{'email': order['manager'],'fio': ''}, {'email': config.google_api_user, 'fio': ''}]
                tmp_notice_users.extend(notice_users)
                # получить список прав на указанню дирректорию
                folder_permissions = drive.retrieve_permissions(service, folder['id'])
                # удалить все права с указанной дирректории
                for f_permission in folder_permissions:
                    drive.remove_permission(service, folder['id'], f_permission['id'])

                print('share order: {0}'.format(str(order['number'])))
                # назначить новые права на указаннюу дирректорию
                share_order_folder_on_google_drive(folder['title'],order['manager'], tmp_notice_users, folder['id'])
                # помещение расшаренной папки в "Мой диск/CRM"
                move_order_folder_to_my_drive(tmp_notice_users, folder['id'])
                print('Move folder to my drive: {0}'.format(str(order['number'])))

                result[folder['title']] = 'True'
    except Exception, exc:
        excType = exc.__class__.__name__
        print('------ERROR redefine_google_documetns_owners. {0}'.format(str(exc)))
        print_exc()

    return result

def check_orders_on_errors():
    '''
    Функция проверки заявко на просроченность и на ошибки
    В результате присходит пометка ошибок в таблицу - msg
    '''
    from models import ordermodel, usermodel, noticemodel, clientmodel, dirmodel, msgmodel
    import time
    try:
        start = time.clock()
        # текущую дату приводим  к москве и время выставляем 23:59
        #curdt = routine.dateUtcToMoscow(datetime.datetime.utcnow()).replace(hour=23, minute=59)
        curdt = routine.dateUtcToMoscow(datetime.datetime.utcnow())
        print('check_orders_on_errors: start: {0}'.format(curdt.strftime('%d.%m.%Y %H:%M:%S')))
        # из справочника получаем информацию, какие  сроки для всех состояний
        # сколько времени заявка может находиться в том или ином состоянии
        sost_days = routine.get_sost_days()
        # пользователи для получения уведомлений
        notice_users = usermodel.get_list({'notice.key': noticemodel.notice_keys['crm_common']['key']},{'email':1,'fio':1})
        foo = ordermodel.get_total3({
            'closed': 'no',
            '$or':[
                {'ignore_state_date':{'$exists':False}},
                {'ignore_state_date': 'no'}
            ]},
            {'client':1, 'client_id':1, 'manager':1, 'price':1, 'sq':1, 'structure':1, 'history':1, 'chance_str':1, 'number':1}
        )
        print "check_orders_on_errors: get data: ", time.clock() - start
        start = time.clock()
        for f in foo:
            # сортировка истории состояний по заявке
            f['history'].sort(key = lambda x: (routine.strToDateTime( x['datetime'])))
            # берем последнее состояние по истории
            cond = f['history'][-1]
            ev_id = str(f['_id'])
            # переводим дату состояния из строки в формат времени
            odt = parse(cond['datetime'], dayfirst=True)
            if sost_days.get(cond['condition'],0) > 0:
                newdt = routine.add_work_days(odt, sost_days[cond['condition']]).replace(hour=23, minute=59)
                if curdt > newdt:
                    autoclosed = False

                    # if cond['condition'] == dirmodel.OrderConditions['INTEREST']:
                    #   cl = clientmodel.get(str(f['client_id']))
                    #   dr = dirmodel.get_by_type(11)
                    #   cprice = 0
                    #   csq = 0
                    #   for d in dr:
                    #     cprice = d['order_c_sum']
                    #     csq = d['order_c_square']
                    #   if 'abc_history' in cl and cl['abc_history'] and len(cl['abc_history'])>0:
                    #     hlast = cl['abc_history'][-1]
                    #     if hlast['price']['is_c'] and hlast['square']['is_c']:
                    #       autoclose_order(ev_id)
                    #       autoclosed = True
                    #   else:
                    #     if (f['price'] > 0 and f['price'] <= cprice) or (f['sq'] > 0 and f['sq'] <= csq):
                    #       autoclose_order(ev_id)
                    #       autoclosed = True
                    # iss 816 - для состояний "Интерес" с инициатором = "Мы". проверку на даты не ведем
                    # if not autoclosed and not (cond.get('condition','') == dirmodel.OrderConditions['INTEREST'] and cond.get('initiator','') == 'we'):
                    # оповещение не требуется если жуе такое было
                    old_msgs = msgmodel.get_by({'order_id': f['_id'], 'type': 'de'})
                    need_msg = True
                    need_add_to_history = True
                    for om in old_msgs:
                        nextdt = om['datetime'] + relativedelta(days = +3)
                        if om['enabled']:
                            need_add_to_history = False
                        if (nextdt > curdt):
                            need_msg = False

                    #добавляется ошибка в историю ошибок
                    if need_add_to_history:
                        ordermodel.add_to_err_history(f['_id'], 'de', f['manager'], None)

                    # пометка ошибочной заявки в таблице сообщений
                    msgdata = {
                        'number':f['number'],
                        'manager': f['manager'],
                        'datetime': old_msgs[0]['datetime'] if not need_msg else datetime.datetime.utcnow(),
                        'type': 'de',
                        'order_id': f['_id'],
                        'enabled':True,
                        'client': f['client']
                    }
                    msgmodel.upsert({'order_id': f['_id'], 'type': 'de'},msgdata)

                    if need_msg:
                        ordermodel.add_send_email_to_error_history(f['_id'],'de',None)
                        try:
                            print('---send_order_notification: {0}'.format(str(f.get('number',''))))
                            header =  "[CRM] {0} - состояние устарело".format(str(f.get('number','')))
                            send_order_notification(header,f.get('manager',''), str(f.get('_id')), notice_users)

                        except Exception, exc:
                            excType = exc.__class__.__name__
                            print('send_order_notification error. Exception: ' + str(exc))
                            print_exc()
                            pass

        print "check_orders_on_errors: process data: ", time.clock() - start
    except Exception, exc:
        excType = exc.__class__.__name__
        print('Error. check_orders_on_errors.  Exception: ' + str(exc))
        raise Exception('------ERROR scheduled_job: {0}.---------'.format(str(exc)))


def ch_ordr(ctype, key, condition = None):
    '''
      Проверка заявки на ошибки
    '''
    # текущую дату приводим к москве и время выставляем 23:59
    #curdt = routine.dateUtcToMoscow(datetime.datetime.utcnow()).replace(hour=23, minute=59)
    curdt = routine.dateUtcToMoscow(datetime.datetime.utcnow())
    param = ordermodel.get(key)
    if not condition:
        condition = param['condition']
    sost = dirmodel.get_one({'type':3, '_id':ObjectId(condition)})
    try:
        if 'p' in ctype:
            if 'price' not in sost or sost['price'] != 'enabled':
                return True
            if int(param['price'])<= 0:
                raise Exception("no")
            if param['approx'] == 'yes':
                raise Exception("no")
        if 'q' in ctype:
            if 'sq' not in sost or sost['sq'] != 'enabled':
                return True
            if int(param['sq'])<= 0 and len(param['services']) == 0:
                raise Exception("no")
            if param['approx_sq'] == 'yes':
                raise Exception("no")
        if 's' in ctype:
            if 'structure' not in sost and sost['structure'] != 'enabled':
                return True
            dicts = get_dictionary(False)
            products = param['products']
            services = param['services']
            if len(products) == 0 and len(services) == 0:
                raise Exception("no")
            for pr in products:
                if pr['count'] < 1:
                    raise Exception("no")
                if (pr['price']+pr.get('mont_price',0)) < 1:
                    raise Exception("no")
                if pr['sq'] < 1:
                    raise Exception("no")
                if pr['approx']=='yes':
                    raise Exception("no")
            for service in services:
                if service['price'] < 1:
                    raise Exception("no")
                if service['approx']=='yes':
                    raise Exception("no")
        if ctype == 'de' and 'history' in param:
            param['history'].sort(key = lambda x: (routine.strToDateTime( x['datetime'])))
            cond = param['history'][-1]

            # iss 816 - для состояний "Интерес" с инициатором = "Мы". проверку на даты не ведем
            if not (cond.get('condition','') == dirmodel.OrderConditions['INTEREST'] and cond.get('initiator','') == "we"):
                ev_id = str(param['_id'])
                odt = parse(cond['datetime'], dayfirst=True)
                if sost.get('days',0) > 0:
                    newdt = routine.add_work_days(odt, sost['days']).replace(hour=23, minute=59)
                    ignore_state_date = param.get('ignore_state_date','') or 'no'
                    if ignore_state_date != 'no' and ignore_state_date != '':
                        ignore_state_date = routine.strToDateTime(ignore_state_date)
                        if ignore_state_date>newdt:
                            newdt = ignore_state_date

                    if curdt > newdt:
                        raise Exception("no")
    except Exception, e:
        return False
    return True

'''
  Автоподписание договора заявки
'''
def autosign_order(order_number):
    old_order = ordermodel.get_by({'number':int(order_number)})
    if old_order.get('l_state')==dirmodel.OrderConditions['CONTRACT_SIGN']:
        return
    lhs = {
        'chance': 100,
        'comments': [{ 'text': u"Автоподписание", 'date_add':datetime.datetime.utcnow(), 'date_changed':datetime.datetime.utcnow(), '_id':ObjectId(), 'manager':""}],
        'condition': dirmodel.OrderConditions['CONTRACT_SIGN'],
        'condition_type': u"закрывающее",
        'confirmed_by_client': False,
        'finish_confirmed_by_client': False,
        'datetime': "new",
        'enddate': None,
        'finishdate': None,
        'log': [],
        'manager': "",
        'reason': u"Автоподписание"
    }
    old_order['history'].append(lhs)
    old_order['auto_changed'] = True
    # ------------
    if old_order['l_state']:
        old_order['prelast_state'] = old_order['l_state']
        old_order['prelast_state_date'] = old_order['l_state_date']
        old_order['prelast_state_date_short'] = int(root_time.mktime(old_order['prelast_state_date'].timetuple())/60/60/24 )
    else:
        old_order['prelast_state'] = lhs['condition']
        old_order['prelast_state_date'] = datetime.datetime.utcnow()
        old_order['prelast_state_date_short'] = int(root_time.mktime(old_order['prelast_state_date'].timetuple())/60/60/24 )

    if not old_order['f_state'] or old_order['f_state']=="":
        old_order['f_state'] = lhs['condition']
        old_order['f_state_date'] = datetime.datetime.utcnow()
        old_order['f_state_date_short'] = int(root_time.mktime(old_order['f_state_date'].timetuple())/60/60/24 )
    else:
        old_order['f_state_date'] = old_order['f_state_date']
        old_order['f_state_date_short'] = int(root_time.mktime(old_order['f_state_date'].timetuple())/60/60/24 )

    old_order['l_state'] = lhs['condition']
    old_order['l_state_date'] = datetime.datetime.utcnow()
    old_order['l_state_date_short'] = int(root_time.mktime(old_order['l_state_date'].timetuple())/60/60/24 )

    if 'enddate' in lhs and lhs['enddate']:
        enddate = datetime.datetime.strptime(str(lhs['enddate']), "%d.%m.%Y")
        old_order['close_date'] = enddate
        old_order['cur_close_date'] = enddate
        old_order['last_close_date'] = enddate

    # дата сдачи объекта
    if 'finishdate' in lhs and lhs['finishdate']:
        finishdate = datetime.datetime.strptime(str(lhs['finishdate']), "%d.%m.%Y")
        old_order['finish_date'] = finishdate
        old_order['cur_finish_date'] = finishdate
        old_order['last_finish_date'] = finishdate

    old_order['prelast_days_count'] = (old_order['prelast_state_date']- old_order['f_state_date']).days
    old_order['last_days_count'] = (old_order['l_state_date']- old_order['f_state_date']).days
    old_order['diff_last_prelast_days_count'] = old_order['last_days_count'] - old_order['prelast_days_count']

    if old_order['last_close_date']:
        old_order['close_days_count'] = (old_order['last_close_date']- old_order['l_state_date']).days
    else:
        old_order['close_days_count'] = None

    if old_order.get('last_finish_date'):
        old_order['finish_days_count'] = (old_order['last_finish_date']- old_order['l_state_date']).days
    else:
        old_order['finish_days_count'] = None

    # ------------
    key = old_order['_id']
    del old_order['_id']
    cl = ordermodel.update(key, old_order, 'system', old_order.get('manager', 'system'))

'''
  Автозакрытие заявки
'''
def autoclose_order(key):
    old_order = ordermodel.get(key)
    lhs = {
        'chance': 0,
        #'comment': u"Автозакрытие",
        'comments': [{ 'text': u"Автозакрытие", 'date_add':datetime.datetime.utcnow(), 'date_changed':datetime.datetime.utcnow(), '_id':ObjectId(), 'manager':""}],
        'condition': dirmodel.OrderConditions['REFUSE'],
        'condition_type': u"закрывающее",
        'confirmed_by_client': False,
        'finish_confirmed_by_client': False,
        'datetime': "new",
        'enddate': None,
        'finishdate': None,
        'log': [],
        'manager': "",
        'reason': u"Автозакрытие"
    }
    old_order['history'].append(lhs)
    old_order['auto_changed'] = True
    # ------------
    if old_order['l_state']:
        old_order['prelast_state'] = old_order['l_state']
        old_order['prelast_state_date'] = old_order['l_state_date']
        old_order['prelast_state_date_short'] = int(root_time.mktime(old_order['prelast_state_date'].timetuple())/60/60/24 )
    else:
        old_order['prelast_state'] = lhs['condition']
        old_order['prelast_state_date'] = datetime.datetime.utcnow()
        old_order['prelast_state_date_short'] = int(root_time.mktime(old_order['prelast_state_date'].timetuple())/60/60/24 )

    if not old_order['f_state'] or old_order['f_state']=="":
        old_order['f_state'] = lhs['condition']
        old_order['f_state_date'] = datetime.datetime.utcnow()
        old_order['f_state_date_short'] = int(root_time.mktime(old_order['f_state_date'].timetuple())/60/60/24 )
    else:
        old_order['f_state_date'] = old_order['f_state_date']
        old_order['f_state_date_short'] = int(root_time.mktime(old_order['f_state_date'].timetuple())/60/60/24 )

    old_order['l_state'] = lhs['condition']
    old_order['l_state_date'] = datetime.datetime.utcnow()
    old_order['l_state_date_short'] = int(root_time.mktime(old_order['l_state_date'].timetuple())/60/60/24 )

    if 'enddate' in lhs and lhs['enddate']:
        enddate = datetime.datetime.strptime(str(lhs['enddate']), "%d.%m.%Y")
        old_order['close_date'] = enddate
        old_order['cur_close_date'] = enddate
        old_order['last_close_date'] = enddate

    if 'finishdate' in lhs and lhs['finishdate']:
        finishdate = datetime.datetime.strptime(str(lhs['finishdate']), "%d.%m.%Y")
        old_order['finish_date'] = finishdate
        old_order['cur_finish_date'] = finishdate
        old_order['last_finish_date'] = finishdate

    old_order['prelast_days_count'] = (old_order['prelast_state_date']- old_order['f_state_date']).days
    old_order['last_days_count'] = (old_order['l_state_date']- old_order['f_state_date']).days
    old_order['diff_last_prelast_days_count'] = old_order['last_days_count'] - old_order['prelast_days_count']

    if old_order['last_close_date']:
        old_order['close_days_count'] = (old_order['last_close_date']- old_order['l_state_date']).days
    else:
        old_order['close_days_count'] = None

    if old_order.get('last_finish_date'):
        old_order['finish_days_count'] = (old_order['last_finish_date']- old_order['l_state_date']).days
    else:
        old_order['finish_days_count'] = None

    # ------------
    del old_order['_id']
    cl = ordermodel.update(key, old_order, 'system', old_order.get('manager', 'system'))

'''
  Получение справочников
'''
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

'''
  Добавление информации о заявке в календарь
'''
def add_calendar_event(_id, user_info, key, old_data_history):
    from helpers.google_api import calendar
    try:
        data_to_save =  return_order(ordermodel.get(key))
        res = None
        if 'history' in data_to_save and len(data_to_save['history'])>0:
            event_id = _id
            # если история не менялась, то событие в календаре менять не надо
            if old_data_history and len(data_to_save['history'])==len(old_data_history):
                return None
            # получение последнего элемента истории в списке
            history_item = data_to_save['history'][len(data_to_save['history'])-1]
            # если по истории дата не назначена, то и не создаем событие в календаре
            if history_item['enddate']=='' or history_item['enddate']==None or history_item['condition_type']==u'закрывающее' or history_item['condition_type']==u'сон':
                # удаление мероприятия из календаря
                #print('###################################------------------------------')
                #print('calendar_event_delete')
                calendar.remove_event(user_info['email'], config.order_calendar, _id)
                #print('###################################------------------------------')
                return None
            #event_date = datetime.date.today()
            event_date = datetime.datetime.strptime(history_item['enddate'], "%d.%m.%Y")
            # суммарный объем
            total_montaz = 0
            # подтверждено клиентом
            confirmed_by_client = '! ' if 'confirmed_by_client' in data_to_save and data_to_save['confirmed_by_client'] else ''
            finish_confirmed_by_client = '! ' if 'finish_confirmed_by_client' in data_to_save and data_to_save['finish_confirmed_by_client'] else ''
            old_event = calendar.get_event(user_info['email'], config.order_calendar, event_id)
            if old_event is None:
                #print('###################################------------------------------')
                #print('calendar_new_event')
                # добавление нового события
                comment = ""
                if len(history_item.get('comments', []))>0:
                    comment = history_item['comments'][-1]['text']

                new_event = {
                    "id": event_id,
                    'summary': confirmed_by_client + data_to_save['client'] + '; '+ routine.int_format(data_to_save['price']) + ' р.; '+ str(data_to_save['sq']) + ' м2',
                    'location': data_to_save['total_address'],
                    'start': {'date': event_date.strftime('%Y-%m-%d')},
                    'end': {'date': event_date.strftime('%Y-%m-%d')},
                    'description':history_item['manager']+ ';\n' +history_item['condition'] +': '+history_item['datetime']+ ';\n' + 'Вероятность: '+data_to_save['chance_str']+ '%;\n' + 'Комментарий: '+ comment + ';\n' + 'Адрес заявки: '+ config.site_url + '/crm/' + str(data_to_save['number'])
                }
                #print(routine.JSONEncoder().encode(new_event))
                res = calendar.add_event(user_info['email'], config.order_calendar, new_event)
                #print('-----RES-------------------------------')
                #print(routine.JSONEncoder().encode(res))
                #print('###################################-------------------------------')
            else:
                new_sequence = 1
                try:
                    if 'sequence' in old_event:
                        new_sequence = old_event['sequence'] +1
                except:
                    new_sequence = 1
                    pass

                comment = ""
                if len(history_item.get('comments', []))>0:
                    comment = history_item['comments'][-1]['text']

                new_event = {
                    "id": event_id,
                    'sequence': new_sequence,
                    'summary': confirmed_by_client + data_to_save['client'] + '; '+ routine.int_format(data_to_save['price']) + ' р.; '+ str(data_to_save['sq']) + ' м2',
                    'location': data_to_save['total_address'],
                    'start': {'date': event_date.strftime('%Y-%m-%d')},
                    'end': {'date': event_date.strftime('%Y-%m-%d')},

                    'description':history_item['manager']+ ';\n' +history_item['condition'] +': '+history_item['datetime']+ ';\n' + 'Вероятность: '+data_to_save['chance_str']+ '%;\n' + 'Комментарий: '+ comment + ';\n' + 'Адрес заявки: '+ config.site_url + '/crm/' + str(data_to_save['number'])
                }
                res = calendar.update_event(user_info['email'], config.order_calendar, event_id, new_event)
            return res
    except Exception, exc:
        print_exc()
        pass
    return None

'''
  подготавливает строку для сравнения.
    - отбрасывает слова, короче 3-х символов
    - преобразует в нижний регистр
    возвращает массив слов
'''
def make_str_for_search(str):
    from libraries import showball
    import re
    st = showball.Porter()
    # разбиение строки в массив (игнорятся пробелы, знаки припенания и т.д.)
    spl = re.findall(u"[а-яА-ЯёЁa-zA-Z0-9']+", str)
    res = []
    for s in spl:
        if len(s)>2:
            # выкидываем окончания
            res.append(st.stem(s.lower()))
    return res

'''
  Сраниваниет все слова в строке, возвращает индекс совпадений (т.е. сколько слов совпало)
'''
def compare_str_arrays(str1, str2):

    #Реализация нечеткого сравнения двух слов по методу Левенштейна
    def compare_words_distance(a, b):
        n, m = len(a), len(b)
        if n > m:
            # Make sure n <= m, to use O(min(n,m)) space
            a, b = b, a
            n, m = m, n
        current_row = range(n+1) # Keep current and previous row, not entire matrix
        for i in range(1, m+1):
            previous_row, current_row = current_row, [i]+[0]*n
            for j in range(1,n+1):
                add, delete, change = previous_row[j]+1, current_row[j-1]+1, previous_row[j-1]
                if a[j-1] != b[i-1]:
                    change += 1
                current_row[j] = min(add, delete, change)
        return current_row[n]
        #---------------------------------------------------------------------------------------------------

    res = 0.0
    for s1 in str1:
        dist = 1000.0
        t_dist = 0.0
        for s2 in str2:
            d = compare_words_distance(s1,s2)
            if d<dist:
                dist = d
            if s1.find(s2)==0 or s2.find(s1)==0:
                t_dist = t_dist+0.001
            elif s1.find(s2)>0 or s2.find(s1)>0:
                t_dist = t_dist+0.0001

        if dist==0:
            res=res+1.0
        #elif dist==1:
        # res = res+0.5
        else:
            #print 'bb='+str(t_dist)
            res = res+t_dist
    return res



'''
  Изменение менеждера у заявки
  Также менеджер меняется у клиента который был привязан к заявке
'''
def transfer_order(param):
    try:
        orders = [item.strip() for item in param['orders'].split(',')]
        manager = param['manager']
        result = []
        order_list = []
        if 'clients' in param:
            clients_id = [ObjectId(item.strip()) for item in param['clients'].split(',')]
            order_list = ordermodel.get_list({'client_id': {'$in': clients_id}}, {'client_id':1, 'number':1, 'manager':1})
        elif 'client_id' in param:
            order_list = ordermodel.get_list({'client_id': ObjectId(param['client_id'])}, {'client_id':1, 'number':1, 'manager':1})
        else:
            for order_num in orders:
                order = ordermodel.get_by_args({'number': routine.strToInt(order_num)})
                order_list.append(order)
        clients_id = []
        orders_number = []
        for order in order_list:
            order_num = order['number']
            # order = ordermodel.get_by_args({'number': routine.strToInt(order_num)})
            client = clientmodel.get(order['client_id'])
            clients_id.append(client['_id'])
            orders_number.append(routine.strToInt(order_num))

            if order and client:
                item = {
                    'number': order_num,
                    'client_old_manager': client['manager'],
                    'client_name': client['name'],
                    'order_old_manager': order['manager']
                }
                result.append(item)

        ordermodel.update_by({'number':{'$in': orders_number}}, {'$set':{'manager': manager}}, insert_if_notfound=False, multi_update=True)
        clientmodel.update_by({'_id':{'$in': clients_id}}, {'manager': manager}, None)

        # запуск процедуры переопределения прав доступа к документам на google диске
        if not config.use_worker:
            result = add_manager_to_order_folder_on_google_drive(orders_number, manager)
        else:
            config.qu_default.enqueue_call(func=add_manager_to_order_folder_on_google_drive, args=(orders_number, manager))

        return result
    except Exception, exc:
        print_exc()
        raise Exception('------ERROR transfer_order. {0}'.format(str(exc)))

'''
  Проверка соответствия заявки той или иной категории
'''
def check_order_on_abc_type(order):
    # Получение ABC классификации
    abc = dirmodel.get_one({'type': 11})
    print 'check_order_on_abc_type'
    # получение принадлежности заявки к какой-либо классификации
    res = {'price':{'is_a':False, 'is_b':False, 'is_c':False}, 'square':{'is_a':False, 'is_b':False, 'is_c':False}}
    # проверка по стоимости
    if order['price']>abc['order_a_sum']:
        res['price']['is_a'] = True
    elif order['price']<abc['order_c_sum']:
        res['price']['is_c'] = True
    else:
        res['price']['is_b'] = True
    # проверка по площади
    if order['sq']>abc['order_a_square']:
        res['square']['is_a'] = True
    elif order['sq']<abc['order_c_square']:
        res['square']['is_c'] = True
    else:
        res['square']['is_b'] = True
    return res

'''
  Получение сообщений для менеджеров ЦРМ
'''
def get_msg(usr):
    msgs = []
    orders_ids = {}
    #----------------------------------------------------------------------------------
    # получение заявок с ошибками
    ret = msgmodel.get_by({'enabled':True, 'manager':usr['email'], 'closed_by_manager':{'$ne':True}})
    if ret:
        for r in ret:
            orders_ids[str(r['order_id']) ] = r['order_id']

        orders_nums = ordermodel.get_list({'_id':{'$in': orders_ids.values() } }, {'number': 1})
        tmp_order_nums = {}
        for r in orders_nums:
            orders_ids[str(r['_id']) ] = r['number']
        for r in ret:
            msgs.append({'manager': r['manager'], 'type':r['type'], 'order_id':str(r['order_id']),'order_number': orders_ids[str(r['order_id'])], '_id':str(r['_id']), 'client':r['client']})
    #----------------------------------------------------------------------------------
    # получение информации о просроченных задачах
    tasks = ordermodel.get_overdue_tasks([usr['email']])
    for r in tasks:
        msgs.append({'manager': r['manager'], 'type': 'task_overdue', 'order_id':str(r['order_id']),'order_number': r['order_number'], 'closed':r['closed'], 'condition':r['condition'], 'client':r['client'] })

    #----------------------------------------------------------------------------------
    # получение информации о задачах на сегодняшний день
    tasks = ordermodel.get_today_tasks([usr['email']])
    for r in tasks:
        msgs.append({'manager': r['manager'], 'type': 'task_today', 'order_id':str(r['order_id']),'order_number': r['order_number'], 'closed':r['closed'], 'condition':r['condition'], 'client':r['client'] })

    #----------------------------------------------------------------------------------
    # получение информации о заявках у которых вероятность выше 50% и нет даты закрытия
    tasks = ordermodel.get_empty_finish_date_tasks([usr['email']])
    for r in tasks:
        msgs.append({'manager': r['manager'], 'type': 'empty_finish_date', 'order_id':str(r['order_id']),'order_number': r['order_number'], 'closed':r['closed'],  'client':r['client'] })

    return msgs

'''
  Получение списка заявок
'''
def get_orders(param):
    import pymongo

    sort = 1
    tsort = 'datetime'
    page = 1
    ands = []
    sort_order = []
    start = root_time.clock()
    # проверяем, может ли текущий пользователь обновить эту заявку
    acc = userlib.get_crm_access_user_list()
    if acc:
        ands.append({'manager':{'$in':acc}})
    # добавляем условие, что заявки в режиме ожидания доступны только админу или создателю заявки
    cu = userlib.get_cur_user()
    if cu['admin']!="admin":
        ands.append({'$or':[{'state':{'$ne': 'wait'}},{'manager':cu['email']}]})

    if 'app' in cu['pages']:
        user_role_pages = cu['pages']['app']
    else:
        user_role_pages = []

    if cu['admin']!="admin" and 'additional' in user_role_pages and 'failures' in user_role_pages['additional']and not user_role_pages['additional']['failures']:

        ands.append({'$and':[{'l_state':{'$ne':dirmodel.OrderConditions['REFUSE']}}]})

    if cu['admin']!="admin" and 'additional' in user_role_pages and 'pending' in user_role_pages['additional']and not user_role_pages['additional']['pending']:
        ands.append({'$and':[{'state':{'$ne': 'wait'}}]})

    try:
        if (len(param)>0):
            if ('fa' in param and param['fa'] == 'on'):
                ands.append({'favorite': 'on'})
            if ('o' in param and param['o'] == 'all'):
                if ('cl' in param and param['cl']!= 'all'):
                    #ands.append({'client_id':ObjectId(param['cl'])})
                    # поиск среди клиентов, для которых этот клиент является подписантом
                    podpisants = contractmodel.get_clients_for_podpisant(ObjectId(param['cl']))
                    if not podpisants:
                        podpisants= []
                    podpisants.append(ObjectId(param['cl']))
                    if podpisants and len(podpisants)>0:
                        ands.append({'client_id':{'$in':podpisants}})

                # поиск по группе
                if param.get('gr'):
                    cllist = clientmodel.get_list({'group':param.get('gr')},{})
                    ids = [y['_id'] for y in cllist]
                    ands.append({'client_id':{'$in':ids}})

                if param.get('project'):
                    ands.append({'projects.project_id':ObjectId(param.get('project'))})

                if ('c' in param and param['c']!= 'all' and param['c']!='total' and param['c'] != u'промежуточное'):
                    cnd = param['c'].split(',')
                    if len(cnd)>0:
                        cor = []
                        for cn in cnd:
                            #cor.append({'condition':cn})
                            if (dirmodel.OrderConditions['REFUSE']+' ') in cn:
                                otkaz = cn.replace((dirmodel.OrderConditions['REFUSE']+' '), '')
                                #cor.append({'l_state_reason':otkaz})
                                cor.append({'$and':[{'condition':dirmodel.OrderConditions['REFUSE']},{'l_state_reason':otkaz}]})
                            elif (dirmodel.OrderConditions['EXAMINE']+' ') in cn:
                                otkaz = cn.replace(dirmodel.OrderConditions['EXAMINE']+' ', '')
                                #cor.append({'l_state_reason':otkaz})
                                cor.append({'$and':[{'condition':dirmodel.OrderConditions['EXAMINE']},{'l_state_reason':otkaz}]})
                            elif (dirmodel.OrderConditions['INTEREST']+' ') in cn:
                                otkaz = cn.replace(dirmodel.OrderConditions['INTEREST']+' ', '')
                                cor.append({'$and':[{'condition':dirmodel.OrderConditions['INTEREST']},{'l_state_reason':otkaz}]})
                                #cor.append({'l_state_reason':otkaz})
                            else:
                                cor.append({'condition':cn})
                        ands.append({'$or':cor})
                    else:
                        ands.append({'condition':param['c']})
                # if ('c' in param and param['c']== 'all'):
                #   ands.append({'condition':{'$ne': dirmodel.OrderConditions['SLEEP']}})
                #   ands.append({'condition_type':{'$ne': u'закрывающее'}})
                if ('c' in param and param['c']== u'промежуточное'):
                    ands.append({'condition_type':u'промежуточное'})

                if param.get('m'):
                    #print(param['m'].split(','))
                    ands.append({'$or':[{'l_state_manager': {'$in':  param['m'].split(',') } }, {'manager': {'$in':  param['m'].split(',')}} ]})
                    #ands.append({'manager': {'$in': param['m'].split(',') }})

                if ('t' in param and param['t']!= 'all' and param['t']!= 'alltasks'):
                    ands.append({'task':param['t']})
                if ('t' in param and param['t']== 'alltasks'):
                    ands.append({'task_date':{'$exists': True}})
                    ands.append({'task_date':{'$ne': ''}})
                '''
                if ('sc' in param and param['sc']== 'no'):
                  ands.append({'condition':{'$ne': dirmodel.OrderConditions['SLEEP']}})
                  ands.append({'condition_type':{'$ne': u'закрывающее'}})
                '''
                if ('r' in param and param['r'] != 'all'):
                    # try:
                    if '-' in param['r']:
                        tdates = param['r'].split('-')
                        td1 = datetime.datetime.strptime(tdates[0]+' 00:00:00','%d.%m.%Y %H:%M:%S')
                        td2 = datetime.datetime.strptime(tdates[1]+' 23:59:59','%d.%m.%Y %H:%M:%S')
                    else:
                        tdates = routine.textToDateRange(param['r'])
                        td1 = tdates[0]
                        td2 = tdates[1]


                    ands.append({'task_date':{'$exists': True}})
                    ands.append({'task_date':{'$gte': td1}})
                    ands.append({'task_date':{'$lte': td2}})

                    # except Exception, e:
                    #   raise e
                if ('od' in param and param['od'] != 'all'):
                    # try:
                    if '-' in param['od']:
                        odates = param['od'].split('-')
                        od1 = datetime.datetime.strptime(odates[0]+' 00:00:00','%d.%m.%Y %H:%M:%S')
                        od2 = datetime.datetime.strptime(odates[1]+' 23:59:59','%d.%m.%Y %H:%M:%S')
                    else:
                        odates = routine.textToDateRange(param['od'])
                        od1 = odates[0]
                        od2 = odates[1]
                    if param.get('onlnew')=='yes':
                        ands.append({'added':{'$gte': od1}})
                        ands.append({'added':{'$lte': od2}})
                    else:
                        ands.append({'datetime':{'$gte': od1}})
                        ands.append({'datetime':{'$lte': od2}})

                if ('oed' in param and param['oed'] != 'all'):
                    # try:
                    if '-' in param['oed']:
                        odates = param['oed'].split('-')
                        od1 = datetime.datetime.strptime(odates[0]+' 00:00:00','%d.%m.%Y %H:%M:%S')
                        od2 = datetime.datetime.strptime(odates[1]+' 23:59:59','%d.%m.%Y %H:%M:%S')
                    else:
                        odates = routine.textToDateRange(param['oed'])
                        od1 = odates[0]
                        od2 = odates[1]
                    ands.append({'added':{'$gte': od1}})
                    ands.append({'added':{'$lte': od2}})

                    # except Exception, e:
                    #   raise e

                if ('cd' in param and param['cd'] != 'all'):# and param['cd'] != 'no'):
                    if '-' in param['cd']:
                        cdates = param['cd'].split('-')
                        cd1 = datetime.datetime.strptime(cdates[0]+' 00:00:00','%d.%m.%Y %H:%M:%S')
                        cd2 = datetime.datetime.strptime(cdates[1]+' 23:59:59','%d.%m.%Y %H:%M:%S')
                    else:
                        cdates = routine.textToDateRange(param['cd'])
                        cd1 = cdates[0]
                        cd2 = cdates[1]
                    ands.append({'close_date':{'$gte': cd1}})
                    ands.append({'close_date':{'$lte': cd2}})
                if ('iscd' in param and param['iscd'] == 'no'):
                    ands.append({'close_date':{'$ne':None}})

                if ('fd' in param and param['fd'] != 'all'):
                    if '-' in param['fd']:
                        fdates = param['fd'].split('-')
                        fd1 = datetime.datetime.strptime(fdates[0]+' 00:00:00','%d.%m.%Y %H:%M:%S')
                        fd2 = datetime.datetime.strptime(fdates[1]+' 23:59:59','%d.%m.%Y %H:%M:%S')
                    else:
                        fdates = routine.textToDateRange(param['fd'])
                        fd1 = fdates[0]
                        fd2 = fdates[1]
                    ands.append({'finish_date':{'$gte': fd1}})
                    ands.append({'finish_date':{'$lte': fd2}})
                if ('isfd' in param and param['isfd'] == 'no'):
                    ands.append({'finish_date':{'$ne':None}})

                # инициатор первого состояния
                ands.extend(build_initiator_condition(param.get('initiator','').split(',')))
                #
                # first-we">Первый контакт, мы</option>

                # if param.get('initiator','') == 'we':
                #   ands.append({'f_state_initiator': 'we'})
                # elif param.get('initiator','') == 'they':
                #   ands.append({'f_state_initiator': 'they'})

                if ('ch' in param and param['ch'] == 'ls'):
                    ands.append({'$where': 'this.cur_chance<this.prev_chance'})

                if ('ch' in param and param['ch'] == 'mr'):
                    ands.append({'$where': 'this.cur_chance>this.prev_chance'})

                if ('ch' in param and param['ch'] == 'mth'):
                    ands.append({'$where': 'this.cur_chance>50'})

                if ('ch' in param and param['ch'] == 'no'):
                    ands.append({'cur_chance':0})

                # новая система сортировки
                sort_order = []
                if ('s' in param):
                    s_fields = [
                        'f_state_date',
                        'prelast_days_count',
                        'prelast_state_date',
                        'diff_last_prelast_days_count',
                        'l_state_date',
                        'close_days_count',
                        'close_date',
                        'cur_chance',
                        'sq',
                        'price',
                        'last_days_count',
                        'sq_price',
                        'f_state_date',
                        'l_state_date',
                        'finish_date',
                        'activity',
                        'activity_significant',
                        'activity_percent',
                    ]
                    d_fields = ['f_state_date', 'prelast_state_date','l_state_date']
                    sort_s = param['s']
                    sort_arr = [sort_s[i:i+3] for i in range(0, len(sort_s), 3)]

                    i = 0
                    for s in sort_arr:
                        i+=1
                        s_field = s_fields[int(s[0], 32)]
                        if len(sort_arr) >1 and s_field in d_fields and i != len(sort_arr):
                            s_field += '_short'
                        sort_order.insert(int(s[2], 32), (s_field, pymongo.DESCENDING if int(s[1]) == 0 else pymongo.ASCENDING))

                try:
                    page = int(param['p'])
                except Exception, e:
                    pass
    except Exception, exc:
        print('Error! Get orders.' + str(exc))
        print_exc()

    if len(ands)>0:
        cond = {'$and':ands}
    else:
        cond = {}

    if ('o' in param and param['o'] != 'all'):
        cond = {'_id': ObjectId(param['o'])}

    print "Time prepare params is: ", root_time.clock() - start
    start = root_time.clock()
    orders = ordermodel.get_all_new(cond, sort_order, page)
    #orders = ordermodel.get_all(cond, sort, tsort, page)
    orders_counts = ordermodel.get_count(cond)
    orders_pages = math.ceil(orders_counts/10.0)
    print "Time get data from db  is: ", root_time.clock() - start
    start = root_time.clock()
    res = []
    allcls = []
    clients_abc = {}

    for ordr in orders:
        # площадь
        sq = 0
        state = ordr['state'] if 'state' in ordr else 'published'
        for prod in ordr.get('products',[]):
            sq = sq + prod['sq'] * prod['count']

        contact = u''
        client_group = u''
        if ordr.get('client_id'):
            if ordr.get('client_id') not in allcls:
                allcls.append(ordr['client_id'])
            client = clientmodel.get(str(ordr['client_id']))
            if client:
                client_group = client.get('group')
            if client and (not acc or client['manager'] in acc):
                #if 'state' in client:
                # state = client['state']
                if (len(client['contacts']) > 0):
                    cont = client['contacts'][len(client['contacts'])-1]
                    contact = contact + cont['fio'] + u'.'
                    if len(cont['phone']) > 0:
                        contact = contact + u'<br>Тел.: '
                        for ph in cont['phone']:
                            contact = contact + ph + ', '
                        contact = contact[:-2] + '.'
                    if len(cont['email']) > 0:
                        contact = contact + u'<br>'
                        for em in cont['email']:
                            contact = contact + em + ', '
                        contact = contact[:-2] + '.'
                if (len(client['contacts']) > 1):
                    contact = contact + ' <a href="/client-card/{}" href="javascript:;" class="client-card-lnk">Еще...</a>'.format(str(ordr['client_id']))

                if 'abc_history' in client and len(client['abc_history'])>0:
                    clients_abc[str(client['_id'])] = client['abc_history'][len(client['abc_history'])-1]
        taskdate = ''
        try:
            taskdate = ordr['task_date'].strftime('%d.%m.%Y') if 'task_date' in ordr else ''
        except Exception, e:
            taskdate = ordr['task_date']

        fa = "off" # избранное
        try:
            fa = ordr['favorite']
        except Exception, e:
            pass

        ordr['history'].sort(key = lambda x: (routine.strToDateTime(x['datetime'])))

        f_state = ordr['history'][0] if len(ordr['history']) > 0 else None
        l_state = ordr['history'][-1] if len(ordr['history']) > 1 else f_state
        prelast_state = ordr['history'][-2] if len(ordr['history']) > 1 else f_state

        f_state_manager = f_state.get('manager') if f_state else ordr.get('manager')
        f_state_initiator = 'Мы' if f_state and f_state.get('initiator', '') == 'we' else 'Они'
        prelast_state_manager = prelast_state.get('manager') if prelast_state else f_state_manager
        prelast_state_initiator = 'Мы' if  prelast_state and prelast_state.get('initiator', '') == 'we' else 'Они'
        l_state_manager = l_state.get('manager') if l_state else f_state_manager
        l_state_initiator = 'Мы' if l_state and  l_state.get('initiator', '') == 'we' else 'Они'

        res.append({
            'id':str(ordr['_id']),
            'markup':ordr.get('markup',0),
            'number':str(ordr['number']),
            'documents': ordr.get('documents'),
            'client': ordr.get('client'),
            'client_id': str(ordr.get('client_id','')),
            'client_info': contact,
            'client_group':client_group,
            'condition': ordr.get('condition'),
            'condition_type': ordr.get('condition_type'),
            'datetime': ordr['datetime'].strftime('%d.%m.%Y %H:%M:%S') if ordr.get('datetime') else '',
            'manager': ordr.get('manager'),
            'structure': ordr['structure'],
            'price': ordr['price'],
            'approx': ordr['approx'],
            'approx_sq': ordr['approx_sq'] if 'approx_sq' in ordr else 'no',
            'comment': ordr['comment'],
            'task': ordr['task'],
            'task_date': taskdate,
            'sq': sq,
            'state': state,
            'favorite': fa,
            'f_state': ordr['f_state'],
            'f_state_date':ordr['f_state_date'].strftime('%d.%m.%Y %H:%M:%S') if ordr['f_state_date'] else ordr['f_state_date'],
            'l_state':ordr['l_state'],
            'l_state_reason':ordr['l_state_reason'],
            'l_state_date':ordr['l_state_date'].strftime('%d.%m.%Y %H:%M:%S') if ordr['l_state_date'] else ordr['l_state_date'],
            'prelast_state':ordr['prelast_state'],
            'prelast_state_date':ordr['prelast_state_date'].strftime('%d.%m.%Y %H:%M:%S') if ordr['prelast_state_date'] else ordr['prelast_state_date'],
            #--
            'last_close_date':ordr['last_close_date'].strftime('%d.%m.%Y') if ordr['last_close_date'] else ordr['last_close_date'],
            'cur_close_date':ordr['cur_close_date'].strftime('%d.%m.%Y') if ordr['cur_close_date'] else ordr['cur_close_date'],
            'close_date': ordr['close_date'].strftime('%d.%m.%Y') if ordr['close_date'] else ordr['close_date'],
            'close_days_count': ordr['close_days_count'],
            #--
            'last_finish_date':ordr['last_finish_date'].strftime('%d.%m.%Y') if ordr.get('last_finish_date') else None,
            'cur_finish_date':ordr['cur_finish_date'].strftime('%d.%m.%Y') if ordr.get('cur_finish_date') else None,
            'finish_date': ordr['finish_date'].strftime('%d.%m.%Y') if ordr.get('finish_date') else None,
            'finish_days_count': ordr.get('finish_days_count'),
            #--
            'last_days_count': ordr['last_days_count'],
            'prelast_days_count': ordr['prelast_days_count'],
            'chance': ordr.get('chance'),
            'chance_str': ordr['chance_str'] if 'chance_str' in ordr else '—',
            'confirmed_by_client': ordr['confirmed_by_client'],
            'finish_confirmed_by_client': ordr.get('finish_confirmed_by_client'),
            'ignore_state_date': ordr['ignore_state_date'] if 'ignore_state_date' in ordr else 'no',
            'contracts':ordr.get('contracts',[]),
            'project_name':ordr.get('project_name',''),

            'f_state_manager': f_state_manager,
            'prelast_state_manager': prelast_state_manager,
            'l_state_manager': l_state_manager,
            'f_state_initiator': f_state_initiator,
            'prelast_state_initiator': prelast_state_initiator,
            'l_state_initiator': l_state_initiator,
            'products': ordr.get('products',[]),
            'services': ordr.get('services',[]),
            'projects':ordr.get('projects',[]),
            'abc_type': check_order_on_abc_type(ordr),
            'activity': ordr.get('activity', 0),
            'activity_significant': ordr.get('activity_significant', 0),
            'activity_percent': ordr.get('activity_percent', 0),
        })

    orc = {}
    #print ands
    try:
        ands = []
        # добавляем условие, что заявки в режиме ожидания доступны только админу или создателю заявки
        cu = userlib.get_cur_user()
        if cu['admin']!="admin":
            ands.append({'$or':[{'state':{'$ne': 'wait'}},{'manager':cu['email']}]})

        # проверяем, может ли текущий пользователь обновить эту заявку
        acc = userlib.get_crm_access_user_list()
        if acc:
            ands.append({'manager':{'$in':acc}})

        orc = ordermodel.get_orders_count_by_client(allcls,ands)
    except Exception, e:
        pass
    ordrs = {'pages': orders_pages, 'count':orders_counts, 'clcount':orc, 'orders':res, 'clients_abc':clients_abc}

    print "Time prepare result data is: ", root_time.clock() - start
    return ordrs

'''
  Проверка на существование сайта
'''
def test_site(site):
    import requests
    try:
        r = requests.head(site)
        if (r.status_code < 400):
            return True
        # if (r.status_code == 200):
        #   return True
        # elif r.status_code == 301 or r.status_code == 302:
        #   site = None
        #   print('----')
        #   print(r.headers)
        #   print('----')
        #   for i in r.headers:
        #     if i=='location':
        #       site = r.headers[i]
        #       break
        #   if site:
        #     print('site')
        #     r = requests.head(site)
        #     if (r.status_code == 200):
        #       return True
        #     else:
        #       raise Exception(r.status_code)
        #   else:
        #     raise Exception('site not found')
        # else:
        #   raise Exception(r.status_code)
    except Exception, exc:
        print_exc()
        raise Exception('Check site: {0}; staus: {1}'.format(site, str(exc)))

'''
  Поиск похожих заявок
'''
def similar(param):
    if (len(param)==0):
        return []
    fields = []
    if 'addr' in param and param['addr'] != '':
        fields.append({'total_address': param['addr']})
    if 'sq' in param and len(param['sq'])>0:
        for sq in param['sq']:
            if sq:
                fields.append({'products.sq':sq})
    if 'name' in param and len(param['name'])>0:
        for nm in param['name']:
            if nm and nm != '':
                fields.append({'products.name':nm})
    if (len(fields) == 0):
        return []
    acc = userlib.get_crm_access_user_list()
    if acc:
        fields.append({'manager':{'$in':acc}})
    cond = {'$and':fields, '_id': {'$ne':ObjectId(param['id'])}}
    ords = ordermodel.get_list(cond, {'number':1, 'client':1, 'products':1, 'price':1, 'manager': 1, 'client_id':1, 'structure':1, 'l_state':1, 'f_state':1, 'f_state_date':1, 'l_state_date':1, '_id':0})
    contact = u''
    for ordr in ords:
        sq = 0
        contact = u''
        for prod in ordr['products']:
            sq = sq + prod['sq'] * prod['count']
        ordr['sq'] = sq
        del ordr['products']
        client = clientmodel.get(str(ordr['client_id']))
        if (not acc or client['manager'] in acc) and (len(client['contacts']) > 0):
            cont = client['contacts'][len(client['contacts'])-1]
            contact = contact + cont['fio'] + u'.'
            if len(cont['phone']) > 0:
                contact = contact + u'<br>Тел.: '
                for ph in cont['phone']:
                    contact = contact + ph + ', '
                contact = contact[:-2] + '.'
            if len(cont['email']) > 0:
                contact = contact + u'<br>'
                for em in cont['email']:
                    contact = contact + em + ', '
                contact = contact[:-2] + '.'
        if (len(client['contacts']) > 1):
            contact = contact + ' <a hrefb="/client-card/{}" href="javascript:;" class="client-card-lnk">Еще...</a>'.format(str(ordr['client_id']))

        ordr['contacts'] = contact
        del ordr['client_id']
        ordr['f_state_date'] = ordr['f_state_date'].strftime('%d.%m.%Y %H:%M:%S') if ordr['f_state_date'] else ordr['f_state_date']
        ordr['l_state_date'] = ordr['l_state_date'].strftime('%d.%m.%Y %H:%M:%S') if ordr['l_state_date'] else ordr['l_state_date']
    return ords

'''
  Подсчет ИТОГО по менеджеру
  param - условия
  cu - текущий пользователь
'''
def get_manager_itogo(param, cu):
    try:
        #print param
        cond = {}
        ands = []
        # проверяем, может ли текущий пользователь обновить эту заявку
        acc = userlib.get_crm_access_user_list()
        if acc:
            cond['manager']={'$in':acc}
        # добавляем условие, что заявки в режиме ожидания доступны только админу или создателю заявки
        if cu['admin']!="admin":
            ands.append({'$or':[{'state':{'$ne': 'wait'}},{'manager':cu['email']}]})

        # 1498 убрать из статистики закрытые заявки
        ands.append({'condition_type':{'$ne': 'закрывающее'}})

        if 'managers' in param and param['managers'] == '1':
            try:
                if (len(param)>0):
                    if ('fa' in param and param['fa'] == 'on'):
                        ands.append({'favorite': 'on'})
                    if ('o' in param and param['o'] == 'all'):
                        if ('cl' in param and param['cl']!= 'all'):
                            #ands.append({'client_id':ObjectId(param['cl'])})
                            # поиск среди клиентов, для которых этот клиент является подписантом
                            podpisants = contractmodel.get_clients_for_podpisant(ObjectId(param['cl']))
                            if not podpisants:
                                podpisants= []
                            podpisants.append(ObjectId(param['cl']))
                            if podpisants and len(podpisants)>0:
                                ands.append({'client_id':{'$in':podpisants}})

                        # поиск по группе
                        if param.get('gr'):
                            cllist = clientmodel.get_list({'group':param.get('gr')},{})
                            ids = [y['_id'] for y in cllist]
                            ands.append({'client_id':{'$in':ids}})

                        if param.get('project'):
                            ands.append({'projects.project_id':ObjectId(param.get('project'))})

                        if ('c' in param and param['c']!= 'all' and param['c']!='total' and param['c'] != u'промежуточное'):
                            cnd = param['c'].split(',')
                            if len(cnd)>0:
                                cor = []
                                for cn in cnd:
                                    #cor.append({'condition':cn})
                                    if  (dirmodel.OrderConditions['REFUSE']+' ') in cn:
                                        otkaz = cn.replace(dirmodel.OrderConditions['REFUSE']+' ', '')
                                        #cor.append({'l_state_reason':otkaz})
                                        cor.append({'$and':[{'condition':dirmodel.OrderConditions['REFUSE']},{'l_state_reason':otkaz}]})
                                    elif (dirmodel.OrderConditions['EXAMINE']+' ') in cn:
                                        otkaz = cn.replace(dirmodel.OrderConditions['EXAMINE']+' ', '')
                                        #cor.append({'l_state_reason':otkaz})
                                        cor.append({'$and':[{'condition':dirmodel.OrderConditions['EXAMINE']},{'l_state_reason':otkaz}]})
                                    elif (dirmodel.OrderConditions['INTEREST']+' ') in cn:
                                        otkaz = cn.replace(dirmodel.OrderConditions['INTEREST']+' ', '')
                                        cor.append({'$and':[{'condition':dirmodel.OrderConditions['INTEREST']},{'l_state_reason':otkaz}]})
                                        #cor.append({'l_state_reason':otkaz})
                                    else:
                                        cor.append({'condition':cn})
                                ands.append({'$or':cor})
                            else:
                                ands.append({'condition':param['c']})
                        # if ('c' in param and param['c']== 'all'):
                        #   ands.append({'condition':{'$ne': dirmodel.OrderConditions['SLEEP']}})
                        #   ands.append({'condition_type':{'$ne': u'закрывающее'}})

                        if ('c' in param and param['c']== u'промежуточное'):
                            ands.append({'condition_type':u'промежуточное'})

                        if param.get('m'):
                            #print(param['m'].split(','))
                            ands.append({'manager': {'$in': param['m'].split(',') }})

                        if ('t' in param and param['t']!= 'all' and param['t']!= 'alltasks'):
                            ands.append({'task':param['t']})
                        if ('t' in param and param['t']== 'alltasks'):
                            ands.append({'task_date':{'$exists': True}})
                            ands.append({'task_date':{'$ne': ''}})
                        if ('r' in param and param['r'] != 'all'):
                            # try:
                            if '-' in param['r']:
                                tdates = param['r'].split('-')
                                td1 = datetime.datetime.strptime(tdates[0]+' 00:00:00','%d.%m.%Y %H:%M:%S')
                                td2 = datetime.datetime.strptime(tdates[1]+' 23:59:59','%d.%m.%Y %H:%M:%S')
                            else:
                                tdates = routine.textToDateRange(param['r'])
                                td1 = tdates[0]
                                td2 = tdates[1]

                            ands.append({'task_date':{'$exists': True}})
                            ands.append({'task_date':{'$gte': td1}})
                            ands.append({'task_date':{'$lte': td2}})

                            # except Exception, e:
                            #   raise e
                        if ('od' in param and param['od'] != 'all'):
                            # try:
                            if '-' in param['od']:
                                odates = param['od'].split('-')
                                od1 = datetime.datetime.strptime(odates[0]+' 00:00:00','%d.%m.%Y %H:%M:%S')
                                od2 = datetime.datetime.strptime(odates[1]+' 23:59:59','%d.%m.%Y %H:%M:%S')
                            else:
                                odates = routine.textToDateRange(param['od'])
                                od1 = odates[0]
                                od2 = odates[1]
                            if param.get('onlnew')=='yes':
                                ands.append({'added':{'$gte': od1}})
                                ands.append({'added':{'$lte': od2}})
                            else:
                                ands.append({'datetime':{'$gte': od1}})
                                ands.append({'datetime':{'$lte': od2}})
                        if ('oed' in param and param['oed'] != 'all'):
                            # try:
                            if '-' in param['oed']:
                                odates = param['oed'].split('-')
                                od1 = datetime.datetime.strptime(odates[0]+' 00:00:00','%d.%m.%Y %H:%M:%S')
                                od2 = datetime.datetime.strptime(odates[1]+' 23:59:59','%d.%m.%Y %H:%M:%S')
                            else:
                                odates = routine.textToDateRange(param['oed'])
                                od1 = odates[0]
                                od2 = odates[1]
                            ands.append({'added':{'$gte': od1}})
                            ands.append({'added':{'$lte': od2}})


                            # except Exception, e:
                            #   raise e

                        if ('cd' in param and param['cd'] != 'all'):# and param['cd'] != 'no'):
                            if '-' in param['cd']:
                                cdates = param['cd'].split('-')
                                cd1 = datetime.datetime.strptime(cdates[0]+' 00:00:00','%d.%m.%Y %H:%M:%S')
                                cd2 = datetime.datetime.strptime(cdates[1]+' 23:59:59','%d.%m.%Y %H:%M:%S')
                            else:
                                cdates = routine.textToDateRange(param['cd'])
                                cd1 = cdates[0]
                                cd2 = cdates[1]
                            ands.append({'close_date':{'$gte': cd1}})
                            ands.append({'close_date':{'$lte': cd2}})
                        if ('iscd' in param and param['iscd'] == 'no'):
                            ands.append({'close_date':{'$ne':None}})


                        if ('fd' in param and param['fd'] != 'all'):# and param['cd'] != 'no'):
                            if '-' in param['fd']:
                                fdates = param['fd'].split('-')
                                fd1 = datetime.datetime.strptime(fdates[0]+' 00:00:00','%d.%m.%Y %H:%M:%S')
                                fd2 = datetime.datetime.strptime(fdates[1]+' 23:59:59','%d.%m.%Y %H:%M:%S')
                            else:
                                fdates = routine.textToDateRange(param['fd'])
                                fd1 = fdates[0]
                                fd2 = fdates[1]
                            ands.append({'finish_date':{'$gte': fd1}})
                            ands.append({'finish_date':{'$lte': fd2}})
                        if ('isfd' in param and param['isfd'] == 'no'):
                            ands.append({'finish_date':{'$ne':None}})

                        # инициатор первого состояния
                        ands.extend(build_initiator_condition(param.get('initiator','').split(',')))

                        if ('ch' in param and param['ch'] == 'ls'):
                            ands.append({'$where': 'this.cur_chance<this.prev_chance'})

                        if ('ch' in param and param['ch'] == 'mr'):
                            ands.append({'$where': 'this.cur_chance>this.prev_chance'})

                        if ('ch' in param and param['ch'] == 'no'):
                            ands.append({'cur_chance':0})
            except Exception, exc:
                print('Error! Get orders.' + str(exc))
                excType = exc.__class__.__name__
                print_exc()

            if len(ands)>0:
                cond = {'$and':ands}
            else:
                cond = {}

            if ('o' in param and param['o'] != 'all'):
                cond = {'_id': ObjectId(param['o'])}

        if ('od' in param and param['od'] != 'all' and 'managers' in param and param['managers'] == '1'):
            # try:
            if '-' in param['od']:
                odates = param['od'].split('-')
                gt_date = datetime.datetime.strptime(odates[0]+' 00:00:00','%d.%m.%Y %H:%M:%S')
                lt_date = datetime.datetime.strptime(odates[1]+' 23:59:59','%d.%m.%Y %H:%M:%S')
            else:
                odates = routine.textToDateRange(param['od'])
                gt_date = odates[0]
                lt_date = odates[1]
        else:
            gt_date = datetime.datetime.utcnow()
            lt_date = datetime.datetime.utcnow()
        managers_activity = ordermodel.get_manager_activity({'gt_date':gt_date, 'lt_date':lt_date})
        managers_activity_significant = ordermodel.get_manager_activity_significant({'gt_date':gt_date, 'lt_date':lt_date})
        activity_total = 0
        activity_significant_total = 0
        ords = ordermodel.get_manager_stat(cond)
        per_manager = {}
        for doc in ords.find():
            m = doc['_id']['manager']
            if m not in per_manager:
                manager_activity = managers_activity[m] if managers_activity.has_key(m) else 0
                manager_activity_significant = managers_activity_significant[m] if managers_activity_significant.has_key(m) else 0

                activity_total += manager_activity
                activity_significant_total += manager_activity_significant

                per_manager[m] = {
                    'activity': manager_activity,
                    'activity_significant':  manager_activity_significant,
                    'activity_percent':  0,
                    'work_ed':0,
                    'work_summ':0,
                    'work_sq':0,
                    'interes_ed':0,
                    'interes_summ':0,
                    'interes_sq':0,
                    'signed_ed':0,
                    'signed_summ':0,
                    'signed_sq':0,
                    'fail_ed':0,
                    'fail_summ':0,
                    'fail_sq':0,
                }
            fx = ''

            if doc['_id']['condition'] in [dirmodel.OrderConditions['INTEREST'], dirmodel.OrderConditions['PUBLIC_COST']]:
                fx = 'interes'
            elif doc['_id']['condition'] in [dirmodel.OrderConditions['CONTRACT_PREPARE'],dirmodel.OrderConditions['CONTRACT_AGREEMENT'],dirmodel.OrderConditions['CONTRACT_TO_SIGN']]:
                fx = 'signed'
            # elif (doc['_id']['condition'] == dirmodel.OrderConditions['REFUSE']):
            #  fx = 'fail'
            #elif (doc['value']['closed'] == 'no' and doc['_id']['condition'] != dirmodel.OrderConditions['SLEEP']):
            elif doc['_id']['condition'] in [dirmodel.OrderConditions['SPECIFY_TZ'],dirmodel.OrderConditions['REQUEST_KP'],dirmodel.OrderConditions['KP_PREPARATION'],dirmodel.OrderConditions['SEND_KP'],dirmodel.OrderConditions['KP_AGREEMENT'],dirmodel.OrderConditions['EXAMINE']]:
                fx = 'work'
            if (fx != ''):
                per_manager[m][fx+'_ed'] += doc['value']['count']
                per_manager[m][fx+'_summ'] += doc['value']['price']
                per_manager[m][fx+'_sq'] += doc['value']['sq']

        for manager_name in per_manager:
            manager_activity = per_manager[manager_name]['activity']
            manager_activity_significant = per_manager[manager_name]['activity_significant']
            if activity_total > 0:
                per_manager[manager_name]['activity_percent'] = round(float(manager_activity) / float(activity_total) * 100, 0)
            else:
                per_manager[manager_name]['activity_percent'] = 0

            if activity_significant_total > 0:
                per_manager[manager_name]['activity_significant_percent'] = round(float(manager_activity_significant) / float(activity_significant_total) * 100, 0)
            else:
                per_manager[manager_name]['activity_significant_percent'] = 0

        man_arr = []
        for key, value in per_manager.iteritems():
            temp = value
            temp.update({'manager':key})
            man_arr.append(temp)

        return man_arr
    except Exception, exc:
        print('Error! Get manager itogo.' + str(exc))
        print_exc()
        raise Exception('Ошибка получения детализации (итого) по менеджеру' )

'''
  Получение итоговой статистики по всем заявкам
  param - условия
  cu - текущий пользователь
'''
def get_itogo(param, cu):
    try:

        ands = []
        # проверяем, может ли текущий пользователь обновить эту заявку
        acc = userlib.get_crm_access_user_list()
        if acc:
            ands.append({'manager':{'$in':acc}})
        # добавляем условие, что заявки в режиме ожидания доступны только админу или создателю заявки
        if cu['admin']!="admin":
            ands.append({'$or':[{'state':{'$ne': 'wait'}},{'manager':cu['email']}]})
        old_date = datetime.datetime.now()
        if (param['o'] == 'all'):
            if (len(param)>0):
                if ('fa' in param and param['fa'] == 'on'):
                    ands.append({'favorite': 'on'})
                if (param['cl']!= 'all'):
                    #ands.append({'client_id':ObjectId(param['cl'])})
                    podpisants = contractmodel.get_clients_for_podpisant(ObjectId(param['cl']))
                    if not podpisants:
                        podpisants= []
                    podpisants.append(ObjectId(param['cl']))
                    if podpisants and len(podpisants)>0:
                        ands.append({'client_id':{'$in':podpisants}})
                if ('c' in param and param['c']!= 'all' and param['c']!='total' and param['c'] != u'промежуточное'):
                    cnd = param['c'].split(',')
                    if len(cnd)>0:
                        cor = []
                        for cn in cnd:
                            if (dirmodel.OrderConditions['REFUSE']+' ') in cn:
                                otkaz = cn.replace(dirmodel.OrderConditions['REFUSE']+' ', '')
                                #cor.append({'l_state_reason':otkaz})
                                cor.append({'$and':[{'condition':dirmodel.OrderConditions['REFUSE']},{'l_state_reason':otkaz}]})
                            elif (dirmodel.OrderConditions['EXAMINE']+' ') in cn:
                                otkaz = cn.replace(dirmodel.OrderConditions['EXAMINE']+' ', '')
                                #cor.append({'l_state_reason':otkaz})
                                cor.append({'$and':[{'condition':dirmodel.OrderConditions['EXAMINE']},{'l_state_reason':otkaz}]})
                            elif (dirmodel.OrderConditions['INTEREST']+' ') in cn:
                                otkaz = cn.replace(dirmodel.OrderConditions['INTEREST']+' ', '')
                                cor.append({'$and':[{'condition':dirmodel.OrderConditions['INTEREST']},{'l_state_reason':otkaz}]})
                                #cor.append({'l_state_reason':otkaz})
                            else:
                                cor.append({'condition':cn})
                        ands.append({'$or':cor})
                    else:
                        ands.append({'condition':param['c']})
                #if ('c' in param and param['c']== 'all'):
                # ands.append({'condition':{'$ne': dirmodel.OrderConditions['SLEEP']}})
                # ands.append({'condition_type':{'$ne': u'закрывающее'}})

                if ('c' in param and param['c']== u'промежуточное'):
                    ands.append({'condition_type':u'промежуточное'})

                if ('itogo' in param):
                    ands.append({'cur_chance':{'$gt':50}})

                if param.get('gr'):
                    cllist = clientmodel.get_list({'group':param.get('gr')},{})
                    ids = [y['_id'] for y in cllist]
                    ands.append({'client_id':{'$in':ids}})

                if param.get('project'):
                    ands.append({'projects.project_id':ObjectId(param.get('project'))})

                if (param['m']!= 'all' and param['m']!= '' ):
                    #ands.append({'manager':param['m']})
                    # ands.append({'manager': {'$in':  param['m'].split(',') } })
                    ands.append({'$or':[{'l_state_manager': {'$in':  param['m'].split(',') } }, {'manager': {'$in':  param['m'].split(',')}} ]})


                if (param['t']!= 'all' and param['t']!= 'alltasks'):
                    ands.append({'task':param['t']})
                if (param['t']== 'alltasks'):
                    ands.append({'task_date':{'$exists': True}})
                    ands.append({'task_date':{'$ne': ''}})
                '''
                if (param['sc']== 'no'):
                  ands.append({'condition':{'$ne': dirmodel.OrderConditions['SLEEP']}})
                  ands.append({'condition_type':{'$ne': u'закрывающее'}})
                '''

                if (param['r'] != 'all'):
                    if '-' in param['r']:
                        tdates = param['r'].split('-')
                        td1 = datetime.datetime.strptime(tdates[0]+' 00:00:00','%d.%m.%Y %H:%M:%S')
                        td2 = datetime.datetime.strptime(tdates[1]+' 23:59:59','%d.%m.%Y %H:%M:%S')
                    else:
                        tdates = routine.textToDateRange(param['r'])
                        td1 = tdates[0]
                        td2 = tdates[1]

                    ands.append({'task_date':{'$exists': True}})
                    ands.append({'task_date':{'$gte': td1}})
                    ands.append({'task_date':{'$lte': td2}})

                if (param['od'] != 'all'):
                    # try:
                    if '-' in param['od']:
                        odates = param['od'].split('-')
                        od1 = datetime.datetime.strptime(odates[0]+' 00:00:00','%d.%m.%Y %H:%M:%S')
                        od2 = datetime.datetime.strptime(odates[1]+' 23:59:59','%d.%m.%Y %H:%M:%S')
                        old_date = od1
                    else:
                        odates = routine.textToDateRange(param['od'])
                        od1 = odates[0]
                        od2 = odates[1]
                        old_date = od1
                    if param.get('onlnew')=='yes':
                        ands.append({'added':{'$gte': od1}})
                        ands.append({'added':{'$lte': od2}})
                    else:
                        ands.append({'datetime':{'$gte': od1}})
                        ands.append({'datetime':{'$lte': od2}})
                if (param['oed'] != 'all'):
                    # try:
                    if '-' in param['oed']:
                        odates = param['oed'].split('-')
                        od1 = datetime.datetime.strptime(odates[0]+' 00:00:00','%d.%m.%Y %H:%M:%S')
                        od2 = datetime.datetime.strptime(odates[1]+' 23:59:59','%d.%m.%Y %H:%M:%S')
                        old_date = od1
                    else:
                        odates = routine.textToDateRange(param['oed'])
                        od1 = odates[0]
                        od2 = odates[1]
                        old_date = od1
                    ands.append({'added':{'$gte': od1}})
                    ands.append({'added':{'$lte': od2}})

                if ('cd' in param and param['cd'] != 'all'):# and param['cd'] != 'no'):
                    if '-' in param['cd']:
                        cdates = param['cd'].split('-')
                        cd1 = datetime.datetime.strptime(cdates[0]+' 00:00:00','%d.%m.%Y %H:%M:%S')
                        cd2 = datetime.datetime.strptime(cdates[1]+' 23:59:59','%d.%m.%Y %H:%M:%S')
                    else:
                        cdates = routine.textToDateRange(param['cd'])
                        cd1 = cdates[0]
                        cd2 = cdates[1]
                    ands.append({'close_date':{'$gte': cd1}})
                    ands.append({'close_date':{'$lte': cd2}})
                if ('iscd' in param and param['iscd'] == 'no'):
                    ands.append({'close_date':{'$ne':None}})

                if ('fd' in param and param['fd'] != 'all'):
                    if '-' in param['fd']:
                        fdates = param['fd'].split('-')
                        fd1 = datetime.datetime.strptime(fdates[0]+' 00:00:00','%d.%m.%Y %H:%M:%S')
                        fd2 = datetime.datetime.strptime(fdates[1]+' 23:59:59','%d.%m.%Y %H:%M:%S')
                    else:
                        fdates = routine.textToDateRange(param['fd'])
                        fd1 = fdates[0]
                        fd2 = fdates[1]
                    ands.append({'finish_date':{'$gte': fd1}})
                    ands.append({'finish_date':{'$lte': fd2}})
                if ('isfd' in param and param['isfd'] == 'no'):
                    ands.append({'finish_date':{'$ne':None}})

                # инициатор первого состояния
                ands.extend(build_initiator_condition(param.get('initiator','').split(',')))

        if len(ands)>0:
            cond = {'$and':ands}
        else:
            cond = {}

        if (param['o'] != 'all'):
            cond = {'_id': ObjectId(param['o'])}

        new_ands = ands[:]
        old_ands = ands[:]
        if (param['od'] == 'all'):
            old_date = old_date - datetime.timedelta(days=30)

        new_ands.append({'added':{'$gte':old_date}})
        old_ands.append({'added':{'$lt':old_date}})

        new_total_cnt = {'count':0, 'price':0, 'sq':0, 'aver':0}
        new_itog = {}
        old_total_cnt = {'count':0, 'price':0, 'sq':0, 'aver':0}
        old_itog = {}
        new_ords = ordermodel.get_stat_new({'$and':new_ands})
        for doc in new_ords.find():
            new_total_cnt['count'] += doc['value']['count']
            new_total_cnt['price'] += doc['value']['price']
            new_total_cnt['sq'] += doc['value']['sq']
            new_total_cnt['aver'] += doc['value']['aver']
            foo = {'_id': doc['_id']['condition'],
                   'new_count':doc['value']['count'],
                   'new_price':doc['value']['price'],
                   'new_sq':doc['value']['sq'],
                   'new_aver':doc['value']['aver']
                   }
            new_itog.update({doc['_id']['condition']:foo})
        old_ords = ordermodel.get_stat_new({'$and':old_ands})
        for doc in old_ords.find():
            old_total_cnt['count'] += doc['value']['count']
            old_total_cnt['price'] += doc['value']['price']
            old_total_cnt['sq'] += doc['value']['sq']
            old_total_cnt['aver'] += doc['value']['aver']
            foo = {'_id': doc['_id']['condition'],
                   'old_count':doc['value']['count'],
                   'old_price':doc['value']['price'],
                   'old_sq':doc['value']['sq'],
                   'old_aver':doc['value']['aver']
                   }
            old_itog.update({doc['_id']['condition']:foo})

        dirs = dirmodel.get_by_type(3)
        real_itog = []
        for dr in dirs:
            foo = {}

            if str(dr['_id']) in new_itog:
                foo = new_itog[str(dr['_id'])]
                foo['type'] = dr['property']
                foo['new_percent'] = int((foo['new_count']*100)/new_total_cnt['count'])
            if str(dr['_id']) in old_itog:
                foo1 = old_itog[str(dr['_id'])]
                foo1['type'] = dr['property']
                foo1['old_percent'] = int((foo1['old_count']*100)/old_total_cnt['count'])
                foo.update(foo1)
            if (len(foo)>0):
                real_itog.append(foo)
        cle = ordermodel.get_client(cond)
        ret = {
            'result': real_itog,
            'clients': cle,
            'count': {
                'new':new_total_cnt['count'],
                'old': old_total_cnt['count'],
                'total':new_total_cnt['count']+old_total_cnt['count']
            }
        }
        return ret
    except Exception, exc:
        print('Error! Get CRM itogo.' + str(exc))
        excType = exc.__class__.__name__
        print_exc()
        raise Exception('Ошибка получения итоговой статистики по всем заявкам' )

'''
  Получение инициатора смены состояния заявки
'''
def build_initiator_condition(initiator_list):
    result = list()
    for initiator in initiator_list:
        if initiator == 'first-they':
            result.append({'f_state_initiator': 'they'})
        elif initiator == 'first-we':
            result.append({'f_state_initiator': 'we'})
        elif initiator == 'last-they':
            result.append({'l_state_initiator': 'they'})
        elif initiator == 'last-we':
            result.append({'l_state_initiator': 'we'})
        elif initiator == 'we':
            result.append({'all_states_initiator_we':True})
        elif initiator == 'they':
            result.append({'all_states_initiator_they':True})
    return result


def check_on_google_folder(number, is_new, usr):
    # type: (int, bool, dict) -> dict
    """ Проверка успешности создания папок на стороне Google диска """
    # локальная функция обновления статуса
    def update_status(order, status, folder_id, note, user_email):
        if order.get('documents'):
            order['documents']['status'] = status
            order['documents']['folder_id'] = folder_id
            order['documents']['datetime'] = datetime.datetime.utcnow()
            order['documents']['manager'] = user_email if user_email else order['documents'].get('manager','')
            order['documents']['note'] = note
            if not order['documents'].get('history'):
                order['documents']['history'] = []
            order['documents']['history'].append({
                'type': status,
                'user': user_email if user_email else order['documents'].get('manager',''),
                'date': datetime.datetime.utcnow(),
                'note': note
            })
        else:
            order['documents'] = {
                'status': status,
                'folder_id': folder_id,
                'datetime': datetime.datetime.utcnow(),
                'manager': user_email if user_email else '',
                'note': note,
                'history':[{
                    'type': status,
                    'user': user_email if user_email else '',
                    'date': datetime.datetime.utcnow(),
                    'note': note
                }]
            }
        ordermodel.upd(order['_id'], {'documents': order['documents']})

    order = None

    try:
        if not isinstance(number, int):
            number = routine.strToInt(number)

        if number <= 0:
            return {'status': 'error', 'msg': 'Ошибка создания каталога документов.', 'documents': None}

        order = ordermodel.get_by_args({'number': routine.strToInt(number)})
        # текущий статус по документам
        document_creation_status = (order.get('documents', {}) or {}).get('status', '')
        document_status_update_offset = 0
        # если вызвано создание каталога документов
        if document_creation_status == '' or (is_new and document_creation_status not in ['ok', 'in_process']):
            print('CRM. Start google folder creation for: {0}'.format(number))
            # запуск создания каталога документов
            try:
                if config.use_worker:
                    config.qu_default.enqueue_call(
                        func=create_order_folder_on_google_drive,
                        args=(number, usr['email'])
                    )
                    update_status(order, 'in_process', '', '', usr['email'])
                else:
                    if not create_order_folder_on_google_drive(number, usr['email']):
                        return {'status': 'error', 'msg': 'Ошибка создания каталога документов.', 'documents': None}

                return {'status': 'ok', 'msg': '', 'documents': {}}

            except Exception, exc:
                update_status(order, 'error', '', u'Ошибка при создании документов. {0}'.format(str(exc)), None)
                print_exc()
                print('Error! create_order_folder_on_google_drive. {0}'.format(str(exc)))
                return {'status': 'error', 'msg': 'Ошибка создания каталога документов.', 'documents': None}

        # если создание документов находится в процессе
        elif order['documents']['status'] == 'in_process':
            print('------CRM. Check google folder status for: {0}---------'.format(number))
            # если не задано время начала статуса, то обновляем статус и проставляем ему время
            if not order['documents'].get('datetime'):
                update_status(order, 'in_process', '', '', usr['email'])
                return {'status': 'ok', 'msg': '', 'documents': order['documents']}

            # вычисление, сколько минут уже длится создание документов
            if isinstance(order['documents']['datetime'], datetime.datetime):
                document_status_update_offset = math.floor(
                    (datetime.datetime.utcnow() - order['documents']['datetime']).seconds / 60
                )
            elif isinstance(order['documents']['datetime'], str) or isinstance(order['documents']['datetime'], unicode):
                try:
                    order_datetime = datetime.datetime.strptime(order['documents']['datetime'], '%Y-%m-%dT%H:%M:%S.%f')
                except ValueError as e:
                    order_datetime = datetime.datetime.strptime(order['documents']['datetime'], '%Y-%m-%dT%H:%M:%S.%fZ')

                if order_datetime is not None:
                    document_status_update_offset = math.floor(
                        datetime.datetime.utcnow() - order_datetime.seconds
                    ) // 60

            if document_status_update_offset >= 2:
                print('CRM. Google folder creation for: {0} error. Too many time'.format(number))
                update_status(
                    order,
                    'error',
                    '',
                    u'Ошибка при создании документов. Превышено время на создание документов.',
                    None
                )
                return {
                    'status': 'ok',
                    'msg': 'Ошибка при создании документов. Превышено время на создание документов.',
                    'documents': order['documents']
                }
            else:
                return {
                    'status': 'ok',
                    'msg': '',
                    'documents': order['documents']
                }
        else:
            return {
                'status': 'ok',
                'msg': 'Операция завершена.',
                'documents': order['documents']
            }
    except Exception, exc:
        print_exc()
        if order is not None:
            update_status(order, 'error', '', u'Ошибка при создании документов. {0}'.format(str(exc)), None)

        return {'status': 'error', 'msg': 'Ошибка создания каталога документов.', 'documents': None}


'''
  Обновление заявки
'''
def update_order(key, param, usr):
    # Сброс договоров по заявке
    def reset_projects(order):
        from models import projectmodel
        # ордеры обновляются только для основных договоров. допы не обновляются
        projectmodel.update({'linked_orders':order['number']},{'$pull':{'linked_orders':order['number']}},False,True)
        #print project
        for p in order.get('projects',[]):
            projectmodel.update({'_id':p['project_id']},{'$push':{'linked_orders':order['number']}})
    #-----------------------------------------------------------------------

    from handlers import errorshandler
    from helpers.google_api import calendar

    start = root_time.clock()
    print 'Start order update'
    has_new_state = False
    has_new_comment = False
    _id = param['id']
    manager = param['cur_manager']
    # проверка доступа для менеджера
    if usr['email'] != manager:
        raise Exception('access_error')
    # удаление лишнего параметра
    try:
        del param['cur_manager']
    except Exception, e:
        pass
    # проверка на ассистента
    # ассистент может сохранить данные, если только он не был последним, кто сменил состояние заявки
    is_assist = any(x['role'] == '542a6776266f340002f39951' for x in usr['roles'])
    if (is_assist and param['manager'] == usr['email']) and len(param.get('history', []))>1:
        raise Exception('access_error')
    # удаление лишнего параметра
    del param['id']
    msgdata = None
    send_mail = False
    mail_title = u''
    old_order =  return_order(ordermodel.get(key))
    # проверяем, может ли текущий пользователь обновить эту заявку
    acc = userlib.get_crm_access_user_list()
    if acc and old_order['manager'] not in acc:
        raise Exception('access_error')
    comment = ''
    if not param.get('contragent_id') and param.get('correspondent'):
        elem = contragentmodel.add({'name':param.get('correspondent'), 'client_id': ObjectId(param.get('correspondent_id')) if param.get('correspondent_id') else None, 'type': 'adresat'})
        param['contragent_id'] = elem['_id']
    if param.get('correspondent_id'):
        param['correspondent_id'] = ObjectId(param.get('correspondent_id'))
    change_comment = ""
    # комментарий изменения
    if 'change_comment' in param:
        change_comment = param['change_comment']
        param['change_comment'] = ""
    # площадь
    sq = 0
    if 'products' in param:
        for prod in param['products']:
            sq = sq + routine.strToFloat(prod['sq']) * routine.strToFloat(prod['count'])
    print "Check order access complete: ", root_time.clock() - start
    start = root_time.clock()
    param['sq'] = sq
    # считаем среднюю стоимость за кв. метр
    param['sq_price'] = param['price']/param['sq'] if 'sq' in param and param['sq'] else 0
    # преобразование строк с датами к формату даты
    param['l_state_date'] = datetime.datetime.strptime(str(param['l_state_date']),'%d.%m.%Y %H:%M:%S') if param['l_state_date'] else None
    # param['datetime'] = param['l_state_date']
    param['prelast_state_date'] = datetime.datetime.strptime(str(param['prelast_state_date']),'%d.%m.%Y %H:%M:%S') if param['prelast_state_date'] else None
    param['f_state_date'] = datetime.datetime.strptime(str(param['f_state_date']),'%d.%m.%Y %H:%M:%S') if param['f_state_date'] else None
    #---
    param['close_date'] = datetime.datetime.strptime(str(param['close_date']), "%d.%m.%Y") if param['close_date'] else None
    param['cur_close_date'] = datetime.datetime.strptime(str(param['cur_close_date']), "%d.%m.%Y") if param['cur_close_date'] else None
    param['last_close_date'] = datetime.datetime.strptime(str(param['last_close_date']), "%d.%m.%Y") if param['last_close_date'] else None
    #---
    param['finish_date'] = datetime.datetime.strptime(str(param['finish_date']), "%d.%m.%Y") if param.get('finish_date') else None
    param['cur_finish_date'] = datetime.datetime.strptime(str(param['cur_finish_date']), "%d.%m.%Y") if param.get('cur_finish_date') else None
    param['last_finish_date'] = datetime.datetime.strptime(str(param['last_finish_date']), "%d.%m.%Y") if param.get('last_finish_date') else None

    if param['dogovornum'] != '':
        param['dogovornum'] = param['dogovornum'].split(',')
    else:
        param['dogovornum'] = []
    # проверка тасков
    for t in param.get('tasks',[]):
        if not t.get('_id') or t.get('_id')=='new':
            t['_id'] = ObjectId()
            t['manager'] = usr['email']
        else:
            t['_id'] = ObjectId(t['_id'])
        # проверка на смену состояния
        if t.get('status','')!='' and t.get('finished_manager','')=='' and t.get('finished_date','')=='':
            t['finished_manager'] = usr['email']
            t['finished_date'] = datetime.datetime.utcnow().strftime('%d.%m.%Y %H:%M:%S')
            date_time = datetime.datetime.combine(datetime.datetime.strptime(t['closedatetime'].split(' ')[0],'%d.%m.%Y'), datetime.time.max)
            if datetime.datetime.utcnow() > date_time:
                t['overdue'] = True
                ordermodel.close_err_history(ObjectId(_id),'task_overdue', usr['email'], {'task_id':t['_id']})
    # print "Check tasks complete: ", root_time.clock() - start
    start = root_time.clock()
    lhs = None
    # роли клиентов
    if param.get('client_roles'):
        if param['client_roles'].get('_id'):
            param['client_roles']['_id'] = ObjectId(param['client_roles']['_id'])
        else:
            param['client_roles_history'] = old_order.get('client_roles_history',[])

            if old_order.get('client_roles'):
                param['client_roles_history'].append(old_order.get('client_roles'))
            param['client_roles']['_id'] = ObjectId()
            param['client_roles']['manager'] = usr['email']

    if 'history' in param and len(param['history'])>0:
        # сортировка истории по дате
        param['history'].sort(key = lambda x: (routine.strToDateTime(x['datetime']) if  routine.strToDateTime(x['datetime']) else  datetime.datetime.utcnow()))

        lhs = param['history'][-1]

        comments = lhs['comments']
        # проверка на изменение коментария у последнего состояния
        for c in comments:
            if not c.get('date_changed') or 'upd' in str(c.get('data_changed')):
                has_new_comment = True

        if lhs['datetime'] == 'new':
            has_new_state = True
            if param['l_state']:
                param['prelast_state'] = param['l_state']
                param['prelast_state_date'] = param['l_state_date']
                param['prelast_state_date_short'] = int(root_time.mktime(param['prelast_state_date'].timetuple())/60/60/24 )
            else:
                param['prelast_state'] = lhs['condition']
                param['prelast_state_date'] = datetime.datetime.utcnow()
                param['prelast_state_date_short'] = int(root_time.mktime(param['prelast_state_date'].timetuple())/60/60/24 )

            if not param['f_state'] or param['f_state']=="":
                param['f_state'] = lhs['condition']
                param['f_state_date'] = datetime.datetime.utcnow()
                param['f_state_date_short'] = int(root_time.mktime(param['f_state_date'].timetuple())/60/60/24 )
            else:
                param['f_state_date'] = param['f_state_date']
                param['f_state_date_short'] = int(root_time.mktime(param['f_state_date'].timetuple())/60/60/24 )

            param['l_state'] = lhs['condition']
            param['l_state_date'] = datetime.datetime.utcnow()
            param['l_state_date_short'] = int(root_time.mktime(param['l_state_date'].timetuple())/60/60/24 )

            # обновление последнего контакта у клиента
            client_id = ObjectId(param['client_id'])
            clientmodel.upd(client_id, {'last_contact_date':datetime.datetime.utcnow()})

            #------
            enddate = None
            try:
                enddate = datetime.datetime.strptime(str(lhs['enddate']), "%d.%m.%Y")
            except:
                enddate = None
            param['close_date'] = enddate
            param['cur_close_date'] = enddate
            param['last_close_date'] = enddate

            #------
            finishdate = None
            try:
                finishdate = datetime.datetime.strptime(str(lhs['finishdate']), "%d.%m.%Y")
            except:
                finishdate = None
            param['finish_date'] = finishdate
            param['cur_finish_date'] = finishdate
            param['last_finish_date'] = finishdate

            param['prelast_days_count'] = (param['prelast_state_date']- param['f_state_date']).days
            param['last_days_count'] = (param['l_state_date']- param['f_state_date']).days
            param['diff_last_prelast_days_count'] = param['last_days_count'] - param['prelast_days_count']

            if param['last_close_date']:
                param['close_days_count'] = (param['last_close_date']- param['l_state_date']).days
            else:
                param['close_days_count'] = None

            if param.get('last_finish_date'):
                param['finish_days_count'] = (param['last_finish_date']- param['l_state_date']).days
            else:
                param['finish_days_count'] = None
            #--------------------------------------------------------------------------------------------------------------------------------------------------


            sost = dirmodel.get_one({'_id':ObjectId(lhs['condition'])})
            # проверка на необходимость точной цены и структуры
            sost_par = ''
            sost_par += 'p' if 'price' in sost and sost['price'] == 'enabled' else ''
            sost_par += 's' if 'structure' in sost and sost['structure'] == 'enabled' else ''
            foo = ch_ordr(sost_par, _id, lhs['condition']) if sost_par != '' else True
            if not foo:
                msgkey = {'type':sost_par, 'order_id':ObjectId(key), 'enabled':True}
                msgdata = {'number':param['number'], 'manager': usr['email'], 'datetime':  datetime.datetime.utcnow(), 'type':sost_par, 'order_id':ObjectId(key),'closed_by_manager':False,  'enabled': param['ignore_state_date'] == 'no', 'client': param['client']}

                if param['ignore_state_date'] != 'no':
                    ordermodel.close_err_history(ObjectId(key), sost_par, usr['email'])
                else:
                    models = msgmodel.get_by(msgkey,{'_id':1})
                    if not models or len(models)==0:
                        ordermodel.add_to_err_history(ObjectId(key), sost_par, usr['email'])

                bar = msgmodel.upsert(msgkey, msgdata)
                msgdata['order_id'] = str(msgdata['order_id'])
                del msgdata['datetime']

            send_mail = False

            # 1506
            # проверка на понижение вероятности, резкое падение вероятности или резкий рост вероятности
            tmp_cur_chance = lhs.get('chance',0)
            tmp_old_chance = old_order.get('chance', 0)

            if tmp_cur_chance-tmp_old_chance>=30:
                mail_title += 'Резкое повышение вероятности. '
                send_mail = True
            elif tmp_cur_chance-tmp_old_chance<=-30:
                mail_title += 'Резкое понижение вероятности. '
                send_mail = True
            elif tmp_cur_chance<tmp_old_chance:
                mail_title += 'Понижение вероятности. '
                send_mail = True

            # проверка на откат состояния
            old_sost = dirmodel.get_one({'_id':ObjectId(old_order['condition'])})
            if sost['number'] < old_sost['number']:
                mail_title += 'Откат состояния. '
                send_mail = True

    print "Check histry complete: ", root_time.clock() - start
    start = root_time.clock()

    # проверяем проекты заказчика
    for p in param.get('projects',[]):
        p['project_id'] = ObjectId(p['project_id'])
    reset_projects(param)

    # 1669 Уведомление о договорной стадии заявки
    if param['l_state'] != param['prelast_state'] and param['prelast_state'] not in dirmodel.OrderContractConditions.values() and param['l_state'] in dirmodel.OrderContractConditions.values():
        send_mail = True

    # добавляем договор, если соответсвующая стадия
    #print ('condition = '+param['l_state'])
    if param['l_state'] in dirmodel.OrderContractConditions.values() and len(param.get('contracts',[]))==0:
        try:
            print ('creating contract')
            #hist = print (param.get('history',[]))
            #print lhs
            contract = None
            #print lhs
            #print '------------------------------------------------'
            # print lhs
            if lhs and lhs.get('contract_creation') and lhs.get('contract_creation').get('type') == 'choose':
                contract = {'number': lhs.get('contract_creation').get('contract_number')}
                print contract
                param['contracts'] = [contract]
            #   contract = contractmodel.add_order_to_contract(_id, param, int(lhs.get('contract_creation').get('contract_number')), usr['email'])
            # else:
            #   contract = contractmodel.create_from_order(_id, param, usr['email'])
            # param['contracts'] = [{'contract_id':contract['_id'], 'number':contract['number'], 'factory_id':contract['factory_id'], 'factory':contract['factory_id'], 'is_signed': contract['is_signed'], 'sign_date':contract['sign_date'], 'deadline':contract['deadline']}]
        except Exception, exc:
            excType = exc.__class__.__name__
            print('Error! Update order. Check on errors. Exception: ' + str(exc))
            print_exc()

    for product in param['products']:
        product['_id'] = ObjectId(product['_id']) if product.get('_id') else ObjectId()
        for position in product.get('positions', []):
            position['_id'] = ObjectId(position['_id']) if position.get('_id') else ObjectId()

    print "Add contract complete: ", root_time.clock() - start
    start = root_time.clock()

    # услуги
    for service in param.get('services',[]):
        if service['_id'].find("new_")==0:
            service['_id'] = ObjectId()

    fields = ['f_state_initiator', 'prelast_state_initiator', 'l_state_initiator']
    for field in fields:
        if field in param:
            param[field] = 'we' if param[field] == 'Мы' else 'they'

    cl = ordermodel.update(_id, param, usr['email'], usr['email'] if not is_assist else param['manager'], change_comment)

    print "save complete complete: ", root_time.clock() - start
    start = root_time.clock()
    ordr =  return_order(ordermodel.get(key))
    print "Get data complete: ", root_time.clock() - start
    start = root_time.clock()

    abc_type =  check_order_on_abc_type(ordr)
    # iss_707. Если новое состояние или у состояния поменялся коментарий, то необходимо уведомить об этом
    if abc_type['price']['is_a'] or abc_type['square']['is_a']:
        if has_new_state or has_new_comment:
            send_mail = True
        mail_title = 'Категория А. ' + mail_title
    # iss_1952. если понижение категории (заявка вышла из категории А, то необходимо уведомить об этом)
    if param.get('abc_type') and ((param['abc_type']['price']['is_a'] and not abc_type['price']['is_a']) or (param['abc_type']['square']['is_a'] and not abc_type['square']['is_a'])):
        send_mail = True
        mail_title = 'Понижение категории. ' + mail_title
    # проверка заявки на ошибки
    try:
        errorshandler.check_order(ObjectId(key))
    except Exception, exc:
        excType = exc.__class__.__name__
        print('Error! Update order. Check on errors. Exception: ' + str(exc))
        print_exc()

    print "Check errors complete: ", root_time.clock() - start

    start = root_time.clock()
    # добавление события в календарь
    try:
        if not config.use_worker:
            add_calendar_event(_id, usr, key, old_order.get('history'))
        else:
            config.qu_default.enqueue_call(func=add_calendar_event, args=(_id, usr, key, old_order.get('history')))
    except Exception, exc:
        excType = exc.__class__.__name__
        print('---------Error! Calendar event update--------------------')
        print_exc()
        pass
    # если необходима отправка уведомления
    if send_mail:
        mail_title = '[CRM] {0} - '.format(str(old_order.get('number',''))) + mail_title

        # если смена состояния
        if param['l_state'] != param['prelast_state']:
            # если договорная стадия
            if param['prelast_state'] not in dirmodel.OrderContractConditions.values() and param['l_state'] in dirmodel.OrderContractConditions.values():
                mail_title+=' Договорная стадия. '
            # если отказ
            if param['l_state'] == dirmodel.OrderConditions['REFUSE']:
                mail_title = '[CRM] {0} - Отказ.'.format(str(old_order.get('number','')))
            # если Спящий
            if param['l_state'] == dirmodel.OrderConditions['SLEEP']:
                mail_title = '[CRM] {0} - Спящий.'.format(str(old_order.get('number','')))

        notice_users = usermodel.get_list({'notice.key': noticemodel.notice_keys['crm_common']['key'], 'stat': {'$ne': 'disabled' }},{'email':1,'fio':1})
        try:
            if not config.use_worker:
                send_order_notification(mail_title,usr['email'],key, notice_users)
            else:
                config.qu_default.enqueue_call(func=send_order_notification, args=(mail_title,usr['email'],key, notice_users))
        except Exception, exc:
            excType = exc.__class__.__name__
            print('---------Error! Send order notification--------------------')
            print_exc()
            pass

    if msgdata:
        ordr['mess'] = [msgdata]
    return ordr

def prepare_documents_stat_info(folders):
    '''
    #1652
    за каждый найденный каталог формируем строку: нашли каталог заявки: З; подкаталог Чертежи: ЗЧ;
    подкаталог Готовые: ЗЧГ; Исходники: ЗЧГИ. если чего-то нет, то на место буквы почерк)
  
    "Чертежи, Готовые, PDF" - кол-во файлов в каталоге с расширением PDF
    "Чертежи, Готовые, Другое" - кол-во файлов в каталоге с расширением не-PDF
    "Чертежи, Исходники, cdw" - кол-во файлов в каталоге с расширением cdw
    "Чертежи, Исходники, rte" - кол-во файлов в каталоге с расширением rte
    "Чертежи, Исходники, rvt" - кол-во файлов в каталоге с расширением rvt
    "Чертежи, Исходники, Другое" - кол-во файлов в каталоге с расширением не-rte и не-cdw
  
    'Чертежи', 'Чертежи/Готовые', 'Чертежи/Исходники'
    '''
    import re
    # регулярное выражение для поиска вхождения ТО в строке
    regx1 = re.compile('([^A-Za-zА-Яа-я0-9]то[^A-Za-zА-Яа-я0-9])|([^A-Za-zА-Яа-я0-9]to[^A-Za-zА-Яа-я0-9])', re.IGNORECASE)


    keys = [u'Чертежи', u'Чертежи/Готовые', u'Чертежи/Исходники']
    short_keys = {
        u'Чертежи': 'Ч',
        u'Чертежи/Готовые': 'Г',
        u'Чертежи/Исходники': 'И'
    }

    folders_full_key = 'З'
    folders_arr = {}
    files = {
        'ready_pdf': {
            'files': [],
            'last_file': None
        },
        'ready_other':{
            'files': [],
            'last_file': None
        },
        'to_ready': {
            'files': [],
            'last_file': None
        },
        'to_ish':{
            'files': [],
            'last_file': None
        },
        'ish_cdw':{
            'files': [],
            'last_file': None
        },
        'ish_rte':{
            'files': [],
            'last_file': None
        },
        'ish_rvt':{
            'files': [],
            'last_file': None
        },
        'ish_other':{
            'files': [],
            'last_file': None
        }
    }

    for folder in folders:
        folders_arr[folder['path_str']] = folder
        if u'Чертежи/Готовые' in folder['path_str']:
            for file in folder['files']:
                if file['title'].split(".")[-1].lower() == 'pdf':
                    if re.search(regx1, file['title']):
                        files['to_ready']['files'].append(file)
                        if not files['to_ready']['last_file']:
                            files['to_ready']['last_file'] = file
                        elif datetime.datetime.strptime(file['modifiedDate'],'%Y-%m-%dT%H:%M:%S.%fZ')>datetime.datetime.strptime(files['ready_pdf']['last_file']['modifiedDate'],'%Y-%m-%dT%H:%M:%S.%fZ'):
                            files['to_ready']['last_file'] = file
                    else:
                        files['ready_pdf']['files'].append(file)
                        if not files['ready_pdf']['last_file']:
                            files['ready_pdf']['last_file'] = file
                        elif datetime.datetime.strptime(file['modifiedDate'],'%Y-%m-%dT%H:%M:%S.%fZ')>datetime.datetime.strptime(files['ready_pdf']['last_file']['modifiedDate'],'%Y-%m-%dT%H:%M:%S.%fZ'):
                            files['ready_pdf']['last_file'] = file
                else:
                    files['ready_other']['files'].append(file)
                    if not files['ready_other']['last_file']:
                        files['ready_other']['last_file'] = file
                    elif datetime.datetime.strptime(file['modifiedDate'],'%Y-%m-%dT%H:%M:%S.%fZ')>datetime.datetime.strptime(files['ready_other']['last_file']['modifiedDate'],'%Y-%m-%dT%H:%M:%S.%fZ'):
                        files['ready_other']['last_file'] = file
        elif u'Чертежи/Исходники' in folder['path_str']:
            for file in folder['files']:
                if re.search(regx1, file['title']):
                    files['to_ish']['files'].append(file)
                    if not files['to_ish']['last_file']:
                        files['to_ish']['last_file'] = file
                    elif datetime.datetime.strptime(file['modifiedDate'],'%Y-%m-%dT%H:%M:%S.%fZ')>datetime.datetime.strptime(files['ready_pdf']['last_file']['modifiedDate'],'%Y-%m-%dT%H:%M:%S.%fZ'):
                        files['to_ish']['last_file'] = file
                else:
                    if file['title'].split(".")[-1].lower() == 'cdw':
                        files['ish_cdw']['files'].append(file)
                        if not files['ish_cdw']['last_file']:
                            files['ish_cdw']['last_file'] = file
                        elif datetime.datetime.strptime(file['modifiedDate'],'%Y-%m-%dT%H:%M:%S.%fZ')>datetime.datetime.strptime(files['ish_cdw']['last_file']['modifiedDate'],'%Y-%m-%dT%H:%M:%S.%fZ'):
                            files['ish_cdw']['last_file'] = file
                    elif file['title'].split(".")[-1].lower() == 'rte':
                        files['ish_rte']['files'].append(file)
                        if not files['ish_rte']['last_file']:
                            files['ish_rte']['last_file'] = file
                        elif datetime.datetime.strptime(file['modifiedDate'],'%Y-%m-%dT%H:%M:%S.%fZ')>datetime.datetime.strptime(files['ish_rte']['last_file']['modifiedDate'],'%Y-%m-%dT%H:%M:%S.%fZ'):
                            files['ish_rte']['last_file'] = file
                    elif file['title'].split(".")[-1].lower() == 'rvt':
                        files['ish_rvt']['files'].append(file)
                        if not files['ish_rvt']['last_file']:
                            files['ish_rvt']['last_file'] = file
                        elif datetime.datetime.strptime(file['modifiedDate'],'%Y-%m-%dT%H:%M:%S.%fZ')>datetime.datetime.strptime(files['ish_rvt']['last_file']['modifiedDate'],'%Y-%m-%dT%H:%M:%S.%fZ'):
                            files['ish_rvt']['last_file'] = file
                    else:
                        files['ish_other']['files'].append(file)
                        if not files['ish_other']['last_file']:
                            files['ish_other']['last_file'] = file
                        elif datetime.datetime.strptime(file['modifiedDate'],'%Y-%m-%dT%H:%M:%S.%fZ')>datetime.datetime.strptime(files['ish_other']['last_file']['modifiedDate'],'%Y-%m-%dT%H:%M:%S.%fZ'):
                            files['ish_other']['last_file'] = file

    for s_key in keys:
        if s_key in folders_arr:
            folders_full_key+=short_keys[s_key]

    res = {}
    for key in files:
        res[key+'_count'] = len(files[key]['files'])
        res[key+'_last_file'] = files[key]['last_file']
    res['full_key']= folders_full_key

    return res

def get_google_documents_struct(order_numbers = None):
    '''
      Для всех заявок проверяется наличие документов на Google Disk.
      Если документы есть, то берется вся структура папкок и документов.
      На основании собранных данных строится виртуальная структура данных и
      сохраняется в БД на уровне заявки.
    '''
    from helpers.google_api import drive
    try:

        service = drive.get_service(config.google_api_user)
        if not service:
            raise Exception('Нет доступа к документам GOOGLE')

        condition = {'documents.folder_id':{'$ne':None}}
        if order_numbers and len(order_numbers):
            condition['number'] = {'$in': order_numbers}

        # получить все заявки у которых задан каталог GOOGLE
        for row in ordermodel.get_list(condition, {'documents':1, 'number':1}):
            #for row in ordermodel.get_list({'number':{'$in':[6411, 6575, 6722, 6723,6724]}}, {'documents':1, 'number':1}):
            folder_id = row['documents']['folder_id']
            try:
                # получить иерархию документов на гугл диске
                row['documents']['struct'] = drive.retrieve_folder_struct(service, folder_id, [], {}, None).values()

                print('-----')
                print(row['number'])
                print(len(row['documents']['struct']))
                print(prepare_documents_stat_info(row['documents']['struct']))

                # print(row['documents']['struct'])
                # обновить данные по заявке
                ordermodel.upd(row['_id'], {'documents': row['documents']})
            except Exception, ex:
                print_exc()
                pass

    except Exception, exc:
        print_exc()
        raise Exception(str(exc))

def set_google_catalogs_rights(data, queue_key=None, usr = None):
    '''
      Скрипт для раздачи прав на каталоги заявок
      queue_key - флаг, указывающий на необходимость проведения данных через БД (для щагрузки через очередь)
      если флаг не задан, то идет линейное формирование данных и возврат результата
      data = {
        'order_numbers': [],
        'catalogs': [],
        'users': [],
        'access': '' // close, read, write
      }
    '''
    try:
        from classes.progressmanager import *
        from helpers.google_api import drive
        # объект управления прогрессом выполнения расчетов
        progressManager = ProgressManager(queue_key)
        # result list
        result_data = []
        data_orders = {}
        data_users = {}

        # Отсеить несущесвующие заявки
        for row in ordermodel.get_list(
                {
                    'number': {'$in': [routine.strToInt(item) for item in data['order_numbers']]}
                },
                {
                    'documents':1,
                    'number':1
                }):
            data_orders[row['number']] = row

        for order_number in data['order_numbers']:
            if routine.strToInt(order_number) not in data_orders:
                result_data.append({
                    'status': 'error',
                    'order_number': order_number,
                    'path': '',
                    'user_email': '',
                    'note': u'Заявка не найдена.'
                })

        tmp_orders = []
        for row in data_orders.values():
            if 'documents' not in row or not row['documents'] or not row['documents'].get('folder_id'):
                result_data.append({
                    'status': 'error',
                    'order_number': order_number,
                    'path': '',
                    'user_email': '',
                    'note': u'Заявка не содержит GOOGLE каталога.'
                })
            else:
                tmp_orders.append(row)
        data_orders = tmp_orders

        # отсеить несуществующих пользователей
        for row in usermodel.get_list(
                {
                    'email': {'$in': data['users']}
                },
                {
                    'email':1,
                    'fio':1
                }
        ):
            data_users[row['email']] = row

        for user_email in data['users']:
            if user_email not in data_users:
                result_data.append({
                    'status': 'error',
                    'order_number': '',
                    'path': '',
                    'user_email': user_email,
                    'note': u'Пользователь не найден.'
                })
        data_users = data_users.values()

        # рассчет сколько итераций всего потребуется
        all_iterations_count = len(data_orders) * len(data['catalogs']) * len(data_users)
        i=0;

        # get google service
        service = drive.get_service(config.google_api_user)
        if not service:
            raise Exception(u'Ошибка получения доступа к документам. Нет доступа.')

        # proccesion collected data
        for order_row in data_orders:
            # получаем структуру документов для заявки
            try:
                order_row['documents']['struct'] = drive.retrieve_folder_struct(service, order_row['documents']['folder_id'], [], {}, None).values()

                for catalog_name in data['catalogs']:
                    # поиск текущего пути к катлогу среди сущестовующих у заявки
                    catalog_id = None
                    for folder_row in order_row['documents']['struct']:
                        if routine.remove_all_spaces(folder_row.get('path_str')).lower() == routine.remove_all_spaces(catalog_name).lower():
                            catalog_id = folder_row['info'].get('id')

                    if catalog_id:
                        # меняем права юзера для указанного каталога
                        for user_row in data_users:
                            i+=1
                            try:

                                # получить все доступы на каталоге
                                permissions = drive.retrieve_permissions(service, catalog_id)
                                # ищем есть ли доступ у текущего пользователя на данный каталог
                                if permissions:
                                    for f_permission in permissions:
                                        if f_permission.get('emailAddress') == user_row['email']:
                                            drive.remove_permission(service, catalog_id, f_permission['id'])
                                            break

                                # назнаить новые права пользователю на каталог
                                if data['access'] in ['read', 'write']:
                                    new_role = 'reader' if data['access'] =='read' else 'writer'

                                    drive.share_folder(
                                        service,
                                        catalog_id,
                                        [
                                            {'email': user_row['email'], 'fio': ''}
                                        ],
                                        u'Номер заявки: {0}. Менеджер: {1}.'.format(
                                            str(order_row['number']),
                                            user_row['email']
                                        ),
                                        new_role
                                    )

                                result_data.append({
                                    'status': 'success',
                                    'order_number': str(order_row['number']),
                                    'path': catalog_name,
                                    'user_email': user_row['email'],
                                    'note': 'OK'
                                })

                            except Exception, ex2:
                                print_exc()
                                result_data.append({
                                    'status': 'error',
                                    'order_number': str(order_row['number']),
                                    'path': catalog_name,
                                    'user_email': user_row['email'],
                                    'note': u'Не удалось для данного пользователя назначить требуемые права. Подробности: {0}'.format(str(ex1))
                                })

                            # выставление процента исполнения задания
                            if queue_key:
                                progressManager.progress(i*100/float(all_iterations_count))
                    else:
                        result_data.append({
                            'status': 'error',
                            'order_number': str(order_row['number']),
                            'path': catalog_name,
                            'user_email': '',
                            'note': u'Данная заявка не содержит указанный каталог.'
                        })
            except Exception, ex1:
                print_exc()
                result_data.append({
                    'status': 'error',
                    'order_number': str(order_row['number']),
                    'path': '',
                    'user_email': '',
                    'note': u'Нет доступа к документам заявки. Подробности: {0}'.format(str(ex1))
                })

        # # пробежать по всем отобранным заявкам и получить им обновленную структуру каталогов и пермиссионов
        # for order_row in data_orders:
        #   try:
        #     order_row['documents']['struct'] = drive.retrieve_folder_struct(service, order_row['documents']['folder_id'], [], {}, None).values()
        #     # обновить данные по заявке
        #     ordermodel.upd(order_row['_id'], {'documents': order_row['documents']})
        #   except:
        #     pass

        # результирующий объект
        res = routine.JSONEncoder().encode({
            'status': 'success',
            'data': result_data
        })

        if queue_key:
            progressManager.complete('', Binary(routine.compress(res)))
        else:
            return res

    except Exception, exc:
        print_exc()
        if queue_key:
            queuemodel.update(queue_key, {'status': 'error', 'note': str(exc), 'data': None, 'finish_date': datetime.datetime.utcnow() })
        else:
            raise Exception(str(exc))

def check_google_catalogs_rights(data, queue_key=None, usr = None):
    '''
      Скрипт для проверки прав на google каталоги
      queue_key - флаг, указывающий на необходимость проведения данных через БД (для щагрузки через очередь)
      если флаг не задан, то идет линейное формирование данных и возврат результата
      data = {
        'folder_id': ''
      }
    '''
    try:
        from classes.progressmanager import *
        from helpers.google_api import drive
        # объект управления прогрессом выполнения расчетов
        progressManager = ProgressManager(queue_key)
        service = drive.get_service(config.google_api_user)
        result_data = []
        # получить все подкаталоги первого уровня
        folders = drive.get_folder_list(service, data['folder_id'])
        # собрать все каталоги в подкаталогах
        if folders:
            all_iterations_count = len(folders)
            i=0;

            for folder in folders:
                try:
                    i+=1;
                    # выставление процента исполнения задания
                    if queue_key:
                        progressManager.progress(i*100/float(all_iterations_count))
                        try:
                            # получение структуры подкаталога
                            folder_struct = drive.retrieve_folder_struct(service, folder['id'], [], {}, None).values()

                            if folder_struct and len(folder_struct)>0:
                                for s_folder in folder_struct:
                                    if s_folder.get('permissions') and len(s_folder['permissions'])>0:
                                        for f_permission in s_folder['permissions']:
                                            if f_permission['type'] == 'domain':
                                                result_data.append({
                                                    'status': 'success',
                                                    'id': s_folder['info']['id'],
                                                    'name': s_folder['info']['title'] if s_folder['path_str']=='/' else folder['title'] + '/' + s_folder['path_str'],
                                                    'acces_type': 'domain'
                                                })
                                            elif f_permission['type'] == 'anyone':
                                                result_data.append({
                                                    'status': 'success',
                                                    'id': s_folder['info']['id'],
                                                    'name': s_folder['info']['title'] if s_folder['path_str']=='/' else s_folder['path_str'],
                                                    'acces_type': 'anyone'
                                                })

                            # permissions = drive.retrieve_permissions(service, folder['id'])
                            # if permissions:
                            #   for f_permission in permissions:
                            #     if f_permission['type'] == 'domain':
                            #       result_data.append({
                            #         'status': 'success',
                            #         'id': folder['id'],
                            #         'name': folder['title'],
                            #         'acces_type': 'domain'
                            #       })
                            #     elif f_permission['type'] == 'anyone':
                            #       result_data.append({
                            #         'status': 'success',
                            #         'id': folder['id'],
                            #         'name': folder['title'],
                            #         'acces_type': 'anyone'
                            #       })

                        except Exception, exc2:
                            print('Exc2: {0}'.format(str(exc2)))
                            pass
                except Exception, exc1:
                    print('Exc1:  {0}'.format(str(exc1)))
                    pass
        else:
            raise Exception('У данного каталога нет подкаталогов.')

        # результирующий объект
        res = routine.JSONEncoder().encode({
            'status': 'success',
            'data': result_data
        })

        if queue_key:
            progressManager.complete('', Binary(routine.compress(res)))
        else:
            return res

    except Exception, exc:
        print_exc()
        if queue_key:
            queuemodel.update(queue_key, {'status': 'error', 'note': str(exc), 'data': None, 'finish_date': datetime.datetime.utcnow() })
        else:
            raise Exception(str(exc))

def get_all_orders_for_filters():
    '''
      Получить список номеров заказов по всем заявкам для дальнейшего использования в филтрации
      В выборку попадают только заявки в работе
    '''
    result = []
    orders = ordermodel.get_list({
        # 'l_state': {'$ne': dirmodel.OrderConditions['REFUSE']},
        # 'condition_type': u'промежуточное'
    },
        {'number': 1, 'products': 1}
    )
    for row in orders:
        products_count = len((row.get('products',[]) or []))
        if products_count > 0:
            for i in range(products_count):
                tmp_number = '{0}.{1}'.format(
                    str(row['number']),
                    str(i+1)
                )
                result.append(tmp_number)
    result.sort()
    return result
