var App = {
    Models: {},
    Views:{},
    Collections:{},
    Route:null,
    ListFilters:{'abc_cost':[], 'abc_sq':[]},
    Sort:{'field':'last_contact_date', 'direction': 'DESC'},
    initialize:function(){
      App.Views.Main = new AppView();

      App.Route = new AppRouter();
      Backbone.history.start();
    },
    GetFilter:function(){
      return App.ListFilters.abc_cost.join(",")+";"+App.ListFilters.abc_sq.join(",")+";"+App.Sort.field+","+App.Sort.direction;
    },
    ResetFilters:function(){
      App.Views.Main.ResetFilters();
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
     // "search/:id": "show",  // редактировать запись
      "list/:page":"list", // список с пейджером
      "list/:page/:filter":"filter_list" // список с пейджером и фильтрами
    },

    index:function(){
      App.ListFilters.abc_cost = [];
      App.ListFilters.abc_sq = [];
      (new ClientsList({el:$("#clientsListContainer")})).show(1);
    },

    list:function(page){
      App.ListFilters.abc_cost = [];
      App.ListFilters.abc_sq = [];
      (new ClientsList({el:$("#clientsListContainer")})).show(page);
    },
    filter_list:function(page, filter){
      // парсим фильтры
      var flst =filter.split(";");
      App.ListFilters.abc_cost = flst[0]?flst[0].split(','):[];
      App.ListFilters.abc_sq = flst[1]?flst[1].split(','):[];
      if(flst.length>2){
        var srt = flst[2].split(',');
        App.Sort.field = srt[0];
        App.Sort.direction= srt[1];
      }
      App.ResetFilters();
      (new ClientsList({'el':$("#clientsListContainer")})).show(page);
    },
    show: function(id) {
      //App.Views.Main.Search(id);
    }
  });


  var AppView = Backbone.View.extend({
    el:$("#clientsContainer"),
    initialize:function(){
      var self = this;
      this.$('.ddl-cat-sq, .ddl-cat-cost').multiselect({
        buttonContainer: '<span class="dropdown" />',
        includeSelectAllOption: true,
        enableCaseInsensitiveFiltering: true,
        numberDisplayed: 4,
        filterPlaceholder: 'Найти',
        nonSelectedText: "Категории",
        nSelectedText: "Категорий выбрано: ",
        selectAllText: "Все",
        maxHeight: 400,
         buttonText: function(options) {
            if (options.length === 0) {
              return 'Категории <b class="caret"></b>';
            }
            else if (options.length > this.numberDisplayed) {
                return this.nSelectedText+options.length + ' ' +  ' <b class="caret"></b>';
            }
            else {
              var selected = 'Категории: ';
              options.each(function() {
                selected += $(this).text() + ', ';
              });
              return selected.substr(0, selected.length -2) + ' <b class="caret"></b>';
            }
          },
          onChange: function(element, checked) {
            var list = [];
            element.parent().find("option:selected").each(function(){
              list.push($(this).val());
            });

            if(element.parent().hasClass('ddl-cat-sq'))
              App.ListFilters.abc_sq = list;
            else
              App.ListFilters.abc_cost = list;

            App.Route.navigate("list/1/"+App.GetFilter(),true);
          }
      });
    },
    ResetFilters:function(){
      this.$('.ddl-cat-cost option, .ddl-cat-sq option').prop('selected',false);
      if(App.ListFilters.abc_cost.length>0){
        var flt1 = "";
        for(var i in App.ListFilters.abc_cost){
          flt1=("[value="+App.ListFilters.abc_cost[i]+"]");
          this.$('.ddl-cat-cost option'+flt1).prop("selected",true);
        }
      }

      if(App.ListFilters.abc_sq.length>0){
        var flt1 = "";
        for(var i in App.ListFilters.abc_sq){
          flt1=("[value="+App.ListFilters.abc_sq[i]+"]");
          this.$('.ddl-cat-sq option'+flt1).prop("selected",true);
        }
      }
      this.$('.ddl-cat-sq, .ddl-cat-cost').multiselect("refresh");
    }
  });

  var ClientsList = Backbone.View.extend({
    template:_.template($('#clientsListTemplate').html()),
    events:{
      'click .clients-list-pager a':'onPageClick',
      'click thead a':'onResort'
    },
    initialize:function(){
       //his.render();
    },
    render:function(){
      //$("#filters-list").show();
      this.$el.html(this.template(this.model));
      this.$("thead a.sort-up, thead a.sort-down").removeClass('sort-up').removeClass('sort-down');
      this.$("thead a[data-sort="+App.Sort.field+"]").addClass("sort-"+((App.Sort.direction=="ASC")?"down":"up"));
    },
    show:function(page_num){
      var self = this;
      Routine.showLoader();
      App.Route.navigate("/list/"+page_num+"/"+App.GetFilter(),false);
      var filter = {
        money_type:App.ListFilters.abc_cost.join(","),
        square_type: App.ListFilters.abc_sq.join(","),
        sort:App.Sort
      };
       $.ajax({
        url: '/handlers/client/get_abc_list/'+page_num,
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
      });
    },
    onPageClick:function(e){
      var pg = $(e.currentTarget).data("page");
      this.show(pg);
    },
    onResort:function(e){
      //alert('qqq');
      var name = $(e.currentTarget).data('sort');
      var direction = "ASC";
      if(App.Sort.field==name){
        App.Sort.direction= (App.Sort.direction=="ASC")?"DESC":"ASC";
      }else{
        App.Sort.field=name;
        App.Sort.direction = "ASC";
      }
      this.show(1);
    }
  });



App.initialize();
