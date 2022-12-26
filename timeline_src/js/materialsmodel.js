define([
    'jquery',
    'backbone',
    'global',
], function($, Backbone, G) {
    var MaterialsModel = Backbone.Model.extend({

        url_root_work: G.config.materials_by_work_url, 
        url_root_workorder: G.config.materials_by_workorder_url, 
        
        initialize: function(options) {
            this.nodeId = options.nodeId;
            this.loadMaterials();
        }, // initialize

        sync: function(method, model, options) {
            var xhr = options.xhr = $.ajax(options);
            model.trigger('request', model, xhr, options);
        }, // sync

        loadMaterials: function() {
            var datum = G.appView.model.getNodeById(this.nodeId) || {};
            var sector_code = datum.sector_id,
                work_code = datum.work_code;

            this.hasMaterials = true;

            // materials for works
            //
            if (sector_code && work_code) {
                this.fetch({
                    url: this.url_root_work + "/" + sector_code + "/" + work_code,
                    success: function(model, resp) {
                        try {
                            model.set('materials', resp);
                            model.set('node_type', 'Работа');
                            model.set('code', work_code);
                        } catch (e) {
                            G.utils.logException(e);
                            model.trigger('error', { code: 1, exception: e });
                        }
                    },
                    error: function(model) {
                        model.trigger('error', arguments);
                    }
                });
            } else
            // workorder materials
            //
            if (datum.depth === 4) {
                this.fetch({
                    url: this.url_root_workorder + "/" + datum.name,
                    success: function(model, resp) {
                        try {
                            model.set('materials', resp);
                            model.set('node_type', 'Наряд');
                            model.set('code', datum.name);
                        } catch (e) {
                            G.utils.logException(e);
                            model.trigger('error', { code: 1, exception: e });
                        }
                    },
                    error: function(model) {
                        model.trigger('error', arguments);
                    }
                });
            } else {
                this.hasMaterials = false;
            }
        },

        dummy: null
    });

    return MaterialsModel;
});
