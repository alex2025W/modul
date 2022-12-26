define([
    'backbone',
    'global'
], function(Backbone, G) {
    var SearchView = Backbone.View.extend({
        el: '#search',

        events: {
            'search input': 'search',
            'keyup input': 'onKeyup',
            'mouseenter button': 'onMouseEnter',
            'mouseleave button': 'onMouseLeave',
            'click button': 'onButtonClick'
        },

        initialize: function() {
            this.$el.show();
            G.router.on("route:applyDatamining", this.render, this);
        },

        render: function(dummySort, dummyCompleted, dummySelector,layersList, zoomValue, toggleValue, panValue, preselectedContractValue, searchQuery) {
            this.$el.find('input').val(searchQuery);
        },

        onMouseEnter: function() {
            this.$el.find('.tooltip').addClass('show');
        },

        onMouseLeave: function() {
            this.$el.find('.tooltip').removeClass('show');
        },

        onKeyup: function(e) {
            this.scheduleSearch(e);
        },

        onButtonClick: function(e) {
            $(e.target).closest('button').blur();
            G.appView.model.expandToSearchResults();
        },

        scheduleSearch: function(e) {
            var self = this;
            clearTimeout(self.timeout);
            self.timeout = setTimeout(function() {
                self.search(e);
                if (e.keyCode === 13) {
                    G.appView.model.expandToSearchResults();
                }
            }, G.config.searchDelay);
        },

        search: function(e) {
            var searchQuery = e.target.value;
            // don't trigger url because of truncating spaces at the end of the url
            G.router.navigateSmart({ search: searchQuery }, { trigger: false, replace: false });
            G.events.trigger("search:model", searchQuery.toLocaleLowerCase());
        },

        dummy: null
    });

    return SearchView;
});

