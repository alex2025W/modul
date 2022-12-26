///
/// КОМПОНЕНТ  - РАСЧЕТ ПО УКРУПНЕННОМУ ИЗДЕЛИЮ
///
///
/// Представление списка фильтров по спецификациям
///
App.Views.SpecificationFilterListView = Backbone.View.extend({
    tagName:'div',
    events:{
        'click .btn-calculate-by-specifications': 'onCalculate',
        'click .btn-add-specifications': 'onAddFilterItem',
        'click .btn-cancel-filter': 'onCancelFilter',
        'add_item': 'onAddFilterItem',
        'remove_item': 'onRemoveFilterItem'
    },
    /**
     * Инициализация
    **/
    initialize: function()
    {
    },

    /**
     * Обработка события удаления элемента из списка спецификаций
    **/
    onRemoveFilterItem: function(e, item)
    {
        // удаление модели из коллекции
        item.model.destroy();
        this.onCalculate();
    },

    /**
     * Обработка события добавления нового элемента в коллекцию
    **/
    onAddFilterItem: function(e, spec_info)
    {
        var is_need_new_item = true;
        var item = new App.Models.SpecificationFilterModel();
        // если на вхоже есть иныормация о спецификации
        if(spec_info){
            // поиск в существующей коллекции элемента
            var items= this.collection.where({ number: spec_info.get('number') });
            if(items.length>0)
            {
                is_need_new_item = false;
                for(var i in items)
                    items[i].set('count', items[i].get('count') +1);
            }
            else
            {
                if(this.collection.length==1 && this.collection.models[0].get('number') == '')
                {
                    item = this.collection.models[0];
                    is_need_new_item = false;
                }
                item.set({
                    'number': spec_info.get('number'),
                    'label': spec_info.get('number') + ' '+spec_info.get('name'),
                });
            }
        }

        // если требуется новый элемент в фильтре
        if(is_need_new_item)
        {
            this.collection.add(item);
            this.renderItem(item, false);
        }
    },

    /**
     * Заоленение  подготовленнного спика спецификаций в блок расчета
    **/
    setFilterItems: function(items)
    {
        // очистить список
        this.collection.reset();
        for(var i in items)
            this.collection.add(new App.Models.SpecificationFilterModel(items[i]));
        this.render();
    },

    /**
    * Отрисовка
    **/
    render: function()
    {
        // Очистка формы
        this.clear();
        var self = this;
        var i=0;
        _.each(this.collection.models, function (item) {
                self.renderItem(item);
                i++;
        }, this);
        return this;
    },

    /**
     * Отрисовка элемента
    **/
    renderItem: function (item) {
        var itemView = new App.Views.SpecificationFilterItemView({model: item});
        this.$el.find('.pnl-specification-filter-list').append(itemView.render().el);
    },

    /**
     * Сбросить фильтр
    **/
    onCancelFilter: function()
    {
        this.collection.reset();
        this.collection.add(new App.Models.SpecificationFilterModel({'is_first': true}));
        this.render();
        $(this.el).trigger('specification_filter_list_view:clear_filter', [this]);
    },

    /**
     * Обработка кнопки запуска расчета
    **/
    onCalculate: function()
    {
        var self =  this;
        var is_ok = true;
        // сбор информации о заполненных спецификацих
        var specs = this.collection.toJSON();
        _.each(this.collection.models, function (item) {
                if(!item.get('number') || !item.get('count'))
                {
                    is_ok = false;
                    return;
                }
               var num_items = item.get('number').split('.');
               if(num_items.length!=3)
               {
                    is_ok = false;
                    return;
              }
        }, this);

        // если проверка не прошла
        if(!is_ok)
        {
            $.jGrowl('По некоторым  спецификациям указанны неверные данные. Проверьте все артикули и количества.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
            return;
        }

        //  получение информации о требуемых спецификациях
       Routine.showLoader();
       $.ajax({
                type: "POST",
                url: "/handlers/esudspecification/get_specifications_info",
                data: JSON.stringify(specs),
                timeout: 55000,
                contentType: 'application/json',
                dataType: 'json',
                async:true
                }).done(function(result) {
                    if(result['status']=="error")
                    {
                        $.jGrowl(result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 10000 });
                        // применить фильтр
                        //$(self.el).trigger('specification_filter_list_view:apply_filter', []);
                        // очистить фильтр
                        $(self.el).trigger('specification_filter_list_view:clear_filter', [self]);
                    }
                    else
                    {
                        var specifications = result['data'];
                        var result_specs = [];
                        // отсеиваем пустые спецификации, если такие есть
                        var empty_specs = [];
                        for(var i in specifications)
                        {
                            if(!specifications[i]['info'])
                                empty_specs.push(i);
                            else
                                result_specs.push(specifications[i]);
                        }
                        // проставление названий для спецификций в фильтре
                        _.each(self.collection.models, function (item) {
                                if(item.get('number') in specifications && specifications[item.get('number')]['info'] )
                                    item.set('label', item.get('number') + ' ' + specifications[item.get('number')]['info']['name'] );
                                else
                                    item.set('label', 'Ошибка! Спецификация не найдена.' );
                        }, self);
                        // проверка на несуществующие спецификации
                        if(empty_specs.length>0)
                            $.jGrowl('По данным спецификациям: ' + empty_specs.join('; ') + ' нет данных. Расчеты произведены без их участия', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                        // применить фильтр
                        result_specs = result_specs.sort(function (a, b) { return a['index'] - b['index'] });
                        $(self.el).trigger('specification_filter_list_view:apply_filter', [result_specs]);
                    }
                }).error(function(){
                            $.jGrowl('Ошибка поиска спецификаций. Повторите попытку. ', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
        }).always(function(){Routine.hideLoader();});
    },

    /**
     * Очистка формы
    **/
    clear: function()
    {
        this.$el.find('.pnl-specification-filter-list').empty();
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
/// Представление элемента фильтра по спецификациям
///
App.Views.SpecificationFilterItemView = Backbone.View.extend({
    tagName:'div',
    className:'input-prepend input-append list-item',
    templates: {
        item_plus:_.template($("#filterItemTemplateSpecificationPlus").html()),
        item_minus:_.template($("#filterItemTemplateSpecificationMinus").html()),
    },

    /**
     * Инициализация
    **/
    initialize: function()
    {
        this.model.on('destroy', this.unRender, this);
        this.model.on('change', this.render, this);
    },

    /**
     * Присоедиение событий
    **/
    events:{
        'click .btn-remove': 'onRemoveItem',
        'click .btn-add': 'onAddItem',
        'change .tb-specification-number, .tb-specification-volume': 'onChnageParams'
    },

    /**
     * Удление представления
    **/
    unRender: function()
    {
        this.remove(); // this.$el.remove()
    },

    /**
     * Обработка события смены номера спецификации или объема
    **/
    onChnageParams: function(e)
    {
        e.preventDefault();
        this.model.set('number', Routine.removeAllSpaces(this.$el.find('.tb-specification-number').val()));
        this.model.set('count', this.$el.find('.tb-specification-volume').val());
    },

    /**
     * Обработка кнопки удаления элемента
    **/
    onRemoveItem: function()
    {
        $(this.el).trigger('remove_item', [this]);
        //this.model.destroy();
    },

    /**
     * Обработка кнопки добавление нового элемента
    **/
    onAddItem: function()
    {
        // this.model.remove();
        //Backbone.trigger('specification_filter_list_view:add_item',[this]);
        $(this.el).trigger('add_item', [this]);
    },

     /**
     * Отрисовка элемента
    **/
    render: function () {
        // if(this.model.get('is_first'))
        //    this.$el.html(this.templates.item_plus(this.model.toJSON()));
        // else
        this.$el.html(this.templates.item_minus(this.model.toJSON()));
        this.$('.tb-specification-volume').numeric({ negative: false, decimal: ',' });
        return this;
    }
});
