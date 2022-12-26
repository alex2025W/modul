/* @flow */
import React from 'react';
import type { User } from 'types';
import Styles from './styles';

/**
 * @desc current user information control
 * @param {User} user - information about current user
 * @return {Object}
 */
const CurrentUserInfoCtrl = ({ user }: {user: User}): Object => (
  <ul className={ `nav navbar-nav navbar-right ${ Styles.navbarNav }` }>
    <li className="dropdown">
      <a className="dropdown-toggle" data-toggle="dropdown" href="#0">
        <span className="glyphicon glyphicon-user" /> { user.fio }
        <span className="caret" />
      </a>
      <ul className={ `dropdown-menu ${ Styles.dropdownMenuLeft }` }>
        <li><a href="/logout">Выйти</a></li>
      </ul>
    </li>
  </ul>
);
export default CurrentUserInfoCtrl;
