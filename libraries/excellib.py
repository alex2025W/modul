#!/usr/bin/python
# -*- coding: utf-8 -*-
from copy import deepcopy,copy
from xlrd import open_workbook
from xlutils.copy import copy as wbcopy
from xlwt import Workbook
import datetime
import math
import io
from models import usermodel
from libraries import userlib
import httplib2
from googleapiclient.discovery import build
from googleapiclient.http import MediaInMemoryUpload
import config
import routine
from helpers.google_api import drive
#
#-------------------------------WORK ORDERS-----------------------------------------------------------------
#
# обновить данные в кэше для пользователя
def make_workorder_blank(workorders):
	# создать workbook для записи
	res = __workorder_get_writeblank(workorders)
	# заполняем workbook
	sheet_index = 0
	if len(workorders)==0:
		return None
	filename= str(workorders[0]['contract_number'])+":"
	numlist = []
	for wo in workorders:
		numlist.append(str(int(wo['number'])))
		#w_sheet =  copy(wb.get_sheet(0))
		pages = math.ceil(len(wo['plan_work'])/15.0)
		pg = 0
		sumcost = 0
		maxday = 0
		while pg<pages:
			w_sheet = res.get_sheet(sheet_index)
			# заполняется шапка
			__workorder_blank_fillheaders(w_sheet,wo)
			# указываем число страниц
			pg_str = str(pg+1)+u' из '+str(int(pages))
			__set_cell_value(w_sheet, 0 , 23, pg_str)
			# заполняем значение таблицы
			wres = __workorder_fill_page(w_sheet,wo,pg*15,min([(pg+1)*15,len(wo['plan_work'])]))
			sumcost+=wres['sum']
			maxday = max([wres['maxday'],maxday])
			# заполняем итоговые значения
			# if pg==(pages-1):
			# 	__set_cell_value(w_sheet,18,5,sumcost)
			# 	__set_cell_value(w_sheet,18,6,maxday)
			pg=pg+1
			sheet_index = sheet_index+1
	res.active_sheet = 0
	f = io.BytesIO()
	res.save(f)
	filename+=','.join(numlist)+".xls"
	return {'file_name': filename, 'stream': f }
	#return upload_to_google(f.getvalue(),filename, config.work_order_blanks_folder_id)

# получить эксель для записи
def __workorder_get_writeblank(workorders):
	rb = open_workbook('blanks/workorder-blank_a3.xlt',formatting_info=True)
	res = wbcopy(rb)
	sheets = []
	w_sheet = res.get_sheet(0)
	for wo in workorders:
		pg = 0
		pages = math.ceil(len(wo['plan_work'])/15.0)
		if pages==1:
				w_sheet.set_name(str(wo['number']))
		else:
			w_sheet.set_name(str(wo['number'])+"-"+str(pg))
		while pg<pages:
			wh = copy(w_sheet)
			wh.set_name(str(wo['number'])+"-"+str(pg))
			sheets.append(wh)
			pg = pg+1
	if len(sheets)>0:
		res._Workbook__worksheets = sheets
	# записывам эксель в память, и снова его отткуда читаем
	f = io.BytesIO()
	res.save(f)
	return wbcopy(open_workbook(file_contents=f.getvalue(),formatting_info=True))

# заполняется шапка
def __workorder_blank_fillheaders(w_sheet, workorder):
	__set_cell_value(w_sheet,0,2,workorder["number"])
	order = str(workorder["contract_number"])+"."+str(workorder["production_number"])
	if len(workorder['production_units'])==1:
		order+="."+str(workorder['production_units'][0]['unit_number'])
	__set_cell_value(w_sheet,0,8,order)
	__set_cell_value(w_sheet,0,11,(datetime.datetime.utcnow()+ datetime.timedelta(hours=4)).strftime("%d.%m.%Y"))

	if 'sector' in workorder:
		__set_cell_value(w_sheet,0,16,workorder['sector']['name']+" ["+str(workorder['sector']['code'])+"]")
	else:
		__set_cell_value(w_sheet,0,16,'')

