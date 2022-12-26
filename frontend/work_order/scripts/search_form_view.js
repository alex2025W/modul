///------------------------------------------------------------------------------------------------------------------------------------------------
/// Представление формы поиска
///------------------------------------------------------------------------------------------------------------------------------------------------
App.Views.FindView = Backbone.View.extend({
    el: $("#find-order-form"),
    dataListView:null,
    selectedSectorTypes: [],
    selectedSectors: [],
    filterSelectedWorkorders: [],
    filterSelectedWorks: [],
    templates: {
            item_templateSector:_.template($("#filterItemTemplateSector").html()),
            item_templateSectorType:_.template($("#filterItemTemplateSectorType").html()),
    },
    events:{
        'click #find-by-order-number': 'onSearchButton',
        //'keyup :input': 'onSearchKey',
        'keypress :input': 'onSearchKey',
        'click .btn-collapse': 'OnCollapse',
    },
    initialize: function(){
        var self = this;
        // событие на добавление новых нарядов
        Backbone.on("global:new_workorders",this.onGlobalNewWorkordersAdded, this);
        // событие на обновление существующего наряда
        Backbone.on("global:update_workorder",this.onGlobalUpdateWorkorder, this);
        this.$('#order-number').focus();
        this.$('.pnl-ddl').show();
        this.$('.btn-collapse').show();
        // стартовые фильтры
        this.selectedSectors = [];
        this.selectedSectorTypes = [];
        this.filterSelectedWorkorders = [];
        this.filterSelectedWorks = [];

        /*// подключение мультиселекта на виды участков
        this.$('.ddl-sector-types').multiselect({
                buttonContainer: '<span class="dropdown" />',
                includeSelectAllOption: true,
                enableCaseInsensitiveFiltering: true,
                numberDisplayed: 3,
                filterPlaceholder: 'Найти',
                nonSelectedText: "Направления",
                nSelectedText: "Направлений выбрано: ",
                selectAllText: "Все",
                maxHeight: 400,
                 buttonText: function(options) {
                        if (options.length === 0) {
                            return 'Направления <b class="caret"></b>';
                        }
                        else if (options.length > this.numberDisplayed) {
                                return this.nSelectedText+options.length + ' ' +  ' <b class="caret"></b>';
                        }
                        else {
                            var selected = 'Направления: ';
                            options.each(function() {
                                selected += $(this).val() + ', ';
                            });
                            return selected.substr(0, selected.length -2) + ' <b class="caret"></b>';
                        }
                    },
                    onChange: function(element, checked) {
                            if(checked === true)
                            {
                                if(element.val()=='multiselect-all')
                                {
                                    self.selectedSectorTypes = [];
                                     $(self.el).find('.ddl-sector_types' ).next().find('input:visible').each(function(){
                                        if($(this).val()!="" && $(this).val()!='multiselect-all' && !$(this).prop('disabled'));
                                            self.selectedSectorTypes.push($(this).val());
                                     });
                                }
                                else
                                    self.selectedSectorTypes.push(element.val());
                            }
                            else
                            {
                                if(element.val()=='multiselect-all')
                                {
                                    self.selectedSectorTypes = [];
                                }
                                else
                                {
                                    if(self.selectedSectorTypes.indexOf(element.val())>-1)
                                        self.selectedSectorTypes.splice(self.selectedSectorTypes.indexOf(element.val()),1);
                                }
                            }
                            Backbone.trigger('global:on_url_params_change',[self, 'sector_type',  self.selectedSectorTypes.join('&')]);
                            // перетсройка фильтров по участкам
                            //self.rebuildSectors();
                            // отрисовка основных данных
                            $('body').addClass('wait');
                            setTimeout(function(){
                                App.dataListView.render(self.selectedSectorTypes, self.selectedSectors, self.filterSelectedWorkorders, self.filterSelectedWorks);
                                $('body').removeClass('wait');
                            },150);
                    }
            });*/

        // подключение мультиселекта на участки
        this.$('.ddl-sectors').multiselect({
                buttonContainer: '<span class="dropdown" />',
                includeSelectAllOption: true,
                enableCaseInsensitiveFiltering: true,
                numberDisplayed: 3,
                filterPlaceholder: 'Найти',
                nonSelectedText: "Участки",
                nSelectedText: "Участков выбрано: ",
                selectAllText: "Все",
                maxHeight: 400,
                enableClickableOptGroups:true,
                 buttonText: function(options) {
                        if (options.length === 0) {
                            return 'Участки <b class="caret"></b>';
                        }
                        else if (options.length > this.numberDisplayed) {
                                return this.nSelectedText+options.length + ' ' +  ' <b class="caret"></b>';
                        }
                        else {
                            var selected = 'Участки: ';
                            options.each(function() {
                                selected += $(this).val() + ', ';
                            });
                            return selected.substr(0, selected.length -2) + ' <b class="caret"></b>';
                        }
                    },
                    onChange: function(element, checked) {
                            if(checked === true)
                            {
                                if(element.val()=='multiselect-all')
                                {
                                    self.selectedSectors = [];
                                    // take only visible elems
                                     $(self.el).find('.ddl-sectors' ).next().find('input:visible').each(function(){
                                        if($(this).val()!="" && $(this).val()!='multiselect-all' && !$(this).prop('disabled'));
                                            self.selectedSectors.push($(this).val());
                                     });
                                }
                                else
                                    self.selectedSectors.push(element.val());
                            }
                            else
                            {
                                if(element.val()=='multiselect-all')
                                {
                                    self.selectedSectors = [];
                                }
                                else
                                {
                                    if(self.selectedSectors.indexOf(element.val())>-1)
                                        self.selectedSectors.splice(self.selectedSectors.indexOf(element.val()),1);
                                }
                            }

                            /*Backbone.trigger('global:on_url_params_change',[self, 'sector',  self.selectedSectors.join('&')]);
                            // отрисовка основных данных
                            $('body').addClass('wait');
                            setTimeout(function(){
                                App.dataListView.render(self.selectedSectorTypes, self.selectedSectors, self.filterSelectedWorkorders, self.filterSelectedWorks);
                                $('body').removeClass('wait');
                            },150);*/
                    }
            });

        // подключение мультиселекта на наряды
        this.$('.ddl-workorders').multiselect({
                buttonContainer: '<span class="dropdown" />',
                includeSelectAllOption: true,
                enableCaseInsensitiveFiltering: false,
                numberDisplayed: 3,
                filterPlaceholder: 'Найти',
                nonSelectedText: "Наряды",
                nSelectedText: "Нарядов выбрано: ",
                selectAllText: "Все",
                maxHeight: 400,

                 buttonText: function(options) {
                        if (options.length === 0)
                            return 'Наряды <b class="caret"></b>';
                        else if (options.length > this.numberDisplayed)
                                return this.nSelectedText+options.length + ' ' +  ' <b class="caret"></b>';
                        else {
                            var selected = 'Наряды: ';
                            options.each(function() {
                                selected += $(this).text() + ', ';
                            });
                            return selected.substr(0, selected.length -2) + ' <b class="caret"></b>';
                        }
                    },
                    onChange: function(element, checked) {
                            self.filterSelectedWorkorders = [];
                            if(checked === true)
                            {
                                if(element.val()=='multiselect-all')
                                {
                                    self.filterSelectedWorkorders = [];
                                    // take only visible elems
                                     $(self.el).find('.ddl-workorders' ).next().find('input:visible').each(function(){
                                        if($(this).val()!="" && $(this).val()!='multiselect-all' && !$(this).prop('disabled'));
                                            self.filterSelectedWorkorders.push($(this).val());
                                     });
                                }
                                else
                                    self.filterSelectedWorkorders.push(element.val());
                            }
                            else
                            {
                                if(element.val()=='multiselect-all')
                                {
                                    self.filterSelectedWorkorders = [];
                                }
                                else
                                {
                                    if(self.filterSelectedWorkorders.indexOf(element.val())>-1)
                                        self.filterSelectedWorkorders.splice(self.filterSelectedWorkorders.indexOf(element.val()),1);
                                }
                            }

                            /*Backbone.trigger('global:on_url_params_change',[self, 'workorder',  self.filterSelectedWorkorders.join('&')]);
                            // отрисовка основных данных
                            $('body').addClass('wait');
                            setTimeout(function(){
                                App.dataListView.render(self.selectedSectorTypes, self.selectedSectors, self.filterSelectedWorkorders, self.filterSelectedWorks);
                                $('body').removeClass('wait');
                            },150);*/
                    }
            });

         // подключение мультиселекта на работы
        this.$('.ddl-works').multiselect({
                buttonContainer: '<span class="dropdown" />',
                includeSelectAllOption: true,
                enableCaseInsensitiveFiltering: true,
                numberDisplayed: 3,
                filterPlaceholder: 'Найти',
                nonSelectedText: "Работы",
                nSelectedText: "Работ выбрано: ",
                selectAllText: "Все",
                maxHeight: 400,
                 buttonText: function(options) {
                        if (options.length === 0)
                            return 'Работы <b class="caret"></b>';
                        else if (options.length > this.numberDisplayed)
                                return this.nSelectedText+options.length + ' ' +  ' <b class="caret"></b>';
                        else {
                            var selected = 'Работы: ';
                            options.each(function() {
                                selected += $(this).text() + ', ';
                            });
                            return selected.substr(0, selected.length -2) + ' <b class="caret"></b>';
                        }
                    },
                    onChange: function(element, checked) {
                            if(checked === true)
                            {
                                if(element.val()=='multiselect-all')
                                {
                                    self.filterSelectedWorks = [];
                                    // take only visible elems
                                     $(self.el).find('.ddl-works' ).next().find('input:visible').each(function(){
                                        if($(this).val()!="" && $(this).val()!='multiselect-all' && !$(this).prop('disabled'));
                                            self.filterSelectedWorks.push($(this).val());
                                     });
                                }
                                else
                                    self.filterSelectedWorks.push(element.val());
                            }
                            else
                            {
                                if(element.val()=='multiselect-all')
                                {
                                    self.filterSelectedWorks = [];
                                }
                                else
                                {
                                    if(self.filterSelectedWorks.indexOf(element.val())>-1)
                                        self.filterSelectedWorks.splice(self.filterSelectedWorks.indexOf(element.val()),1);
                                }
                            }

                            /*Backbone.trigger('global:on_url_params_change',[self, 'work',  self.filterSelectedWorks.join('&')]);
                            // отрисовка основных данных
                            $('body').addClass('wait');
                            setTimeout(function(){
                                App.dataListView.render(self.selectedSectorTypes, self.selectedSectors, self.filterSelectedWorkorders, self.filterSelectedWorks);
                                $('body').removeClass('wait');
                            },150);*/
                    }
            });

    },

     /**
     *  Событие нажатия на кнопку раскрытия групп
    **/
    OnCollapse: function(e)
    {
        var cur_btn = $(e.currentTarget);
        if(cur_btn.val()=="collapsed")
            {
                     cur_btn.val("unCollapsed").html('&nbsp;&nbsp;Закрыть группы').prepend('<i class = "fa fa-folder-open"></i>');
                     Backbone.trigger('global:collapse',[this, true, cur_btn]);
            }
            else
            {
                     cur_btn.val("collapsed").html('&nbsp;&nbsp;Расскрыть группы').prepend('<i class = "fa fa-folder"></i>');
                     Backbone.trigger('global:collapse',[this, false, cur_btn]);
            }
    },

    /**
     * Событие по кнопке поиска
    **/
    onSearchButton:function(e){
            this.onSearch(true);
    },
    /**
     *  событие ENTER поля поиска
    **/
    onSearchKey:function(e){
        if (e.which === 13)
        {
            this.onSearch(true);
        }

    },

    /**
    ** Выставлены ли какие-то фильтры
    **/
    hasFilters: function(){
        return this.selectedSectorTypes.length>0 || this.selectedSectors.length>0||this.filterSelectedWorkorders.length>0||this.filterSelectedWorks.length>0;
    },

    /**
    ** Поиск
    **/
    doSearch: function(number, search_type, sector_type, sector, workorder, work)
    {
        var self = this;
        self.selectedSectorTypes = (sector_type)?sector_type.split('&'):[];
        self.selectedSectors = (sector)?sector.split('&'):[];
        self.filterSelectedWorkorders = (workorder)?workorder.split('&'):[];
        self.filterSelectedWorks = (work)?work.split('&'):[];

        // если не заданы параметры поиска, то ничего не делаем
        if (!number || number == '' || (search_type=='order' && number.split('.').length<2))
        {
            $.jGrowl('Не заданы параметры поиска. ', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
            return;
        }

        // заполнение парамтеров поиска текущими значениеми
        this.$('#order-number').val(number);
        this.$('#filter-type').val(search_type);

        // получение данных с сервера
        Routine.showLoader();
        $.ajax({
            type: "POST",
            //url: "/handlers/workorderdate/search/" + number + '/' + search_type,
            url: "/handlers/workorderdate/search/",
            data: JSON.stringify({
                'filter_sectors': self.selectedSectors,
                'filter_workorders': self.filterSelectedWorkorders,
                'filter_works': self.filterSelectedWorks,
                'search_type': search_type,
                'search_number': number
            }),
            timeout: 55000,
            contentType: 'application/json',
            dataType: 'json',
            async:true
            }).done(function(result) {
                if(result['status']=="error" || ( (!result['work_orders'] || result['work_orders'].length==0) && self.hasFilters()))
                {
                    App.DataContractInfo['data'] = null;
                    App.dataListView.render();
                    $.jGrowl(result['msg']?result['msg']:'По заданным параметрам ничего не найдено.' , { 'themeState':'growl-error', 'sticky':false, life: 10000 });
                    // заполнение фильтров
                    self.rebuildFilters();
                    // обвновлене данных на форме
                    App.DataCollection.reset();
                    App.dataListView.render(self.selectedSectorTypes, self.selectedSectors, self.filterSelectedWorkorders, self.filterSelectedWorks, search_type=='workorder');
                    // если поиск по наряду то делается автоколапсе
                    if(search_type=='workorder')
                       self.$('.btn-collapse').val("unCollapsed").html('&nbsp;&nbsp;Закрыть группы').prepend('<i class = "fa fa-folder-open"></i>');
                }
                else
                {
                    // заполнение фильтров
                    self.rebuildFilters();
                    // обвновлене данных на форме
                    App.DataCollection.reset();
                    App.DataCollection.add(new App.Collections.WorkOrderCollection(result['work_orders']).models);
                    App.DataContractInfo['data'] = result['contract_info'];
                    App.dataListView.render(self.selectedSectorTypes, self.selectedSectors, self.filterSelectedWorkorders, self.filterSelectedWorks, search_type=='workorder');
                    // если поиск по наряду то делается автоколапсе
                    if(search_type=='workorder')
                       self.$('.btn-collapse').val("unCollapsed").html('&nbsp;&nbsp;Закрыть группы').prepend('<i class = "fa fa-folder-open"></i>');
                }
            }).error(function(){
                App.dataListView.render();
                $.jGrowl('Ошибка поиска данных. Повторите попытку. ', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
            }).always(function(){Routine.hideLoader();});
    },

    /**
    ** Перестройка фильтра по участкам с учетом выбранных направлений работ
    **/
    rebuildSectors: function(){
        /*/// Локальная функция получения участков из данных
        function get_sectors(data, selected_sector_types){
            var result = {};
            _.each(data.models, function (row) {
                if( (selected_sector_types.length==0 || selected_sector_types.indexOf(row.get('sector_type'))>-1) && !(row.get('sector_code') in result))
                    result[row.get('sector_code')] = {'code': row.get('sector_code'), 'name':row.get('sector_name'), 'sector_type': row.get('sector_type'), 'enabled': true} ;
            }, this);
            return result;
        }
        var sectors = get_sectors(App.DataCollection, this.selectedSectorTypes);
        this.fillSectors(sectors, this.selectedSectors);*/
        this.fillSectors(this.selectedSectors);
    },

    /**
    ** Перестройка фильтров
    **/
    rebuildFilters: function(){
        /// Локальная функция получения типов участков из данных
        function get_sector_types(data){
            var result = {};
            _.each(data.models, function (row) {
                if(!(row.get('sector_type') in result))
                    result[row.get('sector_type')] = { 'name':row.get('sector_type'), 'enabled': true};
            }, this);
            return result;
        }
        // var sector_types = get_sector_types( App.DataCollection);
        // this.fillSectorTypes(sector_types, this.selectedSectorTypes);
        this.rebuildSectors();

        // выставление значений для фильтра нарядов
        var ddl = this.$(".ddl-workorders");
        for(var i in this.filterSelectedWorkorders)
            $(ddl).find('option[value='+this.filterSelectedWorkorders[i]+']').prop('selected', true);
        $(ddl).multiselect('rebuild');
        // выставление значений для фильтра работ
        var ddl = this.$(".ddl-works");
        for(var i in this.filterSelectedWorks)
            $(ddl).find('option[value='+this.filterSelectedWorks[i]+']').prop('selected', true);
        $(ddl).multiselect('rebuild');
    },

    /**
     * Заполнение выпадающего списка видов участков(цех\монтаж)
    **/
    /*fillSectorTypes: function(data, selected_items)
    {
        var ddl = this.$(".ddl-sector-types").empty();
        for(var i in data)
        {
            if(selected_items && selected_items.indexOf(data[i].name.toString())>-1)
                data[i].checked = true;
            else
                data[i].checked = false;
            $(ddl).append(this.templates.item_templateSectorType(data[i]));
        }
        $(ddl).multiselect('rebuild');
   },*/

   /**
     * Заполнение выпадающего списка участков
    **/
    fillSectors: function(selected_items)
    {
            /*var ddl = this.$(".ddl-sectors").empty();
            for(var i in data)
            {
                if(selected_items && selected_items.indexOf(data[i].code.toString())>-1)
                    data[i].checked = true;
                else
                    data[i].checked = false;
                $(ddl).append(this.templates.item_templateSector(data[i]));
            }*/
            var ddl = this.$(".ddl-sectors");
            $(ddl).find("option").each(function(x){
                $(this).prop('selected',false);
                if(selected_items && selected_items.indexOf($(this).val().toString())>-1)
                    $(this).prop('selected',true);
            });
            $(ddl).multiselect('rebuild');
   },


    /**
     * Событие на поиск данных по заданным параметрам
     * need_clear - флаг необходимости сброса и стории раскрытых веток данных
    **/
    onSearch:function(need_clear){
        var self =this;
        if(need_clear)
            App.dataListView.clear();

        //Backbone.trigger('global:on_url_params_change',[this, 'sector_type',  .selectedSectorTypes.join('&')]);
        Backbone.trigger('global:on_url_params_change',[self, 'sector_type',  '']);
        Backbone.trigger('global:on_url_params_change',[self, 'sector',  self.selectedSectors.join('&')]);
        Backbone.trigger('global:on_url_params_change',[self, 'workorder',  self.filterSelectedWorkorders.join('&')]);
        Backbone.trigger('global:on_url_params_change',[self, 'work',  self.filterSelectedWorks.join('&')]);
        App.doQuery("number/"+this.$('#order-number').val()+"/search_type/"+this.$('#filter-type').val()+"/sector_type/"+this.selectedSectorTypes.join('&')+'/sector/'+ this.selectedSectors.join('&')+"/workorder/"+this.filterSelectedWorkorders.join('&')+'/work/'+ this.filterSelectedWorks.join('&'));
    },

    /**
    ** Обработка события создания новых нарядов
    **/
    onGlobalNewWorkordersAdded: function(e){
        // список нарядов
        var search_type = this.$('#filter-type').val();
        var new_data = e[0];
        App.DataCollection.add(new App.Collections.WorkOrderCollection(new_data).models);
        App.dataListView.render(this.selectedSectorTypes, this.selectedSectors, this.filterSelectedWorkorders, this.filterSelectedWorks,  search_type=='workorder');
        //this.onSearch();
    },

    /**
    ** Обработка события обновления наряда
    **/
    onGlobalUpdateWorkorder: function(e){
        // тип поиска
        var search_type = this.$('#filter-type').val();
        // отредактированный наряд
        var new_data = e[0];
        // поиск наряда в коллекции
        var old_data = App.DataCollection.findWhere({'_id': new_data['_id']});
        // подмена данных
        old_data.set(new_data);
        old_data.set('plan_work', new App.Collections.WorkCollection(old_data.get('plan_work')));
        //App.DataCollection.add(new App.Collections.WorkOrderCollection(new_data).models);
        App.dataListView.render(this.selectedSectorTypes, this.selectedSectors, this.filterSelectedWorkorders, this.filterSelectedWorks,  search_type=='workorder');
        //this.onSearch();
    }
});
