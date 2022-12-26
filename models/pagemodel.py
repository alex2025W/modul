#!/usr/bin/python
# -*- coding: utf-8 -*-
import copy

pages = [
  # CRM
  {'id':'app', 'index': 0, 'group':'CRM', 'name':'Заявки', 'title':'CRM', 'url':'/crm', 'newpage': False, 'visible': True},
  {'id':'clients', 'group':'CRM', 'name':'Клиенты (все)', 'title':'CRM. Клиенты (все)', 'url':'/client', 'newpage': False, 'visible': True},
  {'id':'errors', 'group':'CRM', 'name':'Ошибки', 'title':'CRM. Ошибки!', 'url':'/errors', 'newpage': False, 'visible': True},
  {'id':'ats', 'group':'CRM', 'name':'Входящие', 'title':'CRM. Входящие', 'url':'/crm/ats', 'newpage': False, 'visible': True},
  {'id':'client_projects', 'group':'CRM', 'name':'Проекты заказчика', 'title':'CRM. Проекты заказчика', 'url':'/projects', 'newpage': False, 'visible': True},
  {'id':'clients_category', 'group':'CRM', 'name':'Клиенты по категориям', 'title':'CRM. Клиенты по категориям', 'url':'/clients_category', 'newpage': False, 'visible': True},
  {'id':'ordertransfer', 'group':'CRM', 'name':'Смена менеджера', 'title':'CRM. Смена менеджера', 'url':'/crm/transfer', 'newpage': False, 'visible': True},
  {'id': 'lifetime', 'group': 'CRM', 'name': 'Жизненный цикл', 'title': 'Жизненный цикл', 'url': '/lifetime-export', 'newpage': False, 'visible': True},
  {'id': 'order-export', 'group': 'CRM', 'name': 'Выгрузка заявок', 'title': 'Выгрузка заявок', 'url': '/order-export', 'newpage': False, 'visible': True},

  # Договоры
  {'id':'contracts', 'group':'Договоры', 'name':'Договоры', 'title':'Договоры', 'url':'/contracts', 'newpage': False, 'visible': True},
  {'id':'factpayments', 'group':'Договоры', 'name':'Фактические платежи', 'title':'Договоры. Фактические платежи', 'url':'/factpayments', 'newpage': False, 'visible': True},
  {'id':'projectdocumentation', 'group':'Договоры', 'name':'Проектная документация', 'title':'Договоры. Проектная документация', 'url':'/projectdocumentation', 'newpage': False, 'visible': True},
  {'id':'finance', 'group':'Договоры', 'name':'Финансы', 'title':'Договоры Финансы', 'url':'/finance', 'newpage': False, 'visible': True},
  {'id':'claims', 'group':'Договоры', 'name':'Претензии и замечания', 'title':'Договоры Претензии и замечания', 'url':'/claims', 'newpage': False, 'visible': True},
  {'id':'outgoing', 'group':'Договоры', 'name':'Исходящие', 'title':'Договоры Исходящие', 'url':'/outgoing', 'newpage': False, 'visible': True},
  {'id':'incoming', 'group':'Договоры', 'name':'Входящие', 'title':'Договоры Входящие', 'url':'/incoming', 'newpage': False, 'visible': True},

  # Администрирование
  {'id':'dir', 'group': 'Администрирование', 'name':'Справочники', 'title':'Администрирование. Справочники', 'url':'/dir', 'newpage': False, 'visible': True},
  {'id':'users', 'group': 'Администрирование', 'name':'Пользователи', 'title':'Администрирование. Пользователи', 'url':'/user', 'newpage': False, 'visible': True},
  {'id':'roles', 'group': 'Администрирование', 'name':'Роли', 'title':'Администрирование. Роли', 'url':'/role', 'newpage': False, 'visible': True},
  {'id':'conformity', 'group':'Администрирование', 'name':'Соответствие. Работы/Материалы', 'title':'Администрирование. Соответствие. Работы/Материалы', 'url':'/conformity', 'newpage': False, 'visible': True},
  {'id':'crm_google_catalogs_rights', 'group':'Администрирование', 'name':'Раздача прав на каталоги заявок', 'title':'CRM. Раздача прав на каталоги заявок', 'url':'/crm_google_catalogs_rights', 'newpage': False, 'visible': True},
  {'id':'google_catalogs_check_rights', 'group':'Администрирование', 'name':'Проверка на общий доступ каталогов заявок', 'title':'CRM. Проверка на общий доступ каталогов заявок', 'url':'/google_catalogs_check_rights', 'newpage': False, 'visible': True},

  # Производство
  {'id':'joblog', 'group':'Производство', 'name':'Журнал работ', 'title':'Производство. Журнал работ', 'url':'/joblog', 'newpage': False, 'visible': True},
  {'id':'workorderdate', 'group':'Производство', 'name':'Наряды', 'title':'Производство. Наряды', 'url':'/workorderdate', 'newpage': False, 'visible': True},
  {'id':'timeline', 'group':'Производство', 'name':'График производства', 'title':'Производство. График производства', 'url':'/timeline', 'newpage': True, 'visible': True},
  {'id':'timeline_editor', 'group':'Производство', 'name':'График производства. Редактор', 'title':'Производство. График производства. Редактор', 'url':'/timeline/editor/', 'newpage': True, 'visible': True},
  {'id':'plannorm', 'group':'Производство', 'name':'Спецификации заказов', 'title':'Производство. Спецификации заказов', 'url':'/orderspecification', 'newpage': False, 'visible': True},
  {'id':'plannorm', 'group':'Производство', 'name':'Спецификации заказов v2', 'title':'Производство. Спецификации заказов v2', 'url':'/orderspecification2', 'newpage': False, 'visible': True},

  {'id':'plannormblank', 'group':'Производство', 'name':'Спецификации заказов. Бланки', 'title':'Производство. Спецификации заказов. Бланки', 'url':'/specificationorderblank', 'newpage': False, 'visible': True},
  {'id':'stats', 'group':'Производство', 'name':'Статистика', 'title':'Производство. Статистика', 'url':'/stats/production', 'newpage': False, 'visible': True},
  {'id':'planecalculation', 'group':'Производство', 'name':'МТО', 'title':'Производство. MTO', 'url':'/mto', 'newpage': False, 'visible': True},
  {'id':'stock', 'group':'Производство', 'name':'Склад', 'title':'Производство. Склад', 'url':'/stock', 'newpage': False, 'visible': True},
  {'id':'shift_tasks', 'group':'Производство', 'name':'Задания на производство', 'title':'Производство. Задания на производство', 'url':'/shift_tasks', 'newpage': False, 'visible': True},
  {'id':'shift_task_facts', 'group':'Производство', 'name':'Отчет производства за смену', 'title':'Производство. Отчет производства за смену', 'url':'/shift_task/facts', 'newpage': False, 'visible': True},
  {'id':'joblog_statistic', 'group':'Производство', 'name':'Журнал работ. Статистика', 'title':'Производство. Журнал работ. Статистика', 'url':'/joblog/statistic', 'newpage': False, 'visible': True},

  # ЭСУД
  {'id':'esud', 'group':'ЭСУД', 'name':'ЭСУД', 'title':'ЭСУД', 'url':'/esud', 'newpage': True, 'visible': True},
  {'id':'esud_calculation', 'group':'ЭСУД', 'name':'Расчеты', 'title':'ЭСУД. Расчеты', 'url':'/esud_calculation', 'newpage': True, 'visible': False},
  {'id':'esud_specification', 'group':'ЭСУД', 'name':'Спецификации', 'title':'ЭСУД. Спецификации', 'url':'/esud/specification', 'newpage': True, 'visible': True},
  {'id':'esud_specification_calculation', 'group':'ЭСУД', 'name':'Спецификация. Расчеты', 'title':'ЭСУД. Спецификация. Расчеты', 'url':'/esud/specification/calculation', 'newpage': True, 'visible': True},
  {'id':'esudtreegraph', 'group':'ЭСУД', 'name':'Граф данных', 'title':'ЭСУД. Граф данных', 'url':'/esudtreegraph', 'newpage': False, 'visible': True},
  {'id':'esud_specification_update', 'group':'ЭСУД', 'name':'Обновление спецификаций', 'title':'ЭСУД. Обновление спецификаций', 'url':'/esud/esud_specification_update', 'newpage': False, 'visible': True},
  {'id':'esud_configuration_update', 'group':'ЭСУД', 'name':'Обновление конфигураций', 'title':'ЭСУД. Обновление конфигураций', 'url':'/esud/esud_configuration_update', 'newpage': False, 'visible': True},
  {'id':'esud_complect', 'group':'ЭСУД', 'name':'Комлплекты', 'title':'ЭСУД. Комлплекты', 'url':'/esud/complect', 'newpage': True, 'visible': True},
  {'id':'purchasenorms', 'group':'ЭСУД', 'name':'Покупные изделия', 'title':'ЭСУД. Покупные изделия', 'url':'/purchasenorms', 'newpage': False, 'visible': True},

  # Статистика
  {'id':'brief', 'group':'Статистика', 'name':'Повестка дня', 'title':'Статистика. Повестка дня', 'url':'/brief', 'newpage': False, 'visible': True},
  {'id':'date_calculators', 'group':'Статистика', 'name':'Калькуляторы дат', 'title':'Статистика. Калькуляторы дат', 'url':'/calculator', 'newpage': True, 'visible': True},
  {'id': 'money', 'group': 'Статистика', 'name': 'Прогноз движения денежных средств', 'title': 'Прогноз движения денежных средств', 'url': '/money', 'newpage': False, 'visible': True},
  {'id': 'sales-funnel', 'group': 'Статистика', 'name': 'Воронка продаж', 'title': 'Воронка продаж', 'url': '/sales-funnel', 'newpage': False, 'visible': True},

  # КАДРЫ
  {'id':'absence', 'group':'Кадры', 'name':'Отсутствия', 'title':'Кадры. Отсутствия', 'url':'/absence_page', 'newpage': False, 'visible': True},

  # СЕРВИС
  {'id':'material_price_page', 'group':'Сервис', 'name':'Стоимость материала', 'title':'Сервис. Стоимость материала', 'url':'/material_price_page', 'newpage': False, 'visible': True}
]

def get_pages():
  '''
    Return groupped pages
  '''
  result = {}
  for item in pages:
    if item.get('visible'):
      if item.get('group'):
        if item['group'] not in result:
          result[item['group']] = {'group': item['group'], 'items':[]}
        result[item['group']]['items'].append(item)
      else:
        result[item['id']] = item
  result = result.values()
  result.sort(key = lambda x: (x['group']))
  for row in result:
    if row.get('items'):
      row['items'].sort(key = lambda x: (x['name']))
  return result

def get_list():
  return copy.deepcopy(pages)

def get_url(key):
  for p in pages:
    if p['id']==key:
      return p['url']
  # вернуть страничку только с меню
  return "/menupage"
