var App = {
  Models: {},
  Views:{},
  Collections:{},
  UrlParams:  {},                          // параметры URL строки
  DataCollection:null,                 // Коллекция участков
  dataListView:null,                     // Представление списка данных
  FindView: null,                           // Представление панели поиска данных
  PlanShiftReasonSystemObjects: null,  // Список идентификаторов системных причин переноса плановых сроков
  GlobalWorks: null,                     //Справочник участков и работ
  DataContractInfo: null,                      // информация о договоре и его продукции
  hasUserAccessToContracts: false,    // флаг доступа к платежам и договорам
  /**
   *  Инициализайия необходимых объектов
  **/
  initialize: function(planshiftreason_system_objects, global_works, all_workers){
    this.AllWorkers = all_workers;
    // справочник участков и работ
    this.GlobalWorks = global_works;
    // форма переноса дат
    this.PlanShiftReasonSystemObjects = planshiftreason_system_objects;
    // форма поиска данных
    this.FindView =  new App.Views.FindView();
    // форма списка данных
    App.DataCollection = new App.Collections.WorkOrderCollection();
    App.DataContractInfo = {'data': {}};
    App.dataListView = new App.Views.DataListView({'collection':App.DataCollection, 'contract_info':App.DataContractInfo});
    // роутинг
    this.Route = new AppRouter();
    Backbone.history.start();
    // глобальное событие на изменение параметров URL адреса
    Backbone.on("global:on_url_params_change",this.onSaveUrlHistory,this);
    // проверка доступа к договорам
    this.hasUserAccessToContracts = this.checkUserAccessToContracts();
  },

  /**
    *Проверка на доступ текущего пользователя к договорам и платежам
  **/
  checkUserAccessToContracts:function(){
    if(glCurUser.admin=='admin')
      return true;
    for(var i in glCurUser.roles)
    {
      var role = glCurUser.roles[i];
      for(var p in role.pages)
      {
        if(p=='contracts' && (role.pages[p]['r'] || role.pages[p]['w'] || role.pages[p]['o']) )
          return true
      }
    }
    return false;
  },

  /**
    *Проверка на доступ текущего пользователя к текущему направению работ
  **/
  checkUserAccessToSector:function(sector_code){
    if(glCurUser.admin=='admin')
      return true;
    // пока здесь заглушка, необхоимо пока скрывать объемы для определенных направлений, и показывать
    // их только тем пользователям, котоыре входят в роль  - Финансовый директор (58bd35576f57ff000871a81e)
    //
    // если участок данной работы входт в указанное направление: Общие расходы(5a75fc2bfcdb58a88de07575)
    // и роль текущего пользователя не фнансовый директор (58bd35576f57ff000871a81e),
    // то необходимо скрывтаь объемы
    //
    // получить направление работ по коду участка
    var sector_type = '';
    for(var i in this.GlobalWorks)
    {
      var sector_info = this.GlobalWorks[i];
      if(sector_info['code'] == sector_code){
        sector_type = sector_info['type'];
        break;
      }
    }
    if(sector_type && sector_type=='Общие расходы')
    {
      for(var i in glCurUser.roles)
      {
        var role = glCurUser.roles[i];
        if(role['role'] == '58bd35576f57ff000871a81e')
          return true
      }
      return false;
    }
    return true;
  },

  /**
    *Проверка на доступ текущего пользователя к возможности переноса и назначения прошлых дат нарядам
  **/
  hasUserAccessToTransferDates:function(){
    if(glCurUser.admin=='admin')
      return true;
    for(var i in glCurUser.roles)
    {
      var role = glCurUser.roles[i];
      for(var p in role.pages)
      {
        // если для текущего пользователя для страницы нарядов заданы расширвенные права
        if(p=='workorderdate' && role.pages[p]['o']&& role.pages[p]['additional']  && role.pages[p]['additional']['past_dates']==1)
          return true
      }
    }
    return false;
  },

  /**
    *Проверка на доступ текущего пользователя к возможности отмены корректировок
  **/
  hasUserAccessToCancelTransfers:function(){
    if(glCurUser.admin=='admin')
      return true;
    for(var i in glCurUser.roles)
    {
      var role = glCurUser.roles[i];
      for(var p in role.pages)
      {
        // если для текущего пользователя для страницы нарядов заданы расширвенные права
        if(p=='workorderdate' && role.pages[p]['o']&& role.pages[p]['additional']  && role.pages[p]['additional']['cancel_transfer']==1)
          return true
      }
    }
    return false;
  },

  /**
    * Изменение и сохранение параметров URL
  **/
  onSaveUrlHistory:function(params){
    var param_key = params[1];
    var param_value = params[2];
    if(param_key in this.UrlParams)
      this.UrlParams[param_key] = param_value;
    this.Route.navigate("/"+this.buildUrl(), false);
  },
  /**
    * Парсинг URl параметров
  **/
  doQuery: function(query){
    // функция заполнения структуры команд
    function parse_commands(urlParams)
    {
      var tmpCommands = query.split('/');
      if(tmpCommands.length>0)
      {
        for(var key in urlParams)
        {
          var i = 0;
          for(var ci in tmpCommands)
          {
            var command = tmpCommands[i];
            if(key == command && (i+1)<= tmpCommands.length)
              urlParams[key] = tmpCommands[i+1];
            i++;
          }
        }
      }
    }
     // отображение форм построения  [contract, order, work_order]
     var search_types = {'contract':'contract', 'order': 'order', 'workorder': 'workorder'};
    this.UrlParams =  {'number': '', 'search_type': 'order', 'sector_type':'', 'sector':'', 'workorder':'', 'work':'' };
    var tmpCommands = query? query.split('/'):[];
    // если в URL передан только номер заказа
    // меняем запрос на правильный и выпоняем построение
    if(tmpCommands.length==1)
        this.UrlParams['number']  = tmpCommands[0];
    else if(tmpCommands.length>0)
      parse_commands(this.UrlParams);
    // выставление правильного URL
    this.Route.navigate("/"+this.buildUrl(), false);
    // запуск процедуры поиска данных
    this.FindView.doSearch(this.UrlParams['number'], (this.UrlParams['search_type'] in search_types)?this.UrlParams['search_type']:'order', this.UrlParams['sector_type'], this.UrlParams['sector'], this.UrlParams['workorder'], this.UrlParams['work']);
  },
   /**
    * Построение строки URL по текущим параметрам
  **/
  buildUrl: function(){
    var arr = [];
    for(var key in this.UrlParams)
    {
      arr.push(key);
      arr.push(this.UrlParams[key]);
    }
    return arr.join("/");
  },

  /**
    * Глобальное сохранение данных
  **/
  save_blanks: function(dataToSave, function_complete)
  {
    var self = this;

    // если сохранять нечего
    if(dataToSave.length == 0)
    {
      $.jGrowl('Нет данных на сохранение.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      return;
    }
    Routine.showLoader();
    $.ajax({
      type: "PUT",
      url: "/handlers/workorder/add_blanks",
      data: JSON.stringify({'data_to_save':dataToSave}),
      timeout: 35000,
      contentType: 'application/json',
      dataType: 'json',
      async:true
    }).done(function(result) {
        if(result['status']=="ok")
        {
          $.jGrowl('Созданы новые бланки.', { 'themeState':'growl-success', 'sticky':false, life: 10000});
          // если определена функция, которую необходимо выполнить после завершения сохранения
          // то вызываем ее
          if(function_complete)
            function_complete();
        }
        else
          $.jGrowl('Ошибка сохранения данных. Подробности: ' + result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 10000 });
    }).always(function(){Routine.hideLoader()});
  },

  /**
    * Глобальное сохранение данных
    * data - данные на сохранение
    * holds - список простоев на сохранение
    * function_complete - callback функция с результатом
  **/
  save: function(data, holds, function_complete)
  {
    var self = this;
    var data_to_save = []
    _.each(data.models, function (wo) {
      var is_changed = false;
      if(wo.hasChanged() || wo.get('changed'))
        is_changed = true;
      else
      {
        _.each(wo.get('plan_work').models, function(pw) {
          if(pw.hasChanged() || pw.hasChanged('scope'))
          {
            is_changed = true;
            return true
          }
        });
      }
      if(is_changed)
        data_to_save.push(wo);
    }, this);

    // если сохранять нечего
    if(data_to_save.length == 0 && !holds)
    {
      $.jGrowl('Нет данных на сохранение.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      return;
    }

    // если были переносы, то необходимо проверить. что данные переносы затронули
    // полученную информацию необходимо отобразить пользователю
    // подготовка данных на сохранение
    var tmp_data = { 'contract_number': data_to_save[0].get('contract_number')};
    Routine.showLoader();
    $.ajax({
      type: "PUT",
      url: "/handlers/workorderdate/save",
      data: JSON.stringify({'data_to_save':data_to_save, 'info': tmp_data, 'holds': holds}),
      timeout: 35000,
      contentType: 'application/json',
      dataType: 'json',
      async:true
    }).done(function(result) {
      if(result['status']=="ok")
      {
        $.jGrowl('Данные успешно сохранены', { 'themeState':'growl-success', 'sticky':false, life: 10000});
        if(function_complete)
          function_complete();
      }
      else
        $.jGrowl('Ошибка сохранения данных. Подробности: ' + result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 10000 });
    }).always(function(){Routine.hideLoader()});
  },

  /**
   * Обработка строки формата: наряд/номер работы
   */
  parse_linked_work: function(val){
    val = Routine.trim(val);
    tmp = val.split('/');
    if(tmp.length<2 || !tmp[0] || !tmp[1] || !Routine.isDiggit(tmp[0]) || !Routine.isDiggit(tmp[1]))
      throw new SyntaxError("Данные некорректны");
    return {'workorder_number': tmp[0], 'work_number': tmp[1]};
  },

  /**
   * перезагрука формы
   */
  reloadPage: function(){
    this.FindView.onSearch(false);
  },

  /**
   * Функция сохранения условных дат для группового варианта
   */
  linkConditionalDates: function(linked_work, days_before_start, collection, workorder_number){
    var self = this;
    if(!linked_work)
    {
      $.jGrowl('Необходимо ввести главную задачу', { 'themeState':'growl-error', 'sticky':false, life: 5000});
      return false;
    }
    // обработка прилинкованной задачи
    var linked_work_obj = null;
    try
    {
      linked_work_obj = this.parse_linked_work(linked_work);
    }
    catch (err) {
      $.jGrowl(err.message, { 'themeState':'growl-error', 'sticky':false, life: 5000});
      return false;
    }
    // отправка запроса на сервер с данными по корректировке
    Routine.showLoader();
    //  сбор данных
    var data_to_link = [];
    if(workorder_number)
      data_to_link.push({
          'workorder_number':workorder_number,
          'works': collection.models.filter(function(item){ return !item.get('locked') && item.get('status')!='completed'; }).map(function(item) { return item.get('_id');})
      });
    else
      _.each(collection.models, function (row) {
        data_to_link.push({'workorder_number': row.get('number'), 'works': row.get('plan_work').models.filter(function(item){ return !item.get('locked') && item.get('status')!='completed';}).map(function(item) { return item.get('_id');})});
      });

    $.ajax({
      type: "POST",
      url: "/handlers/workorderdate/link_group_work_to_work",
      data: JSON.stringify({'linked_work':linked_work_obj, 'days_before_start': days_before_start, 'data_to_link': data_to_link}),
      timeout: 35000,
      contentType: 'application/json',
      dataType: 'json',
      async:true
    }).done(function(result) {
        if(result['status']=="ok")
        {
          $.jGrowl('Данные успешно сохранены', { 'themeState':'growl-success', 'sticky':false, life: 10000});
          self.reloadPage();
        }
        else
          $.jGrowl('Ошибка сохранения данных. Подробности: ' + result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 10000 });
    }).always(function(){Routine.hideLoader();});
  },

  /**
   * Функция очистки условных дат для группового варианта
   */
   unlinkConditionalDates: function(collection, workorder_number)
  {
    //  сбор данных
    var data_to_unlink = [];
    if(workorder_number)
      data_to_unlink.push({'workorder_number':workorder_number, 'works': collection.models.filter(function(item){ return !item.get('locked') && item.get('status')!='completed'; }).map(function(item) { return item.get('_id');}) });
    else
      _.each(collection.models, function (row) {
        data_to_unlink.push({'workorder_number': row.get('number'), 'works': row.get('plan_work').models.filter(function(item){ return !item.get('locked') && item.get('status')!='completed'; }).map(function(item) { return item.get('_id');}) });
      });

    //var data_to_unlink = [{'workorder_number': workorder_number, 'works': collection.models.map(function(item) { return item.get('_id');})}];
    // если галку снимаем
    var msg = "Вы уверены, что хотите снять флаг условности даты? Данные будут сразу сохранены в БД для всех работ, входящих в указанную группу.";
    bootbox.confirm(msg, function(result){
        if(result)
        {
          // сброс флага на сервере
          Routine.showLoader();
          $.ajax({
            type: "POST",
            url: "/handlers/workorderdate/unlink_group_work_from_work",
            data: JSON.stringify(data_to_unlink),
            timeout: 35000,
            contentType: 'application/json',
            dataType: 'json',
            async:true
          }).done(function(result) {
              if(result['status']=="ok")
              {
                $.jGrowl('Данные успешно сохранены', { 'themeState':'growl-success', 'sticky':false, life: 10000});
                // вызываем перезагрузку всей формы
                App.reloadPage();
              }
              else
                $.jGrowl('Ошибка сохранения данных. Подробности: ' + result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 10000 });
          }).always(function(){Routine.hideLoader();});
        }
    });
  },
};
