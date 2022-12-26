App.Views.FindView = Backbone.View.extend({
  el: $("#pnlJobLogFilter"),
  events:{
    'click #btnDataFind': 'OnFilter',
    'click .btn-excel': 'OnXLSDownload',
    'click .btn-google': 'OnGOOGLEDownload',
    'click #cbSaveFilters': 'OnSaveUserSettings',
    'click #cbPeriod': 'OnActivatePeriod'
  },

  sectorsList: [],            // справочник участков
  selectedOrders: [],         // выбранные заказы в фильтре
  selectedSectors: [],        // выбранные участки
  selectedDateFrom: null,     // дата начала
  selectedDateTo: null,       // дата окончания
  needDate: 'no',             // требуются ли даты

  initialize: function(){
    var self = this;

    // отслеживаем событие смены таба
    Backbone.on("global:on_tab_change",this.onTabChange,this);
    // справочник участков
    this.sectorsList = this.options['sectorsList'];
    // пользовательские настройки фильтров
    this.userFiltersInfo = this.options['user_filters_info'];

    this.$('.tbDateFrom').datepicker({
      calendarWeeks: true,
      endDate: "+0d",
      weekStart: 1,
      format: "dd.mm.yyyy",
      weekStart: 1,
      autoclose: true,
      todayHighlight: true,
      defaultDate: new Date()
    }).on('changeDate', function(ev){
      if(ev.date)
        self.selectedDateFrom = ev.date.format("dd.mm.yyyy");
    });

    this.$('.tbDateTo').datepicker({
      calendarWeeks: true,
      endDate: "+0d",
      weekStart: 1,
      format: "dd.mm.yyyy",
      weekStart: 1,
      autoclose: true,
      todayHighlight: true,
      defaultDate: new Date()
    }).on('changeDate', function(ev){
      if(ev.date)
        self.selectedDateTo = ev.date.format("dd.mm.yyyy");
    });

     // мультиселект на заказы
    this.$('.ddl-orders').multiselect({
      buttonContainer: '<span class="dropdown" />',
      includeSelectAllOption: true,
      enableCaseInsensitiveFiltering: true,
      numberDisplayed: 3,
      filterPlaceholder: 'Найти',
      nonSelectedText: "Все заказы",
      nSelectedText: "Заказов выбрано: ",
      selectAllText: "Все",
      maxHeight: 400,
      buttonText: function(options) {
        if (options.length === 0)
            return 'Все заказы';
        else if (options.length > this.numberDisplayed)
          return this.nSelectedText+options.length
        else {
            var selected = 'Заказы: ';
            options.each(function() {
                selected += $(this).val() + ', ';
            });
            return selected.substr(0, selected.length -2);
        }
      },

      onDeselectAll: function() {
        self.selectedOrders = [];
        this.$select.find('option:selected').each(function(){
          if($(this).val()!="multiselect-all")
            self.selectedOrders.push($(this).val());
        });
      },

      onSelectAll: function() {
        self.selectedOrders = [];
        this.$select.find('option:selected').each(function(){
          if($(this).val()!="multiselect-all")
            self.selectedOrders.push($(this).val());
        });
      },

      onChange: function(element, checked) {
        self.selectedOrders = [];
        $(element[0]).parent().find("option:selected").each(function(){
          if($(this).val()!="multiselect-all")
            self.selectedOrders.push($(this).val());
        });
      }
    });

    // мультиселект на участки
    this.$('.ddl-sectors').multiselect({
      buttonContainer: '<span class="dropdown" />',
      includeSelectAllOption: true,
      enableCaseInsensitiveFiltering: true,
      numberDisplayed: 3,
      filterPlaceholder: 'Найти',
      nonSelectedText: "Все участки",
      nSelectedText: "Участки: ",
      selectAllText: "Все",
      maxHeight: 400,
      enableClickableOptGroups:true,
      buttonText: function(options) {
        if (options.length === 0)
          return 'Участки';
        else if (options.length > this.numberDisplayed)
          return this.nSelectedText+options.length;
        else {
          var selected = 'Участки: ';
          options.each(function() {
              selected += $(this).val() + ', ';
          });
          return selected.substr(0, selected.length -2);
        }
      },

      onDeselectAll: function() {
        self.selectedSectors = [];
        this.$select.find('option:selected').each(function(){
          if($(this).val()!="multiselect-all")
            self.selectedSectors.push($(this).val());
        });
      },

      onSelectAll: function() {
        self.selectedSectors = [];
        this.$select.find('option:selected').each(function(){
          if($(this).val()!="multiselect-all")
            self.selectedSectors.push($(this).val());
        });
      },

      onChange: function(element, checked) {
        self.selectedSectors = [];
        $(element[0]).parent().parent().each(function(){
          $(this).find("option:selected").each(function(){
            if($(this).val()!="multiselect-all")
              self.selectedSectors.push($(this).val());
          });
        });
      }
    });

    // флаг пользовательских настроек
    this.$("#cbSaveFilters").prop('checked', false);
    if(this.userFiltersInfo && this.userFiltersInfo['checked']){
      this.$("#cbSaveFilters").prop('checked', true);
    }

    // флаг необходимости дат
    this.$("#cbPeriod").prop('checked', false);
    this.$('.tbDateTo').prop('disabled', true);
    this.$('.tbDateFrom').prop('disabled', true);

  },

  /**
   * Событие смены таба
   */
  onTabChange: function(params){
    this.current_tab = params[1];
  },

  /**
   * Получение URL
   */
  getUrl: function(replase_tags)
  {
    var replase_tags = replase_tags || false;
    var url = "";
    url += 'search/1';
    // получение даты
    if(this.selectedDateFrom)
      url += '/date_from/'+this.selectedDateFrom.split('.').join('_');
    if(this.selectedDateTo)
      url += '/date_to/'+this.selectedDateTo.split('.').join('_');
    // получение заказов
    if(this.selectedOrders.length>0)
      url += "/orders/"+ this.selectedOrders.join(",");
    // получение участков
    if(this.selectedSectors.length>0)
      url += "/sectors/"+ this.selectedSectors.join(",");
    url += "/need_date/"+ this.needDate;
    url += "/current_tab/"+ ((this.current_tab!=undefined && this.current_tab) ? this.current_tab : '');

    // table settings
    // url += '/table_filters/' + ((this.tableDataView != undefined && this.tableDataView) ? this.tableDataView.getFilters():'');

    return url.split(' ').join('%20');
  },

  /**
   *  Set date from
   */
  setDate: function(ctrl, value)
  {
    // проверка введенной даты
    if(!value || value=="")
      return;
    if(!Routine.isValidDate(value))
    {
       $.jGrowl('Задана неверная дата.', { 'themeState':'growl-error', 'sticky':false });
       return;
    }
    this.$(ctrl).datepicker('setDate', Routine.parseDate(value));
    this.$(ctrl).val(value);
  },

  /**
   * Заполнение мультиселекта
   * Значения не перезатираются, а только помечаются выбранные
   */
  fillStaticList: function(ddl, values)
  {
    // var ddl = this.$(".ddl-sector-types");
    // var ddl = this.$(".ddl-orders");
    $(ddl).find('option').prop('selected',false);
    for(var i in values)
      $(ddl).find('option[value="' + values[i] + '"]').prop('selected',true);
    $(ddl).multiselect('rebuild');
  },

  /**
   * Сохранение пользовательских настроек
   */
  OnSaveUserSettings: function(e){
    App.save_user_settings($(e.target).prop('checked'),this.getUrl());
  },

  /**
   * Активация фильтра ввода дат
   */
  OnActivatePeriod: function(e){
    var val = $(e.target).prop('checked');

    this.$('.tbDateTo').prop('disabled', !val);
    this.$('.tbDateFrom').prop('disabled', !val);

    if(!val)
    {
      this.$('.tbDateTo').val('');
      this.$('.tbDateFrom').val('');
      this.selectedDateFrom = null;
      this.selectedDateTo = null;
    }

    this.needDate = val?"yes":"no";
  },

  /**
   * Download XLS
   */
  OnXLSDownload: function(){
    var self  = this;
    $('body').css('cursor', 'wait');
    self.$('.btn-excel').css('cursor', 'wait');
    window.open('/stats/joblog/vers3/xls/'+ this.getUrl());
    setTimeout(function(){
      $('body').css('cursor', 'default');
      self.$('.btn-excel').css('cursor', 'pointer');
    }, 2000);
  },

  /**
   * REdirect to GOOGLE
   */
  OnGOOGLEDownload: function(){
    var self  = this;
    $('body').css('cursor', 'wait');
    self.$('.btn-google').css('cursor', 'wait');
    window.open('/stats/joblog/vers3/google/'+ this.getUrl(), '_blank');
    setTimeout(function(){
      $('body').css('cursor', 'default');
      self.$('.btn-google').css('cursor', 'pointer');
    }, 2000);
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
  setFilters: function(sel_orders, sel_sectors, sel_need_date, sel_date_from, sel_date_to, current_tab)
  {
    var self = this;

    this.current_tab = current_tab;
    this.selectedOrders = sel_orders;
    this.selectedSectors = sel_sectors;
    this.selectedDateFrom = sel_date_from;
    this.selectedDateTo = sel_date_to;
    this.needDate = sel_need_date;

    // заполнение спика заказов
    this.fillStaticList(this.$(".ddl-orders"), this.selectedOrders);
    // заполнение спика направление работ
    this.fillStaticList(this.$(".ddl-sectors"), this.selectedSectors);

    // флаг необходимости дат
    this.$("#cbPeriod").prop('checked', false);
    this.$('.tbDateTo').prop('disabled', true);
    this.$('.tbDateFrom').prop('disabled', true);

    if(sel_need_date == 'yes'){
      this.$("#cbPeriod").prop('checked', true);
      this.$('.tbDateTo').prop('disabled', false);
      this.$('.tbDateFrom').prop('disabled', false);
    }
    this.setDate(this.$('.tbDateFrom'), this.selectedDateFrom);
    this.setDate(this.$('.tbDateTo'), this.selectedDateTo);
  },

  /**
   * Prepare data
   */
  prepareData: function(data){
    var result = [];
    if(data && data.length > 0){
      for(var i in data){
        var row = data[i];
        for(var j in row['wp_workers']){
          var w_row = row['wp_workers'][j];
          result.push({
            user_fio: w_row['user_fio'],
            wp_fact_date: row['wp_fact_date'],
            contract_number: row['contract_number'],
            order: row['order'],
            sector_type: row['sector_type'],
            sector_code: row['sector_code'],
            sector_name: row['sector_name'],
            number: row['number'],
            user_email: w_row['user_email'],
            proportion: w_row['proportion']
          });
        }
      }
    }
    return result;
  },

  /**
   *  Load data function
   */
  loadData:function(sel_orders, sel_sectors, sel_need_date, sel_date_from, sel_date_to, current_tab, table_filters){
    var self = this;
    // заполнение контролов фильтров
    self.setFilters(sel_orders, sel_sectors,sel_need_date, sel_date_from, sel_date_to, current_tab);
    // загрузхка данных с сервера
    Routine.showLoader();
    if(this.xhr)
      this.xhr.abort();
    this.xhr = $.ajax({
      url: '/handlers/joblog/get_new_statistic',
      type: 'POST',
      dataType: 'json',
      contentType: "application/json; charset=utf-8",
      data: JSON.stringify({
        'orders': sel_orders,
        'sectors': sel_sectors,
        'date_from': sel_date_from,
        'date_to': sel_date_to,
      }),
      timeout: 35000,
      async: true
    }).done(function(result) {
      App.MainView.showData(false);
      if(result['status']=="error")
        $.jGrowl(result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      else if (result['data'].length===0){
        $.jGrowl('По заданным параметрам ничего не найдено.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      }
      else
      {
        App.MainView.showData(true);
        // define table view
        self.dataCollection =  new App.Collections.DataItemsCollection(
          self.prepareData(result['data'])
        );
        self.tableDataView = new App.Views.DataTableListView({
          'el': $("#pnlTableDataContainer"),
          'collection':self.dataCollection,
          'filters': table_filters
        });

        self.chartDataView =  new App.Views.DataChartView({
          'el': $("#pnlChartsContainer"),
          'collection': result['data']
        });
      }
    }).error(function(){
    }).always(function(){ Routine.hideLoader(); });

    // выбрать необходимый таб
    // Backbone.trigger('global:on_change_view_mode',[this,'list']);
  }
});
