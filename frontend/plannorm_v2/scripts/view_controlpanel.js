///
/// Панель управления фиьтрацией и поиском
///
App.Views.ControlPanelView = Backbone.View.extend({
  el: $("#controlPanel"),
  events: {
    "click #btn_open_order": "OnOpen",
    "click #btn_clear_filters": "onClearFilters",
    "click .btn-collapse": "OnCollapse",
    "click .cb-group-by": "OnCheckGroupBy",
    "click .btn-google": "onDownloadToGoogle",
    "click .btn-import-data": "onImportButtonClick"
  },
  searchObject: {
    number: "", // номер искомого объекта
    document_type: "" // тип искомого объекта - [contract/order/template]
  },
  object_info: null, // Информация о текущем открытом объекте
  searchObjects: [], // список всех доступных номеров заказов
  groupsList: [], // справочник разделов и групп
  materialsList: [], // справочник материалов
  filterBoxView: null, // представление блока фильтрации по группам
  // newSpecificationPanelView: null,
  // linkSpecificationPanelView: null,

  /**
   * search_numbers = [{'name', 'id'}]
   */
  initialize: function(search_numbers) {
    var self = this;
    this.searchObjects = search_numbers;
    // отслеживаем событие смены таба
    Backbone.on("global:on_tab_change", this.onTabChange, this);
    // отслеживаем событие применения фильтров
    Backbone.on("filter_box:apply_filters", this.onApplyFilters, this);
    // отслеживаем событие сброса фильтров
    Backbone.on("filter_box:reset_filters", this.onResetFilters, this);
    // предствление для блока фильтрации по категориям и группам
    this.filterBoxView = new App.Views.FilterBoxView();
    // панель создания новой спецификации (шаблона)
    // this.newSpecificationPanelView = new App.Views.NewSpecificationPanel({'searchObjects':search_numbers});

    // панель импорта экспорта
    /*this.linkSpecificationPanelView = new App.Views.LinkSpecificationPanelView({
      searchObjects: search_numbers,
      object_info: this.object_info
    });*/
    this.addControlsEvents();
  },

  addControlsEvents: function() {
    var self = this;
    // подключение автокомплита на поиск номера заказа
    var tbsearchObject = this.$el.find(".tb-order-number");
    tbsearchObject.tokenInput(this.searchObjects, {
      theme: "facebook",
      zindex: 1300,
      hintText: "Введите номер",
      noResultsText: "Ничего не найдено",
      searchingText: "Поиск...",
      allowFreeTagging: false,
      tokenLimit: 1,
      onAdd: function(item) {
        if (item.id != self.searchObject.number) {
          self.searchObject = {
            number: item.id,
            document_type: item.document_type
          };
          self.OnOpen();
        } else
          self.searchObject = {
            number: item.id,
            document_type: item.document_type
          };
      },
      onDelete: function(item) {
        self.OnClose();
      }
    });

    /*// фиксирование панели при скролинге
    var $obj = this.$el.parent();
    var top = 150;
    $(window).scroll(function (event) {
      var y = $(this).scrollTop();
      // whether that's below the form
      if (y >= top) {
        // if so, ad the fixed class
        $obj.addClass('fixed');
      } else {
        // otherwise remove it
        $obj.removeClass('fixed');
      }
    });*/
  },

  /**
   * render form
   * filters: {
   *   groups,            - list of categories and groups for filter box
   *   selected_groups,   - list of selected by user categories and groups
   *   search_obj,        - object for search
   *   collapsed,         - flag for collapse every groups
   *   group_by,          - list of data levels groups (group by category; )
   * }
   */
  render: function(object_info, groups, selected_groups, filters) {
    this.object_info = object_info;
    this.groupsList = groups;
    this.filterBoxView.render(groups, selected_groups).show();
    this.show();
    this.setFilters(filters);
    this.renderAvalilableReportsDropDown();

    //this.linkSpecificationPanelView.hide();
    // if (object_info && (object_info.number || object_info.specification_number))
    //   this.linkSpecificationPanelView.render(object_info);
  },

  /**
   * Render drop down list with awailable reports variants
   */
  renderAvalilableReportsDropDown: function() {
    var box = this.$(".ul-download-to-google");
    $(box).empty();
    switch (this.object_info.document_type) {
      case "order":
        $(box).append(
          '<li><a class="btn-google" data-value="0">выгрузить заявку ' +
            this.object_info.order_number +
            "</a></li>"
        );
        break;
      case "template":
        $(box).append(
          '<li><a class="btn-google" data-value="0">выгрузить шаблон ' +
            this.object_info.specification_number +
            "</a></li>"
        );
        break;
      default:
        if (this.object_info.units)
          for (var i in this.object_info.units) {
            $(box).append(
              '<li><a class="btn-google" data-value="' +
                this.object_info.units[i] +
                '">выгрузить заказ ' +
                this.object_info.order_number +
                "." +
                this.object_info.units[i] +
                "</a></li>"
            );
          }
        break;
    }
  },

  /**
   * fill filters and set selected user values
   */
  setFilters: function(filters) {
    this.searchObject = filters.search_obj;
    if (filters.search_obj && filters.search_obj.number) {
      //this.$('.tb-order-number').tokenInput("clear");
      this.$(".tb-order-number").tokenInput("add", {
        id: filters.search_obj.number,
        name: filters.search_obj.number,
        document_type: filters.search_obj.document_type
      });
    }
    // set flags to group by block
    this.$(".pnl-group-by :input").prop("checked", false);
    if (filters.group_by && filters.group_by.length > 0) {
      for (var i in filters.group_by)
        this.$(
          '.pnl-group-by :input[value="' + filters.group_by[i] + '"]'
        ).prop("checked", true);
    }
  },

  getGroupBy: function() {
    var group_by = [];
    this.$(".pnl-group-by input:checked").each(function() {
      group_by.push($(this).val());
    });
    return group_by;
  },

  /**
   * Получение URL
   */
  getUrl: function() {
    var url = "";
    url += "/search/yes";
    url += "/search_obj/" + JSON.stringify(this.searchObject);
    url += "/groups/" + this.filterBoxView.getUrl();
    var group_by = this.getGroupBy();
    url += "/group_by/" + (group_by.length > 0 ? group_by.join(";") : "");
    return url.split(" ").join("%20");
  },

  /**
   * Получение Фильтров
   */
  getFilters: function() {
    return {
      groups: this.filterBoxView.getFilters(),
      group_by: this.getGroupBy()
    };
  },

  /**
   * Закрыть заказ
   */
  OnClose: function() {
    // this.newSpecificationPanelView.clear();
    // this.linkSpecificationPanelView.clear();
    this.object_info = null;
    this.searchObject = { number: "", document_type: "" };
    this.clearFilters();
    Backbone.trigger("global:on_url_params_change", [
      this,
      "search_obj",
      "{}",
      false
    ]);
    App.doCloseData();
  },

  /**
   * Открыть заказ
   */
  OnOpen: function() {
    // проверка на введенный номер заказа
    if (!this.$(".tb-order-number").val()) return;
    App.doGetData();
  },

  clearFilters: function() {
    this.$(".tb-order-number").tokenInput("clear");
    this.hide();
  },

  /**
   * Сброс всех фильтров
   */
  onClearFilters: function(e) {
    // сброс всех фильтров
    this.onApplyFilters();
  },

  /**
   *  Событие нажатия на кнопку раскрытия групп
   */
  OnCollapse: function(e) {
    var self = this;
    var cur_btn = $(e.currentTarget);
    $("body").css("cursor", "wait");
    $(cur_btn).css("cursor", "wait");
    setTimeout(function() {
      if (cur_btn.val() == "collapsed") {
        cur_btn
          .val("unCollapsed")
          .html("&nbsp;&nbsp;Закрыть группы")
          .prepend('<i class = "fa fa-folder-open"></i>');
        Backbone.trigger("global:collapse", [self, true, cur_btn]);
      } else {
        cur_btn
          .val("collapsed")
          .html("&nbsp;&nbsp;Расскрыть группы")
          .prepend('<i class = "fa fa-folder"></i>');
        Backbone.trigger("global:collapse", [self, false, cur_btn]);
      }
    }, 100);
  },

  /**
   * Событие на применение фильтров
   */
  onApplyFilters: function(e) {
    Backbone.trigger("global:apply_filters", [this, this.getFilters()]);
  },

  /**
   * Событие клика на кнопку импорта/экспорта данных
   */
  onImportButtonClick: function(e) {
    var self = this;
    var dlg = new App.Views.ImportCategoryDialogView({
      model: {
        groupsList: this.groupsList,
        searchObjects: this.searchObjects
      }
    });
    dlg.on("dialogsave", function(e) {
      Backbone.trigger("global:on_link_specification", {
        object_info: self.object_info,
        search_obj: e.search_obj,
        operation_type: e.operation_type, // import, export
        sector_id: e.sector_id,
        category_id: e.category_id,
        group_id: e.group_id
      });
    });
  },

  /**
   * Событие загрузки данных в google
   */
  onDownloadToGoogle: function(e) {
    var cur_btn = $(e.currentTarget);
    Backbone.trigger("global:download_to_google", [
      this,
      this.object_info,
      cur_btn.data("value")
    ]);
  },

  /**
   * Выбор группировки
   */
  OnCheckGroupBy: function(e) {
    // сбор всех отмеченных группировок и отсылка события на смену URL
    var group_by = this.getGroupBy();
    Backbone.trigger("global:on_url_params_change", [
      this,
      "group_by",
      group_by.length > 0 ? group_by.join(";") : "",
      false
    ]);
    // применить фильтры
    this.onApplyFilters();
  },

  hide: function() {
    this.$(".pnl-group-by").hide();
    this.filterBoxView.hide();
    // this.newSpecificationPanelView.show();
    // this.linkSpecificationPanelView.hide();
    this.$(".btn-import-data").hide();
    this.$(".lnk-download-to-google").hide();
  },

  show: function() {
    this.$(".pnl-group-by").show();
    this.filterBoxView.show();
    // this.newSpecificationPanelView.hide();
    // this.linkSpecificationPanelView.show();
    this.$(".btn-import-data").show();
    this.$(".lnk-download-to-google").show();
  }
});
