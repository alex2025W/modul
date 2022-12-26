    ///
    /// Глобальная структура
    ///
    var App = {
        Models: {},
        Views:{},
        Collections:{},
        Route:null,
        FindView: null,

        /**
         *  Инициализация необходимых объектов
        **/
        initialize: function()
        {
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
                App.FindView.search(url);
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
        el: $("#pnlStockFilter"),
        selDate: "",            // текущая выбранная дата
        selTime: "",            // текущее выбранное время
        stockView:null,     // view отображения данных склада
        data: null,                // коллекция данных
        itemView: null,
        templates: {},
        events:{
            'click #btnStockFind': 'OnSearch',
            'click #btnDownloadStat': 'OnDownloadStat',
        },

        /**
         * Получение URL
        **/
        getUrl: function()
        {
           var url = "";
           // получение даты
           url +=this.selDate.split('/').join('_');
           // получение времени
           url +=this.selTime.split(':').join('_');

            return url.split(' ').join('%20');
        },

        /**
         *  Инициализация
        **/
        initialize: function(users){
            var self = this;
            this.stockView = new App.Views.StockView();
            // фильтр по дате

            this.$('.date-picker').datepicker({
                weekStart:1,
                format: "dd/mm/yyyy",
                weekStart: 1,
                autoclose: true,
                todayHighlight: true,
                defaultDate: new Date()
            }).on('changeDate', function(ev){
                //App.Route.navigate("/"+ev.date.format("dd/mm/yyyy").split('/').join('_'), true);
            });
            this.$('.date-picker').datepicker('setDate', new Date());

            $('#tbTime').timepicker({
                minuteStep: 1,
                showSeconds: false,
                showMeridian: false
            });
        },

        /**
         *  Установление даты в календаре
        **/
        setDate: function(sel_date)
        {
               // проверка введенной даты
            if(!sel_date || sel_date=="")
                return;
            if(!Routine.isValidDate(sel_date))
            {
               $.jGrowl('Задана неверная дата.', { 'themeState':'growl-error', 'sticky':false, 'position': 'bottom-right' });
               return;
            }
             this.$('.date-picker').datepicker('setDate', Routine.parseDate(sel_date));
        },

        /**
         * Рендер данных
        **/
        render: function()
        {
        },

        /**
        ** Обработка кнопки поиска
        **/
        OnSearch: function()
        {
            App.Route.navigate("/"+this.$('#tbDate').val().split('/').join('_') +"&" + this.$('#tbTime').val().split(':').join('_') , true);
        },

           /**
     *  Клик на кнопку загрузки статистики
    **/
    OnDownloadStat: function(e)
    {
        var self  = this;
        $('body').css('cursor', 'wait');
        self.$('#btnDownloadStat').css('cursor', 'wait');
        window.location='/stats/stock/vers1/'+this.$('#tbDate').val().split('/').join('_') +"_" + this.$('#tbTime').val().split(':').join('_');
        setTimeout(function(){$('body').css('cursor', 'default'); self.$('#btnDownloadStat').css('cursor', 'pointer');}, 20000);
    },

        /**
         *  Получение  данных
         *  21_08_2014
        **/
        search: function(query)
        {
            var self = this;
            var query_items =[];
            var data = [];
            var sel_date = null;
            var sel_time = null;
            if(query)
            {
                query = decodeURIComponent(query);
                query_items = query.split('&');
                sel_date = query_items[0].split('_').join('/');

                if(query_items.length>1)
                    sel_time = query_items[1].split('_').join(':');
            }
            if(!sel_date)
            {
                sel_date = new Date().format("dd/mm/yyyy");
            }
            self.selDate = sel_date;

            if(!sel_time)
            {
                var date = new Date();
                var time = date.getHours()+':'+date.getMinutes();
                sel_time = time;
            }
            self.sel_time = sel_time;

            this.$('.date-picker').datepicker('setDate', sel_date);
            this.$('#tbTime').timepicker('setTime', sel_time);

            Routine.showLoader();
            $.ajax({
                    url: '/handlers/stock/search/',
                    type: 'GET',
                    dataType: 'json',
                    contentType: "application/json; charset=utf-8",
                    data: {'date':sel_date, 'time': sel_time},
                    timeout: 45000,
                    async: true,
                    success: function (result, textStatus, jqXHR) {
                        Routine.hideLoader();
                        if(result.status=='error')
                            $.jGrowl(result.msg, { 'themeState':'growl-error', 'sticky':false, 'position': 'bottom-right' });
                        else if(result.status=="ok")
                        {
                            // подготовка данных
                            self.stockView.collection = new App.Collections.ItemsCollection(result.data);
                            self.stockView.render();
                        }
                        else
                        {
                            $.jGrowl("Ошибка сервера.", { 'themeState':'growl-error', 'sticky':false, 'position': 'bottom-right' });
                            Routine.hideLoader();
                        }
                    }
               });
        },
    });

    ///
    /// Контрол управленяи списокм элементов
    ///
   App.Views.StockView = Backbone.View.extend({
       el: $("#pnlStockDataContainer"),

        /**
         * Отрисовка формы
        **/
        render: function () {
            this.$el.find('tbody').html("");
            /*if(this.collection.length==0)
                this.$el.html('На выбранную дату на складе не было позиций.');*/
            var that = this;
                _.each(this.collection.models, function (item) {
                    that.renderItem(item);
            }, this);
        },

        /**
         * Отрисовка элемента
        **/
        renderItem: function (item) {
            var itemView = new App.Views.ItemView({model: item});
            this.$el.find('tbody').append(itemView.render().el);
        }
    });

    ///
    /// Контрол управленяи элементом
    ///
    App.Views.ItemView = Backbone.View.extend({
        tagName:'tr',
        historyView: null, // контрол отображения истории
        //className:'line data-item',
        templates: {
            main:_.template($("#stockItem").html()),
        },
        events:{
            'click .lnk-history': 'OnShowHistory',
        },

        /**
         * Отрисовка элемента
        **/
        render: function () {
            this.$el.html(this.templates.main(this.model.toJSON()));
            return this;
        },

         /**
         * обработка раскрытия детализации по истории использования объемов
        **/
        OnShowHistory: function () {
            if(this.$el.find('.lnk-history').hasClass('lnk-sel'))
            {
                this.$el.find('.lnk-history').removeClass('lnk-sel');
                this.historyView.remove();
            }
            else
            {
               this.$el.find('.lnk-history').addClass('lnk-sel');
                var history_collection = new App.Collections.ItemsCollection(this.model.get('use_history'));
                this.historyView = new App.Views.HistoryItemsView({collection: history_collection});
                this.$el.after(this.historyView.render().el);
            }
        }
    });

    ///
    /// Контрол управления историей использования объемов элемента
    ///
   App.Views.HistoryItemsView = Backbone.View.extend({
       tagName:'tr',
       templates: {
            main:_.template($("#historyItems").html()),
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
        //className:'line data-item',
        templates: {
            main:_.template($("#historyItem").html()),
        },

        /**
         * Отрисовка элемента
        **/
        render: function () {
            this.$el.html(this.templates.main(this.model.toJSON()));
            return this;
        }
    });
