#!/usr/bin/python
# -*- coding: utf-8 -*-
import logging

from typing import Union

from apiclient import discovery
from helpers.google.auth import credentials
from googleapiclient.discovery import Resource
from googleapiclient.errors import HttpError


API_VERSION = 'v3'


def service_get():
    # type: () -> Resource
    """
    Build and return authenticated Google Drive API Resource
    :return:
    """
    return discovery.build('drive', API_VERSION, credentials=credentials)


def folder_create(name, parent_id, desc=None):
    # type: (str, str, Union[str, None]) -> Union[str, False]
    """
    Create folder on Google Drive

    :param name: Folder name
    :param parent_id:
    :param desc:
    :return: new folder id or None
    """
    service = service_get()

    if desc is None:
        desc = ''

    body = {
        'name': name,
        'description': desc,
        'mimeType': 'application/vnd.google-apps.folder',
        'parents': [
            parent_id
        ]
    }

    try:
        folder = service.files().create(body=body).execute()
        return folder['id']
    except HttpError as e:
        logging.critical('Unable to create folder "{}" in parent_id: {}. Reason: {}'.format(name, parent_id, e))
        return False


def folder_share(folder_id, email, domain):
    # type: (str, str, str) -> bool
    """

    :param folder_id:
    :param email:
    :param domain:
    :return:
    """
    def callback(request_id, response, exception):
        if exception:
            logging.critical('Unable to share folder: {}'.format(exception))
        else:
            ids.append(response.get('id'))

    service = service_get()
    batch = service.new_batch_http_request(callback=callback)
    ids = []

    user_permission = {
        'type': 'user',
        'role': 'writer',
        'emailAddress': email
    }

    domain_permission = {
        'type': 'domain',
        'role': 'reader',
        'domain': domain
    }

    batch.add(service.permissions().create(
        fileId=folder_id,
        body=user_permission,
        fields='id',
        sendNotificationEmail=False,
    ))

    batch.add(service.permissions().create(
        fileId=folder_id,
        body=domain_permission,
        fields='id',
        sendNotificationEmail=False,
    ))

    batch.execute()

    if ids:
        return True

    return False


def folder_search_by_name(parent_folder_id, name, using_trash=False):
    # type: (str, str, bool) -> Union[list, bool]
    """
    Search folder in parent folder by name

    :param parent_folder_id:
    :param name:
    :param using_trash: search in trash
    :return:
    """

    if not isinstance(name, unicode):
        raise TypeError('"name" argument must be instance of unicode')

    if not isinstance(parent_folder_id, unicode):
        raise TypeError('"parent_folder_id" argument must be instance of unicode')

    service = service_get()
    result = []
    query_tpl = u"'{}' in parents and name contains '{}' and mimeType='application/vnd.google-apps.folder'"

    try:
        response = service.files().list(
            q=query_tpl.format(parent_folder_id, name),
            spaces='drive',
        ).execute()

        for drive_file in response.get('files', []):
            if drive_file['mimeType'] != u'application/vnd.google-apps.folder':
                continue

            if drive_file['name'] != u'{}'.format(name):
                continue

            if using_trash is False:
                if 'trashed' in drive_file:
                    if drive_file['trashed']:
                        continue

                if 'explicitlyTrashed' in drive_file:
                    if drive_file['explicitlyTrashed']:
                        continue

            result.append(drive_file)

    except HttpError:
        return False

    return result


def shortcut_create(name, location_id, target_id):
    # type: (str, str, str) -> Union[bool, unicode]
    """

    :param name:
    :param location_id:
    :param target_id:
    :return:
    """
    service = service_get()
    shortcut_metadata = {
        'name': name,
        'mimeType': 'application/vnd.google-apps.shortcut',
        "parents": [
            location_id
        ],
        'shortcutDetails': {
            'targetId': target_id
        }
    }

    result = service.files().create(
        body=shortcut_metadata,
        fields='id,shortcutDetails'
    ).execute()

    if result:
        return result[u'id']
    else:
        return False


def path_create(parent_folder_id, path):
    # type: (str, str) -> list
    """
    Create path on Google Drive

    :param parent_folder_id: root folder id of specified path
    :param path: path to creation like: "one/two/three"
    :return: list of folder ids in specified path
    """

    folder_id_list = []
    folder_names = path.split('/')
    current_parent = parent_folder_id

    for folder_name in folder_names:
        if not folder_name:
            continue

        folder = folder_search_by_name(current_parent, folder_name)

        if folder:
            folder_id = folder[0]['id']
        else:
            folder_id = folder_create(folder_name, current_parent)

        if folder_id is None:
            raise RuntimeError('Unable to create folder: {}, path: {}'.format(folder_name, path))

        folder_id_list.append(folder_id)
        current_parent = folder_id

    return folder_id_list
