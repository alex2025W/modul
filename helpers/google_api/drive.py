#!/usr/bin/python
# -*- coding: utf-8 -*-
from copy import copy
from httplib import BadStatusLine
from traceback import print_exc
from typing import Union, AnyStr

from googleapiclient.discovery import Resource
from googleapiclient.errors import HttpError

from helpers.google.drive import service_get
from helpers.google.drive import folder_create


def clean_query_string(title):
    return title.replace(r"'", r"\'")


def get_service(user_email):
    # type: (str) -> Union[Resource, None]
    """

    :rtype: object
    """
    return service_get()


def update_folder_spaces(service, folder_id, spaces=None):
    """
      Добавить множество расположений для фолдера
      spaces - список расположений: [{'id':'111'}]
    """
    if spaces:
        body = {'parents': spaces}
        try:
            folder = service.files().update(fileId=folder_id, body=body).execute()
        except BadStatusLine, badstatus:
            print 'Error when updating folder: %s' % badstatus
        except HttpError, error:
            print 'update folder error: %s' % error
        return True
    return False


def upload_file(user_email, folder_id, file_name, media, mime_type):
    """
      Upload file to google drive
    """
    try:
        service = get_service(user_email)
        if service is not None:
            body = {
                'title': file_name,
                'description': '',
                'mimeType': mime_type,
                'parents': [{'id': folder_id}]
            }
            file = service.files().insert(body=body, media_body=media).execute()
            # return file['webContentLink']
            return file
        return None
    except Exception, e:
        raise Exception(str(e))


def get_folder_by_name(service, parent_folder_id, name, using_trash=False):
    # type: (Resource, str, str, bool) -> list
    """

    :param service:
    :param parent_folder_id:
    :param name:
    :param using_trash:
    :return:
    """
    if service is None:
        return []

    result = []
    page_token = None
    query = "'{}' in parents and name contains '{}' and mimeType='application/vnd.google-apps.folder'".format(
        parent_folder_id,
        name
    )
    try:
        while True:
            response = service.files().list(
                q=query,
                spaces='drive',
                fields='nextPageToken, files(id, name, trashed, explicitlyTrashed)',
                pageToken=page_token).execute()

            for drive_file in response.get('files', []):
                if drive_file['name'] != name:
                    continue

                if using_trash is False:
                    if drive_file['explicitlyTrashed']:
                        continue

                    if drive_file['trashed']:
                        continue

                result.append(drive_file)

            page_token = response.get('nextPageToken', None)
            if page_token is None:
                break

        return result

    except HttpError, e:
        return []

    except Exception, e:
        raise Exception(str(e))


def get_folder_list(service, parent_folder_id):
    """ Search folder in parent folder' by name """
    try:
        if service is None:
            return None

        q = "'{0}' in parents".format(parent_folder_id)
        response = service.files().list(q=q, pageSize=1000).execute()
        return response['files']

    except Exception, e:
        raise Exception(str(e))


def copy_file(service, origin_file_id, copy_title, parentid=None):
    """
    Copy an existing file.
    Args:
      service: Drive API service instance.
      origin_file_id: ID of the origin file to copy.
      copy_title: Title of the copy.

    Returns:
      The copied file if successful, None otherwise.
    """
    copied_file = {'title': copy_title}
    if parentid:
        copied_file['parents'] = [{'id': parentid}]
    try:
        file = service.files().copy(
            fileId=origin_file_id, body=copied_file
        ).execute()
        return file['id']
    except Exception, e:
        raise Exception(str(e))


def search_files(service, query_string):
    """ Search files by query string """
    result = []
    page_token = None
    while True:
        try:
            param = {}
            if page_token:
                param['pageToken'] = page_token
            param['q'] = query_string
            files = service.files().list(**param).execute()

            result.extend(files['items'])
            page_token = files.get('nextPageToken')
            if not page_token:
                break
        except BadStatusLine, badstatus:
            print 'Error when searching files: %s' % badstatus
            break
        except HttpError, error:
            print 'Error when searching file: %s' % error
            break

    return result


