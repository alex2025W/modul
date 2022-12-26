$(function(){
  var substringMatcher = function(strs) {
    return function findMatches(q, cb) {
    var matches, substringRegex;

    // an array that will be populated with substring matches
    matches = [];

    // regex used to determine if a string contains the substring `q`
    substrRegex = new RegExp(q, 'i');

    // iterate through the pool of strings and for any string that
    // contains the substring `q`, add it to the `matches` array
    $.each(strs, function(i, str) {
      if (substrRegex.test(str)) {
      matches.push(str);
      }
    });

    cb(matches);
    };
  };

  var states = ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California',
    'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii',
    'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
    'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
    'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
    'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota',
    'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island',
    'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
    'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
  ];

  window.MANAGER = MANAGER;
  window.MA = MA;

  /**
  * глобальные переменные
  */
  var AppView = Backbone.View.extend({
    orderView:null,
    productView:null,
    clientView: null,
    // --------- Пейджинг ---------
    // текущач страница
    curPage:1,
    // всего страниц
    allPages:1,
    //---------- Для блока Итого ---
    // топ назначений для Итого
    top:[],
    //  клиенты для Итого
    clients:null,
    // общее число клиентов для итого
    clientcnt:null,
    // данные по Abc классификации по клиентам
    clients_abc:{},
    // новые заказы для Итого
    // neword:null,
    // старые заказы для итого
    // oldord:null,
    summaryCount:null,
    //------- Фильтры ---------------
    filters:{
      // фильтрация итого менеджеров
      managers: 0,
      // клиенты - all, или ID
      'cl': 'all',
      // заказы - all или ID
      'o':'all',
      // состояние - all или состояние
      //'c':'all',
      'c':'промежуточное',
      // менеджеры - all, или email
      // 'm': window.MA?'all':window.MANAGER,
      'm': window.MA?'':window.MANAGER,
      // тип задачи
      't':'all',
      // время задачи
      'r':'all',
      // даты заказоы
      'od':'all',
      // даты первоначального события
      'oed':'all',
      // дата закрытия
      'cd':'all',
      // дата сдачи
      'fd':'all',
      // вероятность
      'ch':'all',
      // сортировка
      's':'410',
      // сортировка по дате задач
      'ts':'order',
      /* спящие и закрытые */
      'sc':'no',
      // страница
      'p': 1,
      // состояние итого
      'i':0,
      // избранные
      'fa':'off',
      // выбранный проект
      'project':'',
    },
    // состояние раскрывашек collapsers
    collapsers: {},
    toDef:function(){
      var managers = this.filters['managers'];
      this.filters = {
        'managers': managers,
        'cl': 'all',
        'o':'all',
        'c':'all',
        'm': window.MA?'':window.MANAGER,
        't':'all',
        'r':'all',
        'od':'all',
        'oed':'all',
        'cd':'all',
        'fd':'all',
        'ch':'all',
        's':'410',
        'ts':'order',
        'sc':'no',
        'p': 1,
        'i':0,
        'fa':'off',
        'project':''
      }
      this.curPage = 1;
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
window.App = new AppView();


// var getloc = require('./utils/getloc');

/**********************
* Models & Collections
***********************/


var ItogoCollection = require('./collections/itogo_collection');

var ManagerStatCollection = require('./collections/manager_stat_collection');

var ClientModel = require('./models/client_model');

var PositionModel = require('./models/position_model');

var PositionCollection = require('./collections/position_collection');

var HistoryModel = require('./models/history_model');

var HistoryCollection = require('./collections/history_collection');

var TaskModel = require('./models/task_model');

var TaskCollection = require('./collections/task_collection');

var ProductModel =  require('./models/product_model');

var ProductCollection = require('./collections/product_collection');

var OrderModel =  require('./models/order_model');
var GroupModel = require('./models/group_model');
var ServiceModel = require('./models/service_model');

var OrderCollection =  require('./collections/order_collection');
var ServiceCollection =  require('./collections/service_collection');



var curClient = new ClientModel();
var curGroup = new GroupModel();

/**
* Роутинги
*/
var AppRouter = Backbone.Router.extend({
    routes: {
      "orders/:filter": "orderList",
      "orders/:filter/tasks/:id": "orderList",
      "orders/:filter/history/:id": "orderList",
      "orders/:filter/products/:id": "orderList",
      "orders/:filter/client-card/:id": "orderList",
      "find-client/:id": "findClient",
      "find-client/:id/new-order": "clientNewOrder",
      "find-client/:id/client-card": "findClient",
      "new-client-card": "newClientCard",
      "": "rootRoute"
    }
  });

window.app_router = new AppRouter();

/**********************
* Views
***********************/


/**
* Форма поиска клиента
*/

var ClientFindView = Backbone.View.extend({
    el: $('#client-find-form'),
    findurl: '/handlers/clientfind/notcl',
    newname: '',
    events:{
      //'click #show-new-client-card': 'newClientCard',
      //'click #show-client-card': 'showClientCard',
      //'click #add-new-order': 'showNewOrder',
      'click #add-new-order-quick': 'newClientCard',// 'showNewOrderQuick',
      'click #show-orders': 'showOrdersTable',
      'click .blockOverlay': 'unblockForm',
      'keypress .order-finder': 'onSearchOrder',
    },

    /**
     *  событие ENTER поля поиска заявки
    **/
    onSearchOrder:function(e){
      if (e.which === 13)
      {
        //this.onSearch(true);
        var order_number = this.$('.order-finder').val();
        if(order_number)
        {
          window.location = '/crm/'+order_number;
        }
      }
    },

    changeCl: function(){
      this.findurl = this.$('.cl-checkbox').is(':checked')?'/handlers/clientfind/cl':'/handlers/clientfind/notcl';
    },
    clearToken:function(){
      // this.$('li.as-selection-item','ul.as-selections').remove();
      this.$('#client-dropdown').clientFinder("clear");
      curClient = new ClientModel();
      curGroup = new GroupModel();
      this.$('.lnk-open-client-card').hide();
    },
    newClientCard: function(){
      //var name = this.newname;
      var id = "";
      var cc = this.$('#client-dropdown').clientFinder('get');
      if(cc && cc['id'] && cc['id'].indexOf('gr_')!=0){
        if(cc['have_access']===false){
          $.jGrowl("Невозможно создать заявку. Нет доступа к выбранному клиенту.", { 'themeState':'growl-error', 'sticky':false, life: 10000, 'position': 'bottom-right' });
          return;
        }
        id = cc['id']
      }



      window.location = '/client-card/new/'+id;
      /*return;
      if (window.App.orderView){
        window.App.orderView.close();
      }
      if(window.App.productView){
        window.App.productView.close();
      }
      if(window.App.clientView){
        window.App.clientView.hide();
      }
      var m = new ClientModel();
      m.set({'id':''})
      if (this.newname != ''){
        m.set({'name':this.newname});
      }
      this.clearToken();
      var cc = new ClientCardView({'model': m});

      this.$el.hide();
      cc.show(); */
    },
    showClientCard: function(){
      window.location = '/client-card/'+curClient.get('id');
      return;
      if (window.App.orderView){
        window.App.orderView.close();
      }
      if(window.App.productView){
        window.App.productView.close();
      }
      if(window.App.clientView){
        window.App.clientView.hide();
      }
      var cln = this.$('#client-dropdown').clientFinder("get");
      var cm = curClient.clone();
      if (cm.get('id') != ''){
        var cc = new ClientCardView({'model': cm});
        this.$el.hide();
        cc.show();
      }
    },
    showOrdersTable: function(){
      if (window.App.orderView){
        window.App.orderView.close();
      }
      if(window.App.productView){
        window.App.productView.close();
      }
      if(window.App.clientView){
        window.App.clientView.hide();
      }
      if (curClient.get('id') === '' && curGroup.get("id")===''){
        this.clearToken();
      }
      // window.App.toDef();
      var ot = new OrderTableView();
      // this.$el.block({'message':null, 'overlayCSS':{'backgroundColor':'#fff', 'cursor':'pointer'}});
      ot.show();
      return ot;
    },
    fillClientInput:function(){
      if (!window.App.filters['gr'] && (window.App.filters['cl']=='all' || !window.App.filters['cl'])){
        $('#client-dropdown').clientFinder("clear");
        curClient = new ClientModel();
        curGroup = new GroupModel();
        $('.lnk-open-client-card').hide();
      }else
      {
        $.ajax({
          type: "POST",
          url: "/handlers/get_user_or_group",
          data: {'type':window.App.filters['gr']?'gr':'cl', 'id':window.App.filters['gr']?window.App.filters['gr']:window.App.filters['cl']},
          timeout: 55000,
          contentType: 'application/json',
          dataType: 'json',
          async:true
        }).done(function(res){
//          $('#client-dropdown')[0].do_not_reload = true;
          curClient = new ClientModel();
          curGroup = new GroupModel();
          $('#client-dropdown').clientFinder("clear");
          if(res.type=='gr'){
            curGroup.set({'id':res['id'], 'name':res['name']});
            $('#client-dropdown').clientFinder('set',curGroup.toJSON());
          }else if(res.type=='cl'){
            curClient.set({'id':res['id'], 'name':res['name']});
            $('#client-dropdown').clientFinder('set',curClient.toJSON());
          }
//          $('#client-dropdown')[0].do_not_reload = false;
        });
      }

      if(!window.App.filters['project']){
        $("#project-dropdown").clientFinder("clear");
        $(".lnk-open-project-card").hide();
      }else{
        $.ajax({
          type: "GET",
          url: "/handlers/projects/project/"+window.App.filters['project'],
          timeout: 55000,
          contentType: 'application/json',
          dataType: 'json',
          async:true
        }).done(function(res){
          if(res['_id']){
            $(".lnk-open-project-card").show();
            $('#project-dropdown').clientFinder('set',{'id':res['_id'],'name':res['project_name']});
          }
        });

      }
    },
    showNewOrder:function(){
      if (window.App.orderView){
        window.App.orderView.close();
      }
      if(window.App.productView){
        window.App.productView.close();
      }
      if(window.App.clientView){
        window.App.clientView.hide();
      }
      var ot = new OrderTableView();

      ot.show();
      return ot.newOrderForm();
    },
    showNewOrderQuick:function(){
      var no = this.showNewOrder();
      no.showHistory();
    },
    unblockForm:function(){

      if (window.App.orderView){
        window.App.orderView.close();
      }
      if(window.App.productView){
        window.App.productView.close();
      }
      if(window.App.clientView){
        window.App.clientView.hide();
      }
      window.App.filters['managers'] = 0;
      window.App.filters['o'] = 'all';
      window.App.filters['c'] = 'all';
      window.App.filters['m'] = window.MA?'':window.MANAGER;
      window.App.filters['t'] = 'all';
      window.App.filters['r'] = 'all';
      window.App.filters['od'] = 'all';
      window.App.filters['oed'] = 'all';
      window.App.filters['cd'] = 'all';
      window.App.filters['ch'] = 'all';
      window.App.filters['s'] = '410';
      window.App.filters['ts'] = 'order';
      window.App.filters['sc'] = 'no';
      window.App.filters['p'] = 1;
      var cl = curClient.clone();
      self.newname = '';
      this.clearToken();
      if (cl.get('id') != ''){

        this.$('#client-dropdown').clientFinder("set", {id: cl.get('id'), name: cl.get('name')});
        window.App.filters['cl'] = cl.get('id');
        window.app_router.navigate('find-client/'+cl.get('id'));
      }
      else{
        window.App.filters['cl'] = 'all';
        window.app_router.navigate('find-client');
      }
      this.$el.unblock();
    },
    show:function(){
      var cl = curClient.clone();
      self.newname = '';
      this.clearToken();
      if (cl.get('id') != ''){
        this.$('#client-dropdown').clientFinder("set", {id: cl.get('id'), name: cl.get('name')});
        window.App.filters['cl'] = cl.get('id');
        window.App.filters['s'] = 410;
      }
      else{

        window.App.filters['cl'] = 'all';
        window.App.filters['s'] = 410;
      }
      this.$el.show();
      window.app_router.navigate('find-client');
    },
    initialize:function(){
      var self = this;

      // поиск заявкт


      var el = this.$('#client-dropdown');
      var handler = function(cln){
        self.newname = '';
        var is_gr = (cln['id'].indexOf('gr_')==0);
        if (cln && !is_gr){
          self.$('.lnk-open-client-card').prop('href', '/client-card/' + cln['id']);
          self.$('.lnk-open-client-card').show();

          var cm = new ClientModel();
          cm.set({'id':cln['id'],'name':cln['name']});
          curClient = cm;
          window.App.toDef();
          window.App.filters['cl'] = cln['id'];
          window.App.filters['c'] = 'total';

          /*self.$('#add-new-order').removeClass('hide');
          self.$('#add-new-order-quick').removeClass('hide');
          self.$('#show-client-card').removeClass('hide');
          self.$('#show-new-client-card').addClass('hide');*/
          // window.app_router.navigate('find-client/'+cln[0]['id']);
          if (window.App.orderView){
            window.App.orderView.close();
          }
          self.showOrdersTable();
        }else
        if(cln && is_gr){
          window.App.toDef();
          window.App.filters['c'] = 'total';
          window.App.filters['gr']=cln['name'];
          /*self.$('#add-new-order').removeClass('hide');
          self.$('#add-new-order-quick').removeClass('hide');
          self.$('#show-client-card').removeClass('hide');
          self.$('#show-new-client-card').addClass('hide'); */
          // window.app_router.navigate('find-client/'+cln[0]['id']);
          curGroup.set('id',cln['id'].replace('gr_',''));
          curGroup.set('name',cln['name']);
          if (window.App.orderView){
            window.App.orderView.close();
          }
          self.showOrdersTable();
        }
      }

      $(el).clientFinder({onSelect: handler});

      $("#project-dropdown").clientFinder({onSelect:function(cln){
        window.App.filters['project'] = cln['id'];
        window.App.filters['c'] = 'total';
        self.$(".lnk-open-project-card").prop('href','/projects#search/'+cln['id']);
        self.$(".lnk-open-project-card").show();
        self.showOrdersTable();
      }, url: "/handlers/projects/search_tn?q=%QUERY", transform:function(response){return response;}, formatTemplate:function(data){  return '<div data-id="' + data.id + '" class="tt-suggestion tt-selectable">'+data.name+'</div>';} })


//      el.tokenInput(self.findurl, {
//        method:'POST',
//        minChars:2,
//        jsonContainer:'result',
//        hintText:'Поиск клиента',
//        noResultsText:'Клиенты не найдены',
//        searchingText:'Поиск',
//        tokenLimit:1,
//        onAdd: function(){
//          // при смене значения из кода ничего не нужно перегружать
//          if(this[0].do_not_reload)
//            return;
//          self.newname = '';
////          var cln = self.$('#client-dropdown').tokenInput("get");
//          var is_gr = (cln[0]['id'].indexOf('gr_')==0);
//          if (cln && !is_gr){
//
//            self.$('.lnk-open-client-card').prop('href', '/client-card/' + cln[0]['id']);
//            self.$('.lnk-open-client-card').show();
//
//            var cm = new ClientModel();
//            cm.set({'id':cln[0]['id'],'name':cln[0]['name']});
//            curClient = cm;
//            window.App.toDef();
//            window.App.filters['cl'] = cln[0]['id'];
//            window.App.filters['c'] = 'total';
//
//            /*self.$('#add-new-order').removeClass('hide');
//            self.$('#add-new-order-quick').removeClass('hide');
//            self.$('#show-client-card').removeClass('hide');
//            self.$('#show-new-client-card').addClass('hide');*/
//            // window.app_router.navigate('find-client/'+cln[0]['id']);
//            if (window.App.orderView){
//              window.App.orderView.close();
//            }
//            self.showOrdersTable();
//          }else
//          if(cln && is_gr){
//            window.App.toDef();
//            window.App.filters['c'] = 'total';
//            window.App.filters['gr']=cln[0]['name'];
//            /*self.$('#add-new-order').removeClass('hide');
//            self.$('#add-new-order-quick').removeClass('hide');
//            self.$('#show-client-card').removeClass('hide');
//            self.$('#show-new-client-card').addClass('hide'); */
//            // window.app_router.navigate('find-client/'+cln[0]['id']);
//            curGroup.set('id',cln[0]['id'].replace('gr_',''));
//            curGroup.set('name',cln[0]['name']);
//            if (window.App.orderView){
//              window.App.orderView.close();
//            }
//            self.showOrdersTable();
//          }
//        },
//        onDelete: function(){
//          self.$('.lnk-open-client-card').hide();
//
//          if(this[0].do_not_reload)
//            return;
//          curClient = new ClientModel();
//          /*self.$('#show-client-card').addClass('hide');
//          self.$('#add-new-order').addClass('hide');
//          self.$('#add-new-order-quick').addClass('hide');
//          self.$('#show-new-client-card').removeClass('hide'); */
//          window.App.filters['cl'] = 'all';
//          self.showOrdersTable();
//          // window.app_router.navigate('find-client');
//          // if (window.App.orderView){
//          //      window.App.orderView.close();
//          // }
//        },
//        onResult: function(results){
//          /*
//          if (results.result.length == 0){
//
//            self.newname =  $('#token-input-client-dropdown').val();
//          }
//          else{
//            self.newname = '';
//          }
//          */
//          self.newname =  $('#token-input-client-dropdown').val();
//          return results;
//        }
//      });
    }
  });



var ClientCardView = require('./views/client_card_view');

var PagerView = require('./views/pager_view');

var ManagersView = require('./views/managers_view');

var ItogoView = require('./views/itogo_view');

/**
* форма задач
**/
var TaskFormView = require('./views/task_form_view');


/**
* список заказов
*/

var OrderTableView = Backbone.View.extend({
    el: $('#client-orders-list'),
    filter: new Object(),
    iv1:null,
    iv2:null,
    sorter: [],
    events:{
      'click #add-new-order': 'newOrderForm',
      'click #apply-condition': 'changeCondition',
      'change #sleep-and-close': 'changeSleep',
      'click #no-close-date': 'changeClose',
      'click #no-finish-date': 'changeFinish',
      'click #only-new-date': 'changeOnlyNew',
      'change .cb-initiator': 'changeInitiator',
      //'change #manager-filter': 'changeFilter',
      'click #apply-manager': 'changeManager',
      'change #chance-select-filter': 'changeFilter',
      'change #task-filter': 'changeFilterTaks',
      'click .date-filter': 'dateFilter',
      'click .task-filter-sort': 'taskDateFilter',
      'click .price-filter-sort': 'priceDateFilter',
      'click .close-date-filter-sort': 'closeDateFilter',
      'click .finish-date-filter-sort': 'finishDateFilter',
      'click .chance-filter-sort': 'chanceDateFilter',
      'click .prev-page': 'prevPage',
      'click .next-page': 'nextPage',
      'click .cancel-task-date-filter': 'cancelTaskDateFilter',
      'click .cancel-order-date-filter': 'cancelOrderDateFilter',
      'click .cancel-order-start-date-filter': 'cancelOrderStartDateFilter',
      'click .cancel-close-date-filter': 'cancelCloseDateFilter',
      'click .cancel-finish-date-filter': 'cancelFinishDateFilter',
      // 'click .by-client': 'clientFilter',
      'click .sort-lnk': 'sortTable',
      'click .filter-favorite': 'favoriteFilter',
      'click .clear-all-filters':'onClearAllFilters',
      'click .client-group':'onGroupFilter',
      'click .show-all-orders':'onShowAllClick',
      'pager:change_page': 'onChangePage',
    },

    itogoBlock:function(){
      var self = this;
      this.$('.itogo-block').html('');
      var ic = new ItogoCollection();
      ic.fetch({data: this.filter,timeout:50000}).complete(function(){
        self.iv1 = new ItogoView({el: self.$('.itogo-block1'), collection: ic});
      });
      var ic2 = new ItogoCollection();
      var new_filter = {'itogo':'50'}
      $.extend(new_filter, this.filter);
      ic2.fetch({data: new_filter ,timeout:50000}).complete(function(){
        self.iv2 = new ItogoView({el: self.$('.itogo-block2'), collection: ic2});
      });
    },

    managersBlock:function(){
      var self = this;
      if (self.iv1){
        self.iv1.off('changeManagersFilter');
      }
      //this.$('.managers-block').html('');
      var ic = new ManagerStatCollection();
      //this.showLoader();
      ic.fetch({data: this.filter,timeout:50000}).complete(function(){
        self.iv1 = new ManagersView({el: self.$('.managers-block'), collection: ic});
        self.iv1.on('changeManagersFilter', self.managersBlock, self);
        window.app_router.navigate(self.filterToUrl());
      //self.hideLoader();
      });
    },

    showLoader:function(){
        $.blockUI({'message':'<img src="/static/img/spinner.gif">', 'css':{'border':'none', 'backgroundColor':'transparent'}, 'overlayCSS':{'backgroundColor':'#fff', 'cursor':'pointer'}});
    },
    hideLoader:function(){
        $.unblockUI();
    },
    initialize: function(){

      window.App.orderView = this;
      window.App.curPage = window.App.filters['p'];

      var self = this;
      this.template = _.template($('#orderTableTemplate').html());

      if (curClient && curClient.get('id') != ''){
        window.App.filters['cl'] = curClient.get('id');
      }

      for (i = 0; i<20; i++)
        this.sorter.push(null);
      this.sorter[0] = '000';

      this.filter = window.App.filters;

      window.app_router.navigate(this.filterToUrl());

      this.collection = new OrderCollection();
      //this.$el.html(this.template());

      this.collection.bind('request', this.showLoader, this);
      this.collection.bind('sync', this.hideLoader, this);
      this.collection.bind('error', this.hideLoader, this);
      this.collection.bind('invalid', this.hideLoader, this);

      this.collection.fetch({data: this.filter, timeout:50000}).complete(function(){
        self.render();
        self.listenTo(self.collection, 'change reset add remove sort', self.render);
      });
    },

    render: function() {
      this.$el.html(this.template());
      var self = this;

      // отрисовка пейджера
      window.App.pagerView = new PagerView({el:this.$el.find('.list-pager') });
      window.App.pagerView.render(window.App.curPage, window.App.allPages);


      this.$(".order-table").find('tbody').remove();
      _.each(this.collection.models, function (item) {
        //var cl = window.App.clientcnt[item.get('client_id')]
        //item.set({'clientcnt':cl})
        self.renderOne(item);
      }, this);


      if (!curClient || curClient.get('id') == ''){
        this.$('#add-new-order').hide();
      }
      else{
        this.$('#add-new-order').show();
      }
      if (window.App.curPage == 1){
        this.$('.previous').addClass('disabled');
      }
      else{
        this.$('.previous').removeClass('disabled');
      }

      if (window.App.allPages == window.App.curPage){
        this.$('.next').addClass('disabled');
      }
      else{
        this.$('.next').removeClass('disabled');
      }
      if (window.App.allPages == 0){
        this.$('.next').addClass('disabled');
      }



      this.$('.task-date-filter').daterangepicker({
        // format: 'DD.MM.YYYY',
        startDate: moment(),
        endDate: moment(),
        alwaysShowCalendars: true,
        opens: "left",
        // autoUpdateInput: false,
        ranges: {
               'Сегодня': [moment(), moment()],
               'Вчера': [moment().subtract('days', 1), moment().subtract('days', 1)],
               'Завтра': [moment().add('days', 1), moment().add('days', 1)],
               'За 7 дней': [moment(),moment().add('days', 6)],
               'За 30 дней': [moment(),moment().add('days', 29)],
               'Старые': [moment().subtract('years', 1), moment().subtract('days', 1)]
            },
        locale: {
              applyLabel: 'Выбрать',
              cancelLabel: 'Отмена',
              customRangeLabel:'Свой период',
              fromLabel: 'От',
              toLabel: 'До',
              daysOfWeek: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт','Сб'],
              monthNames: ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"],
              firstDay: 2,
              format: 'DD.MM.YYYY'
            }
        },
        function(start, end, label) {
          var rng = self.textToDateRange(label);
          if (rng){
            self.filter['r'] = rng[2];
          }
          else{
            self.filter['r'] = start.format('DD.MM.YYYY') + '-' + end.format('DD.MM.YYYY');
          }
          self.$('.task-date-filter').text(start.format('DD.MM.YYYY') + ' - ' + end.format('DD.MM.YYYY'));
          //self.filter['r'] = start.format('DD.MM.YYYY') + '-' + end.format('DD.MM.YYYY');
          //self.changeFilter();
          self.changeFilterTaks();
        }
      );

      this.$('.order-date-filter').daterangepicker({
        // format: 'DD.MM.YYYY',
        startDate: moment(),
        endDate: moment(),
        alwaysShowCalendars: true,
        // locale: { format: 'DD-MM-YYYY',"separator": "-"},
        ranges: {
               'Сегодня': [moment(), moment()],
               //'Сегодня': ['today', 'today'],
               'Вчера': [moment().subtract('days', 1), moment().subtract('days', 1)],
               //'Вчера': ['yesterday', 'yesterday'],
               'За 7 дней': [moment().subtract('days', 6),moment()],
               //'За 7 дней': ['7days', '7days'],
               'За 30 дней': [moment().subtract('days', 29),moment()]
               //'За 30 дней': ['30days','30days']
            },
        locale: {
              applyLabel: 'Выбрать',
              cancelLabel: 'Отмена',
              customRangeLabel:'Свой период',
              fromLabel: 'От',
              toLabel: 'До',
              daysOfWeek: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт','Сб'],
              monthNames: ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"],
              firstDay: 1,
              format: 'DD.MM.YYYY'
            }
        },
        function(start, end, label) {
        var rng = self.textToDateRange(label);
        self.$('.order-date-filter').text(start.format('DD.MM.YYYY') + ' - ' + end.format('DD.MM.YYYY'));
        if (rng){
          self.filter['od'] = rng[2];
        }
        else{
          self.filter['od'] = start.format('DD.MM.YYYY') + '-' + end.format('DD.MM.YYYY');
        }
        self.changeFilter();
        }
      );


      this.$('.order-start-date-filter').daterangepicker({
        // format: 'DD.MM.YYYY',
        startDate: moment(),
        endDate: moment(),
        alwaysShowCalendars: true,
        ranges: {
               'Сегодня': [moment(), moment()],
               //'Сегодня': ['today', 'today'],
               'Вчера': [moment().subtract('days', 1), moment().subtract('days', 1)],
               //'Вчера': ['yesterday', 'yesterday'],
               'За 7 дней': [moment().subtract('days', 6),moment()],
               //'За 7 дней': ['7days', '7days'],
               'За 30 дней': [moment().subtract('days', 29),moment()]
               //'За 30 дней': ['30days','30days']
            },
        locale: {
              applyLabel: 'Выбрать',
              cancelLabel: 'Отмена',
              customRangeLabel:'Свой период',
              fromLabel: 'От',
              toLabel: 'До',
              daysOfWeek: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт','Сб'],
              monthNames: ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"],
              firstDay: 1,
              format: 'DD.MM.YYYY'
            }
        },
          function(start, end, label) {
          var rng = self.textToDateRange(label);
          self.$('.order-start-date-filter').text(start.format('DD.MM.YYYY') + ' - ' + end.format('DD.MM.YYYY'));
          if (rng){
            self.filter['oed'] = rng[2];
          }
          else{
            self.filter['oed'] = start.format('DD.MM.YYYY') + '-' + end.format('DD.MM.YYYY');
          }
          self.changeFilter();
        }
      );

      this.$('.close-date-filter').daterangepicker({
        // format: 'DD.MM.YYYY',
        startDate: moment(),
        endDate: moment(),
        alwaysShowCalendars: true,
        ranges: {
               'На этой неделе': [moment(), moment().endOf('week').add('d',1)],
               'На сл. неделе': [moment().add('w', 1).startOf('week').add('d',1), moment().add('w', 1).endOf('week').add('d',1)],
               'В этом месяце': [moment(), moment().endOf('month')],
               'В сл. месяце': [moment().add('month', 1).startOf('month'), moment().add('month', 1).endOf('month')]
            },
        locale: {
              applyLabel: 'Выбрать',
              cancelLabel: 'Отмена',
              customRangeLabel:'Свой период',
              fromLabel: 'От',
              toLabel: 'До',
              daysOfWeek: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт','Сб'],
              monthNames: ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"],
              firstDay: 1,
              format: 'DD.MM.YYYY'
            }
        },
        function(start, end, label) {
        var rng = self.textToDateRange(label);
        if (rng){
          self.filter['cd'] = rng[2];
        }
        else{
          self.filter['cd'] = start.format('DD.MM.YYYY') + '-' + end.format('DD.MM.YYYY');
        }
        self.$('.close-date-filter').text(start.format('DD.MM.YYYY') + ' - ' + end.format('DD.MM.YYYY'));
        // self.filter['cd'] = start.format('DD.MM.YYYY') + '-' + end.format('DD.MM.YYYY');
        //self.$('#no-close-date').prop('checked', false);
        self.changeFilter();
        }
      );

      // Дата сдачи---------------------------------
      this.$('.finish-date-filter').daterangepicker({
        // format: 'DD.MM.YYYY',
        startDate: moment(),
        endDate: moment(),
        alwaysShowCalendars: true,
        ranges: {
               'На этой неделе': [moment(), moment().endOf('week').add('d',1)],
               'На сл. неделе': [moment().add('w', 1).startOf('week').add('d',1), moment().add('w', 1).endOf('week').add('d',1)],
               'В этом месяце': [moment(), moment().endOf('month')],
               'В сл. месяце': [moment().add('month', 1).startOf('month'), moment().add('month', 1).endOf('month')]
            },
        locale: {
              applyLabel: 'Выбрать',
              cancelLabel: 'Отмена',
              customRangeLabel:'Свой период',
              fromLabel: 'От',
              toLabel: 'До',
              daysOfWeek: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт','Сб'],
              monthNames: ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"],
              firstDay: 1,
              format: 'DD.MM.YYYY'
            }
        },
        function(start, end, label) {
        var rng = self.textToDateRange(label);
        if (rng){
          self.filter['fd'] = rng[2];
        }
        else{
          self.filter['fd'] = start.format('DD.MM.YYYY') + '-' + end.format('DD.MM.YYYY');
        }
        self.$('.finish-date-filter').text(start.format('DD.MM.YYYY') + ' - ' + end.format('DD.MM.YYYY'));
        self.changeFilter();
      });
      //-------------------------------


      if (this.filter['fa'] == 'on'){
        var star = this.$('.filter-favorite i');
        star.data('status', 'on');
        star.removeClass('fa-star-o').addClass('fa-star');
      }

      if (this.filter['m'] && this.filter['m'] != 'all' && this.filter['m'] != ''){
        var cn = this.filter['m'].split(',');
        _.each(cn, function(itm){self.$('#manager-filter option[value="'+ itm +'"]').prop('selected', true);});
        /*for(var mi in this.filter['m'])
          this.$('#manager-filter option[value="'+this.filter['m'][mi] +'"]').prop('selected', true);*/
      }


      if (this.filter['c'] != 'all'){
        if (this.filter['c'] != 'total'){
          var cn = this.filter['c'].split(',');
          _.each(cn, function(itm){self.$('#condition-filter2 option[value="'+ itm +'"]').prop('selected', true);});
        }
        else{
          //self.$('#condition-filter2 option[value="total"]').prop('selected', true);
          self.$('#condition-filter2 option').prop('selected', true);
        }
      }

      var init = this.filter['initiator'];
      if (init != undefined) {
        _.each(init.split(','), function(itm){self.$('.cb-initiator option[value="'+ itm +'"]').prop('selected', true);});
      }

      if (this.filter['t'] != 'all'){
        this.$('#task-filter option[value="'+this.filter['t'] +'"]').prop('selected', true);
      }

      if (this.filter['od'] != 'all'){
        if (this.filter['od'].indexOf('-') !=-1){
          this.$('.order-date-filter').text(this.filter['od'].replace('-',' - '));
        }
        else{
          var rng = this.textToDateRange(this.filter['od']);
          this.$('.order-date-filter').text(rng[0].format('DD.MM.YYYY') + ' - ' + rng[1].format('DD.MM.YYYY'));
        }
      }

      if (this.filter['oed'] != 'all'){
        if (this.filter['oed'].indexOf('-') !=-1){
          this.$('.order-start-date-filter').text(this.filter['oed'].replace('-',' - '));
        }
        else{
          var rng = this.textToDateRange(this.filter['oed']);
          this.$('.order-start-date-filter').text(rng[0].format('DD.MM.YYYY') + ' - ' + rng[1].format('DD.MM.YYYY'));
        }
      }

      if (this.filter['r'] != 'all'){
        if (this.filter['r'].indexOf('-') !=-1){
          this.$('.task-date-filter').text(this.filter['r'].replace('-',' - '));
        }
        else{
          var rng = this.textToDateRange(this.filter['r']);
          this.$('.task-date-filter').text(rng[0].format('DD.MM.YYYY') + ' - ' + rng[1].format('DD.MM.YYYY'));
        }
      }

      if (this.filter['ch'] != 'all'){
        this.$('#chance-select-filter option[value="'+this.filter['ch'] +'"]').prop('selected', true);
      }

      if (this.filter['cd'] != 'all'){
        //if (this.filter['cd'] != 'no'){
        if (this.filter['cd'].indexOf('-') !=-1){
          this.$('.close-date-filter').text(this.filter['cd'].replace('-',' - '));
        }
        else{
          var rng = this.textToDateRange(this.filter['cd']);
          this.$('.close-date-filter').text(rng[0].format('DD.MM.YYYY') + ' - ' + rng[1].format('DD.MM.YYYY'));
        }
      }

      if (this.filter['fd'] != 'all'){
        //if (this.filter['cd'] != 'no'){
        if (this.filter['fd'].indexOf('-') !=-1){
          this.$('.finish-date-filter').text(this.filter['fd'].replace('-',' - '));
        }
        else{
          var rng = this.textToDateRange(this.filter['fd']);
          this.$('.finish-date-filter').text(rng[0].format('DD.MM.YYYY') + ' - ' + rng[1].format('DD.MM.YYYY'));
        }
      }

      if (this.filter['sc'] == 'no'){
        this.$('#sleep-and-close').prop('checked', false);
      }
      else{
        this.$('#sleep-and-close').prop('checked', true);
      }

      if (this.filter['iscd'] == 'no')
        this.$('#no-close-date').prop('checked', false);
      else
        this.$('#no-close-date').prop('checked', true);

      if (this.filter['isfd'] == 'no')
        this.$('#no-finish-date').prop('checked', false);
      else
        this.$('#no-finish-date').prop('checked', true);

      if(this.filter['onlnew']=='yes'){
        this.$('#only-new-date').prop('checked', true);
      }else{
        this.$('#only-new-date').prop('checked', false);
      }

      if(this.filter['initiator']=='we'){
        this.$('#cb-initiator-we').prop('checked', true);
        this.$('#cb-initiator-they').prop('checked', false);
      }else if(this.filter['initiator']=='they')
      {
        this.$('#cb-initiator-we').prop('checked', false);
        this.$('#cb-initiator-they').prop('checked', true);
      }
      else
      {
        this.$('#cb-initiator-we').prop('checked', true);
        this.$('#cb-initiator-they').prop('checked', true);
      }

      if (typeof this.filter['s'] != 'undefined'){
        var sort_arr = String(this.filter['s']).match(/.{3}/g);

        if (sort_arr.length > 0){
          $.each(this.sorter, function(k,v){
            self.sorter[k] = null;
          });
          $.each(sort_arr, function(k,v){
            var sort_data = v.split('');
            self.sorter[parseInt(sort_data[0],32)] = v;
          });
        }
      }
      this.renderSort();
      this.managersBlock();
      //this.$('#condition-filter').select2();
      // var $filter_pan = this.$('#filter-pan');
      // $filter_pan.css({'overflow':'visible'});
      // $filter_pan.on('show', function(){
      //   $filter_pan.css({'overflow':'visible'});
      // });
      // $filter_pan.on('hide', function(){
      //   $filter_pan.css({'overflow':'hidden'});
      // });

      var $condition_filter2 = this.$('#condition-filter2');
      $condition_filter2.multiselect({
        includeSelectAllOption: true,
        selectAllText: '<b>Все заявки</b>',
        selectAllValue: 'total',
        enableClickableOptGroups: true,
        enableFiltering: true,
        nSelectedText: 'Выбрано ',
        allSelectedText: 'Выбрано ',
        nonSelectedText: 'Все открытые',
        numberDisplayed: 1,
        enableCaseInsensitiveFiltering: true,
        filterPlaceholder: 'Поиск',
        maxHeight: '400',
        buttonText: function(options)
        {
          var property = ['начальное','промежуточное'];
          var property_count = {};

          var retStr = "";
          if (options.length === 0) {
          retStr = "Все заявки";
          } else if(options.length <=this.numberDisplayed){
          var textArray = [];
          $.each(options,function(key,value){
            textArray.push($.trim($(value).html()));
            var foo = $(value).data('property');
            if (property_count.hasOwnProperty(foo)){
              property_count[foo]++;
            }
          });

            retStr = "<div class='pull-left restricted'>"+textArray.join(",")+"</div>";
          } else {
            $.each(options,function(key,value){
              var foo = $(value).data('property');
              if (property_count.hasOwnProperty(foo)){
                property_count[foo]++;
              }
              else{
                property_count[foo] = 0;
              }
            });
            var new_title = '';
            Object.keys(property_count).map(function(value, index) {
              var total_amount = $condition_filter2.find('option[data-property="'+value+'" ]').length;
              if (property_count[value] === total_amount-1 && total_amount === options.length){
                new_title = $condition_filter2.find('option[value="'+value+'" ]').text();
              }
            });
            retStr = new_title != ''?new_title:this.nSelectedText+options.length;
          }

          return retStr+" <b class='caret'></b>";
        },

        onChange: function(element, checked) {
          var sel_val = element.val();
          var prop_val = element.data('property');

          var property = ['начальное','промежуточное'];
          var $par = element.parent();

          if (property.indexOf(sel_val) > -1){
            $par.find('option[data-property="'+sel_val+'" ]').prop('selected', checked);
          }
          else{
            var coef = $par.find('option[value="'+prop_val+'" ]').is(':selected') ? 0 : 1;
            var total_amount = $par.find('option[data-property="'+prop_val+'" ]').length - coef;
            var checked_amount = $par.find('option[data-property="'+prop_val+'" ]:selected').length;
            $par.find('option[value="'+prop_val+'" ]').prop('selected', total_amount === checked_amount);
          }
          //
          //

          this.refresh();
        }

      });

      // Фиксация раскрытых вкладок
      $("[data-toggle='collapse']").on('click', function (e) {
        window.App.collapsers[e.currentTarget.dataset['target']] = $(e.currentTarget.dataset['target']).hasClass('in') ? 'hide' : 'show';
      });

      $("[data-toggle='collapse']").each(function () {
        if (window.App.collapsers[this.dataset['target']] === 'show') {
          $(this.dataset['target']).removeClass('out').addClass('in');
        }
      });


      var $condition_filter = this.$('.cb-initiator');
      $condition_filter.multiselect({
        nSelectedText: 'Выбрано ',
        allSelectedText: 'Выбрано ',
        nonSelectedText: 'Все открытые',
        numberDisplayed: 1,
        maxHeight: '400',
        buttonText: function(options)
        {
          // console.log(options);
          var retStr = "";
          if (options.length === 0) {
          retStr = "Все заявки";
          } else if(options.length <=this.numberDisplayed){
          var textArray = [];
          $.each(options,function(key,value){
            textArray.push($.trim($(value).html()));
          });
            retStr = "<div class='pull-left restricted'>"+textArray.join(",")+"</div>";
          } else {
            retStr = this.nSelectedText+options.length;
          }
          return retStr+" <b class='caret'></b>";
        },

//        onChange: function(element, checked) {
//          var sel_val = element.val();
//          element.parent().find('option[data-property="'+sel_val+'" ]').prop('selected', checked);
//          this.refresh();
//        }
      });

      var $manager_filter = this.$('#manager-filter');
      $manager_filter.multiselect({
        includeSelectAllOption: true,
        selectAllText: '<b>Выбрать всех</b>',
        selectAllValue: 'total',
        enableFiltering: true,
        nSelectedText: 'Выбраны ',
        allSelectedText: 'Выбраны ',
        nonSelectedText: 'Все',
        numberDisplayed: 1,
        enableCaseInsensitiveFiltering: true,
        filterPlaceholder: 'Поиск',
        maxHeight: '400',
        buttonText: function(options)
        {
          var retStr = "";
          if (options.length === 0) {
          retStr = "Все";
          } else if(options.length <=this.numberDisplayed){
          var textArray = [];
          $.each(options,function(key,value){
            textArray.push($.trim($(value).html()));
          });
            retStr = "<div class='pull-left restricted1'>"+textArray.join(",")+"</div>";
          } else {
            retStr = this.nSelectedText+options.length;
          }
          return retStr+" <b class='caret'></b>";
        },
        onChange: function(element, checked) {
          var sel_val = element.val();
          element.parent().find('option[data-property="'+sel_val+'" ]').prop('selected', checked);
          this.refresh();
        }
      });


      this.itogoBlock();


      this.$('#itogo-pan').on('show', function(){
        self.filter['i'] = 1;
        window.app_router.navigate(self.filterToUrl());
      });
      this.$('#itogo-pan').on('hide', function(){
        self.filter['i'] = 0;
        window.app_router.navigate(self.filterToUrl());
      });

      if (this.filter['i'] == 1){
        this.$('#itogo-pan').removeClass('out').addClass('in');
      }

      window.cf.fillClientInput();

      // Пересчет высоты колонки активности
      this.$('.flex').each(function(i){
        $(this).children().css({minHeight:$(this).parent().children('.order-current-status').height()/2+"px"});
      });

      return this;
    },

    textToDateRange:function(str){
      if (str == 'Сегодня' || str =='today')
        return [moment(), moment(), 'today'];
      if (str == 'Вчера' || str == 'yesterday')
        return [moment().subtract('days', 1), moment().subtract('days', 1), 'yesterday'];
      if (str == 'За 7 дней' || str == '7days')
        return [moment().subtract('days', 6),moment(), '7days'];
      if (str == 'За 30 дней' || str == '30days')
        return [moment().subtract('days', 29),moment(), '30days'];
      if (str == 'На этой неделе' || str =='thisweek')
        return [moment(), moment().endOf('week').add('d',1), 'thisweek'];
      if (str == 'На сл. неделе' || str =='nextweek')
        return [moment().add('w', 1).startOf('week').add('d',1), moment().add('w', 1).endOf('week').add('d',1), 'nextweek'];
      if (str == 'В этом месяце' || str =='thismonth')
        return [moment(), moment().endOf('month'), 'thismonth'];
      if (str == 'В сл. месяце' || str =='nextmonth')
        return [moment().add('month', 1).startOf('month'), moment().add('month', 1).endOf('month'), 'nextmonth'];
      if (str == 'Завтра' || str =='tomorrow')
        return [moment().add('days', 1), moment().add('days', 1), 'tomorrow'];
      if (str == 'Старые' || str =='old')
        return [moment().subtract('years', 1), moment().subtract('days', 1), 'old'];
      return null;
    },

    renderOne: function(item){
      if (item.get('id') == '')
        return;

      var view = new OrderTableItemView({model: item});
      view.parentView = this;
      var elm = view.render().el;
      $(elm).children(".order-details").on("click", function(){
          $(this).toggleClass('collapsed');
      });
      this.$(".order-table").append(elm);
      return view;
    },
    cancelTaskDateFilter:function(){
      if (this.filter['r'] == 'all')
        return;
      this.filter['r'] = 'all';
      this.$('.task-date-filter').text('Все даты');
      this.changeFilterTaks();
      //this.changeFilter();
    },
    cancelOrderDateFilter:function(){
      if (this.filter['od'] == 'all')
        return;
      this.filter['od'] = 'all';
      this.$('.order-date-filter').text('Все даты');
      this.changeFilter();
    },
    cancelCloseDateFilter:function(){
      if (this.filter['cd'] == 'all')
        return;
      this.filter['cd'] = 'all';
      //this.$('#no-close-date').prop('checked', false);
      this.$('.close-date-filter').text('Все даты');
      this.changeFilter();
    },
    cancelFinishDateFilter:function(){
      if (this.filter['fd'] == 'all')
        return;
      this.filter['fd'] = 'all';
      //this.$('#no-close-date').prop('checked', false);
      this.$('.finish-date-filter').text('Все даты');
      this.changeFilter();
    },
    cancelOrderStartDateFilter:function(){
       if (this.filter['oed'] == 'all')
        return;
      this.filter['oed'] = 'all';
      this.$('.order-start-date-filter').text('Все даты');
      this.changeFilter();
    },
    changeCondition:function(){

      var cond1 = this.$('#condition-filter2').val();
      var cond = '';
      if (!cond1 || cond1.length == 0){
        cond = 'all';
      }
      else{
        var tot = cond1.indexOf('total');
        if (tot != -1 && cond1.length > 1){
          if (this.filter['c'].indexOf('total') == -1){
            cond1 = [];
            cond1.push('total');
          }
          else{
            cond1.splice(tot,1);
          }
          this.$('#condition-filter2').val(cond1);
        }
        _.each(cond1, function(itm){cond+=((itm)? itm+',' :'') ;});
        cond = cond.substring(0, cond.length - 1);
      }
      this.filter['c'] = cond || "all";
      this.changeFilter();
    },
    changeManager:function(){
      var cond1 = this.$('#manager-filter').val();
      var cond = '';
      if (!cond1 || cond1.length == 0)
        cond = '';
      else{
        var tot = cond1.indexOf('total');
        _.each(cond1, function(itm){cond+=((itm)? itm+',' :'') ;});
        cond = cond.substring(0, cond.length - 1);
      }
      this.filter['m'] = cond;
      this.changeFilter();
    },
    changeSleep:function(){
      var sc = this.$('#sleep-and-close').is(':checked')?'yes':'no';
      this.filter['sc'] = sc;
      this.changeFilter();
    },

    changeClose:function(){
      if (this.$('#no-close-date').is(':checked')){
        this.filter['iscd'] = 'yes';
      }
      else{
        this.filter['iscd'] = 'no';
      }
      this.changeFilter();
    },

    changeFinish:function(){
      if (this.$('#no-finish-date').is(':checked'))
        this.filter['isfd'] = 'yes';
      else
        this.filter['isfd'] = 'no';
      this.changeFilter();
    },

    onClearAllFilters:function(e){
      var selected = [];
      // оставить нужно только фильтр, который был выбран последним
      for(var i in this.sorter){
        if(this.sorter[i])
          selected.push({ind:i, data:this.sorter[i]});
      }
      if(selected.length>1){
        selected = selected.sort(function(a,b){
          var i1 = parseInt(a.data[2]);
          var i2 = parseInt(b.data[2]);
          if(i1>i2) return 1;
          if(i1<i2) return -1;
          return 0;
        });
        var last_item = selected[selected.length-1];
        for(var i in this.sorter){
          if(i!=last_item.ind)
            this.sorter[i]=null;
          else
          {
            this.sorter[i] = this.sorter[i].substr(0,2)+"0";
          }
        }
        this.renderSort();
        this.changeFilter();
      }
    },

    onShowAllClick:function(e){
      window.cf.clearToken();
      //window.location = "#orders/&cl=all&o=all&c=all&m=all&t=all&r=all&od=all&cd=all&ch=all&s=410&sc=no&ts=order&p=1&fa=off";
      window.App.toDef();
      window.cf.showOrdersTable();
    },

    sortTable:function(e){
      var lnk = $(e.currentTarget);
      var sort_id = parseInt(lnk.data('sort'), 32);
      var sort_data = this.sorter[sort_id];
      var self = this;
      if ($(e.target).is('.sort-cancel')){
        if($(e.target).is('.sort-add')){
          {
            var num = 0;
            $.each(this.sorter, function(k,v){
              if (v){
                var sort_arr = v.split("");
                if (parseInt(sort_arr[2], 32)>=num){
                  num = parseInt(sort_arr[2], 32)+1;
                }
              }
            });
            var sort_data = sort_id.toString(32) + '0' + num.toString(32);
            this.sorter[sort_id] = sort_data;
          }
        }else{
          var sort_arr = sort_data.split("");
          var num = parseInt(sort_arr[2], 32);
          var only_one = true;
          $.each(this.sorter, function(k,v){
            if (v && k != sort_id){
              only_one = false;
              var sort_arr = v.split("");
              if (parseInt(sort_arr[2], 32)>num){
                var pos = parseInt(sort_arr[2], 32)-1;
                sort_arr[2] = pos.toString(32);
                self.sorter[k] = sort_arr.join("");
              }
            }
          });
          if (!only_one)
            this.sorter[sort_id] = null;
        }
      }
      else{
        if (sort_data){
          var sort_arr = sort_data.split("");
          if (sort_arr[1]=='0'){
            sort_arr[1] = '1';
          }
          else{
            sort_arr[1] = '0';
          }
          this.sorter[sort_id] = sort_arr.join("");
        }
        else{
          var num = 0;
          // сбрасываю остальные фильтры
          for(var i in this.sorter){
            if(i!=sort_id){
              this.sorter[i] = null;
            }
          }
          $.each(this.sorter, function(k,v){
            if (v){
              var sort_arr = v.split("");
              if (parseInt(sort_arr[2], 32)>=num){
                num = parseInt(sort_arr[2], 32)+1;
              }
            }
          });
          var sort_data = sort_id.toString(32) + '0' + num.toString(32);
          this.sorter[sort_id] = sort_data;
        }
      }
      this.renderSort();
      this.changeFilter();
    },
    renderSort: function(){
      var self = this;
      var url_str = '';
      $.each(this.sorter, function(k,v){
        var el = self.$('.sort-lnk-'+k.toString(32));
        if (v){
          var sort_arr = v.split("");
          $('.sort-cancel', el).html('&nbsp;×').removeClass("sort-add");
          $('.sort-arr', el).html(sort_arr[1]=='0'?'&uarr;':'&darr;');
          $('.sort-num', el).html((parseInt(sort_arr[2], 32)+1)+'&nbsp;&nbsp;');
          url_str+=v;
        }
        else{
          $('.sort-cancel', el).html('&nbsp;+').addClass("sort-add");
          $('.sort-arr', el).html('');
          $('.sort-num', el).text('');
        }
      });
      this.filter['s'] = url_str;
    },
    changeFilterTaks:function(){
      var m = this.filter['m'];
      var r = this.filter['r'];
      var tsk = this.$('#task-filter').val();
      window.cf.clearToken();
      window.App.toDef();
      this.filter = window.App.filters;
      //console.log(this.filter);
      this.filter['c'] = 'total';
      this.filter['t'] = tsk;
      this.filter['m'] = m;
      this.filter['r'] = r;
      var self = this;

      window.app_router.navigate(this.filterToUrl());
      self.render();
      //window.app_router.navigate(this.filterToUrl());
      //window.location = "#"+this.filterToUrl();
      self.stopListening(self.collection, 'change reset add remove sort')
      this.collection.reset().fetch({data: this.filter,timeout:50000}).complete(function(){
        self.render();
        self.listenTo(self.collection, 'change reset add remove sort', self.render);
       });
      window.scrollTo(0,0);
    },
    changeFilter:function(){
      window.App.curPage = 1;
      this.filter['o'] = 'all'
      //var mng = this.$('#manager-filter').val();
      var tsk = this.$('#task-filter').val();
      this.filter['p'] = window.App.curPage;
      //this.filter['m'] = mng;
      this.filter['t'] = tsk;
      this.filter['ch'] = this.$('#chance-select-filter').val();
      var self = this;

      window.app_router.navigate(this.filterToUrl());
      self.stopListening(self.collection, 'change reset add remove sort')
      this.collection.reset().fetch({data: this.filter,timeout:50000}).complete(function(){
        self.render();
        self.listenTo(self.collection, 'change reset add remove sort', self.render);
       });
      window.scrollTo(0,0);
    },

    filterToUrl:function(){
      //var str = 'orders/';
      var str = ""
      _.each(this.filter, function(value, key, list){
        str += '&'+key+'='+value.toString().replace(new RegExp(' ','g'),'_');
      });
      str = Base64.toBase64(RawDeflateStr.deflate(Base64.utob(str)));
      return 'orders/'+ str.replace(/\//g, '%2F');
    },

    favoriteFilter:function(e){
      var star = $(e.target);
      if (star.data('status') == 'off'){
        star.data('status', 'on');
        star.removeClass('fa-star-o').addClass('fa-star');
        this.filter['fa'] = 'on';
      }
      else{
        star.data('status', 'off');
        star.removeClass('fa-star').addClass('fa-star-o');
        this.filter['fa'] = 'off';
      }
      this.changeFilter();
    },

    clientFilter:function(el){
      var id = $(el.target).data('client');
      var name = $(el.target).data('name');
      curClient.set({'id':id, 'name': name});
      this.filter['cl'] = curClient.get('id');
      this.filter['c'] = 'total';
      this.changeFilter();
    },

    /**
     * @desc Event to change page
     */
    onChangePage: function(e, page)
    {
      var self = this;
      window.App.curPage = page;
      this.filter['p'] = window.App.curPage;
      window.app_router.navigate(this.filterToUrl());
      self.stopListening(self.collection, 'change reset add remove sort')
      this.collection.reset().fetch({data: this.filter, timeout:50000}).complete(function(){
        $(window).scrollTop(0);
        self.render();
        self.listenTo(self.collection, 'change reset add remove sort', self.render);
      });
    },

    /**
     * @desc Event to prev page
     */
    prevPage:function(el){
      var self = this;
      if (this.$('.previous').hasClass('disabled'))
        return;
      if (window.App.curPage > 1){
        window.App.curPage--;
      }
      this.filter['p'] = window.App.curPage;
      window.app_router.navigate(this.filterToUrl());
      self.stopListening(self.collection, 'change reset add remove sort')
      this.collection.reset().fetch({data: this.filter, timeout:50000}).complete(function(){
        $(window).scrollTop(0);
        self.render();
        self.listenTo(self.collection, 'change reset add remove sort', self.render);
      });
    },

    /**
     * @desc Event to next page
     */
    nextPage:function(el){
      var self = this;
      if (this.$('.next').hasClass('disabled'))
        return;
      window.App.curPage++;

      this.filter['p'] = window.App.curPage;
      window.app_router.navigate(this.filterToUrl());
      self.stopListening(self.collection, 'change reset add remove sort')
      this.collection.reset().fetch({data: this.filter, timeout:50000}).complete(function(){
        $(window).scrollTop(0);
        self.render();
        self.listenTo(self.collection, 'change reset add remove sort', self.render);
       });

    },

    dateFilter:function(){
      var srt = 'down';
      if (this.$('.date-filter').is('.down')){
        this.$('.date-filter').removeClass('down').addClass('up');
        this.$('.date-filter span').html('&uarr;');
        srt = 'up';
      }
      else{
        this.$('.date-filter').removeClass('up').addClass('down');
        this.$('.date-filter span').html('&darr;');
        srt = 'down';
      }
      this.filter['s'] = srt;
      this.filter['ts'] = 'order';
      this.$('.task-filter-sort').removeClass('up').addClass('down');
      this.$('.task-filter-sort span').html('&darr;');
      this.$('.price-filter-sort').removeClass('up').addClass('down');
      this.$('.price-filter-sort span').html('&darr;');

      this.$('.close-date-filter-sort').removeClass('up').addClass('down');
      this.$('.close-date-filter-sort span').html('&darr;');
      this.$('.chance-filter-sort').removeClass('up').addClass('down');
      this.$('.chance-filter-sort span').html('&darr;');

      this.changeFilter();
    },

    taskDateFilter:function(){
      var srt = 'down';
      if (this.$('.task-filter-sort').is('.down')){
        this.$('.task-filter-sort').removeClass('down').addClass('up');
        this.$('.task-filter-sort span').html('&uarr;');
        srt = 'up';
      }
      else{
        this.$('.task-filter-sort').removeClass('up').addClass('down');
        this.$('.task-filter-sort span').html('&darr;');
        srt = 'down';
      }
      this.filter['s'] = srt;
      this.filter['ts'] = 'task';
      this.$('.date-filter').removeClass('up').addClass('down');
      this.$('.date-filter span').html('&darr;');
      this.$('.price-filter-sort').removeClass('up').addClass('down');
      this.$('.price-filter-sort span').html('&darr;');

      this.$('.close-date-filter-sort').removeClass('up').addClass('down');
      this.$('.close-date-filter-sort span').html('&darr;');
      this.$('.chance-filter-sort').removeClass('up').addClass('down');
      this.$('.chance-filter-sort span').html('&darr;');

      this.changeFilter();
    },
    priceDateFilter:function(){
      var srt = 'down';
      if (this.$('.price-filter-sort').is('.down')){
        this.$('.price-filter-sort').removeClass('down').addClass('up');
        this.$('.price-filter-sort span').html('&uarr;');
        srt = 'up';
      }
      else{
        this.$('.price-filter-sort').removeClass('up').addClass('down');
        this.$('.price-filter-sort span').html('&darr;');
        srt = 'down';
      }
      this.filter['s'] = srt;
      this.filter['ts'] = 'price';
      this.$('.date-filter').removeClass('up').addClass('down');
      this.$('.date-filter span').html('&darr;');
      this.$('.task-filter-sort').removeClass('up').addClass('down');
      this.$('.task-filter-sort span').html('&darr;');

      this.$('.close-date-filter-sort').removeClass('up').addClass('down');
      this.$('.close-date-filter-sort span').html('&darr;');
      this.$('.chance-filter-sort').removeClass('up').addClass('down');
      this.$('.chance-filter-sort span').html('&darr;');

      this.changeFilter();
    },

    closeDateFilter:function(){
      var srt = 'down';
      if (this.$('.close-date-filter-sort').is('.down')){
        this.$('.close-date-filter-sort').removeClass('down').addClass('up');
        this.$('.close-date-filter-sort span').html('&uarr;');
        srt = 'up';
      }
      else{
        this.$('.close-date-filter-sort').removeClass('up').addClass('down');
        this.$('.close-date-filter-sort span').html('&darr;');
        srt = 'down';
      }
      this.filter['s'] = srt;
      this.filter['ts'] = 'cd';
      this.$('.date-filter').removeClass('up').addClass('down');
      this.$('.date-filter span').html('&darr;');
      this.$('.task-filter-sort').removeClass('up').addClass('down');
      this.$('.task-filter-sort span').html('&darr;');
      this.$('.price-filter-sort').removeClass('up').addClass('down');
      this.$('.price-filter-sort span').html('&darr;');
      this.$('.chance-filter-sort').removeClass('up').addClass('down');
      this.$('.chance-filter-sort span').html('&darr;');
      this.changeFilter();
    },

    finishDateFilter:function(){
      var srt = 'down';
      if (this.$('.finish-date-filter-sort').is('.down')){
        this.$('.finish-date-filter-sort').removeClass('down').addClass('up');
        this.$('.finish-date-filter-sort span').html('&uarr;');
        srt = 'up';
      }
      else{
        this.$('.finish-date-filter-sort').removeClass('up').addClass('down');
        this.$('.finish-date-filter-sort span').html('&darr;');
        srt = 'down';
      }

      this.filter['s'] = srt;
      this.filter['ts'] = 'fd';
      this.$('.date-filter').removeClass('up').addClass('down');
      this.$('.date-filter span').html('&darr;');
      this.$('.task-filter-sort').removeClass('up').addClass('down');
      this.$('.task-filter-sort span').html('&darr;');
      this.$('.price-filter-sort').removeClass('up').addClass('down');
      this.$('.price-filter-sort span').html('&darr;');
      this.$('.chance-filter-sort').removeClass('up').addClass('down');
      this.$('.chance-filter-sort span').html('&darr;');
      this.changeFilter();
    },


    chanceDateFilter:function(){
      var srt = 'down';
      if (this.$('.chance-filter-sort').is('.down')){
        this.$('.chance-filter-sort').removeClass('down').addClass('up');
        this.$('.chance-filter-sort span').html('&uarr;');
        srt = 'up';
      }
      else{
        this.$('.chance-filter-sort').removeClass('up').addClass('down');
        this.$('.chance-filter-sort span').html('&darr;');
        srt = 'down';
      }
      this.filter['s'] = srt;
      this.filter['ts'] = 'ch';
      this.$('.date-filter').removeClass('up').addClass('down');
      this.$('.date-filter span').html('&darr;');
      this.$('.task-filter-sort').removeClass('up').addClass('down');
      this.$('.task-filter-sort span').html('&darr;');
      this.$('.price-filter-sort').removeClass('up').addClass('down');
      this.$('.price-filter-sort span').html('&darr;');
      this.$('.close-date-filter-sort').removeClass('up').addClass('down');
      this.$('.close-date-filter-sort span').html('&darr;');
      this.changeFilter();
    },

    showOrderTask:function(id){
      var hf = new TaskFormView({el: $('#task-modal'), model: this.model});
      $('#task-modal').modal({backdrop: 'static'});
    },

    newOrderForm:function(){
      var om = new OrderModel();
      om.set({
        'client_id':curClient.get('id'),
        'client':curClient.get('name')
      });
      this.collection.add(om);
      var pt = new ProductTableView({isnew:true,model: om});
      $('#client-orders-list').hide();
      pt.show();
      return pt;
    },
    show:function(){
      this.$el.show();
    },
    hide:function(){
      this.$el.hide();
      $('#client-find-form').unblock();
    },
    close:function(){
      if(this.iv1){
        this.iv1.close();
        $('#itogo-pan').hide();
      }
      if(this.iv2)
        this.iv2.close();
      this.$el.hide();
      this.$el.empty();
      this.undelegateEvents();
      this.$el.removeData().unbind();
    },
    changeOnlyNew:function(){
      if(this.$("#only-new-date").is(":checked")){
        this.filter['onlnew'] = 'yes';
        if( this.filter['od']=='all'){
          $.jGrowl("Укажите период", { 'themeState':'growl-error', 'sticky':false, life: 10000, 'position': 'bottom-right' });
        }else
          this.changeFilter();
      }else{
        this.filter['onlnew'] = 'no';
        this.changeFilter();
      }
    },
    changeInitiator:function(e){
      var values = $(e.target).val();
      this.filter['initiator'] = $(e.target).val()?$(e.target).val().toString():'both';
    },
    onGroupFilter:function(e){
      curClient = new ClientModel();
      curGroup.set('id','gr_'+$(e.currentTarget).text());
      curGroup.set('name',$(e.currentTarget).text());
      window.App.toDef();
      this.filter = window.App.filters;
      this.filter['c'] = 'total'
      this.filter['gr'] = $(e.currentTarget).text();
      window.app_router.navigate(this.filterToUrl());
      //this.changeFilter();
      this.render();
      $('#client-dropdown').clientFinder('clear');
//      $('#client-dropdown').clientFinder("add", curGroup.toJSON());

      var self = this;
      self.stopListening(self.collection, 'change reset add remove sort')
      this.collection.reset().fetch({data: this.filter,timeout:50000}).complete(function(){
        self.render();
        self.listenTo(self.collection, 'change reset add remove sort', self.render);
       });
      window.scrollTo(0,0);

    }
  });

/**
* заказ
*/
var OrderTableItemView = Backbone.View.extend({
  //tagName:'table',
  tagName:'tbody',
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
  showLoader:function(){
      $.blockUI({'message':'<img src="/static/img/spinner.gif">', 'css':{'border':'none', 'backgroundColor':'transparent'}, 'overlayCSS':{'backgroundColor':'#fff', 'cursor':'pointer'}});
  },
  hideLoader:function(){
      $.unblockUI();
  },
  initialize:function(){
    this.template = _.template($('#orderTableItemTemplate').html());
    this.sost_days = window.SOSTDAYS;
  },
  render: function() {
    var self = this;
    this.$el.html(this.template(this.model.toJSON()));
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
    if (!(this.model.get('condition') == window.ORDER_CONDITIONS['INTEREST'] && this.model.get('l_state_initiator') == "Мы") && Routine.add_work_days(moment(this.model.get('datetime'), ['DD.MM.YYYY', 'DD.MM.YYYY HH:mm:ss']).hour(23).minute(59), this.sost_days[this.model.get('condition')]) < moment()) {
        this.$el.addClass('red-condition');
    }
    if (typeof this.model.get('ignore_state_date') !== 'undefined' && this.model.get('ignore_state_date') != 'no'){
      this.$el.addClass('grey-condition');
    }

    if(self.model.get('documents') && self.model.get('documents')['status']== 'in_process')
      setTimeout(function(){self.checkGoogleDocStatus();},5000);
    return this;
  },
  showClient: function(){
    var cm = new ClientModel();
    cm.set({'id':this.model.get('client_id')});
    var cc = new ClientCardView({model:cm, el:$('#client-card-modal'), orderid:this.model.get('id')});
    // cc.show();
    $('#client-card-modal').modal({backdrop: 'static'});

  },
  changeState: function(e){
    var self = this;
    var data = {'id':this.model.get('id')};
    //$.blockUI({'message':'<img src="/static/img/spinner.gif">', 'css':{'border':'none', 'backgroundColor':'transparent'}, 'overlayCSS':{'backgroundColor':'#fff', 'cursor':'pointer'}});
    $.post('/handlers/public', data).done(function() {
      self.model.set('state', 'published');
      self.$el.find('.wait-state').remove();
    }).always(function(){$.unblockUI();});

  },
  changeFavorite: function(e){
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
    $.blockUI({'message':'<img src="/static/img/spinner.gif">', 'css':{'border':'none', 'backgroundColor':'transparent'}, 'overlayCSS':{'backgroundColor':'#fff', 'cursor':'pointer'}});
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
  showHistory:function(){
    var hf = new HistoryFormView({el: $('#history-modal'), model: this.model});
    $("body").addClass("modal-open");
    $('#history-modal').modal({backdrop: 'static'});
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
           setTimeout(function(){ self.checkGoogleDocStatus(true); }, 10000);
        }
        else
          return;
      });
    }
    else
    {
      // переход к документам
      var win = window.open('https://drive.google.com/a/modul.org/#folders/'+self.model.get('documents')['folder_id'], '_blank');
    }
  },
  showTask:function(){
    var hf = new TaskFormView({el: $('#task-modal'), model: this.model});
    $('#task-modal').modal({backdrop: 'static'});
    $("body").addClass("modal-open");
  },
  showStructure:function(){
    var pt = new ProductTableView({isnew:false,model: this.model});
    $('#client-orders-list').hide();
    pt.show();
  }
});






  /**
  * история
  */
var HistoryFormView = require('./views/history_form_view');

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
      this.$('.service-type').val(this.options.service.get('type'));

       if(this.model.get('is_signed')=='yes' && !App.glHasAccess){
        this.$('.save-position, .save-add-position, .remove-position').hide();
        this.$('input, select, textarea').prop('disabled',true);
      }
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
      srv.set("price",Routine.strToFloat(this.$(".construction-price").val()));
      srv.set("type",this.$(".service-type").val());
      srv.set("approx",this.$(".is_approx").is(":checked")?"yes":"no");
      srv.set("product_include",this.$(".isinclude_product").is(":checked")?"yes":"no");
      srv.set("by_production",this.$(".by_production").is(":checked"));
      srv.set("note",this.$(".construction-note").val());
      var units = [];
      if(srv.get("by_production")){
        this.$(".units input[type=checkbox]:checked").each(function(){
          if ($(this).data("production") && $(this).data('number'))
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
                  label: 'Нет',
                },
                'confirm': {
                  label: 'Да',
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
      'change .total-delivery, .total-montaz':'recalcTotalMoney',

      'click .save-linked-orders': 'onSaveLinkedOrders',
      'change .is-tender':'onChangeTender',

      'click #add-btn': 'addNew',
      'click #select-corr': 'findExCorrespondent',
      'blur #correspondent': 'onBlur',
      'keydown #correspondent': 'onKeyPress',
      'keypress #correspondent': 'onKeyPress'
    },
    initialize:function(){
      window.App.productView = this;
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
      var fr = Backbone.history.fragment;
      window.app_router.navigate(fr+'/products/'+ this.model.get('id'));

      //$("body").on('click',function(e){self.onCloseAutocomplete(e);});

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
        serv_cost+= item.get('price');
        if (item.approx == 'yes')
          appr = 'yes-approx';
      }, this);
      this.$('.serv-total-price').text($.number( serv_cost, 2, ',', ' ' )).addClass(appr);

      this.recalcTotalMoney();
      // if (this.model.get('closed') == 'yes'){
      //  this.$('.add-new-position').hide();
      //  this.$('.save-and-close').hide();
      // }
      this.$('.total-montaz, .total-delivery').numeric({ decimal: ',', negative: false, decimalPlaces:2 });
      this.$('.markup').numeric({ decimal: ',', negative: false, decimalPlaces:2 });
      this.$('.like-props').select2({placeholder: "Критерии поиска"});


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

      var need_display = (this.model.get('is_tender') == 'they-open' || this.model.get('is_tender') == 'they-closed');
      var correspondentView = new CorrespondentView({need_display: need_display, correspondent: this.model.get('correspondent')});
      this.$('.correspondent-block').html(correspondentView.render().el);

      return this;
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

        ts += cnt*Routine.strToFloat(item.get('sq'));
      }, this);

      var serv_cost = 0;
       _.each(this.model.get('services').models, function (item) {
        serv_cost+=Routine.strToFloat(item.get("price") || 0);
       });

      this.$('.total-num').text(tn);
//            Routine.priceToStr(summa, '0,00', ' ')
      this.$('.total-price').text(Routine.priceToStr( tp+td+tm, '0,00', ' ' )).addClass(appr);

      this.$('.total-price-goods').text(Routine.priceToStr( tp, '0,00', ' ' )).addClass(appr);
      this.$('.total-price-delivery').text(Routine.priceToStr( td, '0,00', ' ' )).addClass(appr);
      this.$('.total-price-montag').text(Routine.priceToStr( tm, '0,00', ' ' )).addClass(appr);

      this.$('.total-sq').text($.number( ts, 2, ',', ' ' )).addClass(appr_sq);

      this.$(".total-money span").text($.number( serv_cost+tp+td+tm+Routine.strToFloat(this.$(".total-delivery").val()||0)+parseInt(this.$(".total-montaz").val()||0), 2, ',', ' ' )).addClass(appr);
    },

    renderOne: function(item){
      var view = new ProductTableItemView({model: this.model, product:item});
      this.$('.products-table tbody').append(view.render().el);
      return view;
    },
    renderOneService:function(item){
      var view = new ServiceTableItemView({model: this.model, service:item});
      this.$(".services-table tbody").append(view.render().el);
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
      var pf = new PositionFormView({el: $('#position-modal'), model: this.model, product:pm, isnew:true, is_order_new:this.options.isnew});
      $('#position-modal').modal({backdrop: 'static'});
    },
    /*saveAndClose:function(){
      this.model.set({
        'total_address' : this.$('.total-address').val(),
        'total_montaz' : this.$('.total-montaz').val(),
        'total_shef_montaz' : this.$('.total-shef-montaz').is(':checked')?'yes':'no'
      });

      var self = this;
      this.model.save().done(function(){
        self.closeView();
      });
    },*/

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
              $.jGrowl('Для заявки №'+self.model.get('number').toString()+' на гугл диске создан каталог документов. Теперь вы можете перейти к нему, кликнув на ссылку - "Документы"', { 'themeState':'growl-success', 'sticky':false, life: 10000 });
          }
          if(self.model.get('documents')['status'] != 'error' && result['documents']['status'] =="error")
          {
            self.model.set({'documents':  result['documents']});
            if(MANAGER == result['documents']['manager'])
              $.jGrowl('Ошибка при создании каталога документов на гугл диске для заявки №'+self.model.get('number').toString()+'. Подробности: '+Routine.stripTags(self.model.get('documents')['note'])+'.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
          }
          else if (self.model.get('documents')['status'] == 'in_process')
            setTimeout(function(){self.checkGoogleDocStatus();},10000);
        }).fail(function(jqXHR, textStatus, errorThrown ) {
          $.jGrowl('Ошибка при создании каталога документов на гугл диске для заявки №'+self.model.get('number').toString()+'. Возможно у вас не хватает прав для выполнения данной операции.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
        });
    },

    fillData:function(){
      var self = this;
      var correspondent = self.$('#correspondent').val();
      var is_tender = self.$('.is-tender').val();

      var nl = self.$(".projects-list").tokenInput("get");
      var projects = [];
      for(var i in nl)
        projects.push({'project_id':nl[i].id, 'project_name':nl[i].name});

      if($('#correspondent').data('type')=="contragent")
        self.model.set("contragent_id",$('#correspondent').data('id'));
      else
        self.model.set("correspondent_id",$('#correspondent').data('id'));

      self.model.set({
        'markup' : Routine.strToFloat(self.$('.markup').val()),
        'total_address' : self.$('.total-address').val(),
        'total_montaz' : self.$('.total-montaz').val(),
        'total_delivery' : self.$('.total-delivery').val(),
        'total_shef_montaz' : self.$('.total-shef-montaz').is(':checked')?'yes':'no',
        'is_tender': is_tender,
        'correspondent': correspondent,
        'projects':projects
      });
    },
    saveAndClose:function(){
      var self = this;

      if ($(this.$('.is-tender')).val().indexOf('they') > -1 && this.$('#correspondent').val() == '') {
        Routine.showMessage('Укажите адресата','error')
        return;
      }

      if(this.model.get('condition')){
          var currentStateName = DICTS[this.model.get('condition')]
          var currentStateInfo = DICTS.condition.find((x)=>x.name==currentStateName);
          if(currentStateInfo && currentStateInfo['price']=='enabled' && ( !this.$('.markup').val() || Routine.strToFloat(this.$('.markup').val())===0)) {
              Routine.showMessage('Необходимо заполнить наценку.','error')
              return;
          }
      }

      var fn = function(){
        self.fillData();

        var is_new = (!self.model.get('id'))?true:false;
        self.model.save().done(function(){
          self.closeView();
          // если заявка новая, то необходимо создать ее папку на гугл диске
          if(is_new){
            self.model.set({'documents': {'status':'in_process'}});
            setTimeout(function(){self.checkGoogleDocStatus(true)},10000);
          }
        });
      };

      if(!this.options.isnew && self.model.get("condition_type")!="начальное"){
        self.fillData();
        var is_changed = this.model.hasChanged('markup') || this.model.hasChanged('total_address') || this.model.hasChanged('total_montaz') || this.model.hasChanged('total_delivery') || this.model.hasChanged('total_shef_montaz') || this.model.hasChanged('is_tender');
        if(is_changed)
          var dlg = new ConfirmSaveChanges({model:this.model, 'onok':fn});
        else
          fn();
      }else
        fn();
    },
    closeView:function(){
      this.close();
      var fr = Backbone.history.fragment;
      window.app_router.navigate(fr.replace('/products/'+ this.model.get('id'), ''));
      $('#client-orders-list').show();
    },
    close: function(){
      this.$el.hide().empty();
      this.undelegateEvents();
      this.$el.removeData().unbind();
    },
    show:function(){
      this.$el.show();
    },
    showHistory:function(){
      var hf = new HistoryFormView({el: $('#history-modal'), model: this.model, quick:true});
      var self = this;
      $("body").addClass("modal-open");
      $('#history-modal').modal({backdrop: 'static'},'show').on('shown', function(){self.closeView();});
    }
  });

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

      $('#position-modal').modal('show');
    }
  });


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
    isapprox_sq:false,
    isnew:false,
    is_order_new:false,
    initialize:function(){
      this.template = _.template($('#positionTableTemplate').html());
      this.render();
      this.is_order_new = this.options.is_order_new;
      if (this.options.isnew){
        this.addAddr();
      }
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
          var prc = Routine.priceToStr($('.pos-price', this).val());

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

      this.$('.pos-number').numeric({ decimal: false, negative: false });
      this.$('.pos-price, .pos-delivery, .mont-price').numeric({ decimal: ',', negative: false,decimalPlaces:2 });
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
      this.recalcMoney();
      this.$el.on('hidden', function () {
        self.$el.empty();
        self.undelegateEvents();
        self.$el.removeData().unbind();
      });

      return this;
    },
    saveAddPosition:function(){
      var self = this;
      var is_complect = this.$el.find(".is_complect").is(":checked");


      var is_br = false;
      if(self.$('.products-table .row').length==0){
        $.jGrowl("Необходимо задать адрес", { 'themeState':'growl-error', 'sticky':false, life: 10000 });
        return;
      }
      var fnn = 0;
      self.$('.products-table .row').each(function(item){
        if(!is_br){
          var nm = $('.pos-number', this).val();
          nm = nm?parseInt(nm):0;
          if(!nm){
            $.jGrowl("Неверно указано количество единиц продукции.", { 'themeState':'growl-error', 'sticky':false, life: 10000 });
            is_br = true;
          }else
            fnn+=nm;
        }
      });
      if(is_br)
        return;

      if(is_complect){
        if(self.$('.products-table .row').length>1){
          $.jGrowl("Один комплект не может иметь разные адреса поставки. Создайте несколько комплектов или объедините в один адрес.", { 'themeState':'growl-error', 'sticky':false, life: 10000 });
          return;
        }
      }else{

        if(fnn>5){
          $.jGrowl("Количество ед. не может быть больше 5 штук. Создайте комплект или отдельные виды продукции.", { 'themeState':'growl-error', 'sticky':false, life: 10000 });
          return;
        }
      }

      var fn = function(){
        var totsum = self.recalcMoney();
        var posc = new PositionCollection();
        var nums = 0;
        var addrs = '';
        self.$('.products-table .row').each(function(item){
          var posm = new PositionModel();
          var nm = $('.pos-number', this).val();
          var addr = $('.pos-addr', this).val();
          posm.set({
            'num': nm,
            // 'price': $('.pos-price', this).val(),
            'addr': addr,
            'delivery': Routine.strToFloat($('.pos-delivery', this).val()),
            'mont_price': Routine.strToFloat($('.mont-price', this).val()),
            'mont_price_type':parseInt($('.mont_type',this).val()),
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
        self.options.product.set({
          'type': self.$('.construction-type').val(),
          'name': self.$('.constuction-target').select2("val"),
          'sq': self.$('.construction-sq').val().replace(',','.'),
          'length': self.$('.construction-length').val(),
          'width': self.$('.construction-width').val(),
          'height': self.$('.construction-height').val(),
          'count': nums,
          'price': Routine.strToFloat(self.$('.construction-price').val()),
          'approx': self.$('.isapprox').is(':checked')?'yes':'no',
          'approx_sq': self.$('.isapprox-sq').is(':checked')?'yes':'no',
          'positions': posc,
          'addrs': addrs,
          'is_complect':is_complect
        });
        if (self.options.isnew){
          self.model.get('products').add(self.options.product);
        }
        // this.model.set({'price': totsum});
        self.model.save().complete(function(){
          self.options.isnew = true;
          self.options.product = new ProductModel();
          self.render();
          self.addAddr();
        });
      }

      if(!this.is_order_new  && self.model.get("condition_type")!="начальное"){
        var dlg = new ConfirmSaveChanges({model:this.model, 'onok':fn});
        return;
      }else
        fn();
    },
    savePosition:function(){
      var self = this;
      var is_br = false;
      var is_complect = this.$el.find(".is_complect").is(":checked");
      if(self.$('.products-table .row').length==0){
        $.jGrowl("Необходимо задать адрес", { 'themeState':'growl-error', 'sticky':false, life: 10000 });
        return;
      }
      var fnn = 0;
      self.$('.products-table .row').each(function(item){
        if(!is_br){
          var nm = $('.pos-number', this).val();
          nm = nm?parseInt(nm):0;
          if(!nm){
            $.jGrowl("Неверно указано количество единиц продукции.", { 'themeState':'growl-error', 'sticky':false, life: 10000 });
            is_br = true;
          }else
            fnn+=nm;
        }
      });
      if(is_br)
        return;

      if(is_complect){
        if(self.$('.products-table .row').length>1){
          $.jGrowl("Один комплект не может иметь разные адреса поставки. Создайте несколько комплектов или объедините в один адрес.", { 'themeState':'growl-error', 'sticky':false, life: 10000 });
          return;
        }
      }else{

        if(fnn>5){
          $.jGrowl("Количество ед. не может быть больше 5 штук. Создайте комплект или отдельные виды продукции.", { 'themeState':'growl-error', 'sticky':false, life: 10000 });
          return;
        }
      }

      var fn = function(){
        var totsum = self.recalcMoney();
        var posc = new PositionCollection();
        var nums = 0;
        var addrs = '';
        self.$('.products-table .row').each(function(item){
          var posm = new PositionModel();
          var nm = $('.pos-number', this).val();
          var addr = $('.pos-addr', this).val();
          posm.set({
            'num': nm,
            // 'price': $('.pos-price', self).val(),
            'addr': addr,
            'delivery': Routine.strToFloat($('.pos-delivery', this).val()),
            'mont_price': Routine.strToFloat($('.mont-price', this).val()),
            'mont_price_type':parseInt($('.mont_type',this).val()),
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
        self.options.product.set({
          'type': self.$('.construction-type').val(),
          'name': self.$('.constuction-target').select2("val"),
          'sq': self.$('.construction-sq').val().replace(',','.'),
          'length': self.$('.construction-length').val(),
          'width': self.$('.construction-width').val(),
          'height': self.$('.construction-height').val(),
          'count': nums,
          'price': Routine.strToFloat(self.$('.construction-price').val()),
          'approx': self.$('.isapprox').is(':checked')?'yes':'no',
          'approx_sq': self.$('.isapprox-sq').is(':checked')?'yes':'no',
          'positions': posc,
          'addrs': addrs,
          'is_complect':is_complect
        });
        if (self.options.isnew){
          self.model.get('products').add(self.options.product);
        }

        // self.model.set({'price': totsum});
        self.model.save().done(function(){
          self.closeModal();
        });
      };

      if(!this.is_order_new && self.model.get("condition_type")!="начальное"){
        var dlg = new ConfirmSaveChanges({model:this.model,'onok':fn});
        return;
      }else
        fn();
    },

    removePosition:function(){
      var self = this;
      var fn = function(){
        self.options.product.destroy();
        self.model.save().done(function(){
          self.closeModal();
        });
      }

      if(!this.is_order_new && self.model.get("condition_type")!="начальное"){
        var dlg = new ConfirmSaveChanges({model:this.model, 'onok':fn});
      }else
        fn();

    },

    addAddr: function(){
      var pos = new PositionModel();
      pos.set({'num': 1,'montcheck':'', 'shmontcheck': ''});
      var ln =  _.template($('#positionItemTemplate').html());
      this.$('.products-table').append(ln(pos.toJSON()));
      this.$('.pos-price, .pos-delivery, .mont-price').numeric({ decimal: ',', negative: false,decimalPlaces:2 });
      this.$('.pos-number').numeric({ decimal: false, negative: false });
    },
    closeModal:function(){
      var self = this;
      this.$el.modal('hide').on('hidden', function () {
        self.$el.empty();
        self.undelegateEvents();
        self.$el.removeData().unbind();
      });
    }
  });


/*************************
* Routing
**************************/

//    $('.typeahead').typeahead({
//      hint: true,
//      highlight: true,
//      minLength: 1
//    },
//    {
//      name: 'states',
//      source: substringMatcher(states)
//    });

  window.cf = new ClientFindView();
  window.app_router.on('route:rootRoute', function (actions) {
    $("body").removeClass("modal-open");
    curClient.set({'id':'', 'name':''});
    // window.App.filters['cl'] = 'all';
    // window.App.toDef();
    $('#task-modal').modal('hide');
    $('#history-modal').modal('hide');
    $('#position-modal').modal('hide');
    $('#client-card-modal').modal('hide');
    if (window.App.productView)
      window.App.productView.close();
    if (window.App.orderView)
      window.App.orderView.close();
    cf.showOrdersTable();
  });

  window.app_router.on('route:orderList', function (filter) {
    try{
      if(filter.indexOf('&')<0){
        var unzipped_uri = Base64.btou(RawDeflate.inflate(Base64.fromBase64(filter)));
        if(unzipped_uri)
          filter = unzipped_uri;
      }
    }catch(err){}
    window.App.toDef();
    mergeObjs(window.App.filters,urlToObj(filter));
    window.App.curPage = window.App.filters['p'];
    if (window.App.filters['cl'] === 'all' || !window.App.filters['cl']){
      curClient.set({'id':'', 'name':''});
    }
    else{
      curClient.set({'id':window.App.filters['cl']});
    }
    $('#task-modal').modal('hide');
    $("body").removeClass("modal-open");
    $('#history-modal').modal('hide');
    $('#position-modal').modal('hide');
    $('#client-card-modal').modal('hide');
    if (window.App.productView)
      window.App.productView.close();
    if (window.App.orderView)
      window.App.orderView.close();
    cf.showOrdersTable();
    cf.fillClientInput();
  });


  window.app_router.on('route:findClient', function (id) {
    //console.log('find-client');
    curClient.set({'id':id});
    window.App.filters['cl'] = id;
    window.App.filters['c'] = 'total';
    curClient.fetch({timeout:50000}).complete(function(){
      cf.unblockForm();
    });
  });

  window.app_router.on('route:clientNewOrder', function (id) {
    curClient.set({'id':id});
    window.App.filters['cl'] = id;
    window.App.filters['c'] = 'total';
    curClient.fetch({timeout:50000}).complete(function(){
      cf.unblockForm();
      cf.showNewOrder();
    });
  });

  window.app_router.on('route:clientCard', function (id) {
    //console.log('clientcard');
    curClient.set({'id':id});
    window.App.filters['cl'] = id;
    window.App.filters['c'] = 'total';
    curClient.fetch({timeout:50000}).complete(function(){
      cf.showClientCard();
    });
  });

  window.app_router.on('route:newClientCard', function () {
    //console.log('newclientcard');
    curClient.set({'id':'', 'name':''});
    cf.newClientCard();

  });

  window.app_router.on('route:orderTasks', function (filter, id) {
    //console.log('ordertasks');
    window.App.toDef();
    mergeObjs(window.App.filters,urlToObj(filter));
    cf.showOrdersTable();
  });


  var foo = Backbone.history.start()

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
