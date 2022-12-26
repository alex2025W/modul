///
/// Модель элемента спецификации
///
App.Models.SpecificationItemModel = Backbone.Model.extend({
    idAttribute: "_id",
    defaults: {
        'name': '',
        'number': '',
        'unique_props': '',
        'tech_props': '',
        'note': '',
        'date_add': '',
        'user_add': '',
        'volume_to_calculate': ''
    },
    initialize: function() {},
    parse: function(data) {
        // сбор уникальных характеристик
        var unique_props_str = "";
        var tech_props_str = "";
        if(data.properties)
        {
            for(var i in data.properties) {
                if(data.properties[i]['is_optional'] && !data.properties[i]['is_techno'])
                        unique_props_str += data.properties[i]['name'] + ": " + data.properties[i]['value'] +  ((data.properties[i]['unit'] && data.properties[i]['unit']!='?')?' ' +data.properties[i]['unit']:'') + '; ';
                else if(data.properties[i]['is_techno'])
                    tech_props_str += data.properties[i]['name'] + ": " + data.properties[i]['value'] +  ((data.properties[i]['unit'] && data.properties[i]['unit']!='?')?' ' +data.properties[i]['unit']:'') + '; ';
            }
        }
        data['unique_props'] = unique_props_str;
        data['tech_props'] = tech_props_str;
        // получение даты создания
        data['date_add'] = moment.utc(data['history'][0]['date'], 'YYYY-MM-DD HH:mm').local().format('DD.MM.YYYY HH:mm');
        data['user_add'] = data['history'][0]['user'];
        return data;
    }
});
///
/// Коллекция спецификаций
///
App.Collections.SpecificationItemsCollection = Backbone.Collection.extend({
    model: App.Models.SpecificationItemModel
});

///
/// Представление списка спецификаций
///
App.Views.SpecificationListView = Backbone.View.extend({
    //el: $("#esud_specification_list_body"),
    //volumes_to_calculate: {}, // история для восстановления введенных ранее объемов на рассчет
    pager: null,
    events:{
        'open_item': 'onOpenItem',
        'pager:change_page': 'onChangePage',
        'click .btn-calculate-specifications': 'onCalculateSpecifications',
        'click #cb-show-to-calculate': 'onShowToCalculate'
    },
    /**
     * Инициализация
    **/
    initialize: function()
    {
        this.pager = new App.Views.PagerView({el:this.$el.find('.specification-list-pager') });
    },

    /**
    * Отрисовка
    **/
    render: function(collection, current_page, count, clear_all)
    {
        var clear_all = clear_all || false;
        this.collection = collection;
        // Очистка формы
        this.clear(clear_all);
        var self = this;

        /*// восстановление объемов выбранных для рассчета
        _.each(this.collection.models, function (item) {
                if(item.get('number') in this.volumes_to_calculate)
                    item.set('volume_to_calculate', this.volumes_to_calculate[item.get('number')]);
                self.renderItem(item);
        }, this);*/

        var volumes_to_calculate = [];
        _.each(App.SpecificationsToCalculateCollection.models, function(item){
            volumes_to_calculate[item.get('number')] = item.get('volume_to_calculate');
        }, this )
        _.each(this.collection.models, function (item) {
                if(item.get('number') in volumes_to_calculate)
                    item.set('volume_to_calculate', volumes_to_calculate[item.get('number')]);
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
        var itemView = new App.Views.SpecificationItemView({model: item, 'parent': this});
        this.$el.find('.spec-data-list').append(itemView.render().el);
    },

    /**
     * Очистка формы
    **/
    clear: function(clear_all)
    {
        this.$el.find('.spec-data-list').empty();
        this.$el.find('#cb-show-to-calculate').prop('checked', false);
        //if(clear_all)
        //   this.clear_volumes_to_calculate();
    },

    /**
     * Очистка истории по значениям для рассчетов
    **/
    //clear_volumes_to_calculate: function()
    //{
    //  this.volumes_to_calculate = {};
    //},

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
        this.$el.find('#cb-show-to-calculate').prop('checked', false);
        Backbone.trigger('pager:change_page',[this, page]);
    },

    /**
     * Событие открытия формы рассета по выбранным специфкациям
    **/
    onCalculateSpecifications: function(e){
        // сбор всех спецификаций, у котороы заполнено свойство объем
        var to_calculate = [];

        /*for(var i in this.volumes_to_calculate){
            to_calculate.push(i+'#'+this.volumes_to_calculate[i]);
        }*/

        _.each(this.collection.models, function (item) {
                if(item.get('volume_to_calculate') && Routine.strToInt(item.get('volume_to_calculate'))>0)
                    to_calculate.push( item.get('number')+"#"+ item.get('volume_to_calculate'));
        }, this);

        /*this.$('.tb-to-calculate-val').each(function(){
            if($(this).val())
                to_calculate.push( $(this).data('number')+"#"+ $(this).val());
        });*/

        if(to_calculate.length==0)
        {
            $.jGrowl('Задайте объемы для спецификаций по которым необходимо произвести расчет.', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
            return;
        }

        window.open('/esud/specification/calculation#complects/#1/uncomplect/yes/specifications/'+to_calculate.join(';')+'/use_stock/no/stock_order_number//use_returned_waste/no/use_not_returned_waste/no');
    },

     /**
     * Событие отображения спецификаций по которым введены объемы на рассчет
    **/
    onShowToCalculate: function(e){
        this.$('.list-item').show();
        if(this.$('#cb-show-to-calculate').prop('checked'))
            this.$('.tb-to-calculate-val').each(function(){
                if(!$(this).val() || Routine.strToInt($(this).val())<1)
                    $(this).parents("tr:first").hide();
            });
    }
});

///
/// Представление элемента спецификации в списке
///
App.Views.SpecificationItemView = Backbone.View.extend({
    tagName:'tr',
    className:'list-item',
    templates: {
        item:_.template($("#listSpecificationItemTemplate").html()),
    },

    /**
     * Инициализация
    **/
    initialize: function()
    {
        this.parent = this.options['parent'];
    },

    /**
     * Присоедиение событий
    **/
    events:{
        'click td': 'onClickItem',
        'change .tb-to-calculate-val': 'onChangeValue', // событие смены значения поля для рассчета
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
        this.$('.tb-to-calculate-val').numeric({ negative: false, decimal: ',' });
        return this;
    },

    /**
     * Обработка клика на элемент
    **/
    onClickItem: function () {
        //Backbone.trigger('specificationlist:select_item',[this]);
    },

    /**
     * Обработка события смены значения в поле количества на рассчет
    **/
    onChangeValue: function(){
        this.model.set('volume_to_calculate', this.$('.tb-to-calculate-val').val());
        // // запоминаем в истории, для кого выставлялись объемы
        // this.parent.volumes_to_calculate[this.model.get('number')] = this.$('.tb-to-calculate-val').val();

        Backbone.trigger('specificationlist:add_item_to_calculate',[this.model]);
    }
});




