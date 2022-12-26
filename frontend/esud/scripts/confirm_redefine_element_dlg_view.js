///---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
/// Представление диалога переопределения значений ярлыка для конкретного элемента
/// Например, внутри модели заходим в ярлык, получаем все псевдо элементы ярлыка, кликаем
/// на любой псевдоэлемент, система предлагает либо переопределить его, либо перейти в источник.
///---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
App.Views.confirmRedefineElementDlgView = Backbone.View.extend({
    template:_.template($("#confirmRedefineElementTemplate").html()),
    events:{
        'click .btn-save':'onSaveClick',
        'change .type': 'changeType',
    },
    /**
     ** Инициализация
    **/
    initialize:function(obj){
        this.render(obj);
    },
    /**
     ** Отрисовка
    **/
    render:function(obj){
        var self = this;
        this.$el.append(this.template($.extend({},this.model)));
        this.$el.modal({close: function(){}});
        this.$el.on('hidden', function () { self.trigger("dialogclose"); })
        this.$el.find(".name").focus();
    },
    /**
     *  Смена типа действия
    **/
    changeType: function(e){
        this.$('.btn-save').prop('disabled', false);
        if(this.$('.type').val()=='')
            this.$('.btn-save').prop('disabled', true);
    },
    /**
     ** Применение действия
    **/
    onSaveClick:function(e){
        if(this.$('.type').val()=='')
            return;
        this.trigger("dialogsave",{'type': this.$('.type').val()});
        this.$el.modal('hide');
        this.$el.remove();
    }
})
