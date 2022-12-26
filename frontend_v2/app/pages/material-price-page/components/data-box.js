import React from 'react';
import PropTypes from 'prop-types';
import styled, { css } from 'styled-components';
import { MaterialInfoItem } from './material-item-info';

const Row = styled.div.attrs({ className: 'row' })`
  ${(props) =>
    props.dataBox &&
    css`
      margin-top: 10px;
      font-size: 14px;
      .light-border {
        border-bottom: solid 1px #eee;
      }
    `};
`;
const Wrapper = styled.div.attrs({ className: 'col-sm-12' })``;

export const DataBox = (props) => (
  <Row dataBox>
    <Wrapper>
      <Row>
        <MaterialInfoItem header="Плановая цена материала" data={props.plan} />
        <MaterialInfoItem
          header="Фактическая цена материала"
          data={props.fact}
        />
      </Row>
    </Wrapper>
  </Row>
);

DataBox.propTypes = {
  plan: PropTypes.objectOf(PropTypes.shape),
  fact: PropTypes.objectOf(PropTypes.shape),
};

DataBox.defaultProps = {
  plan: {},
  fact: {},
};
