from apiclient import discovery
from googleapiclient.errors import HttpError

from helpers.google.auth import credentials


DEFAULT_VALUE_INPUT_OPTION = 'RAW'


def service_get():
    return discovery.build('sheets', 'v4', credentials=credentials)


def spreadsheet_get(spreadsheet_id, worksheet_name, column_range):
    """
    Read values from spreadsheet

    :param spreadsheet_id:
    :param worksheet_name:
    :param column_range:
    :return:
    """
    service = service_get()
    sheet = service.spreadsheets()

    result = sheet.values().get(
        spreadsheetId=spreadsheet_id,
        range='{}!{}'.format(worksheet_name, column_range)
    ).execute()

    return result.get('values', [])


def spreadsheet_update(spreadsheet_id, worksheet_name, column_range, values, value_input_option=None):
    """
    Write values into spreadsheet

    :param spreadsheet_id:
    :param worksheet_name:
    :param column_range:
    :param values:
    :param value_input_option: https://developers.google.com/sheets/api/reference/rest/v4/ValueInputOption
    :return:
    """
    service = service_get()
    sheet = service.spreadsheets()

    if value_input_option is None:
        value_input_option = DEFAULT_VALUE_INPUT_OPTION
    elif not isinstance(value_input_option, str):
        raise TypeError('value_input_option must be instance of str')

    try:
        body = {
            'values': values
        }
        result = sheet.values().update(
            spreadsheetId=spreadsheet_id,
            range='{}!{}'.format(worksheet_name, column_range),
            valueInputOption=value_input_option,
            body=body
        ).execute()

        if result:
            return result[u'updatedCells']
        else:
            return 0
    except HttpError:
        return False
