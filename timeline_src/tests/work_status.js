define(['d3', 'underscore', 'dataset', 'workstatushelper'], function (d3, _, Dataset, WorkStatusHelper) {

var fixture = 
{
    "name": "Заказы",
    "done": false,
    "nodes": [{
        "name": "544.2.1",
        "done": false,
        "nodes": [{
            "name": "Цех",
            "done": true,
            "nodes": [{
                "name": "1063",
                "done": true,
                "nodes": [{
                    "name": 6,
                    "done": true,
                    "status_log": [
                        { "status": "on_hold", "date": "2013-05-20", "reason": "1063", "note": "1"},
                        { "status": "on_pause", "date": "2013-05-22", "reason": "1063", "note": "2"},
                        { "status": "on_hold", "date": "2013-05-27", "reason": "1063", "note": "3"},
                        { "status": "on_work", "date": "2013-05-30", "reason": "1063", "note": "4" }
                    ],
                    "nodes": [
                        { "name": "2013-05-30 13:45:00" }]
                }]
            },
            {
                "name": "960 - findme1",
                "done": true,
                "nodes": [{
                    "name": 1,
                    "done": true
                },
                {
                    "name": 4,
                    "done": true
                }]
            },
            {
                "name": "958",
                "done": true,
                "nodes": [{
                    "name": 1,
                    "done": true,
                    "status_log": [
                        { "status": "on_hold", "date": "2013-06-01", "reason": "958", "note": "1"},
                        { "status": "on_work", "date": "2013-06-04", "reason": "958", "note": "2"}
                    ],
                    "nodes": [
                        { "name": "2013-06-04 17:30:39" },
                        { "name": "2013-06-04 17:31:50" }]
                }]
            }]
        },
        {
            "name": "Монтаж",
            "done": false,
            "nodes": [{
                "name": "1403",
                "done": false,
                "nodes": [{
                    "name": 1,
                    "done": true,
                    "status_log": [
                        { "status": "on_pause", "date": "2013-07-19", "reason": "1403", "note": "1"},
                        { "status": "on_pause", "date": "2013-07-23", "reason": "1403", "note": "2"},
                        { "status": "on_pause", "date": "2013-07-26", "reason": "1403", "note": "3"}
                    ],
                    "nodes": [{
                        "name": "2013-07-18 10:30:51" }]
                },
                {
                    "name": "4 - findme1",
                    "done": false,
                    "status_log": [
                        { "status": "on_hold", "date": "2013-07-21", "reason": "1403", "note": "1"},
                        { "status": "on_work", "date": "2013-07-24", "reason": "1403", "note": "2"},
                        { "status": "on_hold", "date": "2013-07-27", "reason": "1403", "note": "3"},
                        { "status": "on_work", "date": "2013-07-29", "reason": "1403", "note": "4"}
                    ],
                    "nodes": [
                        { "name": "2013-07-18 10:36:46" },
                        { "name": "2013-07-19 09:02:54" },
                        { "name": "2013-07-24 10:04:00" }
                    ]
                },
                {
                    "name": 5,
                    "done": false,
                    "status_log": [
                        { "status": "on_hold", "date": "2013-07-25", "reason": "1403 - 5", "note": "1"},
                        { "status": "on_hold", "date": "2013-07-27", "reason": "1403 - 5", "note": "2"},
                        { "status": "on_work", "date": "2013-07-29", "reason": "1403 - 5", "note": "3"}
                    ],
                    "nodes": [
                        { "name": "2013-07-23 10:36:46" }
                    ]
                }]
            },
            {
                "name": "1405",
                "done": true,
                "nodes": [{
                    "name": 1,
                    "done": true,
                    "status_log": [
                        { "status": "on_pause", "date": "2013-08-01", "reason": "1405", "note": "1"},
                        { "status": "on_pause", "date": "2013-08-04", "reason": "1405", "note": "2"},
                        { "status": "on_pause", "date": "2013-08-10", "reason": "1405", "note": "3"},
                        { "status": "on_work", "date": "2013-08-15", "reason": "1405", "note": "4"}
                    ],
                    "nodes": [
                        { "name": "2013-07-31 10:26:40" }]
                },
                {
                    "name": 4,
                    "done": true,
                    "nodes": [{
                        "name": "2013-07-31 10:27:28" }]
                }]
            }]
        }]
    },
    {
        "name": "744.1.* - findme2",
        "done": true,
        "nodes": [{
            "name": "Цех",
            "done": true,
            "nodes": [{
                "name": "967",
                "done": true,
                "nodes": [{
                    "name": 1,
                    "done": true,
                    "status_log": [
                        { "status": "on_pause", "date": "2013-05-10", "reason": "967", "note": "1"},
                        { "status": "on_hold", "date": "2013-05-13", "reason": "967", "note": "2"},
                        { "status": "on_pause", "date": "2013-05-15", "reason": "967", "note": "3"},
                        { "status": "on_hold", "date": "2013-05-20", "reason": "967", "note": "4"},
                        { "status": "on_pause", "date": "2013-05-26", "reason": "967", "note": "5"},
                        { "status": "on_work", "date": "2013-05-28", "reason": "967", "note": "6"}
                    ],
                    "nodes": [{
                        "name": "2013-05-28 16:29:29" }]
                }]
            },
            {
                "name": "972",
                "done": true,
                "nodes": [{
                    "name": "1 - findme2",
                    "done": true,
                    "nodes": [{
                        "name": "2013-05-28 16:19:02" }]
                },
                {
                    "name": 4,
                    "done": true,
                    "nodes": [{
                        "name": "2013-05-28 16:19:02" }]
                }]
            }]
        }]
    },
    {
        "name": "799.1.1",
        "done": false,
        "nodes": [{
            "name": "Цех",
            "done": true,
            "nodes": [{
                "name": "1187",
                "done": true,
                "nodes": [{
                    "name": 1,
                    "done": true,
                    "nodes": [{
                        "name": "2013-06-20 17:00:46" }]
                },
                {
                    "name": 3,
                    "done": true,
                    "nodes": [{
                        "name": "2013-06-20 17:00:46" }]
                }]
            },
            {
                "name": "1193",
                "done": true,
                "nodes": [{
                    "name": 1,
                    "done": true,
                    "nodes": [{
                        "name": "2013-06-21 16:03:27" }]
                }]
            }]
        },
        {
            "name": "Монтаж - findme1",
            "done": false,
            "nodes": [{
                "name": "1454",
                "done": false,
                "nodes": [{
                    "name": 1,
                    "done": false
                },
                {
                    "name": 4,
                    "done": false
                },
                {
                    "name": 28,
                    "done": false
                }]
            },
            {
                "name": "1456",
                "done": false,
                "nodes": [{
                    "name": 1,
                    "done": false
                }]
            },
            {
                "name": "1455",
                "done": false,
                "nodes": [{
                    "name": 16,
                    "done": false
                },
                {
                    "name": 17,
                    "done": false
                }]
            }]
        }]
    }]
};

var todayOffset = function(offset) {
    return d3.time.day.offset(d3.time.day(new Date()), offset);
};
var todaySmartOffset = function(offset) {
    var now = new Date();
    return d3.time.day.offset(d3.time.day(new Date()), now.getHours() < 10 ? offset-1 : offset);
};
var tomorrow = todayOffset(1);

var selectNode = function(node, query) {
    var tokens =  query.split('/'),
        token = tokens[0],
        ch = node.nodes || [],
        selection = [];
    ch.forEach(function(child) {
        if (String(child.name) === token) {
            selection.push(child);
        }
    });
    if (tokens.length > 1) {
        query = tokens.slice(1).join('/');
        selection = selection.map(function(n) {
            return selectNode(n, query);
        });
    }
    while (selection.length === 1) {
        selection = selection[0];
    }
    return selection.constructor === Array ? selection : [ selection ];
}; // selectNode



// HOLDS {{{
//
module('WorkStatus.Holds', {
    setup: function() {
        this.model = new Dataset();
        this.model.set('dataset', JSON.stringify(fixture));
        this.dataset = JSON.parse(this.model.get('dataset'));
    }, 
    teardown: function() {
		this.model.destroy();
        delete this.model;
    }
});



test("has holds - work level", function() {
    var node;

    // empty
    node = "544.2.1/Цех/960 - findme1/4";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], "on_hold"), false, "«" + node + "» has not statuses");
    
    // with pauses but not holds
    node = "544.2.1/Монтаж/1403/1";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], "on_hold"), false, "«" + node + "» has pauses but not holds");
    node = "544.2.1/Монтаж/1405/1";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], "on_hold"), false, "«" + node + "» has pauses but not holds");

    // not empty
    node = "544.2.1/Цех/1063/6";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], "on_hold"), true, "«" + node + "» has holds and pauses");
    node = "544.2.1/Цех/958/1";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], "on_hold"), true, "«" + node + "» has holds");
    node = "544.2.1/Монтаж/1403/4 - findme1";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], "on_hold"), true, "«" + node + "» has holds");
    node = "544.2.1/Монтаж/1403/5";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], "on_hold"), true, "«" + node + "» has holds");
    node = "744.1.* - findme2/Цех/967/1";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], "on_hold"), true, "«" + node + "» has holds and pauses");
});



