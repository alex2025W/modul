define([
  'd3',
  'global',
  'axisview'
], function(d3, G, AxisView) {
  var GridView = AxisView.extend({
    el: '#grid',

    initialize: function() {
      AxisView.prototype.initialize.apply(this, arguments);

      // subscribe to the change and toggle events when the data is ready
      // and AxisView is initialized
      this.listenToOnce(G.events, 'data-ready', function() {
        this.listenTo(this.model, 'change toggle', this.render);
      });
    },

    initAxis: function() {
      AxisView.prototype.initAxis.apply(this, arguments);
      var height = G.utils.getMaxHeight(this.model);
      this.axis
        .tickSize(height, height)
        .tickFormat("");

      this.d3.append('g').attr('class', 'days-ticks');
      this.d3.append('g').attr('class', 'weekends');
      this.d3.append('g').attr('class', 'month-ticks');
    },

    render: function() {
      this.renderGrid.apply(this, arguments);
      this.renderWeekends.apply(this, arguments);
      this.renderMonthTicks.apply(this, arguments);
    }, // render

    renderGrid: function(eventType) {
      this.axis.tickSize(G.utils.getMaxHeight(this.model));
      switch(this.getZoomState()) {
        case 'months':
          this.axis.ticks(d3.time.months, 1);
          break;
        default:
          this.axis.ticks(d3.time.days, 1);
          break;
      }
      var update = this.d3.select('.days-ticks');
      update.call(this.axis);
    }, // renderGrid

    renderWeekends: function(eventType) {
      var scale1 = G.timeScale.copy(),
        scale0 = this.renderWeekends.scale || scale1,
        domain = scale1.domain(),
        days = d3.time.day.range(d3.time.day.offset(domain[0], -2), domain[1]),
        weekends = this.model.get('weekends'),
        data = days.filter(function(day) {
          var dayString = d3.time.format('%Y-%m-%d')(day);
          return weekends[dayString] || false;
          //return _.find(weekends, function(d) { return dayString === d; });
        }),
        weekend = this.d3.select('.weekends').selectAll('.weekend').data(data, d3.ƒ('getTime')),
        weekendEnter, weekendUpdate, weekendExit;
      this.renderWeekends.scale = scale1;

      weekendEnter = weekend.enter();
      weekendUpdate = weekend;
      weekendExit = weekend.exit();

      // ENTER
      //
      weekendEnter.append('rect')
        .attr('opacity', 0)
        .attr('class', 'weekend')
        .attr('y', 0)
        .attr('height', G.utils.getMaxHeight(this.model))
        .attr('x', function(d) { return scale0(d); })
        .attr('width', G.utils.daysToPixels(1, scale0));

      // UPDATE
      //
      weekendUpdate
        .attr('opacity', 1)
        .attr('height', G.utils.getMaxHeight(this.model))
        .attr('x', function(d) { return scale1(d); })
        .attr('width', G.utils.daysToPixels(1));

      // EXIT
      //
      weekendExit
        .attr('x', function(d) { return scale1(d); })
        .attr('width', G.utils.daysToPixels(1))
        .remove();

    }, // renderWeekends

    renderMonthTicks: function(eventType) {
      var data = G.timeScale.ticks(d3.time.months),
        tick = this.d3.select('.month-ticks').selectAll('.tick').data(data, d3.ƒ('getTime')),
        tickEnter, tickUpdate, tickExit,
        scale1 = G.timeScale.copy(),
        scale0 = this.renderMonthTicks.scale || scale1;

      this.renderMonthTicks.scale = scale1;

      tickEnter = tick.enter().append('line');
      tickUpdate = tick;
      tickExit = tick.exit();

      // ENTER
      //
      tickEnter
        .attr('opacity', 0)
        .attr('class', 'tick')
        .attr('y2', G.utils.getMaxHeight(this.model))
        .attr('transform', function(d) { return 'translate(' + scale0(d) + ', 0)'; });

      // UPDATE
      //

      tickUpdate
        .attr('opacity', 1)
        .attr('transform', function(d) { return 'translate(' + scale1(d) + ', 0)'; })
        .attr('y2', G.utils.getMaxHeight(this.model));

      // EXIT
      //
      tickExit
        .attr('transform', function(d) { return 'translate(' + scale1(d) + ', 0)'; })
        .remove();
    }, // renderMonthTicks

    adjustPan: function() {
      this.d3.select('.days-ticks').call(this.axis);
      this.renderWeekends.apply(this, arguments);
      this.renderMonthTicks.apply(this, arguments);
    }, // adjustPan

    dummy: null
  });

  return GridView;
});
