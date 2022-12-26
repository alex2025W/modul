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
        },

        /**
         *  Генерация бланков
        **/
        generate: function(order_number,split_sectors, notify_users, use_old_blanks, data)
        {
             dataToSave = {
                'num':  order_number,
                'split_sectors': split_sectors,
                'notify_users': notify_users,
                'use_old_blanks': use_old_blanks,
                'sectors': data
             };
             Routine.showLoader();
             $.ajax({
                type: "PUT",
                url: "/handlers/plannormblank/generate_blanks",
                data: JSON.stringify(dataToSave),
                timeout: 35000,
                contentType: 'application/json',
                dataType: 'json',
                async:true
                }).done(function(result) {
                        Routine.hideLoader();
                        if(result['status']=="ok")
                        {

                            console.log(JSON.stringify(result));
                            // обновление формы
                            $.jGrowl('Бланки успешно созданы.', { 'themeState':'growl-success', 'sticky':false });
                            App.Route.navigate("", true);
                            App.Route.navigate("/"+order_number, true);
                            /*$.ajax({
                                type: "PUT",
                                url: "/handlers/plannormblank/send_notification",
                                data: JSON.stringify(dataToSave),
                                timeout: 35000,
                                contentType: 'application/json',
                                dataType: 'json',
                                async:true
                                }).done(function(result) {
                                    if(result['status']=="error")
                                        console.log('Ошибка рассылки уведомлений о переносе/приостановке плановых дат нарядов. Подробности: ' + result['msg']);
                                }).fail(function(jqXHR, textStatus, errorThrown ) {
                                        console.log('Ошибка рассылки уведомлений о переносе/приостановке плановых дат нарядов. Подробности: ' + errorThrown)
                            });*/

                        }
                        else
                        {
                            $.jGrowl('Ошибка формирования бланков. Подробности: ' + result['msg'], { 'themeState':'growl-error', 'sticky':false });
                        }

                    }).fail(function(jqXHR, textStatus, errorThrown ) {
                            //FilterPanel.hideLoader();
                            $.jGrowl('Ошибка формирования бланков. Подробности:' + errorThrown, { 'themeState':'growl-error', 'sticky':false });
                            Routine.hideLoader();
                    });
        },
    }

    ///
    /// Подключение роутеров
    ///
    var AppRouter = Backbone.Router.extend({
        routes: {
          "": "index",
          ":order": "index"
        },
        index:function(order_number){
            App.FindView.search(order_number);
        }
    });

    ///
    /// Модель элемента
    ///
    App.Models.ItemModel = Backbone.Model.extend({
        defaults:{
          'checked': false,
        }
    });

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
        el: $("#pnlPlanNormBlankFilter"),
        orderNumber: "",  // номер заказа
        planeNormBlanksView:null,
        itemsCollection: null,
        itemView: null,
        events:{
            'click #btnPlanNormBlankFind': 'OnSearch',
            'keypress #tbOrderNumber': 'logKey',
        },

        /**
         *  Инициализация
        **/
        initialize: function(users){
            this.planeNormBlanksView = new App.Views.PlaneNormBlanksView();
        },

        /**
         *  Получение  данных
        **/
        search: function(order_number)
        {
            var self = this;
            var data = [];
            self.orderNumber = order_number;
            // проверка введенного номера заказа
            if(!order_number || order_number=="")
            {
               self.render(order_number, data);
               return;
            }

            var tmpData = order_number.split(".");
            if(tmpData.length<2 || tmpData.length>3)
                $.jGrowl('Введен неверный номер заказа.', { 'themeState':'growl-error', 'sticky':false });
            else
            {
                   Routine.showLoader();
                   $.ajax({
                        url: '/handlers/plannormblank/search/',
                        type: 'GET',
                        dataType: 'json',
                        contentType: "application/json; charset=utf-8",
                        data: {'num':order_number},
                        timeout: 35000,
                        async: true,
                        success: function (result, textStatus, jqXHR) {
                            Routine.hideLoader();
                            if(result.status=='error')
                                $.jGrowl(result.msg, { 'themeState':'growl-error', 'sticky':false });
                            else if(result.status=="ok")
                            {
                                console.log(JSON.stringify(result.data));
                                data = result.data;
                            }
                            else
                            {
                                $.jGrowl("Ошибка сервера.", { 'themeState':'growl-error', 'sticky':false });
                                Routine.hideLoader();
                            }
                            self.render(order_number, data);
                        }
                   });
            }
        },

        /**
         * Рендер данных и обновление формы
        **/
        render: function(order_number, data)
        {
             // обновление номера в поле поиска
             this.$('#tbOrderNumber').val(order_number);
            // получение новой коллекции данных и обновление на форме
             this.itemsCollection = new App.Collections.ItemsCollection(data);
             this.planeNormBlanksView.render(this.itemsCollection);
        },

        /**
         *  Проверка нажатой клавиши в поле поиска
        **/
        logKey: function(e)
        {
            if(e.keyCode==13)
                this.OnSearch();
        },

        /**
         *  Функция поиска
        **/
        OnSearch:function(){
            App.Route.navigate("/"+this.$('#tbOrderNumber').val(), true);
        }
    });

    ///
    /// Контрол управления всей формой
    ///
    App.Views.PlaneNormBlanksView = Backbone.View.extend({
        el: $("#pnlPlanNormBlankBody"),
        itemsView:null,
        useOldBlanks: true,
        events:{
            //'click .cb-split-sectors': 'OnSplitSectors',
            'click .cb-no-old-blanks': 'OnNoOldBlanks',
            //'click .cb-send-notify': 'OnSendNotify',
            'click .btnCancel': 'OnCancel',
            'click .btnOk': 'OnOk',
        },

        /**
         *  Инициализация
        **/
        initialize: function(users){
        },

        /**
         *  Кнопка отмена
        **/
        OnCancel:function(){
            App.Route.navigate("", true);
        },

        /**
         *  Кнопка генерации бланков
        **/
        OnOk:function(){

            // проверка на наличие выбранных секторов
            haveCheckedElems = false;
             _.each(this.itemsView.collection.models, function (item) {
                    if(item.get('checked'))
                        haveCheckedElems = true;
            }, this);
             if(haveCheckedElems)
                App.generate(App.FindView.orderNumber, this.$('.cb-split-sectors').is(':checked'), this.$('.cb-send-notify').is(':checked'), this.$('.cb-no-old-blanks').is(':checked'), this.itemsView.collection) ;
            else
                $.jGrowl('Не выбраны участки, на которые необходимы бланки..', { 'themeState':'growl-error', 'sticky':false });
        },

        /**
         *  Флаг отключения просмотра участков на котоыре уже есть бланки
        **/
        OnNoOldBlanks:function(){
            this.useOldBlanks =  this.$('.cb-no-old-blanks').is(':checked');
            this.itemsView.activateElems(!this.useOldBlanks);
        },

        /**
         * Отрисовка формы
        **/
        render: function (collection) {
            //  очистка формы и привод ее к первоначальному состоянию
            this.$('.cb-split-sectors').prop('checked', true);
            this.$('.cb-no-old-blanks').prop('checked', true);
            this.$('.cb-send-notify').prop('checked', true);
             // заполнение элементов
            if(collection.length==0)
            {
                   this.$("#pnlPlanNormBlankoptions").hide();
                   this.$(".control-panel").hide();
            }
            else
            {
                    this.$("#pnlPlanNormBlankoptions").show();
                    this.$(".control-panel").show();
            }
             this.itemsView = new App.Views.ItemsView({collection: collection});
             this.itemsView.render();
        },
    });

    ///
    /// Контрол управленяи списокм элементов
    ///
   App.Views.ItemsView = Backbone.View.extend({
       el: $("#pnlPlanNormBlankContainer"),
        templates: {
            item_head:_.template($("#item-head").html()),
        },

        /**
         * инициализация
        **/
        initialize: function () {
            // отменяем собюытия навешенные ранее
            $(this.el).off('click', '.cbsector-type');
        },

        /**
         * Присоедиение событий
        **/
        events:{
             'click .cbsector-type': 'OnItemClick',
        },

        /**
         * Обработка выделения элементв
        **/
        OnItemClick: function (e) {
            //this.model.set({'changed':true, 'checked': this.$('.cb-sector').is(':checked')});
            // проходим по коллекции элементов, и выделяем элементы
            var self = this;
            var curElem = $(e.currentTarget);
            var checked = false;
            if(curElem.is(':checked'))
                checked = true;

            _.each(this.collection.models, function (item) {
                    if(item.get('type')==curElem.val() && (item.get('haveItemsWithoutBlank') || !App.FindView.planeNormBlanksView.useOldBlanks))
                    {
                        item.set({'checked':checked}) ;
                        self.$el.find('.cb-sector[value="'+item.get('_id')+'"]').prop('checked', checked);
                    }
            }, this);
        },

        /**
         * Активация элементов на которые уже есть бланки
        **/
        activateElems: function (status) {
            var self = this;
            if(status)
                self.$el.find('.cb-sector').prop('disabled', false);
            else
            {
                _.each(this.collection.models, function (item) {
                    if(!item.get('haveItemsWithoutBlank'))
                    {
                        self.$el.find('.cb-sector[value="'+item.get('_id')+'"]').prop('checked', false).prop('disabled', true);
                        item.set({'checked':false}) ;
                    }
                },this);
            }
        },

        /**
         * Отрисовка формы
        **/
        render: function () {
            // очистка формы
            this.$el.html("");
            // заполнение элементов
            var self = this;
            var curGroup = {'type':''}
            _.each(this.collection.models, function (item) {
                if(curGroup['type']!=item.get('type'))
                {
                    curGroup['type'] = item.get('type');
                    this.$el.append(self.templates.item_head(curGroup));
                }
                    self.renderItem(item);
            }, this);
        },

        /**
         * Отрисовка элемента
        **/
        renderItem: function (item) {
            var itemView = new App.Views.ItemView({model: item});
            this.$el.append(itemView.render().el);
        }
    });

    ///
    /// Контрол управленяи элементом
    ///
    App.Views.ItemView = Backbone.View.extend({
        tagName:'div',
        className:'item',
        templates: {
            item:_.template($("#item").html()),
        },

        /**
         * Присоедиение событий
        **/
        events:{
             'click .cb-sector': 'OnItemClick',
        },

        /**
         * Отрисовка элемента
        **/
        render: function () {
            //if(this.model.get('type')=='sector_group')
            //    this.$el.html(this.templates.item_head(this.model.toJSON()));
            //else
            this.$el.html(this.templates.item(this.model.toJSON()));
            return this;
        },

        /**
         * Обработка выделения элементв
        **/
        OnItemClick: function () {
            this.model.set({'changed':true, 'checked': this.$('.cb-sector').is(':checked')});
        }
    });


