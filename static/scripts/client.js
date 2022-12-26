$(function(){
  var AppView = Backbone.View.extend({
    orderView:null,
    productView:null,
    curPage:1,
    allPages:1,
    top:[],
    clients:null,
    clientcnt:null,
    neword:null,
    oldord:null
  });
  var App = new AppView();
  var FilterModel = Backbone.Model.extend({
    defaults:{
      'cl':'all',
      'c':'all',
      'm':'all',
      't':'all',
      'r':'all',
      'od':'all',
      's':'down',
      'sc':'no', /* спящие и закрытые */
      'p': 1
    }
  });

  var AppFilter = new FilterModel();

  var AppRouter = Backbone.Router.extend({
    routes: {
      "orders/:filter": "orderList",
      "": "rootRoute",
      "*actions": "defaultRoute" // Backbone will try match the route above first
    }
  });


/**********************
* Models
***********************/



  var ItogoModel = Backbone.Model.extend({
  });
  var ItogoCollection = Backbone.Collection.extend({
    url: '/handlers/itogo/',
    model: ItogoModel,
    parse:function(response){
      App.top = response.top;
      App.clients = response.clients;
      if (response.newo.length > 0)
        App.neword = response.newo[0];
      else
        App.neword = null;
      if (response.oldo.length > 0)
        App.oldord = response.oldo[0];
      else
        App.oldord = null;
      return response.result;
    }
  });

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
      this.set("services",new ServiceCollection());
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




  var PositionModel = Backbone.Model.extend({
    defaults:{
      'num':0,
      'addr':'',
      'mont':'',
      'shmont':'',
      'mont_price':''
    }
  });

  var PositionCollection = Backbone.Collection.extend({
    model: PositionModel,
    parse:function(response){
      return response;
    }
  });

  var HistoryModel = Backbone.Model.extend({
    defaults:{
      'condition':'',
      'condition_type':'',
      'comment':'',
      'datetime':''
    }
  });

  var HistoryCollection = Backbone.Collection.extend({
    model: HistoryModel
  });

  var TaskModel = Backbone.Model.extend({
    defaults:{
      'condition':'',
      'comment':'',
      'datetime':'',
      'closedatetime': '',
      'status':''
    }
  });

  var TaskCollection = Backbone.Collection.extend({
    model: TaskModel
  });

  var ProductModel = Backbone.Model.extend({
    defaults:{
      'type':'',
      'name':'',
      'count':0,
      'sq':0.0,
      'price':0,
      'approx':'no',
      'addrs':'',
      'length':'',
      'width': '',
      'height': '',
      'positions':[]
    }
    // ,
    // initialize: function(){
    //      this.set('positions', new PositionCollection());
    //   },
    // parse: function(response) {
    //  var positionList = new PositionCollection();
    //       positionList.add(response.positions);

    //       return{
    //        'type': response.type,
      //  'name': response.name,
      //  'sq': response.sq,
      //  'count': response.count,
      //  'price': response.price,
      //  'approx': response.approx,
      //  'addrs' : response.addrs,
      //  'positions': positionList
    //       }
    //   }
  });

  var ProductCollection = Backbone.Collection.extend({
    model: ProductModel,
    parse:function(response){
      return response;
    }
  });

  var OrderModel = Backbone.Model.extend({
    urlRoot:'/handlers/order',
    defaults:{
      'id':'',
      'client_id':'',
      'client_info':'',
      'total_address' :'',
      'total_montaz' : '',
      'markup' : 0,
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
      'comment':'—',
      'history': new HistoryCollection(),
      'tasks': new TaskCollection(),
      'products': new ProductCollection()
    },
    initialize: function(){
      this.set('history', new HistoryCollection());
      this.set('tasks', new TaskCollection());
      this.set('products', new ProductCollection());
    },
    parse: function(response) {

      var productList = new ProductCollection();
      productList.add(response.products);
      var historyList = new HistoryCollection();
      historyList.add(response.history);

      var taskList = new TaskCollection();
      taskList.add(response.tasks);

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
        'markup' : response.markup || 0,
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
        'comment': response.comment,
        products: productList,
        history: historyList,
        tasks: taskList,


      }
    }

  });

  var OrderCollection = Backbone.Collection.extend({
    url: '/handlers/orders/',
    model: OrderModel,
    // sort_key: 'datetime',
    // sort_dir: 1,
    parse:function(response){
      App.allPages = response.pages;
      App.clientcnt = response.clcount;
      return response.orders;
    }
    // ,
    // comparator: function(item) {

    //  var parts = item.get('datetime').split('.');
    //  var date = new Date(parts[2], parts[1]-1, parts[0]);
   //        return this.sort_dir * date.getTime();

    // },
    // sortByField: function(fieldName) {
    //     this.sort_key = fieldName;
    //     this.sort();
    // }

  });

  var curClient = new ClientModel();

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
      md.productions = this.model.get("productions").toJSON();
      md.parent_productions = App.Views.Contract.parent_productions;
      this.$el.html(this.template(md));
      return this;
    },
    showPosition:function(){
      var pf = new ServiceFormView({el: $('#position-modal-container'), model: this.model, service:this.options.service, isnew:false});
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
      mdl.productions = this.model.get("productions").toJSON();
      mdl.is_new = this.options.isnew;
      mdl.parent_productions = App.Views.Contract.parent_productions;
      this.$el.html(this.template(mdl));
      var self = this;
      this.$el.on('hidden', function () {
        self.$el.empty();
        self.undelegateEvents();
        self.$el.removeData().unbind();
      });
      this.$('.construction-price').numeric({ decimal: ',', negative: false,decimalPlaces:2 });
      this.$('.service-type').val(this.options.service.get("type"));

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
      srv.set("price",this.$(".construction-price").val().replace(' ', ''));
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

          if(App.Views.Contract.parent_productions){
             _.each(App.Views.Contract.parent_productions, function (item) {
              if(item['_id'] in prod_gr){
                if(prods)
                  prods+='; ';
                prods+=item["name"]+": ";
                var pr_id = item["_id"];
                for(var j in prod_gr[pr_id ]){
                  if(j>0)
                    prods+=', ';
                  prods+=prod_gr[pr_id][j];
                }
              }
             });
          }

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
/**********************
* Views
***********************/

  var ClientFindView = Backbone.View.extend({
    el: $('#client-find-form'),
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



  var ContactTableView = Backbone.View.extend({

    contactFrm:null,

    initialize:function(){
      this.template = _.template($('#contactTableTemplate').html());
      this.listenTo(this.collection, 'change reset add remove', this.render);
      this.render();
    },
    events:{
      'click .new-contact': 'addContact'
    },
    render: function() {
      this.$el.html(this.template());
      var self = this;
      _.each(this.collection.models, function (item) {
        self.renderOne(item);
      }, this);
      return this;
    },
    renderOne: function(item){
      var view = new ContactTableItemView({model: item});
      view.parentView = this;
      this.$("tbody").append(view.render().el);
      return view;
    },
    addContact:function(){
      var cm = new ContactModel();
      var self = this;
      cm.on('change', function(){this.collection.add(cm);}, this);
      this.contactFrm = new ContactFormView({model: cm});
      this.$('.contact-form').html(this.contactFrm.render().$el);
    },
    editContact:function(item){
      var self = this;
      this.contactFrm = new ContactFormView({model: item});
      this.$('.contact-form').html(this.contactFrm.render().$el);
    }
  });

  var ContactTableItemView = Backbone.View.extend({
    tagName:'tr',
    parentView: null,
    events:{
      'click .remove-contact': 'remove',
      'click .edit-contact': 'edit',
      'click .lnk-phone': 'onPhoneClick'
    },
    initialize:function(){
      this.template = _.template($('#contactTableItemTemplate').html());

    },
    render: function() {
      this.$el.html(this.template(this.model.toJSON()));
      return this;
    },
    remove:function(){
      this.model.destroy();
    },
    edit:function(){
      this.parentView.editContact(this.model);
    },

    /**
     ** Обработка события клика по телефону в карточке клиента.
     ** По клику происходит попытка дозвона данному клиенту
    **/
    onPhoneClick: function(e){
      console.log('-----------call----------');
    }
  });

  var ContactFormView = Backbone.View.extend({
    events: {
      'click .new-phone': 'addPhone',
      'click .new-email': 'addEmail',
      'click .delete-email': 'deleteEmail',
      'click .delete-phone': 'deletePhone',
      'click .save-contact': 'addContact',
      'click .close-contact': 'resetContact'
    },
    initialize:function(){
      this.template = _.template($('#contactFormTemplate').html());

    },
    render: function() {
      this.$el.html(this.template(this.model.toJSON()));
      var self = this;
      if (this.model.get('email').length > 0){
        this.$('#client-email').val(this.model.get('email')[0]);
      }
      if (this.model.get('phone').length > 0){
        var item = this.model.get('phone')[0];
        var checked = false;
        if (item.indexOf('м.')!= -1){
          item = item.slice(3);
          checked=true;
        }
        this.$('#client-phone').val(item);
        this.$('#ismobile').prop('checked',checked);

      }
      if (this.model.get('email').length > 1){
        var foo = 0;
        _.each(this.model.get('email'), function(item){
          if (foo>0){
            var ln =  _.template($('#contactEmailTemplate').html());
            self.$('.client-emails').append(ln({'email':item}));
          }
          foo++;
        });
      }
      if (this.model.get('phone').length > 1){
        var foo = 0;
        _.each(this.model.get('phone'), function(item){
          if (foo>0){
            var ln =  _.template($('#contactPhoneTemplate').html());
            var checked = '';
            if (item.indexOf('м.')!= -1){
              checked = 'checked';
              item = item.slice(3);
            }
            self.$('.client-phones').append(ln({'phone':item, 'checked':checked}));
          }
          foo++;
        });
      }
      return this;
    },
    addEmail: function(){
      var ln =  _.template($('#contactEmailTemplate').html());
      this.$('.client-emails').append(ln({'email':''}));
    },
    deleteEmail: function(el){
      $($(el.target).parents('.email-row')[0]).remove();
    },
    addPhone: function(){
      var ln =  _.template($('#contactPhoneTemplate').html());

      this.$('.client-phones').append(ln({'phone':'', 'checked':''}));
    },
    deletePhone: function(el){
      $($(el.target).parents('.phone-row')[0]).remove();
    },
    resetContact: function(){
      this.$el.hide().empty();
      this.undelegateEvents();
      $(this.el).removeData().unbind();
    },
    addContact: function(){
      var fio = this.$('#client-fio').val();
      if (fio == ''){
        showmsg('Введите ФИО.');
        return;
      }
      var emails = [];
      var iemail = false;
      this.$('input.client-email').each(function(){
        var eml = $(this).val();
        if (eml != ''){
          if (eml.indexOf('@') == -1){
            iemail = true;
          }
          else{
            emails.push(eml);
          }
        }
      });
      if (iemail){
        showmsg('Введите правильный эл. адрес.');
        return;
      }
      this.model.set('fio', fio);
      this.model.set('email', emails);
      var phones = [];
      this.$('div.phone-row').each(function(){
        var ph = $('input.client-phone', $(this)).val();
        if ($('input.ismobile', $(this)).is(':checked'))
          ph = 'м. '+ph;
        if (ph != '')
          phones.push(ph);
      });
      this.model.set('phone', phones);
    }
  });


  var ClientCardView = Backbone.View.extend({
    el: $('#client-card-form'),
    contactTbl: null,
    events: {
      'click .close-card': 'hide',
      'click .save-client':'save'
    },
    initialize:function(){
      this.template = _.template($('#clientCardTemplate').html());
      this.$('.contacts-group').html('');
      var self = this;
      if (this.model.get('id') != ''){
        this.model.fetch().complete(function(){
          self.render();
          self.contactTbl = new ContactTableView({collection:self.model.get('contacts'), el: self.$('.contacts-group')});
        });
      }
      else{
        self.render();
        self.contactTbl = new ContactTableView({collection:self.model.get('contacts'), el: self.$('.contacts-group')});
      }

    },
    render: function() {
      var self = this;
      var foo = this.model.get('cl');
      if (foo == 'cl'){
        this.model.set({'iscl':'checked'});
      }
      else{
        this.model.set({'iscl':''});
      }
      this.$el.html(this.template(this.model.toJSON()));

      var wf = this.model.get('wherefind');
      if (wf != ''){
        var i = this.$('#where-find').find('option[value="'+wf+'"]').length;
        if (i == 0){
          this.$('#where-find').append('<option value="'+wf+'">'+wf+'</option>');
        }
        this.$('#where-find').val(wf);
      }

      var fc = this.model.get('firstcontact');
      if (fc != ''){
        var i = this.$('#first-contact').find('option[value="'+fc+'"]').length;
        if (i == 0){
          this.$('#first-contact').append('<option value="'+fc+'">'+fc+'</option>');
        }
        this.$('#first-contact').val(fc);
      }
      if (this.$el.hasClass('modal')){
        this.$el.on('hidden', function () {
          self.$el.hide().empty();
          cf.show();
          self.undelegateEvents();
          $(self.el).removeData().unbind();
        });
      }

    },
    show:function(){
      this.$el.show();
    },
    hide:function(){

      var self = this;

      if (this.$el.hasClass('modal')){
        this.$el.modal('hide').on('hidden', function () {
          self.$el.hide().empty();
          cf.show();
          self.undelegateEvents();
          $(self.el).removeData().unbind();
        });
      }
      else{
          self.$el.hide().empty();
          cf.show();
          self.undelegateEvents();
          $(self.el).removeData().unbind();
      }
    },

    save:function(){
      if (this.$('#client-name').val() == ''){
        showmsg('Укажите имя клиента.');
        return;
      }
      var self = this;
      this.model.set({
      'name': this.$('#client-name').val(),
      'cl': this.$('.cl-checkbox').is(':checked')?'cl':'notcl',
      'rekvisit': this.$('#rekvisit-textarea').val(),
      'addr': this.$('#address-textarea').val(),
      'inn': this.$('#client-inn').val(),
      'wherefind': this.$('#where-find').val(),
      'firstcontact': this.$('#first-contact').val()
      });

      this.model.save(null, {success: function(){
      curClient = self.model;
      self.hide();
      cf.show();
      }});
    }

  });


  var ItogoView = Backbone.View.extend({
    filter: null,
    tagName:'div',
    className: 'span12',
    initialize: function(){
      this.template = _.template($('#itogoTemplate').html());
      this.render();
    },
    render:function(){

      this.$el.html(this.template());
      var self = this;
      var number = 0;
      var summa = 0;
      var square = 0.0;
      var tprice = 0;
      _.each(self.collection.models, function(item){
        number += item.get('number');
        summa += item.get('summa');
        square += item.get('square');

        if (item.get('type') == 'закрывающее'){
          item.set({'cls': 'em'});
        }
        else{
          item.set({'cls': ''});
        }

        var ln =  _.template($('#itogoItemTemplate').html());
        self.$('.itogo-table').append(ln(item.toJSON()));
      });
      tprice = summa/square;
      this.$('span.itogo-total-number').text(number);
      this.$('span.itogo-total-summa').text($.number( summa, 0, ',', ' ' ));
      this.$('span.itogo-total-square').text($.number( square, 2, ',', ' ' ));
      this.$('span.itogo-total-price').text($.number( tprice, 0, ',', ' ' ));

      if (App.oldord){
        this.$('span.itogo-old-number').text(App.oldord['number']);
        this.$('span.itogo-old-summa').text($.number( App.oldord['summa'], 0, ',', ' ' ));
        this.$('span.itogo-old-square').text($.number(  App.oldord['square'], 2, ',', ' ' ));
        this.$('span.itogo-old-price').text($.number( App.oldord['summa']/App.oldord['square'], 0, ',', ' ' ));
        this.$('.itogo-old').removeClass('hide');
      }

      if (App.neword){
        this.$('span.itogo-new-number').text(App.neword['number']);
        this.$('span.itogo-new-summa').text($.number( App.neword['summa'], 0, ',', ' ' ));
        this.$('span.itogo-new-square').text($.number(  App.neword['square'], 2, ',', ' ' ));
        this.$('span.itogo-new-price').text($.number( App.neword['summa']/App.neword['square'], 0, ',', ' ' ));
        this.$('.itogo-new').removeClass('hide');
      }


      if (App.top.length>0){
        var strtop = '';
        for (var i = 0; i < App.top.length; i++) {
          strtop += '<li>'+App.top[i]+'</li>';
        };
      this.$('ol.itogo-top-table').append(strtop);
      }

      if (App.clients != null){
        this.$('.new-clients').text(App.clients['new']);
        this.$('.old-clients').text(App.clients['old']);
        this.$('.rec-clients').text(App.clients['rec']);
      }

      return this;
    }
  });

  var OrderTableView = Backbone.View.extend({
    el: $('#client-orders-list'),
    filter: new Object(),
    events:{
      'click #add-new-order': 'newOrderForm',
      'change #condition-filter': 'changeFilter',
      'change #manager-filter': 'changeFilter',
      'change #task-filter': 'changeFilter',
      'click .date-filter': 'dateFilter',
      'click .prev-page': 'prevPage',
      'click .next-page': 'nextPage',
      'click .cancel-task-date-filter': 'cancelTaskDateFilter',
      'click .cancel-order-date-filter': 'cancelOrderDateFilter',
      'click .by-client': 'clientFilter',
      'change #sleep-and-close': 'changeFilter'

    },

    itogoBlock:function(){
      var self = this;
      this.$('.itogo-block').html('');
      var ic = new ItogoCollection();
      ic.fetch({data: this.filter}).complete(function(){
        var iv = new ItogoView({el: self.$('.itogo-block'), collection: ic});
      });
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

      // AppFilter.on('change', function(){
      //  self.filter = AppFilter.attributes;
      // });

      this.filter = AppFilter.attributes;

      if (curClient && curClient.get('id') != ''){
        this.filter['cl'] = curClient.get('id');
      }
      // this.filter['c'] = 'all';
   //     this.filter['m'] = 'all';
   //     this.filter['t'] = 'all';
   //     this.filter['r'] = 'all';
   //     this.filter['od'] = 'all';
   //     this.filter['s'] = 'down';
   //     this.filter['p'] = App.curPage;
      this.collection = new OrderCollection();
      this.$el.html(this.template());

      //_.bindAll(this, 'showLoader', 'hideLoader');
      //this.$el.ajaxStart(this.showLoader).ajaxStop(this.hideLoader);
      this.collection.bind('request', this.showLoader, this);
      this.collection.bind('sync', this.hideLoader, this);

      this.collection.fetch({data: this.filter}).complete(function(){
        self.render();
        self.listenTo(self.collection, 'change reset add remove sort', self.render);
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
      this.itogoBlock();
      if (!curClient || curClient.get('id') == ''){
        this.$('#add-new-order').hide();
      }
      else{
        this.$('#add-new-order').show();
      }
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

      this.$('.task-date-filter').daterangepicker({
        // format: 'DD.MM.YYYY',
        startDate: moment(),
        endDate: moment(),
        alwaysShowCalendars: true,
        ranges: {
               'Сегодня': [moment(), moment()],
               'Вчера': [moment().subtract('days', 1), moment().subtract('days', 1)],
               'Завтра': [moment().add('days', 1), moment().add('days', 1)],
               'За 7 дней': [moment(),moment().add('days', 6)],
               'За 30 дней': [moment(),moment().add('days', 29)]
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
        function(start, end) {
        self.$('.task-date-filter').text(start.format('DD.MM.YYYY') + ' - ' + end.format('DD.MM.YYYY'));
        self.filter['r'] = start.format('DD.MM.YYYY') + '-' + end.format('DD.MM.YYYY');
        self.changeFilter();
        }
      );

      this.$('.order-date-filter').daterangepicker({
        // format: 'DD.MM.YYYY',
        startDate: moment(),
        endDate: moment(),
        alwaysShowCalendars: true,
        ranges: {
               'Сегодня': [moment(), moment()],
               'Вчера': [moment().subtract('days', 1), moment().subtract('days', 1)],
               'За 7 дней': [moment().subtract('days', 6),moment()],
               'За 30 дней': [moment().subtract('days', 29),moment()]
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
        function(start, end) {
          self.$('.order-date-filter').text(start.format('DD.MM.YYYY') + ' - ' + end.format('DD.MM.YYYY'));
          self.filter['od'] = start.format('DD.MM.YYYY') + '-' + end.format('DD.MM.YYYY');
          self.changeFilter();
        }
      );



      return this;
    },
    renderOne: function(item){
      if (item.get('id') == '')
        return;

      var view = new OrderTableItemView({model: item});
      view.parentView = this;
      this.$(".order-table").append(view.render().el);
      return view;
    },
    cancelTaskDateFilter:function(){
      if (this.filter['r'] == 'all')
        return;
      this.filter['r'] = 'all';
      this.$('.task-date-filter').text('Все даты');
      this.changeFilter();
    },
    cancelOrderDateFilter:function(){
      if (this.filter['od'] == 'all')
        return;
      this.filter['od'] = 'all';
      this.$('.order-date-filter').text('Все даты');
      this.changeFilter();
    },
    changeFilter:function(){
      App.curPage = 1;
      var cond = this.$('#condition-filter').val();
      var mng = this.$('#manager-filter').val();
      var tsk = this.$('#task-filter').val();
      var sc = this.$('#sleep-and-close').is(':checked')?'yes':'no';
      this.filter['p'] = App.curPage;
      this.filter['c'] = cond;
      this.filter['m'] = mng;
      this.filter['t'] = tsk;
      this.filter['sc'] = sc;
      var self = this;

      app_router.navigate(this.filterToUrl(), true);
      this.collection.fetch({data: this.filter}).complete(function(){
        self.render();});
    },

    filterToUrl:function(){
      var str = 'orders/';
      _.each(this.filter, function(value, key, list){
        str += '&'+key+'='+value
      });
      return str;
    },

    clientFilter:function(el){
      var id = $(el.target).data('client');
      var name = $(el.target).data('name');
      curClient.set({'id':id, 'name': name})
      this.filter['cl'] = curClient.get('id');
      this.changeFilter();
    },
    prevPage:function(el){
      if (this.$('.previous').hasClass('disabled'))
        return;
      if (App.curPage > 1){
        App.curPage--;
      }

      this.filter['p'] = App.curPage;

      this.collection.fetch({data: this.filter}).complete(function(){
        $(window).scrollTop(0);
       });

    },

    nextPage:function(el){
      if (this.$('.next').hasClass('disabled'))
        return;
      App.curPage++;

      this.filter['p'] = App.curPage;

      this.collection.fetch({data: this.filter}).complete(function(){
        $(window).scrollTop(0);
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
      this.changeFilter();
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
    },
    show:function(){
      this.$el.show();
    },
    hide:function(){
      this.$el.hide();
      $('#client-find-form').unblock();
    },
    close:function(){
      this.$el.hide();
      this.$el.empty();
      this.undelegateEvents();
      this.$el.removeData().unbind();
    }
  });

  var OrderTableItemView = Backbone.View.extend({
    tagName:'div',
    className: 'row table-item',
    events:{
      'click .order-history-lnk': 'showHistory',
      'click .show-tasks-lnk': 'showTask',
      'click .order-structure-lnk': 'showStructure',
      'click .client-card-lnk': 'showClient'
    },
    initialize:function(){
      this.template = _.template($('#orderTableItemTemplate').html());

    },
    render: function() {
      this.$el.html(this.template(this.model.toJSON()));
      return this;
    },
    showClient: function(){
      var cm = new ClientModel();
      cm.set({'id':this.model.get('client_id')});
      var cc = new ClientCardView({model:cm, el:$('#client-card-modal')});
      // cc.show();
      $('#client-card-modal').modal('show');

    },
    showHistory:function(){
      var hf = new HistoryFormView({el: $('#history-modal'), model: this.model});
      $('#history-modal').modal('show');
    },
    showTask:function(){
      var hf = new TaskFormView({el: $('#task-modal'), model: this.model});
      $('#task-modal').modal('show');
    },
    showStructure:function(){
      var pt = new ProductTableView({isnew:false,model: this.model});
      $('#client-orders-list').hide();
      pt.show();
    }
  });


  var TaskFormItenView = Backbone.View.extend({
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
    exTask:function(){
      var self = this;
      this.model.set({'status': 'отменена'});
      this.options.orderModel.save().complete(function(){
        self.$('.status-block').addClass('hide');
        self.$('.change-date').addClass('hide');
        self.$('.task-status').text('отменена');
      });
      return 0;
    },
    compTask:function(){
      var self = this;
      this.model.set({'status': 'завершена'});
      this.options.orderModel.save().complete(function(){
        self.$('.status-block').addClass('hide');
        self.$('.change-date').addClass('hide');
        self.$('.task-status').text('завершена');
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
          self.options.orderModel.save();
        });
      if (this.model.get('status') == ''){
        this.$('.status-block').removeClass('hide');
        this.$('.change-date').removeClass('hide');

      }
      return this;

    }
  });

  var TaskFormView = Backbone.View.extend({
    events:{
      'click .save-task': 'saveTask',
      'click .close-task': 'closeModal',
      'click .change-date': 'changeDate'
    },
    initialize:function(){
      var self = this;
      this.template = _.template($('#taskTableTemplate').html());
      if (this.model.get('id') != ''){
        this.model.fetch().complete(function(){
          self.render();
        });
      }
      else{
        self.render();
      }
      this.listenTo(this.model, 'change reset add remove', this.render);
    },
    render:function(){
      this.$el.html(this.template());
      var self = this;
      var hc = this.model.get('tasks');
      _.each(hc.models, function(item){
        self.renderOne(item);
      });
      // var ic = 0;
      // _.each(hc.models, function(item){
      //  var ln =  _.template($('#taskTableItemTemplate').html());

      //  self.$('tbody').append(ln(item.toJSON()));
      //  ic++;
   //     });
      this.$('.datepickr').datepicker({weekStart:1}).datepicker('setValue', new Date());
      this.$el.on('hidden', function () {
        self.$el.empty();
        self.undelegateEvents();
        self.$el.removeData().unbind();
      });
      return this;
    },

    renderOne:function(item){

      var view = new TaskFormItenView({'model':item, 'orderModel': this.model});
      this.$('tbody').append(view.render().el);
      return view;
    },
    changeDate: function(){

    },
    saveTaskOk:function(){
      var hm = new TaskModel();
      var self = this;
      hm.set({
        'condition': this.$('.task-select').val(),
        'comment': this.$('.task-comment-text').val(),
        'datetime':'new',
        'closedatetime': this.$('.datepickr input').val()
      });
      this.model.get('tasks').add(hm);
      this.model.save().complete(function(){
        self.closeModal();
      });
    },
    saveHistoryCancel:function(){
      this.$('.alert').hide();
      this.$('.save-history').show();
      this.$('.close-history').show();
    },
    saveTask:function(){
        this.saveTaskOk();
    },
    closeModal:function(){
      var self = this;
      this.$el.modal('hide');
    }
  });


  var HistoryFormView = Backbone.View.extend({
    events:{
      'click .save-history': 'saveHistory',
      'click .close-history': 'closeModal',
      'click .save-history-ok': 'saveHistoryOk',
      'click .save-history-cancel': 'saveHistoryCancel'
    },
    initialize:function(){
      var self = this;
      this.template = _.template($('#historyTableTemplate').html());
      if (this.model.get('id') != ''){
        this.model.fetch().complete(function(){
          self.render();
        });
      }
      else{
        self.render();
      }
    },
    render:function(){
      this.$el.html(this.template());
      var self = this;
      if (this.model.get('closed') == 'yes'){
        this.$('.enter-history').hide();
        this.$('.save-history').hide();
      }
      var hc = this.model.get('history');
      _.each(hc.models, function(item){
        var ln =  _.template($('#historyTableItemTemplate').html());
        self.$('tbody').append(ln(item.toJSON()));
      });
      this.$el.on('hidden', function () {
        self.$el.empty().html();
        self.undelegateEvents();
        self.$el.removeData().unbind();
      });
      return this;
    },
    saveHistoryOk:function(){
      var hm = new HistoryModel();
      var self = this;
      var ctype = this.$('.condition-select').find(":selected").data('property');
      hm.set({
        'condition': this.$('.condition-select').val(),
        'condition_type': ctype,
        'comment': this.$('.comment-text').val(),
        'datetime':'new'
      });
      this.model.get('history').add(hm);
      this.model.save().complete(function(){
        self.closeModal();
      });
    },
    saveHistoryCancel:function(){
      this.$('.alert').hide();
      this.$('.save-history').show();
      this.$('.close-history').show();
    },
    saveHistory:function(){
      var ctype = this.$('.condition-select').find(":selected").data('property');
      if (ctype=='закрывающее'){
        this.$('.save-history').hide();
        this.$('.close-history').hide();
        this.$('.alert').show();
      }
      else{
        this.saveHistoryOk();
      }
    },
    closeModal:function(){
      var self = this;
      this.$el.modal('hide');
    }
  });

  var ProductTableView = Backbone.View.extend({
    el: $('#products-list'),
    isnew:true,
    events:{
      'click .add-new-position': 'addNewPosition',
      'click .add-new-service': 'addNewService',
      'click .close-production': 'closeView',
      'click .quick-enter': 'showHistory',
      'click .save-and-close': 'saveAndClose'

    },
    initialize:function(){
      App.productView = this;
      this.template = _.template($('#productTableTemplate').html());
      var self = this;
      if(!this.options.isnew){
        this.model.fetch().complete(function(){
          self.render();
          self.listenTo(self.model, 'change reset add remove', self.render);
        });
      }
      else{
        this.render();
        this.listenTo(this.model, 'change reset add remove', this.render);
      }

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
      var tn = 0;
      var tp = 0;
      var ts = 0;
      var appr = '';
      var hc = this.model.get('products');
      _.each(hc.models, function (item) {
        self.renderOne(item);
        if (item.get('approx') == 'yes')
          appr = 'yes-approx';
        var cnt = parseInt(item.get('count'));
        tn += cnt;
        tp += cnt*parseInt(item.get('price'));
        ts += cnt*parseFloat(item.get('sq'));
      }, this);

      this.$('.total-num').text(tn);
      this.$('.total-price').text($.number( tp, 0, ',', ' ' )).addClass(appr);
      this.$('.total-sq').text($.number( ts, 2, ',', ' ' ));

      if (this.model.get('closed') == 'yes'){
        this.$('.add-new-position').hide();
        this.$('.save-and-close').hide();
      }
      this.$('.total-montaz').numeric({ decimal: false, negative: false });
      this.$('.markup').numeric({ decimal: ',', negative: false,decimalPlaces:2 });

      return this;
    },

    renderOne: function(item){
      var view = new ProductTableItemView({model: this.model, product:item});
      this.$("tbody").append(view.render().el);
      return view;
    },


    addNewPosition: function(){
      var pm = new ProductModel();
      // this.model.get('products').add(pm);
      var pf = new PositionFormView({el: $('#position-modal'), model: this.model, product:pm, isnew:true});
      $('#position-modal').modal('show');
    },
    saveAndClose:function(){
      this.model.set({
        'total_address' : this.$('.total-address').val(),
        'total_montaz' : this.$('.total-montaz').val(),
        'markup' : Routine.strToFloat(this.$('.markup').val()),
        'total_shef_montaz' : this.$('.total-shef-montaz').is(':checked')?'yes':'no'
      });

      if(this.model.get('condition')){
          var currentStateName = DICTS[this.model.get('condition')]
          var currentStateInfo = DICTS.condition.find((x)=>x.name==currentStateName);
          if(currentStateInfo && currentStateInfo['price']=='enabled' && ( !this.$('.markup').val() || Routine.strToFloat(this.$('.markup').val())===0)) {
              Routine.showMessage('Необходимо заполнить наценку.','error')
              return;
          }
      }

      var self = this;
      this.model.save().complete(function(){
        self.closeView();
      });
    },
    closeView:function(){
      this.close();
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
      var hf = new HistoryFormView({el: $('#history-modal'), model: this.model});
      var self = this;
      $('#history-modal').modal('show').on('shown', function(){self.closeView();});
    }
  });

  var ProductTableItemView = Backbone.View.extend({
    events:{
      'click .show-position': 'showPosition'
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
      'change .pos-number': 'recalcMoney',
      'change .mont-price': 'recalcMoney'
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
    recalcMoney:function(){
      var one_price = 0;
      var one_sq = 0;
      if (!isNaN(parseInt(this.$('.construction-price').val()))){
        one_price = parseInt(this.$('.construction-price').val());
      }

      if (!isNaN(parseFloat(this.$('.construction-sq').val().replace(',','.')))){
        one_sq = parseFloat(this.$('.construction-sq').val().replace(',','.'));
      }
      var summa = 0;
      var mnt_summa = 0;
      var total_sq = 0;
      this.$('.products-table .row').each(function(item){
          var cnt = parseInt($('.pos-number', this).val().replace(',','.'));
          var mont = parseInt($('.mont-price', this).val().replace(',','.'));

          if (isNaN(cnt)){
            cnt = 0;
          }
          if (isNaN(mont)){
            mont = 0;
          }

          total_sq += cnt*one_sq;
          summa += cnt*one_price;
          mnt_summa += mont;

        });


      var kvm = summa/total_sq;
      this.$('.pos-total-price').text($.number( summa, 0, ',', ' ' ));
      this.$('.pos-total-montaz').text($.number( mnt_summa, 0, ',', ' ' ));
      this.$('.pos-total-all').text($.number( summa + mnt_summa, 0, ',', ' ' ));
      this.$('.pos-total-sq').text($.number( total_sq, 2, ',', ' ' ));
      this.$('.pos-total-kvm').text(isNaN(kvm)?0:$.number( kvm, 2, ',', ' ' ));
      return summa;
      if (!this.isapprox){
        var summa = 0;
        this.$('tbody tr').each(function(item){
          var cnt = $('.pos-number', this).val().replace(',','.');
          var prc = $('.pos-price', this).val().replace(',','.');

          if (isNaN(parseInt(cnt))){
            cnt = 0;
          }
          if (isNaN(parseInt(prc))){
            prc = 0;
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

      this.$('.pos-number, .pos-price, .pos-delivery, .mont-price').numeric({ decimal: false, negative: false });
      this.$('.construction-price').numeric({ decimal: false, negative: false });
      this.$('.construction-sq, .construction-length, .construction-width, .construction-height').numeric({ negative: false, decimal: ',' });
      if (this.options.product.get('type') != ''){
        this.$('.remove-position').removeClass('hide');
      }
      this.recalcMoney();
      this.$el.on('hidden', function () {
        self.$el.empty();
        self.undelegateEvents();
        self.$el.removeData().unbind();
      });
      return this;
    },
    saveAddPosition:function(){
      var totsum = this.recalcMoney();
      var posc = new PositionCollection();
      var nums = 0;
      var addrs = '';
      this.$('.products-table .row').each(function(item){
        var posm = new PositionModel();
        var nm = $('.pos-number', this).val();
        var addr = $('.pos-addr', this).val();
        posm.set({
          'num': nm,
          // 'price': $('.pos-price', this).val(),
          'addr': addr,
          // 'delivery': $('.pos-delivery', this).val(),
          'mont_price': $('.mont-price', this).val(),
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
        'name': this.$('.constuction-target').val(),
        'sq': this.$('.construction-sq').val().replace(',','.'),
        'length': this.$('.construction-length').val(),
        'width': this.$('.construction-width').val(),
        'height': this.$('.construction-height').val(),
        'count': nums,
        'price': this.$('.construction-price').val(),
        'approx': this.$('.isapprox').is(':checked')?'yes':'no',
        'positions': posc,
        'addrs': addrs
      });
      if (this.options.isnew){
        this.model.get('products').add(this.options.product);
      }
      var self = this;
      // this.model.set({'price': totsum});
      this.model.save().complete(function(){
        self.options.isnew = true;
        self.options.product = new ProductModel();
        self.render();
      });
    },
    savePosition:function(){
      var totsum = this.recalcMoney();
      var posc = new PositionCollection();
      var nums = 0;
      var addrs = '';
      this.$('.products-table .row').each(function(item){
        var posm = new PositionModel();
        var nm = $('.pos-number', this).val();
        var addr = $('.pos-addr', this).val();
        posm.set({
          'num': nm,
          // 'price': $('.pos-price', this).val(),
          'addr': addr,
          // 'delivery': $('.pos-delivery', this).val(),
          'mont_price': $('.mont-price', this).val(),
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
        'name': this.$('.constuction-target').val(),
        'sq': this.$('.construction-sq').val().replace(',','.'),
        'length': this.$('.construction-length').val(),
        'width': this.$('.construction-width').val(),
        'height': this.$('.construction-height').val(),
        'count': nums,
        'price': this.$('.construction-price').val(),
        'approx': this.$('.isapprox').is(':checked')?'yes':'no',
        'positions': posc,
        'addrs': addrs
      });
      if (this.options.isnew){
        this.model.get('products').add(this.options.product);
      }
      var self = this;
      // this.model.set({'price': totsum});
      this.model.save().complete(function(){
        self.closeModal();
      });
    },

    removePosition:function(){
      this.options.product.destroy();
      var self = this;
      this.model.save().complete(function(){
        self.closeModal();
      });
    },

    addAddr: function(){
      var pos = new PositionModel();
      pos.set({'num': 1,'montcheck':'', 'shmontcheck': ''});
      var ln =  _.template($('#positionItemTemplate').html());
      this.$('.products-table').append(ln(pos.toJSON()));
      this.$('.pos-number, .pos-price, .pos-delivery').numeric({ decimal: false, negative: false });
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


 var cf = new ClientFindView();
  // Instantiate the router
  var app_router = new AppRouter;
  app_router.on('route:rootRoute', function (actions) {
    console.log('home');
    // app_router.navigate('/', {trigger: true, replace: true});
    cf.unblockForm();
  });
  app_router.on('route:defaultRoute', function (actions) {
    console.log('default');

  });
  app_router.on('route:orderList', function (filter) {
    AppFilter.set(urlToObj(filter));
    cf.showOrdersTable();

  });


  var foo = Backbone.history.start()
  console.log(foo);

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

function mergeObjs(to,from){
  for(var a in from)
  {
    to[a] = from[a];
  }
}
