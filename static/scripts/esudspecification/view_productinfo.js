///
/// Контрол управления поиском на форме
///
App.Views.ProductInfoView = Backbone.View.extend({
    el: $("#product_info"),
    templates: {
        item:_.template($("#productItemInfoTemplate").html()),
        item_specification:_.template($("#specificationItemInfoTemplate").html()),
    },
    events:{
        //'click #btnBriefFind': 'obrabotka',
        'click .btn-calculate-specification': 'onSpecificationCalculate',
        'click .btn-edit-specification': 'onSpecificationEdit',
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
        this.$el.find('.left').html("Спецификация");
        this.$el.find('.right').hide();
    },

    /**
    * Отрисовка
    **/
    render:function(model)
    {
        this.$el.find('.right').hide();
        if(model)
        {
            this.model = model;
            // показываем контролы управления только для спецификации
            if(App.getObjectTypeByNumber(this.model.get('number'))== 'specification' )
            {
                this.$el.find('.left').html(this.templates.item_specification(this.model.toJSON()));
                this.$el.find('.right').show();
            }
            else
                this.$el.find('.left').html(this.templates.item(this.model.toJSON()));
        }
        else
        {
            this.$el.find('.left').html("Объект не найден");
            this.$el.find('.right').hide();
        }
    },

    /**
     * Обработка кнопки вызова расчета норм спецификации
    **/
    onSpecificationCalculate:function(e)
    {
           // переход к форме расчета норм спецификации
           window.open('/esud/specification/calculation#specifications/' + App.SpecificationInfo['number'] + '#1/use_stock/no/stock_order_number/');
    },

    /**
     * Обработка кнопки редактриования спецификации
    **/
    onSpecificationEdit: function(e){
        Backbone.trigger('global:on_edit_specification',[self]);
    }
});
