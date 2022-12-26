define([
    'd3',
    'backbone',
    'global'
], function(d3, Backbone, G) {
    var AxisView = Backbone.View.extend({
        // define view root node here
        el: '',

        // To access `initialize` from children use this:
        // AxisView.prototype.initialize.call(this);
        //
        initialize: function() {
            this.d3 = d3.select(this.el)
                .attr("transform", "translate(" + G.config.margin.left + ","
                                                + (this.yPos||0) + ")");

            this.listenToOnce(G.events, 'data-ready', this.initAxis);
            this.listenToOnce(G.events, 'data-ready', this.render);
            this.listenTo(G.events, 'zoomed resize', this.render);
            this.listenTo(G.events, 'panned', this.adjustPan);
        },

        initAxis: function() {
            this.axis = d3.svg.axis().scale(G.timeScale).tickSize(0,0,0);
        },

        getZoomState: function() {
            var delta = G.utils.daysToPixels(7);
            return d3.entries(G.config.axis.ticks).filter(function(e) {
                return e.value <= delta;
            })[0].key;
        }, // getZoomState

        dummy: {}

    });

    return AxisView;
});
