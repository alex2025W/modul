var PositionModel = Backbone.Model.extend({
        defaults:{
            'num':0,
            'addr':'',
            'mont':'',
            'shmont':'',
            'mont_price':'',
            'mont_price_type':0
        }
    });

module.exports = PositionModel;