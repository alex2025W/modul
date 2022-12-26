///---------------------------------------------------------------------------------------------------------
/// Представление формы поиска
///---------------------------------------------------------------------------------------------------------
App.Views.FindView = Backbone.View.extend({
  el: $("#find-order-form"),
  events:{
    'click #btnDataFind': 'OnFilter',
    'click .btn-collapse': 'OnCollapse',
    'click .btn-download-stat': 'onDownloadStat',
    'click .btn-print': 'onPrint',
    'click .mto-tabs a':'onTabClicked',
    'click .lnk-maximize': "onMaximize",
    'change .ddl-view-type': "onChangeViewType"
  },
  templates: {
    item_templateSector:_.template($("#filterItemTemplateSector").html()),
    item_templateOrder:_.template($("#filterItemTemplateOrder").html()),
  },
  current_tab: 'body',        // текущий выбранный таб
  view_mode: 'common',        // вид отображения данных
  view_type: 'volumes',       // тип отображения данных (объемы/цены)
  dataListView:null,
  ordersList: [],             // справочник заказов
  sectorsList: [],            // справочник участков
  selectedContracts: [],      // выбранные договоры в фильтре
  selectedOrders: [],         // выбранные заказы в фильтре
  selectedSectorTypes: [],    // выбранные направления участков
  selectedSectors: [],        // выбранные участки
  selectedMaterialGroups: [], // выбранные участки
  selectedGroups: [],         // выбранные позиции по которым ведется группировка данных
  selectedColumns: [],        // выбранные колонки для отображения
  selectedStatuses: [],       // выбранные статусы

  initialize: function(){
    var self = this;

    // отслеживаем событие смены таба
    Backbone.on("global:on_tab_change",this.onTabChange,this);
    // справочники
    this.sectorsList = this.options['sectorsList'];
    this.ordersList = this.options['ordersList'];
    this.userFiltersInfo = this.options['userFiltersInfo'];

    // стартовые фильтры
    this.selectedContracts = [];
    this.selectedOrders = [];
    this.selectedSectorTypes = [];
    this.selectedSectors = [];
    this.selectedMaterialGroups = [];
    this.selectedGroups = [];
    this.selectedColumns = [];
    this.selectedStatuses = [];

    // мультиселект на договоры
    function redefineOrders(){
      var new_selected_orders = [];
      var filtered_orders = (self.selectedContracts && self.selectedContracts.length>0)? self.ordersList.filter(function(row){
        return self.selectedContracts.indexOf(row.number.split('.')[0])>-1;
      }): [];
      for(var i in self.selectedOrders)
      {
        for(var j in filtered_orders)
        {
          if(self.selectedOrders[i] == filtered_orders[j].number)
            new_selected_orders.push(self.selectedOrders[i]);
        }
      }
      self.selectedOrders = new_selected_orders;
      self.fillOrders(self.$(".ddl-orders"), filtered_orders, self.selectedOrders);
    };
    this.$('.ddl-contracts').multiselect({
      buttonContainer: '<span class="dropdown" />',
      includeSelectAllOption: true,
      enableCaseInsensitiveFiltering: true,
      numberDisplayed: 3,
      filterPlaceholder: 'Найти',
      nonSelectedText: "Все договоры",
      nSelectedText: "Договоры: ",
      selectAllText: "Все",
      maxHeight: 400,
      enableClickableOptGroups:true,
      buttonText: function(options) {
        if (options.length === 0)
          return 'Договоры';
        else if (options.length > this.numberDisplayed)
          return this.nSelectedText+options.length;
        else {
          var selected = 'Договоры: ';
          options.each(function() {
              selected += $(this).val() + ', ';
          });
          return selected.substr(0, selected.length -2);
        }
      },
      onDeselectAll: function() {
        self.selectedContracts = [];
        this.$select.find('option:selected').each(function(){
          if($(this).val()!="multiselect-all")
            self.selectedContracts.push($(this).val());
        });
        redefineOrders();
      },
      onSelectAll: function() {
        self.selectedContracts = [];
        this.$select.find('option:selected').each(function(){
          if($(this).val()!="multiselect-all")
            self.selectedContracts.push($(this).val());
        });
        redefineOrders();
      },
      onChange: function(element, checked) {
        self.selectedContracts = [];
        $(element[0]).parent().each(function(){
          $(this).find("option:selected").each(function(){
            if($(this).val()!="multiselect-all")
              self.selectedContracts.push($(this).val());
          });
        });
        redefineOrders();
      }
    });

    // мультиселект на заказы
    this.$('.ddl-orders').multiselect({
      buttonContainer: '<span class="dropdown" />',
      includeSelectAllOption: true,
      enableCaseInsensitiveFiltering: true,
      numberDisplayed: 3,
      filterPlaceholder: 'Найти',
      nonSelectedText: "Все заказы",
      nSelectedText: "Заказы: ",
      selectAllText: "Все",
      maxHeight: 400,
      enableClickableOptGroups:true,
      buttonText: function(options) {
        if (options.length === 0)
          return 'Заказы';
        else if (options.length > this.numberDisplayed)
          return this.nSelectedText+options.length;
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
        $(element[0]).parent().each(function(){
          $(this).find("option:selected").each(function(){
            if($(this).val()!="multiselect-all")
              self.selectedOrders.push($(this).val());
          });
        });
      }
    });

    // мультиселект на направления работ
    function redefineSectors(){
      var new_selected_sectors = [];
      //self.selectedSectors = [];
      // fill sectors
      var filtered_sectors = (self.selectedSectorTypes && self.selectedSectorTypes.length>0)? self.sectorsList.filter(function(row){
        return self.selectedSectorTypes.indexOf(row['type'])>-1;
      }): [];


      for(var i in self.selectedSectors)
      {
        for(var j in filtered_sectors)
        {
          if(self.selectedSectors[i].toString() == filtered_sectors[j].code.toString())
            new_selected_sectors.push(self.selectedSectors[i]);
        }
      }
      self.selectedSectors = new_selected_sectors;
      self.fillSectors(self.$(".ddl-sectors"), filtered_sectors, self.selectedSectors);
    };
    this.$('.ddl-sector-types').multiselect({
      buttonContainer: '<span class="dropdown" />',
      includeSelectAllOption: true,
      enableCaseInsensitiveFiltering: true,
      numberDisplayed: 3,
      filterPlaceholder: 'Найти',
      nonSelectedText: "Все направления",
      nSelectedText: "Направления: ",
      selectAllText: "Все",
      maxHeight: 400,
      enableClickableOptGroups:true,
      buttonText: function(options) {
        if (options.length === 0)
          return 'Направления';
        else if (options.length > this.numberDisplayed)
          return this.nSelectedText+options.length;
        else {
          var selected = 'Направления: ';
          options.each(function() { selected += $(this).val() + ', '; });
          return selected.substr(0, selected.length -2);
        }
      },
      onDeselectAll: function() {
        self.selectedSectorTypes = [];
        this.$select.find('option:selected').each(function(){
          if($(this).val()!="multiselect-all")
            self.selectedSectorTypes.push($(this).val());
        });
        redefineSectors();
      },
      onSelectAll: function() {
        self.selectedSectorTypes = [];
        this.$select.find('option:selected').each(function(){
          if($(this).val()!="multiselect-all")
            self.selectedSectorTypes.push($(this).val());
        });
        redefineSectors();
      },
      onChange: function(element, checked) {
        self.selectedSectorTypes = [];
        $(element[0]).parent().each(function(){
          $(this).find("option:selected").each(function(){
            if($(this).val()!="multiselect-all")
              self.selectedSectorTypes.push($(this).val());
          });
        });
        redefineSectors();
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
        $(element[0]).parent().each(function(){
          $(this).find("option:selected").each(function(){
            if($(this).val()!="multiselect-all")
              self.selectedSectors.push($(this).val());
          });
        });
      }
    });

    // мультиселект на группы материалов
    this.$('.ddl-materialsgroups').multiselect({
      buttonContainer: '<span class="dropdown" />',
      includeSelectAllOption: true,
      enableCaseInsensitiveFiltering: true,
      numberDisplayed: 3,
      filterPlaceholder: 'Найти',
      nonSelectedText: "Группы материалов",
      nSelectedText: "Группы материалов: ",
      selectAllText: "Все",
      maxHeight: 400,
      enableClickableOptGroups:true,
      buttonText: function(options) {
        if (options.length === 0)
          return 'Группы материалов';
        else if (options.length > this.numberDisplayed)
          return this.nSelectedText+options.length;
        else {
          var selected = 'Группы материалов: ';
          options.each(function() {
              selected += $(this).val() + ', ';
          });
          return selected.substr(0, selected.length -2);
        }
      },
      onDeselectAll: function() {
        self.selectedMaterialGroups = [];
        this.$select.find('option:selected').each(function(){
          if($(this).val()!="multiselect-all")
            self.selectedMaterialGroups.push($(this).val());
        });
      },
      onSelectAll: function() {
        self.selectedMaterialGroups = [];
        this.$select.find('option:selected').each(function(){
          if($(this).val()!="multiselect-all")
            self.selectedMaterialGroups.push($(this).val());
        });
      },
      onChange: function(element, checked) {
        self.selectedMaterialGroups = [];
        $(element[0]).parent().each(function(){
          $(this).find("option:selected").each(function(){
            if($(this).val()!="multiselect-all")
              self.selectedMaterialGroups.push($(this).val());
          });
        });
      }
    });

    // мультиселект на статусы
    this.$('.ddl-status').multiselect({
      buttonContainer: '<span class="dropdown" />',
      includeSelectAllOption: false,
      enableCaseInsensitiveFiltering: false,
      numberDisplayed: 2,
      filterPlaceholder: 'Найти',
      nonSelectedText: "Статус: все",
      nSelectedText: "Статус: ",
      selectAllText: "Все",
      maxHeight: 400,
      enableClickableOptGroups:true,
      buttonText: function(options) {
        if (options.length === 0)
          return 'Статус';
        else if (options.length > this.numberDisplayed)
          return this.nSelectedText+options.length;
        else {
          var selected = 'Статус: ';
          options.each(function() {
              selected += $(this).text() + ', ';
          });
          return selected.substr(0, selected.length -2);
        }
      },
      onDeselectAll: function() {
        self.selectedStatuses = [];
        this.$select.find('option:selected').each(function(){
          if($(this).val()!="multiselect-all")
            self.selectedStatuses.push($(this).val());
        });
      },
      onSelectAll: function() {
        self.selectedStatuses = [];
        this.$select.find('option:selected').each(function(){
          if($(this).val()!="multiselect-all")
            self.selectedStatuses.push($(this).val());
        });
      },
      onChange: function(element, checked) {
        self.selectedStatuses = [];
        $(element[0]).parent().each(function(){
          $(this).find("option:selected").each(function(){
            if($(this).val()!="multiselect-all")
              self.selectedStatuses.push($(this).val());
          });
        });
      }
    });

    // подключение мультиселекта выбор группировки данных
    function applyGroups(){
      Backbone.trigger('global:on_url_params_change',[self, 'group_by', self.selectedGroups.join(',')]);
      // отрисовка основных данных
      $('body').addClass('wait');
      setTimeout(function(){
        App.dataListView.render(self.selectedGroups, self.selectedColumns);
        $('body').removeClass('wait');
      },150);
    };

    this.$('.ddl-groupby').multiselect({
      buttonContainer: '<span class="dropdown" />',
      includeSelectAllOption: false,
      enableCaseInsensitiveFiltering: false,
      numberDisplayed: 4,
      filterPlaceholder: 'Группировать по',
      nonSelectedText: "Группировать по",
      nSelectedText: "Группировать по:",
      selectAllText: "Всем",
      maxHeight: 400,
      enableClickableOptGroups:true,
      buttonText: function(options) {
        if (options.length === 0)
          return 'Группировать по';
        else if (options.length > this.numberDisplayed)
          return this.nSelectedText+options.length;
        else {
          var selected = 'Группировать по: ';
          options.each(function() {
              selected += $(this).text() + ', ';
          });
          return selected.substr(0, selected.length -2);
        }
      },
      onDeselectAll: function() {
        self.selectedGroups = [];
        this.$select.find('option:selected').each(function(){
          if($(this).val()!="multiselect-all")
            self.selectedGroups.push($(this).val());
        });
        applyGroups();
      },
      onSelectAll: function() {
        self.selectedGroups = [];
        this.$select.find('option:selected').each(function(){
          if($(this).val()!="multiselect-all")
            self.selectedGroups.push($(this).val());
        });
        applyGroups();
      },
      onChange: function(element, checked) {
        self.selectedGroups = [];
        $(element[0]).parent().each(function(){
          $(this).find("option:selected").each(function(){
            if($(this).val()!="multiselect-all")
              self.selectedGroups.push($(this).val());
          });
        });
        applyGroups();
      },
      onInitialized: function(element, container){
        $(container).sortable({
          items: 'li',
          stop: function(event, ui) {
            self.selectedGroups = [];
            $(self.el).find('.ddl-groupby').next().find('input:visible').each(function(){
              if($(this).prop('checked'))
                self.selectedGroups.push($(this).val());
             });
            applyGroups();
          }
        });
        $(container).disableSelection();
      }
    });

    // подключение мультиселекта отображаемых колонок
    function applyColumns(){
      Backbone.trigger('global:on_url_params_change',[self, 'columns', self.selectedColumns.join(',')]);

      if(self.last_delay_timeout)
      {
          clearTimeout(self.last_delay_timeout);
          $('body').removeClass('wait');
      }
      // отрисовка основных данных
      self.last_delay_timeout = setTimeout(function(){
        $('body').addClass('wait');
        setTimeout(function(){
          App.dataListView.visibleColumns(self.selectedColumns);
          $('body').removeClass('wait');
        },100);
      },1000);

    };
    this.$('.ddl-columns').multiselect({
      buttonContainer: '<span class="dropdown" />',
      includeSelectAllOption: true,
      enableCaseInsensitiveFiltering: false,
      numberDisplayed: 2,
      filterPlaceholder: 'Колонки',
      nonSelectedText: "Колонки",
      nSelectedText: "Колонки:",
      selectAllText: "Все",
      maxHeight: 400,
      enableClickableOptGroups:true,
      buttonText: function(options) {
        if (options.length === 0)
          return 'Колонки';
        else if (options.length > this.numberDisplayed)
          return this.nSelectedText+options.length;
        else {
          var selected = 'Колонки: ';
          options.each(function() {
              selected += $(this).text() + ', ';
          });
          return selected.substr(0, selected.length -2);
        }
      },
      onDeselectAll: function() {
        self.selectedColumns = [];
        this.$select.find('option:selected').each(function(){
          if($(this).val()!="multiselect-all")
            self.selectedColumns.push($(this).val());
        });
        applyColumns();
      },
      onSelectAll: function() {
        self.selectedColumns = [];
        this.$select.find('option:selected').each(function(){
          if($(this).val()!="multiselect-all")
            self.selectedColumns.push($(this).val());
        });
        applyColumns();
      },
      onChange: function(element, checked) {
        self.selectedColumns = [];
        $(element[0]).parent().each(function(){
          $(this).find("option:selected").each(function(){
            if($(this).val()!="multiselect-all")
              self.selectedColumns.push($(this).val());
          });
        });
        applyColumns();
      }

    });

    // выставить чекбокс если сохранялист поьзовательские настройки
    this.$("#cbSaveFilters").prop('checked', false);
    if(this.userFiltersInfo && this.userFiltersInfo['checked']){
      this.$("#cbSaveFilters").prop('checked', true);
    }

    // показать подсказки
    this.$('.lbl-group-by-note').show();
  },

  /*
   * Смена вида отображения данных: объемы / стоимости
   */
  onChangeViewType: function(e){
    this.view_type = e.currentTarget.value;
    Backbone.trigger('global:on_change_view_type',[this, e.currentTarget.value]);
    Backbone.trigger('global:on_url_params_change',[self, 'view_type', e.currentTarget.value]);
  },

  /**
   * развернуть/свернуть форму данных
   */
  onMaximize: function(e)
  {
    var el = $(e.currentTarget);
    if(el.data('val') == "min")
    {
      el.data('val','max');
      el.html("свернуть");
      $(".page-title").hide();
      $(".navbar").hide();
      $(".mto-tabs").hide();
      $("#main-header").hide();
      $(".lbl-comments").hide();
      $(".data-comments").hide();
      $(".container1").addClass('maximize_container1').removeClass('container1');
    }
    else
    {
      el.data('val','min');
      el.html("развернуть");
      $(".page-title").show();
      $("#main-header").show();
      $(".mto-tabs").show();
      $(".navbar").show();
      $(".lbl-comments").show();
      $(".data-comments").show();
      $(".container1").removeClass('maximize_container1').addClass('container1');
    }
  },

  /**
   * Перестройка фильтра с элементами по которым идет группировка данных
   */
  rebuildFilterByGroups: function(ddl, values){
    $(ddl).find('option').prop('selected',false);
    for(var i in values)
      $(ddl).find('option[value="' + values[i] + '"]').prop('selected',true);
    for(var i in values)
      $(ddl).append($(ddl).find("option."+values[i]));
    $(ddl).multiselect('rebuild');
  },

  /**
   * Перестройка фильтра с колонками отображаемых данных
   */
  rebuildColumnsFilter: function(ddl, values){
    $(ddl).find('option').prop('selected',false);
    for(var i in values)
      $(ddl).find('option[value="' + values[i] + '"]').prop('selected',true);
    $(ddl).multiselect('rebuild');
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
    * Заполенение заказов
    */
  fillOrders: function(ddl, values, selected_values)
  {
    $(ddl).empty();
    for(var i in values)
    {
      values[i].checked = false;
      if(selected_values.indexOf(values[i].number.toString())>-1)
        values[i].checked = true;
      $(ddl).append(this.templates.item_templateOrder(values[i]));
    }
    $(ddl).multiselect('rebuild');
   },

  /**
   *  Событие нажатия на кнопку раскрытия групп
   */
  OnCollapse: function(e)
  {
    var cur_btn = $(e.currentTarget);
    if(cur_btn.data("state")=="collapsed")
    {
       cur_btn.data("state","unCollapsed").html('&nbsp;Закрыть группы').prepend('<i class = "fa fa-folder-open"></i>');
       Backbone.trigger('global:collapse',[this, true, cur_btn]);
    }
    else
    {
       cur_btn.data("state","collapsed").html('&nbsp;Раскрыть группы').prepend('<i class = "fa fa-folder"></i>');
       Backbone.trigger('global:collapse',[this, false, cur_btn]);
    }
  },

  /**
   * Получение URL
   */
  getUrl: function(replase_tags)
  {
    var replase_tags = replase_tags || false;
    var url = "";
    url += 'search/1';

    // договоры
    if(this.selectedContracts.length>0)
      url += "/contracts/"+ this.selectedContracts.join(",");
    // заказы
    if(this.selectedOrders.length>0)
      url += "/orders/"+ this.selectedOrders.join(",");
    // направления работ
    if(this.selectedSectorTypes.length>0)
      url += "/sector_types/"+ this.selectedSectorTypes.join(",");
    // получение участков
    if(this.selectedSectors.length>0)
      url += "/sectors/"+ this.selectedSectors.join(",");
    // получение групп материалов
    if(this.selectedMaterialGroups.length>0)
      url += "/material_groups/"+ this.selectedMaterialGroups.join(",");
    // получение граппировки
    if(this.selectedGroups.length>0)
      url += "/group_by/"+ this.selectedGroups.join(",");
    // получение отображаемых колонок
    if(this.selectedColumns.length>0)
      url += "/columns/"+ this.selectedColumns.join(",");
    // получение статусов
    if(this.selectedStatuses.length>0)
      url += "/status/"+ this.selectedStatuses.join(",");
    // текущий таб данных
    url += "/current_tab/"+ ((this.current_tab!=undefined && this.current_tab) ? this.current_tab : '');
    // текущий вид отображения данных
    url += "/view_mode/"+ ((this.view_mode!=undefined && this.view_mode) ? this.view_mode : '');
    // текущий тип отображения данных
    url += "/view_type/"+ ((this.view_type!=undefined && this.view_type) ? this.view_type : '');
    // фильтры для таблицы основных данных
    url += "/table_filters/"+ App.dataListView.getTableFilters();
    return url.split(' ').join('%20');
  },
  /**
   * Select tab event
   */
  onTabClicked:function(e){
    e.preventDefault();
    $("#mto-import-data-history").hide();
    $("#data-body").hide();
    switch($(e.currentTarget).data('type'))
    {
      case 'body':
        $("#data-body").show();
      break;
      case 'import_data_history':
        $("#mto-import-data-history").show();
      break;
    }
    this.current_tab = $(e.currentTarget).data('type');
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
  setFilters: function(filters)
  {
    var self = this;
    this.current_tab = filters.current_tab;
    this.view_mode = filters.view_mode;
    this.view_type = filters.view_type;
    this.selectedContracts = filters.contracts;
    this.selectedOrders = filters.orders;
    this.selectedSectorTypes = filters.sector_types;
    this.selectedSectors = filters.sectors;
    this.selectedMaterialGroups = filters.material_groups;
    this.selectedGroups = filters.group_by;
    this.selectedColumns = filters.columns;
    this.selectedStatuses = filters.status;
    App.dataListView.setTableFilters(filters.table_filters);

    // заполнение спика договров
    this.fillStaticList(this.$(".ddl-contracts"), this.selectedContracts);
    // заполнение заказов
    var filtered_orders = (this.selectedContracts && this.selectedContracts.length>0)? this.ordersList.filter(function(row){
      return self.selectedContracts.indexOf(row.number.split('.')[0])>-1;
    }): [];
    this.fillOrders(this.$(".ddl-orders"), filtered_orders, this.selectedOrders);
    // заполнение спика направление работ
    this.fillStaticList(this.$(".ddl-sector-types"), this.selectedSectorTypes);
    // заполнение участков
    var filtered_sectors = (this.selectedSectorTypes && this.selectedSectorTypes.length > 0)? this.sectorsList.filter(function(row){
      return self.selectedSectorTypes.indexOf(row['type'])>-1;
    }): [];
    this.fillSectors(this.$(".ddl-sectors"), filtered_sectors, this.selectedSectors);
    // заполнение списка групп материалов
    this.fillStaticList(this.$(".ddl-materialsgroups"), this.selectedMaterialGroups);
    // заполнение списка статусов
    this.fillStaticList(this.$(".ddl-status"), this.selectedStatuses);
    // заполнение списка по кому идет группировка
    this.rebuildFilterByGroups(this.$(".ddl-groupby"), this.selectedGroups);
    // заполнение списка отображаемых колонок
    this.rebuildColumnsFilter(this.$(".ddl-columns"), this.selectedColumns);
    // тип отображения
    //this.view_type = filters.view_type;
    this.$('.ddl-view-type').find('option').prop('selected',false);
    this.$('.ddl-view-type').find('option[value="' + this.view_type + '"]').prop('selected',true);
  },

  /**
   * Подготовка фильтров
   */
  prepareFilters: function(filters){
    var result = {};
    for(var i in filters)
      result[i] = filters[i];

    // orders
    var order_numbers = [];
    if(filters.contracts){
      for(var i in filters.contracts){
        var contract_number = filters.contracts[i];
        var tmp_orders = [];
        for(var j in filters.orders){
          var order_number = filters.orders[j];
          if(order_number.indexOf(contract_number.toString()+'.')==0)
            tmp_orders.push(order_number);
        }
        if(tmp_orders.length>0)
          order_numbers = order_numbers.concat(tmp_orders);
        else{
          for(var j in this.ordersList){
            var order_number = this.ordersList[j]['number'];
            if(order_number.indexOf(contract_number.toString()+'.')==0)
              order_numbers.push(order_number);
          }
        }
      }
    }
    result['orders'] = order_numbers;

    // sectors
    var sector_numbers = [];
    var selected_sectors = [];
    for(var i in filters.sectors){
      var sector_number = filters.sectors[i];
      for(var j in this.sectorsList){
        if(this.sectorsList[j]['code'].toString() == sector_number)
        {
          selected_sectors.push(this.sectorsList[j]);
          break;
        }
      }
    }
    if(filters.sector_types){
      for(var i in filters.sector_types){
        var sector_type = filters.sector_types[i];
        var tmp_sector_numbers = [];
        for(var j in selected_sectors){
          var sector = selected_sectors[j];
          if(sector['type'] == sector_type)
            tmp_sector_numbers.push(sector['code'].toString());
        }
        if(tmp_sector_numbers.length>0)
          sector_numbers = sector_numbers.concat(tmp_sector_numbers);
        else{
          for(var j in this.sectorsList){
            var sector = this.sectorsList[j];
            if(sector['type'] == sector_type)
              sector_numbers.push(sector['code'].toString());
          }
        }
      }
    }
    result['sectors'] = sector_numbers;
    return result;
  },

  /**
   *  Load data function
   */
  loadData:function(filters){
    var self = this;
    // заполнение контролов фильтров
    self.setFilters(filters);
    if(filters.search != '1')
      return;

    // сбор данных для запроса на сервер
    var order_numbers = [];
    if(filters.contracts){
      for(var i in filters.contracts){
        var contract_number = filters.contracts[i];
        var tmp_orders = [];
        for(var j in filters.orders){
          var order_number = filters.orders[j];
          if(order_number.indexOf(contract_number.toString()+'.')==0)
            tmp_orders.push(order_number);
        }
        if(tmp_orders.length>0)
          order_numbers = order_numbers.concat(tmp_orders);
        else{
          for(var j in this.ordersList){
            var order_number = this.ordersList[j]['number'];
            if(order_number.indexOf(contract_number.toString()+'.')==0)
              order_numbers.push(order_number);
          }
        }
      }
    }

    var sector_numbers = [];
    var selected_sectors = [];
    for(var i in filters.sectors){
      var sector_number = filters.sectors[i];
      for(var j in this.sectorsList){
        if(this.sectorsList[j]['code'].toString() == sector_number)
        {
          selected_sectors.push(this.sectorsList[j]);
          break;
        }
      }
    }

    if(filters.sector_types){
      for(var i in filters.sector_types){
        var sector_type = filters.sector_types[i];
        var tmp_sector_numbers = [];
        for(var j in selected_sectors){
          var sector = selected_sectors[j];
          if(sector['type'] == sector_type)
            tmp_sector_numbers.push(sector['code'].toString());
        }
        if(tmp_sector_numbers.length>0)
          sector_numbers = sector_numbers.concat(tmp_sector_numbers);
        else{
          for(var j in this.sectorsList){
            var sector = this.sectorsList[j];
            if(sector['type'] == sector_type)
              sector_numbers.push(sector['code'].toString());
          }
        }
      }
    }

    // загрузхка данных с сервера
    Routine.showLoader();
    if(this.xhr)
      this.xhr.abort();
    this.xhr = $.ajax({
      url: '/handlers/planecalculation/get_mto_data',
      type: 'POST',
      dataType: 'json',
      contentType: "application/json; charset=utf-8",
      data: JSON.stringify({
        contracts: filters.contracts,
        orders: order_numbers,
        sector_types: filters.sector_types,
        sectors: selected_sectors,
        material_groups: filters.material_groups,
        status: filters.status
      }),
      timeout: 35000,
      async: true
    }).done(function(result) {
      if(result['status']=="error")
      {
        $.jGrowl(result['msg'], {'themeState':'growl-error', 'sticky':false, life: 10000 });
        // обвновлене данных на форме
        App.DataCollection.reset();
        App.CommentsCollection.reset();
        App.IntegraHistoryCollection.reset();
        App.dataListView.render(self.selectedGroups, self.selectedColumns);
        App.importDataHistoryListView.render();
      }
      else
      {
        // обвновлене данных на форме
        App.DataCollection.reset();
        App.CommentsCollection.reset();
        App.DataCollection.add(new App.Collections.DataCollection(result['data']).models);
        App.CommentsCollection.add(new App.Collections.CommentsCollection(result['comments']).models);
        App.IntegraHistoryCollection.add(new App.Collections.IntegraHistoryCollection(result['integra_dates']).models);
        App.dataListView.render(self.selectedGroups,self.selectedColumns, false, self.view_type);
        App.importDataHistoryListView.render();
      }
    }).error(function(){
      App.dataListView.render();
      App.importDataHistoryListView.render();
      $.jGrowl('Ошибка получения данных. Повторите попытку. ', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
    }).always(function(){ Routine.hideLoader(); });

    // выбрать необходимый таб
    // Backbone.trigger('global:on_change_view_mode',[this,'list']);
  },

  /**
   * Скачать статистику
   */
  onDownloadStat: function(e){
    // сбор данных для запроса на сервер
    var order_numbers = [];
    if(this.selectedContracts){
      for(var i in this.selectedContracts){
        var contract_number = this.selectedContracts[i];
        var tmp_orders = [];
        for(var j in this.selectedOrders){
          var order_number = this.selectedOrders[j];
          if(order_number.indexOf(contract_number.toString()+'.')==0)
            tmp_orders.push(order_number);
        }
        if(tmp_orders.length>0)
          order_numbers = order_numbers.concat(tmp_orders);
        else{
          for(var j in this.ordersList){
            var order_number = this.ordersList[j]['number'];
            if(order_number.indexOf(contract_number.toString()+'.')==0)
              order_numbers.push(order_number);
          }
        }
      }
    }
    if(order_numbers.length < 1)
      $.jGrowl('Не заданы заказы для выгрузки статистики.', { 'themeState':'growl-error', 'sticky':false });
    else
      window.open('handlers/planecalculation/get_statistic/?num='+order_numbers.join(','));
  },

  /**
   * Распечатать то, что отображается пользователю
   */
  onPrint: function(e){
    window.print();
  },
});
