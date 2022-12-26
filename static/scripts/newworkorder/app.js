// define([
//     'jquery',
//     'backbone',
//     'underscore',
//     'jquery.blockui',
//     'jquery.jgrowl',
//     'jquery.numeric',
//     'bootstrap.datepicker',
//     'moment'

// ], function($, Backbone, _) {

    var App = {
        Models: {},
        Views:{},
        Collections:{},
        CurrentOrder:null,              // номер текущего заказа
        CurrentProduct: null,         // объект на который выдано задание на производство
        WorkOrders:null,                          // коллекйия нарядов
        OrderListView:null,                     // view формы заказа
        ProductInfoView: null,      // view инормации о продукте для которого созданы наряды
        PlanShiftReasonSystemObjects: null, // список идентификаторов системных причин переноса плановых сроков
        initialize: function(planshiftreason_system_objects){
            this.PlanShiftReasonSystemObjects = planshiftreason_system_objects;
            new App.Views.FindView();
        }
    };

    ///
    /// Модели и коллекции
    ///
    App.Models.ProductModel = Backbone.Model.extend({});
    App.Models.SectorModel = Backbone.Model.extend({});
    App.Models.WorkPlanModel = Backbone.Model.extend({
       initialize: function(){
             this.set('date_start_with_shift', (this.get('date_start_with_shift'))?moment(this.get('date_start_with_shift')).format('DD.MM.YYYY'):null);
            this.set('date_finish_with_shift', (this.get('date_finish_with_shift'))?moment(this.get('date_finish_with_shift')).format('DD.MM.YYYY'):null);
            this.set('date_start', (this.get('date_start'))?moment(this.get('date_start')).format('DD.MM.YYYY'):null);
            this.set('date_finish', (this.get('date_finish'))?moment(this.get('date_finish')).format('DD.MM.YYYY'):null);
       }
    });
    App.Collections.WorkPlanCollection = Backbone.Collection.extend({
        model: App.Models.WorkPlanModel
    });
    App.Models.WorkOrderModel = Backbone.Model.extend({
        initialize: function(){
            this.set('items', new App.Collections.WorkPlanCollection(this.get('items')));
            this.set('sector', new App.Models.SectorModel(this.get('sector')));
        }
    });

    App.Collections.WorkCollection = Backbone.Collection.extend({
        model: App.Models.WorkOrderModel
    });

    App.Models.ProductionOrderModel = Backbone.Model.extend({
        urlRoot: '/handlers/newworkorder/',
        parse:function(response){
            if(response.status=='error')
            {
                $.jGrowl(response.msg, { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                return;
            }
            if(response.msg)
                $.jGrowl(response.msg, { 'themeState':'growl-success', 'sticky':false, life: 5000 });
            response.result['product'] = new App.Models.ProductModel(response.result['product']);
            response.result['work_orders'] = new App.Collections.WorkCollection(response.result['work_orders']);
            return response.result;
        },
        save: function (options) {
            var self = this;
            Routine.showLoader();
            var xhr = this.sync("update", this, options);
            xhr.done(function(response){
                //return self.parse(response);
                if(response.status=='error')
                    $.jGrowl(response.msg, { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                else
                    $.jGrowl(response.msg || 'Данные успешно сохранены' , { 'themeState':'growl-success', 'sticky':false, life: 5000 });
            })
            .always(function(){Routine.hideLoader();})
            .error(function(response){$.jGrowl('Ошибка сервера! Сервер не доступен.', { 'themeState':'growl-error', 'sticky':false, life: 5000 });});
            return xhr;
        }
    });


    ///------------------------------------------------------------------------------------------------------------------------------------
    /// Views--------------------------------------------------------------------------------------------------------------------------
    ///------------------------------------------------------------------------------------------------------------------------------------
    ///
    ///FIND VIEW
    ///
    App.Views.FindView = Backbone.View.extend({
        el: $("#find-order-form"),
        events:{
            'click #find-by-order-number': 'findOrders',
            'keyup :input': 'findOrdersKey',
            'keypress :input': 'findOrdersKey',
            'click .btn-excel':'onExcelDownload'
        },
        initialize: function(){
            this.$('#order-number').focus();
            App.WorkOrders = new App.Collections.WorkCollection();
            App.OrderListView = new App.Views.OrderListView({collection: App.WorkOrders});
        },
        findOrdersKey:function(e){
            if ( e.which === 13 ){
                this.findOrders();
            }
        },
        findOrders:function(){
            var order_number = this.$('#order-number').val();
            if (!order_number || order_number == '')
                return;
            var self = this;
            App.CurrentOrder = null;
            App.CurrentOrder = new App.Models.ProductionOrderModel({parse: true});
            Routine.showLoader();
            setTimeout( function(){
                App.CurrentOrder.fetch({data: {'number': order_number}}).done(function(){
                    App.ProductInfoView  = new App.Views.ProductInfoView({model: App.CurrentOrder.get('product') });                    
                    App.OrderListView.render(App.CurrentOrder.get('work_orders'));
                    if(App.CurrentOrder.get('work_orders') && App.CurrentOrder.get('work_orders').length>0)
                        self.$(".btn-excel").show();
                    else
                        self.$(".btn-excel").hide();

                }).always(function(){setTimeout( function(){Routine.hideLoader();},500) });
            },300);
        },
        onExcelDownload:function(){
            var self  = this;
            $('body').css('cursor', 'wait');
            self.$('.btn-excel').css('cursor', 'wait');            
            window.location = '/handlers/newworkorder_excel/'+App.CurrentOrder.get("number");
            setTimeout(function(){$('body').css('cursor', 'default'); self.$('.btn-excel').css('cursor', 'pointer');}, 2000);
        }
    });

    ///
    /// ProductInfoView
    ///
    App.Views.ProductInfoView = Backbone.View.extend({
        el: '#product-info',
        initialize:function(){
            this.template = _.template($('#ProductInfoTemplate').html());
            this.render();
        },
        render:function(){
            if(this.model)
                this.$el.html(this.template(this.model.toJSON()));
            else
                this.$el.empty().html('');
        }
    });

    ///
    /// OrderListView
    ///
    App.Views.OrderListView = Backbone.View.extend({
        el: '#order-list',
        events:{
            'change #data-is-right':'dataOk',
            'click #save-data': 'saveData',
            'click #cancel-edit': 'cancelData',
            'click #replace-data': 'replaceDataDialog'
        },
        initialize:function(){
            this.$el.html('<div class="span12"><span>Введите номер задания для ввода плановых дат.</span></div>');
            this.header_template = _.template($('#WorkListHeaderTemplate').html());
            this.footer_template = _.template($('#WorkListFooterTemplate').html());
        },
        cancelData:function(){
            this.render();
        },
        render:function(collection){
            this.collection = collection;
            var self = this;
            this.$el.empty().html('');
            if (!self.collection || self.collection.models.length == 0){
                this.$el.html('<div class="span12"><span>Задание не найдено.</span></div>');
                return;
            }
            this.$el.append(this.header_template());
            _.each(self.collection.models, function (item) {
                item.set({'shifted':''});
                self.renderReg(item.get('sector'));
                self.renderOrder(item);
                _.each(item.get('items').models, function(pw) {
                    pw.set({'checked':false});
                    try{
                        pw.get('plan_shifts').date_change = '';
                    }catch(err){}
                    self.renderWork(pw);
                });

            }, this);
            this.$el.append(this.footer_template());
            return this;
        },
        renderReg:function(item){
            var view = new App.Views.OrderItemView({model: item});
            this.$el.append(view.render().el);
            return view;
        },
        renderOrder:function(item){
            var view = new App.Views.WorkOrderItemView({model: item});
            this.$el.append(view.render().el);
            return view;
        },
        renderWork:function(item){
            var view = new App.Views.WorkPlanItemView({model: item});
            this.$el.append(view.render().el);
            return view;
        },
        dataOk: function(){
            if (this.$('#data-is-right').prop('checked')){
                this.$('#save-data').prop({'disabled':false});
                this.$('#replace-data').prop({'disabled':false});
            }
            else{
                this.$('#save-data').prop({'disabled':true});
                this.$('#replace-data').prop({'disabled':true});
            }
        },
        saveData:function(){
            // Проверка всех дат работ.
            var self = this;
            have_wrong_dates = false;
            have_wrong_finish_dates = false;
            have_only_one_date = false;
            _.each(self.collection.models, function (item) {
                var workorders_cnt = 0;
                _.each(item.get('items').models, function(pw) {
                    try{
                        if (pw.get('date_start') !=null && pw.get('date_finish')!=null)
                        {
                            curDateStart = (pw.get('date_start_with_shift')!=null)? new Date( Routine.parseDate(pw.get('date_start_with_shift'))): new Date(Routine.parseDate(pw.get('date_start'),'dd.mm.yyyy')) ;
                            curDateFinish = (pw.get('date_finish_with_shift')!=null)? new Date(Routine.parseDate(pw.get('date_finish_with_shift'))) : new Date(Routine.parseDate(pw.get('date_finish'),'dd.mm.yyyy')) ;
                             if(curDateStart>curDateFinish)
                                    have_wrong_dates = true;
                        }
                        else if((pw.get('date_start') !=null && pw.get('date_finish')==null) || (pw.get('date_start') ==null && pw.get('date_finish')!=null))
                            have_only_one_date = true;
                    }
                    catch(err){}
                });

            }, this);

            if(have_wrong_dates)
            {
                $.jGrowl('По некоторым работам, дата начала работ превышает дату окончания. Проверьте даты и повторите попытку.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
                return;
            }
            if(have_only_one_date)
            {
                $.jGrowl('Для некоторых работ задана только дата начала. Необходимо заполнить обе даты.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
                return;
            }

            // сохранение данных
            App.CurrentOrder.save().done(function(result){
                App.CurrentOrder.fetch({data: {'number': App.CurrentOrder.get('number')}}).done(function(){
                   App.ProductInfoView  = new App.Views.ProductInfoView({model: App.CurrentOrder.get('product') });
                   App.OrderListView.render(App.CurrentOrder.get('work_orders'));
               });
            });
            // this.collection.save();
            $('.date-edit').removeClass('datepicker1').removeClass('datepicker2').datepicker('remove');
        },
        replaceDataDialog:function(){
            if ($('.work-plan-check:checked').length == 0){
                $.jGrowl('Выберите данные для переноса.', { 'themeState':'growl-error', 'sticky':false });
                return;
            }
            new App.Views.TransferFormView({collection: App.CurrentOrder.get('work_orders')});
            $('#transfer-modal').modal('show');
        }
    });

    ///
    /// TransferFormView
    ///
    App.Views.TransferFormView = Backbone.View.extend({
        el:'#transfer-modal',
        worksToTransferCount: 0,
        start_date: null,
        finish_date: null,
        events:{
            'click .close-dialog': 'closeDialog',
            'click .transfer-data': 'transferData',
            'change #transfer-reason': 'changeTransferReason',
            'change #transfer-type': 'changeTransferType'
        },
        initialize:function(){
            this.worksToTransferCount = 0;
            this.start_date=null;
            this.finish_date= null;
            this.template = _.template($('#TransferTemplate').html());
            this.render();
            this.$('#day-num').numeric();
        },
        render:function(){
            var self = this;
            var start_date = null;
            var finish_date = null;
            // сбор данных об отмеченных на перенос работах
            _.each(self.collection.models, function (item) {
               _.each(item.get('items').models, function(pw) {
                            if (pw.get('checked') && pw.get('date_start') !=null && pw.get('date_finish')!=null)
                            {
                                var tmp_start_date = (pw.get('date_start_with_shift'))?Routine.parseDate(pw.get('date_start_with_shift'),'dd.mm.yyyy'):Routine.parseDate(pw.get('date_start'),'dd.mm.yyyy');
                                if(!start_date || start_date>tmp_start_date)
                                    start_date = tmp_start_date;
                                var tmp_finish_date = (pw.get('date_finish_with_shift'))?Routine.parseDate(pw.get('date_finish_with_shift'),'dd.mm.yyyy'):Routine.parseDate(pw.get('date_finish'),'dd.mm.yyyy');
                                if(!finish_date || finish_date<tmp_finish_date)
                                    finish_date = tmp_finish_date;
                                self.worksToTransferCount++;
                            }
                    });
            });

            self.start_date = start_date;
            self.finish_date = finish_date;

            // отображение формы
            this.$(".row-type-comment-start").hide();
            this.$el.html(this.template());

            // подключение календарей
            var nowTemp = new Date();
            var now = new Date(nowTemp.getFullYear(), nowTemp.getMonth(), nowTemp.getDate(), 0, 0, 0, 0);
            // дата начала
            this.$('.datepicker1').val(start_date.format("dd.mm.yyyy") );
            var checkin = this.$('.datepicker1').datepicker({
                format:'dd.mm.yyyy',
                weekStart:1,
                onRender: function(date) {
                     return date.valueOf() < now.valueOf() /*|| date.valueOf() >((checkout)?checkout.date.valueOf():finish_date.valueOf())*/ ? 'disabled' : '';
                }
                }).on('changeDate', function(ev) {
                        var newDate = new Date(ev.date)
            }).data('datepicker');

            // дата окончания
            this.$('.datepicker2').val(finish_date.format("dd.mm.yyyy") );
            var checkout = this.$('.datepicker2').datepicker({
                format:'dd.mm.yyyy',
                weekStart:1,
                onRender: function(date) {
                    return date.valueOf() <= checkin.date.valueOf() ? 'disabled' : '';
                }
            }).on('changeDate', function(ev) {
            }).data('datepicker');

            // навешивание события на сокрытие формы
            var self = this;
            this.$el.on('hidden', function () {
                self.$el.empty().html();
                self.undelegateEvents();
                self.$el.removeData().unbind();
            });
            return this;
        },
        closeDialog: function(){
            this.$el.modal('hide');
        },

        /**
         * Событие смены типа переноса дат
        **/
        changeTransferType: function(e)
        {
            this.$(".row-type-comment-start").hide();
            this.$(".row-type-date-start").hide();
            this.$(".row-type-date-finish").hide();

            if(this.$("#transfer-type").val()=='start')
            {
                if(this.worksToTransferCount>1)
                    this.$(".row-type-comment-start").show();
                this.$(".row-type-date-start").show();
                this.$(".row-type-date-finish").hide();
            }
            else if(this.$("#transfer-type").val()=='both')
            {
                if(this.worksToTransferCount>1)
                {
                    this.$("#transfer-type").val("").change();
                    $.jGrowl('Изменение длительности возможно только для каждой работы отдельно.', { 'themeState':'growl-error', 'sticky':false });
                    return;
                }
                this.$(".row-type-date-start").show();
                this.$(".row-type-date-finish").show();
            }
        },

        changeTransferReason: function(e)
        {
            if(
                this.$('#transfer-reason').val()==App.PlanShiftReasonSystemObjects['ANOTHER_WORK'] ||
                this.$('#transfer-reason').val()==App.PlanShiftReasonSystemObjects['NOT_PLAN_WORK'] ||
                this.$('#transfer-reason').val()==App.PlanShiftReasonSystemObjects['PLAN_WORK']
            )
            {
                this.$('.row-transfer-reason-detail').show();
            }
            else{
                this.$('.row-transfer-reason-detail').hide();
            }
        },

        transferData: function(){
            var self = this;
            var need_comment = false;
            var data_to_check = []; // список нарядов уточнений причин переноса
            var reason_nodes = []; // список нарядов уточнений причин переноса в формате на сохранение
            // новая дата начала
            var new_date_start = Routine.parseDate(this.$('.datepicker1').val(),'dd.mm.yyyy');
            // новая дата окончания
            var new_date_finish = Routine.parseDate(this.$('.datepicker2').val(),'dd.mm.yyyy');

            // вычисление смещения в количествах дней от первоначальных минимальных и максимальных дат
            var start_shift_global = Routine.daysDiff(new_date_start, self.start_date);
            var finish_shift_global = Routine.daysDiff(new_date_finish, self.finish_date);
            //start_shift_global = (start_shift_global>0)?start_shift_global-1:start_shift_global+1
            //finish_shift_global = (finish_shift_global>0)?finish_shift_global-1:finish_shift_global+1

            if (this.$('#transfer-type').val() ==''){
                 $.jGrowl('Выберите тип корректировки.', { 'themeState':'growl-error', 'sticky':false });
                return;
            }
            if (this.$('#transfer-reason').val() == '0'){
                 $.jGrowl('Выберите причину корректировки.', { 'themeState':'growl-error', 'sticky':false });
                return;
            }
            // если изменение длительности дат, то проверяем, чтобы дата начала не превышала дату окончания
            if(this.$("#transfer-type").val()=='both')
            {
                if(new_date_start>new_date_finish)
                {
                     $.jGrowl('Дата начала не может превышать дату окончания.', { 'themeState':'growl-error', 'sticky':false });
                    return;
                }
            }

            // если в причине корректировки задано: "Другое", то комментарий обязателен
            if(this.$('#transfer-reason').val()==App.PlanShiftReasonSystemObjects['OTHER'] && this.$('#transfer-comment').val()=="")
            {
                $.jGrowl('Для причины: "Другое", комментарий обязателен для заполнения.', { 'themeState':'growl-error', 'sticky':false });
                return;
            }

            // если в причине корректировки задан - перенос
            if(
                this.$('#transfer-reason').val()==App.PlanShiftReasonSystemObjects['ANOTHER_WORK'] ||
                this.$('#transfer-reason').val()==App.PlanShiftReasonSystemObjects['NOT_PLAN_WORK'] ||
                this.$('#transfer-reason').val()==App.PlanShiftReasonSystemObjects['PLAN_WORK']
            )
            {
                if(!this.$('#transfer-reason-detail').val())
                {
                    $.jGrowl('Заполните уточнение причины корректировки.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
                    return;
                }
                var tmp = this.$('#transfer-reason-detail').val().replace(/\s+/g, '').split(',');
                for(var i in tmp)
                {
                    var i_tmp = tmp[i].split('/');
                    if(i_tmp.length>1)
                    {
                        if(!Routine.strToInt(i_tmp[0]) || !Routine.strToInt(i_tmp[1]))
                        {
                            $.jGrowl('Ошибка формата уточнения к причине переноса. Убедитесь что все указанные наряды и работы корректны.', { 'themeState':'growl-error', 'sticky':false });
                            return;
                        }
                        data_to_check.push({
                            'workorder_number': Routine.strToInt(i_tmp[0]),
                            'work_code': Routine.strToInt(i_tmp[1])
                        })
                        reason_nodes.push([Routine.strToInt(i_tmp[0]), Routine.strToInt(i_tmp[1])]);
                    }
                    else
                    {
                        if(!Routine.strToInt(i_tmp[0]))
                        {
                            $.jGrowl('Ошибка формата уточнения к причине переноса.  Убедитесь что все указанные наряды и работы корректны.', { 'themeState':'growl-error', 'sticky':false });
                            return;
                        }
                        data_to_check.push({
                            'workorder_number': Routine.strToInt(i_tmp[0]),
                            'work_code': null
                        })
                        reason_nodes.push([Routine.strToInt(i_tmp[0])]);
                    }
                }
            }

            // сбор переносов
            have_wrong_dates = false;
            have_wrong_finish_dates = false;
            have_only_one_date = false;
            var self = this;

            var workorders_cnt = 0;
            _.each(self.collection.models, function (item) {
                var works_cnt = 0;
                _.each(item.get('items').models, function(pw) {
                    try
                    {
                            if (pw.get('checked') && pw.get('date_start') !=null && pw.get('date_finish')!=null)
                            {
                                curDateStart = (pw.get('date_start_with_shift')!=null)? new Date( Routine.parseDate(pw.get('date_start_with_shift'))): new Date(Routine.parseDate(pw.get('date_start'),'dd.mm.yyyy'));
                                curDateFinish = (pw.get('date_finish_with_shift')!=null)? new Date(Routine.parseDate(pw.get('date_finish_with_shift'))) : new Date(Routine.parseDate(pw.get('date_finish'),'dd.mm.yyyy'));

                                // если идет перенос без изменения длительности
                                if(self.$('#transfer-type').val()=="start")
                                {
                                    // вычисление количества дней на которе необходимо выполнить перенос дат
                                    var shift = start_shift_global;
                                    curDateFinish.setDate(curDateFinish.getDate() + shift);
                                    // если после переноса, дата окончания все равно меньше текущей даты на календаре,
                                    // необходимо выдать пользователю предупреждение
                                    var nowTemp = new Date();
                                    var nowDate = new Date(nowTemp.getFullYear(), nowTemp.getMonth(), nowTemp.getDate(), 0, 0, 0, 0);
                                    if(curDateFinish < nowDate)
                                        have_wrong_finish_dates = true;
                                    var plan_shift = {
                                        'reason_id': self.$('#transfer-reason').val(),
                                        'reason': self.$('#transfer-reason :selected').text(),
                                        'shift': shift,
                                        'note': self.$('#transfer-comment').val(),
                                        'type': "both",
                                        'date_change':'new',
                                        'reason_nodes': reason_nodes //this.$('#transfer-reason-detail').val().replace(/\s+/g, '')
                                    };
                                    pw.set('plan_shifts', [plan_shift]);
                                }
                                else
                                {
                                    // если идет изменение длительности
                                    var start_shift = Routine.daysDiff(new_date_start, curDateStart);
                                    var finish_shift = Routine.daysDiff(new_date_finish, curDateFinish);
                                    curDateStart.setDate(curDateStart.getDate() + start_shift);
                                    curDateFinish.setDate(curDateFinish.getDate() + finish_shift);

                                    if(curDateStart>curDateFinish)
                                        have_wrong_dates = true;

                                    // если после переноса, дата окончания все равно меньше текущей даты на календаре,
                                    // необходимо выдать пользователю предупреждение
                                    var nowTemp = new Date();
                                    var nowDate = new Date(nowTemp.getFullYear(), nowTemp.getMonth(), nowTemp.getDate(), 0, 0, 0, 0);
                                    if(curDateFinish < nowDate)
                                        have_wrong_finish_dates = true;
                                    var shifts = [];

                                    if(start_shift!=0)
                                    {
                                        var plan_shift_start = {
                                            'reason_id': self.$('#transfer-reason').val(),
                                            'reason': self.$('#transfer-reason :selected').text(),
                                            'shift': start_shift,
                                            'note': self.$('#transfer-comment').val(),
                                            'type': "start",
                                            'date_change':'new',
                                            'reason_nodes': reason_nodes //this.$('#transfer-reason-detail').val().replace(/\s+/g, '')
                                        };
                                        shifts.push(plan_shift_start);
                                    }
                                    if(finish_shift!=0)
                                    {
                                        var plan_shift_finish = {
                                            'reason_id': self.$('#transfer-reason').val(),
                                            'reason': self.$('#transfer-reason :selected').text(),
                                            'shift': finish_shift,
                                            'note': self.$('#transfer-comment').val(),
                                            'type': "finish",
                                            'date_change':'new',
                                            'reason_nodes': reason_nodes //this.$('#transfer-reason-detail').val().replace(/\s+/g, '')
                                        };
                                        shifts.push(plan_shift_finish);
                                    }

                                    if(shifts.length>0)
                                        pw.set('plan_shifts', shifts);
                                }
                                works_cnt++;
                            }
                            else if(pw.get('checked') && ((pw.get('date_start') !=null && pw.get('date_finish')==null) || (pw.get('date_start') ==null && pw.get('date_finish')!=null)))
                                have_only_one_date = true;
                    }
                    catch(err){}
                });
                if (item.get('items').models.length == works_cnt){
                        item.set('shifted', 'shifted');
                        workorders_cnt++;
                }
            }, this);
            //if(workorders_cnt == self.collection.get('work_orders').models.length){
            //            item.set('shifted', 'shifted');
            //}

            // проверка корректности заполненных параметров переноса
            if(have_wrong_dates)
            {
                $.jGrowl('По некоторым работам, после выполнения процедуры переноса, дата начала работ будет превышать дату окончания. Проверьте даты и повторите попытку.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
                return;
            }
            if(have_wrong_finish_dates)
            {
                $.jGrowl('Ошибка переноса дат. Одна или несколько работ имеют дату окончания меньше текущей.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
                return;
            }
            if(have_only_one_date)
            {
                $.jGrowl('Для некоторых работ задана только дата начала. Необходимо заполнить обе даты.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
                return;
            }

            //  проверка на корректность пояснения к причине переноса
            if(
                this.$('#transfer-reason').val()==App.PlanShiftReasonSystemObjects['ANOTHER_WORK'] ||
                this.$('#transfer-reason').val()==App.PlanShiftReasonSystemObjects['NOT_PLAN_WORK'] ||
                this.$('#transfer-reason').val()==App.PlanShiftReasonSystemObjects['PLAN_WORK']
            )
            {
                Routine.showLoader();
                $.ajax({
                        type: "POST",
                        url: "/handlers/newworkorder/check_reason_note_format",
                        data: JSON.stringify({'data': data_to_check, 'reason': self.$('#transfer-reason').val()} ),
                        timeout: 55000,
                        contentType: 'application/json',
                        dataType: 'json',
                        async:true
                        }).done(function(result) {
                            Routine.hideLoader()
                            if(result['status']=="error")
                            {
                                $.jGrowl(result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 10000 });
                            }
                            else
                            {
                                // сохранение данных
                                App.CurrentOrder.save().done(function(result){
                                    self.closeDialog();
                                    App.CurrentOrder.fetch({data: {'number': App.CurrentOrder.get('number')}}).done(function(){
                                       App.ProductInfoView  = new App.Views.ProductInfoView({model: App.CurrentOrder.get('product') });
                                       App.OrderListView.render(App.CurrentOrder.get('work_orders'));
                                   });
                                });
                            }
                        })
                        .error(function(){
                            $.jGrowl('Ошибка проверки формата уточнения к причине переноса. ', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
                            Routine.hideLoader()
                        }).always(function(){
                });
            }
            else
            {
                // сохранение данных
                App.CurrentOrder.save().done(function(result){
                            //App.CurrentOrder = result.result;
                            self.closeDialog();
                            App.CurrentOrder.fetch({data: {'number': App.CurrentOrder.get('number')}}).done(function(){
                               App.ProductInfoView  = new App.Views.ProductInfoView({model: App.CurrentOrder.get('product') });
                               App.OrderListView.render(App.CurrentOrder.get('work_orders'));
                           });
                });
            }
        }
    });

    ///
    /// WorkPlanItemView
    ///
    App.Views.WorkPlanItemView = Backbone.View.extend({
        tagName:'div',
        className: 'plan-row item',
        checkin: null,
        checkout: null,
        events:{
            'click .work-plan-check': 'checkForReplace',
            'change .work-plan-check': 'changeForReplace',
            'click .lock-item':'onLockItem',
            'change .lock-item':'onLockChanged',
            'change .tb-days-count': 'onDaysCountChange',
        },
        initialize:function(){
            this.template = _.template($('#WorkPlanItemTemplate').html());
        },

        /**
        * Обработка события смены количества дней на выполнение работы
        **/
        onDaysCountChange: function()
        {
            this.model.set('days_count', Routine.strToInt(this.$('.tb-days-count').val()));
            // пересчет финальной даты относительно начальной и количества дней
            if (this.model.get('date_start')){
                var newDate = new Date(moment(this.model.get('date_start'),'DD.MM.YYYY'));
                newDate.setDate(newDate.getDate() +  this.model.get('days_count') +1) ;
                this.model.set('date_finish',moment(newDate).format('DD.MM.YYYY'));
                this.checkout.setValue(newDate);
            }
        },
        render:function(){
            var self = this;
            this.$el.html(this.template(this.model.toJSON()));
            this.$el.find('.tb-days-count').numeric({ decimal: false,negative: false});
            if (typeof this.model.get('plan_shifts') !== 'undefined'){
                this.$('.work-name').append('<span>*</span>')
            }
            var nowTemp = new Date();
            var now = new Date(nowTemp.getFullYear(), nowTemp.getMonth(), nowTemp.getDate(), 0, 0, 0, 0);
            if (this.model.get('date_start')){
                this.$('.datepicker1').removeClass('datepicker1');
                this.$('.datepicker2').removeClass('datepicker2');
                // если не задано количество дней, то вычисляем его через даты
                this.$el.find('.tb-days-count').prop("disabled", true);
                var tmp = moment(this.model.get('date_start'));
                if(!this.model.get('days_count') ||  Routine.strToInt(this.model.get('days_count')) ==0)
                     this.$('.tb-days-count').val( moment(this.model.get('date_finish_with_shift'),'DD.MM.YYYY').diff(moment(this.model.get('date_start_with_shift'),'DD.MM.YYYY'),'days')+1);

            }
            var days_count = false;

            if (typeof this.model.get('days_count') !== 'undefined' && this.model.get('days_count')>0){
                days_count = true;
                this.$('.datepicker2').removeClass('datepicker2');
            }

            self.checkin = this.$('.datepicker1').datepicker({
                format:'dd.mm.yyyy',
                weekStart:1,
                onRender: function(date) {
                     return date.valueOf() < now.valueOf() ? 'disabled' : '';
                }
                }).on('changeDate', function(ev) {
                        var newDate = new Date(ev.date)
                        self.$('.datepicker1').addClass('date-edit');
                        self.model.set('date_start',moment(ev.date).format('DD.MM.YYYY'));
                        self.checkin.hide();
                        //console.log(days_count);
                        if (self.model.get('days_count') && self.model.get('days_count')>0){
                            newDate.setDate(newDate.getDate() + self.model.get('days_count')-1);
                            self.$('.datefinish').val(moment(newDate).format('DD.MM.YYYY'));
                            self.model.set('date_finish',moment(newDate).format('DD.MM.YYYY'));
                        }
                        else{
                            newDate.setDate(newDate.getDate() + 1);
                            self.model.set('date_finish',moment(newDate).format('DD.MM.YYYY'));
                            self.checkout.setValue(newDate);
                            self.$('.datepicker2')[0].focus();
                        }
            }).data('datepicker');
            self.checkout = this.$('.datepicker2').datepicker({
                format:'dd.mm.yyyy',
                weekStart:1,
                onRender: function(date) {
                return date.valueOf() <= self.checkin.date.valueOf() ? 'disabled' : '';
              }
            }).on('changeDate', function(ev) {
                self.model.set('date_finish',moment(ev.date).format('DD.MM.YYYY'));
                self.$('.datepicker2').addClass('date-edit');
                self.checkout.hide();
                self.$('.tb-days-count').val( moment(self.model.get('date_finish'),'DD.MM.YYYY').diff(moment(self.model.get('date_start'),'DD.MM.YYYY'),'days')+1);
            }).data('datepicker');

            // лочить, если работа завершена
            if((this.model.has('status') && this.model.get('status') == 'completed') || (this.model.get('locked')) )
            {
                this.$el.find('input, textarea, button, select').prop("disabled", true);
            }
            return this;
        },
        changeForReplace: function(){
            var checked = false;
            if (this.$('.work-plan-check').prop('checked')){
                checked = true;
            }
            this.model.set('checked', checked);
        },
        checkForReplace: function(){
            var checked = false;
            if (this.$('.work-plan-check').prop('checked')){
                checked = true;
            }
            if (!checked){
                var reg = this.$el.prevAll( ".region").first();
                var ord = this.$el.prevAll( ".order-row").first();
                $('input[type=checkbox]', reg).prop('checked', checked).change();
                $('input[type=checkbox]', ord).prop('checked', checked).change();

            }
        },
        changeForReplace: function(){
            var checked = false;
            if (this.$('.work-plan-check').prop('checked')){
                checked = true;
            }
            this.model.set('checked', checked);
        },
        onLockItem:function(e){
            var locked =false;
            if($(e.currentTarget).find("i").hasClass("fa-unlock"))
                locked = true;
            $(e.currentTarget).find("i").removeClass("fa-lock").removeClass("fa-unlock").addClass(locked?'fa-lock':'fa-unlock');
            $(e.currentTarget).trigger("change");
        },
        onLockChanged:function(e){
            var locked =false;
            if($(e.currentTarget).find("i").hasClass("fa-lock"))
                locked = true;
            this.model.set("locked",locked);
            this.render();
        }
    });

    ///
    /// WorkOrderItemView
    ///
    App.Views.WorkOrderItemView = Backbone.View.extend({
        tagName:'div',
        className: 'order-row item',
        events:{
            'click .work-check': 'checkForReplace',
            'click .lock-item':'onLockItem',
            'change .lock-item':'onLockChange'
        },
        initialize:function(){
            this.template = _.template($('#WorkOrderItemTemplate').html());
        },
        render:function(){
            this.$el.html(this.template(this.model.toJSON()));
            return this;
        },
        checkForReplace: function(){
            var checked = false;
            if (this.$('.work-check').prop('checked')){
                checked = true;
            }
            this.$el.nextUntil( ".region, .order-row", 'div.item' ).each(function(){
                $('input[type=checkbox]', this).prop('checked', checked).change();
            });
        },
        onLockItem:function(e){
            var locked =false;
            if($(e.currentTarget).find("i").hasClass("fa-unlock"))
                locked = true;
            $(e.currentTarget).find("i").removeClass("fa-lock").removeClass("fa-unlock").addClass(locked?'fa-lock':'fa-unlock');
            this.$el.nextUntil( ".region, .order-row", 'div.item' ).each(function(){
                $(".lock-item i",this).removeClass("fa-lock").removeClass("fa-unlock").addClass(locked?'fa-lock':'fa-unlock');
                $(".lock-item",this).trigger("change");
            });
            $(e.currentTarget).trigger("change");
        },
        onLockChange:function(e){
            var locked =false;
            if($(e.currentTarget).find("i").hasClass("fa-lock"))
                locked = true;
            this.model.set("locked",locked);
            this.render();
        }
    });

    ///
    /// OrderItemView
    ///
    App.Views.OrderItemView = Backbone.View.extend({
        tagName:'div',
        className: 'region',
        events:{
            'click .work-item-check': 'checkForReplace',
            'click .lock-item':'onLockItem'
        },
        initialize:function(){
            this.template = _.template($('#WorkItemTemplate').html());
        },
        render:function(){
            this.$el.html(this.template(this.model.toJSON()));
            // this.$('.datestart').datepicker({format:'dd.mm.yyyy'});
            return this;
        },
        checkForReplace: function(){
            var checked = false;
            if (this.$('.work-item-check').prop('checked')){
                checked = true;
            }
            this.$el.nextUntil( ".region", 'div.item' ).each(function(){
                $('input[type=checkbox]:enabled', this).prop('checked', checked).change();
            });
        },
        onLockItem:function(e){
            var locked =false;
            if($(e.currentTarget).find("i").hasClass("fa-unlock"))
                locked = true;
            $(e.currentTarget).find("i").removeClass("fa-lock").removeClass("fa-unlock").addClass(locked?'fa-lock':'fa-unlock');
            var self = this;
            this.$el.nextUntil( ".region", 'div.item' ).each(function(){
                $(".lock-item i",this).removeClass("fa-lock").removeClass("fa-unlock").addClass(locked?'fa-lock':'fa-unlock');
                $(".lock-item",this).trigger("change");
                self.model.set("locked",locked);
            });
            this.render();
        }
    });

//      return App;
// });
