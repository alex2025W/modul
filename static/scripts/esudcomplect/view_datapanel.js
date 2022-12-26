///
/// Управление всем блоком данных
///
App.Views.DataPanelView = Backbone.View.extend({
    el: $("#esud_complect"),

    /**
     * Инициализация
    **/
    initialize: function()
    {
           var self = this;
           // событие смены таба
           this.$el.find('a[data-toggle="tab"]').on('shown', function (e) {
                //e.target // activated tab
                //e.relatedTarget // previous tab
                Backbone.trigger('global:on_url_params_change',[this, 'tab', $(e.target).data('number')]);
                Backbone.trigger('global:on_show_tab',[self, $(e.target).data('number')]);
            });
    },

    /**
     * Исходное состояние
    **/
    refresh: function()
    {
        this.$el.find("#tab-view-complect").removeClass("active");
        this.$el.find('a[href$="#tab-view-complect"]').parent().removeClass("active").hide();
        this.$el.find("#tab-make-complect").addClass("active");
        this.$el.find('a[href$="#tab-make-complect"]').parent().addClass("active");
    },

    /**
     * Показать таб спецификации
    **/
    show_complect_tab: function(val)
    {
        if(val)
            this.$el.find('a[href$="#tab-view-complect"]').parent().show();
        else
            this.$el.find('a[href$="#tab-view-complect"]').parent().hide();
    },

    /**
     * Выбрать указанный таб
    **/
    select_tab: function(val)
    {
        if(val=="1")
        {
            this.$el.find("#tab-view-complect").removeClass("active");
            this.$el.find('a[href$="#tab-view-complect"]').parent().removeClass("active");
            this.$el.find("#tab-make-complect").addClass("active");
            this.$el.find('a[href$="#tab-make-complect"]').parent().addClass("active");
        }
        else
        {
            this.$el.find("#tab-make-complect").removeClass("active");
            this.$el.find('a[href$="#tab-make-complect"]').parent().removeClass("active");
            this.$el.find("#tab-view-complect").addClass("active");
            this.$el.find('a[href$="#tab-view-complect"]').parent().addClass("active");
        }
        Backbone.trigger('global:on_show_tab',[self, val]);
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
        this.$el.find('#esud_complect_body').show();
    },

    /**
     * скрыть
    **/
    hide: function()
    {
        this.$el.find('#esud_complect_body').hide();
    }
});
