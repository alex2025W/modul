///------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
/// Контрол отображения покупных изделий
///------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
App.Views.DataViewBuyItems = Backbone.View.extend({
  el: $("#esud_calculation_data_container"),
  data: null, // основные данные
  calculated_data: null, // данные с примененными расчетами
  view_in: "volume",   // вид отображения(объем/вес/стоимость)
  templates: {
    data:_.template($("#dataBuyTemplate").html()),
    templateSideObject: _.template($("#templateSideObject").html()),
  },
  /**
  * События
  **/
  events:{
    //'click .cb-view-in-money': 'onClickViewInMoney'
    'change .ddl-view-in': 'onChangeViewIn'
  },

  /**
  * Инициализация
  **/
  initialize: function()
  {
  },

  /**
   * Смены вида отображения
  **/
  onChangeViewIn: function(e){
    this.view_in = this.$('.ddl-view-in').val();
    this.render();
  },

  /**
    * Инициализация данных
  **/
  init_data:function(collection)
  {
    this.data = collection;
  },

  /**
    * Отрисовка
  **/
  render:function()
  {
    this.$el.html(this.templates.data($.extend({},{'data': this.data},{'view_in': this.view_in})));
  },

   /**
  * Получение данных на сохранение
  **/
  validate_and_get_data: function()
  {
    var result_data = [];
    for(var i in this.data)
    {
      var row = this.data[i]['elem'];
      var templates = null;
      if('templates_combs' in this.data[i] && this.data[i]['templates_combs'])
        templates = this.data[i]['templates_combs']['templates'];

      result_data.push({
        'elem': row,
        'vol_amount': row['vol_amount'],
        'vol_full': row['vol_full'],
        'templates': templates
      });
    }
    return {'ok': true, 'data':result_data};
  },
  /**
  * Очистка формы
  **/
  clear: function()
  {
    this.data = null;
    this.calculated_data = null;
    this.$el.empty();
  }
});