def copy_unique_file(service, org_file, parentid=None):
    print "Copying file %s of parentid %s" % (org_file['id'], parentid)
    # ~ org_title = org_file['title']
    org_title = clean_query_string(org_file['title'])
    query = "'me' in owners and title = '%s' and trashed = false" \
            % org_title

    if parentid:
        query += " and '%s' in parents" % parentid
    else:
        query += " and 'root' in parents"
    existed_files = search_files(service, query)
    if existed_files:
        tmp = {}
        for file in existed_files:
            if org_file['mimeType'] == file['mimeType'] \
                    or (org_file['mimeType'] == 'application/vnd.google-apps.spreadsheet' \
                        and file['mimeType'] == 'application/vnd.google-apps.form'):

                if is_older(file, org_file):
                    print "Delete existed file %s" % (file['title'].encode('utf8'))
                    delete_file(service, file['id'])
                else:
                    # ~ print "Skip copying file %s" % org_file['title'].encode('utf8')
                    tmp[parser.parse(file['modifiedDate'])] = file

        if len(tmp) >= 2:  # rename duplicate files and return the unchanged file
            print "Skip copying file and rename duplicate files"
            return rename_dup_files_by_modified_date(service, tmp)
        elif len(tmp) == 1:
            print "Skip copying file"
            return tmp.values()[0]['id']

    copied_file = copy_file(service, org_file, parentid)

    print "Finish copying file %s" % (org_file['id'])

    if copied_file:
        return copied_file['id']

    return None


def add_folder(user_email, parent_folder_id, name):
    """ Add new folder to parent folder """
    try:
        service = get_service(user_email)
        if service is not None:
            body = {
                'title': name,
                'description': '',
                'mimeType': "application/vnd.google-apps.folder",
                'parents': [{'id': parent_folder_id}]
            }
            file = service.files().insert(body=body).execute()
            return file
        return None
    except Exception, e:
        raise Exception(str(e))
    return []


def insert_folder(service, title, desc, parent_id=None):
    # type: (Resource, str, str, str) -> Union[str, None]
    """
    Create folder on Google Drive

    :param service: Google Drive service instance
    :param title: Folder name
    :param desc: Folder description
    :param parent_id:
    :return: new folder id or None
    """
    body = {'title': title, 'description': desc, 'mimeType': 'application/vnd.google-apps.folder'}

    if parent_id:
        body['parents'] = [{'id': parent_id}]

    try:
        folder = service.files().create(body=body).execute()
        return folder['id']
    except HttpError as e:
        print 'Insert folder error: %s' % e


def copy_folder(service, folder_id, folder_title, parent_id=None, accesses=None, access_msg="", path=None):
    """
        Recursive copy one folder to another
        with all inner folders and files

        - accesses: {'folder1/folder2': { 'users': ['email1','email2'], 'copy_to_my_drive':False, 'my_drive_path':'folder1/folder2', 'access': 'write' } }
        - path: ['folder1', 'folder2']
    """

    if path is None:
        path = []

    # 1. create a folder with the same name in "My Drive"
    # 2. make a copy of all files in the source folder
    # 3. Assign the new folder as parents of the copied files

    new_created_ids = []
    new_folder_id = insert_folder(service, folder_title, folder_title, parent_id)
    if not new_folder_id:
        print('----GDrive folder create error---' + folder_title)
        return None

    try:
        # set accesses if it need
        if len(path) > 0 and accesses:
            new_path_str = '/'.join(path)
            access_info = accesses.get(new_path_str, {})
            users = access_info.get('users', [])
            copy_to_my_drive = access_info.get('copy_to_my_drive', False)
            my_drive_path = access_info.get('my_drive_path', '')
            access_role = 'writer' if access_info.get('access', '') == 'write' else 'reader'

            for usr_email in users:
                try:
                    service.permissions().insert(
                        fileId=new_folder_id,
                        emailMessage=access_msg,
                        sendNotificationEmails=False,
                        body={
                            'value': usr_email,
                            'type': 'user',
                            'role': access_role
                        }).execute()

                    if copy_to_my_drive:
                        # create folders and insert file to the last folder
                        create_folder_and_insert_file(get_service(usr_email), my_drive_path, new_folder_id)

                except Exception, exc:
                    excType = exc.__class__.__name__
                    print('-----Error. Set grants for user: {0} on folder {1}. Detail: {2}'.format(
                        usr_email, folder_title, str(exc))
                    )
                    print_exc()
                    pass

    except Exception, exc:
        excType = exc.__class__.__name__
        print('-----Error. GET User access params. {0}'.format(str(exc)))
        print_exc()
        pass

    new_created_ids.append({'src_id': folder_id, 'dest_id': new_folder_id})
    query_string = '"{0}" in parents'.format(folder_id)
    files = search_files(service, query_string)

    for file in files:
        if file['mimeType'] == 'application/vnd.google-apps.folder':
            new_path = copy(path)
            new_path.append(file['title'])
            sub_created_ids = copy_folder(
                service,
                file['id'],
                file['title'],
                new_folder_id,
                accesses,
                access_msg,
                new_path
            )
            if sub_created_ids:
                new_created_ids += sub_created_ids
        else:
            # copied_fileid = copy_unique_file(service, file, parentid=new_folderid)
            copied_fileid = copy_file(service, file['id'], file['title'], new_folder_id)
            if copied_fileid:
                new_created_ids.append({'src_id': file['id'], 'dest_id': copied_fileid})

    return new_created_ids


