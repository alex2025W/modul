///
/// Моделли-------------------------------------------------------------------------------------------------
///
// Модель материала
App.Models.MaterialItemModel = Backbone.Model.extend({
  idAttribute: "_id",
  defaults: {
      "_id":"",
      "group_code":"",
      "code" : "",                                            // Код материала
      "name" : "",                                          // Наименование
      "price" : 0,                                             // Цена
      "price_date" : "",                                 // Дата цены
      "unit_purchase" : "",                          // Ед. измерения закупок
      "unit_purchase_value" : 0,              // Значение Ед. измерения закупок
      "unit_pto" : "",                                       // Ед. измерения ПТО
      "unit_pto_value" : 0,                           // Значение Ед. измерения ПТО
      "out_sector_id" : null,                         // Выпускающий участок
      "calculation" : 0,                                   //
      "manufact_sector_id" : null,             // Участок-изготовитель
      "sku_name" : "",                                   // Название ЕСХ
      "sku_pto_proportion" : 0,                  // Пропорция ЕСХ к объёму ПТО
      "is_active" : 1,                                       // 1-активно, 0 - не аквтиано
      "delivery_size" : 0,                              // Объём поставки
      "delivery_time_min" : 0,                    // Минимальный срок поставки(раб.дн)
      "delivery_time_max" : 0,                   // Макисмальный срок поставки (раб. дн.)
      "delivery_price" : 0,                            // Стоимость доставки (руб.)
      "note" : "",                                               // Пометка
      "unique_props": [],                              // индивидуальные характеристики
  },
  initialize: function() {},
  parse: function(data) {
    // приведение индивидуальных харакетристик к формату коллекции
    data['unique_props'] = new App.Collections.UniquePropsCollection(data['unique_props']);
    return data;
  }
});

// модель уникальной характеристики
App.Models.UniquePropItemModel = Backbone.Model.extend({
  defaults: {
      "_id": "",
      "name":"",
      "key":"",
      "is_active": true,
      'type': 'prop'
    }
});

///
/// Коллекции-----------------------------------------------------------------------------------------------
///
// коллекция уникальных характеристик
App.Collections.UniquePropsCollection = Backbone.Collection.extend({
  model: App.Models.UniquePropItemModel
});

