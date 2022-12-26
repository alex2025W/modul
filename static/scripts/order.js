/**
 * Scripts for the /crm/order_id page
 */

var eventBus = _.extend({}, Backbone.Events);

/*** Модели ***/

/**
 * История заказа
 * @type {[type]}
 */
var HistoryModel = Backbone.Model.extend({
    defaults:{
        'condition':'',
        'condition_type':'',
        'reason':'',
        'comments':[],
        'chance':0,
        'enddate':'',
        'datetime':'',
        'manager':'',
        'contact':'',
        'log':[]
    }
});

var HistoryCollection = Backbone.Collection.extend({
    model: HistoryModel
});

/**
 * Задачи
 * @type {[type]}
 */
var TaskModel = Backbone.Model.extend({
    defaults:{
        'condition':'',
        'comment':'',
        'datetime':'',
        'manager':'',
        'closedatetime': '',
        'status':''
    }
});

var TaskCollection = Backbone.Collection.extend({
    model: TaskModel
});

/**
 * Структура
 * @type {[type]}
 */
var ProductModel = Backbone.Model.extend({
    defaults:{
        'type':'',
        'name':'',
        'count':0,
        'sq':0.0,
        'price':0,
        'approx':'no',
        'approx_sq':'no',
        'addrs':'',
        'length':'',
        'width': '',
        'height': '',
        'positions':[],
        'is_complect':false,
        'linked_orders': []
    }
});

var ProductCollection = Backbone.Collection.extend({
    model: ProductModel
});

var PositionModel = Backbone.Model.extend({
    defaults:{
        'num':0,
        'addr':'',
        'mont':'',
        'shmont':'',
        'mont_price':'',
        'mont_price_type':0
    }
});

var PositionCollection = Backbone.Collection.extend({
    model: PositionModel
});

var ServiceModel = Backbone.Model.extend({
    defaults:{
        'number':'',
        "user_email":"",
        "type":'',
        'name':'',
        'price':0,
        'approx':'no',
        'product_include':'no',
        'by_production':false,
        'units':[],
        'note':''
    },
    initialize:function(){
        if(!this.get("_id")){
            this.set("_id","new_"+this.cid);
        }
    }
});

var ServiceCollection = Backbone.Collection.extend({
    model: ServiceModel
});

/**
 * Заказ
 */
var OrderModel = Backbone.Model.extend({
    urlRoot:'/handlers/order',
    defaults:{
        'id':'',
        'number':'',
        'documents': null,
        'client_id':'',
        'client_info':'',
        'total_address' :'',
        'total_montaz' : '',
        'total_delivery':'',
        'total_shef_montaz' : 'no',
        'markup': 0,
        'client':'',
        'condition': '',
        'condition_type':'',
        'task':'0',
        'task_count':0,
        'task_date':'',
        'datetime':'',
        'manager':'',
        'structure':'—',
        'price':0,
        'approx':'no',
        'approx_sq':'no',
        'closed':'no',
        'chance':0,
        'comment':'—',
        'chance_str':'—',
        'sq':0,
        'state': 'published',
        'favorite':'off',
        'f_state':'',
        'f_state_date':'',
        'l_state':'',
        'l_state_reason':'',
        'l_state_date':'',
        'prelast_state':'',
        'prelast_state_date':'',
        //----
        'last_close_date':'',
        'cur_close_date':'',
        'confirmed_by_client':false,
        'close_date':'',
        'close_days_count':null,
        //---
        'last_finish_date':'',
        'cur_finish_date':'',
        'finish_confirmed_by_client':false,
        'finish_date':'',
        'finish_days_count':null,
        'history': new HistoryCollection(),
        'tasks': new TaskCollection(),
        'products': new ProductCollection(),
        'cur_manager': MANAGER,
        'last_days_count':null,
        'prelast_days_count':null,
        'ignore_state_date': 'no',
        'l_state_date_short':0,
        'prelast_state_date_short':0,
        'f_state_date_short':0,
        'diff_last_prelast_days_count': 0,
        'is_tender':'no',
        'dogovornum':'',
        'contracts':[],
        'linked_orders':[],
        'f_state_manager': '',
        'prelast_state_manager': '',
        'l_state_manager': '',
        'f_state_initiator': '',
        'prelast_state_initiator': '',
        'l_state_initiator': '',
        'correspondent': '',
        'projects':[],
        'abc_type': null,
        'client_roles':null,
        'activity': 0,
        'activity_significant': 0,
        'activity_percent': 0,
    },
    initialize: function(){
        this.set('history', new HistoryCollection(this.get('history')));
        this.set('tasks', new TaskCollection(this.get('tasks')));
        this.set('products', new ProductCollection(this.get('products')));
        this.set("services",new ServiceCollection(this.get('services')));
    },
    parse: function(response) {
        var productList = new ProductCollection();
        productList.add(response.products);
        var historyList = new HistoryCollection();
        historyList.add(response.history);
        var serviceList = new ServiceCollection();
        serviceList.add(response.services);

         // сортировка колекции состояний истории
        var __sortItems = function(a,b){
            var a_date = null;
            var b_date = null;

            if(a.get('datetime').length>12)
                a_date = Routine.parseDateTime(a.get('datetime'), 'dd.mm.yyyy h:i:s');
            else
                a_date = Routine.parseDate(a.get('datetime'), 'dd.mm.yyyy');

            if(b.get('datetime').length>12)
                b_date = Routine.parseDateTime(b.get('datetime'), 'dd.mm.yyyy h:i:s');
            else
                b_date = Routine.parseDate(b.get('datetime'), 'dd.mm.yyyy');

            if(a_date>b_date)
                return -1;
            if(a_date<b_date)
                return 1;
            return 0;
        }
        if(historyList.models && historyList.models.length>0)
            historyList.models = historyList.models.sort(__sortItems);

        var taskList = new TaskCollection();
        taskList.add(response.tasks);

        var tsk = response.task;
        if (tsk == ''){
            tsk = '0';
        }
        var dt = getloc(response.datetime);
        window.clientcnt = response.clientcnt;
        window.client_abc = response.client_abc
        return{
            'id': response.id,
            'number': response.number,
            'documents': response.documents,
            'client_id': response.client_id,
            'client_info': response.client_info,
            'total_address' : response.total_address,
            'total_montaz' : response.total_montaz,
            'markup' : response.markup || 0,
            'total_delivery' : response.total_delivery,
            'total_shef_montaz' : response.total_shef_montaz,

            'client_group': response.client_group,
            'correspondent': response.correspondent,

            'projects':response.projects||[],
            'client': response.client,
            'task': tsk,
            'task_count': response.task_count,
            'task_date': response.task_date,
            'datetime': dt,
            'condition': response.condition,
            'condition_type': response.condition_type,
            'manager': response.manager,
            'structure': response.structure,
            'price': response.price,
            'approx': response.approx,
            'approx_sq': response.approx_sq,
            'closed': response.closed,
            'chance': response.chance,
            'comment': response.comment,
            'chance_str': response.chance_str,
            'sq': response.sq,
            'state': response.state,
            'favorite': response.favorite,
            'f_state': response.f_state,
            'f_state_date': response.f_state_date,
            'l_state':response.l_state,
            'l_state_reason':response.l_state_reason,
            'l_state_date':response.l_state_date,
            'prelast_state':response.prelast_state,
            'prelast_state_date':response.prelast_state_date,

            //-----
            'last_close_date':response.last_close_date,
            'cur_close_date':response.cur_close_date,
            'close_date': response.close_date,
            'confirmed_by_client':response.confirmed_by_client,
            'close_days_count':response.close_days_count,
            //-----
            'last_finish_date':response.last_finish_date,
            'cur_finish_date':response.cur_finish_date,
            'finish_date': response.finish_date,
            'finish_confirmed_by_client':response.finish_confirmed_by_client,
            'finish_days_count':response.finish_days_count,

            products: productList,
            history: historyList,
            tasks: taskList,
            services: serviceList,
            'last_days_count':response.last_days_count,
            'prelast_days_count':response.prelast_days_count,

            'ignore_state_date':response.ignore_state_date,
            'l_state_date_short':response.l_state_date_short,
            'prelast_state_date_short':response.prelast_state_date_short,
            'f_state_date_short':response.f_state_date_short,
            'diff_last_prelast_days_count': response.diff_last_prelast_days_count,
            'is_tender': response.is_tender,
            'dogovornum': response.dogovornum,
            'change_comment':response.change_comment,
            'contracts': response.contracts || [],
            'linked_orders':response.linked_orders || [],
            'f_state_manager': response.f_state_manager,
            'prelast_state_manager': response.prelast_state_manager,
            'l_state_manager': response.l_state_manager,
            'f_state_initiator': response.f_state_initiator,
            'prelast_state_initiator': response.prelast_state_initiator,
            'l_state_initiator': response.l_state_initiator,
            'abc_type': response.abc_type,
            'client_roles': response.client_roles,
            'activity': response.activity,
            'activity_significant': response.activity_significant,
            'activity_percent': response.activity_percent,
            'client_roles_history': response.client_roles_history,
        }
    }

});

/*** Услуги ***/

