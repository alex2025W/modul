/**
 * Контейнер формы настроек
 */
App.Views.SettingsFormContainerView = Backbone.View.extend({
  el:'#settings-modal',
  templates: {
    template: _.template($('#SettingsFormContainerTemplate').html())
  },
  events:{
    'close': 'closeDialog',
    'click .save-data': 'onSaveData',
    'click .remove-data': 'onRemoveData',
    'click .close-dialog': 'closeDialog',
  },
  settingsFormView: null,     // форма переноса сроков
  initialize:function(){
    this.render();
  },
  render: function(){
    var self = this;
    // отрисовка основной формы
    this.$el.html(this.templates.template());

    // добавление представления формы настроек календаря
    this.settingsFormView = new App.Views.SettingsFormView({
      el: this.$('#settings-form-box'),
      model: this.model['settings'] ? new App.Models.SettingsModel(this.model['settings']['calendar']) : new App.Models.SettingsModel()
    });

    // добавление представления списка работников
    self.workersFormView = new  App.Views.WorkerItemsView({
      el: this.$('#workers-form-box'),
      parent:this,
      collection: this.model['settings'] ? new App.Collections.WorkerItemsCollection(this.model['settings']['workers']) : new App.Collections.WorkerItemsCollection()
    });
    // навешивание события на сокрытие формы
    this.$el.on('hidden', function () {
      self.$el.empty().html();
      self.undelegateEvents();
      self.$el.removeData().unbind();
      $(".static-box-settings").hide();
      $("body").removeClass('no-overflow');
    });
    // Показать модальынй диалог
    $(".static-box-settings").show();
    $("body").addClass('no-overflow');
    this.$el.modal('show');
  },
  closeDialog: function(){
    $(".static-box-settings").hide();
    $("body").removeClass('no-overflow');
    this.$el.modal('hide');
  },
  onRemoveData: function(){
    var self = this;
    // check if is changing group settings
    bootbox.confirm('Для всех выбранных объектов настройки будут удалены. Продолжить?', function(result){
      if(result)
        self.removeData();
    });
  },
  onSaveData: function(){
    var self = this;
    // check if is changing group settings
    if(this.model['is_multiple'])
    {
      bootbox.confirm('В сохранении участвуют настройки с разными данными. Старые значения будут перезаписаны. Продолжить?', function(result){
        if(result)
          self.saveData();
      });
    }
    else
      self.saveData();
  },
  saveData: function(){
    var self = this;
    // prepare data to save
    if(!this.model['settings'])
      this.model['settings'] = {};
    this.model['settings']['calendar'] = this.settingsFormView.getData().toJSON();
    this.model['settings']['workers'] = this.workersFormView.getData().toJSON();

    // save data
    Routine.showLoader();
    $.ajax({
      type: "POST",
      url: "/handlers/workorderdate/save_settings",
      data: JSON.stringify(this.model),
      timeout: 35000,
      contentType: 'application/json',
      dataType: 'json',
      async:true
    }).done(function(result) {
        if(result['status']=="ok")
        {
          $.jGrowl('Данные успешно сохранены.', {
            'themeState':'growl-success', 'sticky':false, life: 10000
          });
          self.closeDialog();
          // обновить данные на форме
          App.FindView.onSearch();
        }
        else
          $.jGrowl('Ошибка сохранения данных. Подробности: ' + result['msg'], {
            'themeState':'growl-error', 'sticky':false, life: 10000
          });
    }).always(function(){Routine.hideLoader();
    }).error(function(e){$.jGrowl('Ошибка сервера, попробуйте повторить попытку.', { 'themeState':'growl-error', 'sticky':false, life: 10000 })});
  },
  removeData: function(){
    var self = this;
    // save data
    // Routine.showLoader();
    $.ajax({
      type: "POST",
      url: "/handlers/workorderdate/remove_settings",
      data: JSON.stringify(this.model),
      timeout: 35000,
      contentType: 'application/json',
      dataType: 'json',
      async:true
    }).done(function(result) {
        if(result['status']=="ok")
        {
          $.jGrowl('Данные успешно сохранены.', {
            'themeState':'growl-success', 'sticky':false, life: 10000
          });
          self.closeDialog();
          // обновить данные на форме
          App.FindView.onSearch();
        }
        else
          $.jGrowl('Ошибка сохранения данных. Подробности: ' + result['msg'], {
            'themeState':'growl-error', 'sticky':false, life: 10000
          });
    }).always(function(){Routine.hideLoader();
    }).error(function(e){$.jGrowl('Ошибка сервера, попробуйте повторить попытку.', { 'themeState':'growl-error', 'sticky':false, life: 10000 })});
  }
});

