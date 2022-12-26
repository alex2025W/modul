define(['dataset', 'global', 'calendar'], function (Dataset, G, Calendar) {

module('Calendar', {
    setup: function() {
        if (!Calendar.holidays) {
            stop();
            G.events.on('loaded:calendar', function() {
                start();
            });
        }
    }, 
    teardown: function() {
    }
});

test("holiday range is works", function() {
    var d1, d2;
    // return nothing for workdays
    //
    d1 = new Date('2013-10-14 11:22:33');
    d2 = new Date('2013-10-18 12:34:45');
    equal(Calendar.holidaysRange(d1, d2).length, 0, "returns nothing for weekdays");

    // return weekends
    //
    d1 = new Date('2013-10-14 11:22:33');
    d2 = new Date('2013-10-25 12:34:45');
    equal(Calendar.holidaysRange(d1, d2).length, 2, "returns only two weekends");

    // return holidays
    //
    d1 = new Date('2013-12-31 11:22:33');
    d2 = new Date('2014-01-10 12:34:45');
    equal(Calendar.holidaysRange(d1, d2).length, 9, "returns only holidays");

    // return exactly
    //
    d1 = new Date('2014-01-01 11:22:33');
    d2 = new Date('2014-01-02 12:34:45');
    equal(Calendar.holidaysRange(d1, d1).length, 1, "returns one holiday");
    equal(Calendar.holidaysRange(d1, d2).length, 2, "returns two holidays");
});

test("workday range returns one common week", function() {
    var workdays, d1, d2;
    // exactly
    // 
    d1 = new Date('2013-10-14 11:22:33');
    d2 = new Date('2013-10-18 12:34:45');
    workdays = Calendar.workdayRange(d1, d2);
    equal(workdays.length, 5, "week has a 5 workdays");

    // with weekends
    // 
    d1 = new Date('2013-10-14 11:22:33');
    d2 = new Date('2013-10-20 12:34:45');
    workdays = Calendar.workdayRange(d1, d2);
    equal(workdays.length, 5, "week has a 5 workdays");
    equal(workdays[0].getDate(), 14, 'monday is 14th');
    equal(workdays[4].getDate(), 18, 'friday is 18th');
});

test("workday diff trivial", function() {
    var d1, d2;
    d1 = new Date('2013-10-14 11:22:33');
    d2 = new Date('2013-10-14 12:34:45');
    equal(Calendar.workdayDiff(d1, d2), 0, "returns 0 for equal dates");

    d1 = new Date('2013-10-14 11:22:33');
    d2 = new Date('2013-10-15 12:34:45');
    equal(Calendar.workdayDiff(d1, d2), 1, "workday diff returns 1 for nearest workdays");
});

test("workday diff weekends", function() {
    var d1, d2;
    d1 = new Date('2013-10-18 11:22:33');
    d2 = new Date('2013-10-19 12:34:45');
    equal(Calendar.workdayDiff(d1, d2), 0, "18 !19 → 0");

    d1 = new Date('2013-10-18 11:22:33');
    d2 = new Date('2013-10-20 12:34:45');
    equal(Calendar.workdayDiff(d1, d2), 0, "18 !19 !20 → 0");

    d1 = new Date('2013-10-18 11:22:33');
    d2 = new Date('2013-10-21 12:34:45');
    equal(Calendar.workdayDiff(d1, d2), 1, "18 !19 !20 21 → 1");

    d1 = new Date('2013-10-19 11:22:33');
    d2 = new Date('2013-10-20 12:34:45');
    equal(Calendar.workdayDiff(d1, d2), 0, "!19 !20 → 0");

    d1 = new Date('2013-10-19 11:22:33');
    d2 = new Date('2013-10-21 12:34:45');
    equal(Calendar.workdayDiff(d1, d2), 0, "!19 !20 21 → 0");

    d1 = new Date('2013-10-14 11:22:33');
    d2 = new Date('2013-10-20 12:34:45');
    equal(Calendar.workdayDiff(d1, d2), 4, "14 15 16 17 18 !19 !20 → 4");
});

test("workday diff negative diffs", function() {
    var d1, d2;
    d1 = new Date('2013-10-18 11:22:33');
    d2 = new Date('2013-10-19 12:34:45');
    equal(Calendar.workdayDiff(d2, d1), 0, "18 !19 → 0");

    d1 = new Date('2013-10-18 11:22:33');
    d2 = new Date('2013-10-20 12:34:45');
    equal(Calendar.workdayDiff(d2, d1), 0, "18 !19 !20 → 0");

    d1 = new Date('2013-10-18 11:22:33');
    d2 = new Date('2013-10-21 12:34:45');
    equal(Calendar.workdayDiff(d2, d1), -1, "18 !19 !20 21 → 1");

    d1 = new Date('2013-10-19 11:22:33');
    d2 = new Date('2013-10-20 12:34:45');
    equal(Calendar.workdayDiff(d2, d1), 0, "!19 !20 → 0");

    d1 = new Date('2013-10-19 11:22:33');
    d2 = new Date('2013-10-21 12:34:45');
    equal(Calendar.workdayDiff(d2, d1), 0, "!19 !20 21 → 0");

    d1 = new Date('2013-10-14 11:22:33');
    d2 = new Date('2013-10-20 12:34:45');
    equal(Calendar.workdayDiff(d2, d1), -4, "14 15 16 17 18 !19 !20 → 4");
});


});
