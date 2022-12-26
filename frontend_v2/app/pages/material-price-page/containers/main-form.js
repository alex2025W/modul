import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import MainForm from '../components/main-form';
import { actions as pageActions } from '../reducers/page';

// connect to redux
export default connect(
  state => ({
    ...state.page
  }),
  dispatch => ({
    setData: bindActionCreators(pageActions.setData, dispatch),
    getData: bindActionCreators(pageActions.getData, dispatch)
  })
)(MainForm);
