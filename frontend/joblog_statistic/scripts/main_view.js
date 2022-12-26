App.Views.MainView = Backbone.View.extend({
  el: $("#joblog"),
  events:{
    'click .nav-tabs a':'onTabClicked'
  },
  initialize: function(){
    // глобальное событие на изменение вида отображаемых данных
    Backbone.on("global:on_change_view_mode",this.onChangeViewMode,this);
  },
  onChangeViewMode: function(params){
    var view_mode = params[1];
    $("#data-table").hide();
    $("#data-charts").hide();
    $(".nav-tabs").find('li').hide();
    switch(view_mode){
      case 'data-table':
        $("#data-table").show();
        $(".nav-tabs").find('[data-type="data-table"]').parent().show();
       break;
      case 'data-charts':
        $("#data-charts").show();
        $(".nav-tabs").find('[data-type="data-charts"]').parent().show();
      break;
    }
  },
  onTabClicked:function(e){
    e.preventDefault();
    this.setTab($(e.currentTarget).data('type'));
    // save in url
    Backbone.trigger('global:on_url_params_change',[
      this,
      'current_tab',
      $(e.currentTarget).data('type'),
      false
    ]);
    Backbone.trigger('global:on_tab_change', [ this, $(e.currentTarget).data('type') ]);
  },
  setTab: function(key){

    $("#data-table").hide();
    $("#data-charts").hide();
    $(".nav-tabs").find('li').removeClass('active');
    $(".nav-tabs").find('[data-type="'+key+'"]').parent().addClass('active');
    switch(key)
    {
      case 'data-table':
        $("#data-table").show();
      break;
      case 'data-charts':
        $("#data-charts").show();
      break;
      default:
        $("#data-charts").show();
      break;
    }
  },
  showData: function(val){
    this.$('#main-data-container').hide();
    if(val)
      this.$('#main-data-container').show();
  }
});
