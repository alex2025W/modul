///
/// Управление всем блоком данных
///
App.Views.DataPanelView = Backbone.View.extend({
    el: $("#esud_specification"),

     events:{
        "click .lnk-collapse": "on_collapse",
        "click .lnk-full-screen": "on_full_screen",
    },

    /**
     * Инициализация
    **/
    initialize: function()
    {
           var self = this;
           // событие смены таба
           this.$el.find('.nav-own-tabs').find('a[data-toggle="tab"]').on('shown', function (e) {
                //e.target // activated tab
                //e.relatedTarget // previous tab
                Backbone.trigger('global:on_url_params_change',[this, 'tab', $(e.target).data('number')]);
                Backbone.trigger('global:on_show_tab',[self, $(e.target).data('number')]);
            });
           // глобальное событие открытия формы редактирования спецификации
            Backbone.on("global:on_edit_specification",this.onOpenEditSpecificationForm,this);
    },

    /**
     * Исходное состояние
    **/
    refresh: function()
    {
        this.$el.find("#tab-view-specification").removeClass("active");
        this.$el.find('a[href$="#tab-view-specification"]').parent().removeClass("active").hide();
        this.$el.find("#tab-view-calculation").removeClass("active");
        this.$el.find('a[href$="#tab-view-calculation"]').parent().removeClass("active").hide();
        this.$el.find("#tab-view-history").removeClass("active");
        this.$el.find('a[href$="#tab-view-history"]').parent().removeClass("active").hide();
        this.$el.find("#tab-view-parents").removeClass("active");
        this.$el.find('a[href$="#tab-view-parents"]').parent().removeClass("active").hide();
        this.$el.find("#tab-make-specification").addClass("active");
        this.$el.find('a[href$="#tab-make-specification"]').parent().addClass("active");
        this.$el.find('.btn-collapse').val("unCollapsed").html('&nbsp;&nbsp;Закрыть группы').prepend('<i class = "fa fa-folder-open"></i>');
    },

    /**
     * Показать таб спецификации
    **/
    show_specification_tab: function(val)
    {
        if(val)
        {
            this.$el.find('a[href$="#tab-view-specification"]').parent().show();
            this.$el.find('a[href$="#tab-view-parents"]').parent().show();
            this.$el.find('a[href$="#tab-view-calculation"]').parent().show();
            this.$el.find('a[href$="#tab-view-history"]').parent().show();
        }
        else
        {
            this.$el.find('a[href$="#tab-view-specification"]').parent().hide();
            this.$el.find('a[href$="#tab-view-parents"]').parent().hide();
            this.$el.find('a[href$="#tab-view-calculation"]').parent().hide();
            this.$el.find('a[href$="#tab-view-history"]').parent().hide();
        }
    },

    /**
     * Показать форму редактирования спецификации
    **/
    onOpenEditSpecificationForm: function(){
        // пометить в URL активный таб-редактирование спецификации
        Backbone.trigger('global:on_url_params_change',[this, 'tab', "1"]);
        // выбор таба редактирования
        this.select_tab("1");
    },

    /**
     * Выбрать указанный таб
    **/
    select_tab: function(val)
    {
        // сделать все доступные табы не активными
        this.$el.find("#tab-view-calculation").removeClass("active");
        this.$el.find('a[href$="#tab-view-calculation"]').parent().removeClass("active");
        this.$el.find("#tab-view-history").removeClass("active");
        this.$el.find('a[href$="#tab-view-history"]').parent().removeClass("active");
        this.$el.find("#tab-view-specification").removeClass("active");
        this.$el.find('a[href$="#tab-view-specification"]').parent().removeClass("active");
        this.$el.find("#tab-view-parents").removeClass("active");
        this.$el.find('a[href$="#tab-view-parents"]').parent().removeClass("active");
        this.$el.find("#tab-make-specification").removeClass("active");
        this.$el.find('a[href$="#tab-make-specification"]').parent().removeClass("active");
        // выставление активного таба
        switch(val.toString())
        {
            case "1": // edit specification
                this.$el.find("#tab-make-specification").addClass("active");
                this.$el.find('a[href$="#tab-make-specification"]').parent().addClass("active");
            break;
            case "2": // view specification
                this.$el.find("#tab-view-specification").addClass("active");
                this.$el.find('a[href$="#tab-view-specification"]').parent().addClass("active");
            break;
            case "3": // view parents
                this.$el.find("#tab-view-parents").addClass("active");
                this.$el.find('a[href$="#tab-view-parents"]').parent().addClass("active");
            break;
            case "4": // calculation
                this.$el.find("#tab-view-calculation").addClass("active");
                this.$el.find('a[href$="#tab-view-calculation"]').parent().addClass("active");
            break;
            case "5": // history
                this.$el.find("#tab-view-history").addClass("active");
                this.$el.find('a[href$="#tab-view-history"]').parent().addClass("active");
            break;
            default: break;
        }
        Backbone.trigger('global:on_show_tab',[self,val]);
    },

    /**
     * Смена позиции блока данных
    **/
    change_position: function(val)
    {
        this.$el.find('.tree-data').css({'top' : val + 'px'});
    },

    /**
     * показать
    **/
    show: function()
    {
        this.$el.find("#esud_specification_body").show();
    },

    /**
     * скрыть
    **/
    hide: function()
    {
        this.$el.find("#esud_specification_body").hide();
    },

    // отрисовка технологической карты
    render_techno_map: function(techno_map_data)
    {
        var self = this;
        this.$el.find('#techno_map_data_container').empty();
        // добавление технологической карты
        if(techno_map_data)
        {
            this.$el.find('#techno_map_data_container').append(App.TechnoMapView.render(techno_map_data).el);
            this.$el.find('#techno_map_data_container').scroll(function(){
                App.TechnoMapView.onScroll(self.$el.find('#techno_map_data_container').scrollLeft(),self.$el.find('#techno_map_data_container').scrollTop());
            });
        }
    },

    /**
     * развернуть/свернуть форму данных
    **/
    on_collapse: function(e)
    {
          var el = $(e.currentTarget);
          if(el.data('val') == "min")
          {
            el.data('val','max');
            el.html("свернуть");
            this.$(".left-side").hide();
            this.$(".pnl-product-info").hide();
            this.$(".nav-calculation").hide();
            this.$(".esud-specification-wrapper").removeClass('wrap');
            this.$("#techno_map_data_container").addClass("minimaize-height");
            $("#main-header").hide();
          }
          else
          {
            el.data('val','min');
            el.html("развернуть");
            this.$(".left-side").show();
            this.$(".pnl-product-info").show();
            this.$(".nav-calculation").show();
            this.$(".esud-specification-wrapper").addClass('wrap');
            this.$("#techno_map_data_container").removeClass("minimaize-height");
            $("#main-header").show();
          }
    },

    /**
     * открыть в режиме full screen
    **/
    on_full_screen: function(e)
    {
          var el = $(e.currentTarget);
          if(el.data('val') == "min")
          {
            el.data('val','max');
            el.html("выход из полноэкранного режима ");
          }
          else
          {
            el.data('val','min');
            el.html("на весь экран");
          }
          Routine.toggleFullScreen();
    },


});
