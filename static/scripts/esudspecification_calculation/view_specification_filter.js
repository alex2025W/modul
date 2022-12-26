///
/// Представление списка фильтров по спецификациям
///
App.Views.SpecificationFilterListView = Backbone.View.extend({
    tagName:'div',
    disabled: false, // состояние всего контрола
    events:{
        'click .btn-add-specifications': 'onAddFilterItem',
        'click .btn-cancel-filter': 'onCancelFilter',
        'add_item': 'onAddFilterItem',
        'remove_item': 'onRemoveFilterItem',
        'change_specification_data': 'onChangeFilterItem'
    },

    /**
     * Инициализация
    **/
    initialize: function()
    {
        this.disabled = false;
    },

    /**
     * Обработка события удаления элемента из списка спецификаций
    **/
    onRemoveFilterItem: function(e, item)
    {
        // destroy model in collection
        item.model.destroy();
        // run event on change item data
        this.onChangeFilterItem(e, item);
    },

    onChangeFilterItem: function(e, item)
    {
        $(this.el).trigger('specification_filter_list_view:change_specification_data', [this]);
    },

    /**
     * Обработка события добавления нового элемента в коллекцию
    **/
    onAddFilterItem: function()
    {
        var item = new App.Models.SpecificationFilterModel();
        this.collection.add(item);
        this.renderItem(item, false);
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
        var itemView = new App.Views.SpecificationFilterItemView({model: item, parent_view: this});
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
     * Загрузить данные на форму спецификаций
     * data = [{'number':'', 'count':0}]
    **/
    loadData: function(data, disabled)
    {
        this.disabled = disabled;
        this.show();
        this.collection.reset();
        this.clear();
        if(data && data.length>0)
        {
            var is_first = true;
            for(var i in data)
            {
                var row = data[i];
                if(!row['is_buy'])
                {
                    var unique_props_str = "";
                    var tech_props_str = "";
                    if(row.properties)
                    {
                        for(var i in row.properties) {
                            if(row.properties[i]['is_optional'] && !row.properties[i]['is_techno'])
                                    unique_props_str += row.properties[i]['name'] + ": " + row.properties[i]['value'] +  ((row.properties[i]['unit'] && row.properties[i]['unit']!='?')?' ' +row.properties[i]['unit']:'') + '; ';
                            else if(row.properties[i]['is_techno'])
                                tech_props_str += row.properties[i]['name'] + ": " + row.properties[i]['value'] +  ((row.properties[i]['unit'] && row.properties[i]['unit']!='?')?' ' +row.properties[i]['unit']:'') + '; ';
                        }
                    }

                    var item = new App.Models.SpecificationFilterModel({
                            'number': row['number'],
                            'count':row['count']['value'],
                            'is_first': is_first,
                            //'label': row['number'] + '. ' + row['name'],
                            'is_buy': row['is_buy'],
                            'name': row['name'],
                            'unique_props': unique_props_str,
                            'tech_props':tech_props_str,
                            'note': row['note'],
                            'date_add': row['history']?moment.utc(row['history'][0]['date'], 'YYYY-MM-DD HH:mm').local().format('DD.MM.YYYY HH:mm'):'',
                            'user_add': row['history']?row['history'][0]['user']:'',
                    });
                    is_first = false;
                    this.collection.add(item);
                    this.renderItem(item, false);
                }
            }
        }
        else
            this.onCancelFilter();
        this.disable(this.disabled);
    },

    getData: function()
    {
        var result = [];
        if (this.collection.length>0 && this.collection.models[0].get('number')!="" && this.collection.models[0].get('count')!="")
        {
            var specs = this.collection.toJSON();
            for(var i in specs)
            {
                var row = specs[i];
                result.push({
                    'number': row['number'],
                    'count': row['count']
                });
            }
            return result;
        }
        else
            return [];
    },

    /**
     * Формаирование URL из параметров спецификации
     **000.000.000#1;000.000.001#2;
    **/
    getUrl: function()
    {
        var result = [];
        var specs = this.collection.toJSON();
        for(var i in specs)
        {
            var row = specs[i];
            result.push(row['number'] + '#' + row['count'].toString());
        }
        return 'specifications='+ result.join(';');
    },

    /**
     * Очистка формы
    **/
    clear: function()
    {
        this.$el.find('.pnl-specification-filter-list').empty();
        //this.collection.reset();
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
     * Активировать/Деактивировать
    **/
    disable: function(val)
    {
        this.disabled = val;
        this.$el.find("input,button").prop('disabled', val);
    },

    /**
     * Check on active data in filter
    **/
    haveData: function()
    {
        return (this.collection.length>0 && this.collection.models[0].get('number')!="" && this.collection.models[0].get('count')!="");
    }
});

///
/// Представление элемента фильтра по спецификациям
///
App.Views.SpecificationFilterItemView = Backbone.View.extend({
    tagName:'tr',
    className:'list-item',
    parent_view: null, // родительское представление
    templates: {
        //item_plus:_.template($("#filterItemTemplateSpecificationPlus").html()),
        item_minus:_.template($("#filterItemTemplateSpecificationMinus").html()),
    },

    /**
     * Инициализация
    **/
    initialize: function()
    {
        this.parent_view = this.options.parent_view;
        this.model.on('destroy', this.unRender, this);
        this.model.on('change', this.render, this);
    },

    /**
     * Присоедиение событий
    **/
    events:{
        'click .btn-remove': 'onRemoveItem',
        'click .btn-add': 'onAddItem',
        //'change .tb-specification-number, .tb-specification-volume': 'onChnageParams'
        'change .tb-specification-number': 'onChangeSpecificationNumber',
        'change .tb-specification-volume': 'onChangeSpecificationVolume'
    },

    /**
     * Удление представления
    **/
    unRender: function()
    {
        this.remove(); // this.$el.remove()
    },

    /**
     * event on changing complect number
    **/
    onChangeSpecificationNumber: function(e)
    {
        var self = this;
        e.preventDefault();
        var specification_number = Routine.removeAllSpaces(this.$el.find('.tb-specification-number').val());
        var specification_count = this.$el.find('.tb-specification-volume').val();
        if(!specification_number)
        {
            $.jGrowl('Не задан номер спецификации. Повторите попытку. ', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
            return;
        }
        // load specification info
        Routine.showLoader();
        $.ajax({
                type: "GET",
                url: "/handlers/esudspecification/get_origin/" + specification_number,
                data: null,
                timeout: 55000,
                contentType: 'application/json',
                dataType: 'json',
                async:true
                }).done(function(result) {
                    if(result['status']=="error")
                        $.jGrowl(result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 10000 });
                    else
                    {
                        var row = result['data'];
                        if(!row)
                        {
                            $.jGrowl('Нет данных по спецификации. Повторите попытку. ', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                            self.render();
                            return;
                        }

                        var unique_props_str = "";
                        var tech_props_str = "";
                        if(row.properties)
                        {
                            for(var i in row.properties) {
                                if(row.properties[i]['is_optional'] && !row.properties[i]['is_techno'])
                                        unique_props_str += row.properties[i]['name'] + ": " + row.properties[i]['value'] +  ((row.properties[i]['unit'] && row.properties[i]['unit']!='?')?' ' +row.properties[i]['unit']:'') + '; ';
                                else if(row.properties[i]['is_techno'])
                                    tech_props_str += row.properties[i]['name'] + ": " + row.properties[i]['value'] +  ((row.properties[i]['unit'] && row.properties[i]['unit']!='?')?' ' +row.properties[i]['unit']:'') + '; ';
                            }
                        }
                        self.model.set({
                            'number': row['number'],
                            'count':specification_count,
                            'number': row['number'],
                            'name': row['name'],
                            'unique_props': unique_props_str,
                            'tech_props':tech_props_str,
                            'note': row['note'],
                            'date_add': row['history']?moment.utc(row['history'][0]['date'], 'YYYY-MM-DD HH:mm').local().format('DD.MM.YYYY HH:mm'):'',
                            'user_add': row['history']?row['history'][0]['user']:'',
                        });
                        self.render();
                        // trigger on change complect params
                        $(self.el).trigger('change_specification_data', [self]);
                    }
                }).error(function(){
                            $.jGrowl('Ошибка поиска спецификации. Повторите попытку. ', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                            self.render();
        }).always(function(){Routine.hideLoader();});
    },

    /**
     * event on changing specification volume
    **/
    onChangeSpecificationVolume: function(e)
    {
        e.preventDefault();
        var self = this;
        var specification_number = Routine.removeAllSpaces(this.$el.find('.tb-specification-number').val());
        var specification_count = this.$el.find('.tb-specification-volume').val();
        self.model.set({'count':specification_count});
        $(self.el).trigger('change_specification_data', [self]);
    },

    /**
     * Обработка кнопки удаления элемента
    **/
    onRemoveItem: function(e)
    {
        e.preventDefault();
        //this.model.destroy();
        $(this.el).trigger('remove_item', [this]);
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
        //   this.$el.html(this.templates.item_plus(this.model.toJSON()));
        // else
        this.$el.html(this.templates.item_minus(this.model.toJSON()));
        this.$('.tb-specification-volume').numeric({ negative: false, decimal: ',' });
        this.disable(this.parent_view.disabled);

        return this;
    },
    /**
     * Активировать/Деактивировать
    **/
    disable: function(val)
    {
        this.$el.find("input,button").prop('disabled', val);
    }
});
