var ClientModel = require('./models/client_model');
var ClientCardView = require('./views/client_card_view');

window.AppView = Backbone.View.extend({
    client:null,
    client_view:null,
    showLoader:function(){
            $.blockUI({'message':'<img src="/static/img/spinner.gif">', 'css':{'border':'none', 'backgroundColor':'transparent'}, 'overlayCSS':{'backgroundColor':'#fff', 'cursor':'pointer'}});
    },
    hideLoader:function(){
            $.unblockUI();
    },
    initialize:function(){
        this.client = new ClientModel(this.options.client_model?this.options.client_model:{});
        if(!this.options.client_model){
            this.client.set({'id':this.options.client_id})
            this.client.set({'name':this.options.client_name})
        }
        this.client.bind('request', this.showLoader, this);
        this.client.bind('sync', this.hideLoader, this);
        this.client_view = new ClientCardView({'model':this.client, 'is_add_order':this.options.is_add_order});
        this.init_complete = true;
    },

    /**
      * Парсинг URl параметров
    **/
    doQuery: function(query){
        var self = this;
        if(query)
            if(!this.client_view || !this.client_view.render_complete)
                setTimeout(function(){self.doQuery(query)},500);
            else
                self.client_view.go_to_contact(query);
    }
});
