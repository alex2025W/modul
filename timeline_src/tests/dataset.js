define(['dataset', 'global', 'fixture'], function (Dataset, G, fixture) {

module("dataset", {
    setup: function() {
        this.model = new Dataset({hierarchy: "Заказы"});
        this.node = $.extend(true, {}, node);
    },
	teardown: function() {
		this.model.destroy();
        delete this.model;
	}
});

var node = {
        name: "root",
        nodes: [
            {
                name: "sub1",
                nodes: [
                    {
                        name: "sub11",
                        plan: { start: "2014-03-03", finish: "2014-03-09" },
                        nodes: [
                            { fact: { date: "2014-03-06", scope: 14.7 } },
                            { fact: { date: "2014-03-05", scope: 14.7 } },
                            { fact: { date: "2014-03-03", scope: 14.7 } },
                            { fact: { date: "2014-03-07", scope: 14.7 } }
                        ]
                    },
                    {
                        name: "sub12",
                        plan: { start: "2014-03-01", finish: "2014-03-05" },
                        nodes: [
                            { fact: { date: "2014-03-05", scope: 14.7 } },
                            { fact: { date: "2014-03-02", scope: 14.7 } },
                            { fact: { date: "2014-03-06", scope: 14.7 } }
                        ]
                    },
                    {
                        name: "sub13",
                        plan: { start: "2014-03-11", finish: "2014-03-11" },
                        // initial_plan: { start: "2014-03-10", finish: "2014-03-12" },
                        plan_shifts: [
                            { shift: 1, type: "start" },
                            { shift: -1, type: "finish" },
                        ],
                        nodes: [
                            { fact: { date: "2014-03-11", scope: 14.7 } },
                            { fact: { date: "2014-03-10", scope: 14.7 } },
                            { fact: { date: "2014-03-12", scope: 14.7 } }
                        ]
                    }
                ]
            },
            {
                name: "sub2",
                nodes: [
                    {
                        name: "sub21",
                        plan: { start: "2014-03-10", finish: "2014-03-11" },
                        // initial_plan: { start: "2014-03-04", finish: "2014-03-04" },
                        plan_shifts: [
                            { shift: 6, type: "start" },
                            { shift: 7, type: "finish" },
                        ],
                    },
                    {
                        name: "sub22",
                        plan: { start: "2014-03-07", finish: "2014-03-08" },
                        nodes: [
                            { fact: { date: "2014-03-13", scope: 14.7 } }
                        ]
                    },
                    {
                        name: "sub23",
                        plan: { start: "2014-03-07", finish: "2014-03-09" },
                        nodes: [
                            { fact: { date: "2014-03-09", scope: 14.7 } },
                            { fact: { date: "2014-03-07", scope: 14.7 } },
                            { fact: { date: "2014-03-10", scope: 14.7 } },
                            { fact: { date: "2014-03-12", scope: 14.7 } }
                        ]
                    }
                ]
            }
        ]
    },
    prepareResult = function(result) {
        if (result.constructor !== Array) { result = [ result ] };
        result.forEach(function(dates) {
            dates.start = G.utils.dayStringToDate(dates.start);
            dates.finish = G.utils.dayStringToDate(dates.finish);
        })
    };

test("calculateDates - plan date ranges", function() {
    var result_root = { start: "2014-03-01", finish: "2014-03-11" },
        result_sub1 = { start: "2014-03-01", finish: "2014-03-11" },
        result_sub2 = { start: "2014-03-07", finish: "2014-03-11" };
    [result_root, result_sub1, result_sub2].forEach(prepareResult);

    this.model.calculateDates(this.node);

    deepEqual(this.node.nodes[0].dateRange.plan, result_sub1, "sub 1");
    deepEqual(this.node.nodes[1].dateRange.plan, result_sub2, "sub 2");
    deepEqual(this.node.dateRange.plan, result_root, "root");
}); // calculate dates - plan date ranges

test("calculateDates - fact date ranges", function() {
    var result_root = { start: "2014-03-02", finish: "2014-03-13" },
        result_sub1 = { start: "2014-03-02", finish: "2014-03-12" },
        result_sub2 = { start: "2014-03-07", finish: "2014-03-13" },
        result_sub12 = { start: "2014-03-02", finish: "2014-03-06" };
    [result_root, result_sub1, result_sub2, result_sub12].forEach(prepareResult);

    this.model.calculateDates(this.node);

    deepEqual(this.node.nodes[0].dateRange.fact, result_sub1, "sub 1");
    deepEqual(this.node.nodes[0].nodes[1].dateRange.fact, result_sub12, "sub 12");
    deepEqual(this.node.nodes[1].dateRange.fact, result_sub2, "sub 2");
    deepEqual(this.node.dateRange.fact, result_root, "root");
}); // calculate dates - fact date ranges

test("calculateDates - plan intervals", function() {
    var result_root = [ { start: "2014-03-01", finish: "2014-03-11" } ],
        result_sub1 = [ { start: "2014-03-01", finish: "2014-03-09" }, { start: "2014-03-11", finish: "2014-03-11" } ],
        result_sub2 = [ { start: "2014-03-07", finish: "2014-03-11" } ];
    [result_root, result_sub1, result_sub2].forEach(prepareResult);

    this.model.calculateDates(this.node);

    deepEqual(this.node.nodes[0].dateIntervals.plan, result_sub1, "sub 1");
    deepEqual(this.node.nodes[1].dateIntervals.plan, result_sub2, "sub 2");
    deepEqual(this.node.dateIntervals.plan, result_root, "root");
}); // calculate dates - plan intervals

test("calculateDates - fact intervals", function() {
    var result_root = [ { start: "2014-03-02", finish: "2014-03-03" },
                        { start: "2014-03-05", finish: "2014-03-07" },
                        { start: "2014-03-09", finish: "2014-03-13" } ],
        result_sub1 = [ { start: "2014-03-02", finish: "2014-03-03" },
                        { start: "2014-03-05", finish: "2014-03-07" },
                        { start: "2014-03-10", finish: "2014-03-12" } ],
        result_sub2 = [ { start: "2014-03-07", finish: "2014-03-07" },
                        { start: "2014-03-09", finish: "2014-03-10" },
                        { start: "2014-03-12", finish: "2014-03-13" } ],
        result_sub12 = [{ start: "2014-03-02", finish: "2014-03-02" },
                        { start: "2014-03-05", finish: "2014-03-06" } ],
        result_sub23 = [{ start: "2014-03-07", finish: "2014-03-07" },
                        { start: "2014-03-09", finish: "2014-03-10" },
                        { start: "2014-03-12", finish: "2014-03-12" } ];
    [result_root, result_sub1, result_sub2, result_sub12, result_sub23].forEach(prepareResult);

    this.model.calculateDates(this.node);

    deepEqual(this.node.nodes[0].dateIntervals.fact, result_sub1, "sub 1");
    deepEqual(this.node.nodes[1].dateIntervals.fact, result_sub2, "sub 2");
    deepEqual(this.node.nodes[0].nodes[1].dateIntervals.fact, result_sub12, "sub 12");
    deepEqual(this.node.nodes[1].nodes[2].dateIntervals.fact, result_sub23, "sub 23");
    deepEqual(this.node.dateIntervals.fact, result_root, "root");
}); // calculate dates - fact intervals


// test("plan shifts - initial plan", function() {
//     var result_sub1 = { start: "2014-03-01", finish: "2014-03-12" };
//         result_sub2 = { start: "2014-03-04", finish: "2014-03-09" };
//     [result_sub1, result_sub2].forEach(prepareResult);

//     this.model.calculateDates(this.node);
//     deepEqual(this.node.nodes[0].dateRange.initial_plan, result_sub1, "sub 1");
//     deepEqual(this.node.nodes[1].dateRange.initial_plan, result_sub2, "sub 2");
// }); // plan shifts - initial plan

});
