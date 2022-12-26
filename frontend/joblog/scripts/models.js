/// Модель элемента наряда
App.Models.WorkOrderModel = Backbone.Model.extend({
  defaults: {}
});

/// Модель элемента работы в наряде
App.Models.WorkModel = Backbone.Model.extend({
  defaults: {repeat: false},
  initialize: function() {
    this.on('change', this.change, this);
  },
  change: function(){
    Backbone.trigger('onWorkModelChanged',[this]);
  }
});

/// Модель элемента материала
App.Models.MaterialModel = Backbone.Model.extend({});

/// Модель элемента трудового участия работника
App.Models.WorkerModel = Backbone.Model.extend({
  defaults: {
    user_email : null,
    user_fio : null,
    proportion : null
  },
  idAttribute: "user_id"
});

/// Модель элемента истории трудового участия работников
App.Models.HistoryWorkerModel = Backbone.Model.extend({
  defaults: {
    _id: null,
    date : null,
    fact_date : null,
    status : "",
    workers:[],
    history:[],
  }
});

/// Модель элемента истории факта по работе
App.Models.HistoryWorkModel = Backbone.Model.extend({
  idAttribute: "_id",
  defaults: {
    _id: null,
    date : null,
  }
});

/// Модель элемента переноса дат
App.Models.ShiftModel = Backbone.Model.extend({});

/// Модель элемента данных KTU
App.Models.KtuModel = Backbone.Model.extend({});

/// Модель представления планов
/*App.Models.PlansModel = Backbone.Model.extend({
  defaults: {
    date_start: null,
    date_finish: null,
    works: [],
    workers_participation_history: []
  }
});*/

