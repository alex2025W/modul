///
/// Представление панели поиска
///
App.Views.SearchLineView = Backbone.View.extend({
  className: "pnl-search-box",
  tagName: "div",
  templates: {
    main: _.template($("#SearchLineTemplate").html())
  },
  events: {
    "click .btn-search": "onSearchClick",
    "keyup .filter-number": "OnKeyPress",
    "click .lnk-cancel-search": "onCancelSearch"
  },
  initialize: function() {},
  render: function() {
    this.$el.html(this.templates.main(this.model));
    return this;
  },
  OnKeyPress: function(e) {
    if (e.keyCode == 13) this.onSearchClick(e);

    if (this.$(".filter-number").val() != "")
      this.$(".lnk-cancel-search").show();
    else this.$(".lnk-cancel-search").hide();
  },
  onCancelSearch: function(e) {
    this.$(".filter-number").val("");
    this.onSearchClick(e);
  },
  onSearchClick: function(e) {
    // this.$('.filter-number').val()
    this.model["query"] = this.$(".filter-number").val();
    this.$el.trigger("on_line_filter", [this.model["query"]]);
  },
  setQuery: function(val) {
    this.model["query"] = val;
    this.$(".filter-number").val(val);
    this.$el.trigger("on_line_filter", [this.model["query"]]);
  },
  show: function() {
    this.$el.show();
  },
  hide: function() {
    this.$el.hide();
  }
});
