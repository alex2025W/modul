define([
    'jquery',
    'backbone',
    'global',
    'appview'
], function($, Backbone, G, AppView) {

    var appView = new AppView;

    var AppRouter = Backbone.Router.extend({
        initialize: function() {
            this.listenTo(G.events, "gotoIndex", function() { this._goto(''); }, this);
            this.listenTo(G.events, "gotoGoods", function(supplier_id) { this._goto('//edit/' + supplier_id + '/goods'); }, this);
        },

        routes: {
            '': 'index',
            'new(/*name)': 'new',
            'edit/:supplier_id': 'edit',
            
            // good
            'edit/:supplier_id/goods': 'goods',
            'edit/:supplier_id/goods/new(/*name)': 'new_good',
            'edit/:supplier_id/goods/edit/:good_code': 'edit_good',

            // default
            "*actions": 'defaultAction'
        },

        index: function() {
            appView.showSuppliersListView();
        },

        "new": function(name) {
            appView.showNewSupplierForm(name);
        },

        edit: function(supplier_id) {
            appView.showEditSupplierForm(supplier_id);
        },

        goods: function(supplier_id) {
            appView.showGoods(supplier_id);
        },

        new_good: function(supplier_id, name) {
            appView.showNewGoodForm(supplier_id, name);
        },

        edit_good: function(supplier_id, good_code) {
            appView.showEditGoodForm(supplier_id, good_code);
        },

        defaultAction: function(actions) {
            console.warn("No route: ", actions);
        },

        _goto: function(fragment, options) {
            this.navigate(fragment, { trigger: true });
        }
    });

    var initialize = function() {
        new AppRouter();
        Backbone.history.start();
    };

    return {
        initialize: initialize
    };
});
