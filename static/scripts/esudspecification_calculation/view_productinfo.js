///
/// Контрол управления поиском на форме
///
App.Views.SpecificationInfoView = Backbone.View.extend({
    el: $("#product_info"),
    templates: {
        item:_.template($("#productItemInfoTemplate").html()),
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
        this.render();
    },

    /**
     * Обработка глобавльного события очистки данных
    **/
    onGlobalClear: function()
    {
        this.$el.html("Спецификация");
    },

    /**
    * Отрисовка
    **/
    render:function(model)
    {
        //this.$el.html(this.templates.item(this.model.toJSON()));

         if(model)
        {
            this.model = model;
            this.$el.html(this.templates.item(this.model.toJSON()));
        }
        else
            this.$el.html("Спецификация не найдена");
    }
});
