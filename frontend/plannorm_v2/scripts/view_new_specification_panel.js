///
/// Панель создания новой спецификации
///
App.Views.NewSpecificationPanel = Backbone.View.extend({
  el: $("#pnl-create-new-specification"),
  events:{
    'click .cb': 'OnCheckType',
    'click .btn-add': 'onAddClick'
  },

  searchObject: null,

  initialize: function() {
    var self = this;
    this.searchObjects = this.options['searchObjects'];

    // подключение автокомплита на поиск номера заказа
    var tbsearchObject = this.$el.find('.tb-search-object');
    tbsearchObject.tokenInput(this.searchObjects,{
      theme: "facebook",
      zindex: 1300,
      hintText: "Введите номер",
      noResultsText: "Ничего не найдено",
      searchingText: "Поиск...",
      allowFreeTagging: false,
      tokenLimit: 1,
      onAdd: function (item) {
        self.searchObject = {number: item.id, document_type: item.document_type};
      },
      onDelete: function (item) {
        self.searchObject = null;
      },
    });
  },

  OnCheckType: function(e){
    this.$('.cb').prop('checked', false);
    var el = $(e.currentTarget);
    el.prop('checked', !el.prop('checked'));
    this.$('.pnl-search-object').hide();
    this.$('.pnl-new-specification-buttons').show();
    if(el.val()== 'new-template-using-existing')
      this.$('.pnl-search-object').show();
  },

  onAddClick: function(e){
    var type = this.$('.cb:checked').val();

    if(type == 'new-template-using-existing' && !this.searchObject)
    {
      $.jGrowl('Необходимо задать номер документа на основе которго будет создан новый шаблон.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      return;
    }
    // отправка события на создание новой спецификации
    Backbone.trigger('global:on_create_new_specification', [this.searchObject]);
  },

  render:function() {
    return this;
  },
  show: function() {
    this.$el.show();
  },
  hide: function() {
    this.$el.hide();
  },
  clear: function() {
    this.$('.cb').prop('checked', false);
    this.$('.pnl-search-object').hide();
    this.$el.find('.tb-search-object').tokenInput('clear');
  },
});
