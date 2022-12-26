define([
    'd3',
    'backbone',
    'global',
], function(d3, Backbone, G) {

    var MenuDelDiaView = Backbone.View.extend({
        el: '#axis',

        events: {
            "mousemove ": "showMenu",
            "mouseleave ": function() { G.events.trigger('show_menu:day', 0); }
        },


        initialize: function() {
            this.listenTo(G.events, 'show_menu:day', function(dayTimestamp) {
                this.theDay = new Date(dayTimestamp);
                this.render();
            });
        },


        render: function() {
            var transform, href, title, menuDelDia;

            if (this.theDay) {
                transform = 'translate(' +
                    ( G.config.margin.left + G.timeScale(this.theDay)
                        + G.utils.daysToPixels(1)/2 + 2 ) + ', 15)'; // magic numbers
                href = G.config.brief_url + d3.time.format("%d_%m_%Y")(this.theDay);
                title = "Открыть повестку дня за " + d3.time.format("%d.%m")(this.theDay) + " в новом окне";

                menuDelDia = d3.select(this.el).selectAll('#menu-del-dia').data(new Array(1));

                // ENTER
                //
                menuDelDia.enter().append('g')
                    .attr('id', 'menu-del-dia')
                    .append('a')
                        .on('click', function() { this.blur(); })
                        .attr('target', '_blank')
                        .append('text')
                            .attr('class', 'brief-link')
                            .html('&#xf08e') // fa-external-link
                            .append('title');


                // UPDATE
                //
                menuDelDia
                    .attr('transform', transform)
                    .select('a')
                        .attr('xlink:href', href)
                        .select('title')
                            .text(title);

                // EXIT
                // exit не нужен, т.к. объект скрывается за счёт dayTimestamp = 0,
                // т.е. рисуется далеко в прошлом
            }

            return this;
        }, // render


        // show menu del dia
        //
        showMenu: function(e) {
            var dayTimestamp = +d3.time.day(G.timeScale.invert(e.clientX - G.config.margin.left));
            if (+this.theDay !== dayTimestamp) {
                G.events.trigger('show_menu:day', dayTimestamp);
                G.events.trigger('highlight:day', dayTimestamp);
            }
        },


        dummy: null

    });

    return MenuDelDiaView;
});
