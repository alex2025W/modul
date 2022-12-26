// модель основных данных
App.Models.DataItemModel = Backbone.Model.extend({
    idAttribute: "_id",
    defaults: {
      'facts':[],
      'note':''
    }
});

// модель комментария
App.Models.CommentItemModel = Backbone.Model.extend({
    idAttribute: "_id",
    defaults: {
      'date':null,
      'user_email':'',
      'text':'',
      'sector_code':null,
      'sector_name':'',
      'sector_id':null,
      'group_id':null,
      'group_name':'',
      'group_key':null,
      'contract_number': null,
      'contract_id': null,
      'product_number': null,
    }
});

// модель истории синхронизации 1С
App.Models.IntegraHistoryItemModel = Backbone.Model.extend({
    defaults: {
      'date':null,
      'number': null
    }
});