def share_folder(service, folder_id, users, msg='', role='writer'):
    # type: (Resource, AnyStr, list, str, str) -> object
    """
      Share folder to users
      users = [{'email': address, 'fio': fio}]
    """

    # call back function
    def batch_callback(request_id, response, exception):
        # print "Response for request_id (%s):" % request_id
        # print response
        if exception:
            print "----Error! share_folder response for request_id {0}:".format(request_id)
            raise Exception(str(exception))

    # create request container
    batch_request = service.new_batch_http_request(callback=batch_callback)
    # add users
    for usr in users:
        user_permission = {
            'type': 'user',
            'role': role,
            'value': usr['email']
        }
        batch_request.add(service.permissions().create(
            fileId=folder_id,
            emailMessage=msg,
            sendNotificationEmails=False,
            body=user_permission,
            fields='id',
        ))

    result = batch_request.execute()
    return result


def retrieve_permissions(service, file_id):
    """
    Retrieve a list of permissions.
    Args:
      service: Drive API service instance.
      file_id: ID of the file to retrieve permissions for.
    Returns:
      List of permissions.
    """
    try:
        permissions = service.permissions().list(fileId=file_id).execute()
        return permissions.get('items', [])
    except HttpError, error:
        print '--Error. retrieve_permissions:{0}; {1}---------'.format(file_id, str(error))
    return None


def remove_permission(service, file_id, permission_id):
    """
    Remove a permission.
    Args:
      service: Drive API service instance.
      file_id: ID of the file to remove the permission for.
      permission_id: ID of the permission to remove.
    """
    try:
        service.permissions().delete(
            fileId=file_id, permissionId=permission_id).execute()
    except HttpError, error:
        print '--Error. remove_permission: {0}'.format(file_id)
        raise Exception(str(error))


