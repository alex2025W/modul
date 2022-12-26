var App = {
  Models: {},
  Views:{},
  Collections:{},
  Route:null,
  ListFilters:{'factories':[], 'statuses':[], 'debt': []},
  factories:{"KALUGA":"5305d15472ab560009030c0e", "PENZA":"5305d15472ab560009030c10"},
  hideClosedPayments:true, // скрывать платежи, по которым есть 100% оплата
  initialize:function(){
    App.Views.Main = new AppView();

    App.Route = new AppRouter();
    Backbone.history.start();
  },
  // откинуть значения меньше копеек
  removeLowerValues:function(res){
    for(var k in res)
      res[k] = Math.floor((Math.round(res[k]*10000)/10000)*100)/100;
    return res;
  },
  // расчитать стоимость контакта
  calcCost:function(model){
    var res = {montaz:0, cost:0, service:0, full: 0};
    res.montaz+=Routine.strToFloat(model.get("montaz_price"));
    res.cost += Routine.strToFloat(model.get("goods_price"))+Routine.strToFloat(model.get("delivery_price"));
    res.service = 0;

    var hc = model.get('productions');
    _.each(hc.models, function (item) {
      if(item.get('status')!='del'){
        if(!item.get('product_type')){
          var cnt = item.get("is_complect")?Routine.strToInt(item.get('complect_count')||'0')||Routine.strToInt(item.get('count')||'0'):Routine.strToInt(item.get('count')||'0');
          res.cost += cnt*Routine.strToFloat(item.get('price')||0);
          item.get("positions").each(function(ps){
            res.montaz+=Routine.strToFloat(ps.get("mont_price")||0)*(ps.get("mont_price_type")?1:Routine.strToInt(ps.get('num')));
            res.cost+=Routine.strToFloat(ps.get("delivery")||0);
          });
        }else
        if(item.get('product_type')=='service'){
          res.service += Routine.strToFloat(item.get("price")||0);
        }
      }
    });

    // полная стоимость
    var full_res = 0;
    for(var i in res)
         full_res+=res[i];
    res['full'] = full_res;
    // откинуть
    return App.removeLowerValues(res);
  },

  // получить порядковый номер продукции
  getProductionNumber:function(production){
    var max = 0;
    if(App.Views.Contract.parent_productions){
      // найти максимальное значение позиции среди всех допников
      for(var i=0;i<App.Views.Contract.parent_productions.length;++i){
        if(App.Views.Contract.parent_productions[i].number>max)
          max = App.Views.Contract.parent_productions[i].number;
      }
    }
    for(var i=0;i<App.Views.Contract.model.get('productions').length;++i){
      if(App.Views.Contract.model.get('productions').models[i].get('number') && App.Views.Contract.model.get('productions').models[i].get('number')>max)
        max = App.Views.Contract.model.get('productions').models[i].get('number');
    }
    var cnt = max+1;
    for(var i=0;i<App.Views.Contract.model.get('productions').length;++i){
      if(App.Views.Contract.model.get('productions').models[i].get('number')===''){
        if(App.Views.Contract.model.get('productions').models[i].get('_id')==production['_id'])
          return cnt;
        cnt++;
      }
    }
    return cnt;
  },

  // расчитать стоимость платежей
  calcPayments:function(model){
    var res = {montaz:0, cost:0, full: 0};
    var hc = model.get("payments");
    _.each(hc.models, function (item) {
      if(!item.get('is_canceled')){
        if(item.get("payment_use").code==2)
          res.montaz+=Routine.strToFloat(item.get("size"));
        else
          res.cost+=Routine.strToFloat(item.get("size"));
      }
    });

    // полная стоимость
    var full_res = 0;
    for(var i in res)
         full_res+=res[i];
    res['full'] = full_res;

    return App.removeLowerValues(res);
  },

  // добавить элемент в историю
  addChangeHistory:function(contract, object_data){
    var is_add = true;
    if(object_data.operation=='edit')
    {

      contract.get('change_history').map(function(item){
        if(!item._id && item.object_type==object_data.object_type && item.object_id==object_data.object_id && item.operation=="edit"){
          is_add = false;
          item.date = moment.utc().format("YYYY-MM-DDTHH:mm:ss");
          item.user_email = MANAGER;
        }
      });
    }
    if(object_data.operation=='delete' && object_data.object_id.indexOf("new_")==0){
      is_add = false;
      var ch_list = [];
      contract.get('change_history').map(function(item){
        if(item.object_type!=object_data.object_type || item.object_id!=object_data.object_id){
          ch_list.push(item);
        }
      });
      contract.set('change_history', ch_list);
    }
    if(is_add){
      var elem = {'date':moment.utc().format("YYYY-MM-DDTHH:mm:ss"), "user_email": MANAGER, "object_type":object_data.object_type, "object_id":object_data.object_id, "operation":object_data.operation};
      if(object_data['more']){
        elem['more'] = object_data['more'];
      }
      if(contract.get("base_additional"))
      {
        elem.additional_id = contract.get('base_additional')['_id'];
        elem.additional_number = contract.get('base_additional')['number'];
      }
      contract.get('change_history').push(elem);
    }
  },

  // получить список событий истории для объекта
  getChangeHistory:function(contract, object_type, object_id){
    var res = [];
    // вытаскиваем только те элементы истории, которые были сделаны на основании ДС (включая текущие, если сейчас идер редактирование на основании ДС)
    contract.get('change_history').map(function(item){
      if((item.additional_id || (!item['_id'] && contract.get('is_edited'))) && item.object_type==object_type && item.object_id==object_id){
        res.push(item);
      }
    });
    return res;
  },

  getPaymentUseByCode:function(code){
    for(var i in App.Models["PaymentUses"])
      if(App.Models["PaymentUses"][i].code==code)
        return App.Models["PaymentUses"][i];
    return null;
  },
  setTimeToDate:function(date){
    var dt = new Date();
    date.setHours(dt.getHours());
    date.setMinutes(dt.getMinutes());
    date.setSeconds(dt.getSeconds());
    return date;
  },
  GetFilter:function(){
    return App.ListFilters.factories.join(",")+";"+App.ListFilters.statuses.join(",")+";"+App.ListFilters.debt.join(",");
  },
  ResetListFilters:function(){
    App.Views.Main.ResetFilters();
  },
  getWorkCode:function(workorder_id, work_id){
    for(var i in App.Models.CurrentContractWorkorder){
      if(App.Models.CurrentContractWorkorder[i]['_id']==workorder_id){
        for(var j in App.Models.CurrentContractWorkorder[i]['plan_work']){
          if(App.Models.CurrentContractWorkorder[i]['plan_work'][j]['_id']==work_id){
            return App.Models.CurrentContractWorkorder[i]['plan_work'][j].code;
          }
        }
      }
    }
    return 0;
  },
  // получить задолженность по платежу
  getPaymentRest:function(payment){
    // ищем workorder
    var work = null;
    var now = new Date();
    if(App.Models.CurrentContractWorkorder){
      if(payment.get('work_order_id') && payment.get('work_id')){
        for(var t in  App.Models.CurrentContractWorkorder){
          var w = App.Models.CurrentContractWorkorder[t];
          if(w['_id']==payment.get('work_order_id')){
            for(var s in (w['plan_work'] || []))
            {
              var wp = w['plan_work'][s];
              if(wp['_id']==payment.get('work_id')){
                work = wp
                break
              }
            }
          }
        }
      }
    }
    //console.log(work);
    var edate = null;
    if(work){
      edate = work['date_finish_with_shift'] ||
        work['date_start_with_shift'] ||
        work['date_finish'] ||
        work['date_start'] ||
        work['contract_plan_date_finish_with_shift'] ||
        work['contract_plan_date_start_with_shift'] ||
        work['contract_plan_date_finish'] ||
        work['contract_plan_date_start'];
      if(edate)
        edate = new Date(edate);
    }

    if(!edate && payment.get('date')){
      edate = new Date(payment.get('date'));
      if(payment.get('period')=='by_period')
        edate = payment.get('date_end')?(new Date(payment.get('date_end'))):null;
      else
        if(payment.get('period')=='by_event')
          edate.setDate(edate.getDate()+Routine.strToInt(payment.get('day_count'))+1);
    }
    if(edate && edate<now && !payment.get('is_canceled')){
      var pays=0;
      var events = payment.get('events');
      var pays = 0;
      if(events)
        events.map(function(ev){
          pays+=Routine.strToFloat(ev['size'] || '0');
        });
      return Routine.strToFloat(payment.get('size') || '0')-pays;
    }
    return 0;
  }
};

Date.prototype.toJSON = function(){
  return moment(this).add(-moment().zone(),'minutes').toISOString();
};

var eventBus = _.extend({}, Backbone.Events);

  // настраивам роуты
var AppRouter = Backbone.Router.extend({
  routes: {
    "": "index",
    "search/:id": "show",  // редактировать запись
    "search/:parent_id/:id":"show_additional", // доп. соглашение
    "add":"add",
    "add/:parent_id":"add_additional",
    "list/:page":"list", // список с пейджером
    "list/:page/:filter":"filter_list" // список с пейджером и фильтрами
  },

  index:function(){
    App.ListFilters.factories = [];
    App.ListFilters.statuses = [];
    App.ListFilters.debt = [];
    (new ContractsList({'el':$("#contractEditPnl")})).show(1);
  },

  list:function(page){
    App.ListFilters.factories = [];
    App.ListFilters.statuses = [];
    App.ListFilters.debt = [];
    (new ContractsList({'el':$("#contractEditPnl")})).show(page);
  },
  filter_list:function(page, filter){
    // парсим фильтры
    var flst =filter.split(";");
    App.ListFilters.factories = flst[0]?flst[0].split(','):[];
    App.ListFilters.statuses = flst[1]?flst[1].split(','):[];
    App.ListFilters.debt = flst[2]?flst[2].split(','):[];
    App.ResetListFilters();
    (new ContractsList({'el':$("#contractEditPnl")})).show(page);
  },
  show: function(id) {
    App.Views.Main.Search(id);
  },
  add:function(){
    App.Views.Main.OnNew();
  },
  show_additional:function(parent_id,id){
    App.Views.Main.Search(id, parent_id);
  },
  add_additional:function(parent_id){
    App.Views.Main.NewAdditional(parent_id);
  }
});

 $(function(){
  $('html').click(function(e){
    var elem = $(e.target);
    var i = 1;
    var isTarget = false;
    while (elem != undefined && i < 5) {
      isTarget = isTarget || elem.hasClass('linked-products') || elem.hasClass('product-link');
      elem = elem.parent();
      i++;
    }
    if (!isTarget){
      $('.linked-products').hide();
      $('.product-link').removeClass('selected');
    }
  });
});

