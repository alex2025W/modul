define([
    'jquery',
    'backbone'
], function($, Backbone) {
	var GoodView = Backbone.View.extend({
		tagName: "tr",
		template: _.template($('#goodItemTemplate').html()),

        initialize: function(options) {
            this.supplier_id = options.supplier_id;
            this.$el.data('cid', this.model.cid);
        },
    
		render: function() {
			this.$el.html(this.template({supplier_id: this.supplier_id, good: this.model.toJSON()}));
			return this;
		}
	});

    return GoodView;  
});
