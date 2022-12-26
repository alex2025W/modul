var ManagerStatModel = require('../models/manager_stat_model');

var ManagerStatCollection = Backbone.Collection.extend({
    model: ManagerStatModel,
    url: '/handlers/manager/'
});

module.exports = ManagerStatCollection;