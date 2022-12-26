import { takeLatest, all } from 'redux-saga/effects';

import * as commonSagas from 'commonSagas/common';
import { types as commonTypes } from 'commonReducers/common';
import { types as pageTypes } from '../reducers/page';
import * as pageSagas from './page';

export default function* rootSaga() {
  yield all([
    takeLatest(commonTypes.GET_DATA_REQUEST, commonSagas.getData),
    takeLatest(commonTypes.GET_DATA_SUCCESS, pageSagas.commonDataUpdated),
    takeLatest(pageTypes.SAVE_DATA_REQUEST, pageSagas.saveData),
    takeLatest(pageTypes.CHECK_DATA, pageSagas.checkForReadyPreviewMode),
  ]);
}
