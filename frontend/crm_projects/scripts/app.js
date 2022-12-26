var App = {
  Models: {},
  Views:{},
  Collections:{},
  Route:null,
  ListFilters:{'factories':[], 'statuses':[]},
  initialize:function(){
    App.Views.Main = new AppView();
    App.Route = new AppRouter();
    Backbone.history.start();
  }
};


App.Models.ProjectModel = Backbone.Model.extend({
  idAttribute: "_id",
  defaults:{
    'project_name':'',
    'project_personal_from':'',
    'project_personal_to':'',
    'project_start':'',
    'project_finish':'',
    'project_note':'',
    'linked_orders':null,
    'clients':null
  },
  url:"/handlers/projects/project"
});


var AppRouter = Backbone.Router.extend({
  routes: {
    "": "index",
    "search/:id": "show",  // редактировать запись
    "add":"add",
    "list/:page":"list", // список с пейджером
    "find/*queue":"find"
  },
  project_list: null,

  index:function(){
    App.Route.navigate("list/1",true);
  },
  add:function(){
    App.Views.Project = new App.Views.ProjectView({model:new App.Models.ProjectModel(), is_edited:true});
    $("#projectEditPnl").html("").append(App.Views.Project.$el);
    //this.$("#projectEditPnl").html("").append(App.Views.Project.$el);
  },
  show:function(id){
    Routine.showLoader();
    var md = new App.Models.ProjectModel();
    md.fetch({url:"/handlers/projects/project/"+id,success:function(e){
      Routine.hideLoader();
       App.Views.Project = new App.Views.ProjectView({model:md});
       $("#projectEditPnl").html("").append(App.Views.Project.$el);
      //this.$("#projectEditPnl").html("").append(App.Views.Project.$el);
    }, error:function(e){
      $.jGrowl('Ошибка сервера. Повторите попытку позже.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      Routine.hideLoader();
    }});
  },
  list:function(page){
    this.project_list = new App.Views.ProjectList({page:page});
  },
  find:function(queue){
    $("#tbProjectName").val(queue);
    this.project_list = new App.Views.ProjectList({queue:queue, page:'all'});
  }
});


var AppView = Backbone.View.extend({
  el:$("#projectContainer"),

  initialize:function(){
    var self = this;
    $("#btnNewProject").click(function(){
      self.OnNew();
    });
    $("#btnShowAll").click(function(){
      App.Route.navigate("list/all",true);
    });
    $("#btnProjectFind").click(function(){
      if($("#tbProjectName").val()){
        App.Route.navigate("find/"+encodeURI($("#tbProjectName").val()),true)
      }
    });
    $("#tbProjectName").keydown(function(event){
      if ( event.which == 13 ) {
        if($("#tbProjectName").val()){
          App.Route.navigate("find/"+encodeURI($("#tbProjectName").val()),true)
        }
      }
    })
  },
  OnNew:function(){
    App.Route.navigate("add",true);
  }
});


App.Views.ProjectView = Backbone.View.extend({
  template:_.template($("#projectEditTemplate").html()),
  template_view:_.template($("#projectViewTemplate").html()),
  is_edited:false,
  initialize:function(){
    if(this.options.is_edited)
      this.is_edited = true;
    this.render();
  },
  events:{
    'click .save-full-data':"onSave",
    'click .edit-full-data':'onEdit',
    'click .close-full-data':'onCancel'
  },
  render:function(){
    if(!this.is_edited){
      this.$el.html(this.template_view(this.model.toJSON()));
    }else{

      this.$el.html(this.template(this.model.toJSON()));
      this.$('.project-personal-from, project-personal-to').numeric({ decimal: false, negative: false });
      this.$('.project-date-start, .project-date-finish').datepicker({weekStart:1, format:'dd.mm.yyyy'});
      var self = this;
      this.$('.project-date-start, .project-date-finish').on('changeDate', function(){
        self.resetDateLength();
      }).on("blur", function(){
          self.resetDateLength();
      });
      this.resetDateLength();


      this.$el.find(".same-order-list").tokenInput('/handlers/contracts/search_order_tn', {
        method:'POST',
        minChars:2,
        hintText:'Поиск заявки',
        noResultsText:'Заявки не найдены',
        cont:null,
        searchingText:'Поиск',
        onResult:function(results){
          var nums = [self.model.get('number')+''];
          var nl = self.$(".same-order-list").tokenInput('get');
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
          var nl = self.$(".same-order-list").tokenInput('get');
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


      _.each(this.model.get('linked_orders'),function(item){
        self.$el.find(".same-order-list").tokenInput('add',{'id':item,'name':item});
      });

      this.$el.find(".clients-list").tokenInput('/handlers/clientfind/', {
        method:'GET',
        minChars:1,
        hintText:'Поиск клиента',
        noResultsText:'Клиент не найден',
        cont:null,
        searchingText:'Поиск',
        onResult:function(results){
          var nl = self.$(".clients-list").tokenInput('get');
          var res = [];
          for(var i in results.result){
            var is_find= false;
            for(var j in nl){
              if(nl[j]['id']==results.result[i]['id'])
              {
                is_find = true;
                break;
              }
            }
            if(!is_find)
              res.push(results.result[i]);
          }
          return res;
        },
        onCachedResult:function(results){
           var nl = self.$(".clients-list").tokenInput('get');
          var res = [];
          for(var i in results.result){
            var is_find= false;
            for(var j in nl){
              if(nl[j]['id']==results.result[i]['id'])
              {
                is_find = true;
                break;
              }
            }
            if(!is_find)
              res.push(results.result[i]);
          }
          return res;
        },
        resultsFormatter: function(item) {
          return "<li><b>" + item.name + '</b><span style="width:100%; display:inline-block; font-size:10px;border-bottom:solid 1px #999;">' + item.cont + "</span></li>"
        }
      });


      _.each(this.model.get('clients'),function(item){
        self.$el.find(".clients-list").tokenInput('add',{'id':item.id,'name':item.name});
      });
    }
  },
  resetDateLength:function(){
    var start = this.$('.project-date-start').val();
    var end = this.$('.project-date-finish').val();
    if(start && end){
      start = Routine.parseDate(start,"dd.mm.yyyy");
      end = Routine.parseDate(end,"dd.mm.yyyy");
      this.$(".project-date-length").html(Math.ceil(moment(end).diff(start,'month')));
    }else
      this.$(".project-date-length").html("0");
  },
  onSave:function(e){
    var ttl = this.$(".project-name").val();
    if(!ttl){
      $.jGrowl('Укажите название проекта', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      return;
    }
    var linked_orders = [];
    var nl = this.$(".same-order-list").tokenInput('get');
    for(var i in nl)
      linked_orders.push(parseInt(nl[i]['name']));
    var clients = [];
    var cl_list = this.$(".clients-list").tokenInput('get');
    for(var i in cl_list)
      clients.push({'id':cl_list[i].id,'name':cl_list[i].name});
    this.model.set({
      "project_name":ttl,
      "project_personal_to":parseInt(this.$(".project-personal-to").val()),
      "project_personal_from":parseInt(this.$(".project-personal-from").val()),
      "project_start":this.$('.project-date-start').val(),
      'project_finish':this.$('.project-date-finish').val(),
      'project_note':this.$('.project-note').val(),
      "linked_orders":linked_orders,
      "clients":clients
    });
    var self = this;
    Routine.showLoader();
    this.model.save({},{
      success:function(){
        App.Route.navigate("search/"+self.model.get('_id'),false);
        $.jGrowl('Данные успешно сохранены.', { 'themeState':'growl-success', 'sticky':false, life: 10000 });
        self.is_edited = false;
        self.render();
        Routine.hideLoader();
      },
      error:function(){
        $.jGrowl('Ошибка сервера. Повторите попытку позже.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
        Routine.hideLoader();
      }
    });
  },
  onEdit:function(){
    this.is_edited = true;
    this.render();
  },
  onCancel:function(){
    this.is_edited =false;
    this.render();
  }
});


App.Views.ProjectList = Backbone.View.extend({
  template:_.template($("#projectListTemplate").html()),
  current_page:1,
  pages:1,
  queue:null,
  elems_on_page:50,
  el:$("#projectEditPnl"),
  projects:[],
  initialize:function(options){
    this.current_page = options.page;
    this.queue = options.queue || null,
    this.load();
  },
  render:function(){
    this.$el.html("").append(this.template({'projects':this.projects, 'pages':this.pages, 'cur_page':this.current_page}));
  },
  load:function(){
    Routine.showLoader();
    var self = this;
    $.ajax({
      type: "POST",
      url: "/handlers/projects/list/"+this.current_page,
      data: {'q':this.queue},
      dataType: 'json',
      contentType: "application/json; charset=utf-8",
      success: function(res){
        Routine.hideLoader();
        if(res.result=='ok'){
          self.pages =  Math.ceil(res.count/self.elems_on_page);
          self.projects = res.projects;
          self.render();
        }
        else
          $.jGrowl('Ошибка сервера. Попробуйте перезагрузить страницу.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      },
      error:function(jqXHR, textStatus, errorThrown){
        Routine.hideLoader();
        $.jGrowl('Ошибка сервера. Попробуйте перезагрузить страницу.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      }
    });
  }
});

App.initialize();
