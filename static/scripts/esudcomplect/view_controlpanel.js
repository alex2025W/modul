///
/// Панель управления на форме
///
App.Views.ControlPanelView = Backbone.View.extend({
    el: $("#controlPanel"),
    events:{
        'click #btn_open_complect': 'onOpen',
        'keypress .tb-complect-number': 'pressComplectSearchKey',
        'click .btn-save-complect': 'onSaveComplect',
        'click .btn-collapse': 'OnCollapse',
        'click .btn-calculate-complect': 'onComplectCalculate',
        'change .ddl-save-type': 'onChangeSaveType',
        'click #cb-only-options': 'onShowOnlyOptions',
        'click #cb-use-conditions': 'onUseConditions'
    },
    complectInfo: null,                    // информация о комплекте
    queue: null,                                        // объект для выполнения операции в бэкграунде
    complect_changed: false,     // флаг отслеживания изменения комплекта
    is_read_mode: false,                     // режим отображения данных(просмотр/редактирование)

    /**
     * Инициализация
    **/
    initialize: function()
    {
        this.complect_changed = false;
        this.complectInfo = null;
        // глобальное событие смены параметра конфигурации
        // необходимо, чтобы лочить кнопки панели управления
        Backbone.on("global:change_config_param",this.onGlobalChangeConfigParam,this);
        // глобальное событие на очистку данных
        Backbone.on("global:clear",this.onGlobalClear,this);
        // глобальное событие на смену страницы в пейджере
        Backbone.on("pager:change_page",this.onChangePage,this);
        // глобальное событие на выбор конкретной комплекта из списка
        Backbone.on("complectlist:select_item",this.onComplectSelectItem,this);
        // глобальное событие смены таба
        Backbone.on("global:on_show_tab",this.onChangeTab,this);
    },

    /**
     * Обработка глобавльного события смены таба(отображение/редактирование)
    **/
    onChangeTab: function(e, val)
    {
            if(e[1] == "2")
                this.$el.find('.edit-view').hide();
            else
                this.$el.find('.edit-view').show();
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
     *  Обработка события выбора конкретной комплекта из списка
    **/
    onComplectSelectItem: function(e)
    {
        var row = e[0].model;
    },

    /**
     * Вызов функции получения данных о комплектах по странице
    **/
    loadList:function(page)
    {
        // вызов события обновления URL адреса
        Backbone.trigger('global:on_url_params_change',[this, 'list', page]);
        // показываем форму отображения списка комплектов
        App.ComplectListView.show();
        App.DataPanelView.hide();
        // ограничить панель простым видом
        this.ShowSimpleView();
        // подгрузка и отображение данных
        Routine.showLoader();
       $.ajax({
                type: "POST",
                url: "/handlers/esudcomplect/get_list/" + page,
                data: {},
                timeout: 55000,
                contentType: 'application/json',
                dataType: 'json',
                async:true
        }).done(function(result) {
            if(result['status']=="error")
                $.jGrowl(result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 10000 });
            else
            {
                    // количество комплектов всего
                    var count = Routine.strToFloat(result['count']);
                    // заполнение коллекции комплектов и построение формы
                    App.ComplectListCollection = new App.Collections.ComplectItemsCollection(result['data'],{parse: true});
                    App.ComplectListView.render(App.ComplectListCollection, page, count);
            }
        }).error(function(){
                $.jGrowl('Ошибка загрузки списка комплектов. Повторите попытку. ', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
        }).always(function(){Routine.hideLoader();});
    },

    /**
     * Вызов функции получения данных о моделе/комплекте
    **/
    doOpen:function(number)
    {
        this.complect_changed = false;
        this.complectInfo = null;
        App.currentItemNumber = number;

        // Показываем форму построения комплекта
        App.DataPanelView.show();
        App.ComplectListView.hide();
        // приводим основную панель к полному виду
        this.ShowFullView();
        // приводим основную панель данных в исходное состояние
        App.DataPanelView.refresh();

        if(!number)
        {
            $.jGrowl('Не задан артикул модели/комплекта.', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
            Backbone.trigger('global:clear',[this]);
            return;
        }
        this.$el.find('.tb-complect-number').val(number);
       var num_items = number.split('.');
       if(num_items.length>3)
        {
            $.jGrowl('Указан неверный артикул. Проверьте артикул и повторите попытку. ', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
            Backbone.trigger('global:clear',[this]);
            return;
       }
        // запуск задания на рассчет комплекта
        Routine.showProgressLoader(10);
        this.queue = new Queue({
                task_key: "calculate_complect",
                params: {'number':number},
                complete: this.onQueueComplete.bind(this),
        });
        this.queue.run();
    },

    /**
     * Обработка кнопки открытия модели/комплекта
    **/
    onOpen:function(e)
    {
        var number = this.$el.find('.tb-complect-number').val();
        if(number)
            App.doQuery("number/"+number+"/tab/2/optional/true/use_conditions/true");
        else
            $.jGrowl('Не задан артикул модели/комплекта .', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
    },

    /**
     * Показывать только опции
    **/
    onShowOnlyOptions:function(e)
    {
        $('body').addClass('wait');
        Backbone.trigger('global:on_url_params_change',[this, 'optional', this.$el.find("#cb-only-options").prop('checked').toString()]);
        Backbone.trigger('global:show_only_options',[this, this.$el.find("#cb-only-options").prop('checked')]);
    },

    /**
     * Учитывать условия
    **/
    onUseConditions:function(e)
    {
        $('body').addClass('wait');
        Backbone.trigger('global:on_url_params_change',[this, 'use_conditions', this.$el.find("#cb-use-conditions").prop('checked').toString()]);
        Backbone.trigger('global:use_conditions',[this, this.$el.find("#cb-use-conditions").prop('checked')]);
    },

    /**
     *  Проверка нажатой клавиши в поле ввода номера конфигурации/спейификации
    **/
    pressComplectSearchKey: function(e)
    {
        if(e.keyCode==13)
            this.onOpen();
    },

    /**
     * Обработка глобального события завершения выполнения задания в очереди
    **/
    onQueueComplete: function(queue, task_key, result)
    {
        var self = this;
        Routine.hideLoader();
        if(result['status'] == 'error')
            $.jGrowl(result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 10000 });
        else
        {
            result = result['data'];
            if(!result)
            {
                Backbone.trigger('global:clear',[self]);
                $.jGrowl('Ошибка получения данных.', {'themeState':'growl-error', 'sticky':false, life: 10000 });
                return;
            }
            switch(task_key){
                case "calculate_complect": // расчет комплекта
                     // Заголовок с информацией о моделе/комплекте
                    App.ModelInfoView.render(new App.Models.ItemModel(((result.complect_info)?result.complect_info: result.config_info)));
                    // флаг отображения только опциональных свойство
                    var show_only_options = ((App.UrlParams['optional'].toString()=="true")?true:false);
                    this.$el.find("#cb-only-options").prop('checked', show_only_options);

                    var use_conditions = ((App.UrlParams['use_conditions'].toString()=="true")?true:false);
                    this.$el.find("#cb-use-conditions").prop('checked', use_conditions);

                    // корневой узел комплекта
                    self.complectInfo = JSON.parse(JSON.stringify(result.complect_data));
                    App.ComplectInfo = self.complectInfo;

                    // дерево конфигурации
                    App.DataViewComplectBuilder.prepare_and_build(result.config_data, result.complect_data, show_only_options,use_conditions, result.specification_list);
                    // отображение комплекта
                    App.DataViewComplectViewer.prepare_and_build(result.complect_data, show_only_options);
                    // если есть данные о комплекте, то показываем необходимый таб
                    this.$el.find('.pnl-note').show();
                    if(result.complect_data)
                    {
                        App.DataPanelView.show_complect_tab(true);
                        // показать поле ввода комментария для комплекта
                        this.$el.find('.pnl-note').show().find(".tb-note").val( ('note' in result.complect_data)?result.complect_data['note']:'' );
                        Backbone.trigger('global:collapse',[this, true, null]);
                    }

                    // выбор заданного таба на отображение
                    var cur_tab = App.UrlParams['tab'];
                    if(cur_tab!="2" || (cur_tab=="2" && !result.complect_data))
                        cur_tab = "1";
                    else
                        cur_tab = "2";
                    App.DataPanelView.select_tab(cur_tab);


                    // если идет изменение комплекта, то необходимо показать выбор типа сохранения комплекта
                    this.$el.find('.ddl-save-type').val("");
                    this.$el.find('.btn-calculate-complect').hide();
                    if(self.complectInfo)
                    {
                        self.$el.find('.ddl-save-type').show();
                        self.$el.find('.btn-calculate-complect').show();
                    }
                    else
                    {
                        self.$el.find('.ddl-save-type').hide();
                        self.$el.find('.btn-calculate-complect').hide();
                    }
                    this.enable(true);
                break;
                case "save_complect": // сохранение комплекта
                    $.jGrowl('Комплект № '+result['complect_info']['number']+' успешно сохранен.', { 'themeState':'growl-success', 'sticky':true });
                    self.$el.find('.btn-calculate-complect').show();
                    App.ComplectInfo = result.complect_info;
                    // отображение комплекта
                    App.DataViewComplectViewer.prepare_and_build(result.complect_data);
                break;
            }
        }
    },

    /**
     * Обработка глобавльного события очистки данных
    **/
    onGlobalClear: function()
    {
        this.enable(false);
        this.$el.find('.ddl-save-type').val("");
    },

    /**
     * Активировать/деактивировать панель управления
    **/
    enable: function(val)
    {
        this.$el.find('.btn-save-complect, .btn-collapse, .ddl-save-type').prop('disabled', !val);

        // если идет активация, то необходимо проверить, по какому объекту идет расчет. Если расчет идет по комплекту,
        // то нельзя сохранить пока не будет выбран тип сохранения
        if(this.complectInfo)
        {
            if(this.$el.find('.ddl-save-type').val()=="")
                this.$el.find('.btn-save-complect').prop('disabled', true);
        }
    },

    /**
     *  Событие смены типа сохранения
    **/
    onChangeSaveType: function(e)
    {
        if(this.$el.find('.ddl-save-type').val()=="")
                this.$el.find('.btn-save-complect').prop('disabled', true);
        else
            this.$el.find('.btn-save-complect').prop('disabled', false);
    },

    /**
     *  Событие смены параметра конфигурации
    **/
    onGlobalChangeConfigParam: function(e)
    {
        this.$el.find('.btn-calculate-complect').hide();
        //var note = App.DataViewComplectBuilder.get_comment().join('; ');
        //this.$el.find(".tb-note").val(note);
        this.complect_changed = true;
    },

    /**
     * Событие на кнопку сохранения комплекта
    **/
    onSaveComplect:function(e)
    {
        var self = this;
        // если идет сохранение новой комплекта на базе существующей, то необходимо проверить
        // что комментарий был изменен
        if(self.$el.find('.ddl-save-type').val()=="new" &&  this.complectInfo['note'] == this.$el.find(".tb-note").val())
        {
            $.jGrowl('Создаётся новый комплект. Требуется изменить примечание.', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
            return;
        }
        // если редактировали комплект
        if(this.complectInfo && this.$el.find('.ddl-save-type').val() == "edit")
            bootbox.confirm("Комплект: "+this.complectInfo['number']+" будет изменен. Хотите продолжить?", function(result)
            {
                if(result)
                    self.saveComplect();
            });
        else
            this.saveComplect();
    },

     /**
     * Вызов функции сохранения комплекта
    **/
    saveComplect:function()
    {
        var self = this;
        $('body').addClass('wait');
        setTimeout(function(){
            var data_to_save = App.DataViewComplectBuilder.validate_and_get_data();
            //return;
            $('body').removeClass('wait');
            if(data_to_save)
            {
                // сохранение комента для комплекта
                data_to_save['note'] = self.$el.find(".tb-note").val();
                Routine.showProgressLoader(10);
                self.queue = new Queue({
                        task_key: "save_complect",
                        params: {'data':data_to_save, 'complect_info': self.complectInfo, 'save_type': self.$el.find('.ddl-save-type').val()},
                        complete: self.onQueueComplete.bind(self),
                });
                self.queue.run();
            }
        },100);
    },

    /**
     * Обработка кнопки вызова расчета норм комплекта
    **/
    onComplectCalculate:function(e)
    {
           // переход к форме расчета норм комплекта
           window.open('/esud/specification/calculation#complects/' + App.ComplectInfo['number']+ '#1/use_stock/no/stock_order_number/');

           /*var query = [];
           for(var i in App.ComplectInfo['items'])
                query.push(App.ComplectInfo['items'][i]['specification']['number']+'#'+App.ComplectInfo['items'][i]['count']['value']);
           window.open('/esud/specification/calculation#specifications/' + query.join(';') );*/
    },

    /**
     *  Событие нажатия на кнопку раскрытия групп
    **/
    OnCollapse: function(e)
    {
        var cur_btn = $(e.currentTarget);
        $('body').css('cursor', 'wait');
        $(cur_btn).css('cursor', 'wait');
         if(cur_btn.val()=="collapsed")
                {
                         cur_btn.val("unCollapsed").html('&nbsp;&nbsp;Закрыть группы').prepend('<i class = "fa fa-folder-open"></i>');
                         Backbone.trigger('global:collapse',[this, true, cur_btn]);
                }
                else
                {
                         cur_btn.val("collapsed").html('&nbsp;&nbsp;Расскрыть группы').prepend('<i class = "fa fa-folder"></i>');
                         Backbone.trigger('global:collapse',[this, false, cur_btn]);
                }
    },

    /**
     *  Показать ограниченный вид
    **/
    ShowSimpleView: function()
    {
        this.$el.find('.full-view').hide();
        this.$el.find('.simple-view').show();
    },

    /**
     *  Показать полный вид
    **/
    ShowFullView: function()
    {
        this.$el.find('.simple-view').hide();
        this.$el.find('.full-view').show();
    },

});