# заполняем значение таблицы
def __workorder_fill_page(w_sheet, workorder, elfrom, elto):
	#print str(elfrom)+'-'+str(elto)
	sumcost = 0
	maxday = 0
	row = 3
	while elfrom<elto:
		elem = workorder['plan_work'][elfrom]
		price = 0
		dayscount = elem['days_count'] if 'days_count' in elem else 0
		if 'work' in elem:
			__set_cell_value(w_sheet,row,0,elem['work']['code'])
			__set_cell_value(w_sheet,row,1,elem['work']['name'])
			__set_cell_value(w_sheet,row,3,elem['work']['unit'])
			#__set_cell_value(w_sheet,row,4,elem['work']['price'])
			price = elem['work']['price']
		else:
			__set_cell_value(w_sheet,row,0,elem['code'])
			__set_cell_value(w_sheet,row,1,'')
			__set_cell_value(w_sheet,row,3,'')
			#__set_cell_value(w_sheet,row,4,0)
		__set_cell_value(w_sheet,row,2,elem['scope'])
		#__set_cell_value(w_sheet,row,5,elem['scope']*price)
		#__set_cell_value(w_sheet,row,6,dayscount)
		maxday = max([maxday,dayscount])
		sumcost += routine.strToFloat(elem['scope']) * routine.strToFloat(price)
		row = row+1
		elfrom=elfrom+1
	return {'sum':sumcost, 'maxday':maxday}


#
#-------------------------------PLAN NORMS----------------------------------------------------------------------------------------------------------------------------
#
def plannorms_make_blank(data, split_sectors):
	"""Plan norms blank generator
		data = {
			'blank_number': blank_number,
			'order_number': order_number,
			'cur_date': cur_date,
			'sectors': sectors,
			'materials': materials,
			'materials_ids': materials_ids
		},
		split_sectors = True/False
	"""
	if split_sectors:
		# blank with materials splitted by sectors
		return __plannorms_make_blank_split_sectors(data)
	else:
		# blank with all materials
		return __plannorms_make_blank_general(data)


#------------SPLIT SECTORS------------------------------------------------------
def __plannorms_make_blank_split_sectors(data):
	"""Generate plan norm blank with materials splitted by sectors"""

	# подготовить workbook для записи
	res = __plannorms_get_writeblank_splited_sectors(data['sectors'])
	# заполняем workbook
	sheet_index = 0
	#if len(data['materials'])==0:
	#	return None

	filename= data['order_number']+": "
	numlist = []
	for row in data['sectors']:
		sector = data['sectors'][row]
		numlist.append(str(sector['sector']['code']))
		pages = math.ceil(len(sector['materials'])/17.0)
		pg = 0
		sumcost = 0
		materials_count = len(sector['materials'])
		#  подсчет полного объема закупки
		for elem in sector['materials']:
			sumcost+= routine.strToFloat(elem['pto_size']) * routine.strToFloat(elem['material_info']['unit_purchase_value']) * data['product_units_count']
		while pg<pages:
			w_sheet = res.get_sheet(sheet_index)
			# заполняется шапка
			__set_cell_value(w_sheet,0,2,data['blank_number']) # blank number
			__set_cell_value(w_sheet,0,4,data['cur_date']) # date
			__set_cell_value(w_sheet,1,1,data['order_number']) # order_number
			__set_cell_value(w_sheet,1,3, sector['sector']['name'] + ' [' + str(sector['sector']['code']) + ']') # sector_info
			pg_str = str(pg+1)+u' из '+str(int(pages))
			__set_cell_value(w_sheet,0,10,pg_str) #page
			__set_cell_value(w_sheet,1,9, str(materials_count) + ' / ' + '%.3f' % sumcost) # control summ
			# заполняем значение таблицы
			__plannorms_fill_page(w_sheet,sector['materials'],pg*17,min([(pg+1)*17,len(sector['materials'])]), data['product_units_count'])

			pg=pg+1
			sheet_index = sheet_index+1
	res.active_sheet = 0
	f = io.BytesIO()
	res.save(f)
	filename+=','.join(numlist)+".xls"

	# Upload to Google Disk
	usr = userlib.get_cur_user()
	tmp_number = data['order_number'].split('.')
	folder_id = config.plan_norm_blanks_folder_id
	service = drive.get_service(usr['email'])
	folders = drive.get_folder_by_name(service, config.plan_norm_blanks_folder_id, tmp_number[0])
	if folders is not None and len(folders)>0:
		folder_id = folders[0]['id']
		#print('--------exist folder--------')
		#print(folder_id)
		#print('----------')
	else:
		new_folder = drive.add_folder(usr['email'], config.plan_norm_blanks_folder_id, tmp_number[0])
		#print('--------new folder--------')
		#print(routine.JSONEncoder().encode(new_folder))
		#print('----------')
		if new_folder is not None:
			folder_id = new_folder['id']

	return drive.upload_file(usr['email'], folder_id, filename, MediaInMemoryUpload(f.getvalue()),  'application/xls')['webContentLink']
	#return upload_to_google(f.getvalue(),filename, config.plannorm_blanks_folder_id)

