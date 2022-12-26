///
/// Глобальная структура
///
var App = {
  Data: null, // исходные данные
  Models: {},
  Views: {},
  Collections: {},
  Route: null,
  ContainerView: null,
  DataWorks: [],
  DataMaterials: [],
  Materials_Units: {},
  Tags: [],
  Labels: [],
  /**
   *  Инициализация необходимых объектов
   **/
  initialize: function(data) {
    this.Data = data;
    this.Tags = data.tags;
    this.Labels = data.labels;
    // подговтока данных по участкам и работам
    for (var sector_index in data.sectors) {
      var sector_info = data.sectors[sector_index];
      if (sector_info["works"] && sector_info["works"].length > 0) {
        for (var work_index in sector_info["works"]) {
          var work_info = sector_info["works"][work_index];
          if (work_info["is_active"]) {
            var tmp_item = {
              sector_id: sector_info["_id"],
              sector_name: sector_info["name"],
              sector_routine: sector_info["routine"],
              sector_type: sector_info["type"],
              sector_is_active: sector_info["is_active"],
              sector_code: sector_info["code"],
              work_id: work_info["_id"],
              work_code: work_info["code"],
              work_name: work_info["name"],
              work_is_active: work_info["is_active"],
              work_routine: work_info["routine"],
              work_materials: work_info["materials"]
            };
            App.DataWorks.push(tmp_item);
          }
        }
      }
    }
    // подговтока данных по материалам
    for (var group_index in data.materials_groups) {
      var material_group_info = data.materials_groups[group_index];
      if (
        material_group_info["materials"] &&
        material_group_info["materials"].length > 0
      ) {
        for (var material_index in material_group_info["materials"]) {
          var material_info = material_group_info["materials"][material_index];
          if (material_info["is_active"]) {
            var tmp_item = {
              group_id: material_group_info["_id"],
              group_name: material_group_info["name"],
              group_routine: material_group_info["routine"],
              group_is_active: material_group_info["is_active"],
              group_code: material_group_info["code"],
              material_id: material_info["_id"],
              material_code: material_info["code"],
              material_name: material_info["name"],
              material_is_active: material_info["is_active"],
              material_routine: material_info["routine"],
              material_works: material_info["works"]
            };
            App.DataMaterials.push(tmp_item);
          }
        }
      }
    }

    // единицы измерения
    this.Materials_Units = data.material_units;
    // форма соответствий
    this.ContainerView = new App.Views.ContainerView();
    this.EditMaterialFormContainerView = new App.Views.EditMaterialFormContainerView(
      {
        data: this.Data,
        Materials_Units: this.Materials_Units,
        materials_labels: this.Labels
      }
    );
    // слушатель события изменения данных о матери
    Backbone.on(
      "global:on_material_save_complete",
      this.onMaterialUpdateComplete,
      this
    );
  },

  /**
   ** обработка события завершения обновления материала
   ** для обновления данных на основной форме соответствий
   **/
  onMaterialUpdateComplete: function(e) {
    var type = e[1]; // add/edit
    var material_info = e[2]; // обновленный материал
    if (type == "add") {
      // поиск группы, в которую необходимо добавить материал
      var material_group_info = null;
      for (var group_index in this.Data.materials_groups) {
        if (
          this.Data.materials_groups[group_index]["code"] ==
          material_info["group_code"]
        ) {
          material_group_info = this.Data.materials_groups[group_index];
          material_group_info["materials"].push({
            _id: material_info["_id"],
            code: material_info["code"],
            name: material_info["name"],
            is_active: material_info["is_active"]
          });
          break;
        }
      }
      // добавление нового материала в список соответствий
      App.DataMaterials.push({
        group_id: material_group_info["_id"],
        group_name: material_group_info["name"],
        group_routine: material_group_info["routine"],
        group_is_active: material_group_info["is_active"],
        group_code: material_group_info["code"],
        material_id: material_info["_id"],
        material_code: material_info["code"],
        material_name: material_info["name"],
        material_is_active: material_info["is_active"],
        material_routine: 0,
        material_works: []
      });

      App.DataMaterials.sort(function(a, b) {
        if (a.group_name == b.group_name)
          return a.material_name < b.material_name
            ? -1
            : a.material_name > b.material_name
              ? 1
              : 0;
        else return a.group_name < b.group_name ? -1 : 1;
      });
    } else {
      // обновление материала в списке соответтвий
      for (var i in App.DataMaterials) {
        var tmp_material = App.DataMaterials[i];
        if (
          tmp_material["material_id"].toString() ==
          material_info["_id"].toString()
        ) {
          tmp_material["material_name"] = material_info["name"];
          break;
        }
      }
      // обновление материала в глобальном справочнике
      for (var group_index in this.Data.materials_groups) {
        if (
          this.Data.materials_groups[group_index]["code"] ==
          material_info["group_code"]
        ) {
          var material_group_info = this.Data.materials_groups[group_index];
          for (var mi in material_group_info["materials"]) {
            var tmp_material = material_group_info["materials"][mi];
            if (
              tmp_material["_id"].toString() == material_info["_id"].toString()
            ) {
              tmp_material["name"] = material_info["name"];
              break;
            }
          }
          break;
        }
      }
    }

    this.EditMaterialFormContainerView.SearchFormMaterialView.render();
    this.ContainerView.RenderMaterials(
      this.ContainerView.$el.find(".btn-collapse-materials").val() ==
        "unCollapsed",
      this.ContainerView.$el.find(".btn-show").val() == "show",
      this.ContainerView.cur_work_item
        ? this.ContainerView.cur_work_item["work_materials"]
        : null
    );
  }
};

