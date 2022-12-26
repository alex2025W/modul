define([
    'underscore',
    'd3',
    'global',
], function(_, d3, G) {

    var WorkStatusHelper = {
        settings: {
            "on_work_with_reject": {
                y: G.config.timelineFactHeight * (0.2),
                selector: "work_with_reject"
                // label: "&#xf00d" // fa-times
            },
            "on_hold": {
                y: G.config.timelineFactHeight * (0.6),
                selector: "holds"
                // label: "&#xf00d" // fa-times
            },
            "on_pause": {
                y: G.config.timelineFactHeight * (0.4),
                selector: "pauses"
                // label: "&#xf04c" // fa-pause
            },
            "no_data": {
                y: G.config.timelineFactHeight * (0.2),
                selector: "nodata"
                // label: "&#xf128" // fa-question
            }
        },

        // look up status inside node children
        hasStatus: function(root, workStatus) {
            if(root.cache_has_status && root.cache_has_status[workStatus])
                return root.cache_has_status[workStatus];
            if(!root.cache_has_status)
                root.cache_has_status = {};
            if (workStatus === 'no_data') {
                root.cache_has_status[workStatus] = this.hasStatusNoData(root);
                return root.cache_has_status[workStatus];
            } else {
                root.cache_has_status[workStatus] = _.any(
                    G.utils.treeToNodes(root),
                    function(node) {
                        // flatten status_log to get rid of phantom statuses
                        // overwrited by new statuses on the same date (issue #277)
                        //
                        var statusByDate = {};
                        _.forEach(node.status_log || [], function(logEntry) {
                            statusByDate[logEntry.date] = logEntry.status;
                        });
                        return _.any(statusByDate, function(logStatus) { return logStatus === workStatus; });
                    }
                );
                return root.cache_has_status[workStatus];
            }
        }, // hasStatus


        getTodayOffsetBy10am: function(offset) {
            var now = new Date();
            return d3.time.day.offset(d3.time.day(now), now.getHours() < 10 ? offset-1 : offset);
        }, // getTodayOffsetBy10am


        hasStatusNoData: function hasStatusNoData(root) {
            var today =  this.getTodayOffsetBy10am(0),
                yesterday =  this.getTodayOffsetBy10am(-1),
                tomorrow =  this.getTodayOffsetBy10am(1),
                recurse = function(node) {

                    //---------
                    // iss_1044 (нет данных не проверяется у работ с флагом no_need_facts)
                    // iss_1180 (отклонения начинаются на следующий день после наступления финиша)
                    if (node.node_type == "work" && node.no_need_facts &&
                        ((node.status_log && _.last(node.status_log).status == 'completed')  || (node.dateRange && node.dateRange.plan && today <= node.dateRange.plan.finish)))
                        return false;
                    //--------

                    // 1. Работа не выполнена и имеет статус «в работе»
                    // или пустой статус (не «простой» и не «пауза» и не "работа с отклонением")
                    if (node.done || (node.status_log && _.last(node.status_log).status !== 'on_work' && _.last(node.status_log).status !== 'on_work_with_reject' )) {
                        return false;
                    }

                    // #1624
                    // Если последний статус - работа с отклонением, и прошло уже больше 1 дня
                    // с момента данного статуса, то данный статус начинаем обрабтаывать как
                    // обычную работу, т.е начинает генериться  - нет данных
                    if (node.status_log && _.last(node.status_log).status == 'on_work_with_reject' && yesterday <= new Date(_.last(node.status_log).date) ) {
                        return false;
                    }

                    // 2. По плану, с учётом переносов, работы уже начались
                    if (node.dateRange) {
                        if (!node.dateRange.plan || today <= node.dateRange.plan.start) {
                            return false;
                        }
                    } else if (node.node_type === "work") {
                        // В случае если dateRange ещё не определены то проверяем
                        // плановые даты только у самих работ
                        if (!node.plan || today <= G.utils.dayStringToDate(node.plan.start)) {
                            return false;
                        }
                    }
                    // go down to the work level
                    if (node.node_type !== "work") {
                        return _.any(node.nodes, recurse);
                    } else {
                        // 3. Не указаны факты за вчерашнюю дату (новый день наступает в 10 утра)
                        // определяем дату факта вручную, т.к. селекторы вызываются ещё до того
                        // как известны dateRange
                        //
                        if (node.dateRange) {
                            // if dateRange already calculated, check date from dateRange
                            //
                            if (node.dateRange.fact && node.dateRange.fact.finish >= yesterday) {
                                return false;
                            }
                        } else if (node.nodes) {
                            // else get last fact date from raw data
                            //
                            var finishDate = node.nodes.reduce(function(date, node) {
                                var factDate = G.utils.dayStringToDate(node.fact.date);
                                if (!date || date < factDate) {
                                    date = factDate;
                                }
                                return date;
                            }, null);
                            if (finishDate >= yesterday) {
                                return false;
                            }
                        }
                        // 4. Если у работы не было фактов по причине пауз/простоев,
                        // то начинаем отсчёт "нет данных" со дня возобновления статуса
                        // "on_work" или "on_work_with_reject"
                        // добавлено 2015-05-22
                        if (node.status_log) {
                            var lastStatus = _.last(node.status_log);
                            if ((lastStatus.status === 'on_work' || lastStatus.status === 'on_work_with_reject') &&
                                d3.time.day(new Date(lastStatus.date)) >= yesterday) {
                                return false;
                            }
                        }
                    }
                    return true;
                };
            return recurse(root);
        }, // hasStatusNoData


        // returns array of dates when given <root> has <status>
        getDaysWithStatus: function(root, workStatus) {
            //return [];
            /*if(root.day_statuses && root.day_statuses[workStatus])
                return root.day_statuses[workStatus];
            if(!root.day_statuses)
                root.day_statuses = {}; */
            if (workStatus === 'no_data') {
                return this.getDaysWithStatusNoData(root);
                /*var st = this.getDaysWithStatusNoData(root);
                root.day_statuses[workStatus] = st;
                return st; */
            }
            var tomorrow = d3.time.day.offset(d3.time.day(new Date()), 1),
                daysWithStatus = [],
                getDays = function(statusLog) {
                    var statusIsActive = false,
                        statusStart;
                    var days = [];
                    if(workStatus=='on_work_with_reject') {
                        statusLog.forEach(function(entry) {
                            if (entry.status === workStatus) {
                                statusIsActive = true;
                                days.push(G.utils.dayStringToDate(entry.date));
                            }
                        });
                    }
                    else {
                        statusLog.forEach(function(entry) {
                            if (statusIsActive === false) {
                                if (entry.status === workStatus) {
                                    statusIsActive = true;
                                    statusStart = G.utils.dayStringToDate(entry.date);
                                }
                            } else if(entry.status !== workStatus){
                                statusIsActive = false;
                                days = days.concat(d3.time.days(statusStart, G.utils.dayStringToDate(entry.date)));
                                statusStart = null;
                            }
                        });
                    }
                    if (statusStart) {
                        // if status is "open" then finish date is tomorrow
                        // #1624
                        // Если работа выполнялась с отклоненеим, то даты пробиваем не до конца,
                        // а только на один день вперед
                        if(workStatus!='on_work_with_reject')
                          days = days.concat(d3.time.days(statusStart, tomorrow));
                        else
                          days = days.concat(d3.time.days(statusStart, d3.time.day.offset(d3.time.day(statusStart), 1)));
                    }

                    return days;
                };

            if (root.status_log) {
                daysWithStatus = getDays(root.status_log);
            } else {
                var hashOfDays = {};
                G.utils.treeToNodes(root).slice(1).forEach(function(node) {
                    if (node.status_log) {
                        getDays(node.status_log).forEach(function(day) { hashOfDays[+day] = day; });
                    }
                });
                daysWithStatus = _.keys(hashOfDays).sort().map(function(key) { return hashOfDays[key]; });
            }
            //root.day_statuses[workStatus] = daysWithStatus;
            return daysWithStatus;
        }, // getDaysWithStatus


        getDaysWithStatusNoData: function(root) {
            if(root.cache_dayswithstatusnodata)
                return root.cache_dayswithstatusnodata;
            var self = this,
                today = this.getTodayOffsetBy10am(0),
                noDataFrom;
            if (this.hasStatusNoData(root)) {
                noDataFrom = (function recurse(node) {
                    if (self.hasStatusNoData(node)) {
                        if (node.node_type !== "work") {
                            return _.min(_.map(node.nodes, recurse));
                        } else {
                            return d3.max([
                                node.dateRange.plan && node.dateRange.plan.start,
                                node.dateRange.fact && d3.time.day.offset(node.dateRange.fact.finish, 1),
                                node.status_log && (_.last(node.status_log).status === 'on_work' || _.last(node.status_log).status === 'on_work_with_reject') && d3.time.day(new Date(_.last(node.status_log).date))
                                ]);
                        }
                    }
                })(root);
            }
            root.cache_dayswithstatusnodata = d3.time.days(noDataFrom, today);
            return root.cache_dayswithstatusnodata
        }, // getDaysWithStatusNoData

        // → undefined, если нет статуса в эту дату
        // → { last_status: status_log_entry }
        // → { inside: <int> }, для суммарных статусов
        //
        getInfoAboutStatus: function(d, dateOrTimestamp, workStatus) {
            if (!dateOrTimestamp) { return; }
            var self = this,
                dateTimestamp = +dateOrTimestamp;
            if (workStatus === 'no_data') {
                return this.getInfoAboutStatusNoData(d, dateTimestamp);
            } else if (d.status_log) {
                // Сначала получаем последний статус с датой меньше либо равной указанной
                // если этот статус равен искомому, то возвращаем его, иначе void 0;
                var lastStatusOnDate = this.getLastStatusOnDate(d, dateTimestamp);
                if (lastStatusOnDate && lastStatusOnDate.status === workStatus) {
                    return { last_status: lastStatusOnDate };
                } else {
                    return void 0;
                }
            } else {
                // init cache
                // TODO: похоже, этот кеш надо обнулять если были применены фильтры
                if (!d._info_about_statuses_inside) { d._info_about_statuses_inside = {}; }
                if (!d._info_about_statuses_inside[dateTimestamp]) { d._info_about_statuses_inside[dateTimestamp] = {}; }
                if (!d._info_about_statuses_inside[dateTimestamp][workStatus]) {
                    d._info_about_statuses_inside[dateTimestamp][workStatus] = self.calculateStatusesInside(d, dateTimestamp, workStatus);
                }
                var statusesInside = d._info_about_statuses_inside[dateTimestamp][workStatus];
                if (statusesInside) {
                    return { inside: statusesInside };
                } else {
                    return void 0;
                }
            }
        }, // getInfoAboutStatus


        // → undefinded, если нет статуса в эту дату
        // → { inside: <int>, from_date: <date> }
        // → { from_date: <date> }
        getInfoAboutStatusNoData: function(d, dateOrTimestamp) {
            var self = this,
                dateTimestamp = +dateOrTimestamp,
                worksWithoutData = [],
                fromDate,
                result,
                collectWorksWithNoData = function(node) {
                    if (node.node_type !== 'work') {
                        _.forEach(node.nodes, collectWorksWithNoData);
                    } else {
                        var daysWithNoData = self.getDaysWithStatusNoData(node);
                        fromDate = d3.min(daysWithNoData.concat(fromDate));
                        if (_.any(daysWithNoData, function(d) { return +d === dateTimestamp; })) {
                            worksWithoutData.push(node);
                        }
                    }
                };
            collectWorksWithNoData(d);

            if (worksWithoutData.length) {
                result = { from_date: fromDate };
                if (d.node_type !== 'work') {
                    result.inside = worksWithoutData.length;
                }
            }
            return result;
        }, // getInfoAboutStatusNoData


        // Возвращает сумму простоев на уровне работ в указанную дату
        //
        calculateStatusesInside: function(d, dateTimestamp, workStatus) {
            var self = this, inside = 0;
            if (d.status_log) {
                inside = _.any(self.getDaysWithStatus(d, workStatus), function(d) { return +d === dateTimestamp; }) ? 1 : 0;
            } else if (d.nodes) {
                inside = d.nodes.reduce(function(count, node) {
                    return count + self.calculateStatusesInside(node, dateTimestamp, workStatus);
                }, 0);
            }
            return inside;
        }, // calculateStatusesInside


        calculateWorksWithStatus: function(node, workStatus) {
            var self = this,
                result = 0;
            if (this.hasStatus(node, workStatus)) {
                if (node.node_type === "work") {
                    result = this.hasStatus(node, workStatus) ? 1 : 0;
                } else {
                    result = _.reduce(node.nodes, function(count, n) {
                        return count + self.calculateWorksWithStatus(n, workStatus);
                    }, 0);
                }
            }
            return result;
        }, // calculateWorksWithStatus

        getWorksWithStatus:function(node, workStatus){
            var self = this,
                result = [];
            if (this.hasStatus(node, workStatus)) {
                if (node.node_type === "work") {
                    result = _.reduce(G.utils.treeToNodes(node),function(prev,nd){
                        _.forEach(nd.status_log || [],function(logEntry){
                            if(logEntry.status==workStatus){
                                prev.push(logEntry);
                            }
                        });
                        return prev;
                    },result);
                } else {
                    result = _.reduce(node.nodes, function(prev, n) {
                        return prev.concat(self.getWorksWithStatus(n, workStatus));
                    }, []);
                }
            }
            return result;
        }, // getWorksWithStatus


        drawStatuses: function(statusesContainer, transitionOrNot, workStatus) {
            var datum = statusesContainer.datum(),
                selector = this.settings[workStatus].selector,
                container = statusesContainer.selectAll('.' + selector).data([datum]);

            if (G.appView.viewMenuItemsCollection.isVisible('statuses') &&
                this.hasStatus(datum, workStatus)) {
                // ENTER
                //
                container.enter().append('g')
                    .attr('class', selector)
                    .style('opacity', 1e-6)
                    .attr('transform', 'translate(0, ' + (G.config.timelinePlanHeight + G.config.timelinePadding) + ')');

                // UPDATE
                //
                transitionOrNot(container
                    .call(function(statusesContainer, self) {
                        var days = self.getDaysWithStatus(statusesContainer.datum(), workStatus);
                        self.d3_drawLines(statusesContainer, self, days, transitionOrNot, workStatus);
                        self.d3_drawBadges(statusesContainer, self, days, transitionOrNot, workStatus);
                    }, this))
                    .style('opacity', void 0);
            } else {
                // EXIT
                //
                transitionOrNot(container)
                    .style('opacity', 1e-6)
                    .remove();
            }
        }, // drawStatuses


        d3_drawLines: function(statusesContainer, self, days, transitionOrNot, workStatus) {
            var x = function(d) { return G.timeScale(d) + G.utils.daysToPixels(1) / 2; },
                ranges = [],
                rangeStart = days[0], rangeFinish,
                dayCounter = days[0];
            days.forEach(function(day) {
                if (+dayCounter !== +day) {
                    ranges.push([rangeStart, rangeFinish]);
                    rangeStart = dayCounter = day;
                }
                rangeFinish = day;
                dayCounter = d3.time.day.offset(dayCounter, 1);
            });
            ranges.push([rangeStart, rangeFinish]);

            var line = statusesContainer.selectAll('.line').data(ranges);
            line.enter().append('line')
                .attr('class', 'line');

            transitionOrNot(line)
                .attr('y1', self.settings[workStatus].y)
                .attr('y2', self.settings[workStatus].y)
                .attr('x1', function(d) { return x(d[0]); })
                .attr('x2', function(d) { return x(d[1]); });

            // exit called then searching or filtering
            transitionOrNot(line.exit())
                .style('opacity', 1e-6)
                .remove();
        }, // d3_drawLines

        d3_drawBadges: function(statusesContainer, self, days, transitionOrNot, workStatus) {
            var radius = 2.5,
                translate = function(d) {
                    return 'translate(' +
                            (G.timeScale(d) + G.utils.daysToPixels(1) / 2) + ', ' +
                            self.settings[workStatus].y +
                            ')';
                };

            var badge = statusesContainer.selectAll('.badge').data(days, function(day) { return +day; });
            badge.enter().append('circle')
                .attr('class', 'badge')
                .classed('key', function(d) { return self.isKeyStatusOnDate(statusesContainer.datum(), workStatus, d); })
                .style('opacity', 1e-6)
                .attr('data-timestamp', function(d) { return +d; })
                .attr('r', radius)
                .attr('transform', translate);

            transitionOrNot(badge)
                .style('opacity', void 0)
                .attr('transform', translate);

            // exit called then searching or filtering
            transitionOrNot(badge.exit())
                .style('opacity', 1e-6)
                .remove();
        }, // d3_drawBadges


        isKeyStatusOnDate: function(datum, workStatus, date) {
            return _.any(datum.status_log, function(entry) {
                return entry.status === workStatus && +G.utils.dayStringToDate(entry.date) === +date;
            });
        }, // isKeyStatus

        getLastStatusOnDate: function(datum, dateTimestamp) {
            var lastStatus;
            _.forEach(datum.status_log, function(logEntry) {
                if (+G.utils.dayStringToDate(logEntry.date) <= dateTimestamp) {
                    lastStatus = logEntry;
                } else {
                    return false;
                }
            });
            return lastStatus;
        },

        dummy: null

    }; // WorkStatusHelper

    return WorkStatusHelper;
});
