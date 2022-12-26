///---------------------------------------------------------------------------------------------------------
/// Базовое представление элемента объекта
///---------------------------------------------------------------------------------------------------------
App.Views.CommonItemView = Backbone.View.extend({

  component_prefix: "",
  need_parent_remove: false, // флаг для проверки парента на необходимость удаления при удалении текущего объекта

  /**
   ** Добавление новых нарядов
  **/
  onNewWorkOrders:function(e){
    if($(e.currentTarget).data('disabled'))
        return;
    var sector_model = null;
    var sector_type_model = null;
    var order_model = null;

    switch(this.component_prefix){
      case 'sector':
        sector_model = this.model.toJSON();
        sector_type_model = this.parentView.model.toJSON();
        order_model = this.parentView.parentView.model.toJSON();
      break;
      case 'sector-type':
        sector_type_model = this.model.toJSON();
        order_model = this.parentView.model.toJSON();
      break;
      case 'order':
        order_model = this.model.toJSON();
      break;
    }

    // отображение формы заполнение данных для новых нарядов
    new App.Views.WorkOrderAddView({
      model:{
        sector:sector_model,
        sector_type: sector_type_model,
        order:order_model,
        workorder: null,
        exclude_works_id: null,
        mode: 'add'
      }
    }).$el.modal('show');
  },

  /**
  * Событие выбора флага переноса дат
  **/
  onForReplaceItem: function(){
    $('body').addClass('wait');
    var self = this;
    setTimeout(function(){
      var checked = false;
      if (self.$('.'+self.component_prefix+'-plan-check').prop('checked'))
        checked = true;
      // меняем все модели входящие в даную
      for(var i in self.collection.models)
      {
        self.collection.models[i].set({'checked': !checked},{silent:true});
        self.collection.models[i].set({'checked': checked},{silent:false});
      }
      //this.model.set({'checked': checked},{silent:false});
      self.checkForReplace();
      $('body').removeClass('wait');
    },100);
  },

  /**
   ** Событие залочивания элемента
  **/
  onLockItem:function(e){
    if($(e.currentTarget).data('disabled'))
        return;

    $('body').addClass('wait');
    var self = this;
    setTimeout(function(){
      var locked =false;
      if($(e.currentTarget).find("i").hasClass("fa-unlock"))
        locked = true;
      // меняем флаг для всех работ всех нарядов, входящих в данную группу
      for(var i in self.collection.models)
      {
        self.collection.models[i].set({'locked': !locked, 'contract_plan_locked':!locked},{silent:true});
        self.collection.models[i].set({'locked': locked, 'contract_plan_locked':locked},{silent:false});
      }
      // выставляем флаг лочения в самой модели наряда
       self.checkForLock();
       $('body').removeClass('wait');
     },100);
  },

  /**
   ** Событие игнора выходных
  **/
  onIgnoreWeekendsItem: function(e)
  {
    if($(e.currentTarget).data('disabled'))
        return;
    $('body').addClass('wait');
    var self = this;
    setTimeout(function(){
      var use_weekends =false;
      if(!($(e.currentTarget).find("i").hasClass("use_weekends")))
        use_weekends = true;
      // меняем все модели входящие в даную
      for(var i in self.collection.models)
      {
        self.collection.models[i].set({'use_weekends': !use_weekends, 'contract_plan_use_weekends': !use_weekends},{silent:true});
        self.collection.models[i].set({'use_weekends': use_weekends, 'contract_plan_use_weekends': use_weekends},{silent:false});
      }
      //this.model.set('use_weekends', use_weekends);
      self.checkForUseWeekends();
      $('body').removeClass('wait');
    },100);
  },

  /**
   * Событие
  **/
  onNeedNotificationItem: function(e)
  {
    if($(e.currentTarget).data('disabled'))
        return;
    $('body').addClass('wait');
    var self = this;
    setTimeout(function(){
      var need_notification =false;
      if(!($(e.currentTarget).find("i").hasClass("need_notification")))
        need_notification = true;
      // меняем все модели входящие в даную
      for(var i in self.collection.models)
      {
        self.collection.models[i].set({'need_notification': !need_notification, 'contract_plan_need_notification': !need_notification},{silent:true});
        self.collection.models[i].set({'need_notification': need_notification, 'contract_plan_need_notification': need_notification},{silent:false});
      }
      self.checkForNeedNotification();
      $('body').removeClass('wait');
    },100);
  },

  /**
   ** Событие условной даты
  **/
  onConditionalDateItem: function(e)
  {
    if($(e.currentTarget).data('disabled'))
      return;
    var self = this;
    var use_conditional_date =false;
    if(!($(e.currentTarget).find("i").hasClass("use_conditional_date")))
    {
      // если ставим галку
      self.model.set({
        "edit_conditional_date":true,
        "use_conditional_date":false,
      }, {silent: false});
    }
    else
    {
      // снимаем условные даты
      if(this.component_prefix == "workorder")
        App.unlinkConditionalDates(self.collection, self.model.get('number'));
      else
        App.unlinkConditionalDates(self.collection);
    }
  },

  /**
   ** Сохранение условной даты
  **/
  onSaveConditionalDate: function(e){
    var self = this;
    var linked_work = this.$('.'+self.component_prefix+'-linked-date-edit-container').find('.tb-condition-work').val();
    var days_before_start = Routine.strToInt(this.$('.'+self.component_prefix+'-linked-date-edit-container').find('.tb-condition-start-days').val());
    if(this.component_prefix == "workorder")
      App.linkConditionalDates(linked_work, days_before_start, self.collection, self.model.get('number'));
    else
      App.linkConditionalDates(linked_work, days_before_start, self.collection);
  },

  /**
   ** Отмена редактирования условной даты
  **/
  onCancelConditionalDate: function(e){
    var self = this;
    $('body').addClass('wait');
    setTimeout(function(){
      self.model.set({
        "edit_conditional_date":false,
        "use_conditional_date":self.model.previous('use_conditional_date'),
      }, {silent: false});
      $('body').removeClass('wait');
    },100);
  },

  /**
   ** Событие игнора выходных
  **/
  onUseContractPlanItem: function(e)
  {
    if($(e.currentTarget).data('disabled'))
        return;
    $('body').addClass('wait');
    var self = this;
    setTimeout(function(){
      var use_contract_plan =false;
      if(!($(e.currentTarget).find("i").hasClass("use_contract_plan")))
        use_contract_plan = true;
      // меняем все модели входящие в даную
      for(var i in self.collection.models)
      {
        if(!self.collection.models[i].get('contract_plan_date_start_with_shift'))
        {
          self.collection.models[i].set({'use_contract_plan': !use_contract_plan},{silent:true});
          self.collection.models[i].set({'use_contract_plan': use_contract_plan},{silent:false});
        }
      }
      self.checkForUseContractPlan();
      $('body').removeClass('wait');
    },100);
  },

  /**
   * Функция проверки необходимости выбора галки - корректироваки сроков
  **/
  checkForReplace: function(){
    var checked = true;
    for(var i in this.collection.models)
    {
      var model = this.collection.models[i];
      if(model.get('plan_work'))
      {
        for(var work_i in  model.get('plan_work').models)
        {
          var work_model = model.get('plan_work').models[work_i];
          if(!work_model.get('checked'))
            checked = false;
        }
      }
      else
      {
        if(!model.get('checked'))
        {
          checked= false;
          break;
        }
      }
    }
    this.model.set('checked', checked);
    if(this.origin_model)
      this.origin_model.set('checked', checked);


    this.$('.'+this.component_prefix+'-plan-check').prop('checked', checked);
  },

  /**
   ** Функция проверки необходимости выбора галки - залочивания
  **/
  checkForLock: function(){
    var locked = true;
    for(var i in this.collection.models)
    {
      var model = this.collection.models[i];
      if(model.get('plan_work'))
      {
        for(var work_i in  model.get('plan_work').models)
        {
          var work_model = model.get('plan_work').models[work_i];
          if(!work_model.get('locked') || (work_model.get('use_contract_plan') && !work_model.get('contract_plan_locked')))
            locked = false;
        }
      }
      else
      {
        if(!model.get('locked') || (model.get('use_contract_plan') && !model.get('contract_plan_locked')))
        {
          locked= false;
          break;
        }
      }
    }

    this.model.set({'contract_plan_locked': locked, 'locked': locked}, {'silent': true});
    this.$('.'+this.component_prefix+'-lock-item').find("i").removeClass("fa-lock").removeClass("fa-unlock").addClass(locked?'fa-lock':'fa-unlock');
    // проверяем родителя на необходимость выбора общего флага
    if(this.parentView && this.parentView.checkForLock)
      this.parentView.checkForLock();
    else
      this.model.trigger('change');
  },

  /**
   * Функция проверки необходимости выбора галки - использования выходных дней
  **/
  checkForUseWeekends: function(){
    var use_weekends = true;
    for(var i in this.collection.models)
    {
      var model = this.collection.models[i];
      if(model.get('plan_work'))
      {
        for(var work_i in  model.get('plan_work').models)
        {
          var work_model = model.get('plan_work').models[work_i];
          if(!work_model.get('use_weekends') || (work_model.get('use_contract_plan') && !work_model.get('contract_plan_use_weekends')))
            use_weekends = false;
        }
      }
      else
      {
        if(!model.get('use_weekends') || (model.get('use_contract_plan') && !model.get('contract_plan_use_weekends')))
        {
          use_weekends= false;
          break;
        }
      }
    }

    this.model.set({contract_plan_use_weekends: use_weekends, 'use_weekends':use_weekends}, {'silent': true});
    this.$('.'+this.component_prefix+'-hol-item').prop('use_weekends', use_weekends);
    // проверяем родителя на необходимость выбора общего флага
    if(this.parentView && this.parentView.checkForUseWeekends)
      this.parentView.checkForUseWeekends();
    else
      this.model.trigger('change');
  },

    /**
   * Функция проверки необходимости выбора галки
  **/
  checkForNeedNotification: function(){
    var need_notification = true;
    for(var i in this.collection.models)
    {
      var model = this.collection.models[i];
      if(model.get('plan_work'))
      {
        for(var work_i in  model.get('plan_work').models)
        {
          var work_model = model.get('plan_work').models[work_i];
          if(!work_model.get('need_notification') || (work_model.get('use_contract_plan') && !work_model.get('contract_plan_need_notification')))
            need_notification = false;
        }
      }
      else
      {
        if(!model.get('need_notification') || (model.get('use_contract_plan') && !model.get('contract_plan_need_notification')))
        {
          need_notification= false;
          break;
        }
      }
    }
    this.model.set({'contract_plan_need_notification': need_notification, need_notification:need_notification }, {'silent': true});
    this.$('.'+this.component_prefix+'-notify-item').prop('need_notification', need_notification);
    // проверяем родителя на необходимость выбора общего флага
    if(this.parentView && this.parentView.checkForNeedNotification)
      this.parentView.checkForNeedNotification();
    else
      this.model.trigger('change');
  },

  /**
   * Функция проверки необходимости выбора галки - использования условных дат
  **/
  checkForConditionalDates: function(){
    var use_conditional_date = true;
    for(var i in this.collection.models)
    {
      var model = this.collection.models[i];
      if(model.get('plan_work'))
      {
        for(var work_i in  model.get('plan_work').models)
        {
          var work_model = model.get('plan_work').models[work_i];
          if(!work_model.get('use_conditional_date'))
            use_conditional_date = false;
        }
      }
      else
      {
        if(!model.get('use_conditional_date'))
        {
          use_conditional_date= false;
          break;
        }
      }
    }
    this.model.set('use_conditional_date', use_conditional_date);
    this.$('.'+this.component_prefix+'-conditional-item').prop('use_conditional_date', use_conditional_date);
  },

  /**
   * Функция проверки необходимости использования договорных планов
  **/
  checkForUseContractPlan: function(){
    var use_contract_plan = true;
    for(var i in this.collection.models)
    {
      var model = this.collection.models[i];
      if(model.get('plan_work'))
      {
        for(var work_i in  model.get('plan_work').models)
        {
          var work_model = model.get('plan_work').models[work_i];
          if(!work_model.get('use_contract_plan'))
            use_contract_plan = false;
        }
      }
      else
      {
        if(!model.get('use_contract_plan'))
        {
          use_contract_plan= false;
          break;
        }
      }
    }
    this.model.set('use_contract_plan', use_contract_plan, {silent: true});
    this.$('.'+this.component_prefix+'-contract-plan-item').prop('use_contract_plan', use_contract_plan);

    // проверяем родителя на необходимость выбора общего флага
    if(this.parentView && this.parentView.checkForUseContractPlan)
      this.parentView.checkForUseContractPlan();
    else
      this.model.trigger('change');
  },

   /**
   * Удаление представления с моделью данных
  **/
  remove: function(){
    if(this.parentView.collection.length==1 && this.need_parent_remove)
      this.parentView.remove();
    if(this.origin_model)
      //this.origin_model.destroy();
      this.origin_model.collection.remove(this.origin_model);

    this.model.destroy();
    //this.model.collection.remove(this.model);
    this.clear();
  },

  /**
   * Удаление представления
  **/
  clear: function()
  {
    this.$el.empty();
  },

  /**
   * Обработка события клика на иконку настроек рабочих ресурсов
   */
  onSettingsItem: function(e){
    this.$el.trigger("onSettingsItem", {
      obj: this,
      level: this.model.get('level'),
    });
  },

  /**
   * Обработка события клика на иконку приостановки планов
   */
  onPauseItem: function(e){
    this.$el.trigger("onPauseItem", {
      obj: this,
      level: this.model.get('level'),
    });
  }
});


