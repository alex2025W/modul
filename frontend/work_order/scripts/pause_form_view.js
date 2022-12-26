/**
 * Контейнер формы приостановки планов
 */
App.Views.PauseFormContainerView = Backbone.View.extend({
  el:'#pause-modal',
  templates: {
    template: _.template($('#PauseFormContainerTemplate').html())
  },
  events:{
    'close': 'closeDialog',
    'click .save-data': 'onSaveData',
    'click .remove-data': 'onRemoveData',
    'click .close-dialog': 'closeDialog',
  },
  pauseFormView: null,     // форма переноса сроков
  initialize:function(){
    this.render();
  },
  render: function(){
    var self = this;
    // отрисовка основной формы
    this.$el.html(this.templates.template());
    // добавление представления формы настроек календаря
    this.pauseFormView = new App.Views.PauseFormView({
      el: this.$('#pause-form-box'),
      model: this.model['pause'] ? new App.Models.PauseModel(this.model['pause']) : new App.Models.PauseModel()
    });
    // навешивание события на сокрытие формы
    this.$el.on('hidden', function () {
      self.$el.empty().html();
      self.undelegateEvents();
      self.$el.removeData().unbind();
      $(".static-box-pause").hide();
      $("body").addClass('no-overflow');
    });
    // Показать модальынй диалог
    $(".static-box-pause").show();
    $("body").addClass('no-overflow');
    this.$el.modal('show');
  },
  closeDialog: function(){
    $(".static-box-pause").hide();
    $("body").removeClass('no-overflow');
    this.$el.modal('hide');
  },
  onRemoveData: function(){
    var self = this;
    bootbox.confirm('Для всех выбранных объектов приостановка будет отменена. Продолжить?',function(result){
      if(result)
        self.removeData();
    });
  },
  onSaveData: function(){
    var self = this;
    if(this.model['is_multiple'])
    {
      bootbox.confirm('В сохранении участвуют присотановки с разными настройками. Старые значения будут перезаписаны. Продолжить?', function(result){
        if(result)
          self.saveData();
      });
    }
    else
      self.saveData();
  },
  saveData: function(){
    var self = this;
    if(!this.pauseFormView.checkData())
      return;

    this.model['pause'] = this.pauseFormView.getData().toJSON();
    // save data
    Routine.showLoader();
    $.ajax({
      type: "POST",
      url: "/handlers/workorderdate/save_pause",
      data: JSON.stringify(this.model),
      timeout: 35000,
      contentType: 'application/json',
      dataType: 'json',
      async:true
    }).done(function(result) {
        if(result['status']=="ok")
        {
          $.jGrowl('Данные успешно сохранены.', {
            'themeState':'growl-success', 'sticky':false, life: 10000
          });
          self.closeDialog();
          // обновить данные на форме
          App.FindView.onSearch();
        }
        else
          $.jGrowl('Ошибка сохранения данных. Подробности: ' + result['msg'], {
            'themeState':'growl-error', 'sticky':false, life: 10000
          });
    }).always(function(){Routine.hideLoader();
    }).error(function(e){$.jGrowl('Ошибка сервера, попробуйте повторить попытку.', { 'themeState':'growl-error', 'sticky':false, life: 10000 })});
  },
  removeData: function(){
    var self = this;
    $.ajax({
      type: "POST",
      url: "/handlers/workorderdate/remove_pause",
      data: JSON.stringify(this.model),
      timeout: 35000,
      contentType: 'application/json',
      dataType: 'json',
      async:true
    }).done(function(result) {
        if(result['status']=="ok")
        {
          $.jGrowl('Данные успешно сохранены.', {
            'themeState':'growl-success', 'sticky':false, life: 10000
          });
          self.closeDialog();
          // обновить данные на форме
          App.FindView.onSearch();
        }
        else
          $.jGrowl('Ошибка сохранения данных. Подробности: ' + result['msg'], {
            'themeState':'growl-error', 'sticky':false, life: 10000
          });
    }).always(function(){Routine.hideLoader();
    }).error(function(e){$.jGrowl('Ошибка сервера, попробуйте повторить попытку.', { 'themeState':'growl-error', 'sticky':false, life: 10000 })});
  }
});

/**
 * Контрол управленяи списокм настроект календаря
 */
