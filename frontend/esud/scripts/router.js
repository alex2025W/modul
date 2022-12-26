///
/// Роутер
///
var AppRouter = Backbone.Router.extend({
    routes: {
      "": "index",
      ":query": "go"
    },

    index:function(){
        // обновление данных в командерах
        App.refreshData();
    },

    go:function(query)
    {
        // обработка и выполнение запроса
        App.doQuery(query);
    }
});
