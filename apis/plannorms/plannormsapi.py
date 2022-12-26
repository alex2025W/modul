#!/usr/bin/python
# -*- coding: utf-8 -*-

import datetime, time
from datetime import date
from dateutil.parser import parse
from dateutil.relativedelta import *
from bson.objectid import ObjectId
from libraries import userlib
from models import countersmodel
import routine
import config
from traceback import print_exc
from copy import deepcopy,copy


def save_required_groups(params, usr_email):
  '''
    Сохранение групп материалов для продукции договора
    params: {
      'groups': ,
      'contract_id': ,
    }
  '''
  try:
    from models import contractmodel
    contractmodel.update(
      {'_id': ObjectId(params['contract_id'])},
      {'$set':{'required_groups': params['groups']}}
    )
  except Exception, exc:
    print('Error!: save_required_groups. Detail: {0}'.format(str(exc)))
    print_exc()
    raise Exception(str(exc))


def import_xls_data(params, usr_email):
  '''
    Импорт данных из XLS
    params: {
      'contract_id': ,
      'contract_number': ,
      'product_id': ,
      'product_number': ,
      'product_name': ,
      'file_info': {
        'size':
        'name':
      }
    }
    result = {'status':'error', 'data':[]}
  '''
  try:
    from xlrd import open_workbook
    from xlutils.copy import copy as wbcopy
    import os
    from models import planecalculationmodel, materialsgroupmodel, sectormodel, contractmodel, plan_norms_xls_imports_model
    from apis.integra1c import integra1capi

    errors_codes = [
      {'key': 'dublicate', 'text':'Дублирование позиций в исходном документе'},
      {'key': 'material_not_found', 'text':'Материал не найден в справочнике'},
      {'key': 'unique_prop_not_found', 'text':'Характеристика в справочнике не найдена'},
      {'key': 'material_short_article', 'text':'У данной позиции артикул не может быть двузначным. В справочнике у материала есть индивидуальные характеристики'},
      {'key': 'sector_not_found', 'text':'Участок не найден в справочнике'},
      {'key': 'volume_not_diggit', 'text':'Задан неверный формат объема материала'},
      {'key': 'already_in_plan_norms', 'text':'Данный материал уже заведен в нормах'},
      {'key': 'incorrect_name_or_code_unique_prop', 'text':'Некорракетный код или название уникальной характеристики'},
      {'key': 'incorrect_name_or_code_material', 'text':'Материал не найден в справочнике'},
      {'key': 'incorrect_full_code', 'text':'Некорректный артикул'},
    ]

    input_data = [] # подготовленный список входных данных
    rows_with_error = [] # строки с ошибками

    result = []
    # inputfile = open(os.path.join(os.path.dirname(__file__),'..','..','temp',params['file_info']['name']), 'wb')
    #-----------------------------
    # считываем содержимое файла
    rb = open_workbook('temp/'+params['file_info']['name'])
    sheet = rb.sheet_by_index(0)
    # Проверка на корректность структуры документа
    if sheet.ncols!=5:
      raise Exception("Неверный формат входящего документа. Количество колонок не может превышать пяти.")
    correct_titles = [u'Код участка', u'Артикул', u'Материал', u'Характеристика', u'Объём']
    cell_index = 0
    first_row = sheet.row_values(0)
    for c_el in first_row:
      if c_el != correct_titles[cell_index]:
        raise Exception("Неверный формат входящего документа. Колонки не соотвествуют заданной структуре.")
      cell_index+=1

    # считываем все данные в темповую структуру
    for rownum in range(sheet.nrows):
      if rownum>0:
        row = sheet.row_values(rownum)
        if row[1]:
          input_data.append({
            'sector_code': row[0],
            'sector_name': '',
            'material_group_code': '',
            'material_group_name': '',
            'full_code': row[1], #material_group_code.material_code.unique_prop_code
            'material_name': row[2],
            'unique_prop': row[3], #code.name
            'volume': row[4],
            'errors': []
          })
    #-----------------------------
    # Заполняем все необходимые справочники
    # справочник групп материалов
    arrDataGroups = materialsgroupmodel.get_all_only_groups()
    dataGroups = {}
    for row in arrDataGroups:
      dataGroups[row['code']] = row

    # справочник материалов
    # получение спика материалов
    arrDataMaterials = materialsgroupmodel.get_all_materials()
    dataMaterials = {}
    for row in arrDataMaterials:
      key = '{0}_{1}'.format(str(row.get('group_code','0')), str(row.get('code','0')))
      dataMaterials[key] = row

    # справочник уникальных характеристик в материале
    arrDataUniqueProps = materialsgroupmodel.get_unique_props()
    dataUniqueProps = {}
    for row in arrDataUniqueProps:
      key = '{0}_{1}_{2}'.format(str(row.get('group_code','0')), str(row.get('material_code','0')), str(row.get('prop_key','0')) )
      dataUniqueProps[key] = row

    # справочник участков
    arrDataSectors = sectormodel.get_all_only_sectors()
    dataSectors = {}
    for row in arrDataSectors:
      dataSectors[row['code']] = row

    # информация о договоре и всей его продукции, включая допники
    contract_data = contractmodel.get_by({'_id': ObjectId(params['contract_id'])})
    if not contract_data:
      raise Exception('Указанный договор не найден')
    # доп. соглашения
    contract_data['additional_contracts'] = []
    for c in contractmodel.get_list_by({'parent_id':contract_data['_id']}):
      contract_data['additional_contracts'].append(c)

    productions_data = {}
    for row in contract_data.get('productions',[]):
      if row['number']>0:
        productions_data[str(row['_id'])] = row
    # получение продукции из допников
    for c in contract_data.get('additional_contracts',[]):
      for row in c['productions']:
        productions_data[str(row['_id'])] = row

    # получение плановых норм по заказу
    old_plan_norms_data = planecalculationmodel.get_list_by({
      'order_number': '{0}.{1}'.format(params['contract_number'], params['product_number'])
    })

    # группировка текщих данных по нормам по ключу
    old_plan_norms_groupped_material_data = {}
    for row in old_plan_norms_data:
      for material_row in row['materials']:
        if material_row.get('unique_props_info') and material_row['unique_props_info'].get('key'):
          key = '{0}_{1}_{2}_{3}'.format(
            routine.strToInt(row['sector_code']),
            material_row['materials_group_key'],
            material_row['materials_key'],
            material_row['unique_props_info']['key'],
          )
        else:
          key = '{0}_{1}_{2}'.format(
            routine.strToInt(row['sector_code']),
            material_row['materials_group_key'],
            material_row['materials_key']
          )
        old_plan_norms_groupped_material_data[key] = material_row

    # основной процессинг данных---------------------
    # проверка на дубликаты артикулей во входных данных
    for row in input_data:
      i=1
      for row1 in input_data:
        i+=1
        if row['full_code'] == row1['full_code'] and routine.strToInt(row['sector_code'])==routine.strToInt(row1['sector_code']) and row!=row1:
          row['errors'].append({
            'type': 'dublicate',
            'xls_row_number': i
          })
    # проверяем на двузначный код и существование материала в справочнике
    # на существование заданного участка
    # на числовой объем
    # на существование в нормах
    i=1
    for row in input_data:
      i+=1
      if len(row['full_code'].split('.'))>1:
        search_key = '_'.join(row['full_code'].split('.'))
        #находим материал с таким кодом, если у него есть уникальные характеристики, то это ошибка
        row_material = dataMaterials.get('{0}_{1}'.format(row['full_code'].split('.')[0], row['full_code'].split('.')[1]))
        # material check---------------
        if not row_material:
          row['errors'].append({
            'type': 'material_not_found',
            'xls_row_number': i
          })
        else:
          row['material_group_code'] = row_material['group_code']
          row['material_group_name'] = row_material['group_name']
          #  проверка на совпадение артикула и название материала
          if routine.clear_waste_symbols_string(row_material['name'])!=routine.clear_waste_symbols_string(row['material_name']):
            row['errors'].append({
              'type': 'incorrect_name_or_code_material',
              'xls_row_number': i
            })
          # проверка на двузначный артикул и наличие уникальных характеристик
          elif len(row['full_code'].split('.'))<3 and len(row_material.get('unique_props',[]))>0:
            row['errors'].append({
              'type': 'material_short_article',
              'xls_row_number': i
            })
          # если в артикле есть информация о характеристике
          elif len(row['full_code'].split('.')) > 2:
            if not dataUniqueProps.get(search_key):
              row['errors'].append({
                'type': 'material_not_found',
                'xls_row_number': i
              })
            # если заданное название характеристики отличается от названия в справочнике
            elif routine.clear_waste_symbols_string(dataUniqueProps.get(search_key)['prop_name']) != routine.clear_waste_symbols_string(row['unique_prop']):
              row['errors'].append({
                'type': 'incorrect_name_or_code_unique_prop',
                'xls_row_number': i
              })

          # already in norms check---------------
          if '{0}_{1}'.format(str(routine.strToInt(row['sector_code'])),search_key) in old_plan_norms_groupped_material_data:
            row['errors'].append({
              'type': 'already_in_plan_norms',
              'xls_row_number': i
            })

        # sector check---------------
        if not dataSectors.get(routine.strToInt(row['sector_code'])):
          row['errors'].append({
            'type': 'sector_not_found',
            'xls_row_number': i
          })
        else:
          row['sector_name'] = dataSectors.get(routine.strToInt(row['sector_code']))['name']

        # volume check---------------
        if routine.strToFloat(row['volume'])==0:
          row['errors'].append({
            'type': 'volume_not_diggit',
            'xls_row_number': i
          })


      else:
        row['errors'].append({
          'type': 'incorrect_full_code',
          'xls_row_number': i
        })
    #----------------------------------------------------------------------
    # отбираем данные по которым есть ошибки
    input_data_with_errors=[row for row in input_data if len(row['errors'])>0]

    # сохранение информации в лог
    plan_norms_xls_imports_model.add({
      'user_email': usr_email,
      'date':datetime.datetime.utcnow(),
      'status': 'error' if len(input_data_with_errors)>0 else 'success',
      'product_id':params['product_id'],
      'product_name': params['product_name'],
      'product_number':params['product_number'],
      'errors':input_data,
      'contract_id': params['contract_id'],
      'contract_number': params['contract_number']
    })



    #-------------------------------------------------------------------------------------------------------
    # подготовка и добавление данных в плановые нормы
    change_history_list = [] # список изменений
    new_materials_list = []   # список новых материалов
    data_prepared_to_save = {}
    # группировка  даных по участкам с полной подготовокой на сохранение
    for row in input_data:
      # на соханение идут данные без ошибок
      if len(row['errors'])==0:
        # получение материала из справочника
        tmp_material_key = '{0}_{1}'.format(row['full_code'].split('.')[0],row['full_code'].split('.')[1])
        tmp_material_info = dataMaterials[tmp_material_key] if tmp_material_key in dataMaterials else None
        # получение уникальной характеристики из справочника
        new_unique_props_info = {'key':None, 'name':'', 'items':[], 'type': 'prop'}
        tmp_unique_props_names_str = ''
        # если в исходном коде материала есть информация о коде уникальной характеристики, то
        # получаем эту характеристику
        if len(row['full_code'].split('.'))>2:
          tmp_unique_prop_key = row['full_code'].split('.')[2]

          for material_prop_row in tmp_material_info.get('unique_props'):
            if str(material_prop_row['key']) == tmp_unique_prop_key:
              new_unique_props_info = material_prop_row
              tmp_unique_props_names_str = material_prop_row['name']
              if new_unique_props_info.get('type')=='prop':
                new_unique_props_info['items'] = [deepcopy(new_unique_props_info)]
              break

        if routine.strToInt(row['sector_code']) not in data_prepared_to_save:
          new_row = {
            "_id" : ObjectId(),
            "code" : None, #  код задания получается при сохранении
            "contract_id" : ObjectId(params['contract_id']),
            "contract_number" : routine.strToInt(params['contract_number']),
            "date_add" : datetime.datetime.utcnow(),
            "date_change" : datetime.datetime.utcnow(),
            'user_email': usr_email,
            'order_number': '{0}.{1}'.format(params['contract_number'], params['product_number']),
            'product_number': routine.strToInt(params['product_number']),
            'production_id': ObjectId(params['product_id']),
            'materials':[],
            'group_remarks': {},
            'corrections': [],
            'remarks': {'contains_remark': False},
            'sector_id':ObjectId(dataSectors.get(routine.strToInt(row['sector_code']))['_id']),
            'sector_name': dataSectors.get(routine.strToInt(row['sector_code'])).get('name', ''),
            'sector_code': routine.strToInt(dataSectors.get(routine.strToInt(row['sector_code']))['code']),
            'change_history': [],
            #"note": "imported from 1C"
            'imported_from_1c': True
          }
          data_prepared_to_save[routine.strToInt(row['sector_code'])] = new_row

        # добавление материала в список
        new_material = {
          "_id" : ObjectId(),
          "contract_number" : routine.strToInt(params['contract_number']),
          "unit_production" : 1,
          "status" : "0",
          "date_confirm" : None,
          "pto_size" : routine.strToFloat(row['volume']),
          "statuses" : [
            {
              "status" : "0",
              "date_confirm" : datetime.datetime.utcnow(),
              "user_email" : usr_email
            },
          ],
          #---material info-----------
          "materials_group_id" : tmp_material_info['group_id'] if tmp_material_info else None,
          "materials_group_key" : tmp_material_info['group_code'] if tmp_material_info else None,
          "materials_id" : tmp_material_info['_id'] if tmp_material_info else None,
          "materials_key" : tmp_material_info['code'] if tmp_material_info else None,
          "unit_price" :  tmp_material_info['price'] if tmp_material_info else None,
          #-- uniqueprops info----
          "unique_props" : tmp_unique_props_names_str,
          "unique_props_info" : new_unique_props_info,
          #--- purchase info---------
          "purchase_statuses" : [],
          "purchase_status" : "",
          "purchase_user_email" : "",
          "purchase_date_confirm" : None,
          #----------------------------------
          "fact_price" : 0,
          "fact_size" : 0,
          "has_blank" : 0,
          "date_change" : datetime.datetime.utcnow(),
          "date_add" : datetime.datetime.utcnow(),
          "user_email" : usr_email,
          # "note": "imported from 1C"
          'imported_from_1c': True
        }
        data_prepared_to_save[routine.strToInt(row['sector_code'])]['materials'].append(new_material)

        # # добавление записи в историю, относительно сектора
        # change_history_list.append({'type':'add', 'new':new_material})


    # сохранение данных в БД-------------------------
    # Проверяем для каких участков уже созданы нормы в рамках данного заказа
    # для существующих норм добавляем просто материалы, для новых создаем новые нормы с получением
    # номеров новых норм
    # снчала делаем обновление сущесвтующих норм
    all_updated_and_added_norms = []
    norms_to_update = []
    for row in old_plan_norms_data:
      if routine.strToInt(row['sector_code']) in data_prepared_to_save:
        for new_material_row in data_prepared_to_save[routine.strToInt(row['sector_code'])]['materials']:
          row['materials'].append(new_material_row)
        del data_prepared_to_save[routine.strToInt(row['sector_code'])]
        row['user_email'] = usr_email
        row['date_change'] = datetime.datetime.utcnow()
        norms_to_update.append(row)

    if len(norms_to_update)>0:
      for row in norms_to_update:
        all_updated_and_added_norms.append(row)
        planecalculationmodel.update({'_id':row['_id']},{'$set':{
          'user_email': row['user_email'],
          'date_change': row['date_change'],
          'materials': row['materials']
        }} )

        # синхронизация данных с 1С------------------
        if config.use_worker:
          config.qu_default.enqueue_call(func=integra1capi.update_plan_norms, args=(row['_id'], usr_email),timeout=5000)
        else:
          integra1capi.update_plan_norms(row['_id'],usr_email)
        #-----------------------------------------------------------------

    # добавление новых норм, если такие есть
    if len(data_prepared_to_save)>0:
      for row in data_prepared_to_save.values():
        all_updated_and_added_norms.append(row)
        row['code'] = countersmodel.get_next_sequence('plannorms')
        # сохранение данных  в БД
        planecalculationmodel.add(row)
        # синхронизация данных с 1С------------------
        if config.use_worker:
          config.qu_default.enqueue_call(func=integra1capi.update_plan_norms, args=(row['_id'], usr_email),timeout=5000)
        else:
          integra1capi.update_plan_norms(row['_id'],usr_email)
        # #-----------------------------------------------------------------
    #------------------------------------------------------------------

    return {'status': 'error', 'result_log': input_data, 'data': get_norms_by_contract(params['contract_number'])}
  except Exception, exc:
    print('Error!: import_xls_data. Detail: {0}'.format(str(exc)))
    print_exc()
    raise Exception(str(exc))

