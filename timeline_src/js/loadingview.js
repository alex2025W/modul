define([
    'backbone',
    'global'
], function(Backbone, G) {
    var LoadingView = Backbone.View.extend({
        id: 'ajax-loading',
        tagName: 'div',

        initialize: function() {
            this.loadingCounter = 0;

            this.listenTo(G.events, "start:loading", this.showLoading);
            this.listenTo(G.events, "stop:loading", this.hideLoading);

            $(document.body).append( this.render() );
        },

        render: function() {
            var $el = this.$el;
            this.$el.text("Загрузка...").hide()
                // smart message: avoids user mouse
                .mousemove(function(e) {
                    var padding = 50;
                    if (e.clientX < $(window).width()/2) {
                        $el.css({ "margin-left": e.clientX + padding });
                    } else {
                        $el.css({ "margin-left": e.clientX - $el.outerWidth() - padding });
                    }
                    $el.css({ transition: "margin 0.2s" });
                });
            return this.$el;
        }, // render

        showLoading: function(quick) {
            this.loadingCounter++;
            this.$el.css({ "margin-left": $(window).width()/2 - this.$el.outerWidth()/2 });
            if (quick) {
                this.$el.show();
            } else {
                this.$el.fadeIn();
            }
        },

        hideLoading: function() {
            this.loadingCounter = Math.max(0, this.loadingCounter - 1);
            if (!this.loadingCounter) {
                this.$el.fadeOut();
            }
        },

        dummy: null
    });

    return LoadingView;
});
