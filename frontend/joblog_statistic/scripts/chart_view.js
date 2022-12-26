/**
 * Табличное представление данных
 */
App.Views.DataChartView = Backbone.View.extend({
  initialize: function(){
    // prepare data
    //
    // render data
    this.render();
  },
  render: function () {
    var self = this;
    // wait for the google library activation
    var tm = setInterval(function(){
      if(App.isGoogleChartsLibraryLoaded)
      {
        clearInterval(tm);
        self.drawChart(self.prepareData(self.collection));
      }
    },100);
  },
  prepareData: function(data){
    if(!data || data.length<1)
      return null;
    var g_data = {}; // order / date / summ of proportion
    var all_dates = {};
    var all_orders = {};
    for(var i in data)
    {
      all_dates[moment(data[i]['wp_fact_date']).format('DD.MM.YYYY')] = new Date(data[i]['wp_fact_date']);
      all_orders[data[i]['order']] = data[i]['order'];
    }

    if(data && data.length > 0){
      for(var i in data){
        var row = data[i];

        if(!(row['order'] in g_data))
        {
            g_data[row['order']] = {'order': row['order'], 'items': {}};
            for(var date in all_dates)
              g_data[row['order']]['items'][date] = { date: date, value: null };
        }
        for(var j in row['wp_workers']){
          var w_row = row['wp_workers'][j];
          var g_data_row = g_data[row['order']]['items'][moment(row['wp_fact_date']).format('DD.MM.YYYY')];
          if(g_data_row['value']==null)
            g_data_row['value'] = w_row['proportion'];
          else
            g_data_row['value'] += w_row['proportion'];
        }
      }

      var all_dates_arr = [];
      for(var i in all_dates)
        all_dates_arr.push(all_dates[i]);
      all_dates_arr = all_dates_arr.sort(function(a,b){
        if(a<b) return -1;
        if(a>b) return 1;
        return 0;
      });

      var all_orders_arr = [];
      for(var i in all_orders)
        all_orders_arr.push(all_orders[i]);
      all_orders_arr = all_orders_arr.sort(function(a,b){
        if(a<b) return -1;
        if(a>b) return 1;
        return 0;
      });

      return { dates: all_dates_arr, orders: all_orders_arr, data: g_data };
    }
    return null;
  },
  drawChart:function(data){
    if(!data)
      return;

    var google_data = new google.visualization.DataTable();
    google_data.addColumn('date', 'Дата');

    // make header
    for(var i in data['orders']){
      google_data.addColumn('number', 'Заказ:' + data['orders'][i]);
      google_data.addColumn({type: 'number', role:'annotation'});
    }

    var rows = [];
    for(var i in data['dates']){
      var row = [];
      var date = moment(data['dates'][i]).format('DD.MM.YYYY')
      row.push(data['dates'][i]);


      for(var j in data['orders'])
      {
        row.push(data['data'][data['orders'][j]]['items'][date]['value']);
        row.push(data['data'][data['orders'][j]]['items'][date]['value']);
      }
      rows.push(row);
    }
    google_data.addRows(rows);

    var classicOptions = {
      title: 'Диаграмма - Дата / Заказ',
      subtitle: '',
      width: 1200,
      height: 600,
      pointSize: 2,
      series: {
        //0: {targetAxisIndex: 0},
        //1: {targetAxisIndex: 1}
      },
      vAxes: {
        // Adds titles to each axis.
        //0: {title: 'Temps (Celsius)'},
        //1: {title: 'Daylight'}
      },
      hAxis: {
        title: 'Дата'
        /*ticks: [new Date(2014, 0), new Date(2014, 1), new Date(2014, 2), new Date(2014, 3),
                new Date(2014, 4),  new Date(2014, 5), new Date(2014, 6), new Date(2014, 7),
                new Date(2014, 8), new Date(2014, 9), new Date(2014, 10), new Date(2014, 11)
               ]*/
      },
      vAxis: {
        title: 'часы'
        /*viewWindow: {
          max: 30
        }*/
      },
      // backgroundColor: '#f1f8e9',
      // legend: { position: 'bottom' }
    };

    var classicChart = new google.visualization.LineChart(this.el);
    classicChart.draw(google_data, classicOptions);

  },
  hide: function(){
    this.$el.hide();
  },
  show: function(){
    this.$el.show();
  },
  clear: function()
  {
    this.$el.empty();
  }
});
