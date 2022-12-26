var App = {
  Models: {},
  Views:{},
  Collections:{},
  Route:null,
  FindView: null,

  /**
   *  Инициализация необходимых объектов
  **/
  initialize: function()
  {
    this.FindView = new App.Views.FindView();
    this.Route = new AppRouter();
    Backbone.history.start();
  }
};

///
/// Подключение роутеров
///
var AppRouter = Backbone.Router.extend({
  routes: {
    "": "index",
    ":url": "index"
  },
  index:function(url){
      App.FindView.search(url);
  }
});

///
/// Модель элемента
///
App.Models.ItemModel = Backbone.Model.extend({});

///
/// Коллекция элементов
///
App.Collections.ItemsCollection =Backbone.Collection.extend({
    model: App.Models.ItemModel
});

///
/// Контрол управления поиском на форме
///
App.Views.FindView = Backbone.View.extend({
  el: $("#pnlBriefFilter"),

  templates: {
    item_templateSector:_.template($("#filterItemTemplateSector").html()),
    item_templateOrder:_.template($("#filterItemTemplateOrder").html()),
    item_templateReason:_.template($("#filterItemTemplateReason").html()),
  },
  selDate: "",  // текущая выбранная дата
  briefView:null,
  data: null, // коллекция данных
  selectedSectors:[], // список выбранных участков
  selectedOrders:[], // список выбранных заказов
  selectedStatuses:[], // список выбранных статсусов отклонений
  selectedSectorTypes:[], // список выбранных типов участков
  selectedReasons:[], // список выбранных причин отклонений
  itemView: null,
  events:{
    'click #btnBriefFind': 'OnSearch',
    'click .btn-collapse': 'OnCollapse',
    'click .btn-view-style': 'OnChangeViewStyle'
  },

  /**
   * Смена стиля отображения данных
  **/
  OnChangeViewStyle: function(e)
  {
    var self = this;
    if($(e.currentTarget).hasClass('active')==false)
    {
      self.$('.btn-view-style').removeClass('active');
      $(e.currentTarget).addClass('active');

      var filtered_data = self.prepareData(self.selDate, self.data, self.selectedSectors, self.selectedOrders, self.selectedStatuses,self.selectedSectorTypes, self.selectedReasons);
      self.briefView.render(self.selDate, filtered_data, self.$('.btn-collapse').val()!="collapsed", self.$('.btn-view-style.active').val() );
    }
  },

  /**
   * Получение URL
  **/
  getUrl: function()
  {
     var url = "";
     //encodeURIComponent(

     // получение даты
     // url +=this.selDate.format("dd/mm/yyyy");
     url +=this.selDate.split('/').join('_');
     // получение участков
     if(this.selectedSectors.length>0)
    url += "&sectors["+ this.selectedSectors.join(",") + "]";
    // получение заказов
     if(this.selectedOrders.length>0)
    url += "&orders["+ this.selectedOrders.join(",") + "]";
    // получение статусов отклонений
     if(this.selectedStatuses.length>0)
    url += "&statuses["+ this.selectedStatuses.join(",") + "]";
    // получение типов участков
     if(this.selectedSectorTypes.length>0)
    url += "&sectortypes["+ this.selectedSectorTypes.join(",") + "]";
    // получение причин отклонений
     if(this.selectedReasons.length>0)
    url += "&reasons["+ this.selectedReasons.join(",") + "]";
    //console.log(url);
    //console.log(encodeURIComponent(url));
    //console.log(decodeURIComponent(url));
    return url.split(' ').join('%20');
  },

  /**
   *  Инициализация
  **/
  initialize: function(users){
    var self = this;
    this.briefView = new App.Views.BriefView();
    // подключение календаря
    //this.$('.date-picker input').val(new Date().format("dd/mm/yyyy"));
    this.$('.date-picker').datepicker({
      weekStart:1,
      format: "dd/mm/yyyy",
      weekStart: 1,
      autoclose: true,
      todayHighlight: false,
      defaultDate: new Date()
    }).on('changeDate', function(ev){
      App.Route.navigate("/"+ev.date.format("dd/mm/yyyy").split('/').join('_'), true);
    });
    // подключение мультиселекта на участки
    this.$('.ddl-sectors').multiselect({
        buttonContainer: '<span class="dropdown" />',
        includeSelectAllOption: true,
        enableCaseInsensitiveFiltering: true,
        numberDisplayed: 4,
        filterPlaceholder: 'Найти',
        nonSelectedText: "Участки",
        nSelectedText: "Участков выбрано: ",
        selectAllText: "Все",
        maxHeight: 400,
         buttonText: function(options) {
            if (options.length === 0) {
              return 'Участки <b class="caret"></b>';
            }
            else if (options.length > this.numberDisplayed) {
                return this.nSelectedText+options.length + ' ' +  ' <b class="caret"></b>';
            }
            else {
              var selected = 'Участки: ';
              options.each(function() {
                selected += $(this).val() + ', ';
              });
              return selected.substr(0, selected.length -2) + ' <b class="caret"></b>';
            }
          },
          onChange: function(element, checked) {
              if(checked === true)
              {
                if(element.val()=='multiselect-all')
                {
                  self.selectedSectors = [];
                  // take only visible elems
                   $(self.el).find('.ddl-sectors' ).next().find('input:visible').each(function(){
                    //visibleElems[$(this).val()] = $(this).val();
                    if($(this).val()!="" && $(this).val()!='multiselect-all' && !$(this).prop('disabled'));
                      self.selectedSectors.push($(this).val());
                   });
                }
                else
                  self.selectedSectors.push(element.val());
              }
              else
              {
                if(element.val()=='multiselect-all')
                {
                  self.selectedSectors = [];
                }
                else
                {
                  if(self.selectedSectors.indexOf(element.val())>-1)
                    self.selectedSectors.splice(self.selectedSectors.indexOf(element.val()),1);
                }
              }

              // получение текущего url
               App.Route.navigate("/"+self.getUrl(), false);

              var filtered_data = self.prepareData(self.selDate, self.data, self.selectedSectors, self.selectedOrders, self.selectedStatuses,self.selectedSectorTypes, self.selectedReasons);
              self.briefView.render(self.selDate, filtered_data, self.$('.btn-collapse').val()!="collapsed", self.$('.btn-view-style.active').val());
          }
      });
      // подключение мультиселекта на заказы
      this.$('.ddl-orders').multiselect({
        buttonContainer: '<span class="dropdown" />',
        includeSelectAllOption: true,
        enableCaseInsensitiveFiltering: true,
        numberDisplayed: 4,
        filterPlaceholder: 'Найти',
        nonSelectedText: "Заказы",
        nSelectedText: "Заказов выбрано: ",
        selectAllText: "Все",
        maxHeight: 400,
         buttonText: function(options) {
            if (options.length === 0) {
              return 'Заказы <b class="caret"></b>';
            }
            else if (options.length > this.numberDisplayed) {
                return this.nSelectedText+options.length + ' ' +  ' <b class="caret"></b>';
            }
            else {
              var selected = 'Заказы: ';
              options.each(function() {
                selected += $(this).val() + ', ';
              });
              return selected.substr(0, selected.length -2) + ' <b class="caret"></b>';
            }
          },
          onChange: function(element, checked) {
              if(checked === true)
              {
                if(element.val()=='multiselect-all')
                {
                  self.selectedSectors = [];
                  // take only visible elems
                   $(self.el).find('.ddl-orders' ).next().find('input:visible').each(function(){
                    //visibleElems[$(this).val()] = $(this).val();
                    if($(this).val()!="" && $(this).val()!='multiselect-all' && !$(this).prop('disabled'));
                      self.selectedOrders.push($(this).val());
                   });
                }
                else
                  self.selectedOrders.push(element.val());
              }
              else
              {
                if(element.val()=='multiselect-all')
                {
                  self.selectedOrders = [];
                }
                else
                {
                  if(self.selectedOrders.indexOf(element.val())>-1)
                    self.selectedOrders.splice(self.selectedOrders.indexOf(element.val()),1);
                }
              }
              // получение текущего url
               App.Route.navigate("/"+self.getUrl(), false);
              var filtered_data = self.prepareData(self.selDate, self.data, self.selectedSectors, self.selectedOrders, self.selectedStatuses,self.selectedSectorTypes, self.selectedReasons);
              self.briefView.render(self.selDate, filtered_data, self.$('.btn-collapse').val()!="collapsed", self.$('.btn-view-style.active').val());
          }
      });
      // подключение мультиселекта на типы отклонений
      this.$('.ddl-statuses').multiselect({
        buttonContainer: '<span class="dropdown" />',
        includeSelectAllOption: true,
        enableCaseInsensitiveFiltering: true,
        numberDisplayed: 4,
        filterPlaceholder: 'Найти',
        nonSelectedText: "Статусы работ",
        nSelectedText: "Статусов выбрано: ",
        selectAllText: "Все",
        maxHeight: 400,
         buttonText: function(options) {
            if (options.length === 0) {
              return 'Статусы работ <b class="caret"></b>';
            }
            else if (options.length > this.numberDisplayed) {
                return this.nSelectedText+options.length + ' ' +  ' <b class="caret"></b>';
            }
            else {
              var selected = 'Статусы: ';
              options.each(function() {
                selected += $(this).text() + ', ';
              });
              return selected.substr(0, selected.length -2) + ' <b class="caret"></b>';
            }
          },
          onChange: function(element, checked) {
            if(checked === true)
            {
              if(element.val()=='multiselect-all')
              {
                self.selectedStatuses = [];
                // take only visible elems
                 $(self.el).find('.ddl-statuses' ).next().find('input:visible').each(function(){
                  //visibleElems[$(this).val()] = $(this).val();
                  if($(this).val()!="" && $(this).val()!='multiselect-all' && !$(this).prop('disabled'));
                    self.selectedStatuses.push($(this).val());
                 });
              }
              else
                self.selectedStatuses.push(element.val());

              if(self.selectedStatuses.indexOf('')>-1 && self.selectedStatuses.indexOf('on_work')==-1)
                self.selectedStatuses.push('on_work');
            }
            else
            {
              if(element.val()=='multiselect-all')
              {
                self.selectedStatuses = [];
              }
              else
              {
                if(self.selectedStatuses.indexOf(element.val())>-1)
                  self.selectedStatuses.splice(self.selectedStatuses.indexOf(element.val()),1);
              }

              if(self.selectedStatuses.indexOf('')==-1 && self.selectedStatuses.indexOf('on_work')>-1)
                self.selectedStatuses.splice(self.selectedStatuses.indexOf('on_work'),1);
            }

            // получение текущего url
            App.Route.navigate("/"+self.getUrl(), false);

            var filtered_data = self.prepareData(self.selDate, self.data, self.selectedSectors, self.selectedOrders, self.selectedStatuses,self.selectedSectorTypes, self.selectedReasons);
            self.briefView.render(self.selDate, filtered_data, self.$('.btn-collapse').val()!="collapsed", self.$('.btn-view-style.active').val());
          }
      });

      // подключение мультиселекта на виды участков
      this.$('.ddl-sector-types').multiselect({
        buttonContainer: '<span class="dropdown" />',
        includeSelectAllOption: true,
        enableCaseInsensitiveFiltering: true,
        numberDisplayed: 4,
        filterPlaceholder: 'Найти',
        nonSelectedText: "Направления работ",
        nSelectedText: "Направлений выбрано: ",
        selectAllText: "Все",
        maxHeight: 400,
         buttonText: function(options) {
            if (options.length === 0) {
              return 'Направления работ <b class="caret"></b>';
            }
            else if (options.length > this.numberDisplayed) {
                return this.nSelectedText+options.length + ' ' +  ' <b class="caret"></b>';
            }
            else {
              var selected = 'Виды: ';
              options.each(function() {
                selected += $(this).val() + ', ';
              });
              return selected.substr(0, selected.length -2) + ' <b class="caret"></b>';
            }
          },
          onChange: function(element, checked) {
              if(checked === true)
              {
                if(element.val()=='multiselect-all')
                {
                  self.selectedSectorTypes = [];
                  // take only visible elems
                   $(self.el).find('.ddl-sector-types' ).next().find('input:visible').each(function(){
                    //visibleElems[$(this).val()] = $(this).val();
                    if($(this).val()!="" && $(this).val()!='multiselect-all' && !$(this).prop('disabled'));
                      self.selectedSectorTypes.push($(this).val());
                   });
                }
                else
                  self.selectedSectorTypes.push(element.val());
              }
              else
              {
                if(element.val()=='multiselect-all')
                {
                  self.selectedSectorTypes = [];
                }
                else
                {
                  if(self.selectedSectorTypes.indexOf(element.val())>-1)
                    self.selectedSectorTypes.splice(self.selectedSectorTypes.indexOf(element.val()),1);
                }
              }

              // получение текущего url
               App.Route.navigate("/"+self.getUrl(), false);

              var filtered_data = self.prepareData(self.selDate, self.data, self.selectedSectors, self.selectedOrders, self.selectedStatuses,self.selectedSectorTypes, self.selectedReasons);
              self.briefView.render(self.selDate, filtered_data, self.$('.btn-collapse').val()!="collapsed", self.$('.btn-view-style.active').val());
          }
      });
      // подключение мультиселекта на причины отклонений
      this.$('.ddl-reasons').multiselect({
        buttonContainer: '<span class="dropdown" />',
        includeSelectAllOption: true,
        enableCaseInsensitiveFiltering: true,
        numberDisplayed: 2,
        filterPlaceholder: 'Найти',
        nonSelectedText: "Причины",
        nSelectedText: "Причин выбрано: ",
        selectAllText: "Все",
        maxHeight: 400,
         buttonText: function(options) {
            if (options.length === 0) {
              return 'Причины <b class="caret"></b>';
            }
            else if (options.length > this.numberDisplayed) {
                return this.nSelectedText+options.length + ' ' +  ' <b class="caret"></b>';
            }
            else {
              var selected = 'Причины: ';
              options.each(function() {
                selected += $(this).val() + ', ';
              });
              return selected.substr(0, selected.length -2) + ' <b class="caret"></b>';
            }
          },
          onChange: function(element, checked) {
              if(checked === true)
              {
                if(element.val()=='multiselect-all')
                {
                  self.selectedReasons = [];
                  // take only visible elems
                   $(self.el).find('.ddl-reasons' ).next().find('input:visible').each(function(){
                    //visibleElems[$(this).val()] = $(this).val();
                    if($(this).val()!="" && $(this).val()!='multiselect-all' && !$(this).prop('disabled'));
                      self.selectedReasons.push($(this).val());
                   });
                }
                else
                  self.selectedReasons.push(element.val());
              }
              else
              {
                if(element.val()=='multiselect-all')
                {
                  self.selectedReasons = [];
                }
                else
                {
                  if(self.selectedReasons.indexOf(element.val())>-1)
                    self.selectedReasons.splice(self.selectedReasons.indexOf(element.val()),1);
                }
              }

              // получение текущего url
               App.Route.navigate("/"+self.getUrl(), false);

              var filtered_data = self.prepareData(self.selDate, self.data, self.selectedSectors, self.selectedOrders, self.selectedStatuses,self.selectedSectorTypes, self.selectedReasons);
              self.briefView.render(self.selDate, filtered_data, self.$('.btn-collapse').val()!="collapsed", self.$('.btn-view-style.active').val());
          }
      });
  },

  /**
   *  Установление даты в календаре
  **/
  setDate: function(sel_date)
  {
       // проверка введенной даты
    if(!sel_date || sel_date=="")
      return;
    if(!Routine.isValidDate(sel_date))
    {
       $.jGrowl('Задана неверная дата.', { 'themeState':'growl-error', 'sticky':false });
       return;
    }
     this.$('.date-picker').datepicker('setDate', Routine.parseDate(sel_date));
  },

  /**
   * Проставка фильтров
   **/
   setFilters: function(query_items)
   {
    // обработка значений
    for(var i in query_items)
    {
      var cur_item = query_items[i];
      if(cur_item.indexOf("sectors[")==0)
      {
        var vals = cur_item.replace("sectors[","").replace("]","").substring(0, cur_item.length - 1).split(',');
        this.selectedSectors = vals;
      }
      else if(cur_item.indexOf("orders[")==0)
      {
        var vals = cur_item.replace("orders[","").replace("]","").substring(0, cur_item.length - 1).split(',');
        this.selectedOrders = vals;
      }
      else if(cur_item.indexOf("sectortypes[")==0)
      {
        var vals = cur_item.replace("sectortypes[","").replace("]","").substring(0, cur_item.length - 1).split(',');
        this.selectedSectorTypes = vals;
      }
      else if(cur_item.indexOf("statuses[")==0)
      {
        var vals = cur_item.replace("statuses[","").replace("]","").substring(0, cur_item.length - 1).split(',');
        this.selectedStatuses = vals;
      }
      else if(cur_item.indexOf("reasons[")==0)
      {
        var vals = cur_item.replace("reasons[","").replace("]","").substring(0, cur_item.length - 1).split(',');
        this.selectedReasons = vals;
      }
    }
    this.fillSectors(this.data.sectors, this.data.used_sectors, this.selectedSectors);
    this.fillOrders(this.data.orders, this.selectedOrders);
    this.fillSectorTypes(this.selectedSectorTypes);
    this.fillStatuses(this.selectedStatuses);
    this.fillReasons(this.data.reasons, this.data.used_reasons, this.selectedReasons);
   },

  /**
   *  Получение  данных
   *  21_08_2014&sectors[29,10,6]&orders[520.5.1,520.4.2,10.2.1]&statuses[on_hold,on_pause]&sectortypes[Цех,Монтаж]&reasons[Задержка снабжения,Задержка на предыдущих участках]
  **/
  search: function(query)
  {
    // decode query
    var query_items =[];
    var sel_date = null;
    if(query)
    {
      query = decodeURIComponent(query);
      query_items = query.split('&');
      sel_date = query_items[0].split('_').join('/');
    }

    var self = this;
    var data = [];
    if(!sel_date)
      sel_date = new Date().format("dd/mm/yyyy");

    self.selDate = sel_date;

    Routine.showLoader();
    $.ajax({
        url: '/handlers/brief/search/',
        type: 'GET',
        dataType: 'json',
        contentType: "application/json; charset=utf-8",
        data: {'date':sel_date},
        timeout: 65000,
        async: true,
        success: function (result, textStatus, jqXHR) {
          Routine.hideLoader();
          if(result.status=='error')
            $.jGrowl(result.msg, { 'themeState':'growl-error', 'sticky':false });
          else if(result.status=="ok")
          {
            // подготовка данных
            self.data = result.data;
            self.selectedSectors = [];
            self.selectedOrders = [];
            self.selectedStatuses = [];
            self.selectedSectorTypes = [];
            self.selectedReasons = [];

            // отрисовка данных
            //self.render(sel_date, self.data);
            self.setFilters(query_items);
            var filtered_data = self.prepareData(self.selDate, self.data, self.selectedSectors, self.selectedOrders, self.selectedStatuses,self.selectedSectorTypes, self.selectedReasons);
            self.render(sel_date, filtered_data, self.$('.btn-collapse').val()!="collapsed", self.$('.btn-view-style.active').val());
             //self.briefView.render(sel_date, filtered_data, self.$('.btn-collapse').val()!="collapsed");
          }
          else
          {
            $.jGrowl("Ошибка сервера.", { 'themeState':'growl-error', 'sticky':false });
            Routine.hideLoader();
          }
        }
       });
  },

  /**
   * Подготовка данных
   * sectors_code - array of sectors number
  **/
  prepareData: function(sel_date, data, sectors_code, order_numbers, statuses, sector_types, reasons)
  {

    // функция получения статуса работы на заданную дату
    function get_item_current_status(row, date)
    {
      var result = "";
      if (row['plan_work_status_log'].length>1)
      {
        var i=1;
        while (i < row['plan_work_status_log'].length)
        {
          if (date>=row['plan_work_status_log'][i-1]['date'] && date<row['plan_work_status_log'][i]['date'])
          {
            result = row['plan_work_status_log'][i-1]['status'];
            break;
          }
          i++;
        }

        if (result=="")
          result = row['plan_work_status_log'][row['plan_work_status_log'].length-1]['status'];
      }
      else if (row['plan_work_status_log'].length>0)
        result = row['plan_work_status_log'][0]['status'];
      return result;
    }


    result = {
      'stat':{
        'yesterday':{'start':{'items':{}, 'count':0, 'name': 'Начало'},'finish':{'items':{}, 'count':0, 'name': 'Окончание'},'current':{'items':{}, 'count':0, 'name': 'Текущие'}, 'count':0, 'name': 'Вчера'},
        'today':{'start': {'items':{}, 'count':0, 'name': 'Начало'},'finish':{'items':{}, 'count':0, 'name': 'Окончание'}, 'current':{'items':{}, 'count':0, 'name': 'Текущие'}, 'count':0, 'name': 'Сегодня'},
        'tomorrow':{'start':{'items':{}, 'count':0, 'name': 'Начало'},'finish':{'items':{}, 'count':0, 'name': 'Окончание'}, 'current':{'items':{}, 'count':0, 'name': 'Текущие'}, 'count':0, 'name': 'Завтра'},
        'count':0
      },
      'bad_stat':{
        'count':0,
        'items':{}
      },
      'count':0
    }

    today_date = new Date(Routine.parseDate(sel_date));
    today = new Date(Routine.parseDate(sel_date));
    tomorrow_date = new Date(new Date(today).setDate(today.getDate() + 1));
    tomorrow = tomorrow_date.format("dd/mm/yyyy");
    yesterday_date = new Date(new Date(today).setDate(today.getDate() -1));
    yesterday = yesterday_date.format("dd/mm/yyyy");
    today = today.format("dd/mm/yyyy");

    if(data['stat'].length>0)
    {
      for(var i in data['stat'])
      {
        var row = data['stat'][i];
        var order_number = row['contract_number'].toString() +'.'+ row['product_number'].toString()+ '.' + row['product_unit_number'].toString();
        var sector_type = row['sector_type'];

        if((sectors_code.length==0 || sectors_code.indexOf(row['sector_code'].toString())>-1) && (order_numbers.length==0 || order_numbers.indexOf(order_number)>-1) && (sector_types.length==0 || sector_types.indexOf(row['sector_type'])>-1) )
        {
          var contract_number = row['contract_number'];

          // получить текущий статус работы на 3 разных дня
          today_status = get_item_current_status(row, today_date);
          tomorrow_status = get_item_current_status(row, tomorrow_date);
          yesterday_status = get_item_current_status(row, yesterday_date);

          //if (Routine.convertToUTC(new Date(row['plan_work_date_start_with_shift'])).format("dd/mm/yyyy")==today && (today_status=='' || today_status == 'on_work'))
          if (new Date(row['plan_work_date_start_with_shift']).format("dd/mm/yyyy")==today && (today_status=='' || today_status == 'on_work' || today_status == 'on_work_with_reject'))
          {
            result['stat']['today']['count']+=1;
            result['stat']['today']['start']['count']+=1;
            if (!(contract_number in result['stat']['today']['start']['items']))
            {
              result['stat']['today']['start']['items'][contract_number] = {count: 0, 'items':{}, 'info':{'client_name':row['client_name']}};
            }

            if (!(order_number in result['stat']['today']['start']['items'][contract_number]['items']))
            {
              result['stat']['today']['start']['items'][contract_number]['items'][order_number] = {count: 0, 'items':{}, 'info':{
                'product_name':row['product_name'],
                'product_number':row['product_number']
              }};
            }

            if (!(row['sector_type'].toString() in result['stat']['today']['start']['items'][contract_number]['items'][order_number]['items']))
            {
              result['stat']['today']['start']['items'][contract_number]['items'][order_number]['items'][row['sector_type']] = {count: 0, works_count: 0, 'items':[], 'info':{
              'sector_name': row['sector_name'],
              'sector_code': row['sector_code'].toString(),
              'sector_type': row['sector_type'],
              }};
            }

            if (!(row['number'].toString() in result['stat']['today']['start']['items'][contract_number]['items'][order_number]['items'][sector_type]['items']))
            {
              result['stat']['today']['start']['items'][contract_number]['items'][order_number]['items'][sector_type]['items'][row['number'].toString()] = {count: 0,'items':[], 'info':{
              'sector_name': row['sector_name'],
              'sector_code': row['sector_code'].toString(),
              'sector_type': row['sector_type'],
              }};
            }

            result['stat']['today']['start']['items'][contract_number]['items'][order_number]['items'][sector_type]['items'][row['number'].toString()]['items'].push(row)
            result['stat']['today']['start']['items'][contract_number]['count']++;
            result['stat']['today']['start']['items'][contract_number]['items'][order_number]['count']++;
            result['stat']['today']['start']['items'][contract_number]['items'][order_number]['items'][sector_type]['count']++;
            result['stat']['today']['start']['items'][contract_number]['items'][order_number]['items'][sector_type]['items'][row['number'].toString()]['count']++;
            result['stat']['today']['start']['items'][contract_number]['items'][order_number]['items'][sector_type]['works_count']++;
          }
          if (new Date(row['plan_work_date_finish_with_shift']).format("dd/mm/yyyy")==today && (today_status == 'on_work'||today_status == 'on_work_with_reject') )
          {
            result['stat']['today']['count']+=1;
            result['stat']['today']['finish']['count']+=1;
            if (!(contract_number in result['stat']['today']['finish']['items']))
            {
              result['stat']['today']['finish']['items'][contract_number] = {count: 0,'items':{}, 'info':{'client_name':row['client_name']}};
            }

            if (!(order_number in result['stat']['today']['finish']['items'][contract_number]['items']))
            {
              result['stat']['today']['finish']['items'][contract_number]['items'][order_number] = {count: 0,'items':{}, 'info':{
                'product_name':row['product_name'],
                'product_number':row['product_number']
              }};
            }
            if (!(row['sector_type'].toString() in result['stat']['today']['finish']['items'][contract_number]['items'][order_number]['items']))
            {
              result['stat']['today']['finish']['items'][contract_number]['items'][order_number]['items'][row['sector_type'].toString()] = {count: 0, works_count: 0,'items':[], 'info':{
              'sector_name': row['sector_name'],
              'sector_code': row['sector_code'].toString(),
              'sector_type': row['sector_type'],
              }};
            }

            if (!(row['number'].toString() in result['stat']['today']['finish']['items'][contract_number]['items'][order_number]['items'][sector_type]['items']))
            {
              result['stat']['today']['finish']['items'][contract_number]['items'][order_number]['items'][sector_type]['items'][row['number'].toString()] = {count: 0,'items':[], 'info':{
              'sector_name': row['sector_name'],
              'sector_code': row['sector_code'].toString(),
              'sector_type': row['sector_type'],
              }};
            }

            result['stat']['today']['finish']['items'][contract_number]['items'][order_number]['items'][sector_type]['items'][row['number'].toString()]['items'].push(row)
            result['stat']['today']['finish']['items'][contract_number]['count']++;
            result['stat']['today']['finish']['items'][contract_number]['items'][order_number]['count']++;
            result['stat']['today']['finish']['items'][contract_number]['items'][order_number]['items'][sector_type]['count']++;
            result['stat']['today']['finish']['items'][contract_number]['items'][order_number]['items'][sector_type]['items'][row['number'].toString()]['count']++;
            result['stat']['today']['finish']['items'][contract_number]['items'][order_number]['items'][sector_type]['works_count']++;
          }

          //if (Routine.convertToUTC(new Date(row['plan_work_date_start_with_shift']))<today_date && Routine.convertToUTC(new Date(row['plan_work_date_finish_with_shift']))>today_date && today_status=="on_work")
          if (new Date(row['plan_work_date_start_with_shift'])<today_date && new Date(row['plan_work_date_finish_with_shift'])>today_date && today_status=="on_work")
          {
            result['stat']['today']['count']+=1;
            result['stat']['today']['current']['count']+=1;
            if (!(contract_number in result['stat']['today']['current']['items']))
            {
              result['stat']['today']['current']['items'][contract_number] = {count: 0,'items':{}, 'info':{'client_name':row['client_name']}};
            }

            if (!(order_number in result['stat']['today']['current']['items'][contract_number]['items']))
            {
              result['stat']['today']['current']['items'][contract_number]['items'][order_number] = {count: 0,'items':{}, 'info':{
                'product_name':row['product_name'],
                'product_number':row['product_number']
              }};
            }

            if (!(row['sector_type'].toString() in result['stat']['today']['current']['items'][contract_number]['items'][order_number]['items']))
            {
              result['stat']['today']['current']['items'][contract_number]['items'][order_number]['items'][row['sector_type']] = {count: 0, works_count: 0,'items':[], 'info':{
              'sector_name': row['sector_name'],
              'sector_code': row['sector_code'].toString(),
              'sector_type': row['sector_type'],
              }};
            }

            if (!(row['number'].toString() in result['stat']['today']['current']['items'][contract_number]['items'][order_number]['items'][sector_type]['items']))
            {
              result['stat']['today']['current']['items'][contract_number]['items'][order_number]['items'][sector_type]['items'][row['number'].toString()] = {count: 0,'items':[], 'info':{
              'sector_name': row['sector_name'],
              'sector_code': row['sector_code'].toString(),
              'sector_type': row['sector_type'],
              }};
            }

            result['stat']['today']['current']['items'][contract_number]['items'][order_number]['items'][sector_type]['items'][row['number'].toString()]['items'].push(row)
            result['stat']['today']['current']['items'][contract_number]['count']++;
            result['stat']['today']['current']['items'][contract_number]['items'][order_number]['count']++;
            result['stat']['today']['current']['items'][contract_number]['items'][order_number]['items'][sector_type]['count']++;
            result['stat']['today']['current']['items'][contract_number]['items'][order_number]['items'][sector_type]['items'][row['number'].toString()]['count']++;
            result['stat']['today']['current']['items'][contract_number]['items'][order_number]['items'][sector_type]['works_count']++;
          }

          if (new Date(row['plan_work_date_start_with_shift']).format("dd/mm/yyyy")==tomorrow && (tomorrow_status=='' || tomorrow_status == 'on_work'))
          {
            result['stat']['tomorrow']['count']+=1;
            result['stat']['tomorrow']['start']['count']+=1;
            if (!(contract_number in result['stat']['tomorrow']['start']['items']))
            {
              result['stat']['tomorrow']['start']['items'][contract_number] = {count: 0,'items':{}, 'info':{'client_name':row['client_name']}};
            }

            if (!(order_number in result['stat']['tomorrow']['start']['items'][contract_number]['items']))
            {
              result['stat']['tomorrow']['start']['items'][contract_number]['items'][order_number] = {count: 0,'items':{}, 'info':{
                'product_name':row['product_name'],
                'product_number':row['product_number']
              }};
            }

            if (!(row['sector_type'].toString() in result['stat']['tomorrow']['start']['items'][contract_number]['items'][order_number]['items']))
            {
              result['stat']['tomorrow']['start']['items'][contract_number]['items'][order_number]['items'][row['sector_type'].toString()] = {count: 0, works_count: 0,'items':[], 'info':{
              'sector_name': row['sector_name'],
              'sector_code': row['sector_code'].toString(),
              'sector_type': row['sector_type'],
              }};
            }

            if (!(row['number'].toString() in result['stat']['tomorrow']['start']['items'][contract_number]['items'][order_number]['items'][sector_type]['items']))
            {
              result['stat']['tomorrow']['start']['items'][contract_number]['items'][order_number]['items'][sector_type]['items'][row['number'].toString()] = {count: 0,'items':[], 'info':{
              'sector_name': row['sector_name'],
              'sector_code': row['sector_code'].toString(),
              'sector_type': row['sector_type'],
              }};
            }

            result['stat']['tomorrow']['start']['items'][contract_number]['items'][order_number]['items'][sector_type]['items'][row['number'].toString()]['items'].push(row)
            result['stat']['tomorrow']['start']['items'][contract_number]['count']++;
            result['stat']['tomorrow']['start']['items'][contract_number]['items'][order_number]['count']++;
            result['stat']['tomorrow']['start']['items'][contract_number]['items'][order_number]['items'][sector_type]['count']++;
            result['stat']['tomorrow']['start']['items'][contract_number]['items'][order_number]['items'][sector_type]['items'][row['number'].toString()]['count']++;
            result['stat']['tomorrow']['start']['items'][contract_number]['items'][order_number]['items'][sector_type]['works_count']++;
          }

          if (new Date(row['plan_work_date_finish_with_shift']).format("dd/mm/yyyy")==tomorrow && tomorrow_status == 'on_work')
          {
            result['stat']['tomorrow']['count']+=1;
            result['stat']['tomorrow']['finish']['count']+=1;
            if (!(contract_number in result['stat']['tomorrow']['finish']['items']))
            {
              result['stat']['tomorrow']['finish']['items'][contract_number] = {count: 0,'items':{}, 'info':{'client_name':row['client_name']}};
            }

            if (!(order_number in result['stat']['tomorrow']['finish']['items'][contract_number]['items']))
            {
              result['stat']['tomorrow']['finish']['items'][contract_number]['items'][order_number] = {count: 0,'items':{}, 'info':{
                'product_name':row['product_name'],
                'product_number':row['product_number']
              }};
            }

            if (!(row['sector_type'].toString() in result['stat']['tomorrow']['finish']['items'][contract_number]['items'][order_number]['items']))
            {
              result['stat']['tomorrow']['finish']['items'][contract_number]['items'][order_number]['items'][row['sector_type'].toString()] = {count: 0, works_count: 0,'items':[], 'info':{
              'sector_name': row['sector_name'],
              'sector_code': row['sector_code'].toString(),
              'sector_type': row['sector_type'],
              }};
            }

            if (!(row['number'].toString() in result['stat']['tomorrow']['finish']['items'][contract_number]['items'][order_number]['items'][sector_type]['items']))
            {
              result['stat']['tomorrow']['finish']['items'][contract_number]['items'][order_number]['items'][sector_type]['items'][row['number'].toString()] = {count: 0,'items':[], 'info':{
              'sector_name': row['sector_name'],
              'sector_code': row['sector_code'].toString(),
              'sector_type': row['sector_type'],
              }};

            }

            result['stat']['tomorrow']['finish']['items'][contract_number]['items'][order_number]['items'][sector_type]['items'][row['number'].toString()]['items'].push(row)
            result['stat']['tomorrow']['finish']['items'][contract_number]['count']++;
              result['stat']['tomorrow']['finish']['items'][contract_number]['items'][order_number]['count']++;
              result['stat']['tomorrow']['finish']['items'][contract_number]['items'][order_number]['items'][sector_type]['count']++;
            result['stat']['tomorrow']['finish']['items'][contract_number]['items'][order_number]['items'][sector_type]['items'][row['number'].toString()]['count']++;
            result['stat']['tomorrow']['finish']['items'][contract_number]['items'][order_number]['items'][sector_type]['works_count']++;
          }

          //if (Routine.convertToUTC(new Date(row['plan_work_date_start_with_shift']))<tomorrow_date && Routine.convertToUTC(new Date(row['plan_work_date_finish_with_shift']))>tomorrow_date && tomorrow_status=="on_work")
          if (new Date(row['plan_work_date_start_with_shift'])<tomorrow_date && new Date(row['plan_work_date_finish_with_shift'])>tomorrow_date && tomorrow_status=="on_work")
          {
            result['stat']['tomorrow']['count']+=1;
            result['stat']['tomorrow']['current']['count']+=1;
            if (!(contract_number in result['stat']['tomorrow']['current']['items']))
            {
              result['stat']['tomorrow']['current']['items'][contract_number] = {count: 0,'items':{}, 'info':{'client_name':row['client_name']}};
            }

            if (!(order_number in result['stat']['tomorrow']['current']['items'][contract_number]['items']))
            {
              result['stat']['tomorrow']['current']['items'][contract_number]['items'][order_number] = {count: 0,'items':{}, 'info':{
                'product_name':row['product_name'],
                'product_number':row['product_number']
              }};
            }

            if (!(row['sector_type'].toString() in result['stat']['tomorrow']['current']['items'][contract_number]['items'][order_number]['items']))
            {
              result['stat']['tomorrow']['current']['items'][contract_number]['items'][order_number]['items'][row['sector_type']] = {count: 0, works_count: 0,'items':[], 'info':{
              'sector_name': row['sector_name'],
              'sector_code': row['sector_code'].toString(),
              'sector_type': row['sector_type'],
              }};
            }

            if (!(row['number'].toString() in result['stat']['tomorrow']['current']['items'][contract_number]['items'][order_number]['items'][sector_type]['items']))
            {
              result['stat']['tomorrow']['current']['items'][contract_number]['items'][order_number]['items'][sector_type]['items'][row['number'].toString()] = {count: 0,'items':[], 'info':{
              'sector_name': row['sector_name'],
              'sector_code': row['sector_code'].toString(),
              'sector_type': row['sector_type'],
              }};
            }

            result['stat']['tomorrow']['current']['items'][contract_number]['items'][order_number]['items'][sector_type]['items'][row['number'].toString()]['items'].push(row);
            result['stat']['tomorrow']['current']['items'][contract_number]['count']++;
              result['stat']['tomorrow']['current']['items'][contract_number]['items'][order_number]['count']++;
              result['stat']['tomorrow']['current']['items'][contract_number]['items'][order_number]['items'][sector_type]['count']++;
            result['stat']['tomorrow']['current']['items'][contract_number]['items'][order_number]['items'][sector_type]['items'][row['number'].toString()]['count']++;
            result['stat']['tomorrow']['current']['items'][contract_number]['items'][order_number]['items'][sector_type]['works_count']++;
          }

          if (new Date(row['plan_work_date_start_with_shift']).format("dd/mm/yyyy")==yesterday && (yesterday_status=='' || yesterday_status == 'on_work'))
          {
            result['stat']['yesterday']['count']+=1;
            result['stat']['yesterday']['start']['count']+=1;
            if (!(contract_number in result['stat']['yesterday']['start']['items']))
            {
              result['stat']['yesterday']['start']['items'][contract_number] = {count: 0,'items':{}, 'info':{'client_name':row['client_name']}};
            }

            if (!(order_number in result['stat']['yesterday']['start']['items'][contract_number]['items']) )
            {
              result['stat']['yesterday']['start']['items'][contract_number]['items'][order_number] = {count: 0,'items':{}, 'info':{
                'product_name':row['product_name'],
                'product_number':row['product_number']
              }};
            }

            if (!(row['sector_type'].toString() in result['stat']['yesterday']['start']['items'][contract_number]['items'][order_number]['items']))
            {
              result['stat']['yesterday']['start']['items'][contract_number]['items'][order_number]['items'][row['sector_type'].toString()] = {count: 0, works_count: 0,'items':[], 'info':{
              'sector_name': row['sector_name'],
              'sector_code': row['sector_code'].toString(),
              'sector_type': row['sector_type'],
              }};

            }

            if (!(row['number'].toString() in result['stat']['yesterday']['start']['items'][contract_number]['items'][order_number]['items'][sector_type]['items']))
            {
              result['stat']['yesterday']['start']['items'][contract_number]['items'][order_number]['items'][sector_type]['items'][row['number'].toString()] = {count: 0,'items':[], 'info':{
              'sector_name': row['sector_name'],
              'sector_code': row['sector_code'].toString(),
              'sector_type': row['sector_type'],
              }};
            }

            result['stat']['yesterday']['start']['items'][contract_number]['items'][order_number]['items'][sector_type]['items'][row['number'].toString()]['items'].push(row)
            result['stat']['yesterday']['start']['items'][contract_number]['count']++;
              result['stat']['yesterday']['start']['items'][contract_number]['items'][order_number]['count']++;
              result['stat']['yesterday']['start']['items'][contract_number]['items'][order_number]['items'][sector_type]['count']++;
            result['stat']['yesterday']['start']['items'][contract_number]['items'][order_number]['items'][sector_type]['items'][row['number'].toString()]['count']++;
            result['stat']['yesterday']['start']['items'][contract_number]['items'][order_number]['items'][sector_type]['works_count']++;
          }

          if (new Date(row['plan_work_date_finish_with_shift']).format("dd/mm/yyyy")==yesterday && yesterday_status == 'on_work')
          {
            result['stat']['yesterday']['count']+=1;
            result['stat']['yesterday']['finish']['count']+=1;
            if (!(contract_number in result['stat']['yesterday']['finish']['items']))
            {
              result['stat']['yesterday']['finish']['items'][contract_number] = {count: 0,'items':{}, 'info':{'client_name':row['client_name']}};
            }

            if (!(order_number in result['stat']['yesterday']['finish']['items'][contract_number]['items']))
            {
              result['stat']['yesterday']['finish']['items'][contract_number]['items'][order_number] = {count: 0,'items':{}, 'info':{
                'product_name':row['product_name'],
                'product_number':row['product_number']
              }};
            }

            if (!(row['sector_type'].toString() in result['stat']['yesterday']['finish']['items'][contract_number]['items'][order_number]['items']))
            {
              result['stat']['yesterday']['finish']['items'][contract_number]['items'][order_number]['items'][row['sector_type'].toString()] = {count: 0, works_count: 0,'items':[], 'info':{
              'sector_name': row['sector_name'],
              'sector_code': row['sector_code'].toString(),
              'sector_type': row['sector_type'],
              }};

            }

            if (!(row['number'].toString() in result['stat']['yesterday']['finish']['items'][contract_number]['items'][order_number]['items'][sector_type]['items']))
            {
              result['stat']['yesterday']['finish']['items'][contract_number]['items'][order_number]['items'][sector_type]['items'][row['number'].toString()] = {count: 0,'items':[], 'info':{
              'sector_name': row['sector_name'],
              'sector_code': row['sector_code'].toString(),
              'sector_type': row['sector_type'],
              }};
            }

            result['stat']['yesterday']['finish']['items'][contract_number]['items'][order_number]['items'][sector_type]['items'][row['number'].toString()]['items'].push(row)
            result['stat']['yesterday']['finish']['items'][contract_number]['count']++;
              result['stat']['yesterday']['finish']['items'][contract_number]['items'][order_number]['count']++;
              result['stat']['yesterday']['finish']['items'][contract_number]['items'][order_number]['items'][sector_type]['count']++;
            result['stat']['yesterday']['finish']['items'][contract_number]['items'][order_number]['items'][sector_type]['items'][row['number'].toString()]['count']++;
            result['stat']['yesterday']['finish']['items'][contract_number]['items'][order_number]['items'][sector_type]['works_count']++;
          }

          //if (Routine.convertToUTC(new Date(row['plan_work_date_start_with_shift']))<yesterday_date && Routine.convertToUTC(new Date(row['plan_work_date_finish_with_shift']))>yesterday_date && yesterday_status=="on_work")
          if (new Date(row['plan_work_date_start_with_shift'])<yesterday_date && new Date(row['plan_work_date_finish_with_shift'])>yesterday_date && yesterday_status=="on_work")
          {
            result['stat']['yesterday']['count']+=1;
            result['stat']['yesterday']['current']['count']+=1;
            if (!(contract_number in result['stat']['yesterday']['current']['items']))
            {
              result['stat']['yesterday']['current']['items'][contract_number] = {count: 0,'items':{}, 'info':{'client_name':row['client_name']}};
            }

            if (!(order_number in result['stat']['yesterday']['current']['items'][contract_number]['items']))
            {
              result['stat']['yesterday']['current']['items'][contract_number]['items'][order_number] = {count: 0,'items':{}, 'info':{
                'product_name':row['product_name'],
                'product_number':row['product_number']
              }};
            }

            if (!(row['sector_type'].toString() in result['stat']['yesterday']['current']['items'][contract_number]['items'][order_number]['items']))
            {
              result['stat']['yesterday']['current']['items'][contract_number]['items'][order_number]['items'][row['sector_type']] = {count: 0, works_count: 0,'items':[], 'info':{
              'sector_name': row['sector_name'],
              'sector_code': row['sector_code'].toString(),
              'sector_type': row['sector_type'],
              }};

            }

            if (!(row['number'].toString() in result['stat']['yesterday']['current']['items'][contract_number]['items'][order_number]['items'][sector_type]['items']))
            {
              result['stat']['yesterday']['current']['items'][contract_number]['items'][order_number]['items'][sector_type]['items'][row['number'].toString()] = {count: 0,'items':[], 'info':{
              'sector_name': row['sector_name'],
              'sector_code': row['sector_code'].toString(),
              'sector_type': row['sector_type'],
              }};
            }

            result['stat']['yesterday']['current']['items'][contract_number]['items'][order_number]['items'][sector_type]['items'][row['number'].toString()]['items'].push(row)
            result['stat']['yesterday']['current']['items'][contract_number]['count']++;
              result['stat']['yesterday']['current']['items'][contract_number]['items'][order_number]['count']++;
              result['stat']['yesterday']['current']['items'][contract_number]['items'][order_number]['items'][sector_type]['count']++;
            result['stat']['yesterday']['current']['items'][contract_number]['items'][order_number]['items'][sector_type]['items'][row['number'].toString()]['count']++;
            result['stat']['yesterday']['current']['items'][contract_number]['items'][order_number]['items'][sector_type]['works_count']++;
          }

        }
      }
    }
    ///---------------------------------------------------------------------------
    // отклонения
    ///---------------------------------------------------------------------------
    if(data['bad_stat'].length>0){
      for(var i in data['bad_stat'])
      {
        var row = data['bad_stat'][i];
        var order_number = row['contract_number'].toString() +'.'+ row['product_number'].toString()+ '.' + row['product_unit_number'].toString();
        var contract_number = row['contract_number'];
        var sector_type = row['sector_type'];
        //console.log(statuses.indexOf(row['plan_work_status']));
         if((sectors_code.length==0 || sectors_code.indexOf(row['sector_code'].toString())>-1) && (order_numbers.length==0 || order_numbers.indexOf(order_number)>-1 ) && (statuses.length==0 || statuses.indexOf(row['plan_work_status'])>-1 ) && (sector_types.length==0 || sector_types.indexOf(row['sector_type'])>-1) && (reasons.length==0 || reasons.indexOf(row['reason'])>-1))
         {
          result['bad_stat']['count']+=1;
          if (!(contract_number in result['bad_stat']['items']))
            result['bad_stat']['items'][contract_number] = {'items':{}, 'info':{'client_name':row['client_name']}, 'count':0}

          if (!(order_number in result['bad_stat']['items'][contract_number]['items']))
          {
            result['bad_stat']['items'][contract_number]['items'][order_number] = {'count':0, 'items':{}, 'info':{
              'product_name':row['product_name'],
              'product_number':row['product_number']
            }};
          }
          if (!(row['sector_type'].toString() in result['bad_stat']['items'][contract_number]['items'][order_number]['items']))
          {
            result['bad_stat']['items'][contract_number]['items'][order_number]['items'][row['sector_type'].toString()] = {'count':0, works_count: 0, 'items':[], 'info':{
              'sector_name': row['sector_name'],
              'sector_code': row['sector_code'].toString(),
              'sector_type': row['sector_type'].toString()
            }};
          }
          if (!(row['number'].toString() in result['bad_stat']['items'][contract_number]['items'][order_number]['items'][sector_type]['items']))
          {
            result['bad_stat']['items'][contract_number]['items'][order_number]['items'][sector_type]['items'][row['number'].toString()] = {count: 0, 'items':[], 'info':{
              'sector_name': row['sector_name'],
              'sector_code': row['sector_code'].toString(),
              'sector_type': row['sector_type'].toString()
            }};
          }
          result['bad_stat']['items'][contract_number]['items'][order_number]['items'][sector_type]['items'][row['number'].toString()]['items'].push(row)
          result['bad_stat']['items'][contract_number]['count']++
            result['bad_stat']['items'][contract_number]['items'][order_number]['count']++;
            result['bad_stat']['items'][contract_number]['items'][order_number]['items'][row['sector_type'].toString()]['count']++;
          result['bad_stat']['items'][contract_number]['items'][order_number]['items'][sector_type]['items'][row['number'].toString()]['count']++;
          result['bad_stat']['items'][contract_number]['items'][order_number]['items'][row['sector_type'].toString()]['works_count']++;
        }
      }
    }

    result['stat']['count'] = result['stat']['today']['count'] + result['stat']['tomorrow']['count']+result['stat']['yesterday']['count'];
    result['count'] = result['stat']['count'] + result['bad_stat']['count'];

    return result;
  },

  /**
   * Заполнение выпадающего списка участков
  **/
  fillSectors: function(sectors, used_sectors, selected_sectors)
  {
      var ddl = this.$(".ddl-sectors").empty();
      for(var i in sectors)
      {
        if(used_sectors.indexOf(sectors[i].code)>-1)
          sectors[i].enabled = true;
        else
          sectors[i].enabled = false;

        if(selected_sectors.indexOf(sectors[i].code.toString())>-1)
          sectors[i].checked = true;
        else
          sectors[i].checked = false;

        $(ddl).append(this.templates.item_templateSector(sectors[i]));
      }
      $(ddl).multiselect('rebuild');
   },

   /**
   * Заполнение выпадающего списка причин
  **/
  fillReasons: function(reasons, used_reasons, selected_reasons)
  {
      var ddl = this.$(".ddl-reasons").empty();
      for(var i in reasons)
      {
        if(used_reasons.indexOf(reasons[i].name)>-1)
          reasons[i].enabled = true;
        else
          reasons[i].enabled = false;

        if(selected_reasons.indexOf(reasons[i].name)>-1)
          reasons[i].checked = true;
        else
          reasons[i].checked = false;

        $(ddl).append(this.templates.item_templateReason(reasons[i]));
      }
      $(ddl).multiselect('rebuild');
   },

  /**
   * Заполнение выпадающего списка заказов
  **/
  fillOrders: function(orders, selected_orders)
  {
      var ddl = this.$(".ddl-orders").empty();
      for(var i in orders)
      {
        if(selected_orders.indexOf(orders[i].number)>-1)
          orders[i].checked = true;
        else
          orders[i].checked = false;

        $(ddl).append(this.templates.item_templateOrder(orders[i]));
      }
      $(ddl).multiselect('rebuild');
   },

   /**
   * Заполнение выпадающего списка типов отклонений
  **/
  fillStatuses: function(selected_statuses)
  {
      var ddl = this.$(".ddl-statuses");
      $(ddl).find('option').prop('selected',false);

      for(var i in selected_statuses)
        $(ddl).find('option[value="' + selected_statuses[i] + '"]').prop('selected',true);

      $(ddl).multiselect('rebuild');
   },

   /**
   * Заполнение выпадающего списка видов участков(цех\монтаж)
  **/
  fillSectorTypes: function(selected_types)
  {
      var ddl = this.$(".ddl-sector-types");
      $(ddl).find('option').prop('selected',false);

      for(var i in selected_types)
        $(ddl).find('option[value="' + selected_types[i] + '"]').prop('selected',true);

      $(ddl).multiselect('rebuild');
   },

  /**
   * Рендер данных и обновление формы
  **/
  render: function(sel_date, data)
  {
     //var filtered_data = this.prepareData(sel_date, data, [], [], [], [], []);
     // обновление даты в календаре
     this.$('.date-picker input').val(sel_date);
     this.$('.btn-collapse').hide();
     this.$('.pnl-ddl-sectors').hide();
     this.$('.pnl-ddl-orders').hide();
     this.$('.pnl-ddl-statuses').hide();
     this.$('.pnl-ddl-sector-types').hide();
     this.$('.pnl-ddl-reasons').hide();
     if(data['stat'] || data['bad_stat'])
     {
      this.$('.btn-collapse').show();
      this.$('.pnl-ddl-sectors').show();
      this.$('.pnl-ddl-orders').show();
      this.$('.pnl-ddl-statuses').show();
      this.$('.pnl-ddl-sector-types').show();
      this.$('.pnl-ddl-reasons').show();
      this.$('.btn-collapse').val("collapsed").html('&nbsp;&nbsp;Расскрыть группы').prepend('<i class = "icon-folder-close"></i>');

      /*// заполнение списка секторов
      this.fillSectors(data.sectors, data.used_sectors, this.selectedSectors);
      // заполнение списка заказов
      this.fillOrders(data.orders, this.selectedOrders);
      // заполнение списка типов отклонений
      this.fillStatuses(this.selectedStatuses);
      // заполнение списка видов участков
      this.fillSectorTypes(this.selectedSectorTypes);
      // заполнение списка причин отклонений
      this.fillReasons(data.reasons, data.used_reasons, this.selectedReasons);*/
     }
     // рендер осовных данных
     this.briefView.render(sel_date, data, false,'table');
  },

  /**
   *  Раскрытия гурпп
  **/
  OnCollapse: function()
  {
    if(this.$('.btn-collapse').val()=="collapsed")
    {
         this.$('.btn-collapse').val("unCollapsed").html('&nbsp;&nbsp;Закрыть группы').prepend('<i class = "icon-folder-open"></i>');
         this.briefView.collapse(true);
    }
    else
    {
         this.$('.btn-collapse').val("collapsed").html('&nbsp;&nbsp;Расскрыть группы').prepend('<i class = "icon-folder-close"></i>');
         this.briefView.collapse(false);
    }
  },

  /**
   *  Функция поиска
  **/
  OnSearch:function(){
    App.Route.navigate("/"+this.$('.date-picker input').val().split('/').join('_'), true);
  }
});

///
/// Контрол управления всей формой
///
App.Views.BriefView = Backbone.View.extend({
  el: $("#pnlBriefBody"),
  view_style: 'table',
  templates: {
    briefDataTemplate:_.template($("#briefDataTemplate").html()),
    briefDataTemplateTable:_.template($("#briefDataTemplateTable").html()),
  },

  events:{
      'copy #pnlBriefContainer': 'OnCopy',
  },


  OnCopy: function()
  {
  },

  /**
   *  Инициализация
  **/
  initialize: function(users){
  },

  /**
   * Разворачивание/сворачивание групп
  **/
  collapse: function (val) {
    if(val)
      this.$('input').prop('checked',true);
    else
      this.$('input').prop('checked',false);
  },

  /**
   * Отрисовка формы
  **/
  render: function (sel_date,collection, collapsed, view_style) {
    this.view_style = view_style;
    this.$('.lbl-header').html('Повестка дня на: ' + sel_date);
    if(view_style=='table')
      this.$('.data-container').html(this.templates.briefDataTemplateTable(collection));
    else
      this.$('.data-container').html(this.templates.briefDataTemplate(collection));

    if(collapsed)
      this.$('input').prop('checked',true);
    else
      this.$('input').prop('checked',false);
  },
});
