/* @flow */

/**
 * Header menu item type
 * @type {Object}
 */
export type MenuItem = {
  group: string,
  items: Array<MenuSubItem>
};

/**
 * Header menu sub-item type
 * @type {Object}
 */
export type MenuSubItem = {
  id: string,
  group: string,
  name: string,
  title: string,
  url: string,
  newpage: boolean,
  visible: boolean
};

/**
 * Current page info type
 * @type {Object}
 */
export type CurrentPage = {
  id: string,
  group: string,
  name: string,
  title: string,
  url: string,
  newpage: boolean,
  visible: boolean
};
