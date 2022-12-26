var ContactModel = Backbone.Model.extend({
    defaults:{
      'fio':'',
      'phone':[],
      'email':[],
      'post':'',
      'fired_date':'',
      'info_source': ''
    }
  });

module.exports = ContactModel;