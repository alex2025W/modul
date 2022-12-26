///
/// Контрол управленяи списокм материалов
///
App.Views.MaterialItemsView = Backbone.View.extend({
  el: $("#pnlMaterialsDataContainer"),
  initialize: function () { var self = this; },
  render: function () {
    var that = this;
      _.each(this.collection.models, function (item) {
        that.renderItem(item);
    }, this);
  },
  renderItem: function (item) {
    var materialItemView = new App.Views.MaterialItemView({model: item});
    this.$el.append(materialItemView.render().el);
  }
});

///
/// Контрол управления элементом материала
///
App.Views.MaterialItemView = Backbone.View.extend({
  tagName:'div',
  className:'line data-item',
  templates: {
    main:_.template($("#planNormMaterialItem").html()),
  },
  events:{
    'blur .tbFact': 'onFactBlur',
  },

  /**
   * Обработка события потери фокуса поля ввода факстического объема
   */
  onFactBlur:function(){
    var self = this;
    var tbFactScope=  this.$('.tbFact');
    var tbBalance=  this.$('.tbBalance');
    var balanceVal = Routine.strToFloat(self.model.get('balance').toFixed(3));
    if(isNaN(balanceVal))
          balanceVal = 0;
    var factScopeVal = Routine.strToFloat(tbFactScope.val());
    if(isNaN(factScopeVal))
    {
      factScopeVal = 0;
      tbFactScope.val('0');
    }
    else
      tbFactScope.val(Routine.floatToStr(factScopeVal.toFixed(3)));
    if(factScopeVal>balanceVal)
    {
      tbFactScope.addClass('tberr');
      var msg = "Фактический объем материала не может превышать плановый ";
      msg+="(по норме остаток: " + Routine.addCommas(balanceVal.toFixed(3)," ") + "; ";
      msg+="по факту: " + Routine.floatToStr(factScopeVal) + ").";
      $.jGrowl(msg, { 'themeState':'growl-error', 'sticky':false, life: 10000 });
    }
    else
      tbFactScope.removeClass('tberr');
    // chande data in model
    self.model.set({'changed':true, 'fact_scope': factScopeVal});
  },

  /**
   * Отрисовка элемента
   */
  render: function () {
    this.$el.html(this.templates.main(this.model.toJSON()));
    this.$('.tbFact').numeric({ negative: false, decimal: ',' });
    return this;
  }
});
