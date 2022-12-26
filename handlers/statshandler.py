#!/usr/bin/python
# -*- coding: utf-8 -*-
import datetime
import time
from copy import copy
from traceback import print_exc

from bottle import get, request, response
from bson.objectid import ObjectId

import config
import routine
from apis.esud import esudapi
from apis.stats import statsapi
from helpers.google.spreadsheets import spreadsheet_update
from libraries import userlib
from models import workordermodel, contractmodel, sectormodel, materialsgroupmodel, usermodel, dirmodel
from models.dirmodel import OrderConditions


def get_stats_production():
    '''Статистика по фактам производства'''
    result = []
    try:
        # arrContractIds = []
        # сбор информации по всем участкам
        arrDataSectors = sectormodel.get_all_only_sectors()
        dataSectors = {}
        for row in arrDataSectors:
            dataSectors[row['code']] = row

        # получение данных по статистике
        data_array = workordermodel.get_stats_production()
        # получение статистики по площадям продукции в договорах
        contracts_square_data = contractmodel.get_production_summ_square_by_all_contracts()

        # перегруппировка данных по догоуора и типу участка
        data = {}
        if data_array and len(data_array)>0:
            for row in data_array:
                #if row['sector_code']!=10 and len(row['dates'])>0:
                if len(row['dates'])>0:
                    # if row['contract_id'] not in data:
                    #   arrContractIds.append(row['contract_id'])
                    if row['contract_number'] not in data:
                        data[row['contract_number']] = {'contract_id':row['contract_id'], 'sector_types': {} }
                    if row['sector_code'] in dataSectors and dataSectors[row['sector_code']]['type'] not in data[row['contract_number']]['sector_types']:
                        data[row['contract_number']]['sector_types'][dataSectors[row['sector_code']]['type']]={'dates':[], 'dates_diff':0}

                    data[row['contract_number']]['sector_types'][dataSectors[row['sector_code']]['type']]['dates'].extend(x for x in row['dates'] if x not in data[row['contract_number']]['sector_types'][dataSectors[row['sector_code']]['type']]['dates'])

        if data and len(data)>0:
            for contract_number in data:
                for sector_code in data[contract_number]['sector_types']:
                    dates = data[contract_number]['sector_types'][sector_code]['dates']
                    if len(dates)>0:
                        dates.sort(key = lambda x:(x))
                        min_date = dates[0]
                        max_date = dates[len(dates)-1]
                        days_diff = (max_date - min_date).days
                        data[contract_number]['sector_types'][sector_code]['dates_diff'] = days_diff
                result.append({
                    'contract_number': contract_number,
                    'sector_types': data[contract_number]['sector_types'],
                    'contract_square': contracts_square_data[data[contract_number]['contract_id']]['full_products_square'] if data[contract_number]['contract_id'] in contracts_square_data else 0
                })
        if len(result)>0:
            result.sort(key = lambda x:(x['contract_number']), reverse=True)
        return result
    except Exception, exc:
        print('Error! Get stats production.' + str(exc))
        excType = exc.__class__.__name__
        print_exc()
        return None


@get('/stats/finance')
def get_stats_finance():
    '''
    статистика по платежам открытых договоров. iss #1382
  '''
    from xlwt import Workbook, XFStyle, Alignment, Font
    import StringIO

    userlib.check_page_access("finance","r")
    response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=UTF-8'
    response.headers['Content-Type'] = 'application/vnd.ms-excel'
    response.headers['Content-Disposition'] = 'attachment; filename=contract_stat_' +datetime.datetime.utcnow().strftime('%d_%m_%Y_%H_%M_%S')+'.xls'
    try:

        result = statsapi.get_finance()


        output = StringIO.StringIO()
        wb = Workbook(encoding='utf-8')
        ws = wb.add_sheet('Data')
        # styles
        al1 = Alignment()
        al1.horz = Alignment.HORZ_LEFT
        al1.vert = Alignment.VERT_TOP
        al1.wrap = Alignment.WRAP_AT_RIGHT
        font = Font()
        font.bold = True
        style1 = XFStyle()
        style1.alignment = al1
        style_header = XFStyle()
        style_header.alignment = al1
        style_header.font = font
        date_format = XFStyle()
        date_format.num_format_str = 'dd/mm/yyyy'
        datetime_format = XFStyle()
        datetime_format.num_format_str = 'dd/mm/yyyy HH:MM'

        #set header------------
        ws.write(0,0, u"Завод".encode("utf-8"),style_header)
        ws.write(0,1, u"Название заказчика".encode("utf-8"),style_header)
        ws.write(0,2, u"Номер договора".encode("utf-8"),style_header)
        ws.write(0,3, u"Номер заказа".encode("utf-8"),style_header)
        ws.write(0,4, u"Назначение платежа".encode("utf-8"),style_header)
        ws.write(0,5, u"Вид платежа".encode("utf-8"),style_header)
        ws.write(0,6, u"Дата начала".encode("utf-8"),style_header)
        ws.write(0,7, u"Дата окончания".encode("utf-8"),style_header)
        ws.write(0,8, u"Размер".encode("utf-8"),style_header)

        # columns width
        ws.col(0).width = 256 * 20 # Завод
        ws.col(1).width = 256 * 30 # заказчик
        ws.col(2).width = 256 * 10 # номер договора
        ws.col(3).width = 256 * 10 # номер заказа
        ws.col(4).width = 256 * 15 # назначение платежа
        ws.col(5).width = 256 * 15 # вид платежа
        ws.col(6).width = 256 * 15 # дата начала
        ws.col(7).width = 256 * 15 # дата окончания
        ws.col(8).width = 256 * 15 # Сумма всего

        rowIndex = 1
        for row in result:
            ws.write(rowIndex,0, row['factory'],style1)
            ws.write(rowIndex,1, row['client'],style1)
            ws.write(rowIndex,2, str(row['contract_number']),style1)
            ws.write(rowIndex,3, row['order_number'],style1)
            ws.write(rowIndex,4, row['payment_use'],style1)
            ws.write(rowIndex,5, row['payment_type'],style1)
            ws.write(rowIndex,6, row['start_date'],date_format)
            ws.write(rowIndex,7, row['end_date'],date_format)
            ws.write(rowIndex,8, row.get('size',0),style1)

            rowIndex+=1
        wb.save(output)
        output.seek(0)
        return output.read()
    except Exception, exc:
        print('Error! Get stats contract.' + str(exc))
        excType = exc.__class__.__name__
        print_exc()
        return {'status':'error', 'msg':'Error! Msg: '+ str(exc)}


@get('/stats/contract/vers1')
def get_stats_contract_vers1():
    '''
  Статистика по Договорам. ISS: #927
  '''
    from models import ordermodel, usermodel
    from xlwt import Workbook, XFStyle, Alignment, Font
    import StringIO

    userlib.check_page_access('stats','r')
    response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=UTF-8'
    response.headers['Content-Type'] = 'application/vnd.ms-excel'
    response.headers['Content-Disposition'] = 'attachment; filename=contract_stat_' +datetime.datetime.utcnow().strftime('%d_%m_%Y_%H_%M_%S')+'.xls'
    try:

        users =  {}
        for row in  usermodel.get_list(None, {'email':1,'fio':1}):
            users[row['email']] = row

        contracts = []
        contracts_orders_ids = []
        data = contractmodel.get_list_by({'parent_id': ''},
                                         {
                                             'number':1,
                                             'is_signed':1,
                                             'is_canceled':1,
                                             'client_name':1,
                                             'client_id':1,
                                             'client_signator':1,
                                             'sign_date':1,
                                             'productions':1,
                                             'services':1,
                                             'products_count':1,
                                             'price': 1,
                                             'factory': 1,
                                             'orders': 1,
                                             'total': 1
                                         })

        for row in data:
            contracts.append(row)
            if row.get('orders'):
                contracts_orders_ids.extend( [ rc['_id'] for rc in row.get('orders') ] )

        data_orders = {}
        for row in ordermodel.get_list(
                {'_id': {'$in': contracts_orders_ids }},
                { 'manager':1, 'number': 1 }
        ):
            row['manager_fio'] = users[row['manager']].get('fio') if row['manager'] in users and users[row['manager']] else None
            data_orders[str(row['number'])] = row

        for row in contracts:
            row['full_sq'] = 0
            row['full_units_count'] = 0
            row['full_price'] = (row.get('total',{}) or {}).get('cost', 0)
            # в подсчете по продукции не учитывается сумма монтажа
            for product in row.get('productions', []):
                row['full_units_count']+= routine.strToFloat(product.get('count',0))
                row['full_sq'] += routine.strToFloat(product.get('count',0)) *routine.strToFloat(product.get('square',0))
            #   row['full_price'] += routine.strToFloat(product.get('count',0)) *routine.strToFloat(product.get('price',0))
            # for service in row.get('services', []):
            #   row['full_price'] +=routine.strToFloat(service.get('price',0))

        contracts.sort(key=lambda x:(x['number']))

        #Генерация XLS файла
        output = StringIO.StringIO()
        wb = Workbook(encoding='utf-8')
        ws = wb.add_sheet('Data')
        # styles
        al1 = Alignment()
        al1.horz = Alignment.HORZ_LEFT
        al1.vert = Alignment.VERT_TOP
        al1.wrap = Alignment.WRAP_AT_RIGHT
        font = Font()
        font.bold = True
        style1 = XFStyle()
        style1.alignment = al1
        style_header = XFStyle()
        style_header.alignment = al1
        style_header.font = font
        date_format = XFStyle()
        date_format.num_format_str = 'dd/mm/yyyy'
        datetime_format = XFStyle()
        datetime_format.num_format_str = 'dd/mm/yyyy HH:MM'

        #set header------------
        ws.write(0,0, u"Номер договора".encode("utf-8"),style_header)
        ws.write(0,1, u"Подписан".encode("utf-8"),style_header)
        ws.write(0,2, u"Заказчик CRM".encode("utf-8"),style_header)
        ws.write(0,3, u"Заказчик CRM ID".encode("utf-8"),style_header)
        ws.write(0,4, u"Подписант".encode("utf-8"),style_header)
        ws.write(0,5, u"Дата заключения".encode("utf-8"),style_header)
        ws.write(0,6, u"Общая пл.".encode("utf-8"),style_header)
        ws.write(0,7, u"Кол-во зданий".encode("utf-8"),style_header)
        ws.write(0,8, u"Сумма всего".encode("utf-8"),style_header)
        ws.write(0,9, u"Завод".encode("utf-8"),style_header)

        ws.write(0,10, u"Заявка".encode("utf-8"),style_header)
        ws.write(0,11, u"Менеджер".encode("utf-8"),style_header)

        # columns width
        ws.col(0).width = 256 * 10 # Номер договора
        ws.col(1).width = 256 * 10 # Подписан (ДА / НЕТ), расторгнутые в НЕТ
        ws.col(2).width = 256 * 30 # Заказчик CRM
        ws.col(3).width = 256 * 20 # Заказчик CRM ID
        ws.col(4).width = 256 * 30 # Подписант
        ws.col(5).width = 256 * 15 # Дата заключения (из поля "Дата подписания заказчиком)
        ws.col(6).width = 256 * 15 # Общая пл.
        ws.col(7).width = 256 * 10 # Кол-во зданий (кол-во основных позиций всего штук)
        ws.col(8).width = 256 * 15 # Сумма всего
        ws.col(9).width = 256 * 20 # Завод

        ws.col(10).width = 256 * 20 # Заявка
        ws.col(11).width = 256 * 20 # Менеджер

        rowIndex = 1
        for row in contracts:
            ws.write(rowIndex,0, row['number'],style1)
            ws.write(rowIndex,1, 'Да' if row.get('is_signed') == 'yes' and not row.get('is_canceled') else 'Нет',style1)
            ws.write(rowIndex,2, row['client_name'],style1)
            ws.write(rowIndex,3, str(row.get('client_id','') or ''),style1)
            ws.write(rowIndex,4, row.get('client_signator',''),style1)
            ws.write(rowIndex,5, (row['sign_date'] +datetime.timedelta(hours=routine.moscow_tz_offset) ) if row.get('sign_date') else None, date_format)
            ws.write(rowIndex,6, row['full_sq'],style1)
            ws.write(rowIndex,7, row['full_units_count'],style1)
            ws.write(rowIndex,8, row.get('full_price',0),style1)
            ws.write(rowIndex,9, row['factory'],style1)

            order_numbers = ''
            order_managers = ''
            if row.get('orders'):
                order_numbers ='; '.join([str(rc['number']).replace('.0', '')  for rc in row.get('orders')])

                order_managers ='; '.join(list(set([
                    data_orders[str(rc['number'])]['manager_fio'] if data_orders.get(str(rc['number'])) else '' for rc in row.get('orders')
                ])))

            ws.write(rowIndex,10, order_numbers,style1)
            ws.write(rowIndex,11, order_managers,style1)


            rowIndex+=1
        wb.save(output)
        output.seek(0)
        return output.read()

    except Exception, exc:
        print('Error! Get stats contract.' + str(exc))
        excType = exc.__class__.__name__
        print_exc()
        return {'status':'error', 'msg':'Error! Msg: '+ str(exc)}


@get('/stats/contract/<contract_number>')
def get_stats_contract(contract_number):
    '''
  Статистика по договорам - iss_288 (Выгрузка в эксель - заказы по договору)
  '''
    from xlwt import Workbook, XFStyle, Alignment, Font

    userlib.check_page_access('stats','r')
    response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=UTF-8'
    response.headers['Content-Type'] = 'application/vnd.ms-excel'
    response.headers['Content-Disposition'] = 'attachment; filename=contract_stat_' +(str(contract_number) if contract_number else 'undefined')+ '_'+datetime.datetime.utcnow().strftime('%d_%m_%Y_%H_%M_%S')+'.xls'
    print response.headers['Content-Disposition']
    try:
        # если не задан номер договора
        if not contract_number:
            return {'status':'error', 'msg':'Договор не найден. Повторите попытку.'}
        # получение информации по договору
        contract = contractmodel.get_by({'number':routine.strToInt(contract_number), '$or': [{ "parent_id": { '$exists': False }},{ "parent_id":None},{"parent_id": ''}]})
        if not contract:
            return {'status':'error', 'msg':'Договор не найден. Повторите попытку.'}

        #Генерация XLS файла
        import StringIO
        output = StringIO.StringIO()
        wb = Workbook(encoding='utf-8')
        ws = wb.add_sheet('Data')

        # styles
        al1 = Alignment()
        al1.horz = Alignment.HORZ_LEFT
        al1.vert = Alignment.VERT_TOP
        al1.wrap = Alignment.WRAP_AT_RIGHT

        font = Font()
        font.bold = True

        style1 = XFStyle()
        style1.alignment = al1

        style_header = XFStyle()
        style_header.alignment = al1
        style_header.font = font

        #, style_header1

        #set header------------
        ws.write(0,0, u"Договор".encode("utf-8"),style_header)
        ws.write(0,1, u"Заказ".encode("utf-8"),style_header)
        ws.write(0,2, u"Наименование".encode("utf-8"),style_header)

        # columns width
        ws.col(0).width = 256 * 10 # договор
        ws.col(1).width = 256 * 15 # Номер заказа
        ws.col(2).width = 256 * 50 # Наименование продукции

        rowIndex = 1
        if 'productions' in contract and len(contract['productions'])>0:
            contract['productions'].sort(key=lambda x: (x['number']))
            for product in contract['productions']:
                if 'units' in product and len(product['units'])>0:
                    product['units'].sort(key=lambda x: (x['number']))
                    for unit in product['units']:
                        ws.write(rowIndex,0, contract['number'],style1)
                        ws.write(rowIndex,1, str(contract['number'])+'.'+str(product['number'])+'.'+str(unit['number']) ,style1)
                        ws.write(rowIndex,2, product['name'],style1)
                        rowIndex+=1
        wb.save(output)
        output.seek(0)
        return output.read()

    except Exception, exc:
        print('Error! Get stats contract.' + str(exc))
        excType = exc.__class__.__name__
        print_exc()
        return {'status':'error', 'msg':'Contract not found. Msg: '+ str(exc)}

@get('/stats/crm/general')
def get_stats_crm_general():
    '''
  Статистика по CRM - iss_292 (Выгрузка в эксель всех заявок)
  '''
    from xlwt import Workbook, XFStyle, Alignment, Font
    from models import ordermodel, clientmodel
    import StringIO

    userlib.check_page_access('stats','r')
    response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=UTF-8'
    response.headers['Content-Type'] = 'application/vnd.ms-excel'
    response.headers['Content-Disposition'] = 'attachment; filename=crm_stat_' +datetime.datetime.utcnow().strftime('%d_%m_%Y_%H_%M_%S')+'.xls'
    try:
        # получение и формаирование данных
        # получение списка клиентов
        data_clients = clientmodel.get_list(None,{'_id':1, 'contacts':1, 'name':1, 'rekvisit':1})
        clients = {}
        for cl in data_clients:
            clients[cl['_id']] = cl

        # получение списка заявок
        data_orders = ordermodel.get_list(None,
                                          {
                                              'number':1,
                                              'client_id':1,
                                              'products':1,
                                              'history':1,
                                              'total_address':1,
                                              'total_montaz':1,
                                              'sq':1,
                                              'price':1,
                                              'structure':1,
                                              'manager':1
                                          })

        # подготовка данных с группировкой по продукции
        orders= []
        for order in data_orders:
            # если есть продукция в заявке
            if 'products' in order and len(order['products'])>0 and 'history' in order and len(order['history'])>0:
                # получение информации о клиенте
                client = clients.get(order['client_id'], {})
                # сортировка истории и получение последнего состояния
                order['history'].sort(key = lambda x: (routine.strToDateTime(x['datetime'])))
                last_state = order['history'][-1]
                for product in order['products']:
                    new_item = {
                        'number': order['number'],
                        'manager': order.get('manager'),
                        'client_name': client.get('name', ''),
                        'client_rekvisit': client.get('rekvisit', ''),
                        'product_name': product['name'],
                        'product_type': product['type'],
                        'product_count': product['count'],
                        'product_sq': product['sq'],
                        'product_price': product['price'],
                        'product_price_per_sq': product['price']/product['sq'] if product['price']>0 and product['sq']>0 else 0,
                        'last_state_condition': last_state['condition'],
                        'last_state_condition_reason': last_state.get('reason',''),
                        'last_state_date': routine.strToDateTime(last_state['datetime']),
                        'last_state_comment': last_state.get('comment',''),
                        'last_state_manager': last_state.get('manager',''),
                    }
                    orders.append(new_item)

        orders.sort(key=lambda x:(x['client_name'],x['number']))

        #Генерация XLS файла
        output = StringIO.StringIO()
        wb = Workbook(encoding='utf-8')
        ws = wb.add_sheet('Data')
        # styles
        al1 = Alignment()
        al1.horz = Alignment.HORZ_LEFT
        al1.vert = Alignment.VERT_TOP
        al1.wrap = Alignment.WRAP_AT_RIGHT
        font = Font()
        font.bold = True
        style1 = XFStyle()
        style1.alignment = al1
        style_header = XFStyle()
        style_header.alignment = al1
        style_header.font = font
        date_format = XFStyle()
        date_format.num_format_str = 'dd/mm/yyyy'
        datetime_format = XFStyle()
        datetime_format.num_format_str = 'dd/mm/yyyy HH:MM'
        #set header------------
        ws.write(0,0, u"Клиент".encode("utf-8"),style_header)
        ws.write(0,1, u"Реквизиты".encode("utf-8"),style_header)
        ws.write(0,2, u"Код заявки".encode("utf-8"),style_header)
        ws.write(0,3, u"Назначение продукции".encode("utf-8"),style_header)
        ws.write(0,4, u"Тип конструкции".encode("utf-8"),style_header)
        ws.write(0,5, u"Кол-во".encode("utf-8"),style_header)
        ws.write(0,6, u"Площадь".encode("utf-8"),style_header)
        ws.write(0,7, u"Сумма".encode("utf-8"),style_header)
        ws.write(0,8, u"Ср. за кв. м.".encode("utf-8"),style_header)
        ws.write(0,9, u"Последнее состояние заявки".encode("utf-8"),style_header)
        ws.write(0,10, u"Уточнение".encode("utf-8"),style_header)
        ws.write(0,11, u"Дата последнего состояния заявки".encode("utf-8"),style_header)
        ws.write(0,12, u"Комментарий к посл. состоянию".encode("utf-8"),style_header)
        ws.write(0,13, u"Менеджер заявки".encode("utf-8"),style_header)
        # columns width
        ws.col(0).width = 256 * 30 # Клиент
        ws.col(1).width = 256 * 30 # Реквизиты клиента
        ws.col(2).width = 256 * 10 # Код заявки
        ws.col(3).width = 256 * 20 # Назначение продукции
        ws.col(4).width = 256 * 10 # Тип конструкции
        ws.col(5).width = 256 * 10 # Кол-во
        ws.col(6).width = 256 * 10 # Площадь
        ws.col(7).width = 256 * 10 # Сумма
        ws.col(8).width = 256 * 10 # Ср. за кв. м.
        ws.col(9).width = 256 * 15 # Последнее состояние заявки
        ws.col(10).width = 256 * 15 # Последнее состояние заявки - уточнение
        ws.col(11).width = 256 * 20 # Дата последнего состояния заявки
        ws.col(12).width = 256 * 40 # Комментарий к посл. состоянию
        ws.col(13).width = 256 * 20 # Менеджер заявки последнего состояния

        rowIndex = 1
        for order in orders:
            ws.write(rowIndex,0, order['client_name'],style1)
            ws.write(rowIndex,1, order['client_rekvisit'],style1)
            ws.write(rowIndex,2, order['number'],style1)
            ws.write(rowIndex,3, order['product_name'],style1)
            ws.write(rowIndex,4, order['product_type'],style1)
            ws.write(rowIndex,5, order['product_count'],style1)
            ws.write(rowIndex,6, order['product_sq'],style1)
            ws.write(rowIndex,7, order['product_price'],style1)
            ws.write(rowIndex,8, order['product_price_per_sq'],style1)
            ws.write(rowIndex,9, order['last_state_condition'],style1)
            ws.write(rowIndex,10, order['last_state_condition_reason'],style1)
            ws.write(rowIndex,11, order['last_state_date'] +datetime.timedelta(hours=routine.moscow_tz_offset), datetime_format)
            #ws.write(rowIndex,10, order['last_state_date'], datetime_format)
            ws.write(rowIndex,12, order['last_state_comment'],style1)
            ws.write(rowIndex,13, order['manager'],style1)
            rowIndex+=1
        wb.save(output)
        output.seek(0)
        return output.read()

    except Exception, exc:
        print('Error! Get stats CRM.' + str(exc))
        excType = exc.__class__.__name__
        print_exc()
        return {'status':'error', 'msg':'Error! Msg: '+ str(exc)}


@get('/stats/crm/emails')
def get_stats_crm_emails():
    '''
  Статистика по CRM - iss_303 (поиск одинаковых клиентов по домену после собаки)
  '''
    from xlwt import Workbook, XFStyle, Alignment, Font
    from models import clientmodel
    import StringIO

    userlib.check_page_access('stats','r')
    response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=UTF-8'
    response.headers['Content-Type'] = 'application/vnd.ms-excel'
    response.headers['Content-Disposition'] = 'attachment; filename=crm_stat_' +datetime.datetime.utcnow().strftime('%d_%m_%Y_%H_%M_%S')+'.xls'
    try:
        # получение и формаирование данных
        # получение списка клиентов
        ignore_domens = ['mail.ru','bk.ru','list.ru','yandex.ru','gmail.com','yahoo.com', 'ya.ru','inbox.ru','rambler.ru', 'hotmail.com', 'outlook.com', 'me.com', 'yandex.com', 'yandex.kz', 'live.ru', 'gmail.ru']

        data_clients = clientmodel.get_list(None,{'_id':1, 'contacts':1, 'name':1, 'rekvisit':1})

        # пробежка по всем контактам клиента и группировка по доменам email адресов
        clients = {}
        for cl in data_clients:
            if 'contacts' in cl and len(cl['contacts'])>0:
                for contact in cl['contacts']:
                    if 'email' in contact and len(contact['email'])>0:
                        for email in contact['email']:
                            domain = email.split('@')[1].lower()
                            if domain not in ignore_domens:
                                if domain not in clients:
                                    clients[domain] = {'domain': domain, 'clients':{}}
                                if not str(cl['_id']) in clients[domain]['clients']:
                                    clients[domain]['clients'][str(cl['_id'])] = {
                                        'domain': domain,
                                        'client_name': cl['name'],
                                        'contact_email': email,
                                        'contact_fio': contact['fio']
                                    }
        result = []
        for domain_key in clients:
            result.append(clients[domain_key])

        result.sort(key=lambda x:(x['domain']))

        #Генерация XLS файла
        output = StringIO.StringIO()
        wb = Workbook(encoding='utf-8')
        ws = wb.add_sheet('Data')
        # styles
        al1 = Alignment()
        al1.horz = Alignment.HORZ_LEFT
        al1.vert = Alignment.VERT_TOP
        al1.wrap = Alignment.WRAP_AT_RIGHT
        font = Font()
        font.bold = True
        style1 = XFStyle()
        style1.alignment = al1
        style_header = XFStyle()
        style_header.alignment = al1
        style_header.font = font
        date_format = XFStyle()
        date_format.num_format_str = 'dd/mm/yyyy'
        datetime_format = XFStyle()
        datetime_format.num_format_str = 'dd/mm/yyyy HH:MM'
        #set header------------

        # найденное совпадение, типа modul.org
        # название клиента
        # фио контакта
        # адрес почты (где нашли совпадение, типа rm@modul.org)
        # номер заявки


        ws.write(0,0, u"Домен".encode("utf-8"),style_header)
        ws.write(0,1, u"Клиент".encode("utf-8"),style_header)
        ws.write(0,2, u"ФИО".encode("utf-8"),style_header)
        ws.write(0,3, u"Email".encode("utf-8"),style_header)
        # columns width
        ws.col(0).width = 256 * 20 # Домен
        ws.col(1).width = 256 * 40 # Клиент
        ws.col(2).width = 256 * 40 # Фио
        ws.col(3).width = 256 * 40 # Email

        rowIndex = 1
        for domain in result:
            for client_id in domain['clients']:
                client = domain['clients'][client_id]
                ws.write(rowIndex,0, client['domain'],style1)
                ws.write(rowIndex,1, client['client_name'],style1)
                ws.write(rowIndex,2, client['contact_fio'],style1)
                ws.write(rowIndex,3, client['contact_email'],style1)
                rowIndex+=1
        wb.save(output)
        output.seek(0)
        return output.read()

    except Exception, exc:
        print('Error! Get stats CRM.' + str(exc))
        excType = exc.__class__.__name__
        print_exc()
        return {'status':'error', 'msg':'Error! Msg: '+ str(exc)}

@get('/stats/crm/vers1')
def get_stats_crm_vers1():
    '''
  Статистика по CRM
  Выгрузка в XLS отказных или спящих заявок
  '''
    from xlwt import Workbook, XFStyle, Alignment, Font
    from models import ordermodel, clientmodel
    import StringIO

    userlib.check_page_access('stats','r')
    response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=UTF-8'
    response.headers['Content-Type'] = 'application/vnd.ms-excel'
    response.headers['Content-Disposition'] = 'attachment; filename=crm_stat_' +datetime.datetime.utcnow().strftime('%d_%m_%Y_%H_%M_%S')+'.xls'
    try:
        # получение и формаирование данных
        # получение списка клиентов
        data_clients = clientmodel.get_list(None,{'_id':1, 'contacts':1, 'name':1, 'rekvisit':1})
        clients = {}
        for cl in data_clients:
            clients[cl['_id']] = cl

        # получение списка заявок
        data_orders = ordermodel.get_list({'$or':[{'l_state':window.ORDER_CONDITIONS['SLEEP']},{'l_state':window.ORDER_CONDITIONS['REFUSE']}]},
                                          {
                                              'number':1,
                                              'client_id':1,
                                              'products':1,
                                              'history':1,
                                              'total_address':1,
                                              'total_montaz':1,
                                              'sq':1,
                                              'price':1,
                                              'structure':1
                                          })

        # подготовка данных с группировкой по продукции
        orders= []
        for order in data_orders:
            # если есть история заявки
            if 'history' in order and len(order['history'])>0:
                # получение информации о клиенте
                client = clients.get(order['client_id'], {})
                # сортировка истории и получение последнего состояния
                order['history'].sort(key = lambda x: (routine.strToDateTime(x['datetime'])))
                last_state = order['history'][-1]
                prelast_state = None
                if len(order['history'])>1:
                    prelast_state = order['history'][-2]

                new_item = {
                    'number': order['number'],
                    'client_name': client.get('name', ''),
                    'client_rekvisit': client.get('rekvisit', ''),
                    'last_state_condition': last_state['condition'],
                    'last_state_date': routine.strToDateTime(last_state['datetime']),
                    'last_state_comment': last_state.get('comment',''),
                    'last_state_year': routine.strToDateTime(last_state['datetime']).year,
                    'prelast_state_condition': prelast_state['condition'] if prelast_state else '',
                    'sq': order['sq'],
                    'price': order['price']
                }
                if new_item['sq']>1 and new_item['price']>1:
                    orders.append(new_item)

        orders.sort(key=lambda x:(x['last_state_year'],x['last_state_condition'], x['client_name']))

        #Генерация XLS файла
        output = StringIO.StringIO()
        wb = Workbook(encoding='utf-8')
        ws = wb.add_sheet('Data')
        # styles
        al1 = Alignment()
        al1.horz = Alignment.HORZ_LEFT
        al1.vert = Alignment.VERT_TOP
        al1.wrap = Alignment.WRAP_AT_RIGHT
        font = Font()
        font.bold = True
        style1 = XFStyle()
        style1.alignment = al1
        style_header = XFStyle()
        style_header.alignment = al1
        style_header.font = font
        date_format = XFStyle()
        date_format.num_format_str = 'dd/mm/yyyy'
        datetime_format = XFStyle()
        datetime_format.num_format_str = 'dd/mm/yyyy HH:MM'

        #set header------------
        ws.write(0,0, u"Год".encode("utf-8"),style_header)
        ws.write(0,1, u"Последнее состояние".encode("utf-8"),style_header)
        ws.write(0,2, u"Статус до".encode("utf-8"),style_header)
        ws.write(0,3, u"Клиент".encode("utf-8"),style_header)
        ws.write(0,4, u"Код заявки".encode("utf-8"),style_header)
        ws.write(0,5, u"Площадь".encode("utf-8"),style_header)
        ws.write(0,6, u"Сумма".encode("utf-8"),style_header)
        ws.write(0,7, u"Комментарий к посл. состоянию".encode("utf-8"),style_header)

        # columns width
        ws.col(0).width = 256 * 15 # Год
        ws.col(1).width = 256 * 15 # Последнее состояние заявки
        ws.col(2).width = 256 * 15 # Предпоследнее состояние заявки
        ws.col(3).width = 256 * 30 # Клиент
        ws.col(4).width = 256 * 10 # Код заявки
        ws.col(5).width = 256 * 10 # Площадь
        ws.col(6).width = 256 * 10 # Сумма
        ws.col(7).width = 256 * 40 # Комментарий к посл. состоянию

        rowIndex = 1
        for order in orders:
            ws.write(rowIndex,0, order['last_state_year'],style1)
            ws.write(rowIndex,1, order['last_state_condition'],style1)
            ws.write(rowIndex,2, order['prelast_state_condition'],style1)
            ws.write(rowIndex,3, order['client_name'],style1)
            ws.write(rowIndex,4, order['number'],style1)
            ws.write(rowIndex,5, order['sq'],style1)
            ws.write(rowIndex,6, order['price'],style1)
            ws.write(rowIndex,7, order['last_state_comment'],style1)
            rowIndex+=1
        wb.save(output)
        output.seek(0)
        return output.read()

    except Exception, exc:
        print('Error! Get stats CRM.' + str(exc))
        excType = exc.__class__.__name__
        print_exc()
        return {'status':'error', 'msg':'Error! Msg: '+ str(exc)}


