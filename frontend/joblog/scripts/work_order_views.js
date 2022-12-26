///
/// Контрол управления нарядом
///
App.Views.OrderView = Backbone.View.extend({
  el: $("#pnlJobLogBody"),
  templates: {
    header:_.template($("#jobLogHeader").html()),
  },
  workItemsView:null,
  worksList:null,                     // коллекция работ
  sector: null,                       // инфомрация об участке со списком бригад
  workOrder: null,                    // информация о  наряде
  isWeekend: false,                   // флаг выходного дня
  isWorksDoneWithReject: false,       // работы выполнялись с отклонениями
  planNorm: null,                     // информация о плановой норме
  materialsList: null,                // информация о материалах из плановых норм
  workersList: null,                  // информация о рабочих выполнявших наряд
  workerItemsView: null,              // представление для списка работников наряда
  historyWorkerItemsView: null,       // представление истоории трудовых расчетов работников
  historyWorkersListCollection: null, // коллекция истории трудовых расчетов работников
  all_sectors_in_order: null,         // список кодов участков на всем заказе
  historyWorksListCollection: null,   // коллекция дат по которым менялись сьаусы или заносились факты
  factDate: null,                     // фактическая дата работ
  events:{
   'change .cb-weekend': 'OnChangeWeekEnd',
   'change .cb-works-done-with-reject': 'OnWorksDoneWithReject',
   'change .cb-extra-functions': 'onShowExtraFunctions',
   'click .btnOk': 'OnSave',
   'click .btnCancel': 'OnCancel',
   'change .ddl-common-status': 'OnChangeDdlCommonStatus'
  },
  initialize: function(){
    var self = this;
    Backbone.on("onWorkModelChanged",this.onWorkModelChanged, this);
    this.factDate = moment().format('DD/MM/YYYY');
    Backbone.on("control_panel:change_date",this.onChangeDate,this);
    this.onChangeDate([this, new Date()]);
  },
  hide: function()
  {
    $(this.el).hide();
  },
  show: function()
  {
    $(this.el).show();
  },
  /**
   * обработка события изменения данных в какой либо моделе работы
   */
  onWorkModelChanged: function(){ },
  /**
   * обработка события изменения фактической даты
   */
  onChangeDate: function(params){
    var tmp_date = params[1];
    this.factDate = tmp_date.format("dd/mm/yyyy");
    // проверка на выходной
    if(App.Weekends.indexOf(tmp_date.format("yyyy-mm-dd"))>-1)
      this.$('.cb-weekend').prop('checked',true);
    else
      this.$('.cb-weekend').prop('checked',false);

    // заполнение заголовка
    if(this.workOrder)
      this.$('.lbl-header').find('.lbl').html(this.templates.header($.extend({}, {'factDate': this.factDate},this.workOrder)));
  },

  /**
   * Обработка кнопки сохранения
   */
  OnSave: function()
  {
    var self = this;
    var haveFacts = false;
    var haveChanges =false;
    var haveOnlyHolds = true;
    //var sel_date = self.$('.tbDate').val();
    var sel_date = self.factDate;
    var works_with_duble_fact_dates = [];   // работы с задвоением фактов на дату
    var works_with_duble_status = [];       // работы для которых на отрезке времени идет задвоение статуса
    var works_without_plan_dates = [];      // работы для которых не задана плановая дата
    var works_with_wrang_fact_dates = [];   // факт после даты закрытия
    if(sel_date=="")
    {
      $.jGrowl("Задайте дату.", { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      return;
    }
    // дата факта
    fact_date = Routine.parseDate(sel_date,'dd/mm/yyyy');
    // сбор данных на сохранение
    var dataToSave = [];
    var completedWorksCount = 0;
    _.each(self.worksList.models, function (item) {
      // сбор выполненных работ
      var balanceVal = Routine.strToFloat(item.get('balance').toFixed(3));
      if(isNaN(balanceVal))
          balanceVal = 0;
      var isWorkCompleted = (item.get('status') =='completed' || (balanceVal - item.get('fact_scope'))==0);
      if(isWorkCompleted)
        completedWorksCount++;

      // сбор измененных данных
      if(item.get('changed'))
      {
        if (
          item.get('fact_scope')==0 &&
          item.get('status') == item.get('old_status') &&
          item.get('status') =='on_work')
        {
          self.$("input[value='"+item.get('id')+"']").parent().find('.tbFact').addClass('tberr');
        }

        if (item.get('fact_scope')>0 || item.get('status') =='completed' || item.get('status') =='on_hold')
          haveFacts = true;

        if (item.get('fact_scope') > 0)
          haveOnlyHolds = false;

        if (item.get('fact_scope')>=0 || item.get('status') !=item.get('old_status') || item.get('repeat'))
        {
           // если не заданы плановые даты, то помечаем как ошибку
          if(!item.get('date_start') || !item.get('date_finish'))
          works_without_plan_dates.push(item);
          // добавляем объект в итоговый список на созранение
          haveChanges = true;
          dataToSave.push(item.toJSON());
          // добавление дубликатов фактов на даты
          if(item.get('fact_dates').indexOf(sel_date)>-1)
            works_with_duble_fact_dates.push(item.toJSON());
          // если работа получила статус  = completed, необходимо проверить, чтобы
          // ее дата была позже всех фактовых дат
          if(item.get('max_fact_date') &&
            fact_date < new Date(item.get('max_fact_date')) &&
            isWorkCompleted)
            works_with_wrang_fact_dates.push(item);
          // проверяем если только зафиксирована смена статуса
          if(item.get('status') !=item.get('old_status'))
          {
            // добавление дубликатов статусов на отрезок времени
            var status_log = item.get('status_log');
            if(status_log && status_log.length==1 && status_log[0].status==item.get('status'))
            {
              if(Routine.timeToZero(Routine.convertToUTC(new Date(status_log[0]['date'])))>=fact_date)
                works_with_duble_status.push({'item':item.toJSON(), 'type':'next'});
              else
                works_with_duble_status.push({'item':item.toJSON(), 'type':'prev'});
            }
            else if(status_log && status_log.length>1)
            {
              var i=1;
              if(fact_date<=Routine.timeToZero(Routine.convertToUTC(new Date(status_log[0]['date']))) && status_log[0].status==item.get('status'))
                works_with_duble_status.push({'item':item.toJSON(), 'type':'next'});
              else if(fact_date>Routine.timeToZero(Routine.convertToUTC(new Date(status_log[status_log.length-1]['date']))) && status_log[status_log.length-1].status==item.get('status'))
                works_with_duble_status.push({'item':item.toJSON(), 'type':'prev'});
               else
              do
              {
                if(fact_date>=Routine.timeToZero(Routine.convertToUTC(new Date(status_log[i-1]['date']))) && fact_date<Routine.timeToZero(Routine.convertToUTC(new Date(status_log[i]['date']))))
                {
                  if(status_log[i-1].status==item.get('status'))
                    works_with_duble_status.push({'item':item.toJSON(), 'type':'prev'});
                  else
                    works_with_duble_status.push({'item':item.toJSON(), 'type':'next'});
                  break;
                }
                i++;
              }
              while (i < status_log.length-1)
            }
          }
        }
      }
    }, this);

    // сбор процента участия работников в проекте
    var workersToSave = [];
    _.each(self.workersList.models, function (item) {
      workersToSave.push(item.toJSON());
    });

    // если наряд закрыт и необходимо для него сохранить только трудовое учатие
    if(dataToSave.length==0 &&
      self.worksList.length == completedWorksCount &&
      self.sector['is_need_ctu'] )
    {
      // вызов сохранения только для трудового участия
      if(!self.workerItemsView.Validate(haveOnlyHolds))
        return
      App.save_workers({'workers': workersToSave, 'work_order': self.workOrder})
      return;
    }

    // проверка на ниличие неверных фактических объемов
    if(self.$('.tberr').length>0 )
     {
      $.jGrowl("Фактические объемы, помеченные красным заполнены некорректно.", { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      return;
    }
    // проверка на наличие фактов
    if(dataToSave.length==0)
    {
      $.jGrowl("Данные по фактам не изменились. Внесите необходимые изменения и повторите попытку.", { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      return;
    }
    if(works_without_plan_dates.length>0)
    {
      for(var w in works_without_plan_dates)
        $.jGrowl("Для работы: '"+works_without_plan_dates[w].get('name')+ " ["+works_without_plan_dates[w].get('code')+"]"+ "'' не заданы плановые даты.", { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      return;
    }
    // проверка на дублирование фактических дат работ
    if(works_with_duble_fact_dates.length>0)
    {
      $.jGrowl("Для работы: '"+works_with_duble_fact_dates[0]['name']+ " ["+works_with_duble_fact_dates[0]['code']+"]"+ "'' уже заносились факты на указанную дату.", { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      return;
    }
    if(works_without_plan_dates.length>0)
    {
      for(var w in works_without_plan_dates)
        $.jGrowl("Для работы: '"+works_without_plan_dates[w].get('name')+ " ["+works_without_plan_dates[w].get('code')+"]"+ "'' не заданы плановые даты.", { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      return;
    }
    // проверка на неверные даты для работ получивших статус = completed
    if(works_with_wrang_fact_dates.length>0)
    {
      for(var w in works_with_wrang_fact_dates)
        $.jGrowl("Для работы: '"+works_with_wrang_fact_dates[w].get('name')+ " ["+works_with_wrang_fact_dates[w].get('code')+"]"+ "'' нарушен порядок статусов работы. Смотрите историю ввода фактов. .", { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      return;
    }



    // #1674------------------------------------------------
    // суммарный процент трудового участия
    var workers_percent = self.workerItemsView.getFullPercent();
    if(haveOnlyHolds && self.sector['is_need_ctu'] && workers_percent > 0)
    {
       bootbox.confirm({
        message: 'На указанных рабочих будет учтён простой. Если рабочие работали на других нарядах, удалите рабочих из трудового участия в этом наряде.',
        buttons: { 'cancel': { label: 'Отмена' }, 'confirm': { label: 'Продолжить' } },
        callback: function(result) {
          if (result)
            continueSave();
        }
      });
      return;
    }
    //-------------------------------------------------------------------------------
    // #1676-------------------------------------------------------------------------
    var haveOverdue = self.workerItemsView.checkOnOverdueErrors();
    if(haveOverdue)
    {
      bootbox.confirm({
        message: 'Превышение 8-ми часового рабочего дня. Продолжить?.',
        buttons: { 'cancel': { label: 'Отмена' }, 'confirm': { label: 'Продолжить' } },
        callback: function(result) {
          if (result)
            continueSave();
        }
      });
      return;
    }
    //----------------------------------------------------------------------------------


    continueSave();
    function continueSave(){
      //--------------------------------------------------------------------------------
      // Если идет закрытие наряда по участку, требующему КТУ, то необходимо проверить
      // для всех ли работников задан процент участия в проекте
      if(self.sector['is_need_ctu'] && haveFacts && !self.workerItemsView.Validate(haveOnlyHolds))
        return;

      // проверка на выбранную бригаду
      var brigade = self.$('.ddl-brigade').val();
      //if(brigade=="" && haveChanges)
      if(brigade=="" && haveFacts)
      {
        $.jGrowl("Задайте бригаду.", { 'themeState':'growl-error', 'sticky':false, life: 10000 });
        return;
      }

      // проверка на задвоение статусов на отрезке времени
      /*if(works_with_duble_status.length>0)
      {
        $.jGrowl("Для работы: '"+works_with_duble_status[0]['item']['name']+ " ["+works_with_duble_status[0]['item']['code']+"]"+ "'' статус на указанную дату повторяет "+((works_with_duble_status[0]['type']=='prev')?'предыдущий':'следующий')+" по дате статус.", { 'themeState':'growl-error', 'sticky':false });
        return;
      }*/

      // iss: #165
      // если в заказе есть хотя бы 1 наряд на участок с кодом 3,
      // то проверку на изделия надо отключить для всех участков данного заказа
      var materialsToSave = [];
      if(self.all_sectors_in_order.indexOf(3)<0)
      {
        var completedMaterialsCount = 0;
        _.each(self.materialsList.models, function (item) {
           // сбор выполненных работ
          var balanceVal = Routine.strToFloat(item.get('balance').toFixed(3));
          if(isNaN(balanceVal))
              balanceVal = 0;
          if((balanceVal - item.get('fact_scope'))==0)
            completedMaterialsCount++;

          if(item.get('changed') && item.get('fact_scope')>0)
            materialsToSave.push(item.toJSON());
        });
        // если происходит закрытие всех работ, то необходимо проверить чтобы все собственные изделия были
        // заполнены полностью
        if(self.worksList.length == completedWorksCount && completedMaterialsCount != self.materialsList.length)
        {
            $.jGrowl("Не все изделия готовы.", { 'themeState':'growl-error', 'sticky':false, life: 10000 });
            return;
        }
        // если происходит закрытие всех работ, и есть выпускающие участки, но нет собственных изделий
        // то необходимо пользователям выдавать сообщение - Нет изделий для данного участка. Обратитесь в ПТО
        if(self.worksList.length == completedWorksCount && self.materialsList.length==0 && (self.sector['is_manufacturer']==1 || self.sector['is_output']==1))
        {
            $.jGrowl("Нет изделий для данного участка. Обратитесь в ПТО.", { 'themeState':'growl-error', 'sticky':false, life: 10000 });
            return;
        }
      }

      if(workersToSave.length > 0 && self.workOrder.sector_type.toLowerCase()!='цех'){
        // сбор и подготовка данных
        var toSave = {
             //"date": self.$('.tbDate').val(),
             "date": self.factDate,
             'work_order': self.workOrder,
             'workers': workersToSave
        };

        // проверка работников на участие в других договорах
        Routine.showLoader();
        $.ajax({
          url: '/handlers/joblog/check_workers',
          type: 'POST',
          dataType: 'json',
          contentType: "application/json; charset=utf-8",
          data: JSON.stringify(toSave),
          timeout: 35000,
          async: true,
          success: function (result, textStatus, jqXHR) {
            if(result.status=='error')
               $.jGrowl(result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 10000 });
            else
            {
              // проверка даты
              //if(self.$('.tbDate').val() ==new Date().format("dd/mm/yyyy") && haveFacts)
              if(self.factDate ==new Date().format("dd/mm/yyyy") && haveFacts)
              {
                bootbox.confirm("Работы выполнялись сегодня'?", function(result)
                {
                  if(result)
                  {
                    self.checkTransferDates(
                      dataToSave,
                      //self.$('.tbDate').val(),
                      self.factDate,
                      materialsToSave,
                      workersToSave
                   );
                  }
                });
              }
              else
              {
                self.checkTransferDates(
                  dataToSave,
                  //self.$('.tbDate').val(),
                  self.factDate,
                  materialsToSave,
                  workersToSave
                );
              }
            }
          }
        }).always(function(){Routine.hideLoader();});
      }
      else{
        // проверка даты
        //if(self.$('.tbDate').val() ==new Date().format("dd/mm/yyyy") && haveFacts)
        if(self.factDate == new Date().format("dd/mm/yyyy") && haveFacts)
        {
          bootbox.confirm("Работы выполнялись сегодня'?", function(result)
          {
            if(result)
              self.checkTransferDates(
                dataToSave,
                // self.$('.tbDate').val(),
                self.factDate,
                materialsToSave,
                workersToSave
              );
          });
        }
        else
          self.checkTransferDates(
            dataToSave,
            //self.$('.tbDate').val(),
            self.factDate,
            materialsToSave,
            workersToSave
          );
      }
    }

  },

  /**
   * проверка на необходимость переноса дат
   * factDate = dd/mm/yyyy
   */
  checkTransferDates: function(dataToSave, factDateString, materialsToSave, workersToSave)
  {
     var self = this;
     Routine.showLoader();
     var needTransfers = false;
     var factDate = Routine.parseDate(factDateString,'dd/mm/yyyy');
     var isWorksDoneWithReject = this.$('.cb-works-done-with-reject').is(':checked');
     $.ajax({
        url: '/handlers/joblog/getplandates/',
        type: 'GET',
        dataType: 'json',
        contentType: "application/json; charset=utf-8",
        data: { 'num' : App.CurrentWorkOrder },
        timeout: 35000,
        success: function (result, textStatus, jqXHR) {
          Routine.hideLoader();
          if(result.status=='error')
            $.jGrowl(result.msg, { 'themeState':'growl-error', 'sticky':false, life: 10000 });
          else if(result.status=="ok")
          {
            // получение списка работ с переносом дат
            var dataTransfers = result.result;
            var haveTransfers = false;
            var haveHolds = false;      // простои
            var havePauses = false;     // паузы
            var haveRejects = false;    // факты с отклонениями
            // сбор данных по кому необходим перенос сроков
            for(var i in dataToSave)
            {
              var item = dataToSave[i];
              var transferItem = null;
              // фиксируем корректировку плановой даты фактом
              // if((item['fact_scope']>0 || ((item['status']!=item['old_status'] || item['repeat']) && (item['status']=='on_hold' || item['status']=='on_pause'))) && item['work_id'] in dataTransfers)
              if(item['fact_scope']>=0  && item['work_id'] in dataTransfers)
              {
                transferItem = dataTransfers[item['work_id']];
                var dateStart = Routine.timeToZero(new Date(transferItem['date_start']));
                var dateFinish = Routine.timeToZero(new Date(transferItem['date_finish']));
                var haveFacts = transferItem['have_facts'];
                // количество дней для переноса
                var shift = 0;
                // если дата факта превышает план и факт не первый,
                // то необходимо передвинуть плановую дату окончания
                if(factDate > dateFinish)
                {
                  haveTransfers = true;
                  shift =  Math.floor((Date.parse(factDate) -  Date.parse(dateFinish))/ 86400000);
                  needTransfers = true;
                  item['note'] = '';
                  item['type'] = 'finish';
                  item['shift'] = shift;
                  item['fact_date'] = factDate;
                  item['plan_date'] = dateFinish;
                  item['is_first_fact'] = false;
                }
              }
              // если есть паузы и простои
              //if((item['status']!=item['old_status'] || item['repeat']) && (item['status']=='on_hold' || item['status']=='on_pause'))
              if(item['status']=='on_hold' || item['status']=='on_pause')
              {
                 needTransfers = true;
                 if (item['status']=='on_hold')
                  haveHolds = true;
                if (item['status']=='on_pause')
                  havePauses = true;
              }
              // если есть работы с отклонением
              if(item['fact_scope']>0 && item['status'] =='on_work_with_reject')
                 needTransfers = haveRejects = true;
            }

            // сбор и подготовка данных
            toSave = {
              "have_rejects": haveRejects,
              "have_holds": haveHolds,
              "have_pauses": havePauses,
              "have_transfers": haveTransfers,
              "brigade_id" :  null, //self.$('.ddl-brigade').val(),
              "weekend": self.$('.cb-weekend').is(':checked'),
              "fact_works": dataToSave,
              'work_order': self.workOrder,
              //"date": self.$('.tbDate').val(),
              "date": self.factDate,
              'fact_materials': materialsToSave,
              'plan_norm': self.planNorm,
              'workers': workersToSave
            };

            // если необходим перенос сроков, показываем диалог настройки переносов
            if(needTransfers){
              // показываем фрму переноса сроков
              App.DatesTransferView.render(toSave);
              self.hide();
            }
            else{
              // если перенос не требуется, то сразу вызываем сохранение данных
              self.save(toSave);
            }
          }
          else
          {
            $.jGrowl("Ошибка сервера.", { 'themeState':'growl-error', 'sticky':false, life: 10000 });
            Routine.hideLoader();
          }
        }
    });
  },

  /**
   * Функция проверки данных
   */
  save: function(dataToSave)
  {
    App.save(dataToSave);
  },

  /**
   * Обработка кнопки отмена
  **/
  OnCancel: function()
  {
    this.clear();
  },

  /**
   * Обработка смены общего статуса
   */
  OnChangeDdlCommonStatus: function()
  {
    var ddlCommonStatus = this.$('.ddl-common-status');
    var selStatus = ddlCommonStatus.val();
    // если выбран не пустой статус
    if(selStatus!="")
    {
      // пробегаем по всем активным статусам и делаем смену на текущий
      this.$('.ddl-status:enabled').val(selStatus).change();
    }
  },

  /**
   * Обработка события показа/сокрытия расширенных настроек
   */
  onShowExtraFunctions: function(e){
    if($(e.target).prop('checked'))
      this.$('.pnl-extra-functions').show();
    else
      this.$('.pnl-extra-functions').hide();
  },

  /**
   * Обработка чекбокса наличия работ с отклонениями
   */
  OnWorksDoneWithReject: function(e){
    this.isWorksDoneWithReject = false;
    this.$('.cb-mark-as-rejected').hide();
    if($(e.target).prop('checked'))
    {
      this.isWorksDoneWithReject = true;
      this.$('.cb-mark-as-rejected').show();
    }
    // проходим по всем работам у которых выставлен не пустой факт, и
    // выставляем/снимаем статус = on_work_with_rejection
    _.each(this.worksList.models, function (item) {
      if(item.get('fact_scope')!=0)
      {
        if(this.isWorksDoneWithReject)
          item.set('status', 'on_work_with_reject');
        else
          item.set('status', 'on_work');
      }
    }, this);
  },

  /**
   * Обработка чекбокса выходного дня
   */
  OnChangeWeekEnd: function()
  {
    var self = this;
    var cbWeekEnd = this.$('.cb-weekend');
    if(!cbWeekEnd.is(':checked'))
    {
      bootbox.confirm("Подтверждаете отключение опции 'Внерабочее время'?", function(result)
      {
        if(!result)
          cbWeekEnd.prop('checked', true);
        else
          self.isWeekend = false;
      });
    }
  },

  /**
   * Отрисовка формы
  **/
  render:function(){
    var self = this;
    $(self.el).show();

    self.$('.cb-works-done-with-reject').prop('checked',false);
    self.isWorksDoneWithReject = false;

    // кнопка сохренения
    self.$(".btnOk").prop('disabled',false);
    // заполнение заголовка
    //self.$('.lbl-header').find('.lbl').html(self.templates.header(self.workOrder));
    self.$('.lbl-header').find('.lbl').html(self.templates.header($.extend({}, {'factDate': self.factDate},self.workOrder)));
    // заполнение выпадающего списка бригад
    self.fillBrigades(self.sector.brigades);
    // проставление флага, если выходной
    if(self.isWeekend==true)
      self.$('.cb-weekend').prop('checked',true);
    // заполнение работ
    self.workItemsView = new  App.Views.WorkItemsView({collection: self.worksList, parent: self}).render();
    // представление истории ввода фактов
    self.historyFactItemsView = new  App.Views.HistoryFactItemsView({collection: self.historyWorksListCollection});
    // заполнение материалов
    self.materialItemsView = new  App.Views.MaterialItemsView({collection: self.materialsList}).render();
    // представление пормы добавления трудовых расчетов по работникам
    self.workerItemsView = new  App.Views.WorkerItemsView({parent:this, model:self.workOrder});
    // представление истории трудовых расчетов по работникам
    self.historyWorkerItemsView = new  App.Views.HistoryWorkerItemsView();
    self.workerItemsView.collection = self.workersList;
    self.$('.pnl-add-workers-container').html(self.workerItemsView.render().el);
    if(self.sector['is_need_ctu'])
    {
      self.workerItemsView.show();
      self.$('.lbl-workers-header').show();
    }
    else
    {
      self.workerItemsView.hide();
      self.$('.lbl-workers-header').hide();
    }
    // заполнение истории трудовых расчтов работников
    self.historyWorkerItemsView.collection = self.historyWorkersListCollection;
    self.historyWorkerItemsView.render();
    // кнопка сохранения не активна, если наряд закрыт.
    // Исключением является ситуация, когда наряд закрыт,
    // требуется и не заполнено трудовое участие
    if(self.workOrder['status'] =="completed")
    {
      self.$(".btnOk").prop('disabled',true);
      //if((self.sector['type'] == 'Цех' || self.sector['type']=='Монтаж' || self.sector['type'] =='СМР' ) && (self.workersList.size()==0 /*||  has_access('joblog','o')*/))
      if(self.sector['is_need_ctu'] && (self.workersList.size()==0 /*||  has_access('joblog','o')*/))
        self.$(".btnOk").prop('disabled',false);
    }

     // если есть собственые изделия, то показываем для них элементы управления
     if(self.materialsList.length>0)
     {
      self.$('.lbl-materials-header').show();
      self.$('.data-materials-header').show();
      self.$('#pnlMaterialsDataContainer').show();
     }
     else
     {
      self.$('.lbl-materials-header').hide();
      self.$('.data-materials-header').hide();
      self.$('#pnlMaterialsDataContainer').hide();
     }

     // событие
     self.onChangeDate([self, self.factDate? Routine.parseDate(self.factDate,'dd/mm/yyyy'): new Date() ]);


  },

  /**
   * Заполнение списка бригад
  **/
  fillBrigades: function(data)
  {
     var self = this;
     var filter = self.$('.ddl-brigade');
    filter.empty();
    filter.append("<option value=''>Исполнитель</option>");
    _.each(data, function (item) {
      var option = $("<option/>", {
        value: item['_id'],
        text: item['teamlead']
      }).appendTo(filter);
    });
  },

  /**
   *  Очистка формы наряда
  **/
  clear: function()
  {
    var self = this;
    // форма данных
    $(self.el).hide();
    // дата
    // self.$('.tbDate').val(new Date().format("dd/mm/yyyy"));
    // self.$('.date-picker').datepicker('setEndDate', new Date().format("dd/mm/yyyy"));
    // бригада
    self.$('.ddl-brigade').empty();
    // выходной день
    if(self.isWeekend==true)
      self.$('.cb-weekend').prop('checked',true);
    else
      self.$('.cb-weekend').prop('checked',false);
    // основной контейнер со списком работ и материалов
    self.$('.data-container').empty();
    // заголовок
    self.$('lbl-header').find('.lbl').empty();
    self.$('lbl-header').find('.ddl-common-status').val('');

  }
});

///
/// Контрол управленяи списокм работ
///
App.Views.WorkItemsView = Backbone.View.extend({
  parent: null,
  el: $("#pnlJobLogDataContainer"),
  initialize: function () {
    this.parent = this.options['parent'];
  },
  render: function () {
    var that = this;
      _.each(this.collection.models, function (item) {
        that.renderWork(item);
    }, this);
  },
  renderWork: function (item) {
    var workItemView = new App.Views.WorkItemView({model: item, parent: this});
    this.$el.append(workItemView.render().el);
  },

  /**
   * Проверка на режим выполнения работ с отклонением
   */
  isWorksDoneWithReject: function(){
    return this.parent.isWorksDoneWithReject;
  }
});

///
/// Контрол управленяи элементом работы
///
App.Views.WorkItemView = Backbone.View.extend({
  parent: null,
  tagName:'div',
  className:'line data-item',
  templates: {
    main:_.template($("#jobLogWorkItem").html()),
  },
  /**
   * Присоедиение событий
   */
  events:{
    'change .cb-mark-as-rejected': 'onWorkDoneWithReject',
    'blur .tbFact': 'onFactBlur',
    'change .cb-mark-as-completed': 'onMarkStatusAsCompleted',
    'change .cb-repeat-operation': 'onRepeatOperation',
    'click .lnk-transfer-fact': 'onShowTransferFactDLG'
  },
  initialize: function () {
    var self = this;
    this.parent = this.options['parent'];
    this.model.on("change:status", function(e){
      this.$('.cb-mark-as-rejected').prop('checked',false);
      if(this.model.get('status')=='on_work_with_reject')
        this.$('.cb-mark-as-rejected').prop('checked',true);
    }, this);
  },
  /**
   * Проверка на режим выполнения работ с отклонением
   */
  isWorksDoneWithReject: function(){
    return this.parent.isWorksDoneWithReject();
  },
  /**
   * Работа выполнялась с отклонением
   **/
  onWorkDoneWithReject: function(e){
    if($(e.target).prop('checked'))
      this.model.set('status','on_work_with_reject')
    else
      this.model.set('status','on_work')
  },
  /**
   * Показать диалог перезачета факта
   */
  onShowTransferFactDLG: function(){
    var dlg = new App.Views.transferFactDlgView({'model': this.model.toJSON()});
    dlg.on("dialogsave",function(e){
      if(e.status=="ok")
      {
        $.jGrowl('Данные успешно сохранены.', { 'themeState':'growl-success', 'sticky':false, life: 10000});
        setTimeout(function(){
          App.FindView.OnSearch();
        },100);
      }
    });
  },

  /**
   * Обработка события потери фокуса поля ввода факстического объема
   */
  onFactBlur:function(){
    var self = this;
    var tbFactScope= this.$('.tbFact');
    // если не вводили факт, или ввели но и предыдущий статус это простой
    // то делать ничего не надо, выходим из функции
    this.$('.cb-mark-as-rejected').prop('disabled',false);
    this.$('.cb-mark-as-rejected').prop('checked',true);

    // if(tbFactScope.val()=='' ||
    //  (Routine.strToFloat(tbFactScope.val())==0 && this.model.get('old_status')==='on_hold'))
    if(tbFactScope.val()=='')
    {
      this.$('.cb-mark-as-rejected').prop('disabled',true);
      this.$('.cb-mark-as-rejected').prop('checked',false);
      return;
    }

    var tbBalance= this.$('.tbBalance');
    var balanceVal = Routine.strToFloat(self.model.get('balance').toFixed(3));
    if(isNaN(balanceVal))
      balanceVal = 0;
    var factScopeVal = Routine.strToFloat(tbFactScope.val());
    if(isNaN(factScopeVal))
    {
      factScopeVal = 0;
      tbFactScope.val('0');
    }
    else
      tbFactScope.val(Routine.floatToStr(factScopeVal.toFixed(3)));
    tbFactScope.removeClass('tberr');
    if(factScopeVal>balanceVal)
    {
      tbFactScope.addClass('tberr');
      var msg = "Фактический объем работы не может превышать плановый ";
      msg+="(по наряду остаток: " + Routine.addCommas(balanceVal.toFixed(3)," ") + "; ";
      msg+="по факту: " + Routine.floatToStr(factScopeVal) + ").";
      $.jGrowl(msg, { 'themeState':'growl-error', 'sticky':false, life: 10000 });
    }
    // если введен нулевой объем, то это означает пользователь
    // выставляет простой работы. Статус меняется, елси предыдущий статус не был равен простою
    if(factScopeVal==0)
    {
      self.model.set({'status': 'on_hold'});
      this.$('.cb-mark-as-rejected').prop('disabled',true);
      this.$('.cb-mark-as-rejected').prop('checked',false);
    }
    else
    {
      if(this.isWorksDoneWithReject())
        self.model.set({'status': 'on_work_with_reject'});
      else
        self.model.set({'status': 'on_work'});
    }
    // chande data in model
    self.model.set({'changed':true, 'fact_scope': factScopeVal});
  },

  /**
   * Отметка флага повторения операции
   */
  onRepeatOperation: function()
  {
    if(this.$('.cb-repeat-operation').is(':checked'))
      this.model.set({'changed':true, 'repeat':true});
    else
      this.model.set({'changed':true, 'repeat':false});
  },

  /**
   * Обработка флага завершенности работы
   */
  onMarkStatusAsCompleted:function(e){
    if($(e.target).prop('checked')){
      this.markStatusAsCompleted();
    }
  },

  /**
   * Выставление статуса завершенности работе
   */
  markStatusAsCompleted: function(){
    var self = this;
    var tbFactScope= this.$('.tbFact');
    var cbMarkAsCompleted= this.$('.cb-mark-as-completed');
    var tbBalance=  this.$('.tbBalance');
    var lnkTransferFact = this.$('.lnk-transfer-fact');
    var balanceVal = self.model.get('balance').toFixed(3);
    var balanceVal = Routine.strToFloat(self.model.get('balance').toFixed(3));
    if(isNaN(balanceVal))
        balanceVal = 0;
    var factScopeVal = Routine.strToFloat(tbFactScope.val());
    if(isNaN(factScopeVal))
        factScopeVal = 0;
    // нельзя закрыть работу с превышающим фактом
    if(factScopeVal>balanceVal)
    {
      tbFactScope.addClass('tberr');
      var msg = "Фактический объем работы не может превышать плановый ";
      msg+="(по наряду остаток: " + Routine.floatToStr(balanceVal) + "; ";
      msg+="по факту: " + Routine.floatToStr(factScopeVal) + ").";
      $.jGrowl(msg, { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      cbMarkAsCompleted.prop('checked',false);
      return false;
      //if(self.model.get('old_status') != "on_work" && self.model.get('old_status') != "")
      //  self.$('.cb-repeat-operation').show();
    }
    else if(factScopeVal<balanceVal && this.model.get('payment_id'))
    {
      $.jGrowl("Платеж не может быть закрыт объемом меньше планового. По плану остаток: " + Routine.floatToStr(balanceVal)+"; по факту: "+ Routine.floatToStr(factScopeVal) + " ", {'themeState':'growl-error', 'sticky':false, life: 10000 });
      cbMarkAsCompleted.prop('checked',false);
      return false;
    }
    else if(factScopeVal<balanceVal)
    {
      var msg = "Введенные объемы работ не совпадают<br/> (по наряду остаток: " + Routine.floatToStr(balanceVal)+"; по факту: "+ Routine.floatToStr(factScopeVal) + ") ";
      msg += "<br/>Закрыть работу с меньшим объемом?";
      bootbox.confirm(msg, function(result)
      {
        if(!result)
        {
          cbMarkAsCompleted.prop('checked',false);
          if(self.model.get('old_status') != "on_work" && self.model.get('old_status') != "")
            self.$('.cb-repeat-operation').show();
        }
        else
        {
          lnkTransferFact.hide();
          cbMarkAsCompleted.prop('disabled',true);
          tbFactScope.prop('disabled',true);
          self.model.set({'changed':true, 'status': 'completed'});
        }
      });
    }
    else
    {
      lnkTransferFact.hide();
      cbMarkAsCompleted.prop('disabled',true);
      tbFactScope.prop('disabled',true);
      self.model.set({'changed':true, 'status': 'completed'});
    }
  },

  /**
   * Отрисовка элемента
  **/
  render: function () {
    this.$el.html(this.templates.main(this.model.toJSON()));
    this.$('.tbFact').numeric({ negative: false, decimal: ',' });
    return this;
  }
});