var ServiceModel = Backbone.Model.extend({
        defaults:{
            'number':'',
            "user_email":"",
            "type":'',
            'name':'',
            'price':0,
            'approx':'no',
            'product_include':'no',
            'by_production':false,
            'units':[],
            'note':''
        },
        initialize:function(){
            if(!this.get("_id")){
                this.set("_id","new_"+this.cid);
            }
        }
    });

    var ServiceCollection = Backbone.Collection.extend({
        model: ServiceModel
    });

    /**
     * Услуга
     */
    var ServiceTableItemView = Backbone.View.extend({
        events:{
            'click .show-position': 'showPosition'
        },
        tagName:'tr',
        product:null,
        initialize:function(){
            this.template = _.template($('#serviceTableItemTemplate').html());

        },
        render: function() {
            var md = this.options.service.toJSON();
            md.productions = this.model.get("products").toJSON();
            this.$el.html(this.template(md));
            return this;
        },
        showPosition:function(){
            var pf = new ServiceFormView({el: $('#position-modal'), model: this.model, service:this.options.service, isnew:false});
            pf.show();
        }
    });


     /**
     * услуги
     */
    var ServiceFormView = Backbone.View.extend({
        events:{
            'click .close-position': 'closeModal',
            'change .by_production':'onByProduction',
            'click .save-position': 'savePosition',
            'click .save-add-position': 'saveAddPosition',
            'click .remove-position': 'removePosition',
            'change .isinclude_product':'onIncludeProduct',
            'change .payment-all-units':'onAllSelect'
        },
        isnew:false,
        initialize:function(){
            this.template = _.template($('#serviceEditForm').html());
            this.render();
        },
        render:function(){
            var mdl = this.options.service.toJSON();
            mdl.productions = this.model.get("products").toJSON();
            mdl.is_new = this.options.isnew;
            this.$el.html(this.template(mdl));
            var self = this;
            this.$el.on('hidden', function () {
                self.$el.empty();
                self.undelegateEvents();
                self.$el.removeData().unbind();
            });
            this.$('.construction-price').numeric({ decimal: ',', negative: false,decimalPlaces:2 });
            this.$('.service-type').val(this.options.service.get("type"));

            /* if(this.model.get('is_signed')=='yes' && !App.glHasAccess){
                this.$('.save-position, .save-add-position, .remove-position').hide();
                this.$('input, select, textarea').prop('disabled',true);
            }*/
        },
        show:function(){
            this.$el.modal('show');
        },
        closeModal:function(){
            var self = this;
            this.$el.modal('hide');
        },
        onByProduction:function(){
            if(this.$(".by_production").is(":checked"))
                this.$(".productions-table").slideDown();
            else
                this.$(".productions-table").slideUp();
        },
        onIncludeProduct:function(){
            if(this.$(".isinclude_product").is(":checked")){
                this.$(".construction-price").prop('disabled',true).val("0");
            }
            else
                this.$(".construction-price").prop('disabled',false);
        },
        onAllSelect:function(e){
            var chk = $(e.currentTarget).is(":checked");
            $(e.currentTarget).parents('.units:first').find("input").prop('checked',chk);
        },
        fillModel:function(){
            var srv = this.options.service;
            srv.set("name",this.$('.construction-name').val());
            srv.set("price",Routine.strToFloat($(".construction-price").val()));
            srv.set("type",this.$(".service-type").val());
            srv.set("approx",this.$(".is_approx").is(":checked")?"yes":"no");
            srv.set("product_include",this.$(".isinclude_product").is(":checked")?"yes":"no");
            srv.set("by_production",this.$(".by_production").is(":checked"));
            srv.set("note",this.$(".construction-note").val());

            var units = [];
            if(srv.get("by_production")){
                this.$(".units input[type=checkbox]:checked").each(function(){
                    units.push({'production_id':$(this).data("production"), 'unit_number':$(this).data('number')});
                });
            }
            srv.set("units",units);

            if(!srv.get("name")){
                var nm = srv.get('type')+' ';
                if(!srv.get("by_production"))
                    nm+="(вся продукция)";
                else
                {
                     /*группируем юниты по продукции */
                    var prod_gr = {};
                    for(var i in units){
                        u = units[i]
                        if(u.production_id in prod_gr)
                            prod_gr[u.production_id].push(u.unit_number);
                        else
                            prod_gr[u.production_id] = [u.unit_number];
                    }
                    var prods = "";

                    this.model.get("productions").forEach(function(item){
                        if(item.get("_id") in prod_gr){
                            if(prods)
                                prods+='; ';
                            prods+=item.get("name")+": ";
                            var pr_id = item.get("_id");
                            for(var j in prod_gr[pr_id ]){
                                if(j>0)
                                    prods+=', ';
                                prods+=prod_gr[pr_id][j];
                            }
                        }
                    });
                    nm+=prods;
                }
                srv.set('name',nm);
            }
            if (this.options.isnew){
                this.model.get('services').add(this.options.service);
            }
        },
        savePosition:function(){
            this.fillModel();
            this.model.trigger("change");
            this.closeModal();
        },
        saveAddPosition:function(){
            this.fillModel();
            this.model.trigger("change");
            this.options.isnew = true;
            this.options.service = new ServiceModel();
            this.render();
        },
        removePosition:function(){
            this.options.service.destroy();
            this.model.trigger("change");
            this.closeModal();
        }
    });

/*** Виды ***/

var OrderTableItemView = Backbone.View.extend({
    //tagName:'table',
    tagName:'table',
    // className: 'row table-item',
    className: 'table-item',
    sost_days: null,
    events:{
        'click .order-history-lnk': 'showHistory',
        'click .lnk-google-docs': 'openGoogleDocs',
        'click .show-tasks-lnk': 'showTask',
        'click .order-structure-lnk': 'showStructure',
        'click .client-card-lnk': 'showClient',
        'click .client-card-favorite': 'changeFavorite',
        'click .client-card-public': 'changeState'
    },
    initialize:function(){
        this.template = _.template($('#orderTableItemTemplate').html());
        this.sost_days = window.SOSTDAYS;
        var self = this;
        this.model.on('change', function(){self.render()});
        if(self.model.get('documents') && self.model.get('documents')['status']== 'in_process')
            setTimeout(function(){self.checkGoogleDocStatus();},10000);
    },
    showLoader:function(){
            $.blockUI({'message':'<img src="/static/img/spinner.gif">', 'css':{'border':'none', 'backgroundColor':'transparent'}, 'overlayCSS':{'backgroundColor':'#fff', 'cursor':'pointer'}});
    },
    hideLoader:function(){
            $.unblockUI();
    },
    render: function() {
        var self = this;
        this.$el.empty().html(this.template(this.model.toJSON()));
        if (this.model.get('task_date') != ''){
            if (moment(this.model.get('task_date'), "DD.MM.YYYY").hour(23).minute(59) < moment().hour(0).minute(0) ){
                this.$el.addClass('red-order');
            }
            else if (this.model.get('task_date') == moment().format("DD.MM.YYYY") ){
                this.$el.addClass('green-order');
            }
            else if (typeof this.model.get('ignore_state_date') !== 'undefined' && this.model.get('ignore_state_date') != 'no'){
                this.$el.addClass('blue-order');
            }
        }
        if (this.model.get('condition_type') == 'закрывающее'){
            return this;
        }
        if (!(this.model.get('condition') == window.ORDER_CONDITIONS['INTEREST'] && this.model.get('l_state_initiator') == "Мы") && this.model.get('datetime') && Routine.add_work_days(moment(this.model.get('datetime'), ['DD.MM.YYYY', 'DD.MM.YYYY HH:mm:ss']).hour(23).minute(59), this.sost_days[this.model.get('condition')]) < moment()) {
                this.$el.addClass('red-condition');
        }
        if (typeof this.model.get('ignore_state_date') !== 'undefined' && this.model.get('ignore_state_date') != 'no'){
            this.$el.addClass('grey-condition');
        }
        else{
            this.$el.removeClass('grey-condition');
        }
        return this;
    },
    showClient: function(){
        /*var cm = new ClientModel();
        cm.set({'id':this.model.get('client_id')});
        var cc = new ClientCardView({model:cm, el:$('#client-card-modal'), orderid:this.model.get('id')});
        // cc.show();
        $('#client-card-modal').modal('show');*/

    },
    changeFavorite: function(e){
        alert('fav');
        var star = $(e.target);
        var fav = 'off';
        if (star.data('status') == 'off'){
            fav = 'on';
        }
        else{
            fav = 'off';
        }
        var self = this;
        var data = {'id':this.model.get('id'), 'favorite': fav};
        //$.blockUI({'message':'<img src="/static/img/spinner.gif">', 'css':{'border':'none', 'backgroundColor':'transparent'}, 'overlayCSS':{'backgroundColor':'#fff', 'cursor':'pointer'}});
        $.post('/handlers/favorite', data).done(function() {
            if (fav == 'off'){
                star.data('status', 'off');
                star.removeClass('fa-star').addClass('fa-star-o');
                self.model.set({'favorite':'off'});
            }
            else{
                star.data('status', 'on');
                star.removeClass('fa-star-o').addClass('fa-star');
                self.model.set({'favorite':'on'});
            }
        }).always(function(){$.unblockUI();});

    },
    changeState: function(e){
        var data = {'id':this.model.get('id')};
        var self = this;
        //$.blockUI({'message':'<img src="/static/img/spinner.gif">', 'css':{'border':'none', 'backgroundColor':'transparent'}, 'overlayCSS':{'backgroundColor':'#fff', 'cursor':'pointer'}});
        $.post('/handlers/public', data).done(function() {
            self.model.set('state', 'published');
            self.$el.find('.wait-state').remove();
        }).always(function(){$.unblockUI();});
    },
    showHistory:function(){
        $.scrollTo('#history-list');
        // var hf = new HistoryFormView({el: $('#history-list'), model: this.model});
        // hf.show();
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
                    self.model.set({'documents': result['documents']});
                    if(MANAGER == result['documents']['manager'])
                        $.jGrowl('Ошибка при создании каталога документов на гугл диске для заявки №'+self.model.get('number').toString()+'. Подробности: '+Routine.stripTags(self.model.get('documents')['note'])+'.', { 'themeState':'growl-error', 'sticky':false, life: 10000, 'position': 'bottom-right' });
                }
                else if (self.model.get('documents')['status'] == 'in_process')
                    setTimeout(function(){self.checkGoogleDocStatus();},10000);
                }).fail(function(jqXHR, textStatus, errorThrown ) {
                    $.jGrowl('Ошибка при создании каталога документов на гугл диске для заявки №'+self.model.get('number').toString()+'. Возможно у вас не хватает прав для выполнения данной операции.', { 'themeState':'growl-error', 'sticky':false, life: 10000, 'position': 'bottom-right' });
            });
    },

    /**
    ** Клик по ссылке на документы заявки
    **/
    openGoogleDocs:function(e){
        var lnk = $(e.target);
        var self = this;
        // проверка на наличие папки документов на гугл диске
        if(self.model.get('documents') && this.model.get('documents')['status'] == 'in_process')
        {
            $.jGrowl('Для данной заявки документы находятся в процессе создания. Дождитесь сообщения о завершении создания документов и повторите попытку.', { 'themeState':'growl-success', 'sticky':false, life: 5000, 'position': 'bottom-right' });
        }
        else if (!self.model.get('documents') || !self.model.get('documents')['status']  || self.model.get('documents')['status']=='error')
        {
            // вопрос о создании
            bootbox.confirm("Каталога с файлами нет. Создать?", function(result){
                if(result)
                {
                     self.model.set({'documents': {'status':'in_process'}});
                     setTimeout(function(){ self.checkGoogleDocStatus(true); }, 5000);
                }
                else
                    return;
            });
        }
        else
        {
            // переход к документам
            var win = window.open('https://drive.google.com/drive/folders/'+self.model.get('documents')['folder_id'], '_blank');
        }
    },
    showTask:function(){
        //var hf = new TaskFormView({el: $('#task-modal'), model: this.model});
        //hf.show();
        $.scrollTo('#tasks-list');
    },
    showStructure:function(){
        $.scrollTo('#products-list');
        // var pt = new ProductTableView({isnew:false,model: this.model});
        // pt.show();
    }
});

