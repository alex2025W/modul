define([
    'jquery',
    'backbone',
    'supplierview',
    'jquery.dataTables'
], function($, Backbone, SupplierView) {

	var SuppliersListView = Backbone.View.extend({
        tagName: 'section',
        id: 'suppliers',
		template: _.template($('#suppliersListTemplate').html()),

        events: {
            'click :checkbox': 'toggleEnabled'
        },

		render: function() {
			this.$el.html(this.template());
            this.addAll();
            this.initDataTable();
            return this;
		},

        addAll: function() {
            this.collection.each(this.addOne, this);
        },

        addOne: function(supplier) {
            var view = new SupplierView({model: supplier});
            this.$('#supplier-list tbody').append(view.render().el);
        },

        onSet: function() {
            this.layoutSearchField();
            this.$('#supplier-list').dataTable().fnDraw();
            this.$('.search-query').focus();
        },

        layoutSearchField: function() {
            // move «new supplier» link after the search field
            $('#new_supplier').insertAfter($('.dataTables_filter'));
            // make the filter input to look as a search field
            $('.dataTables_filter input')
                .before('<i class="icon-search"></i>')
                .addClass('search-query')
                .attr('placeholder', 'Начните вводить название поставщика')
                .parent('label').addClass('search-field col-md-4');
        },

        initDataTable: function() {
            var $table = this.$('#supplier-list');

            $table.dataTable({
                "bPaginate": false,
                "sDom": 'ft',
                "bAutoWidth": false,
                "aaSorting": [[0, 'asc']],
                "aoColumns": [
                    { "sWidth": "100%" },
                    { "bSortable": false }
                ],
                "oLanguage": {
                    "sSearch": "",
                    "sZeroRecords": "Нет поставщиков с таким названием"
                },
                "fnRowCallback": function(nRow, aData, iDisplayIndex, iDisplayAll) {
                    var enabled = $(nRow).find(':checkbox').prop('checked');
                    $(nRow).toggleClass('disabled', !enabled);
                },
                "fnDrawCallback": function() {
                    var $search = $('.dataTables_filter input'),
                        $button = $('#new_supplier'),
                        query = $search.val(),
                        title, href = "#/new";
                    if (query) {
                        title = $button.data('add-title').replace("%query%", query);
                        href += "/" + query;
                    } else {
                        title = $button.data('title');
                    }
                    $button.html(title);
                    $button.prop('href', href);
                }
            });
        }, // initDataTable

        toggleEnabled: function(e) {
            var $table = this.$('#supplier-list'),
                $checkbox = $(e.target),
                model = this.collection.get($checkbox.closest('tr').data('cid')),
                wasEnabled = model.get('enabled');

            if (!$checkbox.siblings('i').length) {
                $checkbox.after('<i class="fa-spin icon-refresh" />');
            }

            model.save({ enabled: $checkbox.prop('checked') }, {
                success: function() {
                    $checkbox.siblings('i').remove();
                    $table.dataTable().fnDraw();
                },
                error: function(model, xhr, options) {
                    var msg = xhr.responseJSON && xhr.responseJSON.error || "При сохранении данных на сервере произошла ошибка";
                    $.jGrowl(msg, { 'themeState':'growl-error', 'sticky':true, 'position': 'bottom-right' });
                    model.set('enabled', wasEnabled);
                    $checkbox.prop('checked', wasEnabled);
                    $checkbox.siblings('i').remove();
                    $table.dataTable().fnDraw();
                }
            });
        },

        dummy: null
	}); // SuppliersListView

    return SuppliersListView;
});
