///---------------------------------------------------------------------------------------------------------
/// представление формы групповых расчетов
///---------------------------------------------------------------------------------------------------------
App.Views.GroupsCalculationView = Backbone.View.extend({
  el: "#groups-calculation-data-body-container",
  templates: {
    template: _.template($("#GroupCalculationDataListTemplate").html()),
    sector_item_template: _.template(
      $("#GroupsCalculationSectorItemTemplate").html()
    ),
    category_item_template: _.template(
      $("#GroupsCalculationCategoryItemTemplate").html()
    ),
    group_item_template: _.template(
      $("#GroupsCalculationGroupItemTemplate").html()
    )
  },
  events: {
    "change .tb-value": "onValueChange",
    "click .lnk-autocalc": "onAutocalcClick",
    "click .cb-item": "onClickPlus"
  },

  openedItems: null, // список идентификаторов элементов, которые необходимо раскрыть
  dictionary: null,
  data: null,

  initialize: function() {
    this.openedItems = {};
  },

  clear: function() {
    this.$el.empty();
    // this.openedItems = {};
    this.show();
  },

  hide: function() {
    this.$el.hide();
  },

  show: function() {
    this.$el.show();
  },

  /**
   * Обработка раскрытия/сокрытия узлов дерева
   */
  onClickPlus: function(e) {
    this.openedItems[$(e.currentTarget).data("id")] = $(e.currentTarget).prop(
      "checked"
    );
  },

  render: function(dictionary, data) {
    this.dictionary = dictionary;
    this.data = data;
    this.clear();
    this.$el.html(this.templates.template({}));

    var saved_data = {};
    for (var i in data) saved_data[data[i]["_id"]] = data[i];

    var summ = { value: 0 };
    this.renderGroupedData(
      dictionary,
      saved_data,
      $(this.$el.find(".data-list")),
      "1",
      0,
      "sector",
      summ
    );
    this.$(".tb-value").numeric({
      negative: false,
      decimal: ",",
      altDecimal: "."
    });

    // прописать суммарную оценку
    this.$(".lbl-summ").html(Routine.priceToStr(summ["value"]));

    // раскрыть сохраненные ветки
    for (var i in this.openedItems)
      this.$el
        .find("[data-id='" + i + "']")
        .prop("checked", this.openedItems[i]);
  },

  renderGroupedData: function(
    dictionary,
    data,
    container,
    index,
    level,
    type,
    summ
  ) {
    level++;
    for (var i in dictionary) {
      var row = dictionary[i];
      var saved_row = row["_id"] in data ? data[row["_id"]] : null;

      // calculate summ price
      if (type !== "group" && saved_row) {
        // calculate value by childs
        if (saved_row["autocalc"] == "yes") {
          var group_summ = 0;
          for (var j in row["items"]) {
            var child_row = row["items"][j];
            var saved_chaild_row =
              child_row["_id"] in data ? data[child_row["_id"]] : null;
            if (saved_chaild_row && saved_chaild_row["value"])
              group_summ += Routine.strToFloat(saved_chaild_row["value"]);
          }
          saved_row["value"] = group_summ;
        }
      }

      if (type === "sector" && saved_row)
        summ["value"] += Routine.strToFloat(saved_row["value"]);

      //if(saved_row && parent)
      //  this.openedItems[parent['id']] = true;
      var new_container = null;
      var tmp_object = {
        level: level.toString(),
        index: index + "-" + i,
        name: row["name"],
        number: row["number"],
        id: row["_id"],
        value: saved_row ? saved_row["value"] : "",
        autocalc: saved_row ? saved_row["autocalc"] : ""
      };
      switch (type) {
        case "sector":
          new_container = $(this.templates.sector_item_template(tmp_object));
          break;
        case "category":
          new_container = $(this.templates.category_item_template(tmp_object));
          break;
        case "group":
          new_container = $(this.templates.group_item_template(tmp_object));
          break;
      }
      // рекурсия
      this.renderGroupedData(
        row["items"],
        data,
        $(new_container).find(".data-list"),
        index + "-" + i,
        level,
        type === "sector" ? "category" : "group",
        summ
      );
      $(container).append(new_container);
    }
  },

  /**
   * Get data from form
   */
  getFormData: function() {
    var result = [];
    this.$(".tb-value").each(function() {
      //if((this.value && this.value !== '0') || $(this).data('autocalc') === 'yes')
      result.push({
        type: $(this).data("type"),
        _id: $(this).data("id"),
        autocalc: $(this).data("autocalc") === "yes" ? "yes" : "no",
        value: Routine.strToFloat($(this).val())
      });
    });
    return result;
  },

  onValueChange: function(e) {
    // get all values
    this.data = this.getFormData();
    var el = $(e.currentTarget);
    var data_id = el.data("id");
    el.val(Routine.priceToStr(el.val()));
    // save values
    App.saveGroupCalculations(this.data);
    this.render(this.dictionary, this.data);

    // this.$("[data-id='" + data_id + "']").focus();
  },

  recalculateValues: function(dictionary, data) {
    for (var i in dictionary) {
      var row = dictionary[i];
      if (row["items"]) {
        var saved_row = row["_id"] in data ? data[row["_id"]] : null;
        if (saved_row && saved_row["autocalc"] === "yes") {
          var group_summ = 0;
          for (var j in row["items"]) {
            this.recalculateValues(row["items"], data);
            var child_row = row["items"][j];
            var saved_chaild_row =
              child_row["_id"] in data ? data[child_row["_id"]] : null;
            if (saved_chaild_row && saved_chaild_row["value"])
              group_summ += Routine.strToFloat(saved_chaild_row["value"]);
          }
          saved_row["value"] = group_summ;
        }
      }
    }
  },

  onAutocalcClick: function(e) {
    var el = $(e.currentTarget);
    var tb = el.parent().find(".tb-value");
    if (tb.data("autocalc") == "yes") {
      //el.find('i').addClass('color-lightgrey');
      tb.data("autocalc", "no").prop("disabled", false);
    } else {
      //el.find('i').removeClass('color-lightgrey');
      tb.data("autocalc", "yes").prop("disabled", true);
    }

    // recalculate volumes
    var saved_data = {};
    for (var i in this.data) saved_data[this.data[i]["_id"]] = this.data[i];
    saved_data[tb.data("id")]["autocalc"] = tb.data("autocalc");
    this.recalculateValues(this.dictionary, saved_data);

    // this.data = this.getFormData();
    App.saveGroupCalculations(this.data);
    this.render(this.dictionary, this.data);
  },

  calculateSumm: function() {
    var data = {};
    for (var i in this.data) data[this.data[i]["_id"]] = this.data[i];
  }
});
