    var App = {
        Models: {},
        Views:{},
        Collections:{},
        Route:null,
        initialize:function(){
            App.Views.Main = new AppView();

            App.Route = new AppRouter();
            Backbone.history.start();
        }
    };

    // настраивам роуты
    var AppRouter = Backbone.Router.extend({

        routes: {
          "": "index",
          "search/:id": "show",  // редактировать запись
        },

        index:function(){
        },

        show: function(id) {
          App.Views.Main.Search(id);
        }
    });

    var PaymentModel = Backbone.Model.extend({
        defaults:{
            'date':null,
            'day_count':0,
            'payment_use':[],
            'events':[],
            'currency':null,
            'period':'',
            'payment_type':null,
            'size':0,
            'date_end':null,
            'by_production':false,
            'units':[],
            'note':''
        },
        initialize:function(){
            if(!this.get("currency"))
                this.set("currency",App.Models["CurrencyList"][0]);
        }
    });

    var PaymentCollection = Backbone.Collection.extend({
        model: PaymentModel,
        comparator:function(el){
            return new Date(el.get("date"));
        }
    });

    App.Models.ContractModel = Backbone.Model.extend({
        defaults: {
            'number':null,
            'parent_id':null,
            'payments':new PaymentCollection(),
            'additional_contracts':[]
        }
    });

    var ContractCollection = Backbone.Collection.extend({
        model:App.Models.ContractModel
    });


    var AppView = Backbone.View.extend({
        initialize:function(){
            var self = this;
            $("#btnContractFind").click(function(){
                self.OnSearch();
            });
            $("#tbContractNumber").keydown(function(k){
                if(k.keyCode==13)
                    self.OnSearch();
            });
        },
        OnSearch:function(){
            var num = $("#tbContractNumber").val();
            if(num)
                this.Search(num);
        },
        Search:function(num){
            Routine.showLoader();
            var self = this;
            App.Route.navigate("/search/"+num,false);
             $.ajax({
                url: '/handlers/contracts/search_contract_payments',
                type: 'GET',
                dataType: 'json',
                contentType: "application/json; charset=utf-8",
                data: {'num':num},
                timeout: 35000,
                success: function (result, textStatus, jqXHR) {
                      Routine.hideLoader();
                      if(result.status=='error'){
                            $.jGrowl(result.msg, { 'themeState':'growl-error', 'sticky':false, life: 10000 });
                      }else
                      if(result.status=="ok"){
                         self.ShowContract(result.contract);
                      }else
                        $.jGrowl('Ошибка сервера', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
                }
            }).fail(function(jqXHR, textStatus, errorThrown ) {
                $.jGrowl('Ошибка сервера:' + errorThrown, { 'themeState':'growl-error', 'sticky':false, life: 10000 });
                Routine.hideLoader();
            });
        },
        ShowContract:function(data){
            if(!data){
                $("#contractEditPnl").html('<p class="notfound">Договор не найден</p>');
            }else
            {
              var contract = new App.Models.ContractModel(data);
              contract.set('additional_contracts', new ContractCollection(contract.get('additional_contracts')));
              contract.set('payments', new PaymentCollection(contract.get('payments')));
              contract.get('additional_contracts').each(function(item){
                item.set('payments', new PaymentCollection(item.get('payments')));
              });
              App.CurrentContract = contract;
              $("#contractEditPnl").html('');
              var cv = new ContractView({model:contract});
              $("#contractEditPnl").append(cv.$el);
              contract.get('additional_contracts').each(function(item){
                var cv = new ContractView({model:item});
                $("#contractEditPnl").append(cv.$el);
              });
            }
        }
    });

    var ContractView = Backbone.View.extend({

        initialize:function(){
            this.template = _.template($("#contractEditTemplate").html());
            this.render();
        },
        render:function(){
            this.$el.html(this.template(this.model.toJSON()));
            this.payments = new App.Views.PaymentsFormView({model:this.model});
            this.$(".payments-list").append(this.payments.$el);
        }
    });

/***
*** платежи
***/
    App.Views.PaymentsFormView = Backbone.View.extend({
        events:{
            'click .add-new-payment':'onNewPayment'
        },
        initialize:function(){
            this.template = _.template($('#paymentsTableTemplate').html());
            this.render();
        },
        render:function(){
            this.$el.html(this.template(this.model.toJSON()));
            if(this.model.get("payments").length>0){
                this.$(".payments").html("");
                var i = 0;
                this.model.get("payments").each(function(item){
                    i++;
                    var pe = new PaymentElemView({model:item});
                    pe.contract = this.model;
                    pe.render(i);
                    this.$(".payments").append(pe.$el);
                },this);
            }
            this.delegateEvents();
        }
    });

    var PaymentElemView = Backbone.View.extend({
        events:{
            'click .edit-btn':'onEdit',
            'click .add-new-payment':'onAdd',
            'click .delete-btn':'onDelete'
        },
        initialize:function(){
            this.template = _.template($('#paymentsElemTemplate').html());
            this.listenTo(this.model, 'change reset add remove', this.render);
        },
        render:function(index){
            var arr = this.model.toJSON();
            arr.productions = this.contract.get("productions");
            arr.factory = this.contract.get('factory');
            //arr.prservices = this.contract.get("services");
            if (typeof index == 'number')
                arr.index = index;
            else
                arr.index = index.attributes.number;
            this.$el.html(this.template(arr));
        },
        onEdit:function(e){
            var event_id = $(e.currentTarget).parents(".payment-data:first").data("event_id");
            var ci = {};
            _.each(this.model.get("events"),function(item){
                if(item._id==event_id)
                    ci = item;
            });
            var dlg = new PaymentEditForm({el:$("#position-modal-container"), model: ci});
            dlg.payment = this.model;
            dlg.contract = this.contract;
            dlg.show();
        },
        onAdd:function(){
            var dlg = new PaymentEditForm({el:$("#position-modal-container"), model: {}});
            dlg.payment = this.model;
            dlg.contract = this.contract;
            dlg.show();
        },
        onDelete:function(e){
            var self = this;
            bootbox.confirm("Платеж будет удален без возможности восстановления, продолжить?", function(result)
            {
              if(result)
              {
               var event_id = $(e.currentTarget).parents(".payment-data:first").data("event_id");
                Routine.showLoader();
                var data = {'contract_id':App.CurrentContract.get("_id"), 'payment_id':self.model.get("_id"), 'event_id':event_id};
                 $.ajax({
                    url: '/handlers/contracts/delete_fact_payment',
                    type: 'POST',
                    dataType: 'json',
                    contentType: "application/json; charset=utf-8",
                    data: data,
                    timeout: 35000,
                    success: function (result, textStatus, jqXHR) {
                         Routine.hideLoader();
                          if(result.status=='error'){
                                $.jGrowl(result.msg, { 'themeState':'growl-error', 'sticky':false, life: 10000 });
                          }else
                          if(result.status=="ok"){
                             self.model.set(result.payment);
                          }else
                            $.jGrowl('Ошибка сервера', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
                    }
                }).fail(function(jqXHR, textStatus, errorThrown ) {
                    $.jGrowl('Ошибка сервера:' + errorThrown, { 'themeState':'growl-error', 'sticky':false, life: 10000 });
                    Routine.hideLoader();
                });
              }
            });
        }
    });

    var PaymentEditForm = Backbone.View.extend({
        events:{
            'click .close-payment':'close',
             'click .save-payment':'onSave'
        },
        is_new:false,
        initialize:function(){
            this.template = _.template($("#paymentsEditForm").html());
        },
        render:function(){
            this.$el.html(this.template(this.model));
            this.$('.payment-size').numeric({ decimal: ',', negative: false });
            this.$(".payment-date").datepicker({format:"dd.mm.yyyy"});
            var self=this;
            this.$el.on('hidden', function () {
                self.$el.empty();
                self.undelegateEvents();
                self.$el.removeData().unbind();
            });
        },
        show:function(){
            this.render();
            this.$el.modal('show');
        },
        close: function(){
            var self=this;
            this.$el.modal('hide');
        },
        onSave:function(){
            if(!this.$(".payment-date").val()){
                 $.jGrowl('Не задана дата получения платежа.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
                 return false;
            }
            if(Routine.strToFloat(this.$(".payment-size").val() || 0) <=0){
                 $.jGrowl('Не задан размер платежа.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
                 return false;
            }
            if(this.model['_id'] && !this.$(".payment-comment").val()){
                 $.jGrowl('В поле "Комментарии" укажите причину изменения платежа.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
                 return false;
            }
            var rest = 0;
            _.each(this.payment.get("events"), function(ev){
                if(ev['_id']!=this.model['_id'])
                    rest+=ev['size'];

            },this);
            rest = this.payment.get("size")-rest;
            var pay_size = Routine.strToFloat(this.$(".payment-size").val() || 0);
            if(pay_size>rest){
                $.jGrowl('Размер фактического платежа превосходит размер планового платежа.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
                 return false;
            }
            Routine.showLoader();
            var self = this;
            var data = {'contract_id':this.contract.get("_id"), 'payment_id':this.payment.get("_id"), 'event_id':this.model['_id'], 'size':pay_size, 'date_start':this.$(".payment-date").val(), 'comment':this.$(".payment-comment").val()};
             $.ajax({
                url: '/handlers/contracts/save_fact_payment',
                type: 'POST',
                dataType: 'json',
                contentType: "application/json; charset=utf-8",
                data: data,
                timeout: 35000,
                success: function (result, textStatus, jqXHR) {
                     Routine.hideLoader();
                      if(result.status=='error'){
                            $.jGrowl(result.msg, { 'themeState':'growl-error', 'sticky':false, life: 10000 });
                      }else
                      if(result.status=="ok"){
                         self.payment.set(result.payment);
                         self.close();
                      }else
                        $.jGrowl('Ошибка сервера', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
                }
            }).fail(function(jqXHR, textStatus, errorThrown ) {
                $.jGrowl('Ошибка сервера:' + errorThrown, { 'themeState':'growl-error', 'sticky':false, life: 10000 });
                Routine.hideLoader();
            });
        }
    });
