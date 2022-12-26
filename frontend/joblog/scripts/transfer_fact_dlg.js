///---------------------------------------------------------------------------------------------------------
/// Представление диалога закрытия выбранных нарядов
///---------------------------------------------------------------------------------------------------------
App.Views.transferFactDlgView = Backbone.View.extend({
  template:_.template($("#transferFactDialogTemplate").html()),
  events:{
    'click .btn-save':'onSaveClick'
  },
  /**
   ** Инициализация
  **/
  initialize:function(){
    this.render();
  },
  /**
   ** Отрисовка
  **/
  render:function(){
    var self = this;
    this.$el.append(this.template($.extend({},this.model)));
    this.$el.modal({close: function(){}});
    this.$el.on('hidden', function () { self.trigger("dialogclose"); })
    this.$el.find(".tb-note").focus();
    this.$('.tbFact').numeric({ negative: false, decimal: ',' });
  },

  ///
  /// Обработка строки формата: наряд/номер работы
  ///
  parse_linked_work: function(val){
    val = Routine.trim(val);
    tmp = val.split('/');
    if(tmp.length<2 || !tmp[0] || !tmp[1] || !Routine.isDiggit(tmp[0]) || !Routine.isDiggit(tmp[1]))
      throw new SyntaxError("Неверный формат данных в поле наряд/работа");
    return {'workorder_number': tmp[0], 'work_number': tmp[1]};
  },

  /**
   ** Применение действия
  **/
  onSaveClick:function(e){
    var self = this;
    // обработка прилинкованной задачи
    var linked_work_obj = null;
    var volume = Routine.strToFloat(this.$('.tbFact').val());
    var note = this.$('.note').val();
    try {
      linked_work_obj = this.parse_linked_work(this.$('.tbLinkedWork').val());
    }
    catch (err) {
      $.jGrowl(err.message, { 'themeState':'growl-error', 'sticky':false, life: 5000});
      return false;
    }
    if(!note)
    {
      $.jGrowl('Необходимо заполнить примечание.', { 'themeState':'growl-error', 'sticky':false });
      return;
    }
     if(!volume)
    {
      $.jGrowl('Необходимо заполнить объем перезачета.', { 'themeState':'growl-error', 'sticky':false });
      return;
    }
    Routine.showLoader();
    $.ajax({
      type: "PUT",
      url: "/handlers/joblog/transfer_fact",
      data: JSON.stringify({'transfer_to':this.model, 'note': note, 'volume': volume, 'transfer_from': linked_work_obj }),
      timeout: 35000,
      contentType: 'application/json',
      dataType: 'json',
      async:true
    }).done(function(result) {
        if(result['status']=="ok")
        {
          self.trigger("dialogsave",{'status': 'ok'});
          self.$el.modal('hide');
          self.$el.remove();
        }
        else
          $.jGrowl('Ошибка сохранения данных. Подробности: ' + result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 10000 });
    }).always(function(){Routine.hideLoader()});
  }
})