test("has holds - workorder level", function() {
    var node;

    // empty
    node = "544.2.1/Цех/960 - findme1";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], "on_hold"), false, "«" + node + "» has not statuses");

    // with pauses but not holds
    node = "544.2.1/Монтаж/1405";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], "on_hold"), false, "«" + node + "» has pauses but not holds");

    // not empty
    node = "544.2.1/Цех/1063";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], "on_hold"), true, "«" + node + "» has holds and pauses");
    node = "544.2.1/Цех/958";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], "on_hold"), true, "«" + node + "» has holds only");
    node = "544.2.1/Монтаж/1403";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], "on_hold"), true, "«" + node + "» has holds and pauses");
    node = "744.1.* - findme2/Цех/967";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], "on_hold"), true, "«" + node + "» has holds and pauses");
});



test("has holds - order level", function() {
    var node;

    // empty
    node = "799.1.1";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], "on_hold"), false, "«" + node + "» has not statuses");

    // not empty
    node = "544.2.1";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], "on_hold"), true, "«" + node + "» has holds and paueses");
});



test("get hold days - work level", function() {
    var node, holdDays;
    
    // empty
    node = "544.2.1/Цех/960 - findme1/4";
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], "on_hold"), [], "«" + node + "» has not holds");
    
    // with pauses but not holds
    //
    node = "544.2.1/Монтаж/1403/1";
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], "on_hold"), [], "«" + node + "» has pauses but not holds");
    node = "544.2.1/Монтаж/1405/1";
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], "on_hold"), [], "«" + node + "» has pauses but not holds");

    // not empty
    //
    node = "544.2.1/Цех/1063/6";
    holdDays = _.flatten([
        d3.time.days(new Date(2013, 4, 20), new Date(2013, 4, 22)),
        d3.time.days(new Date(2013, 4, 27), new Date(2013, 4, 30))
        ]);
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], "on_hold"), holdDays, "«" + node + "» has valid holds");

    node = "544.2.1/Цех/958/1";
    holdDays = d3.time.days(new Date(2013, 5, 1), new Date(2013, 5, 4));
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], "on_hold"), holdDays, "«" + node + "» has valid holds");

    node = "544.2.1/Монтаж/1403/4 - findme1";
    holdDays = _.flatten([
        d3.time.days(new Date(2013, 6, 21), new Date(2013, 6, 24)),
        d3.time.days(new Date(2013, 6, 27), new Date(2013, 6, 29))
        ]);
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], "on_hold"), holdDays, "«" + node + "» has valid holds");

    node = "544.2.1/Монтаж/1403/5";
    holdDays = d3.time.days(new Date(2013, 6, 25), new Date(2013, 6, 29));
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], "on_hold"), holdDays, "«" + node + "» has valid holds");

    node = "744.1.* - findme2/Цех/967/1";
    holdDays = _.flatten([
        d3.time.days(new Date(2013, 4, 13), new Date(2013, 4, 15)),
        d3.time.days(new Date(2013, 4, 20), new Date(2013, 4, 26))
        ]);
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], "on_hold"), holdDays, "«" + node + "» has valid holds");
});



