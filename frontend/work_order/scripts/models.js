
// универсальная модель
App.Models.ItemModel = Backbone.Model.extend({
  idAttribute: "_id",
  defaults: {
    'use_conditional_date': false,
    'edit_conditional_date': false,
    'use_contract_plan': false,
    //------------------------------------------------------------------------
    'contract_plan_use_conditional_date': false,
    'contract_plan_edit_conditional_date': false,
    'contract_plan_use_weekends': false,
    'contract_plan_locked': false,
    'contract_plan_need_notification': false,
    'contract_plan_days_count': 0
  }
});

// работа
App.Models.WorkModel = Backbone.Model.extend({
  idAttribute: "_id",
  defaults: {
    'use_conditional_date': false,
    'edit_conditional_date': false,
    'unit':'',
    'payment_id': null,
    'days_count': '',
    'is_unit_percent': false, // есл true, то считаем что единицы измерения - %
    'timing': 0,
    //------------------------------------------------------------------------
    'use_contract_plan': false,
    'contract_plan_use_conditional_date': false,
    'contract_plan_edit_conditional_date': false,
    'contract_plan_locked': false,
    'contract_plan_date_start': null,
    'contract_plan_date_finish': null,
    'contract_plan_date_start_with_shift': null,
    'contract_plan_date_finish_with_shift': null,
    'contract_plan_depends_on': false,
    'contract_plan_use_weekends': false,
    'contract_plan_locked': false,
    'contract_plan_need_notification': false,
    'contract_plan_days_count': 0,
    'sector_code': null,
    'sector_id': null,
  }
});

// наряд
App.Models.WorkOrderModel = Backbone.Model.extend({
  idAttribute: "_id",
  defaults: {
    remarks: {},
    people: 0
  },
  initialize: function(){
    this.set('plan_work', new App.Collections.WorkCollection(this.get('plan_work')));

    this.bind("change:checked", this.change_checked, this);
    this.bind("change:locked", this.change_locked, this);
    this.bind("change:use_weekends", this.change_use_weekends, this);
    this.bind("change:need_notification", this.change_need_notification, this);
    this.bind("change:use_conditional_date", this.change_use_conditional_date, this);
    this.bind("change:use_contract_plan", this.change_use_contract_plan, this);
    // Contract plan
    this.bind("change:contract_plan_locked", this.change_contract_plan_locked, this);
    this.bind("change:contract_plan_use_weekends", this.change_contract_plan_use_weekends, this);
    this.bind("change:contract_plan_need_notification", this.change_contract_plan_need_notification, this);
    this.bind("change:contract_plan_use_conditional_date", this.change_contract_plan_use_conditional_date, this);
  },
  change_checked: function(e)
  {
    this.change_attr('checked', this.get('checked'));
  },
  change_locked: function(e)
  {
    this.change_attr('locked', this.get('locked'));
  },
  change_use_weekends: function(e)
  {
    this.change_attr('use_weekends', this.get('use_weekends'));
  },
  change_need_notification: function(e)
  {
    this.change_attr('need_notification', this.get('need_notification'));
  },
  change_use_conditional_date: function(e)
  {
    this.change_attr('use_conditional_date', this.get('use_conditional_date'));
  },
  change_use_contract_plan: function(e)
  {
    this.change_attr('use_contract_plan', this.get('use_contract_plan'));
  },

  //------
  change_contract_plan_locked: function(e)
  {
    this.change_attr('contract_plan_locked', this.get('locked'));
  },
  change_contract_plan_use_weekends: function(e)
  {
    this.change_attr('contract_plan_use_weekends', this.get('use_weekends'));
  },
  change_contract_plan_need_notification: function(e)
  {
    this.change_attr('contract_plan_need_notification', this.get('need_notification'));
  },
  change_contract_plan_use_conditional_date: function(e)
  {
    this.change_attr('contract_plan_use_conditional_date', this.get('use_conditional_date'));
  },

  /**
   ** Выставление параметров работам наряда
  **/
  change_attr: function(name, val){
    for(var work_i in  this.get('plan_work').models)
      this.get('plan_work').models[work_i].set(name, val, {silent:true});
  }
});

// модельд добавления новой работы
App.Models.AddNewWorkModel = Backbone.Model.extend({
  defaults: {
    'name': '',
    'sector': null, // участок работы
    'work_type': 'common',  //[common/specific]
    'unit': '',
    'comment': ''
  }
});

// модельд данных по настройкам
App.Models.SettingsModel = Backbone.Model.extend({
  defaults: {
    workday: 8, // количество часов в рабочем дне
    workweek: 5, // количество дней в рабочей неделе
    use_weekends: 'yes', // учет праздников
  }
});

// Модель элемента трудового участия работника
App.Models.WorkerModel = Backbone.Model.extend({
  defaults: {
    user_email : null,
    user_fio : null,
  },
  idAttribute: "user_id"
});

// модель данных для приостановки всех планов
App.Models.PauseModel = Backbone.Model.extend({
  defaults: {
    date: null,         // дата глобальной приостановки
    reason_id: null,    // причина приостановки
    reason: '',         // причина приостановки
    reason_nodes: null, // уточнения к причинам приостановки
    note: '',           // пометка
  }
});
