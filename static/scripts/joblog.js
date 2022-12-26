require.config({
    baseUrl: "static/scripts/joblog",
    paths: {
        "joblog": "../joblog",
        //"jquery": "../libs/jquery-2.0.3.min",
        "jquery": "../libs/jquery-1.9.1",
        "backbone": "../libs/backbone-1.1.0.min",
        "backbone.multisort.collection": "../libs/multi-sort.collection",
        "backbone.validation": "../libs/backbone.validation-0.8.2.min",
        "backbone.syphon": "../libs/backbone.syphon-0.4.1.min",
        "underscore": "../libs/underscore-1.5.2.min",
        "jquery.jgrowl": "../libs/jquery.jgrowl",
        'jquery.blockui': '../libs/jquery.blockUI',
        'jquery.numeric': '../libs/jquery.numeric',
        //'bootstrap-modal' : ['extdep/twitter-bootstrap/js/bootstrap-modal']
        "bootstrap.datepicker": "../libs/bootstrap-datepicker-1.3.0",
        "bootstrap.multiselect": "../libs/bootstrap-multiselect",
        "prettify": "../libs/prettify",
        "dateformat": "../libs/dateformat",
        "bootbox": "../libs/bootbox.min",
        "routine":'../routine'
    },

    shim: {
        "jquery": { exports: '$' },
        "underscore": { exports: '_' },
        "backbone": { deps: ["underscore", "jquery"], exports: "Backbone" },
        'backbone.validation': { deps: ['backbone'] },
        'backbone.multisort.collection': { deps: ['backbone'] },
        'backbone.syphon': { deps: ['backbone'] },
        'jquery.jgrowl': { deps: ['jquery'] },
        'jquery.blockui': { deps: ['jquery'] },
        'jquery.numeric': { deps: ['jquery'] },
        'bootstrap.multiselect': { deps: ['jquery'] },
        'bootbox': { deps: ['jquery'], exports: "bootbox" },
    },
    /*'bootstrap-modal': {
        deps: ['jquery'],
        exports: 'jQuery.fn.modal'
    }*/
});


require(['joblog/main']);
