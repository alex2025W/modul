///------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
/// Контрол отображения формы построения комплекта
///------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
App.Views.DataViewComplectBuilder = Backbone.View.extend({
  el: $("#esud_complect_builder"),
  data: null, // основные данные
  specification_list: null, // список всех возможных спецификаций
  linear_data: null,
  openedItems:{}, // список идентификаторов объектов, которые необходимо раскрыть/скрыть
  collapsed: false,
  current_item: null,
  show_only_options: true,   // флаг отображения только опциональных свойств
  use_conditions: true,   // флаг учитывания условий при проверках
  templates: {
    template: _.template($("#directoryTreeTemplate").html()),
    product_template:_.template($("#itemProductTreeTemplate").html()),
    model_template:_.template($("#itemModelTreeTemplate").html()),
    group_model_template:_.template($("#itemGroupModelTreeTemplate").html()),
    prop_template:_.template($("#itemTreePropTemplate").html()),
    no_data_template: _.template($("#itemTreeNoData").html()),
    specification_template: _.template($("#itemSpecificationTreeTemplate").html())
  },

  /**
  * События
  **/
  events:{
    'click .cb-item': 'onClickPlus',
    'click tr': 'onTrClick',
    'node:expand':'onNodeExpand',
    'node:collapse':'onNodeCollapse',
    'change .value-val, .additional-value, .inherited-value-val':'onPropertyValueChange',
    'change .unit-val':'onPropertyUnitChange',
    'change .cb-config':'onConfigChecked',
    'change .cb-specification':'onSpecificationChecked',
    'change .tb-count': 'onConfigVolumeChange',
    'click .add-clone': 'onAddCloneClick',
    'click .remove-clone': 'onRemoveCloneClick'
  },

  /**
  * Инициализация
  **/
  initialize: function()
  {
    this.openedItems = {};
    this.linear_data = {};
    this.collapsed= false;
    this.current_item = null;
    this.show_only_options = false;
    this.use_conditions = true;
    this.specification_list = {};
    // глобальное событие на очистку данных
    Backbone.on("global:clear",this.onGlobalClear,this);
    // глобальное событие на раскрытие/закрытие всего дерева
    Backbone.on("global:collapse",this.onGlobalCollapse,this);
    // глобальное событие отображения только опций
    Backbone.on("global:show_only_options",this.onGlobalShowOnlyOptions,this);
    // глобальное событие использования условий
    Backbone.on("global:use_conditions",this.onUseConditions,this);
    // глобальное событие смены таба
    Backbone.on("global:on_show_tab",this.onRefresh,this);
  },

  /**
   * Обработка глобального события обновления контролов
  **/
  onRefresh: function(e)
  {
      var self = this;
      // установление начальных координат на шапку
      self.$el.find(".directory-tree-header-wrapper").css('left', 0);
      var tableHeader = this.$el.find('.directory-tree-header');
      $(tableHeader).width(this.$el.find('table.treetable').width());
      this.$el.find('table.treetable').find('tr:first').find('td').each(function(index){
        $(tableHeader).find('th').eq(index).width($(this).width());
      });
  },

  /**
   * Обработка глобального события отображения толкьо опциональных свойств
  **/
  onGlobalShowOnlyOptions: function(e)
  {
    this.show_only_options = e[1];
    this.render();
    $('body').removeClass('wait');
  },

  /**
   * Обработка глобального события использования условий
  **/
  onUseConditions: function(e)
  {
    this.use_conditions = e[1];
    // анализ дерева на условия и наследственность
    this.analize_data(this.data);
    // отрисовка
    this.render();
    $('body').removeClass('wait');
  },

  /**
   * Обработка глобавльного события очистки данных
  **/
  onGlobalCollapse: function(e)
  {
    this.collapse(e[1]);
    $('body').css('cursor', 'default');
    $(e[2]).css('cursor', 'pointer');
  },

  /**
   * Обработка глобавльного события очистки данных
  **/
  onGlobalClear: function()
  {
    this.data = null;
    this.openedItems = {};
    this.current_item = null;
    this.render();
  },

  /**
    * Анализ дерева на условия и наследственность свойств
  **/
  analize_data:function(data)
  {
    // сбросить со всех конфигураций ключ  - "checked"
    this.uncheck_configs(data);
    // проставить наследственность
    this.check_inherit_props(data, data);
    // выбрать конфигурации и спецификации по свойствам родителей
    this.check_configs_by_props(data);
    // проверку на условия делаем по спец. флагу
    if(this.use_conditions)
    {
      // выбрать конфиги по условиям
      this.check_conditions(data);
      // отсеить конфигурации по отбору
      // this.check_otbors(data);
    }
  },

  /**
    * Проставление значений для наследуемых свойств
  **/
  check_inherit_props: function(node,data)
  {
    var self = this;
    // обработка конкретного свойства
    function check_inherit_prop(data, prop)
    {
      var parent = data.parent;
      while(parent)
      {
        if(parent['node'] && parent['node']['type'] == 'product')
        {
          for(var pi in parent['properties'])
          {
            var tmp_prop = parent['properties'][pi];
            if(tmp_prop['datalink'] == prop['datalink'] || tmp_prop['_id'] == prop['datalink'] || tmp_prop['datalink'] == prop['_id'])
            {
              // если нашли свойство от которого можно отнаследовать значение
              if(tmp_prop['value'])
              {
                for(var vali in prop['values'])
                {
                  var val = prop['values'][vali];
                  if((val['_id']&&val['_id'] == tmp_prop['value']['_id']) || (val['datalink'] &&  val['datalink'] == tmp_prop['value']['datalink']))
                  {
                    val['value'] = tmp_prop['value']['value'];
                    prop['value'] = val;
                    return;
                  }
                }
                return;
              }
            }
          }
        }
        parent = parent.parent;
      }
    }

    // обработка модели
    function process_group_model(node, model)
    {
      for(var ci in model['models'])
      {
        var ci_model = model['models'][ci];
        if(ci_model['is_techno_group'] || ci_model['is_buy_group'])
          process_group_model(node, ci_model);
        else
          process_model(node, ci_model);
      }
    }
    // обработка модели
    function process_model(node, model)
    {
      for(var ci in model['items'])
      {
        var product = model['items'][ci];
        self.check_inherit_props(node,product);
      }
    }

    if(node!=data)
    {
      for(var pi in data['properties'])
      {
        var prop = data['properties'][pi];
        if(prop['is_optional'])
          check_inherit_prop(data, prop);
      }
    }
    for(var mi in data['models'])
    {
      var model = data['models'][mi];
      if(model['is_techno_group'] || model['is_buy_group'])
        process_group_model(node, model);
      else
        process_model(node, model);
    }
  },

  /**
    * сбросить со всех конфигураций ключ  - "checked" и "selected"
    * также сброс идет по свойствам и значениям свойств
  **/
  uncheck_configs:function(data)
  {
    // функция обработки  процесса
    function uncheck_tech_process(process)
    {
      if(process['conditions'] && process['conditions'].length>0)
        process['checked'] = false;
      for(var ci in process['items'])
         uncheck_tech_process(process['items'][ci]);
    }

    if(data['properties'])
      for(var propi in data['properties'])
        if(data['properties'][propi]['conditions'] && data['properties'][propi]['conditions'].length>0)
          data['properties'][propi]['checked'] = false;

    // обработка тех. процессов
    for(var pci in data['tech_process_operations'])
      uncheck_tech_process(data['tech_process_operations'][pci]);

    if(data['specifications'])
      for(var propi in data['specifications'])
      {
        data['specifications'][propi]['checked'] = false;
        data['specifications'][propi]['selected'] = false;
      }

    for(var mi in data['models'])
    {
      var model = data['models'][mi];
      if(model['is_techno_group']  || model['is_buy_group'])
        this.uncheck_configs(model);
      else
      {
        for(var ci in model['items'])
        {
          var product = model['items'][ci];
          product['checked'] = false;
          product['selected'] = false;
          for(var propi in product['properties'])
          {
             if(product['properties'][propi]['conditions'] && product['properties'][propi]['conditions'].length>0)
                product['properties'][propi]['checked'] = false;

            if(product['properties'][propi]['values'] && product['properties'][propi]['values'].length>1 || (product['properties'][propi]['values'].length ==1 && product['properties'][propi]['values'][0]['conditions'] && product['properties'][propi]['values'][0]['conditions'].length>0 ))

              for(var vali in product['properties'][propi]['values'])
                product['properties'][propi]['values'][vali]['checked'] = false;
          }
          // обработка тех. процессов
          for(var pci in product['tech_process_operations'])
            uncheck_tech_process(product['tech_process_operations'][pci]);

          this.uncheck_configs(product);
        }
      }
    }
  },

  /**
    * Проверка условий заложенных в свойство на исполнение
    * Проверка идет по всем условиям свойства, пока не выполнится хотя-бы одно
    * В результате свойству добавляется спец-флаг - checked = tue
  **/
  check_prop_conditions: function(data, prop)
  {
      // если условия для свойства не заданы, то свойство считается подходящим
      if(prop.conditions && prop.conditions.length > 0)
      {

        // сбор условий по группам
        // условие выполняется если в каждой группе, хотя бы одно из условий сработало
        grouped_conditions = {}
        for(var сi in prop['conditions'])
        {
          var condition = prop['conditions'][сi];
          if(condition['is_valid'] && !condition['is_otbor'])
          {
            if(!(condition['group_key'] in grouped_conditions ) )
              grouped_conditions[condition['group_key']] = {'key': condition['group_key'], 'checked': false, 'conditions' :[]}
            grouped_conditions[condition['group_key']]['conditions'].push(condition);
          }
        }

        var condition_group_checked = true;
        var condition_group_ignore = false;
        for(var c_key in grouped_conditions)
        {
          for(var сi in grouped_conditions[c_key]['conditions'])
          {
            var condition = grouped_conditions[c_key]['conditions'][сi];
            // проверка условия
            var check_res = this.check_condition(data, condition);

            if(check_res['checked'])
            {
              grouped_conditions[c_key]['checked'] = true;
              break;
            }
            else if(check_res['ignore'])
            {
              grouped_conditions[c_key]['ignore_conditions'] = true;
            }
          }

          if(grouped_conditions[c_key]['ignore_conditions'])
            condition_group_ignore = true;

          if(!grouped_conditions[c_key]['checked'])
          {
            condition_group_checked = false;
            break;
          }
        }

        prop['checked'] = condition_group_checked;
        prop['ignore_conditions'] = condition_group_ignore;
        //prop.parent['have_checked'] = condition_group_checked;
      }
      else
      {
        prop['checked'] = true;
        prop['ignore_conditions'] = true;
      }

      return prop['checked'];
  },

  /**
    *Пересчет объемов от текущей конфигурации и вниз по всем листьям
  **/
  recalculate_product_count:function(product)
  {

    var self = this;

    // обработка модели
    function process_group_model(model)
    {
      for(var ci in model['models'])
      {
        var ci_model = model['models'][ci];
        if(ci_model['is_techno_group'] || ci_model['is_buy_group'])
          process_group_model(ci_model);
        else
          process_model(ci_model);
      }
    }
    // обработка модели
    function process_model(model)
    {
      for(var ci in model['items'])
      {
        var product = model['items'][ci];
        self.recalculate_product_count(product);
      }
    }

    // пересчет объема поданной на вход конфигурации
    var parent = product.parent;
    var parent_product = null;
    while(parent)
    {
      if(parent.node && parent.node.type=='product')
      {
         parent_product = parent;
         break;
      }
      parent = parent.parent;
    }
    // если найдена родительская уонфигурация, то используем ее требуемый объем
    // для вычисления объема вложенной конфигурации
    if(parent_product){
      parent_count_val = Routine.strToFloat(parent_product['count']['value']);
      product['count']['value'] = parent_count_val * Routine.strToFloat(product['count']['origin_value']);
    }
    // пересчет для чайлдов
    for(var mi in product['models'])
    {
      var model = product['models'][mi];
      if(model['is_techno_group'] || model['is_buy_group'])
        process_group_model(model);
      else
        process_model(model);
    }
  },

  /**
    *Вычисление формулы
    * data_product - элемент продукции
    * data_val - объект значения
    * is_volume - флаг, если расчет идет для объема
  **/
  calculate_formula:function(data_product, data_val, is_volume)
  {
    var is_volume = is_volume || false;
    // поиск значения по ID в верх по дереву до самого корня
    function get_prop_value(data, prop_id)
    {
      //var parent = data.parent;
      var parent = data;
      while(parent)
      {
        if(parent['node'] && parent['node']['type'] == 'product')
        {
          for(var pi in parent['properties'])
          {
            var tmp_prop = parent['properties'][pi];
            if(tmp_prop['_id'] == prop_id || tmp_prop['datalink'] == prop_id)
              return tmp_prop['value']['value'];
          }
        }
        parent = parent.parent;
      }
      return null;
    }

    var self = this;
    var formula = data_val['formula'].replace('=', '');
    // получить все идентификаторы задействоаные в формуле
    var regex = /([a-z0-9]{24})/g;
    var tmp_ids = {};
    var tmp = Routine.getAllMatches(regex, data_val['formula']).map(function(x){return x[0]});
    for(var i in tmp)
      tmp_ids[tmp[i]] = null;
    var have_null_values = false;
    for(var id in tmp_ids)
    {
      // вместо идентификаторов подставить значения
      tmp_ids[id] = get_prop_value(data_product, id);
      if(!tmp_ids[id])
        have_null_values = true;
      else
      {
        formula = formula.replace(new RegExp(id, "g"), tmp_ids[id]);
      }
    }
    // если есть значения, которые не удалось найти, то генерим ошибку
    if(have_null_values)
    {
      data_val['formula_error'] = 'Не удалось получить значения для: ';
      for(var id in tmp_ids)
      {
        if(!tmp_ids[id])
          data_val['formula_error']+=id + '; ';
      }
    }
    else
    {
       // выполнить формулу
       // если выполнить не удалось, то генерим ошибку
      try{
        //return eval(formula);
        data_val['value'] = eval(formula.replace(/,/g,'.')).toString().replace('.',',');
        data_val['origin_value'] = data_val['value'];
        data_val['formula_error'] = null;
        // пересчет объемов конфигураций, начиная от текущей и по всем ее листьям
        // если под формулу попал объем
        if(is_volume)
          self.recalculate_product_count(data_product)
      }
      catch(e){
        data_val['formula_error'] = 'Не удалось выполнить расчет по формуле: ' +formula;
      }
    }
  },

  /**
    * Подбор конфигураций/спецификаций по свойствам родителей
    * Подходящие конфигурации получает флаг "checked" = true
  **/
  check_configs_by_props: function(data)
  {
    var self = this;
    // обработка группирующей модели
    function process_group_model(model)
    {
      for(var ci in model['models'])
      {
        var ci_model = model['models'][ci];
        if(ci_model['is_techno_group']  || ci_model['is_buy_group'])
          process_group_model(ci_model);
        else
          process_model(ci_model);
      }
    }

    // обработка модели
    function process_model(model)
    {
      if(model['items'].length==1)
      {
        model['items'][0]['checked'] = true;
        model['items'][0]['selected'] = true;
        self.check_configs_by_props(model['items'][0]);
      }
      else
      {
        for(var ci in model['items'])
        {
          var product = model['items'][ci];
          self.check_configs_by_props(product);
        }
      }
    }

    // обработка спецификаций
    function process_specification(product, specification)
    {
      var product_props = [];
      // Сбор выбранных свойств и их значений у текущей конфигурации.
      for(var propi in product['properties'])
      {
        var product_prop = product['properties'][propi];
        if(product_prop['checked'] && product_prop['value'])
        {
          // не проверяем на участок, временное решение
          var status = false;
          if(product_prop['name']=='Участок')
              status = true;
          else
          {
            var status = false;
            var prop_origin_id = ((product_prop['datalink'])?product_prop['datalink']:product_prop['_id']);
            if(specification['properties'])
            {
              for(var spropi in specification['properties'])
              {
                var sprop = specification['properties'][spropi];
                if(prop_origin_id == sprop['origin_id'] && (product_prop['value']['value']) == sprop['value'])
                {
                  status = true;
                  break;
                }
              }
            }
          }
          product_props.push({'status': status, 'prop': product_prop});
        }
      }

      // Если соответствия найдены, то помечаем конфигурацию, как проверенную
      var checked_props_count = 0;
      for(var i in product_props)
        if(product_props[i]['status'])
          checked_props_count++;
      specification['checked'] = false;
      if(checked_props_count == product_props.length)
        specification['checked'] = true;
    }

    // определение родительской конфигурации
    var parent = data.parent;
    var parent_product = null;
    while(parent)
    {
      if(parent.node && parent.node.type=='product')
      {
         parent_product = parent;
         break;
      }
      parent = parent.parent;
    }

    // проверяем конфигурацию, на соответствие свойствам родителей,если только родитель выбран
    if(parent_product && parent_product['checked'])
    {
      var parent_props = [];
      // Сбор выбранных свойств и их значений родителя. В отборе участвуют толкьо свойства - спецификации
      for(var propi in parent_product['properties'])
      {
        var parent_prop = parent_product['properties'][propi];
        // проверка ведется толкьо на свойства с задаными значениями
        if(parent_prop['value'] && parent_prop['value']['value'] && parent_prop['value']['value']!='(Открытое значение)' && parent_prop['datalink']!=App.SystemObjects['items']['SECTOR_PROP'])
        {
          if(parent_prop['checked'] && parent_prop['value'])
          {
            var status = false;
            // Сбор свойств текущей конфигурации и поиск соответсвий с родительскими совйствами
            var parent_prop_origin_id = ((parent_prop['datalink'])?parent_prop['datalink']:parent_prop['_id']);
            for(var spropi in data['properties'])
            {
              var sprop = data['properties'][spropi];
              var sprop_origin_id = ((sprop['datalink'])?sprop['datalink']:sprop['_id']);
              if(sprop['checked'] && parent_prop_origin_id == sprop_origin_id && sprop['value'] && sprop['value']['value'] == parent_prop['value']['value'])
                status = true;
            }
            parent_props.push({'status': status, 'prop': parent_prop});
          }
        }
      }

      // Если соответствия найдены, то помечаем конфигурацию, как проверенную
      var checked_props_count = 0;
      for(var i in parent_props)
        if(parent_props[i]['status'])
          checked_props_count++;
      if(checked_props_count == parent_props.length)
      {
        data['checked'] = true;
        // проверка и поиск подходящих спецификаций
        if(data['specifications'])
        {
          if(data['specifications'].length==1)
          {
            data['specifications'][0]['checked'] = true;
            data['specifications'][0]['selected'] = true;
          }
          else
          {
            for(var speci in data['specifications'])
              process_specification(data, data['specifications'][speci]);
          }
        }
      }
    }
    else
    {
      for(var mi in data['models'])
      {
        var model = data['models'][mi];
        if(model['is_techno_group']  || model['is_buy_group'])
          process_group_model(model);
        else
          process_model(model);
      }
    }

  },

   /**
    * Проверка отборов на исполнение.
    * У текщего объекта получаем парента - "изделие". Если у данного парента заданы отборы, то проверяем соответсвует ли текущий объект
    * условиям отбора парента, если соответвует, то оставляем объект, если нет, то убираем.
  **/
  check_otbors:function(data_product, data_val)
  {
    var self = this;

    //
    // функция обработка группирующей модели
    //
    function process_group_model(model)
    {
      var products = [];
      for(var ci in model['models'])
      {
        var ci_model = model['models'][ci];
        if(ci_model['is_techno_group']  || ci_model['is_buy_group'])
          products = products.concat(process_group_model(ci_model));
        else
          products = products.concat(process_model(ci_model));
      }
      return products;
    }

    //
    // функция обработки модели
    //
    function process_model(model)
    {
      var products = [];
      for(var ci in model['items'])
        products.push(model['items'][ci]);
      return products;
    }

    // блоки отборов сгруппированные
    var grouped_conditions = {};
    // флаг наличия блоков отбора для данного изделия
    var is_have_conditions = false;

    // получение условий отбора, если такие есть
    if(data_val['conditions'] && data_val['conditions'].length>0)
    {
      // сбор отборов  по группам
      // условие выполняется если в каждой группе, хотя бы одно из условий отбора сработало
      for(var сi in data_val['conditions'])
      {
        var condition = data_val['conditions'][сi];
        // участвуют только валидные условия - отборы
        if(condition['is_valid'] && condition['is_otbor'])
        {
          is_have_conditions = true;
          if(!(condition['group_key'] in grouped_conditions ))
            grouped_conditions[condition['group_key']] = {'key': condition['group_key'], 'checked': false, 'conditions' :[]};
          grouped_conditions[condition['group_key']]['conditions'].push(condition);
        }
      }
    }

    // список изделий, входящих в данное изделие на первом уровне
    // проход идет сквозь групповых моделей
    var products = [];
    for(var mi in data_product['models'])
    {
      var model = data_product['models'][mi];
      if(model['is_techno_group']  || model['is_buy_group'])
        products = products.concat(process_group_model(model));
      else
        products = products.concat(process_model(model));
    }

    // Проверка отобранных изделий на соответствие отбору
    for(var i in products)
    {
      var product = products[i];
      // если заданы условия отбора, то применяем их к продуктам
      if(is_have_conditions)
      {
        var condition_group_checked = true;
        for(var c_key in grouped_conditions)
        {
          grouped_conditions[c_key]['checked'] = false;
          for(var сi in grouped_conditions[c_key]['conditions'])
          {
            var condition = grouped_conditions[c_key]['conditions'][сi];
            var check_res = this.check_otbor(product, condition);
            if(check_res['checked'])
            {
              grouped_conditions[c_key]['checked'] = true;
              break;
            }
          }
          if(!grouped_conditions[c_key]['checked'])
          {
            condition_group_checked = false;
            break;
          }
        }
        product['checked'] = condition_group_checked;
      }

       // если продукт подходит то проверяем его правила отбора
       // отбор отбирает допустимых чилдренов для текущего продукта
       // запуск рекурсии
       // if(product['checked'])
       //     this.check_otbors(product);
    }
  },

   /**
    * Проверка условия на исполнение
    * data -текущая конфигурация изделия
    * condition - условие в текущей конфигурации
  **/
  check_otbor:function(data, condition)
  {
    ///
    /// Локальная функция проверки соответствия совйства или значения условиям отбора
    /// product - изделие на проверку
    /// condition_prop_node - описание объекта свойства, заданное в отборе
    /// condition_val_node - описание объекта значения, заданное в отборе
    ///
    function check_condition_property_node(product, condition_prop_node, condition_val_node)
    {
      var prop_res = true;
      var val_res = true;
      // если в условии задано свойство
      if(condition_prop_node)
      {
        prop_res = false;
        if(product['properties'] && product['properties'].length>0)
        {
          for(var i in product['properties'])
          {
            var prop = product['properties'][i];
            // проверка свойства на соответствию условию
            if(prop['_id'] == condition_prop_node['datalink'] || prop['datalink'] == condition_prop_node['datalink'])
            {
              if(condition_val_node)
              {
                // проверка значений свойства на соответствие условию
                if(prop['value'] && (condition_val_node['datalink'] == prop['value']['_id'] ||  condition_val_node['datalink'] == prop['value']['datalink']))
                {
                  prop_res = true;
                  break;
                }
              }
              else
              {
                prop_res = true;
                break;
              }
            }
          }
        }
      }
      else if (condition_val_node)
      {
        val_res = false;
        if(product['properties'] && product['properties'].length>0)
        {
          for(var i in product['properties'])
          {
            var prop = product['properties'][i];
            // проверка значений свойства на соответствие условию
            if(prop['value'] && (condition_val_node['datalink'] == prop['value']['_id'] ||  condition_val_node['datalink'] == prop['value']['datalink']))
            {
              val_res = true;
              break;
            }
          }
        }
      }

      return prop_res && val_res;
    }

    var self = this;
    // результирующий объект, checked = условие выполнилось, ignore = игнорировать условие
    var tmp_check = [];
    var result = {'checked': false, 'ignore': false};
    var index = 0;
    if(condition['id_path'].length>0)
    {
      for(var i in condition['id_path'])
      {
        index++;
        // получение очередного элемента условия
        var condition_node = condition['id_path'][i];
        // проверка на тип объекта в условии
        if(condition_node['type'] == 'product_model')
        {
          //var product_model = data.parent;
          if(condition_node['datalink'] == data['model_id'])
            tmp_check.push(true);
        }
        else if(condition_node['type'] == 'product')
        {
          if(condition_node['datalink'] == data['node']['_id'] || condition_node['datalink'] == data['node']['datalink'])
            tmp_check.push(true);
        }
        else if(condition_node['type'] == 'property')
        {
           tmp_check.push(check_condition_property_node(data, condition_node, condition['node']));
        }
      }
    }
    else
    {
      var condition_node = condition['node'];
      switch(condition['node']['type'])
      {
        case "product_model":
          if(condition_node['datalink'] == data['model_id'])
            tmp_check.push(true);
        break;
        case "product":
           if(condition_node['datalink'] == data['node']['_id'] || condition_node['datalink'] == data['node']['datalink'])
            tmp_check.push(true);
        break;
        case "property":
          tmp_check.push(check_condition_property_node(data, condition['node'], null));
        break;
        case "value":
          tmp_check.push(check_condition_property_node(data, null, condition['node']));
        break;
      }
    }

    // проверка прошла успешно, если все значения в tmp_check  == true
    if( tmp_check.length== tmp_check.filter(function (e) { return e == true; }).length)
      result['checked'] = true;
    return result;
  },

  /**
    * Проверка условий на исполнение
    * проверка идет только для выбранных конфигураций
  **/
  check_conditions:function(data)
  {
    var self = this;
    // обработка группирующей модели
    function process_group_model(model)
    {
      for(var ci in model['models'])
      {
        var ci_model = model['models'][ci];
        if(ci_model['is_techno_group']  || ci_model['is_buy_group'])
          process_group_model(ci_model);
        else
          process_model(ci_model);
      }
    }
    // обработка модели
    function process_model(model)
    {
      if(model['items'].length==1)
      {
        var product = model['items'][0];
        product['checked'] = true;
        product['selected'] = true;
        self.check_conditions(product);
      }
      else
      {
        for(var ci in model['items'])
        {
          var product = model['items'][ci];
          self.check_conditions(product);

          // остановка выполнения условий, если хотя бы одна конфигурация подошла
          //if(self.check_conditions(product))
          //    break;
        }
      }
    }

    // двигаемся вниз по веткам только для выбранных конфигураций
    // корень по умолчанию считается выбранной конфигурацией
    var parent = data.parent;
    var parent_product = null;
    while(parent)
    {
      if(parent.node && parent.node.type=='product')
      {
         parent_product = parent;
         break;
      }
      parent = parent.parent;
    }

    // если выбрано родительское изделие. тогда только проверям условия для детей
    // проверка ведется до первого выбранного чайлда
    if(!data.parent || parent_product['checked'])
    {

      // если есть родитель, то надо вызвать проверку его свойств на условия
      if(parent_product)
      {
        for(var i in parent_product['properties'])
        {
          var prop = parent_product['properties'][i];
          // отображать только свойства описывающие параметры изделия
          if(prop['is_specification'])
            self.check_prop_conditions(parent_product, prop);
        }
      }

      if(data['conditions'] && data['conditions'].length>0 && data.parent)
      {
        // сбор условий по группам
        // условие выполняется если в каждой группе, хотя бы одно из условий сработало
        grouped_conditions = {}
        for(var сi in data['conditions'])
        {
          var condition = data['conditions'][сi];
          if(condition['is_valid'] && !condition['is_otbor'])
          {
            if(!(condition['group_key'] in grouped_conditions ) )
              grouped_conditions[condition['group_key']] = {'key': condition['group_key'], 'checked': false, 'conditions' :[]};
            grouped_conditions[condition['group_key']]['conditions'].push(condition);
          }
        }

        var condition_group_checked = true;
        for(var c_key in grouped_conditions)
        {
          for(var сi in grouped_conditions[c_key]['conditions'])
          {
            var condition = grouped_conditions[c_key]['conditions'][сi];
            var check_res = this.check_condition(data, condition);
            if(check_res['checked'])
            {
              grouped_conditions[c_key]['checked'] = true;
              break;
            }
          }
          if(!grouped_conditions[c_key]['checked'])
          {
            condition_group_checked = false;
            break;
          }
        }

        data['checked'] = condition_group_checked;
      }
      //else
      //    data['checked'] = true;

      if(data['specificatioins'] && data['specificatioins'].length==1)
      {
        data['specificatioins'][0]['checked'] = true;
        data['specificatioins'][0]['selected'] = true;
      }


      for(var mi in data['models'])
      {
        var model = data['models'][mi];
        if(model['is_techno_group']  || model['is_buy_group'])
          process_group_model(model);
        else
          process_model(model);
      }
    }
    return data['checked'];
  },

  /**
    * Проверка условия на исполнение
    * data -текущая конфигурация
    * condition - условие в текущей конфигурации
  **/
  check_condition:function(data, condition)
  {
    var self = this;

    // обработка группирующей модели
    function process_group_model(node, model)
    {
      var result = [];
      for(var ci in model['models'])
      {
        var ci_model = model['models'][ci];
        if(ci_model['is_techno_group']  || model['is_buy_group'])
          _.extend(result, process_group_model(node, ci_model));
        else
          _.extend(result, process_model(node, ci_model));
      }
      return result;
    }

    // обработка модели
    function process_model(node, model)
    {
      var result = [];
      for(var ci in model['items'])
      {
        var child_product = model['items'][ci];
        if(child_product['checked'] && ((node['type'] == 'product_model' && child_product['model_id'] == node['datalink']) || (node['type'] == 'product' && child_product['node']['_id'] == node['datalink'])))
          result.push(child_product);
      }
      return result;
    }

    // проверка по моделям и изделиям
    function check_condition_model_node(data, node, products)
    {
      var result = [];
      if(products.length>0)
      {
        for(var pi in products)
        {
          var product = products[pi];
          for(var mi in product['models'])
          {
            var model = product['models'][i];
            if(model['is_techno_group']  || model['is_buy_group'])
              _.extend(result, process_group_model(node, model));
            else
              _.extend(result, process_model(node, model));
          }
        }
      }
      else
      {
        //var parent = data.parent;
        var parent = data;
        while(parent)
        {
          if(parent['node'] && parent['node']['type']=='product' && ((node['type'] == 'product_model' && parent['model_id'] == node['datalink']) || (node['type'] == 'product' && parent['node']['_id'] == node['datalink'])))
            result.push(parent);
          parent = parent.parent;
        }
      }
      return result;
    }

    // проверка по свойствам и значениям
    function check_condition_property_node(products, prop_node, val_node)
    {
      var res  = [];
      if(products.length>0)
      {
        for(var pi in products)
        {
          var product = products[pi];
          for(propi in product['properties'])
          {
            var prop = product['properties'][propi];
            if(
              (!prop_node || prop['datalink'] == prop_node['datalink'] || prop['_id'] == prop_node['datalink']) &&
              (prop['value'] && (prop['value']['_id'] == val_node['datalink'] || prop['value']['value'] == val_node['datalink']))
               )
            {
              //return true;
              res.push({'prop':prop,'value': true});
            }
          }
        }
      }
      else
      {
        //var parent = data.parent;
        var parent = data;
        while(parent)
        {
          if(parent['node'] && parent['node']['type']=='product')
          {
            for(propi in parent['properties'])
            {
              // проверяемое свойство
              var prop = parent['properties'][propi];
              //-------iss_636-----------------------------------------------
              //-----------------------------------------------------------------
              // итоговый объект
              tmp_res = {'prop': null, 'value': null};
              // проверка на совпадение свойства
              if(prop_node &&  ((prop['datalink'] == prop_node['datalink'] || prop['_id'] == prop_node['datalink']) && prop['checked']))
                tmp_res['prop'] = prop;
              // проверка на совпадение значения
              if(prop['values'] && prop['values'].length>0 && val_node)
              {
                for(val_i in prop['values'])
                {
                  var tmp_val = prop['values'][val_i];
                  //  если есть подходящее по условию значение и оно проверено(применены условия)
                  // то добавляем такое значение в результат
                  if((!prop_node ||  ((prop['datalink'] == prop_node['datalink'] || prop['_id'] == prop_node['datalink']) && prop['checked'])) &&
                    ((tmp_val['_id'] == val_node['datalink'] || tmp_val['datalink'] == val_node['datalink']) && tmp_val['checked']))
                  //if((tmp_val['_id'] == val_node['datalink'] || tmp_val['datalink'] == val_node['datalink']) && tmp_val['checked'])
                  {
                    tmp_res['value'] = {'value': tmp_val, 'selected': (prop['value'] && tmp_val['_id'] == prop['value']['_id'])};
                    break;
                  }
                }
              }
              // если хотя бы свойство прошло, то добавляем объект в результат
              if(tmp_res['prop'] || tmp_res['value'])
                res.push(tmp_res);
              //-----------------------------------------------------------------
              /*if(
                (!prop_node || prop['datalink'] == prop_node['datalink'] || prop['_id'] == prop_node['datalink']) &&
                (prop['value'] && (prop['value']['_id'] == val_node['datalink'] || prop['value']['datalink'] == val_node['datalink']))
                )
              {
                res.push({'prop':prop,'selected': true});
                //return true;
              }*/
            }
          }
          parent = parent.parent;
        }
      }
      //return false;
      return res;
    }

    //---------
    // содержимое основной функции
    //---------
    var tmp_objects = [];
    var old_tmp_objects = [];
    // var is_node_ok = false;
    // результирующий объект, checked = условие выполнилось, ignore = игнорировать условие
    var result = {'checked': false, 'ignore': false}
    var index = 0;
    if(condition['id_path'].length>0)
    {
      for(var i in condition['id_path'])
      {
        index++;
        // получение очередного элемента условия
        var condition_node = condition['id_path'][i];
        // проверка на тип объекта в условии
        if(condition_node['type'] == 'product_model')
        {
          tmp_objects = check_condition_model_node(data, condition_node, tmp_objects);
          if((index == condition['id_path'].length && tmp_objects.length>0) || (index == condition['id_path'].length && old_tmp_objects.length==0 && tmp_objects.length==0))
          {
            //is_node_ok = true;
            result['checked'] = true;
            break;
          }
          else if(tmp_objects.length==0 && old_tmp_objects.length>0)
          {
            //is_node_ok = false;
            result['checked'] = false;
            break;
          }
        }
        else if(condition_node['type'] == 'product')
        {
          tmp_objects = check_condition_model_node(data, condition_node, tmp_objects);
          if((index == condition['id_path'].length && tmp_objects.length>0) || (index == condition['id_path'].length && old_tmp_objects.length==0 && tmp_objects.length==0))
          {
            //is_node_ok = true;
            result['checked'] = true;
            break;
          }
          else if(tmp_objects.length==0 && old_tmp_objects.length>0)
          {
            //is_node_ok = false;
            result['checked'] = false;
            break;
          }

        }
        else if(condition_node['type'] == 'property')
        {
          var  tmp_objects = check_condition_property_node(tmp_objects, condition_node, condition['node']);
          // если нет управляющего объета, то условие игнорируется
          if(old_tmp_objects.length==0 && tmp_objects.length==0)
          {
            result['checked'] = false;
            result['ignore'] = true;
          }
          // если условие прерывается на середине(есть не весь набор управляющих объектов),
          // то условие не выполняется(неверное)
          else if (old_tmp_objects.length>0 && tmp_objects.length==0)
          {
            result['checked'] = false;
            result['ignore'] = false;
          }
          // если отобраны подходящие свойства и значения, согласно условиям, то проверяем их
          else if (tmp_objects.length>0)
          {
            for(var tmp_i in tmp_objects)
            {
              var tmp_object = tmp_objects[tmp_i];
              if(tmp_object['value'] && tmp_object['value']['selected'])
              {
                result['checked'] = true;
                result['ignore'] = false;
                break;
              }
            }
          }

          //if(tmp_objects.length>0)
          //    result['checked'] = true;
            //is_node_ok = true;

          /*if(!is_node_ok && old_tmp_objects.length==0)
            is_node_ok = true;*/
        }

        // сохранение старых отобранных объектов по дереву, согласно условию
        if(tmp_objects.length>0)
          old_tmp_objects = tmp_objects;
      }
    }
    else
    {
      switch(condition['node']['type'])
      {
        case "product_model":
          if(check_condition_model_node(data, condition['node'], []).length>=0)
            //is_node_ok = true;
            result['checked'] = true;
        break;
        case "product":
          if(check_condition_model_node(data, condition['node'], []).length>=0)
            //is_node_ok = true;
            result['checked'] = true;
        break;
        case "property":
          var  tmp_objects = check_condition_property_node([], null, condition['node']);
          if(tmp_objects.length>0)
              //is_node_ok = true;
              result['checked'] = true;
        break;
        case "value":
          var  tmp_objects = check_condition_property_node([], null, condition['node']);
          if (tmp_objects.length>0)
          {
            for(var tmp_i in tmp_objects)
            {
              var tmp_object = tmp_objects[tmp_i];
              if(tmp_object['value'] && tmp_object['value']['selected'])
              {
                result['checked'] = true;
                result['ignore'] = false;
                break;
              }
            }
          }
          else
          {
            result['checked'] = false;
            result['ignore'] = true;
          }

          //if(val_objects.length>0)
          //        //is_node_ok = true;
          //        result['checked'] = true;
        break;
      }
    }

    //condition.parent['checked'] = is_node_ok;
    //condition.parent.parent['have_checked'] = is_node_ok;
    //return;
    //return is_node_ok;
    return result;
  },

  /**
    * Преобразование дерева в линейный список
    * идентификатором каждого элемента является темповый ID
  **/
  preapre_and_convert_tree_to_list:function(data)
  {
    var self = this;
    // функция обработки группирующей модели
    function process_group_model(model, parent){
      var result = {};
      model.parent = parent;
      model['tmp_id'] = Guid.newGuid();
      for(var ci in model['models'])
      {
        var ci_model = model['models'][ci];
        //ci_model.parent = model;
        if(ci_model['is_techno_group']  || ci_model['is_buy_group'])
          _.extend(result, process_group_model(ci_model, model));
        else
          _.extend(result, process_model(ci_model, model));
      }
      return result;
    }

    // функция обработки  модели
    function process_model(model, parent)
    {
      var result = {};
      model.parent = parent;
      model['tmp_id'] = Guid.newGuid();
      for(var ci in model['items'])
      {
        var product = model['items'][ci];
        product.parent = model;
        _.extend(result, self.preapre_and_convert_tree_to_list(product));
      }
      return result;
    }

    // функция обработки  процесса
    function process_tech_process(process, parent)
    {
      var result = {};
      process.parent = parent;
      process['tmp_id'] = Guid.newGuid();
      if(!process['conditions'] || process['conditions'].length==0)
        process['checked'] = true;
      for(var propi in process['properties'])
      {
        var prop = process['properties'][propi];
        prop.parent = process;
        prop['tmp_id'] = Guid.newGuid();
        prop['checked'] = true;
        result[prop['tmp_id']]=prop;
      }
      for(var ci in process['items'])
        _.extend(result, process_tech_process(process['items'][ci], process));
      return result;
    }

    var result = {};
    data['tmp_id'] = Guid.newGuid();
    result[data['tmp_id']] = data;
     // сортировка свойств по имени
     data['properties'] = data['properties'].sort(function(a,b){
          if (a['name'] < b['name']) return -1;
          else if (a['name'] > b['name']) return 1;
          return 0;
    });

     // сортировка спецификаций по имени
     if(data['specifications'])
       data['specifications'] = data['specifications'].sort(function(a,b){
            if (a['number'] < b['number']) return -1;
            else if (a['number'] > b['number']) return 1;
            return 0;
      });

    // свойства
    for(var i in data['properties'])
    {
      var prop = data['properties'][i];
      prop.parent = data;
      prop['tmp_id'] = Guid.newGuid();
      result[prop['tmp_id']]=prop;
      // свойства без условий, по умолчанию проверены
      if(!prop['conditions'] || prop['conditions'].length==0)
        prop['checked'] = true;
      // если у свойства всего одно значение и оно без условий, то оно по умолчанию проверено
      if(prop['values'] && prop['values'].length==1 && (!prop['values'][0]['conditions'] || prop['values'][0]['conditions'].length == 0) )
        prop['values'][0]['checked'] = true;
    }

    // Обработка процессов----------------------
    for(var pci in data['tech_process_operations'])
    {
      var process = data['tech_process_operations'][pci];
      _.extend(result, process_tech_process(process, data));
    }

    // спецификации
    if(data['specifications'])
    {
      for(var i in data['specifications'])
      {
        var spec = data['specifications'][i];
        spec.parent = data;
        spec['tmp_id'] = Guid.newGuid();
        result[spec['tmp_id']]=spec;
      }
    }

    // модели
    for(var mi in data['models'])
    {
      var model = data['models'][mi];
      //model.parent = data;
      if(model['is_techno_group']  || model['is_buy_group'])
        _.extend(result, process_group_model(model, data));
      else
        _.extend(result, process_model(model, data));
    }
    return result;
  },

   /**
    * Функция склеивания комплекта и конфигурации
  **/
  merge_model: function(model, groups, complect_data)
  {
    if(model['is_techno_group']  || model['is_buy_group'])
    {
      groups.push({
          'name': model['node']['name'],
          'origin_id': ((model['node']['datalink'])?model['node']['datalink']:model['node']['_id']),
          'is_buy_group':model['is_buy_group'],
          'is_techno_group':model['is_techno_group'],
        });
      for(var cm in model['models'])
        this.merge_model(model['models'][cm], groups, complect_data);
    }
    else
    {
      var cloned_configs = []
      for(var i in model['items'])
      {
        var item = model['items'][i];

        //if(item['checked'])
        //{
        // проходим по конфигурациям сохраненного комлпекта и ищем соответствия
        // для сформированнной структуры
        for(var ps in complect_data['items'])
        {
          var sitem = complect_data['items'][ps];
          // если нашли совпадения по конфигурациям, проверяем соответствие групп в которые они входят
          if(item['node']['number'] == sitem['number'] && !sitem.is_clone)
          {
            //item['checked'] = true;
            item['selected'] = true;
            item['count']['value'] = sitem['count']['value'];

            if(sitem['group'] && sitem['group'].length>0 && sitem['group'].length == groups.length)
            {
              if(Routine.arraysIdentical(sitem['group'], groups))
                this.merge(item, sitem);
            }
            else
              this.merge(item, sitem);

            //----------------------------------------------------------------------------------------------------------
            // #916 проверка на клоны, их в общей структуре нет, необходимо клоны делать на лету
            // вычисляем сколько клонов у объекта
            for(var ci in complect_data['items'])
            {
              if (complect_data['items'][ci]['number'] == sitem['number'] && complect_data['items'][ci].is_clone)
              {
                if(!sitem['group'] && !complect_data['items'][ci]['group'])
                {
                  var clone_item = Routine.deepClone(item);
                  // проставляем объем
                  clone_item['count']['value'] =complect_data['items'][ci]['count']['value'];
                  // восстановление ссылки на родителя
                  clone_item.parent = item.parent;
                  _.extend(this.linear_data, this.preapre_and_convert_tree_to_list(clone_item));
                  clone_item.is_clone = true;
                  //model['items'].push(clone_item);
                  cloned_configs.push(clone_item);
                  this.merge(clone_item, complect_data['items'][ci]);
                }
                else
                {
                  if(sitem['group'] && complect_data['items'][ci]['group'] && sitem['group'].length == complect_data['items'][ci]['group'])
                  {
                    if(Routine.arraysIdentical(sitem['group'], complect_data['items'][ci]['group']))
                    {
                      var clone_item = Routine.deepClone(item);
                      // проставляем объем
                      clone_item['count']['value'] =complect_data['items'][ci]['count']['value'];
                      // восстановление ссылки на родителя
                      clone_item.parent = item.parent;
                      //console.log(item);
                      //console.log(clone_item);
                      _.extend(this.linear_data, this.preapre_and_convert_tree_to_list(clone_item));
                      clone_item.is_clone = true;
                      //model['items'].push(clone_item);
                      cloned_configs.push(clone_item);
                      this.merge(clone_item, complect_data['items'][ci]);
                    }
                  }
                }
              }
            }
            //----------------------------------------------------------------------------------------------------------

          }
        }
        //}
      }

      // добавляем  в модель склонированные конфиги
      model['items'] = model['items'].concat(cloned_configs);

    }
  },
  merge:function(data, complect_data){
    var self = this;
    // отключена, для проставления даных по всем конфигурациям, а не только выбранным
    //if(data['checked'])
    //{
      // мержим свойства
      for(var i in data['properties'])
      {
        var prop = data['properties'][i];
        var prop_origin_id = ((prop['datalink'])?prop['datalink']:prop['_id']);

        // мержим только опциональные свойства
        // if(prop['is_optional'])
        // {
          for(var si in complect_data['properties'])
          {
            var sprop = complect_data['properties'][si];
            if(sprop['origin_id'] == prop_origin_id)
            {
              // поиск выбранного значения
              var new_val = null;
              // если выбрано какое-то значение
              if(sprop['value'])
              {
                // поиск текущего значения в списке значений свойства
                if(prop['values'] && prop['values'].length>0)
                {
                  for(var vi in prop['values'])
                  {
                    var val =prop['values'][vi];
                    if(val['_id'] == sprop['value_origin_id'] || val['datalink']==sprop['value_origin_id'])
                    {
                      new_val = val;
                      break;
                    }
                  }
                }

                // если открытое значение
                if(new_val && new_val['is_open'])
                  new_val['value'] = sprop['value'];
                prop['value'] = new_val;
                prop['value']['checked'] = true;
                self.analize_data(prop.parent);
                break;
              }
            }
          }
        // }
      }

      // мержинг спецификаций
      if(data['selected'] && data['specifications'] && complect_data['specification'])
      {
        for(var si in data['specifications'])
          if(data['specifications'][si]['number'] == complect_data['specification']['number'])
          {
            data['specifications'][si]['selected'] = true;
            break;
          }
      }

      // мержим вложенные конфигурации(разбор по моделям)
      for(var mi in data['models'])
      {
        var model = data['models'][mi];
        self.merge_model(model, [], complect_data);
      }
    //}
  },

  /**
    * Добавление спецификаций к конфигурациям
  **/
  merge_with_specifications:function(node, specification_list)
  {
    var self = this;
    // обработка групповой модели
    function process_group_model(node, model, specification_list)
    {
      for(var ci in model['models'])
      {
        var ci_model = model['models'][ci];
        if(ci_model['is_techno_group'] || ci_model['is_buy_group'])
          process_group_model(node, ci_model);
        else
          process_model(node, ci_model, specification_list);
      }
    }
    // обработка модели
    function process_model(node, model, specification_list)
    {
      for(var ci in model['items'])
        model['items'][ci]['specifications'] = Routine.deepClone(specification_list[model['items'][ci]['node']['number']]);
    }

    for(var mi in node['models'])
    {
      var model = node['models'][mi];
      if(model['is_techno_group'] || model['is_buy_group'])
        process_group_model(node, model, specification_list);
      else
        process_model(node, model, specification_list);
    }
  },

  /**
    * Подготовка исходных данных
  **/
  prepare_and_build:function(collection, complect_data, show_only_options, use_conditions, specification_list)
  {
    this.show_only_options = show_only_options;
    this.use_conditions = use_conditions;
    this.data = collection;
    this.specification_list = specification_list;
    if(this.data)
    {
      // корневая конфигурация всегда по умолчанию проверена и выбранна
      this.data['checked'] = true;
      this.data['selected'] = true;
      // добавление информации о спецификациях в структуру
      this.merge_with_specifications(this.data, specification_list);

      // разложение дерева данных в список и назначение уникальных идентификаторов темповых
       this.linear_data =  this.preapre_and_convert_tree_to_list(this.data);

      // мержинг конфигурации и комплекта
      if(complect_data)
      {
        this.analize_data(this.data);
        this.merge(this.data, complect_data);
      }
      else
        // анализ дерева на условия и наследственность
        this.analize_data(this.data);

      // разложение дерева данных в список и назначение уникальных идентификаторов темповых
      //this.linear_data =  this.preapre_and_convert_tree_to_list(this.data);
    }
    this.render();
  },

  /**
    * Отрисовка
  **/
  render:function()
  {
    var self = this;
    this.$el.find('.tree-data').empty();
    if(this.data)
    {
      // навешивание контрола таблицы
      this.$el.find('.tree-data').append(this.templates.template({}));
      var data_container = this.$el.find('.tree-data').find("tbody");
      this.renderItem(this.data, data_container, {index:1});
      this.$el.find("table.treetable").treetable({
        expandable: true,
        onNodeExpand: function(e){ self.$el.trigger("node:expand",[this]); },
        onNodeCollapse: function(e){ self.$el.trigger("node:collapse",[this]); }
      });

      // если необходмио расскрыть все дерево
      if(this.collapsed)
        this.$el.find("table.treetable").treetable('expandAll');

      // расскрыть все сохраненые ранее ветки дерева, которые открывали руками
      for(var i in this.openedItems)
      {
        if(this.openedItems[i])
        {
          try
          {
            var treeElem = self.$el.find("table.treetable").find("tr[data-object-tmp-id='"+i+"']");
            if(treeElem)
              this.$el.find("table.treetable").treetable('expandNode',treeElem.data("tt-id"));
          } catch (err) {}
        }
      }

      // закрыть все сохраненые ранее ветки дерева
      for(var i in this.openedItems)
      {
        if(!this.openedItems[i])
        {
          try
          {
            var treeElem = self.$el.find("table.treetable").find("tr[data-object-tmp-id='"+i+"']");
            if(treeElem)
            {
              this.$el.find("table.treetable").treetable('expandNode',treeElem.data("tt-id"));
              this.$el.find("table.treetable").treetable('collapseNode',treeElem.data("tt-id"));
            }
          } catch (err) {console.log(err);}
        }
      }

      /*
      // расскрыть ветки до редактируемых свойств
      this.$el.find("table.treetable").find("select.value-val, input.additional-value").each(function(index){
        // раскрываем только те, кто не был скрыт руками
         var tr = $(this).parents("tr:first");
         if( !(tr.data('object-tmp-id') in self.openedItems) ||  !self.openedItems[tr.data('object-tmp-id')] )
         {
           var elem = self.linear_data[tr.data('object-tmp-id')];
           while(elem){
            try
            {
              self.$el.find("table.treetable").treetable('expandNode',elem["tmp_index"]);
            } catch (err) {}
            elem = elem.parent;
           }
         }
      });
      */


      // если есть строка, которую необходимо выделить, то выделяем
      if(this.current_item)
        self.$el.find("table.treetable").find("tr[data-object-tmp-id='"+this.current_item+"']").addClass('selected').find('input').focus();

      // объемы специфкаций и комплектов должны быть числовыми
      self.$el.find("table.treetable").find('.tb-count').numeric({ negative: false, decimal: ',' });

      // установление начальных координат на шапку
      self.$el.find(".directory-tree-header-wrapper").css('left', 0);
      var tableHeader = this.$el.find('.directory-tree-header');
      $(tableHeader).width(this.$el.find('table.treetable').width());
      this.$el.find('table.treetable').find('tr:first').find('td').each(function(index){
        $(tableHeader).find('th').eq(index).width($(this).width());
      });
      // событие на скролл контейнера с данными, для изменения позиции шапки
      this.$el.find(".tree-data").scroll(function(){
        var posLeft = self.$el.find(".tree-data").find("table.treetable").position().left;
        self.$el.find(".directory-tree-header-wrapper").css('left', posLeft);
      });
      $(window).resize(function() {
        var tableHeader = self.$el.find('.directory-tree-header');
        $(tableHeader).width(self.$el.find('table.treetable').width());
        self.$el.find('table.treetable').find('tr:first').find('td').each(function(index){
          $(tableHeader).find('th').eq(index).width($(this).width());
        });
      });
    }
  },

  /**
    * Отрисовка группирующей модели. Рекурсия
    * counter = {val:1}
  **/
  renderGroupModel: function(model, container, counter)
  {
    var self = this;
    model['tmp_index'] = counter['index']++;
     // отрисовка модели
    container.append(this.templates.group_model_template({
        number:model['node']['number'],
        index:model['tmp_index'],
        parent_index: model.parent['tmp_index'],
        name: model['node']['name'],
        tmp_id: model['tmp_id'],
        node: model['node'],
        type:model['node']['type']
    }));
    for(var i in model['models'])
    {
      var c_model = model['models'][i];
      if(c_model['is_techno_group']  || c_model['is_buy_group'])
        self.renderGroupModel(c_model, container, counter);
      else
        self.renderModel(c_model, container, counter);
    }
  },

  /**
    * Отрисовка обычной модели
    * counter = {val:1}
  **/
  renderModel: function(model, container, counter)
  {
    var self = this;
    model['tmp_index'] = counter['index']++;
    var sel_configs = [];
    var sel_config = '';
    for(var ci in model['items'])
    {
      if(model['items'][ci]['selected'])
        sel_configs.push( model['items'][ci]);
    }
    var error_msg = '';
    var value = ''; // требуемый объем
    var unit = ''; // единицы объема
    var sel_config_name = '';
    if(model['items'].length==0)
      error_msg = "Ошибка! Нет конфигураций";
    else if (sel_configs.length==0 && error_msg=='')
      error_msg = 'Конфигурация не определена';
    else if(sel_configs.length==1)
    {
      sel_config = sel_configs[0];
      value = sel_config['count']['value'];
      unit = sel_config['count']['unit'];
      sel_config_name = sel_config['node']['number'] + '.' + sel_config['node']['name'];
    }
    else if(sel_configs.length>1)
    {
      sel_config = sel_configs[0];
      //value = sel_config['count']['value'];
      unit = sel_config['count']['unit'];
      sel_config_name = 'Выбрано несколько конфигураций';
    }
    container.append(this.templates.model_template({
          number:model['node']['number'],
          index:model['tmp_index'],
          parent_index: model.parent['tmp_index'],
          name: model['node']['name'],
          sub_name_before:'',
          sub_name: sel_config_name ,
          error_msg: error_msg,
          is_modified:false,
          tmp_id: model['tmp_id'],
          node: model['node'],
          is_buy: model['node']['is_buy'],
          type:model['node']['type'],
          value: value,
          unit: unit
    }));

    // если есть выбранная конфигурация, то выводим толкьо ее
    // #916 -  Выводим еще клоны
    var product = null;

    if(model['node'].number=='056')
      var t =1;

    // проверка, есть ли хоть одна подходящая конфигурация в моделеи
    var have_checked_items = false;
    for(var ci in model['items'])
    {
      if(model['items'][ci]['checked'])
        have_checked_items = true;
      if(model['items'][ci]['selected'] && !model['items'][ci].is_clone)
      {
        product = model['items'][ci];
        break;
      }
    }
    // если есть выделенный конфиг, выводим только его, елси нет то все отобранные конфиги
    if(product)
    {
      product['need_specifications'] = true;
      self.renderItem(product, container, counter, have_checked_items, true);

      // #916 -  проверка на клоны, и их отрисовка
      for(var ci in model['items'])
      {
        var cl_product = model['items'][ci];
        if(cl_product.is_clone && cl_product!=product)
        {
          cl_product['need_specifications'] = true;
          self.renderItem(cl_product, container, counter, have_checked_items, true);
        }
      }
    }
    else
    {
      // отрисовка конфигураций для каждой модели
      for(var ci in model['items'])
      {
        var product = model['items'][ci];
        product['need_specifications'] = true;
        self.renderItem(product, container, counter, have_checked_items, true);
      }
    }
  },

  /**
    * Отрисовка тех процесса
    * counter = {val:1}
  **/
  renderProcess: function(process, container, counter)
  {
    var self = this;
    process['tmp_index'] = counter['index']++;
    container.append(this.templates.process_template({
        index:process['tmp_index'],
        parent_index: process.parent['tmp_index'],
        name: process['name'],
        tmp_id: process['tmp_id'],
        type:'process'
    }));
     // отрисовка свойств
    for(var propi in process['properties'])
    {
      var prop = process['properties'][propi];
      prop['tmp_index'] = counter['index']++;
       container.append(this.templates.prop_template({
            index:prop['tmp_index'],
            parent_index: process['tmp_index'],
            name: prop['name'],
            tmp_id: prop['tmp_id'],
            type:'property',
            is_specification: false,
            is_optional: false,
            values: null, // список допустимых значений
            value: prop['value'],
            units: prop['units'],
            is_editable: false
        }));
    }
    // отрисовка вложеных процессов
    for(var ci in process['items'])
      if(self.check_prop_conditions(process, process['items'][ci]))
       self.renderProcess(process['items'][ci], container, counter);
  },

  /**
    * Отрисовка элемента изделия. Рекурсия.
    * counter = {val:1}
    * have_checked_items - есть ли вообще подходящие объекты, если нет то выводятся все на выбор
  **/
  renderItem: function(data, container, counter, have_checked_items, need_specifications)
  {
    var self = this;
    data['tmp_index'] = counter['index']++;

    // #601. Руками можно выбирать любые конфигурации, доступные после отсеевания по свойствам
    // поиск вверх до первой групповой модели(покупные аналоги).
    var parent = data.parent;
    var deep = 0; // глубина проверки
    var buy_group_model = null; // групповая модель покупных аналогов
    var available_for_manual_selection = false; // доступно для ручного выбора

    while(parent)
    {
      if(deep>3)
        break;
      if(parent['node'] && parent['node']['type'] == 'product_model' && parent['is_buy_group'] )
      {
        buy_group_model = parent;
        break;
      }
      parent = parent.parent;
      deep++;
    }

    // если текущая конфигурация входит в групповую модель - "покупные аналоги", то проверяем возможность
    // ручного выбора найденной конфигурации
     if(buy_group_model && (!data['conditions'] || data['conditions'].length == 0))
        data['checked'] = true;

    var model_info = '';
    if(data.parent)
      model_info = data.parent['node']['number'] + ' ' + data.parent['node']['name'];

    var sel_spec = null;

    // Отрисовка конфигурации изделия.
    // Отрисовываем только выбранные или доступные для ручного выбораконфигурации
    if(data['checked'] || available_for_manual_selection || !have_checked_items)
    {
      // проверка на выбранную спецификацию
      if(data['specifications'])
      {
        //if(data['specifications'].length==1 )
        //    sel_spec = data['specifications'][0];
        //else
          for(var spec_i in data['specifications'])
            if(data['specifications'][spec_i]['selected'])
            {
              sel_spec = data['specifications'][spec_i];
              break;
            }
      }


      // проверка на опциональный объем
      var volume_is_optional = false;
      if(data.properties)
        for(var i in data.properties)
          if(data.properties[i].datalink == App.SystemObjects['items']['VOL_PROP'] && data.properties[i]['is_optional'])
          {
            volume_is_optional = true;
            break;
          }

      // проверка значения на формулу
      if(data['count']['is_formula'] )
        this.calculate_formula(data, data['count'], true);

      // отрисовка конфигурации
      container.append(this.templates.product_template({
          number:data['node']['number'],
          index:data["tmp_index"],
          //parent_index: ((data.parent)?data.parent.parent['tmp_index']:null), // пропустить уровень
          parent_index: ((data.parent)?data.parent['tmp_index']:null),
          name: data['node']['name'],
          sub_name_before:'',
          sub_name: ((sel_spec)?sel_spec['number'] + '.' + sel_spec['name']:''),
          is_modified:false,
          tmp_id: data['tmp_id'],
          node: data['node'],
          is_buy: data['node']['is_buy'],
          type:data['node']['type'],
          value: data['count']['value'],
          unit: data['count']['unit'],
          is_config: (counter['index']!=2),
          checked: data['selected'],
          //enabled:available_for_manual_selection
          enabled:true,
          editable_volume: ((data.parent)?true:false),
          is_clone: data.is_clone,
          volume_is_optional: volume_is_optional,
          formula: data['count']['formula']?data['count']['formula']:null,
          formula_error: data['count']['formula_error']?data['count']['formula_error']:null
      }));
    }

    // если конфигурация выбранна, то необходимо подгрузить ее содержимое
    if(data['checked'] || !have_checked_items)
    {

         //  сортировка свойств по полю - routine
      data['properties'] = data['properties'].sort(function(a,b){
          if (a['routine'] < b['routine'])
              return -1;
          else if (a['routine'] > b['routine'])
              return 1;
          return 0;
      });


      // отрисовка свойств
      for(var i in data['properties'])
      {
        var prop = data['properties'][i];

        // отображать только свойства описывающие параметры изделия
        if(prop['is_specification'])
        {
          // необходимо показать список оригинальных значений для свойства, если неоткуда наследовать значение свойства
          //var need_show_extended_view = ((prop['value'] && prop['value']['is_inherit'] /*&& !prop['value']['inherited_value_from']*/ )?true:false)
          // можно редактировать, если свойство опциональное, или в списке значений свойства задано несколько значений
          var is_editable = false;

          if(/*!prop['is_optional'] || */self.check_prop_conditions(data, prop))
          {
            // если свойство - опциональное  и имеет несколько допустимых значений
            // необходимо проверить допустимые значения по условиям
            var values_with_conditions = [];
            var values_with_out_conditions = [];

            if(/*prop['is_optional'] &&*/ prop['values'] && prop['values'].length>0)
            {
              for(var vl_i in prop['values'])
              {
                // проверка значения на условия
                self.check_prop_conditions(data, prop['values'][vl_i]);
                if(prop['values'][vl_i]['conditions'] && prop['values'][vl_i]['conditions'].length>0)
                {
                  if(prop['values'][vl_i]['checked'])
                    values_with_conditions.push(prop['values'][vl_i]);
                  else if(prop['values'][vl_i]['ignore_conditions'])
                    values_with_out_conditions.push(prop['values'][vl_i]);
                }
                else
                  values_with_out_conditions.push(prop['values'][vl_i]);
              }
            }

            // Если хотя бы одно Условие подходит - все Значения без Условий исключаются
            // Иначе - остаются только Значения без Условий (а Значение с неподходящими Условиями исключаются)
            var values = [];
            if(values_with_conditions.length>0)
              values = values_with_conditions;
            else
              values = values_with_out_conditions;

            // проверка на случай если текущее значение было отсеено по условию
            if(values.length==1)
              prop['value'] = values[0];
            if(values.length>0 && prop['value'])
            {
              var value_in_values = false;
              for(var vi in values)
                if(values[vi]['_id'] == prop['value']['_id'])
                {
                  value_in_values = true;
                  break;
                }
              if(!value_in_values)
                prop['value'] = null;
            }

            is_editable = (prop['is_optional']);

            // проверяем условия отборов для выбранного значения
            if(prop['value'])
              this.check_otbors(data, prop['value']);

            // добавление на форму элемента
            prop['tmp_index'] = counter['index']++;

            // проверка значения на формулу
            if(prop['value'] && prop['value']['is_formula'] )
              this.calculate_formula(data, prop['value'], false);

            //if(!this.show_only_options || (this.show_only_options && prop['is_optional']))
            {
              container.append(this.templates.prop_template({
                  index:prop['tmp_index'],
                  parent_index: data['tmp_index'],
                  name: prop['name'],
                  tmp_id: prop['tmp_id'],
                  type:'property',
                  is_complect: prop['is_complect'], // описывающее изделие
                  is_optional: prop['is_optional'], // опциональное
                  values: values, // список допустимых значений
                  //values: prop['values'], // список допустимых значений
                  value: prop['value'],
                  units: prop['units'],
                  //original_values: prop['original_values'],
                  //original_units: prop['original_units'],
                  //is_editable: is_editable
                  is_editable: true
              }));
            }
          }
        }
      }

      // отрисовка тех процессов
      if(!this.show_only_options)
      {
        for(var proci in data['tech_process_operations'])
        {
          var process = data['tech_process_operations'][proci];
          if(self.check_prop_conditions(data, process))
            self.renderProcess(process, container, counter);
        }
      }

      // если дошли до уровня на котором нужны спецификации, то подгружаем их
      // иначе идем по списку моделей
      if(need_specifications)
      {
        // получение списка спецификаций
        if(data['specifications'])
        {
          if(sel_spec)
          {
            var spec = sel_spec;
            spec['tmp_index'] = counter['index']++;
               container.append(this.templates.specification_template({
                  index: spec['tmp_index'],
                  number: spec['number'],
                  index: spec["tmp_index"],
                  parent_index: data['tmp_index'],
                  name: spec['name'],
                  tmp_id: spec['tmp_id'],
                  type:'СП',
                  value: data['count']['value'],
                  unit: data['count']['unit'],
                  checked: spec['selected'],
                  enabled: true
              }));
          }
          else
          {
            for(var spec_i in data['specifications'])
            {
              var spec = data['specifications'][spec_i];
              if(spec.checked)
              {
                spec['tmp_index'] = counter['index']++;
                 container.append(this.templates.specification_template({
                    index: spec['tmp_index'],
                    number: spec['number'],
                    index: spec["tmp_index"],
                    parent_index: data['tmp_index'],
                    name: spec['name'],
                    tmp_id: spec['tmp_id'],
                    type:'СП',
                    value: data['count']['value'],
                    unit: data['count']['unit'],
                    checked: spec['selected'],
                    enabled: true
                }));
               }
             }
          }
        }
        else
        {
          // вывод сообщения, что нет подходящих спецификаций для конфигурации
          container.append(this.templates.no_data_template({
            msg:'Ошибка! Нет подходящих спецификаций',
            index:0,
            parent_index: data['tmp_index']
          }));
        }
      }
      else
      {
        // отрисовка моделей
        for(var mi in data['models'])
        {
          var model = data['models'][mi];
          // если модель группирующая, то вызывается рекурсия для ее отрисовки
          if(model['is_techno_group']  || model['is_buy_group'])
            self.renderGroupModel(model, container, counter);
          else
            self.renderModel(model, container, counter);
        }
      }
    }
  },

   /**
   * Клик по строке с данными
  **/
  onTrClick: function(e)
  {
    this.$el.find('table.treetable').find('tr.selected').removeClass('selected');
    $(e.currentTarget).addClass('selected');
    this.current_item = $(e.currentTarget).data('object-tmp-id');
  },

   /**
   * Раскрытие  элемента дерева
  **/
  onNodeExpand:function(e,a){
    var self = this;
    var newHistObject = {
      'item_index': $(a.row).data('tt-id'),
      'parent_item_index': $(a.row).data('tt-parent-id')
    };

    this.openedItems[$(a.row).data('object-tmp-id')]  = true;

    setTimeout(function(){
      var tableHeader = self.$el.find('.directory-tree-header');
      $(tableHeader).width(self.$el.find('table.treetable').width());
      self.$el.find('table.treetable').find('tr:first').find('td').each(function(index){
        $(tableHeader).find('th').eq(index).width($(this).width());
      });
    }, 10);
  },

  /**
   * Сокрытие элемента дерева
  **/
  onNodeCollapse:function(e,a){
    // удаление элемента из внутренней истории
    var curHistObject = {
      'item_index': $(a.row).data('tt-id'),
      'parent_item_index': $(a.row).data('tt-parent-id')
    };
    var tmp_id = $(a.row).data('object-tmp-id');
    var data_item = this.linear_data[tmp_id];
    this.openedItems[tmp_id]  = false;
    var tableHeader = this.$el.find('.directory-tree-header');
    $(tableHeader).width(this.$el.find('table.treetable').width());
    this.$el.find('table.treetable').find('tr:first').find('td').each(function(index){
      $(tableHeader).find('th').eq(index).width($(this).width());
    });
  },

  /**
   * Событие смены значения свойства
  **/
   onPropertyUnitChange:function(e){
    var self = this;
    Backbone.trigger('global:change_config_param',[self]);
    $(e.currentTarget).removeClass('err');
    var tr = $(e.currentTarget).parents("tr:first");

    // изменяемое свойство
    var data_prop = self.linear_data[tr.data('object-tmp-id')];
    var sel_unit = $(tr).find('select.unit-val option:selected');
    var sel_unit_id = $(sel_unit).data('id');
    var new_unit = null;
    // если выбрана единица измерения
    if(sel_unit_id)
    {
      if(data_prop['value']['units'] && data_prop['value']['units'].length>0)
          for(var vi in data_prop['value']['units'])
          {
            var val =data_prop['value']['units'][vi];
            if(val['_id'] == sel_unit_id)
            {
              new_unit = val;
              break;
            }
          }
    }
    data_prop['value']['unit'] = new_unit;

    // отрисовка дерева и возврат скрола к прежней позиции
    var top =  self.$el.find(".tree-data").scrollTop();
    var left = self.$el.find(".tree-data").scrollLeft();
    // перерисовка дерева начиная от текущего уровня и вниз
    $('body').addClass('wait');
    setTimeout( function(){
      // анализ дерева на условия и наследственность
      self.analize_data(data_prop.parent);
      self.render();
      self.validate_data();
      self.$el.find(".tree-data").scrollTop(top);
      self.$el.find(".tree-data").scrollLeft(left);
      $('body').removeClass('wait');
     }, 100);
  },

  /**
   * Событие смены значения объема конфигруации
  **/
  onConfigVolumeChange:function(e){
    var self = this;
    Backbone.trigger('global:change_config_param',[self]);
    $(e.currentTarget).removeClass('err');
    var tr = $(e.currentTarget).parents("tr:first");
    // изменяемое свойство
    var data_configuration = self.linear_data[tr.data('object-tmp-id')];
    var new_val = $(tr).find('.tb-count').val();
    data_configuration['count']['value'] = Routine.strToFloat(new_val);

    // отрисовка дерева и возврат скрола к прежней позиции
    var top =  self.$el.find(".tree-data").scrollTop();
    var left = self.$el.find(".tree-data").scrollLeft();
    // перерисовка дерева начиная от текущего уровня и вниз
    $('body').addClass('wait');
    setTimeout( function(){
      // анализ дерева на условия и наследственность
      self.analize_data(data_configuration.parent);
      self.render();
      self.validate_data();
      self.$el.find(".tree-data").scrollTop(top);
      self.$el.find(".tree-data").scrollLeft(left);
      $('body').removeClass('wait');
     }, 100);

  },

  /**
   * Событие смены значения свойства
  **/
  onPropertyValueChange:function(e){
    var self = this;
    Backbone.trigger('global:change_config_param',[self]);
    $(e.currentTarget).removeClass('err');
    var tr = $(e.currentTarget).parents("tr:first");
    // изменяемое свойство
    var data_prop = self.linear_data[tr.data('object-tmp-id')];
    // смена значения в выпадающем списке
    var new_val = null;

    // основное значение
    var sel_val = $(tr).find('select.value-val option:selected');
    var sel_val_id = $(sel_val).data('id');

    /*// занчение из дополнительного списка оригинальных значений
    // выводится в случае неопределенности основного значения, и если основное значение наследуемое
    var sel_inherited_val = $(tr).find('select.inherited-value-val option:selected');
    var sel_inherited_val_id = $(sel_inherited_val).data('id');*/

    // если выбрано какое-то значение
    if(sel_val_id)
    {
      // поиск текущего значения в списке значений свойства
      if(data_prop['values'] && data_prop['values'].length>0)
        for(var vi in data_prop['values'])
        {
          var val =data_prop['values'][vi];
          if(val['_id'] == sel_val_id)
          {
            new_val = val;
            break;
          }
        }

      // если открытое значение
      if(new_val && new_val['is_open'] && $(tr).find('.additional-value').val())
        new_val['value'] = $(tr).find('.additional-value').val();
    }
    data_prop['value'] = new_val;

    // отрисовка дерева и возврат скрола к прежней позиции
    var top =  self.$el.find(".tree-data").scrollTop();
    var left = self.$el.find(".tree-data").scrollLeft();
    // перерисовка дерева начиная от текущего уровня и вниз
    $('body').addClass('wait');
    setTimeout( function(){
      // анализ дерева на условия и наследственность
      self.analize_data(data_prop.parent);
      self.render();
      self.validate_data();
      self.$el.find(".tree-data").scrollTop(top);
      self.$el.find(".tree-data").scrollLeft(left);
      $('body').removeClass('wait');
     }, 100);
  },

  /**
   * Событие клонирования конфигурации
  **/
  onAddCloneClick: function(e)
  {
    var self = this;
    Backbone.trigger('global:change_config_param', [self]);
    var btn = $(e.currentTarget);
    var tr = $(e.currentTarget).parents("tr:first");
    var parent_index = $(tr).data('tt-parent-id');
    var config = self.linear_data[tr.data('object-tmp-id')];
    var model = config.parent;
    // клонирование конфигурации----------------------------------------------------------------------------------------------
    var cloned_config = Routine.deepClone(config);
    // восстановление ссылки на родителя
    cloned_config.parent = config.parent;
    // обновление уникальных идентификаторов для клона и добавление его в линейный список
    _.extend(self.linear_data, self.preapre_and_convert_tree_to_list(cloned_config));
    cloned_config.is_clone = true;
    // добавление клона в модель
    model.items.push(cloned_config);
    //--------------------------------------------------------------------------------------------------------------------------------------------------
    //console.log(config);
    //console.log(cloned_config);
    //console.log(model);
    //console.log(this.data);
    // вызываем обновление дерева
    // отрисовка дерева и возврат скрола к прежней позиции
    var top =  self.$el.find(".tree-data").scrollTop();
    var left = self.$el.find(".tree-data").scrollLeft();
    $('body').addClass('wait');
    setTimeout( function(){
      // анализ дерева на условия и наследственность
      self.analize_data(model);
      self.render();
      self.validate_data();
      self.$el.find(".tree-data").scrollLeft(left);
      $('body').removeClass('wait');
     }, 100);
  },

  /**
   * Событие удаления клона  конфигурации
  **/
  onRemoveCloneClick: function(e)
  {
    var self = this;
    Backbone.trigger('global:change_config_param', [self]);
    var btn = $(e.currentTarget);
    var tr = $(e.currentTarget).parents("tr:first");
    var parent_index = $(tr).data('tt-parent-id');
    var config = self.linear_data[tr.data('object-tmp-id')];
    var model = config.parent;
    // удаление конфига из линейной структуры всех объектов
    delete self.linear_data[config.tmp_id];
    // удаление клона из модели
    for(var i = model.items.length - 1; i >= 0; i--)
    {
      if(model.items[i]['tmp_id'] === config.tmp_id) {
         model.items.splice(i,1);
         break;
      }
    }
    // вызываем обновление дерева
    // отрисовка дерева и возврат скрола к прежней позиции
    var top =  self.$el.find(".tree-data").scrollTop();
    var left = self.$el.find(".tree-data").scrollLeft();
    $('body').addClass('wait');
    setTimeout( function(){
      // анализ дерева на условия и наследственность
      self.analize_data(model);
      self.render();
      self.validate_data();
      self.$el.find(".tree-data").scrollLeft(left);
      $('body').removeClass('wait');
     }, 100);
  },

  /**
   * Событие выбора конфигурации
  **/
  onConfigChecked: function(e)
  {
    Backbone.trigger('global:change_config_param', [self]);
    var self = this;
    var cb = $(e.currentTarget);
    var tr = $(e.currentTarget).parents("tr:first");
    var parent_index = $(tr).data('tt-parent-id');
    var config = self.linear_data[tr.data('object-tmp-id')];

    // если выбор новой конфигурации
    if($(cb).prop('checked'))
    {
      // снять выделение в данных по всей модели
      if(config.parent && !config.is_clone)
      {
         var model = config.parent;
         for(var i in model['items'])
          if(!model['items'][i].is_clone || config.node.number != model['items'][i].node.number)
            model['items'][i]['selected']= false;
       }
      config['selected'] = true;
    }
    else
      config['selected'] = false;

    // отрисовка дерева и возврат скрола к прежней позиции
    var top =  self.$el.find(".tree-data").scrollTop();
    var left = self.$el.find(".tree-data").scrollLeft();
    $('body').addClass('wait');
    setTimeout( function(){
      // анализ дерева на условия и наследственность
      self.analize_data(config);
      self.render();
      self.validate_data();
      self.$el.find(".tree-data").scrollLeft(left);
      $('body').removeClass('wait');
     }, 100);
  },

  /**
   * Событие выбора спецификации
  **/
  onSpecificationChecked: function(e)
  {
    Backbone.trigger('global:change_config_param', [self]);
    var self = this;
    var cb = $(e.currentTarget);
    var tr = $(e.currentTarget).parents("tr:first");
    var parent_index = $(tr).data('tt-parent-id');
    var specification = self.linear_data[tr.data('object-tmp-id')];

    // если выбор новой конфигурации
    if($(cb).prop('checked'))
    {
      // снять выделение в данных по всей модели
      if(specification.parent)
      {
         var model = specification.parent;
         for(var i in model['items'])
          model['items'][i]['selected']= false;
       }
       specification['selected'] = true;

       // по спецификации выбираем сразу конфигурацию
      if(specification.parent && specification.parent.parent && ! specification.parent['is_clone'])
      {
         var model = specification.parent.parent;
         for(var i in model['items'])
          if(!model['items'][i].is_clone || specification.parent.node.number != model['items'][i].node.number)
            model['items'][i]['selected']= false;
         specification.parent['selected'] = true;
      }
    }
    else
      specification['selected'] = false;

    // отрисовка дерева и возврат скрола к прежней позиции
    var top =  self.$el.find(".tree-data").scrollTop();
    var left = self.$el.find(".tree-data").scrollLeft();
    $('body').addClass('wait');
    setTimeout( function(){
      // анализ дерева на условия и наследственность
      self.analize_data(specification);
      self.render();
      self.validate_data();
      self.$el.find(".tree-data").scrollLeft(left);
      $('body').removeClass('wait');
     }, 100);
  },

  /**
   * Раскрыть/свернуть дерево
  **/
  collapse: function(val)
  {
    this.collapsed = val;
    try{
      if(val)
          this.$el.find("table.treetable").treetable('expandAll');
      else
      {
         this.$el.find("table.treetable").treetable('collapseAll');
         this.$el.find("table.treetable").treetable('expandNode',this.$el.find("table.treetable").find('tr:first').data('tt-id'));
      }
    }
    catch (err) {}
  },

  /**
   * Валидация данных.
   * Валидация успешна если все выбранные ветки проработаны до самых корней
   * Заданы все конфигурации и спецификации
  **/
  validate: function(data, errors)
  {
    if((data['node']['type'] == 'product_model' && (data['is_techno_group'] || data['is_buy_group'])) ||
      (data['node']['type'] == 'product' && data['selected']))
    {
      // проверка на наличие выбранной спецификации для конфигурации
      if(data['node']['type'] == 'product' && data['need_specifications'])
      {
        if(data['count']['formula_error'])
        {
          errors['items'].push(data['tmp_id']);
          errors['properties'] = false;
        }

        if(!data['specifications'] || data['specifications'].length==0)
        {
          errors['configs'] = false;
          errors['items'].push(data['tmp_id']);
          if(data.parent)
          {
            errors['items'].push(data.parent['tmp_id']);
            if(data.parent.parent)
              errors['items'].push(data.parent.parent['tmp_id']);
          }
        }
        var sel_spec = null;
        for(var spec_i in data['specifications'])
          if(data['specifications'][spec_i]['selected'])
          {
            sel_spec = data['specifications'][spec_i];
            break;
          }
        if(!sel_spec)
        {
          errors['items'].push(data['tmp_id']);
          if(data.parent)
            errors['items'].push(data.parent['tmp_id']);
          errors['configs'] = false;
        }

      }
      if('models' in data)
        for(var mi in data['models'])
            this.validate(data['models'][mi], errors);
    }
    else if(data['node']['type'] == 'product_model')
    {
      if(data['items'].length==0)
      {
        errors['items'].push(data['tmp_id']);
        errors['configs'] = false;
      }
      else
      {
        var has_selected = false;
        for(var pi in data['items'])
          if(data['items'][pi]['selected'])
          {
            has_selected = true;
            this.validate(data['items'][pi], errors);
          }
        if(!has_selected)
        {
            errors['items'].push(data['tmp_id']);
            errors['configs'] = false;
        }
      }
    }
  },

  /**
   * Сбор данных, ТП - рекурсия
  **/
  get_process: function(process)
  {
      var new_items = [];
      for(var i in process['items'])
      {
        var item = process['items'][i];
        if(item['checked'])
          new_items.push(this.get_process(item));
      }
      process['items'] = new_items;
      return process;
  },

  /**
   * Сбор данных, отсеевая ненужные свойства и значения
  **/
  get: function(data)
  {

    if((data['node']['type'] == 'product_model' && (data['is_techno_group'] || data['is_buy_group'])) ||
      (data['node']['type'] == 'product' && data['selected']))
    {
      // обработка конфигурации
      if(data['node']['type'] == 'product')
      {
        // свойства
        if('properties' in data)
        {
          var new_props = [];
          for(var propi in data['properties'])
          {
            var prop = data['properties'][propi];
            if(!prop['is_specification'] || prop['checked'])
              new_props.push(prop);
          }
          data['properties'] = new_props;
        }

        // сбор ТП
        var new_tech_process_operations = [];
        for(var proci in data['tech_process_operations'])
        {
          var process = data['tech_process_operations'][proci];
          if(process['checked'])
            new_tech_process_operations.push(this.get_process(process));
        }
        data['tech_process_operations'] = new_tech_process_operations

        // спецификации               i
        var sel_spec = null;
        if(data['specifications'])
        {
          for(var spec_i in data['specifications'])
            if(data['specifications'][spec_i]['selected'])
            {
              sel_spec = data['specifications'][spec_i];
              data['specifications'] = [];
              break;
            }
            data['specification'] = sel_spec;
        }
      }
      // модели
      if('models' in data)
        for(var mi in data['models'])
            this.get(data['models'][mi]);
    }
    else if(data['node']['type'] == 'product_model')
    {
      var new_items = [];
      for(var pi in data['items'])
        if(data['items'][pi]['selected'])
        {
          new_items.push(data['items'][pi]);
          this.get(data['items'][pi]);
        }
      data['items'] = new_items;
    }
  },

  /**
   * Подготовка данных к сохранению
   * Также в данной функции заменяем расчетные значения на оригинальные
  **/
  prepare_data: function(data)
  {
    var new_data = JSON.parse(JSON.stringify(data, function(key, value) {
        if(key == 'parent' || key == 'original_values' || key=='values' || key=='conditions' || key=='original_units' || key=='inherited_value_from' || key == 'configuration_path' || key == 'tmp_id'|| key == 'tmp_index' /*|| key == 'specifications'*/)
          return '';
        return value;
    }));
    return new_data;
  },

  /**
   * Валидация  данных
  **/
  validate_data: function()
  {
    var errors = {'items':[], 'configs':true, 'specifications': true};
    this.validate(this.data, errors);
    this.$el.find("table.treetable").removeClass('highlight_err');
    for(var i in errors['items'])
      this.$el.find("tr[data-object-tmp-id='"+errors['items'][i]+"']").addClass('highlight_err');
    return errors;
  },

  /**
   * Сбор данных
  **/
  get_data: function()
  {
    var new_data = this.prepare_data(this.data);
    this.get(new_data);
    return new_data;
  },
  /**
   * Валидация и сбор данных
  **/
  validate_and_get_data: function()
  {
    if(this.data)
    {
      var errors = this.validate_data();
      if(errors['items'].length == 0)
      {
        //console.log(JSON.stringify(this.get_data()));
        return this.get_data();
      }
      else
      {
        if(!errors['configs'])
          $.jGrowl('Для некоторых веток не выбраны конечные спецификации.', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
        else if(!errors['specifications'])
          $.jGrowl('Для некоторых веток не выбраны конечные спецификации.', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
      }
    }
    return null;
  },

  /**
   * Построение комментария к комплекту
   * построение ведется по опциональынм свойствам
  **/
  get_comment: function()
  {
    var res = [];
    // проход по свойствам конфигурации, сбор опциональных свойств и значений.
    for(var pi in this.data['properties'])
    {
      var prop = this.data['properties'][pi];
      if(prop['is_optional'] && prop['checked'])
        res.push(prop['name'] + ": " + ((prop['value'])? prop['value']['value']: '') + ((prop['value'])? ' '+prop['value']['unit']: '')) ;
    }
    return res;
  }
});
