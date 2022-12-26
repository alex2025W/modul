// Модель материала
App.Models.MaterialItemModel = Backbone.Model.extend({
  idAttribute: "_id",
  defaults: {
    _id: "",
    group_code: "",
    code: "", // Код материала
    name: "", // Наименование
    price: 0, // Цена
    price_date: "", // Дата цены
    unit_purchase: "", // Ед. измерения закупок
    unit_purchase_value: 0, // Значение Ед. измерения закупок
    unit_pto: "", // Ед. измерения ПТО
    unit_pto_value: 0, // Значение Ед. измерения ПТО
    out_sector_id: null, // Выпускающий участок
    calculation: 0, //
    manufact_sector_id: null, // Участок-изготовитель
    sku_name: "", // Название ЕСХ
    sku_pto_proportion: 0, // Пропорция ЕСХ к объёму ПТО
    is_active: 1, // 1-активно, 0 - не аквтиано
    delivery_size: 0, // Объём поставки
    delivery_time_min: 0, // Минимальный срок поставки(раб.дн)
    delivery_time_max: 0, // Макисмальный срок поставки (раб. дн.)
    delivery_price: 0, // Стоимость доставки (руб.)
    note: "", // Пометка
    tech_using: "", // Технологическге применение
    unique_props: [], // индивидуальные характеристики
    tags: [],
    labels: [], // иерархические метки
    linked_materials: [], // список прилинкованных материалов
    global_code: "0",
    last_goods: {
      price: 0,
      date: "",
      account: "",
      account_type: "",
      good_code_1c: "",
      coef_si_div_iu: 0
    }
  },
  initialize: function() {},
  parse: function(data) {
    // приведение индивидуальных харакетристик к формату коллекции
    data["unique_props"] = new App.Collections.UniquePropsCollection(
      data["unique_props"]
    );
    // приведение прилинкованных материалов к формату коллекции
    data["linked_materials"] = new App.Collections.LinkedMaterialsCollection(
      data["linked_materials"]
    );
    return data;
  }
});

// модель уникальной характеристики
App.Models.UniquePropItemModel = Backbone.Model.extend({
  defaults: {
    _id: "",
    name: "",
    key: "",
    is_active: true,
    type: "prop",
    global_code: "",
    items: [],
    norm_price: 0,
    last_goods: {
      price: 0,
      date: "",
      account: "",
      account_type: "Установлено на INT для хар-ки",
      good_code_1c: "",
      coef_si_div_iu: 1,
      user: ""
    }
  }
});

// модель прилинкованного материала
App.Models.LinkedMaterialItemModel = Backbone.Model.extend({
  //idAttribute: "material_id",
  defaults: {
    material_id: null,
    group_id: null,
    code: null,
    group_code: null,
    volume: 0,
    group_name: "",
    name: "",
    unit_pto: "",
    have_errors: false
  }
});
