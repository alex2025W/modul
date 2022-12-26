define([
    'jquery',
    'backbone',
    'goodmodel'
], function($, Backbone, GoodModel) {

	var GoodsCollection = Backbone.Collection.extend({
		model: GoodModel
	});

    return GoodsCollection;
});
