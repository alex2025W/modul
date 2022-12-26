
///
/// Контрол управления списокм свойств модели в блоке фильтрации
///
App.Views.FilterBoxView = Backbone.View.extend({
    el: $("#pnlFilterBox"),
    data_models: null, // список моделей
    parent_models: null, // список родительских моделей
    control_panel_view: null, // control_panel
    filterModelPropertiesView: null, // свойства основной модели
    filterParentModelPropertiesView: null, // свойство родительской модели
    selectedModels: null, // выбранные модели
    selectedParentModels: null, // выбранные родительские модели
    events:{
        'click #btn_find_specification': 'onFindSpecification',
        'change .ddl-product-type': 'onChangeShowProductType',
    },
    /**
    * Инициализация
    **/
    initialize: function()
    {
        var self = this;
        this.control_panel_view = this.options.parent_view;
        this.data_models = this.options.data_models;
        // предствление для блока фильтрации свойств модели
        this.filterModelPropertiesView = new App.Views.FilterModelPropertiesView({'parent_view': this, 'el': $('#pnl_filter_model_properties')});
        // предствление для блока фильтрации свойств родительской модели модели
        this.filterParentModelPropertiesView = new App.Views.FilterModelPropertiesView({'parent_view': this, 'el': $('#pnl_filter_parent_model_properties')});
        // подключение мультиселекта на фильтр по моделям
        this.$('.ddl-models').multiselect({
            buttonContainer: '<span class="dropdown" />',
            includeSelectAllOption: false,
            enableCaseInsensitiveFiltering: true,
            numberDisplayed: 4,
            filterPlaceholder: 'Найти',
            nonSelectedText: "Модель",
            nSelectedText: "Моделей выбрано: ",
            selectAllText: "Все",
            maxHeight: 400,
             buttonText: function(options) {
                    if (options.length === 0)
                        return 'Модель <b class="caret"></b>';
                    else if (options.length > this.numberDisplayed)
                            return this.nSelectedText+options.length + ' ' +  ' <b class="caret"></b>';
                    else {
                        var selected = 'Модель: ';
                        options.each(function() {
                            selected += '['+$(this).val() + '], ';
                        });
                        return selected.substr(0, selected.length -2) + ' <b class="caret"></b>';
                    }
                },
                onChange: function(element, checked) {
                        // очистка контролов родительской модели
                        self.selectedParentModels = [];
                        self.filterParentModelPropertiesView.clear();
                        self.$('.pnl-filter-parent-models').hide();

                        // сбор данных по модели
                        self.selectedModels = [];
                        if(checked === true)
                        {
                            if(element.val()=='multiselect-all')
                            {
                                self.selectedModels = [];
                                // take only visible elems
                                 $(self.el).find('.ddl-models' ).next().find('input:visible').each(function(){
                                    if($(this).val() !="" && $(this).val() !="не задана" && $(this).val()!='multiselect-all' && !$(this).prop('disabled'));
                                        self.selectedModels.push($(this).val());
                                 });
                            }
                            else
                                self.selectedModels.push(element.val()!='не задана'?element.val():'');
                        }
                        else
                        {
                            if(element.val()=='multiselect-all')
                                self.selectedModels = [];
                            else if(self.selectedModels.indexOf(element.val())>-1)
                                self.selectedModels.splice(self.selectedModels.indexOf(element.val()),1);
                        }
                        // загрузка списка свойств, доступных для выбранной модели
                        self.filterModelPropertiesView.render((self.selectedModels.length>0)?self.selectedModels[0]:null, [], function(data){
                                self.parent_models = data;
                                self.$('.pnl-filter-parent-models').show();
                                self.fillFilterParentModels(data, null);
                        });
                }
        });

        // подключение мультиселекта на фильтр по родительским моделям
        // подключение мультиселекта на фильтр по моделям
        this.$('.ddl-parent-models').multiselect({
            buttonContainer: '<span class="dropdown" />',
            includeSelectAllOption: false,
            enableCaseInsensitiveFiltering: true,
            numberDisplayed: 4,
            filterPlaceholder: 'Найти',
            nonSelectedText: "Родительская модель",
            nSelectedText: "Моделей выбрано: ",
            selectAllText: "Все",
            maxHeight: 400,
             buttonText: function(options) {
                    if (options.length === 0)
                        return 'Родительская модель <b class="caret"></b>';
                    else if (options.length > this.numberDisplayed)
                            return this.nSelectedText+options.length + ' ' +  ' <b class="caret"></b>';
                    else {
                        var selected = 'Родительская модель: ';
                        options.each(function() {
                            selected += '['+$(this).val() + '], ';
                        });
                        return selected.substr(0, selected.length -2) + ' <b class="caret"></b>';
                    }
                },
                onChange: function(element, checked) {
                        self.selectedParentModels = [];
                        if(checked === true)
                        {
                            if(element.val()=='multiselect-all')
                            {
                                self.selectedParentModels = [];
                                // take only visible elems
                                 $(self.el).find('.ddl-models' ).next().find('input:visible').each(function(){
                                    if($(this).val() !="" && $(this).val() !="не задана" && $(this).val()!='multiselect-all' && !$(this).prop('disabled'));
                                        self.selectedParentModels.push($(this).val());
                                 });
                            }
                            else
                                self.selectedParentModels.push(element.val()!='не задана'?element.val():'');
                        }
                        else
                        {
                            if(element.val()=='multiselect-all')
                                self.selectedParentModels = [];
                            else if(self.selectedParentModels.indexOf(element.val())>-1)
                                self.selectedParentModels.splice(self.selectedParentModels.indexOf(element.val()),1);
                        }
                        // загрузка списка свойств, доступных для выбранной модели
                        self.filterParentModelPropertiesView.render((self.selectedParentModels.length>0)?self.selectedParentModels[0]:null, []);
                }
        });
    },

    /**
     * Заполнение выпадающего списка фильтра моделей
    **/
    fillFilterModels: function(items, selected_items, show_product_types)
    {
            var ddl = this.$(".ddl-models").empty();
            $(ddl).append('<option value="не задана">не задана</option>');
            for(var i in items)
            {
                if(!show_product_types || (show_product_types== 'own' && !items[i]['is_buy']) || (show_product_types== 'buy' && items[i]['is_buy']))
                {
                    items[i].checked = false;
                    if(selected_items && selected_items.indexOf(items[i].number)>-1)
                        items[i].checked = true;
                    $(ddl).append('<option  '+((items[i].checked)?"selected":"")+'  value="'+items[i]["number"]+'">['+items[i]["number"]+ "] "+ items[i]["name"]+'</option>');
                }
            }
            $(ddl).multiselect('rebuild');
   },

   /**
     * Заполнение выпадающего списка фильтра родительских моделей моделей
    **/
    fillFilterParentModels: function(items, selected_items)
    {
            var ddl = this.$(".ddl-parent-models").empty();
            $(ddl).append('<option value="не задана">не задана</option>');
            for(var i in items)
            {
                items[i].checked = false;
                if(selected_items && selected_items.indexOf(items[i].number)>-1)
                    items[i].checked = true;
                $(ddl).append('<option  '+((items[i].checked)?"selected":"")+'  value="'+items[i]["number"]+'">['+items[i]["number"]+ "] "+ items[i]["name"]+'</option>');
            }
            $(ddl).multiselect('rebuild');
   },

   /**
     * Заполнение свойств фильтра модели
    **/
   fillFilterProperties: function(filterModelPropertiesView, model, selected_items, callback)
    {
        filterModelPropertiesView.render(model, selected_items, function(data){
            if(callback)
                callback(data);
        });
    },

    /**
     * Событие клика на кнопку поиска спецификаций по заданным фильтрам
    **/
    onFindSpecification: function(e){
        Backbone.trigger('global:on_url_params_change',[this, 'show_product_types', this.$el.find('.ddl-product-type').val()]);
        Backbone.trigger('global:on_url_params_change',[this, 'model', this.selectedModels.join('&')]);
        Backbone.trigger('global:on_url_params_change',[this, 'model_properties', this.filterModelPropertiesView.get_url()]);
        Backbone.trigger('global:on_url_params_change',[this, 'parent_model', this.selectedParentModels.join('&')]);
        Backbone.trigger('global:on_url_params_change',[this, 'parent_model_properties', this.filterParentModelPropertiesView.get_url()]);
        Backbone.trigger('global:on_url_params_change',[this, 'list', '1']);
        this.control_panel_view.loadList('1', this.selectedModels.join('&'), this.filterModelPropertiesView.get_url(), this.selectedParentModels.join('&'), this.filterParentModelPropertiesView.get_url(), this.$el.find('.ddl-product-type').val(),  false, true);
    },

    /**
    * Перестройка фильтров
    * selected_models - код выбранной модели
    * selected_model_properties - список выбранных свойств, в формате - "property_id:value&property_id:value"
    **/
    rebuildFilters: function(selected_model, selected_model_properties, selected_parent_model, selected_parent_model_properties, show_product_types, need_rebuild_filters){
        function parse_selected_properties(data)
        {
            res = [];
            if(data)
            {
                var tmp_props =data.split("&");
                for(var i in tmp_props)
                {
                    var tmp_prop = tmp_props[i].split(":");
                    var tmp_values = tmp_prop[1].split(';');
                    var tmp_res = {'_id': tmp_prop[0], 'values':[]};
                    if(tmp_values.length>0)
                    {
                        for(var j in tmp_values)
                        {
                            var tmp_value = tmp_values[j].split('__');
                            tmp_res.values.push({'_id': tmp_value[0], 'value':tmp_value[1] });
                        }
                    }
                    res.push(tmp_res);
                }
            }
            return res;
        }

        var self = this;
        // выранные фильтры
        var sel_filters = {'model':[], 'parent_model':[], 'show_product_types':''};
        // заполнение парамтров фильтрации по основной модели
        this.selectedModels = [selected_model];
        this.fillFilterModels(this.data_models, this.selectedModels, show_product_types);
        sel_filters['model'] = parse_selected_properties(selected_model_properties);
        // заполнение парамтров фильтрации по родительской модели
        this.selectedParentModels = [selected_parent_model];
        sel_filters['parent_model'] = parse_selected_properties(selected_parent_model_properties);
        // выставление типа отображаемых изделий - покупные/собственные
        this.$el.find('.ddl-product-type').val(show_product_types);
        // заполнить список родительских моделей
        this.fillFilterParentModels(this.parent_models, this.selectedParentModels);

        if(need_rebuild_filters)
        {
            this.fillFilterProperties(
                this.filterModelPropertiesView,
                (this.selectedModels.length>0)?this.selectedModels[0]:null,
                sel_filters['model'],
                function callback(parent_models){
                    self.parent_models = parent_models;
                    self.$('.pnl-filter-parent-models').show();
                    // заполнить список родительских моделей
                    self.fillFilterParentModels(parent_models, [selected_parent_model]);
                    // заполнить список свойств выбранной родительской модели
                    self.fillFilterProperties(
                        self.filterParentModelPropertiesView,
                        (self.selectedParentModels.length>0)?self.selectedParentModels[0]:null,
                        sel_filters['parent_model']
                    );
                }
            );
        }
        return sel_filters;
    },

    /**
     * Отрисовка
    **/
    render:function(model_number, selected_items)
    {
    },

    /**
     * Событие отображения видов изделий (собственные/покупные)
    **/
    onChangeShowProductType: function(e){
        this.selectedModels = [];
        this.selectedParentModels = [];
        this.parent_models = [];
        this.filterParentModelPropertiesView.clear();
        this.rebuildFilters(this.selectedModels.join('&'), this.filterModelPropertiesView.get_url(), this.selectedParentModels.join('&'), this.filterParentModelPropertiesView.get_url(), this.$el.find('.ddl-product-type').val(), true);
    }
});
