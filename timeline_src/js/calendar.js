define([
    'jquery',
    'd3',
    'global',
    'google.client'
], function($, d3, G) {

    var apiKey = 'AIzaSyBYBwWQrtWKjTp-ZAvBQgmyf3RY4ok1nvE'; // gapps@modul.org API

    var Calendar = {
        init: function() {

        }
    };


    var Calendar_old = {

        init: function() {
            // load all holidays whitin the year ago and year in future;
            //
            var today = d3.time.day(new Date());
            var yearAgo = d3.time.day.offset(today, -365);
            var yearAfter = d3.time.day.offset(today, 365);
            this.loadHolidays(yearAgo, yearAfter);

        }, // init

        workdayDiff: function(d1, d2) {
            var tmp, diff;
            if (d1 > d2) {
                tmp = d1; d1 = d2; d2 = tmp;
            }
            var workdays = this.workdayRange(d1, d2);
            if (workdays.length) {
                diff = workdays.length - 1;
                return tmp ? -diff : diff;
            }
            return 0;
        }, // workdayDiff

        workdayRange: function(d1, d2) {
            d1 = this.day(d1); d2 = this.day(d2);
            return _.difference(
                this.range(d1, d2).map(function(d) { return +d; }),
                this.holidaysRange(d1, d2).map(function(d) { return +d; })
            ).map(function(d) { return new Date(d); });
        }, // workdayRange

        holidaysRange: function(d1, d2) {
            d1 = this.day(d1); d2 = this.day(d2);
            return this.holidays.filter(function(holiday) {
                return d1 <= holiday && holiday <= d2;
            });
        }, // holidaysRange

        loadHolidays: function(d1, d2) {
            var self = this;
            gapi.client.load('calendar', 'v3', function() {
                var request = gapi.client.calendar.events.list({
                    'calendarId': 'dp6i450r3mdrs3fsmgb8fkqofc@group.calendar.google.com',
                    'singleEvents': true,
                    'orderBy': 'startTime',
                    'fields': 'items(description,summary,start,end)',
                    'timeMin': d1.toISOString(),
                    'timeMax': d2.toISOString()
                });
                request.execute(function(resp) {
                    self.holidays = [];
                    for (var i = 0; i < resp.items.length; i++) {
                        var item = resp.items[i];
                        var range = d3.time.day.range(
                            d3.time.day(new Date(item.start.date)),
                            d3.time.day(new Date(item.end.date))
                            );
                        self.holidays = self.holidays.concat(range);
                    }
                    G.events.trigger("loaded:calendar");
                });
            });
        }, // loadHolidays

        day: function(d) {
            return d3.time.day(d);
        },

        range: function(t0, t1) {
            var time = d3.time.day(t0), times = [];
            while (time <= t1) {
                times.push(new Date(+time));
                time.setDate(time.getDate() + 1);
            }
            return times;
        }, // range

        dummy:{}

    }; // Calendar

    // load google client.js
    //
    (function initClientLibrary(tries) {
        if (gapi.client) {
            gapi.client.setApiKey(apiKey);
            Calendar.init();
        } else if (tries) {
            setTimeout(function() { initClientLibrary(tries-1); }, 100);
        } else {
            console.warn("Can‘t load Google Client Library");
        }
    })( 10 );

    return Calendar;
});
