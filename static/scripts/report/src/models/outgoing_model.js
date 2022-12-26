var OutgoingModel = Backbone.Model.extend({
    urlRoot:'/handlers/contracts/outgoing',
    defaults:{
        correspondent: '',
        //name: '',
        type: '',
        note: '',
        number: 0,
        date: '',
        user: ''
    }
});

module.exports = OutgoingModel;
