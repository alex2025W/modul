#!/usr/bin/python
# -*- coding: utf-8 -*-
from models_v2.model import Model
from config import db
class AbsenceModel(Model):
  '''
     Model for staff absence data collection
  '''
  def __init__(self):
    # initialize superclass with specified DB collection
    Model.__init__(self, db.absence)
