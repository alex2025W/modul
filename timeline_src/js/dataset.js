define([
  'jquery',
  'underscore',
  'backbone',
  'd3',
  'global',
  'scrollhelper',
  'selectorhelper',
  'workstatushelper',
  'jquery.jsonp',
  'jquery.csv'
], function($, _, Backbone, d3, G, ScrollHelper, SelectorHelper, WorkStatusHelper) {
  var PARSE_DATA_ERROR = 1;


  var Dataset = Backbone.Model.extend({
    url: G.config.data_url,

    hideCompleted: G.config.hideCompleted,
    hideCompletedDepth: G.config.hideCompletedDepth,

    sortType: G.config.sortType,
    sortDesc: G.config.sortDesc,

    searchFields: ['teamleads'],

    initialize: function() {
      // debug stuff {{{
      if (0) {
        this.on('all', function(e) { console.log('→ DatasetModel:', e); });
      }

      // redefine config url
      this.url = G.config.data_url;

      this.expandedNodes = {};
      this.listenTo(G.events, 'search:model', this.onSearch);
      this.listenTo(G.events, 'completed-filter:model', this.onCompletedFilter);
      this.listenTo(G.events, 'sort:model', this.onSort);
      this.listenTo(G.events, 'selector:model', this.onSelector);
      this.listenTo(G.events, 'brief-filter:model', this.onBriefFilter);
      this.on("change", function() { delete this.getD3Data.d3data; });
      this.on("sync", function() { G.events.trigger("dataset:load_complete",this.model , true);});

      this.listenTo(G.events, 'change:need_notification', this.onUpdateNeedNotification);

      this.on("delay_change",function(){
        var self = this;
        if(this.last_delay_timeout)
          clearTimeout(this.last_delay_timeout);
        this.last_delay_timeout = setTimeout(function(){
          self.trigger('change');
        },100);
      });
    },

    destroy: function() {
      this.off();
    },

    // load data from external source
    //
    sync: function(method, model, options) {
      options = _.extend({}, options, {
        url: this.url,
        success: function(resp) {
          try {
            model.completeSync(resp); // will trigger `change` event
            model.trigger('sync', model, resp, options);
          } catch (e) {
            G.utils.logException(e);
            model.trigger('error', { code: PARSE_DATA_ERROR, exception: e });
          }
        },
        error: function(e) {
          model.trigger('error', { code: PARSE_DATA_ERROR, exception: { code: e.status, message: e.responseText } });
        }
      });

      var xhr = options.xhr = $.ajax(options);
      model.trigger('request', model, xhr, options);
    }, // sync

    // load data from cache if any or from server
    //
    // fetch: function() {
    //   if (!G.config.caching || !localStorage.dataset || !localStorage.updated ||
    //     !localStorage.version || localStorage.version !== G.config.cacheVersion) {
    //     // load data from the server
    //     this.constructor.__super__.fetch.apply(this, arguments); // will call `sync`
    //   } else {
    //     // load data from the cache
    //   }
    // }, // fetch

    completeSync: function(response) {
      var weekends = {};
      for(var i=0;i<response.weekends.length;++i){
        weekends[response.weekends[i]] = true;
      }
      this.source_dataset = response.data;
      this.initIds(this.source_dataset);

      this.set({
        // save as string to prevent modifications by data-mining functions
        dataset:  this.deepClone(this.source_dataset),// response.data,//JSON.stringify(response.data),
        sector_names: response.sector_names,
        works: response.works,
        weekends: weekends
      });
      //console.log(response.weekends);
      // Сохраняем исходные данные в первозданном виде, т.к. dataset будет
      // меняться под воздействием фильтров и поисков в процессе DataMining
      // А исходные данные нужны для вывода статистики в инфо-панели (issue #272)
      // и для селекторов
      //
      //this.initialize_dataset = this.deepClone(response.data);
      //this.initIds(this.initialize_dataset);

      this.calculateDates(this.source_dataset);
    }, // completeSync

    getD3Data: function() {
      if (!this.getD3Data.d3data) {
        this.getD3Data.d3data = this.initD3Data();
      }
      return this.getD3Data.d3data;
    }, // getD3Data


    deepClone:function(object) {
      var clone = _.clone(object);
      var self = this;
      _.each(clone, function(value, key) {
        if (_.isObject(value)) {
        clone[key] = self.deepClone(value);
        }
      });

      return clone;
      },

    /*deepClone: function(aObject) {
      return JSON.parse(JSON.stringify(aObject));
      var bObject, v, k;
      bObject = Array.isArray(aObject) ? [] : {};
      for (k in aObject) {
      v = aObject[k];
      bObject[k] = (typeof v === "object") ? this.deepClone(v) : v;
      }
      return bObject;
    }, */

    initD3Data: function() {
      var dataset = this.deepClone(this.get('dataset'));

      // init id‘s
      //this.initIds(dataset); // TODO: эту часть можно сохранить в кеше

      // DATA MINING
      this.doSelector(dataset);
      this.doSearch(dataset);
      this.calculateDoneStatus(dataset);
      this.doCompletedFilter(dataset);
      this.doBriefFilter(dataset);
      this.doPointToNode(dataset);
      this.hideContractsLevel(dataset);

      // fill every node with dateRange and dateInterval
      this.calculateDates(dataset);

      // hide viewmenu item with empty contracts
      if (!G.appView.viewMenuItemsCollection.isVisible('empty_contracts')) {
        dataset.nodes = dataset.nodes.filter(function(d) { return d.dateRange && d.dateRange.plan; });
      }

      // apply sorting
      this.doSort(dataset);

      // expand root element
      this.expand(dataset, true);

      // tree nodes
      // as side effect: fills every node by d3 info (x, y, i, depth, children)
      var treeData = this.initTreeData(dataset);

      return {
        dataset: dataset,
        nodes: treeData.nodes,
        yScale: treeData.yScale
      };

    }, // initD3Data


    initIds: function recurse(node, prefix) {
      if (!prefix) {
        node.id = ".";
      } else {
        node.id = prefix + "/" + node.name;
      }
      _.forEach(node.nodes, function(n) { recurse(n, node.id); });
    }, // initIds


    initTreeData: function(dataset) {
      var self = this,
        tree = d3.layout.tree();

      tree.children(function(d) {
        return self.expanded(d) && d.nodes || null;
      });

      var nodes = tree.nodes(dataset);
      nodes.forEach(function(d, i) { d.i = i; });

      var yScale = d3.scale.linear()
        .domain([0, nodes.length]);
        // range is updating in the appview.adjustHeight
      return {
        nodes: nodes,
        yScale: yScale
      };
    }, // initTreeData

    hideContractsLevel: function(dataset) {
      if (!G.appView.viewMenuItemsCollection.isVisible('contract_level')) {
        // remove all contract nodes
        dataset.name = 'Заказы';
        dataset.nodes = _.flatten(dataset.nodes.map(function(contract) {
          return contract.nodes;
        }));
      }
    },

    // by issue #326 node-queries are passed without `./` prefix
    // query looks like id:
    // ./1    → for ability to make link to the 1-level nodes
    // ./1/2  → for backward compatibility
    // 1/2    → for simplisity as it was requested in the #326
    queryLooksLikeNodeId: function() {
      return (this.searchQuery[0]=='.' && (this.searchQuery.length==1 || this.searchQuery[1]=='/'));
      //return /(.+\/.*)+/i.test(this.searchQuery);
    }, // queryLooksLikeNodeId

    doPointToNode: function doPointToNode(dataset) {
      if (!this.queryLooksLikeNodeId()) { return; }
      var nodeQuery = "./" + this.searchQuery.replace(/(?:\.\/)?(.*?)\/*$/, "$1"),
        nodeIsOpen = this.searchQuery.slice(-1) === "/",
        node = this.getExistingNodeByQuery(dataset, nodeQuery);

      if (!node) { return; }

      var whenNodeIsVisibleCallback = function() {
        G.appView.nodesView.flashNode(node.id);
        doPointToNode.scheduled = void 0;
      };
      if (doPointToNode.scheduled !== node.id) {
        _.defer(function() {
          ScrollHelper.pointToNode(node.id + (nodeIsOpen ? "/" : ""), whenNodeIsVisibleCallback);
        });
        doPointToNode.scheduled = node.id;
      }
    }, // doPointToNode


    doSelector: function(dataset) {
      SelectorHelper.apply(dataset);
    }, // doSelector

    doSearch: function(dataset) {
      // don’t search empty queries
      if (!this.searchQuery) { return; }
      // don’t search queries that looks like a node ids
      if (this.queryLooksLikeNodeId()) { return; }
      var self = this,
        // split search query to the keywords
        keywords = this.searchQuery.match(/".*?"|[\S]+/ig),
        buildSearchStrings = function(node) {
          var nodeInfo = self.getInfo(node),
            searchStrings = [nodeInfo.name, nodeInfo.description, nodeInfo.id];
          self.searchFields.forEach(function(field) {
            if (node[field]) {
              if (_.isArray(node[field])) {
                searchStrings.push.apply(searchStrings, node[field]);
              } else {
                searchStrings.push(node[field]);
              }
            }
          });
          return searchStrings;
        },
        testMatch = function(node) {
          var searchStrings = buildSearchStrings(node).map(function(ss) { return ("" + ss).toLocaleLowerCase(); }),
            searchString = searchStrings.join(',,,');
          return _.any(keywords, function(keyword) {
            if (keyword.match(/^".*"$/)) {
              keyword = keyword.replace(/^"|"$/g, '');
              return searchStrings.indexOf(keyword) !== -1;
            } else {
              return searchString.indexOf(keyword) !== -1;
            }
          });
        };

      (function deepSearch(node, wasExactMatch) {
        if (testMatch(node)) {
          node._search_match = 'exact';
          wasExactMatch = true;
        }
        if (node.nodes) {
          var nodes = node.nodes.filter(function(node) {
            return deepSearch(node, wasExactMatch);
          });
          if (nodes.length && !node._search_match) {
            node._search_match = 'contain';
          }

          if (!wasExactMatch) {
            node.nodes = nodes;
          }
        }
        return node._search_match;
      })(dataset);
    }, // doSearch

    doSort: function(dataset) {
      var self = this,
        sorter,
        sortStringNumbers = G.utils.sortOrderNames,
        sortEmpty = function(a, b) {
          if (a.dateRange.plan || b.dateRange.plan) {
            return a.dateRange.plan ? -1 : 1;
          } if (a.dateRange.contract_plan || b.dateRange.contract_plan) {
            return a.dateRange.contract_plan ? -1 : 1;
          } else {
            if (a.sign_date) {
              // sort contracts by sign date
              return a.sign_date.localeCompare(b.sign_date);
            } else if (a.ready_date && a.ready_date.substr(0, 10) !== b.ready_date.substr(0, 10)) {
              // sort orders by ready date if different dates
              return a.ready_date.localeCompare(b.ready_date);
            } else {
              // sort by name
              return sortStringNumbers(""+a.name, ""+b.name);
            }
          }
        };


      // TODO: при динамическом обновлении данных этот кеш надо будет очищать!
      if (!self.doSort.__routines_cache) {
        self.doSort.__routines_cache = {};
      }
      switch(this.sortType) {
         case 'sort_by_orders':

           // локальная функция приведения строки из формата 1.10.1 в 0001.0010.0001
           function s_pad(val){
            var res = val;
            try{
              res = val.split('.').map(function(item) {return ("0000"+item).slice(-4);}).join('.');
            }
            catch(e)
            {
            }
            return res;
           }

          sorter = function(a, b) {
            var result = 0;
            var a_val = s_pad(a['name']);
            var b_val = s_pad(b['name']);

            if (a_val < b_val)
              result=  -1;
            else if (a_val > b_val)
              result = 1;
            return result * (self.sortDesc ? -1 : 1);
          };
          break;
        case 'sort_by_date_start':
          sorter = function(a, b) {
            var result;
            if (a.dateRange.plan && b.dateRange.plan) {
              a = G.utils.extentDate(a.dateRange.plan, a.dateRange.fact).start;
              b = G.utils.extentDate(b.dateRange.plan, b.dateRange.fact).start;
              result = a - b;
            } else if (a.dateRange.contract_plan && b.dateRange.contract_plan){
              a = G.utils.extentDate(a.dateRange.contract_plan, a.dateRange.fact).start;
              b = G.utils.extentDate(b.dateRange.contract_plan, b.dateRange.fact).start;
              result = a - b;
            } else {
              result = sortEmpty(a, b);
            }
            return result * (self.sortDesc ? -1 : 1);
          };
          break;
        case 'sort_by_date_finish':
          sorter = function(a, b) {
            var result;
            if (a.dateRange.plan && b.dateRange.plan) {
              a = G.utils.extentDate(a.dateRange.plan, a.dateRange.fact).finish;
              b = G.utils.extentDate(b.dateRange.plan, b.dateRange.fact).finish;
              result = a - b;
            } else {
              result = sortEmpty(a, b);
            }
            return result * (self.sortDesc ? -1 : 1);
          };
          break;
        case 'sort_by_last_routine':
          var routines_cache = self.doSort.__routines_cache;
          var lastRoutine = function(node, routine) {
            if (routines_cache[node.id] === void 0) {
              if (routine === void 0) {
                routine = -1;
              }
              if (node.dateRange.fact) {
                if (node.sector_routine !== void 0) {
                  routine = Math.max(routine, node.sector_routine);
                } else {
                  routine = _.reduce(node.nodes, function(prev, curr) { return lastRoutine(curr, prev); }, routine);
                }
              }
              routines_cache[node.id] = routine;
            }
            return routines_cache[node.id];
          };
          sorter = function(a, b) {
            var result;
            if (a.dateRange.plan && b.dateRange.plan) {
              var a_lastRoutine = lastRoutine(a),
                b_lastRoutine = lastRoutine(b);
              if (a_lastRoutine !== b_lastRoutine) {
                result = a_lastRoutine - b_lastRoutine;
              } else if (a.dateRange.fact && b.dateRange.fact) {
                result = b.dateRange.fact.finish - a.dateRange.fact.finish;
              } else {
                a = G.utils.extentDate(a.dateRange.plan, a.dateRange.fact).start;
                b = G.utils.extentDate(b.dateRange.plan, b.dateRange.fact).start;
                result = a - b;
              }
            } else {
              result = sortEmpty(a, b);
            }
            return result * (self.sortDesc ? -1 : 1);
          };
          break;
      } // switch


      function recursionSort(nodes){
        nodes.forEach(function(n){
          if(n.nodes){
            n.nodes.sort(sorter);
            recursionSort(n.nodes);
          }
        });
        nodes.sort(sorter);
      }

      recursionSort(dataset.nodes);

      /*// sort the orders inside each contract
      dataset.nodes.forEach(function(contract) {
        contract.nodes.sort(sorter);
      });

      // sort the contracts
      dataset.nodes.sort(sorter); */
    }, // doSort


    calculateDoneStatus: function(node) {
      var self = this,
        nodesWithDoneStatus = (node.nodes || []).filter(function(n) { return n.done !== undefined; });
      if (nodesWithDoneStatus.length) {
        node.done = true;
        nodesWithDoneStatus.forEach(function(n) {
          if (!self.calculateDoneStatus(n)) {
            node.done = false;
          }
        });
      }
      return node.done;
    }, // calculateDoneStatus


    doCompletedFilter: function(dataset) {
      /*
        dataset.nodes = _.filter(dataset.nodes, function(order) {
          // hide workorder level
          //
          if (this.hideCompletedDepth === 'workorder' || this.hideCompletedDepth === 'work') {
            order.nodes = _.filter(function(work_type) {
              work_type.nodes = _.filter(function(workorder) {
                // hide work level
                //
                if (this.hideCompletedDepth === 'work') {
                  workorder.nodes = _.filter(workorder.nodes, function(work) { return !work.done; });
                }
                return !workorder.done && workorder.nodes & workorder.nodes.length;
              });
            });
          }
          return !order.done && order.nodes && order.nodes.length;
        });
       */
       // this.searchQuery введен в соотвествии с таском 1777
      if (!this.searchQuery && this.hideCompleted) {
        // hide contracts
        dataset.nodes = _.filter(dataset.nodes, function(node) { return !node.done; });

        // hide orders
        if (this.hideCompletedDepth === 'order') {
          dataset.nodes.forEach(function(contract) {
            contract.nodes = _.filter(contract.nodes, function(order) { return !order.done; });
          });
        }

        // hide workorders
        if (this.hideCompletedDepth === 'workorder') {
          dataset.nodes.forEach(function(contract) {
            contract.nodes = _.filter(contract.nodes, function(order) {
              var pseudoNode = true;
              if (order.nodes && order.nodes.length) {
                pseudoNode = false;
                order.nodes = _.filter(order.nodes, function(worktype) {
                  var pseudoNode = true;
                  if (worktype.nodes && worktype.nodes.length) {
                    pseudoNode = false;
                    worktype.nodes = _.filter(worktype.nodes, function(workorder) { return !workorder.done; });
                  }
                  return pseudoNode || (worktype.nodes && worktype.nodes.length);
                });
              }
              return pseudoNode || (order.nodes && order.nodes.length);
            });
          });
        }

        // hide works
        if (this.hideCompletedDepth === 'work') {
          dataset.nodes.forEach(function(contract) {
            contract.nodes = _.filter(contract.nodes, function(order) {
              var pseudoNode = true;
              if (order.nodes && order.nodes.length) {
                pseudoNode = false;
                order.nodes = _.filter(order.nodes, function(worktype) {
                  var pseudoNode = true;
                  if (worktype.nodes && worktype.nodes.length) {
                    pseudoNode = false;
                    worktype.nodes = _.filter(worktype.nodes, function(workorder) {
                      if (workorder.nodes) {
                        workorder.nodes = _.filter(workorder.nodes, function(work) { return !work.done; });
                      }
                      return workorder.nodes && workorder.nodes.length;
                    });
                  }
                  return pseudoNode || (worktype.nodes && worktype.nodes.length);
                });
              }
              return pseudoNode || (order.nodes && order.nodes.length);
            });
          });
        }
      }
    }, // doCompletedFilter


    doBriefFilter: function(dataset) {
      if (!this.briefDaySelection) {
        return;
      }

      var DS = this.briefDaySelection;

      // show only works which planned to this date or with on_work status
      // or has any troubles
      //
      dataset.nodes = _.filter(dataset.nodes, function(contract) {
        if (contract.nodes) {
          contract.nodes = _.filter(contract.nodes, function(order) {
            if (order.nodes) {
              order.nodes = _.filter(order.nodes, function(worktype) {
                if (worktype.nodes) {
                  worktype.nodes = _.filter(worktype.nodes, function(workorder) {
                    if (workorder.nodes) {
                      workorder.nodes = _.filter(workorder.nodes, function(work) {

                        // works with plans to the date D
                        //
                        if (work.plan) {
                          if (G.utils.dayStringToDate(work.plan.finish) >= _.first(DS) &&
                            G.utils.dayStringToDate(work.plan.start) <=  _.last(DS)) {
                            return true;
                          }
                        }

                        // works with troubles or on_work status
                        //
                        var statuses = _.filter(work.status_log, function(entry) {
                          return G.utils.dayStringToDate(entry.date) <= _.last(DS);
                          }),
                          lastStatus = statuses.length ? _.last(statuses).status : "";
                        if (_.contains(['on_work', 'on_work_with_reject', 'on_hold', 'on_pause'], lastStatus)) {
                          return true;
                        }

                        // uncompleted works without any update
                        //
                        // TODO: wait discussion in the #25
                        // if (lastStatus !== 'completed') {
                        //   var facts = _.filter(work.nodes, function(node) {
                        //     return +G.utils.dayStringToDate(node.fact.date) <= D;
                        //   });
                        //   if (facts.length && G.utils.dayStringToDate(_.last(facts).fact.date) <= d3.time.day.offset(D, -3)) {
                        //     return true;
                        //   }
                        // }

                        return false;

                      }); // workorder.nodes filter
                    } // if workorder.nodes
                    return workorder.nodes && workorder.nodes.length;
                  }); // worktype.nodes filter
                } // if worktype.nodes
                return worktype.nodes && worktype.nodes.length;
              }); // order.nodes filter
            } // if order.nodes
            return order.nodes && order.nodes.length;
          }); // contract.nodes filter
        } // if contract.nodes
        return contract.nodes && contract.nodes.length;
      });
    }, // doBriefFilter


    calculateDates: function(node) {
      var self = this,
        dateRange = node.dateRange = {},
        dateIntervals = node.dateIntervals = {}

      var dayIsWeekend = function(day, use_weekends) {
        if(use_weekends){
          var dayString = d3.time.format('%Y-%m-%d')(day);
          return self.get('weekends')[dayString] || false;
        }
        return false;
        /*var dayString = d3.time.format('%Y-%m-%d')(day);
        return use_weekends &&
          _.find(self.get('weekends'), function(d) { return dayString === d; }); */
      };

      var dayHasBadStatuses = function(day, lastPlanShift) {
        //return false;
        if (day < lastPlanShift) {
          var statusAtDay = WorkStatusHelper.getLastStatusOnDate(node, +day);
          return ['on_pause', 'on_hold', 'on_work_with_reject'].indexOf(statusAtDay && statusAtDay.status) > -1;
        } else {
          return false;
        }
      };


      if (node.plan) {
        dateRange.plan = {
          start: G.utils.dayStringToDate(node.plan.start),
          finish: G.utils.dayStringToDate(node.plan.finish)
        };

        var lastPlanShift = node.plan_shifts && new Date(_.last(node.plan_shifts).date_change);


        dateIntervals.plan = [];

        var day = new Date(dateRange.plan.start);
        var interval = {};
        while (day <= dateRange.plan.finish) {
          // if day is weekend or there are bad statues on this day
          // then break the interval
          if (dayIsWeekend(day, node.use_weekends) || dayHasBadStatuses(day,lastPlanShift)) {
            if (interval.start) {
              dateIntervals.plan.push(interval);
              interval = {};
            }
          } else {
            // else just extend the interval to one more day (or start new interval)
            if (!interval.start) { interval.start = day; }
            interval.finish = day;
          }
          day = d3.time.day.offset(day, 1);
        }
        if (interval.start) {
          dateIntervals.plan.push(interval);
        }
      }

      if (node.plan_before_last_shift) {
        dateRange.plan_before_last_shift = {
          start: G.utils.dayStringToDate(node.plan_before_last_shift.start),
          finish: G.utils.dayStringToDate(node.plan_before_last_shift.finish)
        };
      }

      if(node.contract_plan){
        dateRange.contract_plan = {
          start: G.utils.dayStringToDate(node.contract_plan.start),
          finish: G.utils.dayStringToDate(node.contract_plan.finish)
        };

        var lastPlanShift = node.contract_plan_plan_shifts && new Date(_.last(node.contract_plan_plan_shifts).date_change);


        dateIntervals.contract_plan = [];

        var day = new Date(dateRange.contract_plan.start);
        var interval = {};
        while (day <= dateRange.contract_plan.finish) {
          // if day is weekend or there are bad statues on this day
          // then break the interval
          if (dayIsWeekend(day, node.contract_plan_use_weekends) || dayHasBadStatuses(day,lastPlanShift)) {
            if (interval.start) {
              dateIntervals.contract_plan.push(interval);
              interval = {};
            }
          } else {
            // else just extend the interval to one more day (or start new interval)
            if (!interval.start) { interval.start = day; }
            interval.finish = day;
          }
          day = d3.time.day.offset(day, 1);
        }
        if (interval.start) {
          dateIntervals.contract_plan.push(interval);
        }
      }

      if (node.contract_plan_plan_before_last_shift) {
        dateRange.contract_plan_plan_before_last_shift = {
          start: G.utils.dayStringToDate(node.contract_plan_plan_before_last_shift.start),
          finish: G.utils.dayStringToDate(node.contract_plan_plan_before_last_shift.finish)
        };
      }

      if (node.fact) {
        dateRange.fact = {};
        dateRange.fact.start = dateRange.fact.finish = G.utils.dayStringToDate(node.fact.date);
        dateIntervals.fact = [ dateRange.fact ];
      }

      _.forEach(node.nodes, function(child) {
        var childDates = self.calculateDates(child);
        // extent child date ranges
        //
        if (childDates.range.plan) {
          dateRange.plan = G.utils.extentDate(dateRange.plan, childDates.range.plan);
        }
        if(childDates.range.contract_plan){
          dateRange.contract_plan = G.utils.extentDate(dateRange.contract_plan, childDates.range.contract_plan);
        }
        if (childDates.range.plan_before_last_shift) {
          dateRange.plan_before_last_shift = G.utils.extentDate(dateRange.plan_before_last_shift, childDates.range.plan_before_last_shift);
        } else if (childDates.range.plan) {
          dateRange.plan_before_last_shift = G.utils.extentDate(dateRange.plan_before_last_shift, childDates.range.plan);
        }

        if (childDates.range.contract_plan_plan_before_last_shift) {
          dateRange.contract_plan_plan_before_last_shift = G.utils.extentDate(dateRange.contract_plan_plan_before_last_shift, childDates.range.contract_plan_plan_before_last_shift);
        } else if (childDates.range.contract_plan) {
          dateRange.contract_plan_plan_before_last_shift = G.utils.extentDate(dateRange.contract_plan_plan_before_last_shift, childDates.range.contract_plan);
        }

        if (childDates.range.fact) {
          dateRange.fact = G.utils.extentDate(dateRange.fact, childDates.range.fact);
        }

        // accumulate child date intervals
        //
        _.forEach(childDates.intervals, function(childPlanOrFactInterval, key) {
          if (childPlanOrFactInterval.length) {
            if (!dateIntervals[key]) { dateIntervals[key] = []; }
            dateIntervals[key].push(childPlanOrFactInterval.map(G.utils.cloneDates));
          }
        });

      });

      // flatten and join child date intervals
      //
      G.utils.flattenIntervals(dateIntervals);
      // TODO: strange magic here. seems that dateIntervals are
      // using somewhere else. Not only in the calculateDates output...

      return {
        range: dateRange,
        intervals: dateIntervals
      };
    }, // calculateDates

    getInfo: function(d) {
      var name = d.name || '',
        description = this.getDescription(d);

      // special case: work name
      //
      if (d.work_code) {
        var key = d.sector_id + '_' + d.work_code,
          work = this.get('works')[key];
        if (work) {
          name = "";
          description = "[" + d.work_code + "] " + work.name + ", " + work.unit;
        }
      }

      return {
        name: name,
        description: description,
        id : d.id
      };
    }, // getInfo

    // returns description info from datum
    //
    getDescription: function(d) {
      // contracts
      switch(d.node_type) {
        case "contract":
          if (d.client_name) {
            return d.client_name;
          }
          break;
        case "order":
          if (d.production_name) {
            return d.production_name;
          }
          break;
        case "work_type":
          if (d.teamleads) {
            if (d.teamleads.length > 4) {
              return G.utils.pluralForm(d.teamleads.length, ['бригадир', 'бригадира', 'бригадиров']);
            } else {
              return d.teamleads.join(', ');
            }
          }
          break;
        case "workorder":
          if (d.sector_name_id !== void 0) {
            return "[" + d.sector_id + "] " + this.get('sector_names')[d.sector_name_id];
          }
          break;
        default:
          return '';
      } // switch node_type
    }, // getDescription


    getInfoPlanShift: function(d, startOrFinish) {
      var planShift = null, index = -1;
      if (d.plan_shifts) {
        d.plan_shifts.forEach(function(ps) {
           if (ps.type === 'both' || ps.type === startOrFinish) {
            planShift = ps;
            index++;
           }
        });
        return planShift ? {index: index, planShift: planShift} : null;
      } else {
        // plan_shifts inside
        //
        var calculatePlanShiftsInside = function(d, key) {
          // наличие переносов определяется по plan_before_last_shift.
          // если у чилдрена нынешняя дата и дата до последнего переноса разнятся,
          // значит имел место перенос
          //
          if (d.dateRange.plan_before_last_shift) {
            var ch = d.nodes || [];
            return ch.reduce(function(summ, node) {
              if (node.dateRange.plan_before_last_shift && +node.dateRange.plan_before_last_shift[key] !== +node.dateRange.plan[key]) {
                return summ + 1;
              } else {
                return summ;
              }
            }, 0);
          } else {
            return 0;
          }
        };
        if (!d._plan_shifts_inside) {
          d._plan_shifts_inside = {};
        }
        if (d._plan_shifts_inside[startOrFinish] === undefined) {
          d._plan_shifts_inside[startOrFinish] = calculatePlanShiftsInside(d, startOrFinish);
        }
        return { inside: d._plan_shifts_inside[startOrFinish] };
      }
    }, // getInfoPlanShift


    toggleNode: function(d) {
      this.expand(d, !this.expanded(d));

      // update nodes in d3d stucture & yScale
      //
      var d3d = this.getD3Data();
      var treeData = this.initTreeData(d3d.dataset);
      d3d.nodes = treeData.nodes;
      d3d.yScale = treeData.yScale;

      if (d3.event.shiftKey) { console.log(d); }

      this.trigger('toggle', d);
    }, // toggleNode


    expand: function(d, expand) {
      if (expand) {
        this.expandedNodes[d.id] = true;
      } else {
        delete this.expandedNodes[d.id];
      }
    }, // expand


    expanded: function(d) {
      return this.expandedNodes[d.id] || false;
    }, // expanded


    // assumes that d.node_type is always upper on the hierarchy then nodeType
    expandNodeToNodeType: function(d, nodeType) {
      var self = this,
        d3d = this.getD3Data(),
        needRedraw = false;
      function recurse(node) {
        if (node.node_type === nodeType) {
          if (self.expanded(node)) {
            self.expand(node, false);
            needRedraw = true;
          }
        } else {
          if (!self.expanded(node)) {
            self.expand(node, true);
            needRedraw = true;
          }
          _.forEach(node.nodes, recurse);
        }
      }
      recurse(d);
      if (needRedraw) {
        var treeData = this.initTreeData(d3d.dataset);
        d3d.nodes = treeData.nodes;
        d3d.yScale = treeData.yScale;
        this.trigger('change');
      }
    }, // expandNodeToNodeType


    expandToSearchResults: function() {
      var self = this,
        d3d = this.getD3Data(),
        needRedraw = false;
      function recurse(node) {
        if (node._search_match === 'contain') {
          if (!self.expanded(node)) {
            self.expand(node, true);
            needRedraw = true;
          }
          _.forEach(node.nodes, recurse);
        }
      }
      recurse(d3d.dataset);
      if (needRedraw) {
        var treeData = this.initTreeData(d3d.dataset);
        d3d.nodes = treeData.nodes;
        d3d.yScale = treeData.yScale;
        this.trigger('change');
      }
    }, // expandToSearchResults


    expandToNode: function(nodePath) {
      var nodePathTokens = nodePath.toLocaleLowerCase().split('/').slice(0, -1);
      var d3d = this.getD3Data();
      var nodes = [ d3d.dataset ];
      var needRedraw = false;
      var node;
      for (var i = 0; i < nodePathTokens.length; i++) {
        for (var n = 0; n < nodes.length; n++) {
          node = nodes[n];
          if (node.id.split('/').slice(-1)[0].toLocaleLowerCase() === nodePathTokens[i]) {
            if (!this.expanded(node)) {
              this.expand(node, true);
              needRedraw = true;
            }
            nodes = nodes[n].nodes || [];
            break;
          }
        }
      }
      if (needRedraw) {
        var treeData = this.initTreeData(d3d.dataset);
        d3d.nodes = treeData.nodes;
        d3d.yScale = treeData.yScale;
        this.trigger('change');
      }
      return needRedraw;
    }, // expandToNode


    getNodeById: function(nodeId) {
      return _.find(this.getD3Data().nodes, function(d) {return d.id === nodeId;});
    }, // getNodeById

    getExistingNodeByQuery: function(dataset, nodeQuery) {
      /*function findRecursive(nodes, nodeQuery){
        for(var i=0;i<nodes.length;++i){
          var item = nodes[i];
          if(item.id.toLocaleLowerCase().indexOf(nodeQuery)>=0){
            return item;
          }
          var res = findRecursive(item.nodes || [],nodeQuery);
          if(res)
            return res;
        }
        return (void 0);
      }

      nodeQuery = nodeQuery.toLocaleLowerCase();
      return findRecursive([dataset],nodeQuery); */
      nodeQuery = nodeQuery.toLocaleLowerCase();
      var pathToNode = nodeQuery.split('/'),
        nodes = [ dataset ],
        node;
      for (var i = 0; i < pathToNode.length; i++) {
        for (var n = 0; n < nodes.length; n++) {
          node = nodes[n];
          if (node.id.split('/').slice(-1)[0].toLocaleLowerCase() === pathToNode[i]) {
            nodes = nodes[n].nodes || [];
            break;
          }
        }
      }
      if (node.id.toLocaleLowerCase() !== nodeQuery) {
        node = void 0;
      }
      return node;
    }, // getExistingNodeByQuery

    /*
    getNodeById: function(node, relativeId) {
      var self = this,
        nodeName = node.id.split('/').slice(-1)[0],
        relativeIdChunks = relativeId.split('/'),
        result;
      if (nodeName === relativeIdChunks.shift()) {
        if (relativeIdChunks.length) {
          _.any(node.nodes, function(n) {
            return result = self.getNodeById(relativeIdChunks.join('/'), n);
          });
        } else {
          result = node;
        }
      }
      return result;
    },
    */

    /**
     ** Event on update need_notification flag
     ** params -  {node_id, need_notification'}
    **/
    onUpdateNeedNotification: function(params){
      var self = this;
      // local recursive function to update node
      function update_node(node, field, val ){
        node[field] = val;
        _.forEach(node.nodes, function(n) { update_node(n, field, val);});
      }
      // local function to find node in tree
      function get_node_by_id(data, node_id){
        var res = null;
        for(var i in data['nodes'])
        {
          var node = data['nodes'][i];
          if(node['id'] == node_id)
            return node;
          res = get_node_by_id(node, node_id);
          if(res)
            return res;
        }
        return res;
      }
      // change global dataset
      var dataset = this.deepClone(this.get('dataset')); /*JSON.parse(this.get('dataset'));
      this.initIds(dataset); */
      var node = get_node_by_id(dataset, params['node_id']);
      //node['name'] = 'gopa';
      update_node(node, 'need_notification', params['need_notification']);
      this.set('dataset', JSON.stringify(dataset),{silent: true});

      //-----------
      // if silent update
      // change local dataset
      dataset = this.getD3Data().dataset;
      node = get_node_by_id(dataset, params['node_id']);
      update_node(node, 'need_notification', params['need_notification']);
      //node = this.getNodeById(params['node_id']);
      //node['need_notification'] = params['need_notification'];
      //-------------

      // event to complete dataset  update
      G.events.trigger('change:dataset', this);
    },

    onSearch: function(query, silent) {
      if (this.searchQuery !== query) {
        this.searchQuery = query;
        // if data is already loaded
        // trigger change -> update d3data -> do search -> render all
        if (this.get('dataset') && !silent) {
          this.trigger("delay_change");
        }
      }
    }, // onSearch

    onBriefFilter: function(selectedDays) {
      this.briefDaySelection = selectedDays.length
        ? _.sortBy(selectedDays)
        : void 0;
      this.trigger('delay_change');
    }, // onBriefFilter


    onCompletedFilter: function(hideCompleted, depth, silent) {
      this.hideCompleted = hideCompleted;
      this.hideCompletedDepth = depth;
      if (this.get('dataset') && !silent) {
        this.trigger('delay_change');
      }
    }, // onCompletedFilter


    onSort: function(sortType, sortDesc) {
      this.sortType = sortType;
      this.sortDesc = sortDesc;
      // if data is already loaded
      // trigger change -> update d3data -> do search -> render all
      if (this.get('dataset')) {
        this.trigger('delay_change');
      }
    }, // onSort

    onSelector: function(selectorParamsJSON) {
      SelectorHelper.set(selectorParamsJSON);
      if (this.get('dataset')) {
        this.trigger('delay_change');
      }
    }, // onSelector

    getSelectorValues: function(type) {
      return SelectorHelper.selectors[type] || [];
    },

    dummy: {}
  });

  return Dataset;
});
