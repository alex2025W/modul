
///
/// Представление командера-----------------------------------------------------------------------------------------------------------------------------
///
App.Views.Commander = Backbone.View.extend({
    templates: {
            infopanel_item:_.template($("#infoPanelItem").html()),
     },
    isActive: null,                                 // флаг, указывающий, активно ли окно в данный момент
    isExpand: null,                                 // флаг, указывающий, равзернуто ли окно на весь экран
    isSort: null,                                 // флаг, указывающий, нужна ли автоматическая сортировка или нет
    highlightElem: null,                         // элемент, который необходимо подсветить
    selectedItem: null,                          // элемент выделенный в проводнике
    currentItem: null,                            // элемент в котором сейчас находится пользователь
    breadCrumpsView: null,                  // хлебные крошки
    dirrectoryView: null,                        // данные в проводнике
    treeView: null,                                // данные в дереве
    searchView: null,                             // данные результата поиска
    currentMode: null,                           // Текущий режим работы командера
    lastSearchQuery:"",                          // Текущее условие поиска
    neighborCurrentItem:null,                 // текущий элемент в соседнем проводнике
    events:{
         'click .control-panel>.btn': 'onControlPanelItemClick',
         'click .btn-search': 'onSearch',
         'keypress .tb-search': 'pressSearchKey',
         'click': 'onActivate',
         'click .expand-root': 'onExpand',
         'click .sort-root': 'onSort',

         //----------------------------------------------------------------------------
         'itemSelect': 'itemSelect',
         'itemClick': 'itemClick',
         'itemCopy': 'itemCopy',
         'itemMove': 'itemMove',
         'itemLink': 'itemLink',
         'goToLink': 'goToLink',
         'openItem': 'openItem',
         'openTree': 'openTree',
         'openGraph': 'openGraph',
         'openCalculation': 'openCalculation',
         'openSpecification': 'openSpecification',
         'openComplect': 'openComplect',
         'itemRemove': 'itemRemove',
         'itemEdit': 'itemEdit',
         'itemAdd': 'itemAdd',
         'navigateItemClick': 'navigateItemClick',
         'onDoTask':'onDoTask',
         'searchItemClick': 'searchItemClick',
         'exitSearchClick': 'exitSearchClick',
         'modeChange':'onModeChange',
         'onHighLightElem': 'onHighLightElem',
         'itemCreateProduct': 'itemCreateProduct',
         'itemCreateByTemplate': 'itemCreateByTemplate',
         'itemRedefine': 'itemRedefine',
         'undo': 'undo',
         'redo': 'redo',
         'updateBreadCrumpsView': 'updateBreadCrumpsView'
    },
     // режимы работы командера
     modes: {
            search: 'search',
            base: 'base',
            tree: 'tree',
     },
    initialize: function(){
        // инициализация хлебных крошек
        this.breadCrumpsView = new App.Views.BreadCrumpsView({el: this.$('.breadcrumbs-wrapper'), collection: this.collection});
        // инициализация объекта отображения списка данных в табличном виде
        this.dirrectoryView = new App.Views.ItemsTableView({el: this.$('.esud-data-container'), collection: this.collection});
        // инициализация объекта отображения списка данных в виде дерева
        this.treeView = new App.Views.ItemsTreeView({el: this.$('.esud-data-tree-container')});
        // инициализация объекта отображения результата поиска
        this.searchView = new App.Views.searchView({el: this.$('.search-data')});
        // глобальная операция копирования
        Backbone.on("control:copy",this.onGlobalCopy, this);
        // глобальная оперция создания ярлыка
        Backbone.on("control:link",this.onGlobalLink, this);
        // глобальная оперция перемещения
        Backbone.on("control:move",this.onGlobalMove, this);
        // глобальная оперция перехода по ссылке
        Backbone.on("control:gotolink",this.onGlobalGoToLink, this);
        // глобальная оперция открытия элемента
        Backbone.on("control:openItem",this.onOpenItem, this);
        // глобальная оперция активации командера
        Backbone.on("control:activate",this.onGlobalActivate, this);
        // глобальная оперция разворота на весь экран командера
        Backbone.on("control:expand",this.onGlobalExpand, this);
        // глобальная оперция ыортировки данных командера
        Backbone.on("control:sort",this.onGlobalSort, this);
        // глобальная операция выеделения объекта
        Backbone.on("global:selectItem",this.onGlobalSelectItem,this);
        // глобальная операция обновления данных в окне проводника
        Backbone.on("control:refresh",this.onGlobalRefresh, this);
        // глобальная операция обновления данных в строке информации о текущем объекте
        Backbone.on("control:refreshPanelItemInfo",this.onGlobalRefreshPanelItemInfo, this);
        // глобальное событие подсвечивания элемента
        Backbone.on("control:highlightElem",this.onGlobalHighlightElem, this);
        // глобальная операция построения спецификации
        Backbone.on("control:specificate",this.onGlobalSpecificate, this);
        // глобальная операция построения комплекта
        Backbone.on("control:complect",this.onGlobalComplect, this);
        // глобальная операция построения графа
        Backbone.on("control:open-graph",this.onGlobalOpenGraph, this);
        // глобальная операция создания изделия
        Backbone.on("control:createProduct",this.onGlobalCreateProduct, this);
        // глобальная операция создания объекта по шаблону
        Backbone.on("control:createByTemplate",this.onGlobalCreateByTemplate, this);
        // глобальная операция переопределения объекта
        Backbone.on("control:redefine",this.onGlobalRedefine, this);
        // глобальная операция отката назад по истории объекта [доступно только для изделий]
        Backbone.on("control:undo",this.onGlobalUndo, this);
        // глобальная операция возврата вперед по истории объекта [доступно только для изделий]
        Backbone.on("control:redo",this.onGlobalRedo, this);
        // текущий режим работы командера
        this.currentMode = this.modes.base;
        // инициализация активности окна
        this.isActive = false;
        // инициализация развернутости окна
        this.isExpand = false;
        // инициализация необходимости сортировки данных
        this.isSort = false;
    },

    /**
     * Отрисовка компонента
    **/
    render:function(){
    },

    /**
     * получение URL текущего состояни командера
    **/
    getUrl:function()
    {
        switch(this.currentMode)
        {
            case this.modes.base:
                return  "go__" + ((this.currentItem)?this.currentItem.get('_id'):"");
            break;
            case this.modes.tree:
                return  "go__" + ((this.currentItem)?this.currentItem.get('_id'):"");
            break;
            case this.modes.search:
                return "search__" + this.$('.tb-search').val();
            break;
        }
        return "";
    },

    /**
     ** Добавление параметра в стек истории
    **/
    addToHistory:function(){
        switch(this.currentMode)
        {
            case this.modes.base:
                this.breadCrumpsView.addToHistory(App.CTasks.go, ((this.currentItem)?this.currentItem.get('_id'):""));
            break;
            case this.modes.tree:
                this.breadCrumpsView.addToHistory(App.CTasks.go, ((this.currentItem)?this.currentItem.get('_id'):""));
            break;
            case this.modes.search:
                this.breadCrumpsView.addToHistory(App.CTasks.search,  this.$('.tb-search').val());
            break;
        }
    },

    /**
     * Событие на необходимость выполнения запроса(генерится тригером)
    **/
    onDoTask: function(event, params)
    {
        this.doTask(params['command'], params['param'], true, false);
    },

    /**
     * Обработка внешенй команды
    **/
    doTask: function(command, param, need_save_url, need_save_history){
        var self = this;
        // обработка команд
        switch(command)
        {
            case 'go':
                // снять выделение с элемента
                // вызвать перезагрузку командера с новым переметром
                $(self.el).trigger('itemSelect',[null]);
                self.updateState(param, need_save_url, need_save_history);
            break;
            case 'load':
                // загрузка существующего списка объектов
                //console.log('load');
                $(self.el).trigger('itemSelect',[null]);
                self.dirrectoryView.render();
            break;
            case 'search':
                // поиск объектов
                this.$('.tb-search').val(param);
                if(!param)
                    $.jGrowl('Не заданы условия поиска', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                else
                    self.doSearch(param, need_save_url, need_save_history);
            break;
            case 'activate':
                self.$el.find('.commander-box').removeClass('active');
                self.isActive = false;

                if(param=='true')
                {
                    self.$el.find('.commander-box').addClass('active');
                    self.isActive = true;
                    if(need_save_url)
                        Backbone.trigger('saveUrlHistory',[self]);
                }
            break;
            case 'expand':
                if(param=='true')
                {
                    self.isExpand = true;
                    Backbone.trigger('control:expand',[self, "fast"] );
                    if(need_save_url)
                        Backbone.trigger('saveUrlHistory',[self]);
                }
                else
                {
                    self.isExpand = false;
                    Backbone.trigger('control:expand',[self, "fast"] );
                }
            break;
            case 'sort':
                if(param=='true')
                {
                    self.isSort = true;
                    Backbone.trigger('control:sort',[self]);
                    if(need_save_url)
                        Backbone.trigger('saveUrlHistory',[self]);
                }
                else
                {
                    self.isSort = false;
                    Backbone.trigger('control:sort',[self] );
                }
            break;
            case 'highlight':
                if(param && param != "")
                    this.highlightElem = param;
                else
                    this.highlightElem = null;
            break;
            default:
            break;
        }
    },

    /**
     * Обработка кнопок конторольной панели
    **/
    onControlPanelItemClick: function(e){
        var self = this;
        //console.log($(e.currentTarget).data('val'));
        switch($(e.currentTarget).data('val'))
        {
            case 'edit':
                $(self.el).trigger('itemEdit', [self.selectedItem]);
            break;
            case 'add':
                $(self.el).trigger('itemAdd', [self.selectedItem]);
            break;
            case 'remove':
               // подвтерждение удаления
                var msg = "Вы уверены, что хотите удалить элемент?";
                bootbox.confirm(msg, function(result){
                            if(result)
                            {
                                $(self.el).trigger('itemRemove', [self.selectedItem]);
                                $(self.el).trigger('itemSelect',[null]);
                            }
                });
            break;
            case 'refresh':
                //self.updateState((self.currentItem)?self.currentItem.get('_id'):null,false,false);
                Backbone.trigger('control:refresh',[this, self.currentItem]);
            break;
            case 'add-root':
                $(self.el).trigger('itemAdd', [self.currentItem]);
            break;
            case 'copy':
                Backbone.trigger('control:copy',[this,self.selectedItem]);
            break;
            case 'link':
                Backbone.trigger('control:link',[this,self.selectedItem]);
            break;
            case 'go-to-link':
                // переход по ссылке
                $(self.el).trigger('goToLink', [self.selectedItem,e.shiftKey]);
            break;
            case 'move':
                Backbone.trigger('control:move',[this,self.selectedItem]);
            break;
            case 'exit-search':
                self.updateState((self.currentItem)?self.currentItem.get('_id'):null,true,true);
            break;
            case 'tree-refresh':
                //self.updateState((self.currentItem)?self.currentItem.get('_id'):null,false,false);
                Backbone.trigger('control:refresh',[this, self.currentItem]);
            break;
            case 'tree-remove':
                // свойство на покупное изделие с дерева удалить нельзя
                if(self.selectedItem['datalink'] == App.SystemObjects['items']['BUY_PROP'])
                {
                    $.jGrowl('Нельзя удалить данное свойство.', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                    return false;
                }
                var msg = "Вы уверены, что хотите удалить элемент?";
                bootbox.confirm(msg, function(result){
                    if(result)
                    {
                        $(self.treeView.el).trigger("treeItemRemove",[self.selectedItem]);
                    }
                });
            break;
            case 'tree-specificate':
               Backbone.trigger('control:specificate', [this,self.currentItem]);
            break;
            case 'tree-graph':
               Backbone.trigger('control:open-graph', [this,self.currentItem]);
            break;
            case 'create-product':
                Backbone.trigger('control:createProduct',[this,self.selectedItem]);
            break;
            case 'create-by-template':
                // создание объекта по шаблону
                Backbone.trigger('control:createByTemplate',[this,self.selectedItem]);
            break;
            case 'open-complect':
               Backbone.trigger('control:complect', [this,(self.selectedItem)?self.selectedItem:self.currentItem]);
            break;
        }
    },

    /**
     *  Проверка нажатой клавиши в поле поиска
    **/
    pressSearchKey: function(e)
    {
        if(e.keyCode==13)
            this.onSearch();
    },

    /**
     * Обработка кнопки поиска
    **/
    onSearch: function(){
        if(this.$('.tb-search').val())
        {
            //this.enterMode(this.modes.search);
            this.doSearch(this.$('.tb-search').val(),true,true);
        }
        else
            $.jGrowl('Не заданы условия поиска ', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
    },

    /**
     * Событие на выделение элемента данных
    **/
    itemSelect: function(event, model, status)
    {
         if(status)
         {
            this.selectedItem = model;
            this.activateControlPanel(this.currentItem, this.selectedItem);
        }
        else{
            this.selectedItem = null;
            this.activateControlPanel(this.currentItem, null);
        }
    },

    /**
     * Событие на удаление элемента
    **/
    itemRemove: function(event, model)
    {
        var self = this;
        var row = $(event.target);
        var elem = model;
        AppLoader.show();

        // проверить на наличие ссылок, на удаляемый элемент и его детей
        // если ссылки будут найдены, то необходимо предупредить пользователя об этом
        // также если есть дети системные, то об этом тоже нужно предупредить
        $.ajax({
                    type: "GET",
                    url: "/handlers/esud/is_can_delete",
                    data: {'elem_id':elem.get("_id")},
                    timeout: 55000,
                    contentType: 'application/json',
                    dataType: 'json',
                    async:true
                    }).done(function(result) {
                           if(result['status']=="error")
                               $.jGrowl(result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 10000 });
                           else
                           {
                                var links = result.result['links'];
                                var system_childs = result.result['system_childs'];
                                var msg = "";

                                // Проверка на наличие внутри объекта, системных объектов ID которых жестко заданы в коде.
                                // Такие объекты удалить нельзя
                                if(system_childs.length>0)
                                    for(var i in system_childs)
                                        if(App.SystemObjectsIDS.indexOf(system_childs[i]['_id']) >-1)
                                        {
                                            $.jGrowl('Удаляемый объект содержит системные объекты, удаление которых запрещено.', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                                            return;
                                        }

                                if(links.length>0&&system_childs.length>0)
                                    msg = "На удаляемый объект имеются ссылки, все они будут удалены. Также удаляемый объект содержит системные объекты, все они будут удалены. Продолжить удаление?";
                                else if(links.length>0)
                                    msg = "На удаляемый объект имеются ссылки, все они будут удалены. Продолжить удаление?";
                                else if(system_childs.length>0)
                                    msg = "Удаляемый объект содержит системные объекты, все они будут удалены. Продолжить удаление?";

                                // если есть ссылки на удаляемый элемент или его детей, предупреждаем об этом пользователя
                                if(msg!="")
                                {
                                    bootbox.confirm(msg,
                                        function(result){
                                            if(result)
                                            {
                                                AppLoader.show();
                                                elem.destroy({
                                                    success:function()
                                                    {
                                                        elem.set('status','del');
                                                        // удаляем все линки на удаляемый элемент
                                                        if(links.length>0)
                                                        {
                                                            var linked_items = [];
                                                            for(var i in links)
                                                                linked_items.push(links[i]['_id']);
                                                            links = self.collection.filter(function(el){
                                                                return el.get("datalink")==elem.get("_id") || linked_items.indexOf(el.get('_id'))>-1;
                                                            });
                                                            links.forEach(function(el){el.set('status','del');});
                                                        }
                                                    },
                                                    error:function(){}
                                                }).always(function() {AppLoader.hide();});
                                            }
                                    });
                                }
                                else
                                {
                                    AppLoader.show();
                                    elem.destroy({
                                        success:function(){
                                        // self.collection.remove(elem);
                                        elem.set('status','del');
                                        // удаляем все линки завязаныне на удаляемый элемент
                                        var links = self.collection.filter(function(el){
                                            return el.get("datalink")==elem.get("_id");
                                        });
                                        links.forEach(function(el){el.set('status','del');});
                                    },
                                    error:function(){}
                                    }).always(function() {AppLoader.hide();});
                                }
                            }
                }).always(function(){AppLoader.hide();});
    },

     /**
     * Событие на доабвление нового элемента
    **/
    itemAdd: function(event, model)
    {
        var self = this;
        var parent_elem = model;
        var parent_type = ((parent_elem)?parent_elem.get('type'):'');
        var parent_id = ((parent_elem)?parent_elem.get('_id'):null);

         // в ярлыки на свойства покупных изделий нчиего нельзя вкладывать
        if(parent_elem && parent_elem.get('datalink') ==  App.SystemObjects['items']['BUY_PROP'])
        {
            $.jGrowl('В ярлык на свойство покупного изделия нельзя добавлять объекты', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
            return;
        }

        var dlg = new App.Views.editElementDlg({'parent_elem_id':parent_id});
        dlg.on("dialogsave",function(){
            AppLoader.show();
            // получение минимального Routine
            var tmp_collection = self.collection.where({'parent_id': ((parent_elem)?parent_elem.get('_id'):null)})

            // если родительский элемент = "свойство", то в нем не может быть двух открытых значений
            if(dlg.$el.find(".type").val()=='value' && dlg.$el.find(".cb-open-value").prop('checked'))
            {
                var hasUnit =false;
                tmp_collection.forEach(function(el){
                    if(el.get('type')=='value' && el.get('open_value'))
                    {
                        hasUnit = true;
                        return;
                    }
                });
                if(hasUnit)
                {
                    $.jGrowl('В данном свойстве уже есть открытое значение.', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                    AppLoader.hide();
                    return;
                }
            }

            var minRoutine = 1;
            tmp_collection.forEach(function(el){
                if(el.get('routine')<minRoutine)
                    minRoutine = el.get('routine');
            });

            var new_elem = new App.Models.ItemModel({
                  name:dlg.$el.find(".name").val(),
                  alias:dlg.$el.find(".alias").val() || "",
                  type:dlg.$el.find(".type").val(),
                  note:dlg.$el.find(".note").val(),
                  parent_id: ((parent_elem)?parent_elem.get('_id'):null),
                  path:  ((parent_elem)?((parent_elem.get("path")?(parent_elem.get("path")+"-"):"")+parent_elem.get("_id")):""),
                  routine: minRoutine-1,
                  open_value:dlg.$el.find(".cb-open-value").prop('checked')
            });

            if(new_elem.get('type')=='product')
                new_elem.set({is_model: dlg.$el.find(".is-model").is(':checked') });

            new_elem.save(new_elem.toJSON(),{
                  success:function(){
                      // добавление элемента в коллекцию
                      self.collection.add(new_elem);
                      Backbone.trigger('control:refreshDataCollection',[self.currentItem]);
                      Backbone.trigger('control:refreshDataView',[self.currentItem]);
                      App.CheckOnSystem(new_elem.get('_id'));
                  },
                  error:function(model,response){
                        var err = JSON.parse(response.responseText);
                        $.jGrowl(err.error, { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                  },
              }).always(function() {AppLoader.hide();});
        },self);

    },

    /**
     * Событие на редактирование элемента
    **/
    itemEdit: function(event, model)
    {
        var self = this;

        var dlg = new App.Views.editElementDlg({model:model.toJSON()});
        dlg.on("dialogsave",function(){
            AppLoader.show();

            // если родительский элемент = "свойство", то в нем не может быть двух открытых значений
            if(dlg.$el.find(".type").val()=='value' && dlg.$el.find(".cb-open-value").prop('checked'))
            {
                // получение минимального Routine
                var tmp_collection = self.collection.where({'parent_id': ((model.get('parent_id'))?model.get('parent_id'):null)})
                var hasUnit =false;
                tmp_collection.forEach(function(el){
                    if(el.get('type')=='value' && el.get('open_value') && el.get('_id')!=model.get("_id"))
                    {
                        hasUnit = true;
                        return;
                    }
                });
                if(hasUnit)
                {
                    $.jGrowl('В данном свойстве уже есть открытое значение.', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                    AppLoader.hide();
                    return;
                }
            }

            model.set({
                name:dlg.$el.find(".name").val(),
                type:dlg.$el.find(".type").val(),
                alias:dlg.$el.find(".alias").val() || "",
                note:dlg.$el.find(".note").val(),
                open_value:dlg.$el.find(".cb-open-value").prop('checked')
            });

            model.save(model.toJSON(),{
                success:function(){
                    //$(self.el).trigger('itemEdit', [self.model]);
                    // обновить элемент
                    var links = self.collection.filter(function(el){
                        return el.get("datalink")==model.get("_id");
                    });
                    links.forEach(function(el){
                       if(!el.get('alias') || el.get('alias')==el.get('name'))
                           el.set({
                                name:model.get('name'),
                                alias:model.get('alias'),
                                type:model.get('type'),
                                note:model.get('note')
                            });
                        else
                            el.set({
                                alias:model.get('name'),
                                type:model.get('type'),
                                note:model.get('note')
                            });
                    });
                },
                error:function(){},
            }).always(function() {AppLoader.hide();});
        },self);
    },

    /**
     * Событие перемещения папки
    **/
    itemMove: function(event, model)
    {
        Backbone.trigger('control:move',[this,model]);
    },

     /**
     * Обработка клика на командер
    **/
    onHighLightElem: function(sender,elem_id, in_near_window)
    {
        Backbone.trigger('control:highlightElem',[this, elem_id, in_near_window]);
        //Backbone.trigger('saveUrlHistory',[self]);
    },
    /**
    *   Обработка глобального события подсветки элемента
    **/
    onGlobalHighlightElem:function(e){
        var sender = e[0];
        var elem_id = e[1];
        var in_near_window = e[2];
        this.highlightElem = null;
        if((sender==this && !in_near_window)|| (sender!=this && in_near_window))
        {
            this.highlightElem = elem_id;
        }
    },

    /**
    *   Обработка глобального события подсветки элемента
    **/
    doHighlightElem:function(elem_id){
        Backbone.trigger('saveUrlHistory',[this]);
        if(this.currentMode == this.modes.base)
            this.dirrectoryView.highlightElem(elem_id);
        else
            this.treeView.highlightElem(elem_id);

        /*var sender = e[0];
        var elem_id = e[1];
        var in_near_window = e[2];

        if((sender==this && !in_near_window)|| (sender!=this && in_near_window))
        {
            this.highlightElem = elem_id;
            Backbone.trigger('saveUrlHistory',[this]);
            if(this.currentMode == this.modes.base)
                this.dirrectoryView.highlightElem(elem_id);
            else
                this.treeView.highlightElem(elem_id);
        }*/
    },

    /**
     * Обработка клика на командер
    **/
    onActivate: function(e)
    {
        this.isActive = true;
        Backbone.trigger('control:activate',[this]);
        Backbone.trigger('saveUrlHistory',[self]);
    },
    /**
     * Обработка глобального события активации командера
    **/
    onGlobalActivate: function(e)
    {
        var sender = e[0];
        if(sender!=this){
            this.$el.find('.commander-box').removeClass('active');
            this.isActive = false;
        }
        else
        {
            this.$el.find('.commander-box').addClass('active');
            this.isActive = true;
        }
    },

    /**
     * Обработка клика на равзорачивание командера на весь экран
    **/
    onExpand: function(e)
    {
        var self = this;
        var btn = $(e.currentTarget);
        if($(btn).data('val')=='expand')
        {
            //$(btn).data('val','collapse').removeClass('active').attr('title','Свернуть окно').find('i').removeClass('fa-expand').addClass('fa-compress');
            this.isExpand = true;
        }
        else
        {
            //$(btn).data('val','expand').removeClass('active').attr('title','Расскрыть окно').find('i').addClass('fa-expand').removeClass('fa-compress');
            this.isExpand = false;
        }

        Backbone.trigger('control:expand',[self ,'slow']);
        Backbone.trigger('saveUrlHistory',[self]);
    },
    /**
     * Обработка глобального события разворачивания командера на весь экран
    **/
    onGlobalExpand: function(e)
    {
        var sender = e[0];
        var speed = (e[1]=="slow")?400:10;
        var direction = 'left';
        if(sender.$el.attr("id") == "commander1")
            direction = "right";
        if(sender!=this)
        {
            this.isExpand=false;
            if (sender.isExpand)
                this.$el.hide("drop", { direction: direction }, speed);
            else
                this.$el.show("drop", { direction: direction }, speed);
        }
        else
        {
            if(this.isExpand)
                this.$el.find('.expand-root').data('val','collapse').removeClass('active').attr('title','Свернуть окно').find('i').removeClass('fa-expand').addClass('fa-compress');
            else
                this.$el.find('.expand-root').data('val','expand').removeClass('active').attr('title','Расскрыть окно').find('i').addClass('fa-expand').removeClass('fa-compress');
        }
    },

    /**
     * Обработка клика на кнопку сортировки
    **/
    onSort: function(e)
    {
        var self = this;
        var btn = $(e.currentTarget);
        if($(btn).data('val')=='unsort')
            this.isSort = true;
        else
            this.isSort = false;
        Backbone.trigger('control:sort',[self]);
        Backbone.trigger('saveUrlHistory',[self]);
    },

      /**
     * Обработка глобального события сортировки данных внутри командера
    **/
    onGlobalSort: function(e)
    {
        var sender = e[0];
        if(sender == this)
        {
            if(this.isSort)
                this.$el.find('.sort-root').data('val','sort').addClass('active');
            else
                this.$el.find('.sort-root').data('val','unsort').removeClass('active');
            // проброс события для представлений отображения списка объектов
            $(this.dirrectoryView.el).trigger('doSort',[this.isSort]);
            $(this.treeView.el).trigger('doSort',[this.isSort]);
        }
    },

    /**
     * Обработка глобального события перехода по ссылке
     * открывает содержимое ссылки в соседнем окне
    **/
    onGlobalGoToLink: function(e)
    {
        var sender = e[0];
        var model = e[1];
        var open_in_near_window = e[2];
        if((open_in_near_window && sender!=this) || (!open_in_near_window && sender==this))
            this.updateState((model)?model.get('datalink'):null,true,true);
    },
    /**
     * Событие перехода по ссылке
    **/
    goToLink: function(event, model, open_in_near_window)
    {
        // генерирование глобального события перехода по ссылке
        Backbone.trigger('control:gotolink',[this,model,open_in_near_window]);
    },

    /**
     * Событие на клик по элементу данных
    **/
    itemClick: function(event, model, by_link)
    {
        //this.updateState((model)?((by_link)?model.get('datalink'):model.get('_id')):null,true,true);
        console.log('click item not available');
    },

    /**
    *   глобаное событие на открытие элемента в любом окне
    **/
    onGlobalSelectItem:function(e){
        var sender = e[0];
        if(sender!=this){
            this.neighborCurrentItem = e[1];
            this.dirrectoryView.neighborCurrentItem = e[1];

            $(this.dirrectoryView.el).trigger('itemSelect',[null, true]);
            $(this.treeView.el).trigger('itemSelect',[null]);
        }
    },

    /**
    *   глобаное событие на обновление данных в окне проводника
    **/
    onGlobalRefresh:function(e){
        var sender = e[0];
        if(sender==this)
            this.updateState((this.currentItem)?this.currentItem.get('_id'):null,false,false);
    },

    /**
     *   глобаное событие отката истории объекта и обновление данных в окне проводника
    **/
    onGlobalUndo:function(e){
        var sender = e[0];
        if(sender==this)
            this.undoState((this.currentItem)?this.currentItem.get('_id'):null);
    },

     /**
     *   глобаное событие возврата истории объекта и обновление данных в окне проводника
    **/
    onGlobalRedo:function(e){
        var sender = e[0];
        if(sender==this)
            this.redoState((this.currentItem)?this.currentItem.get('_id'):null);
    },

    /**
    *   глобаное событие на обновление строки информации об объекте
    **/
    onGlobalRefreshPanelItemInfo:function(e){
        var model = e[0];
        if(this.currentItem == model)
        {
            this.$('.cur-item-info-box').html(this.templates.infopanel_item((this.currentItem)?this.currentItem.toJSON():null));
            this.breadCrumpsView.render(this.currentItem);
        }
    },

    /**
     * Обработка глобального события перехода к элементу
     * открывает содержимое ссылки в соседнем окне
    **/
    onOpenItem: function(e)
    {
        var sender = e[0];
        var model = e[1];
        var open_in_near_window = e[2];
        if((open_in_near_window && sender!=this) || (!open_in_near_window && sender==this))
            this.updateState((model)?model.get('_id'):null,true,true);
    },
    /**
     * Открыть в соседнем окне. Call onOpenItem
    **/
    openItem: function(event, model, open_in_near_window)
    {
        // генерирование глобального события открытия объекта
        Backbone.trigger('control:openItem',[this,model,open_in_near_window]);
    },

    /**
     * Открыть дерево ЭСУД(Сделанное отдельной страницей) в новом окне браузера
    **/
    openTree: function(event, model)
    {
             //this.updateState((model)?model.get('datalink'):null,true,true);
             window.open('/esudtree#' + model.get('_id'));
    },

    /**
     * Открыть граф ЭСУД(Сделанное отдельной страницей) в новом окне браузера
    **/
    openGraph: function(event, model)
    {
             //window.open('/esudtreegraph#root=' + model.get('_id'));
             Backbone.trigger('control:open-graph',[this,model]);
    },

    /**
     * Открыть страницу расчета данных по изделию
    **/
    openCalculation: function(event, model)
    {
             window.open('/esud/calculation/' + model.get('_id'));
    },

    /**
     * Открыть страницу расчета спецификаций
    **/
    openSpecification: function(event, model)
    {
             //window.open('/esud/specification/' + model.get('_id'));
             Backbone.trigger('control:specificate',[this,model]);
    },

    /**
     * Открыть страницу комплектации
    **/
    openComplect: function(event, model)
    {
             Backbone.trigger('control:complect',[this,model]);
    },

     /**
     * Событие создания ссылки на элемент
    **/
    itemLink: function(event, model)
    {
        Backbone.trigger('control:link',[this,model]);
    },

    /**
     * Событие копирования элемента
    **/
    itemCopy: function(event, model)
    {
        Backbone.trigger('control:copy',[this,model]);
    },

    /**
     * Событие создания изделия
    **/
    itemCreateProduct: function(event, model)
    {
        Backbone.trigger('control:createProduct',[this,model]);
    },

    /**
     * Событие создания объекта по шаблону
    **/
    itemCreateByTemplate: function(event, model)
    {
        Backbone.trigger('control:createByTemplate',[this,model]);
    },

    /**
     * Событие переопределения объекта
    **/
    itemRedefine: function(event, model)
    {
        Backbone.trigger('control:redefine',[this,model]);
    },

    /**
     * Обработка события вызванного панелью навигации(элемент навигации)
    **/
    navigateItemClick: function(event, item_id, by_link)
    {
         var model = ((item_id)?this.collection.get(item_id):null);
         Backbone.trigger('control:openItem',[this,model,false]);
    },

    /**
     ** Обновление панели хлебных крошек
    **/
    updateBreadCrumpsView: function()
    {
        this.breadCrumpsView.render(this.currentItem);
    },

    /**
     * Обработка локального события обновления проводника + вызов глобаьного события отката по истории
     * model - объект пришедший с событием, чью историю нужно откатить на шаг назад
    **/
    undo: function(event, model)
    {
         Backbone.trigger('control:undo',[this, model]);
    },

    /**
     * Обработка локального события обновления проводника + вызов глобаьного события возврата шага в истории
     * model - объект пришедший с событием, чью историю нужно откатить на шаг назад
    **/
    redo: function(event, model)
    {
         Backbone.trigger('control:redo',[this, model]);
    },

    /**
     * Обработка события вызванного из панели результата поиска
    **/
    searchItemClick: function(event, model, by_link)
    {
        var item_id = ((model)?((by_link)?model.get('datalink'):model.get('_id')):null);
        //model = ((item_id)?this.collection.get(item_id):null);
        Backbone.trigger('control:openItem',[this,model,false]);
    },

    /**
     * Обработка события вызванного панелью навигации
    **/
    exitSearchClick: function(event, model)
    {
        Backbone.trigger('control:openItem',[this,this.currentItem,false]);
    },

    /**
     * Активацие кнопок на панели управления
    **/
    activateControlPanel: function(currentItem, selectedItem)
    {
        function renderPanel(menu, to_show){
            menu.find(".item-btn").prop('disabled',true);
            for(var i in  to_show)
                menu.find("." + to_show[i]).prop('disabled',false);
        }

        // если текущий объект это изделие, то для его вложенностей своя панель управления
        if(currentItem && currentItem.get('type')=='product')
        {
            if(selectedItem)
                this.$('.tree-control-panel').find('.tree-remove').prop('disabled',false);
            else
                this.$('.tree-control-panel').find('.tree-remove').prop('disabled',true);
        }
        else
        {
           if(selectedItem)
           {
               /*if(selectedItem.get('status')=='del')
                    renderPanel(this.$('.usual-control-panel'),App.CPOperations(selectedItem.get('type'),(selectedIteml.has('datalink') && selectedItem.get('datalink')), (this.neighborCurrentItem)?this.neighborCurrentItem.get('type'):''));
               else*/
                renderPanel(this.$('.usual-control-panel'),App.CPOperations(selectedItem,(selectedItem.has('datalink') && selectedItem.get('datalink')), this.neighborCurrentItem,currentItem));
            }
            else
                renderPanel(this.$('.usual-control-panel'), []);

            // проверка для текущего выбранного элемента(тот в кого вошли)
            if(currentItem)
                this.$('.usual-control-panel').find('.add-root').prop('disabled', !(App.CPOperations(currentItem,false, null,null).indexOf('add')>-1));
        }
    },

    /**
     * Выполнение поиска
    **/
    doSearch: function(query, need_change_url, need_save_history)
    {
        var self = this;
        if(this.lastSearchQuery!=query)
        {
            need_change_url = typeof need_change_url !== 'undefined' ? need_change_url : true;
            need_save_history = typeof need_save_history !== 'undefined' ? need_save_history : true;
            this.lastSearchQuery = query;
            // показать прелоадер
            AppLoader.show();
            // получить данные по текущим условиям
            var dataCollection = new App.Collections.searchItemsCollection();
            self.searchView.render(dataCollection);
            dataCollection.fetch({
                //async:false,
                reset:true,
                data: {query: query},
                success:function() {
                    // занесение события в историю
                    if(need_save_history)
                        self.addToHistory();
                    self.enterMode(self.modes.search);
                    self.searchView.render(dataCollection);
                    if(need_change_url)
                        Backbone.trigger('saveUrlHistory',[self]);

                    // Обновление строки информации об объекте
                    self.$('.cur-item-info-box').empty();
                },
                error: function(response, options){}
            }).always(function() {AppLoader.hide();});
        }
    },

    /**
    ** Откат состояния из исории объекта
    ** Доступно толкьо для изделий
    **/
    undoState: function(item_id){
        var self = this;
        self.currentItem = self.collection.get(item_id);
        if(self.currentItem.get('history') && self.currentItem.get('history').length>0)
        {
            AppLoader.show();
            // грузим дерево для изделия
            $.ajax({
                type: "GET",
                url: "/handlers/esud/undo_history_state/"+item_id,
                timeout: 55000,
                contentType: 'application/json',
                dataType: 'json',
                async:true
                }).done(function(result) {
                    if(result['status']=="error")
                        $.jGrowl('Ошибка выполнения операции. Подробности: ' + result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                    else
                    {
                        self.currentItem.set('history', result.data['history']);
                        self.currentItem.set('properties', result.data['properties']);
                        self.treeView.treeData['node']['properties'] = result.data['properties'];

                        //self.treeView.treeData['node']['properties'] = self.currentItem.get('history').pop()['data'];
                        self.treeView.currentItem = self.currentItem;
                        self.treeView.render();
                        self.breadCrumpsView.render(self.currentItem);
                    }
            }).always(function(){AppLoader.hide();});
        }
    },

    /**
    ** Возврат состояния из исории объекта
    ** Доступно толкьо для изделий
    **/
    redoState: function(item_id){
        var self = this;
        self.currentItem = self.collection.get(item_id);
        //self.treeView.treeData = result;
        if(self.currentItem.get('history') && self.currentItem.get('history').length>0)
        {

            AppLoader.show();
            // грузим дерево для изделия
            $.ajax({
                type: "GET",
                url: "/handlers/esud/redo_history_state/"+item_id,
                timeout: 55000,
                contentType: 'application/json',
                dataType: 'json',
                async:true
                }).done(function(result) {
                    if(result['status']=="error")
                        $.jGrowl('Ошибка выполнения операции. Подробности: ' + result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                    else
                    {
                        self.currentItem.set('history', result.data['history']);
                        self.currentItem.set('properties', result.data['properties']);
                        self.treeView.treeData['node']['properties'] = result.data['properties'];
                        //self.treeView.treeData['node']['properties'] = self.currentItem.get('history').pop()['data'];
                        self.treeView.currentItem = self.currentItem;
                        self.treeView.render();
                        self.breadCrumpsView.render(self.currentItem);
                    }
            }).always(function(){AppLoader.hide();});
        }
    },

    /**
     * Обновление состояния командера(переход к указанному идентификатору объекта)
     * вызывается для вида проводника
    **/
    updateState: function(item_id, need_change_url, need_save_history)
    {
        var self = this;
        // флаг необходимости смены URL
        need_change_url = typeof need_change_url !== 'undefined' ? need_change_url : true;
        // Флаг необходимости добавления события в ситорию командера
        need_save_history = typeof need_save_history !== 'undefined' ? need_save_history : true;
        // показать прелоадер
        AppLoader.show();
        var tmpCollection = new App.Collections.ItemsCollection();
        // сначала грузится вся ветка
        tmpCollection.fetch({
            //async:false,
            data: {id: item_id},
            success:function() {
                self.lastSearchQuery = "";
                // занесение события в историю
                if(need_save_history)
                    self.addToHistory();
                // соединение данных, пришедших с сервера с текущей коллекцией
                self.collection.add(tmpCollection.models,{merge:true});
                self.currentItem = self.collection.get(item_id);
                self.dirrectoryView.currentItem = self.currentItem;
                // вызов тригера для пометки текущего элемента в соседнем окне
                Backbone.trigger('global:selectItem',[self,self.currentItem]);
                // если изделие, то строим дерево
                if(self.currentItem && !self.currentItem.get('datalink') && self.currentItem.get('type')=='product'){
                    AppLoader.show();
                    // грузим дерево для изделия
                    $.ajax({
                        type: "GET",
                        url: "/handlers/esud/get_full_tree/"+self.currentItem.get("_id"),
                        timeout: 55000,
                        contentType: 'application/json',
                        dataType: 'json',
                        async:true
                        }).done(function(result) {
                            AppLoader.hide();
                            if(result['status']=="error")
                                $.jGrowl('Ошибка выполнения операции. Подробности: ' + result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                            else
                            {
                                self.enterMode(self.modes.tree);
                                //self.dirrectoryView.currentItem = self.currentItem;
                                self.treeView.currentItem = self.currentItem;
                                self.treeView.treeData = result;
                                self.treeView.render();
                                self.breadCrumpsView.render(self.currentItem);
                                $(self.dirrectoryView.el).trigger('itemSelect',[null]);
                                $(self.treeView.el).trigger('itemSelect',[null]);
                                if(need_change_url)
                                    Backbone.trigger('saveUrlHistory',[self]);
                                // Обновление строки информации об объекте
                                self.$('.cur-item-info-box').html(self.templates.infopanel_item((self.currentItem)?self.currentItem.toJSON():null));
                                // подсветить элемент, если задан
                                self.doHighlightElem(self.highlightElem);
                            }
                    }).always(function(){AppLoader.hide();});
                }
                else{
                    // вызов тригера обновления данных в проводниках
                    Backbone.trigger('control:refreshDataCollection',[self.currentItem]);
                    Backbone.trigger('control:refreshDataView',[self.currentItem]);
                    self.enterMode(self.modes.base);
                    self.breadCrumpsView.render(self.currentItem);
                    $(self.dirrectoryView.el).trigger('itemSelect',[null]);
                    $(self.treeView.el).trigger('itemSelect',[null]);
                    if(need_change_url)
                        Backbone.trigger('saveUrlHistory',[self]);
                    // Обновление строки информации об объекте
                    self.$('.cur-item-info-box').html(self.templates.infopanel_item((self.currentItem)?self.currentItem.toJSON():null));
                    AppLoader.hide();
                    // подсветить элемент, если задан
                    self.doHighlightElem(self.highlightElem);
                }
            },
            error: function(response, options){
                AppLoader.hide();
                showmsg("Ошибка сервера");
            }
        })
    },

    /**
     *  Получение максимальной позиции +1 элемента в рамках текущего родителя
    **/
    getNextRoutine:function(){
        var routine = 0;
        var tmp_collection = this.collection.where({'parent_id': ((this.currentItem)?this.currentItem.get('_id'):null)});
        if(tmp_collection.length)
        {
            routine = tmp_collection[0].get('routine');
            tmp_collection.forEach(function(el){
                if(routine<el.get('routine'))
                    routine = el.get('routine');
            });
            routine+=1;
        }
        return routine;
    },

    /**
     * Создание нового изделия на базе модели
    **/
    onGlobalCreateProduct:function(e){
        var sender = e[0];
        if(sender!=this){
            var self = this;
            var elem = e[1].clone();
            AppLoader.show();
            $.ajax({
                type: "PUT",
                url: "/handlers/esud/create_product/"+(self.currentItem?self.currentItem.get("_id"):'0'),
                data: JSON.stringify(elem),
                timeout: 55000,
                contentType: 'application/json',
                dataType: 'json',
                async:true
             }).done(function(result) {
                    if(result['status']=="error")
                        $.jGrowl('Ошибка выполнения операции. Подробности: ' + result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                    else
                    {
                        var data = result['data'];
                        // мержинг  новых данных в коллекцию
                        var tmpCollection = new App.Collections.ItemsCollection(data);
                        self.collection.add(tmpCollection.models,{merge:true});
                        tmpCollection.forEach(function(el){
                                App.CheckOnSystem(el.get('_id'));
                        });
                        Backbone.trigger('control:refreshDataCollection',[self.currentItem]);
                        Backbone.trigger('control:refreshDataView',[self.currentItem]);

                        // переход в созданное изделие
                        var cur_url = window.location.hash.replace('#','');
                        if(self.currentItem)
                            cur_url = cur_url.replace(self.currentItem.get("_id").toString(), data[0]['_id'].toString());
                        else
                            cur_url = cur_url.replace('__go__&', '__go__'+data[0]['_id'].toString()+'&');
                        App.doQuery(cur_url);
                    }
             }).error(function(){
                        $.jGrowl('Ошибка создания изделия. Повторите попытку. ', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
             }).always(function(){AppLoader.hide();});
        }
    },


     /**
     * Переопределение пседо ярлыка
    **/
    onGlobalRedefine:function(e){
        var sender = e[0];
        if(sender==this)
        {
            var self = this;
            var elem = e[1].clone();
            AppLoader.show();
            $.ajax({
                type: "PUT",
                url: "/handlers/esud/redefine_object/"+(self.currentItem?self.currentItem.get("_id"):'0'),
                data: JSON.stringify({'elem': elem}),
                timeout: 55000,
                contentType: 'application/json',
                dataType: 'json',
                async:true
             }).done(function(result) {
                    if(result['status']=="error")
                        $.jGrowl('Ошибка выполнения операции. Подробности: ' + result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                    else
                    {
                        var data = result['data'];
                        // мержинг  новых данных в коллекцию
                        var tmpCollection = new App.Collections.ItemsCollection(data);
                        self.collection.add(tmpCollection.models,{merge:true});
                        tmpCollection.forEach(function(el){
                                App.CheckOnSystem(el.get('_id'));
                        });
                        Backbone.trigger('control:refreshDataCollection',[self.currentItem]);
                        Backbone.trigger('control:refreshDataView',[self.currentItem]);
                    }
             }).error(function(){
                        $.jGrowl('Ошибка выполнения операции. Повторите попытку. ', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
             }).always(function(){AppLoader.hide();});

        }
    },

     /**
     * Создание нового объекта по шаблону
    **/
    onGlobalCreateByTemplate:function(e){
        var sender = e[0];
        if(sender!=this)
        {
            var self = this;
            var elem = e[1].clone();
            var parent_id = (self.currentItem?self.currentItem.get("_id"):null);

            switch(elem.get('_id'))
            {
                case App.SystemObjects['items']['TECH_PROCESS_TEMPLATE']:
                    // если создание нового тех .процесса
                    var dlg = new App.Views.editElementDlg({'parent_elem_id':parent_id, 'type': 'process' });
                    dlg.on("dialogsave",function(){
                        var new_object_name = dlg.$el.find(".name").val();
                        var new_object_note = dlg.$el.find(".note").val();
                        if(!new_object_name)
                        {
                            $.jGrowl('Не задано название для нового объекта объект.', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                            return;
                        }
                        AppLoader.show();
                        $.ajax({
                            type: "PUT",
                            url: "/handlers/esud/create_object_by_template/"+(self.currentItem?self.currentItem.get("_id"):'0'),
                            data: JSON.stringify({'template_elem': elem, 'new_object_name': new_object_name, 'new_object_type': 'process', 'new_object_note': new_object_note}),
                            timeout: 55000,
                            contentType: 'application/json',
                            dataType: 'json',
                            async:true
                         }).done(function(result) {
                                if(result['status']=="error")
                                    $.jGrowl('Ошибка выполнения операции. Подробности: ' + result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                                else
                                {
                                    var data = result['data'];
                                    // мержинг  новых данных в коллекцию
                                    var tmpCollection = new App.Collections.ItemsCollection(data);
                                    self.collection.add(tmpCollection.models,{merge:true});
                                    tmpCollection.forEach(function(el){
                                            App.CheckOnSystem(el.get('_id'));
                                    });
                                    Backbone.trigger('control:refreshDataCollection',[self.currentItem]);
                                    Backbone.trigger('control:refreshDataView',[self.currentItem]);
                                    // переход в созданное изделие
                                    var cur_url = window.location.hash.replace('#','');
                                    if(self.currentItem)
                                        cur_url = cur_url.replace(self.currentItem.get("_id").toString(), data[0]['_id'].toString());
                                    else
                                        cur_url = cur_url.replace('__go__&', '__go__'+data[0]['_id'].toString()+'&');
                                    App.doQuery(cur_url);
                                }
                         }).error(function(){
                                    $.jGrowl('Ошибка создания объекта по шаблону. Повторите попытку. ', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                         }).always(function(){AppLoader.hide();});
                     });
                break;
                default:
                    $.jGrowl('Не задан шаблон, на базе которого требуется создать объект.', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                break;
            }
        }
    },

    /**
     * Копирование указанного элемента в соседнее окно
    **/
    onGlobalCopy:function(e){
        var sender = e[0];
        if(sender!=this){
            var self = this;
            var elem = e[1].clone();
            var routine = self.getNextRoutine();
            elem.set('routine',routine);

            //return;
            AppLoader.show();

            // сохранить данные
            $.ajax({
                type: "PUT",
                url: "/handlers/esud/copyelem/"+(self.currentItem?self.currentItem.get("_id"):'0'),
                data: JSON.stringify(elem),
                timeout: 55000,
                contentType: 'application/json',
                dataType: 'json',
                async:true
                }).done(function(result) {
                    if(result['status']=="error")
                        $.jGrowl('Ошибка выполнения операции. Подробности: ' + result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                    else
                    {
                        var data = result['data'];
                        // мержинг  новых данных в коллекцию
                        var tmpCollection = new App.Collections.ItemsCollection(data);
                        self.collection.add(tmpCollection.models,{merge:true});
                        tmpCollection.forEach(function(el){
                                App.CheckOnSystem(el.get('_id'));
                        });

                        Backbone.trigger('control:refreshDataCollection',[self.currentItem]);
                        Backbone.trigger('control:refreshDataView',[self.currentItem]);
                    }
                    AppLoader.hide();
            });
        }
    },

    /**
     * Создание ссылки на указанный элемент в соседнем окне
    **/
    onGlobalLink:function(e){
        var sender = e[0];
        if(sender!=this){
            var self = this;
            var copy_elem = e[1];
            var path = self.currentItem?(self.currentItem.get("path")?(self.currentItem.get("path")+'-'+self.currentItem.get("_id")):self.currentItem.get("_id")):"";
            var current_elem_id = (self.currentItem?self.currentItem.get("_id"):null);
            // создание нового элемента
            var new_elem = new App.Models.ItemModel({
                name:copy_elem.get("name"),
                type:copy_elem.get("type"),
                parent_id:(self.currentItem?self.currentItem.get("_id"):null) ,
                path: path,
                datalink:copy_elem.get("_id"),
                routine: self.getNextRoutine(),
                note:copy_elem.get("note"),
                number: copy_elem.get("number"),
            });

            AppLoader.show();
            new_elem.save(new_elem.toJSON(),{
                success:function(){
                    self.collection.add(new_elem);
                    App.CheckOnSystem(new_elem.get('_id'));
                    App.CheckOnSystem(new_elem.get('parent_id'));
                    App.CheckOnBuy(new_elem.get('parent_id'));
                    App.CheckOnBuy(new_elem.get('_id'));
                    // вызов события на обновление данных в проводнике
                    Backbone.trigger('control:refreshDataCollection',[self.currentItem]);
                    Backbone.trigger('control:refreshDataView',[self.currentItem]);
                    if(self.currentItem)
                        self.currentItem.fetch();

                    if(self.currentMode == self.modes.tree)
                    {
                        // если в изделие кинули покупную модель, то перегружаем все дерево, чтобы
                        // подгрузилось нужное свойство ярлык на покупное изделие
                        if(copy_elem.get('type')=='product_model' && copy_elem.get('is_buy'))
                        {
                            // обновление всего дерева
                            Backbone.trigger('control:refresh',[self, self.currentItem]);
                        }
                        else
                        {
                            // подгружаем ветку
                            $.ajax({
                                type: "GET",
                                url: "/handlers/esud/get_full_tree/"+new_elem.get("_id")+"/"+self.currentItem.get("_id"),
                                timeout: 55000,
                                contentType: 'application/json',
                                dataType: 'json',
                                async:true
                                }).done(function(result) {
                                    if(result['status']=="error")
                                    {
                                        $.jGrowl('Ошибка выполнения операции. Подробности: ' + result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                                    }
                                    else
                                    {
                                        self.treeView.addNode(result);
                                    }
                            }).always(function(){AppLoader.hide();});
                        }
                    }
                    else
                        AppLoader.hide();
                },
                 error:function(model,response){
                        var err = JSON.parse(response.responseText);
                        $.jGrowl(err.error, { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                        AppLoader.hide();
                  },
            });
        }
    },

    /**
     * Построение спецификации
    **/
    onGlobalSpecificate:function(e){
        var sender = e[0];
        var model = e[1];
        if(sender!=this)
            window.open('/esud/specification#' + model.get('number'));
    },

    /**
     * Построение комплекта
    **/
    onGlobalComplect:function(e){
        var sender = e[0];
        var model = e[1];
        if(sender!=this)
            window.open('/esud/complect#' + model.get('number'));
    },

    /**
     * Построение графа
    **/
    onGlobalOpenGraph:function(e){
        var sender = e[0];
        var model = e[1];
        if(sender!=this)
            window.open('/esudtreegraph#root=' + model.get('_id'));
    },

    /**
     * Перемещение элемента в соседнее окно
    **/
    onGlobalMove:function(e){
        var sender = e[0];
        if(sender!=this){
            var self = this;
            var model = e[1].clone();
            var cur_parent_path = self.currentItem?self.currentItem.get("path"):"";
            var parent_id = self.currentItem?self.currentItem.get("_id"):null;
            var cur_row_path = model.get("path")?(model.get("path")+"-" + model.get("_id")):model.get("_id");
            if(cur_parent_path.indexOf(cur_row_path)>=0 || model.get("parent_id")==parent_id)
            {
                showmsg("Невозможно переместить выделенный объект в выбранную папку");
                return;
            }
            // подмена parent_id для перенесенного элемента
            model.set('parent_id', ((self.currentItem)?self.currentItem.get('_id'):null));
            model.set("path",(((self.currentItem && self.currentItem.get("path"))?(self.currentItem.get("path")+"-"):"")+ ((self.currentItem)?self.currentItem.get("_id"):"")));
            model.set("routine",self.getNextRoutine());
            AppLoader.show();
            var mdl = e[1];
            mdl.save(model.toJSON(),{
                success:function(){
                    App.CheckOnSystem(mdl.get('_id'));
                    // пробежать по всем ярлыкам объекта и проверить их на систмность
                    var links = self.collection.where({'datalink': mdl.get('_id')});
                    links.forEach(function(el){
                        App.CheckOnSystem(el.get('_id'));
                    });

                    Backbone.trigger('control:refreshDataCollection',[self.currentItem]);
                    //Backbone.trigger('control:refreshDataView',[self.currentItem]);
                    // отрендерить список файлов в обоих командерах
                    $(sender.el).trigger('itemSelect',[null]);
                    sender.dirrectoryView.render();
                    $(self.el).trigger('itemSelect',[null]);
                    self.dirrectoryView.render();
                },
                error:function(model,response){
                        var err = JSON.parse(response.responseText);
                        $.jGrowl(err.error, { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                },
            }).always(function() {AppLoader.hide();});
        }
    },

    /**
     * Смена режима работы
    **/
    enterMode: function(val)
    {
        var self = this;
        switch(val)
        {
            case 'search':
                self.$('.usual-control-panel').hide();
                self.$('.tree-control-panel').hide();
                self.$('.usual-control-panel').hide();
                self.$('.search-control-panel').show();
                self.$('.esud-data-container').hide();
                self.$('.search-data-container').show();
                self.$('.esud-data-tree-container').hide();
                self.currentMode = val;
                self.breadCrumpsView.enterMode(val);
            break;
            case 'base':
                self.$('.usual-control-panel').show();
                self.$('.tree-control-panel').hide();
                self.$('.search-control-panel').hide();
                self.$('.esud-data-container').show();
                self.$('.search-data-container').hide();
                self.$('.esud-data-tree-container').hide();
                self.currentMode = val;
                self.breadCrumpsView.enterMode(val);
            break;
            case 'tree':
                self.$('.usual-control-panel').hide();
                self.$('.search-control-panel').hide();
                self.$('.tree-control-panel').show();
                self.$('.esud-data-container').hide();
                self.$('.search-data-container').hide();
                self.$('.esud-data-tree-container').show();

                self.currentMode = val;
                self.breadCrumpsView.enterMode(val);
            break;
            default: break;
        }
    }
});

///
/// Представление контрола хлебных крошек------------------------------------------------------------------------------------------------------------
///
App.Views.BreadCrumpsView = Backbone.View.extend({
     history: null,                                // история переходов по объектам {key:value}
     currentItem: null,
     modal_view: null,
     templates: {
            divider:_.template($("#breadCrumpDivider").html()),
            modal_view:_.template($("#modalBreadCrumbsTemplate").html()),
     },
     events:{
         'click .home-button': 'onHomeButtonClick',
         'click .back-button': 'onBackButtonClick',
         'click .level-up-button': 'onLevelUpButtonClick',
         'click .open-path-button': 'onOpenPathButtonClick',
         'click .undo-history-button': 'onUndoHistoryButtonClick',
         'click .redo-history-button': 'onRedoHistoryButtonClick',
         'click .close-search-button': 'onCloseSearchButtonClick',
         'click .open-in-near-window-button': 'onOpenInNearWindowClick',
         'click .edit-path-button': 'onEditPathButtonClick',
         'click .btn-open-path': 'onOpenPathClick',
         'keypress .tb-path-id': 'onOpenPathKeyPress'
     },

    initialize: function(){
        this.render();
        // инициализация истории
        this.history = [];
    },

    clear: function()
    {
        this.$el.find("ul.breadcrumb>li").remove();
        this.$('.breadcrumbs-modal-container').empty();
    },

    /**
    ** Отрисовка детализированного дерева  крошек
    **/
    render_detail: function(container)
    {
        if(this.currentItem && this.currentItem.get('_id'))
        {
            var currentItem = this.currentItem;
            var itemsPath = [];
            itemsPath.push(currentItem);
            var parent_id = currentItem.get('parent_id');
            var count = 0;
            while (parent_id && count<1000)
            {
                var curItem = this.collection.findWhere({'_id': parent_id});
                if(curItem)
                {
                    parent_id = curItem.get('parent_id');
                    itemsPath.push(curItem);
                }
                else
                    parent_id = "";
                ++count;
            }
            itemsPath.reverse();
            var padding = 0;
            for (var i in itemsPath)
            {
                //this.renderItem(itemsPath[i], ((currentItem && itemsPath[i].get('_id') == currentItem.get('_id'))?true:false));
                var itemView = new App.Views.BreadCrumpView({model: itemsPath[i]}).render(false).el;
                $(itemView).css({"padding-left": padding.toString()+"px"});
                $(container).append(itemView);
                padding+=20;
            }
        }
    },

    /**
    ** Отрисовка обычного вида крошек
    **/
    render: function (currentItem) {
            this.trigger("dialogclose");
            this.$('.breadcrumbs-modal-container').modal('hide');
            this.currentItem = currentItem;
            this.$el.find("ul.breadcrumb>li").remove();
            this.$('.level-up-button').prop('disabled', false).removeClass('disabled');
            this.$('.undo-history-button').prop('disabled', false).removeClass('disabled');
            this.$('.redo-history-button').prop('disabled', false).removeClass('disabled');

            if(currentItem && currentItem.get('_id'))
            {
                var itemsPath = [];
                itemsPath.push(currentItem);
                var parent_id = currentItem.get('parent_id');
                var count = 0;
                while (parent_id && count<1000)
                {
                    var curItem = this.collection.findWhere({'_id': parent_id});
                    if(curItem)
                    {
                        parent_id = curItem.get('parent_id');
                        itemsPath.push(curItem);
                    }
                    else
                        parent_id = "";
                    ++count;
                }
                itemsPath.reverse();

                if(itemsPath.length>0)
                {
                   this.$el.find(".back-button").show().prop('disabled', (this.history.length>0)?false:true)
                   this.$('.back-button').show().prop('disabled',false).removeClass('disabled');
                   if(this.history.length==0)
                        this.$('.back-button').prop('disabled', true).addClass('disabled');

                   for (var i in itemsPath)
                        this.renderItem(itemsPath[i], ((currentItem && itemsPath[i].get('_id') == currentItem.get('_id'))?true:false));
                }
                else
                    this.$('.level-up-button').prop('disabled', true).addClass('disabled');

                // если объект не изделие, то вернуться по истории нельзя
                if(currentItem.get('type')!='product' || !currentItem.get('history') || currentItem.get('history').length==0)
                {
                    this.$('.undo-history-button').prop('disabled', true).addClass('disabled');
                    this.$('.redo-history-button').prop('disabled', true).addClass('disabled');
                }

                // проставление ID в редактируемый путь
                this.$('.tb-path-id').val(currentItem.get('_id'));
            }
            else
            {
                this.$('.level-up-button').prop('disabled', true).addClass('disabled');
                this.$('.undo-history-button').prop('disabled', true).addClass('disabled');
                this.$('.redo-history-button').prop('disabled', true).addClass('disabled');
            }
        },

    renderItem: function (item, is_checked) {
            var itemView = new App.Views.BreadCrumpView({model: item});
            this.$el.find("ul.breadcrumb").append(itemView.render(is_checked).el);
            if(!is_checked)
               this.$el.find("ul.breadcrumb").append(this.templates.divider());
    },

    /**
     ** Добавление параметра в стек истории
    **/
    addToHistory:function(command, param){
        var command = {
            'command': command,
            'param': param
        };
        if(this.history.length==0 || (JSON.stringify(this.history[this.history.length-1]) != JSON.stringify(command) ))
           this.history.push(command);

       //console.log('add');
       //console.log(JSON.stringify(this.history));
    },

    /**
     * Кнопка вверх
    **/
    onLevelUpButtonClick:function()
    {
        $(this.el).trigger('navigateItemClick', [(this.currentItem)?this.currentItem.get('parent_id'):null]);
    },

    /**
     * Кнопка открытия пути
    **/
    onOpenPathButtonClick:function()
    {
        var self = this;
        this.$('.breadcrumbs-modal-container').empty();
        this.$('.breadcrumbs-modal-container').append(this.templates.modal_view());
        //  строим дерево крошек и добавляем в диалог
        this.render_detail(this.$('.breadcrumbs-modal-container').find('.breadcrumb-modal'));
        this.$('.breadcrumbs-modal-container').modal({close: function(){}});
        this.$('.breadcrumbs-modal-container').on('hidden', function () { self.trigger("dialogclose"); })
         this.$('.breadcrumbs-modal-container').append($('.modal-backdrop'));
    },

    /**
     * Кнопка отката по истории
     * Активно толкьо для изделий
    **/
    onUndoHistoryButtonClick:function()
    {
        $(this.el).trigger('undo', [this.currentItem]);
    },

    /**
     * Кнопка возврата по истории
     * Активно толкьо для изделий
    **/
    onRedoHistoryButtonClick:function()
    {
        $(this.el).trigger('redo', [this.currentItem]);
    },

    /**
     * Кнопка открытия содержимого окна в соседнем окне
    **/
    onOpenInNearWindowClick:function()
    {
        //$(this.el).trigger('navigateItemClick', [(this.currentItem)?this.currentItem.get('parent_id'):null]);
        Backbone.trigger('control:openItem',[this,this.currentItem,true]);
    },

    /**
     * Кнопка назад по истории
    **/
    onBackButtonClick:function()
    {
        if(this.history.length>0)
        {
            var lastHistoryItem = this.history.pop();
            $(this.el).trigger('onDoTask' , lastHistoryItem);
            if(this.history.length==0)
                this.$('.back-button').prop('disabled', true).addClass('disabled');

            //console.log('remove');
            //console.log(JSON.stringify(this.history));
        }
        else
            this.$('.back-button').prop('disabled', true).addClass('disabled');
    },

    /**
     * Событие клика по кнопке домой
    **/
    onHomeButtonClick:function()
    {
        $(this.el).trigger('navigateItemClick', [null]);
    },

    /**
     * Событие клика по кнопке домой
    **/
    onCloseSearchButtonClick:function()
    {
        $(this.el).trigger('exitSearchClick', [null]);
    },

     /**
     * Смена режима работы
    **/
    enterMode: function(val)
    {
        var self = this;
        switch(val)
        {
            case 'search':
                self.$('.home-button').hide();
                self.$('.back-button').hide();
                self.$('.level-up-button').hide();
                self.$('.open-in-near-window-button').hide();
                self.$('.close-search-button').show();
                self.$el.find("ul.breadcrumb>li").remove();
                self.$el.find("ul.breadcrumb").append('<li><span>Результат поиска:</span></li>');
            break;
            case 'base':
                self.$el.find("ul.breadcrumb>li").remove();
                self.$('.home-button').show();
                self.$('.level-up-button').show();
                self.$('.open-in-near-window-button').show();
                self.$('.back-button').show().prop('disabled',false).removeClass('disabled');
                if(self.history.length==0)
                    self.$('.back-button').prop('disabled', true).addClass('disabled');

                self.$('.close-search-button').hide();
            break;
            case 'tree':
                self.$el.find("ul.breadcrumb>li").remove();
                self.$('.home-button').show();
                self.$('.level-up-button').show();
                self.$('.open-in-near-window-button').show();
                self.$('.back-button').show().prop('disabled',false).removeClass('disabled');
                if(self.history.length==0)
                    self.$('.back-button').prop('disabled', true).addClass('disabled');
                self.$('.close-search-button').hide();
            break;
            default: break;
        }
    },

    /**
    ** Обработка события клика на кнопку редактирования пути
    **/
    onEditPathButtonClick: function(e){
        if(this.$('.breadcrumbs-edit-container').is(':visible'))
        {
            this.$('.breadcrumbs-edit-container').hide();
            this.$('.breadcrumbs-container').show();
        }
        else
        {
            this.$('.breadcrumbs-edit-container').show();
            this.$('.breadcrumbs-container').hide();
        }
    },

    /**
     * Кнопка открытия по ID
    **/
    onOpenPathClick:function()
    {
        $(this.el).trigger('navigateItemClick', [this.$('.tb-path-id').val()]);
        //Backbone.trigger('control:openItem',[this,this.currentItem,true]);
    },

    /**
     * Поле ввода открытия по ID
    **/
    onOpenPathKeyPress: function(e){
        if(e.keyCode==13)
            this.onOpenPathClick();
    }
});
///
/// Элемент хлебной крошки
///
App.Views.BreadCrumpView = Backbone.View.extend({
    events:{
         'click a': 'onItemClick',    // событие клика на элемент навигации
     },

    tagName: "li",
    templates: {
            item:_.template($("#breadCrumpItem").html()),
            active_item:_.template($("#breadCrumpActiveItem").html())
     },
    render: function (is_checked) {
            if(is_checked)
                this.$el.html(this.templates.active_item(this.model.toJSON())).addClass('active');
            else
                this.$el.html(this.templates.item(this.model.toJSON()));
            return this;
    },

    /**
     * Событие клика по элементу навигации
    **/
    onItemClick: function()
    {
        $(this.el).trigger('navigateItemClick', [this.model.get('_id')]);
    },
});



///---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
/// Представление вывода элементов в табличном виде------------------------------------------------------------------------------------------------------------------
///---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
App.Views.ItemsTableView = Backbone.View.extend({
    selectedItem: null, // элемент выделенный в проводнике
    currentItem: null,     //  элемент в котором сейчас находится пользователь
    neighborCurrentItem:null,        // текущий элемент в соседнем проводнике
    table: null,
    sort: false, // флаг указывающий на необходимость автоматической сортировки данных
    templates: {
            data_box:_.template($("#directoryTableTemplate").html()),
            header:_.template($("#headerTableTemplate").html()),
            header_t:_.template($("#headerTableTemplateT").html()),
     },
    events:{
         'itemSelect': 'itemSelect',
         'itemClick': 'itemClick',
         'doSort': 'doSort',
     },

    initialize: function(){
        //this.collection.bind("add", this.onAddNewItemToCollection, this);
        Backbone.on("control:refreshDataView", this.onRefreshData, this);
    },

    /**
     * События обновления данных. Отрисовка.
    **/
    onRefreshData:function(model)
    {
        if(model && model.length>0 && model[0]==this.currentItem)
            this.render();
    },

    /**
     * Событие подсветки элемента
    **/
    highlightElem:function(elem_id)
    {
        if(!elem_id)
            return;
        // подсветить элемент в дирректории
        var item_ctrl = this.$el.find("[data-id="+elem_id+"]");
        if(item_ctrl.length>0)
        {
            window.scrollTo(0,item_ctrl.offset().top);
            setTimeout(function(){
                item_ctrl.addClass("highlight");
                setTimeout(function(){item_ctrl.removeClass("highlight");},2000);
            },100);
        }
    },

    clear: function()
    {
        this.$el.find(".directory-table").remove();
    },

    render: function () {
            var self = this;
            this.$el.find(".directory-table-header").remove();
            this.$el.find(".directory-table").remove();
            // навешивание контрола таблицы
            this.$el.find('.esud-data').append(this.templates.data_box({}));
            var sort_timer = null;

            this.$el.find(".directory-table tbody").sortable({
                connectWith: ".connectedSortable, table.treetable",
                appendTo: document.body,
                helper:"clone",
                scroll:false,
                dropOnEmpty: true,
                start: function(e, ui)
                {
                    $("body").addClass("overflow-hidden");
                },
                stop: function(event, ui)
                {
                    if(sort_timer){
                        clearInterval(sort_timer);
                        sort_timer = null;
                    }
                    // Вызывается при смене позиции внутри списка
                    $("body").removeClass("overflow-hidden");
                    if(ui.item.data("is-stop")){
                        ui.item.data("is-stop",false);
                        return;
                    }
                    var row = self.collection.get(ui.item.data('id'));
                    var new_data_items = [];
                    self.$el.find(".directory-table tbody tr:not(.del)").each(function(index){
                        var item_id = $(this).data('id');
                        var item = self.collection.get(item_id);
                        item.set('routine',index);
                        new_data_items.push(item);
                    });

                    /*console.log('------------------');
                    for(var i in new_data_items)
                        console.log(new_data_items[i].get('name') + ' = ' + new_data_items[i].get('routine'));*/
                    AppLoader.show();
                   // сохранить данные
                    $.ajax({
                        type: "PUT",
                        url: "/handlers/esud/updateposition",
                        data: JSON.stringify(new_data_items),
                        timeout: 55000,
                        contentType: 'application/json',
                        dataType: 'json',
                        async:true
                        }).done(function(result) {
                            //console.log(JSON.stringify(result));
                    }).always(function(){
                        AppLoader.hide();
                    });

                    Backbone.trigger('control:refreshDataCollection',[self.currentItem]);
                    Backbone.trigger('control:refreshDataView',[self.currentItem]);
                },
                receive: function(event, ui) {
                    ui.item.data("is-stop",true);
                    // Если перетаскивание из другого окна
                    var row = self.collection.get(ui.item.data('id'));
                    var parent_elem = self.currentItem;
                    var parent_id = ((parent_elem)?parent_elem.get('_id'):null);
                    var cur_row_path = row.get("path")?(row.get("path")+"-"+ row.get("_id")):row.get("_id");
                    var cur_parent_path = parent_elem?parent_elem.get("path"):"";

                    // базовая проверка на перемещения одного объекта в другой
                    //if(parent_elem &&App.GetCanIncludeTypes(parent_elem.get('_id')).indexOf(row.get('type'))<0)
                    if(!App.CanOneObjectIncludeOtherObject(parent_elem, row))
                    {
                        $(ui.sender).sortable('cancel');
                        $.jGrowl('Нельзя поместить указанный объект в выбранную папку.', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                        return false;
                    }

                    // системное свойство "объем", нельзя перемещать в И, МИ, ИП, МИП
                    if(row.get('_id')== App.SystemObjects['items']['VOL_PROP']  && parent_elem && (parent_elem.get('type')=='product_model'  || parent_elem.get('type')=='product'))
                    {
                        $(ui.sender).sortable('cancel');
                            $.jGrowl('Нельзя поместить выбранное системное свойство в данный объект.', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                            return false;
                    }

                    // В модель изделия покупную нельзя поместить И, ИП, МИ
                    if(parent_elem && parent_elem.get('type')=='product_model' && parent_elem.get('is_buy'))
                    {
                        if((row.get('type')=='product') || (row.get('type')=='product' && !row.get('is_buy')))
                        {
                            $(ui.sender).sortable('cancel');
                            $.jGrowl('Нельзя поместить данный объект в модель покупного изделия.', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                            return false;
                        }
                    }

                    // нельзя ничего вкладывать в ярлык ссылающимся на свойство покупного изделия
                    if(parent_elem && parent_elem.get('datalink') == App.SystemObjects['items']['BUY_PROP'])
                    {
                        $(ui.sender).sortable('cancel');
                        $.jGrowl('Нельзя поместить указанный объект в выбранную папку.', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                        return false;
                    }

                    // нельзя перемещать свойство .system
                    if(row.get('_id') == App.SystemObjects['items']['SYS_PROP'])
                    {
                        $(ui.sender).sortable('cancel');
                        $.jGrowl('Данное свойство является системным. Вы не можете переместить его в другую папку.', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                        return false;
                    }

                    // нельзя переместить элемент в одного и тогоже родителя
                    if((cur_parent_path.indexOf(cur_row_path)>=0 || row.get("parent_id")==parent_id || row.get("_id")==parent_id) || (parent_elem && !App.CanOneObjectIncludeOtherObject(parent_elem, row)))
                    {
                        $(ui.sender).sortable('cancel');
                        $.jGrowl('Нельзя поместить указанный объект в выбранную папку. ', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                        return false;
                    }

                    /*// нельзя переместить шаблон, никуда, кроме библиотеки или в корень
                    if(row.get('type') == 'template')
                    {
                        if(parent_elem && (parent_elem.get('type')!='library' ||  !App.isParentsNotHasAnyTypeExceptOne(parent_elem, 'library')))
                        {
                            $(ui.sender).sortable('cancel');
                            $.jGrowl('Шаблоны можно вкладывать только в библиотеки либо в корень. ', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                            return false;
                        }
                    }*/

                    // в шаблон можно поместить только Б, О
                    if(parent_elem && (parent_elem.get('type')=='template' || App.isParentsHasType(parent_elem, 'template')))
                    {
                        if(row.get('type')!='operation' && row.get('type')!='library')
                        {
                            $(ui.sender).sortable('cancel');
                            $.jGrowl('Нельзя поместить указанный объект в выбранную папку. ', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                            return false;
                        }
                    }

                    // нельзя перемещать свойство ГРУППИРУЮЩЕЕ
                    if(row.get('_id') == App.SystemObjects['items']['TECHNO_GROUP_PROP'] || row.get('_id') == App.SystemObjects['items']['BUY_GROUP_PROP'])
                    {
                        $(ui.sender).sortable('cancel');
                        $.jGrowl('Данное свойство является системным. Вы не можете переместить его в другую папку.', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                        return false;
                    }
                    // системное свойство "ГРУППИРУЮЩЕЕ", нельзя перемещать  никуда кроме,  МИ
                    if((row.get('_id')== App.SystemObjects['items']['TECHNO_GROUP_PROP'] || row.get('_id')== App.SystemObjects['items']['BUY_GROUP_PROP'] )  && parent_elem && (parent_elem.get('type')!='product_model'))
                    {
                        $(ui.sender).sortable('cancel');
                            $.jGrowl('Нельзя поместить выбранное системное свойство в данный объект.', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                            return false;
                    }

                    // в условие можно поместить только ссылки на модели, изделия, свойства, значения
                    if(parent_elem && (parent_elem.get('type')=='condition' || App.isParentsHasType(parent_elem, 'condition')))
                    {
                        // запрет на помещение в условие не ярлыка
                        if(!row.get('datalink') ||  row.get('datalink')=="" )
                        {
                            $(ui.sender).sortable('cancel');
                            $.jGrowl('Нельзя поместить указанный объект в выбранную папку. ', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                            return false;
                        }
                    }

                    // подмена parent_id для перенесенного элемента
                    row.set('parent_id', ((parent_elem)?parent_elem.get('_id'):null));
                    row.set("path",(((parent_elem && parent_elem.get("path"))?(parent_elem.get("path")+"-"):"")+ ((parent_elem)?parent_elem.get("_id"):"")));
                    App.CheckOnSystem(row.get('_id'));

                    // сохранение изменений
                    AppLoader.show();
                    row.save(row.toJSON(),{
                        success:function(){
                            //console.log(JSON.stringify(row));
                            // пробежать по всем ярлыкам объекта и проверить их на систмность
                            var links = self.collection.where({'datalink': row.get('_id')});
                            links.forEach(function(el){
                                App.CheckOnSystem(el.get('_id'));
                            });

                            // пересортировка всех элементов списка
                            var new_data_items = [];
                            self.$el.find(".directory-table tbody tr").each(function(index){
                                var item_id = $(this).data('id');
                                var item = self.collection.get(item_id);
                                item.set('routine',index);
                                new_data_items.push(item);
                            });

                           // сохранить данные
                            $.ajax({
                                type: "PUT",
                                url: "/handlers/esud/updateposition",
                                data: JSON.stringify(new_data_items),
                                timeout: 55000,
                                contentType: 'application/json',
                                dataType: 'json',
                                async:true
                                }).done(function(result) {
                                    //console.log(JSON.stringify(result));
                            }).always(function(){AppLoader.hide();});

                        },
                        error:function(model,response){
                                var err = JSON.parse(response.responseText);
                                $.jGrowl(err.error, { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                                ui.sender.sortable("cancel");
                                AppLoader.hide();
                        },
                    }).always(function() {});
                },
                sort: function(e, ui)
                {
                    if(sort_timer){
                        clearInterval(sort_timer);
                        sort_timer = null;
                    }
                    var fnc = function(){
                        var  container = $(ui.placeholder).parents(".esud-data:first");
                        if((ui.position.top-273)>=(container.height()-50)){
                            container.scrollTo(container.scrollTop()+10);
                            if(!sort_timer)
                                sort_timer = setInterval(fnc,50);
                        }else if((ui.position.top-273)<=50){
                            container.scrollTo(container.scrollTop()-10);
                            if(!sort_timer)
                                sort_timer = setInterval(fnc,50);
                        }
                        else{
                            //console.log('clear');
                            clearInterval(sort_timer);
                            sort_timer = null;
                        }
                    }
                    fnc();
                }

            }).disableSelection();

            //this.$el.find(".directory-table tbody").sortable({cancel: 'pseudo'});

            // получение из коллекции необходимых элементов
            var tmp_collection = self.collection.where({'parent_id': ((self.currentItem)?self.currentItem.get('_id'):null)});
            // сбор ID элементов в коллекции
            var tmp_items_datalinks = {};
            for(i in tmp_collection)
                if(tmp_collection[i].get('datalink'))
                    tmp_items_datalinks[tmp_collection[i].get('datalink').toString()] = 1

            // если по ссылке данного элемента есть объекты, то их тоже отображаем
            // но только те, которые еще не переопределены, т.е ID линка из ярлыка не должен
            // содержаться среди datalink отобранных изначально элементов
            if(self.currentItem && self.currentItem.get('datalink') )
            {
                var tmp_collection_links = self.collection.where({'parent_id': self.currentItem.get('datalink')});
                if(tmp_collection_links.length>0)
                {
                    for(i in tmp_collection_links)
                    {
                        var origin_id = (tmp_collection_links[i].get('datalink') || tmp_collection_links[i].get('_id')).toString();
                        if(!(origin_id in tmp_items_datalinks))
                        {
                            //tmp_collection_links[i].set('is_pseudo_child', true);
                            tmp_collection.push(tmp_collection_links[i]);
                        }
                    }
                }
                //tmp_collection = tmp_collection.concat(tmp_collection_links);
            }

            if(self.sort)
                tmp_collection.sort(function(a,b){
                    var aname = '['+App.DecodeType(a.get('type'),a.get('is_buy')||false,a.get('is_complect')||false,a.get("is_otbor")||false)['short_type']+'] '+(a.get('number') || '')+a.get('name');
                    var bname = '['+App.DecodeType(b.get('type'),b.get('is_buy')||false,b.get('is_complect')||false,b.get("is_otbor")||false)['short_type']+'] '+(b.get('number') || '')+b.get('name');
                    if(aname>bname)
                        return 1;
                    if(aname<bname)
                        return -1;
                    return 0;
                })
            else
                // сортировка элементов по routine
                tmp_collection = tmp_collection.sort(function(a, b) {return a.get('routine') - b.get('routine')});
            // получить список типов-родителей текущего элемента
            var parent_types = App.getAllParentsTypes(self.currentItem);
            if(self.currentItem)
                parent_types.unshift(self.currentItem.get('type'));

            // добавление шапки для данных
            if(parent_types.indexOf('template')>-1)
                this.$el.prepend(this.templates.header_t({}));
            else
                this.$el.prepend(this.templates.header({}));

            // отрисовка элементов
            _.each(tmp_collection, function (item) {
                    this.renderItem(item, parent_types);
            }, this);
    },
    renderItem: function (item, parent_types) {
            var itemView = new App.Views.itemTableView({model: item, parentView:this});
            var have_childs = ((this.collection.findWhere({'parent_id': item.get('_id'), 'status': ''}))?true:false) || ((this.collection.findWhere({'parent_id': item.get('datalink'), 'status': ''}))?true:false);
            this.$el.find('.esud-data').find('tbody').append(itemView.render(have_childs, this.currentItem,parent_types).el);
    },

    /**
     * Событие на выделение элемента
    **/
    itemSelect: function(event, model, status)
    {
        if(status)
        {
            //this.table.$('tr.selected').removeClass('selected');
            this.$(".directory-table tr.selected").removeClass('selected');
            this.selectedItem = model;
        }
        else
            this.selectedItem = null;
    },

    /**
     * Событие на клик по элементу
    **/
    itemClick: function(event, model)
    {
           this.currentItem = model;
    },

    /**
     * Событие на сортировку данных
    **/
    doSort: function(event, val)
    {
        this.sort = val;
        // вызвать функцию сортировки
        this.render();
    },

    /**
     * Событие добавления нового элемента в коллекцию
    **/
    onAddNewItemToCollection:function(model)
    {
        this.render();
    }

});
///
/// Элемент табличного списка элементов
///
App.Views.itemTableView = Backbone.View.extend({
    selectedItem: null, // элемент выделенный в проводнике
    isCurrentItem: false, // флаг для отметки, что данный элемент является текущим
    isSelectedItem: false, // флаг для отметки, что данный элемент является текущим выделеным
    tagName: "tr",
    parentView: null,
    events:{
         'click td': 'onSelect',
         'click .lnk-item-name': 'onItemClick',
         //'click .link': 'onItemClick',
         'click .icon-link': 'onItemIconClick',
         'click .icon-note': 'onItemNoteClick',
         'itemSelect': 'itemSelect',
         'itemClick': 'itemClick',
         'change .tb-count': 'onCountChange',
         'keypress .tb-count': 'onInputKeyPress',
     },
    templates: {
            item:_.template($("#itemTableTemplate").html()),
            item_t:_.template($("#itemTableTemplateT").html()),
            item_c:_.template($("#itemTableTemplateC").html()),
     },

     initialize: function()
     {
        //this.model.bind("remove", this.remove, this);
        this.model.bind("change", this.change, this);
     },

     /**
     * Удаление отображения элемента
     **/
     remove: function(){
        this.$el.remove();
     },

     /**
      * Событие ввода значения в свойство
     **/
     onInputKeyPress:function(e){
         //if(e.keyCode==13)
          //   $(e.currentTarget).change();
     },

     /**
      * Событие смены значения свойства
     **/
     onCountChange:function(e){
        var count = Routine.strToFloat($(e.currentTarget).val());
        $(e.currentTarget).val(count.toString().replace('.',','));

        // получение объекта, в который запишется количество
        var save_obj = App.getFirstParentByType(this.model, 'template');
        if(save_obj)
        {
            // сбор информации, об объекте, кол-во которого будет сохранено
            var prperty_id = (this.model.get('datalink'))?this.model.get('datalink'):this.model.get('_id');
            var value = {'id':null, 'value': count};
            var unit = {'id':null, 'value': null};
            $.ajax({
                type: "POST",
                url: "/handlers/esud/save_property",
                data: JSON.stringify({'elem_id':save_obj.get("_id"), 'property_origin_id': prperty_id, 'configuration_path':'', 'property_id':prperty_id, 'linkpath':'', 'value': value, 'unit':unit, 'type': 'template'}),
                timeout: 55000,
                contentType: 'application/json',
                dataType: 'json',
                async:true
                }).done(function(result) {
                   if(result['status']=="error")
                        $.jGrowl('Ошибка сохрнения данных. Повторите попытку. ', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                   else
                        $.jGrowl('Данные успешно сохранены. ', { 'themeState':'growl-success', 'sticky':false, life: 5000 });
            });
        }
        else
            $.jGrowl('Ошибка. Не найдена информация о шаблоне. ', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
    },

     /**
     * Событие на изменение данных модели
     **/
     change: function(){
        var self = this;
        var currentitem_id = ((this.options['parentView'].currentItem)?this.options['parentView'].currentItem.get('_id'):null);
        var current_item =  ((this.options['parentView'].currentItem)?this.options['parentView'].currentItem:null);

        // изменения отрисовывать если только элепент в области видимости пользвателя
        //if(currentitem_id == this.model.get('parent_id'))
        {
            // получить список типов-родителей элемента
            var parentTypes = App.getAllParentsTypes(this.model);

            var have_childs = ((this.options['parentView'].collection.findWhere({'parent_id': this.model.get('_id'),'status':''}))?true:false);

            var parent_elem = null;
            if(this.model.get('parent_id'))
                parent_elem = this.options['parentView'].collection.findWhere({'_id': this.model.get('parent_id')});

            //this.render(have_childs, parent_elem, parentTypes);
            this.render(have_childs, current_item, parentTypes);

            /*var parent_id = ((this.options['parentView'].currentItem)?this.options['parentView'].currentItem.get('_id'):null);
            if(this.model.get('parent_id')==parent_id)
                this.render();
            else
                this.remove();*/
        }
     },

    /**
     * Отрисовка элемента
    **/
    render: function (have_childs, parent_elem, parent_types) {
            var self = this;
            //var is_parent_system = ((parent_elem)?parent_elem.get('is_system'):false);
            //this.model.set('is_system', (is_parent_system || this.model.get('has_system_link') || this.model.get('is_system_link')));

            var is_pseudo_child = false;
            if(parent_elem && this.model.get('parent_id') !=  parent_elem.get('_id'))
                is_pseudo_child = true;

            // рендер элемента
            if(parent_types.indexOf('template')>-1)
            {
                var item_tree = App.buildDataTree(App.dataCollectionArray, this.model.get('_id'),0);
                // если в шаблоне изделие, то необходимо получить в чем измеряется его объем данного изделия
                // для этого необходимо опуститься в модель изделия и там поискать системное свойство - объем
                var unitVal = "";
                if(this.model.get('type')=='product')
                {
                    unitVal = "?";
                    var volProp = null;
                    var value_props = [];
                    App.findByLink(item_tree, App.SystemObjects['items']['VOL_PROP'], value_props);
                    if(value_props.length>0)
                        volProp = value_props[0];

                    var units = [];
                    var values = [];
                    App.getUnitsAndValues(volProp, units, values);

                    if(units.length>0)
                        unitVal = units[0]['name'];
                }
                else if(this.model.get('type')=='operation')
                    unitVal = "мин.";

                // получение свойств шаблона, поиск среди свойств текущего элемента
                var obj_prop = null;
                var template_obj = App.getFirstParentByType(this.model, 'template');
                if(template_obj)
                {
                    var props = (template_obj.has('properties'))?template_obj.get('properties'):[];
                    for(var i in props)
                    {
                        var prop = props[i];
                        if(prop['property_id'] == this.model.get('_id') || prop['property_id']==this.model.get('datalink'))
                        {
                            obj_prop = prop;
                            break;
                        }
                    }
                }

                this.$el.html(this.templates.item_t($.extend({},this.model.toJSON(),{'is_pseudo_child':is_pseudo_child, 'have_childs':have_childs, 'prop':obj_prop, 'unit_val':unitVal}))).attr('data-id', this.model.get('_id')).addClass((this.model.get('status') == 'del')?'del':'');
            }
            else if(parent_types.indexOf('condition')>-1)
               this.$el.html(this.templates.item_c($.extend({},this.model.toJSON(),{'is_pseudo_child':is_pseudo_child,'have_childs':have_childs}))).attr('data-id', this.model.get('_id')).addClass((this.model.get('status') == 'del')?'del':'');
            else
                this.$el.html(this.templates.item($.extend({},this.model.toJSON(),{'is_pseudo_child':is_pseudo_child,'have_childs':have_childs}))).attr('data-id', this.model.get('_id')).addClass((this.model.get('status') == 'del')?'del':'');

            // контекстное меню
             this.$el.contextmenu({
                    target: '#itemContextMenu',
                    before: function (e) {
                        // получение элемента выбранного в соседнем проводнике
                        var neighborCurrentItem = self.options['parentView'].neighborCurrentItem;

                        function renderContextMenu(menu, to_show){
                            menu.find("li").hide();
                            for(var i in  to_show)
                                menu.find("." + to_show[i]).show();
                        }
                        e.preventDefault();

                        /*if(self.model.get('status')=='del')
                            renderContextMenu(this.getMenu(),App.CMOperations(self.model,(self.model.has('datalink') && self.model.get('datalink')), (neighborCurrentItem)?neighborCurrentItem.get('type'):''));
                        else*/
                        renderContextMenu(this.getMenu(),App.CMOperations(self.model,(self.model.has('datalink') && self.model.get('datalink')), neighborCurrentItem,  parent_elem));

                        return true;
                     },
                    onItem: function (context, e) {
                        switch($(e.target).data('val'))
                        {
                            case "add":
                                $(self.el).trigger('itemAdd', [self.model]);
                            break;
                            case "edit":
                                    $(self.el).trigger('itemEdit', [self.model]);
                            break;
                            case "remove":
                                    var msg = "Вы уверены, что хотите удалить элемент?";
                                    bootbox.confirm(msg, function(result){
                                                if(result)
                                                {
                                                    $(self.el).trigger('itemRemove', [self.model]);
                                                }
                                    });
                            break;
                            case "link":
                                $(self.el).trigger('itemLink', [self.model]);
                            break;
                            case "copy":
                                 $(self.el).trigger('itemCopy', [self.model]);
                            break;
                            case "move":
                                 $(self.el).trigger('itemMove', [self.model]);
                            break;
                            case "go-to-link":
                                 $(self.el).trigger('goToLink', [self.model,false]);
                            break;
                            case "open-in-near-window":
                                 $(self.el).trigger('openItem', [self.model,true]);
                            break;
                            case "open-in-source":
                                 $(self.el).trigger('openItem', [self.model,true]);
                            break;
                            case "open-tree":
                                 $(self.el).trigger('openTree', [self.model]);
                            break;
                            case "open-graph":
                                 $(self.el).trigger('openGraph', [self.model]);
                            break;
                            case "open-calculation":
                                 $(self.el).trigger('openCalculation', [self.model]);
                            break;
                            case "open-specification":
                                 $(self.el).trigger('openSpecification', [self.model]);
                            break;
                            case "create-product":
                                 $(self.el).trigger('itemCreateProduct', [self.model]);
                            break;
                            case "create-by-template":
                                 // создание объекта по шаблону
                                 $(self.el).trigger('itemCreateByTemplate', [self.model]);
                            break;
                            case "open-complect":
                                 $(self.el).trigger('openComplect', [self.model]);
                            break;
                            case "redefine":
                                 // переопределение псевдо-ярлыка
                                 $(self.el).trigger('itemRedefine', [self.model]);
                            break;
                            case "cancel": break;
                        }
                    }
              });

            this.$el.find('.tb-count').numeric({ negative: false, decimal: ',' });

            $(this.el).find('.icon-note').qtip({
                content: {
                    text: this.model.get('note').replace(/\n/g, "<br />")
                },
                hide: {
                    event: 'click',
                    inactive: 3000
                },
                show: {
                    event: 'click'
                }
            });

            return this;
    },

    /**
     * Выделение элемента
    **/
    onSelect: function(e)
    {
        //Backbone.trigger('itemSelect',[this.model,true]);
       if (this.$el.hasClass('selected') ) {
                    $(this.el).trigger('itemSelect', [this.model, false]);
                    this.$el.removeClass('selected');
        }
        else {
                    $(this.el).trigger('itemSelect', [this.model,true]);
                     this.$el.addClass('selected');
        }
    },

    /**
     * Обработка события клика по названию элемента
    **/
    onItemClick: function(e){
        var self = this;
        if(e.ctrlKey && e.altKey)
            bootbox.alert('<b>' + this.model.get('name') +  '</b><br/><br/>ID: ' + this.model.get('_id'));//.find("div.modal-dialog").addClass("confirmWidth");
        else
        {
            if($(e.currentTarget).hasClass('pseudo'))
            {
                var dlg = new App.Views.confirmRedefineElementDlgView({'model':this.model});
                dlg.on("dialogsave",function(e){
                    switch(e.type){
                        case "go_to_link":
                            //Backbone.trigger('control:gotolink',[self,self.model,true]);
                            $(self.el).trigger('goToLink', [self.model,true]);
                        break;
                        case "redefine":
                            //Backbone.trigger('control:redefine',[self,self.model]);
                            $(self.el).trigger('itemRedefine', [self.model]);
                        break;
                        case "open_in_source":
                            //Backbone.trigger('control:openItem',[self,self.model,true]);
                            $(self.el).trigger('openItem', [self.model,true]);
                        break;
                    }
                });
                // var msg = "Данный объект отображается из источника ярлыка, внутри которого вы находитесь.<br/> Для работы с объектом вы можете переопределить данный объект внутри ярлыка или открыть его в источнике ярлыка.";
                // bootbox.alert(msg);
                return;
            }
            $(this.el).trigger('openItem', [this.model,e.shiftKey]);
            //$(this.el).trigger('itemClick', [this.model]);
        }
    },

    /**
     * Обработка события клика по иконке
    **/
    onItemIconClick: function(e){
            $(this.el).trigger('goToLink', [this.model,e.shiftKey]);
            //$(this.el).trigger('itemClick', [this.model,true]);
    },

    /**
     * Обработка события клика по иконке с пометкой
    **/
    onItemNoteClick: function(e){
            //$("#modalNote").find(".modal-body").html(this.model.get('note').replace(/\n/g, "<br />"));
            //$('#modalNote').modal();
    },
});



///---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
/// Представление результата поиска----------------------------------------------------------------------------------------------------------------------------------------------
///---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
App.Views.searchView = Backbone.View.extend({
    template: _.template($("#searchResultTemplate").html()),
    events:{
         'searchItemClick': 'itemClick',
     },

    initialize: function(){
    },

    render: function (collection) {
            var self = this;
            this.collection = collection;
            this.$el.find(".search-table").remove();
            this.$el.append(this.template({}));
            _.each(this.collection.models, function (item) {
                    this.renderItem(item);
            }, this);
    },
    renderItem: function (item) {
            var itemView = new App.Views.searchItemView({model: item});
            this.$el.find('tbody').append(itemView.render().el);
    },

    /**
     * Событие на клик по элементу
    **/
    itemClick: function(event, model)
    {
           //this.currentItem = model;
    }
});
///
/// Элемент результата поиска
///
App.Views.searchItemView = Backbone.View.extend({
    tagName: "tr",
    events:{
         'click .lnk-item-name': 'onItemClick',
         'click .icon-link': 'onItemIconClick',
         'click .info': 'onPathClick',
     },

    templates: {
            item:_.template($("#searchItemTemplate").html()),
    },

    /**
     * Отрисовка элемента
    **/
    render: function () {
            var self = this;
            // рендер элемента
            this.$el.html(this.templates.item(this.model.toJSON()));
            return this;
    },

    /**
     * Обработка события клика по элементу
    **/
    onPathClick: function(e){
        var model = null;
        if(this.model.get('parent_object'))
            model = new App.Models.ItemModel(this.model.get('parent_object'));

        if(e.shiftKey)
        {
            $(this.el).trigger('openItem', [model,true]);
            $(this.el).trigger('onHighLightElem', [this.model.get('_id'),true]);
        }
        else
        {
            $(this.el).trigger('searchItemClick', [model, false]);
            $(this.el).trigger('onHighLightElem', [this.model.get('_id'),false]);
        }
    },

    /**
     * Обработка события клика по элементу
    **/
    onItemClick: function(e){
        if(e.shiftKey)
            $(this.el).trigger('openItem', [this.model,true]);
        else
            $(this.el).trigger('searchItemClick', [this.model, false]);
    },

    /**
     * Обработка события клика по иконке ссылки
    **/
    onItemIconClick: function(e){
        //$(this.el).trigger('searchItemClick', [this.model,true]);
        if(e.shiftKey)
            $(this.el).trigger('goToLink', [this.model,true]);
        else
            $(this.el).trigger('searchItemClick', [this.model,true]);
    }
});



///---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
/// Представление вывода элементов в treeView виде------------------------------------------------------------------------------------------------------------------
///---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
App.Views.ItemsTreeView = Backbone.View.extend({
    selectedItem: null, // выделенный элемент
    currentItem: null,      // текущий элемент, тот  в котором мы находимся
    template: _.template($("#directoryTreeTemplate").html()),
    node_template:_.template($("#itemTreeTemplate").html()),
    node_template_model:_.template($("#itemTreeTemplateModel").html()),
    node_template_noconfig:_.template($("#itemTreeTemplateNoConfiguratoin").html()),
    node_template_condition:_.template($("#itemTreeTemplateCondition").html()),
    node_template_propvalue:_.template($("#itemTreeTemplatePropValue").html()),
    treeData:null,
    counter:0,
    sort: false, // флаг, указывающий на необходимость автоматической сортировки
    openedItems:{}, // список идентификаторов объектов, которые необходимо раскрыть
    cur_branch_id: null,
    events:{
         'itemSelect': 'itemSelect',
         'doSort': 'doSort',
         'change  .value input, .value select, .unit input':'onPropertyChange',
         'keypress input': 'onInputKeyPress',
         'click table.treetable tr:not([data-tt-parent-id])':'onBranchClick',
         'treeItemRemove':'itemRemove',
         'node:expand':'onNodeExpand',
         'node:collapse':'onNodeCollapse',
         'click .lnk_open_in_near_window': 'onItemIconClick',
         'change .model-data .name .cb-config':'onProductForModelChecked',
         'change .model-data .name .cb-condition':'onValueForConditionChecked',
         'change .model-data .name .cb-propvalue, .model-data select, .model-data input.value-val':'onValueForPropertyChecked',
         'click .lnk_return_to_original_values': 'onReturnToOriginalValues',
         'change .name .cb-option':'onOptionChange',
         'click span.name': 'onItemNameClick'
     },

    initialize: function(){
        this.openedItems = {};
        this.cur_branch_id = null;
    },

     /**
     * Очистить представление
    **/
    clear: function()
    {
        this.$el.find('.tree-data').empty();
    },

    /**
     * Событие подсветки элемента
    **/
    highlightElem:function(elem_id)
    {
        if(!elem_id)
            return;

        // раскрыть путь до элемента и подсветить его
        var elem = this.$el.find('.tree-data').find("tr[data-id="+elem_id+"]:first");
        var item_ctrl = this.$el.find("tr[data-id="+elem_id+"]:first");
        if(elem.length==0)
            return;
        while(elem.length>0 && elem.data("tt-parent-id")){
                elem = this.$el.find('.tree-data').find("tr[data-tt-parent-id="+elem.data("tt-parent-id")+"]");
                this.$el.find("table.treetable").treetable('expandNode',elem.data('tt-id'));
            }

        // подсветить элемент в дирректории
        window.scrollTo(0,item_ctrl.offset().top);
        setTimeout(function(){
            item_ctrl.addClass("highlight");
            setTimeout(function(){item_ctrl.removeClass("highlight");},2000);
        },100);
    },

      /**
     * Функция получения списка значений объекта - условие
    **/
    getConditionValue:function(data, val_path, id_path, linkpath)
    {
        var result = null;
        if(data && data['node']['status']!='del')
        {
            //if(data['node']['type']=='value')
            if(!data.children || data.children.length==0)
            {
                data.linkpath = linkpath;
                data.val_path = val_path;
                data.id_path = id_path;
                result =  data;
            }
            else if(data.children && data.children.length>0)
            {
                linkpath = (linkpath?(linkpath+"-"):"")+data.node['_id'];
                val_path = (val_path?(val_path+" / "):"")+data.node['name'];
                //id_path = (id_path?(id_path+"-"):"")+ ((data.node['datalink'])?data.node['datalink']:data.node['_id']);
                id_path.push(data.node);
                var child = data.children[0];
                result = this.getConditionValue(child, val_path, id_path, linkpath, result);
            }
        }
        return result;
    },

    /**
     * получить список значений и ед. измерения для свойства
        units -[node]
        values = [node]
        conditions - [objects]
    **/
    getUnitsAndValues:function(data, units, values, conditions){
        for(var j in data.children){
            if(data.children[j]['node']['status']!='del')
            {
                // если встретилось условие, то останавливаем сбор значений и свойств
                if(data.children[j]['node']['type']=='condition' )
                {
                    conditions.push(data.children[j])
                }
                else
                {
                    if(data.children[j]['node']['type']=='unit'){
                        units.push(data.children[j]['node']);
                    }
                    if(data.children[j]['node']['type']=='value'){
                        values.push(data.children[j]['node']);
                    }
                    var nunits = [];
                    var nvalues = [];
                    this.getUnitsAndValues(data.children[j], nunits, nvalues, conditions);
                    if(data.children[j]['node']['type']=='value' && nunits.length>0){
                        data.children[j]['node']['selfunit'] = nunits[0];
                    }
                    for(var k in nunits) units.push(nunits[k]);
                    for(var k in nvalues) values.push(nvalues[k]);
                     //LEXA - получение значений "унаследовано"
                    // Получение значений  - "Унаследовано"
                    for(var i in values)
                    {
                        //if(values[i].name.indexOf("(Унаследованное)")==0){
                          if(values[i].datalink==App.SystemObjects['items']['INHERIT_PROP']){
                            var inp = this.getInheritedPropertie(data);
                            if(inp && (inp.unit.value || inp.value.value)){
                                values[i].name="(Унаследованное) ("+(inp.value.value?inp.value.value+(inp.unit.value?" ":""):"")+(inp.unit.value?inp.unit.value:"")+")";
                            }
                        }
                    }
                }
            }
        }
    },


    /*** получить список чайлдов игнорируя библиотеки ***/
    getChildsIgnoreLibraries:function(data){
        var res = [];
        for(var j in data.children){
            if(data.children[j]['node']['type']=='library')
                res = res.concat(this.getChildsIgnoreLibraries(data.children[j]));
            else
                if(data.children[j]['node']['status']!='del')
                    res.push(data.children[j]);
        }
        return res;
    },

    refreshParents:function(){
        this.refreshParentNode(this.treeData);
    },

    refreshParentNode:function(parent){
        if(!parent.configuration_path)
            parent.configuration_path = "";
        for(var i in parent.children)
        {
            parent.children[i].parent_node = parent;
            parent.children[i].configuration_path = parent.configuration_path;
            if(parent.children[i].node.type=="product")
                parent.children[i].configuration_path = ((parent.children[i].configuration_path)?(parent.children[i].configuration_path+"-"):"")+parent.children[i].node['_id'];
            this.refreshParentNode(parent.children[i]);
        }
    },

    getUnitsAndValuesIgnoreLibraries:function(data, units, values){
        var childs = this.getChildsIgnoreLibraries(data);
        for(var i in childs)
            if(childs[i].node['type']=='unit')
                units.push(childs[i]);
            else
                if(childs[i].node['type']=='value')
                    values.push(childs[i]);
    },

    /*// получить список значений для текущего свойства
    getValueForCurrentProperty:function(data){
        var childs = this.getChildsIgnoreLibraries(data);
        // собираем ед. измерения
        var units = [];
        var values = [];
        for(var i in childs)

            if(childs[i].node['type']=='unit')
                units.push(childs[i]);
            else
                if(childs[i].node['type']=='value')
                    values.push(childs[i]);
        return this.getPropertyValues(data, data.node['_id'], values, units);
    }, */

    // получить список значений для свойств
    getPropertyValues:function(node, property_id, values, units){
        // Бежим по дереву вверх, смотрим его конфигурации, и меняем значения в соответсвии с этими конфигурациями
        var prNode = node;
        var config_path = "";
        var curprop = null;
        while(prNode)
        {
            if(prNode.node.type=="product")
            {
                for(var i in prNode.node.properties)
                {
                    var prop = prNode.node.properties[i];
                    if(prop.linkpath==node.linkpath && (prop.configuration_path||"")==config_path && prop.property_id==property_id && prop.type=='property_value')
                    {
                        // проверяем, осталось ли хотя бы одно значение из выбранных в этом изделии (или все удалили)
                        var is_find = false;
                        for(var v in values){
                            for(var p in prop.values){
                                if(values[v]['node']['_id']==prop.values[p]['value']['id']){
                                    is_find = true;
                                    break;
                                }
                            }
                            if(is_find)
                                break;
                        }
                        if(is_find)
                            curprop = prop;
                    }
                }
                config_path=prNode.node['_id']+((config_path=="")?"":("-"+config_path));
            }
            prNode = prNode.parent_node;
        }
        return curprop;
    },

    // используется для моделей изделий (указывать кол-во моделей)
    getNodeValue:function(node,units, values){
        // the first
        var current_unit = units.length>0?{id:units[0]['_id'], value: units[0]['name']}:{id:null, value:null};
        var current_value = values.length>0?{id:values[0]['_id'], value: values[0]['name']}:{id:null, value:null};

        // Бежим по дереву вверх, смотрим его конфигурации, и меняем значения в соответсвии с этими конфигурациями
        var prNode = node;
        var config_path = "";
        var prop = null;
        while(prNode)
        {
            if(prNode.node.type=="product")
            {
                for(var i in prNode.node.properties)
                {
                    var prop = prNode.node.properties[i];
                    if(prop.linkpath==node.linkpath && (prop.configuration_path||"")==config_path && prop.property_id==node.node['_id'])
                    {
                        current_unit = prop.unit;
                        current_value = prop.value;
                    }
                }
                config_path=prNode.node['_id']+((config_path=="")?"":("-"+config_path));
            }
            prNode = prNode.parent_node;
        }
        return {unit:current_unit, value:current_value, prop:prop};
        //return res;
    },

    /**
    * Получение выбранных конфигураций в рамках всего изделия
    * в просмотр попадают все вложенные конфигурации
    **/
    getNodeSelectedConfigs:function(node){
        var result = null;
        // Бежим по дереву вверх, смотрим его конфигурации, и выбираем необходимые
        var prNode = node;
        var config_path = "";
        while(prNode){
            if(prNode.node.type=="product")
            {
                for(var i in prNode.node.properties){
                    var prop = prNode.node.properties[i];
                    if(prop.linkpath==node.linkpath && (prop.configuration_path||"")==config_path && prop.property_id==node.node['_id']){
                        result = prop;
                    }
                }
                config_path=prNode.node['_id']+((config_path=="")?"":("-"+config_path));
            }
            prNode = prNode.parent_node;
        }
        return result;
    },

    /**
     * Получение выбранных значений условий в рамках всего изделия
    **/
    getConditionSelectedValues:function(node){
        var result = null;
        // Бежим по дереву вверх, смотрим его условия, и выбираем необходимые значения для указанного условия
        var prNode = node;
        var config_path = "";
        var node_linkpath = (node.linkpath?(node.linkpath+"-"):"")+node.node['_id'];
        while(prNode){
            if(prNode.node.type=="product")
            {
                for(var i in prNode.node.properties){
                    var prop = prNode.node.properties[i];
                    if(prop.type=='condition' && prop.linkpath.indexOf(node_linkpath)==0 && (prop.configuration_path||"")==config_path && prop.condition_id==node.node['_id']){
                        result = prop;
                    }
                }
                config_path=prNode.node['_id']+((config_path=="")?"":("-"+config_path));
            }
            prNode = prNode.parent_node;
        }
        return result;
    },

    getInheritedPropertie:function(data){
        if(!data.parent_node || !data.parent_node.parent_node)
            return "";
        var prNode = data.parent_node.parent_node;
        var inProp = null;
        while(prNode)
        {
            for(var i in prNode.children)
            {
                if(prNode.children[i].node.type==data.node.type && prNode.children[i].node.name==data.node.name)
                {
                    var units = [];
                    var values = [];
                    var conditions = [];
                    this.getUnitsAndValues(prNode.children[i],units,values,conditions);
                    return this.getNodeValue(prNode.children[i],units,values);
                }
            }
            prNode = prNode.parent_node;
        }
        return null;
    },

    /**
     * Отрисовка элемента
    **/
    renderItem: function (params, container) {
        var data = params['data'];
        var value="";
        var unit = "";
        if(data['node']['status']!='del')
        {
            if(data['node']['type']=='product' && data.node['_id']!=params.product_id)
            {
                var np = {};
                for(var i in params)
                    np[i] = params[i];
                np['prev_product_id'] = params.product_id;
                np['properties'] = data['node']['properties']||[];
                np['product_id'] = data['node']['_id'];
                np['product'] = data;
                np['parent_properties'] = params['parent_properties']||params['properties'];
                var linkpath = data.linkpath;
                if(data.node['datalink'])
                    linkpath = (linkpath?(linkpath+"-"):"")+data.node['_id'];
                np['product_linkpath'] = linkpath;
                np['common_product_id'] = params['common_product_id']
                this.renderItem(np,container);
                return;
            }
            ///
            ///-----Изделие--------------------------------------------------------------------------------------------------------------------------------
            ///
            else if(data['node']['type']=='product')
            {
                var current_unit = {id:null, value:''};
                var current_value = {id:null, value:''};


                for(var p in params.parent_properties)
                {
                    if(params.parent_properties[p]['property_id']==data.node['_id'])
                    {
                        current_unit = params.parent_properties[p]['unit'];
                        current_value = params.parent_properties[p]['value'];
                        //is_modified = true;
                        break;
                    }
                }

                // реализация редактируемости количества для конфигураций
                // iss_279 + iss_282
                unit = '<span class="unit-val product-val">'+current_unit['value']+'</span>';
                if(!params.prev_product_id && ((!data.linkpath && params.product_id) || (params.product_id && data.node.is_buy)))
                    value='<input type="text" class="product-value-val value-val is-diggit" value="'+(current_value?current_value.value:'1')+'"  />';
                else
                    value = '<span class="product-value-val product-val value-val">'+(current_value ?current_value.value:'1')+'</span>';
            }

            ///
            ///-----Модель изделия--------------------------------------------------------------------------------------------------------------------------------
            ///
            // проверка на модель для которой необходим вывод конфигурации
            if(data['node']['type']=='product_model' && ('need_configuration' in data && data['need_configuration']))
            {
                    var id = params.counter.val++;
                    var current_unit = {id:null, value:'шт'};
                    var current_value = {id:null, value:null};
                    //----------------------------------------
                    // поиск среди чайлдов системного свойства- объем, если есть, то из него взять данные
                    var volProp = null;
                    for(var ce in data.origin_children){
                        if(data.origin_children[ce]['node']['datalink']==App.SystemObjects['items']['VOL_PROP']){
                            volProp = data.origin_children[ce];
                            break;
                        }
                    }
                    var selfunit = null;
                    var units = [];
                    var values = [];
                    var conditions = [];
                    if(volProp)
                    {
                        this.getUnitsAndValues(volProp, units, values, conditions);
                        var cs = this.getNodeValue(data,units,values);
                        //current_unit = (cs.unit && cs.unit.value)?cs.unit.value:{id:null, value:'шт'};
                        current_unit = (cs.unit && cs.unit.value)?cs.unit:{id:null, value:'шт.'};
                        current_value = (cs.value && cs.value.value)?cs.value:{id:null, value:null};
                    }
                    //----------------------------------------

                    if(!volProp)
                    {
                        value = '<span class="unit-val product-val" title = "Не задано системное свойство - Объем">Ошибка!</span>';
                        unit = '<span class="unit-val product-val"></span>';
                    }
                    else
                    {
                        if(values.length==0)
                            value='<input type="text" class="value-val" value="'+(current_value.value?current_value.value:'')+'" />';
                        else if(values.length==1)
                            value='<span class="value-val" class="value-val" data-id="'+values[0]['_id']+'">'+values[0]['name']+'</span>';
                        else if(values.length>1)
                        {
                            value = '<select class="value-val">';
                            for(var k in values)
                            {
                                if(current_value.id==values[k]['_id'] || (values[k]['name']=="(Открытое значение)" && !current_value.id) )
                                {
                                    value+='<option value="'+((values[k]['name']=="(Открытое значение)")?"":values[k]['_id'])+'" selected>'+values[k]['name']+'</option>';
                                    if(values[k]['selfunit'])
                                        selfunit = values[k]['selfunit'];
                                }
                                else
                                    value+='<option value="'+((values[k]['name']=="(Открытое значение)")?"":values[k]['_id'])+'">'+values[k]['name']+'</option>';
                            }
                            value += "</select>";
                            value += '<input type="text" class="additional-value" '+((!current_value.id)?('value="'+(current_value.value?current_value.value:'')+'"'):'')+' />';
                        }
                        if(units.length==1)
                            unit='<span class="unit-val" data-id="'+units[0]['_id']+'">'+units[0]['name']+'</span>';
                        else if(units.length>1)
                        {
                            unit = '<select class="unit-val" data-id="'+units[0]['_id']+'" '+(selfunit?"disabled":"")+'>';
                            for(var k in units)
                            {
                                if((selfunit && units[k]['_id']==selfunit['_id']) || (!selfunit && current_unit.id==units[k]['_id']))
                                    unit+='<option value="'+units[k]['_id']+'" selected>'+units[k]['name']+'</option>';
                                else
                                    unit+='<option value="'+units[k]['_id']+'">'+units[k]['name']+'</option>';
                            }
                            unit += "</select>";
                        }
                    }

                    // получить из свойств актуальную(заданную) конфигурацию
                    var sel_configurations = [];
                    var tmp_config = this.getNodeSelectedConfigs(data);
                    if(tmp_config && tmp_config['product_configs'])
                        sel_configurations = tmp_config['product_configs'];

                    // получить список всех изделий-конфигураций созданных на основе модели
                    var products = [];
                    if('products' in data)
                        products = data['products'];

                    // если есть конфигурации для модели
                    if(products.length>0)
                    {
                        var existing_configurations = []; //существущие конфигурации среди выбранных
                        var is_exists = false;
                        for(var pi in products)
                            if(sel_configurations.indexOf(products[pi]['_id'])>-1)
                                existing_configurations.push(products[pi]['_id']);
                        sel_configurations = existing_configurations;

                        // рендеринг модели на форме
                        var sub_name = (sel_configurations.length>0)?(sel_configurations.length==1)?'задан ДСЕ':'заданы ДСЕ':'не задан ДСЕ';

                        container.append(this.node_template({number:data['node']['number'], id:id, parent_id:params.parent_id, is_modified:false, configuration_path:data.configuration_path, enabled:(data.configuration_path=='') , linkpath: data.linkpath , node_id:data['node']['_id'], datalink: data.node['datalink'], name:data['node']['name'], sub_name:sub_name,  type:data['node']['type'], unit:unit, value:value, node: data['node'] }));

                        var sub_id = '';

                        var pparent_id = id;
                        var model_is_rendered = false;
                        // вывод списка изделий-конфигураций для модели
                        for(var pi in products)
                        {
                            var izd_shifr1 = "";
                            var izd_shifr2 = "";

                             // проверка на изменение свойств во вложенных конфигурациях
                             // также сбор шифров: шифр1 и шифр2
                            var isModified = false;
                            for(var cpi in products[pi].properties)
                                products[pi].properties[cpi]['is_modified'] = false;

                            for(var i in params.parent_properties)
                            {
                                if(params.parent_properties[i].configuration_path && params.parent_properties[i].configuration_path.indexOf(products[pi]['_id'])>=0)
                                {
                                    for(var cpi in products[pi].properties)
                                    {
                                        if(params.parent_properties[i]['property_id'] ==  products[pi].properties[cpi]['property_id'] )
                                        {
                                            products[pi].properties[cpi]['is_modified'] = true;
                                            //params.parent_properties[i]['is_modified'] = true;
                                        }
                                    }
                                    isModified = true;
                                }

                                if(params.parent_properties[i].configuration_path==((data.configuration_path?'-':'')+products[pi]['_id']))
                                {
                                    if((params.parent_properties[i].property_origin_id || params.parent_properties[i].property_id)==App.SystemObjects['items']['SHIFR1_PROP'] && params.parent_properties[i].values && params.parent_properties[i].values.length>0 && params.parent_properties[i].values[0])

                                        izd_shifr1 = params.parent_properties[i].values[0].value.value;
                                    else if((params.parent_properties[i].property_origin_id || params.parent_properties[i].property_id)==App.SystemObjects['items']['SHIFR2_PROP'] && params.parent_properties[i].values && params.parent_properties[i].values.length>0 && params.parent_properties[i].values[0])
                                        izd_shifr2 = params.parent_properties[i].values[0].value.value;
                                }
                            }
                            if(!izd_shifr1){
                                for(var k in products[pi].properties){
                                    if((products[pi].properties[k].property_origin_id || products[pi].properties[k].property_id) ==App.SystemObjects['items']['SHIFR1_PROP'] && products[pi].properties[k].values && products[pi].properties[k].values.length>0)
                                        izd_shifr1 = products[pi].properties[k].values[0].value.value;
                                    if((products[pi].properties[k].property_origin_id || products[pi].properties[k].property_id) ==App.SystemObjects['items']['SHIFR2_PROP'] && products[pi].properties[k].values && products[pi].properties[k].values.length>0)
                                        izd_shifr2 = products[pi].properties[k].values[0].value.value;
                                }
                            }

                            var nid = params.counter.val++;
                            // #iss_600 - изделия в групповых "моделях-покупные аналоги", выбраны по умолчанию все
                            var is_parent_buy_group = (data.parent_node && data.parent_node['node']['is_buy_group'] );
                            if(sel_configurations.indexOf(products[pi]['_id'])>-1 || is_parent_buy_group )
                            {
                                sub_name = (products[pi]['number']?products[pi]['number']+'. &nbsp':'' ) +(izd_shifr1&&App.showShifrs?('['+izd_shifr1+']&nbsp;'):'')+products[pi]['name']+(izd_shifr2&&App.showShifrs?('&nbsp;['+izd_shifr2+']'):'') + ((isModified)?'&nbsp;мод.':'');
                                sub_id = products[pi]['_id'];

                                // рендеринг нода изделия
                                container.append(this.node_template_model({number:products[pi]['number'], enabled:(data.configuration_path==''),  id:nid, parent_id:pparent_id, sub_name_before:izd_shifr1, sub_name:izd_shifr2, is_modified:isModified, configuration_path:data.configuration_path, linkpath: data.linkpath ,  node_id:products[pi]['_id'], datalink: products[pi]['datalink'], name:products[pi]['name'], type:products[pi]['type'], node: data['node'] , checked:true, is_parent_buy_group:is_parent_buy_group, sub_id: sub_id }));

                                // рендеринг содержимого изделия
                                for(var k in data.children)
                                {
                                    if(products[pi]['_id'] == data.children[k].node['_id'])
                                    {
                                        var chlist = data.children[k];
                                         for(var i in chlist.children)
                                            this.renderItem({counter:params.counter, parent_id:nid,data:chlist.children[i],prev_product_id: params.product_id, product:chlist, properties:products[pi]['properties'],product_id:products[pi]['_id'], parent_properties:params.parent_properties, product_linkpath:params.product_linkpath, common_product_id:params.common_product_id},container);
                                    }
                                }
                            }
                            else
                            {

                                container.append(this.node_template_model({number:products[pi]['number'], enabled:(data.configuration_path==''), id:nid, parent_id:pparent_id, sub_name_before:izd_shifr1, sub_name:izd_shifr2, is_modified:isModified, configuration_path:data.configuration_path, linkpath: data.linkpath ,  node_id:products[pi]['_id'], datalink: products[pi]['datalink'], name:products[pi]['name'], type:products[pi]['type'], node: data['node'] , checked:false }));
                            }
                        }

                        // поиск отрисованной модели и добавление для нее дополнительного имени(ДСЕ)
                        if(sel_configurations.length==1)
                        {
                            $(container).find("tr[data-tt-id="+pparent_id+"]").find('.name .lbl-light').html('['+sub_name+']');
                            $(container).find("tr[data-tt-id="+pparent_id+"]").data('sub_id',sub_id);
                        }

                    }
                    else // нет конфигураций для модели
                    {

                        // рендеринг модели на форме
                        container.append(this.node_template({number:data.node['number'], id:id, enabled:(data.configuration_path==''),  parent_id:params.parent_id, configuration_path:data.configuration_path, linkpath: data.linkpath , node_id:data['node']['_id'], datalink: data.node['datalink'], name:data['node']['name'], sub_name: 'ДСЕ не задан', type:data['node']['type'], unit:unit, value:value, node: data['node'] }));
                        // Ошибка! отсутствует конфигурация для выбранной модели
                        var nid = params.counter.val++;
                        container.append(this.node_template_noconfig({id:nid, parent_id:id}));
                    }
            }
            ///
            ///-----Условие--------------------------------------------------------------------------------------------------------------------------------
            ///
            else if(data['node']['type']=='condition')
            {
                // чтобы не делать выборку по чайлдам 2 раза (первый раз, чтобы проставить надпись Задано/Незадано, а второй - чтобы их вывести), пишем сначала все в массив, а затем добавляем на отрисовку
                var condition_items = [];

                // рендеринг нода условия на форме
                var id = params.counter.val++;
                // получение выбранных значений по данному условию
                var sel_vals = this.getConditionSelectedValues(data);
                // определение, задано ли какое-либо значение в рамках данного условия
                var have_sel_values = false;
                /*if(sel_vals)
                {
                    if(sel_vals['condition_values'] && sel_vals['condition_values'].length>0)
                    {
                        for(var i in data.children){

                        }
                        //have_sel_values = true;
                    }
                } */
                //container.append(this.node_template({number:null, id:id, parent_id:params.parent_id, enabled:(data.configuration_path==''), configuration_path:data.configuration_path, linkpath: data.linkpath , node_id:data['node']['_id'], datalink: data.node['datalink'], name:data['node']['name'] + ((have_sel_values)?' (задано)':' (не задано)'), type:data['node']['type'], unit:unit, value:value, node: data['node'] }));
                // сбор значений условий
                for(var i in data.children)
                {
                            var child = data.children[i];
                            var linkpath = (data.linkpath?(data.linkpath+"-"):"")+data.node['_id'];
                            var cond_val = this.getConditionValue(child, '',[], linkpath, '');
                            if(cond_val)
                            {
                                var c_id = params.counter.val++;
                                // проверка, выбранно ли данное значение для условия
                                var is_checked = false;
                                if(sel_vals)
                                {

                                        for(var s_j in sel_vals['condition_values']){
                                            if(sel_vals['condition_values'][s_j]['id'] == cond_val['node']['_id'] && sel_vals['condition_values'][s_j]['linkpath'] == cond_val['linkpath'] && (sel_vals['condition_values'][s_j]['configuration_path']||"").replace(data.configuration_path+'-','').replace(data.configuration_path,'') == (cond_val['configuration_path'] || "").replace(data.configuration_path+'-','').replace(data.configuration_path,''))
                                            {
                                                have_sel_values = true;
                                                is_checked =true;
                                                break;
                                            }
                                        }

                                }
                                // отрисовка значения условия на форме
                                condition_items.push(this.node_template_condition({id:c_id, enabled:true/*(data.configuration_path=='')*/, parent_id:id, configuration_path:cond_val.configuration_path, linkpath: cond_val.linkpath , node_id:cond_val['node']['_id'], datalink: cond_val.node['datalink'], node_path:cond_val['val_path'], name:cond_val['node']['name'], type:cond_val['node']['type'], unit:unit, value:value, node: cond_val['node'], checked:is_checked }));
                                //container.append(
                        }
                }
                // сначала добавляем узел условия
                container.append(this.node_template({number:null, id:id, parent_id:params.parent_id, enabled:(data.configuration_path==''), configuration_path:data.configuration_path, linkpath: data.linkpath , node_id:data['node']['_id'], datalink: data.node['datalink'], name:data['node']['name'] + ((have_sel_values)?' (задано)':' (не задано)'), type:data['node']['type'], unit:unit, value:value, node: data['node'] }));
                // затем его значения
                condition_items.map(function(item){
                    container.append(item);
                })

            }
            ///
            ///-----Все остальные объекты не попавшие под условия выше---------------------------------------------------------------------------------
            ///
            else
            {
                // не выводить системное свойство объем
                if(!(data.node['type']=='property' && ('datalink' in data['node'] && (data['node']['datalink'] ==  App.SystemObjects['items']['VOL_PROP'] || data['node']['datalink'] ==  App.SystemObjects['items']['BUY_PROP'] || data['node']['datalink'] ==  App.SystemObjects['items']['SYS_PROP'] ))))
                {

                    if(data.node['type']=='property')
                    {
                        var id = params.counter.val++;
                        var is_modified = false; // флаг на проверку было ли свойство модифицировано в рамках вложенной конфигурации
                        var cur_value = null;
                        var cur_unit = null;
                        if(params.properties && data['node']['type']=='property')
                        {
                            for(var pi in params.properties)
                            {
                                var curprop = params.properties[pi];
                                if(curprop['property_id']== data['node']['_id'])
                                {
                                    is_modified = ((curprop.is_modified)?true:false);
                                    break;
                                }
                            }
                        }
                        // для опций (их можно включать и выключать)
                        var is_checked = true;


                        var curprop = this.getPropertyValues(params.property_node, params.property_id, [data], []);
                        if(curprop && curprop.values){
                            for(var q in curprop.values){
                                if(curprop.values[q]['value']['id']==data['node']["_id"] && curprop.values[q]['value']['value']=='off'){
                                    is_checked = false;
                                }
                            }
                        }

                        //var value_text = data.node.is_optional?"Опция":"";
                        //r unit_text = "";
                        if(value=="" && unit==""){
                            if(data.node.is_optional){
                                value = "Опция";
                            }
                            else{
                                var all_units = [], all_values=[];
                                this.getUnitsAndValuesIgnoreLibraries(data, all_units, all_values);
                                var qq = this.getPropertyValues(data, data.node['_id'], all_values, all_units);
                                var sel_values = [];
                                var sel_units = [];
                                if(qq){
                                    qq.values.map(function(val){
                                        all_units.map(function(su){
                                            if(su.node['_id']==val.unit.id){
                                                sel_units.push(val.unit);
                                                return false;
                                            }
                                        });
                                        all_values.map(function(sv){
                                            if(sv.node['_id']==val.value.id){
                                                sel_values.push(val.value);
                                                return false;
                                            }
                                        });
                                    });
                                }else{
                                    all_values.map(function(vl){
                                        if(vl['node']['is_default'] && sel_values.length==0){
                                            var is_open = (vl['node']['datalink']==App.SystemObjects['items']['OPEN_VAL']) || (vl['node']['name']=='(Открытое значение)');
                                            sel_values.push({'id':vl['node']['_id'], 'value': is_open?'':vl['node']['name'] })
                                        }
                                    });
                                    if(all_units.length>0 && sel_units.length==0)
                                        sel_units.push({'id':all_units[0]['node']['_id'], 'value':all_units[0]['node']['name']})
                                }

                                // поиск добавочного значения для ед. измерения
                                var unit_additional = "";
                                if(sel_units.length==1){
                                    var cur_unit = sel_units[0];
                                    var s_unit = null;
                                    if(all_units.length>0){
                                        s_unit = all_units[0];
                                        for(var k in all_units) {
                                            if(cur_unit && cur_unit['id']==all_units[k].node['_id'])
                                                s_unit = all_units[k];
                                        }
                                        if(s_unit.children && s_unit.children.length>0){
                                            var ch = s_unit.children;
                                            while(unit_additional=="" && ch.length>0){
                                                var nch = [];
                                                for(var i in ch){
                                                    if(ch[i].node['type']=='unit'){
                                                        unit_additional = ch[i].node['name'];
                                                        break;
                                                    }
                                                    if(ch[i].children && ch[i].children.length>0){
                                                        nch = nch.concat(ch[i].children);
                                                    }
                                                }
                                                ch = nch;
                                            }
                                        }
                                    }
                                }


                                if(sel_values.length>1)
                                    value='<span class="value-val-prop">Несколько значений</span>';
                                else
                                if(sel_values.length==1)
                                    value = '<span class="value-val-prop">'+sel_values[0].value.replace('[З]&nbsp;','')+'</span>';
                                if(sel_units.length>1)
                                    unit = '<span class="unit-val">Несколько значений</span>';
                                else
                                if(sel_units.length==1)
                                    unit = '<span class="unit-val">'+(sel_units[0].value+(unit_additional?(' / '+unit_additional):''))+'</span>';

                                if(unit==""){
                                    if(all_units && all_units.length>0)
                                    {
                                        unit = '<span class="unit-val">'+(all_units[0].node.name+(unit_additional?(' / '+unit_additional):''))+'</span>';
                                    }
                                }
                            }
                        }

                        // св-во has_checkbox определяет, можно ли отключить это свойство (интерфейсно выглядит, как чекбокс рядом с названием свойства)
                        container.append(this.node_template({number:data['node']['number'], has_checkbox:(data.node['datalink']==App.SystemObjects['items']['OPTION_PROP']), is_checked:is_checked, property_id:params.property_id, 'property_origin_id': params.property_origin_id, proplinkpath: params.property_linkpath, enabled:(data.configuration_path==''), id:id, parent_id:params.parent_id, configuration_path:data.configuration_path, linkpath: data.linkpath , node_id:data['node']['_id'], datalink: data.node['datalink'], name:data['node']['name'], type:data['node']['type'], unit:unit, value:value, node: data['node'], 'is_modified': is_modified }));
                    }
                    else if(data.node['type']!='value')
                    {
                        var id = params.counter.val++;
                        container.append(this.node_template({number:data['node']['number'], enabled:(data.configuration_path==''), id:id, parent_id:params.parent_id, configuration_path:data.configuration_path, linkpath: data.linkpath , node_id:data['node']['_id'], datalink: data.node['datalink'], name:data['node']['name'], type:data['node']['type'], unit:unit, value:value, node: data['node'], 'is_modified': false }));
                    }
                    else
                    {
                        var id = params.counter.val++;
                        var curprop = this.getPropertyValues(params.property_node, params.property_id, params.values, params.units);
                        var is_checked = false;
                        var cur_unit = null;
                        var cur_value=null;
                        var is_open = (data['node']['datalink']==App.SystemObjects['items']['OPEN_VAL'])?true:false;
                        var is_optional = params.property_node?(params.property_node['node']['is_optional']):false;
                        var is_modified = false; // флаг на проверку было ли свойство модифицировано в рамках вложенной конфигурации

                        var have_any_val = false; // флаг указывающий на существоание хотя бы одного сохраненного значения в дереве занчений свойства

                        // если пользователь выбрал значение
                        if(curprop && curprop.values){

                            is_modified = ((curprop.is_modified)?true:false);
                            for(var q in curprop.values){
                                if(curprop.values[q]['value']['id']==data['node']["_id"] || (curprop.values[q]['value']['id']==null && is_open)){
                                    is_checked = true;
                                    cur_unit =curprop.values[q]['unit'];
                                    cur_value =curprop.values[q]['value'];
                                }
                            }

                            // проверяем, есть ли хотя бы одно из сохраненных значений среди существующих в дереве
                            // если нет ниодного, то надо проверять на is_default
                            for(var q in curprop.values){
                                if(params.property_node.children){
                                    for(ex_el_index in params.property_node.children){
                                        if(curprop.values[q]['value']['id']==params.property_node.children[ex_el_index]['node']["_id"]){
                                            have_any_val = true;
                                            break;
                                        }
                                    }
                                }
                            }
                        }

                        //else{
                        else if(!have_any_val){
                        //if(!curprop || !curprop.values || !is_checked){
                            // устанавливаем значение по умолчанию (если есть)
                            if(data['node']['is_default'] && !params.property_node.is_default_checked){
                                is_checked = true;
                                //cur_value = {'id':data['node']['_id'], 'value':is_open && data['node']['name'] == '(Открытое значение)'?'':data['node']['name']};
                                // этот флаг выставляетя, если у свойства несколько значений по умолчанию. тогда должен быть выделен только первый
                                params.property_node.is_default_checked = true;
                            }
                            cur_value = {'id':data['node']['_id'], 'value':is_open && data['node']['name'] == '(Открытое значение)'?'':data['node']['name']};
                        }
                        //var model_tr = self.$el.find("table.treetable tr[data-tt-id="+tr.data("tt-parent-id")+"]");
                        // для покупных изделий на первом уровне можно менять системные свойства, на остальных уровнях - нельзя.
                        var enabled = (data.configuration_path=='' || (data.configuration_path.indexOf("-")<0 && params.product && params.product['node'].is_buy && (params.property_node['node']['datalink']==App.SystemObjects['items']['VOL_TOLERANCE_PROP'] || params.property_node['node']['datalink']==App.SystemObjects['items']['TOLERANCE_ON_VOL_PROP'] || /*params.property_node['node']['datalink']==App.SystemObjects['items']['VOL_PER_UNIT_PROP'] ||*/ params.property_node['node']['datalink']==App.SystemObjects['items']['AMOUNT_PROP'])));

                        // отрисовка свойства
                        container.append(this.node_template_propvalue({number:data['node']['number'], enabled:enabled, is_open:is_open, parent_guid:params.parent_guid || params.parent_id, is_optional:is_optional, property_id:params.property_id, 'property_origin_id': params.property_origin_id,  units:params.units || [], checked:is_checked, id:id, parent_id:params.parent_id, configuration_path:data.configuration_path, linkpath: data.linkpath ,proplinkpath: params.property_linkpath , node_id:data['node']['_id'], datalink: data.node['datalink'], name:data['node']['name'], type:data['node']['type'], unit:cur_unit, value:cur_value,  node: data['node'], 'is_modified': is_modified }));
                    }

                    // для свойств и значение следует игнорировать библиотеки
                    if(data.node['type']=='property' || data.node['type']=='value'){
                        data.is_default_checked = false;
                        var childs = this.getChildsIgnoreLibraries(data);
                        // собираем ед. измерения
                        var units = [];
                        var values = [];
                        for(var i in childs)
                            if(childs[i].node['type']=='unit')
                                units.push(childs[i]);
                            else
                                if(childs[i].node['type']=='value')
                                    values.push(childs[i]);

                        var guid = Guid.newGuid();
                        for(var i in childs)
                            if(childs[i].node['type']!='unit')
                                this.renderItem({counter:params.counter,parent_id:id,data:childs[i],parent_guid:guid, properties:params.properties,parent_properties:params.parent_properties, property_node:data, property_id:data.node['_id'], 'property_origin_id':data.node['datalink'], product_id:params.product_id, product:params.product,product_linkpath:params.product_linkpath, property_linkpath:data.linkpath, common_product_id:params.common_product_id, units:units, values:values},container);

                    }else
                        for(var i in data.children)
                            this.renderItem({counter:params.counter,parent_id:id,data:data.children[i],properties:params.properties,parent_properties:params.parent_properties,product_id:params.product_id, product:params.product,product_linkpath:params.product_linkpath, 'property_origin_id':data.node['datalink'], common_product_id:params.common_product_id},container);

                    if ((data.node['type']!='property') && conditions && conditions.length>0)
                    {
                        for(var i in conditions)
                            this.renderItem({counter:params.counter,parent_id:id,data:conditions[i],properties:params.properties,parent_properties:params.parent_properties,product_id:params.product_id, product:params.product,product_linkpath:params.product_linkpath, 'property_origin_id':data.node['datalink'], common_product_id:params.common_product_id},container);

                    }
                }
            }
        }
    },

    sortTree:function(data){
        if(data.children){
            if(this.sort)
                data.children.sort(function(a,b){
                    var aname = '['+App.DecodeType(a['node']['type'],a['node']['is_buy']||false,a['node']['is_complect']||false,a['node']['is_otbor']||false)['short_type']+'] '+(a['node']['number'] || '')+a['node']['name'];
                    var bname = '['+App.DecodeType(b['node']['type'],b['node']['is_buy']||false,b['node']['is_complect']||false,b['node']['is_otbor']||false)['short_type']+'] '+(b['node']['number'] || '')+b['node']['name'];
                    if(aname>bname)
                        return 1;
                    if(aname<bname)
                        return -1;
                    return 0;
                });
            else
                data.children.sort(function(a,b){
                    return a['node']['routine']-b['node']['routine'];
                });

            for(var c in data.children){
                this.sortTree(data.children[c]);
            }
        }
    },

    /**
     * Отрисовка всего представления
    **/
    render: function ()
    {
        var self = this;

        this.refreshParents();
        this.sortTree(this.treeData);

        // запуск для текущего элемента хранения истории расскрытых элементов
        if(this.currentItem && !(this.currentItem.get('_id') in this.openedItems))
        {
              this.openedItems[this.currentItem.get('_id')] = [];

              if(this.treeData.children && this.treeData.children.length>0)
              {
                   var children = this.treeData.children[0];
                   var newHistObject = {
                        linkpath:children['linkpath'],
                        id: children['node']['_id']
                    };
                   this.openedItems[this.currentItem.get('_id')].push(newHistObject);
              }
        }

        //this.$el.find("table>tbody").empty();
        this.$el.find('.tree-data').empty();
        // навешивание контрола таблицы
        this.$el.find('.tree-data').append(this.template(this.treeData));
        var data_container = this.$el.find('.tree-data').find("tbody");

        var counter = {val:1};
        for(var i in this.treeData.children)
        {
            var children = this.treeData.children[i];
            this.renderItem({counter:counter,parent_id:0, data:children,properties: this.treeData.node['properties']||[], parent_properties:this.treeData.node['properties']||[],    product_id:null, product:null, product_linkpath:"", common_product_id:self.currentItem.get('_id')},data_container);
        }
        data_container.find("tr.tr-disabled").find("input,select").attr("disabled","disabled");
        this.resetAdditionalValues();

        // события на раскрытие/закрытие нодов дерева
        this.$el.find("table.treetable").treetable({
            expandable: true,
            onNodeExpand: function(e){
                self.$el.trigger("node:expand",[this]);
            },
            onNodeCollapse: function(e){ self.$el.trigger("node:collapse",[this]); }
        });
        // расскрыть все сохраненые ранее ветки дерева
        for(var i in this.openedItems[this.currentItem.get('_id')])
        {
            var curItem = this.openedItems[this.currentItem.get('_id')][i];
            var treeElem = this.$el.find("table.treetable").find("tr[data-linkpath='"+curItem['linkpath']+"']").filter("tr[data-id='"+curItem['id']+"']");
            if(treeElem.length>0)
                this.$el.find("table.treetable").treetable('expandNode',treeElem.data("tt-id"));
        }

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

        // подключение перетаскивания элементов дерева
        this.$el.find("table.treetable").sortable({
           items: "tr:not([data-tt-parent-id])",
           appendTo: document.body,
           helper:"clone",
          update: function(e, ui){
            self.repositionElements(ui.item.data("id"),ui.item.data("tt-id"));
          },
          receive:function(e,ui){
            ui.item.data("is-stop",true);
            // ищем, куда вставлять элемент
            var felem = ui.item.prev();
            ui.sender.sortable("cancel");
            // определение пути для нового элемента
            var path = self.currentItem?(self.currentItem.get("path")?(self.currentItem.get("path")+'-'+self.currentItem.get("_id")):self.currentItem.get("_id")):"";
            var copy_elem = App.dataCollection.get(ui.item.data('id'));

             // проверяем, может ли объект быть помещен в дерево
             // сначала идет базовая проверка, что не кладется изделие само в себя и
             // в изделие нельзя вложить ссылку на что-либо
            if(copy_elem.get("_id")!=self.currentItem.get("_id") && (copy_elem.get('type')=='product_model' || copy_elem.get("type")=='product' || copy_elem.get('type')=='operation' || copy_elem.get('type')=='library'|| copy_elem.get('type')=='property') && !(copy_elem.has('datalink') || copy_elem.get('datalink')))
            {

                // В изделие нельзя вложить свойство - объем
                if(copy_elem.get('_id') == App.SystemObjects['items']['VOL_PROP'])
                {
                    $.jGrowl('Нельзя поместить данный объект в изделие.', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                    return false;
                }

                // В изделие неьзя вложить другое изделие
                //if(self.currentItem && self.currentItem.get('type')=='product'  && !self.currentItem.get('is_buy') && ((copy_elem.get('type')=='product_model' &&  !copy_elem.get('is_buy')) || copy_elem.get('type')=='product') )
                if(self.currentItem && self.currentItem.get('type')=='product'  && copy_elem.get('type')=='product')
                {
                            $.jGrowl('Нельзя поместить данный объект в изделие.', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                            return false;
                }

                // В покупное изделие нельзя вложить МИ, И, ИП
                if(self.currentItem && self.currentItem.get('type')=='product' && self.currentItem.get('is_buy'))
                {
                    if(copy_elem.get('type')=='product' ||  (copy_elem.get('type')=='product_model'  && !copy_elem.get('is_buy')) )
                    {
                            $.jGrowl('Нельзя поместить данный объект в покупное изделие.', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                            return false;
                    }
                }

                // В обычное изделие нельзя вложить И, ИП
                if(self.currentItem && self.currentItem.get('type')=='product' && !self.currentItem.get('is_buy'))
                {
                    if(copy_elem.get('type')=='product')
                    {
                            $.jGrowl('Нельзя поместить данный объект в изделие.', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                            return false;
                    }
                }

                // проверка на правило, что внутри объекта изделия может быть только одна модель изделия
                if(self.currentItem && self.currentItem.get('type')=='product')
                {
                    var children =  App.dataCollection.where({'parent_id': self.currentItem.get('_id'), 'status': ''});
                    var isErr =false;
                    if(copy_elem.get('type')=='product_model')
                    {
                        children.forEach(function(el){
                            if(el.get('type')=='product_model')
                            {
                                isErr = true;
                                return;
                            }
                        });
                        if(isErr)
                        {
                            $.jGrowl('Для данного изделия уже задана модель.', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                            return;
                        }
                    }
                    // проерка на то, что обычное свойство можно вкладывать только в покупное изделие
                    // системеное свойство на покупное изделие можно вкладывать в любое изделие один раз
                    // системное свойство - объем, можно вкладывать в изделия один раз
                    else if(copy_elem.get('type')=='property')
                    {
                        if(copy_elem.get('_id') == App.SystemObjects['items']['BUY_PROP'])
                        {
                            children.forEach(function(el){
                                    if(el.get('datalink')==App.SystemObjects['items']['BUY_PROP'])
                                    {
                                        isErr = true;
                                        return;
                                    }
                            });
                            if(isErr)
                            {
                                $.jGrowl('Для данного изделия уже задано свойство покупного.', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                                return;
                            }
                        }
                        else if(copy_elem.get('_id') == App.SystemObjects['items']['VOL_PROP'])
                        {
                            children.forEach(function(el){
                                    if(el.get('datalink')==App.SystemObjects['items']['VOL_PROP'])
                                    {
                                        isErr = true;
                                        return;
                                    }
                            });
                            if(isErr)
                            {
                                $.jGrowl('Для данного изделия уже задано свойство - объем.', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                                return;
                            }
                        }
                        else if(!self.currentItem.get('is_buy') && copy_elem.get('_id') != App.SystemObjects['items']['VOL_PROP'])
                        {
                            $.jGrowl('Свойства можно помещать только в покупные изделия.', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                            return;
                        }
                    }
                }

                // создание нового элемента
                var new_elem = new App.Models.ItemModel({
                    name:copy_elem.get("name"),
                    type:copy_elem.get("type"),
                    parent_id:(self.currentItem?self.currentItem.get("_id"):null) ,
                    path: path,
                    datalink:copy_elem.get("_id"),
                    routine: -1,
                    note:copy_elem.get("note"),
                    number:copy_elem.get("number")
                });
                AppLoader.show();
                new_elem.save(new_elem.toJSON(),{
                    success:function(){
                        App.dataCollection.add(new_elem);
                        App.CheckOnSystem(new_elem.get('_id'));
                        App.CheckOnBuy(new_elem.get('parent_id'));

                        /*if(self.currentItem)
                            self.currentItem['is_buy'] = copy_elem['is_buy'] || self.currentItem['is_buy'];*/

                        // подгружаем ветку
                        $.ajax({
                            type: "GET",
                            url: "/handlers/esud/get_full_tree/"+new_elem.get("_id"),
                            timeout: 55000,
                            contentType: 'application/json',
                            dataType: 'json',
                            async:true
                            }).done(function(result) {
                                AppLoader.hide();
                                if(result['status']=="error")
                                    $.jGrowl('Ошибка выполнения операции. Подробности: ' + result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                                else
                                {
                                    self.addNode(result);
                                    var tree_elem = self.$el.find("table.treetable tr[data-id="+new_elem.get("_id")+"]");

                                    if(felem.length==0)
                                        self.$el.find("table.treetable tbody").prepend(tree_elem);
                                    else
                                        felem.after(tree_elem);
                                    self.repositionElements(new_elem.get("_id"), tree_elem.data("tt-id"));
                                }
                        }).error(function(){
                                $.jGrowl('Ошибка обновления дерева. Нажмите кнопку "Обновить" на панели инструментов. ', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                                AppLoader.hide();
                            });
                    },
                    error:function(model,response){
                        var err = JSON.parse(response.responseText);
                        $.jGrowl(err.error, { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                        AppLoader.hide();
                  },
                });
            }
            else
            {
                $.jGrowl('Данный объект не может быть помещен в изделие.', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                return;
            }
          }
        });

        // подключение правил для числовых полей
        this.$el.find('.is-diggit').numeric('');

        this.delegateEvents();
        this.counter = this.$el.find("table.treetable tr:last").data("tt-id")+1;

        // подсветка выделенной ветки
        if(this.cur_branch_id)
        {
            this.$el.find("table.treetable tr").addClass('opacity');
            this.highLightBranch(this.cur_branch_id);
        }

    },

    /**
     * Раскрытие элемента дерева
    **/
    onNodeExpand:function(e,a){
        var self = this;
        var openedItems = this.openedItems[this.currentItem.get('_id')];

        var newHistObject = {
            linkpath:$(a.row).data('linkpath'),
            id: $(a.row).data('id')
        };

        if($.map(openedItems, function(val) {return val.linkpath == newHistObject['linkpath'] && val.id == newHistObject['id'] ? val : null;}).length==0)
            openedItems.push(newHistObject);

        setTimeout(function(){
            var tableHeader = self.$el.find('.directory-tree-header');
            $(tableHeader).width(self.$el.find('table.treetable').width());
            self.$el.find('table.treetable').find('tr:first').find('td').each(function(index){
                $(tableHeader).find('th').eq(index).width($(this).width());
            });
        }, 10);

        // скачать узел с сервера, если требуется
        if($(a.row).data("needupdate") && !this.node_updating)
        {
            // находим конфигурации, которые требуется подгрузить
            var products_to_load = [];
            var products_tr = self.$el.find("table.treetable tr[data-tt-parent-id="+$(a.row).data("tt-id")+"]");
            $(products_tr).each(function(index){
                    if($(this).find(".cb-config").is(':checked'))
                        products_to_load.push($(this).data("id"));
            });
            if(products_to_load.length>0)
            {
                self.node_updating = true;
                AppLoader.show();
                $.ajax({
                    type: "POST",
                    url: "/handlers/esud/get_products_by_ids",
                    timeout: 55000,
                    contentType: 'application/json',
                    dataType: 'json',
                    data: JSON.stringify({'data':products_to_load}),
                    async:true
                    }).done(function(result) {
                        if(result['status']=="error")
                            $.jGrowl('Ошибка получения конфигураций модели. Подробности: ' + result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                        else
                        {
                            var nodeHtml = "";
                            var model_tr = self.$el.find("table.treetable tr[data-tt-id="+$(a.row).data("tt-id")+"]");
                            var node = self.getNodeById(self.treeData,model_tr.data("id"), model_tr.data("configpath"), model_tr.data("linkpath"));
                            node.node['need_update']=false;
                            node.children = result;
                            self.refreshParents();
                            var top =  self.$el.find(".tree-data").scrollTop();
                            var left = self.$el.find(".tree-data").scrollLeft();
                            self.node_updating = false;
                            self.render();
                            self.$el.find(".tree-data").scrollTop(top);
                            self.$el.find(".tree-data").scrollLeft(left);
                        }
                    }).error(function(){
                        $.jGrowl('Ошибка обновления дерева. Нажмите кнопку "Обновить" на панели инструментов. ', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                    }).always(function(){AppLoader.hide(); self.node_updating = false;});
            }
        }
    },
    /**
     * Сокрытие элемента дерева
    **/
    onNodeCollapse:function(e,a){
        // удаление элемента из внутренней истории
        var openedItems = this.openedItems[this.currentItem.get('_id')];
        var curLinkPath = $(a.row).data('linkpath');
        var curId = $(a.row).data('id');
        var j = 0;
        for(var i in openedItems)
        {
            if(openedItems[i]['linkpath'] == curLinkPath && openedItems[i]['id']==curId )
            {
                openedItems.splice(j, 1 );
                break;
            }
            j++;
        }

        var tableHeader = this.$el.find('.directory-tree-header');
        $(tableHeader).width(this.$el.find('table.treetable').width());
        this.$el.find('table.treetable').find('tr:first').find('td').each(function(index){
            //console.log($(this).width())
            $(tableHeader).find('th').eq(index).width($(this).width());
        });

    },

    /**
    *  добавить элемент
    **/
    addNode:function(child){
        //this.renderItem(child);
        // LEXA
        this.treeData.children.push(child);
        this.refreshParents();
        var html = $("<div></div>");
        this.renderItem({counter:{val:this.counter},parent_id:0,data:child,properties:[], parent_properties:[], product_id:null,product_linkpath:"",common_product_id:this.currentItem.get('_id')},html);
        html = html.html().replace(/^\s+|\s+$/gm,'');
        this.$el.find("table.treetable").treetable('loadBranch',null, html);
        this.$el.find("table.treetable").treetable('expandNode',this.counter);
        this.$el.find("table.treetable").treetable('collapseNode',this.counter);
        //this.treeData.children.push(child); LEXA
        this.counter = this.$el.find("table.treetable tr:last").data("tt-id")+1;
        this.resetAdditionalValues();
        this.delegateEvents();
    },

    /**
    * обновить скрытые значения
    **/
    resetAdditionalValues:function(){
        this.$el.find("select.value-val").each(function(){
            if(!$(this).val()){
                $(this).parents("td:first").addClass('custom-value');
            }
        });
    },

    repositionElements:function(elem_id, tree_id){
        var parent = this.$el.find('.tree-data').find("tr[data-tt-id="+tree_id+"]");
        // если вставили между узлом и его чайлдами
        if(parent.prev().length>0 && !parent.prev().data("tt-parent-id") && parent.next().length>0 && parent.next().data("tt-parent-id")){
            while(parent.next().length>0 && parent.next().data("tt-parent-id")){
                parent.next().after(parent);
            }
        }

        var child = this.$el.find('.tree-data').find("tr[data-tt-parent-id="+tree_id+"]:first");
        if(child.length>0){
            var inds = [tree_id, child.data("tt-id")];
            var treechild_list = [child];
            while(true){
                var nextelem = child.next();
                if(nextelem.length>0 && nextelem.prop("tagName").toLowerCase()=="tr" && inds.indexOf(nextelem.data("tt-parent-id"))>=0){
                    inds.push(nextelem.data("tt-id"));
                    treechild_list.push(nextelem);
                    child = nextelem;
                }else
                    break;
            }
            var next = parent;
            for(var i in treechild_list){
                next.after(treechild_list[i]);
                next = treechild_list[i];
            }
        }

        var new_data_items = [];
        this.$el.find("table.treetable tr:not([data-tt-parent-id])").each(function(index){
            var item_id = $(this).data('id');
            new_data_items.push({"_id":item_id,"routine":index});
        });
        AppLoader.show();
       // сохранить данные
        $.ajax({
            type: "PUT",
            url: "/handlers/esud/updateposition",
            data: JSON.stringify(new_data_items),
            timeout: 55000,
            contentType: 'application/json',
            dataType: 'json',
            async:true
            }).done(function(result) {
        }).always(function(){
            AppLoader.hide();
        });
    },

    /**
     * Событие ввода значения в свойство
    **/
    onInputKeyPress:function(e){
        //if(e.keyCode==13)
         //   $(e.currentTarget).change();
    },

    /**
     * Событие смены значения свойства
     * Вызывается только на смену значения объема для конфигураций
    **/
    onPropertyChange:function(e){
        var self = this;
        var changed_elem = $(e.currentTarget);
        $(e.currentTarget).removeClass('err');
        var curVal = $(e.currentTarget).val();

        if($(e.currentTarget).hasClass('is-diggit'))
        {
            var curVal = parseInt(curVal);
            if(isNaN(curVal))
            {
                $.jGrowl('Поле является числовым. Введите корректное значение. ', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                $(e.currentTarget).addClass('err');
                return;
            }
            else if(curVal<=0)
            {
                $.jGrowl('Количество должно быть больше нуля. ', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                $(e.currentTarget).addClass('err');
                return;
            }
        }
        var tr = $(e.currentTarget).parents("tr:first");
        // если изменилось значение, смотрим присвоенную ему единицу измерения
        if($(e.currentTarget).prop("tagName").toLowerCase()=="select" && $(e.currentTarget).hasClass("value-val"))
        {
            var valueid = $(e.currentTarget).val();
            var node = null;
            if(valueid){
                node = this.getNodeById(this.treeData,valueid,tr.data("configpath"), tr.data("linkpath"));
                tr.find("td.value").removeClass("custom-value");
            }
            else
                tr.find("td.value").addClass("custom-value");
            if(node && node['node'].selfunit){
                tr.find(".unit-val").val(node['node'].selfunit['_id']);
                tr.find(".unit-val").prop("disabled",true);
            }else
                tr.find(".unit-val").prop("disabled",false);
        }

        var value = this.getValue(tr.find(".value-val"));
        var unit = this.getValue(tr.find(".unit-val"));
        var config_path = tr.data("configpath");

        var prop_node = this.getNodeById(this.treeData, tr.data("id"),config_path, tr.data("linkpath"));
        var data = {'elem_id':self.currentItem.get("_id"),'property_id':tr.data("id"), 'property_origin_id': tr.data('linktooriginobject'),  'configuration_path': config_path, 'linkpath':tr.data('linkpath'), 'value': value, 'unit':unit, 'type': 'config'};

        if(prop_node['node']['type']=='product_model' && ('need_configuration' in prop_node && prop_node['need_configuration']))
        {
            var sel_configurations = [];
            var tmp_config = this.getNodeSelectedConfigs(prop_node);
            if(tmp_config && tmp_config['product_configs'])
                sel_configurations = tmp_config['product_configs'];
            data['product_configs'] = sel_configurations;
        }

        // сохранение параметров
        $.ajax({
            type: "POST",
            url: "/handlers/esud/save_property",
            data: JSON.stringify(data),
            timeout: 55000,
            contentType: 'application/json',
            dataType: 'json',
            async:true
        }).done(function(result) {
               if(result['status']=="error")
                    $.jGrowl('Ошибка сохрнения данных. Повторите попытку. ', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
               else
               {

                    //----------------------
                    // сохранение в истории изменения
                    if(!self.currentItem.get('history'))
                        self.currentItem.set('history',[])
                    var history = self.currentItem.get('history');
                    history.push({'data':self.currentItem.get('properties')});
                    self.currentItem.set('history', history)
                    // обновить хлебные крошки
                    self.$el.trigger('updateBreadCrumpsView', [self.currentItem]);
                    //----------------------------------------------

                    $.jGrowl('Данные успешно сохранены. ', { 'themeState':'growl-success', 'sticky':false, life: 5000 });
                    self.treeData.node.properties = result['data'];
                    self.currentItem.set('properties',result['data'])
                    // перерисовываем, если поменялись чекбоксы. иначе оставляем, как есть
                    if(changed_elem.prop("tagName")=="INPUT" && changed_elem.attr('type')=="checkbox")
                    {
                        // рендеринг новых данных
                        var top =  self.$el.find(".tree-data").scrollTop();
                        var left = self.$el.find(".tree-data").scrollLeft();
                        self.render();
                        self.$el.find(".tree-data").scrollTop(top);
                        self.$el.find(".tree-data").scrollLeft(left);
                    }
                }
        });
    },

    /**
    * Функция смены значения в блоке условия
    **/
    onValueForConditionChecked:function(e)
    {
        var changed_elem = $(e.currentTarget);
        var cb = $(e.currentTarget);
        var tr = $(cb).parents("tr:first");
        var self = this;
        // получаем модель
        var model_tr = self.$el.find("table.treetable tr[data-tt-id="+tr.data("tt-parent-id")+"]");
        var node = self.getNodeById(self.treeData,model_tr.data("id"),model_tr.data("configpath"), model_tr.data("linkpath"));
        var config_path = model_tr.data("configpath");
        var linkpath =  model_tr.data("linkpath")?model_tr.data("linkpath")+'-'+model_tr.data("id"):model_tr.data("id");// tr.data("linkpath");

        var all_checks = [];
        self.$el.find("table.treetable tr[data-tt-parent-id="+tr.data("tt-parent-id")+"] input.cb-condition:checked").each(function(){
            var tr = $(this).parents("tr:first");
            all_checks.push({'id':tr.data('id'),'linkpath':tr.data('linkpath'),'configuration_path':tr.data('configpath')});
        });

        /*var action = 'add';
        // если сняли чекбокс со значения условия
        if(!$(e.currentTarget).is(":checked"))
            action = 'remove';*/

        //AppLoader.show();
        // сохраняем значение выбранного элемента
        $.ajax({
            type: "POST",
            url: "/handlers/esud/save_condition_value",
            data: JSON.stringify({'data': {'elem_id':self.currentItem.get("_id"),'condition_id':model_tr.data("id"), 'configuration_path': config_path, 'linkpath':linkpath, 'condition_values': all_checks, 'type':'condition'}}),
            timeout: 55000,
            contentType: 'application/json',
            dataType: 'json',
            async:true
            }).done(function(result) {
               if(result['status']=="error")
               {
                    $.jGrowl('Ошибка сохрнения данных. Повторите попытку. ', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                    $(cb).prop('checked', !$(cb).prop('checked'));
                    AppLoader.hide();
                }
                else{

                     //----------------------
                    // сохранение в истории изменения
                    if(!self.currentItem.get('history'))
                        self.currentItem.set('history',[])
                    var history = self.currentItem.get('history');
                    history.push({'data':self.currentItem.get('properties')});
                    self.currentItem.set('history', history)
                    // обновить хлебные крошки
                    self.$el.trigger('updateBreadCrumpsView', [self.currentItem]);
                    //----------------------------------------------


                    $.jGrowl('Данные успешно сохранены. ', { 'themeState':'growl-success', 'sticky':false, life: 5000 });
                    self.treeData.node.properties = result['data'];
                    self.currentItem.set('properties',result['data'])

                    // перерисовываем, если поменялись чекбоксы. иначе оставляем, как есть
                    if(changed_elem.prop("tagName")=="INPUT" && changed_elem.attr('type')=="checkbox")
                    {
                        // рендеринг новых данных
                        var top =  self.$el.find(".tree-data").scrollTop();
                        var left = self.$el.find(".tree-data").scrollLeft();
                        self.render();
                        self.$el.find(".tree-data").scrollTop(top);
                        self.$el.find(".tree-data").scrollLeft(left);
                    }
                }
            }).error(function(){
                    $.jGrowl('Ошибка сохрнения данных. Повторите попытку.', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
            }).always(function(){AppLoader.hide();});
    },

    /**
    * Функция возврата свойства к оригинальным значениям, заданным на корневом уровне
    **/
    onReturnToOriginalValues:function(e)
    {
        var self = this;
        var changed_elem = $(e.currentTarget);
        var tr = $(e.currentTarget).parents("tr:first");
        var model_tr = self.$el.find("table.treetable tr[data-tt-id="+tr.data("tt-parent-id")+"]");
        var node = self.getNodeById(self.treeData,model_tr.data("id"),model_tr.data("configpath"),model_tr.data("linkpath"));
        var config_path = tr.data("configpath");
        var linkpath = tr.data("linkpath");
        var datalink = tr.data("datalink");

        var data = {'type':'property_value','elem_id':self.currentItem.get("_id"), 'datalink':datalink,'property_id':tr.data("id"),'property_origin_id': tr.data('linktooriginobject'),'configuration_path': config_path,'linkpath':linkpath};

        //AppLoader.show();
         $.ajax({
            type: "POST",
            url: "/handlers/esud/return_property_to_origin_value",
            data: JSON.stringify({'data':data}),
            timeout: 55000,
            contentType: 'application/json',
            dataType: 'json',
            async:true
            }).done(function(result) {
               if(result['status']=="error")
               {
                    $.jGrowl('Ошибка сохрнения данных. Повторите попытку. ', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                    AppLoader.hide();
                }
                else{
                    $.jGrowl('Операция успешно завершена. ', { 'themeState':'growl-success', 'sticky':false, life: 5000 });
                    self.treeData.node.properties = result['data'];
                    // рендеринг новых данных
                    var top =  self.$el.find(".tree-data").scrollTop();
                    var left = self.$el.find(".tree-data").scrollLeft();
                    self.render();
                    self.$el.find(".tree-data").scrollTop(top);
                    self.$el.find(".tree-data").scrollLeft(left);
                }
            }).error(function(){
                    $.jGrowl('Ошибка сохрнения данных. Повторите попытку.', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
            }).always(function(){AppLoader.hide();});
    },

    /**
    * Функция смены значения в блоке свойств
    **/
    onValueForPropertyChecked:function(e)
    {
        //var cb = $(e.currentTarget).parents("tr:first");
        var changed_elem = $(e.currentTarget);
        var tr = $(e.currentTarget).parents("tr:first");
        var cb = tr.find("input.cb-propvalue");
        var self = this;
        var model_tr = self.$el.find("table.treetable tr[data-tt-id="+tr.data("tt-parent-id")+"]");
        var node = self.getNodeById(self.treeData,model_tr.data("id"),model_tr.data("configpath"),model_tr.data("linkpath"));
        //var node = self.getNodeById(self.treeData,tr.data("id"),tr.data("configpath"), tr.data("linkpath"));
        var config_path = tr.data("configpath");
        var linkpath = tr.data("propertylinkpath");
        var datalink = tr.data("datalink");

        var action = 'add';

        /*if(!cb.is(":checked"))
            action = 'remove'; */
        if(cb.prop("type")=='radio'){
            action = "reset";
        }
        var data = {'type':'property_value','elem_id':self.currentItem.get("_id"), datalink:datalink,'property_id':tr.data("property-id"),'property_origin_id': tr.data('property-originid'),'configuration_path': config_path,'linkpath':linkpath};
        data.value = this.getValue(tr.find(".value-val"));// {'id':tr.data("id"),'value':tr.find(".name").text()};
        data.unit = this.getValue(tr.find(".unit-val"));
        if(data.value && data.value.value)
        {
            if(data.value.value.indexOf('[З]&nbsp;')==0)
                data.value.value = data.value.value.replace('[З]&nbsp;','');
            else if(data.value.value.indexOf('=')==0)
            {
                data.value.value = Routine.trim(data.value.value).replace('.',',');
                $(changed_elem).val(data.value.value);
            }
        }


        // сохраняем значение выбранного элемента
        $.ajax({
            type: "POST",
            url: "/handlers/esud/save_property_value",
            data: JSON.stringify({'action':action, 'data':data}),
            timeout: 55000,
            contentType: 'application/json',
            dataType: 'json',
            async:true
            }).done(function(result) {
               if(result['status']=="error")
               {
                    $.jGrowl('Ошибка сохрнения данных. Повторите попытку. ', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                    $(cb).prop('checked', !$(cb).prop('checked'));
                    AppLoader.hide();
                }
                else{

                     //----------------------
                    // сохранение в истории изменения
                    if(!self.currentItem.get('history'))
                        self.currentItem.set('history',[])
                    var history = self.currentItem.get('history');
                    history.push({'data':self.currentItem.get('properties')});
                    self.currentItem.set('history', history)
                    // обновить хлебные крошки
                    self.$el.trigger('updateBreadCrumpsView', [self.currentItem]);
                    //----------------------------------------------


                    $.jGrowl('Данные успешно сохранены. ', { 'themeState':'growl-success', 'sticky':false, life: 5000 });
                    self.treeData.node.properties = result['data'];
                    self.currentItem.set('properties',result['data'])

                    // если меняли значение у свойства вложенной конфигурации, то необходимо показать кнопку
                    // возврата к оригинальным значениям
                    if(config_path)
                        $(tr).prev().find('.lnk_return_to_original_values').show();

                    // перерисовываем, если поменялись чекбоксы. иначе оставляем, как есть
                    if((changed_elem.prop("tagName")=="INPUT" && (changed_elem.attr('type')=="checkbox" || changed_elem.attr('type')=="radio")) || changed_elem.hasClass("unit-val"))
                    {
                        // рендеринг новых данных
                        var top =  self.$el.find(".tree-data").scrollTop();
                        var left = self.$el.find(".tree-data").scrollLeft();
                        self.render();
                        self.$el.find(".tree-data").scrollTop(top);
                        self.$el.find(".tree-data").scrollLeft(left);
                    }else
                    // для input-ов меняем значение в property
                    if(changed_elem.prop("tagName")=="INPUT" && changed_elem.attr('type')=="text" && changed_elem.hasClass("value-val"))
                    {
                        var property_tr = changed_elem.parents("tr:first").prevAll("tr[data-id="+changed_elem.parents("tr:first").data('propertyId')+"]:first").find("span.value-val-prop");
                        if(property_tr.text()!="Несколько значений")
                            property_tr.html(changed_elem.val());
                    }
                }
            }).error(function(){
                    $.jGrowl('Ошибка сохрнения данных. Повторите попытку.', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
            }).always(function(){AppLoader.hide();});
    },

    /**
    * Функция смены конфигурации(ДСЕ) для модели
    **/
    onProductForModelChecked:function(e){
        var cb = $(e.currentTarget);
        var tr = $(cb).parents("tr:first");
        var self = this;
        // получаем модель
        var model_tr = this.$el.find("table.treetable tr[data-tt-id="+tr.data("tt-parent-id")+"]");
        var node = this.getNodeById(this.treeData,model_tr.data("id"),model_tr.data("configpath"), model_tr.data("linkpath"));
        var config_path = tr.data("configpath");
        var action = 'add';
        // если сняли чекбокс со значения условия
        if(!$(e.currentTarget).is(":checked"))
            action = 'remove';
        // несколько конфигураций можно задать, если только в модели конфигураций есть блок условий
        // данное правило не дайствует, если  родитель модели для которой происходит выбор конфигурации
        // является обобщающей моделью - "покупные аналоги"
        if(action=='add' && node.children.length>0)
        {
            // проверка парента модели, для которой идет назначение конфигурации
            // для обобщающей модели(покупные аналоги), проверка на условия не требуется
            // также для таких групп нет необходимости
            prNode = node.parent_node;
            if(!prNode || !prNode['node']['is_buy_group'])
            {
                var has_condition = false;
                for(var i in node.origin_children)
                {
                    if(node.origin_children[i]['node']['type']=='condition' && (!node.origin_children[i]['node']['status'] || node.origin_children[i]['node']['status']!='del'))
                    {
                        has_condition = true;
                        break;
                    }
                }
                /*if(!has_condition)
                {
                    $.jGrowl('Для данной модели не созданы условия. Несколько ДСЕ, можно назначить только при наличии блока условия.', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                    $(cb).prop('checked', false);
                    return;
                }*/
            }
        }
        AppLoader.show();
         // сохраняем значение выбранного элемента
        $.ajax({
            type: "POST",
            url: "/handlers/esud/save_product_configuration",
            data: JSON.stringify({'type':'config','action':action, 'data': {'elem_id':self.currentItem.get("_id"),'property_id':model_tr.data("id"), 'configuration_path': config_path, 'linkpath':model_tr.data('linkpath'), product_config: tr.data("id")}}),
            timeout: 55000,
            contentType: 'application/json',
            dataType: 'json',
            async:true
        }).done(function(result) {
           if(result['status']=="error")
                $.jGrowl('Ошибка сохрнения данных. Повторите попытку. ', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
           else
           {
                //----------------------
                // сохранение в истории изменения
                if(!self.currentItem.get('history'))
                    self.currentItem.set('history',[])
                var history = self.currentItem.get('history');
                    history.push({'data':self.currentItem.get('properties')});
                    self.currentItem.set('history', history)
                // обновить хлебные крошки
                self.$el.trigger('updateBreadCrumpsView', [self.currentItem]);
                //----------------------------------------------

                $.jGrowl('Данные успешно сохранены. ', { 'themeState':'growl-success', 'sticky':false, life: 5000 });
                self.treeData.node.properties = result['data'];
                self.currentItem.set('properties',result['data'])
                // рендеринг новых данных
                var top =  self.$el.find(".tree-data").scrollTop();
                var left = self.$el.find(".tree-data").scrollLeft();
                self.render();
                self.$el.find(".tree-data").scrollTop(top);
                self.$el.find(".tree-data").scrollLeft(left);
                // в случае добавления новой конфигурации необходимо подгрузить ее содержимое
                if(action=='add')
                {
                     AppLoader.show();
                     $.ajax({
                        type: "GET",
                        url: "/handlers/esud/get_full_tree/"+tr.data("id"),
                        timeout: 55000,
                        contentType: 'application/json',
                        dataType: 'json',
                        async:true
                        }).done(function(result) {
                            if(result['status']=="error")
                                $.jGrowl('Ошибка получения данных конфигурации. Подробности: ' + result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                            else
                            {
                                $.jGrowl('Данные по конфигурации успешно получены. ', { 'themeState':'growl-success', 'sticky':false, life: 5000 });
                                var nodeHtml = "";
                                var parent_id = tr.data("tt-id");
                                var parentNode = self.getNodeById(self.treeData,tr.data("id"),tr.data("configpath"), tr.data("linkpath"));
                                // посик в чилдренах пришедшего с сервера изделия и подмена его на новое
                                var product_in_children = false;
                                if(node.children && node.children.length>0)
                                {
                                    for(var n_child_i in node.children)
                                    {
                                        var n_child = node.children[n_child_i];
                                        if(n_child['node']['_id'] == tr.data("id"))
                                        {
                                            n_child = result;
                                            product_in_children = true;
                                            break;
                                        }
                                    }
                                }
                                else
                                    node.children = []
                                if(!product_in_children)
                                    node.children.push(result);

                                //node.children = [result];
                                self.refreshParents();
                                // рендеринг новых данных
                                var top =  self.$el.find(".tree-data").scrollTop();
                                var left = self.$el.find(".tree-data").scrollLeft();
                                self.render();
                                self.$el.find(".tree-data").scrollTop(top);
                                self.$el.find(".tree-data").scrollLeft(left);
                                //------------------------------------------------------------------------
                            }
                    }).error(function(){
                            $.jGrowl('Ошибка обновления дерева. Нажмите кнопку "Обновить" на панели инструментов. ', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                    }).always(function(){AppLoader.hide();});
                }
                else
                {
                    // удаление конфигурации из чилдренов модели
                    //tr.data("id")}
                    var new_children = [];
                    if(node.children && node.children.length>0)
                    {
                        for(var n_child_i in node.children)
                        {
                            var n_child = node.children[n_child_i];
                            if(n_child['node']['_id'] != tr.data("id"))
                                new_children.push(n_child);
                        }
                        node.children = new_children;
                    }
                }
           }
        }).always(function(){AppLoader.hide();});
    },

    getValue:function(elem){
        if(elem.length==0)
            return {id:null,value:null};
        switch(elem.prop("tagName").toLowerCase())
        {
            case "span":
                return {id:elem.data('id'),value:elem.html()};
            case "input":
                return {id:elem.data("id"),value:elem.val()};
            case "select":
                if(elem.hasClass("value-val") && !elem.val())
                    return {id: elem.val(), value: elem.parent().find(".additional-value").val()};
                else
                    return {id: elem.val(), value: elem.find("option:selected").html()};
        }
        return {id:null,value:null};
    },

    /**
     * Событие на выделение элемента
    **/
    itemSelect: function(event, model, status)
    {
        this.$el.find("table.treetable tr.selected").removeClass('selected');
        if(status)
        {
            //this.$(".directory-table tr.selected").removeClass('selected');
            this.$el.find("table.treetable tr[data-id="+model['_id']+"]").addClass("selected");
            this.selectedItem = model;
        }
        else{
            this.selectedItem = null;
        }
    },

    /**
     * Событие на сортировку
    **/
    doSort: function(event, val)
    {
        this.sort = val;
        if(this.treeData){
            // вызвать функцию сортировки
            var top =  this.$el.find(".tree-data").scrollTop();
            var left = this.$el.find(".tree-data").scrollLeft();
            this.render();
            this.$el.find(".tree-data").scrollTop(top);
            this.$el.find(".tree-data").scrollLeft(left);
        }
    },

    /**
     * Удаление элемента из дерева и БД
    **/
    itemRemove:function(e,a){
        AppLoader.show();
        // сначала удаляем из базы элемент
        var self = this;

         $.ajax({
            type: "DELETE",
            url: "/handlers/esud/remove_treeelem",
            data: JSON.stringify({'parent_id':this.currentItem.get("_id"), 'elem_id':this.selectedItem['_id'] }),
            timeout: 55000,
            contentType: 'application/json',
            dataType: 'json',
            async:true
            }).done(function(result) {
               if(result['status']=="error")
                   $.jGrowl('Ошибка обновления данных. Подробности: ' + result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 5000 });
               else{
                    // помечаем в основной коллекции элемент, как удаленный
                    var el = App.dataCollection.get(self.selectedItem['_id']);
                    if(el)
                        el.set('status','del');
                    // убираем элемент из дерева
                    var tr_id = self.$el.find("table.treetable tr[data-id="+self.selectedItem['_id']+"]").data("tt-id");
                    self.$el.find("table.treetable").treetable('removeNode',tr_id);
                    self.$el.trigger("itemSelect",[null]);
               }
        }).always(function(){
            AppLoader.hide();
        });
    },

    onBranchClick:function(e){
        var tr = $(e.currentTarget);
        var id = tr.data("id");
        var el = null;
        for(var i in this.treeData.children){
            if(this.treeData.children[i].node['_id']==id){
                el = this.treeData.children[i].node;
                break;
            }
        }
        this.$el.trigger("itemSelect",[el, true]);
    },

    /**
    ** Клик по названию ветки
    **/
    onItemNameClick:function(e){
        var tr = $(e.currentTarget).parents("tr:first");
        var id = tr.data("tt-id");
        var _id = tr.data("id");
        var name = tr.find('span.name').html();
        var el = null;

        if(e.ctrlKey && e.altKey)
            bootbox.alert('<b>' + name +  '</b><br/><br/>ID: ' + _id);//.find("div.modal-dialog").addClass("confirmWidth");
        else if(e.shiftKey)
        {
            // сюда вставить код раскрытия всех веток дерева
            // действует на все кроме моделей изделий, так как они грузят конфигурации с сервера
            var node = this.getNodeById(this.treeData,tr.data("id"),tr.data("configpath"), tr.data("linkpath"));
            if(node/* && node['node']['type']!="product_model"*/)
            {
                var childs = this.$el.find("table.treetable").treetable('getNodeChildren',id);
                if(childs && childs.length>0)
                {
                    var operation = ($(tr).hasClass('expanded'))?"collapseNode":"expandNode";
                    for(var i in childs)
                        this.$el.find("table.treetable").treetable(operation,childs[i]);
                }
            }
        }
        else if(e.ctrlKey)
        {
            if(this.cur_branch_id == id)
            {
                this.$el.find("table.treetable tr").removeClass('opacity');
                this.cur_branch_id = null;
            }
            else
            {
                this.cur_branch_id = id;
                this.$el.find("table.treetable tr").addClass('opacity');
                this.highLightBranch(id);
            }
        }
        else
        {
             if($(tr).hasClass('expanded') )
             {
                this.$el.find("table.treetable").treetable('collapseNode',id);
                this.$el.trigger("node:collapse",[this.$el.find("table.treetable").treetable('getNode',id)]);
             }
             else
             {
                this.$el.find("table.treetable").treetable('expandNode',id);
                this.$el.trigger("node:expand",[this.$el.find("table.treetable").treetable('getNode',id)]);
             }
        }
    },

    highLightBranch: function(branch_id)
    {
        var self = this;
        var childs = this.$el.find("table.treetable").treetable('getNodeChildren',branch_id);
        if(childs && childs.length>0)
        {
            var search_string = "tr[data-tt-id=" + childs.join("], tr[data-tt-id=")  + "]";
            this.$el.find('.tree-data').find(search_string).removeClass('opacity');
        }
    },

    /**
     * Событие добавления нового элемента в коллекцию
    **/
    onAddNewItemToCollection:function(model)
    {
        //this.render();
    },

     /**
     * Обработка события клика по иконке перехода к элементу в соседнем окне
    **/
    onItemIconClick: function(e){
            var tr = $(e.currentTarget).parents('tr:first');
            var sub_id = tr.data("sub_id");
            //console.log(sub_id);
            //var id = tr.data("linktooriginobject");
            var id = ((sub_id)?sub_id: $(e.currentTarget).data('link'));
            $(this.el).trigger('openItem', [new App.Models.ItemModel({_id:id, id:id}),true]);
    },

    /**
    * получить ветку из дерева по его идентификатору
    **/
    // FIXED 20.01.2015
    getNodeById:function(node, id, config_path, linkpath){
        if(node['node']['_id']==id && node['configuration_path']==config_path && node['linkpath']==linkpath)
            return node;
        for(var c in node.children){
            var res = this.getNodeById(node.children[c],id, config_path, linkpath);
            if(res)
                return res;
        }
        return null;
    },
    // сохранить галочку "Опции"
    onOptionChange:function(e){
         var changed_elem = $(e.currentTarget);
        var tr = $(e.currentTarget).parents("tr:first");
        var cb = tr.find("input.cb-option");
        var self = this;
        var model_tr = self.$el.find("table.treetable tr[data-tt-id="+tr.data("tt-parent-id")+"]");
        var node = self.getNodeById(self.treeData,model_tr.data("id"),model_tr.data("configpath"),model_tr.data("linkpath"));
        var property_node = self.getNodeById(self.treeData,tr.data("property-id"),model_tr.data("configpath"),model_tr.data("linkpath"));
        var config_path = tr.data("configpath");
        var linkpath = tr.data("propertylinkpath");
        var datalink = tr.data("linkpath");
        var action = cb.is(":checked")?'remove':"add";
        AppLoader.show();
        var data = {'type':'property_value', 'not_reset':true, 'elem_id':self.currentItem.get("_id"), datalink:datalink,'property_id':tr.data("property-id"),'property_origin_id': tr.data('property-originid'),'configuration_path': config_path,'linkpath':linkpath};
        data.value = {id:tr.data('id'), value:cb.is(":checked")?"on":"off"};
        data.unit = {id:null, value:null};
        // сохраняем значение выбранного элемента
        $.ajax({
            type: "POST",
            url: "/handlers/esud/save_property_value",
            data: JSON.stringify({'action':action, 'data':data}),
            timeout: 55000,
            contentType: 'application/json',
            dataType: 'json',
            async:true
            }).done(function(result) {
               if(result['status']=="error")
               {
                    $.jGrowl('Ошибка сохрнения данных. Повторите попытку. ', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
                    $(cb).prop('checked', !$(cb).prop('checked'));
                    AppLoader.hide();
                }
                else{
                    //----------------------
                    // сохранение в истории изменения
                    if(!self.currentItem.get('history'))
                        self.currentItem.set('history',[])
                    self.currentItem.get('history').push({'data':self.currentItem.get('properties')});
                    self.currentItem.set('history', self.currentItem.get('history') );
                    // обновить хлебные крошки
                    self.$el.trigger('updateBreadCrumpsView', [self.currentItem]);
                    //----------------------------------------------
                    $.jGrowl('Данные успешно сохранены. ', { 'themeState':'growl-success', 'sticky':false, life: 5000 });
                    self.treeData.node.properties = result['data'];
                    if(property_node){
                        property_node.node.is_optional = cb.is(":checked");
                        // рендеринг новых данных
                        var top =  self.$el.find(".tree-data").scrollTop();
                        var left = self.$el.find(".tree-data").scrollLeft();
                        self.render();
                        self.$el.find(".tree-data").scrollTop(top);
                        self.$el.find(".tree-data").scrollLeft(left);
                    }
                }
            }).error(function(){
                    $.jGrowl('Ошибка сохрнения данных. Повторите попытку.', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
            }).always(function(){AppLoader.hide();});
    }
});
