// Коллекция элементов работ
App.Collections.WorkItemsCollection =Backbone.Collection.extend({
    model: App.Models.WorkModel
});

// Коллекция элементов материалов
App.Collections.MaterialItemsCollection =Backbone.Collection.extend({
    model: App.Models.MaterialModel
});

// Коллекция элементов работников
App.Collections.WorkerItemsCollection =Backbone.Collection.extend({
    model: App.Models.WorkerModel
});

// Коллекция элементов истории трудового участия работников
App.Collections.HistoryWorkerItemsCollection =Backbone.Collection.extend({
    model: App.Models.HistoryWorkerModel
});

// Коллекция элементов переноса дат
App.Collections.ShiftItemsCollection =Backbone.Collection.extend({
    model: App.Models.ShiftModel
});

// Коллекция элементов истории фактов по работам
App.Collections.HistoryWorkItemsCollection =Backbone.Collection.extend({
    model: App.Models.HistoryWorkModel
});

// Коллекция элементов нарядов
App.Collections.WorkOrderItemsCollection = Backbone.Collection.extend({
  model: App.Models.WorkOrderModel
});

// коллекция данных Ktu
App.Collections.KtuCollection =MultiSortCollection.extend({model: App.Models.KtuModel});


