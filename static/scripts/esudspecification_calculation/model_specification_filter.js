///
/// Модель элемента фильтра по спецификациям
///
App.Models.SpecificationFilterModel = Backbone.Model.extend({
    defaults: {
        'number': '',
        'count': 1,
        'name': '',
        'is_first': false,
        'unique_props': '',
        'tech_props':'',
        'note': '',
        'date_add': '',
        'user_add': '',
    },
    initialize: function() {},
});
