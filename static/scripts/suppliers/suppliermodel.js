define([
    'jquery',
    'backbone',
    'goodscollection',
    'backbone.validation'
], function($, Backbone, GoodsCollection) {
	var SupplierModel = Backbone.Model.extend({
        urlRoot: '/suppliers/api/suppliers',

        goods: null,

        initialize: function() { 
            this.goods = new GoodsCollection;
            this.goods.url = this.urlRoot + '/' + this.id + '/goods';
        },

        validation: {
            name: {
                required: true
            }
        }
    });

    return SupplierModel;
});
