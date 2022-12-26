///
/// Глобальная структура
///
var App = {
    Models: {},
    Views:{},
    Collections:{},
    CurrentWorkOrder: null,
    Works: null,
    FindView: null,
    DatesTransferView: null,
    Sectors: null,                                                   // Список всех участков
    Teams: null,                                                    // Список всех бригад на всех участках
    PlanShiftReasonSystemObjects: null,  // список идентификаторов системных причин переноса плановых сроков
    AllWorkers: null,                                            // список всех пользователей с ролью = "рабочий"
    Weekends: [],                                                 // список выходных дней

    // функция преобразования строки в дату
    parseDate:function(input, format) {
        format = format || 'dd/mm/yyyy'; // default format
        var parts = input.match(/(\d+)/g),
          i = 0, fmt = {};
        // extract date-part indexes from the format
        format.replace(/(yyyy|dd|mm)/g, function (part) { fmt[part] = i++; });
        var dt = new Date(parts[fmt['yyyy']], parts[fmt['mm']] - 1, parts[fmt['dd']]);
        if ((parts[fmt['dd']] == dt.getDate()) && (parts[fmt['mm']] - 1 == dt.getMonth()) && (parts[fmt['yyyy']] == dt.getFullYear()) )
            return dt;
        else
            return null;
    },

    /**
     *  Инициализация необходимых объектов
    **/
    initialize: function(sectors, teams, planshiftreason_system_objects, all_workers, weekends)
    {
        this.sectors = sectors;
        this.Teams = teams;
        this.PlanShiftReasonSystemObjects = planshiftreason_system_objects;
        this.FindView = new App.Views.FindView();
        this.DatesTransferView = new App.Views.DatesTransferView();
        this.AllWorkers = all_workers;
        this.Weekends = weekends;
    },

    /**
     *  Сохранение всех данных
    **/
    save: function(dataToSave)
    {

         //console.log(dataToSave);
         Routine.showLoader();
         $.ajax({
            type: "PUT",
            url: "/handlers/newjoblog/savedata",
            data: JSON.stringify(dataToSave),
            timeout: 35000,
            contentType: 'application/json',
            dataType: 'json',
            async:true
            }).done(function(result) {
                    Routine.hideLoader();
                    if(result['status']=="ok")
                    {
                        // обновление формы
                        $.jGrowl('Данные успешно сохранены .', { 'themeState':'growl-success', 'sticky':false });
                        // вызов перерисовки формы наряда
                        App.FindView.OnSearch();
                        // закрытие формы переноса дат
                        App.DatesTransferView.close();

                        // отправляем оповещение, если были переносы дат или приостановка работ
                        if(dataToSave['have_transfers'] || dataToSave['have_holds'] || dataToSave['have_pauses'])
                        {
                         $.ajax({
                            type: "PUT",
                            url: "/handlers/newjoblog/send_notification",
                            data: JSON.stringify(dataToSave),
                            timeout: 55000,
                            contentType: 'application/json',
                            dataType: 'json',
                            async:true
                            }).done(function(result) {
                                if(result['status']=="error")
                                    $.jGrowl('Ошибка рассылки уведомлений. Подробности: ' + result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 10000 });
                                    //console.log('Ошибка рассылки уведомлений о переносе/приостановке плановых дат нарядов. Подробности: ' + result['msg']);
                            }).fail(function(jqXHR, textStatus, errorThrown ) {
                                $.jGrowl('Ошибка рассылки уведомлений. Подробности: ' + errorThrown, { 'themeState':'growl-error', 'sticky':false, life: 10000 });
                                    //console.log('Ошибка рассылки уведомлений о переносе/приостановке плановых дат нарядов. Подробности: ' + errorThrown);
                            });
                        }
                    }
                    else
                        $.jGrowl('Ошибка сохранения данных. Подробности: ' + result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 10000 });

                }).fail(function(jqXHR, textStatus, errorThrown ) {
                        //FilterPanel.hideLoader();
                        $.jGrowl('Ошибка сохранения данных. Подробности:' + errorThrown, { 'themeState':'growl-error', 'sticky':false, life: 10000 });
                        Routine.hideLoader();
                });
    },

    /**
     *  Сохранение данных по трудовому участию
    **/
    save_workers: function(dataToSave)
    {
         Routine.showLoader();
         $.ajax({
            type: "PUT",
            url: "/handlers/newjoblog/save_workers",
            data: JSON.stringify(dataToSave),
            timeout: 35000,
            contentType: 'application/json',
            dataType: 'json',
            async:true
            }).done(function(result) {
                    Routine.hideLoader();
                    if(result['status']=="ok")
                    {
                        // обновление формы
                        $.jGrowl('Данные успешно сохранены .', { 'themeState':'growl-success', 'sticky':false });
                        App.FindView.OnSearch();
                    }
                    else
                        $.jGrowl('Ошибка сохранения данных. Подробности: ' + result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 10000 });

                }).fail(function(jqXHR, textStatus, errorThrown ) {
                        $.jGrowl('Ошибка сохранения данных. Подробности:' + errorThrown, { 'themeState':'growl-error', 'sticky':false, life: 10000 });
                        Routine.hideLoader();
                });
    }
};

///
/// Модель элемента работы
///
App.Models.WorkModel = Backbone.Model.extend({
    defaults: {'repeat':false},
    initialize: function() {
        this.on('change', this.change, this);
    },
    change: function(){
        Backbone.trigger('onWorkModelChanged',[this]);
    }
});

///
/// Коллекция элементов работ
///
App.Collections.WorkItemsCollection =Backbone.Collection.extend({
        model: App.Models.WorkModel
});

///
/// Модель элемента материала
///
App.Models.MaterialModel = Backbone.Model.extend({});

///
/// Коллекция элементов материалов
///
App.Collections.MaterialItemsCollection =Backbone.Collection.extend({
        model: App.Models.MaterialModel
});

///
/// Модель элемента трудового участия работника
///
App.Models.WorkerModel = Backbone.Model.extend({
    defaults: {
            "user_email" : null,
            "user_fio" : null,
            "proportion" : 0
    },
     idAttribute: "user_id"
});
///
/// Коллекция элементов работников
///
App.Collections.WorkerItemsCollection =Backbone.Collection.extend({
        model: App.Models.WorkerModel
});

///
/// Модель элемента истории трудового участия работников
///
App.Models.HistoryWorkerModel = Backbone.Model.extend({
    defaults: {
            "_id": null,
            "date" : null,
            "fact_date" : null,
            "status" : "",
            "workers":[],
            "history":[],
    },
     //idAttribute: "_id",

});

///
/// Коллекция элементов истории трудового участия работников
///
App.Collections.HistoryWorkerItemsCollection =Backbone.Collection.extend({
        model: App.Models.HistoryWorkerModel
});

///
/// Модель элемента переноса дат
///
App.Models.ShiftModel = Backbone.Model.extend({});

///
/// Коллекция элементов переноса дат
///
App.Collections.ShiftItemsCollection =Backbone.Collection.extend({
        model: App.Models.ShiftModel
});

