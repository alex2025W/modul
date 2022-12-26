// Модель элемента шаблона спецификации
App.Models.TemplateItemModel = Backbone.Model.extend({
  defaults: {
    _id: null,
    note: "",
    code: null
  }
});
// Модель элемента материала спецификации
// 0 - В расчете; 1 - Согласовано; 2 - Отклонено; 3 - На согласовании; 4 - Не определено; 5 - Требуется
App.Models.SpecificationMaterialItemModel = Backbone.Model.extend({
  defaults: {
    _id: null,
    materials_id: null,
    materials_key: "",
    materials_name: "",
    materials_group_name: "",
    materials_group_id: null,
    materials_group_key: "",
    materials_unit_pto: "",
    materials_global_code: "",
    status: null, // текущий статус
    prev_status: null, // предыдущий статус
    pto_size: null, // объем, проставленный пользователем
    unique_props_info: null,
    allowance: null, // допуск
    note: "", // примечание
    sector_routine: null, // направление
    sector_number: null,
    sector_id: null,
    sector_name: "",
    category_routine: null, // раздел
    category_number: null,
    category_id: null,
    category_name: "",
    group_number: null, // группа
    group_routine: null,
    group_id: null,
    group_name: "",
    purchase_status: "",
    purchase_user_email: "",
    purchase_date_confirm: null,
    purchase_statuses: [],
    statuses: []
  }
});

// Модель элемента справочника материалов
App.Models.MaterialsDataItemModel = Backbone.Model.extend({
  defaults: {
    full_key: "",
    full_key_id: "",
    material_group_id: null,
    material_group_code: null,
    material_group_name: "",
    material_id: null,
    material_code: null,
    material_name: "",
    material_type: "",
    material_global_code: null,
    material_unit_pto: "",
    //'prop_name': '',
    //'prop_key': null,
    //'prop_global_code': null,
    sector_routine: null, // направление
    sector_number: null,
    sector_id: null,
    sector_name: "",
    category_routine: null, // раздел
    category_number: null,
    category_id: null,
    category_name: "",
    group_number: null, // группа
    group_routine: null,
    group_id: null,
    group_name: "",
    in_calculate: false,
    linked_materials: null,
    is_active: 0 // активность материала (0-отключен, 1- активный)
  }
});

//------------FILTERS--------------------------
App.Models.FilterGroupItem = Backbone.Model.extend({
  defaults: {
    selected: false
  }
});
App.Models.FilterCategoryItemModel = Backbone.Model.extend({
  defaults: {
    selected: false
  },
  initialize: function() {
    this.set(
      "items",
      new App.Collections.FilterGroupCollection(this.get("items"))
    );
  }
});
App.Models.FilterSectorItemModel = Backbone.Model.extend({
  defaults: {
    selected: false
  },
  initialize: function() {
    this.set(
      "items",
      new App.Collections.FilterCategoryCollection(this.get("items"))
    );
  }
});
