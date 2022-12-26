import { select, call, put } from 'redux-saga/effects';
import {
  isStrValidDate,
  strToMomentDate,
  getNextBusinessDay,
} from 'services/routine';
import { savePageData } from './api';
import { types, actions, initialState } from '../reducers/page';

/**
 * @desc validate state data
 */
const validateData = (data) => {
  const result = [];
  // validate data and fill errors
  if (data.date_from === '' || !isStrValidDate(data.date_from)) {
    result.push({
      key: 'date_from',
      header: 'Ошибка!',
      msg: 'Неверный формат даты начала.',
    });
  }
  if (!data.reason || data.reason === '') {
    result.push({
      key: 'reason',
      header: 'Ошибка!',
      msg: 'Не задана причина.',
    });
  }
  if (data.date_to === '' || !isStrValidDate(data.date_to)) {
    result.push({
      key: 'date_to',
      header: 'Ошибка!',
      msg: 'Неверный формат даты окончания.',
    });
  }
  if (strToMomentDate(data.date_from) > strToMomentDate(data.date_to)) {
    result.push({
      key: 'date_to',
      header: 'Ошибка!',
      msg: 'Дата начала не может превышать дату окончания.',
    });
  }
  if (!data.notify_moscow && !data.notify_kaluga && !data.notify_penza) {
    result.push({
      key: 'notify_place',
      header: 'Ошибка!',
      msg: 'Не выбран адресат для оповещения.',
    });
  }
  return result;
};

export function* checkForReadyPreviewMode() {
  // get current page state from store
  const data = yield select((state) => state.page);
  data.errors = validateData(data);
  if (data.errors.length > 0) {
    yield put({ type: types.SET_DATA, data });
  } else {
    yield put({ type: types.SET_VIEW_MODE });
  }
}

export function* saveData() {
  try {
    // get current page state from store
    const curState = yield select((state) => state);
    const data = yield call(savePageData, JSON.stringify(curState.page));
    if (data.status === 'ok') {
      yield put(
        actions.setData({
          ...initialState,
          saving: false,
          date_from: getNextBusinessDay(curState.common.weekends).format(
            'DD.MM.YYYY HH:mm',
          ),
          date_to: getNextBusinessDay(curState.common.weekends)
            .add(60, 'm')
            .format('DD.MM.YYYY HH:mm'),
          mode: 'result',
        }),
      );
    } else {
      yield put({
        type: types.SAVE_DATA_FAIL,
        payload: [
          { key: 'save_data', header: 'Ошибка сохранения!', msg: data.msg },
        ],
      });
    }
  } catch (e) {
    yield put({
      type: types.SAVE_DATA_FAIL,
      payload: [{ key: 'save_data', header: 'Ошибка сохранения!', msg: e.msg }],
    });
  }
}

export function* commonDataUpdated() {
  // get current common state from store
  const data = yield select((state) => state.common);
  // get next business day according to dates from weekend calendar
  yield put(
    actions.setData({
      date_from: getNextBusinessDay(data.weekends).format('DD.MM.YYYY HH:mm'),
      date_to: getNextBusinessDay(data.weekends)
        .add(60, 'm')
        .format('DD.MM.YYYY HH:mm'),
    }),
  );
}
