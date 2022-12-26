/* @flow */
import type { CurrentPage } from 'types/header-menu';
import React from 'react';
import Styles from './styles';

/**
 * @desc Panel with information about
 * @param  {[type]} Object [description]
 * @return {[type]}        [description]
 */
const CurrentPageInfoCtrl = ({ currentPage }: { currentPage: CurrentPage }): Object => (
  <ul className={ `breadcrumb ${ Styles.breadCrumb }` }>
    <li >{ currentPage.title }</li>
  </ul>
);

export default CurrentPageInfoCtrl;
