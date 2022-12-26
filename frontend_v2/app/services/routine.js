/* @flow */
import moment from 'moment';

/**
 * @desc calculate the nearest business day
 * @param {array} list of weekends in format "YYYY-MM-DD"
 * @return {date}
 */
export const getNextBusinessDay = (weekends: Array<string>): Object => {
  let currentDate = moment();
  if (weekends) {
    while (weekends.indexOf(currentDate.format('YYYY-MM-DD')) > -1 || currentDate.hour() > 17) {
      currentDate = currentDate.add(1, 'days').set({
        hour:8, minute:0, second:0, millisecond:0
      });
    }
  }
  return currentDate;
};

/**
 * @desc check date for moment instance
 * @param  {Object}
 * @return {bool}
 */
export const isMomentDateInstance = (val: Object): boolean => moment.isMoment(val);

/**
 * @desc get Moment Date object  from string
 * @param {string}
 * @return {date}
 */
export const strToMomentDate = (val: string, format: string = 'DD.MM.YYYY HH:mm'): Object => moment(val, format);

/**
 * @desc check string on date
 * @param  {string}
 * @return {bool}
 */
export const isStrValidDate = (val: string, format: string = 'DD.MM.YYYY HH:mm'): boolean  => moment(val, format).isValid();

/**
 * @desc Replce in string all \rn to br
 * @param  {string}
 * @return {bool}
 */
export const rNToBr = (val: string): string  => val.replace(/\n/g, '<br />').replace(/\r\n/g, '<br />');

/**
 * Format diggit to currency
 * @param  {[type]} val [description]
 * @return {[type]}     [description]
 */
export const diggitTomoneyStr = (val: string): string =>
  new Intl.NumberFormat('ru', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(val);
