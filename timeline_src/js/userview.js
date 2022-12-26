define([
    'underscore',
    'backbone'
], function(_, Backbone) {
    var UserView = Backbone.View.extend({
        el: '#user-menu',
        template: $('#user-menu-template').html(),

        initialize: function() {
            this.listenTo(this.model, 'change', this.render);
            this.listenTo(this.model, 'error', this.showError);
        },

        render: function() {
            this.$el.find('.dropdown-menu').html(
                _.template(this.template, { userId: this.model.get('user_id') })
            );
            this.$el.find('.dropdown-toggle').prop('title', this.model.get('user_id'));
            this.$el.show();
        }, // render

        showError: function() {
            this.$el.find('.dropdown-menu').html(
                _.template(this.template, { userId: "Не удалось получить User ID" })
            );
        }, // render

        dummy: null
    });

    return UserView;
});