def __plannorms_fill_page(w_sheet, data, elfrom, elto, production_units_count):
	"""Fill plan norms materials sizes
	data = [materials]
	production_units_count - count of production units
	"""

	row = 3
	while elfrom<elto:
		elem = data[elfrom]
		tmp_key = str(elem['materials_group_key']) + '.'  + str(elem['materials_key'])
		if elem.get('unique_props_key'):
			tmp_key += '.'+str(elem.get('unique_props_key'))
		__set_cell_value(w_sheet,row,0,tmp_key) # код материала
		material_name = elem['material_info']['name']
		material_name += ' (' +elem['unique_props'] + ')' if 'unique_props' in elem and elem['unique_props']!='' else ''

		# выставление высоты-------
		text_rows = math.ceil(float(len(material_name)) / 55) + 1     #55 is the number of characters to
		twips_per_row = 255 #default row height for 10 point font
		new_row_height = int(text_rows * twips_per_row)
		__set_row_height(w_sheet,row,new_row_height)
		#------------------------------------

		__set_cell_value(w_sheet,row,1,material_name) # Название материала
		__set_cell_value(w_sheet,row,3,elem['pto_size']) # объем ПТО
		__set_cell_value(w_sheet,row,4,elem['material_info']['unit_pto']) # Ед. ПТО
		esh_size = math.ceil(routine.strToFloat(elem['pto_size']) * routine.strToFloat(elem['material_info']['sku_pto_proportion']))
		__set_cell_value(w_sheet,row,5, esh_size if esh_size>0 else '-' ) # Кол-во ЕСХ
		__set_cell_value(w_sheet,row,6,elem['material_info']['sku_name'] if esh_size>0 else '-') # Ед. ЕСХ
		__set_cell_value(w_sheet,row,7,routine.strToFloat(elem['pto_size']) * routine.strToFloat(elem['material_info']['unit_purchase_value']) * production_units_count) # объем зак.
		__set_cell_value(w_sheet,row,8,elem['material_info']['unit_purchase']) # Ед. Закупки

		row = row+1
		elfrom=elfrom+1

def __plannorms_get_writeblank_splited_sectors(data):
	"""Generate sheets from template using copy first shield"""
	rb = open_workbook('blanks/plannorm-blank.xlt',formatting_info=True)
	res = wbcopy(rb)
	sheets = []
	w_sheet = res.get_sheet(0)
	for row in data:
		item = data[row]
		pg = 0
		pages = math.ceil(len(item['materials'])/17.0)
		if pages==1:
			w_sheet.set_name(str(item['sector']['code']))
		else:
			w_sheet.set_name(str(item['sector']['code'])+"-"+str(pg))
		while pg<pages:
			wh = copy(w_sheet)
			wh.set_name(str(item['sector']['code'])+"-"+str(pg))
			sheets.append(wh)
			pg = pg+1
	if len(sheets)>0:
		res._Workbook__worksheets = sheets
	# записывам эксель в память, и снова его оттуда читаем
	f = io.BytesIO()
	res.save(f)
	return wbcopy(open_workbook(file_contents=f.getvalue(),formatting_info=True))


