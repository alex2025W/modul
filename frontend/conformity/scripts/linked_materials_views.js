///
/// Представление списка индивидуальных характеристик
///
App.Views.LinkedMaterialsListView = Backbone.View.extend({
  events:{
    'click .btn-add-linked-material': 'onAdd',
  },
  initialize: function()
  {
    this.collection.bind('remove', this.render, this);
    this.collection.bind('change', this.render, this);
    this.render();
  },
  render: function()
  {
    var self = this;
    this.clear();
    _.each(this.collection.models, function (item) {
       self.renderItem(item);
    }, this);
    return this;
  },
  renderItem: function (item) {
    var itemView = new App.Views.LinkedMaterialsItemView({model: item});
    this.$el.find('.data-list').append(itemView.render().el);
  },
  clear: function()
  {
    this.$el.find('.data-list').empty();
  },
  show: function()
  {
    this.$el.show();
  },
  hide: function()
  {
    this.$el.hide();
  },
  onAdd: function(e)
  {
    this.collection.add(new App.Models.LinkedMaterialItemModel());
    this.render();
  }
});

/**
 * Представление элемента прилинкованного материала
 */
App.Views.LinkedMaterialsItemView = Backbone.View.extend({
  tagName:'tr',
  className:'list-item',
  templates: {
    item:_.template($("#linkedMaterialsItemTemplate").html()),
  },
  events:{
    'click .btn-remove-linked-material': 'onRemove',
    'blur .tb-linked-material-volume': 'onVolumeBlur',
    'change .tb-linked-material-code': 'onCodeChange',
    'keypress .tb-linked-material-code': 'OnCodeKeyPress',
  },
  unRender: function()
  {
    this.remove();
  },
  render: function () {
    var self = this;
    this.$el.html(this.templates.item(this.model.toJSON()));
    this.$('.tb-linked-material-volume').numeric({ negative: false, decimal: ',' });

    /*this.$(".tb-linked-material-name").autocomplete({
      serviceUrl:'/handlers/conformity/search_linked_materials/',
      paramName:"q",
      ajaxSettings:{
        type:"GET",
        dataType:"json"
      },
      transformResult:function(response, originalQuery){
        var sugglist = [];
        for(var i in response){
          sugglist.push({
            'value':response[i].label,
            'data':response[i]
          });
        }
        return {'suggestions':sugglist};
      },
      formatResult:function(suggestion, currentValue){
        var pattern = '(' + currentValue.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&") + ')';
        var html = '<span class="ttl">'+suggestion.value.replace(new RegExp(pattern, 'gi'), '<strong>$1<\/strong>');
        return html;
      },
      onSelect:function(item){
        self.model.set({
          material_id: item.data._id,
          group_id: item.data.group_id,
          code: item.data.code,
          group_code: item.data.group_code,
          volume: 0,
          group_name: item.data.group_name,
          name: item.data.name,
          unit_pto: item.data.unit_pto
        });
      }
      }).on("focusin",function(){
      }).on("focusout",function(){
        var label = self.model.get('group_code') + '.' + self.model.get('group_code') + ' ' + self.model.get('group_name');
        if(label!=$(this).val()){
          $(this).val(label);
        }
        if(!self.model.get("material_id")){
          $(this).val("");
        }
    }); */

    return this;
  },
  onRemove: function(e){
    this.model.destroy();
  },
  /**
   * Обработка события потери фокуса поля ввода Объема материала
   */
  onVolumeBlur:function(e){
    var self = this;
    var tbFactScope= $(e.target);
    var factScopeVal = Routine.strToFloat(tbFactScope.val());
    if(isNaN(factScopeVal))
    {
      factScopeVal = 0;
      tbFactScope.val('');
    }
    else
      tbFactScope.val(Routine.floatToStr(factScopeVal));
    // chande data in model
    self.model.set({'volume': factScopeVal});
  },

  /**
   *  Проверка нажатой клавиши в поле поиска по коду материала
   */
  OnWorkorderNumberKeyPress: function(e)
  {
    if(e.keyCode==13)
      this.onCodeChange(e);
  },

  /**
   *  Обработка смены кода материала
   */
  onCodeChange: function()
  {
    var self = this;
    var code_arr = this.$('.tb-linked-material-code').val().split('.');
    if(code_arr.length<2)
    {
      //$.jGrowl('Неверный формат кода материала.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
      self.model.set({
        material_id: null,
        name: 'Неверный формат кода материала.',
        have_errors: true
      });
      return;
    }
    $.ajax({
      url: "/handlers/conformity/get_material_info/" + code_arr[0] + '/' +code_arr[1],
      type: 'GET',
      dataType: 'json',
      contentType: "application/json; charset=utf-8",
      timeout: 35000,
      async: true
    }).done(function(result) {
      if(result['status']=="error"){
        //$.jGrowl(result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 10000 });
        self.model.set({
          material_id: null,
          name: result['msg'],
          have_errors: true
        });
      }
      else
      {
        var item = result['data'];
        self.model.set({
          material_id: item._id,
          group_id: item.group_id,
          code: item.code,
          group_code: item.group_code,
          volume: 0,
          group_name: item.group_name,
          name: item.name,
          unit_pto: item.unit_pto,
          have_errors: false
        });
      }
    }).error(function(){
    }).always(function(){ Routine.hideLoader(); });
  }
});
