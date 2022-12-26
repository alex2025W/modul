var ProductModel = require('../models/product_model');

var ProductCollection = Backbone.Collection.extend({
        model: ProductModel,
        parse:function(response){
            return response;
        }
    });

module.exports = ProductCollection;