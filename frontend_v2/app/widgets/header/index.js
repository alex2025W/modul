/* @flow */
import React from 'react';
import type { User } from 'types';
import type { MenuItem, CurrentPage } from 'types/header-menu';
import CurrentPageInfoCtrl from './current-page-info';
import MenuCtrl from './menu';

/**
 * @desc common header
 * @param {Array<MenuItem} menu - list of menu items
 * @param {CurrentUserInfo} user - information about current user
 * @param {CurrentPage} currentPage - information about current page
 * @return {Object}
 */
export const Header = (props: {
  menu: Array<MenuItem>,
  user: User,
  currentPage: CurrentPage
}): Object => (
  <div>
    <MenuCtrl items = { props.menu } user = { props.user } />
    <CurrentPageInfoCtrl currentPage = { props.currentPage } />
  </div>
);

export default Header;
