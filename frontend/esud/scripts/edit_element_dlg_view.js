///---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
/// Представление диалога добавления/редактирования элемента--------------------------------------------------------------------------------------
///---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
App.Views.editElementDlg = Backbone.View.extend({
    template:_.template($("#newElementTemplate").html()),
    initialize:function(obj){
        this.render(obj);
    },

    events:{
        'click .btn-save':'onSaveClick',
        'keypress .name': 'enterKey',
        'change .type': 'changeType',
        'change .cb-open-value': 'selectOpenValue',
    },

    render:function(obj){
        var parent_id = (obj)?obj['parent_elem_id']:null;
        var type = (obj)?obj['type']:null;
        var self = this;
        this.$el.append(this.template($.extend({},this.model,{parent_id:parent_id, type: type})));
        this.$el.modal({close: function(){}});
        this.$el.on('hidden', function () { self.trigger("dialogclose"); })
        this.$el.find(".name").focus();
    },

    /**
     *  Флаг открытого значения
    **/
    selectOpenValue: function(e)
    {
        if(this.$el.find('.cb-open-value').prop('checked'))
            this.$el.find('input.name').prop('disabled', true).val('(Открытое значение)');
        else
            this.$el.find('input.name').prop('disabled', false).val('');
    },

    /**
     *  Смена типа
    **/
    changeType: function(e)
    {
        return;
        this.$el.find('.pnl-null-value').hide();
        this.$el.find('input.name').prop('disabled', false).val('');
        if(this.$('.type').val() == 'value')
        {
            this.$el.find('.pnl-null-value').show();
            this.$el.find('.pnl-null-value').find('.cb-open-value').prop('checked',false);
            //this.$el.find('input.name').prop('disabled', true);
        }
    },

    /**
     *  Проверка нажатой клавиши в поле поиска
    **/
    enterKey: function(e)
    {
        if(e.keyCode==13)
            this.onSaveClick();
    },

    onSaveClick:function(){
        if(!this.model || !this.model['_id'])
        {
            if(this.$(".type-remember").is(":checked")){
                App.SetEditDialogAutosave(this.$(".type").val());
            }else
                App.SetEditDialogAutosave('');
        }

        if(this.$el.find(".name").val()=="")
            $(this.$el.find(".name").parents(".control-group")[0]).addClass("error");
        else{
            $(this.$el.find(".name").parents(".control-group")[0]).removeClass("error");
            this.trigger("dialogsave");
            this.$el.modal('hide');
            this.$el.remove();
        }
    }
})
