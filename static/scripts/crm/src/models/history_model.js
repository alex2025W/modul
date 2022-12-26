var HistoryModel = Backbone.Model.extend({
        defaults:{
            'condition':'',
            'condition_type':'',
            'reason':'',
            'comments':[],
            'chance':0,
            'enddate':'',
            'datetime':'',
            'manager':'',
            'contact':'',
            'log':[]
        }
    });

module.exports = HistoryModel;