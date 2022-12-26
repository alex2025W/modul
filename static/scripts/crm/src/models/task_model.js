var TaskModel = Backbone.Model.extend({
        defaults:{
            'condition':'',
            'comment':'',
            'datetime':'',
            'manager':'',
            'closedatetime': '',
            'status':''
        }
    });

module.exports = TaskModel;