///------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
/// Контрол отображения собственных изделий (задания на производство)
///------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
App.Views.DataViewOwnItems = Backbone.View.extend({
  el: $("#esud_task_to_product_data_container"),
  data: null,
  calculated_data: null,
  sorted_sectors: null,
  openedItems:{}, // список идентификаторов объектов, которые необходимо раскрыть

  templates: {
    data:_.template($("#dataOwnTemplate").html())
  },
  /**
  * События
  **/
  events:{
    'click .cb-item': 'onClickPlus'
  },
  /**
  * Инициализация
  **/
  initialize: function()
  {
    this.openedItems = {};
    this.sorted_sectors = null;
    this.calculated_data = null;
  },
  /**
    * Отрисовка
  **/
  render:function(collection, sorted_sectors)
  {
    this.data = collection;
    this.calculated_data = collection;
    this.sorted_sectors = sorted_sectors;
    // группировка данных по секторам
    var grouped_data = {};
    for (var row_index in this.data)
    {
      var row = this.data[row_index];
      if(!(row['elem']['sector']['name'] in grouped_data))
        grouped_data[row['elem']['sector']['name']] = [];
      grouped_data[row['elem']['sector']['name']].push(row);
    }

    // отрисовка дерева
    this.$el.html(this.templates.data(grouped_data));
    // раскрыть сохраненные ветки
    for(var i in this.openedItems)
    {
      if(this.openedItems[i])
        this.$el.find('#'+i).prop('checked', true);
    }
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
    * Отрисовка
    * in_objects - объекты которые необходимо изготовить по заданию используя выбранный шаблон
    * combo_out_objects - список всех объектов, которые получаются от применения шаблона раскроя
  **/
  /*recalculateSplitObjectsValues:function(in_objects, comb_out_objects)
  {
    var in_objects_counts = {};
    for(var i in in_objects)
      in_objects_counts[in_objects[i]['config_number']] = in_objects[i]['count']['value'];

    // проверка на появление новых объектов, образующихся в результате применения шаблонов
    var templates_side_out_objectst = {};
    var templates_exist_out_objectst = {};
    for(var i_id in comb_out_objects)
    {
      if(comb_out_objects[i_id]['object']['node']['type']== 'product' && !comb_out_objects[i_id]['object']['node']['is_input'])
      {
        if(!(i_id in in_objects_counts))
        {
            comb_out_objects[i_id]['object']['parent_sector'] = {'name': 'Склад'};
            comb_out_objects[i_id]['object']['count']['value'] = comb_out_objects[i_id]['value'];
            templates_side_out_objectst[comb_out_objects[i_id]['object']['node']['number']]=comb_out_objects[i_id]['object'];
        }
        else
        {
          comb_out_objects[i_id]['object']['count']['value'] = comb_out_objects[i_id]['value'];
          templates_exist_out_objectst[comb_out_objects[i_id]['object']['node']['number']]=comb_out_objects[i_id]['object'];
        }
      }
    }

    var new_calculated_data = [];

    //-------------------------------------------------------------------------------------------------------------------------
    //---!!!!!!!!--------Добавить код вывода спецификаций вместо конфигураций------
    //-------------------------------------------------------------------------------------------------------------------------
    // добавление в новые данные информацию о побочных шаблонных объектах
    for(var i in templates_side_out_objectst)
    {
      //new_calculated_data.push({'elem':templates_side_out_objectst[i]});
      var tmp_elem = {};

      if('specifications' in templates_side_out_objectst[i] && templates_side_out_objectst[i]['specifications'].length>0 )
      {
        tmp_elem = JSON.parse(JSON.stringify(templates_side_out_objectst[i]['specifications'][0]))
        tmp_elem['count'] = templates_side_out_objectst[i]['count'];
        tmp_elem['parent_sector'] = templates_side_out_objectst[i]['parent_sector'];
      }
      else
      {
        tmp_elem = JSON.parse(JSON.stringify(templates_side_out_objectst[i]))
        tmp_elem['sector'] = {
          'name': tmp_elem['sector']['value'],
          'origin_id': tmp_elem['sector']['datalink'],
          'routine': tmp_elem['sector']['routine']
        };
        tmp_elem['number'] = tmp_elem['node']['number'];
        tmp_elem['name'] = tmp_elem['node']['name'];
      }
      new_calculated_data.push({'elem': tmp_elem});
    }
    //--------------------------------------------------------------------------------------------------------------------------

    // увеличение количества существующих объектов от результата применения шаблона раскроя
    // часть пойдет на склад. если от раскроя больше чем надо объектов
    for (var i in this.data)
    {
      var row = this.data[i]['elem'];
      var copy_row = null;
      if(row['config_number'] in templates_exist_out_objectst)
      {
        tmpl_object = templates_exist_out_objectst[row['config_number']];
        if(tmpl_object['count']['value'] - row['count']['value']>0 )
        {
          copy_row = JSON.parse(JSON.stringify(row));
          copy_row['count']['value'] = tmpl_object['count']['value'] - row['count']['value'];
          copy_row['parent_sector'] = {'name': 'Склад'};
        }
      }
      new_calculated_data.push({'elem':row});
      if(copy_row)
        new_calculated_data.push({'elem':copy_row});
    }

    for (var row_index in new_calculated_data)
      new_calculated_data[row_index]['elem']['sector']['routine'] = this.sorted_sectors[new_calculated_data[row_index]['elem']['sector']['name']];

    // сортировка данных по участку
    new_calculated_data = new_calculated_data.sort(function(a,b){
        if(a['elem']['sector']['routine'] >b['elem']['sector']['routine'])
          return 1;
        if(a['elem']['sector']['routine'] <b['elem']['sector']['routine'])
          return -1;
        else
        {
          if (a['elem']['number'] < b['elem']['number'])
            return -1;
          else if (a['elem']['number'] > b['elem']['number'])
            return 1;
          return 0;
        }
    });

    // сохранение расчета
    // this.calculated_data = new_calculated_data;
    // отрисовка данных
    this.render(new_calculated_data, this.sorted_sectors);
  },*/

  /**
  * Получение данных на сохранение
  **/
  validate_and_get_data: function()
  {
    for(var i in this.data)
    {
      var row = this.data[i]['elem'];
      if(row['to_stock'] && (!row['selected_specification']))
      {
        $.jGrowl('Ошибка в расчетах задания на производство. Для некоторых конфигураций не найдены спецификации.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
        return {'ok': false, 'data':null};
      }
    }
    return {'ok': true, 'data':this.data};
  },

  /**
  * Очистка формы
  **/
  clear: function()
  {
    this.data = null;
    this.sorted_sectors = null;
    this.calculated_data = null;
    this.$el.empty();
  }
});

///------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
/// Контрол отображения плановых норм (нормы расхода)
///------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
App.Views.DataViewPlanNorms = Backbone.View.extend({
  el: $("#esud_plan_norms_data_container"),
  data: null,
  sorted_sectors: null,
  openedItems:{}, // список идентификаторов объектов, которые необходимо раскрыть
  templates: {
    data:_.template($("#dataPlanNormsTemplate").html())
  },

  /**
  * События
  **/
  events:{
    'click .cb-item': 'onClickPlus'
  },

  /**
  * Инициализация
  **/
  initialize: function()
  {
    this.openedItems = {};
    this.sorted_sectors = null;
  },

  /**
    * Отрисовка
  **/
  render:function(collection, sorted_sectors)
  {
    this.data = collection;
    this.sorted_sectors = sorted_sectors;
    // группировка данных по секторам
    var grouped_data = {};
    var tmp_data = [];

    // группировка по секторам
    tmp_grouped_by_sectors = {};
    for (var row_index in this.data)
    {
      for(var child_index in this.data[row_index]['items'] )
      {
        var child_row = this.data[row_index]['items'][child_index];
        if (!child_row['sector'])
          child_row['sector'] = {'name': 'Не задан'};
        if(!(child_row['sector']['name'] in tmp_grouped_by_sectors) )
          tmp_grouped_by_sectors[child_row['sector']['name']] = {'sector': child_row['sector'], 'items': {}};

        if(!(this.data[row_index]['elem']['number'] in tmp_grouped_by_sectors[child_row['sector']['name']]['items'] ))
        {
          var tmp_obj = Routine.copyObject(this.data[row_index]['elem']);
          tmp_obj['count']['value'] = child_row['vol_bynorm'];
          tmp_obj['sector'] = child_row['sector'];
          tmp_obj['sector']['routine'] = this.sorted_sectors[child_row['sector']['name']];
          tmp_data.push(tmp_obj);
          tmp_grouped_by_sectors[child_row['sector']['name']]['items'][this.data[row_index]['elem']['number']] = tmp_obj;
        }
        else
          tmp_grouped_by_sectors[child_row['sector']['name']]['items'][this.data[row_index]['elem']['number']]['count']['value']+=child_row['vol_bynorm'];
      }
    }

      // сортировка данных по участку
    tmp_data = tmp_data.sort(function(a,b){
        if(a['sector']['routine'] >b['sector']['routine'])
          return 1;
        if(a['sector']['routine'] <b['sector']['routine'])
          return -1;
        else
        {
          if (a['number'] < b['number'])
            return -1;
          else if (a['number'] > b['number'])
            return 1;
          return 0;
        }
    });

    for (var row_index in tmp_data)
    {
      var row = tmp_data[row_index];
      if(!(row['sector']['name'] in grouped_data))
        grouped_data[row['sector']['name']] = [];
      grouped_data[row['sector']['name']].push(row);
    }

    // отрисовка дерева
    this.$el.html(this.templates.data(grouped_data));
    // раскрыть сохраненные ветки
    for(var i in this.openedItems)
    {
      if(this.openedItems[i])
        this.$el.find('#'+i).prop('checked', true);
    }
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
  * Очистка формы
  **/
  clear: function()
  {
    this.data = null;
    this.sorted_sectors = null;
    this.$el.empty();
  }
});



