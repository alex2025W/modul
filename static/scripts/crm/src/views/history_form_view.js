var historyTableTemplate = require('../templates/history_table_template.html');
var historyTableItemTemplate = require('../templates/history_table_item_template.html');
var Routine = require('../utils/routine.js');
var HistoryModel = require('../models/history_model');
var TaskModel = require('../models/task_model');
var ContactCollection = require('../collections/contact_collection');
    /**
    * история
    */
    var HistoryFormView = Backbone.View.extend({
        laststat:'',
        lastchance:0,
        lastagree:false,
        chancegree:false,
        events:{
            'click .save-history': 'saveHistory',
            'click .close-history,.close-history-any': 'closeModal',
            'click .save-history-ok': 'saveHistoryOk',
            'click .edit-comment': 'editComment',
            'click .add-comment': 'addComment',
            'click .save-history-cancel': 'saveHistoryCancel',
            'click .check-price-ok': 'priceOk',
            'click .check-price-cancel': 'priceCancel',
            'click .cb-noclose-date': 'clickNoCloseDate',
            'click .cb-nofinish-date': 'clickNoFinishDate',
            'click .cb-confirmed-by-client': 'clickConfirmedByClient',
            'click .cb-finish--confirmed-by-client': 'clickFinishConfirmedByClient',
            'change .condition-select': 'conditionChange',
            'click .refresh-contacts': 'updateContacts',
            //--------------------------------------------------------------------------------------
            'updateContactsComplete': 'updateContactsComplete',
            'click .contract-link-block input[name=contract-link-vaiant]':'onContractLinkChange'
        },
        initialize:function(){
            var self = this;
            this.template = historyTableTemplate;
            if (this.model.get('id') != ''){
                this.model.fetch({timeout:50000}).complete(function(){
                    self.render();
                });
            }
            else{
                self.render();
            }
            var fr = Backbone.history.fragment;
            window.app_router.navigate(fr+'/history/'+ this.model.get('id'));
            this.conditionChange();
        },
        conditionChange: function(){
            if (this.$('.condition-select').val()==window.ORDER_CONDITIONS['REFUSE']){
                this.$('.otkaz-block').show();
            }
            else{
                this.$('.otkaz-block').hide();
            }
            if (this.$('.condition-select').val()==window.ORDER_CONDITIONS['EXAMINE']){
                this.$('.review-block').show();
            }
            else{
                this.$('.review-block').hide();
            }
             if (this.$('.condition-select').val()==window.ORDER_CONDITIONS['INTEREST']){
                this.$('.interes-block').show();
            }
            else{
                this.$('.interes-block').hide();
            }
            if((this.$('.condition-select').val()==window.ORDER_CONDITIONS['CONTRACT_PREPARE'] || this.$('.condition-select').val()==window.ORDER_CONDITIONS['CONTRACT_AGREEMENT'] || this.$('.condition-select').val()==window.ORDER_CONDITIONS['CONTRACT_TO_SIGN'] || this.$('.condition-select').val()==window.ORDER_CONDITIONS['CONTRACT_SIGN']) && (!this.model.get('contracts') || this.model.get('contracts').length==0) ){
                this.$('.contract-link-block').show();
            }else
                this.$('.contract-link-block').hide();
        },
        onContractLinkChange:function(el){
        //     if(this.$(".contract-link-block input[name=contract-link-vaiant]:checked").val()=='choose')
        //         this.$('.contract-link-block .contract-number-block').removeClass('hide');
        //     else
        //         this.$('.contract-link-block .contract-number-block').addClass('hide');
        },
        clickConfirmedByClient: function(el)
        {
            this.model.set('confirmed_by_client',$(el.target).is(':checked'));
        },

        clickFinishConfirmedByClient: function(el)
        {
            this.model.set('finish_confirmed_by_client',$(el.target).is(':checked'));
        },

        clickNoCloseDate: function(el)
        {
            var self = this;
            var cbNoCloseDate =$(el.target);
            if(!cbNoCloseDate.is(':checked'))
            {
                // активируем календарь и ставим ему последнюю дату состояния
                self.$('.close-date').show().val(this.model.get('last_close_date'));
                self.$('.change-close-date').show().datepicker('setValue', (self.model.get('last_close_date'))?Routine.parseDate(self.model.get('last_close_date'),'dd.mm.yyyy'):new Date());
                self.$('.lbl-confirmed-by-client').show().find('.cb-confirmed-by-client').prop("checked",false);
            }
            else
            {
                self.model.set('confirmed_by_client',false);
                self.$('.close-date').hide().val("");
                self.$('.change-close-date').hide();
                self.$('.lbl-confirmed-by-client').hide().find('.cb-confirmed-by-client').prop("checked",false);
            }
        },

        /**
         *  Событие - дата сдачи не определена
         */
        clickNoFinishDate: function(el)
        {
            var self = this;
            var cbNoFinishDate =$(el.target);
            if(!cbNoFinishDate.is(':checked'))
            {
                // активируем календарь и ставим ему последнюю дату состояния
                self.$('.finish-date').show().val(this.model.get('last_finish_date'));
                self.$('.change-finish-date').show().datepicker('setValue', (self.model.get('last_finish_date'))?Routine.parseDate(self.model.get('last_finish_date'),'dd.mm.yyyy'):new Date());
                self.$('.lbl-finish-confirmed-by-client').show().find('.cb-finish-confirmed-by-client').prop("checked",false);
            }
            else
            {
                self.$('.finish-date').hide().val("");
                self.$('.change-finish-date').hide();
                self.model.set('finish_confirmed_by_client',false);
                self.$('.lbl-finish-confirmed-by-client').hide().find('.cb-finish-confirmed-by-client').prop("checked",false);
            }
        },

        editComment:function(el){
            var prev = $(el.target).closest('div.history-comment-elem');

            var comment_id = prev.data("id");
            var arindex = $(el.target).closest(".history-table").find(".history-comment").index(($(el.target).closest('.history-comment')));


            var span = $('span.edit-comment-span', prev);
            var txt = Routine.brToRn(unescape(span.data('text')));
            prev.hide();

            var frm = $('<div></div>').addClass('edit-comment-pan');
            var tarea = $('<textarea></textarea>').addClass('edit-comment-textarea').val(txt);
            var self = this;
            App.initTextComplete(tarea, this.model);

            var btn_ok = $('<a></a>').addClass('btn btn-primary').text('Сохранить').on('click', function(){

                var hc = self.model.get('history');
                var txt = tarea.val()
                var comments = hc.models[arindex].get("comments");
                for(var i in comments)
                    if(comments[i]['_id']==comment_id){
                        comments[i].text = txt;
                        comments[i].date_changed=null;
                        break;
                    }
                /*hc.models[arindex].set({'comment':txt});
                hc.models[arindex].set({'datetime':hc.models[arindex].get('datetime')+'upd'});*/
                self.model.save().done(function(){
                   self.render();
                });
            });
            var btn_cancel = $('<a></a>').addClass('btn').text('Отмена').on('click', function(){
                frm.remove();
                prev.show();
            });
            frm.append(tarea).append('<br>').append(btn_ok).append(btn_cancel);
            prev.after(frm);

            // prev.html('<textarea>'+txt+'</textarea><br><a class="btn btn-primary" href="javascript:;">Сохранить</a>&nbsp;<a class="btn" href="javascript:;">Отмена</a>');
        },

        addComment:function(el){
            var btn = $(el.target);
            btn.hide();
            var arindex = $(el.target).closest(".history-table").find(".history-comment").index(($(el.target).closest('.history-comment')));

            var frm = $('<div></div>').addClass('edit-comment-pan');
            var tarea = $('<textarea></textarea>').addClass('edit-comment-textarea');
            App.initTextComplete(tarea, this.model);
            /*.overlay([
                    {
                        match: /\B@\w+/g,
                        css: {
                            'background-color': '#d8dfea'
                        }
                    }
                ]); */
            var self = this;
            var btn_ok = $('<a></a>').addClass('btn btn-primary').text('Сохранить').on('click', function(){

                var hc = self.model.get('history');
                var txt = tarea.val()
                var comments = hc.models[arindex].get("comments");
                comments.push({'text':txt});
                self.model.save().done(function(){
                   self.render();
                });
                btn.show();
            });
            var btn_cancel = $('<a></a>').addClass('btn').text('Отмена').on('click', function(){
                frm.remove();
                btn.show();
            });
            frm.append(tarea).append('<br>').append(btn_ok).append(btn_cancel);
            btn.after(frm);


        },

        updateContacts:function(){
            var self = this;
            $.get('/handlers/client_group/'+this.model.get('client_id')).done(function(ret){
                var data = $.parseJSON(ret);
                self.contact_list = data['contacts'];
                // посылаем событие, что обновление контактов завершено
                $(self.el).trigger('updateContactsComplete');

                if (data['contacts'] && data['contacts'].length >0){
                    var contacts = data['contacts'].map(function(item){
                        return {'name':item['fio'],
                                'client_name':item['client_name'],
                                'client_id': item['client_id']};
                    });
                    var cur = self.$('.client-contacts').data('val');
                    if(self.$('.client-contacts')[0].selectize)
                        self.$('.client-contacts')[0].selectize.destroy();
                    var $sel = self.$('.client-contacts').selectize({
                        options: contacts,
                        valueField: 'name',
                        labelField: 'name',
                        searchField: 'name',
                        create: false,
                        render: {
                            item: function(item, escape) {
                                return "<div>" +
                                    (item.name ? '<span class="name">' + escape(item.name) + '</span>' : '')+
                                '</div>';
                            },
                            option: function(item, escape) {
                                var result = '<div ' +
                                             'class="select-item"' +
                                             'data-client-id="' + item.client_id + '" ' +
                                             'data-client-name="' + item.client_name + '">' +
                                             '<b class="select-item-title">' + escape(item.name) + '</b><br>';
                                if (item.client_name != undefined)
                                    result += '<small class="select-item-note"><i>'+item.client_name+'</i></small>';
                                result += '</div>';
                                return result
                            }
                        }
                    });
                    $sel[0].selectize.setValue(cur);
                }
            });
        },

        /**
        ** Событие окончания обновления контактов
        **/
        updateContactsComplete: function()
        {
            var self = this;
            //-----------------------------------------------------------------------------------------------------------------------------------------------------------------------
           //  добавление всплывающих контактов при вводе коментария
            // чтобы вызвать контакты, нужно нажать на кнопку +
            App.initTextComplete(this.$('.comment-text'), this.model);
            //-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
        },

        render:function(){
            this.$el.find(".history-data").html(this.template(this.model.toJSON()));
//            this.$el.html(this.template(this.model.toJSON()));
            var self = this;
            this.updateContacts();
/*            this.$('.dogovor-number').keydown(function (e) {
                // Allow: backspace, delete, tab, escape, enter and .
                if ($.inArray(e.keyCode, [46, 8, 9, 27, 13, 110, 188]) !== -1 ||
                     // Allow: Ctrl+A
                    (e.keyCode == 65 && e.ctrlKey === true) ||
                     // Allow: home, end, left, right
                    (e.keyCode >= 35 && e.keyCode <= 39)) {
                         // let it happen, don't do anything
                         return;
                }
                // Ensure that it is a number and stop the keypress
                if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
                    e.preventDefault();
                }
            });*/
            // if (this.model.get('closed') == 'yes'){
            //  this.$('.enter-history').hide();
            //  this.$('.save-history').hide();
            // }

            // сортировка колекции состояний истории
            var date_format = 'dd.mm.yyyy h:i:s';
            var __sortItems = function(a,b){
                if(Routine.parseDateTime(a.get('datetime'), date_format)>Routine.parseDateTime(b.get('datetime'), date_format))
                    return -1;
                if(Routine.parseDateTime(a.get('datetime'), date_format)<Routine.parseDateTime(b.get('datetime'), date_format))
                    return 1;
                return 0;
            }
            var hc = this.model.get('history');
            if(hc.models && hc.models.length>0)
                hc.models = hc.models.sort(__sortItems);

            _.each(hc.models, function(item){
                var ln =  historyTableItemTemplate;
                self.$('tbody').append(ln($.extend({}, item.toJSON(), {'number':self.model.get('number'), 'ALL_USERS': window.ALL_USERS})));
            });
            this.$el.on('hidden', function () {
                self.$el.find('history-data').empty().html();
                self.undelegateEvents();
                self.$el.removeData().unbind();
                var fr = Backbone.history.fragment;
                window.app_router.navigate(fr.replace('/history/'+ self.model.get('id'), ''));
            });
            var chval = 0;
            try{
                //chval = parseInt(hc.models[hc.length-1].get('chance'));
                chval = parseInt(hc.models[0].get('chance'));
                this.$('.chance-value').text(chval+' %');
                //this.laststat = hc.models[hc.length-1].get('condition');
                this.laststat = hc.models[0].get('condition');
                //this.lastchance = parseInt(hc.models[hc.length-1].get('chance'));
                this.lastchance = parseInt(hc.models[0].get('chance'));
            }
            catch(err){
                chval = 0;
            }


            this.$('.chance-slider').slider({value:chval}).on('slideStop', function(ev){
                var v = ev.value;
                if (v == 0){
                    self.$('.chance-value').text('Не определена');
                }
                else{
                    self.$('.chance-value').text(v+' %');
                }
            });
            if (hc.length == 0){
                this.$('.condition-select option:first').prop('selected', true);
            }
            else{
                //var hstcnd = hc.models[hc.length-1].get('condition');
                var hstcnd = hc.models[0].get('condition');
                var i = this.$('.condition-select option[value="'+hstcnd+'"]').index();
                if (i < this.$('.condition-select option').length-1){
                    i++;
                }
                this.$('.condition-select option').eq(i).prop('selected', true);
                this.conditionChange();
            }

            self.$('.change-close-date').datepicker({weekStart:1, orientation: "top right"}).datepicker('setValue', (self.model.get('last_close_date'))?Routine.parseDate(self.model.get('last_close_date'),'dd.mm.yyyy'):new Date())
            .on('changeDate', function(ev){
                self.$('.close-date').val(self.$('.change-close-date').data('date'));
                self.$('.change-close-date').datepicker('hide');

                if(self.model.get('confirmed_by_client'))
                    alert('Флаг подтверждения даты закрытия клиентом был снят.');
                self.$('.cb-confirmed-by-client').prop("checked",false);
                self.model.set('confirmed_by_client',false);
            });

            self.$('.change-finish-date').datepicker({weekStart:1, orientation: "top right"}).datepicker('setValue', (self.model.get('last_finish_date'))?Routine.parseDate(self.model.get('last_finish_date'),'dd.mm.yyyy'):new Date())
            .on('changeDate', function(ev){
                self.$('.finish-date').val(self.$('.change-finish-date').data('date'));
                self.$('.change-finish-date').datepicker('hide');
                if(self.model.get('finish-confirmed_by_client'))
                    alert('Флаг подтверждения даты сдачи был снят.');
                self.$('.cb-finish-confirmed-by-client').prop("checked",false);
                self.model.set('finish_confirmed_by_client',false);
            });

            if(this.options.quick){
                setTimeout(function() {
                    self.$('textarea.comment-text').focus();
                }, 0);
                this.$('input[value=they]').prop('checked', true);
            }
            this.$('.comment-text').keydown(function (e) {
                if (e.keyCode === 13 && e.ctrlKey === true){
                    self.saveHistory();
                }
            });


            // this.$(".contract-link-block .contract-number").tokenInput('/handlers/contracts/search_contract_forinput', {
            //     method:'POST',
            //     minChars:1,
            //     tokenValue:"_id",
            //     propertyToSearch:'number',
            //     jsonContainer:'result',
            //     hintText:'Поиск договора',
            //     noResultsText:'Договор не найден',
            //     searchingText:'Поиск',
            //     resultsLimit:15,
            //     tokenLimit:1,
            //     zindex:9999,
            //     onAdd: function(item){
            //         if(item.is_signed=='yes' && item.draft==false){
            //             $.jGrowl('Выбранный договор подписан. Нельзя привязать заявку к подписанному договору.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
            //         }
            //     },
            //     onDelete: function(){
            //     },
            //     resultsFormatter:function(item){
            //         item['number'] = ''+item['number'];
            //         item['cont']="";
            //         return '<li><p>' + item.number + '</p></li>';
            //     }
            // });

            return this;
        },

       /**
        ** Функция проверки статуса создания гугл папок для заявки
        **/
        checkGoogleDocStatus: function(is_new){
            is_new = is_new || false;
            var self = this;
            if(self.model.get('documents') && self.model.get('documents')['status'] == 'error')
                return;
            else if (!self.model.get('documents') || !self.model.get('documents')['status'])
                self.model.set({'documents': {'status':'in_process'}});
            $.ajax({
                type: "GET",
                url: "/handlers/crm/check_on_google_folder/"+ self.model.get('number').toString()+"/"+is_new,
                data: {},
                timeout: 55000,
                contentType: 'application/json',
                dataType: 'json',
                async:true
                }).done(function(result) {
                    self.hideLoader();
                    if(result['documents']['status'] =="ok" && self.model.get('documents')['status'] != 'ok')
                    {
                        self.model.set({'documents':  result['documents']});
                        if(MANAGER == result['documents']['manager'])
                            $.jGrowl('Для заявки №'+self.model.get('number').toString()+' на гугл диске создан каталог документов. Теперь вы можете перейти к нему, кликнув на ссылку - "Документы"', { 'themeState':'growl-success', 'sticky':false, life: 10000, 'position': 'bottom-right' });
                    }
                    if(self.model.get('documents')['status'] != 'error' && result['documents']['status'] =="error")
                    {
                        self.model.set({'documents':  result['documents']});
                        if(MANAGER == result['documents']['manager'])
                            $.jGrowl('Ошибка при создании каталога документов на гугл диске для заявки №'+self.model.get('number').toString()+'. Подробности: '+Routine.stripTags(self.model.get('documents')['note'])+'.', { 'themeState':'growl-error', 'sticky':false, life: 10000, 'position': 'bottom-right' });
                    }
                    else if (self.model.get('documents')['status'] == 'in_process')
                        setTimeout(function(){self.checkGoogleDocStatus();},10000);
                }).fail(function(jqXHR, textStatus, errorThrown ) {
                    $.jGrowl('Ошибка при создании каталога документов на гугл диске для заявки №'+self.model.get('number').toString()+'. Возможно у вас не хватает прав для выполнения данной операции.', { 'themeState':'growl-error', 'sticky':false, life: 10000, 'position': 'bottom-right' });
                });
        },

        saveHistoryOk:function(){
            var hm = new HistoryModel();
            var self = this;
            var ctype = this.$('.condition-select').find(":selected").data('property');

            // if (this.$('.condition-select').val() == window.ORDER_CONDITIONS['CONTRACT_SIGN'])
            // {
            //     alert('Нельзя выбрать состояние "'+window.DICTS[window.ORDER_CONDITIONS['CONTRACT_SIGN']]+'".');
            //     return;
            // }

            var reason = '';
            if (this.$('.condition-select').val() == window.ORDER_CONDITIONS['REFUSE']){
                reason = this.$('.otkaz-select').val();
                if (reason == '0'){
                    alert('Требуется указать причину отказа');
                    return;
                }
                if (reason === 'Выбрали других'){
                    var ts = new TaskModel();
                    ts.set({
                        'condition': 'Обновить информацию',
                        'comment': 'Узнать как работается с другими. Всё ли в порядке. Как идут изготовление, поставка, монтаж.',
                        'datetime':'new',
                        'closedatetime': moment().add(14, 'd').format('DD.MM.YYYY'),
                        'manager': 'nobody@modul.org'
                    });
                    this.model.get('tasks').add(ts);
                }
            }

            if (this.$('.condition-select').val() == window.ORDER_CONDITIONS['EXAMINE']){
                reason = this.$('.review-select').val();
                if (reason == '0'){
                    alert('Требуется указать причину состояния "'+window.DICTS[window.ORDER_CONDITIONS['EXAMINE']]+'"');
                    return;
                }
            }
            if (this.$('.condition-select').val() == window.ORDER_CONDITIONS['INTEREST']){
                reason = this.$('.interes-select').val();
                if (reason == '0'){
                    alert('Требуется указать вид интереса');
                    return;
                }
            }
            var contract_creation = null;
            if((this.$('.condition-select').val()==window.ORDER_CONDITIONS['CONTRACT_PREPARE'] || this.$('.condition-select').val()==window.ORDER_CONDITIONS['CONTRACT_AGREEMENT'] || this.$('.condition-select').val()==window.ORDER_CONDITIONS['CONTRACT_TO_SIGN'] || this.$('.condition-select').val()==window.ORDER_CONDITIONS['CONTRACT_SIGN']) && (!this.model.get('contracts') || this.model.get('contracts').length==0) ){
                contract_creation = {'type':this.$(".contract-link-block input[name=contract-link-vaiant]:checked").val()};
                if(contract_creation.type=='choose'){
                    if (this.$(".contract-link-block .contract-number").val().length > 0) {
                    contract_creation.contract_number = this.$(".contract-link-block .contract-number").val();
                } else{
                    alert('Требуется указать договор');
                     return;
                }
                    // if(this.$(".contract-link-block .contract-number").tokenInput('get').length>0){
                    //     var contr = this.$(".contract-link-block .contract-number").tokenInput('get')[0];
                    //     if(contr.is_signed=='yes' && contr.draft==false){
                    //         alert('Выбранный договор подписан. Нельзя привязать заявку к подписанному договору.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
                    //         return;
                    //     }
                    //     contract_creation.contract_number = contr['number'];
                    //     contract_creation.contract_id = contr['_id'];
                    // }else{
                    //     alert('Требуется указать договор');
                    //     return;
                    // }
                }
            }

//            var contact = this.$('input.client-contacts').select2('data')?this.$('input.client-contacts').select2('data').id:'';
            var contact = this.$('.client-contacts')[0].selectize.getValue()?this.$('.client-contacts')[0].selectize.getValue():'';
            var client_name = '';
            var client_id = ''
            this.$('.client-contacts .selectize-dropdown-content').children().each(function(index, item){
                if ($(item).data('value') == contact) {
                    client_name = $(item).data('client-name');
                    client_id = $(item).data('client-id');
                }
            });
            if (contact === ''){
                alert('Требуется указать контактное лицо');
                return;
            }

            hm.set({
                'condition': this.$('.condition-select').val(),
                'condition_type': ctype,
                'reason':reason,
                'comments': this.$('.comment-text').val()?[{'text':this.$('.comment-text').val()}]:[],
                'chance': this.$('.condition-select').val() == window.ORDER_CONDITIONS['REFUSE']?0:this.$('.chance-slider').data('slider').getValue(),
                'enddate': this.$('.condition-select').val() == window.ORDER_CONDITIONS['REFUSE']?null:this.$('.close-date').val(),
                'finishdate': this.$('.condition-select').val() == window.ORDER_CONDITIONS['REFUSE']?null:this.$('.finish-date').val(),
                'datetime':'new',
                'contact': contact,
                'client_id': client_id,
                'client_name': client_name,
                'confirmed_by_client': self.model.get('confirmed_by_client'),
                'finish_confirmed_by_client': self.model.get('finish_confirmed_by_client'),
                'initiator':this.$("input[name=initiator-contract]:checked").val()
            });

            if(contract_creation)
                hm.set('contract_creation', contract_creation);

//            this.model.set({'ignore_state_date':'no', 'dogovornum':this.$('.dogovor-number').val()});


            // если отказ, то дату закрытия обнулить
            if(this.$('.condition-select').val() == window.ORDER_CONDITIONS['REFUSE'])
            {
                this.model.set({'cur_close_date':null});
                this.model.set({'cur_finish_date':null});
            }

            this.model.set({'ignore_state_date':'no'});


            // необходимо проверить, нет ли в коллекции историй элемента на добавление
            // такое может произойти в случае ошибки сохранения данных

            this.model.get('history').add(hm);

            Statistics.CRMChangeState(this.model.get("number"), this.$('.condition-select').val(), MANAGER);

            var is_new = (!this.model.get('id'))?true:false;
            this.model.save().done(function(){
                self.closeModal();
                if (self.options.quick){
                    window.location = '/crm/'+self.model.get('number');
                }
                // если заявка новая, то необходимо создать ее папку на гугл диске
                if(is_new)
                {
                    self.model.set({'documents': {'status':'in_process'}});
                    setTimeout(function(){self.checkGoogleDocStatus(true);},10000);
                }
            }).error(function(){
                show_server_error();
                // в случае ошибки необходимо удалить новое не сохраненное состояние задачи
                // для этого смотрим все модели коллекции состояний
                var tc = self.model.get('history');
                _.each(tc.models, function(item){
                    if(item==hm)
                        tc.remove(item);
                });
            });
        },
        saveHistoryCancel:function(){
            this.$('.close-order-alert').hide();
            this.$('.save-history').show();
            this.$('.close-history').show();
        },
        priceCancel:function(){
            this.$('.perfect-price-alert').hide();
            this.$('.save-history').show();
            this.$('.close-history').show();
        },
        priceOk:function(){
            this.lastagree = true;
            this.agreeHistory();
            // var pt = new ProductTableView({isnew:false,model: this.model});
   //       $('#client-orders-list').hide();
   //       this.closeModal();
   //       pt.show();
        },
        agreeHistory:function(){
            // если не задана планируемая дата закрытия, то выводим сообщение
            if(!this.$('.cb-noclose-date').is(':checked') && this.$('.close-date').val()=="")
            {
                alert('Не задана планируемая дата закрытия.');
                return;
            }

            // если дата текущего состояния свежее последней планируемой даты заркытия, то выводим сообщение
            var cur_date = new Date();
            var last_close_date = new Date();
            if(!this.$('.cb-noclose-date').is(':checked'))
            {
                if(this.$('.close-date').val()!="")
                    last_close_date = Routine.parseDate(this.$('.close-date').val(),'dd.mm.yyyy');
                else if(this.model.get('last_close_date'))
                    last_close_date = Routine.parseDate(this.model.get('last_close_date'),'dd.mm.yyyy');
            }
            if(Routine.timeToZero(cur_date)>Routine.timeToZero(last_close_date))
            {
                //$.jGrowl('Планируемая дата закрытия устарела. Обновите плановую дату закрытия.', { 'themeState':'growl-error', 'sticky':false });
                alert('Планируемая дата закрытия устарела. Обновите плановую дату закрытия.');
                return;
            }

            var last_finish_date = new Date();
            if(!this.$('.cb-nofinish-date').is(':checked'))
            {
                if(this.$('.finish-date').val()!="")
                    last_finish_date = Routine.parseDate(this.$('.finish-date').val(),'dd.mm.yyyy');
                else if(this.model.get('last_finish_date'))
                    last_finish_date = Routine.parseDate(this.model.get('last_finish_date'),'dd.mm.yyyy');
            }
            if(Routine.timeToZero(cur_date)>Routine.timeToZero(last_finish_date))
            {
                alert('Планируемая дата сдачи устарела. Обновите плановую дату сдачи.');
                return;
            }


            var ctype = this.$('.condition-select').find(":selected").data('property');
            if (ctype=='закрывающее'){
                this.$('.save-history').hide();
                this.$('.close-history').hide();
                this.$('.close-order-alert').show();
            }
            else{
                if (!this.options.quick && this.$('.condition-select').val() != this.laststat && parseInt(this.$('.chance-slider').data('slider').getValue()) == this.lastchance){
                    this.$('.save-history').hide();
                    this.$('.close-history').hide();
                    this.$('.chance-alert').show();
                }
                else{
                    this.saveHistoryOk();
                }
            }
        },
        saveHistory:function(){
            var is_assist = typeof _.find(glCurUser.roles, function(r){return r['role'] == '542a6776266f340002f39951'}) !== 'undefined';
            var ls = this.model.get('history').models[0];
            if (is_assist && ls &&  ls.get('manager') === window.MANAGER){
                $.jGrowl("Ошибка доступа. Данная операция доступна только менеджерам.", { 'themeState':'growl-error', 'sticky':false, life: 10000, 'position': 'bottom-right' });
                return;
            }
            var cond = this.$('.condition-select').val();
            if (is_assist && !ls && cond !== window.ORDER_CONDITIONS['INTEREST']){
                $.jGrowl("Ошибка доступа. Данная операция доступна только менеджерам.", { 'themeState':'growl-error', 'sticky':false, life: 10000, 'position': 'bottom-right' });
                return;
            }

            var ctype = this.$('.condition-select').find(":selected").data('property');
            var cprice = this.$('.condition-select').find(":selected").data('price');
            var cstruct = this.$('.condition-select').find(":selected").data('structure');
            var csq = this.$('.condition-select').find(":selected").data('sq');

            var initiator = this.$("input[name=initiator-contract]:checked").val();

            if ((cond == window.ORDER_CONDITIONS['REFUSE'] || cond == window.ORDER_CONDITIONS['SLEEP']) && this.$('.comment-text').val() == ''){
                alert('Для этого состояния примечание обязателено.');
                return;
            }
            if (parseInt(this.$('.chance-slider').data('slider').getValue()) < this.lastchance && this.$('.comment-text').val() == ''){
                alert('При понижении шанса нужно указать примечание.');
                return;
            }
            var i = this.$('.condition-select option[value="'+this.laststat+'"]').index();
            if (this.$('.condition-select').find(":selected").index() < i && this.$('.comment-text').val() == ''){
                alert('При понижении состояния нужно указать примечание.');
                return;
            }

            if (this.$('.condition-select').find(":selected").index() == i && this.$('.comment-text').val() == ''){
                alert('Если состояние не изменилось нужно указать примечание.');
                return;
            }

            if(!initiator){
                alert('Необходимо указать инициатора контакта');
                return;
            }

            var self = this;

            if (!this.lastagree && (cprice === 'enabled' || cstruct === 'enabled' || csq === 'enabled')){
                var ctp = '';
                var errmsg = 'Для этого статуса необходимо установить:';
                if (cprice === 'enabled'){
                    ctp += 'p';
                    errmsg += ' точную цену;';
                }
                if (cstruct === 'enabled'){
                    ctp += 's';
                    errmsg += ' точный состоав;';
                }
                if (csq === 'enabled'){
                    ctp += 'q';
                    errmsg += ' точную площадь;';
                }
                var a_check = $.get("/handlers/checkorder/"+ctp+"/"+this.model.get('id')+"/"+cond, {}, "json");
                    a_check.success(function(data){
                        if (data.result === 'no'){
                            self.$('.perfect-price-alert span').text(errmsg+' Продолжить? ');
                            self.$('.save-history').hide();
                            self.$('.close-history').hide();
                            self.$('.perfect-price-alert').show();
                            return;
                        }
                        else{
                            self.agreeHistory();
                        }
                    });
                    a_check.error( function (){
                       $.jGrowl("Ошибка сохранения. ", {'themeState':'growl-error', 'position': 'bottom-right'});
                    });

            }
            else{
                self.agreeHistory();
            }
        },
        closeModal:function(){
            var self = this;
            this.$el.modal('hide');
            $("body").removeClass("modal-open");
        }
    });

module.exports = HistoryFormView;
