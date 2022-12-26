define([
    'jquery',
    'underscore',
    'backbone',
    'global',
    'bootstrap_select',
    'bootstrap_select_i18n'
], function($, _, Backbone, G) {

    var SelectorView = Backbone.View.extend({
        template: $('#selector-menu-template').html(),

        itemsToShowLiveSearch: 5,
        itemsToShowActionsBox: 3,

        initialize: function() {
            this.$el.hide(); // hide real select element
            this.listenTo(this.model, 'change', this.render);
        },

        render: function() {
            var items = this.getItems();
            this.$el.html(_.template(this.template, { menuItems: items }));
            this.$el.selectpicker({
                countSelectedText: this.selectorNamePlural + ": {0} из {1}",
                titlePrefix: this.titlePrefix || void 0,
                liveSearch: items.length > this.itemsToShowLiveSearch,
                actionsBox: items.length > this.itemsToShowActionsBox,
                applyCallback: this.apply.bind(this),
                exitCallback: this.exit.bind(this)
            });
            this.$el.selectpicker('refresh');
            // save initial value
            this._initialValue = this.$el.val();
            return this;
        }, // render

        apply: function() {
            if (!_.isEqual(this._initialValue, this.$el.val())) {
                var queryParams = G.router.getParamsObjectFromQuery(G.router.getLocation());
                var selectorParams = JSON.parse(queryParams.selector);
                selectorParams[this.selectorType] = this.$el.val();
                if (!selectorParams[this.selectorType]) {
                    delete selectorParams[this.selectorType];
                }
                G.router.navigateSmart(
                    { selector: JSON.stringify(selectorParams) },
                    { trigger: true });
            }
        },

        exit: function() {
            this.$el.val(this._initialValue);
            this.render();
        },

        isSelected: function(value) {
            return this.model.getSelectorValues(this.selectorType).indexOf(value) > -1;
        },

        // Should be overrided in the child views
        // item = { value, name, subtext, selected }
        getItems: function() { return []; }
    }); // SelectorView

    var ContractView = SelectorView.extend({
        el: '#selector-contract',
        selectorType: 'contract',
        selectorNamePlural: 'Договоры',

        getItems: function() {
            var self = this;
            var dataset = this.model.source_dataset || {};
            return _.map(dataset.nodes, function(contract) {
                return {
                    name: contract.name,
                    subtext: contract.client_name,
                    selected: self.isSelected('' + contract.name)
                };
            }).sort(function(a, b) {
                return a.name - b.name;
            });
        }, // getItems

        dummy: null
    }); // ContractView

    var OrderView = SelectorView.extend({
        el: '#selector-order',
        selectorType: 'order',
        selectorNamePlural: 'Заказы',

        getItems: function() {
            var self = this;
            var dataset = this.model.source_dataset || {};
            var items = [];
            _.forEach(dataset.nodes, function(contract) {
                _.forEach(contract.nodes, function(order) {
                    items.push({
                        name: order.name,
                        selected: self.isSelected(order.name)
                    });
                });
            });

            var pad6 = function(str) {
                return str.split('.').map(function(d) {
                    return new Array(Math.max(0,6-d.length)+1).join("0") + d;
                }).join('.');
            };
            return items.sort(function(a,b) {
                return pad6(a.name).localeCompare(pad6(b.name));
            });
        }, // getItems

        dummy: null
    }); // OrderView

    var WorktypeView = SelectorView.extend({
        el: '#selector-work-type',
        selectorType: 'worktype',
        selectorNamePlural: 'Направления',

        getItems: function() {
            var self = this;
            var dataset = this.model.source_dataset || {};
            var itemsSet = {};
            var items;
            var hasTroubleshooting = false;
            _.forEach(dataset.nodes, function(contract) {
                _.forEach(contract.nodes, function(order) {
                    _.forEach(order.nodes, function(worktype) {
                        itemsSet[worktype.name] = true;
                    });
                });
                if (contract.troubleshooting) {
                    hasTroubleshooting = true;
                }
            });
            items = _.keys(itemsSet).map(function(worktypeName) {
                return {
                    name: worktypeName,
                    selected: self.isSelected(worktypeName)
                };
            });
            if (hasTroubleshooting) {
                items.push({
                    name: "Устранение замечаний",
                    value: 'troubleshooting',
                    new_section: true,
                    selected: self.isSelected('troubleshooting'),
                });
            }
            return items;
        }, // getItems

        dummy: null
    }); // WorktypeView


    var SectorView = SelectorView.extend({
        el: '#selector-sector',
        selectorType: 'sector',
        selectorNamePlural: 'Участки',
        titlePrefix: 'Участки:',

        getItems: function() {
            var self = this;
            var dataset = this.model.source_dataset || {};
            var sectorNames = this.model.get('sector_names');
            var itemsSet = {};

            _.forEach(dataset.nodes, function(contract) {
                _.forEach(contract.nodes, function(order) {
                    _.forEach(order.nodes, function(worktype) {
                        _.forEach(worktype.nodes, function(workorder) {
                            itemsSet[workorder.sector_id] = workorder.sector_name_id;
                        });
                    });
                });
            });
            return _.map(itemsSet, function(sectorNameId, sectorId) {
                return {
                    name: sectorId,
                    subtext: sectorNames[sectorNameId],
                    selected: self.isSelected(sectorId)
                };
            });
        }, // getItems

        dummy: null
    }); // SectorView

    var StatusView = SelectorView.extend({
        el: '#selector-status',
        selectorType: 'status',
        selectorNamePlural: 'Статусы работ',
        itemsToShowActionsBox: 1,

        getItems: function() {
            var self = this;
            var items = [
                {
                    name: "Работа с отклонением",
                    value: "on_work_with_reject"
                },{
                    name: "Простой",
                    value: "on_hold"
                }, {
                    name: "Приостановка",
                    value: "on_pause"
                }, {
                    name: "Нет данных",
                    value: "no_data"
                }, {
                    name: "Нет планов",
                    value: "no_plan",
                    new_section: true
                }
            ];
            items.forEach(function(d) { d.selected = self.isSelected(d.value); });

            return items;
        }, // getItems

        dummy: null
    }); // StatusView

    return {
        ContractView: ContractView,
        OrderView: OrderView,
        WorktypeView: WorktypeView,
        SectorView: SectorView,
        StatusView: StatusView
    };
});