@get('/stats/crm/vers2')
def get_stats_crm_vers2():
    '''
  Статистика по CRM
  Выгрузка в XLS заявок с первыми состояниями
  '''
    from xlwt import Workbook, XFStyle, Alignment, Font
    from models import ordermodel, clientmodel
    import StringIO

    userlib.check_page_access('stats','r')
    response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=UTF-8'
    response.headers['Content-Type'] = 'application/vnd.ms-excel'
    response.headers['Content-Disposition'] = 'attachment; filename=crm_stat_' +datetime.datetime.utcnow().strftime('%d_%m_%Y_%H_%M_%S')+'.xls'
    try:
        # получение и формаирование данных
        # получение списка клиентов
        data_clients = clientmodel.get_list(None,{'_id':1, 'contacts':1, 'name':1, 'rekvisit':1})
        clients = {}
        for cl in data_clients:
            clients[cl['_id']] = cl

        # получение списка заявок
        data_orders = ordermodel.get_list(None,
                                          {
                                              'number':1,
                                              'client_id':1,
                                              'products':1,
                                              'history':1,
                                              'total_address':1,
                                              'total_montaz':1,
                                              'sq':1,
                                              'price':1,
                                              'structure':1
                                          })

        # подготовка данных с группировкой по продукции
        orders= []
        for order in data_orders:
            # если есть история заявки
            if 'history' in order and len(order['history'])>0:
                # получение информации о клиенте
                client = clients.get(order['client_id'], {})
                # сортировка истории и получение последнего состояния
                order['history'].sort(key = lambda x: (routine.strToDateTime(x['datetime'])))
                first_state = order['history'][0]
                new_item = {
                    'number': order['number'],
                    'client_name': client.get('name', ''),
                    'client_rekvisit': client.get('rekvisit', ''),
                    'first_state_condition': first_state['condition'],
                    'first_state_date': routine.strToDateTime(first_state['datetime']),
                    'first_state_comment': first_state.get('comment',''),
                    'first_state_year': routine.strToDateTime(first_state['datetime']).year,
                    'sq': order['sq'],
                    'price': order['price'],
                    'price_per_sq': order['price']/order['sq'] if order['price']>0 and order['sq']>0 else 0,
                }
                if new_item['sq']>1 and new_item['price']>1:
                    orders.append(new_item)

        orders.sort(key=lambda x:(x['first_state_year'],x['first_state_condition'], x['client_name']))

        #Генерация XLS файла
        output = StringIO.StringIO()
        wb = Workbook(encoding='utf-8')
        ws = wb.add_sheet('Data')
        # styles
        al1 = Alignment()
        al1.horz = Alignment.HORZ_LEFT
        al1.vert = Alignment.VERT_TOP
        al1.wrap = Alignment.WRAP_AT_RIGHT
        font = Font()
        font.bold = True
        style1 = XFStyle()
        style1.alignment = al1
        style_header = XFStyle()
        style_header.alignment = al1
        style_header.font = font
        date_format = XFStyle()
        date_format.num_format_str = 'dd/mm/yyyy'
        datetime_format = XFStyle()
        datetime_format.num_format_str = 'dd/mm/yyyy HH:MM'

        #set header------------
        ws.write(0,0, u"Первое состояние".encode("utf-8"),style_header)
        ws.write(0,1, u"Клиент".encode("utf-8"),style_header)
        ws.write(0,2, u"Код заявки".encode("utf-8"),style_header)
        ws.write(0,3, u"Площадь".encode("utf-8"),style_header)
        ws.write(0,4, u"Сумма".encode("utf-8"),style_header)
        ws.write(0,5, u"Ср. ц.".encode("utf-8"),style_header)
        ws.write(0,6, u"Месяц".encode("utf-8"),style_header)
        ws.write(0,7, u"Год".encode("utf-8"),style_header)
        ws.write(0,8, u"Комментарий".encode("utf-8"),style_header)

        # columns width
        ws.col(0).width = 256 * 20 # Первое состояние заявки
        ws.col(1).width = 256 * 30 # Клиент
        ws.col(2).width = 256 * 10 # Код заявки
        ws.col(3).width = 256 * 10 # Площадь
        ws.col(4).width = 256 * 10 # Сумма
        ws.col(5).width = 256 * 10 # Средняя цена
        ws.col(6).width = 256 * 15 # Месяц
        ws.col(7).width = 256 * 15 # Год
        ws.col(8).width = 256 * 40 # Комментарий к посл. состоянию

        rowIndex = 1
        for order in orders:
            ws.write(rowIndex,0, order['first_state_condition'],style1)
            ws.write(rowIndex,1, order['client_name'],style1)
            ws.write(rowIndex,2, order['number'],style1)
            ws.write(rowIndex,3, order['sq'],style1)
            ws.write(rowIndex,4, order['price'],style1)
            ws.write(rowIndex,5, order['price_per_sq'],style1)
            ws.write(rowIndex,6, order['first_state_date'].month,style1)
            ws.write(rowIndex,7, order['first_state_year'],style1)
            ws.write(rowIndex,8, order['first_state_comment'],style1)
            rowIndex+=1
        wb.save(output)
        output.seek(0)
        return output.read()

    except Exception, exc:
        print('Error! Get stats CRM.' + str(exc))
        excType = exc.__class__.__name__
        print_exc()
        return {'status':'error', 'msg':'Error! Msg: '+ str(exc)}

@get('/stats/crm/vers3')
def get_stats_crm_vers3():
    '''
  Статистика по CRM. ISS: #328
  Выгрузка в эксель - согласование договора без подписания
  '''
    from xlwt import Workbook, XFStyle, Alignment, Font
    from models import ordermodel, clientmodel
    import StringIO

    userlib.check_page_access('stats','r')
    response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=UTF-8'
    response.headers['Content-Type'] = 'application/vnd.ms-excel'
    response.headers['Content-Disposition'] = 'attachment; filename=crm_stat_' +datetime.datetime.utcnow().strftime('%d_%m_%Y_%H_%M_%S')+'.xls'
    try:
        # получение и формаирование данных
        # получение списка клиентов
        data_clients = clientmodel.get_list(None,{'_id':1, 'contacts':1, 'name':1, 'rekvisit':1})
        clients = {}
        for cl in data_clients:
            clients[cl['_id']] = cl

        # получение списка заявок
        data_orders = ordermodel.get_list({'prelast_state':window.ORDER_CONDITIONS['CONTRACT_AGREEMENT'],'l_state':{'$ne':window.ORDER_CONDITIONS['CONTRACT_SIGN']}},
                                          {
                                              'number':1,
                                              'client_id':1,
                                              'products':1,
                                              'history':1,
                                              'total_address':1,
                                              'total_montaz':1,
                                              'sq':1,
                                              'price':1,
                                              'structure':1
                                          })

        # подготовка данных с группировкой по продукции
        orders= []
        for order in data_orders:
            # если есть история заявки
            if 'history' in order and len(order['history'])>0:
                # получение информации о клиенте
                client = clients.get(order['client_id'], {})
                # сортировка истории и получение последнего состояния
                order['history'].sort(key = lambda x: (routine.strToDateTime(x['datetime'])))
                last_state = order['history'][-1]
                first_state = order['history'][0]
                prelast_state = None
                if len(order['history'])>1:
                    prelast_state = order['history'][-2]

                new_item = {
                    'number': order['number'],
                    'client_name': client.get('name', ''),
                    'client_rekvisit': client.get('rekvisit', ''),
                    'first_state_condition': first_state['condition'],
                    'first_state_date': routine.strToDateTime(first_state['datetime']),
                    'last_state_condition': last_state['condition'],
                    'last_state_comment': last_state.get('comment',''),
                    'last_state_year': routine.strToDateTime(last_state['datetime']).year,
                    'last_state_date': routine.strToDateTime(last_state['datetime']),
                    'prelast_state_condition': prelast_state['condition'] if prelast_state else '',
                    'sq': order['sq'],
                    'price': order['price']
                }
                if new_item['sq']>1 and new_item['price']>1:
                    orders.append(new_item)

        orders.sort(key=lambda x:(x['last_state_year'],x['last_state_condition'], x['client_name']))
        #Генерация XLS файла
        output = StringIO.StringIO()
        wb = Workbook(encoding='utf-8')
        ws = wb.add_sheet('Data')
        # styles
        al1 = Alignment()
        al1.horz = Alignment.HORZ_LEFT
        al1.vert = Alignment.VERT_TOP
        al1.wrap = Alignment.WRAP_AT_RIGHT
        font = Font()
        font.bold = True
        style1 = XFStyle()
        style1.alignment = al1
        style_header = XFStyle()
        style_header.alignment = al1
        style_header.font = font
        date_format = XFStyle()
        date_format.num_format_str = 'dd/mm/yyyy'
        datetime_format = XFStyle()
        datetime_format.num_format_str = 'dd/mm/yyyy HH:MM'

        #set header------------
        ws.write(0,0, u"Код заявки".encode("utf-8"),style_header)
        ws.write(0,1, u"Клиент".encode("utf-8"),style_header)
        ws.write(0,2, u"Первое состояние".encode("utf-8"),style_header)
        ws.write(0,3, u"Дата первого состояния".encode("utf-8"),style_header)
        ws.write(0,4, u"Последнее состояние".encode("utf-8"),style_header)
        ws.write(0,5, u"Дата последнего состояния".encode("utf-8"),style_header)
        ws.write(0,6, u"Комментарий к посл. состоянию".encode("utf-8"),style_header)
        ws.write(0,7, u"Сумма".encode("utf-8"),style_header)
        ws.write(0,8, u"Площадь".encode("utf-8"),style_header)


        # columns width
        ws.col(0).width = 256 * 10 # Код заявки
        ws.col(1).width = 256 * 30 # Клиент
        ws.col(2).width = 256 * 15 # Первое состояние
        ws.col(3).width = 256 * 15 # Дата первого состояния
        ws.col(4).width = 256 * 15 # Последнее состояние заявки
        ws.col(5).width = 256 * 15 # Дата последнего состояния заявки
        ws.col(6).width = 256 * 40 # Комментарий к посл. состоянию
        ws.col(7).width = 256 * 10 # Площадь
        ws.col(8).width = 256 * 10 # Сумма


        rowIndex = 1
        for order in orders:
            ws.write(rowIndex,0, order['number'],style1)
            ws.write(rowIndex,1, order['client_name'],style1)
            ws.write(rowIndex,2, order['first_state_condition'],style1)
            ws.write(rowIndex,3, order['first_state_date'] +datetime.timedelta(hours=routine.moscow_tz_offset), datetime_format)
            ws.write(rowIndex,4, order['last_state_condition'],style1)
            ws.write(rowIndex,5, order['last_state_date'] +datetime.timedelta(hours=routine.moscow_tz_offset), datetime_format)
            ws.write(rowIndex,6, order['last_state_comment'],style1)
            ws.write(rowIndex,7, order['sq'],style1)
            ws.write(rowIndex,8, order['price'],style1)
            rowIndex+=1
        wb.save(output)
        output.seek(0)
        return output.read()

    except Exception, exc:
        print('Error! Get stats CRM.' + str(exc))
        excType = exc.__class__.__name__
        print_exc()
        return {'status':'error', 'msg':'Error! Msg: '+ str(exc)}

@get('/stats/crm/vers4/<date_start>/<date_finish>')
def get_stats_crm_vers4(date_start, date_finish):
    '''
  Статистика по CRM.
  Выгрузка статистики по истории состояний.
  С чем подошли к периоду, что было внутри периода, и чем всё закончилось
  '''
    from xlwt import Workbook, XFStyle, Alignment, Font
    from models import ordermodel, clientmodel
    import StringIO

    userlib.check_page_access('stats','r')

    # проверка входных параметров
    try:
        date_start = date_start.replace('_', '/')
        date_start =  datetime.datetime.strptime(date_start, '%d/%m/%Y').replace(hour=0, minute=0, second=0, microsecond = 0)
    except:
        return {'status':'error', 'msg':'Задан не верный формат начальной даты.'}
    try:
        date_finish = date_finish.replace('_', '/')
        date_finish =  datetime.datetime.strptime(date_finish, '%d/%m/%Y').replace(hour=23, minute=59, second=59, microsecond = 0)
    except:
        return {'status':'error', 'msg':'Задан не верный формат конечной даты.'}

    response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=UTF-8'
    response.headers['Content-Type'] = 'application/vnd.ms-excel'
    response.headers['Content-Disposition'] = 'attachment; filename=crm_stat_' +datetime.datetime.utcnow().strftime('%d_%m_%Y_%H_%M_%S')+'.xls'
    try:
        # получение и формаирование данных
        # получение списка клиентов
        data_clients = clientmodel.get_list(None,{'_id':1, 'contacts':1, 'name':1, 'rekvisit':1})
        clients = {}
        for cl in data_clients:
            clients[cl['_id']] = cl

        # получение списка заявок
        data_orders = ordermodel.get_list(
            {
                #'number':5575,
                '$or':[
                    {
                        'f_state_date':{'$lte': date_start },
                        'l_state_date':{'$gte': date_start },
                    },
                    {
                        'f_state_date':{'$gte': date_start },
                        'f_state_date':{'$lte': date_finish },
                    },
                    {
                        'f_state_date':{'$lte': date_start },
                        'l_state_date':{'$lte': date_finish },
                    },
                ]
            },
            {
                'number':1,
                'client_id':1,
                'products':1,
                'history':1,
                'total_address':1,
                'total_montaz':1,
                'sq':1,
                'price':1,
                'structure':1
            }
        )

        # подготовка данных с группировкой по продукции
        orders= []
        for order in data_orders:
            # если есть история заявки
            if 'history' in order and len(order['history'])>0:
                # сортировка истории и получение последнего состояния
                order['history'].sort(key = lambda x: (routine.strToDateTime(x['datetime'])))
                # получение информации о клиенте
                client = clients.get(order['client_id'], {})
                new_item = {
                    'number': order['number'],
                    'client_name': client.get('name', ''),
                    'client_rekvisit': client.get('rekvisit', ''),
                    'sq': order['sq'],
                    'price': order['price'],
                    'history': []
                }
                # выбор нужных состояний заявки
                i = 0
                has_first_state = False
                for hrow in order['history']:
                    hrow['datetime'] = routine.strToDateTime(hrow['datetime'])
                    if hrow['datetime']>=date_start and hrow['datetime']<=date_finish:
                        if i>0 and not has_first_state:
                            new_item['history'].append(order['history'][i-1])
                        new_item['history'].append(hrow)
                        has_first_state = True
                    elif hrow['datetime']>date_finish:
                        new_item['history'].append(order['history'][len(order['history'])-1] )
                        break
                    i+=1

                orders.append(new_item)
        orders.sort(key=lambda x:(x['number']))

        #Генерация XLS файла
        output = StringIO.StringIO()
        wb = Workbook(encoding='utf-8')
        ws = wb.add_sheet('Data')
        # styles
        al1 = Alignment()
        al1.horz = Alignment.HORZ_LEFT
        al1.vert = Alignment.VERT_TOP
        al1.wrap = Alignment.WRAP_AT_RIGHT
        font = Font()
        font.bold = True
        style1 = XFStyle()
        style1.alignment = al1
        style_header = XFStyle()
        style_header.alignment = al1
        style_header.font = font
        date_format = XFStyle()
        date_format.num_format_str = 'dd/mm/yyyy'
        datetime_format = XFStyle()
        datetime_format.num_format_str = 'dd/mm/yyyy HH:MM'

        #set header------------
        ws.write(0,0, u"Дата состояния".encode("utf-8"),style_header)
        ws.write(0,1, u"Начало".encode("utf-8"),style_header)
        ws.write(0,2, u"Код заявки".encode("utf-8"),style_header)
        ws.write(0,3, u"Клиент".encode("utf-8"),style_header)
        ws.write(0,4, u"Общая пл.".encode("utf-8"),style_header)
        ws.write(0,5, u"Общая сумма".encode("utf-8"),style_header)
        ws.write(0,6, u"Комментарий".encode("utf-8"),style_header)
        ws.write(0,7, u"Состояние".encode("utf-8"),style_header)
        ws.write(0,8, u"Тип состояния".encode("utf-8"),style_header)
        ws.write(0,9, u"Вероятность".encode("utf-8"),style_header)
        ws.write(0,10, u"Пл. дата закрытия".encode("utf-8"),style_header)
        ws.write(0,11, u"Менеджер заявки".encode("utf-8"),style_header)

        ws.write(0,12, u"С чем подошли, сост.".encode("utf-8"),style_header)
        ws.write(0,13, u"С чем подошли, тип сост.".encode("utf-8"),style_header)
        ws.write(0,14, u"С чем подошли, дата".encode("utf-8"),style_header)
        ws.write(0,15, u"С чем подошли, менеджер".encode("utf-8"),style_header)
        ws.write(0,16, u"С чем подошли, коммент.".encode("utf-8"),style_header)
        ws.write(0,17, u"Чем закончилось, сост.".encode("utf-8"),style_header)
        ws.write(0,18, u"Чем закончилось, тип сост.".encode("utf-8"),style_header)
        ws.write(0,19, u"Чем закончилось, дата".encode("utf-8"),style_header)
        ws.write(0,20, u"Чем закончилось, менеджер".encode("utf-8"),style_header)
        ws.write(0,21, u"Чем закончилось, коммент.".encode("utf-8"),style_header)

        # columns width
        ws.col(0).width = 256 * 15 # Дата состояния
        ws.col(1).width = 256 * 10 # Начало
        ws.col(2).width = 256 * 10 # Код заявки
        ws.col(3).width = 256 * 30 # Клиент
        ws.col(4).width = 256 * 10 # Сумма
        ws.col(5).width = 256 * 10 # Площадь
        ws.col(6).width = 256 * 40 # Комментарий
        ws.col(7).width = 256 * 15 # Состояние
        ws.col(8).width = 256 * 10 # Тип состояния
        ws.col(9).width = 256 * 10 # Вероятность
        ws.col(10).width = 256 * 15 # Плановая дата закрытия
        ws.col(11).width = 256 * 15 # Менеджер заявки

        ws.col(12).width = 256 * 15 # Состояние
        ws.col(13).width = 256 * 10 # Тип состояния
        ws.col(14).width = 256 * 15 # Дата состояния
        ws.col(15).width = 256 * 15 # Менеджер
        ws.col(16).width = 256 * 40 # Комментарий
        ws.col(17).width = 256 * 15 # Состояние
        ws.col(18).width = 256 * 10 # Тип состояния
        ws.col(19).width = 256 * 15 # Дата состояния
        ws.col(20).width = 256 * 15 # Менеджер
        ws.col(21).width = 256 * 40 # Комментарий

        rowIndex = 1
        for order in orders:
            i = 0
            if order['history'] and len(order['history'])>0:
                start_state = order['history'][0]
                finish_state = order['history'][len(order['history'])-1]
                for row in order['history']:
                    ws.write(rowIndex,0, row['datetime'], datetime_format)
                    ws.write(rowIndex,1, 'да' if i==0 else '' , style1)
                    ws.write(rowIndex,2, order['number'],style1)
                    ws.write(rowIndex,3, order['client_name'],style1)
                    ws.write(rowIndex,4, order['sq'],style1)
                    ws.write(rowIndex,5, order['price'],style1)
                    ws.write(rowIndex,6, row.get('comment',''),style1)
                    ws.write(rowIndex,7, row.get('condition',''),style1)
                    ws.write(rowIndex,8, row.get('reason',''),style1)
                    ws.write(rowIndex,9, row.get('chance',''),style1)
                    ws.write(rowIndex,10, row.get('enddate',''),date_format)
                    ws.write(rowIndex,11, row.get('manager',''),style1)
                    ws.write(rowIndex,12, start_state.get('condition',''),style1)
                    ws.write(rowIndex,13, start_state.get('reason',''),style1)
                    ws.write(rowIndex,14, start_state['datetime'], datetime_format)
                    ws.write(rowIndex,15, start_state.get('manager',''),style1)
                    ws.write(rowIndex,16, start_state.get('comment',''),style1)
                    ws.write(rowIndex,17, finish_state.get('condition',''),style1)
                    ws.write(rowIndex,18, finish_state.get('reason',''),style1)
                    ws.write(rowIndex,19, finish_state['datetime'], datetime_format)
                    ws.write(rowIndex,20, finish_state.get('manager',''),style1)
                    ws.write(rowIndex,21, finish_state.get('comment',''),style1)
                    i+=1
                    rowIndex+=1
        wb.save(output)
        output.seek(0)
        return output.read()

    except Exception, exc:
        print('Error! Get stats CRM.' + str(exc))
        excType = exc.__class__.__name__
        print_exc()
        return {'status':'error', 'msg':'Error! Msg: '+ str(exc)}


@get('/stats/crm/vers5/')
def get_stats_crm_vers5():
    '''
  Статистика по CRM.
  #iss_1465 - Выгрузка с датой закрытия и вероятностью (берём только заявки "в работе")
  '''
    from xlwt import Workbook, XFStyle, Alignment, Font
    from models import ordermodel, clientmodel
    import StringIO

    userlib.check_page_access('stats','r')
    response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=UTF-8'
    response.headers['Content-Type'] = 'application/vnd.ms-excel'
    response.headers['Content-Disposition'] = 'attachment; filename=crm_stat_' +datetime.datetime.utcnow().strftime('%d_%m_%Y_%H_%M_%S')+'.xls'
    try:
        # получение и формаирование данных
        # получение списка клиентов
        data_clients = clientmodel.get_list(None,{'_id':1, 'contacts':1, 'name':1, 'rekvisit':1})
        clients = {}
        for cl in data_clients:
            clients[cl['_id']] = cl

        # получение списка заявок
        data_orders = ordermodel.get_list(
            {
                'condition_type':'промежуточное'
            },
            {
                'number':1,
                'client_id':1,
                'products':1,
                'history':1,
                'total_address':1,
                'total_montaz':1,
                'sq':1,
                'price':1,
                'structure':1,
                'contracts':1
            }
        )

        # подготовка данных
        for order in data_orders:
            # если есть история заявки
            if 'history' in order and len(order['history'])>0:
                # сортировка истории и получение последнего состояния
                order['history'].sort(key = lambda x: (routine.strToDateTime(x['datetime'])))
                # получение информации о клиенте
                client = clients.get(order['client_id'], {})
                order['client_name'] = client.get('name', '')
                order['rekvisit'] = client.get('rekvisit', '')
        data_orders.sort(key=lambda x:(x['number']))

        #Генерация XLS файла
        output = StringIO.StringIO()
        wb = Workbook(encoding='utf-8')
        ws = wb.add_sheet('Data')
        # styles
        al1 = Alignment()
        al1.horz = Alignment.HORZ_LEFT
        al1.vert = Alignment.VERT_TOP
        al1.wrap = Alignment.WRAP_AT_RIGHT
        font = Font()
        font.bold = True
        style1 = XFStyle()
        style1.alignment = al1
        style_header = XFStyle()
        style_header.alignment = al1
        style_header.font = font
        date_format = XFStyle()
        date_format.num_format_str = 'dd/mm/yyyy'
        datetime_format = XFStyle()
        datetime_format.num_format_str = 'dd/mm/yyyy HH:MM'

        date_format1 = XFStyle()
        date_format1.num_format_str = 'D-MMM-YY' # Other options: D-MMM-YY, D-MMM, MMM-YY, h:mm, h:mm:ss, h:mm, h:mm:ss, M/D/YY h:mm, mm:ss, [h]:mm:ss, mm:ss.0

        #set header------------
        ws.write(0,0, u"Дата состояния".encode("utf-8"),style_header)
        ws.write(0,1, u"Код заявки".encode("utf-8"),style_header)
        ws.write(0,2, u"Клиент".encode("utf-8"),style_header)
        ws.write(0,3, u"Общая пл.".encode("utf-8"),style_header)
        ws.write(0,4, u"Общая сумма".encode("utf-8"),style_header)
        ws.write(0,5, u"Комментарий".encode("utf-8"),style_header)
        ws.write(0,6, u"Состояние".encode("utf-8"),style_header)
        ws.write(0,7, u"Тип состояния".encode("utf-8"),style_header)
        ws.write(0,8, u"Вероятность".encode("utf-8"),style_header)
        ws.write(0,9, u"Пл. дата закрытия".encode("utf-8"),style_header)
        ws.write(0,10, u"Менеджер заявки".encode("utf-8"),style_header)
        ws.write(0,11, u"Договор".encode("utf-8"),style_header)

        # columns width
        ws.col(0).width = 256 * 15 # Дата состояния
        ws.col(1).width = 256 * 10 # Код заявки
        ws.col(2).width = 256 * 30 # Клиент
        ws.col(3).width = 256 * 10 # Сумма
        ws.col(4).width = 256 * 10 # Площадь
        ws.col(5).width = 256 * 40 # Комментарий
        ws.col(6).width = 256 * 15 # Состояние
        ws.col(7).width = 256 * 10 # Тип состояния
        ws.col(8).width = 256 * 10 # Вероятность
        ws.col(9).width = 256 * 15 # Плановая дата закрытия
        ws.col(10).width = 256 * 15 # Менеджер
        ws.col(11).width = 256 * 15 # Договор

        rowIndex = 1
        for order in data_orders:
            finish_state = order['history'][len(order['history'])-1]
            contracts_str = '; '.join([str(contract_row['number']) for contract_row in (order.get('contracts',[]) or [])])

            ws.write(rowIndex,0, routine.strToDateTime(finish_state.get('datetime')), datetime_format)
            ws.write(rowIndex,1, order['number'],style1)
            ws.write(rowIndex,2, order['client_name'],style1)
            ws.write(rowIndex,3, order['sq'],style1)
            ws.write(rowIndex,4, order['price'],style1)
            ws.write(rowIndex,5, finish_state.get('comment',''),style1)
            ws.write(rowIndex,6, finish_state.get('condition',''),style1)
            ws.write(rowIndex,7, finish_state.get('reason',''),style1)
            ws.write(rowIndex,8, finish_state.get('chance',''),style1)
            ws.write(rowIndex,9, routine.strToDateTime(finish_state.get('enddate','')),date_format)
            ws.write(rowIndex,10, finish_state.get('manager',''),style1)
            ws.write(rowIndex,11, contracts_str, style1)

            rowIndex+=1
        wb.save(output)
        output.seek(0)
        return output.read()

    except Exception, exc:
        print('Error! Get stats CRM vers5.' + str(exc))
        excType = exc.__class__.__name__
        print_exc()
        return {'status':'error', 'msg':'Error! Msg: '+ str(exc)}

@get('/stats/clients/vers1')
def get_stats_clients_vers1():
    '''
  Статистика по клиентам
  Выгрузка в XLS статистики по клиентам
  '''
    from xlwt import Workbook, XFStyle, Alignment, Font
    from models import clientmodel
    import StringIO

    userlib.check_page_access('stats','r')
    response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=UTF-8'
    response.headers['Content-Type'] = 'application/vnd.ms-excel'
    response.headers['Content-Disposition'] = 'attachment; filename=clients_stat_' +datetime.datetime.utcnow().strftime('%d_%m_%Y_%H_%M_%S')+'.xls'
    try:
        # получение и формаирование данных
        # получение списка клиентов
        data_clients = clientmodel.get_list(None,{'_id':1, 'contacts':1, 'name':1, 'rekvisit':1,'wherefind':1, 'firstcontact':1})
        data_clients.sort(key=lambda x:(x['name'],x.get('wherefind',''), x.get('firstcontact','')))

        #Генерация XLS файла
        output = StringIO.StringIO()
        wb = Workbook(encoding='utf-8')
        ws = wb.add_sheet('Data')
        # styles
        al1 = Alignment()
        al1.horz = Alignment.HORZ_LEFT
        al1.vert = Alignment.VERT_TOP
        al1.wrap = Alignment.WRAP_AT_RIGHT
        font = Font()
        font.bold = True
        style1 = XFStyle()
        style1.alignment = al1
        style_header = XFStyle()
        style_header.alignment = al1
        style_header.font = font

        #set header------------
        ws.write(0,0, u"Клиент".encode("utf-8"),style_header)
        ws.write(0,1, u"Откуда узнали".encode("utf-8"),style_header)
        ws.write(0,2, u"Первый контакт".encode("utf-8"),style_header)

        # columns width
        ws.col(0).width = 256 * 30 # Клиент
        ws.col(1).width = 256 * 30 # Откуда узнали
        ws.col(2).width = 256 * 30 # Первый контакт

        rowIndex = 1
        for row in data_clients:
            ws.write(rowIndex,0, row['name'],style1)
            ws.write(rowIndex,1, row.get('wherefind',''),style1)
            ws.write(rowIndex,2, row.get('firstcontact',''),style1)
            rowIndex+=1
        wb.save(output)
        output.seek(0)
        return output.read()

    except Exception, exc:
        print('Error! Get stats Clients.' + str(exc))
        excType = exc.__class__.__name__
        print_exc()
        return {'status':'error', 'msg':'Error! Msg: '+ str(exc)}


def get_rejections(bad_stat_data, today):
    '''
  Функция получения отклонений по работам
  '''
    result = []
    for row in bad_stat_data:
        order_number = str(row['contract_number']) +'.'+ str(row['product_number'])+ '.' + str(row['product_unit_number'])
        # sort status_log by date
        if(len(row['status_log'])):
            row['status_log'].sort(key = lambda x: (x['date']))
        # get today status according today date
        today_status = {}
        prev_status = {}
        if len(row['status_log'])>1:
            i=1
            while i < len(row['status_log']):
                if today>=row['status_log'][i-1]['date'] and today<row['status_log'][i]['date']:
                    today_status = row['status_log'][i-1]
                    try:
                        prev_status = row['status_log'][i-2]
                    except:
                        prev_status = {}
                        pass
                    break
                i+=1

            if not today_status:
                today_status =row['status_log'][len(row['status_log'])-1]
                try:
                    prev_status = row['status_log'][len(row['status_log'])-2]
                except:
                    prev_status = {}
                    pass
        elif len(row['status_log'])>0:
            today_status = row['status_log'][0]

        # get last fact work date according today date
        last_fact_work_date = None
        try:
            if 'fact_work' in row and row['fact_work'] is not None and len(row['fact_work'])>0:
                row['fact_work'].sort(key = lambda x: (x['date']))
                for fact_work_item in row['fact_work']:
                    if fact_work_item['date']>today:
                        break
                    else:
                        last_fact_work_date = fact_work_item['date'];
        except:
            pass

        if not last_fact_work_date:
            last_fact_work_date =row['plan_work_date_start_with_shift']


        if (
                today_status.get('status','') == 'on_pause' or
                today_status.get('status','') == 'on_hold' or
                today_status.get('status','') == 'on_work_with_reject' or
                #(today_status.get('status','') !='completed' and not last_fact_work_date) or
                (
                        today_status.get('status','') !='completed' and
                        last_fact_work_date is not None and
                        ((today-last_fact_work_date).days>2 or(today-last_fact_work_date).days==2 and (datetime.datetime.now() + datetime.timedelta(hours=routine.moscow_tz_offset)).hour>10)
                )
        ):

            # если текущий статус = on_work_with_reject и прошло уже больше 2 дней с даты
            # указанного статуса. то ставим ему статус  = on_work. Это сделано для отго, чтобы на следующий
            # день после работы с отклонением началась генериться ошибка - нет данных
            if today_status.get('status','') =='on_work_with_reject' and (today-today_status['date']).days > 1:
                today_status['status'] = 'on_work'

            if (today_status.get('status','') =='on_work' or today_status.get('status','') =='on_work_with_reject') and (today-today_status['date']).days <= 1:
                today_status = prev_status
            row['reason'] = today_status.get('reason','')
            row['cur_status'] = today_status if today_status and len(today_status)>0 else None
            row['reject_date'] = today_status.get('date')

            result.append(row);
    return result


