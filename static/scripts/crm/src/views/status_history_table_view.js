/**
* список контактов клиента
*/

var StatusHistoryModel = require('../models/history_work_status_model.js');
var StatusHistoryTableTemplate = require('../templates/status_history_table_template.html');
var StatusHistoryTableItemTemplate = require('../templates/status_history_table_item_template.html');

    var StatusHistoryTableView = Backbone.View.extend({

        initialize:function(){
            this.template = StatusHistoryTableTemplate;
            this.item_template = StatusHistoryTableItemTemplate;
            this.listenTo(this.collection, 'change reset add remove', this.render);
            this.render();
        },
        render: function() {
            this.$el.html(this.template());
            var self = this;
            _.each(this.collection.models, function (item) {
                self.renderOne(item);
            }, this);
            return this;
        },
        renderOne: function(item){
            var view = this.item_template(item.toJSON());
            this.$("tbody").append(view);
            return view;
        }
    });

module.exports = StatusHistoryTableView;