///
/// Контрол управления поиском на форме
///
App.Views.FindView = Backbone.View.extend({
    el: $("#pnlJobLogFilter"),
    orderView:null,
    events:{
        'click #btnJobLogFind': 'OnSearch',
        'keypress #tbWorkOrderNumber': 'logKey',
        'click #btnDownloadStat': 'OnDownloadStat',
        'click #btnDownloadQStat': 'OnDownloadQStat',

    },
    initialize: function(){
        this.orderView = new App.Views.OrderView();
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
     *  Клик на кнопку загрузки статистики по фактическим работам
    **/
    OnDownloadStat: function(e)
    {
        var self  = this;
        $('body').css('cursor', 'wait');
        self.$('#btnDownloadStat').css('cursor', 'wait');
        window.location='/handlers/newjoblog/get_statistic/';
        setTimeout(function(){$('body').css('cursor', 'default'); self.$('#btnDownloadStat').css('cursor', 'pointer');}, 20000);
    },

      /**
        *  Клик на кнопку загрузки статистики по фактическим работам
        *  с указанием настроек
    **/
    OnDownloadQStat: function(e)
    {
        // инициализация дилога
        var dlg = new App.Views.downloadSettingsForm();
        // обработка кнопки загрузки
        dlg.on("startdownload",function(){
            // смена курсора
            self.$('#btnDownloadQStat').css('cursor', 'wait');
            $('html').css('cursor', 'wait');
            // скачка отчета
            window.location='/handlers/newjoblog/get_qstatistic/?sectors='+ dlg.selectedSectors.join(",") + "&years=" + dlg.selectedYears.join(',') + "&months=" + dlg.selectedMonths.join(",")+ "&teams=" + dlg.selectedTeams.join(",")+"&symple_view="+(self.$('#data-symple-view').prop('checked')?"true":'false' )+"&include_not_completed="+(self.$('#data-include-not-completed').prop('checked')?"true":'false' );
            // восстановление курсора
            setTimeout(function(){ $('html').css('cursor', 'default'); self.$('#btnDownloadQStat').css('cursor', 'pointer');}, 10000);
        });
    },

     /**
     *  Функция поиска
    **/
    OnSearch:function(){
        var self = this;
        // очистка формы наряда
        self.orderView.clear();
        // скрыть панель переноса дат
        App.DatesTransferView.close();
        // получение данных по новому наряду
        App.CurrentWorkOrder = this.$('#tbWorkOrderNumber').val();
        if (!App.CurrentWorkOrder || App.CurrentWorkOrder == ''){
            $.jGrowl('Не задан номер наряда.', { 'themeState':'growl-error', 'sticky':false });
            return;
        }

        Routine.showLoader();
        $.ajax({
            url: '/handlers/newjoblog/search/',
            type: 'GET',
            dataType: 'json',
            contentType: "application/json; charset=utf-8",
            data: {'num':App.CurrentWorkOrder},
            timeout: 35000,
            async: true,
            success: function (result, textStatus, jqXHR) {
                Routine.hideLoader();
                if(result.status=='error')
                    $.jGrowl(result.msg, { 'themeState':'growl-error', 'sticky':false });
                else if(result.status=="ok")
                {
                    self.orderView.all_sectors_in_order = result.result.all_sectors_in_order;
                    self.orderView.isWeekend = result.result.weekend;
                    self.orderView.sector = result.result.sector;
                    self.orderView.workOrder = result.result.workorder;
                    self.orderView.worksList = new App.Collections.WorkItemsCollection(result.result.works);
                    self.orderView.planNorm = result.result.plan_norm;
                    self.orderView.materialsList = new App.Collections.MaterialItemsCollection(/*result.result.materials*/);
                    self.orderView.workersList = new App.Collections.WorkerItemsCollection(result.result.workers);
                    self.orderView.historyWorkersListCollection = new App.Collections.HistoryWorkerItemsCollection(result.result.workers_history);
                    self.orderView.render();
                }
                else
                {
                    $.jGrowl("Ошибка сервера.", { 'themeState':'growl-error', 'sticky':false });
                    Routine.hideLoader();
                }
            }
        });
    },
    render:function(){
    }
});

///
/// Контрол управления нарядом
///
App.Views.OrderView = Backbone.View.extend({
    el: $("#pnlJobLogBody"),
    templates: {
        header:_.template($("#jobLogHeader").html()),
    },
    workItemsView:null,
    worksList:null,                                  // коллекция работ
    sector: null,                                       // инфомрация об участке со списком бригад
    workOrder: null,                               // информация о  наряде
    isWeekend: false,                          // флаг выходного дня
    planNorm: null,                                // информация о плановой норме
    materialsList: null,                           // информация о материалах из плановых норм
    workersList: null,                              // информация о рабочих выполнявших наряд
    workerItemsView: null,                   // представление для списка работников наряда
    historyWorkerItemsView: null,     // представление истоории трудовых расчетов работников
    historyWorkersListCollection: null, // коллекция истории трудовых расчетов работников
    all_sectors_in_order: null,             // список кодов участков на всем заказе
    events:{
         'change .cb-weekend': 'OnChangeWeekEnd',
         'click .btnOk': 'OnSave',
         'click .btnCancel': 'OnCancel',
         'change .ddl-common-status': 'OnChangeDdlCommonStatus'
    },
    initialize: function(){
         // маска календаря на поле даты
         var self = this;
         Backbone.on("onWorkModelChanged",this.onWorkModelChanged, this);

         this.$('.date-picker input').val(new Date().format("dd/mm/yyyy"));
         this.$('.date-picker').datepicker({
            weekStart:1,
            format: "dd/mm/yyyy",
            weekStart: 1,
            endDate: "+0d",
            //todayBtn: "linked",
            autoclose: true,
            todayHighlight: false,
            defaultDate: new Date()
        }).on('changeDate', function(ev){
                // проверка на выходной

                if(App.Weekends.indexOf(ev.date.format("yyyy-mm-dd"))>-1)
                     self.$('.cb-weekend').prop('checked',true);
                else
                      self.$('.cb-weekend').prop('checked',false);
            });
    },

    /**
     * Скрыть форму
    **/
    hide: function()
    {
        $(this.el).hide();
    },

    /**
     * Показать форму
    **/
    show: function()
    {
        $(this.el).show();
    },

    /**
     * обработка события изменения данных в какой либо моделе работы
    **/
    onWorkModelChanged: function(){
    },

    /**
     * Обработка кнопки сохранения
    **/
    OnSave: function()
    {
        var self = this;
        //var haveHolds = false;
        //var haveTrueHolds = false;
        var haveFacts = false;
        var haveChanges =false;
        var sel_date = self.$('.tbDate').val();
        var works_with_duble_fact_dates = [];   // работы для которых создан факт на дату в которой уже факт есть
        var works_with_duble_status = [];           // работы для которых на отрезке времени идет задвоение статуса
        var works_without_plan_dates = [];        // работы для которых не задана плановая дата

        if(sel_date=="")
        {
            $.jGrowl("Задайте дату.", { 'themeState':'growl-error', 'sticky':false });
            return;
        }
        fact_date = App.parseDate(sel_date,'dd/mm/yyyy');
        // сбор данных на сохранение
        var dataToSave = [];
        var completedWorksCount = 0;
        _.each(self.worksList.models, function (item) {
            // сбор выполненных работ
            var balanceVal = Routine.strToFloat(item.get('balance').toFixed(3));
            if(isNaN(balanceVal))
                    balanceVal = 0;
            if(item.get('status') =='completed' || (balanceVal - item.get('fact_scope'))==0)
                completedWorksCount++;

            // сбор измененных данных
            if(item.get('changed'))
            {
                //if (item.get('fact_scope')==0 && item.get('status') !=item.get('old_status') && item.get('status') =='on_work')
                if (item.get('fact_scope')==0 && item.get('status') ==item.get('old_status') && item.get('status') =='on_work')
                    self.$("input[value='"+item.get('id')+"']").parent().find('.tbFact').addClass('tberr');

                if (item.get('fact_scope')>0 || item.get('status') =='completed')
                    haveFacts = true;

                if (item.get('fact_scope')>=0 || item.get('status') !=item.get('old_status') || item.get('repeat'))
                //if (item.get('status') !=item.get('old_status') || item.get('repeat'))
                {
                     if(!item.get('date_start') || !item.get('date_finish'))
                        works_without_plan_dates.push(item);

                    haveChanges = true;
                    dataToSave.push(item.toJSON()) ;

                    // добавление дубликатов фактов на даты
                    if(item.get('fact_dates').indexOf(sel_date)>-1)
                        works_with_duble_fact_dates.push(item.toJSON()) ;

                    // проверяем если только зафиксирована смена статуса
                    if(item.get('status') !=item.get('old_status'))
                    {
                        // добавление дубликатов статусов на отрезок времени
                        var status_log = item.get('status_log');
                        if(status_log && status_log.length==1 && status_log[0].status==item.get('status'))
                        {
                            if(Routine.timeToZero(Routine.convertToUTC(new Date(status_log[0]['date'])))>=fact_date)
                                works_with_duble_status.push({'item':item.toJSON(), 'type':'next'});
                            else
                                works_with_duble_status.push({'item':item.toJSON(), 'type':'prev'});
                        }
                        else if(status_log && status_log.length>1)
                        {
                            var i=1;
                            if(fact_date<=Routine.timeToZero(Routine.convertToUTC(new Date(status_log[0]['date']))) && status_log[0].status==item.get('status'))
                                works_with_duble_status.push({'item':item.toJSON(), 'type':'next'});
                            else if(fact_date>Routine.timeToZero(Routine.convertToUTC(new Date(status_log[status_log.length-1]['date']))) && status_log[status_log.length-1].status==item.get('status'))
                                works_with_duble_status.push({'item':item.toJSON(), 'type':'prev'});
                             else
                            do
                            {
                                if(fact_date>=Routine.timeToZero(Routine.convertToUTC(new Date(status_log[i-1]['date']))) && fact_date<Routine.timeToZero(Routine.convertToUTC(new Date(status_log[i]['date']))))
                                {
                                    if(status_log[i-1].status==item.get('status'))
                                        works_with_duble_status.push({'item':item.toJSON(), 'type':'prev'});
                                    else
                                        works_with_duble_status.push({'item':item.toJSON(), 'type':'next'});
                                    break;
                                }
                                i++;
                            }
                            while (i < status_log.length-1)
                        }
                    }
                }
            }
        }, this);

        // сбор процента участия работников в проекте
        var workersToSave = [];
        _.each(self.workersList.models, function (item) {
            workersToSave.push(item.toJSON());
        });

        // Если идет закрытие наряда по направлению факт-монтаж, то необходимо проверить
        // для всех ли работников задан процент участия в проекте
        if(/*self.worksList.length == completedWorksCount &&*/ /*(self.sector['type'] == 'Цех' || self.sector['type'] =='Монтаж') &&*/haveFacts && !self.workerItemsView.Validate())
            return;

        // если наряд закрыт и необходимо для него сохранить только трудовое учатие
        if(dataToSave.length==0 && self.worksList.length == completedWorksCount /*&& (self.sector['type'] == 'Цех' || self.sector['type'] =='Монтаж')*/)
        {
            // вызов сохранения только для трудового участия
            if(!self.workerItemsView.Validate())
                return
            App.save_workers({'workers': workersToSave, 'work_order': self.workOrder})
        }
        else
        {
                // проверка на выбранную бригаду
                /*var brigade = self.$('.ddl-brigade').val();
                //if(brigade=="" && haveChanges)
                if(brigade=="" && haveFacts)
                {
                    $.jGrowl("Задайте бригаду.", { 'themeState':'growl-error', 'sticky':false });
                    return;
                } */

                // проверка на ниличие неверных фактических объемов
                if(self.$('.tberr').length>0 )
                 {
                    $.jGrowl("Фактические объемы, помеченные красным заполнены некорректно.", { 'themeState':'growl-error', 'sticky':false });
                    return;
                }
                // проверка на наличие фактов
                if(dataToSave.length==0)
                {
                    $.jGrowl("Данные по фактам не изменились. Внесите необходимые изменения и повторите попытку.", { 'themeState':'growl-error', 'sticky':false });
                    return;
                }

                if(works_without_plan_dates.length>0)
                {
                    for(var w in works_without_plan_dates)
                        $.jGrowl("Для работы: '"+works_without_plan_dates[w].get('name')+ " ["+works_without_plan_dates[w].get('code')+"]"+ "'' не заданы плановые даты.", { 'themeState':'growl-error', 'sticky':false });
                    return;
                }

                // проверка на дублирование фактических дат работ
                if(works_with_duble_fact_dates.length>0)
                {
                    $.jGrowl("Для работы: '"+works_with_duble_fact_dates[0]['name']+ " ["+works_with_duble_fact_dates[0]['code']+"]"+ "'' уже заносились факты на указанную дату.", { 'themeState':'growl-error', 'sticky':false });
                    return;
                }

                if(works_without_plan_dates.length>0)
                {
                    for(var w in works_without_plan_dates)
                        $.jGrowl("Для работы: '"+works_without_plan_dates[w].get('name')+ " ["+works_without_plan_dates[w].get('code')+"]"+ "'' не заданы плановые даты.", { 'themeState':'growl-error', 'sticky':false });
                    return;
                }

                // проверка на задвоение статусов на отрезке времени
                /*if(works_with_duble_status.length>0)
                {
                    $.jGrowl("Для работы: '"+works_with_duble_status[0]['item']['name']+ " ["+works_with_duble_status[0]['item']['code']+"]"+ "'' статус на указанную дату повторяет "+((works_with_duble_status[0]['type']=='prev')?'предыдущий':'следующий')+" по дате статус.", { 'themeState':'growl-error', 'sticky':false });
                    return;
                }*/

                // iss: #165
                // если в заказе есть хотя бы 1 наряд на участок с кодом 3,
                // то проверку на изделия надо отключить для всех участков данного заказа
                var materialsToSave = [];
                if(self.all_sectors_in_order.indexOf(3)<0)
                {
                    var completedMaterialsCount = 0;
                    _.each(self.materialsList.models, function (item) {
                         // сбор выполненных работ
                        var balanceVal = Routine.strToFloat(item.get('balance').toFixed(3));
                        if(isNaN(balanceVal))
                                balanceVal = 0;
                        if((balanceVal - item.get('fact_scope'))==0)
                            completedMaterialsCount++;

                        if(item.get('changed') && item.get('fact_scope')>0)
                            materialsToSave.push(item.toJSON());
                    });

                    // если происходит закрытие всех работ, то необходимо проверить чтобы все собственные изделия были
                    // заполнены полностью
                    if(self.worksList.length == completedWorksCount && completedMaterialsCount != self.materialsList.length)
                    {
                            $.jGrowl("Не все изделия готовы.", { 'themeState':'growl-error', 'sticky':false });
                            return;
                    }

                    // если происходит закрытие всех работ, и есть выпускающие участки, но нет собственных изделий
                    // то необходимо пользователям выдавать сообщение - Нет изделий для данного участка. Обратитесь в ПТО
                    if(self.worksList.length == completedWorksCount && self.materialsList.length==0 && (self.sector['is_manufacturer']==1 || self.sector['is_output']==1))
                    {
                            $.jGrowl("Нет изделий для данного участка. Обратитесь в ПТО.", { 'themeState':'growl-error', 'sticky':false });
                            return;
                    }
                }


                if(workersToSave.length>0){
                        // сбор и подготовка данных
                        var toSave = {
                                 "date": self.$('.tbDate').val(),
                                 'work_order': self.workOrder,
                                 'workers': workersToSave
                        };

                        // проверка работников на участие в других договорах
                        Routine.showLoader();
                        $.ajax({
                            url: '/handlers/newjoblog/check_workers',
                            type: 'POST',
                            dataType: 'json',
                            contentType: "application/json; charset=utf-8",
                            data: JSON.stringify(toSave),
                            timeout: 35000,
                            async: true,
                            success: function (result, textStatus, jqXHR) {
                                if(result.status=='error')
                                   $.jGrowl(result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 10000 });
                               else
                               {
                                // проверка даты
                                if(self.$('.tbDate').val() ==new Date().format("dd/mm/yyyy") && haveFacts)
                                {
                                    bootbox.confirm("Работы выполнялись сегодня'?", function(result)
                                    {
                                        if(result)
                                        {
                                            self.checkTransferDates(dataToSave, self.$('.tbDate').val(), materialsToSave, workersToSave);
                                            self.hide();
                                        }
                                    });
                                }
                                else
                                    self.checkTransferDates(dataToSave,self.$('.tbDate').val(), materialsToSave, workersToSave);
                               }
                            }
                        }).always(function(){Routine.hideLoader();});;
                }
                else{
                        // проверка даты
                        if(self.$('.tbDate').val() ==new Date().format("dd/mm/yyyy") && haveFacts)
                        {
                            bootbox.confirm("Работы выполнялись сегодня'?", function(result)
                            {
                                if(result)
                                {
                                    self.checkTransferDates(dataToSave, self.$('.tbDate').val(), materialsToSave, workersToSave);
                                    self.hide();
                                }
                            });
                        }
                        else
                            self.checkTransferDates(dataToSave,self.$('.tbDate').val(), materialsToSave, workersToSave);
                }
        }
    },

    /**
     * проверка на необходимость переноса дат
     * factDate = dd/mm/yyyy
    **/
    checkTransferDates: function(dataToSave, factDateString, materialsToSave, workersToSave)
    {
           Routine.showLoader();
           var needTransfers = false;
           var factDate = App.parseDate(factDateString,'dd/mm/yyyy');
           var self = this;
           $.ajax({
                    url: '/handlers/newjoblog/getplandates/',
                    type: 'GET',
                    dataType: 'json',
                    contentType: "application/json; charset=utf-8",
                    data: {'num':App.CurrentWorkOrder},
                    timeout: 35000,
                    success: function (result, textStatus, jqXHR) {
                        Routine.hideLoader();
                        if(result.status=='error')
                            $.jGrowl(result.msg, { 'themeState':'growl-error', 'sticky':false });
                        else if(result.status=="ok")
                        {
                            // получение списка работ с переносом дат
                            var dataTransfers = result.result;
                            var haveTransfers = false;
                            var haveHolds = false;
                            var havePauses = false;
                            // сбор данных по кому необходим перенос сроков
                            for(var i in dataToSave)
                            {
                                var item = dataToSave[i];
                                var transferItem = null;
                                if((item['fact_scope']>0 || ((item['status']!=item['old_status'] || item['repeat']) && (item['status']=='on_hold' || item['status']=='on_pause')))  && item['work_id'] in dataTransfers)
                                {
                                    transferItem = dataTransfers[item['work_id']];
                                    var dateStart = Routine.timeToZero(Routine.convertToUTC(new Date(transferItem['date_start'])));
                                    var dateFinish = Routine.timeToZero(Routine.convertToUTC(new Date(transferItem['date_finish'])));
                                    var haveFacts = transferItem['have_facts'];

                                    // количество дней для переноса
                                    var shift = 0;
                                    // если первый факт превышает план, то необходимо подвинуть обе плановые даты, к фактической дате
                                    //if(factDate<dateStart && Math.floor((Date.parse(factDate) -  Date.parse(dateStart)) / 86400000)!=0)
                                    if((factDate>dateStart || factDate>dateFinish) && !haveFacts)
                                    {
                                        haveTransfers = true;
                                        needTransfers = true; // флаг для отображения диалога переноса дат
                                        shift =  Math.floor((Date.parse(factDate) -  Date.parse(dateStart)) / 86400000);
                                        //item['transfer_reason_id'] = '';
                                        //item['transfer_reason'] = '';
                                        item['note'] = '';
                                        item['type'] = 'both';
                                        item['shift'] = shift;
                                        item['fact_date'] = factDate;
                                        item['plan_date'] = dateStart;
                                        item['is_first_fact'] = true;
                                    }
                                    // если дата факта превышает план и факт не первый, то необходимо передвинуть плановую дату окончания
                                    else if(factDate>dateFinish /*&& Math.floor((Date.parse(dateStart) -  Date.parse(dateFinish))/ 86400000)!=0*/)
                                    {
                                        haveTransfers = true;
                                        shift =  Math.floor((Date.parse(factDate) -  Date.parse(dateFinish))/ 86400000);
                                        needTransfers = true;
                                        //item['transfer_reason_id'] = '';
                                        //item['transfer_reason'] = '';
                                        item['note'] = '';
                                        item['type'] = 'finish';
                                        item['shift'] = shift;
                                        item['fact_date'] = factDate;
                                        item['plan_date'] = dateFinish;
                                        item['is_first_fact'] = false;

                                    }
                                }

                                if((item['status']!=item['old_status'] || item['repeat']) && (item['status']=='on_hold' || item['status']=='on_pause'))
                                {
                                     needTransfers = true;
                                     if (item['status']=='on_hold')
                                        haveHolds = true;
                                    if (item['status']=='on_pause')
                                        havePauses = true;
                                }
                            }

                            // сбор и подготовка данных
                            toSave = {
                                    "have_holds": haveHolds,
                                    "have_pauses": havePauses,
                                    "have_transfers": haveTransfers,
                                    "brigade_id" : null,// self.$('.ddl-brigade').val(),
                                    "weekend": self.$('.cb-weekend').is(':checked'),
                                    "fact_works": dataToSave,
                                    'work_order': self.workOrder,
                                    "date": self.$('.tbDate').val(),
                                    'fact_materials': materialsToSave,
                                    'plan_norm': self.planNorm,
                                    'workers': workersToSave
                            };

                            // если необходим перенос сроков, показываем диалог настройки переносов
                            if(needTransfers)
                            {
                                // показываем фрму переноса сроков
                                App.DatesTransferView.render(toSave);
                                self.hide();
                            }
                            else
                            {
                                // если перенос не требуется, то сразу вызываем сохранение данных
                                self.save(toSave);
                            }
                        }
                        else
                        {
                            $.jGrowl("Ошибка сервера.", { 'themeState':'growl-error', 'sticky':false });
                            Routine.hideLoader();
                        }
                    }
            });
    },

    /**
     * Функция проверки данных
    **/
    save: function(dataToSave)
    {
        App.save(dataToSave);
    },

    /**
     * Обработка кнопки отмена
    **/
    OnCancel: function()
    {
        this.clear();
    },

    /**
     * Обработка смены общего статуса
    **/
    OnChangeDdlCommonStatus: function()
    {
        var ddlCommonStatus = this.$('.ddl-common-status');
        var selStatus = ddlCommonStatus.val();
        // если выбран не пустой статус
        if(selStatus!="")
        {
            // пробегаем по всем активным статусам и делаем смену на текущий
            this.$('.ddl-status:enabled').val(selStatus).change();
        }
    },

    /**
     * Обработка чекбокса выходного дня
    **/
    OnChangeWeekEnd: function()
    {
        var self = this;
        var cbWeekEnd = this.$('.cb-weekend');
        if(!cbWeekEnd.is(':checked'))
        {
            bootbox.confirm("Подтверждаете отключение опции 'Внерабочее время'?", function(result)
            {
                if(!result)
                    cbWeekEnd.prop('checked', true);
                else
                    self.isWeekend = false;
            });
        }
    },

    /**
     * Отрисовка формы
    **/
    render:function(){
        var self = this;
         $(self.el).show();
         // заполнение заголовка
         self.$('.lbl-header').find('.lbl').html(self.templates.header(self.workOrder));
         // заполнение выпадающего списка бригад
         //self.fillBrigades(self.sector.brigades);
         // проставление флага, если выходной
        if(self.isWeekend==true)
            self.$('.cb-weekend').prop('checked',true);
         // заполнение работ
         self.workItemsView = new  App.Views.WorkItemsView({collection: self.worksList}).render();
         // заполнение материалов
         self.materialItemsView = new  App.Views.MaterialItemsView({collection: self.materialsList}).render();
         // представление нормы добавления трудовых расчетов по работникам
         self.workerItemsView = new  App.Views.WorkerItemsView({parent:this});
         // представление истории трудовых расчетов по работникам
         self.historyWorkerItemsView = new  App.Views.HistoryWorkerItemsView();
         self.workerItemsView.collection = self.workersList;
         self.$('.pnl-add-workers-container').html(self.workerItemsView.render().el);


         if( /*self.sector['type'] == 'Цех' || self.sector['type'] =='Монтаж'*/ 3>2)
         {
            self.workerItemsView.show();
            self.$('.lbl-workers-header').show();
        }
        else
        {
            self.workerItemsView.hide();
            self.$('.lbl-workers-header').hide();
        }
        // заполнение истории трудовых расчтов работников
        self.historyWorkerItemsView.collection = self.historyWorkersListCollection;
        self.historyWorkerItemsView.render();
        // кнопка сохранения не активна, если наряд закрыт.
        // Исключением является ситуация, когда наряд закрыт,
        // направлене работ цех или монтаж и не заполнено трудовое участие
        if(self.workOrder['status'] =="completed")
        {
            self.$(".btnOk").prop('disabled',true);
            if(/*(self.sector['type'] == 'Цех' || self.sector['type']=='Монтаж') &&*/ (self.workersList.size()==0 /*||  has_access('joblog','o')*/))
                self.$(".btnOk").prop('disabled',false);
        }

         // если есть собственые изделия, то показываем для них элементы управления
         if(self.materialsList.length>0)
         {
            self.$('.lbl-materials-header').show();
            self.$('.data-materials-header').show();
            self.$('#pnlMaterialsDataContainer').show();
         }
         else
         {
            self.$('.lbl-materials-header').hide();
            self.$('.data-materials-header').hide();
            self.$('#pnlMaterialsDataContainer').hide();
         }
    },

    /**
     * Заполнение списка бригад
    **/
    /*fillBrigades: function(data)
    {
         var self = this;
         var filter = self.$('.ddl-brigade');
        filter.empty();
        filter.append("<option value=''>Исполнитель</option>");
        _.each(data, function (item) {
            var option = $("<option/>", {
                value: item['_id'],
                text: item['teamlead']
            }).appendTo(filter);
        });
    }, */

    /**
     *  Очистка формы наряда
    **/
    clear: function()
    {
        var self = this;
        // форма данных
        $(self.el).hide();
        // дата
        self.$('.tbDate').val(new Date().format("dd/mm/yyyy"));
        self.$('.date-picker').datepicker('setEndDate', new Date().format("dd/mm/yyyy"));
        // бригада
        self.$('.ddl-brigade').empty();
        // выходной день
        if(self.isWeekend==true)
            self.$('.cb-weekend').prop('checked',true);
        else
            self.$('.cb-weekend').prop('checked',false);
        // основной контейнер со списком работ и материалов
        self.$('.data-container').empty();
        // заголовок
        self.$('lbl-header').find('.lbl').empty();
        self.$('lbl-header').find('.ddl-common-status').val('');

    }
});

