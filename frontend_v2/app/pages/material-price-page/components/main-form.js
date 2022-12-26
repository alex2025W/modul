import React from 'react';
import PropTypes from 'prop-types';
import Loader from 'react-loader';
import styled from 'styled-components';
import { SearchBox } from './search-box';
import { DataBox } from './data-box';
import { MessagesBox } from './message-box';

const Container = styled.div.attrs({ className: 'container' })``;
const Row = styled.div.attrs({ className: 'row' })``;
const Wrapper = styled.div.attrs({ className: 'col-md-10 col-md-offset-1' })``;
const MForm = styled.form.attrs({ className: 'form-horizontal' })`
  border: dashed 1px #ccc;
  padding: 10px;
`;

const MainForm = (props) => (
  <Container>
    <Row>
      <Wrapper>
        <MForm>
          <SearchBox {...props} />
          <MessagesBox {...props} />
          <DataBox {...props} />
        </MForm>
      </Wrapper>
    </Row>
    <Loader
      loaded={!props.loading}
      options={{ length: 10, width: 8, radius: 20, color: '#000', trail: 40 }}
    />
  </Container>
);

MainForm.propTypes = {
  loading: PropTypes.bool.isRequired,
  errors: PropTypes.arrayOf(PropTypes.shape),
};

MainForm.defaultProps = {
  errors: [],
};

export default MainForm;
