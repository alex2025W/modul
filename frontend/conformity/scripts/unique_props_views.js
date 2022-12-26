///
/// Представление списка индивидуальных характеристик
///
App.Views.UniquePropsListView = Backbone.View.extend({
  events: {
    'click .btn-add-unique-prop': 'onAdd',
  },
  initialize: function() {
    this.collection.bind('remove', this.render, this);
    this.collection.bind('change', this.render, this);
    this.render();
  },
  render: function() {
    var self = this;
    // Очистка формы
    this.clear();
    // максимальный ключ из существующего списка
    var index = 0;
    _.each(this.collection.models, function(item) {
      if (
        item.get('type') == 'prop' &&
        item.get('_id') &&
        item.get('key') > index
      )
        index = item.get('key');
    });
    _.each(
      this.collection.models,
      function(item) {
        if (item.get('type') == 'prop') {
          if (!item.get('_id')) {
            ++index;
            item.set('key', index, { silent: true });
          }
          self.renderItem(item);
        }
      },
      this,
    );
    return this;
  },
  renderItem: function(item) {
    var itemView = new App.Views.UniquePropsItemView({
      model: item,
      parent: this,
    });
    if (item.get('is_active'))
      this.$el
        .find('#tab-active-props')
        .find('.data-list')
        .append(itemView.render().el);
    else
      this.$el
        .find('#tab-not-active-props')
        .find('.data-list')
        .append(itemView.render().el);
  },
  clear: function() {
    this.$el.find('.data-list').empty();
  },
  show: function() {
    this.$el.show();
  },
  hide: function() {
    this.$el.hide();
  },
  onAdd: function(e) {
    this.collection.add(new App.Models.UniquePropItemModel());
    this.render();
  },

  /**
   * Деактивирование характеристики
   */
  removeItem: function(itemModel) {
    var presets = [];
    _.each(this.collection.models, function(item) {
      if (item.get('type') == 'preset') {
        var items = item.get('items');
        for (var i in items)
          if (
            items[i]['_id'] == itemModel.get('_id') &&
            items[i]['is_active'] == true
          )
            presets.push(item);
      }
    });
    if (presets.length > 0) {
      bootbox.confirm(
        'Все составные характеристики в которых задействован данный материал будут также отключены. Продолжить?',
        function(result) {
          if (result) {
            itemModel.set('is_active', false);
            for (var i in presets) {
              presets[i].set('is_active', false);
            }
          }
        },
      );
    }
    else{
      itemModel.set('is_active', false);
    }
  },
});

/**
 * Представление элемента индивидуальной характеристики
 */
App.Views.UniquePropsItemView = Backbone.View.extend({
  tagName: 'tr',
  className: 'list-item',
  templates: {
    item: _.template($('#uniquePropsItemTemplate').html()),
  },
  events: {
    'click .btn-remove-unique-prop': 'onRemove',
    'click .btn-repair-unique-prop': 'onRepair',
    'change .tb_unique_prop_name': 'onChangeName',
    'change .tb_unique_prop_norm_price': 'onChangeNormPrice',
    'change .cb_unique_prop_active': 'onActivate',
  },
  initialize: function() {
    this.parentView = this.options['parent'];
  },
  unRender: function() {
    this.remove();
  },
  render: function() {
    this.$el.html(this.templates.item(this.model.toJSON()));
    this.$el.removeClass('removed');
    this.$('.is_money, .is_float').numeric({ negative: false, decimal: ',' });
    return this;
  },
  onRemove: function(e) {
    if (!this.model.get('_id')) this.model.destroy();
    else
      this.parentView.removeItem(this.model);
  },
  onRepair: function(e) {
    this.model.set('is_active', true);
  },
  onChangeNormPrice: function(e) {
    // this.model.set("norm_price", this.$(".tb_unique_prop_norm_price").val());

    //-----
    var last_goods = this.model.get('last_goods');
    if (!last_goods)
      last_goods = {
        price: 0,
        date: '',
        account: '',
        account_type: '',
        good_code_1c: '',
        coef_si_div_iu: 1,
        user: '',
      };

    last_goods['price'] = Routine.strToFloat(
      this.$('.tb_unique_prop_norm_price').val(),
    );
    last_goods['date'] = moment.utc(new Date());
    last_goods['user'] = MANAGER; // get from global
    //-----------------------------
  },
  onChangeName: function(e) {
    this.model.set('name', this.$('.tb_unique_prop_name').val());
  },
  onActivate: function(e) {
    this.model.set(
      'is_active',
      this.$('.cb_unique_prop_active').prop('checked'),
    );
  },
});

