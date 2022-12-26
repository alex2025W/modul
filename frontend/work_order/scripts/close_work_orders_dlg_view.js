///---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
/// Представление диалога закрытия выбранных нарядов
///---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
App.Views.closeWorkordersDlgView = Backbone.View.extend({
    template:_.template($("#closeWorkordersTemplate").html()),
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
    },

    /**
     ** Применение действия
    **/
    onSaveClick:function(e){
        var self = this;
        if(!this.$('.note').val())
        {
            $.jGrowl('Необходимо заполнить примечание.', { 'themeState':'growl-error', 'sticky':false });
            return;
        }
        Routine.showLoader();
        $.ajax({
            type: "PUT",
            url: "/handlers/workorder/close_workorders",
            data: JSON.stringify({'data_to_save':this.model['items'], 'note': this.$('.note').val()}),
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
