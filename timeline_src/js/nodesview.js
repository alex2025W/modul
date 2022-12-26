define([
    'jquery',
    'underscore',
    'backbone',
    'd3',
    'global',
    'datahelper',
    'd3.lambdas',
    'bootstrap_contextmenu'
], function($, _, Backbone, d3, G, D) {
    var NodesView = Backbone.View.extend({
        el: '#nodes',

        template_contextmenu: $('#contextmenu-nodes-template').html(),

        initialize: function() {
            this.d3 = d3.select(this.el);
            this.listenTo(this.model, 'change', this.render);
            this.listenTo(this.model, 'toggle', this.nodeToggle);
            this.listenTo(G.events, 'click:node', this.selectNode);
            // event on need update nodes list
            this.listenTo(G.events, 'change:dataset', this.render);
            this.initContextmenu();

             G.router.on("route:applyDatamining", this.onRouting, this);
        },

        initContextmenu: function() {
            var self = this;
            var datum;
            // init contextmenu
            $('#nodes').contextmenu({
                target: '#contextmenu',
                before: function(e) {
                    if (e.altKey) { return false; }
                    e.stopPropagation();
                    e.preventDefault();

                    datum = d3.select(e.target).datum();

                    if (datum.node_type === 'work' ||
                        datum.node_type === 'fact_work') { return false; }

                    this.getMenu()
                        .find('.dropdown-menu')
                        .html(_.template(self.template_contextmenu, {
                            rootTitle: datum.name,
                            rootType: datum.node_type,
                            D_datum: D(datum)
                        }));

                    return true;
                },
                onItem: function(context, e) {
                    var node_type = $(e.target).data('type');
                    self.model.expandNodeToNodeType(datum, node_type);
                }
            });
        },

        render: function(e) {
            this.d3data = this.model.getD3Data();
            this.renderNode(this.d3data.dataset, true);
        },

        onRouting:function(dummySort, dummyCompleted, dummySelector,layersList, zoomValue, toggleValue){
            if(toggleValue){
                //
                var tList = toggleValue.split(",").reduce(function(q,el){
                    q.push(G.router.decodeURI(el));
                    return q;
                },[]);
                this.model.expandedNodes = {};
                var self = this;
                tList.map(function(item){
                    self.model.expandedNodes[item] = true;
                });
                if(this.d3data)
                    this.renderNode(this.d3data.dataset,false);
            }
        },

        nodeToggle:function(root, animateInSitu){

            var queue = _.reduce(this.model.expandedNodes, function(q,v,k){
                return q+((q=='')?"":",")+G.router.encodeURI(k);
            },'');

            G.router.navigateSmart({ toggle: queue }, { trigger: false});
            this.renderNode(root, animateInSitu);
        },

        renderNode: function(root, animateInSitu) {
            if(!root){
                console.log("err_root");
            }

            var self = this,
                duration = G.config.duration,
                node = this.d3.selectAll('.node').data(this.d3data.nodes, d3.ƒ('id')),
                rootX = root.depth * G.config.treeDepthPadding,
                rootY = this.d3data.yScale(root.i),
                nodePos = animateInSitu ?
                    function(d, i) { return 'translate(' + ( -1234 ) + ',' + self.d3data.yScale(i) + ')'; }
                    : 'translate(' + rootX + ', ' + rootY + ')';

            // ENTER
            //
            node.enter().append('g')
                .attr('class', function(d) { return "node " + d.node_type; })
                .classed('troubleshooting', d3.ƒ('troubleshooting'))
                .classed('selected', function(d) { return d.id === G.config.preselectedNode; })
                .attr('data-id', d3.ƒ('id'))
                .attr('transform', nodePos)
                .attr("opacity", 0)
                .call(this.d3_drawNode, this)
                .on("click", function(d) {
                    G.events.trigger("click:node", d.id);
                })
                .on("dblclick", function(d) {
                    // temporary turn off tooltips engine to prevent
                    // false start hovers on the animated nodes
                    G.events.trigger('off:tooltip');
                    _.delay(function() { G.events.trigger('on:tooltip'); }, G.config.duration);
                    self.model.toggleNode(d);
                });

            // UPDATE
            //
            node
                .classed('empty', function(d) { return !d.nodes || !d.nodes.length; })
                .attr("transform", function(d, i) { return "translate(" + d.depth * G.config.treeDepthPadding + "," + self.d3data.yScale(i) + ")"; })
                .attr("opacity", G.config.treeOpacity)
                .call(this.d3_drawNode, this);

            // EXIT
            //
            node.exit()
                .attr("transform", nodePos)
                .attr("opacity", 0)
                .remove();

            if(G.config.preselectedNode){
                node[0].forEach(function(n) {
                    if (n.dataset.id === G.config.preselectedNode ) {
                        _.delay(function() {
                            n.scrollIntoView();
                            window.scrollTo(0, window.scrollY - 200);
                            G.events.trigger("click:node", n.dataset.id);
                        }, 200);
                    }
                });
                G.config.preselectedNode = null;
            }
        }, // renderNode


        // rerun-safe
        d3_drawNode: function(selection, view) {
            var overallMaximumWidth = [];
            selection.each(function(d) {
                var height = G.config.nodeHeight;
                var node = d3.select(this)
                    .classed('linked', false)
                    .classed("exact_match", function(d) { return d._search_match === 'exact'; })
                    .classed("contain_match", function(d) { return d._search_match === 'contain'; });

                // draw the label with node text
                var label = node.selectAll(".label").data([d]);
                label.enter().append("foreignObject")
                    .attr("class", 'label')
                    .attr("height", height)
                    .append("xhtml:body").append("xhtml:div")
                        .style("border-radius", G.config.nodeRadius + "px")
                        .style("height", height + 'px')
                        .style("width", G.config.nodeWidthMax + 'px');

                        //.html('<i style="color: #000;" class="fa fa-clock-o"></i>');

                var info = view.model.getInfo(d);
                label.select('body>div')
                    //.style("text-decoration", function(d) { return d.done ? 'line-through' : 'none'; })
                    .style("text-decoration", function(d) { return d.done ? 'underline' : 'none'; })
                    .html(function(d) {
                        html = info.name;
                        if (info.description) {
                            html += ' <span class="description">' + info.description + "</span>";
                        }
                        return html;
                    });

                // TODO:WARNING: here is slow code maybe
                // adjust nodes width to fit the text
                //
                var div = $(label.node()).find('div').get(0),
                    bbox = div.getBoundingClientRect();

                // calculate minimum width to fit the whole text
                if (!overallMaximumWidth[d.depth]) {
                    overallMaximumWidth[d.depth] = G.config.nodeWidthMin;
                }
                for (var w = overallMaximumWidth[d.depth]; w <= G.config.nodeWidthMax; w += 10) {
                    label.attr("width", w);
                    bbox = div.getBoundingClientRect();
                    if (bbox.height <= height) { break; }
                }

                // fix for the long one-liners
                if (label.attr('width') < bbox.width) {
                    label.attr('width', bbox.width);
                }
                overallMaximumWidth[d.depth] = Math.max(overallMaximumWidth[d.depth], label.attr('width'));

                var box = node.selectAll(".foreground").data([d]);

                //
                // ---- add time reminder icon----------------------------------------------------------------------------------
                if(d.name!="Договоры"){
                    var mbox = node.selectAll(".notify").data([d]);
                    mbox.enter().append("foreignObject")
                        .attr("class", 'notify')
                        .attr("height", "20")
                        .attr("width", "20")
                        .attr("x", "100")
                        .attr("y", "0")
                        .append("xhtml:body")
                        .on("click", function(d) {
                            //G.events.trigger("click:node-notify", d);
                        });
                        mbox.select('body').html('<i style="color: '+((d.need_notification)?'#000':'#aaa')+' " class="fa fa-clock-o i-notify "></i>');
                }
                //-----------------------------------------------------------------------------------------------------------------------------
                //


                // draw the transparent hover-box
                //
                box.enter().append('a')
                    .attr('xlink:href', function(d) {
                        var searchQuery = d.id.split('/').length > 2 ?
                                d.id.slice(2) :
                                d.id;
                        return "#" + G.router.updateQueryWithParams(G.router.getLocation(), { search: searchQuery });//.slice(1);
                    })
                    .on('click', function() {
                        this.blur();
                        // if left-click then toggle node and cancel following to the link
                        // else open link in new window and cancel toggle node
                        if (d3.event.button === 0 && !(d3.event.metaKey || d3.event.ctrlKey)) {
                            d3.event.preventDefault();
                        } else {
                            d3.event.stopPropagation();
                        }
                    })
                    .append("rect")
                        .attr("class", 'foreground')
                        .attr("rx", G.config.nodeRadius)
                        .attr("height", height)
                        .attr("x", 0);





            });

            // one more loop to set overall maximum width to the all nodes
            //
            selection.each(function(d) {
                var node = d3.select(this);
                node.selectAll(".label, .foreground")
                    .attr("width", overallMaximumWidth[d.depth]);

                node.selectAll(".notify")
                    .attr("x", overallMaximumWidth[d.depth]-17);


            });
        }, // d3_drawNode


        flashNode: function(nodeId) {
            var self = this,
                flash,
                radius = 99,
                src = {
                    x: 0, y: 0,
                    height: G.config.nodeHeight,
                    opacity: 0.8,
                    rx: G.config.nodeRadius, ry: G.config.nodeRadius
                },
                trg = {
                    x: -radius, y: -radius,
                    height: src.height + radius * 2,
                    opacity: 1e-6,
                    rx: radius, ry: radius
                },
                doFlash = function(d, node) {
                    src.width = node.getBoundingClientRect().width;
                    trg.width = src.width + radius * 2;
                    flash = d3.select('#main').append('rect')
                        .attr("transform",
                            "translate(" + d.depth * G.config.treeDepthPadding +
                                     "," + self.d3data.yScale(d.i) + ")")
                        .attr('id', 'node-flash')
                        .attr(src);
                    flash.transition().duration(G.config.duration).ease('circle-out')
                        .attr(trg)
                        .remove();
                };
            d3.selectAll('#nodes .node').each(function(d) {
                if (d.id === nodeId) {
                    d3.select(this).classed('linked', true);
                    doFlash(d, this);
                }  else {
                    d3.select(this).classed('linked', false);
                }
            });
        }, // flashNode

        selectNode: function(nodeId) {
            this.d3.selectAll('.node')
                .classed('selected', function(d) { return d.id === nodeId; });

            //if(nodeId){
            G.router.navigateSmart({
                "preselected_contract": nodeId?G.router.escapeParam(nodeId):"",
            }, { trigger: false });
            //}
        },

        /**
        ** Notify event
        **/
        notifyNode: function(node) {
            this.render();
        },

        dummy: {}
    });

    return NodesView;
});
