import React from 'react';
import { render } from 'react-dom';
import { AppContainer } from 'react-hot-loader';
import { Provider } from 'react-redux';

import { actions as commonActions } from 'commonReducers/common';
import configureStore from './store/configureStore';
import App  from './containers/app';

const store = configureStore();
const hotRender = () => {
  render(
    <AppContainer>
      <Provider store={ store }>
        <App />
      </Provider>
    </AppContainer>,
    document.getElementById('root')
  );
};

hotRender();
module.hot.accept('./containers/app', hotRender);

// load store first state
store.dispatch(commonActions.getCommonData('absence'));
