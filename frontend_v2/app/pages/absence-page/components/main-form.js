import React from 'react';
import DateTime from 'react-datetime';
import PropTypes from 'prop-types';
import {
  getNextBusinessDay,
  isMomentDateInstance,
  strToMomentDate,
} from 'services/routine';
import 'common-styles/react-datepicker.css';
import Loader from 'react-loader';

import Styles from './styles';

const MainForm = (props) => {
  const render = (mode) => {
    switch (mode) {
      case 'edit':
        return <EditMainForm {...props} />;
      case 'view':
        return <PreviewMainForm {...props} />;
      case 'result':
        return <ResultMainForm {...props} />;
      default:
        return <EditMainForm {...props} />;
    }
  };
  return render(props.mode);
};

const ResultMainForm = (props) => (
  <div className="container">
    <div className="row">
      <div className="col-md-8 col-md-offset-2">
        <form className={`form-horizontal ${Styles.mainForm}`}>
          <fieldset>
            <legend>Данные успешно сохранены</legend>
            <div className="form-group">
              <span className="col-sm-12">
                Если хотите отправить еще одно уведомление, нажмите на кнопку -{' '}
                <strong>Продолжить</strong>
              </span>
            </div>
            <div className="form-group">
              <div className="col-sm-10 col-sm-offset-2">
                <div className="pull-right">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      props.setData({ mode: 'edit' });
                    }}
                  >
                    Продолжить
                  </button>
                </div>
              </div>
            </div>
          </fieldset>
        </form>
      </div>
    </div>
  </div>
);

ResultMainForm.propTypes = {
  setData: PropTypes.func.isRequired,
};

