#!/usr/bin/python
# -*- coding: utf-8 -*-
import json
import bson
import datetime, time
from bson.objectid import ObjectId
import exceptions
import config
import calendar
from dateutil.relativedelta import relativedelta
import math
import io
import gzip
import zlib
import base64
import StringIO
from traceback import print_exc
from models import dirmodel
import re
moscow_tz_offset = 3 # смещение UTC по москве

def __gt(dt_str):
  dt, _, us= dt_str.partition(".")
  dt= datetime.datetime.strptime(dt, "%Y-%m-%dT%H:%M:%S")
  try:
    us=int(us.rstrip("Z"), 10)
  except:
    us=0
  return dt + datetime.timedelta(microseconds=us)

def get_weekends():
  return (config.db.weekends.find_one({}, {'weekends': 1}) or {}).get("weekends", [])

def add_work_days(date, count):
  weekends = (config.db.weekends.find_one({}, {'weekends': 1}) or {}).get("weekends", [])
  new_date = None
  i = 1
  while i <= count:
    new_date = date + relativedelta(days = + i)
    if new_date.strftime('%Y-%m-%d') in weekends:
      count += 1
    i += 1
  return new_date

def add_work_days_soft(date, count, weekends):
  new_date = None
  i = 1
  while i <= count:
    new_date = date + relativedelta(days = + i)
    if new_date.strftime('%Y-%m-%d') in weekends:
      count += 1
    i += 1
  return new_date

def get_sost_days():
  sosts = dirmodel.get_by_type(3)
  return dict((str(s['_id']), (s['days'] if 'days' in s else 0)) for s in sosts)

class JSONEncoder(json.JSONEncoder):
  '''Convert to JSON'''
  def default(self, o):
    if isinstance(o, ObjectId):
      return str(o)
    elif isinstance(o, datetime.datetime):
      return o.isoformat()
    return json.JSONEncoder.default(self, o)

def JSONDecode(str):
  try:
    return json.JSONDecoder().decode(str)
  except:
    return {}

def textToDateRange(s):
  today = datetime.datetime.today()
  if (s == 'today'):
    return [today.replace(hour=0, minute=0, second=0,microsecond=0), today.replace(hour=23, minute=59, second=59,microsecond=0)];
  if (s == 'yesterday'):
    dt1 = today-datetime.timedelta(days=1)
    return [dt1.replace(hour=0, minute=0, second=0,microsecond=0), dt1.replace(hour=23, minute=59, second=59,microsecond=0)];
  if (s == '7days'):
    dt1 = today-datetime.timedelta(days=6)
    return [dt1.replace(hour=0, minute=0, second=0,microsecond=0), today.replace(hour=23, minute=59, second=59,microsecond=0)];
  if (s == '30days'):
    dt1 = today-datetime.timedelta(days=30)
    return [dt1.replace(hour=0, minute=0, second=0,microsecond=0), today.replace(hour=23, minute=59, second=59,microsecond=0)];
  if (s=='thisweek'):
    dt1 =  today - datetime.timedelta(days=today.weekday())+datetime.timedelta(days=6)
    return [today.replace(hour=0, minute=0, second=0,microsecond=0), dt1.replace(hour=23, minute=59, second=59,microsecond=0)];
  if (s=='nextweek'):
    dt1 = today - datetime.timedelta(days=today.weekday())+datetime.timedelta(days=7)
    dt2 = today - datetime.timedelta(days=today.weekday())+datetime.timedelta(days=13)
    return [dt1.replace(hour=0, minute=0, second=0,microsecond=0), dt2.replace(hour=23, minute=59, second=59,microsecond=0)];
  if (s=='thismonth'):
    dt1 = today
    dt2 = today.replace(day=calendar.monthrange(today.year, today.month)[1])
    return [dt1.replace(hour=0, minute=0, second=0,microsecond=0), dt2.replace(hour=23, minute=59, second=59,microsecond=0)];
  if (s=='nextmonth'):
    dt1 = today + relativedelta(months=1)
    dt1 = dt1.replace(day=1)
    dt2 = dt1.replace(day=calendar.monthrange(dt1.year, dt1.month)[1])
    return [dt1.replace(hour=0, minute=0, second=0,microsecond=0), dt2.replace(hour=23, minute=59, second=59,microsecond=0)];
  if (s=='tomorrow'):
    dt1 = today + datetime.timedelta(days=1)
    return [dt1.replace(hour=0, minute=0, second=0,microsecond=0), dt1.replace(hour=23, minute=59, second=59,microsecond=0)];
  if (s=='old'):
    dt1 = today - relativedelta(years=1)
    dt2 = today-datetime.timedelta(days=1)
    return [dt1.replace(hour=0, minute=0, second=0,microsecond=0), dt2.replace(hour=23, minute=59, second=59,microsecond=0)];

