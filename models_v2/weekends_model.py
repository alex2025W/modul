#!/usr/bin/python
# -*- coding: utf-8 -*-
from models_v2.model import Model
from config import db
class WeekendsModel(Model):
  '''
     Model for weekends table
  '''
  def __init__(self):
    # initialize superclass with specified DB collection
    Model.__init__(self, db.weekends)
