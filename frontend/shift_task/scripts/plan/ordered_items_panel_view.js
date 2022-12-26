///
///  Представление блока заказных изделий
/// Необходяио чтобы пользователи видели сколько деталей произведено для конечного изделия
///
App.Views.SpecificationOwnerListView = Backbone.View.extend({
    //tagName:'div',
    events:{
    },

    /**
     * Инициализация
    **/
    initialize: function()
    {
    },

    /**
     * Отрисовка всего списка
    **/
    render: function()
    {
        // Очистка формы
        this.clear();
        var self = this;
        // сортировка коллекции по размерности спецификаций
        //this.collection.models = this.collection.models.sort(function (a, b) { return a.get('deep') - b.get('deep') });
         this.collection.sortBy("deep","number");
        _.each(this.collection.models, function (item) {self.renderItem(item);}, this);

        this.$('.collapsible').collapsible();

        return this;
    },

    /**
     * Отрисовка элемента
    **/
    renderItem: function (item) {
        var itemView = new App.Views.SpecificationOwnerItemView({model: item});
        this.$el.find('tbody').append(itemView.render().el);
    },

    /**
     * Очистка формы
    **/
    clear: function()
    {
        this.$el.find('tbody').empty();
    },

    /**
     * показать
    **/
    show: function()
    {
        this.$el.show();
    },

    /**
     * скрыть
    **/
    hide: function()
    {
        this.$el.hide();
    }
});

///
/// Представление элемента итоговой(заказной) спецификации
///
App.Views.SpecificationOwnerItemView = Backbone.View.extend({
    tagName:'tr',
    templates: {
        item:_.template($("#ownerItemTemplateSpecification").html()),
    },

    events:{
        'click .lnk-add-item-to-calculate': 'onItemToCalculate',
    },

    onItemToCalculate: function()
    {
        //console.log(this.model.toJSON());
        $(this.el).trigger('specification_owner_item_view:add_item_to_calculate', [this.model]);
    },

    /**
     * Удление представления
    **/
    unRender: function()
    {
        this.remove(); // this.$el.remove()
    },

     /**
     * Отрисовка элемента
    **/
    render: function () {
            this.$el.html(this.templates.item(this.model.toJSON()));
            return this;
    }
});
