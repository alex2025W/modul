var PodpisantModel = require('../models/podpisant_model');

var PodpisantCollection = Backbone.Collection.extend({
        model: PodpisantModel
    });

module.exports = PodpisantCollection;