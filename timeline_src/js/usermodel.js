define([
    'jquery',
    'backbone',
    'global',
    'jquery.jsonp'
], function($, Backbone, G) {
    var UserModel = Backbone.Model.extend({

        url: G.config.user_id_url,

        // load data from external source
        //
        sync: function(method, model, options) {
            options = $.extend({}, options, {
                url: this.url,
                success: function(resp) {
                    try {
                        model.completeSync(resp); // will trigger `change` event
                        model.trigger('sync', model, resp, options);
                    } catch (e) {
                        G.utils.logException(e);
                        model.trigger('error', { code: 1, exception: e });
                    }
                },
                error: function() {
                    model.trigger('error', arguments);
                }
            });

            var xhr = options.xhr = $.ajax(options);
            model.trigger('request', model, xhr, options);
        }, // sync

        completeSync: function(user_id) {
            this.set('user_id', user_id);

            G.events.trigger('userid:usermodel', user_id);
        }, // completeSync

        dummy: null
    });

    return UserModel;
});
