
///------------------------------------------------------------------------------------------------------------------------------------------------
///---------Коллекции-----------------------------------------------------------------------------------------------------------------------
///------------------------------------------------------------------------------------------------------------------------------------------------
///
/// Коллекция спецификаций
///
App.Collections.ItemsCollection = MultiSortCollection.extend({
    model: App.Models.ItemModel,
    bySector: function (id) {
        var filtered = this.filter(function (item) {
            return item.get("sector")['origin_id'] === id;
        });
        return new App.Collections.ItemsCollection(filtered);
    },
    clearBySector: function (id) {
        var filtered = this.filter(function (item) {
            return item.get("sector")['origin_id'] === id;
        });
        for(var i in filtered)
            this.remove(filtered[i]);
    },
    clearMessages: function(){
        for(var i in this.models)
            this.models[i].clear_messages();
    },
    clearMessagesBySector: function(id){
        for(var i in this.models)
            if(this.models[i].get("sector")['origin_id'] === id)
                this.models[i].clear_messages();
    },
    clearVolumes: function(){
        for(var i in this.models)
            this.models[i].clear();
    }
});
///
/// Коллекция участков
///
App.Collections.SectorsCollection = Backbone.Collection.extend({
    model: App.Models.SectorModel
});
///
/// Коллекция фильтров по пецификациям
///
App.Collections.SpecificationFilterCollection = Backbone.Collection.extend({
    model: App.Models.SpecificationFilterModel,
    initialize: function (options) {
        this.on('add', function (model, collection, options) {
             this.reindex();
        });
        this.on('remove', function (model, collection, options) {
             this.reindex();
        });
    },
    reindex: function()
    {
        var index = 0;
        for(var i in this.models)
        {
            this.models[i].set({'index': index});
            index++;
        }
    }
});
///
/// Коллекция конечных изделий-спецификаций
///
App.Collections.SpecificationOwnerCollection = MultiSortCollection.extend({
    model: App.Models.SpecificationOwnerModel
});
