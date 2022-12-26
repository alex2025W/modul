
App.Views.OrderInfoView = Backbone.View.extend({
  el: $("#pnlOrderInfo"),
  className:'item-value',
  templates: {
    main:_.template($("#OrderInformationTemplate").html()),
  },
  initialize: function() { },
  render: function (model) {
    this.$el.html(this.templates.main(model));
    return this;
  },
  show: function() {
    this.$el.show();
  },
  hide: function() {
    this.$el.hide();
  },
});
