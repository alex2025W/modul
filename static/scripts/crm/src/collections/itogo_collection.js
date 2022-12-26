var ItogoModel = require('../models/itogo_model.js');
var ItogoCollection = Backbone.Collection.extend({
        url: '/handlers/itogo/',
        model: ItogoModel,
        parse:function(response){
            window.App.clients = response.clients;
            window.App.summaryCount = response.count;
            return response.result;
        }
    });

module.exports = ItogoCollection;