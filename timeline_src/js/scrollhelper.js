define([
    'underscore',
    'global'
], function(_, G) {
    var ScrollHelper = {

        pointToNode: function(nodePath, doneCallback) {
            var needToRedraw = G.appView.model.expandToNode(nodePath),
                scrollDelta = this.scrollToNode(nodePath.replace(/\/+$/,''));
            if (doneCallback) {
                _.delay(doneCallback,
                    (needToRedraw || scrollDelta) ? G.config.duration + 299 : 0);
            }
        }, // pointToNode

        scrollToNode: function(nodeId) {
            var d3d = G.appView.model.getD3Data(),
                node = G.appView.model.getNodeById(nodeId);
            if (!node) { return void 0; }

            var // 1. get node Y from top of the document
                nodeY = d3d.yScale(node.i),
                // 2. get visible area
                y0 = window.scrollY,
                y1 = y0 + G.config.height - G.config.nodeHeight,
                beforeScroll, scrollTo;
            beforeScroll = scrollTo = y0;
            
            // 3. if node Y outside visible area then do scroll
            if (nodeY < y0 || y1 < nodeY) {
                if (nodeY < y0) {
                    scrollTo = nodeY;
                } else {
                    scrollTo = nodeY - (y1-y0) + G.config.nodeHeight;
                }
                _.defer(function() {
                    $('html,html>body').animate({ scrollTop: scrollTo }, G.config.duration);
                });
            }
            return scrollTo - beforeScroll;
        }, // scrollToNode

        dummy: null
    };

    return ScrollHelper;
});
