define([
    'd3',
    'backbone',
    'global',
], function(d3, Backbone, G) {
    var TodayView = Backbone.View.extend({
        el: '#today',

        initialize: function() {
            this.d3 = d3.select(this.el)
                .attr("transform", "translate(" + G.config.margin.left + ", 0)");

            this.listenTo(this.model, 'change toggle', this.render);
            this.listenTo(G.events, 'panned zoomed resize', this.render);
        },

        render: function(eventType) {
            var x = function(d) { return "translate(" + G.timeScale(d) + ", 0)"; },
                now = new Date(),
                height = G.utils.getMaxHeight(this.model);

            var todayDay = this.d3.selectAll("rect").data([ new Date(now.getFullYear(), now.getMonth(), now.getDate()) ]);

            todayDay.enter()
                .append('rect')
                .attr('opacity', 0)
                .attr("height", height)
                .attr("transform", x);

            todayDay
                .attr('opacity', 1)
                .attr("height", height)
                .attr("transform", x)
                .attr("width", G.utils.daysToPixels(1));
        } // render
    });

    return TodayView;
});
