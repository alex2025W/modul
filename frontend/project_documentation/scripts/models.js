var DocumentModel = Backbone.Model.extend({
  defaults:{
    'folder_id': null,
    'order_number':'',
    'section':null,
    'pdf_files':null,
    'source_files': null,
    'dop_files':null,
    'stage': '',
    'is_customer_agree': false,
    'description': ''
  }
});
