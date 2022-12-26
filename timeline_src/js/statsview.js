define([
    'jquery',
    'underscore',
    'd3',
    'backbone',
    'global',
    'bootstrap'
], function($, _, d3, Backbone, G) {
    var StatsView = Backbone.View.extend({
        el: '#stats-modal',

        template: $('#stats-template').html(),

        events: {
            'show.bs.modal': 'onShow',
            'hidden.bs.modal': 'onHide'
        },

        initialize: function() {
//            $("#stats-button").show();
            this.$container = this.$el.find('.modal-body');
            this.listenTo(this.model, 'change', this.render);
        },

        render: function() {
            var data = this.model.get('data');
            if (!data) {
                var $spinner = $('<div class="spinner"><div class="rect1"/> <div class="rect2"/> <div class="rect3"/> <div class="rect4"/> <div class="rect5"/></div>');
                this.$container.html($spinner);
            } else {
                this.$container.html(_.template(this.template, { stats: data, pluralForm: G.utils.pluralForm }));
            }

            return this;
        }, // render

        /*
        render_old: function() {
            var self = this,
                stats = this.model.getStats(),
                template = _.template($('#stats-template').html(), {stats: stats});

            var title = 'Статистика по ' + {'участки': 'участкам', 'заказы': 'заказам'}[self.model.hierarchy];
            if (stats.month) {
                title += ' за ' + stats.month;
            }
            this.$el.find('.modal-title')
                .text(title);

            this.$container.html(template);
            this.$container.find('tbody tr').hover(
                function(e) { self.highlight($(e.target).closest('tr').data('key'), true); },
                function(e) { self.highlight($(e.target).closest('tr').data('key'), false); }
            );


            if (stats.chart) {
                var svg = d3.select(this.$container[0]).append('svg');
                // draw pie chart
                //
                var dx = 100, dy = 100;

                var pie = d3.layout.pie(),
                    data = pie.value(function(d) { return d.value; })(stats.chart),
                    pieChart = svg.append('g').attr('transform', 'translate(' + dx + ', ' + dy + ')'),
                            pieces = pieChart.selectAll('.piece').data(data);

                            pieces.enter().append('g')
                            .attr('class', function(d) { return 'piece ' + d.data.key; })
                            .on('mouseover', function(d, i) {
                                self.highlight(d3.select(this).datum().data.key, true);
                            })
                            .on('mouseout', function(d, i) {
                                self.highlight(d3.select(this).datum().data.key, false);
                            });

                            pieces.append('path')
                            .attr('d', self.arc);

                            pieces.append('text')
                            .attr("transform", function(d) { return "translate(" + self.arc.centroid(d) + ")"; })
                            .attr("dy", ".35em")
                            .attr("text-anchor", "middle")
                            .text(function(d) { return d.value ? d.value : ''; });
            }
        }, // render


        highlight: function(key, highlight) {
            var self = this,
                duration = 300,
                el = d3.select(self.$container[0]).select('.piece.' + key);

            el.select('path').transition().duration(duration)
                .attr('d', highlight? self.arcOver : self.arc);
            el.select('text').transition().duration(duration)
                .attr("transform", function(d) { return "translate(" + (highlight ? self.arcOver : self.arc).centroid(d) + ")"; });

            self.$container.find('table tr.' + key).toggleClass('highlight', highlight);

        },
        */

        onShow: function() {
            if (!this.model.get('data')) {
                this.model.fetch();
            }
            this.render();
        },

        onHide: function() {
            this.destroy();
        },

        destroy: function() {
            this.$container.empty();
        },

        dummy: null
    });

    return StatsView;
});