var CorrespondentView = Backbone.View.extend({
    corr_is_new:true,
    old_correspondent: "",
    find_list:[],
    events: {
        'click #add-btn': 'addNew',
        'click #select-corr': 'findExCorrespondent',
        'blur #correspondent': 'onBlur',
        'keydown #correspondent': 'onKeyPress',
        'keypress #correspondent': 'onKeyPress'

    },
    initialize: function () {
        this.template = _.template($('#correspondentTemplate').html());
        this.render();
    },
    corrIsNew: function(is_new){
        this.corr_is_new = is_new;
    },

    corrAjax:function(corr_str, ok){
        $.get("/handlers/clientnamefind/?type=adresat&q=" + encodeURIComponent(Routine.trim(corr_str) ))
        .done(ok);
    },

    findExCorrespondent: function(){
       var $ddm = this.$('#corr-dropdown-menu');
        var self = this;
        var $corr = this.$('#correspondent');
        this.$('#cor-exists').hide();
        $ddm.empty();
        var dd_li = '';
        this.find_list.forEach(function(e){
            dd_li += '<li><a data-name="'+Routine.trim(e.name.replace(/\"/g,'&quot;'))+'" data-id="'+e.id+'" tabindex="-1" href="javascript:;">'+e.name+'<br><span class="small-grey">'+e.addr+'</span></a></li>';
            });
        $ddm.html(dd_li);
        if (this.find_list.length > 0)
            $ddm.show();

                $('a', $ddm).on('click', function(){
                    $corr.val($(this).data('name').toString().replace('&quot;','"'));
                    $corr.data('id', $(this).data('id'));
                    $ddm.hide();
                });
    },

    findCorrespondent: function(){
        var $corr = this.$('#correspondent');
        var corr_str = $corr.val();
        var $ddm = this.$('#corr-dropdown-menu');
        $ddm.hide();
        var self = this;
        $corr.data('id', '');
        this.find_list = [];
        if (corr_str.length < 2) return;
        var done = function(ret){
            $ddm.empty();
                if (ret.result.length > 0){
                    this.corrIsNew(false);
                    var dd_li = '';
                    ret.result.forEach(function(e){
                        if (Routine.trim(e.name).toLowerCase() === Routine.trim(corr_str).toLowerCase()){
                            self.find_list.push(e);
                        }
                        dd_li += '<li><a data-name="'+Routine.trim(e.name).replace(/\"/g,'&quot;')+'" data-type="'+e.type+'" data-id="'+e.id+'" tabindex="-1" href="javascript:;">'+e.name+'<br><span class="small-grey">'+e.addr+'</span></a></li>';
                    });
                    $ddm.html(dd_li);
                    $ddm.show();
                $('a', $ddm).on('click', function(){
                    $corr.val($(this).data('name').toString().replace('&quot;','"'));
                    $corr.data('id', $(this).data('id'));
                    $corr.data("type",$(this).data("type"));
                    $ddm.hide();
                });
                }
                else{
                    this.corrIsNew(true);
                }

        }.bind(this);
        this.corrAjax(corr_str,done);
    },

    /**
     * Автовыбор корреспондента
    **/
    autoselectCorr: function(){
        var self = this;
        var name = this.$('#correspondent').val();
        if (name != '')
        {
            if(this.find_list.length > 0)
            {
                //this.$('#cor-exists').show();
                bootbox.confirm({
                        message: 'Введённое название существует в БД. Установить связь?',
                        buttons: {
                            'cancel': {
                                label: 'Нет',
                            },
                            'confirm': {
                                label: 'Да',
                            }
                        },
                        callback: function(result) {
                            if (result)
                            {
                                if(self.find_list.length === 1)
                                {
                                    self.$('#correspondent').data('id', self.find_list[0].id);
                                    return;
                                }
                                else
                                    self.findExCorrespondent();
                            }
                        }
                });
            }
        }
    },

    onKeyPress: function(e)
    {
        if(e.keyCode!=13){
            this.$('#correspondent').data('id','');
            this.corrIsNew(true);
            this.find_list = [];
        }
         //console.log("1");
    },

    /**
     * Потеря фокуса на поле ввода корреспондента
    **/
    onBlur: function(e)
    {
        var self = this;
        setTimeout( function()
        {
            var $corr = this.$('#correspondent');
            if($corr.val())
            {
                   var $ddm = this.$('#corr-dropdown-menu');
                   if ($ddm.is(':visible'))
                        $ddm.hide();

                 //if (this.corr_is_new && $corr.data('id') === '')
                 if (self.find_list.length<1  && $corr.data('id') === '')

                 {
                    bootbox.confirm({
                            message: 'Введено новое значение, которое не найдено в БД! Это может привести с захламлению БД и нарушению важных связей. <br/>Возможно, требуется изменить написание значения или его формулировку. <br/>Хотите попробовать другое написание, чтобы подобрать одно из уже существующих в БД значений?',
                            buttons: {
                                'cancel': {
                                    label: 'Нет'
                                },
                                'confirm': {
                                    label: 'Да'
                                }
                            },
                            callback: function(result) {
                                if (result)
                                {
                                    setTimeout(function(){
                                        this.$('#correspondent').focus();
                                    }.bind(self), 100);
                                }
                            }
                    });
                }
                else
                {
                    //setTimeout( function(){
                    var $corr = this.$('#correspondent');
                    var $corr_ex = this.$('#cor-exists');
                    //if (!this.corr_is_new && $corr.data('id') === ''){
                    if (self.find_list.length>0 && $corr.data('id') === ''){
                        this.autoselectCorr();
                    }
                        //}.bind(this),200);
                }
            }
         }.bind(this),200);
    },

    /**
     * Рендеринг
    **/
    render: function () {
        this.$el.html(this.template(this.options));
        var $corr = this.$('#correspondent');
        this.$('#corr-dropdown').dropdown();
        var debounced = _.debounce(this.findCorrespondent.bind(this), 300);
        $corr.on('keyup', debounced);
        $corr.on('focusin', function(){
            this.$('.alert-success').html('').hide();
            this.$('#cor-exists').hide();
        }.bind(this));
        return this;
    },

    /**
     * Добавление
    **/
    addNew: function (e) {
        e.preventDefault();
        this.$('#cor-exists').hide();
        var $corr = this.$('#correspondent');
        if (this.$('#outgoing-type').val() === ""){
            $.jGrowl('Выберите тип!', { 'themeState':'growl-error', 'sticky':false, life: 5000, 'position': 'bottom-right' });
            return;
        }
        var corr_name = Routine.trim($corr.val());
        if (corr_name === ""){
            $.jGrowl('Выберите корреспондента!', { 'themeState':'growl-error', 'sticky':false, life: 5000, 'position': 'bottom-right' });
            return;
        }
        if (this.$('#outgoing-note').val() === ""){
            $.jGrowl('Введите краткое содержание документа!', { 'themeState':'growl-error', 'sticky':false, life: 5000, 'position': 'bottom-right' });
            return;
        }
        var self = this;
        var md = new OutgoingModel();
        Routine.showLoader();
        md.set({
            correspondent: corr_name,
//            correspondent_id: $corr.data('id'),
            type: this.$('#outgoing-type').val(),
            note: this.$('#outgoing-note').val(),
            number: 0,
            date: ''
        });
        if($corr.data('type')=="contragent")
            md.set("contragent_id",$corr.data('id'));
        else
            md.set("correspondent_id",$corr.data('id'));

        md.save().done(function (ret) {
            self.collection.add(ret.data);
            self.$('#correspondent').val("").data('id','');
            self.$('#outgoing-name').val("");
            self.$('#outgoing-type').val("");
            self.$('#outgoing-note').val("");
            self.$('#correspondent').data('id','');
            self.corr_is_new = true;

            self.$('.alert-success').html('Исх. № '+ret.data.number+' от '+ ret.data.date)
                .show();
        }).always(function(){Routine.hideLoader();});
    }
});

/**
* продукты
*/
var ProductTableView = Backbone.View.extend({
    el: $('#products-list'),
    isnew:true,
    events:{
        'click .add-new-position': 'addNewPosition',
        'click .add-new-service': 'addNewService',
        'click .close-production': 'closeView',
        'click .quick-enter': 'showHistory',
        'click .save-and-close': 'saveAndClose',
        'click .find-like': 'findLike',
        'change .total-delivery, .total-montaz, .markup':'recalcTotalMoney',
        'click .save-linked-orders': 'onSaveLinkedOrders',
        'change .is-tender':'onChangeTender',

        'click #add-btn': 'addNew',
        'click #select-corr': 'findExCorrespondent',
        'blur #correspondent': 'onBlur',
        'keydown #correspondent': 'onKeyPress',
        'keypress #correspondent': 'onKeyPress'
    },
    initialize:function(){
        this.template = _.template($('#productTableTemplate').html());
        var self = this;
        if(!this.options.isnew){
            this.model.fetch({timeout:50000}).complete(function(){
                self.render();
                self.listenTo(self.model, 'change reset add remove', self.render);
            });
        }
        else{
            this.render();
            this.listenTo(this.model, 'change reset add remove', this.render);
        }
    },
    onChangeTender: function(el) {
        if ($(el.target).val().indexOf('they') > -1) {
            $('#correspondent-dropdown').show();
            $('#correspondent').val('');
        } else {
            $('#correspondent-dropdown').hide();
        }
    },
    onSaveLinkedOrders: function(){
        var id = $('.linked-orders').data('id');
        var old_products = this.model.get('products');
        var new_products = [];
        var temp = $(".linked-order-list").tokenInput("get");
        var order_numbers = [];
        for (i=0; i<temp.length;i++){
            order_numbers.push(temp[i]['name']);
        };
        _.each(old_products.models, function (item) {
            if (item.get('_id') == id) {
                item.set('linked_orders', order_numbers);
            }
            new_products.push(item);
        },this);
        this.model['products'] = new_products;
        this.model.save();
        $('.linked-orders').hide();
        $('.product-links').removeClass('selected');
    },
    addNewService:function(){
        var pm = new ServiceModel();
        var pf = new ServiceFormView({el: $('#position-modal'), model: this.model, service:pm, isnew:true});
        pf.show();
    },
    renderOneService:function(item){
        var view = new ServiceTableItemView({model: this.model, service:item});
        this.$(".services-table tbody").append(view.render().el);
        return view;
    },
    render:function(){
        var self = this;
        this.$el.html(this.template(this.model.toJSON()));
        if(!this.options.isnew){
            this.$('.quick-enter').hide();
        }
        if (this.model.get('total_shef_montaz') == 'yes'){
            this.$('.total-shef-montaz').prop('checked', true);
        }
        var hc = this.model.get('products');
        _.each(hc.models, function (item) {
            self.renderOne(item);
        },this);

        var serv_cost = 0;
        appr = '';
        _.each(this.model.get('services').models, function (item) {
            self.renderOneService(item);
            serv_cost+=item.get("price");
            if (item.get('approx') == 'yes')
                appr = 'yes-approx';
        }, this);
        this.$('.serv-total-price').text($.number( serv_cost, 2, ',', ' ' )).addClass(appr);

        this.recalcTotalMoney();


                // if (this.model.get('closed') == 'yes'){
        //  this.$('.add-new-position').hide();
        //  this.$('.save-and-close').hide();
        // }
        this.$('.total-montaz, .total-delivery, .project-personal-from, .project-personal-to').numeric({ decimal: false, negative: false });

        this.$('.markup').numeric({ decimal: ',', negative: false,decimalPlaces:2 });
        this.$('.like-props').select2({placeholder: "Критерии поиска"});


        this.$('.project-date-start, .project-date-finish').datepicker({weekStart:1, format:'dd.mm.yyyy'});

        this.$('.project-date-start, .project-date-finish').on('changeDate', function(){
                self.resetDateLength();
        }).on("blur", function(){
                self.resetDateLength();
        });

        this.resetDateLength();


        this.$el.find(".projects-list").tokenInput('/handlers/projects/search_tn', {
            method:'POST',
            minChars:2,
            hintText:'Поиск проекта',
            noResultsText:'Проекты не найдены',
            cont:null,
            searchingText:'Поиск',
            onResult:function(results){
                var nums = [self.model.get('number')+''];
                var nl = self.$(".projects-list").tokenInput('get');
                var res = [];
                for(var i in results){
                    var is_find = false;
                    for(var j in nl){
                        if(nl[j]['id']==results[i]['id']){
                            is_find = true;
                            break;
                        }
                    }
                    if(!is_find)
                        res.push(results[i]);
                }
                return res;
            },
            onCachedResult:function(results){
                var nums = [self.model.get('number')+''];
                var nl = self.$(".projects-list").tokenInput('get');
                var res = [];
                for(var i in results){
                    var is_find = false;
                    for(var j in nl){
                        if(nl[j]['id']==results[i]['id']){
                            is_find = true;
                            break;
                        }
                    }
                    if(!is_find)
                        res.push(results[i]);
                }
                return res;
            }
        });


        _.each(this.model.get('projects'),function(item){
            self.$el.find(".projects-list").tokenInput('add',{'id':item.project_id,'name':item.project_name});
        });






        $(".linked-order-list").tokenInput('/handlers/contracts/search_order_tn', {
                method:'POST',
                minChars:2,
                hintText:'Поиск заявки',
                noResultsText:'Заявки не найдены',
                cont:null,
                searchingText:'Поиск',
                onResult:function(results){
                    var nums = [self.model.get('number')+''];
                    var nl = $(".linked-order-list").tokenInput('get');
                    for(var i in nl)
                        nums.push(nl[i]['name']);
                    var res = [];
                    for(var i in results){
                        var is_find = false;
                        for(var j in nums){
                            if(results[i]['name']==nums[j]){
                                is_find = true;
                                break;
                            }
                        }
                        if(!is_find)
                            res.push(results[i]);
                    }
                    return res;
                },
                onCachedResult:function(results){
                    var nums = [self.model.get('number')+''];
                    var nl = $(".linked-order-list").tokenInput('get');
                    for(var i in nl)
                        nums.push(nl[i]['name']);
                    var res = [];
                    for(var i in results){
                        var is_find = false;
                        for(var j in nums){
                            if(results[i]['name']==nums[j]){
                                is_find = true;
                                break;
                            }
                        }
                        if(!is_find)
                            res.push(results[i]);
                    }
                    return res;
                }
            });

        var need_display = (this.model.get('is_tender') == 'they-open' || this.model.get('is_tender') == 'they-closed');
        var correspondentView = new CorrespondentView({need_display: need_display, correspondent: this.model.get('correspondent')});
        this.$('.correspondent-block').html(correspondentView.render().el);
//        var view = new ServiceTableItemView({model: this.model, service:item});
//        this.$(".services-table tbody").append(view.render().el);
//        return view;

        return this;
    },

    resetDateLength:function(){
        var start = this.$('.project-date-start').val()
        var end = this.$('.project-date-finish').val();
        if(start && end){
            start = Routine.parseDate(start,"dd.mm.yyyy");
            end = Routine.parseDate(end,"dd.mm.yyyy");
            this.$(".project-date-length").html(Math.ceil(moment(end).diff(start,'month')));
        }else
            this.$(".project-date-length").html("0");
    },

    recalcTotalMoney:function(){
        var tn = 0;
            var tp = 0;
            var ts = 0;
            var td = 0;
            var tm = 0;
            var appr = '';
            var appr_sq = '';
            var hc = this.model.get('products');
            _.each(hc.models, function (item) {
                //self.renderOne(item);
                if (item.get('approx') == 'yes')
                    appr = 'yes-approx';
                if (item.get('approx_sq') == 'yes')
                    appr_sq = 'yes-approx';
                var cnt = parseInt(item.get('count'));
                tn += cnt;
                tp += cnt*item.get('price');

                _.each(item.get("positions"),function(ps){
                    td+=Routine.strToFloat(ps.delivery||0);
                    tm+=Routine.strToFloat(ps.mont_price||0)*(ps.mont_price_type?1:parseInt(ps.num));
                    //tp+=td+tm;
                })

                ts += cnt*parseFloat(item.get('sq'));
            }, this);

            services_cost = 0;
            _.each(this.model.get('services').models,function(item){
                services_cost += item.get("price");
            });

            this.$('.total-num').text(tn);
            this.$('.total-price').text(Routine.priceToStr(tp+td+tm, '0,00', ' ')).addClass(appr);
            this.$('.total-price-goods').text(Routine.priceToStr(tp, '0,00', ' ')).addClass(appr);
            this.$('.total-price-delivery').text(Routine.priceToStr(td, '0,00', ' ')).addClass(appr);
            this.$('.total-price-montag').text(Routine.priceToStr(tm, '0,00', ' ')).addClass(appr);
            this.$('.total-sq').text($.number( ts, 2, ',', ' ' )).addClass(appr_sq);
            var total_money = services_cost+tp+td+tm+Routine.strToFloat(this.$(".total-delivery").val())+Routine.strToFloat(this.$(".total-montaz").val());
            this.$(".total-money span").text(Routine.priceToStr(total_money, '0,00', ' ')).addClass(appr);
    },

    renderOne: function(item){
        var view = new ProductTableItemView({model: this.model, product:item});
        this.$(".products-table tbody").append(view.render().el);
        return view;
    },

    findLike:function(){
            if (this.$('.like-props').select2("val").length == 0){
                return;
            }
            var params = this.$('.like-props').select2("val");
            var data = {};
            var self = this;
            var sq = [],
                addr = this.model.get('total_address'),
                name = [];
            _.each(params, function(i){


                _.each(self.model.get('products').models, function(pr){
                    sq.push(pr.get('sq'));
                    // addr.push(pr.get('addr'));
                    name.push(pr.get('name'));
                });
            }, this);
            if (params.indexOf('1') > -1){
                data['sq'] = sq;
            }
            if (params.indexOf('2') > -1){
                data['addr'] = addr;
            }
            if (params.indexOf('3') > -1){
                data['name'] = name;
            }
            data['id'] = this.model.get("id");
            $.blockUI({'message':'<img src="/static/img/spinner.gif">', 'css':{'border':'none', 'backgroundColor':'transparent'}, 'overlayCSS':{'backgroundColor':'#fff', 'cursor':'pointer'}});
            $.ajax({
                type: "POST",
                url: "/handlers/similar",
                data:JSON.stringify(data),
                timeout: 55000,
                contentType: 'application/json',
                dataType: 'json',
                async:true
                }).done(function(ret){
                    if (ret.data.length>0){
                        var st = '<h3>Найденные заявки:</h3><dl>';
                        _.each(ret.data, function(i){
                            var tp = _.template($('#likeItemTemplate').html());
                            st += tp(i);
                        });
                        st +='</dl>';
                        self.$('.similar-list').html(st);
                    }
                    else{
                        self.$('.similar-list').html("Похожих не найдено.");
                    }

            }).always(function(){
                $.unblockUI();
            });
        },

    addNewPosition: function(){
        this.fillData();
        var pm = new ProductModel();
        // this.model.get('products').add(pm);
        var pf = new PositionFormView({el: $('#position-modal'), model: this.model, product:pm, isnew:true});
        pf.show();
    },
    fillData:function(){
        var self = this;
        var linked_orders = [];
        var correspondent = self.$('#correspondent').val();
        var is_tender = self.$('.is-tender').val();
        /*var nl = self.$(".same-order-list").tokenInput('get');
        for(var i in nl)
            linked_orders.push(parseInt(nl[i]['name']));*/

        var nl = self.$(".projects-list").tokenInput("get");
        var projects = [];
        for(var i in nl)
            projects.push({'project_id':nl[i].id, 'project_name':nl[i].name});


        if($('#correspondent').data('type')=="contragent")
            self.model.set("contragent_id",$('#correspondent').data('id'));
        else
            self.model.set("correspondent_id",$('#correspondent').data('id'));
        self.model.set({
            'total_address' : self.$('.total-address').val(),
            'total_montaz' : self.$('.total-montaz').val(),
            'markup' : Routine.strToFloat(self.$('.markup').val()),
            'total_delivery' : self.$('.total-delivery').val(),
            'total_shef_montaz' : self.$('.total-shef-montaz').is(':checked')?'yes':'no',

            /*'project_name':self.$(".project-name").val(),
            'project_personal_from':self.$(".project-personal-from").val()?parseInt(self.$(".project-personal-from").val()):'',
            'project_personal_to':self.$(".project-personal-to").val()?parseInt(self.$(".project-personal-to").val()):'',
            'project_start':self.$(".project-date-start").val(),
            'project_finish':self.$(".project-date-finish").val(),
            'project_note':self.$(".project-note").val(),
            'linked_orders':linked_orders,*/
            'is_tender': is_tender,
            'correspondent': correspondent,
            'projects':projects
        });
    },

    saveAndClose:function(){
        var self = this;
        var fn = function(){
            self.model.save().done(function(){
                // self.closeView();
            });
        };

        if(this.model.get('condition')){
            var currentStateName = DICTS[this.model.get('condition')]
            var currentStateInfo = DICTS.condition.find((x)=>x.name==currentStateName);
            if(currentStateInfo && currentStateInfo['price']=='enabled' && ( !this.$('.markup').val() || Routine.strToFloat(this.$('.markup').val())===0)) {
                Routine.showMessage('Необходимо заполнить наценку.','error')
                return;
            }
        }

        if ($(this.$('.is-tender')).val().indexOf('they') > -1 && this.$('#correspondent').val() == '') {
            Routine.showMessage('Укажите адресата','error')
            return;
        }

        self.fillData();
        var is_changed = this.model.hasChanged('markup') || this.model.hasChanged('total_address') || this.model.hasChanged('total_montaz') || this.model.hasChanged('total_delivery') || this.model.hasChanged('total_shef_montaz') || this.model.hasChanged('is_tender');
        if(is_changed && self.model.get("condition_type")!="начальное")
            var dlg = new ConfirmSaveChanges({model:this.model, 'onok':fn});
        else
            fn();

    },
    closeView:function(){
        this.close();
        app_router.navigate('');
        eventBus.off('close', this.closeView, this);
        $('#order-item').show();
    },
    close: function(){
        this.$el.hide().empty();
        this.undelegateEvents();
        this.$el.removeData().unbind();
    },
    show:function(){
        eventBus.on('close', this.closeView, this);
        $('#order-item').hide();
        this.$el.show();
    },
    showHistory:function(){
        var hf = new HistoryFormView({el: $('#history-list'), model: this.model});
        var self = this;
        hf.show();
        //$('#history-list').modal('show').on('shown', function(){self.closeView();});
    }
});

/**
 * Продукт
 */
var ProductTableItemView = Backbone.View.extend({
    events:{
        'click .show-position': 'showPosition',
        'click .product-links': 'linkedDialog'
    },
    tagName:'tr',
    product:null,
    initialize:function(){
        this.template = _.template($('#productTableItemTemplate').html());
    },
    render: function() {
        this.$el.html(this.template(this.options.product.toJSON()));
        return this;
    },
    linkedDialog:function(el){
        var is_selected = $(el.target).hasClass('selected');
        $('.linked-orders').data('id', this.options.product.get('_id'));
        $('.product-links').removeClass('selected');
        if (is_selected) {
            $('.linked-orders').hide();
        } else {
            $(".linked-order-list").tokenInput("clear");
            _.each(this.options.product.get('linked_orders'),function(item){
                $(".linked-order-list").tokenInput('add',{'id':item,'name':item});
            });

            $(el.target).addClass('selected');
            $('.linked-orders').show();
        }
        $('.linked-orders').offset({top:$(el.target).offset().top+21, left: $(el.target).offset().left+20});
    },
    showPosition:function(){
        var pf = new PositionFormView({el: $('#position-modal'), model: this.model, product:this.options.product, isnew:false});
        pf.show();
        //$('#position-modal').modal('show');
    }
});

/**
 * Позиции
 */
var PositionFormView = Backbone.View.extend({
    events:{
        'click .save-position': 'savePosition',
        'click .save-add-position': 'saveAddPosition',
        'click .add-addr': 'addAddr',
        'click .remove-addr': 'removeAddr',
        'click .close-position': 'closeModal',
        'click .remove-position': 'removePosition',
        'change .isapprox': 'changeApprox',
        'change .isapprox-sq': 'changeApproxSq',
        'change .pos-number': 'recalcMoney',
        'change .mont-price, .pos-delivery, .construction-price, .construction-sq, .mont_type': 'recalcMoney'
    },
    product:null,
    isapprox:false,
    isnew:false,
    initialize:function(){
        this.template = _.template($('#positionTableTemplate').html());
        this.render();
        if (this.options.isnew){
            this.addAddr();
        }
    },
    show:function(){
        eventBus.on('close', this.closeModal, this);
        this.$el.modal('show');
    },
    changeApprox:function(el){
        if ($(el.target).is(':checked')){
            // this.$('.construction-price').prop('readonly', false);
            this.isapprox = true;
        }
        else{
            // this.$('.construction-price').prop('readonly', true);
            this.isapprox = false;
            this.recalcMoney();
        }
    },
    changeApproxSq:function(el){
            if ($(el.target).is(':checked')){
                this.isapprox_sq = true;
            }
            else{
                this.isapprox_sq = false;
            }
        },
    recalcMoney:function(){
        var one_sq = 0;
        var one_price = Routine.strToFloat(this.$('.construction-price').val());

        if (!isNaN(parseFloat(this.$('.construction-sq').val().replace(',','.')))){
            one_sq = parseFloat(this.$('.construction-sq').val().replace(',','.'));
        }
        var summa = 0;
        var mnt_summa = 0;
        var total_sq = 0;
        var dos_summa = 0;
        this.$('.products-table .row').each(function(item){
                var cnt = parseInt($('.pos-number', this).val().replace(',','.'));
                var mont = Routine.strToFloat($('.mont-price', this).val());
                var dost = Routine.strToFloat($('.pos-delivery', this).val());
                var mtype = parseInt($('.mont_type', this).val());
                if (isNaN(cnt)){
                    cnt = 0;
                }

                total_sq += cnt*one_sq;
                summa += cnt*one_price;
                mnt_summa += mont*(mtype?1:cnt);
                dos_summa += dost;
                if(cnt>1)
                    $('.mont_type', this).prop('disabled',false);
                else
                    $('.mont_type', this).prop('disabled',true);
            });


        var kvm = summa/total_sq;
        this.$('.pos-total-price').text(Routine.priceToStr(summa, '0,00', ' '));
        this.$('.pos-total-montaz').text(Routine.priceToStr(mnt_summa, '0,00', ' '));
        this.$('.pos-total-delivery').text(Routine.priceToStr(dos_summa, '0,00', ' '));
        this.$('.pos-total-all').text(Routine.priceToStr(summa + mnt_summa+dos_summa, '0,00', ' '));
        this.$('.pos-total-sq').text(Routine.priceToStr(total_sq, '0,00', ' '));
        this.$('.pos-total-kvm').text(isNaN(kvm)?0:$.number( kvm, 2, ',', ' ' ));
        return summa;
        if (!this.isapprox){
            var summa = 0;
            this.$('tbody tr').each(function(item){
                var cnt = $('.pos-number', this).val().replace(',','.');
                var prc = Routine.strToFloat($('.pos-price', this).val());

                if (isNaN(parseInt(cnt))){
                    cnt = 0;
                }
                summa += cnt*prc;

            });
            this.$('.construction-price').val(summa);
        }
    },
    removeAddr:function(el){
        par = $(el.target).parents('.row')[0];
        $(par).remove();
        this.recalcMoney();
    },
    render:function(){

        this.$el.html(this.template(this.options.product.toJSON()));
        var apx = this.options.product.get('approx');
        if (apx == 'yes'){
            this.isapprox = true;
            this.$('.isapprox').prop('checked', true);
            // this.$('.construction-price').prop('readonly', false);
        }
        var apx_sq = this.options.product.get('approx_sq');
            if (apx_sq == 'yes'){

                this.isapprox_sq = true;

                this.$('.isapprox-sq').prop('checked', true);

            }
        this.$('.construction-type').val(this.options.product.get('type'));
        var posc = this.options.product.get('positions');
        var ln =  _.template($('#positionItemTemplate').html());
        var self = this;
        _.each(posc, function (item) {
            item.montcheck = '';
            item.shmontcheck = '';
            if (item['mont'] == 'yes'){
                item.montcheck = 'checked';
            }
            if (item['shmont'] == 'yes'){
                item.shmontcheck = 'checked';
            }
            self.$('.products-table').append(ln(item));
        }, this);

        // подключение  автопоиска по продукции
        var foo = this.$('.constuction-target').data('source');
        if (foo.indexOf(this.options.product.get('name')) == -1){
            foo.push(this.options.product.get('name'));
        }
        var bar = [];
        _.each(foo, function(item){bar.push({'id':item, 'text':item})});
        this.$('.constuction-target').select2({
                data: bar,
                createSearchChoice:function(term, data) { if ($(data).filter(function() { return this.text.localeCompare(term)===0; }).length===0) {return {id:term, text:term};} }
            }
        );
        this.$('.constuction-target').select2("val",this.options.product.get('name') );

        this.$('.pos-price, .pos-delivery, .mont-price').numeric({ decimal: ',', negative: false,decimalPlaces:2 });
        this.$('.pos-number').numeric({ decimal: false, negative: false });
        this.$('.construction-price').numeric({ decimal: ',', negative: false,decimalPlaces:2 });
        this.$('.construction-sq, .construction-length, .construction-width, .construction-height').numeric({ negative: false, decimal: ',' });
        if (this.options.product.get('type') != ''){
            this.$('.remove-position').removeClass('hide');
        }

        // if (this.$('.constuction-target option[value='+this.options.product.get('name')+']').length > 0)
        //  this.$('.constuction-target').select2("val",this.options.product.get('name') );
        // else{
        //  this.$('.constuction-target').append('<option value="'+this.options.product.get('name')+'">'+this.options.product.get('name')+'</option>');
        //  this.$('.constuction-target').select2("val",this.options.product.get('name') );
        // }
        this.$el.on('hidden', function () {
            self.$el.empty();
            self.undelegateEvents();
            self.$el.removeData().unbind();
        });
        this.recalcMoney();
        return this;
    },
    _saveAddPosition:function(){
        var totsum = this.recalcMoney();
        var posc = new PositionCollection();
        var nums = 0;
        var addrs = '';
        var is_complect = this.$el.find(".is_complect").is(":checked");
        this.$('.products-table .row').each(function(item){
            var posm = new PositionModel();
            var nm = $('.pos-number', this).val();
            var addr = $('.pos-addr', this).val();
            posm.set({
                'num': nm,
                // 'price': $('.pos-price', this).val(),
                'addr': addr,
                'delivery': Routine.strToFloat($('.pos-delivery', this).val()),
                'mont_price': Routine.strToFloat($('.mont-price', this).val()),
                'mont_price_type':parseInt($('.mont_type', this).val()),
                'shmont': $('.pos-shmont', this).is(':checked')?'yes':'no'
            });
            if (isNaN(parseInt(nm))){
                nm = 0;
            }
            nums += parseInt(nm);
            addrs += nm + ' ед. - '+ addr + ', ';

            posc.add(posm);
        });
        if (addrs.length > 2){
            addrs = addrs.substring(0, addrs.length - 2);
        }
        this.options.product.set({
            'type': this.$('.construction-type').val(),
            //'name': this.$('.constuction-name').val(),
            'name': this.$('.constuction-target').select2("val"),
            'sq': this.$('.construction-sq').val().replace(',','.'),
            'length': this.$('.construction-length').val(),
            'width': this.$('.construction-width').val(),
            'height': this.$('.construction-height').val(),
            'count': nums,
            'price': Routine.strToFloat(this.$('.construction-price').val()),
            'approx': this.$('.isapprox').is(':checked')?'yes':'no',
            'approx_sq': this.$('.isapprox-sq').is(':checked')?'yes':'no',
            'positions': posc,
            'addrs': addrs,
            'is_complect':is_complect
        });
        if (this.options.isnew){
            this.model.get('products').add(this.options.product);
        }
        var self = this;
        //this.model.set('price',totsum,{silent: true});
        this.model.save().done(function(){
            self.options.isnew = true;
            self.options.product = new ProductModel();
            self.render();
            self.addAddr();
        });
    },
    saveAddPosition:function(){
        var self = this;

        var is_br = false;
        var is_complect = this.$el.find(".is_complect").is(":checked");
        if(self.$('.products-table .row').length==0){
            $.jGrowl("Необходимо задать адрес", { 'themeState':'growl-error', 'sticky':false, life: 10000, 'position': 'bottom-right' });
            return;
        }
        var fnn = 0;
        self.$('.products-table .row').each(function(item){
            if(!is_br){
                var nm = $('.pos-number', this).val();
                nm = nm?parseInt(nm):0;
                if(!nm){
                    $.jGrowl("Неверно указано количество единиц продукции.", { 'themeState':'growl-error', 'sticky':false, life: 10000, 'position': 'bottom-right' });
                    is_br = true;
                }else
                    fnn+=nm;
            }
        });
        if(is_br)
            return;

        if(is_complect){
            if(self.$('.products-table .row').length>1){
                $.jGrowl("Один комплект не может иметь разные адреса поставки. Создайте несколько комплектов или объедините в один адрес.", { 'themeState':'growl-error', 'sticky':false, life: 10000, 'position': 'bottom-right' });
                return;
            }
        }else{
            if(fnn>5){
                $.jGrowl("Количество ед. не может быть больше 5 штук. Создайте комплект или отдельные виды продукции.", { 'themeState':'growl-error', 'sticky':false, life: 10000, 'position': 'bottom-right' });
                return;
            }
        }

        if(self.model.get("condition_type")!="начальное"){
            var dlg = new ConfirmSaveChanges({model:this.model, 'onok':function(){
                self._saveAddPosition();
            }});
        }else
            self._saveAddPosition();
    },
    savePosition:function(){
        var self = this;
        var is_br = false;
        var is_complect = this.$el.find(".is_complect").is(":checked");
        if(self.$('.products-table .row').length==0){
            $.jGrowl("Необходимо задать адрес", { 'themeState':'growl-error', 'sticky':false, life: 10000, 'position': 'bottom-right' });
            return;
        }
        var fnn = 0;
        self.$('.products-table .row').each(function(item){
            if(!is_br){
                var nm = $('.pos-number', this).val();
                nm = nm?parseInt(nm):0;
                if(!nm){
                    $.jGrowl("Неверно указано количество единиц продукции.", { 'themeState':'growl-error', 'sticky':false, life: 10000, 'position': 'bottom-right' });
                    is_br = true;
                }else
                    fnn+=nm;
            }
        });
        if(is_br)
            return;

        if(is_complect){
            if(self.$('.products-table .row').length>1){
                $.jGrowl("Один комплект не может иметь разные адреса поставки. Создайте несколько комплектов или объедините в один адрес.", { 'themeState':'growl-error', 'sticky':false, life: 10000, 'position': 'bottom-right', 'position': 'bottom-right' });
                return;
            }
        }else{

            if(fnn>5){
                $.jGrowl("Количество ед. не может быть больше 5 штук. Создайте комплект или отдельные виды продукции.", { 'themeState':'growl-error', 'sticky':false, life: 10000, 'position': 'bottom-right' });
                return;
            }
        }
        //$.jGrowl('Ошибка.', { 'themeState':'growl-error', 'sticky':false });
        //return;
        if(self.model.get("condition_type")!="начальное"){
            var dlg = new ConfirmSaveChanges({model:this.model, 'onok':function(){
                self._savePosition();
            }});
        }else
            self._savePosition();
    },
    _savePosition:function(){
        var totsum = this.recalcMoney();
        var posc = new PositionCollection();
        var nums = 0;
        var addrs = '';
        var is_complect = this.$el.find(".is_complect").is(":checked");
        this.$('.products-table .row').each(function(item){
            var posm = new PositionModel();
            var nm = $('.pos-number', this).val();
            var addr = $('.pos-addr', this).val();
            posm.set({
                'num': nm,
                // 'price': $('.pos-price', this).val(),
                'addr': addr,
                'delivery': Routine.strToFloat($('.pos-delivery', this).val()),
                'mont_price': Routine.strToFloat($('.mont-price', this).val()),
                'mont_price_type':parseInt($('.mont_type', this).val()),
                'shmont': $('.pos-shmont', this).is(':checked')?'yes':'no'
            });
            if (isNaN(parseInt(nm))){
                nm = 0;
            }
            nums += parseInt(nm);
            addrs += nm + ' ед. - '+ addr + ', ';

            posc.add(posm);
        });
        if (addrs.length > 2){
            addrs = addrs.substring(0, addrs.length - 2);
        }
        this.options.product.set({
            'type': this.$('.construction-type').val(),
            //'name': this.$('.constuction-name').val(),
            'name': this.$('.constuction-target').select2("val"),
            'sq': this.$('.construction-sq').val().replace(',','.'),
            'length': this.$('.construction-length').val(),
            'width': this.$('.construction-width').val(),
            'height': this.$('.construction-height').val(),
            'count': nums,
            'price': Routine.strToFloat(this.$('.construction-price').val()),
            'approx': this.$('.isapprox').is(':checked')?'yes':'no',
            'approx_sq': this.$('.isapprox-sq').is(':checked')?'yes':'no',
            'positions': posc,
            'addrs': addrs,
            'is_complect':is_complect
        });
        if (this.options.isnew){
            this.model.get('products').add(this.options.product);
        }
        var self = this;
        //this.model.set('price',totsum,{silent: true});
        this.model.save().done(function(){
            self.closeModal();
        });
    },

    removePosition:function(){
        this.options.product.destroy();
        var self = this;
        this.model.save().done(function(){
            self.closeModal();
        });
    },

    addAddr: function(){
        var pos = new PositionModel();
        pos.set({'num': 1,'montcheck':'', 'shmontcheck': ''});
        var ln =  _.template($('#positionItemTemplate').html());
        this.$('.products-table').append(ln(pos.toJSON()));
        this.$('.pos-number').numeric({ decimal: false, negative: false });
        this.$('.pos-price, .pos-delivery').numeric({ decimal: ',', negative: false,decimalPlaces:2 });
    },
    closeModal:function(){
        var self = this;
        eventBus.on('close', this.closeModal, this);
        this.$el.modal('hide').on('hidden', function () {
            self.$el.empty();
            self.undelegateEvents();
            self.$el.removeData().unbind();
        });
    }
});

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
        'click .cb-finish-confirmed-by-client': 'clickFinishConfirmedByClient',
        'change .condition-select': 'conditionChange',
        'click .refresh-contacts': 'updateContacts',
        //--------------------------------------------------------------------------------------
        'updateContactsComplete': 'updateContactsComplete',
        'click .contract-link-block input[name=contract-link-vaiant]':'onContractLinkChange'
    },
    initialize:function(){
        var self = this;
        this.template = _.template($('#historyTableTemplate').html());
        if (this.model.get('id') != ''){
            this.model.fetch({timeout:50000}).complete(function(){
                self.render();
            });
        }
        else{
            self.render();
        }
        // app_router.navigate('history');
    },
    show:function(){
        // eventBus.on('close', this.closeModal, this);
        // this.$el.modal('show');
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

        var cond_sel = this.$('.condition-select').val();

        if((this.$('.condition-select').val()==window.ORDER_CONDITIONS['CONTRACT_PREPARE'] || this.$('.condition-select').val()==window.ORDER_CONDITIONS['CONTRACT_AGREEMENT'] || this.$('.condition-select').val()==window.ORDER_CONDITIONS['CONTRACT_TO_SIGN'] || this.$('.condition-select').val()==window.ORDER_CONDITIONS['CONTRACT_SIGN']) && (!this.model.get('contracts') || this.model.get('contracts').length==0) ){
            this.$('.contract-link-block').show();
        }else
            this.$('.contract-link-block').hide();
    },
    onContractLinkChange:function(el){
        // if(this.$(".contract-link-block input[name=contract-link-vaiant]:checked").val()=='choose')
        //     this.$('.contract-link-block .contract-number-block').removeClass('hide');
        // else
        //     this.$('.contract-link-block .contract-number-block').addClass('hide');
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
        App.initTextComplete(tarea, self.model);
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
    },

    addComment:function(el){
        var btn = $(el.target);
        btn.hide();

        var arindex = $(el.target).closest(".history-table").find(".history-comment").index(($(el.target).closest('.history-comment')));

        var frm = $('<div></div>').addClass('edit-comment-pan');
        var tarea = $('<textarea></textarea>').addClass('edit-comment-textarea');
        var self = this;
        App.initTextComplete(tarea, self.model);
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
            //prev.show();
            btn.show();
        });
        frm.append(tarea).append('<br>').append(btn_ok).append(btn_cancel);
        btn.after(frm);


    },

    /**
    ** обновление выпадающего списка конактов на форме
    **/
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
                            'client_self': item['client_self'],
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
                            var client_id = (item.client_id != undefined)?item.client_id:'';
                            var client_name = (item.client_name != undefined)?item.client_name:'';
                            var result = '<div ' +
                                         'data-client-id="' + client_id + '" ' +
                                         'data-client-name="' + client_name + '">' +
                                         '<b>' + escape(item.name) + '</b><br>';
                            if (item.client_name != undefined && !item.client_self)
                                result += '<small><i>'+item.client_name+'</i></small>';
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
        App.initTextComplete(this.$('.comment-text'), self.model);
        //-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    },

    /**
    ** отрисовка формы
    **/
    render:function(){
        this.$el.html(this.template(this.model.toJSON()));
        var self = this;
        this.updateContacts();
         var hc = this.model.get('history');
        _.each(hc.models, function(item){
            var ln =  _.template($('#historyTableItemTemplate').html());
            self.$('tbody').append(ln($.extend({}, item.toJSON(), {'number':self.model.get('number')})));
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
            // var hstcnd = hc.models[hc.length-1].get('condition');
            var hstcnd = hc.models[0].get('condition');
            var i = this.$('.condition-select option[value="'+hstcnd+'"]').index();
            if (i < this.$('.condition-select option').length-1){
                i++;
            }
            this.$('.condition-select option').eq(i).prop('selected', true);
            this.conditionChange();
        }

        self.$('.change-close-date').datepicker({weekStart:1, orientation: "bottom auto"}).datepicker('setValue', (self.model.get('last_close_date'))?Routine.parseDate(self.model.get('last_close_date'),'dd.mm.yyyy'):new Date())
        .on('changeDate', function(ev){
            self.$('.close-date').val(self.$('.change-close-date').data('date'));
            self.$('.change-close-date').datepicker('hide');

            if(self.model.get('confirmed_by_client'))
                alert('Флаг подтверждения даты закрытия клиентом был снят.');
            self.$('.cb-confirmed-by-client').prop("checked",false);
            self.model.set('confirmed_by_client',false);
        });

        self.$('.change-finish-date').datepicker({weekStart:1, orientation: "bottom auto"}).datepicker('setValue', (self.model.get('last_finish_date'))?Routine.parseDate(self.model.get('last_finish_date'),'dd.mm.yyyy'):new Date())
            .on('changeDate', function(ev){
                self.$('.finish-date').val(self.$('.change-finish-date').data('date'));
                self.$('.change-finish-date').datepicker('hide');

                if(self.model.get('finish-confirmed_by_client'))
                    alert('Флаг подтверждения даты сдачи был снят.');
                self.$('.cb-finish-confirmed-by-client').prop("checked",false);
                self.model.set('finish_confirmed_by_client',false);
            });


        // this.$(".contract-link-block .contract-number").tokenInput('/handlers/contracts/search_contract_forinput', {
        //         method:'POST',
        //         minChars:1,
        //         tokenValue:"_id",
        //         propertyToSearch:'number',
        //         jsonContainer:'result',
        //         hintText:'Поиск договора',
        //         noResultsText:'Договор не найден',
        //         searchingText:'Поиск',
        //         resultsLimit:15,
        //         tokenLimit:1,
        //         zindex:9999,
        //         onAdd: function(item){
        //             if(item.is_signed=='yes' && item.draft==false){
        //                 $.jGrowl('Выбранный договор подписан. Нельзя привязать заявку к подписанному договору.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
        //             }
        //         },
        //         onDelete: function(){
        //         },
        //         resultsFormatter:function(item){
        //             item['number'] = ''+item['number'];
        //             item['cont']="";
        //             return '<li><p>' + item.number + '</p></li>';
        //         }
        //     });

        return this;
    },
    saveHistoryOk:function(){
        var hm = new HistoryModel();
        var self = this;
        var ctype = this.$('.condition-select').find(":selected").data('property');


        // if (this.$('.condition-select').val() == window.ORDER_CONDITIONS['CONTRACT_SIGN']){
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
                    'manager': 'nobody'
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

//		this.model.set({'ignore_state_date':'no', 'dogovornum':this.$('.dogovor-number').val()});
        // если отказ, то дату закрытия обнулить
        if(this.$('.condition-select').val() == window.ORDER_CONDITIONS['REFUSE'])
        {
            this.model.set({'cur_close_date':null});
            this.model.set({'cur_finish_date':null});
        }
        this.model.set({'ignore_state_date':'no'});

        this.model.get('history').add(hm);

        Statistics.CRMChangeState(this.model.get("number"), this.$('.condition-select').val(), MANAGER);

        this.model.save().done(function(){
            //self.closeModal();
            self.render();
        }).error(function(){
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
            if (this.$('.condition-select').val() != this.laststat && parseInt(this.$('.chance-slider').data('slider').getValue()) == this.lastchance){
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
        if (ls && is_assist && ls.get('manager') === MANAGER){
            $.jGrowl("Ошибка доступа. Данная операция доступна только менеджерам.", { 'themeState':'growl-error', 'sticky':false, life: 10000 });
            return;
        }
        var cond = this.$('.condition-select').val();
        if (is_assist && !ls && cond !== window.ORDER_CONDITIONS['INTEREST']){
            $.jGrowl("Ошибка доступа. Данная операция доступна только менеджерам.", { 'themeState':'growl-error', 'sticky':false, life: 10000 });
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
            }
        else{
            self.agreeHistory();
        }
    },
    closeModal:function(){
        // var self = this;
        // eventBus.on('close', this.closeModal, this);
        // app_router.navigate('');
        // this.$el.modal('hide');
    }
});

/**
 * Задачи
 */
var TaskFormView = Backbone.View.extend({
    events:{
        'click .save-task': 'saveTask',
        'click .save-task-confirm': 'saveTaskConfirm',
        'click .save-task-cancel': 'saveTaskCancel',
        'click .close-task': 'closeModal',
        'click .change-date': 'changeDate'
    },
    initialize:function(){
        var self = this;
        this.template = _.template($('#taskTableTemplate').html());
        if (this.model.get('id') != ''){
            this.model.fetch({timeout:50000}).complete(function(){
                self.render();
            });
        }
        else{
            self.render();
        }
        //var fr = Backbone.history.fragment;
        //app_router.navigate('tasks');
        this.model.on('change', function(){self.render()});
        //this.listenTo(this.model, 'change reset add remove', this.render);
    },
    show:function(){
        //eventBus.on('close', this.closeModal, this);
        //this.$el.modal('show');
    },
    render:function(){
        this.$el.html(this.template());
        var self = this;
        var hc = this.model.get('tasks');
        _.each(hc.models, function(item){
            self.renderOne(item);
        });
        this.$('.datepickr').datepicker({weekStart:1}).datepicker('setValue', new Date());
        this.$el.on('hidden', function () {
            self.$el.empty();
            self.undelegateEvents();
            self.$el.removeData().unbind();
            var fr = Backbone.history.fragment.toString();
            app_router.navigate('');
        });
        return this;
    },

    renderOne:function(item){

        var view = new TaskFormItemView({'model':item, 'orderModel': this.model});
        this.$('tbody').append(view.render().el);
        return view;
    },
    changeDate: function(){

    },
    saveTaskOk:function(){
        var hm = new TaskModel();
        var self = this;
        var close_date = this.$('.datepickr input').val();
        hm.set({
            'condition': this.$('.task-select').val(),
            'comment': this.$('.task-comment-text').val(),
            'datetime':'new',
            'closedatetime': close_date
        });
        this.model.get('tasks').add(hm);

        this.model.save().done(function(){
            //self.closeModal();
            //self.render();
        }).error(function(){
                // в случае ошибки необходимо удалить новое не сохраненное состояние задачи
                // для этого смотрим все модели коллекции состояний
                var tc = self.model.get('tasks');
                _.each(tc.models, function(item){
                    if(item==hm && typeof tc != 'undefined')
                        tc.remove(item);
                });
            });
    },
    saveHistoryCancel:function(){
        this.$('.alert').hide();
        this.$('.save-history').show();
        this.$('.close-history').show();
    },
    saveTaskCancel:function(){
        this.$('.confirm-task-panel').hide();
        this.$('.add-task-panel').show();
    },
    saveTaskConfirm:function(){
            var close_date = this.$('.datepickr input').val();


            var hm = new TaskModel();
            var self = this;
            var close_date = this.$('.datepickr input').val();
            hm.set({
                'condition': this.$('.task-select').val(),
                'comment': this.$('.task-comment-text').val(),
                'datetime':'new',
                'closedatetime': close_date
            });
            this.model.get('tasks').add(hm);
            this.model.set({'ignore_state_date':close_date});

            var hist = this.model.get('history');
            var last_state = hist.models[hist.length-1];
            var log = last_state.get('log');
            this.model.save().done(function(){
                //self.closeModal();
                self.render();
            }).error(function(){
                // в случае ошибки необходимо удалить новое не сохраненное состояние задачи
                // для этого смотрим все модели коллекции состояний
                var tc = self.model.get('tasks');
                _.each(tc.models, function(item){
                    if(item==hm)
                        tc.remove(item);
                });
            });


        },
    saveTask:function(){
        if (this.$('.task-comment-text').val() == '')
        {
            alert('Необходимо указать примечание к задаче.');
            return;
        }
        var close_date = this.$('.datepickr input').val();
        var sost_days = window.SOSTDAYS;
        var last_state_date = this.model.get('l_state_date');
        if (moment(close_date, 'DD.MM.YYYY') > Routine.add_work_days(moment(last_state_date, ['DD.MM.YYYY','DD.MM.YYYY HH:mm:ss']), sost_days[this.model.get('condition')])){
            this.$('.add-task-panel').hide();
            this.$('.confirm-task-panel').show();
            return;
        }
        else{
            this.saveTaskOk();
        }
    },
    closeModal:function(){
        //var self = this;
        //eventBus.on('close', this.closeModal, this);
        //app_router.navigate('');
        //this.$el.modal('hide');
    }
});

/**
* задача из списка
**/
var TaskFormItemView = Backbone.View.extend({
    tagName:'tr',
    orderModel:null,
    events:{
        'click .ex-task': 'exTask',
        'click .comp-task': 'compTask',
    },
    initialize:function(){
        var self = this;
        this.template = _.template($('#taskTableItemTemplate').html());
        // this.listenTo(this.model, 'change reset add remove', this.render);
    },
    getNextTask:function(){
        var bigtask = null;
        var last_state_date = this.options.orderModel.get('l_state_date');
        var hist = this.options.orderModel.get('history');
        var sost_days = window.SOSTDAYS;
        var self = this;
        var last_state = hist.models[hist.length-1];
        _.each( this.options.orderModel.get('tasks').models, function(item){
            if (item.get('status') == ''){
                var enddate = moment(item.get('closedatetime'), 'DD.MM.YYYY');
                if (enddate > Routine.add_work_days(moment(self.options.orderModel.get('datetime'), ['DD.MM.YYYY','DD.MM.YYYY HH:mm:ss']), sost_days[self.options.orderModel.get('condition')])){
                    if (bigtask){
                        if (enddate > moment(bigtask.get('closedatetime'), 'DD.MM.YYYY')){
                            bigtask = item;
                        }
                    }
                    else{
                        bigtask = item;
                    }

                }
            }
        });
        if (bigtask){
            this.options.orderModel.set({'ignore_state_date':bigtask.get('closedatetime')});
            last_state.get('log').push(bigtask);
        }
        else{
            this.options.orderModel.set({'ignore_state_date':'no'});
        }
    },
    exTask:function(){
        var self = this;
        this.model.set({'status': 'отменена'});
        this.getNextTask();
        this.options.orderModel.save().done(function(){
            self.$('.status-block').addClass('hide');
            self.$('.change-date').addClass('hide');
            self.$('.task-status').text('отменена');
        });
        return 0;
    },
    compTask:function(){
        var self = this;
        this.model.set({'status': 'завершена'});
        this.getNextTask();
        this.options.orderModel.save().done(function(){
            //self.$('.status-block').addClass('hide');
            //self.$('.change-date').addClass('hide');
            //self.$('.task-status').text('завершена');
            self.render();
        });
        return 0;
    },
    render:function(){
        var self = this;
        this.$el.html(this.template(this.model.toJSON()));
        this.$('.change-date').datepicker({weekStart:1}).on('changeDate', function(ev){
                var newdate = self.$('.change-date').data('date');
                self.$('.change-date').datepicker('setValue', ev.date);
                self.$('.change-date').datepicker('hide');
                self.model.set({'closedatetime': newdate});
                self.getNextTask();
                self.options.orderModel.save();
                self.render();
            });
        if (this.model.get('status') == ''){
            this.$('.status-block').removeClass('hide');
            this.$('.change-date').removeClass('hide');
        }
        this.$('.ex-task').show();
        if (MANAGER !=this.model.get("manager"))
            this.$('.ex-task').hide();
        return this;
    }
});


/**
 * Роутер
 */
var AppRouter = Backbone.Router.extend({
    routes:{
        "history":"history",
        "products":"products",
        "tasks":"tasks",
        "": "root"
    }
});

    $(function(){
        $('html').click(function(e){
            var elem = $(e.target);
            var i = 1;
            var isTarget = false;
            while (elem != undefined && i < 5) {
                isTarget = isTarget || elem.hasClass('linked-orders') || elem.hasClass('product-links');
                elem = elem.parent();
                i++;
            }
            if (!isTarget){
                $('.linked-orders').hide();
                $('.product-links').removeClass('selected');
            }
        });
    });

var AppView = Backbone.View.extend({
    order:null,
    order_view: null,
    product_view: null,
    history_view: null,
    task_view: null,
    app_router:null,
    el: '#one-order',
    showLoader:function(){
            $.blockUI({'message':'<img src="/static/img/spinner.gif">', 'css':{'border':'none', 'backgroundColor':'transparent'}, 'overlayCSS':{'backgroundColor':'#fff', 'cursor':'pointer'}});
    },
    hideLoader:function(){
            $.unblockUI();
    },
    initialize: function(){
        var self = this;

        if (this.options.order_id == 'new'){
            this.order = new OrderModel({'client_id':this.options.client_id, 'client': this.options.client});
            self.order_view = new OrderTableItemView({model:self.order});
            self.product_view = new ProductTableView({isnew:true, model: self.order});
            self.history_view = new HistoryFormView({el: self.$('#history-list'), isnew:true, model:self.order});
            self.task_view = new TaskFormView({el: self.$('#tasks-list'), isnew:true, model:self.order});
            // self.clientroles_view = new ClientRolesView({model:self.order, el:self.$("#client-roles") });
            self.render();
            self.init_routes();
        }
        else{
            this.order = new OrderModel({'id':this.options.order_id});
            this.order.fetch().complete(function(){
                self.order_view = new OrderTableItemView({model:self.order});
                self.product_view = new ProductTableView({model:self.order});
                self.history_view = new HistoryFormView({el: self.$('#history-list'), model:self.order});
                self.task_view = new TaskFormView({el: self.$('#tasks-list'), model:self.order});
                // self.clientroles_view = new ClientRolesView({model:self.order, el:self.$("#client-roles") });
                self.render();
                self.init_routes();
            });
        }
        this.order.bind('request', this.showLoader, this);
        this.order.bind('sync', this.hideLoader, this);
    },
    init_routes:function(){
        app_router = new AppRouter();
        var self = this;
        app_router.on('route:root', function(){
           console.log('root');
           eventBus.trigger('close');
        });
        app_router.on('route:history', function(){
           console.log('history');
           //$.scrollTo('#history-list');
           setTimeout(function(){$.scrollTo('#history-list');}, 1000)
           // self.order_view.showHistory();
        });
        app_router.on('route:products', function(){
           console.log('products');
           //$.scrollTo('#products-list');
           setTimeout(function(){$.scrollTo('#products-list');}, 1000)
           //self.order_view.showStructure();
        });
        app_router.on('route:tasks', function(){
           console.log('tasks');
           setTimeout(function(){$.scrollTo('#tasks-list');}, 1000)
           //self.order_view.showTask();
        });
        Backbone.history.start();
    },
    render: function(){
        this.$('#order-item').html(this.order_view.render().el).show();
        this.$('#products-list').html(this.product_view.render().el).show();
        this.$('#tasks-list').html(this.task_view.render().el).show();
        this.$('#history-list').show();
    },
    initTextComplete:function(text_area, model){
        var client_tag = '|CLIENT]/';
        text_area.textcomplete([
                {
                    //mentions: self.contact_list.map(function(item){return item['fio'];}),
                    match: /\B\+([\[\]\|\wА-Яа-я]*\/?[\wА-Яа-я]*)$/,
                    search: function (term, callback) {
                        var term = term.replace(new RegExp('_','ig'),' ').toUpperCase();
                        var additional_client_id = "";
                        if(term.indexOf(client_tag)>=0)
                        {
                            additional_client_id = term.split('|')[1];
                            term = term.substr(term.indexOf(client_tag)+client_tag.length);
                        }else{
                            if(term[0]=='[')
                                term = term.substr(1);
                            var ind = term.indexOf("|");
                            if(ind>0)
                                term = term.substr(0,ind);
                        }
                        //console.log(term);
                        if(window.last_textcomplete_req){
                            window.last_textcomplete_req.abort();
                        }
                        $("body *").addClass("textcomplete-preloading");
                        window.last_textcomplete_req = $.post("/handlers/crm/comment_textcomplete",{q:term,additional_client_id:additional_client_id, order_id: model.get('id'), client_id: model.get('client_id')},function(response){
                            $("body *").removeClass("textcomplete-preloading");
                            callback(response);
                        },'json');
                    },
                    index: 1,
                    template:function(item){
                        return ('<div><span class="it-name">'+item.name+'</span></div>');
                    },
                    replace: function (mention) {
                        return "+["+mention['name'].replace(new RegExp(' ','ig'),'_')+"|"+mention['key']+"|"+mention['type']+"]";
                    }
                }
            ], { appendTo: 'body',zIndex:'1101' });
    }
});



var ConfirmSaveChanges = Backbone.View.extend({
    template:_.template($("#confirmSaveChangesTemplate").html()),
    onok:null,
    initialize:function(){
        this.render();
        this.oncancel = this.options.oncancel;
        this.onok = this.options.onok;
    },
    events:{
        'click .save-and-close':'onSave',
        'click .close-form':'onCancel',
    },
    render:function(){
        this.$el.append(this.template());
        $("body").append(this.$el);
    },
    onSave:function(){
        if(!this.$("textarea").val()){
            $.jGrowl("Укажите причину изменения состава заявки.", { 'themeState':'growl-error', 'sticky':false, life: 10000 });
            return;
        }
        this.model.set("change_comment",this.$("textarea").val(),{silent: true});
        this.onok();
        this.$el.remove();
    },
    onCancel:function(){
        this.$el.remove();
    }
});


var ClientRolesView = Backbone.View.extend({
    template:_.template($("#clientRolesTemplate").html()),
    is_edited:false,
    contact_list:[],
    initialize:function(){
        this.render();
        this.updateContacts();
    },
    events:{
        'click .refresh-contacts': 'updateContacts',
        'click .btn-edit':'onEdit',
        'click .btn-cancel':'onCancel',
        'click .btn-save':'onSave'
    },
    render:function(){
        var self = this;
        this.$el.html(this.template(this.model.get('client_roles'))).show();
        if(!this.is_edited){
            this.$("textarea, input, select").prop('disabled',true);
            this.$(".refresh-contacts").hide();
            this.$('.btn-edit').show();
            this.$('.btn-save, .btn-cancel').hide();
        }else
        {
            this.$('.btn-edit').hide();
            this.$('.btn-save, .btn-cancel').show();
        }
        this.$('.roles-list tr[data-key]').each(function(){
            $(this).find("input.cnt-note").val(self.getNoteByKey($(this).data('key')));
        });
    },
    initSelectize:function(){
        var self = this;
        var contacts = this.contact_list.map(function(item){
                    return {'name':item['fio'],
                            'client_name':item['client_name'],
                            'client_self': item['client_self'],
                            'client_id': item['client_id']};
        });
        //var cur = self.$('.client-contacts').data('val');
        this.$('.client-contacts').each(function(){
            /*var cur = $(this).val();
            if(this.selectize){
                cur = this.selectize.getValue();
                this.selectize.destroy();
            }  */
            var cur = self.getClientByKey($(this).parents('tr:first').data('key'));
            var $sel = $(this).selectize({
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
                        var client_id = (item.client_id != undefined)?item.client_id:'';
                        var client_name = (item.client_name != undefined)?item.client_name:'';
                        var result = '<div ' +
                                     'data-client-id="' + client_id + '" ' +
                                     'data-client-name="' + client_name + '">' +
                                     '<b>' + escape(item.name) + '</b><br>';
                        if (item.client_name != undefined && !item.client_self)
                            result += '<small><i>'+item.client_name+'</i></small>';
                        result += '</div>';
                        return result
                    }
                }
            });
            this.selectize.setValue(cur);
        });
    },

    updateContacts:function(){
        var self = this;
        $.get('/handlers/client_group/'+this.model.get('client_id')).done(function(ret){
            var data = $.parseJSON(ret);
            self.contact_list = data['contacts'];
            self.initSelectize();
        });
    },
    onEdit:function(){
        this.is_edited = true;
        this.render();
        this.initSelectize();
    },
    onCancel:function(){
        this.is_edited = false;
        this.render();
        this.initSelectize();
    },
    onSave:function(){
        var self = this;
        $.blockUI({'message':'<img src="/static/img/spinner.gif">', 'css':{'border':'none', 'backgroundColor':'transparent'}, 'overlayCSS':{'backgroundColor':'#fff', 'cursor':'pointer'}});
        var new_data = {'roles':[], 'note':this.$('.full-description textarea').val()};
        this.$('.roles-list tr[data-key]').each(function(){
            new_data['roles'].push({'_id':$(this).data('key'), 'client': $(this).find("select")[0].selectize.getValue(), 'note':$(this).find('input.cnt-note').val()});
        });
        this.model.set('client_roles', new_data);
        this.is_edited = false;

        this.model.save().done(function(){
            //self.closeModal();
            $.unblockUI();
            self.render();
            self.initSelectize();
        }).error(function(){
            $.unblockUI();
            $.jGrowl('Ошибка сохранения. Повторите попытку позже или обратитесь к адинистратору.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
        });
    },
    getNoteByKey:function(key){
        if(this.model.get('client_roles')){
            var rl = (this.model.get('client_roles').roles || []).find(function(el){return el['_id']==key;});
            if(rl)
              return rl.note || "";
        }
        return "";
    },
    getClientByKey:function(key) {
        if(this.model.get('client_roles')){
            var rl = (this.model.get('client_roles').roles || []).find(function(el){return el['_id']==key;});
            if(rl)
              return rl.client || "";
        }
        return "";
    }
});
