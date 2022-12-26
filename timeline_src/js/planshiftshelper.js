define([
    'underscore'
], function(_) {
    var PlanShiftsHelper = {
        hasPlanShifts: function(d) {
            return d.plan_shifts || (
                d.dateRange.plan_before_last_shift &&
                ( +d.dateRange.plan_before_last_shift.start !== +d.dateRange.plan.start || 
                 +d.dateRange.plan_before_last_shift.finish !== +d.dateRange.plan.finish )
            );
        }, // hasPlanShifts

        getLastShiftInWork: function(work) {
            return _.last(work.plan_shifts);
        }, // getLastShiftInWork

        dummy: void 0
    }; // PlanShiftsHelper

    return PlanShiftsHelper;
});
