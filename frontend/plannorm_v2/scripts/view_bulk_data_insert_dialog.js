App.Views.DataInsertDialogView = Backbone.View.extend({
  template:_.template($("#ViewBulkDataInsertDialogTemplate").html()),
  events:{
    'click .btn-save':'onSaveClick'
  },

  initialize:function(obj){
    this.render();
  },

  render:function(obj){
    var self = this;
    this.$el.append(this.template($.extend({},this.model)));
    this.$el.modal({close: function(){}});
    this.$el.on('hidden', function () { self.trigger("dialogclose"); })
  },

  changeCategory: function(e){
    self.allowSaveButton();
  },

  allowSaveButton: function(){
    this.$('.btn-save').prop('disabled', true);
    if(this.$('.tb-value').val()!=='')
      this.$('.btn-save').prop('disabled', false);
  },

  onSaveClick:function(e){
    var data = [];
    var invalidValues = [];

    var tmpData = Routine.removeAllSpaces(this.$('.tb-value').val());
    if(!tmpData)
    {
      $.jGrowl('Заполните данные.', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
      return;
    }

    tmpData = tmpData.split('\n');
    for(var i in tmpData){
      var val = tmpData[i];
      if(val){
        if(!Routine.isDiggit(val))
          invalidValues.push(val);
        else
          data.push(Routine.strToFloat(val));
      }
    }

    if(invalidValues.length > 0)
    {
      $.jGrowl('Ошибка! Некоторые значения имеют неверный формат данных.<br/><br/>' + invalidValues.join('<br/>'), { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      return;
    }

    this.trigger("dialogsave", { values: data });
    this.$el.modal('hide');
    this.$el.remove();
  }
})