///
/// Представление списка комплексных индивидуальных характеристик
///
App.Views.ComplexPropsListView = Backbone.View.extend({
  events: {
    'click .btn-add-complex-prop': 'onAdd',
  },
  initialize: function() {
    this.collection.bind('remove', this.render, this);
    this.collection.bind('change', this.render, this);
    this.render();
  },

  render: function() {
    var self = this;
    // Очистка формы
    this.clear();
    // максимальный ключ из существующего списка
    var index = 500;
    _.each(this.collection.models, function(item) {
      if (
        item.get('type') == 'preset' &&
        item.get('_id') &&
        item.get('key') > index
      )
        index = item.get('key');
    });

    // сбор всех простых характеристик
    var simple_props = {};
    _.each(this.collection.models, function(item) {
      if (
        item.get('type') == 'prop' &&
        item.get('is_active') &&
        item.get('_id')
      )
        simple_props[item.get('key')] = item.toJSON();
    });

    _.each(
      this.collection.models,
      function(item) {
        if (item.get('type') == 'preset') {
          if (!item.get('_id')) {
            ++index;
            item.set('key', index, { silent: true });
          }
          self.renderItem(item, simple_props);
        }
      },
      this,
    );
    return this;
  },
  renderItem: function(item, simple_props) {
    var itemView = new App.Views.ComplexPropsItemView({
      model: item,
      simple_props: simple_props,
    });
    if (item.get('is_active'))
      this.$el
        .find('#tab-active-complex-props')
        .find('.data-list')
        .append(itemView.render().el);
    else
      this.$el
        .find('#tab-not-active-complex-props')
        .find('.data-list')
        .append(itemView.render().el);
  },
  clear: function() {
    this.$el.find('.data-list').empty();
  },
  show: function() {
    this.$el.show();
  },
  hide: function() {
    this.$el.hide();
  },
  onAdd: function(e) {
    var new_prop = new App.Models.UniquePropItemModel();
    new_prop.set({ type: 'preset' });
    this.collection.add(new_prop);
    this.render();
  },
});

/**
 * Представление составного элемента индивидуальной характеристики
 */
App.Views.ComplexPropsItemView = Backbone.View.extend({
  tagName: 'tr',
  className: 'list-item',
  templates: {
    item: _.template($('#complexPropsItemTemplate').html()),
  },
  events: {
    'click .btn-remove-unique-prop': 'onRemove',
    'click .btn-repair-unique-prop': 'onRepair',
    'change .tb_unique_prop_norm_price': 'onChangeNormPrice',
  },
  simple_props: null, // список простых характеристик
  initialize: function() {
    this.simple_props = this.options.simple_props;
  },
  unRender: function() {
    this.remove();
  },
  render: function() {
    var self = this;
    this.$el.html(
      this.templates.item(
        $.extend({}, this.model.toJSON(), {
          simple_props: this.simple_props,
        }),
      ),
    );

    // add multiselect to props
    var ddl = this.$('.ddl-unique-props');
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
        // get all selecyed props
        // make complex prop from this
        var used_unique_props = [];
        $(ddl)
          .next()
          .find('input:visible')
          .each(function() {
            if (
              $(this).val() != '' &&
              $(this).val() != 'multiselect-all' &&
              $(this).prop('checked')
            )
              used_unique_props.push(self.simple_props[$(this).val()]);
          });
        self.makeProp(used_unique_props);
        //self.render();
      },
    });

    this.$('.is_money, .is_float').numeric({
      negative: false,
      decimal: ',',
      altDecimal: '.',
    });

    return this;
  },

  onChangeNormPrice: function(e) {
    // this.model.set("norm_price", this.$(".tb_unique_prop_norm_price").val());

    //-----
    var last_goods = this.model.get('last_goods');
    if (!last_goods)
      last_goods = {
        price: 0,
        date: '',
        account: '',
        account_type: '',
        good_code_1c: '',
        coef_si_div_iu: 1,
        user: '',
      };

    last_goods['price'] = Routine.strToFloat(
      this.$('.tb_unique_prop_norm_price').val(),
    );
    last_goods['date'] = moment.utc(new Date());
    last_goods['user'] = MANAGER; // get from global
    //-----------------------------
  },

  /**
   * make complex propby list of simple props
   */
  makeProp: function(items) {
    var unique_props_names_str = '';
    var unique_props_keys_str = '';

    if (items && items.length > 0) {
      var all_names = [];
      var all_keys = [];
      for (var i in items) {
        var item = items[i];
        all_names.push(item['name']);
        all_keys.push(item['key']);
      }
      unique_props_names_str = all_names.join('; ');
      unique_props_keys_str = all_keys.join('_');
    }

    this.model.set(
      {
        items: items,
        name: unique_props_names_str,
        hash: unique_props_keys_str,
      },
      { silent: true },
    );
  },
  onRemove: function(e) {
    if (!this.model.get('_id')) this.model.destroy();
    else this.model.set('is_active', false);
  },
  onRepair: function(e) {
    this.model.set('is_active', true);
  },
});
