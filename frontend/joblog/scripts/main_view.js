///
/// Контрол управление всем представлением
///
App.Views.MainView = Backbone.View.extend({
  el: $("#joblog"),
  events:{
    'click .nav-tabs a':'onTabClicked'
  },
  initialize: function(){
    // глобальное событие на изменение вида отображаемых данных
    Backbone.on("global:on_change_view_mode",this.onChangeViewMode,this);
  },

  /**
   * Событие на сменувида отображаемых жанных - список/ детализация
   * params = list or detail
   */
  onChangeViewMode: function(params){
    var view_mode = params[1];
    $("#data-ktu-statistic").hide();
    $("#main-data").hide();
    $("#data-plans").hide();

    $(".nav-tabs").find('li').hide();

    switch(view_mode){
      case 'detail':
        $("#main-data").show();
        // $("#data-plans").show();
        $(".nav-tabs").find('[data-type="data_plans"]').parent().show();
        $(".nav-tabs").find('[data-type="main_data"]').parent().show();
       break;
      case 'list':
        $("#main-data").show();
        // $("#data-ktu-statistic").show();
        $(".nav-tabs").find('[data-type="main_data"]').parent().show();
        $(".nav-tabs").find('[data-type="data_ktu_statistic"]').parent().show();
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
  },
  setTab: function(key){
    $("#data-ktu-statistic").hide();
    $("#main-data").hide();
    $("#data-plans").hide();

    $(".nav-tabs").find('li').removeClass('active');
    $(".nav-tabs").find('[data-type="'+key+'"]').parent().addClass('active');
    switch(key)
    {
      case 'main_data':
        $("#main-data").show();
      break;
      case 'data_plans':
        $("#data-plans").show();
      break;
      case 'data_ktu_statistic':
        $("#data-ktu-statistic").show();
      break;
    }
  }
});
