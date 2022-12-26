///
/// Глобальная структура
///
var App = {
  UrlParams:  {},                      // параметры URL строки
  Models: {},                          // модели данных
  Views:{},                            // представления
  Collections:{},                      // коллекции
  FindView: null,                      // представление панели поиска и фильтрации данных
  MainView: null,                      // представление контейнера для всех форм
  isGoogleChartsLibraryLoaded: false,  // флаг о завершенности загрузки библиотеки google charts
  initialize: function(user_filters_info)
  {
    this.user_filters_info = user_filters_info;
    // Создание представлений
    this.MainView = new App.Views.MainView();
    this.FindView = new App.Views.FindView({
      'user_filters_info': user_filters_info
    });
    // подключение роутинга
    this.Route = new AppRouter(this);
    Backbone.history.start();
    // глобальное событие на изменение параметров URL адреса
    Backbone.on("global:on_url_params_change",this.onSaveUrlHistory,this);
  },

  googleChartsLibraryLoadingComplete: function(){
    App.isGoogleChartsLibraryLoaded = true;
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
          if(key == command && (i+1)<= tmpCommands.length)
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

    // проверка на вид отображения данных, списка или детализации
    if(query && query.indexOf("search")>-1) {
      if(!query && this.user_filters_info && this.user_filters_info['checked']) {
        var filters = this.user_filters_info['filters'];
        // вызвать обработка запроса
        this.doQueryByParams(filters);
        return;
      }

      // отображение списка данных
      this.UrlParams =  {
        'search': '1',
        'orders':'',
        'sectors':'',
        'need_date': 'no',
        'date_from': '',
        'date_to': '',
        'table_filters':'{}',
        'current_tab': 'data-charts' // data-table / data-charts
      };

      if(query)
        this.parse_commands(query, this.UrlParams);
      // выставление правильного URL
      this.Route.navigate("/"+this.buildUrl(this.UrlParams), false);

      // запуск процедуры подгрузки и отображения списка данных
      this.FindView.loadData(
        this.UrlParams['orders']?this.UrlParams['orders'].split(','):[],
        this.UrlParams['sectors']?this.UrlParams['sectors'].split('%20').join(' ').split(','):[],
        this.UrlParams['need_date'],
        this.UrlParams['date_from'].split('_').join('.'),
        this.UrlParams['date_to'].split('_').join('.'),
        this.UrlParams['current_tab'],
        this.UrlParams['table_filters'] ? JSON.parse(this.UrlParams['table_filters'].split('%20').join(' ')) : {}
      );
      this.MainView.setTab(this.UrlParams['current_tab']);
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
   * Сохранить пользовательские настрокйи
   */
   save_user_settings: function(val, filters_str){
    var filters =  {
      'orders':'',
      'sectors':'',
      'need_date': '',
      'date_from':'',
      'date_to': ''
    };
    if(filters_str)
      this.parse_commands(filters_str, filters);
    // отправлка запроса на сервер
    $.ajax({
      url: '/handlers/user/save_page_settings/',
      type: 'POST',
      dataType: 'json',
      contentType: "application/json; charset=utf-8",
      data: JSON.stringify({
        'page':'joblog_statistic',
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

///
/// Подключение роутеров
///
var AppRouter = MyRouter.extend({
  routes: {
    "": "index",
    ":query": "index",
    "*path": "index"
  },
  initialize: function(app){
    this.app = app;
  },
  index:function(query){
    this.app.doQuery(query);
  }
});
