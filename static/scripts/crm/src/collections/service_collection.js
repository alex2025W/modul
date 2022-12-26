var ServiceModel = require('../models/service_model');

var ServiceCollection = Backbone.Collection.extend({
        model: ServiceModel
    });

module.exports = ServiceCollection;