///
/// Контрол управленяи списокм работ
///
App.Views.WorkItemsView = Backbone.View.extend({
   el: $("#pnlJobLogDataContainer"),

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
        var that = this;
            _.each(this.collection.models, function (item) {
                that.renderWork(item);
        }, this);
    },

    /**
     * Отрисовка элемента
    **/
    renderWork: function (item) {
        var workItemView = new App.Views.WorkItemView({model: item});
        this.$el.append(workItemView.render().el);
    }
});

///
/// Контрол управленяи элементом работы
///
App.Views.WorkItemView = Backbone.View.extend({
    tagName:'div',
    className:'line data-item',
    templates: {
        main:_.template($("#jobLogWorkItem").html()),
    },

    /**
     * Присоедиение событий
    **/
    events:{
        'blur .tbFact': 'onFactBlur',
        //'change .cb-close': 'onCloseChange',
        //'change .cb-hold': 'onHoldChange',
        'change .ddl-status': 'onStatusChange',
        'change .cb-repeat-operation': 'onRepeatOperation',
    },

    /**
     * Обработка события потери фокуса поля ввода факстического объема
    **/
    onFactBlur:function(){
        var self = this;
        var tbFactScope=  this.$('.tbFact');
        var tbBalance=  this.$('.tbBalance');
        var balanceVal = Routine.strToFloat(self.model.get('balance').toFixed(3));
        if(isNaN(balanceVal))
                    balanceVal = 0;

        var factScopeVal = Routine.strToFloat(tbFactScope.val());
        if(isNaN(factScopeVal))
        {
                    factScopeVal = 0;
                    tbFactScope.val('0');
        }
        else
            tbFactScope.val(Routine.floatToStr(factScopeVal.toFixed(3)));


        if(factScopeVal>balanceVal)
        {
            //tbFactScope.focus();
            tbFactScope.addClass('tberr');
            var msg = "Фактический объем работы не может превышать плановый ";
            msg+="(по наряду остаток: " + Routine.addCommas(balanceVal.toFixed(3)," ") + "; ";
            msg+="по факту: " + Routine.floatToStr(factScopeVal) + ").";
            $.jGrowl(msg, { 'themeState':'growl-error', 'sticky':false });
        }
        else
            tbFactScope.removeClass('tberr');

        // chande data in model
        self.model.set({'changed':true, 'fact_scope': factScopeVal});
    },

    /**
      * Отметка флага повторения операции
    **/
    onRepeatOperation: function()
    {
        if(this.$('.cb-repeat-operation').is(':checked'))
            this.model.set({'changed':true, 'repeat':true});
        else
            this.model.set({'changed':true, 'repeat':false});
    },
     /**
      * Обработка смены статуса
    **/
    onStatusChange:function(){
        var self = this;
        var ddlStatus = this.$('.ddl-status');
        var curStatus =  this.$('.ddl-status').val();
        this.$('.cb-repeat-operation').prop('checked', false);
        this.$('.cb-repeat-operation').hide();
        switch(curStatus)
        {
            case "on_hold":
                this.$('.tbFact').prop('disabled',true).val("");
                self.model.set({'changed':true, 'status': curStatus, 'fact_scope':0});
                if(self.model.get('old_status') == self.model.get('status'))
                    this.$('.cb-repeat-operation').show();
            break;
            case "on_pause":
                this.$('.tbFact').prop('disabled',true).val("");
                self.model.set({'changed':true, 'status': curStatus, 'fact_scope':0});
                if(self.model.get('old_status') == self.model.get('status'))
                    this.$('.cb-repeat-operation').show();
            break;
            case "completed":
                var tbFactScope=  this.$('.tbFact');
                var tbBalance=  this.$('.tbBalance');
                var balanceVal = self.model.get('balance').toFixed(3);

                var balanceVal = Routine.strToFloat(self.model.get('balance').toFixed(3));
                if(isNaN(balanceVal))
                        balanceVal = 0;
                var factScopeVal = Routine.strToFloat(tbFactScope.val());
                if(isNaN(factScopeVal))
                        factScopeVal = 0;

                // нельзя закрыть работу с превышающим фактом
                if(factScopeVal>balanceVal)
                {
                    //tbFactScope.focus();
                    tbFactScope.addClass('tberr');
                    var msg = "Фактический объем работы не может превышать плановый ";
                    msg+="(по наряду остаток: " + Routine.floatToStr(balanceVal) + "; ";
                    msg+="по факту: " + Routine.floatToStr(factScopeVal) + ").";
                    $.jGrowl(msg, { 'themeState':'growl-error', 'sticky':false });
                    //cbClose.prop('checked', false);
                    ddlStatus.val(self.model.get('old_status'));
                    if(self.model.get('old_status') != "on_work" && self.model.get('old_status') != "")
                        self.$('.cb-repeat-operation').show();
                    return;
                }
                else if(factScopeVal<balanceVal)
                {
                     var msg = "Введенные объемы работ не совпадают<br/> (по наряду остаток: " + Routine.floatToStr(balanceVal)+"; по факту: "+ Routine.floatToStr(factScopeVal) + ") ";
                    msg += "<br/>Закрыть работу с меньшим объемом?";
                    bootbox.confirm(msg, function(result)
                    {
                        if(!result)
                        {
                            //cbClose.prop('checked', false);
                            ddlStatus.val(self.model.get('old_status'));
                            if(self.model.get('old_status') != "on_work" && self.model.get('old_status') != "")
                                self.$('.cb-repeat-operation').show();
                        }
                        else
                        {
                            ddlStatus.prop('disabled',true);
                            tbFactScope.prop('disabled',true);
                            self.model.set({'changed':true, 'status': curStatus});
                        }
                    });
                }
                else
                {
                    ddlStatus.prop('disabled',true);
                    tbFactScope.prop('disabled',true);
                    self.model.set({'changed':true, 'status': curStatus});
                }
            break;
            case "on_work":
                this.$('.tbFact').prop('disabled',false);
                self.model.set({'changed':true, 'status': curStatus});
            break;
        }
    },

    /**
     * Отрисовка элемента
    **/
    render: function () {
        this.$el.html(this.templates.main(this.model.toJSON()));
        this.$('.tbFact').numeric({ negative: false, decimal: ',' });
        return this;
    }
});