def get_norms_by_type_and_number(search_type, number):
  '''
    Получение норм типу и номеру
    search_type = [contract, order, specification]
    Есл на входе подается тип - specification, то данные берутся по заказу
  '''
  from models import planecalculationmodel, materialsgroupmodel, sectormodel, contractmodel, plan_norms_xls_imports_model, workordermodel

  try:
    if not number:
      raise Exception('Некорректные условия поиска.')

    # получаем сектора
    sectors = sectormodel.get_all_only_sectors()

    # фильтер для выборки данных из норм
    query = {}
    contract = None
    product_number = None
    contract_number = None
    norm_info = None
    if search_type == 'order':
      tmp = number.split('.')
      if len(tmp)<2:
        raise Exception('Неверный номер заказа.')
      # получение информации о договоре
      contract = contractmodel.get_by({
        'number':routine.strToInt(tmp[0]),
        '$or': [
          {'parent_id': {'$exists': False}},
          {'parent_id':None},
          {'parent_id': ''}
        ]
      })
      search_product_number = routine.strToInt(tmp[1])
      query = {'order_number': '{0}.{1}'.format(tmp[0], tmp[1])}
    elif search_type == 'specification':
      # получение краткой информации о спецификации
      norm_info = planecalculationmodel.get_by({'code': routine.strToInt(number)}, None)
      if not norm_info:
        raise Exception('Спецификация не найдена. Попробуйте изменить условия поиска.')
      query = {'order_number': '{0}.{1}'.format(str(norm_info['contract_number']), str(norm_info['product_number']) )}
      # получение информации о договоре
      contract = contractmodel.get_by({'_id': norm_info['contract_id']})
      search_product_number = norm_info['product_number']
    else: # contract
      query = {'contract_number': routine.strToInt(number)}
      contract = contractmodel.get_by({
        'number':routine.strToInt(number),
        '$or': [{ "parent_id": { '$exists': False }},{ "parent_id":None},{"parent_id": ''}]
      })

    if contract==None:
      raise Exception('Договор не найден. Попробуйте изменить условия поиска.')
    elif len(contract.get('productions',[]))==0:
      raise Exception('Для указанного договора нет продукции.')

    contract_number = contract['number']

    # получаем допники
    dop_list = contractmodel.get_list_by({'parent_id': contract['_id']})
    # добавляем продукцию из них в договору
    for d in dop_list:
      for p in d['productions']:
        contract['productions'].append(p)
    # сортировка по номеру продукции
    contract['productions'].sort(key=lambda x: (x.get('number')))


    # елси поиск по продукции или по номеру спецификации, то в результате оставляем только
    # подходящую продукцию
    if search_type == 'order' or search_type == 'specification':
      # проверка существования искомой продукции
      new_production = [p for p in contract['productions'] if p['number'] == search_product_number]
      if len(new_production) == 0:
        raise Exception('В указанном договоре нет искомой продукции.')
      contract['productions'] = new_production

    # получаем плановые нормы
    normlist = planecalculationmodel.find_by(query,
      {
        'code':1,
        'comments':1,
        'order_number':1,
        'product_number':1,
        'production_id':1,
        'sector_id':1,
        'sector_name':1,
        'sector_code':1,
        'materials':1,
        'remarks':1,
        'group_comments':1,
        'group_remarks':1
      }
    ).sort("sector_code", 1)

    # заносим нормы в продукции
    for n in normlist:
      n['routine'] = 0
      # заполняю routine для сектора
      for s in sectors:
        if s['_id']==str(n['sector_id']):
          n['routine'] = s['routine']
          break

      for p in contract['productions']:
        if p['_id']==n['production_id']:
          if 'sectorlist' not in p:
            p['sectorlist'] = []
          p['sectorlist'].append(n)
          break

    # добавляем работы из нарядов
    works = workordermodel.get(
      {
        'contract_id':contract['_id'],
        'production_id':{'$exists':True}
      },
      {
        'production_id':1,
        'plan_work.work_id':1
      }
    )
    for w in works:
      for p in contract['productions']:
        if p['_id']==w['production_id']:
          if 'workorder' not in p:
            p['workorder']=[]
          p['workorder'].append(w)
          break
    # получение истории импорта данных из XLS, если такие были
    contract['imports_history'] =plan_norms_xls_imports_model.get_list({
      'contract_number': routine.strToInt(contract_number)
    })

    return {'contract': contract, 'specification': norm_info}
  except Exception, exc:
    print('Error!: get_norms_by_contract. Detail: {0}'.format(str(exc)))
    print_exc()
    raise Exception(str(exc))

