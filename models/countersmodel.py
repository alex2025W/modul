#!/usr/bin/python
# -*- coding: utf-8 -*-
from config import db
import datetime, time
import pymongo

def get_next_sequence(name):
  '''
    Получение следующее значение счетчика для необходимого типа объекта
    Результатом является новое значение счетчика
  '''
  ret = db.counters.find_and_modify(
    query = { "_id": name },
    update = { "$inc": { "seq": 1 } },
    new = True
  )
  return ret["seq"]

def get_next_sequence_with_confirm(_id):
  '''
    Получение следующее значение счетчика для необходимого типа объекта
    Счетчику необходимо подтверждение, что результирующий объект успешно создан.
    Для получения следующего значения счетчика используется ARRAY с индексами и статусами
    Результатом является новое значение счетчика
  '''
  import routine
  tmp_index = None
  # получение информации об объекте
  data = db.counters.find_one({ "_id": _id })
  # если счетчик еще не начался, то создаем его
  if not data.get("seq"):
    data["seq"] = 1
    tmp_index = {'i':1, 'status':False, 'date': datetime.datetime.utcnow()}
    data["seq_arr"] = [tmp_index]
    db.counters.update(
      {'_id': _id},
      {'$set': {'seq': data["seq"], 'seq_arr': data["seq_arr"] }}
    )
  else:
    # поиск с отрицательным статусом номера в списке выданных номеров
    # если такой есть, то используем его, елси нет, то создаем новый
    try:
      tmp_index =  (item for item in data['seq_arr'] if not item['status'] and  (not item.get('date') or  routine.floor(((datetime.datetime.utcnow() - item.get('date')).seconds) / 60)>60 )).next()
      db.counters.update(
        {'_id': _id, 'seq_arr.i': tmp_index},
        {'$set': {'seq_arr.$.date': datetime.datetime.utcnow()}}
      )

      print('--------')
      print(tmp_index)
      print('--------')
    except Exception, exc:
      print(str(exc))
      tmp_index = None
      pass
    # если не нашли свободный индекс
    if not tmp_index:
      data["seq"] = data["seq"]+1
      tmp_index = {'i':data["seq"], 'status':False, 'date': datetime.datetime.utcnow()}
      data["seq_arr"].append(tmp_index)
      # db.counters.update(
      #   {'_id': _id},
      #   {'$set': {'seq': data["seq"], 'seq_arr': data["seq_arr"] }}
      # )
      db.counters.update({'_id': _id},{'$set': {'seq': data["seq"] }})
      db.counters.update({'_id': _id},{"$push":{ 'seq_arr': tmp_index}})
  return tmp_index['i']

def remove_confirmed_sequence(_id, i):
  '''
    Освабождение счетчика
    i - номер счетчика
    id - id объекта в котором ведется счетчик
  '''
  try:
    db.counters.update(
      {'_id': _id, 'seq_arr.i': i},
      {'$set': {'seq_arr.$.status':False, 'seq_arr.$.date':None }}
    )
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))


def get_next_sequences(name, count):
  '''
    Получение указанного количества новых значений счетчика
    Результатом является Array значений
  '''
  res = []
  ret = db.counters.find_and_modify(
    query = { "_id": name },
    update = { "$inc": { "seq": count } },
    new = True
  )

  i = ret["seq"]-count+1
  res.extend(range(i, i+count))
  return res


def update_by(cond, data, insert_if_notfound=True, multi_update=False):
  '''
  Обновление данных по заданным параметрам
  '''
  try:
    db.counters.update(cond, data, upsert=insert_if_notfound,multi=multi_update)
  except pymongo.errors.OperationFailure as e:
    raise Exception(str(e))
  except pymongo.errors.PyMongoError as e:
    raise Exception(str(e))
