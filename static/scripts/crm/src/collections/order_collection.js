var OrderModel = require('../models/order_model');

var OrderCollection = Backbone.Collection.extend({
        url: '/handlers/orders/',
        model: OrderModel,
        parse:function(response){
            window.App.allPages = response.pages;
            window.App.clientcnt = response.clcount;
            window.App.clients_abc =response.clients_abc || {};
            return response.orders;
        }
    });

module.exports = OrderCollection;