def get_norms_by_contract(contract_number):
  '''
  Получение норм по договору
  '''
  from models import planecalculationmodel, materialsgroupmodel, sectormodel, contractmodel, plan_norms_xls_imports_model, workordermodel

  try:
    # получаем договор
    contract = contractmodel.get_by({'number':routine.strToInt(contract_number), '$or': [{ "parent_id": { '$exists': False }},{ "parent_id":None},{"parent_id": ''}]})
    if contract==None:
      raise Exception('Указанный вами договор не найден. Попробуйте ввести другой номер договора.')
    elif len(contract.get('productions',[]))==0:
      raise Exception('Для указанного договора нет продукции.')
    # получаем допники
    dop_list = contractmodel.get_list_by({'parent_id': contract['_id']})
    # добавляем продукцию из них в договору
    for d in dop_list:
      for p in d['productions']:
        contract['productions'].append(p)
    # сортировка по номеру продукции
    contract['productions'].sort(key=lambda x: (x.get('number')))
    # получаем сектора
    sectors = sectormodel.get_all_only_sectors()
    # получаем плановые нормы
    normlist = planecalculationmodel.find_by({'contract_id':contract['_id']},{
      'code':1,
      'comments':1,
      'order_number':1,
      'product_number':1,
      'production_id':1,
      'sector_id':1,
      'sector_name':1,
      'sector_code':1,
      'materials':1,
      'remarks':1,
      'group_comments':1,
      'group_remarks':1
      }).sort("sector_code", 1)
    # заносим нормы в продукции
    for n in normlist:
      n['routine'] = 0
      # заполняю routine для сектора
      for s in sectors:
        if s['_id']==str(n['sector_id']):
          n['routine'] = s['routine']
          break

      for p in contract['productions']:
        if p['_id']==n['production_id']:
          if 'sectorlist' not in p:
            p['sectorlist'] = []
          p['sectorlist'].append(n)
          break
    # добавляем работы из нарядов
    works = workordermodel.get({'contract_id':contract['_id'],'production_id':{'$exists':True}},{'production_id':1,'plan_work.work_id':1})
    for w in works:
      for p in contract['productions']:
        if p['_id']==w['production_id']:
          if 'workorder' not in p:
            p['workorder']=[]
          p['workorder'].append(w)
          break
    # получение истории импорта данных из XLS, если такие были
    contract['imports_history'] =plan_norms_xls_imports_model.get_list({'contract_number': routine.strToInt(contract_number)})
    return contract
  except Exception, exc:
    print('Error!: get_norms_by_contract. Detail: {0}'.format(str(exc)))
    print_exc()
    raise Exception(str(exc))

