define([
    'jquery',
    'backbone'
], function($, Backbone) {
	var SupplierView = Backbone.View.extend({
		tagName: "tr",
		template: _.template($('#supplierItemTemplate').html()),

        initialize: function() {
            this.$el.data('cid', this.model.cid);
        },
    
		render: function() {
			this.$el.html(this.template(this.model.toJSON()));
			return this;
		}
	});

    return SupplierView;  
});