App.Views.PauseFormView = Backbone.View.extend({
  templates: {
    template: _.template($('#PauseFormTemplate').html())
  },
  events:{
    'change #pause-reason': 'changePauseReason',
  },
  initialize:function(){
    this.render();
  },
  render:function(){
    // отрисовка основной формы
    this.$el.html(this.templates.template(this.model.toJSON()));
    // дата начала
    this.$('.datepicker1').val(this.model.get('date')?this.model.get('date'): moment().startOf('day').format("DD.MM.YYYY"));
    var checkin = this.$('.datepicker1').datepicker({
      calendarWeeks: true,
      format:'dd.mm.yyyy',
      weekStart:1,
      endDate: "+0d",
      autoclose: true,
      onRender: function(date) {}
    }).on('changeDate', function(ev) {
    }).data('datepicker');

    // fill data
    this.$('#pause-reason').val(this.model.get('reason_id'));
    if(
      this.model.get('reason_id')==App.PlanShiftReasonSystemObjects['ANOTHER_WORK'] ||
      this.model.get('reason_id')==App.PlanShiftReasonSystemObjects['NOT_PLAN_WORK'] ||
      this.model.get('reason_id')==App.PlanShiftReasonSystemObjects['PLAN_WORK']
    )
    {
      this.$('.row-pause-reason-detail').show();
    }
  },

  /**
   * Смена причины переноса дат
   */
  changePauseReason: function(e)
  {
    if(
      this.$('#pause-reason').val()==App.PlanShiftReasonSystemObjects['ANOTHER_WORK'] ||
      this.$('#pause-reason').val()==App.PlanShiftReasonSystemObjects['NOT_PLAN_WORK'] ||
      this.$('#pause-reason').val()==App.PlanShiftReasonSystemObjects['PLAN_WORK']
    ){
      this.$('.row-pause-reason-detail').show();
    }
    else{
      this.$('.row-pause-reason-detail').hide();
    }
  },

  checkData: function(){
    this.prepareData();

    if(!this.model.get('date')){
      $.jGrowl('Не задана дата приостановки работ.', { 'themeState':'growl-error', 'sticky':false });
      return false;
    }
    if (!this.model.get('reason_id') || this.model.get('reason_id') == '0'){
      $.jGrowl('Не задана причина приостановки работ.', { 'themeState':'growl-error', 'sticky':false });
      return false;
    }
    if(this.model.get('reason') == App.PlanShiftReasonSystemObjects['OTHER'] && this.model.get('note')=="")
    {
      $.jGrowl('Для причины: "Другое", комментарий обязателен для заполнения.', { 'themeState':'growl-error', 'sticky':false });
      return false;
    }

    // если в причине корректировки задан - перенос
    if(
      (this.model.get('reason_id')==App.PlanShiftReasonSystemObjects['ANOTHER_WORK'] ||
      this.model.get('reason_id')==App.PlanShiftReasonSystemObjects['NOT_PLAN_WORK'] ||
      this.model.get('reason_id')==App.PlanShiftReasonSystemObjects['PLAN_WORK']) &&
      (!this.model.get('reason_nodes') || this.model.get('reason_nodes').length==0)
    )
    {
      $.jGrowl('Заполните уточнение причины корректировки.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      return false;
    }
    return true;
  },
  prepareData: function(){
    var self = this;
    var need_comment = false;
    var reason_nodes = [];   // список нарядов уточнений причин переноса в формате на сохранение
    var date = Routine.parseDate(this.$('.datepicker1').val(),'dd.mm.yyyy');
    var date_str = this.$('.datepicker1').val();

    var tmp = this.$('#pause-reason-detail').val().replace(/\s+/g, '').split(',');
    for(var i in tmp)
    {
      var i_tmp = tmp[i].split('/');
      if(i_tmp.length>1)
      {
        if(Routine.strToInt(i_tmp[0]) && Routine.strToInt(i_tmp[1]))
          reason_nodes.push([Routine.strToInt(i_tmp[0]), Routine.strToInt(i_tmp[1])]);
      }
      else if(Routine.strToInt(i_tmp[0]))
        reason_nodes.push([Routine.strToInt(i_tmp[0])]);
    }

    this.model.set({
      'reason_id': self.$('#pause-reason').val(),
      'reason': self.$('#pause-reason :selected').text(),
      'note': self.$('#pause-comment').val(),
      'reason_nodes': reason_nodes,
      'date': date_str,
    });
  },
  getData: function(){
    this.prepareData();
    return this.model;
  }
});
