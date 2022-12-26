%import json
%import routine
%def styles():
  <link href="/static/css/crm.css?v={{version}}" rel="stylesheet" media="screen, print">
  <link href="/static/css/selectize.bootstrap2.css?v={{version}}" rel="stylesheet" media="screen, print">
  <style>
  .selectize-control .selectize-dropdown > div {
      border-bottom: 1px solid rgba(0,0,0,0.05);
    }
    .selectize-control .selectize-dropdown .name {
      font-weight: bold;
      margin-right: 5px;
    }
    .selectize-control .selectize-dropdown .title {
      display: block;
    }
    .selectize-control .selectize-dropdown .description {
      font-size: 12px;
      display: block;
      color: #a0a0a0;
      white-space: nowrap;
      width: 100%;
      text-overflow: ellipsis;
      overflow: hidden;
    }
  </style>
%end
%def scripts():

  <script src="/static/scripts/orderroutine.js?v={{version}}"></script>

  <script src="/static/scripts/libs/bootstrap-datepicker.js?v={{version}}"></script>
  <script src="/static/scripts/libs/bootstrap-slider.js?v={{version}}"></script>
  <script src="/static/scripts/libs/moment.min.js?v={{version}}"></script>
  <!--<script src="/static/scripts/libs/daterangepicker.js?v={{version}}"></script>-->
  <script src="/static/scripts/libs/daterangepicker2.js?v={{version}}"></script>
  <script src="/static/scripts/libs/jquery.number.min.js?v={{version}}"></script>

  <script src="/static/scripts/select2.js?v={{version}}"></script>
  <script src="/static/scripts/select2_locale_ru.js?v={{version}}"></script>

  <script src="/static/scripts/crm/build/clientcard.js?v={{version}}"></script>
  <script src="/static/scripts/routine.js?v={{version}}"></script>
  <script src="/static/scripts/libs/jquery.jgrowl.min.js?v={{version}}"></script>
   <script src="/static/scripts/libs/bootbox.min.js?v={{version}}"></script>
   <script src="/static/scripts/libs/selectize.js?v={{version}}"></script>

  <script src="/static/scripts/libs/jquery.collapsibleFieldset.js?v={{version}}"></script>
  <script src="/static/scripts/libs/typeahead.bundle.min.js?v={{version}}"></script>
  <script src="/static/scripts/client-finder.js?v={{version}}"></script>

  <script>
  $(function(){
    bootbox.setDefaults({locale: "ru",});

  window.DICTS = {};
  window.DICTS.where_find = [{{!', '.join(['\''+i['name']+'\'' for i in dicts if i['type'] == 2])}}];
  window.DICTS.client_type = [{{!', '.join(['\''+i['name']+'\'' for i in dicts if i['type'] == 12])}}];
  window.DICTS.first_contact = [{{!', '.join(['\''+i['name']+'\'' for i in dicts if i['type'] == 1])}}];

  window.DICTS.reason = [{{!', '.join(['\''+i['name']+'\'' for i in dicts if i['type'] == 7])}}];
  window.DICTS.review = [{{!', '.join(['\''+i['name']+'\'' for i in dicts if i['type'] == 13])}}];
  window.DICTS.interests = [{{!', '.join(['\''+i['name']+'\'' for i in dicts if i['type'] == 14])}}];
  window.DICTS.condition = $.parseJSON('{{!json.dumps(map(lambda x: {'name':x['name'], 'price':x['price'], 'sq': x['sq'] if 'sq' in x else 'disabled', 'property':x['property']}, filter(lambda i: i['type'] == 3, dicts)))}}')
  window.ALL_USERS = { {{!', '.join(['\'{}\':\'{}\''.format(u['email'],u['fio'] if 'fio' in u else u['email']) for u in all_users])}} };
  window.ORDER_CONDITIONS= {{!json.dumps(orders_conditions)}};
  window.App = new window.AppView({client_id:'{{str(client["_id"])}}', client_name: '{{str(client["name"])}}', client_model: {{!  'null' if not client_data else client_data }}, 'is_add_order':{{ 'true' if is_add_order else 'false' }} });
  window.ORDER_CONDITIONS= {{!json.dumps(orders_conditions)}};
  // роутинг
  var AppRouter = Backbone.Router.extend({
     routes: {
      "": "index",
      ":query": "index",
      "*path": "index"
    },
    index:function(query){
        window.App.doQuery(query);
    }
  });
  window.Route = new AppRouter();
  Backbone.history.start();
});

window.clients_tags = {{!clients_tags}};
  </script>

  <style>
  .bootbox-confirm.modal{
    width:450px;
    margin-left:-175px;
    z-index: 2000;
  }
  .client-type{
    width: 150px;
  }
  .highlight{
      background: #ff0;
    }
</style>

%end
%rebase master_page/base page_title='CRM. Клиент (все)', current_user=current_user, version=version, scripts=scripts, styles=styles, menu=menu

<div id="client-card-form" class="span12 hide" ></div>
