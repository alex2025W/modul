var OutgoingView = require('./views/outgoing_view');
var OutgoingTableView = require('./views/outgoing_table_view');
var OutgoingCollection = require('./collections/outgoing_collection');
$(function() {
    var outgoing_collection = new OutgoingCollection();
    outgoing_collection.fetch().done(function(){
      var outgoing = new OutgoingView({collection: outgoing_collection});
      var outgoing_list = new OutgoingTableView({collection: outgoing_collection});
    })
});