///
/// Основная форма
///
App.Views.ContainerView = Backbone.View.extend({
  el: $("#conformity"),
  cur_work_item: null,
  templates: {
    works_data: _.template($("#dataTemplateWorks").html()),
    materials_data: _.template($("#dataTemplateMaterials").html())
  },
  events: {
    "click .btn-collapse": "OnCollapse",
    "click .btn-show": "OnVisible",
    "click .work-item": "OnWorkItemClick",
    "click .cb-material": "OnMaterialItemClick",
    "click .cb-material-all": "OnGroupMaterialItemClick",
    "click .btn-materials-editor": "OnOpenMaterialsEditorClick",
    "click .btn-close-materials-editor": "OnCloseMaterialsEditorClick"
  },

  /**
   * Инициализация
   **/
  initialize: function() {
    this.cur_work_item = null;
    // Отрисовка форм
    this.render();
    // глобальное событие выхода из режима редактирования
    Backbone.on(
      "global:on_material_edit_cancel",
      this.OnCloseMaterialsEditorClick,
      this
    );
  },

  /**
   *  Рендеринг данных
   **/
  render: function() {
    // отрисовка работ
    this.RenderWorks(true);
    // отрисовка материалов
    this.RenderMaterials(false, false, null);
  },

  /**
   *  Рендеринг работ
   **/
  RenderWorks: function(is_collapsed) {
    this.$el
      .find(".works-data-body")
      .html(this.templates.works_data(App.DataWorks));
  },

  /**
   *  Рендеринг материалов
   **/
  RenderMaterials: function(is_collapsed, show_only_checked, materials) {
    var data_materials = App.DataMaterials;
    if (show_only_checked) {
      if (!materials || materials.length == 0) data_materials = null;
      else {
        data_materials = [];
        for (var i in App.DataMaterials)
          if (materials.indexOf(App.DataMaterials[i]["material_id"]) > -1)
            data_materials.push(App.DataMaterials[i]);
      }
    }

    this.$el
      .find(".materials-data-body")
      .html(this.templates.materials_data(data_materials));

    // отметка на форме необходимых материалов
    if (materials && materials.length > 0)
      for (var m in materials) {
        var material_id = materials[m];
        var cur_material_item = this.$el.find(
          '.cb-material[data-id="' + material_id + '"]'
        );
        $(cur_material_item).prop("checked", true);

        var container = $(cur_material_item)
          .parents("ul:first")
          .parents("li:first");
        // если все материалы в группе выбраны, то и группу надо поместить как выбранную
        var all_materials_checked =
          $(container).find(".cb-material:checked").length > 0;
        $(container)
          .find(".cb-material")
          .each(function(i) {
            if (!$(this).prop("checked")) all_materials_checked = false;
          });
        $(container)
          .find(".cb-material-all")
          .prop("checked", all_materials_checked);
      }

    if (is_collapsed)
      this.$el
        .find(".materials-data-body")
        .find("input.li")
        .prop("checked", true);
  },

  /**
   *  Раскрытия гурпп
   **/
  OnCollapse: function(e) {
    var cur_btn = $(e.currentTarget);
    if (cur_btn.val() == "collapsed") {
      cur_btn
        .val("unCollapsed")
        .html("&nbsp;&nbsp;Закрыть группы")
        .prepend('<i class = "icon-folder-open"></i>');
      if ($(cur_btn).data("type") == "works")
        this.$el
          .find(".works-data-body")
          .find("input.li")
          .prop("checked", true);
      else
        this.$el
          .find(".materials-data-body")
          .find("input.li")
          .prop("checked", true);
    } else {
      cur_btn
        .val("collapsed")
        .html("&nbsp;&nbsp;Расскрыть группы")
        .prepend('<i class = "icon-folder-close"></i>');
      if ($(cur_btn).data("type") == "works")
        this.$el
          .find(".works-data-body")
          .find("input.li")
          .prop("checked", false);
      else
        this.$el
          .find(".materials-data-body")
          .find("input.li")
          .prop("checked", false);
    }
  },

  /**
   *  Скрыть/ показать материалы
   **/
  OnVisible: function(e) {
    var cur_btn = $(e.currentTarget);
    if (cur_btn.val() == "show") {
      cur_btn
        .val("hide")
        .html("&nbsp;&nbspСкрыть не выбранные")
        .prepend('<i class = "fa fa-eye"></i>');
    } else {
      cur_btn
        .val("show")
        .html("&nbsp;&nbsp;Показать не выбранные")
        .prepend('<i class = "fa fa-eye-slash"></i>');
      // скрыть не выбранные
    }
    this.RenderMaterials(
      this.$el.find(".btn-collapse-materials").val() == "unCollapsed",
      this.$el.find(".btn-show").val() == "show",
      this.cur_work_item ? this.cur_work_item["work_materials"] : null
    );
  },

  /**
   *  Клик по элементу работы
   **/
  OnWorkItemClick: function(e) {
    var cur_item = $(e.currentTarget);
    var cur_item_id = $(cur_item).data("id");
    this.$el.find(".work-item").removeClass("sel");
    $(cur_item).addClass("sel");

    // Поиск работы в списке данных
    for (var i in App.DataWorks) {
      if (App.DataWorks[i]["work_id"] == cur_item_id) {
        this.cur_work_item = App.DataWorks[i];
        var materials = this.cur_work_item["work_materials"];
        this.$el.find(".cb-material").prop("checked", false);
        this.$el.find(".cb-material-all").prop("checked", false);

        // если выбрана опция скрывать не выбранные материалы, то необходимо отфильтровать данные и
        // форму отрендерить заново
        if (this.$el.find(".btn-show").val() == "show") {
          this.RenderMaterials(
            this.$el.find(".btn-collapse-materials").val() == "unCollapsed",
            this.$el.find(".btn-show").val() == "show",
            materials
          );
        } else if (materials && materials.length > 0) {
          // отметка на форме необходимых материалов
          for (var m in materials) {
            var material_id = materials[m];
            var cur_material_item = this.$el.find(
              '.cb-material[data-id="' + material_id + '"]'
            );
            $(cur_material_item).prop("checked", true);

            var container = $(cur_material_item)
              .parents("ul:first")
              .parents("li:first");
            // если все материалы в группе выбраны, то и группу надо поместить как выбранную
            var all_materials_checked =
              $(container).find(".cb-material:checked").length > 0;
            $(container)
              .find(".cb-material")
              .each(function(i) {
                if (!$(this).prop("checked")) all_materials_checked = false;
              });
            $(container)
              .find(".cb-material-all")
              .prop("checked", all_materials_checked);
          }
        }
        break;
      }
    }
  },

  /**
   *  Клик по группе материалов
   **/
  OnGroupMaterialItemClick: function(e) {
    var self = this;
    var group_item = $(e.currentTarget);
    var container = $(group_item).parents("li:first");
    $(container)
      .find(".cb-material")
      .each(function(i) {
        $(this).prop("checked", !group_item.prop("checked"));
        $(this).click();
      });
  },

  /**
   *  Клик по элементу материала
   **/
  OnMaterialItemClick: function(e) {
    var cur_item = $(e.currentTarget);
    var material_id = $(cur_item).data("id");
    // выполнение действий
    if (this.cur_work_item) {
      var materials = [];
      var works = [];
      var cur_material_item = null;

      for (var i in App.DataMaterials) {
        if (App.DataMaterials[i]["material_id"] == material_id) {
          cur_material_item = App.DataMaterials[i];
          break;
        }
      }

      // если поставили флаг
      if ($(cur_item).prop("checked")) {
        // формирование материалов для работы
        if (this.cur_work_item["work_materials"])
          this.cur_work_item["work_materials"].push($(cur_item).data("id"));
        else this.cur_work_item["work_materials"] = [$(cur_item).data("id")];
        materials = this.cur_work_item["work_materials"];

        // формирование работ для материала
        if (cur_material_item["material_works"])
          cur_material_item["material_works"].push(
            this.cur_work_item["work_id"]
          );
        else
          cur_material_item["material_works"] = [this.cur_work_item["work_id"]];
        works = cur_material_item["material_works"];
      } else {
        // формирование материалов для работы
        if (this.cur_work_item["work_materials"]) {
          for (var i in this.cur_work_item["work_materials"])
            if (
              this.cur_work_item["work_materials"][i] != $(cur_item).data("id")
            )
              materials.push(this.cur_work_item["work_materials"][i]);
          this.cur_work_item["work_materials"] = materials;
        }

        // формирование работ для материала
        if (cur_material_item["material_works"]) {
          for (var i in cur_material_item["material_works"])
            if (
              cur_material_item["material_works"][i] !=
              this.cur_work_item["work_id"]
            )
              works.push(cur_material_item["material_works"][i]);
          cur_material_item["material_works"] = works;
        }
      }

      var data_to_save = {
        work: { _id: this.cur_work_item["work_id"], materials: materials },
        material: { _id: $(cur_item).data("id"), works: works }
      };

      Routine.showLoader();
      $.ajax({
        type: "PUT",
        url: "/handlers/conformity/savedata",
        data: JSON.stringify(data_to_save),
        timeout: 35000,
        contentType: "application/json",
        dataType: "json",
        async: true
      })
        .done(function(result) {
          Routine.hideLoader();
          if (result["status"] == "ok") {
            // обновление формы
            //$.jGrowl('Данные успешно сохранены .', { 'themeState':'growl-success', 'sticky':false });
          } else {
            $.jGrowl(
              "Ошибка сохранения данных. Подробности: " + result["msg"],
              { themeState: "growl-error", sticky: false }
            );
          }
        })
        .fail(function(jqXHR, textStatus, errorThrown) {
          $.jGrowl("Ошибка сохранения данных. Подробности:" + errorThrown, {
            themeState: "growl-error",
            sticky: false
          });
          Routine.hideLoader();
        });
    }
  },

  /**
   ** Обработка события клика на кнопку отображения формы редактирования материалов
   **/
  OnOpenMaterialsEditorClick: function(e) {
    this.$(".btn-collapse-materials").hide();
    this.$(".btn-show").hide();
    this.$(".btn-materials-editor").hide();
    this.$(".btn-close-materials-editor").show();
    this.$(".materials-data-body").hide();
    this.$(".materials-data-editor").show();
  },

  /**
   ** Обработка события клика на кнопку закрытия формы редактирования материалов
   **/
  OnCloseMaterialsEditorClick: function(e) {
    this.$(".btn-collapse-materials").show();
    this.$(".btn-show").show();
    this.$(".btn-materials-editor").show();
    this.$(".btn-close-materials-editor").hide();
    this.$(".materials-data-body").show();
    this.$(".materials-data-editor").hide();
  }
});
