define([
    'd3',
    'backbone',
    'global',
], function(d3, Backbone, G) {
    var DayHighlightView = Backbone.View.extend({
        el: '#day-highlight',

        initialize: function() {
            var self = this;

            this.d3 = d3.select(this.el)
                .attr("transform", "translate(" + G.config.margin.left + ", 0)");

            $('#canvas')
                .mousemove(function(e) {
                    if (e.which) { return; }
                    var dayTimestamp = +d3.time.day(G.timeScale.invert(e.clientX - G.config.margin.left));
                    if (+self.theDay !== dayTimestamp) {
                        G.events.trigger('highlight:day', dayTimestamp);
                    }
                })
                .mouseleave(function() {
                    // Не помню почему хотел убирать хайлайт при мауслив
                    // пусть побудет так, может в процессе использования вспомню
                    //
                    // G.events.trigger('highlight:day', 0);
                });

            this.listenTo(this.model, 'toggle', this.render);
            this.listenTo(G.events, 'panned zoomed resize', this.render);
            this.listenTo(G.events, 'highlight:day', function(dayTimestamp) {
                if (dayTimestamp) {
                    this.theDay = new Date(dayTimestamp);
                    this.render().$el.fadeIn();
                } else {
                    this.theDay = void 0;
                    this.$el.fadeOut();
                }
            });

            // Add/remove listener to highlight days range between selected day
            // and day under cursor
            //
            this.listenTo(G.events, 'select:day', function(selection) {
                if (selection.length) {
                    // register Shift-key listener
                    var self = this;
                    $(document).on('keyup.day keydown.day', function(e) {
                        self.shiftIsPressed = e.shiftKey;
                        self.render();
                    });
                    this.selectionAnchor = selection[0];
                } else {
                    $(document).off('keyup.day keydown.day');
                    this.shifIsPressed = false;
                    this.selectionAnchor = void 0;
                }
            });
        },

        render: function(eventType) {
            if(eventType=='panned')
                return;
            var daysToHighlight = 1,
                x, width, height, dayHighlight;

            if (this.theDay) {
                if (this.shiftIsPressed && this.selectionAnchor) {
                    daysToHighlight = 1 +
                        Math.abs(this.selectionAnchor - this.theDay) / 1000/60/60/24;
                }
                x = "translate(" + G.timeScale(d3.min([this.theDay,
                    this.shiftIsPressed ? this.selectionAnchor : void 0])) + ", 0)";
                width = G.utils.daysToPixels(daysToHighlight);
                height = G.utils.getMaxHeight(this.model);

                dayHighlight = this.d3.selectAll("rect").data(new Array(1));

                // ENTER
                //
                dayHighlight.enter()
                    .append('rect');

                // UPDATE
                //
                // eventType === undefied when user moves cursor across days
                // eventType === object when toggle event occurs
                // so we need a transition only if zoom or toggle occured
                dayHighlight
                    .attr("transform", x)
                    .attr("height", height)
                    .attr("width", width);

                // EXIT
                // exit не нужен, т.к. объект ~~скрывается за счёт dayTimestamp = 0,
                // т.е. рисуется далеко в прошлом~~
                // UPDATE: объект больше не скрывается вообще
            }

            return this;
        }, // render

        dummy: null

    });

    return DayHighlightView;
});