///
/// Представления-------------------------------------------------------------------------------------------
///
///
/// Представление формы поиска спецификации
///
App.Views.EditMaterialView = Backbone.View.extend({
  tagName:'div',
  className:'edit-material-box',
  Materials_Units: null, //  справочники единиц измерения
  sectors: null, // справочник участков
  uniquePropsListView: null, // представление списка индивидуальных характеристик материала
  templates: {
    main:_.template($("#editMaterialTemplate").html()),
  },

  /**
   * Инициализация
  **/
  initialize: function()
  {
    this.Materials_Units = this.options.Materials_Units;
    this.sectors = this.options.sectors;
    this.materials_groups = this.options.materials_groups;
    this.edit = this.options.edit;
  },

  /**
   * Присоедиение событий
  **/
  events:{
    'click .btn-save': 'onSaveClick',
    'click .btn-copy': 'onCopyClick',
  },

  /**
   * Удление представления
  **/
  unRender: function()
  {
    this.remove();
  },
   /**
   * Отрисовка элемента
  **/
  render: function () {
    var self = this;
    this.$el.html(this.templates.main($.extend({},this.model.toJSON(), {'sectors': this.sectors, 'materials_groups': this.materials_groups, 'edit': this.edit})));
    // навешивание масок на элементы ввода
    this.$('.is_money, .is_float').numeric({ negative: false, decimal: ',' });
    this.$('.is_int').numeric({ negative: false, decimal: false });
    this.$('.is_date').datepicker({
      format: "dd.mm.yyyy",
      weekStart: 1,
      todayHighlight: true,
      multidate: false,
      forceParse: false,
      language: "ru",
      // startDate: (tmpDays>0)?"+"+(tmpDays-1).toString()+"d": "-"+(Math.abs(tmpDays)-1).toString()+"d",
      // defaultDate: tmp_date,
    });
    // заполенние  Ед. измерения ПТО
    this.fill_unit_select('.tb_unit_pto', 'unit_pto');
    // заполенние  Ед. измерения закупок
    this.fill_unit_select('.tb_unit_purchase', 'unit_purchase');
    // заполенние  Название ЕСХ
    this.fill_unit_select('.tb_sku_name', 'sku_name');
    // индивидуальные характеристики
    this.uniquePropsListView = new App.Views.UniquePropsListView({'el': this.$('.unique-props-data-container'), 'collection': this.model.get('unique_props')})
    return this;
  },

  /**
  ** Заполнение выпадающего списка единиц измерения
  **/
  fill_unit_select: function(control, field_name){
    var dataSource = [];
    for(var i in this.Materials_Units[field_name])
    {
      var unit = this.Materials_Units[field_name][i];
      if(unit)
        dataSource.push({'id': unit, 'text': unit});
    }
    this.$(control).select2({
        data: dataSource,
        formatNoMatches: function () { return ""; },
        createSearchChoice:function(term, data) {
          if ($(data).filter(function() { return this.text.localeCompare(term)===0; }).length===0) {return {id:term, text:term};}
        }
      }
    );
    this.$(control).select2("val",this.model.get(field_name));
    /*$(this).on("change", function(e) {
        $(this).parents('.characters:first').find('input.tb-unique-props').val(e.val);
    })*/
  },

  /**
   ** Кнопка копирования материала
  **/
  onCopyClick: function(e){
    var self = this;
    var tmp_model = new App.Models.MaterialItemModel(JSON.parse(JSON.stringify(this.model)),{'parse':true});
    tmp_model.set('name', 'Копия ' + this.model.get('name'));
    tmp_model.set('_id', '');
    tmp_model.set('code', '');
    _.each(tmp_model.get('unique_props').models, function (item) {
      item.set('_id', '');
    });


      // сохранение данных
    Routine.showLoader();
    $.ajax({
      type: "PUT",
      url: "/handlers/conformity/save_material_info",
      timeout: 35000,
      data: JSON.stringify(tmp_model),
      contentType: 'application/json',
      dataType: 'json',
      async:true
      }).done(function(result) {
        if(result['status']=="ok")
        {
            $.jGrowl('В группу № ' + self.model.get('group_code').toString() + ' добавлен новый материал № ' + result['data']['code'].toString(), { 'themeState':'growl-success', 'sticky':true });
            // тригер событие о добавлении нового материала
            Backbone.trigger('global:on_material_save_complete',[self, 'add', result['data']]);
            // чистим форму после добавления материала
            self.model = new App.Models.MaterialItemModel(result['data'],{'parse':true});
            self.render();
        }
        else
          $.jGrowl('Ошибка копирования материала. Подробности: ' + result['msg'], {'themeState':'growl-error', 'sticky':false});
    }).error(function(jqXHR, textStatus, errorThrown ) {
        $.jGrowl('Ошибка копирования материала. Подробности: '+ errorThrown, { 'themeState':'growl-error', 'sticky':false });
    }).always(function(jqXHR, textStatus, errorThrown ) {
        Routine.hideLoader();
    });

  },

  /**
   ** Кнопка сохранения материала
  **/
  onSaveClick: function(e){
    var self = this;
    // проверка сохраняемых данных
    this.$('.err').removeClass('err');
    // название материала
    if(!this.$('.tb_name').val()){
      this.$('.tb_name').addClass('err');
      $.jGrowl('Необходимо заполнить название материала.', { 'themeState':'growl-error', 'sticky':false });
      return;
    }
    // группа материала
    if(!this.$('.ddl_group').val()){
      $.jGrowl('Необходимо заполнить группу материала.', { 'themeState':'growl-error', 'sticky':false });
      return;
    }
    // дата цены
    if(!this.$('.tb_price_date').val() || !Routine.isValidDate(this.$('.tb_price_date').val(), 'dd.mm.yyyy')){
      this.$('.tb_price_date').addClass('err');
      $.jGrowl('Неверный формат даты цены.', { 'themeState':'growl-error', 'sticky':false });
      return;
    }

    // сбор данных на сохранение
    this.model.set('group_code',Routine.strToInt(this.$('.ddl_group').val()));
    this.model.set('code',Routine.strToInt(this.$('.tb_code').val()));
    this.model.set('name',this.$('.tb_name').val());
    this.model.set('price', Routine.strToFloat(this.$('.tb_price').val()));
    this.model.set('price_date',this.$('.tb_price_date').val());
    this.model.set('unit_purchase',this.$('.tb_unit_purchase').select2('val'));
    this.model.set('unit_purchase_value',Routine.strToFloat(this.$('.tb_unit_purchase_value').val()));
    this.model.set('unit_pto',this.$('.tb_unit_pto').select2('val'));
    this.model.set('unit_pto_value',Routine.strToFloat(this.$('.tb_unit_pto_value').val()));
    this.model.set('out_sector_id',this.$('.ddl_out_sector').val());
    this.model.set('manufact_sector_id',this.$('.ddl_manufact_sector').val());
    this.model.set('sku_name',this.$('.tb_sku_name').select2('val'));
    this.model.set('sku_pto_proportion',Routine.strToFloat(this.$('.tb_sku_pto_proportion').val()));
    this.model.set('delivery_size',Routine.strToFloat(this.$('.tb_delivery_size').val()));
    this.model.set('delivery_time_min',Routine.strToFloat(this.$('.tb_delivery_time_min').val()));
    this.model.set('delivery_time_max',Routine.strToFloat(this.$('.tb_delivery_time_max').val()));
    this.model.set('delivery_price',Routine.strToFloat(this.$('.tb_delivery_price').val()));
    this.model.set('note',this.$('.tb_note').val());
    this.model.set('is_active',(this.$('.cb_active').prop('checked')?1:0));

    // сохранение данных
    Routine.showLoader();
    $.ajax({
      type: "PUT",
      url: "/handlers/conformity/save_material_info",
      timeout: 35000,
      data: JSON.stringify(this.model),
      contentType: 'application/json',
      dataType: 'json',
      async:true
      }).done(function(result) {
        if(result['status']=="ok")
        {
          // обновление справочника единиц измерения
          self.update_units();
          if(!self.model.get('_id'))
          {
            $.jGrowl('В группу № ' + self.model.get('group_code').toString() + ' добавлен новый материал № ' + result['data']['code'].toString(), { 'themeState':'growl-success', 'sticky':true });
            // тригер событие о добавлении нового материала
            Backbone.trigger('global:on_material_save_complete',[self, 'add', result['data']]);
            // чистим форму после добавления материала
            self.model = new App.Models.MaterialItemModel({},{'parse':true});
            self.render();
          }
          else
          {
            $.jGrowl('Данные успешно сохранены.', {'themeState':'growl-success', 'sticky':false});
            // тригер событие о редактировании материала
            Backbone.trigger('global:on_material_save_complete',[self, 'edit', result['data']]);
            self.model = new App.Models.MaterialItemModel(result['data'],{'parse':true});
            self.render();
          }
        }
        else
          $.jGrowl('Ошибка сохранения информации о материале. Подробности: ' + result['msg'], {'themeState':'growl-error', 'sticky':false});
    }).error(function(jqXHR, textStatus, errorThrown ) {
        $.jGrowl('Ошибка сохранения информации о материале. Подробности: '+ errorThrown, { 'themeState':'growl-error', 'sticky':false });
    }).always(function(jqXHR, textStatus, errorThrown ) {
        Routine.hideLoader();
    });
  },

   /**
   ** обновление справочника единиц измерений
   * unit_pto
   * sku_name
   *  unit_purchase
  **/
  update_units: function()
  {
    if(this.model.get('unit_pto') && this.Materials_Units['unit_pto'].indexOf(this.model.get('unit_pto'))<0 )
        this.Materials_Units['unit_pto'].push(this.model.get('unit_pto'));
    if(this.model.get('sku_name') && this.Materials_Units['sku_name'].indexOf(this.model.get('sku_name'))<0 )
        this.Materials_Units['sku_name'].push(this.model.get('sku_name'));
    if(this.model.get('unit_purchase') && this.Materials_Units['unit_purchase'].indexOf(this.model.get('unit_purchase'))<0 )
        this.Materials_Units['unit_purchase'].push(this.model.get('unit_purchase'));
  }


});