def strToFloat(s):
  try:
    s = str(s).replace(' ','').lstrip('0')
    return float(str(s))
  except exceptions.ValueError:
    try:
      return float(str(s).replace('.',',')) if '.' in str(s) else float(str(s).replace(',','.'))
    except exceptions.ValueError:
      return 0
  except exceptions.TypeError:
    try:
      return float(str(s).replace('.',',')) if '.' in str(s) else float(str(s).replace(',','.'))
    except exceptions.ValueError:
      return 0

def strToInt(s):
  try:
    return int(strToFloat(s))
  except exceptions.ValueError:
    return 0

def strIsInt(s):
  try:
    int(strToFloat(s))
    return True
  except exceptions.ValueError:
    return False

def round(num):
  num = float(num)
  x = num - math.floor(num)
  if x == 0: return int(num)
  elif x < 0.5: return int(math.floor(num))
  else: return int(math.ceil(num))

def round_time(num):
  num = float(num)
  x = num - math.floor(num)
  if x == 0: return int(num)
  elif x < 0.5: return int(math.floor(num))
  else: return int(math.ceil(num))

def ceil(num):
  try:
    return int(math.ceil(num))
  except exceptions.ValueError:
    return 0

def floor(num):
  try:
    return int(math.floor(num))
  except exceptions.ValueError:
    return 0

def isDateWeekEnd(user_email,date):
  '''
  Проверка даты на выходной день
  '''
  weekends = (config.db.weekends.find_one({}, {'weekends': 1}) or {}).get("weekends", [])
  str_date = date.strftime('%Y-%m-%d')
  if str_date in weekends:
    return True
  return False

  # from helpers.google_api import calendar
  # '''Функция проверки на выходной день'''
  # if date.weekday()==6 or date.weekday()==5:
  #   return True
  # else:
  #   # получить события из праздничного календаря, елси собыытия есть, то значит выходной
  #   events = calendar.get_events_by_date(user_email, config.weekend_calendar, date)
  #   if events is not None and 'items' in events and len(events['items'])>0:
  #     return True
  #   return False

def strToDateTime(val):
  '''
  Преобразование строки в дату
  '''
  if val and isinstance(val, basestring):
    try:
      return datetime.datetime.strptime( val,'%d.%m.%Y %H:%M:%S')
    except:
      try:
        return datetime.datetime.strptime( val,'%d.%m.%Y')
      except:
        try:
          return datetime.datetime.strptime( val,'%Y-%m-%d')
        except:
          try:
            return datetime.datetime.strptime( val,'%Y-%m-%d %H:%M:%S')
          except:
            try:
              return datetime.datetime.strptime( val,'%Y-%m-%dT%H:%M:%S')
            except:
              return None
  return val
def pad(val, min):
  '''
  Преобразование числа в строку с добавлением перед числом необходимого количества нулей.
  min - минимальное число нулей.
  Пример: 1->001; 2->0002
  '''
  i = 0;
  n = val
  while(n>0):
    n = n / 10;
    i=+1;
  capacity = i if i>min else min
  return "%0{0}d".format(str(capacity) ) % (val)

def insert_dash(string, index):
  return string[:index] + '-' + string[index:]

#склоняет слово в зависимости от числа
def declension(num,expressions):
  if len(expressions)<3:
    expressions.append(expressions[1])
  count = num %100
  res = ''
  if count>=5 and count<=20:
    res = expressions[2]
  else:
    count = count%10
    if count==1:
      res = expressions[0]
    else:
      if count>=2 and count<=4:
        result = expressions[1]
      else:
        result = expressions[2]
  return res

# форматировать целое число с разделительным пробелом между тысячами
def int_format(val):
  try:
    return "{:,}".format(int(val)).replace(',', ' ')
  except:
    try:
      return str(val)
    except:
      return ""

# форматировать дробное число с разделительным пробелом между тысячами
def float_format(val):
  try:
    return "{:,}".format(float(val)).replace(',', ' ')
  except:
    try:
      return str(val)
    except:
      return ""

# преоброзование вещественного числа к определенному формату
# 234.434234 -> 234.34
def float_format_money(val):
  try:
    return "{:,.2f}".format(float(val)).replace(',', ' ').replace('.', ',')
  except:
    try:
      return str(val).replace('.', ',')
    except:
      return ""

# преобразование моссковского времени  к формату UTC
def dateToUtc(val):
  try:
    return val - datetime.timedelta(hours=moscow_tz_offset)
  except:
    return None

# преобразование моссковского времени  к формату UTC
def dateUtcToMoscow(val):
  try:
    return val + datetime.timedelta(hours=moscow_tz_offset)
  except:
    return None

