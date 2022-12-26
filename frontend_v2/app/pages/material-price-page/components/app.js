import React from 'react';
import PropTypes from 'prop-types';
import Loader from 'react-loader';
import Header from 'widgets/header';
import styled from 'styled-components';
import MainForm from '../containers/main-form';

const MainContainer = styled.div``;

// ref={input => this._input = input}
export const App = (props) => (
  <MainContainer>
    <Loader
      loaded={!props.fetching}
      options={{
        length: 10,
        width: 8,
        radius: 20,
        color: '#000',
        trail: 40,
      }}
    >
      <Header {...props} />
      <MainForm />
    </Loader>
  </MainContainer>
);

App.propTypes = {
  fetching: PropTypes.bool,
};
App.defaultProps = {
  fetching: false,
};

export default App;