///----------------------------------------------------------------------------------------------------------------------------------------------------------------
/// Контрол управленяи списокм материалов
///----------------------------------------------------------------------------------------------------------------------------------------------------------------
App.Views.MaterialItemsView = Backbone.View.extend({
   el: $("#pnlMaterialsDataContainer"),

    /**
     * инициализация
    **/
    initialize: function () {
        var self = this;
    },

    /**
     * Отрисовка формы
    **/
    render: function () {
        var that = this;
            _.each(this.collection.models, function (item) {
                that.renderWork(item);
        }, this);
    },

    /**
     * Отрисовка элемента
    **/
    renderWork: function (item) {
        var materialItemView = new App.Views.MaterialItemView({model: item});
        this.$el.append(materialItemView.render().el);
    }
});

///
/// Контрол управления элементом материала
///
App.Views.MaterialItemView = Backbone.View.extend({
    tagName:'div',
    className:'line data-item',
    templates: {
        main:_.template($("#planNormMaterialItem").html()),
    },

    /**
     * Присоедиение событий
    **/
    events:{
        'blur .tbFact': 'onFactBlur',
    },

    /**
     * Обработка события потери фокуса поля ввода факстического объема
    **/
    onFactBlur:function(){
        var self = this;
        var tbFactScope=  this.$('.tbFact');
        var tbBalance=  this.$('.tbBalance');
        var balanceVal = Routine.strToFloat(self.model.get('balance').toFixed(3));
        if(isNaN(balanceVal))
                    balanceVal = 0;

        var factScopeVal = Routine.strToFloat(tbFactScope.val());
        if(isNaN(factScopeVal))
        {
                    factScopeVal = 0;
                    tbFactScope.val('0');
        }
        else
            tbFactScope.val(Routine.floatToStr(factScopeVal.toFixed(3)));

        if(factScopeVal>balanceVal)
        {
            tbFactScope.addClass('tberr');
            var msg = "Фактический объем материала не может превышать плановый ";
            msg+="(по норме остаток: " + Routine.addCommas(balanceVal.toFixed(3)," ") + "; ";
            msg+="по факту: " + Routine.floatToStr(factScopeVal) + ").";
            $.jGrowl(msg, { 'themeState':'growl-error', 'sticky':false });
        }
        else
            tbFactScope.removeClass('tberr');

        // chande data in model
        self.model.set({'changed':true, 'fact_scope': factScopeVal});
    },

    /**
     * Отрисовка элемента
    **/
    render: function () {
        this.$el.html(this.templates.main(this.model.toJSON()));
        this.$('.tbFact').numeric({ negative: false, decimal: ',' });
        return this;
    }
});