def get_actual_plan_norms(order_number):
  '''
    Получение плановых норм со статусом - Утверждено по номеру заказа.
    order_number - номер заказа
    Результат функции - список материалов с утвержденными объемами
  '''
  # локальная функция преобразования номера заказа из номера заказа 1С
  def prepare_order_number(val):
    return '{0}.{1}'.format(val.split('.')[0], val.split('.')[1])

  from models import planecalculationmodel, materialsgroupmodel, datamodel
  result =[]
  try:
    # приведение номера заказа к формату "номердоговора.номер продукции"
    order_number = prepare_order_number(order_number)
    # получение спика материалов
    arrDataMaterials = materialsgroupmodel.get_all_materials()
    dataMaterials = {}
    for row in arrDataMaterials:
      key = '{0}_{1}'.format(str(row.get('group_code','0')), str(row.get('code','0')))
      dataMaterials[key] = row
    # получение плановых норм по заказу
    plan_calculation_data = planecalculationmodel.get_list_by({'order_number': {'$in': [order_number]}})
    if len(plan_calculation_data)==0:
      raise Exception("По данному заказу нет плановых норм")
    # ищем выбранную уникальную характеристику
    for row in plan_calculation_data:
      for m_row in row.get('materials',[]):
        #если объем материала согласован и направление  - материалы

        if m_row.get('status') == '1' and (not m_row.get('sector_id') or str(m_row.get('sector_id')) == str(datamodel.SYSTEM_OBJECTS['MATERIALS_DIR_LYB'])):
          cur_material = dataMaterials.get('{0}_{1}'.format(str(m_row['materials_group_key']), str(m_row['materials_key'])))
          tmp={
            'note':m_row.get('note',''),
            'material_id':m_row.get('materials_id'),
            'material_key':m_row.get('materials_key'),
            'material_group_id': m_row.get('materials_group_id'),
            'material_group_key': m_row.get('materials_group_key'),
            'material_name': cur_material['name'] if cur_material else 'Не известно',
            'material_group_name': cur_material['group_name'] if cur_material else 'Не известно',
            'sku_name': cur_material.get('sku_name','') if cur_material else '',
            'unit_purchase': cur_material.get('unit_purchase','') if cur_material else '',
            'unit_pto': cur_material.get('unit_pto','') if cur_material else '',
            'unique_props_key':m_row['unique_props_info']['key'] if m_row.get('unique_props_info') else '',
            'unique_props_name': m_row['unique_props_info']['name']  if m_row.get('unique_props_info') else '',
            'unique_props_id': m_row['unique_props_info'].get('_id') if m_row.get('unique_props_info') else '',
            'category_id': m_row.get('category_id'),
            'group_id': m_row.get('group_id'),
            'size': m_row['pto_size'],
            'status': m_row.get('status','')
            # 'sector_code': row.get('sector_code',''),
            # 'sector_name': row.get('sector_name',''),
            # 'sector_id': row.get('sector_id',''),
          }
          result.append(tmp)
    return result
  except Exception, exc:
    print('Error!: actual_plan_norms. Detail: {0}'.format(str(exc)))
    print_exc()
    raise Exception(str(exc))

