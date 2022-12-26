var OutgoingTableTemplate = require('../templates/outgoing_table_template.html');
var OutgoingItemTemplate = require('../templates/outgoing_table_item_template.html');

var OutgoingTableView = Backbone.View.extend({
   el: $('#outgoing-table'),
   initialize: function(){
       this.template = OutgoingTableTemplate;
       this.listenTo(this.collection, 'change reset add remove', this.render);
       this.render();
   },
    render: function(){
        this.$el.html(this.template());
        var self = this;
        this.$("tbody").empty();
        this.collection.models.map(function(item){
            self.renderOne(item);
        });
        return this;
    },
    renderOne: function(item){
        var el = OutgoingItemTemplate(item.toJSON());
        this.$("tbody").prepend(el);
        return el;
    }
});

module.exports = OutgoingTableView;
