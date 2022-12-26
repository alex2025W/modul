import { statusHelper } from 'services/server';

/**
 * @desc  Get common data from server
 * @param key of needed page
 */
export const fetchCommonData = (pageKey) =>
  fetch(`/handlers/routine/get_common_info/${pageKey}`, {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  })
    .then(statusHelper)
    .then((response) => response.json())
    .then((data) => data);