@get('/stats/workorders/rejections/vers1/<date_from>/<date_to>')
def get_stats_workorder_rejections_vers1(date_from, date_to):
    '''
    Статистика отклонений по работам за указанный год (#iss_314)
  '''
    # проверка доступа к статистике
    userlib.check_page_access('stats','r')
    # ипорт необходимого хэндлера
    from models import planshiftreason

    try:
        result = []
        # если не задан год, то выдавать ошибку
        if not date_from or not date_to:
            return {'status':'error', 'msg':'Wrang dates in query. Correct format: /2014-03-21/2014-04-21'}
        # формирование списка дат по всем дням указанного года
        start = time.clock()
        #year = routine.strToInt(year)
        #d1 = datetime.datetime(year, 1, 1,0,0,0)
        #d2 = datetime.datetime(year + 1, 1, 1,0,0,0)

        try:
            d1 = datetime.datetime.strptime(date_from, '%Y-%m-%d')
        except:
            return {'status':'error', 'msg':u'Wrang start date format. Correct format: /2014-03-21/2014-04-21'}
        try:
            d2 = datetime.datetime.strptime(date_to, '%Y-%m-%d')
        except:
            return {'status':'error', 'msg':u'Wrang finish date format. Correct format: /2014-03-21/2014-04-21'}

        dd = [d1 + datetime.timedelta(days=x) for x in range((d2-d1).days + 1)]

        # получение данных из необходимых справочников
        # получение участков
        arrDataSectors = sectormodel.get_all_only_sectors()
        dataSectors = {}
        for row in arrDataSectors:
            dataSectors[str(row['_id'])] = row
        # получение работ из справочников
        dataWorks = sectormodel.get_all_works()
        # получение причин отклонений
        dataReasons = planshiftreason.get_all()

        # получение приостановок и простоев за указанный период данных
        cond = [
            {"$project":{
                "contract_id":1,
                "contract_number":1,
                "number":1,
                "sector_id":1,
                "sector_code":1,
                "production_id":1,
                "production_name":1,
                "production_number":1,
                "plan_work":1,
                "production_units":1,
                "status":1,
                "status_date":1,
                "date_start_with_shift": 1,
                "date_finish_with_shift": 1
            }
            },
            {"$match":{
                "date_start_with_shift": {"$gte": d1},
                "date_finish_with_shift": {"$lte": d2}
            }
            },
            {"$unwind": "$production_units"},
            {"$project":{
                "contract_id":"$contract_id",
                "contract_number":"$contract_number",
                "sector_id":"$sector_id",
                "sector_code":"$sector_code",
                "number":"$number",
                "production_id":"$production_id",
                "production_name":"$production_name",
                "production_number":"$production_number",
                "production_unit_id": "$production_units.unit_id",
                "production_unit_number": "$production_units.unit_number",
                "plan_work":"$plan_work",
            }
            },
            {"$unwind": "$plan_work"},
            {"$project":{
                "contract_id":"$contract_id",
                "contract_number":"$contract_number",
                "number":"$number",
                "sector_id":"$sector_id",
                "sector_code":"$sector_code",
                "product_id":"$production_id",
                "product_name":"$production_name",
                "product_number":"$production_number",
                "product_unit_id": "$production_units.unit_id",
                "product_unit_number": "$production_unit_number",
                "plan_work_scope":"$plan_work.scope",
                "plan_work_status":"$plan_work.status",
                "plan_work_code":"$plan_work.code",
                "plan_work_id":"$plan_work.work_id",
                "plan_work_date_start":"$plan_work.date_start",
                "plan_work_date_finish":"$plan_work.date_finish",
                "plan_work_date_start_with_shift":"$plan_work.date_start_with_shift",
                "plan_work_date_finish_with_shift":"$plan_work.date_finish_with_shift",
                "fact_work":"$plan_work.fact_work",
                "status_log":"$plan_work.status_log"
            }
            },
            {"$unwind": "$status_log"},
            {"$project":{
                "contract_id":"$contract_id",
                "contract_number":"$contract_number",
                "number":"$number",
                "sector_id":"$sector_id",
                "sector_code":"$sector_code",
                "product_id":"$production_id",
                "product_name":"$product_name",
                "product_number":"$product_number",
                "product_unit_id": "$product_units.unit_id",
                "product_unit_number": "$product_unit_number",
                "plan_work_scope":"$plan_work_scope",
                "plan_work_status":"$plan_work_status",
                "plan_work_code":"$plan_work_code",
                "plan_work_id":"$plan_work_id",
                "plan_work_date_start":"$plan_work_date_start",
                "plan_work_date_finish":"$plan_work_date_finish",
                "plan_work_date_start_with_shift":"$plan_work_date_start_with_shift",
                "plan_work_date_finish_with_shift":"$plan_work_date_finish_with_shift",
                "fact_work":"$fact_work",
                "reject_date":"$status_log.date",

                "status_log_user":"$status_log.user_email",
                "status_log_note":"$status_log.note",
                "status_log_status":"$status_log.status",
                "status_log_reason":"$status_log.reason",
            }
            },
            {"$match": {

                '$or':[
                    {'status_log_status': 'on_pause'},
                    {'status_log_status': 'on_hold'},
                    {'status_log_status': 'on_work_with_reject'},

                ],
                "reject_date": {"$gte": d1},
                "reject_date": {"$lte": d2}
            }
            }
        ]

        db_res = workordermodel.do_aggregate(cond)
        if db_res and len(db_res)>0:
            result+=db_res

        # получение переносов за указанный период времени
        cond = [
            {"$project":{
                "contract_id":1,
                "contract_number":1,
                "number":1,
                "sector_id":1,
                "sector_code":1,
                "production_id":1,
                "production_name":1,
                "production_number":1,
                "plan_work":1,
                "production_units":1,
                "status":1,
                "status_date":1,
                "date_start_with_shift": 1,
                "date_finish_with_shift": 1
            }
            },
            {'$match': {
                '$and': [
                    {'plan_work.plan_shifts.date_change': {'$gte': d1}},
                    {'plan_work.plan_shifts.date_change': {'$lte': d2}}
                ]}
            },
            {"$unwind": "$production_units"},
            {"$project":{
                "contract_id":"$contract_id",
                "contract_number":"$contract_number",
                "sector_id":"$sector_id",
                "sector_code":"$sector_code",
                "number":"$number",
                "production_id":"$production_id",
                "production_name":"$production_name",
                "production_number":"$production_number",
                "production_unit_id": "$production_units.unit_id",
                "production_unit_number": "$production_units.unit_number",
                "plan_work":"$plan_work",
            }
            },
            {"$unwind": "$plan_work"},
            {"$project":{
                "contract_id":"$contract_id",
                "contract_number":"$contract_number",
                "number":"$number",
                "sector_id":"$sector_id",
                "sector_code":"$sector_code",
                "product_id":"$production_id",
                "product_name":"$production_name",
                "product_number":"$production_number",
                "product_unit_id": "$production_units.unit_id",
                "product_unit_number": "$production_unit_number",
                "plan_work_scope":"$plan_work.scope",
                "plan_work_status":"$plan_work.status",
                "plan_work_code":"$plan_work.code",
                "plan_work_id":"$plan_work.work_id",
                "plan_work_date_start":"$plan_work.date_start",
                "plan_work_date_finish":"$plan_work.date_finish",
                "plan_work_date_start_with_shift":"$plan_work.date_start_with_shift",
                "plan_work_date_finish_with_shift":"$plan_work.date_finish_with_shift",
                "fact_work":"$plan_work.fact_work",
                "plan_shifts":"$plan_work.plan_shifts"
            }
            },
            {"$unwind": "$plan_shifts"},
            {"$project":{
                "contract_id":"$contract_id",
                "contract_number":"$contract_number",
                "number":"$number",
                "sector_id":"$sector_id",
                "sector_code":"$sector_code",
                "product_id":"$product_id",
                "product_name":"$product_name",
                "product_number":"$product_number",
                "product_unit_id": "$product_units.unit_id",
                "product_unit_number": "$product_unit_number",
                "plan_work_scope":"$plan_work_scope",
                "plan_work_status":"$plan_work_status",
                "plan_work_code":"$plan_work_code",
                "plan_work_id":"$plan_work_id",
                "plan_work_date_start":"$plan_work_date_start",
                "plan_work_date_finish":"$plan_work_date_finish",
                "plan_work_date_start_with_shift":"$plan_work_date_start_with_shift",
                "plan_work_date_finish_with_shift":"$plan_work_date_finish_with_shift",
                "fact_work":"$fact_work",

                "reject_date":"$plan_shifts.date_change",
                "plan_shifts_user":"$plan_shifts.user_email",
                "plan_shifts_note":"$plan_shifts.note",
                "plan_shifts_type":"$plan_shifts.type",
                "plan_shifts_reason":"$plan_shifts.reason",
                "plan_shifts_shift":"$plan_shifts.shift",
            }
            },

            {'$match': {
                '$and': [
                    {'reject_date': {'$gte': d1}},
                    {'reject_date': {'$lte': d2}}
                ]}
            }
        ]

        db_res = workordermodel.do_aggregate(cond)
        if db_res and len(db_res)>0:
            result+=db_res

        # получение всех номеров договоров из списка данных
        contract_numbers = []
        for row in result:
            if(row['contract_number'] not in contract_numbers):
                contract_numbers.append(row['contract_number'])
        data_contracts_arr = {}
        if len(contract_numbers)>0:
            data_contracts = contractmodel.find_short_by_numbers(contract_numbers)
            for i in data_contracts:
                data_contracts_arr[str(i['_id'])] = i

        for row in result:
            row["order_number"] =str(row['contract_number']) +'.'+ str(row['product_number'])+ '.' + str(row['product_unit_number'])
            row['client_name'] = data_contracts_arr[str(row['contract_id'])] ['client_name'] if str(row['contract_id']) in data_contracts_arr else ''
            row['plan_work_name'] = dataWorks[str(row['plan_work_id']) ]['name'] if str(row['plan_work_id']) in dataWorks else ''
            row['sector_name'] = dataSectors[str(row['sector_id'])]['name'] if str(row['sector_id']) in dataSectors else ''
            row['sector_type'] = dataSectors[str(row['sector_id'])]['type'] if str(row['sector_id']) in dataSectors else ''

        # сортировка данных
        result.sort(key=lambda x:(x['reject_date'], x['contract_number'], x['product_number'], x['product_unit_number'], x['number'], x['sector_type'],x['sector_code'] ,x['plan_work_code']))

        print "Time build is: ", time.clock() - start
        # подготовка к заполнению XLS
        from xlrd import open_workbook
        from xlutils.copy import copy as wbcopy
        from xlwt import Workbook, XFStyle, Alignment, Font
        from models import ordermodel, clientmodel
        import StringIO

        userlib.check_page_access('stats','r')
        response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=UTF-8'
        response.headers['Content-Type'] = 'application/vnd.ms-excel'
        response.headers['Content-Disposition'] = 'attachment; filename=rejections_stat_' +datetime.datetime.utcnow().strftime('%d_%m_%Y_%H_%M_%S')+'.xls'

        #Генерация XLS файла
        output = StringIO.StringIO()
        wb = Workbook(encoding='utf-8')
        ws = wb.add_sheet('Data')
        # styles
        al1 = Alignment()
        al1.horz = Alignment.HORZ_LEFT
        al1.vert = Alignment.VERT_TOP
        al1.wrap = Alignment.WRAP_AT_RIGHT
        font = Font()
        font.bold = True
        style1 = XFStyle()
        style1.alignment = al1
        style_header = XFStyle()
        style_header.alignment = al1
        style_header.font = font

        date_format = XFStyle()
        date_format.num_format_str = 'dd/mm/yyyy'
        datetime_format = XFStyle()
        datetime_format.num_format_str = 'dd/mm/yyyy HH:MM'

        #set header------------
        ws.write(0,0, u"Дата отклонения".encode("utf-8"),style_header)
        ws.write(0,1, u"Договор".encode("utf-8"),style_header)
        ws.write(0,2, u"Заказ".encode("utf-8"),style_header)
        ws.write(0,3, u"Направление".encode("utf-8"),style_header)

        ws.write(0,4, u"Участок, название".encode("utf-8"),style_header)
        ws.write(0,5, u"Участок, код".encode("utf-8"),style_header)
        ws.write(0,6, u"Наряд".encode("utf-8"),style_header)
        ws.write(0,7, u"Работа, название".encode("utf-8"),style_header)
        ws.write(0,8, u"Работа, код".encode("utf-8"),style_header)
        ws.write(0,9, u"Корректировка, тип".encode("utf-8"),style_header)
        ws.write(0,10, u"Корректировка, вид".encode("utf-8"),style_header)
        ws.write(0,11, u"Весь наряд".encode("utf-8"),style_header)
        ws.write(0,12, u"Причина".encode("utf-8"),style_header)
        ws.write(0,13, u"Комментарий".encode("utf-8"),style_header)
        ws.write(0,14, u"Пользователь".encode("utf-8"),style_header)

        # columns width
        ws.col(0).width = 256 * 15 # Дата отклонения
        ws.col(1).width = 256 * 15 # Договор
        ws.col(2).width = 256 * 15 # Заказ
        ws.col(3).width = 256 * 20 # Направление
        ws.col(4).width = 256 * 40 # Участок, название
        ws.col(5).width = 256 * 15 # Участок, код
        ws.col(6).width = 256 * 15 # Наряд
        ws.col(7).width = 256 * 40 # Работа, название
        ws.col(8).width = 256 * 15 # Работа, код
        ws.col(9).width = 256 * 15 # Корректировка, тип
        ws.col(10).width = 256 * 40 # Корректировка, вид
        ws.col(11).width = 256 * 10 # Весь наряд
        ws.col(12).width = 256 * 20 # Причина
        ws.col(13).width = 256 * 40 # Комментарий
        ws.col(14).width = 256 * 15 # Пользователь

        rowIndex = 1
        statuses = {'on_hold': 'Простой', 'on_pause': 'Приостановка', 'on_work_with_reject': 'Работа с отклонением'}

        for row in result:
            ws.write(rowIndex,0, row['reject_date'] + datetime.timedelta(hours=routine.moscow_tz_offset), datetime_format)
            ws.write(rowIndex,1, row['contract_number'], style1)
            ws.write(rowIndex,2, row['order_number'], style1)
            ws.write(rowIndex,3, row['sector_type'], style1)
            ws.write(rowIndex,4, row['sector_name'], style1)
            ws.write(rowIndex,5, row['sector_code'], style1)
            ws.write(rowIndex,6, row['number'], style1)
            ws.write(rowIndex,7, row['plan_work_name'], style1)
            ws.write(rowIndex,8, row['plan_work_code'], style1)

            # если простой или приостановка
            if row.get('status_log_status'):
                ws.write(rowIndex,9, statuses[row['status_log_status']] , style1) # корректировка тип
                ws.write(rowIndex,10, '', style1) # корректировка вид
                ws.write(rowIndex,11, '', style1) # весь наряд
                ws.write(rowIndex,12, row.get('status_log_reason',''), style1) # Причина
                ws.write(rowIndex,13, row['status_log_note'], style1)
                ws.write(rowIndex,14, row['status_log_user'], style1)
            # если переносы сроков
            else:
                plan_shift_decode = ''
                ws.write(rowIndex,9, 'Сроки' , style1) # корректировка тип
                if row['plan_shifts_type'] == 'start':
                    if routine.strToInt(row['plan_shifts_shift'])<0:
                        plan_shift_decode = 'Увеличение длительности'
                    else:
                        plan_shift_decode = 'Сокращение длительности'
                elif row['plan_shifts_type'] == 'finish':
                    if routine.strToInt(row['plan_shifts_shift'])>0:
                        plan_shift_decode = 'Увеличение длительности'
                    else:
                        plan_shift_decode = 'Сокращение длительности'
                elif row['plan_shifts_type'] == 'both':
                    plan_shift_decode = 'Перенос'

                ws.write(rowIndex,10, plan_shift_decode, style1) # корректировка вид
                ws.write(rowIndex,11, '', style1) # весь наряд

                ws.write(rowIndex,12, row['plan_shifts_reason'], style1) # Причина
                ws.write(rowIndex,13, row['plan_shifts_note'], style1)
                ws.write(rowIndex,14, row['plan_shifts_user'], style1)
            rowIndex+=1
        wb.save(output)
        output.seek(0)
        return output.read()

    except Exception, exc:
        print('Error! Get stats WorkOrder rejections.' + str(exc))
        excType = exc.__class__.__name__
        print_exc()
        return {'status':'error', 'msg':'Error! Msg: '+ str(exc)}

@get('/stats/clients/vers2/<manager_email>')
def get_stats_clients_vers2(manager_email):
    '''
  Статистика по клиентам
  Выгрузка в XLS статистики по клиентам
  '''
    from xlwt import Workbook, XFStyle, Alignment, Font
    from models import ordermodel, clientmodel
    import StringIO

    userlib.check_page_access('stats','r')
    response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=UTF-8'
    response.headers['Content-Type'] = 'application/vnd.ms-excel'
    response.headers['Content-Disposition'] = 'attachment; filename=clients_stat_' +datetime.datetime.utcnow().strftime('%d_%m_%Y_%H_%M_%S')+'.xls'
    try:
        # если не задан менеджер, то выдавать ошибку
        if not manager_email:
            return {'status':'error', 'msg':'No manager.'}
        # получение всех заявок в которых отметился указанный менеджер
        clients_ids = []
        data_orders = ordermodel.get_list({'history.manager':manager_email},{'client_id':1})
        if not data_orders or len(data_orders)==0:
            return {'status':'error', 'msg':'No clients for this manager.'}
        for row in data_orders:
            if not row['client_id'] in clients_ids:
                clients_ids.append(row['client_id'])

        # получение списка клиентов
        data_clients = clientmodel.get_list({'_id': {'$in': clients_ids}},{'_id':1, 'contacts':1, 'name':1, 'rekvisit':1,'wherefind':1, 'firstcontact':1})
        data_clients.sort(key=lambda x:(x['name'],x.get('wherefind',''), x['firstcontact']))

        #Генерация XLS файла
        output = StringIO.StringIO()
        wb = Workbook(encoding='utf-8')
        ws = wb.add_sheet('Data')
        # styles
        al1 = Alignment()
        al1.horz = Alignment.HORZ_LEFT
        al1.vert = Alignment.VERT_TOP
        al1.wrap = Alignment.WRAP_AT_RIGHT
        font = Font()
        font.bold = True
        style1 = XFStyle()
        style1.alignment = al1
        style_header = XFStyle()
        style_header.alignment = al1
        style_header.font = font

        #set header------------
        ws.write(0,0, u"Клиент".encode("utf-8"),style_header)
        ws.write(0,1, u"Откуда узнали".encode("utf-8"),style_header)
        ws.write(0,2, u"Первый контакт".encode("utf-8"),style_header)
        ws.write(0,3, u"Реквизиты".encode("utf-8"),style_header)
        ws.write(0,4, u"Контакты".encode("utf-8"),style_header)

        # columns width
        ws.col(0).width = 256 * 30 # Клиент
        ws.col(1).width = 256 * 30 # Откуда узнали
        ws.col(2).width = 256 * 30 # Первый контакт
        ws.col(3).width = 256 * 30 # Реквизиты
        ws.col(4).width = 256 * 60 # Контакты

        rowIndex = 1
        for row in data_clients:
            contacts = ""
            if 'contacts' in row and len(row['contacts'])>0:
                for contact in row['contacts']:
                    contacts += "ФИО: {0}\nEmail: {1}\nТелефон: {2}".format(contact.get('fio',''),contact.get('email',[])[0] if len(contact.get('email',[]))>0 else '' ,contact.get('phone',[])[0] if len(contact.get('phone',[]))>0 else '' ) + '\n\n'

            ws.write(rowIndex,0, row['name'],style1)
            ws.write(rowIndex,1, row['wherefind'],style1)
            ws.write(rowIndex,2, row['firstcontact'],style1)
            ws.write(rowIndex,3, row['rekvisit'],style1)
            ws.write(rowIndex,4, contacts,style1)
            rowIndex+=1
        wb.save(output)
        output.seek(0)
        return output.read()

    except Exception, exc:
        print('Error! Get stats Clients.' + str(exc))
        excType = exc.__class__.__name__
        print_exc()
        return {'status':'error', 'msg':'Error! Msg: '+ str(exc)}

@get('/stats/esud/report1')
def get_stats_esud_report1():
    '''
    ЕСУД. Статистика по изделиям.
    [название, тип, путь]
  '''
    from xlwt import Workbook, XFStyle, Alignment, Font
    from models import datamodel
    from apis.esud import esudspecificationapi

    userlib.check_page_access('stats','r')
    response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=UTF-8'
    response.headers['Content-Type'] = 'application/vnd.ms-excel'
    response.headers['Content-Disposition'] = 'attachment; filename=esud_stat1_' +datetime.datetime.utcnow().strftime('%d_%m_%Y_%H_%M_%S')+'.xls'
    try:

        # результат
        result_data = []
        # функция для рассшифровки пути изделия
        def decode_path(list, path):
            result = ''
            if path:
                path_ids = path.split('-')
                for i in path_ids:
                    id_item = ObjectId(i)
                    node = list.get(id_item)
                    if node:
                        result+=node['name'] + ' / '
                    else:
                        result+= '??? / '
            return result

        start = time.clock()
        print("Start build esud stat.")
        # получение данных
        list = datamodel.get_cached_data()
        print "Get data from db: ", time.clock() - start
        parents_list = {}

        # поиск среди данных всех объектов с типом = изделие
        cache_data = {}
        for node_id in list['data']:
            node = list['data'][node_id]
            #if node.get('number')=='534.003':
            if node.get('status')!='del' and node.get('type')=='product_model':
                children = esudapi.get_childs(list, node['_id'])
                for c in children:
                    if c['type'] == 'product_model':
                        if str(c['_id']) not in parents_list:
                            parents_list[c['_id']] = []
                        parents_list[c['_id']].append(node)

            elif node.get('status')!='del' and node.get('type')=='product' and not node.get('datalink'):
                # проверка изделия на покупное
                children = esudapi.get_childs(list, node['_id'])
                for c in children:
                    if 'datalink' in c :
                        if c['datalink'] == datamodel.SYSTEM_OBJECTS['BUY_PROP']:
                            node['is_buy'] = True
                            break
                        if c['type']=='product_model':
                            # выставление признака покупного изделия
                            node['is_buy'] = esudapi.check_link_on_buy(list, c['datalink'])

                # расшифровка пути изделия
                node['decoded_path'] = decode_path(list['data'], node['path'])
                node['sector'] = '?'

                # определение участка изделия
                # участок может храниться в свойствах изделия, а также вложен в модель с одним значением
                tree = esudapi.make_full_tree_production(list, node['_id'], True, None,cache_data, 4)

                esudapi.clear_tree_from_types(tree, ['library'])
                esudapi.refresh_parent_node(tree)
                esudspecificationapi.prepare_properties_list(tree)
                errors = []
                tree['count'] = {'unit':'шт.', 'value':1, 'is_calculate': False}
                product_tree =  esudspecificationapi.prepare_tree_to_specificate(list, tree, [], tree['node'].get('properties'),  errors, True, False)
                sector = product_tree.get('sector',None)
                if sector:
                    if sector.get('value'):
                        node['sector'] = sector['value'].get('name', '?')
                    elif len(sector.get('values',[]) or [])>0:
                        node['sector'] = (sector['values'][0].get('value','?') or '?')


                result_data.append(node)


        #сортировка результата по названию элементов и пути
        result_data.sort(key = lambda x: (x['name'], x['decoded_path']))
        print "Time with prepare is: ", time.clock() - start


        #Генерация XLS файла
        import StringIO
        output = StringIO.StringIO()
        wb = Workbook(encoding='utf-8')
        ws = wb.add_sheet('Data')

        # styles
        al1 = Alignment()
        al1.horz = Alignment.HORZ_LEFT
        al1.vert = Alignment.VERT_TOP
        al1.wrap = Alignment.WRAP_AT_RIGHT

        font = Font()
        font.bold = True

        style1 = XFStyle()
        style1.alignment = al1

        style_header = XFStyle()
        style_header.alignment = al1
        style_header.font = font

        #set header------------
        ws.write(0,0, u"Артикль".encode("utf-8"),style_header)
        ws.write(0,1, u"Название".encode("utf-8"),style_header)
        ws.write(0,2, u"Тип".encode("utf-8"),style_header)
        ws.write(0,3, u"Участок".encode("utf-8"),style_header)
        ws.write(0,4, u"Путь".encode("utf-8"),style_header)
        ws.write(0,5, u"Используется".encode("utf-8"),style_header)
        ws.write(0,6, u"Используется кол-во раз".encode("utf-8"),style_header)

        # columns width
        ws.col(0).width = 256 * 15 # артикль
        ws.col(1).width = 256 * 80 # название
        ws.col(2).width = 256 * 15 # тип
        ws.col(3).width = 256 * 60 # участок
        ws.col(4).width = 256 * 80 # путь
        ws.col(5).width = 256 * 45 # используется где либо
        ws.col(6).width = 256 * 20 # используется количество раз

        rowIndex = 1
        for row in result_data:
            tmp_used_in = []
            # получение артиклей, в которых изделие используется
            for used_elem_id in list['used_in'].get(row['_id'], []):
                used_elem = list['data'].get(used_elem_id)
                if 'number' in  used_elem  and used_elem['number'] and used_elem['number'] not in tmp_used_in:
                    tmp_used_in.append(used_elem['number'])

            # # получение непосредственных родителей модели изделия
            # children = esudapi.get_childs(list, row['_id'])
            # tmp_models = []
            # for c in children:
            #   if c['type'] == 'product_model':
            #     tmp_models.extend(parents_list.get(c['_id'], []))
            #     break

            # #print(len(tmp_models))
            # for used_elem in tmp_models:
            #   if 'number' in  used_elem  and used_elem['number'] and used_elem['number'] not in tmp_used_in:
            #     tmp_used_in.append(used_elem['number'])

            # # получаем изделий, созданные на базе найденных моделей
            # for c in tmp_models:
            #   tmp_products_ids.extend(list['childs'].get(c['_id'],[]) )


            ws.write(rowIndex,0, row.get('number',''),style1)
            ws.write(rowIndex,1, row['name'],style1)
            ws.write(rowIndex,2, 'Покупное' if row.get('is_buy') else 'Собственное',style1)
            ws.write(rowIndex,3, row['sector'],style1)
            ws.write(rowIndex,4, row['decoded_path'],style1)
            #ws.write(rowIndex,5, 0 if row['_id'] not in list['used_in'] else 1 ,style1)
            ws.write(rowIndex,5, '; '.join(tmp_used_in) ,style1)
            ws.write(rowIndex,6, len(tmp_used_in) ,style1)


            rowIndex+=1
        wb.save(output)
        output.seek(0)
        return output.read()

    except Exception, exc:
        print('Error! Get stats esud.' + str(exc))
        excType = exc.__class__.__name__
        print_exc()
        return {'status':'error', 'msg':'Esud stat error. Msg: '+ str(exc)}


@get('/stats/esud/parse_shifr')
def parse_shifr():
    '''
    Парсинг шифров. ISS: #337
    Формат входных данных определен ниже и хранится в поле: data
  '''
    userlib.check_page_access('stats','r')

    data = [
        # {
        #   "shifr1":"Ф1.6250.1300.12-01.01.00.23",
        #   "new_name":"Раскос (640)",
        #   "shifr2":"",
        #   "old_name":"Ф1.6250.1300.12-01.01.00.23 Раскос (640)",
        #   "type":"Собственное",
        #   "path":"ИЗДЕЛИЯ / Фермы кровли / "
        # }
    ]


    from models import datamodel
    try:

        # иходные данные, приведенные к нужному формату
        shifr_items = {}
        p_data = {}
        for i in data:
            p_key = u"{0}{1}".format(i['path'], i['old_name'])
            print(p_key)
            p_data[p_key] = i

        # результат
        result_data = []
        # функция для рассшифровки пути изделия
        def decode_path(list, path):
            result = ''
            if path:
                path_ids = path.split('-')
                for i in path_ids:
                    id_item = ObjectId(i)
                    node = list.get(id_item)
                    if node:
                        result+=node['name'] + ' / '
                    else:
                        result+= '??? / '
            return result

        # получение данных
        list = datamodel.get_cached_data()
        shifr_items['shifr1'] = esudapi.get_elem(list,ObjectId('54c11681a1390700031adc0b'))
        shifr_items['shifr2'] = esudapi.get_elem(list,ObjectId('54c1168ba1390700031adc0c'))

        # поиск среди данных всех объектов с типом = изделие
        for node_id in list['data']:
            node = list['data'][node_id]
            if node.get('status')!='del' and node['type']=='product':
                # проверка изделия на покупное
                children = esudapi.get_childs(list, node['_id'])
                for c in children:
                    if 'datalink' in c :
                        if c['datalink'] == datamodel.SYSTEM_OBJECTS['BUY_PROP']:
                            node['is_buy'] = True
                            break
                        if c['type']=='product_model':
                            node['is_buy'] = esudapi.check_link_on_buy(list, c['datalink'])
                # расшифровка пути изделия
                node['decoded_path'] = decode_path(list['data'], node['path'])

                p_key =u"{0}{1}".format(node['decoded_path'], node['name'])
                if p_key in p_data:
                    node['shifr1'] = p_data[p_key]['shifr1']
                    node['shifr2'] = p_data[p_key]['shifr2']
                    node['new_name'] = p_data[p_key]['new_name']
                    result_data.append(node)


        for node in result_data:
            if node.get('shifr1','')!='' or node.get('shifr2','')!='':
                # поиск модели, на основе которой создано изделие
                children = esudapi.get_childs(list, node['_id'])
                for child in children:
                    if child['type']=='product_model' and child.get('status','')!='del':
                        if child.get('datalink'):
                            original_product_model = esudapi.get_elem(list,child['datalink'])
                        else:
                            original_product_model = child

                        copy_elem = shifr_items['shifr1'] if node.get('shifr1','')!='' else shifr_items['shifr2']

                        # проверка, нет ли ярлыка на свойство шифров в найденной модели
                        model_children = esudapi.get_childs(list, original_product_model['_id'])
                        has_prop_link = False
                        new_prop_id = None
                        for m_child in model_children:
                            if m_child.get('datalink') == copy_elem['_id']:
                                has_prop_link = True
                                new_prop_id = m_child['_id']
                                break

                        if not has_prop_link:
                            # поместить в модель ссылку на выбранное системное свойство
                            path = (original_product_model.get("path")+"-"+str(original_product_model['_id'])) if original_product_model.get("path") else str(original_product_model['_id'])
                            new_elem = {
                                'name':copy_elem.get("name"),
                                'type':copy_elem.get("type"),
                                'parent_id':original_product_model["_id"],
                                'path': path,
                                'datalink':copy_elem.get("_id"),
                                'routine':100,
                                'note':copy_elem.get("note")
                            }
                            prop_res =  datamodel.add(new_elem)
                            new_prop_id = prop_res['_id']
                            # добавление нового свойства в текущую коллекцию данных
                            list['data'][prop_res['_id']] = prop_res
                            list['childs'][prop_res['parent_id']].append(prop_res['_id'])
                            if prop_res['datalink'] not in list['links']:
                                list['links'][prop_res['datalink']] = []
                            list['links'][prop_res['datalink']].append(prop_res['_id'])

                        properties = node.get('properties', [])
                        new_product_prop = {
                            "configuration_path" : "",
                            "linkpath" : str(child.get('_id')),
                            "elem_id" : str(node['_id']),
                            "property_id" : new_prop_id,
                            'property_origin_id': copy_elem.get("_id"),
                            "value" : {
                                "id" : None,
                                "value" : node.get('shifr1','') if node.get('shifr1','')!='' else node.get('shifr2','')
                            },
                            "unit" : {
                                "id" : None,
                                "value" : None
                            }
                        }
                        properties.append(new_product_prop)
                        # сохранение данных
                        datamodel.update(node['_id'],{'properties':properties, 'name': node['new_name']})

        return 'OK'

    except Exception, exc:
        print('Error! Get stats esud.' + str(exc))
        excType = exc.__class__.__name__
        print_exc()
        return {'status':'error', 'msg':'Esud shifr error. Msg: '+ str(exc)}