///---------------------------------------------------------------------------------------------------------
/// представление формы списка данных
///---------------------------------------------------------------------------------------------------------
App.Views.DataListView = Backbone.View.extend({
  filter_works: null, // фильтр по работам
  lastSelectedItem: null, // последний выделенный элемент в списке
  el: '#data-body',
  templates: {
    footer_template: _.template($("#FooterTemplate").html()),
    not_found_template: _.template($("#DataNotFoundTemplate").html()),
    set_search_query_template: _.template($("#SetSearchQueryTemplate").html()),
    template: _.template($("#DataListTemplate").html())
  },
  events:{
    'click .cb-item': 'onClickPlus',
    'click .lbl-item': 'onClickitem',
    'click #save-data': 'saveData',
    'click #cancel-edit': 'cancelData',
    'click #replace-data': 'replaceDataDialog',
    'click #show-settings-form': 'settingsForm',
    'click #show-pause-form': 'pauseForm',
    'click #add-blanks': 'onAddBlanks',
    'click #close-data': 'onCloseDataDialog',
    //---------------------------
    'onSettingsItem': 'onSettingsItem',
    'onPauseItem': 'onPauseItem'

  },
  openedItems:{}, // список идентификаторов объектов, которые необходимо раскрыть
  collapsed: false, // глобальный флаг текущего состояния
  /**
   * Инициализация
  **/
  initialize:function(){
    this.contract_info = this.options.contract_info;
    this.openedItems = {};
    this.collapsed = false;
    this.$el.html(this.templates.set_search_query_template({}));
    // глобальное событие на раскрытие/закрытие всего дерева
    Backbone.on("global:collapse",this.onGlobalCollapse,this);
    Backbone.on("global:open_hand_collapsed_items",this.openHandCollapsedItems,this);
  },
  /**
   * Обработка глобавльного события фолдинга
  **/
  onGlobalCollapse: function(e)
  {
    this.collapse(e[1]);
  },
  /**
   * Раскрыть/свернуть дерево
  **/
  collapse: function(val)
  {
    this.collapsed = val;
    this.$el.find('.cb-item').prop('checked', val);
  },

  /**
    * Обработка раскрытия/сокрытия узлов дерева
  **/
  onClickPlus: function(e)
  {
    var self = this;
    this.openedItems[$(e.currentTarget).prop('id')] = $(e.currentTarget).prop('checked');
  },

  /**
    * Обработка клика по любому элементу в списке
  **/
  onClickitem: function(e)
  {
    this.$('.lbl-item').removeClass('selected');
    $(e.currentTarget).addClass('selected');
    this.lastSelectedItem = $(e.currentTarget);
  },

  /**
   * Очистка формы
  **/
  clear: function()
  {
    this.openedItems = {};
    this.$el.empty();
  },

  /**
   * отрисовка
  **/
  render: function(selected_sector_types, selected_sectors, selected_workorders, selected_works,  need_collapse){
    this.filter_works = selected_works;
    // если нет данных на отображение
    if ( !this.contract_info['data'] || !('orders' in this.contract_info['data']) ||  this.contract_info['data']['orders'].length == 0){
      this.$el.html(this.templates.not_found_template({}));
      return this;
    }
    if(need_collapse)
      this.collapsed = true;
    // отрисовка данных
    this.collection.sortBy("contract_number","production_number", "production_unit_number", "sector_code", "number");
    this.$el.html(this.templates.template({}));
    // Данные сгруппированные по договорам. В группировке участвуют наряды.
    // Для каждого договора, создается своя мини структура информации - 'info': {'number': model.get('contract_number')}
    // На данный момент несколько  контрактов быть не может, это задел на будущее
    var items = [];
    for(var i in this.collection.models)
    {
      var model = this.collection.models[i];
      items.push(model);
    }

    // отрисовка футера
    this.$(".row-footer").append(this.templates.footer_template({'items': items}));

    // отрисовка
    var locked = items.length>0;
    var pause = items.length>0;
    var use_conditional_date = items.length>0;
    var use_weekends = items.length>0;
    var need_notification = items.length>0;
    var checked = items.length>0;
    //----
    var use_contract_plan = items.length>0;
    var contract_plan_locked = items.length>0;
    var contract_plan_use_conditional_date =items.length>0;
    var contract_plan_use_weekends = items.length>0;
    var contract_plan_need_notification = items.length>0;
    var have_settings = false;

    // проход по всем нарядам , относящиеся к договору, для выставления свойств использования выходных, блокировки, необходимости уведомлений....
    // Работает по типу, если все работы в наряде имеют такой флан, то и наряд имеет такой же флаг.
    // если все работы на договоре имеют такой флаг, то и договор имеет такой флаг
    for(var j in items)
    {
      var model = items[j];
      if(model.get('settings'))
        have_settings = true;

      for(var work_i in model.get('plan_work').models)
      {
        var work_model = model.get('plan_work').models[work_i];
        if(work_model.get('settings'))
         have_settings = true;
        if(!work_model.get('locked'))
          locked = false;
        if(!work_model.get('pause'))
          pause = false;
        if(!work_model.get('use_conditional_date'))
          use_conditional_date = false;
        if(!work_model.get('use_weekends'))
          use_weekends = false;
        if(!work_model.get('need_notification'))
          need_notification = false;
        if(!work_model.get('checked'))
          checked = false;
        //---
        if(!work_model.get('use_contract_plan'))
          use_contract_plan = false;
        if(work_model.get('use_contract_plan') && !work_model.get('contract_plan_locked'))
          contract_plan_locked = false;
        if(work_model.get('use_contract_plan') && !work_model.get('contract_plan_use_conditional_date'))
          contract_plan_use_conditional_date = false;
        if(work_model.get('use_contract_plan') && !work_model.get('contract_plan_use_weekends'))
          contract_plan_use_weekends = false;
        if(work_model.get('use_contract_plan') && !work_model.get('contract_plan_need_notification'))
          contract_plan_need_notification = false;
      }
      model.set('locked',locked, {'silent': true});
      // model.set('pause',pause, {'silent': true});
      model.set('use_conditional_date', use_conditional_date, {'silent': true});
      model.set('use_weekends', use_weekends, {'silent': true});
      model.set('need_notification', need_notification, {'silent': true});
      model.set('checked', checked, {'silent': true});
      //----
      model.set('use_contract_plan', use_contract_plan, {'silent': true});
      model.set('contract_plan_locked', contract_plan_locked, {'silent': true});
      model.set('contract_plan_use_conditional_date', contract_plan_use_conditional_date, {'silent': true});
      model.set('contract_plan_use_weekends', contract_plan_use_weekends, {'silent': true});
      model.set('contract_plan_need_notification', contract_plan_need_notification, {'silent': true});
    }

    this.contract_info['data']['locked'] = locked;
    this.contract_info['data']['pause'] = pause;
    this.contract_info['data']['use_conditional_date'] = use_conditional_date;
    this.contract_info['data']['use_weekends'] = use_weekends;
    this.contract_info['data']['use_contract_plan'] = use_contract_plan;
    this.contract_info['data']['need_notification'] = need_notification;
    this.contract_info['data']['checked'] = checked;
    this.contract_info['data']['index'] = 0;
    this.contract_info['data']['settings'] = have_settings;
    this.contract_info['data']['level'] = 'contract';
    //----
    this.contract_info['data']['contract_plan_locked'] = contract_plan_locked;
    this.contract_info['data']['contract_plan_use_conditional_date'] = contract_plan_use_conditional_date;
    this.contract_info['data']['contract_plan_use_weekends'] = contract_plan_use_weekends;
    this.contract_info['data']['contract_plan_need_notification'] = contract_plan_need_notification;

    //--------------------------------------------------------------------------------------------------------------------------------------
    this.renderItem(items);
    // раскрть ветки, которые ранее раскрывал пользователь руками
    this.openHandCollapsedItems();
  },

  /**
   * Раскрыть ветки, которые пользователь раскрывал руками
  **/
  openHandCollapsedItems: function(items)
  {
    // если требуется раскрыть все дерево

    if(this.collapsed)
      this.collapse(true);
    // раскрыть сохраненные ветки
    for(var i in this.openedItems)
       this.$el.find('#'+i).prop('checked', this.openedItems[i]);
  },

  /**
   * отрисовка элемента списка
  **/
  renderItem: function(items)
  {
    // делаем модель из объекта данных по договору
    // используется универсальная модель без полей по умолчанию
    var model = new App.Models.ItemModel(this.contract_info.data);
    // формаирование коллекции из моделей нарядов, отбранных для договора
    //var collection = new App.Collections.WorkOrderCollection(this.collection.models);
    var collection = new App.Collections.WorkOrderCollection(items);
    var itemView = new App.Views.ContractItemView({model: model, collection: collection, 'parentView': this});
    // отрисовка на форме
    this.$(".data-list").append(itemView.render().el);
  },

  /**
   * отменить редактирование
  **/
  cancelData:function(){
    App.FindView.onSearch(false);
  },

  /**
    * добавить бланки
  **/
  onAddBlanks:function(){
    var self = this;
    if (this.$('.work-plan-check:checked').length == 0){
      $.jGrowl('Выберите наряды для создания бланков.', { 'themeState':'growl-error', 'sticky':false });
      return;
    }
    // отбираем только выбранные наряды
    var data_to_save = [];
    for(var i in App.DataCollection.models)
      for(var j in App.DataCollection.models[i].get('plan_work').models)
        if(App.DataCollection.models[i].get('plan_work').models[j].get('checked'))
        {
          data_to_save.push(App.DataCollection.models[i].get('_id'));
          break;
        }

    window.location='/handlers/workorder/add_blanks/'+data_to_save.join(';');

    App.FindView.onSearch();

    //App.save_blanks(data_to_save, function(){App.FindView.onSearch();});
  },

  /**
    * Закрыть выбранные наряды
  **/
  onCloseDataDialog:function(){
    var self = this;
    // отбираем только выбранные наряды
    var data_to_save = [];
    for(var i in App.DataCollection.models)
      for(var j in App.DataCollection.models[i].get('plan_work').models)
        if(App.DataCollection.models[i].get('plan_work').models[j].get('checked'))
        {
          data_to_save.push({'_id':App.DataCollection.models[i].get('_id'), 'number':App.DataCollection.models[i].get('number')});
          break;
        }

    if (data_to_save.length == 0){
      $.jGrowl('Выберите наряды, которые необходимо закрыть.', { 'themeState':'growl-error', 'sticky':false });
      return;
    }

    var dlg = new App.Views.closeWorkordersDlgView({'model':{'items': data_to_save}});
    dlg.on("dialogsave",function(e){
      if(e.status=="ok")
      {
        $.jGrowl('Данные успешно сохранены.', { 'themeState':'growl-success', 'sticky':false, life: 10000});
        setTimeout(function(){
          App.FindView.onSearch();
        },100);
      }
    });
    return;
  },

  /**
   * [onSettingsItem description]
   * @param params {model: {}, type: 'work/work_order'}
   */
  onSettingsItem: function(e, params){
    var settings = null;
    var res_work_orders = [];
    var settings_group_keys = {};
    // работа
    if(params.level=="work"){
      var wo = params.obj.parentView.model;
      var pw = params.obj.model;
      settings = pw.get('settings');
      res_work_orders = [{
        number: wo.get('number'),
        _id: wo.get('_id'),
        checked: false,
        works: [{
          code: pw.get('code'),
          _id: pw.get('_id')
        }]
      }];
    // наряд
    } else if (params.level == "work_order") {
      var wo = params.obj.origin_model;
      settings = wo.get('settings');
      var tmp = {
        number: wo.get('number'),
        _id: wo.get('_id'),
        checked: true,
        works: []
      }
      _.each(wo.get('plan_work').models, function(pw)
      {
        if(pw.get('settings'))
          settings_group_keys[pw.get('settings')['group_key']] = pw.get('settings')['group_key'];

        if(!settings)
          settings = pw.get('settings');
        tmp['works'].push({
          code: pw.get('code'),
          _id: pw.get('_id')
        });
      })
      res_work_orders.push(tmp);
    // любой уровень выше наряда
    } else {
      _.each(params.obj.collection.models, function (wo)
      {
        if(wo.get('settings'))
          settings_group_keys[wo.get('settings')['group_key']] = wo.get('settings')['group_key'];

        var tmp = {
          number: Routine.strToInt(wo.get('number')),
          _id: wo.get('_id'),
          checked: true,
          works: [],
        }
        if(!settings)
          settings = wo.get('settings');
        // работы
        _.each(wo.get('plan_work').models, function(pw)
        {
          if(pw.get('settings'))
            settings_group_keys[pw.get('settings')['group_key']] = pw.get('settings')['group_key'];

          if(!settings)
            settings = pw.get('settings');
          tmp['works'].push({
            code: pw.get('code'),
            _id: pw.get('_id')
          });
        });
        res_work_orders.push(tmp);
      });
    }

    // показать форму настроек
    this.settingsForm = new App.Views.SettingsFormContainerView({
      el:'#settings-modal',
      model: {
        settings: settings,
        work_orders: res_work_orders,
        is_multiple: Object.keys(settings_group_keys).length > 1,
      }
    });
  },

  /**
   * Отобразить диалог натстроек
   */
  settingsForm: function(){
    // проверка, на выбранные работы для корректировки
    if ($('.work-plan-check:checked').length == 0){
      $.jGrowl('Выберите работы или наряды для внесения настроек.', {
        'themeState':'growl-error',
        'sticky':false
      });
      return;
    }

    var result = {
      'orders': {}, // номера заказов
      'sectors_types': {}, // направления работ
      'sectors': {}, // участки
      'work_orders': {}, // наряды
    }

    // нельзя выбрать наряды или работы из разных участков/направлений/заказов
    _.each(App.DataCollection.models, function (wo)
    {
      var order_number = wo.get('contract_number') + '.' + wo.get('production_number') + '.'+ wo.get('production_units')[0]['unit_number'];
      var wo_res = {
        number: Routine.strToInt(wo.get('number')),
        _id: wo.get('_id'),
        checked: false,
        works: [],
        settings: wo.get('settings')
      }
      // если наряд отмечен галкой
      if(wo.get('checked'))
      {
        result['orders'][order_number] = order_number;
        result['sectors'][wo.get('sector_code')] = wo.get('sector_code');
        result['sectors_types'][wo.get('sector_type')] = wo.get('sector_type');
        wo_res['checked'] = true;
      }
      // работы отмеченные галкой
      _.each(wo.get('plan_work').models, function(pw)
      {
        if(pw.get('checked'))
        {
          result['orders'][order_number] = order_number;
          result['sectors'][wo.get('sector_code')] = wo.get('sector_code');
          result['sectors_types'][wo.get('sector_type')] = wo.get('sector_type');

          wo_res['works'].push({
            code: pw.get('code'),
            _id: pw.get('_id'),
            settings: pw.get('settings')
          });
        }
      })
      if(wo_res['checked'] || wo_res['works'].length>0)
        result['work_orders'][wo_res['number']] = wo_res;
    });

    // не допускается выполнять насторойку по несокльким участкам или заказм одновременно
    //if(Object.keys(result.orders).length > 1 || Object.keys(result.sectors).length > 1)
    /*if(Object.keys(result.orders).length > 1 || Object.keys(result.sectors_types).length > 1)
    {
      $.jGrowl('Нельзя выполнять одновременно настройку по нескольким направдениям или заказам.', {
        'themeState':'growl-error',
        'sticky':false
      });
      return;
    }*/

    var settings = null;
    var group_keys = {};
    var res_work_orders = [];

    for(var i in result['work_orders']) {
      var wo = result['work_orders'][i];

      var tmp_wo = {
        number: wo['number'],
        _id: wo['_id'],
        checked: wo['checked'],
        works: []
      };

      if(wo['settings'] && wo['checked']) {
        settings = wo['settings'];
        group_keys[settings['group_key']] = settings['group_key'];
      }
      for(var j in wo['works']) {
        var work = wo['works'][j];
        tmp_wo['works'].push({
          code: work['code'],
          _id: work['_id']
        });
        if(work['settings'])
          group_keys[work['settings']['group_key']] = work['settings']['group_key'];

        if(!settings && work['settings'])
          settings = work['settings'];
      }
      res_work_orders.push(tmp_wo);
    }

    // показать форму настроек
    this.settingsForm = new App.Views.SettingsFormContainerView({
      el:'#settings-modal',
      model: {
        settings: settings,
        work_orders: res_work_orders,
        is_multiple: Object.keys(group_keys).length > 1,
      }
    });

  },

  /**
   * [onPauseItem description]
   * @param params {model: {}, type: 'work/work_order'}
   */
  onPauseItem: function(e, params){
    var pause = null;
    var res_work_orders = [];
    var group_keys = {};
    // работа
    if(params.level=="work"){
      var wo = params.obj.parentView.model;
      var pw = params.obj.model;
      pause = pw.get('pause');
      res_work_orders = [{
        number: wo.get('number'),
        _id: wo.get('_id'),
        checked: false,
        works: [{
          code: pw.get('code'),
          _id: pw.get('_id')
        }]
      }];
    // наряд
    } else if (params.level == "work_order") {
      var wo = params.obj.origin_model;
      pause = wo.get('pause');
      var tmp = {
        number: wo.get('number'),
        _id: wo.get('_id'),
        checked: true,
        works: []
      }
      _.each(wo.get('plan_work').models, function(pw)
      {
        if(pw.get('pause'))
          group_keys[pw.get('pause')['group_key']] = pw.get('pause')['group_key'];

        if(!pause)
          pause = pw.get('pause');
        tmp['works'].push({
          code: pw.get('code'),
          _id: pw.get('_id')
        });
      })
      res_work_orders.push(tmp);
    // любой уровень выше наряда
    } else {
      _.each(params.obj.collection.models, function (wo)
      {
        if(wo.get('pause'))
          group_keys[wo.get('pause')['group_key']] = wo.get('pause')['group_key'];

        var tmp = {
          number: Routine.strToInt(wo.get('number')),
          _id: wo.get('_id'),
          checked: true,
          works: [],
        }
        if(!pause)
          pause = wo.get('pause');
        // работы
        _.each(wo.get('plan_work').models, function(pw)
        {
          if(pw.get('pause'))
            group_keys[pw.get('pause')['group_key']] = pw.get('pause')['group_key'];

          if(!pause)
            pause = pw.get('pause');
          tmp['works'].push({
            code: pw.get('code'),
            _id: pw.get('_id')
          });
        });
        res_work_orders.push(tmp);
      });
    }

    // показать форму настроек
    this.pauseForm = new App.Views.PauseFormContainerView({
      el:'#pause-modal',
      model: {
        pause: pause,
        work_orders: res_work_orders,
        is_multiple: Object.keys(group_keys).length > 1,
      }
    });
  },

  /**
   * Отобразить диалог натстроек
   */
  pauseForm: function(){
    // проверка, на выбранные работы для корректировки
    if ($('.work-plan-check:checked').length == 0){
      $.jGrowl('Выберите работы или наряды для приостановки планов.', {
        'themeState':'growl-error',
        'sticky':false
      });
      return;
    }

    var result = {
      'orders': {}, // номера заказов
      'sectors_types': {}, // направления работ
      'sectors': {}, // участки
      'work_orders': {}, // наряды
    }

    _.each(App.DataCollection.models, function (wo)
    {
      var order_number = wo.get('contract_number') + '.' + wo.get('production_number') + '.'+ wo.get('production_units')[0]['unit_number'];
      var wo_res = {
        number: Routine.strToInt(wo.get('number')),
        _id: wo.get('_id'),
        checked: false,
        works: [],
        pause: wo.get('pause')
      };
      // если наряд отмечен галкой
      if(wo.get('checked'))
      {
        result['orders'][order_number] = order_number;
        result['sectors'][wo.get('sector_code')] = wo.get('sector_code');
        result['sectors_types'][wo.get('sector_type')] = wo.get('sector_type');
        wo_res['checked'] = true;
      }
      // работы отмеченные галкой
      _.each(wo.get('plan_work').models, function(pw)
      {
        if(pw.get('checked'))
        {
          result['orders'][order_number] = order_number;
          result['sectors'][wo.get('sector_code')] = wo.get('sector_code');
          result['sectors_types'][wo.get('sector_type')] = wo.get('sector_type');

          wo_res['works'].push({
            code: pw.get('code'),
            _id: pw.get('_id'),
            pause: pw.get('pause')
          });
        }
      })
      if(wo_res['checked'] || wo_res['works'].length>0)
        result['work_orders'][wo_res['number']] = wo_res;
    });

    var pause = null;
    var group_keys = {};
    var res_work_orders = [];

    for(var i in result['work_orders']) {
      var wo = result['work_orders'][i];

      var tmp_wo = {
        number: wo['number'],
        _id: wo['_id'],
        checked: wo['checked'],
        works: []
      };

      if(wo['pause'] && wo['checked']) {
        pause = wo['pause'];
        group_keys[pause['group_key']] = pause['group_key'];
      }
      for(var j in wo['works']) {
        var work = wo['works'][j];
        tmp_wo['works'].push({
          code: work['code'],
          _id: work['_id']
        });
        if(work['pause'])
          group_keys[work['pause']['group_key']] = work['pause']['group_key'];

        if(!pause && work['pause'])
          pause = work['pause'];
      }
      res_work_orders.push(tmp_wo);
    }

    // показать форму настроек
    this.pauseForm = new App.Views.PauseFormContainerView({
      el:'#pause-modal',
      model: {
        pause: pause,
        work_orders: res_work_orders,
        is_multiple: Object.keys(group_keys).length > 1,
      }
    });
  },

  /**
   * отобразить дилог переноса дат нарядов
   */
  replaceDataDialog:function(){
    // проверка, на выбранные работу для корректировки
    if ($('.work-plan-check:checked').length == 0){
      $.jGrowl('Выберите работы для переноса сроков.', { 'themeState':'growl-error', 'sticky':false });
      return;
    }

    // проверка, для всех ли выбранных работ заданы даты
    var start_date = null;
    var finish_date = null;
    var contract_plan_start_date = null;
    var contract_plan_finish_date = null;
    var have_only_one_date = false;
    var have_conditional_dates = false;

    // сбор данных об отмеченных на перенос работах
    _.each(App.DataCollection.models, function (wo)
    {
        _.each(wo.get('plan_work').models, function(pw)
        {
            if (pw.get('checked') && pw.get('date_start') !=null && pw.get('date_finish')!=null)
            {
              var tmp_start_date = (pw.get('date_start_with_shift'))?Routine.parseDate(pw.get('date_start_with_shift'),'dd.mm.yyyy'):Routine.parseDate(pw.get('date_start'),'dd.mm.yyyy');
              if(!start_date || start_date>tmp_start_date)
                start_date = tmp_start_date;
              var tmp_finish_date = (pw.get('date_finish_with_shift'))?Routine.parseDate(pw.get('date_finish_with_shift'),'dd.mm.yyyy'):Routine.parseDate(pw.get('date_finish'),'dd.mm.yyyy');
              if(!finish_date || finish_date<tmp_finish_date)
                finish_date = tmp_finish_date;
            }

            if (pw.get('checked') && pw.get('contract_plan_date_start') !=null && pw.get('contract_plan_date_finish')!=null)
            {
              var tmp_start_date = (pw.get('contract_plan_date_start_with_shift'))?Routine.parseDate(pw.get('contract_plan_date_start_with_shift'),'dd.mm.yyyy'):Routine.parseDate(pw.get('contract_plan_date_start'),'dd.mm.yyyy');
              if(!contract_plan_start_date || contract_plan_start_date>tmp_start_date)
                contract_plan_start_date = tmp_start_date;
              var tmp_finish_date = (pw.get('contract_plan_date_finish_with_shift'))?Routine.parseDate(pw.get('contract_plan_date_finish_with_shift'),'dd.mm.yyyy'):Routine.parseDate(pw.get('contract_plan_date_finish'),'dd.mm.yyyy');
              if(!contract_plan_finish_date || contract_plan_finish_date<tmp_finish_date)
                contract_plan_finish_date = tmp_finish_date;
            }

             if(pw.get('checked'))
             {
              if(((pw.get('date_start_with_shift') !=null && pw.get('date_finish_with_shift')==null) || (pw.get('date_start_with_shift') ==null && pw.get('date_finish_with_shift')!=null)))
                have_only_one_date = true;
              if(pw.get('date_start_with_shift') ==null && pw.get('date_finish_with_shift')==null  && pw.get('contract_plan_date_start_with_shift')==null && pw.get('contract_plan_date_finish_with_shift') == null)
                have_only_one_date = true;
             }
        });
    });

    if( (!(start_date && finish_date) && !(contract_plan_start_date && contract_plan_finish_date)) || have_only_one_date  )
    {
      $.jGrowl('Для некоторых выбранных работ не заданы даты начала или окончания.', { 'themeState':'growl-error', 'sticky':false });
      return;
    }
    // показать форму для переносов сроков и приостановки работ
    new App.Views.TransferContainerView();
    $('#transfer-modal').modal('show');
  },

  /**
  ** Сохранение данных
  **/
  saveData:function(){
    // Проверка всех дат работ.
    var self = this;
    have_wrong_dates = false;
    have_wrong_finish_dates = false;
    have_only_one_date = false;

    // проходим по всем данным, и сверяем плановые даты
    _.each(this.collection.models, function (wo) {
        _.each(wo.get('plan_work').models, function(pw) {
          try{
            if (pw.get('date_start') !=null && pw.get('date_finish')!=null)
            {
              curDateStart = (pw.get('date_start_with_shift')!=null)? new Date( Routine.parseDate(pw.get('date_start_with_shift'))): new Date(Routine.parseDate(pw.get('date_start'),'dd.mm.yyyy')) ;
              curDateFinish = (pw.get('date_finish_with_shift')!=null)? new Date(Routine.parseDate(pw.get('date_finish_with_shift'))) : new Date(Routine.parseDate(pw.get('date_finish'),'dd.mm.yyyy')) ;
               if(curDateStart>curDateFinish)
                  have_wrong_dates = true;
            }
            else if((pw.get('date_start') !=null && pw.get('date_finish')==null) || (pw.get('date_start') ==null && pw.get('date_finish')!=null))
              have_only_one_date = true;
          }
          catch(err){}
        });
    }, this);

    // если есть неверные даты, то выводим сообщение
    if(have_wrong_dates)
    {
      $.jGrowl('По некоторым работам, дата начала работ превышает дату окончания. Проверьте даты и повторите попытку.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      return;
    }
    // если задана только одна дата, то выводим сообщение
    if(have_only_one_date)
    {
      $.jGrowl('Для некоторых работ задана только дата начала. Необходимо заполнить обе даты.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      return;
    }
    // перепопределение контролов - календарей
    $('.date-edit').removeClass('datepicker1').removeClass('datepicker2').datepicker('remove');
    // вызов глобальной функции сохранения данных
    // спередачей функции колбека для обработки результата сохранения
    App.save(App.DataCollection, null, function(){App.FindView.onSearch();});
  }
});

///------------------------------------------------------------------------------------------------------------------------------------------------
/// Представление элемента контракта
///------------------------------------------------------------------------------------------------------------------------------------------------
App.Views.ContractItemView = App.Views.CommonItemView.extend({
  tagName:'li',
  className:'h1',
  component_prefix: 'contract',
  parentView: null,
  templates: {
    template: _.template($("#ContractItemTemplate").html()),
    linked_date_edit_box_template: _.template($("#LinkedDateEditBoxTemplate").html()),
  },
  events:{
    'click .contract-plan-check': 'onForReplaceItem',
    'click .contract-lock-item':'onLockItem',
    'click .contract-hol-item':'onIgnoreWeekendsItem',
    'click .contract-notify-item':'onNeedNotificationItem',
    'click .contract-conditional-item':'onConditionalDateItem',
    'click .contract-contract-plan-item':'onUseContractPlanItem',
    'click .contract-settings-item':'onSettingsItem',
    'click .contract-pause-item':'onPauseItem',
    // ---edit conditional date events----
    'click .contract-linked-date-edit-container .lnk-ok':'onSaveConditionalDate',
    'click .contract-linked-date-edit-container .lnk-cancel':'onCancelConditionalDate',
  },
  /**
   * инициализация
  **/
  initialize:function(){
    this.parentView = this.options.parentView;
    this.model.unbind('change');
    this.model.bind("change", this.change, this);
  },
  /**
   * Событие изменения модели
  **/
  change: function(){
    // здесь необходима оптимизация, ненужно перерисовывать весь объект со всеми его чайлдами,
    // достаточно пересовать только сам объект
    this.render();
    // раскрыть редактируемую ветку
    // this.$el.find('.cb-item').prop('checked', true);
    Backbone.trigger('global:open_hand_collapsed_items',[this]);
  },
  /**
   * Очистка формы
  **/
  clear: function()
  {
    this.$el.empty();
  },

   /**
   * отрисовка
  **/
  render: function(){
    this.clear();
    // если нет данных на отображение
    if (this.model.get('orders').length == 0)
      return this;
    this.$el.html(this.templates.template(this.model.toJSON()));
    // Отрисовка формы редактирования условной даты
    this.$('.contract-linked-date-edit-container').html(this.templates.linked_date_edit_box_template(this.model.toJSON()));
    // группировка данных по заказам внутри договора
    var data_grouped_by_orders = {}
    for(var i in this.model.get('orders')){
      var row = this.model.get('orders')[i];
      row['items'] = [];
      var tmp_key = row['info']['contract_number'].toString() +'_'+row['info']['production_number'].toString() +'_'+ row['info']['production_unit_number'].toString();
      row['info']['parent_index'] = this.model.get('index');
      data_grouped_by_orders[tmp_key] = row;
    }

    for(var i in this.collection.models)
    {
      var model = this.collection.models[i];
      var key = model.get('contract_number').toString() + '_' + model.get('production_number').toString() + '_' +  model.get('production_unit_number').toString();
      if((key in data_grouped_by_orders)){
        data_grouped_by_orders[key]['items'].push(model);
      }
    }

    // отрисовка поэлементно
    var index = 0;
    for(var i in data_grouped_by_orders)
    {
      var have_settings = false;
      // ----- Проставление флагов каждому участку----------------------------------------------------------------
      var items = data_grouped_by_orders[i]['items'];
      if(!App.FindView.hasFilters() || (items && items.length>0)  ){
        var locked = items.length>0;
        var pause = items.length>0;
        var use_conditional_date = items.length>0;
        var use_weekends = items.length>0;
        var need_notification = items.length>0;
        var checked = items.length>0;
        //---
        var use_contract_plan= items.length>0;
        var contract_plan_locked = items.length>0;
        var contract_plan_use_conditional_date = items.length>0;
        var contract_plan_use_weekends = items.length>0;
        var contract_plan_need_notification = items.length>0;

        for(var j in items)
        {
          var model = items[j];
          if(model.get('settings'))
            have_settings = true;

          for(var work_i in  model.get('plan_work').models)
          {
            var work_model = model.get('plan_work').models[work_i];
            if(work_model.get('settings'))
              have_settings = true;

            if(!work_model.get('locked'))
              locked = false;
            if(!work_model.get('pause'))
              pause = false;
            if(!work_model.get('use_conditional_date'))
              use_conditional_date = false;
            if(!work_model.get('use_weekends'))
              use_weekends = false;
            if(!work_model.get('need_notification'))
              need_notification = false;
            if(!work_model.get('checked'))
              checked = false;
            //----
            if(!work_model.get('use_contract_plan'))
              use_contract_plan = false;
            if(work_model.get('use_contract_plan') && !work_model.get('contract_plan_locked'))
              contract_plan_locked = false;
            if(work_model.get('use_contract_plan') && !work_model.get('contract_plan_use_conditional_date'))
              contract_plan_use_conditional_date = false;
            if(work_model.get('use_contract_plan') && !work_model.get('contract_plan_use_weekends'))
              contract_plan_use_weekends = false;
            if(work_model.get('use_contract_plan') && !work_model.get('contract_plan_need_notification'))
              contract_plan_need_notification = false;
          }
           model.set('locked',locked, {'silent': true});
           // model.set('pause',pause, {'silent': true});
           model.set('use_conditional_date', use_conditional_date, {'silent': true});
           model.set('use_weekends', use_weekends, {'silent': true});
           model.set('need_notification', need_notification, {'silent': true});
           model.set('checked', checked, {'silent': true});
           model.set('use_contract_plan', use_contract_plan, {'silent': true});
           //-----
           model.set('contract_plan_locked', contract_plan_locked, {'silent': true});
           model.set('contract_plan_use_conditional_date', contract_plan_use_conditional_date, {'silent': true});
           model.set('contract_plan_use_weekends', contract_plan_use_weekends, {'silent': true});
           model.set('contract_plan_need_notification', contract_plan_need_notification, {'silent': true});
        }
        data_grouped_by_orders[i]['info']['locked'] = locked;
        data_grouped_by_orders[i]['info']['pause'] = pause;
        data_grouped_by_orders[i]['info']['use_conditional_date'] = use_conditional_date;
        data_grouped_by_orders[i]['info']['use_weekends'] = use_weekends;
        data_grouped_by_orders[i]['info']['need_notification'] = need_notification;
        data_grouped_by_orders[i]['info']['checked'] = checked;
        data_grouped_by_orders[i]['info']['settings'] = have_settings;
        data_grouped_by_orders[i]['info']['level'] = 'order';
        //-----
        data_grouped_by_orders[i]['info']['use_contract_plan'] = use_contract_plan;
        data_grouped_by_orders[i]['info']['contract_plan_locked'] = contract_plan_locked;
        data_grouped_by_orders[i]['info']['contract_plan_use_conditional_date'] = contract_plan_use_conditional_date;
        data_grouped_by_orders[i]['info']['contract_plan_use_weekends'] = contract_plan_use_weekends;
        data_grouped_by_orders[i]['info']['contract_plan_need_notification'] = contract_plan_need_notification;

        //--------------------------------------------------------------------------------------------------------------------------------------
        data_grouped_by_orders[i]['info']['index'] = index;
        this.renderItem(data_grouped_by_orders[i]);
        index++;
      }
    }
    return this;
  },
  /**
   * отрисовка элемента списка
  **/
  renderItem: function(data)
  {
    var model = new App.Models.ItemModel(data['info']);
    var collection = new App.Collections.WorkOrderCollection(data['items']);
    var itemView = new App.Views.OrderItemView({model: model, collection: collection, 'parentView': this});
    // отрисовка на форме
    this.$(".data-orders").append(itemView.render().el);
  }
});

///---------------------------------------------------------------------------------------------------------
/// Представление элемента заказа
///---------------------------------------------------------------------------------------------------------
App.Views.OrderItemView = App.Views.CommonItemView.extend({
  tagName:'li',
  className:'h2',
  component_prefix: 'order',
  parentView: null,
  templates: {
    template: _.template($("#OrderItemTemplate").html()),
    linked_date_edit_box_template: _.template($("#LinkedDateEditBoxTemplate").html()),
  },
  events:{
    'click .order-add-item': 'onNewWorkOrders',
    'click .order-plan-check': 'onForReplaceItem',
    'click .order-lock-item':'onLockItem',
    'click .order-hol-item':'onIgnoreWeekendsItem',
    'click .order-notify-item':'onNeedNotificationItem',
    'click .order-conditional-item':'onConditionalDateItem',
    'click .order-contract-plan-item':'onUseContractPlanItem',
    'click .order-settings-item':'onSettingsItem',
    'click .order-pause-item':'onPauseItem',
    // ---edit conditionsl date events----
    'click .order-linked-date-edit-container .lnk-ok':'onSaveConditionalDate',
    'click .order-linked-date-edit-container .lnk-cancel':'onCancelConditionalDate',
  },

  /**
   * инициализация
  **/
  initialize:function(){
    this.parentView = this.options.parentView;
    this.model.unbind('change');
    this.model.bind("change", this.change, this);
  },

  /**
   * Событие изменения модели
  **/
  change: function(){
    this.render();
    // раскрыть редактируемую ветку
    // this.$el.find('.cb-item').prop('checked', true);
    Backbone.trigger('global:open_hand_collapsed_items',[this]);
  },

  /**
   * Очистка формы
  **/
  clear: function()
  {
    this.$el.empty();
  },

   /**
   * отрисовка
  **/
  render: function(){
    this.clear();
    this.$el.html(this.templates.template(this.model.toJSON()));

    // если нет данных на отображение
    if (this.collection.models.length == 0)
      return this;

    // Отрисовка формы редавтирования условной даты
    this.$('.order-linked-date-edit-container').html(this.templates.linked_date_edit_box_template(this.model.toJSON()));

    // группировка данных по участкам  внутри заказа
    var data_grouped_by_sector_types = {};
    for(var i in this.collection.models)
    {
      var model = this.collection.models[i];
      var key = model.get('sector_type').toString();
      if(!(key  in data_grouped_by_sector_types))
        data_grouped_by_sector_types[key] = {
            'items':[],
            'info': {
              'sector_type': model.get('sector_type'),
              'parent_parent_index': this.model.get('parent_index'),
              'parent_index': this.model.get('index'),
              'use_contract_plan': true,
              'contract_plan_locked': true,
              'contract_plan_use_conditional_date': true,
              'contract_plan_use_weekends': true,
              'contract_plan_need_notification': true
            }
        };
      data_grouped_by_sector_types[key]['items'].push(model);
    }
    // отрисовка поэлементно
    var index = 0;
    for(var i in data_grouped_by_sector_types)
    {
      var have_settings = false;
       // ----- Проставление флагов каждому участку----------------------------------------------------------------
      var items = data_grouped_by_sector_types[i]['items'];
      var locked = true;
      var pause = true;
      var use_conditional_date = true;
      var use_weekends = true;
      var need_notification = true;
      var checked = true;
      //------------------
      var use_contract_plan = true;
      var contract_plan_locked = true;
      var contract_plan_use_conditional_date = true;
      var contract_plan_use_weekends = true;
      var contract_plan_need_notification = true;

      for(var j in items)
      {
        var model = items[j];
        if(model.get('settings'))
          have_settings = true;
        for(var work_i in  model.get('plan_work').models)
        {
          var work_model = model.get('plan_work').models[work_i];
          if(work_model.get('settings'))
            have_settings = true;
          if(!work_model.get('locked'))
            locked = false;
          if(!work_model.get('pause'))
            pause = false;
          if(!work_model.get('use_conditional_date'))
            use_conditional_date = false;
          if(!work_model.get('use_weekends'))
            use_weekends = false;
          if(!work_model.get('need_notification'))
            need_notification = false;
          if(!work_model.get('checked'))
            checked = false;
          if(!work_model.get('use_contract_plan'))
            use_contract_plan = false;
          //------------
          if(work_model.get('use_contract_plan') && !work_model.get('contract_plan_locked'))
            contract_plan_locked = false;
          if(work_model.get('use_contract_plan') && !work_model.get('contract_plan_use_conditional_date'))
            contract_plan_use_conditional_date = false;
          if(work_model.get('use_contract_plan') && !work_model.get('contract_plan_use_weekends'))
            contract_plan_use_weekends = false;
          if(work_model.get('use_contract_plan') && !work_model.get('contract_plan_need_notification'))
            contract_plan_need_notification = false;
        }

        model.set('locked',locked, {'silent': true});
        // model.set('pause',pause, {'silent': true});
        model.set('use_conditional_date', use_conditional_date, {'silent': true});
        model.set('use_weekends', use_weekends, {'silent': true});
        model.set('need_notification', need_notification, {'silent': true});
        model.set('checked', checked, {'silent': true});
        model.set('use_contract_plan', use_contract_plan, {'silent': true});
        //----
        model.set('contract_plan_locked', contract_plan_locked, {'silent': true});
        model.set('contract_plan_use_conditional_date', contract_plan_use_conditional_date, {'silent': true});
        model.set('contract_plan_use_weekends', contract_plan_use_weekends, {'silent': true});
        model.set('contract_plan_need_notification', contract_plan_need_notification, {'silent': true});
      }
      data_grouped_by_sector_types[i]['info']['locked'] = locked;
      data_grouped_by_sector_types[i]['info']['pause'] = pause;
      data_grouped_by_sector_types[i]['info']['use_conditional_date'] = use_conditional_date;
      data_grouped_by_sector_types[i]['info']['use_weekends'] = use_weekends;
      data_grouped_by_sector_types[i]['info']['need_notification'] = need_notification;
      data_grouped_by_sector_types[i]['info']['checked'] = checked;
      data_grouped_by_sector_types[i]['info']['settings'] = have_settings;
      data_grouped_by_sector_types[i]['info']['level'] = 'sector_type';
      //---
      data_grouped_by_sector_types[i]['info']['use_contract_plan'] = use_contract_plan;
      data_grouped_by_sector_types[i]['info']['contract_plan_locked'] = contract_plan_locked;
      data_grouped_by_sector_types[i]['info']['contract_plan_use_conditional_date'] = contract_plan_use_conditional_date;
      data_grouped_by_sector_types[i]['info']['contract_plan_use_weekends'] = contract_plan_use_weekends;
      data_grouped_by_sector_types[i]['info']['contract_plan_need_notification'] = contract_plan_need_notification;

      //--------------------------------------------------------------------------------------------------------------------------------------

      data_grouped_by_sector_types[i]['info']['index'] = index;
      this.renderItem(data_grouped_by_sector_types[i]);
      index++;
    }
    return this;
  },

  /**
   * отрисовка элемента списка
  **/
  renderItem: function(data)
  {
    var model = new App.Models.ItemModel(data['info']);
    var collection = new App.Collections.WorkOrderCollection(data['items']);
    var itemView = new App.Views.SectorTypeItemView({model: model, collection: collection, 'parentView': this});
    // отрисовка на форме
    this.$(".data-sector-types").append(itemView.render().el);
  }
});


///------------------------------------------------------------------------------------------------------------------------------------------------
/// Представление элемента заказа
///------------------------------------------------------------------------------------------------------------------------------------------------
App.Views.SectorTypeItemView = App.Views.CommonItemView.extend({
  tagName:'li',
  className:'h3',
  component_prefix: 'sector-type',
  parentView: null,
  templates: {
    template: _.template($("#SectorTypeItemTemplate").html()),
    linked_date_edit_box_template: _.template($("#LinkedDateEditBoxTemplate").html()),
  },

  events:{
    'click .sector-type-add-item': 'onNewWorkOrders',
    'click .sector-type-plan-check': 'onForReplaceItem',
    'click .sector-type-lock-item':'onLockItem',
    'click .sector-type-hol-item':'onIgnoreWeekendsItem',
    'click .sector-type-notify-item':'onNeedNotificationItem',
    'click .sector-type-conditional-item':'onConditionalDateItem',
    'click .sector-type-contract-plan-item':'onUseContractPlanItem',
    'click .sector-type-settings-item':'onSettingsItem',
    'click .sector-type-pause-item':'onPauseItem',
    // ---edit conditionsl date events----
    'click .sector-type-linked-date-edit-container .lnk-ok':'onSaveConditionalDate',
    'click .sector-type-linked-date-edit-container .lnk-cancel':'onCancelConditionalDate',
  },

  /**
   * инициализация
  **/
  initialize:function(){
    this.parentView = this.options.parentView;
    this.model.unbind('change');
    this.model.bind("change", this.change, this);
  },

  /**
   * Событие изменения модели
  **/
  change: function(){
    this.render();
    // раскрыть редактируемую ветку
    // this.$el.find('.cb-item').prop('checked', true);
    Backbone.trigger('global:open_hand_collapsed_items',[this]);
  },

  /**
   * Очистка формы
  **/
  clear: function()
  {
    this.$el.empty();
  },

   /**
   * отрисовка
  **/
  render: function(){
    this.clear();
    // если нет данных на отображение
    if (this.collection.models.length == 0)
      return;
    this.$el.html(this.templates.template(this.model.toJSON()));

    // Отрисовка формы редавтирования условной даты
    this.$('.sector-type-linked-date-edit-container').html(this.templates.linked_date_edit_box_template(this.model.toJSON()));

    // группировка данных по участкам  внутри заказа
    var data_grouped_by_sectors = {};
    for(var i in this.collection.models)
    {
      var model = this.collection.models[i];
      var key = model.get('sector_code').toString();
      if(!(key  in data_grouped_by_sectors))
        data_grouped_by_sectors[key] = {
            'items':[],
            'info': {
              'sector_code': model.get('sector_code'),
              'sector_name': model.get('sector_name'),
              'parent_parent_parent_index': this.model.get('parent_parent_index'),
              'parent_parent_index': this.model.get('parent_index'),
              'parent_index': this.model.get('index'),
              'locked': true,
              'pause': true,
              'use_conditional_date': true,
              'use_weekends': true,
              'need_notification': true,
              'checked': true,
              'use_contract_plan': true,
              'contract_plan_locked': true,
              'contract_plan_use_conditional_date': true,
              'contract_plan_use_weekends': true,
              'contract_plan_need_notification': true
            }
        };
      data_grouped_by_sectors[key]['items'].push(model);
    }
    // отрисовка поэлементно
    var index = 0;
    for(var i in data_grouped_by_sectors)
    {
      var have_settings = false;
      // ----- Проставление флагов каждому участку----------------------------------------------------------------
      var items = data_grouped_by_sectors[i]['items'];
      var locked = true;
      var pause = true;
      var use_conditional_date = true;
      var use_weekends = true;
      var need_notification = true;
      var checked = true;
      //------------------
      var use_contract_plan = true;
      var contract_plan_locked = true;
      var contract_plan_use_conditional_date = true;
      var contract_plan_use_weekends = true;
      var contract_plan_need_notification = true;

      for(var j in items)
      {
        var model = items[j];
        if(model.get('settings'))
          have_settings = true;
        for(var work_i in  model.get('plan_work').models)
        {
          var work_model = model.get('plan_work').models[work_i];
          if(work_model.get('settings'))
           have_settings = true;
          if(!work_model.get('locked'))
            locked = false;
          if(!work_model.get('pause'))
            pause = false;
          if(!work_model.get('use_conditional_date'))
            use_conditional_date = false;
          if(!work_model.get('use_weekends'))
            use_weekends = false;
          if(!work_model.get('need_notification'))
            need_notification = false;
          if(!work_model.get('checked'))
            checked = false;
          if(!work_model.get('use_contract_plan'))
            use_contract_plan = false;
          //------------
          if(work_model.get('use_contract_plan') && !work_model.get('contract_plan_locked'))
            contract_plan_locked = false;
          if(work_model.get('use_contract_plan') && !work_model.get('contract_plan_use_conditional_date'))
            contract_plan_use_conditional_date = false;
          if(work_model.get('use_contract_plan') && !work_model.get('contract_plan_use_weekends'))
            contract_plan_use_weekends = false;
          if(work_model.get('use_contract_plan') && !work_model.get('contract_plan_need_notification'))
            contract_plan_need_notification = false;
        }

         model.set('locked',locked, {'silent': true});
         // model.set('pause',pause, {'silent': true});
         model.set('use_conditional_date', use_conditional_date, {'silent': true});
         model.set('use_weekends', use_weekends, {'silent': true});
         model.set('need_notification', need_notification, {'silent': true});
         model.set('checked', checked, {'silent': true});
         model.set('use_contract_plan', use_contract_plan, {'silent': true});
         //----
         model.set('contract_plan_locked', contract_plan_locked, {'silent': true});
         model.set('contract_plan_use_conditional_date', contract_plan_use_conditional_date, {'silent': true});
         model.set('contract_plan_use_weekends', contract_plan_use_weekends, {'silent': true});
         model.set('contract_plan_need_notification', contract_plan_need_notification, {'silent': true});
      }

      data_grouped_by_sectors[i]['info']['locked'] = locked;
      data_grouped_by_sectors[i]['info']['pause'] = pause;
      data_grouped_by_sectors[i]['info']['use_conditional_date'] = use_conditional_date;
      data_grouped_by_sectors[i]['info']['use_weekends'] = use_weekends;
      data_grouped_by_sectors[i]['info']['need_notification'] = need_notification;
      data_grouped_by_sectors[i]['info']['checked'] = checked;
      data_grouped_by_sectors[i]['info']['settings'] = have_settings;
      data_grouped_by_sectors[i]['info']['level'] = 'sector';
      //----
      data_grouped_by_sectors[i]['info']['use_contract_plan'] = use_contract_plan;
      data_grouped_by_sectors[i]['info']['contract_plan_locked'] = contract_plan_locked;
      data_grouped_by_sectors[i]['info']['contract_plan_use_conditional_date'] = contract_plan_use_conditional_date;
      data_grouped_by_sectors[i]['info']['contract_plan_use_weekends'] = contract_plan_use_weekends;
      data_grouped_by_sectors[i]['info']['contract_plan_need_notification'] = contract_plan_need_notification;
      //--------------------------------------------------------------------------------------------------------------------------------------
      data_grouped_by_sectors[i]['info']['index'] = index;
      this.renderItem(data_grouped_by_sectors[i]);
      index++;
    }
    return this;
  },

  /**
   * отрисовка элемента списка
  **/
  renderItem: function(data)
  {
    var model = new App.Models.ItemModel(data['info']);
    var collection = new App.Collections.WorkOrderCollection(data['items']);
    var itemView = new App.Views.SectorItemView({model: model, collection: collection, parentView: this});
    // отрисовка на форме
    this.$(".data-sectors").append(itemView.render().el);
  }
});


///---------------------------------------------------------------------------------------------------------
/// Представление элемента участка
///---------------------------------------------------------------------------------------------------------
App.Views.SectorItemView = App.Views.CommonItemView.extend({
  tagName:'li',
  className:'h3',
  component_prefix: 'sector',
  need_parent_remove: true,
  parentView: null,
  templates: {
    template: _.template($("#SectorItemTemplate").html()),
    linked_date_edit_box_template: _.template($("#LinkedDateEditBoxTemplate").html()),
  },
  events:{
    'click .sector-add-item': 'onNewWorkOrders',
    'click .sector-plan-check': 'onForReplaceItem',
    'click .sector-lock-item':'onLockItem',
    'click .sector-hol-item':'onIgnoreWeekendsItem',
    'click .sector-notify-item':'onNeedNotificationItem',
    'click .sector-conditional-item':'onConditionalDateItem',
    'click .sector-contract-plan-item':'onUseContractPlanItem',
    'click .lnk-people': 'onPeopleClick',
    'click .sector-settings-item':'onSettingsItem',
    'click .sector-pause-item':'onPauseItem',
    // ---edit conditionsl date events----
    'click .sector-linked-date-edit-container .lnk-ok':'onSaveConditionalDate',
    'click .sector-linked-date-edit-container .lnk-cancel':'onCancelConditionalDate',
  },
   /**
   * инициализация
  **/
  initialize:function(){
    this.parentView = this.options.parentView;
    this.model.unbind('change');
    this.model.bind("change", this.change, this);
  },

  /**
   * Событие изменения модели
  **/
  change: function(){
    this.render();
    // раскрыть редактируемую ветку
    // this.$el.find('.cb-item').prop('checked', true);
    Backbone.trigger('global:open_hand_collapsed_items',[this]);
  },

  /**
   * Очистка формы
  **/
  clear: function()
  {
    this.$el.empty();
  },

   /**
   * отрисовка
  **/
  render: function(){
    this.clear();
    // если нет данных на отображение
    if (this.collection.models.length == 0)
      return;
    this.$el.html(this.templates.template(this.model.toJSON()));

    // Отрисовка формы редавтирования условной даты
    this.$('.sector-linked-date-edit-container').html(this.templates.linked_date_edit_box_template(this.model.toJSON()));

    var index = 0;
    var have_settings = false;
    for(var i in this.collection.models)
    {
      var model = this.collection.models[i];
      if(model.get('settings'))
        have_settings = true;
      var locked = true;
      var pause = true;
      var use_conditional_date = true;
      var use_weekends = true;
      var need_notification = true;
      var checked = true;
      //------------------
      var use_contract_plan = true;
      var contract_plan_locked = true;
      var contract_plan_use_conditional_date = true;
      var contract_plan_use_weekends = true;
      var contract_plan_need_notification = true;

      for(var work_i in  model.get('plan_work').models)
      {
        var work_model = model.get('plan_work').models[work_i];
        if(work_model.get('settings'))
          have_settings = true;
        if(!work_model.get('locked'))
          locked = false;
        if(!work_model.get('pause'))
          pause = false;
        if(!work_model.get('use_conditional_date'))
          use_conditional_date = false;
        if(!work_model.get('use_weekends'))
          use_weekends = false;
         if(!work_model.get('need_notification'))
          need_notification = false;
        if(!work_model.get('checked'))
          checked = false;
        if(!work_model.get('use_contract_plan'))
          use_contract_plan = false;
        //------------
        if(work_model.get('use_contract_plan') && !work_model.get('contract_plan_locked'))
          contract_plan_locked = false;
        if(work_model.get('use_contract_plan') && !work_model.get('contract_plan_use_conditional_date'))
          contract_plan_use_conditional_date = false;
        if(work_model.get('use_contract_plan') && !work_model.get('contract_plan_use_weekends'))
          contract_plan_use_weekends = false;
        if(work_model.get('use_contract_plan') && !work_model.get('contract_plan_need_notification'))
          contract_plan_need_notification = false;
      }

      // если наряд завершен, то собираем информацию кем завершен
      if (model.get('status') == 'completed'){
        var completed_by = null;

        _.each(model.get('plan_work').models, function(plan_work_row)
        {
          if(plan_work_row.get('status_log') && plan_work_row.get('status_log').length>0)
          {
            for(var j in plan_work_row.get('status_log')){
              var status_log_row = plan_work_row.get('status_log')[j];
              if(status_log_row['status']=='completed' &&
                  (completed_by==null || completed_by['date_change']<status_log_row['date_change'])
                )
                {
                  completed_by = status_log_row;
                }
            }
          }
        });
      }

      var tmp_info = {
        'number': model.get('number'),
        'status': model.get('status'),
        'parent_parent_parent_parent_index': this.model.get('parent_parent_parent_index'),
        'parent_parent_parent_index': this.model.get('parent_parent_index'),
        'parent_parent_index': this.model.get('parent_index'),
        'parent_index': this.model.get('index'),
        'index': index,
        'locked': locked,
        'pause': pause,
        'use_conditional_date': use_conditional_date,
        'use_weekends': use_weekends,
        'use_contract_plan': use_contract_plan,
        'need_notification': need_notification,
        'checked': checked,
        'is_auto': this.model.get('is_auto'),
        'contract_plan_locked': contract_plan_locked,
        'contract_plan_use_conditional_date': contract_plan_use_conditional_date,
        'contract_plan_use_weekends': contract_plan_use_weekends,
        'contract_plan_need_notification': contract_plan_need_notification,
        'people': model.get('people'),
        'edit_people': false,
        'history': model.get('history'),
        'completed_by': completed_by,
        'level': 'work_order'
        // 'settings': have_settings // на уровне нарядв могут быть свои насторойки
      };

      this.renderItem(new App.Models.ItemModel(tmp_info), model.get('plan_work'), model);
      index++;
    }
    return this;
  },

  /**
   * отрисовка элемента списка
  **/
  renderItem: function(model, collection, origin_model)
  {
    var itemView = new App.Views.WorkOrderItemView({model: model, collection: collection, parentView: this, origin_model: origin_model});
    // отрисовка на форме
    this.$(".data-workorders").append(itemView.render().el);
  }
});

///---------------------------------------------------------------------------------------------------------
/// Представление элемента наряда
///---------------------------------------------------------------------------------------------------------
App.Views.WorkOrderItemView = App.Views.CommonItemView.extend({
  tagName:'li',
  className:'h4',
  component_prefix: 'workorder',
  need_parent_remove: true,
  parentView: null,
  templates: {
    template: _.template($("#WorkOrderItemTemplate").html()),
    linked_date_edit_box_template: _.template($("#LinkedDateEditBoxTemplate").html()),
  },
  events:{
    'change .remark-comments': 'onRemarkCommentChange',
    'click .remark-chk':'onRemarkChk',
    'click .workorder-edit-item': 'onEditWorkOrder',
    'click .workorder-remove-item': 'onItemRemove',
    'click .workorder-plan-check': 'onForReplaceItem',
    'click .workorder-lock-item':'onLockItem',
    'click .workorder-settings-item':'onSettingsItem',
    'click .workorder-pause-item':'onPauseItem',
    'click .workorder-hol-item':'onIgnoreWeekendsItem',
    'click .workorder-notify-item':'onNeedNotificationItem',
    'click .workorder-conditional-item':'onConditionalDateItem',
    'click .workorder-contract-plan-item':'onUseContractPlanItem',
    'click .lnk-people': 'onPeopleClick',
    'change .tb-people': 'onPeopleChange',
    'blur .tb-people': 'onPeopleBlur',

    // ---edit conditionsl date events----
    'click .workorder-linked-date-edit-container .lnk-ok':'onSaveConditionalDate',
    'click .workorder-linked-date-edit-container .lnk-cancel':'onCancelConditionalDate',
  },
   /**
   * инициализация
  **/
  initialize:function(){
    this.origin_model = this.options.origin_model;
    this.parentView = this.options.parentView;
    this.model.unbind('change');
    this.model.bind("change", this.change, this);
  },

  /**
   * Событие изменения модели
  **/
  change: function(){
    this.render();
    // раскрыть редактируемую ветку
    // this.$el.find('.cb-item').prop('checked', true);
    Backbone.trigger('global:open_hand_collapsed_items',[this]);
  },

  /**
   * отрисовка
  **/
  render: function(){
    var self = this;
    this.clear();
    // если нет данных на отображение
    if (this.collection.models.length == 0)
      return;
    // отрисовка наряда
    this.$el.html(this.templates.template($.extend({},this.model.toJSON(),{
      remarks: this.origin_model.get('remarks'),
      settings: this.origin_model.get('settings')})
    ));

    // Отрисовка формы редавтирования условной даты
    this.$('.workorder-linked-date-edit-container').html(this.templates.linked_date_edit_box_template(this.model.toJSON()));

    // отрисовка работ наряда
    for(var i in this.collection.models)
    {
      var model = this.collection.models[i];
      // проверка на фильтр
      var is_w_checked = false;
      // проверка на фильтрацию по работам
      if(App.dataListView.filter_works && App.dataListView.filter_works.length>0){

        var  no_volumes = true;
         var  no_days = true;
        var  no_dates = true;

        for(var f in App.dataListView.filter_works){
          switch(App.dataListView.filter_works[f])
          {
            case "no_volumes":
              if(model.get('scope'))
                no_volumes = false;
            break;
            case "no_days":
              if(model.get('days_count'))
                  no_days = false;
            break;
            case "no_dates":
              if(model.get('date_start') || model.get('date_finish'))
                    no_dates = false;
            break;
          }
        }
        is_w_checked = no_volumes && no_days && no_dates
      }
      else
        is_w_checked = true;
      if(is_w_checked)
        this.renderItem(model);
    }

    // лочить,  если наряд завершен / убрано по просьбе Романа 25.09.2017
    // В нарядах, у работ, которые закрыты по журналу лочится корректировка сроков, надо бурать
    // if(this.model.has('status') && this.model.get('status') == 'completed')
    //  this.$el.find('input,textarea, button, select').not('.cb-item').prop("disabled", true);

    var tmp_tokens = [];
    if(this.origin_model.get('remarks'))
    {
       tmp_tokens = this.origin_model.get('remarks')['claims'];
       this.$(".remark-comments").val(this.origin_model.get('remarks').comments);
    }

    this.$(".remark-numbers").tokenInput("/handlers/workorder_getclaims/",{
      theme: "facebook",
      zindex:1300,
      hintText:"Введите для поиска",
      noResultsText:"Ничего не найдено",
      searchingText:"Поиск...",
      allowFreeTagging:false,
      preventDuplicates:true,
      onAdd: function(e){
        self.origin_model.get('remarks').claims = self.$el.find(".remark-numbers").tokenInput('get');
      },
      onDelete: function(e){
        self.origin_model.get('remarks').claims = self.$el.find(".remark-numbers").tokenInput('get');
      },
      prePopulate: tmp_tokens
    });
    return this;
  },
  /**
   * отрисовка элемента списка
  **/
  renderItem: function(model)
  {
    var itemView = new App.Views.WorkItemView({model: model, parentView: this});
    // отрисовка на форме
    this.$(".data-works-body").append(itemView.render().el);
    this.$('.tb-people').numeric({ negative: false, decimal: '' });
  },

  /**
   ** Удаление элемента
  **/
  onItemRemove: function(e){
    if($(e.currentTarget).data('disabled'))
      return;

    // нельзя удалить наряд, если он привязан к платежам или создан автоматически
    // вычисление ведется по работам наряда
    var have_works_with_payments = false;
     var workoder_model = this.origin_model.toJSON();
     for(var i in workoder_model['plan_work'].models)
      if(workoder_model['plan_work'].models[i].get('payment_id') || workoder_model['plan_work'].models[i].get('is_auto'))
      {
        have_works_with_payments = true;
        break;
      }
    if(have_works_with_payments){
      $.jGrowl('Нельзя удалить автоматически - созданный наряд.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      return;
    }

    var self = this;
    var msg = "";
    msg = "Вы действительно хотите удалить весь наряд? Наряд будет сразу удален без необходимости нажатия кнопки сохранения.";
    bootbox.confirm(msg, function(result){
          if(result)
          {
            // сброс флага на сервере
            Routine.showLoader();
            $.ajax({
              type: "POST",
              url: "/handlers/workorderdate/remove_workorder",
              data: JSON.stringify({'workorder_number': self.model.get('number')}),
              timeout: 35000,
              contentType: 'application/json',
              dataType: 'json',
              async:true
            }).done(function(result) {
                if(result['status']=="ok")
                {
                  $.jGrowl('Данные успешно удалены', { 'themeState':'growl-success', 'sticky':false, life: 10000});
                  // удаление наряда из коллекции
                  self.remove();
                }
                else
                  $.jGrowl('Ошибка удаления данных. Подробности: ' + result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 10000 });
            }).always(function(){Routine.hideLoader();
            }).error(function(e){$.jGrowl('Ошибка сервера, попробуйте повторить попытку.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });});
          }
    });
  },

  /**
   ** Отображение представления добавления работ  в существующий наряд
  **/
  onEditWorkOrder:function(e){
    if($(e.currentTarget).data('disabled'))
        return;
    var workoder_model = this.origin_model.toJSON();
    var sector_model = this.parentView.model.toJSON();
    var sector_type_model = this.parentView.parentView.model.toJSON();
    var order_model = this.parentView.parentView.parentView.model.toJSON();

    var exclude_works_id = {};
    for(var i in workoder_model['plan_work'].models)
      exclude_works_id[workoder_model['plan_work'].models[i].get('work_id') ] = workoder_model['plan_work'].models[i].get('work_id');

    // отображение формы заполнение данных для новых нарядов
    new App.Views.WorkOrderAddView({
      mode: 'edit',
      model:{
        sector:sector_model,
        sector_type: sector_type_model,
        order:order_model,
        workorder: workoder_model,
        exclude_works_id: exclude_works_id,
        mode: 'edit'
      }
    }).$el.modal('show');
  },

  /**
   ** ОТображение формы устранения замечаний
   **/
  onRemarkChk:function(e){
    var chk = $(e.currentTarget);
    this.origin_model.get('remarks').contains_remark = chk.is(":checked");
    this.origin_model.set('changed', true);
    if(chk.is(":checked"))
      this.$el.find(".remark-frm").show();
    else
      this.$el.find(".remark-frm").hide();
  },

  /**
  ** Событие смены коментария блока устранения замечаний
  **/
  onRemarkCommentChange: function(e){
    this.origin_model.get('remarks').comments = $(e.currentTarget).val();
  },

  /**
   * Функция клика по участникам на наряде
  **/
  onPeopleClick: function(e){
    this.model.set('edit_people',true);
    this.$('.tb-people').focus();
  },

  /**
   * Функция изменения количества работников на наряде
  **/
  onPeopleChange: function(e){
    e.preventDefault();
    var val = Routine.strToInt($(e.currentTarget).val());
    this.origin_model.set('people', val);
    this.model.set('people', val);
    this.model.set('edit_people',false);
  },

  /*onSettingsItem: function(e){
    if($(e.currentTarget).data('disabled'))
      return;
    this.$el.trigger("onSettingsItem", {
      model: this.origin_model,
      type: 'workorder',
      parent_model: this.parentView.model
    });
  }*/
});

///---------------------------------------------------------------------------------------------------------
/// Представление элемента работы
///---------------------------------------------------------------------------------------------------------
App.Views.WorkItemView = Backbone.View.extend({
  className: 'plan-row item lbl-item',
  tagName:'tr',
  parentView: null, // View ы который входит текущий
  templates: {
    template: _.template($("#WorkItemTemplate").html()),
  },
  events:{
    'click .work-remove-item': 'onItemRemove',
    'blur input.volume': 'onVolumeBlur',
    'blur input.timing': 'onTimingBlur',
    'keyup input.volume': 'onVolumeChange',

    'click .work-plan-check': 'onForReplaceItem',
    'click .lock-item':'onLockItem',
    'click .hol-item':'onIgnoreWeekendsItem',
    'click .settings-item':'onSettingsItem',
    'click .pause-item':'onPauseItem',

    'click .notify-item':'onNeedNotificationItem',
    'click .conditional-item':'onConditionalDateItem',
    'click .contract-plan-item':'onUseContractPlanItem',
    // ---edit conditionsl datte events----
    'click .lnk-ok':'onSaveConditionalDate',
    'click .lnk-cancel':'onCancelConditionalDate',
    'click .lnk-conditional-date': 'onEditConditionslDate',
    // ----- events by trigger------
    'change .lock-item':'onLockChanged',
    'change .hol-item':'onIgnoreWeekendsChanged',
    'change .notify-item':'onNeedNotificationChanged',
    'change .conditional-item':'onConditionalDateChanged',
    'change .contract-plan-item':'onUseContractPlanChanged'
  },

  /**
   * инициализация
   */
  initialize:function(){
    this.parentView = this.options.parentView;
    this.model.unbind('change');
    this.model.bind("change", this.change, this);
  },
  clear: function()
  {
    this.$el.empty();
  },
  change: function()
  {
    this.render();
  },

  /**
   * Отрисовка плановых дат.
   * Также идет назначение событий календарям.
   * Входной перемтер - префикс для одинаковых полей с разными названиями
   */
  render_plan_dates: function(als){
    var self = this;
    // события на календари
    var nowTemp = new Date();
    var now = new Date(nowTemp.getFullYear(), nowTemp.getMonth(), nowTemp.getDate(), 0, 0, 0, 0);
    // если даты заданы, то менять их календарями больше нельзя
    // собственные планы
    if (this.model.get(als+'date_start_with_shift')){
      this.$('.'+als+'datepicker1').removeClass(als+'datepicker1');
      this.$('.'+als+'datepicker2').removeClass(als+'datepicker2');
    }
    // начальная дата
    var checkin = this.$('.' + als + 'datepicker1').datepicker({
      calendarWeeks: true,
      format:'dd.mm.yyyy',
      weekStart:1,
      onRender: function(date) {
         if(App.hasUserAccessToTransferDates())
          return date.valueOf() < now.valueOf() ? 'disabled' : '';
      }
      }).on('changeDate', function(ev) {
          var newDate = new Date(ev.date);
          self.$('.'+als+'datepicker1').addClass('date-edit');
          self.model.set(als+'date_start',moment(ev.date).format('DD.MM.YYYY'), {'silent': true});
          checkin.hide();
          // если известна длительность, используя ее расчтываем дату окончания
          // иначе если задана дата окончания, то рассчитываем длтельность по двум датам
          if (self.model.get(als+'days_count')){
            newDate.setDate(newDate.getDate() + self.model.get(als+'days_count')-1);
            self.$('.'+als+'datefinish').val(moment(newDate).format('DD.MM.YYYY'));
            self.model.set(als+'date_finish',moment(newDate).format('DD.MM.YYYY'), {'silent': true});
          }
          else{
            if(self.model.get(als+'date_finish')){
              var days_count =  Routine.strToInt(moment(self.model.get(als+'date_finish' ),'DD.MM.YYYY').diff(moment(self.model.get(als+'date_start' ),'DD.MM.YYYY'), 'days')) + 1;
              self.model.set(als+'days_count',days_count, {'silent': true});
              self.$('input.'+als+'days').val(days_count);
            }
          }
    }).data('datepicker');

    // конечная дата
    var checkout = this.$('.'+als+'datepicker2').datepicker({
      calendarWeeks: true,
      format:'dd.mm.yyyy',
      weekStart:1,
      onRender: function(date) {
      return date.valueOf() <= checkin.date.valueOf() ? 'disabled' : '';
      }
    }).on('changeDate', function(ev) {
      var newDate = new Date(ev.date);
      self.$('.'+als+'datepicker2').addClass('date-edit');
      self.model.set(als+'date_finish',moment(ev.date).format('DD.MM.YYYY'), {'silent': true});
      checkout.hide();
      // если известна длительность, используя ее расчтываем дату начала
      // иначе если задана дата начала, то рассчитываем длтельность по двум датам
      if (self.model.get(als+'days_count')){
        newDate.setDate(newDate.getDate() - self.model.get(als+'days_count') + 1);
        self.$('.'+als+'datestart').val(moment(newDate).format('DD.MM.YYYY'));
        self.model.set(als+'date_start',moment(newDate).format('DD.MM.YYYY'), {'silent': true});
      }
      else{
        if(self.model.get(als+'date_start')){
          var days_count =  Routine.strToInt(moment(self.model.get(als+'date_finish' ),'DD.MM.YYYY').diff(moment(self.model.get(als+'date_start' ),'DD.MM.YYYY'), 'days'))+1;
          self.model.set(als+'days_count',days_count, {'silent': true});
          self.$('input.'+als+'days').val(days_count);
        }
      }
    }).data('datepicker');

     // количество дней
    var days_count = Routine.strToInt(this.model.get(als+'days_count'));
    this.$('input.'+als+'days').change(function(e)
    {
      var days_count = Routine.strToInt($(e.currentTarget).val());
      self.model.set(als+'days_count', days_count);
      if(days_count>0)
      {
        // если при смене количества дней, задана какая-либо из дат,
        // то вторая дата расчитывается автоматически
        if(self.model.get(als+'date_start')){
           var date_finish_str = moment(self.model.get(als+'date_start' ),'DD.MM.YYYY').add(days_count-1, 'day').format('DD.MM.YYYY');
           self.model.set(als+'date_finish', date_finish_str);
           self.$('.'+als+'datepicker2').val(date_finish_str);
           self.$('.'+als+'datepicker2').datepicker('update');
        }
        else if(self.model.get(als+'date_finish')){
           var date_start_str = moment(self.model.get(als+'date_finish' ),'DD.MM.YYYY').add(-(days_count-1), 'day').format('DD.MM.YYYY');
           self.model.set(als+'date_start', date_start_str);
           self.$('.'+als+'datepicker1').val(date_start_str);
           self.$('.'+als+'datepicker1').datepicker('update');
        }
      }
    });

    // дни - числовое поле
    this.$('input.'+als+'days').numeric({ negative: false, decimal: '' });
  },

   /**
   * отрисовка
  **/
  render: function(){
    // отрисовка шаблона
    this.$el.html(this.templates.template(this.model.toJSON()));
    // отрисовка календарей для собственных и договорных планов
    // также навешивание события на поле - количество дней
    this.render_plan_dates('');
    if(this.model.get('use_contract_plan'))
      this.render_plan_dates('contract_plan_');

    // подключаем числовые форматы на объем и количество дней
    // this.$('input.volume').numeric({ negative: false, decimal: ',' });

    // лочить, если работа завершена / Убрано по просьбе Романа 25.09.2017
    // В нарядах, у работ, которые закрыты по журналу лочится корректировка сроков, надо бурать
    //if((this.model.has('status') && this.model.get('status') == 'completed'))
    //  this.$el.find('input, textarea, button, select').prop("disabled", true);

    return this;
  },

  /**
  * Событие выбора флага переноса дат
  **/
  onForReplaceItem: function(){
    $('body').addClass('wait');
    var self = this;
    setTimeout(function(){
      self.onForReplaceChanged();
      $('body').removeClass('wait');
    },100);
  },

  onForReplaceChanged: function(){
    var self=  this;
    var checked = false;
    if (self.$('.work-plan-check').prop('checked'))
      checked = true;
    self.model.set('checked', checked);
    // проверяем родителя на необходимость выбора общего флага
    self.parentView.checkForReplace();
  },

  /**
   * Событие залочивания элемента
  **/
  onLockItem:function(e){
    if($(e.currentTarget).data('disabled'))
      return;
    $('body').addClass('wait');
    var self = this;
    setTimeout(function(){
      var locked =false;
      if($(e.currentTarget).find("i").hasClass("fa-unlock"))
        locked = true;
      $(e.currentTarget).find("i").removeClass("fa-lock").removeClass("fa-unlock").addClass(locked?'fa-lock':'fa-unlock');
      $(e.currentTarget).trigger("change");
      $('body').removeClass('wait');
    },100);
  },
  onLockChanged:function(e){
    var self = this;
    var is_contract_plan = $(e.currentTarget).data('contract-plan');
    var locked =false;
    if($(e.currentTarget).find("i").hasClass("fa-lock"))
      locked = true;

    if( is_contract_plan)
      self.model.set("contract_plan_locked",locked);
    else
      self.model.set("locked",locked);
    // проверяем родителя на необходимость выбора общего флага
    self.parentView.checkForLock();
  },

  /**
   * Событие игнора выходных
  **/
  onIgnoreWeekendsItem: function(e)
  {
    var self = this;
    if($(e.currentTarget).data('disabled'))
      return;
    $('body').addClass('wait');
    setTimeout(function(){
      var use_weekends =false;
      if(!($(e.currentTarget).find("i").hasClass("use_weekends")))
        use_weekends = true;
      $(e.currentTarget).find("i").removeClass("use_weekends").addClass(use_weekends?'use_weekends':'');
      $(e.currentTarget).trigger("change");
      $('body').removeClass('wait');
    },100);
  },
  onIgnoreWeekendsChanged:function(e){
    var is_contract_plan = $(e.currentTarget).data('contract-plan');
    var use_weekends =false;
    if($(e.currentTarget).find("i").hasClass("use_weekends"))
      use_weekends = true;
    if( is_contract_plan)
      this.model.set("contract_plan_use_weekends",use_weekends);
    else
      this.model.set("use_weekends",use_weekends);
    // проверяем родителя на необходимость выбора общего флага
    this.parentView.checkForUseWeekends();
  },

  /**
   * Событие использования договорных планов
  **/
  onUseContractPlanItem: function(e)
  {
    if($(e.currentTarget).data('disabled'))
      return;
    $('body').addClass('wait');
    var self = this;
    setTimeout(function(){
      var use_contract_plan =false;
      if(!($(e.currentTarget).find("i").hasClass("use_contract_plan")))
        use_contract_plan = true;
      $(e.currentTarget).find("i").removeClass("use_contract_plan").addClass(use_contract_plan?'use_contract_plan':'');
      $(e.currentTarget).trigger("change");
      $('body').removeClass('wait');
    },100);
  },
  onUseContractPlanChanged:function(e){
    var use_contract_plan =false;
    if($(e.currentTarget).find("i").hasClass("use_contract_plan"))
      use_contract_plan = true;
    this.model.set("use_contract_plan",use_contract_plan);
    // проверяем родителя на необходимость выбора общего флага
    this.parentView.checkForUseContractPlan();
  },

  /**
   * Событие необходимости оповещения
  **/
  onNeedNotificationItem: function(e)
  {
    if($(e.currentTarget).data('disabled'))
      return;
    $('body').addClass('wait');
    var self = this;
    setTimeout(function(){
      var need_notification =false;
      if(!($(e.currentTarget).find("i").hasClass("need_notification")))
        need_notification = true;
      $(e.currentTarget).find("i").removeClass("need_notification").addClass(need_notification?'need_notification':'');
      $(e.currentTarget).trigger("change");
      $('body').removeClass('wait');
    },100);
  },
  onNeedNotificationChanged:function(e){
    var is_contract_plan = $(e.currentTarget).data('contract-plan');
    var need_notification =false;
    if($(e.currentTarget).find("i").hasClass("need_notification"))
      need_notification = true;

    if(is_contract_plan)
      this.model.set("contract_plan_need_notification",need_notification);
    else
      this.model.set("need_notification",need_notification);

    // проверяем родителя на необходимость выбора общего флага
    this.parentView.checkForNeedNotification();
  },

  /**
   * Событие условной даты
  **/
  onConditionalDateItem: function(e)
  {
    var self = this;
    if($(e.currentTarget).data('disabled'))
      return;
    $('body').addClass('wait');
    setTimeout(function(){
      $(e.currentTarget).trigger("change");
      $('body').removeClass('wait');
    },100);
  },
  onConditionalDateChanged:function(e){
    var self = this;
    var is_contract_plan = $(e.currentTarget).data('contract-plan');
    if(!$(e.currentTarget).find("i").hasClass("use_conditional_date"))
    {
      // если зависимые даты выставляются для планов по договору
      if(is_contract_plan)
        this.model.set({
          "contract_plan_edit_conditional_date":true,
          "contract_plan_use_conditional_date":false,
        }, {silent: false});
      else
        this.model.set({
          "edit_conditional_date":true,
          "use_conditional_date":false,
        }, {silent: false});
      // проверяем родителя на необходимость выбора общего флага
      this.parentView.checkForConditionalDates();
    }
    else
    {
      var msg = "Вы уверены, что хотите снять флаг условности даты? Данные будут сразу сохранены в БД.";
      bootbox.confirm(msg, function(result){
            if(result)
            {
              // сброс флага на сервере
              Routine.showLoader();
              $.ajax({
                type: "POST",
                url: "/handlers/workorderdate/unlink_work_from_work",
                data: JSON.stringify({'workorder_number': self.parentView.model.get('number'), 'current_work': self.model.toJSON(), 'is_contract_plan': is_contract_plan}),
                timeout: 35000,
                contentType: 'application/json',
                dataType: 'json',
                async:true
              }).done(function(result) {
                  if(result['status']=="ok")
                  {
                    $.jGrowl('Данные успешно сохранены', { 'themeState':'growl-success', 'sticky':false, life: 10000});
                    if(is_contract_plan)
                      self.model.set({
                        "contract_plan_edit_conditional_date":false,
                        "contract_plan_use_conditional_date":false,
                        "contract_plan_depends_on": null
                      }, {silent: false});
                    else
                      self.model.set({
                        "edit_conditional_date":false,
                        "use_conditional_date":false,
                        "depends_on": null
                      }, {silent: false});
                    // проверяем родителя на необходимость выбора общего флага
                    self.parentView.checkForConditionalDates();
                  }
                  else
                    $.jGrowl('Ошибка сохранения данных. Подробности: ' + result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 10000 });
              }).always(function(){Routine.hideLoader();});
            }
      });
    }
  },

  ///
  /// Сохранение условной даты
  ///
  onSaveConditionalDate: function(e){
    var self = this;
    var box = $(e.currentTarget).parents(".linked-date-edit-box:first");
    var is_contract_plan = $(box).data('contract-plan');

    var linked_work = $(box).find('.tb-condition-work').val();
    var days_before_start = Routine.strToInt($(box).find('.tb-condition-start-days').val());
    if(!linked_work)
    {
      $.jGrowl('Необходимо ввести главную задачу', { 'themeState':'growl-error', 'sticky':false, life: 5000});
      return;
    }
    // обработка прилинкованной задачи
    var linked_work_obj = null;
    try
    {
      linked_work_obj = App.parse_linked_work(linked_work);
    }
    catch (err) {
      $.jGrowl(err.message, { 'themeState':'growl-error', 'sticky':false, life: 5000});
      return;
    }

    // отправка запроса на сервер с данными по корректировке
    Routine.showLoader();
    $.ajax({
      type: "POST",
      url: "/handlers/workorderdate/link_work_to_work",
      data: JSON.stringify({'linked_work':linked_work_obj, 'workorder_number': this.parentView.model.get('number'), 'current_work': this.model.toJSON(), 'days_before_start': days_before_start, 'is_contract_plan':is_contract_plan }),
      timeout: 35000,
      contentType: 'application/json',
      dataType: 'json',
      async:true
    }).done(function(result) {
        if(result['status']=="ok")
        {
          $.jGrowl('Данные успешно сохранены', { 'themeState':'growl-success', 'sticky':false, life: 10000});

          if(is_contract_plan)
            self.model.set({
              "contract_plan_edit_conditional_date":false,
              "contract_plan_use_conditional_date":true,
              "contract_plan_depends_on": result["data"]['contract_plan_depends_on'],
              "contract_plan_date_start": (result["data"]["contract_plan_date_start"])?moment(result["data"]["contract_plaln_date_start"]).format('DD.MM.YYYY'):null,
              "contract_plan_date_finish": (result["data"]["contract_plan_date_finish"])?moment(result["data"]["contract_plan_date_finish"]).format('DD.MM.YYYY'):null,
              "contract_plan_date_start_with_shift": (result["data"]["contract_plan_date_start_with_shift"])?moment(result["data"]["contract_plan_date_start_with_shift"]).format('DD.MM.YYYY'):null,
              "contract_plan_date_finish_with_shift": (result["data"]["contract_plan_date_finish_with_shift"])?moment(result["data"]["contract_plan_date_finish_with_shift"]).format('DD.MM.YYYY'):null,
            }, {silent: false});
          else
            self.model.set({
              "edit_conditional_date":false,
              "use_conditional_date":true,
              "depends_on": result["data"]['depends_on'],
              "date_start": (result["data"]["date_start"])?moment(result["data"]["date_start"]).format('DD.MM.YYYY'):null,
              "date_finish": (result["data"]["date_finish"])?moment(result["data"]["date_finish"]).format('DD.MM.YYYY'):null,
              "date_start_with_shift": (result["data"]["date_start_with_shift"])?moment(result["data"]["date_start_with_shift"]).format('DD.MM.YYYY'):null,
              "date_finish_with_shift": (result["data"]["date_finish_with_shift"])?moment(result["data"]["date_finish_with_shift"]).format('DD.MM.YYYY'):null,
            }, {silent: false});

          // проверяем родителя на необходимость выбора общего флага
          self.parentView.checkForConditionalDates();
        }
        else
          $.jGrowl('Ошибка сохранения данных. Подробности: ' + result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 10000 });
    }).always(function(){Routine.hideLoader();});
  },
  ///
  /// Отмена редактирования условной даты
  ///
  onCancelConditionalDate: function(e){
    var box = $(e.currentTarget).parents(".linked-date-edit-box:first");
    var is_contract_plan = $(box).data('contract-plan');

    var self = this;
    $('body').addClass('wait');
    setTimeout(function(){
      if(is_contract_plan)
        self.model.set({
          "contract_plan_edit_conditional_date":false,
          "contract_plan_use_conditional_date":self.model.previous('contract_plan_use_conditional_date'),
        }, {silent: false});
      else
        self.model.set({
          "edit_conditional_date":false,
          "use_conditional_date":self.model.previous('use_conditional_date'),
        }, {silent: false});

      // проверяем родителя на необходимость выбора общего флага
      self.parentView.checkForConditionalDates();
      $('body').removeClass('wait');
    },100);
  },
  ///
  /// Редактирование условной даты
  ///
  onEditConditionslDate: function(e){
    var is_contract_plan = $(e.currentTarget).data('contract-plan');
    if(this.model.get('status')=='completed')
    {
      $.jGrowl('Задача завершена.', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
      return;
    }
    // если изменение планов по договору
    if(is_contract_plan){
      if(!this.model.get('contract_plan_locked')){
          this.model.set({
            "contract_plan_edit_conditional_date":true,
            "contract_plan_use_conditional_date":true,
          }, {silent: false});
      }
      else
        $.jGrowl('Планы по договору заблокированы.', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
    }
    else{
      if(!this.model.get('locked') && this.model.get('status')!='completed'){
          this.model.set({
            "edit_conditional_date":true,
            "use_conditional_date":true,
          }, {silent: false});
      }
      else
        $.jGrowl('Наши планы заблокированы.', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
    }
  },

  /**
   * Событие потери фокуса с поля ввода объема
   */
  /*onVolumeBlur:function(e)
  {
    var tb = $(e.currentTarget);
    var val = Routine.strToFloat(tb.val());
    if(isNaN(val))
      tb.val('');
    else
      tb.val(Routine.floatToStr(val.toFixed(3)));
    this.model.set('scope', val);
  },*/

  /**
   * Событие потери фокуса с поля ввода человекачасов
   */
  onTimingBlur:function(e)
  {
    var tb = $(e.currentTarget);
    var val = Routine.strToFloat(tb.val());
    if(isNaN(val))
      tb.val('');
    else
      tb.val(Routine.floatToStr(val.toFixed(3)));
    this.model.set('timing', val);
  },

  onVolumeBlur:function(e)
  {
    var tb = $(e.currentTarget);
    // set unit
    this.$('.unit').html(this.model.get('is_unit_percent')?'':this.model.get('unit') );
    // set volume
    if(this.model.get('scope'))
      tb.val(this.model.get('is_unit_percent')?Routine.floatToStr(this.model.get('scope')) + '%': Routine.floatToStr(this.model.get('scope')) );
    else
      tb.val('');
    //console.log(this.model.get('scope'));
    //console.log(this.model.get('unit'));
    //console.log(this.model.get('is_unit_percent'));
    this.model.trigger('change', this.model);
  },

  /**
   * Событие смены значения
   */
  onVolumeChange:function(e)
  {
    var tb = $(e.currentTarget);
    var val = tb.val().replace(/ /g,'').replace(',','.').replace(' ', '');
    if(val)
    {
      if(val.indexOf('%')>0){
        this.model.set({
          scope: Routine.strToFloat(val.split('%')[0]),
          is_unit_percent: true
        },{silent: true});
      }
      else{
        this.model.set({
          scope: Routine.strToFloat(val),
          is_unit_percent: false
        },{silent: true});
      }
      val = Routine.strToFloat(val);
      // set unit
      this.$('.unit').html(this.model.get('is_unit_percent')?'':this.model.get('unit') );
      // set volume
      // tb.val(this.model.get('is_unit_percent')?Routine.floatToStr(val) + '%': Routine.floatToStr(val) );
    }
    else{
      this.model.set({
        scope: null,
        is_unit_percent: false
      },{silent: true});

      this.$('.unit').html(this.model.get('unit'));
      tb.val('');
    }
  },

  /**
   * Удаление элемента
   */
  onItemRemove: function(e){
    if($(e.currentTarget).data('disabled'))
        return;

    if(this.model.get('payment_id') || this.model.get('is_active')){
      $.jGrowl('Нельзя удалить автоматически - добавленную работу.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      return;
    }
    var self = this;
    //self.remove();
    //return;

    // количество всех работ в наряде
    var all_works_count = self.parentView.collection.length;
    var msg = "";
    // если в наряде всего одна работа, то необходимо предупредить пользователя что будет удален весь наряд
    if(all_works_count==1)
      msg = "В данном наряде только одна работа, если вы удалите текущую работу, то весь наряд будет также удален. Наряд будет сразу удален без необходимости нажатия кнопки сохранения.";
    else
      msg = "Вы действительно хотите удалить данную работу из наряда? Работа будет сразу удалена без необходимости нажатия кнопки сохранения.";

    bootbox.confirm(msg, function(result){
          if(result)
          {
            // сброс флага на сервере
            Routine.showLoader();
            $.ajax({
              type: "POST",
              url: "/handlers/workorderdate/remove_work_from_workorder",
              data: JSON.stringify({'workorder_number': self.parentView.model.get('number'), 'work': self.model.toJSON()}),
              timeout: 35000,
              contentType: 'application/json',
              dataType: 'json',
              async:true
            }).done(function(result) {
                if(result['status']=="ok")
                {
                  $.jGrowl('Данные успешно удалены', { 'themeState':'growl-success', 'sticky':false, life: 10000});
                  // удаление работы из коллекции, если удаляется единственная работа, то удаляется весь наряд из коллекции
                  self.remove();
                }
                else
                  $.jGrowl('Ошибка удаления данных. Подробности: ' + result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 10000 });
            }).always(function(){Routine.hideLoader();
            }).error(function(e){$.jGrowl('Ошибка сервера, попробуйте повторить попытку.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });});
          }
    });
  },

  /**
   * Удаление представления с моделью данных
  **/
  remove: function(){
    if(this.parentView.collection.length==1)
      this.parentView.remove();

    //this.model.destroy();
    this.model.collection.remove(this.model);
    this.clear();
  },

  /**
   * Удаление представления
  **/
  clear: function()
  {
    this.$el.empty();
  },

  /**
   * Событие клика по иконке календарных настроек
   */
  onSettingsItem: function(e){
    if($(e.currentTarget).data('disabled'))
      return;
    this.$el.trigger("onSettingsItem", {
      obj: this,
      level: 'work',
    });
  },

  /**
   * Событие клика по иконке присотановки планов
   */
  onPauseItem: function(e){
    if($(e.currentTarget).data('disabled'))
      return;
    this.$el.trigger("onPauseItem", {
      obj: this,
      level: 'work',
    });
  }
});


