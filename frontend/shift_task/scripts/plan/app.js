///
/// Глобальная структура
///
var App = {
  Models: {},
  Views:{},
  Collections:{},
  Route:null,
  ControlPanelView: null,
  DataView: null,                     // представление формы основоных данных
  weekends: [],                        // список выходных дней
  orders: [],                                // список доступных заказов
  sectors_collection : null,    // коллекция участков
  templates_collection : null,    // коллекция шаблонов раскроя
  full_order_params : null,    // статистическая информация обо всем заказе
  items_collection : null,        // коллекция элементов - спецификаций
  order_info: null,                     // текущий заказ
  all_used_specifications: null, // список всех задействованных спецификаций в задании
  UrlParams:  {},                          // параметры URL строки

  /**
   *  Инициализация необходимых объектов
  **/
  initialize: function(weekends, orders)
  {
    // выходные дни
    this.weekends = weekends;
    // заказы
    this.orders = orders;
    // контрольная панель
    this.ControlPanelView =  new  App.Views.ControlPanelView(orders);
    // форма основных данных
    this.DataView =  new  App.Views.DataView();
    this.Route = new AppRouter();
    Backbone.history.start();
    // глобальное событие на изменение параметров URL адреса
    Backbone.on("global:on_url_params_change",this.onSaveUrlHistory,this);
  },

  /**
    * Изменение и сохранение параметров URL
  **/
  onSaveUrlHistory:function(params){
    var param_key = params[1];
    var param_value = params[2];
    if(param_key in this.UrlParams)
      this.UrlParams[param_key] = param_value;
    this.Route.navigate("/"+this.buildUrl(), false);
  },

  /**
    * Парсинг URl параметров
  **/
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

     // отображение форм построения спецификации
    this.UrlParams =  {'number': '', 'tab': "1", 'group_by_sectors': true };
    var tmpCommands = (query) ? query.split('/') : [];
    // если в URL передан только номер заказа
    // меняем запрос на правильный и выпоняем построение
    if(tmpCommands.length==1)
        this.UrlParams['number']  = tmpCommands[0];
    else if(tmpCommands.length>0)
      parse_commands(this.UrlParams);
    // выставление правильного URL
    this.Route.navigate("/"+this.buildUrl(), false);
    // запуск процедуры поиска конфигурации/спецификации
    this.currentItemNumber = this.UrlParams['number'];
    this.ControlPanelView.doSearch(this.UrlParams['number'], this.UrlParams['group_by_sectors']=="true");
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
   *  Подготовка структур спецификаций
  **/
  prepare_specifications_struct: function(data)
  {
    this.specifications_struct = null;
    if(data)
    {
      this.specifications_struct = {};
      for(var i in data)
        this.specifications_struct[data[i]['number']] = data[i]['struct'];
    }
  },

  /**
   *  Получение всех составных спецификаций, входящих в заданную
   * и изготавливаемых на заданном участке
  **/
  calculate_specification_childs: function(specifications, sector_id)
  {
    var result = {};
    // рекурсивная функция получения спецификаций по участку
    function process_items(node, count, aloved_items_numbers, result)
    {
      if(node['items'] && node['items'].length>0)
      {
        for(var i in node['items'])
        {
          var row = node['items'][i];

          if(row['number'] in aloved_items_numbers)
          {
            if(row['number'] in result)
              result[row['number']]['count'] += Routine.strToFloat(row['count']['value']) * count;
            else
            {
              result[row['number']] = {
                'number': row['number'],
                'count':  Routine.strToFloat(row['count']['value']) * count
              };
            }
          }
           process_items(row, Routine.strToFloat(row['count']['value']) * count, aloved_items_numbers, result);
        }
      }
    }

    // получение всех спецификаций, производимых на заданном участке
    var items_by_sector = (sector_id)?this.items_collection.bySector(sector_id):this.items_collection;
    var items_by_sector_numbers = {};
    _.each(items_by_sector.models, function (item) {
        items_by_sector_numbers[item.get('number')] = item.get('number');
    }, this);
    // цикл по всем исходным спецификациям
    for(var i in specifications)
    {
      // рекурсия по дереву
      process_items(JSON.parse(specifications[i]['info']['struct']) , Routine.strToFloat(specifications[i]['count']), items_by_sector_numbers, result);
      // если задан сектор и исходный элемент сам изготавливается на заданном участке,то необходимо доабвить его в результат
      if(sector_id)
      {
        var current_item = this.items_collection.findWhere({'number': specifications[i]['number']});
        if (current_item)
        {
          current_item = current_item.toJSON();
          if(current_item['sector']['origin_id'] == sector_id)
          {
            if(current_item['number'] in result)
              result[current_item['number']]['count'] += Routine.strToFloat(specifications[i]['count']);
            else
              result[current_item['number']] = {
                    'number': current_item['number'],
                    'count': Routine.strToFloat(specifications[i]['count'])
              };
          }
        }
      }
    }
    return result;
  },

  /**
   *  Получение информации о спецификации по номеру
  **/
  get_specification_info: function(number)
  {
    return this.items_collection.findWhere({'number': number});
  }
};

