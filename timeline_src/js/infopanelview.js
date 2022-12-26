define([
    'jquery',
    'underscore',
    'backbone',
    'd3',
    'global',
    'infoblockview',
    'infoblockwidgets'
], function($, _, Backbone, d3, G, InfoBlockView, InfoBlockWidgets)
{
    var InfoPanelView = Backbone.View.extend({
        el: "#info-panel",
        isActive: true,
        dateRange: [],
        selDate:null,

        events: {
            'click .toggle-button': 'toggle'
        },

        initialize: function() {
            this.listenTo(G.events, 'click:node', this.updateNodeId);
            this.listenTo(G.events, 'resize', this.updateDimensions);
            this.listenTo(G.events, 'select:day', this.updateDateRange);
            this.listenToOnce(G.events, 'data-ready', this.delayedAppearance);
            this.listenTo(G.events, 'click:canvas', this.onClickCanvas);
            this.listenTo(G.events, 'change:grouping-type', this.onGroupingTypeChange);
            this.listenTo(G.events, 'comment:auto_open', this.updateNodeId);

            InfoBlockWidgets.init();
        }, // initialize


        render: function() {
            this.updateDimensions();
            if (this.selDate || this.nodeId || this.dateRange.length) {
                this.hideWelcomeMessage();
            } else {
                this.showWelcomeMessage();
            }
            this.renderInfoBlockView();
            return this;
        },

        renderInfoBlockView: function() {
            // каждый раз удаляем инфо-блок, чтоб он, в свою очередь удалил
            // все виджеты внутри себя, чтоб они отцепили свои хуки и не засоряли память
            //
            if (this.infoBlockView) {
                this.infoBlockView.remove();
            }
            this.infoBlockView = new InfoBlockView({
                model: new Backbone.Model({
                    id: this.nodeId,
                    range: this.dateRange,
                    selDate:this.selDate,
                    groupType: this.groupType || 'work_types'
                })
            });
            this.$el.find('>.content').html(this.infoBlockView.render().el);
        }, // renderInfoBlockView

        showWelcomeMessage: function() {
            this.$el.find('>.welcome').show();
        },

        hideWelcomeMessage: function() {
            this.$el.find('>.welcome').hide();
        },

        delayedAppearance: function() {
            this.render().$el
                .css({ right: -G.config.infoPanelWidth })
                .show();
            d3.select('#info-panel')
                .style('right',
                    (this.isActive ? 0 : -G.config.infoPanelWidth + G.config.infoPanelButtonWidth) + "px");
        }, // delayedAppearance

        updateNodeId: function(nodeId) {
            if (this.nodeId !== nodeId) {
                this.nodeId = nodeId;
                this.selDate = null;
                this.render();
            }
        },

        onClickCanvas: function(e) {
            if (this.nodeId && e.target.classList.contains('emptiness')) {
                G.events.trigger('click:node', undefined);
            }
          //  if(e.target.classList.contains('emptiness')){
                var dayTimestamp = +d3.time.day(G.timeScale.invert(e.clientX - G.config.margin.left));
                this.selDate = new Date(dayTimestamp);
                this.render();
            //}

        },

        updateDateRange: function(range) {
            // снимаем выделение с нода, потому что после фильтра по дате
            // нод может исчезнуть и его виджеты не будут знать что показывать
            // в инфо-панели
            G.events.trigger('click:node', undefined);
            this.selDate = null;
            this.dateRange = _.sortBy(range, function(a,b) { return a - b; });
            this.render();
        },

        toggle: function() {
            this.isActive = !this.isActive;
            this.$el.find('.toggle-button').toggleClass('active');
            this.render();
            G.events.trigger('toggle:info-panel', this.isActive);
        }, // toggle

        updateDimensions: function() {
            this.$el.css({
                top: G.config.margin.top - 15,
                right: this.isActive ? 0 : -G.config.infoPanelWidth + G.config.infoPanelButtonWidth,
                height: G.config.height + 70,
                width: G.config.infoPanelWidth
            });
        }, // updateDimensions

        onGroupingTypeChange: function(groupType) {
            this.groupType = groupType;
        }

    }); // InfoPanelView
    return InfoPanelView;
});
