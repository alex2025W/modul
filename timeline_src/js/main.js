require.config({
  paths: {
    "jquery": 'libs/jquery-2.0.0',
    "jgrowl": 'libs/jquery.jgrowl',
    "jquery.jsonp": 'libs/jquery.jsonp-2.4.0',
    "jquery.hoverIntent": 'libs/jquery.hoverIntent',
    "jquery.csv": 'libs/jquery.csv',
    "bootstrap": "libs/bootstrap",
    "bootstrap_select": "libs/bootstrap-select",
    "bootstrap_select_i18n": "libs/bootstrap-select-i18n-ru_RU",
    "bootstrap_contextmenu": "libs/bootstrap-contextmenu",
    "underscore": 'libs/lodash', // mimic lodash to underscore
    "backbone": 'libs/backbone',
    "d3": 'libs/d3.v3',
    "d3.lambdas": 'libs/d3.lambdas',
    "ga": "libs/google-analytics",
    "clipboard": 'libs/clipboard',
    "moment": 'libs/moment.min',
    "moment_ru":'libs/moment.ru'
  },
  shim: {
    "jquery.jsonp": [ "jquery" ],
    "jquery.hoverIntent": [ "jquery" ],
    "jquery.csv": [ "jquery" ],
    "bootstrap": [ "jquery" ],
    "jgrowl": [ "jquery" ],
    "moment": [ "jquery" ],
    "bootstrap_select": [ "bootstrap" ],
    "bootstrap_select_i18n": [ "bootstrap_select" ],
    "underscore": { exports: '_' },
    "backbone": { deps: ["underscore", "jquery"], exports: "Backbone" },
    "d3": { exports: 'd3' },
    "d3.lambdas": [ 'd3' ],
    "ga": { exports: 'ga' },

  }
});

require(['app', 'moment_ru'], function(App) {
  //moment.locale('ru');
  App.initialize();
});