#----------GENERAL BLANKS-----------------------------------------------------------------------
def __plannorms_make_blank_general(data):
	"""Generate plan norm blank with materials"""

	# подготовить workbook для записи
	res = __plannorms_get_writeblank_general(data['materials'])
	# заполняем workbook
	sheet_index = 0
	if len(data['materials'])==0:
		return None

	filename= data['order_number']+": "
	numlist = []
	for row in data['sectors']:
		sector = data['sectors'][row]
		numlist.append(str(sector['sector']['code']))

	pages = math.ceil(len(data['materials'])/17.0)
	pg = 0
	sumcost = 0
	materials_count = len(data['materials'])
	#  подсчет полного объема закупки
	for elem in data['materials']:
		sumcost+= routine.strToFloat(elem['pto_size']) * routine.strToFloat(elem['material_info']['unit_purchase_value']) * data['product_units_count']

	while pg<pages:
		w_sheet = res.get_sheet(sheet_index)
		# заполняется шапка
		__set_cell_value(w_sheet,0,2,data['blank_number']) # blank number
		__set_cell_value(w_sheet,0,4,data['cur_date']) # date
		__set_cell_value(w_sheet,1,1,data['order_number']) # order_number
		__set_cell_value(w_sheet,1,3, '; '.join(numlist)) # sector_info
		pg_str = str(pg+1)+u' из '+str(int(pages))
		__set_cell_value(w_sheet,0,10,pg_str) #page
		__set_cell_value(w_sheet,1,9, str(materials_count) + ' / ' + '%.3f' % sumcost) # control summ
		# заполняем значение таблицы
		__plannorms_fill_page(w_sheet,data['materials'],pg*17,min([(pg+1)*17,len(data['materials'])]), data['product_units_count'])

		pg=pg+1
		sheet_index = sheet_index+1
	res.active_sheet = 0
	f = io.BytesIO()
	res.save(f)
	filename+=','.join(numlist)+".xls"

	# Upload to Google Disk
	usr = userlib.get_cur_user()
	tmp_number = data['order_number'].split('.')
	service = drive.get_service(usr['email'])
	folders = drive.get_folder_by_name(service, config.plan_norm_blanks_folder_id, tmp_number[0])
	folder_id = config.plan_norm_blanks_folder_id
	if len(folders)>0:
		folder_id = folders[0]['id']
	else:
		new_folder = drive.add_folder(usr['email'], config.plan_norm_blanks_folder_id, tmp_number[0])
		if new_folder is not None:
			folder_id = new_folder['id']

	return drive.upload_file(usr['email'], folder_id, filename, MediaInMemoryUpload(f.getvalue()),  'application/xls')['webContentLink']
	#return upload_to_google(f.getvalue(),filename, config.plannorm_blanks_folder_id)


def __plannorms_get_writeblank_general(data):
	"""Generate sheets from template using copy first shield"""
	rb = open_workbook('blanks/plannorm-blank.xlt',formatting_info=True)
	res = wbcopy(rb)
	sheets = []
	w_sheet = res.get_sheet(0)
	pg = 0
	pages = math.ceil(len(data)/17.0)
	if pages==1:
		w_sheet.set_name("0")
	else:
		w_sheet.set_name(str(pg))
	while pg<pages:
		wh = copy(w_sheet)
		wh.set_name(str(pg))
		sheets.append(wh)
		pg = pg+1

	if len(sheets)>0:
		res._Workbook__worksheets = sheets
	# записывам эксель в память, и снова его оттуда читаем
	f = io.BytesIO()
	res.save(f)
	return wbcopy(open_workbook(file_contents=f.getvalue(),formatting_info=True))




#
#-------------------------------COMMON FUNCTIONS---------------------------------------------------------------------------------------------------------------
#
def __get_cell(w_sheet, rowIndex, colIndex ):
    """ HACK: Extract the internal xlwt cell representation. """
    row = w_sheet._Worksheet__rows.get(rowIndex)
    if not row: return None
    cell = row._Row__cells.get(colIndex)
    return cell

def __set_cell_value(w_sheet, row, column, value):
	 cell = __get_cell(w_sheet, row, column)
	 w_sheet.write(row,column,value)
	 cell1 = __get_cell(w_sheet, row, column)
	 if cell:
	 	cell1.xf_idx = cell.xf_idx

def __set_row_height(w_sheet, row, value):
	'''
	Установить высоту строке
	row - номер строки
	value - высота
	'''
	w_sheet.row(row).height = value

def upload_to_google(xlsDoc, filename, folder_id):
	media = MediaInMemoryUpload(xlsDoc)
	res = drive.upload_file(userlib.get_cur_user()['email'], folder_id, filename, media,  'application/xls')
	return res['webContentLink']
	# credentials = usermodel.get_user_credentials(userlib.get_cur_user()['email'])
	# http = httplib2.Http()
	# http = credentials.authorize(http)
	# service = build('drive', 'v2', http=http)
	# media = MediaInMemoryUpload(xlsDoc)
	# body = {
	# 	'title': filename,
	# 	'description': '',
	# 	'mimeType': 'application/xls',
	# 	'parents': [{'id':folder_id}]
	# }
	# file = service.files().insert(body=body,media_body=media).execute()
	# return file['webContentLink']
