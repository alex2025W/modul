///
/// Модель элемента фильтра свойства
///
App.Models.FilterModelItem = Backbone.Model.extend({});
App.Models.FilterValueItem = Backbone.Model.extend({
    defaults:{
            'selected': false,
            'is_open': false
    },
});

App.Collections.FilterValueCollection = Backbone.Collection.extend({
        model: App.Models.FilterValueItem
});

App.Models.FilterPropertyItemModel = Backbone.Model.extend({
    defaults:{
            'selected': false,
    },
    initialize: function(){
        this.set('values', new App.Collections.FilterValueCollection(this.get('values')));
    }
});

App.Collections.FilterProppertyCollection = Backbone.Collection.extend({
        model: App.Models.FilterPropertyItemModel
});

///
/// Контрол управления списокм свойств модели в блоке фильтрации
///
App.Views.FilterModelPropertiesView = Backbone.View.extend({
    //el: $("#pnl_filter_model_properties"),
    parent_view: null, // родиетльское представление
    events:{
    },
    /**
    * Инициализация
    **/
    initialize: function()
    {
        this.parent_view = this.options.parent_view;
    },
    /**
    * Отрисовка
    * model_number - код модели
    * selected_items - {'_id': '', 'value':''}
    * callback - функция обратного вызова
    **/
    render:function(model_number, selected_items, callback)
    {
        this.clear();
        if(model_number)
        {
            //Routine.showLoader();
            $('body').addClass('wait');
            // загрузка всех свойств модели
           var self = this;
            $.ajax({
                type: "GET",
                url: "/handlers/esud/get_model_properties/" + model_number,
                timeout: 35000,
                contentType: 'application/json',
                dataType: 'json',
                async:true
            }).done(function(result) {
                    if(result['status']=="success")
                    {
                                self.model = new App.Models.FilterModelItem(result["data"]['properties']);
                                self.collection = new App.Collections.FilterProppertyCollection(self.model.get(['properties']));
                                // вызов обратной функции для передачи полученных параметров во внешний блок
                                if(callback)
                                    callback(result["data"]['parent_models']);

                                if(selected_items && selected_items.length>0)
                                {
                                    self.collection.models.forEach(function(model){
                                        for(var i in selected_items)
                                        {
                                            var sel_item = selected_items[i];
                                            if(sel_item['_id'] == model.get('_id') || sel_item['_id'] == model.get('datalink'))
                                            {
                                                model.set('selected', true);
                                                model.get('values').models.forEach(function(value){
                                                    for(var j in sel_item['values'])
                                                    {
                                                        if(value.get('_id') == sel_item['values'][j]['_id'] || value.get('datalink') == sel_item['values'][j]['_id'])
                                                        {
                                                            value.set('selected', true);
                                                            if(value.get('is_open'))
                                                                value.set('value',sel_item['values'][j]['value']);
                                                            break;
                                                        }
                                                    }
                                                });
                                            }
                                        }
                                    });
                                }
                        }
                        else
                        {
                            self.model = new App.Models.FilterModelItem();
                            self.collection = new App.Collections.FilterProppertyCollection();
                        }
                        self.render_items();
            }).always(function(){$('body').removeClass('wait');});
        }
    },
    /**
     * Отрисовка элементов
    **/
    render_items: function()
    {
        var self = this;
        this.collection.models.forEach(function(model){
            if(!model.get('is_system') || model.get('is_specification') || model.get('name')=='Участок')
                self.$el.append(new App.Views.FilterModelPropertyItemView({model : model}).render().el);
        });
        // стрелки в раскрывающихся блоках
        this.$('div.accordion-body').on('shown', function () {
            $(this).parent("div").find(".icon-chevron-down").removeClass("icon-chevron-down").addClass("icon-chevron-up");
        });
        this.$('div.accordion-body').on('hidden', function () {
            $(this).parent("div").find(".icon-chevron-up").removeClass("icon-chevron-up").addClass("icon-chevron-down");
        });
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
     * Формирование URL по выбранным свойствам
     * Формат: "property_id:property_value_id&property_id:property_value_id"
    **/
    get_url: function()
    {

        var self = this;
        var result = [];
        if(self.collection)
        {
            self.collection.models.forEach(function(model){
                var tmp_res = [];
                model.get('values').models.forEach(function(value){
                    if(value.get("selected"))
                        tmp_res.push( ((value.get('datalink'))?value.get('datalink'):value.get('_id')) + '__' + ((value.get('is_open') )?value.get('value'):value.get('value')));
                });
                if(tmp_res.length>0)
                    result.push(((model.get('datalink'))?model.get('datalink'): model.get('_id'))+':' + tmp_res.join(';'));
            });
        }
        return result.join('&');
    }
});


///
/// Представление элемента фильтра - свойства
///
App.Views.FilterModelPropertyItemView = Backbone.View.extend({
    tagName:'div',
    className:'accordion-group',
    templates: {
        item:_.template($("#filterPropertyItemTemplate").html()),
    },
    /**
     * Инициализация
    **/
    initialize: function() {
    },
    /**
     * Присоедиение событий
    **/
    events:{
    },
     /**
     * Отрисовка элемента
    **/
    render: function () {
        var self = this;
        this.$el.html(this.templates.item(this.model.toJSON()));
        if(this.model.get("selected"))
        {
            this.$('.accordion-toggle').removeClass('collapsed');
            this.$('.accordion-body').addClass('in').parent("div").find(".icon-chevron-down").removeClass("icon-chevron-down").addClass("icon-chevron-up");;
        }
        // отрисовка значений свойства
        this.model.get('values').models.forEach(function(value){
            if(!value.get('is_inherit'))
                self.$el.find('ul.pnl-prop-values').append(new App.Views.FilterModelValueItemView({model : value}).render().el);
        });
        return this;
    }
});

///
/// Представление элемента фильтра - значения
///
App.Views.FilterModelValueItemView = Backbone.View.extend({
    tagName:'li',
    className:'item-value',
    templates: {
        item:_.template($("#filterValueItemTemplate").html()),
    },
    /**
     * Инициализация
    **/
    initialize: function() {
    },
    /**
     * Присоедиение событий
    **/
    events:{
        'click .cb-val': 'onItemCheck',
        'change .tb-open-val': 'onChnageOpenValue'
    },
     /**
     * Отрисовка элемента
    **/
    render: function () {
        this.$el.html(this.templates.item(this.model.toJSON()));
        return this;
    },
    /**
     * Обработка чекбокса
    **/
    onItemCheck: function(e){
        this.model.set('selected',this.$('.cb-val').prop('checked'));
    },
    /**
     * Обработка поля ввода открытого значения
    **/
    onChnageOpenValue: function(e){
        this.model.set('value', this.$('.tb-open-val').val());
    }
});