@get('/stats/materials_sectors/report1')
def get_stats_materials_sectors_report1():
    '''
    #483 (Кол-во участков для материала)
  '''
    from xlwt import Workbook, XFStyle, Alignment, Font

    userlib.check_page_access('stats','r')
    response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=UTF-8'
    response.headers['Content-Type'] = 'application/vnd.ms-excel'
    response.headers['Content-Disposition'] = 'attachment; filename=materials_sectors_' +datetime.datetime.utcnow().strftime('%d_%m_%Y_%H_%M_%S')+'.xls'
    try:

        #Генерация XLS файла
        import StringIO
        output = StringIO.StringIO()
        wb = Workbook(encoding='utf-8')
        ws = wb.add_sheet('Data')

        data_result = []

        # styles
        al1 = Alignment()
        al1.horz = Alignment.HORZ_LEFT
        al1.vert = Alignment.VERT_TOP
        al1.wrap = Alignment.WRAP_AT_RIGHT

        font = Font()
        font.bold = True

        style1 = XFStyle()
        style1.alignment = al1

        style_header = XFStyle()
        style_header.alignment = al1
        style_header.font = font

        # получение работ с участками
        data_works = {}
        data_sectors = sectormodel.get_by(
            {'is_active':1},
            {
                '_id':1,
                'name':1,
                'routine':1,
                'type':1,
                'is_active':1,
                'code':1,
                'works._id':1,
                'works.code':1,
                'works.name':1,
                'works.is_active':1,
                'works.routine':1,
                'works.materials':1
            }
        )#.sort([('type',1),('name',1),("works.name",1)])

        data_sectors.sort(key = lambda x: (x['type'], x['name']))

        for sector in data_sectors:
            for work in sector['works']:
                data_works[str(work['_id'])] = {
                    'sector_id': str(sector['_id']),
                    'sector_code': sector['code'],
                    'sector_name': sector['name'],
                    'sector_type': sector['type'],
                    'work_code': work['code'],
                    'work_name': work['name']
                }

        # получение  материалов
        data_materials = {}
        data_materials_groups_cursor = materialsgroupmodel.get_by(
            {'is_active':1},
            {
                '_id':1,
                'name':1,
                'routine':1,
                'is_active':1,
                'code':1,
                'materials._id':1,
                'materials.code':1,
                'materials.name':1,
                'materials.is_active':1,
                'materials.routine':1,
                'materials.works':1
            }
        ).sort([('name',1),("materials.name",1)])

        for group in data_materials_groups_cursor:
            materials =  group.get('materials',[])
            for material in materials:
                for work_id in material.get('works', []):
                    work = data_works.get(str(work_id),None)
                    if work:
                        key = str(work['sector_code']) + '_' + str(group['code']) + '_' + str(material['code'])
                        if not key in data_materials:
                            data_materials[key]={
                                'group_code': group['code'],
                                'group_name': group['name'],
                                'material_code': material['code'],
                                'material_name': material['name'],
                                'material_is_active': material['is_active'],
                                'sector_code': work['sector_code'],
                                'sector_name': work['sector_name'],
                                'sector_type': work['sector_type']
                            }

        for key in data_materials:
            data_result.append(data_materials[key])
        #set header------------
        ws.write(0,0, u"Направление работ".encode("utf-8"),style_header)
        ws.write(0,1, u"Код участка".encode("utf-8"),style_header)
        ws.write(0,2, u"Название участка".encode("utf-8"),style_header)
        ws.write(0,3, u"Код группы мат.".encode("utf-8"),style_header)
        ws.write(0,4, u"Название группы".encode("utf-8"),style_header)
        ws.write(0,5, u"Код мат.".encode("utf-8"),style_header)
        ws.write(0,6, u"Название мат.".encode("utf-8"),style_header)

        # columns width
        ws.col(0).width = 256 * 20
        ws.col(1).width = 256 * 15
        ws.col(2).width = 256 * 30
        ws.col(3).width = 256 * 15
        ws.col(4).width = 256 * 30
        ws.col(5).width = 256 * 15
        ws.col(6).width = 256 * 30

        rowIndex = 1
        for row in data_result:
            tmp_used_in = []

            ws.write(rowIndex,0, row.get('sector_type',''),style1)
            ws.write(rowIndex,1, row['sector_code'],style1)
            ws.write(rowIndex,2, row['sector_name'], style1)
            ws.write(rowIndex,3, row['group_code'],style1)
            ws.write(rowIndex,4, row['group_name'],style1)
            ws.write(rowIndex,5, row['material_code'] ,style1)
            ws.write(rowIndex,6, row['material_name'] ,style1)

            rowIndex+=1
        wb.save(output)
        output.seek(0)
        return output.read()

    except Exception, exc:
        print('Error! Get stats materials_sectors.' + str(exc))
        excType = exc.__class__.__name__
        print_exc()
        return {'status':'error', 'msg':'Materials_Sectors stat error. Msg: '+ str(exc)}


@get('/stats/esud/report2')
def get_stats_esud_report2():
    '''
    #584, Выгрузка в эксель - объёмы покупных изделий
  '''
    #return 'Not available'
    # Функция получения изделий в моделе
    def get_model_items(model, group, result):
        if model.get('is_techno_group'):
            for cm in model.get('models',[]):
                group.append({
                    'name': model['node']['name'],
                    'origin_id': model['node'].get('datalink',model['node'].get('unit_id'))
                })
                get_model_items(cm, group, result)
        else:
            for p in model.get('items',[]):
                p['group'] = group
                result.append(p)

    from xlwt import Workbook, XFStyle, Alignment, Font
    from models import datamodel
    from apis.esud import esudspecificationapi

    userlib.check_page_access('stats','r')
    response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=UTF-8'
    response.headers['Content-Type'] = 'application/vnd.ms-excel'
    response.headers['Content-Disposition'] = 'attachment; filename=esud_stat2_' +datetime.datetime.utcnow().strftime('%d_%m_%Y_%H_%M_%S')+'.xls'
    try:

        # результат
        result_data = []
        # список изделий, содержащие покупные изделия
        products = []
        start = time.clock()
        print("Start build esud stat.")
        # получение данных
        list = datamodel.get_cached_data()
        print "Get data from db: ", time.clock() - start
        parents_list = {}

        # поиск среди данных всех объектов с типом = изделие
        cache_data = {}
        for node_id in list['data']:
            node = list['data'][node_id]
            #and node.get('number') == '014.003'
            #if node.get('status')!='del' and node.get('type')=='product' and node.get('number') and not node.get('datalink') and node.get('number') =='009.001':
            if node.get('status')!='del' and node.get('type')=='product' and node.get('number') and not node.get('datalink'):
                # проверка изделия на покупное
                children = esudapi.get_childs(list, node['_id'])
                for c in children:
                    if 'datalink' in c :
                        if c['datalink'] == datamodel.SYSTEM_OBJECTS['BUY_PROP']:
                            node['is_buy'] = True
                            break
                        if c['type']=='product_model':
                            # выставление признака покупного изделия
                            node['is_buy'] = esudapi.check_link_on_buy(list, c['datalink'])
                if node.get('is_buy'):
                    # получение артиклей, в которых изделие используется
                    for used_elem_id in list['used_in'].get(node['_id'], []):
                        used_elem = list['data'].get(used_elem_id)
                        if 'number' in  used_elem  and used_elem['number'] and used_elem['number'] not in products:
                            products.append(used_elem)


        # построение каждого продукта
        index = 0
        for node in products:
            if node.get('status')!='del' and node.get('type')=='product' and node.get('number') and not node.get('datalink'):
                index +=1
                tree = esudapi.make_full_tree_production(list, node['_id'],False,None,cache_data)
                esudapi.clear_tree_from_types(tree, ['library'])
                esudapi.analize_tree_model_configuration(list, tree, [node],True,cache_data)
                esudapi.refresh_parent_node(tree)
                esudspecificationapi.prepare_properties_list(tree)
                errors = []
                tree['count'] = {'unit':'шт.', 'value':1, 'is_calculate': False}
                product_tree =  esudspecificationapi.prepare_tree_to_specificate(list, tree, [], tree['node'].get('properties'),  errors, False, True)
                result_data.append(product_tree)
                print('--------' + str(index)+' of '+str(len(products))+'-----------')


        #сортировка результата по названию элементов и пути
        result_data.sort(key = lambda x: (x['node']['number']))

        #return routine.JSONEncoder().encode(product_tree)
        print "Time with prepare is: ", time.clock() - start

        #Генерация XLS файла
        import StringIO
        output = StringIO.StringIO()
        wb = Workbook(encoding='utf-8')
        ws = wb.add_sheet('Data')

        # styles
        al1 = Alignment()
        al1.horz = Alignment.HORZ_LEFT
        al1.vert = Alignment.VERT_TOP
        al1.wrap = Alignment.WRAP_AT_RIGHT

        font = Font()
        font.bold = True

        style1 = XFStyle()
        style1.alignment = al1

        style_header = XFStyle()
        style_header.alignment = al1
        style_header.font = font

        #set header------------
        ws.write(0,0, u"Артикул".encode("utf-8"),style_header)
        ws.write(0,1, u"Название".encode("utf-8"),style_header)
        ws.write(0,2, u"Объем по норме".encode("utf-8"),style_header)
        ws.write(0,3, u"Ед. изм".encode("utf-8"),style_header)
        ws.write(0,4, u"Объем на 1 шт.".encode("utf-8"),style_header)
        ws.write(0,5, u"Ед. изм".encode("utf-8"),style_header)
        ws.write(0,6, u"Количество".encode("utf-8"),style_header)
        ws.write(0,7, u"Ед. изм".encode("utf-8"),style_header)
        ws.write(0,8, u"Объем допуска".encode("utf-8"),style_header)
        ws.write(0,9, u"Ед. изм".encode("utf-8"),style_header)
        ws.write(0,10, u"Допуск на объем".encode("utf-8"),style_header)
        ws.write(0,11, u"Ед. изм".encode("utf-8"),style_header)
        ws.write(0,12, u"Артикул родителя".encode("utf-8"),style_header)
        ws.write(0,13, u"Название родителя".encode("utf-8"),style_header)
        ws.write(0,14, u"ID родителя".encode("utf-8"),style_header)

        # columns width
        ws.col(0).width = 256 * 15 # артикль
        ws.col(1).width = 256 * 80 # название
        ws.col(2).width = 256 * 15 # Объем по норме
        ws.col(3).width = 256 * 15 # Ед. изм
        ws.col(4).width = 256 * 15 # Объем на 1 шт.
        ws.col(5).width = 256 * 15 # Ед. изм
        ws.col(6).width = 256 * 15 # Количество
        ws.col(7).width = 256 * 15 # Ед. изм
        ws.col(8).width = 256 * 15 # Объем допуска
        ws.col(9).width = 256 * 15 # Ед. изм
        ws.col(10).width = 256 * 15 # Допуск на объем
        ws.col(11).width = 256 * 15 # Ед. изм
        ws.col(12).width = 256 * 15 # Артикул родителя
        ws.col(13).width = 256 * 15 # Название родителя
        ws.col(14).width = 256 * 15 # Название родителя



        # группировка данных по артиклу и родителю
        print_data = {}
        for data in result_data:
            for model in data.get('models',[]):
                items = []
                get_model_items(model,[], items)
                if items and len(items)>0:
                    for row in items:
                        if row['node'].get('is_buy'):
                            vol_tolerance = None
                            tolerance_on_vol = None
                            vol_per_unit = None
                            vol_count = None

                            for prop in row['properties']:
                                # объем допуска
                                if str(prop.get('datalink')) == str(datamodel.SYSTEM_OBJECTS['VOL_TOLERANCE_PROP']):
                                    vol_tolerance = {
                                        'value': (prop.get('value',{})or{}).get('value'),
                                        'unit': ((prop.get('value',{})or{}).get('unit',{}) or {}).get('name'),
                                        'unit_origin_id':  ((prop.get('value',{})or{}).get('unit',{}) or {}).get('datalink') if  ((prop.get('value',{})or{}).get('unit',{}) or {}).get('datalink') else ((prop.get('value',{})or{}).get('unit',{}) or {}).get('_id')
                                    }
                                if str(prop.get('datalink')) == str(datamodel.SYSTEM_OBJECTS['TOLERANCE_ON_VOL_PROP']):
                                    tolerance_on_vol = {
                                        'value': (prop.get('value',{})or{}).get('value'),
                                        'unit': ((prop.get('value',{})or{}).get('unit',{}) or {}).get('name'),
                                        'unit_origin_id':  ((prop.get('value',{})or{}).get('unit',{}) or {}).get('datalink') if  ((prop.get('value',{})or{}).get('unit',{}) or {}).get('datalink') else ((prop.get('value',{})or{}).get('unit',{}) or {}).get('_id')
                                    }
                                # объем на 1 штуку
                                if str(prop.get('datalink')) == str(datamodel.SYSTEM_OBJECTS['VOL_PER_UNIT_PROP']):
                                    vol_per_unit = {
                                        'value': (prop.get('value',{})or{}).get('value'),
                                        'unit': ((prop.get('value',{})or{}).get('unit',{}) or {}).get('name'),
                                        'unit_origin_id':  ((prop.get('value',{})or{}).get('unit',{}) or {}).get('datalink') if  ((prop.get('value',{})or{}).get('unit',{}) or {}).get('datalink') else ((prop.get('value',{})or{}).get('unit',{}) or {}).get('_id')
                                    }
                                # внутренний объем(количество в штуках)
                                if str(prop.get('datalink')) == str(datamodel.SYSTEM_OBJECTS['AMOUNT_PROP']):
                                    vol_count = {
                                        'value': (prop.get('value',{})or{}).get('value'),
                                        'unit': ((prop.get('value',{})or{}).get('unit',{}) or {}).get('name'),
                                        'unit_origin_id':  ((prop.get('value',{})or{}).get('unit',{}) or {}).get('datalink') if  ((prop.get('value',{})or{}).get('unit',{}) or {}).get('datalink') else ((prop.get('value',{})or{}).get('unit',{}) or {}).get('_id')
                                    }

                            key = data['node'].get('number') + '_' +row['node'].get('number','')+'_' + str((vol_count or {}).get('value',''))+'_' + str(( row['count'] or  {}).get('value',''))

                            if not key in print_data:
                                print_data[key] = {
                                    'vol_tolerance': vol_tolerance,
                                    'tolerance_on_vol': tolerance_on_vol,
                                    'vol_per_unit': vol_per_unit,
                                    'vol_count': vol_count,
                                    'parent': data['node'],
                                    'count': row['count'],
                                    'node': row['node']}

        print_data = print_data.values()
        rowIndex = 1
        for row in print_data:
            ws.write(rowIndex,0, row['node'].get('number',''),style1)
            ws.write(rowIndex,1, row['node']['name'],style1)
            ws.write(rowIndex,2, row['count']['value'],style1)
            ws.write(rowIndex,3, row['count']['unit'],style1)
            ws.write(rowIndex,4, row['vol_per_unit']['value'] if row['vol_per_unit'] else '',style1)
            ws.write(rowIndex,5, row['vol_per_unit']['unit'] if row['vol_per_unit'] else '',style1)
            ws.write(rowIndex,6, row['vol_count']['value'] if row['vol_count'] else '',style1)
            ws.write(rowIndex,7, row['vol_count']['unit'] if row['vol_count'] else '',style1)
            ws.write(rowIndex,8, row['vol_tolerance']['value'] if row['vol_tolerance'] else '',style1)
            ws.write(rowIndex,9, row['vol_tolerance']['unit'] if row['vol_tolerance'] else '',style1)
            ws.write(rowIndex,10, row['tolerance_on_vol']['value'] if row['tolerance_on_vol'] else '',style1)
            ws.write(rowIndex,11, row['tolerance_on_vol']['unit'] if row['tolerance_on_vol'] else '',style1)
            ws.write(rowIndex,12, row['parent'].get('number'),style1)
            ws.write(rowIndex,13, row['parent'].get('name'),style1)
            rowIndex+=1

        # rowIndex = 1
        # for data in result_data:
        #   for model in data.get('models',[]):
        #     items = []
        #     get_model_items(model,[], items)
        #     if items and len(items)>0:
        #       for row in items:
        #         if row['node'].get('is_buy'):
        #           vol_tolerance = None
        #           tolerance_on_vol = None
        #           vol_per_unit = None
        #           vol_count = None

        #           for prop in row['properties']:
        #             # объем допуска
        #             if str(prop.get('datalink')) == str(datamodel.SYSTEM_OBJECTS['VOL_TOLERANCE_PROP']):
        #               vol_tolerance = {
        #                 'value': (prop.get('value',{})or{}).get('value'),
        #                 'unit': ((prop.get('value',{})or{}).get('unit',{}) or {}).get('name'),
        #                 'unit_origin_id':  ((prop.get('value',{})or{}).get('unit',{}) or {}).get('datalink') if  ((prop.get('value',{})or{}).get('unit',{}) or {}).get('datalink') else ((prop.get('value',{})or{}).get('unit',{}) or {}).get('_id')
        #               }
        #             if str(prop.get('datalink')) == str(datamodel.SYSTEM_OBJECTS['TOLERANCE_ON_VOL_PROP']):
        #               tolerance_on_vol = {
        #                 'value': (prop.get('value',{})or{}).get('value'),
        #                 'unit': ((prop.get('value',{})or{}).get('unit',{}) or {}).get('name'),
        #                 'unit_origin_id':  ((prop.get('value',{})or{}).get('unit',{}) or {}).get('datalink') if  ((prop.get('value',{})or{}).get('unit',{}) or {}).get('datalink') else ((prop.get('value',{})or{}).get('unit',{}) or {}).get('_id')
        #               }
        #             # объем на 1 штуку
        #             if str(prop.get('datalink')) == str(datamodel.SYSTEM_OBJECTS['VOL_PER_UNIT_PROP']):
        #               vol_per_unit = {
        #                 'value': (prop.get('value',{})or{}).get('value'),
        #                 'unit': ((prop.get('value',{})or{}).get('unit',{}) or {}).get('name'),
        #                 'unit_origin_id':  ((prop.get('value',{})or{}).get('unit',{}) or {}).get('datalink') if  ((prop.get('value',{})or{}).get('unit',{}) or {}).get('datalink') else ((prop.get('value',{})or{}).get('unit',{}) or {}).get('_id')
        #               }
        #             # внутренний объем(количество в штуках)
        #             if str(prop.get('datalink')) == str(datamodel.SYSTEM_OBJECTS['AMOUNT_PROP']):
        #               vol_count = {
        #                 'value': (prop.get('value',{})or{}).get('value'),
        #                 'unit': ((prop.get('value',{})or{}).get('unit',{}) or {}).get('name'),
        #                 'unit_origin_id':  ((prop.get('value',{})or{}).get('unit',{}) or {}).get('datalink') if  ((prop.get('value',{})or{}).get('unit',{}) or {}).get('datalink') else ((prop.get('value',{})or{}).get('unit',{}) or {}).get('_id')
        #               }

        #           ws.write(rowIndex,0, row['node'].get('number',''),style1)
        #           ws.write(rowIndex,1, row['node']['name'],style1)
        #           ws.write(rowIndex,2, row['count']['value'],style1)
        #           ws.write(rowIndex,3, row['count']['unit'],style1)
        #           ws.write(rowIndex,4, vol_per_unit['value'] if vol_per_unit else '',style1)
        #           ws.write(rowIndex,5, vol_per_unit['unit'] if vol_per_unit else '',style1)
        #           ws.write(rowIndex,6, vol_count['value'] if vol_count else '',style1)
        #           ws.write(rowIndex,7, vol_count['unit'] if vol_count else '',style1)
        #           ws.write(rowIndex,8, vol_tolerance['value'] if vol_tolerance else '',style1)
        #           ws.write(rowIndex,9, vol_tolerance['unit'] if vol_tolerance else '',style1)
        #           ws.write(rowIndex,10, tolerance_on_vol['value'] if tolerance_on_vol else '',style1)
        #           ws.write(rowIndex,11, tolerance_on_vol['unit'] if tolerance_on_vol else '',style1)
        #           ws.write(rowIndex,12, data['node'].get('number'),style1)
        #           ws.write(rowIndex,13, data['node'].get('name'),style1)
        #           ws.write(rowIndex,14, str(data['node'].get('_id')),style1)
        #           rowIndex+=1
        wb.save(output)
        output.seek(0)
        return output.read()

    except Exception, exc:
        print('Error! Get stats esud.' + str(exc))
        excType = exc.__class__.__name__
        print_exc()
        return {'status':'error', 'msg':'Esud stat error. Msg: '+ str(exc)}

@get('/stats/specification/upload')
def get_stats_specifications():
    '''
    #Выгрузка спецификаций в формате JSON по заданным входным параметрам
    #key="55b8a05af43f967a0af5169a"
    #category = [new, all, changed]
    #numbers = 001.001.001;001.001.002
  '''

    try:
        params = request.query.decode()
        if params.get('key')!='55b8a05af43f967a0af5169a':
            return {'status':'error', 'msg':'Invalid key'}

        # категория данных
        category = params.get('category') if params.get('category') else "all"
        numbers = params.get('numbers','').split(";");

        from models import datamodel
        from models import specificationmodel
        from handlers.esud import esudhandler
        from apis.esud import esudspecificationapi
        from handlers.esud import productionorderhandler
        import math

        # получение списка всех спецификаций без структуры
        data_dict= {}
        all_used_specifications = []
        all_used_specifications_dict = {}
        result = []
        condition = {}
        to_update = []

        if len(numbers)>0 and numbers[0]!='':
            condition['number'] = {'$in':numbers}
        else:
            if category == 'new':
                condition['$or'] = [{'last_upload_date': None}, {'last_upload_date': {'$exists':False}}]
            elif category == 'changed':
                condition['$or'] = [
                    {'last_upload_date': None},
                    {'last_upload_date': {'$exists':False}},
                    {'last_change.date': {'$gte': 'last_upload_date'} }
                ]
            else:
                condition = None

        data = specificationmodel.get_list_by(condition, {
            '_id' : 1,
            'name' : 1,
            'count' : 1,
            'number' :1,
            'config_number' :1,
            'is_buy' : 1,
            'specification_key_hash' : 1,
            'last_change': 1,
            'last_upload_date': 1,
            'first_level_items': 1,
            'vol_tolerance': 1,
            'tolerance_on_vol': 1,
            'count': 1
        })

        # сбор спецификаций в dictionary

        include_ids = [] # список всех идентификаторов задействованных спецификаций
        if data:
            for row in data:
                data_dict[row['number']] = row
                tmp_include_ids = [i['_id'] for i in row.get('first_level_items',[]) ]
                tmp_include_ids.append(row['_id'])
                include_ids.extend(tmp_include_ids)


        # сбор всех задействованных в итоговом списке спецификаций
        all_used_specifications = specificationmodel.get_list_by({'_id': {'$in': include_ids} }, {
            '_id' : 1,
            'number' :1,
            'config_number' :1,
            'is_buy' : 1,
            'specification_key_hash' : 1,
            'last_change': 1,
            'last_upload_date': 1,
            'vol_tolerance': 1,
            'tolerance_on_vol': 1
        })
        for row in all_used_specifications:
            all_used_specifications_dict[row['number']] = row

        for number in data_dict:
            to_update.append(number)
            row = data_dict[number];
            tmp_el = {
                'info':{
                    'id': str(row['_id']),
                    'hash': row['specification_key_hash'],
                    'number': row['number'],
                    'config_number': row['config_number'],
                    'name': row['name'],
                    'type': 'buy' if row.get('is_buy') else 'own',
                    'date_change': (row.get('last_change',{}) or {}).get('date'),
                    'change_by': (row.get('last_change',{}) or {}).get('user'),
                    'unit': row['count']['unit']
                },
                'children':[]
            }

            for child in row.get('first_level_items',[]):
                child_row = all_used_specifications_dict.get(child['number'],None)
                # объем допуска (невозвратный отход)
                #vol_tolerance = esudproductionorderapi.claculate_vol_tolerance(child_row)
                vol_tolerance = routine.strToFloat(child['vol_tolerance'].get('value',0))
                tmp_el['children'].append({
                    'id': str(child['_id']),
                    'hash': child['specification_key_hash'],
                    'number': child['number'],
                    'name': child['name'],
                    'type': 'buy' if child_row.get('is_buy') else 'own',
                    'date_change': (child_row.get('last_change',{}) or {}).get('date'),
                    'change_by': (child_row.get('last_change',{}) or {}).get('user'),
                    'count': {
                        'value': (child.get('count',{}) or {}).get('value',0)+vol_tolerance,
                        'unit': (child.get('count',{}) or {}).get('unit')
                    },
                })

            result.append(tmp_el)


        # сбор конфигураций
        result_with_configs = {}
        if len(result)>0:
            for row in result:
                if row['info']['config_number'] not in result_with_configs:
                    result_with_configs[row['info']['config_number']] = {
                        'info':{'name': '', 'number': row['info']['config_number'], 'unit': row['info']['unit']},
                        'children': []
                    }
                result_with_configs[row['info']['config_number']]['children'].append(row)

            # получить список конфигураций
            config_list = datamodel.get_list_by({'number': {'$in': result_with_configs.keys()}, 'datalink':None, 'status':{'$ne':'del'} }, {'number':1, 'name':1})
            for row in config_list:
                result_with_configs[row['number']]['info']['name'] = row['name']


            upload_date = datetime.datetime.utcnow()
            specificationmodel.update_multy({'number':{'$in':to_update}}, {'last_upload_date': upload_date})

        return routine.JSONEncoder().encode({'status': 'ok', 'data':result_with_configs.values() })
    except Exception, exc:
        print('Error! Get stats esud.' + str(exc))
        excType = exc.__class__.__name__
        print_exc()
        return {'status':'error', 'msg':'Upload specifications. Msg: '+ str(exc)}


@get('/stats/specification/report1')
def get_stats_specifications_report1():
    '''
    #Выгрузка всех спецификаций
  '''

    userlib.check_page_access('stats','r')
    response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=UTF-8'
    response.headers['Content-Type'] = 'application/vnd.ms-excel'
    response.headers['Content-Disposition'] = 'attachment; filename=get_stats_specifications_report1' +datetime.datetime.utcnow().strftime('%d_%m_%Y_%H_%M_%S')+'.xls'

    try:
        result = []
        from models import specificationmodel
        from helpers.google_api import drive
        from xlrd import open_workbook
        from xlutils.copy import copy as wbcopy
        from xlwt import Workbook, XFStyle, Alignment, Font
        usr = userlib.get_cur_user()

        #Генерация XLS файла
        import StringIO
        output = StringIO.StringIO()
        wb = Workbook(encoding='utf-8')
        ws = wb.add_sheet('Data')
        # styles
        al1 = Alignment()
        al1.horz = Alignment.HORZ_LEFT
        al1.vert = Alignment.VERT_TOP
        al1.wrap = Alignment.WRAP_AT_RIGHT
        font = Font()
        font.bold = True
        style1 = XFStyle()
        style1.alignment = al1
        style_header = XFStyle()
        style_header.alignment = al1
        style_header.font = font
        date_format = XFStyle()
        date_format.num_format_str = 'dd/mm/yyyy'
        datetime_format = XFStyle()
        datetime_format.num_format_str = 'dd/mm/yyyy HH:MM'

        #set header------------
        ws.write(0,0, u"Артикул".encode("utf-8"),style_header)
        ws.write(0,1, u"Название".encode("utf-8"),style_header)
        ws.write(0,2, u"Покупное".encode("utf-8"),style_header)
        ws.write(0,3, u"Инд. х-ки".encode("utf-8"),style_header)
        ws.write(0,4, u"Участок".encode("utf-8"),style_header)
        ws.write(0,5, u"Примечание".encode("utf-8"),style_header)
        ws.write(0,6, u"Дата создания".encode("utf-8"),style_header)
        ws.write(0,7, u"Создал".encode("utf-8"),style_header)

        ws.col(0).width = 256 * 15 # артикул
        ws.col(1).width = 256 * 50 # название
        ws.col(2).width = 256 * 10 # название

        ws.col(3).width = 256 * 50 # Инд. х-ки
        ws.col(4).width = 256 * 30 # участок
        ws.col(5).width = 256 * 40 # примечание
        ws.col(6).width = 256 * 15 # дата создания
        ws.col(7).width = 256 * 15 # создал

        data = specificationmodel.get_list_by(None, {'number':1, 'name': 1, 'history': 1, 'properties': 1, 'note':1, 'deep': 1, 'descendant_count':1, 'child_count':1, 'sector':1, 'is_buy': 1})

        # sort data by deep and name
        data.sort(key = lambda x: (x['deep'], x['number']))
        rowIndex = 1
        for row in data:
            unique_props_str = ""
            sector = row['sector']['name'] if row['sector'] else ''
            for prop in row['properties']:
                if prop.get('is_optionsl') and not prop.get('is_techno'):
                    unique_props_str+="{0}: {1} {2}".format(prop['name'], prop['value'], prop['unit'] if prop['unit']!='?' else '' )
            ws.write(rowIndex,0, row['number'],style1)
            ws.write(rowIndex,1, row['name'],style1)
            ws.write(rowIndex,2, 'да' if row['is_buy'] else 'нет',style1)
            ws.write(rowIndex,3, unique_props_str,style1)
            ws.write(rowIndex,4, sector,style1)
            ws.write(rowIndex,5, row['note'],style1)
            ws.write(rowIndex,6, row['history'][0]['date'] + datetime.timedelta(hours=routine.moscow_tz_offset) if row['history'][0]['date'] else None,date_format)
            ws.write(rowIndex,7, row['history'][0]['user'],style1)
            rowIndex+=1

        wb.save(output)
        output.seek(0)
        return output.read()

    except Exception, exc:
        print('Error! stats get_stats_specifications_report1.' + str(exc))
        excType = exc.__class__.__name__
        print_exc()
        return {'status':'error', 'msg':'Get stats specifications. Msg: '+ str(exc)}


@get('/stats/specification/report2')
def get_stats_specifications_report2():
    '''
    #964
    #Выгрузка тех процессов по спецификациям
  '''

    from apis.esud import shifttaskapi

    userlib.check_page_access('stats','r')
    response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=UTF-8'
    response.headers['Content-Type'] = 'application/vnd.ms-excel'
    response.headers['Content-Disposition'] = 'attachment; filename=get_stats_specifications_report2' +datetime.datetime.utcnow().strftime('%d_%m_%Y_%H_%M_%S')+'.xls'

    try:
        result = []

        from models import specificationmodel, datamodel
        from xlrd import open_workbook
        from xlutils.copy import copy as wbcopy
        from xlwt import Workbook, XFStyle, Alignment, Font
        usr = userlib.get_cur_user()

        #Генерация XLS файла
        import StringIO
        output = StringIO.StringIO()
        wb = Workbook(encoding='utf-8')
        ws = wb.add_sheet('Data')
        # styles
        al1 = Alignment()
        al1.horz = Alignment.HORZ_LEFT
        al1.vert = Alignment.VERT_TOP
        al1.wrap = Alignment.WRAP_AT_RIGHT
        font = Font()
        font.bold = True
        style1 = XFStyle()
        style1.alignment = al1
        style_header = XFStyle()
        style_header.alignment = al1
        style_header.font = font
        date_format = XFStyle()
        date_format.num_format_str = 'dd/mm/yyyy'
        datetime_format = XFStyle()
        datetime_format.num_format_str = 'dd/mm/yyyy HH:MM'

        #set header------------
        ws.write(0,0, u"Артикул".encode("utf-8"),style_header)
        ws.write(0,1, u"Название".encode("utf-8"),style_header)
        ws.write(0,2, u"Этап ТП".encode("utf-8"),style_header)
        ws.write(0,3, u"Название ТП".encode("utf-8"),style_header)
        ws.write(0,4, u"Время выполнения, ММ:СС".encode("utf-8"),style_header)
        ws.write(0,5, u"Количество применений".encode("utf-8"),style_header)
        ws.write(0,6, u"Время с учетом количества, ММ:СС".encode("utf-8"),style_header)

        ws.col(0).width = 256 * 15 # артикул
        ws.col(1).width = 256 * 40 # название
        ws.col(2).width = 256 * 30 # Этап ТП (номер в иерархии)
        ws.col(3).width = 256 * 40 # Название ТП
        ws.col(4).width = 256 * 25 # Время выполнения
        ws.col(5).width = 256 * 25 # Количество применений
        ws.col(6).width = 256 * 25 # Количество применений

        #data = specificationmodel.get_list_by({'tech_process_operations':{'$exists': True}, '$where': 'this.tech_process_operations.length > 0' }, {'number':1, 'name': 1, 'deep': 1, 'tech_process_operations': 1})
        data = specificationmodel.get_list_by({'tech_process_operations':{'$exists': True}}, {'number':1, 'name': 1, 'deep': 1, 'tech_process_operations': 1})

        # sort data by deep and name
        data.sort(key = lambda x: (x['deep'], x['number']))
        rowIndex = 1

        for row in data:
            if row['tech_process_operations']:
                # раскладываем тех/ процессы в линию
                row['tech_process_operations'] = shifttaskapi.extract_processes(routine.JSONDecode(row['tech_process_operations']))

                row['tech_process_operations'].sort(key = lambda x:(x.get('level',0)))
                max_process_level = 0
                for process in row['tech_process_operations']:
                    if routine.strToInt(process.get('level',0))>max_process_level:
                        max_process_level = routine.strToInt(process.get('level',0))
                max_process_level+=1

                for process in row['tech_process_operations']:
                    ws.write(rowIndex,0, row['number'],style1)
                    ws.write(rowIndex,1, row['name'],style1)
                    ws.write(rowIndex,2, max_process_level - routine.strToInt(process.get('level',0)) ,style1)
                    ws.write(rowIndex,3, process.get('name','') ,style1)

                    execution_count = 0
                    execution_time = 0
                    if 'execution_count' in process:
                        execution_count = routine.strToFloat(process['execution_count']['value'] )
                    if  'execution_time' in process and execution_count:
                        execution_time = routine.strToFloat(process['execution_time']['value'])
                    # если измерение времени в секундах, то приводим его в минуты
                    if 'execution_time' in process and str(process['execution_time']['unit_origin_id']) == str(datamodel.SYSTEM_OBJECTS['MIN_UNIT']):
                        execution_time = float(execution_time)*60

                    ws.write(rowIndex,4, time.strftime("%M:%S", time.gmtime(execution_time)) ,style1)
                    ws.write(rowIndex,5, execution_count ,style1)
                    ws.write(rowIndex,6, time.strftime("%M:%S", time.gmtime(execution_time*execution_count)) ,style1)

                    rowIndex+=1

        wb.save(output)
        output.seek(0)
        return output.read()

    except Exception, exc:
        print('Error! stats get_stats_specifications_report2.' + str(exc))
        excType = exc.__class__.__name__
        print_exc()
        return {'status':'error', 'msg':'Get stats specifications. Msg: '+ str(exc)}



