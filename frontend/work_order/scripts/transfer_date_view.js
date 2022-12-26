App.Views.TransferContainerView = Backbone.View.extend({
  el:'#transfer-modal',
  templates: {
    template: _.template($('#TransferContainerTemplate').html())
  },
  events:{
    'close': 'closeDialog',
  },
  transferFormView: null,     // форма переноса сроков
  stopActivityFormView: null, // форма приостановки работ
  initialize:function(){
    this.render();
  },
  render: function(){
    var self = this;
    // отрисовка основной формы
    this.$el.html(this.templates.template());
    // добавление представления формы перенос асроков
    this.transferFormView = new App.Views.TransferFormView({'el': this.$('#tab-shift-dates')});
    this.transferFormView.render();
    // добавление представления присотановки работ
    this.stopActivityFormView = new App.Views.StopActivityFormView({'el': this.$('#tab-stop-activity')});
    this.stopActivityFormView.render();

    // навешивание события на сокрытие формы
    this.$el.on('hidden', function () {
      self.$el.empty().html();
      self.undelegateEvents();
      self.$el.removeData().unbind();
    });
  },
  closeDialog: function(){
    this.$el.modal('hide');
  }
});

///---------------------------------------------------------------------------------------------------------
/// Представление формы приостановки работ
///---------------------------------------------------------------------------------------------------------
App.Views.StopActivityFormView = Backbone.View.extend({
  events:{
    'change #transfer-reason': 'changeTransferReason',
    'click .save-data': 'saveData',
    'click .close-dialog': 'closeDialog',
  },
  initialize:function(){
  },
  render:function(){
    // события на календарь
    var now = moment().startOf('day');
    // дата начала
    this.$('.datepicker1').val(now.format("DD.MM.YYYY"));
    var checkin = this.$('.datepicker1').datepicker({
      calendarWeeks: true,
      format:'dd.mm.yyyy',
      weekStart:1,
      endDate: "+0d",
      autoclose: true,
      onRender: function(date) {
      }
    }).on('changeDate', function(ev) {
    }).data('datepicker');
  },
  closeDialog: function(){
    $(this.el).trigger('close', [this]);
  },
  /**
   * Смена причины переноса дат
   */
  changeTransferReason: function(e)
  {
    if(
      this.$('#transfer-reason').val()==App.PlanShiftReasonSystemObjects['ANOTHER_WORK'] ||
      this.$('#transfer-reason').val()==App.PlanShiftReasonSystemObjects['NOT_PLAN_WORK'] ||
      this.$('#transfer-reason').val()==App.PlanShiftReasonSystemObjects['PLAN_WORK']
    ){
      this.$('.row-transfer-reason-detail').show();
    }
    else{
      this.$('.row-transfer-reason-detail').hide();
    }
  },
  /**
   * Сохранение данных
   */
  saveData: function(){
    var self = this;
    var need_comment = false;
    var data_to_check = [];  // список нарядов уточнений причин переноса
    var reason_nodes = [];   // список нарядов уточнений причин переноса в формате на сохранение
    var hold_date = Routine.parseDate(this.$('.datepicker1').val(),'dd.mm.yyyy');
    var hold_date_str = this.$('.datepicker1').val();

    // структура данных для сохранения простоев
    var holds_to_save = {
      'reason_id': self.$('#transfer-reason').val(),
      'reason': self.$('#transfer-reason :selected').text(),
      'note': self.$('#transfer-comment').val(),
      'status': "on_hold",
      'reason_nodes': reason_nodes,
      'date': hold_date_str,
      'works':[] // список идентификаторов работ которым необходимо проставить простой
    }

    if(!hold_date){
      $.jGrowl('Не задана дата простоя работ.', { 'themeState':'growl-error', 'sticky':false });
      return;
    }
    // проверка и сбор данных с формы
    if (this.$('#transfer-reason').val() == '0'){
      $.jGrowl('Выберите причину корректировки.', { 'themeState':'growl-error', 'sticky':false });
      return;
    }
    // если в причине корректировки задано: "Другое", то комментарий обязателен
    if(this.$('#transfer-reason').val()==App.PlanShiftReasonSystemObjects['OTHER'] && this.$('#transfer-comment').val()=="")
    {
      $.jGrowl('Для причины: "Другое", комментарий обязателен для заполнения.', { 'themeState':'growl-error', 'sticky':false });
      return;
    }
    // если в причине корректировки задан - перенос
    if(
      this.$('#transfer-reason').val()==App.PlanShiftReasonSystemObjects['ANOTHER_WORK'] ||
      this.$('#transfer-reason').val()==App.PlanShiftReasonSystemObjects['NOT_PLAN_WORK'] ||
      this.$('#transfer-reason').val()==App.PlanShiftReasonSystemObjects['PLAN_WORK']
    )
    {
      if(!this.$('#transfer-reason-detail').val())
      {
        $.jGrowl('Заполните уточнение причины корректировки.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
        return;
      }
      var tmp = this.$('#transfer-reason-detail').val().replace(/\s+/g, '').split(',');
      for(var i in tmp)
      {
        var i_tmp = tmp[i].split('/');
        if(i_tmp.length>1)
        {
          if(!Routine.strToInt(i_tmp[0]) || !Routine.strToInt(i_tmp[1]))
          {
            $.jGrowl('Ошибка формата уточнения к причине переноса. Убедитесь что все указанные наряды и работы корректны.', { 'themeState':'growl-error', 'sticky':false });
            return;
          }
          data_to_check.push({
            'workorder_number': Routine.strToInt(i_tmp[0]),
            'work_code': Routine.strToInt(i_tmp[1])
          })
          reason_nodes.push([Routine.strToInt(i_tmp[0]), Routine.strToInt(i_tmp[1])]);
        }
        else
        {
          if(!Routine.strToInt(i_tmp[0]))
          {
            $.jGrowl('Ошибка формата уточнения к причине переноса.  Убедитесь что все указанные наряды и работы корректны.', { 'themeState':'growl-error', 'sticky':false });
            return;
          }
          data_to_check.push({
            'workorder_number': Routine.strToInt(i_tmp[0]),
            'work_code': null
          })
          reason_nodes.push([Routine.strToInt(i_tmp[0])]);
        }
      }
    }

    // сбор переносов, образовавшихся в результате простоя работ
    var curDateStart = null;
    var curDateFinish = null;
    var have_only_one_date = false; // есть работы для которых не заданы планы
    var works_with_duble_fact_dates = []; // работы с задвоением фактов на дату
    var works_with_wrang_fact_dates = []; // просто выходит за дату фактического завершения работы
    _.each(App.DataCollection.models, function (wo)
    {
      _.each(wo.get('plan_work').models, function(pw)
      {
        try
        {
          if (pw.get('checked') && pw.get('date_start') !=null && pw.get('date_finish')!=null)
          {
            // текущая плановая дата окончания работ с учетом переносов
            curDateFinish = (pw.get('date_finish_with_shift')!=null)? new Date(Routine.parseDate(pw.get('date_finish_with_shift'))) : new Date(Routine.parseDate(pw.get('date_finish'),'dd.mm.yyyy'));
            curDateStart = (pw.get('date_start_with_shift')!=null)? new Date( Routine.parseDate(pw.get('date_start_with_shift'))): new Date(Routine.parseDate(pw.get('date_start'),'dd.mm.yyyy'));

            // фиксируем перенос. если дата приостановки превысила дату окончания
            if(hold_date>curDateFinish)
            {

              var finish_shift = Routine.daysDiff(hold_date, curDateFinish);
              curDateFinish.setDate(curDateFinish.getDate() + finish_shift);
              var nowDate =moment().startOf('day');
              var shifts = [];
              if(finish_shift!=0)
              {
                var plan_shift_finish = {
                  'reason_id': self.$('#transfer-reason').val(),
                  'reason': self.$('#transfer-reason :selected').text(),
                  'shift': finish_shift,
                  'note': self.$('#transfer-comment').val(),
                  'type': "finish",
                  'date_change':'new',
                  'reason_nodes': reason_nodes
                };
                shifts.push(plan_shift_finish);
              }
              if(shifts.length>0)
                pw.set('plan_shifts', shifts);
            }

            // добавление дубликатов фактов на даты
            if(pw.get('fact_work')){
              _.each(pw.get('fact_work'), function(fw){
                if(moment(fw['date']).format('DD.MM.YYYY') == hold_date_str)
                  works_with_duble_fact_dates.push({
                    'wo_number': wo.get('number'),
                    'w_code': pw.get('code')
                  });
              });
            }

            if(pw.get('status_log')){
              var complete_date = null;
              _.each(pw.get('status_log'), function(sl){
                if(sl['status']=='completed')
                  complete_date = sl['date'];
                if(moment(sl['date']).format('DD.MM.YYYY') == hold_date_str)
                  works_with_duble_fact_dates.push({
                    'wo_number': wo.get('number'),
                    'w_code': pw.get('code')
                  });
              });
              // если работа фактически завершена и новая дата простоя выходит за дату завершения
              if(complete_date && hold_date>new Date(moment(complete_date, 'YYYY-MM-DDTHH:mm:ss')))
                works_with_wrang_fact_dates.push({
                  'wo_number': wo.get('number'),
                  'w_code': pw.get('code'),
                  'w_name': pw.get('name')
              });
            }

            // фиксируем простой
            holds_to_save.works.push(pw.get('_id'));
          }
          else if(pw.get('checked') && ((pw.get('date_start') !=null && pw.get('date_finish')==null) || (pw.get('date_start') ==null && pw.get('date_finish')!=null)))
            have_only_one_date = true;
        }
        catch(err){}
      });
    }, this);

    if(have_only_one_date)
    {
      $.jGrowl('Для некоторых работ задана только дата начала. Необходимо заполнить обе даты.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      return;
    }

    // проверка на дублирование фактических дат работ
    if(works_with_duble_fact_dates.length>0)
    {
      $.jGrowl("Для работы: '"+works_with_duble_fact_dates[0]['wo_number']+ "/"+works_with_duble_fact_dates[0]['w_code']+ "'' уже заносились факты на указанную дату.", { 'themeState':'growl-error', 'sticky':true, life: 10000 });
      return;
    }

    // проверка на неверные даты для работ получивших статус = completed
    if(works_with_wrang_fact_dates.length>0)
    {
      for(var w in works_with_wrang_fact_dates)
        $.jGrowl("Для работы: '"+works_with_wrang_fact_dates[w]['wo_number']+ "/" +works_with_wrang_fact_dates[w]['w_code'] + "'' нарушен порядок статусов работы. Смотрите историю ввода фактов. .", { 'themeState':'growl-error', 'sticky':true, life: 10000 });
      return;
    }

    //  проверка на корректность пояснения к причине переноса
    if(
      this.$('#transfer-reason').val()==App.PlanShiftReasonSystemObjects['ANOTHER_WORK'] ||
      this.$('#transfer-reason').val()==App.PlanShiftReasonSystemObjects['NOT_PLAN_WORK'] ||
      this.$('#transfer-reason').val()==App.PlanShiftReasonSystemObjects['PLAN_WORK']
    )
    {
      Routine.showLoader();
      $.ajax({
          type: "POST",
          url: "/handlers/workorderdate/check_reason_note_format",
          data: JSON.stringify({'data': data_to_check, 'reason': self.$('#transfer-reason').val()}),
          timeout: 55000,
          contentType: 'application/json',
          dataType: 'json',
          async:true
      }).done(function(result) {
        if(result['status']=="error")
          $.jGrowl(result['msg'], {'themeState':'growl-error', 'sticky':false, life: 10000 });
        else
        {
          // сохранение данных
          App.save(App.DataCollection, holds_to_save, function(){
            // закрыть диалог
            self.closeDialog();
            // обновить данные на форме
            App.FindView.onSearch();
          });
        }
      })
      .error(function(){
        $.jGrowl('Ошибка проверки формата уточнения к причине переноса. ', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      }).always(function(){Routine.hideLoader();});
    }
    else
    {
      // сохранение данных
      App.save(App.DataCollection, holds_to_save, function(){
        // закрыть диалог
        self.closeDialog();
        // обновить данные на форме
        App.FindView.onSearch();
      });
    }
  }
});

///---------------------------------------------------------------------------------------------------------
/// Представление формы переноса дат
///---------------------------------------------------------------------------------------------------------
App.Views.TransferFormView = Backbone.View.extend({
  worksToTransferCount: 0,
  start_date: null,
  finish_date: null,
  events:{
    'click .close-dialog': 'closeDialog',
    'click .transfer-data': 'transferData',
    'change #transfer-reason': 'changeTransferReason',
    'change #transfer-type': 'changeTransferType',
    'click .cancel-data': 'cancelData',
    'click .save-data': 'saveData',
  },
  initialize:function(){
    this.worksToTransferCount = 0;
    this.start_date=null;
    this.finish_date= null;
  },
  render:function(){
    var self = this;
    var start_date = null;
    var finish_date = null;
    var contract_plan_start_date = null;
    var contract_plan_finish_date = null;

    // сбор данных об отмеченных на перенос работах
    _.each(App.DataCollection.models, function (wo)
    {
        _.each(wo.get('plan_work').models, function(pw)
        {
            if (pw.get('checked') && pw.get('date_start') !=null && pw.get('date_finish')!=null)
            {
              var tmp_start_date = (pw.get('date_start_with_shift'))?Routine.parseDate(pw.get('date_start_with_shift'),'dd.mm.yyyy'):Routine.parseDate(pw.get('date_start'),'dd.mm.yyyy');
              if(!start_date || start_date>tmp_start_date)
                start_date = tmp_start_date;
              var tmp_finish_date = (pw.get('date_finish_with_shift'))?Routine.parseDate(pw.get('date_finish_with_shift'),'dd.mm.yyyy'):Routine.parseDate(pw.get('date_finish'),'dd.mm.yyyy');
              if(!finish_date || finish_date<tmp_finish_date)
                finish_date = tmp_finish_date;
              self.worksToTransferCount++;
            }
            if (pw.get('checked') && pw.get('contract_plan_date_start') !=null && pw.get('contract_plan_date_finish')!=null)
            {
              var tmp_start_date = (pw.get('contract_plan_date_start_with_shift'))?Routine.parseDate(pw.get('contract_plan_date_start_with_shift'),'dd.mm.yyyy'):Routine.parseDate(pw.get('contract_plan_date_start'),'dd.mm.yyyy');
              if(!contract_plan_start_date || contract_plan_start_date>tmp_start_date)
                contract_plan_start_date = tmp_start_date;
              var tmp_finish_date = (pw.get('contract_plan_date_finish_with_shift'))?Routine.parseDate(pw.get('contract_plan_date_finish_with_shift'),'dd.mm.yyyy'):Routine.parseDate(pw.get('contract_plan_date_finish'),'dd.mm.yyyy');
              if(!contract_plan_finish_date || contract_plan_finish_date<tmp_finish_date)
                contract_plan_finish_date = tmp_finish_date;
            }
        });
    });

     // отображение формы
    this.$(".row-type-comment-start").hide();

    // проверка заданности дат
    self.start_date = start_date;
    self.finish_date = finish_date;
    if(!(start_date && finish_date))
    {
      this.$('.datepicker1').prop('disabled',true);
      this.$('.datepicker2').prop('disabled',true);
    }
    self.contract_plan_start_date = contract_plan_start_date;
    self.contract_plan_finish_date = contract_plan_finish_date;
    if(!(contract_plan_start_date && contract_plan_finish_date) )
    {
      this.$('.contract_plan_datepicker1').prop('disabled',true);
      this.$('.contract_plan_datepicker2').prop('disabled',true);
    }

    // получение текущей даты
    //var nowTemp = new Date();
    //var now = new Date(nowTemp.getFullYear(), nowTemp.getMonth(), nowTemp.getDate(), 0, 0, 0, 0);
    var now = moment().startOf('day');

    if(finish_date && start_date){
      // Собственные плановые даты---------------------------------------
      var days_diff = Routine.daysDiff(finish_date,start_date);
      // дата начала
      this.$('.datepicker1').val(start_date.format("dd.mm.yyyy") );
      var checkin = this.$('.datepicker1').datepicker({
        calendarWeeks: true,
        format:'dd.mm.yyyy',
        weekStart:1,
        onRender: function(date) {
           //if(glCurUser.admin=='admin' || App.glHasAccess)
           if(App.hasUserAccessToTransferDates())
            return '';
          return date.valueOf() < now.valueOf()? 'disabled' : '';
        }
      }).on('changeDate', function(ev) {
          // пересчет даты окончания по новой дате начала
          if(self.$("#transfer-type").val()=='start'){
            self.$('.datefinish').val(moment(new Date(ev.date)).add(days_diff, 'day').format('DD.MM.YYYY'));
            self.$('.datepicker2').data({date: self.$('.datefinish').val()});
            self.$('.datepicker2').datepicker('update');
          }
      }).data('datepicker');

      // дата окончания
      this.$('.datepicker2').val(finish_date.format("dd.mm.yyyy") );
      var checkout = this.$('.datepicker2').datepicker({
        calendarWeeks: true,
        format:'dd.mm.yyyy',
        weekStart:1,
        onRender: function(date) {
          return date.valueOf() <= checkin.date.valueOf() ? 'disabled' : '';
        }
      }).on('changeDate', function(ev) {
          // пересчет даты начала по новой дате окончания
          if(self.$("#transfer-type").val()=='start'){
            self.$('.datestart').val(moment(new Date(ev.date)).add(-days_diff, 'day').format('DD.MM.YYYY'));
            self.$('.datepicker1').data({date: self.$('.datestart').val()});
            self.$('.datepicker1').datepicker('update');
          }
      }).data('datepicker');
    }

    if(contract_plan_finish_date && contract_plan_start_date){
      // Договорные плановые даты---------------------------------------
      var contract_plan_days_diff = Routine.daysDiff(contract_plan_finish_date,contract_plan_start_date);
      // дата начала
      this.$('.contract_plan_datepicker1').val(contract_plan_start_date.format("dd.mm.yyyy") );
      var contract_plan_checkin = this.$('.contract_plan_datepicker1').datepicker({
        calendarWeeks: true,
        format:'dd.mm.yyyy',
        weekStart:1,
        onRender: function(date) {
           //if(glCurUser.admin=='admin'  || App.glHasAccess)
           if(App.hasUserAccessToTransferDates())
            return '';
          return date.valueOf() < now.valueOf()? 'disabled' : '';
        }
      }).on('changeDate', function(ev) {
          // пересчет даты окончания по новой дате начала
          if(self.$("#transfer-type").val()=='start'){
            self.$('.contract_plan_datefinish').val(moment(new Date(ev.date)).add(contract_plan_days_diff, 'day').format('DD.MM.YYYY'));
            self.$('.contract_plan_datepicker2').data({date: self.$('.contract_plan_datefinish').val()});
            self.$('.contract_plan_datepicker2').datepicker('update');
          }
      }).data('datepicker');

      // дата окончания
      this.$('.contract_plan_datepicker2').val(contract_plan_finish_date.format("dd.mm.yyyy") );
      var checkout = this.$('.contract_plan_datepicker2').datepicker({
        calendarWeeks: true,
        format:'dd.mm.yyyy',
        weekStart:1,
        onRender: function(date) {
          return date.valueOf() <= contract_plan_checkin.date.valueOf() ? 'disabled' : '';
        }
      }).on('changeDate', function(ev) {
          // пересчет даты начала по новой дате окончания
          if(self.$("#transfer-type").val()=='start'){
            self.$('.contract_plan_datestart').val(moment(new Date(ev.date)).add(-contract_plan_days_diff, 'day').format('DD.MM.YYYY'));
            self.$('.contract_plan_datepicker1').data({date: self.$('.contract_plan_datestart').val()});
            self.$('.contract_plan_datepicker1').datepicker('update');
          }
      }).data('datepicker');
    }
    return this;
  },
  closeDialog: function(){
    $(this.el).trigger('close', [this]);
  },

  /**
   * Событие смены типа переноса дат
  **/
  changeTransferType: function(e)
  {
    var self = this;
    // при сменен типа корректировки, необходимо откатить изменения
    if(self.start_date)
    {
      self.$('.datestart').val(moment(self.start_date).format('DD.MM.YYYY'));
      self.$('.datepicker1').data({date: self.$('.datestart').val()});
      self.$('.datepicker1').datepicker('update');
    }
    if(self.finish_date)
    {
      self.$('.datefinish').val(moment(self.finish_date).format('DD.MM.YYYY'));
      self.$('.datepicker2').data({date: self.$('.datefinish').val()});
      self.$('.datepicker2').datepicker('update');
    }
    if(self.contract_plan_start_date)
    {
      self.$('.contract_plan_datestart').val(moment(self.contract_plan_start_date).format('DD.MM.YYYY'));
      self.$('.contract_plan_datepicker1').data({date: self.$('.contract_plan_datestart').val()});
      self.$('.contract_plan_datepicker1').datepicker('update');
    }
    if(self.contract_plan_finish_date)
    {
      self.$('.contract_plan_datefinish').val(moment(self.contract_plan_finish_date).format('DD.MM.YYYY'));
      self.$('.contract_plan_datepicker2').data({date: self.$('.contract_plan_datefinish').val()});
      self.$('.contract_plan_datepicker2').datepicker('update');
    }

    // по умолчанию скрываем все контролы ввода
    this.$('.main-data-controls').hide();

    // по умолчанию скрываем поле комента и дат ввода
    this.$(".row-type-comment-start").hide();
    this.$(".row-type-date-start").hide();
    this.$(".row-type-date-finish").hide();
    // может быть перенос или изменение длительности
    if(this.$("#transfer-type").val()=='start')
    {
      if(this.worksToTransferCount>1)
        this.$(".row-type-comment-start").show();
      this.$('.main-data-controls').show();
    }
    else if(this.$("#transfer-type").val()=='both')
    {
      if(this.worksToTransferCount>1)
      {
        this.$("#transfer-type").val("").change();
        $.jGrowl('Изменение длительности возможно только для каждой работы отдельно.', { 'themeState':'growl-error', 'sticky':false });
        return;
      }
      this.$('.main-data-controls').show();
    }
  },

  /**
   * Смена причины переноса дат
   */
  changeTransferReason: function(e)
  {
    if(
      this.$('#transfer-reason').val()==App.PlanShiftReasonSystemObjects['ANOTHER_WORK'] ||
      this.$('#transfer-reason').val()==App.PlanShiftReasonSystemObjects['NOT_PLAN_WORK'] ||
      this.$('#transfer-reason').val()==App.PlanShiftReasonSystemObjects['PLAN_WORK']
    )
      this.$('.row-transfer-reason-detail').show();
    else
      this.$('.row-transfer-reason-detail').hide();
  },

  /**
  ** Перенос дат
  **/
  transferData: function(){
    var self = this;
    var need_comment = false;
    var data_to_check = []; // список нарядов уточнений причин переноса
    var reason_nodes = []; // список нарядов уточнений причин переноса в формате на сохранение

    // собственные новые даты------------------------------
    var new_date_start = Routine.parseDate(this.$('.datepicker1').val(),'dd.mm.yyyy');
    var new_date_finish = Routine.parseDate(this.$('.datepicker2').val(),'dd.mm.yyyy');
    // вычисление смещения в количествах дней от первоначальных минимальных и максимальных собственных дат
    var start_shift_global = Routine.daysDiff(new_date_start, self.start_date);
    var finish_shift_global = Routine.daysDiff(new_date_finish, self.finish_date);

    // новые даты по договору------------------------------
    var contract_plan_new_date_start = Routine.parseDate(this.$('.contract_plan_datepicker1').val(),'dd.mm.yyyy');
    var contract_plan_new_date_finish = Routine.parseDate(this.$('.contract_plan_datepicker2').val(),'dd.mm.yyyy');
    // вычисление смещения в количествах дней от первоначальных минимальных и максимальных  дат по договору
    var contract_plan_start_shift_global = Routine.daysDiff(contract_plan_new_date_start, self.contract_plan_start_date);
    var contract_plan_shift_global = Routine.daysDiff(contract_plan_new_date_finish, self.contract_plan_finish_date);


    if (
      (!new_date_start || new_date_start && new_date_finish && new_date_start.toString() == this.start_date.toString() && new_date_finish.toString() == this.finish_date.toString()) &&
      (!contract_plan_new_date_start  || contract_plan_new_date_start && contract_plan_new_date_finish &&  contract_plan_new_date_start.toString() == this.contract_plan_start_date.toString() && contract_plan_new_date_finish.toString() == this.contract_plan_finish_date.toString())
    )
    {
      $.jGrowl('Данные не изменились.', { 'themeState':'growl-error', 'sticky':false });
      return;
    }
    if (this.$('#transfer-type').val() ==''){
       $.jGrowl('Выберите тип корректировки.', { 'themeState':'growl-error', 'sticky':false });
      return;
    }
    if (this.$('#transfer-reason').val() == '0'){
       $.jGrowl('Выберите причину корректировки.', { 'themeState':'growl-error', 'sticky':false });
      return;
    }
    // если изменение длительности дат, то проверяем, чтобы дата начала не превышала дату окончания
    if(this.$("#transfer-type").val()=='both')
    {
      if(new_date_start && new_date_finish && new_date_start>new_date_finish || contract_plan_new_date_start && contract_plan_new_date_finish && contract_plan_new_date_start>contract_plan_new_date_finish)
      {
         $.jGrowl('Дата начала не может превышать дату окончания.', { 'themeState':'growl-error', 'sticky':false });
        return;
      }
    }
    // если в причине корректировки задано: "Другое", то комментарий обязателен
    if(this.$('#transfer-reason').val()==App.PlanShiftReasonSystemObjects['OTHER'] && this.$('#transfer-comment').val()=="")
    {
      $.jGrowl('Для причины: "Другое", комментарий обязателен для заполнения.', { 'themeState':'growl-error', 'sticky':false });
      return;
    }

    // если в причине корректировки задан - перенос
    if(
      this.$('#transfer-reason').val()==App.PlanShiftReasonSystemObjects['ANOTHER_WORK'] ||
      this.$('#transfer-reason').val()==App.PlanShiftReasonSystemObjects['NOT_PLAN_WORK'] ||
      this.$('#transfer-reason').val()==App.PlanShiftReasonSystemObjects['PLAN_WORK']
    )
    {
      if(!this.$('#transfer-reason-detail').val())
      {
        $.jGrowl('Заполните уточнение причины корректировки.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
        return;
      }
      var tmp = this.$('#transfer-reason-detail').val().replace(/\s+/g, '').split(',');
      for(var i in tmp)
      {
        var i_tmp = tmp[i].split('/');
        if(i_tmp.length>1)
        {
          if(!Routine.strToInt(i_tmp[0]) || !Routine.strToInt(i_tmp[1]))
          {
            $.jGrowl('Ошибка формата уточнения к причине переноса. Убедитесь что все указанные наряды и работы корректны.', { 'themeState':'growl-error', 'sticky':false });
            return;
          }
          data_to_check.push({
            'workorder_number': Routine.strToInt(i_tmp[0]),
            'work_code': Routine.strToInt(i_tmp[1])
          })
          reason_nodes.push([Routine.strToInt(i_tmp[0]), Routine.strToInt(i_tmp[1])]);
        }
        else
        {
          if(!Routine.strToInt(i_tmp[0]))
          {
            $.jGrowl('Ошибка формата уточнения к причине переноса.  Убедитесь что все указанные наряды и работы корректны.', { 'themeState':'growl-error', 'sticky':false });
            return;
          }
          data_to_check.push({
            'workorder_number': Routine.strToInt(i_tmp[0]),
            'work_code': null
          })
          reason_nodes.push([Routine.strToInt(i_tmp[0])]);
        }
      }
    }

    // сбор переносов
    var have_wrong_dates = false;
    var have_wrong_finish_dates = false;
    var have_only_one_date = false;
    var have_conditional_dates = false;

    var curDateStart = null;
    var curDateFinish = null;

    var aliases = ['','contract_plan_'];
    _.each(App.DataCollection.models, function (wo)
    {
        var works_cnt = [];

        _.each(wo.get('plan_work').models, function(pw)
        {
          try
          {
            //---------------------------------------------------------------------------------------------------------
            // Собственыне планы ------------------------------------------------------------------------
            if ((new_date_start && new_date_finish &&(new_date_start.toString()!= self.start_date.toString() || new_date_finish.toString()!= self.finish_date.toString()))&&(pw.get('checked') && pw.get('date_start') !=null && pw.get('date_finish')!=null))
            {
              curDateStart = (pw.get('date_start_with_shift')!=null)? new Date( Routine.parseDate(pw.get('date_start_with_shift'))): new Date(Routine.parseDate(pw.get('date_start'),'dd.mm.yyyy')) ;
              curDateFinish = (pw.get('date_finish_with_shift')!=null)? new Date(Routine.parseDate(pw.get('date_finish_with_shift'))) : new Date(Routine.parseDate(pw.get('date_finish'),'dd.mm.yyyy')) ;

              // если идет перенос без изменения длительности
              if(self.$('#transfer-type').val()=="start")
              {
                // вычисление количества дней на которе необходимо выполнить перенос дат
                var shift = start_shift_global;
                curDateFinish.setDate(curDateFinish.getDate() + shift);

                // если после переноса, дата окончания все равно меньше текущей даты на календаре,
                // необходимо выдать пользователю предупреждение
                //var nowTemp = new Date();
                //var nowDate = new Date(nowTemp.getFullYear(), nowTemp.getMonth(), nowTemp.getDate(), 0, 0, 0, 0);
                var nowDate =moment().startOf('day');

                var plan_shift = {
                  'reason_id': self.$('#transfer-reason').val(),
                  'reason': self.$('#transfer-reason :selected').text(),
                  'shift': shift,
                  'note': self.$('#transfer-comment').val(),
                  'type': "both",
                  'date_change':'new',
                  'reason_nodes': reason_nodes //this.$('#transfer-reason-detail').val().replace(/\s+/g, '')
                };
                pw.set('plan_shifts', [plan_shift]);

                // в переносе не может участвовать работа с условной датой
                if(pw.get('depends_on'))
                  have_conditional_dates = true;
              }
              else
              {
                // если идет изменение длительности
                var start_shift = Routine.daysDiff(new_date_start, curDateStart);
                var finish_shift = Routine.daysDiff(new_date_finish, curDateFinish);
                curDateStart.setDate(curDateStart.getDate() + start_shift);
                curDateFinish.setDate(curDateFinish.getDate() + finish_shift);

                if(curDateStart>curDateFinish)
                  have_wrong_dates = true;

                // если после переноса, дата окончания все равно меньше текущей даты на календаре,
                // необходимо выдать пользователю предупреждение
                //var nowTemp = new Date();
                //var nowDate = new Date(nowTemp.getFullYear(), nowTemp.getMonth(), nowTemp.getDate(), 0, 0, 0, 0);
                var nowDate =moment().startOf('day');

                var shifts = [];
                if(start_shift!=0)
                {
                  var plan_shift_start = {
                    'reason_id': self.$('#transfer-reason').val(),
                    'reason': self.$('#transfer-reason :selected').text(),
                    'shift': start_shift,
                    'note': self.$('#transfer-comment').val(),
                    'type': "start",
                    'date_change':'new',
                    'reason_nodes': reason_nodes //this.$('#transfer-reason-detail').val().replace(/\s+/g, '')
                  };
                  shifts.push(plan_shift_start);
                }
                if(finish_shift!=0)
                {
                  var plan_shift_finish = {
                    'reason_id': self.$('#transfer-reason').val(),
                    'reason': self.$('#transfer-reason :selected').text(),
                    'shift': finish_shift,
                    'note': self.$('#transfer-comment').val(),
                    'type': "finish",
                    'date_change':'new',
                    'reason_nodes': reason_nodes //this.$('#transfer-reason-detail').val().replace(/\s+/g, '')
                  };
                  shifts.push(plan_shift_finish);
                }

                if(shifts.length>0)
                  pw.set('plan_shifts', shifts);

                // для работ с условными датами нельзя переносить дату начала
                if(pw.get('depends_on') && start_shift!=0)
                  have_conditional_dates = true;

              }
              //works_cnt++;
              if(works_cnt.indexOf(pw.get('_id'))<0)
                works_cnt.push(pw.get('_id'))
            }
            else if(pw.get('checked') && ((pw.get('date_start') !=null && pw.get('date_finish')==null) || (pw.get('date_start') ==null && pw.get('date_finish')!=null)))
              have_only_one_date = true;

            //----------------------------------------------------------------------------------------------
            // Планы по договору ------------------------------------------------------------------------
            if ((contract_plan_new_date_start && contract_plan_new_date_finish &&(contract_plan_new_date_start.toString()!= self.contract_plan_start_date.toString() || contract_plan_new_date_finish.toString()!= self.contract_plan_finish_date.toString()))&&(pw.get('checked') && pw.get('contract_plan_date_start') !=null && pw.get('contract_plan_date_finish')!=null))
            {
              curDateStart = (pw.get('contract_plan_date_start_with_shift')!=null)? new Date( Routine.parseDate(pw.get('contract_plan_date_start_with_shift'))): new Date(Routine.parseDate(pw.get('contract_plan_date_start'),'dd.mm.yyyy')) ;
              curDateFinish = (pw.get('contract_plan_date_finish_with_shift')!=null)? new Date(Routine.parseDate(pw.get('contract_plan_date_finish_with_shift'))) : new Date(Routine.parseDate(pw.get('contract_plan_date_finish'),'dd.mm.yyyy')) ;

              // если идет перенос без изменения длительности
              if(self.$('#transfer-type').val()=="start")
              {
                // вычисление количества дней на которе необходимо выполнить перенос дат
                var shift = contract_plan_start_shift_global;
                curDateFinish.setDate(curDateFinish.getDate() + shift);

                // если после переноса, дата окончания все равно меньше текущей даты на календаре,
                // необходимо выдать пользователю предупреждение
                //var nowTemp = new Date();
                //var nowDate = new Date(nowTemp.getFullYear(), nowTemp.getMonth(), nowTemp.getDate(), 0, 0, 0, 0);
                var nowDate =moment().startOf('day');
                var plan_shift = {
                  'reason_id': self.$('#transfer-reason').val(),
                  'reason': self.$('#transfer-reason :selected').text(),
                  'shift': shift,
                  'note': self.$('#transfer-comment').val(),
                  'type': "both",
                  'date_change':'new',
                  'reason_nodes': reason_nodes //this.$('#transfer-reason-detail').val().replace(/\s+/g, '')
                };
                pw.set('contract_plan_plan_shifts', [plan_shift]);

                // в переносе не может участвовать работа с условной датой
                if(pw.get('contract_plan_depends_on'))
                  have_conditional_dates = true;
              }
              else
              {
                // если идет изменение длительности
                var start_shift = Routine.daysDiff(contract_plan_new_date_start, curDateStart);
                var finish_shift = Routine.daysDiff(contract_plan_new_date_finish, curDateFinish);
                curDateStart.setDate(curDateStart.getDate() + start_shift);
                curDateFinish.setDate(curDateFinish.getDate() + finish_shift);

                if(curDateStart>curDateFinish)
                  have_wrong_dates = true;

                // если после переноса, дата окончания все равно меньше текущей даты на календаре,
                // необходимо выдать пользователю предупреждение
                //var nowTemp = new Date();
                //var nowDate = new Date(nowTemp.getFullYear(), nowTemp.getMonth(), nowTemp.getDate(), 0, 0, 0, 0);
                var nowDate =moment().startOf('day');

                var shifts = [];
                if(start_shift!=0)
                {
                  var plan_shift_start = {
                    'reason_id': self.$('#transfer-reason').val(),
                    'reason': self.$('#transfer-reason :selected').text(),
                    'shift': start_shift,
                    'note': self.$('#transfer-comment').val(),
                    'type': "start",
                    'date_change':'new',
                    'reason_nodes': reason_nodes //this.$('#transfer-reason-detail').val().replace(/\s+/g, '')
                  };
                  shifts.push(plan_shift_start);
                }
                if(finish_shift!=0)
                {
                  var plan_shift_finish = {
                    'reason_id': self.$('#transfer-reason').val(),
                    'reason': self.$('#transfer-reason :selected').text(),
                    'shift': finish_shift,
                    'note': self.$('#transfer-comment').val(),
                    'type': "finish",
                    'date_change':'new',
                    'reason_nodes': reason_nodes //this.$('#transfer-reason-detail').val().replace(/\s+/g, '')
                  };
                  shifts.push(plan_shift_finish);
                }

                if(shifts.length>0)
                  pw.set('contract_plan_plan_shifts', shifts);
                // для работ с условными датами нельзя переносить дату начала
                if(pw.get('contract_plan_depends_on') && start_shift!=0)
                  have_conditional_dates = true;
              }
              //works_cnt++;
              if(works_cnt.indexOf(pw.get('_id'))<0)
                works_cnt.push(pw.get('_id'))
            }
            else if(pw.get('checked') && ((pw.get('contract_plan_date_start') !=null && pw.get('contract_plan_date_finish')==null) || (pw.get('contract_plan_date_start') ==null && pw.get('contract_plan_date_finish')!=null)))
              have_only_one_date = true;
          }
          catch(err){}
        });
        //if (wo.get('plan_work').models.length == works_cnt.length)
        //    wo.set('shifted', 'shifted');
    }, this);

    if(have_wrong_dates)
    {
      $.jGrowl('По некоторым работам, после выполнения процедуры переноса, дата начала работ будет превышать дату окончания. Проверьте даты и повторите попытку.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      return;
    }
    if(have_wrong_finish_dates)
    {
      $.jGrowl('Ошибка переноса дат. Одна или несколько работ имеют дату окончания меньше текущей.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      return;
    }
    if(have_only_one_date)
    {
      $.jGrowl('Для некоторых работ задана только дата начала. Необходимо заполнить обе даты.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      return;
    }
    if(have_conditional_dates)
    {
      $.jGrowl('В корректировке участвуют работы с условными датами. Для работ с условными датами нельзя менять дату начала, а также выполнять перенос без изменения длительности.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      return;
    }

    //  проверка на корректность пояснения к причине переноса
    if(
      this.$('#transfer-reason').val()==App.PlanShiftReasonSystemObjects['ANOTHER_WORK'] ||
      this.$('#transfer-reason').val()==App.PlanShiftReasonSystemObjects['NOT_PLAN_WORK'] ||
      this.$('#transfer-reason').val()==App.PlanShiftReasonSystemObjects['PLAN_WORK']
    )
    {
      Routine.showLoader();
      $.ajax({
          type: "POST",
          url: "/handlers/workorderdate/check_reason_note_format",
          data: JSON.stringify({'data': data_to_check, 'reason': self.$('#transfer-reason').val()} ),
          timeout: 55000,
          contentType: 'application/json',
          dataType: 'json',
          async:true
          }).done(function(result) {
            Routine.hideLoader();
            if(result['status']=="error")
            {
              $.jGrowl(result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 10000 });
            }
            else
            {
              // получение детализации последствий переноса, с последующим сохранением данных
              self.getTransferDetails(App.DataCollection);
            }
          })
          .error(function(){
            $.jGrowl('Ошибка проверки формата уточнения к причине переноса. ', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
            Routine.hideLoader();
          }).always(function(){
      });
    }
    else
    {
      // получение детализации последствий переноса, с последующим сохранением данных
      self.getTransferDetails(App.DataCollection);
    }
  },

  /**
   ** Получение информации о результате переноса сроков
   ** Пользователь должен знать, на что повлияет запланированный им перенос сроков
  **/
  getTransferDetails: function(data){
      var self = this;

      var data_to_save = []
    _.each(data.models, function (wo) {
      var is_changed = false;
      if(wo.hasChanged())
        is_changed = true;
      else
      {
        _.each(wo.get('plan_work').models, function(pw) {
          if(pw.hasChanged())
          {
            is_changed = true;
            return true
          }
        });
      }
      if(is_changed)
      {
        wo.set('changed', new Date());
        data_to_save.push(wo);
      }
    }, this);

    // если сохранять нечего
    if(data_to_save.length == 0)
    {
      $.jGrowl('Нет данных на сохранение.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      return;
    }

     // проверка на переносы
    Routine.showLoader();
    $.ajax({
      type: "POST",
      url: "/handlers/workorderdate/get_transfer_info",
      data: JSON.stringify({'data_to_save':data_to_save}),
      timeout: 35000,
      contentType: 'application/json',
      dataType: 'json',
      async:true
    }).done(function(result) {
        if(result['status']=="ok")
        {
          self.$el.find('.main-transfer-box').hide();
          self.$el.find('.confirm-transfer-box').show();
          self.$el.find('.confirm-transfer-box').find('.lbl-transfer-detail').html(result['data']);
        }
        else
          $.jGrowl('Ошибка сохранения данных. Подробности: ' + result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 10000 });
    }).always(function(){Routine.hideLoader()});
  },

  /**
    ** Отмена сохранения
   **/
  cancelData: function(){
    this.$el.find('.main-transfer-box').show();
    this.$el.find('.confirm-transfer-box').hide();
  },

  /**
    ** Сохранение данных
   **/
  saveData: function(){
    var self = this;
    // сохранение данных
    App.save(App.DataCollection, null, function(){
      // закрыть диалог
      self.closeDialog();
      // обновить данные на форме
      App.FindView.onSearch();
    });
  }
});