const PreviewMainForm = (props) => (
  <div className="container">
    <div className="row">
      <div className="col-md-8 col-md-offset-2">
        <form className={`form-horizontal ${Styles.mainForm}`}>
          <fieldset>
            <legend>Проверьте данные</legend>

            <div className="form-group">
              <span className={`control-label col-sm-2 ${Styles.controlLabel}`}>
                <strong>Причина:</strong>
              </span>
              <div className="col-sm-10">
                {props.reasons.find((item) => item.key === props.reason).name}
                {props.is_full_day === 'yes' ? ' (весь день)' : ''}
              </div>
            </div>

            <div className="form-group">
              <span className={`control-label col-sm-2 ${Styles.controlLabel}`}>
                <strong>Дата с:</strong>
              </span>
              <div className="col-sm-10">
                {props.is_full_day === 'yes'
                  ? strToMomentDate(props.date_from).format('DD.MM.YYYY')
                  : props.date_from}
              </div>
            </div>
            <div className="form-group">
              <span className={`control-label col-sm-2 ${Styles.controlLabel}`}>
                <strong>Дата по:</strong>
              </span>
              <div className="col-sm-10">
                {props.is_full_day === 'yes'
                  ? strToMomentDate(props.date_to).format('DD.MM.YYYY')
                  : props.date_to}
              </div>
            </div>
            <div className="form-group">
              <span className={`control-label col-sm-2 ${Styles.controlLabel}`}>
                <strong>Уведомить:</strong>
              </span>
              <div className="col-sm-10">
                {props.notify_moscow ? 'Москва; ' : ''}
                {props.notify_kaluga ? 'Калуга; ' : ''}
                {props.notify_penza ? 'Пенза ' : ''}
              </div>
            </div>
            <div className="form-group">
              <span className={`control-label col-sm-2 ${Styles.controlLabel}`}>
                <strong>Примечание:</strong>
              </span>
              <div className="col-sm-10">
                {props.comment.split('\n').map((i) => (
                  <div key={i}>{i}</div>
                ))}
              </div>
            </div>
            <div className="formGroup">
              <div className="col-sm-10 col-sm-offset-2">
                <div
                  className="alert alert-danger"
                  role="alert"
                  style={props.errors.length > 0 ? {} : { display: 'none' }}
                >
                  {props.errors.map((err) => (
                    <div key={err.key}>
                      <strong>{err.header}</strong> {err.msg}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="form-group">
              <div className="col-sm-10 col-sm-offset-2">
                <div className="pull-right">
                  <button
                    type="button"
                    className="btn btn-default"
                    disabled={props.saving ? 'true' : ''}
                    onClick={() => {
                      props.setData({ mode: 'edit' });
                    }}
                  >
                    Назад
                  </button>
                  &nbsp;&nbsp;
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={props.saving ? 'true' : ''}
                    onClick={() => {
                      props.saveData();
                    }}
                  >
                    Отправить
                  </button>
                </div>
              </div>
            </div>
          </fieldset>
        </form>
      </div>
    </div>
    <Loader
      loaded={!props.saving}
      options={{
        length: 10,
        width: 8,
        radius: 20,
        color: '#000',
        trail: 40,
      }}
      className={Styles.spinner}
    />
  </div>
);

PreviewMainForm.propTypes = {
  weekends: PropTypes.arrayOf(PropTypes.shape),
  reasons: PropTypes.arrayOf(PropTypes.shape).isRequired,
  is_full_day: PropTypes.string.isRequired,
  reason: PropTypes.string.isRequired,
  setData: PropTypes.func.isRequired,
  date_from: PropTypes.string.isRequired,
  date_to: PropTypes.string.isRequired,
  notify_moscow: PropTypes.bool.isRequired,
  notify_kaluga: PropTypes.bool.isRequired,
  notify_penza: PropTypes.bool.isRequired,
  comment: PropTypes.string.isRequired,
  previewData: PropTypes.func.isRequired,
  saveData: PropTypes.func.isRequired,
  errors: PropTypes.arrayOf(PropTypes.shape),
  saving: PropTypes.bool.isRequired,
};

PreviewMainForm.defaultProps = {
  weekends: [],
  errors: [],
};

const EditMainForm = (props) => {
  // filter for dates. We need all instead past and weekends dates
  const validDates = (current) =>
    current.isAfter(DateTime.moment().subtract(1, 'day')) &&
    current.day() !== 0 &&
    current.day() !== 6;
  // return next business date, using list of weekends
  const nextWorkDate = () => getNextBusinessDay(props.weekends);

  return (
    <div className="container">
      <div className="row">
        <div className="col-md-8 col-md-offset-2">
          <form
            className={`form-horizontal ${Styles.mainForm}`}
            onSubmit={(e) => {
              e.preventDefault();
              props.previewData();
            }}
          >
            <fieldset>
              <legend>Заполните форму</legend>
              <div className="form-group">
                <span className="control-label col-sm-2" htmlFor="input">
                  Причина:
                </span>
                <div className="col-sm-6">
                  <div className="checkbox">
                    <select
                      value={props.reason}
                      onChange={(e) => {
                        props.setData({ reason: e.target.value });
                      }}
                    >
                      <option value="">Выберите причину</option>
                      {props.reasons.map((item) => (
                        <option key={item.key} value={item.key}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="form-group">
                <div className="col-sm-5 col-sm-offset-2">
                  <div className="checkbox">
                    <label htmlFor="isFullDay">
                      <input
                        type="checkbox"
                        id="isFullDay"
                        checked={props.is_full_day === 'yes'}
                        onChange={(e) => {
                          props.setData({
                            is_full_day: e.target.checked ? 'yes' : 'no',
                          });
                        }}
                      />
                      Весь день
                    </label>
                  </div>
                </div>
              </div>
              <div className="form-group">
                <span className="col-sm-2 control-label" htmlFor="input">
                  Дата с:
                </span>
                <div className="col-sm-10">
                  <DateTime
                    id="dateFrom"
                    locale="ru"
                    isValidDate={validDates}
                    closeOnTab
                    defaultValue={
                      props.date_from
                        ? strToMomentDate(props.date_from)
                        : nextWorkDate()
                    }
                    closeOnSelect
                    timeFormat={props.is_full_day !== 'yes'}
                    onChange={(date) => {
                      props.setData({
                        date_from: isMomentDateInstance(date)
                          ? date.format('DD.MM.YYYY HH:mm')
                          : date,
                      });
                    }}
                  />
                </div>
              </div>
              <div className="form-group">
                <span className="col-sm-2 control-label" htmlFor="input">
                  Дата по:
                </span>
                <div className="col-sm-10">
                  <DateTime
                    id="dateTo"
                    locale="ru"
                    isValidDate={validDates}
                    closeOnTab
                    defaultValue={
                      props.date_to
                        ? strToMomentDate(props.date_to)
                        : nextWorkDate()
                    }
                    closeOnSelect
                    timeFormat={props.is_full_day !== 'yes'}
                    onChange={(date) => {
                      props.setData({
                        date_to: isMomentDateInstance(date)
                          ? date.format('DD.MM.YYYY HH:mm')
                          : date,
                      });
                    }}
                  />
                </div>
              </div>
              <div className="form-group">
                <span className="col-sm-2 control-label" htmlFor="input">
                  Уведомить:{' '}
                </span>
                <div className="col-sm-5">
                  <div className="row">
                    <div className="col-sm-3">
                      <div className="checkbox">
                        <label htmlFor="cbNotifyMoscow">
                          <input
                            type="checkbox"
                            id="cbNotifyMoscow"
                            value="notify_moscow"
                            checked={props.notify_moscow}
                            onChange={(e) => {
                              props.setData({
                                notify_moscow: e.target.checked,
                              });
                            }}
                          />
                          Москва
                        </label>
                      </div>
                    </div>
                    <div className="col-sm-3">
                      <div className="checkbox">
                        <label htmlFor="cbNotifyKaluga">
                          <input
                            type="checkbox"
                            id="cbNotifyKaluga"
                            value="notify_kaluga"
                            checked={props.notify_kaluga}
                            onChange={(e) => {
                              props.setData({
                                notify_kaluga: e.target.checked,
                              });
                            }}
                          />
                          Калуга
                        </label>
                      </div>
                    </div>
                    <div className="col-sm-3">
                      <div className="checkbox">
                        <label htmlFor="cbNotifyPenza">
                          <input
                            type="checkbox"
                            id="cbNotifyPenza"
                            value="notify_penza"
                            checked={props.notify_penza}
                            onChange={(e) => {
                              props.setData({ notify_penza: e.target.checked });
                            }}
                          />
                          Пенза
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="form-group">
                <div className="col-sm-10 col-sm-offset-2">
                  <textarea
                    id="tbNote"
                    className="form-control"
                    placeholder="Примечание (не обязательно)"
                    value={props.comment}
                    onChange={(e) => {
                      props.setData({ comment: e.target.value });
                    }}
                  />
                </div>
              </div>
              <div className="formGroup">
                <div className="col-sm-10 col-sm-offset-2">
                  <div
                    className="alert alert-danger"
                    role="alert"
                    style={props.errors.length > 0 ? {} : { display: 'none' }}
                  >
                    {props.errors.map((err) => (
                      <div key={err.key}>
                        <strong>{err.header}</strong> {err.msg}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="form-group">
                <div className="col-sm-10 col-sm-offset-2">
                  <div className="pull-right">
                    <button type="submit" className="btn btn-primary">
                      Далее
                    </button>
                  </div>
                </div>
              </div>
            </fieldset>
          </form>
        </div>
      </div>
    </div>
  );
};

EditMainForm.propTypes = {
  weekends: PropTypes.arrayOf(PropTypes.shape),
  reasons: PropTypes.arrayOf(PropTypes.shape).isRequired,
  is_full_day: PropTypes.string.isRequired,
  setData: PropTypes.func.isRequired,
  previewData: PropTypes.func.isRequired,
  date_from: PropTypes.string,
  date_to: PropTypes.string,
  errors: PropTypes.arrayOf(PropTypes.shape),
  notify_moscow: PropTypes.bool.isRequired,
  notify_kaluga: PropTypes.bool.isRequired,
  notify_penza: PropTypes.bool.isRequired,
  reason: PropTypes.string.isRequired,
  comment: PropTypes.string.isRequired,
};

EditMainForm.defaultProps = {
  weekends: [],
  date_from: '',
  date_to: '',
  errors: [],
};

export default MainForm;
