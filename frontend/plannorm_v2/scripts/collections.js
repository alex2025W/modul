// коллекция шаблонов спецификаций
App.Collections.TemplatesCollection = MultiSortCollection.extend({
  model: App.Models.TemplateItemModel
});

// коллекция материалов спецификации
App.Collections.SpecificationMaterialsDataCollection = MultiSortCollection.extend(
  {
    model: App.Models.SpecificationMaterialItemModel
  }
);

// коллекция справочника материалов
App.Collections.MaterialsDataCollection = MultiSortCollection.extend({
  model: App.Models.MaterialsDataItemModel
});

//------------FILTERS--------------------------
App.Collections.FilterGroupCollection = Backbone.Collection.extend({
  model: App.Models.FilterGroupItem
});
App.Collections.FilterCategoryCollection = Backbone.Collection.extend({
  model: App.Models.FilterCategoryItemModel
});
App.Collections.FilterSectorCollection = Backbone.Collection.extend({
  model: App.Models.FilterSectorItemModel
});
