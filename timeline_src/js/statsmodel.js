define([
    'jquery',
    'backbone',
    'd3',
    'global'
], function($, Backbone, d3, G) {
    var StatsModel = Backbone.Model.extend({

        url: G.config.stats_url,

        parse: function(data) {
            var today = d3.time.day(new Date());
            return {
                data: data.sectors.map(function(d) {
                    var item = { name: d.name, value: d3.time.day.offset(new Date(d.finish_date), 1) };
                    if (item.value <= today) {
                        item.value = null;
                    } else {
                        item.delta = Math.floor((item.value - today) / 1000 / 60 / 60 / 24);
                    }
                    return item;
                })
                .sort(function(a, b) { return a.value > b.value ? 1 : -1; })
            };
        }, // parse

        dummy: null
    });

    return StatsModel;
});
