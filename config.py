# -*- coding: utf-8 -*-
import os
import json
from pymongo import MongoClient
import redis
from rq import Queue

# This is your Project Root
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))

# environment options
debug = True if os.environ.get('DEBUG') == 'True' else False
use_worker = True if os.environ.get('USE_WORKER') == 'True' else False
reloader = True if os.environ.get('RELOADER') == 'True' else False
host = os.environ.get('HOST', '0.0.0.0')
port = int(os.environ.get('PORT', 5000))

# Google Services
GOOGLE_ORGANISATION_DOMAIN_NAME = os.environ.get('GOOGLE_ORGANISATION_DOMAIN_NAME')

# REDIS and WORKERS-----------------------------------------------------------------------------------------
redis_url = os.environ.get('REDISTOGO_URL', 'redis://localhost:6379')
redis_conn = redis.from_url(redis_url)
# основная очередь для рутинных задач
qu_default = Queue('default', connection=redis_conn, default_timeout=180)
# очередь для работы со спецификациями
qu_low = Queue('low', connection=redis_conn, default_timeout=1200)
# очередь для работы с расчетами
qu_high = Queue('high', connection=redis_conn, default_timeout=1200)

# ClickHouse ---------------------------------------------------------------------------------------------------
CLICKHOUSE_DB_NAME = os.environ.get('CLICKHOUSE_DB_NAME', None)
CLICKHOUSE_HOST = os.environ.get('CLICKHOUSE_HOST', None)
CLICKHOUSE_USER = os.environ.get('CLICKHOUSE_USER', None)
CLICKHOUSE_PASSWORD = os.environ.get('CLICKHOUSE_PASSWORD', None)

# MONGODB---------------------------------------------------------------------------------------------------
connection = MongoClient(os.environ.get('MONGOHQ_URL'), connect=False)
db = connection[os.environ.get('MONGOHQ_DBNAME')]

# COOKIE SETTINGS-------------------------------------------------------------------------------------------
cookie_settings = {
    'cookie_sign': 'e183a9977145882e928fc8deabd185a3',
    'cookie_key': '08e447b6d0fe9ebb',
    'domain': os.environ.get('COOKIE_DOMAIN', 'localhost')
}

# SMTP SETTINGS---------------------------------------------------------------------------------------------
smtp_settings = {
    'email': os.environ.get('SMTP_EMAIL'),
    'from': os.environ.get('SMTP_FROM'),
    'host': os.environ.get('SMTP_HOST'),
    'port': int(os.environ.get('SMTP_PORT', '0')),
    'auth': True if os.environ.get('SMTP_AUTH') == 'True' else False,
    'user': os.environ.get('SMTP_USER'),
    'password': os.environ.get('SMTP_PASSWORD'),
    'tls': True if os.environ.get('SMTP_TLS') == 'True' else False,
    'fio': u'Йозеф Кнехт'
}

# Группа получателей сообщений по договорам
contracts_report_recepient = 'k@modul.org'

# 1C server settings
integra_1c_settings = {
    'wsdl': os.environ.get('WSDL_1C', ''),
    'user': os.environ.get('USER_1C', ''),
    'password': os.environ.get('PASSWORD_1C', ''),
    'key': os.environ.get('KEY_1C', '')
}

google_api_user = os.environ.get('GAPS_USER')
google_api_password = os.environ.get('GAPS_PASSWORD')

# google oauth settings
google_api_config = {
    'client_id': os.environ.get('GOOGLE_CLIENT_ID'),
    'client_secret': os.environ.get('GOOGLE_CLIENT_SECRET'),
    'redirect_uri': os.environ.get('GOOGLE_REDIRECT_URI'),
    'scope': (r'https://www.googleapis.com/auth/userinfo.profile' +
              r' https://www.googleapis.com/auth/userinfo.email' +
              r' https://www.googleapis.com/auth/calendar' +
              r' https://www.googleapis.com/auth/apps.groups.settings' +
              r' https://spreadsheets.google.com/feeds' +
              r' https://www.googleapis.com/auth/admin.directory.group.member' +
              r' https://www.googleapis.com/auth/admin.directory.group' +
              r' https://www.googleapis.com/auth/admin.directory.customer' +
              r' https://www.googleapis.com/auth/drive')
}

