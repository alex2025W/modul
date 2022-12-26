define([
  'jquery',
  'underscore',
  'd3',
  'backbone',
  'global',
  'materialsmodel',
  'workstatushelper',
  'planshiftshelper',
  'datahelper',
  'moment'
], function($, _, d3, Backbone, G, MaterialsModel, WorkStatusHelper, PlanShiftsHelper, D, moment)
{
  var InfoBlockWidgets = {
    init: function() {
      G.events.on('render:info-block', function($container, model) {
        widgetClasses.forEach(function(WidgetClass) {
          var widget = new WidgetClass({nodeId: model.id, $container: $container});
          widget.listenTo(G.events, 'remove:info-block', function(model) {
            if (model.id === widget.nodeId) {
              widget.remove();
            }
          });
          widget.render();
        });
      });
    } // init
  }; // InfoBlockWidgets


  var InfoBlockWidgetView = Backbone.View.extend({
    tagName: 'div',
    initialize: function(options) {
      this.nodeId = options.nodeId;
      this.$container = options.$container;
    }
  });


  //
  // ----------- WIDGETS ----------
  //


  var DatesWidgetView = InfoBlockWidgetView.extend({
    className: 'widget dates',
    template: $('#dates-widget-template').html(),

    initialize: function() {
      InfoBlockWidgetView.prototype.initialize.apply(this, arguments);
      this.listenTo(G.appView.model, 'change', this.render);
    },

    render: function() {
      // Use source_dataset instead of dataset which truncated by data-mining
      var node = G.appView.model.getExistingNodeByQuery(G.appView.model.source_dataset, this.nodeId);
      var dateRanges = calculateDateRanges(node.dateRange, node.dateIntervals);
      var worksWithPublishDates = this.calculateWorksWithPublishDates(node);
      this.$el.html(_.template(this.template, {
        dateRanges: dateRanges,
        worksWithPublishDates: worksWithPublishDates,
        pluralForm: G.utils.pluralForm
      }));
      if (!$.contains(this.$container[0], this.el)) {
        this.$container.append(this.$el);
      }
    }, // render

    calculateWorksWithPublishDates: function(node) {
      function getDelta(w) {
        var d1 = G.utils.dayStringToDate(w.plan_publish_date);
        var d2 = G.utils.dayStringToDate(w.plan_before_shift.start);
        return Math.round((d2 - d1) / 1000 / 60 / 60 / 24);
      }
      var worksWithPublishDates = [];
      D(node).forEach('work', function(work) {
        if (work.plan_publish_date) {
          var delta = getDelta(work);
          worksWithPublishDates.push(delta);
        }
      });
      return _.uniq(worksWithPublishDates);
    }, // calculateWorksWithPublishDates

  }); // Widget_Dates


  var ContractDatesWidgetView = InfoBlockWidgetView.extend({
    className: 'widget contract-dates',
    template: $('#contract-dates-widget-template').html(),

    initialize: function() {
      InfoBlockWidgetView.prototype.initialize.apply(this, arguments);
      this.listenTo(G.appView.model, 'change', this.render);
    },

    render: function() {
      var node = G.appView.model.getExistingNodeByQuery(G.appView.model.source_dataset, this.nodeId);
      if (node.node_type === 'contract') {
        var workTypes = this.calculateWorkTypes(node);
        this.$el.html(_.template(this.template, {
          workTypes: workTypes,
          pluralForm: G.utils.pluralForm
        }));
        if (!$.contains(this.$container[0], this.el)) {
          this.$container.append(this.$el);
        }
      } else {
        this.$el.hide();
      }
      return this;
    }, // render

    calculateWorkTypes: function(contract) {
      var workTypes = {};

      // accumulate real work types dates
      D(contract).forEach('work_type', function(node) {
        this.accumulateWorkTypeDates(workTypes, node.name,
                  node.dateRange, node.dateIntervals);
      }, this);

      // accumulate troubleshooting dates
      D(contract).forEach('workorder', {
        filter: 'troubleshooting',
        callback: function(node) {
          this.accumulateWorkTypeDates(workTypes, 'troubleshooting',
                  node.dateRange, node.dateIntervals);
        }
      }, this);
      _.pluck(workTypes, 'dateIntervals').map(G.utils.flattenIntervals);

      return _.map(workTypes, function(wt, name) {
        return {
          name: name,
          dateRanges: calculateDateRanges(wt.dateRange, wt.dateIntervals)
        };
      });
    }, // calculateWorkTypes

    accumulateWorkTypeDates: function(workTypes, workTypeName, range, intervals) {
      var wt = workTypes[workTypeName] || { dateRange: {}, dateIntervals: {} };
      if (range.plan) {
        wt.dateRange.plan = G.utils.extentDate(wt.dateRange.plan, range.plan);
        if (!wt.dateIntervals.plan) { wt.dateIntervals.plan = []; }
        if(intervals.plan)
          wt.dateIntervals.plan.push(intervals.plan.map(G.utils.cloneDates));
      }
      if (range.fact) {
        wt.dateRange.fact = G.utils.extentDate(wt.dateRange.fact, range.fact);
        if (!wt.dateIntervals.fact) { wt.dateIntervals.fact = []; }
        if(intervals.fact)
          wt.dateIntervals.fact.push(intervals.fact.map(G.utils.cloneDates));
      }
      workTypes[workTypeName] = wt;
    } // accumulateWorkTypeDates
  }); // ContractDatesWidgetView

  /**
   * Info block about resources
   */
  var SettingsWidgetView = InfoBlockWidgetView.extend({
    className: 'widget settings',
    templates: {
      'container': $('#settings-data-container').html(),
      'main': $('#settings-data').html(),
    },

    initialize: function() {
      InfoBlockWidgetView.prototype.initialize.apply(this, arguments);
      this.listenTo(G.appView.model, 'change', this.render);
    },

    render: function() {
      // оптимизация, которая не перерисовывает инфоблок если не выделялся другой объект
      if(this.lastNodeId==this.nodeId)
        return;
      this.lastNodeId = this.nodeId;

      this.$el.html(_.template(this.templates.container));

      var node = G.appView.model.getNodeById(this.nodeId);
      // prevent rendering of nodes that already out here
      if (!node) { return; }

      if (node.settings) {
        if(node.node_type === 'work'){
          this.showSettings(node);
        }
        else {
          if (node.have_different_settings)
            this.showDifferentSettingsMsg(node);
          else
            this.showSettings(node);
        }
      } else {
        this.showNoSettingsMsg();
      }
      if (!$.contains(this.$container[0], this.el))
        this.$container.append(this.$el);
    },

    /**
     * Render object settings
     */
    showSettings: function(node){
      this.$el.find(".data-body").html(_.template(this.templates.main, node.settings));
    },
    /**
     * If object have no settings, show no data message
     */
    showNoSettingsMsg: function(){
      this.$el.find(".data-body").html('<li class="empty">Ресурсы не заданы</li>');

    },
    /**
     * If object have different settings for children
     */
    showDifferentSettingsMsg: function(){
      this.$el.find(".data-body").html('<li class="empty">Разные (см. вложения)</li>');
    }
  });

  var PlanShiftWidgetView = InfoBlockWidgetView.extend({
    className: 'widget plan-shift',
    templates: {
      'move': $('#plan-shift-move-widget-template').html(),
      'resize': $('#plan-shift-resize-widget-template').html(),
      'all': $('#plan-shift-all-data').html(),
      'all_item': $('#plan-shift-all-item').html(),
      'group': $('#plan-shift-all-data-group').html()
    },
    events: {
      'click .lnk-show-all-shift-moves': 'showAllShiftMoves',
      'click .lnk-show-all-shift-resizes': 'showAllShiftMoves'
    },

    initialize: function() {
      InfoBlockWidgetView.prototype.initialize.apply(this, arguments);
      this.listenTo(G.appView.model, 'change', this.render);
    },

    render: function() {
      // оптимизация, которая не перерисовывает инфоблок если не выделялся другой объект
      if(this.lastNodeId==this.nodeId)
        return;
      this.lastNodeId = this.nodeId;

      var node = G.appView.model.getNodeById(this.nodeId);
      // prevent rendering of nodes that already out here
      if (!node) { return; }
      if (PlanShiftsHelper.hasPlanShifts(node) || WorkStatusHelper.hasStatus(node, 'on_hold') ||  WorkStatusHelper.hasStatus(node, 'on_pause') || WorkStatusHelper.hasStatus(node, 'on_work_with_reject')) {

        if(node.node_type === 'work')
          this.showAllShiftMoves();
        else
          this.showGroupShiftMoves();
          //this.renderPlanShifts(node);

      } else {
        this.$el.hide();
      }
      if (!$.contains(this.$container[0], this.el)) {
        this.$container.append(this.$el);
      }
    }, // render

    ///
    /// показать все переносы сроков для группы (участок, направление, заказ....)------------------------------------------------------------------------------
    ///
    showGroupShiftMoves: function(){

      var self = this;
      // получение текущего node по которому необходимо показать все переносы
      var node = G.appView.model.getNodeById(this.nodeId);
      // очистка текущего блока переносов
      this.clear();

      var result = {
        'all_count': 0,             // всего корректировок
        'last_date': null,        // дата последней корректировки
        'user_email': ''          // пользователь, сделавший последнюю корректировкку
      }

      var worksWithShifts = this.getWorksWithShifts(node);
      if(worksWithShifts){
        _.forEach(worksWithShifts, function(w) {
          result.all_count+=w['plan_shifts'].length;
          var lastShift = PlanShiftsHelper.getLastShiftInWork(w);
          if(!result.last_date || result.last_date<moment.utc(lastShift['date_change'], 'YYYY-MM-DD HH:mm:ss').local())
          {
            result.last_date = moment.utc(lastShift['date_change'], 'YYYY-MM-DD HH:mm:ss').local();
            result.user_email = lastShift['user_email'];
          }
        });
      }

      result.all_statuses = _.reduce(['on_hold','on_pause', 'on_work_with_reject'],function(count,key){return count+WorkStatusHelper.calculateWorksWithStatus(node, key)},0);

      // если были корректировки, то сообщаем об этом
      if(result.all_count>0 || result.all_statuses){// /*&& result.last_date*/ ){
        // отрисовка контейнера  отображения переносов
        this.$el.html(_.template(this.templates['group'], result));
        var data_body = this.$el.find('.data-body');
      }
    },


    //-----------------------------------------------------------------------------------------
    // показать все переносы сроков для конкретной работы
    showAllShiftMoves: function(){
      // локальная функция подготовки данных к выводу
      // old_start_date - предыдущая дата начала
      // old_finish_date - предыдущая дата окончания
      function prepare_data(old_date_start, old_date_finish, row)
      {
        var t_type={
          'start':'Перенос и изменение длительности',
          'finish':'Изменение длительности',
          'both':'Перенос без изменения длительности'
        };

        var result = {
          'date_str': null,                // дата корректировки (21 июня 2016 г., 13:06)
          'transfer_type': null,           // тип корректировки
          'note': '',                      // пояснение
          'reason': '',                    // причина корректировки
          'reason_nodes': null,            // уточнение причины корректировки
          'shift': 0,                      // количество дней
          'old_date_start': null,          // предыдущая дата начала
          'old_date_finish': null,         // предыдущая дата окончания
          'new_date_start': null,          // дата начала с учетом корректировки
          'new_date_finish': null,         // дата окончания с учетом корректировки
          'dates_note': '',                // (было: 30.06.2016-21.07.2016; стало: 30.06.2016-30.07.2016)
          'durations_note': '',            // Начало: 0 дн. Окончание: +38 дн.
          'user_email': '',
          'date_change': null,
          'type':'correction',              // тип - корректировка
          'shift_days': 0                   // разница дней между длительностью до переноса и после
        };

        result['date_change'] = row['date_change'];
        result['user_email'] = row['user_email'];
        result['date_str'] = moment.utc(row['date_change'], 'YYYY-MM-DD HH:mm:ss').local().format('DD.MM.YYYY HH:mm');
        result['transfer_type'] = t_type[row['type']];
        result["note"] = row['note'];
        result['reason'] = row['reason'];
        result['reason_nodes'] = 'reason_nodes' in row? row['reason_nodes'] : null;
        result['shift'] = row['shift'];
        result['old_date_start'] = old_date_start;
        result['old_date_finish'] = old_date_finish;
        result['new_date_start'] = moment(old_date_start);
        result['new_date_finish'] = moment(old_date_finish);

        // длительность в днях перед переносом
        var old_duration = old_date_finish.diff(old_date_start, 'days');
        var new_duration = 0;

        switch(row['type'])
        {
          case "start":
            // result['new_date_finish'] = old_date_finish;
            result['new_date_finish'].add(row['shift_finish'], 'days');
            result['new_date_start'].add(row['shift'], 'days');
            if(row['shift']>0)
            {
              result['transfer_type'] = "Сокращение длительности и перенос";
              result['durations_note'] = "Начало: +" + row['shift'].toString() + " дн. Окончание: "+ (row['shift_finish']>0?'+':'') + row['shift_finish'].toString()+"дн."
            }
            else
            {
              result['durations_note'] = "Начало: " + row['shift'].toString() + " дн. Окончание: "+ row['shift_finish'].toString()+"дн."
              result['transfer_type'] = "Увеличение длительности и перенос";
            }
          break;
          case "finish":
            result['new_date_start'] = old_date_start;
            result['new_date_finish'].add(row['shift'], 'days');
            if(row['shift']<0){
              result['transfer_type'] = "Сокращение длительности";
              result['durations_note'] = "Начало: 0 дн. Окончание: "+row['shift'].toString()+" дн."
            }
            else{
              result['transfer_type'] = "Увеличение длительности";
              result['durations_note'] = "Начало: 0 дн. Окончание: +"+row['shift'].toString()+" дн."
            }
          break;
          case "both":
            result['new_date_start'].add(row['shift'], 'days');
            result['new_date_finish'].add(row['shift'], 'days');
            if(row['shift']>0)
              result['durations_note'] = "Начало: +" + row['shift'].toString() + " дн. Окончание: +"+row['shift'].toString()+" дн."
            else
              result['durations_note'] = "Начало: " + row['shift'].toString() + " дн. Окончание: "+row['shift'].toString()+" дн."
          break;
          default:
            result['new_date_start'] = old_date_start;
            result['new_date_finish'] = old_date_finish;
            result['durations_note'] = "Начало: 0 дн. Окончание: 0 дн."
          break;
        }

        // подсчитываем новую длительность и фиксируем в результате разницу
        // между новой и старой длительностью
        if(row['type']=='both')
          result['shift_days'] = row['shift'];
        else
        {
          new_duration = result['new_date_finish'].diff(result['new_date_start'], 'days');
          result['shift_days'] = new_duration - old_duration;
        }

        result['dates_note'] = "- было: " + old_date_start.format('DD.MM.YYYY') + '-' + old_date_finish.format('DD.MM.YYYY') + ';<br/>- стало: ' + result['new_date_start'].format('DD.MM.YYYY') + '-' + result['new_date_finish'].format('DD.MM.YYYY');
        return result;
      }

      var self = this;
      // очистка текущего блока переносов
      this.clear();
      // отрисовка контейнера  отображения переносов
      this.$el.html(_.template(this.templates['all']));
      var data_body = this.$el.find('.data-body');
      // получение текущего node по которому необходимо показать все переносы
      var node = G.appView.model.getNodeById(this.nodeId);
      var tmp_result = [];

      if(PlanShiftsHelper.hasPlanShifts(node)){

        node.plan_shifts.sort(function(a, b) {return moment.utc(a['date_change'], 'YYYY-MM-DD HH:mm:ss.ms').local() - moment.utc(b['date_change'], 'YYYY-MM-DD HH:mm:ss.ms').local()});

        // проходим по всем переносам и отображаем их в порядке добавления
        var prev_date_start = moment(node.plan_before_shift.start, 'YYYY-MM-DD').local();
        var prev_date_finish = moment(node.plan_before_shift.finish, 'YYYY-MM-DD').local();
        _.forEach(node.plan_shifts, function(row) {
          var new_row = prepare_data(prev_date_start, prev_date_finish, row);
          prev_date_start = new_row["new_date_start"];
          prev_date_finish = new_row["new_date_finish"];
          tmp_result.push(new_row);
        });
      }

      /*** #1628 инфо-панель - включить отклонения по факту в общий стек корректировок
      *** добавлено 28.09.2017 by Alexey
      ***/
      var statuses_count = 0;
      ['on_pause', 'on_hold', 'on_work_with_reject']
          .forEach(function(key) {
            _.forEach(WorkStatusHelper.getWorksWithStatus(node, key),function(item){
              item['type']="status";
              item['date_str'] = moment.utc(item['date_change'], 'YYYY-MM-DD HH:mm:ss').local().format('DD.MM.YYYY HH:mm');
              item['date_status_str'] = moment.utc(item['date'], 'YYYY-MM-DD HH:mm:ss').local().format('DD.MM.YYYY');
              tmp_result.push(item);
              ++statuses_count;
            });
          });
      /*** end #1628 ***/
      //if(node.plan_shifts)
      this.$el.find('.lbl-total-shifts').html('Всего: ' + (node.plan_shifts?node.plan_shifts.length.toString():'0')+((statuses_count>0)?('<br/>Отклонений: '+statuses_count):''));
      // sort plan shifts by date_change
      tmp_result.sort(function(a, b) {return moment.utc(b['date_change'], 'YYYY-MM-DD HH:mm:ss.ms').local() - moment.utc(a['date_change'], 'YYYY-MM-DD HH:mm:ss.ms').local()});
      for(var i in tmp_result)
        data_body.append(_.template(self.templates['all_item'], tmp_result[i]));
    },

    renderPlanShifts: function(node) {
      var delta = _.chain(['start', 'finish']).zipObject()
          .mapValues(function(d, key) {
            return Math.round((node.dateRange.plan[key] - node.dateRange.plan_before_last_shift[key]) / 1000 / 60 / 60 / 24);
          })
          .value();
      var data, templateType;
      if (delta.start === delta.finish) {
        templateType = 'move';
        data = this.getDataForMoveTemplate(node);
        data.delta = delta.start;
      } else {
        templateType = 'resize';
        data = this.getDataForResizeTemplate(node);
        data.delta = delta;
      }

      if (node.node_type === 'work') {
        data.total = node.plan_shifts.length;
      } else {
        data.total = void 0;
      }
      data.pluralForm = G.utils.pluralForm;
      this.$el.html(_.template(this.templates[templateType], data)).show();
    },

    getDataForMoveTemplate: function(node) {
      var data = {};
      var sharedShift = this.getSharedShift(node);
      if (sharedShift) {
        data.reason = sharedShift.reason;
        data.reason_nodes = sharedShift.reason_nodes;
        data.note = sharedShift.note;
        data.last_shift_date = sharedShift.date_change;
        data.inside = void 0;
      } else {
        data.last_shift_date = void 0;
        data.inside = this.getWorksWithShifts(node).length;
      }
      return data;
    }, // getDataForMoveTemplate


    getDataForResizeTemplate: function(node) {
      var self = this;
      var data = {};
      var shifts = {};
      var sharedShift = this.getSharedShift(node);
      if (sharedShift) {
        shifts[sharedShift.type] = {
          reason: sharedShift.reason,
          reason_nodes: sharedShift.reason_nodes,
          note: sharedShift.note,
          delta: sharedShift.shift,
          last_shift_date: sharedShift.date_change
        };
        data.inside = void 0;
      }

      ['start', 'finish'].forEach(function(key) {
        var before = node.dateRange.plan_before_last_shift[key],
          after =  node.dateRange.plan[key];
        if (+before !== +after) {
          if (!shifts[key]) {
            if (node.node_type === "work") {
              var info = G.appView.model.getInfoPlanShift(node, key).planShift;
              shifts[key] = {
                reason: info.reason,
                reason_nodes: info.reason_nodes,
                note: info.note,
                last_shift_date: info.date_change
              };
            } else {
              shifts[key] = {
                inside: self.getWorksWithShifts(node).length
              };
            }
          }
          shifts[key].before = before;
          shifts[key].after = after;
        }
      });
      data.shifts = _.map(shifts, function(d, key) { d.key = key; return d; });
      return data;
    }, // getDataForResizeTemplate

    getSharedShift: function(node) {
      var self = this;
      var worksWithPlans = _.filter(this.getWorksInsideNode(node), function(w) { return w.plan; });
      var worksWithShifts = this.getWorksWithShifts(node);
      var sharedShift = null;

      if (worksWithPlans.length === worksWithShifts.length) {
        // если внутри все работы с переносами, то смотрим не совпадают
        // ли у них эти переносы
        //
        _.forEach(worksWithShifts, function(w) {
          var lastShift = PlanShiftsHelper.getLastShiftInWork(w);
          if (!sharedShift) {
            sharedShift = lastShift;
          }
          if (!self.equalShifts(sharedShift, lastShift) ||
            (lastShift.type !== 'both' &&
              _.any(w.plan_shifts, function(ps) { return ps.type !== lastShift.type; })
            )
          ) {
            sharedShift = null;
            return false;
          }
        });
      }
      return sharedShift;
    }, // getSharedShift


    getWorksInsideNode: function(node) {
      var works = [],
        recurse = function(n) {
          if (n.node_type === 'work') {
            works.push(n);
          } else {
            _.forEach(n.nodes, recurse);
          }
        };
      recurse(node);
      return works;
    }, // getWorksInsideNode

    getWorksWithShifts: function(node) {
      var totalWorks = this.getWorksInsideNode(node);
      var worksWithShifts = _.filter(totalWorks, function(work) {
          return work.plan_shifts && work.plan_shifts.length;
        });
      return worksWithShifts;
    }, // getWorksWithShifts

    equalShifts: function(s1, s2) {
      return s1.type === s2.type &&
        s1.reason === s2.reason &&
        s1.note === s2.note &&
        s1.shift === s2.shift;
    },

    clear: function(){
      this.$el.empty();
    },

    dummy: void 0

  }); // PlanShiftWidgetView




  var StatusesWidgetView = InfoBlockWidgetView.extend({
    className: 'widget statuses',
    template: $('#statuses-widget-template').html(),
    sub_templates: {
      'no_data': $('#statuses-nodata-widget-template').html(),
      'on_hold': $('#statuses-onhold-onpause-widget-template').html(),
      'on_pause': $('#statuses-onhold-onpause-widget-template').html(),
      'on_work_with_reject': $('#statuses-onhold-onpause-widget-template').html()
    },

    initialize: function() {
      InfoBlockWidgetView.prototype.initialize.apply(this, arguments);
      this.today = d3.time.day(new Date());
      this.listenTo(G.appView.model, 'change', this.render);
      this.listenTo(G.events, 'highlight:day', this.onDayChange);
    },

    render: function() {
      // reload node in every render because it could be removed by filters
      this.node = G.appView.model.getNodeById(this.nodeId);
      var date = this.getCurrentDate(),
        byDateStatuses = this.collectStatusesByDate(G.appView.dayHighlightView.theDay),
        totalStatuses = this.collectStatusesTotal();

      if (totalStatuses.length) {
        this.$el.html(_.template(this.template, {
          date: date,
          totalStatuses: totalStatuses,
          byDateStatuses: byDateStatuses,
          pluralForm: G.utils.pluralForm
        })).show();
        this.renderSubViews(byDateStatuses);
      } else {
        this.$el.hide();
      }
      if (!$.contains(this.$container[0], this.el)) {
        this.$container.append(this.$el);
      }
    }, // render

    renderSubViews: function(statuses) {
      var self = this,
        html = "";
      statuses.forEach(function(status_) {
        html += _.template(self.sub_templates[status_.key], {
          key: status_.key,
          info: status_.info,
          pluralForm: G.utils.pluralForm
        });
      });
      this.$el.find('.statuses-container').append(html);
    },

    collectStatusesByDate: function(date) {
      if (this.node) {
        var self = this;
        return ['on_pause', 'on_hold','no_data', 'on_work_with_reject']
          .map(function(key) {
            return {
              key: key,
              info: WorkStatusHelper.getInfoAboutStatus(
                self.node, date, key)
            };
          })
          .filter(function(status_) { return status_.info; });
      }
      return [];
    }, // collectStatusesByDate

    collectStatusesTotal: function() {
      if (this.node) {
        var self = this;
        return ['on_pause', 'on_hold','no_data', 'on_work_with_reject']
          .map(function(key) {
            return {
              key: key,
              count: WorkStatusHelper.calculateWorksWithStatus(self.node, key)
            };
          })
          .filter(function(status_) { return status_.count; });
      }
      return [];
    }, // collectStatusesTotal

    onDayChange: function() {
      this.render();
    },

    getCurrentDate: function() {
      return G.appView.dayHighlightView.theDay;
    },
    dummy: void 0
  }); // StatusesWidgetView


  var MaterialsWidgetView = InfoBlockWidgetView.extend({
    className: 'widget materials',
    template: $('#materials-widget-template').html(),

    initialize: function() {
      InfoBlockWidgetView.prototype.initialize.apply(this, arguments);

      this.materialsModel = new MaterialsModel({nodeId: this.nodeId});
      this.listenTo(this.materialsModel, 'change', this.render);
    },

    render: function() {
      if (this.materialsModel.hasMaterials) {
        this.$el.html(_.template(this.template, {
          materials: this.materialsModel.get('materials')
        }));
        this.$container.append(this.$el);
      }
    } // render
  }); // Widget_Materials


  var TeamleadsWidgetView = InfoBlockWidgetView.extend({
    className: 'widget teamleads',
    template: $('#teamleads-widget-template').html(),

    initialize: function() {
      InfoBlockWidgetView.prototype.initialize.apply(this, arguments);
      var node = G.appView.model.getNodeById(this.nodeId);
      this.teamleads = node && node.teamleads;
    },

    render: function() {
      if (this.teamleads) {
        this.$el.html(_.template(this.template, {
          teamleads: this.teamleads
        }));
        this.$container.append(this.$el);
      }
    } // render
  }); // Widget_Teamleads


  // template widget
  // var WidgetView = InfoBlockWidgetView.extend({
  //     className: 'widget dummy',
  //     template: $('#dummy-widget-template').html(),

  //     initialize: function() {
  //         InfoBlockWidgetView.prototype.initialize.apply(this, arguments);
  //         this.listenTo(G.appView.model, 'change', this.render);
  //     },
  //     render: function() {
  //         this.$el.html(_.template(this.template, {
  //             dummy: ''
  //         }));
  //         if (!$.contains(this.$container[0], this.el)) {
  //             this.$container.append(this.$el);
  //         }
  //     } // render
  // }); // WidgetView


  var widgetClasses = [
    DatesWidgetView,
    ContractDatesWidgetView,
    SettingsWidgetView,
    PlanShiftWidgetView,
//        StatusesWidgetView,
    MaterialsWidgetView,
    TeamleadsWidgetView
  ];


  // ----------------------------------------
  // -------------- UTILS -------------------
  // ----------------------------------------

  // input:
  //  range = {
  //      plan: { start: <date>, finish: <date> },
  //      fact: { start: <date>, finish: <date> },
  //  }
  //  intervals = {
  //      plan: [ {start: <date>, finish: <date> }, {}, ... ],
  //      fact: [ {start: <date>, finish: <date> }, {}, ... ],
  //  }
  // returns dateranges in the array format:
  // [ plan, fact ]
  // plan or fact = {
  //       key: 'plan' or 'fact',
  //       dates: [start, finish],
  //       duration: <int>,
  //       productiveDays: <int>,
  //       unproductiveDays: <int>
  //  }
  function calculateDateRanges(range, intervals) {
    var dateRanges = [];
    ['plan', 'contract_plan', 'fact'].forEach(function(key) {
      if(range[key]){
        var planOrFact = range[key],
        obj = { key: key };
        if (planOrFact) {
          obj.dates = [ planOrFact.start ];
          if (+planOrFact.start !== +planOrFact.finish) {
            obj.dates.push(planOrFact.finish);
          }
          var duration = Math.round(1 + (planOrFact.finish - planOrFact.start) / 1000 / 60 / 60 / 24);
          var productiveDays = _.reduce(intervals[key], function(sum, interval) {
            return sum + Math.round(1 + (interval.finish - interval.start) / 1000 / 60 / 60 / 24);
          }, 0);
          obj.duration = duration;
          obj.productiveDays = productiveDays;
          obj.unproductiveDays = duration - productiveDays;
        }
        dateRanges.push(obj);
      }
    });
    return dateRanges;
  }


  return InfoBlockWidgets;
});
