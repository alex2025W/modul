define([
    'underscore',
    'd3',
    'global',
    'd3.lambdas'
], function(_, d3, G) {

    var CellsHelper = {

        drawCommentsMarks: function(timelinesContainer, transitionOrNot, cellModels) {
            var selection, cells,
                datum = timelinesContainer.datum();

            if (G.appView.viewMenuItemsCollection.isVisible('comments')) {
                cells = CellsHelper.getInnerCellsForDatum(datum, cellModels);
            } else {
                cells = [];
            }

            // DRAW BADGE
            //
            var cellsByDate = _.groupBy(cells, function(cell) { return +cell.get('date'); });
            var self = this;
            var cellMarks = _.map(cellsByDate, function(cellsWithTheSameDate) {
                    var hasNew = _.any(cellsWithTheSameDate, self.cellHasNewComments);
                    return {
                            date: cellsWithTheSameDate[0].get('date'),
                            totalComments: _.reduce(cellsWithTheSameDate, function(summ, cell) { return summ + cell.get('comments').filter(function(el){return !el.type;}).length; }, 0),
                            hasRequestPlan: _.reduce(cellsWithTheSameDate, function(hasReq, cell) { return cell.get('comments').find(function(el){ return el.type=="requestplan"; }) || hasReq; }, false),
                            hasConfirmPlan: _.reduce(cellsWithTheSameDate, function(hasConfirm, cell) { return cell.get('comments').find(function(el){ return el.type=="confirmplan"; }) || hasConfirm; }, false),
                            hasNew: hasNew
                        };
                });

            selection = timelinesContainer.selectAll('.cell-badge').data(cellMarks, d3.ƒ('date'));

            var dayWidth = G.utils.daysToPixels(1);
            var commentText = function(d){
                var hasReq = d.hasRequestPlan,
                    hasConf = d.hasConfirmPlan,
                    tc = d.totalComments;
                var txt = "";
                if(hasReq && hasConf && tc)
                    txt = "*";
                else
                {
                    txt+=(tc>0)?tc:"";
                    txt+=hasReq?"?":"";
                    txt+=hasConf?"!":"";
                }
                return txt;
            }

            var textWidth = function(d) {
                return commentText(d).length * 5;
            };
            var textPadding = 3;
            var padding = 1;
            var badgeHeight = 13;
            selection.enter().append('rect')
                .attr('opacity', 1e-6)
                .attr('class', 'cell-badge cell-badge-clickable')
                .attr('y', G.config.nodeHeight + G.config.nodePadding / 2 - badgeHeight - padding)
                .attr('height', badgeHeight);

            transitionOrNot(selection
                .classed('has-new', d3.ƒ('hasNew')))
                .attr('opacity', 1)
                .attr('x', function(d) { return G.timeScale(d.date) + dayWidth - textWidth(d) - textPadding*2 - padding; })
                .attr('width', function(d) { return textPadding*2 + textWidth(d); });

            transitionOrNot(selection.exit())
                .attr('opacity', 1e-6)
                .remove();


            // DRAW BADGE TEXT
            //
            selection = timelinesContainer.selectAll('.cell-badge-text').data(cellMarks, d3.ƒ('date'));

            selection.enter().append('text')
                .attr('opacity', 1e-6)
                .attr('class', 'cell-badge-text cell-badge-clickable');

            var update = transitionOrNot(selection
                .classed('has-new', d3.ƒ('hasNew')))
                .attr('opacity', 1)
                .attr('x', function(d) { return G.timeScale(d.date) + G.utils.daysToPixels(1) - textPadding  - padding; })
                .attr('y', G.config.nodeHeight + G.config.nodePadding / 2 - textPadding - padding );

            // if update is transition then do tweening
            // else just update the text

                update.text(function(d){
                    return commentText(d);
                }); //d3.ƒ('totalComments'));


            transitionOrNot(selection.exit())
                .attr('opacity', 1e-6)
                .remove();


        }, // drawCommentsMarks


        // cell has new comments if last comment is not from current user
        // and there are comments with created-at date > than cell.seen-at date
        cellHasNewComments: function(cell) {
            if(cell.get('comments').length>0){
                var lastComment = _.last(cell.get('comments'));
                return G.currentUser !== lastComment.user &&
                    (!cell.seen_at || lastComment.created_at > cell.seen_at);
            }
            return false;
        }, // cellHasNewComments

        getInnerCellsForDatum: function(datum, cellModels) {
            if(datum.cache_get_inner_cells_for_datum)
                return datum.cache_get_inner_cells_for_datum;
            var innerCells = [],
                listOfDatumIds = G.utils.treeToNodes(datum).map(function(node) { return node.id; });

            if (cellModels) {
                innerCells = cellModels.filter(function(cell) {
                    return (cell.get('comments').length || cell.get('requestPlan') || cell.get('confirmPlan')) && listOfDatumIds.indexOf(cell.get('node_id')) > -1;
                });
            }
            datum.cache_get_inner_cells_for_datum = innerCells;
            return innerCells;
        }, // getInnerCellsForDatum


        dummy: null

    }; // CellsHelper



    return CellsHelper;
});
