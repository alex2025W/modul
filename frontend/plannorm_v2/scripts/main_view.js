App.Views.MainView = Backbone.View.extend({
  el: $("#pnlMainDataBox"),
  currentTab: "data-materials",
  currentSectorTab: null,
  events: {
    "click .main-data-tabs a": "onTabClicked",
    "click .sector-tabs a": "onSectorTabClicked",
    "click .lnk-maximize": "onMaximize",
    "click .btn-save-all": "onDataSave",
    "click .btn-save-all-and-close": "onDataSaveAndClose"
  },
  initialize: function() {
    Backbone.on("global:apply_filters", this.onApplyFilters, this);
    Backbone.on("global:on_data_loaded", this.onDataLoaded, this);
  },

  onTabClicked: function(e) {
    e.preventDefault();
    this.setTab($(e.currentTarget).data("type"));
    // save in url
    Backbone.trigger("global:on_url_params_change", [
      this,
      "tab",
      $(e.currentTarget).data("type"),
      false
    ]);
    Backbone.trigger("global:on_tab_change", [
      this,
      $(e.currentTarget).data("type")
    ]);
  },

  onSectorTabClicked: function(e) {
    e.preventDefault();
    this.setSectorTab($(e.currentTarget).data("value"));
    // save in url
    Backbone.trigger("global:on_url_params_change", [
      this,
      "sector",
      $(e.currentTarget).data("value"),
      false
    ]);
    Backbone.trigger("global:on_sector_change", [
      this,
      $(e.currentTarget).data("value")
    ]);
  },

  getUrl: function() {
    return "/tab/" + this.currentTab + "/sector/" + this.currentSectorTab;
  },

  /**
   * Обработка события смены филтров и группировок
   * obj[sender, filters]
   * filters = {group_by, groups}
   */
  onApplyFilters: function(obj) {
    var filters = obj[1];
  },

  /**
   * Обработка события окончания загрузки основных данных
   */
  onDataLoaded: function(obj) {},

  /**
   * развернуть/свернуть форму данных
   */
  onMaximize: function(e) {
    var el = $(e.currentTarget);
    if (el.data("val") == "min") {
      el.data("val", "max");
      el.html("свернуть");
      $(".page-title").hide();
      $(".navbar").hide();
      $(".left-side").hide();
      $("#main-header").hide();
    } else {
      el.data("val", "min");
      el.html("развернуть");
      $(".page-title").show();
      $(".navbar").show();
      $(".left-side").show();
      $("#main-header").show();
    }
  },

  hide: function() {
    this.$el.hide();
  },

  show: function(data) {
    this.$el.show();
    if (data.tab) this.setTab(data.tab);
    if (data.sector) this.setSectorTab(data.sector);
    this.note = data.note;
    this.$(".specification-note").val(
      this.note ? Routine.stripTags(this.note) : ""
    );
  },

  setTab: function(key) {
    key = key || this.currentTab;
    this.$(".tab-box").hide();
    this.$(".main-data-tabs")
      .find("li")
      .removeClass("active");
    this.$(".main-data-tabs")
      .find('[data-type="' + key + '"]')
      .parent()
      .addClass("active");
    this.$("#" + key).show();
    this.currentTab = key;

    // change common buttons control position
    if (this.currentTab == "data-calculations")
      this.$(".pnl-save-controls").css({ "margin-top": "-120px" });
    else this.$(".pnl-save-controls").css({ "margin-top": "20px" });
  },

  setSectorTab: function(key) {
    key = key || this.currentSectorTab;
    this.$(".sector-tabs")
      .find("li")
      .removeClass("active");
    this.$(".sector-tabs")
      .find('[data-value="' + key + '"]')
      .parent()
      .addClass("active");
    this.$("#" + key).show();
    this.currentSectorTab = key;
  },

  /**
   * Save data
   */
  onDataSave: function() {
    App.saveSpecification(this.$(".specification-note").val(), false);
  },

  /**
   * Save data and close
   */
  onDataSaveAndClose: function() {
    App.saveSpecification(this.$(".specification-note").val(), true);
  }
});
