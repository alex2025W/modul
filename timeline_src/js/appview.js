define([
  'jquery',
  'underscore',
  'backbone',
  'd3',
  'global',
  'dataset',
  'timelinesview',
  'nodesview',
  'tooltipview',
  'cellscollection',
  'commentsview',
  'infopanelview',
  'axisdaysview',
  'monthsview',
  'zoomview',
  'zoomhelper',
  'gridview',
  'horizontalgridview',
  'todayview',
  'dayhighlightview',
  'menudeldiaview',
  'dayselectview',
  'searchview',
  'sortview',
  'daterangesview',
  'statsview',
  'statsmodel',
  'loadingview',
  'completedfilterview',
  'usermodel',
  'userview',
  'viewmenuitemscollection',
  'viewmenuview',
  'selectorsviews',
  ''
], function($, _, Backbone, d3, G, Dataset, TimelinesView, NodesView, TooltipView,
    CellsCollection, CommentsView, InfoPanelView,
    AxisDaysView, MonthsView, ZoomView, ZoomHelper, GridView, HorizontalGridView, TodayView,
    DayHighlightView, MenuDelDiaView, DaySelectView, SearchView, SortView,
    DateRangesView, StatsView, StatsModel, LoadingView, CompletedFilterView, UserModel, UserView,
    ViewMenuItemsCollection, ViewMenuView, SelectorsViews,
    _dummy) {
  _dummy = "i’m just a dummy";

  var AppView = Backbone.View.extend({
    el: '#app',

    initialize: function() {
      // DEBUG
      if (0) {
        G.events.on('all', function() {
          console.log('>> events', arguments);
        });
      }

      // init canvas
      //
      this.canvas = d3.select('#canvas');
      this.canvas
        .attr("width", G.config.width + G.config.margin.left + G.config.margin.right)
        .on('click', function() { G.events.trigger('click:canvas', d3.event); })
        .select("#main")
          .attr("transform", "translate(" + G.config.margin.left + "," + G.config.margin.top + ")");

      // init axis
      //
      this.axis = d3.select('#axis')
        .attr("width", G.config.width + G.config.margin.left + G.config.margin.right)
        .attr("height", G.config.axis.height);


      this.model = new Dataset();
      this.userModel = new UserModel();
      this.userModel.fetch();

      // init handlers
      //
      this.listenToOnce(this.model, "change", this.render);
      this.listenTo(this.model, "change toggle", this.adjustHeight);
      this.listenTo(this.model, "error", this.error);
      this.listenTo(G.events, "resize", this.onResize);

      // startup modules
      //

      // backend for zooming and paning
      this.zoomHelper = new ZoomHelper();

      // show user email
      this.userView = new UserView({model: this.userModel});

      // draw the timelines
      this.timelinesView = new TimelinesView({model: this.model});

      // draw the nodes
      this.nodesView = new NodesView({model: this.model});

      // show tooltips above nodes and timelines
      this.tooltipView = new TooltipView({model: this.model});

      // draw the comments widget
      this.commentsView = new CommentsView({ dataset: this.model, collection: new CellsCollection() });

      // draw the info-panel
      this.infoPanelView = new InfoPanelView();

      // draw day names at the calendar axis
      this.axisDaysView = new AxisDaysView();

      // draw month names at the calendar axis
      this.monthsView = new MonthsView();

      // handle zoom and pan events
      this.zoomView = new ZoomView({model: this.model, zoomHelper: this.zoomHelper});

      // draw vertical grid for days, weekends and months
      this.gridView = new GridView({model: this.model});

      // draw horizontal grid between each timeline
      this.horizontalGridView = new HorizontalGridView({model: this.model});

      // highlight today date by vertical bar
      this.todayView = new TodayView({model: this.model});

      // highlight day under cursor
      this.dayHighlightView = new DayHighlightView({model: this.model});

      // show day`s menu
      this.menuDelDiaView = new MenuDelDiaView({model: this.model});

      // show selected day`s
      this.daySelectView = new DaySelectView({model: this.model});

      // show search box and handle keyboard events
      this.searchView = new SearchView({model: this.model});

      // show and handle block with sort links
      this.sortView = new SortView({model: this.model});

      // show stats button and draw statistics modal dialog
      this.statsView = new StatsView({model: new StatsModel()});

      // show view-menu dropdown button and render dropdown menu
      this.viewMenuItemsCollection = new ViewMenuItemsCollection();
      this.viewMenuView = new ViewMenuView({collection: this.viewMenuItemsCollection});

      // show selectors dropdown buttons and render menus
      this.selectorContractView = new SelectorsViews.ContractView({model: this.model});
      this.selectorOrderView = new SelectorsViews.OrderView({model: this.model});
      this.selectorWorktypeView = new SelectorsViews.WorktypeView({model: this.model});
      this.selectorSectorView = new SelectorsViews.SectorView({model: this.model});
      this.selectorStatusView = new SelectorsViews.StatusView({model: this.model});

      // show notification when ajax process is running
      this.loadingView = new LoadingView();

      // show and handle completion filter checkbox
      this.completedFilterView = new CompletedFilterView({model: this.model});

      // show dateranges when timeline highlighted
      this.dateRangesView = new DateRangesView();//{model: this.model});

      // load data
      //
      this.model.fetch();

      this.initGlobalAjax();

      this.model.once('change', function() {
        d3.select('header').style('top', '0px');
        d3.select('footer').style('bottom', '0px');
        G.events.trigger('data-ready');
        if(G.appView.model.searchQuery)
           G.appView.model.expandToSearchResults();
      });


      // this evil line makes appview visible to everybody. ];->
      G.appView = this;
    },

    render: function() {
      $('#spinner').hide();
      this.$el.find('footer .version').text(G.appVersion);
      this.$el.show();
    },

    adjustHeight: function() {
      var nodesHeight = (G.config.nodeHeight + G.config.nodePadding) * this.model.getD3Data().nodes.length;

      this.model.getD3Data().yScale
        .rangeRound([0, nodesHeight]);

      this.canvas
        .attr("height", Math.max(G.config.height, nodesHeight) + G.config.margin.top + G.config.margin.bottom);
    },

    onResize: function() {
      var nodesHeight = (G.config.nodeHeight + G.config.nodePadding) * this.model.getD3Data().nodes.length;
      this.canvas
        .attr("width", G.config.width + G.config.margin.left + G.config.margin.right)
        .attr("height", Math.max(G.config.height, nodesHeight) + G.config.margin.top + G.config.margin.bottom);
      this.axis
        .attr("width", G.config.width + G.config.margin.left + G.config.margin.right)
        .attr("height", G.config.axis.height);
    },

    initGlobalAjax: function() {
      $(document).ajaxStart(function() {
        G.events.trigger("start:loading");
      });
      $(document).ajaxStop(function() {
        G.events.trigger("stop:loading");
      });

      $('#auth-error .close').click(function() { $('#auth-error').hide(); });
    },  // initGlobalAjax

    error: function(e) {
      $('#spinner').hide();

      var message_type = e && e.code || 0,
        code = e && e.exception && e.exception.code || 0,
        message = e && e.exception && e.exception.message || "";
      $('#auth-error')
        .find(".message").hide().end()
        .find(".message-" + message_type).show().end()
        .find(".exception").text((code ? ("[code: " + code + "] ") : "") + (message || "")).end()
        .fadeIn();
    }
  });

  return AppView;
});
