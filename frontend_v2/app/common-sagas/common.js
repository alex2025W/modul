import { call, put } from 'redux-saga/effects';
import { types } from 'commonReducers/common';
import { fetchCommonData } from './api';

export function* getData(obj) {
  try {
    const data = yield call(fetchCommonData, obj.pageKey);
    if (data.status === 'ok') {
      yield put({ type: types.GET_DATA_SUCCESS, payload: { ...data.data } });
    } else {
      yield put({ type: types.GET_DATA_FAIL, payload: data.msg });
    }
  } catch (e) {
    yield put({ type: types.GET_DATA_FAIL, payload: e.message });
  }
}
