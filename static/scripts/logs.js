$(function(){
	/**
	* глобальные переменные
	*/
	var AppView = Backbone.View.extend({
		
		// --------- Пейджинг ---------
		// текущач страница
		curPage:1,
		// всего страниц
		allPages:1,
		// текущий клиент
		curClient: null,
		// текущий менеджер
		curManager: null,
		// выбранные заказ
		curOrder: null,
		// форма поиска клиента
		ordersFind: null,
		filters:{
			// клиенты - all, или ID
			'cl': 'all',
			// заказы - all или ID
			'o':'all',
			// состояние - all или состояние
			'c':'all',
			// менеджеры - all, или email
    		'm': 'all',
    		// тип задачи
    		't':'all',
    		// время задачи
    		'r':'all',
    		// даты заказоы
    		'od':'all',
    		// сортировка - up, down
    		's':'down',
    		// сортировка по дате задач
    		'ts':'order',
    		// страница
    		'p': 1,
    		// состояние итого
    		'i':0,
    		'sc':'yes'
		},

		initialize:function(){
			this.default();

		},
		default:function(){
			this.filters = {
				'cl': 'all',
				'o':'all',
				'c':'all',
	    		'm': 'all',
	    		't':'all',
	    		'r':'all',
	    		'od':'all',
	    		's':'down',
	    		'ts':'order',
	    		'p': 1,
	    		'i':0,
	    		'sc':'yes'	    	
			}
			this.curPage = 1;
		}
	});
	var App = new AppView();

/**********************
* Models & Collections
***********************/

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
	      'contacts': []
	    },
	    initialize: function(){
	    }
 	});

	var LogModel = Backbone.Model.extend({
		
	});

	var OrderModel = Backbone.Model.extend({
		urlRoot:'/handlers/order',
 		defaults:{
 			'id':'',
 			'client_id':'',
 			'client_info':'',
 			'total_address' :'',
 			'total_montaz' : '',
 			'total_shef_montaz' : 'no',
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
 			'closed':'no',
 			'chance':0,
 			'comment':'—',
 			'chance_str':'—',
 			'history': [],
 			'tasks': [],
 			'products': [],
 			'cur_manager': '',

 		},
 		parse: function(response) {
	        var tsk = response.task;
	        if (tsk == ''){
	        	tsk = '0';
	        }

	        var dt = getloc(response.datetime);

	        return{
	        	'id': response.id,
				'client_id': response.client_id,
				'client_info': response.client_info,
				'total_address' : response.total_address,
 				'total_montaz' : response.total_montaz,
 				'total_shef_montaz' : response.total_shef_montaz,
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
				'closed': response.closed,
				'chance': response.chance,
				'comment': response.comment,
				'chance_str': response.chance_str,
				products: response.products,
				history: response.history,
				tasks: response.tasks
	        }
	    }

 	});

  	var OrderCollection = Backbone.Collection.extend({
  		url: '/handlers/orders/',
    	model: OrderModel,
    	parse:function(response){
    		App.allPages = response.pages;
    		App.clientcnt = response.clcount;
    		return response.orders;
    	}
  	});

/**
* Роутинги
*/
var AppRouter = Backbone.Router.extend({
        routes: {
        }
    });

var app_router = new AppRouter();

/**********************
* Views
***********************/




/**
* список заказов
*/

