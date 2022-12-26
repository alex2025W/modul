require.config({
    baseUrl: "static/scripts/suppliers",
    paths: {
        "suppliers": "../suppliers",
        "jquery": "../libs/jquery-2.0.3.min",
        "backbone": "../libs/backbone-1.1.0.min",
        "backbone.validation": "../libs/backbone.validation-0.8.2.min",
        "backbone.syphon": "../libs/backbone.syphon-0.4.1.min",
    
        "underscore": "../libs/underscore-1.5.2.min",

        "jquery.dataTables": "../libs/jquery.dataTables-1.9.4.min",
        "jquery.jgrowl": "../libs/jquery.jgrowl",

        "bootstrap.datepicker": "../libs/bootstrap-datepicker"
    },

    shim: {
        "jquery": { exports: '$' },
        "underscore": { exports: '_' },
        "backbone": { deps: ["underscore", "jquery"], exports: "Backbone" },
        'backbone.validation': { deps: ['backbone'] },
        'backbone.syphon': { deps: ['backbone'] },
        'jquery.dataTables': { deps: ['jquery'] },
        'jquery.jgrowl': { deps: ['jquery'] }
    }
});

require(['suppliers/main']);
