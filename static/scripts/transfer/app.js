$(function(){

  var ContactModel = Backbone.Model.extend({
    defaults:{
      'fio':'',
      'phone':[],
      'email':[]
    }
  });

    var ContactCollection = Backbone.Collection.extend({
    	model: ContactModel
  	});

	var ClientModel = Backbone.Model.extend({
	    urlRoot:'/handlers/client',
	    defaults:{
	      'id': '',
	      'name':'',
	      'addr':'',
	      'rekvisit':'',
	      'inn':'',
	      'cl':'notcl',
	      'wherefind':'',
	      'firstcontact':'',
	      'contacts': new ContactCollection(),
          'services':null
	    },
	    initialize: function(){
	    	this.set('contacts', new ContactCollection());
	    },
	    parse: function(response) {
	        var contactList = new ContactCollection();
	        contactList.add(response.contacts);
	        return {
	        	'id':response.id,
	        	'name': response.name,
	        	'addr': response.addr,
	        	'wherefind': response.wherefind,
	        	'firstcontact': response.firstcontact,
	        	'cl': response.cl,
	        	'rekvisit': response.rekvisit,
	        	'inn': response.inn,
	        	'contacts': contactList
	        }
	    }
 	});

    var ClientFindView = Backbone.View.extend({
		el: $('#manager-panel'),
		findurl: '/handlers/clientfind/notcl',
		newname: '',
		events:{
			'click #show-new-client-card': 'newClientCard',
			'click #show-client-card': 'showClientCard',
			'click #show-orders': 'showOrdersTable',
			'click .blockOverlay': 'unblockForm'
		},
		changeCl: function(){
			this.findurl = this.$('.cl-checkbox').is(':checked')?'/handlers/clientfind/cl':'/handlers/clientfind/notcl';
		},
		newClientCard: function(){
			var m = new ClientModel();
			m.set({'id':''})
			if (this.newname != ''){
				m.set({'name':this.newname});
			}
			this.$('#client-dropdown').tokenInput('clear');
			var cc = new ClientCardView({'model': m});
			this.$('#client-dropdown').tokenInput('clear');
			this.$el.hide();
			cc.show();
		},
		showClientCard: function(){
			var cln = this.$('#client-dropdown').tokenInput("get");
			if (cln){
				var cm = new ClientModel();
				cm.set({'id':cln[0]['id'],'name':cln[0]['name']});
				var cc = new ClientCardView({'model': cm});
				this.$el.hide();
				cc.show();
			}
		},
		showOrdersTable: function(){
			var ot = new OrderTableView();
			this.$el.block({'message':null, 'overlayCSS':{'backgroundColor':'#fff', 'cursor':'pointer'}});
			ot.show();
		},
		unblockForm:function(){
			if (App.orderView){
				App.orderView.close();
			}
			if(App.productView){
				App.productView.close();
			}
			var cl = curClient.clone();
			self.newname = '';
			this.$('#client-dropdown').tokenInput('clear');
			if (cl.get('id') != '')
				this.$('#client-dropdown').tokenInput("add", {id: cl.get('id'), name: cl.get('name')});
			this.$el.unblock();
		},
		show:function(){
			var cl = curClient.clone();
			self.newname = '';
			this.$('#client-dropdown').tokenInput('clear');
			if (cl.get('id') != '')
				this.$('#client-dropdown').tokenInput("add", {id: cl.get('id'), name: cl.get('name')});
			this.$el.show();
		},
		initialize:function(){
			var self = this;
			var el = this.$('#client-dropdown');
			el.tokenInput(self.findurl, {
				method:'POST',
				minChars:3,
				jsonContainer:'result',
				hintText:'Поиск клиента',
				noResultsText:'Клиенты не найдены',
				searchingText:'Поиск',
				tokenLimit:1,
				onAdd: function(){
					var cln = self.$('#client-dropdown').tokenInput("get");
					if (cln){
						var cm = new ClientModel();
						cm.set({'id':cln[0]['id'],'name':cln[0]['name']});
						curClient = cm;
						self.$('#show-client-card').removeClass('hide');
					}
				},
				onDelete: function(){
					curClient = new ClientModel();
					self.$('#show-client-card').addClass('hide');
				},
				onResult: function(results){
					if (results.result.length == 0){

						self.newname =  $('#token-input-client-dropdown').val();
					}
					else{
						self.newname = '';
					}
					return results;
				}
			});
		}
	});

    var ChangeManagerView = Backbone.View.extend({
        el: $("#manager-panel"),
        result_table: $('.table-result'),
        events:{
            'click .btn-save':'onSave',
        },
        initialize:function(){
            this.template  = _.template($('#managerPanelTemplate').html());
            this.render();
			this.client_find = new ClientFindView();
        },
        render:function(){
            var html = this.template();
            this.$el.html(html);
        },
        clearTable: function(){
            this.result_table.find('tbody').html('');
        },
        onSave:function(){
            var orders = $('#orders-number').val();
            var manager = $('#manager').val();
            var client_id = $('#client-dropdown').val();
            var transfer_type = $('#transfer-type').val();
            var clients = $('#clients-number').val();
            var input_clients_id = $('.client_with_id input').prop('checked');
            var self = this;

            if (manager=='---' || (transfer_type == 'order' && !orders) || (transfer_type == 'client' && !input_clients_id && !client_id) ||
                (transfer_type == 'client' && input_clients_id && !clients)) {
                Routine.showMessage('Заполните все данные', 'error');
                return;
            }
            var request_params = {manager: manager, orders: orders};

            if ($('#transfer-type').val() == 'client'){
                request_params['client_id'] = client_id;
            }

            if (input_clients_id){
                request_params['clients'] = clients;
            }



            Routine.showLoader();
            self.clearTable();
            $.ajax({
                url: '/handlers/transfer/order',
                type: 'POST',
                dataType: 'json',
                contentType: "application/json; charset=utf-8",
                data: $.toJSON(request_params),
                timeout: 35000
            }).done(function(result) {
                if(result['status']=="error")
                    Routine.showMessage(result['msg'], 'error');
                else
                {
                    result = result['result'];
                    for (var i=0; i < result.length; i++){
                        self.result_table.find('tbody').append(_.template($('#tableRowTemplate').html())(result[i]));
                    }
                    Routine.showMessage('Данные обновлены', 'success');
                }
            }).error(function(){
                Routine.showMessage('Ошибка обновления данных. Повторите попытку.', 'error');
            }).always(function(){Routine.hideLoader();});
        }
    });

    var AppView = Backbone.View.extend({
        initialize:function(){
            var self = this;
            self.changeManagerView = new ChangeManagerView();
            $('#manager').multiselect({
                buttonContainer: '<span class="dropdown" />',
                includeSelectAllOption: true,
                enableCaseInsensitiveFiltering: true,
                numberDisplayed: 4,
                filterPlaceholder: 'Найти',
                nonSelectedText: "Менеджеры",
                nSelectedText: "Менеджер выбран: ",
                selectAllText: "Все",
                maxHeight: 400
            });
        }
    });
    var app = new AppView();

    $('#transfer-type').change(function(el){
        if ($(el.target).val() == 'order'){
            $('.token-input-list').hide();
            $('#orders-number').show();
            $('#orders-number').val('');
            $('.client_with_id').hide();
        } else {
            $('.token-input-list').show();
            $('.token-input-list').val('');
            $('#orders-number').hide();
            $('.client_with_id').show();
        }
    });

    $('.client_with_id input').change(function(){
        if ($(this).prop('checked')){
            $('.token-input-list').hide();
            $('#clients-number').show();
        } else {
            $('.token-input-list').show();
            $('#clients-number').hide();
        }
    });
});
