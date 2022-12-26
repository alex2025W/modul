///
/// Контрол управленяи списокм фактов по работам
///
App.Views.HistoryFactItemsView = Backbone.View.extend({
  el: $("#pnlFactsHistoryContainer"),
  initialize: function () {
    this.render();
  },
  render: function () {
    var self = this;
    this.$el.find(".facts-data-list").empty();
    if(this.collection.length>0)
    {
      _.each(this.collection.models, function (item) {
          self.renderItem(item);
      }, this);
      this.show();
    }
    else
      this.hide();
  },
  renderItem: function (item) {
    this.$el.find(".facts-data-list").append(new App.Views.HistoryFactItemView({model: item, parent: this}).$el);
  },
  hide: function(){
    this.$el.hide();
  },
  show: function(){
    this.$el.show();
  }
});

///
/// Контрол управления элементом истории факта
///
App.Views.HistoryFactItemView = Backbone.View.extend({
  tagName:'tr',
  className:'item',
  templates: {
    main:_.template($("#factWorkHistoryItemTemplate").html())
  },
  /**
   * инициализация
  **/
  initialize: function (params) {
    this.render();
    return this;
  },
  /**
   * Отрисовка элемента
  **/
  render: function () {
    var self = this;
    this.$el.html(this.templates.main(this.model.toJSON()));
    return this;
  }
});