test("get hold days - workorder level", function() {
    var node, holdDays;
    
    // empty
    node = "544.2.1/Цех/960 - findme1";
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], "on_hold"), [], "«" + node + "» has not statuses");

    // with pauses but not holds
    //
    node = "544.2.1/Монтаж/1405";
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], "on_hold"), [], "«" + node + "» has pauses but not holds");

    
    // not empty
    //
    node = "544.2.1/Цех/1063";
    holdDays = _.flatten([
        d3.time.days(new Date(2013, 4, 20), new Date(2013, 4, 22)),
        d3.time.days(new Date(2013, 4, 27), new Date(2013, 4, 30))
        ]);
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], "on_hold"), holdDays, "«" + node + "» has valid holds");

    node = "544.2.1/Цех/958";
    holdDays = d3.time.days(new Date(2013, 5, 1), new Date(2013, 5, 4));
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], "on_hold"), holdDays, "«" + node + "» has valid holds");

    node = "544.2.1/Монтаж/1403";
    holdDays = _.flatten([
        d3.time.days(new Date(2013, 6, 21), new Date(2013, 6, 24)),
        d3.time.days(new Date(2013, 6, 25), new Date(2013, 6, 29))
        ]);
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], "on_hold"), holdDays, "«" + node + "» has valid holds");

    node = "744.1.* - findme2/Цех/967";
    holdDays = _.flatten([
        d3.time.days(new Date(2013, 4, 13), new Date(2013, 4, 15)),
        d3.time.days(new Date(2013, 4, 20), new Date(2013, 4, 26))
        ]);
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], "on_hold"), holdDays, "«" + node + "» has holds and pauses");
});



test("get hold days - order level", function() {
    var node, holdDays;
    
    // empty
    node = "799.1.1";
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], "on_hold"), [], "«" + node + "» has not holds");

    // not empty
    node = "544.2.1";
    holdDays = _.flatten([
        d3.time.days(new Date(2013, 4, 20), new Date(2013, 4, 22)),
        d3.time.days(new Date(2013, 4, 27), new Date(2013, 4, 30)),
        d3.time.days(new Date(2013, 5, 1), new Date(2013, 5, 4)),
        d3.time.days(new Date(2013, 6, 21), new Date(2013, 6, 24)),
        d3.time.days(new Date(2013, 6, 25), new Date(2013, 6, 29))
        ]);
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], "on_hold"), holdDays, "«" + node + "» has valid holds");
});



test("status info - work level", function() {
    var node, selectedNode, holdDays,
        workStatus = "on_hold";

    node = "544.2.1/Цех/1063/6";
    holdDays = _.flatten([
        d3.time.days(new Date(2013, 4, 20), new Date(2013, 4, 22)),
        d3.time.days(new Date(2013, 4, 27), new Date(2013, 4, 30))
        ]);
    selectedNode = selectNode(this.dataset, node)[0];
    holdDays.forEach(function(day) {
        var lastStatus = WorkStatusHelper.getInfoAboutStatus(selectedNode, day, workStatus).last_status;
        equal(lastStatus.reason, "1063", "«" + node + "» has valid last status reason");
        equal(lastStatus.note, day < new Date(2013, 4, 22) ? "1" : "3", "«" + node + "» has valid last status note");
    });

    node = "544.2.1/Монтаж/1405/1";
    holdDays = d3.time.days(new Date(2013, 7, 1), new Date(2013, 7, 30));
    selectedNode = selectNode(this.dataset, node)[0];
    holdDays.forEach(function(day) {
        var note;
        workStatus = 'on_pause';
        if (day < new Date(2013, 7, 4)) {
            note = 1;
        } else if (day < new Date(2013, 7, 10)) {
            note = "2";
        } else if (day < new Date(2013, 7, 15)) {
            note = "3";
        } else {
            workStatus = 'on_work';
            note = "4";
        }
        var lastStatus = WorkStatusHelper.getInfoAboutStatus(selectedNode, day, workStatus).last_status;
        equal(lastStatus.reason, "1405", "«" + node + "» has valid last status reason");
        equal(lastStatus.note, note, "«" + node + "» has valid last status note (" + note + ") on day " + day);
    });
    


    // TODO: test other combinations
});



