///
/// Представление пейджера
///
App.Views.PagerView = Backbone.View.extend({
  templates: {
    main:_.template($("#pagerTemplate").html()),
  },
  events:{
    'click .list-pager a':'onPageClick'
  },
  initialize: function() { },
  render: function(current_page, pages_count)
  {
    this.clear();
    var model = {
      'count': pages_count,
      'cur_page': current_page
    };
    this.$el.html(this.templates.main(model));
    return this;
  },
  /**
   * Событие клика на номер страницы
   */
  onPageClick: function(e)
  {
    var pg = $(e.currentTarget).data("page");
    $(this.el).trigger('pager:change_page', [pg]);
  },
  /**
   * Очистка формы
   */
  clear: function()
  {
    this.$el.empty();
  },
  /**
   * показать
   */
  show: function()
  {
    this.$el.show();
  },
  /**
   * скрыть
   */
  hide: function()
  {
    this.$el.hide();
  },
});
