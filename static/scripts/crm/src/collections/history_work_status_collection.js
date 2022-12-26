var HistoryWorkStatusModel = require('../models/history_work_status_model');

var HistoryWorkStatusCollection = Backbone.Collection.extend({
        model: HistoryWorkStatusModel
    });

module.exports = HistoryWorkStatusCollection;