def update_statuses_from_1c(data):
  '''
  Обновление статусов закупки по данным из 1С
  Формат данных:
  [
    {
      'order_number': 922.1.1,
      'material_full_code': 1.5,
      'category_id': '',
      'group_id': '',
      'sector_code':2,
      'status_history':[
        {
          'status': 'inpay',
          'size': 10,
          'price': 10
        }
      ]
    }
  ]
  '''
  from models import planecalculationmodel, materialsgroupmodel, sectormodel

  # локальная функция преобразования номера заказа из номера заказа 1С
  def prepare_order_number(val):
    return '{0}.{1}'.format(val.split('.')[0], val.split('.')[1])

  # локальная функция получения единицы продукции из номера заказа
  def get_order_unit_number(val):
    try:
      return val.split('.')[2]
    except:
      return '0'

  # локальная функция формирования объекта для поиска материала
  def get_material_search_info(val, category_id, group_id):
    tmp = val.split('.')
    return {
      'group_key': tmp[0],
      'material_key': tmp[1],
      'unique_prop_key': tmp[2] if len(tmp)>2 else None,
      'category_id': category_id,
      'group_id': group_id
    }

  # локальная функция поиска требуемого материала в списке материалов элемента плановой нормы
  # row - плановая норма
  # dataMaterials  - справочник материалов
  # search_material_info - объект от функции - get_material_search_info
  # def get_material_from_plan_norms_row(row, search_material_info, dataMaterials):
  #   for m_row in row.get('materials',[]):
  #     # получение кода индивидуальной характеристики для материала заданного в нормах
  #     unique_prop_key = None
  #     if m_row.get('unique_props_info'):
  #       cur_material = dataMaterials.get('{0}_{1}'.format(str(m_row['materials_group_key']), str(m_row['materials_key'])))
  #       if cur_material:
  #         # список уникальных свойств материала из справочника
  #         material_unique_props = cur_material.get('unique_props', None)
  #         cur_unique_prop = (m_row.get('unique_props_info', {}) or {}).get('name','')
  #         material_unique_prop = None
  #         if cur_unique_prop and material_unique_props:
  #           for prop in material_unique_props:
  #             if prop['name']==cur_unique_prop:
  #               material_unique_prop = prop
  #               break
  #         if material_unique_prop:
  #           unique_prop_key = material_unique_prop['key']

  #     if str(m_row['materials_group_key']) == search_material_info['group_key'] and str(m_row['materials_key']) == search_material_info['material_key'] and (not search_material_info['category_id'] or str(search_material_info['category_id']) == str(m_row.get('category_id',''))) and  (not search_material_info['group_id'] or str(search_material_info['group_id']) == str(m_row.get('group_id',''))) and ((not search_material_info['unique_prop_key'] and not unique_prop_key) or
  #         (search_material_info['unique_prop_key'] ==  str(unique_prop_key))):
  #         return copy(m_row)
  #   return None

  def get_material_from_plan_norms_row(row, search_material_info, dataMaterials):
    for m_row in row.get('materials',[]):
      # получение кода индивидуальной характеристики для материала заданного в нормах
      unique_prop_key = None
      if m_row.get('unique_props_info'):
        cur_material = dataMaterials.get('{0}_{1}'.format(str(m_row['materials_group_key']), str(m_row['materials_key'])))
        if cur_material:
          # список уникальных свойств материала из справочника
          material_unique_props = cur_material.get('unique_props', None)
          if material_unique_props and len(material_unique_props) > 0 and m_row.get('unique_props_info'):
            try:
              material_unique_prop = (tmp_row for tmp_row in material_unique_props if str(tmp_row['key']) == str(m_row.get('unique_props_info').get('key'))).next()
              unique_prop_key = material_unique_prop['key']
            except:
              material_unique_prop = None

      if str(m_row['materials_group_key']) == str(search_material_info['group_key']) and str(m_row['materials_key']) == str(search_material_info['material_key']) and (not search_material_info['category_id'] or str(search_material_info['category_id']) == str(m_row.get('category_id',''))) and (not search_material_info['group_id'] or str(search_material_info['group_id']) == str(m_row.get('group_id',''))) and ((not search_material_info['unique_prop_key'] and not unique_prop_key) or (str(search_material_info['unique_prop_key']) ==  str(unique_prop_key))):
        return copy(m_row)
    return None

  # --------------------------------------------------------------------------------------------------------
  # тело функции--------------------------------------------------------------------------------------------
  # --------------------------------------------------------------------------------------------------------
  errors = []
  try:
    # если есть данные на сохранение
    if data and len(data)>0:
      # получение данных из справочника материалов
      materials_catalog = {}
      for row in materialsgroupmodel.get_all_materials():
        materials_catalog['{0}_{1}'.format(str(row.get('group_code','0')), str(row.get('code','0')))] = row
      # участки
      sectors_catalog = {}
      for row in sectormodel.get_all_only_sectors():
        sectors_catalog[row['_id']] = row
      # группировка данных из 1с по заказам и участкам
      search_order_numbers = [prepare_order_number(row['order_number']) for row in data]
      # получение списка данных из закупок по входным номерам заказов
      plan_calculation_data = planecalculationmodel.get_list_by({'order_number': {'$in': search_order_numbers}})
      if plan_calculation_data and len(plan_calculation_data)>0:
        for row in data:
          try:
            # заказ по которому ведем обновление
            order_key = prepare_order_number(row['order_number'])
            # разбираемся для какой единицы продукции пришел факт
            product_unit_number = get_order_unit_number(row['order_number'])

            # материалы на обновление
            materials_for_update = []
            # сбор  материалов на обновление
            for pcd_row in plan_calculation_data:
              # если номера заказов совпадают и задан сектор и сектора совпадают
              if order_key == str(pcd_row['order_number']) and (not row['sector_code'] or str(row['sector_code'])==str(pcd_row['sector_code'])):
                # находим материал в плановой норме
                tmp_material_for_update = get_material_from_plan_norms_row(
                  pcd_row,
                  get_material_search_info(row['material_full_code'], row.get('category_id'), row.get('group_id')),
                  materials_catalog
                )
                # если материал найден, то добавляем его в список на обновление
                if tmp_material_for_update:
                  materials_for_update.append({
                    'plan_calculation_row': pcd_row,
                    'sector_id': pcd_row['sector_id'],
                    'sector_routine': sectors_catalog[str(pcd_row['sector_id'])]['routine'] if sectors_catalog.get(str(pcd_row['sector_id'])) else 0,
                    'material': tmp_material_for_update})

            # если отобраны материалы на обновление

            if len(materials_for_update)>0:
              # сортировка материалов по участкам. Сортировка идет по важности участков
              materials_for_update.sort(key=lambda x: (x.get('sector_routine')))
              cur_index = 0
              for material_for_update in materials_for_update:

                cur_index+=1
                # если история фактов еще не велась, то создаем ее
                # if not material_for_update['material'].get('facts_history'):
                #   material_for_update['material']['facts_history'] = []
                # material_for_update['material']['facts_history'].append({
                #   'date': datetime.datetime.utcnow(),
                #   'data': row
                # })
                material_for_update['material']['facts_history'] = [{
                  'date': datetime.datetime.utcnow(),
                  'data': row
                }]

                # если еще не было фактов, то подготавливаем объект под них
                if not material_for_update['material'].get('facts'):
                  material_for_update['material']['facts'] = {}


                # если в истории фактов уже есть текущая единица продукции, то обновляем ее данные
                # иначе создаем новые и потом обновляем
                if not material_for_update['material']['facts'].get(product_unit_number):
                  material_for_update['material']['facts'][product_unit_number] = {
                    'norms':0,
                    'inpay': 0,
                    'payed': 0,
                    'onstore':0,
                    'onwork':0,
                    # price----------
                    'price': 0,                  # цена
                    'date': '',                  # дата факта
                    'account': '',               # счет
                    'good_code_1c': '',          # код товара
                    'coef_si_div_iu': 0,         # коэффициент на который умножается цена
                    'account_type': '',          # источник текущей цены
                    'invoice_unit': '',          # Ед. оплаты
                  }

                tmp_material_fact_unit = material_for_update['material']['facts'][product_unit_number]

                # Проходим по статусам и объемам пришедшим от 1С и заносим факты в данные по нормам
                # Если факты пришедщие от 1С превышают планы в нормах,то факты переносятся на следующий участок
                # Если следующего участка нет, то все факты заносятся в текущий материал с превышением плана
                for ccstatus_row in row.get('status_history',[]):
                  # декодируем статус
                  ccdecoded_status = ccstatus_row['status']

                  # # если после обновления факт будет превышать план, то объемы переносим в аналогичный материал на другом участке
                  # if tmp_material_fact_unit[ccdecoded_status] + ccstatus_row['size'] >material_for_update['material'].get('pto_size',0) and len(materials_for_update)>1 and cur_index != len(materials_for_update):
                  #   # рассчитываем сколько нехватает в фактах чтобы покрыть план
                  #   need_size = material_for_update['material']['pto_size'] - tmp_material_fact_unit[ccdecoded_status]
                  #   # закрываем план
                  #   tmp_material_fact_unit[ccdecoded_status]  = material_for_update['material']['pto_size']
                  #   # уменьшаем объем пришедшего от 1С факта на отобранный объем для материала из норм
                  #   ccstatus_row['size']-=need_size
                  # else:
                  tmp_material_fact_unit[ccdecoded_status] = ccstatus_row['size']
                  ccstatus_row['size'] = 0


                # Цена
                # tmp_material_fact_unit['price'] = routine.strToFloat( row.get('price',0))
                # print('--------------')
                # print(row.get('price'))
                # print('--------------')

                if row.get('price'):
                  tmp_material_fact_unit['price'] = routine.strToFloat(row['price'].get('price', 0))
                  tmp_material_fact_unit['date'] = routine.strToDateTime(row['price'].get('date', None))
                  tmp_material_fact_unit['account'] = row['price'].get('account','')
                  tmp_material_fact_unit['good_code_1c'] = row['price'].get('good_code_1c','')
                  tmp_material_fact_unit['coef_si_div_iu'] = routine.strToFloat(row['price'].get('coef_si_div_iu', 1))
                  tmp_material_fact_unit['account_type'] = row['price'].get('account_type','')
                  tmp_material_fact_unit['invoice_unit'] = row['price'].get('invoice_unit','')

                #обновление материала в плановых нормах
                planecalculationmodel.update(
                  {'_id': material_for_update['plan_calculation_row']['_id'],'materials._id': ObjectId(material_for_update['material']['_id'])},
                  {'$set':{'materials.$': material_for_update['material']}}
                )
          except Exception, inexc:
            print('---------------')
            print('Error!: update_statuses_from_1c. Detail: {0}'.format(str(inexc)))
            print("Order: " + row["order_number"])
            print("Material: " + row["material_full_code"])
            print_exc()
            errors.append(str(inexc))

    # если были ошибки то выдаем в виде общего лога
    if len(errors)>0:
      raise Exception('\n'.join(errors))

  except Exception, exc:
    print('Error!: update_statuses_from_1c. Detail: {0}'.format(str(exc)))
    print_exc()
    raise Exception(str(exc))

