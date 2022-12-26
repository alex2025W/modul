define([
    'router', 'global', 'module'
], function(Router, Global, Module) {
    if(Module.config().contracts)
      Global.config.data_url = Global.config.data_url+ '?contracts='+ Module.config().contracts;
    var initialize = function() {
        Router.initialize();
    };
    return {
        initialize: initialize
    };
});
