var ContactTableView = require('./contact_table_view');
var StatusHistoryTableView = require('./status_history_table_view');
var clientCardTemplate = require('../templates/client_card_template.html');

var PodpisantListView = require('./podpisant_view')


var OrderModel =  require('../models/order_model');
var HistoryModel =  require('../models/history_model');
var HistoryWorkStatusModel =  require('../models/history_work_status_model');

/**
    * карточка клиетна
    */
    var ClientCardView = Backbone.View.extend({
        el: $('#client-card-form'),
        orderid:null,
        contactTbl: null,
        podpisantView:null,
        site_test: null,
        is_modal:true,
        agent_clients:null,
        render_complete: false,
        events: {
            'click .close-card': 'hide',
            'click .save-client':'savedata',
            'click .save-status':'save_status',
            'click .save-client-wait':'save_wait',
            'click .add-order':'add_order',
            'click .check-site': 'check_site',
            'change .agent-checkbox': 'change_agent',
            'click .refresh-contacts': 'updateContacts',
            'change #work-status': 'work_status_change',
            'keyup .work-status-comment textarea': 'onCommentKeyPress'
        },
        initialize:function(){
            this.template = clientCardTemplate;
            this.sh_table = new StatusHistoryTableView({collection: this.model.get('history_work_status')});
            this.is_modal = this.$el.hasClass('modal-dlg');
            var self = this;
            if (this.model.get('id') != ''){
                this.model.fetch({timeout:50000}).success(function(){
//                    self.sh_table = new StatusHistoryTableView({collection: self.model.get('history_work_status')});
                    self.sh_table.collection = self.model.get('history_work_status');
                    self.render();
                    var fr = Backbone.history.fragment;

                    if (self.is_modal){
                        window.app_router.navigate(fr+'/client-card/'+ self.options.orderid);
                    }
                    else{
                        //window.app_router.navigate(fr+'/client-card/'+ self.options.orderid);
                    }
                }).error(function(){
                    self.hide();
                });
            }
            else{
                self.sh_table = new StatusHistoryTableView({collection: self.model.get('history_work_status')});
                self.render();
                //self.contactTbl = new ContactTableView({collection:self.model.get('contacts'), el: self.$('.contacts-group')});
                self.$('.add-order').addClass('hide');
                if (self.is_modal){
                    window.app_router.navigate('new-client-card');
                }
            }
            if (self.is_modal){
                window.App.clientView = this;
            }
            else{
                self.show();
            }
            this.listenTo(this.model,'sync', this.render);
        },
        onCommentKeyPress: function(e){
            this.update_save_status_btn();
        },
        update_save_status_btn: function(){
            var ws = this.get_work_status();
            if (typeof ws != 'object'){
                this.$el.find('.save-status').attr('disabled', 'disabled');
            } else {
                this.$el.find('.save-status').removeAttr('disabled');
            }
        },
        work_status_change: function(e){
            if ($(e.target).val() == 'inactive'){
                $('.work-status-comment').show();
            } else {
                $('.work-status-comment').hide();
            }
            this.update_save_status_btn();
        },
        updateContacts:function(){
            var self = this;
            var select = this.$('.order-contacts');
            $.get('/handlers/client_group/'+this.model.get('id')).done(function(ret){
                var data = $.parseJSON(ret);

                if (data['contacts'] && data['contacts'].length >0){
                    var contacts = data['contacts'].map(function(item){
                        return {'name':item['fio'],
                                'client_name':item['client_name']?item['client_name']:'',
                                'client_id': item['client_id']?item['client_id']:''};
                    });

//                    select.selectize({
//                                valueField: 'name',
//                                labelField: 'name',
//                                options: contacts,
//                                create: false
//                            });
//                    contacts = [{'name': 'Item 1', 'client_name': 'Client Name 1', 'client_id': 'id 1'},
//                                {'name': 'Item 2', 'client_name': 'Client Name 2', 'client_id': 'id 2'},
//                                {'name': 'Item 2', 'client_name': 'Client Name 2', 'client_id': 'id 2'},
//                                {'name': 'Item 3', 'client_name': 'Client Name 3', 'client_id': 'id 3'}];
//                    contacts = [{'label': 'Item 1', 'value': 'Client Name 1', 'client_id': 'id 1'},
//                                {'label': 'Item 2', 'value': 'Client Name 2', 'client_id': 'id 2'},
//                                {'label': 'Item 3', 'value': 'Client Name 3', 'client_id': 'id 3'}];
//                    self.$('.order-contacts').selectize({
//                        valueField: 'id',
//                        labelField: 'title',
//                        options: [
//                            {id: 1, title: 'Spectrometer', url: 'http://en.wikipedia.org/wiki/Spectrometers'},
//                            {id: 2, title: 'Star Chart', url: 'http://en.wikipedia.org/wiki/Star_chart'},
//                            {id: 3, title: 'Electrical Tape', url: 'http://en.wikipedia.org/wiki/Electrical_tape'}
//                        ],
//                        create: false
//                    });

                    var cur = select.data('val');
                    self.contacts_select = select.selectize({
//                        hideSelected:true,
                        maxItems: 1,
                        closeAfterSelect:true,
                        mode: 'single',
                        options: contacts,
                        valueField: 'name',
                        labelField: 'name',
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
                    if (cur) {
                        $sel[0].selectize.setValue(cur);
                    }
                }
            });
        },
        renderHistoryTable: function(){
            if (this.model.get('id') == ''){
                this.$el.find('.history-container').hide();
                this.$el.find('.save-status').hide();
            } else {
                this.$el.find('.history-container').html(this.sh_table.render().$el.html());
                this.$el.find('.history-container').show();
                this.$el.find('.save-status').show();
            }
        },
        render: function()
        {
            this.render_complete = false;
            var is_new_client = (this.model.get('id')=="");
            this.$('.contacts-group').html('');
            var self = this;
            var foo = this.model.get('cl');
            if (foo == 'cl'){
                this.model.set({'iscl':'checked'});
            }
            else{
                this.model.set({'iscl':''});
            }
            var cldata = this.model.toJSON();
            cldata.is_add_order = this.options.is_add_order?true:false;
            if (this.$el.hasClass('modal-dlg'))
                this.$el.find(".card-data").html(this.template(cldata));
            else
                this.$el.html(this.template(cldata));

            if (!is_new_client) {
                this.updateContacts();
            }

            this.$('#work-status').val(this.model.get('current_work_status')['status']);
            if (this.model.get('current_work_status')['status'] == 'inactive'){
                this.$('.work-status-comment').show();
                this.$('.work-status-comment textarea').val(this.model.get('current_work_status')['note']);
            }

            var wf = this.model.get('wherefind');
            if (wf != ''){
                var i = this.$('#where-find').find('option[value="'+wf+'"]').length;
                if (i == 0){
                    this.$('#where-find').append('<option value="'+wf+'">'+wf+'</option>');
                }
                this.$('#where-find').val(wf);
            }
            if (this.model.get('site_status') != '' && this.model.get('site_date') != ''){
                this.$('.site-test-status').text((this.model.get('site_status')=='yes'?'Сайт существует. Проверен: ':'Сайт не существует. Проверен:')+this.model.get('site_date'));
            }
            /*
            task 1906 перенести первый контакт в форму заявки
            var fc = this.model.get('firstcontact');
            if (fc != ''){
                var i = this.$('#first-contact').find('option[value="'+fc+'"]').length;
                if (i == 0){
                    this.$('#first-contact').append('<option value="'+fc+'">'+fc+'</option>');
                }
                this.$('#first-contact').val(fc);
            }*/
            if (this.$el.hasClass('modal-dlg')){
                $("body").css("overflow",'hidden');
                this.$el.on('hidden', function () {
                    $("body").css("overflow",'auto');
                    self.$el.hide().find(".card-data").empty();
                    self.undelegateEvents();
                    $(self.el).removeData().unbind();
                });
            }

            var is_agent = this.model.get('agent');
            this.$('.agent-checkbox').prop('checked',is_agent);
            if (!is_agent){
                this.$('.agent').hide();
            }

            this.renderHistoryTable();

             setTimeout(function() {
                self.$('#client-name').focus();
                self.$('#client-name').val(self.$('#client-name').val());
            }, 0);

            var bar = [];
            _.each(window.DICTS.client_type, function(item){bar.push({'id':item, 'text':item})});
            this.$('.client-type').select2({
                    data: bar,
                    createSearchChoice:function(term, data) { if ($(data).filter(function() { return this.text.localeCompare(term)===0; }).length===0) {return {id:term, text:term};} }
                }
            );

            this.agent_clients = this.$('#client-customer').selectize({
                valueField: 'id',
                labelField: 'name',
                searchField: 'name',
                options:this.model.get('customers'),
                hideSelected:true,
                closeAfterSelect:true,
                plugins: ['remove_button'],
                create: false,
                render: {
                    item: function(item, escape) {

                        return '<div>' +
                            '<a href="/client-card/'+escape(item.id)+'" class="name">' + escape(item.name.substring(0,15)) + '</a>&nbsp;[<a href="/crm#orders/&cl='+item.id+'&o=all&c=total&m=all&t=all&r=all&od=all&cd=all&ch=all&s=400&ts=order&sc=no&p=1&i=0&fa=off" class="order-cnt">1</a>]' +
                        '</div>';
                    },
                    option: function(item, escape){
                        return '<div>' +
                                '<span class="title">' +
                                    '<span class="name">' + escape(item.name) + '</span>' +
                                '</span>' +
                                '<span class="description"><small>' + escape(item.cont) + '</small></span>' +
                            '</div>';
                    }
                },
                load: function(query, callback) {
                        if (!query.length || query.length <2 ) return callback();
                        $.ajax({
                            url: "/handlers/clientfind/?q=" + encodeURIComponent(query),
                            type: 'GET',
                            error: function() {
                                callback();
                            },
                            success: function(res) {
                                callback(res.result);
                            }
                        });
                    }
            });
            var selectize = this.agent_clients[0].selectize;
            var get_cnt = function(value, $item){
                $.get('/handlers/clientorders/', {id:value})
                    .done(function(data){
                        $('a.order-cnt', $item).text(data.cnt);
                    });
            };
            if (this.model.get('customers').length >0){
                _.each(this.model.get('customers'), function(itm){
                    selectize.addItem(itm.id);
                    $item = selectize.getItem(itm.id);
                    get_cnt(itm.id, $item);
                });
            }
            selectize.on('item_add', function(value, $item){
                get_cnt(value, $item);
            });
            if (!this.is_modal){
                this.$('.close-card').hide();
            }

            this.$('.collapsible').collapsible();
            self.contactTbl = new ContactTableView({collection:self.model.get('contacts'), el: self.$('.contacts-group'), client: self.model});


            // метки
            var tags = [];
            for(var i in window.clients_tags){
                tags.push({'id':window.clients_tags[i]['tag'],'name':window.clients_tags[i]['tag']});
            }
            $("input[name=tags]",this.$el).tokenInput(tags,{theme: "facebook",zindex:1300,hintText:"Введите для поиска",noResultsText:"Ничего не найдено",searchingText:"Поиск...",allowFreeTagging:true});

            var tags = this.model.get("tags");
            for(var i in tags)
                $("input[name=tags]",this.$el).tokenInput("add",{'id':tags[i],'name':tags[i]});

            self.podpisantView = new PodpisantListView({el:self.$(".podpisant-group"), client:self.model});

        this.render_complete = true;
        },

        add_order:function(){
            if (this.model.get('id') != ''){
                window.location = '/app#find-client/'+this.model.get('id')+'/new-order';
            }
        },
        show:function(){
            this.$el.show();
        },

        change_agent:function(){
            var is_agent = this.$('.agent-checkbox').prop('checked');
            if (!is_agent){
                this.$('.agent').hide();
            }
            else{
                this.$('.agent').show();
            }
        },

        hide:function(){
            if (!this.is_modal)
                return;
            var self = this;
            window.App.clientView = null;
            if (this.$el.hasClass('modal-dlg')){
                this.$el.modal('hide').on('hidden', function () {
                    self.$el.hide().find(".card-data").empty();
                    // window.cf.show();
                    self.undelegateEvents();
                    $(self.el).removeData().unbind();
                });
                    var fr = Backbone.history.fragment;
                    window.app_router.navigate(fr.replace('/client-card/'+ self.options.orderid, ''));

            }
            else{
                    self.$el.hide().empty();
                    window.cf.show();
                    self.undelegateEvents();
                    $(self.el).removeData().unbind();

                    var fr = Backbone.history.fragment;
                    window.app_router.navigate(fr.replace('/client-card/'+ self.options.orderid, ''));
                    // window.app_router.navigate(fr.replace('/client-card', ''));
            }

        },
        check_site:function(call_back_function){
            call_back_function = call_back_function || null;
            var self = this;
            var site = this.$('#client-site').val().toLowerCase();
             if (site == '' )
            {
                if(call_back_function && typeof call_back_function == "function")
                        call_back_function();
                return;
            }
            if(site.indexOf('www.') == 0)
               site='http://' + site.replace('www.','');
            if(site.indexOf('http') == -1)
                site='http://' + site;

            $.blockUI({'message':'<img src="/static/img/spinner.gif">', 'css':{'border':'none', 'backgroundColor':'transparent'}, 'overlayCSS':{'backgroundColor':'#fff', 'cursor':'pointer'}});
            $.post('/handlers/test_site', {'site':site})
                .done(function(data){
                    var dt = moment().format("DD.MM.YYYY, HH:mm");
                    if (data.status == 'ok'){
                        self.$('.site-test-status').text('Сайт существует. Проверен: '+dt);
                        self.site_test = true;
                        self.model.set({
                            'site_status': 'yes',
                            'site_date': dt
                        });
                    }
                    else{
                        self.$('.site-test-status').text('Сайт не существует. Проверен: '+dt);
                        self.site_test = false;
                        self.model.set({
                            'site_status': 'no',
                            'site_date': dt
                        });
                    }
            })
                .always(function(){
                    $.unblockUI();
                    if(call_back_function && typeof call_back_function == "function")
                        call_back_function();
                });
        },
        get_work_status: function(){
            var work_status_comment = this.$('.work-status-comment textarea').val();
            var work_status = this.$('#work-status').val();
            var ws_object = {
                'datetime': 'new',
                'manager': 'self',
                'status': work_status,
                'note': work_status=='inactive'?work_status_comment:''
            }

            if (work_status == 'inactive' && work_status_comment == ''){
                showmsg('Укажите примечание в статусе работы.');
                return;
            }
            if (this.model.get('id') != '' &&
                this.model.get('current_work_status')['status'] == ws_object.status &&
                this.model.get('current_work_status')['note'] == ws_object.note) {
                return;
            }
            return ws_object;
        },
        save_status:function(){
            var self = this;

            var ws_object = self.get_work_status();
            if (typeof(ws_object) != "object"){
                showmsg('Статус не изменился.');
                return;
            }

            var history_work_status = self.model.get('history_work_status');

            var workstatus_hm = new HistoryWorkStatusModel();
            workstatus_hm.set(ws_object);

//            history_work_status.add(workstatus_hm);

            var data = {
                'id': self.model.get('id'),
                'current_work_status': ws_object,
                'history_work_status': history_work_status
            };

            Routine.showLoader();
            $.ajax({
                url: '/handlers/client/status',
                processData: false,
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(data),
                dataType: 'json',
                success: function(response){
                    $.jGrowl("Статус успешно сохранен. ", {'themeState':'growl-success', 'position': 'bottom-right'});

                    self.model.set('current_work_status', response.current_work_status);
//                    self.$el.find('.history-container').html(new StatusHistoryTableView({collection: response.history_work_status}).$el.html());
                    history_work_status.set(response.history_work_status);
                    self.renderHistoryTable();
                    self.update_save_status_btn();
                    Routine.hideLoader();
                },
                error: function(){
                    show_server_error();
                    Routine.hideLoader();
                }
            });

        },

        /**
        ** Сохранение - отложить
        **/
        save_wait: function(){
            this.savedata(true);
        },

        /**
        ** Сохранение данных
        **/
        savedata:function(wait){
            //
            // Локальная функция callback успешного сохранения
            //
            var save_ok = function()
            {
                var is_new_client = (self.model.get('id')=="");
                var customers = [];
                if (self.agent_clients && self.$('.agent-checkbox').prop('checked')){
                    var selectize = self.agent_clients[0].selectize;
                    var customers = $.map(selectize.items, function(value) {
                        var itm = selectize.options[value];
                        return {'id':itm.id, 'name': itm.name};
                    });
                }
                self.model.set({
                    'name': self.$('#client-name').val(),
                    'cl': self.$('.cl-checkbox').is(':checked')?'cl':'notcl',
                    'agent': self.$('.agent-checkbox').prop('checked'),
                    'customers': customers,
                    'rekvisit': self.$('#rekvisit-textarea').val(),
                    'addr': self.$('#address-textarea').val(),
                    'site': self.$('#client-site').val(),
                    'inn': self.$('#client-inn').val(),
                    'wherefind': self.$('#where-find').val(),
                    //'firstcontact': self.$('#first-contact').val(),
                    'type': self.$('.client-type').select2("val"),
                    'comment': this.$(".client-comment-text").val(),
                    'contact': contact,
                    'client_id': client_id,
                    'client_name': client_name,
                    'current_work_status': is_new_client?ws_object: self.model.get('current_work_status'),
                    'tags':tgList
                  });
                  self.model.save(null, {
                      success: function()
                      {
                            if(is_new_client)
                                $.jGrowl("Клиент успешно добавлен. ", {'themeState':'growl-success', 'position': 'bottom-right'});
                            else
                            {
                                $.jGrowl("Данные успешно сохранены. ", {'themeState':'growl-success', 'position': 'bottom-right'});
                                if (self.is_modal)
                                {
                                    curClient = self.model;
                                    self.hide();
                                    window.cf.show();
                                }
                            }
                            if(neworder)
                            {
                                $.blockUI({'message':'<img src="/static/img/spinner.gif">', 'css':{'border':'none', 'backgroundColor':'transparent'}, 'overlayCSS':{'backgroundColor':'#fff', 'cursor':'pointer'}});
                                neworder.set({
                                    'client_id':self.model.get('id'),
                                    'client':self.model.get('name'),
                                    'state': (wait===true)?'wait':'published'
                                });
                                neworder.save(null,{'success':function(){
                                    window.location = '/crm/'+neworder.get('number');
                                }});
                            }
                            else if(self.options.is_add_order)
                                window.location = '/client-card/'+self.model.get('id');
                    },
                    error: function (){ show_server_error();}
              });
            };

            //
            // Локаьная функция проверки существования сайта
            //
            var check_for_site = function(){
                if (self.model.get('site_status') == 'no')
                {
                        bootbox.confirm("Для клиента указан не существующий сайт.", function(result){
                            if(result)
                                save_ok();
                            else
                                return;
                        });
                }
                else
                    save_ok();
            };

            //
            // Основной етло функции
            //
            var self = this;
            var client_name = '';
            var client_id = '';
            var contact = '';
            var tags = this.$("[name=tags]").val();
            // убрать дубли из тэгов
            var tg_spl = tags.split(",");
            var tgList = [];
            var all_tags_keys = {};
            for(var i in window.clients_tags)
                all_tags_keys[window.clients_tags[i]['tag']] = window.clients_tags[i]['tag'];
            for(var i in tg_spl)
            {
                if(tg_spl[i] && tgList.indexOf(tg_spl[i])<0)
                {
                    tgList.push(tg_spl[i]);
                    if(!(tg_spl[i] in all_tags_keys))
                        window.clients_tags.push({
                            'tag': tg_spl[i],
                            'count':1
                        });
                }
            }
            var ws_object = self.get_work_status();
            if (self.contacts_select && self.contacts_select != undefined && self.contacts_select.length>0) {
                var contact = self.contacts_select[0].selectize.getValue()?self.contacts_select[0].selectize.getValue():'';
                    self.$('.order-contacts .selectize-dropdown-content').children().each(function(index, item){
                        if ($(item).data('value') == contact) {
                            client_name = $(item).data('client-name');
                            client_id = $(item).data('client-id');
                        }
                    });
            }
            if (this.$('#client-name').val() == ''){
                showmsg('Укажите имя клиента.');
                return;
            }

            var neworder = null;
            if (this.options.is_add_order && this.$(".interes-select").val()!='0')
            {
                if(!this.$("input[name=cl-initiator-contract]:checked").val())
                {
                    showmsg('Укажите инициатора контакта в блоке - Заявка.');
                    return;
                }

                //---------------
                // iss #1376
                if(!this.$("input[name=how-to-save]:checked").val())
                {
                    showmsg('Укажите действие, которое необходимо выполнить с зявкой. Отправить заявку в работу или отложить?');
                    return;
                }
                wait = this.$("input[name=how-to-save]:checked").val() == 'order_to_waite';
                //-------------

                neworder = new OrderModel();
                var hm = new HistoryModel();
                hm.set({
                    'condition': window.ORDER_CONDITIONS['INTEREST'],
                    'condition_type': "начальное",
                    'reason':this.$(".interes-select").val(),
                    'comment': this.$(".comment-text").val(),
                    'comments': [{'text':this.$(".comment-text").val()}],
                    'chance': 0,
                    'enddate': null,
                    'datetime':'new',
                    'contact': contact,
                    'confirmed_by_client': false,
                    'initiator':this.$("input[name=cl-initiator-contract]:checked").val(),
                    "firstcontact": this.$("#first-contact").val()
                });
                neworder.set({'ignore_state_date':'no'});
                neworder.get('history').add(hm);
                //neworder.set({'firstcontact', this.$("#first-contact").val()})
            }

            if(self.$('#client-site').val()!="")
                self.check_site(check_for_site);
            else
            {
                self.model.set({
                    'site_status': '',
                    'site_date': moment().format("DD.MM.YYYY, HH:mm")
                });
                save_ok();
            }
        },

        /**
        ** Переместиться к указанному контакту
        **/
        go_to_contact:function(val){
            var lnk = $('a:contains("'+val+'")');
            if(lnk.length==0)
            {
                $.jGrowl("Контакт: "+val+" не найден. Возможно он был удален. ", {'themeState':'growl-error', life: 7000, 'position': 'bottom-right'});
                return;
            }
            var box = lnk.parents('tr:first');
            setTimeout(function(){
                window.scrollTo(0,box.offset().top);
                box.addClass("highlight");
                setTimeout(function(){box.removeClass("highlight");},5000);
            },100);
        },
    });

module.exports = ClientCardView;