///----------------------------------------------------------------------------------------------------------------------------------------------------------------
/// Контрол управления переносом дат
///----------------------------------------------------------------------------------------------------------------------------------------------------------------
App.Views.DatesTransferView = Backbone.View.extend({
    el: $("#pnlTransferDate"),
    ItemsView:null,
    itemsCollection: null,            // коллекция элементов
    shiftReasons: null,                // список причин переноса/приостановки
    dataToSave: null,                   // данные на сохранение пришедшие с формы фактов
    events:{
         'click .btnOk': 'OnSave',
         'click .btnCancel': 'OnCancel',
         'change .ddl-own-date-transfer-reason': 'OnShiftReasonChange',
         'click .cb-transfer-individual-reason': 'OnTranferChangeReasonType',
         'click .cb-transfer-common-reason': 'OnTranferChangeReasonType',
         'change .tb-transfer-common-note': 'OnChangeCommonTransferComment',
         'change .tb-transfer-reason-common-note': 'OnChangeCommonTransferReasonNote',
         'change .ddl-date-transfer-reason': 'OnTransferIndividualReasonChange',

         'change .ddl-own-hold-reason': 'OnHoldReasonChange',
         'click .cb-hold-individual-reason': 'OnHoldChangeReasonType',
         'click .cb-hold-common-reason': 'OnHoldChangeReasonType',
         'change .tb-hold-common-note': 'OnChangeCommonHoldComment',
         'change .tb-hold-reason-common-note': 'OnChangeCommonHoldReasonNote',
         'change .ddl-hold-reason': 'OnHoldIndividualReasonChange',

         'change .ddl-own-pause-reason': 'OnPauseReasonChange',
         'click .cb-pause-individual-reason': 'OnPauseChangeReasonType',
         'click .cb-pause-common-reason': 'OnPauseChangeReasonType',
         'change .tb-pause-common-note': 'OnChangeCommonPauseComment',
         'change .tb-pause-reason-common-note': 'OnChangeCommonPauseReasonNote',
         'change .ddl-pause-reason': 'OnPauseIndividualReasonChange',
    },
    initialize: function(){
        var self = this;
        // подгрузка списка причин переноса сроков
        $.ajax({
            url: '/handlers/newjoblog/getshiftreasonlist/',
            type: 'GET',
            dataType: 'json',
            contentType: "application/json; charset=utf-8",
            data: {},
            timeout: 35000,
            success: function (result, textStatus, jqXHR) {
                if(result.status=='error')
                    $.jGrowl(result.msg, { 'themeState':'growl-error', 'sticky':false });
                else if(result.status=="ok")
                {
                    //self.ShowContract($.parseJSON(result.contract));
                    self.shiftReasons = result.result;
                    self.fillShiftReason(self.shiftReasons);
                    self.fillHoldReason(self.shiftReasons);
                    self.fillPauseReason(self.shiftReasons);
                }
                else
                    //$.jGrowl("Ошибка сервера при получении причин переноса сроков плановых работ.", { 'themeState':'growl-error', 'sticky':false });
                    console.log('Ошибка сервера при получении причин переноса сроков плановых работ.');
            }
        });
    },

    /**
     * Смена общего коментария на все переносы
    **/
    OnChangeCommonTransferComment: function(e)
    {
        var curElem = $(e.currentTarget);
         // проходим по всем элементам списка и проставляем общий комментарий
        this.$('.transfer-data-container').find('.tb-note').val(curElem.val()).change();
    },

      /**
     * Смена общего уточнения к причине
    **/
    OnChangeCommonTransferReasonNote: function(e)
    {
        var curElem = $(e.currentTarget);
         // проходим по всем элементам списка и проставляем общий комментарий
        this.$('.transfer-data-container').find('.tb-reason-note').val(curElem.val()).change();
    },

    /**
     * Смена типа причины переноса дат ()
    **/
    OnTranferChangeReasonType: function(e)
    {
        //this.$(".btnOk").prop('disabled',false);

        var curElem = $(e.currentTarget);
        var box = this.$('.pnl-transfer-works');
        if(!curElem.is(':checked'))
            curElem.prop('checked', true);

        box.find('.tb-transfer-reason-common-note').val('');
        if(curElem.hasClass('cb-transfer-individual-reason'))
        {
            $(box).find('.cb-transfer-common-reason').prop('checked', false);
            box.find('.transfer-data-container').show();
            box.find('.transfer-data-container').find('.tb-note').parent().parent().show();
            box.find('.transfer-data-container').find('.ddl-date-transfer-reason').parent().parent().show();
            box.find('.pnl-transfer-header').hide();
            // box.find('.transfer-data-container').find('.tb-reason-note').show();
            if(
                box.find('.transfer-data-container').find('.ddl-date-transfer-reason').val()==App.PlanShiftReasonSystemObjects['ANOTHER_WORK'] ||
                box.find('.transfer-data-container').find('.ddl-date-transfer-reason').val()==App.PlanShiftReasonSystemObjects['NOT_PLAN_WORK'] ||
                box.find('.transfer-data-container').find('.ddl-date-transfer-reason').val()==App.PlanShiftReasonSystemObjects['PLAN_WORK']
                )
            {
                box.find('.transfer-data-container').find('.tb-reason-note').val('').parent().parent().show();
            }
        }
        else
        {
            $(box).find('.cb-transfer-individual-reason').prop('checked', false);
            box.find('.transfer-data-container').show();
            box.find('.transfer-data-container').find('.tb-note').parent().parent().hide();
            box.find('.transfer-data-container').find('.ddl-date-transfer-reason').parent().parent().hide();
            box.find('.pnl-transfer-header').show();
            //box.find('.transfer-data-container').find('.tb-reason-note').hide();
            box.find('.transfer-data-container').find('.tb-reason-note').val('').parent().parent().hide();
            //box.find('.pnl-transfer-header').find('.tb-note').parent().show();
        }
    },

    /**
     * Смена общего коментаряи на все заморозки работ
    **/
    OnChangeCommonHoldComment: function(e)
    {
        var curElem = $(e.currentTarget);
         // проходим по всем элементам списка и проставляем общий комментарий
        this.$('.hold-data-container').find('.tb-note').val(curElem.val()).change();
    },

    /**
     * Смена общего уточнения к причине
    **/
    OnChangeCommonHoldReasonNote: function(e)
    {
        var curElem = $(e.currentTarget);
         // проходим по всем элементам списка и проставляем общий комментарий
        this.$('.hold-data-container').find('.tb-reason-note').val(curElem.val()).change();
    },

    /**
     * Смена типа причины заморозки дат ()
    **/
    OnHoldChangeReasonType: function(e)
    {
        //this.$(".btnOk").prop('disabled',false);
        var curElem = $(e.currentTarget);
        var box = this.$('.pnl-hold-works');
        if(!curElem.is(':checked'))
            curElem.prop('checked', true);

        box.find('.tb-hold-reason-common-note').val('');

        if(curElem.hasClass('cb-hold-individual-reason'))
        {
            $(box).find('.cb-hold-common-reason').prop('checked', false);
            box.find('.hold-data-container').show();
            box.find('.hold-data-container').find('.tb-note').parent().parent().show();
            box.find('.hold-data-container').find('.ddl-hold-reason').parent().parent().show();
            box.find('.pnl-transfer-header').hide();
            if(
                box.find('.hold-data-container').find('.ddl-hold-reason').val()==App.PlanShiftReasonSystemObjects['ANOTHER_WORK'] ||
                box.find('.hold-data-container').find('.ddl-hold-reason').val()==App.PlanShiftReasonSystemObjects['NOT_PLAN_WORK'] ||
                box.find('.hold-data-container').find('.ddl-hold-reason').val()==App.PlanShiftReasonSystemObjects['PLAN_WORK'])
            {
                box.find('.hold-data-container').find('.tb-reason-note').val('').parent().parent().show();
            }
        }
        else
        {
            $(box).find('.cb-hold-individual-reason').prop('checked', false);
            box.find('.hold-data-container').show();
            box.find('.hold-data-container').find('.tb-note').parent().parent().hide();
            box.find('.hold-data-container').find('.ddl-hold-reason').parent().parent().hide();
            box.find('.pnl-transfer-header').show();
            box.find('.hold-data-container').find('.tb-reason-note').val('').parent().parent().hide();
        }
    },

     /**
     * Смена общего коментаряи на все приостановки работ
    **/
    OnChangeCommonPauseComment: function(e)
    {
        var curElem = $(e.currentTarget);
         // проходим по всем элементам списка и проставляем общий комментарий
        this.$('.pause-data-container').find('.tb-note').val(curElem.val()).change();
    },

    /**
     * Смена общего уточнения к причине
    **/
    OnChangeCommonPauseReasonNote: function(e)
    {
        var curElem = $(e.currentTarget);
         // проходим по всем элементам списка и проставляем общий комментарий
        this.$('.pause-data-container').find('.tb-reason-note').val(curElem.val()).change();
    },

    /**
     * Смена типа причины приостановки дат ()
    **/
    OnPauseChangeReasonType: function(e)
    {
        //this.$(".btnOk").prop('disabled',false);
        var curElem = $(e.currentTarget);
        var box = this.$('.pnl-pause-works');
        if(!curElem.is(':checked'))
            curElem.prop('checked', true);
        box.find('.tb-pause-reason-common-note').val('');
        if(curElem.hasClass('cb-pause-individual-reason'))
        {
            $(box).find('.cb-pause-common-reason').prop('checked', false);
            box.find('.pause-data-container').show();
            box.find('.pause-data-container').find('.tb-note').parent().parent().show();
            box.find('.pause-data-container').find('.ddl-pause-reason').parent().parent().show();
            box.find('.pnl-transfer-header').hide();
            if(
                box.find('.pause-data-container').find('.ddl-pause-reason').val()==App.PlanShiftReasonSystemObjects['ANOTHER_WORK'] ||
                box.find('.pause-data-container').find('.ddl-pause-reason').val()==App.PlanShiftReasonSystemObjects['NOT_PLAN_WORK'] ||
                box.find('.pause-data-container').find('.ddl-pause-reason').val()==App.PlanShiftReasonSystemObjects['PLAN_WORK'])
            {
                box.find('.pause-data-container').find('.tb-reason-note').val('').parent().parent().show();
            }
        }
        else
        {
            $(box).find('.cb-pause-individual-reason').prop('checked', false);
            box.find('.pause-data-container').show();
            box.find('.pause-data-container').find('.tb-note').parent().parent().hide();
            box.find('.pause-data-container').find('.ddl-pause-reason').parent().parent().hide();
            box.find('.pnl-transfer-header').show();
            box.find('.pause-data-container').find('.tb-reason-note').val('').parent().parent().hide();
        }
    },

    /**
     * Заполнение списка причин переноса
    **/
    fillShiftReason: function(data)
    {
         var self = this;
         var filter = self.$('.ddl-own-date-transfer-reason');
        filter.empty();
        filter.append("<option value=''>Выберите причину переноса</option>");
        _.each(data, function (item) {
            var option = $("<option/>", {
                value: item['_id'],
                text: item['name']
            }).appendTo(filter);
        });
    },

    /**
     * Заполнение списка причин простоя работ
    **/
    fillHoldReason: function(data)
    {
         var self = this;
         var filter = self.$('.ddl-own-hold-reason');
        filter.empty();
        filter.append("<option value=''>Выберите причину простоя</option>");
        _.each(data, function (item) {
            var option = $("<option/>", {
                value: item['_id'],
                text: item['name']
            }).appendTo(filter);
        });
    },

    /**
     * Заполнение списка причин приостановки работ
    **/
    fillPauseReason: function(data)
    {
         var self = this;
         var filter = self.$('.ddl-own-pause-reason');
        filter.empty();
        filter.append("<option value=''>Выберите причину приостановки</option>");
        _.each(data, function (item) {
            var option = $("<option/>", {
                value: item['_id'],
                text: item['name']
            }).appendTo(filter);
        });
    },


  parseReasonNote: function(val){
     res= {'status': 'ok', 'items':[]};
     var tmp = val.split(',');
      for(var i in tmp)
        {
            var i_tmp = tmp[i].split('/');
            if(i_tmp.length>1)
            {
                if(!Routine.strToInt(i_tmp[0]) || !Routine.strToInt(i_tmp[1]))
                {
                    return {'status': 'error', 'msg' : 'Ошибка формата уточнений к причинам переноса. Убедитесь что все указанные в уточнениях наряды и работы корректны.', 'items':[]};
                }
                res['items'].push({
                    'workorder_number': Routine.strToInt(i_tmp[0]),
                    'work_code': Routine.strToInt(i_tmp[1])
                })
            }
            else
            {
                if(!Routine.strToInt(i_tmp[0]))
                {
                    return {'status': 'error', 'msg' : 'Ошибка формата уточнений к причинам переноса. Убедитесь что все указанные в уточнениях наряды и работы корректны.', 'items':[]};
                }
                res['items'].push({
                    'workorder_number': Routine.strToInt(i_tmp[0]),
                    'work_code': null
                })
            }
        }
        return res;
    },

    /**
     * Обработка кнопки сохранения
    **/
    OnSave: function()
    {
        var self = this;
        var haveErrors = false;
        var haveNoReasonNotes = false;
        var need_comment = false;
        var fact_works = [];
        // проверка на заполненость всех обязательных полей
        _.each(self.itemsCollection.models, function (item) {

            // Для причины = "Другое", комментарий является обязательным
            if(
               (item.get('reason_id')==App.PlanShiftReasonSystemObjects['OTHER'] ||
                item.get('transfer_reason_id')==App.PlanShiftReasonSystemObjects['OTHER']) &&
               !item.get('note')
            )
            {
                need_comment = true;
            }

            // если есть перенос, но не указана причина
            if((item.get('transfer_reason_id')=='' || item.get('transfer_reason_id') ==undefined) && item.get('shift')>0)
            {
                haveErrors = true;
                return;
            }
            // если указан простой работы но не задана причина
            if((item.get('reason_id')=='' || item.get('reason_id') ==undefined) && (item.get('old_status')!=item.get('status') || item.get('repeat')) && item.get('status')!='completed' && item.get('status')!='on_work')
            {
                haveErrors = true;
                return;
            }

            // item.get('reason_id')==App.PlanShiftReasonSystemObjects['OTHER'] ||

            // если у кого-то в причинах - задержка на предыдущих участках,
            // то необходимо чтобы была указана детализация причины
            if(
                item.get('reason_id')==App.PlanShiftReasonSystemObjects['ANOTHER_WORK'] ||
                item.get('reason_id')==App.PlanShiftReasonSystemObjects['NOT_PLAN_WORK'] ||
                item.get('reason_id')==App.PlanShiftReasonSystemObjects['PLAN_WORK'] ||
                item.get('transfer_reason_id')==App.PlanShiftReasonSystemObjects['ANOTHER_WORK'] ||
                item.get('transfer_reason_id')==App.PlanShiftReasonSystemObjects['NOT_PLAN_WORK'] ||
                item.get('transfer_reason_id')==App.PlanShiftReasonSystemObjects['PLAN_WORK']
            )
            {
                if(!item.get('reason_note'))
                {
                    haveNoReasonNotes = true;
                   return;
                }

                var tmp = self.parseReasonNote(item.get('reason_note'));
                if(tmp['status']=='error')
                {
                    haveNoReasonNotes = true;
                   return;
                }
                else
                    item.set('reason_note_obj', tmp['items']);
            }

            /*// если указана приостановка работы но не задана причина
            if(item.get('pause_reason_id')=='' && item.get('old_status')!=item.get('status') && item.get('status')=='on_pause')
            {
                haveErrors = true;
                return;
            }*/
            /*if(item.get('reason_id')=='' && (item.get('old_status')!=item.get('status') || item.get('shift')>0))
            {
                haveErrors = true;
                return;
            }*/
        }, this);

        // если не все данные заполнены корректно, возвращаем ошибку
        if(haveErrors)
        {
            $.jGrowl('Для всех указанных работ необходимо задать причину переноса/приостановки.', { 'themeState':'growl-error', 'sticky':false });
            return;
        }
        // если не все данные заполнены корректно, возвращаем ошибку
        if(haveNoReasonNotes)
        {
            $.jGrowl('Для некоторых причин переноса не заданы обязательные уточнения причин.', { 'themeState':'growl-error', 'sticky':false });
            return;
        }
        // если не для всех заполнен комментарий
        if(need_comment)
        {
            $.jGrowl('Для причины: "Другое", комментарий обязателен для заполнения.', { 'themeState':'growl-error', 'sticky':false });
            return;
        }

        // сохранение
        self.dataToSave.fact_works= self.itemsCollection.toJSON();
        //console.log(JSON.stringify(self.dataToSave));
        App.save(self.dataToSave);
    },

    /**
     * Обработка кнопки отмена
    **/
    OnCancel: function()
    {
        this.close();
        App.FindView.orderView.show();
    },

    /**
     * Обработка смены общей причины переноса дат
    **/
    OnShiftReasonChange: function()
    {
        var self = this;
        // проходим по всем элементам списка переноса дат и выставляем необходимые значения
        self.$('.ddl-date-transfer-reason').val( self.$('.ddl-own-date-transfer-reason').val()).change();

        // проверка на показ уточнения к причине переноса
        if(
             self.$('.ddl-own-date-transfer-reason').val()==App.PlanShiftReasonSystemObjects['ANOTHER_WORK'] ||
             self.$('.ddl-own-date-transfer-reason').val()==App.PlanShiftReasonSystemObjects['NOT_PLAN_WORK'] ||
             self.$('.ddl-own-date-transfer-reason').val()==App.PlanShiftReasonSystemObjects['PLAN_WORK']
        )
            self.$('.transfer-reason-common-note'). show();
        else
            self.$('.transfer-reason-common-note').hide();
    },

    OnTransferIndividualReasonChange:function(e)
    {              var self = this;
          var curElem = $(e.currentTarget);
          if((
            curElem.val()==App.PlanShiftReasonSystemObjects['ANOTHER_WORK'] ||
            curElem.val()==App.PlanShiftReasonSystemObjects['NOT_PLAN_WORK'] ||
            curElem.val()==App.PlanShiftReasonSystemObjects['PLAN_WORK']) && !self.$('.cb-transfer-common-reason').prop('checked')
            )
            curElem.parents('.line:first').next().show();
        else
            curElem.parents('.line:first').next().hide().find('.tb-reason-note').val('');
    },

     /**
     * Обработка смены общей причины простоя работ
    **/
    OnHoldReasonChange: function()
    {
        var self = this;
        // проходим по всем элементам списка простоя работ и выставляем необходимые значения
        self.$('.ddl-hold-reason').val( self.$('.ddl-own-hold-reason').val()).change();

        // проверка на показ уточнения к причине переноса
        if(
            self.$('.ddl-own-hold-reason').val()==App.PlanShiftReasonSystemObjects['ANOTHER_WORK'] ||
            self.$('.ddl-own-hold-reason').val()==App.PlanShiftReasonSystemObjects['NOT_PLAN_WORK'] ||
            self.$('.ddl-own-hold-reason').val()==App.PlanShiftReasonSystemObjects['PLAN_WORK']
        )
            self.$('.hold-reason-common-note').show();
        else
            self.$('.hold-reason-common-note').hide();
    },

    OnHoldIndividualReasonChange:function(e)
    {
       var self = this;
       var curElem = $(e.currentTarget);
       if((
            curElem.val()==App.PlanShiftReasonSystemObjects['ANOTHER_WORK'] ||
            curElem.val()==App.PlanShiftReasonSystemObjects['NOT_PLAN_WORK'] ||
            curElem.val()==App.PlanShiftReasonSystemObjects['PLAN_WORK']) && !self.$('.cb-hold-common-reason').prop('checked')
        )
            curElem.parents('.line:first').next().show();
       else
            curElem.parents('.line:first').next().hide().find('.tb-reason-note').val('');;
    },

    /**
     * Обработка смены общей причины приостановки работ
    **/
    OnPauseReasonChange: function()
    {
        var self = this;
        // проходим по всем элементам списка приостановки работ и выставляем необходимые значения
        self.$('.ddl-pause-reason').val( self.$('.ddl-own-pause-reason').val()).change();

        // проверка на показ уточнения к причине переноса
        if(
              self.$('.ddl-own-pause-reason').val()==App.PlanShiftReasonSystemObjects['ANOTHER_WORK'] ||
              self.$('.ddl-own-pause-reason').val()==App.PlanShiftReasonSystemObjects['NOT_PLAN_WORK'] ||
              self.$('.ddl-own-pause-reason').val()==App.PlanShiftReasonSystemObjects['PLAN_WORK']
        )
            self.$('.pause-reason-common-note').show();
        else
            self.$('.pause-reason-common-note').hide();
    },

    OnPauseIndividualReasonChange:function(e)
    {
       var self = this;
       var curElem = $(e.currentTarget);
       if((
            curElem.val()==App.PlanShiftReasonSystemObjects['ANOTHER_WORK'] ||
            curElem.val()==App.PlanShiftReasonSystemObjects['NOT_PLAN_WORK'] ||
            curElem.val()==App.PlanShiftReasonSystemObjects['PLAN_WORK']) && !self.$('.cb-pause-common-reason').prop('checked')
        )
            curElem.parents('.line:first').next().show();
       else
            curElem.parents('.line:first').next().hide().find('.tb-reason-note').val('');
    },

   /**
     * Отрисовка формы
    **/
    render:function(dataToSave, materialsToSave){
         var self = this;
         self.dataToSave = dataToSave;
         self.materialsToSave = materialsToSave;
         // заполнение списка элементов переноса дат
         self.itemsCollection = new App.Collections.ShiftItemsCollection(dataToSave.fact_works);
         self.ItemsView = new  App.Views.ShiftItemsView({collection: self.itemsCollection}).render();

         // отображение блоков управления простоя работ
         if(dataToSave['have_holds'])
         {
            self.$(".pnl-hold-works").show()
            var count = 0;
            for (var i in dataToSave.fact_works)
                if(dataToSave.fact_works[i]['status']=='on_hold' && (dataToSave.fact_works[i]['status']!=dataToSave.fact_works[i]['old_status'] || dataToSave.fact_works[i]['repeat']))
                    count++;
            // проверяем количество элементов на заморозку
            if(count>1)
            {
                self.$(".pnl-hold-works").find('.pnl-transfer-header-type').show();
                self.$(".pnl-hold-works").find('.pnl-transfer-header').hide();
                self.$(".pnl-hold-works").find(".data-container").hide();
            }
            else
            {
                self.$(".pnl-hold-works").find('.pnl-transfer-header-type').hide();
                self.$(".pnl-hold-works").find('.pnl-transfer-header').hide();
                self.$(".pnl-hold-works").find(".data-container").show();
            }
        }

          // отображение блоков управления приостановки работ
         if(dataToSave['have_pauses'])
         {
            self.$(".pnl-pause-works").show()
            var count = 0;
            for (var i in dataToSave.fact_works)
                if(dataToSave.fact_works[i]['status']=='on_pause' && (dataToSave.fact_works[i]['status']!=dataToSave.fact_works[i]['old_status'] || dataToSave.fact_works[i]['repeat']))
                    count++;
            // проверяем количество элементов на приостановку
            if(count>1)
            {
                self.$(".pnl-pause-works").find('.pnl-transfer-header-type').show();
                self.$(".pnl-pause-works").find('.pnl-transfer-header').hide();
                self.$(".pnl-pause-works").find(".data-container").hide();
            }
            else
            {
                self.$(".pnl-pause-works").find('.pnl-transfer-header-type').hide();
                self.$(".pnl-pause-works").find('.pnl-transfer-header').hide();
                self.$(".pnl-pause-works").find(".data-container").show();
            }
        }

        // отображение блоков управления переносами сроков по работам
         if(dataToSave['have_transfers'])
         {
            self.$(".pnl-transfer-works").show()
            var count = 0;
            for (var i in dataToSave.fact_works)
                if(dataToSave.fact_works[i]['shift']>0 /*&& !dataToSave.fact_works[i]['is_first_fact']*/)
                    count++;
            // проверяем количество элементов на перенос
            if(count>1)
            {
                self.$(".pnl-transfer-works").find('.pnl-transfer-header-type').show();
                self.$(".pnl-transfer-works").find('.pnl-transfer-header').hide();
                self.$(".pnl-transfer-works").find(".data-container").hide();
            }
            else
            {
                self.$(".pnl-transfer-works").find('.pnl-transfer-header-type').hide();
                self.$(".pnl-transfer-works").find('.pnl-transfer-header').hide();
                self.$(".pnl-transfer-works").find(".data-container").show();
            }
        }
        $(self.el).show();
     },

    /**
     * Очистка формы
    **/
    clear:function(){
        this.$(".data-container").hide().empty();
        this.$(".tb-note").val("");

        this.$(".ddl-own-date-transfer-reason").val("").change();;
        this.$('.pnl-transfer-header-type').hide().find('.cb').prop('checked',false);
        this.$('.pnl-transfer-header').hide();
        this.$(".pnl-transfer-works").hide();

        this.$(".ddl-own-hold-reason").val("").change();;
        this.$('.pnl-hold-header-type').hide().find('.cb').prop('checked',false);
        this.$(".pnl-hold-works").hide();

        this.$(".ddl-own-pause-reason").val("").change();;
        this.$('.pnl-pause-header-type').hide().find('.cb').prop('checked',false);
        this.$(".pnl-pause-works").hide();
        //dthis.$(".btnOk").prop('disabled',true);
     },

    /**
     * Закрытие формы
    **/
    close:function(){
        var self = this;
         $(self.el).hide();
         //$(self.el).modal('hide');
         self.clear();
     }
});