test("status info - order level", function() {
    var node, selectedNode,
        workStatus = "on_hold";

    node = "544.2.1/Монтаж/1403";
    selectedNode = selectNode(this.dataset, node)[0];
    deepEqual(
        WorkStatusHelper.getInfoAboutStatus(selectedNode, d3.time.day(new Date(2013, 6, 23)), workStatus),
        { inside: 1 },
        "«" + node + "» has valid last status"
    );
    deepEqual(
        WorkStatusHelper.getInfoAboutStatus(selectedNode, d3.time.day(new Date(2013, 6, 27)), workStatus),
        { inside: 2 },
        "«" + node + "» has valid last status"
    );
});

//
// HOLDS }}}


// PAUSES {{{
//
module('WorkStatus.Pauses', {
    setup: function() {
        this.model = new Dataset();
        this.model.set('dataset', JSON.stringify(fixture));
        this.dataset = JSON.parse(this.model.get('dataset'));
    }, 
    teardown: function() {
		this.model.destroy();
        delete this.model;
    }
});

test("has pauses - work level", function() {
    var node, msg;

    // empty
    node = "544.2.1/Цех/960 - findme1/4";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], "on_pause"), false, "«" + node + "» has not statuses");
    
    msg = "has holds but not pauses";
    node = "544.2.1/Цех/958/1";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], "on_pause"), false, "«" + node + "» " + msg);
    node = "544.2.1/Монтаж/1403/4 - findme1";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], "on_pause"), false, "«" + node + "» " + msg);
    node = "544.2.1/Монтаж/1403/5";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], "on_pause"), false, "«" + node + "» " + msg);

    // not empty
    node = "544.2.1/Цех/1063/6";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], "on_pause"), true, "«" + node + "» has holds and pauses");
    node = "544.2.1/Монтаж/1403/1";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], "on_pause"), true, "«" + node + "» has pauses but not holds");
    node = "544.2.1/Монтаж/1405/1";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], "on_pause"), true, "«" + node + "» has pauses but not holds");
    node = "744.1.* - findme2/Цех/967/1";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], "on_pause"), true, "«" + node + "» has holds and pauses");
});

test("has pauses - workorder level", function() {
    var node;

    // empty
    node = "544.2.1/Цех/960 - findme1";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], "on_pause"), false, "«" + node + "» has not statuses");

    // with holds but not pauses
    node = "544.2.1/Цех/958";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], "on_pause"), false, "«" + node + "» has holds only");
    
    // not empty
    node = "544.2.1/Монтаж/1405";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], "on_pause"), true, "«" + node + "» has pauses but not holds");
    node = "544.2.1/Цех/1063";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], "on_pause"), true, "«" + node + "» has holds and pauses");
    node = "544.2.1/Монтаж/1403";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], "on_pause"), true, "«" + node + "» has holds and pauses");
    node = "744.1.* - findme2/Цех/967";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], "on_pause"), true, "«" + node + "» has holds and pauses");
});

test("has pauses - order level", function() {
    var node;

    // empty
    node = "799.1.1";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], "on_pause"), false, "«" + node + "» has not statuses");

    // not empty
    node = "544.2.1";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], "on_pause"), true, "«" + node + "» has holds and paueses");
});

test("get pause days - work level", function() {
    var node, days;
    
    // empty
    node = "544.2.1/Цех/960 - findme1/4";
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], "on_pause"), [], "«" + node + "» has not statuses");
    
    // with holds but not pauses
    //
    node = "544.2.1/Цех/958/1";
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], "on_pause"), [], "«" + node + "» has holds but not pauses");
    node = "544.2.1/Монтаж/1403/4 - findme1";
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], "on_pause"), [], "«" + node + "» has holds but not pauses");
    node = "544.2.1/Монтаж/1403/5";
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], "on_pause"), [], "«" + node + "» has holds but not pauses");

    
    // not empty
    //
    node = "544.2.1/Цех/1063/6";
    days = _.flatten([
        d3.time.days(new Date(2013, 4, 22), new Date(2013, 4, 27))
        ]);
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], "on_pause"), days, "«" + node + "» has valid");

    node = "544.2.1/Монтаж/1403/1";
    days = d3.time.days(new Date(2013, 6, 19), tomorrow);
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], "on_pause"), days, "«" + node + "» has valid");

    node = "544.2.1/Монтаж/1405/1";
    days = d3.time.days(new Date(2013, 7, 1), new Date(2013, 7, 15));
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], "on_pause"), days, "«" + node + "» has valid");

    node = "744.1.* - findme2/Цех/967/1";
    days = _.flatten([
        d3.time.days(new Date(2013, 4, 10), new Date(2013, 4, 13)),
        d3.time.days(new Date(2013, 4, 15), new Date(2013, 4, 20)),
        d3.time.days(new Date(2013, 4, 26), new Date(2013, 4, 28))
        ]);
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], "on_pause"), days, "«" + node + "» has valid");
});

