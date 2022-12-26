var IncomingModel = require('../models/incoming_model');
var IncomingCollection = Backbone.Collection.extend({
  url: '/handlers/contracts/incominglist/',
  model: IncomingModel
});
module.exports = IncomingCollection;
