define([
    'backbone',
    'd3',
    'global'
], function(Backbone, d3, G) {
    var ZoomHelper = Backbone.Model.extend({
        initialize: function() {
            this.zoomBeh = d3.behavior.zoom().x(G.timeScale);
            G.router.on("route:applyDatamining", this.onRouting, this);
        },

        d3_helpers: function() {
            var zoom = this.zoomBeh,
                scale = zoom.scale(),
                scaleExtent = zoom.scaleExtent(),
                translate = zoom.translate();

            function point(l) { return [l[0] * scale + translate[0], l[1] * scale + translate[1]]; }

            return {
                location: function(p) { return [(p[0] - translate[0]) / scale, (p[1] - translate[1]) / scale]; },
                scaleTo: function(s) { scale = Math.max(scaleExtent[0], Math.min(scaleExtent[1], s)); },
                translateTo: function(p, l) { l = point(l); translate[0] += p[0] - l[0]; translate[1] += p[1] - l[1]; },
                applyZoom: function() { zoom.scale(scale); }
            };
        },

        onRouting:function(dummySort, dummyCompleted, dummySelector,layersList, zoomValue, toggleValue, panValue){
            var h = this.d3_helpers();
            if(zoomValue){
                var scale = Number(zoomValue.replace('s','').replace('_','.'));                            
                h.scaleTo(scale);                
                h.applyZoom();
            }
            if(panValue)
            {
                var p = panValue.split(';')[0].split(',').reduce(function(q,item){ q.push(Number(item)); return q; },[]);
                var l = panValue.split(';')[1].split(',').reduce(function(q,item){ q.push(Number(item)); return q; },[]);
                var h=this.d3_helpers();
                h.translateTo(p, l);  
            }
            h.applyZoom();
        },

        zoom_full: function(el, action){
            var h = this.d3_helpers(),
            k = Math.log(this.zoomBeh.scale()) / Math.LN2;
            h.scaleTo(Math.pow(2, ((action=="plus")?Math.floor(k) + 1: Math.floor(k) - 1)));

            h.applyZoom();
            G.events.trigger('zoomed', 'zoomed');
            
            G.router.navigateSmart({ scale: 's'+(this.zoomBeh.scale()+'').replace('.','_') }, { trigger: false });
        },

        zoom: function(el) {
            var h = this.d3_helpers(),
                p = d3.mouse(el),
                l = h.location(p),
                k = Math.log(this.zoomBeh.scale()) / Math.LN2;

            h.scaleTo(Math.pow(2, d3.event.shiftKey ? Math.ceil(k) - 1 : Math.floor(k) + 1));
            h.translateTo(p, l);            
            h.applyZoom();
            G.events.trigger('zoomed', 'zoomed');
          //  console.log(this.zoomBeh.scale());
            G.router.navigateSmart({ scale: 's'+(this.zoomBeh.scale()+'').replace('.','_') }, { trigger: false });
            G.router.navigateSmart({ pan: p.join(',')+";"+l.join(',') }, { trigger: false });
        }, // zoom

        startPan: function(target) {
            var self = this,
                h = this.d3_helpers(),
                l = h.location(d3.mouse(target));
            this.moved = false;

            // worker will be called while mouse move
            return function () {
                self.moved = true;
                var p = d3.mouse(target);
                h.translateTo(p, l);                
                h.applyZoom();
                G.events.trigger('panned', 'panned');
                G.router.navigateSmart({ pan: p.join(',')+";"+l.join(',') }, { trigger: false });
            };
        },

        dummy: null
    });

    return ZoomHelper;
});
