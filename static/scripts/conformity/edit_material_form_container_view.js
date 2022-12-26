///
/// Представление формы поиска спецификации
///
App.Views.EditMaterialFormContainerView = Backbone.View.extend({
    el:$('#materials-data-editor'),
    sectors: null, // список всех участков
    materials_groups: null, // список групп материалов
    /**
     * Инициализация
    **/
    initialize: function()
    {
        // все данные
        this.data = this.options.data['materials_groups'];
        // формаирование списка участков
        this.sectors = [];
        for(var i in this.options.data['sectors'])
        {
            var sector = this.options.data['sectors'][i];
            this.sectors.push({
                '_id':sector['_id'],
                'name': sector['name'],
                'code': sector['code']
            });
        }
        // формаирование списка групп материалов
        this.materials_groups = [];
        for(var i in this.options.data['materials_groups'])
        {
            var group = this.options.data['materials_groups'][i];
            this.materials_groups.push({
                '_id':group['_id'],
                'name': group['name'],
                'code': group['code']
            });
        }

        this.Materials_Units = this.options.Materials_Units;
        // форма поиска материала
        this.SearchFormMaterialView = new App.Views.SearchFormMaterialView( {'data':this.data} );
        this.$el.find('#pnl_search_material_form_container').html(this.SearchFormMaterialView.render().el);

        // форма редактирования материала
        this.AddMaterialView = new App.Views.EditMaterialView({'model':new App.Models.MaterialItemModel({},{'parse':true}), 'Materials_Units': this.Materials_Units, 'sectors':this.sectors, 'materials_groups': this.materials_groups, 'edit': true });
        this.$el.find('#pnl_add_material_form_container').html(this.AddMaterialView.render().el);
        // мониторинг события окончания поиска материала
        Backbone.on("global:on_material_search_complete",this.onMaterialSearchComplete,this);
    },

    /**
     ** Обработка глобавльного совбтия окончания поиска материала
    **/
    onMaterialSearchComplete: function(e){
        var self = this;
        var material_group_key = e[1];
        var material_key = e[2];

        if(material_key){
            // получение материала на сервере
            Routine.showLoader();
            $.ajax({
                type: "GET",
                url: "/handlers/conformity/get_material_info/"+material_group_key+'/'+material_key,
                timeout: 35000,
                contentType: 'application/json',
                dataType: 'json',
                async:true
                }).done(function(result) {
                    if(result['status']=="ok")
                    {
                        // форма редактирования материала
                        self.EditMaterialView = new App.Views.EditMaterialView({'model':new App.Models.MaterialItemModel(result['data'],{parse: true}), 'Materials_Units': self.Materials_Units, 'sectors':self.sectors, 'materials_groups': self.materials_groups, 'edit': true });
                        self.$el.find('#pnl_edit_material_form_container').html(self.EditMaterialView.render().el);
                    }
                    else
                        $.jGrowl('Ошибка получения информации о материале. Подробности: ' + result['msg'], { 'themeState':'growl-error', 'sticky':false });
                }).error(function(jqXHR, textStatus, errorThrown ) {
                        $.jGrowl('Ошибка получения информации о материале. Подробности: '+ errorThrown, { 'themeState':'growl-error', 'sticky':false });
                }).always(function(jqXHR, textStatus, errorThrown ) {
                        Routine.hideLoader();
                });
        }
    }
});




