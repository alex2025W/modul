#!/usr/bin/python
# -*- coding: utf-8 -*-
import datetime, time, routine, config
from bson.objectid import ObjectId
from bson.binary import Binary
from apis.esud import esudspecificationapi, esudapi
from models import productionordermodel, stockmodel, specificationmodel, datamodel, queuemodel, countersmodel
from copy import deepcopy,copy
import math
from traceback import print_exc
import re
import hashlib
import gc

def api_background_calculate(data, queue_key=None):
  '''
    Расчет данных для задания на производство по заданным спецификациям
    queue_key - флаг, указывающий на необходимость проведения данных через БД (для щагрузки через очередь)
    если флаг не задан, то идет линейное формирование данных и возврат результата
    data = {
          'use_returned_waste': false, #использовать при рассчетах возвратный отход
          'use_not_returned_waste': false, #использовать при рассчетах невозвратный отход
          'use_stock': false, # использовать склад
          'stock_order_number': '', # использовать позиции со склада только относящиеся к указанному заказу
          'specifications': ['number': '541.00.001', 'count': 1], # список номеров спецификаций по котором вести рассчет
          ''
        }
  '''
  try:
    from models import specificationmodel,stockmodel
    from apis.esud import esudspecificationapi
    # классы для управления расчетами
    from classes.productionorder.stockmanager import *
    from classes.productionorder.templatemanager import *
    from classes.productionorder import calculator
    from classes.productionorder.calculator import *
    from classes.progressmanager import *

    # объект управления прогрессом выполнения расчетов
    progressManager = ProgressManager(queue_key)

    # проверка на входные параметры
    percent_complete =10;
    if not data.get('specifications'):
      progressManager.error('Заданы неверные параметры для получения данных.')
      return

    # использовать склад
    use_stock = True if data.get('use_stock') == 'yes' else False
    # номер заказа для склада по которому можно осуществить отбор складсикх едниц
    stock_order_number = data.get('stock_order_number', '')
    # использовать возвратный отход при подборе шаблонов раскроя
    use_returned_waste = True if data.get('use_returned_waste') == 'yes' else False
    # использовать невозвратный отход при подборе шаблонов раскроя
    use_not_returned_waste = True if data.get('use_not_returned_waste') == 'yes' else False
    # использовать шаблоны раскроя
    use_cut_templates = True if data.get('use_cut_templates') == 'yes' else False
    # использовать склад
    use_stock = True if data.get('use_stock') == 'yes' else False
    # отправить результат расчета в google
    send_to_google = True if data.get('send_to_google') == 'yes' else False

    # объединение объемов  спецификаций, поданных на рассчет
    specifications = {}
    for row in data['specifications']:
      if not row['number'] in specifications:
        row['count'] = routine.strToInt(row['count'])
        specifications[row['number']] = row
      else:
        specifications[row['number']]['count']+=routine.strToInt(row['count'])

    # если не заданы спецификации для рассчета
    if len(specifications)==0:
      progressManager.error('Заданы неверные параметры для получения данных.')
      return

    # выставление процента исполнения задания
    if queue_key:
      progressManager.progress(20)

    # вытянуть информацию по существующим специфкациям
    search_spec_numbers = [number for number in specifications]
    # проверка спецификаций на наличие заполненных КЭШ структур
    esudspecificationapi.rebuild_specifications_cache(search_spec_numbers)
    # получение информации о спецификациях поданных на рассчет
    data_specifications_info =specificationmodel.get_list_by({'number': {'$in': search_spec_numbers} })
    # если указанные для рассчета спецификации не существуют
    if not data_specifications_info or len(data_specifications_info)==0:
      progressManager.error('Указанные в расчете спецификации не существуют.')
      return

    #----- Начало расчетов-------------------------------------------------------------------------------------------------------------------------------
    start = time.clock()
    # помечаем переданные на расчет спецификации, как базовые и идущие на склад
    # спецификации с пометкой - базовая не попадает в задание на производство
    # в задание на производства попадают все составные части базовой спецификации
    for row in data_specifications_info:
      row['base_elem'] = True
      row['parent_sector'] ={'name': 'Склад'}
    # Получение инфомации обо всех спецификациях, со всех уровней, участвующих в расчетах
    include_ids = []
    all_specifications_short_data_info = {}
    for row in data_specifications_info:
      include_ids.append(row['_id'])
      for include in row['include']:
        include_ids.append(include['_id'])
    tmp_data = specificationmodel.get_short({'_id': {'$in':include_ids}})
    for row in tmp_data:
      all_specifications_short_data_info[str(row['_id'])] = row

    # получение объемов со склада в рамках заказа
    # возможна оптимизация, если брать со склада не все объемы в рамках заказа
    # а только требуемые по структуре расчета
    # Проблемма в том, что при собственном раскрое мы не знаем, какие обемы нам понадобятся со склада
    stock_items = []
    if use_stock:
      #stock_items = stockmodel.get_actual_volumes(include_ids, stock_order_number)
      stock_items = stockmodel.get_actual_volumes(None, stock_order_number)

    # группировка складских объемов по изделиям
    # объемы не суммируются, а представляются как элемент массива, каждый объем может быть списан отдельно
    grouped_stock_items = {}
    for s_i in stock_items:
      if str(s_i['item']['_id']) not in grouped_stock_items:
        grouped_stock_items[str(s_i['item']['_id'])] = []
      grouped_stock_items[str(s_i['item']['_id'])].append(s_i)
    print "Time get stock data is: ", time.clock() - start
    progressManager.progress(30)

    # применение склада к исходным спецификациям----------------------------------------------------------------------------------------------------------
    # данный блок необходим, в том случае, если на складе есть требуемое количество изделий по заданию
    # в таком случае расчет объемов не требуется, так как весь требуемый объем изначально можно получить на складе
    # также в данном блоке происходит заполнение составных спецификаций, из которых состоит текущая
    start = time.clock()
    for data_info in data_specifications_info:
      count = routine.strToInt(specifications[data_info['number']]['count'])
      data_info['count_from_stock'] = {'value': 0, 'items': []}
      data_info['count_to_produce'] = {'value': count }
      # запоминаем исходный требуемый объем для производства
      data_info['count']['origin_count'] = data_info['count'].get('value',1)*count
      stock_items = grouped_stock_items.get(str(data_info['_id']),[])
      # функция забора складских объемов
      StockManager.calculate_stock_volume(data_info, stock_items, count)
      count = count - data_info['count_from_stock']['value']
      data_info['count_to_produce']['value'] = count
      data_info['count']['value'] = data_info['count']['origin_count']
      # заполнение структуры спецификации
      include_objects = {}
      include_ids = []
      # построение дерева спецификации
      if len(data_info['include'])>0:
        esudspecificationapi.fill_specification_structure(all_specifications_short_data_info, routine.JSONDecode(data_info['struct']), count, data_info)
        del data_info['struct']
    print 'Time build structure for inner specifications is: ', time.clock() - start

    # получение данных ЭСУД
    list = datamodel.get_structured(None,None)
    # выполнение расчетов-------------------------------------------------------------------------------------------------------------------------------------
    start = time.clock()
    result = calculator.calculate(list, all_specifications_short_data_info, data_specifications_info, grouped_stock_items, use_cut_templates, use_returned_waste, use_not_returned_waste, progressManager)
    print 'Time calculate all data is: ', time.clock() - start
    #---------------------------------------------------------------------------------------------------------------------------------------------------------------------------

    # результирующий объект
    res = routine.JSONEncoder().encode({
      'status': 'success',
      'data':{
        'buy_items': result['buy_items'],
        'own_items': result['own_items'],
        'sorted_sectors': result['sorted_sectors']
      },
      'errors':[],
      'templates': None
    })

    if queue_key:
      start = time.clock()
      # если данные необходимо отправить в google
      if send_to_google:
        send_calculation_to_google(result['buy_items'])

      progressManager.complete('', Binary(routine.compress(res)))
      print 'Zip and get data is: ', time.clock() - start
      gc.collect()
    else:
      if send_to_google:
        send_calculation_to_google(result['buy_items'])
      return res

  except Exception, exc:
    excType = exc.__class__.__name__
    print_exc()
    if queue_key:
      queuemodel.update(queue_key, {'status': 'error', 'note': str(exc), 'data': None, 'finish_date': datetime.datetime.utcnow() })
    else:
      raise Exception(str(exc))

