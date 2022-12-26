import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import MainForm from '../components/main-form';
import { actions as pageActions } from '../reducers/page';

// connect to redux
export default connect(
  (state) => ({
    weekends: state.common.weekends,
    ...state.page
  }),
  (dispatch) => ({
    setData: bindActionCreators(pageActions.setData, dispatch),
    saveData: bindActionCreators(pageActions.saveData, dispatch),
    previewData: bindActionCreators(pageActions.checkData, dispatch)
  })
)(MainForm);
