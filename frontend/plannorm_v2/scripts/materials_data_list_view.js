///---------------------------------------------------------------------------------------------------------
/// представление формы справочника материалов
///---------------------------------------------------------------------------------------------------------
App.Views.MaterialsDataListViewContainer = Backbone.View.extend({
  lastSelectedItem: null, // последний выделенный элемент в списке
  el: '#materials-data-body-container',
  templates: {
    not_found_template: _.template($('#DataNotFoundTemplate').html()),
    set_search_query_template: _.template($('#SetSearchQueryTemplate').html()),
    template: _.template($('#MaterialsDataListTemplate').html()),
    //-data templates----------------------------
    sector_item_template: _.template(
      Routine.trim($('#SectorItemTemplate').html()),
    ),
    category_item_template: _.template(
      Routine.trim($('#CategoryItemTemplate').html()),
    ),
    group_item_template: _.template(
      Routine.trim($('#GroupItemTemplate').html()),
    ),
  },
  events: {
    'click .cb-item': 'onClickPlus',
    'click .lbl-item': 'onClickitem',
    'click .lnk-add-material': 'onAddMaterial',
    'click #show-not-standart-materials': 'onShowNotStandartMaterials',
    on_line_filter: 'onLineFilter',
  },
  openedItems: {}, // список идентификаторов элементов, которые необходимо раскрыть
  collapsed: false, // глобальный флаг текущего состояния
  groupBy: [], // по кому ведется группировка
  filterLineQuery: '', // значение строки поиска по материалам
  modes: { view: 'view', edit: 'edit' }, // режима работы формы (список материалов; редактирвоание материала)
  mode: 'view', // режим по умолчанию
  showNotStandartMaterials: 'no', // Показвать нестандартные материалы. (Да/Нет)

  /**
   * Инициализация
   */
  initialize: function() {
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
    // глобальное событие применения фильтров
    Backbone.on('global:apply_filters', this.onApplyFilters, this);
    // глобальное событие выхода из режима редактирования не стандартного материала
    Backbone.on(
      'global:on_material_edit_cancel',
      this.OnCloseMaterialsEditorClick,
      this,
    );
    // глобальное событие завершения сохранения нестандартного материала
    Backbone.on(
      'global:on_material_save_complete',
      this.OnMaterialSaveComplete,
      this,
    );

    // событие на редактирование материала
    Backbone.on('MaterialItemView:on_edit_material', this.onEditMaterial, this);
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
   * Изменить
   */
  setMode: function(value) {
    this.mode = value;
    switch (this.mode) {
      case this.modes.view:
        this.$('.controls-line-container').show();
        this.$('.css-treeview').show();
        this.$('.pnl-search-box').show();
        this.$('.edit-material-container').hide();
        break;
      case this.modes.edit:
        this.$('.controls-line-container').hide();
        this.$('.css-treeview').hide();
        this.$('.pnl-search-box').hide();
        this.$('.edit-material-container').show();
        break;
      default:
        this.$('.controls-line-container').show();
        this.$('.css-treeview').show();
        this.$('.pnl-search-box').show();
        this.$('.edit-material-container').hide();
        break;
    }
  },

  /**
   * Показать нестандартные материалы
   */
  onShowNotStandartMaterials: function(e) {
    this.showNotStandartMaterials = $(e.currentTarget).prop('checked')
      ? 'yes'
      : 'no';
    Backbone.trigger('global:on_url_params_change', [
      this,
      'show_not_standart_materials',
      this.showNotStandartMaterials,
      false,
    ]);
    this.render();
  },

  /**
   * Обработка кнопки добавления нестандартного материала
   */
  onAddMaterial: function(e) {
    var self = this;
    bootbox.confirm(
      'Вы добавляете нестандартный материал. Продолжить?',
      function(result) {
        if (result) {
          App.getDataForMaterialEditForm('new', function(
            materialInfo,
            materialsGroups,
            materialsSectors,
            materialsUnits,
            materialsLabels,
          ) {
            // change mode
            self.setMode(self.modes.edit);
            // add edit material form
            var AddMaterialView = new App.Views.EditMaterialView({
              type: 'not_standart',
              edit: true,
              model: new App.Models.MaterialItemModel(materialInfo, {
                parse: true,
              }),
              Materials_Units: materialsUnits,
              sectors: materialsSectors,
              materials_groups: materialsGroups,
              materials_labels: materialsLabels,
            });
            self.$el
              .find('.edit-material-container')
              .html(AddMaterialView.render().el);
          });
        }
      },
    );
  },

  /**
   * Обработка кнопки редактирования нестандартного материала
   */
  onEditMaterial: function(e) {
    var self = this;
    // получить все необходимые данные для формы добавления нового матеиала
    App.getDataForMaterialEditForm(e[0].get('material_id'), function(
      materialInfo,
      materialsGroups,
      materialsSectors,
      materialsUnits,
      materialsLabels,
    ) {
      // change mode
      self.setMode(self.modes.edit);
      // add edit material form
      var EditMaterialView = new App.Views.EditMaterialView({
        type: 'not_standart',
        edit: true,
        model: new App.Models.MaterialItemModel(materialInfo, { parse: true }),
        Materials_Units: materialsUnits,
        sectors: materialsSectors,
        materials_groups: materialsGroups,
        materials_labels: materialsLabels,
      });
      self.$el
        .find('.edit-material-container')
        .html(EditMaterialView.render().el);
    });
  },

  /**
   * Обработка события клика на кнопку отмены редактирования материала
   */
  OnCloseMaterialsEditorClick: function() {
    this.setMode(this.modes.view);
  },

  /**
   * Обработка события завершения сохранения нестандартного материала
   */
  OnMaterialSaveComplete: function(e) {
    Routine.showLoader();
    var operation_type = e[1];
    var new_material_info = e[2];
    // смена режима отображения
    this.setMode(this.modes.view);
    // Обрабокта и добавление нового материала на форму
    if (operation_type == 'add') {
      App.addNewMaterial(new_material_info);
      // заполнение поля поиска материала, чтобы сразу отобразить добавленный
      this.searchLineView.setQuery(new_material_info['name']);
    } else {
      App.addNewMaterial(new_material_info);
      this.render();
    }
    Routine.hideLoader();
  },

  /**
   * Очистка формы
   */
  clear: function() {
    this.openedItems = {};
    this.$el.empty();
    this.show();
  },

  build: function(data) {
    this.groupBy = data.group_by;
    this.groups = data.groups;
    this.filterLineQuery = data.filterLineQuery;
    if (data.need_collapse) this.collapsed = true;
    this.showNotStandartMaterials = data.showNotStandartMaterials || 'no';
    this.render();
  },

  /**
   * отрисовка
   */
  render: function() {
    this.show();

    // если нет данных на отображение
    if (this.collection.length == 0) {
      this.$el.html(this.templates.not_found_template({}));
      return this;
    }

    this.collection.sortBy(
      'sector_routine',
      'sector_name',
      'category_routine',
      'category_name',
      'group_routine',
      'group_name',
      'material_name',
      //"material_group_code",
      //"material_code"
    );

    // отрисовка основного шаблона
    this.$el.html(
      this.templates.template({
        showNotStandartMaterials: this.showNotStandartMaterials,
      }),
    );

    // добавление строки поиска
    this.searchLineView = new App.Views.SearchLineView({
      model: {
        note:
          'Введите артикул или название материала. Пример: "1.35" или "труба профильная"',
        query: this.filterLineQuery,
      },
    });
    this.$('.css-treeview').prepend(this.searchLineView.render().el);

    // фильтрация основных данных
    var filtered_data = this.filterAllData(
      this.collection,
      this.groups,
      this.showNotStandartMaterials,
    );
    // отрисовка данных
    this.renderAllData(filtered_data, this.groupBy);
    // раскрть ветки, которые ранее раскрывал пользователь руками
    this.openHandCollapsedItems();
  },

  /**
   * Фильтрация данных по заданным параметрам
   * groups - список ID групп
   */
  filterAllData: function(collection, groups, showNotStandartMaterials) {
    var result = [];
    var groups_ids = null;
    if (groups && groups.length > 0) {
      groups_ids = {};
      for (var i in groups) groups_ids[groups[i].toString()] = groups[i];
    }

    for (var i in collection.models) {
      var model = collection.models[i];
      if (
        model.get('is_active') === 1 &&
        (!groups_ids ||
          (groups_ids &&
            model.get('group_id') &&
            model.get('group_id').toString() in groups_ids)) &&
        (!this.filterLineQuery ||
          Routine.isStringContains(
            model.get('full_key') + model.get('material_name'),
            this.filterLineQuery,
          )) &&
        (this.showNotStandartMaterials === 'yes' ||
          model.get('material_type') !== 'not_standart')
      )
        result.push(model);
    }
    return result;
  },

  /**
   * Группировка данных
   */
  groupData: function(data, selected_groups) {
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
      return result['items'];
    } else return data;
  },

  /**
   * Отрисовка и фильтрация данных с учетом группировок
   * data - array of models
   * selected_groups - порядок группировки
   */
  renderAllData: function(data, selected_groups) {
    var self = this;
    var new_data = [];

    // удаляем зафиксированный хидер, если такой есть
    if (this.dTable) this.dTable.fixedHeader.disable();

    // если нужна группировка
    if (selected_groups && selected_groups.length > 0) {
      this.dTable = null;
      // группировка основноых данных
      var prepeared_data = this.groupData(data, selected_groups);
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
    var itemsView = new App.Views.MaterialsDataListView({
      collection: new App.Collections.MaterialsDataCollection(data),
      groupBy: this.groupBy,
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
      'materials_search_line',
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
      $('body').removeClass('wait');
    }, 150);
  },

  /**
   * Очитка всех фильтров
   */
  cancelData: function(obj) {},
});

///---------------------------------------------------------------------------------------------------------
/// Представление списка материалов
///---------------------------------------------------------------------------------------------------------
App.Views.MaterialsDataListView = Backbone.View.extend({
  className: 'in-info main-data',
  tagName: 'table',
  groupBy: null, // список полей по которым идет группировка
  needPager: false,
  pagerView: null, // представление пейджера
  currentPage: 1,
  itemsOnPage: 50,
  templates: {
    material_list_items_template: _.template(
      $('#MaterialsListTemplate').html(),
    ),
    material_list_footer_template: _.template(
      $('#MaterialsListFooterTemplate').html(),
    ),
  },
  events: {
    'pager:change_page': 'onChangePage',
  },

  initialize: function() {
    this.groupBy = this.options.groupBy;
    this.needPager = false || this.options.needPager;
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
    var pagesCount = this.calculatePagesCount(this.collection.models.length);
    var data = this.getDataByPage(this.collection.models, this.currentPage);

    for (var i in data) {
      var row = data[i];
      var itemView = new App.Views.MaterialItemView({
        model: row,
        groupBy: this.groupBy,
        parentView: this,
      });
      // отрисовка на форме
      $(materials_container).append(itemView.render().el);
    }
    // добавление футера с итоговыми объемами
    $(materials_container).after(
      $(Routine.trim(this.templates.material_list_footer_template({}))),
    );
    if (this.needPager) {
      this.pagerView = new App.Views.PagerView({
        el: this.$el.find('.list-pager'),
      });
      this.pagerView.render(this.currentPage, pagesCount);
    }
    return this;
  },

  onChangePage: function(e, page) {
    this.currentPage = page;
    this.render();
    this.$el[0].scrollIntoView(true);
  },
});

///---------------------------------------------------------------------------------------------------------
/// Представление элемента материала
///---------------------------------------------------------------------------------------------------------
App.Views.MaterialItemView = Backbone.View.extend({
  className: 'item',
  tagName: 'tr',
  groupBy: null,
  parentView: null,
  templates: {
    template: _.template($('#MaterialItemTemplate').html()),
    linked_materials: _.template($('#LinkedMaterialsListTemplate').html()),
  },
  events: {
    'click .lnk-add-to-calculate': 'onAddToCalculate',
    'click .lnk-remove-from-calculate': 'onRemoveFromCalculate',
    'click .lnk-edit-material': 'onEditMaterial',
  },
  initialize: function() {
    this.parentView = this.options.parentView;
    this.groupBy = this.options.groupBy;
  },
  clear: function() {
    this.$el.empty();
  },
  render: function() {
    this.$el.html(
      this.templates.template(
        $.extend({}, this.model.toJSON(), { groupBy: this.groupBy }),
      ),
    );
    if (this.model.get('in_calculate')) this.$el.addClass('active');
    if (this.model.get('material_type') === 'not_standart')
      this.$el.addClass('not-standart');

    return this;
  },

  /**
   * Обработка события клика на редактирвоание материала
   */
  onEditMaterial: function(e) {
    Backbone.trigger('MaterialItemView:on_edit_material', [this.model]);
  },

  /**
   * Add material to specification
   */
  onAddToCalculate: function(e) {
    var self = this;
    self.$el.addClass('active');
    self.model.set({ in_calculate: true });
    self.render();
    App.addNewMaterialToCalculation(this.model, function(res) {
      // if something wrong then return initial state
      if (!res) {
        self.$el.removeClass('active');
        self.model.set({ in_calculate: false });
        self.render();
      }
    });

    // show linked materials
    if (
      self.model.get('linked_materials') &&
      self.model.get('linked_materials').length > 0
    ) {
      bootbox.alert({
        title: 'Внимание! У данного материала есть связанные материалы.',
        message: this.templates.linked_materials(
          this.model.get('linked_materials'),
        ),
      });
    }
  },

  /**
   * Remove material from specification
   */
  onRemoveFromCalculate: function(e) {
    var self = this;
    bootbox.confirm(
      'Рачеты по данному материалу будут удалены. Продолжить?',
      function(result) {
        if (result) {
          self.model.set({ in_calculate: false });
          self.render();
          self.$el.removeClass('active');
          App.removeMaterialFromCalculation(
            self.model.get('material_id'),
            self.model.get('category_id'),
            self.model.get('group_id'),
            function(res) {
              // if something wrong then return initial state
              if (!res) {
                self.model.set({ in_calculate: true });
                self.render();
                self.$el.addClass('active');
              }
            },
          );
        }
      },
    );
  },
});
