#!/usr/bin/python
# -*- coding: utf-8 -*-
from models import queuemodel
import datetime, time

class ProgressManager:
  '''
    Класс для ведения прогресса по какой-либо операции, выполняемуой в бэкграунде
  '''
  _queue_key = None # ключ задачи

  def __init__(self, queue_key):
    self._queue_key = queue_key

  def progress(self, percent_complete):
    '''
      Обновление прогресса
    '''
    if self._queue_key:
      queuemodel.update(self._queue_key, {'status': 'in_progress', 'percent_complete': percent_complete})

  def error(self, note, data=None):
    '''
      Запись ошибки в прогресс
    '''
    if self._queue_key:
      queuemodel.update(self._queue_key, {'status': 'error', 'note': note, 'data': data, 'finish_date': datetime.datetime.utcnow()})
    else:
      raise Exception(note)

  def complete(self, note, data):
    '''
      Обновление прогресса
    '''
    if self._queue_key:
      queuemodel.update(self._queue_key, {'status': 'ok', 'note': note, 'data': data, 'finish_date': datetime.datetime.utcnow()})
