
///
/// Представление формы основных данных
///
App.Views.DataView = Backbone.View.extend({
    el: $("#shift_task_body"),
    sectors_view: null,     // представление списка секторов
    techno_map_view: null, // представление технологической карты заказа
    can_make_view: null, // представление - Можно изготовить
    specifications_filter_view: null, // групповой расчет по укрупненному изделию
    specifications_owner_view: null, // групповая форма - "можно изготовить"
    templates_view: null, // представление списка шаблонов раскроя, задействованных  на участке
    templates: {
        calc_by_owner_specifications:_.template($("#pnlCalcByOwnerSpecifications").html()),
    },
    events:{
        "click .lnk-collapse": "on_collapse",
        "click .lnk-full-screen": "on_full_screen",
        //--EVENTS BY TRIGGER----------------------------------------
        'specification_filter_list_view:apply_filter': 'onFilterBySpecification',
        'specification_filter_list_view:clear_filter': 'onCancelFilterBySpecification',
        'specification_owner_item_view:add_item_to_calculate' : 'onAddItemToCalculate',
        // Cut Templates Triggers
        'templates:clear': 'onClearTemplates',
        'templates:apply': 'onApplyTemplates',
        'templates:refresh': 'onRefreshTemplates'
    },
    initialize: function(){
        Backbone.on("templates:refresh",this.onRefreshTemplates,this);
    },
    /**
     * отрисовка технологической карты
     */
    render_techno_map: function(techno_map_data)
    {
        this.$el.find('#techno_map_data_container').empty();
        // добавление технологической карты
        if(techno_map_data)
        {
            this.techno_map_view =  new App.Views.TechnoMapView();
            this.$el.find('#techno_map_data_container').append(this.techno_map_view.render(techno_map_data).el);
            var self = this;
            this.$el.find('#techno_map_data_container').scroll(function(){
                self.techno_map_view.onScroll(self.$el.find('#techno_map_data_container').scrollLeft(),self.$el.find('#techno_map_data_container').scrollTop());
            });
        }
    },
    /**
    * Отрисовка списка данных
    * sectors_collection - список участков
    * items_collecton - список всех спецификаций
    * group_by_sectors - флаг необходимости группировки по участку
    */
    render: function(sectors_collection, items_collecton, templates_collection, full_order_params, group_by_sectors)
    {
        this.group_by_sectors = group_by_sectors;
        // Очистка формы
        this.clear();
        this.hide();
        if(sectors_collection)
        {
            if(group_by_sectors)
            {
                //----------------------
                // добавление глобальной панели по укрупненному расчету
                var filter_box = this.$el.find('#shift_task_filter_container');
                filter_box.append(this.templates.calc_by_owner_specifications());
                // подключение формы расчета по укрупненному изделию
                this.specifications_filter_collection = new App.Collections.SpecificationFilterCollection();
                this.specifications_filter_collection.add(new App.Models.SpecificationFilterModel({'is_first': true}) );
                this.specifications_filter_view = new App.Views.SpecificationFilterListView({el: filter_box.find('.pnl-specification-filter'), collection:  this.specifications_filter_collection});
                this.specifications_filter_view.render();
                // Представление завершенности конечного изделия
                // представление фильтра по спецификациям
                this.specifications_owner_collection = new App.Collections.SpecificationOwnerCollection(full_order_params.get("own_products"));
                this.specifications_owner_view = new App.Views.SpecificationOwnerListView({el: filter_box.find('.pnl-owner-specification-body-container'), collection:  this.specifications_owner_collection});
                this.specifications_owner_view.render();

                // Подключние сонтрола шаблонов раскроя, задействованных во всем расчете
                this.templates_view = new App.Views.UsedTemplatesListView({el: this.$el.find('.pnl-used-templates-body-container'), collection: templates_collection, show_sector_level: true});
                this.templates_view.render();
                //-----------------------
                // добавление данных сгруппированные по участкам
                this.sectors_view =  new App.Views.SectorsListView({collection : sectors_collection});
                this.$el.find('#shift_task_data_container').append(this.sectors_view.render(items_collecton, templates_collection).el);
            }
            else
            {
                // добавление данных по всем участкам одним списком
                this.sectors_view =  new App.Views.FullTaskView();
                this.$el.find('#shift_task_data_container').append(this.sectors_view.render(items_collecton, full_order_params, templates_collection).el);
            }
            // добавление представления формы - "Можно изготовить"
            this.can_make_view =  new App.Views.CanMakeView();
            this.$el.find('#can_make_data_container').html(this.can_make_view.render().el);
            this.show();
        }
        $('body').removeClass('wait');
    },
    /**
     * Очистка формы
     */
    clear: function()
    {
        this.$el.find('#shift_task_data_container').empty();
        this.$el.find('#shift_task_filter_container').empty();
        //this.$el.find('#techno_map_data_container').empty();
        this.sectors_view = null;
        this.hide();
    },
    /**
     * Показать форму
     */
    show: function()
    {
        this.$el.show();
    },
    /**
     * Скрыть форму
     */
    hide: function()
    {
        this.$el.hide();
    },
    /**
     * развернуть/свернуть форму данных
     */
    on_collapse: function(e)
    {
          var el = $(e.currentTarget);
          if(el.data('val') == "min")
          {
            el.data('val','max');
            el.html("свернуть");

            $(".main-control-panel").hide();
            $("#main-header").hide();
            $("#techno_map_data_container").addClass("minimaize-height");
          }
          else
          {
            el.data('val','min');
            el.html("развернуть");
            $(".main-control-panel").show();
            $("#main-header").show();
            $("#techno_map_data_container").removeClass("minimaize-height");
          }
    },
    /**
     * открыть в режиме full screen
     */
    on_full_screen: function(e)
    {
          var el = $(e.currentTarget);
          if(el.data('val') == "min")
          {
            el.data('val','max');
            el.html("выход из полноэкранного режима ");
          }
          else
          {
            el.data('val','min');
            el.html("на весь экран");
          }
          Routine.toggleFullScreen();
    },
    /**
     * Фильтрация по спецификации
     * item_info - информация о спецификации
     */
    onAddItemToCalculate: function(e, item_info)
    {
        this.specifications_filter_view.onAddFilterItem(null,item_info);
    },
    /**
     * Расчет по укрупненному изделию
     */
    onFilterBySpecification: function(e, filter_specifications_list)
    {
        this.sectors_view.filterBySpecifications(filter_specifications_list);
        //this.templates_view.render();
        this.templates_view.hideEmpty(true);
    },
    /**
     *  Очистка фильтров укрупненного расчета
     */
    onCancelFilterBySpecification: function(){
        var self = this;
        $("body").addClass('wait');
        setTimeout(function(){self.sectors_view.clearSpecificationFilter(); $("body").removeClass('wait');}, 100);
    },
    /**
     * Собфтие на применение шаблонов раскроя
     */
    onApplyTemplates: function(e, templates)
    {
        var self = this;
        $("body").addClass('wait');
        setTimeout(function(){
            self.sectors_view.applyTemplates(templates);
            $("body").removeClass('wait');
        }, 100);
    },
    /**
     * Событие на обновление представление шаблонов раскроя
     */
    onRefreshTemplates: function(e)
    {
        if(this.group_by_sectors)
            this.templates_view.render();
    },
    /**
      * Очистка информации о примененных шаблонах
      */
    onClearTemplates: function(e){
        var self = this;
        $("body").addClass('wait');
        setTimeout(function(){
            self.sectors_view.clearTemplates();
            $("body").removeClass('wait');
        }, 100);
    }
});

