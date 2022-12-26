///
/// Модель элемента спецификации
///
App.Models.SpecificationHistoryItemModel = Backbone.Model.extend({
    idAttribute: "_id",
    defaults: {
        'date': '',
        'user': '',
        'note': ''
    },
    initialize: function() {},
    parse: function(data) {
        data['date'] = moment.utc(data['date'], 'YYYY-MM-DD HH:mm').local().format('DD.MM.YYYY HH:mm');
        return data;
    }
});
///
/// Коллекция спецификаций
///
App.Collections.SpecificationHistoryItemsCollection = Backbone.Collection.extend({
    model: App.Models.SpecificationHistoryItemModel
});

///
/// Представление списка спецификаций
///
App.Views.SpecificationHistoryView = Backbone.View.extend({
    //el: $("#esud_specification_list_body"),
    events:{
    },

    /**
     * Инициализация
    **/
    initialize: function()
    {
    },

    /**
    * Отрисовка
    **/
    render: function(collection)
    {
        this.collection = collection;
        // Очистка формы
        this.clear();
        var self = this;
        _.each(this.collection.models, function (item) {
                self.renderItem(item);
        }, this);
        return this;
    },

    /**
     * Отрисовка элемента
    **/
    renderItem: function (item) {
        var itemView = new App.Views.SpecificationHistoryItemView({model: item});
        this.$el.find('.data-list').append(itemView.render().el);
    },

    /**
     * Очистка формы
    **/
    clear: function()
    {
        this.$el.find('.data-list').empty();
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
    },
});

///
/// Представление элемента спецификации в списке
///
App.Views.SpecificationHistoryItemView = Backbone.View.extend({
    tagName:'tr',
    className:'list-item',
    templates: {
        item:_.template($("#specificationHistoryItemTemplate").html()),
    },
    /**
     * Инициализация
    **/
    initialize: function()
    {
    },
    /**
     * Присоедиение событий
    **/
    events:{
    },
    /**
     * Удление представления
    **/
    unRender: function()
    {
        this.remove();
    },
     /**
     * Отрисовка элемента
    **/
    render: function () {
        this.$el.html(this.templates.item(this.model.toJSON()));
        return this;
    },
    /**
     * Обработка клика на элемент
    **/
    onClickItem: function () {
    },
});




