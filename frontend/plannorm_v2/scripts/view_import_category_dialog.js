App.Views.ImportCategoryDialogView = Backbone.View.extend({
  template: _.template($("#ImportCategoryDialogView").html()),
  events: {
    "click .btn-save": "onSaveClick",
    "change .ddl": "changeGroup"
  },
  searchObject: null,

  initialize: function(obj) {
    this.render();
  },

  render: function(obj) {
    var self = this;
    this.$el.append(this.template($.extend({}, this.model)));
    this.$el.modal({ close: function() {} });
    this.$el.on("hidden", function() {
      self.trigger("dialogclose");
    });

    var tbsearchObject = this.$el.find(".tb-search-object");
    tbsearchObject.tokenInput(this.model.searchObjects, {
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

  changeGroup: function(e) {
    var ddl = $(e.currentTarget);
    var items = this.getChilds(ddl.val());
    this.fillDropList(ddl.data("type"), items);
  },

  makeLinearsGroups: function(data) {
    var result = {};
    if (data)
      for (var i in data) {
        result[data[i]["_id"]] = data[i];
        _.extend(result, this.makeLinearsGroups(data[i]["items"]));
      }
    return result;
  },

  getChilds: function(item_id) {
    return item_id
      ? this.makeLinearsGroups(this.model.groupsList)[item_id]["items"]
      : [];
  },

  fillDropList: function(type, items) {
    var ddl = "";
    if (type == "sector") ddl = this.$(".ddl-category");
    else if (type == "category") ddl = this.$(".ddl-group");
    if (ddl) {
      ddl.empty();
      ddl.append('<option value = "">Все</option>');
      for (var i in items) {
        var row = items[i];
        ddl.append(
          '<option value = "' + row["_id"] + '">' + row["name"] + "</option>"
        );
      }
      ddl.change();
    }
  },

  onSaveClick: function(e) {
    if (!this.$("[name=operation-type]:checked").val()) {
      $.jGrowl("Задайте тип операции (импорт или экспорт).", {
        themeState: "growl-error",
        sticky: false,
        life: 5000
      });
      return;
    }
    // if (this.$(".ddl-sector").val() === "") {
    //   $.jGrowl("Задайте направление.", {
    //     themeState: "growl-error",
    //     sticky: false,
    //     life: 5000
    //   });
    //   return;
    // }
    if (!this.searchObject) {
      $.jGrowl("Задайте документ для импорта/экспорта расчетов.", {
        themeState: "growl-error",
        sticky: false,
        life: 5000
      });
      return;
    }
    this.trigger("dialogsave", {
      operation_type: this.$("[name=operation-type]:checked").val(),
      sector_id: this.$(".ddl-sector").val(),
      category_id: this.$(".ddl-category").val(),
      group_id: this.$(".ddl-group").val(),
      search_obj: this.searchObject
    });
    this.$el.modal("hide");
    this.$el.remove();
  }
});
