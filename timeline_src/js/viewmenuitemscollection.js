define([
    'backbone',
    'global'
], function(Backbone, G) {

    var ViewMenuItemModel = Backbone.Model.extend({
        idAttribute: 'name',

        toggle: function() {
            if (this.get('disabled')) {
                return;
            }
            this.set('visible', !this.get('visible'));

            if (this.get('name') === 'contract_level') {
                G.appView.model.trigger('change');
            }

            // facts and facts_detalization link
            //
            if (this.get('name') === 'facts') {
                this.collection.get('facts_detalization').set('disabled', !this.get('visible'));
            }

            if (this.get('name') === 'empty_contracts') {
                G.appView.model.trigger('change');
            } else {
                G.events.trigger('toggle:viewmenu', this);
            }            
        }
    });

    var ViewMenuItemsCollection = Backbone.Collection.extend({
        model: ViewMenuItemModel,

        initialize: function() {
            this.add([{
                name: 'contract_level',
                visible: true
            }, {
                name: 'plan_shifts',
                visible: true
            }, {
                name: 'statuses',
                visible: true
            }, {
                name: 'comments',
                visible: true
            }, {
                name: 'empty_contracts',
                visible: true
            }, {
                name: 'facts',
                visible: true
            }, {
                name: 'facts_detalization',
                visible: true
            }]);
        },

        isVisible: function(name) {
            return this.get(name).get('visible');
        }
    });

    return ViewMenuItemsCollection;
});

