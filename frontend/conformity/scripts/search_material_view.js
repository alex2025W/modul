App.Views.SearchFormMaterialView = Backbone.View.extend({
  tagName:'div',
  className:'search-material-box',
  templates: {
    main:_.template($("#searchMaterialTemplate").html()),
  },
  sel_group: null, // выбрання группа
  sel_material: null, // выбранный материал

 /**
   * Инициализация
   */
  initialize: function()
  {
    this.data = this.options.data;
    // мониторинг события окончания поиска материала
    // Backbone.on("global:on_material_save_complete",this.render,this);
  },
 /**
   * Присоедиение событий
   */
  events:{
  },
 /**
   * Удление представления
   */
  unRender: function()
  {
    this.remove();
  },
  /**
   * Отрисовка элемента
   */
  render: function () {
    var self = this;
    this.$el.html(this.templates.main());
    // подключение мультиселекта на фильтр по моделям
    this.$('.ddl-material-groups').multiselect({
      buttonContainer: '<span class="dropdown" />',
      includeSelectAllOption: false,
      enableCaseInsensitiveFiltering: true,
      numberDisplayed: 4,
      filterPlaceholder: 'Найти',
      nonSelectedText: "Группа материалов",
      nSelectedText: "Выбрано: ",
      selectAllText: "Все",
      maxHeight: 400,
       buttonText: function(options) {
          if (options.length === 0)
            return 'Группа <b class="caret"></b>';
          else if (options.length > this.numberDisplayed)
              return this.nSelectedText+options.length + ' ' +  ' <b class="caret"></b>';
          else {
            var selected = 'Группа: ';
            options.each(function() {
              selected += $(this).text() + '             ';
            });
            return selected.substr(0, selected.length -2) + ' <b class="caret"></b>';
          }
        },
        onChange: function(element, checked) {
            self.sel_group = null;
            if(checked === true)
              self.sel_group= element.val()!='не задана'?element.val():'';
            else
              self.sel_group= null;
            // загрузка списка материалов
            self.sel_material = null;
            self.fillFilterMaterials();
        }
    });

    // подключение мультиселекта на фильтр по родительским моделям
    // подключение мультиселекта на фильтр по моделям
    this.$('.ddl-materials').multiselect({
      buttonContainer: '<span class="dropdown" />',
      includeSelectAllOption: false,
      enableCaseInsensitiveFiltering: true,
      numberDisplayed: 4,
      filterPlaceholder: 'Найти',
      nonSelectedText: "Материал",
      nSelectedText: "Материалов выбрано: ",
      selectAllText: "Все",
      maxHeight: 400,
       buttonText: function(options) {
          if (options.length === 0)
            return 'Материал <b class="caret"></b>';
          else if (options.length > this.numberDisplayed)
              return this.nSelectedText+options.length + ' ' +  ' <b class="caret"></b>';
          else {
            var selected = 'Материал: ';
            options.each(function() {
              selected += $(this).text() + '             ';
              //selected += '['+$(this).val() + '], ';
            });
            return selected.substr(0, selected.length -2) + ' <b class="caret"></b>';
          }
        },
        onChange: function(element, checked) {
            if(checked === true)
              self.sel_material= element.val()!='не задана'?element.val():'';
            else
              self.sel_material= null;

            // вызов события о выборе объекта
            Backbone.trigger('global:on_material_search_complete',[self, self.sel_group, self.sel_material]);
        }
    });
    this.rebuild();
    return this;
  },

  /**
   * Возврат формы поиска к первоначальному состоянию
   */
  rebuild: function(){
    this.fillFilterGroups();
    this.fillFilterMaterials();
  },

  /**
   * Заполнение выпадающего списка групп материалов
   */
  fillFilterGroups: function()
  {
      var ddl = this.$(".ddl-material-groups").empty();
      $(ddl).append('<option value="">не задана</option>');
      var checked = false;
      for(var i in this.data)
      {
          checked = false;
          if(this.sel_group && this.sel_group == this.data[i].code)
            checked = true;
          $(ddl).append('<option  '+((checked)?"selected":"")+'  value="'+this.data[i]["code"]+'">['+this.data[i]["code"]+ "] "+ this.data[i]["name"]+'</option>');
      }
      $(ddl).multiselect('rebuild');
   },

  /**
   * Заполнение выпадающего списка материалов
   */
  fillFilterMaterials: function()
  {
      var materials = [];
      if(this.sel_group)
      {
        for(var i in this.data)
        {
          if(this.data[i].code==this.sel_group)
          {
            materials = this.data[i].materials;
            break;
          }
        }
      }

      var ddl = this.$(".ddl-materials").empty();
      $(ddl).append('<option value="">не задан</option>');
      var checked = false;
      for(var i in materials)
      {
          checked = false;
          if(this.sel_material && this.sel_material == materials[i].code)
            checked = true;
          $(ddl).append('<option  '+((checked)?"selected":"")+'  value="'+materials[i]["code"]+'">['+materials[i]["code"]+ "] "+ materials[i]["name"]+'</option>');
      }
      $(ddl).multiselect('rebuild');
   },

   clear: function(e){
    this.sel_group = null;
    this.sel_material = null;
    this.rebuild();
  },
});
