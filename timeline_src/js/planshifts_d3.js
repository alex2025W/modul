define([
    'd3',
    'global',
    'd3.lambdas'
], function(d3, G) {

    var PlanShifts = {

        initMarkers: function() {
            var svg = d3.select('#canvas'),
                defs = svg.select('defs'),
                w, h, r;
            // dot
            r = G.config.planShiftDotRadius;
            defs.append("marker")
                    .attr("id", "plan-shift-dot")
                    .attr("viewBox", [-r, -r, r*2, r*2].join(' '))
                    .attr("markerWidth", r)
                    .attr("markerHeight", r)
                .append("circle")
                    .attr('r', r);
            // arrow
            w = G.config.planShiftArrowWidth;
            h = G.config.planShiftArrowHeight;
            defs.append("marker")
                    .attr("id", "plan-shift-arrow")
                    .attr("viewBox", "-1 -1 " + (h+2) + " " + (w+2) )
                    .attr("refX", h)
                    .attr("refY", w/2)
                    .attr("markerWidth", h + 2)
                    .attr("markerHeight", w + 2)
                    .attr("orient", "auto")
                .append("path")
                    .attr("d", "M0,0 L" + h + "," + w/2 + "L0," + w + " Z");
        },

        call: function(container, transitionOrNot) {
            // init PlanShifts markers
            //
            if (this.initMarkers) {
                this.initMarkers();
                delete this.initMarkers;
            }

            // init node
            //
            var d = container.datum();
            this.transitionOrNot = transitionOrNot;

            if (this.planShiftsIsVisible(d)) {
                container = container.data([d]);
                // ENTER
                //
                container.enter().append('g')
                    .attr('class', 'plan-shifts')
                    .style('opacity', 1e-6);

                // UPDATE
                //
                container.call(this.drawPlanShifts, this);
                transitionOrNot(container).style('opacity', 1);
            } else {
                // EXIT
                //
                transitionOrNot(container)
                    .style('opacity', 1e-6)
                    .remove();
            }
        }, // call


        planShiftsIsVisible: function(d) {
            return G.appView.viewMenuItemsCollection.isVisible('plan_shifts') &&
                ( d.plan_shifts ||
                    ( d.dateRange.plan_before_last_shift &&
                            ( +d.dateRange.plan_before_last_shift.start !== +d.dateRange.plan.start || 
                            +d.dateRange.plan_before_last_shift.finish !== +d.dateRange.plan.finish
                            )
                    )
                )
            ;
        },

        drawPlanShifts: function(container, self) {
            var d = container.datum();
            ['start', 'finish'].forEach(function(type) {
                self.drawLine(type, container, d.dateRange.plan[type], d.dateRange.plan_before_last_shift[type]);
                self.drawBackground(type, container, d.dateRange.plan[type], d.dateRange.plan_before_last_shift[type]);
            });
        }, // drawPlanShifts


        drawLine: function(type, container, plan_date, initial_date) {
            var self = this,
                classnames = ['line-'+type, 'line-'+type+'-shadow'],
                plan_shift = +initial_date === +plan_date ? [] : [ initial_date ],
                dayWidth = G.utils.daysToPixels(1),
                line;

            var path_d = function(d) {
                    var width = self.getLineWidth(plan_date, d),
                        curveHeight = (type === "start" ? 1 : -1) * G.config.planShiftCurveHeight;
                    return "M0,0 Q" + width/2 + "," + curveHeight*2 + " " + width + ",0";
                },
                transform_d = function(d) {
                    return 'translate(' + ( G.timeScale(d) + dayWidth * (type === "start" ? 1/4 : 3/4) ) + ', ' +
                            G.config.timelinePlanHeight / 2 + ')';
                };

            // draw line and its shadow
            //
            classnames.forEach(function(classname) {
                line = container.selectAll('.' + classname)
                    .data(plan_shift, d3.ƒ(type));

                line.enter().append('path')
                    .attr('class', classname)
                    .style('opacity', 1e-6)
                    .attr("marker-start", "url(#plan-shift-dot)")
                    .attr("marker-end", "url(#plan-shift-arrow)")
                    .attr('d', path_d)
                    .attr('transform', transform_d);

                self.transitionOrNot(line)
                    .style('opacity', 1)
                    .attr('d', path_d)
                    .attr('transform', transform_d);

                self.transitionOrNot(line.exit())
                    .style('opacity', 1e-6)
                    .remove();
            });
        }, // drawLine

        drawBackground: function(type, container, plan_date, initial_date) {
            var self = this,
                dayWidth = G.utils.daysToPixels(1),
                plan_shift = +initial_date === +plan_date ? [] : [ initial_date ],
                background = container.selectAll('.plan-shift-background-' + type).data(plan_shift, d3.ƒ(type));

            background.enter().append('rect')
                .attr('class', 'background plan-shift-background-' + type)
                .attr('data-shiftType', type)
                .attr('height', G.config.timelinePlanHeight + G.config.planShiftCurveHeight)
                .attr('y', type === "start" ? 0 : -G.config.planShiftCurveHeight);
            background
                .attr('width', function(d) { return Math.abs(self.getLineWidth(plan_date, d)); })
                .attr('x', function(d) { return G.timeScale(Math.min(d, plan_date)) + dayWidth * (type === "start" ? 1/4 : 3/4); });
            background.exit().remove();
        }, // drawBackground

        getLineWidth: function(plan_date, initial_date) {
            return G.timeScale(plan_date) - G.timeScale(initial_date);
        }, // getLineWidth

        dummy: null

    }; // PlanShifts

    return PlanShifts;
});
