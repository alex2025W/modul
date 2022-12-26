///
/// Панель линковки расчетов к другим расчетам
///
App.Views.LinkSpecificationPanelView = Backbone.View.extend({
  el: $("#pnl-link-specification"),
  events: {
    "click .btn-add": "onAddClick",
    "change .ddl": "onSelectOperationType"
  },
  searchObject: null, // Информация об искомом объекте
  object_info: null, // Информация о текущем открытом объекте

  initialize: function() {
    var self = this;
    this.searchObjects = this.options["searchObjects"];
    this.object_info = this.options["object_info"];

    // подключение автокомплита на поиск номера заказа
    var tbsearchObject = this.$el.find(".tb-search-object");
    tbsearchObject.tokenInput(this.searchObjects, {
      theme: "facebook",
      zindex: 1300,
      hintText: "Введите номер",
      noResultsText: "Ничего не найдено",
      searchingText: "Поиск...",
      allowFreeTagging: false,
      tokenLimit: 1,
      onAdd: function(item) {
        self.searchObject = {
          number: item.id,
          document_type: item.document_type
        };
      },
      onDelete: function(item) {
        self.searchObject = null;
      }
    });
  },

  render: function(object_info) {
    this.object_info = object_info;
    this.$(".lbl-save-calculations-to").show();
    /*if(this.object_info.document_type != 'template'){
      this.$('.lbl-help').html('Вы можете загрузить расчеты из существующей спецификации.');
      this.$('.lbl-save-calculations-to').hide();
    }
    else{
      this.$('.lbl-help').html('Вы можете загрузить расчеты из существующей спецификации.<br> Также вы можете копировать текущие расчеты в другие документы.');
    }*/
    this.show();
    return this;
  },

  onSelectOperationType: function(e) {
    var el = $(e.currentTarget);
    this.$(".pnl-link-specification-buttons").hide();
    this.$(".pnl-search-object").hide();
    if (el.val()) {
      this.$(".pnl-link-specification-buttons").show();
      this.$(".pnl-search-object").show();
    }
  },

  onAddClick: function(e) {
    var type = this.$(".ddl-import-export").val();
    if (!this.searchObject) {
      $.jGrowl("Необходимо задать номер документа.", {
        themeState: "growl-error",
        sticky: false,
        life: 10000
      });
      return;
    }

    Backbone.trigger("global:on_link_specification", {
      object_info: this.object_info,
      search_obj: this.searchObject,
      operation_type: type, // import, export
      sector_id: null,
      category_id: null,
      group_id: null
    });
  },

  show: function() {
    this.$el.show();
  },
  hide: function() {
    this.$el.hide();
  },
  clear: function() {
    this.$(".cb").prop("checked", false);
    this.$(".pnl-search-object").hide();
    this.$(".pnl-link-specification-buttons").hide();
    this.$el.find(".tb-search-object").tokenInput("clear");
  }
});
