define([
    'd3',
    'global',
    'axisview'
], function(d3, G, AxisView) {
    var AxisDaysView = AxisView.extend({
        el: '#axis .axis.days',

        initialize: function() {
            // say AxisView to move el to yPos
            this.yPos = G.config.axis.height - 1;

            AxisView.prototype.initialize.apply(this, arguments);

            this.listenTo(G.events, 'highlight:day', this.highlightDay);
        },

        initAxis: function() {
            AxisView.prototype.initAxis.apply(this, arguments);
            this.axis.orient("top");
        },

        render: function(eventType) {
            this.adjustTicksFormat();

            (eventType === 'resize' ? this.d3
                : this.d3)
                .call(this.axis)
                .call(this.centerTextLabels);
        }, // render

        adjustPan: function() {
            this.d3
                .call(this.axis)
                .call(this.centerTextLabels);
        }, // adjustPan

        highlightDay: function(dayTimestamp) {
            this.d3.selectAll('.major text')
                .style("font-size", function(d) { return dayTimestamp === +d ? "20px" : void 0; });
        }, // highlightDay


        adjustTicksFormat: function() {
            switch(this.getZoomState()) {
                case 'longDays':
                    this.axis
                        .ticks(d3.time.days, 1)
                        .tickFormat(function(d) {
                            return d3.time.format('%a %e')(d);
                        })
                        .tickSubdivide(false);
                    break;
                case 'shortDays':
                    this.axis
                        .ticks(d3.time.days, 1)
                        .tickFormat(function(d) { return d3.time.format('%e')(d); })
                        .tickSubdivide(false);
                    break;
                case 'weeks':
                    this.axis
                        .ticks(d3.time.mondays, 1)
                        .tickFormat(null)
                        .tickSubdivide(6);
                    break;
                default:
                    this.axis
                        .ticks(d3.time.months, 1)
                        .tickFormat(null)
                        .tickSubdivide(1);
            }
        }, // adjustTicksFormat


        centerTextLabels: function(selection) {
            selection.selectAll('.major text')
                .attr('transform', 'translate(' + G.utils.daysToPixels(1) / 2 + ',0)');
        }, // centerTextLabels


        dummy: {}
    });

    return AxisDaysView;
});
