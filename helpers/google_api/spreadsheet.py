#!/usr/bin/python
# -*- coding: utf-8 -*-
import json
import httplib2
from httplib import BadStatusLine
from googleapiclient.http import BatchHttpRequest
from googleapiclient.discovery import build
from apiclient import errors
from models import usermodel
import exceptions
import datetime
from copy import deepcopy,copy
from traceback import print_exc

class Spreadsheet:
  '''
    Class for working with google spreadsheets
  '''
  _user_email = ""      # email for acces to groups
  _service = None       # google service
  spreadsheetId = None  # id of spreadsheet
  requests = []
  valueRanges = []

  def __init__(self, user_email, spreadsheetId=None):
    '''
      Constructor
    '''
    self._user_email = user_email
    self.spreadsheetId = spreadsheetId
    self.requests = []
    self.valueRanges = []

    self._service = self.__get_service(user_email)
    if not self._service:
      raise Exception('------ERROR get google service------')

  def htmlColorToJSON(htmlColor):
    if htmlColor.startswith("#"):
      htmlColor = htmlColor[1:]
    return {
      "red": int(htmlColor[0:2], 16) / 255.0,
      "green": int(htmlColor[2:4], 16) / 255.0,
      "blue": int(htmlColor[4:6], 16) / 255.0
    }

  def get_user_email():
    '''
      prop for get user email
    '''
    return self._user_email

  def __get_service(self, user_email):
    '''
      Get credentials for user by email
    '''
    try:
      credentials = usermodel.get_user_credentials(user_email)
      if not credentials:
        print('------Error! Null credentials for user:{0}'.format(user_email))
        return None
      http = httplib2.Http()
      http = credentials.authorize(http)
      _service = build('sheets', 'v4', http=http)
      return _service
    except Exception, exc:
      excType = exc.__class__.__name__
      print('------ERROR get credentials------')
      print_exc()
    return None

  def create(self, title, sheetTitle, rows = 1000, cols = 26, locale = 'en_US', timeZone = 'Etc/GMT'):
    '''
      create new spreadsheet
    '''
    spreadsheet = self._service.spreadsheets().create(body = {
        'properties': {
          'title': title,
          'locale': locale,
          'timeZone': timeZone
        },
        'sheets': [{
          'properties': {
            'sheetType': 'GRID',
            'sheetId': 0,
            'title': sheetTitle,
            'gridProperties': {'rowCount': rows, 'columnCount': cols}
          }
        }]
    }).execute()
    self.spreadsheetId = spreadsheet['spreadsheetId']
    return spreadsheet

  def getSpreadsheetById(self, spreadsheetId=None):
    spreadsheetId = self.spreadsheetId or spreadsheetId
    if not spreadsheetId:
      raise Exception('Null spreadsheetId')
    return self._service.spreadsheets().get(spreadsheetId = spreadsheetId).execute()

  def runPrepared(self, valueInputOption = "USER_ENTERED"):
    '''
      spreadsheets.batchUpdate and spreadsheets.values.batchUpdate
    '''
    if self.spreadsheetId is None:
      raise Exception('Null spreadsheetId')

    upd1Res = {'replies': []}
    upd2Res = {'responses': []}
    try:
      if len(self.requests) > 0:
        upd1Res = self._service.spreadsheets().batchUpdate(
          spreadsheetId = self.spreadsheetId,
          body = {"requests": self.requests}
        ).execute()

      if len(self.valueRanges) > 0:
        upd2Res = self._service.spreadsheets().values().batchUpdate(
          spreadsheetId = self.spreadsheetId,
          body = {"valueInputOption": valueInputOption,"data": self.valueRanges}
        ).execute()
    finally:
      self.requests = []
      self.valueRanges = []
    return (upd1Res['replies'], upd2Res['responses'])

  def prepare_addSheet(self, sheetTitle, rows = 1000, cols = 26):
    '''
      Add sheet to spreadsheet
    '''
    return self.requests.append({
      "addSheet": {
        "properties": {
          "title": sheetTitle,
          'gridProperties': {
            'rowCount': rows,
            'columnCount': cols
          }
        }
      }
    })

  def addSheet(self, sheetTitle, rows = 1000, cols = 26):
    '''
      Adds new sheet to current spreadsheet, sets as current sheet and returns it's id
    '''
    if self.spreadsheetId is None:
        raise Exception('Null spreadsheetId')
    self.prepare_addSheet(sheetTitle, rows, cols)
    new_sheet = self.runPrepared()[0][0]['addSheet']['properties']
    return new_sheet

  def getAllSheets(self):
    sheet_metadata = self._service.spreadsheets().get(spreadsheetId=self.spreadsheetId).execute()
    return sheet_metadata.get('sheets', '')

  def toGridRange(self, sheetId, cellsRange):
    '''
      Converts string range to GridRange of current sheet; examples:
      "A3:B4" -> {sheetId: id of current sheet, startRowIndex: 2, endRowIndex: 4, startColumnIndex: 0, endColumnIndex: 2}
      "A5:B"  -> {sheetId: id of current sheet, startRowIndex: 4, startColumnIndex: 0, endColumnIndex: 2}
    '''
    if sheetId is None:
        raise Exception('Null sheetId')
    if isinstance(cellsRange, str):
        startCell, endCell = cellsRange.split(":")[0:2]
        cellsRange = {}
        rangeAZ = range(ord('A'), ord('Z') + 1)
        if ord(startCell[0]) in rangeAZ:
            cellsRange["startColumnIndex"] = ord(startCell[0]) - ord('A')
            startCell = startCell[1:]
        if ord(endCell[0]) in rangeAZ:
            cellsRange["endColumnIndex"] = ord(endCell[0]) - ord('A') + 1
            endCell = endCell[1:]
        if len(startCell) > 0:
            cellsRange["startRowIndex"] = int(startCell) - 1
        if len(endCell) > 0:
            cellsRange["endRowIndex"] = int(endCell)
    cellsRange["sheetId"] = sheetId
    return cellsRange

  def prepare_setDimensionPixelSize(self, sheetId, dimension, startIndex, endIndex, pixelSize):
    if sheetId is None:
        raise Exception('Null sheetId')
    self.requests.append({"updateDimensionProperties": {
      "range": {
        "sheetId": sheetId,
        "dimension": dimension,
        "startIndex": startIndex,
        "endIndex": endIndex
      },
      "properties": {"pixelSize": pixelSize},
      "fields": "pixelSize"}
    })

  def prepare_setColumnsWidth(self, sheetId, startCol, endCol, width):
    self.prepare_setDimensionPixelSize(sheetId, "COLUMNS", startCol, endCol + 1, width)

  def prepare_setColumnWidth(self, sheetId, col, width):
    self.prepare_setColumnsWidth(col, col, width)

  def prepare_setRowsHeight(self, sheetId, startRow, endRow, height):
    self.prepare_setDimensionPixelSize(sheetId, "ROWS", startRow, endRow + 1, height)

  def prepare_setRowHeight(self, sheetId, row, height):
    self.prepare_setRowsHeight(sheetId, row, row, height)

  def get_sheet_id_by_name(self, sheetName):
    for i in self.getAllSheets():
      if i['properties']['title']==sheetName:
        return i['properties']['sheetId']
    return None

  def get_sheet_info_by_name(self, sheetName):
    for i in self.getAllSheets():
      if i['properties']['title']==sheetName:
        return i
    return None

  def prepare_delete_all_rows_from(self, sheetName, startRowIndex):
    '''
      Delete all rows from sheet starting from defimed row index
      sheetName - name of sheet what would be changed
      startRowIndex
    '''
    sheetInfo = self.get_sheet_info_by_name(sheetName)
    if sheetInfo:
      startIndex = startRowIndex
      endIndex = sheetInfo['properties']['gridProperties']['rowCount']
      self.requests.append({
        "deleteDimension": {
           "range": {
              "sheetId":  sheetInfo['properties']['sheetId'],
              "dimension": "ROWS",
              "startIndex": startIndex,
              "endIndex": endIndex,
           }
        }
      })

  def prepare_add_rows(self, sheetName, count):
    '''
      Add new rows to the end of sheet
      count - count of new rows
      sheetName - name of sheet
    '''
    self.requests.append({
      "appendCells": {
        "sheetId": self.get_sheet_id_by_name(sheetName),
        "rows": [[{}] for i in range(count)],
        "fields": '*'
      }
    })

  def prepare_setValues(self, sheetTitle, cellsRange, values, majorDimension = "ROWS"):
    if sheetTitle is None:
      raise Exception('Null sheetTitle')
    self.valueRanges.append({
      "range": sheetTitle + "!" + cellsRange,
      "majorDimension": majorDimension,
      "values": values
    })

  def prepare_mergeCells(self, sheetId, cellsRange, mergeType = "MERGE_ALL"):
    self.requests.append({
      "mergeCells": {
        "range": self.toGridRange(sheetId, cellsRange),
        "mergeType": mergeType
      }
    })

  def prepare_setCellsFormat(self, cellsRange, formatJSON, fields = "userEnteredFormat"):
    '''
      formatJSON should be dict with userEnteredFormat to be applied to each cell
    '''
    self.requests.append({
      "repeatCell": {
        "range": self.toGridRange(cellsRange),
        "cell": {"userEnteredFormat": formatJSON},
        "fields": fields
      }
    })

  def prepare_setCellsFormats(self, cellsRange, formatsJSON, fields = "userEnteredFormat"):
    '''
      formatsJSON should be list of lists of dicts with userEnteredFormat for each cell in each row
    '''
    self.requests.append({
      "updateCells": {
        "range": self.toGridRange(cellsRange),
        "rows": [
          {"values": [
            {"userEnteredFormat": cellFormat} for cellFormat in rowFormats
          ]} for rowFormats in formatsJSON
        ],
        "fields": fields
      }
    })