test("get pause days - workorder level", function() {
    var node, days;
    
    // empty
    node = "544.2.1/Цех/960 - findme1";
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], "on_pause"), [], "«" + node + "» has not statuses");

    // with holds but not pauses
    node = "544.2.1/Цех/958";
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], "on_pause"), [], "«" + node + "» has holds but not pauses");

    
    // not empty
    //
    node = "544.2.1/Цех/1063";
    days = _.flatten([
        d3.time.days(new Date(2013, 4, 22), new Date(2013, 4, 27))
        ]);
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], "on_pause"), days, "«" + node + "» has valid");

    node = "544.2.1/Монтаж/1405";
    days = d3.time.days(new Date(2013, 7, 1), new Date(2013, 7, 15));
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], "on_pause"), days, "«" + node + "» has valid");

    node = "544.2.1/Монтаж/1403";
    days = d3.time.days(new Date(2013, 6, 19), tomorrow);
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], "on_pause"), days, "«" + node + "» has valid");

    node = "744.1.* - findme2/Цех/967";
    days = _.flatten([
        d3.time.days(new Date(2013, 4, 10), new Date(2013, 4, 13)),
        d3.time.days(new Date(2013, 4, 15), new Date(2013, 4, 20)),
        d3.time.days(new Date(2013, 4, 26), new Date(2013, 4, 28))
        ]);
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], "on_pause"), days, "«" + node + "» has holds and pauses");
});

test("get pause days - order level", function() {
    var node, days;
    
    // empty
    node = "799.1.1";
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], "on_pause"), [], "«" + node + "» has not paueses");

    // not empty
    node = "544.2.1";
    days = _.flatten([
        d3.time.days(new Date(2013, 4, 22), new Date(2013, 4, 27)),
        d3.time.days(new Date(2013, 6, 19), tomorrow)
        ]);
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], "on_pause"), days, "«" + node + "» has valid paueses");
    
    node = "744.1.* - findme2";
    days = _.flatten([
        d3.time.days(new Date(2013, 4, 10), new Date(2013, 4, 13)),
        d3.time.days(new Date(2013, 4, 15), new Date(2013, 4, 20)),
        d3.time.days(new Date(2013, 4, 26), new Date(2013, 4, 28))
        ]);
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], "on_pause"), days, "«" + node + "» has valid paueses");
});
//
// PAUSES }}}

module('WorkStatus.KeyStatus', {
    setup: function() {
        this.model = new Dataset();
        this.model.set('dataset', JSON.stringify(fixture));
        this.dataset = JSON.parse(this.model.get('dataset'));
    }, 
    teardown: function() {
		this.model.destroy();
        delete this.model;
    },

    isKeyDate: function(date, keyDates) {
        return keyDates.filter(function(d) { return +d === +date; }).length > 0;
    },

    testDateRange: function(dateRange, keyDates, node, workStatus) {
        var self = this;
        dateRange.forEach(function(date) {
            equal(
                WorkStatusHelper.isKeyStatusOnDate(selectNode(self.dataset, node)[0], workStatus, date),
                self.isKeyDate(date, keyDates),
                "«" + node + "» is " + self.isKeyDate(date, keyDates) + " key status on date " + d3.time.format("%d.%m.%y")(date)
            );
        });
    }
});

test("key status on holds", function() {
    var workStatus = "on_hold",
        node, keyDates, dateRange;

    node = "544.2.1/Цех/1063/6";
    keyDates = [new Date(2013, 4, 20), new Date(2013, 4, 27)];
    dateRange = d3.time.days(new Date(2013, 4, 20), new Date(2013, 4, 30));
    this.testDateRange(dateRange, keyDates, node, workStatus);

    node = "544.2.1/Цех/958/1";
    keyDates = [new Date(2013, 5, 1)];
    dateRange = d3.time.days(new Date(2013, 5, 1), new Date(2013, 5, 4));
    this.testDateRange(dateRange, keyDates, node, workStatus);

    node = "544.2.1/Монтаж/1403";
    keyDates = [];
    dateRange = d3.time.days(new Date(2013, 6, 19), new Date(2013, 6, 27));
    this.testDateRange(dateRange, keyDates, node, workStatus);
});


test("key status on pauses", function() {
    var workStatus = "on_pause",
        node, keyDates, dateRange;

    node = "544.2.1/Цех/1063/6";
    keyDates = [new Date(2013, 4, 22)];
    dateRange = d3.time.days(new Date(2013, 4, 20), new Date(2013, 4, 30));
    this.testDateRange(dateRange, keyDates, node, workStatus);

    node = "744.1.* - findme2/Цех/967/1";
    keyDates = [new Date(2013, 4, 10), new Date(2013, 4, 15), new Date(2013, 4, 26)];
    dateRange = d3.time.days(new Date(2013, 4, 10), new Date(2013, 4, 28));
    this.testDateRange(dateRange, keyDates, node, workStatus);

    node = "544.2.1/Монтаж/1403";
    keyDates = [];
    dateRange = d3.time.days(new Date(2013, 6, 19), new Date(2013, 6, 27));
    this.testDateRange(dateRange, keyDates, node, workStatus);
});


