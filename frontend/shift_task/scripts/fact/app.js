///
/// Глобальная структура
///
var App = {
    Models: {},
    Views:{},
    Collections:{},
    Route:null,
    ControlPanelView: null,
    DataView: null,                      // представление формы основоных данных
    weekends: [],                         // список выходных дней
    sectors_collection : null,     // коллекция участков
    all_used_specifications: null, // список всех задействованных спецификаций в задании

    /**
     *  Инициализация необходимых объектов
    **/
    initialize: function()
    {
        // контрольная панель
        this.ControlPanelView =  new  App.Views.ControlPanelView();
        // форма основных данных
        this.DataView =  new  App.Views.DataView();
        this.Route = new AppRouter();
        Backbone.history.start();
    }
};

///------------------------------------------------------------------------------------------------------------------------------------------------
///---------Роутеры----------------------------------------------------------------------------------------------------------------------------
///------------------------------------------------------------------------------------------------------------------------------------------------
///
/// Подключение роутеров
///
var AppRouter = Backbone.Router.extend({
    routes: {
      "": "index",
      ":number": "index"
    },
    index:function(query){
        if(query)
        {
            App.ControlPanelView.doSearch(query);
        }
    }
});

///------------------------------------------------------------------------------------------------------------------------------------------------
///---------Модели----------------------------------------------------------------------------------------------------------------------------
///------------------------------------------------------------------------------------------------------------------------------------------------
///
/// Модель элемента участка
///
App.Models.SectorModel = Backbone.Model.extend({
    idAttribute: "origin_id",
    defaults: {
        'tasks': null
    },
     initialize: function(){
    },
    parse: function(data) {
        data['tasks'] = new App.Collections.ShiftTaskCollection(data['tasks'],{parse: true});
        return data;
    }
});
///
/// Модель элемента задания на смену
///
App.Models.ShiftTaskModel = Backbone.Model.extend({
    idAttribute: "_id",
    defaults: {
        'items': null,
        'complete': null,
        'templates': null
    },
    initialize: function() {
    },
    parse: function(data) {
        data['items'] = new App.Collections.ItemsCollection(data['items'],{parse: true});
        return data;
    }
});

///
/// Модель элемента спецификации
///
App.Models.ItemModel = Backbone.Model.extend({
    defaults: {
        'fact': null,
        'pre_fact': null,
        'balance': null,
        'plan_time': 0,
        'fact_time': 0,
        'pre_fact_time': 0,
        'use_product_struct': true,
        'weight_per_unit': 0,
        'fact_weight': 0,
        'pre_fact_weight': 0
    },
    initialize: function() {},
    parse: function(data) {
        data['fact_time'] = 0;
        data['fact_weight'] = 0;
        return data;
    },
     idAttribute: "_id"
});

///
/// Модель элемента истории по факту
///
App.Models.HistoryFactsModel = Backbone.Model.extend({
    idAttribute: "_id",
    defaults: {
        'date': null,
        'user': '',
        'value': 0,
        'fact_weight': 0,
        'fact_time': 0
    }
});

///------------------------------------------------------------------------------------------------------------------------------------------------
///---------Коллекции-----------------------------------------------------------------------------------------------------------------------
///------------------------------------------------------------------------------------------------------------------------------------------------
///
/// Коллекция спецификаций
///
App.Collections.ItemsCollection = Backbone.Collection.extend({
    model: App.Models.ItemModel
});
///
/// Коллекция участков
///
App.Collections.SectorsCollection = Backbone.Collection.extend({
    model: App.Models.SectorModel
});
///
/// Коллекция заданий на смену
///
App.Collections.ShiftTaskCollection = Backbone.Collection.extend({
    model: App.Models.ShiftTaskModel
});

///
/// Коллекция истории фактов по элементу
///
App.Collections.HistoryFactsCollections = Backbone.Collection.extend({
    model: App.Models.HistoryFactsModel
});