///
/// Контрол управленяи списокм переноса дат
///
App.Views.ShiftItemsView = Backbone.View.extend({
   el: $("#pnlTransferDate"),

    /**
     * Отрисовка формы
    **/
    render: function () {
        var self = this;
            _.each(this.collection.models, function (item) {
                self.renderItem(item);
        }, this);
    },

    /**
     * Отрисовка элемента
    **/
    renderItem: function (item) {
        var hView = new App.Views.ShiftItemView({model: item});
        var transferView = new App.Views.ShiftItemView({model: item});

        if(item.get('status')=='on_hold' && (item.get('status')!=item.get('old_status') || item.get('repeat')))
            this.$(".hold-data-container").append(hView.render('on_hold').el);
        else if(item.get('status')=='on_pause' && (item.get('status')!=item.get('old_status') || item.get('repeat')))
            this.$(".pause-data-container").append(hView.render('on_pause').el);

        if(item.get('shift')>0 /*&& !item.get('is_first_fact')*/)
            this.$(".transfer-data-container").append(transferView.render('transfer_date').el);
    }
});

///
/// Контрол управления элементом переноса дат/ заморозки работ
///
App.Views.ShiftItemView = Backbone.View.extend({
    tagName:'div',
    className:'line data-item',
    templates: {
        shiftItemTemplate:_.template($("#dateTransferItem").html()),
        holdItemTemplate:_.template($("#holdItem").html()),
        pauseItemTemplate:_.template($("#pauseItem").html()),
    },

    /**
     * Присоедиение событий
    **/
    events:{
         'change .ddl-date-transfer-reason': 'onChangeTransferReason',
         'change .ddl-hold-reason': 'onChangeHoldReason',
         'change .ddl-pause-reason': 'onChangePauseReason',
         'change .tb-note': 'onChangeNote',
         'change .tb-shift-value': 'onChangeShiftValue',
         'change .tb-reason-note': 'onChangeReasonNote',
    },

    /**
     * Обработка события смены причины переноса дат
    **/
    onChangeShiftValue:function(){
    },

    /**
     * Обработка события смены причины переноса дат
    **/
    onChangeTransferReason:function(){
        var self = this;
        self.model.set({'transfer_reason_id':this.$('.ddl-date-transfer-reason').val(), 'transfer_reason':this.$('.ddl-date-transfer-reason option:selected'). text()});
    },

    /**
     * Обработка события смены причины простоя работ
    **/
    onChangeHoldReason:function(){
        var self = this;
        self.model.set({'reason_id':this.$('.ddl-hold-reason').val(), 'reason':this.$('.ddl-hold-reason option:selected'). text()});
    },

    /**
     * Обработка события смены причины приостановки работ
    **/
    onChangePauseReason:function(){
        var self = this;
        self.model.set({'reason_id':this.$('.ddl-pause-reason').val(), 'reason':this.$('.ddl-pause-reason option:selected'). text()});
    },

     /**
     * Обработка события смены примечания к переносу
    **/
    onChangeNote:function(){
        var self = this;
         self.model.set({'note':this.$('.tb-note').val()});
    },

    /**
     * Обработка события смены пояснения к причине переноса
    **/
    onChangeReasonNote:function(){
        var self = this;
         self.model.set({'reason_note':this.$('.tb-reason-note').val()});
    },

    /**
     * Отрисовка элемента
    **/
    render: function (type) {
        var self = this;
        //if(this.model.get('status')=='on_hold' && this.model.get('status')!=this.model.get('old_status'))
        if(type=='on_hold')
        {
            this.$el.html(this.templates.holdItemTemplate(this.model.toJSON()));
            this.fillHoldReason(App.DatesTransferView.shiftReasons);
        }
        //else if(this.model.get('status')=='on_pause' && this.model.get('status')!=this.model.get('old_status'))
        if(type=='on_pause')
        {
            this.$el.html(this.templates.pauseItemTemplate(this.model.toJSON()));
            this.fillPauseReason(App.DatesTransferView.shiftReasons);
        }

        if(type=='transfer_date')
        //if(this.model.get('shift')>0)
        {
            this.$el.html(this.templates.shiftItemTemplate(this.model.toJSON()));
            this.fillShiftReason(App.DatesTransferView.shiftReasons);
            // поле ввода количества дней для переноса числовое
            this.$el.find('.tb-shift-value').numeric('');
            // календарь
            var tmpDays =  Math.floor(( this.model.get('fact_date') -  new Date()) / 86400000);
            this.$('.date-picker input').val(this.model.get('fact_date').format("dd/mm/yyyy"));
            //console.log(this.model.get('fact_date'));
            //console.log(new Date());
            if(this.model.get('is_first_fact'))
                this.$('.date-picker').find('.add-on').hide();
                this.$('.date-picker').datepicker({
                    format: "dd/mm/yyyy",
                    weekStart: 1,
                    startDate: (tmpDays>0)?"+"+(tmpDays-1).toString()+"d": "-"+(Math.abs(tmpDays)-1).toString()+"d",
                    //todayBtn: "linked",
                    autoclose: true,
                    todayHighlight: false,
                    defaultDate: this.model.get('fact_date')
                }).on('changeDate', function(ev){
                        self.model.set('shift', Math.floor((ev.date - self.model.get('plan_date')) / 86400000)) ;
                        self.$el.find('.tb-shift-value').val(self.model.get('shift').toString());
                });
        }
        return this;
    },

    /**
     * Заполнение списка причин переноса
    **/
    fillShiftReason: function(data)
    {
         var self = this;
         var filter = self.$('.ddl-date-transfer-reason');
        filter.empty();
        filter.append("<option value=''>Выберите причину переноса</option>");
        _.each(data, function (item) {
            var option = $("<option/>", {
                value: item['_id'],
                text: item['name']
            }).appendTo(filter);
        });
    },
    /**
     * Заполнение списка причин простоя
    **/
    fillHoldReason: function(data)
    {
         var self = this;
         var filter = self.$('.ddl-hold-reason');
        filter.empty();
        filter.append("<option value=''>Выберите причину простоя</option>");
        _.each(data, function (item) {
            var option = $("<option/>", {
                value: item['_id'],
                text: item['name']
            }).appendTo(filter);
        });
    },

    /**
     * Заполнение списка причин приостановки
    **/
    fillPauseReason: function(data)
    {
         var self = this;
         var filter = self.$('.ddl-pause-reason');
        filter.empty();
        filter.append("<option value=''>Выберите причину приостановки</option>");
        _.each(data, function (item) {
            var option = $("<option/>", {
                value: item['_id'],
                text: item['name']
            }).appendTo(filter);
        });
    },
});


