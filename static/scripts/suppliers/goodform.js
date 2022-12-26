define([
    'jquery',
    'backbone',
    'global',
    'backbone.syphon',
    'jquery.jgrowl',
    'bootstrap.datepicker'
], function($, Backbone, G) {

	var GoodForm = Backbone.View.extend({
        tagName: 'section',
        id: "good-form",
		template: _.template($('#goodFormTemplate').html()),

        events: {
            'submit form': 'formSubmitted',
            'change .fieldset-switch': 'toggleFieldset',
            'keyup .pluralize-it': 'pluralizeDaysLabel',
            'change .pluralize-it': 'pluralizeDaysLabel',
            'focus #name': 'dimmCode',
            'blur #name': 'dimmCode',
            'keyup #name': 'dimmCode'
        },

		initialize: function(options) {
            this.supplier = options.supplier;
            this.model.urlRoot = this.supplier.url() + '/goods';
            Backbone.Validation.bind(this, {
                valid: function(view, attr, error) {
                    view.$el.find('[id="' + attr + '"]').closest('.control-group').removeClass('error');
                },
                invalid: function(view, attr, error) {
                    view.$el.find('[id="' + attr + '"]').closest('.control-group').addClass('error');
                }
            });

            // scroll to the first error input
            this.model.on('invalid', function() {
                $('html, body').animate({
                    scrollTop: $(".error").offset().top
                }, 300);
            });

            Backbone.Syphon.InputReaders.register('number', function(el){
                return parseFloat(el.val());
            });
        },

		render: function() {
			this.$el.html(this.template(_.extend(
                { isNew: this.model.isNew() },
                _.extend(this.model.toJSON(), { supplier: this.supplier.toJSON() })
            )));
            return this;
		},

        onSet: function() {
            this.$('.datepicker')
                .datepicker({weekStart:1});
            this.$('.name').focus();
        },

        getParentUrl: function() {
            return "#/edit/" + this.supplier.get("id") + "/goods";
        },

        formSubmitted: function(e) {
            var data = Backbone.Syphon.serialize(this),
                supplier_id = this.supplier.id;
            e.preventDefault();
            this.model.save(data, {
                success: function() {
                    $.jGrowl("Данные сохранены", { 'themeState':'growl-success', 'sticky':true, 'position': 'bottom-right' });
                    G.events.trigger('gotoGoods', supplier_id);
                },
                error: function(model, xhr, options) {
                    var msg = xhr.responseJSON && xhr.responseJSON.error || "При сохранении данных на сервере произошла ошибка";
                    $.jGrowl(msg, { 'themeState':'growl-error', 'sticky':true, 'position': 'bottom-right' });
                }
            });
        },

        toggleFieldset: function(e) {
            var $fieldset = $(e.target).closest('fieldset');
            if (e.target.checked) {
                // show
                $fieldset
                    .prop('disabled', false);
            } else {
                // hide
                $fieldset
                    .prop('disabled', true);
            }
        },

        pluralizeDaysLabel: function(e) {
            var n = $(e.target).val() || $(e.target).closest('div').find('input[type="number"]').val();
            var plurForm = n % 10 == 1 && n % 100 != 11 ?
                            'one' : [2, 3, 4].indexOf(n % 10) > -1 && [12, 13, 14].indexOf(n % 100) == -1 ?
                                'few' : n % 10 == 0 || [5, 6, 7, 8, 9].indexOf(n % 10) > -1 || [11, 12, 13, 14].indexOf(n % 100) > -1 ?
                                    'many' : 'other';
            var text = {
                    one: 'дня',
                    few: 'дней',
                    many: 'дней',
                    other: 'дн.'
                }[ plurForm ];

            $(e.target).closest('label').find('span').text(text);
        },

        dimmCode: function(e) {
            var el = $(e.target);
            if (el.is(':focus') && el.val().length > 25) {
                this.$('.code').addClass('dimmed');
            } else {
                this.$('.code').removeClass('dimmed');
            }
        },

        dummy: null
	}); // GoodForm

    return GoodForm;
});
