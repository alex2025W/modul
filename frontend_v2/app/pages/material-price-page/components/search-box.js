import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';

const ColSM12Wrapper = styled.div.attrs({
  className: 'col-sm-12',
})``;
const ControlLabel = styled.label.attrs({ className: 'col-sm-12' })`
  padding-top: 5px !important;
`;
const InputBox = styled.input.attrs({ className: 'form-control' })`
  width: 200px;
`;
const Button = styled.button.attrs({
  className: 'btn btn-primary',
})`
  margin: 26px 16px 0px 16px;
`;
const FieldSet = styled.fieldset.attrs({})`
  border-bottom: solid 1px #ccc;
`;
const FormGroup = styled.div.attrs({ className: 'form-group' })``;
const NotifyLabel = styled.span.attrs({ className: 'col-sm-6' })`
  color: #aaa;
  font-size: 11px;
`;

export const SearchBox = (props) => (
  <FieldSet>
    <legend>Заполните параметры поиска</legend>
    <FormGroup>
      <ColSM12Wrapper>
        <ControlLabel htmlFor="tbMaterialKey">
          <strong>Материал:</strong>
        </ControlLabel>
        <ColSM12Wrapper>
          <InputBox
            id="tbMaterialKey"
            placeholder="9.11.4"
            type="text"
            value={props.search_material_key}
            onChange={(e) => {
              props.setData({ search_material_key: e.target.value });
            }}
          />
        </ColSM12Wrapper>
      </ColSM12Wrapper>
      <ColSM12Wrapper style={{ marginTop: '10px' }}>
        <ControlLabel htmlFor="tbOrderNumber">
          <strong>Заказ:</strong>
        </ControlLabel>
        <NotifyLabel>
          Чтобы узнать фактическую цену материала, введите номер заказа
          (фактическая цена всегда привязана к конкретному заказу)
        </NotifyLabel>
        <ColSM12Wrapper>
          <InputBox
            id="tbOrderNumber"
            placeholder="1313.1.1"
            type="text"
            value={props.search_order_number}
            onChange={(e) => {
              props.setData({ search_order_number: e.target.value });
            }}
          />
        </ColSM12Wrapper>
      </ColSM12Wrapper>
      <ColSM12Wrapper>
        <Button
          disabled={props.loading ? 'true' : ''}
          onClick={() => {
            props.getData();
          }}
        >
          Показать
        </Button>
      </ColSM12Wrapper>
    </FormGroup>
  </FieldSet>
);

SearchBox.propTypes = {
  setData: PropTypes.func.isRequired,
  getData: PropTypes.func.isRequired,
  search_order_number: PropTypes.string.isRequired,
  search_material_key: PropTypes.string.isRequired,
  loading: PropTypes.bool.isRequired,
};
