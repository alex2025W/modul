App.Views.TemplatesDataListViewContainer = Backbone.View.extend({
  el: $("#pnlTemplatesList"),
  events:{
    'click .btn-add-new-template': 'onNewTemplateClick',
  },

  initialize: function(){
    var self = this;
    // соыбтия на коллекцию
    this.collection.on("add", function(model, collection, options){self.render();});
    this.collection.on("remove", function(model, collection, options){self.render();});
    this.render();
  },

  render: function(){
    var self = this;
    this.clear();
    if(this.collection.length>0)
    {
      _.each(this.collection.models, function (item) {
          self.renderItem(item);
      }, this);
    }
  },

  renderItem: function (item) {
    this.$('.data-body').append(new App.Views.TemplateItemView({model: item}).$el);
  },

  hide: function(){
    this.$el.hide();
  },

  show: function(){
    this.$el.show();
  },

  clear: function(){
    this.$el.find('.data-body').empty();
  },

  /**
   * Event on create new template
   */
  onNewTemplateClick: function(e){
    Backbone.trigger('global:on_create_new_specification', [null]);
  }

});


///---------------------------------------------------------------------------------------------------------
/// Представление элемента шаблона спецификации
///---------------------------------------------------------------------------------------------------------
App.Views.TemplateItemView = Backbone.View.extend({
  className: 'item',
  tagName:'tr',
  templates: {
    template: _.template($("#SpecificationTemplateItemTemplate").html()),
  },
  events:{
    'click .lnk': 'onItemClick'
  },

  initialize:function(){
    this.render();
  },

  onItemClick: function(e){
    Backbone.trigger('global:on_open_specification', [{
      'number': this.model.get('code'),
      'document_type': 'template'
    }]);
  },

  clear: function(){
    this.$el.empty();
  },

  render: function(){
    this.$el.html(this.templates.template($.extend({}, this.model.toJSON(), {})));
    return this;
  }
});
