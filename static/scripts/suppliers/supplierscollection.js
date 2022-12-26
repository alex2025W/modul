define([
    'jquery',
    'backbone',
    'suppliermodel'
], function($, Backbone, SupplierModel) {

	var SuppliersCollection = Backbone.Collection.extend({
        url: '/suppliers/api/suppliers',
		model: SupplierModel,

        // parse: function(a) {
        //     console.log('coll parse');
        //     return a;
        // }
	});

    return SuppliersCollection;
});
