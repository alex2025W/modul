
///
/// Модель элемента участка
///
App.Models.SectorModel = Backbone.Model.extend({
    defaults: {},
    initialize: function() {},
     idAttribute: "origin_id",
     defaults: {
        'owner_specifications_data': null,
        'name': 'Участок',
        'is_full_order':false
     }
});

///
/// Модель полной статистики по всему заказу
///
App.Models.FullOrderModel = Backbone.Model.extend({
    defaults: {},
    initialize: function() {},
     defaults: {
        'owner_specifications_data': null,
        'name': '',
        'is_full_order':true
     }
});

///
/// Модель элемента спецификации
///
App.Models.ItemModel = Backbone.Model.extend({
    idAttribute: "_id",
    defaults: {
        'volume': '',
        'time': 0,
        'enable': true,
        'use_product_struct': true,
        'use_templates': false, // использовать/не использовать шаблоны раскроя
        'need_templates': false, // нужны ли шаблоны раскроя для получения данного объекта
        'msg': null, // текстовое сообщение {'type': 'error/warning', 'msg': ''}
    },
    initialize: function (options) {
         this.constructor.__super__.initialize.apply(this, options);
         this.on('change:volume', this.change_volume, this);
    },
     change_volume: function(e){
        try
        {
            // recalculate time by volume
            this.set({'time': this.get('volume')* Routine.strToFloat(this.get('plan_execution_time')['value'])});
        }
        catch (err) {
            console.log(err.message);
        }
     },
     error: function( msg){
        this.set({'msg': {'type': 'error', 'msg': msg} })
     },
     warning: function( msg){
        this.set({'msg': {'type': 'warning', 'msg': msg} })
     },
     clear_messages: function(){
       this.set({'msg': null })
     },
     clear: function(){
        this.set({
            'enable': true,
            'volume':0,
            'time': null,
            'msg': null
        });
     }
});

///
/// Модель элемента фильтра по спецификациям
///
App.Models.SpecificationFilterModel = Backbone.Model.extend({
    defaults: {
        'number': '',
        'count': 1,
        'label': '',
        'is_first': false,
        'index': 0

    },
    initialize: function() {},
});

///
/// Модель элемента итогового изделия -спецификации
///
App.Models.SpecificationOwnerModel = Backbone.Model.extend({
    defaults: {
        'number': '',
        'name': '',
        'count': {'value': 0, 'unit': ''},
        'completed': 0,
    },
    initialize: function() {},
});
