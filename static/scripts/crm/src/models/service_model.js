var getloc = require('../utils/getloc');

var ServiceModel = Backbone.Model.extend({
        defaults:{
            'number':'',
            "user_email":"",
            "type":'',
            'name':'',
            'price':0,
            'approx':'no',
            'product_include':'no',
            'by_production':false,
            'units':[],
            'note':''
        },
        initialize:function(){
            if(!this.get("_id")){
                this.set("_id","new_"+this.cid);
            }
        }
    });

module.exports = ServiceModel;