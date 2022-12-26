//---------------------------------------------------------------------------------------------------------
// представление формы спецификации материалов
//---------------------------------------------------------------------------------------------------------
App.Views.SpecificationMaterialsDataListViewContainer = Backbone.View.extend({
  lastSelectedItem: null, // последний выделенный элемент в списке
  el: '#specification-materials-data-body-container',
  templates: {
    not_found_template: _.template($('#DataNotFoundTemplate').html()),
    set_search_query_template: _.template($('#SetSearchQueryTemplate').html()),
    template: _.template($('#SpecificationMaterialsDataListTemplate').html()),
    //-materials----------------------------
    sector_item_template: _.template(
      $('#SpecificationSectorItemTemplate').html(),
    ),
    category_item_template: _.template(
      $('#SpecificationCategoryItemTemplate').html(),
    ),
    group_item_template: _.template(
      $('#SpecificationGroupItemTemplate').html(),
    ),
  },
  events: {
    'click .cb-item': 'onClickPlus',
    'click .lbl-item': 'onClickitem',
    'click .btn-save': 'onDataSave',
    'click #show-empty-groups': 'onShowEmptyGroups',
    //-------
    on_line_filter: 'onLineFilter',
    'material:add': 'onMaterialAdd',
  },
  openedItems: {}, // список идентификаторов элементов, которые необходимо раскрыть
  collapsed: false, // глобальный флаг текущего состояния
  groupBy: [], // по кому ведется группировка
  filterLineQuery: '', // значение строки поиска по материалам
  materialsDict: null, // справочник материалов
  groupsListDict: null, // справочник материалов и групп
  showEmptyGroups: 'no', // Показвать группы с пустыми расчетами

  /**
   * Инициализация
   */
  initialize: function() {
    var self = this;
    // раскрыте ветки
    this.openedItems = {};
    this.collapsed = false;
    this.$el.html(this.templates.set_search_query_template({}));
    // глобальное событие на раскрытие/закрытие всего дерева
    Backbone.on('global:collapse', this.onGlobalCollapse, this);
    Backbone.on(
      'global:open_hand_collapsed_items',
      this.openHandCollapsedItems,
      this,
    );
    Backbone.on('global:apply_filters', this.onApplyFilters, this);

    // соыбтия на коллекцию
    this.collection.on('add', function(model, collection, options) {
      self.render();
    });
    this.collection.on('remove', function(model, collection, options) {
      self.render();
    });
  },

  hide: function() {
    this.$el.hide();
  },

  show: function() {
    this.$el.show();
  },

  /**
   * Обработка глобавльного события фолдинга
   */
  onGlobalCollapse: function(e) {
    this.collapse(e[1]);
  },

  /**
   * Раскрыть/свернуть дерево
   */
  collapse: function(val) {
    this.collapsed = val;
    this.$el.find('.cb-item').prop('checked', val);
  },

  /**
   * Обработка раскрытия/сокрытия узлов дерева
   */
  onClickPlus: function(e) {
    this.openedItems[$(e.currentTarget).data('id')] = $(e.currentTarget).prop(
      'checked',
    );
  },

  /**
   * Обработка клика по любому элементу в списке
   */
  onClickitem: function(e) {
    this.$('.lbl-item').removeClass('selected');
    $(e.currentTarget).addClass('selected');
    this.lastSelectedItem = $(e.currentTarget);
  },

  /**
   * Очистка формы
   */
  clear: function() {
    this.openedItems = {};
    this.$el.empty();
    this.show();
  },

  /**
   * Показать нестандартные материалы
   */
  onShowEmptyGroups: function(e) {
    var self = this;
    Routine.showLoader();
    setTimeout(function() {
      self.showEmptyGroups = $(e.currentTarget).prop('checked') ? 'yes' : 'no';
      Backbone.trigger('global:on_url_params_change', [
        self,
        'show_empty_groups',
        self.showEmptyGroups,
        false,
      ]);
      self.render();
    }, 150);
    Routine.hideLoader();
  },

  /**
   * Prepare view to render. Set some params
   * data = {
   *   group_by,
   *   groups,
   *   filterLineQuery,
   *   materialsDict,
   *   need_collapse,
   *   note
   * }
   */
  build: function(data) {
    this.groupBy = data.group_by; // какие поля участвуют в группировке (направление/ категория/ группа)
    this.groups = data.groups; // направления, категории, группы, заданные в фильтрации
    this.groupsListDict = data.groupsListDict; // справочник направление, категорий, группа
    this.filterLineQuery = data.filterLineQuery; // текст поиска
    this.materialsDict = data.materialsDict; // справочник материалов
    this.collapsed = data.need_collapse ? true : false;
    this.showEmptyGroups = data.showEmptyGroups || 'no';
    this.render();
  },

  render: function() {
    this.show();
    // если нет данных на отображение
    if (this.collection.length == 0) {
      this.$el.html(this.templates.not_found_template({}));
      return this;
    }

    // сортировка  данных для дальнейшей группировки
    this.collection.sortBy(
      'category_routine',
      'category_name',
      'group_routine',
      'group_name',
      'materials_name',
      //"materials_group_key",
      //"materials_key"
    );

    // отрисовка основного шаблона
    this.$el.html(
      this.templates.template({ showEmptyGroups: this.showEmptyGroups }),
    );

    // добавление строки поиска
    this.searchLineView = new App.Views.SearchLineView({
      model: {
        note:
          'Введите артикул или название материала. Пример: "1.35" или "труба профильная"<br> Для поиска по характеристкам, необходимо ввести символ "/". Пример: "труба проф/1.25"',
        query: this.filterLineQuery,
      },
    });
    this.$('.css-treeview').prepend(this.searchLineView.render().el);
    // фильтрация основных данных
    var filtered_data = this.filterAllData(this.collection, this.groups);
    // отрисовка данных
    this.renderAllData(
      filtered_data,
      this.groupBy,
      this.groupsListDict,
      this.groups,
      this.showEmptyGroups,
    );
    // раскрть ветки, которые ранее раскрывал пользователь руками
    this.openHandCollapsedItems();
  },

  /**
   * Фильтрация данных по заданным параметрам
   * groups - список ID групп
   */
  filterAllData: function(collection, groups) {
    var result = [];
    var groups_ids = null;

    // preapre search query
    var materialQuery = '';
    var propQuery = '';
    if (this.filterLineQuery) {
      materialQuery = this.filterLineQuery.split('/')[0];
      propQuery =
        this.filterLineQuery.indexOf('/') > -1
          ? this.filterLineQuery.split('/')[1]
          : '';
    }

    if (groups && groups.length > 0) {
      groups_ids = {};
      for (var i in groups) groups_ids[groups[i].toString()] = groups[i];
    }
    for (var i in collection.models) {
      var model = collection.models[i];
      var full_key =
        model.get('materials_group_key') + '.' + model.get('materials_key');
      if (
        model.get('unique_props_info') &&
        model.get('unique_props_info')['key']
      )
        full_key += '.' + model.get('unique_props_info')['key'];
      if (
        model.get('status') != '-1' &&
        // по группам
        (!groups_ids ||
          (groups_ids &&
            model.get('group_id') &&
            model.get('group_id').toString() in groups_ids)) &&
        // по названию материала
        (!materialQuery ||
          Routine.isStringContains(
            full_key + model.get('materials_name'),
            materialQuery,
          )) &&
        // по названию характеристики
        (!propQuery ||
          (model.get('unique_props_info') &&
            model.get('unique_props_info')['key'] &&
            Routine.isStringContains(
              model.get('unique_props_info')['name'],
              propQuery,
            )))
      )
        result.push(model);
    }
    return result;
  },

  /**
   * Раширенная группировка данных.
   * Результат строится не на основе самих данных по материалам, а на основе
   * справочника категорий и групп
   * data - список всех материалов в расчете
   * groupsListDict - справочник направлений, категорий, групп
   * filteredGroupsIDS - ID групп, которые отобраны пользователем в фильтрации
   * groupBy - по кому нужна грппировка (напреление, категория, группа)
   */
  groupDataEXT: function(data, groupsListDict, filteredGroupsIDS, groupBy) {
    var levelsCodes = ['sector_id', 'category_id', 'group_id'];

    // function filterGroupsDictionary(groupsListDict, filteredGroupsIDS, level) {
    //   for (var i in groupsListDict) {
    //     var new_items = [];
    //     // смотрим только уровень групп
    //     if (level === 1) {
    //       for (var j in groupsListDict[i]["items"]) {
    //         if (groupsListDict[i]["items"][j]["_id"] in filteredGroupsIDS)
    //           new_items.push(groupsListDict[i]["items"][j]);
    //       }
    //       groupsListDict[i]["items"] = new_items;
    //     }

    //   }
    // }
    // groupsListDict = filterGroupsDictionary(
    //   groupsListDict,
    //   filteredGroupsIDS,
    //   0
    // );

    function prepareData(groupsListDict, level, data_level, groupBy, result) {
      var level = 0 || level;

      if (levelsCodes[level] in groupBy) {
        for (var i in groupsListDict) {
          var row = groupsListDict[i];
          var new_item = {
            items: [],
            group_key: levelsCodes[level],
            number: row['number'],
            name: row['name'],
            index: row['_id'],
            level_with_data: level === data_level ? true : false,
            id: row['_id'],
          };

          if (new_item['level_with_data']) {
            for (var data_i in data) {
              if (data[data_i].get(new_item['group_key']) == new_item['id'])
                new_item.items.push(data[data_i]);
            }
          } else {
            prepareData(
              row['items'],
              level + 1,
              data_level,
              groupBy,
              new_item['items'],
            );
          }

          // // если такая группа уже есть в результате, то надо ей подмешать новые данные
          // var is_already_in_result = false;
          // for (var j in result)
          //   if (result[j]["id"] == new_item["id"]) {
          //     result[j]["items"].concat(new_item["items"]);
          //     is_already_in_result = true;
          //     break;
          //   }
          // if (!is_already_in_result) result.push(new_item);

          result.push(new_item);
        }
      } else {
        for (var i in groupsListDict) {
          var row = groupsListDict[i];
          prepareData(row['items'], level + 1, data_level, groupBy, result);
        }
      }
    }

    function calculateMaterialsInGroups(data) {
      var count = 0;
      for (var i in data) {
        if (data[i]['level_with_data']) {
          data[i]['count'] = data[i]['items'].length;
          count += data[i]['count'];
        } else {
          data[i]['count'] = calculateMaterialsInGroups(data[i]['items']);
          count += data[i]['count'];
        }
      }
      return count;
    }

    groupByObject = {};
    for (var i in groupBy) groupByObject[groupBy[i]] = true;
    var data_level = 0;
    if (groupBy.length > 0) {
      for (var i = 0; i < levelsCodes.length; i++)
        if (levelsCodes[i] in groupByObject) data_level = i;
    }
    // Подготавливаем итоговый список данных
    var result = [];
    prepareData(groupsListDict, 0, data_level, groupByObject, result);
    calculateMaterialsInGroups(result);

    // если в фильтрах указанны конкретные группы, данные по которым надо отображать
    return filteredGroupsIDS ? result : data;
  },

  /**
   * Группировка данных
   */
  groupData: function(data, selected_groups) {
    function calculateMaterialsInGroups(data) {
      var count = 0;
      for (var i in data) {
        if (data[i]['level_with_data']) {
          data[i]['count'] = data[i]['items'].length;
          count += data[i]['count'];
        } else {
          data[i]['count'] = calculateMaterialsInGroups(data[i]['items']);
          count += data[i]['count'];
        }
      }
      return count;
    }

    var result = { items: {} };
    if (selected_groups && selected_groups.length > 0) {
      for (var dr_i in data) {
        var dr = data[dr_i];
        var d_res = result['items'];
        for (var gk_i in selected_groups) {
          var gk = selected_groups[gk_i];
          var is_find = false;
          for (var k in d_res) {
            if (k == dr.get(gk)) {
              d_res = d_res[k]['items'];
              is_find = true;
              if (selected_groups.length - 1 == gk_i) d_res.push(dr);
              break;
            }
          }
          if (!is_find) {
            var number = '';
            var name = '';
            switch (gk) {
              case 'sector_id':
                number = dr.get('sector_number');
                name = dr.get('sector_name');
                break;
              case 'category_id':
                number = dr.get('category_number');
                name = dr.get('category_name');
                break;
              case 'group_id':
                number = dr.get('group_number');
                name = dr.get('group_name');
                break;
            }
            d_res[dr.get(gk)] = {
              items: {},
              group_key: gk,
              number: number,
              name: name,
              index: _.size(d_res),
              level_with_data: false,
              id: dr.get(gk),
            };
            if (selected_groups.length - 1 == gk_i) {
              d_res[dr.get(gk)]['items'] = [dr];
              d_res[dr.get(gk)]['level_with_data'] = true;
            }
            d_res = d_res[dr.get(gk)]['items'];
          }
        }
      }
      calculateMaterialsInGroups(result['items']);
      return result['items'];
    } else return data;
  },

  /**
   * Отрисовка и фильтрация данных с учетом группировок
   * data - array of models
   * selected_groups - порядок группировки
   */
  renderAllData: function(
    data,
    selected_groups,
    groupsListDict,
    filteredGroupsIDS,
    showEmptyGroups,
  ) {
    var self = this;
    var new_data = [];

    // удаляем зафиксированный хидер, если такой есть
    if (this.dTable) this.dTable.fixedHeader.disable();

    // если нужна группировка
    if (selected_groups && selected_groups.length > 0) {
      this.dTable = null;
      // группировка основноых данных
      if (showEmptyGroups === 'yes')
        var prepeared_data = this.groupDataEXT(
          data,
          groupsListDict,
          filteredGroupsIDS,
          selected_groups,
        );
      else var prepeared_data = this.groupData(data, selected_groups);

      // отрисовка данных
      this.renderGroupedData(
        prepeared_data,
        $(this.$el.find('.data-list')),
        '0',
        0,
      );
    } else {
      // отрисовать данные линейно без группировок
      this.renderMaterialsList(data, this.$el.find('.data-list'), true);
    }
  },

  /**
   * Отрисовка сгруппированных данных
   */
  renderGroupedData: function(data, container, index, level) {
    level++;
    for (var i in data) {
      var row = data[i];
      var new_container = null;
      switch (row['group_key']) {
        case 'sector_id':
          new_container = $(
            this.templates.sector_item_template({
              level: level.toString(),
              index: index + '-' + row['index'],
              name: row['name'],
              number: row['number'],
              id: row['id'],
              count: row['count'],
            }),
          );
          break;
        case 'category_id':
          new_container = $(
            this.templates.category_item_template({
              level: level.toString(),
              index: index + '-' + row['index'],
              name: row['name'],
              number: row['number'],
              id: row['id'],
              count: row['count'],
            }),
          );
          break;
        case 'group_id':
          new_container = $(
            this.templates.group_item_template({
              level: level.toString(),
              index: index + '-' + row['index'],
              name: row['name'],
              number: row['number'],
              id: row['id'],
              count: row['count'],
            }),
          );
          break;
      }
      // если уровень с данными по материалам, то рекурсию прекращаем и рендерим список материалов
      // иначе продолжаем рекурсию
      if (row['level_with_data'])
        this.renderMaterialsList(
          row['items'],
          $(new_container).find('.data-list'),
        );
      else
        this.renderGroupedData(
          row['items'],
          $(new_container).find('.data-list'),
          index + '-' + row['index'],
          level,
        );
      $(container).append(new_container);
    }
  },

  /**
   ** Отрисовка списка материалов
   ** data - список материалов
   ** container -блок в который необходимо добавить данные материалы
   **/
  renderMaterialsList: function(data, container, needPager) {
    var needPager = false || needPager;
    var itemsView = new App.Views.SpecificationMaterialsDataListView({
      collection: new App.Collections.SpecificationMaterialsDataCollection(
        data,
      ),
      groupBy: this.groupBy,
      materialsDict: this.materialsDict,
      groupsListDict: this.groupsListDict,
      needPager: needPager,
    });
    $(container).append(itemsView.render().el);
  },

  /**
   * Раскрыть ветки, которые пользователь раскрывал руками
   **/
  openHandCollapsedItems: function(items) {
    // если требуется раскрыть все дерево
    if (this.collapsed) this.collapse(true);
    // раскрыть сохраненные ветки
    for (var i in this.openedItems)
      this.$el
        .find("[data-id='" + i + "']")
        .prop('checked', this.openedItems[i]);
  },

  /**
   * Обработка события смены филтров и группировок
   * obj[sender, filters]
   * filters = {group_by, groups}
   */
  onApplyFilters: function(obj) {
    var self = this;
    var filters = obj[1];
    $('body').addClass('wait');
    setTimeout(function() {
      self.groupBy = filters.group_by;
      self.groups = filters.groups;
      self.render();
      $('body').removeClass('wait');
    }, 150);
  },

  /**
   * Фильтрация данных по введенной строке поиска
   */
  onLineFilter: function(obj, query) {
    var self = this;
    this.filterLineQuery = query;

    Backbone.trigger('global:on_url_params_change', [
      this,
      'specification_materials_search_line',
      query,
      false,
    ]);

    $('body').addClass('wait');
    setTimeout(function() {
      self.render();
      self.$('.filter-number').focus();
      var tmpVal = self.$('.filter-number').val();
      self
        .$('.filter-number')
        .val('')
        .val(tmpVal);

      /*// фильтрация основных данных
      var filtered_data =  self.filterAllData(self.collection, self.groups);
      // отрисовка данных
      self.renderAllData(filtered_data, self.groupBy);
      // раскрть ветки, которые ранее раскрывал пользователь руками
      self.openHandCollapsedItems();*/

      $('body').removeClass('wait');
    }, 150);
    //self.render(this.groupBy, self.groups, self.collapsed);
  },

  /**
   * Очитка всех фильтров
   */
  cancelData: function(obj) {},

  /**
   * Save data
   */
  onDataSave: function() {
    App.saveSpecification(this.$('.specification-note').val());
  },

  /**
   * Добавление материала в общую коллекцию
   */
  onMaterialAdd: function(obj, dataListView, newModel) {
    this.collection.add(newModel, { silent: true });
  },
});

