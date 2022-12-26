define([
    'd3',
    'backbone',
    'global',
], function(d3, Backbone, G) {
    var HorizontalGridView = Backbone.View.extend({
        el: '#horizontal-grid',


        initialize: function() {
            var self = this;
            this.d3 = d3.select(this.el);

            this.listenTo(this.model, 'change', function() {
                self.d3data = self.model.getD3Data();
                self.render();
            });
            this.listenTo(this.model, 'toggle', this.render);
            this.listenTo(G.events, 'resize', this.render);
        },


        render: function(eventType) {
            var self = this,
                ypos = function(d,i) { return G.config.margin.top
                    + self.d3data.yScale(self.d3data.dataset.i + i + 1)
                    - G.config.nodePadding / 2; },
                line = this.d3.selectAll('.horizontal-line').data(self.d3data.nodes);

            // ENTER
            //
            line.enter().append('line')
                .attr('class', 'horizontal-line')
                .attr('opacity', 1e-6)
                .attr("transform", function(d, i) { return "translate(0, " + ypos(d,i) + ")"; });

            // UPDATE
            //
            line
                .attr('opacity', 1)
                .attr('x2', G.config.width + G.config.margin.left + G.config.margin.right);

            // EXIT
            //
            line.exit()
                .attr('opacity', 1e-6)
                .remove();
        },


        dummy: {}
    });

    return HorizontalGridView;
});
