define([
  'underscore',
  'backbone',
  'global',
  'scrollhelper',
  'datahelper',
  'infoblockordergroups'
], function(_, Backbone, G, ScrollHelper, D, OrderGroups)
{
  var InfoBlockView = Backbone.View.extend({
    tagName: 'div',
    className: 'info-block',
    template: $('#info-block-template').html(),
    events: {
      'click .path': 'onPathClick',
      'click .node-link': 'onNodeLinkClick',
      'click .grouping .btn-group .btn': 'onGroupingClick',
      'click .i-notify': 'onNotifyClick',
    },

    initialize: function() {
      this.listenTo(G.events, 'selector:model', this.render);
    },

    render: function() {
      var node = G.appView.model.getNodeById(this.model.id);
      this.$el.html(_.template(this.template, {
        nodeId: this.model.id,
        selDate: this.model.get('selDate'),
        G:G,
        dateRange: this.model.get('range') || [],
        need_notification: (node)?node.need_notification:false,
        orderList: OrderGroups.buildOrderList(
          this.model.get('range'),
          this.model.get('groupType')),
        activeGrouping: this.model.get('groupType')
      }));

      if (this.model.id) {
        // render all widgets
        G.events.trigger('render:info-block',
                 this.$el.find('.widgets-container'),
                 this.model);
      }
      return this;
    },

    remove: function () {
      Backbone.View.prototype.initialize.apply(this, arguments);
      // send message to all widgets that is time to kill themself
      G.events.trigger('remove:info-block', this.model);
    },

    onGroupingClick: function(e) {
      var groupType = $(e.target).data('type');
      this.model.set('groupType', groupType);
      G.events.trigger('change:grouping-type', groupType);
      this.render();
    },

    onPathClick: function() {
      this.pointToNode(this.model.id);
    },

    onNodeLinkClick: function(e) {
      this.pointToNode($(e.target).closest('.node-link').data('path'));
    },

    pointToNode: function(nodeId) {
      var whenNodeIsVisibleCallback = function() {
        G.appView.nodesView.flashNode(nodeId);
      };
      ScrollHelper.pointToNode(nodeId, whenNodeIsVisibleCallback);
    },

    onNotifyClick: function(e){
      // локальная функция получения списка нарядов, затронутых обновением
      function get_all_workorders(row){
        var result = [];
        for(var i in row['nodes'])
        {
          if(row['nodes'][i]['node_type'] == 'workorder')
            result.push(row['nodes'][i]['name']);
          result = result.concat(get_all_workorders(row['nodes'][i]));
        }
        return result;
      }
      var self = this;
      e.preventDefault();
      var node = G.appView.model.getNodeById(this.model.id);
      G.events.trigger("start:loading");
      $.ajax({
        type: "POST",
        url: "/timeline/api/update_need_notification",
        data: JSON.stringify({id: node['id'], node_type:node['node_type'], 'need_notification':!node['need_notification'], 'work_orders':get_all_workorders(node)}),
        timeout: 35000,
        contentType: 'application/json',
        dataType: 'json',
        async:true
      }).done(function(result) {
        if(result['status']=="ok")
        {
          //$.jGrowl('Данные успешно сохранены.' , { 'themeState':'growl-success', 'sticky':false });
          node['need_notification'] = !node['need_notification'];
          // перерисовка панели
          self.render();
          // событие на сохранение текущего статуса нотификации у нода
          setTimeout(
             function(){ G.events.trigger('change:need_notification', {node_id: self.model.id, 'need_notification':node['need_notification']});}
          ,100);
        }
        else
        {
          alert('Ошибка сохранения данных. Подробности: ' + result['msg']);
          //$.jGrowl('Ошибка сохранения данных. Подробности: ' + result['msg'], { 'themeState':'growl-error', 'sticky':false, life: 10000 });
        }
      }).always(function(){G.events.trigger("stop:loading");});
    }
  });

  return InfoBlockView;
});