def get_mto_data(contracts, orders, sector_types, sectors, material_groups, statuses):
  '''
    Получение плановых с фактами.
    contracts - список номеров договоров
    orders - список номеров заказов
    sector_types - список наименований типов участков
    sectors - список номеров участков
    material_groups - список номеров групп
    statuses - список статусов [pto, inpay, payed, onstore, onwork, notonwork, notpayed]
    Результат функции - список материалов с утвержденными объемами
  '''
  from models import planecalculationmodel, materialsgroupmodel, sectormodel, contractmodel, integra_1s_orders_calculation_model
  result_materials =[]
  result_comments = []
  try:

    start = time.clock()
    print "Start get_mto_data"

    filter = {'$and':[
      {'order_number' : {'$in': ['.'.join(number.split('.')[:2]) for number in orders]}}
    ]}

    if (not sectors or len(sectors)==0) and sector_types and len(sector_types)>0:
      sectors = []
      # справочник участков
      arrDataSectors = sectormodel.get_all_only_sectors()
      dataSectors = {}
      for row in arrDataSectors:
        dataSectors[row['code']] = row

      for sector_type in sector_types:
        sectors.extend([routine.strToInt(row['code']) for row in arrDataSectors if row['type'] == sector_type])

    if sectors and len(sectors)>0:
      filter['$and'].append({'sector_code' : {'$in': [routine.strToInt(code) for code in sectors]}})

    if material_groups and len(material_groups)>0:
      filter['$and'].append({'materials.materials_group_key': {
        '$in': [routine.strToInt(code) for code in material_groups]
      }})

    # получение плановых норм по заказу
    data = planecalculationmodel.get_list_by(filter)
    if len(data)==0:
      raise Exception('По заданным параметрам нет данных')

    print "Time get data  is: ", time.clock() - start
    start = time.clock()

    # получение спика материалов
    arrDataMaterials = materialsgroupmodel.get_all_materials()
    dataMaterials = {}
    for row in arrDataMaterials:
      key = '{0}_{1}'.format(str(row.get('group_code','0')), str(row.get('code','0')))
      dataMaterials[key] = row

    # получение списка групп материалов
    arrDataMaterialsGroups =  materialsgroupmodel.get_all_only_groups()
    dataMaterialsGroups = {}
    for row in arrDataMaterialsGroups:
      dataMaterialsGroups[str(row['_id'])] = row

    print "Time get dictionaries is: ", time.clock() - start
    start = time.clock()

    # --------------------------------------------------------------------------------
    productions_data = contractmodel.get_all_products_by_contractnumbers([routine.strToInt(number) for number in contracts])
    print "Time get productions is: ", time.clock() - start
    start = time.clock()
    # --------------------------------------------------------------------------------

    # Список для всех номеров заказов, выдаваемых в результате
    orders_numbers = []
    for row in data:
      if row.get('group_comments') and len(row['group_comments'])>0:
        for comment_row in row['group_comments']:
          result_comments.append({
            '_id': comment_row['_id'],
            'date': comment_row['date_change'],
            'user_email': comment_row['user_email'],
            'text': comment_row['text'],
            'sector_code': row.get('sector_code',''),
            'sector_name': row.get('sector_name',''),
            'sector_id': row.get('sector_id'),
            'group_id': comment_row.get('group_id'),
            'group_name': (dataMaterialsGroups.get(str(comment_row.get('group_id')), {}) or {}).get('name',''),
            'group_key': (dataMaterialsGroups.get(str(comment_row.get('group_id')), {}) or {}).get('code'),
            'contract_number': row.get('contract_number'),
            'contract_id': row.get('contract_id'),
            'product_number': row.get('product_number'),
            'product_id': row.get('production_id'),
            'order_number': '{0}.{1}'.format(str(row.get('contract_number')), str(row.get('product_number')))
          })

      for m_row in row.get('materials',[]):
        if m_row.get('status') == '1':

          # filter by material group
          if material_groups and len(material_groups) > 0 and str(m_row.get('materials_group_key','0')) not in material_groups:
            continue

          key = '{0}_{1}'.format(str(m_row.get('materials_group_key','0')), str(m_row.get('materials_key','0')))
          # если продукция из норм есть в договоре
          if str(row.get('production_id')) in productions_data:
            production_info = productions_data[str(row.get('production_id'))]
            # unique_props_info = m_row['unique_props_info']
            # получаем уникальные характеристики из справочника
            unique_props_info = None
            if m_row['unique_props_info']:
              for up in dataMaterials[key].get('unique_props',[]):
                if m_row['unique_props_info'].get('_id') and str(m_row['unique_props_info']['_id']) == str(up['_id']):
                  unique_props_info = up
                  break

            for production_unit_row in production_info.get('units', []):
              tmp_order_number = '{0}.{1}.{2}'.format(str(row.get('contract_number')), str(row.get('product_number')), str(production_unit_row['number']))
              #if production_unit_row['number']>0 and (not unit_number or unit_number and unit_number == production_unit_row['number']):
              if production_unit_row['number']>0 and tmp_order_number in orders:
                facts = m_row['facts'].get(str(production_unit_row['number'])) or {} if m_row.get('facts') else {}
                # filter by statuses
                if statuses and len(statuses)>0 and statuses[0]!='':
                  not_payed = 0
                  if (facts.get('onwork',0) + facts.get('onstore',0)) > facts.get('payed',0):
                    not_payed = routine.strToFloat(m_row['pto_size']) - (facts.get('onwork',0) + facts.get('onstore',0))
                  else:
                    not_payed = routine.strToFloat(m_row['pto_size']) - facts.get('payed',0)

                  if statuses[0]=='pto' and routine.strToFloat(m_row['pto_size'])==0:
                    continue
                  elif statuses[0]=='inpay' and ('inpay' not in facts or facts['inpay'] == 0):
                    continue
                  elif statuses[0]=='payed' and ('payed' not in facts or facts['payed'] == 0):
                    continue
                  elif statuses[0]=='onstore' and ('onstore' not in facts or facts['onstore'] == 0):
                    continue
                  elif statuses[0]=='onwork' and ('onwork' not in facts or facts['onwork'] == 0):
                    continue
                  elif statuses[0]=='notonwork' and routine.strToFloat(m_row['pto_size']) - facts.get('onwork',0) == 0:
                    continue
                  elif (statuses[0]=='notpayed' or statuses[0] == 'not_payed') and not_payed <= 0:
                    continue

                tmp={
                  'material_key':m_row.get('materials_key'),
                  'material_group_key': m_row.get('materials_group_key','') or '',
                  'material_name': dataMaterials[key]['name'] if key in dataMaterials else 'Не известно',
                  'sku_name': dataMaterials[key].get('sku_name','') if key in dataMaterials else '',
                  'unit_purchase': dataMaterials[key].get('unit_purchase','') if key in dataMaterials else '',
                  'unit_pto': dataMaterials[key].get('unit_pto','') if key in dataMaterials else '',
                  'material_group_name': dataMaterials[key]['group_name'] if key in dataMaterials else 'Не известно',
                  'unique_props_key': m_row['unique_props_info']['key'] if m_row.get('unique_props_info') else '',
                  'unique_props_name': m_row['unique_props_info']['name'] if m_row.get('unique_props_info') else '',
                  'unique_props_info': unique_props_info,

                  'category_id': m_row.get('category_id'),
                  'group_id': m_row.get('category_id'),

                  'pto_size': routine.strToFloat(m_row['pto_size']),
                  'facts': facts,
                  'note': m_row.get('note',''),
                  'sector_code': row.get('sector_code',''),
                  'sector_name': row.get('sector_name',''),
                  'sector_id': row.get('sector_id'),
                  'contract_number': row.get('contract_number'),
                  'contract_id': row.get('contract_id'),
                  'product_number': row.get('product_number'),
                  'product_name': production_info['name'],
                  'product_id': row.get('production_id'),
                  'unit_id': production_unit_row['_id'],
                  'unit_number': production_unit_row['number'],
                  'order_number': '{0}.{1}.{2}'.format(str(row.get('contract_number')), str(row.get('product_number')), str(production_unit_row['number']))
                }
                result_materials.append(tmp)
                # помечаем очередной номер заказа в списке номеров
                if tmp['order_number'] not in orders_numbers:
                  orders_numbers.append(tmp['order_number'])

    print "Time prepare data is: ", time.clock() - start
    start = time.clock()

    # получение дат обновлений заданных заказов из 1С
    integra_dates = integra_1s_orders_calculation_model.get_stats_by_orders(orders_numbers)

    print "Time get history is: ", time.clock() - start
    start = time.clock()

    # сортировка данных
    result_materials.sort(key=lambda x: (
      x.get('contract_number'),
      x.get('order_number'),
      x.get('sector_code'),
      #x.get('material_group_key'),
      x.get('material_name')
    ))

    return {
      'materials': result_materials,
      'comments': result_comments,
      'integra_dates' : integra_dates
    }
  except Exception, exc:
    print('Error!: actual_plan_norms. Detail: {0}'.format(str(exc)))
    print_exc()
    raise Exception(str(exc))

def update_material_tags(material_id, new_tags):
  '''
    Обновление тэгов материала во всех плановых нормах, где данный материал задействован
  '''

  from models import planecalculationmodel
  try:
    planecalculationmodel.update(
      { 'materials.materials_id': material_id },
      {'$set' : { 'materials.$.tags': new_tags }},
      multi_update = True
    )
  except Exception, exc:
    print('Error!: update_material_tags. Detail: {0}'.format(str(exc)))
    print_exc()
    raise Exception(str(exc))

# def update_material_labels(material_id, new_labels):
#   '''
#     Обновление тэгов материала во всех плановых нормах, где данный материал задействован
#   '''

#   from models import planecalculationmodel
#   try:
#     planecalculationmodel.update(
#       {'materials.materials_id': material_id },
#       {'$set' : { 'materials.$.labels': new_labels }},
#       multi_update = True
#     )
#   except Exception, exc:
#     print('Error!: update_material_labels. Detail: {0}'.format(str(exc)))
#     print_exc()
#     raise Exception(str(exc))
