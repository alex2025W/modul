define([
    'jquery',
    'underscore',
    'backbone',
    'd3',
    'global',
    'cellshelper',
    'scrollhelper',
    'bootstrap_contextmenu',
], function($, _, Backbone, d3, G, CellsHelper, ScrollHelper,BoostrapContextMenu )
{
    var CommentsView = Backbone.View.extend({
        default_comment_id: null, // комент который необходимо открыть по умолчанию, после загрузи данных
        default_operation: null, // операцию, которую следует отработать после загрузки данных

        el: '#comments-container',
        template: $('#comments-widget-template').html(),
        template_comments_list: $('#comments-list-template').html(),
        template_cells: $('#cells-template').html(),
        template_add_comment: $("#cells-add-comment-template").html(),
        template_contextmenu: $('#contextmenu-comments-template').html(),

        events: {
            'blur textarea': 'hideCellHighlight',
            'focus textarea': 'showCellHighlight',
            'keypress textarea': 'addCommentIfCtrlEnter',
            'change textarea': 'autoResize',
            'keydown textarea': function(e) { var autoResize = this.autoResize; setTimeout(function() { autoResize(e); }, 0); },
            'cut textarea': function(e) { var autoResize = this.autoResize; setTimeout(function() { autoResize(e); }, 0); },
            'paste textarea': function(e) { var autoResize = this.autoResize; setTimeout(function() { autoResize(e); }, 0); },
            'drop textarea': function(e) { var autoResize = this.autoResize; setTimeout(function() { autoResize(e); }, 0); },
            'click .button-send': 'onSendClick',
            'click .button-close': 'onCloseClick',
            'click .title': 'onTitleClick',
            //'click .add-comment-mockup': 'onAddCommentMockupClick',
            'click a.ttl' : 'onShowRequest',
            'click .button-send-req': 'onSendReqClick',
        },

        initialize: function(options) {
            this.dataset = options.dataset;
            this.default_comment_id = null;

            // bind cells to dataset then both cells and timelines are loaded
            //
            var callback = _.after(2, this.bindCellsToDataset);
            this.dataset.once('sync', callback, this);
            this.collection.once('sync', callback, this);

            this.initContextmenu();

            this.listenTo(G.events, 'click:canvas', this.onCanvasClick);
            this.listenTo(this.collection, 'sync', this.render);
            this.listenTo(G.events, 'zoomed panned resize scroll', this.renderCellHighlight);
            this.listenTo(G.events, 'toggle:info-panel', this.onInfoPanelToggle);
            this.listenTo(G.events, 'navigate:comment', this.onOpenComment);
            this.listenTo(G.events, 'navigate:confirmplan', this.onConfirmPlanNav);

            //this.listenTo(G.events, 'dataset:load_complete', this.onDataLoadingComplete);
        }, // initialize

        /*///
        /// Функция, на кокончание загрузки данных в DataSet
        ///
        onDataLoadingComplete: function(e){
            // если задан ID комента который необходимо открыть по умолчанию
            if(this.default_comment_id)
                this.pointToCell(comment_id);

        },*/

        initContextmenu: function() {
            var self = this,
                anchorEvent;
            $('#canvas').contextmenu({
                target: '#contextmenu',
                before: function(e) {
                    if (e.altKey) { return false; }
                    this.getMenu()
                        .find('.dropdown-menu')
                        .html(_.template(self.template_contextmenu));
                    var node = self.getNode(e.pageY),
                        cell = self.getCell(node, self.getDate(e.pageX));
                    if(cell.get('comments').find(function(el){ return el.type=="requestplan"; }))
                        this.getMenu().find('.dropdown-menu .request-plan').hide();
                    if(cell.get('comments').find(function(el){ return el.type=="confirmplan"; }))
                        this.getMenu().find('.dropdown-menu .confirm-plan').hide();

                    anchorEvent = e;
                    e.preventDefault();
                    return true;
                },
                onItem: function(parent, clicked) {
                    self.default_operation = "comment";
                    if($(clicked.target).hasClass('request-plan')){
                        self.default_operation = "request_plan";
                    }
                    else
                    if($(clicked.target).hasClass('confirm-plan')){
                        self.default_operation = "confirm_plan";
                    }
                    self.setRootCell(anchorEvent);
                }
            });
        }, // initContextmenu

        render: function() {
            this.renderWidget();
            this.renderCellHighlight();
        },

        renderWidget: function() {
            var self = this,
                scrollPosition;
            if (this.rootCell) {
                scrollPosition = this.$el.find('>.cells-list').scrollTop();
                var cellsHtml = "";
                if(this.default_operation){
                    cellsHtml = _.template(this.template_add_comment,{'cell':{cell_path: this.buildCellPath(this.rootCell.get('node_id')),
                            cell_id: id(this.rootCell.get('node_id'), this.rootCell.get('date')) }, 'edit_type':this.default_operation});
                }else{
                    cellsHtml = this.getCellsHtml();
                }


                this.$el.html(_.template(this.template, {
                        date: this.rootCell.get('date'),
                        cellsHtml: cellsHtml
                    }))
                    .show();

                // restore scroll position
                this.$el.find('>.cells-list').scrollTop(scrollPosition);

                this.$el.find("textarea").focus();

                //this.activateCommentMode(this.activeCell.id);

                // auto mark visible comments as readed
                //
                var $container = this.$el.find('>.cells-list');
                $container.scroll(function() {
                    self.markVisibleCommentsAsRead($container);
                });
                this.markVisibleCommentsAsRead($container);

            } else {
                this.$el.hide();
            }
        }, // renderWidget

        getCellsHtml: function() {
            var self = this,
                // «сквозная нумерация» участников дискуссии, чтоб каждому присвоить свой цвет
                participants = [ G.currentUser ];
            return _.template(this.template_cells, {
                cells: [ this.rootCell ].concat(
                            this.rootCell.childCells
                                .sort(function(a, b) { return a.id.length - b.id.length; })
                    )
                    .map(function(cell) {
                        return {
                            cell_path: self.buildCellPath(cell.get('node_id')),
                            cell_id: id(cell.get('node_id'), cell.get('date')),
                            commentsListHtml: self.getCommentsListHtml(cell, participants),
                            requestPlan: cell.get('requestPlan'),
                            confirmPlan: cell.get('confirmPlan')
                        };
                    })
                });
        }, // getCellsHtml

        getCommentsListHtml: function(cell, participants) {
            var dateInPast = new Date(1983, 1, 1),
                comments = this.getCellComments(cell),
                newCommentIndex;
            if (comments.length) {
                newCommentIndex = _.last(comments).user === G.currentUser ? comments.length :
                    _.findIndex(comments, function(n) {
                        return n.user !== G.currentUser &&
                            n.created_at > (cell.seen_at || dateInPast);
                    });

                return _.template(this.template_comments_list, {
                    comments: comments,
                    newCommentIndex: newCommentIndex,
                    participants: participants
                });
            }
            return "";
        }, // getCommentsListHtml

        getCellComments: function(cell) {
            var queue = cell.sendingQueue || [];
            return _.chain(cell.get('comments'))
                    .union(queue)
                    .map(function(comment) { return _.extend({}, comment, {sending: queue.indexOf(comment) > -1}); })
                    .value();
        }, // getCellComments

        markVisibleCommentsAsRead: function($container) {
            var self = this,
                firstDelay = 2000,
                delay = 100;
            $container.find('.comments-list').each(function(i) {
                var lastVisibleNewComment = $(this)
                    .find('.new-comment')
                    .filter(function() {
                        var $this = $(this),
                            bottomEdge = $this.position().top + $this.outerHeight();
                        return bottomEdge <= $container.innerHeight();
                    })
                    .last();
                if (lastVisibleNewComment.length) {
                    setTimeout(function() { self.markAsRead(lastVisibleNewComment); }, firstDelay + i * delay);
                }
            });
        }, // markVisibleCommentsAsRead

        renderCellHighlight: function(eventType) {
            var cellHighlight = d3.select('#cell-highlight'),
                cellLink = cellHighlight.selectAll('.link').data([this.activeCell]),
                cellMark = cellHighlight.selectAll('.mark').data([this.activeCell]);
            if (this.activeCell && !this.isCellHighlightHidden) {
                var cell = this.getCellDimensions(this.activeCell),
                    widget = this.getWidgetDimensions(),
                    path = this.buildPathForLink(cell, widget);

                // comments link
                //
                cellLink.enter()
                    .append('g')
                        .attr('class', 'link')
                        .append('path');


                cellLink
                    .selectAll('path')
                        .attr('d', path);


                // comments mark
                //
                cellMark.enter()
                    .append('rect')
                    .attr('class', 'mark')
                    .attr('height', cell.y[1] - cell.y[0]);

                cellMark
                    .attr('x', cell.x[0])
                    .attr('y', cell.y[0])
                    .attr('width', cell.x[1] - cell.x[0]);

            } else {
                cellLink.remove();
                cellMark.remove();
            }
        }, // renderCellHighlight

        markAsRead: function($target) {
            if ($target.data('marked-as-read')) {
                return;
            }
            // mark element to prevent multiple invoking while scrolling
            $target.data('marked-as-read', true);

            $target.prevAll('.new-comment').andSelf().removeClass('new-comment');

            // save visit on the server
            //
            var cellId = $target.parent('.comments-list').prev('.title').data('cell-id');
            this.collection.get(cellId).updateVisitor($target.data('created-at'));

        }, // markAsRead

        showCellHighlight: function() {
            this.isCellHighlightHidden = false;
            this.renderCellHighlight();
        },

        hideCellHighlight: function() {
            this.isCellHighlightHidden = true;
            this.renderCellHighlight();
        },

        getCellDimensions: function(cell) {
            var cellMark = _.find($('.timelines-container[data-id="' + cell.get('node_id') + '"]').find('.cell-badge'), function(badge) {
                    return +badge.__data__.date === +cell.get('date');
                });
            var cellBBox = cellMark ? cellMark.getBBox() : { width: 11, height: 13 };
            var padding = 1;
            var cellX2 = G.timeScale(cell.get('date')) + G.utils.daysToPixels(1),
                cellX1 = cellX2 - cellBBox.width - padding,
                cellY2 = this.dataset.getD3Data().yScale(cell.node.i + 1) - G.config.nodePadding / 2,
                cellY1 = cellY2 - cellBBox.height - padding;
            return {
                x: [cellX1, cellX2],
                y: [cellY1, cellY2]
            };
        },

        getWidgetDimensions: function() {
            var w = $('#comments-container'),
                widgetX1 = w.position().left - 5, // magic number
                widgetX2 = widgetX1 + w.outerWidth(),
                widgetY2 = $(window).scrollTop() + G.config.height + 56.5, // magic number
                widgetY1 = widgetY2 - w.outerHeight();
            return {
                x: [widgetX1, widgetX2],
                y: [widgetY1, widgetY2]
            };
        },

        buildPathForLink: function(cell, widget) {
            var points = [];
            if (cell.x[0] < widget.x[0]) {
                if (cell.y[1] < widget.y[1]) {
                    points.push([cell.x[0], cell.y[1]]);
                    points.push([widget.x[0], widget.y[1]]);
                } else {
                    points.push([cell.x[1], cell.y[1]]);
                    points.push([widget.x[1], widget.y[1]]);
                }
                if (cell.y[0] < widget.y[0]) {
                    points.push([widget.x[1], widget.y[0]]);
                    points.push([cell.x[1], cell.y[0]]);
                } else {
                    points.push([widget.x[0], widget.y[0]]);
                    points.push([cell.x[0], cell.y[0]]);
                }
            } else if (cell.x[0] > widget.x[1]) {
                if (cell.y[1] < widget.y[1]) {
                    points.push([cell.x[1], cell.y[1]]);
                    points.push([widget.x[1], widget.y[1]]);
                } else {
                    points.push([cell.x[0], cell.y[1]]);
                    points.push([widget.x[0], widget.y[1]]);
                }
                if (cell.y[0] < widget.y[0]) {
                    points.push([widget.x[0], widget.y[0]]);
                    points.push([cell.x[0], cell.y[0]]);
                } else {
                    points.push([widget.x[1], widget.y[0]]);
                    points.push([cell.x[1], cell.y[0]]);
                }
            } else if (cell.y[0] < widget.y[0]) {
                points.push([cell.x[0], cell.y[0]]);
                points.push([widget.x[0], widget.y[0]]);
                points.push([widget.x[1], widget.y[0]]);
                points.push([cell.x[1], cell.y[0]]);
            } else {
                points.push([cell.x[0], cell.y[1]]);
                points.push([widget.x[0], widget.y[1]]);
                points.push([widget.x[1], widget.y[1]]);
                points.push([cell.x[1], cell.y[1]]);
            }
            return "M" + points.map(function(point) { return "L" + point[0] + "," + point[1]; }).join(' ').slice(1);
        }, // buildPathForLink

        bindCellsToDataset: function() {
            this.dataset.set('cells', this.collection.models);
            var self = this;
            this.collection.on('change', function() { self.dataset.trigger('change'); });

            // если задан ID комента который необходимо открыть по умолчанию
            if(this.default_comment_id){
                this.openComment(this.default_comment_id);
                /*if(this.default_operation){
                    //this.addConfirmPlan(this.activeCell,"");
                    this.render();
                }*/
            }
        },

        ///
        /// открыть существующий комент по его ID
        ///
        openComment: function(comment_id){
            // подсветка точки с коментом
            this.pointToCell(comment_id);
            // открыть сам комент
            this.setRootCellByCell(this.getCellById(comment_id));
            // отправить глобальное событие, что открыли комент
            var nodeId = comment_id.split('_')[0];
            G.events.trigger("comment:auto_open",nodeId , true);
            return nodeId;
        },

        setRootCell: function(e) {
            var node = this.getNode(e.pageY);
            if (node) {
                this.setRootCellByNodeAndDate(node, this.getDate(e.pageX));
                e.preventDefault();
            }
        }, // setRootCell

        setRootCellByNodeAndDate: function(node, date) {
             // reset scroll position
            this.$el.html("");
            this.rootCell = this.activeCell = this.getCell(node, date);
            this.render();


        }, // setRootCellByNodeAndDate

        setRootCellByCell: function(cell) {
            this.rootCell = this.activeCell = cell;
            this.$el.html(""); // reset scroll position
            this.render();
        }, // setRootCellByNodeAndDate

        onCanvasClick: function(e) {
            // TODO добавить проверку на то, что выставлено в ячейке
            if (e.target.classList.contains('cell-badge-clickable') || (e.metaKey || e.ctrlKey)) {
                this.default_operation = null;
                this.setRootCell(e);
            }
        }, // onCanvasClick

        onSendClick: function() {
            this.default_operation = null;
            this.addComment();
            this.$el.find('textarea').focus();
        }, // onSendClick

        onSendReqClick:function(e){
            this.default_operation = null;
            var comment = $("textarea",$(e.target).parent()).val();
            var cellId = $(e.target).data('cell-id'),
                cell = this.getCellById(cellId);
            if($(e.target).data('operation')=="request"){
                this.addRequestPlan(cell,comment);
            }else{
                this.addConfirmPlan(cell,comment);
            }
            this.render();
        },

        onCloseClick: function() {
            this.rootCell = this.activeCell = void 0;
            this.render();
        }, // onSendClick



        onInfoPanelToggle: function(infoPanelIsOpen) {
            this.$el.css({
                right: infoPanelIsOpen ? G.config.infoPanelWidth : G.config.infoPanelButtonWidth
            });
        }, // onInfoPanelToggle

        onOpenComment: function(comment_id) {
            this.default_comment_id = comment_id;
            if(this.dataset.get('dataset'))
                this.openComment(this.default_comment_id);
        },

        onShowRequest:function(e){
            var pnl = $('.more',$(e.target).parent());
            if(pnl.hasClass('hidden')){
                pnl.hide().removeClass('hidden').slideDown();
                $("textarea",pnl).focus();
            }
            else{
                pnl.slideUp(function(){pnl.addClass('hidden');});
            }
        },

        onConfirmPlanNav:function(comment_id){
//            console.log('onConfirmPlanNav');
            this.default_comment_id = comment_id;
            this.default_operation = "confirm_plan";
            if(this.dataset.get('dataset')){
                this.openComment(comment_id);
            }
        }, //onConfirmPlanNav

        addCommentIfCtrlEnter: function(e) {
            if ((e.which === 10 || e.which === 13) && e.ctrlKey) {
                //this.addComment();
                //this.onSendReqClick(e);
                if(this.default_operation=='comment'){
                    this.onSendClick();
                }else{
                    var ev = {target: $(e.currentTarget).parent().find(".button-send-req")[0]};
                    this.onSendReqClick(ev);
                }

                e.preventDefault();
            }
        }, // addCommentIfCtrlEnter

        autoResize: function(e) {
            $(e.target)
                .css({ height: 'auto' })
                .height(e.target.scrollHeight - 4);
        }, // autoResize

        addComment: function() {
            var $textarea = this.$el.find('.add-comment-input:visible textarea'),
                val = $textarea.val().trim();
            if (val.length) {
                // update model
                this.activeCell.addComment({
                    user: G.currentUser,
                    comment: val
                });

                // update UI
                //
                $textarea.val("");

                // do smooth scroll to the new comment
                //
                this.render();
                // TODO: if textarea is outside visible area,
                //  then do smooth scroll to the textarea
                // var $cellsList = this.$el.find('.cells-list');
                // var $addCommentInput = $textarea.closest('.add-comment-input');
                // console.log($addCommentInput.position(), $cellsList.scrollTop());
                // this.$el.find('>.cells-list').animate({
                //         scrollTop: this.$el.find('>.comments-list')[0].scrollHeight
                // }, 300);
            }

            // mark all comments as seen
            //
            $textarea.closest('.comment-list').find('.new-comment')
                .removeClass('.new-comment');
        }, // addComment

        addRequestPlan:function(activeCell, comment){
            var has_request = activeCell.get('comments').find(function(el){ return el.type=="requestplan"; });
            if(!has_request){
                activeCell.addComment({
                    user:G.currentUser,
                    comment: comment || "",
                    type:"requestplan"
                });
            }
        },// addRequestPlan

        addConfirmPlan:function(activeCell, comment){
            var has_confirm = activeCell.get('comments').find(function(el){ return el.type=="confirmplan"; });
            if(!has_confirm){
                activeCell.addComment({
                    user:G.currentUser,
                    comment: comment || "",
                    type:"confirmplan"
                });
            }
            //if(!activeCell.get('confirmPlan'))
                //this.planRequestDlg.show({'data':activeCell, 'title':'Подтверждения планов',operation:"confirmplan"});
        }, // addConfirmPlan

        /*onPlanRequestDlgAccept:function(activeCell){
            this.setRootCellByCell(activeCell);
        }, */

        getDate: function(x) {
            return d3.time.day(G.timeScale.invert(x - G.config.margin.left));
        },

        getNode: function(y) {
            var d3data = this.dataset.getD3Data(),
                i = d3data.yScale.invert(y - G.config.margin.top + G.config.nodePadding / 2);
            return d3data.nodes[Math.floor(i)];
        },

        getCell: function(node, date) {
            var _id = id(node.id, date);
            var cell = this.collection.get(_id);
            var childCells = _.filter(
                    CellsHelper.getInnerCellsForDatum(node, this.collection),
                    function(c) { return c !== cell && +c.get('date') === +date; }
                );
            if (!cell) {
                cell = this.collection.add({_id: _id, node_id: node.id, date: date, comments: []});
            }
            cell.node = node;
            cell.childCells = childCells;
            return cell;
        },

        getCellById: function(cellId) {
            var nodeId = cellId.split('_')[0],
                date = G.utils.dayStringToDate(cellId.split('_')[1]),
                node = this.dataset.getNodeById(nodeId);
            return this.getCell(node, date);
        }, // getCellById

        buildCellPath: function(node_id) {
            if (node_id === ".") {
                return "Все договоры";
            } else {
                return node_id.split('/').slice(1).join('<span>/</span>');
            }
        },

        onTitleClick: function(e) {
            var cellId = $(e.target).closest('.title').data('cell-id');
            this.pointToCell(cellId);
        },

        pointToCell: function(cellId, doneCallback) {
            var self = this,
                nodeId = cellId.split('_')[0],
                whenNodeIsVisibleCallback = function() {
                    self.flashCell(cellId);
                    if (doneCallback) {
                        doneCallback();
                    }
                };
            ScrollHelper.pointToNode(nodeId, whenNodeIsVisibleCallback);
        }, // pointToCell

        flashCell: function(cellId) {
            var cell = this.getCellById(cellId),
                cellDimensions = this.getCellDimensions(cell),
                cellWidth = cellDimensions.x[1] - cellDimensions.x[0],
                cellHeight = cellDimensions.y[1] - cellDimensions.y[0],
                radius = 77,
                src = {
                    x: cellDimensions.x[0],
                    y: cellDimensions.y[0],
                    width: cellWidth,
                    height: cellHeight,
                    opacity: 0.8
                },
                trg = {
                    x: src.x - radius,
                    y: src.y - radius,
                    width: src.width + radius * 2,
                    height: src.height + radius * 2,
                    opacity: 1e-6,
                    rx: radius, ry: radius
                },
                flash;
            flash = d3.select('#main').append('rect')
                .attr('id', 'cell-flash')
                .attr(src);
            flash.transition().duration(G.config.duration).ease('circle-out')
                .attr(trg)
                .remove();
        }/*, // flashCell

        onAddCommentMockupClick: function(e) {
            var self = this,
                cellId = $(e.target).closest('.add-comment-mockup').data('cell-id'),
                whenCellIsVisibleCallback = function () {
                    self.activeCell = self.getCellById(cellId);
                    self.activateCommentMode(cellId);
                };
            this.pointToCell(cellId, whenCellIsVisibleCallback);
        }, // onAddCommentMockupClick

        activateCommentMode: function(cellId) {
            this.$el.find('.add-comment-input').hide();
            this.$el.find('.add-comment-mockup').show();
            this.$el
                .find('.title[data-cell-id="' + cellId + '"]')
                .parent().find('.comments-list')
                .find('.add-comment-mockup')
                .hide()
                .next('.add-comment-input')
                .show()
                .find('textarea').focus();
        }*/, // activateCommentMode

        dummy: null
    });


    function id(node_id, date) {
        return node_id + "_" + d3.time.format('%Y-%m-%d')(date);
    }

    return CommentsView;
});
