#!/usr/bin/python
# -*- coding: utf-8 -*-
from google.oauth2 import service_account

from config import GOOGLE_API_SCOPES
from config import SERVICE_ACCOUNT_INFO


credentials = service_account.Credentials.from_service_account_info(
    SERVICE_ACCOUNT_INFO,
    scopes=GOOGLE_API_SCOPES
)
