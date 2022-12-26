/* @flow */

/**
 * @desc Helper for the server request
 * @param {Object} response - server response
 * @return {Promise}
 */
export const statusHelper = (response: Object): Object => {
  if (response.status >= 200 && response.status < 300) { return Promise.resolve(response); }
  return Promise.reject(new Error(response.statusText));
};
