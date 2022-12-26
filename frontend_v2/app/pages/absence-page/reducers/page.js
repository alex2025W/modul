export const types = {
  SAVE_DATA_REQUEST: 'PAGE/SAVE_DATA_REQUEST',
  SAVE_DATA_SUCCESS: 'PAGE/SAVE_DATA_SUCCESS',
  SAVE_DATA_FAIL: 'PAGE/SAVE_DATA_FAIL',
  CHECK_DATA: 'PAGE/CHECK_DATA',
  SET_VIEW_MODE: 'PAGE/SET_VIEW_MODE',
  SET_EDIT_MODE: 'PAGE/SET_EDIT_MODE',
  SET_RESULT_MODE: 'PAGE/SET_RESULT_MODE',
  SET_DATA: 'PAGE/SET_DATA'
};

export const initialState = {
  reason: '',
  is_full_day: 'yes', // yes or no
  date_from: '', // start absence date
  date_to:'', // finish absence date
  notify_moscow: false,
  notify_kaluga: false,
  notify_penza: false,
  comment: '', // user comment
  mode: 'edit',  // form view mode: edit/view/result
  saving: false,
  errors: [], // list data errors
  reasons: [
    { key: 'personal', name: 'По личным делам' },
    { key: 'work', name: 'По рабочим делам' },
    { key: 'holiday', name: 'Отпуск' },
    { key: 'business_trip', name: 'Командировка' }
  ]
};

export default (state = initialState, action) => {
  switch (action.type) {
    case types.SET_VIEW_MODE:
      return { ...state, mode: 'view' };
    case types.SET_EDIT_MODE:
      return { ...state, mode: 'edit' };
    case types.SET_RESULT_MODE:
      return { ...state, mode: 'result' };
    case types.SAVE_DATA_REQUEST:
      return { ...state, saving: true };
    case types.SAVE_DATA_SUCCESS:
      return { ...state, saving: false };
    case types.SAVE_DATA_FAIL:
      return { ...state, saving: false, errors: action.payload };
    case types.SET_DATA:
      return { ...state,  ...action.data };
    default:
      return state;
  }
};

export const actions = {
  /**
   * @desc Validate data before switch wiew mode to preview
  */
  checkData: () => ({ type: types.CHECK_DATA }),
  /**
   * @desc Switch wiew mode to edit
  */
  setEditMode: () => ({ type: types.SET_EDIT_MODE }),
  /**
   * @desc Switch wiew mode to result
  */
  setResultMode: () => ({ type: types.SET_RESULT_MODE }),
  /**
   * @desc  Set data action creator
   * @param Object with data to change
   */
  setData: params => ({ type: types.SET_DATA, data: params }),
  /**
  * @desc  Save data function
  */
  saveData: () => ({ type: types.SAVE_DATA_REQUEST })
};