@get('/stats/crm/documentsreport')
def get_stats_documents_report():
    '''
    #673, Документы - Владелец подкаталога в CRM на гугл-диске
  '''
    userlib.check_page_access('stats','r')
    response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=UTF-8'
    response.headers['Content-Type'] = 'application/vnd.ms-excel'
    response.headers['Content-Disposition'] = 'attachment; filename=crm_stat_documentsowner' +datetime.datetime.utcnow().strftime('%d_%m_%Y_%H_%M_%S')+'.xls'

    try:
        result = []
        from helpers.google_api import drive
        from xlrd import open_workbook
        from xlutils.copy import copy as wbcopy
        from xlwt import Workbook, XFStyle, Alignment, Font
        usr = userlib.get_cur_user()

        #Генерация XLS файла
        import StringIO
        output = StringIO.StringIO()
        wb = Workbook(encoding='utf-8')
        ws = wb.add_sheet('Data')
        # styles
        al1 = Alignment()
        al1.horz = Alignment.HORZ_LEFT
        al1.vert = Alignment.VERT_TOP
        al1.wrap = Alignment.WRAP_AT_RIGHT
        font = Font()
        font.bold = True
        style1 = XFStyle()
        style1.alignment = al1
        style_header = XFStyle()
        style_header.alignment = al1
        style_header.font = font
        date_format = XFStyle()
        date_format.num_format_str = 'dd/mm/yyyy'
        datetime_format = XFStyle()
        datetime_format.num_format_str = 'dd/mm/yyyy HH:MM'
        #set header------------
        ws.write(0,0, u"Название".encode("utf-8"),style_header)
        ws.write(0,1, u"Имя владельца".encode("utf-8"),style_header)
        ws.write(0,2, u"Email владельца".encode("utf-8"),style_header)
        ws.write(0,3, u"Дата создания".encode("utf-8"),style_header)
        # columns width
        ws.col(0).width = 256 * 15 # название
        ws.col(1).width = 256 * 40 # имя владельца
        ws.col(2).width = 256 * 20 # email владельца
        ws.col(3).width = 256 * 15 # дата создания


        # Получить все каталоги в указанной дирректории
        folders = drive.get_folder_list(drive.get_service(usr['email']),config.orders_google_container_folder)
        #folders = drive.get_folder_list(usr['email'],"0B3_z3O8j2V1Dc0Z6Ui1CTkpGZkk")
        rowIndex = 1
        for row in folders:
            ws.write(rowIndex,0, row['title'],style1)
            ws.write(rowIndex,1, row['owners'][0]['displayName'],style1)
            ws.write(rowIndex,2, row['owners'][0]['emailAddress'],style1)
            ws.write(rowIndex,3, datetime.datetime.strptime(row['createdDate'], '%Y-%m-%dT%H:%M:%S.%fZ'),date_format)
            rowIndex+=1

        wb.save(output)
        output.seek(0)
        return output.read()

        #return routine.JSONEncoder().encode({'status': 'ok', 'data':result})

    except Exception, exc:
        print('Error! Get stats CRM documents owner.' + str(exc))
        excType = exc.__class__.__name__
        print_exc()
        return {'status':'error', 'msg':'Get stats CRM documents owner. Msg: '+ str(exc)}


@get('/stats/clients/vers3')
def get_stats_client_vers3():
    '''
  Статистика по Клиентам.
  Полная статистика по клиентам + связь с заявками в которых они уччаствуют
  '''
    from xlwt import Workbook, XFStyle, Alignment, Font
    from models import ordermodel, clientmodel
    import StringIO

    userlib.check_page_access('stats','r')

    response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=UTF-8'
    response.headers['Content-Type'] = 'application/vnd.ms-excel'
    response.headers['Content-Disposition'] = 'attachment; filename=crm_stat_' +datetime.datetime.utcnow().strftime('%d_%m_%Y_%H_%M_%S')+'.xls'
    try:
        result = {}
        # получение и формаирование данных
        # получение списка заявок
        data_orders = ordermodel.get_list(
            #{'client_id': ObjectId("549927599326a20003d61360")},
            # {'client_id': ObjectId("520dea467b53db2ccdecdc47")},
            None,
            {
                'number':1,
                'client_id':1,
                'history':1,
                'total_address':1,
                'total_montaz':1,
                'sq':1,
                'price':1,
                'added' : 1,
                "added_by" : 1,
                "manager" : 1,
                "close_date" : 1,
                "close_days_count" : 1,
                "closed" : 1,
                "condition" : 1,
                "condition_type" : 1,
                "f_state" : 1,
                "f_state_date" : 1,
                "l_state" : 1,
                "l_state_date" : 1,
                "manager": 1
            }
        )

        # группировка заявок по клиентам
        orders= {}
        for order in data_orders:
            # если есть история заявки
            if len(order.get('history',[]) or [])>0:
                for row in order['history']:
                    row['datetime'] = routine.strToDateTime(row['datetime'])
                # сортировка истории и получение последнего состояния
                order['history'].sort(key = lambda x: (x['datetime']))

            if str(order['client_id']) not in orders:
                orders[str(order['client_id'])] = []
            orders[str(order['client_id'])].append(order)

        #return routine.JSONEncoder().encode(orders)

        orders_result = {}
        for cli in orders:
            tmp = {
                'all_orders_count': len(orders[cli]),   # Заявок, всего, шт
                'all_orders_price': 0,      # Заявок, всего, руб
                'contract_orders_count': 0,   # Заявок, Договор, шт
                'contract_orders_price': 0,   # Заявок, Договор, руб
                'cancel_orders_count': 0,   # Заявок, Отказ, шт
                'cancel_orders_price': 0,   # Заявок, Отказ, руб
                'sleep_orders_count': 0,    # Заявок, Сон, шт
                'sleep_orders_price': 0,    # Заявок, Сон, руб
                'work_orders_count': 0,   # Заявок, Работа, шт
                'work_orders_price': 0,   # Заявок, Работа, руб
                'first_order_date': None,   # Дата первой заявки
                'last_order_date': None,    # Дата посл. заявки
                'last_contact_date': None,    # Дата посл. контакта
                'all_managers': {},     # Менеджер, всего
                'last_manager': ''      # Менеджер, последний
            }

            first_order = orders[cli][0] if len(orders[cli])>0 else None
            last_order = orders[cli][len(orders[cli])-1] if len(orders[cli])>0 else None

            if first_order:
                tmp['first_order_date'] = first_order['added']
            if last_order:
                tmp['last_order_date'] = last_order['added']
                tmp['last_manager'] = last_order['manager']
                tmp['last_contact_date'] = last_order['l_state_date']

            for order in orders[cli]:
                tmp['all_orders_price'] += routine.strToFloat(order.get('price',0))
                if order['l_state'] ==window.ORDER_CONDITIONS['CONTRACT_SIGN']:
                    tmp['contract_orders_count'] += 1
                    tmp['contract_orders_price'] += routine.strToFloat(order.get('price',0))
                if order['l_state'] ==window.ORDER_CONDITIONS['REFUSE']:
                    tmp['cancel_orders_count'] += 1
                    tmp['cancel_orders_price'] += routine.strToFloat(order.get('price',0))
                if order['l_state'] ==window.ORDER_CONDITIONS['SLEEP']:
                    tmp['sleep_orders_count'] += 1
                    tmp['sleep_orders_price'] += routine.strToFloat(order.get('price',0))
                if order['condition_type'] ==u"промежуточное":
                    tmp['work_orders_count'] += 1
                    tmp['work_orders_price'] += routine.strToFloat(order.get('price',0))

                # if not tmp['first_order_date'] or (order['f_state_date'] and tmp['first_order_date']>order['f_state_date'] ):
                #   tmp['first_order_date'] = order['f_state_date']
                # if not tmp['last_order_date'] or (order['l_state_date'] and tmp['last_order_date']<order['l_state_date'] ):
                #   tmp['last_order_date'] = order['l_state_date']
                #   tmp['last_manager'] = order['manager']

                if order.get('history'):
                    for row in order['history']:
                        if row['manager'] not in tmp['all_managers']:
                            tmp['all_managers'][row['manager']] = row['manager']
            orders_result[cli] = tmp

        #return routine.JSONEncoder().encode(orders_result)

        # получение списка клиентов
        # data_clients = clientmodel.get_list({'_id': ObjectId("549927599326a20003d61360")},None)
        # data_clients = clientmodel.get_list({'_id': ObjectId("520dea467b53db2ccdecdc47")},None)
        data_clients = clientmodel.get_list(None,None)

        # сбор всех клиентов в dictionary
        clients = {}
        for cl in data_clients:
            contacts_email_count = 0
            contacts_phone_count = 0
            contacts_without_email_and_phone_count = 0
            contacts_with_email_and_phone_count = 0

            for contact in cl.get('contacts', []):
                if (not 'email' in contact and not 'phone' in contact) or ( len(contact.get('email',[]) or []) ==0 and  len(contact.get('phone',[]) or []) ==0):
                    contacts_without_email_and_phone_count+=1
                if ('email' in contact  and  len(contact.get('email',[]) or []) >0) and (not 'phone' in contact or len(contact.get('phone',[]) or []) ==0):
                    contacts_email_count+=1
                if ('phone' in contact  and  len(contact.get('phone',[]) or []) >0) and (not 'email' in contact or len(contact.get('email',[]) or []) ==0):
                    contacts_phone_count+=1
                if 'email' in contact and 'phone' in contact and len(contact.get('email',[]) or []) >0 and  len(contact.get('phone',[]) or []) >0:
                    contacts_with_email_and_phone_count+=1

            result[str(cl['_id'])] = {
                '_id': cl['_id'],
                'group': cl.get('group',''),
                'base_group': cl.get('base_group'),   # основной в группе
                'type': cl.get('type',''),      # форма организации
                'name': cl.get('name',''),
                'site': cl.get('site',''),
                'wherefind': cl.get('wherefind',''),
                'firstcontact': cl.get('firstcontact',''),
                'added': routine.strToDateTime(cl.get('added')) if isinstance(cl.get('added'), basestring) else cl.get('added'),
                'modified': routine.strToDateTime(cl.get('modified')) if isinstance(cl.get('modified'), basestring) else cl.get('modified'),
                'all_contacts_count': len(cl.get('contacts', [])),
                'contacts_email_count': contacts_email_count,
                'contacts_phone_count': contacts_phone_count,
                'contacts_without_email_and_phone_count': contacts_without_email_and_phone_count,
                'contacts_with_email_and_phone_count': contacts_with_email_and_phone_count,
                'is_cl': True if cl.get('cl','') == 'cl' else False
            }

        # мержинг клиентов и заявок
        for client_id in result:
            result[client_id]['order'] = orders_result.get(client_id)

        #return routine.JSONEncoder().encode(result.values())

        #Генерация XLS файла
        output = StringIO.StringIO()
        wb = Workbook(encoding='utf-8')
        ws = wb.add_sheet('Data')
        # styles
        al1 = Alignment()
        al1.vert = Alignment.VERT_TOP
        al1.wrap = Alignment.WRAP_AT_RIGHT
        al1.horz = Alignment.HORZ_LEFT
        font = Font()
        font.bold = True
        style1 = XFStyle()
        style1.alignment = al1
        style_header = XFStyle()
        style_header.alignment = al1
        style_header.font = font
        date_format = XFStyle()
        date_format.num_format_str = 'dd/mm/yyyy'
        datetime_format = XFStyle()
        datetime_format.num_format_str = 'dd/mm/yyyy HH:MM'

        #set header------------
        ws.write(0,0, u"ID".encode("utf-8"),style_header)
        ws.write(0,1, u"Группа клиентов".encode("utf-8"),style_header)
        ws.write(0,2, u"Звезда в руппе".encode("utf-8"),style_header)
        ws.write(0,3, u"Форма организации".encode("utf-8"),style_header)
        ws.write(0,4, u"Название".encode("utf-8"),style_header)
        ws.write(0,5, u"Сайт".encode("utf-8"),style_header)
        ws.write(0,6, u"Откуда узнали".encode("utf-8"),style_header)
        ws.write(0,7, u"Первый контакт".encode("utf-8"),style_header)
        ws.write(0,8, u"Дата создания в БД".encode("utf-8"),style_header)
        ws.write(0,9, u"Дата посл. изменения".encode("utf-8"),style_header)
        ws.write(0,10, u"Контакты, кол-во, всего".encode("utf-8"),style_header)
        ws.write(0,11, u"Контакты, кол-во, только e-mail".encode("utf-8"),style_header)
        ws.write(0,12, u"Контакты, кол-во, только телефон".encode("utf-8"),style_header)
        ws.write(0,13, u"Контакты, кол-во, e-mail и телефон".encode("utf-8"),style_header)
        ws.write(0,14, u"Контакты, кол-во, без e-mail и телефона".encode("utf-8"),style_header)
        ws.write(0,15, u"Заявок, всего, шт".encode("utf-8"),style_header)
        ws.write(0,16, u"Заявок, всего, руб".encode("utf-8"),style_header)
        ws.write(0,17, u"Заявок, Договор, шт".encode("utf-8"),style_header)
        ws.write(0,18, u"Заявок, Договор, руб".encode("utf-8"),style_header)
        ws.write(0,19, u"Заявок, Отказ, шт".encode("utf-8"),style_header)
        ws.write(0,20, u"Заявок, Отказ, руб".encode("utf-8"),style_header)
        ws.write(0,21, u"Заявок, Сон, шт".encode("utf-8"),style_header)
        ws.write(0,22, u"Заявок, Сон, руб".encode("utf-8"),style_header)
        ws.write(0,23, u"Заявок, Работа, шт".encode("utf-8"),style_header)
        ws.write(0,24, u"Заявок, Работа, руб".encode("utf-8"),style_header)
        ws.write(0,25, u"Дата первой заявки".encode("utf-8"),style_header)
        ws.write(0,26, u"Дата посл. заявки".encode("utf-8"),style_header)
        ws.write(0,27, u"Дата посл. контакта".encode("utf-8"),style_header)
        ws.write(0,28, u"Менеджер, всего".encode("utf-8"),style_header)
        ws.write(0,29, u"Менеджер, последний".encode("utf-8"),style_header)
        ws.write(0,30, u"ч-л".encode("utf-8"),style_header)

        # columns width
        ws.col(0).width = 256 * 20 # ID
        ws.col(1).width = 256 * 20 # Группа клиентов
        ws.col(2).width = 256 * 20 # Звезда в руппе
        ws.col(3).width = 256 * 20 # Форма организации
        ws.col(4).width = 256 * 25 # Название
        ws.col(5).width = 256 * 25 # Сайт
        ws.col(6).width = 256 * 20 # Откуда узнали
        ws.col(7).width = 256 * 20 # Первый контакт
        ws.col(8).width = 256 * 20 # Дата создания в БД
        ws.col(9).width = 256 * 20 # Дата посл. изменения
        ws.col(10).width = 256 * 20 # Контакты, кол-во, всего
        ws.col(11).width = 256 * 20 # Контакты, кол-во, только e-mail
        ws.col(12).width = 256 * 20 # Контакты, кол-во, только телефон
        ws.col(13).width = 256 * 20 # Контакты, кол-во, e-mail и телефон
        ws.col(14).width = 256 * 20 # Контакты, кол-во, без e-mail и телефона
        ws.col(15).width = 256 * 20 # Заявок, всего, шт
        ws.col(16).width = 256 * 20 # Заявок, всего, руб
        ws.col(17).width = 256 * 20 # Заявок, Договор, шт
        ws.col(18).width = 256 * 20 # Заявок, Договор, руб
        ws.col(19).width = 256 * 20 # Заявок, Отказ, шт
        ws.col(20).width = 256 * 20 # Заявок, Отказ, руб
        ws.col(21).width = 256 * 20 # Заявок, Сон, шт"
        ws.col(22).width = 256 * 20 # Заявок, Сон, руб
        ws.col(23).width = 256 * 20 # Заявок, Работа, шт
        ws.col(24).width = 256 * 20 # Заявок, Работа, руб
        ws.col(25).width = 256 * 20 # Дата первой заявки
        ws.col(26).width = 256 * 20 # Дата посл. заявки
        ws.col(27).width = 256 * 20 # Дата посл. контакта
        ws.col(28).width = 256 * 20 # Менеджер, всего
        ws.col(29).width = 256 * 25 # Менеджер, последний
        ws.col(30).width = 256 * 10 # ч-л

        rowIndex = 1
        for row in result.values():
            ws.write(rowIndex,0, str(row['_id']), style1)
            ws.write(rowIndex,1, row['group'], style1)
            ws.write(rowIndex,2, 'yes' if row['base_group'] =='yes' else '', style1)
            ws.write(rowIndex,3, row['type'], style1)
            ws.write(rowIndex,4, row['name'], style1)
            ws.write(rowIndex,5, row['site'], style1)
            ws.write(rowIndex,6, row['wherefind'], style1)
            ws.write(rowIndex,7, row['firstcontact'], style1)
            ws.write(rowIndex,8, row['added'] + datetime.timedelta(hours=routine.moscow_tz_offset) if row['added'] else None, datetime_format)
            ws.write(rowIndex,9, row['modified'] + datetime.timedelta(hours=routine.moscow_tz_offset) if row['modified'] else None, datetime_format)
            ws.write(rowIndex,10, row['all_contacts_count'], style1)
            ws.write(rowIndex,11, row['contacts_email_count'] , style1)
            ws.write(rowIndex,12, row['contacts_phone_count'], style1)
            ws.write(rowIndex,13, row['contacts_with_email_and_phone_count'], style1)
            ws.write(rowIndex,14, row['contacts_without_email_and_phone_count'], style1)
            if row['order']:
                ws.write(rowIndex,15, row['order']['all_orders_count'], style1)
                ws.write(rowIndex,16, row['order']['all_orders_price'], style1)
                ws.write(rowIndex,17, row['order']['contract_orders_count'], style1)
                ws.write(rowIndex,18, row['order']['contract_orders_price'], style1)
                ws.write(rowIndex,19, row['order']['cancel_orders_count'], style1)
                ws.write(rowIndex,20, row['order']['cancel_orders_price'], style1)
                ws.write(rowIndex,21, row['order']['sleep_orders_count'], style1)
                ws.write(rowIndex,22, row['order']['sleep_orders_price'], style1)
                ws.write(rowIndex,23, row['order']['work_orders_count'], style1)
                ws.write(rowIndex,24, row['order']['work_orders_price'], style1)
                ws.write(rowIndex,25, row['order']['first_order_date'] + datetime.timedelta(hours=routine.moscow_tz_offset) if row['order']['first_order_date'] else None, datetime_format)
                ws.write(rowIndex,26, row['order']['last_order_date'] + datetime.timedelta(hours=routine.moscow_tz_offset) if row['order']['last_order_date'] else None, datetime_format)
                ws.write(rowIndex,27, row['order']['last_contact_date'] + datetime.timedelta(hours=routine.moscow_tz_offset) if row['order']['last_contact_date'] else None, datetime_format)
                ws.write(rowIndex,28, len(row['order']['all_managers']), style1)
                ws.write(rowIndex,29, row['order']['last_manager'], style1)
            ws.write(rowIndex,30, '1' if row['is_cl'] else '', style1)
            rowIndex+=1
        wb.save(output)
        output.seek(0)
        return output.read()

    except Exception, exc:
        print('Error! Get stats CRM(3).' + str(exc))
        excType = exc.__class__.__name__
        print_exc()
        return {'status':'error', 'msg':'Error! Msg: '+ str(exc)}


@get('/stats/materials/vers1')
def get_stats_materials_vers1():
    '''
  Статистика по материалам
  Группировка идет по индивидуальным характеристикам
  '''
    from xlwt import Workbook, XFStyle, Alignment, Font
    from models import materialsgroupmodel
    import StringIO

    userlib.check_page_access('stats','r')
    response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=UTF-8'
    response.headers['Content-Type'] = 'application/vnd.ms-excel'
    response.headers['Content-Disposition'] = 'attachment; filename=materials_stat_' +datetime.datetime.utcnow().strftime('%d_%m_%Y_%H_%M_%S')+'.xls'
    try:
        data_materials = materialsgroupmodel.get_list(None, {
            'code':1,
            'name':1,
            'materials.code':1,
            'materials.name':1,
            'materials.unique_props':1,
            'is_active':1,
            'materials.is_active':1,
            'materials.sku_name': 1,
            'materials.unit_purchase': 1,
            'materials.unit_pto': 1,
            'last_goods':1
        })

        data_materials.sort(key=lambda x:(x['name']))
        #Генерация XLS файла
        output = StringIO.StringIO()
        wb = Workbook(encoding='utf-8')
        ws = wb.add_sheet('Data')

        date_format = XFStyle()
        date_format.num_format_str = 'dd/mm/yyyy'
        datetime_format = XFStyle()
        datetime_format.num_format_str = 'dd/mm/yyyy HH:MM'

        # styles
        al1 = Alignment()
        al1.horz = Alignment.HORZ_LEFT
        al1.vert = Alignment.VERT_TOP
        # al1.wrap = Alignment.WRAP_AT_RIGHT
        font = Font()
        font.bold = True
        style1 = XFStyle()
        style1.alignment = al1
        style_header = XFStyle()
        style_header.alignment = al1
        style_header.font = font

        #set header------------
        ws.write(0,0, u"Артикул".encode("utf-8"),style_header)
        ws.write(0,1, u"Материал".encode("utf-8"),style_header)
        ws.write(0,2, u"Характеристика".encode("utf-8"),style_header)
        ws.write(0,3, u"Ед. изм. материала".encode("utf-8"),style_header) # unit_purchase
        ws.write(0,4, u"Код группы".encode("utf-8"),style_header)
        ws.write(0,5, u"Группа".encode("utf-8"),style_header)
        ws.write(0,6, u"Код материала".encode("utf-8"),style_header)
        ws.write(0,7, u"Код инд. х-ки.".encode("utf-8"),style_header)
        ws.write(0,8, u"ЕСХ".encode("utf-8"),style_header) # sku_name
        ws.write(0,9, u"ЕД. ПТО".encode("utf-8"),style_header) # unit_pto
        ws.write(0,10, u"Цена, последняя (без НДС)".encode("utf-8"),style_header)
        ws.write(0,11, u"Дата посл. закупки".encode("utf-8"),style_header)
        ws.write(0,12, u"Посл. счёт".encode("utf-8"),style_header)
        ws.write(0,13, u"Посл. товар, код".encode("utf-8"),style_header)
        ws.write(0,14, u"Посл. товар, коэф.".encode("utf-8"),style_header)

        # columns width
        ws.col(0).width = 256 * 20 # полный код
        ws.col(1).width = 256 * 30 # Материал
        ws.col(2).width = 256 * 60 # Ха-ка
        ws.col(3).width = 256 * 15 # Ед. изм материала
        ws.col(4).width = 256 * 15 # Код группы
        ws.col(5).width = 256 * 30 # Группа
        ws.col(6).width = 256 * 15 # Код материала
        ws.col(7).width = 256 * 15 # Код х-ки
        ws.col(8).width = 256 * 15 # ЕСХ
        ws.col(9).width = 256 * 15 # ЕД. ПТО
        ws.col(10).width = 256 * 15 # Цена, последняя (без НДС)
        ws.col(11).width = 256 * 15 # Дата посл. закупки
        ws.col(12).width = 256 * 15 # Посл. счёт
        ws.col(13).width = 256 * 15 # Посл. товар, код
        ws.col(14).width = 256 * 15 # Посл. товар, коэф.

        rowIndex = 1
        for group in data_materials:
            if 'materials' in group and len(group['materials'])>0:
                for material in group['materials']:
                    if 'unique_props' in material and len(material['unique_props'])>0:
                        for prop in material['unique_props']:
                            if material.get('is_active'):
                                full_key = '{0}.{1}.{2}'.format(str(group['code']), str(material['code']), str(prop['key']))
                                ws.write(rowIndex,0, full_key,style1)
                                ws.write(rowIndex,1, material['name'],style1)
                                ws.write(rowIndex,2, prop['name'],style1)
                                ws.write(rowIndex,3, material.get('sku_name'),style1)

                                ws.write(rowIndex,4, group['code'],style1)
                                ws.write(rowIndex,5, group['name'],style1)
                                ws.write(rowIndex,6, material['code'],style1)
                                ws.write(rowIndex,7, prop['key'],style1)

                                #ws.write(rowIndex,7, material.get('is_active'),style1)

                                ws.write(rowIndex,8, material.get('unit_purchase'),style1)
                                ws.write(rowIndex,9, material.get('unit_pto'),style1)

                                #  если есть информация о последней цене из 1С
                                if prop.get('last_goods'):
                                    ws.write(rowIndex, 10, prop['last_goods']['price'], style1)
                                    ws.write(rowIndex, 11, routine.strToDateTime(prop['last_goods']['date']),date_format)
                                    ws.write(rowIndex,12, prop['last_goods']['account'],style1)
                                    ws.write(rowIndex,13, prop['last_goods']['good_code_1c'],style1)
                                    ws.write(rowIndex,14, prop['last_goods']['coef_si_div_iu'], style1)
                                rowIndex+=1

                    elif material.get('is_active'):
                        full_key = '{0}.{1}'.format(str(group['code']), str(material['code']))
                        ws.write(rowIndex,0, full_key,style1)
                        ws.write(rowIndex,1, material['name'],style1)
                        ws.write(rowIndex,2, '',style1)
                        ws.write(rowIndex,3, material.get('sku_name'),style1)

                        ws.write(rowIndex,4, group['code'],style1)
                        ws.write(rowIndex,5, group['name'],style1)
                        ws.write(rowIndex,6, material['code'],style1)
                        ws.write(rowIndex,7, '',style1)

                        #ws.write(rowIndex,7, material.get('is_active'),style1)

                        ws.write(rowIndex,8, material.get('unit_purchase'),style1)
                        ws.write(rowIndex,9, material.get('unit_pto'),style1)
                        #  если есть информация о последней цене из 1С
                        if material.get('last_goods'):
                            ws.write(rowIndex, 10, material['last_goods']['price'], style1)
                            ws.write(rowIndex, 11, routine.strToDateTime(material['last_goods']['date']),date_format)
                            ws.write(rowIndex,12, material['last_goods']['account'],style1)
                            ws.write(rowIndex,13, material['last_goods']['good_code_1c'],style1)
                            ws.write(rowIndex,14, material['last_goods']['coef_si_div_iu'], style1)
                        rowIndex+=1
            else:
                ws.write(rowIndex,0, group['code'],style1)
                ws.write(rowIndex,1, '',style1)
                ws.write(rowIndex,2, '',style1)
                ws.write(rowIndex,3, group['code'],style1)
                ws.write(rowIndex,4, group['name'],style1)
                ws.write(rowIndex,5, '',style1)
                ws.write(rowIndex,6, '',style1)
                # ws.write(rowIndex,7, '',style1)
                ws.write(rowIndex,7, '',style1)
                ws.write(rowIndex,8, '',style1)
                ws.write(rowIndex,9, '',style1)
                ws.write(rowIndex,10, '',style1)
                ws.write(rowIndex,11, '',style1)
                ws.write(rowIndex,12, '',style1)
                ws.write(rowIndex,13, '',style1)
                ws.write(rowIndex,14, '',style1)
                rowIndex+=1
        wb.save(output)
        output.seek(0)
        return output.read()

    except Exception, exc:
        print('Error! get_stats_materials_vers1.' + str(exc))
        excType = exc.__class__.__name__
        print_exc()
        return {'status':'error', 'msg':'Error! Msg: '+ str(exc)}

@get('/stats/stock/vers1/<date_start>')
def get_stats_stock_vers1(date_start):
    '''
  Статистика по складу на указанную дату
  '''
    from xlwt import Workbook, XFStyle, Alignment, Font
    from apis.esud import stockapi
    import StringIO

    userlib.check_page_access('stats','r')
    response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=UTF-8'
    response.headers['Content-Type'] = 'application/vnd.ms-excel'
    response.headers['Content-Disposition'] = 'attachment; filename=stock_stat_' +datetime.datetime.utcnow().strftime('%d_%m_%Y_%H_%M_%S')+'.xls'
    try:

        # проверка входных параметров
        try:
            date_start =  datetime.datetime.strptime(date_start, '%d_%m_%Y_%H_%M')
            date_start = routine.dateToUtc(date_start)
        except:
            pass

        # получение данных
        data = stockapi.get_data_by_date(date_start)

        #Генерация XLS файла
        output = StringIO.StringIO()
        wb = Workbook(encoding='utf-8')
        ws = wb.add_sheet('Data')
        # styles
        al1 = Alignment()
        al1.horz = Alignment.HORZ_LEFT
        al1.vert = Alignment.VERT_TOP
        al1.wrap = Alignment.WRAP_AT_RIGHT
        font = Font()
        font.bold = True
        style1 = XFStyle()
        style1.alignment = al1
        style_header = XFStyle()
        style_header.alignment = al1
        style_header.font = font

        #set header------------
        ws.write(0,0, u"Заказ".encode("utf-8"),style_header)
        ws.write(0,1, u"Задание".encode("utf-8"),style_header)
        ws.write(0,2, u"Артикул спецификации".encode("utf-8"),style_header)
        ws.write(0,3, u"Название".encode("utf-8"),style_header)
        ws.write(0,4, u"Плановый объем".encode("utf-8"),style_header)
        ws.write(0,5, u"Объем в производстве".encode("utf-8"),style_header)
        ws.write(0,6, u"Оприходованный объем".encode("utf-8"),style_header)
        ws.write(0,7, u"Ипользованный объем".encode("utf-8"),style_header)
        ws.write(0,8, u"Единицы измерения объема".encode("utf-8"),style_header)

        # columns width
        ws.col(0).width = 256 * 15 # Заказ
        ws.col(1).width = 256 * 15 # Задание
        ws.col(2).width = 256 * 15 # Артикул спецификации
        ws.col(3).width = 256 * 30 # Название
        ws.col(4).width = 256 * 15 # Плановый объем
        ws.col(5).width = 256 * 15 # Объем в производстве
        ws.col(6).width = 256 * 15 # Оприходованный объем
        ws.col(7).width = 256 * 15 # Ипользованный объем
        ws.col(8).width = 256 * 15 # Единицы измерения объема

        rowIndex = 1
        for row in data:
            ws.write(rowIndex,0, row['order']['number'],style1)
            ws.write(rowIndex,1, row['production_order']['number'],style1)
            ws.write(rowIndex,2, row['item']['number'],style1)
            ws.write(rowIndex,3, row['item']['name'],style1)
            ws.write(rowIndex,4, row['volume_by_plan'],style1)
            ws.write(rowIndex,5, row['volume_in_develop'],style1)
            ws.write(rowIndex,6, row['volume_received'],style1)
            ws.write(rowIndex,7, row['volume_in_use'],style1)
            ws.write(rowIndex,8, row['unit'],style1)
            rowIndex+=1
        wb.save(output)
        output.seek(0)
        return output.read()

    except Exception, exc:
        print('Error! get_stats_stock_vers1.' + str(exc))
        excType = exc.__class__.__name__
        print_exc()
        return {'status':'error', 'msg':'Error! Msg: '+ str(exc)}

@get('/stats/crm/vers3')
def crm_vers3():
    '''
   iss: #1429 - Выгрузка динамики вероятности
  '''
    from xlwt import Workbook, XFStyle, Alignment, Font
    from models import ordermodel
    import StringIO

    userlib.check_page_access('stats','r')
    response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=UTF-8'
    response.headers['Content-Type'] = 'application/vnd.ms-excel'
    response.headers['Content-Disposition'] = 'attachment; filename=crm_stat_' +datetime.datetime.utcnow().strftime('%d_%m_%Y_%H_%M_%S')+'.xls'

    try:

        # получение данных
        # получение списка заявок
        data_orders = ordermodel.get_list(None,
                                          {
                                              'number':1,
                                              'history':1,
                                              'contracts': 1
                                          })

        data = []
        for row in data_orders:
            if 'history' in row and row['history'] and len(row['history'])>0:
                # сортировка истории по дате
                row['history'].sort(key = lambda x: (routine.strToDateTime(x['datetime'])))
                i = 1
                factory = ''
                contracts = []
                if row.get('contracts'):
                    for c_row in row['contracts']:
                        contracts.append(str(c_row['number']))
                        factory = c_row.get('factory')
                for h_row in row['history']:
                    data.append({
                        'index': i,
                        'number': row['number'],
                        'factory': factory,
                        'contract': ', '.join(contracts),
                        'chance': routine.strToInt(h_row.get('chance'))
                    })
                    i+=1

        #Генерация XLS файла
        output = StringIO.StringIO()
        wb = Workbook(encoding='utf-8')
        ws = wb.add_sheet('Data')
        # styles
        al1 = Alignment()
        al1.horz = Alignment.HORZ_LEFT
        al1.vert = Alignment.VERT_TOP
        al1.wrap = Alignment.WRAP_AT_RIGHT
        font = Font()
        font.bold = True
        style1 = XFStyle()
        style1.alignment = al1
        style_header = XFStyle()
        style_header.alignment = al1
        style_header.font = font

        #set header------------
        ws.write(0,0, u"Шаг".encode("utf-8"),style_header)
        ws.write(0,1, u"Заявка".encode("utf-8"),style_header)
        ws.write(0,2, u"Вероятность".encode("utf-8"),style_header)
        ws.write(0,3, u"Завод".encode("utf-8"),style_header)
        ws.write(0,4, u"Договор".encode("utf-8"),style_header)

        # columns width
        ws.col(0).width = 256 * 15 # Шаг
        ws.col(1).width = 256 * 15 # Заявка
        ws.col(2).width = 256 * 15 # Вероятность
        ws.col(3).width = 256 * 30 # Завод
        ws.col(4).width = 256 * 30 # Договор

        rowIndex = 1
        for row in data:
            ws.write(rowIndex,0, row['index'],style1)
            ws.write(rowIndex,1, row['number'],style1)
            ws.write(rowIndex,2, row['chance'],style1)
            ws.write(rowIndex,3, str(row['factory']),style1)
            ws.write(rowIndex,4, row['contract'],style1)
            rowIndex+=1
        wb.save(output)
        output.seek(0)
        return output.read()

    except Exception, exc:
        print('Error! crm_vers3' + str(exc))
        print_exc()
        return {'status':'error', 'msg':'Error! Msg: '+ str(exc)}

