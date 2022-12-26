///
/// Контрол управления фильтрацией по группам и разделам
///
App.Views.FilterBoxView = Backbone.View.extend({
  el: $("#pnlFilterBox"),
  data: null, // список данных
  filterItemsView: null, // представление списка категорий и групп
  events: {
    "click #btn_filter_data": "OnFilter",
    "click #btn_clear_filters": "OnClearFilter"
  },
  initialize: function() {
    this.filterItemsView = new App.Views.FilterItemsView();
  },
  render: function(data, selected_items) {
    this.data = data;
    this.$el
      .find(".pnl-filters-groups")
      .append(
        this.filterItemsView.rebuildFilters(this.data, selected_items).el
      );
    return this;
  },
  /**
   * Apply filters
   */
  OnFilter: function(e) {
    // событие на применение фильтров
    //console.log(this.filterItemsView.get_selected_items());
    Backbone.trigger("global:on_url_params_change", [
      this,
      "groups",
      this.getUrl()
    ]);
    Backbone.trigger("filter_box:apply_filters", [
      this,
      this.filterItemsView.get_selected_items()
    ]);
  },

  /**
   * Clear filters
   */
  OnClearFilter: function(e) {
    this.filterItemsView.reset();
    Backbone.trigger("global:on_url_params_change", [this, "groups", ""]);
    Backbone.trigger("filter_box:reset_filters", [this]);
  },

  /**
   * Формирование URL по выбранным зеначениям
   * Формат: "category_id:group_id;group_id;group_id"
   */
  getUrl: function() {
    return this.filterItemsView.get_url();
  },

  getFilters: function() {
    return this.filterItemsView.get_selected_items();
  },

  show: function() {
    this.$el.show();
  },

  hide: function() {
    this.$el.hide();
  }
});

App.Views.FilterItemsView = Backbone.View.extend({
  events: {},
  initialize: function() {},

  /**
   * Перестроение фильтров
   * data - список доступных категоорий и групп
   * selected_items - список предустановленных групп
   */
  rebuildFilters: function(data, selected_items) {
    this.collection = new App.Collections.FilterSectorCollection(data);
    this.render(selected_items);
    return this;
  },

  /**
   * Отрисовка
   * selected_items - ['_id#_id,'_id#_id']
   */
  render: function(selected_items) {
    var self = this;
    // проставление выранных ранее фильтров
    if (selected_items && selected_items.length > 0) {
      this.collection.models.forEach(function(sector) {
        sector.get("items").models.forEach(function(category) {
          category.get("items").models.forEach(function(group) {
            if (selected_items.indexOf(group.get("_id")) > -1) {
              sector.set("selected", true);
              category.set("selected", true);
              group.set("selected", true);
            }
          });
        });
      });
    }
    // отрисовка
    this.clear();
    this.collection.models.forEach(function(model) {
      self.$el.append(
        new App.Views.FilterSectorItemView({ model: model }).render().el
      );
    });
    // // стрелки в раскрывающихся блоках
    // this.$("div.accordion-body").on("shown", function() {
    //   $(this)
    //     .parent("div")
    //     .find(".icon-chevron-down:first")
    //     .removeClass("icon-chevron-down")
    //     .addClass("icon-chevron-up");
    // });
    // this.$("div.accordion-body").on("hidden", function() {
    //   $(this)
    //     .parent("div")
    //     .find(".icon-chevron-up:first")
    //     .removeClass("icon-chevron-up")
    //     .addClass("icon-chevron-down");
    // });
    return this;
  },

  /**
   * Формирование URL по выбранным зеначениям
   * Формат: "group_id;group_id;group_id"
   */
  get_url: function() {
    return this.get_selected_items().join(";");
  },

  /**
   * Получить список выюранных фильтров
   */
  get_selected_items: function() {
    var self = this;
    var result = [];
    if (self.collection) {
      self.collection.models.forEach(function(sector) {
        sector.get("items").models.forEach(function(category) {
          category.get("items").models.forEach(function(group) {
            if (group.get("selected")) result.push(group.get("_id"));
          });
        });
      });
    }
    return result;
  },

  reset: function() {
    this.collection.models.forEach(function(category) {
      category.set("selected", false);
      category.get("items").models.forEach(function(group) {
        group.set("selected", false);
      });
    });

    this.render(null);
  },
  clear: function() {
    this.$el.empty();
  },
  show: function() {
    this.$el.show();
  },
  hide: function() {
    this.$el.hide();
  }
});

/**
 * Sector
 */
App.Views.FilterSectorItemView = Backbone.View.extend({
  tagName: "div",
  className: "accordion-group",
  templates: {
    item: _.template($("#FilterSectorItemTemplate").html())
  },
  render: function() {
    var self = this;
    this.$el.html(this.templates.item(this.model.toJSON()));
    if (this.model.get("selected")) {
      this.$(".accordion-toggle").removeClass("collapsed");
      this.$(".accordion-body").addClass("in");
      //   .parent("div")
      //   .find(".icon-chevron-down:first")
      //   .removeClass("icon-chevron-down")
      //   .addClass("icon-chevron-up");
    }
    this.model.get("items").models.forEach(function(value) {
      self.$el
        .find(".data-categories")
        .append(
          new App.Views.FilterCategoryItemView({ model: value }).render().el
        );
    });
    return this;
  }
});

/**
 * Category
 */
App.Views.FilterCategoryItemView = Backbone.View.extend({
  tagName: "div",
  className: "accordion-group",
  templates: {
    item: _.template($("#FilterCategoryItemTemplate").html())
  },
  events: {
    "click .lnk-import-category": "onCategoryimport"
  },
  render: function() {
    var self = this;
    this.$el.html(this.templates.item(this.model.toJSON()));
    if (this.model.get("selected")) {
      this.$(".accordion-toggle").removeClass("collapsed");
      this.$(".accordion-body").addClass("in");
      //   .parent("div")
      //   .find(".icon-chevron-down:first")
      //   .removeClass("icon-chevron-down")
      //   .addClass("icon-chevron-up");
    }
    this.model.get("items").models.forEach(function(value) {
      self.$el
        .find("ul.pnl-prop-values")
        .append(
          new App.Views.FilterGroupItemView({ model: value }).render().el
        );
    });
    return this;
  },
  /**
   * Eevnt on showing for for vategory import
   */
  onCategoryimport: function(e) {
    Backbone.trigger("filter_box:on_import_category", [this.model]);
  }
});

/**
 * Group
 */
App.Views.FilterGroupItemView = Backbone.View.extend({
  tagName: "li",
  className: "item-value",
  templates: {
    item: _.template($("#FilterGroupItemTemplate").html())
  },
  events: {
    "click .cb-val": "onItemCheck"
  },
  initialize: function() {},
  render: function() {
    this.$el.html(this.templates.item(this.model.toJSON()));
    return this;
  },
  onItemCheck: function(e) {
    this.model.set("selected", this.$(".cb-val").prop("checked"));
  }
});
