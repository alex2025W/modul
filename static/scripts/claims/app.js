$(function(){

  var Cetagory = Backbone.Model.extend({idAttribute: "_id"});
  var Categories = Backbone.Collection.extend({
    model:Cetagory
  });

  var Tag = Backbone.Model.extend({idAttribute: "_id"});
  var Tags = Backbone.Collection.extend({
    model:Tag
  });

  var Claim = Backbone.Model.extend({
    idAttribute: "_id",
    url:"/handlers/claim_data"
  });
  var Claims = Backbone.Collection.extend({
    model:Claim,
    comparator:function(a){
      return -(new Date(a.get("created"))).getTime();
    }
  });

  var Filters = Backbone.View.extend({
    el:$("#claims-filters"),
    selectedCategories:[],
    selectedTags:[],
    selectedContract:"",
    initialize:function(){
      this.render();
    },
    events:{
      'click .add-new-claim':'onAddClaim',
      'click .open-claim':'onClaimOpen'
    },
    render:function(){
      this.fillLists();
      var self = this;
      $('.ddl-categories',this.$el).multiselect({
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
          self.selectedContract = "";
          self.selectedCategories = [];
          $(element).parent().find("option:selected").each(function(){
            if($(this).val()!="multiselect-all")
              self.selectedCategories.push($(this).val());
          });
          app.claimlist.render();
          app.setUpUrl("");
        }
      });
      $('.ddl-tags',this.$el).multiselect({
        buttonContainer: '<span class="dropdown" />',
        includeSelectAllOption: true,
        enableCaseInsensitiveFiltering: true,
        numberDisplayed: 4,
        filterPlaceholder: 'Найти',
        nonSelectedText: "Метки",
        nSelectedText: "Тэгов выбрано: ",
        selectAllText: "Все",
        maxHeight: 400,
        buttonText: function(options) {
          if (options.length === 0) {
            return 'Метки <b class="caret"></b>';
          }
          else if (options.length > this.numberDisplayed) {
            return this.nSelectedText+options.length + ' ' +  ' <b class="caret"></b>';
          }
          else {
            var selected = 'Метки: ';
            options.each(function() {
              selected += $(this).text() + ', ';
            });
            return selected.substr(0, selected.length -2) + ' <b class="caret"></b>';
          }
        },
        onChange: function(element, checked) {
          self.selectedContract = "";
          self.selectedTags = [];
          $(element).parent().find("option:selected").each(function(){
            if($(this).val()!="multiselect-all")
              self.selectedTags.push(decodeURIComponent($(this).val()));
          });
          app.claimlist.render();
          app.setUpUrl("");
        }
      });
      $(".pnl-ddl-categories",this.$el).show();
      $(".pnl-ddl-tags",this.$el).show();
    },
    fillLists:function(){
      for(var i in app.categories.models){
        $('.ddl-categories',this.$el).append('<option value="'+app.categories.models[i].get('_id')+'">'+app.categories.models[i].get('name')+' ('+app.categories.models[i].get('count')+')'+'</option>');
      }
    },
    resetTags:function(){
      /*
      $('.ddl-tags',this.$el).html("");
      for(var i in app.tags){
        $('.ddl-tags',this.$el).append('<option value="'+app.tags[i]+'">'+app.tags[i]+'</option>');
      }
      $('.ddl-tags',this.$el).multiselect('rebuild');
      */



      $('.ddl-tags',this.$el).html("");
      for(var i in app.tags.models){

        $('.ddl-tags',this.$el).append('<option value="'+encodeURIComponent(app.tags.models[i].get('tag'))+'" >'+app.tags.models[i].get('tag')+' ('+app.tags.models[i].get('count')+')'+'</option>');
      }
      $('.ddl-tags',this.$el).multiselect('rebuild');
    },
    onAddClaim:function(e){
      var dlg = new AddEditDlg();
      app.setUpUrl("add");
      dlg.show();
    },
    // поиск заявки на редактирование по номеру
    onClaimOpen:function(e){
      var num= this.$("input[name=claim-number]").val();
      if(num){
        var fModel = null;
        for(var i in app.claims.models){
          if(app.claims.models[i].get("number")==num){
            fModel = app.claims.models[i];
            break;
          }
        }
        if(fModel){
          var dlg = new AddEditDlg({model:fModel});
          app.setUpUrl("edit["+fModel.get("_id")+"]");
          dlg.show();
        }else{
          showmsg("Претензия не найдена.")
        }
      }
    },
    getFilters:function(){
      return {categories:this.selectedCategories, tags:this.selectedTags, contract:this.selectedContract};
    },
    setTagFilter:function(tag){
      this.selectedContract = "";
      this.$('.ddl-tags option').each(function(){
        if(decodeURIComponent($(this).val())==tag){
          $(this).prop('selected',true);
        }else
          $(this).prop('selected',false);
      });
      this.selectedTags = [tag];
      $('.ddl-tags',this.$el).multiselect('refresh');
      app.claimlist.render();
      app.setUpUrl("");
    },
    setFilters:function(filters){
      this.selectedContract = filters['contract'];
      this.selectedTags = filters['tags'];
      this.$('.ddl-tags option').each(function(){
        $(this).prop('selected',false);
        for(var j in filters['tags']){
          if(filters['tags'][j]==decodeURIComponent($(this).val()))
            $(this).prop('selected',true);
        }
      });
      $('.ddl-tags',this.$el).multiselect('refresh');
      this.selectedCategories = filters['categories'];
      this.$('.ddl-categories option').each(function(){
        $(this).prop('selected',false);
        for(var j in filters['categories']){
          if(filters['categories'][j]==$(this).val())
            $(this).prop('selected',true);
        }
      });
      $('.ddl-categories',this.$el).multiselect('refresh');
    }
  });


  var AddEditDlg = Backbone.View.extend({
    template:_.template($('#claimAddDlgTemplate').html()),
    initialize:function(){
      this.render();
    },
    events:{
      'click .close-btn':'onDlgClose',
      'click .save-btn':'onDlgSave'
    },
    render:function(){
      var html = this.template({'categories':app.categories.toJSON()});
      this.$el.html(html);

      var tags = [];
      for(var i in app.tags.models){
        tags.push({'id':app.tags.models[i].get('tag'),'name':app.tags.models[i].get('tag')});
      }
      $("input[name=tags]",this.$el).tokenInput(tags,{theme: "facebook",zindex:1300,hintText:"Введите для поиска",noResultsText:"Ничего не найдено",searchingText:"Поиск...",allowFreeTagging:true});
    },
    show:function(){
      if(this.model){
        this.$("[name=description]").val(this.model.get("description"));
        this.$("[name=category]").val(this.model.get("category"));
        var tags = this.model.get("tags");
        for(var i in tags)
        {
          $("input[name=tags]",this.$el).tokenInput("add",{'id':tags[i],'name':tags[i]});
        }
        this.$("[name=contract]").val(this.model.get("contract"));
        this.$("[name=consequences]").val(this.model.get("consequences"));
        this.$("[name=decision]").val(this.model.get("decision"));
        this.$("[name=causes]").val(this.model.get("causes"));
      }

      this.$el.modal("show");
    },
    onDlgClose:function(e){
      this.$el.modal('hide');
      this.$el.remove();
    },
    onDlgSave:function(e){
      var self = this;
      var description = this.$("[name=description]").val();
      var tags = this.$("[name=tags]").val();
      var category = this.$("[name=category]").val();
      var contract = this.$("[name=contract]").val();
            var causes = this.$("[name=causes]").val();
      var consequences = this.$("[name=consequences]").val();
      var decision = this.$("[name=decision]").val();
      if(description=="" || tags=="" || category==""){
        showmsg("Заполните все обязательные поля.");
        return;
      }
      // убрать дубли из тэгов
      var tg_spl = tags.split(",");
      var tgList = [];
      for(var i in tg_spl){
        if(tgList.indexOf(tg_spl[i])<0)
          tgList.push(tg_spl[i]);
      }

      var data = {description:description, tags:tgList, category:category, contract:contract, consequences:consequences, decision:decision, causes:causes };

      // если модель задана, то меняется эта модель
      if(this.model){
        Routine.showLoader();
        var prev = this.model.toJSON();
        this.model.save(data,
        {success:function(){
          Routine.hideLoader();
          app.claims.add(cl);

          // получение обновленного списка тэгов и обновление фильтров
          $.ajax({
            type: "GET",
            url: "/handlers/claims/get_tags",
            data: {},
            timeout: 55000,
            contentType: 'application/json',
            dataType: 'json',
            async:true
            }).done(function(result) {
              if(result['status']=="error")
                $.jGrowl('Ошибка получения данных. Подробности: ' + result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 5000, 'position': 'bottom-right' });
              else
              {
                app.tags = new Tags(result.data);
                app.resetTags();
              }
            }).always(function(){});

          app.claimlist.render();
          self.onDlgClose();
        }, error:function(){
          Routine.hideLoader();
          self.model.set(prev);
          showmsg("Ошибка сохранения. Повторите попытку.")
        }});
      }else{
        // отправить запрос на добавление
        var cl = new Claim(data);
        Routine.showLoader();
        cl.save(null,
        {success:function(){
          Routine.hideLoader();
          app.claims.add(cl);
          app.resetTags();
          app.claimlist.render();
          self.onDlgClose();
        }, error:function(){
          Routine.hideLoader();
          showmsg("Ошибка сохранения. Повторите попытку.")
        }});
      }
    }
  });

  var ClaimView = Backbone.View.extend({
    template:_.template($('#claimItem').html()),
    initialize:function(){
      this.render();
    },
    events:{
      'click .number':'onClaimEdit',
      'click .tags .tag':'onTagClick',
      'click .contract-number':'onContractClick'
    },
    render:function(){
      var html = this.template({data:this.model.toJSON(),categories:app.categories});
      this.$el.html(html);
    },
    onClaimEdit:function(){
      var dlg = new AddEditDlg({model:this.model});
      app.setUpUrl("edit["+this.model.get("_id")+"]");
      dlg.show();
    },
    onTagClick:function(e){
      var tg = $(e.currentTarget).text();
      app.filters.setTagFilter(tg);
    },
    onContractClick:function(e){
      app.filters.selectedContract = this.model.get("contract");
      app.claimlist.render();
      app.setUpUrl("");
    }
  });


  var ClaimList = Backbone.View.extend({
    el:$("#claims-list"),
    initialize:function(){
      this.render();
    },
    render:function(){
      this.$el.html("");
      var filters = app.filters.getFilters();
      for(var i in app.claims.models){
        if(this.isFiltered(app.claims.models[i],filters)){
          var m = new ClaimView({model:app.claims.models[i]});
          this.$el.append(m.$el);
        }
      }
    },
    isFiltered:function(model,filters){
      var is_contract_true = false;
      var is_category_true = false;
      var is_tag_true = false;

      if(filters.contract){
        if(model.get("contract")==filters.contract)
          is_contract_true =  true;
      }
      else
        is_contract_true = true;

      if(filters.categories && filters.categories.length>0  && filters.categories[0]!="")
      {
        for(var f in filters.categories)
          if(model.get("category")==filters.categories[f])
          {
            is_category_true =  true;
            break;
          }
      }
      else
        is_category_true =  true;

      if(filters.tags && filters.tags.length>0 && filters.tags[0]!="")
      {
        for(var i in filters.tags){
          var tgs = model.get("tags");
          for(var j in tgs)
            if(tgs[j]==filters.tags[i])
            {
              is_tag_true =  true;
              break;
            }
        }
      }
      else
        is_tag_true =  true;

      return is_contract_true && is_category_true && is_tag_true;
    }
  });


  ///
  /// Роутер
  ///
  var AppRouter = Backbone.Router.extend({
    routes: {
      "": "index",
      ":query": "go"
    },

    index:function(){
      app.filters.setFilters(app.parseUrl());
      app.claimlist.render();
    },

    go:function(query)
    {
      app.filters.setFilters(app.parseUrl(query));
      app.claimlist.render();
    }
  });

  var AppView = Backbone.View.extend({
    categories:null,
    tags:null,
    claims:null,

    filters:null,
    claimlist:null,

    router:null,

    initialize:function(){
      Routine.showLoader();
      var self = this;
      $.ajax({
          url: '/handlers/get_claims_data',
          type: 'GET',
          dataType: 'json',
          contentType: "application/json; charset=utf-8",
          timeout: 35000,
          success: function (result, textStatus, jqXHR) {
            Routine.hideLoader();
            if(result.status=='error'){
                showmsg(result.msg);
            }else
            if(result.status=="ok"){
              //var res = $.parseJSON(result.result);
              self.categories = new Categories(result.categories);
              self.tags = new Tags(result.tags);
              self.claims = new Claims(result.claims);
              self.filters = new Filters();
              self.resetTags();
              self.claimlist = new ClaimList();
              self.router = new AppRouter();
              Backbone.history.start();
            }
            else
              showmsg("Ошибка сервера.");
        },
        error:function(result){
          Routine.hideLoader();
          showmsg("Ошибка сервера");
        }
      });
    },
    resetTags:function(){
      /*var tags = [];
      for(var i in app.claims.models){
        var tgs = app.claims.models[i].get("tags");
        for(var j in tgs){
          if(tags.indexOf(tgs[j])<0)
            tags.push(tgs[j]);
        }
      }
      this.tags = tags;*/
      this.filters.resetTags();
    },
    setUpUrl:function(additional){
      var filters = app.filters.getFilters();
      var url = "cat["+filters.categories.join(",")+"]&";
      url+="tags[";
      for(var i in filters.tags){
        if(i!=0)
          url+=",";
        url+=encodeURIComponent (filters.tags[i]);
      }
      url+="]&";
      url+='cnt['+encodeURIComponent (filters.contract)+']';
      if(additional){
        url+="&"+additional;
      }
      this.router.navigate(url,false);
    },
    parseList:function(str,el){
      var list = str.substr(el.length+1,str.length-1-el.length-1);
      return list;
    },
    parseUrl:function(query){
      var filters = {'categories':[], 'tags':[], 'contract':''};
      if(query){
        var arr = query.split("&");
        for(var i in arr){
          var tg = arr[i];
          if(tg.indexOf("cat[")==0)
            filters['categories'] = this.parseList(tg,'cat').split(",");
          if(tg.indexOf("tags[")==0)
            filters['tags'] = this.parseList(decodeURIComponent(tg),'tags').split(",");
          if(tg.indexOf("cnt[")==0)
            filters['contract'] = this.parseList(tg,'cnt') ;
          if(tg.indexOf("add")==0){
            var dlg = new AddEditDlg();
            dlg.show();
          }else
          if(tg.indexOf("edit[")==0){
            var id=this.parseList(tg,"edit");
            var fModel = this.claims.get(id);
            if(fModel){
              var dlg = new AddEditDlg({model:fModel});
              dlg.show();
            }
          }
        }
      }
      return filters;
    }
  });
  var app = new AppView();
});