# Архивация данных
# data - string
# type: 'gzip'
def compress(data, type='gzip'):
  try:
    if type =='gzip':
      s = StringIO.StringIO()
      with gzip.GzipFile(fileobj=s, mode='w') as f:
        f.write(data)
      return s.getvalue()
    else:
      deflate_compress = zlib.compressobj(9, zlib.DEFLATED, -zlib.MAX_WBITS)
      return deflate_compress.compress(data) + deflate_compress.flush()
  except Exception, exc:
    excType = exc.__class__.__name__
    print_exc()
    return None

# Разархивация данных
# type: 'gzip' or 'deflate'
def decompress(zipped_data, type='gzip'):
  try:
    if type == 'gzip':
      s = StringIO.StringIO(zipped_data)
      return gzip.GzipFile(fileobj=s).read()
    # elif type == 'lzw':
    #   from libraries import lzw
    #   zipped_data = base64.b64decode(zipped_data)
    #   data = lzw.decompress(bytes(bytearray(map(ord,zipped_data))))
    #   for bt in data:
    #     print(bt)
    else:
      zipped_data = base64.b64decode(zipped_data)
      newFileByteArray = bytearray(map(ord,zipped_data))
      data = zlib.decompress( bytes(newFileByteArray),  -zlib.MAX_WBITS) # deflate
    return data

  except Exception, exc:
    excType = exc.__class__.__name__
    print_exc()
    return None

def printMemSize():
  '''
    Вывод информации по используемой памяти
  '''
  # функция ковертации размеров
  def convert_bytes(n):
    symbols = ('K', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y')
    prefix = {}
    for i, s in enumerate(symbols):
      prefix[s] = 1 << (i + 1) * 10
    for s in reversed(symbols):
      if n >= prefix[s]:
        value = float(n) / prefix[s]
        return '%.1f%s' % (value, s)
    return "%sB" % n

  import psutil, os
  p = psutil.Process(os.getpid())
  pinfo = p.as_dict(ad_value='')
  mem = '%s%% (resident=%s, virtual=%s) ' % (round(pinfo['memory_percent'], 1),convert_bytes(pinfo['memory_info'].rss),convert_bytes(pinfo['memory_info'].vms))
  print mem

def is_string_objectid(val):
  '''
    Проверка формата строки на ObjectId
  '''
  try:
    ObjectId(val)
    return True
  except Exception, exc:
    return False

def comment_format(str_txt, type = 1):
  def rep_re(m):
    if m.group(3)=='contact':
      return '<a href="'+config.site_url+'/client-card/'+m.group(2)+'#'+m.group(1).replace('_',' ')+'" target="_blank">'+m.group(1).replace('_',' ')+'</a>'
    elif m.group(3)=='order':
      return '<a href="'+config.site_url+'/crm/'+m.group(1)+'" target="_blank">'+m.group(1).replace('_',' ')+'</a>'
    elif m.group(3)=='project':
      return '<a href="'+config.site_url+'/projects#search/'+m.group(2)+'" target="_blank">'+m.group(1).replace('_',' ')+'</a>'
    elif m.group(3)=='client':
      return '<a href="'+config.site_url+'/client-card/'+m.group(2)+'" target="_blank">'+m.group(1).replace('_',' ')+'</a>'
    return str_txt
  '''
    Форматирование строки типа - +[Елена_Михайленко|56123803afe13b00036f6e7d]  в ссылку
  '''
  result = str_txt
  if type ==1:
    result = re.sub(u'\B\+\[([\wА-Яа-я]+)\|([\wА-Яа-я]+)\]', lambda m:'<a href="'+config.site_url+'/client-card/'+m.group(2)+'#'+m.group(1).replace('_',' ')+'" target="_blank">'+m.group(1).replace('_',' ')+'</a>', result)
    result = re.sub(u'\B\+\[([\wА-Яа-я]+)\|([\wА-Яа-я]+)\|([\wА-Яа-я]+)\]', rep_re, result)
  else:
    result = re.sub(u'\B\+\[([\wА-Яа-я]+)\|([\wА-Яа-я]+)\]', lambda m:m.group(1).replace('_',' '), result)
    result = re.sub(u'\B\+\[([\wА-Яа-я]+)\|([\wА-Яа-я]+)\|([\wА-Яа-я]+)\]', lambda m:m.group(1).replace('_',' '), result)
  return result

def normalize_string(str):
  '''
    Удаление лишних пробелов из строки
  '''
  return ' '.join(filter(None,str.split(' ')))

def remove_all_spaces(str):
  '''
    Удаление всех пробелов из строки
  '''
  return ''.join(filter(None,str.split(' ')))

def clear_waste_symbols_string(val):
  '''
    Удаление из строки всех символов, кроме букв и цифр
  '''
  if not val:
    return ''
  val = str(val)
  return ''.join(c for c in val if c.isalpha() or c.isdigit()).lower()

def get_only_diggits(str):
  return strToInt(filter(lambda x: x.isdigit(), str))

