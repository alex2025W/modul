define(['d3', 'dataset'], function (d3, Dataset) {

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
                        { "status": "on_hold", "date": "2013-05-20" },
                        { "status": "on_pause", "date": "2013-05-22" },
                        { "status": "on_hold", "date": "2013-05-27" },
                        { "status": "on_work", "date": "2013-05-30" }
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
                        { "status": "on_hold", "date": "2013-06-01" },
                        { "status": "on_work", "date": "2013-06-04" }
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
                        { "status": "on_pause", "date": "2013-07-19" }
                    ],
                    "nodes": [{
                        "name": "2013-07-18 10:30:51" }]
                },
                {
                    "name": "4 - findme1",
                    "done": false,
                    "status_log": [
                        { "status": "on_hold", "date": "2013-07-21" },
                        { "status": "on_work", "date": "2013-07-24" },
                        { "status": "on_hold", "date": "2013-07-27" }
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
                        { "status": "on_hold", "date": "2013-07-25" }
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
                        { "status": "on_pause", "date": "2013-08-01" }
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
                        { "status": "on_pause", "date": "2013-05-10" },
                        { "status": "on_hold", "date": "2013-05-13" },
                        { "status": "on_pause", "date": "2013-05-15" },
                        { "status": "on_hold", "date": "2013-05-20" },
                        { "status": "on_pause", "date": "2013-05-26" },
                        { "status": "on_work", "date": "2013-05-28" }
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


/*
var iterateAll = function(node, callback) {
    var ch = node.children || node._children || [],
        value, i;

    value = callback(node);
    if (value !== false) {
        for (i = 0; i < ch.length; i++) {
            value = iterateAll(ch[i], callback);
            if (value === false) {
                break;
            }
        }
    }
    return value;
}; // iterateAll

var changeEvent = function(model) {
    var dataset = model.get('dataset');
    model.prepareToDatamining(dataset);
    model.doSearch(dataset);
    model.seemsAsDone(dataset);
    model.doDoneFilter(dataset);
}; // changeEvent


*/

// SEARCH {{{
//
module('DataMining.Search', {
    setup: function() {
        this.model = new Dataset({hierarchy: "Заказы"});
        this.model.set('dataset', JSON.stringify(fixture));
    }, 
    teardown: function() {
		this.model.destroy();
        delete this.model;
    }
});

test("matching node 544.2.1/Монтаж/1403", function() {
    var dataset = JSON.parse(this.model.get('dataset'));
    this.model.searchQuery = '1403';
    this.model.doSearch(dataset);
    equal(selectNode(dataset, '544.2.1/Монтаж/1403')[0]._search_match, 'exact', "exact match node");
});

test("containers of the matching node 544.2.1/Монтаж/1403", function() {
    var dataset = JSON.parse(this.model.get('dataset'));
    this.model.searchQuery = '1403';
    this.model.doSearch(dataset);
    equal(selectNode(dataset, '544.2.1/Монтаж')[0]._search_match, 'contain', "contains matching node");
    equal(selectNode(dataset, '544.2.1')[0]._search_match, 'contain', "contains matching node");
});

test("hide unmatched nodes - findme1", function() {
    var dataset = JSON.parse(this.model.get('dataset'));
    this.model.searchQuery = 'findme1';
    this.model.doSearch(dataset);
    equal(selectNode(dataset, '544.2.1/Цех/1063').length, 0, '544.2.1/Цех/1063 is removed');
    equal(selectNode(dataset, '544.2.1/Цех/960 - findme1').length, 1, '544.2.1/Цех/960 - findme1 is remain');
    equal(selectNode(dataset, '544.2.1/Монтаж/1403/1').length, 0, '544.2.1/Монтаж/1403/1 is removed');
    equal(selectNode(dataset, '544.2.1/Монтаж/1403/4 - findme1').length, 1, '544.2.1/Монтаж/1403/4 - findme1 is remain');
    equal(selectNode(dataset, '744.1.* - findme2').length, 0, '744.1.* - findme2 is removed');
    equal(selectNode(dataset, '799.1.1/Цех').length, 0, '799.1.1/Цех is removed');
    equal(selectNode(dataset, '799.1.1/Монтаж - findme1').length, 1, '799.1.1/Монтаж - findme1 is remain');
});

test("save childrens if a parent match", function() {
    var dataset = JSON.parse(this.model.get('dataset'));
    this.model.searchQuery = 'findme2';
    this.model.doSearch(dataset);
    equal(selectNode(dataset, '744.1.* - findme2/Цех/967/1').length, 1, 'children of the 744.1.* - findme2 remain');
    equal(selectNode(dataset, '744.1.* - findme2/Цех/972/4').length, 1, 'children of the 744.1.* - findme2 remain');
});

/*
 * эти тесты не нужны, т.к. теперь исходный датасет каждый раз клонируется из неизменного источник
test("determenistic search", function() {
    var dataset, findme1results, findme2results;

    dataset = JSON.parse(this.model.get('dataset'));
    this.model.searchQuery = 'findme1';
    this.model.doSearch(dataset);
    findme1results = $.extend(true, {}, dataset);

    dataset = JSON.parse(this.model.get('dataset'));
    this.model.searchQuery = 'findme2';
    this.model.doSearch(dataset);
    findme2results = $.extend(true, {}, dataset);

    dataset = JSON.parse(this.model.get('dataset'));
    this.model.searchQuery = 'findme1';
    this.model.doSearch(dataset);
    deepEqual(dataset, findme1results, 'search is deterministic');
});

test("determenistic search in depth", function() {
    var dataset, findme1results, findme2results;

    dataset = JSON.parse(this.model.get('dataset'));
    this.model.searchQuery = '544.2.1';
    this.model.doSearch(dataset);
    findme1results = $.extend(true, {}, dataset);

    dataset = JSON.parse(this.model.get('dataset'));
    this.model.searchQuery = '1063'; // this is a child of the 544.2.1
    this.model.doSearch(dataset);
    findme2results = $.extend(true, {}, dataset);

    dataset = JSON.parse(this.model.get('dataset'));
    this.model.searchQuery = '544.2.1';
    this.model.doSearch(dataset);
    equal(selectNode(dataset, '544.2.1/Цех/1063').length, 1, 'child 1063 is found');
    equal(selectNode(dataset, '544.2.1/Цех/960 - findme1').length, 1, 'child 960 - findme1 is found');
    equal(selectNode(dataset, '544.2.1/Цех/958').length, 1, 'child 958 is found');
    deepEqual(dataset, findme1results, 'search is deterministic');
});

test('cleanup', function() {
    var dataset = this.model.get('dataset'),
        initialDataset = $.extend(true, {}, dataset);

    this.model.searchQuery = '1403';
    this.model.doSearch(dataset);
    notDeepEqual(dataset, initialDataset, 'dataset is changed by the search');

    this.model.searchQuery = undefined;
    this.model.doSearch(dataset);
    deepEqual(dataset, initialDataset, 'dataset is restored after the search');
});
*/
//
// SEARCH }}}

// SEEMS AS DONE {{{
//
module('DataMining.SeemsAsDone', {
    setup: function() {
        this.model = new Dataset({hierarchy: 'заказы', testing: true});
        this.model.set('dataset', JSON.stringify(fixture));
    }, 
    teardown: function() {
		this.model.destroy();
        delete this.model;
    }
});

test("after the search “seems as done” is recalculated", function () {
    var dataset = JSON.parse(this.model.get('dataset'));
    this.model.calculateDoneStatus(dataset);

    var notDone = selectNode(dataset, '544.2.1')[0].done;
    equal(notDone, false, 'by default 544.2.1 is undone');

    this.model.searchQuery = 'цех';
    this.model.doSearch(dataset);
    this.model.calculateDoneStatus(dataset);

    var done = selectNode(dataset, '544.2.1')[0].done;
    equal(done, true, 'after the search 544.2.1 is done');
}); 
//
// SEEMS AS DONE }}}




// DONE FILTER {{{
//
module('DataMining. Completed filter', {
    setup: function() {
        this.model = new Dataset();
        this.model.set('dataset', JSON.stringify(fixture));

        this.model.searchQuery = void 0;
        this.model.hideCompleted = false;
        this.model.hideCompletedDepth = 'order';

        this.dataset = JSON.parse(this.model.get('dataset'));
    }, 
    teardown: function() {
		this.model.destroy();
        delete this.model;
    }
});

test("completed filter by order level", function () {
    this.model.hideCompleted = true;
    this.model.hideCompletedDepth = 'order';
    this.model.doCompletedFilter(this.dataset);
    equal(selectNode(this.dataset, '544.2.1').length, 1);
    equal(selectNode(this.dataset, '744.1.*').length, 0);
    equal(selectNode(this.dataset, '799.1.1').length, 1);
});

test("completed filter by workorder level", function () {
    this.model.hideCompleted = true;
    this.model.hideCompletedDepth = 'workorder';
    this.model.doCompletedFilter(this.dataset);
    equal(selectNode(this.dataset, '544.2.1/Цех').length, 0);
    equal(selectNode(this.dataset, '544.2.1/Монтаж/1403').length, 1);
    equal(selectNode(this.dataset, '544.2.1/Монтаж/1405').length, 0);

    equal(selectNode(this.dataset, '744.1.*').length, 0);

    equal(selectNode(this.dataset, '799.1.1/Цех').length, 0);
    equal(selectNode(this.dataset, '799.1.1/Монтаж - findme1').length, 1);
});

/*
test("completed filter by work level", function () {
    // TODO: this test is broken because of new hierachy level
    this.model.hideCompleted = true;
    this.model.hideCompletedDepth = 'work';
    this.model.doCompletedFilter(this.dataset);
    equal(selectNode(this.dataset, '544.2.1/Цех').length, 0);
    equal(selectNode(this.dataset, '544.2.1/Монтаж/1403/1').length, 0);
    equal(selectNode(this.dataset, '544.2.1/Монтаж/1403/4 - findme1').length, 1);
    equal(selectNode(this.dataset, '544.2.1/Монтаж/1403/5').length, 1);
    equal(selectNode(this.dataset, '544.2.1/Монтаж/1405').length, 0);

    equal(selectNode(this.dataset, '744.1.*').length, 0);

    equal(selectNode(this.dataset, '799.1.1/Цех').length, 0);
    equal(selectNode(this.dataset, '799.1.1/Монтаж - findme1').length, 1);
});
*/


// test("done filter doesn’t conflicts with search", function () {
//     var dataset = this.model.get('dataset'); 
//     // initial run
//     //
//     this.model.hideCompleted = true;
//     this.changeEvent();

//     // run with search
//     this.model.searchQuery = '799.1.1';
//     this.changeEvent();

//     equal(dataset.children.length, 1, 'search successful');
// }); 

//
// DONE FILTER }}}

/*
// ALL TOGETHER {{{
//
var makeFixture = function(query, filter) {
    var model = new Dataset({hierarchy: 'заказы', testing: true}),
        dataset;
    model.set('dataset', $.extend(true, {}, fixture));
    dataset = model.get('dataset');

    model.searchQuery = query || undefined;
    model.hideCompleted = filter;

    model.prepareToDatamining(dataset);
    model.doSearch(dataset);
    model.seemsAsDone(dataset);
    model.doDoneFilter(dataset);

    return $.extend(true, {}, dataset);
}; // makeFixture


module('DataMining. All together', {
    setup: function() {
        var model = this.model = new Dataset({hierarchy: 'заказы', testing: true});
        this.model.set('dataset', $.extend(true, {}, fixture));
        this.model.searchQuery = undefined;
        this.model.hideCompleted = false;
        this.changeEvent = function() { changeEvent(model); };
        this.query1 = 'findme1';
        this.query2 = 'findme2';
        this.fixture_0 = makeFixture('', false);
        this.fixture_S1 = makeFixture(this.query1, false);
        this.fixture_S2 = makeFixture(this.query2, false);
        this.fixture_f = makeFixture('', true);
        this.fixture_S1f = makeFixture(this.query1, true);
        this.fixture_S2f = makeFixture(this.query2, true);
    }, 
    teardown: function() {
		this.model.destroy();
        delete this.model;
    }
});

test("fixtures are ok", function () {
    var dataset;
    // fixture 0
    this.model.set('dataset', $.extend(true, {}, fixture));
    dataset = this.model.get('dataset');
    this.model.prepareToDatamining(dataset);
    this.model.seemsAsDone(dataset);
    deepEqual(dataset, this.fixture_0, 'fixture 0 is ok');

    // fixture S1
    this.model.searchQuery = this.query1;
    this.model.set('dataset', $.extend(true, {}, fixture));
    dataset = this.model.get('dataset');
    this.model.prepareToDatamining(dataset);
    this.model.doSearch(dataset);
    this.model.seemsAsDone(dataset);
    deepEqual(dataset, this.fixture_S1, 'fixture S1 is ok');

    // fixture S2
    this.model.searchQuery = this.query2;
    this.model.set('dataset', $.extend(true, {}, fixture));
    dataset = this.model.get('dataset');
    this.model.prepareToDatamining(dataset);
    this.model.doSearch(dataset);
    this.model.seemsAsDone(dataset);
    deepEqual(dataset, this.fixture_S2, 'fixture S2 is ok');

    // fixture f
    this.model.searchQuery = undefined;
    this.model.hideCompleted = true;
    this.model.set('dataset', $.extend(true, {}, fixture));
    dataset = this.model.get('dataset');
    this.model.prepareToDatamining(dataset);
    this.model.seemsAsDone(dataset);
    this.model.doDoneFilter(dataset);
    deepEqual(dataset, this.fixture_f, 'fixture f is ok');

    // fixture S1f
    this.model.searchQuery = this.query1;
    this.model.hideCompleted = true;
    this.model.set('dataset', $.extend(true, {}, fixture));
    dataset = this.model.get('dataset');
    this.model.prepareToDatamining(dataset);
    this.model.doSearch(dataset);
    this.model.seemsAsDone(dataset);
    this.model.doDoneFilter(dataset);
    deepEqual(dataset, this.fixture_S1f, 'fixture S1f is ok');

    // fixture S2f
    this.model.searchQuery = this.query2;
    this.model.hideCompleted = true;
    this.model.set('dataset', $.extend(true, {}, fixture));
    dataset = this.model.get('dataset');
    this.model.prepareToDatamining(dataset);
    this.model.doSearch(dataset);
    this.model.seemsAsDone(dataset);
    this.model.doDoneFilter(dataset);
    deepEqual(dataset, this.fixture_S2f, 'fixture S2f is ok');
}); // fixtures are ok

// test mixes
//
[
    "0 → s1f → s2f → f → 0",
    "0 → f → 0 → s1 → 0",
    "0 → f → 0 → s1 → s2 → 0",
    "f → s1f → s2f → f",
    "f → s1f → s1 → 0 → s2 → s2f"
].forEach(function(mix) {
    test(mix, function() { testMixer(mix, this); });
});

var testMixer = function(tests, self) {
    var dataset = self.model.get('dataset');
    tests = tests.split(' → ');
    for (var i = 0; i < tests.length; i++) {
        switch (tests[i]) {
            case '0':
                self.model.searchQuery = "";
                self.model.hideCompleted = false;
                break;
            case 'f':
                self.model.searchQuery = "";
                self.model.hideCompleted = true;
                break;
            case 's1':
                self.model.searchQuery = self.query1;
                self.model.hideCompleted = false;
                break;
            case 's2':
                self.model.searchQuery = self.query1;
                self.model.hideCompleted = false;
                break;
            case 's1f':
                self.model.searchQuery = self.query1;
                self.model.hideCompleted = true;
                break;
            case 's2f':
                self.model.searchQuery = self.query2;
                self.model.hideCompleted = true;
                break;
        }
        self.changeEvent();
        clearDeepEqual(dataset, self['fixture_' + tests[i]], 'fixture ' + tests[i] + ' is ok');
    }
}; // testMixer

var clearDeepEqual = function(a, b, msg) {
    deepEqual(_cleanup($.extend(true, {}, a)), _cleanup($.extend(true, {}, b)), msg);
};
var _cleanup = function(node) {
    if (node.children) node.children.forEach(_cleanup);
    if (node._children) node.children.forEach(_cleanup);
    if (node._beforeDatamining) node.children.forEach(_cleanup);
    delete node._beforeDatamining;
};

//
// ALL TOGETHER }}}

// ROOT NODE {{{
//
module('DataMining. Root node', {
    setup: function() {
        var model = this.model = new Dataset({hierarchy: 'заказы', testing: true});
        this.model.set('dataset', $.extend(true, {}, fixture));
        this.model.searchQuery = undefined;
        this.model.hideCompleted = false;
        this.changeEvent = function() { changeEvent(model); };
    }, 
    teardown: function() {
		this.model.destroy();
        delete this.model;
    }
});

test('search → toggle → search', function() {
    var dataset = this.model.get('dataset');
    // search
    this.model.searchQuery = 'findme1';
    this.changeEvent();
     
    // toggle root node
    dataset._children = dataset.children;
    delete dataset.children;

    // search
    this.model.searchQuery = 'findme2';
    this.changeEvent();
    equal(dataset._children, undefined, 'folded childrens are removed');
    equal(!!dataset.children, true, 'node is unfolded');
    equal(dataset.children.length, 1, 'search is valid');
});

test('search → toggle → clear', function() {
    var dataset = this.model.get('dataset');
    // search
    this.model.searchQuery = 'findme1';
    this.changeEvent();
     
    // toggle root node
    dataset._children = dataset.children;
    delete dataset.children;

    // clear
    this.model.searchQuery = '';
    this.changeEvent();
    equal(dataset._children, undefined, 'folded childrens are removed');
    equal(!!dataset.children, true, 'node is unfolded');
    equal(dataset.children.length, 3, 'search is cleared');
});

test('filter → toggle → search', function() {
    var dataset = this.model.get('dataset');
    // filter
    this.model.hideCompleted = true;
    this.changeEvent();
     
    // toggle root node
    dataset._children = dataset.children;
    delete dataset.children;

    // search
    this.model.searchQuery = 'findme2';
    this.changeEvent();
    equal(dataset._children, undefined, 'folded childrens are removed');
    equal(!!dataset.children, true, 'node is unfolded');
    equal(dataset.children.length, 0, 'search and filter is ok');
});

test('filter → toggle → filter', function() {
    var dataset = this.model.get('dataset');
    // filter
    this.model.hideCompleted = true;
    this.changeEvent();
     
    // toggle root node
    dataset._children = dataset.children;
    delete dataset.children;

    // filter
    this.model.hideCompleted = false;
    this.changeEvent();
    equal(dataset._children, undefined, 'folded childrens are removed');
    equal(!!dataset.children, true, 'node is unfolded');
    equal(dataset.children.length, 3, 'filter is ok');
});
//
// ROOT NODE }}}
*/

});
