    ///
    /// Глобальная структура
    ///
    var App = {
        Models: {},
        Views:{},
        Collections:{},
        Route:null,
        FindView: null,
        Sectors: null,          // список всех участков
        Orders: null,            // список всех номеров заказов

        /**
         *  Инициализация необходимых объектов
        **/
        initialize: function(sectors, orders)
        {
            this.Sectors = sectors;
            this.Orders = orders;
            this.FindView = new App.Views.FindView();
            this.Route = new AppRouter();
            Backbone.history.start();
        }
    }

    ///
    /// Подключение роутеров
    ///
    var AppRouter = Backbone.Router.extend({
        routes: {
          "": "index",
          ":url": "index"
        },
        index:function(url){
                var query_items =[];
                if(url)
                {
                    url = decodeURIComponent(url);
                    query_items = url.split('&');
                }
                App.FindView.setFilters(query_items);
                App.FindView.render();
        }
    });

    ///
    /// Модель элемента
    ///
    App.Models.ItemModel = Backbone.Model.extend({});

    ///
    /// Коллекция элементов
    ///
    App.Collections.ItemsCollection =Backbone.Collection.extend({
            model: App.Models.ItemModel
    });

    ///
    /// Контрол управления поиском на форме
    ///
    App.Views.FindView = Backbone.View.extend({
        el: $("#pnlPurchaseNormsFilter"),
        templates: {
            item_templateSector:_.template($("#filterItemTemplateSector").html()),
            item_templateOrder:_.template($("#filterItemTemplateOrder").html()),
        },
        selectedSectors:[], // список выбранных участков
        selectedOrders:[],   // список выбранных заказов
        events:{
            'click #btnDownloadStat': 'OnDownload',
        },

        /**
         * Получение URL
        **/
        getUrl: function()
        {
           var url = "";
           // получение участков
           if(this.selectedSectors.length>0)
            url += "&sectors["+ this.selectedSectors.join(",") + "]";
            // получение заказов
           if(this.selectedOrders.length>0)
            url += "&orders["+ this.selectedOrders.join(",") + "]";
            return url.split(' ').join('%20');
        },

        /**
         *  Инициализация
        **/
        initialize: function(users){
            var self = this;
            // подключение мультиселекта на участки
            this.$('.ddl-sectors').multiselect({
                    buttonContainer: '<span class="dropdown" />',
                    includeSelectAllOption: true,
                    enableCaseInsensitiveFiltering: true,
                    numberDisplayed: 1,
                    filterPlaceholder: 'Найти',
                    nonSelectedText: "Участки",
                    nSelectedText: "Участков выбрано: ",
                    selectAllText: "Все",
                    maxHeight: 400,                    
                     buttonText: function(options) {
                            if (options.length === 0) {
                                return 'Участки <b class="caret"></b>';
                            }
                            else if (options.length > this.numberDisplayed) {
                                    return this.nSelectedText+options.length + ' ' +  ' <b class="caret"></b>';
                            }
                            else {
                                var selected = 'Участки: ';
                                options.each(function() {
                                    selected += $(this).val() + ', ';
                                });
                                return selected.substr(0, selected.length -2) + ' <b class="caret"></b>';
                            }
                        },
                        onChange: function(element, checked) {
                                if(checked === true)
                                {
                                    if(element.val()=='multiselect-all')
                                    {
                                        self.selectedSectors = [];
                                        // take only visible elems
                                         $(self.el).find('.ddl-sectors' ).next().find('input:visible').each(function(){
                                            //visibleElems[$(this).val()] = $(this).val();
                                            if($(this).val()!="" && $(this).val()!='multiselect-all' && !$(this).prop('disabled'));
                                                self.selectedSectors.push($(this).val());
                                         });
                                    }
                                    else
                                        self.selectedSectors.push(element.val());
                                }
                                else
                                {
                                    if(element.val()=='multiselect-all')
                                        self.selectedSectors = [];
                                    else if(self.selectedSectors.indexOf(element.val())>-1)
                                            self.selectedSectors.splice(self.selectedSectors.indexOf(element.val()),1);
                                }
                                // получение текущего url
                                 App.Route.navigate("/"+self.getUrl(), false);
                        }
                });
                // подключение мультиселекта на заказы
                this.$('.ddl-orders').multiselect({
                    buttonContainer: '<span class="dropdown" />',
                    includeSelectAllOption: true,
                    enableCaseInsensitiveFiltering: true,
                    numberDisplayed: 2,
                    filterPlaceholder: 'Найти',
                    nonSelectedText: "Заказы",
                    nSelectedText: "Заказов выбрано: ",
                    selectAllText: "Все",
                    maxHeight: 400,
                    enableClickableOptGroups:true,
                     buttonText: function(options) {
                            if (options.length === 0) {
                                return 'Заказы <b class="caret"></b>';
                            }
                            else if (options.length > this.numberDisplayed) {
                                    return this.nSelectedText+options.length + ' ' +  ' <b class="caret"></b>';
                            }
                            else {
                                var selected = 'Заказы: ';
                                options.each(function() {
                                    selected += $(this).val() + ', ';
                                });
                                return selected.substr(0, selected.length -2) + ' <b class="caret"></b>';
                            }
                        },
                        onChange: function(element, checked) {
                                if(checked === true)
                                {
                                    if(element.val()=='multiselect-all')
                                    {
                                        self.selectedSectors = [];
                                        // take only visible elems
                                         $(self.el).find('.ddl-orders' ).next().find('input:visible').each(function(){
                                            //visibleElems[$(this).val()] = $(this).val();
                                            if($(this).val()!="" && $(this).val()!='multiselect-all' && !$(this).prop('disabled'));
                                                self.selectedOrders.push($(this).val());
                                         });
                                    }
                                    else
                                        self.selectedOrders.push(element.val());
                                }
                                else
                                {
                                    if(element.val()=='multiselect-all')
                                        self.selectedOrders = [];
                                    else if(self.selectedOrders.indexOf(element.val())>-1)
                                            self.selectedOrders.splice(self.selectedOrders.indexOf(element.val()),1);
                                }
                                // получение текущего url
                                 App.Route.navigate("/"+self.getUrl(), false);
                        }
                });
        },

        /**
         * Проставка фильтров
         **/
         setFilters: function(query_items)
         {
            // обработка значений
            for(var i in query_items)
            {
                var cur_item = query_items[i];
                if(cur_item.indexOf("sectors[")==0)
                {
                    var vals = cur_item.replace("sectors[","").replace("]","").substring(0, cur_item.length - 1).split(',');
                    this.selectedSectors = vals;
                }
                else if(cur_item.indexOf("orders[")==0)
                {
                    var vals = cur_item.replace("orders[","").replace("]","").substring(0, cur_item.length - 1).split(',');
                    this.selectedOrders = vals;
                }
            }
            this.fillSectors(App.Sectors, App.Sectors, this.selectedSectors);
            this.fillOrders(App.Orders, this.selectedOrders);
         },

        /**
         * Заполнение выпадающего списка участков
        **/
        fillSectors: function(sectors, used_sectors, selected_sectors)
        {
                var ddl = this.$(".ddl-sectors").empty();
                for(var i in sectors)
                {
                    sectors[i].enabled = true;
                    /*if(used_sectors.indexOf(sectors[i].code)>-1)
                        sectors[i].enabled = true;
                    else
                        sectors[i].enabled = false;*/

                    if(selected_sectors.indexOf(sectors[i].code.toString())>-1)
                        sectors[i].checked = true;
                    else
                        sectors[i].checked = false;

                    $(ddl).append(this.templates.item_templateSector(sectors[i]));
                }
                $(ddl).multiselect('rebuild');
       },

        /**
         * Заполнение выпадающего списка заказов
        **/
        fillOrders: function(orders, selected_orders)
        {
                var ddl = this.$(".ddl-orders").empty();

                /*for(var i in orders)
                {
                    if(selected_orders.indexOf(orders[i].number.toString())>-1)
                        orders[i].checked = true;
                    else
                        orders[i].checked = false;
                    $(ddl).append(this.templates.item_templateOrder(orders[i]);
                } */
                $(ddl).append(this.templates.item_templateOrder({'orders':orders,'selected_orders':selected_orders}));
                $(ddl).multiselect('rebuild');
       },

        /**
         * Рендер данных
        **/
        render: function()
        {
                this.$('.pnl-ddl-sectors').show();
                this.$('.pnl-ddl-orders').show();
        },

        /**
         *  Функция поиска
        **/
        OnDownload:function(){
            //console.log(this.selectedSectors);
            //console.log(this.selectedOrders);

            if(!this.selectedOrders || this.selectedOrders.length==0)
            {
                $.jGrowl('Задайте заказы.', { 'themeState':'growl-error', 'sticky':false });
                return;
            }
            var self  = this;
            $('body').css('cursor', 'wait');
            self.$('#btnDownloadStat').css('cursor', 'wait');
            //window.location = '/handlers/purchasenorms/get_statistic/?orders='+this.selectedOrders.join(';')+'&sectors=' +this.selectedSectors.join(';');
            window.location = '/handlers/purchasenorms/get_statistic/?orders='+this.selectedOrders.join(',')+'&sectors=' +this.selectedSectors.join(';');
            setTimeout(function(){$('body').css('cursor', 'default'); self.$('#btnDownloadStat').css('cursor', 'pointer');}, 2000);
        },
    });
