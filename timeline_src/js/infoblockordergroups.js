define([
    'underscore',
    'global',
    'datahelper'
], function(_, G, D)
{
    var getSectorName = function(d) {
        return '[' + d.sector_id + '] ' + G.appView.model.get('sector_names')[d.sector_name_id];
    };
    var isNodeInRange = _.curry(function(range, node) {
        return node.dateRange.plan && 
            node.dateRange.plan.finish >= _.first(range) &&
            node.dateRange.plan.start  <= _.last(range);
    });

    var OrderGroups = {
        buildOrderList: function(range, groupType) {
            if (!range.length) { return []; }
            var groups = {};
            var groupsSubnames = {};
            D(G.appView.model.getD3Data().dataset).forEach('order', function(order) {
                switch(groupType) {
                    case 'work_types':
                        _(order.nodes).filter(isNodeInRange(range))
                            .forEach(function(workType) {
                                if (!groups[workType.name]) { groups[workType.name] = []; }
                                groups[workType.name].push({
                                    path: order.id + '/' + workType.name,
                                    name: order.name
                                });
                            });
                        break;
                    case 'sectors':
                        _.forEach(order.nodes, function(wt) { _(wt.nodes)
                            .filter(isNodeInRange(range))
                            .forEach(function(workorder) {
                                var sectorName = getSectorName(workorder);
                                if (!groups[sectorName]) { groups[sectorName] = []; }
                                groups[sectorName].push({
                                    name: order.name, 
                                    subname: workorder.name, 
                                    path: workorder.id
                                });
                                groupsSubnames[sectorName] = wt.name;
                            });
                        });
                        break;
                }
            });

            return _.map(groups, function(items, groupName) {
                return {
                    name: groupName,
                    subname: groupsSubnames[groupName],
                    items: items.sort(function(a, b) {
                        return G.utils.sortOrderNames(a.name, b.name);
                    })
                };
            }).sort(function(a, b) {
                var ƒ = function(x) { return x.name.split(']')[0].slice(1); };
                if (groupType === 'sectors') {
                    return ƒ(a) - ƒ(b);
                } else {
                    return a.name.localeCompare(b.name);
                }
            });
        } // buildOrderList
    };

    return OrderGroups;
});
