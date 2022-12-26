    ///
    /// Глобальная структура
    ///
    var App = {
        Models: {},
        Views:{},
        Collections:{},
        Route:null,
        FindView: null,
        ItemsView: null,
        users:{},   // список пользователей системы

        /**
         *  Инициализация необходимых объектов
        **/
        initialize: function(users)
        {
            this.FindView = new App.Views.FindView();
            this.ItemsView = new App.Views.ItemsView();
            this.Route = new AppRouter();
            Backbone.history.start();
        },

        /**
         *  Получение  ошибок пользователей
        **/
        search: function(users)
        {
            var self = this;
            App.FindView.Refresh(users);
            // получение информации с сервера
             Routine.showLoader();
            $.ajax({
                url: '/handlers/errors/search/',
                type: 'GET',
                dataType: 'json',
                contentType: "application/json; charset=utf-8",
                data: {'users':users},
                timeout: 35000,
                async: true,
                success: function (result, textStatus, jqXHR) {
                    Routine.hideLoader();
                    if(result.status=='error')
                        $.jGrowl(result.msg, { 'themeState':'growl-error', 'sticky':false, 'position': 'bottom-right' });
                    else if(result.status=="ok")
                    {
                        self.ItemsView.collection = new App.Collections.ItemsCollection(JSON.parse(result.result));
                        self.ItemsView.render();
                    }
                    else
                    {
                        $.jGrowl("Ошибка сервера.", { 'themeState':'growl-error', 'sticky':false, 'position': 'bottom-right' });
                        Routine.hideLoader();
                    }
                }
            });
        },
    }

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
        el: $("#pnlErrorsFilter"),
        selectedUsers: [],  // отмеченные для поиска пользователи
        itemsView:null,
        events:{
            'click #btnUsersFind': 'OnSearch',
            'click #btnCheckErrors': 'OnCheckErrors',
        },

        /**
         *  Инициализация
        **/
        initialize: function(users){
            var self = this;
            this.$('.ddl-users').multiselect({
                    buttonContainer: '<span class="dropdown" />',
                    includeSelectAllOption: true,
                    enableCaseInsensitiveFiltering: true,
                    numberDisplayed: 4,
                    filterPlaceholder: 'Найти',
                    nonSelectedText: "Пользователи",
                    nSelectedText: "Выбрано: ",
                    selectAllText: "Все",
                    maxHeight: 400,
                    buttonText: function(options) {
                            if (options.length === 0) {
                                return 'Пользователи <b class="caret"></b>';
                            }
                            else if (options.length > this.numberDisplayed) {
                                    return this.nSelectedText+options.length + ' ' +  ' <b class="caret"></b>';
                            }
                            else {
                                var selected = 'Пользователи: ';
                                options.each(function() {
                                    selected += $(this).val() + ', ';
                                });
                                return selected.substr(0, selected.length -2) + ' <b class="caret"></b>';
                            }
                        },
                        onChange: function(element, checked) {
                             self.selectedUsers = [];
                            self.$('.ddl-users' ).next().find('input:checked').each(function(){
                                             self.selectedUsers.push($(this).val());
                                         });
                        }
                });
        },

         /**
         *  Функция обновления элементов списка пользователей
        **/
        Refresh:function(strUsers){
            var self = this;
            if(strUsers!="" && strUsers!=undefined)
            {
                var arrUsers = strUsers.split(";");
                self.$('.ddl-users option').each(
                    function()
                    {
                        if(arrUsers.indexOf($(this).val())>-1)
                            $(this).prop('selected',true);
                    });
            }
            else
                self.$('.ddl-users option').prop('selected',false);

            self.$('.ddl-users').multiselect('rebuild');
        },

        /**
         *  Функция поиска
        **/
        OnSearch:function(){
            var self = this;
            App.Route.navigate("/"+self.selectedUsers.join(";"),true);
        },

        /**
         *  Функция проверки на ошибки
        **/
        OnCheckErrors:function(){
            var self = this;

            // получение информации с сервера
            Routine.showLoader();
            $.ajax({
                url: '/handlers/errors/check/',
                type: 'GET',
                dataType: 'json',
                contentType: "application/json; charset=utf-8",
                data:self.selectedUsers,
                timeout: 155000,
                async: true,
                success: function (result, textStatus, jqXHR) {
                    Routine.hideLoader();
                    if(result.status=='error')
                        $.jGrowl(result.msg, { 'themeState':'growl-error', 'sticky':false, 'position': 'bottom-right' });
                    else if(result.status=="ok")
                    {
                        console.log(result.result);
                        App.Route.navigate("/"+self.selectedUsers.join(";"),true);
                        $.jGrowl("Операция успешно завершена.", { 'themeState':'growl-success', 'sticky':false, 'position': 'bottom-right' });
                        //self.ItemsView.collection = new App.Collections.ItemsCollection(JSON.parse(result.result));
                        //self.ItemsView.render();
                    }
                    else
                    {
                        $.jGrowl("Ошибка сервера.", { 'themeState':'growl-error', 'sticky':false, 'position': 'bottom-right' });
                        Routine.hideLoader();
                    }
                }
            });
        }
    });

    ///
    /// Контрол управленяи списокм элементов
    ///
   App.Views.ItemsView = Backbone.View.extend({
       el: $("#pnlErrorsDataContainer"),

        /**
         * инициализация
        **/
        initialize: function () {
            var self = this;
            //this.collection = new App.Collections.CalcItemsCollection();
        },

        /**
         * Отрисовка формы
        **/
        render: function () {
            this.$el.html("");
            if(this.collection.length==0)
                this.$el.html('Для выбранных менеджеров нет сообщений.');
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
            this.$el.append(itemView.render().el);
        }
    });

    ///
    /// Контрол управленяи элементом
    ///
    App.Views.ItemView = Backbone.View.extend({
        tagName:'div',
        className:'line data-item',
        templates: {
            main:_.template($("#errorItem").html()),
        },

        /**
         * Присоедиение событий
        **/
        events:{},

        /**
         * Отрисовка элемента
        **/
        render: function () {
            this.$el.html(this.templates.main(this.model.toJSON()));
            return this;
        }
    });

    ///
    /// Подключение роутеров
    ///
    var AppRouter = Backbone.Router.extend({
        routes: {
          "": "index",
          ":users": "index"
        },
        index:function(users){
            App.search(users);
        }
    });