// NO DATA STATUS {{{
//
var nodataFixture = {
    nodes: [{
        name: "1111",
        done: false,
        node_type: "workorder",
        dateRange: { plan: { start: todayOffset(-9) } },
        nodes: [{
            name: "1",
            done: true,
            node_type: "work",
            dateRange: {}
        }, {
            name: "2",
            done: false,
            node_type: "work",
            status_log: [ { "status": "on_hold", "date": "2013-05-20", "reason": "1063", "note": "1"} ],
            dateRange: {}
        }, {
            name: "3",
            done: false,
            node_type: "work",
            status_log: [ { "status": "on_pause", "date": "2013-05-20", "reason": "1063", "note": "1"} ],
            dateRange: {}
        }, {
            name: "4",
            done: false,
            node_type: "work",
            status_log: [ { "status": "on_work", "date": d3.time.format('%Y-%m-%d')(todayOffset(-3)), "reason": "1063", "note": "1"} ],
            dateRange: { plan: { start: todayOffset(-9) } }
        }, {
            name: "5",
            done: false,
            node_type: "work",
            dateRange: { plan: { start: todayOffset(-4) } }
        }]
    }, {
        name: "2222",
        done: false,
        dateRange: { plan: { start: todayOffset(-2) } },
        node_type: "workorder",
        nodes: [{
            name: "1",
            done: false,
            node_type: "work",
            dateRange: { plan: { start: todayOffset(1) } }
        }, {
            name: "2",
            done: false,
            node_type: "work",
            dateRange: { plan: { start: todayOffset(0) } }
        }, {
            name: "3",
            done: false,
            node_type: "work",
            dateRange: { plan: { start: todayOffset(-1) } }
        }, {
            name: "4",
            done: false,
            node_type: "work",
            dateRange: { plan: { start: todayOffset(-2) } }
        }]
    }, {
        name: "3333",
        done: false,
        node_type: "workorder",
        dateRange: { plan: { start: todayOffset(-99) }, fact: { finish: todayOffset(0) } },
        nodes: [{
            name: "1",
            done: false,
            node_type: "work",
            dateRange: { plan: { start: todayOffset(-99) }, fact: { finish: todayOffset(0) } }
        }, {
            name: "2",
            done: false,
            node_type: "work",
            dateRange: { plan: { start: todayOffset(-99) }, fact: { finish: todayOffset(-1) } }
        }, {
            name: "3",
            done: false,
            node_type: "work",
            dateRange: { plan: { start: todayOffset(-99) }, fact: { finish: todayOffset(-2) } }
        }, {
            name: "4",
            done: false,
            node_type: "work",
            dateRange: { plan: { start: todayOffset(-99) }, fact: { finish: todayOffset(-3) } }
        }]
    }]
};


module('WorkStatus.Nodata', {
    setup: function() {
        this.model = new Dataset();
        this.model.set('dataset', JSON.stringify(nodataFixture));
        this.dataset = JSON.parse(this.model.get('dataset'));
        this.dataset = nodataFixture;
        this.status = "no_data";
        this.Date = Date;
        this.gto = WorkStatusHelper.getTodayOffsetBy10am;
    }, 
    teardown: function() {
		this.model.destroy();
        Date = this.Date;
        WorkStatusHelper.getTodayOffsetBy10am = this.gto;
        delete this.model;
    }
});


test("has nodata - work level", function() {
    var node;

    // done work
    node = "1111/1";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], this.status), false, "«" + node + "» is done");
    
    // with pauses or holds
    node = "1111/2";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], this.status), false, "«" + node + "» has holds");
    node = "1111/3";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], this.status), false, "«" + node + "» has pauses");

    // not empty
    node = "1111/4";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], this.status), true, "«" + node + "» on work");
    node = "1111/5";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], this.status), true, "«" + node + "» has not status");

    // check plan dates
    node = "2222/1";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], this.status), false, "«" + node + "» in the future");
    node = "2222/2";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], this.status), false, "«" + node + "» started today");
    node = "2222/3";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], this.status), true, "«" + node + "» started yesterday (pass after 10:00)");
    node = "2222/4";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], this.status), true, "«" + node + "» started in the past");
    
    // check fact dates
    node = "3333/1";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], this.status), false, "«" + node + "» fact today");
    node = "3333/2";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], this.status), false, "«" + node + "» fact yesterday");
    node = "3333/3";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], this.status), true, "«" + node + "» fact yes-yesterday (pass after 10:00)");
    node = "3333/4";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], this.status), true, "«" + node + "» fact in the past");
});


test("has nodata - workorder level", function() {
    var node;

    node = "1111";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], this.status), true, "«" + node + "» has nodata");
    node = "2222";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], this.status), true, "«" + node + "» has nodata");
    node = "3333";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], this.status), true, "«" + node + "» has nodata");
});

test("has nodata - before and after 10 am", function() {
    var node;

    // before 10 am.
    //
    Date = (function(self) { return function() { var d = new self.Date(); d.setHours(7); return d; }; })(this);
    node = "2222/2";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], this.status), false, "«" + node + "» started today");
    node = "2222/3";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], this.status), false, "«" + node + "» started real yesterday, pseudo today");
    node = "2222/4";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], this.status), true, "«" + node + "» started in the past");

    node = "3333/1";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], this.status), false, "«" + node + "» fact today");
    node = "3333/2";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], this.status), false, "«" + node + "» fact real yesterday, pseudo today");
    node = "3333/3";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], this.status), false, "«" + node + "» fact real yes-yesterday, pseudo yesterday");
    node = "3333/4";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], this.status), true, "«" + node + "» fact in the past");
    
    // after 10 am.
    Date = (function(self) { return function() { var d = new self.Date(); d.setHours(17); return d; }; })(this);
    node = "2222/2";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], this.status), false, "«" + node + "» started today");
    node = "2222/3";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], this.status), true, "«" + node + "» started real yesterday");
    node = "2222/4";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], this.status), true, "«" + node + "» started in the past");

    node = "3333/1";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], this.status), false, "«" + node + "» fact today");
    node = "3333/2";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], this.status), false, "«" + node + "» fact real yesterday");
    node = "3333/3";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], this.status), true, "«" + node + "» fact real yes-yesterday");
    node = "3333/4";
    equal(WorkStatusHelper.hasStatus(selectNode(this.dataset, node)[0], this.status), true, "«" + node + "» fact in the past");
});

