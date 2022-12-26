///------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
/// Контрол отображения формы построения спецификации
///------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
App.Views.DataViewSpecificationViewer = Backbone.View.extend({
    el: $("#esud_specification_view"),
    data: null,
    linear_data: null,
    openedItems:{}, // список идентификаторов объектов, которые необходимо раскрыть/скрыть
    collapsed: false,
    current_item: null,
    show_only_options: true,   // флаг отображения только опциональных свойств
    templates: {
        template: _.template($("#directoryTreeTemplate").html()),
        specification_template:_.template($("#itemSpecificationTreeTemplate").html()),
        specification_prop_template:_.template($("#itemTreeSpecificationPropViewTemplate").html()),
        template: _.template($("#directoryTreeTemplate").html()),
        nodata_template: _.template($("#itemNoData").html()),
        process_template:_.template($("#itemProcessTreeTemplate").html()),
    },

    /**
    * События
    **/
    events:{
        'click .cb-item': 'onClickPlus',
        'click tr': 'onTrClick',
        'node:expand':'onNodeExpand',
        'node:collapse':'onNodeCollapse',
    },

    /**
    * Инициализация
    **/
    initialize: function()
    {
        this.openedItems = {};
        this.linear_data = {};
        this.collapsed= false;
        this.current_item = null;
        this.show_only_options = false;
        // глобальное событие на очистку данных
        Backbone.on("global:clear",this.onGlobalClear,this);
        // глобальное событие на раскрытие/закрытие всего дерева
        Backbone.on("global:collapse",this.onGlobalCollapse,this);
        // глобальное событие отображения только опций
        Backbone.on("global:show_only_options",this.onGlobalShowOnlyOptions,this);
        // глобальное событие смены таба
        Backbone.on("global:on_show_tab",this.onRefresh,this);
    },


    /**
     * Обработка глобального события обновления контролов
    **/
    onRefresh: function(e)
    {
            var self = this;
            // установление начальных координат на шапку
            self.$el.find(".directory-tree-header-wrapper").css('left', 0);
            var tableHeader = this.$el.find('.directory-tree-header');
            $(tableHeader).width(this.$el.find('table.treetable').width());
            this.$el.find('table.treetable').find('tr:first').find('td').each(function(index){
                $(tableHeader).find('th').eq(index).width($(this).width());
            });
    },

    /**
     * Обработка глобального события отображения толкьо опциональных свойств
    **/
    onGlobalShowOnlyOptions: function(e)
    {
        this.show_only_options = e[1];
        this.render();
        //$('body').removeClass('wait');
    },

    /**
     * Обработка глобавльного события очистки данных
    **/
    onGlobalCollapse: function(e)
    {
        this.collapse(e[1]);
        $('body').css('cursor', 'default');
        $(e[2]).css('cursor', 'pointer');
    },

    /**
     * Обработка глобавльного события очистки данных
    **/
    onGlobalClear: function()
    {
        this.data = null;
        this.openedItems = {};
        this.current_item = null;
        this.render();
    },

    /**
      * Проставление темповых идентификаторов
    **/
    prepare_data:function(data, parent)
    {

        // функция обработки  процесса
        function process_tech_process(process, data)
        {
            process['tmp_id'] = Guid.newGuid();
            process.parent = data;
            for(var propi in process['properties'])
                process['properties'][propi]['tmp_id'] = Guid.newGuid();

             if(process['execution_time'])
                process['execution_time']['tmp_id'] = Guid.newGuid();
            if(process['execution_count'])
                process['execution_count']['tmp_id'] = Guid.newGuid();
            if(process['next_level_time'])
                process['next_level_time']['tmp_id'] = Guid.newGuid();
            if(process['in_level_time'])
                process['in_level_time']['tmp_id'] = Guid.newGuid();

            for(var ci in process['items'])
                process_tech_process(process['items'][ci], process);
        }

        if(data)
        {
            data.parent = parent;
            data['tmp_id'] = Guid.newGuid();
            for(var i in  data['properties'])
                data['properties'][i]['tmp_id'] = Guid.newGuid();

            // Обработка процессов----------------------
            if(data['tech_process_operations'])
            {
                data['tech_process_operations'] = JSON.parse(data['tech_process_operations']);
                for(var pci in data['tech_process_operations'])
                    process_tech_process(data['tech_process_operations'][pci], data);
            }

            if(data['tolerance_on_vol'])
                data['tolerance_on_vol']['tmp_id'] = Guid.newGuid();
            if(data['vol_per_unit'])
                data['vol_per_unit']['tmp_id'] = Guid.newGuid();
            if(data['vol_tolerance'])
                data['vol_tolerance']['tmp_id'] = Guid.newGuid();
             if(data['sector'])
                data['sector']['tmp_id'] = Guid.newGuid();
            for(var i in data['items'])
                this.prepare_data(data['items'][i], data);
        }
    },

    /**
      * Подготовка исходных данных
    **/
    prepare_and_build:function(collection, show_only_options)
    {
        this.show_only_options = show_only_options;
        this.data = collection;
        this.prepare_data(collection, null);
        this.render();
    },

    /**
      * Отрисовка
    **/
    render:function()
    {
        var self = this;
        this.$el.find('.tree-data').empty();
        if(this.data)
        {
            // навешивание контрола таблицы
            this.$el.find('.tree-data').append(this.templates.template({}));
            var data_container = this.$el.find('.tree-data').find("tbody");
            this.renderItem(this.data, data_container, {index:1});
            this.$el.find("table.treetable").treetable({
                expandable: true,
                onNodeExpand: function(e){ self.$el.trigger("node:expand",[this]); },
                onNodeCollapse: function(e){ self.$el.trigger("node:collapse",[this]); }
            });

            if(this.collapsed)
                this.$el.find("table.treetable").treetable('expandAll');
            else
            {
                // расскрыть все сохраненые ранее ветки дерева
                for(var i in this.openedItems)
                {
                    if(this.openedItems[i])
                    {
                        try
                        {
                            var treeElem = self.$el.find("table.treetable").find("tr[data-object-tmp-id='"+i+"']");
                            if(treeElem)
                                this.$el.find("table.treetable").treetable('expandNode',treeElem.data("tt-id"));
                        } catch (err) {}
                    }
                }
            }
            // если есть строка, которую необходимо выделить, то выделяем
            if(this.current_item)
                self.$el.find("table.treetable").find("tr[data-object-tmp-id='"+this.current_item+"']").addClass('selected').find('input').focus();

            // установление начальных координат на шапку
            self.$el.find(".directory-tree-header-wrapper").css('left', 0);
            var tableHeader = this.$el.find('.directory-tree-header');
            $(tableHeader).width(this.$el.find('table.treetable').width());
            this.$el.find('table.treetable').find('tr:first').find('td').each(function(index){
                $(tableHeader).find('th').eq(index).width($(this).width());
            });

            // событие на скролл контейнера с данными, для изменения позиции шапки
            this.$el.find(".tree-data").scroll(function(){
                var posLeft = self.$el.find(".tree-data").find("table.treetable").position().left;
                self.$el.find(".directory-tree-header-wrapper").css('left', posLeft);
            });
            $(window).resize(function() {
                var tableHeader = self.$el.find('.directory-tree-header');
                $(tableHeader).width(self.$el.find('table.treetable').width());
                self.$el.find('table.treetable').find('tr:first').find('td').each(function(index){
                    $(tableHeader).find('th').eq(index).width($(this).width());
                });
            });
        }
        else
        {
            this.$el.find('.tree-data').append(this.templates.template({}));
            this.$el.find('.tree-data').find("tbody").append(this.templates.nodata_template({}));
        }
    },

    /**
      * Отрисовка тех процесса
      * counter = {val:1}
    **/
    renderProcess: function(process, container, counter)
    {
        var self = this;
        process['tmp_index'] = counter['index']++;
        container.append(this.templates.process_template({
                index:process['tmp_index'],
                parent_index: process.parent['tmp_index'],
                name: process['name'],
                tmp_id: process['tmp_id'],
                type:'process'
        }));

        // отрисвока хардкодных свойств
        var sys_props_keys = ["execution_time", "execution_count", "next_level_time", "in_level_time"];
        for(var i in sys_props_keys)
        {
            var key = sys_props_keys[i];
            if(process[key])
            {
                var prop = process[key];
                prop['tmp_index'] = counter['index']++;
                 container.append(this.templates.specification_prop_template({
                            index:prop['tmp_index'],
                            parent_index: process['tmp_index'],
                            name: prop['name'] || 'Время выполнения',
                            tmp_id: prop['tmp_id'],
                            is_optional: false,
                            value: prop['value'],
                            unit: prop['unit'],
                            sub_unit: prop['sub_unit'],
                    }));

            }
        }

       // отрисовка свойств
        for(var propi in process['properties'])
        {
            var prop = process['properties'][propi];
            prop['tmp_index'] = counter['index']++;
             container.append(this.templates.specification_prop_template({
                        index:prop['tmp_index'],
                        parent_index: process['tmp_index'],
                        name: prop['name'],
                        tmp_id: prop['tmp_id'],
                        is_optional: false,
                        value: prop['value'],
                        unit: prop['unit'],
                        sub_unit: prop['sub_unit'],
                }));
        }
        // отрисовка вложеных процессов
        for(var ci in process['items'])
            self.renderProcess(process['items'][ci], container, counter);
    },

    /**
      * Отрисовка элемента изделия. Рекурсия.
      * counter = {val:1}
    **/
    renderItem: function(data, container, counter)
    {
        var self = this;
        data['tmp_index'] = counter['index']++;
        container.append(this.templates.specification_template({
                number:data['number'],
                index:data["tmp_index"],
                parent_index: ((data.parent)?data.parent['tmp_index']:null),
                name: data['name'],
                tmp_id: data['tmp_id'],
                node: data,
                is_buy: data['is_buy'],
                value: data['count']['value'],
                unit: data['count']['unit'],
        }));


        //  сортировка свойств по полю - routine
        data['properties'] = data['properties'].sort(function(a,b){
                if (a['routine'] < b['routine'])
                        return -1;
                else if (a['routine'] > b['routine'])
                        return 1;
                return 0;
        });

        // заполнение свойств
        for(var i in data['properties'])
        {
            var prop = data['properties'][i];

            if(!this.show_only_options || (this.show_only_options && prop['is_optional']))
            {
                // добавление на форму элемента
                prop['tmp_index'] = counter['index']++;
                container.append(this.templates.specification_prop_template({
                        index:prop['tmp_index'],
                        parent_index: data['tmp_index'],
                        name: prop['name'],
                        tmp_id: prop['tmp_id'],
                        is_optional: prop['is_optional'], // опциональное
                        value: prop['value'],
                        unit: prop['unit'],
                        sub_unit: prop['sub_unit'],
                }));
            }
        }

        // заполнение зарезервированных свойств
        // Объем на 1 шт
        var prop = data['vol_per_unit'];
        if(prop && prop['value']!=null && (!this.show_only_options || (this.show_only_options && prop['is_optional'])) )
        {
            prop['tmp_index'] = counter['index']++;
            container.append(this.templates.specification_prop_template({
                    index:prop['tmp_index'],
                    parent_index: data['tmp_index'],
                    name: 'Объём на 1 шт.',
                    tmp_id: prop['tmp_id'],
                    is_optional: false, // опциональное
                    value: prop['value'],
                    unit: prop['unit'],
                    sub_unit: prop['sub_unit'],
            }));
        }

        // Допуск на потери и отходы
        var prop = data['tolerance_on_vol'];
        if(prop && prop['value']!=null && (!this.show_only_options || (this.show_only_options && prop['is_optional'])) )
        {
            prop['tmp_index'] = counter['index']++;
            container.append(this.templates.specification_prop_template({
                    index:prop['tmp_index'],
                    parent_index: data['tmp_index'],
                    name: 'Допуск на потери и отходы',
                    tmp_id: prop['tmp_id'],
                    is_optional: false, // опциональное
                    value: prop['value'],
                    unit: prop['unit'],
                    sub_unit: prop['sub_unit'],
            }));
        }

        // Потери и отходы, невозвратные
        var prop = data['vol_tolerance'];
        if(prop && prop['value']!=null && (!this.show_only_options || (this.show_only_options && prop['is_optional'])) )
        {
            prop['tmp_index'] = counter['index']++;
            container.append(this.templates.specification_prop_template({
                    index:prop['tmp_index'],
                    parent_index: data['tmp_index'],
                    name: 'Потери и отходы, невозвратные',
                    tmp_id: prop['tmp_id'],
                    is_optional: false, // опциональное
                    value: prop['value'],
                    unit: prop['unit'],
                    sub_unit: prop['sub_unit'],
            }));
        }

        // Участок
        var prop = data['sector'];
        if(prop && (!this.show_only_options || (this.show_only_options && prop['is_optional'])) )
        {
            prop['tmp_index'] = counter['index']++;
            container.append(this.templates.specification_prop_template({
                    index:prop['tmp_index'],
                    parent_index: data['tmp_index'],
                    name: 'Участок',
                    tmp_id: prop['tmp_id'],
                    is_optional: false, // опциональное
                    value: prop['name'],
                    unit: prop['unit'],
                    sub_unit: prop['sub_unit'],
            }));
        }

        // отрисовка тех процессов
        if(!this.show_only_options && data['tech_process_operations'])
            for(var proci in data['tech_process_operations'])
                self.renderProcess(data['tech_process_operations'][proci], container, counter);

        // цикл по дочерним спецификациям
        for(var i in data['items'])
            this.renderItem(data['items'][i], container, counter );
    },


     /**
     * Клик по строке с данными
    **/
    onTrClick: function(e)
    {
        this.$el.find('table.treetable').find('tr.selected').removeClass('selected');
        $(e.currentTarget).addClass('selected');
        this.current_item = $(e.currentTarget).data('object-tmp-id');
    },

     /**
     * Раскрытие  элемента дерева
    **/
    onNodeExpand:function(e,a){
        var self = this;
        var newHistObject = {
            'item_index': $(a.row).data('tt-id'),
            'parent_item_index': $(a.row).data('tt-parent-id')
        };
        this.openedItems[$(a.row).data('object-tmp-id')]  = true;
        setTimeout(function(){
            var tableHeader = self.$el.find('.directory-tree-header');
            $(tableHeader).width(self.$el.find('table.treetable').width());
            self.$el.find('table.treetable').find('tr:first').find('td').each(function(index){
                $(tableHeader).find('th').eq(index).width($(this).width());
            });
        }, 10);
    },

     /**
     * Сокрытие элемента дерева
    **/
    onNodeCollapse:function(e,a){
        // удаление элемента из внутренней истории
        var curHistObject = {
            'item_index': $(a.row).data('tt-id'),
            'parent_item_index': $(a.row).data('tt-parent-id')
        };
        this.openedItems[$(a.row).data('object-tmp-id')]  = false;
        var tableHeader = this.$el.find('.directory-tree-header');
        $(tableHeader).width(this.$el.find('table.treetable').width());
        this.$el.find('table.treetable').find('tr:first').find('td').each(function(index){
            $(tableHeader).find('th').eq(index).width($(this).width());
        });
    },

    /**
     * Раскрыть/свернуть дерево
    **/
    collapse: function(val)
    {
        this.collapsed = val;
        try{
            if(val)
                    this.$el.find("table.treetable").treetable('expandAll');
            else
            {
                this.$el.find("table.treetable").treetable('collapseAll');
                this.$el.find("table.treetable").treetable('expandNode',this.$el.find("table.treetable").find('tr:first').data('tt-id'));
            }
        }
        catch (err) {}
    }
});
