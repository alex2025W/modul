var IncomingView = require('./views/incoming_view');
var IncomingTableView = require('./views/incoming_table_view');
var IncomingCollection = require('./collections/incoming_collection');
$(function() {
  var incoming_collection = new IncomingCollection();
  incoming_collection.fetch().done(function(){
    var incoming = new IncomingView({collection: incoming_collection});
    var incoming_list = new IncomingTableView({collection: incoming_collection});
  })
});
