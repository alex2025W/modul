var AppRouter = Backbone.Router.extend({
  routes: {
    "": "index",
    ":query": "index",
    "*path": "index"
  },
  index:function(query){
    App.doQuery(query);
  }
});
