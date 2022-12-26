$(function(){
  

  var AppView = Backbone.View.extend({
    where_find:[],
    first_contact:[],
    initialize:function(){
      this.where_find = ['1','2','3'];
    }
  });

  var ContactModel = Backbone.Model.extend({
    defaults:{
      'fio':null, 
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
      'id': null,
      'name':null,
      'addr':null,
      'rekvisit':null,
      'contacts': new ContactCollection()
    },
    parse: function(response) {
        this.set({'id': response.id});
        this.set({'name': response.name});
        this.set({'addr': response.addr});
        this.set({'rekvisit': response.rekvisit});
        var contactList = new ContactCollection();
        contactList.add(response.contacts);
        this.set({contacts: contactList});
    }
  });

  var ClientFindView = Backbone.View.extend({
    el: $("#client-find-form"),
    events:{
      'click #show-client-card':'showClientCard'
    },
    initialize: function() {
      this.$('#client-dropdown').typeahead({
        updater: function(selection){
          return selection;   
        },
        source: function (query, process) {
          var data = new Object();
          data.query = query;
          $.ajax({
            url: '/handlers/clientfind',
            type: 'POST',
            dataType: 'json',
            contentType: "application/json; charset=utf-8",
            data: $.toJSON(data),
            timeout: 35000,
            error: function (jqXHR, textStatus, errorThrown) {     
              alert('error');          
            },
            success: function (result, textStatus, jqXHR) {
              var obj = result;
              if (obj.hasOwnProperty("error")) {                        
                alert(obj.error.message);
                return;
              }
              if (obj.hasOwnProperty("result")) {
                var clients = obj.result.clients;
                return process(clients);
              }
            }
          });
        }
      });
    },
    showClientCard:function(){
      var sel = this.$('#client-dropdown').val();
      var clientModel = new ClientModel();
      clientModel.set({'id':sel})
      var clientCardView = new ClientCardView({model:clientModel});
    }
  });

  
  var ContactListView = Backbone.View.extend({
      initialize:function(){
    },
    render: function() {
        this.addAll();
        return this;
    },
    addOne: function(contact) {
      var view = new ContactView({model: contact});
      this.$el.append(view.render().el);
      return view;
    },

    addAll: function() {
      var self = this;
      _.each(this.collection.models, function (item) {
          self.addOne(item);
      }, this);
    },
  });

  var ContactView = Backbone.View.extend({
    initialize:function(){
      this.template = _.template($('#clientContactTemplate').html());
    },
    render: function() {
        this.$el.html(this.template(this.model.toJSON()));
        return this;
    }
  });

  var ClientCardView = Backbone.View.extend({
    el: '#client-form',
    events:{
      'click .save-client':'save'
    },
    render: function() {
        
        this.$el.html(this.template(this.model.toJSON()));
        var cv = new ContactListView({collection:this.model.get('contacts')});
        this.$('.contact-info').append(cv.render().el);
    },
    initialize:function(){
      this.template = _.template($('#clientCardTemplate').html());
      this.model.fetch();
      this.model.bind('change', this.render, this);
    },
    save:function(){
      this.model.set({
        'name': this.$('.address-textarea').val(),
        'rekvisit': this.$('.rekvisit-textarea').val()
      });
      this.model.save();
    }
  });

  var app = new AppView();
  var clientFindView = new ClientFindView();

});
