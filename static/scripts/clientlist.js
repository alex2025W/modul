
$(function(){

  bootbox.setDefaults({locale: "ru",});

$('input').keyup(function(e){
   if(e.keyCode == 13){
      $(this).trigger('enter');
   }
 });

var OrderTableView = Backbone.View.extend({

});



  var UserModel = Backbone.Model.extend({});



  /** Модели **/
  var ClientModel = Backbone.Model.extend({
    urlRoot:'/handlers/clientitem'
  });

  var ClientCollection = Backbone.Collection.extend({
    url: '/handlers/clients/',
    model: ClientModel
  });

var client_collection = new ClientCollection();
var group_list = [];

var updateGroups = function(){
  $.post('/handlers/client/groups', {}).done(function(data) {
    group_list = $.parseJSON(data);
  });
}

var showLoader = function(){
    $.blockUI({'message':'<img src="/static/img/spinner.gif">', 'css':{'border':'none', 'backgroundColor':'transparent'}, 'overlayCSS':{'backgroundColor':'#fff', 'cursor':'pointer'}});
};
var hideLoader = function(){
    $.unblockUI();
};

/**
 * Список клиентов
 */
  var ClientListView = Backbone.View.extend({
    el: $('#client-list'),
    initialize:function(){
      this.collection = client_collection;
      //this.collection.bind('request', this.showLoader, this);
      //this.collection.bind('sync', this.hideLoader, this);
      this.collection.bind('error', hideLoader(), this);
      this.collection.bind('invalid', hideLoader(), this);
      var self = this;
      showLoader();
      this.collection.fetch({data: {'cl':'notcl'}, timeout:50000}).complete(function(){
        self.render();
        // self.collection.on('sync', function(){self.render()});
        hideLoader();
      });
      this.$('.client-type').select2({
        placeholder: "чл/компания"
      }).on("select2-selecting", function(e){
          //e.val
          showLoader();
          var data = {}
          if (e.val != ''){
            data = {'cl':e.val}
          }
            self.collection.fetch({data: data, timeout:50000}).complete(function(){
            self.render();
            hideLoader();
          });
      });
    },
    render:function(){
      this.$("tbody").empty();
      var self = this;
      _.each(this.collection.models, function(item){
        // var goo = item.get('group');
        // if (goo != '' && group_list.indexOf(goo) == -1){
        //   group_list.push(goo);
        // }
        self.render_one(item);
      }, this);

      return this;
    },
    render_one:function(item){
      var view = new ClientItemView({model: item});
      this.$("tbody").append(view.render().el);
      return view;
    }
  });

var ClientDataView = Backbone.View.extend({
  el:$('#clientModal'),
  needInn:false,
  events:{
      'click .save-client' : 'saveClientData',
      'click .save-client-add' : 'saveClientAdd',
      'click .save-client-ok' : 'saveClientOk',
      'click .save-client-cancel' : 'saveCancel'
  },
  initialize: function(){
    this.needInn = false;
    this.render();
  },
  render: function(){
    var self = this;
    this.$('#client-name').val(this.model.get('name'));
    this.$('#client-inn').val(this.model.get('inn'));
    this.$el.on('hidden', function () {
      self.$('.second').hide();
      self. $('.first').show();
      self.undelegateEvents();
      self.$el.removeData().unbind();
    });
  },
  show:function(){
    this.$el.modal('show');
  },
  close:function(){
    var self = this;
    this.$el.modal('hide').on('hidden', function () {
        self.$('.second').hide();
        self. $('.first').show();
        self.undelegateEvents();
        self.$el.removeData().unbind();
    });
  },
  saveClientData: function(){
      var self = this;
      var name = this.$('#client-name').val();
      var inn = this.$('#client-inn').val();
      if (name == this.model.get('name') && inn == this.model.get('inn')){
        this.close();
        return;
      }
      if (name == ''){
        showmsg('Укажите имя клиента.');
        return;
      }
      if (inn == '' && this.needInn){
        showmsg('Укажите ИНН.');
        return;
      }
      showLoader();
      $.ajax({
          type: "PUT",
          url: "/handlers/checkclient/"+ self.model.get('id'),
          data: JSON.stringify({'name': name, 'inn': inn}),
          contentType: 'application/json',
          dataType: 'json'
        }).done(function(msg) {
         if (msg['msg'] == 'exists'){
          self.$('.first').hide();
          self.$('.second').show();
          hideLoader();
         }
         else{
          self.close();
          client_collection.fetch().done(function(){hideLoader();});
         }
        });
    },
    saveClientAdd:function(){
      var self = this;
      var name = this.$('#client-name').val();
      var inn = this.$('#client-inn').val();
      var id = this.model.get('id');
      showLoader();
      $.ajax({
          type: "PUT",
          url: "/handlers/mergeclient/"+ id,
          data: JSON.stringify({'name': name, 'inn': inn}),
          contentType: 'application/json',
          dataType: 'json'
        }).done(function(msg) {
          self.close();
          client_collection.fetch().done(function(){hideLoader();});
      });
    },
    saveClientOk:function(){
      this.needInn = true;
      this.$('.second').hide();
      this.$('.first', '#clientModal').show();
      this.saveClientData();
    },
    saveCancel: function(){
      this.$('.second').hide();
      this.$('.first').show();
    },
});

/**
 * Клиент
 */
  var ClientItemView = Backbone.View.extend({
    tagName: 'tr',
    events:{
      'click .add-group': 'add_group',
      'click .del-group': 'del_group',
      'click .current-group': 'edit_group',
      'click .edit-data': 'edit_data',
      'click .fa': 'base_group',
      // 'keyup .group-name': 'add_new_group_key',
      // 'listselect .group-name': 'add_new_group'
    },
    initialize:function(){
      this.template = _.template($('#client-item-template').html());
      var self = this;
      this.model.on('change', function(){self.render()});
    },
    render:function(){
      this.$el.html(this.template(this.model.toJSON()));
      return this;
    },
    add_group:function(e){
      var self = this;
      this.$('.add-group').addClass('hidden');
      this.$('.group-name-block').removeClass('hidden');
      this.$('.group-name').select2({
        data:group_list,
        createSearchChoice:function(term, data) { if ($(data).filter(function() { return this.text.localeCompare(term)===0; }).length===0) {return {id:term, text:term};} }
      }).on("select2-selecting", function(e){
        self.add_new_group(e.val);
      }).on("select2-close", function() {
        self.close_new_group();
      }).select2("open");
      // this.$('.group-name').remoteList({
      //     minLength: 0,
      //     maxLength: 0,
      //     source: function(value, response){
      //       value = value.toLowerCase();
      //       response(group_list);
      //   }
      // });
      // this.$('.group-name').focus();
    },
    edit_group:function(){
      var self = this;
      this.$('.add-group').addClass('hidden');
      this.$('.group-current-block').addClass('hidden');
      this.$('.group-name-block').removeClass('hidden');
      this.$('.group-name').select2({
        data:group_list,
        createSearchChoice:function(term, data) { if ($(data).filter(function() { return this.text.localeCompare(term)===0; }).length===0) {return {id:term, text:term};} }
      }).on("select2-selecting", function(e){
        self.add_new_group(e.val);
      }).on("select2-close", function() {
        self.close_new_group();
      }).on("select2-open", function(e){
          $('.select2-input').val(self.model.get('group'));
      }).select2("open");
      // this.$('.group-name').remoteList({
      //     minLength: 0,
      //     maxLength: 0,
      //     source: function(value, response){
      //       value = value.toLowerCase();
      //       response(group_list);
      //   }
      // });
      // this.$('.group-name').focus();
    },
    del_group:function(){
      var group = this.model.get('group');
      var self = this;

      bootbox.confirm("Исключить клиента из группы '"+group+"'?", function(result)
      {
          if(result)
          {
             self.model.set({'group':'', 'base_group':'no'});
              showLoader();
              self.model.save().done(function(){
                $.post('/handlers/client/check_group', {'group':group}).done(function(data) {
                  if (data.result != 'ok'){
                    bootbox.confirm("В группе больше не останется клиентов. Удалить название группы '"+group+"'' из списка групп?", function(result)
                    {
                        if(result)
                          $.post('/handlers/client/del_group', {'group':group}).done(function(data) {updateGroups();});
                    });
                  }
                }).always(function(){
                  hideLoader();
                });
              });
          }
      });
    },
    base_group:function()
    {
      var self = this;
      var group = self.model.get('group');
      // если снятие флага основного
      if (self.model.get('base_group') == 'yes')
      {
          bootbox.confirm("Клиент перестанет быть основным в группе: '"+group+"', продолжить?", function(result)
          {
              if(result)
              {
                showLoader();
                self.model.set({'base_group':'no'});
                self.model.save().done(function(){hideLoader();});
              }
          });
      }
      else
      {
          bootbox.confirm("Назначить клиента основным в группе '"+group+"'?", function(result)
          {
              if(result)
              {
                  var data = {'id':self.model.get('id'), 'group': group};
                  $.post('/handlers/client/check_base', data).done(function(data)
                  {
                      if (data.result != 'ok')
                      {
                        bootbox.confirm("У данной группы уже есть основной клиент. Сменить основного клиента в группе '"+group+"'?", function(result)
                        {
                            if(result)
                            {
                              showLoader();
                              self.model.set({'base_group':'yes'});
                              self.model.save().done(function(){
                                    client_collection.fetch().done(function(){hideLoader();});
                              });
                            }
                            else
                              hideLoader();
                        });
                      }
                      else
                      {
                        showLoader();
                        self.model.set({'base_group':'yes'});
                        self.model.save().done(function(){
                                    client_collection.fetch().done(function(){hideLoader();});
                        });

                      }
                  });
              }
          });
      }
    },
    close_new_group:function(){

        if (this.model.get('group') == ''){
          this.$('.add-group').removeClass('hidden');
          this.$('.group-current-block').addClass('hidden');
          this.$('.group-name-block').addClass('hidden');
        }
        else{
          this.$('.add-group').addClass('hidden');
          this.$('.group-current-block').removeClass('hidden');
          this.$('.group-name-block').addClass('hidden');
      }
    },
    add_new_group:function(val)
    {
        var self = this;
        var group = val;
        if (group == '' || self.model.get('group') == group)
          return;

        if (self.model.get('group') != '')
        {
            bootbox.confirm("Изменить название группы? Применится к нескольким клиентам.", function(result)
            {
                if(result)
                {
                  self.model.set({'rename_group': self.model.get('group')});
                  self.model.set({'group':group});
                  showLoader();
                  self.model.save().done(function(){
                    client_collection.fetch().done(function(){updateGroups(); hideLoader();});
                  });
                }
            });
        }
        else
        {
          this.model.set({'group':group});
          showLoader();
          self.model.save().done(function(){
              client_collection.fetch().done(function(){updateGroups(); hideLoader();});
          });
        }

    },
    edit_data:function(){
      var clientData = new ClientDataView({model:this.model});
      clientData.show();
    }
  });

  updateGroups();
  var app = new ClientListView();

});
