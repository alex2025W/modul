define([
  'jquery',
  'underscore',
  'backbone',
  'appview',
  'global'
], function($, _, Backbone, AppView, G) {

  var AppRouter = Backbone.Router.extend({
    routes: {
      '': 'index',
      'search=*searchQuery': 'referalVisitor',
      'sort=:sort/completed_filter=:completed/selector=:selector(/layers=:layersList)(/scale=:zoomValue)(/toggle=:toggleValue)(/pan=:panValue)(/preselected_contract=:preselectedContractValue)(/search=*searchQuery)': 'applyDatamining',
      'sort=:sort/completed_filter=:completed/search=*searchQuery':'applyShortDatamining',
      'short_link=*searchQuery': 'zippedLink',
      'open_comment=*searchQuery': 'openComment',
      'confirmplan=*searchQuery' : 'confirmPlan',
      'open_contracts=*searchQuery' : 'openContracts',
      '*actions': 'defaultAction'
    },

    defaultParams: {
      sort: (G.config.sortDesc ? '!': '') + G.config.sortType,
      completed_filter: G.config.hideCompleted ? G.config.hideCompletedDepth : 'off',
      selector: '{}',
      layers:"all"
    },

    // параметры для сортировке в URL-е
    urlParamsSorting:{
      'sort':1,
      'completed_filter':2,
      "selector":3,
      "layers":4,
      "scale":5,
      "toggle":6,
      "pan":7,
      "preselected_contract": 8,
      "search":1000 // search должен быть всегда последним
    },

    index: function() {
      this.navigateSmart(this.defaultParams,
        { trigger: true, replace: true });
    },

    getLocation:function(){
      var hash = window.location.hash;
      if(hash.indexOf('short_link=')>=0){
        var hash = hash.split('short_link=')[1];
        var unzipped_uri = Base64.btou(RawDeflate.inflate(Base64.fromBase64(hash)));
        if(unzipped_uri){
          if(unzipped_uri[0]!='#')
            unzipped_uri = '#'+unzipped_uri;
          return unzipped_uri;
        }
      }
      return window.location.hash;
    },

    zippedLink:function(searchQuery){
      var unzipped_uri = Base64.btou(RawDeflate.inflate(Base64.fromBase64(searchQuery)));
      Backbone.history.loadUrl(unzipped_uri);
    },

    /* unzipLink: function(searchQuery) {
      var unzipped_uri = Base64.btou(RawDeflate.inflate(Base64.fromBase64(searchQuery)));
      G.router.navigate(unzipped_uri, { trigger: true, replace: true });
    }, */

    ///
    /// Обработка перехода к конкретному коментарию
    /// searchQuery = #openComment=./1119/1119.2.1_2016-06-20
    ///
    openComment: function(searchQuery) {
      G.events.trigger("navigate:comment", searchQuery, true);
    },

    ///
    /// Обработка перехода к конкретному коментарию и подтверждения планов
    /// searchQuery = #confirmPlan=./1119/1119.2.1_2016-06-20
    ///
    confirmPlan: function(searchQuery) {
      G.events.trigger("navigate:confirmplan", searchQuery, true);
    },

    referalVisitor: function(searchQuery) {
      window.location.hash = "#";
      this.navigateSmart(
        _.extend({}, this.defaultParams, { search: searchQuery }),
        { trigger: true, replace: true }
      );
    },

    openContracts: function(searchQuery) {},

    applyShortDatamining:function(sort,completed,search){
      this.navigateSmart(
        _.extend({}, this.defaultParams, {sort:sort, completed_filter:completed, search:search}),
        { trigger: true, replace: true }
      );
    },

    applyDatamining: function(sort, completed, selector, layersList, zoomValue, toggleValue, panValue, preselectedContractValue, searchQuery) {
      var silent = true;
      G.config.preselectedNode = preselectedContractValue?this.unescapeParam(preselectedContractValue):null;
      G.events.trigger("search:model", (searchQuery || '').toLocaleLowerCase(), silent);
      G.events.trigger("completed-filter:model", completed !== 'off', completed, silent);
      G.events.trigger("sort:model", sort.split('!').pop(), sort[0] === '!');
      G.events.trigger('selector:model', selector, silent);
    },

    defaultAction: function(actions) {
      console.warn('No route: ', actions);
    },

    navigateSmart: function(params, options) {
      var query = this.updateQueryWithParams(G.router.getLocation(), params);
      //console.log(Base64.btou(RawDeflate.inflate(Base64.fromBase64(query.replace('short_link=','')))));
      //var zipped_uri =Base64.toBase64(RawDeflateStr.deflate(Base64.utob(query)));
      G.router.navigate(query, options);
    },

    updateQueryWithParams: function(currentQuery, params) {
      var self = this;
      var currentParams = this.getParamsObjectFromQuery(currentQuery),
        updatedParams = _.extend(currentParams, params),
        sorting = _.reduce(updatedParams, function(q,v,k){
          if(v.length)
            q.push([k,v]);
          return q;
        },[]).sort(function(a,b){
          var pa = self.urlParamsSorting[a[0]] || 500,
            pb = self.urlParamsSorting[b[0]] || 500;
          if(pa>pb) return 1;
          if(pa<pb) return -1;
          return 0;
        }),
        updatedQuery = sorting.reduce(function(q,v){
          return q+ (q.length>0?'/':'')+v[0]+'='+v[1];
        },'');

        /*console.log(sorting);
        var qqq = sorting.reduce(function(q,v){
          return q+ (q.length>0?'/':'')+v[0]+'='+v[1];
        },'');
        console.log(qqq);

        var updatedQuery = _.reduce(updatedParams, function(q, v, k) {
            return  q + (v.length ? '/' + [k,v].join('=') : "");
          }, '');*/
      //console.log(updatedQuery);

      var zipped_uri =Base64.toBase64(RawDeflateStr.deflate(Base64.utob(updatedQuery)));
      return "short_link="+zipped_uri;
    },

    escapeParam: function(paramStr) {
      return paramStr.replace(/\//g, '|').replace(/\./g, ',');
    },

    unescapeParam: function(paramStr) {
      return paramStr.replace(/\|/g, '/').replace(/\,/g, '.');
    },

    getParamsObjectFromQuery: function(queryHash) {
      var splittedQuery = queryHash.slice(1).match(/(search=.*)|([^\/=]+=[^.][^\/]+)/g);
      return splittedQuery ? splittedQuery.reduce(function(obj, token) {
          var tuple = token.split('=');
          if (tuple.length === 2) {
            obj[tuple[0]] = tuple[1];
          }
          return obj;
        }, {})
        : {};
    },

    encodeURI:function(query){
      var ns='',t,chr='',cc='',tn='';
      for(i=0;i<256;i++){
        tn=i.toString(16);
        if(tn.length<2) tn="0"+tn;
        cc+=tn;
        chr+=unescape('%'+tn);
      }
      cc=cc.toUpperCase();
      query.replace(String.fromCharCode(13)+'',"%13");
      for(q=0;q<query.length;q++){
        t=query.substr(q,1);
        for(i=0;i<chr.length;i++){
          if(t==chr.substr(i,1)){
            t=t.replace(chr.substr(i,1),"%"+cc.substr(i*2,2));
            i=chr.length;
          }
        }
        ns+=t;
      }
      return ns;
    },

    decodeURI:function(query){
      return unescape(query);
    }
  });

  var initialize = function() {
    G.router = new AppRouter();
    new AppView();
    Backbone.history.start({root: window.location.pathname });
  };

  return {
    initialize: initialize
  };
});
