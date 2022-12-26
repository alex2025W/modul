var HistoryModel = require('../models/history_model');

var HistoryCollection = Backbone.Collection.extend({
        model: HistoryModel
    });

module.exports = HistoryCollection;