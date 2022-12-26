///
/// Модель элемента фильтра по комплектам
///
App.Models.ComplectFilterModel = Backbone.Model.extend({
    defaults: {
        'number': '',
        'name': '',
        'count': 1,
        'is_first': false,
        'items': [],
        'unique_props': '',
        'tech_props':'',
        'note': '',
        'date_add': '',
        'user_add': '',
    },
    initialize: function() {},
});