///
/// Представление без группировки на участки
///
App.Views.FullTaskView = Backbone.View.extend({
    tagName:'ul',
    events:{},
    initialize: function(){},
    render: function(items_collecton, item, templates_collection)
    {
        // Очистка формы
        this.clear();
        var itemView = new App.Views.SectorItemView({model: item,ignore: true, i: 0, 'templates_collection': templates_collection, 'show_sector_level': true});
        var tmp_item = $(itemView.render(0).el);
        itemView.items_list_view = new App.Views.ItemsListView({el: tmp_item.find('ul.data-list'), collection: items_collecton });
        this.$el.append(tmp_item.append(itemView.items_list_view.render().el));
        // отображение блока заказных изделий и расчета по укрупненному изделию
        itemView.showControls(true);
        return this;
    },
    /**
     * Очистка формы
     */
    clear: function()
    {
        this.$el.empty();
    }
});

///
/// Представление списка участков------------------------------------------------------------------------------------------------------------------------------------------------------
///
App.Views.SectorsListView = Backbone.View.extend({
    tagName:'ul',
    items_view: null,   // список представлений секторов
    openedItems:{},     // список идентификаторов объектов, которые необходимо раскрыть/скрыть
    events:{
        'sectors_list:refresh': 'onRefreshSelectedSectors',
    },
    initialize: function(){
        this.items_view = [];
    },
    render: function(items_collecton, templates_collection)
    {
        // Очистка формы
        this.clear();
        var that = this;
        var i = 0;
        _.each(this.collection.models, function (item) {
                // отсеивание лишних элементов коллекции, не относящиеся к текущему участку
                var tmp_collection = items_collecton.bySector(item.get('origin_id'));
                var tmp_templates_collection = templates_collection.bySector(item.get('origin_id'));
                that.renderSector(item, i, tmp_collection,tmp_templates_collection);
                i++;
        }, this);
        return this;
    },
    /**
     * Отрисовка элемента участка
     */
    renderSector: function (item, index, items_collecton, templates_collection) {
        var sectorItemView = new App.Views.SectorItemView({model: item, i: index, 'templates_collection': templates_collection, 'show_sector_level':false});
        this.items_view.push(sectorItemView);
        // добавление спецификаций на сектор и отрисовка на форме сектора
        var tmp_sector_item = $(sectorItemView.render(index).el);
        sectorItemView.items_list_view = new App.Views.ItemsListView({el: tmp_sector_item.find('ul.data-list'), collection: items_collecton });
        this.$el.append(tmp_sector_item.append(sectorItemView.items_list_view.render().el));
    },
    /**
     * Очистка формы
     */
    clear: function()
    {
        this.items_view = [];
        this.$el.empty();
    },
    /**
     * Укрупненный расчет
     * specs_list - список спецификаций, заданных в форме укрупненного расчета
     */
    filterBySpecifications: function(specs_list)
    {
        for(var i in this.items_view)
            this.items_view[i].setItemsToCalculate(specs_list);
    },
    /**
     * Очистка спецификаций в фильтре укрупненного расчета
     */
    clearSpecificationFilter: function()
    {
        for(var i in this.items_view)
            this.items_view[i].clearCalculateItems();
    },
    /**
     * Применить шаблоны раскроя по участкам
     */
    applyTemplates: function(templates){
        var self = this;
        for(var i in self.items_view)
        {
            var sector_templates = templates.filter(function(el){return el.get('sector_id') === self.items_view[i].model.get('origin_id')});
            self.items_view[i].onApplyTemplates(null, sector_templates);
        }
    },
    /**
     * Очистить шаблоны расскроя по участкам
     */
    clearTemplates: function(){
        for(var i in this.items_view)
            this.items_view[i].onClearTemplates();
    },
    /**
     * Обработчик события от тригера для обновления выбранных участков
     * sectors_ids - список идентификаторов участков, чьи представления надо обноввить
     */
    onRefreshSelectedSectors: function(e, sectors_ids){
        for(var i in this.items_view)
            if(sectors_ids.indexOf(this.items_view[i].model.get('origin_id')) > -1)
                this.items_view[i].onRefresh();
    }
});

