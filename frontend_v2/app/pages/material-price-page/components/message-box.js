import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';

const FormGroup = styled.div.attrs({ className: 'formGroup' })`
  margin-top: 10px;
`;
const Wrappper = styled.div.attrs({ className: 'col-sm-12' })``;
const Message = styled.div.attrs({ className: 'alert alert-danger' })`
  display: ${(props) => (props.visible ? '' : 'none')};
`;

export const MessagesBox = (props) => (
  <FormGroup>
    <Wrappper>
      <Message role="alert" visible={props.errors.length > 0}>
        {props.errors.map((err) => (
          <div key={err.key}>
            <strong>{err.header}</strong> {err.msg}
          </div>
        ))}
      </Message>
    </Wrappper>
  </FormGroup>
);

MessagesBox.propTypes = {
  errors: PropTypes.arrayOf(PropTypes.shape),
};
MessagesBox.defaultProps = {
  errors: [],
};
