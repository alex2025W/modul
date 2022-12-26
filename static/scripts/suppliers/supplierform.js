define([
    'jquery',
    'backbone',
    'global',
    'backbone.syphon',
    'jquery.jgrowl'
], function($, Backbone, G) {

	var SupplierForm = Backbone.View.extend({
        tagName: 'section',
        id: "supplier-form",
		template: _.template($('#supplierFormTemplate').html()),

        events: {
            'click #edit-goods': 'editGoods',
            'submit form': 'formSubmitted'
        },

		initialize: function() {
            Backbone.Validation.bind(this, {
                invalid: function(view, attr, error) {
                    if (attr == 'name') {
                        view.$el.find('#name').closest('.control-group').addClass('error');
                    }
                }
            });
		},

		render: function() {
			this.$el.html(this.template(_.extend(
                { isNew: this.model.isNew() },
                this.model.toJSON()
            )));
            return this;
		},

        onSet: function() {
            this.$('.name').focus();
        },

        getParentUrl: function() {
            return "/suppliers";
        },

        editGoods: function(e) {
            e.preventDefault();
            // TODO: check the unsaved user data here
            //
            G.events.trigger("gotoGoods", this.model.id);
        },

        formSubmitted: function(e) {
            var self = this;
            e.preventDefault();
            this.model.save(Backbone.Syphon.serialize(this), {
                success: function() {
                    $.jGrowl("Данные сохранены", { 'themeState':'growl-success', 'sticky':true, 'position': 'bottom-right' });
                    self.collection.add(self.model);
                    G.events.trigger('gotoIndex');
                },
                error: function(model, xhr, options) {
                    var msg = xhr.responseJSON && xhr.responseJSON.error || "При сохранении данных на сервере произошла ошибка";
                    $.jGrowl(msg, { 'themeState':'growl-error', 'sticky':true, 'position': 'bottom-right' });
                }
            });
        },

        dummy: null
	}); // SupplierForm

    return SupplierForm;
});
