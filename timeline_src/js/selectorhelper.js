define([
    'underscore',
    'workstatushelper'
], function(_, WorkStatusHelper) {

    var SelectorHelper = {
        selectors: {},

        methods: {
            contract: function(dataset, values) {
                dataset.nodes = _.filter(dataset.nodes, function(contract) {
                    return values.indexOf(''+contract.name) > -1;
                });
            }, // contract

            order: function(dataset, values) {
                dataset.nodes = _.filter(dataset.nodes, function(contract) {
                    contract.nodes = _.filter(contract.nodes, function(order) {
                        return values.indexOf(order.name) > -1;
                    });
                    return contract.nodes.length;
                });
            }, // order

            worktype: function(dataset, values) {
                dataset.nodes = _.filter(dataset.nodes, function(contract) {
                    contract.nodes = _.filter(contract.nodes, function(order) {
                        order.nodes = _.filter(order.nodes, function(worktype) {
                            if (values.indexOf(worktype.name) > -1) {
                                return true;
                            } else if (values.indexOf('troubleshooting') > -1) {
                                worktype.nodes = _.filter(worktype.nodes, function(workorder) {
                                    return workorder.troubleshooting;
                                });
                                return worktype.nodes.length;
                            }
                            return false;
                        });
                        return order.nodes.length;
                    });
                    return contract.nodes.length;
                });
            }, // worktype

            // TODO: потенциальный баг. могут исчезать пустые ноды из-за этих фильтров
            sector: function(dataset, values) {
                dataset.nodes = _.filter(dataset.nodes, function(contract) {
                    contract.nodes = _.filter(contract.nodes, function(order) {
                        order.nodes = _.filter(order.nodes, function(worktype) {
                            worktype.nodes = _.filter(worktype.nodes, function(workorder) {
                                return values.indexOf(''+workorder.sector_id) > -1;
                            });
                            return worktype.nodes.length;
                        });
                        return order.nodes.length;
                    });
                    return contract.nodes.length;
                });
            }, // sector

            'status': function(dataset, values) {
                dataset.nodes = _.filter(dataset.nodes, function(contract) {
                    contract.nodes = _.filter(contract.nodes, function(order) {
                        order.nodes = _.filter(order.nodes, function(worktype) {
                            worktype.nodes = _.filter(worktype.nodes, function(workorder) {
                                workorder.nodes = _.filter(workorder.nodes, function(work) {
                                    var result = false;
                                    values.forEach(function(value) {
                                        if (value === 'no_plan') {
                                            if ( !(work.plan && work.plan.start) ) {
                                                result = true;
                                                return false;
                                            }
                                        } else if (WorkStatusHelper.hasStatus(work, value)) {
                                            result = true;
                                            return false;
                                        }
                                    });
                                    return result;
                                });
                                return workorder.nodes.length;
                            });
                            return worktype.nodes.length;
                        });
                        return order.nodes.length;
                    });
                    return contract.nodes.length;
                });
            } // status
        }, // methods

        set: function(selectorParamsJSON) {
            this.selectors = JSON.parse(selectorParamsJSON);
        },

        apply: function(dataset) {
            var self = this;
            _.forEach(this.selectors, function(values, type) {
                if (values.length) {
                    self.methods[type](dataset, values);
                }
            });
        },

        dummy: void 0
    }; // SelectorHelper

    return SelectorHelper;
});
