var App = {
  Models: {},
  Views:{},
  Collections:{},
  Route:null,
  AppView: null,
  initialize:function(){
    this.AppView =  new  App.Views.AppView();
  }
};

///---------------------------------------------------------------------------------------------------------
///---------Модели + коллекции------------------------------------------------------------------------------
///---------------------------------------------------------------------------------------------------------
// модель и коллекция для работы с историей иморта
App.Models.DataHistoryModel = Backbone.Model.extend({});
App.Collections.DataHistoryCollection = Backbone.Collection.extend({ model:App.Models.DataHistoryModel});

///---------------------------------------------------------------------------------------------------------
///---------Представления-----------------------------------------------------------------------------------
///---------------------------------------------------------------------------------------------------------

App.Views.AppView = Backbone.View.extend({
  el: $("#CrmGoogleCatalogsRights"),
  events:{
    'click .btn-save': 'onSaveData'
  },
  initialize: function()
  {
    App.Views.DataHistoryListView
    this.DataHistoryListView = new App.Views.DataHistoryListView({
      'el': this.$('.data-result-report')
    });
  },
  onSaveData: function(e)
  {
    e.preventDefault();
    // dtata structure to dsave
    var data = {
      'folder_id': ''
    }
    // collect data
    data.folder_id = Routine.removeAllSpaces(this.$('.tb-folder-id').val());
    // check data
    if(data.folder_id==='')
    {
      $.jGrowl('Не задан каталог для проверки', {
        'themeState':'growl-error', 'sticky':false, life: 10000
      });
      return;
    }

    // save data
    Routine.showProgressLoader(10);
    this.queue = new Queue({
      task_key: "google_catalogs_check_rights",
      params: data,
      complete: this.onQueueComplete.bind(this),
    });
    this.queue.run();
  },

  /**
   * Обработка глобального события завершения выполнения задания в очереди
  **/
  onQueueComplete: function(queue, task_key, result)
  {
    Routine.hideLoader();
    if(result['status'] == 'error')
      $.jGrowl(result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 10000 });
    else
    {
      result = result['data'];
      if(!result)
      {
        $.jGrowl('Ошибка получения данных.', {'themeState':'growl-error', 'sticky':false, life: 10000 });
        return;
      }
      // показать результат
      this.DataHistoryListView.render(new App.Collections.DataHistoryCollection(result.data));
    }
  }

});

/// Представление результата выполненных операций
App.Views.DataHistoryListView = Backbone.View.extend({
  templates: {
    main:_.template($("#DataHistoryListTemplate").html()),
  },
  initialize: function(){
  },
  render: function(collection)
  {
    var self = this;
    this.collection = collection;
    // Очистка формы
    this.clear();
    // отрисовка
    this.$el.append(this.templates.main());
    var i = 0;
    _.each(this.collection.models, function (item) {
      i++;
      this.$el.find('.data-body').append(new App.Views.DataHistoryItemView({model: item, i: i}).render().el);
    }, this);
    return this;
  },
  clear: function()
  {
    this.$el.empty();
  }
});

App.Views.DataHistoryItemView = Backbone.View.extend({
  tagName:'tr',
  templates: {
    main:_.template($("#DataHistoryItemTemplate").html()),
  },
  initialize: function(){
    this.index = this.options['i'];
  },
  render: function()
  {
    var self = this;
    // Очистка формы
    this.clear();
    // отрисовка
    this.$el.append(this.templates.main($.extend({},this.model.toJSON(),{i:this.index})));
    return this;
  },
  clear: function()
  {
    this.$el.empty();
  }
});

