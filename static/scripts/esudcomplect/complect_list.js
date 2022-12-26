///
/// Модель элемента комплекта
///
App.Models.ComplectItemModel = Backbone.Model.extend({
    idAttribute: "_id",
    defaults: {
        'name': '',
        'number': '',
        'unique_props': '',
        'note': '',
        'date_add': '',
        'user_add': '',
    },
    initialize: function() {},
    parse: function(data) {
        // сбор уникальных характеристик
        var unique_props_str = "";
        if(data.properties)
        {
            for(var i in data.properties) {
                if(data.properties[i]['is_optional'] && !data.properties[i]['is_techno'])
                        unique_props_str += data.properties[i]['name'] + ": " + data.properties[i]['value'] +  ((data.properties[i]['unit'] && data.properties[i]['unit']!='?')?' ' +data.properties[i]['unit']:'') + '; ';
            }
        }
        data['unique_props'] = unique_props_str;
        // получение даты создания
        data['date_add'] = moment.utc(data['history'][0]['date'], 'YYYY-MM-DD HH:mm').local().format('DD.MM.YYYY HH:mm');
        data['user_add'] = data['history'][0]['user'];
        return data;
    }
});

///
/// Коллекция комлпектов
///
App.Collections.ComplectItemsCollection = Backbone.Collection.extend({
    model: App.Models.ComplectItemModel
});

///
/// Представление списка комплектов
///
App.Views.ComplectListView = Backbone.View.extend({
    el: $("#esud_complect_list_body"),
    pager: null,
    events:{
        'open_item': 'onOpenItem',
        'pager:change_page': 'onChangePage',
    },
    /**
     * Инициализация
    **/
    initialize: function()
    {
        this.pager = new App.Views.PagerView({el:this.$el.find('.complect-list-pager') });
    },

    /**
    * Отрисовка
    **/
    render: function(collection, current_page, count)
    {
        this.collection = collection;
        // Очистка формы
        this.clear();
        var self = this;
        _.each(this.collection.models, function (item) {
                self.renderItem(item);
        }, this);

        // отрисовка пейджера
        this.pager.render(current_page, count);

        return this;
    },

    /**
     * Отрисовка элемента
    **/
    renderItem: function (item) {
        var itemView = new App.Views.ComplectItemView({model: item});
        this.$el.find('.complect-data-list').append(itemView.render().el);
    },

    /**
     * Очистка формы
    **/
    clear: function()
    {
        this.$el.find('.complect-data-list').empty();
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

    /**
     * Событие смены страницы
    **/
    onChangePage: function(e, page)
    {
        Backbone.trigger('pager:change_page',[this, page]);
    }
});

///
/// Представление элемента комплекта в списке
///
App.Views.ComplectItemView = Backbone.View.extend({
    tagName:'tr',
    className:'list-item',
    templates: {
        item:_.template($("#listComplectItemTemplate").html()),
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
        'click td': 'onClickItem',
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
    },

    /**
     * Обработка клика на элемент
    **/
    onClickItem: function () {
        //Backbone.trigger('complectlist:select_item',[this]);
    },
});




