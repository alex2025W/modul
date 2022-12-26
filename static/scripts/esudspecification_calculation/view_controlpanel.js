///
/// Панель управления на форме
///
App.Views.ControlPanelView = Backbone.View.extend({
  item_model: null,  // модель элемента по которому необходим расчет
  specifications_filter_view: null, // блок фильтра по спецификациям
  complects_filter_view: null, // блок фильтра по комплектам
  queue: null, // объект для выполнения операции в бэкграунде
  el: $("#controlPanel"),
  disable: true,
  events:{
    'click .btn-to-develop': 'onToDevelop',
    'keyup .tb-order-number': 'onChangeOrderNumber',
    'click .cb-use-stock': 'onUseStock',
    'click .cb-use-returned-waste': 'onUseReturnedWaste',
    'click .cb-send-to-google': 'onSendToGoogle',
    'click .cb-use-not-returned-waste': 'onUseNotReturnedWaste',
    'change .tb-stock-order-number': 'onUseStock',
    'click .btn-calculate-by-specifications': 'onCalculateClick',
    'click .cb-use-cut-templates': 'onUseCutTemplates',

    // --- specifications filter
    'specification_filter_list_view:clear_filter': 'onCancelFilterBySpecification',
    'specification_filter_list_view:change_specification_data': 'onChangeSpecificationItemData',
    //'specification_filter_list_view:use_stock': 'onUseStock',
    // ---complects filter
    'complect_filter_list_view:clear_filter': 'onCancelFilterByComplect',
    'complect_filter_list_view:uncomplect': 'onUncomplect',
    'complect_filter_list_view:change_complect_data': 'onChangeComplectItemData',
    // --- common trigger events
    'global:refresh_url': 'onRefreshUrl',
  },

  /**
   * Инициализация
  **/
  initialize: function(item_model)
  {
    this.item_model = item_model;
    Backbone.on("global_single_mode:disable_controls",this.onGlobalDisableControls,this);
    this.complects_filter_view = new App.Views.ComplectFilterListView({el: this.$el.find('.pnl-complect-filter'), collection:  new App.Collections.ComplectFilterCollection()});
    this.specifications_filter_view = new App.Views.SpecificationFilterListView({el: this.$el.find('.pnl-specification-filter'), collection:  new App.Collections.SpecificationFilterCollection()});

    this.$('.collapsible').collapsible();
  },

  ///---------------------------------------------------------------------------------------------------------------------------------------------------
  ///---SELF---------------------------------------------------------------------------------------------------------------------------------------------------
  ///---------------------------------------------------------------------------------------------------------------------------------------------------

  /**
   *  Clear calculated data
  **/
  clearCalculatedData: function()
  {
    // очистка покупных объектов
    App.DataViewBuyItems.clear();
    // очистка объектов собственного производства
    App.DataViewOwnItems.clear();
    // очистка плановых норм покупных изделий
    App.DataViewPlanNorms.clear();
    // скрыть кнопку - "в производство"

  },

  /**
   *  Check on specifications filter and show/hide cotrol panel
  **/
  allowMakeTasks: function()
  {
    if( this.specifications_filter_view.haveData())
     {
       if(!this.disable)
        this.disableControls(false);
       this.showToCalculateControls(true);
       this.showToProduceControls(false);
     }
     else
     {
       this.disableControls(true);
       this.showToCalculateControls(false);
       this.showToProduceControls(false);
     }
  },

  /**
   *  Изменение номера заказа
  **/
  onChangeOrderNumber: function(e)
  {
    if(this.$el.find('.tb-order-number').val() != "")
      this.$el.find('.btn-to-develop').prop('disabled', false);
    else
      this.$el.find('.btn-to-develop').prop('disabled', true);
  },

  /**
   *  Получить URL текущего состояния формы
   *  Слкдаывается из URL всех компонентов
  **/
  getUrl: function()
  {
    return this.complects_filter_view.getUrl() + '&' + this.specifications_filter_view.getUrl()+ '&use_stock='+((this.$el.find('.cb-use-stock').prop('checked'))?'yes':'no')+'&stock_order_number='+this.$el.find('.tb-stock-order-number').val()+ '&use_returned_waste='+((this.$el.find('.cb-use-returned-waste').prop('checked'))?'yes':'no')+ '&use_not_returned_waste='+((this.$el.find('.cb-use-not-returned-waste').prop('checked'))?'yes':'no')+ '&use_cut_templates='+((this.$el.find('.cb-use-cut-templates').prop('checked'))?'yes':'no')+ '&send_to_google='+((this.$el.find('.cb-send-to-google').prop('checked'))?'yes':'no');
  },

   /**
   *  Global Event on refresh URL
  **/
  onRefreshUrl: function()
  {
    Backbone.trigger('global:on_url_params_change',[this, this.getUrl()]);
  },

  /**
   *  Показать/Скрыть элементы управления для отправки данных в производство
  **/
  showToProduceControls: function(val)
  {
    if(val)
      this.$el.find('.pnl-to-product').show();
    else
      this.$el.find('.pnl-to-product').hide();
  },

  /**
   *  Показать/Скрыть элементы управления для отправки данных в производство
  **/
  showToCalculateControls: function(val)
  {
    if(val)
      this.$el.find('.pnl-calculate').show();
    else
      this.$el.find('.pnl-calculate').hide();
  },

  /**
   *  Лочивание/разлочивание элементов управления
  **/
  disableControls: function(val)
  {
    //this.$el.find(".pnl-to-product,.pnl-calculate").find('input, button').prop('disabled', val);
    this.$el.find(".pnl-to-product").find('input, button').prop('disabled', val);
    this.$el.find(".cb-use-stock").prop('disabled', val);
    this.$el.find(".tb-stock-order-number").prop('disabled',  !this.$el.find(".cb-use-stock").prop('checked') || val  );
  },

  /**
   * Обработка события использования склада в расчетах
  **/
  onUseStock: function(e)
  {
    this.$('.tb-stock-order-number').prop('disabled', !this.$el.find(".cb-use-stock").prop('checked'))
    Backbone.trigger('global:on_url_params_change',[this, this.getUrl()]);
  },

  /**
   * Обработка события использования возвратных отходов в шаблонах раскроя
  **/
  onUseReturnedWaste: function(e)
  {
    Backbone.trigger('global:on_url_params_change',[this, this.getUrl()]);
  },

  /**
   * Обработка события отправки расчета на google
  **/
  onSendToGoogle: function(e)
  {
    Backbone.trigger('global:on_url_params_change',[this, this.getUrl()]);
  },

  /**
   * Обработка события использования шаблонов раскроя
  **/
  onUseCutTemplates: function(e)
  {
    Backbone.trigger('global:on_url_params_change',[this, this.getUrl()]);
  },

  /**
   * Обработка события использования невозвратных отходов в шаблонах раскроя
  **/
  onUseNotReturnedWaste: function(e)
  {
    Backbone.trigger('global:on_url_params_change',[this, this.getUrl()]);
  },

  isUseStock: function()
  {
    return ((this.$el.find('.cb-use-stock').prop('checked'))?'yes':'no');
  },

  isUseReturnedWaste: function()
  {
    return ((this.$el.find('.cb-use-returned-waste').prop('checked'))?'yes':'no');
  },

  isUseNotReturnedWaste: function()
  {
    return ((this.$el.find('.cb-use-not-returned-waste').prop('checked'))?'yes':'no');
  },

  isUseCutTemplates: function()
  {
    return ((this.$el.find('.cb-use-cut-templates').prop('checked'))?'yes':'no');
  },

  getStockOrderNumber: function()
  {
    return this.$el.find('.tb-stock-order-number').val();
  },

  isSendToGoogle: function()
  {
    return ((this.$el.find('.cb-send-to-google').prop('checked'))?'yes':'no');
  },

  /**
   * Функция загрузки фильтров
  **/
  loadFilters:function(query_complects, uncomplect, query_specs, use_stock, stock_order_number, use_returned_waste, use_not_returned_waste, use_cut_templates, send_to_google)
  {
    this.$el.find('.cb-use-cut-templates').prop('checked', ((use_cut_templates && use_cut_templates=='yes')?true:false));
    this.$el.find('.cb-use-returned-waste').prop('checked', ((use_returned_waste && use_returned_waste=='yes')?true:false));
    this.$el.find('.cb-use-not-returned-waste').prop('checked', ((use_not_returned_waste && use_not_returned_waste=='yes')?true:false));
    this.$el.find('.cb-send-to-google').prop('checked', ((send_to_google && send_to_google=='yes')?true:false));
    this.$el.find('.cb-use-stock').prop('checked', ((use_stock && use_stock=='yes')?true:false));
    this.$el.find('.tb-stock-order-number').val(stock_order_number);
    var self = this;

    // get actual info about complects and specifications from server
    Routine.showLoader();
    $.ajax({
        type: "POST",
        url: "/handlers/esudspecification/get_specifications_and_complects_info",
        data: JSON.stringify({'specs': query_specs, 'complects': query_complects}),
        timeout: 55000,
        contentType: 'application/json',
        dataType: 'json',
        async:true
        }).done(function(result) {
          if(result['status']=="error")
            $.jGrowl(result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 10000 });
          else
          {
            var specifications = result['specs'];
            var complects = result['complects'];

            // complects processing
            var result_complects = [];
            var empty_complects = [];
            for(var i in complects)
            {
              if(!complects[i]['info'])
                empty_complects.push(complects[i]['number']);
              else
              {
                complects[i]['info']['count']['value'] = complects[i]['count'];
                result_complects.push(complects[i]);
              }
            }
            // nonexists complects checking
            if(empty_complects.length>0)
              $.jGrowl('По данным комплектам: ' + empty_complects.join('; ') + ' нет данных. Расчеты будут произведены без их участия', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
            // load complects filters
            self.complects_filter_view.loadData(result_complects, uncomplect);
            // if not uncomplect, then need to use specifications from complects, else use own specifications
            if(uncomplect=="no")
              self.refreshSpecificationsByComplects();
            else
            {
              // specifications processing
              var result_specs = [];
              var empty_specs = [];
              for(var i in specifications)
              {
                if(!specifications[i]['info'])
                  empty_specs.push(specifications[i]['number']);
                else
                {
                  specifications[i]['info']['count']['value'] = specifications[i]['count'];
                  result_specs.push(specifications[i]['info']);
                }
              }
              // nonexists specifications checking
              if(empty_specs.length>0)
                $.jGrowl('По данным спецификациям: ' + empty_specs.join('; ') + ' нет данных. Расчеты будут произведены без их участия', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
              // load specifications filters
              self.specifications_filter_view.loadData(result_specs, uncomplect=="no");
            }
            // update URL
            Backbone.trigger('global:on_url_params_change',[self, self.getUrl()]);
            self.allowMakeTasks();

            setTimeout(function(){
              // automate calculation
              self.onCalculate(self.specifications_filter_view.getData());
            },100);
          }
        }).error(function(){
              $.jGrowl('Ошибка получения данных по комплектам и спецификациям. Обновите страницу для повторного поиска. ', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
    }).always(function(){Routine.hideLoader();});
  },

  /**
   * Обработка соыбтия клика по кноке расчета
   *
   **/
  onCalculateClick:function()
  {
    this.onCalculate(this.specifications_filter_view.getData());
  },

  /**
   * Вызов функции расчета
   * specifications = [{'number':'', 'count':0}]
  **/
  onCalculate:function(specifications)
  {
     if(specifications && specifications.length>0)
    {
      var use_stock=this.isUseStock();
      var stock_order_number = this.getStockOrderNumber();
      var use_returned_waste=this.isUseReturnedWaste();
      var use_not_returned_waste=this.isUseNotReturnedWaste();
      var use_cut_templates=this.isUseCutTemplates();
      var send_to_google = this.isSendToGoogle();

      // запуск задания на рассчет спецификации
      Routine.showProgressLoader(10);
      this.queue = new Queue({
          task_key: "calculate_production_order",
          params: {
            'specifications':specifications,
            'use_stock': use_stock,
            'stock_order_number': stock_order_number,
            'use_returned_waste': use_returned_waste,
            'use_not_returned_waste': use_not_returned_waste,
            'use_cut_templates': use_cut_templates,
            'send_to_google': send_to_google
          },
          complete: this.onQueueComplete.bind(this),
      });
      this.queue.run();
    }
    else
      Backbone.trigger('global:clear',[this]);
  },

  /**
   * Обработка глобального события завершения выполнения задания в очереди
  **/
  onQueueComplete: function(queue, task_key, result)
  {
    var self = this;
    // если выбран флаг о необходимости отправки данных на google, то необходимо
    // сделать принудительный редирект пользоватля к google таблице
    if(this.isSendToGoogle() == 'yes'){
      window.location = 'https://docs.google.com/spreadsheets/d/15KMyHTBKcwFjX-l8hxGHpwarq4CLDpkzyetgt8QFAdU/edit#gid=0';
      return;
    }

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

      // отрисовка покупных объектов
      App.DataViewBuyItems.init_data(result.data['buy_items']);
      App.DataViewBuyItems.render();
      // отрисовка объектов собственного производства
      App.DataViewOwnItems.render(result.data['own_items'], result.data['sorted_sectors']);
      // отрисовка плановых норм покупных изделий
      App.DataViewPlanNorms.render(result.data['buy_items'], result.data['sorted_sectors']);
      // показать кнопку выдачи задания на производство
      if(!self.disable)
        self.disableControls(false);
      self.showToProduceControls(true);
      self.showToCalculateControls(true);
    }
  },

   /**
   * Вызов функции создания заказа на производство
  **/
  onToDevelop:function(e)
  {
      /*var own_items = App.DataViewOwnItems.validate_and_get_data();
      var buy_items = App.DataViewBuyItems.validate_and_get_data();
      console.log(own_items);
      console.log(buy_items);
       return;*/

       var self = this;
       // проверка номера заказа
       var orderNumber = this.$el.find('.tb-order-number').val();
       var orderNumberItems = orderNumber.split('.');
       if(orderNumberItems.length<3)
       {
        $.jGrowl('Задан не верный номер заказа.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
        return;
       }

      Routine.showLoader();
      setTimeout(function(){
        var own_items = App.DataViewOwnItems.validate_and_get_data();
        var buy_items = App.DataViewBuyItems.validate_and_get_data();
        if(own_items['ok'] && buy_items['ok'] && (own_items['data'] || buy_items['data']))
        {
            $.ajax({
                type: "POST",
                url: "/handlers/productionorder/add",
                data: JSON.stringify({'own_items': own_items['data'], 'buy_items': buy_items['data'], 'order_number': orderNumber, 'complects': self.complects_filter_view.getData(), 'specifications': self.specifications_filter_view.getData(), 'uncomplect':  self.complects_filter_view.isUncomplect()=='yes'}),
                timeout: 55000,
                contentType: 'application/json',
                dataType: 'json',
                async:true
            }).done(function(result) {
              if(result['status']=="error")
                $.jGrowl(result['msg'] || 'Ошибка сохранения данных. Повторите попытку.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
              else
              {
                $.jGrowl('Создано задание №'+result['data']['number'] + ' для заказа №'+result['data']['order']['number'], { 'themeState':'growl-success', 'sticky':true });
                setTimeout(function(){
                  self.onCalculate(self.specifications_filter_view.getData());
                },100);
              }
            }).error(function(){
                $.jGrowl('Ошибка сохранения данных. Повторите попытку. ', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
            }).always(function(){Routine.hideLoader();});
        }
        else
          Routine.hideLoader();
       },100);
  },


  ///---------------------------------------------------------------------------------------------------------------------------------------------------
  ///-SPECIFICATIONS------------------------------------------------------------------------------------------------------------------------------------
  ///---------------------------------------------------------------------------------------------------------------------------------------------------

  /**
   *  Global Event on change specification state
  **/
  onChangeSpecificationItemData: function(e, specifications_view)
  {
    // allow make tasks
    this.allowMakeTasks();
    // clear calculation data forms
    this.clearCalculatedData();

    // set flag "uncomplect" in "yes"
    this.complects_filter_view.unComplect("yes");
    Backbone.trigger('global:on_url_params_change',[this, this.getUrl()]);
  },

  /**
   * Отмена фильтрации по спецификациям
  **/
  onCancelFilterBySpecification: function(e)
  {
    this.allowMakeTasks();
    this.clearCalculatedData();
    // приведение строки запроса к корректному виду
    Backbone.trigger('global:on_url_params_change',[this,  this.getUrl() ]);
  },

  ///---------------------------------------------------------------------------------------------------------------------------------------------------
  ///-COMPLECTS-------------------------------------------------------------------------------------------------------------------------------------------
  ///---------------------------------------------------------------------------------------------------------------------------------------------------

   /**
   *  Global Event on change complects state
  **/
  onChangeComplectItemData: function(e, complects_view, uncomplect)
  {
    this.refreshSpecificationsByComplects();
    this.allowMakeTasks();
    this.clearCalculatedData();
    this.complects_filter_view.unComplect("no");
    Backbone.trigger('global:on_url_params_change',[this, this.getUrl()]);
  },

  /**
   * Обработка события раскомплектования
  **/
  onUncomplect: function(e, object, uncomplect)
  {
     // lock specifications filter, if use complect
     this.specifications_filter_view.disable(!uncomplect);
     // recalc specifications filter if complect used
     if(!uncomplect)
      this.refreshSpecificationsByComplects();
     // trigger event to change complect params
     Backbone.trigger('global:on_url_params_change',[this, this.getUrl()]);
     // enable and show contro panel
     this.allowMakeTasks();
  },

  /**
   * Отмена фильтрации по комплектам
  **/
  onCancelFilterByComplect: function(e)
  {
    this.specifications_filter_view.onCancelFilter();
    this.clearCalculatedData();
  },

  /**
   * Refresh specifications filter info by complects
   * complects - collection with complects
  **/
  refreshSpecificationsByComplects:function()
  {
      var self = this;
      var specs = {};
      _.each(self.complects_filter_view.collection.models, function (complect)
      {
      var complect_items = JSON.parse(JSON.stringify( complect.get('items')));


      if(complect_items)
      {
        for(var i in complect_items)
        {
          var spec = complect_items[i];
          spec['number'] = spec['specification']['number'];
          spec['is_buy'] = spec['specification']['is_buy'];
          spec['name'] = spec['specification']['name'];
          spec['history'] = spec['specification']['history'];
          if(!(spec['number'] in specs))
          {
            spec['count']['value'] = spec['count']['value']*complect.get('count');
            specs[spec['number']] = spec;
          }
          else
            specs[spec['number']]['count']['value']+=spec['count']['value']*complect.get('count');
        }
      }
      }, this);
    // load specifications filters
    self.specifications_filter_view.loadData(_.values(specs), true);
    // update URL
    Backbone.trigger('global:on_url_params_change',[this, this.getUrl()]);
  },

  ///---------------------------------------------------------------------------------------------------------------------------------------------------
  ///-GLOBAL--------------------------------------------------------------------------------------------------------------------------------------------------
  ///---------------------------------------------------------------------------------------------------------------------------------------------------
  /**
   *  Глобальное Событие на лочивание/разлочивание элементов управления
   *  вызывается от внешних форм
  **/
  onGlobalDisableControls: function(e)
  {
    var disable = e[1];
    this.disable = disable;
    // отрабатывает, елси только надо задизейблить все контролы
    if(disable)
    {
      this.disableControls(disable);
      //this.specifications_filter_view.disable(disable);
      //this.complects_filter_view.disable(disable, true);
    }
    else
    {
       // get uncomplect flag
        var uncomplect = this.complects_filter_view.isUncomplect();
        // lock specifications filter, if use complect
       this.specifications_filter_view.disable(uncomplect=='no');
       // lock complects filter view is not use complect
       this.complects_filter_view.disable(uncomplect=='yes');
       this.disableControls(false);
       this.showToCalculateControls((this.specifications_filter_view.haveData() || this.complects_filter_view.haveData()));
       // enable and show control panel
       //this.allowMakeTasks();
    }
  },
});
