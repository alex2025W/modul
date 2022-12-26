import { connect } from 'react-redux';
import { App } from '../components/app';

// connect to redux
export default connect((state) => ({
  fetching: state.common.fetching,
  user: state.common.user,
  menu: state.common.menu,
  currentPage: state.common.currentPage,
  msg: state.common.msg
}))(App);
