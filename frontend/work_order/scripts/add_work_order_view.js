///
/// Представление для создания новых нарядов
///
App.Views.WorkOrderAddView = Backbone.View.extend({
  template:  _.template($('#AddWorkOrdersTemplate').html()),
  events:{
    'click .closebtn':"onFormClose",
    'click .savebtn':"onFormSave",
    'click .nav-tabs a':'onTabClicked',
    //----------
    'show':"onShow",
    'hide-controls':"onHideControls",
    'show-controls':"onShowControls"
  },
  initialize: function() {
    this.model.sector_types = {};
    for(var i in App.GlobalWorks){
      if(App.GlobalWorks[i]['is_active'])
      {
        if(this.model.sector_types[App.GlobalWorks[i]['type']]==undefined)
          this.model.sector_types[App.GlobalWorks[i]['type']] = [];
        this.model.sector_types[App.GlobalWorks[i]['type']].push(App.GlobalWorks[i]);
      }
    }
    this.render();
  },
  render: function() {
    var self = this;
    $("body").addClass('deny-owerflow');
    // удалить элемент при сокрытии диалога
    this.$el.on('hidden', function () {
      self.$el.remove();
      $("body").removeClass('deny-owerflow');
    })
    // Отрисовка основноого контейнера данных
    this.$el.html(this.template(this.model));
    // добавление формы списка стандартных работ
    this.commonWorksAddView = new App.Views.WorksView({
      el: this.$("#common-works"),
      model:{
        sector:this.model.sector,
        sector_type: this.model.sector_type,
        exclude_works_id: this.model.exclude_works_id,
        sector_types: this.model.sector_types,
        order: this.model.order,
        type: 'common',

      }
    });
    // добавление формы списка специфических работ
    this.specificWorksAddView = new App.Views.WorksView({
      el: this.$("#specific-works"),
      model:{
        sector:this.model.sector,
        sector_type: this.model.sector_type,
        exclude_works_id: this.model.exclude_works_id,
        sector_types: this.model.sector_types,
        order: this.model.order,
        type: 'specific'
      }
    });
  },

  /**
   * @desc Select tab event
   */
  onTabClicked:function(e){
    e.preventDefault();
    this.setTab($(e.currentTarget).data('type'));
    this.onShow();
  },

  /**
   * Process selected tab
   */
  setTab: function(key){
    this.$(".common-works").hide();
    this.$(".specific-works").hide();

    $(".nav-tabs").find('li').removeClass('active');
    $(".nav-tabs").find('[data-type="'+key+'"]').parent().addClass('active');
    switch(key)
    {
      case 'common_works':
        this.$(".common-works").show();
      break;
      case 'specific_works':
        this.$(".specific-works").show();
      break;
    }
  },

  /**
   * Закрыть форму
   */
  onFormClose:function(){
    this.$el.modal('hide');
    this.$el.remove();
  },

  /**
   * Сохранение данных
   */
  onFormSave:function(){
    if(this.model.mode == "edit")
      this.__update();
    else
      this.__add_new();
  },

  /**
   * Редактирование сущуствующего наряда
   */
  __update: function(){
    var self = this;
    var data = [];
    var commonDataToSave = this.commonWorksAddView.getDataToUpdate();
    var specificDataToSave = this.specificWorksAddView.getDataToUpdate();

    if(commonDataToSave && commonDataToSave['plan_work'] && commonDataToSave['plan_work'].length>0)
      data = data.concat(commonDataToSave['plan_work'])
    if(specificDataToSave && specificDataToSave['plan_work'] && specificDataToSave['plan_work'].length>0)
      data = data.concat(specificDataToSave['plan_work'])

    if(!data || data.length<1)
    {
      $.jGrowl('Нет данных на сохранение.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      return;
    }

    Routine.showLoader();
    $.ajax({
      url: '/handlers/workorder/edit_workorder',
      type: 'PUT',
      dataType: 'json',
      contentType: "application/json; charset=utf-8",
      data: JSON.stringify({
        data:{'plan_work': data},
        workorder_id: this.model.workorder['_id']
      }),
      timeout: 35000,
    }).done(function(result) {
      if(result['status']=="ok")
      {
        self.onFormClose();
        $.jGrowl('Даные успешно сохранен.', { 'themeState':'growl-success', 'sticky':false });
        Backbone.trigger('global:update_workorder', result['result']);
      }
      else
      {
          $.jGrowl('Ошибка сохранения данных. Подробности: ' + result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      }
    }).always(function(){
      Routine.hideLoader();
    }).error(function(result){
      $.jGrowl('Ошибка сохранения данных. Повторите попытку.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
    });
  },

  /**
   * Добавление новых нарядов
   */
  __add_new: function(){
    var self = this;
    var data = [];
    var commonDataToSave = this.commonWorksAddView.getDataToAdd();
    var specificDataToSave = this.specificWorksAddView.getDataToAdd();

    if(commonDataToSave && commonDataToSave.length>0)
      data = data.concat(commonDataToSave)
    if(specificDataToSave && specificDataToSave.length>0)
      data = data.concat(specificDataToSave)

    if(!data || data.length<1)
    {
      $.jGrowl('Нет данных на сохранение.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      return;
    }

    Routine.showLoader();
    $.ajax({
      url: '/handlers/workorder/add_workorder',
      type: 'PUT',
      dataType: 'json',
      contentType: "application/json; charset=utf-8",
      data: JSON.stringify({
        data:data
      }),
      timeout: 35000,
    }).done(function(result) {
      if(result['status']=="ok")
      {
        self.onFormClose();
        var tmp_numbers = [];
        for(var  i in result['result'])
          tmp_numbers.push(result['result'][i]['number']);
        $.jGrowl('Созданы новые наряды:  ' + tmp_numbers.join(', '), { 'themeState':'growl-success', 'sticky':true});
        Backbone.trigger('global:new_workorders',[result['result']]);
      }
      else
        $.jGrowl('Ошибка сохранения данных. Подробности: ' + result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 10000 });
    }).always(function(){
      Routine.hideLoader();
    }).error(function(result){
      $.jGrowl('Ошибка сохранения данных. Повторите попытку.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
    });
  },

  /**
   * посчитать высоту дерева (учитывая,что высота диалога - 80%)
   */
  calcHeight:function(){
    var mrg = this.$el.find(".wtitle").height()+this.$el.find(".buttons").height();
    var hh =$(window).height()*0.8-mrg-240;
    this.$el.find(".works-tree").css("height",hh+"px");
  },

  /**
   * Показать форму
   */
  onShow:function(){
    var self = this;
    var tm = setInterval(function(){
      if(self.$el.find(".wtitle").height()>0){
        clearInterval(tm);
        self.calcHeight();
      }
    },100);
    $(window).resize(function(){
      self.calcHeight();
    });
  },

  /**
   * Скрыть панель сохранения
   */
  onHideControls: function(){
    this.$('.save-buttons').hide();
  },
  /**
   * Показать панель сохранения
   */
  onShowControls: function(){
    this.$('.save-buttons').show();
  },
});

///
/// Представление для работы со специфическими работами-------------------------------------------
///
App.Views.WorksView = Backbone.View.extend({
  template: _.template($('#WorksTemplate').html()),
  events:{
    'keyup .tb-work-name': 'onSearchKey',
    'click .btn-add': 'onAddNewWork',
    //--------------
    'add-new-works-cancel': 'onAddNewWorkCancel',
    'add-new-works-complete': 'onAddNewWorkComplete'
  },
  initialize: function() {
    this.render();
  },
  render: function() {
    var self = this;
    // Отрисовка основноого контейнера данных
    this.$el.html(this.template(this.model));
    // Создание представления дерева работ
    this.worksListView = new App.Views.WorksListView({
      el: this.$(".pnl-works-container"),
      model:{
        sector:this.model.sector,
        sector_type: this.model.sector_type,
        exclude_works_id: this.model.exclude_works_id,
        sector_types: this.model.sector_types,
        type: this.model.type,
        order: this.model.order
      }
    });
    // Создание представления дерева работ
    this.addNewWorkView = new App.Views.AddNewWorkView({
      el: this.$(".pnl-add-new-work"),
      model: new App.Models.AddNewWorkModel({
        'sector': this.model.sector,
        'work_type': this.model.type
      })
    });

    // жобавлять можно только специфические работы
    if(this.model.type == 'common')
      this.$('.btn-add').hide();
  },
  onSearchKey:function(e){
    //if (e.which === 13)
    this.onSearch(true);
  },

  onAddNewWork: function(e){
    // скрыть поиск и отображение работ и кнопки сохранения.
    this.$el.trigger("hide-controls");
    this.worksListView.hide();
    this.$('.pnl-search-form').hide();
    this.addNewWorkView.render(this.$('.tb-work-name').val());
  },
  onAddNewWorkCancel: function(e){
    this.$el.trigger("show-controls");
    this.worksListView.show();
    this.$('.pnl-search-form').show();
  },
  onAddNewWorkComplete: function(e, data){
    this.$el.trigger("show-controls");
    this.$('.pnl-search-form').show();
    this.worksListView.show();
    this.worksListView.selectAndFilter(data['_id'].toString(), data['name']);
  },
  onSearch:function(){
    this.worksListView.filter(this.$('.tb-work-name').val());
  },
  getDataToUpdate: function(){
    return this.worksListView.getDataToUpdate();
  },
  getDataToAdd: function(){
    return this.worksListView.getDataToAdd();
  }
});

///
/// Представление добавления новой работы
///
App.Views.AddNewWorkView = Backbone.View.extend({
  template: _.template($('#AddWorksTemplate').html()),
  events:{
    'click .save-data':"onSaveData",
    'click .cancel-data':"onCancelData",
    'change .tb-work-name': 'onChangeWorkName',
    'change .ddl-sectors': 'onChangeSector',
    'change .tb-unit': 'onChangeWorkUnit',
    'change .tb-comment': 'onChangeComment'
  },
  initialize: function() {
  },
  render: function(name) {
    this.model.set('name', name);
    this.$el.html(this.template(this.model.toJSON()));
    // если задан участок по умолчанию,
    // то необходимо запретить пользователю ручной выбор
    if(this.model.get('sector') && this.model.get('sector')['sector_code'])
    {
      this.$('.ddl-sectors')
        .val(this.model.get('sector')['sector_code'].toString())
        .prop('disabled', true);
    }
    // заполнить единицы измерения
    this.fill_unit_select(this.$('.tb-unit'));
  },
  clear: function()
  {
    this.$el.empty();
  },
  hide: function(){
    this.$el.hide();
  },
  show: function(){
    this.$el.show();
  },
  checkOnExists: function(sector_code, work_name){
    work_name = Routine.clearWasteSymbols(work_name);
    for(var i in App.GlobalWorks){
      if(App.GlobalWorks[i]['code'] == sector_code && App.GlobalWorks[i]['works'])
        for(var wi in App.GlobalWorks[i]['works'])
          if(Routine.clearWasteSymbols(App.GlobalWorks[i]['works'][wi]['name']) == work_name)
            return true;
    }
    return false;
  },
  onSaveData: function(e){
    var self = this;
    // проверка на существование данной работы на указанном участке в глобальном справчонике

    if(this.model.get('sector') && this.checkOnExists(this.model.get('sector')['sector_code'], this.model.get('name')))
    {
      $.jGrowl('Указанная работа уже существует на данном участке.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      return;
    }
    if(this.model.get('name')=="")
    {
      $.jGrowl('Укажите название работы.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      return;
    }

    //this.$('.tb_unit_purchase').select2('val')
    if(Routine.trim(this.model.get('unit'))=="")
    {
      $.jGrowl('Задайте единицы измерения.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      return;
    }
    if(!this.model.get('sector') || !this.model.get('sector')['sector_code'])
    {
      $.jGrowl('Задайте участок.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      return;
    }

    // добавление участка в БД
    Routine.showLoader();
    $.ajax({
      url: '/handlers/workorder/add_new_work',
      type: 'PUT',
      dataType: 'json',
      contentType: "application/json; charset=utf-8",
      data: JSON.stringify(this.model),
      timeout: 35000,
    }).done(function(result) {
      if(result['status']=="ok")
      {
        $.jGrowl('Даные успешно сохранены.', { 'themeState':'growl-success', 'sticky':false });
        // добавление новой работы в справочник
        self.addWorkToDataList(result['result']);
        // шлем событие, что добавление новой работы прошло успешно
        self.$el.trigger("add-new-works-complete", result['result']);
        self.clear();
      }
      else
      {
        $.jGrowl('Ошибка сохранения данных. Подробности: ' + result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      }
    }).always(function(){
      Routine.hideLoader();
    }).error(function(result){
      $.jGrowl('Ошибка сохранения данных. Повторите попытку.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
    });
  },
  onCancelData: function(e){
    this.clear();
    this.$el.trigger("add-new-works-cancel");
  },
  onChangeWorkName: function(e){
    var tb = $(e.currentTarget);
    if($(tb).val())
      this.model.set('name', $(tb).val());
  },
  onChangeSector: function(e){
    var ddl = $(e.currentTarget);
    if($(ddl).val())
    {
      var sel_opt = $(ddl).find('option:selected');
      this.model.set('sector', {
        'sector_code': $(sel_opt).data('code'),
        'sector_name': $(sel_opt).data('nane')
      });
    }
  },
  onChangeWorkUnit: function(e){
    var tb = $(e.currentTarget);
    if($(tb).val())
      this.model.set('unit', $(tb).val());
  },
  onChangeComment: function(e){
    var tb = $(e.currentTarget);
    if($(tb).val())
      this.model.set('comment', $(tb).val());
  },

  /**
   * Добавление новой работы в справочник работ участка
   */
  addWorkToDataList: function(work_row){
    for(var i in App.GlobalWorks){
      if(App.GlobalWorks[i]['code'] == this.model.get('sector')['sector_code'])
      {
        if(!App.GlobalWorks[i]['works'])
          App.GlobalWorks[i]['works'] = [];
        App.GlobalWorks[i]['works'].push(work_row);
        break;
      }
    }
  },

 /**
  * Заполнение выпадающего списка единиц измерения
  */
  fill_unit_select: function(control){
    var self = this;
    var dataSource = [];
    var tmp_data= {}

    for(var i in App.GlobalWorks){
      if(App.GlobalWorks[i]['works'])
        for(var wi in App.GlobalWorks[i]['works']){
          {
            var unit = App.GlobalWorks[i]['works'][wi]['unit'];
            if(unit)
              tmp_data[unit] = {'id': unit, 'text': unit};
          }
        }
    }
    for(var i in tmp_data)
      dataSource.push(tmp_data[i])

    this.$(control).select2({
      data: dataSource,
      formatNoMatches: function () { return ""; },
      createSearchChoice:function(term, data) {
        if ($(data).filter(function() { return this.text.localeCompare(term)===0; }).length===0) {return {id:term, text:term};}
      }
    }).on('change', function (e) {
      self.model.set('unit', this.value);
    });

    self.model.set('unit', '%');
    this.$(control).select2("val",'%');
  },
});

///
/// Представление обработки стандартных работ
///
App.Views.WorksListView = Backbone.View.extend({
  openedItems:{},     // список идентификаторов объектов, которые необходимо раскрыть
  autoOpenedItems:{}, // список идентификаторов объектов, которые раскрыты поиском
  selectedWorks: {},  // спиcок выбранных пользователем работ
  template: _.template($('#SelectWorksTemplate').html()),
  events:{
    'click a.work-gr':"onShowGroup",
    'click .item-chk': "onSelectItem",
    'click .item-chk-all': "onSelectAll",
  },

  initialize: function() {
    this.openedItems = {};
    this.autoOpenedItems = {};
    this.selectedWorks = {};
    //this.render(this.model);
    this.filter("");
  },

  render: function(data) {
    this.$el.html(this.template(data));
    // раскрыть руками раскртые группы
    this.openCollapsedItems(this.openedItems);
    this.openCollapsedItems(this.autoOpenedItems);
    this.selectCheckedWorks(this.selectedWorks);
    this.$el.trigger("show");
  },

  hide: function(){
    this.$el.hide();
  },
  show: function(){
    this.$el.show();
  },

  /**
   * Событие выбора элемента
   */
  onSelectItem: function(e){
    var pr = $(e.target).parents('tr:first');
    var pr_table = $(e.target).parents('table:first');
    pr.removeClass('selected');
    if($(e.target).is(':checked'))
      pr.addClass('selected');
    else
      pr_table.find('.item-chk-all').prop('checked', false);

    // запоминаем что пользователь выбрал
    this.selectedWorks[$(e.target).data('id')] = $(e.target).is(':checked');
  },

  /**
   * Событие выбора всех элементоы
   */
  onSelectAll: function(e){
    var self = this;
    var pr_table = $(e.target).parents('table:first');
    pr_table.find('.item-chk').not(':disabled').prop('checked', $(e.target).prop('checked'));
    pr_table.find('.line-item').removeClass('selected');
    if($(e.target).prop('checked'))
      pr_table.find('.line-item').not('[data-disabled="true"]').addClass('selected');

    pr_table.find('.item-chk').each(function(i){
      self.selectedWorks[$(this).data('id')] = $(e.target).prop('checked');
    });
  },

  /**
   * Get data with works to update them in workorder
   */
  getDataToUpdate: function(){
    var self = this;
    var data_to_save = {'plan_work':[]}
    this.$el.find(".item-chk").each(function(){
      if($(this).prop('checked'))
        data_to_save.plan_work.push(self.__getWorkByInput(this));
    });
    return data_to_save;
  },

  /**
   * Get data to create new workorders
   */
  getDataToAdd: function(){
    var self = this;
    var wOrders = {};

    this.$el.find(".item-chk").each(function(){
      if($(this).prop('checked'))
      {
        var wOrder = self.__getWorkOrderByWorkInput(this);
        if(wOrders[wOrder.sector_id]==undefined)
          wOrders[wOrder.sector_id] = wOrder;
        else
          wOrder = wOrders[wOrder.sector_id];
        //  добавляются работы
        wOrder.plan_work.push(self.__getWorkByInput(this));
      }
    });
    var res = [];
    for(var i in wOrders)
      res.push(wOrders[i]);
    return res;
  },

  /**
   * Сбор информации о работе по данным с полей ввода
   */
  __getWorkByInput:function(wInput){
    var inp = $(wInput);
    var gr = $(inp.parents("tr")[0]);
    var res = {};
    res.work_id = gr.data("id");
    res.code = gr.data("code");
    res.unit = gr.data("unit");
    res.scope = 0;
    res.days_count = 0;
    return res;
  },

  /**
   * Подготовка информации для нового наряда
   */
  __getWorkOrderByWorkInput:function(wInput){
    var inp = $(wInput);
    var gr = $(inp.parents(".work-gr")[0]);
    var res = {};

    res.production_id = this.model.order.production_id;
    res.production_name = this.model.order.production_name;
    res.production_number= parseInt(this.model.order.production_number);
    res.contract_id = this.model.order.contract_id;
    res.contract_number = this.model.order.contract_number;
    res.sector_id = gr.data("id");
    res.sector_code = parseInt(gr.data("code"));
    res.type = gr.data('type');
    res.note = "";
    res.blanks = [];

    res.production_units = [{
      unit_id: this.model.order.production_unit_id,
      production_id:this.model.order.production_id,
      production_number: parseInt(this.model.order.production_number),
      unit_number: parseInt(this.model.order.production_unit_number)
    }];

    res.plan_work = [];
    return res;
  },

  /**
   * Показать группу объектов
   */
  onShowGroup:function(el){
    var pr =  $($(el.target).parents("div.work-gr")[0]);
    if(pr.hasClass("selected"))
      pr.removeClass("selected");
    else
      pr.addClass("selected");

    this.openedItems[$(pr).prop('id')] = $(pr).hasClass("selected");
  },

  /**
   * Раскрыть ветки, которые пользователь раскрывал руками
  **/
  openCollapsedItems: function(items)
  {
    // раскрыть сохраненные ветки
    for(var i in items)
      if(items[i])
        this.$el.find('#'+i).addClass('selected');
  },

  /**
   * Проставить чекбоксы для выбранных руками работ
  **/
  selectCheckedWorks: function(items)
  {
    // раскрыть сохраненные ветки
    for(var i in items)
      this.$el.find('#'+i).prop('checked', true);
  },

  /**
   * Фильтрация данных
   **/
  filter: function(query){
    this.autoOpenedItems = {};
    /*if(!query) {
      this.render(this.model);
      return;
    }*/
    // поиск отсеивание всех лишних работ из списка
    var data = {};
    if(this.model.sector_type)
      data[this.model.sector_type["sector_type"]] = Routine.deepClone(this.model['sector_types'][this.model.sector_type["sector_type"]])
    else
      data = Routine.deepClone(this.model['sector_types'])

    var new_data = {};
    for(var sti in data) {
      var sectors = data[sti];
      var new_sectors = [];
      for(var si in sectors ){
        var sector_row = sectors[si];
        var new_works = [];
        for(var wi in sector_row['works'])
        {
          var work = sector_row['works'][wi];

          if((!work['is_specific'] && this.model.type=='common' || work['is_specific'] && this.model.type=='specific') && (!query || work['name'].search(new RegExp(query,'i')) >-1 || this.selectedWorks[work['_id']]))
            new_works.push(work);
        }
        sector_row['works'] = new_works;
        if(new_works.length>0)
        {
          new_sectors.push(sector_row)
          if(query)
            this.autoOpenedItems[sector_row['code']] = true;
        }
      }
      if(new_sectors.length > 0)
        new_data[sti] = new_sectors;
    }
    this.render({
      sector:this.model.sector,
      sector_type: this.model.sector_type,
      exclude_works_id: this.model.exclude_works_id,
      sector_types: new_data,
      type: this.model.type
    });
  },

  /**
   * Пометить работу как выбранную и отфильтровать все работы относительно данной
   */
  selectAndFilter: function(work_id, work_name){
    this.selectedWorks[work_id] = true;
    this.filter(work_name);
  }
});


