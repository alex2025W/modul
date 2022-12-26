/*eslint-disable */

$(function() {

var svg, tree, zoom,
    ancestor, root, nodes,
    width, height,
    headerHeight,
    config = {
        apiUrl: "/handlers/esudspecification/get_graph/",
        megaModelId: "",
        nodeHeight: 20,
        nodeLabelPadding: 11,
        nodeRadius: 5,
        soloOpacity: 0.2,
        gridPadding: 10,
        minZoom: 0.2,
        maxZoom: 1.8,
        guideFontSize: 100,
        guideFontStrokeWidth: 1.5,
        duration: 750,
        shortDuration: 750,
        longDuration: 5000,
    },
    expandedNodes = {};


function initHandlers() {
    zoom = d3.behavior.zoom()
        .scaleExtent([config.minZoom, config.maxZoom])
        .size([width*9100, height*9100])
        .on("zoom", function zoomed() {
            svg.select('.tree').attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
            svg.select('.grid').attr("transform", "translate(" + d3.event.translate[0] + ", 0)scale(" + d3.event.scale + ")");
            rescaleLevelGuides();
        });
    zoom(svg);
    svg.on("dblclick.zoom", null); // undo zoom by dblclick

    $(window).on('resize', onResize);

    // for debugging
    $(document).mouseup(function(e) { config.duration = e.altKey ? config.longDuration : config.shortDuration; });
} // initHandlers


function initCanvas() {
    headerHeight = $('#main-header').outerHeight(true);

    svg = d3.select("#canvas")
        .on("click", function() {
            if (d3.event.metaKey || d3.event.ctrlKey) {
                soloNode(null);
                update(root);
            }
        });
    updateDimensions();

    svg.append('g').attr('class', 'grid');
    svg.append('g').attr('class', 'tree');
    svg.select('.tree').append('g').attr('class', 'links');
    svg.select('.tree').append('g').attr('class', 'groups');
    svg.select('.tree').append('g').attr('class', 'nodes');

    // Chrome loads font only if it is used in the DOM.
    // So we add the dummy text to preload FontAwesome font for node-anchor icon
    _.defer(function() {
        svg.append('text').attr('font-family', 'FontAwesome').text('some text').remove();
    });
} // initCanvas

function updatePrintView(root) {
    $('#print-header').text(getNodeName(root));
}


function parseData(rawDataRoot) {
    // parse nodes
    //
    (function prepareNodes(node) {
        node.uid = getUid(node);
        node.nodes = node.children;
        node.children = void 0;
        _.forEach(node.nodes, prepareNodes);
    })(rawDataRoot);

    expandAllNodes(rawDataRoot);
    return rawDataRoot;
} // parseData

// getUid(node) also works
function getUid(nodeId, nodePath) {
    if (typeof nodeId === "object") {
        nodePath = nodeId.path;
        nodeId = nodeId.node._id;
    }
    return nodeId + "_" + nodePath;
}

function onResize() {
    updateDimensions();
    drawLevelGuides();
} // onResize


function updateDimensions() {
    width = $(document).width();
    height = $(document).height();
    svg
        .attr("width", width)
        .attr("height", height);
} // updateDimensions


function update(parent, options) {
    options = _.defaults(options || {}, {
        duration: config.duration
    });
    tree.nodeSize([config.nodeHeight, 0]); // width is calculated below
    nodes = tree.nodes(root);
    calculateNodeWidths();
    drawNodes(parent, options);
    drawLinks(parent, options);
    drawLevelGuides(options);

    // stash the old positions for transition.
    nodes.forEach(function(d) {
        d.x0 = d.x;
        d.y0 = d.y;
    });
} // update


function drawGroups(parent, options, getNodeEnterPos) {
    var groupedNodes = _(nodes)
        .filter(function(d) { return !_.isEmpty(d.group_id); })
        .groupBy('group_id')
        .map(function(d, key) {
            return {
                group_id: key,
                nodes: [_.first(d), _.last(d)]
            };
        })
        .value();
    var printRadius = config.nodeRadius;
    var printWidth = printRadius * 2;
    var getPrintHeight = function(d) { return d.nodes[1].x - d.nodes[0].x + printRadius * 2; };
    var radius = config.nodeRadius + 3;
    var width = radius * 2;
    var getHeight = function(d) { return d.nodes[1].x - d.nodes[0].x + radius * 2; };
    var getPos = function(d) { return [ d.nodes[0].y, d.nodes[0].x ]; };

    var group = svg.select('.tree .groups').selectAll('g.group')
        .data(groupedNodes, function(d) { return d.group_id; });
    var groupEnter = group.enter().append('g')
        .attr('class', 'group')
        .attr('transform', function(d) {
            return 'translate(' + getNodeEnterPos(d.nodes[0]) + ')';
        })
        .style('opacity', 1e-6);

    groupEnter.append('rect')
        .attr('class', 'screen')
        .attr('ry', radius)
        .attr('width', options.init ? width : 1e-6)
        .attr('height', function(d) { return options.init ? getHeight(d) : 1e-6; })
        .attr('x', options.init ? -width/2 : 1e-6)
        .attr('y', options.init ? -radius : 1e-6);

    groupEnter.append('rect')
        .attr('class', 'print')
        .attr('ry', printRadius);

    var groupUpdate = group
        .transition().duration(options.duration)
        .attr('transform', function(d) { return 'translate(' + getPos(d) + ')'; })
        .style('opacity', function(d) { return showGroupInSolo(d) ? 1 : config.soloOpacity; });

    groupUpdate.select('rect.screen')
        .attr('width', width)
        .attr('height', getHeight)
        .attr('x', -width/2)
        .attr('y', -radius);

    groupUpdate.select('rect.print')
        .attr('width', printWidth)
        .attr('height', getPrintHeight)
        .attr('x', -printWidth/2)
        .attr('y', -printRadius);

    var groupExit = group.exit()
        .transition().duration(options.duration)
        .attr('transform', function(d) {
            return 'translate(' + (
                options.init ? getPos(d) : [parent.y, parent.x]
            ) + ')';
        })
        .style('opacity', 1e-6)
        .remove();

    groupExit.select('rect.screen')
        .attr('x', options.init ? -width/2 : 1e-6)
        .attr('y', options.init ? -radius : 1e-6)
        .attr('width', options.init ? width : 1e-6)
        .attr('height', function(d) { return options.init ? getHeight(d) : 1e-6; });
} // drawGroups


function drawNodes(parent, options) {
    options = _.defaults(options || {}, {
        duration: config.duration
    });
    var anchorX = 0;
    var anchorY = 0;
    if (options.anchor) {
        anchorX = options.anchor.x;
        anchorY = options.anchor.y;
    }

    // If we need to show new nodes at the existing graph then we have to
    // collect old depth coordinates.
    // At the moment when drawNodes is called there is no such info in the
    // data inself (because of recalculated node-widths). So in the data we have
    // new positions. And the old positions are only stored in the SVG itself.
    // So we collect old depth coordinates from old SVG elements
    // (this is not a good practice, if you can do better feel free to change the code)
    var prevDepthY = {};
    svg.selectAll('.tree .nodes g.node').each(function(d) {
        if (prevDepthY[d.depth] === void 0) {
            prevDepthY[d.depth] = parseFloat(
                this.getAttribute('transform').substr(10).split(',')[0]);
        }
    });

    var getNodeEnterPos = function(d) {
        if (options.init) {
            return [prevDepthY[d.depth] || (d.y - anchorY), d.x - anchorX];
        } if (options.collapseToDepth) {
            var parentAtDepth = getParentAtDepth(d, options.collapseToDepth);
            return [parentAtDepth.y0, parentAtDepth.x0];
        } else {
            return [parent.y0, parent.x0];
        }
    };

    var getNodeExitPos = function (parent, d) {
        if (options.init) {
            return [d.y, d.x];
        } if (options.collapseToDepth) {
            var parentAtDepth = getParentAtDepth(d, options.collapseToDepth);
            return [parentAtDepth.y, parentAtDepth.x];
        } else {
            return [parent.y, parent.x];
        }
    };

    // DRAW GROUPS
    //
    drawGroups(parent, options, getNodeEnterPos);

    // DRAW NODES
    //
    var node = svg.select('.tree .nodes').selectAll('g.node')
        .data(nodes, function(d) { return d.uid; });

    // ENTER
    //
    var nodeEnter = node.enter().append('g')
        .attr('class', 'node')
        .attr("transform", function(d) { return "translate(" + getNodeEnterPos(d) + ")"; })
        .attr('opacity', 1e-6)
        .classed('parent', function(d) { return d.nodes.length > 0; })
        .on('mouseover', showNodeButtons)
        .on('mouseout', hideNodeButtons)
        .on('mousedown.zoom', function() {
            d3.event.stopPropagation();
            // turn off prevent-default to make possible text selection
            // d3.event.preventDefault();
        });

    // circles for print layout are invisible on the screen
    nodeEnter.append('circle')
        .attr('class', 'print')
        .attr('r', 3);


    nodeEnter.append('circle')
        .attr('class', 'screen')
        .attr('r', 1e-6)
        .on('click', clickNodeCircle);


    nodeEnter.append('text')
        .attr('dy', '.35em')
        .attr('x', config.nodeLabelPadding)
        .on('mouseover', highlightPathFromNode)
        .on('mouseout', removeHighlightFromLinks)
        .on('click', selectNode)
        .text(getNodeName);


    // UPDATE
    //
    var nodeUpdate = node
        .classed('collapsed', function(d) { return !expanded(d); })
        .classed('solo', function(d) { return isNodeInUidsArray(d, soloNodesUids); })
        .classed('selected', function(d) { return selectedNodeUid === d.uid; })
        .transition().duration(options.duration)
        .attr('opacity', function(d) { return showInSolo(d) ? 1 : config.soloOpacity; })
        .attr('transform', function(d) { return 'translate(' + d.y + ',' + d.x + ')'; });

    nodeUpdate.select('circle.screen')
        .attr('r', config.nodeRadius);

    // for debug only
    // nodeUpdate.select('text').text(getNodeName);

    // EXIT
    //
    var nodeExit = node.exit().transition().duration(options.duration)
        .attr('opacity', 1e-6)
        .attr("transform", function(d) {
            return "translate(" + getNodeExitPos(parent, d) + ")";
        })
        .remove();

    nodeExit.select("circle.screen")
        .attr("r", 1e-6);
} // drawNodes


function drawLinks(parent, options) {
    options = _.defaults(options || {}, {
        duration: config.duration
    });
    var anchorX = 0;
    var anchorY = 0;
    if (options.anchor) {
        anchorX = options.anchor.x;
        anchorY = options.anchor.y;
    }
    // TODO: get old depth positions for the links (like in drawNodes)
    //
    var links = tree.links(nodes),
        link = svg.select('.tree .links').selectAll('path.link').data(links, function(d) { return d.target.uid; }),
        diagonal = d3.svg.diagonal().projection(function(d) { return [d.y, d.x]; }),
        diagonalEnter = d3.svg.diagonal().projection(function(d) { return [d.y-anchorY, d.x-anchorX]; });

    // ENTER
    //
    link.enter().append('path')
        .attr('class', 'link')
        .attr("opacity", 1e-6)
        .attr('d', function(d) {
            if (options.init) { return diagonalEnter(d); }
            var o;
            if (options.collapseToDepth) {
                var parentAtDepth = getParentAtDepth(d.source, options.collapseToDepth);
                o = { x: parentAtDepth.x0, y: parentAtDepth.y0 };
            } else {
                o = { x: parent.x0, y: parent.y0 };
            }
            return diagonal({source: o, target: o});
        })
        .on('mousedown.zoom', function() {
            d3.event.stopPropagation();
            d3.event.preventDefault();
        })
        .on('click', selectPathToRoot)
        .on('mouseover', highlightPathToRoot)
        .on('mouseout', removeHighlightFromLinks);

    // UPDATE
    //
    link
        .classed('select', isLinkSelected)
        .classed('node-select', function(d) { return nodeHasAncestorWithUid(d.source, selectedNodeUid); })
        .transition().duration(options.duration)
        .attr('opacity', function(d) { return showInSolo(d.target) ? 1 : config.soloOpacity; })
        .attr("d", diagonal);

    // EXIT
    //
    link.exit().transition().duration(options.duration)
        .attr("opacity", 1e-6)
        .attr("d", function(d) {
            if (options.init) { return diagonal(d); }
            var o;
            if (options.collapseToDepth) {
                var parentAtDepth = getParentAtDepth(d.source, options.collapseToDepth);
                o = { x: parentAtDepth.x, y: parentAtDepth.y };
            } else {
                o = { x: parent.x, y: parent.y };
            }
            return diagonal({ source: o, target: o });
        })
        .remove();
} // drawLinks


function drawLevelGuides(options) {
    options = _.defaults(options || {}, {
        duration: config.duration
    });
    var depthNodes = [],
        scale = zoom.scale();

    // get one node from each depth
    _.forEach(nodes, function(d) {
        if (!depthNodes[d.depth]) {
            depthNodes[d.depth] = d;
        }
    });

    var anchorY = 0;
    if (options.anchor) {
        anchorY = options.anchor.y;
        if (!options.cached) {
            // rejoin old guides with the new data by node.depth
            // old guide with depth = 0 shuld be joined with the new node
            // at the same depth as prevRoot (anchor.depth)
            svg.select('.grid').selectAll('g.guide').data().forEach(function(d) {
                d.depth += options.anchor.depth;
            });
        }
    }

    var guide = svg.select('.grid').selectAll('g.guide')
            .data(depthNodes, function(d) { return options.anchor ? d.depth : d.uid; });

    // ENTER
    //
    var guideEnter = guide.enter().append('g')
        .attr('class', 'guide')
        .attr('opacity', 1e-6)
        .attr('transform', function(d) { return 'translate(' + (d.y-anchorY) + ',0)'; })
        .on('click', function(d) { collapseNodesToDepth(d.depth); });

    guideEnter.append('line')
        .attr('y2', height / scale);

    guideEnter.append('text')
        .attr('class', 'top')
        .attr('y', (config.gridPadding + headerHeight) / scale)
        .text(function(d) { return d.depth || ""; });

    guideEnter.append('text')
        .attr('class', 'bottom')
        .attr('y', (height - config.gridPadding) / scale)
        .text(function(d) { return d.depth || ""; });

    // init transitions maths
    //
    var guidesBefore = guide.exit()[0].length,
        guidesAfter = guide[0].length,
        guideLeft = Math.max(0, Math.min(guidesAfter, guidesBefore) - 1),
        guideRight = Math.max(guidesAfter, guidesBefore) - 1,
        yy = [], D,
        ease = d3.ease('cubic-out-in'),
        // easing duration function [0..D] → [0..options.duration]
        t = function(y) { return options.duration * ease(y / D); },
        // defines when guide is showing up one by one or just is fading in
        isDefaultUpdate = function(d) { return options.anchor || guidesBefore === 0 || guidesAfter < guidesBefore || d.depth < guidesBefore; },
        // defines when guide is hiding one by one or just is fading out
        isDefaultExit = function(d) { return guidesBefore === 0 || guidesBefore < guidesAfter || d.depth < guidesAfter; },
        i;

    // yy = positions of acting guides
    //
    for (i = guideLeft; i <= guideRight; i++) {
        if (guidesAfter < guidesBefore && i >= depthNodes.length) {
            yy[i] = guide.exit()[0][i] && guide.exit()[0][i].__data__.y || 0;
        } else {
            yy[i] = depthNodes[i].y;
        }
    }
    yy = yy.map(function(y) { return y - yy[guideLeft]; });

    // Delta between most distant active guides.
    // This is maximum distanse to travel by guide.
    D = yy[guideRight] - yy[guideLeft]; // yy[guideLeft] is always = 0. Added for clarity

    // UPDATE
    //
    guide.transition()
        .delay(function(d) { return isDefaultUpdate(d) ? 0 : t(yy[d.depth-1]); })
        .duration(function(d) { return isDefaultUpdate(d) ? options.duration : t(yy[d.depth]) - t(yy[d.depth-1]); })
        .attr('transform', function(d) { return 'translate(' + d.y + ',0)'; })
        .attr('opacity', 1);

    guide.selectAll('line')
        .attr('y2', height / scale);

    guide.selectAll('text')
        .data(function(d) { return [d,d]; }) // join top and bottom text elements with the same data
        .style('font-size', function() { return config.guideFontSize / Math.max(1, scale); })
        .style('stroke-width', function() { return config.guideFontStrokeWidth / Math.max(1, scale); })
        .each(function() {
            if (this.classList.contains('top')) {
                this.setAttribute('y', (config.gridPadding + headerHeight) / scale);
            } else {
                this.setAttribute('y', (height - config.gridPadding) / scale);
            }
        })
        // transitions are acting when guides depths are changing
        .transition().duration(options.duration)
            .attr('opacity', function(d) { return d.depth ? 1 : 1e-6; })
            .style('display', function(d) { return d.depth ? '' : 'none'; })
            .tween('text', function(d) {
                    var i = d3.interpolate(this.textContent, d.depth);
                    return function(t) {
                        this.textContent = Math.round(i(t));
                    };
            });

    // EXIT
    //
    guide.exit().transition()
        .delay(function(d) { return isDefaultExit(d) ? 0 : t(D-yy[d.depth]); })
        .duration(function(d) { return isDefaultExit(d) ? options.duration : t(D-yy[d.depth-1]) - t(D-yy[d.depth]); })
        .attr('opacity', 1e-6)
        .remove();
} // drawLevelGuides


function rescaleLevelGuides() {
    var scale = zoom.scale();
    var guide = svg.select('.grid').selectAll('g.guide');

    guide.selectAll('line')
        .attr('y2', height / scale);

    guide.selectAll('text')
        .style('font-size', function() { return config.guideFontSize / Math.max(1, scale); })
        .style('stroke-width', function() { return config.guideFontStrokeWidth / Math.max(1, scale); })
        .each(function() {
            if (this.classList.contains('top')) {
                this.setAttribute('y', (config.gridPadding + headerHeight) / scale);
            } else {
                this.setAttribute('y', (height - config.gridPadding) / scale);
            }
        });
} // rescaleLevelGuides


function clickNodeCircle(d) {
    if (d3.event.metaKey || d3.event.ctrlKey) {
        d3.event.stopPropagation();
        soloNode(d);
    } else {
        toggleNode(d);
    }
    update(d);
} // clickNodeCircle


var nodeButtons;
function showNodeButtons(d) {
    var radius = 17;
    var esudUrlTemplate = '/esud/specification#number/%childnumber%/tab/2/optional/true';

    if (!nodeButtons) {
        nodeButtons = svg.selectAll('#anchor').data([d]);
        var enter = nodeButtons.enter().append('g')
            .attr('id', 'anchor')
            .style('opacity', 0);

        enter.append('rect')
            .attr('x', -radius)
            .attr('y', -radius)
            .attr('height', radius*2)
            .attr('rx', radius);

        var enterEsudButton = enter.append('g')
            .attr('class', 'button open-esud');
        enterEsudButton.append('circle')
            .attr('r', radius);
        enterEsudButton.append('a')
            .attr('target', '_blank')
            .append('text')
                .text("\uf0db") // columns
                .selectAll('title').data(function(d) { return [d]; }).enter().append('title');

        var enterTreeButton = enter.append('g')
            .attr('class', 'button open-tree')
            .attr('transform', 'translate(' + radius*2 + ', 0)')
            .on('click', clickTreeButton);
        enterTreeButton.append('circle')
            .attr('r', radius);
        enterTreeButton.append('text')
            .text("\uf0e8") // sitemap
            .attr('transform', 'rotate(-90)')
            .selectAll('title').data(function(d) { return [d]; }).enter().append('title');
    }
    var x = getTextWidth(getNodeName(d)) + config.nodeLabelPadding + radius + 3; // magic number
    var width, treeButtonOpacity;
    if (d.nodes.length > 0 && d !== root) {
        treeButtonOpacity = undefined;
        width = radius * 4;
    } else {
        treeButtonOpacity = 0;
        width = radius * 2;
    }
    var update = nodeButtons.data([d])
        .style('opacity', void 0)
        .attr("transform", function() { return "translate("+x+", 0)"; });
    update.select('rect')
        .attr('width', width);
    update.select('.open-tree')
        .style('opacity', treeButtonOpacity)
        .selectAll('title').data(Array)
            .text(function(d) {
                return "Перейти к графу " + "«" + getNodeName(d) + "»";
            });

    update.select('.open-esud').select('a')
        .attr('xlink:href', function(d) {
            return esudUrlTemplate
                .replace('%parentId%', d.parent && d.parent.node._id || '')
                .replace('%childnumber%', d.article);
                //.replace('%childId%', d.node._id);
        });
    update.select('.open-esud')
        .selectAll('title').data(Array)
            .text(function(d) {
                return "Открыть «" + getNodeName(d) + "» в ЕСУД";
            });
    this.appendChild(nodeButtons.node());
} // showNodeButtons

function hideNodeButtons() {
    if (nodeButtons) {
        nodeButtons.style('opacity', 1e-6);
    }
}

var highlightedLinksUids = [];
function highlightPathToRoot(link) {
    highlightedLinksUids = getPathToRoot(link.target);
    svg.select('.tree .links').selectAll('path.link')
        .filter(isLinkHighlighted)
        .classed('highlight', true);
} // highlightPathToRoot

function highlightPathFromNode(node) {
    svg.select('.tree .links').selectAll('path.link')
        .classed('highlight', function(d) {
            return nodeHasAncestorWithUid(d.source, node.uid);
        });
} // highlightPathFromNode

function removeHighlightFromLinks() {
    highlightedLinksUids = [];
    svg.select('.tree .links').selectAll('path.link.highlight')
        .classed('highlight', false);
} // removeHighlightFromLinks

function isLinkHighlighted(link) {
    return isNodeInUidsArray(link.target, highlightedLinksUids) ||
        nodeHasAncestorWithUid(link.target, highlightedLinksUids[0]);
} // isLinkHighlighted


var selectedLinksUids = [];
function selectPathToRoot(link) {
    if (selectedLinksUids.length && selectedLinksUids[0] === link.target.uid) {
        // deselect path to root
        selectedLinksUids = [];
    } else {
        selectedLinksUids = getPathToRoot(link.target);
    }
    svg.select('.tree .links').selectAll('path.link')
        .classed('select', isLinkSelected);
}

function isLinkSelected(d) {
    return isNodeInUidsArray(d.target, selectedLinksUids) ||
        nodeHasAncestorWithUid(d.target, selectedLinksUids[0]);
} // isLinkSelected

var selectedNodeUid;
function selectNode(node) {
    if (node.nodes.length === 0) { return; }
    if (selectedNodeUid === node.uid) {
        selectedNodeUid = void 0;
    } else {
        selectedNodeUid = node.uid;
    }
    svg.select('.tree .links').selectAll('path.link')
        .classed('node-select', function(d) {
            return nodeHasAncestorWithUid(d.source, selectedNodeUid);
        });
    svg.select('.tree .nodes').selectAll('g.node')
        .classed('selected', function(d) {
            return selectedNodeUid === d.uid;
        });
} // selectNode


function getPathToRoot(d) {
    var pathToRoot = [ d.uid ];
    while (d.parent) {
        d = d.parent;
        pathToRoot.push(d.uid);
    }
    return pathToRoot;
} // getPathToRoot


function isNodeInUidsArray(d, path) {
    return _.some(path, function(p) { return p === d.uid; });
}


function toggleNode(d) {
    expand(d, !expanded(d));
    console.log(d);
} // toggleNode


function expand(d, isExpand) {
    if (isExpand) {
        expandedNodes[d.uid] = true;
    } else {
        delete expandedNodes[d.uid];
    }
} // expand


function expanded(d) {
    return !hasChildren(d) || expandedNodes[d.uid] || false;
} // expanded


function expandAllNodes(node) {
    expand(node, true);
    _.forEach(node.nodes, expandAllNodes);
}


function collapseNodesToDepth(depth) {
    var nodesAtTheDepth = nodes.filter(function(node) {
        return node.depth === depth;
    });
    var alreadyCollapsed = _.all(nodesAtTheDepth, function(node) {
        return !hasChildren(node) || !expanded(node);
    });
    var doExpand = alreadyCollapsed;
    nodesAtTheDepth.forEach(function(node) {
        expand(node, doExpand);
    });
    update(nodesAtTheDepth[0].parent, { collapseToDepth: depth });
    d3.event.stopPropagation();
}


function hasChildren(node) {
    return node.nodes && node.nodes.length > 0;
}


var soloNodesUids = [];
function soloNode(d) {
    if (!d || soloNodesUids[0] === d.uid) {
        // cancel solo mode
        soloNodesUids = [];
    } else {
        // apply solo mode
        soloNodesUids = getPathToRoot(d);
    }
} // soloNode


function showInSolo(d) {
    return soloNodesUids.length === 0 ||
        isNodeInUidsArray(d, soloNodesUids) ||
        nodeHasAncestorWithUid(d, soloNodesUids[0]);
}
function showGroupInSolo(group) {
    return soloNodesUids.length === 0 ||
        group.nodes[0].uid !== soloNodesUids[0] &&
        nodeHasAncestorWithUid(group.nodes[0], soloNodesUids[0]);
}


function nodeHasAncestorWithUid(d, uid) {
    do {
        if (d.uid === uid) {
            return true;
        }
        d = d.parent;
    } while(d);
    return false;
} // nodeHasAncestorWithUid


function centerGraph(duration) {
    var treeDepth = 0,
        minX = Number.MAX_VALUE, maxX = Number.MIN_VALUE,
        lastNodePos = nodes.reduce(function(y, node) {
                minX = Math.min(minX, node.x);
                maxX = Math.max(maxX, node.x);
                if (node.y > y) {
                    treeDepth = node.depth;
                    return node.y;
                } else {
                    return y;
                }
            }, 0),
        lastNodeLongestName = nodes
            .filter(function(d) { return d.depth === treeDepth; })
            .reduce(function(longestName, n) {
                var name = getNodeName(n);
                return name.length > longestName.length ? name : longestName;
            }, ""),
        treeWidth = lastNodePos + getTextWidth(lastNodeLongestName) + config.nodeLabelPadding,
        treeHeight = maxX - minX,
        x = treeWidth < width ?
            Math.max((width - treeWidth) / 2, config.nodeLabelPadding)
            : width / 19,
        y = headerHeight + (height - headerHeight - (treeHeight+config.nodeLabelPadding*2 < height - headerHeight ? maxX + minX : 0 ))/2;
    zoom.translate([x, y]);
    svg.transition().duration(duration || 0).call(zoom.event);
} // centerGraph


function calculateNodeWidths() {
    var names = [];
    _.forEach(nodes, function(d) {
        var name = getNodeName(d);
        if (!names[d.depth] || names[d.depth].length < name.length) {
            names[d.depth] = name;
        }
    });
    var widths = [];
    _.forEach(names, function(name, i) {
        if (name) {
            widths[i+1] = getTextWidth(name);
        }
    });
    _.forEach(nodes, function(d) {
        if (d.depth > 0) {
            var y = 0, i;
            for (i=1; i<=d.depth; i++) {
                y += widths[i] || 0;
                y += 92; // magic number — padding between levels
            }
            d.y = y;
        }
    });
} // calculateNodeWidths


function getNodeName(d) {
    // function uid(d) {
    //     return d.uid.split(/-|_/).map(function(d) { return d.substr(-3); }).join('-').replace('-', '_');
    // }
    return [
        // uid(d),
        // "["+d.y+"]",
        (d.article ? d.article + ". " : "") + d.name
    ].join(' ');
}


function getTextWidth(text, font) {
    // re-use canvas object for better performance
    var canvas = getTextWidth.canvas || (getTextWidth.canvas = document.createElement("canvas"));
    var context = canvas.getContext("2d");
    context.font = font || "10px sans-serif";
    var metrics = context.measureText(text);
    return metrics.width;
} // getTextWidth


function clickTreeButton(node) {
    App.router.navigate('#root=' + node.node._id +
                        (node.path ? '/path=' + node.path : ''),
                        { trigger: true });
} // clickTreeButton

function animateGoToNodeTransition(node, animateDuration) {
    var diehards = {};
    var diehardsGroups = {};
    function updatePositions() {
        svg.selectAll('.tree .groups>g.group')
            .attr('transform', function(d) { return 'translate(' + [ d.nodes[0].y, d.nodes[0].x ] + ')'; });

        svg.selectAll('.tree .nodes>g.node')
            .attr('transform', function(d) { return 'translate(' + d.y + ',' + d.x + ')'; });

        svg.selectAll('.tree .links>path.link')
            .attr("d", d3.svg.diagonal().projection(function(d) { return [d.y, d.x]; }));

        svg.selectAll('.grid g.guide')
            .attr('transform', function(d) { return 'translate('+ d.y +',0)'; } );
    }
    function fadeOutUnusedGuides(duration) {
        var depthNodes = [];
        _.forEach(nodes, function(d) {
            if (!diehards[d.uid] && !depthNodes[d.depth]) {
                depthNodes[d.depth] = d;
            }
        });
        depthNodes = _.compact(depthNodes);
        svg.select('.grid').selectAll('g.guide')
            .data(depthNodes, function(d) { return d.y; })
            .exit().transition().duration(duration)
            .attr('opacity', 1e-6)
            .remove();
    }
    function removeAllDiehards(node, duration) {
        svg.selectAll('.tree .groups>.group')
            .filter(function(d) { return diehardsGroups[d.group_id]; })
            .transition().duration(duration)
            .style('opacity', 1e-6)
            .remove();

        svg.selectAll('.tree .nodes>.node').filter(function(d) { return diehards[d.uid]; })
            .transition().duration(duration)
            .style('opacity', 1e-6)
            .remove();

        svg.selectAll('.tree .links>.link').filter(function(d) { return diehards[d.source.uid]; })
            .transition().duration(duration)
            .style('opacity', 1e-6)
            .remove();
    } // removeAllDiehards

    // 1. set the zoom vector point to the `node` position instead of the root position
    //
    var translate = zoom.translate();
    var scale = zoom.scale();
    zoom.translate([translate[0] + node.y*scale, translate[1] + node.x*scale]);

    // 2. update all nodes positions so that the `node` was in the [0, 0] position
    //
    var nx = node.x, ny = node.y;
    nodes.forEach(function(n) {
        n.y -= ny;
        n.x -= nx;
    });

    // 3. update all graphics to reflect new positions
    //   (effect should not be visible to user because the zoom move (1) and
    //    the nodes move (2) cancel each other
    //
    updatePositions();
    zoom.event(svg); // logically from step 1 but for performance is better here

    // 4. mark nodes that need to be removed
    //
    nodes.forEach(function(n) {
        if (!nodeHasAncestorWithUid(n, node.uid)) {
            diehards[n.uid] = true;
            if (n.group_id !== node.group_id) {
                diehardsGroups[n.group_id] = true;
            }
        }
    });

    // 5. fade out and delete marked elements
    //
    removeAllDiehards(node, animateDuration);

    // 6. fade out and delete unused level guides
    //
    fadeOutUnusedGuides(animateDuration);
} // animateGoToNodeTransition

function drawGraphWithExistingNode(prevRoot) {
    var prevRootInNewData = searchNodeByUid(root, getUid(prevRoot));
    var isCached = prevRoot === prevRootInNewData;

    // set new uids of all prevRoot children to join old elements with the new nodes
    //
    if (!isCached) {
        (function recurse(oldNode, newNode) {
            oldNode.uid = newNode.uid;
            for (var i=0; i < oldNode.nodes.length; i++) {
                recurse(oldNode.nodes[i], newNode.nodes[i]);
            }
        })(prevRoot, prevRootInNewData);
    }

    update(root, {
        init: true,
        anchor: prevRootInNewData,
        cached: isCached
    });
    centerGraph(config.duration);
} // drawGraphWithExistingNode



//
// APP
//

var App = {
    initialize: function() {
        initCanvas();
        initHandlers();

        // init tree layout
        tree = d3.layout.tree()
            .children(function(d) {
                return d.nodes && expanded(d) && d.nodes || null;
            });
        this.router = new Router();
        Backbone.history.start();
    },
}; // App

function searchNodeByUid(root, nodeUid) {
    return searchNode(root, function(n) { return n.uid === nodeUid; });
}

function searchNode(root, testFunc) {
    if (testFunc(root)) {
        return root;
    } else {
        for (var i=0; i < root.nodes.length; i++) {
            var result = searchNode(root.nodes[i], testFunc);
            if (result) { return result; }
        }
    }
} // searchNode

function getParentAtDepth(node, depth) {
    if (node.depth === depth) {
        return node;
    } else if (node.parent) {
        return getParentAtDepth(node.parent, depth);
    } else {
        return undefined;
    }
}



function loadData(nodeId, nodePath, success) {
    var nodeInCache;
    if (ancestor && (nodeInCache = searchNodeByUid(ancestor, getUid(nodeId, nodePath))))
    {
        success(nodeInCache);
    }
    else
    {
        showSpinner();
        d3.json(config.apiUrl + nodeId, function(error, rawDataRoot) {
            hideSpinner();

            // rawDataRoot.path is always empty so set it to the path
            // available from URL.
            // Path is used to detect old root in the new data in
            // the future requests (then browser back button is pressed)
            rawDataRoot.path = nodePath;

            ancestor = void 0;
            success(parseData(rawDataRoot));
        });
    }
} // loadData


function loadDataComplete(rawDataRoot, nodeId, nodePath)
{
        rawDataRoot.path = nodePath;
        ancestor = void 0;
        var newRoot = parseData(rawDataRoot);

        var prevRoot = root;
        setRoot(newRoot);
        if (prevRoot && searchNodeByUid(root, getUid(prevRoot))) {
            drawGraphWithExistingNode(prevRoot);
        } else {
            update(root, {init: true});
            centerGraph(prevRoot ? config.duration : void 0);
        }
} // loadDataComplete



function showSpinner() {
    $('#spinner')
        .addClass('bounce')
        .css({ 'transform': 'scale(1)' })
        .show();
}

function hideSpinner() {
    $('#spinner')
        .removeClass('bounce')
        .css({ 'transform': 'scale(' + (root ? 0 : 50) + ')' })
        .hide();
}

function setRoot(newRoot) {
    if (!ancestor) {
        ancestor = newRoot;
    }
    root = newRoot;
    updatePrintView(root);
}

//
// ROUTER
//

var Router = Backbone.Router.extend({
    queue: null,
    routes: {
        "": "index",
        "root=:nodeId": "index",
        "root=:nodeId/path=:nodePath": "index"
    },

    index: function(nodeId, nodePath) {
        var self = this;
        if (!nodeId) { nodeId = config.megaModelId; }
        if (!nodePath) { nodePath = ""; }

        // if graph is already have the node then go to the node without
        // requesting the server
        var nodeUid = getUid(nodeId, nodePath);
        var existingNode = root && searchNodeByUid(root, nodeUid);
        if (existingNode)
        {
            var animateDuration = config.duration * 0.8;
            animateGoToNodeTransition(existingNode, animateDuration);
            // wait for animate transitions to finish
            _.delay(function() {
                setRoot(existingNode);
                update(root);
                centerGraph(config.duration);
            }, animateDuration);
        }
        else
        {
            var nodeInCache;
            if (ancestor && (nodeInCache = searchNodeByUid(ancestor, getUid(nodeId, nodePath))))
                loadDataComplete(nodeInCache);
            else
            {
                /*Routine.showProgressLoader(10);
                this.queue = new Queue({
                        task_key: "load_product_tree",
                        params: {'nodeId':nodeId, 'nodePath':nodePath },
                        complete: this.onQueueComplete.bind(this),
                });
                this.queue.run();*/
                loadData(nodeId, nodePath,
                    function(newRoot) {
                        var prevRoot = root;
                        setRoot(newRoot);
                        if (prevRoot && searchNodeByUid(root, getUid(prevRoot))) {
                            drawGraphWithExistingNode(prevRoot);
                        } else {
                            update(root, {init: true});
                            centerGraph(prevRoot ? config.duration : void 0);
                        }
                });
            }


        }
    },

    /**
     * Queue complete global event
    **/
    // onQueueComplete: function(queue, task_key, result)
    // {
    //     var self = this;
    //     Routine.hideLoader();
    //     if(result['status'] == 'error')
    //         $.jGrowl(result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 10000 });
    //     else
    //     {
    //         result = result['data'];
    //         var nodeId = result['nodeId'];
    //         var nodePath = result['nodePath'];
    //         var data = result["data"];

    //         if(!result)
    //         {
    //             Backbone.trigger('global:clear',[self]);
    //             $.jGrowl('Ошибка получения данных.', {'themeState':'growl-error', 'sticky':false, life: 10000 });
    //             return;
    //         }
    //         if(task_key == "load_product_tree")
    //             loadDataComplete(data, nodeId, nodePath);
    //     }
    // }
});

App.initialize();

});
//
// TODO:
// 1. Fix bug with not-exiting guide when going to collapsed node
//