/**
 * Контрол управленяи списокм настроект календаря
 */
App.Views.SettingsFormView = Backbone.View.extend({
  templates: {
    template: _.template($('#SettingsFormTemplate').html())
  },
  events:{
    'change .tb-work-day': 'onChangeWorkDay',
    'change .ddl-work-week': 'onChangeWorkWeek',
    'change .cb-use-weekend': 'onChangeUseWeekend'
  },
  initialize:function(){
    this.render();
  },
  render:function(){
    // отрисовка основной формы
    this.$el.html(this.templates.template(this.model.toJSON()));
    this.$('.tb-work-day').numeric({ negative: false, decimal: '' });
  },
  closeDialog: function(){
    $(this.el).trigger('close', [this]);
  },
  getData: function(){
    return this.model;
  },
  onChangeWorkDay: function(e){
    //if($(e.currentTarget).data('disabled'))
    if(!$(e.currentTarget).val())
    {
      $.jGrowl('Рабочий день обязателен для заполнения и не может быть пустым.', { 'themeState':'growl-error', 'sticky':false, life: 10000});
      $(e.currentTarget).val('8');
      return;
    }
    this.model.set('workday', $(e.currentTarget).val());
  },
  onChangeWorkWeek: function(e){
    this.model.set('workweek', $(e.currentTarget).val());
  },
  onChangeUseWeekend: function(e){
    this.model.set('use_weekends', $(e.currentTarget).prop('checked')?'yes':'no');
  },
});


/**
 * Контрол управленяи списокм рабочих
 */
App.Views.WorkerItemsView = Backbone.View.extend({
  tagName:'div',
  className:'pnl-workers-container',
  templates: {
    main:_.template($("#PnlWorkersContainerTemplate").html()),
  },
  events:{
    'click .btn-add-worker': 'onAddWorkerItem',
  },
  initialize: function (params) {
    this.parent = params.parent;
    this.render();
  },
  render: function () {
    var self = this;
    this.$el.html(this.templates.main());
    this.$el.find(".data-workers-container").empty();
      _.each(this.collection.models, function (item) {
        self.renderItem(item);
    }, this);
    return this;
  },
  renderItem: function (item) {
    var itemView = new App.Views.WorkerItemView({model: item, parent: this});
    itemView.render();
  },
  hide: function(){
    this.$el.hide();
  },
  show: function(){
    this.$el.show();
  },
  /**
   * Обработка кнопки добавления рабочего
   */
  onAddWorkerItem: function(){
    var new_elem = new App.Models.WorkerModel();
    this.collection.add(new_elem);
    var itemView = new App.Views.WorkerItemView({model: new_elem, parent: this});
    itemView.render();
  },
  /**
   * Получить данные
   */
  getData: function(){
    return this.collection;
  }
});

/**
 * Контрол управления элементом рабочего
 */
App.Views.WorkerItemView = Backbone.View.extend({
  tagName:'div',
  className:'data-item',
  parent: null,
  templates: {
    main:_.template($("#WorkerItemTemplate").html()),
  },
  initialize: function (params) {
    this.parent = params.parent;
  },
  events:{
    'click .lnk-remove-item': 'onRemove',
  },
  render: function () {
    var self = this;
    this.$el.html(this.templates.main(this.model.toJSON()));
    this.parent.$el.find(".data-workers-container").append(this.el);

    var all_workers = [];
    for(var i in App.AllWorkers)
      all_workers.push({value:App.AllWorkers[i].fio, data:App.AllWorkers[i]});

    this.$(".fio").autocomplete({
      lookup: all_workers,
      showNoSuggestionNotice:true,
      noSuggestionNotice: "Сотрудник не найден",
      triggerSelectOnValidInput:false,
      onSelect:function(suggestion){
        self.model.set("user_id",suggestion.data._id);
        self.model.set("user_email",suggestion.data.email);
        self.model.set("user_fio",suggestion.data.fio);
      },
      lookupFilter:function(suggestion, query, queryLowerCase){
        for(var i in self.parent.collection.models){
          if(self.parent.collection.models[i].cid!=self.model.cid){
            if(suggestion.data._id==self.parent.collection.models[i].get("user_id"))
              return false;
          }
        }
        return suggestion.value.toLowerCase().indexOf(queryLowerCase) !== -1;
      }
    }).blur(function(){
    },function(){
      var el = $(this);
      setTimeout(function(){
        el.val(self.model.get("user_fio"));
      },100);
    });

    return this;
  },
  onRemove: function () {
    this.$el.remove();
    this.parent.collection.remove(this.model);
    return;
  }
});


