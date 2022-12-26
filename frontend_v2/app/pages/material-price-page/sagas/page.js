import { select, call, put } from 'redux-saga/effects';

import { fetchPageData } from './api';
import { types } from '../reducers/page';

/**
 * @desc validate state data
 */
const validateData = (data) => {
  const result = [];

  if (!data.search_material_key) {
    result.push({
      key: 'search_material_key',
      header: 'Ошибка!',
      msg: 'Введите код материала.',
    });
  } else if (data.search_material_key.split('.').length < 2) {
    result.push({
      key: 'search_material_key',
      header: 'Ошибка!',
      msg: 'Неверный формат кода материала.',
    });
  }
  if (
    data.search_order_number &&
    data.search_order_number.split('.').length !== 3
  ) {
    result.push({
      key: 'search_order_number',
      header: 'Ошибка!',
      msg: 'Неверный формат номера заказа.',
    });
  }
  return result;
};

export function* getData() {
  try {
    // get current page state from store
    const data = yield select((state) => state.page);
    data.errors = validateData(data);
    if (data.errors.length > 0) {
      data.loading = false;
      yield put({ type: types.SET_DATA, data });
    } else {
      const serverResult = yield call(
        fetchPageData,
        JSON.stringify({
          search_material_key: data.search_material_key,
          search_order_number: data.search_order_number,
        }),
      );

      if (serverResult.status === 'ok') {
        const messages = [];
        if (data.search_order_number) {
          if (
            serverResult.data.fact.is_buyed === 'yes' &&
            serverResult.data.fact.price === 0
          ) {
            messages.push({
              key: 'fact_no_price',
              header: '',
              msg: 'Материал закупался, но данных о цене нет.',
            });
          }

          if (serverResult.data.fact.is_buyed === 'no') {
            messages.push({
              key: 'fact_not_buyed',
              header: '',
              msg: 'Материал по заказу не закупался.',
            });
          }
        }

        if (serverResult.data.plan.price === 0) {
          messages.push({
            key: 'plan_not_buyed',
            header: '',
            msg: 'Нет данных о плановой цене материала.',
          });
        }

        if (messages.length > 0) {
          yield put({
            type: types.GET_DATA_FAIL,
            payload: messages,
          });
        }

        yield put({
          type: types.GET_DATA_SUCCESS,
          payload: { ...serverResult.data },
        });
      } else {
        yield put({
          type: types.GET_DATA_FAIL,
          payload: [
            {
              key: 'get_data',
              header: 'Ошибка получения данных!',
              msg: serverResult.msg,
            },
          ],
        });
      }
    }
  } catch (e) {
    yield put({
      type: types.GET_DATA_FAIL,
      payload: [
        { key: 'get_data', header: 'Ошибка получения данных!', msg: e.msg },
      ],
    });
  }
}
