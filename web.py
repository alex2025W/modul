#!/usr/bin/python
# -*- coding: utf-8 -*-

from gevent import monkey
monkey.patch_all()

from bottle import route
from bottle import run
from bottle import view
from bottle import get
from bottle import post
from bottle import put
from bottle import request
from bottle import error
from bottle import abort
from bottle import response
from bottle import debug
from bottle import static_file
from bottle import template
from bottle import redirect
from bottle import BaseRequest
from bottle import Bottle

import os
import urllib
import config

# CONTROLLERS_V2
from controllers_v2 import controller
from controllers_v2 import lifetime_export_controller
from controllers_v2 import order_export_controller
from controllers_v2 import money_controller
from controllers_v2 import sales_funnel_controller

# CONTROLLERS
from controllers import mtocontroller
from controllers import suppliercontroller
from controllers import logincontroller
from controllers import usercontroller
from controllers import clientcontroller
from controllers import ordercontroller
from controllers import dircontroller
from controllers import logscontroller
from controllers import rolecontroller
from controllers import workordercontroller
from controllers import errorscontroller
from controllers import plannormcontroller
from controllers import briefcontroller
from controllers.esud import esudcontroller
from controllers.esud import esuddatacontroller
from controllers import esudtreegraphcontroller
from controllers import statscontroller
from controllers import conformitycontroller
from controllers import claimscontroller
from controllers import weekendscontroller
from controllers import contractcontroller
from controllers import purchaseordercontroller
from controllers import stockcontroller
from controllers import shifttaskcontroller
from controllers import reportcontroller
from controllers import atscontroller
from controllers import projectcontroller
from controllers import calculatorcontroller
from controllers import financecontroller
from controllers import documentationcontroller
from controllers import joblogcontroller
from controllers import incomingcontroller

# HANDLERS
from handlers import plancalculationhandler
from handlers import supplierhandler
from handlers import goodshandler
from handlers import timelinehandler
from handlers import calculatorhandler
from handlers import userhandler
from handlers import clienthandler
from handlers import orderhandler
from handlers import dirhandler
from handlers import handler
from handlers import rolehandler
from handlers import workorderhandler
from handlers import workorderdatehandler
from handlers import jobloghandler
from handlers import errorshandler
from handlers import plannormhandler
from handlers import plannormblankhandler
from handlers import briefhandler
from handlers.esud import esudhandler
from handlers.esud import esuddatahandler
from handlers.esud import esudspecificationhandler
from handlers.esud import esudcomplecthandler
from handlers import integrahandler
from handlers import statshandler
from handlers import conformityhandler
from handlers import claimshandler
from handlers import contracthandler
from handlers.esud import productionorderhandler
from handlers import newworkorderhandler
from handlers import newjobloghandler
from handlers import purchaseorderhandler
from handlers import stockhandler
from handlers import queuehandler
from handlers import shifttaskhandler
from handlers import atshandler
from handlers import projecthandler
from handlers import documentationhandler
from handlers import schedulerhandler
from handlers import absencepagehandler
from handlers import plannormhandler_v2
from handlers import servicehandler

# LIBRARIES
from libraries import userlib
# ERRORS
from errors import pageerrors

BaseRequest.MEMFILE_MAX = 1024 * 1024 * 100


# from apis.contract import contractapi
# contractapi.create_google_folder_for_each_contract()


@route('/google0da6d32737d0714a.html')
def google_verification_1():
    return static_file('google0da6d32737d0714a.html', root=os.getcwd() + '/')


@route('/google15922b79b8f6a7e2.html')
def google_verification_2():
    return static_file('google15922b79b8f6a7e2.html', root=os.getcwd() + '/')


@route('/confidential.html')
def confidential():
    return static_file('confidential.html', root=os.getcwd() + '/')


# INCLUDE STATIC FILES
@route('/static/<filepath:path>')
def server_static(filepath):
    return static_file(filepath, root=os.getcwd() + '/static/')


# INCLUDE FRONTEND V_1 FILES
@route('/frontend/<filepath:path>')
def server_static_frontend(filepath):
    return static_file(filepath, root=os.getcwd() + '/frontend/')


# INCLUDE FRONTEND V_2 FILES
@route('/frontend_v2_build/<filepath:path>')
def server_static_v2(filepath):
    return static_file(filepath, root=os.getcwd() + '/frontend_v2_build/')


# run(host=config.host, port=config.port, debug = config.debug, reloader = config.reloader)
run(host=config.host, port=config.port, debug=config.debug, reloader=config.reloader, server='gevent')
