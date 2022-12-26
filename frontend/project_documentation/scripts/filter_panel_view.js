
var Filters = Backbone.View.extend({
  el:$("#documentation-filters"),
  initialize:function(){
    this.render();
  },
  events:{
    'click .add-new-document':'onAddDocument',
    'click .btn-filter':'onFilter'
  },
  render:function(){
    var order_sel = this.$(".ddl-filter-orders");
    for(var i in App.models['orders']) {
      var item = App.models['orders'][i];
      var html = '<option value = "'+item+'">'+item+'</option';
      order_sel.append(html);
    }

    var section_sel = this.$(".ddl-filter-section");
    App.models['sectors'].map(function(item){
      var html = '<option value = "'+item['_id']+'">'+item['name']+'</option';
      section_sel.append(html);
    });

    this.$('.ddl-filter-orders').multiselect({
      buttonContainer: '<span class="dropdown" />',
      includeSelectAllOption: true,
      enableCaseInsensitiveFiltering: true,
      numberDisplayed: 2,
      filterPlaceholder: 'Найти',
      nonSelectedText: "Заказы",
      nSelectedText: "Заказов: ",
      selectAllText: "Все",
      maxHeight: 400,
       buttonText: function(options) {
          if (options.length === 0) {
            return 'Заказы <b class="caret"></b>';
          }
          else if (options.length > this.numberDisplayed) {
              return this.nSelectedText+options.length + ' ' +  ' <b class="caret"></b>';
          }
          else {
            var selected = 'Заказы: ';
            options.each(function() {
              selected += $(this).val() + ', ';
            });
            return selected.substr(0, selected.length -2) + ' <b class="caret"></b>';
          }
        }
    });
    this.$(".pnl-ddl-filter-orders").show();
    this.$('.ddl-filter-section').multiselect({
      buttonContainer: '<span class="dropdown" />',
      includeSelectAllOption: true,
      enableCaseInsensitiveFiltering: true,
      numberDisplayed: 1,
      filterPlaceholder: 'Найти',
      nonSelectedText: "Разделы",
      nSelectedText: "Разделов: ",
      selectAllText: "Все",
      maxHeight: 400,
       buttonText: function(options) {
          if (options.length === 0) {
            return 'Разделы <b class="caret"></b>';
          }
          else if (options.length > this.numberDisplayed) {
              return this.nSelectedText+options.length + ' ' +  ' <b class="caret"></b>';
          }
          else {
            var selected = '<span class="under-text">';
            options.each(function() {
              selected += $(this).text() + ', ';
            });
            return selected.substr(0, selected.length -2) + '</span> <b class="caret"></b>';
          }
        },
        onChange: function(element, checked) {}
    });
    this.$(".pnl-ddl-filter-section").show();
    this.$('.ddl-filter-stage').multiselect({});
    this.$(".pnl-ddl-filter-stage").show();
    this.$('.ddl-filter-isagreed').multiselect({});
    this.$(".pnl-ddl-filter-isagreed").show();
  },
  onAddDocument:function(){
    var dlg = new AddEditDlg();
    dlg.show();
  },
  setInfo:function(params){
    this.$('.ddl-filter-orders option:selected').prop('selected',false);
    params.orders = params.orders?params.orders.split(','):[];
    params.sections = params.sections?params.sections.split(','):[];
    params.orders.map(function(item){
      this.$('.ddl-filter-orders option[value=\''+item+'\']').prop('selected',true);
    });
    this.$('.ddl-filter-orders').multiselect('rebuild');
    this.$('.ddl-filter-section option:selected').prop('selected',false);
    params.sections.map(function(item){
      this.$('.ddl-filter-section option[value=\''+item+'\']').prop('selected',true);
    });
    this.$('.ddl-filter-section').multiselect('rebuild');
    this.$('.ddl-filter-stage option:selected').prop('selected',false);
    this.$('.ddl-filter-stage option[value=\''+params.stage+'\']').prop('selected',true);
    this.$('.ddl-filter-stage').multiselect('rebuild');
    this.$('.ddl-filter-isagreed option:selected').prop('selected',false);
    this.$('.ddl-filter-isagreed option[value=\''+params.is_agreed+'\']').prop('selected',true);
    this.$('.ddl-filter-isagreed').multiselect('rebuild');
    this.$(".ch-filter-last-redaction").prop('checked',(params.last_redaction=='yes')?true:false );
    this.$(".ch-filter-group-sections").prop('checked',(params.group_sections=='yes')?true:false );
    App.views.DocumentsList.Fill(params);
  },
  onFilter:function(){
    var orders = [], sections=[];
    var stage="";
    var is_agreed=null;

    this.$('.ddl-filter-orders option:selected').each(function(index, brand){
      orders.push($(this).val());
    });
    this.$('.ddl-filter-section option:selected').each(function(index, brand){
      sections.push($(this).val());
    });
    stage = this.$('.ddl-filter-stage').val();
    is_agreed = this.$('.ddl-filter-isagreed').val() || null;
    var data = {'orders':orders, 'sections': sections, 'stage':stage, 'is_agreed':is_agreed, 'page':1, 'last_redaction':$('.ch-filter-last-redaction').is(":checked")?'yes':'no', 'group_sections':$('.ch-filter-group-sections').is(":checked")?'yes':'no'};
    Backbone.trigger('global:on_url_params_change',[self, 'orders', orders]);
    Backbone.trigger('global:on_url_params_change',[self, 'sections', sections]);
    Backbone.trigger('global:on_url_params_change',[self, 'stage', stage]);
    Backbone.trigger('global:on_url_params_change',[self, 'is_agreed', is_agreed]);

    Backbone.trigger('global:on_url_params_change',[self, 'last_redaction', $('.ch-filter-last-redaction').is(":checked")?'yes':'no']);
    Backbone.trigger('global:on_url_params_change',[self, 'group_sections', $('.ch-filter-group-sections').is(":checked")?'yes':'no']);


    Backbone.trigger('global:on_url_params_change',[self, 'page', 1]);
    App.views.DocumentsList.Fill(data);
  }
});