def path_create(service, parent_folder_id, path):
    # type: (Resource, str, str) -> list
    """
    Create path on Google Drive

    :param service: Google Drive service instance
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

        folder = get_folder_by_name(service, current_parent, folder_name)

        if folder:
            folder_id = folder[0]['id']
        else:
            folder_id = folder_create(folder_name, current_parent)

        if folder_id is None:
            raise RuntimeError('Unable to create folder: {0}, path: {1}'.format(folder_name, path))

        folder_id_list.append(folder_id)
        current_parent = folder_id

    return folder_id_list


def path_check_is_exists(service, parent_folder_id, path):
    # type: (Resource, str, str) -> list
    """
    Check path existance on Google Drive

    :param service: Google Drive service instance
    :param parent_folder_id: root folder id of specified path
    :param path: path to creation like: "one/two/three"
    :return: list of folder ids in specified path
    """

    folder_id_list = []
    folder_names = path.split('/')
    current_parent = parent_folder_id

    for folder_name in folder_names:
        folder = get_folder_by_name(service, current_parent, folder_name)

        if not folder:
            return []
        else:
            folder_id = folder[0]['id']
            folder_id_list.append(folder_id)
            current_parent = folder_id

    return folder_id_list


def create_folder_and_insert_file(service, path, file_id):
    """
    path = 'folder1/folder2/folder3'
    file_id: ID of the file to insert.
    ----
    Create folders if not exists,
    """
    try:
        data_folders = []
        if path:
            data_folders = path.split('/')
        parent_folder = 'root'
        new_folder_id = ''
        for data_folder in data_folders:
            if data_folder:
                folders = get_folder_by_name(service, parent_folder, data_folder)
                new_folder_id = ''
                if folders is not None and len(folders) > 0:
                    new_folder_id = folders[0]['id']
                else:
                    new_folder_id = insert_folder(service, data_folder, '', parent_folder)
                parent_folder = new_folder_id
            else:
                new_folder_id = ''
        if new_folder_id:
            insert_file_into_folder(service, new_folder_id, file_id)

    except HttpError, error:
        raise Exception(str(error))
    return None


def insert_file_into_folder(service, folder_id, file_id):
    """
    Insert a file into a folder.
    Args:
      service: Drive API service instance.
      folder_id: ID of the folder to insert the file into.
      file_id: ID of the file to insert.
    Returns:
      The inserted parent if successful, None otherwise.
    """
    new_parent = {'id': folder_id}
    try:
        return service.parents().insert(fileId=file_id, body=new_parent).execute()
    except HttpError, error:
        raise Exception(str(error))


def delete_file_by_name(service, parent_folder_id, file_name):
    """
    Remove file/folder by name in repository
    """
    try:
        files = get_folder_by_name(service, parent_folder_id, file_name)
        if files is not None and len(files) > 0:
            delete_file(service, files[0]['id'])
    except HttpError, error:
        print '--Error. delete_file_by_name:{0} in {1}; {2}'.format(file_name, parent_folder_id, str(file_id))


def delete_file(service, file_id):
    """Permanently delete a file, skipping the trash.
    Args:
    service: Drive API service instance.
    file_id: ID of the file to delete.
    """
    try:
        service.files().delete(fileId=file_id).execute()
    except HttpError, error:
        print '--Error. delete_file:{0}; {1}'.format(file_id, str(error))


def retrieve_folder_struct(service, folder_id, path=None, result=None, file=None):
    """
    Recursive retrieve folder function
    with all inner folders and files
    result: {
    'folder1': [files],
    'folder1/folder11': [files]
    ...
    }
    """

    if path is None:
        path = []

    if result is None:
        result = {}

    if not file:
        file = service.files().get(fileId=folder_id).execute()

    new_path_str = '/'.join(path) if len(path) > 0 else '/'

    result[new_path_str] = {
        'path': path,
        'path_str': new_path_str,
        'info': {
            'id': file.get('id'),
            'owners': file.get('owners'),
            'lastModifyingUser': file.get('lastModifyingUser'),
            'modifiedDate': file.get('modifiedDate'),
            'createdDate': file.get('createdDate'),
            'alternateLink': file.get('alternateLink'),
            'title': file.get('title')
        },
        'files': [],
        'permissions': []
    }

    # получить все разрешения на каталог
    try:
        result[new_path_str]['permissions'] = retrieve_permissions(service, file.get('id'))
    except:
        pass

    query_string = '"{0}" in parents'.format(folder_id)
    files = search_files(service, query_string)
    for file in files:
        # если директория, то делаем рекурсию, иначе собираем все файлы
        if file['mimeType'] == 'application/vnd.google-apps.folder':
            new_path = copy(path)
            new_path.append(file['title'])
            retrieve_folder_struct(service, file['id'], new_path, result, file)
        else:
            result[new_path_str]['files'].append({
                'id': file.get('id'),
                'owners': file.get('owners'),
                'lastModifyingUser': file.get('lastModifyingUser'),
                'modifiedDate': file.get('modifiedDate'),
                'createdDate': file.get('createdDate'),
                'alternateLink': file.get('alternateLink'),
                'title': file.get('title')
            })
    return result