# google calendar setting
order_calendar = os.environ.get('ORDER_CALENDAR')
# calendar with russian holidays
weekend_calendar = os.environ.get('WEEKEND_CALENDAR')
# plan calendar Kaluga
plan_kaluga_calendar = os.environ.get('PLAN_KALUGA_CALENDAR')
# plan day calendar Kaluga
plan_day_kaluga_calendar = os.environ.get('PLAN_DAY_KALUGA_CALENDAR')
# plan calendar Penza
plan_penza_calendar = os.environ.get('PLAN_PENZA_CALENDAR')
# plan day calendar Penza
plan_day_penza_calendar = os.environ.get('PLAN_DAY_PENZA_CALENDAR')
# fact calendar Kaluga
fact_kaluga_calendar = os.environ.get('FACT_KALUGA_CALENDAR')
# fact calendar Penza
fact_penza_calendar = os.environ.get('FACT_PENZA_CALENDAR')

# google groups templates
google_groups_template = os.environ.get('GOOGLE_GROUPS_TEMPLATE')
google_groups_user_admin = os.environ.get('SMTP_EMAIL')

# WorkOrders and PlanNorms
# Каталог нарядов
work_order_blanks_folder_id = os.environ.get('WORKORDER_BLANKS_FOLDER')
# каталог норм
plan_norm_blanks_folder_id = os.environ.get('PLANNORM_BLANKS_FOLDER')

# CRM
# каталог для заявок
orders_google_container_folder = os.environ.get('CRM_GOOGLE_DOCS_FOLDER_CONTAINER')
# шаблон структуры каталогов CRM
orders_google_folder_id = os.environ.get('GOOGLE_DRIVE_ORDERS_FOLDER_ID')
orders_google_template_folder_id = os.environ.get('GOOGLE_DRIVE_ORDERS_FOLDER_TEMPLATE_ID')
# шаблон структуры каталогов CONTRACTS
contracts_google_folder_id = '0B_OYvA9LybdBM2VJWUdheDh2a1k'
# пользователь GAPS - устарело
orders_gaps_folder_creator = os.environ.get('CRM_GAPS_SCRIPT_FOLDER_CREATOR')
# SPECIFICATIONS -------------------------------------------------------------------------------------------
specifications_folder = '1gp-IsoTtM2mk-K-Fi8weq9uM0YN_FkKQ'
specification_report_template = '1SZrdxRQA49XxAX2xcsHCUtgpMQRmCPVubtuHzkTdhQA'

# GENERAL SETTINGS
# количество минут на сеанс работы пользователя в монопольном режиме
single_mode_time = 10
site_url = os.environ.get('SITE_URL')  # global site url
# get current version
VERSION = open('{0}/version.txt'.format(ROOT_DIR)).readline().rstrip()
# GOOGLE папка для хранения DB дампов
db_dumps_google_folder = '0B5MY4IErAcJWR2s1QmRFTHVrUGM'
# GOOGLE таблица в которую кладется результат калькуляции по спецификациям (раскрой)
google_production_order_calculation = '15KMyHTBKcwFjX-l8hxGHpwarq4CLDpkzyetgt8QFAdU'
lifetime_report_google_spreadsheet_id = os.environ.get('GOOGLE_SPREADSHEET_LIFETIME_ID')

GOOGLE_API_SCOPES = (
    'https://mail.google.com/',
    'https://spreadsheets.google.com/feeds',
    'https://www.googleapis.com/auth/admin.directory.customer',
    'https://www.googleapis.com/auth/admin.directory.group',
    'https://www.googleapis.com/auth/admin.directory.group.member',
    'https://www.googleapis.com/auth/apps.groups.settings',
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/gmail.compose',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
)

# GMAIL ---------------------------------------------------------------------------------------------
MAIL_FROM = os.environ.get('MAIL_FROM', None)

# Google Service account
SERVICE_ACCOUNT_INFO = json.loads(os.environ.get('GOOGLE_API_CREDENTIALS', {}))
order_export_spreadsheet_id = os.environ.get('ORDER_EXPORT_CHANCE_SPREADSHEET_ID')
