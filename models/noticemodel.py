#!/usr/bin/python
# -*- coding: utf-8 -*-

notice_keys = {
  'workorder_plan_shifts':{
    'key':'workorder_plan_shifts',
    'title':'Уведомление о переносе сроков наряда',
    'type':['email']
  },
  'workorder_plan_holds':{
    'key':'workorder_plan_holds',
    'title':'Уведомление о приостановке работ',
    'type':['email']
  },
  'workorder_new_blanks':{
    'key':'workorder_new_blanks',
    'title':'Уведомление о создании новых бланков для нарядов',
    'type':['email']
  },
  'workorder_data':{
    'key':'workorder_data',
    'title':'Уведомление о создании нового наряда',
    'type':['email']
  },
  'plannorm_new_blanks':{
    'key':'plannorm_new_blanks',
    'title':'Уведомление о создании новых бланков для плановых норм',
    'type':['email']
  },
  'timeline_comments':{
    'key':'timeline_comments',
    'title':'Уведомление о создании новых коментариев на графике',
    'type':['email']
  },
  'crm_common':{
    'key':'crm_common',
    'title':'Все основные уведомления по ЦРМ',
    'type':['email']
  },
  'crm_admin':{
    'key':'crm_admin',
    'title':'Все основные уведомления по ЦРМ для администраторов',
    'type':['email']
  },
  'plannorm':{
    'key':'plannorm',
    'title':'Корректировка плановых норм',
    'type':['email']
  },
  'specification':{
    'key':'specification',
    'title':'Корректировка объёмов спецификации',
    'type':['email']
  },
  'workorders':{
    'key':'workorders',
    'title':'Все уведомления по нарядам',
    'type':['email']
  },
  'contract_common':{
    'key':'contract_common',
    'title':'Все основные уведомления по Договорам',
    'type':['email']
  },
}
