///
/// Представление списка фильтров по комплектам
///
App.Views.ComplectFilterListView = Backbone.View.extend({
    tagName:'div',
    uncomplect: 'none', // yes/no/none
    events:{
        'click .btn-add-complect': 'onAddFilterItem',
        'click .btn-cancel-filter': 'onCancelFilter',
        'add_item': 'onAddFilterItem',
        'remove_item': 'onRemoveFilterItem',
        'click .cb-uncomplect': 'onUncomplect',
        'change_complect_data': 'onChangeFilterItem'
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
        // destroy model in collection
        item.model.destroy();
        // run event on change item data
        this.onChangeFilterItem(e, item);
    },

    onChangeFilterItem: function(e, item)
    {
        $(this.el).trigger('complect_filter_list_view:change_complect_data', [this]);
    },

    /**
     * Обработка события добавления нового элемента в коллекцию
    **/
    onAddFilterItem: function()
    {
        var item = new App.Models.ComplectFilterModel();
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
        var itemView = new App.Views.ComplectFilterItemView({model: item});
        this.$el.find('.pnl-complect-filter-list').append(itemView.render().el);
    },

    /**
     * Сбросить фильтр
    **/
    onCancelFilter: function()
    {
        this.collection.reset();
        this.collection.add(new App.Models.ComplectFilterModel({'is_first': true}));
        this.render();
        $(this.el).trigger('complect_filter_list_view:clear_filter', [this]);
    },

    /**
     * Обработка флага раскомплектации
    **/
    onUncomplect: function()
    {
        var self = this;
        this.uncomplect = ((this.$el.find('.cb-uncomplect').prop('checked'))?'yes':'no');
        //this.$el.find('.cb-uncomplect').prop('checked', !this.$el.find('.cb-uncomplect').prop('checked'));

        if(this.$el.find('.cb-uncomplect').prop('checked'))
        {
            bootbox.confirm("Внимание, контроль состава комплекта будет отключен. Комплектация может быть нарушена. Продолжить?", function(result)
            {
                if(!result)
                    self.unComplect('no');
                else
                    self.unComplect('yes');
            });
        }
        else
        {
            bootbox.confirm("Будет включен контроль состава комплекта. Введённые данные будут изменены. Продолжить?", function(result)
            {
                if(!result)
                    self.unComplect('yes');
                else
                    self.unComplect('no');
            });
        }
    },

    /**
     * Загрузить данные на форму спецификаций
     * data = [{'number':'', 'count':0}]
    **/
    loadData: function(data, uncomplect)
    {
        this.uncomplect = uncomplect;
        this.show();
        this.collection.reset();
        this.clear();
        this.$el.find('.cb-uncomplect').prop('checked', ((uncomplect && uncomplect=='yes')?true:false));
        if(data && data.length>0)
        {
            var is_first = true;
            for(var i in data)
            {
                var row = data[i];
                var unique_props_str = "";
                var tech_props_str = "";
                if(row.properties)
                {
                    for(var i in row['info'].properties) {
                        if(row['info'].properties[i]['is_optional'] && !row['info'].properties[i]['is_techno'])
                                unique_props_str += row['info'].properties[i]['name'] + ": " + row['info'].properties[i]['value'] +  ((row['info'].properties[i]['unit'] && row['info'].properties[i]['unit']!='?')?' ' +row['info'].properties[i]['unit']:'') + '; ';
                        else if(row['info'].properties[i]['is_techno'])
                            tech_props_str += row['info'].properties[i]['name'] + ": " + row['info'].properties[i]['value'] +  ((row['info'].properties[i]['unit'] && row['info'].properties[i]['unit']!='?')?' ' +row['info'].properties[i]['unit']:'') + '; ';
                    }
                }
                var item = new App.Models.ComplectFilterModel({
                    'number': row['info']['number'],
                    'count':row['info']['count']['value'],
                    'is_first': is_first,
                    'items': row['info']['items'],
                    'name': row['info']['name'],
                    'unique_props': unique_props_str,
                    'tech_props':tech_props_str,
                    'note': row['info']['note'],
                    'date_add': row['info']['history']?moment.utc(row['info']['history'][0]['date'], 'YYYY-MM-DD HH:mm').local().format('DD.MM.YYYY HH:mm'):'',
                    'user_add': row['info']['history']?row['info']['history'][0]['user']:'',
                });
                is_first = false;
                this.collection.add(item);
                this.renderItem(item, false);
            }
        }
        else
            this.onCancelFilter();
        // disable controls, if uncomplect
        this.disable(uncomplect=='yes');
    },

    getData: function()
    {
        if (this.collection.length>0 && this.collection.models[0].get('number')!="" && this.collection.models[0].get('count')!="")
            return this.collection.toJSON();
        else
            return [];
    },

    unComplect: function(val)
    {
        if(val)
        {
            this.$el.find('.cb-uncomplect').prop('checked', ((val && val=='yes')?true:false));
            this.uncomplect = val;
            this.disable(this.uncomplect=='yes');
            $(this.el).trigger('complect_filter_list_view:uncomplect', [this, this.$el.find('.cb-uncomplect').prop('checked')]);
        }
        else
            return ((this.$el.find('.cb-uncomplect').prop('checked'))?'yes':'no');
    },

    /**
     * Формаирование URL из параметров спецификации
     **000.000.000#1;000.000.001#2;
    **/
    getUrl: function()
    {
        var result = [];
        var complects = this.collection.toJSON();
        for(var i in complects)
        {
            var row = complects[i];
            result.push(row['number'] + '#' + row['count'].toString());
        }
        //return 'complects='+ result.join(';')+ '&uncomplect='+((this.$el.find('.cb-uncomplect').prop('checked'))?'yes':'no');
        return 'complects='+ result.join(';')+ '&uncomplect='+ this.uncomplect;
    },

    /**
     * Очистка формы
    **/
    clear: function()
    {
        this.$el.find('.pnl-complect-filter-list').empty();
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
     * include_flag_uncomplect - для обработки флага раскомплектации
    **/
    disable: function(val, include_flag_uncomplect)
    {
        include_flag_uncomplect = include_flag_uncomplect || false;
        this.$el.find("input,button").prop('disabled', val);
        this.$el.find('.cb-uncomplect').prop('disabled', include_flag_uncomplect);
    },

    isUncomplect: function()
    {
        return this.uncomplect;
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
/// Представление элемента фильтра по комплектам
///
App.Views.ComplectFilterItemView = Backbone.View.extend({
    tagName:'tr',
    className:'list-item',
    templates: {
        //item_plus:_.template($("#filterItemTemplateComplectPlus").html()),
        item_minus:_.template($("#filterItemTemplateComplectMinus").html()),
    },

    /**
     * Инициализация
    **/
    initialize: function()
    {
        this.model.on('destroy', this.unRender, this);
        //this.model.on('change', this.onChange, this);
    },

    /**
     * Присоедиение событий
    **/
    events:{
        'click .btn-remove': 'onRemoveItem',
        'click .btn-add': 'onAddItem',
        'change .tb-complect-number': 'onChangeComplectNumber',
        'change .tb-complect-volume': 'onChangeComplectVolume'
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
    onChangeComplectNumber: function(e)
    {
        e.preventDefault();
        var self = this;
        var complect_number = Routine.removeAllSpaces(this.$el.find('.tb-complect-number').val());
        var complect_count = this.$el.find('.tb-complect-volume').val();

        if(!complect_number)
        {
            $.jGrowl('Не задан номер комплекта. Повторите попытку. ', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
            return;
        }

        // load complect info
        Routine.showLoader();
        $.ajax({
                type: "GET",
                url: "/handlers/esudcomplect/get_complect_info/" + complect_number,
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
                            $.jGrowl('Нет данных по комплекту. Повторите попытку. ', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
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
                                'count':complect_count,
                                'items': row['items'],
                                'is_buy': row['is_buy'],
                                'name': row['name'],
                                'unique_props': unique_props_str,
                                'tech_props':tech_props_str,
                                'note': row['note'],
                                'date_add': row['history']?moment.utc(row['history'][0]['date'], 'YYYY-MM-DD HH:mm').local().format('DD.MM.YYYY HH:mm'):'',
                                'user_add': row['history']?row['history'][0]['user']:'',
                        });
                        self.render();
                        // trigger on change complect params
                        $(self.el).trigger('change_complect_data', [self]);
                    }
                }).error(function(){
                            $.jGrowl('Ошибка поиска комплекта. Повторите попытку. ', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                            self.render();
        }).always(function(){Routine.hideLoader();});
    },

    /**
     * event on changing complect volume
    **/
    onChangeComplectVolume: function(e)
    {
        e.preventDefault();
        var self = this;
        var complect_number = Routine.removeAllSpaces(this.$el.find('.tb-complect-number').val());
        var complect_count = this.$el.find('.tb-complect-volume').val();
        self.model.set({'count':complect_count});
        // trigger on change complect params
        $(this.el).trigger('change_complect_data', [this]);
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
        //Backbone.trigger('complect_filter_list_view:add_item',[this]);
        $(this.el).trigger('add_item', [this]);
    },

     /**
     * Отрисовка элемента
    **/
    render: function () {
        // if(this.model.get('is_first'))
        //     this.$el.html(this.templates.item_plus(this.model.toJSON()));
        // else
        this.$el.html(this.templates.item_minus(this.model.toJSON()));
        this.$('.tb-complect-volume').numeric({ negative: false, decimal: ',' });
        return this;
    }
});
