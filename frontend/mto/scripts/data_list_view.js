///---------------------------------------------------------------------------------------------------------
/// представление формы списка данных
///---------------------------------------------------------------------------------------------------------
App.Views.DataListView = Backbone.View.extend({
  filter_works: null, // фильтр по работам
  lastSelectedItem: null, // последний выделенный элемент в списке
  el: '#data-body-container',
  table_filters: {}, // фильтры и сортировки с табличного представления всех данных
  templates: {
    not_found_template: _.template($('#DataNotFoundTemplate').html()),
    set_search_query_template: _.template($('#SetSearchQueryTemplate').html()),
    template: _.template($('#DataListTemplate').html()),
    //-materials----------------------------
    order_item_template: _.template($('#OrderItemTemplate').html()),
    sector_item_template: _.template($('#SectorItemTemplate').html()),
    material_group_item_template: _.template(
      $('#MaterialGroupItemTemplate').html(),
    ),
    material_list_items_template: _.template(
      $('#MaterialsListTemplate').html(),
    ),
    material_list_footer_template: _.template(
      $('#MaterialsListFooterTemplate').html(),
    ),
    material_item_template: _.template($('#MaterialItemTemplate').html()),
    //-comments---------------------------
    comments_list_items_template: _.template($('#CommentsListTemplate').html()),
  },
  events: {
    'click .cb-item': 'onClickPlus',
    'click .lbl-item': 'onClickitem',
  },
  openedItems: {}, // список идентификаторов объектов, которые необходимо раскрыть
  collapsed: false, // глобальный флаг текущего состояния
  viewType: 'volumes', // вид отображения объемы/стоимости
  selectedGroups: [], // выбранные позиции по которым ведется группировка данных
  defaultColumns: [
    'order_number',
    'material_group_key',
    'material_key',
    'material_name',
    'unique_props_name',
    'note',
    'unit_pto',
    'pto_size',
    'price',
    'pto_size_confirmed',
    'inpay',
    'payed',
    'onstore',
    'onwork',
    'not_onwork',
    'not_payed',
  ],
  /**
   * Инициализация
   **/
  initialize: function() {
    // задаем коллекцию всех коментов
    this.comments_collection = this.options['comments'];
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
    Backbone.on('global:on_change_view_type', this.onChangeViewType, this);
  },

  /**
   * Функция получения табличных фильтров
   */
  getTableFilters: function() {
    return this.table_filters ? JSON.stringify(this.table_filters) : '{}';
  },

  /**
   * Функция сохранения табличных фильтров
   */
  setTableFilters: function(table_filters) {
    this.table_filters = table_filters;
  },

  /**
   * Обработка глобавльного события смены вида отображения данных: объемы / стоимости.
   **/
  onChangeViewType: function(e) {
    var self = this;
    // сохранение вида отображения
    this.viewType = e[1];
    // рендеринг данных
    $('body').addClass('wait');
    setTimeout(function() {
      self.render();
      $('body').removeClass('wait');
    }, 150);
  },

  /**
   * Обработка глобавльного события фолдинга
   **/
  onGlobalCollapse: function(e) {
    this.collapse(e[1]);
  },
  /**
   * Раскрыть/свернуть дерево
   **/
  collapse: function(val) {
    this.collapsed = val;
    this.$el.find('.cb-item').prop('checked', val);
  },

  /**
   * Обработка раскрытия/сокрытия узлов дерева
   **/
  onClickPlus: function(e) {
    var self = this;
    this.openedItems[$(e.currentTarget).prop('id')] = $(e.currentTarget).prop(
      'checked',
    );
  },

  /**
   * Обработка клика по любому элементу в списке
   **/
  onClickitem: function(e) {
    this.$('.lbl-item').removeClass('selected');
    $(e.currentTarget).addClass('selected');
    this.lastSelectedItem = $(e.currentTarget);
  },

  /**
   * Очистка формы
   **/
  clear: function() {
    this.openedItems = {};
    this.$el.empty();
  },

  /**
   * отрисовка
   **/
  render: function(selected_groups, selected_columns, need_collapse, viewType) {
    if (selected_groups) this.selectedGroups = selected_groups;
    if (selected_columns) this.selectedColumns = selected_columns;
    if (viewType) this.viewType = viewType;
    // если нет данных на отображение
    if (this.collection.length == 0) {
      this.$el.html(this.templates.not_found_template({}));
      return this;
    }
    if (need_collapse) this.collapsed = true;

    // сортировка  данных для дальнейшей группировки
    if (this.selectedGroups && this.selectedGroups.length > 0)
      this.collection.sortBy(this.selectedGroups);

    this.$el.html(this.templates.template({}));
    // фильтрация основных данных
    var filtered_data = this.filterAllData(this.collection, [], []);
    // фильтрация коментов
    var filtered_comments = this.filterAllData(
      this.comments_collection,
      [],
      [],
    );
    // отрисовка данных
    this.renderAllData(
      filtered_data,
      filtered_comments,
      this.selectedGroups,
      this.selectedColumns,
    );
    // раскрть ветки, которые ранее раскрывал пользователь руками
    this.openHandCollapsedItems();
  },

  /**
   ** Фильтрация данных по заданным параметрам
   **/
  filterAllData: function(collection, sectors, materials_groups) {
    var result = [];
    var tmp_sectors_keys = null;
    var tmp_materials_groups_keys = null;
    if (sectors && sectors.length > 0) {
      tmp_sectors_keys = {};
      for (var i in sectors)
        tmp_sectors_keys[sectors[i].toString()] = sectors[i];
    }
    if (materials_groups && materials_groups.length > 0) {
      tmp_materials_groups_keys = {};
      for (var i in materials_groups)
        tmp_materials_groups_keys[materials_groups[i].toString()] =
          materials_groups[i];
    }

    for (var i in collection.models) {
      var model = collection.models[i];
      if (
        (!tmp_sectors_keys ||
          (tmp_sectors_keys &&
            model.get('sector_code').toString() in tmp_sectors_keys)) &&
        (!tmp_materials_groups_keys ||
          (tmp_materials_groups_keys &&
            model.get('material_group_key') &&
            model.get('material_group_key').toString() in
              tmp_materials_groups_keys))
      )
        result.push(model);
    }
    return result;
  },

  /**
   ** Группировка данных
   **/
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
              case 'order_number':
                number = dr.get('order_number');
                name = dr.get('product_name');
                break;
              case 'sector_code':
                number = dr.get('sector_code');
                name = dr.get('sector_name');
                break;
              case 'material_group_key':
                number = dr.get('material_group_key');
                name = dr.get('material_group_name');
                break;
            }
            d_res[dr.get(gk)] = {
              items: {},
              group_key: gk,
              number: number,
              name: name,
              index: _.size(d_res),
              level_with_data: false,
              comments: null,
            };
            if (selected_groups.length - 1 == gk_i) {
              //d_res[dr.get(gk)]['items'] = [dr.toJSON()];
              d_res[dr.get(gk)]['items'] = [dr];
              d_res[dr.get(gk)]['level_with_data'] = true;
              d_res[dr.get(gk)]['comments'] = [];
            }
            d_res = d_res[dr.get(gk)]['items'];
          }
        }
      }
      return result['items'];
    } else return data;
  },

  /**
   ** Схлопывание участков
   ** Хак, так делать нельзя, если понадобитсья редактрование данных, то этот вариант не пройдет
   **/
  mergeSectorsData: function(data) {
    var result = [];
    var tmp_data = {};
    data = JSON.parse(JSON.stringify(data));
    for (var i in data) {
      //var row = data[i].toJSON();
      //var row = JSON.parse(JSON.stringify(data[i]));
      var row = data[i];
      var key =
        row['order_number'] +
        '_' +
        row['material_group_key'] +
        '_' +
        row['material_key'] +
        '_' +
        row['unique_props_key'];
      if (key in tmp_data) {
        // суммирование плановых объемов
        tmp_data[key]['pto_size'] += row['pto_size'];
        if (row['facts']) {
          // суммирование фактов
          if (!tmp_data[key]['facts']['inpay'])
            tmp_data[key]['facts']['inpay'] = 0;
          if (!tmp_data[key]['facts']['payed'])
            tmp_data[key]['facts']['payed'] = 0;
          if (!tmp_data[key]['facts']['onstore'])
            tmp_data[key]['facts']['onstore'] = 0;
          if (!tmp_data[key]['facts']['onwork'])
            tmp_data[key]['facts']['onwork'] = 0;
          tmp_data[key]['facts']['inpay'] += Routine.strToFloat(
            row['facts']['inpay'],
          );
          tmp_data[key]['facts']['payed'] += Routine.strToFloat(
            row['facts']['payed'],
          );
          tmp_data[key]['facts']['onstore'] += Routine.strToFloat(
            row['facts']['onstore'],
          );
          tmp_data[key]['facts']['onwork'] += Routine.strToFloat(
            row['facts']['onwork'],
          );
        }
      } else tmp_data[key] = row;
    }

    for (var i in tmp_data) result.push(tmp_data[i]);
    return new App.Collections.DataCollection(result).models;
  },

  /**
   * Мержинг данных с коментариями
   * filter_items - набор ключей по котороым необходимо отфильтровать коменты

  */
  mergeDataWithComments: function(data, comments, filter_items) {
    // локальная функция фильтрации коментов по группам
    function filterComments(comments, filter_items) {
      var res = comments.slice();
      for (var i in filter_items) {
        switch (filter_items[i]['group_key']) {
          case 'order_number':
            var search_val =
              filter_items[i]['number'].split('.')[0] +
              '.' +
              filter_items[i]['number'].split('.')[1];
            res = res.filter(function(comment) {
              return comment.get('order_number') == search_val;
            });
            break;
          case 'sector_code':
            res = res.filter(function(comment) {
              return comment.get('sector_code') == filter_items[i]['number'];
            });
            break;
          case 'material_group_key':
            res = res.filter(function(comment) {
              return comment.get('group_key') == filter_items[i]['number'];
            });
            break;
        }
      }
      return res;
    }
    //------
    var new_filter_items = filter_items.slice();
    new_filter_items.push({
      group_key: data['group_key'],
      number: data['number'],
      name: data['name'],
    });
    if (data['level_with_data']) {
      // фильтруем комментарии по пришедшим фильтрам
      // добавляем результат основные данные
      data['comments'] = filterComments(comments, new_filter_items);
    } else {
      for (var i in data['items'])
        this.mergeDataWithComments(
          data['items'][i],
          comments,
          new_filter_items,
        );
    }
  },

  /**
   * Показать/скрыть колонки данных
   * @param  {[type]} selected_columns [description]
   * @return {[type]}                  [description]
   */
  visibleColumns: function(selected_columns) {
    var self = this;
    // отображение только указанных колонок
    if (selected_columns) {
      var columns_to_hide = [];
      var columns_to_show = [];

      for (var i in this.defaultColumns) {
        if (selected_columns.indexOf(this.defaultColumns[i]) > -1) {
          if (!this.dTable)
            this.$el
              .find('.main-data')
              .find('.' + this.defaultColumns[i])
              .show();
          else if (this.dTable && !this.dTable.columns(i).visible()[0]) {
            this.dTable.columns(i).visible(true);
          }
        } else {
          if (!this.dTable)
            this.$el
              .find('.main-data')
              .find('.' + this.defaultColumns[i])
              .hide();
          else if (this.dTable && this.dTable.columns(i).visible()[0]) {
            this.dTable.columns(i).visible(false);
          }
        }
      }
    }
  },

  /**
   ** Отрисовка и фильтрация данных с учетом группировок
   ** data - array of models
   ** selected_groups - порядок группировки
   **/
  renderAllData: function(data, comments, selected_groups, selected_columns) {
    var self = this;
    var new_data = [];

    //--------------------------------------------------------------
    // если среди групп нет участка, то его надо схлопнуть, т.е просуммировать
    // объемы повторяющихся материалов на разных участках в рамках заказа
    // это хак, так делать нельзя, потомучто мы посути портим объемы материалов, суммируя их друг с другом
    if (
      !selected_groups ||
      selected_groups.length == 0 ||
      selected_groups.indexOf('sector_code') < 0
    )
      data = this.mergeSectorsData(data);
    //---------------------------------------------------------------

    // удаляем зафиксированный хидер, если такой есть
    if (this.dTable) this.dTable.fixedHeader.disable();

    // если нужна группировка
    if (selected_groups && selected_groups.length > 0) {
      this.dTable = null;
      // группировка основноых данных
      var prepeared_data = this.groupData(data, selected_groups);
      // мерж данных с коментами
      for (var i in prepeared_data)
        this.mergeDataWithComments(prepeared_data[i], comments, []);
      // отрисовка данных
      this.renderGroupedData(
        prepeared_data,
        $(this.$el.find('.data-list')),
        '0',
        0,
      );
      // скрыть колонки, по которым есть группировка
      /*for(var i in selected_groups)
        this.$el.find('.'+selected_groups[i]).hide();*/

      // отображение только указанных колонок
      if (selected_columns) {
        for (var i in self.defaultColumns)
          if (selected_columns.indexOf(self.defaultColumns[i]) > -1)
            this.$el
              .find('.main-data')
              .find('.' + self.defaultColumns[i])
              .show();
          else
            this.$el
              .find('.main-data')
              .find('.' + self.defaultColumns[i])
              .hide();
      }
    } else {
      // отрисовать  коменты
      this.renderCommentsList(comments, this.$el.find('.data-list'));
      // отрисовать основные данные
      this.renderMaterialsList(data, this.$el.find('.data-list'));
      // навешиваем datatable на данные и фильтры
      //------------------------------------------------------
      // add jquery datatables
      // .dropdown-menu

      // переопределение сортировки на поле с форматом даты
      jQuery.extend(jQuery.fn.dataTableExt.oSort, {
        'uk_digit-pre': function(a) {
          if (a == null || a == '' || a == '-') return 0;
          return Routine.strToFloat(a);
        },
        'uk_digit-asc': function(a, b) {
          return a < b ? -1 : a > b ? 1 : 0;
        },
        'uk_digit-desc': function(a, b) {
          return a < b ? 1 : a > b ? -1 : 0;
        },
      });

      this.dTable = this.$('.main-data')
        .css('margin-bottom', '300px')
        .DataTable({
          retrieve: true,
          fixedHeader: {
            header: true,
          },
          events: {},
          tableEvents: [],
          bPaginate: false,
          info: false,
          searching: true,
          order:
            self.table_filters && 'order_by' in self.table_filters
              ? self.table_filters['order_by']
              : [],
          /*"columnDefs": [ {
          "targets"  : 'no-sort',
          "orderable": false,
        }],*/
          columnDefs: [
            {},
            {},
            {},
            {},
            {},
            {},
            {},
            { type: 'uk_digit', targets: 7 },
            { type: 'uk_digit', targets: 8 },
            { type: 'uk_digit', targets: 9 },
            { type: 'uk_digit', targets: 10 },
            { type: 'uk_digit', targets: 11 },
            { type: 'uk_digit', targets: 12 },
            { type: 'uk_digit', targets: 13 },
            { type: 'uk_digit', targets: 14 },
            { type: 'uk_digit', targets: 15 },
          ],

          footerCallback: function(row, data, start, end, display) {
            var api = this.api();
            api
              .columns('.sum', {
                page: 'current',
              })
              .every(function() {
                var sum = this.data().reduce(function(a, b) {
                  var x = Routine.strToFloat(a) || 0;
                  var y = Routine.strToFloat(b) || 0;
                  return x + y;
                }, 0);
                $(this.footer()).html(
                  Routine.addCommas(sum.toFixed(3).toString(), ' '),
                );
              });
          },
          disableEvents: function(thead) {
            $(thead)
              .find('th')
              .unbind();
          },
          enableEvents: function(thead) {
            var events = this.tableEvents;
            $(thead)
              .find('th')
              .each(function(i) {
                $(this).unbind();
                for (var name in events[i]) $(this).bind(name, events[i][name]);
              });
          },
          init: function() {
            this.tableEvents = [];
          },
          initComplete: function() {
            var ctrl = this.api().init();
            // store all original events
            var tableEvents = [];
            this.api()
              .columns()
              .every(function(i) {
                var events = {};
                var th = $(this.header());
                $.each($._data(th[0], 'events'), function(name, obj) {
                  events[name] = obj[0];
                });
                tableEvents.push(events);
              });
            this.api().init().tableEvents = tableEvents;

            // processing all columns
            this.api()
              .columns()
              .every(function() {
                var column = this;
                var columnName = $(column.header())
                  .find('span')
                  .html();
                if (!$(column.header()).html()) return;
                var select = $(
                  '<select multiple="multiple" class = "filter-select"></select>',
                ).appendTo($(column.header()));
                column
                  .data()
                  .unique()
                  .sort()
                  .each(function(d, j) {
                    var selected =
                      self.table_filters &&
                      columnName in self.table_filters &&
                      self.table_filters[columnName].indexOf(d) > -1
                        ? 'selected'
                        : '';
                    select.append(
                      '<option ' +
                        selected +
                        ' value="' +
                        d +
                        '">' +
                        d +
                        '</option>',
                    );
                  });

                // фильтрация данных в таблице
                var have_selected_filters = false;
                if (
                  self.table_filters &&
                  columnName in self.table_filters &&
                  self.table_filters[columnName].length > 0
                ) {
                  have_selected_filters = true;

                  var searchString = self.table_filters[columnName]
                    .map(function(f_name) {
                      return Routine.regEscape(f_name);
                    })
                    .join('|');
                  // var searchString = self.table_filters[columnName].join('|');
                  //
                  // filterBtn.addClass('active');
                  column
                    .search(
                      searchString === null ? '' : '^(' + searchString + ')$',
                      true,
                      false,
                    )
                    .draw();
                }

                // convert drop down to multiselect
                $(select).multiselect({
                  buttonContainer: '<span class="dropdown" />',
                  includeSelectAllOption: true,
                  enableCaseInsensitiveFiltering: true,
                  numberDisplayed: 0,
                  filterPlaceholder: 'Найти',
                  nonSelectedText: columnName,
                  nSelectedText: columnName + ': ',
                  selectAllText: 'Все',
                  maxHeight: 300,
                  buttonClass: '',
                  templates: {
                    button:
                      '<span class="' +
                      (have_selected_filters ? 'active' : '') +
                      ' lnk-multiselect-filter multiselect-filter multiselect dropdown-toggle" data-toggle="dropdown"><i class="fa fa-filter"></i></span>',
                  },

                  buttonText: function(options) {
                    if (options.length === 0) return columnName;
                    else if (options.length > this.numberDisplayed)
                      return this.nSelectedText + options.length;
                    else {
                      var selected = '';
                      options.each(function() {
                        selected += $(this).val() + ', ';
                      });
                      return selected.substr(0, selected.length - 2);
                    }
                  },
                  onDeselectAll: function() {
                    var selected = [];
                    if (!self.table_filters) self.table_filters = {};
                    self.table_filters[columnName] = selected;
                    // save in url
                    Backbone.trigger('global:on_url_params_change', [
                      self,
                      'table_filters',
                      JSON.stringify(self.table_filters),
                      false,
                    ]);
                    // do filter
                    var searchString = null;
                    var filterBtn = this.$select
                      .parents('.column-data:first')
                      .find('.multiselect-filter');
                    filterBtn.removeClass('active');
                    if (selected.length > 0) {
                      //searchString = Routine.regEscape(selected.join('|'));
                      searchString = selected
                        .map(function(f_name) {
                          return Routine.regEscape(f_name);
                        })
                        .join('|');

                      filterBtn.addClass('active');
                    }
                    column
                      .search(
                        searchString === null ? '' : '^(' + searchString + ')$',
                        true,
                        false,
                      )
                      .draw();
                  },
                  onSelectAll: function() {
                    var selected = [];
                    this.$select.find('option:selected').each(function() {
                      if ($(this).val() != 'multiselect-all')
                        selected.push($(this).val());
                    });

                    if (!self.table_filters) self.table_filters = {};
                    self.table_filters[columnName] = selected;
                    // save in url
                    Backbone.trigger('global:on_url_params_change', [
                      self,
                      'table_filters',
                      JSON.stringify(self.table_filters),
                      false,
                    ]);

                    // do filter
                    var searchString = null;
                    var filterBtn = this.$select
                      .parents('.column-data:first')
                      .find('.multiselect-filter');
                    filterBtn.removeClass('active');
                    if (selected.length > 0) {
                      //searchString = Routine.regEscape(selected.join('|'));
                      searchString = selected
                        .map(function(f_name) {
                          return Routine.regEscape(f_name);
                        })
                        .join('|');

                      filterBtn.addClass('active');
                    }
                    column
                      .search(
                        searchString === null ? '' : '^(' + searchString + ')$',
                        true,
                        false,
                      )
                      .draw();
                  },
                  onChange: function(element, checked) {
                    var selected = [];
                    $(element[0])
                      .parent()
                      .find('option:selected')
                      .each(function() {
                        if ($(this).val() != 'multiselect-all')
                          selected.push($(this).val());
                      });

                    if (!self.table_filters) self.table_filters = {};
                    self.table_filters[columnName] = selected;
                    // save in url
                    Backbone.trigger('global:on_url_params_change', [
                      self,
                      'table_filters',
                      JSON.stringify(self.table_filters),
                      false,
                    ]);

                    // do filter
                    var searchString = null;
                    var filterBtn = $(element[0])
                      .parents('.column-data:first')
                      .find('.multiselect-filter');
                    filterBtn.removeClass('active');
                    if (selected.length > 0) {
                      //searchString = Routine.regEscape(selected.join('|'));
                      searchString = selected
                        .map(function(f_name) {
                          return Routine.regEscape(f_name);
                        })
                        .join('|');

                      filterBtn.addClass('active');
                    }
                    column
                      .search(
                        searchString === null ? '' : '^(' + searchString + ')$',
                        true,
                        false,
                      )
                      .draw();
                  },
                });

                if ($(column.header()).hasClass('last-column'))
                  $(column.header())
                    .find('.dropdown-menu')
                    .css({ left: '-150px' });

                $(column.header())
                  .find('.lnk-multiselect-filter')
                  .on('click', function() {
                    var thead = $(this).parents('thead:first');
                    setTimeout(function() {
                      ctrl.enableEvents(thead);
                    }, 100);
                  });
                $(column.header())
                  .find('.lnk-multiselect-filter')
                  .on('mousedown', function() {
                    ctrl.disableEvents($(this).parents('thead:first'));
                  });
              });
          },
        });

      // отображение только указанных колонок
      if (selected_columns) {
        for (var i in self.defaultColumns)
          if (selected_columns.indexOf(self.defaultColumns[i]) > -1)
            this.dTable.column('.' + self.defaultColumns[i]).visible(true);
          else this.dTable.column('.' + self.defaultColumns[i]).visible(false);
      }

      this.$('.in-info').on('order.dt', function(e) {
        // save in url
        if (!self.table_filters) self.table_filters = {};
        self.table_filters['order_by'] = self.dTable.order();
        Backbone.trigger('global:on_url_params_change', [
          self,
          'table_filters',
          JSON.stringify(self.table_filters),
          false,
        ]);
      });
      //------------------------------------------------------
    }
  },

  /**
   ** Отрисовка сгруппированных данных
   **/
  renderGroupedData: function(data, container, index, level) {
    level++;
    for (var i in data) {
      var row = data[i];
      var new_container = null;
      switch (row['group_key']) {
        case 'order_number':
          new_container = $(
            this.templates.order_item_template({
              level: level.toString(),
              index: index + '-' + row['index'],
              name: row['name'],
              number: row['number'],
            }),
          );
          break;
        case 'sector_code':
          new_container = $(
            this.templates.sector_item_template({
              level: level.toString(),
              index: index + '-' + row['index'],
              name: row['name'],
              number: row['number'],
            }),
          );
          break;
        case 'material_group_key':
          new_container = $(
            this.templates.material_group_item_template({
              level: level.toString(),
              index: index + '-' + row['index'],
              name: row['name'],
              number: row['number'],
            }),
          );
          break;
      }
      // если уровень с данными по материалам, то рекурсию прекращаем и рендерим список материалов
      // иначе продолжаем рекурсию
      if (row['level_with_data']) {
        this.renderCommentsList(
          row['comments'],
          $(new_container).find('.data-list'),
        );
        this.renderMaterialsList(
          row['items'],
          $(new_container).find('.data-list'),
        );
      } else
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
  renderMaterialsList: function(data, container) {
    var materials_list_html = $(
      Routine.trim(this.templates.material_list_items_template({})),
    );
    var materials_container = $(materials_list_html).find(
      'tbody.materials-body',
    );
    // объект для данных футера
    var footer_data = {
      pto_size: 0,
      inpay: 0,
      payed: 0,
      onstore: 0,
      onwork: 0,
    };
    for (var i in data) {
      var row = data[i];
      var itemView = new App.Views.MaterialItemView({
        model: data[i],
        parentView: null,
        viewType: this.viewType,
      });
      // отрисовка на форме
      $(materials_container).append(itemView.render().el);
      // подсчет итоговых объемов
      if (this.viewType == 'volumes') {
        footer_data['pto_size'] += Routine.strToFloat(row.get('pto_size'));
        footer_data['inpay'] += Routine.strToFloat(row.get('facts')['inpay']);
        footer_data['payed'] += Routine.strToFloat(row.get('facts')['payed']);
        footer_data['onstore'] += Routine.strToFloat(
          row.get('facts')['onstore'],
        );
        footer_data['onwork'] += Routine.strToFloat(row.get('facts')['onwork']);
      } else {
        var koef = 1;
        var price_per_unit = 1;
        var calculated_price = 1;

        if (row.get('facts')['price'])
          calculated_price = row.get('facts')['price'];
        else if (
          row.get('unique_props_info') &&
          row.get('unique_props_info')['last_goods']
        ) {
          koef =
            row.get('unique_props_info')['last_goods']['coef_si_div_iu'] || 1;
          price_per_unit =
            row.get('unique_props_info')['last_goods']['price'] || 1;
          calculated_price = parseFloat(price_per_unit) / koef;
        }
        footer_data['pto_size'] +=
          Routine.strToFloat(row.get('pto_size')) * calculated_price;
        footer_data['inpay'] +=
          Routine.strToFloat(row.get('facts')['inpay']) * calculated_price;
        footer_data['payed'] +=
          Routine.strToFloat(row.get('facts')['payed']) * calculated_price;
        footer_data['onstore'] +=
          Routine.strToFloat(row.get('facts')['onstore']) * calculated_price;
        footer_data['onwork'] +=
          Routine.strToFloat(row.get('facts')['onwork']) * calculated_price;
      }
    }

    // добавление футера с итоговыми объемами
    $(materials_container).after(
      $(
        Routine.trim(this.templates.material_list_footer_template(footer_data)),
      ),
    );
    $(container).append(materials_list_html);
  },

  /**
   ** Отрисовка списка коментариев
   ** data - список коментариев
   ** container -блок в который необходимо добавить данные
   **/
  renderCommentsList: function(data, container) {
    // если коментов нет, то и не выводим ничего
    /*if(!data || data.length==0)
      return;*/
    var Comments_list_html = $(
      Routine.trim(this.templates.comments_list_items_template({})),
    );
    var comments_container = $(Comments_list_html).find('tbody.comments-body');
    for (var i in data) {
      var row = data[i];
      var itemView = new App.Views.CommentItemView({
        model: data[i],
        parentView: null,
      });
      // отрисовка на форме
      $(comments_container).append(itemView.render().el);
    }
    $(container).append(Comments_list_html);
  },

  /**
   * Раскрыть ветки, которые пользователь раскрывал руками
   **/
  openHandCollapsedItems: function(items) {
    // если требуется раскрыть все дерево
    if (this.collapsed) this.collapse(true);
    // раскрыть сохраненные ветки
    for (var i in this.openedItems)
      this.$el.find('#' + i).prop('checked', this.openedItems[i]);
  },

  /**
   * отменить редактирование
   **/
  cancelData: function() {
    App.FindView.onSearch(false);
  },
});