def add_production_order(data, usr):
  '''
    Функция добавления нового задания на производство
  '''

  # внутренняя функция подготовки шаблонов раскроя к сохранению в задание
  def prepare_templates(templates):
    if templates:
      for template in templates:
        if template['template'].get('in_specification'):
          template['template']['in_specification'] = {
            '_id': template['template']['in_specification']['_id'],
            'number': template['template']['in_specification']['number'],
            'name': template['template']['in_specification']['name'],
          }
        for out_object in template['template'].get('out_objects',[]):
          if out_object.get('selected_specification'):
            out_object['selected_specification'] = {
              '_id': out_object['selected_specification']['_id'],
              'number': out_object['selected_specification']['number'],
              'name': out_object['selected_specification']['name'],
            }
    return templates

  # внутренняя функция подготовки данных для сохранения
  def prepare_data(data, usr):
    ''''
      Подготовка данных к сохранению.
      Входной формат: {'own_items':[], 'buy_items':[] }
      Результат: {'productinon_order':{}, 'items_to_stock': [] }
      productinon_order - заказ на производство
      stock_data - объекты на склад
    '''
    result = {'production_order':{}, 'items_to_stock':[]}

    # список комплектов, заданных при расчете
    complects = []
    for complect in data.get('complects', []):
      complects.append({
        'number': complect['number'],
        'count': complect['count'],
        'name': complect['name']
      })

    # список изделий на производсьво, сгруппированные по участкам
    items_to_develop_grouped_by_sectors = {}
    # список иделий для склада
    items_to_stock = []
    # заказ на производство
    production_order = {
      '_id': ObjectId(),
      'number': countersmodel.get_next_sequence('production_order'),
      'items_to_buy': [], # объекты на закупку
      'items_to_develop': [], # объеты на производство
      'work_orders': [], # наряды
      'products': [], # изделия по которым выполнялся расчет
      'complects': complects, # комплекты, заданные при расчете
      'use_complect': not data.get("uncomplect", True),
      'history': [{
        "_id": ObjectId(),
        "type" : "add",
        "user" : usr['email'],
        "date" : datetime.datetime.utcnow()
      }],
      'order': {
        'contract_number': data['order_number_items'][0],
        'product_number': data['order_number_items'][1],
        'product_unit_number': data['order_number_items'][2],
        'number': data['order_number']
      }
    }
    # ------------
    # добавление покупных изделий в заказ на производство
    # ------------
    for row in data['buy_items']:
      # объем на закупку
      from_stock = None
      if row['elem']['count_from_stock']['value']>0:
        items_from_stock = []
        for s_i in row['elem']['count_from_stock']['items']:
          items_from_stock.append({
            '_id': ObjectId(s_i['_id']), # идентификатор складской единицы
            'spec_id': row['elem']['_id'], # идентификатор спецификации
            'spec_number': row['elem']['number'],
            'count': {
              'value': s_i['value'],
              'unit': row['elem']['count']['unit'],
            }
          })
        from_stock = {
          'value' : row['elem']['count_from_stock']['value'],
          'unit': row['elem']['count']['unit'],
          'items': items_from_stock
        }

      # сбор уникальных свойств спецификации
      unique_props = '; '.join([value['name'] + ": " + str(value['value']) + (value['unit'] if value['unit'] else '') for value in row['elem']['properties'] if value.get('is_optional') and not value.get('is_techno') ] if len(row['elem'].get('properties',[])or [])>0 else [])

      # требуемый объем с учетом отходов и штук
      count_value = row['elem']['count']['value'] if not 'vol_full' in row['elem'] or row['elem']['vol_full']==0  else row['elem']['vol_full']
      if count_value>0:
        new_item = {
          '_id' : row['elem']['_id'], # id спецификации
          'number':row['elem']['number'], # артикул спецификации
          'config_number':row['elem']['config_number'], # артикул конфигурации
          'name':row['elem']['name'], # название спецификации
          'sector': row['elem'].get('parent_sector', None), # участок на который требуется изделие
          'unique_props': unique_props , # уникальные свойства
          # требуемый объем
          'count': {
            'value': count_value,
            'vol_amount': row['elem'].get('vol_amount',0), # объем в штуках
            'vol_by_norm': row['elem']['count']['value'], # чистый расход(по норме)
            'vol_full_waste': row['elem'].get('vol_full_waste',0), # полный отход
            'vol_returned_waste': row['elem'].get('vol_returned_waste',0), # возвратный отход
            'vol_not_returned_waste': row['elem'].get('vol_not_returned_waste',0), # невозвратный отход
            'vol_not_defined_waste': row['elem'].get('vol_not_defined_waste',0), # неопределенный отход
            'unit': row['elem']['count']['unit']
          },
          # объем на единицу изделия
          'vol_per_unit': row['elem'].get('vol_per_unit', None) if row['elem'].get('vol_per_unit', {}).get('value') else None,
          # объем допуска
          'vol_tolerance': row['elem'].get('vol_tolerance', None) if row['elem'].get('vol_tolerance', {}).get('value') else None,
          # объем допуска
          'tolerance_on_vol': row['elem'].get('tolerance_on_vol', None) if row['elem'].get('tolerance_on_vol', {}).get('value') else None,
          # объем на закупку
          'to_buy': {
            'value': (row['elem']['count']['value'] if not 'vol_full' in row['elem'] or row['elem']['vol_full']==0 else row['elem']['vol_full']) - row['elem']['count_from_stock']['value'],
            'vol_amount': row['elem'].get('vol_amount',0), # объем в штуках
            'vol_by_norm': row['elem']['count']['value'], # чистый расход(по норме)
            'vol_full_waste': row['elem'].get('vol_full_waste',0), # полный отход
            'vol_returned_waste': row['elem'].get('vol_returned_waste',0), # возвратный отход
            'vol_not_returned_waste': row['elem'].get('vol_not_returned_waste',0), # невозвратный отход
            'vol_not_defined_waste': row['elem'].get('vol_not_defined_waste',0), # неопределенный отход
            'unit' : row['elem']['count']['unit'],
            # список единиц изделий (шкаф1, шкаф2...), пока только 1
            'items': [{
              '_id': ObjectId(),
              'spec_id': row['elem']['_id'],
              'spec_number': row['elem']['number'],
              'count': {
                'value': row['elem']['count']['value'] if not 'vol_full' in row['elem'] or row['elem']['vol_full']==0 else row['elem']['vol_full'],
                'vol_amount': row['elem'].get('vol_amount',0), # объем в штуках
                'vol_by_norm': row['elem']['count']['value'], # чистый расход(по норме)
                'vol_full_waste': row['elem'].get('vol_full_waste',0), # полный отход
                'vol_returned_waste': row['elem'].get('vol_returned_waste',0), # возвратный отход
                'vol_not_returned_waste': row['elem'].get('vol_not_returned_waste',0), # невозвратный отход
                'vol_not_defined_waste': row['elem'].get('vol_not_defined_waste',0), # неопределенный отход
                'unit' : row['elem']['count']['unit'],
              }
            }]
          },
          # объем со склада
          'from_stock': from_stock,
          # были ли применены шаблоны раскроя
          'templates': prepare_templates(row.get('templates'))
        }
        # добавление объекта в результирующий список
        production_order['items_to_buy'].append(new_item)

    # ------------
    # добавление изготавливаемых изделий в заказ на производство
    # ------------
    for row in data['own_items']:
      from_stock = None
      new_item = None
      if row['elem']['count_from_stock']['value']>0:
        items_from_stock = []
        for s_i in row['elem']['count_from_stock']['items']:
          items_from_stock.append({
            '_id': ObjectId(s_i['_id']), # идентификатор складской единицы
            'spec_id': row['elem']['_id'], # идентификатор спецификации
            'spec_number': row['elem']['number'],
            'count': {
              'value': s_i['value'],
              'unit': row['elem']['count']['unit'],
            }
          })
        from_stock = {
          'value' : row['elem']['count_from_stock']['value'],
          'unit': row['elem']['count']['unit'],
          'items': items_from_stock
        }

      if row['elem'].get('to_stock') or row['elem'].get('selected_specification'):
        if not row['elem']['selected_specification']:
          raise Exception("Ошибка! Для конфигурации: {0} не задана спецификация.".format(row['elem']['number']))
        s_row = row['elem']['selected_specification']

        # сбор уникальных свойств спецификации
        unique_props = '; '.join([value['name'] + ": " + str(value['value']) + (value['unit'] if value['unit'] else '') for value in s_row['properties'] if value.get('is_optional') and not value.get('is_techno') ] if len(s_row.get('properties',[])or[])>0 else [])

        if row['elem']['count']['value']>0:
          new_item = {
            '_id' : s_row['_id'], # id спецификации
            'base_elem': row['elem'].get('base_elem', False), # изделие по которому ведется расчет всего задания
            'number':s_row['number'], # артикул спецификации
            'config_number':s_row['config_number'], # артикул конфигурации
            'name':s_row['name'], # название спецификации
            'sector': s_row.get('sector', None), # участок на котором производится изделие
            'parent_sector': row['elem'].get('parent_sector', None), # участок на который требуется изделие
            'unique_props': unique_props,
            # требуемый объем
            'count': {
              'value': row['elem']['count']['value'],
              'unit': s_row['count']['unit']
            },
            # объем на единицу изделия
            'vol_per_unit': s_row.get('vol_per_unit', None) if s_row.get('vol_per_unit', {}).get('value') else None,
            # объем допуска
            'vol_tolerance': s_row.get('vol_tolerance', None) if s_row.get('vol_tolerance', {}).get('value') else None,
            # допуск на объем
            'tolerance_on_vol': s_row.get('tolerance_on_vol', None) if s_row.get('tolerance_on_vol', {}).get('value') else None,
            # объем на изготавление
            'to_develop': {
              'value': row['elem']['count_to_produce']['value'],
              'unit' : s_row['count']['unit'],
              'items': [] # список единиц изделий (шкаф1, шкаф2...)
            },
            # объем со склада
            'from_stock': from_stock,

            # были ли применены шаблоны раскроя
            'templates': prepare_templates(row.get('templates'))
          }
      else:
        # сбор уникальных свойств спецификации
        unique_props = '; '.join([value['name'] + ": " + str(value['value']) + (value['unit'] if value['unit'] else '') for value in row['elem']['properties'] if value.get('is_optional') and not value.get('is_techno') ] if len(row['elem'].get('properties',[]) or [])>0 else [])
        if row['elem']['count']['value']>0:
          new_item = {
            '_id' : row['elem']['_id'], # id спецификации
            'base_elem': row['elem'].get('base_elem', False), # изделие по которому ведется расчет всего задания
            'number':row['elem']['number'], # артикул спецификации
            'config_number':row['elem']['config_number'], # артикул конфигурации
            'name':row['elem']['name'], # название спецификации
            'sector': row['elem'].get('sector', None), # участок на котором производится изделие
            'parent_sector': row['elem'].get('parent_sector', None), # участок на который требуется изделие
            'unique_props': unique_props,
            # требуемый объем
            'count': {
              'value': row['elem']['count']['value'],
              'unit': row['elem']['count']['unit']
            },
            # объем на единицу изделия
            'vol_per_unit': row['elem'].get('vol_per_unit', None) if row['elem'].get('vol_per_unit', {}).get('value') else None,
            # объем допуска
            'vol_tolerance': row['elem'].get('vol_tolerance', None) if row['elem'].get('vol_tolerance', {}).get('value') else None,
            # допуск на объем
            'tolerance_on_vol': row['elem'].get('tolerance_on_vol', None) if row['elem'].get('tolerance_on_vol', {}).get('value') else None,

            # объем на изготавление
            'to_develop': {
              'value': row['elem']['count_to_produce']['value'],
              'unit' : row['elem']['count']['unit'],
              'items': [] # список единиц изделий (шкаф1, шкаф2...)
            },
            # объем со склада
            'from_stock': from_stock,
            # были ли применены шаблоны раскроя
            'templates': prepare_templates(row.get('templates'))
          }

      # # заполнение единиц изделий на изготавление
      # if new_item['to_develop']['value'] >0:
      #   i = 1
      #   while i < new_item['to_develop']['value']+1:
      #     new_item['to_develop']['items'].append({
      #         '_id': ObjectId(),
      #         'item_number': i, # внутренний номер в рамках заказа на производство
      #         'spec_id': new_item['_id'],
      #         'spec_number': new_item['number'],
      #         'count': {
      #           'value': 1,
      #           'unit': new_item['count']['unit']
      #         }
      #       })
      #     i+=1

      if new_item:
        new_item['to_develop']['items'].append({
          '_id': ObjectId(),
          'item_number': 1, # внутренний номер в рамках заказа на производство
          'spec_id': new_item['_id'],
          'spec_number': new_item['number'],
          'count': {
            'value': new_item['to_develop']['value'],
            'unit': new_item['count']['unit']
          }
        })

        # группировка по участкам
        item_sector_name = (new_item.get('sector', {}) or {}) .get('name', 'Не задан')
        if item_sector_name not in items_to_develop_grouped_by_sectors:
          items_to_develop_grouped_by_sectors[item_sector_name] = {'sector': row['elem'].get('sector'), 'items': [] }
        items_to_develop_grouped_by_sectors[item_sector_name]['items'].append(new_item)

        # добавление объекта в результирующий список
        production_order['items_to_develop'].append(new_item)

        # Вынос информации о спецификации по которой велся изначальный расчет объемов
        # на верхний уровень задания
        if row['elem'].get('base_elem',False):
          production_order['products'].append({
            '_id' :new_item['_id'], # id спецификации
            'number':new_item['number'], # артикул спецификации
            'name':new_item['name'], # название спецификации
            'count': new_item['count']# требуемый объем
          })

    # # ------------
    # # Создание нарядов
    # # На спецификацию по которой ведется первоначальный расчет, наряд не выдается
    # # ------------
    # for sector_key in items_to_develop_grouped_by_sectors:
    #   items = []
    #   for row in items_to_develop_grouped_by_sectors[sector_key]['items']:
    #     # если не спецификация по которой ведется изначальный расчет объемов
    #     # if not row.get('base_elem',False):
    #     if len(row['to_develop']['items'])>0:
    #       # поиск в наряде текущей работы, если работа уже есть в наряде, то
    #       # то сумируем количество. Это возможно, если часть изделий идет на другие участки,
    #       # а часть на склад
    #       old_item = None
    #       try:
    #         old_item = deepcopy( (i for i in items if str(i['_id']) == str(row['_id'])).next())
    #       except:
    #         pass

    #       if old_item:
    #         old_item['count']['value']+=row['count']['value']
    #         old_item['to_develop']['value']+=row['to_develop']['value']
    #         old_item['to_develop']['items'].extend(row['to_develop']['items'])
    #       else:
    #         items.append({
    #             '_id': row['_id'], # идентификатор спецификации
    #             'number':row['number'], # артикул спецификации
    #             'config_number':row['config_number'], # артикул конфигурации
    #             'name':row['name'], # название спецификации
    #             'sector': row['sector'], # участок на котором производится изделие
    #             'parent_sector': row['parent_sector'], # участок на который требуется изделие
    #             'unique_props': row['unique_props'], # уникальные свойства
    #             'count': row['count'], # требуемый объем
    #             'to_develop': row['to_develop'], # объем на изготавление
    #             'status': '',
    #             'date_start': None,
    #             'date_finish': None,
    #             'fact_work': [],
    #             'status_log': [],
    #             'date_start_with_shift': None,
    #             'date_finish_with_shift': None
    #           })

    #   # если есть на участке элементы на производство, то создается наряд
    #   if len(items)>0:
    #     sector = items_to_develop_grouped_by_sectors[sector_key]['sector']
    #     new_item = {
    #         '_id': ObjectId(),
    #         'number': countersmodel.get_next_sequence('new_workorders'),
    #         'sector':sector,
    #         'status': '',
    #         'status_date': None,
    #         'date_start': None,
    #         'date_finish': None,
    #         'date_start_with_shift': None,
    #         'date_finish_with_shift': None,
    #         'workers_participation': [], # трудовое участие
    #         'history': [{
    #           "_id": ObjectId(),
    #           "type" : "add",
    #           "user" : usr['email'],
    #           "date" : datetime.datetime.utcnow()
    #         }],
    #         'items': items # плановые работы наряда
    #       }
    #     production_order['work_orders'].append(new_item)

    # ------------
    # Заполнение объектов для сохранения на складе
    # ------------
    for row in production_order['items_to_develop']:
      if row['parent_sector'].get('name','') == u'Склад' or row.get('to_stock'):
        for row_item in row['to_develop']['items']:
          if row_item['count']['value']>0:
            items_to_stock.append({
                '_id': row_item['_id'], # id складской единицы
                #'status': 'develop', # статус  "в производстве""
                'can_be_divided': 'yes', # может делиться
                # информация о задании на проивзодство(откуда возникло изделие)
                'production_orders':[{
                  '_id': production_order['_id'],
                  'number': production_order['number'],
                }],
                # информация о заказе
                'order':production_order['order'],
                # описание спецификации
                'item':{
                  '_id': row['_id'], # идентификатор спецификации
                  'number':row['number'], # артикул спецификации
                  'name':row['name'], # название спецификации
                },
                # текущий объем
                'count': {
                  'unit': row_item['count']['unit'],
                  'value': row_item['count']['value'],    # объем по заданию
                  'current_value': row_item['count']['value'],  # текущий объем
                  'received_value': 0,        # исполненный(полученный) объем
                  'develop_value': 0,       # объем в производстве
                  'used_value': 0,        # использованный объем
                },
                # история изменения объемов
                'history':[{
                  '_id': ObjectId(),
                  'value': row_item['count']['value'],
                  'current_value': row_item['count']['value'],
                  'note': '',
                  'production_order':{
                    '_id': production_order['_id'],
                    'number': production_order['number']
                  },
                  'order':production_order['order'],
                  'item': {
                    'spec_id': row['_id'],
                    'spec_number': row['number']
                  },
                  'user' : usr['email'],
                  'date' : datetime.datetime.utcnow(),
                  'status': 'order' # изначально статус - в заказе
                }],
                # история актуальных остатков
                'remains':[]
              })
    # ------------
    # Заполнение результата
    # ------------
    result['production_order'] = production_order
    result['items_to_stock'] = items_to_stock
    return result

  # Внутренняя функция проверки актуальности объемов на складе
  def check_stock_data(data):
    '''
      Проверка задействованных объемов со склада.
      Если на складе какой-лбо объем был израсходован, то генерится исключение
    '''
    data_stock = []
    stock_volumes = {}
    for row in data['own_items']:
      if (row['elem'].get('count_from_stock',{})or {}).get('value',0)>0:
        for s_i in row['elem']['count_from_stock']['items']:
          if s_i['_id'] not in stock_volumes:
            stock_volumes[s_i['_id']] = {'value':0, 'use_in':[] }
          stock_volumes[s_i['_id']]['value']+=s_i['value']
          stock_volumes[s_i['_id']]['use_in'].append({
              '_id': row['elem']['_id'],
              'number': row['elem']['number'],
              'volume': s_i['value']
            })

    for row in data['buy_items']:
      if (row['elem'].get('count_from_stock',{})or {}).get('value',0)>0:
        for s_i in row['elem']['count_from_stock']['items']:
          if s_i['_id'] not in stock_volumes:
            stock_volumes[s_i['_id']] = {'value':0, 'use_in':[] }
          stock_volumes[s_i['_id']]['value']+=s_i['value']
          stock_volumes[s_i['_id']]['use_in'].append({
              '_id': row['elem']['_id'],
              'number': row['elem']['number'],
              'volume': s_i['value']
            })

    if len(stock_volumes)>0:
      stock_ids = [ObjectId(s_id) for s_id in stock_volumes]
      data_stock = stockmodel.get_volumes(stock_ids)
      for s_i in data_stock:
        s_i['use_in'] = stock_volumes.get(str(s_i['_id']),{}).get('use_in',[])
        s_i['used_value'] = stock_volumes.get(str(s_i['_id']),{}).get('value',0)

        if s_i['count']['current_value']<stock_volumes.get(str(s_i['_id']),{}).get('value',0):
          raise Exception('Задействованный со склада объем: {0} {1} для спецификации: {2} уже израсходован. Обновите форму, для получения актуальных объемов со склада.'.format(str(stock_volumes.get(tr(s_i['_id']),0)),s_i['count']['unit'], s_i['item']['number']))
    return data_stock

  # Внутренняя функция сохранение использованных объемов со склада
  def save_stock_data(usr, production_order, data_stock):
    '''
      Обновление объемов на складе, с учетом задействованных на производство
    '''
    for s_i in data_stock:
      item_to_update = {
        'count': s_i['count'],
        'history': s_i.get('history',[]),
        'remains': s_i.get('remains',[])
      }
      if s_i['used_value']>0:
        item_to_update['count']['current_value']-=s_i['used_value']
        item_to_update['count']['used_value']+=s_i['used_value']
        # if item_to_update['count']['current_value']==0:
        #   item_to_update['status'] = 'finished'
        for u_item in s_i['use_in']:
          item_to_update['history'].append({
              '_id': ObjectId(),
              'value': u_item['volume'],
              'current_value': item_to_update['count']['current_value'],
              'used_value': s_i['used_value'],
              'note': '',
              'production_order':{
                '_id': production_order['_id'],
                'number': production_order['number']
              },
              'order': production_order['order'],
              'item': {
                'spec_id': u_item['_id'],
                'spec_number': u_item['number']
              },
              'user' : usr['email'],
              'date' : datetime.datetime.utcnow(),
              'status': 'used'
            })
          # стек актуальных объемов, привязанных дате
          item_to_update['remains'].append({
              '_id': ObjectId(),
              'value': item_to_update['count']['value'],
              'current_value': item_to_update['count']['current_value'],
              'received_value': item_to_update['count']['received_value'],
              'develop_value': item_to_update['count']['develop_value'],
              'used_value': item_to_update['count']['used_value'],
              'user' : usr['email'],
              'date' : datetime.datetime.utcnow(),
            })
        # обновление данных в БД
        stockmodel.update(str(s_i['_id']), item_to_update)

  # Внутренняя функция сохранение новых объемов на склад
  def add_new_stock_data(usr, data_to_save, order):
    '''
      При добавлении новых объемов на склад, идет проверка на сущестоввание изделия в рамках заказа на складе.
      Если изделие в рамках заказа уже добавлялось на склад, то для такого же нового идет просто суммирование объемов.
      usr - пользователь
      data_ro_save - список складсикх объектов
      order - информация о заказе
    '''
    # Получаем со склада все изделия по текущему заказу
    current_stock_data = stockmodel.get_list({'order.number':order['number'] })
    if current_stock_data and len(current_stock_data)>0:
      # найти повторяющиеся изделия
      groupped_data = {}
      new_data_to_add = []
      new_data_to_update = {}
      # группировка данных по номеру изделия
      for row in current_stock_data:
        groupped_data[row['item']['number']] = row
      # смержить объемы для повторяющихся изделий
      for row in data_to_save:
        if row['item']['number'] in groupped_data:
          edit_row = groupped_data[row['item']['number']]
          # помечаем объект на обновление
          new_data_to_update[row['item']['number']] = edit_row
          #заносим информацию о расчете в array
          edit_row['production_orders'].append(row['production_orders'][0])
          #заносим информацию об изменении объема в историю
          edit_row['history'].append(row['history'][0]);
          # заносим информацию в объемы
          edit_row['count']['value']+=row['count']['value']
          edit_row['count']['current_value']+=row['count']['current_value']
          # мержинг remains
          edit_row['remains'].append({
            '_id': ObjectId(),
            'value': edit_row['count']['value'],
            'current_value': edit_row['count']['current_value'],
            'received_value': edit_row['count']['received_value'],
            'develop_value': edit_row['count']['develop_value'],
            'used_value': edit_row['count']['used_value'],
            'user' : usr['email'],
            'date' : datetime.datetime.utcnow(),
          })
        else:
          new_data_to_add.append(row)

      # добавить новые изделия на склад
      if len(new_data_to_add)>0:
        stockmodel.add(new_data_to_add)

      # обновить смерженные изделия на складе
      if len(new_data_to_update)>0:
        for i in new_data_to_update:
          row = new_data_to_update[i]
          _id = row['_id']
          del row['_id']
          stockmodel.update(_id, row)
    else:
      stockmodel.add(data_to_save)

  # MAIN BODY---------------------------------------------------------------------------------------
  #-------------------------------------------------------------------------------------------------
  # приведение данных к нужному формату
  data_to_save = prepare_data(data, usr)
  # проверка актуальности задействованных объемов со скалада
  data_stock = check_stock_data(data)
  # добавление заказа на производство
  productionordermodel.add(data_to_save['production_order'])
  # добавление складских объемов
  # if len(data_to_save['items_to_stock'])>0:
  #   stockmodel.add(data_to_save['items_to_stock'])
  if len(data_to_save['items_to_stock'])>0:
    add_new_stock_data(usr, data_to_save['items_to_stock'], data_to_save['production_order']['order'])
  # списание со склада задействованных объемов
  if len(data_stock)>0:
    save_stock_data(usr, data_to_save['production_order'], data_stock)
  # результирующая информация о заказе на производство
  result = {
    '_id': data_to_save['production_order']['_id'],
    'number': data_to_save['production_order']['number'],
    'order': data_to_save['production_order']['order'],
  }
  return result

