var HistoryWorkStatusModel = Backbone.Model.extend({
        defaults:{
            'manager': '',
            'datetime': '',
            'note': '',
            'status': 'active'
        }
    });

module.exports = HistoryWorkStatusModel;