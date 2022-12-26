///
/// Представление контрола списка задействованных шаблонов раскроя
/// view_modes - edit_plan/readonly_plan/edit_fact
///
App.Views.UsedTemplatesListView = Backbone.View.extend({
    is_opened: false,
    hide_empty: false,
    transparent_empty: false,
    openedItems:{}, // список идентификаторов участков, которые необходимо раскрыть/скрыть
    view_mode: 'readonly_plan', // текущее состояние блока
    events:{
         'click .btn-start-planing-by-templates': 'onStartPlaning',
         'click .btn-calculate-by-specifications': 'onCalculate',
         'click .btn-clear-templates': 'onClearTemplates',
         'click .btn-cancel-templates': 'onCancelTemplates',
         'click .btn-calculate-by-templates': 'onCalculateTemplates',
         'click .cb-hide-empty-templates': 'onHideEmpty',
         'click .sector-templates-cb-item': 'onClickPlus',
         //--------
         'itogo:refresh': 'renderItogo'
    },
    templates: {
        sector:_.template($("#TemplateSectorItemView").html()),
        print:_.template($("#cutTemplatesPrintVersionTemplate").html()),
        itogo: _.template($("#TemplateItogoView").html()),
    },

    initialize: function(){
        this.openedItems = {};
        this.show_sector_level = this.options['show_sector_level'];
        this.view_mode = this.options['view_mode'] || 'readonly_plan';
        this.collection.bind("change", this.colletion_changed, this);
        this.collection.bind("render", this.render, this);
    },

    /**
     * Активация/деактивация
    **/
    enable: function(value)
    {
         this.$el.find('.tb, .btn').prop('disabled', !value);
    },

    /**
      * Обработка раскрытия/сокрытия узлов дерева
    **/
    onClickPlus: function(e)
    {
        var self = this;
        this.openedItems[$(e.currentTarget).prop('name')] = $(e.currentTarget).prop('checked');
    },

    /**
    ** Обработка события изменения данных в коллекции
    **/
    colletion_changed: function(){
        if(!this.transparent_empty)
        {
            for(var i in this.items)
                this.items[i].make_empty_transparent();
            //this.$('.lbl-template-item').addClass('transparent');
        }
        this.transparent_empty = true;
    },

   /**
     * Скрыть незаполненные поля ввода
    **/
    onHideEmpty: function(e)
    {
        this.hide_empty = $(e.currentTarget).prop('checked');
        this.hideEmpty(this.hide_empty);
    },
    hideEmpty: function(val)
    {
        this.$el.find('.cb-hide-empty-templates').prop('checked', val);
        for(var i in this.items)
            this.items[i].hide_if_empty(val);
    },

    /**
     * Отрисовка версии для печати
    **/
    renderPrintVersion: function(){
        if(this.collection.length==0)
            return "";

        // сортировка коллекции по размерности спецификаций
        this.collection.sortBy("sector_id", "routine", "name");
        var res = $(Routine.trim(this.templates.print({'data': this.collection.toJSON()})));
        return res;
    },

    /**
     * Отрисовка блока ИТОГО
    **/
    renderItogo: function(e)
    {
        // объект для посдсчета ИТОГО
        var itogo = { 'plan': 0, 'fact': 0, 'in_calculate': 0 };

        _.each(this.collection.models, function (item) {
            itogo['plan'] += item.get('qty');
            itogo['fact'] += item.get('fact_count');
            itogo['in_calculate'] += item.get('count');
        }, this);

        // добавление блока ИТОГО
        var itogo_view =  $(Routine.trim(this.templates.itogo(itogo)));

        if(this.$el.find('.itogo-view').length>0)
            this.$el.find('.itogo-view').replaceWith(itogo_view);
        else
            this.$el.find('.templates-list').append(itogo_view);
    },

    /**
     * Отрисовка всего списка
    **/
    render: function()
    {
        var self = this;
        // Очистка формы
        this.clear();

        // если нет шаблонов по данному участку, то скрываем их
        if(this.collection.length==0){
            this.$el.hide();
            return;
        }

        // сортировка коллекции по размерности спецификаций
        this.collection.sortBy("sector_id", "routine", "name");
         // если необходимо показывать уровень участков, то сначала данные группируем по участкам
         if(this.show_sector_level)
         {
            var cur_sector_id = null;
            var i = 0;
            var j = 0;
            var container = "";
            var guid = Guid.newGuid();
            _.each(this.collection.models, function (item) {
                if(cur_sector_id!=item.get('sector_id'))
                {
                    cur_sector_id=item.get('sector_id');
                    j = 0;
                    guid = Guid.newGuid();
                    var new_sector_view =  $(Routine.trim(this.templates.sector( {'i': i,'j': j,'guid': guid,'sector_name': item.get('sector_name'),'sector_id': item.get('sector_id')})));
                    this.$el.find('.templates-list').append(new_sector_view);
                    container = new_sector_view.find('ul');
                }
                self.renderItem(container, item, i, j, guid);
                i++;
                j++;
            }, this);
         }
         else
         {
            var i = 0;
             var guid = Guid.newGuid();
             var container = this.$el.find('.templates-list');
            _.each(this.collection.models, function (item) {
                self.renderItem(container, item, 0, i, guid);
                i++;
            }, this);
         }

        // добавление блока ИТОГО
        this.renderItogo();

        // делаем панель раскрывающуюся
        this.$('.collapsible').collapsible({
            collapse: function(e){
                self.is_opened = true;
            },
            expand: function(e){
                self.is_opened = false;
            }
        });
        if(this.is_opened)
            this.$('.collapsible').removeClass('collapsed').find('div:first').show();
        this.$('.transparent').removeClass('transparent');

        // раскрыть сохраненные ветки
        for(var i in this.openedItems)
        {
            if(this.openedItems[i])
                this.$el.find("input[name='"+i+"']").prop('checked', true);
        }

        //  скрыть пустые шаблоны
        this.hideEmpty(this.hide_empty);
        return this;
    },

    /**
     * Отрисовка элемента
    **/
    renderItem: function (container, item, i, j, guid) {
        var new_item =new App.Views.UsedTemplateItemView({model:item, index: j, parent_index: i, guid: guid, view_mode: this.view_mode });
        this.items.push(new_item);
        $(container).append(new_item.render().el);
    },

    /**
     * Очистка формы
    **/
    clear: function()
    {
        this.items = [];
        this.transparent_empty = false;
        this.$el.find('.templates-list').empty();
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
     **  Сбросить объемы по всем шаблонам
    **/
    onClearTemplates: function(e){
        var self = this;
        _.each(this.collection.models, function (model) {
            model.set('count',0, {'silent':true});
        });
        self.transparent_empty = false;
        self.render();
        //$('body').addClass('wait');
        //setTimeout(function(){
        //     // вызов тригера об очистки шаблонов раскроя
        //     $(self.el).trigger('templates:clear', null);
        // },200);
    },

    /**
     **  Отправить в рассчет выбранные шаблоны
    **/
    onCalculateTemplates: function(e){
        var self = this;
        var result = [];
        // пробегаем по всем шаблонам у которых задано значение - count
        _.each(this.collection.models, function (model) {
            if(model.get('count')>0)
                result.push(model);
        });
        // проверяем, есть ли кто на рассчет
        if(result.length==0)
        {
            $.jGrowl('Ошибка! Не заданы шаблоны по которым необходимо произвести рассчет.', {'themeState':'growl-error', 'sticky':false, life: 10000 });
            return;
        }
        $('body').addClass('wait');
        setTimeout(function(){
            // вызов тригера о применении шаблонов расскроя
            $(self.el).trigger('templates:apply', [result]);
            self.activateMode('readonly_plan')
        },100);
    },

    /**
     **  Событие начала планирования шаблонами
    **/
    onStartPlaning: function(e){
        var self = this;
        bootbox.confirm("Используется планирование от изделий. Применение шаблонов рассчитывается автоматически. Внимание! При расчете изделий от шаблонов введённые данные в поле «Количество» будут изменены!", function(result)
        {
           if(result)
                self.activateMode('edit_plan')
        });
    },

    /**
     **  Выйти из режима планирования по шаблонам с отменой всех действий
    **/
    onCancelTemplates: function(e){
        // откатить данные
        _.each(this.collection.models, function (model) {model.reset();});
        this.activateMode('readonly_plan')
    },

    /**
     **  Переключение режима работы с блоком шаблонов
    **/
    activateMode: function(mode){
        switch(mode){
            case 'edit_plan':
                    Routine.showBackLayer();
                    this.view_mode = "edit_plan";
                    this.$el.find('.edit-state').show();
                    this.$el.find('.view-state').hide();
                    this.$el.css({'z-index' : '2000'});
                    this.transparent_empty = false;
                    this.render();
            break;
            case 'edit_fact':
            break;
            case 'readonly_plan':
                Routine.hideBackLayer();
                this.$el.css({'z-index' : '1000'});
                // изменить режим отображения
                this.view_mode = "readonly_plan";
                this.$el.find('.edit-state').hide();
                this.$el.find('.view-state').show();
                this.transparent_empty = false;
                this.render();
            break;
        }
    }
});

///
/// Представление элемента итоговой(заказной) спецификации
///
App.Views.UsedTemplateItemView = Backbone.View.extend({
    tagName:'li',
    className : 'h3 template-item',
    is_opened: false, // ветка раскрыта/закрыта
    templates: {
        item:_.template($("#TemplateItemPlanView").html()),
        readonly_item:_.template($("#TemplateItemPlanViewReadOnly").html()),
        fact_item:_.template($("#TemplateItemFactView").html()),
    },
    events:{
        'change .tb-template-count': 'onInputCountChange',
        'change .tb-template-fact-count': 'onInputFactCountChange',
        'click .cb-item': 'onClickPlus'
    },

    /**
     * Инициализация
    **/
    initialize: function()
    {
        this.model.bind("change", this.model_changed, this);
        this.model.bind("change:count", this.count_changed, this);
        this.model.bind("change:fact_count", this.count_changed, this);
        //--------
        this.index = this.options['index'];
        this.parent_index = this.options['index'];
        this.guid = this.options['guid'];
        this.view_mode = this.options['view_mode'] || 'readonly_plan';
    },

    /**
      * Обработка раскрытия/сокрытия узлов дерева
    **/
    onClickPlus: function(e)
    {
        this.is_opened = $(e.currentTarget).prop('checked');
    },

    /**
     * Удление представления
    **/
    unRender: function()
    {
        this.remove();
    },

    /**
    ** Скрыть если пучтой объем
    **/
    hide_if_empty: function(val){
        this.$el.show();
        if(val && this.model.get('count')==0)
            this.$el.hide();
    },

    /**
    ** Скрыть если пучтой объем
    **/
    make_empty_transparent: function(){
        if(this.model.get('count')==0)
        {
            this.$('.lbl-template-item').addClass('transparent');
            this.$('.ul-template-item').addClass('transparent');
        }
    },

     /**
     * Отрисовка элемента
    **/
    render: function () {

        switch(this.view_mode){
            case 'readonly_plan':
                this.$el.html(this.templates.readonly_item( $.extend({},this.model.toJSON(),{i:this.parent_index, j: this.index, guid: this.guid})));
            break;
            case 'edit_plan':
                this.$el.html(this.templates.item( $.extend({},this.model.toJSON(),{i:this.parent_index, j: this.index, guid: this.guid})));
            break;
            case 'edit_fact':
                this.$el.html(this.templates.fact_item( $.extend({},this.model.toJSON(),{i:this.parent_index, j: this.index, guid: this.guid})));
            break;
            default:
                this.$el.html(this.templates.readonly_item( $.extend({},this.model.toJSON(),{i:this.parent_index, j: this.index, guid: this.guid})));
            break;
        }
        this.$('.is-diggit').numeric({ negative: false, decimal: '' });
        if(this.is_opened)
            this.$el.find('.cb-item').prop('checked', true);
        return this;
    },

    /**
     * событие на смену данных модели
    **/
    model_changed: function()
    {
        this.render();
        // Backbone.trigger('itogo:refresh',[this]);
        $(this.el).trigger('itogo:refresh', [this]);
    },

    /**
     * событие на смену объема модели
    **/
    count_changed: function()
    {
        this.highlightElem();
        //Backbone.trigger('itogo:refresh',[this]);
        $(this.el).trigger('itogo:refresh', [this]);
    },

    /**
     ** Изменение количества необходимых шаблонов
    **/
    onInputCountChange: function(e){
        var val = Routine.strToInt(this.$el.find('.tb-template-count').val());
        var ballance = Routine.strToInt(this.model.get('qty'))- Routine.strToInt(this.model.get('fact_count'));
        if(val>ballance)
        {
            $.jGrowl('Ошибка!  Введенное значение превышает макмимально допустимое. Допустимое значение: ' + ballance.toString(), { 'themeState':'growl-error', 'sticky':false, life: 5000 });
            val = ballance;
        }
        this.$el.find('.tb-template-count').val(val);
        this.model.set('count', val);
        //Backbone.trigger('itogo:refresh',[this]);
        $(this.el).trigger('itogo:refresh', [this]);
    },

    /**
     ** Изменение фактического количества необходимых шаблонов
    **/
    onInputFactCountChange: function(e){
        var val = Routine.strToInt(this.$el.find('.tb-template-fact-count').val());
        if(val>this.model.get('count'))
        {
            $.jGrowl('Ошибка!  Введенное значение превышает макмимально допустимое. Допустимое значение: ' + this.model.get('count').toString(), { 'themeState':'growl-error', 'sticky':false, life: 5000 });
            val = this.model.get('count');
        }
        this.$el.find('.tb-template-fact-count').val(val);
        this.model.set('fact_count', val, {silent:true});
        // событие на смену фактового значения
        $(this.el).trigger('templates:change_fact_count', [this.model]);
        //Backbone.trigger('itogo:refresh',[this]);
        $(this.el).trigger('itogo:refresh', [this]);
    },

    /**
     * Событие подсветки элемента
    **/
    highlightElem:function()
    {
        var self= this;
        var item_ctrl = this.$el;
        item_ctrl.addClass("highlight");
        setTimeout(function(){item_ctrl.removeClass("highlight");},2000);
    },

});
