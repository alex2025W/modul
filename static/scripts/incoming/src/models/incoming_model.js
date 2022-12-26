var IncomingModel = Backbone.Model.extend({
  urlRoot:'/handlers/contracts/incoming',
  defaults:{
    correspondent: '',
    type: '',
    note: '',
    number: 0,
    date: '',
    user: ''
  }
});
module.exports = IncomingModel;
