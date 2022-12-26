define([
  'jquery',
  'underscore',
  'backbone',
  'd3',
  'ga'
], function($, _, Backbone, d3, ga) {
  var Global = {
    appVersion: 'v1.82',

    router: null, // is initialized in the router.js

    config: {
      // default sort type and order
      sortType: 'sort_by_date_start',
      sortDesc: false,
      // default completed filter state
      hideCompleted: true,
      hideCompletedDepth: 'contract',

      infoPanelWidth: 300,
      infoPanelButtonWidth: 30,

      local: 0,    // in dev mode 1=use a local file as the data
      searchDelay: 500 // delay after keyup before firing the search event
    },

    initialize: function() {
      this.events = _.extend({}, Backbone.Events);

      this.initDimensions();
      this.initBackend();
      this.initD3();
      this.initTimescale();
      this.initGA();


      var self = this;
      Global.events.on('data-ready', function() {
        $(window).resize(self.onResize);
      });
      $(window).scroll(this.onScroll);


      Global.events.on("userid:usermodel", function(user_id) { Global.currentUser = user_id; });
    },

    initDimensions: function() {
      this.config.margin = { top: 132 + 15, right: 0, bottom: 50, left: 5 };
      this.config.width = $(window).width() - this.config.margin.left - this.config.margin.right;
      this.config.height = $(window).height() - this.config.margin.top - this.config.margin.bottom - 6; // magic number
    },

    initBackend: function() {
      this.config.api_url = "/timeline/api";

      this.config.data_url = this.config.api_url + '/get_data';
      this.config.user_id_url = this.config.api_url + '/get_user_id';
      this.config.materials_by_work_url = this.config.api_url + '/get_materials_by_work';
      this.config.materials_by_workorder_url = this.config.api_url + '/get_materials_by_workorder';
      this.config.stats_url = this.config.api_url + '/sectors';

      this.config.brief_url = "/brief#"; // + DD_MM_YYYY;

      this.config.caching = false;
      this.config.cacheVersion = this.appVersion;
    },

    initD3: function() {
      var self = this;
      $(document).mouseup(function(e) {
        self.config.duration = e.altKey ? self.config.durationSlow : self.config.durationNormal;
      });
      this.config.durationNormal = 300;
      this.config.durationSlow = 5000;
      this.config.durationFast = 100;
      this.config.duration = this.config.durationNormal;

      // tree nodes
      //
      this.config.treeDepthPadding = 20;
      this.config.treeOpacity = 0.9;
      this.config.nodeWidth = 100;
      this.config.nodeWidthMin = 100;
      this.config.nodeWidthMax = 270;

      // timelines
      //
      this.config.timelinePadding = 1;
      this.config.timelinePlanHeight = 5;
      this.config.timelineContractPlanHeight = 4;
      this.config.timelineFactHeight = 42;
      this.config.nodePadding = 15;
      this.config.nodeHeight = this.config.timelinePlanHeight + this.config.timelineFactHeight + this.config.timelinePadding;
      this.config.nodeRadius = 5;
      this.config.nodeToggleOpacity = 0.2;
      this.config.planShiftCurveHeight = 10;
      this.config.planShiftDotRadius = 5;
      this.config.planShiftArrowWidth = 6;
      this.config.planShiftArrowHeight = 7;

      // axis
      //
      this.config.axis = {};
      this.config.axis.height = 45;
      // should be sorted from high to low values
      this.config.axis.ticks = {
        longDays: 240,
        shortDays: 112,
        weeks: 40,
        months: 0
      };
    },

    initTimescale: function() {
      // today based timescale
      var today = new Date(),
        magicNumber = 1.5,
        days = Global.config.width / (this.config.axis.ticks.shortDays/7) / magicNumber;
      this.timeScale = d3.time.scale()
        .domain([d3.time.day.offset(today, -0.6 * days),
             d3.time.day.offset(today, 0.4 * days)])
        .rangeRound([0, Global.config.width]);
    },


    initGA: function() {
      Global.events.on("userid:usermodel", function(user_id) {
        ga('create', {
          trackingId: 'UA-51630738-1',
          // cookieDomain: 'none', // for local testing
          cookieDomain: 'int-modul.herokuapp.com',
          userId: user_id
        });
        ga('set', 'dimension1', user_id);
        ga('send', 'pageview');
      });
    }, // initGA

    onResize: function() {
      Global.initDimensions();
      Global.timeScale.rangeRound([0, Global.config.width]);
      Global.events.trigger("resize", "resize");
    },

    onScroll: function() {
      Global.events.trigger("scroll");
    },

    utils: {
      treeToNodes: function(root, all_nodes) {
        /*if(!all_nodes)
            all_nodes = [];
        all_nodes.push(root);
        if (root.nodes) {
          root.nodes.forEach(function(node) { Global.utils.treeToNodes(node, all_nodes); });
        }
        return all_nodes; */
        if(root.all_nodes)
          return root.all_nodes;
        if (!all_nodes) { all_nodes = []; }
        var nodes = [];
        nodes.push(root);
        if (root.nodes) {
          root.nodes.forEach(function(node) { nodes = Global.utils.treeToNodes(node, nodes); });
        }
        root.all_nodes = nodes;
        all_nodes = all_nodes.concat(nodes);
        return all_nodes;
      }, // treeToNodes

      daysToPixels: function(days, timeScale) {
        var d1 = new Date();
        timeScale = timeScale || Global.timeScale;
        return timeScale(d3.time.day.offset(d1, days)) - timeScale(d1);
      }, // daysToPixels

      dayStringToDate: function(day_string) {
        var date = new Date(day_string);
        return new Date(date.getTime() + date.getTimezoneOffset() * 60000);
      }, // dayStringToDate

      dateWithinRange: function(d, range) {
        return _.first(range) <= d && d <= _.last(range);
      },

      extentDate: function(d1, d2) {
        var start = [ d1 && d1.start, d2 && d2.start ],
          finish = [ d1 && d1.finish, d2 && d2.finish ];
        return {
          start: d3.min(start),
          finish: d3.max(finish)
        };
      }, // extendDate

      cloneDates: function(dates) {
        return {
          start: new Date(dates.start),
          finish: new Date(dates.finish)
        };
      }, // cloneDates

      flattenIntervals: function(dateIntervals) {
        _.forEach(dateIntervals, function(planOrFactIntervals, key) {
          if (planOrFactIntervals.length === 0) { return; }
          var intervals = _
              .flatten( planOrFactIntervals )
              .sort( function(a, b) { return a.start - b.start; } ),
          current = intervals[0];
          dateIntervals[key] = [ current ];
          intervals.slice(1).forEach(function(interval) {
            if (interval.start - current.finish <= 24 * 60 * 60 * 1000) {
              if (current.finish < interval.finish) {
                current.finish = interval.finish;
              }
            } else {
              current = interval;
              dateIntervals[key].push(current);
            }
          });
        });
      }, // flattenIntervals

      getMaxHeight: function(model) {
        return Math.max($(window).height(), model.getD3Data().nodes.length * (Global.config.nodeHeight + Global.config.nodePadding)) +
          Global.config.margin.top + Global.config.margin.bottom;
      }, // getMaxHeight

      // Returns N with proper plural form for the Russian language
      // if neat option is true then skip redundant N if N == 1 (eg. "день" instead of "1 день")
      // forms example: ['минуту', 'минуты', 'минут']
      //          1, 21,  2,3,4   5,6,7...
      pluralForm: function(n, forms, options) {
        var result = "";
        if (!options || (options.neat && n !== 1) ) {
          result += n + " ";
        }
        n = Math.abs(n);
        result += forms[ (n%10===1 && n%100!==11 ? 0 : n%10>=2 && n%10<=4 && (n%100<10 || n%100>=20) ? 1 : 2) ];
        return result;
      }, // pluralForm

      sortOrderNames: function(a, b) {
        var alist = a.split(/(\d+)/).slice(1, -1),
        blist = b.split(/(\d+)/).slice(1, -1);
        for (var i = 0, len = alist.length; i < len;i++) {
          if (alist[i] !== blist[i]) {
            if (alist[i].match(/\d/)) {
              return +alist[i] - +blist[i];
            } else {
              return alist[i].localeCompare(blist[i]);
            }
          }
        }
        return 0;
      }, // sortOrderNames

      logException: function(e) {
        if (e.name) {
          console.log(e.name + ': ' + e.message);
          console.log(e.stack);
        } else {
          console.log(e);
        }
      },

      dummy: null
    }
  };

  Global.initialize();

  return Global;
});
