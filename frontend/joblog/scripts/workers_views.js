/**
 * Контрол управленяи списокм рабочих на форме добавления/редактиорвания
 */
App.Views.WorkerItemsView = Backbone.View.extend({
  tagName:'div',
  className:'pnl-workers-container',
  templates: {
    main:_.template($("#pnl_workers_container_template").html()),
  },

  /**
   * События
   */
  events:{
    'click .btn-add-worker': 'onAddWorkerItem',
    'click .btn-worker-equally':'onWorkerEqually',
    'change .auto-ktu':'onAutoKtuChange'
  },

  /**
   * инициализация
   */
  initialize: function (params) {
    this.parent = params.parent;
  },

  /**
   * проверка на переработку
   */
  checkOnOverdueErrors: function(){
    var haveOverdue = false
    _.each(this.collection.models, function (item) {
        if(item.get("proportion")>8)
          haveOverdue = true;
    }, this);
    return haveOverdue;
  },

  /**
   * Отрисовка формы
   */
  render: function () {
    var self = this;
    var full_perc = 0;
    this.$el.html(this.templates.main(this.model));
    this.$('.tb-search-workorder').numeric();
    $(".tb-search-workorder",this.$el).tokenInput("/handlers/joblog/search_workorder_numbers/",
      {
        theme: "facebook",
        zindex:1300,
        hintText:"Номер наряда",
        noResultsText:"Не найдено...",
        searchingText:"Поиск...",
        allowFreeTagging:false,
        preventDuplicates:true,
        tokenLimit:1,
        onDelete: function(){
          //console.log('Clear list');
        },
        onAdd: function(){
          var cln = self.$('.tb-search-workorder').tokenInput("get");
          // подгрузка списка работников из выбранного наряда
           Routine.showLoader();
          $.ajax({
            url: '/handlers/joblog/get_workers/' + cln[0]['name'],
            type: 'GET',
            dataType: 'json',
            contentType: "application/json; charset=utf-8",
            data: cln[0],
            timeout: 35000,
            async: true,
            success: function (result, textStatus, jqXHR) {
              if(result.status=='error')
                $.jGrowl(result.msg, { 'themeState':'growl-error', 'sticky':false, life: 10000 });
              else if(result.status=="ok")
              {
                  if (!result.data || result.data.length == 0)
                    $.jGrowl("Для указанного наряда работники не заданы.", { 'themeState':'growl-error', 'sticky':false, life: 10000 });
                  self.collection.reset();
                  self.collection.add(new App.Collections.WorkerItemsCollection(result.data).models);
                  self.render();
              }
              else
                $.jGrowl("Ошибка сервера.", { 'themeState':'growl-error', 'sticky':false, life: 10000 });
            }
          }).error(function(){
              $.jGrowl("Ошибка сервера.", { 'themeState':'growl-error', 'sticky':false, life: 10000 });
          }).always(function(){Routine.hideLoader();});
        }
      });

    this.$el.find(".data-workers-container").empty();
      _.each(this.collection.models, function (item) {
        full_perc+=item.get("proportion");
        self.renderItem(item);
    }, this);

    if(full_perc>0)
    {
      full_perc = Routine.roundToHundredths(full_perc);
      // self.$('.lbl-full-percent').html(full_perc + " из 100 %" );
    }
    else
      self.$('.lbl-full-percent').html('');
    return this;
  },

  /**
   * Отрисовка элемента
   */
  renderItem: function (item) {
    var itemView = new App.Views.WorkerItemView({model: item, parent: this});
    itemView.render();
  },

  /**
   * Скрыть форму
   */
  hide: function(){
    this.$el.hide();
  },

  /**
   * Показать форму
   */
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
    if( this.$(".auto-ktu").is(":checked"))
      this.onWorkerEqually();
  },

  /**
   * Обработка кнопки поровну
   */
  onWorkerEqually:function(){
    return;
    var vl = 100/this.collection.models.length;
    vl = Routine.roundToHundredths(vl);
    // остаток от 100 добавляем к первому
    var rem = 100-vl*this.collection.models.length;

    for(var i in this.collection.models){
      var new_val = vl;
      if(i==0)
        new_val = Routine.roundToHundredths(vl+rem);
      this.collection.models[i].set("proportion",new_val);
    }
  },

  /**
   *   обработка смены флага Авто КТУ
   */
  onAutoKtuChange:function(){
    return;
    var is_ktu = this.$(".auto-ktu").is(":checked");
    this.model['auto_ktu']=is_ktu;
    this.render();
    if(is_ktu)
      this.onWorkerEqually();
    //this.$(".btn-worker-equally").prop('disabled',!is_ktu);
  },

  /**
   * Получить суммарное трудовое участие
   */
  getFullPercent: function(){
    return 0;
    var full_perc = 0;
    for(var i in this.collection.models)
    {
      var md = this.collection.models[i];
      if(md.get("proportion"))
        full_perc += md.get("proportion");
    }
    return full_perc;
  },

  /**
   * проверка на валидность введенных данных
   * only_holds - если идет сохранение простоя, то трудовое участие не требуется
   */
  Validate:function(only_holds){
    var only_holds = only_holds || false;
    var full_perc = 0;
    for(var i in this.collection.models){
      var md = this.collection.models[i];
      if(!md.get("user_id")){
        $.jGrowl("Необходимо заполнить трудовые часы для всех работников.", { 'themeState':'growl-error', 'sticky':false, life: 10000 });
        return false;
      }
      if(!md.get("proportion") && md.get("proportion")!==0){
        $.jGrowl("Трудовые часы работников не могут быть неопределенными.", { 'themeState':'growl-error', 'sticky':false, life: 10000 });
        return false;
      }
      if(md.get("proportion")===0 && !md.get('absence_reason')){
        $.jGrowl("Для работников с нулевым количеством часов необходимо указать причину отсутствия.", { 'themeState':'growl-error', 'sticky':false, life: 10000 });
        return false;
      }
      full_perc+=md.get("proportion");
    }
    return true;
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
    main:_.template($("#workerItem").html()),
  },

  initialize: function (params) {
    this.parent = params.parent;
  },

  events:{
    'click .lnk-remove-item': 'onRemove',
    'click .lnk-minus-qty': 'onProportionMinus',
    'click .lnk-plus-qty': 'onProportionPlus',
    'change .tb-chance-value': 'onChanceValueChange',
    'focus .tb-chance-value': 'onFocusChanceValue',
    'blur .tb-chance-value': 'onBlurChanceValue',
    'keyup .tb-chance-value': 'onChanceValueChange'
  },

  /**
   * проверка на переработку
   */
  checkOnOverdueErrors: function(){
    var haveOverdue = false
    this.$('div.item').removeClass('error');
    if(this.model.get("proportion")>8){
      this.$('div.item').addClass('error');
      haveOverdue = true;
    }
    // если введен был 0 в пропорцию, то необходимо отобразить
    // список причин для уточнения
    if(this.model.get("proportion")===0)
    {
      this.$('.propportion-slider-box').hide();
      this.$('.time-sheet-reason-box').show();
    }
    else
    {
      this.$('.propportion-slider-box').show();
      this.$('.time-sheet-reason-box').hide();
    }
    return haveOverdue;
  },

  /**
   * ручное уменьшение пропорции
   */
  onProportionMinus: function()
  {
    var self = this;
    var vl = self.model.get("proportion")-1;
    if(vl<0) vl = 0;
    vl = Routine.roundToHundredths(vl);
    self.model.set("proportion",vl);
    self.$(".tb-chance-value").val(Routine.floatToStr(vl));
    self.checkOnOverdueErrors();
  },

  /**
   * ручное увеличение пропорции
   */
  onProportionPlus: function()
  {
    var self = this;
    var full_perc = 24;
    if(full_perc<0) full_perc = 0;
    var vl = self.model.get("proportion")+1;
    if(vl>full_perc)
      vl = full_perc;
    vl = Routine.roundToHundredths(vl);
    self.model.set("proportion",vl);
    self.$(".tb-chance-value").val(Routine.floatToStr(vl));
    self.checkOnOverdueErrors();
  },

  /**
   * Фокус в поле ввода
   */
  onFocusChanceValue: function()
  {
    var full_perc = 24;
    full_perc = Routine.roundToHundredths(full_perc);
    this.checkOnOverdueErrors();
  },

  /**
   * Потеря фокуса полем ввода
   */
  onBlurChanceValue: function()
  {
    this.$(".chance-value").html("");
    this.checkOnOverdueErrors();
  },

  /**
   * ручное изменение пропорции через поле ввода
   */
  onChanceValueChange: function()
  {
    if(!this.$('.tb-chance-value').val()){
      this.checkOnOverdueErrors();
      return;
    }
    var vl =  Routine.roundToHundredths(Routine.strToFloat(this.$('.tb-chance-value').val()));
    var full_perc = 24;
    if(full_perc<0)
      full_perc = 0;
    if(vl>full_perc)
      vl = full_perc;
    this.model.set("proportion",vl);
    this.$(".tb-chance-value").val(Routine.floatToStr(vl));
    this.checkOnOverdueErrors();
  },

  /**
   * Отрисовка элемента
   */
  render: function () {
    var self = this;
    this.$el.html(this.templates.main(this.model.toJSON()));
    this.parent.$el.find(".data-workers-container").append(this.el);

    // делаем поле числовым
    this.$('.tb-chance-value').numeric({ negative: false, decimal: ',' });

    // слайдер
    this.$('.chance-slider').slider({value:0
    }).on('slideStop', function(ev){
      var vl = (ev.value>this.full_perc)?this.full_perc:ev.value;
      vl = Routine.roundToHundredths(vl);
      self.model.set("proportion",vl);
      //if(vl==0)
        self.model.trigger("change:proportion");
    }).on("slide",function(ev){
      var vl = (ev.value>this.full_perc)?this.full_perc:ev.value;
      vl = Routine.roundToHundredths(vl);
      self.$(".tb-chance-value").val(Routine.floatToStr(vl));
      //self.$(".chance-value").html(" из "+this.full_perc+"%");
      //var itogo = Routine.roundToHundredths(100-(this.full_perc-vl));
      // self.parent.$('.lbl-full-percent').html(itogo + " из 100 %" );
      self.checkOnOverdueErrors();
    }).on("slideStart",function(ev){
      this.full_perc = 24;
      if(this.full_perc<0)
        this.full_perc = 0;
      this.full_perc = Routine.roundToHundredths(this.full_perc);
      self.checkOnOverdueErrors();
    });

    //
    if(this.parent.$el.find(".auto-ktu").is(":checked")){
      this.$('.tb-chance-value').prop('disabled',true);
      this.$('.slider').css('pointer-events','none');
      this.$('.lnk-plus-qty').prop('disabled',true);
      this.$('.lnk-minus-qty').prop('disabled',true);
    }

    // событие на изменение пропорциив моделе
    this.model.on("change:proportion",function(){
      var vl = self.model.get("proportion");
      self.$('.chance-slider').slider("setValue",vl);
      self.$(".tb-chance-value").val(Routine.floatToStr(vl));
      self.$(".chance-value").html("");
      var full_perc = 0;
      if(full_perc>24)
        full_perc = 24;
      full_perc = Routine.roundToHundredths(full_perc);
      self.checkOnOverdueErrors();
    });

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

    // absence reason
    // var cur_reason = this.$('.absence-reason').data('val');
    var $sel = this.$('.absence-reason').selectize({
      options: App.time_sheet_reasons,
      valueField: 'name',
      labelField: 'note',
      create: false,
      onChange: function(value) {
        self.model.set('absence_reason', value);
      },
      render: {
        item: function(item, escape) {
          return '<div>' +
            '<span class="name">' + escape(item.name) + '</span>'+
          '</div>';
        },
        option: function(item, escape) {
          return '<div>' +
            '<b>' + escape(item.name) + '</b><br>' +
            '<small><i>'+item.note+'</i></small>'+
          '</div>';
        }
      }
    });
    if(this.model.get('absence_reason'))
      $sel[0].selectize.setValue(this.model.get('absence_reason'));

    return this;
  },

  /**
   * Удаление элемента
   */
  onRemove: function () {
    var self = this;

    bootbox.confirm({
      //message: 'Удаление работника из трудового участия применяется только в тех случаях, если работник больше не должен работать на данном наряде. Иначе, работнику необходимо поставить "0" и указать причину.',
      message: 'Рабочий ФИО вообще не будет работать на данном наряде, даже в будущем?<br/><span style="font-size:11px; font-style: italic;">Удаление рабочего из трудового участия применяется только в тех случаях, если больше не планируется его работа на данном наряде. Иначе, если в будущем планируется привлечение рабочего к данному наряду - необходимо поставить "0" в поле "Кол-во часов" и указать причину.</span>',
      buttons: { 'cancel': { label: 'Нет' }, 'confirm': { label: 'Да' } },
      callback: function(result) {
        if (result)
        {
          // удаление элемента с формы
          self.$el.remove();
          // удаление модели из коллекции
          self.parent.collection.remove(self.model);
          self.parent.onAutoKtuChange();
        }
      }
    });
    return;
  }
});

