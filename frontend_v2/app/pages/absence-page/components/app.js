import React from 'react';
import PropTypes from 'prop-types';
import Loader from 'react-loader';
import Header from 'widgets/header';
import MainForm from '../containers/main-form';
import Styles from './styles';

export const App = (props) => (
  <div className={Styles.root}>
    <Loader
      loaded={!props.fetching}
      options={{
        length: 10,
        width: 8,
        radius: 20,
        color: '#000',
        trail: 40,
      }}
      className={Styles.spinner}
    >
      <Header {...props} />
      <MainForm />
    </Loader>
  </div>
);

App.propTypes = {
  fetching: PropTypes.bool,
};
App.defaultProps = {
  fetching: false,
};

export default App;
