///
/// Контрол управления поиском на форме
///
App.Views.ModelInfoView = Backbone.View.extend({
    el: $("#config_info"),
    templates: {
        item:_.template($("#configItemInfoTemplate").html()),
    },
    events:{
    },

    /**
    * Инициализация
    **/
    initialize: function()
    {
        // глобальное событие на очистку данных
        Backbone.on("global:clear",this.onGlobalClear,this);
    },

    /**
     * Обработка глобавльного события очистки данных
    **/
    onGlobalClear: function()
    {
        this.$el.html("Комплект");
    },

    /**
    * Отрисовка
    **/
    render:function(model)
    {
        if(model)
        {
            this.model = model;
            this.$el.html(this.templates.item(this.model.toJSON()));
        }
        else
            this.$el.html("Комплект не найден");
    }
});