/**
 * Контрол управленяи списокм рабочих на форме добавления/редактиорвания
 */
App.Views.HistoryWorkerItemsView = Backbone.View.extend({
   el: $("#pnlWorkersHistoryContainer"),

  initialize: function () {
    var self = this;
    Backbone.on("onHistoryWorkerItemRemove",this.onHistoryWorkerItemRemove, this);
  },

  /**
   * Отрисовка формы
   */
  render: function () {
    var self = this;
    this.$el.find(".data-workers-history-container").empty();
    if(this.collection.length>0)
    {
      _.each(this.collection.models, function (item) {
          if(item.get('status')=='active')
            self.renderItem(item);
      }, this);
      this.show();
    }
    else
      this.hide();
  },

  /**
   * Отрисовка элемента
   */
  renderItem: function (item) {
    new App.Views.HistoryWorkerItemView({model: item, parent: this});
  },

  /**
   * Скрыть форму
   */
  hide: function(){
    this.$el.hide();
  },

  /**
   * Показать форму
   */
  show: function(){
    this.$el.show();
  },

  onHistoryWorkerItemRemove: function(e){
    if(this.collection.length==0)
      this.hide();
  },
});

/**
 * Контрол управления элементом истории трудового участия работников
 */
App.Views.HistoryWorkerItemView = Backbone.View.extend({
  tagName:'div',
  className:'history-item',
  parent: null,
  workersListCollection: null, // коллекция процентов участия рабоиников
  workerItemsView: null,          // отображение для редактирования трудового участия
  templates: {
    main:_.template($("#worker_history_item").html()),
    edit:_.template($("#worker_history_item_edit").html()),
  },

  initialize: function (params) {
    this.parent = params.parent;
    this.render();
  },

  events:{
    'click .btn-remove': 'onRemove',
    'click .btn-edit': 'onEdit',
    'click .btn-ok': 'onSave',
    'click .btn-cancel': 'onCancel',
  },

  /**
   * Отрисовка элемента
   */
  render: function () {
    var self = this;
    this.$el.html(this.templates.main(this.model.toJSON()));
    //return this;
    this.parent.$el.find(".data-workers-history-container").append(this.el);
    return this;
  },

  /**
   * Удаление элемента
   */
  onRemove: function () {
    var self = this;

    bootbox.confirm({
      message: 'Данные из истории будут удалены безвозвратно. Продолжить?',
      buttons: { 'cancel': { label: 'Отмена' }, 'confirm': { label: 'Продолжить' } },
      callback: function(result) {
        if (result)
        {
          Routine.showLoader();
          $.ajax({
          type: "PUT",
          url: "/handlers/joblog/remove_workers_history_item",
          data: JSON.stringify(self.model),
          timeout: 35000,
          contentType: 'application/json',
          dataType: 'json',
          async:true
          }).done(function(result) {
              if(result['status']=="ok")
              {
                $.jGrowl('Данные успешно удалены .', { 'themeState':'growl-success', 'sticky':false, life: 10000 });
                // удаление элемента с формы
                self.$el.remove();
                self.model.set('status', 'removed');
                // удаление модели из коллекции
                self.parent.collection.remove(self.model);
                Backbone.trigger('onHistoryWorkerItemRemove',[self]);
              }
              else
                $.jGrowl('Ошибка удаления данных. Подробности: ' + result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 10000 });
            }).fail(function(jqXHR, textStatus, errorThrown ) {
                $.jGrowl('Ошибка удаления данных. Подробности:' + errorThrown, { 'themeState':'growl-error', 'sticky':false, life: 10000 });
            }).always(function(){Routine.hideLoader();});
        }
      }
    });
  },

  /**
   * Редактирование элемента
   */
  onEdit: function () {
    // показать форму редактирования элемента
    this.$el.html(this.templates.edit(this.model.toJSON()));
    // создать коллекцию из трудовых расчетов текущего элемента истории
    // подгрузить view работы с формой редактирования трудовых расчетов
    this.workersListCollection = new App.Collections.WorkerItemsCollection(this.model.get('workers'));
    this.workerItemsView = new  App.Views.WorkerItemsView({parent:this});
    this.workerItemsView.collection = this.workersListCollection;
    this.$el.find('.data-box').html(this.workerItemsView.render().el).addClass('edit');
  },

  /**
   * Сохранение изменений
   */
  onSave: function () {
    var self = this;
    // валидация процентов трудового участия
    if(!this.workerItemsView.Validate())
      return;
    // сохранение данных  влокальной коллекции
    this.model.set('workers', this.workersListCollection.toJSON());
    // сохранение данных на сервере
    Routine.showLoader();
    $.ajax({
    type: "PUT",
    url: "/handlers/joblog/update_workers_history",
    data: JSON.stringify(self.model),
    timeout: 35000,
    contentType: 'application/json',
    dataType: 'json',
    async:true
    }).done(function(result) {
      if(result['status']=="ok")
      {
        $.jGrowl('Данные успешно сохранены .', { 'themeState':'growl-success', 'sticky':false, life: 10000 });
        // показать форму отображения элемента
        self.$el.html(self.templates.main(self.model.toJSON())).removeClass('edit');
      }
      else
        $.jGrowl('Ошибка сохранения данных. Подробности: ' + result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 10000 });
    }).fail(function(jqXHR, textStatus, errorThrown ) {
      $.jGrowl('Ошибка сохранения данных. Подробности:' + errorThrown, { 'themeState':'growl-error', 'sticky':false, life: 10000 });
    }).always(function(){Routine.hideLoader();});
  },

  /**
   * Отмена редактирования
   */
  onCancel: function(){
    // вернуть модель к первоначальному состоянию
    // показать форму отображения элемента
    this.$el.html(this.templates.main(this.model.toJSON())).removeClass('edit');
  }
});
