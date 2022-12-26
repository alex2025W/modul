///---------------------------------------------------------------------------------------------------------
/// представление формы списка данных статистики KTU
///---------------------------------------------------------------------------------------------------------
App.Views.KtuStatisticDataListView = Backbone.View.extend({
  templates: {
      template: _.template($("#KtuStatisticDataListTemplate").html()),
      contract_item_template: _.template(Routine.trim($("#KtuStatisticContractItemTemplate").html())),
      order_item_template: _.template(Routine.trim($("#KtuStatisticOrderItemTemplate").html())),
      sector_item_template: _.template(Routine.trim($("#KtuStatisticSectorItemTemplate").html())),
      workorder_item_template: _.template(Routine.trim($("#KtuStatisticWorkOrderItemTemplate").html())),
      users_list_template: _.template(Routine.trim($("#KtuStatisticUsersListTemplate").html())),
      users_item_template: _.template(Routine.trim($("#KtuStatisticUsersItemTemplate").html()))
  },
  events:{
    'click .cb-item': 'onClickPlus',
    'click .lbl-item': 'onClickitem',
  },
  openedItems:{},   // список идентификаторов объектов, которые необходимо раскрыть
  collapsed: false, // глобальный флаг текущего состояния
  selectedGroups: ['contract_number', 'order_number', 'sector_code', 'number'],
  /**
   * Инициализация
   */
  initialize:function(){
    // раскрыте ветки
    this.openedItems = {};
    this.collapsed = false;
    // глобальное событие на раскрытие/закрытие всего дерева
    Backbone.on("ktu_statistic:collapse",this.onGlobalCollapse,this);
    Backbone.on("ktu_statistic:open_hand_collapsed_items",this.openHandCollapsedItems,this);
  },

  /**
   * Обработка глобавльного события фолдинга
   */
  onGlobalCollapse: function(e)
  {
    this.collapse(e[1]);
  },

  /**
   * Раскрыть/свернуть дерево
   */
  collapse: function(val)
  {
    this.collapsed = val;
    this.$el.find('.cb-item').prop('checked', val);
  },

  /**
   * Обработка раскрытия/сокрытия узлов дерева
   */
  onClickPlus: function(e)
  {
    var self = this;
    this.openedItems[$(e.currentTarget).prop('id')] = $(e.currentTarget).prop('checked');
  },

  /**
   * Обработка клика по любому элементу в списке
   */
  onClickitem: function(e)
  {
    this.$('.lbl-item').removeClass('selected');
    $(e.currentTarget).addClass('selected');
    this.lastSelectedItem = $(e.currentTarget);
  },

  /**
   * Очистка формы
   */
  clear: function()
  {
    this.openedItems = {};
    this.$el.empty();
  },

  /**
   * Отрисовкаы
   */
  render: function(){
    // очистить представление
    this.clear();
    // если нет данных на отображение
    if(this.collection.length ==0)
      return this;
    // сортировка  данных для дальнейшей группировки
    if(this.selectedGroups && this.selectedGroups.length>0)
      this.collection.sortBy(this.selectedGroups);
    this.$el.html(this.templates.template({}));
    // отрисовка данных
    this.renderAllData(this.collection.models, this.selectedGroups);
    // раскрть ветки, которые ранее раскрывал пользователь руками
    this.openHandCollapsedItems();
  },

  /**
   * Рассчет суммарной пропорции КТУ
   */
  calculateProportion: function(row){
    var result = 0;
    if(row.get('workers_participation') && row.get('workers_participation').length>0){
      for(var i in row.get('workers_participation')){
        var p_row = row.get('workers_participation')[i];
        if(p_row['workers'] && p_row['workers'].length > 0){
          for(var j in p_row['workers']){
            result += p_row['workers'][j]['proportion'];
          }
        }
      }
    }
    return result;
  },

  /**
   * Рассчет суммарного количества людей
   */
  calculateWorkersCount: function(row){
    var result = 0;
    if(row.get('workers_participation') && row.get('workers_participation').length>0){
      for(var i in row.get('workers_participation')){
        var p_row = row.get('workers_participation')[i];
        if(p_row['workers'] && p_row['workers'].length > 0){
          result += p_row['workers'].length;
        }
      }
    }
    return result;
  },

   /**
   * Рассчет суммарного количества уникальных людей
   */
  calculateUniqueWorkersCount: function(data, row){
    if(row.get('workers_participation') && row.get('workers_participation').length>0){
      for(var i in row.get('workers_participation')){
        var p_row = row.get('workers_participation')[i];
        if(p_row['workers'] && p_row['workers'].length > 0){
          for(var w_row in p_row['workers']){
            data[p_row['workers'][w_row]['user_email']] = p_row['workers'][w_row];
          }
        }
      }
    }
    return data;
  },

  /**
   * Группировка данных
   */
  groupData: function(data, selected_groups){
    var result = {'items':{}};
    if(selected_groups && selected_groups.length>0)
    {
      for(var dr_i in data)
      {
        var dr = data[dr_i];
        var d_res = result['items'];
        for(var gk_i in selected_groups)
        {
          var gk = selected_groups[gk_i];
          var is_find =false;
          for(var k in d_res){
            if(k==dr.get(gk)){
              d_res[k]['proportion'] += this.calculateProportion(dr);
              d_res[k]['workers_count'] += this.calculateWorkersCount(dr);
              d_res[k]['workers'] = this.calculateUniqueWorkersCount(d_res[k]['workers'], dr);

              d_res = d_res[k]['items'];
              is_find = true;

              if(selected_groups.length-1==gk_i){
                d_res.push(dr)
              }
              break;
            }
          }
          if(!is_find){
            var number = '';
            var name = '';
            switch(gk){
              case 'contract_number':
                number = dr.get('contract_number');
                name = '';
              break;
              case 'order_number':
                number = dr.get('order_number');
                name = dr.get('production_name');
              break;
              case 'sector_code':
                number = dr.get('sector_code');
                name = dr.get('sector_name');
              break;
              case 'number':
                number = dr.get('number');
                name = '';
              break;
            }

            d_res[dr.get(gk)]= {
              'items':{},
              'group_key': gk,
              'number': number,
              'name': name,
              'index': _.size(d_res),
              'level_with_data': false,
              'proportion': this.calculateProportion(dr),
              'workers_count': this.calculateWorkersCount(dr),
              'workers': this.calculateUniqueWorkersCount({}, dr)
            };

            if(selected_groups.length-1 == gk_i)
            {
              d_res[dr.get(gk)]['items'] = [dr];
              d_res[dr.get(gk)]['level_with_data'] = true;
            }
            d_res = d_res[dr.get(gk)]['items'];
          }
        }
      }
      return result['items'];
    }
    else
      return data;
  },

  /**
   * Отрисовка и фильтрация данных  с учетов группировок
   * data - array of models
   * selected_groups - порядок группировки
   */
  renderAllData: function(data, selected_groups){
    this.renderGroupedData(
      this.groupData(data, selected_groups), $(this.$el.find('.data-list')), '0', 0
    );
  },

  /**
   * Отрисовка сгруппированных данных
   */
  renderGroupedData: function(data, container, index, level){
    level++;
    for(var i in data)
    {
      var row = data[i];
      var new_container = null;
      switch(row['group_key']){
        case 'contract_number':
          new_container = $(this.templates.contract_item_template({
            'level': level.toString(),
            'index': index+'-'+row['index'],
            'name': row['name'],
            'number': row['number'],
            'proportion': row['proportion'],
            'workers_count': row['workers_count'],
            'workers': row['workers']
          }));
        break;
        case 'order_number':
          new_container = $(this.templates.order_item_template({
            'level': level.toString(),
            'index': index+'-'+row['index'],
            'name': row['name'],
            'number': row['number'],
            'proportion': row['proportion'],
            'workers_count': row['workers_count'],
            'workers': row['workers']
          }));
        break;
        case 'sector_code':
          new_container = $(this.templates.sector_item_template({
            'level': level.toString(),
            'index': index+'-'+row['index'],
            'name': row['name'],
            'number': row['number'],
            'proportion': row['proportion'],
            'workers_count': row['workers_count'],
            'workers': row['workers']
          }));
        break;
        case 'number':
          new_container = $(this.templates.workorder_item_template({
            'level': level.toString(),
            'index': index+'-'+row['index'],
            'name': row['name'],
            'number': row['number'],
            'proportion': row['proportion'],
            'workers_count': row['workers_count'],
            'workers': row['workers']
          }));
        break;
      }
      // если уровень с данными по нарядам, то рекурсию прекращаем и рендерим список КТУ работников
      if(row['level_with_data'])
        this.renderData(row['items'][0], $(new_container).find('.data-list'))
      else
        this.renderGroupedData(
          row['items'],
          $(new_container).find('.data-list'),
          index+'-'+row['index'],
          level
        );
      $(container).append(new_container);
    }
  },

  /**
   * Отрисовка списка КТУ
   * data - список КТУ работников
   * container -блок в который необходимо добавить данные
   */
  renderData: function(data, container){
    var data_list_html = $(Routine.trim(this.templates.users_list_template({})));
    var data_container = $(data_list_html).find('tbody.ktu-statistic-body');
    // если есть данные по трудовому участию, то делаем сбор данных с подсчетом
    // суммарных часов участия по всем датам
    if(data.get('workers_participation') && data.get('workers_participation').length > 0){
      var workers_participation = data.get('workers_participation');
      var result_volumes = {};
      for(var i in workers_participation)
      {
        var row = workers_participation[i];
        if(row['workers'] && row['workers'].length>0){
          for(var j in row['workers'])
          {
            var w_row = row['workers'][j];
            if(!(w_row['user_email'] in result_volumes))
              result_volumes[w_row['user_email']] = w_row;
            else
              result_volumes[w_row['user_email']]['proportion'] += w_row['proportion'];
          }
        }
      }

      for(var i in result_volumes){
        var itemView = new App.Views.UsersItemView({model: new  App.Models.KtuModel(result_volumes[i]), parentView: null});
        $(data_container).append(itemView.render().el);
      }

      $(container).append(data_list_html);
    }
  },

  /**
   * Раскрыть ветки, которые пользователь раскрывал руками
   */
  openHandCollapsedItems: function(items)
  {
    // если требуется раскрыть все дерево
    if(this.collapsed)
      this.collapse(true);
    // раскрыть сохраненные ветки
    for(var i in this.openedItems)
      this.$el.find('#'+i).prop('checked', this.openedItems[i]);
  }

});

///---------------------------------------------------------------------------------------------------------
/// Представление элемента материала
///---------------------------------------------------------------------------------------------------------
App.Views.UsersItemView = Backbone.View.extend({
  className: 'item',
  tagName:'tr',
  parentView: null, // View ы который входит текущий
  templates: {
    template: _.template($("#KtuStatisticUsersItemTemplate").html()),
  },

  /**
   * инициализация
   */
  initialize:function(){
  },
  /**
   * Очистка формы
   */
  clear: function()
  {
    this.$el.empty();
  },
  /**
   * отрисовка
   */
  render: function(){
    // отрисовка шаблона
    this.$el.html(this.templates.template(this.model.toJSON()));
    return this;
  }
});
