///
/// Глобальная структура
///
var SingleModeApp = {
    Models: {},
    Views:{},
    Route:null,
    page_key: '',    // ключ страницы, на которую будет установлен монопольный режим
    controls_to_disable: [], // список идентификаторов кнопок, которые необходимо лочить
    item_view: null, // представление объекта
    current_user: null, // текущий пользователь, работающий с системой
    single_mode_time: 10, // длительность в минутах на монопольный режим

    /**
     *  Инициализация необходимых объектов
    **/
    initialize: function(single_mode_time, info, page_key, controls_to_disable, current_user)
    {
        this.single_mode_time = single_mode_time;
        this.page_key = page_key;
        this.controls_to_disable = controls_to_disable;
        this.current_user = current_user;
        // отрисовка представления объекта
        this.item_view =  new  SingleModeApp.Views.ItemView({model:new SingleModeApp.Models.ItemModel(info)});
    },
}

///
/// Модели
///
SingleModeApp.Models.ItemModel = Backbone.Model.extend({
    defaults: {
        key:'',
        page_key: '',
        status: 'free',
        status_date: null,
        user_email: null,
        user_name: null,
        last_update: null
    },
    initialize: function() {},
    idAttribute: "_id",
    //url: '/handlers/routine/single_mode/'
});

///
/// Представления
///
SingleModeApp.Views.ItemView = Backbone.View.extend({
    el: $("#singleModeContainer"),
    check_on_status: true, // проверять статус формы
    need_refresh: true, // флаг автосброса при привышении лимита времени работы с формой
    templates: {
        own_mode:_.template($("#templateOwnMode").html()),
        guest_mode:_.template($("#templateGuestMode").html()),
        free_mode:_.template($("#templateFreeMode").html()),
    },
    events:{
        'click .btn-finish': 'onFinish',
        'click .btn-start': 'onStart',
        'click .btn-get-access': 'onGetAccess'
    },

    /**
     * Инициализация
    **/
    initialize: function()
    {
        this.check_on_status = true;
        this.need_refresh = true;
        this.updateRender();
        // проверка и обновление статуса
        this.checkStatus();
        // таймер на обновление интерфейса
        this.render_timer = null;
        // таймер на проверку текущего статуса
        this.status_timer = null;
    },

    /**
    ** Очистка таймера проверки статуса
    **/
    clear_status_timer: function(){
        if(this.status_timer)
            clearTimeout(this.status_timer);
        this.status_timer = null;
    },

    /**
    * Отрисовка
    **/
    render: function()
    {
        // отрисовка
        if(this.model.get('status') == 'free')
        {
            this.$el.html(this.templates.free_mode(this.model.toJSON()));
            //this.$el.html(this.templates.guest_mode(this.model.toJSON()));
            this.disableExternalControls(true);
        }
        else if(this.model.get('user_email') == SingleModeApp.current_user['email'])
        {
            this.$el.html(this.templates.own_mode(this.model.toJSON()));
            this.disableExternalControls(false);
        }
        else
        {
            this.$el.html(this.templates.guest_mode(this.model.toJSON()));
            this.disableExternalControls(true);
        }
    },

    updateRender: function()
    {
        var self = this;
        self.render();
        this.render_timer  = setInterval(function(){ self.render(); },10000);
    },

    /**
     *  Активация/деактивация внешних элементов управления
     *  зависящих от монопольного режима
    **/
    disableExternalControls: function(val)
    {
        Backbone.trigger('global_single_mode:disable_controls',[self, val]);
    },

    /**
    * Принудительное завершение сеанса
    **/
    onFinish: function()
    {
        this.clear_status_timer();
        this.updateStatus('free', false);
        this.disableExternalControls(true);
    },

    /**
    * Получение доступа к форме
    **/
    onStart: function()
    {
        this.clear_status_timer();
        this.updateStatus('busy', true);
        Backbone.trigger('global:update_all_data',[this]);
    },

    /**
    * Получение доступа к форме
    **/
    onGetAccess: function()
    {
        this.clear_status_timer();
        this.updateStatus('get_access', true);
        Backbone.trigger('global:update_all_data',[this]);
    },

     /**
     * Обновление статуса работы с формой
    **/
    updateStatus: function(status, check_on_status)
    {
       Routine.showLoader();
       var self = this;
       var res = false;
       $.ajax({
            type: "POST",
            url: "/handlers/routine/single_mode/update_page_busy_status/"+SingleModeApp.page_key+"/"+status,
            data: {},
            timeout: 15000,
            contentType: 'application/json',
            dataType: 'json',
            async:true
        }).done(function(result) {
           if(result['status']=="error")
                $.jGrowl('Ошибка обновления данных. Повторите попытку. ', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
            else
            {
                self.model = new SingleModeApp.Models.ItemModel(result.data);
                self.render();
                self.check_on_status = check_on_status;
                self.checkStatus();
                res = true;
            }
        }).error(function(){
                $.jGrowl('Ошибка обновления данных. Повторите попытку. ', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
        }).always(function(){Routine.hideLoader();});

        return res;
    },

    /**
     * Проверка статуса монопольного режима
    **/
    checkStatus: function()
    {
       var self = this;

       /*
       // если текущий пользователь занимает форму
       if(this.model.get('user_email') == SingleModeApp.current_user['email'])
       {
            // запуск асинхронной проверки текущего состояния на сервере
            $.ajax({
                    type: "GET",
                    url: "/handlers/routine/single_mode/check_page_on_busy/"+SingleModeApp.page_key,
                    data: {},
                    timeout: 10000,
                    contentType: 'application/json',
                    dataType: 'json',
                    async:true
            }).done(function(result) {
                    if(result['status']!="error")
                        self.model = new SingleModeApp.Models.ItemModel(result.data);
            }).always(function(){});

            // если пользователь занимает форму дольше установленного лимита. показываем форму предупреждения
            if(moment(new Date()).diff(moment.utc(this.model.get('status_date')).local() ,'minute') >=  SingleModeApp.single_mode_time)
            {
                self.need_refresh = true;
                var msg = "Вы привысили допустимый лимит времени работы с формой. Хотите продолжить работу с формой? Если нажмете 'Применить', то продолжите работу с возможностью сохранения результата. Если нажмете 'Отмена', то сможете продолжить работу с формой без возможности сохранения результата, отображаемые данные при этом обновлены не будут.";
                bootbox.hideAll();
                bootbox.confirm(msg, function(result){
                        // очищаем существующий таймер проверки статуса
                        self.clear_status_timer()
                        // проверка на необходимость дальнейшей проверки статуса
                        self.need_refresh = false;
                        if(result)
                            self.updateStatus('busy', true);
                        else
                        {
                            self.updateStatus('free', false);
                            self.disableExternalControls(true);
                        }
                });

                // время на принятие решения - 30 сек
                self.status_timer = setTimeout(function(){
                    if(self.need_refresh)
                    {
                        bootbox.hideAll();
                        self.updateStatus('free', false);
                        self.disableExternalControls(true);
                    }
                },30000);
            }
            else
                setTimeout(function(){self.checkStatus()},10000);
       }
       else if(this.check_on_status)*/
       {
            self.status_timer =setTimeout(function(){
                   $.ajax({
                        type: "GET",
                        url: "/handlers/routine/single_mode/check_page_on_busy/"+SingleModeApp.page_key,
                        data: {},
                        timeout: 10000,
                        contentType: 'application/json',
                        dataType: 'json',
                        async:true
                    }).done(function(result) {
                       if(result['status']=="error")
                            self.checkStatus();
                        else
                        {
                            /*// если форма была свободной, но по результатам новых данных
                            // монопольный режим стал принадлежать текущему пользователю
                            if(result.data['user_email'] ==  SingleModeApp.current_user['email'] )
                            {
                                 self.model = new SingleModeApp.Models.ItemModel(result.data);
                                 var msg = "Форма освободилась и вам предоставлен доступ на сохранение расчетов. Если вы хотите заново выполнить и сохранить расчеты, то нажмите 'Применить', при этом данные на форме обновятся. Если вы хотите продолжить работу с формой без обновления данных, то нажмите 'Отмена' , но в таком случае вы не сможете сохранить результат."
                                 bootbox.hideAll();
                                 bootbox.confirm(msg, function(result){
                                        self.clear_status_timer();
                                        if(result)
                                            Backbone.trigger('global:update_all_data',[self]);
                                        else
                                        {
                                            self.disableExternalControls(true);
                                            self.updateStatus('free', false);
                                        }
                                        self.clear_status_timer();
                                        self.status_timer =setTimeout(function(){self.checkStatus()},10000);
                                 });

                                // время на принятие решения - 30 сек
                                self.clear_status_timer();
                                self.status_timer =setTimeout(function(){
                                    bootbox.hideAll();
                                    self.updateStatus('free', false);
                                    self.disableExternalControls(true);
                                },30000);
                            }
                            else
                            {
                                self.model = new SingleModeApp.Models.ItemModel(result.data);
                                self.render();
                                self.clear_status_timer();
                                self.status_timer =setTimeout(function(){self.checkStatus()},10000);
                            }*/
                            //if(this.model.get('user_email') == SingleModeApp.current_user['email'])

                            self.model = new SingleModeApp.Models.ItemModel(result.data);
                            self.render();
                            self.clear_status_timer();
                            self.status_timer =setTimeout(function(){self.checkStatus()},10000);
                        }
                    }).error(function(){
                        self.clear_status_timer();
                        self.status_timer =setTimeout(function(){self.checkStatus()},10000);
                    });
            },10000);
       }
    },
});
