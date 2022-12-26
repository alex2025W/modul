var App = {
  Models: {},
  Views:{},
  Collections:{},
  Route:null,
  initialize:function(){
    App.Views.Main = new AppView();
    App.Route = new AppRouter();
    Backbone.history.start();
    Backbone.on("global:on_url_params_change",this.onSaveUrlHistory,this);
    this.materialsDict = this.prepareMaterialsDict();
  },
  prepareMaterialsDict: function(){
    var res = {};
    for(var i=0;i<global_materials.length;++i){
      var gm = global_materials[i];
      for(var j=0;j<gm.materials.length;++j){
        res[gm["code"] + '.' + gm.materials[j]['code']] = {
          group_code: gm["code"],
          group_name: gm['name'],
          material_code: gm.materials[j]['code'],
          material_name: gm.materials[j]['name'],
        }
      }
    }
    return res;
  },
  getMaterialNameByGlobalId:function(global_id){
    var res = "";
    for(var i=0;i<global_materials.length;++i){
      var gm = global_materials[i];
      for(var j=0;j<gm.materials.length;++j)
        if(gm.materials[j]['_id']==global_id)
          return  gm["code"]+"."+gm.materials[j]['code'] +" "+ gm['name']+" / "+gm.materials[j]['name'];
    }
     return "";
  },
   getMaterialInfoByGlobalId:function(global_id){
    for(var i=0;i<global_materials.length;++i){
      var gm = global_materials[i];
      for(var j=0;j<gm.materials.length;++j){
        if(gm.materials[j]['_id']==global_id){
          return {
            group_code: gm["code"],
            group_name: gm['name'],
            material_code: gm.materials[j]['code'],
            material_name: gm.materials[j]['name'],
          }
        }
      }
    }
     return null;
  },
  getStatusByCode:function(status_code){
    switch(status_code+''){
      case '0': return "В расчете";
      case '1': return "Согласовано";
      case '2': return "Отклонено";
      case '3': return "На согласовании";
      case '4': return "Не определено";
      case '5': return "Требуется";
    }
    return "";
  }
  ,

  /**
   * Изменение и сохранение параметров URL
   */
  onSaveUrlHistory:function(params){
    var param_key = params[1];
    var param_value = params[2];
    if(param_key in this.UrlParams)
      this.UrlParams[param_key] = param_value;
    this.Route.navigate("/"+this.buildUrl(), false);
  },

  /**
   *  Парсинг URl параметров
   */
  doQuery: function(query){
    // функция заполнения структуры команд
    function parse_commands(urlParams)
    {
      var tmpCommands = query.split('/');
      if(tmpCommands.length>0)
      {
        for(var key in urlParams)
        {
          var i = 0;
          for(var ci in tmpCommands)
          {
            var command = tmpCommands[i];
            if(key == command && (i+1)<= tmpCommands.length)
              urlParams[key] = tmpCommands[i+1];
            i++;
          }
        }
      }
    }
    this.UrlParams = {'type': 'order', 'order': '', 'status':'', 'tab': 'body'};
    var tmpCommands = query? query.split('/'):[];
    // если в URL передан только номер заказа
    // меняем запрос на правильный и выпоняем построение
    if(tmpCommands.length>0)
      parse_commands(this.UrlParams);
    // если статусы в фильтре не заданы, то выставляем все статусы по умолчанию.
    if(this.UrlParams['status']=='')
      this.UrlParams['status'] = '&4&5&0&3&1&2';
    // выставление правильного URL
    this.Route.navigate("/"+this.buildUrl(), false);
    // вызов метода установления фильтров панели фильтрации
    App.Views.Main.Search(
      this.UrlParams['type'],
      this.UrlParams['order'],
      this.UrlParams['status'].split('&'),
      this.UrlParams['tab']
    );
  },
   /**
    * Построение строки URL по текущим параметрам
  **/
  buildUrl: function(){
    var arr = [];
    for(var key in this.UrlParams)
    {
      arr.push(key);
      arr.push(this.UrlParams[key]);
    }
    return arr.join("/");
  },
};

///---------------------------------------------------------------------------------------------------------
///---------Роутеры-----------------------------------------------------------------------------------------
///---------------------------------------------------------------------------------------------------------
var AppRouter = Backbone.Router.extend({
  routes: {
    "": "index",
    ":query": "index",
    "*path": "index"
  },
  index:function(query){
    App.doQuery(query);
  }
});

///---------------------------------------------------------------------------------------------------------
///---------Модели + коллекции------------------------------------------------------------------------------
///---------------------------------------------------------------------------------------------------------
var Production = Backbone.Model.extend({});
var Productions = Backbone.Collection.extend({ model:Production});
var Contract = Backbone.Model.extend({});

// модель для работы с импортом данных из XLS
App.Models.ImportDataModel = Backbone.Model.extend({
  defaults: {},
  initialize: function() {},
   idAttribute: "_id",
   defaults: {
   }
});

// модель и коллекция для работы с ошибками от импорта
App.Models.ImportDataErrorModel = Backbone.Model.extend({});
App.Collections.ImportDataErrorsCollection = Backbone.Collection.extend({ model:App.Models.ImportDataErrorModel});

// модель и коллекция для работы с историей иморта
App.Models.ImportDataHistoryModel = Backbone.Model.extend({});
App.Collections.ImportDataHistoryCollection = Backbone.Collection.extend({ model:App.Models.ImportDataHistoryModel});

