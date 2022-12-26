define([
    'jquery',
    'backbone',
    'goodview',
    'jquery.dataTables'
], function($, Backbone, GoodView) {

	var GoodsListView = Backbone.View.extend({
        tagName: 'section',
        id: 'goods',
		template: _.template($('#goodsListTemplate').html()),

        events: {
            'click :checkbox': 'toggleEnabled'
        },

		render: function() {
			this.$el.html(this.template(this.model.toJSON()));
            this.addAll();
            this.initDataTable();
            return this;
		},

        addAll: function() {
            this.collection.each(this.addOne, this);
        },

        addOne: function(good) {
            var view = new GoodView({model: good, supplier_id: this.model.get("id")});
            this.$('#good-list tbody').append(view.render().el);
        },

        onSet: function() {
            this.layoutSearchField();
            this.$('#good-list').dataTable().fnDraw();
            this.$('.search-query').focus();
        },

        getParentUrl: function() {
            return "#/edit/" + this.model.get("id");
        },

        layoutSearchField: function() {
            // move «new good» link after the search field
            $('#new_good').insertAfter($('.dataTables_filter'));
            // make the filter input to look as a search field
            $('.dataTables_filter input')
                .before('<i class="icon-search"></i>')
                .addClass('search-query')
                .attr('placeholder', 'Начните вводить код, название или цену товара')
                .parent('label').addClass('search-field col-md-4');
        },

        initDataTable: function() {
            var $table = this.$('#good-list');
            var self = this;

            $table.dataTable({
                "bPaginate": false,
                "sDom": 'ft',
                "bAutoWidth": false,
                "aaSorting": [[2, 'asc']],
                "aoColumns": [
                    { "sClass": "code numeric" },
                    { "sClass": "code-supp numeric" },
                    { "sWidth": "100%", "sClass": "name" },
                    { "bSortable": false, "sClass": "price numeric" },
                    { "bSortable": false }
                ],
                "oLanguage": {
                    "sSearch": "",
                    "sZeroRecords": "Пусто..."
                },
                // "fnRowCallback": function(nRow, aData, iDisplayIndex, iDisplayAll) {
                //     var enabled = $(nRow).find(':checkbox').prop('checked');
                //     $(nRow).toggleClass('disabled', !enabled);
                // },
                "fnDrawCallback": function() {
                    var $search = $('.dataTables_filter input'),
                        $button = $('.add-item'),
                        query = $search.val(),
                        title, href = $button.data('href');
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
            var $table = this.$('.dataTable'),
                $checkbox = $(e.target),
                good = this.model.goods.get($checkbox.data('code')),
                wasEnabled = good.get('enabled');

            if (!$checkbox.siblings('i').length) {
                $checkbox.after('<i class="fa-spin icon-refresh" />');
            }

            good.save({ enabled: $checkbox.prop('checked') }, {
                success: function() {
                    $checkbox.siblings('i').remove();
                    $table.dataTable().fnDraw();
                },
                error: function(model, xhr, options) {
                    var msg = xhr.responseJSON && xhr.responseJSON.error || "При сохранении данных на сервере произошла ошибка";
                    $.jGrowl(msg, { 'themeState':'growl-error', 'sticky':true, 'position': 'bottom-right' });
                    good.set('enabled', wasEnabled);
                    $checkbox.prop('checked', wasEnabled);
                    $checkbox.siblings('i').remove();
                    $table.dataTable().fnDraw();
                }
            });
        },

        dummy: null
	}); // GoodsListView

    return GoodsListView;
});