///--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
/// Представление элемента участка------------------------------------------------------------------------------------------------------------------------------------------------------------------------
///--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
App.Views.SectorItemView = Backbone.View.extend({
    tagName:'li',
    className:'h1',
    hide_empty: false,
    index: null,    // индекс элемента
    ignore: null,  // игнорировать участок
    specifications_filter_collection: null, // колллекция фильтров по спецификациям
    specifications_filter_view: null,             // представление фильтров по спецификациям
    specifications_owner_collection: null,   // коллекция конечных изделий - спецификаций
    specifications_owner_view: null,             // представление списка конечных изделий
    items_list_view: null, // предсавление списка спецификаций
    templates_collection: null, // коллекция шаблонов раскроя, примененных на участке
    templates_view: null, // представление списка шаблонов раскроя, задействованных  на участке
    templates: {
        main:_.template($("#sectorItemTemplate").html()),
    },
    events:{
        'click .cancel-data': 'onCancelEdit',
        'click .save-data': 'onSave',
        'click .load-task-data': 'onLoadTask',
        'click .sector-cb-item': 'onCollapse',
        'keypress .tb-task-number': 'onTaskNumberChange',
        'click .cb-hide-empty': 'onHideEmpty',
        'click .cb-show-tasks': 'onShowTasks',
        'change .ddl-sort-by': 'onSortBy',
        'click .lnk-clear-volumes': 'onClearVolumes',
        //--EVENTS BY TRIGGER----------------------------------------
        // Calculate By Enlarge product
        'specification_filter_list_view:apply_filter': 'onFilterBySpecification',
        'specification_filter_list_view:clear_filter': 'onCancelFilterBySpecification',
        'specification_owner_item_view:add_item_to_calculate' : 'onAddItemToCalculate',
        'items:hide_empty_volumes' : 'onHideEmpty',
        // Cut Templates Triggers
        'templates:clear': 'onClearTemplates',
        'templates:apply': 'onApplyTemplates',
        'templates:calculate_plans_by_specifications': 'onCalculateByTemplates',
    },
    initialize: function()
    {
        // инициализация индекса элемента
        this.index = this.options['i'];
        this.ignore = this.options['ignore'];
        this.show_sector_level = this.options['show_sector_level'];
        // инициализация коллекции шаблонов раскроя, задействованных на участке
        this.templates_collection = this.options['templates_collection'];
        // иницифализация фильтра по спецификациям
        this.specifications_filter_collection = new App.Collections.SpecificationFilterCollection();
        this.specifications_filter_collection.add(new App.Models.SpecificationFilterModel({'is_first': true}) );
        //  Представление зайдествованных шаблонов расероя на участке
        this.templates_view = new App.Views.UsedTemplatesListView({
            el: this.$el.find('.pnl-used-templates-body-container'),
            collection: this.templates_collection,
            show_sector_level: this.show_sector_level
        });
    },
    /**
     * Получение данных отфильтрованных по участку
     */
    get_collection_data: function()
    {
        // если в расчетах участвует не отдельный участок а весь заказ, то возвращаем все данные
        if(this.model.get('is_full_order'))
            return App.items_collection;
        else
            return App.items_collection.bySector(this.model.get('origin_id'));
    },
    /**
     * Отрисовка элемента
    */
    render: function () {
        var self = this;
        this.clear();
        // добавление ифнормации об участке
        this.$el.append(this.templates.main($.extend({},this.model.toJSON(),{i:this.index, ignore: this.ignore})));
        // представление фильтра по спецификациям
        this.specifications_filter_view = new App.Views.SpecificationFilterListView({el: this.$el.find('.pnl-specification-filter'), collection:  this.specifications_filter_collection});
        this.specifications_filter_view.render();
        // Представление завершенности конечного изделия
        this.specifications_owner_collection = new App.Collections.SpecificationOwnerCollection(this.model.get("own_products"));
        this.specifications_owner_view = new App.Views.SpecificationOwnerListView({el: this.$el.find('.pnl-owner-specification-body-container'), collection:  this.specifications_owner_collection});
        this.specifications_owner_view.render();
        this.templates_view.setElement(this.$el.find('.pnl-used-templates-body-container'));
        this.templates_view.render();
        // календарь
        var tmp_date = new Date(this.model.get("near_free_work_date"));
        var tmpDays = 0;
        this.$('.date-picker').datepicker({
            format: "dd/mm/yyyy",
            weekStart: 1,
            // clearBtn: true,
            todayHighlight: true,
            multidate: true,
            forceParse: false,
            language: "ru",
           // startDate: (tmpDays>0)?"+"+(tmpDays-1).toString()+"d": "-"+(Math.abs(tmpDays)-1).toString()+"d",
            todayHighlight: false,
            defaultDate: tmp_date,
            beforeShowDay: function (date){
                var used_dates = self.model.get("used_dates");
                var date_str = date.format("yyyy-mm-dd");
                if(date_str in used_dates)
                    return "used";
            },
        }).on('changeDate', function(ev){
                function cancel_selected_date(ev)
                {
                    // отменить выделение даты
                    var index = 0;
                    for(var i in ev.dates)
                    {
                        index++;
                        if(ev.dates[i].toString() == ev.date.toString())
                        {
                            ev.dates.splice(index-1, 1);
                            break;
                        }
                    }
                    $(ev.delegateTarget).datepicker('setDates', ev.dates);
                }
                if(ev.date)
                {
                    // проверка на превышение остатокв объема
                    var data_to_save = self.check_and_get_data(ev.dates);
                    if(!data_to_save['data'] || data_to_save['data'].length==0)
                    {
                        $.jGrowl('Ошибка! Заполните количество.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
                        cancel_selected_date(ev);
                        return this;
                    }
                    if(data_to_save['exceed'])
                    {
                        $.jGrowl(data_to_save['msg'], { 'themeState':'growl-error', 'sticky':false, life: 10000 });
                        cancel_selected_date(ev);
                        return this;
                    }
                    // проверка на занятость даты(на дату уже есть задания)
                    var used_dates = self.model.get("used_dates");
                    var date_str = ev.date.format("yyyy-mm-dd");
                    if(date_str in used_dates)
                    {
                        bootbox.confirm("На указанную дату есть задания № "+used_dates[date_str].join(",")+". Создать ещё одно задание?", function(result)
                        {
                           if(!result)
                                cancel_selected_date(ev);
                        });
                    }
                }
        });
         $('body').removeClass('wait');
        return this;
    },
    /**
     * Скрыть незаполненные поля ввода
     */
    onHideEmpty: function(e)
    {
        var self = this;
        var val = true;
        if(!e.isTrigger)
           val = $(e.currentTarget).prop('checked');
        $('body').addClass('wait');
        setTimeout( function(){
                self.hideEmpty(val);
                $('body').removeClass('wait');
        }, 100);
    },
    hideEmpty: function(val){
        this.hide_empty = val;
        this.$el.find('.cb-hide-empty').prop('checked', val);
        this.items_list_view.hideEmpty(val);
    },

    /**
     * Очистить объемы спецификаций на форме
     */
    onClearVolumes: function(e)
    {
        var self = this;
        $('body').addClass('wait');
        self.$el.find('.cb-hide-empty').prop('checked', false);
        setTimeout(function(){
            self.items_list_view.clearVolumes();
            self.templates_collection.clearCounts();
            Backbone.trigger('templates:refresh',[self]);
            $('body').removeClass('wait');
        }, 100);
    },
    /**
     * Показать номера заданий
     */
    onShowTasks: function(e)
    {
        if(this.$('.cb-show-tasks').prop('checked'))
            this.$(".task-number-col").show();
        else
            this.$(".task-number-col").hide();
    },
    /**
     * Смена типа сортировки данных
    **/
    onSortBy: function(e)
    {
        var self = this;
        var val = $(e.currentTarget).val();
        $('body').addClass('wait');
        setTimeout(function(){self.items_list_view.sortBy(val);$('body').removeClass('wait');}, 100);
    },
    showControls: function(val)
    {
        if(val)
        {
            this.$el.find('.controls').show();
            this.specifications_filter_view.show();
        }
        else
        {
            this.$el.find('.controls').hide();
            this.specifications_filter_view.hide();
        }
    },
    /**
     * Раскрытие дерева участка
     */
    onCollapse: function(e)
    {
        var self = this;
        this.$el.find('.controls').hide();
        this.specifications_filter_view.hide();
        if( this.$el.find('.sector-cb-item').prop('checked'))
        {
            this.$el.find('.controls').show();
            this.specifications_filter_view.show();
        }
    },
    /**
     * Отмена фиьтрации по спецификациям
     */
    onCancelFilterBySpecification: function(e)
    {
        var self = this;
        var items_collection = this.get_collection_data();
         _.each(items_collection.models, function (item) {
                    item.set('volume', '');
                    item.set('enable', true);
        }, this);
         // обновление модели участка
        self.render();
        self.$el.find('.sector-cb-item').prop('checked', true);
        self.$('.tb-task-number').val('');
        self.$el.find('.controls').show();
        self.specifications_filter_view.show();
        // добавление на форму списка спецификаций
        self.items_list_view = new App.Views.ItemsListView({el: self.$el.find('ul.data-list'), collection: items_collection });
        self.$el.append(self.items_list_view.render().el);
        self.onClearVolumes();
        if(e)
            e.stopPropagation();
    },
    /**
     * Фильтрация по спецификации
     * На вход подается модель спецификации
     */
    onAddItemToCalculate: function(e, item_info)
    {
        this.specifications_filter_view.onAddFilterItem(null,item_info);
        if(e)
            e.stopPropagation();
    },
    /**
     * Формаирование списка из спецификаций для блока фильтрации
     * items - список объектов блока укрупненного расчета
     */
    setItemsToCalculate: function(items)
    {
        this.specifications_filter_view.setFilterItems(items);
        var self = this;
        setTimeout(function(){
                self.onFilterBySpecification(null, items);
            },100);
    },
    /**
     * Очистка спецификаций блока укрупненного расчета
     */
    clearCalculateItems: function()
    {
        this.specifications_filter_view.onCancelFilter();
    },

    /**
     * Фильтрация по спецификации
     * filter_specifications_list - список спецификаций с их структурой и количеством
    **/
    onFilterBySpecification: function(e, filter_specifications_list)
    {
        var self = this;
        var tmp_specifications = null;
        var items_collection = null;
        // если отображение всего заказа
        if(self.model.get('is_full_order'))
        {
            tmp_specifications = App.calculate_specification_childs(filter_specifications_list, null);
             // получение всех спецификаций, изготавливаемых на текущем участке
            items_collection = App.items_collection;
        }
        else
        {
            // спецификации отобранные по фильтру
            // получение списка спецификаций, изготавливаемых на заданном участке и являющихся
            // составными для заданных спецификаций
            tmp_specifications = App.calculate_specification_childs(filter_specifications_list, self.model.get('origin_id'));
             // получение всех спецификаций, изготавливаемых на текущем участке
            items_collection = self.get_collection_data();
        }
        // обработка отобранных спецификаций
        _.each(items_collection.models, function (item) {
                item.set('volume', '');
                item.set('enable', true);
                if(!(item.get('number') in tmp_specifications))
                    item.set({'enable': false, 'volume':0, 'time': null});
                else
                {
                    var factScopeVal = Routine.strToFloat(tmp_specifications[item.get('number')]['count']);
                    item.set({
                        'enable': true,
                        'changed':true,
                        'volume':factScopeVal,
                        'time': factScopeVal* Routine.strToFloat(item.get('plan_execution_time')['value'])
                    });
                }
        }, this);
         // отбираем спецификации, к которым нужно применить раскрой
        var items_to_calculate = items_collection.models.filter(function(x){return x.get('use_templates')});
        this.onCalculateByTemplates(null, items_to_calculate, function(calculated_specifications){
            _.each(items_collection.models, function (row) {
                if(row.get('use_templates') && row.get('_id') in calculated_specifications && calculated_specifications[row.get('_id')]>0)
                    row.set({
                        'volume': calculated_specifications[row.get('_id')],
                        'enable': true,
                        'changed': true
                    });
            });
        });
        // обновление модели участка
        self.render();
        self.$el.find('.sector-cb-item').prop('checked', true);
        self.$el.find('.controls').show();
        self.specifications_filter_view.show();
        // добавление на форму списка спецификаций
        // self.$el.append(new App.Views.ItemsListView({el: self.$el.find('ul'), collection: items_collection }).render().el);
        self.items_list_view = new App.Views.ItemsListView({el: self.$el.find('ul.data-list'), collection: items_collection });
        //self.items_list_view.preSetEnteredVolumes(tmp_specifications);
        self.$el.append(self.items_list_view.render().el);
        // не даем данному событию распространиться вверх по дереву
        if(e) e.stopPropagation();
        self.hideEmpty(true);
        self.templates_view.hideEmpty(true);
    },

     /**
      * Событие смены номера задания
      */
    onTaskNumberChange:function(e){
         if(e.keyCode==13)
            this.onLoadTask();
     },
    /**
     * Загрузка задания
     */
    onLoadTask: function()
    {
        var self = this;
        var number = Routine.trim(this.$('.tb-task-number').val());
        if(!number)
        {
            $.jGrowl('Ошибка! Не задан номер задания.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
            return;
        }
        //self.specifications_filter_view.onCancelFilter();
        Routine.showLoader();
        $.ajax({
            type: "GET",
            url: "/handlers/shift_task/get/" + number,
            data: {},
            timeout: 55000,
            contentType: 'application/json',
            dataType: 'json',
            async:true
            }).done(function(result) {
                if(result['status']=="error")
                    $.jGrowl(result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 10000 });
                else if(!result['result'])
                    $.jGrowl('Задание не найдено.', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                else
                {
                    var data = result['result'];
                    if(data['sector'] && data['sector']['origin_id'] != self.model.get('origin_id'))
                        $.jGrowl('Ошибка! Участок искомого задания не совпадает с текущим уастком. ', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                    else
                    {
                        // проставление количества
                        var items_collection = self.get_collection_data();
                         _.each(items_collection.models, function (item) {
                                item.set('volume', '');
                                item.set('enable', true);
                        }, this);
                        for(var i in data.items)
                        {
                            var item = data.items[i];
                            items_collection.get(item['_id']).set('volume', item['count']['value']);
                        }
                        // обновление модели участка
                        self.render();
                        self.$el.find('.sector-cb-item').prop('checked', true);
                        self.$('.tb-task-number').val(number);
                        self.$el.find('.controls').show();
                        self.specifications_filter_view.show();
                        // добавление на форму списка спецификаций
                        //self.$el.append(new App.Views.ItemsListView({el: self.$el.find('ul'), collection: items_collection }).render().el);
                        self.items_list_view = new App.Views.ItemsListView({el: self.$el.find('ul.data-list'), collection: items_collection });
                        self.$el.append(self.items_list_view.render().el);
                    }
                }
            }).error(function(){
                $.jGrowl('Ошибка поиска задания. Повторите попытку. ', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
            }).always(function(){Routine.hideLoader();});
    },
    /**
     * Отмена редактирования данных
     */
    onCancelEdit: function()
    {
        this.items_list_view.clearVolumes();
        // очистка дат в календаре
        this.$('.date-picker').datepicker('clearDates');
        // сброс объемов примененных шаблонов
        this.templates_collection.clearCounts();
        //$(self.el).trigger('templates:refresh', []);
        Backbone.trigger('templates:refresh',[this]);
    },

    /**
     * Обработка события кнопки сохранение данных
     */
    onSave: function()
    {
        var self = this;
        // список дат для заданий
        var dates =  this.$('.date-picker').datepicker('getDates');
        if (!dates || dates.length==0)
        {
            $.jGrowl('Ошибка! Не заданы даты для заданий.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
            return;
        }
        // комент
        var note = this.$('.tbNote').val();
        // получение данных на сохранение
        var data_to_save = this.check_and_get_data(dates);
        if(data_to_save['status'] == 'ok')
            this.save(dates, data_to_save['data'], note);
        else
            $.jGrowl(data_to_save['msg'], { 'themeState':'growl-error', 'sticky':false, life: 10000 });
    },
    check_and_get_data: function(dates)
    {
        var res = {'data': null, 'status': 'ok', 'msg': '', 'exceed':false };
        var dates_count = dates.length;

        // получить список спецификаций участка
        var tmp_items = this.get_collection_data().models;
        var result_items = [];
        for(var i in tmp_items)
            if(Routine.strToFloat(tmp_items[i].get('volume'))>0 )
                result_items.push(tmp_items[i]);
        res['data'] = result_items;
        if(!result_items || result_items.length==0)
        {
            res['status'] = 'error';
            res['msg'] = 'Ошибка! Нет данных на сохранение.';
            return res;
        }
        // флаг корректности всех данных
        var is_checked = true;
        var summ_volumes = 0;
        // проверка превышение объемов задания доступного остатка
        for(var i in result_items)
        {
            var item = result_items[i];
            var cur_volume = Routine.strToFloat(item.get('volume').toString());
            var alov_count = item.get('count')['balance'];
            //var alov_count = Routine.strToFloat(item.get('count')['value'].toString()) - Routine.strToFloat(item.get('count')['issued'].toString());
            if(isNaN(alov_count))
                alov_count = 0;

            summ_volumes+=cur_volume;
            if(cur_volume * dates_count > alov_count)
                is_checked = false;
        }
        if(summ_volumes==0)
        {
            res['status'] = 'error';
            res['msg'] = 'Ошибка! Нет данных на сохранение.';
            return res;
        }
        if(!is_checked)
        {
            res['status'] = 'error';
            res['exceed'] = true;
            res['msg'] = 'Ошибка! По некоторым позициям количество превышает остаток. Запланируйте оставшееся количество отдельным заданием.';
            return res;
        }
        return res;
    },
    /**
     * Сохранение данных
     */
    save: function(task_dates, items, note)
    {
        var self = this;
        var parsed_task_dates = [];
        for(var i in task_dates)
            parsed_task_dates.push(task_dates[i].format("dd/mm/yyyy") );
        var dataToSave = {/*'sector': this.model,*/ 'data': items, 'order_info':  App.order_info, 'dates': parsed_task_dates, 'note': note, 'templates': this.templates_collection.getNotEmptyTemplates()};
        Routine.showLoader();
        $.ajax({
            type: "PUT",
            url: "/handlers/shift_task/savedata",
            data: JSON.stringify(dataToSave),
            timeout: 35000,
            contentType: 'application/json',
            dataType: 'json',
            async:true
        }).done(function(result) {
            if(result['status']=="ok")
            {
                // вывод информации о новом задании
                $.jGrowl('Созданы новые задания № ' + result['new_tasks_numbers'].join("; "), { 'themeState':'growl-success', 'sticky':true });
                // получение обновленных данных для обновления формы
                self.update(result['result']);
            }
            else
                $.jGrowl('Ошибка сохранения данных. Подробности: ' + result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 10000 });
        }).always(function(){Routine.hideLoader()});
    },
    /**
     * обновление данных по участку
     */
    update: function(data)
    {
        var self = this;
        // если текущая вкладка - данные по всем участкам
        if(!this.model.get('is_full_order'))
        {
            // участки
            var new_sectors_collection = new App.Collections.SectorsCollection(data['sectors']);
            this.model.set(new_sectors_collection.findWhere({'origin_id': this.model.get('origin_id')}).toJSON());
            // удаление из коллекции старых данных по участку
            App.items_collection.clearBySector(this.model.get('origin_id'));
        }
        else
        {
            // полная информация
            this.model.set(data['full_order_params']);
            // удаление из коллекции всех моделей
            App.items_collection.reset();
        }
        // спецификации
        var tmpCollection = new App.Collections.ItemsCollection(data['data']);
        // мержинг с новыми данными по участку
        var new_items_collection = (this.model.get('is_full_order') )? new App.Collections.ItemsCollection(data['data']):new App.Collections.ItemsCollection(data['data']).bySector(this.model.get('origin_id'));
        App.items_collection.add(new_items_collection.models,{merge:true});

        // шаблоны раскроя
        App.templates_collection.reset();
        App.templates_collection.add(new App.Collections.TemplatesCollection(data['templates'].map(function(item){return new App.Models.TemplateModel(item)})).models,{specifications_collection: new_items_collection});
        if(!this.model.get('is_full_order'))
        {
            this.templates_collection.reset();
            this.templates_collection.add(App.templates_collection.bySector(this.model.get('origin_id')).models);
        }
        // обновление модели участка
        this.render();
        this.$el.find('.sector-cb-item').prop('checked', true);
        this.$el.find('.controls').show();
        this.specifications_filter_view.show();
        // добавление на форму списка спецификаций
        //this.$el.append(new App.Views.ItemsListView({el: this.$el.find('ul'), collection: new_items_collection }).render().el);
        self.items_list_view = new App.Views.ItemsListView({el: self.$el.find('ul.data-list'), collection: new_items_collection });
        self.$el.append(self.items_list_view.render().el);
        // вызов тригера обновления представления шаблонов раскроя
        // тригер делается для обновления представления глобальных темплейтов укрупненного планирования
        $(self.el).trigger('templates:refresh', []);
    },
    /**
     * Очистка формы
     */
    clear: function()
    {
        // очистка формы отображения
        this.$el.empty();
    },
    /**
     * Событие на применение шаблонов раскроя
     */
    onApplyTemplates: function(e, templates)
    {
        var self = this;
        // если есть шаблоны на применение
        if(templates.length>0)
        {
            // список спецификаций с количеством которые необходимо изготовить
            var items_to_produce = {};
            // var items_to_produce_without_templates = {};
            // список id участков на которых произошли расчеты
            var calculated_sectors = [];

            _.each(templates, function (template) {
                if(calculated_sectors.indexOf(template.get('sector_id'))<0)
                    calculated_sectors.push(template.get('sector_id'));

                // сбор выходящих объектов на изготовление
                _.each(template.get('out_objects'), function(out_object) {
                    if(! (out_object['_id'] in items_to_produce))
                        items_to_produce[out_object['_id']] = 0
                    items_to_produce[out_object['_id']]+= out_object['count'] * template.get('count');
                });

                // сбор входящих, не покупных, изготавливаемых не по шаблонам
                if((!template.get('linked_templates') || template.get('linked_templates').length==0)&& !template.get('in_object')['is_buy'])
                {
                    var in_object = template.get('in_object');
                    if(calculated_sectors.indexOf(in_object['sector']['origin_id'])<0)
                        calculated_sectors.push(in_object['sector']['origin_id']);
                    if(!(in_object['_id'] in items_to_produce))
                        items_to_produce[in_object['_id']] = 0
                    items_to_produce[in_object['_id']]+= in_object['count'] * template.get('count');
                    /*if(! (in_object['_id'] in items_to_produce_without_templates))
                        items_to_produce_without_templates[in_object['_id']] = 0
                    items_to_produce_without_templates[in_object['_id']]+= in_object['count'] * template.get('count');*/
                }
            });

            // если в расчетах участвует не отдельный участок а весь заказ
            if(this.model.get('is_full_order')){
                 var items_collection = App.items_collection;
                  _.each(items_collection.models, function (item) {
                    item.set('volume', '');
                    item.set('enable', true);
                    if(!(item.get('_id') in items_to_produce))
                        item.set({'enable': false, 'volume':0, 'time': null});
                    else
                    {
                        var factScopeVal = Routine.strToFloat(items_to_produce[item.get('_id')]);
                        item.set({
                            'changed':true,
                            'volume':factScopeVal,
                            'time': factScopeVal* Routine.strToFloat(item.get('plan_execution_time')['value'])
                        });
                    }
                }, this);
                // обновление модели участка
                self.render();
                self.$el.find('.sector-cb-item').prop('checked', true);
                self.$el.find('.controls').show();
                self.specifications_filter_view.show();
                // добавление на форму списка спецификаций
                self.items_list_view = new App.Views.ItemsListView({el: self.$el.find('ul.data-list'), collection: items_collection })
                self.$el.append(self.items_list_view.render().el);
            }
            else{
                for(var i in calculated_sectors)
                {
                    var cur_sector_id  = calculated_sectors[i];
                    var items_collection = App.items_collection.bySector(cur_sector_id);
                     _.each(items_collection.models, function (item) {
                        item.set('volume', '');
                        item.set('enable', true);
                        if(!(item.get('_id') in items_to_produce))
                            item.set({'enable': false, 'volume':0, 'time': null});
                        else
                        {
                            var factScopeVal = Routine.strToFloat(items_to_produce[item.get('_id')]);
                            item.set({
                                'changed':true,
                                'volume':factScopeVal,
                                'time': factScopeVal* Routine.strToFloat(item.get('plan_execution_time')['value'])
                            });
                        }
                    }, this);
                }
                // вызов события обновления рассчитываемых объемов для всех участков
                $(this.el).trigger('sectors_list:refresh', [calculated_sectors]);
            }
             if(e)
                e.stopPropagation();
            // автоматически выставляем флаг скрывать пустые
            self.hideEmpty(true);
        }
    },
    /**
     * Очистка информации о примененных шаблонах
     */
    onClearTemplates: function(e){
        var self = this;
        var items_collection = this.get_collection_data();
         _.each(items_collection.models, function (item) {
                    item.set('volume', '');
                    item.set('enable', true);
        }, this);
        // обновление модели участка
        self.render();
        self.$el.find('.sector-cb-item').prop('checked', true);
        self.$('.tb-task-number').val('');
        self.$el.find('.controls').show();
        self.specifications_filter_view.show();
        // добавление на форму списка спецификаций
        self.items_list_view = new App.Views.ItemsListView({el: self.$el.find('ul.data-list'), collection: items_collection });
        self.$el.append(self.items_list_view.render().el);
        if(e) e.stopPropagation();
    },
    /**
     * Обновление текщего представления
     */
    onRefresh: function(){
        var self = this;
        self.render();
        self.$el.find('.sector-cb-item').prop('checked', true);
        self.$el.find('.controls').show();
        self.specifications_filter_view.show();
        // добавление на форму списка спецификаций
        var items_collection = self.get_collection_data();
        self.items_list_view = new App.Views.ItemsListView({el: self.$el.find('ul.data-list'), collection: items_collection })
        self.$el.append(self.items_list_view.render().el);
    },
    /**
     * Событие расчета данных по шаблонам
     * В результате получаем список спецификаций, с объемами [{'_id':0}]
     */
    onCalculateByTemplates: function(e, items_to_calculate, callback){
        callback(this.templates_collection.calculatePlansDataBySpecifications(items_to_calculate));
        if(e) e.stopPropagation();
    }
});

///
/// Представление списка спецификаций
///
App.Views.ItemsListView = Backbone.View.extend({
    events:{},
    hide_empty: false, // скрывать элементы с незаполенными объемами
    show_tasks: false, // показать номера заданий
    parent_index: null,
    sort_by: 'deep', // сортировать по (по умолчанию сортировка по крупноте)
    entered_volumes: null, // объемы, которые пользователь ввел на форме
    templates:{
        itogo:_.template($("#specificationItogoTemplate").html())
    },
     events:{
        'click .all-use-product-struct': 'onUseProductStruct',
        'click .all-use-templates': 'onUseTemplates',
        'items_list_view:calculate_data': 'onCalculateData'
    },
    /**
     * Инициализация
    **/
    initialize: function(){
        this.entered_volumes = {};
    },
    /**
    * Отрисовка
    **/
    render: function(parent_index)
    {
        parent_index = parent_index || 0;
        this.parent_index = parent_index;
        // Очистка формы
        this.clear();
        var that = this;
        var i = 0;
        this.collection.sortBy(this.sort_by,"number");
        if(this.sort_by == 'deep' || this.sort_by=="weight_per_unit")
            //this.collection.models = _.sortBy(this.collection.models, function(model) {return self.indexOf(model) * -1; });
            this.collection.models.reverse();
        _.each(this.collection.models, function (item) {
                that.renderItem(item, parent_index, i, that.hide_empty, that.show_tasks);
                i++;
        }, this);
        this.renderItogo();
        return this;
    },
    /**
     * Сортировка данных
    **/
    sortBy: function (val) {
        this.sort_by = val;
        this.render(this.parent_index);
    },
    /**
     * Скрыть пустые
    **/
    hideEmpty: function (val) {
        this.hide_empty = val;
        this.render();
    },
     /**
      * Предустановка введенных пользователем объемов
      * Используется при укрупненных расчетах
      */
    preSetEnteredVolumes: function(specifications){
        for(var i in specifications)
            this.entered_volumes[specifications[i]['number']] ={
                'volume':  Routine.strToFloat(specifications[i]['count']),
                'number': specifications[i]['number'],
                'use_product_struct': true
            }
    },
    /**
     * Очитить введенные объемы
    **/
    clearVolumes: function () {
        this.hide_empty = false;
        // очищаем объемы
        _.each(this.collection.models, function (model) { model.clear(); }, this);
        // отрисовываем
        this.render();
        // сбрасываем введенные пользователем значения
        this.entered_volumes = {};
    },
    /**
     * Показать номера заданий
    **/
    showTasks: function (val) {
        this.show_tasks = val;
        this.render();
    },
    /**
     * Отрисовка элемента
    **/
    renderItem: function (item, parent_index, index, hide_empty, show_tasks) {
        var itemView = new App.Views.ItemView({model: item, i: parent_index, j: index, hide_empty: hide_empty, parent: this, show_tasks:show_tasks });
        // отрисовка на форме
        this.$el.find(".spec-data-list").append(itemView.render(index).el);
    },
    /**
     * Отрисовка блока Itogo
    **/
    renderItogo: function () {
        var i = 0;
        var itogo = {
            'value':0,
            'issued':0,
            'real_issued':0,
            'handed':0,
            'balance':0,
            'time': 0,
            'fact': 0,
            'used': 0,
        };
        this.collection.sortBy("deep","number");
        _.each(this.collection.models, function (item) {
                itogo['value']+= item.get('count')['value'];
                itogo['issued']+= item.get('count')['issued']; // выдано без учета фактов
                itogo['real_issued']+= (item.get('count')['value']-item.get('count')['real_issued']>0)?item.get('count')['value']-item.get('count')['real_issued']:0; // выдано с учетом сданных фактов
                itogo['handed']+= item.get('count')['handed'];
                itogo['balance']+= item.get('count')['balance'];
                itogo['time']+= item.get('time');
                itogo['fact']+= Routine.strToFloat(item.get('volume'));
                i++;
        }, this);
        // отрисовка на форме
        this.$el.find(".spec-data-list").find('.tr-footer').remove();
        this.$el.find(".spec-data-list").append(this.templates.itogo(itogo));
    },
    /**
     * Очистка формы
    **/
    clear: function()
    {
        this.$el.find(".spec-data-list").empty();
    },
    /**
     * Использовать структуру изделий в расчетах
    **/
    onUseProductStruct: function(e)
    {
        $('body').addClass('wait');
        var self = this;
        var btn = $(e.currentTarget);
        var is_active = false;
        if(btn.hasClass('not_active'))
        {
            btn.removeClass('not_active');
            is_active  = true;
        }
        else
        {
            btn.addClass('not_active');
            is_active = false;
        }
        setTimeout(function(){
            _.each(self.collection.models, function (model) {
                  model.set({ 'use_product_struct':  is_active },{silent:false});
            }, self);
            $('body').removeClass('wait');
        },200);
    },
    /**
     * Использовать шаблоны раскроя
    **/
    onUseTemplates: function(e)
    {
        var self = this;
        $('body').addClass('wait');
        var btn = $(e.currentTarget);
        var is_active = false;
        if(btn.hasClass('not_active'))
        {
            btn.removeClass('not_active');
            is_active  = true;
        }
        else
        {
            $.jGrowl('Внимание! Вы отключили использование шаблонов раскроя для всех изделий, это может привести к некорректным вычислениям и неверному результату. ', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
            btn.addClass('not_active');
            is_active = false;
        }
        setTimeout(function(){
            _.each(self.collection.models, function (model) {
                if(model.get('need_templates'))
                    model.set({ 'use_templates': is_active },{silent:false});
            }, self);
            $('body').removeClass('wait');
        },200);
    },

    /**
     * Событие на пересчет данных по структуре
     * model - текущая модель. в которой изменили значение объема
    **/
    onCalculateData: function(e, model)
    {
        var self = this;
        // запоминаем, какое значение было введено пользователм для данной спецификации
        if(model.get('volume')>0)
            self.entered_volumes[model.get('_id')] = {
                'volume': model.get('volume'),
                'number': model.get('number'),
                'use_product_struct': model.get('use_product_struct')
            }
        else if(model.get('_id') in self.entered_volumes)
            delete self.entered_volumes[model.get('_id')];

        // если расчет по структуре не требуется, то сразу подсчитываем итого
        if(!model.get('use_product_struct'))
        {
            // отрисовка футера
            this.renderItogo();
            return;
        }

        // сбрасываем все сообщения с объектов коллекции
        this.collection.clearMessages();
        this.collection.clearVolumes();

        // пересчет данных по структуре
        var calculated_items = this.calculateDataByStruct(self.entered_volumes);

        // выполнение расчетов объемов получаемых раскроем по шаблонам
        // calculated_specifications - список спецификациф с объемами: {'_id':0}
        $(this.el).trigger('templates:calculate_plans_by_specifications', [calculated_items, function(calculated_specifications){
            // проходим по всем объемам рассчитанным по структуре, если рассчитанные по структуре объемы отличаются от рассчитанных
            // объемов по шаблонам раскроя, то сигнализируем об этом
            _.each(calculated_items, function (calculated_item_model) {
                if(calculated_item_model.get('use_templates') &&  calculated_item_model.get('_id') in calculated_specifications && calculated_item_model.get('volume') != calculated_specifications[calculated_item_model.get('_id')] && calculated_specifications[calculated_item_model.get('_id')]>0)
                {
                    calculated_item_model.warning('Объем рассчитанный по структуре отличается от объема полученного от шаблонов (по структуре объем: '+calculated_item_model.get('volume')+'; объем по шаблонам: '+calculated_specifications[calculated_item_model.get('_id')]+'). Объем автоматически изменен к значению по шаблону.');
                    calculated_item_model.set('volume', calculated_specifications[calculated_item_model.get('_id')]);
                    calculated_item_model.set({
                        'volume': calculated_specifications[calculated_item_model.get('_id')],
                        'enable': true,
                        'changed': true,
                    });
                }
            });
        }]);
        // отрисовка футера
        this.renderItogo();
    },

    /**
     * Функция пересчета данных по структуре
     * items_to_calculate - dict с введенными объемами
     * Функция строит деревъя всех поданных на вход спецификаций. По всем веткам производится подсчет объемов.
     * Если введенный объем для какой либо спецификации превышает суммарно рассчитанный объем данной спецификации по всем
     * входящим деревьям и их веткам, то берем за эталон введенный объем. Для этого во всех деревъях просто удаляем ветки указанной
     * спецификации(таким образом мы обнуляем рассчитанные объемы потребности не только для текущей спецификации, но и для всех ее
     * детей-веток). Если рассчитанные объемы больше введенных, то обнуляем объем у введенной спецификации и за эталон сичтаем расссчитанный
     * объем.
    */
    calculateDataByStruct: function(items_to_calculate)
    {
        //---------------------------------------------------------------------------------------------
        // Собрать объемы  из дерева в линейный список
        function prepare_linear_list_from_tree(node, result){
            if(node['items'] && node['items'].length>0)
            {
                for(var i in node['items'])
                {
                    var row = node['items'][i];
                    if(row['number'] in result)
                        result[row['number']]['count'] += Routine.strToFloat(row['count']['value']);
                    else
                        result[row['number']] = {
                            'number': row['number'],
                            'count':  Routine.strToFloat(row['count']['value'])
                        };
                    prepare_linear_list_from_tree(row, result);
                }
            }
        }
        // Пересчет объемов листьев спецификации для указанного количества
        // по умолчанию дерево начинается с объема  = 1
        function process_items_tree(node, count)
        {
            node['count']['value'] = count;
            if(node['items'] && node['items'].length>0)
                for(var i in node['items'])
                    process_items_tree(node['items'][i], Routine.strToFloat(node['items'][i]['count']['value']) * count);
            return node;
        }
        // вычисление объема требуемой спецификации по списку деревьев
        function calculate_trees_volume(node, items){
            var result_volume = 0;
            for(var i in items){
                if(items[i]['number'] != node['number']){
                    var result = {};
                    prepare_linear_list_from_tree(items[i], result);
                    if(node['number'] in result)
                        result_volume+=result[node['number']]['count'];
                }
            }
            return result_volume;
        }
        // удаление указанной спецификции из дерева объекта
        function remove_item_from_tree(src_number, node){
            var new_items = [];
            for(var i in node['items']){
                if(node['items'][i]['number'] != src_number){
                    new_items.push(node['items'][i]);
                    remove_item_from_tree(src_number, node['items'][i]);
                }
            }
            node['items'] = new_items;
        }
        //------------------------------------------------------------------------------------------------
        //*****************************************************************************

        // подготавливаем данные к расчетам
        // Для моделей у которых отключен структурый расчет
        source_items = [];
        for(var i in items_to_calculate)
        {
            var row = items_to_calculate[i];
            var tmp_node = {
                'number': row['number'],
                'count': {'value': 1},
                'items':  row['use_product_struct']? JSON.parse(App.all_used_specifications[row['number']]['struct'])['items'] : []
            }
            // запуск пересчета объемов с учетом требуемых (введенных пользователем)
            process_items_tree(tmp_node, row['volume'])
            // заносим пересчитанные спецификации в список исходных данных
            source_items.push(tmp_node);
        }
        // проходим по введеным объемам и выясняем, разницу между введенными и расчетными
        // если введенные объемы превышают расчетные, то находим спецификацию с введенным объемом
        // во всех деревьях остальных спецификаций поданных на вход и в них удаляем ветки проверяемой спецификации
        // таким образом введенный объем и расчет для него станет используемым
        // Если введнный объем меньше, чем тот, что требуется по рассчету, то помечаем данное состояние. как ошибку и заменяем объем рассчетным
        for(var i in source_items)
        {
            var node = source_items[i];
            // суммируем все обхемы текущей спецификации  по всем рассчитанным деревьям
            var calculated_volume = calculate_trees_volume(node, source_items);
            if(calculated_volume<Routine.strToFloat(node['count']['value'])){
                if(calculated_volume > 0){
                    for(var j in source_items){
                        if(node['number'] != source_items[j]['number'])
                            remove_item_from_tree(node['number'], source_items[j]);
                    }
                    node['msg'] = "По рассчетам требуется: " + calculated_volume.toString() + "; введено: " + node['count']['value'].toString();
                }
            }
            else if (node['count']['value']>0){
                // обнуляем введенное значение, потомучто объемы будут взяты из рассчетных значений
                if(calculated_volume != node['count']['value'])
                    node['msg'] = "Введеное значение не может быть меньше рассчетного. По рассчетам требуется: " + calculated_volume.toString() + "; введено: " + node['count']['value'].toString();
                node['items'] = [];
                node['count']['value'] = 0;
            }
        }
        // сбор итоговых объемов в линейный список
        var result = {};
        for(var i in source_items){
            var row = source_items[i];
            if(row['number'] in result)
            {
                result[row['number']]['count'] += Routine.strToFloat(row['count']['value']);
                result[row['number']]['msg'] = 'msg' in row? row['msg']:null;
            }
            else{
                result[row['number']] = {
                    'number': row['number'],
                    'count':  Routine.strToFloat(row['count']['value']),
                    'msg': 'msg' in row? row['msg']:null
                };
            }
            prepare_linear_list_from_tree(row, result);
        }

        // выставление итогового результата
        var changed_specifications = [];
        _.each(this.collection.models, function (item) {
                if(item.get('number') in result)
                {
                    changed_specifications.push(item);
                    var factScopeVal = Routine.strToFloat(result[item.get('number')]['count']);
                    item.set({
                        'enable': true,
                        'volume': factScopeVal,
                        'time': factScopeVal* Routine.strToFloat(item.get('plan_execution_time')['value'])
                    });
                    if(result[item.get('number')]['msg'])
                        item.warning(result[item.get('number')]['msg']);
                }
        }, this);
        return changed_specifications
    }
});

///
/// Представление элемента спецификации---------------------------------------------------------------------------------------------------------------------------
///
App.Views.ItemView = Backbone.View.extend({
    tagName:'tr',
    className:'',
    index: null,                    // индекс элемента
    parent_index: null,      // индекс родительского элемента
    hide_empty: false,       // скрывать пустое
    show_tasks: false,       // показывать номера заданий
    templates: {
        main:_.template($("#specificationItemTemplate").html()),
    },
    events:{
        'blur .tb-fact': 'onFactBlur',
        'click .use-product-struct': 'onUseProductStruct',
        'click .use-templates': 'onUseTemplates'
    },
    /**
     * Инициализация
    **/
    initialize: function()
    {
        // инициализация индекса элемента
        this.parent_index = this.options['i'];
        this.index = this.options['j'];
        this.hide_empty = this.options['hide_empty'];
        this.show_tasks = this.options['show_tasks'];
        this.model.bind("change", this.change, this);
    },
    /**
     * Отрисовка элемента
    **/
    render: function () {
        this.clear();
        // добавление ифнормации об участке
        this.$el.append(this.templates.main($.extend({},this.model.toJSON(),{i:this.parent_index, j:this.index, show_tasks: this.show_tasks})));
        // если элекмент не активен, то применяем к нему соответствующий класс
        if(!this.model.get('enable'))
            this.$el.addClass('transparent');
        // работа с ошибками и предупреждениями
        this.$el.removeClass('error').removeClass('warning');
        this.$el.prop('title', '');
        if(this.model.get('msg'))
        {
            this.$el.addClass( this.model.get('msg')['type']=='error'? 'error': 'warning' );
            this.$el.prop('title', this.model.get('msg')['msg']);
        }
        this.$('.tb-fact').numeric({ negative: false, decimal: ',' });
        if(this.hide_empty && !this.model.get('volume'))
            this.$el.hide();
        else
            this.$el.show();
        return this;
    },
    /**
     * Очистка формы
    **/
    clear: function()
    {
        this.$el.empty();
    },
    /**
     * событие на смену данных модели
    **/
    change: function()
    {
        this.render();
    },
    /**
     * Обработка события потери фокуса поля ввода факстического объема
    **/
    onFactBlur:function(){
        var self = this;
        var tbFactScope=  this.$('.tb-fact');
        var balanceVal = Routine.strToFloat(self.model.get('count')['balance'].toString());
        if(isNaN(balanceVal))
                    balanceVal = 0;
        var factScopeVal = Routine.strToFloat(tbFactScope.val());
        if(isNaN(factScopeVal) || !factScopeVal)
        {
            factScopeVal = 0;
            tbFactScope.val('');
        }
        else
            tbFactScope.val(Routine.floatToStr(factScopeVal));
        if(factScopeVal>balanceVal)
        {
            tbFactScope.addClass('error');
            var msg = "Количество превышает остаток.";
            $.jGrowl(msg, { 'themeState':'growl-error', 'sticky':false });
        }
        else
            tbFactScope.removeClass('error');
        // chande data in model
        self.model.set({'changed':true, 'volume': factScopeVal, 'time': factScopeVal* Routine.strToFloat(self.model.get('plan_execution_time')['value'])},{silent:false});
        // перерасчет всех данных, относительно измененного объема
        $(self.el).data = self.model;

        $('body').addClass('wait');
        setTimeout(function(){
           $(self.el).trigger('items_list_view:calculate_data', [self.model]);
           $('body').removeClass('wait');
        },100);
    },
    /**
     * Событие смены поля - использовать структуру изделия для расчетов
    */
    onUseProductStruct: function(e){
        this.model.set({ 'use_product_struct': !this.model.get('use_product_struct') },{silent:false});
    },
    /**
     * Событие смены поля - использовать шаблоны раскроя для расчетов
    */
    onUseTemplates: function(e){
        if(this.model.get('use_templates'))
            $.jGrowl('Внимание! Вы отключили использование шаблонов раскроя для данного изделия, это может привести к некорректным вычислениям и неверному результату. ', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
        this.model.set({ 'use_templates': !this.model.get('use_templates') },{silent:false});
    }
});