@get('/stats/joblog/vers1')
def joblog_vers1():
    '''
    для определения фактических затрат на человеческие ресурсы при проведении СМР нам нужно будет вытащить следующую информацию:
    номер заказа (от него тип здания и м2)
    участок СМР
    количество людей на участке
    количество дней на участке каждого человека (из этих двух показателей нам нужно получить количество чел/дней на участке)
  '''
    from xlwt import Workbook, XFStyle, Alignment, Font
    import StringIO

    userlib.check_page_access('stats','r')
    response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=UTF-8'
    response.headers['Content-Type'] = 'application/vnd.ms-excel'
    response.headers['Content-Disposition'] = 'attachment; filename=joblog_stat_' +datetime.datetime.utcnow().strftime('%d_%m_%Y_%H_%M_%S')+'.xls'

    try:

        result = []
        # получение данных
        data = workordermodel.get_fact_work_stat3()

        # подготовка данных
        for row in data:
            tmp={
                'contract': row['contract_number'],
                'order': '{0}.{1}.{2}'.format(str(row['contract_number']), str(row['production_number']), str(row['production_unit_number'])),
                'workers_count':len(row['workers']),
                'days_count': sum(len(row['workers'][w]['dates']) for w in row['workers']),
                'production_name': row['production_name'],
                'fact_dates_count': len(row['fact_dates'])
            }
            result.append(tmp)
        #return routine.JSONEncoder().encode(result)

        #Генерация XLS файла
        output = StringIO.StringIO()
        wb = Workbook(encoding='utf-8')
        ws = wb.add_sheet('Data')
        # styles
        al1 = Alignment()
        al1.horz = Alignment.HORZ_LEFT
        al1.vert = Alignment.VERT_TOP
        al1.wrap = Alignment.WRAP_AT_RIGHT
        font = Font()
        font.bold = True
        style1 = XFStyle()
        style1.alignment = al1
        style_header = XFStyle()
        style_header.alignment = al1
        style_header.font = font

        #set header------------
        ws.write(0,0, u"Договор".encode("utf-8"),style_header)
        ws.write(0,1, u"Заказ".encode("utf-8"),style_header)
        ws.write(0,2, u"Наименование".encode("utf-8"),style_header)
        ws.write(0,3, u"Количество людей".encode("utf-8"),style_header)
        ws.write(0,4, u"Количество дней".encode("utf-8"),style_header)

        # columns width
        ws.col(0).width = 256 * 15 # Договор
        ws.col(1).width = 256 * 15 # Заказ
        ws.col(2).width = 256 * 45 # Продукция
        ws.col(3).width = 256 * 20 # Количество людей
        ws.col(4).width = 256 * 20 # Количество дней

        rowIndex = 1
        for row in result:
            ws.write(rowIndex,0, row['contract'],style1)
            ws.write(rowIndex,1, row['order'],style1)
            ws.write(rowIndex,2, row['production_name'],style1)
            ws.write(rowIndex,3, row['workers_count'],style1)
            ws.write(rowIndex,4, row['fact_dates_count'],style1)
            rowIndex+=1

        wb.save(output)
        output.seek(0)
        return output.read()

    except Exception, exc:
        print('Error! joblog_vers1' + str(exc))
        print_exc()
        return {'status':'error', 'msg':'Error! Msg: '+ str(exc)}

@get('/stats/joblog/vers2')
def joblog_vers2():
    '''
    для определения фактических затрат на человеческие ресурсы при проведении СМР нам нужно будет вытащить следующую информацию:
    Таб номер
    ФИО
    Заказ
    Кол-во дней
  '''
    from xlwt import Workbook, XFStyle, Alignment, Font
    import StringIO

    userlib.check_page_access('stats','r')
    response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=UTF-8'
    response.headers['Content-Type'] = 'application/vnd.ms-excel'
    response.headers['Content-Disposition'] = 'attachment; filename=joblog_stat_' +datetime.datetime.utcnow().strftime('%d_%m_%Y_%H_%M_%S')+'.xls'

    try:
        result = []
        # получение данных
        data = workordermodel.get_fact_work_stat4()

        # подготовка данных
        for row in data['data']:
            for w_row in row['workers'].values():
                worker_key = str(w_row['user_id'])
                tmp={
                    'contract': row['contract_number'],
                    'order': '{0}.{1}.{2}'.format(str(row['contract_number']), str(row['production_number']), str(row['production_unit_number'])),
                    'worker_email':w_row['user_email'],
                    'worker_number':w_row['user_email'].replace('@int.modul.org', ''),
                    'worker_fio':w_row['user_fio'],
                    'days_count': len(w_row['dates']),
                    'production_name': row['production_name'],
                    'sector_code': row['sector_code'],
                    'sector_name': row['sector_name'],
                    'fact_dates_count': len(w_row['dates']),
                    'fact_dates_nodublies_count': 0
                }

                # calculate fact dates
                for fd_row in w_row['dates'].values():
                    worker_date_key = fd_row + '_' + worker_key
                    if worker_date_key in data['dublies']:
                        tmp['fact_dates_nodublies_count']+= 1.0 / data['dublies'][worker_date_key]['count']

                        # print('-------------')
                        # print(len(w_row['dates']))
                        # print(data['dublies'][worker_date_key]['count'])
                        # print(float(len(w_row['dates'])) / data['dublies'][worker_date_key]['count'])
                        # print('-------------')

                result.append(tmp)

        #Генерация XLS файла
        output = StringIO.StringIO()
        wb = Workbook(encoding='utf-8')
        ws = wb.add_sheet('Data')
        # styles
        al1 = Alignment()
        al1.horz = Alignment.HORZ_LEFT
        al1.vert = Alignment.VERT_TOP
        al1.wrap = Alignment.WRAP_AT_RIGHT
        font = Font()
        font.bold = True
        style1 = XFStyle()
        style1.alignment = al1
        style_header = XFStyle()
        style_header.alignment = al1
        style_header.font = font

        #set header------------
        ws.write(0,0, u"Договор".encode("utf-8"),style_header)
        ws.write(0,1, u"Заказ".encode("utf-8"),style_header)
        ws.write(0,2, u"Код участка".encode("utf-8"),style_header)
        ws.write(0,3, u"Участок".encode("utf-8"),style_header)
        ws.write(0,4, u"Таб. номер".encode("utf-8"),style_header)
        ws.write(0,5, u"ФИО".encode("utf-8"),style_header)
        ws.write(0,6, u"Количество дней".encode("utf-8"),style_header)

        # columns width
        ws.col(0).width = 256 * 15 # Договор
        ws.col(1).width = 256 * 15 # Заказ
        ws.col(2).width = 256 * 15 # Код Участок
        ws.col(3).width = 256 * 45 # Участок
        ws.col(4).width = 256 * 15 # Таб. номер
        ws.col(5).width = 256 * 45 # ФИО
        ws.col(6).width = 256 * 15 # Количество дней
        ws.col(7).width = 256 * 15 # Количество дней

        rowIndex = 1
        for row in result:
            ws.write(rowIndex,0, row['contract'],style1)
            ws.write(rowIndex,1, row['order'],style1)
            ws.write(rowIndex,2, row['sector_code'] ,style1)
            ws.write(rowIndex,3, row['sector_name'] ,style1)
            ws.write(rowIndex,4, row['worker_number'],style1)
            ws.write(rowIndex,5, row['worker_fio'],style1)
            #ws.write(rowIndex,6, row['fact_dates_count'],style1)
            ws.write(rowIndex,6, row['fact_dates_nodublies_count'],style1)
            rowIndex+=1

        wb.save(output)
        output.seek(0)
        return output.read()

    except Exception, exc:
        print('Error! joblog_vers2 ' + str(exc))
        print_exc()
        return {'status':'error', 'msg':'Error! Msg: '+ str(exc)}

@get('/stats/finance/vers1')
def finance_vers1():
    '''
    По действующим заказам нужна таблица:

    Договор
    Заказ
    Стоимость
    Площадь
    Дата закрытия по договору
    Дата закрытия наши планы

    Дата закрытия по договору - берем из нарядов по крайней дате "Планы по договору", если инфы нет, тогда берём с формы Договора поле "Крайний срок исполнения"
    Дата закрытия наши планы - берём из нарядов наши планы.
  '''
    from xlwt import Workbook, XFStyle, Alignment, Font
    import StringIO

    userlib.check_page_access('stats','r')
    response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=UTF-8'
    response.headers['Content-Type'] = 'application/vnd.ms-excel'
    response.headers['Content-Disposition'] = 'attachment; filename=finance_stat_' +datetime.datetime.utcnow().strftime('%d_%m_%Y_%H_%M_%S')+'.xls'

    try:

        contracts = []
        dop_agreements_grouped_by_contract = {}

        # получить основные договоры
        for row in contractmodel.get_list_by({
            'factory': u'Калуга',
            #'is_signed': 'yes',
            '$or': [{'is_signed': 'yes'},{'timeline_visible':True}],
            '$and':[
                # only main contracts
                {'$or': [{'parent_id': {'$exists': False }},{'parent_id':None},{'parent_id': ''}]},
                # filter out old contracts
                {'$or': [{ 'status': { '$ne': 'completed' } },  { 'status_date': { '$gt': datetime.datetime.now() - datetime.timedelta(days=30) } }]},
                # not canceled
                {'$or': [{'is_canceled': {'$exists': False }},{'is_canceled':None},{'is_canceled': False}]},
            ]
        }, {
            '_id': 1,
            'number': 1,
            'client_name': 1,
            'sign_date': 1,
            'productions': 1,
            'payment_uses': 1,
            'parent_id':1,
            'deadline': 1
        }):
            # проставляем крайний срок исполнения
            for p_row in row.get('productions'):
                p_row['deadline'] = row.get('deadline')
            # сбор договоров
            contracts.append(row)

        # получить доп. соглашения
        for row in contractmodel.get_list_by({
            'factory': u'Калуга',
            #'number': 1,
            #'is_signed': 'yes',
            '$or': [{'is_signed': 'yes'},{'timeline_visible':True}],
            '$and':[
                # only main contracts
                {'$and': [{'parent_id': {'$exists': True }},{'parent_id': {'$ne':None}},{'parent_id': {'$ne':''}}]},
                # filter out old contracts
                {'$or': [{ 'status': { '$ne': 'completed' } },  { 'status_date': { '$gt': datetime.datetime. now() - datetime.timedelta(days=30) } }]}
            ]
        }, {
            '_id': 1,
            'number': 1,
            'client_name': 1,
            'sign_date': 1,
            'productions': 1,
            'payment_uses': 1,
            'parent_id':1,
            'deadline': 1,
            'status':1
        }):
            # проставляем крайний срок исполнения
            for p_row in row.get('productions'):
                p_row['deadline'] = row.get('deadline')

            if str(row['parent_id']) not in dop_agreements_grouped_by_contract:
                dop_agreements_grouped_by_contract[str(row['parent_id'])] = []

            # сбор договоров
            dop_agreements_grouped_by_contract[str(row['parent_id'])].append(row)

        # смержить договора с доп. соглашениями
        for contract in contracts:
            if str(contract['_id']) in dop_agreements_grouped_by_contract:
                if not contract.get('productions'):
                    contract['productions'] = []
                for dop_contract in dop_agreements_grouped_by_contract[str(contract['_id'])]:
                    for product in dop_contract.get('productions'):
                        contract['productions'].append(product)

        result = []
        contract_ids = []
        # подготовка данных
        for contract_row in contracts:
            # сбор идентификаторов всех зайдействованных договоров
            contract_ids.append(contract_row['_id'])
            # результирующий объект
            for p_row in contract_row.get('productions',[]):
                if p_row['number']>0 and p_row.get('status')!='del':
                    # продукция
                    if not p_row.get('product_type'):
                        if p_row.get('is_complect'):
                            #комплект считается как один unit
                            price = p_row.get('complect_count',1)*p_row.get('price',0)
                            sq = p_row.get('complect_count',1)*p_row.get('square',0)
                            for ps in p_row.get('positions',[]):
                                price += routine.strToFloat(ps.get('mont_price',0))*( 1 if ps.get('mont_price_type',False) else routine.strToInt(ps.get('num',1) ))
                                price += routine.strToFloat(ps.get('delivery',0))
                            tmp = {
                                'contract_id': contract_row['_id'],
                                'contract_number': contract_row['number'],
                                'product_number': p_row['number'],
                                'unit_number': 1,
                                'order_number': '{0}.{1}.{2}'.format(str(contract_row['number']), str(p_row['number']), str(1)), # заказ
                                'price':price, # стоимость
                                'square': sq, # площадь
                                'contract_plan_date_finish': p_row.get('deadline'), #Дата закрытия по договору
                                'date_finish': None, #Дата закрытия наши планы
                            }
                            result.append(tmp)
                        else:
                            unit_number = 1
                            # не комплект раскидываем по юнитам
                            for ps in p_row.get('positions',[]):
                                cindex = 1
                                while cindex<=routine.strToInt(ps.get('num',1)):
                                    price = routine.strToFloat(p_row.get('price',0))
                                    price += routine.strToFloat(ps.get('delivery',0))/ routine.strToFloat(ps.get('num',1))
                                    price += routine.strToFloat(ps.get('mont_price',0))/routine.strToFloat(( ps.get('num',1)) if ps.get('mont_price_type',False) else 1 )
                                    sq = routine.strToFloat(p_row.get('square',0))
                                    tmp = {
                                        'contract_id': contract_row['_id'],
                                        'contract_number': contract_row['number'],
                                        'product_number': p_row['number'],
                                        'unit_number': unit_number,
                                        'order_number': '{0}.{1}.{2}'.format(str(contract_row['number']), str(p_row['number']), str(unit_number)), # заказ
                                        'price':price, # стоимость
                                        'square': sq, # площадь
                                        'contract_plan_date_finish': p_row.get('deadline'), #Дата закрытия по договору
                                        'date_finish': None, #Дата закрытия наши планы
                                    }
                                    result.append(tmp)
                                    cindex+=1
                                    unit_number+=1
                    elif p_row.get('product_type')=='service':
                        price = 0 if p_row.get('product_include')!='no' else routine.strToFloat(p_row.get('price'))
                        tmp = {
                            'contract_id': contract_row['_id'],
                            'contract_number': contract_row['number'],
                            'product_number': p_row['number'],
                            'unit_number': 1,
                            'order_number': '{0}.{1}.{2}'.format(str(contract_row['number']), str(p_row['number']), str(1)), # заказ
                            'price':price, # стоимость
                            'square': 0, # площадь
                            'contract_plan_date_finish': p_row.get('deadline'), #Дата закрытия по договору
                            'date_finish': None, #Дата закрытия наши планы
                        }
                        result.append(tmp)

        result.sort(key=lambda x: (x['contract_number'], x['product_number'], x['unit_number'] ))

        # по списку отобранных договор получаем наряды с датами
        if len(result)>0:
            wo_result = {}
            data = workordermodel.get_list_by(
                {
                    'contract_id': {'$in':contract_ids}
                },
                {
                    'date_start_with_shift': 1,
                    'date_finish_with_shift':1,
                    'contract_plan_date_start_with_shift':1,
                    'contract_plan_date_finish_with_shift':1,
                    'use_contract_plan':1,
                    'production_units': 1,
                    'contract_id': 1,
                    'contract_number':1,
                    'production_id':1,
                    'production_number':1,
                    'status':1
                })

            # отсеить договоры у которых все наряды завершены,
            wo_data = {}
            for row in data:
                order_key = '{0}.{1}.{2}'.format(str(row['contract_number']), str(row['production_number']), str(row['production_units'][0]['unit_number']))
                if order_key not in wo_data:
                    wo_data[order_key] = []
                wo_data[order_key].append(row)
            # print(contract_ids)
            def is_contract_completed(data):
                try:
                    if not data:
                        return True
                    completed_counter = 0;
                    for row in data:
                        if row.get('status') == 'completed':
                            completed_counter+=1
                    return completed_counter == len(data)
                except Exception, exc:
                    print('Error! : is_contract_completed. Detail: {0}'.format(str(exc)))
                    print_exc()
                    return False


            result = [row for row in result if not is_contract_completed(
                wo_data.get('{0}.{1}.{2}'.format(str(row['contract_number']), str(row['product_number']), str(row['unit_number'])))
            )]

            for row in data:
                order_key = '{0}.{1}.{2}'.format(str(row['contract_number']), str(row['production_number']), str(row['production_units'][0]['unit_number']))
                production_key = '{0}.{1}'.format(str(row['contract_id']), str(row['production_id']))
                if not order_key in wo_result:
                    wo_result[order_key] = {
                        'date_finish_with_shift':row.get('date_finish_with_shift'),
                        'contract_plan_date_finish_with_shift': row.get('contract_plan_date_finish_with_shift')
                    }
                else:
                    if wo_result[order_key]['date_finish_with_shift'] !=None and row.get('date_finish_with_shift')!=None and row.get('date_finish_with_shift')>wo_result[order_key]['date_finish_with_shift']:
                        wo_result[order_key]['date_finish_with_shift'] = row.get('date_finish_with_shift')
                    if wo_result[order_key]['contract_plan_date_finish_with_shift'] !=None and row.get('contract_plan_date_finish_with_shift')!=None and row.get('contract_plan_date_finish_with_shift')>wo_result[order_key]['contract_plan_date_finish_with_shift']:
                        wo_result[order_key]['contract_plan_date_finish_with_shift'] = row.get('contract_plan_date_finish_with_shift')

            # по отобранным нарядам опредялем сроки
            for row in result:
                if row['order_number'] in wo_result:
                    if wo_result[row['order_number']]['date_finish_with_shift']:
                        row['date_finish'] = wo_result[row['order_number']]['date_finish_with_shift']
                    if wo_result[row['order_number']]['contract_plan_date_finish_with_shift']:
                        row['contract_plan_date_finish'] = wo_result[row['order_number']]['contract_plan_date_finish_with_shift']


        #Генерация XLS файла
        output = StringIO.StringIO()
        wb = Workbook(encoding='utf-8')
        ws = wb.add_sheet('Data')

        date_format = XFStyle()
        date_format.num_format_str = 'dd/mm/yyyy'
        datetime_format = XFStyle()
        datetime_format.num_format_str = 'dd/mm/yyyy HH:MM'

        # styles
        al1 = Alignment()
        al1.horz = Alignment.HORZ_LEFT
        al1.vert = Alignment.VERT_TOP
        al1.wrap = Alignment.WRAP_AT_RIGHT
        font = Font()
        font.bold = True
        style1 = XFStyle()
        style1.alignment = al1
        style_header = XFStyle()
        style_header.alignment = al1
        style_header.font = font

        #set header------------
        ws.write(0,0, u"Договор".encode("utf-8"),style_header)
        ws.write(0,1, u"Заказ".encode("utf-8"),style_header)
        ws.write(0,2, u"Стоимость".encode("utf-8"),style_header)
        ws.write(0,3, u"Площадь".encode("utf-8"),style_header)
        ws.write(0,4, u"Дата закрытия по договору".encode("utf-8"),style_header)
        ws.write(0,5, u"Дата закрытия наши планы".encode("utf-8"),style_header)

        # columns width
        ws.col(0).width = 256 * 15 # Договор
        ws.col(1).width = 256 * 15 # Заказ
        ws.col(2).width = 256 * 20 # Стоимость
        ws.col(3).width = 256 * 20 # Площадь
        ws.col(4).width = 256 * 20 # Дата закрытия по договору
        ws.col(5).width = 256 * 20 # Дата закрытия наши планы

        rowIndex = 1
        for row in result:
            ws.write(rowIndex,0, row['contract_number'],style1)
            ws.write(rowIndex,1, row['order_number'],style1)
            ws.write(rowIndex,2, row['price'],style1)
            ws.write(rowIndex,3, row['square'],style1)
            ws.write(rowIndex,4, routine.strToDateTime(row['contract_plan_date_finish']),date_format)
            ws.write(rowIndex,5, routine.strToDateTime(row['date_finish']),date_format)
            rowIndex+=1

        wb.save(output)
        output.seek(0)
        return output.read()

    except Exception, exc:
        print('Error! joblog_vers1' + str(exc))
        print_exc()
        return {'status':'error', 'msg':'Error! Msg: '+ str(exc)}



@get('/stats/crm/vers6/')
def get_stats_crm_vers6():
    '''
    Статистика по CRM.
    #1529 - Адреса доставок / выгрузка в эксель
  '''
    from xlwt import Workbook, XFStyle, Alignment, Font
    from models import ordermodel
    import StringIO

    userlib.check_page_access('stats','r')
    response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=UTF-8'
    response.headers['Content-Type'] = 'application/vnd.ms-excel'
    response.headers['Content-Disposition'] = 'attachment; filename=crm_stat_' +datetime.datetime.utcnow().strftime('%d_%m_%Y_%H_%M_%S')+'.xls'
    try:
        # получение списка заявок
        data_orders = ordermodel.get_list(None,
                                          {
                                              'number':1,
                                              'products':1,
                                              'total_address':1,
                                              'l_state':1,
                                              'l_state_date':1,
                                              'manager':1
                                          }
                                          )
        data_orders.sort(key=lambda x:(x['number']))

        # extract managers info by email
        # get all managers
        users =  {}
        for row in  usermodel.get_list(None, {'email':1,'fio':1}):
            users[row['email']] = row

        for row in data_orders:
            row['manager_fio'] = users[row['manager']].get('fio') if row['manager'] in users and users[row['manager']] else None

        #Генерация XLS файла
        output = StringIO.StringIO()
        wb = Workbook(encoding='utf-8')
        ws = wb.add_sheet('Data')
        # styles
        al1 = Alignment()
        al1.horz = Alignment.HORZ_LEFT
        al1.vert = Alignment.VERT_TOP
        al1.wrap = Alignment.WRAP_AT_RIGHT
        font = Font()
        font.bold = True
        style1 = XFStyle()
        style1.alignment = al1
        style_header = XFStyle()
        style_header.alignment = al1
        style_header.font = font
        date_format = XFStyle()
        date_format.num_format_str = 'dd/mm/yyyy'
        datetime_format = XFStyle()
        datetime_format.num_format_str = 'dd/mm/yyyy HH:MM'

        date_format1 = XFStyle()
        date_format1.num_format_str = 'D-MMM-YY' # Other options: D-MMM-YY, D-MMM, MMM-YY, h:mm, h:mm:ss, h:mm, h:mm:ss, M/D/YY h:mm, mm:ss, [h]:mm:ss, mm:ss.0

        #set header------------
        ws.write(0,0, u"Заявка".encode("utf-8"),style_header)
        ws.write(0,1, u"Адрес доставки".encode("utf-8"),style_header)
        ws.write(0,2, u"Последнее состояние".encode("utf-8"),style_header)
        ws.write(0,3, u"Дата последнего состояния".encode("utf-8"),style_header)
        ws.write(0,4, u"Менеджер заявки".encode("utf-8"),style_header)

        # columns width
        ws.col(0).width = 256 * 10 # Код заявки
        ws.col(1).width = 256 * 40 # Адрес доставки
        ws.col(2).width = 256 * 30 # Последнее состояние
        ws.col(3).width = 256 * 20 # Дата последнего состояния
        ws.col(4).width = 256 * 40 # Дата последнего состояния

        rowIndex = 1
        for order in data_orders:
            # manager = '{0} ({1})'.format(order.get('manager'), order.get('manager_fio')) if order.get('manager_fio') else order.get('manager')
            ws.write(rowIndex,0, order['number'],style1)
            ws.write(rowIndex,1, order.get('total_address'),style1)
            ws.write(rowIndex,2, order.get('l_state'),style1)
            ws.write(rowIndex,3, routine.strToDateTime(order.get('l_state_date','')),date_format)
            ws.write(rowIndex,4, order.get('manager') ,style1)
            rowIndex+=1
        wb.save(output)
        output.seek(0)
        return output.read()

    except Exception, exc:
        print('Error! Get stats CRM vers6.' + str(exc))
        excType = exc.__class__.__name__
        print_exc()
        return {'status':'error', 'msg':'Error! Msg: '+ str(exc)}


@get('/stats/crm/vers7/')
def get_stats_crm_vers7():
    '''
    Статистика по CRM.
    #1557 - Выгрузка для воронки продаж // Кол-во рассматривают / Вероятность
  '''
    from xlwt import Workbook, XFStyle, Alignment, Font
    from models import ordermodel
    import StringIO

    userlib.check_page_access('stats','r')
    response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=UTF-8'
    response.headers['Content-Type'] = 'application/vnd.ms-excel'
    response.headers['Content-Disposition'] = 'attachment; filename=crm_stat_' +datetime.datetime.utcnow().strftime('%d_%m_%Y_%H_%M_%S')+'.xls'
    try:
        # получение списка заявок
        data_orders = ordermodel.get_list({'l_state':window.ORDER_CONDITIONS['EXAMINE']},
                                          {
                                              'number':1,
                                              'chance':1,
                                              'l_state':1,
                                              'l_state_date':1
                                          }
                                          )
        data_orders.sort(key=lambda x:(x['chance']))

        result = {}
        for row in data_orders:
            if row['chance'] not in result:
                result[row['chance']] = {'chance': row['chance'], 'count':0}
            result[row['chance']]['count'] += 1
        result = result.values()
        result.sort(key = lambda x: (x['chance']))


        #Генерация XLS файла
        output = StringIO.StringIO()
        wb = Workbook(encoding='utf-8')
        ws = wb.add_sheet('Data')
        # styles
        al1 = Alignment()
        al1.horz = Alignment.HORZ_LEFT
        al1.vert = Alignment.VERT_TOP
        al1.wrap = Alignment.WRAP_AT_RIGHT
        font = Font()
        font.bold = True
        style1 = XFStyle()
        style1.alignment = al1
        style_header = XFStyle()
        style_header.alignment = al1
        style_header.font = font
        date_format = XFStyle()
        date_format.num_format_str = 'dd/mm/yyyy'
        datetime_format = XFStyle()
        datetime_format.num_format_str = 'dd/mm/yyyy HH:MM'

        date_format1 = XFStyle()
        date_format1.num_format_str = 'D-MMM-YY'

        #set header------------
        ws.write(0,0, u"Вероятность".encode("utf-8"),style_header)
        ws.write(0,1, u"Кол-во".encode("utf-8"),style_header)

        # columns width
        ws.col(0).width = 256 * 15 # Вероятность
        ws.col(1).width = 256 * 20 # Кол-во

        rowIndex = 1
        for order in result:
            ws.write(rowIndex,0, 'Вероятность {0}%'.format(str(order['chance'])),style1)
            ws.write(rowIndex,1, order.get('count'),style1)
            rowIndex+=1
        wb.save(output)
        output.seek(0)
        return output.read()

    except Exception, exc:
        print('Error! Get stats CRM vers7.' + str(exc))
        print_exc()
        return {'status':'error', 'msg':'Error! Msg: '+ str(exc)}


@get('/stats/contract/vers2')
def get_stats_contract_vers2():
    '''
    Договр
    Заказ
    Название
    Назначение
    Тип
    Кол-во, ед.
    Площадь общая (кв.м)
    Товар, руб.
    Завод
    Подписан (да/нет)
  '''
    from xlwt import Workbook, XFStyle, Alignment, Font
    import StringIO

    userlib.check_page_access('stats','r')
    response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=UTF-8'
    response.headers['Content-Type'] = 'application/vnd.ms-excel'
    response.headers['Content-Disposition'] = 'attachment; filename=contract_stat_' +datetime.datetime.utcnow().strftime('%d_%m_%Y_%H_%M_%S')+'.xls'
    try:
        contracts = []
        dop_agreements_grouped_by_contract = {}
        result = []
        # получить основные договоры
        for row in contractmodel.get_list_by({'$or': [{'parent_id': {'$exists': False }},{'parent_id':None},{'parent_id': ''}]}, {
            'number':1,
            'is_signed':1,
            'is_canceled':1,
            'client_name':1,
            'client_id':1,
            'client_signator':1,
            'sign_date':1,
            'productions':1,
            'services':1,
            'products_count':1,
            'price': 1,
            'factory': 1
        }):
            # сбор договоров
            contracts.append(row)

        # получить доп. соглашения
        for row in contractmodel.get_list_by({'$and': [{'parent_id': {'$exists': True }},{'parent_id': {'$ne':None}},{'parent_id': {'$ne':''}}]},
                                             {
                                                 'number':1,
                                                 'is_signed':1,
                                                 'is_canceled':1,
                                                 'client_name':1,
                                                 'client_id':1,
                                                 'client_signator':1,
                                                 'sign_date':1,
                                                 'productions':1,
                                                 'services':1,
                                                 'products_count':1,
                                                 'price': 1,
                                                 'factory': 1,
                                                 'parent_id': 1
                                             }):
            if str(row['parent_id']) not in dop_agreements_grouped_by_contract:
                dop_agreements_grouped_by_contract[str(row['parent_id'])] = []
            # сбор договоров
            dop_agreements_grouped_by_contract[str(row['parent_id'])].append(row)

        # смержить договора с доп. соглашениями
        for contract in contracts:
            if str(contract['_id']) in dop_agreements_grouped_by_contract:
                if not contract.get('productions'):
                    contract['productions'] = []
                for dop_contract in dop_agreements_grouped_by_contract[str(contract['_id'])]:
                    for product in dop_contract.get('productions'):
                        contract['productions'].append(product)

        # подготовка данных
        for contract_row in contracts:
            for p_row in contract_row.get('productions',[]):
                if p_row['number']>0 and p_row.get('status')!='del':
                    result.append({
                        'number':contract_row['number'],
                        'order': '{0}.{1}'.format(str(contract_row['number']), str(p_row['number'])),
                        'is_signed':contract_row['is_signed'],
                        'factory': contract_row['factory'],
                        'production_name': p_row.get('name',''),
                        'production_target': p_row.get('target',''),
                        'production_type': p_row.get('type',''),
                        'production_units_count': routine.strToFloat(p_row.get('count',0)),
                        'production_price': p_row.get('price', 0),
                        'production_square': p_row.get('square', 0),
                    })

        result.sort(key=lambda x:(x['number'], x['order']))
        # return routine.JSONEncoder().encode(result)

        #Генерация XLS файла
        output = StringIO.StringIO()
        wb = Workbook(encoding='utf-8')
        ws = wb.add_sheet('Data')
        # styles
        al1 = Alignment()
        al1.horz = Alignment.HORZ_LEFT
        al1.vert = Alignment.VERT_TOP
        al1.wrap = Alignment.WRAP_AT_RIGHT
        font = Font()
        font.bold = True
        style1 = XFStyle()
        style1.alignment = al1
        style_header = XFStyle()
        style_header.alignment = al1
        style_header.font = font
        date_format = XFStyle()
        date_format.num_format_str = 'dd/mm/yyyy'
        datetime_format = XFStyle()
        datetime_format.num_format_str = 'dd/mm/yyyy HH:MM'

        #set header------------
        ws.write(0,0, u"Договор".encode("utf-8"),style_header)
        ws.write(0,1, u"Заказ".encode("utf-8"),style_header)
        ws.write(0,2, u"Название".encode("utf-8"),style_header)
        ws.write(0,3, u"Назначение".encode("utf-8"),style_header)
        ws.write(0,4, u"Тип".encode("utf-8"),style_header)
        ws.write(0,5, u"Кол-во, ед.".encode("utf-8"),style_header)
        ws.write(0,6, u"Площадь общая (кв.м).".encode("utf-8"),style_header)
        ws.write(0,7, u"Товар, руб.".encode("utf-8"),style_header)
        ws.write(0,8, u"Завод".encode("utf-8"),style_header)
        ws.write(0,9, u"Подписан (да/нет)".encode("utf-8"),style_header)

        # columns width
        ws.col(0).width = 256 * 10
        ws.col(1).width = 256 * 10
        ws.col(2).width = 256 * 40
        ws.col(3).width = 256 * 30
        ws.col(4).width = 256 * 30
        ws.col(5).width = 256 * 15
        ws.col(6).width = 256 * 15
        ws.col(7).width = 256 * 15
        ws.col(8).width = 256 * 20
        ws.col(9).width = 256 * 10

        rowIndex = 1
        for row in result:
            ws.write(rowIndex,0, row['number'],style1)
            ws.write(rowIndex,1, row['order'],style1)
            ws.write(rowIndex,2, row['production_name'],style1)
            ws.write(rowIndex,3, row['production_target'],style1)
            ws.write(rowIndex,4, row['production_type'],style1)
            ws.write(rowIndex,5, row['production_units_count'],style1)
            ws.write(rowIndex,6, row['production_square'],style1)
            ws.write(rowIndex,7, row['production_price'],style1)
            ws.write(rowIndex,8, row['factory'],style1)
            ws.write(rowIndex,9, 'Да' if row.get('is_signed') == 'yes' and not row.get('is_canceled') else 'Нет',style1)
            rowIndex+=1
        wb.save(output)
        output.seek(0)
        return output.read()

    except Exception, exc:
        print('Error! get_stats_contract_vers2.' + str(exc))
        print_exc()
        return {'status':'error', 'msg':'Error! Msg: '+ str(exc)}

