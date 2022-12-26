///---------------------------------------------------------------------------------------------------------
/// представление требуемых групп материалов
///---------------------------------------------------------------------------------------------------------
App.Views.RequiredGroupsView = Backbone.View.extend({
  templates: {
    dataGrid: _.template($("#RequiredGroupsGridTemplate").html()),
  },
  events:{
    'click a.carousel':'onItemCheck'
  },
  initialize:function(){
    this.render();
  },
  render:function(){
    this.renderDataGrid();
    return this;
  },
  /**
   * Установление выбранного статуса в интерфейсе
   */
  setStatus: function(ctrl, status){
    var statuses = {
      required:{icon: 'fa-check-circle', color: 'color-green', title: 'Требуется'},
      not_required:{icon: 'fa-minus-circle', color: 'color-red', title: 'Не требуется'},
      undefined:{icon: 'fa-question', color: 'color-white', title: 'Не определено'},
    }
    for(var i in statuses){
      $(ctrl).find('i').removeClass(statuses[i].icon);
      $(ctrl).removeClass(statuses[i].color);
    }
    $(ctrl).addClass(statuses[status].color);
    $(ctrl).find('a')
      .data('value', status)
      .attr('title', statuses[status].title)
      .find('i').addClass(statuses[status].icon);
  },
  /**
   * Draw grid with material groups and production
   */
  renderDataGrid: function(){
    this.$el.html(this.templates.dataGrid(this.model));
    // check saved groups
    if(this.model.required_groups)
    {
      for(var i in this.model.required_groups)
      {
        var tmp = this.model.required_groups[i];
        var key = tmp['production_id']+'_'+tmp['group_id'];
        var value = tmp['value'] || 'undefined';
        this.setStatus(this.$("#"+key), value);
      }
    }
  },
  /**
   * Событие выбора группы для заказа
   */
  onItemCheck:function(e){
    var self = this;
    var chk = $(e.currentTarget);
    var td = $(chk).parent();
    var selected_value =$(chk).find('i').parent().data('value');
    switch(selected_value)
    {
      case 'required':
        this.setStatus(td, 'not_required');
        break;
      case 'not_required':
        this.setStatus(td, 'undefined');
        break;
      default:
        this.setStatus(td, 'required');
        break;
    }

    var dataToSave = [];
    this.$el.find('.group-value').each(function(i){
      var value = $(this).find('.carousel').data('value') || 'undefined';
        dataToSave.push({
          production_id: $(this).data('prod_id'),
          group_id: $(this).data('group_id'),
          value: value
        });
    });

    $.ajax({
      type: "PUT",
      url: "/handlers/plannorm/required_groups/",
      data: JSON.stringify({groups: dataToSave, contract_id: this.model.contract._id}),
      timeout: 35000,
      contentType: 'application/json',
      dataType: 'json',
      async:true
    }).done(function(result) {
      if(result['status']!="ok")
        $.jGrowl('Ошибка сохранения данных.' + result['msg'], {
          'themeState':'growl-error',
          'sticky':false,
          life: 10000
        });
        Backbone.trigger('global:on_save_required_groups_complete',[
          self,
          self.checkAllStatuses(dataToSave)
        ]);
    }).always(function(){});
   },

   /**
    * Проверка наличия не определенных статусов
    */
  checkAllStatuses: function(data){
    if(data){
      for(var i in data){
        if(data[i]['value']=='undefined')
          return false;
      }
      return true;
    }
    return false;
  }
});