var OrderTableView = Backbone.View.extend({
		el: $('#client-orders-list'),
		filter: new Object(),
		iv:null,
		findurl: '/handlers/clientfind/notcl',
		ordersTabe:null,
		events:{
			'click .prev-page': 'prevPage',
			'click .next-page': 'nextPage',
			'change #manager-filter': 'changeFilter'

		},

		clearToken:function(){
			this.$('#client-dropdown').tokenInput("clear");
			curClient = new ClientModel();
		},

    	changeFilter:function(){
    		App.curPage = 1;
    		this.filter['p'] = 1;
    		var mng = this.$('#manager-filter').val();
    		App.curManager = mng;
    		this.filter['m'] = mng;
    		var self = this;

    		this.collection.reset().fetch({data: this.filter}).complete(function(){
			 	self.render();});
    	},

		showLoader:function(){
				$.blockUI({'message':'<img src="/static/img/spinner.gif">', 'css':{'border':'none', 'backgroundColor':'transparent'}, 'overlayCSS':{'backgroundColor':'#fff', 'cursor':'pointer'}});
		},
		hideLoader:function(){
				$.unblockUI();
		},
		initialize: function(){
			App.orderView = this;
			App.curPage = 1;
			var self = this;
			this.template = _.template($('#orderTableTemplate').html());

			this.filter = App.filters;
			
			this.collection = new OrderCollection();
			this.$el.html(this.template());

			this.collection.bind('request', this.showLoader, this);
			this.collection.bind('sync', this.hideLoader, this);

			this.collection.fetch({data: this.filter}).complete(function(){
			 	self.render();
			 	self.listenTo(self.collection, 'change reset add remove sort', self.render);
			});

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
						App.curClient = cm;
						self.filter['cl'] = cln[0]['id'];
						self.updateOrdersTable();
					}
				},
				onDelete: function(){
					App.curClient = null;
					self.filter['cl'] = 'all';
					self.updateOrdersTable();
				}
			});
		},
		render: function() {

			var self = this;
			this.$(".order-table").empty().html('');
      		_.each(this.collection.models, function (item) {
      			var cl = App.clientcnt[item.get('client_id')]
      			item.set({'clientcnt':cl})
          		self.renderOne(item);
      		}, this);
      		
      		
      		if (App.curPage == 1){
      			this.$('.previous').addClass('disabled');
      		}
      		else{
      			this.$('.previous').removeClass('disabled');
      		}

      		if (App.allPages == App.curPage){
      			this.$('.next').addClass('disabled');
      		}
      		else{
      			this.$('.next').removeClass('disabled');
      		}
      		if (App.allPages == 0){
      			this.$('.next').addClass('disabled');
      		}




      		return this;
    	},
    	updateOrdersTable:function(){
    		var self = this;
    		App.curPage = 1;
    		this.filter['p'] = App.curPage;
    		this.collection.reset().fetch({data: this.filter}).complete(function(){
    			self.render();
			 	$(window).scrollTop(0);
			 });

    	},
    	renderOne: function(item){
    		if (item.get('id') == '')
    			return;

    		var view = new OrderTableItemView({model: item});
    		view.parentView = this;
      		this.$(".order-table").append(view.render().el);
      		return view;
    	},
    	
    	prevPage:function(el){
    		if (this.$('.previous').hasClass('disabled'))
    			return;
    		if (App.curPage > 1){
    			App.curPage--;
    		}

    		this.filter['p'] = App.curPage;
    		// app_router.navigate(this.filterToUrl());
    		this.collection.reset().fetch({data: this.filter}).complete(function(){
			 	$(window).scrollTop(0);
			 });

    	},

    	nextPage:function(el){
    		if (this.$('.next').hasClass('disabled'))
    			return;
    		App.curPage++;

    		this.filter['p'] = App.curPage;
    		// app_router.navigate(this.filterToUrl());

    		this.collection.reset().fetch({data: this.filter}).complete(function(){
			 	$(window).scrollTop(0);
			 });

    	},
		show:function(){
			this.$el.show();
		},
		hide:function(){
			this.$el.hide();
			$('#client-find-form').unblock();
		},
		close:function(){
			this.iv.close();
			this.$el.hide();
			this.$el.empty();
			this.undelegateEvents();
    		this.$el.removeData().unbind();
		}
	});

/**
* заказ
*/
	var OrderTableItemView = Backbone.View.extend({
		tagName:'div',
		className: 'row table-item',
		events:{
			
		},
		initialize:function(){
			this.template = _.template($('#orderTableItemTemplate').html());

		},
		render: function() {
			this.$el.html(this.template(this.model.toJSON()));
        	return this;
    	}
	});

	App.ordersFind = new OrderTableView();
	App.ordersFind.show();

});


function getloc(dt){

	if (moment(dt, 'DD.MM.YYYY HH:mm:ss').isValid()){
		dt = moment.utc(dt, 'DD.MM.YYYY HH:mm:ss').local().format('DD.MM.YYYY HH:mm:ss');
	}

	return dt;
}

function urlToObj(url){
	var regex = /[?&]([^=#]+)=([^&#]*)/g,
        params = {},
        match;
    while(match = regex.exec(url)) {
        params[match[1]] = match[2];
    }
    return params;
}
