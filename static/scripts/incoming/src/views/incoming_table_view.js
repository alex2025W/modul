var IncomingTableTemplate = require('../templates/incoming_table_template.html');
var IncomingItemTemplate = require('../templates/incoming_table_item_template.html');

var IncomingTableView = Backbone.View.extend({
   el: $('#incoming-table'),
   initialize: function(){
       this.template = IncomingTableTemplate;
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
        var el = IncomingItemTemplate(item.toJSON());
        this.$("tbody").prepend(el);
        return el;
    }
});

module.exports = IncomingTableView;
