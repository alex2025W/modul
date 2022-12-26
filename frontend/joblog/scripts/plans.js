///---------------------------------------------------------------------------------------------------------
/// представление календаряпланов
///---------------------------------------------------------------------------------------------------------
App.Views.PlansView = Backbone.View.extend({
  templates: {
    calendarGrid: _.template($("#CalendarGridTemplate").html()),
  },
  events:{

  },
  initialize:function(){
    this.render();
  },
  render:function(){
    this.renderCalendarGrid();
    return this;
  },
  /**
   * Draw calendar grid with defined dates and plan works
   */
  renderCalendarGrid: function(){
    this.$el.html(this.templates.calendarGrid(this.prepareCalendarGridData()));
  },
  prepareCalendarGridData: function(){
    var model = {
      dates: {},
      works: this.model['workorder']['plan_work'],
      'ktu': {},
      datesGroupedByMonths: [],
      monthNames: ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"],
    };

    // prepare dates
    var datesList = Routine.enumerateDaysBetweenDates(
      this.model['workorder']['min_start_date'],
      this.model['workorder']['max_finish_date']
    );
    // Get months and years
    var datesGroupedByMonths = {};
    for(var i in datesList)
    {
      var key = datesList[i].format('MM') + '_' + datesList[i].format('YYYY')
      if(!(key in datesGroupedByMonths))
        datesGroupedByMonths[key] = {
          month: datesList[i].month(),
          year: datesList[i].year(),
          title: model.monthNames[datesList[i].format('MM')-1] + ' ('+ datesList[i].format('YYYY') + ')',
          count: 1
        };
      else
        datesGroupedByMonths[key]['count']++;
    }
    var datesGroupedByMonthsList = [];
    for(var i in datesGroupedByMonths)
      datesGroupedByMonthsList.push(datesGroupedByMonths[i]);
    datesGroupedByMonthsList.sort(function(a,b){
      if(a.year == b.year)
        return (a.month < b.month) ? -1 : (a.month > b.month) ? 1 : 0;
      else
       return (a.year < b.year) ? -1 : 1;
    });

    // get KTU
    var ktu = {};
    for( var i in this.model['workers_history']){
      var tmp = this.model['workers_history'][i];
      if(!(moment(tmp['fact_date']).format('YYYY_MM_DD') in ktu))
        ktu[moment(tmp['fact_date']).format('YYYY_MM_DD')] = 0
      ktu[moment(tmp['fact_date']).format('YYYY_MM_DD')]+=tmp['workers'].length;
    }
    model['ktu'] = ktu;
    model['dates'] = datesList;
    model['datesGroupedByMonths'] = datesGroupedByMonthsList;
    return model;
  }
});
