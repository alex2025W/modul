///
/// Коллекция элементов
///
App.Collections.ItemsCollection = Backbone.Collection.extend({
    model: App.Models.ItemModel,
    url: '/handlers/esud/',
    parse:function(response){
            if(response.status=="error")
            {
                $.jGrowl(response.msg, { 'themeState':'growl-error', 'sticky':false, life: 10000 });
                return [];
            }
            return response.data;
    },
     initialize: function() {
        this.on('refresh', this.changeData, this);
    },

    changeData: function()
    {
    }
});

///
/// Коллекция элементов поиска
///
App.Collections.searchItemsCollection = Backbone.Collection.extend({
    model: App.Models.searchItemModel,
    url: '/handlers/esud/search',
    parse:function(response){
            if(response.status=="error")
            {
                $.jGrowl(response.msg, { 'themeState':'growl-error', 'sticky':false, life: 10000 });
                return [];
            }
            return response.data;
    }
});
