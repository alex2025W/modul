///
/// Глобальная структура
///
var App = {
  UrlParams:  {},                      // параметры URL строки
  Models: {},                          // модели данных
  Views:{},                            // представления
  Collections:{},                      // коллекции
  CurrentWorkOrder: null,              // текущий откртый наряд
  Works: null,                         // справочник работ
  FindView: null,                      // представление панели поиска и фильтрации данных
  DatesTransferView: null,             // представление переноса сроков
  sectorsList: null,                   // справочник участков
  Teams: null,                         // справочник всех бригад на всех участках
  PlanShiftReasonSystemObjects: null,  // список идентификаторов системных причин переноса плановых сроков
  AllWorkers: null,                    // список всех пользователей с ролью = "рабочий"
  Weekends: [],                        // список выходных дней
  Statuses: {                          // список возможных статусов работ
    'completed': 'Выполнена',
    'on_work':'В работе',
    'on_work_with_reject':'В работе с отклонением',
    'on_pause': 'Приостановлена',
    'on_hold': 'Простой'
  },

  initialize: function(sectorsList, teams, planshiftreason_system_objects, all_workers, weekends, user_filters_info, time_sheet_reasons)
  {
    this.user_filters_info = user_filters_info;
    this.sectorsList = sectorsList;
    this.Teams = teams;
    this.PlanShiftReasonSystemObjects = planshiftreason_system_objects;
    this.AllWorkers = all_workers;
    this.Weekends = weekends;
    this.time_sheet_reasons = time_sheet_reasons;
    // Создание представлений
    this.MainView = new App.Views.MainView();
    this.FindView = new App.Views.FindView({
      'sectorsList': sectorsList,
      'user_filters_info': user_filters_info
    });
    this.DatesTransferView = new App.Views.DatesTransferView();
    // подключение роутинга
    this.Route = new AppRouter(this);
    Backbone.history.start();
    // глобальное событие на изменение параметров URL адреса
    Backbone.on("global:on_url_params_change",this.onSaveUrlHistory,this);
  },

  /**
   * Изменение и сохранение параметров URL
   */
  onSaveUrlHistory:function(params){
    console.log('onSaveUrlHistory');
    var param_key = params[1];
    var param_value = params[2];
    var reload = false || params[3];
    if(param_key in this.UrlParams)
      this.UrlParams[param_key] = param_value;
    //this.Route.navigate("/"+ Routine.zipStr(this.buildUrl(this.UrlParams)), true);
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
  doQuery: function(query, notFirstLoad){
    var query = query || '';
    var notFirstLoad = notFirstLoad || false;

    // проверка на вид отображения данных, списка или детализации
    if(!query || query.indexOf("list")>-1)
    {
      if(!query && this.user_filters_info && this.user_filters_info['checked']){
        var filters = this.user_filters_info['filters']
        // вызвать обработка запроса
        this.doQueryByParams(filters);
        return;
      }

      // отображение списка данных
      this.UrlParams =  {
        'list': '1',
        'orders':'',
        'sectortypes':'',
        'sectors':'',
        'factstatus':'',
        'date': moment().format('DD.MM.YYYY').split('.').join('_'),
        'current_tab': 'main_data' // main_data / data_ktu_statistic
      };
      if(query)
        this.parse_commands(query, this.UrlParams);
      if(!this.UrlParams['date'])
        this.UrlParams['date'] = moment().format('DD.MM.YYYY').split('.').join('_');

      // выставление правильного URL
      //this.Route.navigate("/"+Routine.zipStr(this.buildUrl(this.UrlParams)), false);
      this.Route.navigate("/"+this.buildUrl(this.UrlParams), false);

      // запуск процедуры подгрузки и отображения списка данных
      this.FindView.loadListData(
        Routine.strToInt(this.UrlParams['list']),
        this.UrlParams['orders']?this.UrlParams['orders'].split(','):[],
        this.UrlParams['sectortypes']?this.UrlParams['sectortypes'].split('%20').join(' ').split(','):[],
        this.UrlParams['sectors']?this.UrlParams['sectors'].split('%20').join(' ').split(','):[],
        this.UrlParams['factstatus'],
        this.UrlParams['date'].split('_').join('.')
      );

      this.MainView.setTab(this.UrlParams['current_tab']);
    }
    else
    {
      // отображение формы детализации наряда
      this.UrlParams =  {'number': ''};
      var tmpCommands = query.split('/');
      // меняем запрос на правильный и выпоняем построение
      if(tmpCommands.length==1)
        this.UrlParams['number']  = tmpCommands[0];
      else if(tmpCommands.length>0)
        this.parse_commands(query, this.UrlParams);
      // выставление правильного URL
      this.Route.navigate("/"+this.buildUrl(this.UrlParams), false);
      // запуск процедуры поиска конфигурации/спецификации
      this.FindView.doSearch(this.UrlParams['number'], notFirstLoad);
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
   *  Сохранение всех данных
   */
  save: function(dataToSave)
  {
     //console.log(dataToSave);
     Routine.showLoader();
     $.ajax({
      type: "PUT",
      url: "/handlers/joblog/savedata",
      data: JSON.stringify(dataToSave),
      timeout: 35000,
      contentType: 'application/json',
      dataType: 'json',
      async:true
      }).done(function(result) {
          if(result['status']=="ok")
          {
            // обновление формы
            $.jGrowl('Данные успешно сохранены .', { 'themeState':'growl-success', 'sticky':false, life: 10000 });
            // вызов перерисовки формы наряда
            App.FindView.OnOpenWorkOrder();
            // закрытие формы переноса дат
            App.DatesTransferView.close();
          }
          else
            $.jGrowl('Ошибка сохранения данных.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      }).fail(function(jqXHR, textStatus, errorThrown ) {
          $.jGrowl('Ошибка сохранения данных. Подробности:' + errorThrown, { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      }).always(function(){Routine.hideLoader();});
  },

  /**
   *  Сохранение данных по трудовому участию
   */
  save_workers: function(dataToSave)
  {
     Routine.showLoader();
     $.ajax({
      type: "PUT",
      url: "/handlers/joblog/save_workers",
      data: JSON.stringify(dataToSave),
      timeout: 35000,
      contentType: 'application/json',
      dataType: 'json',
      async:true
      }).done(function(result) {
        Routine.hideLoader();
        if(result['status']=="ok")
        {
          // обновление формы
          $.jGrowl(
            'Данные успешно сохранены .',
            { 'themeState':'growl-success', 'sticky':false, life: 10000 }
          );
          App.FindView.OnOpenWorkOrder();
        }
        else
          $.jGrowl('Ошибка сохранения данных. Подробности: ' + result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      }).fail(function(jqXHR, textStatus, errorThrown ) {
        $.jGrowl('Ошибка сохранения данных. Подробности:' + errorThrown, { 'themeState':'growl-error', 'sticky':false, life: 10000 });
        Routine.hideLoader();
      });
  },

  /**
   * Сохранить пользовательские настрокйи
   */
   save_user_settings: function(val, filters_str){
    var filters =  {
      'list': '1',
      'orders':'',
      'sectortypes':'',
      'sectors':'',
      'factstatus':'',
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
        'page':'joblog',
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
