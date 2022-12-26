(function () {
    require.config({
        baseUrl: "../js",
        paths: {
            "jquery": 'libs/jquery-2.0.0',
            "jquery.jsonp": 'libs/jquery.jsonp-2.4.0',
            "jquery.hoverIntent": 'libs/jquery.hoverIntent',
            "jquery.csv": 'libs/jquery.csv',
            "underscore": 'libs/lodash', // mimic lodash to underscore
            "backbone": 'libs/backbone',
            "d3": 'libs/d3.v3',
            "d3.lambdas": 'libs/d3.lambdas',
            "ga": "../tests/dummy",
            "fixture": "../tests/fixture"
        },
        shim: {
            "jquery.jsonp": [ "jquery" ],
            "jquery.hoverIntent": [ "jquery" ],
            "jquery.csv": [ "jquery" ],
            "underscore": { exports: '_' },
            "backbone": { deps: ["underscore", "jquery"], exports: "Backbone" },
            "d3": { exports: 'd3' },
            "d3.lambdas": [ 'd3' ]
        }
    });

    // A list of all QUnit test Modules.  Make sure you include the `.js` 
    // extension so RequireJS resolves them as relative paths rather than using
    // the `baseUrl` value supplied above.
    var testModules = [
        "dataset.js",
        "datamining.js",
        "work_status.js"
    ];

    // Resolve all testModules and then start the Test Runner.
    require(testModules, QUnit.start);
}());
