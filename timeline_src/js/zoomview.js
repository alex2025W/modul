define([
    'backbone',
    'd3',
    'global'
], function(Backbone, d3, G) {
    var ZoomView = Backbone.View.extend({
        el: '#canvas .background',

        initialize: function(options) {
            var self = this;
            this.zoomHelper = options.zoomHelper;

            // init background rect
            //
            this.d3 = d3.select(this.el)
                .attr("width", G.config.width + G.config.margin.left + G.config.margin.right)
                .on("dblclick.zoom", function() { G.events.trigger('zoom'); })
                .on("mousedown.pan", function() { self.mousedown(); } );

            // init handlers
            //
            this.listenTo(this.model, "change toggle search", this.adjustHeight);
            this.listenTo(G.events, 'resize', this.onResize);
            this.listenTo(G.events, "zoom", this.zoom);
            this.listenTo(G.events, "zoom_full", this.zoom_full);
        },

        onResize: function() {            
            this.d3
                .attr("width", G.config.width + G.config.margin.left + G.config.margin.right);
        },

        // start panning
        //
        mousedown: function() {
            if (d3.event.button !== 0) { return; }
            var self = this,
                zoomHelper = this.zoomHelper,
                panWorker = this.zoomHelper.startPan(d3.event.target),
                w = d3.select(window)
                    .on('mousemove.pan', function mousemove() { panWorker(); })
                    .on('mouseup.pan', function mouseup() {
                        if (zoomHelper.moved) {
                            d3.event.preventDefault();
                        }
                        w.on("mousemove.pan", null).on("mouseup.pan", null);
                        self.el.classList.remove('panning');
                    });

            this.el.classList.add('panning');
            d3.event.preventDefault();
            window.focus();
        }, // mousedown


        // zooming
        //
        zoom: function() {
            this.zoomHelper.zoom(d3.select('#canvas .background').node());
        }, // zoom

        //
        // full zooming
        //
        zoom_full: function(e) {
            var action = e.action || 'plus';
            this.zoomHelper.zoom_full(d3.select('#canvas .background').node(), action);
        },

        adjustHeight: function() {
            var height = Math.max(G.config.height, this.model.getD3Data().nodes.length * (G.config.nodeHeight + G.config.nodePadding));
            this.d3.attr("height", height + G.config.margin.top + G.config.margin.bottom);
        },

        dummy: {}
    });

    return ZoomView;
});
