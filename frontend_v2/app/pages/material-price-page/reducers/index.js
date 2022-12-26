import { combineReducers } from 'redux';
import common from 'commonReducers/common';
import page from './page';

export default combineReducers({
  common,
  page
});
