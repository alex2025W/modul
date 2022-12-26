define([
    'd3',
    'backbone',
    'global',
], function(d3, Backbone, G) {

    var DateRangesView = Backbone.View.extend({
        el: '#date-ranges',

        waitBeforeHide: 500,


        initialize: function() {
            d3.select(this.el)
                .attr("transform", "translate(" + G.config.margin.left + ", 4)");

            G.events.on('show_daterange:tooltip', this.onShowDateRange, this);
            G.events.on('hide:tooltip', this.hide, this);
            G.events.on('show_menu:day', this.hideNow, this);
            G.events.on('panned zoomed resize', this.adjust, this);
        },



        onShowDateRange: function(datum) {
            if (this.hideTimer) {
                clearTimeout(this.hideTimer);
                this.hideTimer = void 0;
            }
            this.datum = datum;
            this.$el.stop(true, true).show();
            this.render(datum);
        }, // onShowDateRange



        adjust: function(eventType) {
            if (this.datum) {
                this.render(this.datum, eventType);
            }
        }, // adjust



        render: function(datum, eventType) {
            var self = this,
                getDataByType = function (type) { return datum.dateRange[type] ? [datum.dateRange[type]] : [] },
                getOriginYByType = function (type) { return { plan: 0, fact: 10 }[type]; };

            ['plan', 'fact'].forEach(function(type) {
                var container = d3.select(self.el).selectAll('.' + type).data(getDataByType(type));
                container.enter().append('g')
                    .attr('class', type)
                    .attr('opacity', 1e-6)
                    .attr('transform', 'translate(0, ' + getOriginYByType(type) + ')');

                container
                    .classed('child', datum.depth > 1)
                    .call(self.d3_drawDateRanges, self, eventType)
                    .attr('opacity', 1)

                container.exit()
                    .attr('opacity', 1e-6)
                    .remove();

            });
        }, // render



        d3_drawDateRanges: function(dateRangeContainer, self, eventType) {
            if (dateRangeContainer.empty()) { return; }

            var datum = dateRangeContainer.datum(),
                durationInDays = (datum.finish - datum.start)/1000/60/60/24 + 1,
                dayWidth = G.utils.daysToPixels(1),
                markHeight = 9,
                markWidth = dayWidth * Math.min(2, durationInDays-1) / 2, // reduce width if duration is lower than 3 days
                drawStart = function(d) { return 'M0,0 l0,' + markHeight +', M0,' + markHeight/2 + ', l' + markWidth +', 0'; },
                drawFinish = function(d) { return 'M0,0 l0,' + markHeight +', M0,' + markHeight/2 + ', l-' + markWidth +', 0'; },
                transform = function(d) { return 'translate(' + (G.timeScale(d) + dayWidth/2) +  ', 0)'; },
                durationTextPadding = 5,
                durationTextTransform = 'translate(-' + (markWidth + durationTextPadding) +  ', ' + (markHeight - 1) + ')';

            // draw start mark
            //
            var start = dateRangeContainer.selectAll('.start').data(function(d) { return [d.start]; });
            start.enter().append('g')
                .attr('class', 'start')
                .attr('transform', transform)
                .append('path')
                    .attr('d', drawStart);

            if (eventType !== "panned") {
                start
                    .selectAll('path')
                    .attr('d', drawStart);
            }
            start
                .attr('transform', transform);


            // draw finish mark and duration text
            //
            var finish = dateRangeContainer.selectAll('.finish').data(function(d) { return [d.finish]; });
            var finishEnter = finish.enter().append('g')
                .attr('class', 'finish')
                .attr('transform', transform);
            finishEnter
                .append('path')
                    .attr('d', drawFinish);
            finishEnter
                .append('text')
                    .attr('transform', durationTextTransform)
                    .text(durationInDays);

            if (eventType !== "panned") {
                finish
                    .selectAll('path')
                        .attr('d', drawFinish);
                finish
                    .selectAll('text')
                        .attr('transform', durationTextTransform)
                        .attr('opacity', durationInDays > 3 ? 1 : 1e-6);
            }
            finish
                .attr('transform', transform);
        }, // d3_drawDateRanges




        hide: function() {
            var self = this;

            if (this.hideTimer) {
                clearTimeout(this.hideTimer);
                this.hideTimer = void 0;
            }

            this.hideTimer = setTimeout(function() {
                self.$el.fadeOut();
            }, this.waitBeforeHide);
        }, // hide

        hideNow: function() {
            if (this.hideTimer) {
                clearTimeout(this.hideTimer);
                this.hideTimer = void 0;
            }
            this.$el.hide();
        }, // hideNow



        dummy: null

    });

    return DateRangesView;
});
