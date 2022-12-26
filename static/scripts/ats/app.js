///
/// Глобальная структура
///
var App = {
    Models: {},
    Views: {},
    Collections: {},
    Route:null,
    ControlPanelView: null,
    AtsListView: null,                     //  представление для отображения списка данных
    AtsListCollection: null,           //  коллекция списка данных
    UrlParams:  {},                                            // параметры URL строки

    /**
     *  Инициализация необходимых объектов
    **/
    initialize: function(system_objects)
    {
        // основная контрольная панель
        this.ControlPanelView =  new  App.Views.ControlPanelView();
        // отображение списка данных
        this.AtsListView = new App.Views.AtsListView();
        // роутер
        this.Route = new AppRouter();
        Backbone.history.start();
        // глобальное событие на изменение параметров URL адреса
        Backbone.on("global:on_url_params_change",this.onSaveUrlHistory,this);
        $("#update_date").datepicker({weekStart:1,format:"dd.mm.yyyy"});
        $("#update_date").attr('placeholder', (new Date().format("dd.mm.yyyy")).toString());
//        $("#update_date").datepicker('setValue', (new Date()).toString('dd-MMM-yyyy'));
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
        query = query||'';
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
        // отображение списка данных
        this.UrlParams =  {'list': '1'};
        if(query)
            parse_commands(this.UrlParams);
        // выставление правильного URL
        this.Route.navigate("/"+this.buildUrl(), false);
        // запуск процедуры подгрузки и отображения списка данных
        this.ControlPanelView.loadList(this.UrlParams['list']);
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
/// Подключение роутеров----------------------------------------------------------------------------------------------------------------------------
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


///
/// Панель управления на форме-------------------------------------------------------------------------------------------------------------------
///
App.Views.ControlPanelView = Backbone.View.extend({
    el: $("#controlPanel"),
    events:{
        'click #btn_load_ats_data': 'onLoadAtsData',
    },

    /**
     * Инициализация
    **/
    initialize: function()
    {
        // глобальное событие на смену страницы в пейджере
        Backbone.on("pager:change_page",this.onChangePage,this);
    },

    /**
     *  Обработка события смены страницы в пейджере
    **/
    onChangePage: function(e)
    {
        var cur_page = e[1];
        this.loadList(cur_page);
    },

    /**
     * обработка события кнопки обновления списка данных
    **/
    onLoadAtsData: function(e)
    {
        this.loadList(1, true);
    },

    /**
     * Вызов функции получения данных  по странице
    **/
    loadList:function(page, update, preloader_none)
    {
        var url = '';
        var update_date = $("#update_date").val();

        if(update_date && !Routine.parseDate(update_date,"dd.mm.yyyy")){
            $.jGrowl('Дата указана неверно.', { 'themeState':'growl-error', 'sticky':false, life: 10000, 'position': 'bottom-right' });
            return false;
        }

        if (update){
            update_date = update_date?update_date:'now';
            url = "/handlers/ats/check_and_update/" + page + '/' + update_date;
        } else {
            url = "/handlers/ats/get_list/" + page;
        }
        // вызов события обновления URL адреса
        Backbone.trigger('global:on_url_params_change',[this, 'list', page]);
        // показываем форму отображения списка данных
        App.AtsListView.show();
        // подгрузка и отображение данных
        if (!preloader_none){
            Routine.showLoader();
        }
       $.ajax({
                type: "POST",
                url: url,
                data: {},
                timeout: 55000,
                contentType: 'application/json',
                dataType: 'json',
                async:true
        }).done(function(result) {
            if(result['status']=="error")
                $.jGrowl(result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 10000, 'position': 'bottom-right' });
            else
            {
                    // количество данных всего
                    var count = Routine.strToFloat(result['count']);
                    // заполнение коллекции данных и построение формы
                    App.AtsListCollection = new App.Collections.AtsItemsCollection(result['data'],{parse: true});
                    App.AtsListView.render(App.AtsListCollection, page, count);
            }
        }).error(function(){
                $.jGrowl('Ошибка загрузки списка данных. Повторите попытку. ', { 'themeState':'growl-error', 'sticky':false, life: 5000, 'position': 'bottom-right' });
        }).always(function(){Routine.hideLoader();});
    },

});


///
/// Модель элемента--------------------------------------------------------------------------------------------------------------------------------------
///
App.Models.AtsItemModel = Backbone.Model.extend({
    idAttribute: "_id",
    defaults: {
        'date': '',
        'ats_id': '',
        'phone_number': '',
        'call_to': '',
        'client': null,
    },
    initialize: function() {},
    parse: function(data) {
        // приведение даты к нужному формату
        data['date'] = moment.utc(data['date'], 'YYYY-MM-DD HH:mm').local().format('DD.MM.YYYY HH:mm');
        return data;
    }
});

///
/// Коллекция-------------------------------------------------------------------------------------------------------------------------------------------------
///
App.Collections.AtsItemsCollection = Backbone.Collection.extend({
    model: App.Models.AtsItemModel
});

///
/// Представление списка данных----------------------------------------------------------------------------------------------------------------
///
App.Views.AtsListView = Backbone.View.extend({
    el: $("#ats_list_body"),
    pager: null,
    events:{
        'pager:change_page': 'onChangePage',
    },
    /**
     * Инициализация
    **/
    initialize: function()
    {
        this.pager = new App.Views.PagerView({el:this.$el.find('.ats-list-pager') });
    },

    /**
    * Отрисовка
    **/
    render: function(collection, current_page, count)
    {
        this.collection = collection;
        // Очистка формы
        this.clear();
        var self = this;
        _.each(this.collection.models, function (item) {
                self.renderItem(item);
        }, this);

        // отрисовка пейджера
        this.pager.render(current_page, count);

        return this;
    },

    /**
     * Отрисовка элемента
    **/
    renderItem: function (item) {
        var itemView = new App.Views.AtsItemView({model: item});
        this.$el.find('.spec-data-list').append(itemView.render().el);
    },

    /**
     * Очистка формы
    **/
    clear: function()
    {
        this.$el.find('.spec-data-list').empty();
    },

    /**
     * показать
    **/
    show: function()
    {
        this.$el.show();
    },

    /**
     * скрыть
    **/
    hide: function()
    {
        this.$el.hide();
    },

    /**
     * Событие смены страницы
    **/
    onChangePage: function(e, page)
    {
        Backbone.trigger('pager:change_page',[this, page]);
    }
});


///
/// Представление элемента  в списке----------------------------------------------------------------------------------------------
///
App.Views.AtsItemView = Backbone.View.extend({
    tagName:'tr',
    className:'list-item',
    events: {
        'click .btn-check-ats': 'onUpdateAts'
    },
    templates: {
        item:_.template($("#listAtsItemTemplate").html())
    },

    /**
     * Удление представления
    **/
    unRender: function()
    {
        this.remove();
    },
        /**
     * обработка события кнопки обновления одного элемента
    **/
    onUpdateAts: function(e)
    {
        var phone = $(e.target).attr('data-phone');
        App.AtsListView.show();
        // подгрузка и отображение данных
        Routine.showLoader();
        $.ajax({
                type: "POST",
                url: '/handlers/ats/check_on_client/' + phone,
                data: {},
                timeout: 55000,
                contentType: 'application/json',
                dataType: 'json',
                async:true
        }).done(function(result) {
            if(result['status']=="error")
                $.jGrowl(result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 10000, 'position': 'bottom-right' });
            else
            {
               App.ControlPanelView.loadList(App.UrlParams['list'], false, true);
            }
        }).error(function(){
                $.jGrowl('Ошибка обновления данных. Повторите попытку. ', { 'themeState':'growl-error', 'sticky':false, life: 5000, 'position': 'bottom-right' });
        });//.always(function(){Routine.hideLoader();});
    },
     /**
     * Отрисовка элемента
    **/
    render: function () {
        this.$el.html(this.templates.item(this.model.toJSON()));
        return this;
    }
});