///---------------------------------------------------------------------------------------------------------
/// Представление списка материалов
///---------------------------------------------------------------------------------------------------------
App.Views.SpecificationMaterialsDataListView = Backbone.View.extend({
  className: 'in-info main-data',
  tagName: 'table',
  groupBy: null, // список полей по которым идет группировка
  materialsDict: null, // справочник материалов
  groupsListDict: null, // справочник направлений, категорий, групп
  needPager: false,
  pager: null,
  currentPage: 1,
  itemsOnPage: 50,
  templates: {
    material_list_items_template: _.template(
      $('#SpecificationMaterialsListTemplate').html(),
    ),
    material_list_footer_template: _.template(
      $('#SpecificationMaterialsListFooterTemplate').html(),
    ),
  },
  events: {
    'click .lnk-paste-from': 'onPasteDataFrom',

    //------
    'pager:change_page': 'onChangePage',
    'material:copy': 'onMaterialCopy',
  },

  initialize: function() {
    this.groupBy = this.options.groupBy;
    this.materialsDict = this.options.materialsDict;
    this.groupsListDict = this.options.groupsListDict;
    this.needPager = this.options.needPager;
  },

  getDataByPage: function(data, page) {
    var cur_pos = (page - 1) * this.itemsOnPage;
    return data.slice(
      cur_pos,
      cur_pos + this.itemsOnPage > data.length
        ? data.length - cur_pos
        : cur_pos + this.itemsOnPage,
    );
  },

  calculatePagesCount: function(count) {
    return Math.ceil(count / this.itemsOnPage);
  },

  render: function() {
    this.$el.html(
      $(
        Routine.trim(
          this.templates.material_list_items_template({
            groupBy: this.groupBy,
          }),
        ),
      ),
    );
    var materials_container = this.$el.find('tbody.materials-body');

    if (this.needPager) {
      var pagesCount = this.calculatePagesCount(this.collection.models.length);
      var data = this.getDataByPage(this.collection.models, this.currentPage);
    }
    else
     var data = this.collection.models.slice();

    for (var i in data) {
      var row = data[i];
      var itemView = new App.Views.SpecificationMaterialItemView({
        model: row,
        groupBy: this.groupBy,
        parentView: this,
        materialInfo: this.materialsDict[row.get('materials_id')],
        index: i,
      });
      // отрисовка на форме
      $(materials_container).append(itemView.render().el);
    }
    // добавление футера с итоговыми объемами
    $(materials_container).after(
      $(Routine.trim(this.templates.material_list_footer_template({}))),
    );
    if (this.needPager) {
      this.pager = new App.Views.PagerView({
        el: this.$el.find('.list-pager'),
      });
      this.pager.render(this.currentPage, pagesCount);
    }
    return this;
  },

  onChangePage: function(e, page) {
    this.currentPage = page;
    this.render();

    //this.$el.animate({scrollTop:0}, 'fast');
    this.$el[0].scrollIntoView(true);
  },

  onMaterialCopy: function(obj, itemView, itemModel) {
    var newModel = new App.Models.SpecificationMaterialItemModel(
      itemModel.toJSON(),
    );
    newModel.set({
      _id: null,
      status: '5',
      unique_props_info: null,
      pto_size: 0,
      note: '',
      allowance: 0,
      blink: true,
      //-----
      purchase_status: '0',
      purchase_user_email: '',
      purchase_date_confirm: null,
      purchase_statuses: [],
      statuses: [],
    });
    this.collection.add(newModel);
    var newView = new App.Views.SpecificationMaterialItemView({
      model: newModel,
      groupBy: this.groupBy,
      parentView: this,
      materialInfo: this.materialsDict[newModel.get('materials_id')],
      index: 1000,
    });
    // отрисовка на форме
    itemView.$el.after(newView.render().el);
    // отправлка по цепочке выше событие на добавление нового объекта в общую коллекцию
    $(this.el).trigger('material:add', [this, newModel]);
  },

  /**
   * Bulk paste data
   */
  onPasteDataFrom: function(e) {
    var self = this;
    var dlg = new App.Views.DataInsertDialogView({ model: {} });
    dlg.on('dialogsave', function(e) {
      var data = self.getDataByPage(self.collection.models, self.currentPage);
      var j = 0;
      for (var i in data) {
        if (j > e.values.length - 1) break;

        var row = data[i];
        // в расчете
        if (row.get('status') === '0') {
          row.set('pto_size', e.values[j]);
          j++;
        }
      }
    });
  },
});

