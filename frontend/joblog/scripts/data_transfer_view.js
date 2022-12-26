///
/// Контрол управления переносом дат
///
App.Views.DatesTransferView = Backbone.View.extend({
  el: $("#pnlTransferDate"),
  ItemsView:null,
  itemsCollection: null,            // коллекция элементов
  shiftReasons: null,                // список причин переноса/приостановки
  dataToSave: null,                   // данные на сохранение пришедшие с формы фактов
  events:{
     'click .btnOk': 'OnSave',
     'click .btnCancel': 'OnCancel',
      // transfers
     'change .ddl-own-date-transfer-reason': 'OnShiftReasonChange',
     'click .cb-transfer-individual-reason': 'OnTranferChangeReasonType',
     'click .cb-transfer-common-reason': 'OnTranferChangeReasonType',
     'change .tb-transfer-common-note': 'OnChangeCommonTransferComment',
     'change .tb-transfer-reason-common-note': 'OnChangeCommonTransferReasonNote',
     'change .ddl-date-transfer-reason': 'OnTransferIndividualReasonChange',
     // holds
     'change .ddl-own-hold-reason': 'OnHoldReasonChange',
     'click .cb-hold-individual-reason': 'OnHoldChangeReasonType',
     'click .cb-hold-common-reason': 'OnHoldChangeReasonType',
     'change .tb-hold-common-note': 'OnChangeCommonHoldComment',
     'change .tb-hold-reason-common-note': 'OnChangeCommonHoldReasonNote',
     'change .ddl-hold-reason': 'OnHoldIndividualReasonChange',
     // pauses
     'change .ddl-own-pause-reason': 'OnPauseReasonChange',
     'click .cb-pause-individual-reason': 'OnPauseChangeReasonType',
     'click .cb-pause-common-reason': 'OnPauseChangeReasonType',
     'change .tb-pause-common-note': 'OnChangeCommonPauseComment',
     'change .tb-pause-reason-common-note': 'OnChangeCommonPauseReasonNote',
     'change .ddl-pause-reason': 'OnPauseIndividualReasonChange',
     // rejects
     'change .ddl-own-reject-reason': 'OnRejectReasonChange',
     'click .cb-reject-individual-reason': 'OnRejectChangeReasonType',
     'click .cb-reject-common-reason': 'OnRejectChangeReasonType',
     'change .tb-reject-common-note': 'OnChangeCommonrejectComment',
     'change .tb-reject-reason-common-note': 'OnChangeCommonRejectReasonNote',
     'change .ddl-reject-reason': 'OnRejectIndividualReasonChange',
  },
  initialize: function(){
    var self = this;
    // подгрузка списка причин переноса сроков
    $.ajax({
      url: '/handlers/joblog/getshiftreasonlist/',
      type: 'GET',
      dataType: 'json',
      contentType: "application/json; charset=utf-8",
      data: {},
      timeout: 35000,
      success: function (result, textStatus, jqXHR) {
        if(result.status=='error')
          $.jGrowl(result.msg, { 'themeState':'growl-error', 'sticky':false, life: 10000 });
        else if(result.status=="ok")
        {
          //self.ShowContract($.parseJSON(result.contract));
          self.shiftReasons = result.result;
          self.fillShiftReason(self.shiftReasons);
          self.fillHoldReason(self.shiftReasons);
          self.fillRejectReason(self.shiftReasons);
          self.fillPauseReason(self.shiftReasons);
        }
        else
          //$.jGrowl("Ошибка сервера при получении причин переноса сроков плановых работ.", { 'themeState':'growl-error', 'sticky':false });
          console.log('Ошибка сервера при получении причин переноса сроков плановых работ.');
      }
    });
  },

  /**
   * Смена общего коментария на все переносы
  **/
  OnChangeCommonTransferComment: function(e)
  {
    var curElem = $(e.currentTarget);
     // проходим по всем элементам списка и проставляем общий комментарий
    this.$('.transfer-data-container').find('.tb-note').val(curElem.val()).change();
  },

    /**
   * Смена общего уточнения к причине
  **/
  OnChangeCommonTransferReasonNote: function(e)
  {
    var curElem = $(e.currentTarget);
     // проходим по всем элементам списка и проставляем общий комментарий
    this.$('.transfer-data-container').find('.tb-reason-note').val(curElem.val()).change();
  },

  /**
   * Смена типа причины переноса дат ()
  **/
  OnTranferChangeReasonType: function(e)
  {
    //this.$(".btnOk").prop('disabled',false);

    var curElem = $(e.currentTarget);
    var box = this.$('.pnl-transfer-works');
    if(!curElem.is(':checked'))
      curElem.prop('checked', true);

    box.find('.tb-transfer-reason-common-note').val('');
    if(curElem.hasClass('cb-transfer-individual-reason'))
    {
      $(box).find('.cb-transfer-common-reason').prop('checked', false);
      box.find('.transfer-data-container').show();
      box.find('.transfer-data-container').find('.tb-note').parent().parent().show();
      box.find('.transfer-data-container').find('.ddl-date-transfer-reason').parent().parent().show();
      box.find('.pnl-transfer-header').hide();
      // box.find('.transfer-data-container').find('.tb-reason-note').show();
      if(
        box.find('.transfer-data-container').find('.ddl-date-transfer-reason').val()==App.PlanShiftReasonSystemObjects['ANOTHER_WORK'] ||
        box.find('.transfer-data-container').find('.ddl-date-transfer-reason').val()==App.PlanShiftReasonSystemObjects['NOT_PLAN_WORK'] ||
        box.find('.transfer-data-container').find('.ddl-date-transfer-reason').val()==App.PlanShiftReasonSystemObjects['PLAN_WORK']
        )
      {
        box.find('.transfer-data-container').find('.tb-reason-note').val('').parent().parent().show();
      }
    }
    else
    {
      $(box).find('.cb-transfer-individual-reason').prop('checked', false);
      box.find('.transfer-data-container').show();
      box.find('.transfer-data-container').find('.tb-note').parent().parent().hide();
      box.find('.transfer-data-container').find('.ddl-date-transfer-reason').parent().parent().hide();
      box.find('.pnl-transfer-header').show();
      //box.find('.transfer-data-container').find('.tb-reason-note').hide();
      box.find('.transfer-data-container').find('.tb-reason-note').val('').parent().parent().hide();
      //box.find('.pnl-transfer-header').find('.tb-note').parent().show();
    }
  },

  /**
   * Смена общего коментаряи на все заморозки работ
  **/
  OnChangeCommonHoldComment: function(e)
  {
    var curElem = $(e.currentTarget);
     // проходим по всем элементам списка и проставляем общий комментарий
    this.$('.hold-data-container').find('.tb-note').val(curElem.val()).change();
  },

  /**
   * Смена общего уточнения к причине
  **/
  OnChangeCommonHoldReasonNote: function(e)
  {
    var curElem = $(e.currentTarget);
     // проходим по всем элементам списка и проставляем общий комментарий
    this.$('.hold-data-container').find('.tb-reason-note').val(curElem.val()).change();
  },

  /**
   * Смена типа причины заморозки дат ()
  **/
  OnHoldChangeReasonType: function(e)
  {
    //this.$(".btnOk").prop('disabled',false);
    var curElem = $(e.currentTarget);
    var box = this.$('.pnl-hold-works');
    if(!curElem.is(':checked'))
      curElem.prop('checked', true);

    box.find('.tb-hold-reason-common-note').val('');

    if(curElem.hasClass('cb-hold-individual-reason'))
    {
      $(box).find('.cb-hold-common-reason').prop('checked', false);
      box.find('.hold-data-container').show();
      box.find('.hold-data-container').find('.tb-note').parent().parent().show();
      box.find('.hold-data-container').find('.ddl-hold-reason').parent().parent().show();
      box.find('.pnl-transfer-header').hide();
      if(
        box.find('.hold-data-container').find('.ddl-hold-reason').val()==App.PlanShiftReasonSystemObjects['ANOTHER_WORK'] ||
        box.find('.hold-data-container').find('.ddl-hold-reason').val()==App.PlanShiftReasonSystemObjects['NOT_PLAN_WORK'] ||
        box.find('.hold-data-container').find('.ddl-hold-reason').val()==App.PlanShiftReasonSystemObjects['PLAN_WORK'])
      {
        box.find('.hold-data-container').find('.tb-reason-note').val('').parent().parent().show();
      }
    }
    else
    {
      $(box).find('.cb-hold-individual-reason').prop('checked', false);
      box.find('.hold-data-container').show();
      box.find('.hold-data-container').find('.tb-note').parent().parent().hide();
      box.find('.hold-data-container').find('.ddl-hold-reason').parent().parent().hide();
      box.find('.pnl-transfer-header').show();
      box.find('.hold-data-container').find('.tb-reason-note').val('').parent().parent().hide();
      //box.find('.hold-data-container').find('.tb-reason-note').hide();
      //box.find('.hold-data-container').find('.tb-reason-note').parent().parent().hide();
      //box.find('.pnl-transfer-header').find('.tb-note').parent().show();
    }
  },

  /**
   * Смена общего коментаряи на все заморозки работ
   */
  OnChangeCommonRejectComment: function(e)
  {
    var curElem = $(e.currentTarget);
     // проходим по всем элементам списка и проставляем общий комментарий
    this.$('.reject-data-container').find('.tb-note').val(curElem.val()).change();
  },

  /**
   * Смена общего уточнения к причине
   */
  OnChangeCommonRejehctReasonNote: function(e)
  {
    var curElem = $(e.currentTarget);
     // проходим по всем элементам списка и проставляем общий комментарий
    this.$('.reject-data-container').find('.tb-reason-note').val(curElem.val()).change();
  },

  /**
   * Смена типа причины заморозки дат ()
   */
  OnRejectChangeReasonType: function(e)
  {
    var curElem = $(e.currentTarget);
    var box = this.$('.pnl-reject-works');
    if(!curElem.is(':checked'))
      curElem.prop('checked', true);

    box.find('.tb-reject-reason-common-note').val('');

    if(curElem.hasClass('cb-reject-individual-reason'))
    {
      $(box).find('.cb-reject-common-reason').prop('checked', false);
      box.find('.reject-data-container').show();
      box.find('.reject-data-container').find('.tb-note').parent().parent().show();
      box.find('.reject-data-container').find('.ddl-reject-reason').parent().parent().show();
      box.find('.pnl-transfer-header').hide();
      if(
        box.find('.reject-data-container').find('.ddl-reject-reason').val()==App.PlanShiftReasonSystemObjects['ANOTHER_WORK'] ||
        box.find('.reject-data-container').find('.ddl-reject-reason').val()==App.PlanShiftReasonSystemObjects['NOT_PLAN_WORK'] ||
        box.find('.reject-data-container').find('.ddl-reject-reason').val()==App.PlanShiftReasonSystemObjects['PLAN_WORK'])
      {
        box.find('.reject-data-container').find('.tb-reason-note').val('').parent().parent().show();
      }
    }
    else
    {
      $(box).find('.cb-reject-individual-reason').prop('checked', false);
      box.find('.reject-data-container').show();
      box.find('.reject-data-container').find('.tb-note').parent().parent().hide();
      box.find('.reject-data-container').find('.ddl-reject-reason').parent().parent().hide();
      box.find('.pnl-transfer-header').show();
      box.find('.reject-data-container').find('.tb-reason-note').val('').parent().parent().hide();
    }
  },


  /**
   * Смена общего коментаряи на все приостановки работ
   */
  OnChangeCommonPauseComment: function(e)
  {
    var curElem = $(e.currentTarget);
     // проходим по всем элементам списка и проставляем общий комментарий
    this.$('.pause-data-container').find('.tb-note').val(curElem.val()).change();
  },

  /**
   * Смена общего уточнения к причине
  **/
  OnChangeCommonPauseReasonNote: function(e)
  {
    var curElem = $(e.currentTarget);
     // проходим по всем элементам списка и проставляем общий комментарий
    this.$('.pause-data-container').find('.tb-reason-note').val(curElem.val()).change();
  },

  /**
   * Смена типа причины приостановки дат ()
  **/
  OnPauseChangeReasonType: function(e)
  {
    //this.$(".btnOk").prop('disabled',false);
    var curElem = $(e.currentTarget);
    var box = this.$('.pnl-pause-works');
    if(!curElem.is(':checked'))
      curElem.prop('checked', true);
    box.find('.tb-pause-reason-common-note').val('');
    if(curElem.hasClass('cb-pause-individual-reason'))
    {
      $(box).find('.cb-pause-common-reason').prop('checked', false);
      box.find('.pause-data-container').show();
      box.find('.pause-data-container').find('.tb-note').parent().parent().show();
      box.find('.pause-data-container').find('.ddl-pause-reason').parent().parent().show();
      box.find('.pnl-transfer-header').hide();
      if(
        box.find('.pause-data-container').find('.ddl-pause-reason').val()==App.PlanShiftReasonSystemObjects['ANOTHER_WORK'] ||
        box.find('.pause-data-container').find('.ddl-pause-reason').val()==App.PlanShiftReasonSystemObjects['NOT_PLAN_WORK'] ||
        box.find('.pause-data-container').find('.ddl-pause-reason').val()==App.PlanShiftReasonSystemObjects['PLAN_WORK'])
      {
        box.find('.pause-data-container').find('.tb-reason-note').val('').parent().parent().show();
      }
    }
    else
    {
      $(box).find('.cb-pause-individual-reason').prop('checked', false);
      box.find('.pause-data-container').show();
      box.find('.pause-data-container').find('.tb-note').parent().parent().hide();
      box.find('.pause-data-container').find('.ddl-pause-reason').parent().parent().hide();
      box.find('.pnl-transfer-header').show();
      box.find('.pause-data-container').find('.tb-reason-note').val('').parent().parent().hide();
    }
  },

  /**
   * Заполнение списка причин переноса
  **/
  fillShiftReason: function(data)
  {
     var self = this;
     var filter = self.$('.ddl-own-date-transfer-reason');
    filter.empty();
    filter.append("<option value=''>Выберите причину переноса</option>");
    _.each(data, function (item) {
      var option = $("<option/>", {
        value: item['_id'],
        text: item['name']
      }).appendTo(filter);
    });
  },

  /**
   * Заполнение списка причин простоя работ
  **/
  fillHoldReason: function(data)
  {
     var self = this;
     var filter = self.$('.ddl-own-hold-reason');
    filter.empty();
    filter.append("<option value=''>Выберите причину простоя</option>");
    _.each(data, function (item) {
      var option = $("<option/>", {
        value: item['_id'],
        text: item['name']
      }).appendTo(filter);
    });
  },

  /**
   * Заполнение списка причин отклонений
   */
  fillRejectReason: function(data)
  {
    var self = this;
    var filter = self.$('.ddl-own-reject-reason');
    filter.empty();
    filter.append("<option value=''>Выберите причину отклонения</option>");
    _.each(data, function (item) {
      var option = $("<option/>", {
        value: item['_id'],
        text: item['name']
      }).appendTo(filter);
    });
  },

  /**
   * Заполнение списка причин приостановки работ
  **/
  fillPauseReason: function(data)
  {
     var self = this;
     var filter = self.$('.ddl-own-pause-reason');
    filter.empty();
    filter.append("<option value=''>Выберите причину приостановки</option>");
    _.each(data, function (item) {
      var option = $("<option/>", {
        value: item['_id'],
        text: item['name']
      }).appendTo(filter);
    });
  },


  parseReasonNote: function(val){
   res= {'status': 'ok', 'items':[]};
   var tmp = val.split(',');
    for(var i in tmp)
    {
      var i_tmp = tmp[i].split('/');
      if(i_tmp.length>1)
      {
        if(!Routine.strToInt(i_tmp[0]) || !Routine.strToInt(i_tmp[1]))
        {
          return {'status': 'error', 'msg' : 'Ошибка формата уточнений к причинам переноса. Убедитесь что все указанные в уточнениях наряды и работы корректны.', 'items':[]};
        }
        res['items'].push({
          'workorder_number': Routine.strToInt(i_tmp[0]),
          'work_code': Routine.strToInt(i_tmp[1])
        })
      }
      else
      {
        if(!Routine.strToInt(i_tmp[0]))
        {
          return {'status': 'error', 'msg' : 'Ошибка формата уточнений к причинам переноса. Убедитесь что все указанные в уточнениях наряды и работы корректны.', 'items':[]};
        }
        res['items'].push({
          'workorder_number': Routine.strToInt(i_tmp[0]),
          'work_code': null
        })
      }
    }
    return res;
  },

  /**
   * Обработка кнопки сохранения
  **/
  OnSave: function()
  {
    var self = this;
    var haveErrors = false;
    var haveNoReasonNotes = false;
    var need_comment = false;
    var fact_works = [];
    // проверка на заполненость всех обязательных полей
    _.each(self.itemsCollection.models, function (item) {

      // Для причины = "Другое", комментарий является обязательным
      if(
         (item.get('reason_id')==App.PlanShiftReasonSystemObjects['OTHER'] ||
        item.get('transfer_reason_id')==App.PlanShiftReasonSystemObjects['OTHER']) &&
         !(item.get('transfer_note') || item.get('note'))
      )
      {
        need_comment = true;
      }

      // если есть перенос, но не указана причина
      if((item.get('transfer_reason_id')=='' || item.get('transfer_reason_id') ==undefined) && item.get('shift')>0)
      {
        haveErrors = true;
        return;
      }
      // если указан простой работы но не задана причина
      //if((item.get('reason_id')=='' || item.get('reason_id') ==undefined) && (item.get('old_status')!=item.get('status') || item.get('repeat')) && item.get('status')!='completed' && item.get('status')!='on_work'&& item.get('status')!='on_work_with_reject')
      if((item.get('reason_id')=='' || item.get('reason_id') ==undefined)  && item.get('status')!='completed' && item.get('status')!='on_work'&& item.get('status')!='on_work_with_reject')
      {
        haveErrors = true;
        return;
      }

      // item.get('reason_id')==App.PlanShiftReasonSystemObjects['OTHER'] ||

      // если у кого-то в причинах - задержка на предыдущих участках,
      // то необходимо чтобы была указана детализация причины
      if(
        item.get('reason_id')==App.PlanShiftReasonSystemObjects['ANOTHER_WORK'] ||
        item.get('reason_id')==App.PlanShiftReasonSystemObjects['NOT_PLAN_WORK'] ||
        item.get('reason_id')==App.PlanShiftReasonSystemObjects['PLAN_WORK'] ||
        item.get('transfer_reason_id')==App.PlanShiftReasonSystemObjects['ANOTHER_WORK'] ||
        item.get('transfer_reason_id')==App.PlanShiftReasonSystemObjects['NOT_PLAN_WORK'] ||
        item.get('transfer_reason_id')==App.PlanShiftReasonSystemObjects['PLAN_WORK']
      )
      {
        if(!item.get('reason_note'))
        {
          haveNoReasonNotes = true;
           return;
        }

        var tmp = self.parseReasonNote(item.get('reason_note'));
        if(tmp['status']=='error')
        {
          haveNoReasonNotes = true;
           return;
        }
        else
          item.set('reason_note_obj', tmp['items']);
      }

      /*// если указана приостановка работы но не задана причина
      if(item.get('pause_reason_id')=='' && item.get('old_status')!=item.get('status') && item.get('status')=='on_pause')
      {
        haveErrors = true;
        return;
      }*/
      /*if(item.get('reason_id')=='' && (item.get('old_status')!=item.get('status') || item.get('shift')>0))
      {
        haveErrors = true;
        return;
      }*/
    }, this);

    // если не все данные заполнены корректно, возвращаем ошибку
    if(haveErrors)
    {
      $.jGrowl('Для всех указанных работ необходимо задать причину переноса/приостановки.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      return;
    }
    // если не все данные заполнены корректно, возвращаем ошибку
    if(haveNoReasonNotes)
    {
      $.jGrowl('Для некоторых причин переноса не заданы обязательные уточнения причин.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      return;
    }
    // если не для всех заполнен комментарий
    if(need_comment)
    {
      $.jGrowl('Для причины: "Другое", комментарий обязателен для заполнения.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      return;
    }

    // сохранение
    self.dataToSave.fact_works= self.itemsCollection.toJSON();
    //console.log(JSON.stringify(self.dataToSave));
    App.save(self.dataToSave);
  },

  /**
   * Обработка кнопки отмена
  **/
  OnCancel: function()
  {
    this.close();
    App.FindView.orderView.show();
  },

  /**
   * Обработка смены общей причины переноса дат
  **/
  OnShiftReasonChange: function()
  {
    var self = this;
    // проходим по всем элементам списка переноса дат и выставляем необходимые значения
    self.$('.ddl-date-transfer-reason').val( self.$('.ddl-own-date-transfer-reason').val()).change();

    // проверка на показ уточнения к причине переноса
    if(
       self.$('.ddl-own-date-transfer-reason').val()==App.PlanShiftReasonSystemObjects['ANOTHER_WORK'] ||
       self.$('.ddl-own-date-transfer-reason').val()==App.PlanShiftReasonSystemObjects['NOT_PLAN_WORK'] ||
       self.$('.ddl-own-date-transfer-reason').val()==App.PlanShiftReasonSystemObjects['PLAN_WORK']
    )
      self.$('.transfer-reason-common-note'). show();
    else
      self.$('.transfer-reason-common-note').hide();
  },

  OnTransferIndividualReasonChange:function(e)
  {              var self = this;
      var curElem = $(e.currentTarget);
      if((
      curElem.val()==App.PlanShiftReasonSystemObjects['ANOTHER_WORK'] ||
      curElem.val()==App.PlanShiftReasonSystemObjects['NOT_PLAN_WORK'] ||
      curElem.val()==App.PlanShiftReasonSystemObjects['PLAN_WORK']) && !self.$('.cb-transfer-common-reason').prop('checked')
      )
      curElem.parents('.line:first').next().show();
    else
      curElem.parents('.line:first').next().hide().find('.tb-reason-note').val('');
  },

   /**
   * Обработка смены общей причины простоя работ
  **/
  OnHoldReasonChange: function()
  {
    var self = this;
    // проходим по всем элементам списка простоя работ и выставляем необходимые значения
    self.$('.ddl-hold-reason').val( self.$('.ddl-own-hold-reason').val()).change();

    // проверка на показ уточнения к причине переноса
    if(
      self.$('.ddl-own-hold-reason').val()==App.PlanShiftReasonSystemObjects['ANOTHER_WORK'] ||
      self.$('.ddl-own-hold-reason').val()==App.PlanShiftReasonSystemObjects['NOT_PLAN_WORK'] ||
      self.$('.ddl-own-hold-reason').val()==App.PlanShiftReasonSystemObjects['PLAN_WORK']
    )
      self.$('.hold-reason-common-note').show();
    else
      self.$('.hold-reason-common-note').hide();
  },

  OnHoldIndividualReasonChange:function(e)
  {
     var self = this;
     var curElem = $(e.currentTarget);
     if((
      curElem.val()==App.PlanShiftReasonSystemObjects['ANOTHER_WORK'] ||
      curElem.val()==App.PlanShiftReasonSystemObjects['NOT_PLAN_WORK'] ||
      curElem.val()==App.PlanShiftReasonSystemObjects['PLAN_WORK']) && !self.$('.cb-hold-common-reason').prop('checked')
    )
      curElem.parents('.line:first').next().show();
     else
      curElem.parents('.line:first').next().hide().find('.tb-reason-note').val('');;
  },

  /**
   * Обработка смены общей причины простоя работ
   */
  OnRejectReasonChange: function()
  {
    var self = this;
    // проходим по всем элементам списка простоя работ и выставляем необходимые значения
    self.$('.ddl-reject-reason').val( self.$('.ddl-own-reject-reason').val()).change();
    // проверка на показ уточнения к причине переноса
    if(
      self.$('.ddl-own-reject-reason').val()==App.PlanShiftReasonSystemObjects['ANOTHER_WORK'] ||
      self.$('.ddl-own-reject-reason').val()==App.PlanShiftReasonSystemObjects['NOT_PLAN_WORK'] ||
      self.$('.ddl-own-reject-reason').val()==App.PlanShiftReasonSystemObjects['PLAN_WORK']
    )
      self.$('.reject-reason-common-note').show();
    else
      self.$('.reject-reason-common-note').hide();
  },

  OnRejectIndividualReasonChange:function(e)
  {
     var self = this;
     var curElem = $(e.currentTarget);
     if((
      curElem.val()==App.PlanShiftReasonSystemObjects['ANOTHER_WORK'] ||
      curElem.val()==App.PlanShiftReasonSystemObjects['NOT_PLAN_WORK'] ||
      curElem.val()==App.PlanShiftReasonSystemObjects['PLAN_WORK']) && !self.$('.cb-reject-common-reason').prop('checked')
    )
      curElem.parents('.line:first').next().show();
     else
      curElem.parents('.line:first').next().hide().find('.tb-reason-note').val('');;
  },

  /**
   * Обработка смены общей причины приостановки работ
   */
  OnPauseReasonChange: function()
  {
    var self = this;
    // проходим по всем элементам списка приостановки работ и выставляем необходимые значения
    self.$('.ddl-pause-reason').val( self.$('.ddl-own-pause-reason').val()).change();

    // проверка на показ уточнения к причине переноса
    if(
        self.$('.ddl-own-pause-reason').val()==App.PlanShiftReasonSystemObjects['ANOTHER_WORK'] ||
        self.$('.ddl-own-pause-reason').val()==App.PlanShiftReasonSystemObjects['NOT_PLAN_WORK'] ||
        self.$('.ddl-own-pause-reason').val()==App.PlanShiftReasonSystemObjects['PLAN_WORK']
    )
      self.$('.pause-reason-common-note').show();
    else
      self.$('.pause-reason-common-note').hide();
  },

  OnPauseIndividualReasonChange:function(e)
  {
     var self = this;
     var curElem = $(e.currentTarget);
     if((
      curElem.val()==App.PlanShiftReasonSystemObjects['ANOTHER_WORK'] ||
      curElem.val()==App.PlanShiftReasonSystemObjects['NOT_PLAN_WORK'] ||
      curElem.val()==App.PlanShiftReasonSystemObjects['PLAN_WORK']) && !self.$('.cb-pause-common-reason').prop('checked')
    )
      curElem.parents('.line:first').next().show();
     else
      curElem.parents('.line:first').next().hide().find('.tb-reason-note').val('');
  },

  /**
   * Отрисовка формы
  **/
  render:function(dataToSave, materialsToSave){
     var self = this;
     self.dataToSave = dataToSave;
     self.materialsToSave = materialsToSave;
     // заполнение списка элементов переноса дат
     self.itemsCollection = new App.Collections.ShiftItemsCollection(dataToSave.fact_works);
     self.ItemsView = new  App.Views.ShiftItemsView({collection: self.itemsCollection}).render();

     // отображение блоков управления простоя работ
     if(dataToSave['have_holds'])
     {
      self.$(".pnl-hold-works").show()
      var count = 0;
      for (var i in dataToSave.fact_works)
        // if(dataToSave.fact_works[i]['status']=='on_hold' && (dataToSave.fact_works[i]['status']!=dataToSave.fact_works[i]['old_status'] || dataToSave.fact_works[i]['repeat']))

      if(dataToSave.fact_works[i]['status']=='on_hold')
          count++;
      // проверяем количество элементов на заморозку
      if(count>1)
      {
        self.$(".pnl-hold-works").find('.pnl-transfer-header-type').show();
        self.$(".pnl-hold-works").find('.pnl-transfer-header').hide();
        self.$(".pnl-hold-works").find(".data-container").hide();
      }
      else
      {
        self.$(".pnl-hold-works").find('.pnl-transfer-header-type').hide();
        self.$(".pnl-hold-works").find('.pnl-transfer-header').hide();
        self.$(".pnl-hold-works").find(".data-container").show();
      }
    }

     // отображение блоков управления отклоненеиями
    if(dataToSave['have_rejects'])
    {
      self.$(".pnl-reject-works").show()
      var count = 0;
      for (var i in dataToSave.fact_works)
        if(dataToSave.fact_works[i]['status']=='on_work_with_reject')
          count++;
      // проверяем количество элементов с отклоненеими
      if(count>1)
      {
        self.$(".pnl-reject-works").find('.pnl-transfer-header-type').show();
        self.$(".pnl-reject-works").find('.pnl-transfer-header').hide();
        self.$(".pnl-reject-works").find(".data-container").hide();
      }
      else
      {
        self.$(".pnl-reject-works").find('.pnl-transfer-header-type').hide();
        self.$(".pnl-reject-works").find('.pnl-transfer-header').hide();
        self.$(".pnl-reject-works").find(".data-container").show();
      }
    }

    // отображение блоков управления приостановки работ
    if(dataToSave['have_pauses'])
    {
      self.$(".pnl-pause-works").show()
      var count = 0;
      for (var i in dataToSave.fact_works)
        // if(dataToSave.fact_works[i]['status']=='on_pause' && (dataToSave.fact_works[i]['status']!=dataToSave.fact_works[i]['old_status'] || dataToSave.fact_works[i]['repeat']))
      if(dataToSave.fact_works[i]['status']=='on_pause')
          count++;
      // проверяем количество элементов на приостановку
      if(count>1)
      {
        self.$(".pnl-pause-works").find('.pnl-transfer-header-type').show();
        self.$(".pnl-pause-works").find('.pnl-transfer-header').hide();
        self.$(".pnl-pause-works").find(".data-container").hide();
      }
      else
      {
        self.$(".pnl-pause-works").find('.pnl-transfer-header-type').hide();
        self.$(".pnl-pause-works").find('.pnl-transfer-header').hide();
        self.$(".pnl-pause-works").find(".data-container").show();
      }
    }

    // отображение блоков управления переносами сроков по работам
     if(dataToSave['have_transfers'])
     {
      self.$(".pnl-transfer-works").show()
      var count = 0;
      for (var i in dataToSave.fact_works)
        if(dataToSave.fact_works[i]['shift']>0 /*&& !dataToSave.fact_works[i]['is_first_fact']*/)
          count++;
      // проверяем количество элементов на перенос
      if(count>1)
      {
        self.$(".pnl-transfer-works").find('.pnl-transfer-header-type').show();
        self.$(".pnl-transfer-works").find('.pnl-transfer-header').hide();
        self.$(".pnl-transfer-works").find(".data-container").hide();
      }
      else
      {
        self.$(".pnl-transfer-works").find('.pnl-transfer-header-type').hide();
        self.$(".pnl-transfer-works").find('.pnl-transfer-header').hide();
        self.$(".pnl-transfer-works").find(".data-container").show();
      }
    }
    $(self.el).show();
   },

  /**
   * Очистка формы
  **/
  clear:function(){
    this.$(".data-container").hide().empty();
    this.$(".tb-note").val("");

    this.$(".ddl-own-date-transfer-reason").val("").change();;
    this.$('.pnl-transfer-header-type').hide().find('.cb').prop('checked',false);
    this.$('.pnl-transfer-header').hide();
    this.$(".pnl-transfer-works").hide();

    this.$(".ddl-own-hold-reason").val("").change();;
    this.$('.pnl-hold-header-type').hide().find('.cb').prop('checked',false);
    this.$(".pnl-hold-works").hide();

    this.$(".ddl-own-reject-reason").val("").change();;
    this.$('.pnl-reject-header-type').hide().find('.cb').prop('checked',false);
    this.$(".pnl-reject-works").hide();

    this.$(".ddl-own-pause-reason").val("").change();;
    this.$('.pnl-pause-header-type').hide().find('.cb').prop('checked',false);
    this.$(".pnl-pause-works").hide();
    //dthis.$(".btnOk").prop('disabled',true);
   },

  /**
   * Закрытие формы
  **/
  close:function(){
    var self = this;
     $(self.el).hide();
     //$(self.el).modal('hide');
     self.clear();
   }
});

///
/// Контрол управленяи списокм переноса дат
///
App.Views.ShiftItemsView = Backbone.View.extend({
   el: $("#pnlTransferDate"),

  /**
   * Отрисовка формы
  **/
  render: function () {
    var self = this;
      _.each(this.collection.models, function (item) {
        self.renderItem(item);
    }, this);
  },

  /**
   * Отрисовка элемента
  **/
  renderItem: function (item) {
    var hView = new App.Views.ShiftItemView({model: item});
    var transferView = new App.Views.ShiftItemView({model: item});

    if(item.get('status')=='on_hold' /*&& (item.get('status')!=item.get('old_status') || item.get('repeat'))*/)
      this.$(".hold-data-container").append(hView.render('on_hold').el);
    else if(item.get('status')=='on_pause' /*&& (item.get('status')!=item.get('old_status') || item.get('repeat'))*/)
      this.$(".pause-data-container").append(hView.render('on_pause').el);

    else if(item.get('status')=='on_work_with_reject')
      this.$(".reject-data-container").append(hView.render('on_work_with_reject').el);

    if(item.get('shift')>0 /*&& !item.get('is_first_fact')*/)
      this.$(".transfer-data-container").append(transferView.render('transfer_date').el);
  }
});

///
/// Контрол управления элементом переноса дат/ заморозки работ
///
App.Views.ShiftItemView = Backbone.View.extend({
  tagName:'div',
  className:'line data-item',
  templates: {
    shiftItemTemplate:_.template($("#dateTransferItem").html()),
    holdItemTemplate:_.template($("#holdItem").html()),
    rejectItemTemplate:_.template($("#rejectItem").html()),
    pauseItemTemplate:_.template($("#pauseItem").html()),
  },

  /**
   * Присоедиение событий
  **/
  events:{
     'change .ddl-date-transfer-reason': 'onChangeTransferReason',
     'change .ddl-hold-reason': 'onChangeHoldReason',
     'change .ddl-reject-reason': 'onChangeRejectReason',
     'change .ddl-pause-reason': 'onChangePauseReason',
     'change .tb-note': 'onChangeNote',
     'change .tb-shift-value': 'onChangeShiftValue',
     'change .tb-reason-note': 'onChangeReasonNote',
  },

  /**
   * Обработка события смены причины переноса дат
  **/
  onChangeShiftValue:function(){
  },

  /**
   * Обработка события смены причины переноса дат
  **/
  onChangeTransferReason:function(){
    var self = this;
    self.model.set({'transfer_reason_id':this.$('.ddl-date-transfer-reason').val(), 'transfer_reason':this.$('.ddl-date-transfer-reason option:selected'). text()});
  },

  /**
   * Обработка события смены причины простоя работ
   */
  onChangeHoldReason:function(){
    var self = this;
    self.model.set({'reason_id':this.$('.ddl-hold-reason').val(), 'reason':this.$('.ddl-hold-reason option:selected'). text()});
  },

  /**
   * Обработка события смены причины отклонения
   */
  onChangeRejectReason:function(){
    var self = this;
    self.model.set({'reason_id':this.$('.ddl-reject-reason').val(), 'reason':this.$('.ddl-reject-reason option:selected'). text()});
  },

  /**
   * Обработка события смены причины приостановки работ
   */
  onChangePauseReason:function(){
    var self = this;
    self.model.set({'reason_id':this.$('.ddl-pause-reason').val(), 'reason':this.$('.ddl-pause-reason option:selected'). text()});
  },

   /**
   * Обработка события смены примечания к переносу
  **/
  onChangeNote:function(e){
    if($(e.currentTarget).hasClass('tb-transfer-note'))
      this.model.set({'transfer_note':$(e.currentTarget).val()});
    else
      this.model.set({'note':$(e.currentTarget).val()});
  },

  /**
   * Обработка события смены пояснения к причине переноса
  **/
  onChangeReasonNote:function(){
    var self = this;
     self.model.set({'reason_note':this.$('.tb-reason-note').val()});
  },

  /**
   * Отрисовка элемента
  **/
  render: function (type) {
    var self = this;
    //if(this.model.get('status')=='on_hold' && this.model.get('status')!=this.model.get('old_status'))
    if(type=='on_hold')
    {
      this.$el.html(this.templates.holdItemTemplate(this.model.toJSON()));
      this.fillHoldReason(App.DatesTransferView.shiftReasons);
    }

    if(type=='on_work_with_reject')
    {
      this.$el.html(this.templates.rejectItemTemplate(this.model.toJSON()));
      this.fillRejectReason(App.DatesTransferView.shiftReasons);
    }

    //else if(this.model.get('status')=='on_pause' && this.model.get('status')!=this.model.get('old_status'))
    if(type=='on_pause')
    {
      this.$el.html(this.templates.pauseItemTemplate(this.model.toJSON()));
      this.fillPauseReason(App.DatesTransferView.shiftReasons);
    }

    if(type=='transfer_date')
    //if(this.model.get('shift')>0)
    {
      this.$el.html(this.templates.shiftItemTemplate(this.model.toJSON()));

      //$.extend({}, {'factDate': self.factDate}, this.model.toJSON());

      this.fillShiftReason(App.DatesTransferView.shiftReasons);
      // поле ввода количества дней для переноса числовое
      this.$el.find('.tb-shift-value').numeric('');
      // календарь
      var tmpDays =  Math.floor(( this.model.get('fact_date') -  new Date()) / 86400000);
      this.$('.date-picker input').val(this.model.get('fact_date').format("dd/mm/yyyy"));
      //console.log(this.model.get('fact_date'));
      //console.log(new Date());
      if(this.model.get('is_first_fact'))
        this.$('.date-picker').find('.add-on').hide();
        this.$('.date-picker').datepicker({
          calendarWeeks: true,
          format: "dd/mm/yyyy",
          weekStart: 1,
          startDate: (tmpDays>0)?"+"+(tmpDays-1).toString()+"d": "-"+(Math.abs(tmpDays)-1).toString()+"d",
          //todayBtn: "linked",
          autoclose: true,
          todayHighlight: false,
          defaultDate: this.model.get('fact_date')
        }).on('changeDate', function(ev){
            self.model.set('shift', Math.floor((ev.date - self.model.get('plan_date')) / 86400000)) ;
            self.$el.find('.tb-shift-value').val(self.model.get('shift').toString());
        });
    }
    return this;
  },

  /**
   * Заполнение списка причин переноса
  **/
  fillShiftReason: function(data)
  {
     var self = this;
     var filter = self.$('.ddl-date-transfer-reason');
    filter.empty();
    filter.append("<option value=''>Не задана</option>");
    _.each(data, function (item) {
      var option = $("<option/>", {
        value: item['_id'],
        text: item['name']
      }).appendTo(filter);
    });
  },
  /**
   * Заполнение списка причин простоя
  **/
  fillHoldReason: function(data)
  {
     var self = this;
     var filter = self.$('.ddl-hold-reason');
    filter.empty();
    filter.append("<option value=''>Не задана</option>");
    _.each(data, function (item) {
      var option = $("<option/>", {
        value: item['_id'],
        text: item['name']
      }).appendTo(filter);
    });
  },

  /**
   * Заполнение списка причин простоя
   */
  fillRejectReason: function(data)
  {
    var self = this;
    var filter = self.$('.ddl-reject-reason');
    filter.empty();
    filter.append("<option value=''>Выберите причину отклонения</option>");
    _.each(data, function (item) {
      var option = $("<option/>", {
        value: item['_id'],
        text: item['name']
      }).appendTo(filter);
    });
  },

  /**
   * Заполнение списка причин приостановки
  **/
  fillPauseReason: function(data)
  {
     var self = this;
     var filter = self.$('.ddl-pause-reason');
    filter.empty();
    filter.append("<option value=''>Выберите причину приостановки</option>");
    _.each(data, function (item) {
      var option = $("<option/>", {
        value: item['_id'],
        text: item['name']
      }).appendTo(filter);
    });
  },
});
