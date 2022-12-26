///
/// Представление формы поиска спецификации
///
App.Views.EditMaterialView = Backbone.View.extend({
  tagName: "div",
  className: "edit-material-box",
  Materials_Units: null, //  справочники единиц измерения
  sectors: null, // справочник участков
  uniquePropsListView: null, // представление списка индивидуальных характеристик материала
  complexPropsListView: null, // представление списка индивидуальных характеристик материала
  linkedMaterialsListView: null, // представление списка прелинкованных материалов
  labels: [],
  templates: {
    main: _.template($("#editMaterialTemplate").html())
  },
  type: "standart", // вид материала [standart, not_standart]
  initialize: function() {
    this.Materials_Units = this.options.Materials_Units;
    this.sectors = this.options.sectors;
    this.materials_groups = this.options.materials_groups;
    this.edit = this.options.edit;
    this.labels = this.options.materials_labels;
    this.linear_labels = this.makeLinearsLabels(this.labels);
    this.type = this.options.type || "standart";
  },
  events: {
    "click .btn-save": "onSaveClick",
    "click .btn-copy": "onCopyClick",
    "click .btn-cancel": "onCancelClick"
  },
  unRender: function() {
    this.remove();
  },
  render: function() {
    var self = this;
    this.$el.html(
      this.templates.main(
        $.extend({}, this.model.toJSON(), {
          sectors: this.sectors,
          materials_groups: this.materials_groups,
          edit: this.edit
        })
      )
    );
    // навешивание масок на элементы ввода
    this.$(".is_money, .is_float").numeric({
      negative: false,
      decimal: ",",
      altDecimal: "."
    });
    this.$(".is_int").numeric({ negative: false, decimal: false });

    this.$(".is_date").datepicker({
      format: "dd.mm.yyyy",
      weekStart: 1,
      todayHighlight: true,
      multidate: false,
      forceParse: false,
      language: "ru"
    });
    // заполенние  Ед. измерения ПТО
    this.fill_unit_select(".tb_unit_pto", "unit_pto");
    // заполенние  Ед. измерения закупок
    this.fill_unit_select(".tb_unit_purchase", "unit_purchase");
    // заполенние  Название ЕСХ
    this.fill_unit_select(".tb_sku_name", "sku_name");
    // индивидуальные характеристики
    this.uniquePropsListView = new App.Views.UniquePropsListView({
      el: this.$(".unique-props-data-container"),
      collection: this.model.get("unique_props")
    });

    // индивидуальные характеристики
    this.complexPropsListView = new App.Views.ComplexPropsListView({
      el: this.$(".complex-props-data-container"),
      collection: this.model.get("unique_props")
    });

    // прилинкованные материалы
    this.linkedMaterialsListView = new App.Views.LinkedMaterialsListView({
      el: this.$(".linked-materials-data-container"),
      collection: this.model.get("linked_materials")
    });
    // заполнение тэгов
    var tags = [];
    var tbTags = this.$el.find(".tb_material_tags");
    for (var i in App.Tags)
      tags.push({ id: App.Tags[i]["name"], name: App.Tags[i]["name"] });
    tbTags.tokenInput(tags, {
      theme: "facebook",
      zindex: 1300,
      hintText: "Введите для поиска",
      noResultsText: "Ничего не найдено",
      searchingText: "Поиск...",
      allowFreeTagging: false
    });
    var sel_tags = this.model.get("tags");
    if (sel_tags)
      for (var i in sel_tags)
        tbTags.tokenInput("add", { id: sel_tags[i], name: sel_tags[i] });

    // заполнение лейблов
    var labels = this.prepareLabelsNew(this.labels, []);
    var tbLabels = this.$el.find(".tb_material_labels");

    tbLabels.tokenInput(labels, {
      theme: "facebook",
      zindex: 1300,
      hintText: "Введите для поиска",
      noResultsText: "Ничего не найдено",
      searchingText: "Поиск...",
      allowFreeTagging: false
    });

    var sel_labels = this.model.get("labels");
    if (sel_labels)
      for (var i in sel_labels) {
        var label = this.prepareLabel(sel_labels[i]);
        tbLabels.tokenInput("add", { id: label["id"], name: label["name"] });
      }

    return this;
  },

  /**
   * преобразование справочника меток из вида дерева в линейный dictionary
   * @param  {[type]} labels справочник меток
   */
  makeLinearsLabels: function(labels) {
    var result = {};
    if (labels)
      for (var i in labels) {
        result[labels[i]["_id"]] = labels[i];
        _.extend(result, this.makeLinearsLabels(labels[i]["items"]));
      }
    return result;
  },

  /**
   * Подготовка меток.  Происходит схлопывание меток из дерева в линейный список.
   * [{name:'', _id: '', items: [{name:'', _id:''}]}] -> [{id:'', name:''}]
   */
  /*prepareLabels: function(labels){
    var result = [];
    for(var i in labels){
      var label = labels[i];
      for(var j in label['items']){
        var item = label['items'][j];
        for(var k in item['items']){
          var c_item = item['items'][k];
          result.push({
            id: label['_id']+'#'+item['_id'],
            name: label['name']+'/'+item['name']+'/'+c_item['name']
          });
        }
      }
    }
    return result;
  },*/

  /**
   * Подготовка меток.  Происходит схлопывание меток из дерева в линейный список.
   * [{name:'', _id: '', items: [{name:'', _id:''}]}] -> [{id:'', name:''}]
   */
  prepareLabelsNew: function(items, parents) {
    var result = [];
    for (var i in items) {
      var new_parents = parents.slice();
      var item = items[i];
      if (item["items"]) {
        new_parents.push(item);
        result.push(...this.prepareLabelsNew(item["items"], new_parents));
      } else {
        var ids = [];
        var names = [];
        for (var j in parents) {
          ids.push(parents[j]["_id"]);
          names.push(parents[j]["name"]);
        }
        ids.push(item["_id"]);
        names.push(item["name"]);
        var tmp = { id: ids.join("#"), name: names.join("/") };
        result.push(tmp);
      }
    }
    return result;
  },

  /**
   * Подготовка метки
   * {full_id:'', category: {_id:''},  group: {_id:''}} -> [{id:'', name:''}]
   */
  prepareLabel: function(label) {
    //this.linear_labels
    return {
      id: label["full_id"],
      name:
        this.linear_labels[label["sector"]["_id"]]["name"] +
        "/" +
        this.linear_labels[label["category"]["_id"]]["name"] +
        "/" +
        this.linear_labels[label["group"]["_id"]]["name"]
    };
  },

  /**
   * Заполнение выпадающего списка единиц измерения
   */
  fill_unit_select: function(control, field_name) {
    var dataSource = [];
    for (var i in this.Materials_Units[field_name]) {
      var unit = this.Materials_Units[field_name][i];
      if (unit) dataSource.push({ id: unit, text: unit });
    }
    this.$(control).select2({
      data: dataSource,
      formatNoMatches: function() {
        return "";
      },
      createSearchChoice: function(term, data) {
        if (
          $(data).filter(function() {
            return this.text.localeCompare(term) === 0;
          }).length === 0
        ) {
          return { id: term, text: term };
        }
      }
    });
    this.$(control).select2("val", this.model.get(field_name));
  },

  /**
   * Кнопка копирования материала
   */
  onCopyClick: function(e) {
    var self = this;
    this.model.set("type", this.type || "standart");
    var tmp_model = new App.Models.MaterialItemModel(
      JSON.parse(JSON.stringify(this.model)),
      { parse: true }
    );
    tmp_model.set("name", "Копия " + this.model.get("name"));
    tmp_model.set("_id", "");
    tmp_model.set("code", "");
    _.each(tmp_model.get("unique_props").models, function(item) {
      item.set("_id", "");
    });

    // сохранение данных
    Routine.showLoader();
    $.ajax({
      type: "PUT",
      url: "/handlers/conformity/save_material_info",
      timeout: 35000,
      data: JSON.stringify(tmp_model),
      contentType: "application/json",
      dataType: "json",
      async: true
    })
      .done(function(result) {
        if (result["status"] == "ok") {
          $.jGrowl(
            "В группу № " +
              self.model.get("group_code").toString() +
              " добавлен новый материал № " +
              result["data"]["code"].toString(),
            { themeState: "growl-success", sticky: true }
          );
          // тригер событие о добавлении нового материала
          Backbone.trigger("global:on_material_save_complete", [
            self,
            "add",
            result["data"]
          ]);
          // чистим форму после добавления материала
          self.model = new App.Models.MaterialItemModel(result["data"], {
            parse: true
          });
          self.render();
        } else $.jGrowl("Ошибка копирования материала. Подробности: " + result["msg"], { themeState: "growl-error", sticky: false });
      })
      .error(function(jqXHR, textStatus, errorThrown) {
        $.jGrowl("Ошибка копирования материала. Подробности: " + errorThrown, {
          themeState: "growl-error",
          sticky: false
        });
      })
      .always(function(jqXHR, textStatus, errorThrown) {
        Routine.hideLoader();
      });
  },

  /**
   ** Кнопка отмены сохранения материала
   **/
  onCancelClick: function(e) {
    Backbone.trigger("global:on_material_edit_cancel", [this]);
  },

  /**
   ** Кнопка сохранения материала
   **/
  onSaveClick: function(e) {
    var self = this;
    this.model.set("type", this.type || "standart");
    // проверка сохраняемых данных
    this.$(".err").removeClass("err");

    if (!this.$(".tb_name").val()) {
      this.$(".tb_name").addClass("err");
      $.jGrowl("Необходимо заполнить название материала.", {
        themeState: "growl-error",
        sticky: false
      });
      return;
    }
    if (!this.$(".ddl_group").val()) {
      $.jGrowl("Необходимо заполнить группу материала.", {
        themeState: "growl-error",
        sticky: false
      });
      return;
    }
    if (!this.$(".tb_unit_pto").select2("val")) {
      $.jGrowl("Не заполнено поле 'Ед. материала'.", {
        themeState: "growl-error",
        sticky: false
      });
      return;
    }

    // // дата цены
    // if (
    //   !this.$(".tb_price_date").val() ||
    //   !Routine.isValidDate(this.$(".tb_price_date").val(), "dd.mm.yyyy")
    // ) {
    //   this.$(".tb_price_date").addClass("err");
    //   $.jGrowl("Неверный формат даты цены.", {
    //     themeState: "growl-error",
    //     sticky: false
    //   });
    //   return;
    // }

    // сбор данных на сохранение
    this.model.set("group_code", Routine.strToInt(this.$(".ddl_group").val()));
    this.model.set("code", Routine.strToInt(this.$(".tb_code").val()));
    this.model.set("name", this.$(".tb_name").val());

    //-----
    var last_goods = this.model.get("last_goods");
    if (!last_goods)
      last_goods = {
        price: 0,
        date: "",
        account: "",
        account_type: "",
        good_code_1c: "",
        coef_si_div_iu: 0
      };

    //-----------------------------
    last_goods["price"] = Routine.strToFloat(this.$(".tb_price").val());
    last_goods["date"] = moment.utc(
      this.$(".tb_price_date").val(),
      "DD.MM.YYYY"
    );
    last_goods["coef_si_div_iu"] = Routine.strToFloat(
      this.$(".tb_coef_si_div_iu_value").val()
    );

    //-----------------------------

    // this.model.set('price', Routine.strToFloat(this.$('.tb_price').val()));
    // this.model.set('price_date',this.$('.tb_price_date').val());
    //-----

    this.model.set("unit_purchase", this.$(".tb_unit_purchase").select2("val"));
    this.model.set(
      "unit_purchase_value",
      Routine.strToFloat(this.$(".tb_unit_purchase_value").val())
    );
    this.model.set("unit_pto", this.$(".tb_unit_pto").select2("val"));
    this.model.set(
      "unit_pto_value",
      Routine.strToFloat(this.$(".tb_unit_pto_value").val())
    );
    this.model.set("out_sector_id", this.$(".ddl_out_sector").val());
    this.model.set("manufact_sector_id", this.$(".ddl_manufact_sector").val());
    this.model.set("sku_name", this.$(".tb_sku_name").select2("val"));
    this.model.set(
      "sku_pto_proportion",
      Routine.strToFloat(this.$(".tb_sku_pto_proportion").val())
    );
    this.model.set(
      "delivery_size",
      Routine.strToFloat(this.$(".tb_delivery_size").val())
    );
    this.model.set(
      "delivery_time_min",
      Routine.strToFloat(this.$(".tb_delivery_time_min").val())
    );
    this.model.set(
      "delivery_time_max",
      Routine.strToFloat(this.$(".tb_delivery_time_max").val())
    );
    this.model.set(
      "delivery_price",
      Routine.strToFloat(this.$(".tb_delivery_price").val())
    );
    this.model.set("note", this.$(".tb_note").val());
    this.model.set("tech_using", this.$(".tb_tech_using").val());
    this.model.set("is_active", this.$(".cb_active").prop("checked") ? 1 : 0);

    // Сбор тэгов
    var tags = this.$(".tb_material_tags").val();
    var tg_spl = tags.split(",");
    var tgList = [];
    for (var i in tg_spl) {
      if (tg_spl[i] && tgList.indexOf(tg_spl[i]) < 0) tgList.push(tg_spl[i]);
    }
    this.model.set("tags", tgList);

    // Сбор меток
    var labels = [];
    var sel_labels = this.$el.find(".tb_material_labels").tokenInput("get");
    if (labels) {
      for (var i in sel_labels) {
        var sel_label = sel_labels[i];
        labels.push({
          full_id: sel_label["id"],
          sector: { _id: sel_label["id"].split("#")[0] },
          category: { _id: sel_label["id"].split("#")[1] },
          group: { _id: sel_label["id"].split("#")[2] }
        });
      }
      this.model.set("labels", labels);
    }

    if (labels.length === 0) {
      $.jGrowl("Нет классификации материала. Заполните поле 'Метки'", {
        themeState: "growl-error",
        sticky: false
      });
      return;
    }

    // проверка на дубликаты индивидуальных характеристик
    var props_names = {};
    var have_empty_unique_props = false;
    _.each(this.model.get("unique_props").models, function(item) {
      if (!item.get("name")) have_empty_unique_props = true;

      if (item.get("name") in props_names) props_names[item.get("name")]++;
      else props_names[item.get("name")] = 1;
    });
    var err_msg = "";
    for (var i in props_names) {
      if (props_names[i] > 1) err_msg += i + "<br>";
    }
    if (err_msg != "") {
      $.jGrowl("Задвоение характеристик. <br><br>" + err_msg, {
        themeState: "growl-error",
        sticky: false,
        life: 10000
      });
      return;
    }

    if (have_empty_unique_props) {
      $.jGrowl(
        "Необходимо заполнить название для всех уникальных характеристик",
        { themeState: "growl-error", sticky: false, life: 10000 }
      );
      return;
    }

    // проверка на дубликаты индивидуальных характеристик

    // проверка на дубликаты прилинкованных материалов
    var have_empty_materials = false;
    var linked_materials = {};
    _.each(this.model.get("linked_materials").models, function(item) {
      if (!item.get("material_id")) have_empty_materials = true;
      else {
        var tmp_code =
          item.get("group_code").toString() + "." + item.get("code").toString();
        if (tmp_code in linked_materials) linked_materials[tmp_code]++;
        else linked_materials[tmp_code] = 1;
      }
    });
    err_msg = "";
    for (var i in linked_materials) {
      if (linked_materials[i] > 1) err_msg += i + "<br>";
    }
    if (err_msg != "") {
      $.jGrowl(
        "В блоке связанных материалов есть задвоения материалов. <br><br>" +
          err_msg,
        { themeState: "growl-error", sticky: false, life: 10000 }
      );
      return;
    }
    if (have_empty_materials) {
      $.jGrowl(
        "В блоке связанных материалов есть неопределенные материалы. <br><br>" +
          err_msg,
        { themeState: "growl-error", sticky: false, life: 10000 }
      );
      return;
    }

    // сохранение данных
    Routine.showLoader();
    $.ajax({
      type: "PUT",
      url: "/handlers/conformity/save_material_info",
      timeout: 35000,
      data: JSON.stringify(this.model),
      contentType: "application/json",
      dataType: "json",
      async: true
    })
      .done(function(result) {
        if (result["status"] == "ok") {
          // обновление справочника единиц измерения
          self.update_units();
          if (!self.model.get("_id")) {
            $.jGrowl(
              "В группу № " +
                self.model.get("group_code").toString() +
                " добавлен новый материал № " +
                result["data"]["code"].toString(),
              { themeState: "growl-success", sticky: true }
            );
            // тригер событие о добавлении нового материала
            Backbone.trigger("global:on_material_save_complete", [
              self,
              "add",
              result["data"]
            ]);
            // чистим форму после добавления материала
            self.model = new App.Models.MaterialItemModel({}, { parse: true });
            self.render();
          } else {
            $.jGrowl("Данные успешно сохранены.", {
              themeState: "growl-success",
              sticky: false
            });
            // тригер событие о редактировании материала
            Backbone.trigger("global:on_material_save_complete", [
              self,
              "edit",
              result["data"]
            ]);
            self.model = new App.Models.MaterialItemModel(result["data"], {
              parse: true
            });
            self.render();
          }
        } else $.jGrowl("Ошибка сохранения информации о материале. Подробности: " + result["msg"], { themeState: "growl-error", sticky: false });
      })
      .error(function(jqXHR, textStatus, errorThrown) {
        $.jGrowl(
          "Ошибка сохранения информации о материале. Подробности: " +
            errorThrown,
          { themeState: "growl-error", sticky: false }
        );
      })
      .always(function(jqXHR, textStatus, errorThrown) {
        Routine.hideLoader();
      });
  },

  /**
   * обновление справочника единиц измерений
   * unit_pto
   * sku_name
   * unit_purchase
   */
  update_units: function() {
    if (
      this.model.get("unit_pto") &&
      this.Materials_Units["unit_pto"].indexOf(this.model.get("unit_pto")) < 0
    )
      this.Materials_Units["unit_pto"].push(this.model.get("unit_pto"));
    if (
      this.model.get("sku_name") &&
      this.Materials_Units["sku_name"].indexOf(this.model.get("sku_name")) < 0
    )
      this.Materials_Units["sku_name"].push(this.model.get("sku_name"));
    if (
      this.model.get("unit_purchase") &&
      this.Materials_Units["unit_purchase"].indexOf(
        this.model.get("unit_purchase")
      ) < 0
    )
      this.Materials_Units["unit_purchase"].push(
        this.model.get("unit_purchase")
      );
  }
});
