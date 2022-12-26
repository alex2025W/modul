# coding=utf-8
import os
import sys
import inspect

# patch to import config.py
sys.path.insert(0, os.path.dirname(
    os.path.dirname(
        os.path.abspath(
            inspect.getfile(inspect.currentframe())
        )
    )
))

import config

from argparse import ArgumentParser


a_parser = ArgumentParser()
a_parser.add_argument('--email', required=True, help='Admin user CRM login. Have to be gmail account.')
a_parser.add_argument('--fio', required=True, help='CRM username')

args = a_parser.parse_args()

try:
    admin_created = False
    db = config.db
    users_db = db.get_collection('users')

    # copying roles from existing admin
    admins = users_db.find({'admin': 'admin', 'stat': 'enabled'})
    if not admins:
        raise RuntimeError('Unable to find admin user to copy user roles')

    for admin in admins:
        if 'roles' in admin:
            result = users_db.insert_one({
                'admin': 'admin',
                'defaultpage': 'app',
                'email': args.email,
                'fio': args.fio,
                'roles': admin['roles'],
                'stat': 'enabled',
            })
            if result:
                if result.inserted_id:
                    admin_created = True
            break

    if not admin_created:
        print('Admin user does not created')
    else:
        print('Admin user created successfully')

except KeyboardInterrupt:
    print('Прервано пользователем')