///---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
/// Представление формы настройки параметров выгрузки
///---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
App.Views.downloadSettingsForm = Backbone.View.extend({
selectedSectors : [],
selectedTeams : [],
selectedMonths : [],
selectedYears : [],
templates: {
        item_templateSector:_.template($("#filterItemTemplateSector").html()),
        item_templateTeam:_.template($("#filterItemTemplateTeam").html()),
        template:_.template($("#downloadSettingsForm").html()),
    },

parent_type:'',
events:{
    'click .btn-save':'onSaveClick',
},

initialize:function(){
    this.render();
},

render:function(){
    var self = this;

    //console.log(Routine.getRangeYears(2,0));
    this.$el.append(this.templates.template());
    this.$el.modal({close: function(){}});
    this.$el.on('hidden', function () { self.trigger("dialogclose"); })


    // заполнение участков
    // подключение мультиселекта на участки
    this.selectedSectors = [];
    this.$('.ddl-sectors').multiselect({
            buttonContainer: '<span class="dropdown" />',
            includeSelectAllOption: true,
            enableCaseInsensitiveFiltering: true,
            numberDisplayed: 4,
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
                                //self.selectedSectors[0] = element.val();
                        }
                        else
                        {
                            if(element.val()=='multiselect-all')
                            {
                                self.selectedSectors = [];
                            }
                            else
                            {
                                if(self.selectedSectors.indexOf(element.val())>-1)
                                    self.selectedSectors.splice(self.selectedSectors.indexOf(element.val()),1);
                            }
                        }
                }
        });
    this.fillSectors(App.sectors);

     // заполнение бригад
    // подключение мультиселекта на бригады
    this.selectedTeams = [];
    this.$('.ddl-teams').multiselect({
            buttonContainer: '<span class="dropdown" />',
            includeSelectAllOption: true,
            enableCaseInsensitiveFiltering: true,
            numberDisplayed: 4,
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
                            selected += $(this).text() + ', ';
                        });
                        return selected.substr(0, selected.length -2) + ' <b class="caret"></b>';
                    }
                },
                onChange: function(element, checked) {
                        if(checked === true)
                        {
                            if(element.val()=='multiselect-all')
                            {
                                self.selectedTeams = [];
                                // take only visible elems
                                 $(self.el).find('.ddl-teams' ).next().find('input:visible').each(function(){
                                    //visibleElems[$(this).val()] = $(this).val();
                                    if($(this).val()!="" && $(this).val()!='multiselect-all' && !$(this).prop('disabled'));
                                        self.selectedTeams.push($(this).val());
                                 });
                            }
                            else
                                self.selectedTeams.push(element.val());
                                //self.selectedSectors[0] = element.val();
                        }
                        else
                        {
                            if(element.val()=='multiselect-all')
                            {
                                self.selectedTeams = [];
                            }
                            else
                            {
                                if(self.selectedTeams.indexOf(element.val())>-1)
                                    self.selectedTeams.splice(self.selectedTeams.indexOf(element.val()),1);
                            }
                        }
                }
        });
    this.fillTeams(App.Teams);


    // подключение месяцов
    this.selectedMonths = [];
    var d = new Date();
    this.$('.ddl-months').find('option[value="' + (d.getMonth()).toString() + '"]').prop('selected', true);
    this.selectedMonths.push(d.getMonth());
    this.$('.ddl-months').multiselect({
            buttonContainer: '<span class="dropdown" />',
            includeSelectAllOption: true,
            enableCaseInsensitiveFiltering:  false,
            numberDisplayed: 4,
            filterPlaceholder: 'Найти',
            nonSelectedText: "Выберите",
            nSelectedText: "",
            selectAllText: "Все",
            maxHeight: 200,
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
                            selected += $(this).html() + ', ';
                        });
                        return selected.substr(0, selected.length -2) + ' <b class="caret"></b>';
                    }
                },
                onChange: function(element, checked) {
                        if(checked === true)
                        {
                            if(element.val()=='multiselect-all')
                            {
                                self.selectedMonths = [];
                                // take only visible elems
                                 $(self.el).find('.ddl-months' ).next().find('input:visible').each(function(){
                                    //visibleElems[$(this).val()] = $(this).val();
                                    if($(this).val()!="" && $(this).val()!='multiselect-all' && !$(this).prop('disabled'));
                                        self.selectedMonths.push($(this).val());
                                 });
                            }
                            else
                                //self.selectedMonths.push(element.val());
                                self.selectedMonths[0] = element.val();
                        }
                        else
                        {
                            if(element.val()=='multiselect-all')
                            {
                                self.selectedMonths = [];
                            }
                            else
                            {
                                if(self.selectedMonths.indexOf(element.val())>-1)
                                    self.selectedMonths.splice(self.selectedMonths.indexOf(element.val()),1);
                            }
                        }
                }
        });

   // подключение годов
    this.selectedYears = [];
    this.$('.ddl-years').multiselect({
            buttonContainer: '<span class="dropdown" />',
            includeSelectAllOption: true,
            enableCaseInsensitiveFiltering:  false,
            numberDisplayed: 4,
            filterPlaceholder: 'Найти',
            nonSelectedText: "Выберите",
            nSelectedText: "",
            selectAllText: "Все",
            maxHeight: 200,
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
                            selected += $(this).html() + ', ';
                        });
                        return selected.substr(0, selected.length -2) + ' <b class="caret"></b>';
                    }
                },
                onChange: function(element, checked) {
                        if(checked === true)
                        {
                            if(element.val()=='multiselect-all')
                            {
                                self.selectedYears = [];
                                // take only visible elems
                                 $(self.el).find('.ddl-years' ).next().find('input:visible').each(function(){
                                    //visibleElems[$(this).val()] = $(this).val();
                                    if($(this).val()!="" && $(this).val()!='multiselect-all' && !$(this).prop('disabled'));
                                        self.selectedYears.push($(this).val());
                                 });
                            }
                            else
                                //self.selectedYears.push(element.val());
                                self.selectedYears[0] = element.val();
                        }
                        else
                        {
                            if(element.val()=='multiselect-all')
                            {
                                self.selectedYears = [];
                            }
                            else
                            {
                                if(self.selectedYears.indexOf(element.val())>-1)
                                    self.selectedYears.splice(self.selectedYears.indexOf(element.val()),1);
                            }
                        }
                }
        });
        this.fillYears(Routine.getRangeYears(1,0));

},

/**
 * Обработка кнопки сохранения
**/
onSaveClick:function(){
    if(this.selectedMonths.length>0 && this.selectedYears.length==0)
    {
        $.jGrowl('Задайте год, по которому необходимо получить данные.', { 'themeState':'growl-error', 'sticky':false });
        return;
    }
    this.trigger("startdownload");
    this.$el.modal('hide');
    this.$el.remove();
},

/**
 * Заполнение выпадающего списка участков
**/
fillSectors: function(data)
{
        var ddl = this.$(".ddl-sectors").empty();
        //this.selectedSectors.push(data[Object.keys(data)[0]]['code']);
        for(var i in data)
            $(ddl).append(this.templates.item_templateSector(data[i]));

        $(ddl).multiselect('rebuild');
},

/**
 * Заполнение выпадающего списка бригад
**/
fillTeams: function(data)
{
        var ddl = this.$(".ddl-teams").empty();
        for(var i in data)
            $(ddl).append(this.templates.item_templateTeam(data[i]));
        $(ddl).multiselect('rebuild');
},

/**
 * Заполнение выпадающего списка годов
**/
fillYears: function(data)
{
        var ddl = this.$(".ddl-years").empty();
        this.selectedYears.push(data[data.length-1]);
        //$(ddl).append('<option selected value = "" ></option>');
        for(var i in data)
        {
            if(i==data.length-1)
                $(ddl).append('<option selected value = "'+data[i].toString()+'" >'+data[i].toString()+'</option>');
            else
                $(ddl).append('<option value = "'+data[i].toString()+'" >'+data[i].toString()+'</option>');
        }
        $(ddl).multiselect('rebuild');
},
})


///----------------------------------------------------------------------------------------------------------------------------------------------------------------
/// Контрол управленяи списокм рабочих на форме добавления/редактиорвания
///----------------------------------------------------------------------------------------------------------------------------------------------------------------
App.Views.WorkerItemsView = Backbone.View.extend({
   //el: $("#pnlWorkersContainer"),
    tagName:'div',
    className:'pnl-workers-container',
    templates: {
        main:_.template($("#pnl_workers_container_template").html()),
    },

   /**
     * События
    **/
    events:{
        'click .btn-add-worker': 'onAddWorkerItem',
        'click .btn-worker-equally':'onWorkerEqually'
    },

    /**
     * инициализация
    **/
    initialize: function (params) {
        this.parent = params.parent;
    },

    /**
     * Отрисовка формы
    **/
    render: function () {
        var self = this;
        var full_perc = 0;

        this.$el.html(this.templates.main());
        this.$('.tb-search-workorder').numeric();
        $(".tb-search-workorder",this.$el).tokenInput("/handlers/newjoblog/search_workorder_numbers/",
            {
                theme: "facebook",
                zindex:1300,
                hintText:"Номер наряда",
                noResultsText:"Не найдено...",
                searchingText:"Поиск...",
                allowFreeTagging:false,
                preventDuplicates:true,
                tokenLimit:1,
                onDelete: function(){
                    //console.log('Clear list');
                },
                onAdd: function(){
                    var cln = self.$('.tb-search-workorder').tokenInput("get");
                    //cln[0]['id']
                    //cln[0]['number']
                    // подгрузка списка работников из выбранного наряда
                   Routine.showLoader();
                    $.ajax({
                        url: '/handlers/newjoblog/get_workers/' + cln[0]['name'],
                        type: 'GET',
                        dataType: 'json',
                        contentType: "application/json; charset=utf-8",
                        data: cln[0],
                        timeout: 35000,
                        async: true,
                        success: function (result, textStatus, jqXHR) {
                            if(result.status=='error')
                                $.jGrowl(result.msg, { 'themeState':'growl-error', 'sticky':false });
                            else if(result.status=="ok")
                            {
                                    if (!result.data || result.data.length == 0)
                                        $.jGrowl("Для указанного наряда работники не заданы.", { 'themeState':'growl-error', 'sticky':false });

                                    //App.FindView.orderView.workersList = new App.Collections.WorkerItemsCollection(result.data);
                                    //self.collection = App.FindView.orderView.workersList;
                                    //self.collection = new App.Collections.WorkerItemsCollection(result.data);
                                    self.collection.reset();
                                    self.collection.add(new App.Collections.WorkerItemsCollection(result.data).models);
                                    self.render();
                            }
                            else
                                $.jGrowl("Ошибка сервера.", { 'themeState':'growl-error', 'sticky':false });
                        }
                    }).error(function(){
                            $.jGrowl("Ошибка сервера.", { 'themeState':'growl-error', 'sticky':false });
                    }).always(function(){Routine.hideLoader();});
                }
            });

        this.$el.find(".data-workers-container").empty();
            _.each(this.collection.models, function (item) {
                full_perc+=item.get("proportion");
                self.renderItem(item);
        }, this);

        if(full_perc>0)
            self.$('.lbl-full-percent').html(full_perc + " из 100 %" );
        else
            self.$('.lbl-full-percent').html('');
        return this;
    },

    /**
     * Отрисовка элемента
    **/
    renderItem: function (item) {
        var itemView = new App.Views.WorkerItemView({model: item, parent: this});
        itemView.render();
        /*this.$el.find(".data-workers-container").append(
            .el); */
    },

    /**
    * Скрыть форму
    **/
    hide: function(){
        this.$el.hide();
    },

    /**
    * Показать форму
    **/
    show: function(){
        this.$el.show();
    },

    /**
    * Обработка кнопки добавления рабочего
    **/
    onAddWorkerItem: function(){
        var new_elem = new App.Models.WorkerModel();
        this.collection.add(new_elem);
        var itemView = new App.Views.WorkerItemView({model: new_elem, parent: this});
        itemView.render();
        //this.$el.find(".data-workers-container").append(itemView.render().el);
    },

    /**
    * Обработка кнопки поровну
    **/
    onWorkerEqually:function(){
        var vl = Math.floor(100/this.collection.models.length);
        // остаток от 100 добавляем к первому
        var rem = 100-vl*this.collection.models.length;
        for(var i in this.collection.models){
            if(i==0)
                this.collection.models[i].set("proportion",vl+rem);
            else
                this.collection.models[i].set("proportion",vl);
        }
    },

    /*
    * проверка на валидность введенных данных
    */
    Validate:function(){
        var full_perc = 0;
        for(var i in this.collection.models){
            var md = this.collection.models[i];
            if(!md.get("user_id")){
                $.jGrowl("Необходимо заполнить трудовой процент участия для всех работников.", { 'themeState':'growl-error', 'sticky':false });
                return false;
            }
            if(!md.get("proportion")){
                $.jGrowl("Трудовое участие работников не может быть неопределенным.", { 'themeState':'growl-error', 'sticky':false });
                return false;
            }
            full_perc+=md.get("proportion");
        }
        if(full_perc!=100){
            $.jGrowl("Суммарное трудовое участие работников должно составлять 100 %", { 'themeState':'growl-error', 'sticky':false });
            return false;
        }
        return true;
    }
});

