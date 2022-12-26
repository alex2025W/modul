define([
    'backbone',
    'global'
], function(Backbone, G) {
    var SortView = Backbone.View.extend({
        el: '#sort',

        events: {
            'click a': 'sort'
        },

        initialize: function() {
            this.$el.show();
            G.router.on("route:applyDatamining", this.render, this);
        },

        render: function() {
            this.$el.find('a').removeClass('selected asc desc');
            this.$el.find("a[href=#" + this.model.sortType + "]")
                .addClass('selected')
                .addClass(this.model.sortDesc ? 'desc' : 'asc')
                .data('desc', this.model.sortDesc);
        },

        sort: function(e) {
            $('body').addClass('waiting');
            setTimeout(function(){
                var desiredSortType = e.target.hash.slice(1),
                    desiredSortOrderIsDesc = !$(e.target).data('desc');
                G.router.navigateSmart({ sort: (desiredSortOrderIsDesc ? '!' : '') + desiredSortType }, { trigger: true });
                $('body').removeClass('waiting');
            },50);
            e.preventDefault();
        },

        dummy: null
    });

    return SortView;
});

