/**
* список контактов клиента
*/

var ContactFormView = require('./contact_form_view'),
    ContactTableItemView = require('./contact_table_item_view'),
    ContactModel = require('../models/contact_model.js');
var contactTableTemplate = require('../templates/contact_table_template.html');

    var ContactTableView = Backbone.View.extend({

        contactFrm:null,
        client: null,

        initialize:function(){
            this.template = contactTableTemplate;
            this.listenTo(this.collection, 'change reset add remove', this.render);
            this.render();
        },
        events:{
            'click .new-contact': 'addNewContact'
        },
        render: function() {
            this.$el.html(this.template());
            var self = this;
            _.each(this.collection.models, function (item) {
                self.renderOne(item);
            }, this);
            this.$('.collapsible').collapsible();
            return this;
        },
        renderOne: function(item){
            var view = new ContactTableItemView({model: item});
            view.parentView = this;
            this.$("tbody").append(view.render().el);
            return view;
        },
        addNewContact:function(){
            var cm = new ContactModel();
            var self = this;
            self.collection.add(cm);
//            cm.on('change', function(){this.collection.add(cm);}, this);
            this.contactFrm = new ContactFormView({model: cm, client:self.options.client});
            this.$('.contact-form').html(this.contactFrm.render().el).slideDown();
            this.$(".new-contact").parent().slideUp();
            //this.$(".contact-table").slideUp();
             this.contactFrm.on("closefrm",function(){
                self.$(".new-contact").parent().slideDown();
                self.render();
            });
             this.$('.contact-form').find('legend').html('Новый контакт');
        },
        saveContact:function(){
            this.options.client.save();
        },
        editContact:function(item){
            var self = this;
            this.contactFrm = new ContactFormView({model: item, client:self.options.client});
            this.$('.contact-form').html(this.contactFrm.render().el).slideDown();
            this.$(".new-contact").parent().slideUp();
            this.contactFrm.on("closefrm",function(){
                self.$(".new-contact").parent().slideDown();
            });
        }
    });

module.exports = ContactTableView;
