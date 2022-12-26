var ContactModel = require('../models/contact_model');

var ContactCollection = Backbone.Collection.extend({
        model: ContactModel
    });

module.exports = ContactCollection;