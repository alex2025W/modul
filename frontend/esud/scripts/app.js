///
/// Глобальная структура
///
var App = {
  dataCollection: null, // коллекция данных всех объектов
  dataCollectionArray: {}, // коллекция данных всех объектов в виде Array
  treeDataCollection: null, // дерево из коллекции данных объектов
  Models: {},
  Collections: {},
  Views: {},
  Commanders: {}, // список проводников(по умолчанию только 2: левый и правый)
  Router: null,
  inQueryState: false,
  SystemObjects: [], // список системных объектов-констант
  SystemObjectsIDS: [], // список идентификаторов системных объектов
  showShifrs: false, // флаг, указывающий необходимость отображения шифров

  typeNames: {
    operation: 'Операция',
    material: 'Материал',
    work: 'Работа',
    product: 'Изделие',
    library: 'Библиотека',
    property: 'Свойство',
    value: 'Значение',
    unit: 'Ед. измерения',
    product_model: 'Модель изделия',
    product_model_buy: 'Модель ИП',
    product_model_complect: 'Модель комплекта',
    product_model_buy_complect: 'Модель покупного комплекта',
    product_buy: 'Изделие покупное',
    template: 'Шаблон разделения',
    condition: 'Условие',
    condition_otbor: 'Отбор',
    process: 'Тех. процесс',
  },
  shortTypeNames: {
    operation: 'О',
    material: 'М',
    work: 'Р',
    product: 'И',
    library: 'Б',
    property: 'С',
    value: 'З',
    unit: 'Е',
    product_model: 'МИ',
    product_model_buy: 'МИП',
    product_model_buy_complect: 'МИПК',
    product_model_complect: 'МИК',
    product_buy: 'ИП',
    template: 'ШР',
    condition: 'У',
    condition_otbor: 'УО',
    process: 'ТПР',
  },

  canInclude: {
    property: ['value', 'library', 'unit', 'property', 'condition'],
    value: ['property', 'library', 'unit', 'condition'],
    operation: ['property', 'library'],
    //'material':['property','material','library'],
    work: [
      'product',
      'product_model',
      /*'material',*/ 'operation',
      'property',
      'library',
    ],
    product_model: [
      'product_model',
      'product_model_buy',
      'work',
      /*'material',*/ 'operation',
      'property',
      'library',
      'condition',
      'process',
    ],
    product: ['product_model', 'operation', 'library', 'property'],
    library: [
      'product',
      'product_model',
      'product_model_buy',
      'work',
      /*'material',*/ 'library',
      'operation',
      'property',
      'unit',
      'template',
      'value',
      'condition',
      'process',
    ],
    unit: ['property', 'unit'],
    template: ['library', 'operation', 'product'],
    condition: ['product', 'product_model', 'property', 'value', 'library'],
    process: [
      'product_model',
      'property',
      'value',
      'library',
      'process',
      'condition',
    ],
    '': [
      'product',
      'product_model',
      'work',
      /*'material',*/ 'library',
      'operation',
      'property',
      'template',
      'process',
    ],
  },
  complexItems: [
    'work',
    'product',
    'product_model',
    'library',
    /*'material',*/ 'operation',
    'property',
    'value',
    'unit',
    'template',
    'condition',
    'process',
  ], // могут содержать вложенности
  CTasks: {
    // доступные команды для командеров
    go: 'go',
    load: 'load',
    search: 'search',
    activate: 'activate',
    highlight: 'highlight',
    expand: 'expand',
    sort: 'unsort',
  },

  /**
   * Функция, проверяющая может ли содержать один объект другой
   **/
  CanOneObjectIncludeOtherObject: function(parent_elem, elem) {
    // если задан родительский элемент, то необходимо проверить, что он может в себя включать
    // иначе считается, что это корень
    if (parent_elem && elem) {
      var parent_elem_type = parent_elem.get('type');
      var parent_elem_can_include_types = [];
      switch (parent_elem_type) {
        case 'library':
          // Библиотека не является самостоятельным типом объекта, служит только для группировки данных
          // важно понимать, кто реальный родитель библиотеки, и в какой последовательности выставлены родители
          // получить все типы родителей элемента(исключая библиотеки)
          parents_types = App.getAllParentsTypes(parent_elem);
          // если есть родители не библиотеки, то первый встретившийся родитель является основным
          if (parents_types && parents_types.length > 0)
            parent_elem_can_include_types = App.canInclude[parents_types[0]];
          // типы доступные по умолчанию для библиотеки вложенной в корень
          parent_elem_can_include_types = App.canInclude['library'];
          break;
        default:
          parent_elem_can_include_types = App.canInclude[parent_elem_type];
          break;
      }

      var elem_type = elem.get('type');
      switch (elem_type) {
        case 'library':
          // Библиотека может содержать в себе элементы, которые не могут быть помещены в заданный
          // поэтому необходимо получить насколько возможно типы всех доступных детей библиотки
          child_types = App.getAllChildTypes(elem);
          // библиотека может быть помещена в объект, если все типы ее детей являются допустимыми
          // для помещения в объект- контейнер
          if (child_types && child_types.length > 0) {
            child_types = _.uniq(child_types, false);
            for (var i in child_types)
              if (parent_elem_can_include_types.indexOf(child_types[i]) < 0)
                return false;
          }
          return parent_elem_can_include_types.indexOf('library') > -1;
        default:
          return parent_elem_can_include_types.indexOf(elem_type) > -1;
      }
    }
    return true;
  },

  /**
        сохранение/загрузка данных с диалога "Добавление/редактирование элемента" в куках
    **/
  GetEditDialogAutosave: function() {
    var matches = document.cookie.match(
      new RegExp('(?:^|; )' + 'EditDialogSelectedType' + '=([^;]*)'),
    );
    return matches ? decodeURIComponent(matches[1]) : undefined;
  },

  SetEditDialogAutosave: function(selectedType) {
    if (selectedType) {
      document.cookie = 'EditDialogSelectedType=' + selectedType;
    } else document.cookie = 'EditDialogSelectedType=';
  },

  /**
   * Функция, возвращающая список допустимых типов объектов,
   * которые могут быть помещены в указанный объект
   **/
  GetCanIncludeTypes: function(elem_id) {
    var elem = elem_id ? App.dataCollection.findWhere({ _id: elem_id }) : null;
    if (elem) {
      var elem_type = elem.get('type');
      switch (elem_type) {
        case 'library':
          // Библиотека не является самостоятельным типом объекта, служит только для группировки данных
          // важно понимать, кто реальный родитель библиотеки, и в какой последовательности выставлены родители
          // получить все типы родителей элемента(исключая библиотеки)
          parents_types = App.getAllParentsTypes(elem);
          // если есть родители не библиотеки, то первый встретившийся родитель является основным
          if (parents_types && parents_types.length > 0)
            return App.canInclude[parents_types[0]];
          // типы доступные по умолчанию для библиотеки вложенной в корень
          return App.canInclude['library'];
        default:
          return App.canInclude[elem_type];
      }
    }
    return App.canInclude[''];
  },
  /**
   * Получение информации о типе объекта
   * входным параметром является модель элемента
   **/
  DecodeType: function(type, is_buy, is_complect, is_otbor) {
    var result = { type: 'Не определен', short_type: '-' };
    if (is_buy && (type == 'product' || type == 'product_model'))
      type += '_buy';
    if (is_complect && type == 'product_model') type += '_complect';
    if (type == 'condition' && is_otbor) type += '_otbor';
    if (type in this.shortTypeNames) {
      result['type'] = this.typeNames[type];
      result['short_type'] = this.shortTypeNames[type];
    }
    return result;
  },

  /**
   * Определение и установка признака покупного объекта
   **/
  CheckOnBuy: function(elem_id) {
    var self = this;
    var isBuy = false;
    var children = null;
    var parent = null;

    if (elem_id) {
      // получение информации об объекте
      var elem = self.dataCollection.findWhere({ _id: elem_id });
      if (elem) {
        //elem.set('is_buy', false);
        // если элемент это ссылка
        if (elem.has('datalink')) {
          // получить элемент по ссылке
          // проверить не является ли он покупным
          var tmp_elem = self.dataCollection.findWhere({
            _id: elem.get('datalink'),
          });
          if (tmp_elem) {
            // получить детей элемента,
            // проверить нет ли среди них ярлыка на покупное свойство
            children = self.dataCollection.where({
              parent_id: tmp_elem.get('_id'),
            });
            if (tmp_elem.get('type') == 'product') {
              children.forEach(function(el) {
                if (el.get('type') == 'product_model' && el.has('datalink')) {
                  isBuy = self.CheckOnBuy(el.get('datalink'));
                  if (isBuy) return;
                }
              });
            } else {
              children.forEach(function(el) {
                if (
                  el.get('type') == 'property' &&
                  el.has('datalink') &&
                  el.get('datalink') == self.SystemObjects['items']['BUY_PROP']
                ) {
                  isBuy = true;
                  return;
                }
              });
            }
            if (isBuy) {
              elem.set('is_buy', true);
              return true;
            }
          }
        }
        // если в элемент вложена ссылка на покупное свойство
        // или в элемент вложена ссылка на модель. содержащая ссылку на покупное изделие
        children = self.dataCollection.where({ parent_id: elem.get('_id') });
        isBuy = false;
        if (elem.get('type') == 'product') {
          children.forEach(function(el) {
            if (el.get('type') == 'product_model' && el.has('datalink')) {
              isBuy = self.CheckOnBuy(el.get('datalink'));
              if (isBuy) return;
            }
          });
        } else {
          children.forEach(function(el) {
            if (
              el.get('type') == 'property' &&
              el.has('datalink') &&
              el.get('datalink') == self.SystemObjects['items']['BUY_PROP']
            ) {
              isBuy = true;
              return;
            }
          });
        }
        if (isBuy) {
          elem.set('is_buy', true);
          return true;
        }
      }
      return false;
    }
    return false;
  },

  /**
   * Определение и установка признака системности объекта
   **/
  CheckOnSystem: function(elem_id) {
    var self = this;
    var isSystem = false;
    var children = null;
    var parent = null;
    // получение информации об объекте
    var elem = self.dataCollection.findWhere({ _id: elem_id });
    if (elem) {
      elem.set('is_system', false);
      elem.set('is_objective_system', false);

      // если элемент это ссылка
      if (elem.has('datalink')) {
        // получить элемент по ссылке
        // проверить не является ли он системным
        var tmp_elem = self.dataCollection.findWhere({
          _id: elem.get('datalink'),
        });
        if (tmp_elem) {
          // получить детей элемента, проверить нет ли среди них ярлыка на системное свойство
          children = self.dataCollection.where({
            parent_id: tmp_elem.get('_id'),
          });
          isSystem = false;
          children.forEach(function(el) {
            if (
              el.get('type') == 'property' &&
              el.has('datalink') &&
              el.get('datalink') == self.SystemObjects['items']['SYS_PROP']
            ) {
              isSystem = true;
              return;
            }
          });
          if (isSystem) {
            elem.set('is_system', true);
            return true;
          }
          // получить родителя элемента, проверить не является ли он систмной библиотекой
          var parent = self.dataCollection.findWhere({
            _id: tmp_elem.get('parent_id'),
          });
          if (
            parent &&
            parent.get('_id') == self.SystemObjects['items']['SYS_LYB']
          ) {
            elem.set('is_system', true);
            return true;
          }
        }
      }
      // если элемент лежит в систменой папке
      parent = self.dataCollection.findWhere({ _id: elem.get('parent_id') });
      if (
        parent &&
        parent.get('_id') == self.SystemObjects['items']['SYS_LYB']
      ) {
        elem.set('is_system', true);
        return true;
      }
      // если в элемент вложена ссылка на систмное свойство
      children = self.dataCollection.where({ parent_id: elem.get('_id') });
      isSystem = false;
      children.forEach(function(el) {
        if (
          el.get('type') == 'property' &&
          el.has('datalink') &&
          el.get('datalink') == self.SystemObjects['items']['SYS_PROP']
        ) {
          isSystem = true;
          return;
        }
      });
      if (isSystem) {
        elem.set('is_system', true);
        return true;
      }
      // если родитель элемента системный, то элемент считаем косвенно системным
      if (
        parent &&
        (parent.get('is_system') || parent.get('is_objective_system'))
      )
        elem.set('is_objective_system', true);
      return true;
    }
    return false;
  },

  /**
   * Получение доступных опреаций по типу объекта и типу объекта открытого в соседнем проводнике
   * item_type - тип объекта по окоторому кликнули
   * если текущий объект - это ярлык
   * owner_item_type - тип объекта открытого в соседнем окне
   * parent_elem - элемент в котором отображается текущий
   **/
  CMOperations: function(item, is_link, owner_item, parent_elem) {
    var operations = [];
    var item_type = item.get('type');
    if (item.get('status') == 'del') item_type = 'del';
    owner_item_type = owner_item ? owner_item.get('type') : '';
    owner_item_id = owner_item ? owner_item.get('_id') : null;
    switch (item_type) {
      case 'del':
        operations = ['cancel'];
      default:
        if (parent_elem && item.get('parent_id') != parent_elem.get('_id'))
          operations = ['cancel', 'open-in-source', 'redefine'];
        else if (App.CanOneObjectIncludeOtherObject(owner_item, item))
          operations = [
            'copy',
            'add',
            'edit',
            'remove',
            'link',
            'move',
            'cancel',
            'divider',
            'open-tree',
            'open-in-near-window',
            'open-graph',
            'open-calculation',
            'open-specification',
            'create-product',
            'open-complect',
            'create-by-template',
          ];
        else
          operations = [
            'add',
            'edit',
            'remove',
            'cancel',
            'divider',
            'open-tree',
            'open-in-near-window',
            'open-graph',
            'open-calculation',
            'open-specification',
            'create-product',
            'open-complect',
            'create-by-template',
          ];

        // если объект является ярлыком, то накладываем доп. требования
        if (is_link) {
          operations.push('go-to-link');
          // удалить возможность создания ссылки
          /*if(operations.indexOf('edit')>-1)
                            operations.splice(operations.indexOf('edit'), 1);*/
          // удалить возможность редактирования
          if (operations.indexOf('link') > -1)
            operations.splice(operations.indexOf('link'), 1);
          /*// удалить возможность создания изделия
                        if(operations.indexOf('create-product')>-1)
                            operations.splice(operations.indexOf('create-product'), 1);*/
        }

        // нельзя переместить элемент в одного и тогоже родителя
        if (owner_item) {
          var cur_parent_path = owner_item.get('path');
          var cur_row_path = item.get('path')
            ? item.get('path') + '-' + item.get('_id')
            : item.get('_id');
          if (
            cur_parent_path.indexOf(cur_row_path) >= 0 ||
            item.get('parent_id') == owner_item.get('_id') ||
            item.get('_id') == owner_item.get('_id') ||
            !App.CanOneObjectIncludeOtherObject(owner_item, item)
          ) {
            if (operations.indexOf('move') > -1)
              operations.splice(operations.indexOf('move'), 1);
          }
        }

        // новое изделие можно создавать только на базе модели(либо в корне, либо в библиотеке)
        if (
          item_type != 'product_model' ||
          (owner_item && owner_item.get('type') != 'library')
        ) {
          // удалить возможность создания изделия
          if (operations.indexOf('create-product') > -1)
            operations.splice(operations.indexOf('create-product'), 1);
        }

        // новое изделие можно создавать только на базе модели(либо в корне, либо в библиотеке)
        if (
          item.get('_id') != App.SystemObjects['items']['TECH_PROCESS_TEMPLATE']
        ) {
          // удалить возможность создания изделия
          if (operations.indexOf('create-by-template') > -1)
            operations.splice(operations.indexOf('create-by-template'), 1);
        }

        // комплект можно создавать только на базе модели-комплекта
        //if(item_type!="product_model" || !item.get('is_complect'))
        if (item_type != 'product_model' && item_type != 'product') {
          // удалить возможность создания изделия
          if (operations.indexOf('open-complect') > -1)
            operations.splice(operations.indexOf('open-complect'), 1);
        }

        // если объект не является моделью, то необходимо удалять пункт - Открыть граф
        if (item_type != 'product_model' && item_type != 'product') {
          // удалить возможность открывания графа
          if (operations.indexOf('open-graph') > -1)
            operations.splice(operations.indexOf('open-graph'), 1);
        }

        // если объект не является [И], то необходимо удалить пункт калькуляции
        if (item_type != 'product' /* || item.get('is_buy')*/) {
          if (operations.indexOf('open-calculation') > -1)
            operations.splice(operations.indexOf('open-calculation'), 1);
          if (operations.indexOf('open-specification') > -1)
            operations.splice(operations.indexOf('open-specification'), 1);
        }

        // если объект входит в системные константы, то удалять его нельзя
        if (
          (App.SystemObjectsIDS.indexOf(item.get('_id')) > -1 ||
            item.get('is_system')) &&
          operations.indexOf('remove') > -1
        )
          operations.splice(operations.indexOf('remove'), 1);

        // если текущий элемент это свойство = .system, то его нельзя перемещать и копировать
        if (item.get('_id') == App.SystemObjects['items']['SYS_PROP']) {
          if (operations.indexOf('move') > -1)
            operations.splice(operations.indexOf('move'), 1);
          if (operations.indexOf('copy') > -1)
            operations.splice(operations.indexOf('copy'), 1);
          if (
            owner_item &&
            owner_item.get('datalink') &&
            owner_item.get('datalink') != '' &&
            operations.indexOf('link') > -1
          )
            operations.splice(operations.indexOf('link'), 1);
        }

        // запрет копирования и вложения ярлыков напрямую в системную библиотеку
        if (
          owner_item &&
          owner_item.get('_id') == App.SystemObjects['items']['SYS_LYB']
        ) {
          if (item.get('datalink') && item.get('datalink') != '') {
            if (operations.indexOf('move') > -1)
              operations.splice(operations.indexOf('move'), 1);
            if (operations.indexOf('copy') > -1)
              operations.splice(operations.indexOf('copy'), 1);
          }
          if (operations.indexOf('link') > -1)
            operations.splice(operations.indexOf('link'), 1);
        }

        //--------------------------------------------------------------------------------------------------------------------------
        //-----Проверки связанные с покупным свойством---------------------------------------------
        //--------------------------------------------------------------------------------------------------------------------------
        // проверки для системного покупного свойства
        if (item.get('_id') == App.SystemObjects['items']['BUY_PROP']) {
          // покупное свойство нельзя копировать
          if (operations.indexOf('copy') > -1)
            operations.splice(operations.indexOf('copy'), 1);
          // Создать ярлык на покупное свойство можно только в изделии или модели изделия, если они еще не являются покупными
          if (
            ((owner_item &&
              owner_item.get('type') != 'product_model' &&
              owner_item.get('type') != 'product') ||
              !owner_item ||
              owner_item.get('is_buy')) &&
            operations.indexOf('link') > -1
          )
            operations.splice(operations.indexOf('link'), 1);
        }
        // с ярлыком на свойство покупного изделия ничего нельзя делать
        if (item.get('datalink') == App.SystemObjects['items']['BUY_PROP']) {
          if (operations.indexOf('move') > -1)
            operations.splice(operations.indexOf('move'), 1);
          if (operations.indexOf('copy') > -1)
            operations.splice(operations.indexOf('copy'), 1);
          if (operations.indexOf('link') > -1)
            operations.splice(operations.indexOf('link'), 1);
          if (operations.indexOf('remove') > -1)
            operations.splice(operations.indexOf('remove'), 1);
        }
        // если в соседнем окне открыт ярылк на свойство покупного изделия
        // то в такой ярлык ничего нельзя вкладывать
        if (
          owner_item &&
          owner_item.get('datalink') == App.SystemObjects['items']['BUY_PROP']
        ) {
          if (operations.indexOf('move') > -1)
            operations.splice(operations.indexOf('move'), 1);
          if (operations.indexOf('copy') > -1)
            operations.splice(operations.indexOf('copy'), 1);
          if (operations.indexOf('link') > -1)
            operations.splice(operations.indexOf('link'), 1);
        }

        //--------------------------------------------------------------------------------------------------------------------------
        //-----Проверки связанные с изделиями и моделями изделий--------------------------
        //--------------------------------------------------------------------------------------------------------------------------
        // В изделие можно поместить только ссылку на модель(копировать и перемещать нельзя)
        if (
          owner_item &&
          owner_item.get('type') == 'product' &&
          item.get('type') == 'product_model'
        ) {
          if (operations.indexOf('copy') > -1)
            operations.splice(operations.indexOf('copy'), 1);
          if (operations.indexOf('move') > -1)
            operations.splice(operations.indexOf('move'), 1);
        }
        // В любое изделие нельзя вложить И, ИП
        if (
          owner_item &&
          owner_item.get('type') == 'product' &&
          item.get('type') == 'product'
        ) {
          if (operations.indexOf('link') > -1)
            operations.splice(operations.indexOf('link'), 1);
        }
        // В покупное изделие нельзя вложить МИ
        if (
          owner_item &&
          owner_item.get('type') == 'product' &&
          owner_item.get('is_buy') &&
          (item.get('type') == 'product_model' && !item.get('is_buy'))
        ) {
          if (operations.indexOf('link') > -1)
            operations.splice(operations.indexOf('link'), 1);
        }
        // В покупную модель изделия нельзя вложить И, ИП
        if (
          owner_item &&
          owner_item.get('type') == 'product_model' &&
          owner_item.get('is_buy') &&
          item.get('type') == 'product'
        ) {
          if (operations.indexOf('link') > -1)
            operations.splice(operations.indexOf('link'), 1);
        }
        // В покупную модель изделия нельзя вложить МИ
        if (
          owner_item &&
          owner_item.get('type') == 'product_model' &&
          owner_item.get('is_buy') &&
          item.get('type') == 'product_model' &&
          !item.get('is_buy')
        ) {
          if (operations.indexOf('link') > -1)
            operations.splice(operations.indexOf('link'), 1);
        }
        // В непокупное изделие нельзя вкладывтаь обычные свойства
        // В покупное изделие нельзя вкладывать ярылк на свойство покупного изделия
        if (
          owner_item &&
          owner_item.get('type') == 'product' &&
          ((!owner_item.get('is_buy') &&
            item.get('type') == 'property' &&
            item.get('_id') != App.SystemObjects['items']['BUY_PROP'] &&
            item.get('_id') != App.SystemObjects['items']['IN_PROP']) ||
            (owner_item.get('is_buy') &&
              item.get('type') == 'property' &&
              item.get('_id') == App.SystemObjects['items']['BUY_PROP']))
        ) {
          if (operations.indexOf('link') > -1)
            operations.splice(operations.indexOf('link'), 1);
        }

        // Нельзя создавать изделия на основе группирующих моделе. Т.е нельзя вкладывать группирующие модели в изделия
        if (
          owner_item &&
          owner_item.get('type') == 'product' &&
          item.get('type') == 'product_model' &&
          (item.get('is_techno_group') || item.get('is_buy_group'))
        ) {
          if (operations.indexOf('link') > -1)
            operations.splice(operations.indexOf('link'), 1);
          if (operations.indexOf('copy') > -1)
            operations.splice(operations.indexOf('copy'), 1);
          if (operations.indexOf('move') > -1)
            operations.splice(operations.indexOf('move'), 1);
        }

        //--------------------------------------------------------------------------------------------------------------------------
        //-----Системное свойство ОБЪЕМ---------------------------------------------------------------------
        //--------------------------------------------------------------------------------------------------------------------------
        if (item.get('_id') == App.SystemObjects['items']['VOL_PROP']) {
          // системное свойство объем нельзя удалять и копировать
          if (operations.indexOf('remove') > -1)
            operations.splice(operations.indexOf('remove'), 1);
          if (operations.indexOf('copy') > -1)
            operations.splice(operations.indexOf('copy'), 1);

          // ярлык на систмное свойство объем нельзя помещать никуда, кроме  МИ,МИП
          if (
            (owner_item &&
              !/*owner_item.get('type')=='product' ||*/ (
                owner_item.get('type') == 'product_model'
              )) ||
            !owner_item
          ) {
            if (operations.indexOf('link') > -1)
              operations.splice(operations.indexOf('link'), 1);
          }
          // систмное свойство объем нельзя перемещать в И, МИ. ИП. МИП
          else if (
            owner_item &&
            (owner_item.get('type') == 'product' ||
              owner_item.get('type') == 'product_model')
          ) {
            if (operations.indexOf('move') > -1)
              operations.splice(operations.indexOf('move'), 1);
          }
        }
        // ярлык на системное свойство нельзя скопировать и переместить никуда кромеМИ. МИП
        if (item.get('datalink') == App.SystemObjects['items']['VOL_PROP']) {
          if (
            (owner_item &&
              !/*owner_item.get('type')=='product' ||*/ (
                owner_item.get('type') == 'product_model'
              )) ||
            !owner_item
          ) {
            if (operations.indexOf('copy') > -1)
              operations.splice(operations.indexOf('copy'), 1);
            if (operations.indexOf('move') > -1)
              operations.splice(operations.indexOf('move'), 1);
          }
        }

        //--------------------------------------------------------------------------------------------------------------------------
        //-----Шаблоны---------------------------------------------------------------------------------------------
        //--------------------------------------------------------------------------------------------------------------------------
        if (item.get('type') == 'template') {
          // на шаблоны нельзя создавать ярлыки
          if (operations.indexOf('link') > -1)
            operations.splice(operations.indexOf('link'), 1);
          // Шаблоны можно помещать(копировать) только в библиотеки и корень
          if (
            owner_item &&
            (!owner_item.get('type') == 'library' ||
              !this.isParentsNotHasAnyTypeExceptOne(owner_item, 'library'))
          ) {
            if (operations.indexOf('copy') > -1)
              operations.splice(operations.indexOf('copy'), 1);
            if (operations.indexOf('move') > -1)
              operations.splice(operations.indexOf('move'), 1);
          }
        }
        // В шаблон можно поместить только И, ИП, Б, О
        if (
          owner_item &&
          (owner_item.get('type') == 'template' ||
            this.isParentsHasType(owner_item, 'template'))
        ) {
          if (owner_item.get('type') == 'product') {
            if (item.get('type') != 'property') {
              if (operations.indexOf('link') > -1)
                operations.splice(operations.indexOf('link'), 1);
              if (operations.indexOf('copy') > -1)
                operations.splice(operations.indexOf('copy'), 1);
              if (operations.indexOf('move') > -1)
                operations.splice(operations.indexOf('move'), 1);
            }
          } else if (
            item.get('type') != 'product' &&
            item.get('type') != 'operation' &&
            item.get('type') != 'library'
          ) {
            if (operations.indexOf('link') > -1)
              operations.splice(operations.indexOf('link'), 1);
            if (operations.indexOf('copy') > -1)
              operations.splice(operations.indexOf('copy'), 1);
            if (operations.indexOf('move') > -1)
              operations.splice(operations.indexOf('move'), 1);
          } else if (item.get('type') == 'library') {
            if (operations.indexOf('link') > -1)
              operations.splice(operations.indexOf('link'), 1);
          } else if (item.get('type') == 'product') {
            if (operations.indexOf('copy') > -1)
              operations.splice(operations.indexOf('copy'), 1);
            if (operations.indexOf('move') > -1)
              operations.splice(operations.indexOf('move'), 1);
          }
        }

        //--------------------------------------------------------------------------------------------------------------------------
        //-----Системное свойство РАЗДЕЛИТЕЛЬНАЯ ОПЕРАЦИЯ------------------------------------------------------------
        //--------------------------------------------------------------------------------------------------------------------------
        if (item.get('_id') == App.SystemObjects['items']['SEP_PROP']) {
          // системное свойство РАЗДЕЛИТЕЛЬНАЯ ОПЕРАЦИЯ нельзя удалять и копировать
          if (operations.indexOf('remove') > -1)
            operations.splice(operations.indexOf('remove'), 1);
          if (operations.indexOf('copy') > -1)
            operations.splice(operations.indexOf('copy'), 1);

          // системное свойство РАЗДЕЛИТЕЛЬНАЯ ОПЕРАЦИЯ нельзя перемещать никуда кроме корня и библиотек
          if (
            owner_item &&
            (!owner_item.get('type') == 'library' ||
              this.isParentsNotHasAnyTypeExceptOne(owner_item, 'library'))
          ) {
            if (operations.indexOf('move') > -1)
              operations.splice(operations.indexOf('move'), 1);
          }
        }

        //--------------------------------------------------------------------------------------------------------------------------
        //-----Системное значение - (Унаследованное)
        //--------------------------------------------------------------------------------------------------------------------------
        if (
          item.get('_id') ==
          App.SystemObjects['items'][
            'INHERIT_PROP'
          ] /*|| item.get('datalink')==App.SystemObjects['items']['INHERIT_PROP']*/
        ) {
          // системное свойство - (Наследуемое) нельзя удалить и копировать
          if (operations.indexOf('copy') > -1)
            operations.splice(operations.indexOf('copy'), 1);
          if (operations.indexOf('remove') > -1)
            operations.splice(operations.indexOf('remove'), 1);
          if (operations.indexOf('move') > -1)
            operations.splice(operations.indexOf('move'), 1);
        }

        //--------------------------------------------------------------------------------------------------------------------------
        //-----Системное свойство ГРУППИРУЮЩЕЕ-----------------------------------------------------
        //--------------------------------------------------------------------------------------------------------------------------
        if (
          item.get('_id') == App.SystemObjects['items']['TECHNO_GROUP_PROP'] ||
          item.get('_id') == App.SystemObjects['items']['BUY_GROUP_PROP']
        ) {
          // системное свойство ГРУППИРУЮЩЕЕ нельзя удалять и копировать
          if (operations.indexOf('remove') > -1)
            operations.splice(operations.indexOf('remove'), 1);
          if (operations.indexOf('copy') > -1)
            operations.splice(operations.indexOf('copy'), 1);
          if (operations.indexOf('move') > -1)
            operations.splice(operations.indexOf('move'), 1);
        }
        if (
          item.get('datalink') ==
            App.SystemObjects['items']['TECHNO_GROUP_PROP'] ||
          item.get('datalink') == App.SystemObjects['items']['BUY_GROUP_PROP']
        ) {
          // системное свойство ГРУППИРУЮЩЕЕ нельзя удалять и копировать
          if (operations.indexOf('copy') > -1)
            operations.splice(operations.indexOf('copy'), 1);
        }
        if (
          item.get('_id') == App.SystemObjects['items']['TECHNO_GROUP_PROP'] ||
          item.get('datalink') ==
            App.SystemObjects['items']['TECHNO_GROUP_PROP'] ||
          item.get('_id') == App.SystemObjects['items']['BUY_GROUP_PROP'] ||
          item.get('datalink') == App.SystemObjects['items']['BUY_GROUP_PROP']
        ) {
          // системное свойство ГРУППИРУЮЩЕЕ нельзя перемещать никуда кроме моделей
          if (
            !owner_item ||
            (owner_item && !owner_item.get('type') == 'product_model')
          ) {
            if (operations.indexOf('move') > -1)
              operations.splice(operations.indexOf('move'), 1);
            if (operations.indexOf('link') > -1)
              operations.splice(operations.indexOf('link'), 1);
          }
        }

        //---------------------------------------------------------------------------------------------------------------------------
        //-----Системное свойство УСЛОВИЕ------------------------------------------------------------------
        //---------------------------------------------------------------------------------------------------------------------------
        if (
          item.get('type') == 'condition' ||
          this.isParentsHasType(item, 'condition')
        )
          if (operations.indexOf('add') > -1)
            operations.splice(operations.indexOf('add'), 1);
        if (item.get('type') == 'condition') {
          /*// на условия нельзя создавать ярлыки
                if(operations.indexOf('link')>-1)
                        operations.splice(operations.indexOf('link'), 1);*/
          // условия нельзя перемещать никуда кроме моделей
          if (
            !owner_item ||
            (owner_item && !owner_item.get('type') == 'product_model')
          ) {
            if (operations.indexOf('move') > -1)
              operations.splice(operations.indexOf('move'), 1);
            if (operations.indexOf('link') > -1)
              operations.splice(operations.indexOf('link'), 1);
          }
        }
        // в условие можно помещать только ссылки на модели, изделия, свойства, значения свойств
        if (
          owner_item &&
          (owner_item.get('type') == 'condition' ||
            this.isParentsHasType(owner_item, 'condition'))
        ) {
          // запрет на помещение в условие не ярлыка
          if (!item.get('datalink') || item.get('datalink') == '') {
            if (operations.indexOf('copy') > -1)
              operations.splice(operations.indexOf('copy'), 1);
            if (operations.indexOf('move') > -1)
              operations.splice(operations.indexOf('move'), 1);
          }
        }

        // в единицу измерения можно положить ссылку на свойство "комплесная ед. изм.", и больше никакое св-во
        if (owner_item && owner_item.get('type') == 'unit') {
          // запрет на помещение в ед. измерения не ярлыка
          if (!item.get('datalink') || item.get('datalink') == '') {
            if (operations.indexOf('copy') > -1)
              operations.splice(operations.indexOf('copy'), 1);
            if (operations.indexOf('move') > -1)
              operations.splice(operations.indexOf('move'), 1);
          }
          if (
            item.get('type') == 'property' &&
            (item.get('_id') != App.SystemObjects['items']['KOMPLEKS_UNIT'] &&
              item.get('datalink') !=
                App.SystemObjects['items']['KOMPLEKS_UNIT'])
          ) {
            if (operations.indexOf('copy') > -1)
              operations.splice(operations.indexOf('copy'), 1);
            if (operations.indexOf('move') > -1)
              operations.splice(operations.indexOf('move'), 1);
            if (operations.indexOf('link') > -1)
              operations.splice(operations.indexOf('link'), 1);
          }
        }

        break;
    }
    return operations;
  },

  /**
   * Получение доступных опреаций для контрольной панели  по типу объекта и типу объекта открытого в соседнем проводнике
   * item - объект по окоторому кликнули
   * is_link - если текущий объект - это ярлык
   * owner_item - объект открытый в соседнем окне
   * parent_elem - элемент из под которого открыли текущий
   **/
  CPOperations: function(item, is_link, owner_item, parent_elem) {
    var operations = [];
    var item_type = item.get('type');
    if (item.get('status') == 'del') item_type = 'del';
    owner_item_type = owner_item ? owner_item.get('type') : '';
    owner_item_id = owner_item ? owner_item.get('_id') : null;

    switch (item_type) {
      case 'del':
        operations = [];
        break;
      default:
        if (parent_elem && item.get('parent_id') != parent_elem.get('_id'))
          operations = [];
        else if (App.CanOneObjectIncludeOtherObject(owner_item, item))
          operations = [
            'copy',
            'add',
            'edit',
            'remove',
            'link',
            'move',
            'create-product',
            'open-complect',
          ];
        else
          operations = [
            'add',
            'edit',
            'remove',
            'create-product',
            'open-complect',
          ];

        // если объект является ярлыком, то накладываем доп. требования
        if (is_link) {
          // удалить возможность создания ссылки
          /*if(operations.indexOf('edit')>-1)
                        operations.splice(operations.indexOf('edit'), 1);*/
          // удалить возможность редактирования
          if (operations.indexOf('link') > -1)
            operations.splice(operations.indexOf('link'), 1);
          /*// удалить возможность создания изделия
                    if(operations.indexOf('create-product')>-1)
                        operations.splice(operations.indexOf('create-product'), 1);*/
        }

        // новое изделие можно создавать только на базе модели(либо в корне, либо в библиотеке)
        if (
          item_type != 'product_model' ||
          (owner_item && owner_item.get('type') != 'library')
        ) {
          // удалить возможность создания изделия
          if (operations.indexOf('create-product') > -1)
            operations.splice(operations.indexOf('create-product'), 1);
        }

        // комплект можно создавать только на базе модели-комплекта
        //if( item_type!="product_model" || !item.get('is_complect'))
        if (item_type != 'product_model' && item_type != 'product') {
          // удалить возможность создания изделия
          if (operations.indexOf('open-complect') > -1)
            operations.splice(operations.indexOf('open-complect'), 1);
        }

        // нельзя переместить элемент в одного и тогоже родителя
        if (owner_item) {
          var cur_parent_path = owner_item.get('path');
          var cur_row_path = item.get('path')
            ? item.get('path') + '-' + item.get('_id')
            : item.get('_id');
          if (
            cur_parent_path.indexOf(cur_row_path) >= 0 ||
            item.get('parent_id') == owner_item.get('_id') ||
            item.get('_id') == owner_item.get('_id') ||
            !App.CanOneObjectIncludeOtherObject(owner_item, item)
          ) {
            if (operations.indexOf('move') > -1)
              operations.splice(operations.indexOf('move'), 1);
          }
        }

        // если объект входит в системные константы, то удалять его нельзя
        if (
          App.SystemObjectsIDS.indexOf(item.get('_id')) > -1 &&
          operations.indexOf('remove') > -1
        )
          operations.splice(operations.indexOf('remove'), 1);

        if (
          item.get('is_system') &&
          !has_access('esud', 'o') &&
          operations.indexOf('remove') > -1
        )
          operations.splice(operations.indexOf('remove'), 1);

        // если текущий элемент это свойство = .system, то его нельзя перемещать и копировать
        if (item.get('_id') == App.SystemObjects['items']['SYS_PROP']) {
          if (operations.indexOf('move') > -1)
            operations.splice(operations.indexOf('move'), 1);
          if (operations.indexOf('copy') > -1)
            operations.splice(operations.indexOf('copy'), 1);
          if (
            owner_item &&
            owner_item.get('datalink') &&
            owner_item.get('datalink') != '' &&
            operations.indexOf('link') > -1
          )
            operations.splice(operations.indexOf('link'), 1);
        }
        // запрет копирования и вложения ярлыков напрямую в системную библиотеку
        if (
          owner_item &&
          owner_item.get('_id') == App.SystemObjects['items']['SYS_LYB']
        ) {
          if (item.get('datalink') && item.get('datalink') != '') {
            if (operations.indexOf('move') > -1)
              operations.splice(operations.indexOf('move'), 1);
            if (operations.indexOf('copy') > -1)
              operations.splice(operations.indexOf('copy'), 1);
          }
          if (operations.indexOf('link') > -1)
            operations.splice(operations.indexOf('link'), 1);
        }

        //--------------------------------------------------------------------------------------------------------------------------
        //-----Проверки связанные с покупным свойством---------------------------------------------
        //--------------------------------------------------------------------------------------------------------------------------
        // проверки для системного покупного свойства
        if (item.get('_id') == App.SystemObjects['items']['BUY_PROP']) {
          // покупное свойство нельзя копировать
          if (operations.indexOf('copy') > -1)
            operations.splice(operations.indexOf('copy'), 1);
          // Создать ярлык на покупное свойство можно только в изделии или модели изделия, если они еще не являются покупными
          if (
            ((owner_item &&
              owner_item.get('type') != 'product_model' &&
              owner_item.get('type') != 'product') ||
              !owner_item ||
              owner_item.get('is_buy')) &&
            operations.indexOf('link') > -1
          )
            operations.splice(operations.indexOf('link'), 1);
        }
        // с ярлыком на свойство покупного изделия ничего нельзя делать
        if (item.get('datalink') == App.SystemObjects['items']['BUY_PROP']) {
          if (operations.indexOf('move') > -1)
            operations.splice(operations.indexOf('move'), 1);
          if (operations.indexOf('copy') > -1)
            operations.splice(operations.indexOf('copy'), 1);
          if (operations.indexOf('link') > -1)
            operations.splice(operations.indexOf('link'), 1);
          if (operations.indexOf('remove') > -1)
            operations.splice(operations.indexOf('remove'), 1);
        }
        // если в соседнем окне открыт ярылк на свойство покупного изделия
        // то в такой ярлык ничего нельзя вкладывать
        if (
          owner_item &&
          owner_item.get('datalink') == App.SystemObjects['items']['BUY_PROP']
        ) {
          if (operations.indexOf('move') > -1)
            operations.splice(operations.indexOf('move'), 1);
          if (operations.indexOf('copy') > -1)
            operations.splice(operations.indexOf('copy'), 1);
          if (operations.indexOf('link') > -1)
            operations.splice(operations.indexOf('link'), 1);
        }

        //--------------------------------------------------------------------------------------------------------------------------
        //-----Проверки связанные с изделиями и моделями изделий--------------------------
        //--------------------------------------------------------------------------------------------------------------------------
        // В изделие можно поместить только ссылку на модель(копировать и перемещать нельзя)
        if (
          owner_item &&
          owner_item.get('type') == 'product' &&
          item.get('type') == 'product_model'
        ) {
          if (operations.indexOf('copy') > -1)
            operations.splice(operations.indexOf('copy'), 1);
          if (operations.indexOf('move') > -1)
            operations.splice(operations.indexOf('move'), 1);
        }
        // В любое изделие нельзя вложить И, ИП
        if (
          owner_item &&
          owner_item.get('type') == 'product' &&
          item.get('type') == 'product'
        ) {
          if (operations.indexOf('link') > -1)
            operations.splice(operations.indexOf('link'), 1);
        }
        // В покупное изделие нельзя вложить МИ
        if (
          owner_item &&
          owner_item.get('type') == 'product' &&
          owner_item.get('is_buy') &&
          (item.get('type') == 'product_model' && !item.get('is_buy'))
        ) {
          if (operations.indexOf('link') > -1)
            operations.splice(operations.indexOf('link'), 1);
        }
        // В покупную модель изделия нельзя вложить И, ИП
        if (
          owner_item &&
          owner_item.get('type') == 'product_model' &&
          owner_item.get('is_buy') &&
          item.get('type') == 'product'
        ) {
          if (operations.indexOf('link') > -1)
            operations.splice(operations.indexOf('link'), 1);
        }
        // В покупную модель изделия нельзя вложить МИ
        if (
          owner_item &&
          owner_item.get('type') == 'product_model' &&
          owner_item.get('is_buy') &&
          item.get('type') == 'product_model' &&
          !item.get('is_buy')
        ) {
          if (operations.indexOf('link') > -1)
            operations.splice(operations.indexOf('link'), 1);
        }
        // В непокупное изделие нельзя вкладывтаь обычные свойства
        // В покупное изделие нельзя вкладывать ярылк на свойство покупного изделия
        if (
          owner_item &&
          owner_item.get('type') == 'product' &&
          ((!owner_item.get('is_buy') &&
            item.get('type') == 'property' &&
            item.get('_id') != App.SystemObjects['items']['BUY_PROP'] &&
            item.get('_id') != App.SystemObjects['items']['IN_PROP']) ||
            (owner_item.get('is_buy') &&
              item.get('type') == 'property' &&
              item.get('_id') == App.SystemObjects['items']['BUY_PROP']))
        ) {
          if (operations.indexOf('link') > -1)
            operations.splice(operations.indexOf('link'), 1);
        }

        // Нельзя создавать изделия на основе группирующих моделей. Т.е нельзя вкладывать группирующие модели в изделия
        if (
          owner_item &&
          owner_item.get('type') == 'product' &&
          item.get('type') == 'product_model' &&
          (item.get('is_techno_group') || item.get('is_buy_group'))
        ) {
          if (operations.indexOf('link') > -1)
            operations.splice(operations.indexOf('link'), 1);
          if (operations.indexOf('copy') > -1)
            operations.splice(operations.indexOf('copy'), 1);
          if (operations.indexOf('move') > -1)
            operations.splice(operations.indexOf('move'), 1);
        }

        //--------------------------------------------------------------------------------------------------------------------------
        //-----Системное свойство ОБЪЕМ---------------------------------------------------------------------
        //--------------------------------------------------------------------------------------------------------------------------
        if (item.get('_id') == App.SystemObjects['items']['VOL_PROP']) {
          // системное свойство объем нельзя удалять и копировать
          if (operations.indexOf('remove') > -1)
            operations.splice(operations.indexOf('remove'), 1);
          if (operations.indexOf('copy') > -1)
            operations.splice(operations.indexOf('copy'), 1);

          // ярлык на систмное свойство объем нельзя помещать никуда, кроме  МИ,МИП
          if (
            (owner_item &&
              !/*owner_item.get('type')=='product' ||*/ (
                owner_item.get('type') == 'product_model'
              )) ||
            !owner_item
          ) {
            if (operations.indexOf('link') > -1)
              operations.splice(operations.indexOf('link'), 1);
          }
          // систмное свойство объем нельзя перемещать в И, МИ. ИП. МИП
          else if (
            owner_item &&
            (owner_item.get('type') == 'product' ||
              owner_item.get('type') == 'product_model')
          ) {
            if (operations.indexOf('move') > -1)
              operations.splice(operations.indexOf('move'), 1);
          }
        }
        // ярлык на системное свойство нельзя скопировать и переместить никуда кромеМИ. МИП
        if (item.get('datalink') == App.SystemObjects['items']['VOL_PROP']) {
          if (
            (owner_item &&
              !/*owner_item.get('type')=='product' ||*/ (
                owner_item.get('type') == 'product_model'
              )) ||
            !owner_item
          ) {
            if (operations.indexOf('copy') > -1)
              operations.splice(operations.indexOf('copy'), 1);
            if (operations.indexOf('move') > -1)
              operations.splice(operations.indexOf('move'), 1);
          }
        }

        //--------------------------------------------------------------------------------------------------------------------------
        //-----Шаблоны---------------------------------------------------------------------------------------------
        //--------------------------------------------------------------------------------------------------------------------------
        if (item.get('type') == 'template') {
          // на шаблоны нельзя создавать ярлыки
          if (operations.indexOf('link') > -1)
            operations.splice(operations.indexOf('link'), 1);
          // Шаблоны можно помещать(копировать) только в библиотеки и корень
          if (
            owner_item &&
            (!owner_item.get('type') == 'library' ||
              !this.isParentsNotHasAnyTypeExceptOne(owner_item, 'library'))
          ) {
            if (operations.indexOf('copy') > -1)
              operations.splice(operations.indexOf('copy'), 1);
            if (operations.indexOf('move') > -1)
              operations.splice(operations.indexOf('move'), 1);
          }
        }
        // В шаблон можно поместить только И, ИП, Б, О
        if (
          owner_item &&
          (owner_item.get('type') == 'template' ||
            this.isParentsHasType(owner_item, 'template'))
        ) {
          // в изделие шаблона можно помещать свойства
          if (owner_item.get('type') == 'product') {
            if (item.get('type') != 'property') {
              if (operations.indexOf('link') > -1)
                operations.splice(operations.indexOf('link'), 1);
              if (operations.indexOf('copy') > -1)
                operations.splice(operations.indexOf('copy'), 1);
              if (operations.indexOf('move') > -1)
                operations.splice(operations.indexOf('move'), 1);
            }
          } else if (
            item.get('type') != 'product' &&
            item.get('type') != 'operation' &&
            item.get('type') != 'library'
          ) {
            if (operations.indexOf('link') > -1)
              operations.splice(operations.indexOf('link'), 1);
            if (operations.indexOf('copy') > -1)
              operations.splice(operations.indexOf('copy'), 1);
            if (operations.indexOf('move') > -1)
              operations.splice(operations.indexOf('move'), 1);
          } else if (item.get('type') == 'library') {
            if (operations.indexOf('link') > -1)
              operations.splice(operations.indexOf('link'), 1);
          } else if (item.get('type') == 'product') {
            if (operations.indexOf('copy') > -1)
              operations.splice(operations.indexOf('copy'), 1);
            if (operations.indexOf('move') > -1)
              operations.splice(operations.indexOf('move'), 1);
          }
        }

        //--------------------------------------------------------------------------------------------------------------------------
        //-----Системное свойство РАЗДЕЛИТЕЛЬНАЯ ОПЕРАЦИЯ------------------------------------------------------------
        //--------------------------------------------------------------------------------------------------------------------------
        if (item.get('_id') == App.SystemObjects['items']['SEP_PROP']) {
          // системное свойство РАЗДЕЛИТЕЛЬНАЯ ОПЕРАЦИЯ нельзя удалять и копировать
          if (operations.indexOf('remove') > -1)
            operations.splice(operations.indexOf('remove'), 1);
          if (operations.indexOf('copy') > -1)
            operations.splice(operations.indexOf('copy'), 1);

          // системное свойство РАЗДЕЛИТЕЛЬНАЯ ОПЕРАЦИЯ нельзя перемещать никуда кроме корня и библиотек
          if (
            owner_item &&
            (!owner_item.get('type') == 'library' ||
              this.isParentsNotHasAnyTypeExceptOne(owner_item, 'library'))
          ) {
            if (operations.indexOf('move') > -1)
              operations.splice(operations.indexOf('move'), 1);
          }
          /*// ярлык на систмное свойство РАЗДЕЛИТЕЛЬНАЯ ОПЕРАЦИЯ  нельзя помещать никуда, кроме операций
                if((owner_item && !(owner_item.get('type')=='operation' || this.isParentsHasType(owner_item, 'operation') )) || !owner_item)
                {
                    if(operations.indexOf('link')>-1)
                        operations.splice(operations.indexOf('link'), 1);
                }*/
        }

        //--------------------------------------------------------------------------------------------------------------------------
        //-----Системное значение - (Унаследованное)
        //--------------------------------------------------------------------------------------------------------------------------
        if (
          item.get('_id') ==
          App.SystemObjects['items'][
            'INHERIT_PROP'
          ] /*|| item.get('datalink')==App.SystemObjects['items']['INHERIT_PROP']*/
        ) {
          // системное свойство - (Наследуемое) нельзя удалить и копировать
          if (operations.indexOf('copy') > -1)
            operations.splice(operations.indexOf('copy'), 1);
          if (operations.indexOf('remove') > -1)
            operations.splice(operations.indexOf('remove'), 1);
          if (operations.indexOf('move') > -1)
            operations.splice(operations.indexOf('move'), 1);
        }

        //--------------------------------------------------------------------------------------------------------------------------
        //-----Системное свойство ГРУППИРУЮЩЕЕ-----------------------------------------------------
        //--------------------------------------------------------------------------------------------------------------------------
        if (
          item.get('_id') == App.SystemObjects['items']['TECHNO_GROUP_PROP'] ||
          item.get('_id') == App.SystemObjects['items']['BUY_GROUP_PROP']
        ) {
          // системное свойство ГРУППИРУЮЩЕЕ нельзя удалять и копировать
          if (operations.indexOf('remove') > -1)
            operations.splice(operations.indexOf('remove'), 1);
          if (operations.indexOf('copy') > -1)
            operations.splice(operations.indexOf('copy'), 1);
          if (operations.indexOf('move') > -1)
            operations.splice(operations.indexOf('move'), 1);
        }
        if (
          item.get('datalink') ==
            App.SystemObjects['items']['TECHNO_GROUP_PROP'] ||
          item.get('datalink') == App.SystemObjects['items']['BUY_GROUP_PROP']
        ) {
          // системное свойство ГРУППИРУЮЩЕЕ нельзя удалять и копировать
          if (operations.indexOf('copy') > -1)
            operations.splice(operations.indexOf('copy'), 1);
        }
        if (
          item.get('_id') == App.SystemObjects['items']['TECHNO_GROUP_PROP'] ||
          item.get('datalink') ==
            App.SystemObjects['items']['TECHNO_GROUP_PROP'] ||
          item.get('_id') == App.SystemObjects['items']['BUY_GROUP_PROP'] ||
          item.get('datalink') == App.SystemObjects['items']['BUY_GROUP_PROP']
        ) {
          // системное свойство ГРУППИРУЮЩЕЕ нельзя перемещать никуда кроме моделей
          if (
            !owner_item ||
            (owner_item && !owner_item.get('type') == 'product_model')
          ) {
            if (operations.indexOf('move') > -1)
              operations.splice(operations.indexOf('move'), 1);
            if (operations.indexOf('link') > -1)
              operations.splice(operations.indexOf('link'), 1);
          }
        }

        //---------------------------------------------------------------------------------------------------------------------------
        //-----Системное свойство УСЛОВИЕ------------------------------------------------------------------
        //---------------------------------------------------------------------------------------------------------------------------
        if (
          item.get('type') == 'condition' ||
          this.isParentsHasType(item, 'condition')
        )
          if (operations.indexOf('add') > -1)
            operations.splice(operations.indexOf('add'), 1);

        if (item.get('type') == 'condition') {
          /*// на условия нельзя создавать ярлыки
                if(operations.indexOf('link')>-1)
                        operations.splice(operations.indexOf('link'), 1);*/
          // условия нельзя перемещать никуда кроме моделей
          if (
            !owner_item ||
            (owner_item && !owner_item.get('type') == 'product_model')
          ) {
            if (operations.indexOf('move') > -1)
              operations.splice(operations.indexOf('move'), 1);
            if (operations.indexOf('link') > -1)
              operations.splice(operations.indexOf('link'), 1);
          }
        }
        // в условие можно помещать только ссылки на модели, изделия, свойства, значения свойств
        if (
          owner_item &&
          (owner_item.get('type') == 'condition' ||
            this.isParentsHasType(owner_item, 'condition'))
        ) {
          // запрет на помещение в условие не ярлыка
          if (!item.get('datalink') || item.get('datalink') == '') {
            if (operations.indexOf('copy') > -1)
              operations.splice(operations.indexOf('copy'), 1);
            if (operations.indexOf('move') > -1)
              operations.splice(operations.indexOf('move'), 1);
          }
        }

        // в единицу измерения можно положить ссылку на свойство "комплесная ед. изм.", и больше никакое св-во
        if (owner_item && owner_item.get('type') == 'unit') {
          // запрет на помещение в ед. измерения не ярлыка
          if (!item.get('datalink') || item.get('datalink') == '') {
            if (operations.indexOf('copy') > -1)
              operations.splice(operations.indexOf('copy'), 1);
            if (operations.indexOf('move') > -1)
              operations.splice(operations.indexOf('move'), 1);
          }
          if (
            item.get('type') == 'property' &&
            (item.get('_id') != App.SystemObjects['items']['KOMPLEKS_UNIT'] &&
              item.get('datalink') !=
                App.SystemObjects['items']['KOMPLEKS_UNIT'])
          ) {
            if (operations.indexOf('copy') > -1)
              operations.splice(operations.indexOf('copy'), 1);
            if (operations.indexOf('move') > -1)
              operations.splice(operations.indexOf('move'), 1);
            if (operations.indexOf('link') > -1)
              operations.splice(operations.indexOf('link'), 1);
          }
        }

        break;
    }
    return operations;
  },

  /**
   *  Инициализация необходимых объектов
   **/
  initialize: function(data, system_objects) {
    //console.log(JSON.stringify(data));
    $.ajaxSetup({ timeout: 50000 });
    $.ajaxSetup({ suppressErrors: true });

    // console.log(JSON.stringify(data));
    this.dataCollection = new App.Collections.ItemsCollection(data);
    this.Route = new AppRouter();
    this.Commanders = {
      c1: new App.Views.Commander({
        el: '#commander1',
        collection: this.dataCollection,
      }),
      c2: new App.Views.Commander({
        el: '#commander2',
        collection: this.dataCollection,
      }),
    };
    Backbone.history.start();
    Backbone.on('saveUrlHistory', this.onSaveHistory, this);
    $('#esud').show();

    // системные объекты
    this.SystemObjects = system_objects;
    for (var i in system_objects['items_detail'])
      this.SystemObjectsIDS.push(system_objects['items_detail'][i]['_id']);

    // глобальное событие на изменение данных в основной коллекции данных
    Backbone.on(
      'control:refreshDataCollection',
      this.onRefreshCollectionData,
      this,
    );

    // обработка события разворота на весь экран
    $('.lnk-full-screen').click(function() {
      var el = $(this);
      if (el.data('val') == 'min') {
        el.data('val', 'max');
        el.html('выход из полноэкранного режима ');
      } else {
        el.data('val', 'min');
        el.html('на весь экран');
      }
      Routine.toggleFullScreen();
    });

    $('.lnk-collapse').click(function() {
      var el = $(this);
      if (el.data('val') == 'min') {
        el.data('val', 'max');
        el.html('свернуть');
        $('.main-control-panel').hide();
        $('#main-header').hide();
        $('.esud-wrapper').addClass('minimaize-height');
        $('.header-divider').hide();
      } else {
        el.data('val', 'min');
        el.html('развернуть');
        $('.main-control-panel').show();
        $('#main-header').show();
        $('.esud-wrapper').removeClass('minimaize-height');
        $('.header-divider').show();
      }
    });
  },

  /**
   * Проверка наличия среди родителей элемента указанного типа
   **/
  isParentsHasType: function(elem, type) {
    var parent_id = elem.get('parent_id');
    if (parent_id) {
      var count = 0;
      while (parent_id && count < 1000) {
        var curItem = this.dataCollection.findWhere({ _id: parent_id });
        if (curItem) {
          if (curItem.get('type') == type) return true;
          parent_id = curItem.get('parent_id');
        } else return false;
        ++count;
      }
    }
    return false;
  },

  /**
   * Получение певого parenta у которого тип соответствует указанному
   **/
  getFirstParentByType: function(elem, type) {
    var parent_id = elem.get('parent_id');
    if (parent_id) {
      var count = 0;
      while (parent_id && count < 1000) {
        var curItem = this.dataCollection.findWhere({ _id: parent_id });
        if (curItem) {
          if (curItem.get('type') == type) return curItem;
          parent_id = curItem.get('parent_id');
        } else return null;
        ++count;
      }
    }
    return null;
  },

  /**
   * Проверка что среди родителей элемента нет типов, кроме указанного
   **/
  isParentsNotHasAnyTypeExceptOne: function(elem, type) {
    var parent_id = elem.get('parent_id');
    if (parent_id) {
      var count = 0;
      while (parent_id && count < 1000) {
        var curItem = this.dataCollection.findWhere({ _id: parent_id });
        if (curItem) {
          if (curItem.get('type') != type) return false;
          parent_id = curItem.get('parent_id');
        } else return true;
        ++count;
      }
    }
    return true;
  },

  /**
   * Получить список всех типов-родителей элемента
   * библиотеки не учитываются
   **/
  getAllParentsTypes: function(elem) {
    var result = [];
    if (elem) {
      var parent_id = elem.get('parent_id');
      if (parent_id) {
        var count = 0;
        while (parent_id && count < 1000) {
          var curItem = this.dataCollection.findWhere({ _id: parent_id });
          if (curItem) {
            if (
              result.indexOf(curItem.get('type')) < 0 &&
              curItem.get('type') != 'library'
            )
              result.push(curItem.get('type'));
            parent_id = curItem.get('parent_id');
          } else return result;
          ++count;
        }
      }
    }
    return result;
  },

  /**
   * Получить список всех доступных типов-детей элемента (только на первом уровне)
   * библиотеки не учитываются (имеется ввиду что библиотеки сморятся вниз до самого конца, пока есть данные)
   **/
  getAllChildTypes: function(elem) {
    var result = [];
    if (elem) {
      var childs = this.dataCollection.where({ parent_id: elem.get('_id') });
      childs.forEach(function(el) {
        if (!el.has('status') || el.get('status') != 'del')
          result.push(el.get('type'));
        if (el.get('type') == 'library')
          result = result.concat(App.getAllChildTypes(el));
      });
    }
    return result;
  },

  /**
   ** Обработка события на обновление данных в основной коллекции данных
   ** Функция строит дерево из данных коллекции
   **/
  onRefreshCollectionData: function() {
    // подготовка данных
    var start = new Date().getTime();
    var result = JSON.parse(JSON.stringify(this.dataCollection));
    var data_result = { data: {}, childs: {} };
    for (var i in result) {
      var row = result[i];
      if (!(row['_id'] in data_result['data'])) {
        data_result['data'][row['_id']] = row;
        if (!(row['parent_id'] in data_result['childs']))
          data_result['childs'][row['parent_id']] = [];
        data_result['childs'][row['parent_id']].push(row['_id']);
      }
    }
    this.dataCollectionArray = data_result;
    var end = new Date().getTime();
    var time = end - start;
  },

  /**
   * Функция получения списка значений и ед. измерения для объекта
   * входным параметром является дерево, построенное в -  buildDataTree
   **/
  getUnitsAndValues: function(data, units, values) {
    if (data) {
      for (var j in data.children) {
        if (
          data.children[j]['node']['status'] != 'del' &&
          data.children[j]['node'] != 'condition'
        ) {
          if (data.children[j]['node']['type'] == 'unit') {
            units.push(data.children[j]['node']);
          }
          if (data.children[j]['node']['type'] == 'value') {
            values.push(data.children[j]['node']);
          }
          var nunits = [];
          var nvalues = [];
          App.getUnitsAndValues(data.children[j], nunits, nvalues);
          if (
            data.children[j]['node']['type'] == 'value' &&
            nunits.length > 0
          ) {
            data.children[j]['node']['selfunit'] = nunits[0];
          }
          for (var k in nunits) units.push(nunits[k]);
          for (var k in nvalues) values.push(nvalues[k]);
        }
      }
    }
  },

  /**
   * Получить список узлов, ссылки которых удовлетворяют условиям
   **/
  findByLink: function(data, link_id, result) {
    for (var j in data.children) {
      if (data.children[j]['node']['status'] != 'del') {
        if (
          data.children[j]['node']['datalink'] &&
          data.children[j]['node']['datalink'] == link_id
        )
          result.push(data.children[j]);
        var nresult = [];
        App.findByLink(data.children[j], link_id, nresult);
        //if(nresult.length>0)
        for (var k in nresult) result.push(nresult[k]);
      }
    }
  },

  /**
   ** Рекурсивная фукнуия построения дерева из данных коллекции
   **/
  buildDataTree: function(list, elem_id, deep) {
    // Функция получения всех детей первого уровня элемента
    function get_childs(list, elem_id) {
      var result = [];
      if (elem_id in list['childs'] && list['childs'][elem_id].length > 0) {
        var childs_id = list['childs'][elem_id];
        for (var i in childs_id) {
          if (childs_id[i] in list['data'])
            result.push(list['data'][childs_id[i]]);
        }
      }
      return result;
    }

    // Функция проверки наличия детей у элемента
    function has_childs(list, elem_id) {
      if (elem_id in list['childs'] && list['childs'][elem_id].length > 0)
        return true;
      return false;
    }

    if (list && 'data' in list) {
      // если достигнута вложенность более 200
      if (deep > 200) {
        console.log(
          'Ошибка! Достигнут предельный уровень вложенности данных. Допустимы лимит: 200 уровней.:' +
            elem_id.toString(),
        );
        return null;
      }
      var node = null;
      var result = { node: null, children: [] };
      if (elem_id) {
        if (!(elem_id in list['data'])) return { node: null, children: [] };
        node = list['data'][elem_id];
        result = { node: node, children: [] };
        //----------------с мержингом по ссылкам-----
        if (node) {
          if (
            'datalink' in node &&
            node['datalink'] &&
            (node['type'] != 'property' || !has_childs(list, node['_id']))
          ) {
            // строим дерево для основного элемента
            var res = App.buildDataTree(list, node['datalink'], deep + 1);
            if (!res) res = { node: null, children: [] };

            if (res['node'] && 'properties' in res['node'])
              node['properties'] = res['node']['properties'];

            // вытягиваем деревья для чайлдов линка
            var children = get_childs(list, elem_id);
            var child_tree = [];
            for (var c in children) {
              var ce = App.buildDataTree(list, children[c]['_id'], deep + 1);
              if (ce) child_tree.push(ce);
            }
            // мержим
            var res_childs = [];
            for (var r in res['children']) {
              var is_find = false;
              for (var c in child_tree) {
                if (
                  res['children'][r]['node']['name'] ==
                    child_tree[c]['node']['name'] &&
                  res['children'][r]['node']['type'] ==
                    child_tree[c]['node']['type']
                ) {
                  is_find = true;
                  res_childs.push(child_tree[c]);
                  //child_tree.remove(c);
                  child_tree.splice(c, 1);
                  break;
                }
              }
              if (!is_find) res_childs.push(res['children'][r]);
            }
            for (var c in child_tree) res_childs.push(child_tree[c]);
            result['children'] = res_childs;
          } else {
            var children = get_childs(list, elem_id);
            var child_tree = [];
            for (var c in children) {
              var ce = App.buildDataTree(list, children[c]['_id'], deep + 1);
              if (ce) child_tree.push(ce);
            }
            result['children'] = child_tree;
          }
        } else return null;
        //-----------

        /*
                //-------------------без мержинга по ссылкам------
                var children = get_childs(list, elem_id);
                var child_tree = [];
                for(var c in children)
                {
                    var ce = App.buildDataTree(list,children[c]["_id"], deep+1);
                    if(ce)
                        child_tree.push(ce);
                }
                result['children'] = child_tree;
                //-----------------
                */
      } else {
        var children = get_childs(list, elem_id);
        var child_tree = [];
        for (var c in children) {
          var ce = App.buildDataTree(list, children[c]['_id'], deep + 1);
          if (ce) child_tree.push(ce);
        }
        result['children'] = child_tree;
      }
      return result;
    }
    return null;
  },

  /**
   ** Обновление URL для истории
   **/
  onSaveHistory: function(e) {
    // замена истории происходит, только если система находится не в состоянии выолпнения запроса
    //console.log(this.inQueryState);
    //if(!this.inQueryState)
    {
      var query = [];
      for (var i in this.Commanders) {
        query.push(i + '__' + this.Commanders[i].getUrl());
        query.push(
          i + '__activate__' + (this.Commanders[i].isActive ? 'true' : 'false'),
        );
        query.push(
          i +
            '__highlight__' +
            (this.Commanders[i].highlightElem
              ? this.Commanders[i].highlightElem
              : ''),
        );
        query.push(
          i + '__expand__' + (this.Commanders[i].isExpand ? 'true' : 'false'),
        );
        query.push(
          i + '__sort__' + (this.Commanders[i].isSort ? 'true' : 'false'),
        );
      }
      App.Route.navigate('/' + query.join('&'), false);
    }
  },

  /**
   *  Выполнение запроса
   **/
  refreshData: function(query) {
    for (var i in this.Commanders)
      this.Commanders[i].doTask(this.CTasks.load, null, false, false);
  },

  /**
   *  Выполнение запроса
   * c1_go_rtet3553+c2_search_abs
   * c1_load_data+c2_search_abs
   **/
  doQuery: function(query) {
    var self = this;
    this.inQueryState = true;

    // функция для запуска подготовленной команды
    function runCommands(commands) {
      if (commands && commands.length > 0)
        for (var i in commands) {
          var command = commands[i];
          if (command['commander'] in self.Commanders)
            self.Commanders[command['commander']].doTask(
              command['task'],
              command['data'],
              false,
              false,
            );
        }
    }

    var tmpCommands = query.split('&');
    // если запрос некорректен, то ничего не делаем
    if (tmpCommands.length > 0) {
      var queue = [];
      // разбор команд
      for (var i in tmpCommands) {
        var curCommand = tmpCommands[i].split('__');
        if (curCommand.length > 2)
          queue.push({
            commander: curCommand[0],
            task: curCommand[1],
            data: curCommand[2],
          });
      }

      // запуск команд на выполнение
      //console.log(JSON.stringify(queue));
      runCommands(queue);
      this.inQueryState = false;
    }
  },
};
