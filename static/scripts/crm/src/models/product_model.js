var ProductModel = Backbone.Model.extend({
        defaults:{
            'type':'',
            'name':'',
            'count':0,
            'sq':0.0,
            'price':0,
            'approx':'no',
            'approx_sq':'no',
            'addrs':'',
            'length':'',
            'width': '',
            'height': '',
            'positions':[],
            'is_complect':false,
            'linked_orders': []
        }
    });

module.exports = ProductModel;