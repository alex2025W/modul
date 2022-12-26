define([
    'jquery',
    'underscore',
    'backbone',
    'd3',
    'global',
    'jgrowl',
    'clipboard',
    'bootstrap'
], function($, _, Backbone, d3, G, jGrowl, Clipboard) {

    var ViewMenuView = Backbone.View.extend({
        el: '#view-menu',

        template: $('#view-menu-template').html(),

        events: {
            'click a[data-item]': 'toggle',
            'click .btn-size-plus': 'onBtnSizePlus',
            'click .btn-size-minus': 'onBtnSizeMinus',
            //'click .btn-url-link': 'onBtnUrlLinkClick',
            //'mouseover  .btn-url-link': 'onBtnUrlLinkOver',
        },

        initialize: function() {
            var self = this;
            this.$el.show();
            this.render();
            G.router.on("route:applyDatamining", this.onRouting, this);
            this.listenTo(this.collection, 'change', this.render);

            /*// подсказка на кнопку копирования URL  в clipboard
            self.$(".btn-url-link").tooltip({
                placement : 'bottom',
                title: 'Скопировать ссылку в буфер',
                //trigger: "hand",
                delay: { show: 10, hide: 10 }
            });

            // модуль копирования в буфер обмена
            new Clipboard('.btn-url-link', {
                text: function(trigger) {
                    var zipped_uri =Base64.toBase64(RawDeflateStr.deflate(Base64.utob(window.location.hash)));
                    //console.log(window.location.origin+window.location.pathname+ "#short_link=" + zipped_uri);
                    G.router.navigate("short_link="+zipped_uri,{ trigger: false });
                    return window.location.origin+window.location.pathname+ "#short_link=" + zipped_uri;
                }
            }); */

            // debug
            // this.listenTo(this.collection, 'all', function() { console.log('eve', arguments); });            
        },        

        render: function() {
            this.$el.find('ul.dropdown-menu').html(_.template(this.template, {
                items: this.collection.models
            }));

            return this;
        }, // render

        onRouting:function(dummySort, dummyCompleted, dummySelector,layersList){
            if(layersList){
                if(layersList=="all"){
                    this.collection.each(function(item){
                        item.set('visible',true);
                    });
                }else
                {
                    var layers = layersList.split(',');
                    this.collection.each(function(item){
                        var is_find = false;
                        layers.map(function(ly){
                            if(ly==item.get('name'))
                                is_find = true;
                        });
                        item.set('visible',is_find);                
                    });
                }
                this.render();
            }else
            {
                this.collection.each(function(item){
                   item.set('visible',false);
                });
                this.render();
            }
        },

        toggle: function(e) {
            this.collection.get($(e.target).data('item')).toggle();
            this.$el.find('.badge').html(
                this.collection.filter(function(item) { return !item.get('visible'); }).length || ''
            );
            var j_filter = [];
            this.collection.each(function(item){
                if(item.get("visible"))
                    j_filter.push(item.get("name"));
            });            
            G.router.navigateSmart({ layers: j_filter.join() }, { trigger: false });
            e.preventDefault();
        },

        onBtnSizePlus: function(e){
            G.events.trigger('zoom_full',{'action': 'plus'});
        },

        onBtnSizeMinus: function(e){
            G.events.trigger('zoom_full',{'action': 'minus'});
        },

        /*onBtnUrlLinkOver: function(e){
            this.$(".btn-url-link").attr('data-original-title', "Скопировать ссылку в буфер").tooltip('fixTitle').tooltip('show');
        },

        onBtnUrlLinkClick: function(e){

            //var zipped_uri =Base64.toBase64(RawDeflateStr.deflate(Base64.utob(window.location.hash)));
            //console.log(window.location.origin+window.location.pathname+ "#short_link=" + zipped_uri);
            //this.$(".btn-url-link").tooltip({title:window.location.origin+window.location.pathname+ "#short_link=" + zipped_uri});
            this.$(".btn-url-link").tooltip('hide').attr('data-original-title', 'Ссылка скопирована в буфер').tooltip('fixTitle').tooltip('show');
            //this.$(".btn-url-link").tooltip('show');
             //setTimeout(function () {
             //   this.$(".btn-url-link").tooltip('destroy');
              // }, 2000);

            
            //G.events.trigger('zoom_full',{'action': 'minus'});
            // get current url
            // zip current url
            // copy to buffer current url
            //var zipped_uri =Base64.toBase64(RawDeflateStr.deflate(Base64.utob(window.location.hash)));
            //var zipped_uri = base64js.fromByteArray(RawDeflate.deflate(Base64.utob(window.location.hash)));
            //console.log(zipped_uri);
            //var unzipped_uri = Base64.btou(RawDeflate.inflate(Base64.fromBase64(zipped_uri)));
            //var unzipped_uri = Base64.btou(RawDeflate.inflate(Base64.fromBase64(zipped_uri)));
            //console.log(unzipped_uri);
            //$.jGrowl('Ссылка на страницу скопирована в буффер обмена', { 'themeState':'growl-error', 'sticky':true, life: 5000 });
            //alert("123");
            //base64js.fromByteArray(RawDeflate.deflate(Base64.utob(JSON.stringify(window.location.hash))));
            //G.router.navigateSmart({ load: "gopa1123123" }, { trigger: true });
            
            e.preventDefault();
        }, */

        dummy: null
    });

    return ViewMenuView;
});

