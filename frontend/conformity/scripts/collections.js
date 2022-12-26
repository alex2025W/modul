// коллекция уникальных характеристик
App.Collections.UniquePropsCollection = Backbone.Collection.extend({
  model: App.Models.UniquePropItemModel
});

// коллекция прилинкованных материалов
App.Collections.LinkedMaterialsCollection = Backbone.Collection.extend({
  model: App.Models.LinkedMaterialItemModel
});
