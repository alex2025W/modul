import { statusHelper } from 'services/server';

/**
 * @desc  Save page data to server
 * @param {Object} data to save
 */
export const savePageData = (dataToSave) =>
  fetch('/handlers/absence_page/save', {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body: dataToSave,
  })
    .then(statusHelper)
    .then((response) => response.json())
    .then((data) => data);
