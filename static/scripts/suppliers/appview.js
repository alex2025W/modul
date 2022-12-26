define([
    'jquery',
    'backbone',
    'supplierslistview',
    'supplierscollection',
    'supplierform',
    'suppliermodel',
    'goodslistview',
    'goodform',
    'goodmodel'
], function($, Backbone, SuppliersListView, SuppliersCollection, SupplierForm, SupplierModel, GoodsListView, GoodForm, GoodModel) {
	var AppView = Backbone.View.extend({
        el: "#app",

        initialize: function() {
            this.collection = new SuppliersCollection();
            this.collection.fetch({async: false});
        },

        showSuppliersListView: function() {
            var view = new SuppliersListView({ collection: this.collection });
            this.setView(view);
        },

        showNewSupplierForm: function(name) {
            this.setView(new SupplierForm({ model: new SupplierModel({name: name, enabled: true}), collection: this.collection }));
        },

        showEditSupplierForm: function(id) {
            var model = this.collection.get(id);
            this.setView(new SupplierForm({ model: model }));
        },

        showGoods: function(id) { 
            var model = this.collection.get(id);
            model.goods.fetch({async: false});
            this.setView(new GoodsListView({ model: model, collection: model.goods }));
        },

        showNewGoodForm: function(id, name) {
            this.setView(new GoodForm({ model: new GoodModel({name: name}), supplier: this.collection.get(id) }));
        },

        showEditGoodForm: function(supplier_id, good_code) {
            var supplier = this.collection.get(supplier_id);
            supplier.goods.fetch({async: false});
            var good = supplier.goods.get(good_code);

            this.setView(new GoodForm({ model: good, supplier: supplier }));
        },

        setView: function(view) {
            if (this.currentView) {
                this.currentView.remove();
            }
            this.$el.html(view.render().el);
            if (view.onSet) {
                view.onSet();
            }
            if (view.getParentUrl) {
                this.$el.find('section').before(_.template($('#gotoParentTemplate').html())({ url: view.getParentUrl() }));
            }
            this.currentView = view;
        },

        dummy: null
	});

    return AppView;
});
