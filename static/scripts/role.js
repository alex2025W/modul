$(function(){
  var Role = Backbone.Model.extend({
    defaults:{
      title:"",
      id:"",
      users:[],
      pages:[],
      user_count:0
    },
    initialize: function() {
      this.bind('request', preloader.Show, this);
      this.bind('sync', preloader.Hide, this);
      this.on('change:users',this.onUsersChange);
      this.onUsersChange();
    },
    onUsersChange:function(){
      this.set("user_count",this.get("users").length);
    }
  });

  var Roles = Backbone.Collection.extend({
    model: Role,
    url: "/handlers/role_data",
    initialize: function() {
      this.bind('request', preloader.Show, this);
      this.bind('sync', preloader.Hide, this);
    },
    get_page_title: function(id){
      return (global_page_list.filter(i=> i.id === id)[0] || {'title':id})['title'];
    },
    access_to_str: function(id, page){
      return page.r || page.w || page.o ? `${this.get_page_title(id)} (${page.r?'Ч':''}${page.w?'З':''}${page.o?'Р':''}); ` : "";
    },
    parse: function(response){
      let new_resp = response.map(i=>
          Object.assign(i, {str_pages: Object.keys(i.pages).reduce((p, c) => Object.keys(i.pages[c]).length ? `${p}${this.access_to_str(c, i.pages[c])}` : `${p}`, "").slice(0, -2)})
      );
      return new_resp;
    }
  });

  // пользователи
  var User = Backbone.Model.extend({
     defaults:{
      access:false
     }
  });
  var Users = Backbone.Collection.extend({
    model: User,
    mode: "client"
  });

  // столбцы, отображаемые для списка пользователей
  var user_columns = [{name:'access',label:'', cell:BooleanCellEx, headerCell: BooleanHeaderEx},
  {name:'fio',label:"ФИО", editable:false,cell: "string"},
  {name:'email', label: 'Email', editable:false,cell: "string"}
  ];

  // страницы
  var Page = Backbone.Model.extend({
    defaults:{
      access_r:false,
      access_w:false,
      access_o:false
    }
  });

  var Pages = Backbone.Collection.extend({
    model: Page
  });

  // столбцы, отображаемые для списка страниц
  var pages_columns = [{name:'title',label:"Название", editable:false,cell: "string"},
  {name:'access_r',label:'Чтение', cell:BooleanCellEx, headerCell:BooleanHeaderEx},
  {name:'access_w',label:'Запись', cell:BooleanCellEx, headerCell:BooleanHeaderEx},
  {name:'access_o',label:'Расширения', cell:BooleanCellEx, headerCell:BooleanHeaderEx}
  ];


  // редактирование роли
  var EditRole = Backbone.View.extend({
      template:  _.template($('#roleEditTemplate').html()),
      users:null,
      pages:null,
      sort_dir:0,
      initialize: function() {
        var self = this;
          if(this.model.get("id")){
            this.model.fetch().complete(function(){
              self.render();
            });
          }else
            this.render();
      },

      events:{
       "click .save-role":"onSave",
       "click .close-role":"onCancel",
       "click .delete-role":"onDelete",
       'click .page-grid .sort-title':"onSortPageGrid",
       'click .access_o':'onShowHideAdditional',
       'keyup .crm-o-man-filter':'onCrmManagerFilter',
       'click input[name=crm-o-man]':'onCrmManClick'
      },

      render: function() {
          var html = this.template( this.model.toJSON() );
          this.$el.html(html);
          this.users = new Users(global_user_list);
          var self = this;
          // заполняем доступность у юзеров
          _.each(this.model.get("users"),function(el){
            var us = self.users.get(el);
            if(us)
              us.set("access",true);
          });

          // заполняем доступность страниц
          this.pages = new Pages(global_page_list);
          var modelPg = this.model.get("pages");
          for(var i in modelPg){
            var pg = self.pages.get(i);
            if(pg){
              for(var a in modelPg[i])
                if(a=='additional')
                  pg.set('additional',modelPg[i].additional);
                else
                  pg.set("access_"+a,true);
            }
          }
          // добавляем добавочные элементы
          self.pages.get('app').set('has_additional',true);
          self.pages.get('contracts').set('has_additional',true);
          self.pages.get('workorderdate').set('has_additional',true);

          // добавляю грид с пользователями
          var grid = new Backgrid.Grid({
            columns: user_columns,
            collection: this.users
          });

          // добавить поиск для списка пользователей
          var filter = new Backgrid.Extension.ClientSideFilter({
            collection: this.users,
            fields: ['fio','email']
          });


          this.$el.find(".users-list").append(filter.render().el);
          this.$el.find(".users-list").append(grid.render().el);

          // добавить грид со страницами
          /*var pggrid = new Backgrid.Grid({
            columns: pages_columns,
            collection: this.pages
          });
          this.$el.find(".pages-list").append(pggrid.render().el); */
          this.$el.find(".pages-list").html(_.template($("#pagesGrid").html())(this.pages.toJSON()));


          return this;
      },
      onCancel:function(){
        route.navigate("",true);
      },
      onSave:function(){
        this.model.set("title",this.$el.find("#role-title").val());
        if(!this.model.get("title"))
        {
          showmsg("Укажите название роли.")
          return;
        }

        // сохраняем страницы
        var pgList = {};
        _.each(this.$(".page-grid .role-elem"),function(item){
          var it = $(item);
          var acc= {}
          _.each(['r','w','o'],function(acc_pref){
            if(it.find(".access_"+acc_pref).is(":checked"))
              acc[acc_pref] = true;
          });
          pgList[it.data("id")] = acc;
        });

        // расширенные права по CRM
        if(pgList['app'] && this.$(".page-grid .role-elem[data-id=app] .additional").is(":visible"))
        {
          var additional = {};
          var pr = this.$(".page-grid .role-elem[data-id=app] .additional");
          additional.type = pr.find('input[name=crm-o-man]:checked').data('type');
          additional.pending = pr.find('input[name=crm-pending]').prop('checked')?1:0;
          additional.failures = pr.find('input[name=crm-failures]').prop('checked')?1:0;
          additional.managers = [];
          _.each(pr.find(".mnlist-user input:checked"),function(item){
            additional.managers.push($(item).data('email'));
          });
          pgList['app']['additional'] = additional;
        }
        else
        {
           var additional = {};
           additional.pending = 0;
           additional.failures = 0; 
           pgList['app']['additional'] = additional;
        }

        // расширенные права по договору
        if(pgList['contracts'] && this.$(".page-grid .role-elem[data-id=contracts] .additional").is(":visible"))
        {
          var additional = {};
          var pr = this.$(".page-grid .role-elem[data-id=contracts] .additional");
          additional.type = pr.find('input[name="crm-o-man"]:checked').data('type');
          additional.managers = [];
          _.each(pr.find(".mnlist-user input:checked"),function(item){
            additional.managers.push($(item).data('email'));
          });
          pgList['contracts']['additional'] = additional;
        } else {
           var additional = {};
           additional.pending = 0;
           additional.failures = 0;
           pgList['contracts']['additional'] = additional;
        }

        // расширенные права по нарядам
        if(pgList['workorderdate'] && this.$(".page-grid .role-elem[data-id=workorderdate] .additional").is(":visible"))
        {
          var additional = {};
          var pr = this.$(".page-grid .role-elem[data-id=workorderdate] .additional");
          additional.past_dates = pr.find('input[name=wo-past_dates]').prop('checked')?1:0;
          additional.cancel_transfer = pr.find('input[name=wo-cancel_transfer]').prop('checked')?1:0;
          pgList['workorderdate']['additional'] = additional;
        }
        else
        {
           var additional = {};
           additional.past_dates = 0;
           additional.cancel_transfer = 0;
           pgList['workorderdate']['additional'] = additional;
        }

        // сохраняем пользователей
        var usList = [];
        this.users.each(function(us){
          if(us.get("access"))
            usList.push(us.get("id"));
        });
        this.model.set("pages",pgList);
        this.model.set("users",usList);
        if(!this.model.get("id"))
          roles.add(this.model);
        this.model.save().complete(function(){
            route.navigate("",true);
          });
      },
      onDelete:function(){
        var self = this;
        bootbox.confirm("Вы уверены, что хотите удалить роль?", function(result) {
          if(result){
            self.model.destroy();
            route.navigate("",true);
          }
        });
      },
      onSortPageGrid:function(){
        /*var sorted = this.pages.toJSON();
        sorted.sort(function(i1,i2){
          return (i1['title']>i2['title'])?1:((i2['title']>i1['title'])?-1:0);
        }); */
        var dir = (this.sort_dir==1)?-1:1;
        this.sort_dir = dir;
        var sorted = this.pages.sortBy(function(item){
          return item.get('title');
        });
        if(dir<0)
          sorted.reverse();
        var nel = this.$('.page-grid .header');
        var self = this;
        _.each(sorted, function(it){
          var el = self.$(".page-grid .role-elem[data-id="+it.get('id')+']');
          el.insertAfter(nel);
          nel = el;
        });
      },
      onShowHideAdditional:function(e){
        var el = $(e.target);
        var pr = el.parents(".role-elem:first");
        if(el.is(":checked")) {
          pr.find(".additional").slideDown();
        }
        else {
          pr.find('input[name=crm-failures]').removeAttr('checked');
          pr.find('input[name=crm-pending]').removeAttr('checked');
          pr.find(".additional").slideUp();
        }
      },
      onCrmManagerFilter:function(e){
        var txt = $(e.currentTarget).val().toLowerCase();
        var pr = $(e.currentTarget).parents('.manager-list-bl:first');
        var list = pr.find('.manager-list');
        if(txt){
          _.each(list.find(".mnlist-user"),function(item){
            if($(item).text().toLowerCase().indexOf(txt)>=0)
              $(item).show();
            else
              $(item).hide();
          });
        }else{
          list.find('.mnlist-user').show();
        }
      },
      onCrmManClick:function(e){
        var type = $(e.currentTarget).data('type');
        if(type=='shared'){
          $(e.currentTarget).parents('.additional:first').find('.manager-list-bl input').prop('disabled',false);
        }else
          $(e.currentTarget).parents('.additional:first').find('.manager-list-bl input').prop('disabled',true);
      }
  });


  // строка в гриде роли
  var EditRoleStringCell = Backgrid.StringCell.extend({
    events:{
      'click':"onRoleClick"
    },
    onRoleClick:function(){
      route.navigate("edit/"+this.model.get("id"),true);
    }
  })


  // столбцы, отображаемые для списка ролей
  var role_colums = [{name:'title',label:"Название", editable:false,cell: EditRoleStringCell},
  {name:'user_count', label: 'Пользователей', editable:false,cell: EditRoleStringCell},
  {name:'str_pages', label: 'Разделы (Ч-чтение; З-запись; Р-расширенный)', editable:false,cell: EditRoleStringCell},
  ];



  var roles  = new Roles();

  var AppView = Backbone.View.extend({
      initialize:function(){
          //var roles
          // инициализация списка
          var grid = new Backgrid.Grid({
        columns: role_colums,
        collection: roles
      });

      // добавить поиск
      var filter = new Backgrid.Extension.ClientSideFilter({
        collection: roles,
        fields: ['title']
      });

      $("#roles-grid .rl-left").append(filter.render().el);

      // Render the grid and attach the Grid's root to your HTML document
      $("#roles-grid").append(grid.render().el);

      $("#newRole").click(function(){route.navigate("add",true);});

      //roles.fetch({reset: true});
      },
      EditRole:function(id){
        var role = roles.get(id);
        if(role){
          var editContactView = new EditRole({ model: role });
          $("#role-edit").html("").append(editContactView.el).show();
          $("#roles-grid").hide();
        }else
          showmsg("Роль не существует или была удалена.")
      }
  });
  var app = new AppView();


  // настраивам роуты
  var AppRouter = Backbone.Router.extend({

    routes: {
      "":               "index",
      "add":            "add",    // добавить роль
      "edit/:id":        "edit"  // редактировать запись
    },

    index:function(){
      if(roles.length==0)
        roles.fetch({reset: true});
      $("#roles-grid").show();
      $("#role-edit").hide();
    },

    add: function() {
      var editContactView = new EditRole({ model: new Role()});
      $("#role-edit").html("").append(editContactView.el).show();
      $("#roles-grid").hide();
    },

    edit: function(id) {
      if(roles.length==0){
        roles.fetch({reset: true}).complete(function(){
          app.EditRole(id);
        });
      }else
        app.EditRole(id);
    }

  });

  var route = new AppRouter();
  Backbone.history.start();
});
