export const types = {
  GET_DATA_REQUEST: 'PAGE/GET_DATA_REQUEST',
  GET_DATA_SUCCESS: 'PAGE/GET_DATA_SUCCESS',
  GET_DATA_FAIL: 'PAGE/GET_DATA_FAIL',
  SET_DATA: 'PAGE/SET_DATA',
};

export const initialState = {
  _id: '',
  full_code: '',
  name: '',
  plan: {
    is_buyed: 'yes',
    date: '',
    good_code_1c: '',
    price: 0,
    account: '',
    account_type: '',
    coef_si_div_iu: 0,
  },
  fact: {
    is_buyed: 'no',
    date: '',
    good_code_1c: '',
    price: 0,
    account: '',
    account_type: '',
    coef_si_div_iu: 0,
  },
  loading: false,
  search_order_number: '',
  search_material_key: '',
  errors: [], // list data errors
};

export default (state = initialState, action) => {
  switch (action.type) {
    case types.GET_DATA_REQUEST:
      return { ...state, loading: true };
    case types.GET_DATA_SUCCESS:
      return { ...state, loading: false, ...action.payload };
    case types.GET_DATA_FAIL:
      return { ...state, loading: false, errors: action.payload };
    case types.SET_DATA:
      return { ...state, ...action.data };
    default:
      return state;
  }
};

export const actions = {
  /**
   * @desc  Get data function
   */
  getData: (queryData) => ({ type: types.GET_DATA_REQUEST, queryData }),
  /**
   * @desc  Set data action creator
   * @param Object with data to change
   */
  setData: (params) => ({ type: types.SET_DATA, data: params }),
};
