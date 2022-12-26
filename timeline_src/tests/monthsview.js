define(['monthsview', 'global'], function (MonthsView, G) {

module('MonthsView', {
    setup: function() {
        this.view = new MonthsView();
    }, 
    teardown: function() {
        delete this.view;
    }
});

test("get months from domain", function() {
    var self = this;
    var domains = [
        { domain: [ "2012-01-01", "2012-03-31" ], result: [ "2012-01", "2012-02", "2012-03" ] },
        { domain: [ "2012-01-15", "2012-03-15" ], result: [ "2012-01", "2012-02", "2012-03" ] },
        { domain: [ "2012-01-31", "2012-03-01" ], result: [ "2012-01", "2012-02", "2012-03" ] },
        { domain: [ "2012-01-10", "2012-01-20" ], result: [ "2012-01" ] },
        { domain: [ "2012-01-10", "2012-01-10" ], result: [ "2012-01" ] },
        { domain: [ "2011-11-15", "2012-03-15" ], result: [ "2011-11", "2011-12", "2012-01", "2012-02", "2012-03" ] },
        { domain: [ "2012-01-10", "2013-01-10" ], result: [ "2012-01", "2012-02", "2012-03", "2012-04", "2012-05", "2012-06", "2012-07", "2012-08", "2012-09", "2012-10", "2012-11", "2012-12", "2013-01" ] }
    ];

    domains.forEach(function(d) {
        var result = d.result.map(function (r) { return d3.time.day(new Date(r + "-01")); });
        var test = self.view.getVisibleMonths(d.domain.map(function(date) { return new Date(date); }));
        deepEqual(test, result, "months are valid");
    });
}); // get months from domain

});
