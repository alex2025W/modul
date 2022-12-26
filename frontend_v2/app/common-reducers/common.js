/**
 * Action types
 */
export const types = {
  GET_DATA_REQUEST: 'COMMON/GET_DATA_REQUEST',
  GET_DATA_SUCCESS: 'COMMON/GET_DATA_SUCCESS',
  GET_DATA_FAIL: 'COMMON/GET_DATA_FAIL'
};

const initialState = {
  user: { fio:'' }, // current user
  menu: [], //  header menu
  currentPage: {}, // current user page
  users: [], // list of all users
  fetching: false, // current state
  msg: '',
  weekends: [] // all weekends
};

/**
 * Reducers
 */
export default (state = initialState, action) => {
  switch (action.type) {
    case types.GET_DATA_REQUEST:
      return { ...state, fetching: true };
    case types.GET_DATA_SUCCESS:
      return { ...state, fetching: false, ...action.payload };
    case types.GET_DATA_FAIL:
      return { ...state, fetching: false, msg: action.payload };
    default:
      return state;
  }
};

/**
 * Actions
 */
export const actions = {
  /**
   * @desc get common data for all pages
   */
  getCommonData: pageKey => ({ type: types.GET_DATA_REQUEST, pageKey })
};