///------------------------------------------------------------------------------------------------------------------------------------------------
///---------Представляения--------------------------------------------------------------------------------------------------------------
///------------------------------------------------------------------------------------------------------------------------------------------------
///
/// Панель управления на форме
///
App.Views.ControlPanelView = Backbone.View.extend({
    el: $("#controlPanel"),
    events:{
        'click .btn-search': 'onSearch',
        //'change .tb-search-date': 'onSearch',
    },
    /**
     * Инициализация
    **/
    initialize: function(item_model)
    {
         this.$('.date-picker').datepicker({
                weekStart:1,
                format: "dd/mm/yyyy",
                weekStart: 1,
                autoclose: true,
                todayHighlight: true,
                defaultDate: new Date(),
                orientation: "top left"
            }).on('changeDate', function(ev){
                //App.Route.navigate("/"+ev.date.format("dd/mm/yyyy").split('/').join('_'), true);
            });
    },
    /**
     * Вызов функции поиска заказа
    **/
    onSearch:function(e)
    {
        var search_date = this.$el.find('.tb-search-date').val().split('/').join('_');
        if(search_date)
        {
            App.Route.navigate("/"+search_date,  false);
            this.doSearch(search_date);
        }
    },
    /**
     * Поиск и открытие заданий на смену
    **/
    doSearch:function(search_date)
    {
           if(search_date)
           {
              //search_date = search_date.split('_').join('/');
               var self = this;
               // проверка входной даты
               if(!Routine.isValidDate(search_date))
                {
                    $.jGrowl('Неверный формат даты смены.', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                    //Backbone.trigger('global:clear',[this]);
                    return;
               }
               this.$el.find('.tb-search-date').val(search_date.split('_').join('/'));
               Routine.showLoader();
               $.ajax({
                        type: "GET",
                        url: "/handlers/shift_task_facts/search/" + search_date,
                        data: {},
                        timeout: 55000,
                        contentType: 'application/json',
                        dataType: 'json',
                        async:true
                        }).done(function(result) {
                            if(result['status']=="error")
                            {
                                self.clear();
                                $.jGrowl(result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 10000 });
                            }
                            else
                            {
                                App.sectors_collection = new App.Collections.SectorsCollection(result['result']['data'],{parse: true});
                                // все задействованные в заказе спецификации
                                App.all_used_specifications = result['result']['all_used_specifications'];
                                // отрисовка основной формы
                                App.DataView.render(App.sectors_collection);
                            }
                        }).error(function(){
                                    self.clear();
                                    $.jGrowl('Ошибка поиска. Повторите попытку. ', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                        }).always(function(){Routine.hideLoader();});
            }
    },
    /**
     * Очистка форм
    **/
    clear: function()
    {
        App.DataView.clear();
        App.sectors_collection = null;
    }
});

///
/// Представление формы основных данных
///
App.Views.DataView = Backbone.View.extend({
    el: $("#shift_task_facts_body"),
    sectors_view: null,   // представление списка секторов
    events:{},
    /**
     * Инициализация
    **/
    initialize: function(){},
    render: function(sectors_collection, items_collecton)
    {
        // Очистка формы
        this.clear();
        if(sectors_collection)
        {
            // добавление участков
            this.sectors_view =  new App.Views.SectorsListView({collection : sectors_collection});
            this.$el.find('#shift_task_facts_data_container').append(this.sectors_view.render().el);
        }
    },
    /**
     * Очистка формы
    **/
    clear: function()
    {
        this.$el.find('#shift_task_facts_data_container').empty();
        this.sectors_view = null;
    }
});

///
/// Представление списка участков
///
App.Views.SectorsListView = Backbone.View.extend({
    tagName:'ul',
    //className:'line data-item',
    items_view: null,       // представление списка спецификаций
    openedItems:{},     // список идентификаторов объектов, которые необходимо раскрыть/скрыть
    events:{},
    /**
     * Инициализация
    **/
    initialize: function(){},
    /**
    * Отрисовка участков
    **/
    render: function(items_collecton)
    {
        // Очистка формы
        this.clear();
        var that = this;
        // отрисовка
        var i = 0; // счетчик объектов
        _.each(this.collection.models, function (item) {
                that.renderSector(item, i);
                i++;
        }, this);
        return this;
    },
    /**
     * Отрисовка элемента участка
    **/
    renderSector: function (item, index) {
        var sectorItemView = new App.Views.SectorItemView({model: item, i: index});
        this.$el.append(sectorItemView.render().el);
    },
    /**
     * Очистка формы
    **/
    clear: function()
    {
        this.$el.empty();
    }
});
///
/// Представление элемента участка
///
App.Views.SectorItemView = Backbone.View.extend({
    tagName:'li',
    className:'h1',
    index: null,                  // индекс элемента
    tasks_view: null,       // представление списка заданий
    templates: {
        main:_.template($("#sectorItemTemplate").html()),
    },
    /**
     * Инициализация
    **/
    initialize: function()
    {
        // инициализация индекса элемента
        this.index = this.options['i'];
    },

    /**
     * Отрисовка элемента
    **/
    render: function () {
        var that = this;
        this.clear();
        // добавление ифнормации об участке
        // отрисовка
        this.$el.append(this.templates.main($.extend({},this.model.toJSON(),{i:this.index})));
        // добавление заданий на участок
        this.tasks_view =  new App.Views.ShiftTaskListView({collection : this.model.get('tasks'), el: this.$el.find('ul'), parent_index: this.index });
        this.tasks_view.render();
        return this;
    },
    /**
     * Очистка формы
    **/
    clear: function()
    {
        this.$el.empty();
    }
});

///
/// Представление списка заданий на смену
///
App.Views.ShiftTaskListView = Backbone.View.extend({
    //className:'line data-item',
    items_view: null,       // представление списка спецификаций
    openedItems:{},       // список идентификаторов объектов, которые необходимо раскрыть/скрыть
    parent_index: null,    // индекс родительского элемента
    events:{},
    /**
     * Инициализация
    **/
    initialize: function(){
        this.parent_index = this.options['parent_index'];
    },
    /**
    * Отрисовка участков
    **/
    render: function(items_collecton)
    {
        // Очистка формы
        this.clear();
        var that = this;
        // отрисовка
        var i = 0; // счетчик объектов
        _.each(this.collection.models, function (item) {
                that.renderTask(item, i);
                i++;
        }, this);
        return this;
    },
    /**
     * Отрисовка элемента задания
    **/
    renderTask: function (item, index) {
        var taskItemView = new App.Views.ShiftTaskItemView({model: item, i: index, parent_index: this.parent_index});
        this.$el.append(taskItemView.render().el);
    },
    /**
     * Очистка формы
    **/
    clear: function()
    {
        this.$el.empty();
    }
});

///
/// Представление элемента задания
///
App.Views.ShiftTaskItemView = Backbone.View.extend({
    tagName:'li',
    className:'h2',
    parent_index: null,     // индекс родительского элемента
    index: null,                    // индекс элемента
    items_view: null,         //  представление списка спецификаци
    templates: {
        main:_.template($("#shiftTaskItemTemplate").html()),
        print:_.template($("#shiftTaskItemTemplatePrint").html()),
    },
    /**
    * События
    **/
    events:{
        'click .cancel-data': 'onCancelEdit',
        'click .save-data': 'onSave',
        'click .pre-save-data': 'onPreSave',
        'click .print-data': 'onPrint',
        'click .download-xls-data': 'onDownloadXLS',
        'click .download-pdf-data': 'onDownloadPDF',
        //------------
        'templates:change_fact_count':'onTemplatesRecalculate'

    },
    /**
     * Инициализация
    **/
    initialize: function()
    {
        // инициализация индекса элемента
        this.index = this.options['i'];
        this.parent_index = this.options['parent_index'];
    },

    /**
     * Отрисовка элемента
    **/
    render: function () {
        this.clear();
        // добавление ифнормации о задании
        this.$el.append(this.templates.main($.extend({},this.model.toJSON(),{i:this.parent_index, j: this.index} )));
        // инициализация коллекции шаблонов раскроя, задействованных на участке
        this.templates_collection = new App.Collections.TemplatesCollection(
            this.model.get('templates')? this.model.get('templates').map(function(item){return new App.Models.TemplateModel(item)}): [],
            {specifications_collection:this.model.get('items')}
        );
        this.model.set('templates', this.templates_collection);

        //  Представление зайдествованных шаблонов расероя в задании
        this.templates_view = new App.Views.UsedTemplatesListView({
            el: this.$el.find('.pnl-used-templates-body-container'),
            collection: this.templates_collection,
            show_sector_level: false,
            view_mode: 'edit_fact'
        });
        this.templates_view.render();
        // добавление спецификаций в задание
        this.items_view = new App.Views.ItemsListView({collection : this.model.get('items'), el: this.$el.find('div.pnl-items'), 'templates_collection': this.templates_collection });
        this.items_view.render();
        // если задание на смену завершено, то необходимо дизейблить поля ввода и кнопки управления
        if(this.model.get('complete'))
        {
            this.enable(false);
            this.templates_view.enable(false);
        }
        else // генерация события на пересчет фактов по примененным шаблонам раксроя
            Backbone.trigger('templates:calculate_facts_by_specifications',[this]);
        return this;
    },

    /**
     * Отправка данных на печать
    **/
    onPrint: function()
    {
        // печать сменного задания
        $("#section-to-print").empty();
        $("#section-to-print").append(this.templates.print($.extend({},this.model.toJSON(),{i:this.parent_index, j: this.index} )));
        $("#section-to-print").find(".spec-data-list").append(this.items_view.render_to_print());
        if(this.templates_collection && this.templates_collection.length>0 )
            $("#section-to-print").append(this.templates_view.renderPrintVersion());
        window.print();
    },

    /**
     * Сохранить данные в формате XLS
    **/
    onDownloadXLS: function()
    {
        window.open('/handlers/shift_task_facts/report/xls/'+this.model.get('number'));
    },

    /**
     * Сохранить данные в формате PDF
    **/
    onDownloadPDF: function()
    {
        window.open('/handlers/shift_task_facts/report/pdf/'+this.model.get('number') ,'_blank');
    },

     /**
     * Отмена редактирования данных
    **/
    onCancelEdit: function()
    {
        _.each(this.model.get('items').models, function (item) {
                var preFactScopeVal = 0;
                if(item.get('pre_fact') && item.get('pre_fact')['value'])
                    preFactScopeVal = Routine.strToFloat(item.get('pre_fact')['value']);

                var balanceVal = Routine.strToFloat(item.get('count')['value'].toString());
                if(isNaN(balanceVal))
                                balanceVal = 0;

                balanceVal = (((balanceVal - preFactScopeVal)<0)?(balanceVal - preFactScopeVal)*-1:balanceVal - preFactScopeVal);
                item.set({'fact':null, 'balance': balanceVal});
        }, this);
        this.items_view.renderItogo();

        // отмена объемов по шаблонам
        this.templates_collection.clearFacts();
    },

    /**
     * Пересчет объемов по выбранным темплейтам
     */
     onTemplatesRecalculate:function(e){
        var all_templates_out_items = this.templates_collection.getAllFactsOutItems();
        _.each(this.model.get('items').models, function (item) {

            if (item.get('_id') in all_templates_out_items)
            {
                // объем по шаблонам
                var fact_by_templates = all_templates_out_items[item.get('_id')];
                // объем по специфкациям
                var factScopeVal = 0;
                if(item.get('pre_fact') &&item.get('pre_fact')['value'])
                    factScopeVal += item.get('pre_fact')['value'];
             }
             else
             {

             }
        });
     },

     /**
     * Обработка события кнопки сохранение данных
    **/
    onSave: function()
    {
        try
        {
            var self = this;
            var cur_date = new Date();
            var task_date = new Date(this.model.get('date'));
            // проверка на соответствие фактов шаблонам
            // если введенные факты не соответсвуют фактам по шаблонам, то выдаем ошибку
            this.checkTemplates();

            // проверка дат
            if(cur_date<task_date)
            {
                bootbox.confirm("Закрывается будущая смена?", function(result){
                    if(result)
                        // проверка на недосдачу
                        self.checkOnShortage();
                });
            }
            else
                // проверка на недосдачу
                self.checkOnShortage();
        }
        catch (err) {
            $.jGrowl(err.message, { 'themeState':'growl-error', 'sticky':false, life: 10000 });
        }

    },

    /**
     * Проверка на соответсвие введенных фактов шаблонным фактам
    */
    checkTemplates: function(){
        // получение спецификаций, которые должны получиться согласно шаблонам
        var all_templates_out_items = this.templates_collection.getAllFactsOutItems();
        var incorrect_specs = []; // спецификации с ошибочными фактическими объемами
        _.each(this.model.get('items').models, function (item) {
            if (item.get('_id') in all_templates_out_items)
            {
                // объем по шаблонам
                var fact_by_templates = all_templates_out_items[item.get('_id')];
                // объем по специфкациям
                var factScopeVal = 0;
                if(item.get('fact') &&item.get('fact')['value'])
                    factScopeVal = item.get('fact')['value'];
                if(item.get('pre_fact') &&item.get('pre_fact')['value'])
                    factScopeVal += item.get('pre_fact')['value'];

                if(fact_by_templates != factScopeVal)
                {
                    incorrect_specs.push({
                        '_id': item.get('_id'),
                        'number': item.get('number'),
                        'value_by_templates': fact_by_templates,
                        'fact_value': factScopeVal
                    });
                }
             }
        });

        if(incorrect_specs.length>0)
        {
            var specs_msg = incorrect_specs.map(function(x){return x['number'] + ' ['+x['value_by_templates']+']' }).join('; ');
            throw new Error('Ошибка. Объемы по шаблонам раскроя не соответствуют фактическим объемам. Проверьте данные по следующим специфкациям: <br/>'+ specs_msg);
        }
        return true;
    },

    /**
     * Проверка на наличие надосдачи и предложение сохранить недосдачу
    **/
    checkOnShortage: function()
    {
        var self = this;
        // проверка на наличие недосдачи
        var have_shortage = false;
        _.each(this.model.get('items').models, function (item) {
                var balanceVal = Routine.strToFloat(item.get('count')['value'].toString());
                if(isNaN(balanceVal))
                    balanceVal = 0;
                var factScopeVal = 0;
                if(item.get('fact') &&item.get('fact')['value'])
                    factScopeVal = item.get('fact')['value'];
                var preFactScopeVal = 0;
                if(item.get('pre_fact') &&item.get('pre_fact')['value'])
                    preFactScopeVal = item.get('pre_fact')['value'];
                // рассчет баланса
                balanceVal =balanceVal - factScopeVal-preFactScopeVal;
                if(balanceVal>0)
                    have_shortage = true;
        }, this);

        // если есть недосдача
        if(have_shortage)
        {
            var dlg = new App.Views.newShiftTaskDlgView({'model': self.model});
            dlg.on("dialogsave",function(e){
                if(e.status=="yes" || e.status=="no")
                {
                    // вызов сохранения текущих фактов
                    self.save('save');
                }
            });
        }
        else
            self.save('save');
    },

    /**
     * Обработка события кнопки предварительного сохранение данных
    **/
    onPreSave: function()
    {
        var self = this;
        var cur_date = new Date();
        var task_date = new Date(this.model.get('date'));
        // проверка, что хотя бы один факт заполнен
        var summ_volumes = 0;
        _.each(this.model.get('items').models, function (item) {
                if(item.get('fact'))
                    summ_volumes+=item.get('fact');
        }, this);
        if(summ_volumes==0)
        {
            $.jGrowl('Ошибка! Нет данных на сохранение.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
            return;
        }
        self.save('pre_save');
    },

    /**
     * Сохранение данных
    **/
    save: function(type)
    {
        var type = type||'save';
        var self = this;
        var dataToSave = {'task': this.model, 'type': type};
        Routine.showLoader();
        $.ajax({
            type: "PUT",
            url: "/handlers/shift_task_facts/savedata",
            data: JSON.stringify(dataToSave),
            timeout: 35000,
            contentType: 'application/json',
            dataType: 'json',
            async:true
        }).done(function(result) {
            if(result['status']=="ok")
            {
                $.jGrowl('Данные успешно сохранены.' , { 'themeState':'growl-success', 'sticky':false });
                // получение обновленных данных для обновления формы
                self.update(result['result']);
            }
            else
                $.jGrowl('Ошибка сохранения данных. Подробности: ' + result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 10000 });
        }).always(function(){Routine.hideLoader()});
    },

    /**
     * обновление данных по участку
    **/
    update: function(data)
    {
        this.model.set(this.model.parse(data));
        this.render();
        this.$el.find('.shift-task-cb-item').prop('checked', true);
    },

    /**
     * Активация/деактивация
    **/
    enable: function(value)
    {
         this.$el.find('.tb, .btn').prop('disabled', !value);
         this.$el.find('.print-data').prop('disabled', false);
         this.$el.find('.download-xls-data').prop('disabled', false);
         this.$el.find('.download-pdf-data').prop('disabled', false);
    },

    /**
     * Очистка формы
    **/
    clear: function()
    {
        this.$el.empty();
    }
});

///
/// Представление списка спецификаций
///
App.Views.ItemsListView = Backbone.View.extend({
    events:{
        'click .all-use-product-struct': 'onUseProductStruct',
        'items_list_view:calculate_data': 'onCalculateData'
    },
    templates:{
        itogo:_.template($("#specificationItogoTemplate").html()),
        itogo_print:_.template($("#specificationItogoTemplatePrint").html())
    },
    /**
     * Инициализация
    **/
    initialize: function(){
        this.templates_collection = this.options['templates_collection'];
    },
    /**
    * Отрисовка
    **/
    render: function(parent_index)
    {
        parent_index = parent_index || 0;
        // Очистка формы
        this.clear();
        var that = this;
        var i = 1;
        _.each(this.collection.models, function (item) {
                that.renderItem(item, i);
                i++;
        }, this);
         this.renderItogo();
        return this;
    },

    /**
    * Отрисовка для печати
    **/
    render_to_print: function()
    {
        var res = "";
        var i = 1;
        var itogo = {
            'plan':0,
            'weight_per_unit': 0,
            'weight_full': 0,
        };
        _.each(this.collection.models, function (item) {
                res+=$(new App.Views.ItemView({model: item, i: i, parent: this }).render_to_print().el).html();
                itogo['plan']+= item.get('count')['value'];
                i++;
        }, this);
        res+= this.templates.itogo_print(itogo);
         return res;
    },

    /**
     * Отрисовка элемента
    **/
    renderItem: function (item, i) {
        var itemView = new App.Views.ItemView({model: item, i: i, parent: this });
        // отрисовка на форме
        this.$el.find("tbody.spec-data-list").append(itemView.render().el);
    },
    /**
     * Отрисовка блока Itogo
    **/
    renderItogo: function () {
        var that = this;
        var i = 1;
        var itogo = {
            'plan':0,
            'fact':0,
            'pre_fact':0,
            'plan_time': 0,
            'fact_time': 0,
            'pre_fact_time': 0,
            'fact_weight': 0,
            'pre_fact_weight': 0,
            'weight_per_unit': 0,
            'weight_full': 0,
        };
         _.each(this.collection.models, function (item) {
                itogo['plan']+= item.get('count')['value'];
                itogo['plan_time']+= item.get('plan_time');
                itogo['fact_time']+= item.get('fact_time');
                itogo['fact_weight']+= item.get('fact_weight');
                itogo['pre_fact_time']+= item.get('pre_fact_time');
                itogo['pre_fact_weight']+= item.get('pre_fact_weight');
                itogo['weight_per_unit']+= item.get('weight_per_unit') || 0;
                itogo['weight_full']+= (item.get('weight_per_unit') || 0)*item.get('count')['value'];
                if(item.get('fact') && item.get('fact')['value'])
                     itogo['fact']+= item.get('fact')['value'];
                if(item.get('pre_fact') && item.get('pre_fact')['value'] )
                     itogo['pre_fact']+= Routine.strToFloat(item.get('pre_fact')['value']);
                i++;
        }, this);

        // отрисовка на форме
        this.$el.find(".spec-data-list").find('.tr-footer').remove();
        this.$el.find(".spec-data-list").append(this.templates.itogo(itogo));
    },
    /**
     * Очистка формы
    **/
    clear: function()
    {
        this.$el.find("tbody").empty();
    },

    /**
     ** Использовать структуру изделий в расчетах
    **/
    onUseProductStruct: function(e)
    {
        var self = this;
        var btn = $(e.currentTarget);
        var is_active = false;
        if(btn.hasClass('not_active'))
        {
            btn.removeClass('not_active');
            is_active  = true;
        }
        else
        {
            btn.addClass('not_active');
            is_active = false;
        }
        _.each(this.collection.models, function (model) {
              model.set({ 'use_product_struct':  is_active },{silent:false});
        }, this);
    },
    /**
     **Событие на пересчет данных по структуре, вызов осуществляется тригером
     ** model - элемент с измененным объемом
    **/
    onCalculateData: function(e, model)
    {
         var items_to_calculate = [];
         // сверка с шаблонами раскроя, пересчет согласно шаблонам
        if(model.get('use_product_struct'))
            items_to_calculate.push(model);
        // пересчет связанных спецификаций, для которых выставлен флаг - учитывать структуру изделия
        _.each(this.collection.models, function (row) {
             if(row.get('use_product_struct') && row.get('fact') && Routine.strToFloat(row.get('fact')['value'])>0 && model.get('number')!=row.get('number'))
               items_to_calculate.push(row);
        }, this);

        // пересчет данных по структуре
        this.calculateDataByStruct(items_to_calculate);
        // отрисовка футера
        this.renderItogo();
    },

    /**
     * Функция пересчета данных по структуре
    **/
    calculateDataByStruct: function(items_to_calculate)
    {
        // рекурсивная функция подсчета обхемов по структуре спецификации
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

        var result = {};
        // сбор всех спецификаций в структуру
        var items = {};
        _.each(this.collection.models, function (model) {
                items[model.get('number')] = model.get('number');
        }, this);
        // сортировка входного списка по крупноте
        items_to_calculate = items_to_calculate.sort(function (a, b) { return a.get('deep') - b.get('deep') });
         // цикл по всем спецификациям, поданным на расчет
        for(var i in items_to_calculate)
        {
            var model = items_to_calculate[i];
            // если поданная в расчет спецификация, еще не в результирующем списке,
            // то вызываем рекурсивны просчет по ней
            if(!(model.get('number') in result))
                process_items(JSON.parse(App.all_used_specifications[model.get('number')]['struct']) , Routine.strToFloat(model.get('fact')['value']), items, result);
        }
        // вывод результата
        _.each(this.collection.models, function (item) {
                if( item.get('use_product_struct') &&  item.get('number') in result)
                {
                    var factScopeVal = Routine.strToFloat(result[item.get('number')]['count']);
                    var balanceVal = Routine.strToFloat(item.get('count')['value'].toString());
                    if(isNaN(balanceVal))
                                balanceVal = 0;
                    // получение объема сохраненного ранее, если такой есть, то в балансе необходимо его учесть
                    var preFactScopeVal = 0;
                    if(item.get('pre_fact') &&item.get('pre_fact')['value'])
                        preFactScopeVal = item.get('pre_fact')['value'];
                    // рассчет баланса
                    balanceVal = (((balanceVal - factScopeVal-preFactScopeVal)<0)?(balanceVal - factScopeVal-preFactScopeVal)*-1:balanceVal - factScopeVal-preFactScopeVal);
                    //balanceVal = (((balanceVal - factScopeVal)<0)?(balanceVal - factScopeVal)*-1:balanceVal - factScopeVal);
                    // change data in model
                    item.set({
                            'fact': {'value': factScopeVal},
                            'balance': balanceVal,
                            'fact_time': factScopeVal* Routine.strToFloat(item.get('plan_execution_time')['value']),
                            'fact_weight': factScopeVal* Routine.strToFloat(item.get('weight_per_unit'))
                    });
                }
        }, this);
    }
});

///
/// Представление элемента спецификации
///
App.Views.ItemView = Backbone.View.extend({
    tagName:'tr',
    className:'',
    index: 1,
    templates: {
        main:_.template($("#specificationItemTemplate").html()),
        main_print:_.template($("#specificationItemTemplatePrint").html()),
    },
    events:{
        'blur .tb-fact': 'onFactBlur',
        'click .use-product-struct': 'onUseProductStruct',
        'click .lnk-fact-history': 'OnShowHistory',
    },
    /**
     * Инициализация
    **/
    initialize: function()
    {
        // инициализация индекса элемента
        this.model.bind("change", this.change, this);
        this.index = this.options['i'];
    },

    /**
     * Отрисовка элемента
    **/
    render: function () {
        this.clear();
        var tmp_fact_value =  (this.model.get('fact')&&this.model.get('fact')['value'])?Routine.strToFloat(this.model.get('fact')['value'].toString()):0;
        var tmp_pre_fact_value =  (this.model.get('pre_fact')&&this.model.get('pre_fact')['value'])?Routine.strToFloat(this.model.get('pre_fact')['value'].toString()):0;

        // добавление ифнормации об участке
        if(this.model.get('plan_execution_time'))
            this.model.set({
                'plan_time': Routine.strToFloat(this.model.get('count')['value'].toString())* Routine.strToFloat(this.model.get('plan_execution_time')['value']),
                'fact_time': tmp_fact_value* Routine.strToFloat(this.model.get('plan_execution_time')['value']),
                'fact_weight': tmp_fact_value* Routine.strToFloat(this.model.get('weight_per_unit')),
                'pre_fact_time': tmp_pre_fact_value* Routine.strToFloat(this.model.get('plan_execution_time')['value']),
                'pre_fact_weight': tmp_pre_fact_value* Routine.strToFloat(this.model.get('weight_per_unit')),
            },{silent:true});

        this.$el.append(this.templates.main($.extend({},this.model.toJSON(),{i:this.index})));
        this.$('.tb-fact').numeric({ negative: false, decimal: ',' });
        return this;
    },

    /**
     * Отрисовка элемента для печати
    **/
    render_to_print: function () {
        this.clear();
        this.$el.append(this.templates.main_print($.extend({},this.model.toJSON(),{i:this.index})));
        return this;
    },

    /**
     * Очистка формы
    **/
    clear: function()
    {
        this.$el.empty();
    },

    /**
     * событие на смену данных модели
    **/
    change: function()
    {
        this.render();
    },

    /**
     * Обработка события потери фокуса поля ввода факстического объема
    **/
    onFactBlur:function(){
        var self = this;
        var tbFactScope=  this.$('.tb-fact');
        // плановый объем
        var balanceVal = Routine.strToFloat(self.model.get('count')['value'].toString());
        if(isNaN(balanceVal))
                    balanceVal = 0;
        var factScopeVal = Routine.strToFloat(tbFactScope.val());
        if(isNaN(factScopeVal) || !factScopeVal)
        {
                    factScopeVal = 0;
                    tbFactScope.val('');
        }
        else
            tbFactScope.val(Routine.floatToStr(factScopeVal));
        // получение объема сохраненного ранее, если такой есть, то в балансе необходимо его учесть
        var preFactScopeVal = 0;
        if(self.model.get('pre_fact') &&self.model.get('pre_fact')['value'])
            preFactScopeVal = self.model.get('pre_fact')['value'];

        // если в итоге  факт превышает план, то генерим исключение
        if(balanceVal - factScopeVal-preFactScopeVal <0)
        {
            tbFactScope.val(self.model.get('fact')?self.model.get('fact')['value']:0);
            $.jGrowl('Ошибка! Фактический объем превышает плановый.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
            return;
        }
        // рассчет баланса
        balanceVal = (((balanceVal - factScopeVal-preFactScopeVal)<0)?(balanceVal - factScopeVal-preFactScopeVal)*-1:balanceVal - factScopeVal-preFactScopeVal);
        // chande data in model
        self.model.set(
            {
                'changed':true,
                'fact': {'value': factScopeVal},
                'balance': balanceVal,
                'fact_time': factScopeVal* Routine.strToFloat(self.model.get('plan_execution_time')['value']),
                'fact_weight': factScopeVal* Routine.strToFloat(self.model.get('weight_per_unit')['value'])
            },
            {silent:false}
        );
        // перерасчет всех данных, относительно измененного объема
        $(this.el).trigger('items_list_view:calculate_data', [this.model]);
        // генерация события на пересчет фактов по примененным шаблонам раксроя
        Backbone.trigger('templates:calculate_facts_by_specifications',[this]);
    },

    /**
    ** обработка клика на флаг использования структуры при расчетах
    **/
     onUseProductStruct: function(e){
        this.model.set({ 'use_product_struct': !this.model.get('use_product_struct') },{silent:false});
    },

    /**
     * обработка раскрытия детализации по истории использования объемов
    **/
    OnShowHistory: function () {
        if(this.$el.find('.lnk-fact-history').hasClass('lnk-sel'))
        {
            this.$el.find('.lnk-fact-history').removeClass('lnk-sel');
            this.historyView.remove();
        }
        else
        {
           this.$el.find('.lnk-fact-history').addClass('lnk-sel');
            var history_collection = new App.Collections.HistoryFactsCollections(this.model.get('pre_fact')['history']);
            this.historyView = new App.Views.HistoryItemsView({collection: history_collection});
            this.$el.after(this.historyView.render().el);
        }
    },
});

///
/// Контрол управления историей фактов
///
App.Views.HistoryItemsView = Backbone.View.extend({
   tagName:'tr',
   templates: {
        main:_.template($("#factHistoryItemsTemplate").html()),
    },

    /**
     * Отрисовка формы
    **/
    render: function () {
        this.$el.html(this.templates.main());
        this.$el.find('tbody').html("");
        var that = this;
        _.each(this.collection.models, function (item) {
                that.renderItem(item);
        }, this);
        return this;
    },

    /**
     * Отрисовка элемента
    **/
    renderItem: function (item) {
        var itemView = new App.Views.HistoryItemView({model: item});
        this.$el.find('tbody').append(itemView.render().el);
    },

});

///
/// Контрол управленяи элементом истории
///
App.Views.HistoryItemView = Backbone.View.extend({
    tagName:'tr',
    templates: {
        main:_.template($("#factHistoryItemTemplate").html()),
    },
    /**
     * Отрисовка элемента
    **/
    render: function () {
        this.$el.html(this.templates.main(this.model.toJSON()));
        return this;
    }
});

///---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
/// Представление диалога создание нового задания по недосдаче
///---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
App.Views.newShiftTaskDlgView = Backbone.View.extend({
    template:_.template($("#newShiftTaskDlgTemplate").html()),
    events:{
        'click .btn-save':'onSaveClick',
        'click .btn-no-save':'onNoSaveClick',
    },

    /**
     ** Инициализация
    **/
    initialize:function(){
        this.render();
    },
    /**
     ** Отрисовка
    **/
    render:function(){
        var self = this;
        this.$el.append(this.template($.extend({},this.model)));
        this.$el.modal({close: function(){}});
        this.$el.on('hidden', function () { self.trigger("dialogclose"); })
        this.$el.find(".tb-note").focus();
        var tmp_date = new Date(this.model.get("near_free_work_date"));
        var tmpDays = 0;
        this.$('.date-picker').datepicker({
            format: "dd/mm/yyyy",
            weekStart: 1,
            todayHighlight: true,
            multidate: true,
            forceParse: false,
            language: "ru",
            todayHighlight: false,
            defaultDate: tmp_date,
            beforeShowDay: function (date){
                var used_dates = self.model.get("used_dates");
                var date_str = date.format("yyyy-mm-dd");
                if(date_str in used_dates)
                    return "used";
            },
        }).on('changeDate', function(ev){
                function cancel_selected_date(ev)
                {
                    // отменить выделение даты
                    var index = 0;
                    for(var i in ev.dates)
                    {
                        index++;
                        if(ev.dates[i].toString() == ev.date.toString())
                        {
                            ev.dates.splice(index-1, 1);
                            break;
                        }
                    }
                    $(ev.delegateTarget).datepicker('setDates', ev.dates);
                }
                if(ev.date)
                {
                    // проверка на занятость даты(на дату уже есть задания)
                    var used_dates = self.model.get("used_dates");
                    var date_str = ev.date.format("yyyy-mm-dd");
                    if(date_str in used_dates)
                    {
                        bootbox.confirm("На указанную дату есть задания № "+used_dates[date_str].join(",")+". Создать ещё одно задание?", function(result)
                        {
                           if(!result)
                                cancel_selected_date(ev);
                        });
                    }
                }
        });

    },

    /**
     ** Не применение действия
    **/
    onNoSaveClick:function(e){
        var self = this;
        self.trigger("dialogsave",{'status': 'no'});
        self.$el.modal('hide');
        self.$el.remove();
    },

    /**
     ** Применение действия
    **/
    onSaveClick:function(e){
        var self = this;
        // проверка на выбранную дату
        var dates =  this.$('.date-picker').datepicker('getDates');
        if (!dates || dates.length==0)
        {
            $.jGrowl('Необходимо задать дату для заданий.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
            return;
        }
        var parsed_task_dates = [];
        for(var i in dates)
            parsed_task_dates.push(dates[i].format("dd/mm/yyyy"));

        // сбор спецификаций и новых плановых объемов
        var items = [];
        _.each(this.model.get('items').models, function (item) {
                var balanceVal = Routine.strToFloat(item.get('count')['value'].toString());
                if(isNaN(balanceVal))
                    balanceVal = 0;
                var factScopeVal = 0;
                if(item.get('fact') &&item.get('fact')['value'])
                    factScopeVal = item.get('fact')['value'];
                var preFactScopeVal = 0;
                if(item.get('pre_fact') &&item.get('pre_fact')['value'])
                    preFactScopeVal = item.get('pre_fact')['value'];
                // рассчет баланса
                balanceVal =balanceVal-factScopeVal-preFactScopeVal;
                if(balanceVal>0)
                {
                    items.push({
                        '_id': item.get('_id'),
                        'sector': self.model.get('sector'),
                        'name': item.get('name'),
                        'number': item.get('number'),
                        'count': item.get('count'),
                        'volume': balanceVal
                    })

                }
        }, this);

        // сбор информации о шаблонах
        var templates = [];
        _.each(this.model.get('templates').models, function (item) {
            if(item.get('count')>item.get('fact_count'))
            {
                var new_item = item.toJSON();
                new_item['qty'] = item.get('count')-item.get('fact_count');
                new_item['count'] = new_item['qty'];
                new_item['fact_count'] = 0;
                templates.push(new_item);
            }
        });

        var dataToSave = {'data': items, 'order_info':  self.model.get('order'), 'dates': parsed_task_dates, 'note': this.$('.note').val(), 'templates': templates};
        Routine.showLoader();
        $.ajax({
            type: "PUT",
            url: "/handlers/shift_task/savedata",
            data: JSON.stringify(dataToSave),
            timeout: 35000,
            contentType: 'application/json',
            dataType: 'json',
            async:true
        }).done(function(result) {
                    if(result['status']=="ok")
                    {
                        // вывод информации о новом задании
                        $.jGrowl('Созданы новые задания № ' + result['new_tasks_numbers'].join("; "), { 'themeState':'growl-success', 'sticky':true });
                        // получение обновленных данных для обновления формы
                        // self.update(result['result']);

                        self.trigger("dialogsave",{'status': 'yes'});
                        self.$el.modal('hide');
                        self.$el.remove();
                    }
                    else
                        $.jGrowl('Ошибка создания новых заданий. Подробности: ' + result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 10000 });
        }).always(function(){Routine.hideLoader()});
    }
})



