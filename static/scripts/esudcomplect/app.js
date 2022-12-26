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
    ModelInfoView: null,
    ComplectInfo: null,                              // сруктура текущего комплекта
    DataViewComplectBuilder: null,    // отображение формы построения комплекта
    DataViewComplectView: null,        // отображение формы дерева комплекта(режим просмотра)
    ComplectListView: null,                     //  представление для отображения списка спецификаций
    ComplectListCollection: null,           //  коллекция списка спецификаций

    SystemObjects: [],                   // список системных объектов-констант
    SystemObjectsIDS: [],            // список идентификаторов системных объектов
    currentItemNumber: null,        // артикул текущего открытого объекта(комлекта/модели)
    UrlParams:  {},                          // параметры URL строки

    typeNames: {'operation':'Операция', 'material':'Материал', 'work':'Работа', 'product':'Изделие', 'library':'Библиотека', 'property':'Свойство', 'value':'Значение', 'unit':'Ед. измерения', 'product_model':'Модель изделия',  'product_model_buy':'Модель изделия покупного',  'product_model_complect':'Модель комплекта',  'product_model_buy_complect':'Модель покупного комплекта', 'product_buy':'Изделие покупное', 'template': 'Шаблон разделения', 'condition': 'Условие', 'condition_otbor':'Отбор', 'process': 'Тех. процесс'},
    shortTypeNames: {'operation':'О', 'material':'М', 'work':'Р', 'product':'И', 'library':'Б', 'property':'С','value':'З', 'unit':'Е','product_model':'МИ','product_model_buy':'МИП','product_model_buy_complect':'МИПК','product_model_complect':'МИК', 'product_buy':'ИП', 'template': 'ШР', 'condition': 'У', 'condition_otbor':'УО', 'process': 'ТПР'},

    /**
     *  Инициализация необходимых объектов
    **/
    initialize: function(system_objects)
    {
        // системные объекты
        this.SystemObjects = system_objects;
        for(var i in system_objects['items_detail'])
            this.SystemObjectsIDS.push(system_objects['items_detail'][i]['_id']);

        // информация о продукте для которого ведется расчет
        this.ModelInfoView = new  App.Views.ModelInfoView();
        // представление формы расета комплекта
        this.DataViewComplectBuilder =  new  App.Views.DataViewComplectBuilder();
        // представление формы отображения комплекта(режим просмотра)
        this.DataViewComplectViewer =  new  App.Views.DataViewComplectViewer();
        // основная контрольная панель
        this.ControlPanelView =  new  App.Views.ControlPanelView();
        // панель данных
        this.DataPanelView = new App.Views.DataPanelView();
        // отображение списка спецификаций
        this.ComplectListView = new App.Views.ComplectListView();

        this.Route = new AppRouter();
        Backbone.history.start();
        // глобальное событие на изменение параметров URL адреса
        Backbone.on("global:on_url_params_change",this.onSaveUrlHistory,this);
    },

    /**
      * Получение информации о типе объекта
      * входным параметром является модель элемента
    **/
    DecodeType:function(type, is_buy, is_complect){
         var result = {'type': 'Не определен', 'short_type':'-'};
        if(is_buy && (type=='product' || type == 'product_model'))
            type+="_buy";
        if(is_complect && (type == 'product_model'))
            type+="_complect";
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

        // проверка параметров URL
        // проверка на вид отображения данных, списка или детализации
        if(!query || query.indexOf("list")>-1)
        {
            // отображение списка спецификаций
            this.UrlParams =  {'list': '1'};
            if(query)
                parse_commands(this.UrlParams);
            // выставление правильного URL
            this.Route.navigate("/"+this.buildUrl(), false);
            // запуск процедуры подгрузки и отображения списка спецификаций
            this.ControlPanelView.loadList(this.UrlParams['list']);

        }
        else
        {
            // отображение форм построения комплекта
            this.UrlParams =  {'number': '', 'tab': "1", 'optional': true, 'use_conditions': true };
            var tmpCommands = query.split('/');
            // если в URL передан только номер комплекта
            // меняем запрос на правильный и выпоняем построение
            if(tmpCommands.length==1)
                  this.UrlParams['number']  = tmpCommands[0];
            else if(tmpCommands.length>0)
                parse_commands(this.UrlParams);
            // выставление правильного URL
            this.Route.navigate("/"+this.buildUrl(), false);
            // запуск процедуры поиска конфигурации/комплекта
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
