define([
    'jquery',
    'underscore',
    'backbone',
    'd3',
    'global',
    'planshifts_d3',
    'workstatushelper',
    'cellshelper',
    'd3.lambdas'
], function($, _, Backbone, d3, G, PlanShifts, WorkStatusHelper, CellsHelper) {
    var TimelinesView = Backbone.View.extend({
        el: "#timelines",

        initialize: function() {
            this.d3 = d3.select(this.el);

            this.listenTo(this.model, 'change', this.render);
            this.listenTo(G.events, 'toggle:viewmenu', this.render);
            this.listenTo(this.model, 'toggle', this.renderNode);
            this.listenTo(G.events, 'zoomed panned resize', this.adjustZoomAndPan);
        },


        render: function() {
            this.d3data = this.model.getD3Data();
            this.renderNode(this.d3data.dataset, true);
        },


        renderNode: function(root, animateInSitu) {
            var self = this,
                rootY = self.d3data.yScale(root.i),
                timelinesContainer = self.d3.selectAll('.timelines-container').data(self.d3data.nodes, d3.ƒ('id')),
                timelinesContainerPos = animateInSitu ?
                    function(d, i) { return 'translate(' + ( -9042 ) + ',' + self.d3data.yScale(i) + ')'; }
                    : 'translate(0,' + rootY + ')';

            // ENTER
            //
            timelinesContainer.enter().append('g')
                .attr('class', function(d) { return 'timelines-container' + (d.depth>1 ? " child" : ""); })
                .attr('data-id', d3.ƒ('id'))
                .attr('transform', timelinesContainerPos)
                .attr("opacity", 1e-6)
                .on("click", function(d) {
                    G.events.trigger("click:node", d.id);
                })
                .on("dblclick", function(d) {
                    if (!d3.event.target.classList.contains('cell-badge-clickable') && !d3.event.metaKey && !d3.event.ctrlKey) {
                        // temporary turn off tooltips engine to prevent
                        // false start hovers on the animated nodes
                        G.events.trigger('off:tooltip');
                        _.delay(function() { G.events.trigger('on:tooltip'); }, G.config.duration);
                        self.model.toggleNode(d);
                    }
                });

            // UPDATE
            //
            var a = timelinesContainer;
            a = a.attr("transform", function(d, i) {
                return "translate(0," + self.d3data.yScale(i) + ")";
            });
            a = a.attr("opacity", function(d) {
                return self.model.expanded(d) ? G.config.nodeToggleOpacity : 1;
            });
            a.call(this.d3_drawTimelines, this);

            // EXIT
            //
            timelinesContainer.exit()
                .attr("opacity", 1e-6)
                .attr("transform", timelinesContainerPos)
                .remove();

        }, // renderNode


        // rerun-safe
        d3_drawTimelines: function(timelinesContainers, self, eventType) {
            var transitionOrNot = function(selection) {
                return selection;
            };

            timelinesContainers.each(function(d) {
                var timelinesContainer = d3.select(this),
                    planTimelineContainer = timelinesContainer.selectAll(".plan-timeline").data([d]),
                    factTimelineContainer = timelinesContainer.selectAll(".fact-timeline").data([d]),
                    planShiftsContainer   = timelinesContainer.selectAll(".plan-shifts").data([d]),
                    statusesContainer     = timelinesContainer.selectAll(".statuses").data([d]),
                    selection;
                planTimelineContainer.enter().append("g").attr("class", "plan-timeline");
                factTimelineContainer.enter().append("g").attr("class", "fact-timeline");
                planShiftsContainer.enter().append("g").attr("class", "plan-shifts");
                statusesContainer.enter().append("g").attr("class", "statuses");

                //
                // PLAN TIMELINES
                //
                selection = planTimelineContainer.selectAll('.date-range');
                if (d.dateRange.plan) {
                    selection = selection.data([d.dateRange.plan]);

                    selection.enter().append('rect')
                        .attr('class', 'date-range')
                        .style('opacity', 1e-6)
                        .attr("height", G.config.timelinePlanHeight);

                    transitionOrNot(selection)
                        .style('opacity', 1)
                        .attr("x", function(d) { return G.timeScale(d.start); })
                        .attr("width", self.getTimelineWidthInPixels);
                } else {
                    selection
                        .style('opacity', 1e-6)
                        .remove();
                }


                //
                // PLAN INTERVALS
                //
                selection = planTimelineContainer.selectAll(".date-intervals");
                if (d.dateIntervals.plan) {
                    selection = selection.data([d.dateIntervals.plan]);

                    selection.enter().append("g")
                        .style('opacity', 1e-6)
                        .attr("class", "date-intervals");

                    selection.call(self.d3_drawTimelineIntervals, 'plan', self, transitionOrNot);
                    selection
                        .style('opacity', 1);
                } else {
                    selection
                        .style('opacity', 1e-6)
                        .remove();
                }


                //
                // CONTRACT PLAN TIMELINES
                //
                selection = planTimelineContainer.selectAll('.contract-date-range');
                if (d.dateRange.contract_plan) {
                    selection = selection.data([d.dateRange.contract_plan]);

                    selection.enter().append('rect')
                        .attr('class', 'contract-date-range')
                        .style('opacity', 1e-6)
                        .attr("height", G.config.timelineContractPlanHeight);

                    transitionOrNot(selection)
                        .style('opacity', 1)
                        .attr("x", function(d) { return G.timeScale(d.start); })
                        .attr("width", self.getTimelineWidthInPixels);
                } else {
                    selection
                        .style('opacity', 1e-6)
                        .remove();
                }


                //
                // CONTRACT PLAN INTERVALS
                //
                selection = planTimelineContainer.selectAll(".contract-date-intervals");
                if (d.dateIntervals.contract_plan) {
                    selection = selection.data([d.dateIntervals.contract_plan]);

                    selection.enter().append("g")
                        .style('opacity', 1e-6)
                        .attr("class", "contract-date-intervals");

                    selection.call(self.d3_drawTimelineIntervals, 'contract_plan', self, transitionOrNot);
                    selection
                        .style('opacity', 1);
                } else {
                    selection
                        .style('opacity', 1e-6)
                        .remove();
                }


                //
                // FACT TIMELINES
                //
                selection = factTimelineContainer.selectAll(".date-range");

                if (G.appView.viewMenuItemsCollection.isVisible('facts') &&
                    d.dateRange.fact) {
                    selection = selection.data([d.dateRange.fact]);

                    selection.enter().append("rect")
                        .attr("class", "date-range")
                        .style('opacity', 1e-6)
                        .attr("y", G.config.timelinePlanHeight + G.config.timelinePadding)
                        .attr("height", G.config.timelineFactHeight);

                    transitionOrNot(selection)
                        .style('opacity', 1)
                        .attr("x", function(d) { return G.timeScale(d.start); })
                        .attr("width", self.getTimelineWidthInPixels);
                } else {
                    selection
                        .style('opacity', 1e-6)
                        .remove();
                }


                //
                // FACT INTERVALS
                //
                selection = factTimelineContainer.selectAll(".date-intervals");
                if (G.appView.viewMenuItemsCollection.isVisible('facts') &&
                    (!d.scope || !G.appView.viewMenuItemsCollection.isVisible('facts_detalization')) &&
                    d.dateIntervals.fact) {
                    selection = selection.data([d.dateIntervals.fact]);

                    selection.enter().append("g")
                        .attr("class", "date-intervals")
                        .style('opacity', 1e-6)
                        .attr("transform", "translate(0, " + (G.config.timelinePlanHeight+G.config.timelinePadding) + ")");

                    selection.call(self.d3_drawTimelineIntervals, 'fact', self, transitionOrNot);
                    selection
                        .style('opacity', 1);

                } else {
                    selection
                        .style('opacity', 1e-6)
                        .remove();
                }



                //
                // FACT DETALIZATION
                //
                selection = factTimelineContainer.selectAll('.detalization').data([d]);
                if (G.appView.viewMenuItemsCollection.isVisible('facts') &&
                    G.appView.viewMenuItemsCollection.isVisible('facts_detalization') &&
                    d.scope && d.nodes) {
                    selection.enter().append('g')
                        .attr('class', 'detalization')
                        .attr('transform', 'translate(0, ' + (G.config.timelinePlanHeight + G.config.timelinePadding) + ")");
                    selection.call(self.d3_drawDetalization, self, transitionOrNot);
                } else {
                    selection.remove();
                }


                //
                // PLAN SHIFTS
                //
                PlanShifts.call(planShiftsContainer, transitionOrNot);


                //
                // DONE LABEL
                //
                var halfDayWidth = G.utils.daysToPixels(1) / 2;
                selection = statusesContainer.selectAll('.done-label');
                if (G.appView.viewMenuItemsCollection.isVisible('facts') &&
                    d.done && d.dateRange.fact) {
                    selection = selection.data([d]);

                    selection.enter().append('text')
                        .attr('class', 'done-label')
                        .attr('y', G.config.timelinePlanHeight + G.config.timelinePadding + G.config.timelineFactHeight / 2)
                        .text('✓');

                    transitionOrNot(selection)
                        .attr('x', function(d) { return G.timeScale(d.dateRange.fact.finish) + halfDayWidth; });

                } else {
                    selection.remove();
                }


                //
                // HOLDS
                //
                WorkStatusHelper.drawStatuses(statusesContainer, transitionOrNot, 'on_hold');

                //
                // WORK WITH REJECT32323
                //
                WorkStatusHelper.drawStatuses(statusesContainer, transitionOrNot, 'on_work_with_reject');

                //
                // PAUSES
                //
                WorkStatusHelper.drawStatuses(statusesContainer, transitionOrNot, 'on_pause');

                //
                // NO DATA
                //
                WorkStatusHelper.drawStatuses(statusesContainer, transitionOrNot, 'no_data');

                //
                // CELLS COMMENTS MARKS
                //
                CellsHelper.drawCommentsMarks(timelinesContainer, transitionOrNot, self.model.get('cells'));

            });
        }, // d3_drawTimelines

        d3_drawDetalization: function(detalizationContainer, self, transitionOrNot) {
            var planWork = detalizationContainer.datum(),
                daysWithFactRecord = planWork.nodes.reduce(function(result, d) {
                    result[+d.dateRange.fact.start] = {
                        date: d.dateRange.fact.start,
                        norm: d.fact.scope / planWork.scope
                    };
                    return result;
                }, {}),
                data = d3.time.day.range(planWork.dateRange.fact.start, +planWork.dateRange.fact.finish + 1)
                    .map(function(day) {
                        return daysWithFactRecord[+day] || { date: day, norm: 0 };
                    });
            data.reduce(function(total, d) { d.total = total; return total + d.norm; }, 0);
            // add one more day to close `step-after` interpolation
            data.push(_.extend({}, _.last(data), { date: d3.time.day.offset(planWork.dateRange.fact.finish, 1) }));

            //
            // STAIRS
            //
            var factRecordsArea = d3.svg.area()
                .interpolate("step-after")
                .x(function(d) { return G.timeScale(d.date); })
                .y0(function(d) { return ( 1 - d.total ) * G.config.timelineFactHeight; })
                .y1(function(d) { return ( 1 - d.total - d.norm ) * G.config.timelineFactHeight; });

            var factRecords = detalizationContainer.selectAll('.fact-record').data([data]);
            factRecords.enter().append('path')
                .attr('class', 'fact-record')
                .attr('d', factRecordsArea);

            transitionOrNot(factRecords)
                .attr('d', factRecordsArea);

            //
            // TEXT LABELS
            //
            var halfDayWidth = G.utils.daysToPixels(1) / 2,
                // font size depends on the scale
                fontSize = Math.min(12, Math.max(7, halfDayWidth)),
                label = detalizationContainer.selectAll('text')
                    .data( data.slice(0, -1).filter(function(d) { return d.norm; }) ),
                labelNormalizedHeight = fontSize / G.config.timelineFactHeight,
                labelPosition = function(d) {
                    if (1 - d.total - d.norm > labelNormalizedHeight) {
                        return 'above';
                    } else if (d.norm > labelNormalizedHeight) {
                        return 'middle';
                    } else {
                        return 'below';
                    }
                },
                y = function(d) {
                    var y;
                    switch(labelPosition(d)) {
                        case 'above':
                            y = 1 - d.total - d.norm;
                            break;
                        case 'middle':
                            y = 1 - d.total - d.norm + labelNormalizedHeight;
                            break;
                        case 'below':
                            y = 1 - d.total + labelNormalizedHeight;
                            break;
                    }
                    return y * G.config.timelineFactHeight - fontSize / 10;
                };

            label.enter().append('text')
                .classed('lighten', function(d) { return labelPosition(d) === 'middle'; })
                .style('font-size', fontSize)
                .attr('y', y)
                .attr('opacity', 1e-6)
                .attr('x', function(d) { return G.timeScale(d.date) + halfDayWidth; })
                .text(function(d) { return Math.round((d.total + d.norm) * 100); });

            transitionOrNot(label
                    .classed('lighten', function(d) { return labelPosition(d) === 'middle'; }))
                .style('font-size', fontSize)
                .attr('opacity', halfDayWidth > 6 ? 1 : 1e-6)
                .attr('y', y)
                .attr('x', function(d) { return G.timeScale(d.date) + halfDayWidth; });
        }, // d3_drawDetalization


        d3_drawTimelineIntervals: function(intervalsContainer, key, self, transitionOrNot) {
            var interval = intervalsContainer.selectAll("rect")
                    .data(intervalsContainer.datum(), function(d) { return +d.finish; });

            interval.enter().append("rect")
                .style('opacity', 1e-6)
                .attr("height", key === 'fact' ? G.config.timelineFactHeight : (key==='contract_plan'?G.config.timelineContractPlanHeight:G.config.timelinePlanHeight) );

            transitionOrNot(interval)
                .style('opacity', 1)
                .attr("x", function(d) { return G.timeScale(d.start); })
                .attr("width", self.getTimelineWidthInPixels);

            transitionOrNot(interval.exit())
                .style('opacity', 1e-6)
                .remove();
        }, // d3_drawTimelineIntervals


        getTimelineWidthInPixels: function(dates) {
            // extend finish to the next date
            // if start == finish then range should be 1 day
            var extendedFinish = new Date(dates.finish);
            extendedFinish.setDate(extendedFinish.getDate() + 1);
            return G.timeScale(extendedFinish) - G.timeScale(dates.start);
        }, // getTimelineWidthInPixels


        adjustZoomAndPan: function(eventType) {
            this.d3.selectAll('.timelines-container').call(this.d3_drawTimelines, this, eventType);
        }, // adjustZoom


        dummy: {}
    });

    return TimelinesView;
});