///
/// Представление списка индивидуальных характеристик
///
App.Views.UniquePropsListView = Backbone.View.extend({
  events:{
    'click .btn-add-unique-prop': 'onAdd',
  },
  /**
   * Инициализация
  **/
  initialize: function()
  {
    this.collection.bind('remove', this.render, this);
    this.collection.bind('change', this.render, this);
    this.render();
  },
  /**
  * Отрисовка
  **/
  render: function()
  {
    // Очистка формы
    this.clear();
    var self = this;

    // максимальный ключ из существующего списка
    var index = 1;
    _.each(this.collection.models, function (item) {
      if(item.get('type')=='prop' && item.get('_id') && item.get('key')>index)
        index = item.get('key');
    });
    _.each(this.collection.models, function (item) {
        if(item.get('type')=='prop'){
          if(!item.get('_id'))
          {
            ++index;
            item.set('key', index,{'silent':true});
          }
          self.renderItem(item);
        }
    }, this);
    return this;
  },

  /**
   * Отрисовка элемента
  **/
  renderItem: function (item) {
    var itemView = new App.Views.UniquePropsItemView({model: item});

    if(item.get('is_active'))
      this.$el.find('#tab-active-props').find('.data-list').append(itemView.render().el);
    else
      this.$el.find('#tab-not-active-props').find('.data-list').append(itemView.render().el);
  },

  /**
   * Очистка формы
  **/
  clear: function()
  {
    this.$el.find('.data-list').empty();
  },

  /**
   * показать
  **/
  show: function()
  {
    this.$el.show();
  },

  /**
   * скрыть
  **/
  hide: function()
  {
    this.$el.hide();
  },

  /**
   ** Добавление
  **/
  onAdd: function(e)
  {
    this.collection.add(new App.Models.UniquePropItemModel());
    this.render();
  }
});

