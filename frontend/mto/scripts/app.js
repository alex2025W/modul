var App = {
  Models: {},
  Views:{},
  Collections:{},
  UrlParams:  {},                      // параметры URL строки
  sectorsList: null,                   // справочник участков
  ordersList: null,                    // справочник заказов
  userFiltersInfo: null,               // сохраненные пользовательские фильтры
  DataCollection:null,                 // Коллекция данных
  dataListView:null,                   // Представление списка данных
  FindView: null,                      // Представление панели поиска данных

  /**
   *  Инициализайия необходимых объектов
   */
  initialize: function(ordersList, sectorsList, userFiltersInfo){
    // справочники
    this.ordersList = ordersList;
    this.sectorsList = sectorsList;
    this.userFiltersInfo = userFiltersInfo;
    // форма поиска данных
    this.FindView = new App.Views.FindView({
      ordersList: ordersList,
      sectorsList: sectorsList,
      userFiltersInfo: userFiltersInfo
    });
    // форма списка данных
    App.DataCollection = new App.Collections.DataCollection();
    App.CommentsCollection = new App.Collections.CommentsCollection();
    App.IntegraHistoryCollection = new App.Collections.IntegraHistoryCollection();
    App.dataListView = new App.Views.DataListView({'collection':App.DataCollection, 'comments': App.CommentsCollection});
    App.importDataHistoryListView = new App.Views.ImportDataHistoryListView({'collection':App.IntegraHistoryCollection});
    // роутинг
    this.Route = new AppRouter(this);
    Backbone.history.start();
    // глобальное событие на изменение параметров URL адреса
    Backbone.on("global:on_url_params_change",this.onSaveUrlHistory,this);
  },

  /**
   * Изменение и сохранение параметров URL
   */
  onSaveUrlHistory:function(params){
    var param_key = params[1];
    var param_value = params[2];
    var reload = false || params[3];
    if(param_key in this.UrlParams)
      this.UrlParams[param_key] = param_value;
    this.Route.navigate("/"+ this.buildUrl(this.UrlParams), reload);
  },

  /**
   * Парсинг URL параметров
   */
  parse_commands: function(query,urlParams)
  {
    var tmpCommands = query.split('/');
    if(tmpCommands.length>0)
    {
      for(var key in urlParams)
      {
        var i = 0;
        for(var ci in tmpCommands)
        {
          var command = tmpCommands[i];
          if(key == command && (i+1)<= tmpCommands.length && tmpCommands[i+1])
            urlParams[key] = tmpCommands[i+1];
          i++;
        }
      }
    }
  },

  /**
   * Обработка запроса с объектами входных параметров
   */
  doQueryByParams: function(UrlParams){
    this.doQuery("/"+this.buildUrl(UrlParams))
  },

  /**
   * Обработка запроса
   */
  doQuery: function(query){
    var query = query || '';
    // если сохранены настройки пользователя и нет текущих параметров с формы
    if(!query && this.userFiltersInfo && this.userFiltersInfo['checked']) {
      var filters = this.userFiltersInfo['filters'];
      // вызвать обработка запроса
      this.doQueryByParams(filters);
      return;
    }
    if(query) {
      var defaultColumns = [
        'order_number',
        'material_group_key',
        'material_key',
        'material_name',
        'unique_props_name',
        'note',
        'unit_pto',
        'pto_size',
        'price',
        'pto_size_confirmed',
        'inpay',
        'payed',
        'onstore',
        'onwork',
        'not_onwork',
        'not_payed'
      ];
      // отображение списка данных
      this.UrlParams = {
        search: '1',
        contracts: '',          // список номеров договоров
        orders: '',             // список номеров заказов
        sector_types: '',       // список типов участков
        sectors: '',            // список участков
        table_filters: '{}',    // список фильтров табличных
        current_tab: 'body',    // текущий выбранный таб
        material_groups: '',    // список групп материалов
        status: '',             // [pto, inpay, payed, onstore, onwork, notonwork, notpayed]
        view_mode: 'common',    // [common/full]
        view_type: 'volumes',   // [volumes/prices]
        group_by: '',           //'order_number,sector_code,material_group_key'
        columns: defaultColumns.join(','),
      };

      if(query)
        this.parse_commands(query, this.UrlParams);
      // выставление правильного URL
      this.Route.navigate("/"+this.buildUrl(this.UrlParams), false);

      // запуск процедуры подгрузки и отображения списка данных
      this.FindView.loadData({
        contracts: this.UrlParams['contracts']?this.UrlParams['contracts'].split(','):[],
        orders: this.UrlParams['orders']?this.UrlParams['orders'].split(','):[],
        sector_types: this.UrlParams['sector_types']?this.UrlParams['sector_types'].split('%20').join(' ').split(','):[],
        sectors: this.UrlParams['sectors']?this.UrlParams['sectors'].split('%20').join(' ').split(','):[],
        current_tab: this.UrlParams['current_tab'],
        view_mode: this.UrlParams['view_mode'],
        table_filters: this.UrlParams['table_filters'] ? JSON.parse(this.UrlParams['table_filters'].split('%20').join(' ')) : {},
        columns: this.UrlParams['columns'] ? this.UrlParams['columns'].split('%20').join(' ').split(',') : defaultColumns,
        material_groups: this.UrlParams['material_groups']?this.UrlParams['material_groups'].split(','):[],
        group_by: this.UrlParams['group_by']?this.UrlParams['group_by'].split(','):[],
        status: this.UrlParams['status']?this.UrlParams['status'].split(','):[],
        search: this.UrlParams['search'],
        view_type: this.UrlParams['view_type'],
      });
    }
  },

  /**
   * Построение строки URL по текущим параметрам
   */
  buildUrl: function(UrlParams){
    var arr = [];
    for(var key in UrlParams)
    {
      arr.push(key);
      arr.push(UrlParams[key]);
    }
    return arr.join("/");
  },

  /**
   * Smart reload page
   */
  reloadPage: function(){
    this.FindView.onSearch(false);
  },

  /**
   * Сохранить пользовательские настрокйи
   */
  save_user_settings: function(val, filters_str){
    var filters = {
      contracts: '',
      orders: '',
      sector_types: '',
      sectors: '',
      material_groups: '',
      group_by: '',
      columns: '',
      status: '',
      table_filters: '{}',
      current_tab: 'body',
      view_mode: 'common',
      search: '0',
      view_type: 'volumes'
    };
    if(filters_str)
      this.parse_commands(filters_str, filters);
    filters.search = '0';
    // отправлка запроса на сервер
    $.ajax({
      url: '/handlers/user/save_page_settings/',
      type: 'POST',
      dataType: 'json',
      contentType: "application/json; charset=utf-8",
      data: JSON.stringify({
        'page':'mto',
        'checked': val,
        'filters': filters
      }),
      timeout: 35000,
      async: true
    }).done(function(result) {
      if(result['status']=="error")
        $.jGrowl(result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 10000 });
    }).error(function(){
        $.jGrowl('Ошибка сохранения настроек фильтров. Повторите попытку. ', {
          'themeState':'growl-error', 'sticky':false, life: 10000
        });
    }).always(function(){});
  }
};
