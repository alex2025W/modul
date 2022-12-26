/* @flow */
import React from 'react';
import type { MenuItem, MenuSubItem } from 'types/header-menu';
import type { User } from 'types';
import Styles from './styles';
import CurrentUserInfoCtrl from './current-user-info';

/**
 * @desc Header menu control
 * @param {Array<MenuItem} items - list of menu items
 * @param {User} user - information about current user
 * @return {Object}
 */
const MenuCtrl = (props: { items: Array<MenuItem>, user: User }) => (
  <nav className={`navbar navbar-default navbar-static-top ${Styles.navbar}`}>
    <div className="container-fluid">
      <div className="navbar-header">
        <button
          type="button"
          className="navbar-toggle"
          data-toggle="collapse"
          data-target="#myNavbar"
        >
          <span className="icon-bar" />
          <span className="icon-bar" />
          <span className="icon-bar" />
        </button>
        <span className={`${Styles.logo} navbar-brand`} />
      </div>
      <div className="collapse navbar-collapse" id="myNavbar">
        <ul className={`nav navbar-nav ${Styles.navbarNav}`}>
          {props.items.map((item) => (
            <MenuItemCtrl key={item.group} item={item} />
          ))}
        </ul>
        <CurrentUserInfoCtrl user={props.user} />
      </div>
    </div>
  </nav>
);

/**
 * @desc Header menu item control
 * @param {MenuItem} item - element of menu
 * @return {Object}
 */
const MenuItemCtrl = ({ item }: { item: MenuItem }): Object => {
  const render = (row) => {
    if (row.items && row.items.length > 0) {
      return (
        <li className="dropdown">
          <a className="dropdown-toggle" data-toggle="dropdown" href="#0">
            {row.group}
            <span className="caret" />
          </a>
          <ul className="dropdown-menu">
            {row.items.map((subItem) => (
              <MenuSubItemCtrl key={subItem.id} item={subItem} />
            ))}
          </ul>
        </li>
      );
    }
    return (
      <li>
        <a href={row.url}>{row.name}</a>
      </li>
    );
  };
  return render(item);
};

/**
 * @desc menu sub element
 * @param {MenuSubItem} item - element of sub-menu
 * @return {Object}
 */
const MenuSubItemCtrl = ({ item }: { item: MenuSubItem }): Object => (
  <li>
    <a href={item.url}>{item.name}</a>
  </li>
);

export default MenuCtrl;
