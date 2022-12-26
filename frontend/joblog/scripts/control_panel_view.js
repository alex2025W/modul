///
/// Контрол управления поиском и фильтрацией
///
App.Views.FindView = Backbone.View.extend({
  el: $("#pnlJobLogFilter"),
  orderView:null,             // представление детализации наряда
  workOrderListView:null,     // представление списка нарядов
  events:{
    'click #btnJobLogFind': 'OnOpenWorkOrder',
    'click #btnDataFind': 'OnFilter',
    'keypress #tbWorkOrderNumber': 'OnWorkorderNumberKeyPress',
    'click #btnDownloadStat': 'OnDownloadStat',
    'click #btnDownloadQStat': 'OnDownloadQStat',
    'click #cbSaveFilters': 'OnSaveUserSettings'
  },
  templates: {
    item_templateSector:_.template($("#filterItemTemplateSector").html()),
  },
  sectorsList: [],            // справочник участков
  selectedOrders: [],         // выбранные заказы в фильтре
  selectedSectorTypes: [],    // выбранные направления работ
  selectedSectors: [],        // выбранные участки
  selectedDate: null,         // выбранная дата
  selectedFactStatus: null,   // статус отчета (все/да/нет)
  selectedWorkOrder: null,    // выбранный наряд
  selectedPage: null,         // выбранный номер страницы списка данных

  initialize: function(){
    var self = this;
    // справочник участков
    this.sectorsList = this.options['sectorsList'];
    // пользовательские настройки фильтров
    this.userFiltersInfo = this.options['user_filters_info'];


    // представление детализации наряда
    this.orderView = new App.Views.OrderView();
    // представление списка нарядов
    this.workOrderlistView = new App.Views.WorkOrderListView({'el': $("#work_order_list_body")});
    // представление статистики КТУ
    this.ktuStatisticDataCollection =  new App.Collections.KtuCollection();
    this.ktuStatisticDataListView = new App.Views.KtuStatisticDataListView({
      'el': $("#data-ktu-statistic"),
      'collection':this.ktuStatisticDataCollection
    });
    // событие смены страницы
    Backbone.on("pager:change_page",this.onChangePage,this);
    Backbone.on("workorderlist:select_item",this.OnSelectWorkOrder,this);

    // подключение календаря------------------------------------------------------
    this.$('.tbDate').val(moment().format('DD.MM.YYYY'));
    this.selectedDate = moment().format('DD.MM.YYYY');
    this.$('.date-picker').datepicker({
      calendarWeeks: true,
      endDate: "+0d",
      weekStart: 1,
      format: "dd.mm.yyyy",
      weekStart: 1,
      autoclose: true,
      todayHighlight: false,
      defaultDate: new Date()
    }).on('changeDate', function(ev){
      //App.Route.navigate("/"+ev.date.format("dd/mm/yyyy").split('/').join('_'), true);
      if(ev.date){
        self.selectedDate = ev.date.format("dd.mm.yyyy");
        // генерим событие на смену отчетной даты
        Backbone.trigger('control_panel:change_date',[self, ev.date]);
      }
    });

     // мультиселект на заказы
    this.$('.ddl-orders').multiselect({
      buttonContainer: '<span class="dropdown" />',
      includeSelectAllOption: true,
      enableCaseInsensitiveFiltering: true,
      numberDisplayed: 2,
      filterPlaceholder: 'Найти',
      nonSelectedText: "Все заказы",
      nSelectedText: "Заказов выбрано: ",
      selectAllText: "Все",
      maxHeight: 400,
      buttonText: function(options) {
        if (options.length === 0)
            return 'Все заказы <b class="caret"></b>';
        else if (options.length > this.numberDisplayed)
          return this.nSelectedText+options.length + ' ' +  ' <b class="caret"></b>';
        else {
            var selected = 'Заказы: ';
            options.each(function() {
                selected += $(this).val() + ', ';
            });
            return selected.substr(0, selected.length -2) + ' <b class="caret"></b>';
        }
      },
      onChange: function(element, checked) {
        self.selectedOrders = [];
        $(element).parent().find("option:selected").each(function(){
          if($(this).val()!="multiselect-all")
            self.selectedOrders.push($(this).val());
        });
      }
    });

    // мультиселект на направления работ
    this.$('.ddl-sector-types').multiselect({
      buttonContainer: '<span class="dropdown" />',
      includeSelectAllOption: true,
      enableCaseInsensitiveFiltering: true,
      numberDisplayed: 1,
      filterPlaceholder: 'Найти',
      nonSelectedText: "Все направления работ",
      nSelectedText: "Направлений выбрано: ",
      selectAllText: "Все",
      maxHeight: 400,
      buttonText: function(options) {
        if (options.length === 0)
            return 'Направления работ <b class="caret"></b>';
        else if (options.length > this.numberDisplayed)
                return this.nSelectedText+options.length + ' ' +  ' <b class="caret"></b>';
        else {
            var selected = 'Направления: ';
            options.each(function() {
                selected += $(this).val() + ', ';
            });
            return selected.substr(0, selected.length -2) + ' <b class="caret"></b>';
        }
      },
      onChange: function(element, checked) {
        self.selectedSectorTypes = [];
        $(element).parent().find("option:selected").each(function(){
          if($(this).val()!="multiselect-all")
            self.selectedSectorTypes.push($(this).val());
        });

        self.selectedSectors = [];
        // заполнение участков
        var filtered_sectors = (self.selectedSectorTypes && self.selectedSectorTypes.length>0)? self.sectorsList.filter(function(row){
          return self.selectedSectorTypes.indexOf(row['type'])>-1;
        }): self.sectorsList;
        self.fillSectors(self.$(".ddl-sectors"), filtered_sectors, self.selectedSectors);
      }
    });

    // мультиселект на участки
    this.$('.ddl-sectors').multiselect({
      buttonContainer: '<span class="dropdown" />',
      includeSelectAllOption: true,
      enableCaseInsensitiveFiltering: true,
      numberDisplayed: 1,
      filterPlaceholder: 'Найти',
      nonSelectedText: "Все участки",
      nSelectedText: "Участки: ",
      selectAllText: "Все",
      maxHeight: 400,
      buttonText: function(options) {
        if (options.length === 0)
          return 'Участки <b class="caret"></b>';
        else if (options.length > this.numberDisplayed)
          return this.nSelectedText+options.length + ' ' +  ' <b class="caret"></b>';
        else {
          var selected = 'Участки: ';
          options.each(function() {
              selected += $(this).val() + ', ';
          });
          return selected.substr(0, selected.length -2) + ' <b class="caret"></b>';
        }
      },
      onChange: function(element, checked) {
        self.selectedSectors = [];
        $(element).parent().find("option:selected").each(function(){
          if($(this).val()!="multiselect-all")
            self.selectedSectors.push($(this).val());
        });
      }
    });

    // отчетная дата
    this.$('.ddl-fact-status').multiselect({
      buttonContainer: '<span class="dropdown" />',
      includeSelectAllOption: false,
      enableCaseInsensitiveFiltering: false,
      numberDisplayed: 2,
      filterPlaceholder: 'Найти',
      nonSelectedText: "Статус: все",
      nSelectedText: "Статус: ",
      selectAllText: "Все",
      maxHeight: 400,
      buttonText: function(options) {
        if (options.length === 0)
          return 'Статус <b class="caret"></b>';
        else if (options.length > this.numberDisplayed)
          return this.nSelectedText+options.length + ' ' +  ' <b class="caret"></b>';
        else {
          var selected = 'Статус: ';
          options.each(function() {
              selected += $(this).text() + ', ';
          });
          return selected.substr(0, selected.length -2) + ' <b class="caret"></b>';
        }
      },
      onChange: function(element, checked) {
        self.selectedFactStatus = $(element).parent().find("option:selected").val();
      }
    });

    // обработка пользовательских настроек
    this.$("#cbSaveFilters").prop('checked', false);
    if(this.userFiltersInfo && this.userFiltersInfo['checked']){
      this.$("#cbSaveFilters").prop('checked', true);
    }
  },

  /**
   *  Обработка события смены страницы в пейджере
   */
  onChangePage: function(e)
  {
    // вызов события обновления URL адреса
    Backbone.trigger('global:on_url_params_change',[this, 'list', e[1], true]);
  },
  /**
   * Получение URL
   */
  getUrl: function(replase_tags)
  {
    var replase_tags = replase_tags || false;
    var url = "";
    url += 'list/1';
    // получение даты
    if(this.selectedDate)
      url += '/date/'+this.selectedDate.split('.').join('_');
    // получение заказов
    if(this.selectedOrders.length>0)
      url += "/orders/"+ this.selectedOrders.join(",");
    // получение типов участков
    if(this.selectedSectorTypes.length>0)
      url += "/sectortypes/"+ this.selectedSectorTypes.join(",");
    // получение участков
    if(this.selectedSectors.length>0)
      url += "/sectors/"+ this.selectedSectors.join(",");
    // получение участков
    if(this.selectedFactStatus)
      url += "/factstatus/"+ this.selectedFactStatus;
    return url.split(' ').join('%20');
  },

  /**
   *  Установление даты в календаре
   */
  setDate: function(value)
  {
    // проверка введенной даты
    if(!value || value=="")
      return;
    if(!Routine.isValidDate(value))
    {
       $.jGrowl('Задана неверная дата.', { 'themeState':'growl-error', 'sticky':false });
       return;
    }
    this.$('.date-picker').datepicker('setDate', Routine.parseDate(value));
    this.$('.tbDate').val(value);
    // генерим событие на смену отчетной даты
    Backbone.trigger('control_panel:change_date',[this, Routine.parseDate(value)]);

  },

  /**
   * Заполнение мультиселекта
   * Значения не перезатираются, а только помечаются выбранные
   */
  fillStaticList: function(ddl, values)
  {
    $(ddl).find('option').prop('selected',false);
    for(var i in values)
      $(ddl).find('option[value="' + values[i] + '"]').prop('selected',true);
    $(ddl).multiselect('rebuild');
  },

  /**
   * Заоленение участков
   */
  fillSectors: function(ddl, values, selected_values)
  {
    $(ddl).empty();
    for(var i in values)
    {
      values[i].checked = false;
      if(selected_values.indexOf(values[i].code.toString())>-1)
        values[i].checked = true;
      $(ddl).append(this.templates.item_templateSector(values[i]));
    }
    $(ddl).multiselect('rebuild');
   },

  /**
   *  Проверка нажатой клавиши в поле поиска по номеру наряда
   */
  OnWorkorderNumberKeyPress: function(e)
  {
    if(e.keyCode==13)
      this.OnOpenWorkOrder();
  },

  /**
   *  Клик на кнопку загрузки статистики по фактическим работам
   */
  OnDownloadStat: function(e)
  {
    var self  = this;
    /*if(!this.$('#tbOrderNumber').val())
    {
      $.jGrowl('Не задан номер заказа.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      return;
    }*/

    $('body').css('cursor', 'wait');
    self.$('#btnDownloadStat').css('cursor', 'wait');
    window.location='/handlers/joblog/get_statistic/'+self.selectedOrders.join(";");
    setTimeout(function(){
      $('body').css('cursor', 'default');
      self.$('#btnDownloadStat').css('cursor', 'pointer');
    }, 5000);
  },

  /**
   *  Клик на кнопку загрузки статистики по фактическим работам
   *  с указанием настроек
   */
  OnDownloadQStat: function(e)
  {
    // инициализация дилога
    var dlg = new App.Views.downloadSettingsForm();
    // обработка кнопки загрузки
    dlg.on("startdownload",function(){
      // смена курсора
      self.$('#btnDownloadQStat').css('cursor', 'wait');
      $('html').css('cursor', 'wait');
      // скачка отчета
      window.location='/handlers/joblog/get_qstatistic/?sectors='+ dlg.selectedSectors.join(",") + "&years=" + dlg.selectedYears.join(',') + "&months=" + dlg.selectedMonths.join(",")+ "&teams=" + dlg.selectedTeams.join(",")+"&symple_view="+(self.$('#data-symple-view').prop('checked')?"true":'false' )+"&include_not_completed="+(self.$('#data-include-not-completed').prop('checked')?"true":'false' );
      // восстановление курсора
      setTimeout(function(){ $('html').css('cursor', 'default'); self.$('#btnDownloadQStat').css('cursor', 'pointer');}, 10000);
    });
  },

  /**
   * Обработка события кнопки поиска поиска по наряду
   */
  OnOpenWorkOrder:function(){
    App.doQuery("number/"+this.$('#tbWorkOrderNumber').val(), true);
  },

  /**
   *  Обработка события выбора наряда в списке
   */
  OnSelectWorkOrder: function(e){
    App.doQuery("number/"+e[0], true);
  },

  /**
   * Сохранение пользовательских настроек
   */
  OnSaveUserSettings: function(e){
    App.save_user_settings($(e.target).prop('checked'),this.getUrl());
  },

  /**
   * Обработка события кнопки поиска и фильтрации по параметрам
   */
  OnFilter: function(){
    // сбор всех фильтров
    var filters = this.getUrl();
    // сохранить пользовательские настройки
    App.save_user_settings(this.$("#cbSaveFilters").prop('checked'),filters);
    // вызвать обработка запроса
    App.doQuery(filters, true);
  },

  /**
   * Заполнение фильтров
   */
  setFilters: function(sel_page, sel_orders, sel_sector_types, sel_sectors, sel_fact_status, sel_date)
  {
    var self = this;
    this.selectedOrders = sel_orders;
    this.selectedSectorTypes = sel_sector_types;
    this.selectedSectors = sel_sectors;
    this.selectedFactStatus = sel_fact_status;
    this.selectedDate = sel_date?sel_date:moment().format('DD.MM.YYYY');

    // заполнение спика заказов
    this.fillStaticList(this.$(".ddl-orders"), this.selectedOrders);
    // заполнение спика направление работ
    this.fillStaticList(this.$(".ddl-sector-types"), this.selectedSectorTypes);
    // заполнение участков
    var filtered_sectors = (sel_sector_types && sel_sector_types.length>0)? this.sectorsList.filter(function(row){
      return self.selectedSectorTypes.indexOf(row['type'])>-1;
    }): this.sectorsList;
    this.fillSectors(this.$(".ddl-sectors"), filtered_sectors, this.selectedSectors);
    // заполнение выбранной даты
    this.setDate(this.selectedDate);
    // заполнение факта наличия отчетности
    this.fillStaticList(this.$(".ddl-fact-status"), [this.selectedFactStatus]);
  },

  /**
   *  Функция подгрузки списка данных по входным параметрам
   */
  loadListData:function(sel_page, sel_orders, sel_sector_types, sel_sectors, sel_fact_status, sel_date){
    var self = this;
    // проверка на дату отчета
    if (!sel_date || sel_date == ''){
      $.jGrowl('Не задана отчетная дата.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      return;
    }

    Backbone.trigger('global:on_change_view_mode',[this,'list']);

    // загрузхка данных с сервера
    Routine.showLoader();
    if(this.xhr)
      this.xhr.abort();
    this.xhr =  $.ajax({
      url: '/handlers/joblog/get_list/' + sel_page,
      type: 'POST',
      dataType: 'json',
      contentType: "application/json; charset=utf-8",
      data: JSON.stringify({
        'page':sel_page,
        'orders': sel_orders,
        'sector_types': sel_sector_types,
        'sectors': sel_sectors,
        'fact_status': sel_fact_status,
        'date': sel_date
      }),
      timeout: 35000,
      async: true
    }).done(function(result) {
      if(result['status']=="error")
        $.jGrowl(result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      else
      {
        // заполнение контролов фильтров
        self.setFilters(sel_page, sel_orders, sel_sector_types, sel_sectors, sel_fact_status, sel_date);
        // заполнение коллекции данных и построение формы
        self.orderView.hide();
        self.workOrderListCollection = new App.Collections.WorkOrderItemsCollection(result['data']);
        self.workOrderlistView.show();
        self.workOrderlistView.render(
          self.workOrderListCollection,
          sel_page,
          Routine.strToFloat(result['count'])
        );
        // Статситика KTU
        self.ktuStatisticDataCollection.reset()
        self.ktuStatisticDataCollection.add(new App.Collections.KtuCollection(result['ktu_statistic_data']).models);
        self.ktuStatisticDataListView.render();
      }
    }).error(function(){
    }).always(function(){ Routine.hideLoader(); });
  },

  /**
   *  Функция поиска конкретного наряда
   */
  doSearch:function(number, notFirstLoad){
    var self = this;
    this.$('#tbWorkOrderNumber').val(number);
    // очистка формы наряда
    self.orderView.clear();
    // скрыть панель переноса дат
    App.DatesTransferView.close();
    // получение данных по новому наряду
    App.CurrentWorkOrder = this.$('#tbWorkOrderNumber').val();
    if (!App.CurrentWorkOrder || App.CurrentWorkOrder == ''){
      if(notFirstLoad)
        $.jGrowl('Не задан номер наряда.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      return;
    }
    Backbone.trigger('global:on_change_view_mode',[this,'detail']);
    Routine.showLoader();
    $.ajax({
      url: '/handlers/joblog/open_work_order/',
      type: 'GET',
      dataType: 'json',
      contentType: "application/json; charset=utf-8",
      data: {'num':App.CurrentWorkOrder},
      timeout: 35000,
      async: true,
      success: function (result, textStatus, jqXHR) {
        Routine.hideLoader();
        if(result.status=='error')
          $.jGrowl(result.msg, { 'themeState':'growl-error', 'sticky':false, life: 10000 });
        else if(result.status=="ok")
        {
          self.orderView.show();
          self.workOrderlistView.hide();
          self.orderView.all_sectors_in_order = result.result.all_sectors_in_order;
          self.orderView.isWeekend = result.result.weekend;
          self.orderView.sector = result.result.sector;
          self.orderView.workOrder = result.result.workorder;
          self.orderView.worksList = new App.Collections.WorkItemsCollection(result.result.works);
          self.orderView.planNorm = result.result.plan_norm;
          self.orderView.materialsList = new App.Collections.MaterialItemsCollection(result.result.materials);
          self.orderView.workersList = new App.Collections.WorkerItemsCollection(result.result.workers);
          self.orderView.historyWorkersListCollection = new App.Collections.HistoryWorkerItemsCollection(result.result.workers_history);
          self.orderView.historyWorksListCollection = new App.Collections.HistoryWorkItemsCollection(result.result.works_history);
          self.orderView.render();

          // Планы----------------
          this.plansView = new App.Views.PlansView({
            'el': $("#pnlPlansContainer"),
            'model': {
              workorder: result.result.workorder,
              workers_history: result.result.workers_history
            }
          });
          // ---------------------

        }
        else
        {
          $.jGrowl("Ошибка сервера.", { 'themeState':'growl-error', 'sticky':false, life: 10000 });
          Routine.hideLoader();
        }
      }
    });
  },
  render:function(){
  }
});
