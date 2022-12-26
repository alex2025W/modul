#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route, view, get, post, put, request, error, abort, response, debug, static_file, template, redirect
import urllib
import config
from libraries import userlib
from models import materialsgroupmodel,sectormodel, usermodel, dirmodel
import json
import routine
from routine import  JSONEncoder

@route('/conformity')
def get_form():
  from apis.esud import esudapi
  userlib.check_page_access('conformity','r')
  data_sectors = []
  data_materials_groups = []
  # получение участков и работ
  data_sectors_cursor = sectormodel.get_by(
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
  )
  data_sectors_cursor.sort(key = lambda x: (x['type'],x['name']))
  for i in data_sectors_cursor:
    i.get('works',[]).sort(key = lambda x: x['name'])
    data_sectors.append(i)

  # получение групп материалов и материалов
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
  for i in data_materials_groups_cursor:
    i.get('materials',[]).sort(key = lambda x: x['name'])
    data_materials_groups.append(i)

  # получение списка единиц измерений
  material_units = materialsgroupmodel.get_all_units()

  # получение тэгов из справочника
  tags =  [x for x in dirmodel.get_list_by({'type':21, 'stat':'enabled'},{'name':1, 'stat':1 })]

  # получение меток из ЭСУД
  labels = esudapi.get_simple_dir_tree_with_sectors()

  return template(
    'frontend/conformity/templates/index',
    current_user=userlib.get_cur_user(),
    version = config.VERSION,
    menu = userlib.get_menu(),
    data = routine.JSONEncoder().encode({
      'sectors':data_sectors,
      'materials_groups':data_materials_groups,
      'material_units': material_units,
      'tags': tags,
      'labels': labels
    })
  )
