/*
 * роутер на базе Backbone
 * Роутер обрабатывает все входные URL, архивируя из deflate архиватором
 */
var MyRouter = Backbone.Router.extend({
  _bindRoutes:function(){
    Backbone.Router.prototype._bindRoutes.apply(this, arguments);
    this.route('_zip_link=*searchQuery', 'zippedLink');
  },
  zippedLink:function(searchQuery){
    var unzipped_uri =  Routine.unzipStr(searchQuery);
    Backbone.history.loadUrl(unzipped_uri);
    this.navigate(unzipped_uri, true);

  },
  navigate: function(fragment, trigger){
    return Backbone.Router.prototype.navigate("_zip_link=" + Routine.zipStr(fragment), {trigger: false, replace: true });
  }
});
