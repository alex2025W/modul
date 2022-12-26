import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';

import { actions as commonActions } from 'commonReducers/common';
import configureStore from './store/configureStore';
import App  from './containers/app';


const store = configureStore();

render(
  <Provider store={ store }>
    <App />
  </Provider>,
  document.getElementById('root')
);

// load store first state
store.dispatch(commonActions.getCommonData('absence'));

