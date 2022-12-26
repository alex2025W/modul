/**
 * Routers
 */
var AppRouter = MyRouter.extend({
  routes: {
    "": "index",
    ":query": "index",
    "*path": "index"
  },
  initialize: function(app){
    this.app = app;
  },
  index:function(query){
    this.app.doQuery(query);
  }
});
