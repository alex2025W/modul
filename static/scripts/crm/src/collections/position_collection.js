var PositionModel = require('../models/position_model');

var PositionCollection = Backbone.Collection.extend({
        model: PositionModel,
        parse:function(response){
            return response;
        }
    });

module.exports = PositionCollection;