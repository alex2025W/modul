import React from 'react';
import PropTypes from 'prop-types';
import { diggitTomoneyStr, strToMomentDate } from 'services/routine';
import styled from 'styled-components';

const ColSM6Wrapper = styled.div.attrs({ className: 'col-sm-6' })`
  display: ${(props) => (props.visible ? '' : 'none')};
`;
const ColSM8Wrapper = styled.div.attrs({
  className: 'col-sm-8 light-border',
})``;
const ColSM12Wrapper = styled.div.attrs({
  className: 'col-sm-12',
})``;
const ControlLabel = styled.span.attrs({ className: 'col-sm-4' })`
  padding-top: 5px !important;
`;
const FormHorizonal = styled.form.attrs({ className: 'form-horizontal' })`
  border: dashed 1px #ccc
  padding: 10px
`;
const FormGroup = styled.div.attrs({ className: 'form-group' })``;

export const MaterialInfoItem = ({ header, data }) => (
  <ColSM6Wrapper visible={data.price > 0}>
    <ColSM12Wrapper>
      <FormHorizonal>
        <fieldset>
          <legend>
            <small>{header}</small>
          </legend>
          <FormGroup>
            <ControlLabel>Документ:</ControlLabel>
            <ColSM8Wrapper>
              {data.account}
              &nbsp;
            </ColSM8Wrapper>
          </FormGroup>
          <FormGroup>
            <ControlLabel>Тип документа:</ControlLabel>
            <ColSM8Wrapper>
              {data.account_type}
              &nbsp;
            </ColSM8Wrapper>
          </FormGroup>
          <FormGroup>
            <ControlLabel>Цена:</ControlLabel>
            <ColSM8Wrapper>
              {diggitTomoneyStr(data.price)}
              &nbsp;
            </ColSM8Wrapper>
          </FormGroup>
          <FormGroup>
            <ControlLabel>Дата:</ControlLabel>
            <ColSM8Wrapper>
              {data.date
                ? strToMomentDate(data.date, 'YYYY-MM-DDTHH:mm').format(
                    'DD.MM.YYYY',
                  )
                : ''}
              &nbsp;
            </ColSM8Wrapper>
          </FormGroup>
          <FormGroup>
            <ControlLabel>Код товара:</ControlLabel>
            <ColSM8Wrapper>
              {data.good_code_1c}
              &nbsp;
            </ColSM8Wrapper>
          </FormGroup>
          <FormGroup>
            <ControlLabel>Коэф. Материал / Оплата:</ControlLabel>
            <ColSM8Wrapper>
              {data.coef_si_div_iu}
              &nbsp;
            </ColSM8Wrapper>
          </FormGroup>
        </fieldset>
      </FormHorizonal>
    </ColSM12Wrapper>
  </ColSM6Wrapper>
);

MaterialInfoItem.propTypes = {
  data: PropTypes.objectOf(PropTypes.shape),
  header: PropTypes.string,
  name: PropTypes.string,
  code: PropTypes.string,
};

MaterialInfoItem.defaultProps = {
  data: {},
  header: '',
  name: '',
  code: '',
};
