///
/// Глобальная структура
///
var App = {
  Models: {},
  Views: {},
  Collections: {},
  //---ROUTER
  Route: null, //
  //---VIEWS
  controlPanelView: null, // предтавление панели управления с фильтрами
  MaterialsDataListViewContainer: null, // представление списка материалов
  SpecificationMaterialsDataListViewContainer: null, // представление списка материалов
  mainBoxView: null, // представление основного блока с данными
  orderInfoView: null, // представление блока с информацией о зказе
  templatesDataListViewContainer: null, // представление отображения списка шаблонов расчетов
  //---COLLECTIONS
  MaterialsDataCollection: null, //  коллекция списка материалов
  MaterialsToCalculateCollection: null, // список материалов, отобранных на расчет
  TemplatesCollection: null, // список шаблонов спецификаций
  //---DATA LISTS
  groupsList: [], // справочник разделов и групп
  materialsList: {}, // справочник материалов
  preparedMaterialsList: [], // обработанный справочник матеиалов
  //---OBJECTS
  UrlParams: {}, // параметры URL строки
  specificationData: null, // информация по спецификации
  objectInfo: null, // информация о заказе/заявке/шаблоне
  searchInfo: null, // объект поиска
  defaultSectorId: "5af59181b5ac0400089e6315", // направление по умолчанию
  currentSectorId: "5af59181b5ac0400089e6315", // текущее направление
  filters: null, // текущие фильтры
  multiPageAccessObserver: null, // наблюдатель за многопользовательским доступом

  /**
   *  Инициализация необходимых объектов
   */
  initialize: function(sector, search_numbers, templates) {
    var self = this;
    this.search_numbers = search_numbers;
    // Инициализация коллекци и представления для справочника материалов
    this.MaterialsDataCollection = new App.Collections.MaterialsDataCollection();
    this.MaterialsDataListViewContainer = new App.Views.MaterialsDataListViewContainer(
      {
        collection: this.MaterialsDataCollection
      }
    );

    // Инициализация коллекци и представления для спецификации материалов
    this.SpecificationMaterialsDataCollection = new App.Collections.SpecificationMaterialsDataCollection();
    this.SpecificationMaterialsDataListViewContainer = new App.Views.SpecificationMaterialsDataListViewContainer(
      {
        collection: this.SpecificationMaterialsDataCollection
      }
    );

    // панель отображения списка шаблонов расчетов
    this.TemplatesCollection = new App.Collections.TemplatesCollection(
      templates
    );
    this.templatesDataListViewContainer = new App.Views.TemplatesDataListViewContainer(
      {
        collection: this.TemplatesCollection
      }
    );

    // основная контрольная панель
    this.controlPanelView = new App.Views.ControlPanelView(
      this.prepareSearchNumbers(search_numbers)
    );
    // предствление для основного блока данных
    this.mainBoxView = new App.Views.MainView();
    // представление информации о заказе
    this.orderInfoView = new App.Views.OrderInfoView();
    // представление групповых расчетов (групповое планирование)
    this.groupsCalculationView = new App.Views.GroupsCalculationView();

    // роуты
    this.Route = new AppRouter(this);
    Backbone.history.start();
    // глобальное событие на изменение параметров URL адреса
    Backbone.on("global:on_url_params_change", this.onSaveUrlHistory, this);
    // отслеживаем событие на создание новой спецификации
    Backbone.on(
      "global:on_create_new_specification",
      this.onCreateNewSpecification,
      this
    );
    // отслеживаем событие на линковку спецификации
    Backbone.on("global:on_link_specification", this.onLinkSpecification, this);
    // открыть спецификацию
    Backbone.on("global:on_open_specification", this.onOpenSpecification, this);
    // загрузить данные в гугл таблицу
    Backbone.on("global:download_to_google", this.onDownloadToGoogle, this);

    $(window).on("beforeunload", function() {
      self.closeSpecification();
    });

    // Backbone.trigger("global:on_material_save_complete", [
    //   self,
    //   "add",
    //   result["data"]
    // ]);
  },

  /**
   * Обработка номеров заказов, заявок, спецификаций
   * Получение единого списка
   * {'contract_orders': [],
   *   'crm_orders': [],
   *   'specification_numbers': []
   * }
   */
  prepareSearchNumbers: function(data) {
    var result = [];
    result = result.concat(
      data["contract_orders"].map(function(item) {
        return { name: "заказ - " + item, id: item, document_type: "contract" };
      })
    );
    result = result.concat(
      data["crm_orders"].map(function(item) {
        return { name: "заявка - " + item, id: item, document_type: "order" };
      })
    );
    result = result.concat(
      data["specification_numbers"].map(function(item) {
        return {
          name: "шаблон - " + item,
          id: item,
          document_type: "template"
        };
      })
    );
    return result;
  },

  /**
   * Изменение и сохранение параметров URL
   */
  onSaveUrlHistory: function(params) {
    var param_key = params[1];
    var param_value = params[2];
    var reload = false || params[3];
    if (param_key in this.UrlParams) this.UrlParams[param_key] = param_value;
    this.Route.navigate("/" + this.buildUrl(this.UrlParams), reload);
  },

  /**
   * Парсинг URL параметров
   */
  parse_commands: function(query, urlParams) {
    var tmpCommands = query.split("/");
    if (tmpCommands.length > 0) {
      for (var key in urlParams) {
        var i = 0;
        for (var ci in tmpCommands) {
          var command = tmpCommands[i];
          if (key == command && i + 1 <= tmpCommands.length)
            urlParams[key] = tmpCommands[i + 1];
          i++;
        }
      }
    }
  },

  /**
   * Обработка запроса с объектами входных параметров
   */
  doQueryByParams: function(UrlParams) {
    this.doQuery("/" + this.buildUrl(UrlParams));
  },

  /**
   * Обрабокта запроса сброса данны (закрытие спецификации)
   */
  doCloseData: function() {
    this.mainBoxView.hide();
    this.templatesDataListViewContainer.show();

    this.closeSpecification();
  },

  /**
   * Обработка запроса с входной строкой URL
   */
  doGetData: function() {
    var query = "";
    // получение URL строки со всех контролов
    query += this.controlPanelView.getUrl();
    query += this.mainBoxView.getUrl();
    this.doQuery(query);
  },

  prepareFilters: function(UrlParams) {
    return {
      groups: UrlParams["groups"] ? UrlParams["groups"].split(";") : [],
      group_by: UrlParams["group_by"] ? UrlParams["group_by"].split(";") : [],
      search_obj: JSON.parse(UrlParams["search_obj"]),
      tab: UrlParams["tab"],
      show_not_standart_materials: UrlParams["show_not_standart_materials"],
      show_empty_groups: UrlParams["show_empty_groups"],
      collapsed: UrlParams["collapsed"],
      materials_search_line: UrlParams["materials_search_line"]
        .split("%20")
        .join(" "),
      specification_materials_search_line: UrlParams[
        "specification_materials_search_line"
      ]
        .split("%20")
        .join(" ")
    };
  },

  rebuildFilters: function() {
    var query = "";
    // получение URL строки со всех контролов
    query += this.controlPanelView.getUrl();
    query += this.mainBoxView.getUrl();
    this.parse_commands(query, this.UrlParams);
    this.filters = this.prepareFilters(this.UrlParams);
    return this.filters;
  },

  /**
   * Парсинг URl параметров
   */
  doQuery: function(query) {
    // отображение списка спецификаций
    this.UrlParams = {
      search: "no",
      groups: "",
      search_obj: "{}",
      tab: "data-materials", // data-materials; data-calculations
      collapsed: "no",
      group_by: "sector_id;category_id;group_id", // sector; category; group
      materials_search_line: "",
      specification_materials_search_line: "",
      show_not_standart_materials: "no",
      show_empty_groups: "no"
    };

    if (query) this.parse_commands(query, this.UrlParams);

    // выставление правильного URL
    this.Route.navigate("/" + this.buildUrl(this.UrlParams), false);

    // запуск процедуры подгрузки и отображения списка спецификаций
    if (
      this.UrlParams.search == "yes" &&
      this.UrlParams.search_obj &&
      this.UrlParams.search_obj != "{}"
    ) {
      this.filters = this.prepareFilters(this.UrlParams);
      this.loadData(this.filters);
    } else this.templatesDataListViewContainer.show();
  },

  /**
   * Построение строки URL по текущим параметрам
   */
  buildUrl: function(UrlParams) {
    var arr = [];
    for (var key in UrlParams) {
      arr.push(key);
      arr.push(UrlParams[key]);
    }
    return arr.join("/");
  },

  /**
   * преобразование справочника групп и разделов из вида дерева в линейный dictionary
   */
  makeLinearsGroups: function(data) {
    var result = {};
    if (data)
      for (var i in data) {
        result[data[i]["_id"]] = data[i];
        _.extend(result, this.makeLinearsGroups(data[i]["items"]));
      }
    return result;
  },

  /**
   * Функция получающая справочник групп и категорий по разделу
   * sector_id - идентификатор раздела
   */
  getSectorGroups: function() {
    var sector_id = this.currentSectorId || this.defaultSectorId;
    return this.groupsList.filter(el => el["_id"] == sector_id)[0]["items"];
  },

  /**
   * Подготовка справочника материалов к необходимому формату
   * Перевод исходных данных в коллекцию
   * {
     'group_id',
     'group_code',
     'group_name',
     '_id',
     'code',
     'name',
     'unit_pto',
     'unit_pto_value',
     'unit_purchase',
     'unit_purchase_value',
     'price',
     'price_date',
     'unique_props',
     'labels',
     'global_code',
     }
   */
  prepareMaterialsList: function(data) {
    var result = [];

    // каждая уникальная характеристика дробит элементы справочника
    var tmp_result = [];
    for (var i in data) {
      var material = data[i];
      var full_key_id = material["_id"];
      var new_material = {
        full_key: material["group_code"] + "." + material["code"],
        full_key_id: material["_id"],
        material_group_id: material["group_id"],
        material_group_code: material["group_code"],
        material_group_name: material["group_name"],
        material_id: material["_id"],
        material_code: material["code"],
        material_type: material["type"],
        material_name: material["name"],
        material_global_code: material["global_code"],
        material_unit_pto: material["unit_pto"],
        labels: material["labels"],
        //'prop_name': null,
        //'prop_key': null,
        //'prop_global_code': null,
        sector_routine: null,
        sector_number: null,
        sector_id: null,
        sector_name: null,
        category_routine: null,
        category_number: null,
        category_id: null,
        category_name: null,
        group_number: null,
        group_routine: null,
        group_id: null,
        group_name: null,
        linked_materials: material["linked_materials"],
        is_active: material["is_active"]
      };
      tmp_result.push(new_material);
      /*if(material['unique_props']){
        for(var j in material['unique_props']){
          var prop = material['unique_props'][j];
          if(prop['is_active']){
            var new_prop = Object.assign({}, new_material);
            new_prop['prop_name'] = prop['name'];
            new_prop['prop_id'] = prop['_id'];
            new_prop['prop_key'] = prop['key'];
            new_prop['prop_global_code'] = prop['global_code'];
            new_prop['full_key_id'] += '_' + prop['_id'];
          }
          tmp_result.push(new_prop);
        }
      }*/
    }

    // разделы и группы дробят элементы справочника на доп. позиции
    for (var i in tmp_result) {
      var material = tmp_result[i];
      if (material["labels"] && material["labels"].length > 0) {
        for (var j in material["labels"]) {
          var label = material["labels"][j];
          var new_label = Object.assign({}, material);
          delete new_label["labels"];
          new_label["sector_routine"] = this.linearGroupsList[
            label["sector"]["_id"]
          ]["routine"];
          new_label["sector_number"] = this.linearGroupsList[
            label["sector"]["_id"]
          ]["number"];
          new_label["sector_id"] = label["sector"]["_id"];
          new_label["sector_name"] = this.linearGroupsList[
            label["sector"]["_id"]
          ]["name"];
          new_label["category_routine"] = this.linearGroupsList[
            label["category"]["_id"]
          ]["routine"];
          new_label["category_number"] = this.linearGroupsList[
            label["category"]["_id"]
          ]["number"];
          new_label["category_id"] = label["category"]["_id"];
          new_label["category_name"] = this.linearGroupsList[
            label["category"]["_id"]
          ]["name"];
          new_label["group_number"] = this.linearGroupsList[
            label["group"]["_id"]
          ]["number"];
          new_label["group_routine"] = this.linearGroupsList[
            label["group"]["_id"]
          ]["routine"];
          new_label["group_id"] = label["group"]["_id"];
          new_label["group_name"] = this.linearGroupsList[
            label["group"]["_id"]
          ]["name"];
          new_label["full_key_id"] +=
            "_" + label["category"]["_id"] + "_" + label["group"]["_id"];
          result.push(new_label);
        }
      }
      /*else
      {
        material['full_key_id'] += '__';
        delete material['labels'];
        material['label_category_id'] = '';
        material['label_category_name'] = 'Общая';
        material['label_category_routine'] = 0;
        material['label_group_routine'] = 0;
        material['label_group_id'] = '';
        material['label_group_name'] = 'Общая';
        result.push(material);
      }*/
    }
    return result;
  },

  /**
   * Функция для проставления флагов занятости материалам из спраовника
   * используя материалы из спецификации
   * materialsCollection - коллекция справочника материалов
   * used_materials_ids - список ID матераилов, задействованных в спецификациях
   * row['materials_id'] + '#' + row['group_id']
   */
  synchMaterialsWithSpecification: function(
    materialsCollection,
    used_materials_ids
  ) {
    var self = this;
    _.each(materialsCollection.models, function(item) {
      var tmp_key = item.get("material_id") + "#" + item.get("group_id");
      if (tmp_key in used_materials_ids) item.set({ in_calculate: true });
      else item.set({ in_calculate: false });
    });
  },
  //------------------------------------------------------------------------------

  /**
   * Добавление нового материала в справочник материалов
   */
  addNewMaterial: function(new_material) {
    // materials dictionry ------------------------------------------------------------------
    this.materialsList[new_material["_id"]] = new_material;
    this.preparedMaterialsList = this.prepareMaterialsList(this.materialsList);

    // materials dictionary form--------------------------------------------------------------
    var used_materials_ids = {};
    // for (var i in this.specificationData["materials"]) {
    //   var row = this.specificationData["materials"][i];
    //   var tmp_id = row["materials_id"] + "#" + row["group_id"];
    //   used_materials_ids[tmp_id] = true;
    // }

    _.each(this.SpecificationMaterialsDataCollection.models, function(row) {
      var tmp_id = row.get("materials_id") + "#" + row.get("group_id");
      used_materials_ids[tmp_id] = true;
    });

    this.MaterialsDataCollection.reset();
    this.MaterialsDataCollection.add(
      new App.Collections.MaterialsDataCollection(this.preparedMaterialsList)
        .models
    );
    // mark materials in specification
    this.synchMaterialsWithSpecification(
      this.MaterialsDataCollection,
      used_materials_ids
    );
  },

  renderData: function(
    data,
    groups,
    materials,
    object_info,
    access_page_info,
    filters
  ) {
    // specification
    this.specificationData = data;

    // directions and groups and categories
    if (!this.groupsList || this.groupsList.length == 0) {
      this.groupsList = groups;
      this.linearGroupsList = this.makeLinearsGroups(groups);
    }

    this.controlPanelView.render(object_info, this.groupsList, filters.groups, {
      search_obj: filters.search_obj,
      collapsed: filters.collapsed,
      group_by: filters.group_by,
      groups: this.groupsList,
      selected_groups: filters.groups
    });

    // materials dictionry ------------------------------------------------------------------
    if (!this.materialsList || _.size(this.materialsList) == 0) {
      this.preparedMaterialsList = this.prepareMaterialsList(materials);
      this.materialsList = materials;
    }

    // object information view (order/contract/template)--------------------------------------
    this.objectInfo = object_info;
    this.orderInfoView.render(this.objectInfo);

    // group calculation form-----------------------------------------------------------------
    this.groupsCalculationView.render(
      this.groupsList,
      this.specificationData
        ? this.specificationData["groups_calculation"]
        : null
    );

    // specification masterials form----------------------------------------------------------
    this.SpecificationMaterialsDataCollection.reset();
    this.SpecificationMaterialsDataCollection.add(
      new App.Collections.SpecificationMaterialsDataCollection(
        this.specificationData["materials"]
      ).models,
      { silent: true }
    );
    this.SpecificationMaterialsDataListViewContainer.build({
      group_by: filters.group_by,
      groups: filters.groups,
      groupsListDict: this.groupsList,
      filterLineQuery: filters.specification_materials_search_line,
      materialsDict: this.materialsList,
      need_collapse: false,
      showEmptyGroups: filters.show_empty_groups
    });

    // materials dictionary form--------------------------------------------------------------
    var used_materials_ids = {};
    for (var i in this.specificationData["materials"]) {
      var row = this.specificationData["materials"][i];
      var tmp_id = row["materials_id"] + "#" + row["group_id"];
      used_materials_ids[tmp_id] = true;
    }
    this.MaterialsDataCollection.reset();
    this.MaterialsDataCollection.add(
      new App.Collections.MaterialsDataCollection(this.preparedMaterialsList)
        .models
    );
    // mark materials in specification
    this.synchMaterialsWithSpecification(
      this.MaterialsDataCollection,
      used_materials_ids
    );
    // materials dictionary form
    this.MaterialsDataListViewContainer.build({
      group_by: filters.group_by,
      groups: filters.groups,
      filterLineQuery: filters.materials_search_line,
      showNotStandartMaterials: filters.show_not_standart_materials
    });

    // show main data box form --------------------------------------------------------------
    this.mainBoxView.show({
      tab: filters.tab,
      note: this.specificationData.note
    });
    // hide list of templates
    this.templatesDataListViewContainer.hide();

    // show multipage user access view
    MultiPageAccessApp.start(
      "#pnlMultiPageAccess",
      access_page_info,
      "orderspecification2#" + this.specificationData["_id"]
    );
  },

  /**
   *  Load main data by params
   */
  loadData: function(filters) {
    var self = this;
    // if not setted number of search object
    if (!filters.search_obj || !filters.search_obj.number) return;

    // load server data
    Routine.showLoader();
    $.ajax({
      url: "/handlers/plannorm_v2/search/",
      type: "POST",
      dataType: "json",
      contentType: "application/json; charset=utf-8",
      data: JSON.stringify({
        search_obj: filters.search_obj,
        need_groups: self.groupsList.length == 0 ? "yes" : "no",
        need_materials: _.size(self.materialsList) == 0 ? "yes" : "no"
      }),
      timeout: 35000,
      async: true
    })
      .done(function(result) {
        if (result["status"] == "error")
          $.jGrowl(result["msg"], {
            themeState: "growl-error",
            sticky: false,
            life: 10000
          });
        else {
          if (!result["data"]) {
            bootbox.confirm(
              "По данному номеру, спецификация не создавалась.<br>Создать спецификацию?",
              function(val) {
                if (val)
                  self.createNewSpecificationBy(null, result["object_info"]);
                else self.controlPanelView.clearFilters();
              }
            );
            return;
          } else {
            self.renderData(
              result["data"],
              result["groups"],
              result["materials"],
              result["object_info"],
              result["access_page_info"],
              filters
            );
          }
        }
      })
      .error(function() {})
      .always(function() {
        Routine.hideLoader();
      });
  },

  /**
   * Сохранить пользовательские настрокйи
   */
  save_user_settings: function(val, filters_str) {
    var filters = {
      search: "no",
      groups: "",
      search_obj: "{}",
      tab: "data-materials",
      collapsed: "no",
      group_by: "sector_id;category_id;group_id",
      materials_search_line: "",
      specification_materials_search_line: "",
      show_not_standart_materials: "no",
      show_empty_groups: "no"
    };
    if (filters_str) this.parse_commands(filters_str, filters);

    // отправлка запроса на сервер
    $.ajax({
      url: "/handlers/user/save_page_settings/",
      type: "POST",
      dataType: "json",
      contentType: "application/json; charset=utf-8",
      data: JSON.stringify({
        page: "plannorm_v2",
        checked: val,
        filters: filters
      }),
      timeout: 35000,
      async: true
    })
      .done(function(result) {
        if (result["status"] == "error")
          $.jGrowl(result["msg"], {
            themeState: "growl-error",
            sticky: false,
            life: 10000
          });
      })
      .error(function() {
        $.jGrowl("Ошибка сохранения настроек фильтров. Повторите попытку. ", {
          themeState: "growl-error",
          sticky: false,
          life: 10000
        });
      })
      .always(function() {});
  },

  /**
   * Сохранить групповые вычисления
   * data - список значений на сохранение
   */
  saveGroupCalculations: function(data) {
    var self = this;
    $.ajax({
      url: "/handlers/plannorm_v2/save_group_calculations/",
      type: "POST",
      dataType: "json",
      contentType: "application/json; charset=utf-8",
      data: JSON.stringify({
        data: data,
        specification_id: this.specificationData
          ? this.specificationData["_id"]
          : null
      }),
      timeout: 35000,
      async: true
    })
      .done(function(result) {
        if (result["status"] == "error")
          $.jGrowl(result["msg"], {
            themeState: "growl-error",
            sticky: false,
            life: 10000
          });
        else {
          $.jGrowl("Данные успешно сохранены", {
            themeState: "growl-success",
            sticky: false,
            life: 5000
          });
          self.specificationData = result["data"];
        }
      })
      .error(function() {
        $.jGrowl("Ошибка сохранения данных. Повторите попытку. ", {
          themeState: "growl-error",
          sticky: false,
          life: 10000
        });
      })
      .always(function() {});
  },

  /**
   * Add new material to specification
   */
  addNewMaterialToCalculation: function(material, payBack) {
    var self = this;
    $.ajax({
      url: "/handlers/plannorm_v2/add_new_material_to_calculation/",
      type: "POST",
      dataType: "json",
      contentType: "application/json; charset=utf-8",
      data: JSON.stringify({
        material: material,
        specification_id: this.specificationData["_id"]
      }),
      timeout: 35000,
      async: true
    })
      .done(function(result) {
        if (result["status"] == "error")
          $.jGrowl(result["msg"], {
            themeState: "growl-error",
            sticky: false,
            life: 10000
          });
        else {
          $.jGrowl("Материал добавлен в расчеты.", {
            themeState: "growl-success"
          });
          // Добавить новый материал в текущую спецификацию и коллекцию материалов спецификации
          self.specificationData["materials"].push(result["data"]);
          self.SpecificationMaterialsDataCollection.add(
            new App.Models.SpecificationMaterialItemModel(result["data"])
          );
          // вызов обратной функции
          payBack(true);
        }
      })
      .error(function() {
        $.jGrowl("Ошибка сохранения данных. Повторите попытку. ", {
          themeState: "growl-error",
          sticky: false,
          life: 10000
        });
      })
      .always(function() {});
  },

  /**
   * Remove material from specification
   */
  removeMaterialFromCalculation: function(
    material_id,
    category_id,
    group_id,
    payBack
  ) {
    var self = this;
    $.ajax({
      url: "/handlers/plannorm_v2/remove_material_from_calculation/",
      type: "POST",
      dataType: "json",
      contentType: "application/json; charset=utf-8",
      data: JSON.stringify({
        material_id: material_id,
        category_id: category_id,
        group_id: group_id,
        specification_id: this.specificationData["_id"]
      }),
      timeout: 35000,
      async: true
    })
      .done(function(result) {
        if (result["status"] == "error")
          $.jGrowl(result["msg"], {
            themeState: "growl-error",
            sticky: false,
            life: 10000
          });
        else {
          $.jGrowl("Материал удален из спецификации.", {
            themeState: "growl-success"
          });
          // удаление материала из спецификации
          var tmp_materials = [];
          for (var i in self.specificationData["materials"])
            if (
              self.specificationData["materials"][i]["materials_id"] !=
                material_id &&
              self.specificationData["materials"][i]["category_id"] !=
                category_id &&
              self.specificationData["materials"][i]["group_id"] != group_id
            )
              tmp_materials.push(self.specificationData["materials"][i]);
          // удаление материала из коллекции спецификации
          self.SpecificationMaterialsDataCollection.remove(
            self.SpecificationMaterialsDataCollection.where({
              materials_id: material_id,
              category_id: category_id,
              group_id: group_id
            })
          );
          // вызов обратной функции
          payBack(true);
        }
      })
      .error(function() {
        $.jGrowl("Ошибка сохранения данных. Повторите попытку.", {
          themeState: "growl-error",
          sticky: false,
          life: 10000
        });
      })
      .always(function() {});
  },

  /**
   * Save specification materials
   */
  saveSpecification: function(note, closeAfterSave) {
    var self = this;
    function saveData() {
      // prepare materials to save. Take only changed materials
      var materials_to_save = [];
      _.each(self.SpecificationMaterialsDataCollection.models, function(model) {
        //if(model.hasChanged())
        materials_to_save.push(model.toJSON());
      });

      Routine.showLoader();
      $.ajax({
        url: "/handlers/plannorm_v2/save/",
        type: "POST",
        dataType: "json",
        contentType: "application/json; charset=utf-8",
        data: JSON.stringify({
          specification_id: self.specificationData["_id"],
          materials: materials_to_save,
          note: note
        }),
        timeout: 35000,
        async: true
      })
        .done(function(result) {
          if (result["status"] == "error")
            $.jGrowl(result["msg"], {
              themeState: "growl-error",
              sticky: false,
              life: 10000
            });
          else {
            // specification information
            self.specificationData = result["data"];
            // Форма групповых расчетов
            self.groupsCalculationView.render(
              self.groupsList,
              self.specificationData
                ? self.specificationData["groups_calculation"]
                : null,
              self.currentSectorId
            );
            // форма работы со спецификацией материалов
            self.SpecificationMaterialsDataCollection.reset();
            self.SpecificationMaterialsDataCollection.add(
              new App.Collections.SpecificationMaterialsDataCollection(
                self.specificationData["materials"]
              ).models,
              { silent: true }
            );

            self.SpecificationMaterialsDataListViewContainer.render(
              self.specificationData["note"]
            );

            var used_materials_ids = {};
            for (var i in self.specificationData["materials"]) {
              var row = self.specificationData["materials"][i];
              var tmp_id = row["materials_id"] + "#" + row["group_id"];
              used_materials_ids[tmp_id] = true;
            }
            // пометка в коллекции материалов, материалы задействованные в спецификации
            self.synchMaterialsWithSpecification(
              self.MaterialsDataCollection,
              used_materials_ids
            );
            // форма работы со справочником материалов
            self.MaterialsDataListViewContainer.render(
              self.specificationData["note"]
            );
            $.jGrowl("Данные успешно сохранены", {
              themeState: "growl-success",
              sticky: false,
              life: 5000
            });

            // если сохранение с последующим закрытием формы
            if (closeAfterSave) self.controlPanelView.OnClose();
            // self.doCloseData();
          }
        })
        .error(function() {})
        .always(function() {
          Routine.hideLoader();
        });
    }

    var access_users = MultiPageAccessApp.get_users();
    if (access_users && access_users.length > 0) {
      var msg =
        "Внимание, возможна потеря информации. Спецификация в данный момент уже открыта: ";
      for (var i in access_users) {
        var row = access_users[i];
        msg += row["name"] + " [" + row["count"] + "]. ";
      }
      bootbox.confirm(msg, function(val) {
        if (val) saveData();
      });
    } else saveData();
  },

  /**
   * Event on create new specification
   */
  onCreateNewSpecification: function(params) {
    this.createNewSpecificationBy(params[0], null);
  },

  /**
   * Event on link one specification to another specification
   * operation_type = [import, export]
   */
  onLinkSpecification: function(params) {
    // check if one object can be linked to another
    this.checkIfLinkAvailable(params);
  },

  /**
   * Event on open specfication
   */
  onOpenSpecification: function(params) {
    var search_obj = params[0];
    Backbone.trigger("global:on_url_params_change", [
      this,
      "search_obj",
      JSON.stringify(search_obj)
    ]);
    Backbone.trigger("global:on_url_params_change", [this, "search", "yes"]);
    this.doQuery(this.buildUrl(this.UrlParams));
  },

  /**
   * Event on download specification to google
   */
  onDownloadToGoogle: function(params) {
    var self = this;
    var object_info = params[1];
    var current_unit = params[2];
    Routine.showLoader();
    $.ajax({
      url: "/handlers/plannorm_v2/download_to_google/",
      type: "POST",
      dataType: "json",
      contentType: "application/json; charset=utf-8",
      data: JSON.stringify({
        object_info: object_info,
        product_unit_number: 1
      }),
      timeout: 35000,
      async: true
    })
      .done(function(result) {
        if (result["status"] == "error")
          $.jGrowl(result["msg"], {
            themeState: "growl-error",
            sticky: false,
            life: 10000
          });
        else {
          window.open(
            "https://docs.google.com/spreadsheets/d/" + result["document_id"],
            "_blank"
          );
        }
      })
      .error(function() {
        $.jGrowl(
          "Ошибка выгрузки спецификации на гугл диск. Повторите попытку.",
          {
            themeState: "growl-error",
            sticky: false,
            life: 10000
          }
        );
      })
      .always(function() {
        Routine.hideLoader();
      });
  },

  /**
   * Check if available operation link one specification to another
   * params = {
   *  object_info,
   *  search_obj,
   *  operation_type, // import/export
   *  sector_id,
   *  category_id,
   *  group_id
   * }
   */
  checkIfLinkAvailable: function(params) {
    var self = this;
    $.ajax({
      url: "/handlers/plannorm_v2/check_if_link_available/",
      type: "POST",
      dataType: "json",
      contentType: "application/json; charset=utf-8",
      data: JSON.stringify(params),
      timeout: 35000,
      async: true
    })
      .done(function(result) {
        if (result["status"] == "error")
          $.jGrowl(result["msg"], {
            themeState: "growl-error",
            sticky: false,
            life: 10000
          });
        else {
          if (result["can_be_linked"]) {
            self.linkSpecification(params);
          } else {
            // ask user to confirm
            bootbox.confirm(result["msg"], function(val) {
              if (val) self.linkSpecification(params);
            });
          }
        }
      })
      .error(function() {
        $.jGrowl("Ошибка сохранения данных. Повторите попытку.", {
          themeState: "growl-error",
          sticky: false,
          life: 10000
        });
      })
      .always(function() {});
  },

  /**
   * Link one specification to another
   * params = {
   *  object_info,
   *  search_obj,
   *  operation_type, // import/export
   *  sector_id,
   *  category_id,
   *  group_id
   * }
   */
  linkSpecification: function(params) {
    var self = this;
    $.ajax({
      url: "/handlers/plannorm_v2/link_specification/",
      type: "POST",
      dataType: "json",
      contentType: "application/json; charset=utf-8",
      data: JSON.stringify(params),
      timeout: 35000,
      async: true
    })
      .done(function(result) {
        if (result["status"] == "error")
          $.jGrowl(result["msg"], {
            themeState: "growl-error",
            sticky: false,
            life: 10000
          });
        else {
          Backbone.trigger("global:on_url_params_change", [
            self,
            "search_obj",
            JSON.stringify({
              number: params.object_info["order_number"]
                ? params.object_info["order_number"]
                : params.object_info["specification_number"],
              document_type: params.object_info["document_type"]
            })
          ]);
          Backbone.trigger("global:on_url_params_change", [
            self,
            "search",
            "yes"
          ]);
          self.doQuery(self.buildUrl(self.UrlParams));
          setTimeout(function() {
            $.jGrowl("Операция успешно завершена", {
              themeState: "growl-success"
            });
          }, 2000);
        }
      })
      .error(function() {
        $.jGrowl("Ошибка сохранения данных. Повторите попытку.", {
          themeState: "growl-error",
          sticky: false,
          life: 10000
        });
      })
      .always(function() {});
  },

  createNewSpecificationBy: function(search_obj, object_info) {
    var self = this;
    $.ajax({
      url: "/handlers/plannorm_v2/add_new_specification/",
      type: "POST",
      dataType: "json",
      contentType: "application/json; charset=utf-8",
      data: JSON.stringify({
        search_obj: search_obj,
        object_info: object_info
      }),
      timeout: 35000,
      async: true
    })
      .done(function(result) {
        if (result["status"] == "error")
          $.jGrowl(result["msg"], {
            themeState: "growl-error",
            sticky: false,
            life: 10000
          });
        else {
          if (object_info) {
            Backbone.trigger("global:on_url_params_change", [
              self,
              "search_obj",
              JSON.stringify({
                number: object_info["order_number"],
                document_type: object_info["document_type"]
              })
            ]);
          } else {
            self.search_numbers["specification_numbers"].push(
              result["data"]["code"].toString()
            );
            Backbone.trigger("global:on_url_params_change", [
              self,
              "search_obj",
              JSON.stringify({
                number: result["data"]["code"],
                document_type: "template"
              })
            ]);

            // add new template in templates collection
            self.TemplatesCollection.add(
              new App.Models.TemplateItemModel({
                code: result["data"]["code"],
                _id: result["data"]["_id"],
                note: result["data"]["note"]
              })
            );
          }
          Backbone.trigger("global:on_url_params_change", [
            self,
            "search",
            "yes"
          ]);
          self.doQuery(self.buildUrl(self.UrlParams));

          setTimeout(function() {
            $.jGrowl("Создана новая спецификация № " + result["data"]["code"], {
              themeState: "growl-success"
            });
          }, 2000);
        }
      })
      .error(function() {
        $.jGrowl("Ошибка сохранения данных. Повторите попытку.", {
          themeState: "growl-error",
          sticky: false,
          life: 10000
        });
      })
      .always(function() {});
  },

  /**
   * Функция получения данных необходимых для работы формы редактирования материалов
   */
  getDataForMaterialEditForm: function(material_id, callback) {
    var self = this;
    Routine.showLoader();
    $.ajax({
      url:
        "/handlers/plannorm_v2/get_data_for_material_edit_form/" + material_id,
      type: "GET",
      dataType: "json",
      contentType: "application/json; charset=utf-8",
      data: "",
      timeout: 35000,
      async: true
    })
      .done(function(result) {
        if (result["status"] == "error")
          $.jGrowl(result["msg"], {
            themeState: "growl-error",
            sticky: false,
            life: 10000
          });
        else {
          callback(
            result.data.material_info,
            result.data.materials_groups,
            result.data.sectors,
            result.data.material_units,
            result.data.labels
          );
        }
      })
      .error(function() {
        $.jGrowl("Ошибка получения данных. Повторите попытку.", {
          themeState: "growl-error",
          sticky: false,
          life: 10000
        });
      })
      .always(function() {
        Routine.hideLoader();
      });
  },

  /**
   * Функция отправки на сервер информации о закрытии спецификации
   */
  closeSpecification: function() {
    var self = this;
    if (self.specificationData) {
      $.ajax({
        url: "/handlers/plannorm_v2/close/",
        type: "POST",
        dataType: "json",
        contentType: "application/json; charset=utf-8",
        data: JSON.stringify({
          page_key: "orderspecification2#" + self.specificationData["_id"]
        }),
        timeout: 35000,
        async: true
      })
        .done(function(result) {})
        .error(function() {})
        .always(function() {});
    }
    MultiPageAccessApp.stop();
    self.specificationData = null;
  }
};
