#!/usr/bin/python
# -*- coding: utf-8 -*-
import config

from datetime import datetime

from clickhouse_driver import Client


DEFAULT_DATETIME_FORMAT = '%Y-%m-%d'


client = Client(
    database=config.CLICKHOUSE_DB_NAME,
    host=config.CLICKHOUSE_HOST,
    user=config.CLICKHOUSE_USER,
    password=config.CLICKHOUSE_PASSWORD
)


def timestamp_datetime(timestamp, _format=None):
    """
    Convert timestamp to clickhouse-specific datetime format.

    :param timestamp:
    :param _format: python datetime format pattern
    :return:
    """
    if not isinstance(timestamp, int):
        raise TypeError('"timestamp" argument mast be instance of int')

    if _format is None:
        _format = DEFAULT_DATETIME_FORMAT
    else:
        if not isinstance(_format, str):
            raise TypeError('"_format" argument mast be instance of str')

    return datetime.strftime(datetime.fromtimestamp(timestamp), _format)


def current_data_version_get():
    """
    Returns current data version number.

    By design, it's highest numer in table

    :return:
    """
    version = client.execute('''
        SELECT 
            * 
        FROM 
            current_data_version
        ORDER BY version DESC 
    ''')

    if version:
        return version[0][0]

    return None
