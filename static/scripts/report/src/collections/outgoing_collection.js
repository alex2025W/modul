var OutgoingModel = require('../models/outgoing_model');

var OutgoingCollection = Backbone.Collection.extend({
    url: '/handlers/contracts/outgoinglist/',
    model: OutgoingModel
});

module.exports = OutgoingCollection;