test("get no-data days - work level", function() {
    var node, days,
        today = d3.time.day(new Date());
    
    // empty
    node = "1111/1";
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], this.status), [], "«" + node + "» has not no_data");
    node = "1111/2";
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], this.status), [], "«" + node + "» has not no_data");
    node = "1111/3";
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], this.status), [], "«" + node + "» has not no_data");
    node = "2222/1";
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], this.status), [], "«" + node + "» has not no_data");
    node = "2222/2";
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], this.status), [], "«" + node + "» has not no_data");
    node = "3333/1";
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], this.status), [], "«" + node + "» has not no_data");
    node = "3333/2";
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], this.status), [], "«" + node + "» has not no_data");
    
    var gto_real = WorkStatusHelper.getTodayOffsetBy10am,
        gto_before = function(offset) {
            return d3.time.day.offset(d3.time.day(new Date()), offset-1);
        },
        gto_after = function(offset) {
            return d3.time.day.offset(d3.time.day(new Date()), offset);
        };
    // not empty
    //
    node = "1111/4";
    WorkStatusHelper.getTodayOffsetBy10am = gto_before;
    days = d3.time.days(d3.time.day.offset(today, -3), d3.time.day.offset(today, -1));
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], this.status), days, "«" + node + "» before 10am");
    WorkStatusHelper.getTodayOffsetBy10am = gto_after;
    days = d3.time.days(d3.time.day.offset(today, -3), d3.time.day.offset(today, 0));
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], this.status), days, "«" + node + "» after 10am");
    node = "1111/5";
    WorkStatusHelper.getTodayOffsetBy10am = gto_before;
    days = d3.time.days(d3.time.day.offset(today, -4), d3.time.day.offset(today, -1));
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], this.status), days, "«" + node + "» before 10am");
    WorkStatusHelper.getTodayOffsetBy10am = gto_after;
    days = d3.time.days(d3.time.day.offset(today, -4), d3.time.day.offset(today, 0));
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], this.status), days, "«" + node + "» after 10am");

    node = "2222/3";
    WorkStatusHelper.getTodayOffsetBy10am = gto_before;
    days = [];
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], this.status), days, "«" + node + "» before 10am has no nodatas");
    WorkStatusHelper.getTodayOffsetBy10am = gto_after;
    days = d3.time.days(d3.time.day.offset(today, -1), d3.time.day.offset(today, 0));
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], this.status), days, "«" + node + "» after 10am");

    node = "2222/4";
    WorkStatusHelper.getTodayOffsetBy10am = gto_before;
    days = d3.time.days(d3.time.day.offset(today, -2), d3.time.day.offset(today, -1));
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], this.status), days, "«" + node + "» before 10am");
    WorkStatusHelper.getTodayOffsetBy10am = gto_after;
    days = d3.time.days(d3.time.day.offset(today, -2), d3.time.day.offset(today, 0));
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], this.status), days, "«" + node + "» after 10am");

    node = "3333/3";
    WorkStatusHelper.getTodayOffsetBy10am = gto_before;
    days = [];
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], this.status), days, "«" + node + "» after 10am");
    WorkStatusHelper.getTodayOffsetBy10am = gto_after;
    days = d3.time.days(d3.time.day.offset(today, -1), d3.time.day.offset(today, 0));
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], this.status), days, "«" + node + "» after 10am");
    node = "3333/4";
    WorkStatusHelper.getTodayOffsetBy10am = gto_before;
    days = d3.time.days(d3.time.day.offset(today, -2), d3.time.day.offset(today, -1));
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], this.status), days, "«" + node + "» after 10am");
    WorkStatusHelper.getTodayOffsetBy10am = gto_after;
    days = d3.time.days(d3.time.day.offset(today, -2), d3.time.day.offset(today, 0));
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], this.status), days, "«" + node + "» after 10am");

    WorkStatusHelper.getTodayOffsetBy10am = gto_real;
});


