
///
/// Представление формы  - Можно изготовить
///
App.Views.CanMakeView = Backbone.View.extend({
    tagName:'div',
    className:'can-make-data',
    search_panel_view: null, // представления поиска информации о необходимо спецификации
    specifications_filter_collection: null, // колллекция фильтров по спецификациям
    templates: {
        main:_.template($("#canMakeTemplate").html()),
        item_detalization: _.template($("#canMakeItemDetalizationTemplate").html())
    },
    events:{
        'specification_filter_list_view:apply_filter': 'onCanMakeApply',
        'specification_filter_list_view:clear_filter': 'onCanMakeClear',
    },
    /**
     * Инициализация
    **/
    initialize: function()
    {
        this.specifications_filter_collection = new App.Collections.SpecificationFilterCollection();
        this.specifications_filter_collection.add(new App.Models.SpecificationFilterModel({'is_first': true}) );
    },

    /**
     * Удление представления
    **/
    unRender: function()
    {
        this.remove();
    },

     /**
     * Отрисовка
    **/
    render: function () {
        this.$el.html(this.templates.main());
        // представление фильтра по спецификациям
        this.search_panel_view = new App.Views.SpecificationFilterListView({el: this.$el.find('.pnl-specification-filter'), collection:  this.specifications_filter_collection});
        this.search_panel_view.render();
        return this;
    },


    /**
    * Очистка списка, того что можно изготовить
    **/
    onCanMakeClear: function(e)
    {
        this.$el.find(".data-body").empty();
    },

    /**
        # Функция подсчета, количества итоговой продукции, которую можно
        # изготовить из имеющихся частей
        # product = [{}]  - продукт со списком детей  с количествами, которые требуется на изготовление "product"
        # exisiting_items = [{}] - список готовых частей по всему заданию
        # уже сделаный объем текущего продукта + количество высчитывается как минимальное отношения между двумя объемами одинаковых спецификаиций
    **/
    claculate_count_objects_maded_by_existing_parts: function(product, existing_items)
    {
        var result = null;

        // сначала подсчитываем по составным частям
        // если продукт собрать не получается, то ищем продукт среди готовых
        for(var i in product['items'])
        {
            var row = product['items'][i];
            for(var j in existing_items)
            {
                var tmp_part = existing_items[j];
                if(tmp_part['number'] == row['number'])
                {
                    if(tmp_part['count']['handed']>row['need_count'])
                    {
                        row['ready_count'] = row['need_count'];
                        tmp_part['count']['handed']-=row['need_count'];
                    }
                    else
                    {
                        row['ready_count'] = tmp_part['count']['handed'];
                        tmp_part['count']['handed']=0;
                    }
                    continue;
                }
            }

            var tmp_count =  Math.floor(row['ready_count']/row['count']);

            if(result==null)
                result = tmp_count;
            if(tmp_count<result)
                result = tmp_count;
        }

        product['can_make_count'] = result;
    },

    /**
     * Сбор и группировка уникальных детей спецификации со всей структуры
     * с подсчетом объемов, уичтывая изначально - заданный объем
    **/
     calculate_specification_childs: function(specifications)
    {
        var result = [];
        function process_items(node, count,  result)
        {
            if(node['items'] && node['items'].length>0)
            {
                for(var i in node['items'])
                {
                    var row = node['items'][i];

                    if(!row['is_buy'])
                    {
                        if(row['number'] in result)
                            result[row['number']]['count'] += Routine.strToFloat(row['count']['value']) * count;
                        else
                        {
                            result[row['number']] = {
                                'number': row['number'],
                                'count':  Routine.strToFloat(row['count']['value']) * count,
                                'name': row['name'],
                                'ready_count': 0,
                                'need_count': 0
                            };
                        }
                    }
                     process_items(row, Routine.strToFloat(row['count']['value']) * count, result);
                }
            }
        }
        // цикл по всем исходным спецификациям
        for(var i in specifications)
        {
            var specification = specifications[i];
            var dataObject = {};
            //process_items(JSON.parse(specifications[i]['info']['struct']) , Routine.strToFloat(specifications[i]['count']), dataObject);
            process_items(JSON.parse(specifications[i]['info']['struct']) , 1, dataObject);
            // делаем пересчет для требуемого количества
            for(var j in dataObject)
                dataObject[j]['need_count'] = dataObject[j]['count'] * Routine.strToFloat(specifications[i]['count']);

            result.push({
                'number': specification['info']['number'],
                'name': specification['info']['name'],
                'need_count': specification['count'],
                'can_make_count': 0,
                'items':  _.values(dataObject)
            });
        }
        return result;
    },

    /**
     * Применение выбранных спецификаицй на изготовление
     * filter_specifications_list - список спецификаций с их структурой и количеством
    **/
    onCanMakeApply: function(e, filter_specifications_list)
    {
        var self = this;
        // данные по сменному заданию
        var ready_items  = Routine.copyObject(App.items_collection.toJSON());
        // очистка формы данных
        var data_body = this.$el.find(".data-body").empty();
        // обработка отобранных спецификаций
        // приведение к нужному формату
        var res_data = this.calculate_specification_childs(filter_specifications_list);

        for(var i in res_data)
        {
            this.claculate_count_objects_maded_by_existing_parts(res_data[i], ready_items);
            $(data_body).append(this.templates.item_detalization(res_data[i]));
        }
    },
});
