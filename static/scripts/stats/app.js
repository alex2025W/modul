///
/// Глобальная структура
///
var App = {
    Models: {},
    Views:{},
    Collections:{},
    Route:null,
    ControlPanelView: null,
    DataView: null,
    Weekends: [],
    /**
     *  Инициализация необходимых объектов
    **/
    initialize: function(data, weekends)
    {
        //this.ControlPanelView =  new  App.Views.ControlPanelView(item_model);
        this.Weekends = weekends;
        this.DataView =  new  App.Views.DataView(data);
    }
}

///
/// Контрол отображения данных
///
App.Views.DataView = Backbone.View.extend({
    el: $("#stats_data_container"),
    templates: {
        data:_.template($("#dataTemplate").html()),
    },
    events:{
        //'click #btnBriefFind': 'obrabotka',
    },

    /**
    * Инициализация
    **/
    initialize: function(collection)
    {
        this.render(collection);
    },

    /**
        * Отрисовка
    **/
    render:function(collection)
    {
        this.$el.html(this.templates.data(collection));
    }
});
