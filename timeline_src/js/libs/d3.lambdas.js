define([
    'd3'
], function(d3) {
    d3.ƒ = function(name) {
        var f, params = Array.prototype.slice.call(arguments, 1);
        return function(d) {
            f = d[name];
            return typeof(f)==='function' ? f.apply(d, params) : f;
        };
    };

    d3.D = function(d) { return d; };
    d3.I = function(d, i) { return i; };
});
