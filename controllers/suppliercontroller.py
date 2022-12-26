#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import view, get, redirect
import config

from libraries import userlib

@get('/suppliers')
@view('suppliers')
def suppliers():
    userlib.check_page_access('suppliers','r')
    return dict(current_user=userlib.get_cur_user(), version=config.VERSION,menu=userlib.get_menu())
