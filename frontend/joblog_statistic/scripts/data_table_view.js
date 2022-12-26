/**
 * Табличное представление данных
 */
App.Views.DataTableListView = Backbone.View.extend({
  tableEvents: null,
  filters: null,
  templates: {
    main:_.template($("#DataTableTemplate").html()),
  },

  initialize: function(){
    this.filters = this.options['filters'];
    this.tableEvents = [];
    this.render();
    this.setFilters();
  },
  setFilters: function(){
    //this.filters = filters ? filters : {};
  },
  getFilters: function(){
    return this.filters? JSON.stringify(this.filters):'{}';
  },
  render: function () {
    var self = this;
    this.$el.html(this.templates.main());
    this.data_container = this.$el.find(".data-list");
    this.data_container.empty();
    var i = 0;
    if(this.collection.length>0)
    {
      _.each(this.collection.models, function (item) {
          self.renderItem(item, ++i);
      }, this);
      this.show();

      // переопределение сортировки на поле с форматом даты
      jQuery.extend(jQuery.fn.dataTableExt.oSort, {
        'uk_date-pre': function (a) {
          if (a == null || a == "")
            return 0;
          var ukDatea = a.split('.');
          return (ukDatea[2] + ukDatea[1] + ukDatea[0]) * 1;
        },
        'uk_date-asc': function (a, b) {
          return ((a < b) ? -1 : ((a > b) ? 1 : 0));
        },
        'uk_date-desc': function (a, b) {
          return ((a < b) ? 1 : ((a > b) ? -1 : 0));
        }
      });

      // add jquery datatables
      this.dTable = this.$('.in-info').DataTable( {
        retrieve: true,
        events: {},
        tableEvents: [],
        bPaginate: false,
        info: false,
        searching: true,
        "order": ((self.filters && 'order_by' in self.filters)?self.filters['order_by']:[]),
        "columnDefs": [
          {"targets" : 'no-sort', "orderable": false},
          {},
          { type: 'uk_date', "targets" : 2},
          {},
          {},
          {},
          {},
          {},
          {},
          {},
          {},
        ],
        disableEvents : function(thead){
          $(thead).find("th").unbind();
          //this.$('.in-info th').unbind('click.DT');
        },
        enableEvents : function(thead){
          var events = this.tableEvents;
          $(thead).find("th").each(function(i){
            $(this).unbind();
            for (var name in events[i])
              $(this).bind(name, events[i][name])
          });
        },
        init: function(){
          this.tableEvents = [];
        },
        initComplete: function () {
          var ctrl = this.api().init();
          // store all original events
          var tableEvents = [];
          this.api().columns().every(function(i){
            var events = {};
            var th = $(this.header());
            $.each($._data(th[0], 'events'), function(name, obj) {
              events[name] = obj[0]
            })
            tableEvents.push(events);
          });
          this.api().init().tableEvents = tableEvents;

          // processing all columns
          this.api().columns().every( function () {
            var column = this;
            var columnName = $(column.header()).find('span').html();
            if(!$(column.header()).html())
              return;
            var select = $('<select multiple="multiple" class = "filter-select"></select>')
              .appendTo($(column.header()));
            column.data().unique().sort().each( function ( d, j ) {
              var selected = self.filters && columnName in self.filters && self.filters[columnName].indexOf(d) >-1 ? 'selected':'';
              select.append( '<option '+selected+' value="'+d+'">'+d+'</option>' )
            });

            // фильтрация данных в таблице
            var have_selected_filters = false;
            if(self.filters && columnName in self.filters && self.filters[columnName].length > 0){
              have_selected_filters = true;
              var searchString = self.filters[columnName].join('|');
              // filterBtn.addClass('active');
              column
                .search( searchString === null ? '' : "^("+ searchString + ")$", true, false )
                .draw();
            }

            // convert drop down to multiselect
            $(select).multiselect({
              buttonContainer: '<span class="dropdown" />',
              includeSelectAllOption: true,
              enableCaseInsensitiveFiltering: true,
              numberDisplayed: 0,
              filterPlaceholder: 'Найти',
              nonSelectedText: columnName,
              nSelectedText: columnName + ": ",
              selectAllText: "Все",
              maxHeight: 400,
              // buttonContainer: '<div></div>',
              // buttonContainer: '<span></span>',
              buttonClass: '',
              templates: {
                button: '<span class="' + (have_selected_filters?'active':'') + ' lnk-multiselect-filter multiselect-filter multiselect dropdown-toggle" data-toggle="dropdown"><i class="fa fa-filter"></i></span>'
              },

              buttonText: function(options) {
                if (options.length === 0)
                    return columnName;
                else if (options.length > this.numberDisplayed)
                  return this.nSelectedText+options.length
                else {
                    var selected = '';
                    options.each(function() {
                        selected += $(this).val() + ', ';
                    });
                    return selected.substr(0, selected.length -2);
                }
              },
              onSelectAll: function() {
                var selected = [];
                this.$select.find('option:selected').each(function(){
                  if($(this).val()!="multiselect-all")
                    selected.push($(this).val());
                });

                if(!self.filters)
                  self.filters = {};
                self.filters[columnName] = selected;
                // save in url
                Backbone.trigger('global:on_url_params_change',[
                  self,
                  'table_filters',
                  JSON.stringify(self.filters),
                  false
                ]);

                 // do filter
                // console.log(selected);
                var searchString = null;
                var filterBtn = this.$select.parents(".column-data:first").find('.multiselect-filter');
                filterBtn.removeClass('active');
                if(selected.length>0)
                {
                  searchString = selected.join('|');
                  filterBtn.addClass('active');
                }
                column
                  .search( searchString === null ? '' : "^("+ searchString + ")$", true, false )
                  .draw();
              },
              onChange: function(element, checked) {
                var selected = [];
                $(element[0]).parent().find("option:selected").each(function(){
                  if($(this).val()!="multiselect-all")
                    selected.push($(this).val());
                });

                if(!self.filters)
                  self.filters = {};
                self.filters[columnName] = selected;
                // save in url
                Backbone.trigger('global:on_url_params_change',[
                  self,
                  'table_filters',
                  JSON.stringify(self.filters),
                  false
                ]);

                // do filter
                // console.log(selected);
                var searchString = null;
                var filterBtn = $(element[0]).parents(".column-data:first").find('.multiselect-filter');
                filterBtn.removeClass('active');
                if(selected.length>0)
                {
                  searchString = selected.join('|');
                  filterBtn.addClass('active');
                }
                column
                  .search( searchString === null ? '' : "^("+ searchString + ")$", true, false )
                  .draw();
              }
            });

            $(column.header()).find('.lnk-multiselect-filter').on('click', function(){
              var thead = $(this).parents('thead:first');
              setTimeout(function(){
                ctrl.enableEvents(thead)
              },100)

            });
            $(column.header()).find('.lnk-multiselect-filter').on('mousedown', function(){
              ctrl.disableEvents($(this).parents('thead:first'));
            });

          });
        }
      });

      this.$('.in-info').on('order.dt', function (e) {
        // save in url
        if(!self.filters)
          self.filters = {};
        self.filters['order_by'] = self.dTable.order();
        Backbone.trigger('global:on_url_params_change',[
          self,
          'table_filters',
          JSON.stringify(self.filters),
          false
        ]);
      });
    }
    else
      this.hide();
  },
  renderItem: function (item, i) {
    this.data_container.append(new App.Views.DataTableItemView({model: item, parent: this, i:i}).$el);
  },
  hide: function(){
    this.$el.hide();
  },
  show: function(){
    this.$el.show();
  },
  clear: function()
  {
    this.$el.empty();
  }
});

App.Views.DataTableItemView = Backbone.View.extend({
  tagName:'tr',
  templates: {
    main:_.template($("#DataTableItemTemplate").html()),
  },
  initialize: function(){
    this.index = this.options['i'];
    this.render();
  },
  render: function()
  {
    this.clear();
    this.$el.append(this.templates.main($.extend({},this.model.toJSON(),{i:this.index})));
    return this;
  },
  clear: function()
  {
    this.$el.empty();
  }
});