def send_calculation_to_google(data):
  '''
    Эсуд расчеты в структурировано в виде
    Отправка готового расчета в гугл таблицу
  '''
  from helpers.google_api import spreadsheet
  try:

    # prepare data
    values = []
    for row in data:

      pp1 = ""
      pp2 = ""
      norm_price = None
      weight_per_unit = 1
      unique_props_str = ''
      tech_props_str = ''
      for prop in row.get('elem',{}).get('properties',[]):
        # if str(prop['origin_id']) == str(datamodel.SYSTEM_OBJECTS['WEIGHT_ON_VOLUME']):
        #   weight_per_unit = routine.strToFloat(prop['value'])

        if prop.get('is_optional') and not prop.get('is_techno'):
          unique_props_str += prop['name'] + ": " + prop['value'] + (' ' + prop['unit'] if prop['unit'] and prop['unit'] != '?' else '') + '; '
        elif prop.get('is_techno'):
          tech_props_str += prop['name'] + ": " + prop['value'] + (' ' + prop['unit'] if prop['unit'] and prop['unit'] != '?' else '') + '; '

      tmp = {
        'number': row['elem']['number'],
        'name': row['elem']['name'],
        'unique_props_str': unique_props_str,
        'tech_props_str': tech_props_str,
        'unit': row['elem']['count'].get('unit','кг') or 'кг',
        'chist_rashod': routine.strToFloat(row['elem']['count'].get('value', 0)) * weight_per_unit,
        'count_from_stock': routine.strToFloat(row['elem']['count_from_stock'].get('value', 0)) * weight_per_unit,
        'vol_full_waste': routine.strToFloat(row['elem'].get('vol_full_waste', 0)) * weight_per_unit,
        'vol_returned_waste': routine.strToFloat(row['elem'].get('vol_returned_waste', 0)) * weight_per_unit,
        'vol_not_returned_waste': routine.strToFloat(row['elem'].get('vol_not_returned_waste', 0)) * weight_per_unit,

        'norma_rashoda': (routine.strToFloat(row['elem']['count'].get('value', 0)) + routine.strToFloat(row['elem'].get('vol_not_returned_waste', 0))) * weight_per_unit,

        'obiem_potrebnosty': routine.strToFloat(row['elem'].get('vol_full', 0)) * weight_per_unit,
        'vol_amount': routine.strToFloat(row['elem'].get('vol_amount', 0))
      }

      values.append([
        tmp['number'] + ' ' + tmp['name'],
        tmp['tech_props_str'],
        tmp['unique_props_str'],
        tmp['unit'],
        tmp['chist_rashod'],
        tmp['count_from_stock'],
        tmp['vol_full_waste'],
        tmp['vol_returned_waste'] if tmp['vol_returned_waste'] else 'по заданию',
        tmp['vol_not_returned_waste'],
        tmp['norma_rashoda'],
        tmp['obiem_potrebnosty'],
        tmp['vol_amount']
      ])

    spreadsheet_obj = spreadsheet.Spreadsheet(
      config.google_api_user,
      config.google_production_order_calculation
    )

    spreadsheet_obj.prepare_delete_all_rows_from(u'Данные', 1)
    spreadsheet_obj.prepare_add_rows(u'Данные', len(values))
    spreadsheet_obj.prepare_setValues(u'Данные','A2:L%d' % (len(values) + 3), values)
    spreadsheet_obj.runPrepared()

    # return routine.JSONEncoder().encode({'status':'ok', 'data': values})
  except Exception, exc:
    print('Error! Send calculation data to google' + str(exc))
    print_exc()