///---------------------------------------------------------------------------------------------------------
///---------Основное представление
///---------------------------------------------------------------------------------------------------------
var AppView = Backbone.View.extend({
  filterSelectedStatus: [],
  initialize:function(){
    var self = this;

    $("#btnPlanNormFind").click(function(){
      self.OnSearch();
    });
    $("#search-number").keypress(function(e){
      if(e.keyCode==13)
        self.OnSearch();
    });

    $("#btnDownloadStat").click(function(){
      window.open('handlers/plannormblank/get_statistic/?num='+App.Models.Contract.get("number"));
    });

    this.filterSelectedStatus = [];
    // подключение мультиселекта на работы
    $('.ddl-status').multiselect({
        buttonContainer: '<span class="dropdown" />',
        includeSelectAllOption: true,
        enableCaseInsensitiveFiltering: true,
        numberDisplayed: 3,
        filterPlaceholder: 'Найти',
        nonSelectedText: "Статусы",
        nSelectedText: "Статсусов выбрано: ",
        selectAllText: "Все",
        maxHeight: 400,
         buttonText: function(options) {
            if (options.length === 0)
              return 'Статусы <b class="caret"></b>';
            else if (options.length > this.numberDisplayed)
            {
              if(options.length==$('.ddl-status option:selected').length)
              {
                $('.ddl-status').next().find('.multiselect-all').parent().addClass('active').find('input').prop('checked', true);
              }
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
            self.filterSelectedStatus = [];
            var is_all = true;
            $('.ddl-status option').each(function(){
              if($(this).val()!='' && $(this).val()!='multiselect-all'){
                if($(this).is(":selected")){
                  self.filterSelectedStatus.push($(this).val());
                }else
                  is_all = false;
              }
            });
            if(is_all)
              self.filterSelectedStatus.push('multiselect-all');
            Backbone.trigger('global:on_url_params_change',[self, 'status', self.filterSelectedStatus.join('&')]);
            $('body').addClass('wait');
            setTimeout(function(){
              self.filterData(self.filterSelectedStatus);
              $('body').removeClass('wait');
            },150);
          }
      });
    $('.pnl-ddl').show();
  },

  /**
  ** функция перестроения фильтра по статусам
  **/
  rebuildStatusFilter: function(data){
    $('.ddl-status').find('option').prop('selected',false);
    $('.ddl-status').find('option').each(function(x){
      if($(this).val()!='multiselect-all' && data.indexOf($(this).val())>-1)
        $(this).prop('selected', true);
    });
    $('.ddl-status').multiselect('rebuild');
  },
  /**
  ** Фильтрация данных
  ** selected_status - список кодов статусов
  **/
  filterData: function(selected_statuses){
    // применение фильтров
    App.Views.Contract.filterData(selected_statuses);
  },

  /**
  ** Событие кнопки поиска
  **/
  OnSearch:function(){
    var type = $('#filter-type').val();
    var num = $("#search-number").val();
    Backbone.trigger('global:on_url_params_change',[self, 'type', type]);
    Backbone.trigger('global:on_url_params_change',[self, 'order', num]);
    Backbone.trigger('global:on_url_params_change',[self, 'tab', 'body']);
    this.Search(type, num, this.filterSelectedStatus, 'body');
  },

  /**
  ** Функция поиска
  **/
  Search:function(type, num, filterSelectedStatus, selectedTab){
    $("#btnDownloadStat").hide();
    $("#search-number").val(num);
    // выставить тип поиска
    $("#filter-type").val(type);

    Routine.showLoader();
    var self = this;
    $.ajax({
      url: '/handlers/plannorm/search/',
      type: 'GET',
      dataType: 'json',
      contentType: "application/json; charset=utf-8",
      data: {'type': type, 'num':num},
      timeout: 35000,
      success: function (result, textStatus, jqXHR) {
        Routine.hideLoader();
        if(result.status=='error'){
          $("#pnlPlanNormBody").html('<p class="text-center text-error">'+result.msg+'</p>');
        }
        else if(result.status=="ok")
        {
          App.Models.Contract = new Contract(result.data.contract);
          self.ShowContract(selectedTab);
          self.filterSelectedStatus =filterSelectedStatus;
          self.rebuildStatusFilter(filterSelectedStatus)
          self.filterData(self.filterSelectedStatus);
          if(type == 'specification')
            self.openSpecification(result.data.specification);
        }
        else
          $("#pnlPlanNormBody").html('<p class="text-center text-error">Ошибка сервера</p>');
      },
      error:function(result){
          Routine.hideLoader();
          $("#pnlPlanNormBody").html('<p class="text-center text-error">Ошибка сервера</p>');
      }
    });
  },

  ShowContract:function(selectedTab){
    App.Views.Contract = new ContractView({model:App.Models.Contract, 'selectedTab': selectedTab});
    $("#btnDownloadStat").show();
  },
  openSpecification: function(spec_info){
    App.Views.Contract.openSpecification(spec_info);
  }
});

///---------------------------------------------------------------------------------------------------------
///Форма редактирования договора
///---------------------------------------------------------------------------------------------------------
var ContractView = Backbone.View.extend({
  filter_status: [],
  template:  _.template($('#contractTemplate').html()),
  events:{
    'click .norm-hist-tab a':'onTabClicked'
  },
  initialize:function(){
    this.selectedTab = this.options['selectedTab'];
    // событие завершения сохранения требуемых групп материалов по договору
    Backbone.on("global:on_save_required_groups_complete",this.onSaveRequiredGroupsComplete,this);
    this.filter_status = [];
    this.model.set("productions",new Productions(this.model.get("productions")));
    //this.render();
    Backbone.on("importdata:all_data_import_complete",this.onImportDataComplete,this);
    this.setTab(this.selectedTab);
  },

  /**
   * Обработка события завершения импорта данных
   */
   onImportDataComplete: function(e){
    // обновления, пришедщие с сервера
    var new_data = e[1];
    if(new_data)
    {
      App.Models.Contract = new Contract(new_data);
      this.model = App.Models.Contract;
      this.model.set("productions",new Productions(this.model.get("productions")));
      $("#plan-norm-body").empty();
      for(var i=0;i<this.model.get("productions").length;++i)
      {
        var is_visible = false;
        if(App.Views.Main.filterSelectedStatus.filter(function(item){return item=='multiselect-all';}).length==0 && ((App.Views.Main.filterSelectedStatus.length==1 && App.Views.Main.filterSelectedStatus[0]!='4') || App.Views.Main.filterSelectedStatus.length>1))
        {
          var p_model = this.model.get("productions").models[i];
          if(p_model.get('sectorlist') && p_model.get('sectorlist').length>0)
          {
            for(var s_i in p_model.get('sectorlist')){
              var sector_row = p_model.get('sectorlist')[s_i];
              if(sector_row['materials'] && sector_row['materials'].length>0)
              {
                for(var m_i in sector_row['materials'])
                {
                  var material_row = sector_row['materials'][m_i];
                  if(App.Views.Main.filterSelectedStatus.indexOf(material_row['status'].toString())>-1)
                  {
                    is_visible = true;
                    break;
                  }
                }
              }
            }
          }
        }
        else
          is_visible = true;

        if(is_visible)
        {
          var pv = new ProductionView({
            model:this.model.get("productions").models[i],
            contract_number: this.model.get('number')
          });
          $("#plan-norm-body").append(pv.$el);
        }
      }
    }

    // форма отображения истории импортов
    this.ImportDataViewHistory = new App.Views.ImportDataHistoryListView ({
      'el': this.$el.find('#plan-norm-import-data-history'),
      'collection': new App.Collections.ImportDataHistoryCollection(this.model.get('imports_history'))
    });
   },

  /**
  **  Функция фиьтрации данных
  ** status - список кодов статусов
  **/
  filterData: function(status){
    this.filter_status = status;
    this.render();
  },

  render:function(){
    this.$el.html(this.template(this.model.toJSON()));
    $("#pnlPlanNormBody").html("").append(this.$el);
    this.delegateEvents();

    for(var i=0;i<this.model.get("productions").length;++i){
      var is_visible = false;
      if(App.Views.Main.filterSelectedStatus.filter(function(item){return item=='multiselect-all';}).length==0 && ((App.Views.Main.filterSelectedStatus.length==1 && App.Views.Main.filterSelectedStatus[0]!='4') || App.Views.Main.filterSelectedStatus.length>1))
      {
        var p_model = this.model.get("productions").models[i];
        if(p_model.get('sectorlist') && p_model.get('sectorlist').length>0)
        {
          for(var s_i in p_model.get('sectorlist')){
            var sector_row = p_model.get('sectorlist')[s_i];
            if(sector_row['materials'] && sector_row['materials'].length>0)
            {
              for(var m_i in sector_row['materials'])
              {
                var material_row = sector_row['materials'][m_i];
                if(App.Views.Main.filterSelectedStatus.indexOf(material_row['status'].toString())>-1)
                {
                  is_visible = true;
                  break;
                }
              }
            }
          }
        }
      }
      else
        is_visible = true;

      if(is_visible)
      {
        var pv = new ProductionView({
          model:this.model.get("productions").models[i],
          contract_number: this.model.get('number')
        });
        $("#plan-norm-body").append(pv.$el);
      }
    }

     // форма импорта данных из XLS
    this.ImportDataView = new App.Views.ImportDataView({'el': this.$el.find('#plan-norm-import-data'), 'model':new App.Models.ImportDataModel({
      'contract_id': this.model.get('_id'),
      'contract_number': this.model.get('number'),
      'productions': this.model.get('productions').toJSON()
    })});

    // форма отображения истории импортов
    this.ImportDataViewHistory = new App.Views.ImportDataHistoryListView ({
      'el': this.$el.find('#plan-norm-import-data-history'),
      'collection': new App.Collections.ImportDataHistoryCollection(this.model.get('imports_history'))
    });

    // форма отображения требуемых групп материалов по продукции
    this.RequiredGroupsView = new App.Views.RequiredGroupsView ({
      el: this.$el.find('#plan-norm-required-groups'),
      model: {
        productions: this.model.get('productions').toJSON(),
        contract: {number: this.model.get('number'), _id: this.model.get('_id')},
        required_groups: this.model.get('required_groups')
      }
    });

    if(this.checkRequiredGroupsStatuses(this.model.get('required_groups')))
    {
      this.showAllTabs();
      this.setTab(this.selectedTab);
    }
    else
      this.hideAllTabsExceptRequiredGroups();

  },

  showTab: function(key)
  {
    var keys = ['#plan-norm-required-groups', '#plan-norm-body', '#plan-norm-history', '#plan-norm-import-data', '#plan-norm-import-data-history'];
    for(var i in keys)
      $(keys[i]).hide();
    $(key).show();
  },

  /**
   * Выбрать заданный таб
   */
  setTab: function(val){
    $(".nav-tabs").find('li').removeClass('active');
    $(".nav-tabs").find('[data-type="'+val+'"]').parent().addClass('active');
    switch(val)
    {
      case 'body':
        this.showTab("#plan-norm-body");
      break;
      case 'history':
        this.showTab("#plan-norm-history");
        new HistoryView({'contract_number':this.model.get('number')});
      break;
      case 'import_data':
        this.showTab("#plan-norm-import-data");
      break;
      case 'import_data_history':
        this.showTab("#plan-norm-import-data-history");
      break;
      case 'required_groups':
        this.showTab("#plan-norm-required-groups");
      break;
    }
  },

  onTabClicked:function(e){
    //-----------
    e.preventDefault();
    var cur_tab = $(e.currentTarget).data('type');
    this.selectedTab = cur_tab;
    this.setTab(cur_tab);
    Backbone.trigger('global:on_url_params_change',[this, 'tab', cur_tab]);
  },

  checkRequiredGroupsStatuses: function(data){
    if(data){
      for(var i in data){
        if(data[i]['value']=='undefined')
          return false;
      }
      return true;
    }
    return false;
  },

  /**
   * событие завершения сохранения требуемых групп материалов по договору
   */
  onSaveRequiredGroupsComplete: function(params){
    var status = params[1];
    if(status)
      this.showAllTabs();
    else
      this.hideAllTabsExceptRequiredGroups();
  },

  /**
   * Скрыть все табы, кроме таба выбора статусов групп материалов
   */
  hideAllTabsExceptRequiredGroups: function(){
    $('.norm-hist-tab').find('li').hide();
    $('.tab-content').hide();
    this.showTab("#plan-norm-required-groups");
    $('.norm-hist-tab').find("[data-type='required_groups']").parent().show();
  },

  /**
   * Показать все табы
   */
  showAllTabs: function(){
    $('.norm-hist-tab').find('li').show();
    //$('.tab-content').show();
  },

  /**
   * Функция показа спецификации
   */
  openSpecification: function(spec_info){
    $('a[data-id="'+spec_info['_id']+'"]').trigger("click");//.addClass('selected').next('.matgroup-list').show();
  }
});

///---------------------------------------------------------------------------------------------------------
/// Форма добавления новых норм
///---------------------------------------------------------------------------------------------------------
var NormsAddForm = Backbone.View.extend({
   template:  _.template($('#normsAddForm').html()),
   template_type: _.template($('#editAddForm_type').html()),
   sectors_edited:[],
   can_show:true,
   initialize:function(){
    this.render();
  },
  events:{
    'shown':"onShow",
    'hidden':"onHide",
    'click .sector-ttl':'onSectorClick',
    'click .btn-save':"onSave",
    'click .remark-chk':'onRemarkChk'
  },
  render:function(){
    this.$el.html(this.template(this.model.toJSON()));
    // поиск всех возможных работ для выбранной продукции
    var res = {};
    for(var s in global_sectors){
      if(global_sectors[s]['is_active'])
      for(var w in global_sectors[s].works)
      if(global_sectors[s].works[w]['is_active'])
      {
        var gl_work = global_sectors[s].works[w];
        var is_find = true;
        /*var is_find = false;
        if(this.model.get("workorder")){
          for(var i=0;i<this.model.get("workorder").length && !is_find;++i){
            var wo = this.model.get("workorder")[i];
            for(var j in wo.plan_work)
            {
              if(wo.plan_work[j]['work_id']==gl_work['_id'])
              {
                is_find = true;
                break;
              }
            }
          }
        }*/
        if(is_find){
          if(!res[global_sectors[s]['type']])
            res[global_sectors[s]['type']] = {'type':global_sectors[s]['type'],'sectors':{}}
          if(!res[global_sectors[s]['type']]['sectors'][global_sectors[s]['_id']])
            res[global_sectors[s]['type']]['sectors'][global_sectors[s]['_id']] = {'_id':global_sectors[s]['_id'],'name':global_sectors[s]['name'],'code':global_sectors[s]['code'],'works':[],'is_active':global_sectors[s]['is_active']};
          res[global_sectors[s]['type']]['sectors'][global_sectors[s]['_id']]['works'].push(gl_work);
        }
      }
    }
    var hasWorkorders = false;
    // устанавливаем те, что менять нельзя
    for(var t in res){
      hasWorkorders = true;
      var arr = [];
      for(var s in res[t]['sectors'])
      {
        res[t]['sectors'][s].used = false;
        if(this.model.get("sectorlist"))
        {
          for(var i=0;i<this.model.get("sectorlist").length;++i){
            var sc = this.model.get("sectorlist")[i];
            if(sc['sector_id']==s){
              res[t]['sectors'][s].used = true;
              break;
            }
          }
        }
        arr.push(res[t]['sectors'][s]);
      }
      res[t]['sectors'] = arr;
      // сортируем
      res[t]['sectors'].sort(function(a,b){
        if(a.code<b.code)return -1;
        if(a.code>b.code)return 1;
        return 0
      });
      // заполняем
      this.$el.find(".modal-body").append(this.template_type(res[t]));

    }
    if(!hasWorkorders){
      showmsg("Для продукции не заданы наряды.")
      this.can_show = false;
    }
  },
  onShow:function(){
    var self = this;
    var tm = setInterval(function(){
        if(self.$el.find(".modal-header").height()>0){
          clearInterval(tm);
          self.calcHeight();
        }
    },100);
    $(window).resize(function(){
      self.calcHeight();
    });
  },
  // посчитать высоту дерева (учитывая,что высота диалога - 80%)
  calcHeight:function(){
    var mrg = this.$el.find(".modal-header").height()+this.$el.find(".modal-footer").height();
    var hh =$(window).height()*0.8-mrg-60;
    this.$el.find(".modal-body").css("height",hh+"px");
  },
  onHide:function(){
    this.$el.remove();
  },
  onSectorClick:function(e){
    var btn = $(e.target);
    if(!btn.hasClass("used")){
      if(btn.hasClass("selected")){
        btn.removeClass("selected");
        btn.parent().find(".matgroup-list").hide();
      }
      else
      {
        btn.addClass("selected");
        if(btn.parent().find(".matgroup-list .group-list").length>0)
          btn.parent().find(".matgroup-list").show();
        else{
          // заполняю структуру для материалов
          var id = btn.data("id");
          var data = {'sector_id':id,'materials':[],'donot_edit':true};

          var sv = new SectorEditView({model:data});
          sv.production = this.model;
          btn.parent().find(".matgroup-list").html("").append(sv.$el).show();
          this.sectors_edited.push(sv);
        }
      }
    }
  },
  onRemarkChk:function(e){
    var chk = $(e.currentTarget);
    var pr = chk.parents(".work-list:first");
    if(chk.is(":checked"))
        pr.find(".remark-frm").show();
    else
        pr.find(".remark-frm").hide();
   },
  onSave:function(){
    var res = [];
    if(this.sectors_edited.length>0){
      for(var i in this.sectors_edited){
        //var dt = this.sectors_edited[i].getDataForSave();
        var el = this.sectors_edited[i].$el;
        var pr = $(el).parent();
        // проверка на указание претензии в случае выбора "Устранение замечания"
        var remarks = {contains_remark:pr.find(".remark-chk").is(":checked")};
        if(remarks.contains_remark){
            var rs = pr.find(".remark-numbers").tokenInput('get');
            if(rs.length==0){
               showmsg("Необходимо указать хотя бы один номер претензии");
               return;
            }
            remarks.claims = rs;
            remarks.comments = pr.find(".remark-comments").val();
        }

        var edit_materials = [];
        el.find(".group-edit tr.element").each(function(){
          var row = $(this);
          if(row.find(".cb-select-item").prop('checked'))
            edit_materials.push({'global_id':row.data("gmid"), 'material_id':row.data('mid'), 'pto_size':0, 'status':5});
        });
        if(edit_materials.length>0){
          res.push({"sector_id":this.sectors_edited[i].model["sector_id"],"materials":edit_materials, "comment":this.$el.find(".comments textarea").val(), "remarks": remarks });
        }
      }
    }
    if(res.length>0){
      var obj = {'contract_id':App.Models.Contract.get("_id"),'production_id':this.model.get("_id"),"sectors":res};
      Routine.showLoader();
      var self = this;
      $.ajax({
        url: '/handlers/plannorm/add_new/',
        type: 'PUT',
        dataType: 'json',
        contentType: "application/json; charset=utf-8",
        data: $.toJSON(obj),
        timeout: 35000,
        success: function (result, textStatus, jqXHR) {
            Routine.hideLoader();
            if(result.status=='error'){
              showmsg(result.msg);
            }else
            if(result.status=="ok"){

            // обновление данных справочника материалов
            global_materials = result.materialsgroups;

             for(var i in result.result){
              //  self.model[i] = result.result[i];
              if(!self.model.get('sectorlist'))
                self.model.set('sectorlist',[]);
              self.model.get('sectorlist').push(result.result[i]);
              self.production_view.render();
             }
             $.jGrowl("Данные успешно сохранены", {'themeState':'growl-success'});
             self.$el.modal("hide");
            }else
            showmsg("Ошибка сервера");
        },
        error:function(result){
            Routine.hideLoader();
            showmsg("Ошибка сервера");
        }
      });
    }
    else
    {
      $.jGrowl("Нет даных на сохранение.", {'themeState':'growl-success'});
      //this.$el.modal("hide");
    }
  }
});

///---------------------------------------------------------------------------------------------------------
/// Форма редактирования продукции
///---------------------------------------------------------------------------------------------------------
var ProductionView = Backbone.View.extend({
  template:  _.template($('#productionTemplate').html()),
  events:{
    'click .sector-ttl':'onSectorClick',
    'click .add-normas':'onAddNormClick'
  },
  initialize:function(){
    this.contract_number = this.options['contract_number'];
    this.render();
  },
  render:function(){
    this.$el.html(this.template($.extend({},this.model.toJSON(),{contract_number: this.contract_number})));


  },
  onSectorClick:function(btn){
    var btn = $(btn.target);
    if(btn.hasClass("selected")){
      btn.removeClass("selected");
      btn.parent().find(".matgroup-list").hide();
    }
    else
    {
      btn.addClass("selected");
      var id = btn.data("id");
      for(var i=0;i<this.model.get("sectorlist").length;++i){
        var sc = this.model.get("sectorlist")[i];
        if(sc['_id']==id){
          var sv = new SectorEditView({model:sc});
          sv.production = this.model;
          btn.parent().find(".matgroup-list").html("").append(sv.$el).show();
          break;
        }
      }
    }
  },
  onAddNormClick:function(){
    var nf = new NormsAddForm({model:this.model});
    nf.production_view = this;
    if(nf.can_show)
      nf.$el.modal("show");
  }
});

///---------------------------------------------------------------------------------------------------------
/// Форма редактирования участка
///---------------------------------------------------------------------------------------------------------
var SectorEditView = Backbone.View.extend({
  template:  _.template($('#sectorEditTemplate').html()),
  production:null,
  initialize:function(){
    this.render();
  },
  events:{
    'click .gr-ttl':"onShowGroup"
  },
  render:function(){
    // список id материалов
    var mlist_ids = [];
    var all_mat_list = [];
    for(var i=0;i<global_sectors.length;++i){
      if(global_sectors[i]['_id']==this.model['sector_id']){
        var sc = global_sectors[i];
        for(var w=0;w<sc['works'].length;++w){
          for(var m in sc['works'][w]['materials']){
            if(mlist_ids.indexOf(sc['works'][w]['materials'][m])<0)
              mlist_ids.push(sc['works'][w]['materials'][m]);
          }
        }
      }
    }
    // заполняем материалы по id
    for(var k=0;k<global_materials.length;++k){
      if(global_materials[k]['is_active']){
        for(var mi in global_materials[k]['materials']){
          var m = global_materials[k]['materials'][mi];
          if(m['is_active'] && mlist_ids.indexOf(m['_id'])>=0){
            if(all_mat_list.indexOf(global_materials[k]['_id'])<0)
              all_mat_list.push(global_materials[k]['_id']);
          }
        }
      }
    }
    this.$el.html(this.template({'model':this.model,'almatlist':all_mat_list}));
  },
  onShowGroup:function(e){
    var btn = $(e.target);
    if(btn.hasClass("selected")){
      btn.removeClass("selected");
      btn.parent().find(".group-edit").hide();
    }else{
      btn.addClass("selected");
      if(btn.parent().find(".group-edit table").length>0)
        btn.parent().find(".group-edit").show();
      else{
        var grId = btn.data("id");
        var comments = [];
        if(this.model.group_comments){
          this.model.group_comments.map(function(item){
            if(item.group_id==grId){
              comments.push(item);
            }
          });
        }
        var gEdit = new GroupEditView({
          model:{
            '_id':this.model['_id'],
            'group_id':grId,
            'sector_id':this.model.sector_id,
            'production_count':this.production.get('count'),
            'workorder':this.production.get('workorder'),
            'materials':this.model.materials,
            'comments':comments,
            'remarks': this.model.group_remarks?this.model.group_remarks[grId]:null,
            'code': this.model.code
          },
          sector_model:this.model
        });
        btn.parent().find(".group-edit").html("").append(gEdit.$el).show();
      }
    }
  }
});

///---------------------------------------------------------------------------------------------------------
/// Форма отображения группы материалов
///---------------------------------------------------------------------------------------------------------
var GroupEditView = Backbone.View.extend({
  template:  _.template($('#groupEditTemplate').html()),
  //  template_row: _.template($('#groupEditRow').html()),
  group_id:null,
  initialize:function(){
    this.render();
  },
  events:{
    'click .closebtn':"onClose",
    'click .savebtn':"onSave",
    'click .remark-chk':'onRemarkChk'
  },
  render:function(){
    this.$el.html(this.template(this.model));

    var mSectorWorks = [];
    for(var i in global_sectors)
    {
      if(global_sectors[i]['_id']==this.model.sector_id){
        mSectorWorks = global_sectors[i]['works'];
        break;
      }
    }
    var mGroupMaterials = [];
    for(var i in global_materials){
      if(global_materials[i]["_id"]==this.model.group_id){
        var mlist = global_materials[i]['materials'];
        for(var j in mlist){

          // временно отключили проверку
          /*var isFind = false;
          if(mlist[j]['works'])
            for(var k=0; k<mlist[j]['works'].length && !isFind; ++k){
              for(var p in mSectorWorks){
                if(mSectorWorks[p]['_id']==mlist[j]['works'][k])
                {
                  isFind = true;
                  break;
                }
              }
            }*/
          var isFind = true;
          if(isFind){
            // проверяем, есть ли материал в нарядах
            /*var isIn = false;
            for(var n=0;n<this.model.workorder.length && !isIn;++n)
              for(var p=0;p<this.model.workorder[n]['plan_work'].length && !isIn;++p)
                for(var k=0; k<mlist[j]['works'].length && !isIn; ++k)
                  if(this.model.workorder[n]['plan_work'][p]['work_id']==mlist[j]['works'][k])
                    isIn = true;*/
            // mlist[j].is_workorder = isIn;
            mlist[j].is_workorder = true;
            mlist[j].group_code = global_materials[i]['code'];
            mGroupMaterials.push(mlist[j]);
          }
        }
        break;
      }
    }

    for(var i in mGroupMaterials){
      var isFind = false;
      // фильтрация характеристик, в результате отсеиваются пресеты
      var all_material_unique_props = (mGroupMaterials[i]['unique_props'] || []).filter(function(x){return x['type'] == 'prop'});
      for(var j=0;j<this.model.materials.length;++j){
        if(this.model.materials[j]['materials_id']==mGroupMaterials[i]['_id'] && (App.Views.Main.filterSelectedStatus.length==0 || App.Views.Main.filterSelectedStatus.indexOf(this.model.materials[j]['status'].toString())>-1)  ){
          var row = new GroupEditRowView({
            'model': new Backbone.Model({
              'gmid':mGroupMaterials[i]['_id'],
              'sku':mGroupMaterials[i]['sku_pto_proportion'],
              'mid':this.model.materials[j]['_id'],
              'is_workorder':mGroupMaterials[i].is_workorder,
              'code':mGroupMaterials[i]['code'],
              'name':mGroupMaterials[i]['name'],
              'production_count':this.model.production_count,
              'unit_pto':mGroupMaterials[i]["unit_pto"],
              'pto_size':this.model.materials[j]['pto_size'],
              'unique_props_info':this.model.materials[j]['unique_props_info'],
              'status':this.model.materials[j]['status'],
              'is_clone':false,
              'unique_props_arr': all_material_unique_props,
              'group_code':mGroupMaterials[i]['group_code'],
              'allowance': 'allowance' in this.model.materials[j]? this.model.materials[j]['allowance']:0,
              'note': 'note' in this.model.materials[j]? this.model.materials[j]['note']:'',
            })
        });
          this.$(".elements-list").append(row.$el);
          isFind = true;
        }
      }
      if(isFind==false &&  mGroupMaterials[i]['is_active']  && (App.Views.Main.filterSelectedStatus.length==0 || App.Views.Main.filterSelectedStatus.indexOf('4')>-1) ){
        var row = new GroupEditRowView({
          'model': new Backbone.Model({
            'gmid':mGroupMaterials[i]['_id'],
            'sku':mGroupMaterials[i]['sku_pto_proportion'],
            'mid':"",
            'is_workorder':mGroupMaterials[i].is_workorder,
            'code':mGroupMaterials[i]['code'],
            'name':mGroupMaterials[i]['name'],
            'production_count':this.model.production_count,
            'unit_pto':mGroupMaterials[i]["unit_pto"],
            'pto_size':0,
            'allowance': 0,
            'note': '',
            'unique_props_info':{'key':null, 'items':[], 'type': 'prop', 'name':''},'status':4, 'is_clone':false, 'unique_props_arr': all_material_unique_props, 'group_code':mGroupMaterials[i]['group_code']
          })
        });
        this.$(".elements-list").append(row.$el);
      }
    }
    $(".remark-numbers",this.$el).tokenInput("/handlers/workorder_getclaims/",{theme: "facebook",zindex:1300,hintText:"Введите для поиска",noResultsText:"Ничего не найдено",searchingText:"Поиск...",allowFreeTagging:false, preventDuplicates:true});

    var remarks =  this.model['remarks'];
    if(remarks){
      for(var i in remarks.claims){
          $(".remark-numbers",this.$el).tokenInput('add',remarks.claims[i]);
      }
      this.$(".remark-comments").val(remarks.comments);
    }
  },
  onClose:function(e){
    // нужно проверить на флаг donot_edit
    var gr = this.$el.parents('.group:first');
    gr.find(".group-edit").hide();
    gr.find('.gr-ttl').removeClass('selected');
  },
  onRefresh:function(e){
    // нужно проверить на флаг donot_edit
    var gr = this.$el.parents('.group:first');
    // gr.find(".group-edit").hide();

    gr.find('.gr-ttl').parent().find(".group-edit").empty();
    gr.find('.gr-ttl').removeClass('selected').trigger("click");
  },
  onRemarkChk:function(e){
    if(this.$el.find(".remark-chk").is(":checked"))
        this.$el.find(".remark-frm").show();
    else
        this.$el.find(".remark-frm").hide();
  },
  onSave:function(){
    var self = this;
    function ajaxSave(data_res){
      Routine.showLoader();
      $.ajax({
        url: '/handlers/plannorm/update/',
        type: 'PUT',
        dataType: 'json',
        contentType: "application/json; charset=utf-8",
        data: $.toJSON(data_res),
        timeout: 35000,
        success: function (result, textStatus, jqXHR) {
            Routine.hideLoader();
            if(result.status=='error')
            {
              showmsg(result.msg);
              return;
            }
            if(result.status=="ok")
            {
              for(var i in result.result)
                 self.options.sector_model[i] = result.result[i];
              /*for(var i in self.model)
                if(i in result.result)
                 self.model[i] = result.result[i];*/

              $.jGrowl("Данные успешно сохранены", {'themeState':'growl-success'});
              //self.onClose();
              //self.$el.remove();
              self.onRefresh();
            }
            else
              showmsg("Ошибка сервера");
        },
        error:function(result){
            Routine.hideLoader();
            showmsg("Ошибка сервера");
        }
      });
    }

    if(this.$el.find(".value.error").length){
      showmsg("Не заданы объемы элементов.");
      return;
    }
    this.$('tr.element').each(function(){
      var elem = $(this).data('view');
      elem.checkBeforeSave();
    });
    if(this.$el.find(".characters.error").length){
      showmsg("Для отмеченных элементов поле индивидуальных характеристик обязательно для заполнения.")
      return;
    }
    var saved_elements = [];
    //var is_correction = false;
    var correction_list = [];
    this.$('tr.element').each(function(){
      var elem = $(this).data('view');
      var dt = elem.getDataForSave();
      var cor = elem.getCorrection();
      if(cor!=false){
        correction_list.push(cor);
      }
      //is_correction = is_correction || elem.isCorrection();
      if(dt)
        saved_elements.push(dt);
    });
    if(saved_elements.length==0)
    {
      showmsg("Не заданы объемы для сохранения.");
      return;
    }

    //console.log(saved_elements);
    var remarks = {'contains_remark':this.$(".remark-chk").is(":checked")};
    if(remarks.contains_remark){
      var rs = this.$(".remark-numbers").tokenInput('get');
      if(rs.length==0){
        showmsg("Необходимо указать хотя бы один номер претензии");
        return;
      }
      remarks.claims = rs;
      remarks.comments = this.$(".remark-comments").val();
    }
    var res = {'_id':this.model['_id'],'remarks':remarks, 'materials': saved_elements, "comment":this.$el.find(".comments textarea").val(), 'group_id':this.model.group_id};

    if(correction_list.length>0)
    {
      var corrForm = new CorrectionFormView();
      corrForm.show();
      corrForm.on('modaldlg:datasave',function(){
        res.correction = {'comment':corrForm.correction_text, 'correction_list':correction_list };
        ajaxSave(res);
      });
    }else
      ajaxSave(res);
    return;
  }
});


var GroupEditRowView = Backbone.View.extend({
  template: _.template($('#groupEditRow').html()),
  initialize:function(){
    this.render();
  },
  events:{
    'click .add-clone':"onAddClone",
    'change .status select':'onStatusChange',
    'change .value input':"onValueChange",
    'click .remove-clone':"onRemoveClone"
  },
  render:function(){
    var self = this;
    this.setElement($(jQuery.trim(this.template(this.model.toJSON()))));
    this.$el.data('view',this);
    this.$(".value input").numeric();
    this.$(".allowance input").numeric();
    var material_all_unique_props_list = this.model.get('unique_props_arr');
    var material_all_unique_props = {};
    for(var i in material_all_unique_props_list)
      material_all_unique_props[material_all_unique_props_list[i]['key'].toString()] = material_all_unique_props_list[i];
    // задействованные характеристики
    var used_unique_props = this.model.get('unique_props_info');
    var ddl = this.$('.ddl-unique-props');
    ddl.multiselect({
      buttonContainer: '<span class="dropdown" />',
      includeSelectAllOption: false,
      enableCaseInsensitiveFiltering: true,
      numberDisplayed: 100,
      filterPlaceholder: 'Найти',
      nonSelectedText: "Выбрать",
      nSelectedText: "",
      selectAllText: "Все",
      maxHeight: 400,
      buttonClass: 'btn btn-link',
      buttonText: function(options) {
        if (options.length === 0)
          return 'Не заданы';
        else if (options.length > this.numberDisplayed)
            return 'Выбрано '+options.length + '  характеристик';
        else {
          var selected = '';
          options.each(function() {
            //selected += $(this).html() + '; ';
            selected += $(this).data('name') + '; ';
          });
          return selected.substr(0, selected.length -2);
        }
      },
      onChange: function(element, checked) {
           used_unique_props['items'] = [];
           $(ddl).next().find('input:visible').each(function(){
            if($(this).val()!="" && $(this).val()!='multiselect-all' && !$(this).prop('disabled') && $(this).prop('checked'))
              used_unique_props['items'].push(material_all_unique_props[$(this).val()])
           });
          //console.log(used_unique_props);
          $(ddl).parents('.characters:first').find('.tb-unique-props').data('value', used_unique_props);
          self.model.set('unique_props_info',used_unique_props);

          if(used_unique_props['items'].length==0)
            $(ddl).parents('.element:first').find('.lbl-unique-prop-key').html('');
          else if(used_unique_props['items'].length==1)
            $(ddl).parents('.element:first').find('.lbl-unique-prop-key').html('.'+used_unique_props['items'][0]['key']);
          else
            $(ddl).parents('.element:first').find('.lbl-unique-prop-key').html('.*').prop('title', 'Будет назначен после сохранения');
      }
    });

    var box = this.$el;
    /*if(box.data('status')===0){
      $(box).find('.add-clone').data('disabled', false);
      $(box).find('.ddl-unique-props').prop('disabled', false);
      $(box).find('.ddl-unique-props').multiselect('enable');
      $(box).find('.volume').prop('disabled', false);
    }else{
      $(box).find('.add-clone').data('disabled', true);
      $(box).find('.ddl-unique-props').prop('disabled', true);
      $(box).find('.ddl-unique-props').multiselect('disable');
      $(box).find('.volume').prop('disabled', true);
    }*/

    // Установить выбранные индивидуальные характеристики
    var used_keys = [];
    if(used_unique_props){
      for(var i in used_unique_props['items'])
        if(used_unique_props['items'][i]['key'])
          used_keys.push(used_unique_props['items'][i]['key'].toString());
    }

    this.$('.ddl-unique-props option').each(function(x){
      if(used_keys.indexOf($(this).val())>-1)
        $(this).prop('selected', true);
    });
    this.$('.ddl-unique-props').multiselect('rebuild');
  },
  /*fillModel:function(){
    //console.log(this.model);
    this.model.set('pto_size', this.$(".value  input").val());
    this.model.set('status', this.$('.status select').val());
    //this.model.set('unique_props_info',this.$(".tb-unique-props").data('value'));
  }, */
  onRemoveClone:function(e){
    this.$el.remove();
  },
  onAddClone:function(e){
    //        this.fillModel();
    var data = new Backbone.Model($.extend( this.model.toJSON(),{
      'is_clone':true,
      'pto_size':this.$(".value  input").val(),
      'status': 0,
      'unique_props_info': {'key':null, 'items':[], 'type': 'prop', 'name':''}
    }));
    var row = new GroupEditRowView({'model': data});
    this.$el.after(row.$el);
  },
  onStatusChange:function(e){
    var sel = $(e.target);
    var val = Routine.strToInt(sel.val());
    var box = this.$el;

    if($(box).data('status')==4 && val!=5 && val!=4)
    {
      sel.val(4);
      val = 4;
      showmsg("Нарушение порядка статусов");
    }
    // поля разлочиваем только для статуса "в расчете"
    if(val===0){
      if($(box).data('status')==3 || $(box).data('status')==2 || $(box).data('status')==1){
        $(box).find('.ddl-unique-props').prop('disabled', true);
        $(box).find('.ddl-unique-props').multiselect('disable');
      }else{
        $(box).find('.ddl-unique-props').prop('disabled', false);
        $(box).find('.ddl-unique-props').multiselect('enable');
      }
      $(box).find('.add-clone').data('disabled', false);
      $(box).find('.volume').prop('disabled', false);
    }else{
      $(box).find('.add-clone').data('disabled', true);
      $(box).find('.ddl-unique-props').prop('disabled', true);
      $(box).find('.ddl-unique-props').multiselect('disable');
      $(box).find('.volume').prop('disabled', true);
    }

    for(var i =0; i<7;i++)
      $(box).removeClass('status_' + i.toString());
    $(box).addClass('status_' + val.toString());
    //$(box).data('status',val);

    var volume = $(box).find(".value input");
    if((val==1 || val==3 || val==0) && parseFloat(volume.val())==0)
    {
      volume.parent().addClass('error');
      showmsg("Необходимо указать объем");
    }
    else
      volume.parent().removeClass('error');
  },
  onValueChange:function(e){
    var volume = $(e.target);
    var val = parseFloat(volume.val() || 0);
    var sttr = this.$(".status select");
    if(val==0 && (sttr.val()==1 || sttr.val()==3)){
      volume.parent().addClass('error');
      showmsg("Необходимо указать объем");
    }else{
      volume.parent().removeClass('error');
    }
  },
  checkBeforeSave:function(){
    if( this.model.get('used_unique_props')=="" &&
      (this.model.get('is_clone') ||  this.model.get('sku')==0 || ($(this).find(".value input").val() && $(this).find(".value input").val()!="0" && $(this).find(".ddl-unique-props").data("source") &&  $(this).find(".ddl-unique-props").data("source").length>0) ) )
        $(this).find(".characters").addClass("error");
      else
        $(this).find(".characters").removeClass("error");
  },
  getDataForSave:function(){
    //var data = {'edit':null, 'remove':null};
    if(this.$('.status select').val().toString()=='4')
      return null;
      //data.remove = this.model.get('mid');
    else
      return {
        global_id: this.model.get('gmid'),
        material_id: this.model.get('is_clone')?'':this.model.get('mid'),
        pto_size:this.$('.value input').val(),
        unique_props_info: this.model.get('unique_props_info'),
        status:this.$(".status select").val(),
        allowance: this.$('.allowance input').val(),
        note: this.$('.note input').val(),
      };
  },
  // получить корректировку
  getCorrection:function(){
    var old = this.$el.data('status');
    if((old==3 || old==2 || old==1) && (this.$('.value input').val()!=this.model.get('pto_size')))
    {
      var res = {'global_id': this.model.get('gmid'), 'material_id': this.model.get('is_clone')?'':this.model.get('mid'), 'pto_size':this.$('.value input').val(), 'unique_props_info': this.model.get('unique_props_info'), 'status':this.$(".status select").val()};
      res['old_status'] = old;
      res['old_pto_size'] = this.model.get('pto_size');
      //console.log(this.model);
      res['unit_pto'] = this.model.get('unit_pto');
      var self = this;
      var gmid = self.model.get('gmid');
      var mtl = null;
      global_materials.map(function(gm){
        var qq = gm.materials.filter(function(mat){return (mat['_id']==gmid);})
        if(qq.length>0){
          mtl = {'group':{'_id':gm['_id'], 'name':gm['name'], 'code':gm['code']}, 'material':{'_id':qq[0]['_id'], 'code':qq[0]['code'], 'name':qq[0]['name'] }};
        }
      });
      res['material'] = mtl;
      return res;
    }
    else
      return false;
  }
});

///---------------------------------------------------------------------------------------------------------
/// Форма истории
///---------------------------------------------------------------------------------------------------------
var HistoryView = Backbone.View.extend({
  contract_number:0,
  templates: {
    main:_.template($("#changeHistoryTemplate").html()),
    filters: _.template($("#changeHistoryFilterTemplate").html()),
  },
  events:{
     'click .btn-filter':'onSearch',
     'keypress .tb-material-key': 'onSearchKeyPress'
  },
  initialize:function(){
    this.contract_number = this.options.contract_number;
    this.$el = $("#plan-norm-history");
    this.$el.html("");
    this.loadHistory();
  },
  loadHistory:function(){
    Routine.showLoader();
    var self = this;
    $.ajax({
      url: '/handlers/plannorm/get_history/'+this.contract_number,
      type: 'GET',
      dataType: 'json',
      contentType: "application/json; charset=utf-8",
      timeout: 35000,
      success: function (result, textStatus, jqXHR) {
        Routine.hideLoader();
        if(result.status=='error'){
          $.jGrowl(result.msg, { 'themeState':'growl-error', 'sticky':false, life: 10000 });
        }
        else if(result.status=="ok"){
         self.data = result.contract;
         self.render();
        }
        else
          $.jGrowl('Ошибка сервера', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      }
    }).fail(function(jqXHR, textStatus, errorThrown ) {
      $.jGrowl('Ошибка сервера:' + errorThrown, { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      Routine.hideLoader();
    });
  },
  clear: function(){
    this.$el.html("");
  },
  render: function(only_filters){
    var self = this;
    var only_filters = only_filters || false;
    self.$el.html("");
    if(only_filters){
      self.$el.append(self.templates.filters(self.data));
    }else{
      self.$el.append(self.templates.filters(self.data));
      self.$el.append(self.templates.main(self.data));
    }

    // show detail
    self.$el.find(".change-more").click(function(e){
      self.onMore(e);
    });

    if(this.product_number)
      this.$el.find('.ddl-products').val(this.product_number);
    if(this.material_code)
      this.$el.find('.tb-material-key').val(this.material_code);

  },
  onMore:function(e){
    if($(e.currentTarget).data('is_shown')){
      $(e.currentTarget).data('is_shown',false);
      $(e.currentTarget).parents("tr:first").next().hide()
    }else{
      $(e.currentTarget).data('is_shown',true);
      $(e.currentTarget).parents("tr:first").next().show();
    }
  },
  onSearchKeyPress: function(e){
    if(e.keyCode==13)
      this.onSearch(e);
  },
  /**
   * Search by history
   */
  onSearch: function(e){
    var self = this;

    $('body').addClass('wait');
    self.$el.find('.tb-material-key').addClass('wait');
    self.$el.find('.btn-filter').addClass('wait');

    setTimeout(function(){
      var product_number = self.$el.find('.ddl-products').val();
      var material_code = self.$el.find('.tb-material-key').val();
      self.product_number = product_number;
      self.material_code = material_code;

      if(material_code){
        var res = self.doSearch(product_number, material_code);
        // если по заданным параметрам ничего не найдено, то выдаем сообщение об этом
        if(res.length==0){
          self.render(true);
          self.$el.append("<span class='lbl' style='font-size:14px;'>Ничего не найдено</span>");
          $('body').removeClass('wait');
          self.$el.find('.tb-material-key').removeClass('wait');
          self.$el.find('.btn-filter').removeClass('wait');
          return;
        }

        var used_products = {};
        res.map(function(item){
          used_products[item.product_number] = item.product_number;
          var box = self.$el.find('[data-product_key="'+item.product_number+'"]');
          box.find('[data-key="'+item.date.replace(' ','_')+'"]').data('is_shown',true).parents("tr:first").next().css("display", "table-row");
        });

        // скрыть ен задействованные даты
        self.$el.find(".change-more").each(function(){
          if(!$(this).data('is_shown'))
            $(this).parents("tr:first").hide();
        });

        // скрыть незадействованые продукции
        self.data.productions.map(function(product){
          if(!(product.number in used_products))
            self.$el.find('[data-product_key="'+product.number+'"]').hide();
        });
      }
      else
       self.render();

      $('body').removeClass('wait');
      self.$el.find('.tb-material-key').removeClass('wait');
      self.$el.find('.btn-filter').removeClass('wait');
    },150);
  },
  doSearch: function(product_number, material_code_query){
    var result = [];
    this.data.productions.map(function(product){
      if(!product_number || product_number == product.number.toString()){
        (product.sectorlist || []).map(function(sector){
          (sector.change_history || []).map(function(ch){
            //------
            if(ch['type'] == 'update'){
              (ch.data || []).map(function(item){
                if(item.type =='add'){
                  var material_info = App.getMaterialInfoByGlobalId(item['new']['global_id']);
                  if(material_info){
                    var tmp_key = material_info['group_code'] + '.' + material_info['material_code']
                    // if(material_code_query.indexOf(tmp_key)>-1){
                    if(material_code_query == tmp_key){
                      result.push({
                        date: Routine.convertDateToLocalTime(ch["date"]),
                        group_code: material_info['group_code'],
                        group_name: material_info['group_name'],
                        material_code: material_info['material_code'],
                        material_name: material_info['material_name'],
                        product_number: product.number.toString()
                      });
                    }
                  }
                }
                else{
                  var material_info = App.getMaterialInfoByGlobalId(item['new']['global_id']);
                  if(material_info){
                    var tmp_key = material_info['group_code'] + '.' + material_info['material_code']
                    // if(material_code_query.indexOf(tmp_key)>-1){
                    if(material_code_query == tmp_key){
                      result.push({
                        date: ch["date"].toString().replace(' ','_'),
                        group_code: material_info['group_code'],
                        group_name: material_info['group_name'],
                        material_code: material_info['material_code'],
                        material_name: material_info['material_name'],
                        product_number: product.number.toString()
                      });
                    }
                  }
                }
              });
            }
            //------
          });
        });
      }
    });
    return result;
  }
});


///---------------------------------------------------------------------------------------------------------
/// Форма ввода корректировки
///---------------------------------------------------------------------------------------------------------
var CorrectionFormView = Backbone.View.extend({
  template: _.template($("#correctionsForm").html()),
  correction_text:'',
  initialize:function() {
    this.render();
  },
  events:{
    'click .btn-save':"onSave",
    'hidden':"onHide"
  },
  render:function(){
     this.$el.html(this.template());
  },
  show:function(){
    this.$el.modal('show');
    this.$('textarea').focus();
  },
  onSave:function(){
    this.correction_text = this.$('textarea').val();
    if(this.correction_text==''){
      showmsg("Необходимо указать причину корректировки");
    }else{
      this.trigger('modaldlg:datasave');
      this.$el.modal('hide');
    }
  },
  onHide:function(){
    this.$el.remove();
  }
});


///---------------------------------------------------------------------------------------------------------
/// Форма импорта данных
///---------------------------------------------------------------------------------------------------------
App.Views.ImportDataView = Backbone.View.extend({
  uploaded_file_info: null,
  events:{
    'click .btn-import-data':'onImportData',
    'change .ddl-production': 'onSelectProduction'
  },

  initialize: function(){
    Backbone.off("file_upload:complete");
    Backbone.on("file_upload:complete",this.file_upload_complete,this);
    //this.contract_number = this.options['contract_number'];
    this.render();
  },

  render: function(){
    // инициализация загрузки файла с данными для импорта
    this.init_upload_manager();
    // заполнение списка продукции
    var ddlProductions = this.$el.find('.ddl-production');
    $(ddlProductions).empty();
    $(ddlProductions).append('<option value="">Выберите продукцию</option>');
    _.each(this.model.get('productions'), function (item) {
      $(ddlProductions).append('<option value="'+item['_id']+'" data-number ="'+item['number']+'" data-name ="'+item['name']+'">'+item['number'] + '.' + item['name']+'</option>');
    });
  },

  /**
   * Событие смены продукции
   */
   onSelectProduction: function(e){
    this.activate_import_button();
   },

  /**
   * Активировать кнопку импорта
   */
   activate_import_button: function(){
    this.$el.find('.btn-import-data').removeClass('btn-primary');
    if(this.$el.find('.ddl-production').find('option:selected').val() && this.uploaded_file_info)
      this.$el.find('.btn-import-data').addClass('btn-primary');
   },

  /**
  * Определение контрола загрузки файлов
   */
  init_upload_manager: function(){
    this.fileManager = new Backbone.UploadManager({
        title: 'Файл с данными:',
        uploadUrl: '/handlers/plannorm/upload_document/',
        acceptFileTypes: /(xls)|(xlsx)$/i,
        autoUpload: true,
        singleFileUploads: true,
        maxNumberOfFiles: 1,
        maxFileSize: 104857600,
        documentType: 'plannorms_xls_data',
        make_files_list: false,
        clear_control_after_upload: false,
    }).renderTo('.source-files');
  },

  /**
   * Событие на завершение загрузки файла
   */
  file_upload_complete: function(e){
    var uploaded_file = e[0].data;
    var new_file = e[1].data;
    // данные на сохранение
    this.uploaded_file_info =  {'size': new_file['size'],'name': new_file['name']};
    this.activate_import_button();
  },

  /**
   * Событие кнопки импорта данных
   */
   onImportData: function(e){
    var self = this;
    // проверка входных данных
    var sel_production = this.$el.find('.ddl-production').find('option:selected');
    if(!sel_production.val())
    {
      $.jGrowl('Не выбрана продукция для которой необходимо выполнить импорт данных.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      return;
    }
    if(!this.uploaded_file_info){
      $.jGrowl('Не задан файл с данными для импорта.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      return;
    }
    // отправка запроса на сервер
    Routine.showLoader();
    $.ajax({
      type: "PUT",
      url: "/handlers/plannorm/import_data/",
      data: JSON.stringify({
        'contract_id': this.model.get('contract_id'),
        'contract_number': this.model.get('contract_number'),
        'product_id': sel_production.val(),
        'product_number': sel_production.data('number'),
        'product_name': sel_production.data('name'),
        'file_info': this.uploaded_file_info
      }),
      timeout: 35000,
      contentType: 'application/json',
      dataType: 'json',
      async:true
    }).done(function(result) {
      // сбрасываем информацию о файле с данными для импорта
      self.uploaded_file_info = null;
      self.init_upload_manager();
      self.activate_import_button();
      // событие на обновление всех данных
      Backbone.trigger('importdata:all_data_import_complete',[self, result['data']]);

      if(result['status']=="ok")
        $.jGrowl('Все данные успешно импортированы.', { 'themeState':'growl-success', 'sticky':true });
      else
      {
        $.jGrowl('Данные импортировнны с ошибками.' + result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 10000 });
        // если пришли ошибочные данные, то отображем их
        if(result['result_log'] && result['result_log'].length>0)
          self.$el.find('.import-data-result-box').html(new App.Views.ImportDataErrorsListView({collection : new App.Collections.ImportDataErrorsCollection(result['result_log'])}).el);
      }
    }).always(function(){Routine.hideLoader()});
   }
});

///---------------------------------------------------------------------------------------------------------
///---------Представление списка ошибок после импорта
///---------------------------------------------------------------------------------------------------------
App.Views.ImportDataErrorsListView = Backbone.View.extend({
  tagName:'div',
  className:'line',
  templates: {
    main:_.template($("#ImportDataErrorsListTemplate").html()),
  },
  events:{},
  /**
   * Инициализация
  **/
  initialize: function(){
    this.render();
    return this;
  },
  /**
  * Отрисовка
  **/
  render: function()
  {
    var self = this;
    // Очистка формы
    this.clear();
    // отрисовка
    this.$el.append(this.templates.main());
    var i = 0;
    _.each(this.collection.models, function (item) {
      i++;
      this.$el.find('.data-errors').append(new App.Views.ImportDataErrorsItemView({model: item, i: i}).render().el);
    }, this);
    return this;
  },

  /**
   * Очистка формы
  **/
  clear: function()
  {
    this.$el.empty();
  }
});

App.Views.ImportDataErrorsItemView = Backbone.View.extend({
  tagName:'tr',
  templates: {
    main:_.template($("#ImportDataErrorsItemTemplate").html()),
  },
  events:{},
  /**
   * Инициализация
  **/
  initialize: function(){
    this.index = this.options['i'];
  },
  /**
  * Отрисовка
  **/
  render: function()
  {
    var self = this;
    // Очистка формы
    this.clear();
    // отрисовка
    if(this.model.get('errors') && this.model.get('errors').length>0)
      this.$el.addClass('error');
    this.$el.append(this.templates.main($.extend({},this.model.toJSON(),{i:this.index})));
    return this;
  },
  /**
   * Очистка формы
  **/
  clear: function()
  {
    this.$el.empty();
  }
});


///---------------------------------------------------------------------------------------------------------
///---------Представление списка попыток импорта данных из XLS
///---------------------------------------------------------------------------------------------------------
App.Views.ImportDataHistoryListView = Backbone.View.extend({
  templates: {
    main:_.template($("#ImportDataHistoryListTemplate").html()),
  },
  events:{
    'import_history:detail': 'show_details',
  },
  /**
   * Инициализация
  **/
  initialize: function(){
    this.render();
    return this;
  },
  /**
  * Отрисовка
  **/
  render: function()
  {
    var self = this;
    // Очистка формы
    this.clear();
    // отрисовка
    this.$el.append(this.templates.main());
    var i = 0;
    _.each(this.collection.models, function (item) {
      i++;
      this.$el.find('.data-body').append(new App.Views.ImportDataHistoryItemView({model: item, i: i}).render().el);
    }, this);
    return this;
  },
  /**
   * Очистка формы
  **/
  clear: function()
  {
    this.$el.empty();
  },

  /**
   * ОТобразиоть детализацию ошибок
  */
  show_details: function(e, data){
    this.$el.find('.detail-list-box').html(new App.Views.ImportDataErrorsListView({collection : new App.Collections.ImportDataErrorsCollection(data)}).el);
  }

});

App.Views.ImportDataHistoryItemView = Backbone.View.extend({
  tagName:'tr',
  templates: {
    main:_.template($("#ImportDataHistoryItemTemplate").html()),
  },
  events:{
    'click .lnk-detail':'onDetailClicked'
  },
  /**
   * Инициализация
  **/
  initialize: function(){
    this.index = this.options['i'];
  },
  /**
  * Отрисовка
  **/
  render: function()
  {
    var self = this;
    // Очистка формы
    this.clear();
    // отрисовка
    this.$el.append(this.templates.main($.extend({},this.model.toJSON(),{i:this.index})));
    return this;
  },
  /**
   * Очистка формы
  **/
  clear: function()
  {
    this.$el.empty();
  },

  /**
   *  Обработка события детализации истории
   */
   onDetailClicked: function(e){
    $(this.el).trigger('import_history:detail',[this.model.get('errors')]);
   }
});

