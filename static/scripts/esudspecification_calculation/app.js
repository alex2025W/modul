///
/// Глобальная структура
///
var App = {
  Models: {},
  Views:{},
  Collections:{},
  Route:null,
  ControlPanelView: null,
  DataViewBuyItems: null,    // отображение покупных изделий
  DataViewOwnItems: null,   // отображение изделий собственного производства
  DataViewplanNorms: null, // отображение плановых норм по покупным изделиям
  SystemObjects: [],                // список системных объектов-констант
  SystemObjectsIDS: [],         // список идентификаторов системных объектов
  showShifrs: false,                  // флаг, указывающий необходимость отображения шифров

  /**
   *  Инициализация необходимых объектов
  **/
  initialize: function(system_objects)
  {
    // Если поступила информация об изделии
    // системные объекты
    this.SystemObjects = system_objects;
    for(var i in system_objects['items_detail'])
      this.SystemObjectsIDS.push(system_objects['items_detail'][i]['_id']);
    //var item_model =  new App.Models.ItemModel(specification_info);
    // основная контрольная панель
    this.ControlPanelView =  new  App.Views.ControlPanelView();
    // представление покупных объектов
    this.DataViewBuyItems =  new  App.Views.DataViewBuyItems();
    // представление объектов собственного производства
    this.DataViewOwnItems =  new  App.Views.DataViewOwnItems();
    // представление плановых норм покупных изделий
    this.DataViewPlanNorms =  new  App.Views.DataViewPlanNorms();
    this.Route = new AppRouter();
    Backbone.history.start();
  }
};

///
/// Подключение роутеров
///
var AppRouter = Backbone.Router.extend({
  UrlParams: {
    'complects': '',
    'uncomplect':'no',
    'specifications':'',
    'use_stock':'',
    'stock_order_number': '',
    'use_returned_waste': '',
    'use_not_returned_waste': '',
    'use_cut_templates': 'no',
    'send_to_google': 'no'
  },
  routes: {
    "": "index",
    ":number": "index",
    "*path": "index"
  },

  initialize: function()
  {
    // глобальное событие на изменение параметров URL адреса
    Backbone.on("global:on_url_params_change",this.onSaveUrlHistory,this);
  },

  index:function(query){
    this.doQuery(query);
  },

  /**
    * Парсинг URl параметров
  **/
  doQuery: function(query){
    // функция заполнения структуры команд
    function parse_commands(urlParams, query)
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
    }

    // функция заполнения структуры спецификаций
    function parse_specifications(query)
    {
      var result = [];
      if(query)
      {
          var tmp_specifications = query.split(';');
          if(tmp_specifications.length>0)
            for(var key in tmp_specifications)
            {
              var row = tmp_specifications[key];
              var row_arr = row.split('#');
              var tmp_res = {'number': '', 'count': 1};
              if(row_arr.length>1)
                tmp_res['count'] = Routine.strToInt(row_arr[1]);
              if(row_arr.length>0 && row_arr[0])
              {
                tmp_res['number'] = row_arr[0];
                result.push(tmp_res);
              }
            }
      }
      return result;
    }

    if(query)
    {
      parse_commands(this.UrlParams, query);
      var complects = parse_specifications(this.UrlParams['complects']);
      var specifications = parse_specifications(this.UrlParams['specifications']);
      if((!complects || complects.length == 0) && specifications && specifications.length>0)
        this.UrlParams['uncomplect'] = 'yes';
      else if((!complects || complects.length == 0) && (!specifications || specifications.length==0))
        this.UrlParams['uncomplect'] = 'none';
      // выставление правильного URL
      this.navigate("/"+this.buildUrl(), false);
      // запуск процедуры подгрузки и отображения фильтров
      App.ControlPanelView.loadFilters(complects, this.UrlParams['uncomplect'] , specifications, this.UrlParams['use_stock'], this.UrlParams['stock_order_number'], this.UrlParams['use_returned_waste'], this.UrlParams['use_not_returned_waste'], this.UrlParams['use_cut_templates'], this.UrlParams['send_to_google']);
    }
    else
    {
        this.UrlParams['specifications'] = '';
        this.UrlParams['complects'] = '';
        this.UrlParams['use_stock'] = 'no';
        this.UrlParams['uncomplect'] = 'no';
        this.UrlParams['stock_order_number'] = '';
        this.UrlParams['use_returned_waste'] = '';
        this.UrlParams['use_not_returned_waste'] = '';
        this.UrlParams['use_cut_templates'] = 'no';
        this.UrlParams['send_to_google'] = 'no';
        this.navigate("/"+this.buildUrl(), true);
        return;
    }
  },

  /**
    * Построение строки URL по текущим параметрам
  **/
  buildUrl: function(){
    var arr = [];
    for(var key in this.UrlParams)
    {
      arr.push(key);
      arr.push(this.UrlParams[key]);
    }
    return arr.join("/");
  },

   /**
    * Изменение и сохранение параметров URL
  **/
  onSaveUrlHistory:function(params){
    var url = params[1];
    params = url.split('&');
    for(var i in params)
    {
      var tmp_param = params[i].split('=');
      var param_key = tmp_param[0];
      var param_value = tmp_param[1];
      if(param_key in this.UrlParams)
        this.UrlParams[param_key] = param_value;
    }
    this.navigate("/"+this.buildUrl(), false);
  }
});