///------------------------------------------------------------------------------------------------------------------------------------------------
/// Представление элемента материала
///------------------------------------------------------------------------------------------------------------------------------------------------
App.Views.MaterialItemView = Backbone.View.extend({
  className: 'item',
  tagName: 'tr',
  parentView: null, // View ы который входит текущий
  templates: {
    template: _.template($('#MaterialItemTemplate').html()),
    template_price: _.template($('#MaterialItemTemplatePrice').html()),
  },

  /**
   * инициализация
   **/
  initialize: function() {
    this.viewType = this.options['viewType'];
  },
  /**
   * Очистка формы
   **/
  clear: function() {
    this.$el.empty();
  },
  /**
   * отрисовка
   **/
  render: function() {
    var koef = null;
    var price_per_unit = null;
    if (
      this.model.get('unique_props_info') &&
      this.model.get('unique_props_info')['last_goods'] &&
      this.model.get('unique_props_info')['last_goods']['coef_si_div_iu'] &&
      this.model.get('unique_props_info')['last_goods']['price']
    ) {
      koef = this.model.get('unique_props_info')['last_goods'][
        'coef_si_div_iu'
      ];
      price_per_unit = this.model.get('unique_props_info')['last_goods'][
        'price'
      ];
    }

    if (this.viewType == 'volumes') {
      this.$el.html(
        this.templates.template(
          $.extend({}, this.model.toJSON(), {
            koef: koef,
            price_per_unit: price_per_unit,
          }),
        ),
      );
    } else {
      // отрисовка шаблона
      this.$el.html(
        this.templates.template_price(
          $.extend({}, this.model.toJSON(), {
            koef: koef,
            price_per_unit: price_per_unit,
          }),
        ),
      );
    }
    return this;
  },
});

