define([
    'jquery',
    'underscore',
    'd3',
    'backbone',
    'global',
    'jquery.hoverIntent'
], function($, _, d3, Backbone, G) {
    var isShowtime = false,
        isFreeze = false,
        turnedOn = true;

    var D3TooltipView = Backbone.View.extend({
        el_nodes: '#nodes',
        el_timelines: '#timelines',

        initialize: function() {
            this.$el_nodes = $(this.el_nodes);
            this.$el_timelines = $(this.el_timelines);

            this.$el_timelines.add(this.el_nodes)
                .hoverIntent(
                    function(e) { G.events.trigger('intent_show:tooltip', e); },
                    function(e) { G.events.trigger('intent_hide:tooltip', e); },
                    'g,rect,text,foreignObject,i'
                );

            this.listenTo(G.events, 'intent_show:tooltip', this.showTooltip);
            this.listenTo(G.events, 'intent_hide:tooltip', this.hideTooltips);
            this.listenTo(G.events, 'on:tooltip', this.onTooltips);
            this.listenTo(G.events, 'off:tooltip', this.offTooltips);
        },


        showTooltip: function(e) {
            if (isShowtime || !turnedOn) { return; }
            var hovered = this.getHovered(e);
            if (!hovered) { return; }

            hovered.node
                .classed('hover', true);
            hovered.timeline
                .classed('hover', true);

            isShowtime = true;
            G.events.trigger('show_daterange:tooltip', hovered.timeline.datum());
            G.events.trigger('show:tooltip', hovered);
        },

        // hide all tooltips
        hideTooltips: function() {
            if (!isShowtime || isFreeze || !turnedOn) { return; }
            d3.select(this.el_nodes).selectAll('.node').classed('hover', false);
            d3.select(this.el_timelines).selectAll('.timelines-container').classed('hover', false);

            var diehards = $('.tipsy');
            diehards.fadeOut(function() { diehards.remove(); });
            isShowtime = false;
            G.events.trigger('hide:tooltip');
        },

        onTooltips: function() {
            turnedOn = true;
        },

        offTooltips: function() {
            turnedOn = false;
        },

        getHovered: function(e) {
            var id = $(e.target).closest('.node,.timelines-container').data('id'),
                node = this.$el_nodes.find('.node[data-id="'+id+'"]'),
                timeline = this.$el_timelines.find('.timelines-container[data-id="'+id+'"]');

            if (!node.length || !timeline.length) {
                return void 0;
            }

            return {
                node: d3.select(node[0]),
                timeline: d3.select(timeline[0])
            };
        }, // getHovered


        d3_drawTooltip: function(selection, options) {
            var $tip = $('<div><div class="tipsy-arrow"></div><div class="tipsy-inner"></div></div>'),
                el = selection.node(),
                rect = el.getBoundingClientRect(),
                pos = $.extend({}, $(el).offset(), {
                    width: rect.width || 0,
                    height: rect.height || 0
                }),
                gravity = options.gravity,
                actualWidth, actualHeight, tp;

            $tip[0].className = 'tipsy ' + (options.className||'');
            $tip.find('.tipsy-inner').html(options.title);
            $tip.remove().css({top: 0, left: 0, visibility: 'hidden', display: 'block'}).appendTo(document.body);
            actualWidth = $tip[0].offsetWidth;
            actualHeight = $tip[0].offsetHeight;
            switch (gravity.charAt(0)) {
                case 's':
                    tp = {top: pos.top - actualHeight - options.offset, left: pos.left + pos.width / 2 - actualWidth / 2};
                    break;
                case 'e':
                    tp = {top: pos.top + pos.height / 2 - actualHeight / 2, left: pos.left - actualWidth - options.offset};
                    break;
                case 'w':
                    tp = {top: pos.top + pos.height / 2 - actualHeight / 2, left: pos.left + pos.width + options.offset};
                    break;
            }
            if (gravity.length === 2) {
                if (gravity.charAt(1) === 'w') {
                    tp.left = pos.left + pos.width / 2 - 15;
                } else {
                    tp.left = pos.left + pos.width / 2 - actualWidth + 15;
                }
            }

            $tip.css(tp).addClass('tipsy-' + gravity);
            $tip.find('.tipsy-arrow')[0].className = 'tipsy-arrow tipsy-arrow-' + gravity.charAt(0);

            if (options.fade) {
                $tip.stop()
                    .css({opacity: 0, display: 'block', visibility: 'visible'})
                    .animate({ opacity: options.opacity }, options.fadeDuration);
            } else {
                $tip.css({visibility: 'visible', opacity: options.opacity});
            }

            $tip.css({'z-index': options.zIndex});

            $tip.on('mouseenter', function() {
                isShowtime = isFreeze = true;
                $('.tipsy').stop().fadeIn(100);
            });
            $tip.on('mouseleave', function() {
                isFreeze = false;
                G.events.trigger('intent_hide:tooltip');
            });
        }, // d3_drawTooltip

        formatTooltipDate: function(dates, edge) {
            var formattedDate;
            if (dates.start.getMonth() === dates.finish.getMonth()) {
                // week day and date
                formattedDate = d3.time.format('%a %d')(dates[edge]);
            } else if (dates.start.getMonth() < dates.finish.getMonth() && dates.start.getFullYear() === dates.finish.getFullYear()) {
                // date and month
                formattedDate = d3.time.format('%d %b')(dates[edge]);
            } else {
                // full date
                formattedDate = dates[edge].toLocaleDateString();
            }
            return formattedDate;
        }, // formatTooltipDate

        dummy: {}
    });

    return D3TooltipView;
});
