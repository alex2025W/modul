App.Collections.WorkCollection = Backbone.Collection.extend({model: App.Models.WorkModel});
App.Collections.WorkOrderCollection =MultiSortCollection.extend({model: App.Models.WorkOrderModel});
// Коллекция работников
App.Collections.WorkerItemsCollection =Backbone.Collection.extend({
    model: App.Models.WorkerModel
});