var AppView = Backbone.View.extend({
  el:$("#contractContainer"),

  initialize:function(){
    var self = this;
    $("#btnContractFind").click(function(){
      self.OnSearch();
    });
    $("#tbContractNumber").keydown(function(k){
      if(k.keyCode==13)
        self.OnSearch();
    });
    $("#btnNewContract").click(function(){
      self.OnNew();
    });

    for(var i in App.Models['FactoryList']){
      this.$(".ddl-factories").append('<option value="'+App.Models['FactoryList'][i]['_id']+'">'+(App.Models['FactoryList'][i]['name']?App.Models['FactoryList'][i]['name']:'Не указан')+'</option>');
    }

    // подключение мультиселекта на заводов
    this.$('.ddl-factories').multiselect({
      buttonContainer: '<span class="dropdown" />',
      includeSelectAllOption: true,
      enableCaseInsensitiveFiltering: true,
      numberDisplayed: 4,
      filterPlaceholder: 'Найти',
      nonSelectedText: "Заводы",
      nSelectedText: "Заводов выбрано: ",
      selectAllText: "Все",
      maxHeight: 400,
      buttonText: function(options) {
          if (options.length === 0) {
            return 'Заводы <b class="caret"></b>';
          }
          else if (options.length > this.numberDisplayed) {
              return this.nSelectedText+options.length + ' ' +  ' <b class="caret"></b>';
          }
          else {
            var selected = 'Заводы: ';
            options.each(function() {
              selected += $(this).text() + ', ';
            });
            return selected.substr(0, selected.length -2) + ' <b class="caret"></b>';
          }
        },
        onChange: function(element, checked, select) {
          App.ListFilters.factories = [];
          element.parent().find("option:selected").each(function(){
            //if($(this).val()!='multiselect-all')
            App.ListFilters.factories.push($(this).val());
          });
          App.Route.navigate("list/1/"+App.GetFilter(),true);
        }
    });
    // подключение мультиселекта на статусы
    this.$('.ddl-statuses').multiselect({
      buttonContainer: '<span class="dropdown" />',
      includeSelectAllOption: true,
      enableCaseInsensitiveFiltering: true,
      numberDisplayed: 4,
      filterPlaceholder: 'Найти',
      nonSelectedText: "Статусы",
      nSelectedText: "Статусов выбрано: ",
      selectAllText: "Все",
      maxHeight: 400,
       buttonText: function(options) {
          if (options.length === 0) {
            return 'Статусы <b class="caret"></b>';
          }
          else if (options.length > this.numberDisplayed) {
              return this.nSelectedText+options.length + ' ' +  ' <b class="caret"></b>';
          }
          else {
            var selected = 'Статусы: ';
            options.each(function() {
              selected += $(this).text() + ', ';
            });
            return selected.substr(0, selected.length -2) + ' <b class="caret"></b>';
          }
        },
        onChange: function(element, checked) {
          App.ListFilters.statuses = [];
          element.parent().find("option:selected").each(function(){
            App.ListFilters.statuses.push($(this).val());
          });
          App.Route.navigate("list/1/"+App.GetFilter(),true);
        }
    });
    this.$('.ddl-debt').multiselect({
      buttonContainer: '<span class="dropdown" />',
      includeSelectAllOption: true,
      enableCaseInsensitiveFiltering: true,
      numberDisplayed: 4,
      filterPlaceholder: 'Найти',
      nonSelectedText: "Задолженность",
      selectAllText: "Все",
      maxHeight: 400,
       buttonText: function(options) {
          if (options.length === 0) {
            return 'Задолженность <b class="caret"></b>';
          }
          else if (options.length > this.numberDisplayed) {
              return this.nSelectedText+options.length + ' ' +  ' <b class="caret"></b>';
          }
          else {
            var selected = 'Задолженность: ';
            options.each(function() {
              selected += $(this).text() + ', ';
            });
            return selected.substr(0, selected.length -2) + ' <b class="caret"></b>';
          }
        },
        onChange: function(element, checked) {
          App.ListFilters.debt = [];
          element.parent().find("option:selected").each(function(){
            App.ListFilters.debt.push($(this).val());
          });
          App.Route.navigate("list/1/"+App.GetFilter(),true);
        }
    });
    this.$(".pnl-ddl-factories, .pnl-ddl-statuses, .pnl-ddl-debt").show();

  },
  ResetFilters:function(){
    this.$('.ddl-statuses option, .ddl-factories option').prop('selected',false);
    if(App.ListFilters.factories.length>0){
      var flt1 = "";
      for(var i in App.ListFilters.factories){
        flt1=("[value="+App.ListFilters.factories[i]+"]");
        this.$('.ddl-factories option'+flt1).prop("selected",true);
      }

    }
    this.$('.ddl-debt option, .ddl-debt option').prop('selected',false);
    if(App.ListFilters.debt.length>0){
      var flt1 = "";
      for(var i in App.ListFilters.debt){
        flt1=("[value="+App.ListFilters.debt[i]+"]");
        this.$('.ddl-debt option'+flt1).prop("selected",true);
      }

    }
    var flt2 = "";
    if(App.ListFilters.statuses.length>0){
      for(var i in App.ListFilters.statuses){
        flt2=("[value="+App.ListFilters.statuses[i]+"]");
        this.$('.ddl-statuses option'+flt2).prop("selected",true);
      }
    }

    this.$('.ddl-factories').multiselect('refresh');
    this.$('.ddl-statuses').multiselect('refresh');
    this.$('.ddl-debt').multiselect('refresh');
  },
  OnSearch:function(){
    var num = $("#tbContractNumber").val();
    App.Route.navigate("/search/"+num,true);

    //if(num)
//                this.Search(num);
  },
  Search:function(num,parent_num){
    Routine.showLoader();
    if(!parent_num)
      parent_num = null;
    var self = this;
    App.Route.navigate("/search/"+(parent_num?(parent_num+"/"):"")+num,false);
     $.ajax({
      url: '/handlers/contracts/search_contract',
      type: 'GET',
      dataType: 'json',
      contentType: "application/json; charset=utf-8",
      data: {'num':num, 'parent_num':parent_num},
      timeout: 35000,
      success: function (result, textStatus, jqXHR) {
          Routine.hideLoader();
          if(result.status=='error'){
            $.jGrowl(result.msg, { 'themeState':'growl-error', 'sticky':false, life: 10000 });
          }else
          if(result.status=="ok"){
           self.ShowContract(result.contract, result.parent_productions, result.workorders);
          }else
          $.jGrowl('Ошибка сервера', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      }
    }).fail(function(jqXHR, textStatus, errorThrown ) {
      $.jGrowl('Ошибка сервера:' + errorThrown, { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      Routine.hideLoader();
    });
  },
  ShowContract:function(data, parent_productions, workorders){
    if(!data){
      $("#contractEditPnl").html('<p class="notfound">Договор не найден</p>');
    }else
    {
      App.hideClosedPayments = true;
      _.each(data.productions,function(item){
        if(!('positions' in item)){
          item.positions = [{'num':item['count']}];
        }
      },this);
      App.Models.CurrentContract = new App.Models.ContractModel(data);
      App.Models.CurrentContractWorkorder = workorders || [];
      App.Views.Contract = new App.Views.ContractView({model:App.Models.CurrentContract.get('draft')})
      App.Views.Contract.parent_productions = parent_productions;
      App.Views.Contract.render();
    }
  },
  OnNew:function(){
    App.hideClosedPayments = true;
    App.Route.navigate("add",false);
    App.Models.CurrentContract = new App.Models.ContractModel();
    App.Views.Contract = new App.Views.ContractView({model:App.Models.CurrentContract.get('draft')})
    App.Views.Contract.render();
  },

  /**
   ** Добавление доп. соглашения
  **/
  NewAdditional:function(parent_id){
    // добавить доп. соглашение можно если только подписан основной договор и все другие допники
    App.Route.navigate("add/"+parent_id,false);
    Routine.showLoader();
    $.ajax({
      url: '/handlers/contracts/get_contract_number',
      type: 'GET',
      dataType: 'json',
      contentType: "application/json; charset=utf-8",
      data: {'parent_id':parent_id},
      timeout: 35000,
      success: function (result, textStatus, jqXHR) {
          Routine.hideLoader();
          if(result.status=='error'){
            $.jGrowl(result.msg, { 'themeState':'growl-error', 'sticky':false, life: 10000 });
          }else
          if(result.status=="ok"){
          App.hideClosedPayments = true;
          App.Models.CurrentContract = new App.Models.ContractModel({'parent_id':parent_id, 'parent_number':result.contract.number, 'orders':result.contract.orders, 'client_id':result.contract.client_id, 'client_name':result.contract.client_name, 'factory':result.contract.factory, 'factory_id':result.contract.factory_id });
          App.Views.Contract = new App.Views.ContractView({model:App.Models.CurrentContract.get('draft')})
          App.Views.Contract.parent_productions = result.contract.parent_productions;
          App.Views.Contract.render();
          }else
          $.jGrowl('Ошибка сервера', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      }
    }).fail(function(jqXHR, textStatus, errorThrown ) {
      $.jGrowl('Ошибка сервера:' + errorThrown, { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      Routine.hideLoader();
    });;

  }
});

var FileModel = Backbone.Model.extend({
  defaults:{
    'name': '',
    'size': 0
  }
});
var FileCollection = Backbone.Collection.extend({
  model: FileModel
});


var PositionModel = Backbone.Model.extend({
  defaults:{
    'num':0,
    'addr':'',
    'mont':'',
    'shmont':'',
    'mont_price':'',
    'mont_price_type':0,
    'delivery':''
  }
});

var PositionCollection = Backbone.Collection.extend({
  model: PositionModel
});


/**
* Структура
* @type {[type]}
*/
var ProductModel = Backbone.Model.extend({
  defaults:{
    'number': '',
    'user_email':"",
    'type':'',
    'name':'',
    'target':'',
    'count':1,
    'square':0.0,
    'price':0,
    'approx':'no',
    'addrs':'',
    'length':'',
    'width': '',
    'height': '',
    'is_complect':false,
    'product_type':'',
    'product_include':'no',
    'by_production':false,
    'service_units':[],
    'note':'',
    'positions':new PositionCollection(),
    'edit_history':[],
  },
  initialize:function(){
    if(this.get("positions") instanceof Array){
      this.set("positions", new PositionCollection(this.get("positions")));
    }
    if(!this.get("_id")){
      this.set("_id","new_"+Guid.newGuid());
    }
  }
});

var ProductCollection = Backbone.Collection.extend({
  model: ProductModel,
  comparator: function(item) {
    return item.get('number');
  }
});


/*    var ServiceModel = Backbone.Model.extend({
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
}); */

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
    'by_service':false,
    'services':[],
    'units':[],
    'note':'',
    'comments':null
  },
  initialize:function(){
    if(!this.get("currency"))
      this.set("currency",App.Models["CurrencyList"][0]);
    if(!this.get("comments"))
      this.set("comments",[]);
    if(!this.get("_id")){
      this.set("_id","new_"+Guid.newGuid());
    }
  }
});

var PaymentCollection = Backbone.Collection.extend({
  model: PaymentModel,
  comparator:function(el){
    // платежи без дат скидываем вниз
    return el.get('date')?(new Date(el.get("date"))):(new Date(5000,01,01));
  }
});


App.Models.ContractModel = Backbone.Model.extend({
  defaults: {
    'number':null,
    'user_email':null,
    'date_change':null,
    'is_signed':"no",
    'debt': 0,
    'sign_date':null,
    'deadline':null,
    'orders':null,
    'client_name':'',
    'client_signator':'',
    'client_signator_id':'',
    'client_id':null,
    'date_add':null, // дата создания контракта (Договор от)
    'total_address':"",// общий адрес продукции
    'total_shef_montaz':false,
    'approx':false,
    //'price':0,
    'is_tender':'no',
    'payment_uses':[],
    'goods_price':'',
    'markup':0,
    'montaz_price':'',
    'delivery_price':'',
    'factory_id':'',
    'factory':'',
    'productions': null,//new ProductCollection(),
    //'services':null,
    'payments': null, //new PaymentCollection(),
    'note':'',
    'customer_number':'',
    'parent_id':'',
    'additional_contracts':[],
    'is_draft':false,
    'draft':null,
    'change_history':[], // история изменений
    'order_positions':[] // договорные позиции
  },
  initialize:function(){
    if(this.get("productions")==null){
      this.set("productions",new ProductCollection());
    }
    if(this.get("payments")==null)
      this.set("payments",new PaymentCollection());

    if(this.get('orders')==null)
      this.set('orders',[]);

    this.on("change",this.reset,this);

    if(!this.get('draft') && !this.get('is_draft')){
      var mdl = this.toJSON();
      mdl.is_draft = true;
      this.set('draft',new App.Models.ContractModel(JSON.parse(JSON.stringify(mdl))));

      if(!this.get('is_draft') && this.get('is_signed')=='yes'){
        this.get('draft').set('is_contract_signed',true);
      }
    }
    if(this.get('order_positions')==null)
      this.set('order_positions',[]);

    this.reset();
  },
  reset:function(){
    if(this.get("productions") instanceof Array)
      this.set("productions", new ProductCollection(this.get("productions")));
    /*if(this.get("services") instanceof Array)
      this.set("services", new ServiceCollection(this.get("services"))); */
    if(this.get('payments') instanceof Array)
      this.set("payments", new PaymentCollection(this.get("payments")));

    if(!this.get('is_draft') && typeof(this.get('draft'))=='string')
      this.set('draft', new App.Models.ContractModel ( JSON.parse(this.get('draft'))));

    if(!this.get('is_draft') && this.get('is_signed')=='yes'){
      this.get('draft').set('is_contract_signed',true);
    }
  },
  url:"/handlers/contracts/save_contract"
});

///
/// Контрол просмотра контакта
///
App.Views.ContractView = Backbone.View.extend({
  el: $("#contractEditPnl"),
  template: _.template($("#contractEditTemplate").html()),
  errors_view:null,
  productions:null,
  initialize:function(){
    //  this.render();
  },
  events:{
    'click #btnFillFromOrder':'onFillFromOrder',
    'click .contract-additional-number':'onShowHideAdditionalNumber',
    'click #customerIdSigned':'onSignChanged',
    'click #cancelContract':'onContractCancel',
    'click .cancel-full-data':'cancelSaveData',
    'click .save-full-data':'saveFullData',
    'click .conduct-full-data':'conductFullData',
    'click .edit-on-base-btn':'editOnBase',
    'click .draft-clear-tab a':'onDraftClearTabChecked'
  },
  render:function(){
    var self = this;
    $("#filters-list").hide();
    this.$el.removeData().unbind();
    this.$el.html(this.template(this.model.toJSON()));
    this.$("#contractDate").datepicker({weekStart:1,format:"dd.mm.yyyy"});
    this.$("#customerDateSign").datepicker({weekStart:1,format:"dd.mm.yyyy"});
    this.$("#contractFinishDate").datepicker({weekStart:1,format:"dd.mm.yyyy"});

    var self = this;
    this.$("#claimNumber").tokenInput('/handlers/contracts/search_order', {
      method:'POST',
      minChars:1,
      tokenValue:"_id",
      propertyToSearch:'number',
      jsonContainer:'result',
      hintText:'Поиск заявки',
      noResultsText:'Заявка не найдена',
      searchingText:'Поиск',
      resultsLimit:15,
      //tokenLimit:1,
      zIndex:9999,
      onAdd: function(item){
        if (item['have_access'] != undefined){
          if (item['have_access']){
            self.$("#btnFillFromOrder").removeClass("disabled");
          } else {
            Routine.showMessage('Нет доступа к заявке', 'error');
          }
        }
        if(item['client_id']){
          self.model.set("client_id",item['client_id']);
          self.model.set("client_name",item['client']);
          self.$("#clientName").val(self.model.get("client_name"));
        }
      },
      onDelete: function(){
        self.$("#btnFillFromOrder").addClass("disabled");
      },
      resultsFormatter:function(item){
        item['number'] = ''+item['number'];
        item['cont']="";
        return '<li><p>' + item.number + '</p></li>';
      }
    });
    if(this.model.get('orders')){
      for(var i=0;i<this.model.get('orders').length;++i){
        this.$("#claimNumber").tokenInput('add',{'_id':this.model.get('orders')[i]['_id'],number:this.model.get('orders')[i]['number'], 'have_access': true});
      }
    }

    //if(this.model.get("order_id"))
    //    this.$("#claimNumber").tokenInput('add',{'_id':this.model.get("order_id"),number:this.model.get("order_number").toString(), 'have_access': true});
    this.$("#clientName").autocomplete({
      serviceUrl:'/handlers/contracts/clientfind/',
      paramName:"q",
      ajaxSettings:{
        type:"POST",
        dataType:"json"
      },
      transformResult:function(response, originalQuery){
        var sugglist = [];
        for(var i in response.result){
          sugglist.push({'value':response.result[i].name,'data':response.result[i]});
        }
        return {'suggestions':sugglist};
      },
      formatResult:function(suggestion, currentValue){
        var pattern = '(' + currentValue.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&") + ')';
        var html = '<span class="ttl">'+suggestion.data.name.replace(new RegExp(pattern, 'gi'), '<strong>$1<\/strong>')+'</span><span class="cont">'+suggestion.data.cont+"</span>";
        return html;
      },
      onSelect:function(item){
        self.model.set("client_id",item.data.id);
        self.model.set("client_name",item.data.name);
        //alert(item);
      }
    }).on("focusin",function(){
      //self.model.set("client_id",null);
      //self.model.set("client_name",null);
    }).on("focusout",function(){
      if(self.model.get('client_name')!=$(this).val()){
        self.model.set("client_id",null);
        self.model.set("client_name",null);
      }
      if(!self.model.get("client_id")){
        $(this).val("");
      }
    });
    this.productions = new App.Views.ProductTableView({model:this.model});
    this.payments = new App.Views.PaymentsFormView({model:this.model});
    if(App.Models.CurrentContract.get("_id") && !App.Models.CurrentContract.get("parent_id"))// && ((this.model.get('is_draft') && this.model.get('is_contract_signed') && !this.model.get('is_edited')) || (!this.model.get('is_draft') && this.model.get('is_signed')=='yes') ) )
      this.addcontracts = new App.Views.AdditionalContracts({model:App.Models.CurrentContract});

    // связанные договоры(по заявкам)

    this.linked_contracts = new App.Views.LinkedContracts({model:App.Models.CurrentContract});

    // Панель документов по договору. Показываем только для уже сохраненных основных договоров
     /*&& !App.Models.CurrentContract.get("parent_id")*/
    // && (this.model.get('is_draft'))
    if(App.Models.CurrentContract.get("_id") && (App.Models.CurrentContract.get('documents') && App.Models.CurrentContract.get('documents')['google_folder_id'] ))
      this.linked_files = new App.Views.LinkedFiles({model:App.Models.CurrentContract});
    else
      new App.Views.LinkedFiles({model:null});

    this.$("#products-list").append(this.productions.$el);
    this.listenTo(this.model, 'change reset add remove', this.resetCost);
    this.listenTo(this.model.get("payments"), 'change reset add remove', this.resetCost);

    // подписант
    var el = this.$("#clientSignator");
    $(el).clientFinder({
      url:'/handlers/clientnamefind/?q=%QUERY',
      onSelect: function(cln){
        el.data("id",cln['id']);
        el.val(cln['name']);
      },
      formatTemplate:function(data){
        return '<div data-id="' + data.id + '" class="tt-suggestion tt-selectable">'+data.name+ '</div>';
      }
    });

    $(el).on("blur",function(){
      if(!el.data('id'))
        el.val("");
    });
    $(el).on('keydown',function(){
      el.data("id",null);
    });

    this.delegateEvents();
    this.resetCost();
    if(this.model.get('is_draft'))
    {
      this.errors_view = new DraftErrorsList({model:this.model});
      this.$el.find('.main-info').before(this.errors_view.$el);
      this.errors_view.render();
    }
  },
  // удалить позицию из платежей
  RemovePaymentsByPosition:function(positionElem){
    var self = this;
    this.model.get('payments').each(function(item){
      if(positionElem.get('product_type')=='service'){
        if(item.get('by_service')){
          var n_servies = [];
          var is_del = false;
          for(var i=0;i<item.get('services').length;++i){
            if(item.get('services')[i]['service_id']!=positionElem.get('_id')){
              n_servies.push(item.get('services')[i]);
            }else
              is_del= true;
          }
          if(is_del){
            if(n_servies.length==0){
              /*var comments = item.get('comments');
              comments.push({
                '_id': 'new',
                'date_add': moment.utc().format("YYYY-MM-DDTHH:mm:ss"),
                'user_email': MANAGER,
                'comment': 'удалён на основании ДС',
                'on_base':true
              }); */
              App.addChangeHistory(self.model, {'object_type':'payment', 'operation':'delete', 'object_id':item.get('_id')});
              item.set("is_canceled",true);
            }else
            {
              /*var comments = item.get('comments');
              comments.push({
                '_id': 'new',
                'date_add': moment.utc().format("YYYY-MM-DDTHH:mm:ss"),
                'user_email': MANAGER,
                'comment': 'изменён на основании ДС',
                'on_base':true
              }); */
              App.addChangeHistory(self.model, {'object_type':'payment', 'operation':'edit', 'object_id':item.get('_id')});
              item.set('services',n_servies);
            }
          }
        }
      }else
      {
        if(item.get('by_production')){
          var n_units = [];
          var is_del = false;
          for(var i=0;i<item.get('units').length;++i){
            if(item.get('units')[i]['production_id']!=positionElem.get('_id')){
              n_units = item.get('units')[i];
            }else
              is_del = true;
          }
          if(is_del){
            if(n_units.length==0){
               /* var comments = item.get('comments');
              comments.push({
                '_id': 'new',
                'date_add': moment.utc().format("YYYY-MM-DDTHH:mm:ss"),
                'user_email': MANAGER,
                'comment': 'удалён на основании ДС',
                'on_base':true
              }); */
              App.addChangeHistory(self.model, {'object_type':'payment', 'operation':'delete', 'object_id':item.get('_id')});
              item.set("is_canceled",true);
              //item.set("canceled_base","");
            }else
            {
              /*var comments = item.get('comments');
              comments.push({
                '_id': 'new',
                'date_add': moment.utc().format("YYYY-MM-DDTHH:mm:ss"),
                'user_email': MANAGER,
                'comment': 'изменён на основании ДС',
                'on_base':true
              }); */
              App.addChangeHistory(self.model, {'object_type':'payment', 'operation':'edit', 'object_id':item.get('_id')});
              item.set('units',n_units);
            }
          }
        }
      }
      //console.log(item);
    });
  },
  onDraftClearTabChecked:function(e,d){
    if($(e.currentTarget).data('type')=='draft'){
      this.model = App.Models.CurrentContract.get('draft');
      this.render();
    }else
    if($(e.currentTarget).data('type')=='clear')
    {
      this.fillDataModel();
      this.model = App.Models.CurrentContract;
      this.render();
    }else
    {
      if(this.model.get('is_draft'))
        this.fillDataModel();
      $(".contract-mcontainer").addClass('hide');
      $(".contract-globalhistory-continer").removeClass('hide');
      new GlobalHistoryView({'model':App.Models.CurrentContract.get('draft')});
    }
  },
  resetCost:function(){
    //if(this.model.get("is_signed")!="yes"){
      var pays = App.calcPayments(this.model);
      var costs = App.calcCost(this.model);
      var full_cost = costs.full;
      var full_pays = pays.full;

      //for(var i in costs)
      //    full_cost+=costs[i];
      //for(var i in pays)
      //    full_pays+=pays[i];

      /*var have_signed_contract_file = false;
      if (this.model.get('documents') && this.model.get('documents')['items'] && this.model.get('documents')['items'].length>0)
      {
        for(var i in this.model.get('documents')['items'])
        {
          var document = this.model.get('documents')['items'][i];
          if(document['type'] == 'signed_contract')
          {
            have_signed_contract_file = true;
            break;
          }
        }
      }

      if(this.model.get('is_signed')!='yes'){
        this.$("#customerIdSigned").prop("disabled",false);
        if((Routine.roundToHundredths(full_cost)>Routine.roundToHundredths(full_pays) || full_cost==0) ||
          (!have_signed_contract_file && !this.model.get('parent_id') ))
        {
          //this.$("#customerIdSigned").prop("checked",false);
          this.$("#customerIdSigned").prop("disabled",true);
        }
      }*/
      /*else
        if(!this.$("#customerIdSigned").is(":checked"))
          this.$("#customerIdSigned").prop("disabled",false);*/
    //}
  },
  onFillFromOrder:function(e){
    var items = this.$("#claimNumber").tokenInput("get");
    //if(items.length>0){
    var ord_list = [];
    for(var i=0;i<items.length;++i){
      if (items[i]['have_access']){
        ord_list.push(items[i]["_id"]);
      }else{
        Routine.showMessage('Нет доступа к заявке №'+items[i]['number'], 'error');
      }
    }

    if(ord_list.length>0){
      Routine.showLoader();
      var self = this;
      $.ajax({
        url: '/handlers/order_list/'+ord_list.join(','),
        type: 'GET',
        dataType: 'json',
        contentType: "application/json; charset=utf-8",
        timeout: 35000,
        success: function (result, textStatus, jqXHR) {
          Routine.hideLoader();
          if(result.length>0){
          self.$("#clientName").val(result[0].client);
          self.model.set("total_address",result[0].total_address,{silent: true});
          self.model.set("total_shef_montaz",result[0].total_shef_montaz,{silent: true});
          self.model.set("is_tender",result[0].is_tender,{silent: true});
          self.model.set("client_name", result[0].client,{silent: true});
          self.model.set("client_id", result[0].client_id,{silent: true});
          }
          var full_delivery = 0;
          var full_montaz = 0;
          var prod_list = [];//result.products;
          for(var i=0;i<result.length;++i){
          full_delivery+=result[i].total_delivery ||0;
          full_montaz+=result[i].total_montaz || 0;


          _.each(result[i].products,function(item){
            item['_id'] = '';
            item['target'] = item['name'];
            item['name'] = item["type"]+' '+item['target']+' '+(item['length']?item['length']:'-')+'x'+(item['width']?item['width']:'-')+'x'+(item['height']?item['height']:'-');
            item['square'] = item['sq'];

            if(item['is_complect'] && !item['complect_count'])
            {
              item['complect_count'] = item['count'];
              item['count'] = 1;
            }

            delete item['sq'];
            prod_list.push(item);
          },self);

          var services_list = result[i].services;
          _.each(services_list, function(item){
            item['_id'] = '';
            item['service_units'] = item['units'] || [];
            item['units'] = [];
            item['product_type'] = 'service';
            item['count'] = 1;
            prod_list.push(item);
          });
          }
          self.model.set("delivery_price", full_delivery,{silent: true});
          self.model.set("montaz_price", full_montaz,{silent: true});
          //self.model.set({'services':new ServiceCollection(services_list)},{silent: true});

          self.model.set({'productions':new ProductCollection(prod_list)},{silent: true});
          self.model.get('productions').each(function(item){
          App.addChangeHistory(self.model, {'object_type':'production', 'operation':'create', 'object_id':item.get('_id')});
          });
          self.productions.render();
        }
      }).fail(function(jqXHR, textStatus, errorThrown ) {
        $.jGrowl('Ошибка сервера:' + errorThrown, { 'themeState':'growl-error', 'sticky':false, life: 10000 });
        Routine.hideLoader();
      });
    }
  },
  onShowHideAdditionalNumber:function(e){
    if(this.$(".contract-add-number-form").hasClass("shown"))
      this.$(".contract-add-number-form").removeClass("shown");
    else
      this.$(".contract-add-number-form").addClass("shown");
  },
  onSignChanged:function(){
    if(this.$("#customerIdSigned").is(":checked")){
      this.model.set("is_signed","yes");
      this.$("#customerDateSign, #contractFinishDate").prop("disabled",false);
      this.$('.conduct-full-data').show();
    }else{
      this.model.set("is_signed","no");
      this.$("#customerDateSign, #contractFinishDate").prop("disabled",true).val("");
      this.$('.conduct-full-data').hide();
    }
  },
  onContractCancel:function(){
    var self = this;
    var dlg = new ConfirmCancelationForm({el:$("#position-modal-container")});
    dlg.OnConfirm = function(confirm_text){
      Routine.showLoader();
        $.ajax({
          url: '/handlers/contracts/cancel_contract',
          type: 'POST',
          dataType: 'json',
          data:{contract_id:self.model.get("_id"), 'cancel_reason':confirm_text},
          contentType: "application/json; charset=utf-8",
          timeout: 35000,
          success: function (result, textStatus, jqXHR) {
            Routine.hideLoader();
            $.jGrowl('Договор расторгнут.', { 'themeState':'growl-success', 'sticky':false, life: 5000 });
            self.model.set("is_canceled",true);
            self.model.set("cancel_date", new Date());
            self.model.set('cancel_reason', confirm_text)
            self.render();
          }
        }).fail(function(jqXHR, textStatus, errorThrown ) {
          $.jGrowl('Ошибка сервера:' + errorThrown, { 'themeState':'growl-error', 'sticky':false, life: 10000 });
          Routine.hideLoader();
        });
    };
    dlg.show();
  },
  cancelSaveData:function(){
    if(this.model.get("number")){
      if(this.model.get("parent_number"))
        App.Views.Main.Search(this.model.get("number"),this.model.get("parent_number"));
      else
        App.Views.Main.Search(this.model.get("number"));
    }
    else{
      if(this.model.get("parent_id"))
        App.Views.Main.NewAdditional(this.model.get("parent_id"));
      else
        App.Views.Main.OnNew();
    }
  },
  calcPays:function(){
    var res = {montaz:0, cost:0,service:0, full: 0,  has_full_contract_payment: false  };
    this.model.get("payments").each(function(item){
      if(!item.get('is_canceled')){
        res.full+=item.get("size");
        if(!item.get("is_canceled")){
          if(item.get("payment_use").code==2)
            res.montaz+=item.get("size");
          if(item.get("payment_use").code==1)
            res.cost+=item.get("size");
          if(item.get("payment_use").code==3)
            res.service+=item.get("size");
          if(item.get("payment_use").code==4)
            res.has_full_contract_payment+=true;
        }
      }
    },this);
    return App.removeLowerValues(res);
  },
  editOnBase:function(){
    var add_contracts = this.model.get('additional_contracts') || [];
    var base_addon = null;
    add_contracts.map(function(addon){
      if(addon.is_signed!='yes'){
        var is_find = false;
        (App.Models.CurrentContract.get('edit_history') || []).map(function(hist){
          if(hist.additional_id==addon['_id'])
          {
            is_find = true;
          }
        });
        if(!is_find){
          base_addon = addon;
          return false;
        }
      }
    });



    if(!base_addon){
      Routine.showMessage('Для редактирования договора необходимо добавить доп. соглашение.','error');
    }else{
      if(!this.model.get('is_edited')){
         // this.model.set('is_signed','no');
        this.model.set('is_edited',true);
        this.model.set('base_additional', base_addon);
        Routine.showMessage("Продукция и платежи открыты на редактрование","success");
      }else
      {
        App.Views.Main.Search(this.model.get('number'));
        //this.model.set('is_signed','yes');
        //this.model.set('is_edited',);
      }
      this.render();
    }
  },
  checkBeforeSave:function(){
    var res_errors =[];
    if(this.model.get('is_edited')){
      /*if(!this.$("#ddlEditedAdditionalContract").val()){
        res_errors.push('Укажите № доп. соглашения, на основании которого редактируется договор.');
         //$.jGrowl('Укажите № доп. соглашения, на основании которого редактируется договор.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
         //if(!is_draft) return false;
      }

      if(this.model.get('edit_history')){
        for(var i=0;i<this.model.get('edit_history').length;++i){
          if(this.model.get('edit_history')[i].additional_id==this.$("#ddlEditedAdditionalContract").val()){
            res_errors.push('Доп. соглашение №'+this.$("#ddlEditedAdditionalContract").find("option:selected").data('number')+" подписано и проведено. Редактирование на его основании невозможно.");
            break;
          }
        }
      } */

      if(!this.$("#tbEditedComment").val()){
        res_errors.push('Необходимо в поле "комментарий" описать причину изменения договора.');
        //$.jGrowl('Необходимо в поле "комментарий" описать причину изменения договора.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
        //if(!is_draft) return false;
      }
      if(this.model.get('is_signed')!='yes'){
        res_errors.push('Необходимо подписать договор.');
        //$.jGrowl('Необходимо подписать договор.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
        //if(!is_draft) return false;
      }
    }

    var items = this.$("#claimNumber").tokenInput("get");
    for(var i=0;i<items.length;++i){
      if (items[i]['have_access'] == false){
        res_errors.push('Нет доступа к заявке №'+items[i].number+'.');
      }
    }

    /*if(items.length>0){
      if (items[0]['have_access'] == false){
        res_errors.push('Нет доступа к заявке.');
         //Routine.showMessage('Нет доступа к заявке', 'error');
         //if(!is_draft) return false;
      }
    }*/
    if(!App.glHasAccess || !this.model.get("_id")){
      if(!this.model.get("parent_id") && !this.$("#claimNumber").tokenInput("get").length)
      {
        res_errors.push('Укажите номер заявки.');
        //$.jGrowl('Укажите номер заявки.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
        //if(!is_draft) return false;
      }
    }
    if(!this.$("#contractDate").val())
    {
      res_errors.push('Укажите дату договора.');
      //$.jGrowl('Укажите дату договора.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      //if(!is_draft) return false;
    }
    if(!Routine.parseDate(this.$("#contractDate").val(),"dd.mm.yyyy")){
      res_errors.push('Дата договора указана неверно.');
      //$.jGrowl('Дата договора указана неверно.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      //if(!is_draft) return false;
    }
    if(this.model.get("orders") && this.model.get('orders').length>0 && !this.model.get("client_id")){
      res_errors.push('Укажите заказчика.');
      //$.jGrowl('Укажите заказчика.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      //if(!is_draft) return false;
    }
    if(!this.model.get("parent_id") && !this.$("#clientSignator").val()){
      res_errors.push('Укажите подписанта.');
      //$.jGrowl('Укажите подписанта.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      //if(!is_draft) return false;
    }
    var costs = App.calcCost(this.model);
    var pays = this.calcPays();
    if(this.$("#customerIdSigned").is(":checked")){
      // подсчет списка реальной продукции
      var prod_count = 0;
      this.model.get("productions").each(function(item){
        if(item.get('product_type')!='full_contract')
          prod_count++;
      });


      if(!this.model.get('is_parent')){
        var have_signed_contract_file = false;
        if (App.Models.CurrentContract.get('documents') && App.Models.CurrentContract.get('documents')['items'] && App.Models.CurrentContract.get('documents')['items'].length>0)
        {
          for(var i in App.Models.CurrentContract.get('documents')['items'])
          {
            var document = App.Models.CurrentContract.get('documents')['items'][i];
            if(document['type'] == 'signed_contract')
            {
              have_signed_contract_file = true;
              break;
            }
          }
        }
        if(!have_signed_contract_file)
          res_errors.push('Договор можно подписать только после загрузки файла-договора.');
      }



      if(costs.full!=pays.full){
        res_errors.push('Договор можно подписать только после добаления платежей на всю сумму договора.');
        //$.jGrowl('Договор можно подписать только после добаления платежей на всю сумму договора.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
        //if(!is_draft) return false;
      }

      if(!this.$("#customerDateSign").val() || !Routine.parseDate(this.$("#customerDateSign").val(),"dd.mm.yyyy")){
        res_errors.push('Укажите дату подписания договора.');
        //$.jGrowl('Укажите дату подписания договора.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
        //if(!is_draft) return false;
      }
      if((prod_count>0 || !this.model.get("parent_id")) &&  (!this.$("#contractFinishDate").val() || !Routine.parseDate(this.$("#contractFinishDate").val(),"dd.mm.yyyy"))){
        res_errors.push('Не указан крайний срок исполнения договора.');
        //$.jGrowl('Не указан крайний срок исполнения договора.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
        //if(!is_draft) return false;
      }
      if(!this.$("#contractFactory option:selected").text()){
        res_errors.push('Укажите завод.');
        //$.jGrowl('Укажите завод.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
        //if(!is_draft) return false;
      }



      //if(this.model.get("productions").length<=0 && this.model.get("services").length<=0){
      if(!this.model.get("parent_id") && prod_count==0){
        res_errors.push('Необходимо заполнить список продукции.');
        //$.jGrowl('Необходимо заполнить список продукции.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
        //if(!is_draft) return false;
      }
      if((prod_count>0 || !this.model.get("parent_id")) &&  this.model.get("payments").length<=0){
        res_errors.push('Необходимо добавить платежи.');
        //$.jGrowl('Необходимо добавить платежи.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
        //if(!is_draft) return false;
      }


      //#962
      // если был платеж по всему догоыору, то по отдельности платежи не проверям
      if(pays.has_full_contract_payment)
      {
        if(costs.full<pays.full){
          res_errors.push('Суммарные платежи по договору превышают суммарную стоимость договора.');
          //$.jGrowl('Суммарные платежи по договору превышают суммарную стоимость договора.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
          //if(!is_draft) return false;
        }
      }
      else
      {
        if(costs.cost<pays.cost){
          res_errors.push('Суммарные платежи за товар превышают суммарную стоимость товара.');
          //$.jGrowl('Суммарные платежи за товар превышают суммарную стоимость товара.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
          //if(!is_draft) return false;
        }
        if(costs.montaz<pays.montaz){
          res_errors.push('Суммарные платежи за монтаж превышают суммарную стоимость монтажа.');
          //$.jGrowl('Суммарные платежи за монтаж превышают суммарную стоимость монтажа.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
          //if(!is_draft) return false;
        }
        if(costs.service<pays.service){
          res_errors.push('Суммарные платежи за услуги превышают суммарную стоимость услуг.');
          //$.jGrowl('Суммарные платежи за услуги превышают суммарную стоимость услуг.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
          //if(!is_draft) return false;
        }
      }

    }
    if(this.model.get("payments").length>0 && !this.$("#contractFactory  option:selected").text()){
      res_errors.push('Чтобы создавать платежи, необходимо указать завод.');
      //$.jGrowl('Чтобы создавать платежи, необходимо указать завод.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      //if(!is_draft) return false;
    }



    var self = this;
    // сообщаем об ошибке, если создан платеж на продукцию или услугу, которые удалили
    var err_msg = "";
    this.model.get("payments").forEach(function(item){
      if(item.get('is_canceled')!=true){
        if(item.get("payment_use").code!=3){
          if(item.get("by_production")){
            _.each(item.get("units"),function(u){
              var is_find = false;
              self.model.get("productions").forEach(function(prod){
                if(!prod.get('product_type') && prod.get("_id")==u.production_id){
                  if(prod.get("count")<u.unit_number){
                    res_errors.push('В платежах участвуют единицы продукции, которые были удалены. Пересохраните платежи.'+(item.get('number')?(' Платеж №'+item.get('number')):''));
                  }
                  is_find =true;
                }
              });
              if(!is_find){
                res_errors.push('В платежах участвуют продукции, которые были удалены. Пересохраните платежи.'+(item.get('number')?(' Платеж №'+item.get('number')):''));
              }
            });
            /*if(err_msg){
              $.jGrowl(err_msg, { 'themeState':'growl-error', 'sticky':false, life: 10000 });
              if(!is_draft) return false;
            }*/
          }
        }else
        {
          if(item.get("by_service")){
            _.each(item.get("services"),function(s){
              var is_find = false;
              self.model.get("productions").forEach(function(prod){
                if(prod.get('product_type')=='service' && prod.get("_id")==s['service_id']){
                  is_find = true;
                }
              });



  /*                            self.model.get("services").forEach(function(sv){
                if(sv.get("_id")==s['service_id']){
                  is_find = true;
                }
              }); */
              if(!is_find){
                res_errors.push('В платежах участвуют услуги, которые были удалены. Пересохраните платежи.'+(item.get('number')?(' Платеж №'+item.get('number')):''));
              }
            });
          }
          /*if(err_msg){
            $.jGrowl(err_msg, { 'themeState':'growl-error', 'sticky':false, life: 10000 });
            if(!is_draft) return false;
          } */
        }
      }
    });
     /* if(err_msg)
      if(!is_draft) return false;*/


    //для Калуги проверяем платежи на смешанные единицы продукции
    // на основании таска 1020 проверяет это у всех
    //if($("#contractFactory").val()==App.factories['KALUGA']){
    err_msg = "";
    self.model.get("payments").each(function(item){
      if(item.get('by_production')){
        var prod_id = null;
        for(var u in item.get('units')){
          if(!prod_id)
            prod_id = item.get('units')[u]['production_id'];
          else
          {
            if(prod_id!=item.get('units')[u]['production_id'])
            {
              res_errors.push("В договоре присутствуют платежи по смешанным единицам продукции. Проверьте платежи и пересохраните договор.");
            }
          }
        }
        if(!err_msg){
          // проверяем, чтобы количество единиц продукции было либо 1, либо все единицы одной продукции
          self.model.get("productions").forEach(function(prod){
            if(prod.get('_id')==prod_id){
              if(item.get('units').length>1 && prod.get('count')!=item.get('units').length){
                res_errors.push("В договоре присутствуют платежи по смешанным единицам продукции. Проверьте платежи и пересохраните договор.");
              }
            }
          });
        }
      }else
      if(item.get('by_services') && item.get('services').length!=1){
        res_errors.push("В договоре присутствуют платежи по смешанным доп. позициям. Проверьте платежи и пересохраните договор.");
      }
      //console.log(item);
    });
    // проверяем, нет ли пересекающихся платежей
    // на основании таска №1144 пересекающиеся платежи могут быть, на них создаются разные наряды
    //if(!err_msg){
    /*for(var i=0;i<self.model.get("payments").length && !err_msg;++i){
      var pay1 = self.model.get("payments").models[i];
      for(var j=i+1;j<self.model.get("payments").length;++j){
        var pay2 = self.model.get("payments").models[j];
        if(pay1.get('payment_type')._id==pay2.get('payment_type')._id && pay1.get('payment_use').code==pay2.get('payment_use').code)
        {
          // если оба по всем продукциям или всем услугам договора, то это ошибка
          // иначе необходимо проверить, на различие продукций и услуг в платежах
          if((pay1.get('by_production')==false && pay2.get('by_production')==false) && (pay1.get('by_service')==false && pay2.get('by_service')==false) )
          {
            res_errors.push("Платежи "+(i+1)+" и "+(j+1)+" имеют одинаковые параметры.");
            //break;
          }
          else
          {
            if(pay1.get('units').length==pay2.get('units').length && pay1.get('units').length>0)
            {
              if(pay1.get('units').length==1)
              {
                if(
                  (pay1.get('units')[0].production_id==pay2.get('units')[0].production_id && pay1.get('units')[0].unit_number==pay2.get('units')[0].unit_number)
                )
                {
                  res_errors.push("Платежи "+(i+1)+" и "+(j+1)+" имеют одинаковые параметры.");
                  //break;
                }
              }
              else if(pay1.get('units')[0].production_id==pay2.get('units')[0].production_id)
              {
                res_errors.push("Платежи "+(i+1)+" и "+(j+1)+" имеют одинаковые параметры.");
                //break;
              }
            }
          }
        }
      }
    }*/
    // убираем повторяющиеся сообщения
    var r_elems= [];
    for(var i=0;i<res_errors.length;++i){
      var is_find = false;
      for(var j=0;j<r_elems.length;++j){
        if(r_elems[j]==res_errors[i]){
          is_find = true;
          break;
        }
      }
      if(!is_find)
        r_elems.push(res_errors[i]);
    }

    return r_elems;
  },

  fillDataModel:function(){
    var costs = App.calcCost(this.model);
    var pays = this.calcPays();
    if(this.$("#claimNumber").tokenInput("get").length){
      var orders = [];
      for(var i=0;i<this.$("#claimNumber").tokenInput("get").length;++i){
        var is_find = false;
        for(var k=0;k<orders.length;++k)
        {
          if(orders[k].number==this.$("#claimNumber").tokenInput("get")[i]['number'])
            is_find = true;
        }
        if(!is_find)
          orders.push({'number':this.$("#claimNumber").tokenInput("get")[i]['number'], '_id':this.$("#claimNumber").tokenInput("get")[i]['_id'] })
      }
      this.model.set('orders',orders);
    }else
    {
      this.model.set('orders',[]);
      //this.model.set("order_number",'');
      //this.model.set("order_id",'');
    }
    var puses = [];
    for(var i in  App.Models["PaymentUses"])
    {
      if(App.Models["PaymentUses"][i].code==1 && costs.cost>0){
        puses.push({'price':costs.cost, 'payment_use':App.Models["PaymentUses"][i]});
      }else
      if(App.Models["PaymentUses"][i].code==2 && costs.montaz>0){
        puses.push({'price':costs.montaz, 'payment_use':App.Models["PaymentUses"][i]});
      }
      else
      if(App.Models["PaymentUses"][i].code==3 && costs.service>0){
        puses.push({'price':costs.service, 'payment_use':App.Models["PaymentUses"][i]});
      }
    }
    this.model.set("client_signator", this.$("#clientSignator").val(),{silent: true})
    this.model.set("client_signator_id",this.$("#clientSignator").data("id"),{silent: true});
    this.model.set("payment_uses",puses,{silent: true});

    this.model.set("date_add", Routine.parseDate(this.$("#contractDate").val()),{silent: true});
     // console.log(this.model.get("date_add").toJSON());
    this.productions.saveData();
    this.model.set("sign_date",this.$("#customerDateSign").val()?Routine.parseDate(this.$("#customerDateSign").val(),"dd.mm.yyyy"):"",{silent: true});
    this.model.set("factory",this.$("#contractFactory  option:selected").text(),{silent: true});
    this.model.set("factory_id",this.$("#contractFactory").val(),{silent: true});
    this.model.set("deadline",this.$("#contractFinishDate").val()?Routine.parseDate(this.$("#contractFinishDate").val(),"dd.mm.yyyy"):"",{silent: true});
    this.model.set("note",this.$("#contractNote").val(),{silent: true});
    this.model.set("customer_number", this.$("#contractCustomerNumber").val(),{silent: true});

    var order_positions = [];
    var old_positions = this.model.get('order_positions');
    $(".order-positions input:checked").each(function(){
      order_positions.push($(this).data('id'));
    });
    var is_changed = false;
    if((old_positions || []).length!=order_positions.length)
      is_changed = true;
    else{
      var old_sort = old_positions.sort();
      var new_sort = order_positions.sort();
      for(var i=0;i<new_sort.length;++i){
        if(old_sort[i]!=new_sort[i]){
          is_changed = true;
          break;
        }
      }
    }

    this.model.set('order_positions',order_positions);

    if(this.model.get('is_edited')){
      if(is_changed){
        App.addChangeHistory(this.model, {"object_type":"order_positions", "object_id":"order_positions", "operation":"edit", "more":{ "old":old_positions, 'new':order_positions }});
      }
      this.model.set('edited_comment', this.$("#tbEditedComment").val());
    }
  },

  saveFullData:function(){
    if(!this.model.get("parent_id") && (!this.model.get('markup') || this.model.get('markup')===0))
    {
      alert('Необходимо заполнить наценку.')
      return;
    }

    if(this.model.get('is_draft')){
      this.model.set('errors',this.checkBeforeSave());
      this.errors_view.render();
      this.fillDataModel();
      var self = this;


      Routine.showLoader();
      $.ajax({
        type: "PUT",
        url: "/handlers/contracts/save_draft",
        data: JSON.stringify(App.Models.CurrentContract.toJSON()),
        timeout: 55000,
        contentType: 'application/json',
        dataType: 'json',
        async:true
       }).done(function(result) {
          if(result['status']=="error")
            $.jGrowl('Ошибка сохранени. Подробности: ' + result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 5000 });
          else
          {
             $.jGrowl('Данные успешно сохранены.', { 'themeState':'growl-success', 'sticky':false, life: 5000 });
             App.Views.Main.Search(result["number"], result["parent_number"]);
          }
       }).error(function(){
        $.jGrowl('Ошибка сохранения. Повторите попытку. ', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
       }).always(function(){Routine.hideLoader();});
    }
  },

  checkParentConduction:function(resultFunction){
    var self = this;
    Routine.showLoader();
    $.ajax({
      url: '/handlers/contracts/search_contract',
      type: 'GET',
      dataType: 'json',
      contentType: "application/json; charset=utf-8",
      data: {'num':self.model.get('parent_number')},
      timeout: 35000,
      success: function (result, textStatus, jqXHR) {
          Routine.hideLoader();
          if(result.status=='error'){
          $.jGrowl(result.msg, { 'themeState':'growl-error', 'sticky':false, life: 10000 });
          resultFunction(false,null);
          }else
          if(result.status=="ok"){
          var mContract = new App.Models.ContractModel(result.contract);
          var mDraft = mContract.get('draft');
          // если договор не радектируется на основании этого ДС, то выдаем ошибку
          if(mDraft.get('base_additional') && mDraft.get('base_additional')['_id']==App.Models.CurrentContract.get('_id')){
            // проверка родительсого договора на ошибки
            if(mDraft.get('errors') && mDraft.get('errors').length>0){
              $.jGrowl('Основной договор содержит ошибки. Необходимо исправить ошибки основного договора и повторить попытку проводки дополнительного соглашения.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
            }else{
              // заполнить edit_history
              if(mDraft.get('is_edited')){
                mDraft.set('is_edited',false);
                var his = mDraft.get('edit_history') || [];
                his.push({'additional_id':mDraft.get('base_additional')['_id'], 'additional_number': mDraft.get('base_additional')['number'], 'comment': mDraft.get('edited_comment')});
                mDraft.set('edit_history',his);
              }
              // сливаем черновик и чистовик основного договора
              var clear = self.applyDraft(mContract, mDraft);
              Routine.showLoader();
              $.ajax({
                type: "POST",
                url: "/handlers/contracts/save_contract",
                data: JSON.stringify(clear),
                timeout: 55000,
                contentType: 'application/json',
                dataType: 'json',
                async:true
               }).done(function(result) {
                  Routine.hideLoader();
                  if(result['status']=="error"){
                    $.jGrowl('Ошибка сохранени. Подробности: ' + result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                    resultFunction(false,null);
                  }
                  else
                  {
                    resultFunction(true,result.contract);
                  }
               }).error(function(){
                Routine.hideLoader();
                $.jGrowl('Ошибка сохранения. Повторите попытку. ', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                resultFunction(false,null);
               });

              //console.log(clear);
            }
          }else
            $.jGrowl('Необходимо, чтобы договор редактировался на основании этот ДС', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
            //resultFunction(true,result.contract);
          }else
          $.jGrowl('Ошибка сервера', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      }
    }).fail(function(jqXHR, textStatus, errorThrown ) {
      $.jGrowl('Ошибка сервера:' + errorThrown, { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      resultFunction(false,null);
      Routine.hideLoader();
    });
  },

  applyDraft:function(contract, draft){
    // сливаем данные из черновика с чистовиком
      var clear = contract.toJSON();
      clear['orders'] = draft.get('orders');
      //clear['order_number'] = this.model.get('order_number');
      //clear['order_id'] = this.model.get('order_id');
      clear["client_signator"] = draft.get('client_signator');
      clear["client_signator_id"] = draft.get('client_signator_id');
      clear['client_id'] = draft.get('client_id');
      clear['client_name'] = draft.get('client_name');


      clear["total_address"] = draft.get("total_address");
      clear["goods_price"] = draft.get("goods_price");
      clear["markup"] = draft.get("markup");
      clear["montaz_price"] = draft.get("montaz_price");
      clear["delivery_price"] = draft.get("delivery_price");


      clear['customer_name'] = draft.get('customer_name');

      clear["payment_uses"] = draft.get('payment_uses');
      clear["date_add"] = draft.get('date_add');
      clear['productions'] = draft.get('productions').toJSON();

      clear["sign_date"] = draft.get('sign_date');
      clear["factory"] = draft.get('factory');
      clear["factory_id"] = draft.get('factory_id');
      clear["deadline"] = draft.get('deadline');
      clear["note"] = draft.get('note');
      clear["customer_number"] = draft.get('customer_number');

      clear['edit_history'] = draft.get('edit_history');
      clear['change_history'] = draft.get('change_history');


      clear["is_signed"] = draft.get('is_signed');
      clear["sign_date"] = draft.get('sign_date');

      clear["note"] = draft.get('note');
      clear["order_positions"] = draft.get('order_positions');

      // мержим платежи
      var pay_list = draft.get('payments').toJSON();
      for(var p1=0;p1<pay_list.length;++p1)
      {
        for(var p2=0;p2<clear['payments'].length;++p2){
          if(pay_list[p1]['_id']==clear['payments'].models[p2].get('_id')){
            pay_list[p1]['events'] = clear['payments'].models[p2].get('events');
            pay_list[p1]['work_order_number'] = clear['payments'].models[p2].get('work_order_number');
            pay_list[p1]['work_id'] = clear['payments'].models[p2].get('work_id');

            pay_list[p1]['date'] = clear['payments'].models[p2].get('date');
            pay_list[p1]['date_end'] = clear['payments'].models[p2].get('date_end');
            pay_list[p1]['period'] = clear['payments'].models[p2].get('period');
          }
        }
      }
      clear['payments'] = pay_list;
      clear['draft'] = JSON.stringify(clear['draft']);
      return clear;
  },


  conductFullData:function(){
    var updateDataFunc = function(dataClear){
      Routine.showLoader();
      $.ajax({
        type: "POST",
        url: "/handlers/contracts/save_contract",
        data: JSON.stringify(dataClear),
        timeout: 55000,
        contentType: 'application/json',
        dataType: 'json',
        async:true
       }).done(function(result) {
          if(result['status']=="error")
            $.jGrowl('Ошибка сохранени. Подробности: ' + result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 5000 });
          else
          {
             $.jGrowl('Данные успешно сохранены.', { 'themeState':'growl-success', 'sticky':false, life: 5000 });
             App.Views.Main.Search(result["number"], result["parent_number"]);
          }
       }).error(function(){
        $.jGrowl('Ошибка сохранения. Повторите попытку. ', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
       }).always(function(){Routine.hideLoader();});
    }


    if(this.model.get('is_draft')){
      this.model.set('errors',this.checkBeforeSave());


      this.fillDataModel();
      this.errors_view.render();
      if(this.model.get('errors').length>0){

        $.jGrowl("Устраните все ошибки договора и повторите попытку.", { 'themeState':'growl-error', 'sticky':false, life: 10000 });
        return;
      }

      if(this.model.get('is_edited')){
        this.model.set('is_edited',false);
        var his = this.model.get('edit_history') || [];
        his.push({'additional_id':this.model.get('base_additional')['_id'], 'additional_number': this.model.get('base_additional')['number'], 'comment':this.$("#tbEditedComment").val()});
        this.model.set('edit_history',his);
      }

      var clear = this.applyDraft(App.Models.CurrentContract,this.model);

      // для допника сначала проводим основной договор
      if(this.model.get('parent_id')){
        this.checkParentConduction(function(res,data){
          if(res){
            updateDataFunc(clear);
          }
        });
      }else
        updateDataFunc(clear)





      /*Routine.showLoader();
      var self=this;
      this.model.save(null,{success:function(){
        Routine.hideLoader();
        $.jGrowl('Данные успешно сохранены.', { 'themeState':'growl-success', 'sticky':false, life: 5000 });
        App.Views.Main.Search(self.model.get("number"), self.model.get("parent_number"));
      },error:function(e, response){
        console.log(response);
        Routine.hideLoader();
      }}); */
    }
  }
});


// cписок продукций
App.Views.ProductTableView = Backbone.View.extend({
  isnew:true,
  events:{
    'click .add-new-position': 'addNewPosition',
    'click .add-new-service': 'addNewService',
    'click .close-production': 'closeView',
    'change .total-montaz, .additional-cost, .total-delivery, .markup':'onTotalChange',
    'click .save-linked-products': 'onSaveLinkedProducts',
    'click .add-position-from-contract': 'addPositionFromContract',
    'click .add-position-from-order': 'addPositionFromOrder',
    //, 'click .save-and-close': 'saveAndClose'

  },
  initialize:function(){
    this.template = _.template($('#productTableTemplate').html());
    var self = this;
    this.render();
    this.listenTo(this.model, 'change reset add remove', this.render);

     /* if(!this.options.isnew){
      this.model.fetch({timeout:50000}).complete(function(){
        self.render();
        self.listenTo(self.model, 'change reset add remove', self.render);
      });
    }
    else{
      this.render();
      this.listenTo(this.model, 'change reset add remove', this.render);
    }*/
    //app_router.navigate('products');

  },
  render:function(){
     // console.log("render");
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
    var td = 0;
    var tm = 0;
    var appr = '';
    var serv_cost = 0;
    var serv_appr='';
    var self = this;
    var hc = this.model.get('productions');
    var i=1;

    _.each(hc.models, function (item)
    {
      //if(item.get('status')!='del')
      {
        if(!item.get('product_type')){
          //item.set('number',i);
          ++i;
          self.renderOne(item);
          if(item.get('status')!='del'){
            if (item.get('approx') == 'yes')
              appr = 'yes-approx';
            //var cnt = item.get("is_complect")?Routine.strToInt(item.get('complect_count')):Routine.strToInt(item.get('count'));// Routine.strToInt(item.get('count'));
            var cnt = item.get("is_complect")?Routine.strToInt(item.get('complect_count')||'0')||Routine.strToInt(item.get('count')||'0'):Routine.strToInt(item.get('count')||'0');
            tn += Routine.strToInt(item.get('count'));
            tp += cnt*Routine.strToFloat(item.get('price'));
            item.get("positions").each(function(ps){
              tm+=Routine.strToFloat(ps.get("mont_price")||0)*(ps.get("mont_price_type")?1:Routine.strToInt(ps.get('num')));
              td+=Routine.strToFloat(ps.get("delivery")||0);
            });
            ts += cnt*Routine.strToFloat(item.get('square'));
          }
        }else
        if(item.get('product_type')=='service'){
           //item.set('number',i);
          ++i;
          self.renderOneService(item);
          if(item.get('status')!='del'){
            serv_cost+=Routine.strToFloat(item.get("price") || 0);
            if (item.get('approx') == 'yes')
              appr = 'yes-approx';
          }
        }
      }
    }, this);

    this.$('.total-num').text(tn);

    this.$('.total-price-goods').text($.number( tp, 2, ',', ' ' )).addClass(appr);
    this.$('.total-price-delivery').text($.number( td, 2, ',', ' ' )).addClass(appr);
    this.$('.total-price-montag').text($.number( tm, 2, ',', ' ' )).addClass(appr);


    this.$('.total-price').text($.number( tp+tm+td, 2, ',', ' ' )).addClass(appr);
    this.$('.total-sq').text($.number( ts, 2, ',', ' ' ));

    /*var serv_cost = 0;
    appr = '';
    _.each(this.model.get('services').models, function (item) {
      self.renderOneService(item);
      serv_cost+=Routine.strToFloat(item.get("price") || 0);
      if (item.get('approx') == 'yes')
        appr = 'yes-approx';
    }, this); */
    this.$('.serv-total-price').text($.number( serv_cost, 2, ',', ' ' )).addClass(serv_appr);



    // if (this.model.get('closed') == 'yes'){
    //  this.$('.add-new-position').hide();
    //  this.$('.save-and-close').hide();
    // }
    this.$('.total-montaz, .total-delivery, .markup').numeric({ decimal: ',', negative: false,decimalPlaces:2 });
    this.$('.additional-cost').numeric({ decimal: ',', negative: false,decimalPlaces:2 });

    this.calcFullCost();
    /*if(!this.model.get('is_draft') || (this.model.get("is_signed")=="yes" && !this.model.get('is_edited')))// && !App.glHasAccess)
    //if(this.model.get('_id') && !App.glHasAccess)
    {
      this.$(":input").prop("disabled", true);
      //this.$('.show-position').removeClass("show-position").addClass("show-position-disabled");
    }*/
    return this;
  },

  calcFullCost:function(){
    var hc = this.model.get('productions');
    var tp = 0;
    var serv_cost = 0;
    //var full_montaz = Routine.strToInt( this.$('.total-montaz').val() || 0);
    _.each(hc.models, function (item) {
      if(item.get('status')!='del'){
        //var cnt = item.get("is_complect")?Routine.strToInt(item.get('complect_count')):Routine.strToInt(item.get('count'));
        if(!item.get('product_type')){
          var cnt = item.get("is_complect")?Routine.strToInt(item.get('complect_count')||'0')||Routine.strToInt(item.get('count')||'0'):Routine.strToInt(item.get('count')||'0');
          tp += cnt*Routine.strToFloat(item.get('price'));
          item.get("positions").each(function(ps){
            tp+=Routine.strToFloat(ps.get("mont_price")||0)*(ps.get("mont_price_type")?1:Routine.strToInt(ps.get('num')));
            tp+=Routine.strToFloat(ps.get("delivery")||0);
          });
        }else
        if(item.get('product_type')=='service'){
          serv_cost+=Routine.strToFloat(item.get("price") || 0);
        }
      }
    });

     /*_.each(this.model.get('services').models, function (item) {
      serv_cost+=Routine.strToFloat(item.get("price") || 0);
     });*/
    if(this.$('.total-montaz').val())
      tp+=Routine.strToFloat( this.$('.total-montaz').val());
    if(this.$('.additional-cost').val())
      tp+=Routine.strToFloat( this.$('.additional-cost').val());
    if(this.$('.total-delivery').val())
      tp+=Routine.strToFloat( this.$('.total-delivery').val());
    this.$(".total-money span").text($.number( tp+serv_cost, 2, ',', ' ' ));
  },

  onTotalChange:function(){
    this.model.set({"markup":Routine.strToFloat(this.$('.markup').val())},{silent: true});
    this.model.set({"total_address":this.$('.total-address').val()},{silent: true});
    this.model.set("goods_price",this.$('.additional-cost').val()?Routine.strToFloat($.number( this.$('.additional-cost').val(), 2, ',', '' )):'');
    this.model.set("montaz_price",this.$('.total-montaz').val()?Routine.strToFloat($.number( this.$('.total-montaz').val(), 2, ',', '' )):'');
    this.model.set("delivery_price",this.$('.total-delivery ').val()?Routine.strToFloat($.number( this.$('.total-delivery').val(), 2, ',', '' )):'');

    this.calcFullCost();
  },

  renderOne: function(item){
    var view = new ProductTableItemView({model: this.model, product:item});
    this.$(".products-table tbody").append(view.render().el);
    return view;
  },

  renderOneService:function(item){
    var view = new ServiceTableItemView({model: this.model, service:item});
    this.$(".services-table tbody").append(view.render().el);
    return view;
  },


  addNewPosition: function(){
    var pm = new ProductModel();
    // получение нового номера для продукции из глобального счетчика
    //pm.set('number', 10);
    // this.model.get('products').add(pm);
    var pf = new PositionFormView({el: $('#position-modal-container'), model: this.model, product:pm, isnew:true});
    pf.show();
  },
  saveData:function(){
    this.model.set({
      'total_address' : this.$('.total-address').val(),
      'total_shef_montaz' : this.$('.total-shef-montaz').is(':checked')?'yes':'no',
      'is_tender': this.$('.is-tender').val()
    });

    // var self = this;
/*            this.model.save().done(function(){
      // self.closeView();
    }); */
  },
  closeView:function(){
    this.close();
    eventBus.off('close', this.closeView, this);
  },
  close: function(){
    this.$el.hide().empty();
    this.undelegateEvents();
    this.$el.removeData().unbind();
  },
  show:function(){
    eventBus.on('close', this.closeView, this);
    this.$el.show();
  },
  addNewService:function(){
    //var pm = new ServiceModel();
    var pm = new ProductModel();
    var pf = new ServiceFormView({el: $('#position-modal-container'), model: this.model, service:pm, isnew:true});
    pf.show();
  },

  ///
  /// Обработка строки формата: номер договора,номер продукта
  ///
  parse_linked_product: function(val){
    val = Routine.trim(val);
    tmp = val.split('.');
    if(tmp.length<2 || !tmp[0] || !tmp[1] || !Routine.isDiggit(tmp[0]) || !Routine.isDiggit(tmp[1]))
      throw new SyntaxError("Неверный формат номера заказа.");
    return {'contract_number': tmp[0], 'product_number': tmp[1]};
  },

  onSaveLinkedProducts: function(e){
    var self = this;
    var id = $('.linked-products').data('id');
    var type = $('.linked-products').data('type');
    //var old_products = this.model.get('productions');
    var temp = $(".linked-products-list").val();
    if(!temp){
      $.jGrowl("Не задан номер заказа", { 'themeState':'growl-error', 'sticky':false, life: 5000 });
      return;
    }

    // обработка прилинкованной задачи
    var linked_product_obj = null;
    try
    {
      linked_product_obj = this.parse_linked_product(temp);
    }
    catch (err)
    {
      $.jGrowl(err.message, { 'themeState':'growl-error', 'sticky':false, life: 5000});
      return false;
    }
    // отправка запроса на сервер
    Routine.showLoader();
    $.ajax({
      type: "POST",
      url: "/handlers/contract/link_product",
      data: JSON.stringify({'linked_product':linked_product_obj, 'contract_id': this.model.get('_id'), 'current_product_id': id, 'type': type}),
      timeout: 35000,
      contentType: 'application/json',
      dataType: 'json',
      async:true
    }).done(function(result) {
        if(result['status']=="ok")
        {
          $.jGrowl('Данные успешно сохранены', { 'themeState':'growl-success', 'sticky':false, life: 5000});

          // поиск обновляемой продукции
          self.model.get("productions").forEach(function(item){
            if(item.get('_id').toString()==id)
              item.set('linked_production', result["data"]);
          });

          $('.linked-products').hide();
          $('.product-link').removeClass('selected');
          $("."+id).addClass('filled');
        }
        else
          $.jGrowl('Ошибка сохранения данных. Подробности: ' + result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 5000 });
    }).always(function(){Routine.hideLoader();});
  },

  ///
  /// Подгрузка позиций из договора
  ///
  addPositionFromContract: function(e){
    var self = this;
    // получение с сервера
    Routine.showLoader();
     $.ajax({
      url: '/handlers/contracts/search_contract',
      type: 'GET',
      dataType: 'json',
      contentType: "application/json; charset=utf-8",
      data: {'num':this.model.get('parent_number')},
      timeout: 35000,
      success: function (result, textStatus, jqXHR)
      {
          if(result.status=='error')
            $.jGrowl(result.msg, { 'themeState':'growl-error', 'sticky':false, life: 10000 });
          else if(result.status=="ok")
          {
            //  подготовка данных
            var model = new App.Models.ContractModel(result.contract);
            // отображение формы
            new ExternalPositionsFormView({el: $('#external-positions-modal-container'), model: model, parent_view: self, contract_model: self.model}).show();
          }
          else
          $.jGrowl('Ошибка сервера', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      }
    }).fail(function(jqXHR, textStatus, errorThrown ) {
      $.jGrowl('Ошибка сервера:' + errorThrown, { 'themeState':'growl-error', 'sticky':false, life: 10000 });
    }).always(function(){Routine.hideLoader();});
  },

  ///
  /// Подгрузка позиций из заявки
  ///
  addPositionFromOrder: function(e){
    var self = this;
    var items = $("#claimNumber").tokenInput("get");
    //if(items.length>0){
    var ord_list = [];
    for(var i=0;i<items.length;++i){
      if (items[i]['have_access']){
        ord_list.push(items[i]["_id"]);
      }else{
        Routine.showMessage('Нет доступа к заявке №'+items[i]['number'], 'error');
      }
    }


    if (ord_list.length)//(this.model.get('orders') && this.model.get('orders').length)
    {
      /*var ord_list = [];
      for(var i=0;i<this.model.get('orders').length;++i)
        ord_list.push(this.model.get('orders')[i]['_id']); */

      Routine.showLoader();
      $.ajax({
        url: '/handlers/order_list/'+ord_list.join(','),
        type: 'GET',
        dataType: 'json',
        contentType: "application/json; charset=utf-8",
        timeout: 35000,
        success: function (result, textStatus, jqXHR)
        {
          if(result.length>0){
            //  подготовка данных
            var model = new App.Models.ContractModel();
            /*model.set("total_address",result.total_address,{silent: true});
            model.set("total_shef_montaz",result.total_shef_montaz,{silent: true});
            model.set("is_tender",result.is_tender,{silent: true});
            model.set("client_name", result.client,{silent: true});
            model.set("client_id", result.client_id,{silent: true});
            model.set("delivery_price", result.total_delivery,{silent: true});
            model.set("montaz_price", result.total_montaz,{silent: true}); */
            // продукция
            var prod_list =[]; //result.products;
            for(var i=0;i<result.length;++i){
              _.each(result[i].products,function(item){
                item['_id']='';
                item['target'] = item['name'];
                item['name'] = item["type"]+' '+item['target']+' '+(item['length']?item['length']:'-')+'x'+(item['width']?item['width']:'-')+'x'+(item['height']?item['height']:'-');
                item['square'] = item['sq'];
                if(item['is_complect'] && !item['complect_count'])
                {
                  item['complect_count'] = item['count'];
                  item['count'] = 1;
                }
                delete item['sq'];
                prod_list.push(item);
              },self);
              // услуги
              var services_list = result[i].services;
              _.each(services_list, function(item){
                item['_id']='';
                item['service_units'] = item['units'] || [];
                item['units'] = [];
                item['product_type'] = 'service';
                item['count'] = 1;
                prod_list.push(item);
              });
            }
            model.set({'productions':new ProductCollection(prod_list)},{silent: true});
            // отображение формы
            new ExternalPositionsFormView({el: $('#external-positions-modal-container'), model: model, parent_view: self, contract_model: self.model }).show();
          }
        }
      }).fail(function(jqXHR, textStatus, errorThrown ) {
        $.jGrowl('Ошибка сервера:' + errorThrown, { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      }).always(function(){Routine.hideLoader();});
    }
    else
      $.jGrowl('Заявка не задана.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
  },
});

/**
 * Продукт
 */
var ProductTableItemView = Backbone.View.extend({
  events:{
    'click .show-position': 'showPosition',
    'click .product-link': 'linkedDialog'
  },
  tagName:'tr',
  product:null,
  initialize:function(){
    this.template = _.template($('#productTableItemTemplate').html());
    this.product = this.options.product;
  },
  render: function() {
    this.$el.html(this.template($.extend({}, this.options.product.toJSON(), {'parent_number': this.model.get('parent_number'), 'parent_id': this.model.get('parent_id'), 'contract':this.model})));
    if(this.options.product.get('status')=='del')
      this.$el.addClass('deleted');
    return this;
  },
  linkedDialog:function(el){
    var is_selected = $(el.target).hasClass('selected');
    $('.linked-products').data('id', this.options.product.get('_id'));
    $('.linked-products').data('type', 'product');
    $('.product-link').removeClass('selected');
    if (is_selected)
      $('.linked-products').hide();
    else
    {
      if(this.options.product.get('linked_production'))
        $(".linked-products-list").val(this.options.product.get('linked_production')['contract_number'].toString()+'.'+ this.options.product.get('linked_production')['product_number'].toString());
      $(el.target).addClass('selected');
      $('.linked-products').show();
    }
    $('.linked-products').offset({top:$(el.target).offset().top+21, left: $(el.target).offset().left+20});
  },
  showPosition:function(){
    var pf = new PositionFormView({el: $('#position-modal-container'), model: this.model, product:this.options.product, isnew:false});
    pf.show();
  }
});

/**
 * Услуга
 */
var ServiceTableItemView = Backbone.View.extend({
  events:{
    'click .show-position': 'showPosition',
    'click .product-link': 'linkedDialog'
  },
  tagName:'tr',
  product:null,
  initialize:function(){
    this.template = _.template($('#serviceTableItemTemplate').html());
  },
  render: function() {
    var md = this.options.service.toJSON();
    md.productions = this.model.get("productions").toJSON();
    md.parent_productions = App.Views.Contract.parent_productions || [];
    this.$el.html(this.template($.extend({},md, {'parent_number': this.model.get('parent_number'), 'parent_id': this.model.get('parent_id'), 'contract':this.model})));
    if(this.options.service.get('status')=='del')
      this.$el.addClass('deleted');
    return this;
  },
  linkedDialog:function(el){
    var is_selected = $(el.target).hasClass('selected');
    $('.linked-products').data('id', this.options.service.get('_id'));
    $('.linked-products').data('type', 'service');
    $('.product-link').removeClass('selected');
    if (is_selected)
      $('.linked-products').hide();
    else
    {
      if(this.options.service.get('linked_production'))
        $(".linked-products-list").val(this.options.service.get('linked_production')['contract_number'].toString()+'.'+ this.options.service.get('linked_production')['product_number'].toString());
      $(el.target).addClass('selected');
      $('.linked-products').show();
    }
    $('.linked-products').offset({top:$(el.target).offset().top+21, left: $(el.target).offset().left+20});
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
    this.$('.construction-price').numeric({ decimal: ',', negative: false, decimalPlaces:2 });
    this.$('.service-type').val(this.options.service.get("type"));

     if(!this.model.get('is_draft') || (this.model.get('is_contract_signed') && !this.model.get('is_edited')) || this.options.service.get('status')=='del') // && !App.glHasAccess){
    {
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
        if ($(this).data("production") && $(this).data('number'))
          units.push({'production_id':$(this).data("production"), 'unit_number':$(this).data('number')});
      });
    }
    srv.set("service_units",units);

    if(!srv.get("name")){
      var nm = srv.get('type')+' ';
      if(!srv.get("by_production"))
        nm+="(вся продукция)";
      else
      {
         /*группируем юниты по продукции */
        var prod_gr = {};
        for(var i in srv.get('service_units')){
          u = srv.get('service_units')[i]
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
      this.options.service.set('product_type','service');
      App.addChangeHistory(this.model, {"object_type":"production", "object_id":this.options.service.get('_id'), "operation":"create"});
//                this.model.get('change_history').add({'date':moment.utc().format("YYYY-MM-DDTHH:mm:ss"), "user_email": MANAGER, "object_type":"production", "object_id":this.options.service.get('_id'), "operation":"create"})
      this.model.get('productions').add(this.options.service);
    }else
    {
      App.addChangeHistory(this.model, {"object_type":"production", "object_id":this.options.service.get('_id'), "operation":"edit"});
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
    //this.options.service = new ServiceModel();
    this.options.service = new ProductModel();
    this.render();
  },
  removePosition:function(){
    if(this.options.service.get('_id').indexOf('new_')>-1)
      this.options.service.destroy();
    else{
      this.options.service.set('status','del');
      App.Views.Contract.RemovePaymentsByPosition(this.options.service);
    }
    App.addChangeHistory(this.model, {'object_type': 'production', 'object_id': this.options.service.get('_id'), 'operation':'delete'} )
    this.model.trigger("change");
    this.closeModal();
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
    'change .pos-number': 'recalcMoney',
    'change .mont-price, .pos-delivery, .mont_type': 'recalcMoney',
    'change .construction-price':'recalcMoney',
    'click .nav-tabs a':'onTab'
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
  recalcMoney:function(){
    var one_price = 0;
    var one_sq = 0;
    if (!isNaN(Routine.strToFloat(this.$('.construction-price').val()))){
      one_price = Routine.strToFloat(this.$('.construction-price').val());
    }

    if (!isNaN(Routine.strToFloat(this.$('.construction-sq').val()))){
      one_sq = Routine.strToFloat(this.$('.construction-sq').val());
    }
    var summa = 0;
    var mnt_summa = 0;
    var total_sq = 0;
    var del_summa = 0;
    this.$('.products-table .row').each(function(item){
        var cnt = Routine.strToInt($('.pos-number', this).val());
        var mont = Routine.strToFloat($('.mont-price', this).val());
        var del = Routine.strToFloat($('.pos-delivery', this).val());

        if(cnt>1)
          $('.mont_type',this).prop('disabled',false);
        else
          $('.mont_type',this).prop('disabled',true);

        var tpe = Routine.strToInt($('.mont_type',this).val());

        if (isNaN(cnt)){
          cnt = 0;
        }
        if (isNaN(mont)){
          mont = 0;
        }
        if (isNaN(del)){
          del = 0;
        }

        total_sq += cnt*one_sq;
        summa += cnt*one_price;
        mnt_summa += tpe?mont:(mont*cnt);
        del_summa+=del;
      });


    var kvm = summa/total_sq;
    this.$('.pos-total-price').text(Routine.priceToStr(summa, '0,00', ' '));
    this.$('.pos-total-montaz').text(Routine.priceToStr(mnt_summa, '0,00', ' '));
    this.$('.pos-total-delivery').text(Routine.priceToStr(del_summa, '0,00', ' '));
    this.$('.pos-total-all').text(Routine.priceToStr(summa + mnt_summa+del_summa, '0,00', ' '));
    this.$('.pos-total-sq').text(Routine.priceToStr(total_sq, '0,00', ' '));
    this.$('.pos-total-kvm').text(isNaN(kvm)?0:$.number( kvm, 2, ',', ' ' ));
    return summa;
  /*    if (!this.isapprox){
      var summa = 0;
      this.$('tbody tr').each(function(item){
        var cnt = $('.pos-number', this).val();
        var prc = $('.pos-price', this).val();

        if (isNaN(Routine.strToInt(cnt))){
          cnt = 0;
        }
        if (isNaN(Routine.strToFloat(prc))){
          prc = 0;
        }

        summa += cnt*prc;

      });
      this.$('.construction-price').val(summa);
    }*/
  },
  onTab:function(e){
    $(e.target).tab("show");
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
    //_.each(posc,alert);
    //_.each(posc,
    posc.each(function (el) {
      var item = el.toJSON();
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
    if (foo.indexOf(this.options.product.get('target')) == -1){
      foo.push(this.options.product.get('target'));
    }
    var bar = [];
    _.each(foo, function(item){bar.push({'id':item, 'text':item})});
    this.$('.constuction-target').select2({
        data: bar,
        createSearchChoice:function(term, data) { if ($(data).filter(function() { return this.text.localeCompare(term)===0; }).length===0) {return {id:term, text:term};} }
      }
    );
    this.$('.constuction-target').select2("val",this.options.product.get('target') );

    this.$('.pos-price, .pos-delivery, .mont-price').numeric({ decimal: ',', negative: false,decimalPlaces:2 });
    this.$('.pos-number').numeric({ decimal: false, negative: false });
    this.$('.construction-price').numeric({ decimal: ',', negative: false,decimalPlaces:2 });

    this.$('.construction-sq, .construction-length, .construction-width, .construction-height').numeric({ negative: false, decimal: ',' });
    if (this.options.product.get('type') != ''){
      this.$('.remove-position').removeClass('hide');
    }

    if(!this.model.get('is_draft') ||(this.model.get('is_contract_signed') && !this.model.get('is_edited')) || this.options.product.get('status')=='del')// && !App.glHasAccess)
    {
      this.$('.save-position, .save-add-position, .remove-position, .add-addr, .remove-addr').hide();
      this.$('input, select').prop('disabled',true);
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
  fillModel:function(){
    var self = this;
    var is_complect = this.$el.find(".is_complect").is(":checked");
    var is_br = false;
    if(self.$('.products-table .row').length==0){
      $.jGrowl("Необходимо задать адрес", { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      return false;
    }
    var fnn = 0;
    self.$('.products-table .row').each(function(item){
      if(!is_br){
        var nm = $('.pos-number', this).val();
        nm = nm?Routine.strToInt(nm):0;
        if(!nm){
          $.jGrowl("Неверно указано количество единиц продукции.", { 'themeState':'growl-error', 'sticky':false, life: 10000 });
          is_br = true;
        }else
          fnn+=nm;
      }
    });
    if(is_br)
      return false;
    if(is_complect){
      if(self.$('.products-table .row').length>1){
        $.jGrowl("Один комплект не может иметь разные адреса поставки. Создайте несколько комплектов или объедините в один адрес.", { 'themeState':'growl-error', 'sticky':false, life: 10000 });
        return false;
      }
    }else{

      if(fnn>5){
        $.jGrowl("Количество ед. не может быть больше 5 штук. Создайте комплект или отдельные виды продукции.", { 'themeState':'growl-error', 'sticky':false, life: 10000 });
        return false;
      }
    }

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
        'delivery': Routine.strToFloat($('.pos-delivery', this).val()),
        'mont_price': Routine.strToFloat($('.mont-price', this).val()),
        'mont_price_type':Routine.strToInt($(".mont_type",this).val()),
        'shmont': $('.pos-shmont', this).is(':checked')?'yes':'no'
      });
      if (isNaN(Routine.strToInt(nm))){
        nm = 0;
      }
      nums += Routine.strToInt(nm);
      addrs += nm + ' ед. - '+ addr + ', ';

      posc.add(posm);
    });
    if (addrs.length > 2){
      addrs = addrs.substring(0, addrs.length - 2);
    }
    // для комплектов своя переменная
    var complect_nums = 0;
    if(is_complect){
      complect_nums = nums;
      nums = 1;
    }
    this.options.product.set({
      'type': this.$('.construction-type').val(),
      'target': this.$('.constuction-target').select2("val"),
      'name':this.$('.construction-name').val(),
      'square': Routine.strToFloat(this.$('.construction-sq').val()),
      'length': this.$('.construction-length').val(),
      'width': Routine.strToFloat(this.$('.construction-width').val()),
      'height':Routine.strToFloat(this.$('.construction-height').val()),
      'count': nums,
      'complect_count':complect_nums,
      'price': Routine.strToFloat(this.$('.construction-price').val()),
      'approx': this.$('.isapprox').is(':checked')?'yes':'no',
      'positions': posc,
      'addrs': addrs,
      'is_complect':is_complect
    });


    if(!this.options.product.get("name")){
      var item = this.options.product;
      var nm = item.get("type")+' '+item.get('target')+' '+(item.get('length')?item.get('length'):'-')+'x'+(item.get('width')?item.get('width'):'-')+'x'+(item.get('height')?item.get('height'):'-');
      item.set("name",nm);
    }

    if (this.options.isnew){
      this.model.get('productions').add(this.options.product);
      App.addChangeHistory(this.model, {"object_type":"production", "object_id":this.options.product.get('_id'), "operation":"create"});
    }else
      App.addChangeHistory(this.model, {"object_type":"production", "object_id":this.options.product.get('_id'), "operation":"edit"});
    return true;
  },
  saveAddPosition:function(){
    var totsum = this.recalcMoney();
    if(!this.fillModel())
      return;
    var self = this;
     // this.model.set({'price': totsum}, {silent: true});
    this.model.trigger("change");
    self.options.isnew = true;
    self.options.product = new ProductModel();
    self.render();
  },
  savePosition:function(){
    var totsum = this.recalcMoney();
    if(!this.fillModel())
      return;
    this.model.set({'price': totsum}, {silent: true});
    this.model.trigger("change");
    this.closeModal();
  },

  removePosition:function(){
    if(this.options.product.get('_id').indexOf('new_')>-1)
      this.options.product.destroy();
    else{
       this.options.product.set('status','del');
       App.Views.Contract.RemovePaymentsByPosition(this.options.product);
    }

    App.addChangeHistory(this.model, {'object_type':'production', 'object_id':this.options.product.get('_id'), 'operation':'delete' });
    //this.options.product.set('status','del');
    //this.options.product.destroy();
    /*var self = this;
    this.model.save().done(function(){
      self.closeModal();
    }); */
    this.model.trigger("change");
    this.closeModal();
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
    eventBus.on('close', this.closeModal, this);
    this.$el.modal('hide').on('hidden', function () {
      self.$el.empty();
      self.undelegateEvents();
      self.$el.removeData().unbind();
    });
  }
});


/***
*** платежи
***/
App.Views.PaymentsFormView = Backbone.View.extend({
  events:{
    'click .add-new-payment':'onNewPayment',
    'change .hideClosedPayments':'onChangeClosedPayments'
  },
  initialize:function(){
    this.template = _.template($('#paymentsTableTemplate').html());
    this.listenTo(this.model.get("payments"), 'change reset add remove', this.render);
    this.render();
  },
  render:function(){
    this.$el.html(this.template(this.model.toJSON()));
    $("#payments-list").html(this.$el);
    if(this.model.get("payments").length>0){
      this.model.get("payments").sort();
      this.$(".payments").html("");
      var fact_ttl = 0;
      var overdue_ttl = 0; // просроченные платежи (остаток по ним)

      var now = new Date();
      var i = 0;
      this.model.get("payments").each(function(item){
        i++;
        var pe = new PaymentElemView({model:item});
        pe.contract = this.model;
        pe.render(i);
        this.$(".payments").append(pe.$el);
        var events = item.get('events');
        var pays = 0;
        if(events)
          for(var fp in events){
            pays+=Routine.strToFloat(events[fp]['size'] || '0');
          }
          fact_ttl += pays;//Routine.strToFloat(events[fp]['size']);
        overdue_ttl+=App.getPaymentRest(item);
      },this);
      var pays = App.calcPayments(this.model);
      var ttl = pays.full;
      var contract_cost = App.calcCost(this.model);

      //for(var i in pays){
      //    ttl+=pays[i];
      //}

      // расчет задолженности

      var itogo_data = "<table><tr><td>Общая сумма по договору:</td><td align='right'>&nbsp;"+Routine.priceToStr(contract_cost.full)+" р.</td></tr>"+
        "<tr><td>Введено по платежам:</td><td align='right'>&nbsp;"+Routine.priceToStr(ttl)+' р.</td></tr>'+
        "<tr><td>разница (сумма-введено):</td><td align='right'>&nbsp;"+Routine.priceToStr(contract_cost.full-ttl)+' р.</td></tr>'+
        "<tr><td colspan='2'>&nbsp;</td></tr>"+
        '<tr><td>Факт по платежам:</td><td align="right">&nbsp;'+Routine.priceToStr(fact_ttl)+' р.</td></tr>'+
        '<tr><td>Остаток всего:</td><td align="right">&nbsp;'+Routine.priceToStr(ttl - fact_ttl)+' р.</td></tr>'+
        '<tr><td>в т.ч. задолженность:</td><td align="right">&nbsp;'+Routine.priceToStr(overdue_ttl)+' р.</td></tr></table>';
      this.$(".itogo").show().find(".itogo-sum").html(itogo_data);
      //this.$(".itogo").show().find(".itogo-sum").html($.number(ttl, 0, ',', ' ' )+' р. (план)'+((fact_ttl>0)?('; '+$.number(fact_ttl, 0, ',', ' ' )+' р. (факт)'):''));

      $("#contractFactory").prop('disabled',true);
    }/*else
    {
      if(this.model.get("is_signed")!='yes')
        $("#contractFactory").prop('disabled',false);
    }*/
    this.delegateEvents();

  },
  calcPays:function(){
    var res = {montaz:0, cost:0, service:0, full: 0, has_full_contract_payment: false};
    this.model.get("payments").each(function(item){
      if(!item.get('canceled')){
        res.full+=item.get("size");
        if(!item.get('is_canceled')){
          if(item.get("payment_use").code==2)
            res.montaz+=item.get("size");
          if(item.get("payment_use").code==1)
            res.cost+=item.get("size");
          if(item.get("payment_use").code==3)
            res.service+=item.get("size");
          if(item.get("payment_use").code==4)
            res.has_full_contract_payment=true;
        }
      }
    },this);
    return App.removeLowerValues(res);
  },
  onNewPayment:function(){
     if(!$("#contractFactory option:selected").text()){
      $.jGrowl('Чтобы создавать платежи, необходимо указать завод.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      return false;
    }

    var cost = App.calcCost(this.model);
    var pays = this.calcPays();
    if(cost.montaz==0 && cost.cost==0 && cost.service==0){
      $.jGrowl('Нельзя добавить платеж для договора с нулевой стоимостью.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      //return;
    }

    if(cost.montaz<=pays.montaz && cost.cost<=pays.cost && cost.service<=pays.service){
      $.jGrowl('Контракт оплачен полностью.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
       // return;
    }
    var dlg = new PaymentEditForm({el:$("#position-modal-container"), model: new PaymentModel()});
    dlg.contract = this.model;
    dlg.is_new = true;
    dlg.show();
  },
  onChangeClosedPayments:function(){
    App.hideClosedPayments = this.$('.hideClosedPayments').is(":checked");
    this.render();
  }
});

var PaymentElemView = Backbone.View.extend({
  events:{
    'click .payment-type':'onEdit',
    'click .payment-cancel':'onCancel',
    //'click .payment-reestable':'onRestable',
    'click .btn-new-comment': 'onAddNewComment',
    'click .btn-save-comment': 'onSaveComment',
    'click .btn-cancel-comment': 'onCancelComment',

  },
  index: 0,
  initialize:function(){
    this.template = _.template($('#paymentsElemTemplate').html());
  },
  render:function(index){
    var arr = this.model.toJSON();
    arr.productions = this.contract.get("productions").toJSON();
    arr.contract = this.contract;
    arr.model = this.model;
    //arr.prservices = this.contract.get("services").toJSON();
    this.index = index;
    arr.index = index;
    this.$el.html(this.template(arr));
  },
  onEdit:function(){
     var dlg = new PaymentEditForm({el:$("#position-modal-container"), model: this.model});
    dlg.contract =this.contract;
    dlg.show();
  },

  // отменить платеж
  onCancel:function(){
    if(this.contract.get('is_edited') && this.model.get('_id'))
    {
      this.model.set("is_canceled",true);
      App.addChangeHistory(this.contract,{'object_type':'payment', 'object_id':this.model.get('_id'), 'operation':'delete'});
    }else{
      App.addChangeHistory(this.contract,{'object_type':'payment', 'object_id':this.model.get('_id'), 'operation':'delete'});
      this.model.destroy();
    }
    /*if(!this.model.get("_id")){
      this.model.destroy();
    }else{
      var self = this;
      var dlg = new ConfirmCancelationForm({el:$("#position-modal-container"), is_payment:true});
      dlg.OnConfirm = function(confirm_text){
        self.model.set("is_canceled",true);
        self.model.set("cancelation_comment", confirm_text);
      };
      dlg.show();
    }*/
  },
  /*// восстановить платеж
  onRestable:function(){
     this.model.set("is_canceled",false);
  },*/
  // обрбаотка кнопки добавления нового комента к платежу
  onAddNewComment: function()
  {
    this.$(".btn-new-comment").hide();
    this.$(".enter-comments").show();
  },
  // обрбаотка кнопки добавления нового комента к платежу
  onSaveComment: function()
  {
    if(this.$('.comment-text').val())
    {
      var comments = this.model.get('comments');
      var comment = {
            '_id': 'new',
            'date_add': moment.utc().format("YYYY-MM-DDTHH:mm:ss"),
            'user_email': MANAGER,
            'comment': this.$('.comment-text').val()
          };
      var self = this;
      if(this.model.get("_id") && this.model.get('_id')){
        Routine.showLoader();
        $.ajax({
          url: '/handlers/contracts/add_payment_comment',
          type: 'POST',
          data: JSON.stringify({'contract_id':this.contract.get('_id'), 'payment_id':this.model.get('_id'), 'is_draft':this.contract.get('is_draft'), 'comment': comment}),
          dataType: 'json',
          contentType: "application/json; charset=utf-8",
          timeout: 35000,
          success: function (result, textStatus, jqXHR) {
              Routine.hideLoader();
              comments.push(result);
              self.render( self.index);
          }
        }).fail(function(jqXHR, textStatus, errorThrown ) {
          $.jGrowl('Ошибка сервера:' + errorThrown, { 'themeState':'growl-error', 'sticky':false, life: 10000 });
          Routine.hideLoader();
        });
      }else
      {
          // добавление нового комента в список и рендер блока платежа

          comments.push(comment);
          this.render( this.index);
        }
      }
  },
  // обрбаотка кнопки добавления нового комента к платежу
  onCancelComment: function()
  {
    this.$(".btn-new-comment").show();
    this.$(".enter-comments").hide();
    this.$('.comment-text').val("");
  },
});

var PaymentEditForm = Backbone.View.extend({
  events:{
    'click .close-payment':'close',
    'change .payment-period':'onPeriodChange',
    'change .payment-all-units':'onPaymentAllUnits',
    'change .by_production':'onByProduction',
    'change .by_service':'onByService',
    'click .save-payment':'onSave',
    'click .save-add-payment':'onSaveAndAdd',
    'click .remove-payment':'onRemove',
    'change input[name=payment-target]':'onPaymentTargetChange'
  },
  is_new:false,
  initialize:function(){
    this.template = _.template($("#paymentsEditForm").html());
  },
  render:function(){
    var md = this.model.toJSON();
    md.productions = this.contract.get("productions").toJSON();
     // md.prservices = this.contract.get("services").toJSON();
    md.is_new = this.is_new;
    md.is_signed = this.contract.get('is_signed');
    md.is_contract_signed = this.contract.get('is_contract_signed');
    md.is_edited = this.contract.get('is_edited');

    this.$el.html(this.template(md));
    this.onPeriodChange();
    var cur = this.$('.payment_type').data('val');
    var $sel = this.$('.payment_type').selectize({
      options: App.Models.PaymentTypes,
      valueField: '_id',
      labelField: 'name',
      create: false,
      render: {
        item: function(item, escape) {
          return '<div>' +
            (item.name ? '<span class="name">' + escape(item.name) + '</span>' : '')+
          '</div>';
        },
        option: function(item, escape) {
          return '<div>' +
            '<b>' + escape(item.name) + '</b><br>' +
            '<small><i>'+item.note+'</i></small>'+
          '</div>';
        }
      }
    });
    $sel[0].selectize.setValue(cur);
    this.$('.payment-size').numeric({ decimal: ',', negative: false });
    this.$('.payment-event-days').numeric({ decimal: false, negative: false });
    this.$(".payment-period-from,.payment-period-to,.payment-date-value,.payment-event-date").datepicker({weekStart:1,format:"dd.mm.yyyy"});


    this.contract.get("payments").each(function(payment){
      // дизейблить единицы продукции
      if(payment.cid!=this.model.cid && !payment.get("is_canceled")){
        if(payment.get("payment_use").code!=3 && payment.get("by_production")){
          _.each(payment.get("units"),function(un){
            //this.$(".productions-table input[type=checkbox][data-production="+un.production_id+"][data-number="+un.unit_number+"]").prop("disabled",true);
          },this);
        }
        if(payment.get("payment_use").code==3 && payment.get("by_service")){
          _.each(payment.get("services"),function(un){
            //this.$(".service-list input[type=checkbox][data-serviceid="+un.service_id+"]").prop('disabled',true)
          },this);
        }
      }
    },this);

    //var pays = this.calcPays();
    var costs = App.calcCost(this.contract);
    if(!costs.service){
      this.$("input[name=payment-target][data-code=3]").prop("disabled",true);
    }
    if(!costs.montaz){
      this.$("input[name=payment-target][data-code=2]").prop("disabled",true);
    }
    if(!costs.cost){
      this.$("input[name=payment-target][data-code=1]").prop("disabled",true);
    }

    var self=this;
    this.$el.on('hidden', function () {
      self.$el.empty();
      self.undelegateEvents();
      self.$el.removeData().unbind();
    });
  },
  calcPays:function(){
    var res = {montaz:0, cost:0, service:0, full: 0, has_full_contract_payment: false};
    this.contract.get("payments").each(function(item){
      if(item.cid!=this.model.cid && !item.get("is_canceled")){
        res.full+=item.get("size");
        if(item.get("payment_use").code==2)
          res.montaz+=item.get("size");
        else
        if(item.get("payment_use").code==1)
          res.cost+=item.get("size");
        else
        if(item.get('payment_use').code==3)
          res.service+=item.get("size");
        else
        if(item.get('payment_use').code==4)
          res.has_full_contract_payment = true;
      }
    },this);
    return App.removeLowerValues(res);
  },
  show:function(){
    this.render();
    this.$el.modal('show');
  },
  close: function(){
    var self=this;
     this.$el.modal('hide');//.on('hidden', function () {
      //self.undelegateEvents();
      //self.$el.removeData().unbind();
      //self.$el.empty();
    //});

  },
  onPeriodChange:function(){
    var pr = this.$(".payment-period").val();
    this.$(".pl-pnl").hide();
    this.$("."+pr+"-pnl").css("display","inline");
  },
  onPaymentAllUnits:function(e){
    var chk = $(e.currentTarget).is(":checked");
    $(e.currentTarget).parents('.units:first').find("input:enabled").prop('checked',chk);
  },
  onByProduction:function(){
    if(this.$(".by_production").is(":checked"))
      this.$(".productions-table").slideDown();
    else
      this.$(".productions-table").slideUp();
  },
  checkData:function(){
    var pt = null;
    var pt_id = this.$(".payment_type").val(); // Вид платежа
    var pu_code = this.$("[name=payment-target]:checked").data("code"); // Назначение платежа
    if(!pt_id)
    {
      $.jGrowl('Не задан вид платежа.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      return false;
    }

    // заполнение информации о выбранном виде платежа
    for(var i in App.Models.PaymentTypes)
    {
      if(pt_id==App.Models.PaymentTypes[i]._id)
      {
        pt = App.Models.PaymentTypes[i];
        break;
      }
    }

    if(!pu_code)
    {
       $.jGrowl('Не задано назначение платежа.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
       return false;
    }

    // #962 (по всему договору можно создавать только авансы)
    // 06.04.2018 > Дим, можно сейчас снять проверку
    // Для платежа от всей суммы договора, вы можете создать только авансовый платеж.
    /*if(pt.code!=1 && pu_code == 4){
       $.jGrowl('Для платежа от всей суммы договора, вы можете создать только авансовый платеж.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
       return false;
    }*/

    //if(pt.code!=1 && this.contract.get("is_signed")!="yes"){
    //     $.jGrowl('Данный договор не подписан заказчиком. Вы можете создать только авансовый платеж.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
    //     return false;
    // }

    if(Routine.strToFloat(this.$(".payment-size").val() || 0) <=0){
       $.jGrowl('Задан неверный размер платежа.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
       return false;
    }

    var pays = this.calcPays();
    var costs = App.calcCost(this.contract);
    var cur_payment_size = Routine.strToFloat(this.$(".payment-size").val() || 0 );

    // #962
    // определение является ли текущий платеж по всему догвоору
    // также проверяется нет ли среди существующих платежей, платежа по всему догвоору.
    /*
    if(pu_code==4 || pays.has_full_contract_payment)
    {
      if(costs.full<(pays.full+Routine.strToFloat(this.$(".payment-size").val() ||0 )))
      {
        $.jGrowl('Общая сумма плановых платежей по договору превышает общую сумму по договору.<br/>Сумма плановых платежей: '+Routine.priceToStr(pays.full+cur_payment_size)+' руб.<br/>  Общая сумма по договору: '+Routine.priceToStr(costs.full)+' руб.', { 'themeState':'growl-error', 'sticky':false, life: 10000, beforeOpen: function(e,m,o){$(e).width( "400px" );} });
        //return false;
      }
    }
    else
    {
      if(pu_code==1){
        // if(costs.cost<=pays.cost){
        //    $.jGrowl('Нельзя добавить платеж за товар. Товар полностью оплачен.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
        //    return false;
        //}
        if(costs.cost<(pays.cost+Routine.strToFloat(this.$(".payment-size").val() ||0 )))
        {
          //Сумма плановых платежей за товар не совпадает с общей суммой за товар по договору.
          //Сумма плановых платежей за товар: _________ руб.
          //Общая сумма за товар по договору:  _________ руб.

          $.jGrowl('Сумма плановых платежей за товар не совпадает с общей суммой за товар по договору.<br/>Сумма плановых платежей за товар: '+Routine.priceToStr(pays.cost+cur_payment_size)+' руб.<br/>  Общая сумма за товар по договору: '+Routine.priceToStr(costs.cost)+' руб.', { 'themeState':'growl-error', 'sticky':false, life: 10000,beforeOpen: function(e,m,o){$(e).width( "400px" );} });

          //$.jGrowl('Общий платеж за товар превышает общую стоимость товара. Платеж за товар не может превышать '+(costs.cost-pays.cost)+" руб.", { 'themeState':'growl-error', 'sticky':false, life: 10000 });
          //return false;
        }
      }
      else if(pu_code==2){
        //if(costs.montaz<=pays.montaz){
        //    $.jGrowl('Нельзя добавить платеж за монтаж. Монтаж полностью оплачен.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
        //    return false;
        //}
        if(costs.montaz<(pays.montaz+Routine.strToFloat(this.$(".payment-size").val() ||0 )))
        {
          //$.jGrowl('Общий платеж за монтаж превышает общую стоимость монтажа. Платеж за монтаж не может превышать '+(costs.montaz-pays.montaz)+" руб.", { 'themeState':'growl-error', 'sticky':false, life: 10000 });
          //Сумма плановых платежей за услуги не совпадает с общей суммой за услуги по договору.
          //Сумма плановых платежей за услуги: _________ руб.
          //Общая сумма за услуги по договору:  _________ руб.
          $.jGrowl('Сумма плановых платежей за монтаж не совпадает с общей суммой за монтаж по договору.<br/>Сумма плановых платежей за монтаж: '+Routine.priceToStr(pays.montaz+cur_payment_size)+' руб.<br/>  Общая сумма за монтаж по договору: '+Routine.priceToStr(costs.montaz)+' руб.', { 'themeState':'growl-error', 'sticky':false, life: 10000,beforeOpen: function(e,m,o){$(e).width( "400px" );} });
          //return false;
        }
      }else if(pu_code==3){
        if(costs.service<(pays.service+Routine.strToFloat(this.$(".payment-size").val() ||0 )))
        {
          //Сумма плановых платежей за товар не совпадает с общей суммой за товар по договору.
          //Сумма плановых платежей за товар: _________ руб.
          //Общая сумма за товар по договору:  _________ руб.

          $.jGrowl('Сумма плановых платежей за доп. позиции не совпадает с общей суммой за товар по договору.<br/>Сумма плановых платежей за доп. позиции: '+Routine.priceToStr(pays.service+cur_payment_size)+' руб.<br/>  Общая сумма за доп. позиции по договору: '+Routine.priceToStr(costs.service)+' руб.', { 'themeState':'growl-error', 'sticky':false, life: 10000,beforeOpen: function(e,m,o){$(e).width( "400px" );} });

          //$.jGrowl('Общий платеж за товар превышает общую стоимость товара. Платеж за товар не может превышать '+(costs.cost-pays.cost)+" руб.", { 'themeState':'growl-error', 'sticky':false, life: 10000 });
          //return false;
        }
      }
    }*/


    if(this.$(".payment-note").val() && this.$(".payment-note").val().length<=2){
      $.jGrowl("Комментарий слишком короткий.", { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      return false;
    }
    if((pu_code==1 || pu_code==2) && this.$(".by_production").is(":checked")){
      var units = [];
      this.$(".units input[type=checkbox]:checked").each(function(){
        units.push({'production_id':$(this).data("production"), 'unit_number':$(this).data('number')});
      });
      if(!units.length){
        $.jGrowl("Не заданы единицы продукции.", { 'themeState':'growl-error', 'sticky':false, life: 10000 });
        return false;
      }
    }
    if(pu_code==3 && this.$(".by_service").is(":checked")){
      if(!this.$(".service-list input[type=checkbox]:checked").length){
         $.jGrowl("Не заданы услуги.", { 'themeState':'growl-error', 'sticky':false, life: 10000 });
        return false;
      }
    }
    /*if($("#contractFactory").val()!=App.factories['KALUGA']){
      var pay_period = this.$(".payment-period").val();
      if(pay_period=='by_period'){
        if(!this.$(".payment-period-from").val() || !this.$(".payment-period-to").val()){
          $.jGrowl("Не задана дата срока платежа.", { 'themeState':'growl-error', 'sticky':false, life: 10000 });
          return false;
        }
        var ds = Routine.parseDate(this.$(".payment-period-from").val(),"dd.mm.yyyy");
        var de = Routine.parseDate(this.$(".payment-period-to").val(),"dd.mm.yyyy");
        if(ds>de){
          $.jGrowl("Неверный период платежа.", { 'themeState':'growl-error', 'sticky':false, life: 10000 });
          return false;
        }
      }else
      if(pay_period=='by_event'){
        if(!this.$(".payment-event-date").val()){
          $.jGrowl("Не задана дата срока платежа.", { 'themeState':'growl-error', 'sticky':false, life: 10000 });
          return false;
        }
      }else{
         if(!this.$(".payment-date-value").val()){
          $.jGrowl("Не задана дата срока платежа.", { 'themeState':'growl-error', 'sticky':false, life: 10000 });
          return false;
        }
      }
    }else{ */
      if(this.$(".by_production").is(":checked")){
        var prod_list = [];
        var prod_id = null;
        var is_error = false;
        this.$(".units input[type=checkbox]:checked").each(function(){
          //units.push({'production_id':$(this).data("production"), 'unit_number':$(this).data('number')});
          if($(this).data("production")){
            if(!prod_id){
              prod_id =$(this).data("production");
            }else
              if(prod_id!=$(this).data("production"))
                is_error = true;
            prod_list.push($(this).data('number'));
          }
        });
        if(is_error || !prod_id){
          $.jGrowl("Нельзя создавать платежи на смешанные единицы продукции.", { 'themeState':'growl-error', 'sticky':false, life: 10000 });
          return false;
        }
        if(prod_list.length>1 && this.$(".units input[type=checkbox][data-production="+prod_id+"]").length!=prod_list.length){
          $.jGrowl("Нельзя создавать платежи на смешанные единицы продукции.", { 'themeState':'growl-error', 'sticky':false, life: 10000 });
          return false;
        }
        if(this.$(".by_services").is(":checked")){
          if(!this.$(".service-list input[type=checkbox]:checked").length){
             $.jGrowl("Нельзя создать платежи на несколько доп. позиций.", { 'themeState':'growl-error', 'sticky':false, life: 10000 });
            return false;
          }
        }
      }
     // }

    return true;
  },
  fillModel:function(){
    var pt = null;
    var pt_id = this.$(".payment_type")[0].selectize.getValue();
    for(var i in App.Models.PaymentTypes)
      if(pt_id==App.Models.PaymentTypes[i]._id)
      {
        pt = App.Models.PaymentTypes[i];
        break;
      }
    var pu_code = this.$("[name=payment-target]:checked").data("code");
    this.model.set("payment_type",pt);

    if(pu_code==1 || pu_code==2)
    {
      this.model.set("by_production",this.$(".by_production").is(":checked"));
      var units = [];
      if(this.model.get("by_production")){
        this.$(".units input[type=checkbox]:checked").each(function(){
          if($(this).data("production") && $(this).data('number'))
            units.push({'production_id':$(this).data("production"), 'unit_number':$(this).data('number')});
        });
      }
      this.model.set("units",units);
      this.model.set("by_service",false);
      this.model.set("services",[]);
    }
    else if(pu_code==3)
    {
      this.model.set("by_production",false);
      this.model.set("units",[]);
      this.model.set("by_service",this.$('.by_service').is(":checked"));
      var services = [];
      this.$('.service-list input[type=checkbox]:checked').each(function(){
        services.push({'service_id':$(this).data('serviceid')});
      });
      this.model.set("services",services);
    }else{
      this.model.set('by_production',false);
      this.model.set('by_service',false);
      this.model.set("units",[]);
      this.model.set("services",[]);
    }

    /*if($("#contractFactory").val()!=App.factories['KALUGA']){
      this.model.set("period",this.$(".payment-period").val());
      if(this.model.get("period")=='by_period')
      {
        this.model.set("date", App.setTimeToDate(Routine.parseDate(this.$(".payment-period-from").val(),"dd.mm.yyyy")));
        this.model.set("date_end",App.setTimeToDate(Routine.parseDate(this.$(".payment-period-to").val(),"dd.mm.yyyy")));
      }else
      if(this.model.get("period")=='by_event')
      {
        this.model.set("date",App.setTimeToDate(Routine.parseDate(this.$(".payment-event-date").val(),"dd.mm.yyyy")));
        this.model.set("day_count",Routine.strToInt(this.$(".payment-event-days").val() || 0));
      }else
        this.model.set("date",App.setTimeToDate(Routine.parseDate(this.$(".payment-date-value").val(),"dd.mm.yyyy")));
    }else */
      /* {
        this.model.set("period","");
        this.model.set("date", null);

      }*/
    this.model.set("size",Routine.strToFloat(this.$(".payment-size").val()));
    this.model.set("note",this.$(".payment-note").val());

    var pu = null;
    for(var i in App.Models["PaymentUses"]){
      if(App.Models["PaymentUses"][i].code==pu_code){
        this.model.set("payment_use",App.Models["PaymentUses"][i]);
      }
    }
  },
  onSave:function(){
    if(!this.checkData())
      return;
    this.fillModel();
    if(this.is_new){
      this.contract.get("payments").add(this.model);
      App.addChangeHistory(this.contract, {'object_type':'payment', 'object_id':this.model.get('_id'), 'operation':'create' });
    }else
      App.addChangeHistory(this.contract, {'object_type':'payment', 'object_id':this.model.get('_id'), 'operation':'edit' });
    this.close();
  },
  onSaveAndAdd:function(){
    if(!this.checkData())
      return;
    this.fillModel();
    if(this.is_new){
      this.contract.get("payments").add(this.model);
      App.addChangeHistory(this.contract, {'object_type':'payment', 'object_id':this.model.get('_id'), 'operation':'create' });
    }else
      App.addChangeHistory(this.contract, {'object_type':'payment', 'object_id':this.model.get('_id'), 'operation':'edit' });
    this.model = new PaymentModel();
    this.is_new = true;
    this.render();
  },
  onRemove:function(){
    if(this.contract.get('is_edited') && this.model.get('_id'))
    {
      App.addChangeHistory(this.contract, {'object_type':'payment', 'object_id':this.model.get('_id'), 'operation':'delete' });
    }else{
      this.model.destroy();
      App.addChangeHistory(this.contract, {'object_type':'payment', 'object_id':this.model.get('_id'), 'operation':'delete' });
    }
    //this.model.destroy();
    this.close();
  },
  onPaymentTargetChange:function(){
    if(this.$("input[name=payment-target]:checked").data('code')==4){
      this.$('.pay-by-production').hide();
      this.$('.pay-by-service').hide();
    }
    else if(this.$("input[name=payment-target]:checked").data('code')==3){
      this.$('.pay-by-service').show();
      this.$('.pay-by-production').hide();
    }else{
      this.$('.pay-by-service').hide();
      this.$('.pay-by-production').show();
    }
    //alert('qq');
  },
  onByService:function(){
    if(this.$(".by_service").is(":checked"))
      this.$(".service-list").slideDown();
    else
      this.$(".service-list").slideUp();
  }
});

/***
*** доп. соглашения
***/
App.Views.AdditionalContracts = Backbone.View.extend({
  events:{
     // 'click .add-new-payment':'onNewPayment'
  },
  initialize:function(){
    this.template = _.template($('#additionalContracts').html());
    this.render();
  },
  render:function(){
    this.$el.html(this.template(this.model.toJSON()));
    $("#additional-contracts").html("");
    $("#additional-contracts").append(this.$el);
  }
});

/***
  *** Связанные договоры
***/
App.Views.LinkedContracts = Backbone.View.extend({
  initialize:function(){
    this.template = _.template($('#linkedContracts').html());
    this.render();
  },
  render:function(){
    this.$el.html(this.template(this.model.toJSON()));
    $("#linked-contracts").html("");
    $("#linked-contracts").append(this.$el);
  }
});



/***
  ** Контрол добавления новых документов в договор
***/
App.Views.LinkedFiles = Backbone.View.extend({
  el: '#linked-files',
  google_folder_container :  null,
  templates: {
    template: _.template($('#linkedFilesTemplate').html()),
  },
  /***
  ** Инициализация
  **/
  initialize:function(){
    if(this.model){
      // прослушка события закачки нового файла в документы догоыора
      Backbone.off("file_upload:complete");
      Backbone.on("file_upload:complete",this.new_google_file_upload_complete,this);
      //контейнер для заливки документов на гугл фолдер
      this.google_folder_container = null;
      // формирование коллекции файлов
      if(this.model.get('documents') && this.model.get('documents')['items'])
      {
        this.google_folder_container = this.model.get('documents')["google_ready_folder_id"];
        this.collection = new FileCollection(this.model.get('documents')['items']);
      }
      else
        this.collection = new FileCollection();
    }
    this.render();
  },

  /**
   ** Отрисовка
  **/
  render:function(){
    if(this.model){
      var self = this;
      this.$el.html(this.templates.template(this.model.toJSON()));
      // отрисовка текущих документов договора
      this.render_current_documents();
      this.$('.linked-files').show();

      // инициализация добавления не подписанного договора
      new Backbone.UploadManager({
          title: 'Договор на подписание заказчику:',
          uploadUrl: '/handlers/contracts/upload_document/'+self.model.get('_id')+'/not_signed_contract',
          acceptFileTypes: /(pdf)$/i,
          autoUpload: true,
          singleFileUploads: true,
          maxNumberOfFiles: 1,
          maxFileSize: 104857600,
          parentFolder: self.google_folder_container,
          documentType: 'not_signed_contract'
      }).renderTo('.new-files-not-signed-contract');

      // инициализация добавления подписанного
      new Backbone.UploadManager({
          title: 'Договор подписанный заказчиком (скан):',
          uploadUrl: '/handlers/contracts/upload_document/'+self.model.get('_id')+'/signed_contract',
          acceptFileTypes: /(pdf)$/i,
          autoUpload: true,
          singleFileUploads: true,
          maxNumberOfFiles: 1,
          maxFileSize: 104857600,
          parentFolder: self.google_folder_container,
          documentType: 'signed_contract'
      }).renderTo('.new-files-signed-contract');

      // инициализация добавления файлов - дополнительных документов (file_uploader)
      new Backbone.UploadManager({
          title: 'Дополнительные документы:',
          uploadUrl: '/handlers/contracts/upload_document/'+self.model.get('_id')+'/additional',
          acceptFileTypes: /(pdf)$/i,
          singleFileUploads: false,
          maxNumberOfFiles: 5,
          autoUpload: true,
          maxFileSize: 104857600,
          parentFolder: self.google_folder_container,
          documentType: 'additional'
      }).renderTo('.new-files-list');
    }else{
      this.$el.html(this.templates.template());
      this.$('.linked-files').show();
    }
  },

  /**
  ** отрисовка списка текущих докумментов договора
  **/
  render_current_documents: function(){
    // очистка блока списка
    this.$(".current-files-list").empty();
    this.$(".current-files-not-signed-contract").empty();
    this.$(".current-files-signed-contract").empty();
    // отрисовка существующих документов
    for(var i in this.collection.models)
      this.render_current_item(this.model.get('_id'), this.collection.models[i]);
  },

  /**
   ** Отрисовка элемента текущего документа
  **/
  render_current_item: function(contract_id,model)
  {
    model.set('contract_id', contract_id);
    var itemView = new App.Views.CurrentFiletItemView({model: model, parentView: this});

    // по типу документа, определяем контейнер для его отрисовки
    switch(model.get('type')){
      case 'additional':
        this.$(".current-files-list").append(itemView.render().el);
      break;
      case 'not_signed_contract':
        this.$(".current-files-not-signed-contract").append(itemView.render().el);
      break;
      case 'signed_contract':
        this.$(".current-files-signed-contract").append(itemView.render().el);
      break;
    }
  },

  /**
   ** Обработка события завершения загрузки очередного файла-документа на гугл диск
  **/
  new_google_file_upload_complete: function(e)
  {
    var self = this;
    var uploaded_file_info = e[0];
    var google_file_info = e[1];

    // данные на сохранение
    var data_to_save = {
      'document_type': uploaded_file_info.document_type,
      'size': uploaded_file_info.data.size,
      'name': uploaded_file_info.data.name,
      'google_file_id': google_file_info['id']
    };

    //  выполнение запроса обновления данных по договору
    $.ajax({
      type: "POST",
      url: '/handlers/contracts/upload_document/'+self.model.get('_id'),
      data: JSON.stringify(data_to_save),
      timeout: 35000,
      contentType: 'application/json',
      dataType: 'json',
      async:true
    }).done(function(result) {
        if(result['status']=="ok")
        {
          // обновление списка документов
          self.update_current_files();
        }
    }).always(function(){});
  },

  /**
   ** Обновление текущих существующих документов договора
  **/
  update_current_files: function()
  {
    // запрос на сервер для получения текущего списка документов договора
    var self = this;
    $.ajax({
      type: "GET",
      url: "/handlers/contracts/get_documents/"+self.model.get('_id'),
      timeout: 35000,
      contentType: 'application/json',
      dataType: 'json',
      async:true
    }).done(function(result) {
        if(result['status']=="ok")
        {
          self.model.set('documents', result["data"]);
          if(result["data"] && result['data']['items'])
            self.collection = new FileCollection(result["data"]["items"]);
          else
            self.collection = new FileCollection();

          self.render_current_documents();
        }
    }).always(function(){});
  }
});

///------------------------------------------------------------------------------------------------------------------------------------------------
/// Представление элемента документа договора
///------------------------------------------------------------------------------------------------------------------------------------------------
App.Views.CurrentFiletItemView = Backbone.View.extend({
  tagName:'div',
  className:'row-fluid file-item',
  parentView: null,
  templates: {
    template: _.template($("#fileItemTemplate").html()),
  },
  events:{
    'click .btn-remove': 'onRemoveDocument',
  },
  /**
   * инициализация
  **/
  initialize:function(){
    //this.model.bind("change", this.change, this);
    this.parentView = this.options.parentView;
  },
  /**
   * Событие изменения модели
  **/
  change: function(){
    this.render();
  },
  /**
   * Очистка формы
  **/
  clear: function()
  {
    this.$el.remove();
  },
   /**
   * отрисовка
  **/
  render: function(){
    this.$el.html(this.templates.template(this.model.toJSON()));
    return this;
  },
  /**
   ** Удалить документ
  **/
  onRemoveDocument: function(e)
  {
    var self = this;
    // запрос подтверждения удаления
    Routine.showLoader();
    $.ajax({
      type: "POST",
      url: "/handlers/contracts/remove_document/"+self.model.get('contract_id'),
      data: JSON.stringify(self.model),
      timeout: 35000,
      contentType: 'application/json',
      dataType: 'json',
      async:true
    }).done(function(result) {
        if(result['status']=="ok")
        {
          $.jGrowl('Документ успешно удален', { 'themeState':'growl-success', 'sticky':false, life: 10000});
          self.model.destroy();
          self.clear();
          // обновление родительского представления списка документов
          self.parentView.update_current_files();
        }
        else
          $.jGrowl('Ошибка удаления документа. Подробности: ' + result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 10000 });
    }).always(function(){Routine.hideLoader()});
  }
});




var ConfirmCancelationForm = Backbone.View.extend({
  template: _.template($("#confirmCancelFormTemplate").html()),
  OnConfirm:null,
  is_payment:false,
  events:{
    'click .save-cancelation':'onSave',
    'click .cancel-cancelation':'close',
  },
  initialize:function(){
    this.is_payment = this.options.is_payment?true:false;
    this.render();
    var self = this;
    this.$el.on('hidden',function () {
      self.$el.empty();
      self.undelegateEvents();
      self.$el.removeData().unbind();
    });
  },
  render:function(){
    this.$el.html(this.template({is_payment:this.is_payment}));
  },
  close: function(){
    this.$el.modal('hide');
  },
  show:function(){
    this.$el.modal('show');
  },
  onSave:function(){
    if(!this.$("textarea").val()){
      $.jGrowl(this.is_payment?"Укажите причину отмены платежа":"Укажите причину расторжения договора", { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      return;
    }
    this.OnConfirm(this.$("textarea").val());
    this.close();
  }
});


var ContractsList = Backbone.View.extend({
  template:_.template($('#contractListTemplate').html()),
  events:{
    'click .contract-list-pager a':'onPageClick'
  },
  initialize:function(){
     //his.render();
  },
  render:function(){
    $("#filters-list").show();
    this.$el.html(this.template(this.model));
  },
  show:function(page_num){
    var self = this;
    Routine.showLoader();
    App.Route.navigate("/list/"+page_num+"/"+App.GetFilter(),false);
    var filter = {
      factories:App.ListFilters.factories.join(","),
      statuses: App.ListFilters.statuses.join(","),
      debt: App.ListFilters.debt.join(",")
    };
     $.ajax({
      url: '/handlers/contracts/get_list/'+page_num,
      type: 'POST',
      data:filter,
      dataType: 'json',
      contentType: "application/json; charset=utf-8",
      timeout: 35000,
      success: function (result, textStatus, jqXHR) {
          Routine.hideLoader();
          if(result.status=='error'){
            $.jGrowl(result.msg, { 'themeState':'growl-error', 'sticky':false, life: 10000 });
          }else
          if(result.status=="ok"){
           self.model = result;
           self.model.count = Math.ceil(self.model.count/50);
           self.model.cur_page = page_num;
           self.render();
          }else
          $.jGrowl('Ошибка сервера', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      }
    }).fail(function(jqXHR, textStatus, errorThrown ) {
      $.jGrowl('Ошибка сервера:' + errorThrown, { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      Routine.hideLoader();
    });;
  },
  onPageClick:function(e){
    var pg = $(e.currentTarget).data("page");
    this.show(pg);
  }
});


///
/// Форма отображения списка позиций, подгружаемых из внешнего источника (Договор. Заказ)
///
var ExternalPositionsFormView = Backbone.View.extend({
  parent_view: null,
  contract_model: null, // модель основного договора, открытого на форме
  events:{
    'click .save': 'save',
    'click .cancel': 'cancel',
    'click .cb-all': 'select_all',
  },
  templates: {
    template: _.template($('#ExternalPositionsTableTemplate').html()),
  },
  ///
  /// Инициализация формы с автоматическим рендерингом
  ///
  initialize:function(){
    this.parent_view = this.options.parent_view;
    this.contract_model = this.options.contract_model;
    this.render();
  },
  ///
  /// отрисовка диалога
  ///
  render:function(){
    var self = this;
    this.$el.html(this.templates.template(this.model.toJSON()));
    var hc = this.model.get('productions');
    var i = 1;
    _.each(hc.models, function (item) {
      if(item.get('status')!='del')
      {
        if(!item.get('product_type')){
          /*if(!item.get('number'))
            item.set('number', i);*/
          self.renderOne(item,i);
        }else
        if(item.get('product_type')=='service'){
          /*if(!item.get('number'))
            item.set('number', i);*/
          self.renderOneService(item,i);
        }
        i++;
      }
    }, this);
    return this;
  },
  renderOne: function(item,item_number=0){
    var view = new ExternalProductTableItemView({model: this.model, product:item, item_number:item_number});
    this.$(".products-table tbody").append(view.render().el);
    return view;
  },
  renderOneService:function(item){
    var view = new ExternalServiceTableItemView({model: this.model, service:item});
    this.$(".services-table tbody").append(view.render().el);
    return view;
  },
  ///
  /// показать диалог
  ///
  show:function(){
    this.$el.modal('show');
  },
  ///
  /// Обработка кнопки - Отмена
  ///
  cancel: function(e){
    this.closeModal();
  },
  ///
  /// Закрыть диалог
  ///
  closeModal:function(){
    var self = this;
    this.$el.modal('hide').on('hidden', function () {
      self.$el.empty();
      self.undelegateEvents();
      self.$el.removeData().unbind();
    });
  },
  ///
  /// Выделить все
  ///
  select_all: function(e)
  {
    var chk = $(e.currentTarget);
    var hc = this.model.get('productions');
    $(e.currentTarget).parents('table:first').find("input").prop('checked',chk);
    if(chk.hasClass('products'))
    {
      _.each(hc.models, function (item) {
        if(item.get('product_type')!='service')
          item.set('checked', chk.is(":checked"));
      }, this);
    }
    else
    {
      _.each(hc.models, function (item) {
        if(item.get('product_type')=='service')
          item.set('checked', chk.is(":checked"));
      }, this);
    }
  },

  ///
  /// Добавление выбранных позиций
  ///
  save: function(e){
    var self = this;
    // пробегаемся по выбранным моделям и добавляем их в основной договор
    var hc = this.model.get('productions');
    _.each(hc.models, function (item) {
        if(item.get('checked'))
        {
          item.set('number','');
          item.set('_id','new_'+Guid.newGuid());
          self.contract_model.get('productions').add(item);
          App.addChangeHistory(self.contract_model, {'object_type':'production', 'operation':'create', 'object_id':item.get('_id')});
        }
    }, this);
    this.parent_view.render();
    this.cancel();
    //$(".save-full-data").click();
  }
});

/**
 * Продукт
 */
var ExternalProductTableItemView = Backbone.View.extend({
  events:{
    'click .cb-item': 'select_item',
  },
  tagName:'tr',
  product:null,
  initialize:function(){
    this.template = _.template($('#ExternalProductTableItemTemplate').html());
    this.product = this.options.product;
  },
  render: function() {
    this.$el.html(this.template($.extend({}, this.options.product.toJSON(), {'parent_number': this.model.get('parent_number'), 'parent_id': this.model.get('parent_id'),'item_number':this.options.item_number})));
    return this;
  },
  select_item: function(e){
    this.options.product.set('checked', $(e.currentTarget).is(":checked"));
  }
});

/**
 * Услуга
 */
var ExternalServiceTableItemView = Backbone.View.extend({
  events:{
    'click .cb-item': 'select_item',
  },
  tagName:'tr',
  product:null,
  initialize:function(){
    this.template = _.template($('#ExternalServiceTableItemTemplate').html());
  },
  render: function() {
    var md = this.options.service.toJSON();
    md.productions = this.model.get("productions").toJSON();
    md.parent_productions = App.Views.Contract.parent_productions;
    this.$el.html(this.template(md));
    return this;
  },
  select_item: function(e){
    this.options.service.set('checked', $(e.currentTarget).is(":checked"));
  }
});

// ошибки
var DraftErrorsList = Backbone.View.extend({
  initialize:function(){
    this.template = _.template($('#draftErrorsTemplate').html());
  },
  render: function() {
    this.$el.html(this.template(this.model.toJSON()));
    return this;
  }
});


// общая история
var GlobalHistoryView = Backbone.View.extend({
  initialize:function(){
    this.template = _.template($("#globalHistoryTemplate").html());
    this.$el = $(".contract-globalhistory-continer");
    this.render();
  },
  render:function(){
    this.$el.html(this.template(this.model.toJSON()));
  }

});
