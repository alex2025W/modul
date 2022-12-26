define([
    'jquery',
    'underscore',
    'backbone'
], function($, _, Backbone) {
    var Global = {
        initialize: function() {
            this.events = _.extend({}, Backbone.Events);
        },
    };
    Global.initialize();

    return Global;
});
