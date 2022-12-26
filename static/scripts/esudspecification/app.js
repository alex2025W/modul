///
/// Глобальная структура
///
var App = {
  Models: {},
  Views: {},
  Collections: {},
  Route:null,
  ControlPanelView: null,
  DataPanelView: null,
  ProductInfoView: null,
  SpecificationInfo: null,                            // сруктура текущей спецификации
  //ConfigurationInfo: null,                         // структура текущей конфигурации
  DataViewSpecificationBuilder: null,    // отображение формы построения спецификации
  DataViewSpecificationView: null,        // отображение формы дерева спецификации(режим просмотра)
  SpecificationListView: null,                   //  представление для отображения списка спецификаций
  SpecificationParentsListView: null,     //  представление для отображения списка спецификаций-родителей
  SpecificationListCollection: null,          //  коллекция списка спецификаций
  SpecificationHistoryView: null,             //  представление для отображения истории по спецификации
  TechnoMapView:null,                             // технологическая карта спецификации

  SystemObjects: [],                                    // список системных объектов-констант
  SystemObjectsIDS: [],                              // список идентификаторов системных объектов
  showShifrs: false,                     // флаг, указывающий необходимость отображения шифров
  currentItemNumber: null,        // артикул текущего открытого объекта(спецификации/конфигурации)
  UrlParams:  {},                          // параметры URL строки

  SpecificationsToCalculateCollection: null,       // список спецификаций, отобранных на расчет

  typeNames: {'operation':'Операция', 'material':'Материал', 'work':'Работа', 'product':'Изделие', 'library':'Библиотека', 'property':'Свойство', 'value':'Значение', 'unit':'Ед. измерения', 'product_model':'Модель изделия',  'product_model_buy':'Модель изделия покупного',  'product_model_complect':'Модель комплекта',  'product_model_buy_complect':'Модель покупного комплекта', 'product_buy':'Изделие покупное', 'template': 'Шаблон разделения', 'condition': 'Условие', 'condition_otbor':'Отбор', 'process': 'Тех. процесс'},
  shortTypeNames: {'operation':'О', 'material':'М', 'work':'Р', 'product':'И', 'library':'Б', 'property':'С','value':'З', 'unit':'Е','product_model':'МИ','product_model_buy':'МИП','product_model_buy_complect':'МИПК','product_model_complect':'МИК', 'product_buy':'ИП', 'template': 'ШР', 'condition': 'У', 'condition_otbor':'УО', 'process': 'ТПР'},

  /**
   *  Инициализация необходимых объектов
  **/
  initialize: function(system_objects, data_models)
  {
    // системные объекты
    this.SystemObjects = system_objects;
    for(var i in system_objects['items_detail'])
      this.SystemObjectsIDS.push(system_objects['items_detail'][i]['_id']);
    // информация о продукте для которого ведется расчет
    this.ProductInfoView = new  App.Views.ProductInfoView();
    // представление формы расета спецификации
    this.DataViewSpecificationBuilder =  new  App.Views.DataViewSpecificationBuilder();
    // представление формы отображения спецификации(режим просмотра)
    this.DataViewSpecificationViewer =  new  App.Views.DataViewSpecificationViewer();
    // основная контрольная панель
    this.ControlPanelView =  new  App.Views.ControlPanelView();
    // предствление для блока фильтрации свойств модели
    this.filterBoxView = new App.Views.FilterBoxView({'parent_view': this.ControlPanelView, 'data_models': data_models});
    this.ControlPanelView.filterBoxView = this.filterBoxView;
    // панель данных
    this.DataPanelView = new App.Views.DataPanelView();
    // отображение списка спецификаций
    this.SpecificationListView = new App.Views.SpecificationListView({'el': $("#esud_specification_list_body")});
    // отображение списка спецификаций-родителей
    this.SpecificationParentsListView = new App.Views.SpecificationListView({'el': $("#tab-view-parents")});
    // отображение истории по спецификации
    this.SpecificationHistoryView = new App.Views.SpecificationHistoryView({'el': $("#tab-view-history")});

    //------формы расчета---------------------
    // технологическая карта
    this.TechnoMapView =  new App.Views.TechnoMapView();
    // представление покупных объектов
    this.DataViewBuyItems =  new  App.Views.DataViewBuyItems();
    // представление объектов собственного производства
    this.DataViewOwnItems =  new  App.Views.DataViewOwnItems();
    //--------------------------------------------------

    // коллекция спецификаций отобранных на расчет
    this.SpecificationsToCalculateCollection = new App.Collections.SpecificationItemsCollection();
    // отображение списка спецификаций
    this.SpecificationToCalculateListView = new App.Views.SpecificationListView({el: $("#esud_specification_list_to_calcualte_body")} );

    this.Route = new AppRouter();
    Backbone.history.start();
    // глобальное событие на изменение параметров URL адреса
    Backbone.on("global:on_url_params_change",this.onSaveUrlHistory,this);

    // глобальное событие смены таба
    // Backbone.on("global:on_show_tab",this.onChangeTab,this);

    // глобальное событие добавления спецификации на расчет
    Backbone.on("specificationlist:add_item_to_calculate",this.onAddSpecificationToCalculate,this);
  },

  /**
    * Получение информации о типе объекта
    * входным параметром является модель элемента
  **/
  DecodeType:function(type, is_buy){
     var result = {'type': 'Не определен', 'short_type':'-'};
    if(is_buy && (type=='product' || type == 'product_model'))
      type+="_buy";
    if(type in this.shortTypeNames)
    {
      result['type'] = this.typeNames[type];
      result['short_type'] = this.shortTypeNames[type];
    }
    return result;
  },

  /**
    * Изменение и сохранение параметров URL
  **/
  onSaveUrlHistory:function(params){
    var param_key = params[1];
    var param_value = params[2];
    var need_reload = false;
    if(params.length>2)
      need_reload = params[3];

    if(param_key in this.UrlParams)
      this.UrlParams[param_key] = param_value;
    this.Route.navigate("/"+this.buildUrl(), need_reload);
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

    // проверка параметров URL
    // проверка на вид отображения данных, списка или детализации
    if(!query || query.indexOf("list")>-1)
    {
      // отображение списка спецификаций
      this.UrlParams =  {'list': '1','model':'','model_properties':'', 'parent_model':'', 'parent_model_properties':'', 'show_product_types': 'own'};
      if(query)
        parse_commands(this.UrlParams);
      // выставление правильного URL
      this.Route.navigate("/"+this.buildUrl(), false);
      // запуск процедуры подгрузки и отображения списка спецификаций
      this.ControlPanelView.loadList(this.UrlParams['list'], this.UrlParams['model'], this.UrlParams['model_properties'], this.UrlParams['parent_model'], this.UrlParams['parent_model_properties'], this.UrlParams['show_product_types'], true);
    }
    else
    {
      // отображение форм построения спецификации
      this.UrlParams =  {'number': '', 'tab': "1", 'optional': true };
      var tmpCommands = query.split('/');
      // если в URL передан только номер спецификации
      // меняем запрос на правильный и выпоняем построение
      if(tmpCommands.length==1)
          this.UrlParams['number']  = tmpCommands[0];
      else if(tmpCommands.length>0)
        parse_commands(this.UrlParams);
      // выставление правильного URL
      this.Route.navigate("/"+this.buildUrl(), false);
      // запуск процедуры поиска конфигурации/спецификации
      this.currentItemNumber = this.UrlParams['number'];
      this.ControlPanelView.doOpen(this.UrlParams['number']);
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
  ** Получение информации о типе объекта по его номеру
  **/
  getObjectTypeByNumber: function(val)
  {
    var result = "";
    if(val)
      if(val.split('.').length>2)
        result = "specification";
      else
        result = "product";
    return result;
  },

  /**
  ** обработка сообытия добавления спецификации в расчет
  **/
  onAddSpecificationToCalculate: function(param){
    this.SpecificationsToCalculateCollection.add(param[0]);
    this.SpecificationsToCalculateCollection.set(param[0],{remove: false});
    this.SpecificationToCalculateListView.render(this.SpecificationsToCalculateCollection, 1,100, false);


  }
};

///
/// Подключение роутеров
///
var AppRouter = Backbone.Router.extend({
  routes: {
    "": "index",
    ":query": "index",
    "*path": "index"
  },
  index:function(query){
      App.doQuery(query);
  }
});