@get('/stats/crm/vers8')
def get_stats_crm_vers8():
    '''
    Статистика по CRM - #1584  - Выгрузка "Последнее состояние по заявке" - убрать разбивку до Назначение продукции
    По колонками продукции делаем суммирование значений
  '''
    from xlwt import Workbook, XFStyle, Alignment, Font
    from models import ordermodel, clientmodel
    import StringIO

    userlib.check_page_access('stats','r')
    response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=UTF-8'
    response.headers['Content-Type'] = 'application/vnd.ms-excel'
    response.headers['Content-Disposition'] = 'attachment; filename=crm_stat_' +datetime.datetime.utcnow().strftime('%d_%m_%Y_%H_%M_%S')+'.xls'
    try:
        # получение и формаирование данных
        # получение списка клиентов
        data_clients = clientmodel.get_list(None,{'_id':1, 'contacts':1, 'name':1, 'rekvisit':1})
        clients = {}
        for cl in data_clients:
            clients[cl['_id']] = cl

        # получение списка заявок
        data_orders = ordermodel.get_list(None,
                                          {
                                              'number':1,
                                              'client_id':1,
                                              'products':1,
                                              'history':1,
                                              'total_address':1,
                                              'total_montaz':1,
                                              'sq':1,
                                              'price':1,
                                              'structure':1,
                                              'manager': 1,
                                              'added': 1,
                                              'activity_significant': 1,
                                              'activity_percent': 1,
                                              'activity': 1,
                                          })

        # подготовка данных с группировкой по продукции
        orders= []
        conditions = dirmodel.get_conditions()
        for order in data_orders:
            # если есть продукция в заявке
            if 'products' in order and len(order['products'])>0 and 'history' in order and len(order['history'])>0:
                # получение информации о клиенте
                client = clients.get(order['client_id'], {})
                # сортировка истории и получение последнего состояния
                order['history'].sort(key = lambda x: (routine.strToDateTime(x['datetime'])))
                last_state = order['history'][-1]

                last_state_comment = ''
                if last_state:
                    comments = last_state.get('comments',[])
                    last_state_comment = '-' if len(comments)==0 else comments[-1].get('text','')

                new_item = {
                    'number': order['number'],
                    'manager': order['manager'],
                    'client_name': client.get('name', ''),
                    'client_rekvisit': client.get('rekvisit', ''),
                    'added': order.get('added'),
                    'product_name': '',
                    'product_type': '',
                    'product_target': '',
                    'product_count': 0,
                    'product_sq': 0,
                    'product_price': 0,
                    'product_price_per_sq': 0,
                    'last_state_condition': conditions.get(last_state['condition'],'') if last_state else '',
                    'last_state_condition_reason': last_state.get('reason',''),
                    'last_state_date': routine.strToDateTime(last_state['datetime']),
                    'last_state_comment': last_state_comment,
                    'last_state_manager': last_state.get('manager',''),
                    'states_count': len(order['history']),
                    'activity_significant': order.get('activity_significant',0),
                    'activity_percent': order.get('activity_percent', 0),
                    'activity': order.get('activity',0),
                }

                for product in order['products']:
                    new_item['product_name']+= product['name'] + '; '
                    new_item['product_type']+= product['type'] + '; '
                    # new_item['product_target']+= product['target'] + '; ' if product['target'] else ''
                    new_item['product_count']+= 1
                    new_item['product_sq']+= product['sq']
                    new_item['product_price']+= product['price']
                    new_item['product_price_per_sq']+= product['price']/product['sq'] if product['price']>0 and product['sq']>0 else 0

                if new_item['product_count']>0:
                    new_item['product_price_per_sq'] = new_item['product_price_per_sq'] / new_item['product_count']

                orders.append(new_item)

        orders.sort(key=lambda x:(x['client_name'],x['number']))

        #Генерация XLS файла
        output = StringIO.StringIO()
        wb = Workbook(encoding='utf-8')
        ws = wb.add_sheet('Data')
        # styles
        al1 = Alignment()
        al1.horz = Alignment.HORZ_LEFT
        al1.vert = Alignment.VERT_TOP
        al1.wrap = Alignment.WRAP_AT_RIGHT
        font = Font()
        font.bold = True
        style1 = XFStyle()
        style1.alignment = al1
        style_header = XFStyle()
        style_header.alignment = al1
        style_header.font = font
        date_format = XFStyle()
        date_format.num_format_str = 'dd/mm/yyyy'
        datetime_format = XFStyle()
        datetime_format.num_format_str = 'dd/mm/yyyy HH:MM'
        #set header------------
        ws.write(0,0, u"Клиент".encode("utf-8"),style_header)
        ws.write(0,1, u"Реквизиты".encode("utf-8"),style_header)
        ws.write(0,2, u"Код заявки".encode("utf-8"),style_header)

        ws.write(0,3, u"Назначение продукции".encode("utf-8"),style_header)
        ws.write(0,4, u"Тип конструкции".encode("utf-8"),style_header)
        ws.write(0,5, u"Кол-во".encode("utf-8"),style_header)
        ws.write(0,6, u"Площадь".encode("utf-8"),style_header)
        ws.write(0,7, u"Сумма".encode("utf-8"),style_header)
        ws.write(0,8, u"Ср. за кв. м.".encode("utf-8"),style_header)

        ws.write(0,9, u"АО".encode("utf-8"),style_header)
        ws.write(0,10, u"АЗ".encode("utf-8"),style_header)

        ws.write(0,11, u"Последнее состояние заявки".encode("utf-8"),style_header)
        ws.write(0,12, u"Уточнение".encode("utf-8"),style_header)
        ws.write(0,13, u"Дата последнего состояния заявки".encode("utf-8"),style_header)
        ws.write(0,14, u"Комментарий к посл. состоянию".encode("utf-8"),style_header)
        ws.write(0,15, u"Всего состояний".encode("utf-8"),style_header)
        ws.write(0,16, u"Менеджер заявки".encode("utf-8"),style_header)
        ws.write(0,17, u"Дата создания".encode("utf-8"),style_header)

        # columns width
        ws.col(0).width = 256 * 30 # Клиент
        ws.col(1).width = 256 * 30 # Реквизиты клиента
        ws.col(2).width = 256 * 10 # Код заявки
        ws.col(3).width = 256 * 20 # Назначение продукции
        ws.col(4).width = 256 * 10 # Тип конструкции
        ws.col(5).width = 256 * 10 # Кол-во
        ws.col(6).width = 256 * 10 # Площадь
        ws.col(7).width = 256 * 10 # Сумма
        ws.col(8).width = 256 * 10 # Ср. за кв. м.

        ws.col(9).width = 256 * 15 # АО
        ws.col(10).width = 256 * 15 # АЗ
        ws.col(11).width = 256 * 15 # АЗ / АО

        ws.col(12).width = 256 * 15 # Последнее состояние заявки
        ws.col(13).width = 256 * 15 # Последнее состояние заявки - уточнение
        ws.col(14).width = 256 * 20 # Дата последнего состояния заявки
        ws.col(15).width = 256 * 40 # Комментарий к посл. состоянию
        ws.col(16).width = 256 * 20 # Всего состояний
        ws.col(17).width = 256 * 20 # Менеджер заявки последнего состояния
        ws.col(18).width = 256 * 15 # Дата создания

        rowIndex = 1
        for order in orders:
            ws.write(rowIndex,0, order['client_name'],style1)
            ws.write(rowIndex,1, order['client_rekvisit'],style1)
            ws.write(rowIndex,2, order['number'],style1)
            ws.write(rowIndex,3, order['product_name'],style1)
            ws.write(rowIndex,4, order['product_type'],style1)
            ws.write(rowIndex,5, order['product_count'],style1)
            ws.write(rowIndex,6, order['product_sq'],style1)
            ws.write(rowIndex,7, order['product_price'],style1)
            ws.write(rowIndex,8, order['product_price_per_sq'],style1)

            ws.write(rowIndex,9, order['activity'], style1)
            ws.write(rowIndex,10, order['activity_significant'], style1)
            ws.write(rowIndex,11, order['activity_percent'], style1)

            ws.write(rowIndex,12, order['last_state_condition'],style1)
            ws.write(rowIndex,13, order['last_state_condition_reason'],style1)
            ws.write(rowIndex,14, order['last_state_date'] +datetime.timedelta(hours=routine.moscow_tz_offset), datetime_format)
            #ws.write(rowIndex,10, order['last_state_date'], datetime_format)
            ws.write(rowIndex,15, order['last_state_comment'],style1)
            ws.write(rowIndex,16, order['states_count'],style1)
            ws.write(rowIndex,17, order['manager'],style1)
            ws.write(rowIndex,18, order['added'] +datetime.timedelta(hours=routine.moscow_tz_offset), datetime_format)
            rowIndex+=1
        wb.save(output)
        output.seek(0)
        return output.read()

    except Exception, exc:
        print('Error! Get stats CRM.' + str(exc))
        excType = exc.__class__.__name__
        print_exc()
        return {'status':'error', 'msg':'Error! Msg: '+ str(exc)}

@get('/stats/clients/vers2')
def get_stats_clients_vers2():
    '''
    Статистика по клиентам
    #1587 Выгрузка контактных лиц
  '''
    from xlwt import Workbook, XFStyle, Alignment, Font, Formula
    from models import ordermodel, clientmodel
    import StringIO

    userlib.check_page_access('stats','r')
    response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=UTF-8'
    response.headers['Content-Type'] = 'application/vnd.ms-excel'
    response.headers['Content-Disposition'] = 'attachment; filename=clients_stat_' +datetime.datetime.utcnow().strftime('%d_%m_%Y_%H_%M_%S')+'.xls'
    try:

        data_result = []
        # получение списка клиентов
        data_clients = clientmodel.get_list(None,{'_id':1, 'contacts':1, 'name':1, 'rekvisit':1,'wherefind':1, 'firstcontact':1})
        data_clients.sort(key=lambda x:(x['name'],x.get('wherefind',''), x.get('firstcontact','')))

        # получение списка заявок
        data_orders = {}
        for row in ordermodel.get_list(None, {'number':1,'client_id':1}):
            if str(row.get('client_id')) not in data_orders:
                data_orders[str(row.get('client_id'))] = []
            data_orders[str(row.get('client_id'))].append(str(row['number']))

        for row in data_clients:
            for c_row in row.get('contacts',[]):
                tmp_row = {
                    '_id': str(row['_id']),
                    'name': row['name'],
                    'orders': '; '.join(data_orders.get(str(row['_id']))) if data_orders.get(str(row['_id'])) else '',
                    'contact_fio': c_row.get('fio', ''),
                    'contact_email': '; '.join(c_row['email']) if c_row.get('email') and len(c_row['email'])>0 else '',
                    'contact_phone': '; '.join(c_row['phone']) if c_row.get('phone') and len(c_row['phone'])>0 else '',
                    'contact_post': c_row.get('post', ''),
                    'contact_fired_date': c_row.get('fired_date', ''),
                    'contact_note': c_row.get('note', ''),
                    'contact_info_source': c_row.get('info_source', '')
                }
                data_result.append(tmp_row)

        #Генерация XLS файла
        output = StringIO.StringIO()
        wb = Workbook(encoding='utf-8')
        ws = wb.add_sheet('Data')
        # styles
        al1 = Alignment()
        al1.horz = Alignment.HORZ_LEFT
        al1.vert = Alignment.VERT_TOP
        al1.wrap = Alignment.WRAP_AT_RIGHT
        font = Font()
        font.bold = True
        style1 = XFStyle()
        style1.alignment = al1
        style_header = XFStyle()
        style_header.alignment = al1
        style_header.font = font

        #set header------------
        ws.write(0,0, u"Клиент".encode("utf-8"),style_header)
        ws.write(0,1, u"ФИО".encode("utf-8"),style_header)
        ws.write(0,2, u"Эл. почта".encode("utf-8"),style_header)
        ws.write(0,3, u"Телефон".encode("utf-8"),style_header)
        ws.write(0,4, u"Должность".encode("utf-8"),style_header)
        ws.write(0,5, u"Не работает с".encode("utf-8"),style_header)
        ws.write(0,6, u"Примечание".encode("utf-8"),style_header)
        ws.write(0,7, u"Источник информации".encode("utf-8"),style_header)
        ws.write(0,8, u"Заявки".encode("utf-8"),style_header)
        ws.write(0,9, u"ИД клиента".encode("utf-8"),style_header)

        # columns width
        ws.col(0).width = 256 * 30 # Клиент
        ws.col(1).width = 256 * 30 # ФИО
        ws.col(2).width = 256 * 20 # Эл. почта
        ws.col(3).width = 256 * 15 # Телефон
        ws.col(4).width = 256 * 15 # Должность
        ws.col(5).width = 256 * 15 # Не работает с
        ws.col(6).width = 256 * 30 # Примечание
        ws.col(7).width = 256 * 20 # Источник информации
        ws.col(8).width = 256 * 20 # Заявки
        ws.col(9).width = 256 * 20 # ИД клиента

        rowIndex = 1
        for row in data_result:
            ws.write(rowIndex,0, row['name'],style1)
            ws.write(rowIndex,1, row.get('contact_fio',''),style1)
            ws.write(rowIndex,2, row.get('contact_email',''),style1)
            ws.write(rowIndex,3, row.get('contact_phone',''),style1)
            ws.write(rowIndex,4, row.get('contact_post',''),style1)
            ws.write(rowIndex,5, row.get('contact_fired_date',''),style1)
            ws.write(rowIndex,6, row.get('contact_note',''),style1)
            ws.write(rowIndex,7, clientmodel.info_soure.get(row.get('contact_info_source',''),'') ,style1)
            ws.write(rowIndex,8, row.get('orders',''),style1)
            ws.write(rowIndex,9, Formula('HYPERLINK("http://int.modul.org/client-card/{0}"; "{1}")'.format(row['_id'], row['_id'])),style1)

            rowIndex+=1
        wb.save(output)
        output.seek(0)
        return output.read()

    except Exception, exc:
        print('Error! get_stats_clients_vers2 ' + str(exc))
        print_exc()
        return {'status':'error', 'msg':'Error! Msg: '+ str(exc)}

@get('/stats/crm/vers9')
def get_stats_crm_vers9():
    '''
    Заявка
    Продукция
    Название
    Назначение
    Тип
    Кол-во, ед.
    Площадь общая (кв.м)
    Товар, руб.
    Завод
    Подписан (да/нет)
  '''
    from models import ordermodel, clientmodel
    from apis.crm import orderapi
    from xlwt import Workbook, XFStyle, Alignment, Font, Formula
    import StringIO

    userlib.check_page_access('stats','r')
    response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=UTF-8'
    response.headers['Content-Type'] = 'application/vnd.ms-excel'
    response.headers['Content-Disposition'] = 'attachment; filename=crm_stat_' +datetime.datetime.utcnow().strftime('%d_%m_%Y_%H_%M_%S')+'.xls'
    try:
        result = []

        # users =  {}
        # for row in  usermodel.get_list(None, {'email':1,'fio':1}):
        #   users[row['email']] = row
        # for row in data_orders:
        #   row['manager_fio'] = users[row['manager']].get('fio') if row['manager'] in users and users[row['manager']] else None

        # получение списка клиентов
        data_clients = clientmodel.get_list(None,{'_id':1, 'contacts':1, 'name':1, 'rekvisit':1, 'group':1})
        clients = {}
        for cl in data_clients:
            clients[cl['_id']] = cl

        # получение списка заявок
        #data_orders = ordermodel.get_list({'$or':[{'l_state':'Спящий'},{'l_state':'Отказ'}]},
        data_orders = ordermodel.get_list(None,
                                          {
                                              'number':1,
                                              'client_id':1,
                                              'client_group':1,
                                              'products':1,
                                              'history':1,
                                              'total_address':1,
                                              'total_montaz':1,
                                              'sq':1,
                                              'price':1,
                                              'structure':1,
                                              'manager':1,
                                              'documents':1
                                          })

        conditions = dirmodel.get_conditions()

        for order_row in data_orders:
            # получение информации о клиенте
            client = clients.get(order_row['client_id'], {})
            # сортировка истории и получение последнего состояния
            order_row['history'].sort(key = lambda x: (routine.strToDateTime(x['datetime'])))
            last_state = order_row['history'][-1] if len(order_row['history'])>0 else None
            prelast_state = None
            if len(order_row['history'])>1:
                prelast_state = order_row['history'][-2]
            # сбор состояний, отвечающих за КП
            #kp_keys = ['Запрос КП', 'Подготовка КП', 'Отправили КП', 'Отправили КП', 'Рассматривают']
            kp_keys = [OrderConditions['REQUEST_KP'], OrderConditions['KP_PREPARATION'],OrderConditions['SEND_KP'],OrderConditions['EXAMINE']]
            kp_states = [ state_row for state_row in order_row['history'] if state_row['condition'] in kp_keys]

            for p_row in order_row.get('products',[]):
                mont_price = 0 # монтаж
                delivery_price = 0 # доставка
                full_price = 0 # полная стоимость с учетом монтажа и доставки

                # if p_row.get('is_complect'):
                #   #комплект считается как один unit
                #   unit_count = routine.strToInt(p_row.get('count',1))
                #   sq = p_row.get('sq',0) * unit_count
                #   price = p_row.get('price',0) * unit_count
                #   # подсчет стоимости монтажа и доставки
                #   for ps in p_row.get('positions',[]):
                #     mont_price += routine.strToFloat(ps.get('mont_price',0))*( 1 if ps.get('mont_price_type',False) else routine.strToInt(ps.get('num',1) ))
                #     delivery_price += routine.strToFloat(ps.get('delivery',0))
                #   # полная стоимость
                #   full_price = price + mont_price + delivery_price

                #   tmp = {
                #     'number':order_row['number'],
                #     'manager': order_row.get('manager',''),
                #     'production_name': p_row.get('name',''),
                #     'production_type': p_row.get('type',''),
                #     'production_units_count': routine.strToFloat(p_row.get('count',0)),
                #     'production_price': price,
                #     'production_square': sq,
                #     'production_length': routine.strToFloat(p_row.get('length',0)),
                #     'production_height': routine.strToFloat(p_row.get('height',0)),
                #     'production_width': routine.strToFloat(p_row.get('width',0)),
                #     'mont_price': mont_price,
                #     'delivery_price': delivery_price,
                #     'full_price': full_price,
                #     'client_name': client.get('name', ''),
                #     'client_rekvisit': client.get('rekvisit', ''),
                #     'client_group':client.get('group', ''),
                #     'last_state_condition': last_state['condition'] if last_state else '',
                #     'last_state_date': routine.strToDateTime(last_state['datetime']) if last_state else '',
                #     'last_state_comment': last_state.get('comment','') if last_state else '',
                #     'last_state_year': routine.strToDateTime(last_state['datetime']).year if last_state else '',
                #     'prelast_state_condition': prelast_state['condition'] if prelast_state else '',
                #   }
                #   result.append(tmp)
                # else:
                #unit_count = routine.strToInt(p_row.get('count',1))
                unit_count = 1
                sq = routine.strToFloat(p_row.get('sq',0)) * unit_count
                price = routine.strToFloat(p_row.get('price',0)) * unit_count
                mont_price = 0 # монтаж
                delivery_price = 0 # доставка
                full_price = 0 # полная стоимость с учетом монтажа и доставки
                # не комплект раскидываем по юнитам
                for ps in p_row.get('positions',[]):
                    delivery_price += routine.strToFloat(ps.get('delivery',0)) / routine.strToFloat(ps.get('num',1))
                    mont_price += routine.strToFloat(ps.get('mont_price',0)) / routine.strToFloat(( ps.get('num',1)) if ps.get('mont_price_type',False) else 1 )

                # монтаж и доставку приводим к единице продукции
                delivery_price = delivery_price/routine.strToFloat(p_row.get('count',1))
                mont_price = mont_price/routine.strToFloat(p_row.get('count',1))

                # полная стоимость
                full_price = price + mont_price + delivery_price
                documents_struct = None
                if order_row.get('documents') and order_row['documents'].get('struct'):
                    documents_struct = orderapi.prepare_documents_stat_info(order_row['documents']['struct'])

                last_state_comment = ''
                if last_state:
                    comments = last_state.get('comments',[])
                    last_state_comment = '-' if len(comments)==0 else comments[-1].get('text','')

                tmp = {
                    'number':order_row['number'],
                    'manager': order_row.get('manager',''),
                    'production_name': p_row.get('name',''),
                    'production_type': p_row.get('type',''),
                    'production_units_count': routine.strToFloat(p_row.get('count',0)),
                    'production_price': price,
                    'production_square': sq,
                    'production_length': routine.strToFloat(p_row.get('length',0)),
                    'production_height': routine.strToFloat(p_row.get('height',0)),
                    'production_width': routine.strToFloat(p_row.get('width',0)),
                    'mont_price': mont_price,
                    'delivery_price': delivery_price,
                    'full_price': full_price,
                    'client_name': client.get('name', ''),
                    'client_rekvisit': client.get('rekvisit', ''),
                    'client_group':client.get('group', ''),
                    'last_state_condition': conditions.get(last_state['condition'],'') if last_state else '',
                    'last_state_date': routine.strToDateTime(last_state['datetime']) if last_state else '',
                    'last_state_comment': last_state_comment,
                    'last_state_year': routine.strToDateTime(last_state['datetime']).year if last_state else '',
                    'prelast_state_condition': conditions.get(prelast_state['condition'],'') if prelast_state else '',
                    'kp_count': len(kp_states),
                    'kp_last_state': conditions.get(kp_states[-1]['condition'],'') if len(kp_states)>0 else '',
                    'kp_last_date': routine.strToDateTime(kp_states[-1]['datetime']) if len(kp_states)>0 else '',
                    'documents_struct': documents_struct,
                    'documents': order_row.get('documents')
                }
                result.append(tmp)

        result.sort(key=lambda x:(x['number']))
        # return routine.JSONEncoder().encode(result)

        #Генерация XLS файла
        output = StringIO.StringIO()
        wb = Workbook(encoding='utf-8')
        ws = wb.add_sheet('Data')
        # styles
        al1 = Alignment()
        al1.horz = Alignment.HORZ_LEFT
        al1.vert = Alignment.VERT_TOP
        al1.wrap = Alignment.WRAP_AT_RIGHT
        font = Font()
        font.bold = True
        style1 = XFStyle()
        style1.alignment = al1
        style_header = XFStyle()
        style_header.alignment = al1
        style_header.font = font
        date_format = XFStyle()
        date_format.num_format_str = 'dd/mm/yyyy'
        datetime_format = XFStyle()
        datetime_format.num_format_str = 'dd/mm/yyyy HH:MM'

        #set header------------
        ws.write(0,0, u"Менеджер".encode("utf-8"),style_header)
        ws.write(0,1, u"Группа компаний".encode("utf-8"),style_header)
        ws.write(0,2, u"Компания".encode("utf-8"),style_header)
        ws.write(0,3, u"Заявка №".encode("utf-8"),style_header)
        ws.write(0,4, u"Посл. состояние".encode("utf-8"),style_header)
        ws.write(0,5, u"Дата посл. состояния".encode("utf-8"),style_header)
        ws.write(0,6, u"КП, всего".encode("utf-8"),style_header)
        ws.write(0,7, u"КП, последнее".encode("utf-8"),style_header)
        ws.write(0,8, u"КП, посл. дата".encode("utf-8"),style_header)
        ws.write(0,9, u"Назначение".encode("utf-8"),style_header)
        ws.write(0,10, u"Тип".encode("utf-8"),style_header)
        ws.write(0,11, u"Кол-во (ед.)".encode("utf-8"),style_header)
        ws.write(0,12, u"Площадь общая (кв.м).".encode("utf-8"),style_header)
        ws.write(0,13, u"Длина (ед.)".encode("utf-8"),style_header)
        ws.write(0,14, u"Высота (ед.)".encode("utf-8"),style_header)
        ws.write(0,15, u"Ширина (ед.)".encode("utf-8"),style_header)
        ws.write(0,16, u"Стоимость товара (руб.)".encode("utf-8"),style_header)
        ws.write(0,17, u"Стоимость доставки (руб.)".encode("utf-8"),style_header)
        ws.write(0,18, u"Стоимость монтажа (руб.)".encode("utf-8"),style_header)
        ws.write(0,19, u"Стоимость общая (руб.)".encode("utf-8"),style_header)
        ws.write(0,20, u"Каталоги, структура".encode("utf-8"),style_header)
        ws.write(0,21, u"Чертежи, Готовые, PDF".encode("utf-8"),style_header)
        ws.write(0,22, u"ТО, Готовые".encode("utf-8"),style_header)
        ws.write(0,23, u"Чертежи, Готовые, Другое".encode("utf-8"),style_header)
        ws.write(0,24, u"Чертежи, Исходники, cdw".encode("utf-8"),style_header)
        ws.write(0,25, u"Чертежи, Исходники, rvt".encode("utf-8"),style_header)
        ws.write(0,26, u"Чертежи, Исходники, Другое".encode("utf-8"),style_header)
        ws.write(0,27, u"Чертежи, Готовые, всего".encode("utf-8"),style_header)
        ws.write(0,28, u"Чертежи, Исходники, всего".encode("utf-8"),style_header)
        ws.write(0,29, u"ТО, Исходники".encode("utf-8"),style_header)
        ws.write(0,30, u"ТО, Всего".encode("utf-8"),style_header)
        ws.write(0,31, u"Чертежи, всего".encode("utf-8"),style_header)
        ws.write(0,32, u"Ссылка на каталог заявки".encode("utf-8"),style_header)

        # columns width
        ws.col(0).width = 256 * 30 # Менеджер
        ws.col(1).width = 256 * 30 # Группа компаний
        ws.col(2).width = 256 * 50 # Компания
        ws.col(3).width = 256 * 10 # Заявка №
        ws.col(4).width = 256 * 20 # Посл. состояние
        ws.col(5).width = 256 * 20 # Дата посл. состояния
        ws.col(6).width = 256 * 10 # КП, всего
        ws.col(7).width = 256 * 20 # КП, последнее
        ws.col(8).width = 256 * 15 # КП, посл. дата
        ws.col(9).width = 256 * 40 # Назначение
        ws.col(10).width = 256 * 30 # Тип
        ws.col(11).width = 256 * 10 # Кол-во (ед.)
        ws.col(12).width = 256 * 10 # Площадь общая (кв.м).
        ws.col(13).width = 256 * 15 # Длина
        ws.col(14).width = 256 * 15 # Высота
        ws.col(15).width = 256 * 15 # Ширина
        ws.col(16).width = 256 * 15 # Стоимость товара (руб.)
        ws.col(17).width = 256 * 15 # Стоимость доставки (руб.)
        ws.col(18).width = 256 * 15 # Стоимость монтажа (руб.)
        ws.col(19).width = 256 * 15 # Стоимость общая (руб.)
        ws.col(20).width = 256 * 15 #
        ws.col(21).width = 256 * 15 #
        ws.col(22).width = 256 * 15 #
        ws.col(23).width = 256 * 15 #
        ws.col(24).width = 256 * 15 #
        ws.col(25).width = 256 * 15 #
        ws.col(26).width = 256 * 15 #
        ws.col(27).width = 256 * 15 #
        ws.col(28).width = 256 * 15 #
        ws.col(29).width = 256 * 25 #
        ws.col(30).width = 256 * 25 #
        ws.col(31).width = 256 * 25 #
        ws.col(32).width = 256 * 25 #

        rowIndex = 1
        for row in result:
            ws.write(rowIndex,0, row['manager'], style1)
            ws.write(rowIndex,1, row['client_group'], style1)
            ws.write(rowIndex,2, row['client_name'], style1)
            ws.write(rowIndex,3, Formula('HYPERLINK("http://int.modul.org/crm/{0}"; "{1}" )'.format(str(row['number']), str(row['number']))), style1)
            ws.write(rowIndex,4, row['last_state_condition'], style1)
            ws.write(rowIndex,5, row['last_state_date'] + datetime.timedelta(hours=routine.moscow_tz_offset) if row['last_state_date'] else '', datetime_format)
            ws.write(rowIndex,6, row['kp_count'], style1)
            ws.write(rowIndex,7, row['kp_last_state'], style1)
            ws.write(rowIndex,8, row['last_state_date'], datetime_format)
            ws.write(rowIndex,9, row['production_name'], style1)
            ws.write(rowIndex,10, row['production_type'], style1)
            ws.write(rowIndex,11, row['production_units_count'], style1)
            ws.write(rowIndex,12, row['production_square'], style1)
            ws.write(rowIndex,13, row['production_length'], style1)
            ws.write(rowIndex,14, row['production_height'], style1)
            ws.write(rowIndex,15, row['production_width'], style1)
            ws.write(rowIndex,16, row['production_price'], style1)
            ws.write(rowIndex,17, row['delivery_price'], style1)
            ws.write(rowIndex,18, row['mont_price'] ,style1)
            ws.write(rowIndex,19, row['full_price'], style1)
            if not row['documents_struct']:
                ws.write(rowIndex,20, '', style1)
                ws.write(rowIndex,21, '', style1)
                ws.write(rowIndex,22, '', style1)
                ws.write(rowIndex,23, '', style1)
                ws.write(rowIndex,24, '', style1)
                ws.write(rowIndex,25, '', style1)
                ws.write(rowIndex,26, '', style1)
                ws.write(rowIndex,27, '', style1)
                ws.write(rowIndex,28, '', style1)
                ws.write(rowIndex,29, '', style1)
                ws.write(rowIndex,30, '', style1)
                ws.write(rowIndex,31, '', style1)
            else:
                ws.write(rowIndex,20, row['documents_struct']['full_key'], style1)
                ws.write(rowIndex,21, Formula('HYPERLINK("{0}"; "{1}")'.format(str(row['documents_struct']['ready_pdf_last_file']['alternateLink']), str(row['documents_struct']['ready_pdf_count']))) if row['documents_struct']['ready_pdf_count']>0 else '', style1)
                ws.write(rowIndex,22, Formula('HYPERLINK("{0}"; "{1}")'.format(str(row['documents_struct']['to_ready_last_file']['alternateLink']), str(row['documents_struct']['to_ready_count']))) if row['documents_struct']['to_ready_count']>0 else '', style1)
                ws.write(rowIndex,23, Formula('HYPERLINK("{0}"; "{1}")'.format(str(row['documents_struct']['ready_other_last_file']['alternateLink']), str(row['documents_struct']['ready_other_count']))) if row['documents_struct']['ready_other_count']>0 else '', style1)
                ws.write(rowIndex,24, Formula('HYPERLINK("{0}"; "{1}")'.format(str(row['documents_struct']['ish_cdw_last_file']['alternateLink']), str(row['documents_struct']['ish_cdw_count']))) if row['documents_struct']['ish_cdw_count']>0 else '', style1)
                ws.write(rowIndex,25, Formula('HYPERLINK("{0}"; "{1}")'.format(str(row['documents_struct']['ish_rvt_last_file']['alternateLink']), str(row['documents_struct']['ish_rvt_count']))) if row['documents_struct']['ish_rvt_count']>0 else '', style1)
                ws.write(rowIndex,26, Formula('HYPERLINK("{0}"; "{1}")'.format(str(row['documents_struct']['ish_other_last_file']['alternateLink']), str(row['documents_struct']['ish_other_count']))) if row['documents_struct']['ish_other_count']>0 else '', style1)
                ws.write(rowIndex,27, row['documents_struct']['ready_pdf_count'] + row['documents_struct']['ready_other_count'] , style1)
                ws.write(rowIndex,28, row['documents_struct']['ish_cdw_count'] + row['documents_struct']['ish_rvt_count'] + row['documents_struct']['ish_other_count'], style1)
                ws.write(rowIndex,29, Formula('HYPERLINK("{0}"; "{1}")'.format(str(row['documents_struct']['to_ish_last_file']['alternateLink']), str(row['documents_struct']['ito_ish_count']))) if row['documents_struct']['to_ish_count']>0 else '', style1)
                ws.write(rowIndex,30, row['documents_struct']['to_ish_count'] + row['documents_struct']['to_ready_count'] , style1)
                ws.write(rowIndex,31, row['documents_struct']['ready_pdf_count'] + row['documents_struct']['ready_other_count']+ row['documents_struct']['ish_cdw_count'] + row['documents_struct']['ish_rvt_count'] + row['documents_struct']['ish_other_count'], style1)

            if row['documents']:
                ws.write(rowIndex,32, Formula('HYPERLINK("https://drive.google.com/drive/folders/{0}"; "{1}" )'.format(str(row['documents']['folder_id']), str(row['number']))) if row['documents'] and row['documents'].get('folder_id') else '',style1)
            else:
                ws.write(rowIndex,32, '', style1)

            rowIndex+=1
        wb.save(output)
        output.seek(0)
        return output.read()

    except Exception, exc:
        print('Error! get_stats_crm_vers9.' + str(exc))
        print_exc()
        return {'status':'error', 'msg':'Error! Msg: '+ str(exc)}