///
/// Представление элемента индивидуальной характеристики
///
App.Views.UniquePropsItemView = Backbone.View.extend({
  tagName:'tr',
  className:'list-item',
  templates: {
    item:_.template($("#uniquePropsItemTemplate").html()),
  },

  /**
   * Инициализация
  **/
  initialize: function()
  {
  },

  /**
   * Присоедиение событий
  **/
  events:{
    'click .btn-remove-unique-prop': 'onRemove',
    'click .btn-repair-unique-prop': 'onRepair',
    'change .tb_unique_prop_name': 'onChangeName',
    'change .cb_unique_prop_active': 'onActivate'
  },

  /**
   * Удление представления
  **/
  unRender: function()
  {
    this.remove();
  },

   /**
   * Отрисовка элемента
  **/
  render: function () {
    this.$el.html(this.templates.item(this.model.toJSON()));
    this.$el.removeClass('removed');
    //if(!this.model.get('is_active'))
    //     this.$el.addClass('removed');
    return this;
  },

  /**
   * Обработка клика на элемент
  **/
  onClickItem: function () {
  },

  /**
  ** Удаление элемента
  **/
  onRemove: function(e){
    if(!this.model.get('_id'))
      this.model.destroy();
    else
      this.model.set('is_active', false);
    //this.render();
  },

  /**
  ** ВОсстановление элемента
  **/
  onRepair: function(e){
    this.model.set('is_active', true);
    //this.render();
  },

  /**
  ** Обработка смены названия
  **/
  onChangeName: function(e){
    this.model.set('name', this.$('.tb_unique_prop_name').val());
  },

  /**
  ** Обработка флага активности
  **/
  onActivate: function(e){
    this.model.set('is_active', this.$('.cb_unique_prop_active').prop('checked'));
  }
});