///---------------------------------------------------------------------------------------------------------
/// Представление элемента материала
///---------------------------------------------------------------------------------------------------------
App.Views.SpecificationMaterialItemView = Backbone.View.extend({
  className: 'item',
  tagName: 'tr',
  groupBy: null,
  parentView: null,
  materialInfo: null,
  templates: {
    template: _.template($('#SpecificationMaterialItemTemplate').html()),
  },
  events: {
    'change .status select': 'onStatusChange',
    'change input.note': 'onNoteChange',
    'blur input.note': 'onNoteChange',
    'change input.allowance': 'onAllowanceChange',
    'change input.value': 'onValueChange',
    'click .lnk-clone': 'onCopyMaterial',
    'click .lnk-remove': 'onRemoveMaterial',
    'click .lnk-note': 'onClickNote',
  },
  initialize: function() {
    this.groupBy = this.options.groupBy;
    this.parentView = this.options.parentView;
    this.materialInfo = this.options.materialInfo;
    this.index = this.options.index;
    // ----
    this.model.on('change:pto_size', this.render, this);
  },
  clear: function() {
    this.$el.empty();
  },
  render: function() {
    var self = this;

    // check on extended rights by global function - has_access
    var extended_user = has_access('plannorm', 'o');
    var can_edit =
      (this.model.get('status') != '3' &&
        this.model.get('status') != '2' &&
        this.model.get('status') != '1') ||
      extended_user;

    // get all active unique props from material
    /*var unique_props_arr = (this.materialInfo['unique_props'] || []).filter(
      function(x){ return x['is_active'] }
    );*/
    var unique_props_arr = this.materialInfo['unique_props'] || [];

    this.$el.html(
      this.templates.template(
        $.extend({}, this.model.toJSON(), {
          index: this.index,
          groupBy: this.groupBy,
          materialInfo: this.materialInfo,
          can_edit: can_edit,
          extended_user: extended_user,
        }),
      ),
    );

    // add multiselect to props
    var ddl = this.$('.ddl-unique-props');
    var material_all_unique_props = {};
    for (var i in unique_props_arr)
      material_all_unique_props[unique_props_arr[i]['key'].toString()] =
        unique_props_arr[i];

    ddl.multiselect({
      buttonContainer: '<span class="dropdown" />',
      includeSelectAllOption: false,
      enableCaseInsensitiveFiltering: true,
      numberDisplayed: 100,
      filterPlaceholder: 'Найти',
      nonSelectedText: 'Выбрать',
      nSelectedText: '',
      selectAllText: 'Все',
      maxHeight: 200,
      maxWidth: 200,
      buttonClass: 'btn btn-link',
      buttonText: function(options) {
        if (options.length === 0) return 'Не заданы';
        else if (options.length > this.numberDisplayed)
          return 'Выбрано ' + options.length + '  характеристик';
        else {
          var selected = '';
          options.each(function() {
            selected += $(this).data('name') + '; ';
          });
          return selected.substr(0, selected.length - 2);
        }
      },
      onChange: function(element, checked) {
        if ($(element).val()) {
          var prop_info = material_all_unique_props[$(element).val()];
          self.model.set('unique_props_info', prop_info);
        } else self.model.set('unique_props_info', null);
        self.render();
      },
    });

    // add background color according the selected status
    for (var i = 0; i < 7; i++) this.$el.removeClass('status_' + i.toString());
    this.$el.addClass('status_' + this.model.get('status'));

    // add mask on diggit fields
    this.$('input.value').numeric({
      negative: false,
      decimal: ',',
      altDecimal: '.',
    });
    this.$('input.allowance').numeric({
      negative: false,
      decimal: ',',
      altDecimal: '.',
    });

    if (this.model.get('blink')) {
      this.model.set('blink', false);
      this.blink();
    }
    return this;
  },

  onClickNote: function(e) {
    this.$('.lnk-note').hide();
    this.$('.tb-note')
      .show()
      .focus();
  },

  /**
   * Treatment status change
   */
  onStatusChange: function(e) {
    var new_status = e.currentTarget.value;
    // check on status and empty volume
    if (new_status != '5' && new_status != '0' && !this.model.get('pto_size'))
      $.jGrowl('Необходимо задать объем материалу.', {
        themeState: 'growl-error',
        sticky: false,
        life: 5000,
      });
    else this.model.set({ status: new_status });
    this.render();
  },

  /**
   * Treatment note change
   */
  onNoteChange: function(e) {
    this.model.set({ note: e.currentTarget.value.toString() });

    var new_note = Routine.stripTags(e.currentTarget.value.toString());
    this.$('.lnk-note').html(new_note ? new_note : 'Не задано');
    this.$('.lnk-note').show();
    this.$('.tb-note').hide();
  },

  /**
   * Treatment allowance change
   */
  onAllowanceChange: function(e) {
    this.model.set({ allowance: Routine.strToFloat(e.currentTarget.value) });
  },

  /**
   * Treatment value change
   */
  onValueChange: function(e) {
    var value = Routine.strToFloat(e.currentTarget.value);
    if (
      value == 0 &&
      (this.model.get('status') != '0' && this.model.get('status') != '5')
    ) {
      $.jGrowl('При данном статусе объем не может быть пустым.', {
        themeState: 'growl-error',
        sticky: false,
        life: 5000,
      });
      this.render();
      return;
    }
    this.model.set({ pto_size: value }, { silent: true });
  },

  /**
   * Copy material
   */
  onCopyMaterial: function(e) {
    var self = this;
    $(self.el).trigger('material:copy', [self, self.model]);
    // bootbox.confirm('Создать копию материала?', function(result) {
    //   if (result) $(self.el).trigger('material:copy', [self, self.model]);
    // });
  },

  /**
   * Highlight element by yellow color
   */
  blink: function() {
    var self = this;
    this.$el.addClass('yellow');
    setTimeout(function() {
      self.$el.removeClass('yellow');
    }, 2000);
  },

  /**
   * Remove material
   */
  onRemoveMaterial: function(e) {
    var self = this;
    bootbox.confirm('Материал будет удален из расчетов. Продолжить?', function(
      result,
    ) {
      if (result) {
        if (!self.model.get('_id')) {
          self.model.destroy();
          self.$el.remove();
        }
        {
          self.model.set({ status: '-1' });
          self.$el.remove();
        }
        $(self.el).trigger('material:remove', [self.model]);
      }
    });
  },
});