///------------------------------------------------------------------------------------------------------------------------------------------------
/// Представление элемента коментария
///------------------------------------------------------------------------------------------------------------------------------------------------
App.Views.CommentItemView = Backbone.View.extend({
  className: 'item',
  tagName: 'tr',
  parentView: null, // View ы который входит текущий
  templates: {
    template: _.template($('#CommentItemTemplate').html()),
  },

  /**
   * инициализация
   **/
  initialize: function() {},
  /**
   * Очистка формы
   **/
  clear: function() {
    this.$el.empty();
  },
  /**
   * отрисовка
   **/
  render: function() {
    // отрисовка шаблона
    this.$el.html(this.templates.template(this.model.toJSON()));
    return this;
  },
});

///------------------------------------------------------------------------------------------------------------------------------------------------
///---------Представление списка попыток импорта данных из XLS-----------------------------------------------------------
///------------------------------------------------------------------------------------------------------------------------------------------------
App.Views.ImportDataHistoryListView = Backbone.View.extend({
  el: $('#mto-import-data-history'),
  templates: {
    main: _.template($('#ImportDataHistoryListTemplate').html()),
  },
  /**
   * Инициализация
   **/
  initialize: function() {
    this.render();
    return this;
  },
  /**
   * Отрисовка
   **/
  render: function() {
    var self = this;
    // Очистка формы
    this.clear();
    // отрисовка
    this.$el.append(this.templates.main());
    var i = 0;
    _.each(
      this.collection.models,
      function(item) {
        i++;
        this.$el.find('.data-body').append(
          new App.Views.ImportDataHistoryItemView({
            model: item,
            i: i,
          }).render().el,
        );
      },
      this,
    );
    return this;
  },
  /**
   * Очистка формы
   **/
  clear: function() {
    this.$el.empty();
  },
});

App.Views.ImportDataHistoryItemView = Backbone.View.extend({
  tagName: 'tr',
  templates: {
    main: _.template($('#ImportDataHistoryItemTemplate').html()),
  },
  /**
   * Инициализация
   **/
  initialize: function() {
    this.index = this.options['i'];
  },
  /**
   * Отрисовка
   **/
  render: function() {
    var self = this;
    // Очистка формы
    this.clear();
    // отрисовка
    this.$el.append(
      this.templates.main($.extend({}, this.model.toJSON(), { i: this.index })),
    );
    return this;
  },
  /**
   * Очистка формы
   **/
  clear: function() {
    this.$el.empty();
  },
});