@get('/stats/joblog/vers3/<type>/<params:path>')
def joblog_vers3(type, params):
    '''
    type - google/xls
    params - /date_from/01_01_2018/date_to/14_02_2018/orders/520.6.1/sectors/1,2,3
    #1657 (Выборка по трудовому участию)
    Дата,
    Процент участия,
    Таб. номер,
    ФИО,
    Заказ,
    Направление,
    Участок,
  '''

    def make_google(data):
        from helpers.google_api import spreadsheet

        # объект для работы с требуемым spreadsheet
        spreadsheet_obj = spreadsheet.Spreadsheet(config.google_api_user, '1s2T4sZOF6vVMpGNmDdhMaAbEDMlODq1ZHfS6me_kcns')
        # получить необходимую страницу
        values = []

        for row in data:
            for w_row in row['wp_workers']:
                values.append([
                    w_row['user_fio'],
                    row['wp_fact_date'].strftime('%d.%m.%Y'),
                    row['contract_number'],
                    row['order'],
                    row['sector_type'],
                    row['sector_code'],
                    row['sector_name'],
                    w_row['user_email'].split('@')[0] if w_row.get('user_email') else '',
                    w_row['proportion'],
                    row['number']
                ])

        #spreadsheet_obj.prepare_setValues(u'data','A2:J%d' % (1000), [['','','','','','','','','',''] for i in xrange(997)])
        spreadsheet_obj.prepare_delete_all_rows_from(u'data', 1)
        spreadsheet_obj.prepare_add_rows(u'data', len(values))
        spreadsheet_obj.prepare_setValues(u'data','A2:J%d' % (len(values) + 3), values)
        spreadsheet_obj.runPrepared()
        #-------------------------------
        return values

    def make_xls(data):
        from xlwt import Workbook, XFStyle, Alignment, Font
        import StringIO
        response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=UTF-8'
        response.headers['Content-Type'] = 'application/vnd.ms-excel'
        response.headers['Content-Disposition'] = 'attachment; filename=joblog_stat_' +datetime.datetime.utcnow().strftime('%d_%m_%Y_%H_%M_%S')+'.xls'

        #Генерация XLS файла
        output = StringIO.StringIO()
        wb = Workbook(encoding='utf-8')
        ws = wb.add_sheet('Data')
        # styles
        al1 = Alignment()
        al1.horz = Alignment.HORZ_LEFT
        al1.vert = Alignment.VERT_TOP
        al1.wrap = Alignment.WRAP_AT_RIGHT
        font = Font()
        font.bold = True
        style1 = XFStyle()
        style1.alignment = al1
        style_header = XFStyle()
        style_header.alignment = al1
        style_header.font = font

        date_format = XFStyle()
        date_format.num_format_str = 'dd/mm/yyyy'
        datetime_format = XFStyle()
        datetime_format.num_format_str = 'dd/mm/yyyy HH:MM'

        #set header------------
        ws.write(0,0, u"ФИО".encode("utf-8"),style_header)
        ws.write(0,1, u"Дата".encode("utf-8"),style_header)
        ws.write(0,2, u"Договор".encode("utf-8"),style_header)
        ws.write(0,3, u"Заказ".encode("utf-8"),style_header)
        ws.write(0,4, u"Направление".encode("utf-8"),style_header)
        ws.write(0,5, u"Код участка".encode("utf-8"),style_header)
        ws.write(0,6, u"Участок".encode("utf-8"),style_header)
        ws.write(0,7, u"Таб. номер".encode("utf-8"),style_header)
        ws.write(0,8, u"Часы работы".encode("utf-8"),style_header)
        ws.write(0,9, u"Наряд".encode("utf-8"),style_header)

        # columns width
        ws.col(0).width = 256 * 45 # ФИО
        ws.col(1).width = 256 * 15 # Дата
        ws.col(2).width = 256 * 15 # Договор
        ws.col(3).width = 256 * 15 # Заказ
        ws.col(4).width = 256 * 15 # Направление
        ws.col(5).width = 256 * 15 # Код Участок
        ws.col(6).width = 256 * 45 # Участок
        ws.col(7).width = 256 * 15 # Таб. номер
        ws.col(8).width = 256 * 15 # Процент участия
        ws.col(9).width = 256 * 15 # Наряд

        rowIndex = 1
        for row in data:
            for w_row in row['wp_workers']:
                ws.write(rowIndex,0, w_row['user_fio'],style1)
                ws.write(rowIndex,1, row['wp_fact_date'],date_format)
                ws.write(rowIndex,2, row['contract_number'],style1)
                ws.write(rowIndex,3, row['order'],style1)
                ws.write(rowIndex,4, row['sector_type'] ,style1)
                ws.write(rowIndex,5, row['sector_code'] ,style1)
                ws.write(rowIndex,6, row['sector_name'] ,style1)
                ws.write(rowIndex,7, w_row['user_email'].split('@')[0] if w_row.get('user_email').replace('1_','') else '', style1)
                ws.write(rowIndex,8, w_row['proportion'],style1)
                ws.write(rowIndex,9, row['number'],style1)
                rowIndex+=1

        wb.save(output)
        output.seek(0)
        return output.read()

    def parse_params(params):
        result = {
            'orders':'',
            'sectors':'',
            'date_from': '',
            'date_to': '',
        }
        tmpCommands = params.split('/')
        if len(tmpCommands)>0:
            for key in result:
                i = 0
                for command in tmpCommands:
                    command = tmpCommands[i]
                    if key == command and (i+1) <= len(tmpCommands):
                        result[key] = tmpCommands[i+1]
                    i+=1

        if result['date_from']:
            result['date_from'] = result['date_from'].replace('_', '.')
            result['date_from'] = datetime.datetime.strptime(result['date_from'], '%d.%m.%Y')
        if result['date_to']:
            result['date_to'] = result['date_to'].replace('_', '.')
            result['date_to'] = datetime.datetime.strptime(result['date_to'], '%d.%m.%Y')
        if result['orders']:
            result['orders'] = result['orders'].split(',')
        else:
            result['orders'] = []
        if result['sectors']:
            result['sectors'] = result['sectors'].split(',')
        else:
            result['sectors'] = []
        return result

    try:
        userlib.check_page_access('stats','r')
        contract_number = None
        date_from = None
        date_to = None
        # params - /date_from/01_01_2018/date_to/14_02_2018/orders/520.6.1/sectors/1,2,3
        if params=='':
            return {'status':'error', 'msg':'No params'}
        result = []
        # получение данных
        data = workordermodel.get_fact_work_stat5(parse_params(params))

        if type=='xls':
            return make_xls(data)
        else:
            make_google(data)
            response.status = 303
            response.set_header('Location', 'https://docs.google.com/spreadsheets/d/1s2T4sZOF6vVMpGNmDdhMaAbEDMlODq1ZHfS6me_kcns/edit?usp=sharing')

    except Exception, exc:
        print_exc()
        return {'status':'error', 'msg':'Error! Msg: '+ str(exc)}


@get('/stats/joblog/vers4/<date_from>/<date_to>')
def joblog_vers4(date_from, date_to):
    '''
    #1660 (Выгрузка рабочих (КТУ) на указанный период - 2)
    Таб. номер,
    ФИО,
    Количество дней
  '''
    from xlwt import Workbook, XFStyle, Alignment, Font
    import StringIO

    userlib.check_page_access('stats','r')
    response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=UTF-8'
    response.headers['Content-Type'] = 'application/vnd.ms-excel'
    response.headers['Content-Disposition'] = 'attachment; filename=joblog_stat_' +datetime.datetime.utcnow().strftime('%d_%m_%Y_%H_%M_%S')+'.xls'

    try:
        # если не задан год, то выдавать ошибку
        if not date_from or not date_to:
            return {'status':'error', 'msg':'Wrang dates in query. Correct format: /2014-03-21/2014-04-21'}
        try:
            d1 = datetime.datetime.strptime(date_from, '%Y-%m-%d')
        except:
            return {'status':'error', 'msg':u'Wrang start date format. Correct format: /2014-03-21/2014-04-21'}
        try:
            d2 = datetime.datetime.strptime(date_to, '%Y-%m-%d')
        except:
            return {'status':'error', 'msg':u'Wrang finish date format. Correct format: /2014-03-21/2014-04-21'}

        result = []
        # получение данных
        data = workordermodel.get_fact_work_stat6(d1, d2)

        #Генерация XLS файла
        output = StringIO.StringIO()
        wb = Workbook(encoding='utf-8')
        ws = wb.add_sheet('Data')
        # styles
        al1 = Alignment()
        al1.horz = Alignment.HORZ_LEFT
        al1.vert = Alignment.VERT_TOP
        al1.wrap = Alignment.WRAP_AT_RIGHT
        font = Font()
        font.bold = True
        style1 = XFStyle()
        style1.alignment = al1
        style_header = XFStyle()
        style_header.alignment = al1
        style_header.font = font

        date_format = XFStyle()
        date_format.num_format_str = 'dd/mm/yyyy'
        datetime_format = XFStyle()
        datetime_format.num_format_str = 'dd/mm/yyyy HH:MM'

        #set header------------
        ws.write(0,0, u"ФИО".encode("utf-8"),style_header)
        ws.write(0,1, u"Таб. номер".encode("utf-8"),style_header)
        ws.write(0,2, u"Количество дней".encode("utf-8"),style_header)

        # columns width
        ws.col(0).width = 256 * 45 # ФИО
        ws.col(1).width = 256 * 15 # Таб. номер
        ws.col(2).width = 256 * 15 # Количество дней

        rowIndex = 1
        for row in data:
            ws.write(rowIndex,0, row['fio'],style1)
            ws.write(rowIndex,1, row['email'].split('@')[0] if row.get('email') else '',style1)
            ws.write(rowIndex,2, len(row['dates']),style1)
            rowIndex+=1

        wb.save(output)
        output.seek(0)
        return output.read()

    except Exception, exc:
        print('Error! joblog_vers4 ' + str(exc))
        print_exc()
        return {'status':'error', 'msg':'Error! Msg: '+ str(exc)}

@get('/stats/joblog/vers5/<date_from>/<date_to>')
def joblog_vers5(date_from, date_to):
    '''
    #1660 (Выгрузка рабочих (КТУ) на указанный период - 2)
    Таб. номер,
    ФИО,
    Количество дней
  '''

    from helpers.google_api import spreadsheet

    userlib.check_page_access('stats','r')
    usr = userlib.get_cur_user()

    try:
        # если не задан год, то выдавать ошибку
        if not date_from or not date_to:
            return {'status':'error', 'msg':'Wrang dates in query. Correct format: /2014-03-21/2014-04-21'}
        try:
            d1 = datetime.datetime.strptime(date_from, '%Y-%m-%d')
        except:
            return {'status':'error', 'msg':u'Wrang start date format. Correct format: /2014-03-21/2014-04-21'}
        try:
            d2 = datetime.datetime.strptime(date_to, '%Y-%m-%d')
        except:
            return {'status':'error', 'msg':u'Wrang finish date format. Correct format: /2014-03-21/2014-04-21'}

        result = []
        # получение данных
        data = workordermodel.get_fact_work_stat6(d1, d2)
        # объект для работы с требуемым spreadsheet
        spreadsheet_obj = spreadsheet.Spreadsheet(config.google_api_user, '1QcJnztHumtQ3ryLCtNEZrF88kFNLt4N3AqvNtEw4kv8')
        # получить необходимую страницу
        values = []
        for row in data:
            values.append([
                row['fio'],
                row['email'].split('@')[0] if row.get('email') else '',
                len(row['dates'])
            ])

        spreadsheet_obj.prepare_setValues(u'Данные','A2:C%d' % (1000), [['','',''] for i in xrange(997)])
        spreadsheet_obj.prepare_setValues(u'Данные','A2:C%d' % (len(values) + 3), values)
        spreadsheet_obj.runPrepared()
        #-------------------------------
        return routine.JSONEncoder().encode({'status':'ok', 'data': values})

    except Exception, exc:
        print('Error! joblog_vers5 ' + str(exc))
        print_exc()
        return {'status':'error', 'msg':'Error! Msg: '+ str(exc)}

@get('/stats/joblog/vers5/<date_from>/<date_to>/<key>')
def joblog_vers5(date_from, date_to, key):
    '''
    #1660 (Выгрузка рабочих (КТУ) на указанный период - 2)
    Вызов происходит из Google документа
    Таб. номер,
    ФИО,
    Количество дней
  '''

    from helpers.google_api import spreadsheet

    if key != '5a3a72a0ea62b9c8bea8b3aa':
        return {'status':'error', 'msg':'Invalid key'}

    try:
        # если не задан год, то выдавать ошибку
        if not date_from or not date_to:
            return {'status':'error', 'msg':'Wrang dates in query. Correct format: /2014-03-21/2014-04-21'}
        try:
            d1 = datetime.datetime.strptime(date_from, '%Y-%m-%d')
        except:
            return {'status':'error', 'msg':u'Wrang start date format. Correct format: /2014-03-21/2014-04-21'}
        try:
            d2 = datetime.datetime.strptime(date_to, '%Y-%m-%d')
        except:
            return {'status':'error', 'msg':u'Wrang finish date format. Correct format: /2014-03-21/2014-04-21'}

        result = []
        # получение данных
        data = workordermodel.get_fact_work_stat6(d1, d2)
        # объект для работы с требуемым spreadsheet
        spreadsheet_obj = spreadsheet.Spreadsheet(config.google_api_user, '1QcJnztHumtQ3ryLCtNEZrF88kFNLt4N3AqvNtEw4kv8')
        # получить необходимую страницу
        values = []
        for row in data:
            values.append([
                row['fio'],
                row['email'].split('@')[0] if row.get('email') else '',
                len(row['dates'])
            ])

        spreadsheet_obj.prepare_setValues(u'Данные','A2:C%d' % (1000), [['','',''] for i in xrange(997)])
        spreadsheet_obj.prepare_setValues(u'Данные','A2:C%d' % (len(values) + 3), values)
        spreadsheet_obj.runPrepared()
        #-------------------------------
        return routine.JSONEncoder().encode({'status':'ok', 'data': values})

    except Exception, exc:
        print('Error! joblog_vers5 ' + str(exc))
        print_exc()
        return {'status':'error', 'msg':'Error! Msg: '+ str(exc)}

@get('/stats/absence/vers1/')
def absence_vers1():
    '''
    #1961 (Выгрузка в таблицу)
  '''
    from models import usermodel
    from apis.staff import staffapi
    from helpers.google_api import spreadsheet

    def unpack_reason(key):
        reasons = [
            {'key': 'personal', 'name': 'по личным делам'},
            {'key': 'work', 'name': 'по рабочим делам'},
            {'key': 'holiday', 'name': 'отпуск'},
            {'key': 'business_trip', 'name': 'командировка'}
        ]
        return next((x for x in reasons if x['key'] == key))['name']

    try:
        userlib.check_page_access('stats','r')
        result = []

        users =  {}
        for row in  usermodel.get_list(None, {'email':1,'fio':1}):
            users[row['email']] = row


        # получение данных
        data = staffapi.get_all()
        # объект для работы с требуемым spreadsheet
        spreadsheet_obj = spreadsheet.Spreadsheet(config.google_api_user, '1SOBdZdFToBSj6qWrICU9umcWAEVIYcto55YLMb8t1bI')
        # получить необходимую страницу
        values = []

        tmp_notify_values = {'notify_moscow': 'Москва', 'notify_kaluga': 'Калуга','notify_penza': 'Пенза',}
        for row in data:
            tmp_notify = ''
            for key in ['notify_moscow', 'notify_kaluga', 'notify_penza']:
                if row.get(key):
                    tmp_notify += tmp_notify_values[key] + '; '


            date_from = ''
            date_to = ''

            if row.get('is_full_day') == 'yes':
                # date_from = (row['date_from'] + datetime.timedelta(hours=routine.moscow_tz_offset)).strftime('%d.%m.%Y') if row.get('date_from') else ''
                # date_to = (row['date_to'] + datetime.timedelta(hours=routine.moscow_tz_offset)).strftime('%d.%m.%Y') if row.get('date_to') else ''
                date_from = row['date_from'].strftime('%d.%m.%Y') if row.get('date_from') else ''
                date_to = row['date_to'].strftime('%d.%m.%Y') if row.get('date_to') else ''
            else:
                # date_from = (row['date_from'] + datetime.timedelta(hours=routine.moscow_tz_offset)).strftime('%d.%m.%Y %H:%M:%S') if row.get('date_from') else ''
                # date_to = (row['date_to'] + datetime.timedelta(hours=routine.moscow_tz_offset)).strftime('%d.%m.%Y %H:%M:%S') if row.get('date_to') else ''
                date_from = row['date_from'].strftime('%d.%m.%Y %H:%M:%S') if row.get('date_from') else ''
                date_to = row['date_to'].strftime('%d.%m.%Y %H:%M:%S') if row.get('date_to') else ''

            values.append([
                users[row['user']].get('fio', row['user']),
                date_from,
                date_to,
                unpack_reason(row['reason']),
                tmp_notify,
                row['comment']
            ])

        spreadsheet_obj.prepare_delete_all_rows_from(u'data', 1)
        spreadsheet_obj.prepare_add_rows(u'data', len(values))
        spreadsheet_obj.prepare_setValues(u'data','A2:F%d' % (len(values) + 3), values)
        spreadsheet_obj.runPrepared()
        #-------------------------------
        # return routine.JSONEncoder().encode({'status':'ok', 'data': values})
        response.status = 303
        response.set_header('Location', 'https://docs.google.com/spreadsheets/d/1SOBdZdFToBSj6qWrICU9umcWAEVIYcto55YLMb8t1bI/edit#gid=0')

    except Exception, exc:
        print('Error! joblog_vers5 ' + str(exc))
        print_exc()
        return {'status':'error', 'msg':'Error! Msg: '+ str(exc)}

@get('/stats/materials/groups_report/')
def materials_groups_report():
    '''
    #1968 (Выгрузка структуры в плоскую таблицу)
  '''
    from xlwt import Workbook, XFStyle, Alignment, Font
    import StringIO
    from apis.esud import esudapi

    userlib.check_page_access('stats','r')
    response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=UTF-8'
    response.headers['Content-Type'] = 'application/vnd.ms-excel'
    response.headers['Content-Disposition'] = 'attachment; filename=materials_groups_stat_' +datetime.datetime.utcnow().strftime('%d_%m_%Y_%H_%M_%S')+'.xls'

    try:
        data = esudapi.get_simple_dir_tree_with_sectors()
        #Генерация XLS файла
        output = StringIO.StringIO()
        wb = Workbook(encoding='utf-8')
        ws = wb.add_sheet('Data')
        # styles
        al1 = Alignment()
        al1.horz = Alignment.HORZ_LEFT
        al1.vert = Alignment.VERT_TOP
        al1.wrap = Alignment.WRAP_AT_RIGHT
        font = Font()
        font.bold = True
        style1 = XFStyle()
        style1.alignment = al1
        style_header = XFStyle()
        style_header.alignment = al1
        style_header.font = font

        #set header------------
        ws.write(0,0, u"Раздел".encode("utf-8"),style_header)
        ws.write(0,1, u"Категория".encode("utf-8"),style_header)
        ws.write(0,2, u"Группа".encode("utf-8"),style_header)

        # columns width
        ws.col(0).width = 256 * 25 # Раздел
        ws.col(1).width = 256 * 25 # Категория
        ws.col(2).width = 256 * 25 # Группа

        rowIndex = 1
        for sector in data:
            for category in sector.get('items',[]):
                for group in category.get('items',[]):
                    ws.write(rowIndex, 0, sector['name'], style1)
                    ws.write(rowIndex, 1, category['name'], style1)
                    ws.write(rowIndex, 2, group['name'], style1)
                    rowIndex+=1
        wb.save(output)
        output.seek(0)
        return output.read()

    except Exception, exc:
        print('Error! materials_groups_report ' + str(exc))
        print_exc()
        return {'status':'error', 'msg':'Error! Msg: '+ str(exc)}


@get('/stats/crm/vers10/<date_from>/<date_to>')
def crm_vers10(date_from, date_to):
    '''
    #1980 CRM. Активность менеджеров
    --------------------------------
    Менеджер
    Дата и время
    Состояний обновлено, всего
    Задач выполнено
    Задач поставлено
    Номер заявки
  '''

    from models import ordermodel

    from helpers.google_api import spreadsheet

    userlib.check_page_access('stats','r')
    usr = userlib.get_cur_user()

    try:
        # если не задан год, то выдавать ошибку
        if not date_from or not date_to:
            return {'status':'error', 'msg':'Wrang dates in query. Correct format: /2014-03-21/2014-04-21'}

        try:
            d1 = datetime.datetime.strptime(date_from, '%Y-%m-%d').replace(hour=0, minute=0, second=0, microsecond = 0)
            d1str = d1.strftime('%Y%m%d')
        except:
            return {'status':'error', 'msg':u'Wrang start date format. Correct format: /2014-03-21/2014-04-21'}

        try:
            d2 = datetime.datetime.strptime(date_to, '%Y-%m-%d').replace(hour=23, minute=59, second=59, microsecond = 0)
            d2str = d2.strftime('%Y%m%d')
        except:
            return {'status':'error', 'msg':u'Wrang finish date format. Correct format: /2014-03-21/2014-04-21'}

        values = []

        # получение всех задач, даты которых попали в указанный промежуток
        tasks_data = ordermodel.do_aggregate([
            {'$project': {
                'tasks':1,
                'number':1,
                '_id':1
            }},
            {'$unwind':'$tasks'},
            {'$project':{
                'datetime_str':{'$concat':[
                    {'$substr':['$tasks.datetime', 6,4]},
                    {'$substr':['$tasks.datetime', 3,2]},
                    {'$substr':['$tasks.datetime', 0,2]}
                ]},
                'finished_date_str':{'$concat':[
                    {'$substr':['$tasks.finished_date', 6,4]},
                    {'$substr':['$tasks.finished_date', 3,2]},
                    {'$substr':['$tasks.finished_date', 0,2]}
                ]},
                # 'closedatetime_str':{'$concat':[
                #   {'$substr':['$tasks.closedatetime', 6,4]},
                #   {'$substr':['$tasks.closedatetime', 3,2]},
                #   {'$substr':['$tasks.closedatetime', 0,2]}
                # ]},
                'manager': '$tasks.manager',
                'finished_manager': '$tasks.finished_manager',
                'datetime': '$tasks.datetime',
                'finished_date': '$tasks.finished_date',
                'closedatetime': '$tasks.closedatetime',
                'status': '$tasks.status',
                'comment': '$tasks.comment',
                '_id': 1,
                'number': 1
            }},
            {'$match':
                {
                    # 'number': 7981,
                    '$or':[
                        {
                            '$and':[
                                {'datetime_str':{'$gte':d1str}},
                                {'datetime_str':{'$lte':d2str}}
                            ]
                        },
                        {
                            '$and':[
                                {'finished_date_str':{'$gte':d1str}},
                                {'finished_date_str':{'$lte':d2str}}
                            ]
                        },
                        # {
                        #   '$and':[
                        #     {'closedatetime_str':{'$gte':d1str}},
                        #     {'closedatetime_str':{'$lte':d2str}}
                        #   ]
                        # },
                    ]}
            }
        ])

        history_data = ordermodel.do_aggregate([
            {'$project': {
                'history':1,
                'number':1,
                '_id':1
            }},
            {'$unwind':'$history'},
            {'$project':{
                'datetime_str':{'$concat':[
                    {'$substr':['$history.datetime', 6,4]},
                    {'$substr':['$history.datetime', 3,2]},
                    {'$substr':['$history.datetime', 0,2]}
                ]},
                'manager': '$history.manager',
                'datetime': '$history.datetime',
                'finishdate': '$history.finishdate',
                'enddate': '$history.enddate',
                'chance': '$history.chance',
                'prev_chance': '$history.prev_chance',
                '_id': 1,
                'number': 1
            }},
            {'$match':
                {
                    # 'number': 7981,
                    '$and':[
                        {'datetime_str':{'$gte':d1str}},
                        {'datetime_str':{'$lte':d2str}}
                    ]
                }
            }
        ])

        p_data = {}
        for row in history_data:
            key = '{0}_{1}_{2}'.format(row.get('manager','-'), row.get('number','-'), row.get('datetime','-'))
            if key and not key in p_data:
                p_data[key] = {
                    'manager': row.get('manager',''),
                    'number': row.get('number',''),
                    'date': routine.strToDateTime(row.get('datetime')),
                    'history': 0,
                    'history_inc': 0,
                    'history_dec': 0,
                    'tasks': 0,
                    'completed_tasks': 0,
                    'canceled_tasks': 0
                }

            if row.get('chance') and row.get('prev_chance'):
                if row['chance'] > row['prev_chance']:
                    p_data[key]['history_inc']+=1
                elif row['chance'] == row['prev_chance']:
                    p_data[key]['history']+=1
                else:
                    p_data[key]['history_dec']+=1
            else:
                p_data[key]['history']+=1

        for row in tasks_data:
            first_key = '{0}_{1}_{2}'.format(row.get('manager','-'), row.get('number','-'), row.get('datetime','-'))
            second_key = '{0}_{1}_{2}'.format(row.get('manager','-'), row.get('number','-'), row.get('finished_date','-'))

            if row.get('datetime') and first_key == second_key:
                if not first_key in p_data:
                    p_data[first_key] = {
                        'manager': row.get('manager', ''),
                        'number': row.get('number', ''),
                        'date': routine.strToDateTime(row.get('datetime')),
                        'history': 0,
                        'history_inc': 0,
                        'history_dec': 0,
                        'tasks': 0,
                        'completed_tasks': 0,
                        'canceled_tasks': 0
                    }
                    p_data[first_key]['tasks'] += 1
                    if row.get('status') == u'отменена':
                        p_data[first_key]['canceled_tasks'] += 1
                    else:
                        p_data[first_key]['completed_tasks'] += 1
            else:
                if row.get('datetime') and row['datetime_str'] >= d1str and row['datetime_str'] <= d2str and not first_key in p_data:
                    p_data[first_key] = {
                        'manager': row.get('manager', ''),
                        'number': row.get('number', ''),
                        'date': routine.strToDateTime(row.get('datetime')),
                        'history': 0,
                        'history_inc': 0,
                        'history_dec': 0,
                        'tasks': 0,
                        'completed_tasks': 0,
                        'canceled_tasks': 0
                    }
                    p_data[first_key]['tasks'] += 1

                if row.get('finished_date') and row['finished_date_str'] >= d1str and row['finished_date_str'] <= d2str and not second_key in p_data:
                    p_data[second_key] = {
                        'manager': row.get('manager', ''),
                        'number': row.get('number', ''),
                        'date':  routine.strToDateTime(row.get('finished_date', None)),
                        'history': 0,
                        'history_inc': 0,
                        'history_dec': 0,
                        'tasks': 0,
                        'completed_tasks': 0,
                        'canceled_tasks': 0
                    }

                    if row.get('status') == u'отменена':
                        p_data[second_key]['canceled_tasks'] += 1
                    else:
                        p_data[second_key]['completed_tasks'] += 1

        users =  {}
        for row in usermodel.get_list(None, {'email' : 1, 'fio' : 1}):
            users[row['email']] = row

        p_data = p_data.values()
        p_data.sort(key = lambda x: (x['date']))

        for row in p_data:
            values.append([
                users[row['manager']].get('fio') if row['manager'] in users and users[row['manager']] else '-',
                (row['date'] + datetime.timedelta(hours=routine.moscow_tz_offset)).strftime('%d.%m.%Y %H:%M:%S') if row['date'] else '',
                row['history_inc'],
                row['history'],
                row['history_dec'],
                row['completed_tasks'],
                row['tasks'],
                row['canceled_tasks'],
                routine.strToInt(row['number'])
            ])

        spreadsheet_obj = spreadsheet.Spreadsheet(config.google_api_user, '1jNHlqZfBL1HFC9hxGpwoWv-VuTXPq79X0u48vj5tiBk')
        spreadsheet_obj.prepare_delete_all_rows_from(u'Данные', 1)
        spreadsheet_obj.prepare_add_rows(u'Данные', len(values))
        spreadsheet_obj.prepare_setValues(u'Данные','A2:I%d' % (len(values) + 3), values)
        spreadsheet_obj.runPrepared()

        # return routine.JSONEncoder().encode({'status':'ok', 'data': values})
        response.status = 303
        response.set_header('Location', 'https://docs.google.com/spreadsheets/d/1jNHlqZfBL1HFC9hxGpwoWv-VuTXPq79X0u48vj5tiBk/edit#gid=199077734')

    except Exception, exc:
        print('Error! crm_vers10 ' + str(exc))
        print_exc()
        return {'status':'error', 'msg':'Error! Msg: '+ str(exc)}


@get('/stats/esud/templates')
def esud_templates():
    '''
    #Выгрузка всех шаблнов раскроя
    Название,
    Входящий материал,
    Исходящий материал
  '''
    from xlwt import Workbook, XFStyle, Alignment, Font
    import StringIO

    from classes.productionorder.templatemanager import *

    userlib.check_page_access('stats','r')
    response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=UTF-8'
    response.headers['Content-Type'] = 'application/vnd.ms-excel'
    response.headers['Content-Disposition'] = 'attachment; filename=esud_templates_' +datetime.datetime.utcnow().strftime('%d_%m_%Y_%H_%M_%S')+'.xls'

    try:
        result = []
        # получение данных
        list = datamodel.get_structured(None,None)
        templateBuilder = TemplateBuilder(list)
        templates = templateBuilder._templates

        for row in templates:
            tmp  = {
                'name': row['name'],
                'count': row['count'],
                'in': '; '.join([i for i in row['in_objects']]),
                'out': '; '.join([i['name'] for i in row['out_objects']]),
            }
            result.append(tmp)

        #Генерация XLS файла
        output = StringIO.StringIO()
        wb = Workbook(encoding='utf-8')
        ws = wb.add_sheet('Data')
        # styles
        al1 = Alignment()
        al1.horz = Alignment.HORZ_LEFT
        al1.vert = Alignment.VERT_TOP
        al1.wrap = Alignment.WRAP_AT_RIGHT
        font = Font()
        font.bold = True
        style1 = XFStyle()
        style1.alignment = al1
        style_header = XFStyle()
        style_header.alignment = al1
        style_header.font = font

        date_format = XFStyle()
        date_format.num_format_str = 'dd/mm/yyyy'
        datetime_format = XFStyle()
        datetime_format.num_format_str = 'dd/mm/yyyy HH:MM'

        #set header------------
        ws.write(0,0, u"Шаблон".encode("utf-8"),style_header)
        ws.write(0,1, u"Вход".encode("utf-8"),style_header)
        ws.write(0,2, u"Выход".encode("utf-8"),style_header)

        # columns width
        ws.col(0).width = 256 * 45 # Шаблон
        ws.col(1).width = 256 * 45 # Вход
        ws.col(2).width = 256 * 45 # Выход

        rowIndex = 1
        for row in result:
            ws.write(rowIndex,0, row['name'],style1)
            ws.write(rowIndex,1, row['in'],style1)
            ws.write(rowIndex,2, row['out'],style1)
            rowIndex+=1

        wb.save(output)
        output.seek(0)
        return output.read()

    except Exception, exc:
        print('Error! esud_template ' + str(exc))
        print_exc()
        return {'status':'error', 'msg':'Error! Msg: '+ str(exc)}
