#!/usr/bin/python
# -*- coding: utf-8 -*-
from bottle import route
from bottle import template

import config
from libraries import userlib


@route('/absence_page')
@route('/absence_page/')
@route('/absence-page')
@route('/absence-page/')
def absence_page():
    """
    Staff. Absence page

    :return:
    """
    userlib.check_page_access('absence', 'r')
    return template('frontend_v2_build/absence-page/index', version=config.VERSION)


@route('/material_price_page')
@route('/material_price_page/')
@route('/material-price_page')
@route('/material-price_page/')
def material_price_page():
    """
    Service. Materials price info page

    :return:
    """
    userlib.check_page_access('material_price_page', 'r')
    return template('frontend_v2_build/material-price-page/index', version=config.VERSION)



