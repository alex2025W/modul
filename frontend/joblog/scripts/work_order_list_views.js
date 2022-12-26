///
/// Представление списка нарядов
///
App.Views.WorkOrderListView = Backbone.View.extend({
  pager: null,
  events:{
    'pager:change_page': 'onChangePage',
  },
  initialize: function()
  {
    this.pager = new App.Views.PagerView({el:this.$el.find('.list-pager') });
  },
  render: function(collection, current_page, count)
  {
    this.collection = collection;
    this.clear();
    _.each(this.collection.models, function (item) {
        this.renderItem(item);
    }, this);
    // отрисовка пейджера
    this.pager.render(current_page, count);
    return this;
  },
  renderItem: function (item) {
    var itemView = new App.Views.WorkOrderItemView({model: item, 'parent': this});
    this.$el.find('.data-list').append(itemView.render().el);
  },
  clear: function()
  {
    this.$el.find('.data-list').empty();
  },
  show: function()
  {
    this.$el.show();
  },
  hide: function()
  {
    this.$el.hide();
  },
  onChangePage: function(e, page)
  {
    Backbone.trigger('pager:change_page',[this, page]);
  }

});

///
/// Представление элемента наряда в списке
///
App.Views.WorkOrderItemView = Backbone.View.extend({
  tagName:'tr',
  className:'list-item',
  templates: {
    item:_.template($("#listWorkOrderItemTemplate").html()),
  },
  initialize: function()
  {
    this.parent = this.options['parent'];
  },
  events:{
    'click .lnk-number': 'onClickItem'
  },
  unRender: function()
  {
    this.remove(); // this.$el.remove()
  },
  render: function () {
    this.$el.html(this.templates.item(this.model.toJSON()));
    return this;
  },
  onClickItem: function () {
    //Backbone.trigger('workorderlist:select_item',[this.model.get('number')]);
  }
});
