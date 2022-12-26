var App = {
  filters:null,
  claimlist:null,
  router:null,
  models:[],
  views:{},
  initialize:function(){
    App.views.DocumentsList = new DocumentsList();
    App.filters = new Filters();
    this.Route = new AppRouter();
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
    if(param_key in this.UrlParams)
      this.UrlParams[param_key] = param_value;
    this.Route.navigate("/"+this.buildUrl(), false);
  },
  /**
   * Парсинг URl параметров
   */
  doQuery: function(query){
    // функция заполнения структуры команд
    function parse_commands(urlParams)
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
    // отображение форм построения  [contract, order, work_order]
    this.UrlParams={'orders':'', 'sections':'', 'stage':'', 'is_agreed':'', 'last_redaction':'yes', 'group_sections':'no', 'page':1};
    var tmpCommands = query? query.split('/'):[];
    // если в URL передан только номер заказа
    // меняем запрос на правильный и выпоняем построение
    if(tmpCommands.length>0)
      parse_commands(this.UrlParams);
    // выставление правильного URL
    this.Route.navigate("/"+this.buildUrl(), false);
    // вызов метода установления фильтров панели фильтрации
    App.filters.setInfo(this.UrlParams);
  },
  /**
   * Построение строки URL по текущим параметрам
   */
  buildUrl: function(){
    var arr = [];
    for(var key in this.UrlParams)
    {
      arr.push(key);
      arr.push(this.UrlParams[key]);
    }
    return arr.join("/");
  }
};
