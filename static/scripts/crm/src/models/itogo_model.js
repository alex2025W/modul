var ItogoModel = Backbone.Model.extend({
        defaults:{
            'new_count':0,
            'new_price':0,
            'new_sq':0,
            'new_aver':0,
            'new_percent':0,
            'old_count':0,
            'old_price':0,
            'old_sq':0,
            'old_aver':0,
            'old_percent':0
        }
    });

module.exports = ItogoModel;