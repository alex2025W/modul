///
/// Панель управления на форме
///
App.Views.ControlPanelView = Backbone.View.extend({
  el: $("#controlPanel"),
  events:{
    'click #btn_open_specification': 'onOpen',
    'keypress .tb-spec-number': 'pressSpecSearchKey',
    'click .btn-save-specification': 'onSaveSpecification',
    'click .btn-collapse': 'OnCollapse',
    'click .btn-calculate-specification': 'onSpecificationCalculate',
    'change .ddl-save-type': 'onChangeSaveType',
    'click #cb-only-options': 'onShowOnlyOptions'
  },
  specificationInfo: null,                         // информация о спецификации
  queue: null,                                            // объект для выполнения операции в бэкграунде
  specification_changed: false,        // флаг отслеживания изменения спецификации
  is_read_mode: false,                        // режим отображения данных(просмотр/редактирование)
  selectedModels:[],                             // список выбранных моделей в фильтре
  filterBoxView: null,   // представление блока филтрации для свойств модели

  /**
   * Инициализация
  **/
  initialize: function()
  {
    var self = this;
    this.specification_changed = false;
    this.specificationInfo = null;
    // глобальное событие смены параметра конфигурации
    // необходимо, чтобы лочить кнопки панели управления
    Backbone.on("global:change_config_param",this.onGlobalChangeConfigParam,this);
    // глобальное событие на очистку данных
    Backbone.on("global:clear",this.onGlobalClear,this);
    // глобальное событие на смену страницы в пейджере
    Backbone.on("pager:change_page",this.onChangePage,this);
    // глобальное событие на выбор конкретной спецификации из списка
    Backbone.on("specificationlist:select_item",this.onSpecificationSelectItem,this);
    // глобальное событие смены таба
    Backbone.on("global:on_show_tab",this.onChangeTab,this);
  },

  /**
   * Обработка глобавльного события смены таба(отображение/редактирование)
  **/
  onChangeTab: function(e, val)
  {
      var tab_number = e[1];

      // скрыть контролы управления,
      this.$el.find('.edit-view').hide();
      switch(tab_number.toString()){
        case "1": // редактирование
          // если конфигурация еще не строилась, то строим ее
          if(!App.DataViewSpecificationBuilder.data)
            this.doOpen(this.$el.find('.tb-spec-number').val(), true);
          else
            this.$el.find('.edit-view').show();
        break;
        case "2": // просмотр
        break;
        case "3": // входит в
        break;
        default:
        break;
      }
  },

  /**
   *  Обработка события смены страницы в пейджере
  **/
  onChangePage: function(e)
  {
    // вызов события обновления URL адреса
    Backbone.trigger('global:on_url_params_change',[this, 'list', e[1], true]);
  },

  /**
   *  Обработка события выбора конкретной спецификации из списка
  **/
  onSpecificationSelectItem: function(e)
  {
    // var row = e[0].model;
    // отправление событие на смену URL адреса
    // App.doQuery("number/"+row.get('number')+"/tab/2/optional/true");
  },

  /**
   * Вызов функции получения данных о спецификациях по странице
   * model - код модели
   * model_properties - выбранные свойства модели
  **/
  loadList:function(page, selected_model, selected_model_properties, selected_parent_model, selected_parent_model_properties, show_product_types, need_rebuild_filters, clear_list)
  {
    var clear_list = clear_list || false;
    // показываем форму отображения списка спецификаций
    App.SpecificationListView.show();
    $("#tab-view-specification-list-container").show();

    App.DataPanelView.hide();
    // ограничить панель простым видом
    this.ShowSimpleView();
    // прелоадер
    Routine.showLoader();
    // обновление выбранных фильтров
    var sel_filters = this.filterBoxView.rebuildFilters(selected_model, selected_model_properties, selected_parent_model, selected_parent_model_properties, show_product_types, need_rebuild_filters);
    // подгрузка и отображение данных
     $.ajax({
        type: "POST",
        url: "/handlers/esudspecification/get_list/" + page,
        data: JSON.stringify({'model_number':selected_model, 'filters': sel_filters['model'], 'parent_model_number': selected_parent_model, 'parent_model_sel_filters': sel_filters['parent_model'], 'show_product_types': show_product_types}),
        timeout: 55000,
        contentType: 'application/json',
        dataType: 'json',
        async:true
    }).done(function(result) {
      if(result['status']=="error")
        $.jGrowl(result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      else
      {
          // количество спецификаций всего
          var count = Routine.strToFloat(result['count']);
          // заполнение коллекции спецификаций и построение формы
          App.SpecificationListCollection = new App.Collections.SpecificationItemsCollection(result['data'],{parse: true});
          App.SpecificationListView.render(App.SpecificationListCollection, page, count, clear_list);
      }
    }).error(function(){
        $.jGrowl('Ошибка загрузки списка спецификаций. Повторите попытку. ', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
    }).always(function(){Routine.hideLoader();});
  },

  /**
   * Обработка кнопки открытия конфиуграции/спецификации
  **/
  onOpen:function(e)
  {
    var number = this.$el.find('.tb-spec-number').val();
    if(number)
      App.doQuery("number/"+number+"/tab/2/optional/true");
    else
      $.jGrowl('Не задан артикул конфигурации/спецификации .', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
  },

  /**
   * Показывать только опции
  **/
  onShowOnlyOptions:function(e)
  {
    var self = this;
    $('body').addClass('wait');
    setTimeout( function(){
      Backbone.trigger('global:on_url_params_change',[self, 'optional', self.$el.find("#cb-only-options").prop('checked').toString()]);
      Backbone.trigger('global:show_only_options',[self, self.$el.find("#cb-only-options").prop('checked')]);
    },100);
  },

  /**
   *  Проверка нажатой клавиши в поле ввода номера конфигурации/спейификации
  **/
  pressSpecSearchKey: function(e)
  {
    if(e.keyCode==13)
      this.onOpen();
  },

  /**
   * Вызов функции получения данных о конфигурации/спецификации
  **/
  doOpen:function(number, is_edit)
  {
    var is_edit = is_edit || false;
    var self = this;
    this.specification_changed = false;
    this.specificationInfo = null;
    App.currentItemNumber = number;

    // Показываем форму построения спецификации
    App.DataPanelView.show();
    App.SpecificationListView.hide();
    $("#tab-view-specification-list-container").hide();
    // приводим основную панель к полному виду
    this.ShowFullView();
    // приводим основную панель данных в исходное состояние
    App.DataPanelView.refresh();

    if(!number)
    {
      $.jGrowl('Не задан артикул конфигурации/спецификации.', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
      Backbone.trigger('global:clear',[this]);
      return;
    }

    this.$el.find('.tb-spec-number').val(number);
     var num_items = number.split('.');
     if(num_items.length<2 || num_items.length>3)
    {
      $.jGrowl('Указан неверный артикул. Проверьте артикул и повторите попытку. ', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
      Backbone.trigger('global:clear',[this]);
      return;
     }

     // выбор заданного таба на отображение
     var cur_tab = App.UrlParams['tab'].toString();

     // если открывается спецификация, то подгрузка конфигурации не требуется, иначе необходима подгрузка конфигурации
     if(App.getObjectTypeByNumber(number) == 'specification' && !is_edit && cur_tab!="1")
     {
      // подгрузка информации о спецификации
      $.ajax({
          type: "GET",
          url: "/handlers/esudspecification/get/" + number,
          timeout: 35000,
          contentType: 'application/json',
          dataType: 'json',
          async:true
       }).done(function(result) {
        if(result['status']=="error")
          $.jGrowl(result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 10000 });
        else
        {
          App.DataViewSpecificationBuilder.clear();
          // Заголовок с информацией о конфигурации/спецификации
          App.ProductInfoView.render(new App.Models.ItemModel(result["data"]));
          // флаг отображения только опциональных свойств
          var show_only_options = ((App.UrlParams['optional'].toString()=="true")?true:false);
          self.$el.find("#cb-only-options").prop('checked', show_only_options);
          // отображение спецификации
          App.DataViewSpecificationViewer.prepare_and_build(result.data, show_only_options);
          // отображение родителей первого уровня спецификации
          App.SpecificationParentsListCollection = new App.Collections.SpecificationItemsCollection(result['parents'],{parse: true});
          App.SpecificationParentsListView.render(App.SpecificationParentsListCollection, 1, 1);
           // отображение истории по спецификации
          App.SpecificationHistoryCollection = new App.Collections.SpecificationHistoryItemsCollection(result['data']['history'],{parse: true});
          App.SpecificationHistoryView.render(App.SpecificationHistoryCollection);
          // отображение технологической карты
          //App.TechnoMapView.render(result['techno_map']);
          App.DataPanelView.render_techno_map(result['techno_map']);

          self.$el.find('.pnl-note').show();
          App.DataPanelView.show_specification_tab(true);
          // показать поле ввода комментария для спецификации
          self.$el.find('.pnl-note').show().find(".tb-note").val( ('note' in result.data)?result.data['note']:'' );
          // название спецификации
          self.$el.find(".tb-specification-name").val(result.data['name']);

          Backbone.trigger('global:collapse',[self, true, null]);
          App.DataPanelView.select_tab(cur_tab);
          // корневой узел спецификации
          self.specificationInfo = result.data;
          App.SpecificationInfo = result.data;
          // если идет изменение спецификации, то необходимо показать выбор типа сохранения спецификации
          self.$el.find('.ddl-save-type').val("");
          self.$el.find('.btn-calculate-specification').hide();
          if(self.specificationInfo)
          {
            self.$el.find('.ddl-save-type').show();
            self.$el.find('.btn-calculate-specification').show();
          }
          else
          {
            self.$el.find('.ddl-save-type').hide();
            self.$el.find('.btn-calculate-specification').hide();
          }
          self.enable(true);

          // получение расчетов по спецификации
           self.getCalculationData(number);

        }
       }).error(function(){
          $.jGrowl('Ошибка загрузки данных. Повторите попытку. ', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
       }).always(function(){Routine.hideLoader();});
     }
     else
     {
      // запуск задания на рассчет спецификации
      Routine.showProgressLoader(10);
      this.queue = new Queue({
          task_key: "calculate_specification",
          params: {'number':number},
          complete: this.onQueueComplete.bind(this),
      });
      this.queue.run();
    }
  },

  getCalculationData: function(number){
    var self = this;
    // запуск процедуры подгрузки рассчетом по спецификации
    $.ajax({
        type: "GET",
        url: "/handlers/esudspecification/get_calculation_cache/" + number,
        timeout: 35000,
        contentType: 'application/json',
        dataType: 'json',
        async:true
     }).done(function(result) {
      if(result['status']=="error")
        $.jGrowl(result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      else if(!result || result['status'] == 'in_process')
      {
        // повторный вызов функции через секунду
        setTimeout(function(){self.getCalculationData(number)}, 5000);
      }
      else if(!result['status'] || result['status'] =='ok' ||  result['status'] =='success')
      {
        // считаем что получили результат
        //console.log(JSON.parse(result));
        var result = JSON.parse(result)
        // отрисовка покупных объектов
        App.DataViewBuyItems.init_data(result.data['buy_items']);
        App.DataViewBuyItems.render();
        // отрисовка объектов собственного производства
        App.DataViewOwnItems.render(result.data['own_items'], result.data['sorted_sectors']);
      }
    }).error(function(e){
        console.log(e);
        $.jGrowl('Ошибка загрузки расчетов по спецификации. Повторите попытку. ', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
     }).always(function(){});
  },

  /**
   * Обработка глобального события завершения выполнения задания в очереди
  **/
  onQueueComplete: function(queue, task_key, result)
  {
    var self = this;
    Routine.hideLoader();
    if(result['status'] == 'error')
      $.jGrowl(result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 10000 });
    else
    {
      result = result['data'];
      if(!result)
      {
        Backbone.trigger('global:clear',[self]);
        $.jGrowl('Ошибка получения данных.', {'themeState':'growl-error', 'sticky':false, life: 10000 });
        return;
      }
      switch(task_key){
        case "calculate_specification": // расчет спецификации
           // Заголовок с информацией о конфигурации/спецификации
          App.ProductInfoView.render(new App.Models.ItemModel(((result.specification_info)?result.specification_info: result.product_info)));
          // флаг отображения только опциональных свойство
          var show_only_options = ((App.UrlParams['optional'].toString()=="true")?true:false);
          this.$el.find("#cb-only-options").prop('checked', show_only_options);
          // дерево конфигурации
          if (!result.config_data)
          {
            $.jGrowl('Не удалось построить указанную конфигурацию.', {'themeState':'growl-error', 'sticky':false, life: 10000 });
            return;
          }
          App.DataViewSpecificationBuilder.prepare_and_build(result.config_data, result.specification_data, show_only_options);
          // отображение родителей первого уровня спецификации
          App.SpecificationParentsListCollection = new App.Collections.SpecificationItemsCollection(result['parents'],{parse: true});
          App.SpecificationParentsListView.render(App.SpecificationParentsListCollection, 1, 1);
          // отображение технологической карты
          //App.TechnoMapView.render(result['techno_map'])
          App.DataPanelView.render_techno_map(result['techno_map']);
          // отображение спецификации
          App.DataViewSpecificationViewer.prepare_and_build(result.specification_data, show_only_options);
          // если есть данные о спецификации, то показываем необходимый таб
          //App.DataPanelView.change_position("350");
          this.$el.find('.pnl-note').show();
          if(result.specification_data)
          {
            // отображение истории по спецификации
            App.SpecificationHistoryCollection = new App.Collections.SpecificationHistoryItemsCollection(result['specification_data']['history'],{parse: true});
            App.SpecificationHistoryView.render(App.SpecificationHistoryCollection);

            App.DataPanelView.show_specification_tab(true);
            // показать поле ввода комментария для спецификации
            this.$el.find('.pnl-note').show().find(".tb-note").val( ('note' in result.specification_data)?result.specification_data['note']:'' );
            // поле ввода названия спецификации
            this.$el.find(".tb-specification-name").val(result.specification_data['name']);

            Backbone.trigger('global:collapse',[this, true, null]);
            // получение расчетов по спецификации
            self.getCalculationData(result.specification_data['number']);
            //App.DataPanelView.change_position("480");
          }
          else{
            self.$el.find(".tb-specification-name").val(result.config_data['node']['name']);
          }

          // выбор заданного таба на отображение
          var cur_tab = App.UrlParams['tab'].toString();
          if(cur_tab!="2" || (cur_tab=="2" && !result.specification_data))
            cur_tab = "1";
          else
            cur_tab = "2";
          App.DataPanelView.select_tab(cur_tab);

          // корневой узел спецификации
          self.specificationInfo = result.specification_info;
          App.SpecificationInfo = result.specification_info;
          // если идет изменение спецификации, то необходимо показать выбор типа сохранения спецификации
          this.$el.find('.ddl-save-type').val("");
          this.$el.find('.btn-calculate-specification').hide();
          if(self.specificationInfo)
          {
            self.$el.find('.ddl-save-type').show();
            self.$el.find('.btn-calculate-specification').show();
          }
          else
          {
            self.$el.find('.ddl-save-type').hide();
            self.$el.find('.btn-calculate-specification').hide();
          }
          this.enable(true);
        break;
        case "save_specification": // сохранение спецификации
          $.jGrowl('Спецификация № '+result['specification_info']['number']+'  успешно сохранена.', { 'themeState':'growl-success', 'sticky':true });

          self.doOpen(result['specification_info']['number'], false);
          /*self.$el.find('.btn-calculate-specification').show();
          App.SpecificationInfo = result.specification_info;
          // отображение спецификации
          App.DataViewSpecificationViewer.prepare_and_build(result.specification_data);
          // обновление информации о спецификации в заголовке
          App.ProductInfoView.render(new App.Models.ItemModel(result.specification_info));*/
        break;
      }
    }
  },

  /**
   * Обработка глобавльного события очистки данных
  **/
  onGlobalClear: function()
  {
    this.enable(false);
    this.$el.find('.ddl-save-type').val("");
  },

  /**
   * Активировать/деактивировать панель управления
  **/
  enable: function(val)
  {
    this.$el.find('.btn-save-specification, .btn-collapse, .ddl-save-type').prop('disabled', !val);

    // если идет активация, то необходимо проверить, по какому объекту идет расчет. Если расчет идет по спецификации,
    // то нельзя сохранить пока не будет выбран тип сохранения
    if(this.specificationInfo)
    {
      if(this.$el.find('.ddl-save-type').val()=="")
        this.$el.find('.btn-save-specification').prop('disabled', true);
    }
  },

  /**
   *  Событие смены типа сохранения
  **/
  onChangeSaveType: function(e)
  {
    if(this.$el.find('.ddl-save-type').val()=="")
        this.$el.find('.btn-save-specification').prop('disabled', true);
    else
      this.$el.find('.btn-save-specification').prop('disabled', false);
  },

  /**
   *  Событие смены параметра конфигурации
  **/
  onGlobalChangeConfigParam: function(e)
  {
    this.$el.find('.btn-calculate-specification').hide();
    this.specification_changed = true;
  },

  /**
   * Событие на кнопку сохранения спецификации
  **/
  onSaveSpecification:function(e)
  {
    var self = this;
    // если идет сохранение новой спецификации на базе существующей, то необходимо проверить
    // что комментарий был изменен
    /*if(self.$el.find('.ddl-save-type').val()=="new" &&  this.specificationInfo['note'] == this.$el.find(".tb-note").val())
    {
      $.jGrowl('Создаётся новая спецификация. Требуется изменить примечание.', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
      return;
    }*/

    // не может быть пустого названия спецификации
    if(!this.$el.find(".tb-specification-name").val())
    {
      $.jGrowl('Задайте название для спецификации.', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
      return;
    }
    // если редактировали спецификацию
    if(this.specificationInfo && this.$el.find('.ddl-save-type').val() == "edit")
      bootbox.confirm("Спецификация: "+this.specificationInfo['number']+" будет изменена. Хотите продолжить?", function(result)
      {
        if(result)
          self.saveSpecification();
      });
    else
      this.saveSpecification();
  },

   /**
   * Вызов функции сохранения спецификации
  **/
  saveSpecification:function()
  {
    var self = this;
    $('body').addClass('wait');
    setTimeout(function(){
      var data_to_save = App.DataViewSpecificationBuilder.validate_and_get_data();
      $('body').removeClass('wait');
      if(data_to_save)
      {
        // сохранение комента для спецификации
        data_to_save['note'] = self.$el.find(".tb-note").val();
        data_to_save['name'] = self.$el.find(".tb-specification-name").val();
        data_to_save['node']['name'] = self.$el.find(".tb-specification-name").val();
        Routine.showProgressLoader(10);
        self.queue = new Queue({
            task_key: "save_specification",
            params: {'data':data_to_save, 'specification_info': self.specificationInfo, 'save_type': self.$el.find('.ddl-save-type').val()},
            complete: self.onQueueComplete.bind(self),
        });
        self.queue.run();
      }
    },100);
  },

  /**
   * Обработка кнопки вызова расчета норм спецификации
  **/
  onSpecificationCalculate:function(e)
  {
       // переход к форме расчета норм спецификации
       window.open('/esud/specification/calculation#specifications/' + App.SpecificationInfo['number'] + '#1/use_stock/no/stock_order_number/');
  },

  /**
   *  Событие нажатия на кнопку раскрытия групп
  **/
  OnCollapse: function(e)
  {
    var self = this;
    var cur_btn = $(e.currentTarget);
    $('body').css('cursor', 'wait');
    $(cur_btn).css('cursor', 'wait');
    setTimeout( function(){
      if(cur_btn.val()=="collapsed")
      {
           cur_btn.val("unCollapsed").html('&nbsp;&nbsp;Закрыть группы').prepend('<i class = "fa fa-folder-open"></i>');
           Backbone.trigger('global:collapse',[self, true, cur_btn]);
      }
      else
      {
           cur_btn.val("collapsed").html('&nbsp;&nbsp;Расскрыть группы').prepend('<i class = "fa fa-folder"></i>');
           Backbone.trigger('global:collapse',[self, false, cur_btn]);
      }
      },100);
  },

  /**
   *  Показать ограниченный вид
  **/
  ShowSimpleView: function()
  {
    this.$el.find('.full-view').hide();
    this.$el.find('.simple-view').show();
  },

  /**
   *  Показать полный вид
  **/
  ShowFullView: function()
  {
    this.$el.find('.simple-view').hide();
    this.$el.find('.full-view').show();
  },

});