test("get no-data days - workorder level", function() {
    var gto_before = function(offset) {
            return d3.time.day.offset(d3.time.day(new Date()), offset-1);
        },
        gto_after = function(offset) {
            return d3.time.day.offset(d3.time.day(new Date()), offset);
        },
        today = d3.time.day(new Date());

    node = "1111";
    WorkStatusHelper.getTodayOffsetBy10am = gto_before;
    days = d3.time.days(d3.time.day.offset(today, -4), d3.time.day.offset(today, -1));
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], this.status), days, "«" + node + "» before 10am");
    WorkStatusHelper.getTodayOffsetBy10am = gto_after;
    days = d3.time.days(d3.time.day.offset(today, -4), d3.time.day.offset(today, 0));
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], this.status), days, "«" + node + "» after 10am");
    
    node = "2222";
    WorkStatusHelper.getTodayOffsetBy10am = gto_before;
    days = d3.time.days(d3.time.day.offset(today, -2), d3.time.day.offset(today, -1));
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], this.status), days, "«" + node + "» before 10am");
    WorkStatusHelper.getTodayOffsetBy10am = gto_after;
    days = d3.time.days(d3.time.day.offset(today, -2), d3.time.day.offset(today, 0));
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], this.status), days, "«" + node + "» after 10am");

    node = "3333";
    WorkStatusHelper.getTodayOffsetBy10am = gto_before;
    days = d3.time.days(d3.time.day.offset(today, -2), d3.time.day.offset(today, -1));
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], this.status), days, "«" + node + "» before 10am");
    WorkStatusHelper.getTodayOffsetBy10am = gto_after;
    days = d3.time.days(d3.time.day.offset(today, -2), d3.time.day.offset(today, 0));
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], this.status), days, "«" + node + "» after 10am");
});
/*



test("get hold days - workorder level", function() {
    var node, holdDays;
    
    // empty
    node = "544.2.1/Цех/960 - findme1";
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], this.status), [], "«" + node + "» has not statuses");

    // with pauses but not holds
    //
    node = "544.2.1/Монтаж/1405";
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], this.status), [], "«" + node + "» has pauses but not holds");

    
    // not empty
    //
    node = "544.2.1/Цех/1063";
    holdDays = _.flatten([
        d3.time.days(new Date(2013, 4, 20), new Date(2013, 4, 22)),
        d3.time.days(new Date(2013, 4, 27), new Date(2013, 4, 30))
        ]);
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], this.status), holdDays, "«" + node + "» has valid holds");

    node = "544.2.1/Цех/958";
    holdDays = d3.time.days(new Date(2013, 5, 1), new Date(2013, 5, 4));
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], this.status), holdDays, "«" + node + "» has valid holds");

    node = "544.2.1/Монтаж/1403";
    holdDays = _.flatten([
        d3.time.days(new Date(2013, 6, 21), new Date(2013, 6, 24)),
        d3.time.days(new Date(2013, 6, 25), new Date(2013, 6, 29))
        ]);
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], this.status), holdDays, "«" + node + "» has valid holds");

    node = "744.1.* - findme2/Цех/967";
    holdDays = _.flatten([
        d3.time.days(new Date(2013, 4, 13), new Date(2013, 4, 15)),
        d3.time.days(new Date(2013, 4, 20), new Date(2013, 4, 26))
        ]);
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], this.status), holdDays, "«" + node + "» has holds and pauses");
});



test("get hold days - order level", function() {
    var node, holdDays;
    
    // empty
    node = "799.1.1";
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], this.status), [], "«" + node + "» has not holds");

    // not empty
    node = "544.2.1";
    holdDays = _.flatten([
        d3.time.days(new Date(2013, 4, 20), new Date(2013, 4, 22)),
        d3.time.days(new Date(2013, 4, 27), new Date(2013, 4, 30)),
        d3.time.days(new Date(2013, 5, 1), new Date(2013, 5, 4)),
        d3.time.days(new Date(2013, 6, 21), new Date(2013, 6, 24)),
        d3.time.days(new Date(2013, 6, 25), new Date(2013, 6, 29))
        ]);
    deepEqual(WorkStatusHelper.getDaysWithStatus(selectNode(this.dataset, node)[0], this.status), holdDays, "«" + node + "» has valid holds");
});



test("status info - work level", function() {
    var node, selectedNode, holdDays,
        workStatus = "on_hold";

    node = "544.2.1/Цех/1063/6";
    holdDays = _.flatten([
        d3.time.days(new Date(2013, 4, 20), new Date(2013, 4, 22)),
        d3.time.days(new Date(2013, 4, 27), new Date(2013, 4, 30))
        ]);
    selectedNode = selectNode(this.dataset, node)[0];
    holdDays.forEach(function(day) {
        var lastStatus = WorkStatusHelper.getInfoAboutStatus(selectedNode, day, workStatus).last_status;
        equal(lastStatus.reason, "1063", "«" + node + "» has valid last status reason");
        equal(lastStatus.note, day < new Date(2013, 4, 22) ? "1" : "3", "«" + node + "» has valid last status note");
    });

    node = "544.2.1/Монтаж/1405/1";
    holdDays = d3.time.days(new Date(2013, 7, 1), new Date(2013, 7, 30));
    selectedNode = selectNode(this.dataset, node)[0];
    holdDays.forEach(function(day) {
        var note;
        workStatus = 'on_pause';
        if (day < new Date(2013, 7, 4)) {
            note = 1;
        } else if (day < new Date(2013, 7, 10)) {
            note = "2";
        } else if (day < new Date(2013, 7, 15)) {
            note = "3";
        } else {
            workStatus = 'on_work';
            note = "4";
        }
        var lastStatus = WorkStatusHelper.getInfoAboutStatus(selectedNode, day, workStatus).last_status;
        equal(lastStatus.reason, "1405", "«" + node + "» has valid last status reason");
        equal(lastStatus.note, note, "«" + node + "» has valid last status note (" + note + ") on day " + day);
    });
    


    // TODO: test other combinations
});



test("status info - order level", function() {
    var node, selectedNode,
        workStatus = "on_hold";

    node = "544.2.1/Монтаж/1403";
    selectedNode = selectNode(this.dataset, node)[0];
    deepEqual(
        WorkStatusHelper.getInfoAboutStatus(selectedNode, d3.time.day(new Date(2013, 6, 23)), workStatus),
        { inside: 1 },
        "«" + node + "» has valid last status"
    );
    deepEqual(
        WorkStatusHelper.getInfoAboutStatus(selectedNode, d3.time.day(new Date(2013, 6, 27)), workStatus),
        { inside: 2 },
        "«" + node + "» has valid last status"
    );
});
*/

//
// NO DATA STATUS }}}



});
