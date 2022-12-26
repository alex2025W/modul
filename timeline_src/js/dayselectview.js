define([
    'underscore',
    'd3',
    'backbone',
    'global',
], function(_, d3, Backbone, G) {
    var DaySelectView = Backbone.View.extend({
        el: '#axis',

        events: {
            // use mousedown instead of click to prevent selection of
            // text by shift+click on days range
            "mousedown": "selectDay"
        },

        // selection[0] — start of selection (anchor)
        // selection[1] — end of exstended selection
        selection: [],

        initialize: function() {
            this.d3_daySelectBar = d3.select('#day-select')
                .attr("transform", "translate(" + G.config.margin.left + ", 0)");

            this.listenTo(this.model, 'change toggle', this.render);
            this.listenTo(G.events, 'panned zoomed resize', this.render);
        },


        render: function(eventType) {
            var sortedSelection = _.sortBy(this.selection);
            var daySelect = this.d3_daySelectBar.selectAll("rect").data(new Array(1));
            if (sortedSelection.length) {
                var daysInSelection = 1 +
                        (_.last(sortedSelection) - _.first(sortedSelection)) / 1000/60/60/24;
                var barHeight = G.utils.getMaxHeight(this.model);
                var barWidth = G.utils.daysToPixels(daysInSelection);
                var barX = "translate(" + G.timeScale(sortedSelection[0]) + ", 0)";

                // ENTER
                //
                daySelect.enter()
                    .append('rect');

                // UPDATE
                //
                daySelect
                    .attr("height", barHeight)
                    .attr("transform", barX)
                    .attr("width", barWidth);
            } else {
                daySelect.remove();
            }

            // highlight day at the days axis
            //
            d3.select(this.el).select('.axis.days')
                .classed('selected', this.selection.length)
                .selectAll('.major')
                    .classed('selected-day', function(d) {
                        return G.utils.dateWithinRange(d, sortedSelection);
                    });

            return this;
        }, // render


        selectDay: function(e) {
            // ignore clicks on the brief links
            if (e.target.classList.contains('brief-link')) { return; }

            var selectedDay = d3.time.day(G.timeScale.invert(e.clientX - G.config.margin.left));
            if (!e.shiftKey) {
                // set selection anchor
                //
                if (G.utils.dateWithinRange(selectedDay, _.sortBy(this.selection))) {
                    // clear selection if clicked within selection
                    this.selection = [];
                } else {
                    // set selection anchor
                    this.selection = [ selectedDay ];
                }
            } else {
                // extend selection
                //
                if (this.selection.length) {
                    // set extended selection
                    this.selection[1] = selectedDay;
                } else {
                    // set selection anchor
                    this.selection = [ selectedDay ];
                }
            }
            G.events.trigger('brief-filter:model', this.selection);
            G.events.trigger('select:day', this.selection);

            e.preventDefault();
        },

        dummy: void 0
    });

    return DaySelectView;
});