///
/// Контрол управления элементом рабочего
///
App.Views.WorkerItemView = Backbone.View.extend({
    tagName:'div',
    className:'data-item',
    parent: null,
    templates: {
        main:_.template($("#workerItem").html()),
    },
     /**
     * инициализация
    **/
    initialize: function (params) {
        this.parent = params.parent;
    },

    /**
     * События
    **/
    events:{
        'click .lnk-remove-item': 'onRemove',
        'click .lnk-minus-qty': 'onProportionMinus',
        'click .lnk-plus-qty': 'onProportionPlus',
    },

    /**
     * ручное уменьшение пропорции
    **/
    onProportionMinus: function()
    {
        var self = this;
        var full_perc = 100;
        for(var i in self.parent.collection.models){
            if(self.parent.collection.models[i].cid!=self.model.cid){
                full_perc-=self.parent.collection.models[i].get("proportion");
            }
        }
        if(full_perc<0)
            full_perc = 0;
        var vl = self.model.get("proportion")-1;
        if(vl<0)
            vl = 0;
        self.model.set("proportion",vl);
        self.$(".chance-value").html(vl+" из "+full_perc+" %");
        setTimeout(function(){
            self.model.trigger("change:proportion");
        },300);
    },

    /**
     * ручное увеличение пропорции
    **/
    onProportionPlus: function()
    {
        var self = this;
        var full_perc = 100;
        for(var i in self.parent.collection.models){
            if(self.parent.collection.models[i].cid!=self.model.cid){
                full_perc-=self.parent.collection.models[i].get("proportion");
            }
        }
        if(full_perc<0)
            full_perc = 0;
        var vl = self.model.get("proportion")+1;

        //self.$(".chance-value").html(vl?(vl+" %"):"не определено");

        if(vl>full_perc)
            vl = full_perc;

        self.model.set("proportion",vl);
        //self.model.trigger("change:proportion");

        self.$(".chance-value").html(vl+" из "+full_perc+" %");
        setTimeout(function(){
            self.model.trigger("change:proportion");
        },300);
    },

    /**
     * Отрисовка элемента
    **/
    render: function () {
        var self = this;
        this.$el.html(this.templates.main(this.model.toJSON()));
        this.parent.$el.find(".data-workers-container").append(this.el);

        this.$('.chance-slider').slider({value:0}).on('slideStop', function(ev){
            var vl = (ev.value>this.full_perc)?this.full_perc:ev.value;
            self.model.set("proportion",vl);
            //if(vl==0)
                self.model.trigger("change:proportion");
        }).on("slide",function(ev){
            var vl = (ev.value>this.full_perc)?this.full_perc:ev.value;
            self.$(".chance-value").html(vl+" из "+this.full_perc+" %");

            self.parent.$('.lbl-full-percent').html(100-(this.full_perc-vl) + " из 100 %" );


        }).on("slideStart",function(ev){
            this.full_perc = 100;
            for(var i in self.parent.collection.models){
                if(self.parent.collection.models[i].cid!=self.model.cid){
                    this.full_perc-=self.parent.collection.models[i].get("proportion");
                }
            }
            if(this.full_perc<0)
                this.full_perc = 0;
        });
        this.model.on("change:proportion",function(){
            var vl = self.model.get("proportion");
            self.$('.chance-slider').slider("setValue",vl);
            self.$(".chance-value").html(vl?(vl+" %"):"не определено");

            var full_perc = 0;
            for(var i in self.parent.collection.models){
                    full_perc+=self.parent.collection.models[i].get("proportion");
            }
            if(full_perc>100)
                full_perc = 100;

            self.parent.$('.lbl-full-percent').html(full_perc + " из 100 %" );
        });
        var all_workers = [];
        for(var i in App.AllWorkers){
            all_workers.push({value:App.AllWorkers[i].fio, data:App.AllWorkers[i]})
        }
        var self = this;
        this.$(".fio").autocomplete({lookup: all_workers,
            showNoSuggestionNotice:true,
            noSuggestionNotice: "Сотрудник не найден",
            triggerSelectOnValidInput:false,
            onSelect:function(suggestion){
                self.model.set("user_id",suggestion.data._id);
                self.model.set("user_email",suggestion.data.email);
                self.model.set("user_fio",suggestion.data.fio);
            },
            lookupFilter:function(suggestion, query, queryLowerCase){
                for(var i in self.parent.collection.models){
                    if(self.parent.collection.models[i].cid!=self.model.cid){
                        if(suggestion.data._id==self.parent.collection.models[i].get("user_id"))
                            return false;
                    }
                }
                return suggestion.value.toLowerCase().indexOf(queryLowerCase) !== -1;
            }
        }).blur(function(){
        },function(){
            var el = $(this);
            setTimeout(function(){
                el.val(self.model.get("user_fio"));
            },100);
        });
        return this;
    },

    /**
     * Удаление элемента
    **/
    onRemove: function () {
        // удаление элемента с формы
        this.$el.remove();
        // удаление модели из коллекции
        this.parent.collection.remove(this.model);
    }
});
//------------------------------------------------------------------------------------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------------------------------------------------------------------------------

///----------------------------------------------------------------------------------------------------------------------------------------------------------------
/// Контрол управленяи списокм рабочих на форме добавления/редактиорвания
///----------------------------------------------------------------------------------------------------------------------------------------------------------------
App.Views.HistoryWorkerItemsView = Backbone.View.extend({
   el: $("#pnlWorkersHistoryContainer"),
   /**
     * События
    **/
    events:{
    },

    /**
     * инициализация
    **/
    initialize: function () {
        var self = this;
        Backbone.on("onHistoryWorkerItemRemove",this.onHistoryWorkerItemRemove, this);
    },

      /**
     * Отрисовка формы
    **/
    render: function () {
        var self = this;
        this.$el.find(".data-workers-history-container").empty();
        if(this.collection.length>0)
        {
            _.each(this.collection.models, function (item) {
                    if(item.get('status')=='active')
                        self.renderItem(item);
            }, this);
            this.show();
        }
        else
            this.hide();
    },

    /**
     * Отрисовка элемента
    **/
    renderItem: function (item) {
        //var itemView = new App.Views.HistoryWorkerItemView({model: item, parent: this});
        //this.$el.find(".data-workers-history-container").append(itemView.render().el);
        new App.Views.HistoryWorkerItemView({model: item, parent: this});
    },

    /**
    * Скрыть форму
    **/
    hide: function(){
        this.$el.hide();
    },

    /**
    * Показать форму
    **/
    show: function(){
        this.$el.show();
    },
    onHistoryWorkerItemRemove: function(e){
        if(this.collection.length==0)
            this.hide();
    },

});

///
/// Контрол управления элементом истории трудового участия работников
///
App.Views.HistoryWorkerItemView = Backbone.View.extend({
    tagName:'div',
    className:'history-item',
    parent: null,
    workersListCollection: null, // коллекция процентов участия рабоиников
    workerItemsView: null,          // отображение для редактирования трудового участия
    templates: {
        main:_.template($("#worker_history_item").html()),
        edit:_.template($("#worker_history_item_edit").html()),
    },

     /**
     * инициализация
    **/
    initialize: function (params) {
        this.parent = params.parent;
        this.render();
    },

    /**
     * События
    **/
    events:{
        'click .btn-remove': 'onRemove',
        'click .btn-edit': 'onEdit',
        'click .btn-ok': 'onSave',
        'click .btn-cancel': 'onCancel',
    },

    /**
     * Отрисовка элемента
    **/
    render: function () {
        var self = this;
        this.$el.html(this.templates.main(this.model.toJSON()));
        //return this;
        this.parent.$el.find(".data-workers-history-container").append(this.el);
        return this;
    },

    /**
     * Удаление элемента
    **/
    onRemove: function () {
        var self = this;
        Routine.showLoader();
        $.ajax({
        type: "PUT",
        url: "/handlers/newjoblog/remove_workers_history_item",
        data: JSON.stringify(self.model),
        timeout: 35000,
        contentType: 'application/json',
        dataType: 'json',
        async:true
        }).done(function(result) {
                if(result['status']=="ok")
                {
                    $.jGrowl('Данные успешно удалены .', { 'themeState':'growl-success', 'sticky':false });
                    // удаление элемента с формы
                    self.$el.remove();
                    self.model.set('status', 'removed');
                    // удаление модели из коллекции
                    self.parent.collection.remove(self.model);
                    Backbone.trigger('onHistoryWorkerItemRemove',[self]);
                }
                else
                    $.jGrowl('Ошибка удаления данных. Подробности: ' + result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 10000 });
            }).fail(function(jqXHR, textStatus, errorThrown ) {
                    $.jGrowl('Ошибка удаления данных. Подробности:' + errorThrown, { 'themeState':'growl-error', 'sticky':false, life: 10000 });
            }).always(function(){Routine.hideLoader();});
    },

    /**
     * Редактирование элемента
    **/
    onEdit: function () {
        // показать форму редактирования элемента
        this.$el.html(this.templates.edit(this.model.toJSON()));
        // создать коллекцию из трудовых расчетов текущего элемента истории
        // подгрузить view работы с формой редактирования трудовых расчетов
        this.workersListCollection = new App.Collections.WorkerItemsCollection(this.model.get('workers'));
        this.workerItemsView = new  App.Views.WorkerItemsView({parent:this});
        this.workerItemsView.collection = this.workersListCollection;
        this.$el.find('.data-box').html(this.workerItemsView.render().el).addClass('edit');
    },

    /**
     * Сохранение изменений
    **/
    onSave: function () {
        var self = this;
        // валидация процентов трудового участия
        if(!this.workerItemsView.Validate())
            return;
        // сохранение данных  влокальной коллекции
        this.model.set('workers', this.workersListCollection.toJSON());
        // сохранение данных на сервере
        Routine.showLoader();
        $.ajax({
        type: "PUT",
        url: "/handlers/newjoblog/update_workers_history",
        data: JSON.stringify(self.model),
        timeout: 35000,
        contentType: 'application/json',
        dataType: 'json',
        async:true
        }).done(function(result) {
                if(result['status']=="ok")
                {
                    $.jGrowl('Данные успешно сохранены .', { 'themeState':'growl-success', 'sticky':false });
                    // показать форму отображения элемента
                    self.$el.html(self.templates.main(self.model.toJSON())).removeClass('edit');
                }
                else
                    $.jGrowl('Ошибка сохранения данных. Подробности: ' + result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 10000 });

            }).fail(function(jqXHR, textStatus, errorThrown ) {
                    $.jGrowl('Ошибка сохранения данных. Подробности:' + errorThrown, { 'themeState':'growl-error', 'sticky':false, life: 10000 });
            }).always(function(){Routine.hideLoader();});
    },

     /**
     * Отмена редактирования
    **/
    onCancel: function(){
        // вернуть модель к первоначальному состоянию
        // показать форму отображения элемента
        this.$el.html(this.templates.main(this.model.toJSON())).removeClass('edit');
    }
});
