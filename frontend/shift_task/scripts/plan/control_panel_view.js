///
/// Панель управления на форме, включая фильтрацию и сортировки
///
App.Views.ControlPanelView = Backbone.View.extend({
    el: $("#controlPanel"),
    events:{
        'click .btn-search': 'onSearch',
        'click #cb-group-by-sectors': 'onGroupBySectors'
    },
    templates: {
        filter_item_templateOrder:_.template($("#filterItemTemplateOrder").html()),
    },
    selected_orders : [], // выбранные номера договоров

    /**
     * Инициализация
    **/
    initialize: function(orders)
    {
        this.selected_orders = [];
        this.render(orders);
        //Backbone.on("global:on_group_by_sectors",this.onGroupBySectors,this);
    },

    /**
    * Отрисовка
    **/
    render: function(orders){
        var self = this;
        // подключение мультиселекта на заказы
        this.selected_orders = [];
        this.$('.ddl-orders').multiselect({
                buttonContainer: '<span class="dropdown" />',
                includeSelectAllOption: false,
                enableCaseInsensitiveFiltering: true,
                numberDisplayed: 1,
                filterPlaceholder: 'Найти',
                nonSelectedText: "Выберите",
                nSelectedText: "",
                selectAllText: "Все",
                maxHeight: 300,
                maxWidth: 300,
                 buttonText: function(options) {
                        if (options.length === 0) {
                            return 'Выберите <b class="caret"></b>';
                        }
                        else if (options.length > this.numberDisplayed) {
                                return this.nSelectedText+options.length + ' ' +  ' <b class="caret"></b>';
                        }
                        else {
                            var selected = '';
                            options.each(function() {
                                selected += $(this).val() + ', ';
                            });
                            return selected.substr(0, selected.length -2) + ' <b class="caret"></b>';
                        }
                    },
                    onChange: function(element, checked) {
                            self.selected_orders = [];
                             $('option', self.$('.ddl-orders')).each(function(item) {
                                if($(this).val()!=element.val())
                                    self.$('.ddl-orders').multiselect('deselect', $(this).val());
                             });

                            if(checked === true)
                            {
                                if(element.val()=='multiselect-all')
                                {
                                    self.selected_orders = [];
                                     $(self.el).find('.ddl-orders' ).next().find('input:visible').each(function(){
                                        if($(this).val()!="" && $(this).val()!='multiselect-all' && !$(this).prop('disabled'));
                                            self.selected_orders.push($(this).val());
                                     });
                                }
                                else
                                    self.selected_orders.push(element.val());
                            }
                            else
                            {
                                if(element.val()=='multiselect-all')
                                {
                                    self.selected_orders = [];
                                }
                                else
                                {
                                    if(self.selected_orders.indexOf(element.val())>-1)
                                        self.selected_orders.splice(self.selected_orders.indexOf(element.val()),1);
                                }
                            }
                    }
            });
        this.fillOrders(orders, null);
    },

    /**
     * Группировать по участкам
    **/
    onGroupBySectors:function(e)
    {
        var self = this;
        $('body').addClass('wait');
        Backbone.trigger('global:on_url_params_change',[this, 'group_by_sectors', this.$("#cb-group-by-sectors").prop('checked').toString()]);
        //Backbone.trigger('global:on_group_by_sectors',[this, this.$("#cb-group-by-sectors").prop('checked')]);
        if(App.items_collection)
        {
            setTimeout(function(){
                App.DataView.render(App.sectors_collection, App.items_collection, App.templates_collection ,App.full_order_params, self.$("#cb-group-by-sectors").prop('checked'));
            },200);
        }
    },

    /**
     * Заполнение выпадающего списка заказов
    **/
    fillOrders: function(data, selected)
    {
        var ddl = this.$(".ddl-orders").empty();
        for(var i in data)
        {
            data[i].selected = false;
            if(data[i]['number']== selected)
            {
                data[i].selected = true;
                this.selected_orders.push(data[i]['number']);
            }
            $(ddl).append(this.templates.filter_item_templateOrder(data[i]));
        }
        $(ddl).multiselect('rebuild');
    },

    /**
     *  Проверка нажатой клавиши в поле поиска
    **/
    logKey: function(e)
    {
        if(e.keyCode ==13)
            this.onSearch();
    },

    /**
     * Вызов функции поиска заказа
    **/
    onSearch:function(e)
    {
        var number = ((this.selected_orders && this.selected_orders.length>0)?this.selected_orders[0]:null);
        if(number)
            App.doQuery("number/"+number+"/tab/1/group_by_sectors/"+this.$el.find("#cb-group-by-sectors").prop('checked').toString());
        else
            $.jGrowl('Не задан номер заказа.', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
    },

    /**
     * Поиск и открытие заказа
    **/
    doSearch:function(number, group_by_sectors)
    {
           var self = this;
           this.$("#cb-group-by-sectors").prop("checked", group_by_sectors);
           // проверка номера заказа
           if(!number)
            {
                $.jGrowl('Не задан номер заказа.', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                return;
           }
            // Фильтр - Заполнение выпадающего списка заказов
            this.fillOrders(App.orders, number);
            // прелоадер
           Routine.showLoader();
           $.ajax({
                    type: "GET",
                    url: "/handlers/shift_task/search/" + number,
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
                            // номер заказа
                            App.order_info = result['result']['order_info'];
                            // структуры спецификаций, входящих в заказ
                            App.prepare_specifications_struct(result["result"]["specifications_struct"]);
                            // статистическая информация по всему заказу(когда отменяется группировка по участку)
                            App.full_order_params = new App.Models.FullOrderModel(result['result']['full_order_params']);
                            // участки
                            App.sectors_collection = new App.Collections.SectorsCollection(result['result']['sectors']);
                            // спецификации
                            App.items_collection = new App.Collections.ItemsCollection(result['result']['data']);
                            // шаблоны раскроя
                            App.templates_collection = new App.Collections.TemplatesCollection(result['result']['templates'].map(function(item){return new App.Models.TemplateModel(item)}) ,{specifications_collection: App.items_collection});
                            // отрисовка основной формы
                            App.DataView.render(App.sectors_collection, App.items_collection, App.templates_collection, App.full_order_params, group_by_sectors);
                            // отрисовка технологической карты
                            App.DataView.render_techno_map(result['result']['techno_map']);
                            // все задействованные в заказе спецификации
                            App.all_used_specifications = result['result']['all_used_specifications'];
                        }
                    }).error(function(){
                                self.clear();
                                $.jGrowl('Ошибка поиска заказа. Повторите попытку. ', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                    }).always(function(){Routine.hideLoader();});
    },

    /**
     * Очистка форм
    **/
    clear: function()
    {
        App.DataView.clear();
        App.sectors_collection = null;
        App.items_collection = null;
    }
});
