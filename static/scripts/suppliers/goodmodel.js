define([
    'jquery',
    'backbone',
    'goodscollection',
    'backbone.validation'
], function($, Backbone, GoodsCollection) {
	var GoodModel = Backbone.Model.extend({
        idAttribute: 'code',

        defaults: {
            enabled: true,
            code: null,
            supplier_code: null,
            name: "",
            manufactor: "",
            sku: "штука",
            retail_delivery: {
                enabled: false,
                unit: "", 
                size: null,
                price: null,
                price_expiry_date: (function() { var now = new Date(); now.setMonth(now.getMonth()+1); return now.toISOString().substr(0,10).split('-').reverse().join('.'); })(),
                delivery: {
                    enabled: false,
                    time_min: null,
                    time_max: null,
                    cost: null
                }
            },
            sale_delivery: {
                enabled: false,
                unit: "", 
                size: null,
                price: null,
                price_expiry_date: (function() { var now = new Date(); now.setMonth(now.getMonth()+1); return now.toISOString().substr(0,10).split('-').reverse().join('.'); })(),
                delivery: {
                    enabled: false,
                    time_min: null,
                    time_max: null,
                    cost: null
                }
            },
            note: ""
        },

        initialize: function() { 
        },

        validation: {
            name: { required: true },
            sku: { required: true },
            "retail_delivery.size": {
                fn: function(value, attr, computedState) { return this._requiredIfEnabled(value, attr, computedState.retail_delivery); }
            },
            "retail_delivery.unit": {
                fn: function(value, attr, computedState) { return this._requiredIfEnabled(value, attr, computedState.retail_delivery); }
            },
            "retail_delivery.price": {
                fn: function(value, attr, computedState) { return this._requiredIfEnabled(value, attr, computedState.retail_delivery); }
            },
            "retail_delivery.price_expiry_date": {
                fn: function(value, attr, computedState) { return this._requiredIfEnabled(value, attr, computedState.retail_delivery); }
            },
            "retail_delivery.delivery.time_min": {
                fn: function(value, attr, computedState) { return this._requiredIfEnabled(value, attr, computedState.retail_delivery.delivery); }
            },
            "retail_delivery.delivery.time_max": {
                fn: function(value, attr, computedState) { return this._requiredIfEnabled(value, attr, computedState.retail_delivery.delivery); }
            },
            "sale_delivery.size": {
                fn: function(value, attr, computedState) { return this._requiredIfEnabled(value, attr, computedState.sale_delivery); }
            },
            "sale_delivery.unit": {
                fn: function(value, attr, computedState) { return this._requiredIfEnabled(value, attr, computedState.sale_delivery); }
            },
            "sale_delivery.price": {
                fn: function(value, attr, computedState) { return this._requiredIfEnabled(value, attr, computedState.sale_delivery); }
            },
            "sale_delivery.price_expiry_date": {
                fn: function(value, attr, computedState) { return this._requiredIfEnabled(value, attr, computedState.sale_delivery); }
            },
            "sale_delivery.delivery.time_min": {
                fn: function(value, attr, computedState) { return this._requiredIfEnabled(value, attr, computedState.sale_delivery.delivery); }
            },
            "sale_delivery.delivery.time_max": {
                fn: function(value, attr, computedState) { return this._requiredIfEnabled(value, attr, computedState.sale_delivery.delivery); }
            }
        },

        _requiredIfEnabled: function(value, attr, container) { 
            if (container.enabled && !this._hasValue(value)) {
                return attr + " is required";
            }
        },
        _hasValue: function(value) {
            return !(_.isNaN(value) || _.isNull(value) || _.isUndefined(value) || (_.isString(value) && value.trim() === '') || (_.isArray(value) && _.isEmpty(value)));
        },

    });

    return GoodModel;
});
